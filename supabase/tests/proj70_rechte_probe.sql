-- PROJ-70 Probe: Rechte-Matrix für Inhalte (Migrationen 20261107_proj70_* und 20261108_proj70_privat_schutz müssen angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  v_teacher uuid; v_dadmin uuid; v_student uuid; v_admin uuid; v_other uuid;
  v_q uuid; v_q_orig text; v_q_dep uuid; v_new uuid; v_topic uuid; v_set uuid; v_subj uuid; v_dep_other uuid;
  v_priv uuid; v_n int; v_batch uuid; v_expl text; v_done int; r text := '';
BEGIN
  SELECT id INTO v_admin   FROM profiles WHERE role = 'admin' ORDER BY id LIMIT 1;
  SELECT id INTO v_dadmin  FROM profiles WHERE role = 'department_admin' ORDER BY id LIMIT 1;
  SELECT id INTO v_student FROM profiles WHERE role = 'student' ORDER BY id LIMIT 1;
  SELECT id INTO v_teacher FROM profiles WHERE role = 'teacher' ORDER BY id LIMIT 1;
  IF v_teacher IS NULL THEN
    -- Keine echte Lehrkraft vorhanden: einen Azubi für diese Probe umstellen (wird zurückgerollt)
    SELECT id INTO v_teacher FROM profiles WHERE role = 'student' AND id <> v_student ORDER BY id LIMIT 1;
    UPDATE profiles SET role = 'teacher' WHERE id = v_teacher;
  END IF;
  DELETE FROM teacher_subject_assignments WHERE teacher_id = v_teacher;  -- bewusst OHNE Fach-Eintragung
  SELECT id INTO v_other FROM profiles WHERE id NOT IN (v_teacher, v_admin, v_student) ORDER BY id LIMIT 1;
  r := r || format('Personen: admin=%s dadmin=%s student=%s teacher=%s (alle true)' || E'\n',
    v_admin IS NOT NULL, v_dadmin IS NOT NULL, v_student IS NOT NULL, v_teacher IS NOT NULL);

  -- eine nicht private Frage mit Fach, ein Thema, ein Prüfungsset, ein Fach in einem anderen Bereich
  SELECT q.id, q.explanation, question_department(q.id) INTO v_q, v_q_orig, v_q_dep
    FROM questions q JOIN question_subjects qs ON qs.question_id = q.id
    WHERE NOT q.is_private AND q.deleted_at IS NULL ORDER BY q.id LIMIT 1;
  SELECT id INTO v_topic FROM topics WHERE deleted_at IS NULL ORDER BY id LIMIT 1;
  SELECT id INTO v_set FROM exam_question_sets WHERE deleted_at IS NULL ORDER BY id LIMIT 1;
  SELECT id, department_id INTO v_subj, v_dep_other FROM subjects WHERE deleted_at IS NULL ORDER BY id LIMIT 1;

  -- T1: Lehrkraft OHNE Eintragung ändert Frage, Thema, Fach, Prüfungsset
  RESET ROLE; PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  UPDATE questions SET explanation = coalesce(explanation, '') || ' [PROBE]' WHERE id = v_q;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T1a Frage ändern: %s Zeile (1)' || E'\n', v_n);
  UPDATE topics SET name = name WHERE id = v_topic;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T1b Thema ändern: %s Zeile (1)' || E'\n', v_n);
  UPDATE subjects SET description = description WHERE id = v_subj;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T1c Fach ändern: %s Zeile (1)' || E'\n', v_n);
  IF v_set IS NOT NULL THEN
    UPDATE exam_question_sets SET name = name WHERE id = v_set;
    GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T1d Prüfungsset ändern: %s Zeile (1)' || E'\n', v_n);
  END IF;

  -- T2: Papierkorb ja, endgültig Löschen nein
  UPDATE questions SET deleted_at = now() WHERE id = v_q;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T2a In den Papierkorb: %s Zeile (1)' || E'\n', v_n);
  BEGIN
    DELETE FROM questions WHERE id = v_q;
    r := r || 'T2b FAIL: Lehrkraft löscht endgültig' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T2b ok, endgültiges Löschen abgelehnt (42501)' || E'\n';
  WHEN OTHERS THEN r := r || format('T2b andere Ablehnung: %s' || E'\n', SQLERRM); END;
  UPDATE questions SET deleted_at = NULL WHERE id = v_q;

  -- T3: Eigene frische Frage darf zurückgebaut werden (Import-Abbruch)
  INSERT INTO questions (question_text, difficulty, type) VALUES ('PROBE frisch', 'mittel', 'open') RETURNING id INTO v_new;
  DELETE FROM questions WHERE id = v_new;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T3 Rückbau eigener frischer Frage: %s Zeile (1)' || E'\n', v_n);

  -- T4: Verlauf lesbar (mit Bereich), Schülerdaten nicht
  SELECT count(*) INTO v_n FROM content_versions WHERE department_id IS NOT NULL;
  r := r || format('T4a Lehrkraft sieht Versionen mit Bereich: %s (>0)' || E'\n', v_n);
  UPDATE profiles SET display_name = 'PROBE' WHERE id = v_other;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T4b fremdes Profil ändern: %s Zeilen (0)' || E'\n', v_n);
  BEGIN
    PERFORM * FROM content_changes_per_person(now() - interval '1 day', now() + interval '1 day', NULL);
    r := r || 'T4c FAIL: Lehrkraft nutzt Personen-Auswertung' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T4c ok, Personen-Auswertung abgelehnt' || E'\n';
  WHEN OTHERS THEN r := r || format('T4c andere Ablehnung: %s' || E'\n', SQLERRM); END;
  BEGIN
    PERFORM * FROM revert_person_changes(v_teacher, now() - interval '1 day', now() + interval '1 day', false, 'x', '[]'::jsonb, NULL);
    r := r || 'T4d FAIL: Lehrkraft nutzt Sammel-Rücknahme' || E'\n';
  EXCEPTION WHEN insufficient_privilege THEN r := r || 'T4d ok, Sammel-Rücknahme abgelehnt' || E'\n';
  WHEN OTHERS THEN r := r || format('T4d andere Ablehnung: %s' || E'\n', SQLERRM); END;

  -- T5: Azubi ändert nichts
  RESET ROLE; PERFORM pg_temp.als(v_student); SET LOCAL ROLE authenticated;
  UPDATE questions SET explanation = 'PROBE' WHERE id = v_q;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T5a Azubi ändert Frage: %s Zeilen (0)' || E'\n', v_n);
  UPDATE subjects SET description = 'PROBE' WHERE id = v_subj;
  GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T5b Azubi ändert Fach: %s Zeilen (0)' || E'\n', v_n);

  -- T6: Bereichs-Admin eines anderen Bereichs darf jetzt ebenfalls Inhalte ändern
  IF v_dadmin IS NOT NULL THEN
    RESET ROLE; PERFORM pg_temp.als(v_dadmin); SET LOCAL ROLE authenticated;
    UPDATE questions SET difficulty = difficulty WHERE id = v_q;
    GET DIAGNOSTICS v_n = ROW_COUNT; r := r || format('T6 Bereichs-Admin ändert Frage: %s Zeile (1)' || E'\n', v_n);
  END IF;

  -- T7: Super-Admin: Auswertung und Sammel-Rücknahme der Lehrkraft
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM content_changes_per_person(now() - interval '1 day', now() + interval '1 day', NULL) WHERE person_id = v_teacher;
  r := r || format('T7a Auswertung zeigt die Lehrkraft: %s Zeile (1)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM person_revert_plan(v_teacher, now() - interval '1 day', now() + interval '1 day') WHERE content_id = v_q;
  r := r || format('T7b Plan nennt die Frage: %s Zeile (1)' || E'\n', v_n);
  SELECT r_batch, r_done INTO v_batch, v_done FROM revert_person_changes(
    v_teacher, now() - interval '1 day', now() + interval '1 day', true, 'PROBE Rücknahme',
    jsonb_build_array(jsonb_build_object('type', 'question', 'id', v_q)), NULL);
  SELECT explanation INTO v_expl FROM questions WHERE id = v_q;
  r := r || format('T7c Rücknahme: %s zurückgenommen (1), Text wieder wie vorher: %s (true)' || E'\n', v_done, v_expl IS NOT DISTINCT FROM v_q_orig);
  SELECT count(*) INTO v_n FROM content_versions WHERE batch_id = v_batch;
  r := r || format('T7d Versionen im Vorgang: %s (>0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM content_versions WHERE batch_id = v_batch AND change_type = 'restored';
  r := r || format('T7e davon als „wiederhergestellt“ markiert: %s (>0)' || E'\n', v_n);

  -- T8 (BUG-1, Migration 20261108_proj70_privat_schutz): fremde private Nachweis-Frage
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  INSERT INTO questions (question_text, difficulty, type, is_private, assessment_only, owner_id)
    VALUES ('PROBE privat', 'mittel', 'open', true, true, v_admin) RETURNING id INTO v_priv;
  UPDATE questions SET explanation = 'v2' WHERE id = v_priv;
  RESET ROLE; PERFORM pg_temp.als(v_teacher); SET LOCAL ROLE authenticated;
  r := r || format('T8a Lehrkraft darf fremde private Frage verwalten: %s (false)' || E'\n', can_admin_question(v_priv));
  BEGIN
    PERFORM restore_content_version('question', v_priv, 1);
    r := r || 'T8b FAIL: Lehrkraft stellt fremde private Frage wieder her' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8b ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM restore_content_version('question', v_priv, 1);
    r := r || 'T8c Super-Admin stellt private Frage wieder her: ok (ok)' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8c FAIL: %s' || E'\n', SQLERRM); END;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
