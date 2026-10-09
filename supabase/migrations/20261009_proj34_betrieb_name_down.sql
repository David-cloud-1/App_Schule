-- Rollback PROJ-34 Bezeichnung
UPDATE departments
SET hof_name = 'Speditionshof', hof_short_name = 'Hof'
WHERE code = 'SPED';
