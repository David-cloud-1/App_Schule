-- PROJ-121 zurücknehmen: Spalten für Vor- und Nachnamen entfernen.
-- Der Anzeigename (display_name) bleibt, wie er zuletzt gesetzt wurde.
--
-- REIHENFOLGE: erst den Code zurückrollen, dann diese Datei einspielen. Solange
-- der neue Code läuft, lesen Türsteher und Start-Weiche die Spalten; ohne sie
-- bekämen alle Lehrkräfte und Admins „Kein Zugang“.

DROP TRIGGER IF EXISTS profiles_name_schutz ON public.profiles;
DROP FUNCTION IF EXISTS public.profiles_name_schutz();

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_first_name_length;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_last_name_length;
ALTER TABLE profiles DROP COLUMN IF EXISTS first_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_name;
