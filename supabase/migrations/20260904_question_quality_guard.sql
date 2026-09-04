-- PROJ-16: Qualitäts-Torwächter für generierte Fragen
--
-- Speichert den Bericht der deterministischen Prüfung (src/lib/question-quality.ts)
-- am Entwurf. Entwürfe mit Blockern erhalten status = 'review_required' und
-- können damit weder über accept noch über bulk-accept freigegeben werden.

ALTER TABLE questions_draft
  ADD COLUMN IF NOT EXISTS quality_report jsonb;

COMMENT ON COLUMN questions_draft.quality_report IS
  'Ergebnis von analyzeQuestion(): { ok, blockers, warnings, findings[] }';

-- Fortschritts-Tabelle für Bestandsdurchläufe des Fixer-Agenten.
-- Ein Durchlauf = ein run_key (z. B. "durchlauf-5-satzanfang"), damit
-- mehrere Kampagnen nebeneinander laufen können, ohne sich zu überschreiben.
CREATE TABLE IF NOT EXISTS quality_fix_progress (
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  run_key text NOT NULL,
  done_at timestamptz NOT NULL DEFAULT now(),
  note text,
  PRIMARY KEY (question_id, run_key)
);

CREATE INDEX IF NOT EXISTS quality_fix_progress_run_idx
  ON quality_fix_progress (run_key);

ALTER TABLE quality_fix_progress ENABLE ROW LEVEL SECURITY;

-- Nur der Service-Role-Key (Audit-Script) und Admins arbeiten damit;
-- normale Nutzer haben keinerlei Zugriff.
DROP POLICY IF EXISTS quality_fix_progress_admin ON quality_fix_progress;
CREATE POLICY quality_fix_progress_admin ON quality_fix_progress
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
