-- PROJ-64: Werkzeugkiste – Direkt erstellen (bezahlte KI)
--
-- Ein „Lauf“ ist ein Klick auf „Direkt erstellen“. Lange Skripte gehen in
-- „Teilen“ an die KI; jeder Teil hält seinen genauen Verbrauch fest. Die Summe
-- steht im Lauf (Trigger) und bleibt für die Abrechnung erhalten, auch wenn
-- der Ablauf nach 7 Tagen gelöscht wird (PROJ-65/66).
--
-- Geschrieben wird ausschließlich vom Server (Service-Schlüssel). Aus dem
-- Browser lässt sich weder ein Lauf anlegen noch ein Betrag ändern.

-- ── Einstellungen (genau eine Zeile) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ki_einstellungen (
  id                  smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  modell              text NOT NULL DEFAULT 'claude-sonnet-5-5',
  -- Dollar je Million Bausteine: {modell: {ein, aus, cache_schreiben, cache_lesen}}
  preise              jsonb NOT NULL DEFAULT '{"claude-sonnet-5-5": {"ein": 2, "aus": 10, "cache_schreiben": 2.5, "cache_lesen": 0.1}}'::jsonb,
  usd_eur             numeric(8,4) NOT NULL DEFAULT 0.86 CHECK (usd_eur > 0),
  warnschwelle_eur    numeric(10,2) NOT NULL DEFAULT 5 CHECK (warnschwelle_eur >= 0),
  -- gesetzt, sobald der Anbieter „Guthaben zu niedrig“ meldet; leer = alles in Ordnung
  guthaben_leer_seit  timestamptz,
  -- letzter Probe-Lauf bei leerem Guthaben (höchstens einer pro Stunde)
  letzte_probe_am     timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ki_einstellungen (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ki_einstellungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ki_einstellungen: Super-Admin liest" ON public.ki_einstellungen
  FOR SELECT USING (public.is_admin());

-- ── Läufe ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ki_laeufe (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Konto gelöscht → Lauf bleibt für die Abrechnung („Gelöschtes Konto“)
  owner_id                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Entwurf nach 7 Tagen gelöscht → Lauf bleibt
  ablauf_id               uuid REFERENCES public.werkzeug_ablaeufe(id) ON DELETE SET NULL,
  werkzeug                text NOT NULL CHECK (char_length(werkzeug) BETWEEN 1 AND 40),
  datei_name              text CHECK (datei_name IS NULL OR char_length(datei_name) <= 255),
  zeichen                 integer NOT NULL DEFAULT 0 CHECK (zeichen >= 0),
  modell                  text NOT NULL,
  status                  text NOT NULL DEFAULT 'laeuft'
                          CHECK (status IN ('laeuft', 'baut', 'fertig', 'abgebrochen', 'fehlgeschlagen')),
  -- verständlicher Satz; art z. B. 'guthaben', 'ki', 'kern', 'zeit'
  fehler                  text,
  fehler_art              text,
  teile_gesamt            smallint NOT NULL DEFAULT 1 CHECK (teile_gesamt BETWEEN 1 AND 100),
  teile_fertig            smallint NOT NULL DEFAULT 0,
  abschluss_versuche      smallint NOT NULL DEFAULT 0,
  abschluss_gestartet_am  timestamptz,
  kosten_usd              numeric(12,6) NOT NULL DEFAULT 0,
  -- Kurs zum Zeitpunkt des Laufs: ein späterer Kurswechsel ändert alte Beträge nicht
  usd_eur                 numeric(8,4) NOT NULL,
  kosten_eur              numeric(12,6) NOT NULL DEFAULT 0,
  gestartet_am            timestamptz NOT NULL DEFAULT now(),
  beendet_am              timestamptz
);

CREATE INDEX IF NOT EXISTS ki_laeufe_owner_idx ON public.ki_laeufe (owner_id, gestartet_am DESC);
CREATE INDEX IF NOT EXISTS ki_laeufe_zeit_idx ON public.ki_laeufe (gestartet_am DESC);
CREATE INDEX IF NOT EXISTS ki_laeufe_ablauf_idx ON public.ki_laeufe (ablauf_id, gestartet_am DESC);
-- Je Ablauf höchstens ein aktiver Lauf: ein Doppelklick startet nichts Zweites
CREATE UNIQUE INDEX IF NOT EXISTS ki_laeufe_ein_aktiver_idx ON public.ki_laeufe (ablauf_id)
  WHERE status IN ('laeuft', 'baut');

ALTER TABLE public.ki_laeufe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ki_laeufe: eigene lesen, Super-Admin alle" ON public.ki_laeufe
  FOR SELECT USING ((owner_id = auth.uid() AND public.has_teacher_role()) OR public.is_admin());

-- ── Teile eines Laufs ────────────────────────────────────────────────────
-- Die Teil-Antworten liegen als Datei im privaten Speicher (nicht hier), damit
-- der Super-Admin Kosten sieht, aber keine fremden Inhalte.
CREATE TABLE IF NOT EXISTS public.ki_lauf_teile (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lauf_id                 uuid NOT NULL REFERENCES public.ki_laeufe(id) ON DELETE CASCADE,
  nr                      smallint NOT NULL CHECK (nr >= 1),
  -- {seiten, abschnitte} – eine gewöhnliche Auswahl
  auswahl                 jsonb NOT NULL,
  zeichen                 integer NOT NULL DEFAULT 0,
  status                  text NOT NULL DEFAULT 'wartet'
                          CHECK (status IN ('wartet', 'laeuft', 'fertig', 'fehlgeschlagen')),
  -- 'erstellen' = erste Antwort; 'nachbessern' = einmalige Nachbesserung nach der Prüfstelle
  phase                   text NOT NULL DEFAULT 'erstellen' CHECK (phase IN ('erstellen', 'nachbessern')),
  -- Aufrufe des Teil-Arbeiters (für Hänger: höchstens 4)
  versuche                smallint NOT NULL DEFAULT 0,
  gestartet_am            timestamptz,
  ein_tokens              integer NOT NULL DEFAULT 0,
  aus_tokens              integer NOT NULL DEFAULT 0,
  cache_schreiben_tokens  integer NOT NULL DEFAULT 0,
  cache_lesen_tokens      integer NOT NULL DEFAULT 0,
  ki_aufrufe              smallint NOT NULL DEFAULT 0,
  kosten_usd              numeric(12,6) NOT NULL DEFAULT 0,
  UNIQUE (lauf_id, nr)
);

ALTER TABLE public.ki_lauf_teile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ki_lauf_teile: über den Lauf" ON public.ki_lauf_teile
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.ki_laeufe l
    WHERE l.id = lauf_id AND ((l.owner_id = auth.uid() AND public.has_teacher_role()) OR public.is_admin())
  ));

-- ── Summen im Lauf aktuell halten ────────────────────────────────────────
-- Erst die Lauf-Zeile sperren, dann summieren: So sehen zwei gleichzeitig
-- fertig werdende Teile jeweils den Stand des anderen (READ COMMITTED nimmt
-- je Anweisung einen neuen Schnappschuss).
CREATE OR REPLACE FUNCTION public.ki_lauf_summen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  PERFORM 1 FROM ki_laeufe WHERE id = NEW.lauf_id FOR UPDATE;
  UPDATE ki_laeufe l SET
    kosten_usd   = s.kosten,
    kosten_eur   = s.kosten * l.usd_eur,
    teile_fertig = s.fertig
  FROM (
    SELECT COALESCE(sum(kosten_usd), 0) AS kosten, count(*) FILTER (WHERE status = 'fertig') AS fertig
    FROM ki_lauf_teile WHERE lauf_id = NEW.lauf_id
  ) s
  WHERE l.id = NEW.lauf_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ki_lauf_teile_summen ON public.ki_lauf_teile;
CREATE TRIGGER ki_lauf_teile_summen
  AFTER INSERT OR UPDATE OF kosten_usd, status ON public.ki_lauf_teile
  FOR EACH ROW EXECUTE FUNCTION public.ki_lauf_summen();

REVOKE EXECUTE ON FUNCTION public.ki_lauf_summen() FROM PUBLIC, anon, authenticated;

-- ── Gewählter Weg am Ablauf ──────────────────────────────────────────────
ALTER TABLE public.werkzeug_ablaeufe
  ADD COLUMN IF NOT EXISTS weg text CHECK (weg IS NULL OR weg IN ('direkt', 'kostenlos'));
