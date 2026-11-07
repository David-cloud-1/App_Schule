# PROJ-76: Leistungsnachweis – Gruppen A/B

## Status: Planned
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-21 (Leistungsnachweise, bestehende Option `shuffle`), PROJ-27 (Fragen-Zusammenstellung), PROJ-28 (Druck & Auswertung)
- Optional: PROJ-75 (Analyse je Frage statt je Position)

## Summary
Ein Nachweis kann in zwei Gruppen (A und B) laufen: gleiche Fragen, aber andere Reihenfolge der Fragen und der Antwortoptionen. Das erschwert Abschreiben bei Sitznachbarn. Anders als der bisherige Zufallsmodus ist die Reihenfolge je Gruppe fest, sodass Lösungsschlüssel und Druck pro Gruppe eindeutig sind.

## User Stories
- Als **Lehrkraft** möchte ich meine Klasse auf zwei Varianten verteilen, damit Sitznachbarn nicht dieselbe Reihenfolge sehen.
- Als **Lehrkraft** möchte ich pro Gruppe einen eigenen Lösungsschlüssel ausdrucken, damit ich die Papier-Nachbesprechung zügig machen kann.
- Als **Lehrkraft** möchte ich, dass die Gruppen abwechselnd beim Beitritt vergeben werden, damit nebeneinander sitzende Azubis meist verschiedene Gruppen haben.
- Als **Azubi** möchte ich nichts davon merken, außer dass mein Bogen „Gruppe A“ heißt.

## Acceptance Criteria

### Einrichten
- [ ] Beim Anlegen oder Bearbeiten eines Nachweises (solange er nicht gestartet ist) gibt es die Option „Gruppen A und B“. Standard: aus.
- [ ] Bei aktiven Gruppen legt das System für jede Gruppe eine **feste Fragenreihenfolge** und eine **feste Reihenfolge der Antwortoptionen je Frage** an. Gruppe A entspricht der Original-Reihenfolge, Gruppe B ist eine Zufallsmischung, die gespeichert wird (reproduzierbar).
- [ ] Die Lehrkraft kann die Reihenfolge von Gruppe B neu mischen („Neu mischen“), solange der Nachweis nicht gestartet ist.
- [ ] Ist die Option „Gruppen“ aktiv, ist der bisherige Zufallsmodus pro Teilnehmer (`shuffle`) deaktiviert, mit Erklärung im Formular.
- [ ] Nach dem Start des Nachweises (erster Beitritt) sind Gruppeneinstellung und Reihenfolge gesperrt.

### Zuteilung
- [ ] Teilnehmer werden beim Beitritt **abwechselnd** A, B, A, B … zugeteilt (nach Beitrittszeit).
- [ ] Die Lehrkraft kann in der Teilnehmerliste die Gruppe eines Teilnehmers ändern, solange dieser noch nicht gestartet hat.
- [ ] Der Azubi sieht „Gruppe A“ oder „Gruppe B“ in der Kopfzeile seines Nachweises.

### Auswertung & Druck
- [ ] Teilnehmerliste, CSV-Export und Einzelauswertung zeigen die Gruppe.
- [ ] Die Einzelauswertung (PROJ-28) druckt Fragen in der Reihenfolge der jeweiligen Gruppe; Antwortbuchstaben entsprechen der gezeigten Reihenfolge.
- [ ] Neue Druckansicht „Lösungsschlüssel“ je Gruppe: Frage-Nr. → richtiger Buchstabe, eine Seite pro Gruppe, A4, hell.
- [ ] Klassenstatistik und Aufgabenanalyse rechnen je **Frage**, nicht je Position, über beide Gruppen zusammen.

## Edge Cases
- Ungerade Teilnehmerzahl: Gruppe A hat einen Teilnehmer mehr; Hinweis in der Liste mit Verteilung (z. B. 14 / 13).
- Nachschreiber (PROJ-80): Zuteilung wie bei jedem Beitritt, die Lehrkraft kann sie ändern.
- Zeitgleicher Beitritt mehrerer Teilnehmer: Zuteilung bleibt eindeutig (kein doppeltes Vergeben der gleichen Position, kein Fehler).
- Frage mit „Alle oben genannten“ oder „A und B“-Optionen: Beim Mischen nicht verschieben, Hinweis an die Lehrkraft, wenn Optionen so formuliert sind, dass Mischen den Sinn ändert.
- Nachweis wird dupliziert (PROJ-79): Gruppeneinstellung wird übernommen, die Reihenfolge aber neu gemischt.
- Eine Gruppe bleibt leer (nur ein Teilnehmer): Auswertung und Druck funktionieren ohne leere Seiten.

## Technical Requirements
- Reihenfolgen werden gespeichert (nicht zur Laufzeit zufällig erzeugt), damit Druck, Auswertung und Neuladen übereinstimmen.
- Security: Gruppe und Reihenfolge nur lesbar im Rahmen der Sitzung des Teilnehmers; die richtige Antwort bleibt wie bisher serverseitig.
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
