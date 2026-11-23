-- Probe zu 20261125_proj122_checklisten.sql – NACH der Migration im SQL-Editor ausführen.
-- Sie legt Testzeilen an und endet ABSICHTLICH mit einem Fehler „PROBE-ERGEBNIS“,
-- dadurch wird alles zurückgerollt. Nur der Text hinter „PROBE-ERGEBNIS“ zählt.
DO $$
DECLARE
  a uuid;
  b uuid;
  azubi uuid;
  lauf1 uuid;
  lauf2 uuid;
  lauf_neu uuid;
  n int;
  rls_d boolean;
  rls_h boolean;
  anon_darf boolean;
  idempotent boolean := false;
  entfernen_ok boolean := false;
  ein_offener boolean := false;
  b_sieht_nichts boolean := false;
  b_haken_blockiert boolean := false;
  azubi_blockiert boolean := false;
  archiviert_ok boolean := false;
  archiv_haken_blockiert boolean := false;
  zwei_offen_verhindert boolean := false;
  schritt_muster_ok boolean := false;
  admin_sieht_nichts boolean := false;
BEGIN
  SELECT relrowsecurity INTO rls_d FROM pg_class WHERE oid = 'public.checklisten_durchlaeufe'::regclass;
  SELECT relrowsecurity INTO rls_h FROM pg_class WHERE oid = 'public.checklisten_haken'::regclass;
  SELECT has_function_privilege('anon', 'public.checkliste_haken_setzen(text,text,boolean,text)', 'EXECUTE') INTO anon_darf;

  SELECT id INTO a FROM public.profiles WHERE role = 'teacher' ORDER BY id LIMIT 1;
  IF a IS NULL THEN SELECT id INTO a FROM public.profiles WHERE role IN ('department_admin', 'admin') ORDER BY id LIMIT 1; END IF;
  SELECT id INTO b FROM public.profiles WHERE role IN ('teacher', 'department_admin', 'admin') AND id <> a ORDER BY id LIMIT 1;
  SELECT id INTO azubi FROM public.profiles WHERE role = 'student' LIMIT 1;

  -- A: Haken setzen (zweimal), entfernen, wieder setzen; nur ein offener Durchlauf
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  lauf1 := public.checkliste_haken_setzen('probe-liste', 'schritt-1', true, 'variante-a');
  lauf2 := public.checkliste_haken_setzen('probe-liste', 'schritt-1', true);
  SELECT count(*) INTO n FROM public.checklisten_haken WHERE durchlauf_id = lauf1;
  idempotent := (lauf1 = lauf2 AND n = 1);
  PERFORM public.checkliste_haken_setzen('probe-liste', 'schritt-2', true);
  PERFORM public.checkliste_haken_setzen('probe-liste', 'schritt-2', false);
  SELECT count(*) INTO n FROM public.checklisten_haken WHERE durchlauf_id = lauf1;
  entfernen_ok := (n = 1);
  SELECT count(*) INTO n FROM public.checklisten_durchlaeufe
   WHERE owner_id = a AND checkliste = 'probe-liste' AND archiviert_am IS NULL;
  ein_offener := (n = 1);

  -- schlechtes Muster wird abgelehnt (Großbuchstaben, Leerzeichen)
  BEGIN
    PERFORM public.checkliste_haken_setzen('probe-liste', 'Schritt 1', true);
  EXCEPTION WHEN SQLSTATE 'CHK01' THEN
    schritt_muster_ok := true;
  END;

  -- zweiter offener Durchlauf lässt sich nicht von Hand anlegen
  BEGIN
    INSERT INTO public.checklisten_durchlaeufe (owner_id, checkliste) VALUES (a, 'probe-liste');
  EXCEPTION WHEN unique_violation THEN
    zwei_offen_verhindert := true;
  END;
  RESET ROLE;

  -- B (andere Lehrkraft): sieht nichts von A, kann nicht in As Durchlauf schreiben
  IF b IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    SELECT count(*) INTO n FROM public.checklisten_durchlaeufe WHERE id = lauf1;
    b_sieht_nichts := (n = 0);
    SELECT count(*) INTO n FROM public.checklisten_haken WHERE durchlauf_id = lauf1;
    b_sieht_nichts := b_sieht_nichts AND (n = 0);
    BEGIN
      INSERT INTO public.checklisten_haken (durchlauf_id, schritt) VALUES (lauf1, 'fremd');
    EXCEPTION WHEN insufficient_privilege THEN
      b_haken_blockiert := true;
    END;
    RESET ROLE;
  END IF;

  -- Azubi: darf keine Durchläufe anlegen (keine Lehrer-Rolle)
  IF azubi IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', azubi, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    BEGIN
      PERFORM public.checkliste_haken_setzen('probe-liste', 'schritt-1', true);
    EXCEPTION WHEN insufficient_privilege THEN
      azubi_blockiert := true;
    END;
    RESET ROLE;
  ELSE
    azubi_blockiert := NULL; -- kein Azubi im System zum Testen
  END IF;

  -- Super-Admin (falls vorhanden und nicht A): sieht As Haken NICHT (keine Admin-Ausnahme)
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (SELECT id FROM public.profiles WHERE role = 'admin' AND id <> a LIMIT 1), 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.checklisten_haken WHERE durchlauf_id = lauf1;
  admin_sieht_nichts := (n = 0);
  RESET ROLE;

  -- A: neu starten archiviert den alten Durchlauf und legt einen neuen an; Archiv ist nur lesbar
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  lauf_neu := public.checkliste_neu_starten('probe-liste', 'variante-b');
  SELECT count(*) INTO n FROM public.checklisten_durchlaeufe
   WHERE owner_id = a AND checkliste = 'probe-liste' AND archiviert_am IS NULL AND id = lauf_neu;
  archiviert_ok := (lauf_neu <> lauf1 AND n = 1
    AND (SELECT archiviert_am IS NOT NULL FROM public.checklisten_durchlaeufe WHERE id = lauf1)
    AND (SELECT count(*) FROM public.checklisten_haken WHERE durchlauf_id = lauf1) = 1);
  BEGIN
    INSERT INTO public.checklisten_haken (durchlauf_id, schritt) VALUES (lauf1, 'spaet');
  EXCEPTION WHEN insufficient_privilege THEN
    archiv_haken_blockiert := true;
  END;
  RESET ROLE;

  RAISE EXCEPTION 'PROBE-ERGEBNIS: rls_durchlaeufe=% (soll true), rls_haken=% (soll true), anon_darf_ausfuehren=% (soll false), doppelt_setzen_idempotent=% (soll true), entfernen_ok=% (soll true), ein_offener_durchlauf=% (soll true), zweiter_offener_verhindert=% (soll true), schlechtes_muster_abgelehnt=% (soll true), andere_lehrkraft_sieht_nichts=% (soll true; NULL = keine zweite Lehrkraft im System), andere_lehrkraft_schreibt_blockiert=% (soll true; NULL = s. o.), azubi_blockiert=% (soll true; NULL = kein Azubi), admin_sieht_fremde_haken_nicht=% (soll true), neu_starten_archiviert=% (soll true), archiv_nur_lesbar=% (soll true)',
    rls_d, rls_h, anon_darf, idempotent, entfernen_ok, ein_offener, zwei_offen_verhindert, schritt_muster_ok,
    CASE WHEN b IS NULL THEN NULL ELSE b_sieht_nichts END,
    CASE WHEN b IS NULL THEN NULL ELSE b_haken_blockiert END,
    azubi_blockiert, admin_sieht_nichts, archiviert_ok, archiv_haken_blockiert;
END $$;
