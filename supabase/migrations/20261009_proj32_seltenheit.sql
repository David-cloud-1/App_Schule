-- PROJ-32: Seltenheit von Hof-Items
--
-- Optionales Feld: leer = Seltenheit wird automatisch aus dem aktuellen Preis
-- abgeleitet (src/lib/hof-rarity.ts), sonst gilt der Admin-Wert. Bestehende
-- Items brauchen keinen Wert; es wird nichts umgeschrieben.

ALTER TABLE shop_items
  ADD COLUMN rarity_override text,
  ADD CONSTRAINT shop_items_rarity_override_check
  CHECK (rarity_override IS NULL OR rarity_override IN ('standard', 'selten', 'episch'));
