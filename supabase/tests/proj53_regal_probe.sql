-- PROJ-53 Probe: Migration + Sichtbarkeits-, Grenzen- und Rechtetests in EINEM Lauf.
-- Im Supabase-SQL-Editor ausführen (Projekt riqafwijurbxvywzlipx). Das Skript endet
-- absichtlich mit einem Fehler („PROBE-ERGEBNIS“): Damit wird ALLES zurückgerollt,
-- auch die Migration. Es bleibt nichts in der Datenbank.
-- Jede Zeile nennt den Test und, in Klammern, was erwartet wird. Zeilen mit „FAIL“ sind Fehler.
-- Danach die echte Migration (supabase/migrations/20261101_proj53_regal.sql) einmal ausführen.
-- Ohne Migration-Teil (nur Tests, wenn sie schon angewendet ist): ab „CREATE FUNCTION pg_temp.als“.

-- PROJ-53 (Paket 1 „Teilen & Regal“): Regal des Kollegiums.
--
-- Die Tabelle werkzeug_ablaeufe bleibt UNVERÄNDERT streng privat („nur eigene
-- Zeilen“, auch für den Super-Admin). Geteilt wird über eine eigene Freigabe,
-- die an ein fertiges Material gehängt wird. Das Regal liest nie direkt aus
-- den Abläufen, sondern über schmale Funktionen, die nur Titel, Werkzeug,
-- Format, Fach, Notiz, Name und Zähler liefern — nie Skript, Prompt, Antwort
-- oder Einlesung (E2).
--
--  • Sichtbarkeit: EINE Funktion (regal_darf_sehen) für Liste, Download und
--    später „Anpassen“.
--  • Schreiben nur über die Funktionen unten (Besitzer-Prüfung, Grenzen,
--    Validierung). Angemeldete Nutzer haben auf die Tabellen nur Lesezugriff
--    auf ihre eigenen Freigaben.
--  • Entnahme durch den Super-Admin (Paket 2) setzt entnommen_*; danach kann
--    die Besitzerin oder der Besitzer die Freigabe weder ändern noch löschen
--    (Sperre), bis der Super-Admin sie wieder zulässt.
--
-- Rückweg: 20261101_proj53_regal_down.sql

-- ── 1. Tabellen ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.regal_freigaben (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- „Nur ich“ = keine Zeile. Verschwindet mit dem Material.
  ablauf_id      uuid NOT NULL UNIQUE REFERENCES public.werkzeug_ablaeufe(id) ON DELETE CASCADE,
  owner_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stufe          text NOT NULL CHECK (stufe IN ('fachbereich', 'alle', 'ausgewaehlte')),
  fach_id        uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  notiz          text CHECK (notiz IS NULL OR char_length(notiz) BETWEEN 1 AND 200),
  geteilt_am     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- Entnahme durch den Super-Admin (leer, solange das Material im Regal steht)
  entnommen_am   timestamptz,
  entnommen_von  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entnommen_grund text CHECK (entnommen_grund IS NULL OR char_length(entnommen_grund) <= 300)
);

CREATE INDEX IF NOT EXISTS regal_freigaben_owner_idx ON public.regal_freigaben (owner_id);
CREATE INDEX IF NOT EXISTS regal_freigaben_liste_idx
  ON public.regal_freigaben (geteilt_am DESC) WHERE entnommen_am IS NULL;
CREATE INDEX IF NOT EXISTS regal_freigaben_fach_idx ON public.regal_freigaben (fach_id) WHERE fach_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.regal_freigabe_bereiche (
  freigabe_id    uuid NOT NULL REFERENCES public.regal_freigaben(id) ON DELETE CASCADE,
  department_id  uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  PRIMARY KEY (freigabe_id, department_id)
);
CREATE INDEX IF NOT EXISTS regal_freigabe_bereiche_dept_idx ON public.regal_freigabe_bereiche (department_id);

CREATE TABLE IF NOT EXISTS public.regal_freigabe_personen (
  freigabe_id    uuid NOT NULL REFERENCES public.regal_freigaben(id) ON DELETE CASCADE,
  teacher_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (freigabe_id, teacher_id)
);
CREATE INDEX IF NOT EXISTS regal_freigabe_personen_teacher_idx ON public.regal_freigabe_personen (teacher_id);

-- Je Person, Freigabe und Tag zählt ein Download einmal
CREATE TABLE IF NOT EXISTS public.regal_downloads (
  freigabe_id    uuid NOT NULL REFERENCES public.regal_freigaben(id) ON DELETE CASCADE,
  person_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag            date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Berlin')::date),
  PRIMARY KEY (freigabe_id, person_id, tag)
);

-- ── 2. Zugriffsregeln (RLS) ───────────────────────────────────────────────
-- Direkter Zugriff: nur Lesen der eigenen Freigaben. Alles andere läuft über
-- die Funktionen in Abschnitt 3. regal_downloads hat bewusst keine Regel für
-- angemeldete Nutzer (nur Server/Funktionen).

ALTER TABLE public.regal_freigaben ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regal_freigabe_bereiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regal_freigabe_personen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regal_downloads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.regal_freigaben, public.regal_freigabe_bereiche,
              public.regal_freigabe_personen, public.regal_downloads FROM anon, authenticated;
GRANT SELECT ON public.regal_freigaben, public.regal_freigabe_bereiche,
                public.regal_freigabe_personen TO authenticated;

CREATE POLICY "regal_freigaben: eigene lesen" ON public.regal_freigaben
  FOR SELECT USING (owner_id = auth.uid() AND public.has_teacher_role());

CREATE POLICY "regal_freigabe_bereiche: eigene lesen" ON public.regal_freigabe_bereiche
  FOR SELECT USING (
    public.has_teacher_role()
    AND EXISTS (SELECT 1 FROM public.regal_freigaben f WHERE f.id = freigabe_id AND f.owner_id = auth.uid())
  );

CREATE POLICY "regal_freigabe_personen: eigene lesen" ON public.regal_freigabe_personen
  FOR SELECT USING (
    public.has_teacher_role()
    AND EXISTS (SELECT 1 FROM public.regal_freigaben f WHERE f.id = freigabe_id AND f.owner_id = auth.uid())
  );

-- ── 3. Funktionen ──────────────────────────────────────────────────────────

-- Steht die angemeldete Lehrkraft im Fachbereich? (Eintrag unter „Meine Fächer“
-- oder Bereichs-Admin dieses Bereichs)
CREATE OR REPLACE FUNCTION public.regal_in_bereich(p_department_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
           SELECT 1 FROM teacher_subject_assignments
           WHERE teacher_id = auth.uid() AND department_id = p_department_id
         )
      OR EXISTS (
           SELECT 1 FROM profiles
           WHERE id = auth.uid() AND role = 'department_admin' AND department_id = p_department_id
         )
$$;

-- Die EINE Stelle, die entscheidet, wer eine Freigabe im Regal sieht:
-- Besitzer, Stufe „alle“, passender Fachbereich oder namentlich ausgewählt —
-- und zusätzlich: die Anfragende hat eine Lehrer-Rolle, der Besitzer hat sie
-- noch, und die Freigabe ist nicht entnommen.
CREATE OR REPLACE FUNCTION public.regal_darf_sehen(p_freigabe_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_teacher_role() AND EXISTS (
    SELECT 1
    FROM regal_freigaben f
    JOIN profiles o ON o.id = f.owner_id
    WHERE f.id = p_freigabe_id
      AND f.entnommen_am IS NULL
      AND o.role IN ('teacher', 'department_admin', 'admin')
      AND (
        f.owner_id = auth.uid()
        OR f.stufe = 'alle'
        OR (f.stufe = 'fachbereich' AND EXISTS (
              SELECT 1 FROM regal_freigabe_bereiche b
              WHERE b.freigabe_id = f.id AND public.regal_in_bereich(b.department_id)))
        OR (f.stufe = 'ausgewaehlte' AND EXISTS (
              SELECT 1 FROM regal_freigabe_personen p
              WHERE p.freigabe_id = f.id AND p.teacher_id = auth.uid()))
      )
  )
$$;

-- Das Regal: eine Seite sichtbarer Karten (schmale Felder, nie Skript oder Antwort)
CREATE OR REPLACE FUNCTION public.regal_liste(
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
         sv.datei, sv.anzahl, sv.am, count(*) OVER ()
  FROM sichtbar sv
  ORDER BY
    CASE WHEN p_sort = 'geladen' THEN sv.anzahl END DESC NULLS LAST,
    sv.am DESC,
    sv.fid
  LIMIT least(greatest(coalesce(p_limit, 30), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

-- Filterwerte: nur Fächer und Werkzeuge, die im sichtbaren Regal vorkommen
CREATE OR REPLACE FUNCTION public.regal_filterwerte()
RETURNS TABLE (art text, schluessel text, bezeichnung text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH sichtbar AS (
    SELECT f.fach_id, a.werkzeug
    FROM regal_freigaben f
    JOIN werkzeug_ablaeufe a ON a.id = f.ablauf_id
    WHERE a.status = 'fertig' AND public.has_teacher_role() AND public.regal_darf_sehen(f.id)
  )
  SELECT 'fach'::text, s.id::text, s.name
  FROM subjects s
  WHERE s.id IN (SELECT fach_id FROM sichtbar WHERE fach_id IS NOT NULL)
  UNION ALL
  SELECT 'werkzeug'::text, w.werkzeug, w.werkzeug
  FROM (SELECT DISTINCT werkzeug FROM sichtbar) w
$$;

-- Personensuche im Teilen-Dialog: nur Lehrer-Rollen, nur Anzeigename (nie E-Mail)
CREATE OR REPLACE FUNCTION public.regal_lehrkraefte(p_suche text)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, coalesce(nullif(btrim(p.display_name), ''), 'Lehrkraft')
  FROM profiles p
  WHERE public.has_teacher_role()
    AND p.role IN ('teacher', 'department_admin', 'admin')
    AND p.id <> auth.uid()
    AND char_length(btrim(coalesce(p_suche, ''))) >= 2
    AND p.display_name ILIKE '%' || replace(replace(replace(btrim(left(p_suche, 60)), '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
  ORDER BY p.display_name
  LIMIT 20
$$;

-- Eigene Freigabe lesen (für den Teilen-Dialog): nur die Besitzerin oder der Besitzer
CREATE OR REPLACE FUNCTION public.regal_freigabe_lesen(p_ablauf_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  f regal_freigaben%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_teacher_role() THEN
    RETURN NULL;
  END IF;
  SELECT * INTO f FROM regal_freigaben WHERE ablauf_id = p_ablauf_id AND owner_id = auth.uid();
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'stufe', f.stufe,
    'fachId', f.fach_id,
    'notiz', f.notiz,
    'entnommenAm', f.entnommen_am,
    'entnommenGrund', f.entnommen_grund,
    'bereiche', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name) ORDER BY d.name)
      FROM regal_freigabe_bereiche b JOIN departments d ON d.id = b.department_id
      WHERE b.freigabe_id = f.id), '[]'::jsonb),
    'personen', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.teacher_id,
               'name', coalesce(nullif(btrim(pr.display_name), ''), 'Lehrkraft'),
               'aktiv', coalesce(pr.role IN ('teacher', 'department_admin', 'admin'), false))
             ORDER BY pr.display_name)
      FROM regal_freigabe_personen p LEFT JOIN profiles pr ON pr.id = p.teacher_id
      WHERE p.freigabe_id = f.id), '[]'::jsonb)
  );
END;
$$;

-- Teilen / Sichtbarkeit ändern. Alles in einem Schritt, mit allen Prüfungen.
-- Meldungen mit SQLSTATE P0001 sind für die Lehrkraft gedacht und werden
-- unverändert angezeigt.
CREATE OR REPLACE FUNCTION public.regal_freigabe_setzen(
  p_ablauf_id uuid,
  p_stufe     text,
  p_fach_id   uuid,
  p_notiz     text,
  p_bereiche  uuid[],
  p_personen  uuid[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_id        uuid;
  v_notiz     text := nullif(btrim(coalesce(p_notiz, '')), '');
  v_bereiche  uuid[];
  v_personen  uuid[];
  v_x         uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_teacher_role() THEN
    RAISE EXCEPTION 'Nicht erlaubt.' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM werkzeug_ablaeufe
   WHERE id = p_ablauf_id AND owner_id = v_uid AND status = 'fertig' AND ergebnis IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieses Material gibt es nicht mehr oder es ist noch nicht fertig.' USING ERRCODE = 'P0002';
  END IF;

  IF p_stufe IS NULL OR p_stufe NOT IN ('fachbereich', 'alle', 'ausgewaehlte') THEN
    RAISE EXCEPTION 'Bitte wähle, wer das Material sehen darf.' USING ERRCODE = 'P0001';
  END IF;
  IF v_notiz IS NOT NULL AND char_length(v_notiz) > 200 THEN
    RAISE EXCEPTION 'Die Notiz ist zu lang (höchstens 200 Zeichen).' USING ERRCODE = 'P0001';
  END IF;
  IF v_notiz IS NOT NULL AND v_notiz ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]' THEN
    RAISE EXCEPTION 'Die Notiz enthält ungültige Zeichen.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM regal_freigaben WHERE ablauf_id = p_ablauf_id AND entnommen_am IS NOT NULL) THEN
    RAISE EXCEPTION 'Dieses Material wurde vom Admin aus dem Regal genommen und kann nicht erneut geteilt werden.' USING ERRCODE = 'P0001';
  END IF;
  IF p_fach_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM subjects WHERE id = p_fach_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Dieses Fach gibt es nicht.' USING ERRCODE = 'P0001';
  END IF;

  v_bereiche := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_bereiche, '{}'::uuid[])) AS x);
  v_personen := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_personen, '{}'::uuid[])) AS x WHERE x <> v_uid);

  IF p_stufe = 'fachbereich' THEN
    IF cardinality(v_bereiche) < 1 THEN
      RAISE EXCEPTION 'Bitte wähle mindestens einen Fachbereich.' USING ERRCODE = 'P0001';
    END IF;
    FOREACH v_x IN ARRAY v_bereiche LOOP
      IF NOT public.regal_in_bereich(v_x) THEN
        RAISE EXCEPTION 'Du kannst nur mit Fachbereichen teilen, in denen du selbst eingetragen bist.' USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
  ELSIF p_stufe = 'ausgewaehlte' THEN
    IF cardinality(v_personen) < 1 THEN
      RAISE EXCEPTION 'Bitte wähle mindestens eine Kollegin oder einen Kollegen.' USING ERRCODE = 'P0001';
    END IF;
    IF cardinality(v_personen) > 50 THEN
      RAISE EXCEPTION 'Du kannst höchstens 50 Personen auswählen. Teile besser mit dem Fachbereich oder allen.' USING ERRCODE = 'P0001';
    END IF;
    -- Neue Personen müssen Lehrer-Rollen sein; wer schon dabei war und die Rolle verlor, darf stehen bleiben
    FOREACH v_x IN ARRAY v_personen LOOP
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_x AND role IN ('teacher', 'department_admin', 'admin'))
         AND NOT EXISTS (
           SELECT 1 FROM regal_freigabe_personen p JOIN regal_freigaben f ON f.id = p.freigabe_id
           WHERE f.ablauf_id = p_ablauf_id AND p.teacher_id = v_x) THEN
        RAISE EXCEPTION 'Eine ausgewählte Person ist keine Lehrkraft.' USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO regal_freigaben (ablauf_id, owner_id, stufe, fach_id, notiz)
  VALUES (p_ablauf_id, v_uid, p_stufe, p_fach_id, v_notiz)
  ON CONFLICT (ablauf_id) DO UPDATE
    SET stufe = EXCLUDED.stufe, fach_id = EXCLUDED.fach_id, notiz = EXCLUDED.notiz, updated_at = now()
  RETURNING id INTO v_id;

  DELETE FROM regal_freigabe_bereiche WHERE freigabe_id = v_id;
  DELETE FROM regal_freigabe_personen WHERE freigabe_id = v_id;
  IF p_stufe = 'fachbereich' THEN
    INSERT INTO regal_freigabe_bereiche (freigabe_id, department_id) SELECT v_id, x FROM unnest(v_bereiche) AS x;
  ELSIF p_stufe = 'ausgewaehlte' THEN
    INSERT INTO regal_freigabe_personen (freigabe_id, teacher_id) SELECT v_id, x FROM unnest(v_personen) AS x;
  END IF;

  RETURN v_id;
END;
$$;

-- „Nur ich“: nimmt das Material sofort aus dem Regal (samt Downloadzählern)
CREATE OR REPLACE FUNCTION public.regal_freigabe_entfernen(p_ablauf_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_teacher_role() THEN
    RAISE EXCEPTION 'Nicht erlaubt.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM regal_freigaben WHERE ablauf_id = p_ablauf_id AND owner_id = auth.uid() AND entnommen_am IS NOT NULL) THEN
    RAISE EXCEPTION 'Dieses Material wurde vom Admin aus dem Regal genommen.' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM regal_freigaben WHERE ablauf_id = p_ablauf_id AND owner_id = auth.uid();
END;
$$;

-- Download: prüft die Sichtbarkeit, zählt höchstens einmal je Person und Tag
-- (eigene Downloads zählen nicht) und gibt nur das zurück, was der Server für
-- die kurzlebige Adresse braucht. Keine Zeile = nicht erlaubt (404).
CREATE OR REPLACE FUNCTION public.regal_download_vorbereiten(p_freigabe_id uuid)
RETURNS TABLE (ablauf_id uuid, owner_id uuid, dateiname text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  f regal_freigaben%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.regal_darf_sehen(p_freigabe_id) THEN
    RETURN;
  END IF;
  SELECT * INTO f FROM regal_freigaben WHERE id = p_freigabe_id;
  IF f.owner_id <> auth.uid() THEN
    INSERT INTO regal_downloads (freigabe_id, person_id) VALUES (f.id, auth.uid()) ON CONFLICT DO NOTHING;
  END IF;
  RETURN QUERY
    SELECT a.id, a.owner_id, a.ergebnis->>'dateiname'
    FROM werkzeug_ablaeufe a
    WHERE a.id = f.ablauf_id AND a.status = 'fertig' AND a.ergebnis IS NOT NULL;
END;
$$;

-- Nur angemeldete Lehrkräfte rufen die Funktionen auf (jede prüft zusätzlich selbst)
REVOKE ALL ON FUNCTION public.regal_in_bereich(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_darf_sehen(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_liste(text, uuid, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_filterwerte() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_lehrkraefte(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_freigabe_lesen(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_freigabe_setzen(uuid, text, uuid, text, uuid[], uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_freigabe_entfernen(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regal_download_vorbereiten(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regal_in_bereich(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_darf_sehen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_liste(text, uuid, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_filterwerte() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_lehrkraefte(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_freigabe_lesen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_freigabe_setzen(uuid, text, uuid, text, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_freigabe_entfernen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regal_download_vorbereiten(uuid) TO authenticated;


CREATE FUNCTION pg_temp.als(u uuid) RETURNS void LANGUAGE sql AS $f$
  SELECT set_config('request.jwt.claim.sub', u::text, true), set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true)
$f$;

DO $probe$
DECLARE
  d_sped uuid := '11bcbe19-61fc-41ca-9580-1b485297c091';
  d_tour uuid := 'b9364045-e0ac-4f79-b1e4-c4b5cde84224';
  v_owner uuid; v_kollege uuid; v_fremd uuid; v_azubi uuid; v_admin uuid;
  v_abl uuid; v_fg uuid; v_txt text; v_n int; v_b boolean; r text := '';
  v_viele uuid[];
BEGIN
  SELECT id INTO v_owner FROM profiles WHERE role='department_admin' AND department_id=d_sped ORDER BY id LIMIT 1;
  SELECT id INTO v_kollege FROM profiles WHERE role='department_admin' AND department_id=d_sped AND id<>v_owner ORDER BY id LIMIT 1;
  SELECT id INTO v_fremd FROM profiles WHERE role='department_admin' AND department_id=d_tour ORDER BY id LIMIT 1;
  SELECT id INTO v_azubi FROM profiles WHERE role='student' ORDER BY id LIMIT 1;
  SELECT id INTO v_admin FROM profiles WHERE role='admin' LIMIT 1;
  r := r || format('Personen: owner=%s kollege=%s fremd=%s azubi=%s admin=%s (alle true)' || E'\n', v_owner IS NOT NULL, v_kollege IS NOT NULL, v_fremd IS NOT NULL, v_azubi IS NOT NULL, v_admin IS NOT NULL);

  INSERT INTO werkzeug_ablaeufe (owner_id, werkzeug, status, schritt, ergebnis)
  VALUES (v_owner, 'skript', 'fertig', 5, '{"titel":"Probe","dateiname":"a.h5p","format":"h5p"}'::jsonb) RETURNING id INTO v_abl;

  PERFORM pg_temp.als(v_owner);
  v_fg := regal_freigabe_setzen(v_abl, 'fachbereich', NULL, 'Notiz', ARRAY[d_sped], '{}');
  r := r || format('T1 angelegt: %s (true)' || E'\n', v_fg IS NOT NULL);

  PERFORM pg_temp.als(v_kollege);
  r := r || format('T2 Kollege (gleicher Bereich) sieht: %s (true)' || E'\n', regal_darf_sehen(v_fg));
  SELECT count(*) INTO v_n FROM regal_liste('', NULL, NULL, 'neueste', 30, 0);
  r := r || format('T2 Kollege Liste: %s (1)' || E'\n', v_n);
  PERFORM pg_temp.als(v_fremd);
  r := r || format('T2 Fremder Bereich sieht: %s (false)' || E'\n', regal_darf_sehen(v_fg));
  SELECT count(*) INTO v_n FROM regal_liste('', NULL, NULL, 'neueste', 30, 0);
  r := r || format('T2 Fremder Liste: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_azubi);
  r := r || format('T2 Azubi sieht: %s (false)' || E'\n', regal_darf_sehen(v_fg));
  SELECT count(*) INTO v_n FROM regal_liste('', NULL, NULL, 'neueste', 30, 0);
  r := r || format('T2 Azubi Liste: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM regal_lehrkraefte('ab');
  r := r || format('T2 Azubi Personensuche: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_admin);
  r := r || format('T2 Super-Admin (nicht im Bereich) sieht: %s (false)' || E'\n', regal_darf_sehen(v_fg));

  PERFORM pg_temp.als(v_owner);
  PERFORM regal_freigabe_setzen(v_abl, 'alle', NULL, NULL, '{}', '{}');
  PERFORM pg_temp.als(v_fremd);
  r := r || format('T3 Alle: Fremder sieht %s (true)' || E'\n', regal_darf_sehen(v_fg));
  PERFORM pg_temp.als(v_azubi);
  r := r || format('T3 Alle: Azubi sieht %s (false)' || E'\n', regal_darf_sehen(v_fg));

  PERFORM pg_temp.als(v_owner);
  PERFORM regal_freigabe_setzen(v_abl, 'ausgewaehlte', NULL, NULL, '{}', ARRAY[v_fremd]);
  PERFORM pg_temp.als(v_fremd);
  r := r || format('T4 Ausgewählt: Fremder sieht %s (true)' || E'\n', regal_darf_sehen(v_fg));
  SELECT bool_and(mit_mir_geteilt) INTO v_b FROM regal_liste('', NULL, NULL, 'neueste', 30, 0);
  r := r || format('T4 mit_mir_geteilt: %s (true)' || E'\n', v_b);
  PERFORM pg_temp.als(v_kollege);
  r := r || format('T4 Nicht ausgewählter Kollege sieht %s (false)' || E'\n', regal_darf_sehen(v_fg));

  PERFORM pg_temp.als(v_owner);
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'fachbereich', NULL, NULL, ARRAY[d_tour], '{}'); r := r || 'T5a FAIL: fremder Bereich erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5a ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  v_viele := ARRAY(SELECT gen_random_uuid() FROM generate_series(1,51));
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'ausgewaehlte', NULL, NULL, '{}', v_viele); r := r || 'T5b FAIL: 51 Personen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5b ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'ausgewaehlte', NULL, NULL, '{}', ARRAY[v_azubi]); r := r || 'T5c FAIL: Azubi als Person erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5c ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'alle', NULL, repeat('x', 201), '{}', '{}'); r := r || 'T5d FAIL: Notiz 201 erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5d ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'alle', NULL, 'a' || chr(7) || 'b', '{}', '{}'); r := r || 'T5e FAIL: Steuerzeichen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5e ok, abgelehnt: %s' || E'\n', SQLERRM); END;
  PERFORM pg_temp.als(v_kollege);
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'alle', NULL, NULL, '{}', '{}'); r := r || 'T5f FAIL: fremdes Material teilbar' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T5f ok, fremdes Material abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_freigabe_entfernen(v_abl); SELECT count(*) INTO v_n FROM regal_freigaben WHERE ablauf_id=v_abl;
    r := r || format('T5g fremdes Material entfernen: Freigaben danach %s (1)' || E'\n', v_n);
  EXCEPTION WHEN OTHERS THEN r := r || format('T5g: %s' || E'\n', SQLERRM); END;

  PERFORM pg_temp.als(v_fremd);
  SELECT count(*) INTO v_n FROM regal_download_vorbereiten(v_fg);
  SELECT count(*) INTO v_n FROM regal_download_vorbereiten(v_fg);
  SELECT count(*) INTO v_n FROM regal_downloads WHERE freigabe_id=v_fg;
  r := r || format('T6 Zähler nach 2 Downloads derselben Person am Tag: %s (1)' || E'\n', v_n);
  PERFORM pg_temp.als(v_owner);
  SELECT count(*) INTO v_n FROM regal_download_vorbereiten(v_fg);
  SELECT count(*) INTO v_n FROM regal_downloads WHERE freigabe_id=v_fg;
  r := r || format('T6 Zähler nach eigenem Download: %s (1)' || E'\n', v_n);
  PERFORM pg_temp.als(v_kollege);
  SELECT count(*) INTO v_n FROM regal_download_vorbereiten(v_fg);
  r := r || format('T6 Download ohne Berechtigung liefert Zeilen: %s (0)' || E'\n', v_n);
  PERFORM pg_temp.als(v_fremd);
  SELECT geladen INTO v_n FROM regal_liste('', NULL, NULL, 'geladen', 30, 0) LIMIT 1;
  r := r || format('T6 Liste zeigt geladen: %s (1)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM regal_filterwerte() WHERE art='werkzeug' AND schluessel='skript';
  r := r || format('T6 Filterwerte Werkzeug: %s (1)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM regal_liste('prob', NULL, NULL, 'neueste', 30, 0);
  r := r || format('T6 Suche prob: %s (1)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM regal_liste('%', NULL, NULL, 'neueste', 30, 0);
  r := r || format('T6 Suche nur Prozentzeichen (muss wörtlich sein): %s (0)' || E'\n', v_n);

  PERFORM pg_temp.als(v_owner);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM regal_freigaben;
  r := r || format('T7 Besitzer liest eigene Freigaben direkt: %s (1)' || E'\n', v_n);
  BEGIN INSERT INTO regal_freigaben (ablauf_id, owner_id, stufe) VALUES (v_abl, v_owner, 'alle'); r := r || 'T7 FAIL: direktes Schreiben erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T7 ok, direktes Schreiben abgelehnt: %s' || E'\n', SQLERRM); END;
  BEGIN SELECT count(*) INTO v_n FROM regal_downloads; r := r || format('T7 FAIL: Downloads direkt lesbar: %s' || E'\n', v_n);
  EXCEPTION WHEN OTHERS THEN r := r || format('T7 ok, Downloads nicht direkt lesbar: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  PERFORM pg_temp.als(v_kollege);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM regal_freigaben;
  r := r || format('T7 Kollege liest fremde Freigaben direkt: %s (0)' || E'\n', v_n);
  SELECT count(*) INTO v_n FROM werkzeug_ablaeufe;
  r := r || format('T7 Kollege sieht fremde Abläufe direkt: %s (0)' || E'\n', v_n);
  RESET ROLE;
  PERFORM pg_temp.als(v_fremd);
  SET LOCAL ROLE authenticated;
  BEGIN SELECT count(*) INTO v_n FROM regal_liste('', NULL, NULL, 'neueste', 30, 0); r := r || format('T7 ok, Funktion als angemeldeter Nutzer ausführbar: %s Zeile(n)' || E'\n', v_n);
  EXCEPTION WHEN OTHERS THEN r := r || format('T7 FAIL Funktion nicht ausführbar: %s' || E'\n', SQLERRM); END;
  RESET ROLE;
  SET LOCAL ROLE anon;
  BEGIN PERFORM regal_darf_sehen(v_fg); r := r || 'T7 FAIL: anon darf Funktion ausführen' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T7 ok, anon abgelehnt: %s' || E'\n', SQLERRM); END;
  RESET ROLE;

  UPDATE regal_freigaben SET entnommen_am = now(), entnommen_grund = 'Probe' WHERE id = v_fg;
  PERFORM pg_temp.als(v_fremd);
  r := r || format('T8 nach Entnahme sieht Fremder: %s (false)' || E'\n', regal_darf_sehen(v_fg));
  PERFORM pg_temp.als(v_owner);
  BEGIN PERFORM regal_freigabe_setzen(v_abl, 'alle', NULL, NULL, '{}', '{}'); r := r || 'T8 FAIL: erneutes Teilen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8 ok, erneutes Teilen gesperrt: %s' || E'\n', SQLERRM); END;
  BEGIN PERFORM regal_freigabe_entfernen(v_abl); r := r || 'T8 FAIL: Entfernen erlaubt' || E'\n';
  EXCEPTION WHEN OTHERS THEN r := r || format('T8 ok, Entfernen gesperrt: %s' || E'\n', SQLERRM); END;
  v_txt := regal_freigabe_lesen(v_abl)->>'entnommenGrund';
  r := r || format('T8 Besitzer sieht Grund: %s (Probe)' || E'\n', v_txt);
  UPDATE regal_freigaben SET entnommen_am = NULL, entnommen_grund = NULL WHERE id = v_fg;

  BEGIN
    UPDATE profiles SET role = 'student' WHERE id = v_owner;
    PERFORM pg_temp.als(v_fremd);
    r := r || format('T9 Besitzer ohne Rolle: Fremder sieht %s (false)' || E'\n', regal_darf_sehen(v_fg));
  EXCEPTION WHEN OTHERS THEN r := r || format('T9 übersprungen: %s' || E'\n', SQLERRM); END;

  DELETE FROM werkzeug_ablaeufe WHERE id = v_abl;
  SELECT count(*) INTO v_n FROM regal_freigaben WHERE id = v_fg;
  SELECT count(*) INTO v_b FROM regal_downloads WHERE freigabe_id = v_fg;
  r := r || format('T10 Material gelöscht: Freigaben %s, Downloads %s (je 0)' || E'\n', v_n, v_b);

  RAISE EXCEPTION E'PROBE-ERGEBNIS\n%', r;
END
$probe$;
