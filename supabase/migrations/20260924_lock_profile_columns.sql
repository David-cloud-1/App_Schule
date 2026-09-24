-- PROJ-19/20 BUG-1: Spielstand nur noch serverseitig schreibbar
--
-- Nach dem Hotfix konnten Nutzer ihre Rolle nicht mehr ändern, wohl aber
-- XP, Streak und Frachtmünzen ihres eigenen Profils direkt per PostgREST
-- setzen (Rangliste und Münz-Ökonomie wirkungslos). Nutzer dürfen jetzt nur
-- noch ihre eigenen Einstellungen ändern; XP, Streak und Münzen schreiben
-- quiz/sessions und quiz/blitz/finish über den Service-Client, den
-- Münzabzug beim Kauf purchase_shop_item() (SECURITY DEFINER).
--
-- Erst NACH dem Deploy anwenden: der vorher ausgelieferte Code schreibt XP
-- und Streak noch mit dem Nutzer-Client.

REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (display_name, show_real_name, leaderboard_opt_out, starter_coins_seen) ON profiles TO authenticated;

-- PROJ-20 BUG-3: purchase_shop_item lehnt ohne Login ohnehin ab, soll aber
-- für anon gar nicht erst aufrufbar sein (Security-Advisor).
REVOKE EXECUTE ON FUNCTION purchase_shop_item(uuid) FROM anon;
