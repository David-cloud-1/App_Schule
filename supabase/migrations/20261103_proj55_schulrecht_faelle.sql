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
