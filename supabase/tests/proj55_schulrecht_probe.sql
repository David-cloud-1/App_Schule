-- PROJ-55 Probe: Migration + Rechtetests in EINEM Lauf.
-- Im Supabase-SQL-Editor ausführen (Projekt riqafwijurbxvywzlipx). Das Skript endet
-- absichtlich mit einem Fehler („PROBE-ERGEBNIS“): Damit wird ALLES zurückgerollt,
-- auch die Migration. Es bleibt nichts in der Datenbank. Nur die Zeilen unter
-- „PROBE-ERGEBNIS“ zählen; Zeilen mit „FAIL“ sind Fehler.
-- Danach die echte Migration (supabase/migrations/20261103_proj55_schulrecht_faelle.sql) einmal ausführen.
-- Ohne Migration-Teil (nur Tests, wenn sie schon angewendet ist): ab „CREATE FUNCTION pg_temp.als“.

-- PROJ-55: Schulrecht nachschlagen — Aktennotiz-Fälle (nur der Zwischenstand)
--
-- Das Nachschlagen speichert NICHTS. Nur wer eine Aktennotiz erstellt, legt
-- einen „Fall“ an: den BESTÄTIGTEN, anonymisierten Sachverhalt, Verweise auf
-- die Fundstellen (Kürzel + Nummer, nie der Wortlaut), den Prompt und die
-- eingefügte KI-Antwort. Die Word-Datei wird nie abgelegt.
--
--  • Eigene Tabelle, nicht werkzeug_ablaeufe: Dort würden Fälle in „Meine
--    Materialien“ auftauchen, 7 Tage statt 24 Stunden leben und teilbar sein.
--  • Ein Fall lebt 24 Stunden nach der letzten Bearbeitung. Danach ist er für
--    die Oberfläche sofort unsichtbar (Zeilenregel prüft laeuft_ab_am) und
--    wird stündlich per pg_cron gelöscht.
--  • Nur die Besitzerin oder der Besitzer sieht den Fall — auch der
--    Super-Admin nicht. Wer die Lehrer-Rolle verliert, kommt nicht mehr heran.
--
-- Rückweg: 20261103_proj55_schulrecht_faelle_down.sql

CREATE TABLE IF NOT EXISTS public.schulrecht_faelle (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- weitester erreichter Schritt: 1 Sachverhalt · 2 Prompt · 3 Aktennotiz
  schritt        smallint NOT NULL DEFAULT 1 CHECK (schritt BETWEEN 1 AND 3),
  -- bestätigter, ersetzter Text — nie der Originaltext
  sachverhalt    text NOT NULL CHECK (char_length(sachverhalt) BETWEEN 1 AND 5000),
  -- [{kuerzel, nr}], höchstens 30
  fundstellen    jsonb NOT NULL DEFAULT '[]'::jsonb
                 CHECK (jsonb_typeof(fundstellen) = 'array' AND jsonb_array_length(fundstellen) <= 30),
  -- Hat die Lehrkraft alle Anonymisierungsvorschläge abgelehnt und das ausdrücklich bestätigt?
  alle_abgelehnt boolean NOT NULL DEFAULT false,
  prompt         text CHECK (prompt IS NULL OR char_length(prompt) <= 200000),
  antwort        text CHECK (antwort IS NULL OR char_length(antwort) <= 60000),
  -- {lesbar, fehler, befunde: [{text}]}
  pruefung       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  laeuft_ab_am   timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE INDEX IF NOT EXISTS schulrecht_faelle_owner_idx ON public.schulrecht_faelle (owner_id);
CREATE INDEX IF NOT EXISTS schulrecht_faelle_ablauf_idx ON public.schulrecht_faelle (laeuft_ab_am);

ALTER TABLE public.schulrecht_faelle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schulrecht_faelle FROM anon;

CREATE POLICY "schulrecht_faelle: eigene lesen" ON public.schulrecht_faelle
  FOR SELECT USING (owner_id = auth.uid() AND public.has_teacher_role() AND laeuft_ab_am > now());
CREATE POLICY "schulrecht_faelle: eigene anlegen" ON public.schulrecht_faelle
  FOR INSERT WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role());
CREATE POLICY "schulrecht_faelle: eigene ändern" ON public.schulrecht_faelle
  FOR UPDATE USING (owner_id = auth.uid() AND public.has_teacher_role() AND laeuft_ab_am > now())
  WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role());
-- Löschen geht auch bei abgelaufenen eigenen Fällen (Aufräumen)
CREATE POLICY "schulrecht_faelle: eigene löschen" ON public.schulrecht_faelle
  FOR DELETE USING (owner_id = auth.uid() AND public.has_teacher_role());

-- Stündliches Aufräumen, damit „spätestens nach 24 Stunden“ auch physisch gilt.
-- Der Vercel-Zeitplan der App läuft nur täglich.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'schulrecht-faelle-aufraeumen';
    PERFORM cron.schedule('schulrecht-faelle-aufraeumen', '7 * * * *',
      'DELETE FROM public.schulrecht_faelle WHERE laeuft_ab_am < now()');
  END IF;
END $$;

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
