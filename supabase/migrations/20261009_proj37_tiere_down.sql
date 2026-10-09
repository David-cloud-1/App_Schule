-- Rollback PROJ-37: nur die Tier-Items entfernen, sofern noch niemand sie gekauft
-- hat (gekaufte stattdessen im Admin deaktivieren).
DELETE FROM shop_items
USING departments d
WHERE d.id = shop_items.department_id
  AND NOT EXISTS (SELECT 1 FROM user_shop_items u WHERE u.item_id = shop_items.id)
  AND (
    (d.code = 'SPED' AND shop_items.icon_key IN ('hofkatze', 'huehner', 'hofhund'))
    OR (d.code = 'TOUR' AND shop_items.icon_key IN ('krebs', 'strandhund', 'papagei', 'flamingo'))
  );
