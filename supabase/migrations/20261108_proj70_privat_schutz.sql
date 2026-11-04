-- PROJ-70 (QA BUG-1): Private Nachweis-Fragen (PROJ-46) bleiben beim Besitzer.
-- can_admin_question gab seit 20261107_proj70_inhalte_offen jeder Lehrer-Rolle
-- „ja“, auch für is_private-Fragen. restore_content_version (SECURITY DEFINER)
-- prüft u. a. can_admin_question und hätte so fremde private Fragen
-- zurückgesetzt. Jetzt gilt „offen für alle“ nur für nicht private Fragen;
-- Besitzer und Super-Admin laufen weiter über can_manage_private_question
-- bzw. is_admin() in den Policies und in restore_content_version.

BEGIN;

CREATE OR REPLACE FUNCTION can_admin_question(p_question_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT has_teacher_role()
    AND NOT COALESCE((SELECT q.is_private FROM questions q WHERE q.id = p_question_id), false)
$$;

COMMIT;
