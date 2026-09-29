-- PROJ-23 Schritt 2: Neue Profile starten ohne Fachbereich
--
-- ERST NACH DEM DEPLOY DES PROJ-23-CODES ANWENDEN. Der Code ordnet Profile
-- ohne Bereich beim ersten Server-Kontakt anhand der Adresse zu
-- (assignDepartmentIfMissing). Der bisherige Standardwert „Spedition" würde
-- diese Zuordnung verhindern.
--
-- Bestehende Profile behalten ihren Bereich. Das Pseudonym neuer Profile
-- entsteht zunächst mit den Nomen des Rückfall-Bereichs und wird bei der
-- Zuordnung passend zum Bereich neu erzeugt.
--
-- Rückweg:
--   ALTER TABLE profiles ALTER COLUMN department_id SET DEFAULT fallback_department_id();

ALTER TABLE profiles ALTER COLUMN department_id DROP DEFAULT;
