-- PROJ-30: Lese-Policy der Einzel-Einträge korrigieren
--
-- Die erste Fassung ging über exam_sessions; die darf ein Bereichs-Admin nicht
-- lesen, die Policy blieb für ihn daher leer. Jetzt über die Zusammenfassung
-- (hat assessment_id) → graded_assessments → can_admin_department.
-- Azubis bleiben ohne Zugriff.

ALTER POLICY focus_events_admin_select ON assessment_focus_events
  USING (EXISTS (
    SELECT 1
    FROM assessment_focus_summary s
    JOIN graded_assessments ga ON ga.id = s.assessment_id
    WHERE s.session_id = assessment_focus_events.session_id
      AND can_admin_department(ga.department_id)
  ));
