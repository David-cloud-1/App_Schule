-- PROJ-72/73 Probe: Fragen melden und Inbox (Migration 20261110_proj72_73_fragen_meldungen muss angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_s1 uuid; v_s2 uuid; v_teacher uuid;
  v_q uuid; v_q2 uuid; v_opt uuid; v_id uuid; v_id2 uuid; v_n int; v_c0 int; v_c1 int; v_j jsonb; r text := '';
BEGIN
  SELECT id INTO v_teacher FROM profiles WHERE role IN ('teacher', 'department_admin', 'admin') ORDER BY id LIMIT 1;
  SELECT id INTO v_s1 FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT id INTO v_s2 FROM profiles WHERE role = 'student' AND id <> v_s1 ORDER BY id LIMIT 1;
  SELECT q.id INTO v_q FROM questions q WHERE q.is_active AND q.deleted_at IS NULL AND NOT q.assessment_only AND NOT q.is_private
    AND EXISTS (SELECT 1 FROM answer_options o WHERE o.question_id = q.id) ORDER BY q.id LIMIT 1;
  SELECT q.id INTO v_q2 FROM questions q WHERE q.is_active AND q.deleted_at IS NULL AND NOT q.assessment_only AND NOT q.is_private AND q.id <> v_q ORDER BY q.id LIMIT 1;
  SELECT id INTO v_opt FROM answer_options WHERE question_id = v_q ORDER BY display_order LIMIT 1;
  DELETE FROM exam_sessions WHERE user_id IN (v_s1, v_s2) AND status = 'in_progress';
  r := r || format('Personen/Fragen vorhanden: teacher=%s s1=%s s2=%s q=%s q2=%s (alle true)' || E'\n',
    v_teacher IS NOT NULL, v_s1 IS NOT NULL, v_s2 IS NOT NULL, v_q IS NOT NULL, v_q2 IS NOT NULL);

  -- T1: Azubi meldet
  RESET ROLE; PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  v_id := report_question(v_q, 'andere_antwort_richtig', '  Antwort B stimmt auch  ', v_opt);
  SELECT count(*) INTO v_n FROM question_reports WHERE id = v_id AND status = 'offen' AND note = 'Antwort B stimmt auch'
    AND question_text IS NOT NULL AND chosen_option_text IS NOT NULL AND reporter_id = v_s1;
  r := r || format('T1 Meldung angelegt, Text getrimmt, Kopie der Frage und Antwort: %s (1)' || E'\n', v_n);

  -- T2: zweite offene Meldung zur selben Frage
  BEGIN
    PERFORM report_question(v_q, 'veraltet');
    r := r || 'T2 FAIL: Doppelmeldung erlaubt' || E'\n';
  EXCEPTION WHEN unique_violation THEN r := r || 'T2 ok, Doppelmeldung abgelehnt (ALREADY_REPORTED)' || E'\n';
  WHEN OTHERS THEN r := r || format('T2 andere Ablehnung: %s' || E'\n', SQLERRM); END;

  -- T3: Eingabeprüfungen
  BEGIN PERFORM report_question(v_q2, 'sonstiges'); r := r || 'T3a FAIL: „Etwas anderes“ ohne Text erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3a ok: %s (NOTE_REQUIRED)' || E'\n', SQLERRM); END;
  BEGIN PERFORM report_question(v_q2, 'quatsch'); r := r || 'T3b FAIL: ungültiger Grund erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3b ok: %s (INVALID_REASON)' || E'\n', SQLERRM); END;
  BEGIN PERFORM report_question(v_q2, 'veraltet', repeat('x', 501)); r := r || 'T3c FAIL: 501 Zeichen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3c ok: %s (NOTE_TOO_LONG)' || E'\n', SQLERRM); END;
  BEGIN PERFORM report_question(gen_random_uuid(), 'veraltet'); r := r || 'T3d FAIL: unbekannte Frage erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3d ok: %s (QUESTION_NOT_FOUND)' || E'\n', SQLERRM); END;

  -- T4: direkt schreiben ist verboten
  BEGIN
    INSERT INTO question_reports (question_id, reporter_id, reason, question_text) VALUES (v_q2, v_s1, 'veraltet', 'x');
    r := r || 'T4a FAIL: direktes INSERT erlaubt' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T4a ok, direktes INSERT abgelehnt' || E'\n';
  WHEN OTHERS THEN r := r || format('T4a andere Ablehnung: %s' || E'\n', SQLERRM); END;
  BEGIN
    UPDATE question_reports SET status = 'korrigiert' WHERE id = v_id;
    r := r || 'T4b FAIL: direktes UPDATE erlaubt' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T4b ok, direktes UPDATE abgelehnt' || E'\n';
  WHEN OTHERS THEN r := r || format('T4b andere Ablehnung: %s' || E'\n', SQLERRM); END;

  -- T5: laufende Prüfung blockiert Melden
  RESET ROLE;
  INSERT INTO exam_sessions (user_id, parts_selected, status, started_at) VALUES (v_s1, ARRAY[1], 'in_progress', now());
  PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  BEGIN PERFORM report_question(v_q2, 'veraltet'); r := r || 'T5 FAIL: Melden in laufender Prüfung erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5 ok: %s (SESSION_RUNNING)' || E'\n', SQLERRM); END;
  RESET ROLE; DELETE FROM exam_sessions WHERE user_id = v_s1 AND status = 'in_progress';

  -- T6: Sichtbarkeit
  PERFORM pg_temp.als(v_s2); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM question_reports WHERE id = v_id;
  r := r || format('T6a fremder Azubi sieht die Meldung: %s (0)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM question_reports WHERE id = v_id;
  r := r || format('T6b Lehrkraft sieht die Meldung: %s (1)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM question_report_groups WHERE question_id = v_q AND report_count >= 1;
  r := r || format('T6c Inbox-Ansicht zeigt die Frage: %s (1)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  BEGIN PERFORM claim_question_reports(v_q); r := r || 'T6d FAIL: Azubi übernimmt Meldung' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T6d ok, Azubi darf nicht übernehmen' || E'\n';
  WHEN OTHERS THEN r := r || format('T6d andere Ablehnung: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM close_question_reports(v_q, 'korrigiert'); r := r || 'T6e FAIL: Azubi schließt Meldung' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T6e ok, Azubi darf nicht schließen' || E'\n';
  WHEN OTHERS THEN r := r || format('T6e andere Ablehnung: %s' || E'\n', SQLERRM); END;

  -- T7: Lehrkraft übernimmt und schließt als „korrigiert“ → 15 Münzen, nur einmal
  RESET ROLE; SELECT coin_balance INTO v_c0 FROM profiles WHERE id = v_s1;
  PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  v_n := claim_question_reports(v_q);
  r := r || format('T7a übernommen: %s Meldung (1)' || E'\n', v_n);
  v_j := close_question_reports(v_q, 'korrigiert', 'Danke, Antwort B war doppelt.');
  r := r || format('T7b geschlossen: %s (closed 1, rewarded 1; bei Lehrkraft = Melder rewarded 0)' || E'\n', v_j);
  v_j := close_question_reports(v_q, 'korrigiert');
  r := r || format('T7c erneut schließen: %s (closed 0, rewarded 0)' || E'\n', v_j);
  RESET ROLE; SELECT coin_balance INTO v_c1 FROM profiles WHERE id = v_s1;
  r := r || format('T7d Münzen des Melders: +%s (15)' || E'\n', v_c1 - v_c0);

  -- T8: stilles Schließen = keine Belohnung, Rückmeldung gilt als gelesen
  PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  v_id2 := report_question(v_q, 'tippfehler_unklar', 'Satz unklar');
  RESET ROLE; PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  v_j := close_question_reports(v_q, 'korrigiert', NULL, true);
  r := r || format('T8a still geschlossen: %s (closed 1, rewarded 0)' || E'\n', v_j);
  SELECT count(*) INTO v_n FROM question_reports WHERE id = v_id2 AND silent AND feedback_read_at IS NOT NULL AND reward_coins = 0;
  r := r || format('T8b still: gelesen markiert, keine Münzen: %s (1)' || E'\n', v_n);

  -- T9: „nicht übernommen“ = keine Belohnung
  RESET ROLE; PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  PERFORM report_question(v_q, 'veraltet');
  RESET ROLE; PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  v_j := close_question_reports(v_q, 'nicht_uebernommen', 'Frage ist korrekt.');
  r := r || format('T9 nicht übernommen: %s (closed 1, rewarded 0)' || E'\n', v_j);

  -- T10: Rückmeldung gelesen markieren (nur eigene)
  RESET ROLE; PERFORM pg_temp.als(v_s2); SET LOCAL ROLE authenticated;
  v_n := mark_question_reports_read(ARRAY[v_id]);
  r := r || format('T10a fremder Azubi markiert gelesen: %s (0)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_s1); SET LOCAL ROLE authenticated;
  v_n := mark_question_reports_read(ARRAY[v_id]);
  r := r || format('T10b Melder markiert gelesen: %s (1)' || E'\n', v_n);

  -- T11: Tageslimit 10
  RESET ROLE;
  DELETE FROM question_reports WHERE reporter_id = v_s2;
  PERFORM pg_temp.als(v_s2); SET LOCAL ROLE authenticated;
  v_n := 0;
  FOR v_id IN SELECT id FROM questions WHERE is_active AND deleted_at IS NULL AND NOT assessment_only AND NOT is_private ORDER BY id LIMIT 11 LOOP
    BEGIN PERFORM report_question(v_id, 'veraltet'); v_n := v_n + 1;
    EXCEPTION WHEN OTHERS THEN r := r || format('T11 Ablehnung bei Meldung %s: %s (DAILY_LIMIT bei 11)' || E'\n', v_n + 1, SQLERRM); END;
  END LOOP;
  r := r || format('T11 angenommen: %s (10; kleiner, wenn es weniger als 11 Fragen gibt)' || E'\n', v_n);

  -- T12: Frage im Papierkorb → offene Meldungen „entfaellt“
  RESET ROLE;
  UPDATE questions SET deleted_at = now() WHERE id = (SELECT question_id FROM question_reports WHERE reporter_id = v_s2 AND status = 'offen' ORDER BY id LIMIT 1);
  SELECT count(*) INTO v_n FROM question_reports WHERE reporter_id = v_s2 AND status = 'entfaellt';
  r := r || format('T12 Papierkorb setzt Meldung auf entfaellt: %s (1)' || E'\n', v_n);

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
