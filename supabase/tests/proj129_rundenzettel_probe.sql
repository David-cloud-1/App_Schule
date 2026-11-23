-- Probe zu 20261128_proj129_rundenzettel.sql – NACH der Migration im SQL-Editor ausführen.
-- Sie ändert nichts dauerhaft und endet ABSICHTLICH mit einem Fehler „PROBE-ERGEBNIS“.
-- Nur der Text hinter „PROBE-ERGEBNIS“ zählt.
DO $$
DECLARE
  rls boolean;
  richtlinien int;
  anon_liest boolean;
  auth_liest boolean;
  auth_schreibt boolean;
  spalten_antworten int;
  spalten_runden int;
  bestand_klassisch boolean;
  pruefung_greift boolean := false;
  statistik_neu boolean;
BEGIN
  SELECT relrowsecurity INTO rls FROM pg_class WHERE oid = 'public.quiz_rounds'::regclass;
  SELECT count(*) INTO richtlinien FROM pg_policies WHERE tablename = 'quiz_rounds';
  SELECT has_table_privilege('anon', 'public.quiz_rounds', 'SELECT') INTO anon_liest;
  SELECT has_table_privilege('authenticated', 'public.quiz_rounds', 'SELECT') INTO auth_liest;
  SELECT has_table_privilege('authenticated', 'public.quiz_rounds', 'INSERT') INTO auth_schreibt;

  SELECT count(*) INTO spalten_antworten FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'quiz_answers' AND column_name IN ('presentation', 'mistakes');
  SELECT count(*) INTO spalten_runden FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'quiz_sessions'
     AND column_name IN ('coins_earned', 'joker_cost', 'wager_stake', 'wager_won');

  SELECT NOT EXISTS (SELECT 1 FROM quiz_answers WHERE presentation <> 'classic') INTO bestand_klassisch;

  BEGIN
    UPDATE quiz_answers SET presentation = 'quatsch' WHERE id = (SELECT id FROM quiz_answers LIMIT 1);
  EXCEPTION WHEN check_violation THEN pruefung_greift := true;
  END;

  SELECT position('PROJ-129' IN pg_get_functiondef('public.question_difficulty_stats(uuid[],integer,integer,uuid)'::regprocedure)) > 0
    INTO statistik_neu;

  RAISE EXCEPTION 'PROBE-ERGEBNIS: rls_an=% (soll true), richtlinien=% (soll 0), anon_liest=% (soll false), angemeldet_liest=% (soll false), angemeldet_schreibt=% (soll false), antwort_spalten=% (soll 2), runden_spalten=% (soll 4), bestand_klassisch=% (soll true), pruefung_greift=% (soll true), statistik_neu=% (soll true)',
    rls, richtlinien, anon_liest, auth_liest, auth_schreibt, spalten_antworten, spalten_runden, bestand_klassisch, pruefung_greift, statistik_neu;
END $$;
