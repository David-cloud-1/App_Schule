-- PROJ-38: Fragen-Import für Nachweise per Kopier-Prompt
--
-- Über den Nachweis-Import angelegte Fragen sind zunächst nur für Leistungs-
-- nachweise nutzbar (assessment_only = true). Die Übungswege (Quiz, Lücken
-- schließen, Blitzrunde, Prüfungssimulation, Übungs-API) lassen sie über die
-- gemeinsame Sperrliste (getLockedQuestionIds) aus. Der Admin gibt sie später
-- einzeln für den Übungsbetrieb frei (assessment_only = false).
-- Rein additiv: Bestandsfragen bleiben false, keine RLS-Änderung.

BEGIN;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS assessment_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN questions.assessment_only IS
  'true = nur in Leistungsnachweisen nutzbar, von allen Übungswegen ausgeschlossen, bis der Admin sie freigibt.';

COMMIT;
