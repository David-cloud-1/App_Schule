-- PROJ-120 Nachtrag: Löschen nach eingetragener Vertretung = Stornierung.
-- Ein Eintrag, dessen Vertretung schon eingetragen ist (z. B. in WebUntis), verschwindet beim
-- Löschen nicht, sondern bleibt gelb sichtbar („gelöscht – Vertretung zurücknehmen“), bis ein
-- Vertretungsplaner die Vertretung zurückgenommen hat.
BEGIN;

ALTER TABLE abwesenheiten
  ADD COLUMN storniert_am timestamptz,
  ADD COLUMN storniert_von uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX idx_abwesenheiten_storniert ON abwesenheiten (datum_bis)
  WHERE deleted_at IS NULL AND storniert_am IS NOT NULL;

-- ── Lesen ────────────────────────────────────────────────────────────────

DROP FUNCTION abw_liste(date, date, text, text, uuid, text, integer, integer);
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
  darf_bearbeiten boolean,
  storniert_am timestamptz, storniert_von_name text
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
         abw_darf_bearbeiten(a.person_id, a.created_by),
         a.storniert_am,
         CASE WHEN a.storniert_am IS NULL THEN NULL ELSE abw_name(a.storniert_von) END
  FROM abwesenheiten a
  JOIN abwesenheit_arten ar ON ar.id = a.art_id
  WHERE has_teacher_role()
    AND a.deleted_at IS NULL
    AND a.datum_von <= p_bis
    AND a.datum_bis >= p_von
    AND (p_abteilung IS NULL OR a.alle_abteilungen
         OR EXISTS (SELECT 1 FROM abwesenheit_abteilungen aa WHERE aa.abwesenheit_id = a.id AND aa.abteilung_id = p_abteilung))
    -- „offen“ schließt stornierte Einträge ein: Hier muss ein Planer noch handeln.
    AND (p_status IS NULL
         OR (p_status = 'offen' AND (a.vertretung_status = 'offen' OR a.storniert_am IS NOT NULL))
         OR (p_status <> 'offen' AND a.vertretung_status = p_status AND a.storniert_am IS NULL))
    AND (p_art_id IS NULL OR a.art_id = p_art_id)
    AND (p_suche IS NULL OR btrim(p_suche) = '' OR abw_name(a.person_id) ILIKE '%' || btrim(p_suche) || '%')
  ORDER BY a.datum_von, a.zeit_von NULLS FIRST, abw_name(a.person_id), a.id
  LIMIT least(greatest(coalesce(p_limit, 500), 1), 500)
  OFFSET greatest(coalesce(p_offset, 0), 0)
$$;
REVOKE ALL ON FUNCTION abw_liste(date, date, text, text, uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION abw_liste(date, date, text, text, uuid, text, integer, integer) TO authenticated;

-- Zähler „Zu erledigen“: offen ODER storniert (Vertretung muss zurückgenommen werden).
CREATE OR REPLACE FUNCTION abw_offene_vertretungen() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE WHEN NOT abw_ist_planer() THEN NULL ELSE (
    SELECT count(*)::integer
    FROM abwesenheiten a
    WHERE a.deleted_at IS NULL
      AND (a.vertretung_status = 'offen' OR a.storniert_am IS NOT NULL)
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

-- ── Schreiben ────────────────────────────────────────────────────────────

-- Ändern: nicht bei stornierten Einträgen (erst Löschung zurücknehmen).
-- Der Rumpf entspricht der ursprünglichen Funktion plus einer zusätzlichen Prüfung.
DO $mig$
DECLARE
  v_src text;
BEGIN
  SELECT pg_get_functiondef('abw_aendern(uuid, integer, uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text)'::regprocedure)
    INTO v_src;
  v_src := replace(v_src,
    E'  IF NOT abw_darf_bearbeiten(v_alt.person_id, v_alt.created_by) THEN\n    RAISE EXCEPTION ''Diesen Eintrag darfst du nicht ändern.'' USING ERRCODE = ''ABW03'';\n  END IF;',
    E'  IF NOT abw_darf_bearbeiten(v_alt.person_id, v_alt.created_by) THEN\n    RAISE EXCEPTION ''Diesen Eintrag darfst du nicht ändern.'' USING ERRCODE = ''ABW03'';\n  END IF;\n  IF v_alt.storniert_am IS NOT NULL THEN\n    RAISE EXCEPTION ''Dieser Eintrag ist gelöscht, bis die Vertretung zurückgenommen ist. Mach die Löschung zuerst rückgängig.'' USING ERRCODE = ''ABW04'';\n  END IF;');
  IF position('v_alt.storniert_am IS NOT NULL' IN v_src) = 0 THEN
    RAISE EXCEPTION 'abw_aendern konnte nicht angepasst werden';
  END IF;
  EXECUTE v_src;
END
$mig$;

DROP FUNCTION abw_loeschen(uuid, integer);
-- Rückgabe: 'geloescht' (weg) oder 'storniert' (bleibt gelb sichtbar, Vertretung muss zurück).
CREATE FUNCTION abw_loeschen(p_id uuid, p_version integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheiten;
  v_art_name text;
  v_storno boolean;
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
  IF v_alt.storniert_am IS NOT NULL THEN
    RETURN 'storniert'; -- schon vermerkt
  END IF;
  SELECT name INTO v_art_name FROM abwesenheit_arten WHERE id = v_alt.art_id;
  v_storno := v_alt.vertretung_status = 'eingetragen';

  IF v_storno THEN
    UPDATE abwesenheiten
       SET storniert_am = now(), storniert_von = v_uid, version = version + 1, updated_at = now(), updated_by = v_uid
     WHERE id = p_id;
  ELSE
    UPDATE abwesenheiten
       SET deleted_at = now(), deleted_by = v_uid, version = version + 1, updated_at = now(), updated_by = v_uid
     WHERE id = p_id;
  END IF;

  PERFORM abw_hinweis(v_alt.person_id, p_id, 'geloescht',
    abw_name(v_uid) || ' hat deinen Eintrag gelöscht: ' || v_art_name || ', ' || abw_zeitraum_text(v_alt.datum_von, v_alt.datum_bis));
  PERFORM abw_protokoll(CASE WHEN v_storno THEN 'abwesenheit.storno' ELSE 'abwesenheit.delete' END, p_id,
    abw_name(v_alt.person_id) || ' · ' || v_art_name,
    jsonb_build_object('person_id', v_alt.person_id, 'von', v_alt.datum_von, 'bis', v_alt.datum_bis,
                       'vertretung_status', v_alt.vertretung_status));
  RETURN CASE WHEN v_storno THEN 'storniert' ELSE 'geloescht' END;
END;
$$;

-- Planer: Vertretung zurückgenommen → Eintrag verschwindet endgültig (weiches Löschen).
CREATE FUNCTION abw_storno_abschliessen(p_id uuid, p_version integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheiten;
BEGIN
  IF NOT abw_ist_planer() THEN
    RAISE EXCEPTION 'Das bestätigen nur Vertretungsplaner.' USING ERRCODE = 'ABW03';
  END IF;
  SELECT * INTO v_alt FROM abwesenheiten WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_alt.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Eintrag wurde gelöscht.' USING ERRCODE = 'ABW02';
  END IF;
  IF v_alt.storniert_am IS NULL THEN
    RAISE EXCEPTION 'Dieser Eintrag ist nicht gelöscht worden.' USING ERRCODE = 'ABW04';
  END IF;
  IF p_version IS DISTINCT FROM v_alt.version THEN
    RAISE EXCEPTION 'Der Eintrag wurde gerade geändert. Bitte neu laden.' USING ERRCODE = 'ABW06';
  END IF;
  UPDATE abwesenheiten SET
    deleted_at = now(), deleted_by = v_uid,
    vertretung_status = 'offen', vertretung_von = NULL, vertretung_am = NULL,
    version = version + 1, updated_at = now(), updated_by = v_uid
  WHERE id = p_id;
  PERFORM abw_protokoll('abwesenheit.storno_abgeschlossen', p_id, abw_name(v_alt.person_id), NULL);
END;
$$;

-- „Rückgängig“: auch für stornierte (noch sichtbare) Einträge; dann nur Löschvermerk entfernen.
CREATE OR REPLACE FUNCTION abw_wiederherstellen(p_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheiten;
  v_version integer;
BEGIN
  SELECT * INTO v_alt FROM abwesenheiten WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Diesen gelöschten Eintrag gibt es nicht.' USING ERRCODE = 'ABW02';
  END IF;

  IF v_alt.deleted_at IS NULL THEN
    IF v_alt.storniert_am IS NULL THEN
      RAISE EXCEPTION 'Diesen gelöschten Eintrag gibt es nicht.' USING ERRCODE = 'ABW02';
    END IF;
    IF NOT (abw_darf_bearbeiten(v_alt.person_id, v_alt.created_by)) THEN
      RAISE EXCEPTION 'Diesen Eintrag darfst du nicht ändern.' USING ERRCODE = 'ABW03';
    END IF;
    UPDATE abwesenheiten
       SET storniert_am = NULL, storniert_von = NULL, version = version + 1, updated_at = now(), updated_by = v_uid
     WHERE id = p_id
    RETURNING version INTO v_version;
    DELETE FROM kalender_hinweise
     WHERE abwesenheit_id = p_id AND anlass = 'geloescht' AND created_at >= v_alt.storniert_am;
    PERFORM abw_protokoll('abwesenheit.storno_zurueck', p_id, abw_name(v_alt.person_id), NULL);
    RETURN v_version;
  END IF;

  IF NOT (v_alt.deleted_by = v_uid OR is_admin()) THEN
    RAISE EXCEPTION 'Nur wer gelöscht hat, kann das rückgängig machen.' USING ERRCODE = 'ABW03';
  END IF;
  IF v_alt.deleted_at < now() - interval '15 minutes' AND NOT is_admin() THEN
    RAISE EXCEPTION 'Das Löschen ist schon zu lange her.' USING ERRCODE = 'ABW03';
  END IF;
  UPDATE abwesenheiten
     SET deleted_at = NULL, deleted_by = NULL, storniert_am = NULL, storniert_von = NULL,
         version = version + 1, updated_at = now(), updated_by = v_uid
   WHERE id = p_id
  RETURNING version INTO v_version;
  DELETE FROM kalender_hinweise
   WHERE abwesenheit_id = p_id AND anlass = 'geloescht' AND created_at >= v_alt.deleted_at;
  PERFORM abw_protokoll('abwesenheit.restore', p_id, abw_name(v_alt.person_id), NULL);
  RETURN v_version;
END;
$$;

-- Status ändern: bei stornierten Einträgen nicht (dafür gibt es abw_storno_abschliessen).
CREATE OR REPLACE FUNCTION abw_vertretung_setzen(p_id uuid, p_version integer, p_status text) RETURNS integer
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
  IF v_alt.storniert_am IS NOT NULL THEN
    RAISE EXCEPTION 'Dieser Eintrag wurde gelöscht. Bitte bestätige, dass die Vertretung zurückgenommen ist.' USING ERRCODE = 'ABW04';
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

REVOKE ALL ON FUNCTION abw_loeschen(uuid, integer), abw_storno_abschliessen(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION abw_loeschen(uuid, integer), abw_storno_abschliessen(uuid, integer) TO authenticated;

COMMIT;
