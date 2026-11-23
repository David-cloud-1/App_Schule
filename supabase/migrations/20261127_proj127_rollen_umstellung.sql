-- PROJ-127: Rollen-Umstellung (Teil 2 von 2) – Bereichs-Admins werden Lehrkräfte
--
-- ERST einspielen, wenn Teil 1 (20261126_proj127_verwaltung_fuer_alle.sql)
-- und der Code live sind und die Probe supabase/tests/proj127_betroffene_probe.sql
-- angesehen wurde.
--
-- - Jedes Konto mit role = 'department_admin' wird 'teacher'.
-- - Pro Konto ein Eintrag im Änderungsprotokoll (action_type
--   'user.role_change', details.quelle = 'PROJ-127'). Diese Einträge sind
--   zugleich die Liste für den Rückweg (…_rollen_umstellung_down.sql).
-- - Der Bereich im Profil (department_id) bleibt stehen.
-- - Die Rolle 'department_admin' bleibt in der Datenbank erlaubt (Rückweg).
-- - Wiederholbar: ein zweiter Lauf findet niemanden mehr und ändert nichts.

BEGIN;

WITH betroffen AS (
  SELECT p.id, p.department_id,
         coalesce(nullif(btrim(concat_ws(' ', btrim(p.first_name), btrim(p.last_name))), ''), p.display_name) AS name
  FROM public.profiles p
  WHERE p.role = 'department_admin'
  FOR UPDATE
),
protokoll AS (
  INSERT INTO public.admin_audit_log (admin_id, admin_name, action_type, object_type, object_id, object_label, details, department_id)
  SELECT NULL,
         'Umstellung PROJ-127',
         'user.role_change',
         'user',
         b.id::text,
         b.name,
         jsonb_build_object('from', 'department_admin', 'to', 'teacher', 'quelle', 'PROJ-127'),
         b.department_id
  FROM betroffen b
  RETURNING object_id
)
UPDATE public.profiles p
SET role = 'teacher'
FROM protokoll pr
WHERE p.id = pr.object_id::uuid
  AND p.role = 'department_admin';

COMMIT;
