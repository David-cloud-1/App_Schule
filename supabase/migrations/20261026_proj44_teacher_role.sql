-- PROJ-44: Lehrkraft-Rolle & Freischaltung
--
-- 1. profiles.role erlaubt zusätzlich 'teacher' (Lehrkraft ohne Verwaltungsrechte).
--    Alle Zugriffsregeln (RLS) und Hilfsfunktionen fragen gezielt nach 'admin'
--    bzw. 'department_admin' (geprüft am 2026-10-26): eine Lehrkraft hat
--    in der Datenbank damit exakt die Rechte eines Azubis. Es werden KEINE
--    Policies geändert.
-- 2. profiles.teacher_welcome_seen: merkt am Konto, dass der einmalige
--    Willkommens-Hinweis gesehen wurde. Selbst setzbar (Spalten-Grant wie bei
--    starter_coins_seen); role/department_id bleiben weiterhin nicht selbst
--    schreibbar.
--
-- Rein additiv: der bisher ausgelieferte Code kennt weder Rolle noch Feld und
-- läuft unverändert weiter.
--
-- Rückweg: siehe 20261026_proj44_teacher_role_down.sql

ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'admin'::text, 'department_admin'::text]));

ALTER TABLE profiles
  ADD COLUMN teacher_welcome_seen boolean NOT NULL DEFAULT false;

GRANT UPDATE (teacher_welcome_seen) ON profiles TO authenticated;
