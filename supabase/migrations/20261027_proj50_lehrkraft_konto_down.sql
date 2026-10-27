-- Rückweg zu 20261027_proj50_lehrkraft_konto.sql
-- Achtung: entfernt gespeicherte Kürzel und die „angesehen“-Zeitpunkte endgültig.

ALTER TABLE graded_assessments DROP COLUMN IF EXISTS creator_viewed_at;

REVOKE UPDATE (kuerzel) ON profiles FROM authenticated;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_kuerzel_format;
ALTER TABLE profiles DROP COLUMN IF EXISTS kuerzel;
