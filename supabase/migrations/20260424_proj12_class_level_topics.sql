-- PROJ-12: Klassenstufen & Themen
-- Apply this migration in the Supabase SQL Editor

-- ─── 1. topics table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, name)
);

CREATE INDEX IF NOT EXISTS topics_subject_id_idx ON topics (subject_id);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read topics
CREATE POLICY "topics: authenticated read"
  ON topics FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "topics: admin insert"
  ON topics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "topics: admin update"
  ON topics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "topics: admin delete"
  ON topics FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 2. questions: add class_level and topic_id ───────────────────────────────
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS class_level integer CHECK (class_level IN (10, 11, 12)),
  ADD COLUMN IF NOT EXISTS topic_id    uuid REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS questions_class_level_idx ON questions (class_level);
CREATE INDEX IF NOT EXISTS questions_topic_id_idx    ON questions (topic_id);

-- ─── 3. questions_draft: add class_level ─────────────────────────────────────
ALTER TABLE questions_draft
  ADD COLUMN IF NOT EXISTS class_level integer CHECK (class_level IN (10, 11, 12));

-- ─── 4. generation_jobs: add class_level ─────────────────────────────────────
ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS class_level integer CHECK (class_level IN (10, 11, 12));
