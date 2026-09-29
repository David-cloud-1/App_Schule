-- PROJ-22 Schritt 1 — RÜCKWEG (nur bei Bedarf manuell ausführen)
--
-- Stellt den Zustand vor 20260929_proj22_departments.sql her. Funktioniert
-- nur, solange es ausschließlich den Bereich SPED gibt (sonst wären Kürzel
-- nicht mehr global eindeutig). Neu angelegte Badge-Regeln, Prüfungsteil-
-- Werte und Bereichsdaten gehen dabei verloren.

BEGIN;

-- Pseudonyme: alte, parameterlose Funktion zurück
DROP TRIGGER trg_assign_pseudonym ON profiles;
DROP FUNCTION assign_pseudonym_on_insert();
DROP FUNCTION generate_unique_pseudonym(uuid);

-- Die Nomen stehen nach dem Rückweg wieder fest in der Funktion; sie werden
-- vorher aus departments übernommen, damit die Tabelle danach weg kann.
DO $do$
DECLARE
  nouns_literal text;
BEGIN
  SELECT quote_literal(pseudonym_nouns::text) INTO nouns_literal
  FROM departments WHERE code = 'SPED';

  EXECUTE format($fn$
CREATE FUNCTION generate_unique_pseudonym()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $body$
DECLARE
  adjectives TEXT[] := ARRAY[
    'Schneller','Stiller','Mutiger','Kühner','Flinker','Weiser','Starker','Treuer',
    'Wilder','Eiserner','Wacher','Freier','Stolzer','Rasender','Tapferer','Leiser',
    'Kluger','Edler','Beherzter','Furchtloser','Präziser','Fixer','Agiler','Dynamischer',
    'Stabiler','Robuster','Unerschrockener','Gewandter','Entschlossener','Erfahrener',
    'Cleverer','Geschickter','Wendiger','Ausdauernder','Beharrlicher','Ehrgeiziger',
    'Fleißiger','Pünktlicher','Sorgfältiger','Tüchtiger','Tatkräftiger','Konzentrierter',
    'Effizienter','Schneidiger','Kerniger','Überlegener','Siegreicher','Unaufhaltsamer',
    'Stürmischer','Kraftvoller','Gewaltiger','Mächtiger','Majestätischer','Legendärer',
    'Ehrenhafter','Rüstiger','Wackerer','Feuriger','Leidenschaftlicher','Begeisterter',
    'Motivierter','Zielstrebiger','Fröhlicher','Frischer','Lebhafter','Schwungvoller',
    'Aufmerksamer','Gewissenhafter','Verlässlicher','Standhafter','Gewiefter',
    'Schlagfertiger','Trittsicherer','Seefester','Erprobter','Unverzagter',
    'Besonnener','Nachdenklicher','Behäbiger','Unermüdlicher'
  ];
  nouns TEXT[] := %s::text[];
  candidate TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    attempts := attempts + 1;
    IF attempts > 200 THEN
      RAISE EXCEPTION 'Kein eindeutiger Pseudonym nach 200 Versuchen generierbar';
    END IF;
    candidate := adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
                 || ' '
                 || nouns[1 + floor(random() * array_length(nouns, 1))::int];
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE pseudonym = candidate) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$body$
$fn$, nouns_literal);
END
$do$;

CREATE FUNCTION assign_pseudonym_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.pseudonym IS NULL THEN
    NEW.pseudonym := generate_unique_pseudonym();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_assign_pseudonym
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_pseudonym_on_insert();

-- KI-Upload-Pfad
ALTER TABLE questions_draft DROP COLUMN subject_id;
ALTER TABLE generation_jobs DROP COLUMN subject_id;

-- Audit-Log, Shop
ALTER TABLE admin_audit_log DROP COLUMN department_id;
ALTER TABLE shop_items DROP COLUMN department_id;

-- Badges
ALTER TABLE badges DROP CONSTRAINT badges_subject_expert_check;
ALTER TABLE badges DROP CONSTRAINT badges_threshold_required_check;
ALTER TABLE badges DROP COLUMN subject_id, DROP COLUMN threshold, DROP COLUMN rule;

-- Prüfungssets & Leistungsnachweise
ALTER TABLE graded_assessments DROP CONSTRAINT graded_assessments_part_fkey;
ALTER TABLE graded_assessments DROP COLUMN department_id;
ALTER TABLE graded_assessments ADD CONSTRAINT graded_assessments_part_check CHECK (part = ANY (ARRAY[1, 2, 3]));
ALTER TABLE exam_question_sets DROP CONSTRAINT exam_question_sets_part_fkey;
ALTER TABLE exam_question_sets DROP COLUMN department_id;
ALTER TABLE exam_question_sets ADD CONSTRAINT exam_question_sets_part_check CHECK (part = ANY (ARRAY[1, 2, 3]));

-- Prüfungsteile
DROP TABLE exam_part_subjects;
DROP POLICY exam_parts_admin_write ON exam_parts;
ALTER TABLE exam_parts DROP CONSTRAINT exam_parts_department_part_key;
ALTER TABLE exam_parts DROP CONSTRAINT exam_parts_department_code_key;
ALTER TABLE exam_parts
  DROP COLUMN department_id, DROP COLUMN part_number, DROP COLUMN title,
  DROP COLUMN subtitle, DROP COLUMN short_label, DROP COLUMN icon_name,
  DROP COLUMN color, DROP COLUMN question_count, DROP COLUMN duration_minutes,
  DROP COLUMN open_question_share, DROP COLUMN default_subject_id;
ALTER TABLE exam_parts ADD CONSTRAINT exam_parts_code_key UNIQUE (code);
ALTER TABLE exam_parts ADD CONSTRAINT exam_parts_code_check CHECK (code = ANY (ARRAY['LEISTUNG', 'KSK', 'WISO']));

-- Fächer
ALTER TABLE subjects DROP CONSTRAINT subjects_department_code_key;
ALTER TABLE subjects DROP COLUMN department_id, DROP COLUMN sort_order;
ALTER TABLE subjects ADD CONSTRAINT subjects_code_key UNIQUE (code);

-- Profile
ALTER TABLE profiles DROP COLUMN department_id;

DROP FUNCTION fallback_department_id();
DROP TABLE departments;

COMMIT;
