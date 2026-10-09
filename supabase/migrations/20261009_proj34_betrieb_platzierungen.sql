-- PROJ-34: „Mein Betrieb" – Platzierung gekaufter Items auf Kacheln
--
-- Ein Eintrag = ein gekauftes Item steht auf einer Kachel des Betriebsgrunds.
-- Kein Eintrag = das Item liegt im Lager. Die Landgröße wird NICHT gespeichert,
-- sondern aus der Zahl der Käufe berechnet (src/lib/betrieb-land.ts).
--
-- Sicherheitsmodell wie beim Kauf (PROJ-20): Schreiben läuft nur über die
-- Server-Schnittstelle (Service-Rolle, dort Besitz und Landgrenzen geprüft).
-- Azubis dürfen nur ihre eigenen Zeilen LESEN; es gibt bewusst keine
-- INSERT/UPDATE/DELETE-Policies. Die Datenbank sichert zusätzlich:
--   - nur eigene, wirklich gekaufte Items (Fremdschlüssel auf user_shop_items)
--   - ein Item steht höchstens einmal (Primärschlüssel)
--   - eine Kachel trägt höchstens ein Item (UNIQUE user_id, x, y)
--   - Kacheln liegen im denkbar größten Land (0..9)

BEGIN;

CREATE TABLE betrieb_platzierungen (
  user_id   uuid        NOT NULL,
  item_id   uuid        NOT NULL,
  x         smallint    NOT NULL CHECK (x BETWEEN 0 AND 9),
  y         smallint    NOT NULL CHECK (y BETWEEN 0 AND 9),
  placed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id),
  CONSTRAINT betrieb_platzierungen_kachel_key UNIQUE (user_id, x, y),
  CONSTRAINT betrieb_platzierungen_kauf_fkey
    FOREIGN KEY (user_id, item_id) REFERENCES user_shop_items (user_id, item_id) ON DELETE CASCADE
);

ALTER TABLE betrieb_platzierungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY betrieb_platzierungen_select_own ON betrieb_platzierungen
  FOR SELECT USING (auth.uid() = user_id);

-- Schreibzugriff nur über die Service-Rolle (Server-Schnittstelle): alle
-- Standardrechte entziehen, Azubis bekommen ausschließlich Lesen (und das nur
-- für die eigenen Zeilen, siehe Policy).
REVOKE ALL ON betrieb_platzierungen FROM anon, authenticated;
GRANT SELECT ON betrieb_platzierungen TO authenticated;

COMMIT;
