-- PROJ-60: Probe der Lösch-Funktionen. Endet mit dem gewollten Fehler „PROBE-ERGEBNIS“,
-- dadurch wird alles zurückgerollt. Setzt voraus, dass die Migration schon angewendet
-- oder davor in denselben Editor-Tab kopiert wurde (siehe proj60_konto_loeschen_probe.sql).
DO $probe$
DECLARE
  s uuid := gen_random_uuid();   -- Schüler
  t uuid := gen_random_uuid();   -- Lehrkraft
  a uuid;                        -- vorhandener Nachweis
  set_id uuid;
  sess uuid;
  vor jsonb; vorb jsonb;
  r text := '';
  n int;
BEGIN
  SELECT id INTO a FROM graded_assessments LIMIT 1;
  IF a IS NULL THEN RAISE EXCEPTION 'PROBE-ERGEBNIS: kein Nachweis zum Testen vorhanden'; END IF;

  INSERT INTO auth.users (id, instance_id, aud, role, email)
  VALUES (s, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-s@example.invalid'),
         (t, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-t@example.invalid');

  INSERT INTO exam_question_sets (name, part, question_ids, created_by) VALUES ('Probe', 1, '{}', t) RETURNING id INTO set_id;
  INSERT INTO exam_sessions (user_id, parts_selected, assessment_id, participant_name, status)
    VALUES (s, '{1}', a, 'Probe Name', 'completed') RETURNING id INTO sess;
  INSERT INTO exam_sessions (user_id, parts_selected, status) VALUES (s, '{1}', 'completed');
  INSERT INTO admin_audit_log (admin_id, action_type, object_type, object_id, object_label, details)
    VALUES (t, 'user.email_change', 'user', s::text, 'Probe Name', '{"to":"x@y.de"}');

  vor := konto_loeschen_vorschau(s);
  r := r || format('vorschau=%s; ', vor);
  IF (vor->>'nachweise')::int <> 1 THEN RAISE EXCEPTION 'FEHLER vorschau nachweise %', vor; END IF;

  vorb := konto_loeschen_vorbereiten(s);
  r := r || format('vorbereiten=%s; ', vorb);
  -- ein zweiter Lauf ist harmlos
  PERFORM konto_loeschen_vorbereiten(s);

  SELECT count(*) INTO n FROM exam_sessions WHERE user_id = s;
  IF n <> 0 THEN RAISE EXCEPTION 'FEHLER: Sessions hängen noch am Konto (%)', n; END IF;
  IF NOT EXISTS (SELECT 1 FROM exam_sessions WHERE id = sess AND user_id IS NULL AND participant_name IS NULL) THEN
    RAISE EXCEPTION 'FEHLER: Abgabe nicht anonym erhalten';
  END IF;
  IF EXISTS (SELECT 1 FROM admin_audit_log WHERE object_label = 'Probe Name' OR object_id = s::text) THEN
    RAISE EXCEPTION 'FEHLER: Protokoll nennt die Person noch';
  END IF;

  DELETE FROM auth.users WHERE id = s;
  IF NOT EXISTS (SELECT 1 FROM exam_sessions WHERE id = sess) THEN RAISE EXCEPTION 'FEHLER: Abgabe mit Konto gelöscht'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = s) THEN RAISE EXCEPTION 'FEHLER: Profil noch da'; END IF;

  -- Lehrkraft mit Zusammenstellung und Protokollzeile löschen
  DELETE FROM auth.users WHERE id = t;
  IF NOT EXISTS (SELECT 1 FROM exam_question_sets WHERE id = set_id AND created_by IS NULL) THEN
    RAISE EXCEPTION 'FEHLER: Zusammenstellung weg oder noch beim Autor';
  END IF;
  SELECT count(*) INTO n FROM admin_audit_log WHERE admin_id IS NULL AND action_type = 'user.email_change';
  IF n < 1 THEN RAISE EXCEPTION 'FEHLER: Protokollzeile der Lehrkraft verloren'; END IF;

  -- Rechte
  IF has_function_privilege('anon', 'public.konto_loeschen_vorbereiten(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.konto_loeschen_vorbereiten(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.konto_loeschen_vorschau(uuid)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FEHLER: anon/authenticated dürfen die Funktionen aufrufen'; END IF;

  RAISE EXCEPTION 'PROBE-ERGEBNIS: ALLES OK — %', r;
END
$probe$;
