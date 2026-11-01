-- PROJ-53 Paket 2 Probe: Migration + Tests für Anpassen und Moderation in EINEM Lauf.
-- Voraussetzung: Die Migration von Paket 1 (20261101_proj53_regal.sql) ist schon angewendet.
-- Im Supabase-SQL-Editor ausführen (Projekt riqafwijurbxvywzlipx). Das Skript endet
-- absichtlich mit einem Fehler („PROBE-ERGEBNIS“): Damit wird ALLES zurückgerollt,
-- auch die Migration. Es bleibt nichts in der Datenbank.
-- Jede Zeile nennt den Test und, in Klammern, was erwartet wird. Zeilen mit „FAIL“ sind Fehler.
-- Danach die echte Migration (supabase/migrations/20261102_proj53_paket2.sql) einmal ausführen.

-- PROJ-53 (Paket 2 „Anpassen & Moderation“).
--
--  • Kopie aus dem Regal („Anpassen“): drei neue Felder an werkzeug_ablaeufe —
--    herkunft_name (Name der Urheberin oder des Urhebers; heißt „stammt aus dem
--    Regal, kein Skript“), herkunft_am und auszug_am (der Bilder-Auszug liegt im
--    Speicher). Gesetzt werden sie nur vom Server (service_role), nie von einem
--    Browser-Schlüssel (Trigger). Bestehende Regeln der Tabelle bleiben unberührt.
--  • regal_liste liefert zusätzlich „anpassbar“ (Rückgabe ändert sich, daher DROP + CREATE).
--  • regal_anpassen_quelle: gibt dem Server, was eine Kopie braucht — nur wenn die
--    Anfragende das Material im Regal sehen darf (gleiche Prüfung wie überall).
--  • Moderation durch den Super-Admin: Liste, Entnehmen (mit Grund), Wieder zulassen.
--    Super-Admin = is_admin(). Das Material selbst bleibt unangetastet.
--
-- Rückweg: 20261102_proj53_paket2_down.sql

-- ── 1. Felder und Schutz ───────────────────────────────────────────────────

ALTER TABLE public.werkzeug_ablaeufe
  ADD COLUMN IF NOT EXISTS herkunft_name text
    CHECK (herkunft_name IS NULL OR char_length(herkunft_name) BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS herkunft_am timestamptz,
  ADD COLUMN IF NOT EXISTS auszug_am timestamptz;

CREATE OR REPLACE FUNCTION public.werkzeug_ablaeufe_herkunft_schutz()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Herkunft und Auszug-Vermerk setzt nur der Server, nie ein angemeldeter Browser-Schlüssel
  IF TG_OP = 'UPDATE' AND auth.role() = 'authenticated' THEN
    NEW.herkunft_name := OLD.herkunft_name;
    NEW.herkunft_am := OLD.herkunft_am;
    NEW.auszug_am := OLD.auszug_am;
  END IF;
  IF TG_OP = 'INSERT' AND auth.role() = 'authenticated' THEN
    NEW.herkunft_name := NULL;
    NEW.herkunft_am := NULL;
    NEW.auszug_am := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS werkzeug_ablaeufe_herkunft_schutz ON public.werkzeug_ablaeufe;
CREATE TRIGGER werkzeug_ablaeufe_herkunft_schutz
  BEFORE INSERT OR UPDATE ON public.werkzeug_ablaeufe
  FOR EACH ROW EXECUTE FUNCTION public.werkzeug_ablaeufe_herkunft_schutz();

-- ── 2. Regal-Liste mit „anpassbar“ ─────────────────────────────────────────

DROP FUNCTION IF EXISTS public.regal_liste(text, uuid, text, text, integer, integer);

CREATE FUNCTION public.regal_liste(
  p_suche    text,
  p_fach     uuid,
  p_werkzeug text,
  p_sort     text,
  p_limit    integer,
  p_offset   integer
)
RETURNS TABLE (
  freigabe_id      uuid,
  titel            text,
  werkzeug         text,
  format           text,
  fach_id          uuid,
  fach_name        text,
  notiz            text,
  besitzer_name    text,
  von_mir          boolean,
  mit_mir_geteilt  boolean,
  hat_datei        boolean,
  anpassbar        boolean,
  geladen          bigint,
  geteilt_am       timestamptz,
  gesamt           bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_muster text := NULL;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_teacher_role() THEN
    RETURN;
  END IF;
  IF p_suche IS NOT NULL AND btrim(p_suche) <> '' THEN
    v_muster := '%' || replace(replace(replace(btrim(left(p_suche, 100)), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  WITH sichtbar AS (
    SELECT
      f.id AS fid,
      coalesce(nullif(btrim(a.titel), ''), nullif(btrim(a.ergebnis->>'titel'), ''), 'Material') AS t,
      a.werkzeug AS w,
      a.ergebnis->>'format' AS fmt,
      f.fach_id AS fid_fach,
      s.name AS fname,
      f.notiz AS n,
      coalesce(nullif(btrim(pr.display_name), ''), 'Lehrkraft') AS bname,
      (f.owner_id = auth.uid()) AS ichbins,
      (f.stufe = 'ausgewaehlte' AND f.owner_id <> auth.uid()) AS persoenlich,
      (a.ergebnis IS NOT NULL AND a.ergebnis->'texte'->0 IS NULL) AS datei,
      -- Anpassen geht nur mit Antwort, Prüfbericht und Bilder-Auszug, und nie am eigenen Material
      (f.owner_id <> auth.uid() AND a.antwort IS NOT NULL AND a.pruefung IS NOT NULL AND a.auszug_am IS NOT NULL) AS anp,
      (SELECT count(*) FROM regal_downloads d WHERE d.freigabe_id = f.id) AS anzahl,
      f.geteilt_am AS am
    FROM regal_freigaben f
    JOIN werkzeug_ablaeufe a ON a.id = f.ablauf_id
    JOIN profiles pr ON pr.id = f.owner_id
    LEFT JOIN subjects s ON s.id = f.fach_id
    WHERE a.status = 'fertig'
      AND public.regal_darf_sehen(f.id)
      AND (p_fach IS NULL OR f.fach_id = p_fach)
      AND (p_werkzeug IS NULL OR p_werkzeug = '' OR a.werkzeug = p_werkzeug)
      AND (
        v_muster IS NULL
        OR coalesce(a.titel, a.ergebnis->>'titel', '') ILIKE v_muster ESCAPE '\'
        OR coalesce(f.notiz, '') ILIKE v_muster ESCAPE '\'
      )
  )
  SELECT sv.fid, sv.t, sv.w, sv.fmt, sv.fid_fach, sv.fname, sv.n, sv.bname, sv.ichbins, sv.persoenlich,
         sv.datei, sv.anp, sv.anzahl, sv.am, count(*) OVER ()
  FROM sichtbar sv
  ORDER BY
    CASE WHEN p_sort = 'geladen' THEN sv.anzahl END DESC NULLS LAST,
    sv.am DESC,
    sv.fid
  LIMIT least(greatest(coalesce(p_limit, 30), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

-- ── 3. Anpassen: Quelle für den Server ─────────────────────────────────────
-- Nur, wenn die Anfragende das Material im Regal sehen darf. Gibt die Antwort
-- mit heraus (Entscheidung 1: Die KI-Antwort ist der Inhalt des fertigen
-- Materials), nie Skript, Prompt oder Einlesung. Eigenes Material: von_mir = true.

CREATE OR REPLACE FUNCTION public.regal_anpassen_quelle(p_freigabe_id uuid)
RETURNS TABLE (
  ablauf_id     uuid,
  owner_id      uuid,
  titel         text,
  werkzeug      text,
  antwort       text,
  einstellungen jsonb,
  pruefung      jsonb,
  ergebnis      jsonb,
  besitzer_name text,
  von_mir       boolean,
  auszug_am     timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.regal_darf_sehen(p_freigabe_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT a.id, a.owner_id,
           coalesce(nullif(btrim(a.titel), ''), nullif(btrim(a.ergebnis->>'titel'), ''), 'Material'),
           a.werkzeug, a.antwort, a.einstellungen, a.pruefung, a.ergebnis,
           coalesce(nullif(btrim(pr.display_name), ''), 'Lehrkraft'),
           (a.owner_id = auth.uid()),
           a.auszug_am
    FROM regal_freigaben f
    JOIN werkzeug_ablaeufe a ON a.id = f.ablauf_id
    JOIN profiles pr ON pr.id = f.owner_id
    WHERE f.id = p_freigabe_id AND a.status = 'fertig';
END;
$$;

-- ── 4. Moderation (nur Super-Admin) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.regal_moderation_liste(p_limit integer, p_offset integer)
RETURNS TABLE (
  freigabe_id     uuid,
  titel           text,
  werkzeug        text,
  besitzer_name   text,
  stufe           text,
  geladen         bigint,
  geteilt_am      timestamptz,
  entnommen_am    timestamptz,
  entnommen_grund text,
  gesamt          bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT f.id,
           coalesce(nullif(btrim(a.titel), ''), nullif(btrim(a.ergebnis->>'titel'), ''), 'Material'),
           a.werkzeug,
           coalesce(nullif(btrim(pr.display_name), ''), 'Lehrkraft'),
           f.stufe,
           (SELECT count(*) FROM regal_downloads d WHERE d.freigabe_id = f.id),
           f.geteilt_am, f.entnommen_am, f.entnommen_grund,
           count(*) OVER ()
    FROM regal_freigaben f
    JOIN werkzeug_ablaeufe a ON a.id = f.ablauf_id
    JOIN profiles pr ON pr.id = f.owner_id
    ORDER BY (f.entnommen_am IS NOT NULL), f.geteilt_am DESC, f.id
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 100)
    OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

-- Aus dem Regal nehmen: verlangt einen kurzen Grund; das Material bleibt unangetastet
CREATE OR REPLACE FUNCTION public.regal_entnehmen(p_freigabe_id uuid, p_grund text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grund text := btrim(coalesce(p_grund, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nicht erlaubt.' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_grund) < 3 THEN
    RAISE EXCEPTION 'Bitte nenne kurz den Grund (mindestens 3 Zeichen).' USING ERRCODE = 'P0001';
  END IF;
  IF char_length(v_grund) > 300 THEN
    RAISE EXCEPTION 'Der Grund ist zu lang (höchstens 300 Zeichen).' USING ERRCODE = 'P0001';
  END IF;
  IF v_grund ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]' THEN
    RAISE EXCEPTION 'Der Grund enthält ungültige Zeichen.' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM regal_freigaben WHERE id = p_freigabe_id) THEN
    RAISE EXCEPTION 'Diese Freigabe gibt es nicht mehr.' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM regal_freigaben WHERE id = p_freigabe_id AND entnommen_am IS NOT NULL) THEN
    RAISE EXCEPTION 'Dieses Material wurde schon aus dem Regal genommen.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE regal_freigaben
     SET entnommen_am = now(), entnommen_von = auth.uid(), entnommen_grund = v_grund, updated_at = now()
   WHERE id = p_freigabe_id;
END;
$$;

-- Wieder zulassen: löscht die gesperrte Freigabe; die Besitzerin oder der Besitzer kann neu teilen
CREATE OR REPLACE FUNCTION public.regal_wieder_zulassen(p_freigabe_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nicht erlaubt.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM regal_freigaben WHERE id = p_freigabe_id AND entnommen_am IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Diese Freigabe ist nicht gesperrt oder gibt es nicht mehr.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- ── 5. Rechte ──────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.regal_liste(text, uuid, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_anpassen_quelle(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_moderation_liste(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_entnehmen(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_wieder_zulassen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regal_liste(text, uuid, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_anpassen_quelle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_moderation_liste(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_entnehmen(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_wieder_zulassen(uuid) TO authenticated;


CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  d_sped uuid := '11bcbe19-61fc-41ca-9580-1b485297c091';
  d_tour uuid := 'b9364045-e0ac-4f79-b1e4-c4b5cde84224';
  v_owner uuid; v_kollege uuid; v_fremd uuid; v_azubi uuid; v_admin uuid;
  v_abl uuid; v_abl2 uuid; v_fg uuid; v_fg2 uuid; v_n int; v_b boolean; v_t text; r text := '';
  v_herk text; v_anp boolean;
BEGIN
  SELECT id INTO v_owner FROM profiles WHERE role='department_admin' AND department_id=d_sped ORDER BY id LIMIT 1;
  SELECT id INTO v_kollege FROM profiles WHERE role='department_admin' AND department_id=d_sped AND id<>v_owner ORDER BY id LIMIT 1;
  SELECT id INTO v_fremd FROM profiles WHERE role='department_admin' AND department_id=d_tour ORDER BY id LIMIT 1;
  SELECT id INTO v_azubi FROM profiles WHERE role='student' ORDER BY id LIMIT 1;
  SELECT id INTO v_admin FROM profiles WHERE role='admin' LIMIT 1;
  r := r || format('Personen: owner=%s kollege=%s fremd=%s azubi=%s admin=%s (alle true)' || E'\n', v_owner IS NOT NULL, v_kollege IS NOT NULL, v_fremd IS NOT NULL, v_azubi IS NOT NULL, v_admin IS NOT NULL);

  -- Material mit Antwort, Prüfbericht und Bilder-Auszug; ein zweites ohne Auszug
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis, antwort, pruefung, auszug_am)
  VALUES (v_owner, 'skript', 'fertig', 5, '{"titel":"Probe","dateiname":"a.h5p","format":"h5p"}'::jsonb, 'cover: {title: Probe}', '{"lesbar":true,"befunde":[]}'::jsonb, now()) RETURNING id INTO v_abl;
  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis, antwort, pruefung)
  VALUES (v_owner, 'skript', 'fertig', 5, '{"titel":"Ohne Auszug","dateiname":"b.h5p","format":"h5p"}'::jsonb, 'cover: {title: B}', '{"lesbar":true,"befunde":[]}'::jsonb) RETURNING id INTO v_abl2;

  PERFORM pg_temp.als(v_owner);
  v_fg := regal_freigabe_setzen(v_abl, 'alle', NULL, NULL, '{}', '{}');
  v_fg2 := regal_freigabe_setzen(v_abl2, 'alle', NULL, NULL, '{}', '{}');

  -- T1 regal_liste: anpassbar
  PERFORM pg_temp.als(v_kollege);
  SELECT anpassbar INTO v_anp FROM regal_liste('', NULL, NULL, 'neueste', 30, 0) WHERE freigabe_id = v_fg;
  r := r || format('T1 Kollege: Material mit Auszug anpassbar: %s (true)' || E'\n', v_anp);
  SELECT anpassbar INTO v_anp FROM regal_liste('', NULL, NULL, 'neueste', 30, 0) WHERE freigabe_id = v_fg2;
  r := r || format('T1 Kollege: Material ohne Auszug anpassbar: %s (false)' || E'\n', v_anp);
  PERFORM pg_temp.als(v_owner);
  SELECT anpassbar INTO v_anp FROM regal_liste('', NULL, NULL, 'neueste', 30, 0) WHERE freigabe_id = v_fg;
  r := r || format('T1 Besitzer: eigenes Material anpassbar: %s (false)' || E'\n', v_anp);

  -- T2 regal_anpassen_quelle
  PERFORM pg_temp.als(v_kollege);
  SELECT count(*) INTO v_n FROM regal_anpassen_quelle(v_fg);
  r := r || format('T2 Kollege bekommt Quelle: %s (1)' || E'\n', v_n);
  SELECT antwort, von_mir INTO v_t, v_b FROM regal_anpassen_quelle(v_fg);
  r := r || format('T2 Antwort geht mit: %s (cover: {title: Probe}), von_mir: %s (false)' || E'\n', v_t, v_b);
  PERFORM pg_temp.als(v_owner);
  SELECT von_mir INTO v_b FROM regal_anpassen_quelle(v_fg);
  r := r || format('T2 Besitzer: von_mir %s (true)' || E'\n', v_b);
  PERFORM pg_temp.als(v_azubi);
  SELECT count(*) INTO v_n FROM regal_anpassen_quelle(v_fg);
  r := r || format('T2 Azubi bekommt Quelle: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_owner);
  PERFORM regal_freigabe_setzen(v_abl, 'ausgewaehlte', NULL, NULL, '{}', ARRAY[v_kollege]);
  PERFORM pg_temp.als(v_fremd);
  SELECT count(*) INTO v_n FROM regal_anpassen_quelle(v_fg);
  r := r || format('T2 Nicht ausgewählte Lehrkraft bekommt Quelle: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_kollege);
  SELECT count(*) INTO v_n FROM regal_anpassen_quelle(v_fg);
  r := r || format('T2 Ausgewählter Kollege bekommt Quelle: %s (1)' || E'\n', v_n);

  -- T3 Schutz der Herkunft
  PERFORM pg_temp.als(v_kollege);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, herkunft_name, auszug_am) VALUES (v_kollege, 'skript', 'laeuft', 'Gefälscht', now());
    SELECT herkunft_name, (auszug_am IS NULL)::text INTO v_herk, v_t FROM werkzeug_ablaeufe WHERE owner_id = v_kollege AND werkzeug = 'skript' LIMIT 1;
    r := r || format('T3 Browser-Schlüssel setzt Herkunft beim Anlegen: %s, Auszug leer: %s (NULL, true)' || E'\n', coalesce(v_herk, 'NULL'), v_t);
    UPDATE werkzeug_ablaeufe SET herkunft_name = 'Gefälscht', auszug_am = now() WHERE owner_id = v_kollege AND werkzeug = 'skript';
    SELECT herkunft_name, (auszug_am IS NULL)::text INTO v_herk, v_t FROM werkzeug_ablaeufe WHERE owner_id = v_kollege AND werkzeug = 'skript' LIMIT 1;
    r := r || format('T3 Browser-Schlüssel ändert Herkunft nachträglich: %s, Auszug leer: %s (NULL, true)' || E'\n', coalesce(v_herk, 'NULL'), v_t);
  EXCEPTION WHEN OTHERS THEN r := r || format('T3 Fehler: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  UPDATE werkzeug_ablaeufe SET herkunft_name = 'Frau Meier', herkunft_am = now() WHERE owner_id = v_kollege AND werkzeug = 'skript';
  SELECT herkunft_name INTO v_herk FROM werkzeug_ablaeufe WHERE owner_id = v_kollege AND werkzeug = 'skript' LIMIT 1;
  r := r || format('T3 Server (ohne Browser-Schlüssel) setzt Herkunft: %s (Frau Meier)' || E'\n', v_herk);

  -- T4 Moderation: Liste
  PERFORM pg_temp.als(v_admin);
  SELECT count(*) INTO v_n FROM regal_moderation_liste(50, 0);
  r := r || format('T4 Super-Admin sieht Freigaben: %s (2)' || E'\n', v_n);
  PERFORM pg_temp.als(v_owner);
  SELECT count(*) INTO v_n FROM regal_moderation_liste(50, 0);
  r := r || format('T4 Bereichs-Admin sieht Moderationsliste: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_azubi);
  SELECT count(*) INTO v_n FROM regal_moderation_liste(50, 0);
  r := r || format('T4 Azubi sieht Moderationsliste: %s (0)' || E'\n', v_n);

  -- T5 Entnehmen
  PERFORM pg_temp.als(v_owner);
  BEGIN PERFORM regal_entnehmen(v_fg, 'Urheberrecht'); r := r || 'T5a FAIL: Bereichs-Admin darf entnehmen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5a ok, Bereichs-Admin abgelehnt: %s' || E'\n', SQLERRM); END;
  PERFORM pg_temp.als(v_azubi);
  BEGIN PERFORM regal_entnehmen(v_fg, 'Urheberrecht'); r := r || 'T5b FAIL: Azubi darf entnehmen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5b ok, Azubi abgelehnt: %s' || E'\n', SQLERRM); END;
  PERFORM pg_temp.als(v_admin);
  BEGIN PERFORM regal_entnehmen(v_fg, 'ab'); r := r || 'T5c FAIL: kurzer Grund erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5c ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_entnehmen(v_fg, 'a' || chr(7) || 'bc'); r := r || 'T5d FAIL: Steuerzeichen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5d ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_entnehmen(gen_random_uuid(), 'Urheberrecht'); r := r || 'T5e FAIL: unbekannte Freigabe' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5e ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  PERFORM regal_entnehmen(v_fg, 'Urheberrecht des Verlags');
  SELECT entnommen_von = v_admin, entnommen_grund INTO v_b, v_t FROM regal_freigaben WHERE id = v_fg;
  r := r || format('T5f entnommen von Super-Admin: %s (true), Grund: %s (Urheberrecht des Verlags)' || E'\n', v_b, v_t);
  BEGIN PERFORM regal_entnehmen(v_fg, 'Nochmal'); r := r || 'T5g FAIL: doppelt entnommen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5g ok, doppelt abgelehnt: %s' || E'\n', SQLERRM); END;
  SELECT count(*) INTO v_n FROM werkzeug_ablaeufe WHERE id = v_abl;
  r := r || format('T5h Material selbst bleibt unangetastet: %s (1)' || E'\n', v_n);

  -- T6 Wirkung der Entnahme
  PERFORM pg_temp.als(v_kollege);
  r := r || format('T6 nach Entnahme sieht Kollege: %s (false)' || E'\n', regal_darf_sehen(v_fg));
  SELECT count(*) INTO v_n FROM regal_anpassen_quelle(v_fg);
  r := r || format('T6 nach Entnahme: Quelle zum Anpassen: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_owner);
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'alle', NULL, NULL, '{}', '{}'); r := r || 'T6 FAIL: erneut teilen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T6 ok, erneutes Teilen gesperrt: %s' || E'\n', SQLERRM); END;
  PERFORM pg_temp.als(v_admin);
  SELECT count(*) INTO v_n FROM regal_moderation_liste(50, 0) WHERE entnommen_am IS NOT NULL;
  r := r || format('T6 Moderationsliste zeigt Entnommene: %s (1)' || E'\n', v_n);

  -- T7 Wieder zulassen
  PERFORM pg_temp.als(v_owner);
  BEGIN PERFORM regal_wieder_zulassen(v_fg); r := r || 'T7a FAIL: Bereichs-Admin darf zulassen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T7a ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  PERFORM pg_temp.als(v_admin);
  BEGIN PERFORM regal_wieder_zulassen(v_fg2); r := r || 'T7b FAIL: nicht gesperrte Freigabe gelöscht' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T7b ok, nicht gesperrte bleibt: %s' || E'\n', SQLERRM); END;
  PERFORM regal_wieder_zulassen(v_fg);
  SELECT count(*) INTO v_n FROM regal_freigaben WHERE id = v_fg;
  r := r || format('T7c gesperrte Freigabe nach Zulassen: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_owner);
  PERFORM regal_freigabe_setzen(v_abl, 'alle', NULL, NULL, '{}', '{}');
  r := r || 'T7d ok, Besitzer kann nach Zulassen neu teilen' || E'\n';

  -- T8 Rechte auf den Funktionen
  SET LOCAL ROLE anon;
  BEGIN PERFORM regal_moderation_liste(50, 0); r := r || 'T8 FAIL: anon Moderationsliste' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8 ok, anon abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_anpassen_quelle(v_fg); r := r || 'T8 FAIL: anon Quelle' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8 ok, anon Quelle abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  PERFORM pg_temp.als(v_admin);
  SET LOCAL ROLE authenticated;
  BEGIN SELECT count(*) INTO v_n FROM regal_moderation_liste(50, 0); r := r || format('T8 ok, Funktion als angemeldeter Super-Admin ausführbar: %s' || E'\n', v_n);
  EXCEPTION WHEN OTHERS THEN r := r || format('T8 FAIL: %s' || E'\n', SQLERRM); END;
  RESET ROLE;

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
