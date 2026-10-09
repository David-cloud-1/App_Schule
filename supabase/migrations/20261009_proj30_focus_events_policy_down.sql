-- Rollback: erste Fassung der Policy (über exam_sessions)
ALTER POLICY focus_events_admin_select ON assessment_focus_events
  USING (EXISTS (
    SELECT 1 FROM exam_sessions es
    JOIN graded_assessments ga ON ga.id = es.assessment_id
    WHERE es.id = assessment_focus_events.session_id
      AND can_admin_department(ga.department_id)
  ));
