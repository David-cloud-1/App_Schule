-- Rückweg zu 20261112_proj77_notenschluessel_vorlagen.sql
-- ACHTUNG: Alle gespeicherten Vorlagen gehen verloren; Nachweise behalten ihren Schlüssel.

BEGIN;

DROP TRIGGER IF EXISTS trg_grading_scale_templates_profile_gone ON profiles;
DROP FUNCTION IF EXISTS grading_scale_templates_on_profile_gone();
DROP TABLE IF EXISTS grading_scale_templates;
DROP FUNCTION IF EXISTS grading_scale_templates_touch();

COMMIT;
