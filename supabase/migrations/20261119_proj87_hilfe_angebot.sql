-- PROJ-87 (Teil 1): „Assistent Schritt für Schritt“ — gemerktes Angebot.
--
-- Je Lehrkraft und Werkzeug höchstens eine Zeile: Hat die Lehrkraft das Angebot
-- „Neu hier? Ich führe dich durch.“ mit „Ja, bitte“ oder „Nein, danke“
-- beantwortet? Gespeichert wird nichts außer Konto, Werkzeug, Antwort und Zeit
-- (keine Inhalte). Die Zeilen verschwinden mit dem Konto (PROJ-60).

CREATE TABLE IF NOT EXISTS public.werkzeug_hilfe_angebot (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  werkzeug text NOT NULL CHECK (char_length(werkzeug) BETWEEN 1 AND 40),
  antwort text NOT NULL CHECK (antwort IN ('ja', 'nein')),
  beantwortet_am timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, werkzeug)
);

ALTER TABLE public.werkzeug_hilfe_angebot ENABLE ROW LEVEL SECURITY;

-- Nur die Lehrkraft selbst sieht und ändert ihre Zeilen (auch der Super-Admin
-- sieht fremde nicht). Wer die Lehrer-Rolle verliert, kommt nicht mehr heran.
CREATE POLICY "werkzeug_hilfe_angebot: eigene lesen" ON public.werkzeug_hilfe_angebot
  FOR SELECT USING (owner_id = auth.uid() AND public.has_teacher_role());
CREATE POLICY "werkzeug_hilfe_angebot: eigene anlegen" ON public.werkzeug_hilfe_angebot
  FOR INSERT WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role());
CREATE POLICY "werkzeug_hilfe_angebot: eigene ändern" ON public.werkzeug_hilfe_angebot
  FOR UPDATE USING (owner_id = auth.uid() AND public.has_teacher_role())
  WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role());
-- Kein Löschen durch den Browser-Schlüssel: Die Antwort wird nur überschrieben.

-- Supabase vergibt auf neue Tabellen automatisch alle Rechte; erst alles entziehen
REVOKE ALL ON public.werkzeug_hilfe_angebot FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.werkzeug_hilfe_angebot TO authenticated;
