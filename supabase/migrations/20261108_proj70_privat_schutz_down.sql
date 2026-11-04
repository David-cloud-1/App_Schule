-- Rückweg: Zustand nach 20261107_proj70_inhalte_offen (BUG-1 wieder offen)
BEGIN;
CREATE OR REPLACE FUNCTION can_admin_question(p_question_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT has_teacher_role()
$$;
COMMIT;
