-- PROJ-79 Probe: neue Spalten (Migration 20261114_proj79_nachweis_kopie muss angewendet sein).
-- Endet absichtlich mit dem Fehler „PROBE-ERGEBNIS“ und rollt dadurch alles zurück.
-- Nur die Zeilen unter „PROBE-ERGEBNIS“ zählen. Erwartete Werte stehen in Klammern.

DO $probe$
DECLARE
  v_n int; v_a uuid; v_copy uuid; v_title text; v_from uuid; r text := '';
BEGIN
  SELECT count(*) INTO v_n FROM information_schema.columns
   WHERE table_name = 'graded_assessments' AND column_name IN ('copied_from_id', 'copied_from_title');
  r := r || format('T1 neue Spalten vorhanden: %s (2)' || E'\n', v_n);

  SELECT count(*) INTO v_n FROM graded_assessments WHERE copied_from_id IS NOT NULL OR copied_from_title IS NOT NULL;
  r := r || format('T2 Bestandszeilen mit Kopie-Angabe: %s (0)' || E'\n', v_n);

  SELECT id INTO v_a FROM graded_assessments ORDER BY created_at DESC LIMIT 1;
  IF v_a IS NULL THEN
    r := r || 'T3 übersprungen: kein Nachweis vorhanden' || E'\n';
  ELSE
    -- Kopie anlegen, Original löschen: Verweis wird leer, Titel bleibt
    INSERT INTO graded_assessments (part, title, access_code, duration_minutes, opens_at, closes_at, grading_scale,
                                    department_id, draft_question_ids, copied_from_id, copied_from_title)
    SELECT part, 'PROBE (Kopie)', 'PROBE79X', duration_minutes, opens_at, closes_at, grading_scale,
           department_id, ARRAY[]::uuid[], id, title
      FROM graded_assessments WHERE id = v_a
    RETURNING id INTO v_copy;
    SELECT copied_from_id INTO v_from FROM graded_assessments WHERE id = v_copy;
    r := r || format('T3a Kopie verweist aufs Original: %s (true)' || E'\n', v_from = v_a);
    DELETE FROM exam_sessions WHERE assessment_id = v_a;
    DELETE FROM graded_assessments WHERE id = v_a;
    SELECT copied_from_id, copied_from_title INTO v_from, v_title FROM graded_assessments WHERE id = v_copy;
    r := r || format('T3b nach Löschen des Originals: Verweis=%s, Titel gemerkt=%s (NULL, true)' || E'\n',
                     coalesce(v_from::text, 'NULL'), v_title IS NOT NULL);
  END IF;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
