-- Hotfix (angewendet 2026-09-24, vor dem Deploy): Jeder eingeloggte Nutzer
-- konnte über profiles_update_own seine eigene Rolle auf 'admin' setzen
-- (Rechteausweitung, in der PROJ-19/20-QA gefunden). Spaltenrechte: Nutzer
-- dürfen role/id/created_at nicht mehr selbst ändern. Alle übrigen Spalten
-- bleiben vorerst beschreibbar, weil der zu diesem Zeitpunkt ausgelieferte
-- Code XP, Streak usw. noch mit dem Nutzer-Client schreibt — die
-- vollständige Sperre folgt nach dem Deploy (20260924_lock_profile_columns.sql).
REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (
  display_name, total_xp, current_streak, longest_streak, last_session_date,
  leaderboard_opt_out, pseudonym, show_real_name, coin_balance, starter_coins, starter_coins_seen
) ON profiles TO authenticated;
