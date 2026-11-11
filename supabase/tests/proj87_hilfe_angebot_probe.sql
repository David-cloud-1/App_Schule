-- PROJ-87 Probe (Migrationen 20261119_proj87_hilfe_angebot und _rechte müssen angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_t1 uuid; v_t2 uuid; v_s uuid; v_n int; v_a text; r text := '';
BEGIN
  SELECT id INTO v_t1 FROM profiles WHERE role IN ('teacher', 'department_admin', 'admin') ORDER BY id LIMIT 1;
  SELECT id INTO v_t2 FROM profiles WHERE role IN ('teacher', 'department_admin', 'admin') AND id <> v_t1 ORDER BY id LIMIT 1;
  SELECT id INTO v_s FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  r := r || format('Vorhanden: t1=%s t2=%s student=%s (alle true)' || E'\n', v_t1 IS NOT NULL, v_t2 IS NOT NULL, v_s IS NOT NULL);

  -- T1: Lehrkraft legt ihre Antwort an und überschreibt sie (eine Zeile, letzte Antwort gilt)
  PERFORM pg_temp.als(v_t1); SET LOCAL ROLE authenticated;
  INSERT INTO werkzeug_hilfe_angebot (owner_id, werkzeug, antwort) VALUES (v_t1, 'skript', 'nein')
    ON CONFLICT (owner_id, werkzeug) DO UPDATE SET antwort = EXCLUDED.antwort;
  INSERT INTO werkzeug_hilfe_angebot (owner_id, werkzeug, antwort) VALUES (v_t1, 'skript', 'ja')
    ON CONFLICT (owner_id, werkzeug) DO UPDATE SET antwort = EXCLUDED.antwort;
  SELECT count(*), max(antwort) INTO v_n, v_a FROM werkzeug_hilfe_angebot WHERE owner_id = v_t1 AND werkzeug = 'skript';
  r := r || format('T1 Zeilen=%s Antwort=%s (1, ja)' || E'\n', v_n, v_a);

  -- T2: Fremde Konten schreiben nicht in fremde Zeilen
  BEGIN
    INSERT INTO werkzeug_hilfe_angebot (owner_id, werkzeug, antwort) VALUES (v_t2, 'kahoot', 'ja');
    r := r || 'T2 FAIL: fremde Zeile angelegt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T2 ok: %s (RLS)' || E'\n', SQLERRM); END;

  -- T3: Ungültige Antwort wird abgelehnt
  BEGIN
    INSERT INTO werkzeug_hilfe_angebot (owner_id, werkzeug, antwort) VALUES (v_t1, 'kahoot', 'vielleicht');
    r := r || 'T3 FAIL: Antwort "vielleicht" gespeichert' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3 ok: %s (CHECK)' || E'\n', SQLERRM); END;

  -- T4: Löschen durch den Browser-Schlüssel hat keine Wirkung (kein Recht)
  BEGIN
    DELETE FROM werkzeug_hilfe_angebot WHERE owner_id = v_t1;
    r := r || 'T4 FAIL: Löschen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T4 ok: %s (permission denied)' || E'\n', SQLERRM); END;
  RESET ROLE;

  -- T5: Zweite Lehrkraft sieht die Zeile der ersten nicht
  PERFORM pg_temp.als(v_t2); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM werkzeug_hilfe_angebot WHERE owner_id = v_t1;
  r := r || format('T5 fremde Zeilen sichtbar=%s (0)' || E'\n', v_n);
  RESET ROLE;

  -- T6: Azubi sieht und schreibt nichts
  PERFORM pg_temp.als(v_s); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM werkzeug_hilfe_angebot;
  r := r || format('T6 Azubi sieht=%s (0)' || E'\n', v_n);
  BEGIN
    INSERT INTO werkzeug_hilfe_angebot (owner_id, werkzeug, antwort) VALUES (v_s, 'skript', 'ja');
    r := r || 'T6 FAIL: Azubi schreibt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T6 ok: %s (RLS)' || E'\n', SQLERRM); END;
  RESET ROLE;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
