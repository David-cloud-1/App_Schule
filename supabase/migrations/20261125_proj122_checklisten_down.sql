-- Rückweg für 20261125_proj122_checklisten.sql (PROJ-122)
-- ACHTUNG: Löscht alle Durchläufe und Haken aller Lehrkräfte.
DROP FUNCTION IF EXISTS public.checkliste_neu_starten(text, text);
DROP FUNCTION IF EXISTS public.checkliste_variante_setzen(text, text);
DROP FUNCTION IF EXISTS public.checkliste_haken_setzen(text, text, boolean, text);
DROP FUNCTION IF EXISTS public.checkliste_offener_durchlauf(text, text);
DROP TABLE IF EXISTS public.checklisten_haken;
DROP TABLE IF EXISTS public.checklisten_durchlaeufe;
