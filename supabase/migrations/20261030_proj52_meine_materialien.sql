-- PROJ-52 (Paket 1 „Ablage“): „Meine Materialien“ baut auf werkzeug_ablaeufe auf.
--
-- Ein Material ist ein fertiger Ablauf (status = 'fertig'), ein Entwurf ein
-- eingelesener, noch nicht fertiger (status = 'laeuft'). Es gibt keine zweite
-- Tabelle. Die Zugriffsregeln (RLS) aus PROJ-51 bleiben unverändert.
--
--  • Fertige Materialien laufen nie ab: laeuft_ab_am darf leer sein und wird
--    für status = 'fertig' per Trigger geleert, egal welcher Code schreibt.
--  • Titel (von der Lehrkraft änderbar), Uhr für die 12-Monats-Aufbewahrung
--    des Skripts, Speichergröße und „hat Antwort“ für die Liste.
--  • Die Zähler (Speichergröße, Skript-Zeitpunkte) darf nur der Server setzen,
--    nicht der Browser-Schlüssel einer Lehrkraft (sonst ließe sich die
--    2-GB-Grenze umgehen).

ALTER TABLE public.werkzeug_ablaeufe
  ADD COLUMN IF NOT EXISTS titel text
    CHECK (titel IS NULL OR char_length(titel) BETWEEN 1 AND 120),
  -- Von hier läuft die 12-Monats-Uhr; bei einer Kopie („anderes Werkzeug“) bleibt der Ursprung
  ADD COLUMN IF NOT EXISTS skript_hochgeladen_am timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS skript_entfernt_am timestamptz,
  -- Summe der Dateien im Speicher (Skript, Einlesung, Ausgabe, Vorschau)
  ADD COLUMN IF NOT EXISTS speicher_bytes bigint NOT NULL DEFAULT 0
    CHECK (speicher_bytes >= 0);

-- Für die Liste: gibt es eine gespeicherte KI-Antwort? (ohne die Antwort selbst zu laden)
ALTER TABLE public.werkzeug_ablaeufe
  ADD COLUMN IF NOT EXISTS hat_antwort boolean GENERATED ALWAYS AS (antwort IS NOT NULL) STORED;

-- Bestehende Zeilen: Uhr ab Anlage; Titel aus dem Ergebnis
UPDATE public.werkzeug_ablaeufe SET skript_hochgeladen_am = created_at;
UPDATE public.werkzeug_ablaeufe
   SET titel = left(btrim(ergebnis->>'titel'), 120)
 WHERE titel IS NULL AND ergebnis IS NOT NULL AND btrim(coalesce(ergebnis->>'titel', '')) <> '';

-- Fertige Materialien haben keinen Ablauftermin mehr
ALTER TABLE public.werkzeug_ablaeufe ALTER COLUMN laeuft_ab_am DROP NOT NULL;
UPDATE public.werkzeug_ablaeufe SET laeuft_ab_am = NULL WHERE status = 'fertig';

CREATE OR REPLACE FUNCTION public.werkzeug_ablaeufe_regeln()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Material verfällt nie; nur Entwürfe behalten ihren Termin
  IF NEW.status = 'fertig' THEN
    NEW.laeuft_ab_am := NULL;
  END IF;

  -- Zähler und Aufbewahrungs-Zeitpunkte setzt nur der Server (service_role),
  -- nie ein angemeldeter Browser-Schlüssel
  IF TG_OP = 'UPDATE' AND auth.role() = 'authenticated' THEN
    NEW.speicher_bytes := OLD.speicher_bytes;
    NEW.skript_hochgeladen_am := OLD.skript_hochgeladen_am;
    NEW.skript_entfernt_am := OLD.skript_entfernt_am;
  END IF;
  IF TG_OP = 'INSERT' AND auth.role() = 'authenticated' THEN
    NEW.speicher_bytes := 0;
    NEW.skript_hochgeladen_am := now();
    NEW.skript_entfernt_am := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS werkzeug_ablaeufe_regeln ON public.werkzeug_ablaeufe;
CREATE TRIGGER werkzeug_ablaeufe_regeln
  BEFORE INSERT OR UPDATE ON public.werkzeug_ablaeufe
  FOR EACH ROW EXECUTE FUNCTION public.werkzeug_ablaeufe_regeln();

-- Verbrauch der angemeldeten Lehrkraft (RLS: zählt nur eigene Zeilen)
CREATE OR REPLACE FUNCTION public.wk_speicher_genutzt()
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(sum(speicher_bytes), 0)::bigint FROM public.werkzeug_ablaeufe;
$$;
REVOKE ALL ON FUNCTION public.wk_speicher_genutzt() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wk_speicher_genutzt() TO authenticated;

-- Liste: Entwürfe zuerst, dann zuletzt bearbeitet (Abfrage immer pro Besitzerin/Besitzer)
CREATE INDEX IF NOT EXISTS werkzeug_ablaeufe_liste_idx
  ON public.werkzeug_ablaeufe (owner_id, status DESC, updated_at DESC);

-- 12-Monats-Aufräumen: nur fertige Materialien, deren Skript noch da ist
CREATE INDEX IF NOT EXISTS werkzeug_ablaeufe_skript_idx
  ON public.werkzeug_ablaeufe (skript_hochgeladen_am)
  WHERE skript_entfernt_am IS NULL AND status = 'fertig';
