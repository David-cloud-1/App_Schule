-- Rollback für PROJ-63: Lehrerzimmer
-- Löscht alle Forum-Daten unwiderruflich (Beiträge, Antworten, Meldungen, Lesestand).
-- Einträge im Änderungsprotokoll (action_type 'forum.hide'/'forum.unhide') bleiben bestehen.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('forum-papierkorb-aufraeumen')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'forum-papierkorb-aufraeumen');
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS forum_list_trash();
DROP FUNCTION IF EXISTS forum_list_reports();
DROP FUNCTION IF EXISTS forum_get_thread(uuid);
DROP FUNCTION IF EXISTS forum_list_posts(text, uuid, uuid, boolean, boolean, text, text, integer, integer);
DROP FUNCTION IF EXISTS forum_nav_counts();
DROP FUNCTION IF EXISTS forum_mark_overview_visited();
DROP FUNCTION IF EXISTS forum_mark_read(uuid);
DROP FUNCTION IF EXISTS forum_resolve_reports(text, uuid, text);
DROP FUNCTION IF EXISTS forum_set_hidden(text, uuid, boolean);
DROP FUNCTION IF EXISTS forum_report(text, uuid, text, text);
DROP FUNCTION IF EXISTS forum_set_solution(uuid, uuid);
DROP FUNCTION IF EXISTS forum_toggle_helpful(text, uuid);
DROP FUNCTION IF EXISTS forum_restore_reply(uuid);
DROP FUNCTION IF EXISTS forum_delete_reply(uuid);
DROP FUNCTION IF EXISTS forum_update_reply(uuid, text);
DROP FUNCTION IF EXISTS forum_create_reply(uuid, text);
DROP FUNCTION IF EXISTS forum_restore_post(uuid);
DROP FUNCTION IF EXISTS forum_delete_post(uuid);
DROP FUNCTION IF EXISTS forum_update_post(uuid, text, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS forum_create_post(text, text, text, uuid, uuid);

DROP TABLE IF EXISTS forum_user_state;
DROP TABLE IF EXISTS forum_post_reads;
DROP TABLE IF EXISTS forum_reports;
DROP TABLE IF EXISTS forum_helpful;
ALTER TABLE IF EXISTS forum_posts DROP CONSTRAINT IF EXISTS forum_posts_solution_fk;
DROP TABLE IF EXISTS forum_replies;
DROP TABLE IF EXISTS forum_posts;

DROP FUNCTION IF EXISTS forum_posts_before_update();
DROP FUNCTION IF EXISTS forum_helpful_after_change();
DROP FUNCTION IF EXISTS forum_replies_after_change();
DROP FUNCTION IF EXISTS forum_refresh_post(uuid);
DROP FUNCTION IF EXISTS forum_normalize_scope(uuid, uuid);
DROP FUNCTION IF EXISTS forum_assert_teacher();
DROP FUNCTION IF EXISTS forum_author_name(uuid);
DROP FUNCTION IF EXISTS forum_post_open(uuid);
DROP FUNCTION IF EXISTS forum_is_moderator();

COMMIT;
