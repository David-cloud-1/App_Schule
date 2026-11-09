-- Rückweg zu 20261117_proj74_stats_schneller.sql
ALTER FUNCTION question_difficulty_stats(uuid[], integer, integer, uuid)
  RESET enable_nestloop;
