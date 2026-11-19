-- Rate-Limit für Schnittstellen (Sicherheits-Härtung, kein eigenes PROJ)
--
-- Ein gemeinsamer Zähler in der Datenbank statt eines externen Dienstes
-- (Budgetvorgabe, wie bei assessment_lookup_attempts). Ein Zeile je Schlüssel
-- (z. B. "<Nutzer-ID>:schreiben"); sie wird im Zeitfenster hochgezählt und
-- danach neu begonnen. Die Zeilenzahl ist durch Nutzer × Kategorien begrenzt,
-- ein Aufräumen ist nicht nötig.
--
-- Der Zugriff läuft ausschließlich über die Service-Rolle (Proxy). RLS ist an,
-- es gibt bewusst keine Policy: weder anon noch authenticated sehen etwas.
-- Rein additiv; Rückweg: 20261124_rate_limit_down.sql

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits         integer NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Zählt einen Aufruf und sagt, ob er noch erlaubt ist. Ein einziger Schritt
-- (Upsert), damit gleichzeitige Anfragen sich nicht überholen können.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, retry_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window interval := make_interval(secs => p_window_seconds);
  r public.rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.rate_limits AS t (key, window_start, hits)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN t.window_start + v_window <= v_now THEN v_now ELSE t.window_start END,
    hits         = CASE WHEN t.window_start + v_window <= v_now THEN 1 ELSE t.hits + 1 END
  RETURNING t.* INTO r;

  allowed := r.hits <= p_max;
  retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (r.window_start + v_window - v_now)))::integer);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer) TO service_role;
