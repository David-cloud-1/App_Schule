# PROJ-51: Werkzeugkiste – Rahmen & Durchstich „Ganzes Skript“

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Teil der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Die Werkzeugkiste ist heute eine eigene Flask-App (`~/Schule/Werkzeugkiste`, live auf Hugging Face) mit eigenen Konten. Sie macht aus einem hochgeladenen Skript Unterrichtsmaterial: Skript hochladen → Prompt kopieren → in die eigene KI einfügen → Antwort zurückkopieren → Prüfstelle → Datei herunterladen. Es gibt keinen API-Schlüssel, und es entstehen keine Kosten.

Der Umzug in die App ist auf sechs Features verteilt:

| ID | Inhalt |
|---|---|
| **PROJ-51** | Rahmen, geführter Ablauf und Hintergrund-Dienst, am Beispiel eines Werkzeugs (dieses Feature) |
| PROJ-52 | Meine Materialien |
| PROJ-53 | Regal des Kollegiums |
| PROJ-54 | Die übrigen 11 Werkzeuge |
| PROJ-55 | Schulrecht nachschlagen |
| PROJ-56 | Alte Werkzeugkiste ablösen |

PROJ-51 baut das Muster, das alle anderen Werkzeuge übernehmen: Navigation, Startseite, fünf Schritte, Upload, Prüfstelle, Vorschau und Download. Das Beispielwerkzeug ist **„Ganzes Skript“**, das meistgenutzte Werkzeug mit beiden Ausgabeformaten (H5P und interaktive Seite).

Die abgestimmte Skizze liegt unter https://claude.ai/artifact/NSK5QUStpFTc7tceo4apcN.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1 – Weg A:** Die Oberfläche wird in der App neu gebaut. Der erprobte Python-Kern (Einlesen, Prompts, Prüfstelle, H5P- und Seitenbau, Vorschau) bleibt Python und läuft als Hintergrund-Dienst. Die Lehrkraft merkt davon nichts.
- **E2 – Gemeinsamer Login:** Es gibt keine eigenen Werkzeugkiste-Konten mehr (Kürzel und Passwort entfallen). Wer den Lehrkräfte-Bereich sieht, kann die Werkzeugkiste nutzen.
- **E3 – Neustart:** Aus dem pausierten Werkzeugkiste-Projekt werden keine Daten übernommen.
- **E4 – Übersicht vor Vollständigkeit:** Ein Schritt pro Bildschirm, Einstellungen erst zeigen, wenn sie gebraucht werden, höchstens eine grüne Hauptaktion pro Seite.
- **E5 – Navigation:** In der Seitenleiste gibt es **ein** Eintrag „Werkzeugkiste“ mit drei Reitern (Werkzeuge · Meine Materialien · Regal des Kollegiums). „Schulrecht“ wird ein eigener Eintrag (PROJ-55).
- **E6 – Gruppen:** Die Werkzeuge stehen nach Zweck in vier Gruppen: Selbstlernen · Üben & Wiederholen · Unterricht & Prüfung · Zum Hören.
- **E7 – Kostenlos:** Wie bisher läuft die KI-Stufe manuell über die KI der Lehrkraft. Die App ruft keine kostenpflichtige KI auf.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle): Zugang nur für Lehrer-Rollen
- Requires: PROJ-45 (Lehrkräfte-Arbeitsbereich): Rahmen, Tokens, Zustände, Seitenkopf
- Wird ergänzt durch: PROJ-52 (Speichern), PROJ-53 (Teilen), PROJ-54 (weitere Werkzeuge)

## User Stories
- Als **Lehrkraft** möchte ich die Werkzeugkiste mit meinem normalen App-Konto öffnen, damit ich mir kein zweites Passwort merken muss.
- Als **Lehrkraft** möchte ich auf einen Blick sehen, welche Werkzeuge es gibt und wofür sie gut sind, damit ich schnell das passende finde.
- Als **Lehrkraft** möchte ich mein Skript (Word, PDF, PowerPoint) hochladen und sofort sehen, ob es richtig gelesen wurde, damit ich nicht erst am Ende merke, dass Lösungen oder Bilder fehlen.
- Als **Lehrkraft** möchte ich nur die nötigsten Einstellungen sehen und den Rest bei Bedarf aufklappen, damit ich nicht von Optionen erschlagen werde.
- Als **Lehrkraft** möchte ich den Prompt mit einem Klick kopieren und die Antwort meiner KI einfügen, damit ich ohne Kosten meine KI nutzen kann.
- Als **Lehrkraft** möchte ich vor dem Download erfahren, was an der KI-Antwort nicht stimmt, und dafür einen fertigen Nachbesserungs-Prompt bekommen, damit das Material vollständig ist.
- Als **Lehrkraft** möchte ich das fertige Material ansehen und herunterladen, damit ich es in Moodle hochladen oder austeilen kann.
- Als **Lehrkraft am Handy** möchte ich den Ablauf auch auf dem Smartphone durchgehen können, damit ich unterwegs ein Skript vorbereiten kann.

## Acceptance Criteria

### Zugang & Navigation
- [ ] Der Eintrag „Werkzeugkiste“ in der Seitenleiste (Gruppe „Mein Unterricht“) führt auf eine Seite **in der App**. Der bisherige externe Link entfällt. Das gilt ebenso für die Schnellsuche (⌘K) und die Startseiten-Kachel.
- [ ] Alle Rollen des Lehrkräfte-Bereichs (Lehrkraft, Bereichs-Admin, Super-Admin) haben Zugang. Eine Lehrkraft ohne Fachbereich oder Fach-Zuständigkeit hat ebenfalls Zugang.
- [ ] Azubis sehen die Werkzeugkiste nicht. Alle Seiten und Server-Aufrufe lehnen sie ab, direkte Aufrufe liefern 404.
- [ ] Die Seite beginnt mit `AdminPageHeader` (Titel „Werkzeugkiste“, ein Satz Beschreibung, rechts die grüne Hauptaktion „Skript hochladen“).
- [ ] Darunter stehen drei Reiter: **Werkzeuge** (Standard), **Meine Materialien**, **Regal des Kollegiums**. Bis PROJ-52 und PROJ-53 fertig sind, zeigen die beiden letzten einen freundlichen Leerzustand („Kommt bald“).
- [ ] Der gewählte Reiter steht in der Adresse und bleibt beim Neuladen erhalten.

### Startseite „Werkzeuge“
- [ ] Die 12 Werkzeuge stehen in vier Gruppen mit Überschrift (E6):
  - **Selbstlernen:** Ganzes Skript, Kreative Einheit, Differenzierung
  - **Üben & Wiederholen:** Kahoot-Quiz, Moodle-Fragen, LearningApps, Video-Fragen
  - **Unterricht & Prüfung:** Arbeitsblatt, Lernsituation, Klassenarbeit
  - **Zum Hören:** Podcast, Lernlied
- [ ] Jede Werkzeug-Karte zeigt ein Icon, den Namen und **eine** Zeile Erklärung. Die ganze Karte ist anklickbar und mindestens 44 px hoch.
- [ ] In diesem Feature ist nur „Ganzes Skript“ aktiv. Die übrigen Karten zeigen den Hinweis „kommt bald“, sind nicht anklickbar und haben weniger Kontrast (PROJ-54 schaltet sie frei).
- [ ] Ein Klick auf eine Werkzeug-Karte startet den Ablauf mit vorgewähltem Werkzeug. „Skript hochladen“ im Seitenkopf startet ihn ohne Vorauswahl, das Werkzeug wird dann in Schritt 2 gewählt.
- [ ] Die Gruppen stehen auf dem Desktop als Raster mit 3–4 Spalten, auf dem Handy untereinander mit einer Karte pro Zeile.

### Geführter Ablauf – Rahmen
- [ ] Der Ablauf ist eine eigene Ansicht **ohne Seitenleiste**. Oben stehen nur ein Schließen-Knopf (✕, `aria-label`), der Titel „Neues Material“ und eine Kurzinfo zur laufenden Erstellung (Skriptname, Werkzeug, Format, Niveau, sobald bekannt).
- [ ] Eine Fortschrittsanzeige zeigt fünf Schritte: **Skript · Einstellungen · Prompt · Antwort · Fertig**. Erledigte Schritte bekommen einen Haken, der aktuelle ist hervorgehoben. Auf dem Handy reicht die Kurzform („Schritt 2 von 5 · Einstellungen“).
- [ ] Jeder Schritt hat genau eine grüne Hauptaktion unten rechts („Weiter“, „Prompt erstellen“, „Ich habe die Antwort“, „Material erstellen“) und links „Zurück“. Schritt 1 hat kein „Zurück“.
- [ ] Der Inhalt steht schmal (`max-w-3xl`) und zentriert.
- [ ] Mit „Zurück“ bleiben alle bisherigen Eingaben erhalten.
- [ ] Schließen mit ✕ fragt nach, wenn schon ein Skript hochgeladen ist („Abbrechen? Dein Zwischenstand bleibt 7 Tage unter Meine Materialien“, Text gilt ab PROJ-52, bis dahin: „Dein Zwischenstand geht verloren“).
- [ ] Der Browser-Zurück-Knopf wechselt zum vorherigen Schritt, statt den Ablauf zu verlassen.

### Schritt 1 – Skript
- [ ] Es gibt eine große Ablagefläche mit „Datei hierher ziehen oder auswählen“. Erlaubt sind `.docx`, `.pdf`, `.pptx`, außerdem `.doc`, `.ppt` und `.txt` wie bisher. Darunter steht „.docx empfohlen · bis 50 MB“.
- [ ] Auch Dateien über 4,5 MB bis 50 MB funktionieren (13 von 60 Beispielskripten der Schule sind größer als 4 MB).
- [ ] Während des Hochladens und Einlesens erscheint ein Fortschritt („Wird hochgeladen …“, dann „Wird gelesen …“).
- [ ] Nach dem Einlesen zeigt ein Ergebnisfeld den Dateinamen und die Kennzahlen: **Seiten, erkannte Lösungen, Bilder, Tabellen**. So sieht die Lehrkraft sofort, ob das Skript sauber gelesen wurde.
- [ ] Die Lehrkraft kann wie bisher über „Auswahl eingrenzen“ einen Teil des Skripts wählen: bei PDF und PowerPoint Seiten bzw. Folien, bei Word Abschnitte nach den Überschriften. Das ist optional und standardmäßig zugeklappt.
- [ ] Hat das Skript **null erkannte Lösungen**, erscheint ein ruhiger Hinweis: „Keine Lösungen gefunden. Lösungen bitte rot oder als versteckten Text markieren.“ Weiter geht es trotzdem.
- [ ] Bei `.doc` oder `.ppt` erscheint der bisherige Hinweis: „Altes Format, nur der Text wird gelesen. Speichere die Datei in Word als .docx für Lösungen, Tabellen und Bilder.“

### Schritt 2 – Einstellungen
- [ ] Sichtbar sind nur:
  - **Werkzeug** (vorgewählt, über „ändern“ wählbar)
  - **Format**, falls das Werkzeug mehrere hat. Für „Ganzes Skript“ sind das zwei Karten: **H5P für Moodle** („Ergebnisse zählen im Notenbuch“) und **Interaktive Seite** („Zum Üben, auch offline und druckbar“). Vorgewählt ist H5P.
  - **Niveau** als Fünfer-Schalter (sehr leicht · leicht · mittel · schwer · sehr schwer). Vorgewählt ist „mittel“.
- [ ] Hinter **„Mehr Optionen“** (standardmäßig zugeklappt) stehen Bildungsgang (vorgewählt „Automatisch aus dem Skript“), Lernfeld (aus den bayerischen Lehrplänen, abhängig vom Bildungsgang, standardmäßig „keins“) und Umfang (standardmäßig „nach Skript“, sonst 45 Min bis 18–20 Std).
- [ ] Die Auswahlmöglichkeiten und ihre Wirkung auf den Prompt entsprechen genau der heutigen Werkzeugkiste (`NIVEAUS`, `BILDUNGSGAENGE`, Lernfelder, Umfang).
- [ ] Die zuletzt gewählten Werte für Niveau, Bildungsgang und Format merkt sich die App pro Lehrkraft und schlägt sie beim nächsten Mal vor.

### Schritt 3 – Prompt kopieren
- [ ] In der Mitte steht ein großer Knopf **„Prompt kopieren“**. Er kopiert den vollständigen Prompt in die Zwischenablage und wechselt kurz zu „Kopiert ✓“.
- [ ] Darunter stehen die ungefähre Zeichenzahl und ein Link „Prompt ansehen“, der den Prompt in einem scrollbaren Feld aufklappt.
- [ ] Es folgen drei kurze, nummerierte Schritte: KI in neuem Tab öffnen · Prompt einfügen und abschicken · ganze Antwort kopieren und zurückkommen.
- [ ] Der Prompt ist **zeichengenau derselbe**, den die heutige Werkzeugkiste für dieselben Einstellungen erzeugt.
- [ ] Funktioniert das Kopieren nicht (Browser verweigert), wird der Prompt markiert angezeigt mit dem Hinweis „Bitte mit ⌘C / Strg+C kopieren“.

### Schritt 4 – Antwort & Prüfstelle
- [ ] Ein großes Textfeld nimmt die KI-Antwort auf (Platzhalter „Hier die komplette Antwort einfügen“).
- [ ] Nach dem Einfügen prüft die App die Antwort automatisch, **ohne KI**, mit derselben Prüfstelle wie heute (`qualitaet.py`).
- [ ] Das Ergebnis erscheint als **eine** Box:
  - Keine Befunde: grün, „Alles in Ordnung“
  - Befunde: orange, „N Hinweise – die Datei wird trotzdem gebaut“, darunter die Befunde als kurze Liste in verständlicher Sprache, ohne YAML-Fachbegriffe
  - Automatisch korrigierte Kleinigkeiten stehen als eine Zeile („3 Kleinigkeiten wurden automatisch korrigiert“)
- [ ] Bei Befunden gibt es den Knopf **„Nachbesserungs-Prompt kopieren“** (wie bisher). Fügt die Lehrkraft danach eine neue Antwort ein, wird erneut geprüft.
- [ ] Ist die Antwort gar nicht lesbar (kein YAML, abgeschnitten, leer), erscheint statt der Prüfung ein klarer Satz („Die Antwort ist unvollständig. Bitte die KI um die vollständige Antwort bitten oder den Prompt erneut senden.“) und „Material erstellen“ ist gesperrt.
- [ ] Wie bisher blockieren Befunde nie: „Material erstellen“ bleibt bei lesbarer Antwort immer möglich.

### Schritt 5 – Fertig
- [ ] Eine Erfolgsmeldung zeigt Dateiname, Format und Umfang (z. B. „6 Kapitel · 31 Aufgaben“).
- [ ] Die Hauptaktion ist **„Herunterladen“** (`.h5p` bzw. `.html`). Daneben steht „Vorschau ansehen“.
- [ ] Die **Vorschau** zeigt Kapitel für Kapitel jede Aufgabe mit hinterlegter Lösung, die richtigen Antworten hervorgehoben (wie heute `vorschau.py`). Sie öffnet sich in einem großen Dialog bzw. auf dem Handy als Vollbild.
- [ ] Unter „Wie geht es weiter?“ stehen höchstens drei Vorschläge als Outline-Knöpfe:
  - **„Gleiches Skript, anderes Werkzeug“** springt zu Schritt 2, das Skript bleibt eingelesen
  - **„Antwort überarbeiten“** springt zurück zu Schritt 4 mit der bisherigen Antwort
  - **„Im Regal teilen“** ist erst ab PROJ-53 sichtbar
- [ ] Die erzeugte Datei ist **inhaltsgleich** mit der Datei, die die heutige Werkzeugkiste aus derselben Antwort baut.

### Gleichwertigkeit mit dem Bestand
- [ ] Für 5 Beispielskripte aus `Unterichtsmaterialien` (je ein PDF, Word, PowerPoint, ein zweispaltiges PDF und ein Skript über 4,5 MB) liefern Einlesen, Prompt, Prüfstelle und H5P/Seite dieselben Ergebnisse wie die heutige Werkzeugkiste.
- [ ] Die automatischen Tests der Werkzeugkiste (`werkzeugtest.py`) laufen im neuen Hintergrund-Dienst grün.

## Edge Cases
- **Datei über 50 MB:** Sie wird vor dem Hochladen abgelehnt: „Die Datei ist größer als 50 MB. Bitte Bilder komprimieren oder das Skript teilen.“
- **Falsches Format** (z. B. `.jpg`, `.zip`): Ablehnung mit Liste der erlaubten Formate.
- **Passwortgeschütztes oder beschädigtes PDF/Word:** „Die Datei lässt sich nicht öffnen. Ist sie passwortgeschützt?“ Kein technischer Fehlertext.
- **Gescanntes PDF ohne Text** (nur Bilder): „In der Datei wurde kein Text gefunden. Ist es ein Scan?“ Es gibt keine automatische Texterkennung.
- **Hintergrund-Dienst nicht erreichbar oder Zeitüberschreitung:** `AdminErrorState` mit „Erneut versuchen“. Die Eingaben der Lehrkraft (Einstellungen, eingefügte Antwort) gehen dabei nicht verloren.
- **Lehrkraft lädt die Seite mitten im Ablauf neu:** Der Ablauf setzt beim aktuellen Schritt fort, das Skript muss nicht erneut hochgeladen werden.
- **Lehrkraft wechselt das Werkzeug in Schritt 2:** Format und werkzeugspezifische Optionen werden auf die Standardwerte des neuen Werkzeugs zurückgesetzt, Niveau und Bildungsgang bleiben.
- **KI-Antwort enthält Text vor oder nach dem YAML** (z. B. „Hier ist deine Lerneinheit:“): Wird wie bisher automatisch entfernt.
- **Bilder aus dem Skript:** Sie landen in der fertigen Datei an der richtigen Stelle, auch bei sehr vielen Bildern (Ergebnisdatei über 4,5 MB).
- **Zwei Abläufe gleichzeitig in zwei Tabs:** Jeder Ablauf ist unabhängig, sie überschreiben sich nicht.
- **Lehrkraft verliert während des Ablaufs ihre Lehrer-Rolle:** Der nächste Schritt wird abgelehnt (Hinweis und Weiterleitung zur Lern-App).

## Technical Requirements
- **Sicherheit:** Der Hintergrund-Dienst ist nicht öffentlich nutzbar. Er nimmt nur Aufträge aus der App an, die die Rolle der Lehrkraft serverseitig geprüft hat. Hochgeladene Skripte sind privat und nur für die hochladende Lehrkraft lesbar.
- **Datenschutz:** Hochgeladene Skripte (oft Verlagsmaterial) werden nie geteilt. Nicht gespeicherte Zwischenstände werden nach spätestens 7 Tagen gelöscht.
- **Leistung:** Einlesen eines 20-seitigen Word-Skripts in unter 15 Sekunden, Bau einer H5P-Datei in unter 20 Sekunden.
- **Kosten:** Es entstehen keine laufenden KI-Kosten (E7). Hosting im bestehenden Rahmen (Vercel, Supabase).
- **Barrierefreiheit & Design:** Es gelten die Regeln des Lehrkräfte-Bereichs (PROJ-45): Tokens, hell und dunkel, 44 px, Tastatur, Fokus, „Bewegung reduzieren“.

## Abgrenzung (nicht Teil dieses Features)
- Speichern und Wiederfinden erstellter Materialien (PROJ-52)
- Teilen im Regal (PROJ-53)
- Die übrigen 11 Werkzeuge (PROJ-54)
- Schulrecht (PROJ-55)
- Abschalten der alten Werkzeugkiste (PROJ-56)
- Verbindung zu „Fragen aus Material“ der Lern-App (spätere Idee: dasselbe Skript auch für Lern-App-Fragen nutzen)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
