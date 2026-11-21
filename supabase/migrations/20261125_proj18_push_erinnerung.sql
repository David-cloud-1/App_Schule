-- PROJ-18: Erinnerungen per Web-Push
--
-- Zwei Tabellen:
--  * push_subscriptions  – eine Zeile je Gerät, auf dem ein Konto Erinnerungen
--                          erlaubt hat (Endpunkt + Schlüssel des Browsers)
--  * push_reminder_state – eine Zeile je Konto: Ablehnung der Opt-in-Karte und
--                          Stand des Versands (für „höchstens zweimal pro Woche“
--                          und das Abklingen)
--
-- Beide Tabellen werden ausschließlich über die Service-Rolle gelesen und
-- geschrieben (API-Routen prüfen vorher die Anmeldung, der Versand-Job läuft
-- mit CRON_SECRET). RLS ist an, es gibt bewusst keine Policy: weder anon noch
-- authenticated sehen etwas. Die Endpunkt-Adressen und Schlüssel sind geheim
-- (wer sie kennt, kann dem Gerät Meldungen schicken).
-- Löschen eines Kontos (PROJ-60) räumt über ON DELETE CASCADE mit auf.
-- Rein additiv; Rückweg: 20261125_proj18_push_erinnerung_down.sql

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Adresse beim Push-Dienst des Browsers; je Gerät und Adresse (Domain) eindeutig
  endpoint   text NOT NULL UNIQUE CHECK (char_length(endpoint) BETWEEN 20 AND 2048 AND endpoint LIKE 'https://%'),
  p256dh     text NOT NULL CHECK (char_length(p256dh) BETWEEN 20 AND 256),
  auth       text NOT NULL CHECK (char_length(auth) BETWEEN 8 AND 128),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.push_reminder_state (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Opt-in-Karte: zuletzt „Nein danke“ und wie oft (steuert die 14-Tage-Wiedervorlage)
  declined_at      timestamptz,
  decline_count    integer NOT NULL DEFAULT 0 CHECK (decline_count >= 0),
  -- Versand: Berliner Kalendertag der letzten Erinnerung (Schutz vor Doppelversand)
  last_sent_date   date,
  last_sent_at     timestamptz,
  sent_count       integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  -- Erinnerungen in Folge ohne Reaktion (Abklingen)
  ignored_in_a_row integer NOT NULL DEFAULT 0 CHECK (ignored_in_a_row >= 0),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_reminder_state ENABLE ROW LEVEL SECURITY;

-- Zugriff nur für die Service-Rolle (RLS ohne Policy sperrt alle anderen;
-- die Rechte zusätzlich entziehen, damit auch Fehlkonfiguration nichts öffnet)
REVOKE ALL ON public.push_subscriptions  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.push_reminder_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_subscriptions  TO service_role;
GRANT ALL ON public.push_reminder_state TO service_role;
