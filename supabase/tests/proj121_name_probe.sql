-- Probe zu 20261123_proj121_lehrkraft_name.sql – NACH der Migration im SQL-Editor ausführen.
-- Sie ändert vorübergehend Zeilen und endet ABSICHTLICH mit einem Fehler „PROBE-ERGEBNIS“,
-- dadurch wird alles zurückgerollt. Nur der Text hinter „PROBE-ERGEBNIS“ zählt.
DO $$
DECLARE
  lehrer uuid;
  azubi uuid;
  n int;
  lehrer_blockiert boolean := false;
  lehrer_name_blockiert boolean := false;
  azubi_darf boolean := false;
  service_darf boolean := false;
  spalten int;
  trigger_da int;
BEGIN
  SELECT count(*) INTO spalten FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name IN ('first_name', 'last_name');
  SELECT count(*) INTO trigger_da FROM pg_trigger WHERE tgname = 'profiles_name_schutz' AND NOT tgisinternal;

  SELECT id INTO lehrer FROM public.profiles WHERE role IN ('teacher', 'department_admin', 'admin') LIMIT 1;
  SELECT id INTO azubi FROM public.profiles WHERE role = 'student' LIMIT 1;

  -- 1) Lehrer-Rolle über die Nutzer-Sitzung: Anzeigename ändern muss scheitern
  PERFORM set_config('request.jwt.claims', json_build_object('sub', lehrer, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.profiles SET display_name = 'Probe Fremdname' WHERE id = lehrer;
  EXCEPTION WHEN insufficient_privilege THEN
    lehrer_blockiert := true;
  END;
  -- 2) Lehrer-Rolle: Vorname direkt schreiben muss scheitern (kein Spalten-Recht)
  BEGIN
    UPDATE public.profiles SET first_name = 'Probe' WHERE id = lehrer;
  EXCEPTION WHEN insufficient_privilege THEN
    lehrer_name_blockiert := true;
  END;
  RESET ROLE;

  -- 3) Azubi darf seinen Anzeigenamen weiter ändern
  PERFORM set_config('request.jwt.claims', json_build_object('sub', azubi, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.profiles SET display_name = display_name WHERE id = azubi;
  UPDATE public.profiles SET display_name = display_name || ' ' WHERE id = azubi;
  GET DIAGNOSTICS n = ROW_COUNT;
  azubi_darf := (n = 1);
  RESET ROLE;

  -- 4) Server (Service-Rolle) darf den Anzeigenamen der Lehrkraft setzen
  SET LOCAL ROLE service_role;
  UPDATE public.profiles SET display_name = 'Probe Servername', first_name = 'Probe', last_name = 'Servername' WHERE id = lehrer;
  GET DIAGNOSTICS n = ROW_COUNT;
  service_darf := (n = 1);
  RESET ROLE;

  RAISE EXCEPTION 'PROBE-ERGEBNIS: spalten=% (soll 2), trigger=% (soll 1), lehrer_anzeigename_blockiert=% (soll true), lehrer_vorname_direkt_blockiert=% (soll true), azubi_darf_anzeigename=% (soll true), service_darf=% (soll true)',
    spalten, trigger_da, lehrer_blockiert, lehrer_name_blockiert, azubi_darf, service_darf;
END $$;
