-- PROJ-120: Abwesenheitskalender für Lehrkräfte (mit Vertretungsplanung)
--
-- Alles Neue, rein additiv: der bestehende Code läuft unverändert weiter.
--
-- Rechte-Modell (wie das Lehrerzimmer, PROJ-63):
--   * Alle Tabellen haben RLS. Lesen dürfen nur Lehrer-Rollen
--     (has_teacher_role()), Hinweise nur der Empfänger selbst.
--   * authenticated hat NUR SELECT. Jede Änderung läuft über die
--     SECURITY-DEFINER-Funktionen abw_*, die Rolle, Rechte, Version und
--     Eingaben selbst prüfen. So lässt sich z. B. der Vertretungsstatus nicht
--     per direktem Zugriff setzen.
--   * profiles.ist_vertretungsplaner ist für authenticated nicht schreibbar
--     (die Spalten-Rechte auf profiles sind ausdrücklich aufgezählt); nur
--     abw_planer_setzen (Super-Admin) ändert es.
--   * Fehler tragen eigene SQLSTATEs, die die API in HTTP-Codes übersetzt:
--       ABW01 = zu viele Einträge in kurzer Zeit (429)
--       ABW02 = nicht gefunden / schon gelöscht (404)
--       ABW03 = keine Berechtigung (403)
--       ABW04 = ungültige Eingabe (400)
--       ABW06 = Eintrag wurde inzwischen geändert (409)
--   * Datum und Uhrzeit sind deutsche Ortszeit (date/time, kein Zeitstempel).
--
-- Rückweg: 20261121_proj120_abwesenheitskalender_down.sql

BEGIN;

-- ── 1. Tabellen ──────────────────────────────────────────────────────────

-- Feste Abteilungsliste des Kalenders (getrennt von den Azubi-Fachbereichen).
CREATE TABLE kalender_abteilungen (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{2,30}$'),
  name text NOT NULL,
  kurz text NOT NULL,
  sort_order integer NOT NULL
);

INSERT INTO kalender_abteilungen (id, name, kurz, sort_order) VALUES
  ('spedition', 'Spedition', 'SPED', 1),
  ('touristik', 'Touristik', 'TOUR', 2),
  ('verkehrsservice', 'Verkehrsservice', 'VS', 3),
  ('kep', 'KEP', 'KEP', 4),
  ('bik-bvj', 'BIK/BVJ', 'BIK/BVJ', 5);

CREATE TABLE abwesenheit_arten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  -- Name eines ws-*-Farbtokens, keine freien Farbwerte
  farbe text NOT NULL CHECK (farbe IN ('green', 'blue', 'orange', 'gold', 'red', 'faint')),
  -- Lucide-Icon aus fester Auswahl
  icon text NOT NULL CHECK (icon IN (
    'graduation-cap', 'footprints', 'briefcase', 'clipboard-check', 'bus', 'calendar-x',
    'calendar', 'users', 'map-pin', 'plane', 'book-open', 'school', 'presentation', 'building'
  )),
  sort_order integer NOT NULL DEFAULT 100,
  aktiv boolean NOT NULL DEFAULT true,
  -- „Sonstige Abwesenheit“: nicht umbenennbar, nicht deaktivierbar
  fest boolean NOT NULL DEFAULT false,
  -- zeigt im Formular das optionale Freitextfeld
  mit_freitext boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  CHECK (NOT fest OR aktiv)
);
CREATE UNIQUE INDEX abwesenheit_arten_name_uniq ON abwesenheit_arten (lower(btrim(name)));

INSERT INTO abwesenheit_arten (name, farbe, icon, sort_order, fest, mit_freitext) VALUES
  ('Fortbildung', 'blue', 'graduation-cap', 10, false, false),
  ('Unterrichtsgang', 'green', 'footprints', 20, false, false),
  ('Dienstreise', 'gold', 'briefcase', 30, false, false),
  ('Mitwirkung Abschlussprüfung', 'red', 'clipboard-check', 40, false, false),
  ('Klassenfahrt/Exkursion', 'orange', 'bus', 50, false, false),
  ('Sonstige Abwesenheit', 'faint', 'calendar-x', 1000, true, true);

CREATE TABLE abwesenheiten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = Konto gelöscht (PROJ-60) → Anzeige „Ehemalige Lehrkraft“
  person_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  art_id uuid NOT NULL REFERENCES abwesenheit_arten(id) ON DELETE RESTRICT,
  datum_von date NOT NULL,
  datum_bis date NOT NULL,
  ganztaegig boolean NOT NULL DEFAULT true,
  zeit_von time,
  zeit_bis time,
  alle_abteilungen boolean NOT NULL DEFAULT false,
  freitext text CHECK (freitext IS NULL OR char_length(freitext) <= 300),
  notiz text CHECK (notiz IS NULL OR char_length(notiz) <= 300),
  vertretung_status text NOT NULL DEFAULT 'offen'
    CHECK (vertretung_status IN ('offen', 'eingetragen', 'nicht_noetig')),
  vertretung_von uuid REFERENCES profiles(id) ON DELETE SET NULL,
  vertretung_am timestamptz,
  geaendert_nach_vertretung boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  CHECK (datum_bis >= datum_von),
  CHECK (datum_bis - datum_von <= 365),
  CHECK (
    (ganztaegig AND zeit_von IS NULL AND zeit_bis IS NULL)
    OR (NOT ganztaegig AND zeit_von IS NOT NULL AND zeit_bis IS NOT NULL
        AND (datum_bis > datum_von OR zeit_bis > zeit_von))
  )
);
CREATE INDEX idx_abwesenheiten_zeitraum ON abwesenheiten (datum_von, datum_bis) WHERE deleted_at IS NULL;
CREATE INDEX idx_abwesenheiten_person ON abwesenheiten (person_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_abwesenheiten_offen ON abwesenheiten (datum_bis)
  WHERE deleted_at IS NULL AND vertretung_status = 'offen';
CREATE INDEX idx_abwesenheiten_created_by ON abwesenheiten (created_by, created_at);

CREATE TABLE abwesenheit_abteilungen (
  abwesenheit_id uuid NOT NULL REFERENCES abwesenheiten(id) ON DELETE CASCADE,
  abteilung_id text NOT NULL REFERENCES kalender_abteilungen(id) ON DELETE CASCADE,
  PRIMARY KEY (abwesenheit_id, abteilung_id)
);
CREATE INDEX idx_abwesenheit_abteilungen_abteilung ON abwesenheit_abteilungen (abteilung_id);

CREATE TABLE kalender_hinweise (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empfaenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  abwesenheit_id uuid NOT NULL REFERENCES abwesenheiten(id) ON DELETE CASCADE,
  anlass text NOT NULL CHECK (anlass IN ('eingetragen', 'geaendert', 'geloescht', 'vertretung')),
  ausgeloest_von uuid REFERENCES profiles(id) ON DELETE SET NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  gesehen_am timestamptz
);
CREATE INDEX idx_kalender_hinweise_empfaenger ON kalender_hinweise (empfaenger_id, created_at DESC)
  WHERE gesehen_am IS NULL;
CREATE INDEX idx_kalender_hinweise_abwesenheit ON kalender_hinweise (abwesenheit_id);

-- Planer-Recht am Konto. Nicht in den Spalten-Rechten von authenticated → nicht selbst setzbar.
ALTER TABLE profiles ADD COLUMN ist_vertretungsplaner boolean NOT NULL DEFAULT false;

-- ── 2. Rechte & Zeilenschutz ─────────────────────────────────────────────

ALTER TABLE kalender_abteilungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE abwesenheit_arten ENABLE ROW LEVEL SECURITY;
ALTER TABLE abwesenheiten ENABLE ROW LEVEL SECURITY;
ALTER TABLE abwesenheit_abteilungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalender_hinweise ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON kalender_abteilungen, abwesenheit_arten, abwesenheiten, abwesenheit_abteilungen, kalender_hinweise
  FROM anon, authenticated;
GRANT SELECT ON kalender_abteilungen, abwesenheit_arten, abwesenheiten, abwesenheit_abteilungen, kalender_hinweise
  TO authenticated;

CREATE POLICY kalender_abteilungen_read ON kalender_abteilungen FOR SELECT TO authenticated
  USING (has_teacher_role());
CREATE POLICY abwesenheit_arten_read ON abwesenheit_arten FOR SELECT TO authenticated
  USING (has_teacher_role());
CREATE POLICY abwesenheiten_read ON abwesenheiten FOR SELECT TO authenticated
  USING (has_teacher_role());
CREATE POLICY abwesenheit_abteilungen_read ON abwesenheit_abteilungen FOR SELECT TO authenticated
  USING (has_teacher_role());
CREATE POLICY kalender_hinweise_read_own ON kalender_hinweise FOR SELECT TO authenticated
  USING (empfaenger_id = auth.uid() AND has_teacher_role());
-- Keine INSERT/UPDATE/DELETE-Regeln: ohne Regel lehnt RLS jede Änderung ab.

-- ── 3. Helfer (nicht von außen aufrufbar) ────────────────────────────────

CREATE FUNCTION abw_heute() RETURNS date
LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $$ SELECT (now() AT TIME ZONE 'Europe/Berlin')::date $$;

CREATE FUNCTION abw_ist_planer() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR (ist_vertretungsplaner AND role IN ('teacher', 'department_admin')))
  )
$$;

CREATE FUNCTION abw_assert_teacher() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT has_teacher_role() THEN
    RAISE EXCEPTION 'Kein Zugang zum Kalender.' USING ERRCODE = 'ABW03';
  END IF;
  RETURN auth.uid();
END;
$$;

-- Anzeigename: Name aus dem Profil, sonst aus der E-Mail-Adresse (wie im Lehrerzimmer).
CREATE FUNCTION abw_name(p_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE
    WHEN p_id IS NULL THEN 'Ehemalige Lehrkraft'
    ELSE coalesce((
      SELECT coalesce(
        nullif(btrim(pr.display_name), ''),
        nullif(btrim(initcap(regexp_replace(split_part(u.email, '@', 1), '[._-]+', ' ', 'g'))), '')
      )
      FROM profiles pr LEFT JOIN auth.users u ON u.id = pr.id
      WHERE pr.id = p_id
    ), 'Ehemalige Lehrkraft')
  END
$$;

CREATE FUNCTION abw_darf_bearbeiten(p_person_id uuid, p_created_by uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT has_teacher_role() AND (
    p_person_id = auth.uid() OR p_created_by = auth.uid() OR abw_ist_planer() OR is_admin()
  )
$$;

CREATE FUNCTION abw_zeitraum_text(p_von date, p_bis date) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE
    WHEN p_von = p_bis THEN to_char(p_von, 'DD.MM.YYYY')
    WHEN date_trunc('year', p_von) = date_trunc('year', p_bis) THEN to_char(p_von, 'DD.MM.') || '–' || to_char(p_bis, 'DD.MM.YYYY')
    ELSE to_char(p_von, 'DD.MM.YYYY') || '–' || to_char(p_bis, 'DD.MM.YYYY')
  END
$$;

-- Hinweis an jemand anderen als die handelnde Person anlegen.
CREATE FUNCTION abw_hinweis(p_empfaenger uuid, p_abwesenheit uuid, p_anlass text, p_text text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF p_empfaenger IS NULL OR p_empfaenger = auth.uid() THEN
    RETURN;
  END IF;
  -- nur an Personen mit Lehrer-Rolle
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_empfaenger AND role IN ('teacher', 'department_admin', 'admin')) THEN
    RETURN;
  END IF;
  INSERT INTO kalender_hinweise (empfaenger_id, abwesenheit_id, anlass, ausgeloest_von, text)
  VALUES (p_empfaenger, p_abwesenheit, p_anlass, auth.uid(), p_text);
END;
$$;

CREATE FUNCTION abw_protokoll(p_action text, p_id uuid, p_label text, p_details jsonb) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  INSERT INTO admin_audit_log (admin_id, action_type, object_type, object_id, object_label, details, department_id)
  VALUES (auth.uid(), p_action, 'abwesenheit', p_id::text, p_label, p_details, NULL)
$$;

-- Eingaben prüfen (gemeinsam für Anlegen und Ändern); gibt die bereinigten Abteilungen zurück.
CREATE FUNCTION abw_pruefe_eingabe(
  p_person_id uuid, p_art_id uuid, p_von date, p_bis date, p_ganztaegig boolean,
  p_zeit_von time, p_zeit_bis time, p_alle boolean, p_abteilungen text[],
  p_freitext text, p_notiz text, p_alte_art uuid
) RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_abt text[];
BEGIN
  IF p_person_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_person_id AND role IN ('teacher', 'department_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Bitte eine Lehrkraft auswählen.' USING ERRCODE = 'ABW04';
  END IF;
  -- inaktive Arten nur, wenn der Eintrag sie schon hat
  IF NOT EXISTS (SELECT 1 FROM abwesenheit_arten WHERE id = p_art_id AND (aktiv OR id = p_alte_art)) THEN
    RAISE EXCEPTION 'Bitte eine Art auswählen.' USING ERRCODE = 'ABW04';
  END IF;
  IF p_von IS NULL OR p_bis IS NULL THEN
    RAISE EXCEPTION 'Bitte Von und Bis angeben.' USING ERRCODE = 'ABW04';
  END IF;
  IF p_bis < p_von THEN
    RAISE EXCEPTION '„Bis“ darf nicht vor „Von“ liegen.' USING ERRCODE = 'ABW04';
  END IF;
  IF p_bis - p_von > 365 THEN
    RAISE EXCEPTION 'Ein Eintrag darf höchstens ein Jahr lang sein.' USING ERRCODE = 'ABW04';
  END IF;
  IF NOT coalesce(p_ganztaegig, true) THEN
    IF p_zeit_von IS NULL OR p_zeit_bis IS NULL THEN
      RAISE EXCEPTION 'Bitte Uhrzeit von und bis angeben.' USING ERRCODE = 'ABW04';
    END IF;
    IF p_von = p_bis AND p_zeit_bis <= p_zeit_von THEN
      RAISE EXCEPTION 'Die Uhrzeit „bis“ muss nach „von“ liegen.' USING ERRCODE = 'ABW04';
    END IF;
  END IF;
  IF char_length(coalesce(p_freitext, '')) > 300 OR char_length(coalesce(p_notiz, '')) > 300 THEN
    RAISE EXCEPTION 'Freitext und Notiz dürfen höchstens 300 Zeichen haben.' USING ERRCODE = 'ABW04';
  END IF;
  IF coalesce(p_alle, false) THEN
    RETURN ARRAY[]::text[];
  END IF;
  SELECT coalesce(array_agg(DISTINCT a), ARRAY[]::text[]) INTO v_abt
  FROM unnest(coalesce(p_abteilungen, ARRAY[]::text[])) a;
  IF cardinality(v_abt) = 0 THEN
    RAISE EXCEPTION 'Bitte mindestens eine Abteilung oder „Alle Abteilungen“ wählen.' USING ERRCODE = 'ABW04';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_abt) a WHERE a NOT IN (SELECT id FROM kalender_abteilungen)) THEN
    RAISE EXCEPTION 'Unbekannte Abteilung.' USING ERRCODE = 'ABW04';
  END IF;
  RETURN v_abt;
END;
$$;

-- ── 4. Lesen ─────────────────────────────────────────────────────────────

-- Einträge im Zeitraum mit Filtern. Für Nicht-Lehrkräfte leer.
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

-- Ein Eintrag (auch gelöscht, damit die Oberfläche „wurde gelöscht“ zeigen kann).
CREATE FUNCTION abw_eintrag(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v jsonb;
  v_deleted timestamptz;
BEGIN
  PERFORM abw_assert_teacher();
  SELECT a.deleted_at INTO v_deleted FROM abwesenheiten a WHERE a.id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Diesen Eintrag gibt es nicht.' USING ERRCODE = 'ABW02';
  END IF;
  IF v_deleted IS NOT NULL THEN
    RAISE EXCEPTION 'Eintrag wurde gelöscht.' USING ERRCODE = 'ABW02';
  END IF;
  SELECT to_jsonb(l) INTO v
  FROM abwesenheiten a
  CROSS JOIN LATERAL abw_liste(a.datum_von, a.datum_bis, NULL, NULL, NULL, NULL, 500, 0) l
  WHERE a.id = p_id AND l.id = p_id;
  SELECT v || jsonb_build_object(
    'updated_by_name', CASE WHEN a.updated_by IS NULL THEN NULL ELSE abw_name(a.updated_by) END
  ) INTO v FROM abwesenheiten a WHERE a.id = p_id;
  RETURN v;
END;
$$;

-- Überschneidungen derselben Person (für den Hinweis im Formular).
CREATE FUNCTION abw_ueberschneidungen(p_person_id uuid, p_von date, p_bis date, p_ausser uuid DEFAULT NULL)
RETURNS TABLE (id uuid, art_name text, datum_von date, datum_bis date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT a.id, ar.name, a.datum_von, a.datum_bis
  FROM abwesenheiten a JOIN abwesenheit_arten ar ON ar.id = a.art_id
  WHERE has_teacher_role()
    AND a.deleted_at IS NULL
    AND a.person_id = p_person_id
    AND a.datum_von <= p_bis AND a.datum_bis >= p_von
    AND (p_ausser IS NULL OR a.id <> p_ausser)
  ORDER BY a.datum_von
  LIMIT 10
$$;

-- Lehrkräfte für die Personensuche (nur Name, keine E-Mail).
CREATE FUNCTION abw_lehrkraefte() RETURNS TABLE (id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT p.id, abw_name(p.id)
  FROM profiles p
  WHERE has_teacher_role() AND p.role IN ('teacher', 'department_admin', 'admin')
  ORDER BY lower(abw_name(p.id))
  LIMIT 1000
$$;

-- Arten mit Anzahl der Einträge (Verwaltungsseite und Formular).
CREATE FUNCTION abw_arten() RETURNS TABLE (
  id uuid, name text, farbe text, icon text, sort_order integer, aktiv boolean, fest boolean,
  mit_freitext boolean, anzahl bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT ar.id, ar.name, ar.farbe, ar.icon, ar.sort_order, ar.aktiv, ar.fest, ar.mit_freitext,
         (SELECT count(*) FROM abwesenheiten a WHERE a.art_id = ar.id AND a.deleted_at IS NULL)
  FROM abwesenheit_arten ar
  WHERE has_teacher_role()
  ORDER BY ar.sort_order, lower(ar.name)
$$;

-- Eigene, ungesehene Hinweise der letzten 14 Tage.
CREATE FUNCTION abw_hinweise() RETURNS TABLE (
  id uuid, abwesenheit_id uuid, anlass text, text text, ausgeloest_von_name text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT h.id, h.abwesenheit_id, h.anlass, h.text, abw_name(h.ausgeloest_von), h.created_at
  FROM kalender_hinweise h
  WHERE has_teacher_role()
    AND h.empfaenger_id = auth.uid()
    AND h.gesehen_am IS NULL
    AND h.created_at > now() - interval '14 days'
  ORDER BY h.created_at DESC
  LIMIT 20
$$;

-- Zähler für „Zu erledigen“: offene Vertretungen mit mindestens einem Werktag
-- in den nächsten 14 Tagen (heute eingeschlossen). NULL für Nicht-Planer.
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

-- Bin ich Planer? (für die Oberfläche)
CREATE FUNCTION abw_ich() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE WHEN NOT has_teacher_role() THEN NULL ELSE jsonb_build_object(
    'id', auth.uid(), 'ist_planer', abw_ist_planer(), 'ist_super_admin', is_admin()
  ) END
$$;

-- ── 5. Schreiben ─────────────────────────────────────────────────────────

CREATE FUNCTION abw_anlegen(
  p_person_id uuid, p_art_id uuid, p_von date, p_bis date, p_ganztaegig boolean,
  p_zeit_von time, p_zeit_bis time, p_alle boolean, p_abteilungen text[],
  p_freitext text, p_notiz text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_abt text[];
  v_id uuid;
  v_art abwesenheit_arten;
  v_ganz boolean := coalesce(p_ganztaegig, true);
BEGIN
  -- Flut-Schutz: höchstens 60 neue Einträge in 10 Minuten
  IF (SELECT count(*) FROM abwesenheiten WHERE created_by = v_uid AND created_at > now() - interval '10 minutes') >= 60 THEN
    RAISE EXCEPTION 'Bitte kurz warten, du hast gerade sehr viele Einträge angelegt.' USING ERRCODE = 'ABW01';
  END IF;
  v_abt := abw_pruefe_eingabe(p_person_id, p_art_id, p_von, p_bis, v_ganz, p_zeit_von, p_zeit_bis,
                              p_alle, p_abteilungen, p_freitext, p_notiz, NULL);
  SELECT * INTO v_art FROM abwesenheit_arten WHERE id = p_art_id;

  INSERT INTO abwesenheiten (
    person_id, created_by, art_id, datum_von, datum_bis, ganztaegig, zeit_von, zeit_bis,
    alle_abteilungen, freitext, notiz, updated_by
  ) VALUES (
    p_person_id, v_uid, p_art_id, p_von, p_bis, v_ganz,
    CASE WHEN v_ganz THEN NULL ELSE p_zeit_von END,
    CASE WHEN v_ganz THEN NULL ELSE p_zeit_bis END,
    coalesce(p_alle, false),
    CASE WHEN v_art.mit_freitext THEN nullif(btrim(p_freitext), '') ELSE NULL END,
    nullif(btrim(p_notiz), ''),
    v_uid
  ) RETURNING id INTO v_id;

  INSERT INTO abwesenheit_abteilungen (abwesenheit_id, abteilung_id)
  SELECT v_id, unnest(v_abt);

  PERFORM abw_hinweis(p_person_id, v_id, 'eingetragen',
    abw_name(v_uid) || ' hat dich eingetragen: ' || v_art.name || ', ' || abw_zeitraum_text(p_von, p_bis));
  PERFORM abw_protokoll('abwesenheit.create', v_id, abw_name(p_person_id) || ' · ' || v_art.name,
    jsonb_build_object('person_id', p_person_id, 'von', p_von, 'bis', p_bis, 'art', v_art.name,
                       'alle_abteilungen', coalesce(p_alle, false), 'abteilungen', to_jsonb(v_abt)));
  RETURN v_id;
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

-- „Rückgängig“ nach dem Löschen: nur wer gelöscht hat (oder der Super-Admin), innerhalb von 15 Minuten.
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

-- Vertretungsstatus: nur Planer und Super-Admin.
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

CREATE FUNCTION abw_hinweis_gesehen(p_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
BEGIN
  -- p_id NULL = alle eigenen Hinweise
  UPDATE kalender_hinweise SET gesehen_am = now()
   WHERE empfaenger_id = v_uid AND gesehen_am IS NULL AND (p_id IS NULL OR id = p_id);
END;
$$;

-- ── 6. Verwaltung (Super-Admin) ──────────────────────────────────────────

CREATE FUNCTION abw_art_speichern(
  p_id uuid, p_name text, p_farbe text, p_icon text, p_aktiv boolean, p_mit_freitext boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := abw_assert_teacher();
  v_alt abwesenheit_arten;
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Abwesenheitsarten verwaltet der Super-Admin.' USING ERRCODE = 'ABW03';
  END IF;
  IF char_length(v_name) NOT BETWEEN 2 AND 60 THEN
    RAISE EXCEPTION 'Der Name braucht 2 bis 60 Zeichen.' USING ERRCODE = 'ABW04';
  END IF;
  IF EXISTS (SELECT 1 FROM abwesenheit_arten WHERE lower(btrim(name)) = lower(v_name) AND id IS DISTINCT FROM p_id) THEN
    RAISE EXCEPTION 'Diese Art gibt es schon.' USING ERRCODE = 'ABW04';
  END IF;
  IF p_farbe NOT IN ('green', 'blue', 'orange', 'gold', 'red', 'faint') THEN
    RAISE EXCEPTION 'Bitte eine Farbe wählen.' USING ERRCODE = 'ABW04';
  END IF;
  IF p_icon NOT IN ('graduation-cap', 'footprints', 'briefcase', 'clipboard-check', 'bus', 'calendar-x',
                    'calendar', 'users', 'map-pin', 'plane', 'book-open', 'school', 'presentation', 'building') THEN
    RAISE EXCEPTION 'Bitte ein Symbol wählen.' USING ERRCODE = 'ABW04';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO abwesenheit_arten (name, farbe, icon, sort_order, aktiv, mit_freitext, created_by)
    VALUES (v_name, p_farbe, p_icon,
            coalesce((SELECT max(sort_order) FROM abwesenheit_arten WHERE NOT fest), 0) + 10,
            coalesce(p_aktiv, true), coalesce(p_mit_freitext, false), v_uid)
    RETURNING id INTO v_id;
    PERFORM abw_protokoll('abwesenheit_art.create', v_id, v_name, NULL);
    RETURN v_id;
  END IF;

  SELECT * INTO v_alt FROM abwesenheit_arten WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Diese Art gibt es nicht.' USING ERRCODE = 'ABW02';
  END IF;
  IF v_alt.fest AND (v_name <> v_alt.name OR NOT coalesce(p_aktiv, true) OR NOT coalesce(p_mit_freitext, true)) THEN
    RAISE EXCEPTION '„Sonstige Abwesenheit“ lässt sich nicht umbenennen oder abschalten.' USING ERRCODE = 'ABW04';
  END IF;
  UPDATE abwesenheit_arten SET
    name = v_name, farbe = p_farbe, icon = p_icon,
    aktiv = coalesce(p_aktiv, true),
    mit_freitext = coalesce(p_mit_freitext, false)
  WHERE id = p_id;
  PERFORM abw_protokoll('abwesenheit_art.update', p_id, v_name,
    jsonb_build_object('alt', to_jsonb(v_alt) - 'created_at' - 'created_by'));
  RETURN p_id;
END;
$$;

CREATE FUNCTION abw_arten_sortieren(p_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  PERFORM abw_assert_teacher();
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Abwesenheitsarten verwaltet der Super-Admin.' USING ERRCODE = 'ABW03';
  END IF;
  -- „fest“ bleibt immer am Ende
  UPDATE abwesenheit_arten ar SET sort_order = x.pos * 10
    FROM unnest(p_ids) WITH ORDINALITY AS x(id, pos)
   WHERE ar.id = x.id AND NOT ar.fest;
END;
$$;

CREATE FUNCTION abw_planer_setzen(p_user_id uuid, p_wert boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_alt boolean;
  v_role text;
BEGIN
  PERFORM abw_assert_teacher();
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Das Planer-Recht vergibt der Super-Admin.' USING ERRCODE = 'ABW03';
  END IF;
  SELECT ist_vertretungsplaner, role INTO v_alt, v_role FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieses Konto gibt es nicht.' USING ERRCODE = 'ABW02';
  END IF;
  IF coalesce(p_wert, false) AND v_role NOT IN ('teacher', 'department_admin', 'admin') THEN
    RAISE EXCEPTION 'Nur Lehrkräfte können Vertretungsplaner sein.' USING ERRCODE = 'ABW04';
  END IF;
  IF v_alt = coalesce(p_wert, false) THEN
    RETURN;
  END IF;
  UPDATE profiles SET ist_vertretungsplaner = coalesce(p_wert, false) WHERE id = p_user_id;
  INSERT INTO admin_audit_log (admin_id, action_type, object_type, object_id, object_label, details, department_id)
  VALUES (auth.uid(), 'user.vertretungsplaner', 'user', p_user_id::text, abw_name(p_user_id),
          jsonb_build_object('alt', v_alt, 'neu', coalesce(p_wert, false)), NULL);
END;
$$;

-- Rolle entzogen → Planer-Recht fällt weg (wie die Fach-Zuständigkeiten, PROJ-48).
CREATE FUNCTION abw_planer_bei_rollenentzug() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.role = 'student' AND OLD.role <> 'student' THEN
    NEW.ist_vertretungsplaner := false;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER abw_planer_bei_rollenentzug BEFORE UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION abw_planer_bei_rollenentzug();

-- ── 7. Ausführungsrechte ─────────────────────────────────────────────────

REVOKE ALL ON FUNCTION
  abw_heute(), abw_ist_planer(), abw_assert_teacher(), abw_name(uuid), abw_darf_bearbeiten(uuid, uuid),
  abw_zeitraum_text(date, date), abw_hinweis(uuid, uuid, text, text), abw_protokoll(text, uuid, text, jsonb),
  abw_pruefe_eingabe(uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text, uuid),
  abw_planer_bei_rollenentzug(),
  abw_liste(date, date, text, text, uuid, text, integer, integer), abw_eintrag(uuid),
  abw_ueberschneidungen(uuid, date, date, uuid), abw_lehrkraefte(), abw_arten(), abw_hinweise(),
  abw_offene_vertretungen(), abw_ich(),
  abw_anlegen(uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text),
  abw_aendern(uuid, integer, uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text),
  abw_loeschen(uuid, integer), abw_wiederherstellen(uuid), abw_vertretung_setzen(uuid, integer, text),
  abw_hinweis_gesehen(uuid), abw_art_speichern(uuid, text, text, text, boolean, boolean),
  abw_arten_sortieren(uuid[]), abw_planer_setzen(uuid, boolean)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  abw_liste(date, date, text, text, uuid, text, integer, integer), abw_eintrag(uuid),
  abw_ueberschneidungen(uuid, date, date, uuid), abw_lehrkraefte(), abw_arten(), abw_hinweise(),
  abw_offene_vertretungen(), abw_ich(),
  abw_anlegen(uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text),
  abw_aendern(uuid, integer, uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text),
  abw_loeschen(uuid, integer), abw_wiederherstellen(uuid), abw_vertretung_setzen(uuid, integer, text),
  abw_hinweis_gesehen(uuid), abw_art_speichern(uuid, text, text, text, boolean, boolean),
  abw_arten_sortieren(uuid[]), abw_planer_setzen(uuid, boolean)
TO authenticated;

-- ── 8. Live-Aktualisierung (Supabase Realtime) ───────────────────────────
-- Realtime prüft für jeden Empfänger die SELECT-Regeln oben.

ALTER PUBLICATION supabase_realtime ADD TABLE abwesenheiten, kalender_hinweise;

COMMIT;
