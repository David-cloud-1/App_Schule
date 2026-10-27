-- PROJ-47: „Diese Version wiederherstellen" als eigene, klar erkennbare
-- Änderung (change_type = 'restored'), statt in der generischen
-- „updated"-Erkennung zu verschwinden.

CREATE OR REPLACE FUNCTION record_content_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_type text := TG_ARGV[0];
  v_change_type text;
  v_override text;
  v_restore_source text;
  v_snapshot jsonb;
  v_department uuid;
  v_batch uuid;
  v_actor_label text;
  v_old_json jsonb;
  v_new_json jsonb;
  v_old_deleted_at timestamptz;
  v_new_deleted_at timestamptz;
  v_old_is_active boolean;
  v_new_is_active boolean;
BEGIN
  v_batch := NULLIF(current_setting('app.change_batch_id', true), '')::uuid;
  v_actor_label := NULLIF(current_setting('app.change_actor_label', true), '');
  -- Von restore_content_version() für die Dauer des Wiederherstellens gesetzt
  -- (transaktionslokal), damit der Trigger den Vorgang klar als „restored"
  -- erkennt statt generisch als „updated".
  v_override := NULLIF(current_setting('app.change_type_override', true), '');
  v_restore_source := NULLIF(current_setting('app.change_restore_source', true), '');

  IF TG_OP = 'DELETE' THEN
    v_old_json := to_jsonb(OLD);
    v_department := CASE v_type
      WHEN 'question' THEN question_department(OLD.id)
      WHEN 'topic' THEN subject_department((v_old_json->>'subject_id')::uuid)
      ELSE (v_old_json->>'department_id')::uuid
    END;
    INSERT INTO content_versions (content_type, content_id, version_number, change_type, data, department_id, changed_by, changed_by_label, batch_id)
    VALUES (v_type, OLD.id, OLD.version_number, 'deleted', v_old_json, v_department, auth.uid(), v_actor_label, v_batch);
    RETURN OLD;
  END IF;

  v_new_json := to_jsonb(NEW);

  IF v_override IS NOT NULL THEN
    v_change_type := v_override;
  ELSIF TG_OP = 'INSERT' THEN
    v_change_type := 'created';
  ELSE
    v_old_json := to_jsonb(OLD);
    v_old_deleted_at := (v_old_json->>'deleted_at')::timestamptz;
    v_new_deleted_at := (v_new_json->>'deleted_at')::timestamptz;
    v_old_is_active := (v_old_json->>'is_active')::boolean;
    v_new_is_active := (v_new_json->>'is_active')::boolean;

    IF v_old_deleted_at IS NULL AND v_new_deleted_at IS NOT NULL THEN
      v_change_type := 'deleted';
    ELSIF v_old_deleted_at IS NOT NULL AND v_new_deleted_at IS NULL THEN
      v_change_type := 'restored';
    ELSIF v_old_is_active IS TRUE AND v_new_is_active IS FALSE THEN
      v_change_type := 'deactivated';
    ELSIF v_old_is_active IS FALSE AND v_new_is_active IS TRUE THEN
      v_change_type := 'activated';
    ELSE
      v_change_type := 'updated';
    END IF;
  END IF;

  v_department := CASE v_type
    WHEN 'question' THEN question_department(NEW.id)
    WHEN 'topic' THEN subject_department((v_new_json->>'subject_id')::uuid)
    ELSE (v_new_json->>'department_id')::uuid
  END;
  v_snapshot := CASE WHEN v_type = 'question' THEN question_snapshot(NEW.id) ELSE v_new_json END;
  IF v_restore_source IS NOT NULL THEN
    v_snapshot := v_snapshot || jsonb_build_object('_restored_from_version', v_restore_source::integer);
  END IF;

  INSERT INTO content_versions (content_type, content_id, version_number, change_type, data, department_id, changed_by, changed_by_label, batch_id)
  VALUES (v_type, NEW.id, NEW.version_number, v_change_type, v_snapshot, v_department, auth.uid(), v_actor_label, v_batch);

  RETURN NEW;
END;
$$;

-- Wendet eine vergangene Version wieder auf den Inhalt an. Bewusst ohne
-- DELETE: Antwortoptionen haben immer genau 5 feste Plätze (display_order
-- 1-5) und werden je Platz upgedated; Fach-Zuordnungen werden nur ergänzt
-- (seither zusätzlich angelegte Verknüpfungen bleiben erhalten — eine
-- bewusste Einschränkung, siehe Implementierungs-Notiz im Feature-Spec).
CREATE FUNCTION restore_content_version(
  p_content_type text,
  p_content_id uuid,
  p_version_number integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
