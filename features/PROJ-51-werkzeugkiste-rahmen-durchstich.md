# PROJ-51: Werkzeugkiste – Rahmen & Durchstich „Ganzes Skript“

## Status: In Progress
**Created:** 2026-10-27
**Last Updated:** 2026-10-28

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

> Stand 2026-10-27. Dieser Entwurf legt auch die Grundlage für PROJ-52 bis PROJ-56. Was dort dazukommt, ist am Ende vermerkt.

### Das Bild im Großen

Es gibt drei Bausteine. Die Lehrkraft sieht davon nur die App.

```
Browser der Lehrkraft
   |  (1) Skript direkt in den Speicher hochladen – keine Größenbremse
   v
Supabase-Speicher (privater Bereich „werkzeugkiste“)
   ^                                   ^
   |  liest Skript, legt Ergebnis ab   |  kurzlebige Download-Links
   |                                   |
Werkzeugkiste-Kern (Python)  <------  Lern-App (Next.js, Vercel)
eigenes Vercel-Projekt          (2)   prüft Rolle, merkt sich den Ablauf,
der bewährte Code der                 ruft den Kern auf, zeigt alles an
alten Werkzeugkiste
```

1. **Die Lern-App** ist das Gesicht. Sie prüft, dass hier eine Lehrkraft arbeitet, merkt sich, wo der Ablauf steht, und zeigt die fünf Schritte.
2. **Der Werkzeugkiste-Kern** ist der bestehende Python-Code (Einlesen, Prompts, Prüfstelle, H5P- und Seitenbau, Vorschau). Er bekommt eine neue, schlanke Schnittstelle und läuft als **eigenes Vercel-Projekt**. Er nimmt nur Aufträge der Lern-App an und kennt keine Konten, Rollen oder Datenbank-Tabellen.
3. **Der Supabase-Speicher** nimmt Skripte, eingelesene Inhalte und fertige Dateien auf. Große Dateien laufen nie durch die App, sondern direkt zwischen Browser, Speicher und Kern. So greift die 4,5-MB-Grenze von Vercel nicht.

### Wo der Python-Code lebt

**Im bestehenden Repository `Werkzeugkiste`** (GitHub), nicht in der Lern-App.
- Neben die alte Flask-Oberfläche kommt eine neue Schnittstelle **für die App**. Beide nutzen **dieselben** Module (`extraktion`, `prompts`, `qualitaet`, `h5p_generator`, `seite`, `vorschau`).
- Damit ist die geforderte Gleichwertigkeit (gleicher Prompt, gleiche Datei) eingebaut, statt nachgebaut zu sein. Außerdem laufen alte und neue Werkzeugkiste bis PROJ-56 parallel aus demselben Code.
- Die bestehenden Tests (`werkzeugtest.py`) bleiben gültig und werden um Tests der neuen Schnittstelle ergänzt.
- Das Vercel-Projekt (Vorschlag: `werkzeugkiste-kern`) liegt im selben Team und in derselben Region wie die App (Dublin), nahe an der Datenbank. Bereitgestellt wird wie bisher per Vercel-CLI.

**Warum nicht in die Lern-App selbst?** Die Python-Bibliotheken für PDF, Word und PowerPoint sind groß. Im selben Projekt würden sie jeden Bau der Lern-App verlangsamen, und ein Fehler im Python-Teil könnte das Deployment der Schüler-App blockieren. Getrennt gehen beide Teile unabhängig live.

### Ein Schritt im Ablauf, von außen betrachtet

| Schritt | Was passiert |
|---|---|
| 1 Skript | Die App legt einen neuen **Ablauf** an und gibt dem Browser eine einmalige Hochlade-Erlaubnis für genau eine Datei. Der Browser lädt direkt in den Speicher. Danach bittet die App den Kern ums Einlesen. Der Kern holt die Datei, liest sie und legt Text und Bilder als „Einlesung“ daneben ab. Zurück an die App gehen nur die Kennzahlen (Seiten, Lösungen, Bilder, Tabellen) und, bei Word, die Überschriften für die Auswahl. |
| 2 Einstellungen | Die Auswahllisten (Niveaus, Bildungsgänge, Lernfelder, Umfang) **liefert der Kern**, damit sie genau der alten Werkzeugkiste entsprechen. Die App speichert sie kurz zwischen. |
| 3 Prompt | Die App schickt Einstellungen und Ort der Einlesung an den Kern. Er baut den Prompt mit demselben Code wie bisher. Die App merkt sich den Prompt im Ablauf, damit er nach einem Neuladen sofort da ist. |
| 4 Antwort | Die eingefügte Antwort geht an den Kern zur Prüfstelle. Zurück kommen die Befunde (in verständlichen Sätzen), die automatisch korrigierte Fassung und gegebenenfalls der Nachbesserungs-Prompt. |
| 5 Fertig | Der Kern baut die Datei mit den Bildern aus der Einlesung und legt sie im Speicher ab, ebenso die Vorschau. Die App zeigt Umfang, Download und Vorschau. Ein Download ist ein kurzlebiger, nicht erratbarer Link. |

Jeder einzelne Aufruf beim Kern ist kurz (Sekunden bis höchstens etwa eine Minute) und bleibt damit weit unter den Zeitgrenzen von Vercel.

### Component Structure

```
Lehrkräfte-Bereich (bestehender Rahmen, PROJ-45)
+-- Seitenleiste: „Werkzeugkiste“ in „Mein Unterricht“ (jetzt intern statt externer Link)
+-- Seite Werkzeugkiste
    +-- AdminPageHeader (Titel, Satz, Hauptaktion „Skript hochladen“)
    +-- Reiter-Leiste (Werkzeuge · Meine Materialien · Regal) – Reiter steht in der Adresse
    +-- Reiter „Werkzeuge“
    |   +-- Werkzeug-Gruppe (×4, Überschrift)
    |       +-- Werkzeug-Karte (Icon, Name, eine Zeile; aktiv oder „kommt bald“)
    +-- Reiter „Meine Materialien“ / „Regal“ -> AdminEmptyState „Kommt bald“ (bis PROJ-52/53)

Ablauf-Ansicht (eigene Adresse je Ablauf; der Rahmen blendet hier Seitenleiste und Kopfzeile aus)
+-- Ablauf-Kopf (✕ mit Rückfrage, „Neues Material“, Kurzinfo)
+-- Fortschrittsanzeige (5 Schritte; Handy: „Schritt 2 von 5“)
+-- Schritt-Inhalt (schmal, zentriert)
|   +-- 1 Skript: Ablagefläche, Hochlade-/Lese-Fortschritt, Ergebnisfeld mit Kennzahlen,
|   |             „Auswahl eingrenzen“ (Seiten/Folien bzw. Word-Abschnitte), Hinweise
|   +-- 2 Einstellungen: Werkzeug-Wahl, Format-Karten, Niveau-Schalter,
|   |                    „Mehr Optionen“ (Bildungsgang, Lernfeld, Umfang)
|   +-- 3 Prompt: großer Kopierknopf, Zeichenzahl, „Prompt ansehen“, 3 Kurzschritte
|   +-- 4 Antwort: Antwortfeld, Prüfergebnis-Box, „Nachbesserungs-Prompt kopieren“
|   +-- 5 Fertig: Erfolg, „Herunterladen“, „Vorschau ansehen“, „Wie geht es weiter?“
+-- Fuß: „Zurück“ links, eine grüne Hauptaktion rechts
+-- Vorschau-Dialog (Desktop groß, Handy Vollbild; Inhalt abgeschottet angezeigt)
```

Alle Bausteine nutzen vorhandene shadcn-Komponenten (Tabs, Card, Button, Dialog, AlertDialog, ToggleGroup, Collapsible, Select, Textarea, Progress, Skeleton) und die Zustände aus `admin-states.tsx`. Einzig die **Ablagefläche** für Dateien ist neu. Sie wird eine kleine eigene Komponente aus vorhandenen Bausteinen, ohne Zusatzpaket.

Die Werkzeugliste (Name, Gruppe, Icon, Erklärzeile, aktiv/„kommt bald“, Formate) ist **eine** feste Übersicht in der App, so wie die Navigation in `admin-nav.ts`. Sie schaltet in PROJ-54 die übrigen Werkzeuge frei.

### Data Model (in Worten)

**Werkzeug-Ablauf** (neue Tabelle, eine Zeile pro begonnener Erstellung):
- Eindeutige Nummer, Besitzer (Lehrkraft)
- Werkzeug, Format, alle gewählten Einstellungen
- Aktueller Schritt (1–5) und Zustand: *läuft* oder *fertig*
- Name der hochgeladenen Datei und ihre Kennzahlen (Seiten, Lösungen, Bilder, Tabellen)
- Gewählte Auswahl (Seiten bzw. Abschnitte)
- Erzeugter Prompt
- Eingefügte KI-Antwort und letztes Prüfergebnis
- Titel und Umfang des fertigen Materials (Kapitel, Aufgaben)
- Orte im Speicher: Skript, Einlesung, fertige Datei(en), Vorschau
- Angelegt am, zuletzt bearbeitet am, **läuft ab am** (7 Tage nach der letzten Bearbeitung)

**Speicher** (privater Bereich „werkzeugkiste“), pro Lehrkraft und Ablauf ein eigener Ordner mit Skript, Einlesung (Text + Bilder), fertiger Datei und Vorschau.

**Wer darf was:**
- Eine Lehrkraft sieht und ändert nur **eigene** Abläufe und Dateien. Das setzt die Datenbank selbst durch (Zeilen- und Speicherregeln), nicht nur die Oberfläche.
- Azubis haben weder auf die Tabelle noch auf den Speicherbereich Zugriff.
- Der Kern arbeitet mit einem eigenen Server-Schlüssel nur im Speicher. Die App gibt ihm bei jedem Auftrag genau die Orte mit, die er lesen und beschreiben soll.

**Zuletzt gewählte Einstellungen** brauchen keine eigene Tabelle. Die App liest sie aus dem jüngsten Ablauf der Lehrkraft.

**Aufräumen:** Ein täglicher Zeitplan (Vercel Cron) löscht abgelaufene Abläufe samt ihren Dateien im Speicher. In PROJ-51 laufen **alle** Abläufe nach 7 Tagen ab, auch fertige, denn Speichern auf Dauer kommt erst mit PROJ-52.

### Sicherheit

- **Kern nur für die App:** Der Kern verlangt bei jedem Aufruf ein geheimes Kennwort, das nur die App kennt (Umgebungsvariable in beiden Projekten). Ohne Kennwort antwortet er mit „nicht erlaubt“. Seine Adresse taucht nie im Browser auf.
- **Rolle zuerst:** Jeder Werkzeugkiste-Aufruf der App prüft die Lehrer-Rolle (bestehendes `requireTeacherOrAdmin`). Die Middleware nimmt die Werkzeugkiste-Seiten in die Liste der Seiten auf, die eine reine Lehrkraft öffnen darf.
- **Hochladen:** Die Hochlade-Erlaubnis gilt nur für einen Ordner, eine Datei und kurze Zeit. Dateityp und Größe (50 MB) prüft der Browser vorab und der Kern beim Einlesen ein zweites Mal.
- **Vorschau:** Sie enthält Text aus der KI-Antwort. Deshalb wird sie abgeschottet angezeigt (kein Zugriff auf die App, keine Skripte), so wie die interaktive Seite schon heute Skripte aus KI-Texten entfernt.
- **Keine Inhalte in Logs:** Skripttexte und KI-Antworten erscheinen nicht in Fehlerberichten.

### Tech Decisions (warum so)

| Entscheidung | Warum |
|---|---|
| Python-Kern bleibt Python, eigenes Vercel-Projekt | Rund 30.000 erprobte Zeilen werden nicht neu geschrieben, die Gleichwertigkeit ist garantiert, und Schüler-App und Kern stören sich nicht gegenseitig. |
| Code bleibt im Repository `Werkzeugkiste` | Eine Stelle für den Kern, die Git-Historie und die Tests bleiben, und die alte Oberfläche läuft bis zur Ablösung aus demselben Code. |
| Dateien direkt Browser ↔ Speicher | Umgeht die 4,5-MB-Grenze. 13 von 60 echten Skripten wären sonst gescheitert. |
| App merkt sich den Ablauf in der Datenbank | Neuladen, zweiter Tab und Handy funktionieren. PROJ-52 („Meine Materialien“, Entwürfe) baut auf genau dieser Tabelle auf, statt eine zweite zu brauchen. |
| Auswahllisten kommen vom Kern | Nur so bleiben Niveaus, Bildungsgänge und Lernfelder mit der alten Werkzeugkiste identisch. |
| Kern ohne Datenbankzugriff | Er bleibt einfach und austauschbar. Rechte und Konten stecken nur an einer Stelle, nämlich in der App. |
| Täglicher Aufräum-Zeitplan | Erfüllt „nach 7 Tagen gelöscht“. Dateien im Speicher lassen sich zuverlässig nur über die Speicher-Schnittstelle löschen, deshalb läuft das über die App statt rein in der Datenbank. |

### Erster Prüfpunkt beim Bauen (vor allem anderen)

Bevor Oberfläche entsteht, wird der Kern einmal **leer** auf Vercel bereitgestellt und mit zwei echten Skripten (Word und ein PDF über 4,5 MB) durchgespielt: hochladen → einlesen → Prompt → bauen. Damit ist bestätigt, dass die PDF-Bibliothek in Vercels Python-Umgebung läuft und die Zeiten passen. Scheitert das, ist der Ausweichweg derselbe Kern in einem Container auf Hugging Face, also dort, wo er heute schon läuft. Die App ändert sich dadurch nicht.

#### Ergebnis des Prüfpunkts (2026-10-27): bestanden

Kern als Vercel-Projekt `werkzeugkiste-kern` bereitgestellt (https://werkzeugkiste-kern.vercel.app, Zweig `vercel-kern` im Repository `Werkzeugkiste`). Vier echte Skripte liefen über einen vorübergehenden privaten Speicherbereich (danach gelöscht):

| Skript | Größe | Einlesen auf Vercel | Ergebnis gleich wie lokal? |
|---|---|---|---|
| Heft 2 Haftung (PDF) | 1,2 MB | 10,6 s, H5P-Bau 0,2 s | ja (233 Lösungen, 5 Tabellen, 4 Bilder) |
| Außenhandel (PDF) | 1,3 MB | 6,7 s | ja (2 Lösungen, 34 Tabellen, 11 Bilder) |
| BGP Teil 5 (Word) | 13,4 MB | 0,1 s | ja (86 Lösungen, 30 Bilder) |
| PuG 10 (Word) | 24,9 MB | 0,4 s | ja (285 Lösungen, 52 Bilder) |

Befunde und Folgen für den Bau:
- **PDF-Bibliothek festschreiben:** Ohne Versionsangabe installierte Vercel PyMuPDF 2.0. Das erkannte rote Schrift und Tabellen anders (Heft 2: 252 statt 233 Lösungen). Mit `pymupdf==1.26.5` (die Version, mit der das Einlesen entwickelt wurde) sind die Ergebnisse identisch. **Regel: Alle Kern-Bibliotheken bekommen feste Versionen**, und die Python-Version wird an Hugging Face (3.11) angeglichen.
- **H5P-Dateien sind nicht bytegleich** (Zufalls-IDs und Zeitstempel im Paket). Der Gleichwertigkeits-Test vergleicht deshalb den Inhalt (`content.json`), nicht die Datei als Ganzes.
- **PDF-Einlesen ist auf Vercel etwa 2–3-mal langsamer als lokal** (rund 7–11 s für 20–40 Seiten), liegt aber weit unter der Zeitgrenze. Schritt 1 zeigt deshalb einen echten Fortschritt („Wird gelesen …“).
- **Hochladen dauert je nach Leitung** (vom Heimanschluss 25 MB in rund 20 s). Der Fortschrittsbalken beim Hochladen ist Pflicht.
- **Paketgröße:** etwa 320 MB mit `onnxruntime` und `edge-tts`. Ohne diese beiden (erst für PROJ-54/55) wird der Kern deutlich kleiner und startet schneller.
- **Kennwortschutz** bestätigt: Ohne oder mit falschem Kennwort antwortet der Kern mit 401.

### Dependencies

**Lern-App:** keine neuen Pakete. Supabase-Client, shadcn/ui und Lucide sind vorhanden.

**Werkzeugkiste-Kern:** die bestehenden Pakete laut `requirements.txt` (PyMuPDF, python-docx, python-pptx, openpyxl, olefile, PyYAML, Flask) plus der offizielle Supabase-Python-Client für den Speicherzugriff. `onnxruntime`, `tokenizers` und `edge-tts` werden erst in PROJ-55 bzw. PROJ-54 gebraucht und bleiben zunächst draußen, damit das Paket klein bleibt.

**Einrichtung:** neues Vercel-Projekt `werkzeugkiste-kern`, privater Speicherbereich „werkzeugkiste“, gemeinsames Kennwort als Umgebungsvariable in beiden Projekten, ein Vercel-Cron für das Aufräumen.

### Was spätere Features ergänzen
- **PROJ-52:** Fertige Abläufe laufen nicht mehr ab (nur noch Entwürfe nach 7 Tagen), Skripte werden nach 12 Monaten entfernt, und die Liste „Meine Materialien“ liest dieselbe Tabelle.
- **PROJ-53:** Eine zusätzliche Tabelle für Freigaben (wer darf welches Material sehen).
- **PROJ-54:** weitere Einträge in der Werkzeugliste, der Podcast als Aufruf pro Kapitel, `edge-tts` im Kern.
- **PROJ-55:** Suchmodell und Rechtsquellen im Kern. Fragen werden nicht gespeichert.
- **PROJ-56:** Die alte Flask-Oberfläche wird zur reinen Weiterleitung.

## Frontend-Umsetzung (2026-10-28)

**Seiten**
- `/admin/werkzeugkiste` mit Seitenkopf, Hauptaktion „Skript hochladen“ und drei Reitern (`?tab=materialien|regal`). „Meine Materialien“ und „Regal“ zeigen bis PROJ-52/53 einen Leerzustand „Kommt bald“.
- `/admin/werkzeugkiste/neu?werkzeug=…`: Schritt 1 eines neuen Ablaufs. Der Ablauf entsteht erst mit der Datei (anlegen → direkt in den Speicher hochladen mit Fortschritt → einlesen). Danach geht es weiter auf die Adresse des Ablaufs.
- `/admin/werkzeugkiste/ablauf/[id]?schritt=1…5`: der laufende Ablauf. Der Schritt steht in der Adresse, deshalb führt der Zurück-Knopf des Browsers zum vorigen Schritt, und ein Neuladen macht dort weiter. Vorwärts öffnen sich nur vorbereitete Schritte (`schrittErlaubt`).
- Der Rahmen (`AdminShell`) blendet auf den Ablauf-Seiten Seitenleiste und Kopfzeile aus (`istAblaufPfad`).

**Bausteine** (`src/components/werkzeugkiste/`): `werkzeugkiste-seite`, `werkzeug-uebersicht`, `ablauf-rahmen` (Kopf mit ✕ und Rückfrage, Fortschritt, Fuß), `schritt-skript` (Ablagefläche, Hochlade-Fortschritt, Ergebnis mit Kennzahlen, Hinweise bei 0 Lösungen bzw. altem Format, „Auswahl eingrenzen“ nach Seiten bzw. Word-Abschnitten), `schritt-einstellungen` (Werkzeug, Format-Karten, Niveau-Schalter, „Mehr Optionen“), `schritt-prompt` (`KopierKnopf` mit Rückfall auf markierten Text), `schritt-antwort` (eine Prüf-Box: grün / orange mit Befunden und Nachbesserungs-Prompt / rot bei unlesbarer Antwort), `schritt-fertig` (Download, Vorschau im abgeschotteten `iframe sandbox=""`, zwei Weiter-Vorschläge), `ablauf-neu`, `ablauf-seite`. Alles aus shadcn-Bausteinen, keine neuen Pakete.

**Feste Werkzeugliste und Hilfsfunktionen:** `src/lib/werkzeugkiste.ts` (zwölf Werkzeuge, vier Gruppen, nur `skript` aktiv; Datei-Prüfung; Schritt-Regeln; Typen des Ablaufs).

**Schnittstelle, die `/backend` bauen muss** (`src/lib/werkzeugkiste-api.ts`, alle unter `/api/admin/werkzeugkiste`):

| Aufruf | Zweck | Antwort |
|---|---|---|
| `GET /optionen` | Auswahllisten aus dem Kern | `{ niveaus, bildungsgaenge, lernfelder: {bildungsgang: [...]}, umfaenge }` mit je `{key, label}` |
| `POST /ablaeufe` `{werkzeug, datei:{name, groesse, typ}}` | Ablauf anlegen, Einstellungen aus dem letzten Ablauf vorbelegen | `{ ablauf, upload: {url, method, headers} }` |
| `GET /ablaeufe/:id` | lesen | `{ ablauf }` |
| `PATCH /ablaeufe/:id` `{werkzeug?, einstellungen?, auswahl?, schritt?}` | speichern; `schritt` nur erhöhen | `{ ablauf }` |
| `DELETE /ablaeufe/:id` | abbrechen samt Dateien | `{ ok: true }` |
| `POST /ablaeufe/:id/einlesen` | Kern liest ein → `kennzahlen`, `gliederung` | `{ ablauf }` |
| `POST /ablaeufe/:id/prompt` | Kern baut Prompt aus Einstellungen + Auswahl | `{ ablauf }` |
| `POST /ablaeufe/:id/pruefen` `{antwort}` | Prüfstelle; speichert Antwort und `pruefung` | `{ ablauf }` |
| `POST /ablaeufe/:id/bauen` | Datei bauen → `ergebnis`, `schritt: 5` | `{ ablauf }` |
| `GET /ablaeufe/:id/download` | Weiterleitung auf kurzlebigen Download-Link | 302 |
| `GET /ablaeufe/:id/vorschau` | Vorschau-HTML (eigene CSP, ohne Skripte) | `text/html` |

Fehler kommen als `{ error, hint? }` mit verständlichem Text. Das Format des Ablaufs steht als Typ `Ablauf` in `src/lib/werkzeugkiste.ts`.

**Navigation & Rechte:** Werkzeugkiste-Eintrag in Seitenleiste, Schnellsuche und Startseite zeigt auf `/admin/werkzeugkiste` statt auf Hugging Face (`WERKZEUGKISTE_URL` entfernt). `/admin/werkzeugkiste` und `/api/admin/werkzeugkiste` stehen in den Lehrkraft-Freigaben (`roles.ts`).

**Tests:** `src/lib/werkzeugkiste.test.ts` (13), `src/components/werkzeugkiste/werkzeugkiste.test.tsx` (5), angepasste Navigations- und Rollen-Tests. Gesamtsuite 1598 grün, Build und Lint sauber.

**Noch offen bis `/backend`:** Ohne die Schnittstelle lässt sich der Ablauf nicht durchklicken. Die Startseite funktioniert schon. „Zuletzt gewählte Werte“ belegt der Server beim Anlegen vor.

## Backend-Umsetzung (2026-10-28)

**Datenbank** (`supabase/migrations/20261028_proj51_werkzeug_ablaeufe.sql`, angewendet nach Freigabe des Nutzers):
- Tabelle `werkzeug_ablaeufe` wie im Tech Design. RLS für SELECT, INSERT, UPDATE und DELETE: nur `owner_id = auth.uid()` **und** `has_teacher_role()`. Auch der Super-Admin sieht keine fremden Abläufe. Indizes auf `(owner_id, updated_at)` und `laeuft_ab_am`.
- Privater Speicherbereich `werkzeugkiste` (50 MB je Datei) **ohne** Policies für angemeldete Nutzer. Zugriff nur über den Service-Schlüssel des Servers und über kurzlebige Adressen (120 s). Pfade: `<owner>/<ablauf>/skript.<ext> | einlesung.zip | ausgabe | vorschau.html`.
- Supabase-Sicherheitsprüfung danach ohne Befund für die neue Tabelle.

**API-Routen** (`src/app/api/admin/werkzeugkiste/…`, gemeinsame Logik in `src/lib/werkzeugkiste-server.ts`): genau die Liste aus der Frontend-Umsetzung. Alle prüfen `requireTeacherOrAdmin`, lesen den Ablauf über RLS, validieren mit Zod und geben verständliche Fehler (`{error, hint}`) zurück. Ergänzungen:
- `POST /ablaeufe` belegt Niveau, Bildungsgang und Format aus dem letzten eigenen Ablauf vor und bremst ab 50 offenen Abläufen (429).
- `PATCH` erhöht `schritt` nur, wenn der Ablauf so weit vorbereitet ist (`schrittErlaubt`). Unbekannte Felder werden abgelehnt.
- `POST …/einlesen` setzt alles zurück, was auf einer früheren Einlesung aufbaute.
- `POST …/prompt` gibt zusätzlich `hinweis` zurück (z. B. unlesbare Seitenangabe, sehr langes Skript). Die Oberfläche zeigt ihn in Schritt 3.
- `GET …/download` hängt den Dateinamen einfach kodiert an. Mit der Option von supabase-js würden Umlaute doppelt kodiert.
- `GET …/vorschau` liefert HTML mit `Content-Security-Policy: default-src 'none'; …; sandbox`. Die Oberfläche lädt es und zeigt es per `iframe srcdoc sandbox=""` an, weil die App `X-Frame-Options: DENY` setzt.
- Kern-Routen haben `maxDuration` 60–120 s.

**Tägliches Aufräumen:** `GET /api/cron/werkzeugkiste-aufraeumen` (Vercel Cron 03:30 UTC, `vercel.json`) löscht Abläufe mit `laeuft_ab_am < jetzt` samt Dateien, höchstens 200 je Lauf, und prüft `CRON_SECRET`. Die Middleware lässt dafür `/api/cron/` ohne Anmeldung durch. Der Nutzer hat diese Änderung am Anmeldeablauf freigegeben.

**Kern** (Repository `Werkzeugkiste`, Zweig `vercel-kern`, https://werkzeugkiste-kern.vercel.app): `kern.py` (Einlesen, Prompt, Prüfstelle, Bau, Vorschau mit denselben Aufrufen wie `h5p_server.py`) und `app.py` (Flask: `/api/optionen|einlesen|prompt|pruefen|bauen`, Kennwort `KERN_SECRET`, Dateien nur über die mitgeschickten Adressen). Einlesung = ZIP aus `text.txt` und Bildern. Alle Kern-Bibliotheken sind fest versioniert. Vercel nutzt Python 3.12 (3.11 wie auf Hugging Face bietet Vercel nicht an), die Tests laufen trotzdem identisch.

**Umgebungsvariablen** (Production + Preview in `spedilern`, lokal in `.env.local`, dokumentiert in `.env.local.example`): `WERKZEUGKISTE_KERN_URL`, `WERKZEUGKISTE_KERN_SECRET`, `CRON_SECRET`.

**Tests**
- App: `src/lib/werkzeugkiste-server.test.ts` (9), `src/app/api/admin/werkzeugkiste/werkzeugkiste.test.ts` (18: Rollen, Validierung, 404 fremd, Schritt-Regeln, Löschen samt Dateien, alle Kern-Schritte, Download, CSP der Vorschau, Cron-Schutz und -Löschung), Proxy-Test für `/api/cron/`. Gesamtsuite 1626 grün, Build und Lint sauber.
- Kern: `kern_test.py` (12) — **Prompt zeichengenau gleich** (Standard, mit Lernfeld/Umfang/Seite, mit Seiten- und Word-Abschnittsauswahl), **Prüfung gleich**, **H5P-Inhalt gleich** (ohne Zufalls-IDs), Seite baut, unlesbare Antwort sperrt.
- Durchlauf gegen echten Speicher und echten Kern (Heft 2, PDF): Hochladen → Einlesen 11 s (233 Lösungen) → Prompt → Prüfen (17 Hinweise) → Bauen (9 Kapitel, 65 Aufgaben) → Datei und Vorschau abrufbar. Testdateien danach gelöscht.

**Bekannte Grenzen**
- Die Warnungs- und Aufgabenzähler des H5P- bzw. Seitenbaus sind Modul-Variablen. Bei gleichzeitigen Aufrufen im selben Kern-Prozess kann die angezeigte Zahl ungenau sein. Die Datei betrifft das nicht.
- Kennzahl „Seiten“ bei Word kommt aus den Dokument-Eigenschaften (`docProps/app.xml`). Fehlen sie, wird sie aus der Textlänge geschätzt.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
