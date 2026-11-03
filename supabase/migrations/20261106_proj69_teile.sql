-- PROJ-69: Werkzeugkiste – kostenloser Weg in Teilen (lange Skripte)
--
-- Eine neue Angabe am Ablauf: die Teil-Liste. Je Teil stehen darin Nummer, Auswahl,
-- Zustand, Kapiteltitel und das Ergebnis der Prüfstelle. Die Teil-Antworten selbst
-- liegen als Dateien (teil-frei-<nr>.yaml) im privaten Speicher des Ablaufs.
--
-- NULL = kein Teil-Weg (kurzes Skript, anderes Werkzeug, alte Entwürfe). Es gibt
-- keine neue Tabelle und keine neue Regel: Die Zeilen-Regeln von werkzeug_ablaeufe
-- (nur eigene Abläufe mit Lehrer-Rolle) gelten für die Spalte von selbst.

ALTER TABLE public.werkzeug_ablaeufe
  ADD COLUMN IF NOT EXISTS teile jsonb
  CHECK (teile IS NULL OR (jsonb_typeof(teile) = 'object' AND pg_column_size(teile) <= 200000));
