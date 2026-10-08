-- Rückweg für 20261008_proj29_linked_accounts.sql
-- Hinweis: Bereits angelegte Zweitkonten (auth.users) bleiben bestehen und
-- müssen bei Bedarf separat gelöscht werden — sie sind danach normale
-- Azubi-Konten im Bereich Tourismus.

BEGIN;

DROP INDEX IF EXISTS profiles_linked_main_user_id_key;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_linked_not_self;
ALTER TABLE profiles DROP COLUMN IF EXISTS linked_main_user_id;

COMMIT;
