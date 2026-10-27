-- Rückweg zu 20261027_proj46_teacher_assessments.sql
--
-- Stellt die Regeln von vor PROJ-46 wieder her. Achtung: Danach sind
-- Nachweise von Lehrkräften wieder für alle Admins ihres Zielbereichs
-- sichtbar, und private Fragen werden zu normalen Bereichs-Fragen „nur für
-- Nachweise“ (weiterhin nicht in der Lern-App, aber in der Fragenverwaltung
-- sichtbar). Vorher prüfen:
--   SELECT count(*) FROM questions WHERE is_private;
--   SELECT count(*) FROM graded_assessments WHERE NOT shared_with_department;

-- Fach-Zuordnung
DROP POLICY question_subjects_admin_write ON question_subjects;
CREATE POLICY question_subjects_admin_write ON question_subjects
  FOR ALL
  USING (can_admin_department(subject_department(subject_id)))
  WITH CHECK (can_admin_department(subject_department(subject_id)));

-- Antwortoptionen
DROP POLICY answer_options_admin_write ON answer_options;
CREATE POLICY answer_options_admin_write ON answer_options
  FOR ALL
  USING (can_admin_department(question_department(question_id)))
  WITH CHECK (can_admin_department(question_department(question_id)));

DROP POLICY answer_options_authenticated_read ON answer_options;
CREATE POLICY answer_options_authenticated_read ON answer_options
  FOR SELECT USING (auth.role() = 'authenticated'::text);

-- Fragen
DROP POLICY questions_delete_admin ON questions;
CREATE POLICY questions_delete_admin ON questions
  FOR DELETE USING (can_admin_department(question_department(id)));

DROP POLICY questions_update_admin ON questions;
CREATE POLICY questions_update_admin ON questions
  FOR UPDATE USING (can_admin_department(question_department(id)));

DROP POLICY questions_insert_admin ON questions;
CREATE POLICY questions_insert_admin ON questions
  FOR INSERT WITH CHECK (is_admin() OR is_department_admin());

DROP POLICY questions_read ON questions;
CREATE POLICY questions_read ON questions
  FOR SELECT USING (
    (auth.role() = 'authenticated'::text)
    AND ((is_active = true) OR can_admin_department(question_department(id)))
  );

-- Fokus-Protokolle
DROP POLICY focus_events_admin_select ON assessment_focus_events;
CREATE POLICY focus_events_admin_select ON assessment_focus_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM assessment_focus_summary s
      JOIN graded_assessments ga ON ga.id = s.assessment_id
      WHERE s.session_id = assessment_focus_events.session_id
        AND can_admin_department(ga.department_id)
    )
  );

DROP POLICY focus_summary_admin_select ON assessment_focus_summary;
CREATE POLICY focus_summary_admin_select ON assessment_focus_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM graded_assessments ga
      WHERE ga.id = assessment_focus_summary.assessment_id
        AND can_admin_department(ga.department_id)
    )
  );

-- Nachweise
DROP POLICY graded_assessments_delete ON graded_assessments;
DROP POLICY graded_assessments_update ON graded_assessments;
DROP POLICY graded_assessments_insert ON graded_assessments;
DROP POLICY graded_assessments_select ON graded_assessments;
CREATE POLICY graded_assessments_admin_all ON graded_assessments
  FOR ALL
  USING (can_admin_department(department_id))
  WITH CHECK (can_admin_department(department_id));

-- Trigger und Funktionen
DROP TRIGGER questions_private_guard ON questions;
DROP TRIGGER graded_assessments_guard ON graded_assessments;
DROP FUNCTION public.questions_private_guard();
DROP FUNCTION public.graded_assessments_guard();
DROP FUNCTION public.can_edit_question(uuid);
DROP FUNCTION public.can_read_question_options(uuid);
DROP FUNCTION public.question_is_private(uuid);
DROP FUNCTION public.can_manage_private_question(uuid);
DROP FUNCTION public.assessment_shared_for(uuid, uuid);
DROP FUNCTION public.can_view_assessment_id(uuid);
DROP FUNCTION public.can_view_assessment(uuid, uuid, boolean);
DROP FUNCTION public.has_teacher_role();

-- Spalten
DROP INDEX IF EXISTS idx_graded_assessments_created_by;
DROP INDEX IF EXISTS idx_questions_owner_private;
ALTER TABLE questions
  DROP CONSTRAINT questions_owner_only_private,
  DROP CONSTRAINT questions_private_is_assessment_only,
  DROP COLUMN owner_id,
  DROP COLUMN is_private;
ALTER TABLE graded_assessments DROP COLUMN shared_with_department;
