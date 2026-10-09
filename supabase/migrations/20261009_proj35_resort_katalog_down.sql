-- Rollback PROJ-35: nur die hier angelegten Items entfernen, sofern noch niemand sie
-- gekauft hat (user_shop_items.item_id ist ON DELETE RESTRICT; gekaufte Items
-- stattdessen im Admin deaktivieren). Bezeichnung zurück auf „Reisebüro“.
DELETE FROM shop_items
USING departments d
WHERE d.id = shop_items.department_id
  AND d.code = 'TOUR'
  AND shop_items.name IN ('Rezeption', 'Minigolf', 'Spielplatz', 'Strandbar', 'Pool', 'Restaurant', 'Sonnenliegen', 'Brunnen', 'Shuttlebus')
  AND NOT EXISTS (SELECT 1 FROM user_shop_items u WHERE u.item_id = shop_items.id);

UPDATE departments SET hof_name = 'Reisebüro', hof_short_name = 'Büro' WHERE code = 'TOUR';
