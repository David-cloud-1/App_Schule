# PROJ-76: Leistungsnachweis – Gruppen A/B

## Status: In Review
**Created:** 2026-11-07
**Last Updated:** 2026-11-09

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
**Stand:** 2026-11-09

### Was schon da ist (Befund aus dem Code)
- Beim Beitritt mischt das System **heute immer** Fragen und Antworten zufällig je Teilnehmer und speichert das Ergebnis in der Sitzung des Teilnehmers. Die Einstellung „shuffle“ am Nachweis existiert in der Datenbank, wird aber beim Beitritt gar nicht gelesen.
- Druck, Auswertung und Neuladen lesen die Reihenfolge aus der **Sitzung**. Deshalb zeigen sie schon heute die Reihenfolge des jeweiligen Azubis. Die Auswertung rechnet nach Frage-ID, nicht nach Position.
- Die Fragen werden beim **Öffnen** des Nachweises eingefroren. Vorher ist er ein Entwurf und frei bearbeitbar.
- Antworten werden zwischendurch als Entwurf in der Sitzung gespeichert.

### A) Bausteine (Oberfläche)
```
Nachweis anlegen / bearbeiten (nur Entwurf)
+-- Schalter „Gruppen A und B“ (Standard: aus)
|   +-- Erklärtext: „Jede Gruppe hat eine feste Reihenfolge. Ohne Gruppen mischt jeder Azubi einzeln.“
|   +-- Vorschau Gruppe B (Fragen-Nr. und Antwortbuchstaben)
|   +-- Knopf „Neu mischen“
|   +-- Hinweis bei Fragen mit „Alle oben genannten“ o. Ä.
Nachweis-Detailseite
+-- Teilnehmerliste
|   +-- Spalte „Gruppe“ (A / B)
|   +-- Gruppe ändern (Auswahl je Zeile, nur wenn noch keine Antwort gegeben wurde)
|   +-- Verteilungshinweis „Gruppe A: 14 · Gruppe B: 13“
+-- Aktionen: Druck „Lösungsschlüssel“ (neu), CSV-Export (mit Spalte Gruppe)
Azubi-Prüfungsansicht
+-- Kopfzeile: „Gruppe A“ bzw. „Gruppe B“
Druck
+-- Einzelauswertung: zeigt Gruppe, Reihenfolge wie bisher aus der Sitzung
+-- Lösungsschlüssel: eine A4-Seite je Gruppe, leere Gruppe wird weggelassen
```

### B) Daten (in einfachen Worten)
Am **Nachweis** kommt hinzu:
- Schalter „Gruppen aktiv“ (ja/nein)
- Mischwert für Gruppe B (nur im Entwurf; „Neu mischen“ würfelt einen neuen)
- Feste Reihenfolge je Gruppe: Fragenreihenfolge und Antwortreihenfolge je Frage. Sie wird **beim Öffnen** aus dem Mischwert und den eingefrorenen Fragen berechnet und gespeichert.
- Zähler, wie vielen Teilnehmern schon eine Gruppe zugeteilt wurde (für das abwechselnde A, B, A, B)

An der **Teilnehmer-Sitzung** kommt hinzu:
- Gruppe (A oder B). Leer bei Nachweisen ohne Gruppen.

Die Reihenfolge selbst steckt wie bisher in der Sitzung. Beim Beitritt wird sie nur nicht mehr gewürfelt, sondern aus der gespeicherten Reihenfolge der Gruppe kopiert. Die richtige Antwort bleibt wie bisher nur auf dem Server.

### C) Entscheidungen und Begründung
1. **Sperrzeitpunkt = Öffnen, nicht erster Beitritt.** Die Spezifikation sagt „nach erstem Beitritt gesperrt“. Aber Fragen und Reihenfolge werden ohnehin beim Öffnen eingefroren, und beitreten kann man nur bei geöffnetem Nachweis. So gibt es keinen Zwischenzustand, und „Neu mischen“ bleibt ein reiner Entwurfs-Vorgang. *Abweichung von der Spec, bitte bestätigen.*
2. **Gruppe B wird erst beim Öffnen fest berechnet, im Entwurf nur als Vorschau.** Im Entwurf kann die Lehrkraft noch Fragen tauschen (PROJ-27, PROJ-79). Eine sofort gespeicherte Reihenfolge wäre dann veraltet. Der Mischwert macht die Vorschau stabil und das spätere Ergebnis reproduzierbar.
3. **Gruppe A = Originalreihenfolge** der Lehrkraft, wie in der Spec.
4. **Abwechselnde Zuteilung über einen Zähler am Nachweis**, der beim Beitritt in einem Schritt erhöht wird. Das ist auch bei gleichzeitigem Beitritt eindeutig. Kleine Schwäche: Scheitert ein Beitritt nach dem Hochzählen (z. B. Doppeltipp), kann eine Position übersprungen werden. Die Verteilung ist dann um höchstens eins schief. Die Lehrkraft kann Gruppen ohnehin ändern.
5. **„Gruppe ändern“ nur ohne Antworten.** „Noch nicht gestartet“ heißt hier: Der Azubi hat noch keine Antwort gespeichert. Der Beitritt selbst startet die Uhr sofort, deshalb taugt er als Kriterium nicht. Beim Wechsel wird die Reihenfolge in der Sitzung durch die der anderen Gruppe ersetzt.
6. **Ohne Gruppen bleibt alles wie heute** (Einzelmischung je Azubi). Der unbenutzte „shuffle“-Schalter wird nicht angefasst, die Spec-Zeile „shuffle deaktivieren“ ist damit praktisch erfüllt: Bei aktiven Gruppen wird nicht einzeln gemischt.
7. **Mischen schützt „Alle oben genannten“.** Solche Optionen bleiben an ihrer Stelle (am Ende). Erkannt wird das über Textmuster; ist ein Muster unsicher, zeigt das Formular einen Hinweis statt still zu ändern.
8. **Lösungsschlüssel** wird aus der gespeicherten Gruppenreihenfolge plus den richtigen Antworten (nur für die Lehrkraft) aufgebaut. Es gibt keine neue Auswertungslogik, weil die Einzelauswertung schon die Sitzungsreihenfolge nutzt.
9. **Klassenstatistik und Aufgabenanalyse** rechnen schon nach Frage-ID. Nach Umsetzung nur noch prüfen, nicht umbauen.
10. **Duplizieren (PROJ-79):** Schalter wird übernommen, Mischwert neu gewürfelt.
11. **Keine KI, keine Kosten.** Alles reine Rechnung auf dem Server.

### D) Betroffene Stellen (grob)
- Datenbank: eine Migration (Spalten am Nachweis und an der Sitzung, kleine Zähl-Funktion) plus Rückbau-Datei.
- Beitritt-Schnittstelle: Gruppe zuteilen, Reihenfolge übernehmen.
- Nachweis-Schnittstelle: Öffnen berechnet die Reihenfolgen; Entwurf speichert Schalter und Mischwert; Duplizieren übernimmt.
- Neue kleine Schnittstellen: „Neu mischen“, „Gruppe eines Teilnehmers ändern“.
- Teilnehmerliste, CSV-Export, Einzelauswertung, neue Druckseite „Lösungsschlüssel“.
- Azubi-Kopfzeile in der Prüfungsansicht.
- Eine kleine, getestete Rechenschicht (Mischen mit Mischwert, Schutz fester Optionen, Verteilung).

### E) Pakete
Keine neuen Pakete nötig.

### F) Risiken
- Server/Client-Grenze: keine Icons oder Funktionen als Prop von Server- an Client-Komponenten (Erfahrung aus früheren Fehlern).
- Tests: Rechenschicht (gleicher Mischwert = gleiche Reihenfolge, feste Optionen bleiben, Verteilung bei ungerader Zahl), Beitritt (Wechsel A/B, Wiedereintritt behält Gruppe), Gruppenwechsel (gesperrt bei vorhandenen Antworten).
- Migration läuft vor dem Push (Deploy-Ablauf).

## Implementation Notes (2026-11-09)
- **Migration:** [20261116_proj76_nachweis_gruppen.sql](../supabase/migrations/20261116_proj76_nachweis_gruppen.sql) (Down-Datei daneben), Probe: [proj76_nachweis_gruppen_probe.sql](../supabase/tests/proj76_nachweis_gruppen_probe.sql). Neu: `groups_enabled`, `group_mix_seed`, `group_orders`, `group_join_counter` am Nachweis, `group_label` an der Sitzung, Funktion `next_assessment_group_slot` (nur service_role).
- **Rechenschicht:** `src/lib/assessment-groups.ts` (Mischen mit Mischwert, Schutz von Sammeloptionen und Buchstabenverweisen, A/B-Zuteilung, Reihenfolge anwenden).
- **Beitritt:** Gruppe über die Zählfunktion, Reihenfolge aus `group_orders`; ohne Gruppen unverändert.
- **Öffnen:** berechnet und friert `group_orders` ein; **Entwurf:** Schalter und „Neu mischen“ (Mischwert) über das bestehende PATCH.
- **Neue Schnittstelle** `GET /api/admin/assessments/[id]/groups`: Vorschau im Entwurf, eingefrorene Reihenfolge danach, richtiger Buchstabe je Frage (nur Lehrkräfte).
- **Gruppe ändern:** `PATCH …/participants/[sessionId]` mit `group`; nur bei laufendem Versuch ohne gespeicherte Antworten.
- **Oberfläche:** Karte `AssessmentGroupsCard`, Spalte „Gruppe“ mit Auswahl, Verteilungshinweis, Menüpunkt und Seite „Lösungsschlüssel“ (`/druck/loesung`), Gruppe in CSV und Einzelauswertung, Badge „Gruppe A/B“ in der Azubi-Kopfzeile.
- **Abweichungen von der Spec:** (1) Sperre beim Öffnen statt erstem Beitritt. (2) „Nicht gestartet“ = noch keine Antwort gespeichert. (3) Der Schalter erscheint auf der Detailseite des Entwurfs (nach dem Anlegen), nicht im Anlegen-Dialog. (4) Der alte `shuffle`-Schalter war nie wirksam und bleibt unberührt. (5) Klassenstatistik und Aufgabenanalyse rechnen schon nach Frage-ID, dort war nichts zu ändern.
- **Tests:** 14 Tests für die Rechenschicht, 4 für den Beitritt, 5 für den Gruppenwechsel, 2 für das Öffnen. Gesamt 2756 grün, `tsc` und Build sauber.

## QA Test Results
Selbstprüfung (Code und Tests, kein Browser, siehe Regel „kein Dev-Server“):
- Antwortschlüssel: `/groups` nur mit Lehrkraft-Anmeldung und Bereichsprüfung; Azubis lesen nur ihre Sitzung, `group_orders` liegt in einer Tabelle ohne Leserecht für sie. Zählfunktion für anon/authenticated gesperrt.
- Gleichzeitiger Beitritt: Zähler wird in einer Anweisung erhöht, Positionen doppeln sich nicht. Doppelter Beitritt liefert die bestehende Sitzung vor dem Zählen zurück.
- Offen für manuelle Prüfung am Gerät: Druck des Lösungsschlüssels, Gruppenwechsel in der Liste.

## Deployment
_To be added by /deploy_
