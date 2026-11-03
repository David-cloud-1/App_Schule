-- PROJ-60 Probe: Migration + Tests in einem Rutsch. Endet mit dem GEWOLLTEN Fehler PROBE-ERGEBNIS und rollt alles zurück.
-- PROJ-60: Konto löschen (DSGVO).
--
-- Befund der Live-Prüfung (2026-11-03): Ein einfaches Löschen des Auth-Kontos
--  • würde benotete Abgaben (exam_sessions) mitlöschen (E2 verlangt: anonym behalten),
--  • würde bei Lehrkräften mit Nachweisen scheitern (exam_question_sets wird
--    mitgelöscht, graded_assessments.exam_set_id ist aber RESTRICT),
--  • würde Zeilen des Änderungsprotokolls und KI-Aufträge mitlöschen,
--  • ließe betrieb_platzierungen und wk_items als Waisen liegen (kein Fremdschlüssel).
--
-- Diese Migration macht die vier Spalten „ohne Person“ möglich (SET NULL) und
-- liefert zwei Funktionen, die NUR der Server mit dem Service-Schlüssel ruft:
--   konto_loeschen_vorschau(uuid)    – Zahlen für den Dialog (liest nur)
--   konto_loeschen_vorbereiten(uuid) – anonymisiert und räumt auf, ein Vorgang;
--                                       wiederholbar. Das Auth-Konto selbst löscht
--                                       danach die Schnittstelle (zuletzt).
--
-- Rückweg: 20261105_proj60_konto_loeschen_down.sql

-- ── 1. Spalten dürfen „ohne Person“ bestehen ───────────────────────────────

-- Abgaben bleiben anonym erhalten (Punkte, Note, Antworten, Fokus-Verlust)
ALTER TABLE public.exam_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_user_id_fkey;
ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fragen-Zusammenstellungen überleben ihre Autorin / ihren Autor
ALTER TABLE public.exam_question_sets ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.exam_question_sets DROP CONSTRAINT IF EXISTS exam_question_sets_created_by_fkey;
ALTER TABLE public.exam_question_sets
  ADD CONSTRAINT exam_question_sets_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Das Änderungsprotokoll bleibt vollständig, nur ohne Person
ALTER TABLE public.admin_audit_log ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.generation_jobs ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.generation_jobs DROP CONSTRAINT IF EXISTS generation_jobs_admin_id_fkey;
ALTER TABLE public.generation_jobs
  ADD CONSTRAINT generation_jobs_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Vorschau für den Dialog ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.konto_loeschen_vorschau(p_user uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    -- bleiben anonym erhalten
    'nachweise', (SELECT count(*) FROM exam_sessions
                   WHERE user_id = p_user AND assessment_id IS NOT NULL),
    -- Inhalte einer Lehrkraft, die ohne Autor im Bereich bleiben
    'inhalte', (SELECT count(*) FROM questions WHERE owner_id = p_user)
             + (SELECT count(*) FROM exam_question_sets WHERE created_by = p_user)
             + (SELECT count(*) FROM graded_assessments WHERE created_by = p_user)
             + (SELECT count(*) FROM forum_posts WHERE author_id = p_user)
             + (SELECT count(*) FROM forum_replies WHERE author_id = p_user)
  );
$$;

-- ── 3. Anonymisieren und aufräumen (ein Vorgang, wiederholbar) ─────────────

CREATE OR REPLACE FUNCTION public.konto_loeschen_vorbereiten(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nachweise integer;
BEGIN
  -- Zahl vor dem Lösen (bei einem Wiederholungsversuch ist sie 0)
  SELECT count(*) INTO v_nachweise FROM exam_sessions
   WHERE user_id = p_user AND assessment_id IS NOT NULL;

  -- Übungs-Prüfungssimulationen gehören zum Lernverlauf
  DELETE FROM exam_sessions WHERE user_id = p_user AND assessment_id IS NULL;

  -- Benotete Abgaben: Konto-Verknüpfung UND Klarname-Kopie entfernen
  UPDATE exam_sessions
     SET user_id = NULL, participant_name = NULL
   WHERE user_id = p_user;

  -- Daten ohne Fremdschlüssel (würden sonst als Waisen liegen bleiben)
  DELETE FROM betrieb_platzierungen WHERE user_id = p_user;
  DELETE FROM wk_items WHERE user_id = p_user;

  -- Frühere Protokoll-Zeilen zu dieser Person: keine Kennung, keine Namen, keine E-Mail
  UPDATE admin_audit_log
     SET object_id = NULL, object_label = NULL, details = NULL
   WHERE object_type IN ('user', 'account') AND object_id = p_user::text;

  RETURN jsonb_build_object('nachweise', v_nachweise);
END;
$$;

-- Nur der Server (Service-Schlüssel) darf diese Funktionen aufrufen
REVOKE ALL ON FUNCTION public.konto_loeschen_vorschau(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konto_loeschen_vorbereiten(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konto_loeschen_vorschau(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.konto_loeschen_vorbereiten(uuid) TO service_role;

-- PROJ-60: Probe der Lösch-Funktionen. Endet mit dem gewollten Fehler „PROBE-ERGEBNIS“,
-- dadurch wird alles zurückgerollt. Setzt voraus, dass die Migration schon angewendet
-- oder davor in denselben Editor-Tab kopiert wurde (siehe proj60_konto_loeschen_probe.sql).
DO $probe$
DECLARE
  s uuid := gen_random_uuid();   -- Schüler
  t uuid := gen_random_uuid();   -- Lehrkraft
  a uuid;                        -- vorhandener Nachweis
  set_id uuid;
  sess uuid;
  vor jsonb; vorb jsonb;
  r text := '';
  n int;
BEGIN
  SELECT id INTO a FROM graded_assessments LIMIT 1;
  IF a IS NULL THEN RAISE EXCEPTION 'PROBE-ERGEBNIS: kein Nachweis zum Testen vorhanden'; END IF;

  INSERT INTO auth.users (id, instance_id, aud, role, email)
  VALUES (s, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-s@example.invalid'),
         (t, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'probe-t@example.invalid');

  INSERT INTO exam_question_sets (name, part, question_ids, created_by) VALUES ('Probe', 1, '{}', t) RETURNING id INTO set_id;
  INSERT INTO exam_sessions (user_id, parts_selected, assessment_id, participant_name, status)
    VALUES (s, '{1}', a, 'Probe Name', 'completed') RETURNING id INTO sess;
  INSERT INTO exam_sessions (user_id, parts_selected, status) VALUES (s, '{1}', 'completed');
  INSERT INTO admin_audit_log (admin_id, action_type, object_type, object_id, object_label, details)
    VALUES (t, 'user.email_change', 'user', s::text, 'Probe Name', '{"to":"x@y.de"}');

  vor := konto_loeschen_vorschau(s);
  r := r || format('vorschau=%s; ', vor);
  IF (vor->>'nachweise')::int <> 1 THEN RAISE EXCEPTION 'FEHLER vorschau nachweise %', vor; END IF;

  vorb := konto_loeschen_vorbereiten(s);
  r := r || format('vorbereiten=%s; ', vorb);
  -- ein zweiter Lauf ist harmlos
  PERFORM konto_loeschen_vorbereiten(s);

  SELECT count(*) INTO n FROM exam_sessions WHERE user_id = s;
  IF n <> 0 THEN RAISE EXCEPTION 'FEHLER: Sessions hängen noch am Konto (%)', n; END IF;
  IF NOT EXISTS (SELECT 1 FROM exam_sessions WHERE id = sess AND user_id IS NULL AND participant_name IS NULL) THEN
    RAISE EXCEPTION 'FEHLER: Abgabe nicht anonym erhalten';
  END IF;
  IF EXISTS (SELECT 1 FROM admin_audit_log WHERE object_label = 'Probe Name' OR object_id = s::text) THEN
    RAISE EXCEPTION 'FEHLER: Protokoll nennt die Person noch';
  END IF;

  DELETE FROM auth.users WHERE id = s;
  IF NOT EXISTS (SELECT 1 FROM exam_sessions WHERE id = sess) THEN RAISE EXCEPTION 'FEHLER: Abgabe mit Konto gelöscht'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = s) THEN RAISE EXCEPTION 'FEHLER: Profil noch da'; END IF;

  -- Lehrkraft mit Zusammenstellung und Protokollzeile löschen
  DELETE FROM auth.users WHERE id = t;
  IF NOT EXISTS (SELECT 1 FROM exam_question_sets WHERE id = set_id AND created_by IS NULL) THEN
    RAISE EXCEPTION 'FEHLER: Zusammenstellung weg oder noch beim Autor';
  END IF;
  SELECT count(*) INTO n FROM admin_audit_log WHERE admin_id IS NULL AND action_type = 'user.email_change';
  IF n < 1 THEN RAISE EXCEPTION 'FEHLER: Protokollzeile der Lehrkraft verloren'; END IF;

  -- Rechte
  IF has_function_privilege('anon', 'public.konto_loeschen_vorbereiten(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.konto_loeschen_vorbereiten(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.konto_loeschen_vorschau(uuid)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FEHLER: anon/authenticated dürfen die Funktionen aufrufen'; END IF;

  RAISE EXCEPTION 'PROBE-ERGEBNIS: ALLES OK — %', r;
END
$probe$;
