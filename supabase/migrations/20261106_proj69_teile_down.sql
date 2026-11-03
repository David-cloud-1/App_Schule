-- Rücknahme von 20261106_proj69_teile.sql
-- ACHTUNG: verwirft die Teil-Listen aller laufenden Entwürfe (die Teil-Dateien im Speicher bleiben liegen).
ALTER TABLE public.werkzeug_ablaeufe DROP COLUMN IF EXISTS teile;
