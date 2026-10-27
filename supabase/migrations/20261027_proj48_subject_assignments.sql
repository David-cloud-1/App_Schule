-- PROJ-48: Fach-Zuständigkeiten für Lehrkräfte (selbst eingetragen)
--
-- Neue, feinere Rechte-Ebene UNTERHALB des bestehenden Bereichs-Modells
-- (PROJ-24): Eine Lehrkraft trägt sich selbst für Fächer (oder nur einen
-- Fachbereich ohne Fach, für Bereiche ohne eigene Fächer) ein und darf
-- danach deren Inhalte pflegen. Super-Admin und Bereichs-Admin bleiben
-- unverändert bereichsweit zuständig — ihnen fehlt bewusst keine Zeile hier.
--
-- Keine Freigabe-Warteschlange (E1, Nutzer-Entscheidung 2026-10-26): Die
-- Absicherung ist das bestehende Änderungsprotokoll aus PROJ-47.
--
-- Stand der betroffenen Policies/Funktionen geprüft gegen die Live-DB am
-- 2026-10-27 (nicht nur gegen frühere Migrationsdateien) — seit PROJ-24 kam
-- PROJ-46 (private Nachweis-Fragen, can_edit_question &c.) dazu.
--
-- Rückweg: siehe 20261027_proj48_subject_assignments_down.sql

BEGIN;

-- ── 1. Tabelle ───────────────────────────────────────────────────────────

CREATE TABLE teacher_subject_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  -- NULL = "unterrichtet im Bereich, noch ohne eigenes Fach" (E3 — für
  -- Bereiche, die noch keine Fächer haben; reicht, um dort das erste Fach
  -- anzulegen).
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Je Fach nur eine Zuständigkeit pro Lehrkraft; bereichsweite Einträge ohne
-- Fach ebenfalls nur einmal je Bereich (sonst entstünde bei mehrfachem
-- Antippen stiller Datenmüll statt eines Fehlers).
CREATE UNIQUE INDEX teacher_subject_assignments_subject_uniq
  ON teacher_subject_assignments (teacher_id, subject_id) WHERE subject_id IS NOT NULL;
CREATE UNIQUE INDEX teacher_subject_assignments_dept_only_uniq
  ON teacher_subject_assignments (teacher_id, department_id) WHERE subject_id IS NULL;

CREATE INDEX idx_teacher_subject_assignments_teacher ON teacher_subject_assignments (teacher_id);
CREATE INDEX idx_teacher_subject_assignments_department ON teacher_subject_assignments (department_id);
CREATE INDEX idx_teacher_subject_assignments_subject ON teacher_subject_assignments (subject_id);

-- Ein Fach muss zu dem angegebenen Bereich gehören — verhindert eine
-- widersprüchliche Zeile (Fach aus Bereich A, aber department_id = Bereich B).
CREATE FUNCTION check_teacher_assignment_subject_department() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.subject_id IS NOT NULL AND subject_department(NEW.subject_id) IS DISTINCT FROM NEW.department_id THEN
    RAISE EXCEPTION 'Fach gehört nicht zum angegebenen Fachbereich';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_teacher_subject_assignments_check
  BEFORE INSERT OR UPDATE ON teacher_subject_assignments
  FOR EACH ROW EXECUTE FUNCTION check_teacher_assignment_subject_department();

-- ── 2. Hilfsfunktionen (SECURITY DEFINER, wie bei PROJ-24) ──────────────

-- Hat die aufrufende Lehrkraft irgendeine Zuständigkeit (Fach oder bereichs-
-- weit) in diesem Bereich? Reicht für „neues Fach anlegen" (E3) und für die
-- Sichtbarkeit von Prüfungssets des Bereichs.
CREATE FUNCTION has_teacher_assignment_department(p_department_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_subject_assignments
    WHERE teacher_id = auth.uid() AND department_id = p_department_id
  )
$$;

-- Ist die aufrufende Lehrkraft konkret für dieses Fach zuständig?
CREATE FUNCTION has_teacher_assignment_subject(p_subject_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_subject_assignments
    WHERE teacher_id = auth.uid() AND subject_id = p_subject_id
  )
$$;

-- Darf die aufrufende Person dieses Fach verwalten? Admin: immer.
-- Bereichs-Admin: eigener Bereich. Lehrkraft: NUR mit eigener Zuständigkeit
-- für genau dieses Fach — bloße Bereichs-Mitgliedschaft reicht nicht.
CREATE FUNCTION can_admin_subject(p_subject_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_admin()
    OR can_admin_department(subject_department(p_subject_id))
    OR (has_teacher_role() AND has_teacher_assignment_subject(p_subject_id))
$$;

-- Darf die aufrufende Person in diesem Bereich grundsätzlich etwas anlegen
-- (ein neues Fach, E3, oder ein Prüfungsset des Bereichs)? Für eine
-- Lehrkraft reicht hier jede Zuständigkeit im Bereich, auch eine
-- bereichsweite ohne eigenes Fach.
CREATE FUNCTION can_admin_department_content(p_department_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT can_admin_department(p_department_id)
    OR (has_teacher_role() AND has_teacher_assignment_department(p_department_id))
$$;

-- Darf die aufrufende Person diese (nicht-private) Frage verwalten? Prüft
-- ALLE verknüpften Fächer — bei einer Frage mit mehreren Fächern reicht die
-- Zuständigkeit für eines davon (AC PROJ-48).
CREATE FUNCTION can_admin_question(p_question_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_admin()
    OR can_admin_department(question_department(p_question_id))
    OR (has_teacher_role() AND EXISTS (
      SELECT 1 FROM question_subjects qs
      WHERE qs.question_id = p_question_id AND has_teacher_assignment_subject(qs.subject_id)
    ))
$$;

-- Zentrale Stelle für „darf diese Frage bearbeiten" (PROJ-46): private
-- Nachweis-Fragen unverändert über can_manage_private_question, der
-- Pool-Fall jetzt über can_admin_question statt nur can_admin_department —
-- wirkt automatisch auf answer_options_admin_write und den privaten Zweig
-- von question_subjects_admin_write, ohne diese Policies anzufassen.
CREATE OR REPLACE FUNCTION public.can_edit_question(p_question_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN q.is_private THEN can_manage_private_question(q.owner_id)
      ELSE can_admin_question(q.id)
    END
    FROM questions q WHERE q.id = p_question_id
  ), false)
$$;

-- ── 3. Wer ein neues Fach anlegt, ist sofort dafür zuständig (E3) ───────
--
-- Als Trigger statt nur in der API, damit es für jeden Schreibweg gilt
-- (gleiche Begründung wie die Versionsgeschichte aus PROJ-47).

CREATE FUNCTION auto_assign_subject_creator() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF has_teacher_role() AND NOT (is_admin() OR is_department_admin()) THEN
    INSERT INTO teacher_subject_assignments (teacher_id, department_id, subject_id)
    VALUES (auth.uid(), NEW.department_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subjects_auto_assign_creator
  AFTER INSERT ON subjects
  FOR EACH ROW EXECUTE FUNCTION auto_assign_subject_creator();

-- ── 4. Rolle entzogen → Zuständigkeiten sofort weg ──────────────────────
--
-- Die Rechteprüfung verlangt ohnehin immer die AKTUELLE Lehrer-Rolle, wirkt
-- also schon ohne Aufräumen "sofort". Zusätzliches Löschen hält die
-- Super-Admin-Übersicht "Zuständigkeiten" aber korrekt, statt verwaiste
-- Einträge einer ehemaligen Lehrkraft stehen zu lassen.

CREATE FUNCTION remove_assignments_on_role_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.role <> 'teacher' AND OLD.role = 'teacher' THEN
    DELETE FROM teacher_subject_assignments WHERE teacher_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_remove_assignments_on_role_change
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION remove_assignments_on_role_change();

-- ── 5. RLS für die neue Tabelle ──────────────────────────────────────────

ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- Lesen: Super-Admin alles; Bereichs-Admin die Einträge seines Bereichs
-- (Übersicht "wer unterrichtet hier"); jede Lehrkraft ihre eigenen.
CREATE POLICY teacher_subject_assignments_read ON teacher_subject_assignments
  FOR SELECT USING (
    is_admin() OR can_admin_department(department_id) OR teacher_id = auth.uid()
  );

-- Eintragen: nur für sich selbst, nur mit Lehrer-Rolle, nur wenn das
-- angegebene Fach (falls gesetzt) zum angegebenen Bereich gehört (zusätzlich
-- zum Trigger-Check — RLS greift, bevor der Trigger überhaupt läuft).
CREATE POLICY teacher_subject_assignments_insert ON teacher_subject_assignments
  FOR INSERT WITH CHECK (
    has_teacher_role()
    AND teacher_id = auth.uid()
    AND (subject_id IS NULL OR subject_department(subject_id) = department_id)
  );

-- Entfernen: die Lehrkraft selbst (Austragen) oder der Super-Admin (AC:
-- "Super-Admin ... kann Einträge entfernen"). Bewusst nicht der
-- Bereichs-Admin — die Spec gibt ihm diese Befugnis nicht.
CREATE POLICY teacher_subject_assignments_delete ON teacher_subject_assignments
  FOR DELETE USING (is_admin() OR teacher_id = auth.uid());

-- Keine UPDATE-Policy: Einträge werden nur angelegt oder entfernt, nie
-- bearbeitet (wie bei content_change_batches, PROJ-47).

-- ── 6. Bestehende RLS-Policies erweitern ────────────────────────────────
-- Durchweg dasselbe Muster: die bisherige can_admin_department(...)-Prüfung
-- wird durch die neue, feinere can_admin_subject(...) / can_admin_question(...)
-- / can_admin_department_content(...) ersetzt. Für Admin und Bereichs-Admin
-- ändert sich dabei nichts (can_admin_department bleibt als OR-Zweig erhalten).
-- answer_options_admin_write und der private Zweig von
-- question_subjects_admin_write brauchen keine Änderung — sie hängen bereits
-- an can_edit_question(), das oben zentral erweitert wurde.

-- subjects: anlegen (E3) auch mit bloßer Bereichs-Zuständigkeit; ändern/
-- löschen nur mit Zuständigkeit für GENAU dieses Fach. can_admin_subject(id)
-- ginge beim INSERT nicht (die Zuständigkeit für ein gerade erst entstehendes
-- Fach existiert naturgemäß noch nicht) — deshalb beim Anlegen bewusst die
-- bereichsweite Prüfung.
DROP POLICY subjects_admin_write ON subjects;
CREATE POLICY subjects_admin_insert ON subjects
  FOR INSERT WITH CHECK (can_admin_department_content(department_id));
CREATE POLICY subjects_admin_update ON subjects
  FOR UPDATE USING (can_admin_subject(id)) WITH CHECK (can_admin_subject(id));
CREATE POLICY subjects_admin_delete ON subjects
  FOR DELETE USING (can_admin_subject(id));

-- questions: INSERT bleibt für den Pool-Fall bewusst weit (wie bisher für
-- department_admin) — die eigentliche Fach-Prüfung greift beim Verknüpfen
-- über question_subjects.
ALTER POLICY questions_insert_admin ON questions
  WITH CHECK (
    CASE
      WHEN is_private THEN (owner_id = auth.uid() AND has_teacher_role())
      ELSE (is_admin() OR is_department_admin() OR has_teacher_role())
    END
  );
ALTER POLICY questions_update_admin ON questions
  USING (
    CASE WHEN is_private THEN can_manage_private_question(owner_id) ELSE can_admin_question(id) END
  );
ALTER POLICY questions_delete_admin ON questions
  USING (
    CASE WHEN is_private THEN can_manage_private_question(owner_id) ELSE can_admin_question(id) END
  );
ALTER POLICY questions_read ON questions
  USING (
    (auth.role() = 'authenticated') AND
    CASE
      WHEN is_private THEN can_manage_private_question(owner_id)
      ELSE (is_active = true OR can_admin_question(id))
    END
  );

ALTER POLICY question_subjects_admin_write ON question_subjects
  USING (
    CASE WHEN question_is_private(question_id) THEN can_edit_question(question_id) ELSE can_admin_subject(subject_id) END
  )
  WITH CHECK (
    CASE WHEN question_is_private(question_id) THEN can_edit_question(question_id) ELSE can_admin_subject(subject_id) END
  );

ALTER POLICY "topics: admin insert" ON topics
  WITH CHECK (can_admin_subject(subject_id));
ALTER POLICY "topics: admin update" ON topics
  USING (can_admin_subject(subject_id));
ALTER POLICY "topics: admin delete" ON topics
  USING (can_admin_subject(subject_id));

-- exam_question_sets: auf Bereichsebene (nicht pro Fach) — welche Fragen eine
-- Lehrkraft in ein Set aufnehmen kann, regelt bereits questions_read/
-- can_admin_question; das Set selbst gehört zu einem Prüfungsteil, der
-- mehrere Fächer umfassen kann (AC: "darf Sets dieses Teils pflegen").
ALTER POLICY "Admins manage exam question sets" ON exam_question_sets
  USING (can_admin_department_content(department_id))
  WITH CHECK (can_admin_department_content(department_id));

-- content_versions (PROJ-47): eine Lehrkraft sieht zusätzlich den Verlauf
-- jedes Bereichs, in dem sie mindestens eine Zuständigkeit hat — nicht nur
-- ihre eigenen Änderungen (bisher nur über changed_by = auth.uid() geregelt).
DROP POLICY content_versions_read ON content_versions;
CREATE POLICY content_versions_read ON content_versions
  FOR SELECT USING (
    is_admin()
    OR can_admin_department(department_id)
    OR (has_teacher_role() AND changed_by = auth.uid())
    OR (has_teacher_role() AND department_id IS NOT NULL AND has_teacher_assignment_department(department_id))
  );

-- restore_content_version (PROJ-47): dieselbe feinere Prüfung auch beim
-- Zurücksetzen auf eine ältere Version.
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
      OR can_admin_question(p_content_id)
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

    -- Antwortoptionen haben immer genau 5 feste Plätze (display_order 1-5)
    -- — ein Upsert je Platz reicht, ohne vorher etwas entfernen zu müssen.
    INSERT INTO answer_options (question_id, option_text, is_correct, display_order)
    SELECT p_content_id, opt->>'option_text', (opt->>'is_correct')::boolean, (opt->>'display_order')::integer
    FROM jsonb_array_elements(COALESCE(v_data->'answer_options', '[]'::jsonb)) opt
    ON CONFLICT (question_id, display_order) DO UPDATE SET
      option_text = excluded.option_text,
      is_correct = excluded.is_correct;

    -- Fach-Zuordnungen: ergänzt fehlende Verknüpfungen aus der Version.
    -- Entfernt keine seither zusätzlich angelegten Verknüpfungen (bewusst
    -- nur ergänzend, nicht ersetzend).
    INSERT INTO question_subjects (question_id, subject_id)
    SELECT p_content_id, (sid.value)::uuid
    FROM jsonb_array_elements_text(COALESCE(v_data->'subject_ids', '[]'::jsonb)) sid(value)
    ON CONFLICT (question_id, subject_id) DO NOTHING;

  ELSIF p_content_type = 'topic' THEN
    IF NOT can_admin_subject((v_data->>'subject_id')::uuid) THEN
      RAISE EXCEPTION 'nicht berechtigt';
    END IF;
    UPDATE topics SET
      name = v_data->>'name',
      subject_id = (v_data->>'subject_id')::uuid
    WHERE id = p_content_id;

  ELSIF p_content_type = 'subject' THEN
    IF NOT can_admin_subject(p_content_id) THEN
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
    IF NOT can_admin_department_content((v_data->>'department_id')::uuid) THEN
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

COMMIT;
