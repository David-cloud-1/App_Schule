-- PROJ-21 BUG-1: Lösungsschlüssel für eingeloggte Nutzer sperren
--
-- Bisher durfte jeder eingeloggte Nutzer answer_options.is_correct lesen
-- (Policy answer_options_authenticated_read). Da der Anon-Key öffentlich im
-- Browser-Bundle steckt, konnte jeder Azubi während eines benoteten
-- Leistungsnachweises die richtige Antwort jeder angezeigten Frage direkt
-- per PostgREST abfragen.
--
-- RLS kann keine einzelne Spalte verbergen, deshalb Spaltenrechte: die
-- Rollen anon/authenticated sehen nur noch id, question_id, option_text und
-- display_order. Alle Server-Pfade, die den Schlüssel brauchen (Quiz,
-- Blitzrunde, Prüfungssimulation, Admin, Bewertung), holen ihn über den
-- Service-Client (src/lib/answer-key.ts). Admins haben dieselbe DB-Rolle
-- (authenticated) und sind daher ebenfalls betroffen — auch ihre Routen
-- laufen über answer-key.ts.
--
-- Erst NACH dem Deploy des neuen Codes anwenden: der alte Code liest
-- is_correct noch mit dem Nutzer-Client.

REVOKE SELECT ON answer_options FROM anon, authenticated;
GRANT SELECT (id, question_id, option_text, display_order) ON answer_options TO authenticated;
