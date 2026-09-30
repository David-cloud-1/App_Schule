-- PROJ-24: Fachbereichs-Admins & Rechtetrennung (Phase 3 aus mehrere-fachbereiche.md)
--
-- Führt die Rolle "department_admin" ein: Admin-Rechte, aber beschränkt auf
-- den eigenen Fachbereich. "admin" bleibt Super-Admin (alle Bereiche,
-- Rollenvergabe, Fachbereiche anlegen).
--
-- Migration der Bestandsdaten (E10, siehe features/PROJ-24-*.md): Nur
-- david.zach@spedtour... bleibt admin; die übrigen 11 heutigen Admin-Konten
-- werden department_admin (department_id bereits SPED aus PROJ-22).
--
-- Reihenfolge wie bei PROJ-22/23: additive Spalten + Backfill zuerst, dann
-- Policies. Rückweg: siehe 20260930_proj24_department_admins_down.sql.

BEGIN;

-- ── 1. Rolle erweitern ──────────────────────────────────────────────────────

ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['student'::text, 'admin'::text, 'department_admin'::text]));

-- Schützt davor, dass versehentlich der letzte Super-Admin abgestuft oder
-- gelöscht wird (Edge Case aus der Spec). Feuert nur im seltenen Fall, in dem
-- sich role tatsächlich von 'admin' wegbewegt — für die sehr viel häufigeren
-- XP/Streak-Updates bricht die Bedingung sofort ab, ohne die COUNT-Abfrage
-- auszuführen.
CREATE FUNCTION prevent_last_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role <> 'admin') THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'admin' AND id <> OLD.id) THEN
      RAISE EXCEPTION 'Mindestens ein Super-Admin (role = admin) muss bestehen bleiben';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_prevent_last_admin_change
  BEFORE UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_change();

-- ── 2. Migration der 12 Bestands-Admin-Konten (E10) ─────────────────────────

DO $$
DECLARE
  super_admin_id uuid := 'e1875c51-af8e-486e-96a5-974fb78ed349'; -- david.zach@spedtour...
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = super_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Erwartetes Super-Admin-Konto % nicht gefunden oder nicht mehr admin — Migration abgebrochen', super_admin_id;
  END IF;

  UPDATE profiles
  SET role = 'department_admin'
  WHERE role = 'admin' AND id <> super_admin_id;
END;
$$;

-- ── 3. Hilfsfunktionen (SECURITY DEFINER, wie is_admin()) ──────────────────

CREATE FUNCTION my_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT department_id FROM profiles WHERE id = auth.uid()
$$;

CREATE FUNCTION is_department_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'department_admin')
$$;

-- Darf die aufrufende Person den angegebenen Fachbereich verwalten?
-- NULL (z. B. eine verwaiste Frage ohne Fach-Zuordnung) darf nur der
-- Super-Admin anfassen — fail closed statt fail open.
CREATE FUNCTION can_admin_department(target_department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT is_admin() OR (
    is_department_admin()
    AND target_department_id IS NOT NULL
    AND target_department_id = my_department_id()
  )
$$;

-- Fachbereich eines Fachs (trivial, aber zentral — jede Stelle, die den
-- Bereich über das Fach ableitet, nutzt genau diese Funktion).
CREATE FUNCTION subject_department(p_subject_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT department_id FROM subjects WHERE id = p_subject_id
$$;

-- Fachbereich einer Frage über ihr (einziges) Fach. Fragen haben laut
-- Bestandsaufnahme (2026-09-29) immer genau eine question_subjects-Zeile.
CREATE FUNCTION question_department(p_question_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.department_id
  FROM question_subjects qs
  JOIN subjects s ON s.id = qs.subject_id
  WHERE qs.question_id = p_question_id
  LIMIT 1
$$;

-- ── 4. Fehlende Spalten für den bezahlten Upload-Pfad ───────────────────────
-- (Plan-Abschnitt 4.2 — bisher nur subject_id, kein department_id.)

ALTER TABLE generation_jobs ADD COLUMN department_id uuid REFERENCES departments(id);
UPDATE generation_jobs gj SET department_id = COALESCE(
  (SELECT s.department_id FROM subjects s WHERE s.id = gj.subject_id),
  fallback_department_id()
);
ALTER TABLE generation_jobs
  ALTER COLUMN department_id SET NOT NULL,
  ALTER COLUMN department_id SET DEFAULT fallback_department_id();
CREATE INDEX idx_generation_jobs_department_id ON generation_jobs(department_id);

ALTER TABLE questions_draft ADD COLUMN department_id uuid REFERENCES departments(id);
UPDATE questions_draft qd SET department_id = COALESCE(
  (SELECT s.department_id FROM subjects s WHERE s.id = qd.subject_id),
  fallback_department_id()
);
ALTER TABLE questions_draft
  ALTER COLUMN department_id SET NOT NULL,
  ALTER COLUMN department_id SET DEFAULT fallback_department_id();
CREATE INDEX idx_questions_draft_department_id ON questions_draft(department_id);

-- ── 5. RLS: bereichsbewusste Admin-Policies ─────────────────────────────────
-- is_admin() bleibt unverändert "Super-Admin" — departments-Policies (nur
-- Super-Admin darf Fachbereiche anlegen/bearbeiten/löschen) sind bereits
-- korrekt und werden nicht verändert.

-- subjects: hatte bisher GAR KEINE Schreib-Policy (Lücke seit PROJ-22 — die
-- bestehende Admin-Route schrieb bereits, aber ungeschützt gegen jede Rolle
-- ohne is_admin()-Check auf DB-Ebene). Wird hier zusammen mit PROJ-24 geschlossen.
CREATE POLICY subjects_admin_write ON subjects
  FOR ALL USING (can_admin_department(department_id)) WITH CHECK (can_admin_department(department_id));

-- questions: INSERT hat zum Einfüge-Zeitpunkt noch kein Fach verknüpft
-- (question_subjects folgt erst danach) — die Bereichsprüfung greift beim
-- Verknüpfen (question_subjects, s. u.). Lesen/Ändern/Löschen prüfen den
-- Bereich über das verknüpfte Fach.
ALTER POLICY questions_insert_admin ON questions
  WITH CHECK (is_admin() OR is_department_admin());
ALTER POLICY questions_update_admin ON questions
  USING (can_admin_department(question_department(id)));
ALTER POLICY questions_delete_admin ON questions
  USING (can_admin_department(question_department(id)));
ALTER POLICY questions_read ON questions
  USING ((auth.role() = 'authenticated') AND (is_active = true OR can_admin_department(question_department(id))));

ALTER POLICY answer_options_admin_write ON answer_options
  USING (can_admin_department(question_department(question_id)))
  WITH CHECK (can_admin_department(question_department(question_id)));

ALTER POLICY question_subjects_admin_write ON question_subjects
  USING (can_admin_department(subject_department(subject_id)))
  WITH CHECK (can_admin_department(subject_department(subject_id)));

ALTER POLICY "topics: admin insert" ON topics
  WITH CHECK (can_admin_department(subject_department(subject_id)));
ALTER POLICY "topics: admin update" ON topics
  USING (can_admin_department(subject_department(subject_id)));
ALTER POLICY "topics: admin delete" ON topics
  USING (can_admin_department(subject_department(subject_id)));

ALTER POLICY "Admins manage exam question sets" ON exam_question_sets
  USING (can_admin_department(department_id)) WITH CHECK (can_admin_department(department_id));

ALTER POLICY graded_assessments_admin_all ON graded_assessments
  USING (can_admin_department(department_id)) WITH CHECK (can_admin_department(department_id));

ALTER POLICY shop_items_admin_all ON shop_items
  USING (can_admin_department(department_id)) WITH CHECK (can_admin_department(department_id));

ALTER POLICY user_shop_items_admin_select ON user_shop_items
  USING (can_admin_department((SELECT si.department_id FROM shop_items si WHERE si.id = user_shop_items.item_id)));

ALTER POLICY "Admins manage draft questions" ON questions_draft
  USING (can_admin_department(department_id)) WITH CHECK (can_admin_department(department_id));

ALTER POLICY "Admins manage generation jobs" ON generation_jobs
  USING (can_admin_department(department_id)) WITH CHECK (can_admin_department(department_id));

ALTER POLICY quality_fix_progress_admin ON quality_fix_progress
  USING (can_admin_department(question_department(question_id)))
  WITH CHECK (can_admin_department(question_department(question_id)));

-- exam_parts / exam_part_subjects: nicht in der ursprünglichen Bestandsaufnahme
-- gelistet (department_id kam erst mit PROJ-22 dazu), gehören aber zur
-- Prüfungsverwaltung, die laut E9 zu den Bereichs-Admin-Rechten zählt.
ALTER POLICY exam_parts_admin_write ON exam_parts
  USING (can_admin_department(department_id)) WITH CHECK (can_admin_department(department_id));
ALTER POLICY exam_part_subjects_admin_write ON exam_part_subjects
  USING (can_admin_department((SELECT ep.department_id FROM exam_parts ep WHERE ep.id = exam_part_subjects.exam_part_id)))
  WITH CHECK (can_admin_department((SELECT ep.department_id FROM exam_parts ep WHERE ep.id = exam_part_subjects.exam_part_id)));

-- admin_audit_log: Bereichs-Admin sieht/schreibt nur eigenen Bereich,
-- Super-Admin weiterhin alles.
ALTER POLICY "Admins can read audit log" ON admin_audit_log
  USING (can_admin_department(department_id));
ALTER POLICY "Admins can insert audit log" ON admin_audit_log
  WITH CHECK (is_admin() OR is_department_admin());

-- profiles: Bereichs-Admin sieht nur Profile des eigenen Bereichs (Lesen).
-- Schreiben von role/department_id bleibt service-role-only (Code-Prüfung in
-- den Admin-Routen) — der Spalten-Grant aus 20260924_lock_profile_columns
-- bleibt unverändert, Nutzer können role/department_id ohnehin nicht selbst
-- setzen.
ALTER POLICY profiles_select_admin ON profiles
  USING (can_admin_department(department_id));

COMMIT;
