-- Probe zu 20261125_proj18_push_erinnerung.sql – NACH der Migration im SQL-Editor ausführen.
-- Endet ABSICHTLICH mit einem Fehler „PROBE-ERGEBNIS“, dadurch wird alles
-- zurückgerollt. Nur der Text hinter „PROBE-ERGEBNIS“ zählt.
DO $$
DECLARE
  v_user uuid;
  rls_sub boolean;
  rls_state boolean;
  anon_sub boolean;
  anon_state boolean;
  auth_sub boolean;
  doppelt_gesperrt boolean := false;
  http_gesperrt boolean := false;
  zu_kurz_gesperrt boolean := false;
  cascade_ok boolean;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'PROBE-ERGEBNIS: kein Konto in auth.users, Probe nicht möglich';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
  VALUES (v_user, 'https://fcm.googleapis.com/fcm/send/probe-aaaaaaaaaaaa', repeat('p', 87), repeat('a', 22));
  INSERT INTO public.push_reminder_state (user_id, decline_count) VALUES (v_user, 1);

  -- Derselbe Endpunkt zweimal: muss an UNIQUE scheitern
  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (v_user, 'https://fcm.googleapis.com/fcm/send/probe-aaaaaaaaaaaa', repeat('p', 87), repeat('a', 22));
  EXCEPTION WHEN unique_violation THEN doppelt_gesperrt := true; END;

  -- Kein https: muss an CHECK scheitern
  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (v_user, 'http://fcm.googleapis.com/fcm/send/probe-bbbbbbbbbbbb', repeat('p', 87), repeat('a', 22));
  EXCEPTION WHEN check_violation THEN http_gesperrt := true; END;

  -- Zu kurzer Schlüssel: muss an CHECK scheitern
  BEGIN
    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (v_user, 'https://fcm.googleapis.com/fcm/send/probe-cccccccccccc', 'x', 'y');
  EXCEPTION WHEN check_violation THEN zu_kurz_gesperrt := true; END;

  SELECT relrowsecurity INTO rls_sub   FROM pg_class WHERE oid = 'public.push_subscriptions'::regclass;
  SELECT relrowsecurity INTO rls_state FROM pg_class WHERE oid = 'public.push_reminder_state'::regclass;
  SELECT has_table_privilege('anon',          'public.push_subscriptions',  'SELECT') INTO anon_sub;
  SELECT has_table_privilege('anon',          'public.push_reminder_state', 'SELECT') INTO anon_state;
  SELECT has_table_privilege('authenticated', 'public.push_subscriptions',  'SELECT') INTO auth_sub;

  -- Fremdschlüssel hängt an auth.users mit CASCADE (Kontolöschung räumt auf)
  SELECT bool_and(confdeltype = 'c') INTO cascade_ok
  FROM pg_constraint
  WHERE contype = 'f' AND conrelid IN ('public.push_subscriptions'::regclass, 'public.push_reminder_state'::regclass);

  RAISE EXCEPTION 'PROBE-ERGEBNIS: doppelter_endpunkt_gesperrt=% (soll true), http_gesperrt=% (soll true), zu_kurze_schluessel_gesperrt=% (soll true), rls_subscriptions=% (soll true), rls_state=% (soll true), anon_liest_subscriptions=% (soll false), anon_liest_state=% (soll false), authenticated_liest_subscriptions=% (soll false), cascade_ueberall=% (soll true)',
    doppelt_gesperrt, http_gesperrt, zu_kurz_gesperrt, rls_sub, rls_state, anon_sub, anon_state, auth_sub, cascade_ok;
END $$;
