-- PROJ-37: Tiere als kaufbare Items (laufen frei im Gelände, werden nicht gesetzt)
--
-- Spedition: Hofhund, Hofkatze, Hühner · Tourismus: Strandhund, Flamingo,
-- Papagei, Krebs. Icon-Schlüssel siehe LEBEWESEN in src/lib/betrieb-figuren.ts.
-- Idempotent; bestehende Items und Käufe bleiben unberührt.

INSERT INTO shop_items (name, description, icon, icon_key, category, price, is_active, sort_order, department_id)
SELECT v.name, v.description, v.icon, v.icon_key, v.category, v.price, true, v.sort_order, d.id
FROM departments d
CROSS JOIN (VALUES
  ('Hofkatze', 'Streift neugierig über den Hof.',            '🐈', 'hofkatze', 'ladung_ausstattung', 45, 60),
  ('Hühner',   'Zwei Hühner, die überall herumpicken.',      '🐔', 'huehner',  'ladung_ausstattung', 50, 61),
  ('Hofhund',  'Passt auf und läuft fröhlich über den Hof.', '🐕', 'hofhund',  'ladung_ausstattung', 60, 62)
) AS v(name, description, icon, icon_key, category, price, sort_order)
WHERE d.code = 'SPED'
  AND NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name AND s.department_id = d.id);

INSERT INTO shop_items (name, description, icon, icon_key, category, price, is_active, sort_order, department_id)
SELECT v.name, v.description, v.icon, v.icon_key, v.category, v.price, true, v.sort_order, d.id
FROM departments d
CROSS JOIN (VALUES
  ('Krebs',      'Läuft seitwärts über den Strand.',          '🦀', 'krebs',      'ladung_ausstattung', 40, 60),
  ('Strandhund', 'Tobt am liebsten durch den Sand.',          '🐕', 'strandhund', 'ladung_ausstattung', 70, 61),
  ('Papagei',    'Bunt, laut und immer gut gelaunt.',         '🦜', 'papagei',    'ladung_ausstattung', 80, 62),
  ('Flamingo',   'Stolziert elegant durchs Resort.',          '🦩', 'flamingo',   'ladung_ausstattung', 90, 63)
) AS v(name, description, icon, icon_key, category, price, sort_order)
WHERE d.code = 'TOUR'
  AND NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name AND s.department_id = d.id);
