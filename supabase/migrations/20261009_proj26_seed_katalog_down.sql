-- Rollback: nur die hier ergänzten Items entfernen, sofern noch niemand sie gekauft hat
-- (user_shop_items.item_id ist ON DELETE RESTRICT; gekaufte Items stattdessen deaktivieren).
DELETE FROM shop_items
WHERE name IN ('Blauer Transporter', 'Europalette', 'Seecontainer', 'Pokal', 'Stern-Abzeichen')
  AND NOT EXISTS (SELECT 1 FROM user_shop_items u WHERE u.item_id = shop_items.id);
