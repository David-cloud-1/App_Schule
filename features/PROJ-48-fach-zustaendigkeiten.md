# PROJ-48: Fach-Zuständigkeiten für Lehrkräfte (selbst eingetragen)

## Status: Planned
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Kontext
Teil der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Lehrkräfte unterrichten Fächer, oft über mehrere Fachbereiche hinweg (Beispiel: Spedition · STG und Tourismus · KSK). Außerdem gibt es an der Schule weitere Bildungsgänge, die noch keine Fragen in der App haben, aber künftig dazukommen sollen. Der Fachbereich als Einheit für Rechte (Bereichs-Admin) ist dafür zu grob.

Deshalb kommt die **Fach-Zuständigkeit** dazu: Eine Lehrkraft trägt sich selbst für die Fächer ein, die sie unterrichtet, und kann deren Inhalte pflegen.

### Entscheidungen (Nutzer, 2026-10-26)
- **E1 – Selbst eintragen, Vertrauen:** Lehrkräfte kreuzen selbst an, in welchen Fachbereichen und Fächern sie unterrichten. Es gibt keine Freigabe durch Admins. Die Absicherung ist PROJ-47: Jede Inhaltsänderung wird mit Name und Datum gespeichert und lässt sich rückgängig machen.
- **E2 – Umfang einer Zuständigkeit:** Fragen über die kostenlosen Wege anlegen und importieren, **alle** Fragen des Fachs pflegen (auch die von anderen), Themen des Fachs verwalten, Prüfungssets der Prüfungssimulation für das Fach pflegen.
- **E3 – Neue Fächer anlegen:** Wer in einem Bereich unterrichtet, darf dort neue Fächer anlegen und ist dafür automatisch zuständig.
- **E4 – Kosten (vom Assistenten gesetzt, Regel „alles bleibt kostenlos“):** Der kostenpflichtige KI-Generator, der API-Guthaben verbraucht, bleibt dem Super-Admin vorbehalten. Lehrkräfte nutzen die kostenlosen Wege, also Kopier-Prompt für Fragen und Bulk-Import.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle) – nur Lehrer-Rollen können Zuständigkeiten haben
- Requires: PROJ-47 (Änderungsverlauf & Wiederherstellen) – **muss vorher live sein** (E1)
- Requires: PROJ-24 (Rechtetrennung) – bisheriges Bereichs-Rechtemodell bleibt daneben bestehen
- Berührt: PROJ-12/43 (Themen, Lernbibliothek), PROJ-15 (Prüfungssets), PROJ-16 (Torwächter), PROJ-38 (Kopier-Prompt)

## User Stories
- Als **Lehrkraft** möchte ich selbst ankreuzen, welche Fächer ich in welchen Bereichen unterrichte, damit ich ohne Wartezeit Fragen für meinen Unterricht einbringen kann.
- Als **Lehrkraft** möchte ich für meine Fächer Fragen per Kopier-Prompt oder Bulk-Import hochladen, damit meine Schüler in der Lern-App passende Fragen üben.
- Als **Lehrkraft** möchte ich fehlerhafte Fragen in meinen Fächern direkt korrigieren, auch wenn ein Kollege sie angelegt hat, damit Fehler nicht liegen bleiben.
- Als **Lehrkraft** möchte ich die Themen meiner Fächer anlegen und sortieren, damit der Themenpfad in der Lernbibliothek zu meinem Unterricht passt.
- Als **Lehrkraft eines neuen Bildungsgangs** möchte ich Fächer für meinen Bereich anlegen, damit wir die App auch dort nutzen können.
- Als **Lehrkraft** möchte ich auf meiner Startseite meine Fächer sehen, damit ich direkt dort weiterarbeite.
- Als **Super-Admin** möchte ich sehen, wer sich für welches Fach eingetragen hat, und Einträge entfernen können, damit ich den Überblick behalte.

## Acceptance Criteria

### Selbst eintragen
- [ ] Im Lehrkräfte-Bereich gibt es die Seite „Meine Fächer“. Sie zeigt alle aktiven Fachbereiche mit ihren Fächern zum Ankreuzen.
- [ ] Die Lehrkraft kann einen Bereich auch ohne Fach ankreuzen („Ich unterrichte in diesem Bereich“). Das ist für Bereiche gedacht, die noch keine Fächer haben.
- [ ] Änderungen gelten sofort (E1). Jede Eintragung und Austragung wird im Änderungsprotokoll erfasst.
- [ ] Beim ersten Öffnen des Lehrkräfte-Bereichs nach PROJ-44 wird die Lehrkraft einmal freundlich auf „Meine Fächer“ hingewiesen.
- [ ] Nur Konten mit Lehrer-Rolle können sich eintragen. Azubis sehen die Seite nicht, und der Server lehnt sie ab.
- [ ] Bereichs-Admins und der Super-Admin brauchen keine Zuständigkeiten. Ihre bisherigen Rechte bleiben unverändert.

### Rechte je Zuständigkeit (E2)
- [ ] Für jedes eingetragene Fach darf die Lehrkraft:
  - Fragen über Kopier-Prompt (`question-prompt`) und Bulk-Import anlegen. Der Torwächter (PROJ-16) gilt wie für Admins.
  - alle Fragen des Fachs bearbeiten, aktivieren, deaktivieren und löschen (Papierkorb, PROJ-47)
  - Themen des Fachs anlegen, umbenennen, sortieren und löschen
  - Prüfungssets der Prüfungssimulation anlegen und pflegen, deren Prüfungsteil das Fach umfasst
- [ ] Gehört eine Frage zu mehreren Fächern, darf sie bearbeiten, wer für mindestens eines davon zuständig ist.
- [ ] Außerhalb ihrer Fächer sieht die Lehrkraft in der Verwaltung keine Inhalte und kann nichts ändern. Direkte Aufrufe liefern 404.
- [ ] Der kostenpflichtige KI-Generator (Fragen aus Material per API) ist für Lehrkräfte ausgeblendet und serverseitig gesperrt (E4).
- [ ] Bereichsweite Einstellungen (Fachbereich-Einstellungen, Hof-Items, Azubis verschieben, Nutzerverwaltung) bleiben Bereichs-Admins und dem Super-Admin vorbehalten.

### Neue Fächer (E3)
- [ ] Wer in einem Bereich eingetragen ist (mit oder ohne Fach), sieht dort „Neues Fach anlegen“.
- [ ] Wer ein neues Fach anlegt, ist sofort dafür zuständig.
- [ ] Doppelte Kürzel im selben Bereich werden abgelehnt (bestehende Regel).
- [ ] Neue Fachbereiche anlegen bleibt dem Super-Admin vorbehalten.

### Navigation & Übersicht
- [ ] Die Navigation (PROJ-45) zeigt einer Lehrkraft mit Zuständigkeiten zusätzlich: Fragen, Themen, Fächer, Prüfungssimulation, jeweils gefiltert auf ihre Fächer.
- [ ] Die Startseite des Lehrkräfte-Bereichs zeigt „Meine Fächer“ als Kacheln (Bereich · Fach, Anzahl aktiver Fragen) mit direktem Sprung in die Fragenliste.
- [ ] Hat eine Lehrkraft mehrere Bereiche, kann sie in Listen nach Bereich und Fach filtern.
- [ ] Der Super-Admin sieht eine Übersicht „Zuständigkeiten“ (Fach → eingetragene Lehrkräfte und umgekehrt) und kann Einträge entfernen. Das Entfernen wird protokolliert.

### Rolle entzogen
- [ ] Verliert eine Person ihre Lehrer-Rolle (PROJ-44), verliert sie sofort alle Zuständigkeiten. Ihre angelegten Inhalte bleiben unverändert, inklusive Verlauf.

## Edge Cases
- **Lehrkraft trägt sich aus einem Fach aus:** Sie verliert sofort die Rechte dafür. Ihre Fragen bleiben im Fach und werden von den übrigen Zuständigen weiter gepflegt.
- **Fach hat niemanden mehr:** Die Inhalte bleiben unverändert. Super-Admin und Bereichs-Admin sehen in der Übersicht „ohne Zuständige“.
- **Zwei Lehrkräfte bearbeiten dieselbe Frage:** Das regelt PROJ-47 (Konfliktmeldung, kein stiller Datenverlust).
- **Lehrkraft löscht ein Thema mit Fragen:** Eine Sicherheitsabfrage nennt die Zahl der betroffenen Fragen. Das Thema landet im Papierkorb, die Fragen bleiben ohne Thema erhalten und lassen sich mit dem Thema wiederherstellen.
- **Lehrkraft löscht ein Fach:** Das ist nur möglich, wenn das Fach keine aktiven Fragen hat. Sonst erscheint ein Hinweis, zuerst Fragen zu verschieben oder zu deaktivieren.
- **Missbrauch** (jemand trägt sich überall ein und verändert viele Fragen): Der Super-Admin sieht es im Protokoll, nimmt alle Änderungen der Person gesammelt zurück (PROJ-47) und entzieht Zuständigkeiten oder Rolle.
- **Fach wird in einem neuen Bereich angelegt, der noch keine Pseudonym-Wörter, Hof-Namen o. Ä. hat:** Das betrifft nur die Lern-App des Bereichs. Diese Einstellungen pflegt weiterhin der Super-Admin bzw. Bereichs-Admin.
- **Prüfungsteil umfasst mehrere Fächer, die Lehrkraft ist nur für eines zuständig:** Sie darf Sets dieses Teils pflegen. In der Fragenauswahl sieht sie aber nur Fragen ihrer Fächer, und Fragen anderer Fächer in einem bestehenden Set bleiben unangetastet.

## Abgrenzung (nicht Teil dieses Features)
- Freigabe von Zuständigkeiten durch Admins (bewusst nicht gewollt, E1)
- Kostenpflichtiger KI-Generator für Lehrkräfte (E4)
- Neue Fachbereiche durch Lehrkräfte anlegen
- Zuordnung von Lehrkräften zu Klassen

## Technical Requirements
- **Security:** Rechte je Fach hart in RLS und Server-Code. Fremde Fächer liefern 404. Zuständigkeiten kann jede Lehrkraft nur für sich selbst eintragen, nicht für andere.
- **Regression:** Für Bereichs-Admins und den Super-Admin ändert sich nichts.
- **Tests:** Routen-Tests je Rolle (Lehrkraft zuständig / nicht zuständig / Bereichs-Admin / Super-Admin / Azubi), RLS-Matrix per SQL in einer Transaktion mit Rollback, `npm run build`. Kein Dev-Server und kein Playwright.
- **Kosten:** keine neuen Dienste, keine API-Kosten für Lehrkräfte.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
