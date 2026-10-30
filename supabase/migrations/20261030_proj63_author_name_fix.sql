-- PROJ-63 QA-Fund (niedrig): forum_author_name lieferte den Anzeigenamen zu
-- JEDER Profil-Kennung, also auch zu Azubis, wenn eine Lehrkraft die Funktion
-- direkt aufruft. Jetzt nur noch für Lehrer-Rollen und für Personen, die im
-- Lehrerzimmer geschrieben haben (z. B. nach Rollenverlust bleibt der Name,
-- wie in der Spec gefordert). Sonst „Lehrkraft“.
--
-- Rückweg: 20261030_proj63_author_name_fix_down.sql

CREATE OR REPLACE FUNCTION forum_author_name(p_author_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN NOT has_teacher_role() THEN NULL
    WHEN p_author_id IS NULL THEN 'Ehemalige Lehrkraft'
    ELSE coalesce(
      (
        SELECT nullif(btrim(pr.display_name), '')
        FROM profiles pr
        WHERE pr.id = p_author_id
          AND (
            pr.role IN ('teacher', 'department_admin', 'admin')
            OR EXISTS (SELECT 1 FROM forum_posts fp WHERE fp.author_id = p_author_id)
            OR EXISTS (SELECT 1 FROM forum_replies fr WHERE fr.author_id = p_author_id)
          )
      ),
      'Lehrkraft'
    )
  END
$$;
