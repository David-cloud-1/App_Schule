-- PROJ-24 BUG-1 (QA 2026-09-30, High): shop_items und exam_question_sets
-- blieben über ihre vorbestehenden "aktiv"-Policies bereichsübergreifend
-- lesbar — unabhängig von der neuen bereichsbewussten Admin-Policie, weil
-- RLS-Policies permissiv ODER-verknüpft werden. Betraf nur den direkten
-- Datenbank-/REST-Zugriff; die Admin-Routen selbst filtern bereits korrekt
-- per Code (eq('department_id', departmentId)).
--
-- Fix: beide Policies zusätzlich auf den eigenen Bereich einschränken.
-- my_department_id() liefert für eingeloggte Nutzer (Azubis wie Admins)
-- ihren eigenen Bereich; der Super-Admin bleibt über die separate
-- can_admin_department()-Policy unverändert uneingeschränkt (Policies sind
-- permissiv ODER-verknüpft).

BEGIN;

ALTER POLICY shop_items_select_active ON shop_items
  USING (is_active = true AND department_id = my_department_id());

ALTER POLICY "Users read active exam sets" ON exam_question_sets
  USING (is_active = true AND department_id = my_department_id());

COMMIT;
