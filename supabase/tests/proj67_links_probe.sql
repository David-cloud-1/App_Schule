-- PROJ-67 Probe: Migration + Rechte-, Sperren- und Auslieferungstests in EINEM Lauf.
-- Im Supabase-SQL-Editor ausführen (Projekt riqafwijurbxvywzlipx). Das Skript endet
-- absichtlich mit einem Fehler („PROBE-ERGEBNIS“): Damit wird ALLES zurückgerollt,
-- auch die Migration. Es bleibt nichts in der Datenbank.
-- Jede Zeile nennt den Test und, in Klammern, was erwartet wird. Zeilen mit „FAIL“ sind Fehler.
-- Danach die echte Migration (supabase/migrations/20261104_proj67_oeffentlicher_link.sql) einmal ausführen.
-- Nur Tests (wenn die Migration schon angewendet ist): proj67_links_probe_nur_tests.sql

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

CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  d_sped uuid := '11bcbe19-61fc-41ca-9580-1b485297c091';
  v_owner uuid; v_kollege uuid; v_azubi uuid; v_admin uuid;
  v_abl uuid; v_abl_h5p uuid; v_abl_fremd uuid; v_j jsonb; v_j2 jsonb; v_code text; v_code0 text;
  v_n int; v_t text; v_id uuid; r text := '';
BEGIN
  SELECT id INTO v_owner FROM profiles WHERE role='department_admin' AND department_id=d_sped ORDER BY id LIMIT 1;
  SELECT id INTO v_kollege FROM profiles WHERE role='department_admin' AND department_id=d_sped AND id<>v_owner ORDER BY id LIMIT 1;
  SELECT id INTO v_azubi FROM profiles WHERE role='student' ORDER BY id LIMIT 1;
  SELECT id INTO v_admin FROM profiles WHERE role='admin' LIMIT 1;
  r := r || format('Personen: owner=%s kollege=%s azubi=%s admin=%s (alle true)' || E'\n', v_owner IS NOT NULL, v_kollege IS NOT NULL, v_azubi IS NOT NULL, v_admin IS NOT NULL);

  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis)
  VALUES (v_owner, 'skript', 'fertig', 5, '{"titel":"Probe Seite","dateiname":"a.html","format":"seite"}'::jsonb) RETURNING id INTO v_abl;
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis)
  VALUES (v_owner, 'skript', 'fertig', 5, '{"titel":"Probe H5P","dateiname":"a.h5p","format":"h5p"}'::jsonb) RETURNING id INTO v_abl_h5p;
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis)
  VALUES (v_kollege, 'skript', 'fertig', 5, '{"titel":"Fremd","dateiname":"f.html","format":"seite"}'::jsonb) RETURNING id INTO v_abl_fremd;

  -- T1 erzeugen, Lesen, Doppelklick
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  v_j := link_erzeugen(v_abl);
  v_code0 := v_j->>'code';
  r := r || format('T1 Link erzeugt, Code %s Zeichen (48), nur Hex: %s (true)' || E'\n', length(v_code0), v_code0 ~ '^[0-9a-f]{48}$');
  v_j2 := link_erzeugen(v_abl);
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl AND abgeschaltet_am IS NULL;
  r := r || format('T1 zweiter Aufruf liefert denselben Code: %s (true), aktive Links: %s (1)' || E'\n', v_j2->>'code' = v_code0, v_n);
  r := r || format('T1 link_lesen: %s (true)' || E'\n', link_lesen(v_abl)->>'code' = v_code0);

  -- T2 Format-Sperre und Besitz
  BEGIN PERFORM link_erzeugen(v_abl_h5p); r := r || 'T2a FAIL: H5P bekommt Link' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T2a ok, H5P abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM link_erzeugen(v_abl_fremd); r := r || 'T2b FAIL: fremdes Material' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T2b ok, fremdes Material abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE; PERFORM pg_temp.als(v_azubi); SET LOCAL ROLE authenticated;
  BEGIN PERFORM link_erzeugen(v_abl); r := r || 'T2c FAIL: Azubi erzeugt Link' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T2c ok, Azubi abgelehnt: %s' || E'\n', SQLERRM); END;
  SELECT count(*) INTO v_n FROM werkzeug_links;
  r := r || format('T2d Azubi sieht Zeilen in werkzeug_links: %s (0)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_kollege); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl;
  r := r || format('T2e Kollege sieht fremde Links: %s (0)' || E'\n', v_n);
  r := r || format('T2f Kollege link_lesen fremd: %s (NULL = true)' || E'\n', link_lesen(v_abl) IS NULL);
  PERFORM link_abschalten(v_abl);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl AND abgeschaltet_am IS NULL;
  r := r || format('T2g Kollege schaltet fremden Link ab: aktive danach %s (1)' || E'\n', v_n);

  -- T3 Auslieferung: nur Service-Schlüssel (so ruft der Server auf)
  RESET ROLE; SET LOCAL ROLE service_role;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code0);
  r := r || format('T3a nachschlagen (Server): %s Zeile (1)' || E'\n', v_n);
  SELECT titel INTO v_t FROM link_nachschlagen(v_code0);
  r := r || format('T3a Titel: %s (Probe Seite)' || E'\n', v_t);
  SELECT count(*) INTO v_n FROM link_nachschlagen('ABC');
  r := r || format('T3b ungültiger Code: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM link_nachschlagen(repeat('0', 48));
  r := r || format('T3b unbekannter Code: %s (0)' || E'\n', v_n);
  PERFORM link_aufruf_zaehlen(v_code0);
  PERFORM link_aufruf_zaehlen(v_code0);
  SELECT aufrufe INTO v_n FROM werkzeug_links WHERE code = v_code0;
  r := r || format('T3c Aufrufe nach 2x: %s (2)' || E'\n', v_n);
  RESET ROLE;
  BEGIN SET LOCAL ROLE anon; PERFORM * FROM link_nachschlagen(v_code0); r := r || 'T3d FAIL: anon darf nachschlagen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3d ok, anon abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  BEGIN SET LOCAL ROLE authenticated; PERFORM link_aufruf_zaehlen(v_code0); r := r || 'T3e FAIL: authenticated darf zählen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3e ok, authenticated abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  BEGIN SET LOCAL ROLE anon; PERFORM * FROM werkzeug_links; r := r || 'T3f FAIL: anon liest Tabelle' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T3f ok, anon liest Tabelle nicht: %s' || E'\n', SQLERRM); END;
  RESET ROLE;

  -- T4 Abschalten wirkt sofort, neuer Code
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  PERFORM link_abschalten(v_abl);
  RESET ROLE; SET LOCAL ROLE service_role;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code0);
  RESET ROLE;
  r := r || format('T4a nach Abschalten nachschlagen: %s (0)' || E'\n', v_n);
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  r := r || format('T4b link_lesen nach Abschalten: %s (NULL = true)' || E'\n', link_lesen(v_abl) IS NULL);
  v_j := link_erzeugen(v_abl);
  v_code := v_j->>'code';
  r := r || format('T4c neuer Link, anderer Code: %s (true)' || E'\n', v_code <> v_code0);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code0);
  r := r || format('T4d alter Code bleibt tot: %s (0)' || E'\n', v_n);

  -- T5 Super-Admin
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM link_admin_liste(50, 0) WHERE titel = 'Probe Seite';
  r := r || format('T5a Super-Admin sieht den Link: %s (1)' || E'\n', v_n);
  SELECT link_id INTO v_id FROM link_admin_liste(50, 0) WHERE titel = 'Probe Seite' LIMIT 1;
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM link_admin_liste(50, 0);
  r := r || format('T5b Lehrkraft sieht Admin-Liste: %s (0)' || E'\n', v_n);
  BEGIN PERFORM link_admin_abschalten(v_id); r := r || 'T5c FAIL: Lehrkraft schaltet per Admin-Weg ab' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5c ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE; PERFORM pg_temp.als(v_admin); SET LOCAL ROLE authenticated;
  PERFORM link_admin_abschalten(v_id);
  RESET ROLE;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T5d nach Admin-Abschaltung: %s (0)' || E'\n', v_n);

  -- T6 Rollenentzug (Trigger) und Prüfung beim Nachschlagen
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  v_code := link_erzeugen(v_abl)->>'code';
  RESET ROLE;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T6a vor Rollenentzug: %s (1)' || E'\n', v_n);
  UPDATE profiles SET role = 'student' WHERE id = v_owner;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T6b nach Rollenentzug nachschlagen: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE owner_id = v_owner AND abgeschaltet_am IS NULL;
  r := r || format('T6c Trigger hat abgeschaltet, aktive: %s (0)' || E'\n', v_n);
  UPDATE profiles SET role = 'department_admin' WHERE id = v_owner;
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T6d Rolle zurück, Link bleibt aus: %s (0)' || E'\n', v_n);

  -- T7 Löschen des Materials entfernt den Link
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  v_code := link_erzeugen(v_abl)->>'code';
  RESET ROLE;
  DELETE FROM werkzeug_ablaeufe WHERE id = v_abl;
  SELECT count(*) INTO v_n FROM werkzeug_links WHERE ablauf_id = v_abl;
  r := r || format('T7a Zeilen nach Löschen des Materials: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM link_nachschlagen(v_code);
  r := r || format('T7b nachschlagen nach Löschen: %s (0)' || E'\n', v_n);

  -- T8 Datei-Sperre: Material ohne Ergebnis
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt)
  VALUES (v_owner, 'skript', 'laeuft', 2) RETURNING id INTO v_abl;
  RESET ROLE; PERFORM pg_temp.als(v_owner); SET LOCAL ROLE authenticated;
  BEGIN PERFORM link_erzeugen(v_abl); r := r || 'T8 FAIL: Entwurf bekommt Link' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8 ok, Entwurf abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
