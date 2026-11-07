# PROJ-81: Aufgabenliste für Lehrkräfte auf der Startseite

## Status: In Progress
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

### A) Aufbau der Oberfläche
```
/admin (Startseite)
+-- „Zu erledigen“ (neue Karte, vor „Läuft gerade“)
|   +-- Aktualisieren-Knopf
|   +-- Zeilen: Icon, ein Satz mit Anzahl, Link (nur Quellen mit offenen Punkten)
|   +-- „Alles erledigt“, wenn nichts ansteht
|   +-- Lade- und Fehlerzustand (Skeleton, „Erneut versuchen“)
Seitenleiste
+-- Zähler (orange) an „Leistungsnachweise“ und „Gemeldete Fragen“
```

### B) Daten
Keine neuen Tabellen, keine Migration. Eine Schnittstelle `GET /api/admin/tasks` liefert nur Zahlen. Jede Quelle wird einzeln und mit dem Zeilenschutz der fragenden Person gelesen; fällt eine aus, fehlt nur ihre Zeile.
- gemeldete Fragen (PROJ-73): Ansicht „question_report_groups“, ohne die Meldungen, die die Person gerade selbst prüft
- Nachweise: Entwürfe mit Termin in den nächsten 7 Tagen; beendete Nachweise mit mindestens einer Abgabe und ohne Freigabe (nur der letzten 90 Tage)
- Fragen-Entwürfe (KI/Import), nur für Admins

### C) Geltungsbereich
Lehrkraft: nur eigene Nachweise. Bereichs-Admin und Super-Admin: der eigene bzw. mit dem Umschalter gewählte Fachbereich.

### D) Tech-Entscheidungen
- **Zähler statt Listen:** Die Karte lädt nur Zahlen, keine Namen oder Inhalte. Das ist schnell und gibt nichts preis.
- **Beim Seitenwechsel neu holen**, wie der Hinweis-Zähler des Lehrerzimmers; Echtzeit ist nicht nötig.
- **Modular:** Neue Quellen (Nachschreiber, Auffälligkeiten) lassen sich später als eine Zeile in `teacher-tasks.ts` und eine Abfrage in der Schnittstelle ergänzen.
- Keine KI, keine neue Bibliothek, keine laufenden Kosten.

## Implementation Notes (2026-11-10)
- Neu: `lib/teacher-tasks.ts` (Sätze, Reihenfolge, Zähler-Format, Antwort-Prüfung), `GET /api/admin/tasks`, `use-task-counts.ts`, `AdminTasksCard` (auf der Startseite), Zähler an den Seitenleisten-Einträgen. **Keine Migration nötig.**
- **Abweichungen von der Spec:** (1) Die Einträge „Nachschreiber“ (PROJ-80) und „auffällige Fragen in Nachweisen“ (PROJ-75) fehlen vorerst; PROJ-80 ist nicht gebaut, und die Auffälligkeiten bräuchten eine Analyse über alle Nachweise. Beide lassen sich später als Zeile ergänzen. (2) Beendete Nachweise ohne Freigabe zählen nur 90 Tage lang, damit alte Test-Nachweise nicht dauerhaft mahnen. (3) „Entwürfe mit Termin“ rechnet fortlaufend 7 Tage ab jetzt (nicht nach Kalendertagen). (4) Der Zähler an „Gemeldete Fragen“ ist sichtbar, sobald der Eintrag sichtbar ist; er steht in „Weitere Seiten“ und ist erst nach dem Aufklappen zu sehen.
- Tests: `teacher-tasks.test.ts` (10), `api/admin/tasks/route.test.ts` (8), `admin-tasks-card.test.tsx` (5); Gesamtstand 2573 Tests grün, Build grün.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
