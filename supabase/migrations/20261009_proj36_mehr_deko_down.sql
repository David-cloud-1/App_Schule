-- Rollback PROJ-36: nur die hier angelegten Items entfernen, sofern noch niemand
-- sie gekauft hat (user_shop_items.item_id ist ON DELETE RESTRICT; gekaufte Items
-- stattdessen im Admin deaktivieren).
DELETE FROM shop_items
USING departments d
WHERE d.id = shop_items.department_id
  AND NOT EXISTS (SELECT 1 FROM user_shop_items u WHERE u.item_id = shop_items.id)
  AND (
    (d.code = 'SPED' AND shop_items.icon_key IN ('muelleimer','hecke','blumenkuebel','verkehrsschild','parkbank','reifenstapel','oelfaesser','schranke','hubwagen','rasttisch','werbeschild','schuppen','kipper','wetterfahne','brueckenwaage','abschleppwagen','imbisswagen','containerturm','tankwagen','wasserturm'))
    OR
    (d.code = 'TOUR' AND shop_items.icon_key IN ('lebhecke','sandburg','resort-blumen','rettungsring','tikifackeln','gartenlaterne','surfbretter','fahrradstaender','strandkorb','haengematte','golfcart','volleyballfeld','lotusteich','tuktuk','hochzeitsbogen','pavillon','bungalow','eisdiele','saunahaus','tennisplatz'))
  );
