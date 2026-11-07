-- PROJ-75: Aufgabenanalyse – zwei neue Merker, keine neuen Policies
--
-- 1. graded_assessments.excluded_question_ids: Fragen, die für DIESEN Nachweis
--    aus der Wertung genommen sind. Die Bewertung rechnet sie bei Punkten und
--    Maximum nicht mit (zentral in graded-assessments.ts). Rohantworten bleiben.
--    Änderbar nur bis zur Freigabe der Ergebnisse (in der Oberfläche geprüft).
-- 2. questions.blocked_for_assessments: Frage bleibt zum Üben erhalten, soll
--    aber in künftigen Nachweisen nicht mehr auftauchen.
--
-- Beide Spalten sind rein additiv mit Standardwerten; der alte Code läuft weiter.
-- Zugriff regeln die bestehenden Policies der beiden Tabellen (kein Eingriff in RLS).
--
-- Rückweg: 20261111_proj75_aufgabenanalyse_down.sql

BEGIN;

ALTER TABLE graded_assessments
  ADD COLUMN IF NOT EXISTS excluded_question_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS blocked_for_assessments boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_questions_blocked_for_assessments
  ON questions (id) WHERE blocked_for_assessments;

COMMIT;
