-- PROJ-36: Mehr Deko für Spedition („Betrieb“) und Tourismus („Resort“)
--
-- 20 + 20 neue Items. Icon-Schlüssel siehe SPEDITION_DEKO in
-- src/lib/hof-welt/spedition-deko.ts und RESORT_DEKO in resort-deko.ts.
-- Preise 15–200, mindestens 8 je Fachbereich bis 60 (Einstiegs-Deko).
-- Idempotent: ein vorhandenes Item gleichen Namens im Fachbereich wird nicht
-- erneut angelegt; bestehende Items und Käufe bleiben unberührt.

-- ── Spedition ────────────────────────────────────────────────────────────────
INSERT INTO shop_items (name, description, icon, icon_key, category, price, is_active, sort_order, department_id)
SELECT v.name, v.description, v.icon, v.icon_key, v.category, v.price, true, v.sort_order, d.id
FROM departments d
CROSS JOIN (VALUES
  ('Mülleimer',      'Damit auf dem Hof alles sauber bleibt.',               '🗑️', 'muelleimer',     'ladung_ausstattung', 15,  20),
  ('Hecke',          'Eine gepflegte Hecke für die Hofkante.',               '🌳', 'hecke',          'gebaeude_deko',      20,  21),
  ('Blumenkübel',    'Ein bisschen Farbe vor der Halle.',                    '🌸', 'blumenkuebel',   'gebaeude_deko',      25,  22),
  ('Verkehrsschild', 'Tempo 30 auf dem Betriebsgelände.',                    '🚸', 'verkehrsschild', 'gebaeude_deko',      25,  23),
  ('Parkbank',       'Zum Verschnaufen zwischen zwei Touren.',               '🪑', 'parkbank',       'gebaeude_deko',      30,  24),
  ('Reifenstapel',   'Ersatzreifen für die Flotte.',                         '🛞', 'reifenstapel',   'ladung_ausstattung', 35,  25),
  ('Ölfässer',       'Bunte Fässer in der Ecke des Hofs.',                   '🛢️', 'oelfaesser',     'ladung_ausstattung', 40,  26),
  ('Schranke',       'Hier kommt nur durch, wer sich anmeldet.',             '🚧', 'schranke',       'gebaeude_deko',      45,  27),
  ('Hubwagen',       'Der Klassiker fürs Lager.',                            '📦', 'hubwagen',       'ladung_ausstattung', 50,  28),
  ('Rasttisch',      'Pause mit Sonnenschirm für die Fahrer.',               '⛱️', 'rasttisch',      'ladung_ausstattung', 55,  29),
  ('Werbeschild',    'Zeig, wer hier die Spedition ist.',                    '🪧', 'werbeschild',    'gebaeude_deko',      70,  30),
  ('Schuppen',       'Platz für Werkzeug und Ersatzteile.',                  '🛖', 'schuppen',       'gebaeude_deko',      85,  31),
  ('Kipper',         'Schüttgut sicher von A nach B.',                       '🚚', 'kipper',         'fahrzeuge',          90,  32),
  ('Wetterfahne',    'Zeigt, woher der Wind weht.',                          '🧭', 'wetterfahne',    'gebaeude_deko',      95,  33),
  ('Brückenwaage',   'Wiegt jeden Lkw auf das Kilo genau.',                  '⚖️', 'brueckenwaage',  'gebaeude_deko',      110, 34),
  ('Abschleppwagen', 'Wenn ein Fahrzeug liegen bleibt.',                     '🛻', 'abschleppwagen', 'fahrzeuge',          130, 35),
  ('Imbisswagen',    'Currywurst für alle Fahrer.',                          '🌭', 'imbisswagen',    'gebaeude_deko',      140, 36),
  ('Containerturm',  'Drei Container hoch gestapelt.',                       '🏗️', 'containerturm',  'ladung_ausstattung', 160, 37),
  ('Tankwagen',      'Flüssige Ladung sicher unterwegs.',                    '⛽', 'tankwagen',      'fahrzeuge',          170, 38),
  ('Wasserturm',     'Das Wahrzeichen deines Betriebs.',                     '🗼', 'wasserturm',     'gebaeude_deko',      190, 39)
) AS v(name, description, icon, icon_key, category, price, sort_order)
WHERE d.code = 'SPED'
  AND NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name AND s.department_id = d.id);

-- ── Tourismus ────────────────────────────────────────────────────────────────
INSERT INTO shop_items (name, description, icon, icon_key, category, price, is_active, sort_order, department_id)
SELECT v.name, v.description, v.icon, v.icon_key, v.category, v.price, true, v.sort_order, d.id
FROM departments d
CROSS JOIN (VALUES
  ('Blütenhecke',    'Eine Hecke mit bunten Blüten.',                        '🌺', 'lebhecke',        'ladung_ausstattung', 20,  30),
  ('Sandburg',       'Gebaut von den kleinen Gästen.',                       '🏰', 'sandburg',        'ladung_ausstattung', 20,  31),
  ('Blumenkübel',    'Tropische Farben vor dem Eingang.',                    '🌼', 'resort-blumen',   'ladung_ausstattung', 25,  32),
  ('Rettungsring',   'Sicherheit am Pool.',                                  '🛟', 'rettungsring',    'ladung_ausstattung', 30,  33),
  ('Tiki-Fackeln',   'Stimmung für den Abend.',                              '🔥', 'tikifackeln',     'ladung_ausstattung', 35,  34),
  ('Gartenlaterne',  'Warmes Licht entlang der Wege.',                       '🏮', 'gartenlaterne',   'ladung_ausstattung', 40,  35),
  ('Surfbretter',    'Für die Wellenreiter unter den Gästen.',               '🏄', 'surfbretter',     'ladung_ausstattung', 45,  36),
  ('Fahrradständer', 'Drei Leihräder für Ausflüge.',                         '🚲', 'fahrradstaender', 'fahrzeuge',          50,  37),
  ('Strandkorb',     'Windgeschützt in der Sonne.',                          '⛱️', 'strandkorb',      'ladung_ausstattung', 55,  38),
  ('Hängematte',     'Zwischen zwei Palmen schaukeln.',                      '😴', 'haengematte',     'ladung_ausstattung', 60,  39),
  ('Golfcart',       'Bringt Gäste bequem durchs Resort.',                   '🛺', 'golfcart',        'fahrzeuge',          85,  40),
  ('Volleyballfeld', 'Beachvolleyball im weichen Sand.',                     '🏐', 'volleyballfeld',  'gebaeude_deko',      90,  41),
  ('Lotusteich',     'Ruhe zwischen Seerosen.',                              '🪷', 'lotusteich',      'gebaeude_deko',      100, 42),
  ('Tuk-Tuk',        'Exotisch unterwegs.',                                  '🚕', 'tuktuk',          'fahrzeuge',          110, 43),
  ('Hochzeitsbogen', 'Der schönste Ort für ein Ja-Wort.',                    '💒', 'hochzeitsbogen',  'gebaeude_deko',      120, 44),
  ('Pavillon',       'Schatten und Blumenschmuck im Garten.',                '⛺', 'pavillon',        'gebaeude_deko',      130, 45),
  ('Bungalow',       'Ein Häuschen direkt am Strand.',                       '🛖', 'bungalow',        'gebaeude_deko',      150, 46),
  ('Eisdiele',       'Drei Kugeln für die Gäste.',                           '🍦', 'eisdiele',        'gebaeude_deko',      150, 47),
  ('Saunahaus',      'Entspannung nach dem Strandtag.',                      '🧖', 'saunahaus',       'gebaeude_deko',      170, 48),
  ('Tennisplatz',    'Aufschlag auf rotem Sand.',                            '🎾', 'tennisplatz',     'gebaeude_deko',      200, 49)
) AS v(name, description, icon, icon_key, category, price, sort_order)
WHERE d.code = 'TOUR'
  AND NOT EXISTS (SELECT 1 FROM shop_items s WHERE s.name = v.name AND s.department_id = d.id);
