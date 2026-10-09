-- Rollback PROJ-32
ALTER TABLE shop_items
  DROP CONSTRAINT IF EXISTS shop_items_rarity_override_check,
  DROP COLUMN IF EXISTS rarity_override;
