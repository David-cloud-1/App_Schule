-- PROJ-70: Lehrkräfte-Bereich – Inhalte offen für alle, lückenlos protokolliert
--
-- 1. Die drei zentralen Rechte-Funktionen (PROJ-48) geben jeder Lehrer-Rolle
--    Zugriff auf Fragen, Themen, Fächer und Prüfungssets aller Bereiche.
--    Die Policies selbst bleiben unverändert, sie hängen an diesen Funktionen.
--    NICHT angefasst: can_admin_department & Co. (Schülerdaten, Nutzer, Noten).
-- 2. Der Verlauf (content_versions) ist für alle Lehrer-Rollen lesbar.
-- 3. Echtes Löschen der vier Inhaltstabellen nur noch für den Super-Admin
--    (Papierkorb bleibt der Weg für alle anderen).

BEGIN;

-- ── 1. Rechte-Funktionen öffnen ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION can_admin_subject(p_subject_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT has_teacher_role()
$$;

CREATE OR REPLACE FUNCTION can_admin_department_content(p_department_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT has_teacher_role()
$$;

-- Private Nachweis-Fragen (PROJ-46) laufen weiter über can_edit_question /
-- can_manage_private_question und die privaten Zweige der Policies.
CREATE OR REPLACE FUNCTION can_admin_question(p_question_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT has_teacher_role()
$$;

-- ── 2. Verlauf für alle Lehrer-Rollen lesbar ────────────────────────────
-- Versionen privater Nachweis-Fragen (department_id NULL) bleiben beim
-- Besitzer; alles mit Bereich ist für Lehrer-Rollen sichtbar.

ALTER POLICY content_versions_read ON content_versions
  USING (
    is_admin()
    OR can_admin_department(department_id)
    OR (has_teacher_role() AND (department_id IS NOT NULL OR changed_by = auth.uid()))
  );

-- ── 3. Kein hartes Löschen außer durch den Super-Admin ──────────────────
-- Ausnahmen:
--  * auth.uid() IS NULL: Dienst-Zugriffe und Skripte (Konto löschen, Läufe)
--  * private Nachweis-Fragen (PROJ-46)
--  * Rückbau von Inhalten, die dieselbe Person in den letzten 15 Minuten
--    selbst angelegt hat (Import-Abbruch räumt halb angelegte Fragen auf)

CREATE OR REPLACE FUNCTION content_is_fresh_own(p_type text, p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM content_versions
    WHERE content_type = p_type AND content_id = p_id
      AND change_type = 'created'
      AND changed_by = auth.uid()
      AND created_at > now() - interval '15 minutes'
  )
$$;

CREATE OR REPLACE FUNCTION guard_hard_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_type text := TG_ARGV[0];
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN
    RETURN OLD;
  END IF;
  IF v_type = 'question' AND COALESCE((to_jsonb(OLD)->>'is_private')::boolean, false) THEN
    RETURN OLD;
  END IF;
  IF content_is_fresh_own(v_type, OLD.id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Endgültiges Löschen ist nur dem Super-Admin erlaubt. Bitte in den Papierkorb legen.'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_questions_guard_delete BEFORE DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION guard_hard_delete('question');
CREATE TRIGGER trg_topics_guard_delete BEFORE DELETE ON topics
  FOR EACH ROW EXECUTE FUNCTION guard_hard_delete('topic');
CREATE TRIGGER trg_subjects_guard_delete BEFORE DELETE ON subjects
  FOR EACH ROW EXECUTE FUNCTION guard_hard_delete('subject');
CREATE TRIGGER trg_exam_question_sets_guard_delete BEFORE DELETE ON exam_question_sets
  FOR EACH ROW EXECUTE FUNCTION guard_hard_delete('exam_question_set');

COMMIT;
