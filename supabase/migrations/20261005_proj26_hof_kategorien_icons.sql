-- PROJ-26: Visuelle Hof-Szene & kategorisierter Item-Katalog
--
-- shop_items bekommt zwei neue Felder:
--   - category:  eine von vier festen Kategorien (bestimmt die Zone in der
--                Hof-Szene, src/components/hof-gallery.tsx)
--   - icon_key:  Verweis auf eine Illustration im Icon-Set des Fachbereichs
--                (src/lib/hof-icons.tsx) — ersetzt das freie Emoji-Textfeld
--                als primäre Darstellung
--
-- Das bestehende `icon`-Feld bleibt als Fallback erhalten (für den Fall,
-- dass ein icon_key einmal nicht auflösbar ist), wird aber für neue Items
-- nicht mehr befüllt — daher wird NOT NULL davon entfernt.

BEGIN;

ALTER TABLE shop_items
  ADD COLUMN category text,
  ADD COLUMN icon_key text;

-- Rückwirkende Zuordnung der 4 Spedition-Bestandsitems aus PROJ-20 (passende
-- Icon-Schlüssel siehe src/lib/hof-icons.tsx, SPED_ICONS).
UPDATE shop_items SET category = 'fahrzeuge', icon_key = 'sattelschlepper-rot'
  WHERE name = 'Roter Sattelschlepper';
UPDATE shop_items SET category = 'gebaeude_deko', icon_key = 'ampel'
  WHERE name = 'Ampel-Deko';
UPDATE shop_items SET category = 'gebaeude_deko', icon_key = 'hoftor'
  WHERE name = 'Neues Lagertor';
UPDATE shop_items SET category = 'gebaeude_deko', icon_key = 'wachhund'
  WHERE name = 'Wachhund Bello';

-- Sicherer Rückfall für unerwartete, nicht benannte Bestandsitems (z. B. aus
-- einer anderen Umgebung/Seed) — verhindert, dass NOT NULL unten fehlschlägt.
UPDATE shop_items SET category = 'abzeichen_trophaeen' WHERE category IS NULL;
UPDATE shop_items SET icon_key = 'pokal' WHERE icon_key IS NULL;

ALTER TABLE shop_items
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN icon_key SET NOT NULL,
  ALTER COLUMN icon DROP NOT NULL;

ALTER TABLE shop_items
  ADD CONSTRAINT shop_items_category_check
  CHECK (category IN ('fahrzeuge', 'gebaeude_deko', 'ladung_ausstattung', 'abzeichen_trophaeen'));

COMMIT;
