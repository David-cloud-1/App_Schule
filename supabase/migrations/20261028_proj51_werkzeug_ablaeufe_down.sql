-- PROJ-51 zurücknehmen. Dateien im Bereich „werkzeugkiste“ vorher über die
-- Speicher-Schnittstelle löschen (z. B. Dashboard → Storage → leeren), sonst
-- lässt sich der Bereich nicht entfernen.
DROP TABLE IF EXISTS public.werkzeug_ablaeufe;
DELETE FROM storage.buckets WHERE id = 'werkzeugkiste';
