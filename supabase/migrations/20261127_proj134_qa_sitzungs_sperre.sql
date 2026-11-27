-- PROJ-134 QA-Fix (BUG-1, BUG-2): Sitzungen zu Nachweisen und Testläufen legt nur der Server an.
--
-- Bisher durfte jede angemeldete Person eigene exam_sessions-Zeilen frei anlegen und ändern
-- (Policies „Users create/update own exam sessions“, unverändert). Damit ließ sich eine Sitzung
-- mit assessment_id oder trial_assessment_id erfinden, abgeben und mit Lösungen bewerten lassen.
--
-- Diese Sperre ändert KEINE Policy, sondern ergänzt einen Trigger: Aufrufe mit der Rolle
-- „authenticated“ (also aus dem Browser) dürfen assessment_id und trial_assessment_id weder
-- setzen noch ändern. Der Server (service_role) und Fremdschlüssel-Aktionen sind ausgenommen.
--
-- WICHTIG: erst zusammen mit dem Code dieser Änderung einspielen. Der Beitritt
-- (/api/assessments/[id]/join) legt die Sitzung jetzt mit dem Dienst-Client an. Mit dem alten
-- Code würde diese Sperre jeden Beitritt ablehnen.

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
  ELSIF NEW.assessment_id IS DISTINCT FROM OLD.assessment_id
     OR NEW.trial_assessment_id IS DISTINCT FROM OLD.trial_assessment_id THEN
    RAISE EXCEPTION 'Die Zuordnung einer Sitzung zu einem Nachweis lässt sich nicht ändern.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exam_sessions_sperre_nachweis_spalten ON exam_sessions;
CREATE TRIGGER exam_sessions_sperre_nachweis_spalten
  BEFORE INSERT OR UPDATE ON exam_sessions
  FOR EACH ROW EXECUTE FUNCTION public.exam_sessions_sperre_nachweis_spalten();

COMMIT;
