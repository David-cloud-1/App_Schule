-- PROJ-76 Probe: Spalten und Zähl-Funktion. Rollt am Ende ZURÜCK; der Fehler
-- "PROBE-ERGEBNIS" ist gewollt, nur die Zeilen darunter zählen.
-- Voraussetzung: Migration 20261116_proj76_nachweis_gruppen.sql ist eingespielt.
DO $$
DECLARE
  a uuid; s0 integer; s1 integer; s2 integer; off_slot integer; res text;
BEGIN
  SELECT id INTO a FROM graded_assessments LIMIT 1;
  IF a IS NULL THEN RAISE EXCEPTION 'PROBE-ERGEBNIS: kein Nachweis zum Testen vorhanden'; END IF;

  UPDATE graded_assessments SET groups_enabled = false WHERE id = a;
  off_slot := next_assessment_group_slot(a);

  UPDATE graded_assessments SET groups_enabled = true, group_join_counter = 0 WHERE id = a;
  s0 := next_assessment_group_slot(a);
  s1 := next_assessment_group_slot(a);
  s2 := next_assessment_group_slot(a);

  res := format('Ohne Gruppen: %s (erwartet NULL) | Positionen: %s,%s,%s (erwartet 0,1,2) | Zähler: %s (erwartet 3)',
    coalesce(off_slot::text, 'NULL'), s0, s1, s2,
    (SELECT group_join_counter FROM graded_assessments WHERE id = a));
  RAISE EXCEPTION 'PROBE-ERGEBNIS: %', res;
END $$;
