-- PROJ-77: Notenschlüssel-Vorlagen
--
-- Neue Tabelle grading_scale_templates. Die IHK-Vorlage liegt NICHT hier,
-- sondern fest im Programm (nicht löschbar). Der Schlüssel an einem Nachweis
-- bleibt eine Kopie (graded_assessments.grading_scale), kein Verweis.
--   * Lesen:     Lehrer-Rollen sehen eigene und geteilte Vorlagen.
--   * Anlegen:   Lehrer-Rolle, nur mit sich selbst als Besitzer/in.
--   * Ändern/Löschen: Besitzer/in; verwaiste (Konto gelöscht) nur Super-Admin.
--   * Konto gelöscht (PROJ-60): private Vorlagen verschwinden, geteilte bleiben
--     ohne Besitzer (owner_id = NULL).
-- Rein additiv; der alte Code läuft weiter.
--
-- Rückweg: 20261112_proj77_notenschluessel_vorlagen_down.sql

BEGIN;

CREATE TABLE grading_scale_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  scale jsonb NOT NULL CHECK (jsonb_typeof(scale) = 'array' AND jsonb_array_length(scale) = 6),
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grading_scale_templates_owner ON grading_scale_templates (owner_id);
CREATE INDEX idx_grading_scale_templates_shared ON grading_scale_templates (shared) WHERE shared;

ALTER TABLE grading_scale_templates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON grading_scale_templates FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON grading_scale_templates TO authenticated;

CREATE POLICY gst_read ON grading_scale_templates FOR SELECT TO authenticated
USING (has_teacher_role() AND (owner_id = auth.uid() OR shared OR is_admin()));

CREATE POLICY gst_insert ON grading_scale_templates FOR INSERT TO authenticated
WITH CHECK (has_teacher_role() AND owner_id = auth.uid());

CREATE POLICY gst_update ON grading_scale_templates FOR UPDATE TO authenticated
USING (has_teacher_role() AND (owner_id = auth.uid() OR (owner_id IS NULL AND is_admin())))
WITH CHECK (has_teacher_role() AND (owner_id = auth.uid() OR (owner_id IS NULL AND is_admin())));

CREATE POLICY gst_delete ON grading_scale_templates FOR DELETE TO authenticated
USING (has_teacher_role() AND (owner_id = auth.uid() OR (owner_id IS NULL AND is_admin())));

-- updated_at pflegen; Besitzer/in lässt sich nicht umhängen (nur auf NULL setzen,
-- das macht der Fremdschlüssel beim Löschen eines Kontos)
CREATE FUNCTION grading_scale_templates_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    NEW.owner_id := OLD.owner_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grading_scale_templates_touch
BEFORE UPDATE ON grading_scale_templates
FOR EACH ROW EXECUTE FUNCTION grading_scale_templates_touch();

-- Konto gelöscht: private Vorlagen entfernen, geteilte bleiben (Fremdschlüssel setzt owner_id = NULL)
CREATE FUNCTION grading_scale_templates_on_profile_gone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  DELETE FROM grading_scale_templates WHERE owner_id = OLD.id AND NOT shared;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_grading_scale_templates_profile_gone
BEFORE DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION grading_scale_templates_on_profile_gone();

COMMIT;
