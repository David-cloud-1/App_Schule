-- PROJ-31: Startkatalog für den Fachbereich Tourismus (Reisebüro)
--
-- 10 Items, mindestens 2 aktive je Kategorie, ein Referenzitem zu 75
-- Reisetalern. Icon-Schlüssel siehe TOUR_ICONS in src/lib/hof-icons-tour.tsx.
-- Idempotent: ein bereits vorhandenes Item gleichen Namens im Fachbereich wird
-- nicht erneut angelegt. Die Lehrkraft kann alles anpassen oder deaktivieren.

INSERT INTO shop_items (name, description, icon, icon_key, category, price, is_active, sort_order, department_id)
SELECT v.name, v.description, v.icon, v.icon_key, v.category, v.price, true, v.sort_order, d.id
FROM departments d
CROSS JOIN (VALUES
  ('Flugzeug',           'Dein erster Flieger für das Reisebüro.',            '✈️', 'flugzeug',           'fahrzeuge',           75,  1),
  ('Reisebus',           'Bequem unterwegs auf Rundreisen.',                  '🚌', 'reisebus',           'fahrzeuge',           60,  2),
  ('Kreuzfahrtschiff',   'Große Schiffsreisen für anspruchsvolle Gäste.',     '🚢', 'kreuzfahrtschiff',   'fahrzeuge',           300, 3),
  ('Palme',              'Urlaubsstimmung direkt vor dem Büro.',              '🌴', 'palme',              'gebaeude_deko',       40,  4),
  ('Strandhotel',        'Ein Hotel direkt am Meer für deine Gäste.',         '🏨', 'hotel',              'gebaeude_deko',       150, 5),
  ('Reisekoffer',        'Gepackt und bereit für die nächste Reise.',         '🧳', 'koffer',             'ladung_ausstattung',  30,  6),
  ('Globus',             'Alle Reiseziele der Welt auf einen Blick.',         '🌍', 'globus',             'ladung_ausstattung',  90,  7),
  ('Reisepass',          'Damit steht jeder Einreise nichts im Weg.',         '🛂', 'reisepass',          'abzeichen_trophaeen', 50,  8),
  ('Weltreise-Pokal',    'Für alle, die ihr Büro auf Kurs halten.',           '🏆', 'weltreise-pokal',    'abzeichen_trophaeen', 100, 9),
  ('Globetrotter-Stern', 'Ein glänzender Stern für fleißige Reiseprofis.',    '⭐', 'globetrotter-stern', 'abzeichen_trophaeen', 250, 10)
) AS v(name, description, icon, icon_key, category, price, sort_order)
WHERE d.code = 'TOUR'
  AND NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name AND s.department_id = d.id);
