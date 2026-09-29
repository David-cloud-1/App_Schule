-- PROJ-23 Schritt 1: Shop-Kauf nur innerhalb des eigenen Fachbereichs
--
-- purchase_shop_item() ist direkt aus dem Browser aufrufbar (RPC). Deshalb
-- prüft die Funktion selbst, dass der Artikel zum Bereich des Käufers gehört —
-- ein Filter in der Shop-Anzeige allein würde direkte Aufrufe nicht erfassen.
-- Profile ohne Bereich zählen wie der Rückfall-Bereich (fallback_department_id()).
--
-- Außerdem PROJ-22 QA BUG-2: generate_unique_pseudonym() war über den
-- PUBLIC-Standard-Grant auch ohne Login aufrufbar.
--
-- Rückweg: Funktion aus 20260913_proj19_proj20_coins_shop.sql erneut anlegen.

CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_item_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id       uuid := auth.uid();
  v_price         integer;
  v_active        boolean;
  v_item_dept     uuid;
  v_user_dept     uuid;
  v_new_balance   integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT price, is_active, department_id INTO v_price, v_active, v_item_dept
  FROM shop_items
  WHERE id = p_item_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  IF NOT v_active THEN
    RAISE EXCEPTION 'item_inactive';
  END IF;

  -- PROJ-23: Artikel muss zum Bereich des Käufers gehören
  SELECT COALESCE(department_id, fallback_department_id()) INTO v_user_dept
  FROM profiles
  WHERE id = v_user_id;

  IF v_item_dept IS DISTINCT FROM v_user_dept THEN
    RAISE EXCEPTION 'item_other_department';
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
$function$;

-- CREATE OR REPLACE behält die bestehenden Grants (nur authenticated)

-- PROJ-22 QA BUG-2
REVOKE EXECUTE ON FUNCTION generate_unique_pseudonym(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_unique_pseudonym(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION generate_unique_pseudonym(uuid) TO authenticated, service_role;
