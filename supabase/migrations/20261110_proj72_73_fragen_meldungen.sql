-- PROJ-72/73: Fragen melden (Azubi) und Meldungs-Inbox (Lehrkräfte)
--
-- Neue Tabelle question_reports. Schreiben geht NUR über die Funktionen unten
-- (SECURITY DEFINER); die Tabelle hat keine INSERT/UPDATE/DELETE-Policies.
--   * report_question          Azubi meldet (Tageslimit 10, eine offene Meldung je Frage)
--   * claim_question_reports   Lehrkraft übernimmt (Hinweis „in Prüfung“, keine Sperre)
--   * close_question_reports   Lehrkraft schließt ab; bei „korrigiert“ 15 Frachtmünzen
--                              je Melder (Wochenlimit 5, nie an sich selbst, nie doppelt)
--   * mark_question_reports_read  Azubi hat die Rückmeldung gesehen
-- Lesen: Melder die eigenen, alle Lehrer-Rollen alle (Inhalte sind offen, PROJ-70).
--
-- Rückweg: 20261110_proj72_73_fragen_meldungen_down.sql

BEGIN;

CREATE TABLE question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('andere_antwort_richtig', 'richtige_antwort_falsch', 'tippfehler_unklar', 'veraltet', 'sonstiges')),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  question_text text NOT NULL,
  chosen_option_text text,
  status text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'in_pruefung', 'korrigiert', 'nicht_uebernommen', 'entfaellt')),
  handled_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  closed_at timestamptz,
  response_text text CHECK (response_text IS NULL OR char_length(response_text) <= 200),
  silent boolean NOT NULL DEFAULT false,
  resolved_version_id uuid REFERENCES content_versions(id) ON DELETE SET NULL,
  reward_coins integer NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  rewarded_at timestamptz,
  feedback_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_reports_question ON question_reports (question_id, status);
CREATE INDEX idx_question_reports_reporter ON question_reports (reporter_id, created_at DESC);
CREATE INDEX idx_question_reports_department ON question_reports (department_id, status);
CREATE INDEX idx_question_reports_handled_by ON question_reports (handled_by);
CREATE INDEX idx_question_reports_rewarded ON question_reports (reporter_id, rewarded_at) WHERE rewarded_at IS NOT NULL;
-- höchstens eine OFFENE Meldung je Azubi und Frage
CREATE UNIQUE INDEX uq_question_reports_open ON question_reports (reporter_id, question_id)
  WHERE status IN ('offen', 'in_pruefung') AND reporter_id IS NOT NULL AND question_id IS NOT NULL;

ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON question_reports FROM anon, authenticated;
GRANT SELECT ON question_reports TO authenticated;

CREATE POLICY question_reports_read ON question_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR has_teacher_role());

-- ── Melden (Azubi) ──────────────────────────────────────────────────────

CREATE FUNCTION report_question(
  p_question_id uuid,
  p_reason text,
  p_note text DEFAULT NULL,
  p_option_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_q questions%ROWTYPE;
  v_chosen text;
  v_today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin';
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('andere_antwort_richtig', 'richtige_antwort_falsch', 'tippfehler_unklar', 'veraltet', 'sonstiges') THEN
    RAISE EXCEPTION 'INVALID_REASON' USING ERRCODE = '22023';
  END IF;
  IF v_note IS NOT NULL AND char_length(v_note) > 500 THEN
    RAISE EXCEPTION 'NOTE_TOO_LONG' USING ERRCODE = '22023';
  END IF;
  IF p_reason = 'sonstiges' AND v_note IS NULL THEN
    RAISE EXCEPTION 'NOTE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  -- nur normale, aktive Übungsfragen (keine Nachweis-Fragen)
  SELECT * INTO v_q FROM questions
   WHERE id = p_question_id AND is_active AND deleted_at IS NULL AND NOT assessment_only AND NOT is_private;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QUESTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- keine Meldung aus einer laufenden Prüfung oder einem Nachweis (frische Sitzungen)
  IF EXISTS (
    SELECT 1 FROM exam_sessions
     WHERE user_id = v_uid AND status = 'in_progress' AND started_at > now() - interval '12 hours'
  ) THEN
    RAISE EXCEPTION 'SESSION_RUNNING' USING ERRCODE = '55000';
  END IF;

  IF (SELECT count(*) FROM question_reports WHERE reporter_id = v_uid AND created_at >= v_today_start) >= 10 THEN
    RAISE EXCEPTION 'DAILY_LIMIT' USING ERRCODE = '54000';
  END IF;

  IF p_option_id IS NOT NULL THEN
    SELECT option_text INTO v_chosen FROM answer_options WHERE id = p_option_id AND question_id = p_question_id;
  END IF;

  BEGIN
    INSERT INTO question_reports (question_id, reporter_id, department_id, reason, note, question_text, chosen_option_text)
    VALUES (p_question_id, v_uid, question_department(p_question_id), p_reason, v_note, v_q.question_text, v_chosen)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REPORTED' USING ERRCODE = '23505';
  END;

  RETURN v_id;
END
$$;

-- ── Übernehmen (Lehrkraft) ──────────────────────────────────────────────

CREATE FUNCTION claim_question_reports(p_question_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT has_teacher_role() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  UPDATE question_reports
     SET status = 'in_pruefung', handled_by = auth.uid(), claimed_at = now()
   WHERE question_id = p_question_id AND status IN ('offen', 'in_pruefung');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END
$$;

-- ── Abschließen (Lehrkraft), mit Belohnung ──────────────────────────────

CREATE FUNCTION close_question_reports(
  p_question_id uuid,
  p_result text,
  p_response text DEFAULT NULL,
  p_silent boolean DEFAULT false,
  p_report_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_resp text := nullif(btrim(coalesce(p_response, '')), '');
  v_version uuid;
  v_reward integer;
  v_closed integer := 0;
  v_rewarded integer := 0;
  r question_reports%ROWTYPE;
BEGIN
  IF v_uid IS NULL OR NOT has_teacher_role() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_result IS NULL OR p_result NOT IN ('korrigiert', 'nicht_uebernommen') THEN
    RAISE EXCEPTION 'INVALID_RESULT' USING ERRCODE = '22023';
  END IF;
  IF v_resp IS NOT NULL AND char_length(v_resp) > 200 THEN
    RAISE EXCEPTION 'RESPONSE_TOO_LONG' USING ERRCODE = '22023';
  END IF;

  IF p_result = 'korrigiert' THEN
    SELECT id INTO v_version FROM content_versions
     WHERE content_type = 'question' AND content_id = p_question_id
     ORDER BY version_number DESC LIMIT 1;
  END IF;

  FOR r IN
    SELECT * FROM question_reports
     WHERE question_id = p_question_id
       AND status IN ('offen', 'in_pruefung')
       AND (p_report_ids IS NULL OR id = ANY (p_report_ids))
     ORDER BY created_at
     FOR UPDATE
  LOOP
    v_reward := 0;
    IF p_result = 'korrigiert'
       AND NOT p_silent
       AND r.reporter_id IS NOT NULL
       AND r.reporter_id <> v_uid
       AND r.rewarded_at IS NULL
       AND (SELECT count(*) FROM question_reports x
             WHERE x.reporter_id = r.reporter_id AND x.rewarded_at > now() - interval '7 days') < 5
    THEN
      UPDATE profiles SET coin_balance = coin_balance + 15 WHERE id = r.reporter_id;
      IF FOUND THEN v_reward := 15; END IF;
    END IF;

    UPDATE question_reports
       SET status = p_result,
           closed_at = now(),
           handled_by = v_uid,
           response_text = v_resp,
           silent = p_silent,
           resolved_version_id = v_version,
           reward_coins = v_reward,
           rewarded_at = CASE WHEN v_reward > 0 THEN now() ELSE NULL END,
           feedback_read_at = CASE WHEN p_silent THEN now() ELSE NULL END
     WHERE id = r.id;

    v_closed := v_closed + 1;
    IF v_reward > 0 THEN v_rewarded := v_rewarded + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('closed', v_closed, 'rewarded', v_rewarded);
END
$$;

-- ── Rückmeldung gelesen (Azubi) ─────────────────────────────────────────

CREATE FUNCTION mark_question_reports_read(p_ids uuid[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_n integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  UPDATE question_reports
     SET feedback_read_at = now()
   WHERE id = ANY (p_ids)
     AND reporter_id = auth.uid()
     AND feedback_read_at IS NULL
     AND status NOT IN ('offen', 'in_pruefung');
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END
$$;

-- ── Frage verschwindet (Papierkorb / endgültig gelöscht) ────────────────

CREATE FUNCTION question_reports_on_question_gone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE question_reports
     SET status = 'entfaellt', closed_at = now()
   WHERE question_id = OLD.id AND status IN ('offen', 'in_pruefung');
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END
$$;

CREATE TRIGGER trg_question_reports_soft_deleted
  AFTER UPDATE OF deleted_at ON questions
  FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION question_reports_on_question_gone();

CREATE TRIGGER trg_question_reports_hard_deleted
  BEFORE DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION question_reports_on_question_gone();

-- ── Inbox-Ansicht: gebündelt je Frage und Status ────────────────────────

CREATE VIEW question_report_groups WITH (security_invoker = true) AS
SELECT
  r.question_id,
  r.status,
  (array_agg(r.question_text ORDER BY r.created_at DESC))[1] AS question_text,
  (array_agg(r.department_id ORDER BY r.created_at DESC))[1] AS department_id,
  q.topic_id,
  t.subject_id,
  count(*)::integer AS report_count,
  array_agg(DISTINCT r.reason) AS reasons,
  min(r.created_at) AS oldest_at,
  max(r.created_at) AS newest_at,
  (array_agg(r.handled_by ORDER BY r.claimed_at DESC NULLS LAST) FILTER (WHERE r.handled_by IS NOT NULL))[1] AS handled_by,
  forum_author_name((array_agg(r.handled_by ORDER BY r.claimed_at DESC NULLS LAST) FILTER (WHERE r.handled_by IS NOT NULL))[1]) AS handled_by_name,
  max(r.claimed_at) AS claimed_at,
  (SELECT max(cv.created_at) FROM content_versions cv
    WHERE cv.content_type = 'question' AND cv.content_id = r.question_id) AS last_changed_at
FROM question_reports r
LEFT JOIN questions q ON q.id = r.question_id
LEFT JOIN topics t ON t.id = q.topic_id
GROUP BY r.question_id, r.status, q.topic_id, t.subject_id;

GRANT SELECT ON question_report_groups TO authenticated;

-- ── Rechte auf Funktionen ───────────────────────────────────────────────

REVOKE ALL ON FUNCTION report_question(uuid, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION claim_question_reports(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION close_question_reports(uuid, text, text, boolean, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION mark_question_reports_read(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION question_reports_on_question_gone() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION report_question(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_question_reports(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION close_question_reports(uuid, text, text, boolean, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_question_reports_read(uuid[]) TO authenticated;

COMMIT;
