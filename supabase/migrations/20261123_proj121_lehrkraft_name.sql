-- PROJ-121: Lehrkräfte geben Vor- und Nachnamen an (Pflicht bei der ersten Anmeldung)
--
-- profiles.first_name / profiles.last_name: freiwillige Spalten. „Noch nicht
-- angegeben“ = beide leer (NULL). Daran erkennt der Türsteher (Proxy), wen er
-- fragen muss; bestehende Lehrkräfte und Admins brauchen keine Nachpflege.
--
-- Bewusst KEIN Spalten-Recht für `authenticated`: Geschrieben wird nur über die
-- Server-Schnittstelle /api/profile/name (Service-Rolle). Sie setzt Vorname,
-- Nachname und den abgeleiteten Anzeigenamen in einem Schritt, damit die drei
-- nie auseinanderlaufen.
--
-- Zusätzlich (QA BUG-1): `authenticated` darf `display_name` der eigenen Zeile
-- schreiben (Spalten-Recht aus PROJ-22). Bei Lehrer-Rollen würde das den
-- Anzeigenamen von Vor-/Nachname lösen und Fremdnamen im Kollegium erlauben.
-- Die Regel unten lehnt diese Änderung ab, wenn sie über die Nutzer-Sitzung
-- (PostgREST, Rolle `authenticated`) kommt. Die Server-Schnittstellen schreiben
-- mit der Service-Rolle und sind nicht betroffen; Azubis ebenfalls nicht.
--
-- Rein additiv: der bisherige Code läuft unverändert weiter.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_first_name_length
  CHECK (first_name IS NULL OR char_length(first_name) BETWEEN 1 AND 60);

ALTER TABLE profiles
  ADD CONSTRAINT profiles_last_name_length
  CHECK (last_name IS NULL OR char_length(last_name) BETWEEN 1 AND 60);

COMMENT ON COLUMN profiles.first_name IS
  'Vorname einer Lehrkraft/eines Admins (PROJ-121). NULL = noch nicht angegeben. Schreiben nur über /api/profile/name.';
COMMENT ON COLUMN profiles.last_name IS
  'Nachname einer Lehrkraft/eines Admins (PROJ-121). NULL = noch nicht angegeben. Schreiben nur über /api/profile/name.';

-- ── Schutz: Anzeigename der Lehrer-Rollen nicht über die Nutzer-Sitzung änderbar ──

CREATE OR REPLACE FUNCTION public.profiles_name_schutz()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND OLD.role::text IN ('teacher', 'department_admin', 'admin') THEN
    RAISE EXCEPTION 'Der Anzeigename wird aus Vor- und Nachname gebildet und kann nicht direkt geändert werden.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_name_schutz ON public.profiles;
CREATE TRIGGER profiles_name_schutz
  BEFORE UPDATE OF display_name ON public.profiles
  FOR EACH ROW
  WHEN (OLD.display_name IS DISTINCT FROM NEW.display_name)
  EXECUTE FUNCTION public.profiles_name_schutz();

REVOKE ALL ON FUNCTION public.profiles_name_schutz() FROM PUBLIC, anon, authenticated;
