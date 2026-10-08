-- PROJ-29: Bereichs-Umschalter für den Super-Admin
--
-- Verknüpftes Zweitkonto: Ein Profil kann auf ein "Hauptkonto" zeigen. Das
-- Zweitkonto (Tourismus-Testkonto des Super-Admins) ist ein normales
-- Azubi-Konto; die Verknüpfung dient nur dem serverseitigen Sitzungswechsel
-- und dem Ausschluss aus Auswertungen.
--
-- Die Spalte ist nicht selbst änderbar: der Spalten-Grant auf profiles
-- erlaubt Nutzern nur display_name, show_real_name, leaderboard_opt_out und
-- starter_coins_seen (Stand PROJ-23). Geschrieben wird ausschließlich über den
-- Service-Client der Umschalt-Schnittstelle.
--
-- Rückweg: siehe 20261008_proj29_linked_accounts_down.sql

BEGIN;

ALTER TABLE profiles
  ADD COLUMN linked_main_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_linked_not_self
  CHECK (linked_main_user_id IS NULL OR linked_main_user_id <> id);

-- Höchstens ein Zweitkonto je Hauptkonto (schützt auch vor doppeltem Anlegen
-- bei schnellem Doppelklick)
CREATE UNIQUE INDEX profiles_linked_main_user_id_key
  ON profiles (linked_main_user_id)
  WHERE linked_main_user_id IS NOT NULL;

COMMIT;
