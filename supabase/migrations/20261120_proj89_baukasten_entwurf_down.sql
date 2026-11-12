-- PROJ-89 (Paket 1) zurücknehmen.
-- Achtung: Unveröffentlichte Entwürfe gehen dabei verloren. Die veröffentlichten
-- Fassungen bleiben unberührt. Liegengebliebene Dateien `entwurf.html` im Speicher
-- räumt das Löschen des Materials mit ab.
ALTER TABLE public.werkzeug_ablaeufe
  DROP COLUMN IF EXISTS hat_entwurf,
  DROP COLUMN IF EXISTS entwurf_pruefung,
  DROP COLUMN IF EXISTS entwurf_am,
  DROP COLUMN IF EXISTS entwurf;
