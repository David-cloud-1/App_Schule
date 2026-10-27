-- PROJ-47 QA-Fund: group_recent_versions_into_batch prüfte nur die Rolle,
-- nicht ob der konkrete Inhalt zum Bereich des Aufrufers gehört. Ein
-- Bereichs-Admin hätte per erratener content_id fremde, kürzlich erzeugte
-- Versionen in seinen eigenen Vorgang bündeln können (Sichtbarkeit blieb
-- durch die RLS auf content_versions zwar eingeschränkt, aber die
-- Zuordnung selbst war zu großzügig).

CREATE OR REPLACE FUNCTION group_recent_versions_into_batch(
  p_content_type text,
  p_content_ids uuid[],
  p_description text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_batch uuid;
BEGIN
  IF NOT (is_admin() OR is_department_admin() OR has_teacher_role()) THEN
    RAISE EXCEPTION 'nicht berechtigt';
  END IF;

  INSERT INTO content_change_batches (actor_id, description)
  VALUES (auth.uid(), p_description)
  RETURNING id INTO v_batch;

  UPDATE content_versions cv
  SET batch_id = v_batch
  WHERE cv.content_type = p_content_type
    AND cv.content_id = ANY (p_content_ids)
    AND cv.batch_id IS NULL
    AND cv.created_at >= now() - interval '2 minutes'
    AND (is_admin() OR can_admin_department(cv.department_id) OR cv.changed_by = auth.uid())
    AND cv.version_number = (
      SELECT max(cv2.version_number) FROM content_versions cv2
      WHERE cv2.content_type = cv.content_type AND cv2.content_id = cv.content_id
    );

  RETURN v_batch;
END;
$$;
