-- PROJ-35: Resort-Katalog für den Fachbereich Tourismus + Bezeichnung „Resort“
--
-- 9 neue Items zu den 10 bestehenden aus PROJ-31 (diese bleiben unverändert, auch
-- die schon gekauften). Kategorien technisch unverändert; Anzeigenamen siehe
-- src/lib/hof-icons.tsx (Transfer · Gebäude & Freizeit · Ausstattung & Deko ·
-- Abzeichen). Icon-Schlüssel siehe RESORT_NEU in src/lib/hof-welt/resort-weich.ts.
-- Idempotent: ein vorhandenes Item gleichen Namens im Fachbereich wird nicht
-- erneut angelegt. Die Lehrkraft kann Preise, Seltenheit und Aktivstatus ändern.

INSERT INTO shop_items (name, description, icon, icon_key, category, price, is_active, sort_order, department_id)
SELECT v.name, v.description, v.icon, v.icon_key, v.category, v.price, true, v.sort_order, d.id
FROM departments d
CROSS JOIN (VALUES
  ('Rezeption',     'Hier checken deine Gäste im Resort ein.',            '🛎️', 'rezeption',    'gebaeude_deko',      90,  11),
  ('Minigolf',      'Eine Runde Minigolf mit Windmühle für Familien.',    '⛳', 'minigolf',     'gebaeude_deko',      120, 12),
  ('Spielplatz',    'Rutsche und Sandkasten für die kleinen Gäste.',      '🛝', 'spielplatz',   'gebaeude_deko',      140, 13),
  ('Strandbar',     'Cocktails unter dem Strohdach.',                     '🍹', 'strandbar',    'gebaeude_deko',      160, 14),
  ('Pool',          'Der große Pool mit Leiter und Schwimmring.',         '🏊', 'pool',         'gebaeude_deko',      180, 15),
  ('Restaurant',    'Frühstück und Abendessen auf der Terrasse.',         '🍽️', 'restaurant',   'gebaeude_deko',      220, 16),
  ('Sonnenliegen',  'Zwei Liegen mit Handtuch und Getränk.',             '🏖️', 'sonnenliegen', 'ladung_ausstattung', 50,  17),
  ('Brunnen',       'Ein plätschernder Brunnen vor dem Eingang.',        '⛲', 'brunnen',      'ladung_ausstattung', 110, 18),
  ('Shuttlebus',    'Bringt Gäste vom Flughafen direkt ins Resort.',      '🚐', 'shuttlebus',   'fahrzeuge',          80,  19)
) AS v(name, description, icon, icon_key, category, price, sort_order)
WHERE d.code = 'TOUR'
  AND NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name AND s.department_id = d.id);

UPDATE departments SET hof_name = 'Resort', hof_short_name = 'Resort' WHERE code = 'TOUR';
