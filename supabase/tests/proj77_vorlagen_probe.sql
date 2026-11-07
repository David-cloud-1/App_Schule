-- PROJ-77 Probe: Vorlagen-Tabelle und Rechte (Migration 20261112_proj77 muss angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_a uuid; v_b uuid; v_student uuid; v_admin uuid; v_priv uuid; v_shared uuid; v_n int; r text := '';
  v_scale jsonb := '[{"grade":1,"minPercent":92},{"grade":2,"minPercent":81},{"grade":3,"minPercent":67},{"grade":4,"minPercent":50},{"grade":5,"minPercent":30},{"grade":6,"minPercent":0}]';
BEGIN
  SELECT id INTO v_a FROM profiles WHERE role = 'teacher' ORDER BY id LIMIT 1;
  IF v_a IS NULL THEN SELECT id INTO v_a FROM profiles WHERE role = 'department_admin' ORDER BY id LIMIT 1; END IF;
  SELECT id INTO v_b FROM profiles WHERE role IN ('teacher', 'department_admin') AND id <> v_a ORDER BY id LIMIT 1;
  SELECT id INTO v_student FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT id INTO v_admin FROM profiles WHERE role = 'admin' ORDER BY id LIMIT 1;

  -- T1: A legt eine private und eine geteilte Vorlage an
  PERFORM pg_temp.als(v_a); SET LOCAL ROLE authenticated;
  INSERT INTO grading_scale_templates (owner_id, name, scale, shared) VALUES (v_a, 'Probe privat', v_scale, false) RETURNING id INTO v_priv;
  INSERT INTO grading_scale_templates (owner_id, name, scale, shared) VALUES (v_a, 'Probe geteilt', v_scale, true) RETURNING id INTO v_shared;
  RESET ROLE;
  r := r || 'T1 A legt zwei Vorlagen an (ok)' || E'\n';

  -- T2: B sieht nur die geteilte
  PERFORM pg_temp.als(v_b); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM grading_scale_templates WHERE id IN (v_priv, v_shared);
  r := r || format('T2a B sieht: %s (1)' || E'\n', v_n);
  UPDATE grading_scale_templates SET name = 'gehackt' WHERE id = v_shared;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T2b B ändert geteilte: %s Zeilen (0)' || E'\n', v_n);
  DELETE FROM grading_scale_templates WHERE id = v_shared;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T2c B löscht geteilte: %s Zeilen (0)' || E'\n', v_n);
  BEGIN
    INSERT INTO grading_scale_templates (owner_id, name, scale) VALUES (v_a, 'Fremd', v_scale);
    r := r || 'T2d B legt Vorlage im Namen von A an: ERLAUBT (FEHLER)' || E'\n';
  EXCEPTION WHEN OTHERS THEN
    r := r || 'T2d B legt Vorlage im Namen von A an: abgelehnt (ok)' || E'\n';
  END;
  RESET ROLE;

  -- T3: Azubi sieht nichts, darf nichts
  IF v_student IS NOT NULL THEN
    PERFORM pg_temp.als(v_student); SET LOCAL ROLE authenticated;
    SELECT count(*) INTO v_n FROM grading_scale_templates;
    r := r || format('T3a Azubi sieht: %s (0)' || E'\n', v_n);
    RESET ROLE;
  END IF;

  -- T4: Name leer / zu lang, falsche Grenzenzahl
  BEGIN
    INSERT INTO grading_scale_templates (owner_id, name, scale) VALUES (v_a, repeat('x', 61), v_scale);
    r := r || 'T4a 61 Zeichen: ERLAUBT (FEHLER)' || E'\n';
  EXCEPTION WHEN check_violation THEN r := r || 'T4a 61 Zeichen abgelehnt (ok)' || E'\n'; END;
  BEGIN
    INSERT INTO grading_scale_templates (owner_id, name, scale) VALUES (v_a, 'x', '[]');
    r := r || 'T4b leere Grenzen: ERLAUBT (FEHLER)' || E'\n';
  EXCEPTION WHEN check_violation THEN r := r || 'T4b leere Grenzen abgelehnt (ok)' || E'\n'; END;

  -- T5: Besitzer lässt sich nicht umhängen
  PERFORM pg_temp.als(v_a); SET LOCAL ROLE authenticated;
  UPDATE grading_scale_templates SET owner_id = v_b WHERE id = v_priv;
  RESET ROLE;
  SELECT count(*) INTO v_n FROM grading_scale_templates WHERE id = v_priv AND owner_id = v_a;
  r := r || format('T5 Besitzer unverändert: %s (1)' || E'\n', v_n);

  -- T6: Konto weg -> private Vorlage weg, geteilte bleibt ohne Besitzer.
  -- Echte Profile werden nicht gelöscht; der Fremdschlüssel-Teil wird simuliert.
  DELETE FROM grading_scale_templates WHERE owner_id = v_a AND NOT shared;
  UPDATE grading_scale_templates SET owner_id = NULL WHERE id = v_shared;
  SELECT count(*) INTO v_n FROM grading_scale_templates WHERE id = v_priv;
  r := r || format('T6a private nach Kontoende: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM grading_scale_templates WHERE id = v_shared AND owner_id IS NULL;
  r := r || format('T6b geteilte bleibt ohne Besitzer: %s (1)' || E'\n', v_n);

  -- T7: verwaiste Vorlage: Lehrkraft darf nicht, Super-Admin darf
  PERFORM pg_temp.als(v_b); SET LOCAL ROLE authenticated;
  UPDATE grading_scale_templates SET name = 'fremd' WHERE id = v_shared;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T7a Lehrkraft ändert verwaiste: %s (0)' || E'\n', v_n);
  RESET ROLE;
  IF v_admin IS NOT NULL THEN
    PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
    UPDATE grading_scale_templates SET name = 'Admin' WHERE id = v_shared;
    GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T7b Super-Admin ändert verwaiste: %s (1)' || E'\n', v_n);
    RESET ROLE;
  END IF;

  RAISE EXCEPTION 'PROBE-ERGEBNIS:%', E'\n' || r;
END
$probe$;
