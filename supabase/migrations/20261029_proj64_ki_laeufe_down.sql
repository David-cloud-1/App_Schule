-- Rücknahme von 20261029_proj64_ki_laeufe.sql
-- ACHTUNG: löscht die Kostenerfassung aller Läufe.
ALTER TABLE public.werkzeug_ablaeufe DROP COLUMN IF EXISTS weg;
DROP TRIGGER IF EXISTS ki_lauf_teile_summen ON public.ki_lauf_teile;
DROP FUNCTION IF EXISTS public.ki_lauf_summen();
DROP TABLE IF EXISTS public.ki_lauf_teile;
DROP TABLE IF EXISTS public.ki_laeufe;
DROP TABLE IF EXISTS public.ki_einstellungen;
