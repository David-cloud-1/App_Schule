-- Rollback PROJ-31: nur die hier angelegten Tourismus-Items entfernen, sofern
-- noch niemand sie gekauft hat (user_shop_items.item_id ist ON DELETE RESTRICT;
-- bereits gekaufte Items stattdessen im Admin deaktivieren).
DELETE FROM shop_items
USING departments d
WHERE d.id = shop_items.department_id
  AND d.code = 'TOUR'
  AND shop_items.name IN ('Flugzeug', 'Reisebus', 'Kreuzfahrtschiff', 'Palme', 'Strandhotel',
                          'Reisekoffer', 'Globus', 'Reisepass', 'Weltreise-Pokal', 'Globetrotter-Stern')
  AND NOT EXISTS (SELECT 1 FROM user_shop_items u WHERE u.item_id = shop_items.id);
