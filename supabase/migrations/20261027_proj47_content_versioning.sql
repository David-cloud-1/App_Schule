-- PROJ-47: Änderungsverlauf & Wiederherstellen für Inhalte
--
-- Versionierung läuft über Datenbank-Trigger statt Programmcode, damit sie
-- jeden Schreibweg erfasst (App, Bulk-Import, Korrekturläufe, direkte
-- Skripte) und sich nicht umgehen lässt. Löschen wird für die erfassten
-- Inhalte zum Papierkorb (deleted_at) statt echtem DELETE.

-- ── 1. Papierkorb- und Zählnummer-Spalten ───────────────────────────────

ALTER TABLE questions ADD COLUMN deleted_at timestamptz;
ALTER TABLE questions ADD COLUMN version_number integer NOT NULL DEFAULT 1;

ALTER TABLE topics ADD COLUMN deleted_at timestamptz;
ALTER TABLE topics ADD COLUMN version_number integer NOT NULL DEFAULT 1;

ALTER TABLE subjects ADD COLUMN deleted_at timestamptz;
ALTER TABLE subjects ADD COLUMN version_number integer NOT NULL DEFAULT 1;

ALTER TABLE exam_question_sets ADD COLUMN deleted_at timestamptz;
ALTER TABLE exam_question_sets ADD COLUMN version_number integer NOT NULL DEFAULT 1;

-- Eindeutigkeit gilt nur unter nicht-gelöschten Einträgen, sonst blockiert
-- ein Papierkorb-Eintrag das Anlegen eines gleichnamigen neuen Inhalts.
ALTER TABLE topics DROP CONSTRAINT topics_subject_id_name_key;
CREATE UNIQUE INDEX topics_subject_id_name_key ON topics (subject_id, name) WHERE deleted_at IS NULL;

ALTER TABLE subjects DROP CONSTRAINT subjects_department_code_key;
CREATE UNIQUE INDEX subjects_department_code_key ON subjects (department_id, code) WHERE deleted_at IS NULL;

CREATE INDEX idx_questions_deleted_at ON questions (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_topics_deleted_at ON topics (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_subjects_deleted_at ON subjects (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_exam_question_sets_deleted_at ON exam_question_sets (deleted_at) WHERE deleted_at IS NOT NULL;

-- ── 2. Vorgänge (Gruppierung von Massenaktionen) ────────────────────────

CREATE TABLE content_change_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_change_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_change_batches_read" ON content_change_batches
  FOR SELECT USING (is_admin() OR actor_id = auth.uid());

CREATE POLICY "content_change_batches_insert" ON content_change_batches
  FOR INSERT WITH CHECK (is_admin() OR is_department_admin() OR has_teacher_role());

-- Bewusst keine UPDATE/DELETE-Policy: Vorgänge sind unveränderlich.

-- ── 3. Versionsgeschichte ────────────────────────────────────────────────

CREATE TABLE content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('question', 'topic', 'subject', 'exam_question_set')),
  content_id uuid NOT NULL,
  version_number integer NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'deactivated', 'activated', 'deleted', 'restored')),
  data jsonb NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_label text,
  batch_id uuid REFERENCES content_change_batches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_versions_content ON content_versions (content_type, content_id, version_number DESC);
CREATE INDEX idx_content_versions_batch ON content_versions (batch_id);
CREATE INDEX idx_content_versions_changed_by ON content_versions (changed_by);
CREATE INDEX idx_content_versions_department ON content_versions (department_id);

ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Wer den Inhalt verwalten darf, sieht seinen Verlauf; eine Lehrkraft sieht
-- zusätzlich den Verlauf ihrer eigenen Änderungen (private Nachweis-Fragen,
-- PROJ-46 — department_id ist dort NULL).
CREATE POLICY "content_versions_read" ON content_versions
  FOR SELECT USING (
    is_admin()
    OR can_admin_department(department_id)
    OR (has_teacher_role() AND changed_by = auth.uid())
  );

-- Bewusst keine INSERT/UPDATE/DELETE-Policy für Client-Rollen: Versionen
-- entstehen ausschließlich über die SECURITY DEFINER-Triggerfunktion unten
-- und lassen sich danach nicht mehr bearbeiten oder löschen — auch nicht
-- vom Super-Admin.

-- ── 4. Momentaufnahme einer Frage (inkl. Antworten + Fach-Zuordnung) ────

CREATE FUNCTION question_snapshot(p_question_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT to_jsonb(q) || jsonb_build_object(
    'answer_options', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'option_text', a.option_text, 'is_correct', a.is_correct, 'display_order', a.display_order
      ) ORDER BY a.display_order)
      FROM answer_options a WHERE a.question_id = q.id
    ), '[]'::jsonb),
    'subject_ids', COALESCE((
      SELECT jsonb_agg(qs.subject_id) FROM question_subjects qs WHERE qs.question_id = q.id
    ), '[]'::jsonb)
  )
  FROM questions q WHERE q.id = p_question_id
$$;

-- ── 5. Zählnummer erhöhen (BEFORE UPDATE, wirkt auf jeden Schreibweg) ───

CREATE FUNCTION bump_version_number() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.version_number := COALESCE(OLD.version_number, 0) + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_questions_bump_version BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION bump_version_number();
CREATE TRIGGER trg_topics_bump_version BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION bump_version_number();
CREATE TRIGGER trg_subjects_bump_version BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION bump_version_number();
CREATE TRIGGER trg_exam_question_sets_bump_version BEFORE UPDATE ON exam_question_sets
  FOR EACH ROW EXECUTE FUNCTION bump_version_number();

-- ── 6. Version aufzeichnen (AFTER INSERT/UPDATE/DELETE) ─────────────────

CREATE FUNCTION record_content_version() RETURNS trigger
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
  -- Diese Funktion wird von mehreren Tabellen mit unterschiedlichen Spalten
  -- geteilt (subject_id gibt es nur bei topics, department_id/is_active
  -- nicht überall). Direkter Feldzugriff wie NEW.subject_id würde für
  -- PL/pgSQL-Record-Variablen auch dann einen Fehler werfen, wenn die
  -- Spalte auf der aktuellen Tabelle gar nicht existiert — deshalb hier der
  -- Umweg über jsonb, das fehlende Felder als NULL statt als Fehler behandelt.
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

CREATE TRIGGER trg_questions_version AFTER INSERT OR UPDATE OR DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION record_content_version('question');
CREATE TRIGGER trg_topics_version AFTER INSERT OR UPDATE OR DELETE ON topics
  FOR EACH ROW EXECUTE FUNCTION record_content_version('topic');
CREATE TRIGGER trg_subjects_version AFTER INSERT OR UPDATE OR DELETE ON subjects
  FOR EACH ROW EXECUTE FUNCTION record_content_version('subject');
CREATE TRIGGER trg_exam_question_sets_version AFTER INSERT OR UPDATE OR DELETE ON exam_question_sets
  FOR EACH ROW EXECUTE FUNCTION record_content_version('exam_question_set');

-- Antwortoptionen gehören zur Momentaufnahme einer Frage, haben aber keine
-- eigene Versionsgeschichte: Eine Änderung an ihnen erzeugt stattdessen eine
-- neue Version der zugehörigen Frage (über denselben BEFORE/AFTER-Weg).
CREATE FUNCTION touch_question_on_option_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_question_id uuid := COALESCE(NEW.question_id, OLD.question_id);
BEGIN
  UPDATE questions SET version_number = version_number WHERE id = v_question_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_answer_options_touch_question AFTER INSERT OR UPDATE OR DELETE ON answer_options
  FOR EACH ROW EXECUTE FUNCTION touch_question_on_option_change();

-- ── 7. Vorgänge nachträglich bündeln (für Massenaktionen) ───────────────
--
-- Statt Session-Variablen über mehrere getrennte Anfragen hinweg zu
-- verlassen (nicht zuverlässig bei gepoolten Verbindungen), bündelt die App
-- nach einer Massenaktion die soeben erzeugten Versionen nachträglich in
-- einen Vorgang. Es wird dabei nur `batch_id` gesetzt, niemals `data`.
CREATE FUNCTION group_recent_versions_into_batch(
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
    AND cv.version_number = (
      SELECT max(cv2.version_number) FROM content_versions cv2
      WHERE cv2.content_type = cv.content_type AND cv2.content_id = cv.content_id
    );

  RETURN v_batch;
END;
$$;

-- ── 8. Startpunkt für bestehende Inhalte ────────────────────────────────

INSERT INTO content_versions (content_type, content_id, version_number, change_type, data, department_id, changed_by, changed_by_label, batch_id)
SELECT 'question', q.id, 1, 'created', question_snapshot(q.id), question_department(q.id), NULL, 'Stand bei Einführung', NULL
FROM questions q;

INSERT INTO content_versions (content_type, content_id, version_number, change_type, data, department_id, changed_by, changed_by_label, batch_id)
SELECT 'topic', t.id, 1, 'created', to_jsonb(t), subject_department(t.subject_id), NULL, 'Stand bei Einführung', NULL
FROM topics t;

INSERT INTO content_versions (content_type, content_id, version_number, change_type, data, department_id, changed_by, changed_by_label, batch_id)
SELECT 'subject', s.id, 1, 'created', to_jsonb(s), s.department_id, NULL, 'Stand bei Einführung', NULL
FROM subjects s;

INSERT INTO content_versions (content_type, content_id, version_number, change_type, data, department_id, changed_by, changed_by_label, batch_id)
SELECT 'exam_question_set', e.id, 1, 'created', to_jsonb(e), e.department_id, NULL, 'Stand bei Einführung', NULL
FROM exam_question_sets e;
