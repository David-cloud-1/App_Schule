-- PROJ-22: Kurzform des Hof-Namens ("Mein Hof", "Hof-Items") — gehört zum
-- Bild des Bereichs (Spedition: Speditionshof → Hof). Additiv.
ALTER TABLE departments ADD COLUMN hof_short_name text NOT NULL DEFAULT 'Sammlung';
UPDATE departments SET hof_short_name = 'Hof' WHERE code = 'SPED';
