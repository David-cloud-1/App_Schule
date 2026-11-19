-- Rückweg für 20261122_proj120_loeschen_nach_vertretung.sql
-- Achtung: stornierte (noch sichtbare) Einträge gelten danach wieder als normale Einträge mit Vertretung.
BEGIN;
DROP FUNCTION IF EXISTS abw_storno_abschliessen(uuid, integer);
DROP FUNCTION abw_liste(date, date, text, text, uuid, text, integer, integer);
DROP FUNCTION abw_loeschen(uuid, integer);
DROP FUNCTION abw_offene_vertretungen();
DROP FUNCTION abw_wiederherstellen(uuid);
DROP FUNCTION abw_vertretung_setzen(uuid, integer, text);
DROP FUNCTION abw_aendern(uuid, integer, uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text);

CREATE FUNCTION abw_liste(
  p_von date, p_bis date,
  p_abteilung text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_art_id uuid DEFAULT NULL,
  p_suche text DEFAULT NULL,
  p_limit integer DEFAULT 500,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid, person_id uuid, person_name text, erstellt_von uuid, erstellt_von_name text,
  art_id uuid, art_name text, art_farbe text, art_icon text,
  datum_von date, datum_bis date, ganztaegig boolean, zeit_von time, zeit_bis time,
  alle_abteilungen boolean, abteilungen text[], freitext text, notiz text,
  vertretung_status text, vertretung_von_name text, vertretung_am timestamptz,
  geaendert_nach_vertretung boolean, version integer, created_at timestamptz, updated_at timestamptz,
  darf_bearbeiten boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT a.id, a.person_id, abw_name(a.person_id), a.created_by, abw_name(a.created_by),
         a.art_id, ar.name, ar.farbe, ar.icon,
         a.datum_von, a.datum_bis, a.ganztaegig, a.zeit_von, a.zeit_bis,
         a.alle_abteilungen,
         coalesce((SELECT array_agg(aa.abteilung_id ORDER BY ka.sort_order)
                   FROM abwesenheit_abteilungen aa JOIN kalender_abteilungen ka ON ka.id = aa.abteilung_id
                   WHERE aa.abwesenheit_id = a.id), ARRAY[]::text[]),
         a.freitext, a.notiz,
         a.vertretung_status,
         CASE WHEN a.vertretung_status = 'offen' THEN NULL ELSE abw_name(a.vertretung_von) END,
         a.vertretung_am,
         a.geaendert_nach_vertretung, a.version, a.created_at, a.updated_at,
         abw_darf_bearbeiten(a.person_id, a.created_by)
  FROM abwesenheiten a
  JOIN abwesenheit_arten ar ON ar.id = a.art_id
  WHERE has_teacher_role()
    AND a.deleted_at IS NULL
    AND a.datum_von <= p_bis
    AND a.datum_bis >= p_von
    AND (p_abteilung IS NULL OR a.alle_abteilungen
         OR EXISTS (SELECT 1 FROM abwesenheit_abteilungen aa WHERE aa.abwesenheit_id = a.id AND aa.abteilung_id = p_abteilung))
    AND (p_status IS NULL OR a.vertretung_status = p_status)
    AND (p_art_id IS NULL OR a.art_id = p_art_id)
    AND (p_suche IS NULL OR btrim(p_suche) = '' OR abw_name(a.person_id) ILIKE '%' || btrim(p_suche) || '%')
  ORDER BY a.datum_von, a.zeit_von NULLS FIRST, abw_name(a.person_id), a.id
  LIMIT least(greatest(coalesce(p_limit, 500), 1), 500)
  OFFSET greatest(coalesce(p_offset, 0), 0)
$$;

CREATE FUNCTION abw_offene_vertretungen() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE WHEN NOT abw_ist_planer() THEN NULL ELSE (
    SELECT count(*)::integer
    FROM abwesenheiten a
    WHERE a.deleted_at IS NULL
      AND a.vertretung_status = 'offen'
      AND a.datum_bis >= abw_heute()
      AND a.datum_von <= abw_heute() + 13
      AND EXISTS (
        SELECT 1 FROM generate_series(
          greatest(a.datum_von, abw_heute()), least(a.datum_bis, abw_heute() + 13), interval '1 day'
        ) AS t(tag)
        WHERE extract(isodow FROM t.tag) < 6
      )
  ) END
$$;

CREATE FUNCTION abw_loeschen(p_id uuid, p_version integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheiten;
  v_art_name text;
BEGIN
  SELECT * INTO v_alt FROM abwesenheiten WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_alt.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Eintrag wurde gelöscht.' USING ERRCODE = 'ABW02';
  END IF;
  IF NOT abw_darf_bearbeiten(v_alt.person_id, v_alt.created_by) THEN
    RAISE EXCEPTION 'Diesen Eintrag darfst du nicht löschen.' USING ERRCODE = 'ABW03';
  END IF;
  IF p_version IS DISTINCT FROM v_alt.version THEN
    RAISE EXCEPTION 'Der Eintrag wurde gerade geändert. Bitte neu laden.' USING ERRCODE = 'ABW06';
  END IF;
  SELECT name INTO v_art_name FROM abwesenheit_arten WHERE id = v_alt.art_id;

  UPDATE abwesenheiten
     SET deleted_at = now(), deleted_by = v_uid, version = version + 1, updated_at = now(), updated_by = v_uid
   WHERE id = p_id;

  PERFORM abw_hinweis(v_alt.person_id, p_id, 'geloescht',
    abw_name(v_uid) || ' hat deinen Eintrag gelöscht: ' || v_art_name || ', ' || abw_zeitraum_text(v_alt.datum_von, v_alt.datum_bis));
  PERFORM abw_protokoll('abwesenheit.delete', p_id, abw_name(v_alt.person_id) || ' · ' || v_art_name,
    jsonb_build_object('person_id', v_alt.person_id, 'von', v_alt.datum_von, 'bis', v_alt.datum_bis));
END;
$$;

CREATE FUNCTION abw_wiederherstellen(p_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheiten;
  v_version integer;
BEGIN
  SELECT * INTO v_alt FROM abwesenheiten WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_alt.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Diesen gelöschten Eintrag gibt es nicht.' USING ERRCODE = 'ABW02';
  END IF;
  IF NOT (v_alt.deleted_by = v_uid OR is_admin()) THEN
    RAISE EXCEPTION 'Nur wer gelöscht hat, kann das rückgängig machen.' USING ERRCODE = 'ABW03';
  END IF;
  IF v_alt.deleted_at < now() - interval '15 minutes' AND NOT is_admin() THEN
    RAISE EXCEPTION 'Das Löschen ist schon zu lange her.' USING ERRCODE = 'ABW03';
  END IF;
  UPDATE abwesenheiten
     SET deleted_at = NULL, deleted_by = NULL, version = version + 1, updated_at = now(), updated_by = v_uid
   WHERE id = p_id
  RETURNING version INTO v_version;
  -- den Lösch-Hinweis zurücknehmen
  DELETE FROM kalender_hinweise
   WHERE abwesenheit_id = p_id AND anlass = 'geloescht' AND created_at >= v_alt.deleted_at;
  PERFORM abw_protokoll('abwesenheit.restore', p_id, abw_name(v_alt.person_id), NULL);
  RETURN v_version;
END;
$$;

CREATE FUNCTION abw_vertretung_setzen(p_id uuid, p_version integer, p_status text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheiten;
  v_version integer;
  v_text text;
BEGIN
  IF NOT abw_ist_planer() THEN
    RAISE EXCEPTION 'Den Vertretungsstatus ändern nur Vertretungsplaner.' USING ERRCODE = 'ABW03';
  END IF;
  IF p_status NOT IN ('offen', 'eingetragen', 'nicht_noetig') THEN
    RAISE EXCEPTION 'Unbekannter Status.' USING ERRCODE = 'ABW04';
  END IF;
  SELECT * INTO v_alt FROM abwesenheiten WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_alt.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Eintrag wurde gelöscht.' USING ERRCODE = 'ABW02';
  END IF;
  IF p_version IS DISTINCT FROM v_alt.version THEN
    RAISE EXCEPTION 'Status wurde gerade geändert. Bitte neu laden.' USING ERRCODE = 'ABW06';
  END IF;
  IF v_alt.vertretung_status = p_status THEN
    RETURN v_alt.version;
  END IF;

  UPDATE abwesenheiten SET
    vertretung_status = p_status,
    vertretung_von = CASE WHEN p_status = 'offen' THEN NULL ELSE v_uid END,
    vertretung_am = CASE WHEN p_status = 'offen' THEN NULL ELSE now() END,
    geaendert_nach_vertretung = CASE WHEN p_status = 'offen' THEN geaendert_nach_vertretung ELSE false END,
    version = version + 1,
    updated_at = now(),
    updated_by = v_uid
  WHERE id = p_id
  RETURNING version INTO v_version;

  IF p_status = 'eingetragen' THEN
    v_text := 'Vertretung für deine Abwesenheit am ' || abw_zeitraum_text(v_alt.datum_von, v_alt.datum_bis)
              || ' ist eingetragen (' || abw_name(v_uid) || ')';
    PERFORM abw_hinweis(v_alt.person_id, p_id, 'vertretung', v_text);
    IF v_alt.created_by IS DISTINCT FROM v_alt.person_id THEN
      PERFORM abw_hinweis(v_alt.created_by, p_id, 'vertretung',
        'Vertretung für ' || abw_name(v_alt.person_id) || ' am ' || abw_zeitraum_text(v_alt.datum_von, v_alt.datum_bis)
        || ' ist eingetragen (' || abw_name(v_uid) || ')');
    END IF;
  END IF;

  PERFORM abw_protokoll('abwesenheit.vertretung', p_id, abw_name(v_alt.person_id),
    jsonb_build_object('alt', v_alt.vertretung_status, 'neu', p_status));
  RETURN v_version;
END;
$$;

CREATE FUNCTION abw_aendern(
  p_id uuid, p_version integer,
  p_person_id uuid, p_art_id uuid, p_von date, p_bis date, p_ganztaegig boolean,
  p_zeit_von time, p_zeit_bis time, p_alle boolean, p_abteilungen text[],
  p_freitext text, p_notiz text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheiten;
  v_alt_abt text[];
  v_abt text[];
  v_art abwesenheit_arten;
  v_ganz boolean := coalesce(p_ganztaegig, true);
  v_zv time;
  v_zb time;
  v_wesentlich boolean;
  v_neue_version integer;
BEGIN
  SELECT * INTO v_alt FROM abwesenheiten WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_alt.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Eintrag wurde gelöscht.' USING ERRCODE = 'ABW02';
  END IF;
  IF NOT abw_darf_bearbeiten(v_alt.person_id, v_alt.created_by) THEN
    RAISE EXCEPTION 'Diesen Eintrag darfst du nicht ändern.' USING ERRCODE = 'ABW03';
  END IF;
  IF p_version IS DISTINCT FROM v_alt.version THEN
    RAISE EXCEPTION 'Der Eintrag wurde gerade geändert. Bitte neu laden.' USING ERRCODE = 'ABW06';
  END IF;
  v_abt := abw_pruefe_eingabe(p_person_id, p_art_id, p_von, p_bis, v_ganz, p_zeit_von, p_zeit_bis,
                              p_alle, p_abteilungen, p_freitext, p_notiz, v_alt.art_id);
  SELECT * INTO v_art FROM abwesenheit_arten WHERE id = p_art_id;
  v_zv := CASE WHEN v_ganz THEN NULL ELSE p_zeit_von END;
  v_zb := CASE WHEN v_ganz THEN NULL ELSE p_zeit_bis END;

  SELECT coalesce(array_agg(abteilung_id ORDER BY abteilung_id), ARRAY[]::text[]) INTO v_alt_abt
  FROM abwesenheit_abteilungen WHERE abwesenheit_id = p_id;

  -- Zeit, Art, Person oder Abteilungen geändert → Vertretung muss neu geprüft werden
  v_wesentlich := v_alt.person_id IS DISTINCT FROM p_person_id
    OR v_alt.art_id <> p_art_id
    OR v_alt.datum_von <> p_von OR v_alt.datum_bis <> p_bis
    OR v_alt.ganztaegig <> v_ganz
    OR v_alt.zeit_von IS DISTINCT FROM v_zv OR v_alt.zeit_bis IS DISTINCT FROM v_zb
    OR v_alt.alle_abteilungen <> coalesce(p_alle, false)
    OR v_alt_abt <> (SELECT coalesce(array_agg(x ORDER BY x), ARRAY[]::text[]) FROM unnest(v_abt) x);

  UPDATE abwesenheiten SET
    person_id = p_person_id,
    art_id = p_art_id,
    datum_von = p_von,
    datum_bis = p_bis,
    ganztaegig = v_ganz,
    zeit_von = v_zv,
    zeit_bis = v_zb,
    alle_abteilungen = coalesce(p_alle, false),
    freitext = CASE WHEN v_art.mit_freitext THEN nullif(btrim(p_freitext), '') ELSE NULL END,
    notiz = nullif(btrim(p_notiz), ''),
    vertretung_status = CASE WHEN v_wesentlich THEN 'offen' ELSE vertretung_status END,
    vertretung_von = CASE WHEN v_wesentlich THEN NULL ELSE vertretung_von END,
    vertretung_am = CASE WHEN v_wesentlich THEN NULL ELSE vertretung_am END,
    geaendert_nach_vertretung = CASE
      WHEN v_wesentlich AND v_alt.vertretung_status <> 'offen' THEN true
      ELSE geaendert_nach_vertretung END,
    version = version + 1,
    updated_at = now(),
    updated_by = v_uid
  WHERE id = p_id
  RETURNING version INTO v_neue_version;

  DELETE FROM abwesenheit_abteilungen WHERE abwesenheit_id = p_id;
  INSERT INTO abwesenheit_abteilungen (abwesenheit_id, abteilung_id) SELECT p_id, unnest(v_abt);

  IF v_alt.person_id IS DISTINCT FROM p_person_id THEN
    PERFORM abw_hinweis(p_person_id, p_id, 'eingetragen',
      abw_name(v_uid) || ' hat dich eingetragen: ' || v_art.name || ', ' || abw_zeitraum_text(p_von, p_bis));
    PERFORM abw_hinweis(v_alt.person_id, p_id, 'geaendert',
      abw_name(v_uid) || ' hat deinen Eintrag vom ' || abw_zeitraum_text(v_alt.datum_von, v_alt.datum_bis) || ' einer anderen Person zugeordnet');
  ELSE
    PERFORM abw_hinweis(p_person_id, p_id, 'geaendert',
      abw_name(v_uid) || ' hat deinen Eintrag geändert: ' || v_art.name || ', ' || abw_zeitraum_text(p_von, p_bis));
  END IF;

  PERFORM abw_protokoll('abwesenheit.update', p_id, abw_name(p_person_id) || ' · ' || v_art.name,
    jsonb_build_object(
      'alt', jsonb_build_object('person_id', v_alt.person_id, 'art_id', v_alt.art_id, 'von', v_alt.datum_von,
                                'bis', v_alt.datum_bis, 'zeit_von', v_alt.zeit_von, 'zeit_bis', v_alt.zeit_bis,
                                'alle_abteilungen', v_alt.alle_abteilungen, 'abteilungen', to_jsonb(v_alt_abt),
                                'vertretung_status', v_alt.vertretung_status),
      'neu', jsonb_build_object('person_id', p_person_id, 'art_id', p_art_id, 'von', p_von, 'bis', p_bis,
                                'zeit_von', v_zv, 'zeit_bis', v_zb, 'alle_abteilungen', coalesce(p_alle, false),
                                'abteilungen', to_jsonb(v_abt)),
      'vertretung_zurueckgesetzt', v_wesentlich AND v_alt.vertretung_status <> 'offen'));
  RETURN v_neue_version;
END;
$$;

DROP INDEX IF EXISTS idx_abwesenheiten_storniert;
ALTER TABLE abwesenheiten DROP COLUMN storniert_am, DROP COLUMN storniert_von;

REVOKE ALL ON FUNCTION
  abw_liste(date, date, text, text, uuid, text, integer, integer), abw_offene_vertretungen(),
  abw_loeschen(uuid, integer), abw_wiederherstellen(uuid), abw_vertretung_setzen(uuid, integer, text),
  abw_aendern(uuid, integer, uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  abw_liste(date, date, text, text, uuid, text, integer, integer), abw_offene_vertretungen(),
  abw_loeschen(uuid, integer), abw_wiederherstellen(uuid), abw_vertretung_setzen(uuid, integer, text),
  abw_aendern(uuid, integer, uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text)
TO authenticated;
COMMIT;
