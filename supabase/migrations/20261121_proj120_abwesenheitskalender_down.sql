-- PROJ-120 Rückweg: entfernt den Abwesenheitskalender vollständig.
-- ACHTUNG: löscht alle Abwesenheiten, Hinweise, eigene Arten und das Planer-Recht.

BEGIN;

ALTER PUBLICATION supabase_realtime DROP TABLE abwesenheiten, kalender_hinweise;

DROP TRIGGER IF EXISTS abw_planer_bei_rollenentzug ON profiles;

DROP FUNCTION IF EXISTS
  abw_planer_bei_rollenentzug(),
  abw_planer_setzen(uuid, boolean),
  abw_arten_sortieren(uuid[]),
  abw_art_speichern(uuid, text, text, text, boolean, boolean),
  abw_hinweis_gesehen(uuid),
  abw_vertretung_setzen(uuid, integer, text),
  abw_wiederherstellen(uuid),
  abw_loeschen(uuid, integer),
  abw_aendern(uuid, integer, uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text),
  abw_anlegen(uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text),
  abw_ich(),
  abw_offene_vertretungen(),
  abw_hinweise(),
  abw_arten(),
  abw_lehrkraefte(),
  abw_ueberschneidungen(uuid, date, date, uuid),
  abw_eintrag(uuid),
  abw_liste(date, date, text, text, uuid, text, integer, integer),
  abw_pruefe_eingabe(uuid, uuid, date, date, boolean, time, time, boolean, text[], text, text, uuid),
  abw_protokoll(text, uuid, text, jsonb),
  abw_hinweis(uuid, uuid, text, text),
  abw_zeitraum_text(date, date),
  abw_darf_bearbeiten(uuid, uuid),
  abw_name(uuid),
  abw_assert_teacher(),
  abw_ist_planer(),
  abw_heute();

DROP TABLE IF EXISTS kalender_hinweise;
DROP TABLE IF EXISTS abwesenheit_abteilungen;
DROP TABLE IF EXISTS abwesenheiten;
DROP TABLE IF EXISTS abwesenheit_arten;
DROP TABLE IF EXISTS kalender_abteilungen;

ALTER TABLE profiles DROP COLUMN IF EXISTS ist_vertretungsplaner;

COMMIT;
