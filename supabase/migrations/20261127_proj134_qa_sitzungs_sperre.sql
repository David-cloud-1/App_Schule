-- PROJ-134 QA-Fix (BUG-1, BUG-2): Sitzungen zu Nachweisen und Testläufen legt nur der Server an.
--
-- Bisher durfte jede angemeldete Person eigene exam_sessions-Zeilen frei anlegen und ändern
-- (Policies „Users create/update own exam sessions“, unverändert). Damit ließ sich eine Sitzung
-- mit assessment_id oder trial_assessment_id erfinden, abgeben und mit Lösungen bewerten lassen.
--
-- Diese Sperre ändert KEINE Policy, sondern ergänzt einen Trigger. Aufrufe mit der Rolle
-- „authenticated“ (also aus dem Browser):
--   * dürfen keine Sitzung mit assessment_id oder trial_assessment_id anlegen,
--   * dürfen eine Sitzung, die zu einem Nachweis oder Testlauf gehört, gar nicht mehr ändern
--     (Startzeit, Dauer, Status, Ausschluss, Antworten laufen über den Server).
-- Der Server (service_role) und Fremdschlüssel-Aktionen sind ausgenommen. Übungsprüfungen
-- ohne Nachweis bleiben unverändert (Autosave und Abgabe wie bisher).
--
-- QA NEU-1: Zusätzlich rechnet der automatische Abschluss mit der Dauer des Nachweises
-- (graded_assessments.duration_minutes), nicht mit der Dauer aus der Sitzung.
--
-- WICHTIG: erst zusammen mit dem Code dieser Änderung einspielen. Beitritt, Autosave und
-- Abgabe schreiben Sitzungen zu Nachweisen jetzt mit dem Dienst-Client. Mit dem alten Code
-- würde diese Sperre sie ablehnen.

BEGIN;

CREATE OR REPLACE FUNCTION public.exam_sessions_sperre_nachweis_spalten()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Fremdschlüssel-Aktionen (ON DELETE SET NULL) und Serveraufrufe nicht blockieren
  IF pg_trigger_depth() > 1 OR coalesce(auth.role(), '') <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.assessment_id IS NOT NULL OR NEW.trial_assessment_id IS NOT NULL THEN
      RAISE EXCEPTION 'Sitzungen zu Nachweisen werden nur vom Server angelegt.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.assessment_id IS NOT NULL OR OLD.trial_assessment_id IS NOT NULL
     OR NEW.assessment_id IS NOT NULL OR NEW.trial_assessment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Sitzungen zu Nachweisen werden nur vom Server geändert.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exam_sessions_sperre_nachweis_spalten ON exam_sessions;
CREATE TRIGGER exam_sessions_sperre_nachweis_spalten
  BEFORE INSERT OR UPDATE ON exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.exam_sessions_sperre_nachweis_spalten();

-- Automatisch schließen: die Dauer kommt aus dem Nachweis, nicht aus der Sitzung
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
            AND s.started_at + make_interval(secs => (a.duration_minutes * 60 + 60)::double precision) > now()
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

COMMIT;
