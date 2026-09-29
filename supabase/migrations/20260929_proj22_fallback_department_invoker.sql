-- PROJ-22: fallback_department_id() braucht keine erhöhten Rechte —
-- departments ist für alle lesbar (Policy departments_read). Beseitigt den
-- Security-Advisor-Hinweis "SECURITY DEFINER function executable by anon".
ALTER FUNCTION fallback_department_id() SECURITY INVOKER;
