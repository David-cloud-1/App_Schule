-- PROJ-51: Werkzeugkiste in der Lern-App — ein Ablauf je begonnener Erstellung
--
-- Eine Zeile pro Ablauf (Skript hochgeladen → Einstellungen → Prompt → Antwort
-- → fertige Datei). Die Dateien selbst liegen im privaten Speicherbereich
-- „werkzeugkiste“ unter <owner_id>/<ablauf_id>/ und werden nur vom Server
-- (Service-Schlüssel) und über kurzlebige Adressen angefasst.
--
-- PROJ-52 baut „Meine Materialien“ auf genau dieser Tabelle auf (fertige
-- Abläufe laufen dann nicht mehr ab).

CREATE TABLE IF NOT EXISTS public.werkzeug_ablaeufe (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  werkzeug       text NOT NULL CHECK (char_length(werkzeug) BETWEEN 1 AND 40),
  status         text NOT NULL DEFAULT 'laeuft' CHECK (status IN ('laeuft', 'fertig')),
  -- weitester erreichter Schritt
  schritt        smallint NOT NULL DEFAULT 1 CHECK (schritt BETWEEN 1 AND 5),
  datei_name     text CHECK (datei_name IS NULL OR char_length(datei_name) <= 255),
  datei_groesse  bigint CHECK (datei_groesse IS NULL OR datei_groesse BETWEEN 0 AND 52428800),
  datei_typ      text,
  -- {seiten, loesungen, bilder, tabellen}; NULL = noch nicht eingelesen
  kennzahlen     jsonb,
  -- Word-Überschriften [{nr, titel}]
  gliederung     jsonb NOT NULL DEFAULT '[]'::jsonb,
  auswahl        jsonb NOT NULL DEFAULT '{"seiten": "", "abschnitte": []}'::jsonb,
  -- {format, niveau, bildungsgang, lernfeld, umfang}
  einstellungen  jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt         text,
  antwort        text CHECK (antwort IS NULL OR char_length(antwort) <= 2000000),
  pruefung       jsonb,
  -- {titel, dateiname, format, kapitel, aufgaben}
  ergebnis       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- 7 Tage nach der letzten Bearbeitung; danach räumt der tägliche Zeitplan auf
  laeuft_ab_am   timestamptz NOT NULL DEFAULT now() + interval '7 days'
);

CREATE INDEX IF NOT EXISTS werkzeug_ablaeufe_owner_idx ON public.werkzeug_ablaeufe (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS werkzeug_ablaeufe_ablauf_idx ON public.werkzeug_ablaeufe (laeuft_ab_am);

ALTER TABLE public.werkzeug_ablaeufe ENABLE ROW LEVEL SECURITY;

-- Jede Lehrer-Rolle sieht und ändert nur ihre eigenen Abläufe — auch der
-- Super-Admin sieht fremde Abläufe nicht (sie enthalten fremde Skripte).
-- Wer die Lehrer-Rolle verliert, kommt sofort nicht mehr an seine Abläufe.
CREATE POLICY "werkzeug_ablaeufe: eigene lesen" ON public.werkzeug_ablaeufe
  FOR SELECT USING (owner_id = auth.uid() AND public.has_teacher_role());
CREATE POLICY "werkzeug_ablaeufe: eigene anlegen" ON public.werkzeug_ablaeufe
  FOR INSERT WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role());
CREATE POLICY "werkzeug_ablaeufe: eigene ändern" ON public.werkzeug_ablaeufe
  FOR UPDATE USING (owner_id = auth.uid() AND public.has_teacher_role())
  WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role());
CREATE POLICY "werkzeug_ablaeufe: eigene löschen" ON public.werkzeug_ablaeufe
  FOR DELETE USING (owner_id = auth.uid() AND public.has_teacher_role());

-- Privater Speicherbereich. Bewusst OHNE Policies für angemeldete Nutzer:
-- Kein Browser-Schlüssel kommt an die Dateien; Hochladen und Herunterladen
-- laufen ausschließlich über kurzlebige Adressen, die der Server erst nach
-- der Rollen- und Besitzprüfung ausstellt.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('werkzeugkiste', 'werkzeugkiste', false, 52428800)
ON CONFLICT (id) DO NOTHING;
