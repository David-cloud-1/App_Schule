-- PROJ-39: Leistungsnachweis – Kategorisierung & Filter
--
-- Rein additive Ablage-Felder an graded_assessments: Schuljahr, Klasse, Fach.
-- Sie dienen nur der Sortierung/Filterung in der Admin-Liste und werden von
-- keinem Teilnehmer-Pfad (Beitritt, Auswertung, Druck) gelesen.
-- Keine RLS-Änderung: graded_assessments_admin_all gilt weiter.
-- Der alte Code (ohne diese Felder) läuft unverändert weiter: school_year hat
-- einen Standardwert, Klasse und Fach sind optional.
-- Rückweg: 20261021_proj39_assessment_category_down.sql

BEGIN;

-- Schuljahr zu einem Zeitpunkt: ab 1. September (Europe/Berlin) beginnt das
-- neue Schuljahr, z. B. 15.10.2026 -> '2026/27', 20.06.2027 -> '2026/27'.
CREATE OR REPLACE FUNCTION current_school_year(ts timestamptz DEFAULT now())
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN extract(month FROM ts AT TIME ZONE 'Europe/Berlin') >= 9
      THEN extract(year FROM ts AT TIME ZONE 'Europe/Berlin')::int::text
           || '/' || lpad(((extract(year FROM ts AT TIME ZONE 'Europe/Berlin')::int + 1) % 100)::text, 2, '0')
    ELSE (extract(year FROM ts AT TIME ZONE 'Europe/Berlin')::int - 1)::text
           || '/' || lpad((extract(year FROM ts AT TIME ZONE 'Europe/Berlin')::int % 100)::text, 2, '0')
  END
$$;

ALTER TABLE graded_assessments
  ADD COLUMN IF NOT EXISTS school_year text,
  ADD COLUMN IF NOT EXISTS class_name  text,
  ADD COLUMN IF NOT EXISTS subject_id  uuid REFERENCES subjects(id) ON DELETE SET NULL;

-- Bestand: Schuljahr aus dem Erstelldatum nachtragen
UPDATE graded_assessments
SET school_year = current_school_year(created_at)
WHERE school_year IS NULL;

ALTER TABLE graded_assessments
  ALTER COLUMN school_year SET DEFAULT current_school_year(),
  ALTER COLUMN school_year SET NOT NULL;

ALTER TABLE graded_assessments
  ADD CONSTRAINT graded_assessments_school_year_check
    CHECK (school_year ~ '^[0-9]{4}/[0-9]{2}$'),
  ADD CONSTRAINT graded_assessments_class_name_check
    CHECK (class_name IS NULL OR char_length(class_name) BETWEEN 1 AND 30);

CREATE INDEX IF NOT EXISTS graded_assessments_dept_school_year_idx
  ON graded_assessments (department_id, school_year);
CREATE INDEX IF NOT EXISTS graded_assessments_subject_idx
  ON graded_assessments (subject_id);

COMMENT ON COLUMN graded_assessments.school_year IS
  'Schuljahr als "2026/27"; Standard aus dem Erstelldatum (ab 1.9. neues Schuljahr), überschreibbar. Nur Ablage.';
COMMENT ON COLUMN graded_assessments.class_name IS
  'Reale Klasse als Freitext (z. B. "SP11a"), optional. Nur Ablage, keine Teilnehmerzuordnung.';
COMMENT ON COLUMN graded_assessments.subject_id IS
  'Genau ein Fach des Fachbereichs, optional. Fällt bei gelöschtem Fach auf NULL zurück. Nur Ablage.';

COMMIT;
