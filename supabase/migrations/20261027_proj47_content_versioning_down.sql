-- Rollback für PROJ-47: Änderungsverlauf & Wiederherstellen für Inhalte

DROP TRIGGER IF EXISTS trg_answer_options_touch_question ON answer_options;
DROP FUNCTION IF EXISTS touch_question_on_option_change();

DROP TRIGGER IF EXISTS trg_questions_version ON questions;
DROP TRIGGER IF EXISTS trg_topics_version ON topics;
DROP TRIGGER IF EXISTS trg_subjects_version ON subjects;
DROP TRIGGER IF EXISTS trg_exam_question_sets_version ON exam_question_sets;
DROP FUNCTION IF EXISTS record_content_version();

DROP TRIGGER IF EXISTS trg_questions_bump_version ON questions;
DROP TRIGGER IF EXISTS trg_topics_bump_version ON topics;
DROP TRIGGER IF EXISTS trg_subjects_bump_version ON subjects;
DROP TRIGGER IF EXISTS trg_exam_question_sets_bump_version ON exam_question_sets;
DROP FUNCTION IF EXISTS bump_version_number();

DROP FUNCTION IF EXISTS group_recent_versions_into_batch(text, uuid[], text);
DROP FUNCTION IF EXISTS question_snapshot(uuid);

DROP TABLE IF EXISTS content_versions;
DROP TABLE IF EXISTS content_change_batches;

DROP INDEX IF EXISTS idx_questions_deleted_at;
DROP INDEX IF EXISTS idx_topics_deleted_at;
DROP INDEX IF EXISTS idx_subjects_deleted_at;
DROP INDEX IF EXISTS idx_exam_question_sets_deleted_at;

DROP INDEX IF EXISTS topics_subject_id_name_key;
ALTER TABLE topics ADD CONSTRAINT topics_subject_id_name_key UNIQUE (subject_id, name);

DROP INDEX IF EXISTS subjects_department_code_key;
ALTER TABLE subjects ADD CONSTRAINT subjects_department_code_key UNIQUE (department_id, code);

ALTER TABLE questions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE questions DROP COLUMN IF EXISTS version_number;

ALTER TABLE topics DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE topics DROP COLUMN IF EXISTS version_number;

ALTER TABLE subjects DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE subjects DROP COLUMN IF EXISTS version_number;

ALTER TABLE exam_question_sets DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE exam_question_sets DROP COLUMN IF EXISTS version_number;
