-- PROJ-46: Leistungsnachweise für Lehrkräfte ohne Fachbereich
--
-- 1. graded_assessments.shared_with_department: „für den Bereich geteilt“.
--    Berechnet die Datenbank selbst aus Ersteller und Zielbereich (nie der
--    Browser): ja, wenn der Super-Admin anlegt oder ein Bereichs-Admin für den
--    EIGENEN Bereich; sonst nein (Lehrkraft, Bereichs-Admin für fremden
--    Bereich). Danach eingefroren — nur ein Wechsel des Zielbereichs im
--    Entwurf rechnet neu. Bestand (5 Nachweise) = ja → für die heutigen
--    Bereichs-Admins ändert sich nichts.
-- 2. questions.is_private + owner_id: private Nachweis-Fragen (E6). Immer
--    „nur für Nachweise“, nie freigebbar, nur für Besitzerin + Super-Admin
--    lesbar. Wird das Konto gelöscht, wird owner_id leer, die Frage bleibt
--    aber privat (nur noch Super-Admin).
-- 3. Eine gemeinsame Prüfung „darf diesen Nachweis sehen“ für Nachweise und
--    Fokus-Protokolle. Alle Detail-Routen lesen den Nachweis zuerst mit den
--    Rechten der Person — das ist das Tor.
-- 4. Lücke geschlossen: private Fragen und ihre Antwortoptionen sind für alle
--    anderen nicht mehr lesbar (Pool-Fragen bleiben wie bisher).
--
-- Rein additiv für den bisher ausgelieferten Code: alle Bestandsnachweise sind
-- geteilt, es gibt noch keine privaten Fragen und keine Lehrkräfte.
--
-- Rückweg: siehe 20261027_proj46_teacher_assessments_down.sql

-- ---------------------------------------------------------------------------
-- Spalten
-- ---------------------------------------------------------------------------

ALTER TABLE graded_assessments
  ADD COLUMN shared_with_department boolean NOT NULL DEFAULT false;
UPDATE graded_assessments SET shared_with_department = true;

ALTER TABLE questions
  ADD COLUMN is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE questions
  ADD CONSTRAINT questions_private_is_assessment_only CHECK (NOT is_private OR assessment_only),
  ADD CONSTRAINT questions_owner_only_private CHECK (is_private OR owner_id IS NULL);

CREATE INDEX idx_questions_owner_private ON questions(owner_id) WHERE is_private;
CREATE INDEX idx_graded_assessments_created_by ON graded_assessments(created_by);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

-- Eine der Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin)
CREATE OR REPLACE FUNCTION public.has_teacher_role()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'department_admin', 'admin')
  )
$$;

-- Darf die angemeldete Person einen Nachweis mit diesen Merkmalen sehen?
-- Super-Admin: alle. Ersteller: solange er eine Lehrer-Rolle hat (E5).
-- Bereichs-Admin: geteilte Nachweise seines Bereichs (E3).
CREATE OR REPLACE FUNCTION public.can_view_assessment(p_department_id uuid, p_created_by uuid, p_shared boolean)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT is_admin()
    OR (p_created_by IS NOT NULL AND p_created_by = auth.uid() AND has_teacher_role())
    OR (
      p_shared
      AND is_department_admin()
      AND p_department_id IS NOT NULL
      AND p_department_id = my_department_id()
    )
$$;

-- Dieselbe Prüfung über die ID (für Tabellen, die am Nachweis hängen)
CREATE OR REPLACE FUNCTION public.can_view_assessment_id(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (SELECT can_view_assessment(department_id, created_by, shared_with_department)
       FROM graded_assessments WHERE id = p_assessment_id),
    false
  )
$$;

-- „Geteilt“ für einen Ersteller und Zielbereich (Regel aus dem Tech Design)
CREATE OR REPLACE FUNCTION public.assessment_shared_for(p_creator uuid, p_department_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (SELECT p.role = 'admin'
         OR (p.role = 'department_admin' AND p.department_id IS NOT NULL AND p.department_id = p_department_id)
       FROM profiles p WHERE p.id = p_creator),
    false
  )
$$;

-- Private Frage verwalten/lesen: Super-Admin oder Besitzerin mit Lehrer-Rolle
CREATE OR REPLACE FUNCTION public.can_manage_private_question(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT is_admin() OR (p_owner_id IS NOT NULL AND p_owner_id = auth.uid() AND has_teacher_role())
$$;

CREATE OR REPLACE FUNCTION public.question_is_private(p_question_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE((SELECT is_private FROM questions WHERE id = p_question_id), false)
$$;

-- Antwortoptionen lesen: Pool-Fragen wie bisher, private nur Besitzerin/Super-Admin
CREATE OR REPLACE FUNCTION public.can_read_question_options(p_question_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (SELECT NOT q.is_private OR can_manage_private_question(q.owner_id)
       FROM questions q WHERE q.id = p_question_id),
    true
  )
$$;

-- Frage (samt Optionen/Fächern) ändern: privat → Besitzerin/Super-Admin, sonst Bereich
CREATE OR REPLACE FUNCTION public.can_edit_question(p_question_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN q.is_private THEN can_manage_private_question(q.owner_id)
                 ELSE can_admin_department(question_department(q.id)) END
       FROM questions q WHERE q.id = p_question_id),
    false
  )
$$;

-- ---------------------------------------------------------------------------
-- Trigger: Merkmale einfrieren, private Fragen nur in Nachweisen der Besitzerin
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.graded_assessments_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.shared_with_department := assessment_shared_for(NEW.created_by, NEW.department_id);
  ELSE
    IF NEW.created_by IS DISTINCT FROM OLD.created_by AND NEW.created_by IS NOT NULL THEN
      RAISE EXCEPTION 'created_by kann nicht geändert werden' USING ERRCODE = '42501';
    END IF;
    IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      IF OLD.status <> 'draft' THEN
        RAISE EXCEPTION 'Der Zielbereich ist nach dem Öffnen fest' USING ERRCODE = '42501';
      END IF;
      NEW.shared_with_department := assessment_shared_for(NEW.created_by, NEW.department_id);
    ELSE
      NEW.shared_with_department := OLD.shared_with_department;
    END IF;
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.draft_question_ids IS DISTINCT FROM OLD.draft_question_ids
     OR NEW.question_ids_snapshot IS DISTINCT FROM OLD.question_ids_snapshot THEN
    IF EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = ANY (COALESCE(NEW.draft_question_ids, '{}') || COALESCE(NEW.question_ids_snapshot, '{}'))
        AND q.is_private
        AND q.owner_id IS DISTINCT FROM NEW.created_by
    ) THEN
      RAISE EXCEPTION 'Private Fragen anderer Personen sind nicht erlaubt' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER graded_assessments_guard
  BEFORE INSERT OR UPDATE ON graded_assessments
  FOR EACH ROW EXECUTE FUNCTION graded_assessments_guard();

CREATE OR REPLACE FUNCTION public.questions_private_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Besitzerin ist immer die anlegende Person (Service-Skripte: wie übergeben)
    IF NEW.is_private AND auth.uid() IS NOT NULL THEN
      NEW.owner_id := auth.uid();
    END IF;
  ELSE
    IF NEW.is_private IS DISTINCT FROM OLD.is_private THEN
      RAISE EXCEPTION 'Privat/Pool einer Frage kann nicht geändert werden' USING ERRCODE = '42501';
    END IF;
    -- Nur „Konto gelöscht“ (ON DELETE SET NULL) darf die Besitzerin leeren
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND NEW.owner_id IS NOT NULL THEN
      RAISE EXCEPTION 'Die Besitzerin einer Frage kann nicht geändert werden' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER questions_private_guard
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION questions_private_guard();

-- ---------------------------------------------------------------------------
-- Regeln (RLS)
-- ---------------------------------------------------------------------------

-- Nachweise: eine Regel je Vorgang statt „Admin des Bereichs“
DROP POLICY graded_assessments_admin_all ON graded_assessments;

CREATE POLICY graded_assessments_select ON graded_assessments
  FOR SELECT USING (can_view_assessment(department_id, created_by, shared_with_department));

CREATE POLICY graded_assessments_insert ON graded_assessments
  FOR INSERT WITH CHECK (
    has_teacher_role()
    AND created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM departments d WHERE d.id = department_id AND d.is_active)
  );

CREATE POLICY graded_assessments_update ON graded_assessments
  FOR UPDATE
  USING (can_view_assessment(department_id, created_by, shared_with_department))
  WITH CHECK (can_view_assessment(department_id, created_by, shared_with_department));

CREATE POLICY graded_assessments_delete ON graded_assessments
  FOR DELETE USING (can_view_assessment(department_id, created_by, shared_with_department));

-- Fokus-Protokolle: dieselbe Prüfung
DROP POLICY focus_summary_admin_select ON assessment_focus_summary;
CREATE POLICY focus_summary_admin_select ON assessment_focus_summary
  FOR SELECT USING (can_view_assessment_id(assessment_id));

DROP POLICY focus_events_admin_select ON assessment_focus_events;
CREATE POLICY focus_events_admin_select ON assessment_focus_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessment_focus_summary s
      WHERE s.session_id = assessment_focus_events.session_id
        AND can_view_assessment_id(s.assessment_id)
    )
  );

-- Fragen
DROP POLICY questions_read ON questions;
CREATE POLICY questions_read ON questions
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND CASE WHEN is_private THEN can_manage_private_question(owner_id)
             ELSE (is_active = true OR can_admin_department(question_department(id))) END
  );

DROP POLICY questions_insert_admin ON questions;
CREATE POLICY questions_insert_admin ON questions
  FOR INSERT WITH CHECK (
    CASE WHEN is_private THEN (owner_id = auth.uid() AND has_teacher_role())
         ELSE (is_admin() OR is_department_admin()) END
  );

DROP POLICY questions_update_admin ON questions;
CREATE POLICY questions_update_admin ON questions
  FOR UPDATE USING (
    CASE WHEN is_private THEN can_manage_private_question(owner_id)
         ELSE can_admin_department(question_department(id)) END
  );

DROP POLICY questions_delete_admin ON questions;
CREATE POLICY questions_delete_admin ON questions
  FOR DELETE USING (
    CASE WHEN is_private THEN can_manage_private_question(owner_id)
         ELSE can_admin_department(question_department(id)) END
  );

-- Antwortoptionen
DROP POLICY answer_options_authenticated_read ON answer_options;
CREATE POLICY answer_options_authenticated_read ON answer_options
  FOR SELECT USING (auth.role() = 'authenticated' AND can_read_question_options(question_id));

DROP POLICY answer_options_admin_write ON answer_options;
CREATE POLICY answer_options_admin_write ON answer_options
  FOR ALL
  USING (can_edit_question(question_id))
  WITH CHECK (can_edit_question(question_id));

-- Fach-Zuordnung: private Fragen nur durch Besitzerin/Super-Admin
DROP POLICY question_subjects_admin_write ON question_subjects;
CREATE POLICY question_subjects_admin_write ON question_subjects
  FOR ALL
  USING (
    CASE WHEN question_is_private(question_id) THEN can_edit_question(question_id)
         ELSE can_admin_department(subject_department(subject_id)) END
  )
  WITH CHECK (
    CASE WHEN question_is_private(question_id) THEN can_edit_question(question_id)
         ELSE can_admin_department(subject_department(subject_id)) END
  );
