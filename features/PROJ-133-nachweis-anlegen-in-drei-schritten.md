# PROJ-133: Leistungsnachweis anlegen in drei Schritten (Phase 4 Übersichtlichkeit, Teil 1)

## Status: In Review
**Created:** 2026-11-27
**Last Updated:** 2026-11-27

## Worum es geht

Phase 4 aus [docs/plan-uebersichtlichkeit.md](../docs/plan-uebersichtlichkeit.md), Teil 1. Heute gibt es zum Anlegen eines Leistungsnachweises einen Riesendialog (`create-assessment-modal.tsx`) mit allen 3.355 Fragen auf einmal, einen zweiten Startweg „Vorschlag“ als Dialog im Dialog (PROJ-78) und Pflichtangaben, die man nicht findet (Klasse liegt versteckt in „Ablage – nur zum Sortieren“, der Standard für „Beitritt bis“ wechselt ständig).

Künftig führt **ein** Weg in drei Schritten zum Entwurf:

1. **Was?** Bereich (vorausgefüllt), Fach, Thema, Stufe, Anzahl, Schwierigkeit. Daraus entsteht ein Vorschlag.
2. **Prüfen:** Die vorgeschlagenen Fragen ansehen, tauschen und eigene ergänzen (mit Suche statt 3.355 Fragen auf einmal).
3. **Wann und für wen?** Klasse, Beitritt bis, Dauer, Notenschlüssel.

Der Nachweis entsteht als **Entwurf**. Öffnen, Schrittleiste, automatisches Schließen und „Als Azubi ausprobieren“ gehören zu [PROJ-134](PROJ-134-nachweis-detailseite-ablauf.md).

**Befunde (aus dem Plan):** B22, B23, B24 (Rest), B25, B26, B27, B33. Dazu der Weg „In neuen Nachweis“ aus dem Reiter „Schwierig“ (in PROJ-131 bewusst verschoben).

**Entscheidungen (27.11.2026):**
- **E1 – Zuschnitt:** Phase 4 wird in zwei Features geteilt. Dieses Feature ist das Anlegen, PROJ-134 die Detailseite und der Ablauf.
- **E2 – Beitritt bis:** Pflichtfeld mit sichtbarem, festem Vorschlag „heute 23:59“ (nicht mehr „2 Stunden ab jetzt“). Schnellwahlen: „In 1 Stunde“, „Heute Abend (23:59)“, „In 1 Woche“.
- **E3 – Klasse:** sichtbares Pflichtfeld in Schritt 3 mit Auswahl aus bisher benutzten Klassen, freier Eingabe und der Wahl „Keine / gemischt“.
- **E4 – Aus „Schwierig“:** Mehrfachauswahl im Reiter „Schwierig“ (PROJ-131), dann „In neuen Nachweis“. Der Ablauf startet bei Schritt 2 mit den markierten Fragen.
- **E5 – Fragen ergänzen:** Suche mit Filtern, 25 Treffer pro Seite, „Weitere anzeigen“. Kein „Alle wählen“.

## Dependencies
- Requires: PROJ-27 (Fragen-Zusammenstellung), PROJ-78 (Vorschlag nach Thema, Anzahl, Schwierigkeit: Logik wird wiederverwendet), PROJ-77 (Notenschlüssel-Vorlagen), PROJ-39 (Klasse, Schuljahr, Kategorie)
- Requires: PROJ-131 (Seite „Lerninhalte“, Reiter „Schwierig“ mit Mehrfachauswahl)
- Requires: PROJ-83 (Bedienmuster: `AdminSegmented`, `AdminPageHeader`), PROJ-130 (Wörterliste)
- Rechte aus PROJ-24, PROJ-44, PROJ-46 und PROJ-70 bleiben unverändert
- Folgt: PROJ-134 (Detailseite & Ablauf)

## User Stories
- Als **Lehrkraft** möchte ich einen Nachweis in drei klaren Schritten anlegen, damit ich nicht in einem Riesendialog suchen muss.
- Als **Lehrkraft** möchte ich nach Fach, Thema, Stufe, Anzahl und Schwierigkeit einen Vorschlag bekommen und ihn vor dem Speichern prüfen und ändern können.
- Als **Lehrkraft** möchte ich eigene Fragen gezielt suchen und ergänzen, ohne dass sich Tausende Fragen auf einmal laden.
- Als **Lehrkraft** möchte ich Klasse, Beitrittsende und Notenschlüssel an einer sichtbaren Stelle festlegen, damit nichts Wichtiges versteckt ist.
- Als **Lehrkraft** möchte ich aus der Liste der schwierigsten Fragen direkt einen Nachweis beginnen, damit ich Schwachstellen gezielt abfragen kann.
- Als **Lehrkraft** möchte ich eine Notenschlüssel-Vorlage anlegen, ohne dafür einen Nachweis zu beginnen.

## Acceptance Criteria

### Einstieg und Rahmen
- [ ] Auf der Seite „Leistungsnachweise“ gibt es **eine** grüne Hauptaktion „Nachweis anlegen“. Sie öffnet den Ablauf in drei Schritten als eigene Seite (nicht als Dialog im Dialog). Der alte Riesendialog und der zweite Startweg „Vorschlag“ erscheinen nicht mehr.
- [ ] Oben steht eine Schrittleiste „1 Was? · 2 Prüfen · 3 Wann und für wen?“. Der aktuelle Schritt ist hervorgehoben, erledigte Schritte lassen sich anklicken, spätere erst nach „Weiter“.
- [ ] Jeder Schritt hat „Zurück“ und „Weiter“. Angaben bleiben beim Zurückgehen erhalten. In Schritt 3 heißt die grüne Aktion „Entwurf speichern“.
- [ ] Wer die Seite verlässt, bekommt eine Rückfrage („Angaben gehen verloren“). Entwürfe in der Datenbank entstehen erst beim Speichern in Schritt 3.
- [ ] Die Seite funktioniert am Handy (Bedienelemente mindestens 44 px) und am Laptop.

### Schritt 1 – Was?
- [ ] **Bereich** ist vorausgefüllt: Er stammt aus dem Bereichs-Umschalter (PROJ-29). Wer nur einen Bereich hat, sieht ihn als Text ohne Auswahl. Der Super-Admin bei „Alle Bereiche“ muss einen wählen.
- [ ] Danach folgen Fach (Mehrfachauswahl), Thema (Mehrfachauswahl, optional), Stufe (10, 11, 12 oder alle), Anzahl der Fragen (5 bis 60) und Schwierigkeit (`AdminSegmented`: ausgewogen · eher leicht · eher schwer · eigene Verteilung) mit den Regeln aus PROJ-78 (Quoten, Mindestanzahl Antworten, Ausschlüsse).
- [ ] Die Ausschlüsse aus PROJ-78 (gesperrte Fragen, Fragen mit offener Meldung, Fragen aus den letzten N Nachweisen) stehen unter „Weitere Einstellungen“ (zugeklappt) mit den bisherigen Standardwerten.
- [ ] „Vorschlag erstellen“ führt zu Schritt 2. Fehlen Angaben (kein Fach), steht die Meldung am Feld, nicht oben.
- [ ] **Ohne Vorschlag:** Wer die Fragen selbst zusammenstellen will, wählt „Leer beginnen“ und landet in Schritt 2 mit leerer Liste.
- [ ] Die Fachwörter „Gesperrte Fragen“ und „Bearbeitungszeit je Teilnehmer“ werden durch verständliche Wörter ersetzt (B27) und stehen in `begriffe.ts`; „Gesperrte Fragen“ wird zu „Fragen mit zu schwacher Trennschärfe …“ nur mit Erklärsatz, sonst „Ausgeschlossene Fragen“.

### Schritt 2 – Prüfen
- [ ] Die Liste zeigt die Fragen mit gekürztem Text, Thema, Schwierigkeit (Chip) und Lösungsquote. Oben steht die Zusammenfassung aus PROJ-78 (Anzahl je Schwierigkeit, Verteilung nach Thema, geschätzte Bearbeitungszeit).
- [ ] Jede Frage lässt sich **entfernen**, **tauschen** (drei Alternativen gleichen Themas und gleicher Schwierigkeit), per Ziehen verschieben und mit Schloss **fixieren**. „Neu würfeln“ behält fixierte Fragen.
- [ ] **Eigene Fragen ergänzen:** „Frage suchen“ öffnet eine Seitenleiste mit Suchfeld und Filtern (Fach, Thema, Schwierigkeit, Fragetyp). Es werden höchstens **25 Treffer** pro Anfrage geladen, „Weitere 25 anzeigen (noch N)“ lädt nach. Es gibt **kein** „Alle wählen“. Bereits gewählte Fragen sind markiert.
- [ ] Die Auswahl bleibt oben als feste Liste sichtbar (Anzahl „18 Fragen“), auch während die Suche offen ist.
- [ ] Es erscheinen nur Fragen, die für Nachweise zulässig sind (aktiv, im richtigen Bereich, „nur für Nachweise“ eingeschlossen). Der Server prüft das beim Speichern erneut.
- [ ] Gibt es zu wenige passende Fragen, wird angezeigt, wie viele fehlen. Es wird nie mit unpassenden Fragen aufgefüllt.
- [ ] „Weiter“ ist erst mit mindestens **einer** Frage möglich. Bei weniger als 5 Fragen erscheint ein Hinweis, aber kein Verbot.

### Schritt 3 – Wann und für wen?
- [ ] Felder: **Titel** (Vorschlag aus Fach, Thema und Datum, änderbar), **Klasse** (Pflicht, siehe unten), **Schuljahr** (vorausgefüllt), **Beitritt bis** (Pflicht), **Beitritt ab** (optional, „sofort nach dem Öffnen“), **Dauer** je Teilnehmer in Minuten, **Notenschlüssel**.
- [ ] **Klasse:** Auswahl aus bisher benutzten Klassen der eigenen Stufe plus freie Eingabe (nur Format wie SP10C, `MAX_CLASS_NAME_LENGTH`) und die Wahl „Keine / gemischt“. Ohne Angabe lässt sich nicht speichern.
- [ ] **Beitritt bis:** Vorschlag ist **heute 23:59** in der Zeitzone der Schule. Schnellwahlen „In 1 Stunde“, „Heute Abend (23:59)“, „In 1 Woche“. Ein Zeitpunkt in der Vergangenheit oder vor „Beitritt ab“ wird am Feld abgelehnt. Die Zeit ist immer mit Datum und Uhrzeit sichtbar.
- [ ] Der Satz unter dem Feld sagt klar: „Danach kann niemand mehr beitreten. Wer schon schreibt, darf fertig werden.“ Die Dauer-Erklärung lautet: „Zeit zum Bearbeiten, ab dem Moment, in dem jemand startet.“
- [ ] **Notenschlüssel:** Auswahl aus den Vorlagen (PROJ-77) oder „Standard“. Daneben steht „Neue Vorlage anlegen“ (siehe unten).
- [ ] Ganz oben in Schritt 3 steht eine kurze **Zusammenfassung** (Fach, Thema, Anzahl Fragen, geschätzte Zeit) mit „Ändern“ zurück zu Schritt 1 und 2.
- [ ] Nach „Entwurf speichern“ landet die Lehrkraft auf der Detailseite des Nachweises mit Toast „Entwurf gespeichert“. Der Status ist **Entwurf**. Der Beitrittscode ist erst nach dem Öffnen gültig (PROJ-134).

### Notenschlüssel-Vorlage direkt anlegen (B33)
- [ ] Auf der Seite `/admin/leistungsnachweise/schluessel` gibt es „Vorlage anlegen“ mit Name und Prozentstufen. Die Vorlage braucht keinen Nachweis. Dieselbe Eingabe steht auch in Schritt 3 als Dialog.
- [ ] Eine neue Vorlage ist sofort in der Auswahl. Rechte und Sichtbarkeit bleiben wie in PROJ-77.

### „In neuen Nachweis“ aus „Schwierig“ (E4)
- [ ] Im Reiter „Schwierig“ (PROJ-131) lassen sich Fragen markieren. Eine Aktionsleiste zeigt „N markiert · In neuen Nachweis“.
- [ ] Der Ablauf startet bei **Schritt 2** mit den markierten Fragen. Bereich, Fach und Thema ergeben sich aus den Fragen, Schritt 1 gilt als ausgefüllt (zugänglich über die Schrittleiste).
- [ ] Mischen die Fragen mehrere Bereiche, die der Nutzer nicht alle bearbeiten darf, wird vorher nachgefragt; nicht zulässige Fragen bleiben außen vor und werden genannt.

### Rechte, Wörter und Technik
- [ ] Wer bisher Nachweise anlegen durfte (Super-Admin, Bereichs-Admin, Lehrkraft nach PROJ-46, PROJ-70 und PROJ-127), darf es weiter. Die Pflicht „Klasse“ gilt für alle.
- [ ] Die Schritte heißen exakt „Was?“, „Prüfen“, „Wann und für wen?“. Wörter nach der Wörterliste (PROJ-130), Begriffe in `src/lib/begriffe.ts`, der Wächtertest bleibt grün.
- [ ] Alle neuen Elemente nutzen ausschließlich `ws-*`-Farben, `AdminSegmented`, `AdminPageHeader`, Lade-, Leer- und Fehlerzustände aus `admin-states.tsx`.
- [ ] Die bisherigen Adressen und Schnittstellen zum Anlegen bleiben funktionsfähig; alte Dialoge werden entfernt, wenn nichts mehr auf sie verweist.

## Edge Cases
- **Kein Treffer in Schritt 1:** Es gibt zu Fach und Thema keine zulässigen Fragen. Schritt 2 startet leer, mit Hinweis und Link zu „Fragen hinzufügen“ (PROJ-132).
- **Zu wenige Fragen:** Der Vorschlag nennt, was fehlt (zum Beispiel „Für Thema X nur 4 von 7“) und füllt nicht mit unpassenden Fragen auf.
- **Abbruch mitten drin:** Es entsteht kein Entwurf in der Datenbank. Die Rückfrage beim Verlassen verhindert versehentlichen Verlust. Ein Browser-Neuladen verliert die Angaben und sagt das vorher.
- **Frage verschwindet:** Eine gewählte Frage wird zwischen Schritt 2 und dem Speichern gesperrt, gelöscht oder auf „inaktiv“ gestellt. Der Server lehnt ab, nennt die Fragen, und die Lehrkraft kehrt zu Schritt 2 zurück.
- **Zwei Lehrkräfte legen gleichzeitig an:** Beitrittscodes bleiben eindeutig (wie heute). Es gibt keine gemeinsame Bearbeitung eines Entwurfs.
- **Bereichswechsel mitten im Ablauf:** Wer den Bereich in einem anderen Tab ändert, ändert nicht den Bereich des laufenden Ablaufs. Er behält den Bereich, mit dem er gestartet wurde. Der Server prüft die Berechtigung beim Speichern.
- **Mehrere Bereiche aus „Schwierig“:** siehe Abschnitt oben, nicht erlaubte Fragen werden benannt.
- **Zeitzone und Sommerzeit:** „Heute 23:59“ gilt in der Schulzeitzone, auch bei Zeitumstellung.
- **Klasse mit Sonderzeichen oder zu lang:** wird am Feld abgelehnt, es entsteht kein Entwurf.
- **Offline:** Beim Speichern ohne Verbindung bleibt die Seite offen, die Angaben bleiben erhalten, ein Fehlerzustand bietet „Erneut versuchen“.
- **Nur eine Frage:** erlaubt, mit Hinweis; kein Verbot.

## Nicht Teil dieses Features
- Detailseite, Schrittleiste „Entwurf → Offen → Geschlossen → Freigegeben“, „Beitritt bis“ auf der Detailseite, automatisches Schließen, „Als Azubi ausprobieren“, Ersteller sichtbar (alles PROJ-134)
- Nachteilsausgleich und Nachschreiber (PROJ-80)
- Klasse als echte Einheit mit zugeordneten Azubis (Phase 5)
- Änderungen an Prüfungslogik, Bewertung oder Schülerseite

## Technical Requirements (optional)
- Performance: Schritt 1 zu Schritt 2 unter 2 s bei 3.355 Fragen; die Suche lädt höchstens 25 Treffer je Anfrage.
- Security: Alle Prüfungen (Bereich, Zulässigkeit der Fragen, Rolle) zusätzlich auf dem Server. Eingaben mit Zod geprüft.
- Barrierefreiheit: Schrittleiste mit Tastatur bedienbar, Fokus springt beim Schrittwechsel auf die Überschrift.
- Tests: Unit-Tests co-located; E2E für den Weg „Vorschlag → Prüfen → Speichern“ und den Weg aus „Schwierig“.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Erstellt:** 2026-11-27

### Überblick in einem Satz
Der Ablauf wird eine **eigene Seite** `/admin/leistungsnachweise/neu` mit drei Schritten. Alle Angaben leben bis „Entwurf speichern“ nur im Browser-Speicher der Seite. Gespeichert wird über die **bestehende** Anlegen-Schnittstelle, die dafür etwas strenger wird. Neu im Backend ist nur eine **Fragen-Suche mit 25 Treffern je Seite**. Eine neue Tabelle oder Migration braucht es nicht.

### A) Aufbau der Seite (Komponenten-Baum)

```
/admin/leistungsnachweise/neu   (eigene Seite, kein Dialog)
+-- AdminPageHeader „Nachweis anlegen“ (Brotkrumen: Leistungsnachweise › Nachweis anlegen)
+-- Schrittleiste  „1 Was? · 2 Prüfen · 3 Wann und für wen?“
|     (erledigte Schritte anklickbar, spätere gesperrt, mit Tastatur bedienbar)
+-- Schritt 1 – Was?
|   +-- Bereich (Text bei einem Bereich, Auswahl nur für Super-Admin bei „Alle Bereiche“)
|   +-- Fach (Mehrfachauswahl) · Thema (Mehrfachauswahl, optional)
|   +-- Stufe (AdminSegmented: 10 · 11 · 12 · alle)
|   +-- Anzahl (5–60) · Schwierigkeit (AdminSegmented, 4 Werte; „eigene Verteilung“ zeigt 3 Regler)
|   +-- „Weitere Einstellungen“ (zugeklappt): Ausschlüsse aus PROJ-78
|   +-- Fuß: „Leer beginnen“ (outline) · „Vorschlag erstellen“ (grün)
+-- Schritt 2 – Prüfen
|   +-- Zusammenfassung (Anzahl je Schwierigkeit, Verteilung nach Thema, geschätzte Zeit)
|   +-- Hinweis „Für Thema X nur 4 von 7“ (wenn zu wenig passende Fragen)
|   +-- Auswahl-Liste (bleibt oben sichtbar: „18 Fragen“)
|   |   +-- Fragezeile: Text gekürzt · Thema · Schwierigkeits-Chip · Lösungsquote
|   |       · Schloss (fixieren) · Tauschen (3 Alternativen) · Entfernen · Ziehgriff
|   +-- „Neu würfeln“ (behält fixierte) · „Frage suchen“
|   +-- Seitenleiste „Frage suchen“ (Sheet rechts, am Handy von unten)
|   |   +-- Suchfeld + Filter (Fach, Thema, Schwierigkeit, Fragetyp)
|   |   +-- 25 Treffer, bereits gewählte markiert · „Weitere 25 anzeigen (noch N)“
|   +-- Leerzustand mit Link zu „Fragen hinzufügen“ (PROJ-132)
|   +-- Fuß: „Zurück“ · „Weiter“ (ab 1 Frage; unter 5 Fragen nur Hinweis)
+-- Schritt 3 – Wann und für wen?
|   +-- Zusammenfassung oben (Fach, Thema, Anzahl, geschätzte Zeit) mit „Ändern“
|   +-- Titel (Vorschlag aus Fach, Thema, Datum)
|   +-- Klasse (Pflicht): bisher benutzte Klassen · freie Eingabe · „Keine / gemischt“
|   +-- Schuljahr (vorausgefüllt)
|   +-- Beitritt bis (Pflicht, Vorschlag heute 23:59) + Schnellwahlen + Erklärsatz
|   +-- Beitritt ab (optional, „sofort nach dem Öffnen“)
|   +-- Dauer in Minuten + Erklärsatz
|   +-- Notenschlüssel: Vorlagen-Auswahl (vorhandener Picker) + „Neue Vorlage anlegen“ (Dialog)
|   +-- „Weitere Einstellungen“ (zugeklappt): Fokus-Protokoll (vorhandene Felder, wie bisher)
|   +-- Fuß: „Zurück“ · „Entwurf speichern“ (grün)
+-- Rückfrage beim Verlassen („Angaben gehen verloren“), auch beim Neuladen

Seite „Leistungsnachweise“
+-- Hauptaktion „Nachweis anlegen“ → Link auf /neu (alter Dialog und „Vorschlag“-Knopf entfallen)

Seite „Notenschlüssel“ (/admin/leistungsnachweise/schluessel)
+-- Hauptaktion „Vorlage anlegen“ → derselbe Vorlagen-Dialog wie in Schritt 3

Lerninhalte › Reiter „Schwierig“
+-- Häkchen je Frage
+-- Aktionsleiste unten „N markiert · In neuen Nachweis“ → /neu, Start bei Schritt 2
```

### B) Wo die Daten liegen

**Während des Ablaufs:** nur im Speicher der Seite (ein gemeinsamer Zustand für alle drei Schritte). Kein Entwurf in der Datenbank, kein Zwischenspeichern. Neuladen oder Verlassen löscht die Angaben. Davor kommt die Rückfrage.

Der Zustand enthält:
- Bereich, mit dem der Ablauf gestartet wurde (bleibt fest, auch wenn in einem anderen Tab umgeschaltet wird)
- Schritt-1-Angaben: Fächer, Themen, Stufe, Anzahl, Schwierigkeitsverteilung, Ausschlüsse
- Auswahl: geordnete Liste der Fragen, je Frage „fixiert ja/nein“
- Schritt-3-Angaben: Titel, Klasse (oder „Keine / gemischt“), Schuljahr, Beitritt ab/bis, Dauer, Notenschlüssel, Fokus-Protokoll
- welcher Schritt erreicht ist (für die Schrittleiste)

**Übergabe aus „Schwierig“:** Die markierten Fragen-Nummern werden einmalig im Tab-Speicher (sessionStorage) abgelegt, die Seite `/neu?aus=schwierig` liest sie, löscht den Eintrag sofort und startet bei Schritt 2. Grund: Bis zu 60 Nummern machen die Adresse sonst unlesbar lang. Fehlt der Eintrag (z. B. Link geteilt), startet der Ablauf normal bei Schritt 1.

**Beim Speichern:** ein Datensatz in der bestehenden Tabelle der Leistungsnachweise mit Status **Entwurf**, die Fragen in der vorhandenen Spalte für Entwurfsfragen (wie seit PROJ-27). Keine neue Spalte: Klasse, Schuljahr und Fach gibt es seit PROJ-39, „Beitritt bis“ ist das vorhandene Ende-Datum.

### C) Schnittstellen (was der Server tut)

| Schnittstelle | Neu / geändert | Zweck |
|---|---|---|
| Vorschlag (PROJ-78) | **unverändert** | Vorschlag ziehen, „Neu würfeln“ mit fixierten Fragen, 3 Alternativen zum Tauschen, Zusammenfassung |
| **Fragen-Suche** | **neu** | Suchwort + Filter (Fach, Thema, Schwierigkeit, Fragetyp), höchstens 25 Treffer, dazu die Gesamtzahl für „noch N“. Nur für Nachweise zulässige Fragen des Bereichs, eigene „nur für Nachweise“-Fragen eingeschlossen. Fragen per Nummer nachladen (für die Übergabe aus „Schwierig“) |
| Fächer & Klassen des Bereichs | **unverändert** | Auswahl für Fach (Schritt 1) und Klasse (Schritt 3) |
| Nachweis anlegen | **geändert** | (1) Klasse muss ausdrücklich angegeben sein: Klassenname **oder** „keine“. Fehlt die Angabe, lehnt der Server ab. (2) „Beitritt bis“ darf nicht in der Vergangenheit liegen. (3) Lehnt der Server Fragen ab (gesperrt, gelöscht, inaktiv, falscher Bereich), nennt er **welche**, damit die Seite sie in Schritt 2 markieren kann. Rechte und Code-Erzeugung bleiben wie heute. |
| Notenschlüssel-Vorlagen (PROJ-77) | **unverändert** | Vorlage anlegen klappt heute schon ohne Nachweis, es fehlte nur die Stelle in der Oberfläche |

Die alte Schnittstelle „alle wählbaren Fragen auf einmal“ bleibt, weil der Dialog „Fragen bearbeiten“ auf der Detailseite sie noch nutzt (wird mit PROJ-134 abgelöst).

### D) Technische Entscheidungen (und warum)

- **Eigene Seite statt Dialog.** Regel aus dem Plan: „lang = eigene Seite mit Schritten, nie Dialog im Dialog“. Eine Seite hat eine Adresse, funktioniert am Handy besser und erlaubt die Rückfrage beim Verlassen.
- **Kein Entwurf in der Datenbank vor dem Speichern.** So vorgegeben, und es verhindert verwaiste Halb-Entwürfe. Dafür gibt es die Rückfrage beim Verlassen.
- **Vorschlags-Logik wird wiederverwendet, nicht neu gebaut.** Quoten, Ausschlüsse, Tauschen und „Neu würfeln“ sind aus PROJ-78 erprobt und getestet. Die neue Seite ist nur ein anderes Gesicht dafür. Die Darstellung der Vorschlagsliste wird aus dem bisherigen Dialog herausgelöst und in Schritt 2 verwendet.
- **Suche auf dem Server mit 25 Treffern.** Heute lädt der Dialog alle 3.355 Fragen in den Browser. Die Suche lädt nur, was man sieht, und erfüllt das Tempo-Ziel (unter 2 s). Kein „Alle wählen“ (E5).
- **Schritt 2 als eigenständiger Baustein.** Die Fragen-Auswahl (Liste + Suche) wird so gebaut, dass PROJ-134 sie später für „Fragen bearbeiten“ auf der Detailseite übernehmen kann. Dann verschwindet auch der letzte Weg mit allen Fragen auf einmal.
- **„Heute 23:59“ in der Schulzeitzone (Europe/Berlin).** Eine kleine Hilfsfunktion rechnet die Schnellwahlen aus. Sie gilt auch an Tagen mit Zeitumstellung und wird per Unit-Test geprüft. Diese Zeitzone nutzt die App schon für das Schuljahr.
- **„Beitritt ab“ leer = sofort nach dem Öffnen.** Die Datenbank braucht weiter einen Startzeitpunkt; die Seite schickt dann „jetzt“. Was beim späteren Öffnen mit einem dann schon vergangenen „Beitritt bis“ passiert, regelt PROJ-134.
- **Klasse als Pflicht auf dem Server.** Nur so gilt die Pflicht für alle Wege. Andere Wege, die Nachweise anlegen (z. B. „Duplizieren“), haben eigene Schnittstellen und sind nicht betroffen.
- **Fokus-Protokoll bleibt erhalten**, zugeklappt unter „Weitere Einstellungen“ in Schritt 3. Die Spec nennt es nicht, aber es wegzulassen wäre ein Rückschritt gegenüber heute.
- **Rückfrage beim Verlassen:** innerhalb der App per eigener Abfrage vor dem Seitenwechsel, beim Schließen oder Neuladen über die Browser-Warnung. Das Muster gibt es schon (Sammel-Anlage, Lehrerzimmer-Beitrag).
- **Wörter:** neue Begriffe („Ausgeschlossene Fragen“, Ersatz für „Bearbeitungszeit je Teilnehmer“, die Schrittnamen) kommen in `begriffe.ts`, der Wächtertest wird um die alten Wörter ergänzt.

### E) Was entfernt wird
- Der Riesendialog „Nachweis anlegen“ (`create-assessment-modal`) und der Knopf „Vorschlag“ auf der Listenseite.
- **Bleiben vorerst:** der Fragen-Wähler mit eingebautem Vorschlag-Dialog, weil „Fragen bearbeiten“ auf der Detailseite ihn noch nutzt. Er wird in PROJ-134 durch den neuen Baustein aus Schritt 2 ersetzt.

### F) Tests
- Unit: Zustand des Ablaufs (Zurück behält Angaben, Schrittfreigabe), Zeit-Hilfsfunktion (23:59, Zeitumstellung, Schnellwahlen), Pflicht-Klasse und abgelehnte Fragen in der Anlegen-Schnittstelle, Fragen-Suche (25er-Seiten, Gesamtzahl, nur zulässige Fragen, Bereichsrechte).
- Komponenten: Schrittleiste mit Tastatur, Fokus auf Überschrift beim Wechsel, Aktionsleiste im Reiter „Schwierig“.
- E2E: „Vorschlag → Prüfen → Speichern“ und „Schwierig → In neuen Nachweis → Speichern“.

### G) Abhängigkeiten (Pakete)
Keine neuen Pakete. Ziehen in der Liste nutzt die schon installierte Drag-and-drop-Bibliothek `@dnd-kit` aus dem Baukasten, alles andere sind vorhandene shadcn/ui-Bausteine (Sheet, Checkbox, Popover, Dialog) und die Admin-Bausteine (`AdminPageHeader`, `AdminSegmented`, `admin-states`).

### H) Reihenfolge beim Bauen (Vorschlag)
1. Backend: Fragen-Suche, Anlegen-Schnittstelle strenger machen, Zeit-Hilfsfunktion
2. Seite mit Schrittleiste und gemeinsamem Zustand, Schritt 1 und 3
3. Schritt 2 (Auswahl-Baustein, Suche-Seitenleiste)
4. Einstieg Listenseite, Notenschlüssel-Seite, Reiter „Schwierig“
5. Alten Dialog entfernen, Wörter und Wächtertest

## Implementation Notes (Frontend & Backend)

**Gebaut am 2026-11-27.** 5.001 Tests grün, `tsc`, `eslint` (neue Dateien) und `npm run build` sauber. **Noch nicht im Browser geprüft** (kein Zugang zur echten Datenbank in dieser Umgebung), E2E-Tests noch nicht geschrieben.

**Backend**
- `src/lib/assessment-question-search.ts` und `POST /api/admin/assessments/questions/search`: drei Aktionen. `search` (höchstens 25 Treffer, `total`, `nextOffset`), `lookup` (Fragen per Nummer, bis 60; unbekannte als `missing`), `facets` (Fächer, Themen mit Fächern und Stufen, Stufen für Schritt 1). Alles aus dem Pool von `loadCandidates` (nur zulässige Fragen, eigene „nur für Nachweise“-Fragen eingeschlossen).
- `POST /api/admin/assessments`: `className` ist Pflichtfeld (`null` = „Keine / gemischt“, fehlt es: 400). `closesAt` in der Vergangenheit: 400. Abgelehnte Fragen kommen als `invalidQuestionIds` zurück (`checkQuestionSelection` liefert `invalidIds`). `resolveCategory` fragt bei `className: null` die Klassen nicht mehr ab.
- `src/lib/assessment-deadline.ts`: „heute 23:59“, „in 1 Stunde“, „in 1 Woche“ in Europe/Berlin, auch bei Zeitumstellung (Tests für 25.10. und 29.3.).
- Keine Migration, keine neuen Pakete.

**Frontend**
- Neue Seite `/admin/leistungsnachweise/neu` mit `assessment-wizard/` (Rahmen mit gemeinsamem Zustand, Schrittleiste, Schritt 1/2/3, Suche-Seitenleiste, Vorlagen-Dialog). Logik ohne Oberfläche in `src/lib/assessment-draft.ts` (Prüfung der Schritte, Titelvorschlag, Übergabe aus „Schwierig“).
- Rückfrage beim Verlassen: Browser-Warnung (Schließen/Neuladen) und eigene Abfrage bei Klicks auf Links innerhalb der App.
- Liste „Leistungsnachweise“: Hauptaktion „Nachweis anlegen“ (Link); der Riesendialog `create-assessment-modal` ist gelöscht. Alte Adressen `?neu=1` und `?createFromSet=` leiten auf die neue Seite weiter. „Als Leistungsnachweis verwenden“ (Übungsprüfungen) öffnet `/neu?set=ID` und startet bei Schritt 2.
- Notenschlüssel-Seite: „Vorlage anlegen“ (B33), dieselbe Eingabe in Schritt 3 als „Neue Vorlage anlegen“.
- Reiter „Schwierig“: Häkchen je Frage, Leiste „N markiert · In neuen Nachweis“ (höchstens 60), bei mehreren Bereichen Rückfrage. Übergabe über `sessionStorage`, einmal gelesen und gelöscht.
- Vorschlagsliste (`assessment-suggest-preview`) kann jetzt per Griff, Tastatur und Touch verschoben werden (`@dnd-kit`).
- Wörter: „Ausgeschlossene Fragen“ statt „Gesperrte Fragen“, „Dauer“ statt „Bearbeitungszeit je Teilnehmer“, Schrittnamen in `begriffe.ts`; Wächtertest um die alten Wörter ergänzt.

**Abweichungen von der Spec**
- **Fragetyp-Filter fehlt** in der Suche: Für Nachweise sind nur Multiple-Choice-Fragen zulässig, ein Filter hätte nur einen Wert.
- **Fokus-Protokoll** und „Notenschlüssel anpassen“ stehen unter „Weitere Einstellungen“ in Schritt 3 (wie im Design festgelegt).
- **Browser-Zurück-Taste** innerhalb der App löst keine Rückfrage aus (nur Links, Schließen und Neuladen).
- **Beitritt ab leer** schickt „jetzt“ als Startzeit beim Speichern.
- Der alte Fragen-Wähler samt Vorschlag-Dialog bleibt für „Fragen bearbeiten“ auf der Detailseite (PROJ-134).

## QA Test Results

**Tested:** 2026-11-27
**App URL:** http://localhost:3000 (Dev-Server mit Platzhalter-Zugangsdaten, keine echte Datenbank)
**Tester:** QA Engineer (AI)

**Wie geprüft:** Code-Review aller neuen und geänderten Dateien, Unit- und Rendertests (Vitest), Typprüfung, Lint, Playwright gegen den Dev-Server (Seiten- und Schnittstellenschutz ohne Anmeldung). Ohne Lehrkraft-Konto und Datenbank war der Ablauf im Browser nicht durchspielbar (wie bei PROJ-120 bis PROJ-132). Ihn decken `assessment-wizard.test.tsx` (8 Rendertests) und die Logik-Tests ab.

### Automatische Tests
- `npm test`: **376 Dateien, 5.001 Tests grün**
- `tsc --noEmit`: sauber. `eslint` auf alle Dateien des Features: 0 Fehler (5 Warnungen in älteren Dateien)
- Neu: `tests/PROJ-133-nachweis-anlegen-in-drei-schritten.spec.ts` (9 Tests × Desktop- und Handy-Chromium = **18 grün**)
- Gesamte E2E-Suite (Chromium): 146 grün, 52 übersprungen (brauchen ein echtes Konto), **9 rot in PROJ-1/2/3/4-5/7**. Diese Tests betreffen Login-Branding und ältere Schnittstellen, PROJ-133 ändert dort keine Datei. Die Fehler bestanden also schon vorher, es ist keine Regression (vermutlich wegen der fehlenden Datenbank).
- WebKit/Safari und Firefox sind in dieser Umgebung nicht installiert. Geprüft wurde mit Desktop-Chromium und Handy-Chromium (Pixel 5).

### Acceptance Criteria Status

#### Einstieg und Rahmen
- [x] Eine grüne Hauptaktion „Nachweis anlegen“ als Link auf `/neu`. Riesendialog gelöscht, „Vorschlag“-Knopf weg. Alte Adressen `?neu=1` und `?createFromSet=` leiten weiter.
- [x] Schrittleiste mit drei Schritten: aktueller Schritt hervorgehoben, spätere gesperrt (`disabled`), erledigte anklickbar, `aria-current="step"`
- [x] Zurück/Weiter, Angaben bleiben erhalten (Rendertest), grüne Aktion „Entwurf speichern“
- [x] Rückfrage beim Verlassen (Links in der App und `beforeunload`); kein Entwurf vor dem Speichern. Siehe BUG-5 (Zurück-Taste) und BUG-6
- [x] Bedienelemente `min-h-11`; Layout `flex-col-reverse … sm:flex-row`, Sheet am Handy von unten (nur im Code geprüft, siehe Einschränkungen)

#### Schritt 1 – Was?
- [x] Bereich: ein Bereich als Text, Super-Admin bei „Alle Bereiche“ (`scope.current === null`) muss wählen, sonst Bereich aus dem Umschalter
- [x] Fach, Thema, Stufe (`AdminSegmented`), Anzahl 5–60, Schwierigkeit (`AdminSegmented`, 4 Werte), eigene Verteilung mit Summenprüfung
- [x] Ausschlüsse unter „Weitere Einstellungen“ (zugeklappt) mit den Standardwerten aus PROJ-78
- [x] „Vorschlag erstellen“ führt zu Schritt 2. Fehler stehen am Feld (Rendertest „fehlendes Fach“).
- [x] „Leer beginnen“ führt zu Schritt 2 mit leerer Liste
- [x] „Ausgeschlossene Fragen“ mit Erklärsatz und „Dauer“ stehen in `begriffe.ts`, der Wächtertest kennt die alten Wörter
- [ ] BUG-2: Ein Wechsel des Bereichs in Schritt 1 behält die Fragen aus dem alten Bereich

#### Schritt 2 – Prüfen
- [x] Liste mit Text, Thema, Chip und Lösungsquote, darüber die Zusammenfassung
- [x] Entfernen, Tauschen (3 Alternativen), Ziehen (`@dnd-kit`, auch mit Tastatur und Touch), Fixieren. „Neu würfeln“ behält fixierte Fragen (`keepIds`).
- [x] Suche: höchstens 25 Treffer, „Weitere N anzeigen (noch M)“, kein „Alle wählen“, gewählte Fragen markiert (Unit-Tests für `searchQuestions`). Der Fragetyp-Filter fehlt mit Absicht, weil nur Multiple Choice zulässig ist.
- [x] Die Anzahl steht oben und in der Kopfzeile der Suche
- [x] Nur zulässige Fragen (`loadCandidates`), der Server prüft beim Speichern erneut
- [x] Bei zu wenigen Fragen nennt die Seite die Lücke und füllt nicht mit unpassenden auf (Logik aus PROJ-78)
- [ ] **BUG-1 (High):** „Weiter“ geht ab einer Frage, unter 5 Fragen erscheint nur ein Hinweis. **Speichern scheitert aber am Server.**

#### Schritt 3 – Wann und für wen?
- [x] Titel (Vorschlag), Klasse, Schuljahr, Beitritt bis/ab, Dauer, Notenschlüssel
- [x] Klasse ist Pflicht im Browser und auf dem Server (`className` ohne `.optional()`, 400 ohne Angabe), mit „Keine / gemischt“ und freier Eingabe
- [ ] BUG-3: Die freie Eingabe prüft nur die Länge, nicht das Format „wie SP10C“
- [x] Beitritt bis: Vorschlag heute 23:59 in Europe/Berlin, drei Schnellwahlen, Vergangenheit und „vor Beitritt ab“ werden am Feld abgelehnt (der Server lehnt die Vergangenheit ebenfalls ab), Datum und Uhrzeit ausgeschrieben
- [x] Erklärsätze unter „Beitritt bis“ und „Dauer“ wörtlich wie in der Spec
- [x] Notenschlüssel: Vorlagen-Auswahl und „Neue Vorlage anlegen“ (Dialog, neue Vorlage sofort gewählt)
- [x] Zusammenfassung oben mit „Angaben ändern“ und „Fragen ändern“
- [x] Nach dem Speichern: Toast „Entwurf gespeichert“ und Weiterleitung auf die Detailseite

#### Notenschlüssel-Vorlage direkt anlegen
- [x] „Vorlage anlegen“ auf `/schluessel` (im Seitenkopf, bei leerer Liste im Leerzustand), derselbe Dialog wie in Schritt 3, danach wird die Liste neu geladen

#### „In neuen Nachweis“ aus „Schwierig“
- [x] Häkchen je Frage (44 px), Leiste „N markiert · In neuen Nachweis“, höchstens 60 Fragen
- [x] Start bei Schritt 2 mit den markierten Fragen in ihrer Reihenfolge. Fach und Thema werden aus den Fragen abgeleitet, Schritt 1 ist erreichbar (Rendertest).
- [x] Bei mehreren Bereichen kommt eine Rückfrage mit der Auswahl je Bereich. Nicht zulässige Fragen meldet ein Hinweis mit ihrer Anzahl.
- [ ] Gleiche Ursache wie BUG-1: Wer weniger als 5 Fragen markiert, kommt bis Schritt 3, kann dort aber nicht speichern

#### Rechte, Wörter und Technik
- [x] Rechte unverändert (`requireTeacherOrAdmin`, gleiches Muster wie beim Vorschlag in PROJ-78)
- [x] Schrittnamen wörtlich, Begriffe in `begriffe.ts`, Wächtertest grün
- [x] Nur `ws-*`-Farben, `AdminSegmented`, `AdminPageHeader`, `admin-states` (Laden, Leer, Fehler)
- [x] Alte Adressen funktionieren weiter, alter Dialog entfernt

### Edge Cases Status
- [x] Kein Treffer: Leerzustand mit „Frage suchen“ und Link zu „Fragen hinzufügen“
- [x] Zu wenige Fragen: Hinweis „nur X von Y“, kein Auffüllen
- [x] Abbruch: kein Entwurf in der Datenbank. Rückfrage bei Links und beim Neuladen (Ausnahme: Zurück-Taste, BUG-5)
- [x] Frage verschwindet: Der Server nennt die Fragen (`invalidQuestionIds`), die Seite springt zu Schritt 2 und markiert sie (Rendertest)
- [x] Bereichswechsel in einem anderen Tab: Der Bereich wird nur beim Start gelesen und gilt dann fest
- [x] Zeitzone und Sommerzeit: Unit-Tests für den 25.10. und den 29.3.
- [ ] Klasse mit Sonderzeichen: wird nicht abgelehnt (BUG-3). Zu lang: wird abgelehnt
- [x] Offline: Die Seite bleibt offen, die Angaben bleiben, Meldung „Keine Verbindung …“, der Knopf heißt dann „Erneut versuchen“
- [ ] Nur eine Frage: Die Seite erlaubt sie, der Server lehnt sie ab (BUG-1)
- [x] Zusätzlich geprüft: Kaputter oder fehlender sessionStorage-Eintrag (geteilter Link) führt zum normalen Start, der Eintrag wird nach dem Lesen gelöscht (Unit-Test)

### Security Audit Results
- [x] Authentifizierung: `/neu`, `?aus=schwierig`, `?neu=1` und `/schluessel` leiten ohne Anmeldung zum Login. Die Suche (alle drei Aktionen) und das Anlegen geben 401 zurück (E2E).
- [x] Autorisierung: Die Suche liefert nur den zulässigen Pool. Private „nur für Nachweise“-Fragen kommen nur von der eigenen Person (`ownerId = user.id`). Das Anlegen prüft Bereich, Fragen und Rolle auf dem Server erneut.
- [x] Eingaben: Alle Felder prüft Zod (Länge, UUIDs, `offset` ≤ 100.000, `ids` ≤ 60). Die Suche filtert im Speicher, es gibt kein SQL aus Nutzereingaben. React maskiert alle Texte, und kein neuer Code nutzt `dangerouslySetInnerHTML`.
- [x] sessionStorage-Übergabe: Der Inhalt wird geprüft (nur Strings, höchstens 60) und nur als Nummern an den Server geschickt. Der Server lässt unbekannte Nummern als `missing` weg.
- [x] Keine Geheimnisse und keine fremden Personendaten in den Antworten (Treffer ohne Urheber)
- [ ] Rate-Limiting: keines auf der Suche (Low, siehe BUG-7). Jede Anfrage lädt den ganzen Bereichs-Pool samt Statistik.

### Bugs Found

#### BUG-1: Nachweise mit 1–4 Fragen lassen sich nicht speichern
- **Severity:** High
- **Steps to Reproduce:**
  1. „Nachweis anlegen“ → „Leer beginnen“ → mit „Frage suchen“ 1 bis 4 Fragen hinzufügen (oder aus „Schwierig“ 3 Fragen markieren → „In neuen Nachweis“)
  2. Die Seite sagt: „Du kannst trotzdem weitermachen.“ → „Weiter“ → Schritt 3 ausfüllen → „Entwurf speichern“
  3. Expected: Der Entwurf wird gespeichert („unter 5 Fragen nur ein Hinweis, kein Verbot“ und Edge Case „Nur eine Frage: erlaubt“)
  4. Actual: `checkQuestionSelection` (`src/lib/assessment-questions.ts:161`) lehnt mit 400 „Mindestens 5 Fragen nötig.“ ab. Die Meldung steht unter Schritt 3, Speichern ist nicht möglich.
- **Hinweis:** Entweder sinkt die Untergrenze für das Anlegen auf 1 Frage (das Öffnen in PROJ-21 und die Datenbank-Regeln mitprüfen), oder Spec und Hinweis werden angepasst. Diese Entscheidung trifft der Product Owner.
- **Priority:** Fix before deployment

#### BUG-2: Ein Bereichswechsel in Schritt 1 behält die Fragen des alten Bereichs
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Als Super-Admin bei „Alle Bereiche“ (oder Lehrkraft mit mehreren Bereichen): Bereich A wählen → „Vorschlag erstellen“ → Schritt 2 zeigt Fragen aus A
  2. In der Schrittleiste zurück zu „Was?“ → Bereich B wählen → „Weiter“ über die Schrittleiste zu Schritt 2 (oder 3) → speichern
  3. Expected: Ein Bereichswechsel leert die Auswahl, oder es kommt vorher eine Rückfrage
  4. Actual: `onDepartmentChange` leert nur Fach und Thema. Die Fragen aus A bleiben, der Server lehnt alle als „nicht zulässig“ ab, und die Lehrkraft muss sie einzeln entfernen.
- **Priority:** Fix before deployment

#### BUG-3: Die Klasse in freier Eingabe prüft das Format nicht
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Schritt 3 → Klasse „Andere Klasse eingeben …“ → `!!! test <b>` eingeben → speichern
  2. Expected: Ablehnung am Feld („nur Format wie SP10C“, Edge Case „Klasse mit Sonderzeichen … wird am Feld abgelehnt“)
  3. Actual: `validateWhen` und der Server (`z.string().max(30)`) prüfen nur die Länge. Der Entwurf wird mit dieser Klasse gespeichert und erscheint in der Klassen-Auswahl der nächsten Nachweise. Ein XSS-Risiko besteht nicht, weil React maskiert.
- **Priority:** Fix before deployment

#### BUG-4: Nach 23:59 ist der Vorschlag „heute 23:59“ schon vergangen
- **Severity:** Low
- **Steps to Reproduce:** Schritt 3 zwischen 23:59 und 0:00 Uhr öffnen (oder die Seite über Mitternacht offen lassen und dann erstmals Schritt 3 öffnen)
- **Expected:** ein gültiger Vorschlag (zum Beispiel morgen 23:59)
- **Actual:** Das vorausgefüllte Feld ist ungültig, erst beim Speichern erscheint „liegt in der Vergangenheit“
- **Priority:** Nice to have

#### BUG-5: Die Zurück-Taste des Browsers verlässt den Ablauf ohne Rückfrage
- **Severity:** Low (in den Implementation Notes als Abweichung genannt)
- **Steps to Reproduce:** Bis Schritt 2 oder 3 gehen → Zurück-Taste des Browsers oder Wischgeste am Handy
- **Expected:** Rückfrage „Angaben gehen verloren“ (AC „Wer die Seite verlässt …“)
- **Actual:** Die Liste öffnet sich sofort, alle Angaben sind weg. Am Handy passiert das per Wischgeste leicht aus Versehen.
- **Priority:** Fix in next sprint

#### BUG-6: Die Rückfrage fehlt, solange nur Schritt 1 ausgefüllt ist
- **Severity:** Low
- **Steps to Reproduce:** In Schritt 1 Fächer, Themen und eine eigene Verteilung einstellen → Link in der Seitenleiste klicken
- **Actual:** Keine Rückfrage, weil `dirty` erst ab Schritt 2 gilt (`items.length > 0 || reached > 1`)
- **Priority:** Nice to have

#### BUG-7: Jede Suchanfrage lädt den ganzen Pool des Bereichs neu
- **Severity:** Low (Leistung)
- **Details:** `POST …/questions/search` ruft bei jedem Tippen (nach 300 ms Wartezeit) und bei jedem „Weitere 25“ `loadCandidates` auf. Das heißt: alle zulässigen Fragen, die Lösungsquoten seitenweise und die offenen Meldungen. Zum Browser gehen nur 25 Treffer (die AC ist erfüllt), die Datenbank arbeitet aber jedes Mal mit allen 3.355 Fragen. Es gibt kein Rate-Limit. Die Zeit (Ziel unter 2 s) war ohne Datenbank nicht messbar.
- **Priority:** Fix in next sprint (zum Beispiel den Pool kurz zwischenspeichern)

#### BUG-8: Die Hinweis-Meldung beim Markieren kann doppelt erscheinen
- **Severity:** Low
- **Details:** `toggleMark` in `difficult-questions.tsx` ruft `toast.error` innerhalb des State-Updaters auf. Im Strict Mode (Entwicklung) läuft der Updater doppelt, dann erscheint „höchstens 60 Fragen“ zweimal. Den Toast außerhalb des Updaters auslösen.
- **Priority:** Nice to have

#### BUG-9: Übungsprüfungen mit mehr als 60 Fragen werden ohne Hinweis gekürzt
- **Severity:** Low
- **Steps to Reproduce:** „Als Leistungsnachweis verwenden“ bei einer Übungsprüfung mit mehr als 60 Fragen
- **Actual:** `found.question_ids.slice(0, 60)` übernimmt nur die ersten 60, ohne Hinweis auf die übrigen
- **Priority:** Nice to have

### Einschränkungen dieser Prüfung
- Der Ablauf mit echtem Konto, echten Fragen und echtem Speichern ist nicht im Browser getestet. Es gab keine Datenbank und kein Lehrkraft-Konto. Nach den Korrekturen bitte einmal mit echtem Konto prüfen: Vorschlag → Prüfen → Speichern und der Weg aus „Schwierig“.
- Die Breiten 375, 768 und 1440 px sowie Firefox und Safari sind nur über die Tailwind-Klassen im Code geprüft, nicht visuell.

### Summary
- **Acceptance Criteria:** 33 von 37 bestanden. Offen sind 4: unter 5 Fragen speichern, Bereichswechsel, Klassenformat, Weg aus „Schwierig“ mit wenigen Fragen. Drei davon gehen auf BUG-1 bis BUG-3 zurück, der vierte ebenfalls auf BUG-1.
- **Bugs Found:** 9 total (0 critical, 1 high, 2 medium, 6 low)
- **Security:** bestanden. Keine kritischen Befunde, nur das fehlende Rate-Limit (Low).
- **Production Ready:** **NO**
- **Recommendation:** Erst BUG-1 beheben (dazu die Produktentscheidung zur Untergrenze), dann BUG-2 und BUG-3, danach `/qa` erneut

## Deployment
_To be added by /deploy_
