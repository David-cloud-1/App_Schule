-- PROJ-26: Ausgangskatalog auf mindestens 2 aktive Items je Kategorie (Spedition)
--
-- Vorher: Fahrzeuge 1, Gebäude & Deko 3, Ladung 0, Trophäen 0.
-- Ergänzt werden 5 Items, damit alle vier Zonen der Hof-Szene beim ersten
-- Aufruf befüllbar sind. Icon-Schlüssel siehe SPED_ICONS in src/lib/hof-icons.tsx.

INSERT INTO shop_items (name, description, icon, icon_key, category, price, is_active, sort_order, department_id)
SELECT v.name, v.description, v.icon, v.icon_key, v.category, v.price, true, v.sort_order, d.id
FROM departments d
CROSS JOIN (VALUES
  ('Blauer Transporter', 'Flink und zuverlässig für die Stadtauslieferung.', '🚚', 'transporter-blau',  'fahrzeuge',           60,  5),
  ('Europalette',        'Die Grundlage jeder Ladung auf deinem Hof.',        '📦', 'europalette',       'ladung_ausstattung',  30,  6),
  ('Seecontainer',       'Ein Container für große Frachten.',                 '🚢', 'container',         'ladung_ausstattung',  150, 7),
  ('Pokal',              'Für alle, die ihren Hof auf Kurs halten.',          '🏆', 'pokal',             'abzeichen_trophaeen', 100, 8),
  ('Stern-Abzeichen',    'Ein glänzendes Abzeichen für fleißige Lerner.',     '⭐', 'stern-abzeichen',   'abzeichen_trophaeen', 250, 9)
) AS v(name, description, icon, icon_key, category, price, sort_order)
WHERE d.code = 'SPED'
  AND NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name AND s.department_id = d.id);
