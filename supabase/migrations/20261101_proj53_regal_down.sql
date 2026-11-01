-- Rückweg für 20261101_proj53_regal.sql (PROJ-53)
-- Löscht alle Freigaben und Downloadzähler. Die Materialien selbst bleiben unberührt.

DROP FUNCTION IF EXISTS public.regal_download_vorbereiten(uuid);
DROP FUNCTION IF EXISTS public.regal_freigabe_entfernen(uuid);
DROP FUNCTION IF EXISTS public.regal_freigabe_setzen(uuid, text, uuid, text, uuid[], uuid[]);
DROP FUNCTION IF EXISTS public.regal_freigabe_lesen(uuid);
DROP FUNCTION IF EXISTS public.regal_lehrkraefte(text);
DROP FUNCTION IF EXISTS public.regal_filterwerte();
DROP FUNCTION IF EXISTS public.regal_liste(text, uuid, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.regal_darf_sehen(uuid);
DROP FUNCTION IF EXISTS public.regal_in_bereich(uuid);

DROP TABLE IF EXISTS public.regal_downloads;
DROP TABLE IF EXISTS public.regal_freigabe_personen;
DROP TABLE IF EXISTS public.regal_freigabe_bereiche;
DROP TABLE IF EXISTS public.regal_freigaben;
