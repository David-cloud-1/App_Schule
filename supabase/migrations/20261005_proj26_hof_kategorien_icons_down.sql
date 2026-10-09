-- PROJ-26 — RÜCKWEG (nur bei Bedarf manuell ausführen)
--
-- Hinweis: Items, die nach der Hinauf-Migration neu angelegt wurden, haben
-- vermutlich kein icon (Emoji) mehr gesetzt — werden hier mit '' aufgefüllt,
-- damit NOT NULL nicht fehlschlägt.

BEGIN;

ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_category_check;

UPDATE shop_items SET icon = '' WHERE icon IS NULL;

ALTER TABLE shop_items
  ALTER COLUMN icon SET NOT NULL,
  DROP COLUMN category,
  DROP COLUMN icon_key;

COMMIT;
