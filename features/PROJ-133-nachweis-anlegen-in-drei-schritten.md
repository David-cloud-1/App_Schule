# PROJ-133: Leistungsnachweis anlegen in drei Schritten (Phase 4 Übersichtlichkeit, Teil 1)

## Status: Architected
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
