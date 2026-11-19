-- Probe zu 20261124_rate_limit.sql – NACH der Migration im SQL-Editor ausführen.
-- Sie legt Testzeilen an und endet ABSICHTLICH mit einem Fehler „PROBE-ERGEBNIS“,
-- dadurch wird alles zurückgerollt. Nur der Text hinter „PROBE-ERGEBNIS“ zählt.
DO $$
DECLARE
  r record;
  erlaubt int := 0;
  gesperrt int := 0;
  neu_erlaubt boolean;
  rls boolean;
  anon_darf boolean;
BEGIN
  -- 1) Limit 3: die ersten 3 Aufrufe erlaubt, der 4. und 5. gesperrt
  FOR i IN 1..5 LOOP
    SELECT * INTO r FROM public.rate_limit_hit('probe:a', 3, 60);
    IF r.allowed THEN erlaubt := erlaubt + 1; ELSE gesperrt := gesperrt + 1; END IF;
  END LOOP;

  -- 2) Anderer Schlüssel ist unabhängig
  SELECT allowed INTO neu_erlaubt FROM public.rate_limit_hit('probe:b', 3, 60);

  -- 3) Abgelaufenes Fenster beginnt neu
  UPDATE public.rate_limits SET window_start = now() - interval '2 minutes' WHERE key = 'probe:a';
  SELECT * INTO r FROM public.rate_limit_hit('probe:a', 3, 60);

  SELECT relrowsecurity INTO rls FROM pg_class WHERE oid = 'public.rate_limits'::regclass;
  SELECT has_function_privilege('anon', 'public.rate_limit_hit(text,integer,integer)', 'EXECUTE') INTO anon_darf;

  RAISE EXCEPTION 'PROBE-ERGEBNIS: erlaubt=% (soll 3), gesperrt=% (soll 2), anderer_schluessel_erlaubt=% (soll true), nach_ablauf_erlaubt=% (soll true), rls_an=% (soll true), anon_darf_ausfuehren=% (soll false)',
    erlaubt, gesperrt, neu_erlaubt, r.allowed, rls, anon_darf;
END $$;
