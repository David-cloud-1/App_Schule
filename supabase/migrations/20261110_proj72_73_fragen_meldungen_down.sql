-- Rückweg zu 20261110_proj72_73_fragen_meldungen.sql
-- ACHTUNG: löscht alle Meldungen. Bereits vergebene Frachtmünzen bleiben bestehen.

BEGIN;

DROP VIEW IF EXISTS question_report_groups;
DROP TRIGGER IF EXISTS trg_question_reports_soft_deleted ON questions;
DROP TRIGGER IF EXISTS trg_question_reports_hard_deleted ON questions;
DROP FUNCTION IF EXISTS question_reports_on_question_gone();
DROP FUNCTION IF EXISTS mark_question_reports_read(uuid[]);
DROP FUNCTION IF EXISTS close_question_reports(uuid, text, text, boolean, uuid[]);
DROP FUNCTION IF EXISTS claim_question_reports(uuid);
DROP FUNCTION IF EXISTS report_question(uuid, text, text, uuid);
DROP TABLE IF EXISTS question_reports;

COMMIT;
