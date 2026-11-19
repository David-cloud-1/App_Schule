-- Rückweg: nur möglich, solange kein Eintrag die Abteilung nutzt (abwesenheit_abteilungen löscht per CASCADE mit)
DELETE FROM kalender_abteilungen WHERE id = 'schulleitung';
