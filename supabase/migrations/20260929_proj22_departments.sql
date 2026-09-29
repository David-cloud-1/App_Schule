-- PROJ-22: Fachbereich als Datenbasis — Schritt 1 (additiv)
--
-- Legt den Fachbereich als Datensatz an und hängt ihn an alle Tabellen, deren
-- Inhalt sich je Bereich unterscheidet. Es gibt genau einen Bereich (SPED);
-- alle Bestandsdaten werden ihm zugeordnet. Die heute ausgelieferte App merkt
-- nichts:
--   * neue Spalten haben den Standardwert "Spedition", alte Inserts klappen weiter
--   * Fachkürzel bleiben faktisch eindeutig, solange es nur einen Bereich gibt
--   * subject_code an generation_jobs / questions_draft bleibt bis Schritt 3
--
-- Die Standardwerte (fallback_department_id()) sind Übergang: PROJ-23 ordnet
-- neue Profile über die Adresse zu, PROJ-24 entfernt die Standardwerte an
-- Inhalten, sobald Bereichs-Admins explizit einen Bereich setzen.
--
-- Rückweg: siehe 20260929_proj22_departments_down.sql
-- Nachtrag: 20260929_proj22_fallback_department_invoker.sql (SECURITY INVOKER)

BEGIN;

-- ── 1. Fachbereiche ─────────────────────────────────────────────────────────

CREATE TABLE departments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{2,10}$'),
  slug              text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,30}$'),
  domain            text UNIQUE CHECK (domain = lower(domain)),
  name              text NOT NULL,
  app_name          text NOT NULL,
  tagline           text NOT NULL DEFAULT '',
  meta_title        text NOT NULL,
  meta_description  text NOT NULL DEFAULT '',
  icon_name         text NOT NULL DEFAULT 'GraduationCap',
  currency_name     text NOT NULL,
  hof_name          text NOT NULL,
  prompt_role       text NOT NULL,
  target_group      text NOT NULL,
  prompt_notes      text,
  class_levels      integer[] NOT NULL DEFAULT '{10,11,12}',
  pseudonym_nouns   text[] NOT NULL DEFAULT '{}',
  sort_order        integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Name, Icon und Texte braucht schon die Login-Seite (vor dem Login) —
-- nichts davon ist vertraulich.
CREATE POLICY departments_read ON departments
  FOR SELECT USING (true);
CREATE POLICY departments_admin_insert ON departments
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY departments_admin_update ON departments
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY departments_admin_delete ON departments
  FOR DELETE USING (is_admin());

INSERT INTO departments (
  code, slug, domain, name, app_name, tagline, meta_title, meta_description,
  icon_name, currency_name, hof_name, prompt_role, target_group,
  class_levels, pseudonym_nouns, sort_order
) VALUES (
  'SPED', 'spedition', 'spedilern.vercel.app',
  'Speditionskaufleute', 'SpediLern',
  'Täglich lernen. Besser werden. Prüfung bestehen.',
  'SpediLern – Prüfungsvorbereitung Speditionskaufleute',
  'Täglich lernen. Besser werden. IHK-Prüfung bestehen.',
  'Truck', 'Frachtmünzen', 'Speditionshof',
  'Experte für Prüfungsfragen im Bereich Spedition und Logistik (IHK Bayern)',
  'angehende Speditionskaufleute',
  '{10,11,12}',
  ARRAY[
    'Tanker','Frachter','Kutter','Schlepper','Barge','Fähre','Containerschiff',
    'Motorschiff','Eisbrecher','Bulkcarrier','Kühlschiff','Schwergutschiff',
    'Feederschiff','Gastanker','Hochseeschlepper','Schubboot','Schubleichter',
    'Katamaran','Schnellboot','Küstenmotorschiff','Massengutfrachter',
    'Stückgutfrachter','Mehrzweckfrachter','Autofrachter','Tankschiff',
    'Küstenfahrer','Schleppkahn','Lotsenboot','Patrouillenboot','Schwimmkran',
    'Trailer','Sattelzug','Tieflader','Transporter','Tankwagen','Waggon',
    'Lokomotive','Güterzug','Gliederzug','Hängerzug','Kühlfahrzeug','Kranwagen',
    'Hubwagen','Muldenkipper','Tankzug','Silowagen','Autotransporter',
    'Schienenfahrzeug','Rangierlokomotive','Güterwaggon',
    'Frachtflieger','Frachtflugzeug','Hubschrauber','Drohne','Zeppelin',
    'Transportflugzeug','Luftfrachter','Chartermaschine',
    'Hafen','Kai','Dock','Terminal','Depot','Hub','Rampe','Lager','Hangar',
    'Schleuse','Rollfeld','Bahnhof','Güterbahnhof','Freizone','Umschlaghalle',
    'Containerterminal','Verteilzentrum','Logistikzentrum','Freihafen',
    'Binnenhafen','Seehafen','Flughafen','Rangierbahnhof','Anleger','Pier',
    'Mole','Kanal','Verladebahnhof','Umschlagzentrum','Kühlhaus',
    'Hochregallager','Ladehof','Güterhalle','Außenlager','Zollager',
    'Umschlagbahnhof','Abfertigungshalle','Kommissionierlager','Blocklager','Pufferlager',
    'Kran','Gabelstapler','Palette','Container','Anker','Kompass','Radar','Mast',
    'Ladebrücke','Rolltor','Portalkran','Brückenkran','Schwenkkran','Reachstacker',
    'Hubstapler','Förderband','Scanner','Transponder','Leuchtturm','Leine',
    'Trosse','Winde','Spreader','Signalhorn','Klampe','Bake','Seilzug',
    'Kettenzug','Rollwagen','Hubgerüst','Ladebordwand','Stapler','Radlader',
    'Schienenweiche','Rangiermotor',
    'Lotse','Kapitän','Stauer','Reeder','Spediteur','Kurier','Zöllner',
    'Disponent','Frachtführer','Funker','Navigator','Steuermann','Matrose',
    'Bootsmann','Hafenmeister','Lagerist','Verlader','Makler','Prüfer',
    'Schiffsmakler','Charterer','Frachtmakler',
    'Fracht','Cargo','Express','Charter','Manifest','Frachtbrief','Konossement',
    'Sendung','Ladung','Stückgut','Sammelgut','Eilgut','Massengut','Schüttgut',
    'Gefahrgut','Kühlgut','Schwergut','Langgut','Sperrgut','Transit','Zoll',
    'Route','Tour','Disposition','Verladung','Entladung','Abfertigung',
    'Konsolidierung','Umschlag','Lieferung','Routing','Korridor','Umlauf',
    'Frachtrate','Akkreditiv',
    'Schnelldienst','Direktdienst','Sammeldienst','Liniendienst','Expressversand',
    'Nachtsprung','Stafette','Shuttle','Kurierdienst','Linienfracht'
  ],
  1
);

-- Übergangs-Standardwert: solange es nur Spedition gibt, landet alles dort.
CREATE FUNCTION fallback_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM departments WHERE code = 'SPED'
$$;

-- ── 2. Profile ──────────────────────────────────────────────────────────────
-- Bleibt NULL-fähig: ab PROJ-23 bedeutet NULL "noch keinem Bereich zugeordnet".
-- Nicht selbst änderbar — der Spalten-Grant aus 20260924_lock_profile_columns
-- erlaubt Nutzern nur display_name, show_real_name, leaderboard_opt_out,
-- starter_coins_seen.

ALTER TABLE profiles
  ADD COLUMN department_id uuid REFERENCES departments(id)
  DEFAULT fallback_department_id();
UPDATE profiles SET department_id = fallback_department_id() WHERE department_id IS NULL;
CREATE INDEX idx_profiles_department_id ON profiles(department_id);

-- ── 3. Fächer: Kürzel nur noch je Bereich eindeutig (E4) ───────────────────

ALTER TABLE subjects
  ADD COLUMN department_id uuid NOT NULL REFERENCES departments(id)
  DEFAULT fallback_department_id();
ALTER TABLE subjects DROP CONSTRAINT subjects_code_key;
ALTER TABLE subjects ADD CONSTRAINT subjects_department_code_key UNIQUE (department_id, code);

-- Reihenfolge (Prompt, Fächerliste) und Beschreibungen standen bisher nur im
-- Code (ai-generator CLAUDE_PROMPT, subjects-grid SUBJECT_META).
ALTER TABLE subjects ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
UPDATE subjects s SET
  sort_order  = v.sort_order,
  description = COALESCE(s.description, v.description)
FROM (VALUES
  ('BGP', 1, 'Wirtschaft, Recht, Unternehmensprozesse und gesamtwirtschaftliche Zusammenhänge'),
  ('KSK', 2, 'Kosten-/Leistungsrechnung, Controlling, Preisangebote und Kalkulation'),
  ('STG', 3, 'Transport, Umschlag, Lager, Zoll und internationale Logistik'),
  ('LOP', 4, 'Logistikdienstleistungen, Lagerung, Kommissionierung und Warenfluss'),
  ('PUG', 5, 'Politische Systeme, Gesellschaft, Grundrechte und staatliche Ordnung')
) AS v(code, sort_order, description)
WHERE s.code = v.code;
CREATE INDEX idx_subjects_department_id ON subjects(department_id);

-- ── 4. Prüfungsteile ────────────────────────────────────────────────────────

ALTER TABLE exam_parts DROP CONSTRAINT exam_parts_code_check;
ALTER TABLE exam_parts DROP CONSTRAINT exam_parts_code_key;
ALTER TABLE exam_parts
  ADD COLUMN department_id       uuid NOT NULL REFERENCES departments(id) DEFAULT fallback_department_id(),
  ADD COLUMN part_number         integer CHECK (part_number >= 1),
  ADD COLUMN title               text,
  ADD COLUMN subtitle            text NOT NULL DEFAULT '',
  ADD COLUMN short_label         text,
  ADD COLUMN icon_name           text NOT NULL DEFAULT 'BookOpen',
  ADD COLUMN color               text NOT NULL DEFAULT '#1CB0F6',
  ADD COLUMN question_count      integer CHECK (question_count BETWEEN 1 AND 200),
  ADD COLUMN duration_minutes    integer CHECK (duration_minutes BETWEEN 1 AND 600),
  ADD COLUMN open_question_share numeric(3,2) NOT NULL DEFAULT 0 CHECK (open_question_share BETWEEN 0 AND 1),
  ADD COLUMN default_subject_id  uuid REFERENCES subjects(id) ON DELETE SET NULL;

-- Werte 1:1 aus dem bisherigen Code (exam/sessions PART_CONFIG,
-- exam-landing-client PARTS, exam-sets-client PART_LABELS, exam-sets/import
-- PART_DEFAULT_SUBJECT). Farben = bisherige ExamPartTag-Farben.
UPDATE exam_parts ep SET
  part_number = v.part_number, title = v.title, subtitle = v.subtitle,
  short_label = v.short_label, icon_name = v.icon_name, color = v.color,
  question_count = v.question_count, duration_minutes = v.duration_minutes,
  open_question_share = v.open_share,
  default_subject_id = (SELECT id FROM subjects WHERE code = v.default_code)
FROM (VALUES
  ('LEISTUNG', 1, 'Leistungserstellung', 'Spedition & Logistik', 'Leistungserstellung', 'Truck',      '#3B82F6', 20, 90, 0.70, 'STG'),
  ('KSK',      2, 'Kaufm. Steuerung',    '& Kontrolle',          'KSK',                 'Calculator', '#F97316', 15, 90, 0.00, 'KSK'),
  ('WISO',     3, 'Wirtschafts- &',      'Sozialkunde',          'WiSo',                'BookOpen',   '#A855F7', 15, 45, 0.00, 'BGP')
) AS v(code, part_number, title, subtitle, short_label, icon_name, color, question_count, duration_minutes, open_share, default_code)
WHERE ep.code = v.code;

ALTER TABLE exam_parts
  ALTER COLUMN part_number SET NOT NULL,
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN short_label SET NOT NULL,
  ALTER COLUMN question_count SET NOT NULL,
  ALTER COLUMN duration_minutes SET NOT NULL;
ALTER TABLE exam_parts ADD CONSTRAINT exam_parts_department_code_key UNIQUE (department_id, code);
ALTER TABLE exam_parts ADD CONSTRAINT exam_parts_department_part_key UNIQUE (department_id, part_number);

CREATE POLICY exam_parts_admin_write ON exam_parts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Welche Fächer gehören zu welchem Teil
CREATE TABLE exam_part_subjects (
  exam_part_id uuid NOT NULL REFERENCES exam_parts(id) ON DELETE CASCADE,
  subject_id   uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_part_id, subject_id)
);
ALTER TABLE exam_part_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_part_subjects_authenticated_read ON exam_part_subjects
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY exam_part_subjects_admin_write ON exam_part_subjects
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE INDEX idx_exam_part_subjects_subject_id ON exam_part_subjects(subject_id);

INSERT INTO exam_part_subjects (exam_part_id, subject_id)
SELECT ep.id, s.id
FROM exam_parts ep
JOIN (VALUES ('LEISTUNG','STG'), ('LEISTUNG','LOP'), ('KSK','KSK'), ('WISO','BGP')) AS v(part_code, subject_code)
  ON v.part_code = ep.code
JOIN subjects s ON s.code = v.subject_code;

-- ── 5. Prüfungssets & Leistungsnachweise: Teil muss im Bereich existieren ──

ALTER TABLE exam_question_sets
  ADD COLUMN department_id uuid NOT NULL REFERENCES departments(id) DEFAULT fallback_department_id();
ALTER TABLE exam_question_sets DROP CONSTRAINT exam_question_sets_part_check;
ALTER TABLE exam_question_sets
  ADD CONSTRAINT exam_question_sets_part_fkey
  FOREIGN KEY (department_id, part) REFERENCES exam_parts(department_id, part_number);
CREATE INDEX idx_exam_question_sets_department_id ON exam_question_sets(department_id);

ALTER TABLE graded_assessments
  ADD COLUMN department_id uuid NOT NULL REFERENCES departments(id) DEFAULT fallback_department_id();
ALTER TABLE graded_assessments DROP CONSTRAINT graded_assessments_part_check;
ALTER TABLE graded_assessments
  ADD CONSTRAINT graded_assessments_part_fkey
  FOREIGN KEY (department_id, part) REFERENCES exam_parts(department_id, part_number);
CREATE INDEX idx_graded_assessments_department_id ON graded_assessments(department_id);

-- ── 6. Shop ─────────────────────────────────────────────────────────────────

ALTER TABLE shop_items
  ADD COLUMN department_id uuid NOT NULL REFERENCES departments(id) DEFAULT fallback_department_id();
CREATE INDEX idx_shop_items_department_id ON shop_items(department_id);

-- ── 7. Badges: Regeln als Daten ─────────────────────────────────────────────
-- Badge-IDs bleiben (user_badges hängt daran). Allrounder zählt künftig alle
-- aktiven Fächer des Bereichs — für Spedition also neu auch PUG (Nutzerwunsch
-- 2026-09-29; niemand verliert dadurch etwas).

ALTER TABLE badges
  ADD COLUMN rule       text CHECK (rule IN ('sessions','streak','all_rounder','subject_expert','perfect_session','level')),
  ADD COLUMN threshold  integer CHECK (threshold >= 1),
  ADD COLUMN subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE;

UPDATE badges b SET rule = v.rule, threshold = v.threshold
FROM (VALUES
  ('first_step',    'sessions',        1),
  ('on_the_way',    'sessions',        10),
  ('learning_pro',  'sessions',        50),
  ('fire_starter',  'streak',          3),
  ('week_warrior',  'streak',          7),
  ('month_master',  'streak',          30),
  ('all_rounder',   'all_rounder',     10),
  ('bgp_expert',    'subject_expert',  100),
  ('ksk_expert',    'subject_expert',  100),
  ('stg_expert',    'subject_expert',  100),
  ('lop_expert',    'subject_expert',  100),
  ('perfectionist', 'perfect_session', NULL),
  ('level_10',      'level',           10),
  ('level_25',      'level',           25),
  ('exam_ready',    'level',           50)
) AS v(id, rule, threshold)
WHERE b.id = v.id;

UPDATE badges b SET subject_id = s.id
FROM subjects s
WHERE s.code = upper(split_part(b.id, '_', 1)) AND b.rule = 'subject_expert';

ALTER TABLE badges ALTER COLUMN rule SET NOT NULL;
ALTER TABLE badges ADD CONSTRAINT badges_subject_expert_check
  CHECK ((rule = 'subject_expert') = (subject_id IS NOT NULL));
ALTER TABLE badges ADD CONSTRAINT badges_threshold_required_check
  CHECK (rule = 'perfect_session' OR threshold IS NOT NULL);

-- ── 8. Audit-Log ────────────────────────────────────────────────────────────

ALTER TABLE admin_audit_log
  ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
UPDATE admin_audit_log SET department_id = fallback_department_id();
CREATE INDEX idx_admin_audit_log_department_id ON admin_audit_log(department_id);

-- ── 9. KI-Upload-Pfad: Fach als Verweis statt Kürzel-Text ───────────────────
-- subject_code bleibt bis Schritt 3 (Rückfall für den alten Code).

ALTER TABLE generation_jobs DROP CONSTRAINT generation_jobs_subject_code_check;
ALTER TABLE generation_jobs ADD COLUMN subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;
UPDATE generation_jobs j SET subject_id = s.id FROM subjects s WHERE s.code = j.subject_code;

ALTER TABLE questions_draft DROP CONSTRAINT questions_draft_subject_code_check;
ALTER TABLE questions_draft ADD COLUMN subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;
UPDATE questions_draft d SET subject_id = s.id FROM subjects s WHERE s.code = d.subject_code;

-- ── 10. Pseudonyme mit den Nomen des Bereichs ───────────────────────────────

DROP TRIGGER trg_assign_pseudonym ON profiles;
DROP FUNCTION assign_pseudonym_on_insert();
DROP FUNCTION generate_unique_pseudonym();

CREATE FUNCTION generate_unique_pseudonym(p_department_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
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
  -- Neutraler Rückfall, falls ein Bereich (noch) keine Nomen hat
  fallback_nouns TEXT[] := ARRAY[
    'Entdecker','Lerner','Planer','Profi','Stratege','Macher','Navigator',
    'Kompass','Pionier','Tüftler','Denker','Könner','Aufsteiger','Champion'
  ];
  nouns TEXT[];
  candidate TEXT;
  attempts INT := 0;
BEGIN
  SELECT pseudonym_nouns INTO nouns
  FROM departments
  WHERE id = COALESCE(p_department_id, fallback_department_id());

  IF nouns IS NULL OR array_length(nouns, 1) IS NULL THEN
    nouns := fallback_nouns;
  END IF;

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
$$;

CREATE FUNCTION assign_pseudonym_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.pseudonym IS NULL THEN
    NEW.pseudonym := generate_unique_pseudonym(NEW.department_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_pseudonym
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_pseudonym_on_insert();

REVOKE EXECUTE ON FUNCTION generate_unique_pseudonym(uuid) FROM anon;

COMMIT;
