-- PROJ-67: Öffentlicher Link („Link für alle“) für fertige Interaktive Seiten.
--
-- Die Tabelle werkzeug_ablaeufe und die Regal-Regeln (regal_darf_sehen) bleiben
-- UNVERÄNDERT. Der öffentliche Link ist ein eigener, zweiter Weg mit eigener
-- Tabelle:
--
--  • Ein Link = ein langer Zufallscode (mindestens 128 Bit), der zu genau einem
--    fertigen Material gehört. Höchstens ein AKTIVER Link je Material
--    (teilweiser Eindeutigkeits-Index, deshalb auch bei zwei gleichzeitigen
--    Klicks nur einer).
--  • Angemeldete Nutzer dürfen nur ihre eigenen Zeilen LESEN. Erzeugen und
--    Abschalten laufen über Funktionen (Besitzer-Prüfung, Format-Sperre).
--  • Die öffentliche Auslieferung ruft link_nachschlagen / link_aufruf_zaehlen
--    ausschließlich mit dem Service-Schlüssel des Servers (EXECUTE nur für
--    service_role). anon und authenticated können sie NICHT aufrufen.
--  • Es werden keine Besucherdaten gespeichert, nur Zähler und letzter Aufruf.
--  • Verliert die Besitzerin oder der Besitzer die Lehrer-Rolle, schaltet ein
--    Trigger alle Links ab (und link_nachschlagen prüft die Rolle zusätzlich).
--
-- Rückweg: 20261104_proj67_oeffentlicher_link_down.sql

-- ── 1. Tabelle ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.werkzeug_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE CHECK (code ~ '^[0-9a-f]{48}$'),
  -- Verschwindet mit dem Material (Löschen) und mit dem Konto
  ablauf_id       uuid NOT NULL REFERENCES public.werkzeug_ablaeufe(id) ON DELETE CASCADE,
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  erzeugt_am      timestamptz NOT NULL DEFAULT now(),
  abgeschaltet_am timestamptz,
  abgeschaltet_von uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aufrufe         bigint NOT NULL DEFAULT 0 CHECK (aufrufe >= 0),
  letzter_aufruf  timestamptz
);

-- Höchstens ein aktiver Link je Material
CREATE UNIQUE INDEX IF NOT EXISTS werkzeug_links_ein_aktiver_idx
  ON public.werkzeug_links (ablauf_id) WHERE abgeschaltet_am IS NULL;
CREATE INDEX IF NOT EXISTS werkzeug_links_owner_idx ON public.werkzeug_links (owner_id);
CREATE INDEX IF NOT EXISTS werkzeug_links_aktiv_idx
  ON public.werkzeug_links (erzeugt_am DESC) WHERE abgeschaltet_am IS NULL;

-- ── 2. Zugriffsregeln (RLS) ───────────────────────────────────────────────
-- Direkt nur: eigene Zeilen lesen. Alles Weitere über die Funktionen unten.

ALTER TABLE public.werkzeug_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.werkzeug_links FROM anon, authenticated;
GRANT SELECT ON public.werkzeug_links TO authenticated;

DROP POLICY IF EXISTS "werkzeug_links: eigene lesen" ON public.werkzeug_links;
CREATE POLICY "werkzeug_links: eigene lesen" ON public.werkzeug_links
  FOR SELECT USING (owner_id = auth.uid() AND public.has_teacher_role());

-- ── 3. Funktionen für die Besitzerin / den Besitzer ───────────────────────

-- Aktueller Link eines eigenen Materials (NULL = kein aktiver Link)
CREATE OR REPLACE FUNCTION public.link_lesen(p_ablauf_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  l werkzeug_links%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_teacher_role() THEN
    RETURN NULL;
  END IF;
  SELECT * INTO l FROM werkzeug_links
   WHERE ablauf_id = p_ablauf_id AND owner_id = auth.uid() AND abgeschaltet_am IS NULL;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'code', l.code, 'erzeugtAm', l.erzeugt_am, 'aufrufe', l.aufrufe, 'letzterAufruf', l.letzter_aufruf);
END;
$$;

-- Link erzeugen. Gibt es schon einen aktiven, kommt dieser zurück (kein zweiter).
-- Die Sperre „nur fertige Interaktive Seite“ liegt hier, nicht nur in der Oberfläche.
CREATE OR REPLACE FUNCTION public.link_erzeugen(p_ablauf_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_teacher_role() THEN
    RAISE EXCEPTION 'Nicht erlaubt.' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM werkzeug_ablaeufe
   WHERE id = p_ablauf_id AND owner_id = v_uid AND status = 'fertig' AND ergebnis IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieses Material gibt es nicht mehr oder es ist noch nicht fertig.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM werkzeug_ablaeufe
   WHERE id = p_ablauf_id
     AND ergebnis->>'format' = 'seite'
     AND lower(coalesce(ergebnis->>'dateiname', '')) LIKE '%.html';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Einen Link für alle gibt es nur bei der Interaktiven Seite.' USING ERRCODE = 'P0001';
  END IF;

  -- 48 Hexzeichen aus zwei Zufalls-UUIDs (über 180 Bit Zufall)
  v_code := left(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 48);

  INSERT INTO werkzeug_links (code, ablauf_id, owner_id)
  VALUES (v_code, p_ablauf_id, v_uid)
  ON CONFLICT (ablauf_id) WHERE abgeschaltet_am IS NULL DO NOTHING;

  RETURN public.link_lesen(p_ablauf_id);
END;
$$;

-- Eigenen Link abschalten (wirkt sofort; der Code bleibt für immer tot)
CREATE OR REPLACE FUNCTION public.link_abschalten(p_ablauf_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_teacher_role() THEN
    RAISE EXCEPTION 'Nicht erlaubt.' USING ERRCODE = '42501';
  END IF;
  UPDATE werkzeug_links
     SET abgeschaltet_am = now(), abgeschaltet_von = auth.uid()
   WHERE ablauf_id = p_ablauf_id AND owner_id = auth.uid() AND abgeschaltet_am IS NULL;
END;
$$;

-- ── 4. Super-Admin: alle aktiven Links sehen und abschalten ───────────────

CREATE OR REPLACE FUNCTION public.link_admin_liste(p_limit integer, p_offset integer)
RETURNS TABLE (
  link_id        uuid,
  titel          text,
  werkzeug       text,
  besitzer_name  text,
  erzeugt_am     timestamptz,
  aufrufe        bigint,
  letzter_aufruf timestamptz,
  gesamt         bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT l.id,
           coalesce(nullif(btrim(a.titel), ''), nullif(btrim(a.ergebnis->>'titel'), ''), 'Material'),
           a.werkzeug,
           coalesce(nullif(btrim(pr.display_name), ''), 'Lehrkraft'),
           l.erzeugt_am, l.aufrufe, l.letzter_aufruf,
           count(*) OVER ()
    FROM werkzeug_links l
    JOIN werkzeug_ablaeufe a ON a.id = l.ablauf_id
    JOIN profiles pr ON pr.id = l.owner_id
    WHERE l.abgeschaltet_am IS NULL
    ORDER BY l.erzeugt_am DESC, l.id
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 100)
    OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.link_admin_abschalten(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nicht erlaubt.' USING ERRCODE = '42501';
  END IF;
  UPDATE werkzeug_links
     SET abgeschaltet_am = now(), abgeschaltet_von = auth.uid()
   WHERE id = p_link_id AND abgeschaltet_am IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieser Link ist schon abgeschaltet oder gibt es nicht.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- ── 5. Öffentliche Auslieferung (nur Service-Schlüssel) ───────────────────

-- Gilt der Code? Gibt nur zurück, was der Server für den Dateizugriff braucht.
-- Keine Zeile = nicht aktiv (der Server antwortet in jedem Fall gleich mit 404).
-- Rolle der Besitzerin/des Besitzers wird zusätzlich geprüft (Rollenentzug).
CREATE OR REPLACE FUNCTION public.link_nachschlagen(p_code text)
RETURNS TABLE (ablauf_id uuid, owner_id uuid, titel text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.owner_id,
         coalesce(nullif(btrim(a.titel), ''), nullif(btrim(a.ergebnis->>'titel'), ''), 'Material')
  FROM werkzeug_links l
  JOIN werkzeug_ablaeufe a ON a.id = l.ablauf_id
  JOIN profiles o ON o.id = l.owner_id
  WHERE l.code = p_code
    AND l.abgeschaltet_am IS NULL
    AND p_code ~ '^[0-9a-f]{48}$'
    AND o.role IN ('teacher', 'department_admin', 'admin')
    AND a.ergebnis IS NOT NULL
    AND a.ergebnis->>'format' = 'seite'
    AND lower(coalesce(a.ergebnis->>'dateiname', '')) LIKE '%.html'
$$;

-- Zählt einen erfolgreichen Aufruf (nur Zähler und Zeitpunkt, keine Besucherdaten)
CREATE OR REPLACE FUNCTION public.link_aufruf_zaehlen(p_code text)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE werkzeug_links
     SET aufrufe = aufrufe + 1, letzter_aufruf = now()
   WHERE code = p_code AND abgeschaltet_am IS NULL
$$;

-- ── 6. Rollenentzug schaltet alle Links der Person ab ─────────────────────

CREATE OR REPLACE FUNCTION public.werkzeug_links_rollenentzug()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE werkzeug_links
     SET abgeschaltet_am = now()
   WHERE owner_id = NEW.id AND abgeschaltet_am IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS werkzeug_links_rollenentzug ON public.profiles;
CREATE TRIGGER werkzeug_links_rollenentzug
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role::text IN ('teacher', 'department_admin', 'admin')
        AND NEW.role::text NOT IN ('teacher', 'department_admin', 'admin'))
  EXECUTE FUNCTION public.werkzeug_links_rollenentzug();

-- ── 7. Rechte ──────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.link_lesen(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_erzeugen(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_abschalten(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_admin_liste(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_admin_abschalten(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_nachschlagen(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_aufruf_zaehlen(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.werkzeug_links_rollenentzug() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_lesen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_erzeugen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_abschalten(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_admin_liste(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_admin_abschalten(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_nachschlagen(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_aufruf_zaehlen(text) TO service_role;
