-- PROJ-24 BUG-1 — RÜCKWEG (nur bei Bedarf manuell ausführen)

BEGIN;

ALTER POLICY shop_items_select_active ON shop_items
  USING (is_active = true);

ALTER POLICY "Users read active exam sets" ON exam_question_sets
  USING (is_active = true);

COMMIT;
