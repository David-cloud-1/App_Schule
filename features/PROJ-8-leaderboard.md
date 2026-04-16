# PROJ-8: Leaderboard

## Status: Planned
**Created:** 2026-04-16
**Last Updated:** 2026-04-16

## Dependencies
- Requires: PROJ-1 (User Authentication)
- Requires: PROJ-4 (XP & Level System) – XP als Ranking-Grundlage

## User Stories
- Als Azubi möchte ich sehen, wo ich im Vergleich zu anderen Azubis stehe (Rangliste), damit freundschaftlicher Wettbewerb mich motiviert.
- Als Azubi möchte ich die Rangliste nach Woche, Monat und gesamt filtern können.
- Als Azubi möchte ich meine eigene Position immer sehen, auch wenn ich nicht in den Top 10 bin.

## Acceptance Criteria
- [ ] Leaderboard zeigt Top 10 Nutzer nach XP (Woche / Monat / Gesamt)
- [ ] Jeder Eintrag zeigt: Rang, Avatar/Initialen, Nutzername (oder anonymisierter Name), XP, Level
- [ ] Eigene Position wird immer angezeigt (auch außerhalb Top 10), hervorgehoben
- [ ] Wechsel zwischen Zeitraum-Filtern (Woche / Monat / Gesamt) ohne Seiten-Reload
- [ ] Leaderboard ist für alle eingeloggten Nutzer sichtbar
- [ ] Datenschutz: Nutzer können entscheiden, ob sie auf dem Leaderboard erscheinen (Opt-out in Profil-Einstellungen)

## Edge Cases
- Was passiert, wenn weniger als 10 Nutzer vorhanden sind? → Alle verfügbaren Nutzer anzeigen
- Was passiert, wenn zwei Nutzer gleich viele XP haben? → Alphabetisch nach Nutzername als Tiebreaker
- Was passiert bei Opt-out? → Nutzer erscheint nicht im Leaderboard, sieht aber trotzdem seine anonyme Position

## Technical Requirements
- Leaderboard-Daten: Supabase-View oder materialized Query auf `profiles`-Tabelle
- Performance: Leaderboard-Load < 300ms (gecacht, max. stündlich aktualisiert)
- Wöchentliche XP: separate Berechnung aus `sessions`-Tabelle (Zeitstempel-Filter)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
