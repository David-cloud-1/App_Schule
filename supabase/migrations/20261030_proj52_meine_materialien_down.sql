-- PROJ-52 (Paket 1) zurücknehmen.
-- Achtung: Fertige Materialien bekommen wieder einen Ablauftermin (7 Tage ab jetzt),
-- sonst ließe sich die Spalte nicht wieder auf NOT NULL setzen. Wer sie behalten
-- will, vorher herunterladen.
DROP INDEX IF EXISTS public.werkzeug_ablaeufe_skript_idx;
DROP INDEX IF EXISTS public.werkzeug_ablaeufe_liste_idx;
DROP FUNCTION IF EXISTS public.wk_speicher_genutzt();
DROP TRIGGER IF EXISTS werkzeug_ablaeufe_regeln ON public.werkzeug_ablaeufe;
DROP FUNCTION IF EXISTS public.werkzeug_ablaeufe_regeln();

UPDATE public.werkzeug_ablaeufe SET laeuft_ab_am = now() + interval '7 days' WHERE laeuft_ab_am IS NULL;
ALTER TABLE public.werkzeug_ablaeufe ALTER COLUMN laeuft_ab_am SET NOT NULL;

ALTER TABLE public.werkzeug_ablaeufe
  DROP COLUMN IF EXISTS hat_antwort,
  DROP COLUMN IF EXISTS speicher_bytes,
  DROP COLUMN IF EXISTS skript_entfernt_am,
  DROP COLUMN IF EXISTS skript_hochgeladen_am,
  DROP COLUMN IF EXISTS titel;
