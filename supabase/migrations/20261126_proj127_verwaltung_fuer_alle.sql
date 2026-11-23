-- PROJ-127: Verwaltung für alle Lehrkräfte – Datenbank-Regeln (Teil 1 von 2)
--
-- Nur erweiternd: Für heutige Nutzer ändert sich nichts Sichtbares, bis der
-- Code (requireManager) und die Rollen-Umstellung (Teil 2) folgen.
-- Rückweg: 20261126_proj127_verwaltung_fuer_alle_down.sql
--
-- Inhalt
--   1. Änderungsprotokoll: Spalte admin_name (Name der handelnden Person als Text)
--   2. Neue Regel can_manage_department(): jede Lehrer-Rolle für jeden vorhandenen Bereich
--   3. Items, Item-Besitz (Lesen) und Änderungsprotokoll nutzen die neue Regel
--   4. Geteilte Nachweise: jede Lehrer-Rolle mit passendem Profil-Bereich
--   5. Regal-Freigaben „für den Fachbereich“: Profil-Bereich statt Bereichs-Admin
--   6. Rücknahme der Änderungen einer Person (PROJ-47/70): jede Lehrer-Rolle,
--      private Fragen anderer bleiben außen vor
--
-- Bewusst NICHT geändert: can_admin_department() (Profile, KI-Entwürfe,
-- KI-Aufträge, Prüfungsteile …) und forum_is_moderator() (Lehrerzimmer).

BEGIN;

-- 1. Name der handelnden Person als Text ---------------------------------------
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS admin_name text;

COMMENT ON COLUMN public.admin_audit_log.admin_name IS
  'PROJ-127: Name der handelnden Person zum Zeitpunkt der Aktion; bleibt lesbar, auch wenn das Konto später gelöscht wird.';

-- Für „Zuletzt geändert von …“ und den Filter nach Person
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_object
  ON public.admin_audit_log (object_type, object_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin
  ON public.admin_audit_log (admin_id, created_at DESC);

-- 2. Neue Regel „darf Bereich verwalten (Verwaltung)“ -----------------------------
CREATE OR REPLACE FUNCTION public.can_manage_department(target_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT is_admin() OR (
    has_teacher_role()
    AND target_department_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM departments d WHERE d.id = target_department_id)
  )
$function$;

REVOKE ALL ON FUNCTION public.can_manage_department(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_department(uuid) TO authenticated, service_role;

-- 3. Items, Item-Besitz, Änderungsprotokoll ----------------------------------------
-- Items: Lehrkräfte dürfen in der Datenbank nur LESEN. Anlegen, Ändern und
-- Löschen läuft über die Routen (Dienstschlüssel), die jede Änderung streng
-- protokollieren. So geht kein Schreibzugriff an der Protokollpflicht vorbei
-- (QA-Fund M1). Der Super-Admin behält vollen Zugriff.
DROP POLICY IF EXISTS shop_items_admin_all ON public.shop_items;
CREATE POLICY shop_items_admin_all ON public.shop_items
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
DROP POLICY IF EXISTS shop_items_teacher_select ON public.shop_items;
CREATE POLICY shop_items_teacher_select ON public.shop_items
  FOR SELECT
  USING (can_manage_department(department_id));

DROP POLICY IF EXISTS user_shop_items_admin_select ON public.user_shop_items;
CREATE POLICY user_shop_items_admin_select ON public.user_shop_items
  FOR SELECT
  USING (can_manage_department((SELECT si.department_id FROM shop_items si WHERE si.id = user_shop_items.item_id)));

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log" ON public.admin_audit_log
  FOR SELECT
  USING (can_manage_department(department_id));

-- Schreiben: jede Lehrer-Rolle, aber nur im eigenen Namen (kein Eintrag für andere)
DROP POLICY IF EXISTS "Admins can insert audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can insert audit log" ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (has_teacher_role() AND admin_id = auth.uid());

-- 4. Geteilte Nachweise --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_assessment(p_department_id uuid, p_created_by uuid, p_shared boolean)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT is_admin()
    OR (p_created_by IS NOT NULL AND p_created_by = auth.uid() AND has_teacher_role())
    OR (p_shared AND has_teacher_role() AND p_department_id IS NOT NULL AND p_department_id = my_department_id())
$function$;

-- 5. Regal-Freigaben „für den Fachbereich“ --------------------------------------------
CREATE OR REPLACE FUNCTION public.regal_in_bereich(p_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
           SELECT 1 FROM teacher_subject_assignments
           WHERE teacher_id = auth.uid() AND department_id = p_department_id
         )
      OR EXISTS (
           SELECT 1 FROM profiles
           WHERE id = auth.uid()
             AND role IN ('teacher', 'department_admin', 'admin')
             AND department_id = p_department_id
         )
$function$;

-- 6. Rücknahme der Änderungen einer Person --------------------------------------------
CREATE OR REPLACE FUNCTION public.content_changes_per_person(p_from timestamp with time zone, p_to timestamp with time zone, p_department_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(person_id uuid, person_label text, angelegt bigint, geaendert bigint, geloescht bigint, wiederhergestellt bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT has_teacher_role() THEN
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
    -- QA L2: private Fragen anderer zählen nicht mit (wie in person_revert_plan)
    AND (is_admin()
         OR cv.content_type <> 'question'
         OR NOT EXISTS (SELECT 1 FROM questions q
                         WHERE q.id = cv.content_id AND q.is_private AND q.owner_id IS DISTINCT FROM auth.uid()))
  GROUP BY cv.changed_by
  ORDER BY count(*) DESC
  LIMIT 200;
END;
$function$;

CREATE OR REPLACE FUNCTION public.person_revert_plan(p_person uuid, p_from timestamp with time zone, p_to timestamp with time zone)
RETURNS TABLE(content_type text, content_id uuid, title text, first_version integer, last_version integer, target_version integer, current_version integer, current_deleted boolean, conflict boolean, action text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT has_teacher_role() THEN
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
  -- PROJ-127: Private Fragen anderer Lehrkräfte tauchen für Nicht-Super-Admins
  -- weder in der Vorschau (Titel) noch in der Rücknahme auf
  WHERE is_admin()
     OR m.ct <> 'question'
     OR NOT EXISTS (SELECT 1 FROM questions q
                     WHERE q.id = m.cid AND q.is_private AND q.owner_id IS DISTINCT FROM auth.uid())
  ORDER BY m.ct, m.cid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revert_person_changes(p_person uuid, p_from timestamp with time zone, p_to timestamp with time zone, p_include_conflicts boolean, p_description text, p_items jsonb, p_batch uuid DEFAULT NULL::uuid)
RETURNS TABLE(r_batch uuid, r_done integer, r_skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_batch uuid := p_batch;
  v_done integer := 0;
  v_skip integer := 0;
  r record;
  v_table text;
  v_target_data jsonb;
BEGIN
  IF NOT has_teacher_role() THEN
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

  -- person_revert_plan lässt private Fragen anderer schon weg (siehe oben)
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
$function$;

COMMIT;
