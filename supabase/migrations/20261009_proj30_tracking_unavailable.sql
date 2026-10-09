-- PROJ-30: Kennzeichen „Keine Überwachung möglich"
--
-- Kennt der Browser eines Azubis weder Sichtbarkeits- noch Fokus-Ereignisse
-- (sehr alte oder eingeschränkte In-App-Browser), meldet der Runner das einmal.
-- Die Lehrkraft sieht dann statt eines irreführenden „—", dass bei dieser
-- Teilnahme nichts erfasst werden konnte. Rein additiv, Standard false.

ALTER TABLE assessment_focus_summary
  ADD COLUMN IF NOT EXISTS tracking_unavailable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN assessment_focus_summary.tracking_unavailable IS
  'PROJ-30: Der Browser des Azubis kennt weder Sichtbarkeits- noch Fokus-Ereignisse; es konnte nichts erfasst werden.';
