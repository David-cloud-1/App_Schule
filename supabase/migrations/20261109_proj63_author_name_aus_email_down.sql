-- Rollback für 20261109_proj63_author_name_aus_email.sql (Stand von 20261030)
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
