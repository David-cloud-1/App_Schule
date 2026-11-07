# PROJ-81: Aufgabenliste für Lehrkräfte auf der Startseite

## Status: Planned
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-40 (Admin-Startseite), PROJ-45 (Layout, Seitenleiste), PROJ-44/24 (Rechte), PROJ-29 (Bereichs-Umschalter)
- Quellen (jeweils optional, Einträge erscheinen nur, wenn die Quelle existiert): PROJ-73 (Meldungen), PROJ-21/28 (Nachweise), PROJ-80 (Nachschreiber), PROJ-10 (Fragen-Entwürfe), PROJ-75 (Auffälligkeiten)

## Summary
Auf der Startseite des Lehrkräfte-Bereichs steht „Zu erledigen“: eine kurze Liste mit allem, was gerade auf die Lehrkraft wartet, jeweils mit Anzahl und direktem Link. So bleibt nichts liegen, ohne dass man jeden Bereich einzeln durchklicken muss.

## User Stories
- Als **Lehrkraft** möchte ich beim Öffnen sofort sehen, was zu tun ist, damit ich nichts vergesse.
- Als **Lehrkraft** möchte ich mit einem Klick zu der Stelle springen, an der etwas ansteht.
- Als **Bereichs-Admin** möchte ich sehen, was in meinem Fachbereich offen ist, nicht nur bei mir selbst.
- Als **Lehrkraft** möchte ich, dass die Liste leer ist, wenn nichts ansteht, und mich nicht mit Dauermeldungen nervt.

## Acceptance Criteria

### Inhalt
- [ ] Die Karte „Zu erledigen“ steht oben auf der Admin-Startseite (vor den Kacheln aus PROJ-40). Jeder Eintrag ist eine Zeile: Icon, ein Satz mit Anzahl, Link.
- [ ] Mögliche Einträge: 
  - „X gemeldete Fragen warten“ (offene Meldungen des Fachbereichs, PROJ-73)
  - „X Nachweise sind beendet, Ergebnisse noch nicht freigegeben“
  - „X Nachweise im Entwurf mit Termin in den nächsten 7 Tagen“
  - „X Nachschreiber haben einen Termin in den nächsten 7 Tagen“ (PROJ-80)
  - „X Fragen-Entwürfe warten auf Prüfung“ (KI-/Importentwürfe, PROJ-10/38)
  - „X Fragen in Nachweisen sind auffällig“ (rote Ampel aus PROJ-75 in Nachweisen der letzten 30 Tage, die noch nicht behandelt wurden)
- [ ] Einträge mit Anzahl 0 werden **nicht** angezeigt. Sind alle 0, steht „Alles erledigt“ mit Häkchen-Icon.
- [ ] Reihenfolge nach Dringlichkeit: Nachweise mit nahem Termin, Nachschreiber, Auffälligkeiten, Meldungen, Entwürfe, Freigaben.
- [ ] Jeder Eintrag verlinkt direkt auf die passende, bereits gefilterte Ansicht (z. B. Inbox mit Filter „offen“).
- [ ] Die Seitenleiste zeigt am Eintrag „Gemeldete Fragen“ und bei Nachweisen ein Zähler-Badge mit derselben Anzahl (zu hohe Zahlen als „99+“).

### Geltungsbereich
- [ ] Lehrkraft sieht Einträge für den eigenen Fachbereich; **Nachweis-bezogene** Einträge nur für Nachweise, die sie angelegt hat oder die ihrem Fachbereich gehören.
- [ ] Bereichs-Admin sieht alle Einträge seines Fachbereichs; Super-Admin sieht den Bereich, den der Umschalter (PROJ-29) gewählt hat.
- [ ] Lehrkräfte ohne Fachbereich (PROJ-46) sehen nur Einträge zu ihren eigenen Nachweisen.
- [ ] Quellen, die es (noch) nicht gibt, werden stillschweigend ausgelassen; die Karte funktioniert auch mit nur einem Teil der Features.

### Verhalten
- [ ] Die Karte lädt eigenständig mit Skeleton-Zustand (`AdminLoadingState`), ohne den Rest der Startseite zu blockieren.
- [ ] Bei Ladefehler: `AdminErrorState` mit „Erneut versuchen“; ein Fehler in einer Quelle blendet nur diese Zeile aus, nicht die ganze Karte.
- [ ] Die Zahlen sind höchstens 60 Sekunden alt; „Aktualisieren“ lädt neu.

## Edge Cases
- Viele Einträge gleichzeitig (> 6 Arten): Die ersten 5 stehen sichtbar, der Rest unter „Weitere anzeigen“.
- Eine Lehrkraft arbeitet gerade eine Meldung ab (PROJ-73, „in Prüfung“): Diese Meldung zählt für sie nicht mehr als offen, für andere weiterhin.
- Nachweis ohne Termin im Entwurf: erscheint nicht unter „Termin in 7 Tagen“.
- Zeitzone: „in den nächsten 7 Tagen“ rechnet in deutscher Ortszeit, Zeitumstellung führt nicht zu falschen Tagen.
- Lehrkraft hat Zugriff auf mehrere Fachbereiche über Super-Admin-Rechte: Zähler addiert nur den gewählten Bereich.
- Kein einziger Eintrag wird je angezeigt (Features nicht ausgerollt): Karte zeigt „Alles erledigt“ statt Fehlermeldung.

## Technical Requirements
- Performance: Alle Zähler in einem serverseitigen Aufruf, unter 500 ms (nur Zahlen, kein Laden der Listen).
- Security: Zähler nur für die Fachbereiche und Nachweise, die die Person sehen darf; keine Namen oder Inhalte in der Antwort.
- Keine E-Mails oder Pushes, nur die Anzeige im Bereich.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
