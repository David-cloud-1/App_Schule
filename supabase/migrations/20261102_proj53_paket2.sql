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
