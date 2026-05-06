-- Add subject_code and topic_id to generation_jobs so the admin can pre-set
-- these at upload time and have Claude generate contextually focused questions.
-- Add topic_id to questions_draft so it flows through to the accepted question.

ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS subject_code text CHECK (subject_code IN ('BGP', 'KSK', 'STG', 'LOP', 'PUG')),
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES topics(id) ON DELETE SET NULL;

ALTER TABLE questions_draft
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES topics(id) ON DELETE SET NULL;
