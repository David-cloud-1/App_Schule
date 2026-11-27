-- PROJ-134: Leistungsnachweis – Detailseite & Ablauf
--
-- 1. graded_assessments.auto_closed_at: Zeitpunkt des automatischen Schließens
-- 2. exam_sessions.trial_assessment_id: Testlauf einer Lehrkraft. Dort bleibt
--    assessment_id LEER, damit kein Auswertungs-Code den Testlauf je findet.
-- 3. close_expired_assessments(): schließt abgelaufene Nachweise (idempotent),
--    schreibt den Verlaufseintrag im selben Schritt
-- 4. pg_cron: alle 5 Minuten schließen, täglich Testläufe nach 30 Tagen löschen
--
-- Keine neuen oder geänderten RLS-Policies: Testläufe sind eigene Sitzungen
-- (user_id = Lehrkraft) und fallen unter die bestehenden Policies.

BEGIN;

ALTER TABLE graded_assessments
  ADD COLUMN IF NOT EXISTS auto_closed_at timestamptz;

COMMENT ON COLUMN graded_assessments.auto_closed_at IS
  'PROJ-134: Zeitpunkt, an dem der Nachweis automatisch geschlossen wurde (Beitritt abgelaufen). NULL bei Schließen von Hand.';

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS trial_assessment_id uuid REFERENCES graded_assessments(id) ON DELETE CASCADE;

ALTER TABLE exam_sessions
  DROP CONSTRAINT IF EXISTS exam_sessions_trial_xor_assessment;
ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_sessions_trial_xor_assessment
  CHECK (trial_assessment_id IS NULL OR assessment_id IS NULL);

COMMENT ON COLUMN exam_sessions.trial_assessment_id IS
  'PROJ-134: Testlauf einer Lehrkraft zu diesem Nachweis. assessment_id bleibt leer, damit der Testlauf in keiner Auswertung mitzählt.';

CREATE INDEX IF NOT EXISTS exam_sessions_trial_idx
  ON exam_sessions (trial_assessment_id, user_id)
  WHERE trial_assessment_id IS NOT NULL;

-- ── Automatisch schließen ───────────────────────────────────────────────────
-- Ein offener Nachweis schließt, wenn „Beitritt bis“ vorbei ist UND niemand
-- mehr innerhalb seiner Bearbeitungszeit schreibt. Eine einzige Anweisung:
-- wer gleichzeitig von Hand schließt, bekommt denselben Zustand ohne zweiten
-- Verlaufseintrag (die Zeile ist dann nicht mehr „open“).

CREATE OR REPLACE FUNCTION public.close_expired_assessments()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH closed AS (
    UPDATE graded_assessments a
       SET status = 'closed', auto_closed_at = now()
     WHERE a.status = 'open'
       AND a.closes_at < now()
       AND NOT EXISTS (
         SELECT 1 FROM exam_sessions s
          WHERE s.assessment_id = a.id
            AND s.status = 'in_progress'
            AND s.started_at
                + make_interval(secs => (COALESCE((s.results_json->>'durationMinutes')::numeric, 0) * 60 + 60)::double precision)
                > now()
       )
    RETURNING a.id, a.title, a.department_id
  ), logged AS (
    INSERT INTO admin_audit_log (admin_id, admin_name, action_type, object_type, object_id, object_label, details, department_id)
    SELECT NULL, 'System', 'graded_assessment.auto_close', 'graded_assessment',
           c.id::text, c.title,
           jsonb_build_object('grund', 'Beitritt abgelaufen'),
           c.department_id
      FROM closed c
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM closed;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.close_expired_assessments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_assessments() TO service_role;

-- ── Testläufe nach 30 Tagen entfernen ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_assessment_trials()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH gone AS (
    DELETE FROM exam_sessions
     WHERE trial_assessment_id IS NOT NULL
       AND started_at < now() - interval '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM gone;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_assessment_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_assessment_trials() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('nachweise-automatisch-schliessen', '*/5 * * * *', 'SELECT public.close_expired_assessments();');
    PERFORM cron.schedule('nachweis-testlaeufe-aufraeumen', '40 3 * * *', 'SELECT public.cleanup_assessment_trials();');
  END IF;
END;
$$;

COMMIT;
