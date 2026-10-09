-- Rollback PROJ-34: Platzierungen verwerfen (Käufe bleiben unberührt; alle Items
-- liegen danach wieder im Lager).
DROP TABLE IF EXISTS betrieb_platzierungen;
