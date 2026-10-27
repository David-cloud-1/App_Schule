-- Rollback für PROJ-47 restore_content_version / change_type_override.
-- Stellt record_content_version() auf den Stand ohne Override zurück.

DROP FUNCTION IF EXISTS restore_content_version(text, uuid, integer);

CREATE OR REPLACE FUNCTION record_content_version() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_type text := TG_ARGV[0];
  v_change_type text;
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

  IF TG_OP = 'INSERT' THEN
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

  INSERT INTO content_versions (content_type, content_id, version_number, change_type, data, department_id, changed_by, changed_by_label, batch_id)
  VALUES (v_type, NEW.id, NEW.version_number, v_change_type, v_snapshot, v_department, auth.uid(), v_actor_label, v_batch);

  RETURN NEW;
END;
$$;
