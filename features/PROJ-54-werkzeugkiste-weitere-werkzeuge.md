# PROJ-54: Werkzeugkiste – die übrigen 11 Werkzeuge

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Teil des Werkzeugkiste-Umzugs (Übersicht in PROJ-51). PROJ-51 baut den Rahmen und den Ablauf am Beispiel „Ganzes Skript“. Dieses Feature schaltet die übrigen 11 Werkzeuge frei. Alle nutzen denselben Fünf-Schritte-Ablauf. Unterschiede gibt es nur bei den werkzeugeigenen Einstellungen (Schritt 2), dem Ergebnis (Schritt 5) und bei zwei Sonderfällen: Video-Fragen (kein Skript, sondern Transkript) und Podcast (Vertonung).

### Entscheidungen (Nutzer, 2026-10-27)
- **E1 – Alle 13 Werkzeuge ziehen um**, keines fällt weg (12 in diesem und PROJ-51, Schulrecht in PROJ-55).
- **E2 – Gleiches Muster:** Kein Werkzeug bekommt einen eigenen Sonder-Ablauf. Abweichungen stecken in Schritt 2 (Optionen) und Schritt 5 (Ergebnis).
- **E3 – Übersicht:** Pro Werkzeug sind in Schritt 2 höchstens **drei** Einstellungen direkt sichtbar. Alles Weitere steht unter „Mehr Optionen“.

## Dependencies
- Requires: PROJ-51 (Rahmen, Ablauf, Hintergrund-Dienst)
- Requires: PROJ-52 (Meine Materialien): alle Werkzeuge speichern dort
- Empfohlen vorher: PROJ-53 (Regal), damit „Teilen“ in Schritt 5 für alle Werkzeuge gleich da ist

## User Stories
- Als **Lehrkraft** möchte ich jedes Werkzeug der alten Werkzeugkiste in der App wiederfinden, damit ich nichts vermisse.
- Als **Lehrkraft** möchte ich bei jedem Werkzeug nur die Einstellungen sehen, die dafür wirklich wichtig sind.
- Als **Lehrkraft** möchte ich zu einem YouTube-Video Fragen erstellen, ohne eine Datei hochzuladen.
- Als **Lehrkraft** möchte ich einen Podcast vertonen lassen und vorher die Stimmen probehören.
- Als **Lehrkraft** möchte ich für eine Klassenarbeit Dauer, Notenschlüssel und Hilfsmittel festlegen.
- Als **Lehrkraft** möchte ich bei mehrteiligen Ergebnissen (ZIP mit Blatt und Lösung, MP3 je Kapitel) genau wissen, was ich herunterlade.

## Acceptance Criteria

### Allgemein (gilt für alle 11 Werkzeuge)
- [ ] Alle 11 Karten auf der Startseite sind aktiv. Der Hinweis „kommt bald“ entfällt.
- [ ] Jedes Werkzeug durchläuft die fünf Schritte aus PROJ-51 mit Fortschrittsanzeige, Prüfstelle, Vorschau, automatischem Speichern und „Gleiches Skript, anderes Werkzeug“.
- [ ] **Prompts sind zeichengenau dieselben** wie in der heutigen Werkzeugkiste bei gleichen Einstellungen.
- [ ] **Erzeugte Dateien sind inhaltsgleich** mit der heutigen Werkzeugkiste bei gleicher KI-Antwort.
- [ ] Die Auswahlmöglichkeiten jeder Einstellung entsprechen der heutigen Werkzeugkiste. Es kommen keine neuen hinzu, und keine fallen weg.
- [ ] Jedes Werkzeug hat auf der Startseite und in Schritt 2 **eine** Zeile Erklärung. Die bisherigen „Tipps je Werkzeug“ stehen als aufklappbares „Tipps“ in Schritt 2, standardmäßig zu.
- [ ] Schritt 5 nennt bei ZIP-Ergebnissen kurz, was darin steckt (z. B. „Arbeitsblatt · Lösungsblatt“).

### Werkzeuge und ihre Einstellungen
Direkt sichtbar ist die Spalte „Schritt 2 direkt“, alles Weitere steht unter „Mehr Optionen“. Niveau, Bildungsgang und Lernfeld gelten wie in PROJ-51 für alle Werkzeuge, bei denen sie heute wirken.

| Werkzeug | Gruppe | Eingabe | Schritt 2 direkt | Mehr Optionen | Ergebnis |
|---|---|---|---|---|---|
| Kreative Einheit | Selbstlernen | Skript | Format (H5P / Seite), Niveau | Bildungsgang, Lernfeld, Umfang | `.h5p` oder `.html` |
| Differenzierung | Selbstlernen | Skript | Art (Lernniveau / CEFR), Stufen, Format | Bildungsgang, Lernfeld | Word, `.h5p` oder `.html` |
| Kahoot-Quiz | Üben | Skript | Anzahl Fragen, Niveau | Zeitlimit je Frage, Bildungsgang | `.xlsx` für Kahoot |
| Moodle-Fragen | Üben | Skript | Anzahl Fragen, Fragetypen, Niveau | Kategorie, Bildungsgang, Lernfeld | GIFT-Textdatei |
| LearningApps | Üben | Skript | Vorlagen, Niveau | Bildungsgang | Text zum Kopieren |
| Video-Fragen | Üben | **Video-Link + Transkript** | Format (Word / H5P), Niveau | Videolänge, Fragetypen, Anzahl, Bildungsgang | Word oder `.h5p` |
| Arbeitsblatt | Unterricht & Prüfung | Skript | Format (ZIP / Seite), Niveau | Umfang, Bildungsgang, Lernfeld | ZIP (Blatt + Lösung) oder `.html` |
| Lernsituation | Unterricht & Prüfung | Skript | Format (ZIP / Seite), Sozialform | Dauer, Niveau, Bildungsgang, Lernfeld | ZIP (Material + Handreichung) oder `.html` |
| Klassenarbeit | Unterricht & Prüfung | Skript | Dauer, Format (ZIP / H5P), Niveau | Notenschlüssel, Notengrenzen, MC-Anteil, Hilfsmittel | ZIP oder `.h5p` |
| Podcast | Zum Hören | Skript | Stimme Lehrkraft, Stimme Azubi | Umfang, Niveau, Bildungsgang | ZIP (MP3 je Kapitel) |
| Lernlied | Zum Hören | Skript | Musikrichtung, Umfang (je Kapitel / ganzes Skript / nur Refrains) | Niveau, Bildungsgang | ZIP (Word + Musik-KI-Prompt) |

### Sonderfall Video-Fragen
- [ ] Schritt 1 heißt bei diesem Werkzeug **„Video“** statt „Skript“: ein Feld für den YouTube-Link (optional) und ein großes Feld für das Transkript.
- [ ] Darunter steht eine kurze Anleitung, wie man das Transkript in YouTube kopiert („…“ → „Transkript anzeigen“ → markieren und kopieren).
- [ ] Ein Transkript unter 100 Zeichen wird abgelehnt (wie bisher).
- [ ] „Gleiches Skript, anderes Werkzeug“ ist bei Video-Fragen nicht verfügbar. Umgekehrt steht Video-Fragen dort nicht zur Auswahl, wenn ein Skript eingelesen ist.

### Sonderfall Podcast
- [ ] Neben jeder Stimmenauswahl gibt es einen **Probehören**-Knopf (▶, `aria-label`), der einen kurzen Beispielsatz abspielt (wie bisher).
- [ ] Zur Wahl stehen die bisherigen Stimmen: Florian (deutsch) sowie Andrew, Ava und Emma (mehrsprachig, mit leichtem Akzent). Der Hinweis zum Akzent steht direkt an der Auswahl.
- [ ] Die Vertonung läuft **Kapitel für Kapitel**. Schritt 5 zeigt währenddessen einen Fortschritt („Kapitel 3 von 7 wird vertont …“).
- [ ] Scheitert ein einzelnes Kapitel (Sprachdienst nicht erreichbar), werden die fertigen Kapitel behalten. Es erscheinen „Kapitel 4 erneut versuchen“ und der bisherige verständliche Hinweis, kein technischer Text.
- [ ] Erst wenn alle Kapitel fertig sind, steht das ZIP zum Download bereit und wird gespeichert.
- [ ] Verlässt die Lehrkraft während der Vertonung die Seite, kann sie über „Meine Materialien“ dort weitermachen, wo es aufgehört hat.

### Sonderfall Lernlied
- [ ] Schritt 5 erklärt in einem Satz, dass im ZIP ein fertiger Prompt für eine Musik-KI liegt (z. B. suno.com) und dass das Karaoke-Blatt auch ohne Musik funktioniert.

### Sonderfall LearningApps
- [ ] Das Ergebnis ist Text zum Kopieren. Schritt 5 zeigt ihn deshalb pro Vorlage mit eigenem **„Kopieren“**-Knopf statt eines Downloads. Er wird trotzdem in „Meine Materialien“ gespeichert.

### Überarbeiten-Funktionen
- [ ] „Tippfehler ohne KI korrigieren“ und „einzelnes Kapitel neu anfragen“ stehen bei allen Werkzeugen zur Verfügung, bei denen es sie heute gibt.

## Edge Cases
- **Lehrkraft wechselt in Schritt 2 auf ein Werkzeug mit anderer Eingabe** (Skript → Video-Fragen): Der Ablauf springt zu Schritt 1 mit Hinweis „Für Video-Fragen brauchst du ein Transkript statt eines Skripts.“
- **KI-Antwort passt nicht zum Werkzeug** (z. B. Kahoot-Antwort im Arbeitsblatt-Ablauf): Die Prüfstelle meldet „Die Antwort passt nicht zum gewählten Werkzeug“ und „Material erstellen“ ist gesperrt.
- **Kahoot-Fragen zu lang** (Kahoot-Zeichenlimit): Wie bisher meldet die Prüfstelle sie und kürzt sie automatisch, wo das eindeutig ist.
- **Klassenarbeit ohne Erwartungshorizont:** Wie bisher ein Befund, die Datei wird trotzdem gebaut.
- **Sehr langes Skript beim Podcast** (z. B. 15 Kapitel): Jedes Kapitel wird einzeln vertont, deshalb gibt es kein Zeitlimit für den ganzen Podcast. Ergebnis-ZIPs über 4,5 MB funktionieren.
- **Probehören, wenn der Sprachdienst nicht erreichbar ist:** Ruhiger Hinweis an der Stimme, die Auswahl bleibt möglich.
- **Format „Seite“ bei einem Werkzeug, das es nicht hat:** Die Option wird gar nicht angezeigt (nur Werkzeuge mit Seiten-Ausgabe zeigen sie).

## Technical Requirements
- **Gleichwertigkeit:** Für jedes Werkzeug gibt es mindestens einen automatischen Vergleichstest: gleiches Skript plus gleiche Einstellungen ergeben denselben Prompt, gleiche Antwort ergibt dieselbe Datei wie in der alten Werkzeugkiste. `werkzeugtest.py` läuft grün.
- **Podcast:** Jeder einzelne Vertonungsaufruf bleibt sicher unter dem Zeitlimit des Hostings.
- **Kosten:** Keine laufenden Kosten (edge-tts ist kostenlos, KI läuft manuell).

## Abgrenzung (nicht Teil dieses Features)
- Neue Werkzeuge oder neue Optionen (erst nach dem Umzug)
- Schulrecht (PROJ-55)
- Abschalten der alten Werkzeugkiste (PROJ-56)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
