-- PROJ-120: weitere Abteilung "Schulleitung" im Abwesenheitskalender
INSERT INTO kalender_abteilungen (id, name, kurz, sort_order) VALUES ('schulleitung', 'Schulleitung', 'SL', 6)
ON CONFLICT (id) DO NOTHING;
