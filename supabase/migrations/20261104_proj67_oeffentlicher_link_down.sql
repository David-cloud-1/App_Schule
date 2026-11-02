-- Rückweg für 20261104_proj67_oeffentlicher_link.sql (PROJ-67).
-- Alle öffentlichen Links sind danach tot. Material und Regal bleiben unberührt.

DROP TRIGGER IF EXISTS werkzeug_links_rollenentzug ON public.profiles;
DROP FUNCTION IF EXISTS public.werkzeug_links_rollenentzug();
DROP FUNCTION IF EXISTS public.link_aufruf_zaehlen(text);
DROP FUNCTION IF EXISTS public.link_nachschlagen(text);
DROP FUNCTION IF EXISTS public.link_admin_abschalten(uuid);
DROP FUNCTION IF EXISTS public.link_admin_liste(integer, integer);
DROP FUNCTION IF EXISTS public.link_abschalten(uuid);
DROP FUNCTION IF EXISTS public.link_erzeugen(uuid);
DROP FUNCTION IF EXISTS public.link_lesen(uuid);
DROP TABLE IF EXISTS public.werkzeug_links;
