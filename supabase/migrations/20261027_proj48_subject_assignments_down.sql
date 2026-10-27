-- Rollback für PROJ-48: Fach-Zuständigkeiten für Lehrkräfte

BEGIN;

-- ── restore_content_version & content_versions_read zurück ─────────────

CREATE OR REPLACE FUNCTION public.restore_content_version(p_content_type text, p_content_id uuid, p_version_number integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_data jsonb;
BEGIN
  SELECT data INTO v_data FROM content_versions
  WHERE content_type = p_content_type AND content_id = p_content_id AND version_number = p_version_number;

  IF v_data IS NULL THEN
    RAISE EXCEPTION 'Version nicht gefunden';
  END IF;

  PERFORM set_config('app.change_type_override', 'restored', true);
  PERFORM set_config('app.change_restore_source', p_version_number::text, true);

  IF p_content_type = 'question' THEN
    IF NOT (
      is_admin() OR is_department_admin()
      OR (has_teacher_role() AND can_manage_private_question((SELECT owner_id FROM questions WHERE id = p_content_id)))
    ) THEN
      RAISE EXCEPTION 'nicht berechtigt';
    END IF;

    UPDATE questions SET
      question_text = v_data->>'question_text',
      explanation = v_data->>'explanation',
      difficulty = v_data->>'difficulty',
      type = v_data->>'type',
      sample_answer = v_data->>'sample_answer',
      class_level = (v_data->>'class_level')::integer,
      topic_id = (v_data->>'topic_id')::uuid,
      is_active = (v_data->>'is_active')::boolean,
      assessment_only = (v_data->>'assessment_only')::boolean,
      is_private = (v_data->>'is_private')::boolean,
      owner_id = (v_data->>'owner_id')::uuid
    WHERE id = p_content_id;

    INSERT INTO answer_options (question_id, option_text, is_correct, display_order)
    SELECT p_content_id, opt->>'option_text', (opt->>'is_correct')::boolean, (opt->>'display_order')::integer
    FROM jsonb_array_elements(COALESCE(v_data->'answer_options', '[]'::jsonb)) opt
    ON CONFLICT (question_id, display_order) DO UPDATE SET
      option_text = excluded.option_text,
      is_correct = excluded.is_correct;

    INSERT INTO question_subjects (question_id, subject_id)
    SELECT p_content_id, (sid.value)::uuid
    FROM jsonb_array_elements_text(COALESCE(v_data->'subject_ids', '[]'::jsonb)) sid(value)
    ON CONFLICT (question_id, subject_id) DO NOTHING;

  ELSIF p_content_type = 'topic' THEN
    IF NOT can_admin_department(subject_department((v_data->>'subject_id')::uuid)) THEN
      RAISE EXCEPTION 'nicht berechtigt';
    END IF;
    UPDATE topics SET
      name = v_data->>'name',
      subject_id = (v_data->>'subject_id')::uuid
    WHERE id = p_content_id;

  ELSIF p_content_type = 'subject' THEN
    IF NOT can_admin_department((v_data->>'department_id')::uuid) THEN
      RAISE EXCEPTION 'nicht berechtigt';
    END IF;
    UPDATE subjects SET
      name = v_data->>'name',
      code = v_data->>'code',
      color = v_data->>'color',
      icon_name = v_data->>'icon_name',
      is_active = (v_data->>'is_active')::boolean,
      description = v_data->>'description',
      sort_order = (v_data->>'sort_order')::integer
    WHERE id = p_content_id;

  ELSIF p_content_type = 'exam_question_set' THEN
    IF NOT can_admin_department((v_data->>'department_id')::uuid) THEN
      RAISE EXCEPTION 'nicht berechtigt';
    END IF;
    UPDATE exam_question_sets SET
      name = v_data->>'name',
      part = (v_data->>'part')::integer,
      question_ids = (SELECT array_agg(x.value)::uuid[] FROM jsonb_array_elements_text(v_data->'question_ids') x(value)),
      is_active = (v_data->>'is_active')::boolean,
      duration_minutes = (v_data->>'duration_minutes')::integer
    WHERE id = p_content_id;
  ELSE
    RAISE EXCEPTION 'Unbekannter Inhaltstyp';
  END IF;
END;
$$;

ALTER POLICY content_versions_read ON content_versions
  USING (
    is_admin()
    OR can_admin_department(department_id)
    OR (has_teacher_role() AND changed_by = auth.uid())
  );

-- ── Policies zurück auf den Stand vor PROJ-48 ───────────────────────────

ALTER POLICY "Admins manage exam question sets" ON exam_question_sets
  USING (can_admin_department(department_id))
  WITH CHECK (can_admin_department(department_id));

ALTER POLICY "topics: admin delete" ON topics
  USING (can_admin_department(subject_department(subject_id)));
ALTER POLICY "topics: admin update" ON topics
  USING (can_admin_department(subject_department(subject_id)));
ALTER POLICY "topics: admin insert" ON topics
  WITH CHECK (can_admin_department(subject_department(subject_id)));

ALTER POLICY question_subjects_admin_write ON question_subjects
  USING (
    CASE WHEN question_is_private(question_id) THEN can_edit_question(question_id) ELSE can_admin_department(subject_department(subject_id)) END
  )
  WITH CHECK (
    CASE WHEN question_is_private(question_id) THEN can_edit_question(question_id) ELSE can_admin_department(subject_department(subject_id)) END
  );

ALTER POLICY questions_read ON questions
  USING (
    (auth.role() = 'authenticated') AND
    CASE
      WHEN is_private THEN can_manage_private_question(owner_id)
      ELSE (is_active = true OR can_admin_department(question_department(id)))
    END
  );
ALTER POLICY questions_delete_admin ON questions
  USING (
    CASE WHEN is_private THEN can_manage_private_question(owner_id) ELSE can_admin_department(question_department(id)) END
  );
ALTER POLICY questions_update_admin ON questions
  USING (
    CASE WHEN is_private THEN can_manage_private_question(owner_id) ELSE can_admin_department(question_department(id)) END
  );
ALTER POLICY questions_insert_admin ON questions
  WITH CHECK (
    CASE
      WHEN is_private THEN (owner_id = auth.uid() AND has_teacher_role())
      ELSE (is_admin() OR is_department_admin())
    END
  );

ALTER POLICY subjects_admin_write ON subjects
  USING (can_admin_department(department_id))
  WITH CHECK (can_admin_department(department_id));

CREATE OR REPLACE FUNCTION public.can_edit_question(p_question_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE((SELECT CASE WHEN q.is_private THEN can_manage_private_question(q.owner_id) ELSE can_admin_department(question_department(q.id)) END FROM questions q WHERE q.id = p_question_id), false)
$$;

-- ── Trigger & Funktionen ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_profiles_remove_assignments_on_role_change ON profiles;
DROP FUNCTION IF EXISTS remove_assignments_on_role_change();

DROP TRIGGER IF EXISTS trg_subjects_auto_assign_creator ON subjects;
DROP FUNCTION IF EXISTS auto_assign_subject_creator();

DROP FUNCTION IF EXISTS can_admin_question(uuid);
DROP FUNCTION IF EXISTS can_admin_department_content(uuid);
DROP FUNCTION IF EXISTS can_admin_subject(uuid);
DROP FUNCTION IF EXISTS has_teacher_assignment_subject(uuid);
DROP FUNCTION IF EXISTS has_teacher_assignment_department(uuid);

DROP TRIGGER IF EXISTS trg_teacher_subject_assignments_check ON teacher_subject_assignments;
DROP FUNCTION IF EXISTS check_teacher_assignment_subject_department();

-- ── Tabelle ──────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS teacher_subject_assignments;

COMMIT;
