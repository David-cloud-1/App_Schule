-- PROJ-67 Probe, nur Tests (Migration muss schon angewendet sein). Endet absichtlich mit „PROBE-ERGEBNIS“, rollt alles zurück.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  d_sped uuid := '11bcbe19-61fc-41ca-9580-1b485297c091';
  v_owner uuid; v_kollege uuid; v_azubi uuid; v_admin uuid;
  v_abl uuid; v_abl_h5p uuid; v_abl_fremd uuid; v_j jsonb; v_j2 jsonb; v_code text; v_code0 text;
  v_n int; v_t text; v_id uuid; r text := '';
BEGIN
  SELECT id INTO v_owner FROM profiles WHERE role='department_admin' AND department_id=d_sped ORDER BY id LIMIT 1;
  SELECT id INTO v_kollege FROM profiles WHERE role='department_admin' AND department_id=d_sped AND id<>v_owner ORDER BY id LIMIT 1;
  SELECT id INTO v_azubi FROM profiles WHERE role='student' ORDER BY id LIMIT 1;
  SELECT id INTO v_admin FROM profiles WHERE role='admin' LIMIT 1;
  r := r || format('Personen: owner=%s kollege=%s azubi=%s admin=%s (alle true)' || E'\n', v_owner IS NOT NULL, v_kollege IS NOT NULL, v_azubi IS NOT NULL, v_admin IS NOT NULL);

  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis)
  VALUES (v_owner, 'skript', 'fertig', 5, '{"titel":"Probe Seite","dateiname":"a.html","format":"seite"}'::jsonb) RETURNING id INTO v_abl;
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis)
  VALUES (v_owner, 'skript', 'fertig', 5, '{"titel":"Probe H5P","dateiname":"a.h5p","format":"h5p"}'::jsonb) RETURNING id INTO v_abl_h5p;
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis)
  VALUES (v_kollege, 'skript', 'fertig', 5, '{"titel":"Fremd","dateiname":"f.html","format":"seite"}'::jsonb) RETURNING id INTO v_abl_fremd;

  -- T1 erzeugen, Lesen, Doppelklick
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  v_j := link_erzeugen(v_abl);
  v_code0 := v_j->>'code';
  r := r || format('T1 Link erzeugt, Code %s Zeichen (48), nur Hex: %s (true)' || E'\n', length(v_code0), v_code0 ~ '^[0-9a-f]{48}$');
  v_j2 := link_erzeugen(v_abl);
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl AND abgeschaltet_am IS NULL;
  r := r || format('T1 zweiter Aufruf liefert denselben Code: %s (true), aktive Links: %s (1)' || E'\n', v_j2->>'code' = v_code0, v_n);
  r := r || format('T1 link_lesen: %s (true)' || E'\n', link_lesen(v_abl)->>'code' = v_code0);

  -- T2 Format-Sperre und Besitz
  BEGIN PERFORM link_erzeugen(v_abl_h5p); r := r || 'T2a FAIL: H5P bekommt Link' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T2a ok, H5P abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM link_erzeugen(v_abl_fremd); r := r || 'T2b FAIL: fremdes Material' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T2b ok, fremdes Material abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE; PERFORM pg_temp.als(v_azubi); SET LOCAL ROLE authenticated;
  BEGIN PERFORM link_erzeugen(v_abl); r := r || 'T2c FAIL: Azubi erzeugt Link' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T2c ok, Azubi abgelehnt: %s' || E'\n', SQLERRM); END;
  SELECT count(*) INTO v_n FROM werkzeug_links;
  r := r || format('T2d Azubi sieht Zeilen in werkzeug_links: %s (0)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_kollege); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl;
  r := r || format('T2e Kollege sieht fremde Links: %s (0)' || E'\n', v_n);
  r := r || format('T2f Kollege link_lesen fremd: %s (NULL = true)' || E'\n', link_lesen(v_abl) IS NULL);
  PERFORM link_abschalten(v_abl);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl AND abgeschaltet_am IS NULL;
  r := r || format('T2g Kollege schaltet fremden Link ab: aktive danach %s (1)' || E'\n', v_n);

  -- T3 Auslieferung: nur Service-Schlüssel (so ruft der Server auf)
  RESET ROLE; SET LOCAL ROLE service_role;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code0);
  r := r || format('T3a nachschlagen (Server): %s Zeile (1)' || E'\n', v_n);
  SELECT titel INTO v_t FROM link_nachschlagen(v_code0);
  r := r || format('T3a Titel: %s (Probe Seite)' || E'\n', v_t);
  SELECT count(*) INTO v_n FROM link_nachschlagen('ABC');
  r := r || format('T3b ungültiger Code: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM link_nachschlagen(repeat('0', 48));
  r := r || format('T3b unbekannter Code: %s (0)' || E'\n', v_n);
  PERFORM link_aufruf_zaehlen(v_code0);
  PERFORM link_aufruf_zaehlen(v_code0);
  SELECT aufrufe INTO v_n FROM werkzeug_links WHERE code = v_code0;
  r := r || format('T3c Aufrufe nach 2x: %s (2)' || E'\n', v_n);
  RESET ROLE;
  BEGIN SET LOCAL ROLE anon; PERFORM * FROM link_nachschlagen(v_code0); r := r || 'T3d FAIL: anon darf nachschlagen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3d ok, anon abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  BEGIN SET LOCAL ROLE authenticated; PERFORM link_aufruf_zaehlen(v_code0); r := r || 'T3e FAIL: authenticated darf zählen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3e ok, authenticated abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  BEGIN SET LOCAL ROLE anon; PERFORM * FROM werkzeug_links; r := r || 'T3f FAIL: anon liest Tabelle' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3f ok, anon liest Tabelle nicht: %s' || E'\n', SQLERRM); END;
  RESET ROLE;

  -- T4 Abschalten wirkt sofort, neuer Code
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  PERFORM link_abschalten(v_abl);
  RESET ROLE; SET LOCAL ROLE service_role;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code0);
  RESET ROLE;
  r := r || format('T4a nach Abschalten nachschlagen: %s (0)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  r := r || format('T4b link_lesen nach Abschalten: %s (NULL = true)' || E'\n', link_lesen(v_abl) IS NULL);
  v_j := link_erzeugen(v_abl);
  v_code := v_j->>'code';
  r := r || format('T4c neuer Link, anderer Code: %s (true)' || E'\n', v_code <> v_code0);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code0);
  r := r || format('T4d alter Code bleibt tot: %s (0)' || E'\n', v_n);

  -- T5 Super-Admin
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM link_admin_liste(50, 0) WHERE titel = 'Probe Seite';
  r := r || format('T5a Super-Admin sieht den Link: %s (1)' || E'\n', v_n);
  SELECT link_id INTO v_id FROM link_admin_liste(50, 0) WHERE titel = 'Probe Seite' LIMIT 1;
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM link_admin_liste(50, 0);
  r := r || format('T5b Lehrkraft sieht Admin-Liste: %s (0)' || E'\n', v_n);
  BEGIN PERFORM link_admin_abschalten(v_id); r := r || 'T5c FAIL: Lehrkraft schaltet per Admin-Weg ab' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5c ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  PERFORM link_admin_abschalten(v_id);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T5d nach Admin-Abschaltung: %s (0)' || E'\n', v_n);

  -- T6 Rollenentzug (Trigger) und Prüfung beim Nachschlagen
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  v_code := link_erzeugen(v_abl)->>'code';
  RESET ROLE;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T6a vor Rollenentzug: %s (1)' || E'\n', v_n);
  UPDATE profiles SET role = 'student' WHERE id = v_owner;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T6b nach Rollenentzug nachschlagen: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE owner_id = v_owner AND abgeschaltet_am IS NULL;
  r := r || format('T6c Trigger hat abgeschaltet, aktive: %s (0)' || E'\n', v_n);
  UPDATE profiles SET role = 'department_admin' WHERE id = v_owner;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T6d Rolle zurück, Link bleibt aus: %s (0)' || E'\n', v_n);

  -- T7 Löschen des Materials entfernt den Link
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  v_code := link_erzeugen(v_abl)->>'code';
  RESET ROLE;
  DELETE FROM werkzeug_ablaeufe WHERE id = v_abl;
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl;
  r := r || format('T7a Zeilen nach Löschen des Materials: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T7b nachschlagen nach Löschen: %s (0)' || E'\n', v_n);

  -- T8 Datei-Sperre: Material ohne Ergebnis
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt)
  VALUES (v_owner, 'skript', 'laeuft', 2) RETURNING id INTO v_abl;
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  BEGIN PERFORM link_erzeugen(v_abl); r := r || 'T8 FAIL: Entwurf bekommt Link' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8 ok, Entwurf abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
