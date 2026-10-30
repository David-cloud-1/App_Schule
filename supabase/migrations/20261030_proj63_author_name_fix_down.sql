-- Rollback für 20261030_proj63_author_name_fix.sql (alter Stand der Funktion)
CREATE OR REPLACE FUNCTION forum_author_name(p_author_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN NOT has_teacher_role() THEN NULL
    WHEN p_author_id IS NULL THEN 'Ehemalige Lehrkraft'
    ELSE coalesce(
      (SELECT nullif(btrim(display_name), '') FROM profiles WHERE id = p_author_id),
      'Lehrkraft'
    )
  END
$$;
