-- PROJ-74/78: question_difficulty_stats lief in die Zeitgrenze (8 s, Fehler 57014).
--
-- Ursache: Die Datenbank schätzt die Zahl der Fragen falsch (1 statt ~3300)
-- und wählt verschachtelte Schleifen. Dadurch wird die „häufigste falsche
-- Antwort“ für jede Frage neu berechnet (~10 s). Ohne Schleifen-Joins: ~0,6 s.
--
-- Änderung: nur eine Einstellung an der Funktion, Inhalt bleibt gleich.
-- Rückweg: 20261117_proj74_stats_schneller_down.sql

ALTER FUNCTION question_difficulty_stats(uuid[], integer, integer, uuid)
  SET enable_nestloop = off;
