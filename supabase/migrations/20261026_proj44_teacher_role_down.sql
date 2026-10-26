-- Rückweg zu 20261026_proj44_teacher_role.sql
--
-- ACHTUNG: Konten mit role = 'teacher' müssen vorher auf eine andere Rolle
-- gesetzt werden (z. B. 'student'), sonst schlägt der Constraint fehl.
UPDATE profiles SET role = 'student' WHERE role = 'teacher';

REVOKE UPDATE (teacher_welcome_seen) ON profiles FROM authenticated;
ALTER TABLE profiles DROP COLUMN teacher_welcome_seen;

ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['student'::text, 'admin'::text, 'department_admin'::text]));
