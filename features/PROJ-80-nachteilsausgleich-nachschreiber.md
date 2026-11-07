# PROJ-80: Nachteilsausgleich & Nachschreiber im Leistungsnachweis

## Status: Planned
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-21 (Sitzungen, Zeitfenster, Dauer, `max_attempts`), PROJ-28 (Druck, Auswertung), PROJ-30 (Fokus-Protokoll)
- Optional: PROJ-76 (Gruppenzuteilung für Nachschreiber)

## Summary
Die Lehrkraft kann einzelnen Teilnehmern eines Nachweises einen Zeitzuschlag (Nachteilsausgleich) geben und Azubis, die den Termin verpasst haben, einen eigenen Nachschreibtermin einräumen, ohne den ganzen Nachweis neu anzulegen. Alles gilt nur für diesen Nachweis und wird nicht am Konto gespeichert.

## User Stories
- Als **Lehrkraft** möchte ich einem Teilnehmer mehr Bearbeitungszeit geben, damit ein anerkannter Nachteilsausgleich umgesetzt ist.
- Als **Lehrkraft** möchte ich den Zuschlag schon vor dem Termin vorbereiten, damit er am Prüfungstag nicht untergeht.
- Als **Lehrkraft** möchte ich kranken Azubis einen Nachschreibtermin mit derselben Aufgabenliste geben, damit ich keine zweite Version pflegen muss.
- Als **Azubi** möchte ich, dass andere nicht sehen, dass ich mehr Zeit bekomme.

## Acceptance Criteria

### Zeitzuschlag
- [ ] In der Teilnehmerliste eines Nachweises gibt es je Teilnehmer „Zeitzuschlag“ mit den Auswahlwerten +10 %, +25 %, +50 % oder eigene Minuten (1–120).
- [ ] Der Zuschlag verlängert die **individuelle** Dauer dieses Teilnehmers. Sein Timer zeigt die verlängerte Zeit; die Serverzeit ist maßgeblich, nicht die Uhr im Browser.
- [ ] Hat der Teilnehmer vor Ende des Zeitfensters begonnen, darf seine Sitzung über das Zeitfensterende hinaus bis zu seiner individuellen Endzeit laufen; neue Beitritte nach Fensterende bleiben gesperrt.
- [ ] Der Zuschlag kann gesetzt oder geändert werden, solange die Sitzung des Teilnehmers noch nicht abgegeben ist. Nach der Abgabe ist er gesperrt (nachträglich nur sichtbar).
- [ ] **Vorab-Zuweisung:** Die Lehrkraft kann vor dem Termin eine Liste „Name + Zuschlag“ hinterlegen. Beim Beitritt wird sie über den normalisierten Namen (Groß-/Kleinschreibung, Leerzeichen) abgeglichen; die Lehrkraft sieht in der Teilnehmerliste, welche Zuordnung automatisch passierte, und kann sie ändern.
- [ ] Nicht zugeordnete Vorab-Einträge sind in einer Liste sichtbar („wartet auf Beitritt“) und löschbar.

### Nachschreiber
- [ ] Die Lehrkraft kann für einen Teilnehmer, der nicht abgegeben hat oder fehlte, einen **Nachschreibtermin** vergeben: Beginn, Ende (eigenes Zeitfenster), optional Zeitzuschlag.
- [ ] Der Nachschreiber nutzt dieselbe Fragenliste und denselben Beitrittscode; der Beitritt ist nur im eigenen Fenster und nur für zugelassene Namen möglich.
- [ ] Nachschreiber erscheinen in Teilnehmerliste, Notenliste und Export mit Kennzeichnung „Nachschreiber“; Ergebnisse fließen in Statistik und Aufgabenanalyse ein.
- [ ] Ein Nachschreibtermin zählt als zusätzlicher Versuch und verändert `max_attempts` für alle anderen nicht.
- [ ] Die Lehrkraft kann einen Nachschreibtermin zurückziehen, solange die Sitzung nicht begonnen hat.

### Sichtbarkeit & Datenschutz
- [ ] Zuschläge und Nachschreibtermine sind nur für Lehrkräfte mit Zugriff auf den Nachweis sichtbar. Kein Hinweis auf Begründung oder Art des Zuschlags wird gespeichert.
- [ ] Azubi-Ansichten und Druckausgaben (Einzel- und Klassenauswertung) nennen den Zuschlag nicht; die Einzelauswertung zeigt höchstens „Bearbeitungszeit: X Min.“ ohne Vermerk.
- [ ] Änderungen (wer, wann, Teilnehmer, Wert) stehen im Protokoll des Nachweises.

## Edge Cases
- Zuschlag wird gesetzt, während der Teilnehmer gerade schreibt: Der Timer verlängert sich beim nächsten Abgleich ohne Neuladen und ohne Datenverlust.
- Zuschlag über das Zeitfensterende hinaus bei Teilnehmer, der erst kurz vor Fensterende startet: individuelle Endzeit gilt trotzdem; Hinweis an die Lehrkraft im Dialog.
- Zwei Teilnehmer gleichen Namens: Vorab-Zuordnung wird nicht automatisch vorgenommen, die Lehrkraft muss manuell wählen.
- Nachschreiber meldet sich mit anderem Schreibweise-Namen: wird nicht zugelassen, Hinweis „Name nicht auf der Liste“; die Lehrkraft kann die Zulassung am Namen anpassen.
- Fokus-Verlust-Protokoll (PROJ-30) läuft unverändert; die Zeit des Zuschlags zählt nicht als Verstoß.
- Nachweis wird dupliziert (PROJ-79): Zuschläge und Nachschreiber werden **nicht** mitkopiert.
- Server-Uhrzeit weicht von Client ab: Abgabe ist bis zur serverseitigen Endzeit gültig; verspätete Abgaben werden nach Regeln von PROJ-21 behandelt.

## Technical Requirements
- Security: Zuschläge nur von Lehrkräften mit Zugriff auf den Nachweis änderbar; Azubis dürfen die eigene Endzeit nur lesen.
- Zeitprüfung beim Speichern jeder Antwort und bei der Abgabe erfolgt serverseitig.
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
