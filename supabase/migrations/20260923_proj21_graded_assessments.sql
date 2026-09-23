-- PROJ-21: Benotete Leistungsnachweise
--
-- Ein Leistungsnachweis ist ein einmaliger, benoteter Durchlauf zu einem
-- bestehenden Prüfungsset (exam_question_sets) mit eigenem Beitrittscode.
-- Die Teilnehmergruppe entsteht ausschließlich durch die Code-Eingabe — es
-- gibt bewusst keine Klassen-/Kohortenzuordnung (siehe PROJ-15).

-- ── Leistungsnachweise ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS graded_assessments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_set_id           uuid NOT NULL REFERENCES exam_question_sets(id) ON DELETE RESTRICT,
  part                  integer NOT NULL CHECK (part IN (1, 2, 3)),
  title                 text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  access_code           text NOT NULL UNIQUE CHECK (access_code = upper(access_code)),
  -- Fragen-Snapshot: befüllt erst beim Öffnen (Status draft -> open). Spätere
  -- Änderungen am Set wirken sich dann nicht mehr auf diesen Nachweis aus.
  question_ids_snapshot uuid[],
  duration_minutes      integer NOT NULL CHECK (duration_minutes BETWEEN 5 AND 600),
  opens_at              timestamptz NOT NULL,
  closes_at             timestamptz NOT NULL CHECK (closes_at > opens_at),
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  max_attempts          integer NOT NULL DEFAULT 1 CHECK (max_attempts >= 1),
  grading_scale         jsonb NOT NULL,
  shuffle               boolean NOT NULL DEFAULT true,
  results_released_at   timestamptz,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN graded_assessments.question_ids_snapshot IS
  'NULL solange status=draft. Beim Öffnen aus exam_question_sets.question_ids eingefroren.';
COMMENT ON COLUMN graded_assessments.grading_scale IS
  'Array von {grade: 1-6, minPercent: 0-100}, absteigend, Note 6 beginnt bei 0.';

CREATE INDEX IF NOT EXISTS graded_assessments_exam_set_idx ON graded_assessments (exam_set_id);
CREATE INDEX IF NOT EXISTS graded_assessments_status_idx ON graded_assessments (status);

ALTER TABLE graded_assessments ENABLE ROW LEVEL SECURITY;

-- Bewusst KEINE Lese-Policy für normale Nutzer: der Beitrittscode ist der
-- einzige Zugangsweg, und der läuft ausschließlich über server-seitige API-
-- Routen mit dem Service-Client (siehe /api/assessments/*). So bleibt auch
-- ein Nachweis im Entwurf oder mit abgelaufenem Fenster für alle außer dem
-- Admin unsichtbar/unauffindbar.
DROP POLICY IF EXISTS graded_assessments_admin_all ON graded_assessments;
CREATE POLICY graded_assessments_admin_all ON graded_assessments
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── exam_sessions-Erweiterung ────────────────────────────────────────────────

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES graded_assessments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participant_name text,
  ADD COLUMN IF NOT EXISTS excluded_from_grading boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN exam_sessions.assessment_id IS
  'NULL für normale Prüfungssimulationen. Gesetzt für Leistungsnachweis-Sessions (PROJ-21).';
COMMENT ON COLUMN exam_sessions.participant_name IS
  'Klarname, einmalig beim Beitritt erfasst. Nur für Admin sichtbar, nie im Leaderboard.';
COMMENT ON COLUMN exam_sessions.excluded_from_grading IS
  'Admin kann eine versehentliche Teilnahme aus Notenspiegel/Statistik ausschließen (bleibt sichtbar).';

CREATE INDEX IF NOT EXISTS exam_sessions_assessment_idx ON exam_sessions (assessment_id);

-- Ein Versuch pro Nutzer und Nachweis. Bei mehrfachem gleichzeitigem Beitritt
-- (zweites Gerät/Tab) gewinnt nur ein INSERT — der Beitritts-Endpunkt fängt
-- den 23505-Fehler ab und gibt die bereits bestehende Session zurück (wie
-- schon bei blitz_rounds in PROJ-19). Bei assessment_id = NULL (normale
-- Prüfungen) greift die Regel nicht, da NULL-Werte in einem UNIQUE-Constraint
-- nie als gleich gelten.
CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_one_attempt_per_assessment
  ON exam_sessions (assessment_id, user_id);

-- ── Schutz gegen Code-Erraten ────────────────────────────────────────────────

-- Zählt fehlgeschlagene Code-Versuche je Nutzer in einem gleitenden Fenster.
-- Bewusst kein externer Dienst (Upstash o. Ä.) — passt zum Low-Budget-Rahmen
-- des Projekts, siehe Tech-Design-Entscheidung in der Spec.
CREATE TABLE IF NOT EXISTS assessment_lookup_attempts (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start  timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0
);

ALTER TABLE assessment_lookup_attempts ENABLE ROW LEVEL SECURITY;
-- Keine Policies — nur der Service-Client (server-seitig, in der lookup-Route)
-- liest/schreibt hier; RLS ohne Policy blockt jeden regulären Client-Zugriff.

-- ── Bestehende Prüfungs-Session-Funktion: participant_name für RLS-Insert ───
-- Keine RLS-Änderung an exam_sessions nötig — "Users create/see/update own
-- exam sessions" greift unverändert auch für die neuen Spalten.
