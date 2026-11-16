# PROJ-110: Baukasten – Quiz-Show-Block im Kahoot-Stil (spielbar, offline)

## Status: Planned
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Ein neuer Aufgaben-Block spielt Fragen wie eine Quiz-Show ab: große farbige Antwortfelder, Countdown, Punkte für Tempo, Serien und Endstand. Er läuft direkt in der Seite und offline, und Fragen aus dem Kahoot- oder Moodle-Werkzeug lassen sich übernehmen.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- Wunsch des Nutzers (2026-11-16): „ein Kahoot oder irgendetwas anderes einbauen“. Ein echtes Kahoot lässt sich nur verlinken (PROJ-109). Dieser Block bringt das Spielgefühl **in** die Seite, ohne Fremdanbieter, Internet und Datenschutz-Frage.
- Das Kahoot-Werkzeug (PROJ-54) erzeugt Fragen mit 2–4 Antworten und Zeitlimit als Excel. Das Moodle-Werkzeug liefert GIFT-Text. Beides sind Fragen, die dieser Block abspielen kann.
- Es gibt im Kern schon `question_set`, `single_choice_set`, `schaetzrunde` und `trainer`. Keiner hat Zeitdruck und Show-Charakter.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Andere Werkzeuge als spielbarer Block in der Seite, offline und ohne Datenschutz-Thema.

## Vorschläge (bitte beim Review bestätigen)
- **V1 – Einzelspieler:** Jeder Schüler spielt für sich (die Seite ist eine Datei ohne Server). Kein Live-Mehrspieler, keine Rangliste über Geräte hinweg.
- **V2 – Punkte:** Richtig = 500 bis 1000 Punkte je nach Tempo, Serie ab 3 richtigen gibt Bonus. Bestwert wird im Browser gemerkt („Dein Rekord: 7.400“).
- **V3 – Fragearten:** Einfachauswahl (2–4 Antworten), Wahr/Falsch, Mehrfachauswahl, Schätzfrage (Zahl mit Toleranz). Bilder in der Frage optional.
- **V4 – Beamer-Modus:** Ein Knopf „Im Vollbild für die Klasse“ zeigt Frage und Antworten groß. Die Klasse antwortet gemeinsam, die Lehrkraft klickt. Kein Handy der Schüler nötig.

## Dependencies
- Requires: PROJ-101 (Block-Leiste), PROJ-90 (Katalog, Formular-Muster)
- Berührt: Kern (`seite.py`: neuer Baustein mit Laufzeit, Prüfstelle, Fortschritt), PROJ-54 (Kahoot-/Moodle-Ergebnis als Fragenquelle), PROJ-93 (erweitert: Quiz-Show per kopiertem Prompt füllen), PROJ-109 (Abgrenzung)

## User Stories
- Als **Lehrkraft** möchte ich am Ende eines Themas eine schnelle Quiz-Runde mit Zeitdruck einbauen, damit die Wiederholung Spaß macht.
- Als **Lehrkraft** möchte ich die Fragen meines Kahoot-Materials übernehmen, statt sie abzutippen.
- Als **Lehrkraft** möchte ich die Runde im Unterricht am Beamer mit der ganzen Klasse spielen.
- Als **Schüler** möchte ich Punkte für schnelle richtige Antworten bekommen und meinen Rekord schlagen.
- Als **Schüler mit Nachteilsausgleich oder Bildschirmleser** möchte ich ohne Zeitdruck spielen können.

## Acceptance Criteria

### Anlegen und Bearbeiten
- [ ] Der Katalog hat „Quiz-Show“. Das Formular in der Schublade zeigt eine Liste der Fragen mit Fragetext, Antworten (2–4, eine oder mehrere richtig), Zeit je Frage (5/10/20/30/60 s), optionalem Bild und optionaler Erklärung nach der Antwort.
- [ ] Fragen lassen sich umsortieren, duplizieren und löschen. 3 bis 30 Fragen pro Block.
- [ ] „Fragen übernehmen“ bietet: aus einem Kahoot-Material, aus einem Moodle-Material (beide aus „Meine Materialien“), aus einer Kahoot-Excel-Datei (Upload), aus Aufgaben dieses Materials (Einfach-/Mehrfachauswahl, Wahr/Falsch).
- [ ] Übernommene Fragen sind danach normal bearbeitbar. Was nicht passt (Freitext, mehr als 4 Antworten), wird mit Hinweis ausgelassen.
- [ ] Die Prüfstelle meldet: Frage ohne richtige Antwort, doppelte Antworten, Fragetext über 120 oder Antwort über 75 Zeichen (Hinweis, Lesbarkeit unter Zeitdruck), weniger als 3 Fragen.

### Spielen (Schüler)
- [ ] Startbildschirm: Titel, Anzahl Fragen, Knopf „Los geht’s“, Schalter „Ohne Zeitlimit“.
- [ ] Je Frage: Frage oben, darunter 2–4 große, farbige Antwortfelder mit Form-Symbol (nicht nur Farbe), sichtbarer Countdown. Auf dem Handy untereinander, jedes mindestens 56 px hoch.
- [ ] Nach der Antwort oder dem Zeitablauf: richtig/falsch mit kurzer Animation (höchstens 500 ms, entfällt bei „Bewegung reduzieren“), die richtige Antwort, die Erklärung (falls vorhanden), Punkte und Serie.
- [ ] Ende: Gesamtpunkte, Anzahl richtig, Rekord, „Nochmal spielen“ (Fragen und Antworten gemischt), „Nur falsche wiederholen“.
- [ ] Der Block zählt im Fortschritt der Seite als erledigt, wenn er einmal durchgespielt ist. Als richtig gilt der Anteil der richtigen Antworten.
- [ ] Mit „Ohne Zeitlimit“ gibt es keinen Countdown und keine Tempo-Punkte. Der Schalter ist ohne Nachteil für das Erledigt-Zählen.
- [ ] Komplett per Tastatur spielbar (Zifferntasten 1–4 und Pfeile + Enter).

### Beamer-Modus
- [ ] „Für die Klasse (Vollbild)“ zeigt Frage und Antworten groß, mit Countdown, „Lösung zeigen“ und „Weiter“ per Klick oder Leertaste. Es werden keine Punkte gezählt.

### Editor
- [ ] Im Modus Ausprobieren (PROJ-101) ist die Quiz-Show spielbar. Im Modus Bearbeiten zeigt sie die Fragenliste als Übersicht.

## Edge Cases
- **Schüler wechselt mitten im Spiel den Tab:** Der Countdown pausiert (Fairness, kein Prüfungsmodus).
- **Seite neu geladen:** Das Spiel beginnt neu. Der Rekord bleibt (falls der Browser-Speicher erlaubt ist, sonst ohne Rekord).
- **Bild in der Frage fehlt:** Die Frage wird ohne Bild gespielt.
- **Sehr lange Antworten:** Die Schrift wird bis zu einer Mindestgröße kleiner, dann wird umgebrochen, nie abgeschnitten.
- **Kahoot-Excel in fremdem Format:** Klare Meldung „Diese Datei sieht nicht wie eine Kahoot-Vorlage aus.“
- **Druck:** Fragen als nummerierte Liste mit Antworten zum Ankreuzen. Die Lösung druckt nur die Lösungsfassung.

## Nicht Teil dieses Features
- Live-Mehrspieler über mehrere Geräte, Rangliste der Klasse (bräuchte Server und Konten).
- Export zurück zu Kahoot.

## Technical Requirements
- Funktioniert in der heruntergeladenen Datei offline und im öffentlichen Link (Sandbox).
- Barrierefreiheit: Farbe nie alleiniger Träger (Formen und Text). Kontrast der Antwortfelder mindestens 4,5 : 1. Countdown auch als Text für Bildschirmleser („noch 5 Sekunden“, nicht jede Sekunde angesagt).

## Offene Punkte für `/architecture`
- Neuer Baustein im Kern inklusive Laufzeit und Prüfregeln. Aufnahme in den Prompt-Katalog und Spielform-Tabelle (vgl. PROJ-99)?
- Lesen der Fragen aus Kahoot-/Moodle-Materialien: Liegen die strukturierten Fragen noch in `antwort` vor, oder nur die Excel/GIFT-Datei?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
