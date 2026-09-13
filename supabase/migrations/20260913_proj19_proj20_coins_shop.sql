-- PROJ-19: Blitzrunde & Frachtmünzen, PROJ-20: Speditionshof & Shop
--
-- Frachtmünzen-Stand auf profiles, einmaliges Startguthaben aus bisherigem
-- Lernfortschritt, Blitzrunden-Tagessperre + Start-Marke zur serverseitigen
-- Plausibilitätsprüfung, sowie der Speditionshof-Katalog samt Besitz-Tabelle
-- und einer atomaren Kauf-Funktion.

-- ── PROJ-19: Frachtmünzen-Stand ────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coin_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starter_coins integer,
  ADD COLUMN IF NOT EXISTS starter_coins_seen boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.coin_balance IS
  'Frachtmünzen-Stand (PROJ-19). Wird nie negativ, ausgegeben in PROJ-20 ausschließlich über purchase_shop_item().';
COMMENT ON COLUMN profiles.starter_coins IS
  'Einmaliger Startguthaben-Betrag aus bisherigem XP-Stand, für den "Willkommen zurück"-Hinweis. NULL = kein Startguthaben vergeben.';

-- Einmaliges, idempotentes Startguthaben: min(60 + floor(total_xp/8), 250),
-- nur für Konten mit bisherigem Fortschritt. Der WHERE-Filter auf
-- coin_balance = 0 macht einen erneuten Lauf wirkungslos.
UPDATE profiles
SET coin_balance   = LEAST(60 + FLOOR(total_xp / 8.0)::int, 250),
    starter_coins  = LEAST(60 + FLOOR(total_xp / 8.0)::int, 250)
WHERE total_xp > 0 AND coin_balance = 0;

-- ── PROJ-19: Blitzrunde ────────────────────────────────────────────────────

-- Server-Start-Marke: erzeugt beim Rundenstart, macht die Rundendauer und
-- "wurde überhaupt gestartet" serverseitig prüfbar (Architektur-Entscheidung
-- PROJ-19, statt der vom Gerät gemeldeten Zeit zu vertrauen).
CREATE TABLE IF NOT EXISTS blitz_starts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed   boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS blitz_starts_user_idx ON blitz_starts (user_id);

ALTER TABLE blitz_starts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blitz_starts_own ON blitz_starts;
CREATE POLICY blitz_starts_own ON blitz_starts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Eine Zeile pro gewerteter Blitzrunde. UNIQUE(user_id, calendar_day) ist die
-- eigentliche Tagessperre — sie hält auch bei zwei gleichzeitigen
-- Wertungsversuchen (Doppeltipp, zwei Tabs), weil nur ein INSERT gewinnt.
CREATE TABLE IF NOT EXISTS blitz_rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_day  date NOT NULL,
  correct_count integer NOT NULL,
  coins_earned  integer NOT NULL,
  xp_earned     integer NOT NULL,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, calendar_day)
);

ALTER TABLE blitz_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blitz_rounds_select_own ON blitz_rounds;
CREATE POLICY blitz_rounds_select_own ON blitz_rounds
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS blitz_rounds_insert_own ON blitz_rounds;
CREATE POLICY blitz_rounds_insert_own ON blitz_rounds
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── PROJ-20: Speditionshof-Katalog ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shop_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL,
  icon        text NOT NULL,
  price       integer NOT NULL CHECK (price >= 1),
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

-- Jeder eingeloggte Nutzer sieht aktive Items (für den Shop selbst).
DROP POLICY IF EXISTS shop_items_select_active ON shop_items;
CREATE POLICY shop_items_select_active ON shop_items
  FOR SELECT
  USING (is_active = true);

-- Admins sehen und verwalten den gesamten Katalog inkl. inaktiver Items.
DROP POLICY IF EXISTS shop_items_admin_all ON shop_items;
CREATE POLICY shop_items_admin_all ON shop_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ein Kauf pro Nutzer und Item. ON DELETE RESTRICT auf item_id verhindert
-- serverseitig, dass ein bereits gekauftes Item je gelöscht wird (die Spec
-- erlaubt für solche Items ausdrücklich nur Deaktivieren, kein Löschen) —
-- es existiert bewusst kein DELETE-Endpunkt für shop_items.
CREATE TABLE IF NOT EXISTS user_shop_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id      uuid NOT NULL REFERENCES shop_items(id) ON DELETE RESTRICT,
  price_paid   integer NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

ALTER TABLE user_shop_items ENABLE ROW LEVEL SECURITY;

-- Nur lesend für den eigenen Bestand — Schreiben läuft ausschließlich über
-- purchase_shop_item() (SECURITY DEFINER), damit Preisprüfung und
-- Münzabzug garantiert zusammen passieren.
DROP POLICY IF EXISTS user_shop_items_select_own ON user_shop_items;
CREATE POLICY user_shop_items_select_own ON user_shop_items
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_shop_items_admin_select ON user_shop_items;
CREATE POLICY user_shop_items_admin_select ON user_shop_items
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Atomarer Kauf: Preis-/Aktiv-/Besitz-Prüfung, Münzabzug und Gutschrift in
-- einer einzigen Transaktion. SECURITY DEFINER, damit die Funktion trotz
-- fehlender INSERT/UPDATE-Policies für normale Nutzer schreiben kann; die
-- Berechtigung dazu kommt ausschließlich über GRANT EXECUTE, nicht über RLS.
CREATE OR REPLACE FUNCTION purchase_shop_item(p_item_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_price       integer;
  v_active      boolean;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT price, is_active INTO v_price, v_active
  FROM shop_items
  WHERE id = p_item_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  IF NOT v_active THEN
    RAISE EXCEPTION 'item_inactive';
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_shop_items WHERE user_id = v_user_id AND item_id = p_item_id
  ) THEN
    RAISE EXCEPTION 'already_owned';
  END IF;

  -- Bedingtes UPDATE ist die atomare Guthabenprüfung: Läuft eine zweite
  -- gleichzeitige Kauf-Transaktion, sieht sie entweder den bereits
  -- abgezogenen Stand (und schlägt hier fehl) oder wartet auf die
  -- Zeilensperre von Postgres — kein Zwischenzustand möglich.
  UPDATE profiles
  SET coin_balance = coin_balance - v_price
  WHERE id = v_user_id AND coin_balance >= v_price
  RETURNING coin_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  INSERT INTO user_shop_items (user_id, item_id, price_paid)
  VALUES (v_user_id, p_item_id, v_price);

  RETURN v_new_balance;
END;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on function creation; revoke
-- that explicitly so only signed-in users can even attempt the call (the
-- function itself also rejects a null auth.uid() with 'not_authenticated').
REVOKE EXECUTE ON FUNCTION purchase_shop_item(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purchase_shop_item(uuid) TO authenticated;

-- Startkatalog — enthält bewusst ein Item zu genau 75 Münzen, weil PROJ-19
-- das Startguthaben knapp darüber kalkuliert (siehe Edge Case in PROJ-20).
INSERT INTO shop_items (name, description, icon, price, sort_order)
VALUES
  ('Roter Sattelschlepper', 'Ein kräftiger Sattelschlepper für deinen Hof.', '🚛', 75, 1),
  ('Ampel-Deko', 'Eine kleine Verkehrsampel für die Hofeinfahrt.', '🚦', 40, 2),
  ('Neues Lagertor', 'Ein stabiles Tor für dein Lager.', '🏭', 120, 3),
  ('Wachhund Bello', 'Bello passt auf deinen Hof auf.', '🐕', 200, 4)
ON CONFLICT DO NOTHING;
