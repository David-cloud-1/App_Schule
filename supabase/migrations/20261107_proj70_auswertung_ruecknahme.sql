-- PROJ-70: Auswertung „Änderungen je Person“ und Sammel-Rücknahme aller
-- Änderungen einer Person in einem Zeitraum. Nur für den Super-Admin
-- (in jeder Funktion selbst geprüft, zusätzlich zur Route).

BEGIN;

CREATE INDEX IF NOT EXISTS idx_content_versions_person_time
  ON content_versions (changed_by, created_at DESC);

-- ── Änderungen je Person ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION content_changes_per_person(
  p_from timestamptz,
  p_to timestamptz,
  p_department_id uuid DEFAULT NULL
) RETURNS TABLE (
  person_id uuid,
  person_label text,
  angelegt bigint,
  geaendert bigint,
  geloescht bigint,
  wiederhergestellt bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'nicht berechtigt' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT cv.changed_by,
         max(cv.changed_by_label),
         count(*) FILTER (WHERE cv.change_type = 'created'),
         count(*) FILTER (WHERE cv.change_type IN ('updated', 'activated', 'deactivated')),
         count(*) FILTER (WHERE cv.change_type = 'deleted'),
         count(*) FILTER (WHERE cv.change_type = 'restored')
  FROM content_versions cv
  WHERE cv.created_at >= p_from AND cv.created_at < p_to
    AND (p_department_id IS NULL OR cv.department_id = p_department_id)
  GROUP BY cv.changed_by
  ORDER BY count(*) DESC
  LIMIT 200;
END;
$$;

-- ── Plan einer Sammel-Rücknahme (ändert nichts) ─────────────────────────
-- Je Inhalt, den die Person im Zeitraum angefasst hat:
--  target_version: Stand direkt vor ihrer ersten Änderung (NULL = sie hat den
--                  Inhalt angelegt → Papierkorb)
--  conflict:       seitdem hat jemand anderes weiter bearbeitet
--  action:         restore | trash | skip

CREATE OR REPLACE FUNCTION person_revert_plan(
  p_person uuid,
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE (
  content_type text,
  content_id uuid,
  title text,
  first_version integer,
  last_version integer,
  target_version integer,
  current_version integer,
  current_deleted boolean,
  conflict boolean,
  action text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'nicht berechtigt' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH mine AS (
    SELECT cv.content_type AS ct, cv.content_id AS cid,
           min(cv.version_number) AS fv, max(cv.version_number) AS lv
    FROM content_versions cv
    WHERE cv.changed_by = p_person AND cv.created_at >= p_from AND cv.created_at < p_to
    GROUP BY cv.content_type, cv.content_id
  ),
  cur AS (
    SELECT 'question'::text AS ct, q.id AS cid, q.version_number AS vn, (q.deleted_at IS NOT NULL) AS del
      FROM questions q WHERE q.id IN (SELECT m.cid FROM mine m WHERE m.ct = 'question')
    UNION ALL
    SELECT 'topic', t.id, t.version_number, (t.deleted_at IS NOT NULL)
      FROM topics t WHERE t.id IN (SELECT m.cid FROM mine m WHERE m.ct = 'topic')
    UNION ALL
    SELECT 'subject', s.id, s.version_number, (s.deleted_at IS NOT NULL)
      FROM subjects s WHERE s.id IN (SELECT m.cid FROM mine m WHERE m.ct = 'subject')
    UNION ALL
    SELECT 'exam_question_set', e.id, e.version_number, (e.deleted_at IS NOT NULL)
      FROM exam_question_sets e WHERE e.id IN (SELECT m.cid FROM mine m WHERE m.ct = 'exam_question_set')
  )
  SELECT m.ct, m.cid,
         (SELECT left(coalesce(v.data->>'question_text', v.data->>'name', ''), 120)
            FROM content_versions v
            WHERE v.content_type = m.ct AND v.content_id = m.cid AND v.version_number = m.lv
            LIMIT 1),
         m.fv, m.lv,
         (SELECT max(v.version_number) FROM content_versions v
            WHERE v.content_type = m.ct AND v.content_id = m.cid AND v.version_number < m.fv),
         c.vn, c.del,
         EXISTS (SELECT 1 FROM content_versions v
                   WHERE v.content_type = m.ct AND v.content_id = m.cid
                     AND v.version_number > m.fv
                     AND v.changed_by IS DISTINCT FROM p_person),
         CASE
           WHEN c.vn IS NULL THEN 'skip'
           WHEN NOT EXISTS (SELECT 1 FROM content_versions v
                              WHERE v.content_type = m.ct AND v.content_id = m.cid
                                AND v.version_number < m.fv) THEN
             CASE WHEN c.del THEN 'skip' ELSE 'trash' END
           ELSE 'restore'
         END
  FROM mine m
  LEFT JOIN cur c ON c.ct = m.ct AND c.cid = m.cid
  ORDER BY m.ct, m.cid;
END;
$$;

-- ── Sammel-Rücknahme ausführen (eine Transaktion je Aufruf) ─────────────
-- Die App ruft in Stücken (p_items = [{type,id}, …], höchstens ~100), das
-- erste Stück legt den Vorgang an, die weiteren hängen sich per p_batch an.
-- Alles landet als EIN Vorgang und lässt sich selbst wieder zurücknehmen.

CREATE OR REPLACE FUNCTION revert_person_changes(
  p_person uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_include_conflicts boolean,
  p_description text,
  p_items jsonb,
  p_batch uuid DEFAULT NULL
) RETURNS TABLE (r_batch uuid, r_done integer, r_skipped integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_batch uuid := p_batch;
  v_done integer := 0;
  v_skip integer := 0;
  r record;
  v_table text;
  v_target_data jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'nicht berechtigt' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 200 THEN
    RAISE EXCEPTION 'Zu viele Inhalte auf einmal (höchstens 200)';
  END IF;

  IF v_batch IS NULL THEN
    INSERT INTO content_change_batches (actor_id, description)
    VALUES (auth.uid(), left(coalesce(p_description, 'Sammel-Rücknahme'), 300))
    RETURNING id INTO v_batch;
  ELSIF NOT EXISTS (SELECT 1 FROM content_change_batches WHERE id = v_batch AND actor_id = auth.uid()) THEN
    RAISE EXCEPTION 'Vorgang nicht gefunden';
  END IF;

  PERFORM set_config('app.change_batch_id', v_batch::text, true);

  FOR r IN
    SELECT pl.*
    FROM person_revert_plan(p_person, p_from, p_to) pl
    JOIN jsonb_to_recordset(p_items) AS i(type text, id uuid)
      ON pl.content_type = i.type AND pl.content_id = i.id
  LOOP
    IF r.action = 'skip' OR (r.conflict AND NOT p_include_conflicts) THEN
      v_skip := v_skip + 1;
      CONTINUE;
    END IF;

    v_table := CASE r.content_type
      WHEN 'question' THEN 'questions'
      WHEN 'topic' THEN 'topics'
      WHEN 'subject' THEN 'subjects'
      ELSE 'exam_question_sets'
    END;

    IF r.action = 'trash' THEN
      EXECUTE format('UPDATE %I SET deleted_at = now() WHERE id = $1', v_table) USING r.content_id;
    ELSE
      PERFORM restore_content_version(r.content_type, r.content_id, r.target_version);
      -- restore_content_version setzt die Art der Änderung für den Rest der
      -- Transaktion; zurücksetzen, damit spätere Schritte richtig erkannt werden
      PERFORM set_config('app.change_type_override', '', true);
      PERFORM set_config('app.change_restore_source', '', true);

      -- restore_content_version fasst deleted_at nicht an: war der Inhalt
      -- vor der Änderung nicht gelöscht, jetzt aber schon, holen wir ihn zurück
      SELECT v.data INTO v_target_data FROM content_versions v
        WHERE v.content_type = r.content_type AND v.content_id = r.content_id
          AND v.version_number = r.target_version;
      IF r.current_deleted AND (v_target_data->>'deleted_at') IS NULL THEN
        EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE id = $1', v_table) USING r.content_id;
      END IF;
    END IF;
    v_done := v_done + 1;
  END LOOP;

  PERFORM set_config('app.change_batch_id', '', true);
  RETURN QUERY SELECT v_batch, v_done, v_skip;
END;
$$;

REVOKE ALL ON FUNCTION content_changes_per_person(timestamptz, timestamptz, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION person_revert_plan(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION revert_person_changes(uuid, timestamptz, timestamptz, boolean, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION content_changes_per_person(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION person_revert_plan(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION revert_person_changes(uuid, timestamptz, timestamptz, boolean, text, jsonb, uuid) TO authenticated;

COMMIT;
