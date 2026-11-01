-- Rückweg für 20261102_proj53_paket2.sql (PROJ-53, Paket 2)
-- Kopien aus dem Regal bleiben als normale Materialien bestehen; sie verlieren nur den Herkunftsvermerk.

DROP FUNCTION IF EXISTS public.regal_wieder_zulassen(uuid);
DROP FUNCTION IF EXISTS public.regal_entnehmen(uuid, text);
DROP FUNCTION IF EXISTS public.regal_moderation_liste(integer, integer);
DROP FUNCTION IF EXISTS public.regal_anpassen_quelle(uuid);

-- regal_liste wieder in der Fassung von Paket 1 (ohne „anpassbar“)
DROP FUNCTION IF EXISTS public.regal_liste(text, uuid, text, text, integer, integer);
CREATE FUNCTION public.regal_liste(
  p_suche text, p_fach uuid, p_werkzeug text, p_sort text, p_limit integer, p_offset integer
)
RETURNS TABLE (
  freigabe_id uuid, titel text, werkzeug text, format text, fach_id uuid, fach_name text, notiz text,
  besitzer_name text, von_mir boolean, mit_mir_geteilt boolean, hat_datei boolean, geladen bigint,
  geteilt_am timestamptz, gesamt bigint
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
    SELECT f.id AS fid,
      coalesce(nullif(btrim(a.titel), ''), nullif(btrim(a.ergebnis->>'titel'), ''), 'Material') AS t,
      a.werkzeug AS w, a.ergebnis->>'format' AS fmt, f.fach_id AS fid_fach, s.name AS fname, f.notiz AS n,
      coalesce(nullif(btrim(pr.display_name), ''), 'Lehrkraft') AS bname,
      (f.owner_id = auth.uid()) AS ichbins,
      (f.stufe = 'ausgewaehlte' AND f.owner_id <> auth.uid()) AS persoenlich,
      (a.ergebnis IS NOT NULL AND a.ergebnis->'texte'->0 IS NULL) AS datei,
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
      AND (v_muster IS NULL
           OR coalesce(a.titel, a.ergebnis->>'titel', '') ILIKE v_muster ESCAPE '\'
           OR coalesce(f.notiz, '') ILIKE v_muster ESCAPE '\')
  )
  SELECT sv.fid, sv.t, sv.w, sv.fmt, sv.fid_fach, sv.fname, sv.n, sv.bname, sv.ichbins, sv.persoenlich,
         sv.datei, sv.anzahl, sv.am, count(*) OVER ()
  FROM sichtbar sv
  ORDER BY CASE WHEN p_sort = 'geladen' THEN sv.anzahl END DESC NULLS LAST, sv.am DESC, sv.fid
  LIMIT least(greatest(coalesce(p_limit, 30), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;
REVOKE ALL ON FUNCTION public.regal_liste(text, uuid, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regal_liste(text, uuid, text, text, integer, integer) TO authenticated;

DROP TRIGGER IF EXISTS werkzeug_ablaeufe_herkunft_schutz ON public.werkzeug_ablaeufe;
DROP FUNCTION IF EXISTS public.werkzeug_ablaeufe_herkunft_schutz();
ALTER TABLE public.werkzeug_ablaeufe
  DROP COLUMN IF EXISTS auszug_am,
  DROP COLUMN IF EXISTS herkunft_am,
  DROP COLUMN IF EXISTS herkunft_name;
