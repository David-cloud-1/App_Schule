-- Rollback für PROJ-70 Teil 1: Rechte wieder an Fach-Zuständigkeiten (PROJ-48) binden

BEGIN;

DROP TRIGGER IF EXISTS trg_questions_guard_delete ON questions;
DROP TRIGGER IF EXISTS trg_topics_guard_delete ON topics;
DROP TRIGGER IF EXISTS trg_subjects_guard_delete ON subjects;
DROP TRIGGER IF EXISTS trg_exam_question_sets_guard_delete ON exam_question_sets;
DROP FUNCTION IF EXISTS guard_hard_delete();
DROP FUNCTION IF EXISTS content_is_fresh_own(text, uuid);

ALTER POLICY content_versions_read ON content_versions
  USING (
    is_admin()
    OR can_admin_department(department_id)
    OR (has_teacher_role() AND changed_by = auth.uid())
    OR (has_teacher_role() AND department_id IS NOT NULL AND has_teacher_assignment_department(department_id))
  );

CREATE OR REPLACE FUNCTION can_admin_subject(p_subject_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_admin()
    OR can_admin_department(subject_department(p_subject_id))
    OR (has_teacher_role() AND has_teacher_assignment_subject(p_subject_id))
$$;

CREATE OR REPLACE FUNCTION can_admin_department_content(p_department_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT can_admin_department(p_department_id)
    OR (has_teacher_role() AND has_teacher_assignment_department(p_department_id))
$$;

CREATE OR REPLACE FUNCTION can_admin_question(p_question_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_admin()
    OR can_admin_department(question_department(p_question_id))
    OR (has_teacher_role() AND EXISTS (
      SELECT 1 FROM question_subjects qs
      WHERE qs.question_id = p_question_id AND has_teacher_assignment_subject(qs.subject_id)
    ))
$$;

COMMIT;
