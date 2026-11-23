-- Rückweg zu 20261127_proj127_rollen_umstellung.sql (PROJ-127, Teil 2)
--
-- Setzt genau die Konten, die die Umstellung laut Änderungsprotokoll
-- umgestellt hat, wieder auf 'department_admin', sofern sie noch
-- 'teacher' sind. Wer inzwischen eine andere Rolle hat (z. B. vom
-- Super-Admin bewusst geändert), bleibt unberührt.
--
-- Achtung: Der Trigger remove_assignments_on_role_change löscht beim
-- Wechsel weg von 'teacher' die selbst eingetragenen Fach-Zuständigkeiten
-- (PROJ-48) dieser Konten. Vorher prüfen, ob das gewollt ist.
-- Vor diesem Rückweg den Code zurückrollen (sonst sehen Bereichs-Admins
-- trotzdem die Lehrkraft-Verwaltung).

BEGIN;

WITH umgestellt AS (
  SELECT DISTINCT l.object_id::uuid AS id
  FROM public.admin_audit_log l
  WHERE l.action_type = 'user.role_change'
    AND l.details->>'quelle' = 'PROJ-127'
    AND l.details->>'from' = 'department_admin'
),
zurueck AS (
  UPDATE public.profiles p
  SET role = 'department_admin'
  FROM umgestellt u
  WHERE p.id = u.id AND p.role = 'teacher'
  RETURNING p.id, p.department_id
)
INSERT INTO public.admin_audit_log (admin_id, admin_name, action_type, object_type, object_id, details, department_id)
SELECT NULL, 'Rückweg PROJ-127', 'user.role_change', 'user', z.id::text,
       jsonb_build_object('from', 'teacher', 'to', 'department_admin', 'quelle', 'PROJ-127-rueckweg'),
       z.department_id
FROM zurueck z;

COMMIT;
