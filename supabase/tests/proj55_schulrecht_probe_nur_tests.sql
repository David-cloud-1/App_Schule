-- PROJ-55 Probe NUR TESTS (Migration ist schon angewendet). Endet absichtlich mit dem Fehler "PROBE-ERGEBNIS";
-- danach ist nichts verändert. Nur die Zeilen darunter zählen, "FAIL" wäre ein Fehler.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_a uuid; v_b uuid; v_azubi uuid; v_admin uuid; v_id uuid; v_n int; r text := '';
BEGIN
  SELECT id INTO v_a FROM profiles WHERE role='department_admin' ORDER BY id LIMIT 1;
  SELECT id INTO v_b FROM profiles WHERE role='department_admin' AND id<>v_a ORDER BY id LIMIT 1;
  SELECT id INTO v_azubi FROM profiles WHERE role='student' ORDER BY id LIMIT 1;
  SELECT id INTO v_admin FROM profiles WHERE role='admin' LIMIT 1;
  r := r || format('Personen vorhanden: %s (true)' || E'\n', v_a IS NOT NULL AND v_b IS NOT NULL AND v_azubi IS NOT NULL AND v_admin IS NOT NULL);

  -- als Lehrkraft A: anlegen und lesen
  PERFORM pg_temp.als(v_a);
  SET LOCAL ROLE authenticated;
  INSERT INTO schulrecht_faelle (owner_id, sachverhalt, fundstellen) VALUES (v_a, 'Schüler A fehlte.', '[{"kuerzel":"BSO","nr":"§ 1"}]') RETURNING id INTO v_id;
  SELECT count(*) INTO v_n FROM schulrecht_faelle WHERE id = v_id;
  r := r || format('T1 eigenen Fall anlegen und lesen: %s (1)' || E'\n', v_n);

  -- Lehrkraft B sieht ihn nicht, kann ihn nicht ändern oder löschen
  RESET ROLE; PERFORM pg_temp.als(v_b); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM schulrecht_faelle WHERE id = v_id;
  r := r || format('T2 fremde Lehrkraft sieht den Fall: %s (0)' || E'\n', v_n);
  UPDATE schulrecht_faelle SET antwort = 'x' WHERE id = v_id; GET DIAGNOSTICS v_n = ROW_COUNT;
  r := r || format('T3 fremde Lehrkraft ändert: %s (0)' || E'\n', v_n);
  DELETE FROM schulrecht_faelle WHERE id = v_id; GET DIAGNOSTICS v_n = ROW_COUNT;
  r := r || format('T4 fremde Lehrkraft löscht: %s (0)' || E'\n', v_n);
  BEGIN
    INSERT INTO schulrecht_faelle (owner_id, sachverhalt) VALUES (v_a, 'als fremde Person');
    r := r || 'T5 Anlegen für andere Person: FAIL (sollte abgelehnt werden)' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    r := r || 'T5 Anlegen für andere Person abgelehnt (ok)' || E'\n';
  END;

  -- Super-Admin und Azubi sehen nichts
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM schulrecht_faelle WHERE id = v_id;
  r := r || format('T6 Super-Admin sieht fremden Fall: %s (0)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_azubi); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM schulrecht_faelle;
  r := r || format('T7 Azubi sieht Fälle: %s (0)' || E'\n', v_n);
  BEGIN
    INSERT INTO schulrecht_faelle (owner_id, sachverhalt) VALUES (v_azubi, 'Azubi');
    r := r || 'T8 Azubi legt an: FAIL (sollte abgelehnt werden)' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    r := r || 'T8 Azubi legt an: abgelehnt (ok)' || E'\n';
  END;

  -- Ablauf: abgelaufener Fall ist für die Besitzerin sofort unsichtbar
  RESET ROLE; UPDATE schulrecht_faelle SET laeuft_ab_am = now() - interval '1 minute' WHERE id = v_id;
  PERFORM pg_temp.als(v_a); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM schulrecht_faelle WHERE id = v_id;
  r := r || format('T9 abgelaufener Fall sichtbar: %s (0)' || E'\n', v_n);
  UPDATE schulrecht_faelle SET antwort = 'x' WHERE id = v_id; GET DIAGNOSTICS v_n = ROW_COUNT;
  r := r || format('T10 abgelaufenen Fall ändern: %s (0)' || E'\n', v_n);
  DELETE FROM schulrecht_faelle WHERE id = v_id; GET DIAGNOSTICS v_n = ROW_COUNT;
  r := r || format('T11 abgelaufenen eigenen Fall löschen: %s (0 – wie sichtbar, das Aufräumen macht pg_cron)' || E'\n', v_n);

  -- Grenzen
  BEGIN
    INSERT INTO schulrecht_faelle (owner_id, sachverhalt) VALUES (v_a, repeat('x', 5001));
    r := r || 'T12 Sachverhalt über 5000 Zeichen: FAIL' || E'\n';
  EXCEPTION WHEN check_violation THEN r := r || 'T12 Sachverhalt über 5000 Zeichen abgelehnt (ok)' || E'\n'; END;
  BEGIN
    INSERT INTO schulrecht_faelle (owner_id, sachverhalt, fundstellen) VALUES (v_a, 'x', '{"a":1}');
    r := r || 'T13 Fundstellen kein Array: FAIL' || E'\n';
  EXCEPTION WHEN check_violation THEN r := r || 'T13 Fundstellen kein Array abgelehnt (ok)' || E'\n'; END;

  -- anon
  RESET ROLE; SET LOCAL ROLE anon;
  BEGIN
    PERFORM count(*) FROM schulrecht_faelle;
    r := r || 'T14 anon liest: FAIL' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T14 anon ohne Recht (ok)' || E'\n'; END;
  RESET ROLE;

  r := r || format('Aufräum-Job geplant: %s (true oder pg_cron fehlt)' || E'\n', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'schulrecht-faelle-aufraeumen'));
  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
