-- PROJ-63 QA: Angriffstest auf das Lehrerzimmer (Azubi, anon, Rollenverlust, Grenzen, Flut).
-- Im Supabase-SQL-Editor ausführen. Das Skript endet absichtlich mit einem Fehler
-- („QA-ERGEBNIS“): Damit wird ALLES zurückgerollt, es bleibt nichts in der Datenbank.
-- Jede Zeile beginnt mit „ok“ oder „FAIL“. Erwartung: kein FAIL.
-- Eine Zeile „FUND“ beim Namen-Test verschwindet nach 20261030_proj63_author_name_fix.sql.
DO $t$
DECLARE
  res text := ''; v_code text; n int;
  s uuid; m uuid; b uuid; c uuid;
  p uuid; r uuid; nm text; fn text;
BEGIN
  SELECT id INTO s FROM profiles WHERE role='student' LIMIT 1;
  SELECT id INTO m FROM profiles WHERE role='department_admin' ORDER BY id LIMIT 1;
  SELECT id INTO b FROM profiles WHERE role='department_admin' AND id<>m ORDER BY id LIMIT 1;
  SELECT id INTO c FROM profiles WHERE role='department_admin' AND id NOT IN (m,b) ORDER BY id LIMIT 1;
  UPDATE profiles SET role='teacher' WHERE id IN (b,c);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  p := forum_create_post('frage','Frage für den Angriffstest','Text der Frage für den Angriffstest', NULL, NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c, 'role','authenticated')::text, true);
  r := forum_create_reply(p, 'Eine normale Antwort von C');

  -- A. Azubi ruft jede Schreib-Funktion direkt auf
  PERFORM set_config('request.jwt.claims', json_build_object('sub', s, 'role','authenticated')::text, true);
  FOREACH fn IN ARRAY ARRAY['create_post','update_post','delete_post','restore_post','create_reply','update_reply','delete_reply','restore_reply','toggle_helpful','set_solution','report','set_hidden','resolve_reports','mark_read','mark_overview_visited'] LOOP
    v_code := NULL;
    BEGIN
      CASE fn
        WHEN 'create_post' THEN PERFORM forum_create_post('tipp','Azubi-Titel','Azubi-Text lang genug', NULL, NULL);
        WHEN 'update_post' THEN PERFORM forum_update_post(p,'tipp','Azubi-Titel','Azubi-Text lang genug', NULL, NULL);
        WHEN 'delete_post' THEN PERFORM forum_delete_post(p);
        WHEN 'restore_post' THEN PERFORM forum_restore_post(p);
        WHEN 'create_reply' THEN PERFORM forum_create_reply(p,'Azubi-Antwort');
        WHEN 'update_reply' THEN PERFORM forum_update_reply(r,'Azubi-Antwort');
        WHEN 'delete_reply' THEN PERFORM forum_delete_reply(r);
        WHEN 'restore_reply' THEN PERFORM forum_restore_reply(r);
        WHEN 'toggle_helpful' THEN PERFORM forum_toggle_helpful('post', p);
        WHEN 'set_solution' THEN PERFORM forum_set_solution(p, r);
        WHEN 'report' THEN PERFORM forum_report('post', p, 'unpassend', NULL);
        WHEN 'set_hidden' THEN PERFORM forum_set_hidden('post', p, true);
        WHEN 'resolve_reports' THEN PERFORM forum_resolve_reports('post', p, 'hide');
        WHEN 'mark_read' THEN PERFORM forum_mark_read(p);
        WHEN 'mark_overview_visited' THEN PERFORM forum_mark_overview_visited();
      END CASE;
    EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
    res := res || CASE WHEN v_code='FRM03' THEN 'ok   ' ELSE 'FAIL ' END || 'Azubi: forum_' || fn || ' gesperrt (' || coalesce(v_code,'KEIN FEHLER') || E')\n';
  END LOOP;
  SELECT count(*) INTO n FROM forum_list_posts();
  res := res || CASE WHEN n=0 THEN 'ok   ' ELSE 'FAIL ' END || 'Azubi: Liste leer (' || n || E')\n';
  res := res || CASE WHEN forum_get_thread(p) IS NULL THEN 'ok   ' ELSE 'FAIL ' END || E'Azubi: Beitrag nicht abrufbar\n';
  SELECT count(*) INTO n FROM forum_replies;
  res := res || CASE WHEN n=0 THEN 'ok   ' ELSE 'FAIL ' END || 'Azubi: Antworten-Tabelle leer (' || n || E')\n';

  -- B. Namens-Abfrage über fremde Kennungen
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c, 'role','authenticated')::text, true);
  nm := forum_author_name(s);
  res := res || CASE WHEN nm IS NULL OR nm = 'Lehrkraft' THEN 'ok   ' ELSE 'FUND ' END || 'Lehrkraft fragt Azubi-Namen ab: ' || coalesce(nm,'NULL') || E'\n';

  -- C. anon
  RESET ROLE; SET LOCAL ROLE anon;
  v_code := NULL; BEGIN PERFORM count(*) FROM forum_posts; EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='42501' THEN 'ok   ' ELSE 'FAIL ' END || 'anon: Tabelle gesperrt (' || coalesce(v_code,'KEIN FEHLER') || E')\n';
  v_code := NULL; BEGIN PERFORM forum_list_posts(); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='42501' THEN 'ok   ' ELSE 'FAIL ' END || 'anon: Funktion gesperrt (' || coalesce(v_code,'KEIN FEHLER') || E')\n';
  RESET ROLE; SET LOCAL ROLE authenticated;

  -- D. Ausgeblendete Antwort
  PERFORM set_config('request.jwt.claims', json_build_object('sub', m, 'role','authenticated')::text, true);
  PERFORM forum_set_hidden('reply', r, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role','authenticated')::text, true);
  res := res || CASE WHEN (SELECT reply_count FROM forum_posts WHERE id=p)=0 THEN 'ok   ' ELSE 'FAIL ' END || E'Ausgeblendete Antwort zählt nicht mit\n';
  v_code := NULL; BEGIN PERFORM forum_toggle_helpful('reply', r); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='FRM02' THEN 'ok   ' ELSE 'FAIL ' END || 'Hilfreich auf ausgeblendete Antwort gesperrt (' || coalesce(v_code,'KEIN FEHLER') || E')\n';
  v_code := NULL; BEGIN PERFORM forum_set_solution(p, r); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='FRM02' THEN 'ok   ' ELSE 'FAIL ' END || 'Lösung auf ausgeblendete Antwort gesperrt (' || coalesce(v_code,'KEIN FEHLER') || E')\n';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c, 'role','authenticated')::text, true);
  res := res || CASE WHEN jsonb_array_length(forum_get_thread(p)->'replies')=1 THEN 'ok   ' ELSE 'FAIL ' END || E'Autorin sieht ihre ausgeblendete Antwort weiter\n';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role','authenticated')::text, true);
  res := res || CASE WHEN jsonb_array_length(forum_get_thread(p)->'replies')=0 THEN 'ok   ' ELSE 'FAIL ' END || E'Dritte sehen die ausgeblendete Antwort nicht\n';

  -- E. Rollenverlust: C wird Azubi
  RESET ROLE;
  UPDATE profiles SET role='student' WHERE id=c;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', c, 'role','authenticated')::text, true);
  v_code := NULL; BEGIN PERFORM forum_create_reply(p,'Ich habe keine Rolle mehr'); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='FRM03' THEN 'ok   ' ELSE 'FAIL ' END || E'Rollenverlust: Schreiben sofort gesperrt\n';
  SELECT count(*) INTO n FROM forum_posts;
  res := res || CASE WHEN n=0 THEN 'ok   ' ELSE 'FAIL ' END || E'Rollenverlust: Lesen sofort gesperrt\n';

  -- F. Eingabe-Grenzen und Suche
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role','authenticated')::text, true);
  v_code := NULL; BEGIN PERFORM forum_create_post('tipp','     a     ','Text der lang genug ist', NULL, NULL); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='FRM04' THEN 'ok   ' ELSE 'FAIL ' END || E'Titel nur aus Leerzeichen abgelehnt\n';
  v_code := NULL; BEGIN PERFORM forum_create_post('tipp','Titel ok genug', repeat('x',5001), NULL, NULL); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='FRM04' THEN 'ok   ' ELSE 'FAIL ' END || E'Text über 5000 Zeichen abgelehnt\n';
  v_code := NULL; BEGIN PERFORM forum_create_post('geheim','Titel ok genug','Text der lang genug ist', NULL, NULL); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='FRM04' THEN 'ok   ' ELSE 'FAIL ' END || E'Unbekannte Kategorie abgelehnt\n';
  v_code := NULL; BEGIN PERFORM count(*) FROM forum_list_posts(p_query => E'''; DROP TABLE forum_posts; -- "" & | ! ( ) :*'); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code IS NULL THEN 'ok   ' ELSE 'FAIL ' END || 'Such-Eingabe mit Sonderzeichen ohne Fehler (' || coalesce(v_code,'-') || E')\n';
  v_code := NULL; BEGIN PERFORM forum_list_posts(p_limit => 100000, p_offset => -5, p_sort => 'x; drop'); EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code IS NULL THEN 'ok   ' ELSE 'FAIL ' END || E'Extreme Limits/Offset/Sortierung ohne Fehler\n';

  -- G. Flut-Schutz Antworten (30/Std.)
  v_code := NULL; n := 0;
  BEGIN
    FOR i IN 1..35 LOOP PERFORM forum_create_reply(p, 'Flut-Antwort Nummer '||i); n := n+1; END LOOP;
  EXCEPTION WHEN OTHERS THEN v_code := SQLSTATE; END;
  res := res || CASE WHEN v_code='FRM01' AND n=30 THEN 'ok   ' ELSE 'FAIL ' END || 'Antworten-Flut-Schutz nach 30 (' || n || ', ' || coalesce(v_code,'kein Fehler') || E')\n';

  RESET ROLE;
  RAISE EXCEPTION E'QA-ERGEBNIS (alles zurückgerollt)\n%', res;
END
$t$;
