-- Rückweg für 20261002_proj25_tourismus_pseudonyme.sql
-- Setzt TOUR wieder auf keine eigene Wortliste zurück (neutraler Rückfall greift).

BEGIN;

UPDATE departments
SET pseudonym_nouns = '{}'
WHERE code = 'TOUR';

COMMIT;
