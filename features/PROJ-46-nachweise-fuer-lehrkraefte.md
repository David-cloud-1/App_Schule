# PROJ-46: Leistungsnachweise für Lehrkräfte ohne Fachbereich

## Status: Planned
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Kontext
Teil 3 der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Heute können nur Bereichs-Admins und der Super-Admin Leistungsnachweise anlegen. Jeder Nachweis gehört dem Fachbereich des Admins, und alle Admins dieses Bereichs sehen ihn. Künftig sollen auch Lehrkräfte ohne Fachbereich Leistungsnachweise erstellen und durchführen, mit allen bestehenden Funktionen (PROJ-21, 27, 28, 30, 38, 39).

### Entscheidungen (Nutzer, 2026-10-26)
- **E1 – Zielbereich pro Nachweis:** Beim Anlegen wählt die Lehrkraft, für welchen Fachbereich der Nachweis ist (z. B. Spedition oder Tourismus). Sie nutzt den Fragenpool dieses Bereichs plus eigene importierte Fragen. Beitreten können nur Azubis dieses Bereichs, so wie heute.
- **E2 – Nur Ersteller und Super-Admin:** Nachweise und Noten einer Lehrkraft sieht nur sie selbst und der Super-Admin. Bereichs-Admins sehen sie nicht, auch nicht im eigenen Bereich.
- **E3 – Bereichs-Admins bleiben wie bisher:** Bereichs-Admins sehen weiterhin die Nachweise der anderen Bereichs-Admins ihres Bereichs (heutiges Verhalten). Nachweise von Lehrkräften gehören nicht dazu.
- **E4 – Bereichs-Admins dürfen auch fremde Bereiche:** Ein Bereichs-Admin kann wie jede Lehrkraft einen Nachweis für einen anderen Bereich anlegen. Dieser ist dann nur für ihn und den Super-Admin sichtbar.
- **E5 – Rolle entzogen:** Nachweise und Noten bleiben erhalten und sind danach nur noch für den Super-Admin sichtbar (siehe PROJ-44, E6).
- **E6 – Nachweis-Fragen bleiben privat:** Fragen, die eine Lehrkraft für einen Leistungsnachweis importiert, sind nur für sie selbst (und den Super-Admin) da. Sie kommen nie automatisch oder per Freigabe-Knopf in den Fragenpool oder in die Lern-App. Wer eine Frage im Pool haben will, lädt sie bewusst über die Fragen-Wege für den Pool hoch (Kopier-Prompt / Bulk-Import, für Lehrkräfte mit Fach-Zuständigkeit ab PROJ-48). Das ist ein eigener, bewusster Schritt mit der dortigen Prüfung.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle & Freischaltung) – Rolle „Lehrkraft“
- Requires: PROJ-21 (Benotete Leistungsnachweise), PROJ-27 (Fragen-Zusammenstellung), PROJ-28 (Druck & Klassenauswertung), PROJ-30 (Fokus-Verlust-Protokoll), PROJ-38 (Import per Kopier-Prompt), PROJ-39 (Kategorisierung & Filter) – deren Funktionen werden für Lehrkräfte freigegeben, nicht neu gebaut
- Requires: PROJ-23 (Fachbereichs-Zuordnung für Azubis) – bestimmt, wer beitreten darf
- Empfohlen vorher: PROJ-45 (Arbeitsbereich), nicht zwingend

## User Stories
- Als **Lehrkraft ohne Fachbereich** möchte ich einen benoteten Leistungsnachweis für meine Klasse anlegen, damit ich die App für Klassenarbeiten nutzen kann, ohne einen Fachbereich verwalten zu müssen.
- Als **Lehrkraft** möchte ich beim Anlegen auswählen, für welchen Fachbereich der Nachweis ist, damit ich die passenden Fragen bekomme und nur die richtigen Azubis beitreten können.
- Als **Lehrkraft** möchte ich Fragen aus dem Pool des Bereichs auswählen und eigene Fragen importieren, damit ich den Nachweis genau auf meinen Unterricht zuschneide.
- Als **Lehrkraft** möchte ich Code und QR zeigen, Ergebnisse freigeben, Noten exportieren, drucken und die Klassenauswertung sehen, also alles, was Bereichs-Admins heute können.
- Als **Lehrkraft** möchte ich, dass nur ich meine Nachweise und die Noten meiner Klasse sehe, damit sensible Daten nicht bei Kollegen landen.
- Als **Bereichs-Admin** möchte ich auch für einen anderen Bereich einen Nachweis anlegen können, damit ich Klassen aus beiden Bildungsgängen bewerten kann.
- Als **Super-Admin** möchte ich alle Nachweise der Schule sehen und nach Ersteller filtern, damit ich bei Problemen helfen und verwaiste Nachweise aufräumen kann.

## Acceptance Criteria

### Anlegen
- [ ] Lehrkräfte sehen im Lehrkräfte-Bereich den Eintrag „Leistungsnachweise“ und die Aktion „Neuer Leistungsnachweis“.
- [ ] Der Anlegen-Dialog fragt als ersten Schritt den **Zielbereich** ab (alle aktiven Fachbereiche). Bei Bereichs-Admins ist der eigene Bereich vorausgewählt. Bei Lehrkräften ohne Fachbereich ist nichts vorausgewählt, außer es gibt nur einen aktiven Bereich.
- [ ] Danach läuft der bestehende Ablauf aus PROJ-27 (Teil wählen, Fragen zusammenstellen, Titel, Zeitfenster, Dauer, Notenschlüssel, Kategorie) unverändert, bezogen auf den Zielbereich.
- [ ] Die Fragenauswahl zeigt die aktiven Multiple-Choice-Fragen des Zielbereichs und die eigenen importierten Fragen der Lehrkraft.
- [ ] Lehrkräfte können Fragen aus dem Bereichs-Pool **auswählen**, aber nicht bearbeiten, deaktivieren oder löschen.
- [ ] Import per Datei (PROJ-27) und per Kopier-Prompt (PROJ-38) steht Lehrkräften zur Verfügung. Importierte Fragen gehören der importierenden Person und dem Zielbereich. Sie sind dauerhaft **privat** (E6): Sie erscheinen nicht in der Lern-App, nicht in der Fragenauswahl anderer Lehrkräfte und nicht in der Fragenverwaltung der Bereichs-Admins.
- [ ] Die Lehrkraft kann ihre privaten Fragen bearbeiten und löschen, solange kein offener Nachweis sie verwendet, und sie in späteren eigenen Nachweisen wiederverwenden.
- [ ] Es gibt für Lehrkräfte keine Aktion, private Nachweis-Fragen in den Übungsbetrieb freizugeben. Die bestehende Aktion „Für Übung freigeben“ aus PROJ-38 bleibt Bereichs-Admins und dem Super-Admin für Fragen ihres Bereichs vorbehalten.
- [ ] Der Zielbereich steht in der Liste und auf der Detailseite jedes Nachweises.

### Durchführen & Auswerten
- [ ] Alle Funktionen aus PROJ-21, 28, 30 und 39 stehen für eigene Nachweise zur Verfügung: Öffnen und Schließen, Code und QR, Ergebnisse freigeben, Notenliste, Export, Einzel- und Klassendruck, Klassenauswertung, Fokus-Protokoll, Kategorien und Filter.
- [ ] Azubis treten wie heute per Code oder Link bei. Nur Azubis des Zielbereichs können beitreten, andere sehen die bestehende Meldung „Dieser Code gehört zu einem anderen Fachbereich.“
- [ ] Für Azubis ist kein Unterschied erkennbar, ob ein Nachweis von einer Lehrkraft oder einem Bereichs-Admin stammt.

### Sichtbarkeit (E2–E4)
- [ ] Eine Lehrkraft sieht in der Liste nur ihre eigenen Nachweise.
- [ ] Ein Bereichs-Admin sieht: alle Nachweise anderer Bereichs-Admins seines Bereichs, die für seinen Bereich angelegt wurden (wie heute), dazu seine eigenen Nachweise für fremde Bereiche. Nachweise von Lehrkräften sieht er nicht.
- [ ] Der Super-Admin sieht alle Nachweise aller Bereiche. Die Liste hat für ihn eine Spalte und einen Filter „Erstellt von“ (inklusive „Ehemalige / ohne Rolle“).
- [ ] Ein direkter Aufruf (URL, API, Export, Druck, Teilnehmer-Details) eines Nachweises, den die Person nicht sehen darf, liefert 404 (nicht 403), wie in PROJ-24.
- [ ] Teilnehmer-Namen, Noten und Fokus-Protokolle sind nur für Personen sichtbar, die den Nachweis sehen dürfen. Das ist auf Datenbankebene (RLS) und im Server-Code abgesichert.
- [ ] Lehrkräfte bekommen durch einen Nachweis keinen Zugriff auf Profile von Azubis außerhalb der Teilnehmerliste ihrer eigenen Nachweise.

### Rolle entzogen (E5)
- [ ] Verliert eine Lehrkraft ihre Rolle, bleiben ihre Nachweise, Noten und importierten Fragen unverändert erhalten. Ihre privaten Fragen sind danach nur noch für den Super-Admin sichtbar.
- [ ] Ein noch geöffneter Nachweis läuft weiter: Azubis können bis zum Ende des Zeitfensters beitreten und abgeben. Die Ergebnisse sieht nur der Super-Admin.
- [ ] Der Super-Admin kann solche Nachweise schließen, exportieren oder löschen.

### Bestehende Nachweise
- [ ] Alle bestehenden Nachweise bleiben für die heutigen Bereichs-Admins genauso sichtbar wie vorher (Regression).

## Edge Cases
- **Zielbereich im Entwurf ändern:** Die Lehrkraft wählt nachträglich einen anderen Zielbereich. → Nur im Entwurf erlaubt. Ausgewählte Fragen aus dem alten Bereichs-Pool werden nach einem Hinweis entfernt, eigene importierte Fragen bleiben. Nach dem Öffnen ist der Zielbereich fest.
- **Zielbereich wird deaktiviert:** Ein Fachbereich wird abgeschaltet. → Neue Nachweise dafür sind nicht mehr möglich. Bestehende bleiben sichtbar und auswertbar.
- **Frage wird nach dem Öffnen im Pool geändert oder deaktiviert:** Der bestehende Snapshot beim Öffnen (PROJ-21) schützt den Nachweis. Es ändert sich nichts.
- **Bereichs-Admin wird zur Lehrkraft herabgestuft:** Seine früheren Nachweise für den eigenen Bereich bleiben im Bereich, also sichtbar für die übrigen Bereichs-Admins. Er selbst sieht weiter alle Nachweise, die er erstellt hat.
- **Lehrkraft wird zum Bereichs-Admin hochgestuft:** Ihre bisherigen Nachweise bleiben nur für sie und den Super-Admin sichtbar. Sie werden nicht nachträglich für den Bereich geöffnet.
- **Lehrkraft will eine gute Nachweis-Frage für alle zugänglich machen:** Ist sie für das Fach zuständig (PROJ-48), lädt sie die Frage selbst über Kopier-Prompt oder Bulk-Import hoch. Sonst bittet sie eine zuständige Person darum. Die private Nachweis-Frage bleibt davon unberührt.
- **Zwei Lehrkräfte betreuen dieselbe Klasse:** Jede sieht nur ihre eigenen Nachweise. Gemeinsames Arbeiten kommt mit einem späteren Teilen-Feature. Bis dahin hilft der Export.
- **Azubi ohne Fachbereich oder aus einem anderen Bereich nutzt den Code** → bestehende Ablehnung, kein Datenleck über die Existenz des Nachweises hinaus.
- **Konto der Lehrkraft gelöscht:** Die Nachweise bleiben, „Erstellt von“ zeigt „Gelöschtes Konto“. Nur der Super-Admin sieht sie.
- **Super-Admin legt selbst einen Nachweis an:** Er wählt den Zielbereich wie alle (vorausgewählt: der Bereich aus dem Umschalter). Bereichs-Admins dieses Bereichs sehen ihn wie heute.

## Abgrenzung (nicht Teil dieses Features)
- Teilen von Nachweisen mit Kolleginnen und Kollegen
- Feste Klassen oder Kurse an Lehrkräfte binden
- Neue Fragetypen oder geänderte Benotung
- Lehrkräfte bearbeiten fremde Fragen im Pool eines Bereichs
- Freigabe von Nachweis-Fragen in den Fragenpool oder die Lern-App (bewusst ausgeschlossen, E6)
- Fragen für den Pool anlegen → PROJ-48 (Fach-Zuständigkeiten)

## Technical Requirements
- **Security:** Sichtbarkeit von Nachweisen, Teilnahmen, Noten, Fokus-Protokollen und importierten Fragen hart in RLS und in jeder betroffenen Route unter `src/app/api/admin/assessments/**`. Fremde Objekte liefern 404. Jede Policy-Migration mit Rückweg-SQL.
- **Tests:** Routen-Tests je Rolle (Super-Admin / Bereichs-Admin eigener Bereich / Bereichs-Admin fremder Bereich / Lehrkraft eigener / Lehrkraft fremder Nachweis / Azubi), RLS-Matrix per SQL in einer Transaktion mit Rollback, `npm run build`. Kein Dev-Server und kein Playwright.
- **Kosten:** keine neuen Dienste.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
