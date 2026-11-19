-- Rückweg zu 20261124_rate_limit.sql: entfernt Zähler und Funktion.
-- Der Code fällt bei fehlender Funktion auf „erlaubt“ zurück (kein Ausfall).
DROP FUNCTION IF EXISTS public.rate_limit_hit(text, integer, integer);
DROP TABLE IF EXISTS public.rate_limits;
