-- Probe PROJ-127 (nur lesen): Wen stellt die Rollen-Umstellung um?
-- Ändert nichts. Zeigt alle Konten mit der Rolle Bereichs-Admin mit
-- Name, E-Mail und Bereich. Vor 20261127_proj127_rollen_umstellung.sql ansehen.
SELECT
  coalesce(nullif(btrim(concat_ws(' ', btrim(p.first_name), btrim(p.last_name))), ''), p.display_name) AS name,
  u.email,
  d.name AS bereich,
  p.department_id IS NULL AS ohne_bereich,
  u.last_sign_in_at::date AS zuletzt_angemeldet,
  (u.banned_until IS NOT NULL AND u.banned_until > now()) AS gesperrt
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN public.departments d ON d.id = p.department_id
WHERE p.role = 'department_admin'
ORDER BY d.name NULLS LAST, name;
