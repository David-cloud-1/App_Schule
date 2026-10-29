-- PROJ-63: Lehrerzimmer – Forum für den Austausch im Kollegium
--
-- Alles Neue, rein additiv: der bestehende Code läuft unverändert weiter.
--
-- Rechte-Modell:
--   * Alle Tabellen sind per RLS nur für Lehrer-Rollen lesbar
--     (has_teacher_role() = teacher, department_admin, admin).
--   * Authenticated hat NUR SELECT. Jede Änderung läuft über die
--     SECURITY-DEFINER-Funktionen forum_*, die Rolle, Besitz, Längen und
--     Flut-Schutz selbst prüfen. So lassen sich Zähler, Moderations- und
--     Lösungs-Felder nicht per direktem Zugriff verfälschen.
--   * Fehler tragen eigene SQLSTATEs, die die API in HTTP-Codes übersetzt:
--       FRM01 = zu viele Beiträge/Antworten (429)
--       FRM02 = nicht gefunden / schon gelöscht (404)
--       FRM03 = keine Berechtigung (403)
--       FRM04 = ungültige Eingabe (400)
--       FRM05 = schon gemeldet (409)
--
-- Rückweg: siehe 20261029_proj63_lehrerzimmer_down.sql

BEGIN;

-- ── 1. Tabellen ──────────────────────────────────────────────────────────

CREATE TABLE forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = Konto gelöscht (PROJ-60) → Anzeige „Ehemalige Lehrkraft“
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('tipp', 'frage', 'idee')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 120),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 10 AND 5000),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  solution_reply_id uuid,
  reply_count integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  search tsvector GENERATED ALWAYS AS (to_tsvector('german', title || ' ' || body)) STORED
);

CREATE TABLE forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 3000),
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  search tsvector GENERATED ALWAYS AS (to_tsvector('german', body)) STORED
);

-- Wird eine Lösungs-Antwort endgültig entfernt, ist die Frage wieder offen.
ALTER TABLE forum_posts
  ADD CONSTRAINT forum_posts_solution_fk
  FOREIGN KEY (solution_reply_id) REFERENCES forum_replies(id) ON DELETE SET NULL;

CREATE TABLE forum_helpful (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES forum_replies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(post_id, reply_id) = 1)
);
CREATE UNIQUE INDEX forum_helpful_post_uniq ON forum_helpful (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX forum_helpful_reply_uniq ON forum_helpful (user_id, reply_id) WHERE reply_id IS NOT NULL;
CREATE INDEX idx_forum_helpful_post ON forum_helpful (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_forum_helpful_reply ON forum_helpful (reply_id) WHERE reply_id IS NOT NULL;

CREATE TABLE forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES forum_replies(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('unpassend', 'falsch', 'urheberrecht', 'sonstiges')),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'hidden', 'dismissed')),
  handled_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(post_id, reply_id) = 1)
);
CREATE UNIQUE INDEX forum_reports_post_uniq ON forum_reports (reporter_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX forum_reports_reply_uniq ON forum_reports (reporter_id, reply_id) WHERE reply_id IS NOT NULL;
CREATE INDEX idx_forum_reports_open ON forum_reports (created_at) WHERE status = 'open';
CREATE INDEX idx_forum_reports_post ON forum_reports (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_forum_reports_reply ON forum_reports (reply_id) WHERE reply_id IS NOT NULL;

-- Lesestand: pro Person und Beitrag, plus „Übersicht zuletzt besucht“.
CREATE TABLE forum_post_reads (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX idx_forum_post_reads_post ON forum_post_reads (post_id);

CREATE TABLE forum_user_state (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  overview_visited_at timestamptz NOT NULL DEFAULT now()
);

-- Indizes für Liste, Sortierung, Filter, Suche, Papierkorb-Aufräumen
CREATE INDEX idx_forum_posts_activity ON forum_posts (last_activity_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_posts_created ON forum_posts (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_posts_helpful ON forum_posts (helpful_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_posts_author ON forum_posts (author_id);
CREATE INDEX idx_forum_posts_department ON forum_posts (department_id);
CREATE INDEX idx_forum_posts_subject ON forum_posts (subject_id);
CREATE INDEX idx_forum_posts_deleted ON forum_posts (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_forum_posts_search ON forum_posts USING gin (search);
CREATE INDEX idx_forum_replies_post ON forum_replies (post_id, created_at);
CREATE INDEX idx_forum_replies_author ON forum_replies (author_id);
CREATE INDEX idx_forum_replies_deleted ON forum_replies (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_forum_replies_search ON forum_replies USING gin (search);

-- ── 2. Hilfsfunktionen für Rechte (laufen in RLS-Regeln) ─────────────────

CREATE FUNCTION forum_is_moderator() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'department_admin'))
$$;

-- Ist der Beitrag für die aufrufende Person als „offener“ Beitrag sichtbar
-- (nicht gelöscht; ausgeblendet nur für Autor/Moderation)? Dient den
-- Antworten-Regeln und allen Antwort-Funktionen.
CREATE FUNCTION forum_post_open(p_post_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM forum_posts p
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
      AND (p.hidden_at IS NULL OR p.author_id = auth.uid() OR forum_is_moderator())
  )
$$;

-- Anzeigename einer Lehrkraft. Kein Zugriff auf die Profile-Tabelle nötig,
-- und nie die E-Mail-Adresse.
CREATE FUNCTION forum_author_name(p_author_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN NOT has_teacher_role() THEN NULL
    WHEN p_author_id IS NULL THEN 'Ehemalige Lehrkraft'
    ELSE coalesce(
      (SELECT nullif(btrim(display_name), '') FROM profiles WHERE id = p_author_id),
      'Lehrkraft'
    )
  END
$$;

-- Wirft FRM03, wenn die aufrufende Person keine Lehrer-Rolle hat.
CREATE FUNCTION forum_assert_teacher() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT has_teacher_role() THEN
    RAISE EXCEPTION 'Kein Zugang zum Lehrerzimmer.' USING ERRCODE = 'FRM03';
  END IF;
  RETURN auth.uid();
END;
$$;

-- Fach bestimmt den Fachbereich; passt beides nicht zusammen, gibt es FRM04.
CREATE FUNCTION forum_normalize_scope(p_department_id uuid, p_subject_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE
  v_dept uuid := p_department_id;
BEGIN
  IF p_subject_id IS NOT NULL THEN
    v_dept := subject_department(p_subject_id);
    IF v_dept IS NULL THEN
      RAISE EXCEPTION 'Dieses Fach gibt es nicht.' USING ERRCODE = 'FRM04';
    END IF;
    IF p_department_id IS NOT NULL AND p_department_id <> v_dept THEN
      RAISE EXCEPTION 'Das Fach gehört nicht zum gewählten Fachbereich.' USING ERRCODE = 'FRM04';
    END IF;
  ELSIF v_dept IS NOT NULL AND NOT EXISTS (SELECT 1 FROM departments WHERE id = v_dept) THEN
    RAISE EXCEPTION 'Diesen Fachbereich gibt es nicht.' USING ERRCODE = 'FRM04';
  END IF;
  RETURN v_dept;
END;
$$;

-- ── 3. Zähler & Konsistenz per Trigger ───────────────────────────────────

-- Antwort-Zahl, letzte Aktivität und Lösungs-Markierung folgen den Antworten.
CREATE FUNCTION forum_refresh_post(p_post_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_count integer;
  v_last timestamptz;
BEGIN
  SELECT count(*), max(created_at) INTO v_count, v_last
  FROM forum_replies
  WHERE post_id = p_post_id AND deleted_at IS NULL AND hidden_at IS NULL;

  UPDATE forum_posts p
  SET reply_count = v_count,
      last_activity_at = greatest(p.created_at, coalesce(v_last, p.created_at)),
      solution_reply_id = CASE
        WHEN p.solution_reply_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM forum_replies r
          WHERE r.id = p.solution_reply_id AND r.deleted_at IS NULL AND r.hidden_at IS NULL
        ) THEN p.solution_reply_id
        ELSE NULL
      END
  WHERE p.id = p_post_id;
END;
$$;

CREATE FUNCTION forum_replies_after_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM forum_refresh_post(OLD.post_id);
  ELSE
    PERFORM forum_refresh_post(NEW.post_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_forum_replies_after_change
  AFTER INSERT OR DELETE OR UPDATE OF deleted_at, hidden_at ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION forum_replies_after_change();

-- Hilfreich-Zahlen werden neu gezählt statt ±1 gerechnet (selbstheilend).
CREATE FUNCTION forum_helpful_after_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_post uuid;
  v_reply uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_post := OLD.post_id;
    v_reply := OLD.reply_id;
  ELSE
    v_post := NEW.post_id;
    v_reply := NEW.reply_id;
  END IF;
  IF v_post IS NOT NULL THEN
    UPDATE forum_posts SET helpful_count = (SELECT count(*) FROM forum_helpful WHERE post_id = v_post)
    WHERE id = v_post;
  END IF;
  IF v_reply IS NOT NULL THEN
    UPDATE forum_replies SET helpful_count = (SELECT count(*) FROM forum_helpful WHERE reply_id = v_reply)
    WHERE id = v_reply;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_forum_helpful_after_change
  AFTER INSERT OR DELETE ON forum_helpful
  FOR EACH ROW EXECUTE FUNCTION forum_helpful_after_change();

-- Nur Fragen können eine Lösung haben (Kategorie-Wechsel räumt auf).
CREATE FUNCTION forum_posts_before_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.category <> 'frage' THEN
    NEW.solution_reply_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_forum_posts_before_update
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION forum_posts_before_update();

-- ── 4. Zeilen-Regeln (nur Lesen) ─────────────────────────────────────────

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_user_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON forum_posts, forum_replies, forum_helpful, forum_reports, forum_post_reads, forum_user_state
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON forum_posts, forum_replies, forum_helpful, forum_reports, forum_post_reads, forum_user_state
  TO authenticated;

-- Beiträge: sichtbar für Lehrer-Rollen. Ausgeblendet nur für Autor/Moderation,
-- gelöscht nur für den Autor und den Super-Admin (Papierkorb).
CREATE POLICY forum_posts_read ON forum_posts FOR SELECT TO authenticated
USING (
  has_teacher_role() AND (
    (deleted_at IS NULL AND (hidden_at IS NULL OR author_id = auth.uid() OR forum_is_moderator()))
    OR (deleted_at IS NOT NULL AND (author_id = auth.uid() OR is_admin()))
  )
);

CREATE POLICY forum_replies_read ON forum_replies FOR SELECT TO authenticated
USING (
  has_teacher_role()
  AND forum_post_open(post_id)
  AND (
    (deleted_at IS NULL AND (hidden_at IS NULL OR author_id = auth.uid() OR forum_is_moderator()))
    OR (deleted_at IS NOT NULL AND (author_id = auth.uid() OR is_admin()))
  )
);

-- Wer „hilfreich“ gegeben hat, bleibt verborgen: man sieht nur die eigenen.
CREATE POLICY forum_helpful_read_own ON forum_helpful FOR SELECT TO authenticated
USING (user_id = auth.uid() AND has_teacher_role());

CREATE POLICY forum_reports_read_moderators ON forum_reports FOR SELECT TO authenticated
USING (forum_is_moderator());

CREATE POLICY forum_post_reads_read_own ON forum_post_reads FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY forum_user_state_read_own ON forum_user_state FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ── 5. Schreib-Funktionen: Beiträge ──────────────────────────────────────

CREATE FUNCTION forum_create_post(
  p_category text, p_title text, p_body text, p_department_id uuid, p_subject_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_dept uuid;
  v_id uuid;
BEGIN
  IF p_category IS NULL OR p_category NOT IN ('tipp', 'frage', 'idee') THEN
    RAISE EXCEPTION 'Bitte eine Kategorie wählen.' USING ERRCODE = 'FRM04';
  END IF;
  IF char_length(v_title) NOT BETWEEN 5 AND 120 THEN
    RAISE EXCEPTION 'Der Titel braucht 5 bis 120 Zeichen.' USING ERRCODE = 'FRM04';
  END IF;
  IF char_length(v_body) NOT BETWEEN 10 AND 5000 THEN
    RAISE EXCEPTION 'Der Text braucht 10 bis 5000 Zeichen.' USING ERRCODE = 'FRM04';
  END IF;
  v_dept := forum_normalize_scope(p_department_id, p_subject_id);

  -- Doppeltes Absenden: derselbe Beitrag in den letzten Sekunden zählt einmal.
  SELECT id INTO v_id FROM forum_posts
  WHERE author_id = v_uid AND title = v_title AND body = v_body
    AND deleted_at IS NULL AND created_at > now() - interval '30 seconds'
  LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;

  IF (SELECT count(*) FROM forum_posts WHERE author_id = v_uid AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Bitte kurz warten, du hast gerade viele Beiträge geschrieben.' USING ERRCODE = 'FRM01';
  END IF;

  INSERT INTO forum_posts (author_id, category, title, body, department_id, subject_id)
  VALUES (v_uid, p_category, v_title, v_body, v_dept, p_subject_id)
  RETURNING id INTO v_id;

  INSERT INTO forum_post_reads (user_id, post_id) VALUES (v_uid, v_id);
  RETURN v_id;
END;
$$;

CREATE FUNCTION forum_update_post(
  p_id uuid, p_category text, p_title text, p_body text, p_department_id uuid, p_subject_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_post forum_posts%ROWTYPE;
  v_dept uuid;
BEGIN
  SELECT * INTO v_post FROM forum_posts WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieser Beitrag wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_post.author_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Du kannst nur eigene Beiträge bearbeiten.' USING ERRCODE = 'FRM03';
  END IF;
  IF p_category IS NULL OR p_category NOT IN ('tipp', 'frage', 'idee') THEN
    RAISE EXCEPTION 'Bitte eine Kategorie wählen.' USING ERRCODE = 'FRM04';
  END IF;
  IF char_length(v_title) NOT BETWEEN 5 AND 120 THEN
    RAISE EXCEPTION 'Der Titel braucht 5 bis 120 Zeichen.' USING ERRCODE = 'FRM04';
  END IF;
  IF char_length(v_body) NOT BETWEEN 10 AND 5000 THEN
    RAISE EXCEPTION 'Der Text braucht 10 bis 5000 Zeichen.' USING ERRCODE = 'FRM04';
  END IF;
  v_dept := forum_normalize_scope(p_department_id, p_subject_id);

  UPDATE forum_posts
  SET category = p_category, title = v_title, body = v_body,
      department_id = v_dept, subject_id = p_subject_id,
      edited_at = CASE
        WHEN title IS DISTINCT FROM v_title OR body IS DISTINCT FROM v_body OR category IS DISTINCT FROM p_category
        THEN now() ELSE edited_at END
  WHERE id = p_id;
END;
$$;

CREATE FUNCTION forum_delete_post(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_author uuid;
BEGIN
  SELECT author_id INTO v_author FROM forum_posts WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieser Beitrag wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_author IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Du kannst nur eigene Beiträge löschen.' USING ERRCODE = 'FRM03';
  END IF;
  UPDATE forum_posts SET deleted_at = now() WHERE id = p_id;
END;
$$;

-- Wiederherstellen: Autor oder Super-Admin. Antworten, „Hilfreich“ und
-- Lösung kommen mit, denn sie wurden nie angefasst.
CREATE FUNCTION forum_restore_post(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_author uuid;
BEGIN
  SELECT author_id INTO v_author FROM forum_posts WHERE id = p_id AND deleted_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieser Beitrag liegt nicht im Papierkorb.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_author IS DISTINCT FROM v_uid AND NOT is_admin() THEN
    RAISE EXCEPTION 'Das darfst du nicht wiederherstellen.' USING ERRCODE = 'FRM03';
  END IF;
  UPDATE forum_posts SET deleted_at = NULL WHERE id = p_id;
END;
$$;

-- ── 6. Schreib-Funktionen: Antworten ─────────────────────────────────────

CREATE FUNCTION forum_create_reply(p_post_id uuid, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
BEGIN
  IF NOT forum_post_open(p_post_id) THEN
    RAISE EXCEPTION 'Dieser Beitrag wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF char_length(v_body) NOT BETWEEN 1 AND 3000 THEN
    RAISE EXCEPTION 'Die Antwort braucht 1 bis 3000 Zeichen.' USING ERRCODE = 'FRM04';
  END IF;

  SELECT id INTO v_id FROM forum_replies
  WHERE post_id = p_post_id AND author_id = v_uid AND body = v_body
    AND deleted_at IS NULL AND created_at > now() - interval '30 seconds'
  LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;

  IF (SELECT count(*) FROM forum_replies WHERE author_id = v_uid AND created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'Bitte kurz warten, du hast gerade viele Antworten geschrieben.' USING ERRCODE = 'FRM01';
  END IF;

  INSERT INTO forum_replies (post_id, author_id, body) VALUES (p_post_id, v_uid, v_body)
  RETURNING id INTO v_id;

  -- Die eigene Antwort gilt als gelesen.
  INSERT INTO forum_post_reads (user_id, post_id, last_read_at) VALUES (v_uid, p_post_id, now())
  ON CONFLICT (user_id, post_id) DO UPDATE SET last_read_at = excluded.last_read_at;
  RETURN v_id;
END;
$$;

CREATE FUNCTION forum_update_reply(p_id uuid, p_body text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_body text := btrim(coalesce(p_body, ''));
  v_reply forum_replies%ROWTYPE;
BEGIN
  SELECT * INTO v_reply FROM forum_replies WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND OR NOT forum_post_open(v_reply.post_id) THEN
    RAISE EXCEPTION 'Diese Antwort wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_reply.author_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Du kannst nur eigene Antworten bearbeiten.' USING ERRCODE = 'FRM03';
  END IF;
  IF char_length(v_body) NOT BETWEEN 1 AND 3000 THEN
    RAISE EXCEPTION 'Die Antwort braucht 1 bis 3000 Zeichen.' USING ERRCODE = 'FRM04';
  END IF;
  UPDATE forum_replies
  SET body = v_body, edited_at = CASE WHEN body IS DISTINCT FROM v_body THEN now() ELSE edited_at END
  WHERE id = p_id;
END;
$$;

CREATE FUNCTION forum_delete_reply(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_reply forum_replies%ROWTYPE;
BEGIN
  SELECT * INTO v_reply FROM forum_replies WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND OR NOT forum_post_open(v_reply.post_id) THEN
    RAISE EXCEPTION 'Diese Antwort wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_reply.author_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Du kannst nur eigene Antworten löschen.' USING ERRCODE = 'FRM03';
  END IF;
  UPDATE forum_replies SET deleted_at = now() WHERE id = p_id;
END;
$$;

CREATE FUNCTION forum_restore_reply(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_reply forum_replies%ROWTYPE;
BEGIN
  SELECT * INTO v_reply FROM forum_replies WHERE id = p_id AND deleted_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Diese Antwort liegt nicht im Papierkorb.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_reply.author_id IS DISTINCT FROM v_uid AND NOT is_admin() THEN
    RAISE EXCEPTION 'Das darfst du nicht wiederherstellen.' USING ERRCODE = 'FRM03';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM forum_posts WHERE id = v_reply.post_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Der zugehörige Beitrag ist gelöscht. Stelle zuerst den Beitrag wieder her.' USING ERRCODE = 'FRM02';
  END IF;
  UPDATE forum_replies SET deleted_at = NULL WHERE id = p_id;
END;
$$;

-- ── 7. Hilfreich, Lösung, Melden, Moderation ─────────────────────────────

CREATE FUNCTION forum_toggle_helpful(p_target_type text, p_target_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_author uuid;
  v_on boolean;
  v_count integer;
BEGIN
  IF p_target_type = 'post' THEN
    SELECT author_id INTO v_author FROM forum_posts
    WHERE id = p_target_id AND deleted_at IS NULL AND hidden_at IS NULL;
  ELSIF p_target_type = 'reply' THEN
    SELECT author_id INTO v_author FROM forum_replies
    WHERE id = p_target_id AND deleted_at IS NULL AND hidden_at IS NULL AND forum_post_open(post_id);
  ELSE
    RAISE EXCEPTION 'Unbekanntes Ziel.' USING ERRCODE = 'FRM04';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Das wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_author = v_uid THEN
    RAISE EXCEPTION 'Für Eigenes kannst du nicht „hilfreich“ geben.' USING ERRCODE = 'FRM03';
  END IF;

  IF p_target_type = 'post' THEN
    DELETE FROM forum_helpful WHERE user_id = v_uid AND post_id = p_target_id;
    v_on := NOT FOUND;
    IF v_on THEN INSERT INTO forum_helpful (user_id, post_id) VALUES (v_uid, p_target_id); END IF;
    SELECT helpful_count INTO v_count FROM forum_posts WHERE id = p_target_id;
  ELSE
    DELETE FROM forum_helpful WHERE user_id = v_uid AND reply_id = p_target_id;
    v_on := NOT FOUND;
    IF v_on THEN INSERT INTO forum_helpful (user_id, reply_id) VALUES (v_uid, p_target_id); END IF;
    SELECT helpful_count INTO v_count FROM forum_replies WHERE id = p_target_id;
  END IF;
  RETURN jsonb_build_object('helpful', v_on, 'count', v_count);
END;
$$;

-- Lösung markieren (p_reply_id NULL = Markierung zurücknehmen). Nur der
-- Fragesteller, nur bei Fragen, nur an fremden, sichtbaren Antworten.
CREATE FUNCTION forum_set_solution(p_post_id uuid, p_reply_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_post forum_posts%ROWTYPE;
  v_reply forum_replies%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM forum_posts WHERE id = p_post_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dieser Beitrag wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_post.author_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Nur wer die Frage gestellt hat, kann eine Lösung markieren.' USING ERRCODE = 'FRM03';
  END IF;
  IF v_post.category <> 'frage' THEN
    RAISE EXCEPTION 'Nur bei Fragen kann es eine Lösung geben.' USING ERRCODE = 'FRM04';
  END IF;
  IF p_reply_id IS NOT NULL THEN
    SELECT * INTO v_reply FROM forum_replies
    WHERE id = p_reply_id AND post_id = p_post_id AND deleted_at IS NULL AND hidden_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Diese Antwort gibt es nicht mehr.' USING ERRCODE = 'FRM02';
    END IF;
    IF v_reply.author_id IS NOT DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Die eigene Antwort kann keine Lösung sein.' USING ERRCODE = 'FRM03';
    END IF;
  END IF;
  UPDATE forum_posts SET solution_reply_id = p_reply_id WHERE id = p_post_id;
END;
$$;

CREATE FUNCTION forum_report(
  p_target_type text, p_target_id uuid, p_reason text, p_note text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_author uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  IF p_reason IS NULL OR p_reason NOT IN ('unpassend', 'falsch', 'urheberrecht', 'sonstiges') THEN
    RAISE EXCEPTION 'Bitte einen Grund wählen.' USING ERRCODE = 'FRM04';
  END IF;
  IF v_note IS NOT NULL AND char_length(v_note) > 300 THEN
    RAISE EXCEPTION 'Der Hinweis darf höchstens 300 Zeichen lang sein.' USING ERRCODE = 'FRM04';
  END IF;

  IF p_target_type = 'post' THEN
    SELECT author_id INTO v_author FROM forum_posts
    WHERE id = p_target_id AND deleted_at IS NULL AND hidden_at IS NULL;
  ELSIF p_target_type = 'reply' THEN
    SELECT author_id INTO v_author FROM forum_replies
    WHERE id = p_target_id AND deleted_at IS NULL AND hidden_at IS NULL AND forum_post_open(post_id);
  ELSE
    RAISE EXCEPTION 'Unbekanntes Ziel.' USING ERRCODE = 'FRM04';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Das wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
  END IF;
  IF v_author = v_uid THEN
    RAISE EXCEPTION 'Eigene Beiträge kannst du nicht melden.' USING ERRCODE = 'FRM03';
  END IF;
  IF (SELECT count(*) FROM forum_reports WHERE reporter_id = v_uid AND created_at > now() - interval '1 hour') >= 20 THEN
    RAISE EXCEPTION 'Bitte kurz warten, du hast gerade viel gemeldet.' USING ERRCODE = 'FRM01';
  END IF;

  BEGIN
    IF p_target_type = 'post' THEN
      INSERT INTO forum_reports (post_id, reporter_id, reason, note) VALUES (p_target_id, v_uid, p_reason, v_note);
    ELSE
      INSERT INTO forum_reports (reply_id, reporter_id, reason, note) VALUES (p_target_id, v_uid, p_reason, v_note);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Das hast du schon gemeldet.' USING ERRCODE = 'FRM05';
  END;
END;
$$;

-- Ausblenden/Einblenden: Super-Admin und Bereichs-Admins. Wird protokolliert
-- (admin_audit_log, Bereich des Beitrags bzw. des Admins).
CREATE FUNCTION forum_set_hidden(p_target_type text, p_target_id uuid, p_hidden boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
  v_post_id uuid;
  v_title text;
  v_dept uuid;
BEGIN
  IF NOT forum_is_moderator() THEN
    RAISE EXCEPTION 'Das dürfen nur Admins.' USING ERRCODE = 'FRM03';
  END IF;

  IF p_target_type = 'post' THEN
    SELECT id, title, department_id INTO v_post_id, v_title, v_dept
    FROM forum_posts WHERE id = p_target_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Dieser Beitrag wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
    END IF;
    UPDATE forum_posts
    SET hidden_at = CASE WHEN p_hidden THEN now() ELSE NULL END,
        hidden_by = CASE WHEN p_hidden THEN v_uid ELSE NULL END
    WHERE id = p_target_id;
    IF p_hidden THEN
      UPDATE forum_reports SET status = 'hidden', handled_by = v_uid, handled_at = now()
      WHERE post_id = p_target_id AND status = 'open';
    END IF;
  ELSIF p_target_type = 'reply' THEN
    SELECT r.post_id, p.title, p.department_id INTO v_post_id, v_title, v_dept
    FROM forum_replies r JOIN forum_posts p ON p.id = r.post_id
    WHERE r.id = p_target_id AND r.deleted_at IS NULL AND p.deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Diese Antwort wurde inzwischen gelöscht.' USING ERRCODE = 'FRM02';
    END IF;
    UPDATE forum_replies
    SET hidden_at = CASE WHEN p_hidden THEN now() ELSE NULL END,
        hidden_by = CASE WHEN p_hidden THEN v_uid ELSE NULL END
    WHERE id = p_target_id;
    IF p_hidden THEN
      UPDATE forum_reports SET status = 'hidden', handled_by = v_uid, handled_at = now()
      WHERE reply_id = p_target_id AND status = 'open';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unbekanntes Ziel.' USING ERRCODE = 'FRM04';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action_type, object_type, object_id, object_label, details, department_id)
  VALUES (
    v_uid,
    CASE WHEN p_hidden THEN 'forum.hide' ELSE 'forum.unhide' END,
    CASE WHEN p_target_type = 'post' THEN 'forum_post' ELSE 'forum_reply' END,
    p_target_id::text,
    v_title,
    jsonb_build_object('post_id', v_post_id),
    coalesce(v_dept, my_department_id(), fallback_department_id())
  );
END;
$$;

-- Meldung bearbeiten: 'hide' blendet aus (und schließt die Meldungen),
-- 'dismiss' verwirft alle offenen Meldungen zu diesem Ziel.
CREATE FUNCTION forum_resolve_reports(p_target_type text, p_target_id uuid, p_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
BEGIN
  IF NOT forum_is_moderator() THEN
    RAISE EXCEPTION 'Das dürfen nur Admins.' USING ERRCODE = 'FRM03';
  END IF;
  IF p_target_type NOT IN ('post', 'reply') OR p_action NOT IN ('hide', 'dismiss') THEN
    RAISE EXCEPTION 'Ungültige Angabe.' USING ERRCODE = 'FRM04';
  END IF;

  IF p_action = 'hide' THEN
    PERFORM forum_set_hidden(p_target_type, p_target_id, true);
  ELSIF p_target_type = 'post' THEN
    UPDATE forum_reports SET status = 'dismissed', handled_by = v_uid, handled_at = now()
    WHERE post_id = p_target_id AND status = 'open';
  ELSE
    UPDATE forum_reports SET status = 'dismissed', handled_by = v_uid, handled_at = now()
    WHERE reply_id = p_target_id AND status = 'open';
  END IF;
END;
$$;

-- ── 8. Lesestand ─────────────────────────────────────────────────────────

CREATE FUNCTION forum_mark_read(p_post_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
BEGIN
  IF forum_post_open(p_post_id) THEN
    INSERT INTO forum_post_reads (user_id, post_id, last_read_at) VALUES (v_uid, p_post_id, now())
    ON CONFLICT (user_id, post_id) DO UPDATE SET last_read_at = excluded.last_read_at;
  END IF;
END;
$$;

CREATE FUNCTION forum_mark_overview_visited() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := forum_assert_teacher();
BEGIN
  INSERT INTO forum_user_state (user_id, overview_visited_at) VALUES (v_uid, now())
  ON CONFLICT (user_id) DO UPDATE SET overview_visited_at = excluded.overview_visited_at;
END;
$$;

-- Zähler für die Seitenleiste. Für Nicht-Lehrer-Rollen: alles 0.
-- new_posts: fremde Beiträge seit dem letzten Besuch der Übersicht (ohne Besuch:
--   seit Anlegen des Kontos). new_replies: neue fremde Antworten auf eigene
--   Beiträge, die noch nicht geöffnet wurden. open_reports: nur Admins.
CREATE FUNCTION forum_nav_counts() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_since timestamptz;
  v_new_posts integer := 0;
  v_new_replies integer := 0;
  v_reports integer := 0;
BEGIN
  IF v_uid IS NULL OR NOT has_teacher_role() THEN
    RETURN jsonb_build_object('new_posts', 0, 'new_replies', 0, 'open_reports', 0);
  END IF;

  SELECT coalesce(
    (SELECT overview_visited_at FROM forum_user_state WHERE user_id = v_uid),
    (SELECT created_at FROM profiles WHERE id = v_uid),
    now()
  ) INTO v_since;

  SELECT count(*) INTO v_new_posts FROM forum_posts p
  WHERE p.deleted_at IS NULL AND p.hidden_at IS NULL
    AND p.author_id IS DISTINCT FROM v_uid
    AND p.created_at > v_since;

  SELECT count(*) INTO v_new_replies
  FROM forum_replies r
  JOIN forum_posts p ON p.id = r.post_id
  LEFT JOIN forum_post_reads rd ON rd.post_id = p.id AND rd.user_id = v_uid
  WHERE p.author_id = v_uid AND p.deleted_at IS NULL
    AND r.author_id IS DISTINCT FROM v_uid
    AND r.deleted_at IS NULL AND r.hidden_at IS NULL
    AND r.created_at > coalesce(rd.last_read_at, p.created_at);

  IF forum_is_moderator() THEN
    SELECT count(*) INTO v_reports FROM (
      SELECT DISTINCT rep.post_id, rep.reply_id
      FROM forum_reports rep
      LEFT JOIN forum_posts p ON p.id = rep.post_id
      LEFT JOIN forum_replies r ON r.id = rep.reply_id
      WHERE rep.status = 'open' AND coalesce(p.deleted_at, r.deleted_at) IS NULL
    ) x;
  END IF;

  RETURN jsonb_build_object('new_posts', v_new_posts, 'new_replies', v_new_replies, 'open_reports', v_reports);
END;
$$;

-- ── 9. Lese-Funktionen (laufen mit den Rechten der aufrufenden Person,
--       die Zeilen-Regeln aus Abschnitt 4 gelten also) ──────────────────

CREATE FUNCTION forum_list_posts(
  p_category text DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_subject_id uuid DEFAULT NULL,
  p_only_open boolean DEFAULT false,
  p_mine boolean DEFAULT false,
  p_query text DEFAULT NULL,
  p_sort text DEFAULT 'activity',
  p_limit integer DEFAULT 21,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  category text,
  title text,
  snippet text,
  author_name text,
  is_mine boolean,
  department_id uuid,
  department_name text,
  subject_id uuid,
  subject_name text,
  reply_count integer,
  helpful_count integer,
  is_solved boolean,
  is_hidden boolean,
  has_unread boolean,
  my_helpful boolean,
  created_at timestamptz,
  edited_at timestamptz,
  last_activity_at timestamptz
)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT
    p.id,
    p.category,
    p.title,
    left(regexp_replace(regexp_replace(p.body, '[*_`#>]', '', 'g'), '\s+', ' ', 'g'), 140),
    forum_author_name(p.author_id),
    p.author_id = auth.uid(),
    p.department_id,
    d.name,
    p.subject_id,
    s.name,
    p.reply_count,
    p.helpful_count,
    p.solution_reply_id IS NOT NULL,
    p.hidden_at IS NOT NULL,
    CASE
      WHEN p.author_id = auth.uid() THEN EXISTS (
        SELECT 1 FROM forum_replies r
        WHERE r.post_id = p.id AND r.author_id IS DISTINCT FROM auth.uid()
          AND r.deleted_at IS NULL AND r.hidden_at IS NULL
          AND r.created_at > coalesce(rd.last_read_at, p.created_at)
      )
      ELSE (rd.last_read_at IS NULL OR p.last_activity_at > rd.last_read_at)
    END,
    EXISTS (SELECT 1 FROM forum_helpful h WHERE h.post_id = p.id AND h.user_id = auth.uid()),
    p.created_at,
    p.edited_at,
    p.last_activity_at
  FROM forum_posts p
  LEFT JOIN forum_post_reads rd ON rd.post_id = p.id AND rd.user_id = auth.uid()
  LEFT JOIN departments d ON d.id = p.department_id
  LEFT JOIN subjects s ON s.id = p.subject_id
  WHERE p.deleted_at IS NULL
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_department_id IS NULL OR p.department_id = p_department_id)
    AND (p_subject_id IS NULL OR p.subject_id = p_subject_id)
    AND (NOT p_only_open OR (p.category = 'frage' AND p.solution_reply_id IS NULL))
    AND (NOT p_mine OR p.author_id = auth.uid())
    AND (
      nullif(btrim(p_query), '') IS NULL
      OR p.search @@ websearch_to_tsquery('german', p_query)
      OR EXISTS (
        SELECT 1 FROM forum_replies r
        WHERE r.post_id = p.id AND r.deleted_at IS NULL AND r.hidden_at IS NULL
          AND r.search @@ websearch_to_tsquery('german', p_query)
      )
    )
  ORDER BY
    (CASE WHEN p_sort = 'helpful' THEN p.helpful_count ELSE 0 END) DESC,
    (CASE WHEN p_sort = 'newest' THEN p.created_at ELSE p.last_activity_at END) DESC,
    p.id
  LIMIT least(greatest(p_limit, 1), 51)
  OFFSET greatest(p_offset, 0)
$$;

-- Ein Beitrag mit allen Antworten (ohne gelöschte). NULL, wenn nicht sichtbar.
CREATE FUNCTION forum_get_thread(p_post_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'post', jsonb_build_object(
      'id', p.id,
      'category', p.category,
      'title', p.title,
      'body', p.body,
      'author_name', forum_author_name(p.author_id),
      'is_mine', p.author_id = auth.uid(),
      'department_id', p.department_id,
      'department_name', d.name,
      'subject_id', p.subject_id,
      'subject_name', s.name,
      'reply_count', p.reply_count,
      'helpful_count', p.helpful_count,
      'solution_reply_id', p.solution_reply_id,
      'is_hidden', p.hidden_at IS NOT NULL,
      'my_helpful', EXISTS (SELECT 1 FROM forum_helpful h WHERE h.post_id = p.id AND h.user_id = auth.uid()),
      'created_at', p.created_at,
      'edited_at', p.edited_at
    ),
    'replies', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'body', r.body,
          'author_name', forum_author_name(r.author_id),
          'is_mine', r.author_id = auth.uid(),
          'helpful_count', r.helpful_count,
          'is_solution', r.id = p.solution_reply_id,
          'is_hidden', r.hidden_at IS NOT NULL,
          'my_helpful', EXISTS (SELECT 1 FROM forum_helpful h WHERE h.reply_id = r.id AND h.user_id = auth.uid()),
          'created_at', r.created_at,
          'edited_at', r.edited_at
        ) ORDER BY r.created_at
      )
      FROM forum_replies r
      WHERE r.post_id = p.id AND r.deleted_at IS NULL
    ), '[]'::jsonb)
  )
  FROM forum_posts p
  LEFT JOIN departments d ON d.id = p.department_id
  LEFT JOIN subjects s ON s.id = p.subject_id
  WHERE p.id = p_post_id AND p.deleted_at IS NULL
$$;

-- Gemeldete Beiträge/Antworten für die Moderation (ohne die Meldenden).
CREATE FUNCTION forum_list_reports() RETURNS TABLE (
  target_type text,
  target_id uuid,
  post_id uuid,
  title text,
  snippet text,
  author_name text,
  report_count integer,
  reasons text[],
  notes text[],
  first_reported_at timestamptz,
  is_hidden boolean
)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT * FROM (
    SELECT
      'post'::text AS target_type,
      p.id AS target_id,
      p.id AS post_id,
      p.title,
      left(regexp_replace(p.body, '\s+', ' ', 'g'), 200) AS snippet,
      forum_author_name(p.author_id) AS author_name,
      count(*)::integer AS report_count,
      array_agg(DISTINCT rep.reason) AS reasons,
      coalesce(array_agg(rep.note) FILTER (WHERE rep.note IS NOT NULL), ARRAY[]::text[]) AS notes,
      min(rep.created_at) AS first_reported_at,
      p.hidden_at IS NOT NULL AS is_hidden
    FROM forum_reports rep
    JOIN forum_posts p ON p.id = rep.post_id
    WHERE rep.status = 'open' AND p.deleted_at IS NULL
    GROUP BY p.id
    UNION ALL
    SELECT
      'reply'::text,
      r.id,
      p.id,
      p.title,
      left(regexp_replace(r.body, '\s+', ' ', 'g'), 200),
      forum_author_name(r.author_id),
      count(*)::integer,
      array_agg(DISTINCT rep.reason),
      coalesce(array_agg(rep.note) FILTER (WHERE rep.note IS NOT NULL), ARRAY[]::text[]),
      min(rep.created_at),
      r.hidden_at IS NOT NULL
    FROM forum_reports rep
    JOIN forum_replies r ON r.id = rep.reply_id
    JOIN forum_posts p ON p.id = r.post_id
    WHERE rep.status = 'open' AND r.deleted_at IS NULL AND p.deleted_at IS NULL
    GROUP BY r.id, p.id
  ) x
  ORDER BY x.first_reported_at
$$;

-- Eigener Papierkorb (Super-Admin: alle). Beiträge und einzeln gelöschte Antworten.
CREATE FUNCTION forum_list_trash() RETURNS TABLE (
  kind text,
  id uuid,
  post_id uuid,
  title text,
  snippet text,
  author_name text,
  deleted_at timestamptz
)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT * FROM (
    SELECT 'post'::text AS kind, p.id, p.id AS post_id, p.title,
      left(regexp_replace(p.body, '\s+', ' ', 'g'), 140) AS snippet,
      forum_author_name(p.author_id) AS author_name, p.deleted_at
    FROM forum_posts p
    WHERE p.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'reply'::text, r.id, r.post_id, p.title,
      left(regexp_replace(r.body, '\s+', ' ', 'g'), 140),
      forum_author_name(r.author_id), r.deleted_at
    FROM forum_replies r
    JOIN forum_posts p ON p.id = r.post_id
    WHERE r.deleted_at IS NOT NULL
  ) x
  ORDER BY x.deleted_at DESC
  LIMIT 200
$$;

-- ── 10. Ausführungsrechte ────────────────────────────────────────────────
-- Alles zu, dann gezielt öffnen. Die Trigger-/Hilfsfunktionen, die nur
-- andere Funktionen aufrufen, bleiben für Nutzer gesperrt.

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'forum\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;

  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'forum_is_moderator', 'forum_post_open', 'forum_author_name',
      'forum_create_post', 'forum_update_post', 'forum_delete_post', 'forum_restore_post',
      'forum_create_reply', 'forum_update_reply', 'forum_delete_reply', 'forum_restore_reply',
      'forum_toggle_helpful', 'forum_set_solution', 'forum_report',
      'forum_set_hidden', 'forum_resolve_reports',
      'forum_mark_read', 'forum_mark_overview_visited', 'forum_nav_counts',
      'forum_list_posts', 'forum_get_thread', 'forum_list_reports', 'forum_list_trash'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
  END LOOP;
END;
$$;

-- ── 11. Papierkorb nach 30 Tagen endgültig leeren (täglich 03:15) ────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'forum-papierkorb-aufraeumen',
      '15 3 * * *',
      $cron$
        DELETE FROM forum_posts WHERE deleted_at < now() - interval '30 days';
        DELETE FROM forum_replies WHERE deleted_at < now() - interval '30 days';
      $cron$
    );
  END IF;
END;
$$;

COMMIT;
