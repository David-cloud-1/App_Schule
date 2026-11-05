-- PROJ-63: Hat eine Lehrkraft keinen Anzeigenamen, zeigte das Lehrerzimmer
-- überall „Lehrkraft“. Jetzt wird der Name aus dem ersten Teil der
-- E-Mail-Adresse gebildet („david.zach@…“ wird zu „David Zach“). Die
-- Adresse selbst bleibt unsichtbar. Ein gesetzter Anzeigename gilt weiter zuerst.
--
-- Rückweg: 20261109_proj63_author_name_aus_email_down.sql

CREATE OR REPLACE FUNCTION forum_author_name(p_author_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN NOT has_teacher_role() THEN NULL
    WHEN p_author_id IS NULL THEN 'Ehemalige Lehrkraft'
    ELSE coalesce(
      (
        SELECT coalesce(
          nullif(btrim(pr.display_name), ''),
          nullif(
            btrim(initcap(regexp_replace(split_part(u.email, '@', 1), '[._-]+', ' ', 'g'))),
            ''
          )
        )
        FROM profiles pr
        LEFT JOIN auth.users u ON u.id = pr.id
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
