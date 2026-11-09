-- PROJ-76: Leistungsnachweis – Gruppen A/B
--
-- Rein additiv mit Standardwerten: der bestehende Code läuft unverändert weiter.
-- Gruppen sind standardmäßig aus; ohne Gruppen mischt jeder Teilnehmer wie bisher einzeln.

ALTER TABLE graded_assessments
  ADD COLUMN IF NOT EXISTS groups_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_mix_seed integer,
  ADD COLUMN IF NOT EXISTS group_orders jsonb,
  ADD COLUMN IF NOT EXISTS group_join_counter integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN graded_assessments.groups_enabled IS
  'PROJ-76: Nachweis läuft in zwei Gruppen (A/B) mit fester Reihenfolge je Gruppe.';
COMMENT ON COLUMN graded_assessments.group_mix_seed IS
  'PROJ-76: Mischwert für Gruppe B im Entwurf (Neu mischen würfelt einen neuen).';
COMMENT ON COLUMN graded_assessments.group_orders IS
  'PROJ-76: Beim Öffnen eingefroren: {A:{questionOrder,optionOrder},B:{...}}; NULL im Entwurf und ohne Gruppen.';
COMMENT ON COLUMN graded_assessments.group_join_counter IS
  'PROJ-76: Wie vielen Teilnehmern schon eine Gruppe zugeteilt wurde (abwechselnd A, B, A, B).';

ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS group_label text CHECK (group_label IN ('A', 'B'));

COMMENT ON COLUMN exam_sessions.group_label IS
  'PROJ-76: Gruppe des Teilnehmers (A/B); NULL bei Nachweisen ohne Gruppen.';

-- Vergibt die nächste Beitrittsposition atomar (eine UPDATE-Anweisung sperrt die Zeile).
-- Gibt die Position VOR dem Hochzählen zurück: 0, 1, 2 … (gerade = A, ungerade = B).
CREATE OR REPLACE FUNCTION next_assessment_group_slot(p_assessment_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE graded_assessments
  SET group_join_counter = group_join_counter + 1
  WHERE id = p_assessment_id AND groups_enabled
  RETURNING group_join_counter - 1;
$$;

REVOKE ALL ON FUNCTION next_assessment_group_slot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION next_assessment_group_slot(uuid) TO service_role;
