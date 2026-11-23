-- PROJ-122: Checklisten zu den Handlungsleitlinien – Durchläufe und Haken
--
-- Der INHALT der Checklisten (Schritte, Varianten, Texte) steht fest in der App.
-- Hier liegen nur die privaten Daten der Lehrkraft:
--
--   checklisten_durchlaeufe  eine Runde einer Liste (wem, welche Liste, welche Variante,
--                            seit wann, archiviert am – leer = offener Durchlauf)
--   checklisten_haken        ein erledigter Schritt eines Durchlaufs
--
-- Entscheidungen (Spezifikation PROJ-122):
--  • Haken sind PRIVAT: Zeilenregeln nur auf das eigene Konto. Es gibt keine Ausnahme
--    für Admins – auch der Super-Admin sieht fremde Haken nicht (E1).
--  • Pro Person und Liste höchstens EIN offener Durchlauf (teilweiser Unique-Index).
--    „Neu starten“ archiviert den offenen und legt in einem Zug einen neuen an (E2).
--    Es wird nichts gelöscht.
--  • Ein Haken ist eine Zeile. Die App schickt den GEWÜNSCHTEN Zustand („erledigt“ /
--    „nicht erledigt“), nie „umschalten“ – Doppelklick und zwei Geräte schaden nicht.
--  • „Fertig“ wird nicht gespeichert, sondern aus Haken und Variante berechnet.
--  • Keine Freitexte, keine Daten über Dritte. Konto löschen (PROJ-60) löscht alles
--    über ON DELETE CASCADE.
--  • Haken in archivierten Durchläufen sind nur lesbar.
--
-- Schreiben läuft über die vier Funktionen unten (SECURITY INVOKER: die Zeilenregeln
-- gelten also auch dort). Die Schritt-Kennungen prüft die App; die Datenbank begrenzt
-- Form (Muster) und Menge (höchstens 200 Haken je Durchlauf).
--
-- Fehlercodes der Funktionen (App-Schnittstellen übersetzen sie):
--   CHK01  ungültige Eingabe (400)
--   CHK02  zu viele Haken in einem Durchlauf (409)
--
-- Rückweg: 20261125_proj122_checklisten_down.sql

CREATE TABLE IF NOT EXISTS public.checklisten_durchlaeufe (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkliste    text NOT NULL CHECK (checkliste ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  variante      text CHECK (variante IS NULL OR variante ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  gestartet_am  timestamptz NOT NULL DEFAULT now(),
  archiviert_am timestamptz
);

-- höchstens ein offener Durchlauf je Person und Liste
CREATE UNIQUE INDEX IF NOT EXISTS checklisten_durchlaeufe_offen_idx
  ON public.checklisten_durchlaeufe (owner_id, checkliste)
  WHERE archiviert_am IS NULL;
-- „Frühere Durchläufe“ einer Liste, neueste zuerst
CREATE INDEX IF NOT EXISTS checklisten_durchlaeufe_owner_idx
  ON public.checklisten_durchlaeufe (owner_id, checkliste, gestartet_am DESC);

CREATE TABLE IF NOT EXISTS public.checklisten_haken (
  durchlauf_id uuid NOT NULL REFERENCES public.checklisten_durchlaeufe(id) ON DELETE CASCADE,
  schritt      text NOT NULL CHECK (schritt ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  erledigt_am  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (durchlauf_id, schritt)
);

ALTER TABLE public.checklisten_durchlaeufe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklisten_haken ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checklisten_durchlaeufe FROM anon;
REVOKE ALL ON public.checklisten_haken FROM anon;

-- ── Durchläufe: nur die eigenen, nur mit Lehrer-Rolle ─────────────────────────
CREATE POLICY "checklisten_durchlaeufe: eigene lesen" ON public.checklisten_durchlaeufe
  FOR SELECT USING (owner_id = auth.uid() AND public.has_teacher_role());
CREATE POLICY "checklisten_durchlaeufe: eigene anlegen" ON public.checklisten_durchlaeufe
  FOR INSERT WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role() AND archiviert_am IS NULL);
-- Ändern darf man nur einen OFFENEN Durchlauf (Variante setzen, archivieren).
CREATE POLICY "checklisten_durchlaeufe: eigene offene ändern" ON public.checklisten_durchlaeufe
  FOR UPDATE USING (owner_id = auth.uid() AND public.has_teacher_role() AND archiviert_am IS NULL)
  WITH CHECK (owner_id = auth.uid() AND public.has_teacher_role());
-- Kein Löschen über die Nutzer-Sitzung: archiviert wird nur (E2). Das Aufräumen beim
-- Konto-Löschen übernimmt ON DELETE CASCADE.

-- ── Haken: nur im eigenen Durchlauf; Schreiben nur, solange er offen ist ───────
CREATE POLICY "checklisten_haken: eigene lesen" ON public.checklisten_haken
  FOR SELECT USING (
    public.has_teacher_role() AND EXISTS (
      SELECT 1 FROM public.checklisten_durchlaeufe d
       WHERE d.id = durchlauf_id AND d.owner_id = auth.uid()));
CREATE POLICY "checklisten_haken: im offenen Durchlauf setzen" ON public.checklisten_haken
  FOR INSERT WITH CHECK (
    public.has_teacher_role() AND EXISTS (
      SELECT 1 FROM public.checklisten_durchlaeufe d
       WHERE d.id = durchlauf_id AND d.owner_id = auth.uid() AND d.archiviert_am IS NULL));
CREATE POLICY "checklisten_haken: im offenen Durchlauf entfernen" ON public.checklisten_haken
  FOR DELETE USING (
    public.has_teacher_role() AND EXISTS (
      SELECT 1 FROM public.checklisten_durchlaeufe d
       WHERE d.id = durchlauf_id AND d.owner_id = auth.uid() AND d.archiviert_am IS NULL));
-- Kein UPDATE-Recht: ein Haken wird gesetzt oder entfernt, nie geändert.

GRANT SELECT, INSERT, UPDATE ON public.checklisten_durchlaeufe TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.checklisten_haken TO authenticated;

-- ── Hilfsfunktion: offenen Durchlauf holen oder anlegen ────────────────────────
-- Sperrt je Person und Liste, damit zwei gleichzeitige Aufrufe (zwei Geräte,
-- Doppelklick) nie zwei offene Durchläufe erzeugen.
CREATE OR REPLACE FUNCTION public.checkliste_offener_durchlauf(p_checkliste text, p_variante text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_checkliste IS NULL OR p_checkliste !~ '^[a-z0-9][a-z0-9-]{0,59}$' THEN
    RAISE EXCEPTION 'Diese Checkliste gibt es nicht.' USING ERRCODE = 'CHK01';
  END IF;
  IF p_variante IS NOT NULL AND p_variante !~ '^[a-z0-9][a-z0-9-]{0,39}$' THEN
    RAISE EXCEPTION 'Diese Auswahl gibt es nicht.' USING ERRCODE = 'CHK01';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_checkliste, 0));

  SELECT id INTO v_id FROM checklisten_durchlaeufe
   WHERE owner_id = auth.uid() AND checkliste = p_checkliste AND archiviert_am IS NULL;
  IF v_id IS NULL THEN
    INSERT INTO checklisten_durchlaeufe (owner_id, checkliste, variante)
    VALUES (auth.uid(), p_checkliste, p_variante)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- ── Haken setzen oder entfernen (gewünschter Zustand, idempotent) ──────────────
CREATE OR REPLACE FUNCTION public.checkliste_haken_setzen(
  p_checkliste text, p_schritt text, p_erledigt boolean, p_variante text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_anzahl int;
BEGIN
  IF p_schritt IS NULL OR p_schritt !~ '^[a-z0-9][a-z0-9-]{0,59}$' OR p_erledigt IS NULL THEN
    RAISE EXCEPTION 'Dieser Schritt ist ungültig.' USING ERRCODE = 'CHK01';
  END IF;

  v_id := checkliste_offener_durchlauf(p_checkliste, p_variante);

  IF p_erledigt THEN
    SELECT count(*) INTO v_anzahl FROM checklisten_haken WHERE durchlauf_id = v_id;
    IF v_anzahl >= 200 AND NOT EXISTS (
         SELECT 1 FROM checklisten_haken WHERE durchlauf_id = v_id AND schritt = p_schritt) THEN
      RAISE EXCEPTION 'In diesem Durchlauf sind zu viele Schritte abgehakt.' USING ERRCODE = 'CHK02';
    END IF;
    INSERT INTO checklisten_haken (durchlauf_id, schritt) VALUES (v_id, p_schritt)
    ON CONFLICT (durchlauf_id, schritt) DO NOTHING;
  ELSE
    DELETE FROM checklisten_haken WHERE durchlauf_id = v_id AND schritt = p_schritt;
  END IF;
  RETURN v_id;
END;
$$;

-- ── Variante des offenen Durchlaufs setzen (NULL = keine Auswahl) ──────────────
-- Haken von Schritten, die in der neuen Variante entfallen, bleiben gespeichert.
CREATE OR REPLACE FUNCTION public.checkliste_variante_setzen(p_checkliste text, p_variante text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  v_id := checkliste_offener_durchlauf(p_checkliste, p_variante);
  UPDATE checklisten_durchlaeufe SET variante = p_variante WHERE id = v_id;
  RETURN v_id;
END;
$$;

-- ── Neu starten: offenen Durchlauf archivieren, neuen anlegen – in einem Zug ────
CREATE OR REPLACE FUNCTION public.checkliste_neu_starten(p_checkliste text, p_variante text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_checkliste IS NULL OR p_checkliste !~ '^[a-z0-9][a-z0-9-]{0,59}$' THEN
    RAISE EXCEPTION 'Diese Checkliste gibt es nicht.' USING ERRCODE = 'CHK01';
  END IF;
  IF p_variante IS NOT NULL AND p_variante !~ '^[a-z0-9][a-z0-9-]{0,39}$' THEN
    RAISE EXCEPTION 'Diese Auswahl gibt es nicht.' USING ERRCODE = 'CHK01';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_checkliste, 0));

  UPDATE checklisten_durchlaeufe SET archiviert_am = now()
   WHERE owner_id = auth.uid() AND checkliste = p_checkliste AND archiviert_am IS NULL;

  INSERT INTO checklisten_durchlaeufe (owner_id, checkliste, variante)
  VALUES (auth.uid(), p_checkliste, p_variante)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Nur angemeldete Nutzer dürfen die Funktionen aufrufen (nicht anon, nicht PUBLIC).
REVOKE ALL ON FUNCTION public.checkliste_offener_durchlauf(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkliste_haken_setzen(text, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkliste_variante_setzen(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkliste_neu_starten(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkliste_offener_durchlauf(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkliste_haken_setzen(text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkliste_variante_setzen(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkliste_neu_starten(text, text) TO authenticated;

COMMENT ON TABLE public.checklisten_durchlaeufe IS
  'PROJ-122: Eine Runde einer Checkliste. Privat je Konto; archiviert_am leer = offen (höchstens einer je Person und Liste).';
COMMENT ON TABLE public.checklisten_haken IS
  'PROJ-122: Erledigter Schritt eines Durchlaufs. Keine Freitexte. Schreiben nur im offenen Durchlauf.';
