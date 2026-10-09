-- PROJ-34: Bezeichnung „Mein Betrieb“ für den Fachbereich Spedition
--
-- Reine Datenänderung. Tourismus bleibt unverändert („Reisebüro“) bis PROJ-35.
-- Alle Textstellen nutzen hof_name / hof_short_name („Mein …“, „Zum …“,
-- „… -Items“); der Shop-Titel zeigt bei Bereichen mit Aufbau-Welt „Shop“.

UPDATE departments
SET hof_name = 'Betrieb', hof_short_name = 'Betrieb'
WHERE code = 'SPED';
