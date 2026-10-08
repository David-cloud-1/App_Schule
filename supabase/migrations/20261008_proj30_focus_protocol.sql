-- PROJ-30: Fokus-Verlust-Protokoll bei Leistungsnachweisen
--
-- Zwei neue Einstellungen am Nachweis, zwei Protokoll-Tabellen und eine
-- Funktion, die beide Tabellen in einem Schritt ändert (zwei offene Tabs
-- eines Azubis dürfen die Zähler nicht durcheinanderbringen).
--
-- Rein additiv: bestehende Nachweise bekommen focus_tracking = false und
-- verhalten sich unverändert. Azubis haben auf die neuen Tabellen weder Lese-
-- noch Schreibrecht (RLS an, nur Admin-Lesepolicy). Geschrieben wird
-- ausschließlich über focus_report() mit dem Service-Client.

BEGIN;

-- ── 1. Einstellungen am Nachweis ─────────────────────────────────────────────

ALTER TABLE graded_assessments
  ADD COLUMN focus_tracking boolean NOT NULL DEFAULT false,
  ADD COLUMN focus_auto_submit_after integer;

ALTER TABLE graded_assessments
  ADD CONSTRAINT graded_assessments_focus_auto_range
    CHECK (focus_auto_submit_after IS NULL OR focus_auto_submit_after BETWEEN 1 AND 20),
  ADD CONSTRAINT graded_assessments_focus_auto_needs_tracking
    CHECK (focus_auto_submit_after IS NULL OR focus_tracking);

COMMENT ON COLUMN graded_assessments.focus_tracking IS
  'PROJ-30: Verlassen der Prüfung (Tab-/App-Wechsel) wird protokolliert. Bestehende Nachweise: false.';
COMMENT ON COLUMN graded_assessments.focus_auto_submit_after IS
  'PROJ-30: Automatische Abgabe ab dieser Zahl zählender Wechsel. NULL = keine Auto-Abgabe.';

-- ── 2. Zusammenfassung je Teilnahme ──────────────────────────────────────────

CREATE TABLE assessment_focus_summary (
  session_id        uuid PRIMARY KEY REFERENCES exam_sessions(id) ON DELETE CASCADE,
  assessment_id     uuid NOT NULL REFERENCES graded_assessments(id) ON DELETE CASCADE,
  counted_switches  integer NOT NULL DEFAULT 0,
  counted_seconds   integer NOT NULL DEFAULT 0,
  short_count       integer NOT NULL DEFAULT 0,
  auto_submitted    boolean NOT NULL DEFAULT false,
  last_contact_at   timestamptz NOT NULL DEFAULT now(),
  rate_window_start timestamptz NOT NULL DEFAULT now(),
  rate_window_count integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessment_focus_summary_assessment_idx ON assessment_focus_summary (assessment_id);

-- ── 3. Einzel-Einträge ───────────────────────────────────────────────────────

CREATE TABLE assessment_focus_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  client_event_id  uuid NOT NULL,
  left_at          timestamptz NOT NULL,
  returned_at      timestamptz,
  duration_seconds integer,
  question_id      uuid,
  question_number  integer,
  counted          boolean NOT NULL DEFAULT false,
  UNIQUE (session_id, client_event_id)
);

CREATE INDEX assessment_focus_events_session_idx ON assessment_focus_events (session_id, left_at);

-- ── 4. Zugriff: nur Admins des Fachbereichs lesen, niemand schreibt direkt ──

ALTER TABLE assessment_focus_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_focus_events  ENABLE ROW LEVEL SECURITY;

CREATE POLICY focus_summary_admin_select ON assessment_focus_summary
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM graded_assessments ga
    WHERE ga.id = assessment_focus_summary.assessment_id
      AND can_admin_department(ga.department_id)
  ));

CREATE POLICY focus_events_admin_select ON assessment_focus_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM exam_sessions es
    JOIN graded_assessments ga ON ga.id = es.assessment_id
    WHERE es.id = assessment_focus_events.session_id
      AND can_admin_department(ga.department_id)
  ));

-- ── 5. Meldefunktion ─────────────────────────────────────────────────────────
--
-- Aktionen:
--   leave    Azubi verlässt die Prüfung (offener Eintrag)
--   return   Azubi ist zurück (schließt den Eintrag; ohne bekannten Eintrag
--            wird er aus der gemeldeten Dauer nachgebaut)
--   resume   Prüfung wird (neu) geöffnet — schließt offene Einträge
--   finalize Abgabe — schließt offene Einträge
-- Die Zeit stempelt der Server (p_effective_now, höchstens das Fristende).
-- Liefert die aktuellen Zähler und ob dieser Aufruf einen zählenden Wechsel
-- abgeschlossen hat (warn).

CREATE FUNCTION focus_report(
  p_session_id         uuid,
  p_action             text,
  p_event_id           uuid,
  p_question_id        uuid,
  p_question_number    integer,
  p_client_seconds     integer,
  p_effective_now      timestamptz,
  p_count_from_seconds integer,
  p_max_events         integer,
  p_max_per_minute     integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_assessment uuid;
  v_sum        assessment_focus_summary%ROWTYPE;
  v_ev         assessment_focus_events%ROWTYPE;
  v_dur        integer;
  v_warn       boolean := false;
  v_known      boolean;
  v_event_cnt  integer;
  v_switches   integer;
  v_seconds    integer;
  v_short      integer;
  v_since      integer;
BEGIN
  SELECT assessment_id INTO v_assessment FROM exam_sessions WHERE id = p_session_id;
  IF v_assessment IS NULL THEN
    RAISE EXCEPTION 'Session % gehört zu keinem Leistungsnachweis', p_session_id;
  END IF;

  INSERT INTO assessment_focus_summary (session_id, assessment_id, last_contact_at, rate_window_start)
  VALUES (p_session_id, v_assessment, p_effective_now, p_effective_now)
  ON CONFLICT (session_id) DO NOTHING;

  -- Zeile sperren: gleichzeitige Meldungen derselben Teilnahme laufen nacheinander
  SELECT * INTO v_sum FROM assessment_focus_summary WHERE session_id = p_session_id FOR UPDATE;

  -- Meldelimit pro Minute (Schutz vor Flut, ehrliche Azubis erreichen es nie)
  IF p_effective_now - v_sum.rate_window_start > interval '60 seconds' THEN
    v_sum.rate_window_start := p_effective_now;
    v_sum.rate_window_count := 0;
  END IF;
  IF v_sum.rate_window_count >= p_max_per_minute THEN
    RETURN jsonb_build_object('rateLimited', true);
  END IF;
  v_sum.rate_window_count := v_sum.rate_window_count + 1;

  v_switches := v_sum.counted_switches;
  v_seconds  := v_sum.counted_seconds;
  v_short    := v_sum.short_count;
  v_since    := GREATEST(0, floor(extract(epoch FROM (p_effective_now - v_sum.last_contact_at)))::integer);

  IF p_event_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM assessment_focus_events
      WHERE session_id = p_session_id AND client_event_id = p_event_id
    ) INTO v_known;
  ELSE
    v_known := false;
  END IF;

  SELECT count(*) INTO v_event_cnt FROM assessment_focus_events WHERE session_id = p_session_id;

  -- Offene Einträge schließen: bei resume/finalize/return immer, bei leave nur,
  -- wenn die Meldung neu ist (eine verspätete Doppelmeldung schließt nichts).
  IF p_action IN ('resume', 'finalize', 'return') OR (p_action = 'leave' AND NOT v_known) THEN
    FOR v_ev IN
      SELECT * FROM assessment_focus_events
      WHERE session_id = p_session_id AND returned_at IS NULL
      ORDER BY left_at
      FOR UPDATE
    LOOP
      v_dur := GREATEST(0, floor(extract(epoch FROM (p_effective_now - v_ev.left_at)))::integer);
      UPDATE assessment_focus_events
         SET returned_at = p_effective_now,
             duration_seconds = v_dur,
             counted = (v_dur >= p_count_from_seconds)
       WHERE id = v_ev.id;
      IF v_dur >= p_count_from_seconds THEN
        v_switches := v_switches + 1;
        v_seconds  := v_seconds + v_dur;
        v_warn     := true;
      ELSE
        v_short := v_short + 1;
      END IF;
    END LOOP;
  END IF;

  IF p_action = 'leave' AND NOT v_known AND v_event_cnt < p_max_events THEN
    INSERT INTO assessment_focus_events (session_id, client_event_id, left_at, question_id, question_number)
    VALUES (p_session_id, p_event_id, p_effective_now, p_question_id, p_question_number)
    ON CONFLICT (session_id, client_event_id) DO NOTHING;

  ELSIF p_action = 'return' AND NOT v_known AND p_event_id IS NOT NULL THEN
    -- Die "weg"-Meldung ging verloren: Eintrag aus der gemeldeten Dauer
    -- nachbauen, gedeckelt auf die Zeit seit dem letzten Kontakt.
    v_dur := LEAST(GREATEST(COALESCE(p_client_seconds, 0), 0), v_since);
    IF v_event_cnt < p_max_events THEN
      INSERT INTO assessment_focus_events
        (session_id, client_event_id, left_at, returned_at, duration_seconds, question_id, question_number, counted)
      VALUES
        (p_session_id, p_event_id, p_effective_now - make_interval(secs => v_dur), p_effective_now, v_dur,
         p_question_id, p_question_number, v_dur >= p_count_from_seconds)
      ON CONFLICT (session_id, client_event_id) DO NOTHING;
    END IF;
    -- Auch über der Obergrenze zählen die Zähler weiter
    IF v_dur >= p_count_from_seconds THEN
      v_switches := v_switches + 1;
      v_seconds  := v_seconds + v_dur;
      v_warn     := true;
    ELSIF v_dur > 0 THEN
      v_short := v_short + 1;
    END IF;
  END IF;

  UPDATE assessment_focus_summary
     SET counted_switches  = v_switches,
         counted_seconds   = v_seconds,
         short_count       = v_short,
         last_contact_at   = p_effective_now,
         rate_window_start = v_sum.rate_window_start,
         rate_window_count = v_sum.rate_window_count,
         updated_at        = now()
   WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'countedSwitches', v_switches,
    'countedSeconds',  v_seconds,
    'shortCount',      v_short,
    'autoSubmitted',   v_sum.auto_submitted,
    'warn',            v_warn
  );
END;
$$;

REVOKE ALL ON FUNCTION focus_report(uuid, text, uuid, uuid, integer, integer, timestamptz, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION focus_report(uuid, text, uuid, uuid, integer, integer, timestamptz, integer, integer, integer)
  TO service_role;

COMMIT;
