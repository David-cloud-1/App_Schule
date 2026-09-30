-- PROJ-24 — RÜCKWEG (nur bei Bedarf manuell ausführen)
--
-- Stellt den Zustand vor 20260930_proj24_department_admins.sql her: alle
-- department_admin-Konten werden wieder admin (Super-Admin), Policies
-- zurück auf reinen is_admin()-Check, Hilfsfunktionen entfernt.

BEGIN;

-- Profile: department_admin → admin (Zustand vor der Migration)
ALTER TABLE profiles DISABLE TRIGGER trg_prevent_last_admin_change;
UPDATE profiles SET role = 'admin' WHERE role = 'department_admin';
ALTER TABLE profiles ENABLE TRIGGER trg_prevent_last_admin_change;

ALTER POLICY profiles_select_admin ON profiles USING (is_admin());

ALTER POLICY "Admins can insert audit log" ON admin_audit_log
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
ALTER POLICY "Admins can read audit log" ON admin_audit_log
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY exam_part_subjects_admin_write ON exam_part_subjects USING (is_admin()) WITH CHECK (is_admin());
ALTER POLICY exam_parts_admin_write ON exam_parts USING (is_admin()) WITH CHECK (is_admin());

ALTER POLICY quality_fix_progress_admin ON quality_fix_progress
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY "Admins manage generation jobs" ON generation_jobs
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
ALTER POLICY "Admins manage draft questions" ON questions_draft
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY user_shop_items_admin_select ON user_shop_items
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY shop_items_admin_all ON shop_items
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY graded_assessments_admin_all ON graded_assessments
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY "Admins manage exam question sets" ON exam_question_sets
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY "topics: admin delete" ON topics
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
ALTER POLICY "topics: admin update" ON topics
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
ALTER POLICY "topics: admin insert" ON topics
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY question_subjects_admin_write ON question_subjects USING (is_admin()) WITH CHECK (is_admin());

ALTER POLICY answer_options_admin_write ON answer_options
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

ALTER POLICY questions_read ON questions
  USING ((auth.role() = 'authenticated') AND (is_active = true OR is_admin()));
ALTER POLICY questions_delete_admin ON questions USING (is_admin());
ALTER POLICY questions_update_admin ON questions USING (is_admin());
ALTER POLICY questions_insert_admin ON questions
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY subjects_admin_write ON subjects;

DROP FUNCTION question_department(uuid);
DROP FUNCTION subject_department(uuid);
DROP FUNCTION can_admin_department(uuid);
DROP FUNCTION is_department_admin();
DROP FUNCTION my_department_id();

ALTER TABLE questions_draft DROP COLUMN department_id;
ALTER TABLE generation_jobs DROP COLUMN department_id;

DROP TRIGGER trg_prevent_last_admin_change ON profiles;
DROP FUNCTION prevent_last_admin_change();

ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['student'::text, 'admin'::text]));

COMMIT;
