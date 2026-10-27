-- PROJ-50: Lehrkraft-Profil („Mein Konto“)
--
-- 1. profiles.kuerzel: freiwilliges Kürzel (2–5 Großbuchstaben). Nicht
--    eindeutig. Die Person darf es selbst setzen (Spalten-Recht + vorhandene
--    Policy „profiles_update_own“); die Rolle bleibt weiterhin gesperrt.
-- 2. graded_assessments.creator_viewed_at: wann die erstellende Person die
--    Auswertung des geschlossenen Nachweises zum ersten Mal geöffnet hat.
--    Bereits geschlossene Nachweise gelten als angesehen, damit die Liste
--    „Offene Aufgaben“ beim Start nicht überquillt.
--
-- Rein additiv: der bisherige Code läuft unverändert weiter.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kuerzel text;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_kuerzel_format
  CHECK (kuerzel IS NULL OR kuerzel ~ '^[A-ZÄÖÜẞ]{2,5}$');

COMMENT ON COLUMN profiles.kuerzel IS
  'Freiwilliges Kürzel einer Lehrkraft (2–5 Großbuchstaben, nicht eindeutig). Selbst änderbar.';

GRANT UPDATE (kuerzel) ON profiles TO authenticated;

ALTER TABLE graded_assessments ADD COLUMN IF NOT EXISTS creator_viewed_at timestamptz;

COMMENT ON COLUMN graded_assessments.creator_viewed_at IS
  'Erste Ansicht der Auswertung durch die erstellende Person nach dem Schließen. NULL = noch nicht angesehen.';

UPDATE graded_assessments
   SET creator_viewed_at = now()
 WHERE status = 'closed' AND creator_viewed_at IS NULL;
