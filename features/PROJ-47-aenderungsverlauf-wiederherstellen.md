# PROJ-47: Änderungsverlauf & Wiederherstellen für Inhalte

## Status: Planned
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Kontext
Teil der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Mit PROJ-48 sollen Lehrkräfte sich selbst für Fächer eintragen und deren Inhalte pflegen können. Der Nutzer setzt dabei bewusst auf **Vertrauen statt Freigabe**. Die Bedingung dafür: Jede Änderung an Inhalten der App wird konkret mit Name und Datum festgehalten und lässt sich zur Not rückgängig machen.

Heute schreibt das Änderungsprotokoll (PROJ-9/24, `admin_audit_log`) nur, **wer wann was** getan hat, z. B. „Frage deaktiviert“. Der Inhalt vor der Änderung wird nicht gespeichert, ein Zurücksetzen ist also nicht möglich. Dieses Feature ergänzt einen echten Versionsverlauf.

## Dependencies
- Requires: PROJ-24 (Rechtetrennung) – wer welche Inhalte sehen und ändern darf
- Baut auf: bestehendem Änderungsprotokoll (`/admin/audit-log`)
- Blockiert: PROJ-48 (Fach-Zuständigkeiten) – darf erst live gehen, wenn Wiederherstellen funktioniert

## Geltungsbereich
Erfasst werden **Lerninhalte**:
- Fragen inklusive Antwortoptionen, Erklärung, Musterlösung, Fach- und Themen-Zuordnung, Aktiv-Status und Kennzeichen „nur für Nachweise“
- Themen (Name, Reihenfolge, Fach)
- Fächer (Name, Kürzel, Reihenfolge)
- Prüfungssets der Prüfungssimulation (Name, Fragenliste, Dauer, Status)

Nicht erfasst werden: Leistungsnachweise und Noten (haben eigene Regeln), Nutzerprofile, Shop-Items und Fachbereichs-Einstellungen. Diese Bereiche ändern weiterhin nur Admins, und das bestehende Protokoll reicht dort.

## User Stories
- Als **Super-Admin** möchte ich bei jeder Frage sehen, wer sie wann angelegt und geändert hat, damit ich weiß, wen ich ansprechen kann.
- Als **Super-Admin** möchte ich eine Änderung mit einem Klick rückgängig machen, damit ein Fehler oder Unfug einer einzelnen Person keinen dauerhaften Schaden anrichtet.
- Als **Super-Admin** möchte ich alle Änderungen einer Person in einem Zeitraum auf einmal zurücknehmen können, damit ich bei Missbrauch nicht hunderte Fragen einzeln reparieren muss.
- Als **Lehrkraft** möchte ich vor dem Bearbeiten den Verlauf einer Frage sehen, damit ich verstehe, warum sie so formuliert ist, und die Person fragen kann.
- Als **Lehrkraft** möchte ich meine eigene Änderung zurücknehmen, wenn ich mich vertan habe.
- Als **Lehrkraft** möchte ich eine versehentlich gelöschte Frage oder ein gelöschtes Thema wiederherstellen.

## Acceptance Criteria

### Aufzeichnen
- [ ] Jedes Anlegen, Ändern, Deaktivieren, Aktivieren und Löschen eines erfassten Inhalts speichert eine **Version** mit dem vollständigen Stand nach der Änderung, der ändernden Person, Datum und Uhrzeit sowie der Art der Änderung.
- [ ] Das gilt für jeden Weg: Einzelbearbeitung, Mehrfachaktionen, Bulk-Import, Fragen aus Material, Kopier-Prompt-Import, Qualitäts-Korrekturläufe (PROJ-16) und direkte Skripte von Claude Code. Läuft eine Änderung nicht über eine angemeldete Person, wird sie mit einer klaren Quelle gespeichert (z. B. „Qualitäts-Korrekturlauf 2026-10-30“).
- [ ] Massenaktionen (z. B. Import von 40 Fragen) werden als **ein zusammengehöriger Vorgang** gespeichert, der sich als Ganzes zurücknehmen lässt.
- [ ] Die Aufzeichnung lässt sich nicht umgehen oder nachträglich verändern. Auch Admins können Versionen nicht bearbeiten oder löschen.
- [ ] Für die bestehenden rund 8.300 Fragen und alle Themen, Fächer und Prüfungssets wird beim Start einmalig eine Ausgangsversion angelegt („Stand bei Einführung“), damit auch die erste spätere Änderung zurückgenommen werden kann.

### Verlauf ansehen
- [ ] Jede Frage, jedes Thema, jedes Fach und jedes Prüfungsset hat einen Reiter oder eine Schublade „Verlauf“ mit allen Versionen, neueste zuerst: wer, wann, was.
- [ ] Zu jeder Version lässt sich der Unterschied zur vorherigen anzeigen: geänderte Felder nebeneinander, entfernter Text rot, neuer grün.
- [ ] Bei Fragen steht in der Fragenliste „Zuletzt geändert von <Name> am <Datum>“.
- [ ] Den Verlauf sieht jede Person, die den Inhalt bearbeiten darf.

### Wiederherstellen
- [ ] Im Verlauf hat jede ältere Version die Aktion „Diese Version wiederherstellen“. Danach entspricht der Inhalt genau dieser Version.
- [ ] Wiederherstellen ist selbst eine Änderung: Es erzeugt eine neue Version („wiederhergestellt aus Version vom …“). Es wird nichts überschrieben oder gelöscht, und auch das Wiederherstellen lässt sich wieder zurücknehmen.
- [ ] Wiederherstellen darf, wer den Inhalt bearbeiten darf.
- [ ] Gelöschte Inhalte landen in einem **Papierkorb** je Bereich, statt endgültig zu verschwinden. Von dort lassen sie sich mit allen Zuordnungen wiederherstellen.
- [ ] Endgültig leeren kann den Papierkorb nur der Super-Admin.

### Zurücknehmen in größerem Umfang (Super-Admin)
- [ ] Das Änderungsprotokoll lässt sich nach Person, Zeitraum, Bereich, Fach und Art der Änderung filtern.
- [ ] Der Super-Admin kann einen ganzen Vorgang (z. B. einen Import) oder alle Änderungen einer Person in einem Zeitraum gesammelt zurücknehmen.
- [ ] Vorher zeigt eine Vorschau, wie viele Inhalte betroffen sind und wo jemand anderes den Inhalt inzwischen weiter bearbeitet hat. Diese Fälle werden einzeln aufgeführt und standardmäßig **nicht** überschrieben.
- [ ] Jede Sammel-Rücknahme wird selbst als ein Vorgang gespeichert und lässt sich wieder umkehren.

### Auswirkungen
- [ ] Wiederherstellen ändert nichts an bereits gegebenen Antworten, XP, Münzen oder Statistiken der Azubis.
- [ ] Laufende oder abgeschlossene Leistungsnachweise bleiben durch ihren Fragen-Snapshot (PROJ-21) unberührt.

## Edge Cases
- **Version verweist auf ein inzwischen gelöschtes Thema oder Fach:** Beim Wiederherstellen erscheint ein Hinweis. Das Thema wird mit wiederhergestellt, wenn es im Papierkorb liegt. Sonst bleibt die Frage ohne Thema, und die Person wird darauf hingewiesen.
- **Zwei Personen bearbeiten dieselbe Frage fast gleichzeitig:** Die zweite Speicherung wird abgelehnt mit „Diese Frage wurde gerade von <Name> geändert“ und einem Link zum Verlauf. Es gibt keinen stillen Datenverlust.
- **Wiederhergestellte Version verstößt gegen heutige Qualitätsregeln:** Der Torwächter (PROJ-16) zeigt eine Warnung. Wiederherstellen ist trotzdem möglich, damit eine Notfall-Rücknahme nie blockiert wird.
- **Frage wurde gelöscht, während ein offener Nachweis sie nutzt:** Wie heute schützt der Snapshot den Nachweis. Die Frage liegt im Papierkorb.
- **Konto der ändernden Person wurde gelöscht:** Die Versionen bleiben, „Geändert von“ zeigt „Gelöschtes Konto“.
- **Sehr viele Versionen einer Frage** (z. B. Korrekturläufe): Der Verlauf lädt seitenweise, und ältere Versionen sind einklappbar.
- **Speicherplatz:** Versionen speichern nur Text. Wird der kostenlose Datenbank-Rahmen knapp, warnt das Architektur-Konzept vorher. Ältere Versionen werden nie still gelöscht.

## Abgrenzung (nicht Teil dieses Features)
- Versionen für Leistungsnachweise, Noten, Profile, Shop-Items und Bereichs-Einstellungen
- Benachrichtigung bei Änderungen (z. B. „Deine Frage wurde geändert“)
- Freigabe-Workflow vor Änderungen (bewusst nicht gewollt: Vertrauen + Rücknahme)

## Technical Requirements
- **Unumgehbar:** Die Aufzeichnung muss auch Änderungen erfassen, die nicht über die App-Routen laufen (Skripte, Korrekturläufe). Versionen sind für alle Rollen nur lesbar.
- **Kein Datenverlust:** Löschen wird für erfasste Inhalte zum Papierkorb, solange der Super-Admin nicht endgültig leert.
- **Tests:** Vitest für Aufzeichnen, Wiederherstellen, Papierkorb und Sammel-Rücknahme. Dazu eine SQL-Prüfung in einer Transaktion mit Rollback, dass auch direkte Datenbank-Änderungen eine Version erzeugen, und `npm run build`. Kein Dev-Server und kein Playwright.
- **Kosten:** keine neuen Dienste.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
