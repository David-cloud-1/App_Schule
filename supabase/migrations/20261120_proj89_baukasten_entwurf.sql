-- PROJ-89 (Baukasten-Editor, Paket 1): Entwurf am Material.
--
-- Der Editor bearbeitet ein fertiges Material als Struktur (Deckblatt, Themen,
-- Blöcke). Bis zum „Veröffentlichen" liegt diese Struktur als Entwurf neben der
-- veröffentlichten Fassung. Download, öffentlicher Link (PROJ-67) und Regal
-- (PROJ-53) lesen weiterhin nur die veröffentlichte Datei `ausgabe` – sie sehen
-- den Entwurf nie. Die Vorschau des Entwurfs liegt als eigene Datei im Ordner
-- des Materials (`entwurf.html`) und zählt zur Speichergröße.
--
-- Keine zweite Tabelle: Die Zugriffsregeln (RLS) aus PROJ-51 gelten unverändert –
-- nur die Besitzerin oder der Besitzer liest und schreibt den Entwurf.

ALTER TABLE public.werkzeug_ablaeufe
  -- Die bearbeitete Struktur; leer, solange niemand bearbeitet
  ADD COLUMN IF NOT EXISTS entwurf jsonb
    CHECK (entwurf IS NULL OR (jsonb_typeof(entwurf) = 'object' AND octet_length(entwurf::text) <= 2500000)),
  -- Zeitpunkt der letzten Entwurfs-Speicherung: Stand für die Zwei-Tabs-Regel
  ADD COLUMN IF NOT EXISTS entwurf_am timestamptz,
  -- Befunde der Prüfstelle zum Entwurf (wie `pruefung`, mit Stellen)
  ADD COLUMN IF NOT EXISTS entwurf_pruefung jsonb;

-- Für die Liste in „Meine Materialien": Pill „Entwurf", ohne den Entwurf zu laden
ALTER TABLE public.werkzeug_ablaeufe
  ADD COLUMN IF NOT EXISTS hat_entwurf boolean GENERATED ALWAYS AS (entwurf IS NOT NULL) STORED;
