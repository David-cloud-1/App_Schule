-- Rückweg zu 20261125_proj18_push_erinnerung.sql: entfernt beide Tabellen.
-- Folge: Alle Geräte-Anmeldungen und der Versandstand sind weg; die Oberfläche
-- zeigt Erinnerungen wieder als „aus“. Der Cron-Job meldet dann nur einen Fehler.
DROP TABLE IF EXISTS public.push_reminder_state;
DROP TABLE IF EXISTS public.push_subscriptions;
