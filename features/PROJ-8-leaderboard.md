# PROJ-8: Leaderboard

## Status: In Progress
**Created:** 2026-04-16
**Last Updated:** 2026-04-18

## Dependencies
- Requires: PROJ-1 (User Authentication) – eingeloggte Nutzer, Profilinfos
- Requires: PROJ-4 (XP & Level System) – XP als Ranking-Grundlage
- Requires: PROJ-5 (Streak System) – Streak-Anzeige im Leaderboard-Eintrag (optional)

## Overview
Das Leaderboard zeigt alle registrierten Azubis nach gesammelten XP gerankt. Nutzer sehen ihre eigene Position immer hervorgehoben, können nach Zeitraum filtern und sich optional per Opt-out aus dem öffentlichen Ranking abmelden.

**Scope:** Alle registrierten Nutzer (kein Klassen-/Gruppen-Scope im MVP)  
**Namen:** Selbst gewählter Display Name (aus Profil-Einstellungen)  
**Zeitraum-Filter:** Diese Woche / Dieser Monat / Gesamt (All-Time)  
**Datenschutz:** Opt-out in Profil-Einstellungen

---

## User Stories

### Als Azubi (Lernender)
- **US-1:** Als Azubi möchte ich das Leaderboard mit allen anderen Nutzern sehen, damit freundschaftlicher Wettbewerb mich täglich motiviert.
- **US-2:** Als Azubi möchte ich zwischen den Zeiträumen "Diese Woche", "Dieser Monat" und "Gesamt" wechseln können, damit ich unterschiedliche Wettbewerbs-Perspektiven habe.
- **US-3:** Als Azubi möchte ich meine eigene Position immer sehen – auch wenn ich nicht in den Top 10 bin – damit ich weiß, wie viel ich noch aufholen muss.
- **US-4:** Als Azubi möchte ich den Display Name eines anderen Nutzers sehen (nicht die E-Mail), damit die App sich sicher anfühlt.
- **US-5:** Als Azubi möchte ich mich per Opt-out aus dem Leaderboard abmelden können, damit ich nicht öffentlich gerankt werde, wenn ich das nicht möchte.
- **US-6:** Als Azubi, der Opt-out aktiviert hat, möchte ich trotzdem meine eigene (anonyme) Position sehen, damit ich meinen eigenen Fortschritt verfolgen kann.
- **US-7:** Als Azubi möchte ich die Top 3 Plätze visuell hervorgehoben sehen (Gold/Silber/Bronze), damit das Leaderboard sich wie eine echte Rangliste anfühlt.

---

## Acceptance Criteria

### Anzeige & Ranking
- [ ] Das Leaderboard zeigt die Top 10 Nutzer nach XP (sortiert absteigend)
- [ ] Jeder Eintrag zeigt: Rang (1, 2, 3 ...), Avatar/Initialen, Display Name, XP, Level-Badge
- [ ] Top-3-Plätze sind visuell hervorgehoben: Gold (🥇), Silber (🥈), Bronze (🥉)
- [ ] Wenn weniger als 10 Nutzer vorhanden sind, werden alle verfügbaren angezeigt
- [ ] Bei gleicher XP-Zahl: alphabetisch nach Display Name als Tiebreaker

### Eigene Position
- [ ] Die eigene Position wird immer angezeigt – am unteren Rand des Leaderboards, wenn außerhalb Top 10
- [ ] Die eigene Position ist visuell hervorgehoben (z. B. farbiger Rahmen, "Du"-Label)
- [ ] Wenn der eigene Nutzer in den Top 10 ist, wird kein separater Eintrag am unteren Rand angezeigt

### Zeitraum-Filter
- [ ] Drei Filter-Tabs: "Diese Woche", "Dieser Monat", "Gesamt"
- [ ] Standard-Tab bei Seitenaufruf: "Diese Woche"
- [ ] Wechsel zwischen Tabs ohne Seiten-Reload (client-seitig oder SWR-basiert)
- [ ] "Diese Woche" = XP der laufenden Woche (Montag 00:00 bis Sonntag 23:59 lokaler Zeit)
- [ ] "Dieser Monat" = XP des laufenden Kalendermonats

### Datenschutz & Opt-out
- [ ] Nutzer können in den Profil-Einstellungen das Leaderboard per Toggle deaktivieren (Opt-out)
- [ ] Opt-out-Nutzer erscheinen nicht im Leaderboard anderer Nutzer
- [ ] Opt-out-Nutzer sehen trotzdem ihre eigene anonyme Position ("Du – Rang #X") mit aktuellen XP
- [ ] Das Opt-out-Setting ist sofort wirksam (kein Cache-Delay)

### Zugang & Performance
- [ ] Leaderboard ist nur für eingeloggte Nutzer sichtbar
- [ ] Leaderboard lädt in < 500ms (Gesamt-View gecacht, max. stündlich invalidiert)
- [ ] Wöchentliche und monatliche XP werden aus Sitzungs-Zeitstempeln berechnet

---

## Edge Cases

| Szenario | Erwartetes Verhalten |
|----------|---------------------|
| Weniger als 10 Nutzer registriert | Alle vorhandenen Nutzer anzeigen (kein Fehler) |
| Nur 1 Nutzer vorhanden | Nutzer sieht sich selbst auf Rang #1 |
| Zwei Nutzer mit identischer XP | Alphabetisch nach Display Name als Tiebreaker |
| Nutzer hat Opt-out aktiviert | Erscheint nicht für andere; sieht eigene anonyme Position |
| Nutzer hat noch keinen Display Name gesetzt | Initialen aus E-Mail-Adresse als Fallback ("A.B.") |
| Nutzer hat 0 XP (noch keine Session) | Erscheint am Ende der Rangliste (Rang wird nicht unterdrückt) |
| Woche beginnt mit 0 XP (Montag 00:00) | Leaderboard zeigt alle mit 0 XP in alphabetischer Reihenfolge |
| Nutzer wechselt Display Name | Leaderboard zeigt neuen Namen bei nächstem Laden |

---

## Out of Scope (MVP)
- Klassen- oder Gruppen-spezifische Leaderboards
- Push-Benachrichtigung bei Rang-Änderung
- Historische Leaderboard-Daten (vergangene Wochen/Monate)
- Freundschaftslisten oder Follower-System

---

## Notes
- Display Name wird im Profil gesetzt (ggf. bei Registrierung oder in Einstellungen)
- Avatar: Initiale aus Display Name, farblich nach Nutzer-ID gehashed (kein Foto-Upload im MVP)
- XP-Berechnung für Wochen-/Monats-Filter: Aggregation über `quiz_sessions`-Tabelle (Zeitstempel-Filter)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
Implemented without separate architecture phase:
- **DB migration:** `leaderboard_opt_out boolean NOT NULL DEFAULT false` added to `profiles`
- **API:** `GET /api/leaderboard?period=week|month|all` — aggregates `quiz_sessions.xp_earned` for time-boxed periods, uses `profiles.total_xp` for all-time; excludes opted-out users, always returns current user's position
- **API:** `PATCH /api/profile/opt-out` — sets `leaderboard_opt_out` for current user
- **UI:** `/leaderboard` page (Server + Client split), `LeaderboardClient` component with Tabs for period switching, `LeaderboardEntry` component with rank/avatar/XP display, Top 3 medal icons, own position pinned at bottom when outside top 10
- **Profile:** `LeaderboardOptOutToggle` client component added to `/profile` settings section

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
