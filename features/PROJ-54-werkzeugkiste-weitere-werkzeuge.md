# PROJ-54: Werkzeugkiste – die übrigen 11 Werkzeuge

## Status: In Progress
**Created:** 2026-10-27
**Last Updated:** 2026-10-30

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

> Stand 2026-10-29. Baut vollständig auf dem Entwurf von PROJ-51 auf (Lern-App · Werkzeugkiste-Kern · Supabase-Speicher). Hier steht nur, was für die 11 Werkzeuge **neu oder anders** ist.

### Entscheidungen (Nutzer, 2026-10-29)
- **E4 – Reihenfolge:** PROJ-54 wird **vor** PROJ-52 gebaut. Ergebnisse verfallen vorerst wie bei PROJ-51 nach 7 Tagen. Das dauerhafte Speichern kommt mit PROJ-52 nach, ohne dass die Werkzeuge umgebaut werden müssen. Die Spec-Punkte „speichert in Meine Materialien“ gelten deshalb erst nach PROJ-52.
- **E5 – Pakete:** Das Feature wird in fünf Pakete geschnitten, die **einzeln live gehen**.
- **E6 – Direkt erstellen (PROJ-64) bleibt draußen:** Es ist ausgeblendet. Die neuen Werkzeuge bekommen nur den kostenlosen Weg (Prompt kopieren). Sobald PROJ-64 überarbeitet ist, wird es als eigener Schritt für alle Werkzeuge entschieden.

### Das Bild im Großen
Es entsteht **kein neuer Baustein**. Die Lern-App zeigt weiter die fünf Schritte, der Kern baut weiter Prompt, Prüfung und Datei, der Speicher hält die Dateien. Neu ist nur:

1. **Die Werkzeugliste lernt Einstellungen.** Heute kennt sie pro Werkzeug nur Name, Gruppe, Icon und Formate. Jedes Werkzeug beschreibt künftig zusätzlich in der Liste, **welche Einstellungen es hat** (Name, Art der Auswahl, Auswahlmöglichkeiten, ob „direkt sichtbar“ oder unter „Mehr Optionen“, Standardwert). Schritt 2 zeichnet sich daraus **selbst**. So bekommt kein Werkzeug eine eigene Seite (E2), und die Regel „höchstens drei Einstellungen direkt sichtbar“ (E3) steht an einer Stelle.
2. **Der Kern schaltet die Werkzeuge frei** und kennt die werkzeugeigenen Einstellungen. Die Auswahlmöglichkeiten kommen weiter vom Kern (wie bei Niveau und Bildungsgang), damit sie mit der alten Werkzeugkiste identisch bleiben.
3. **Ergebnisse gibt es in mehr Arten.** Heute kennt Schritt 5 nur eine Datei (H5P oder Seite). Neu: Word, ZIP, Excel, GIFT-Textdatei, Text zum Kopieren und das Podcast-ZIP.

### Komponentenstruktur (nur was sich ändert)
```
Startseite Werkzeugkiste
+-- Werkzeug-Karten: 11 weitere aktiv (kein „kommt bald“)

Ablauf (bestehender Rahmen, fünf Schritte)
+-- 1 Skript        -> bei Video-Fragen: „Video“ (Link + Transkript-Feld + Kurzanleitung)
+-- 2 Einstellungen -> wird aus der Werkzeugbeschreibung gezeichnet
|     +-- bis zu 3 Einstellungen direkt (Schalter, Auswahl, Zahl)
|     +-- „Mehr Optionen“ (zu)
|     +-- „Tipps“ (zu) – die bisherigen Tipps je Werkzeug
|     +-- Podcast: Stimmenauswahl mit Probehören-Knopf je Stimme
+-- 3 Prompt        -> unverändert
+-- 4 Antwort       -> unverändert; Prüfstelle kennt jetzt 11 weitere Werkzeuge
+-- 5 Fertig        -> je nach Ergebnisart:
      +-- Datei (H5P · Seite · Word · Excel · GIFT): Herunterladen, Vorschau wo es sie gibt
      +-- ZIP: Herunterladen + Zeile „Darin: Arbeitsblatt · Lösungsblatt“
      +-- Text (LearningApps): je Vorlage ein „Kopieren“-Knopf
      +-- Podcast: Fortschritt „Kapitel 3 von 7 wird vertont …“, „Kapitel 4 erneut versuchen“
      +-- Lernlied: Satz zum Musik-KI-Prompt im ZIP
```
Alles baut auf vorhandenen shadcn-Komponenten (ToggleGroup, Select, Collapsible, Progress, Button) auf. Neu ist höchstens eine kleine **Stimmenwahl mit Probehören** und das **Video-Eingabefeld**; beide werden aus vorhandenen Bausteinen gebaut, kein Zusatzpaket.

### Datenmodell (in Worten)
Es ändert sich **keine Tabelle grundlegend**; die vorhandene Ablauf-Tabelle trägt alles:
- **Einstellungen** sind schon frei erweiterbar. Neue Felder (Anzahl Fragen, Fragetypen, Dauer, Notenschlüssel, Stimmen, Musikrichtung …) kommen einfach dazu. Beim Werkzeugwechsel werden nur die Werte behalten, die das neue Werkzeug auch hat.
- **Eingabe bei Video-Fragen:** Statt einer hochgeladenen Datei speichert der Ablauf Link und Transkript. Das Transkript liegt wie ein Skript im privaten Speicher (nicht in der Tabelle), damit lange Texte nichts bremsen.
- **Ergebnis** bekommt eine **Liste von Dateien** statt genau einer (z. B. Arbeitsblatt + Lösung, MP3 je Kapitel). Zu jeder Datei: Name, Art, Größe. Für LearningApps steht zusätzlich der Text je Vorlage im Ergebnis, weil er kopiert werden soll.
- **Podcast-Fortschritt:** Der Ablauf merkt sich, welche Kapitel schon vertont sind und wo die fertigen MP3 liegen. Dadurch gilt: Seite neu laden oder verlassen verliert nichts, und „erneut versuchen“ macht beim fehlgeschlagenen Kapitel weiter. Erst wenn alle Kapitel da sind, wird das ZIP gebaut und der Ablauf „fertig“.
- **Speicherplatz:** Podcast-MP3 und große ZIPs liegen im selben privaten Bereich. Das Aufräumen nach 7 Tagen erfasst sie mit (derselbe Zeitplan, keine neue Regel).

### Besonderheiten je Werkzeug
| Werkzeug(e) | Was anders ist | Bemerkung |
|---|---|---|
| Kreative Einheit, Differenzierung, Arbeitsblatt, Lernsituation | Nutzen dieselben Bauer wie „Ganzes Skript“ (Kapitel-Struktur → H5P / Seite / Word) | Einfachste Gruppe; Differenzierung und Arbeitsblatt/Lernsituation liefern zusätzlich Word bzw. ZIP |
| Kahoot, Moodle, LearningApps | Eigene Prompts und eigene, einfache Ausgaben (Excel, GIFT-Text, Text) | Kein Seiten-/H5P-Bau; LearningApps hat keinen Download |
| Klassenarbeit, Lernlied | Mehrteiliges Ergebnis (ZIP); Klassenarbeit hat viele Einstellungen | Hier greift am stärksten die Regel „3 direkt, Rest unter Mehr Optionen“ |
| Video-Fragen | Eingabe ist ein Transkript, kein Skript; Mindestlänge 100 Zeichen; **kein** „Gleiches Skript, anderes Werkzeug“ | Wechsel von/zu Video-Fragen springt zu Schritt 1 mit Hinweis |
| Podcast | Vertonung Kapitel für Kapitel, Stimmen-Probehören, Wiederaufnahme | **Eigener Ablauf in Schritt 5** (siehe unten) |

### Sonderfall Podcast – wie es sicher läuft
- **Ein Aufruf = ein Kapitel.** Der Browser stößt ein Kapitel nach dem anderen an (wie bei PROJ-64 Teil für Teil). Jeder Aufruf bleibt weit unter dem Zeitlimit; ein Gesamtlimit für den Podcast gibt es nicht. Das ZIP wird erst zum Schluss aus den bereits gespeicherten MP3 zusammengesetzt, deshalb gilt die 4,5-MB-Grenze nicht.
- **Scheitert ein Kapitel,** bleiben alle fertigen erhalten; die Lehrkraft sieht „Kapitel 4 erneut versuchen“ mit dem verständlichen Satz zum Sprachdienst.
- **Probehören** ist ein eigener kleiner Aufruf mit festem Beispielsatz je Stimme. Ist der Sprachdienst nicht erreichbar, erscheint ein ruhiger Hinweis an der Stimme; die Auswahl bleibt möglich.
- **Bekanntes Risiko:** Der Test `werkzeugtest.py` zeigt, dass der Sprachdienst (Microsoft) die eingesetzte `edge-tts`-Version zurzeit **mit „403“ abweist**. Das betrifft vermutlich schon die alte Werkzeugkiste. Deshalb steht der Podcast **ganz hinten (Paket E)**, und als allererstes wird geprüft, ob eine neuere `edge-tts`-Version wieder funktioniert. Funktioniert keine, wird der Podcast zurückgestellt und die übrigen Pakete sind davon nicht betroffen (Entscheidung dann mit dir).

### Pakete (jedes einzeln live)
| Paket | Inhalt | Schwierigkeit | Empfohlenes Modell |
|---|---|---|---|
| **A** | Arbeitsblatt, Lernsituation, Kreative Einheit, Differenzierung (+ Gerüst: Einstellungs-Beschreibung, Ergebnis als Dateiliste, Zip-Hinweis) | Mittel (Gerüst ist neu) | Sonnet |
| **B** | Kahoot-Quiz, Moodle-Fragen, LearningApps (Text zum Kopieren) | Einfach | Haiku/Sonnet |
| **C** | Klassenarbeit, Lernlied | Mittel (viele Einstellungen, ZIP) | Sonnet |
| **D** | Video-Fragen (Eingabe Transkript, Wechselregel) | Mittel | Sonnet |
| **E** | Podcast (Stimmen, Kapitel-Vertonung, Wiederaufnahme) | Hoch (externer Dienst) | Sonnet; Opus nur bei festgefahrenem Fehler |

Paket A enthält das gemeinsame Gerüst und ist deshalb das größte; danach sind B bis E schlank, weil sie nur noch Werkzeugbeschreibungen und Kern-Anbindungen ergänzen.

### Tech-Entscheidungen (warum so)
| Entscheidung | Warum |
|---|---|
| Einstellungen als Beschreibung in der Werkzeugliste, Schritt 2 zeichnet sich selbst | Sonst bräuchte jedes der 11 Werkzeuge eine eigene Seite. So bleibt der Ablauf gleich (E2), und „höchstens 3 direkt“ (E3) ist eine einzige Regel. |
| Kern liefert Auswahlmöglichkeiten | Nur so bleiben sie mit der alten Werkzeugkiste identisch. Neue Optionen gibt es nicht. |
| Prompts und Dateien kommen aus demselben Python-Code wie bisher | Gleichwertigkeit („zeichengenau“, „inhaltsgleich“) ist dadurch eingebaut, statt nachgebaut. |
| Pro Werkzeug mindestens ein Vergleichstest (Prompt gleich, Datei gleich) | Das verlangt die Spec. Tests laufen im Kern (`kern_test`) und für die Oberfläche in der App. |
| Podcast kapitelweise, mit gespeichertem Zwischenstand | Hält jeden Aufruf kurz, übersteht Seiten-Neuladen und erlaubt „erneut versuchen“ nur für das fehlgeschlagene Kapitel. |
| Kein „Direkt erstellen“ für neue Werkzeuge | PROJ-64 ist ausgeblendet; beide Features sollen sich nicht gegenseitig blockieren. |
| Pakete statt Alles-auf-einmal | Jedes Paket ist einzeln prüf- und deploybar; ein Problem beim Podcast hält die anderen nicht auf. |

### Sicherheit (Ergänzungen zu PROJ-51)
- Video-Fragen: Link und Transkript sind Nutzereingaben. Sie werden nie ausgeführt, nur als Text an den Prompt gehängt; der Link wird nur angezeigt/geprüft, nicht abgerufen.
- Ergebnis-Texte (LearningApps) und Vorschauen werden wie bisher abgeschottet angezeigt; „Kopieren“ arbeitet nur mit Text.
- Probehören ruft den Sprachdienst nur mit festem Beispielsatz und einer Stimme aus der Liste auf, nie mit freiem Text.
- Alle neuen Aufrufe prüfen wie bisher zuerst die Lehrer-Rolle und liefern nur eigene Abläufe.

### Abhängigkeiten
- **Lern-App:** keine neuen Pakete.
- **Kern:** `edge-tts` (Paket E; Version erst prüfen, danach fest einpinnen). `onnxruntime`/`tokenizers` bleiben draußen (erst PROJ-55).
- **Einrichtung:** keine neuen Umgebungsvariablen, kein neuer Dienst.

### Offene Punkte für /frontend und /backend
- Genaue Liste der Einstellungen je Werkzeug und ihre Auswahlwerte aus `h5p_server.py`/`prompts.py` übernehmen (E3: höchstens drei direkt).
- Die bisherigen „Tipps je Werkzeug“ (alte Werkzeugkiste, `/tipps`) in die neue Beschreibung übernehmen.
- Welche Werkzeuge einen Vorschau-Dialog haben (Kahoot/GIFT/Podcast vermutlich nicht): im Paket klären.

## Frontend-Umsetzung Paket A (2026-10-29)

**Gerüst (gilt für alle späteren Pakete)** – `src/lib/werkzeugkiste.ts`
- Jedes Werkzeug hat jetzt `felder` (Einstellungen mit Art `schalter | wahl | zahl | mehrfach`, Ort `direkt | mehr`, Standard, feste Optionen oder Quelle `niveaus | bildungsgaenge | lernfelder | umfaenge` vom Kern), dazu optional `tipps`.
- Hilfsfunktionen `feldOptionen`, `feldStandards`, `feldSetzen` (Bildungsgang → Lernfeld leer; Art → Stufen auf Standard), `feldIds`. `einstellungenFuerWerkzeug` übernimmt gemeinsame Felder und verwirft fremde.
- `AblaufEinstellungen` ist offen für werkzeugeigene Schlüssel (`dauer`, `anzahl`, `sozialform`, `art`, `stufen`).
- `AblaufErgebnis` hat optional `enthaelt` (Inhalt eines ZIP) und `hatVorschau`.
- `schritt-einstellungen.tsx` zeichnet Schritt 2 aus den Feldern (Format-Karten, Knopfleiste, Auswahl, Zahlenfeld mit Bereichskorrektur, Häkchen mit Höchstzahl), „Mehr Optionen“ nur wenn nötig, „Tipps“ aufklappbar wenn vorhanden. `schritt-fertig.tsx` zeigt „Darin: …“ und blendet die Vorschau aus, wenn es keine gibt.
- Server: `einstellungenSchema` nimmt werkzeugeigene Felder an (`catchall`), `standardEinstellungen`/`einstellungenFuerWechsel` kennen sie und verwerfen fremde.

**Werkzeuge in Paket A** (Felder nach dem tatsächlichen Verhalten der alten Werkzeugkiste)
| Werkzeug | Formate | Direkt | Mehr Optionen |
|---|---|---|---|
| Kreative Einheit | H5P · Seite | Niveau | Bildungsgang, Lernfeld, Umfang, Sozialform |
| Differenzierung | Word · H5P · Seite | Art, Stufen (max. 4) | – |
| Arbeitsblatt | Word-ZIP · Seite | Niveau, Anzahl Aufgaben | Bearbeitungszeit, Bildungsgang, Lernfeld |
| Lernsituation | Word-ZIP · Seite | Sozialform, Niveau | Bearbeitungszeit, Bildungsgang, Lernfeld |

**Abweichungen von der Tabelle in dieser Spec** (so wirkt es in `prompts.py`/`oberflaeche.py` heute)
- Differenzierung: Niveau, Bildungsgang und Lernfeld **entfallen**, weil Prompt (`_diff_body`) sie nicht kennt. Die Einstellung wäre wirkungslos.
- Arbeitsblatt: „Umfang“ gibt es dort nicht; die alte Oberfläche hat **Anzahl Aufgaben** und **Bearbeitungszeit**.
- Kreative Einheit: **Sozialform** bleibt (alte Oberfläche), steht unter „Mehr Optionen“. Differenzierung: Stufen sind auf vier begrenzt (der Prompt schneidet bei vier ab).

**Noch offen**
- Die vier Werkzeuge sind noch `aktiv: false`. `/backend` schaltet sie frei: Kern (`FREIGESCHALTET`, Einstellungen an `build_prompt` weiterreichen, Ausgabe Word/ZIP/Seite, `enthaelt`/`hatVorschau` liefern) und dann `aktiv: true`.
- Die bisherigen **Tipps je Werkzeug** liegen in der alten Werkzeugkiste in der Datenbank (`/tipps`), nicht im Code. Sie müssen von dort übernommen werden (Feld `tipps` ist vorbereitet).
- Tests: 12 neue (Felder, Standardwerte, Abhängigkeiten, Schritt 2, Schritt 5). Gesamtsuite 1702 grün, tsc und Lint sauber. Kein Browser-Test (kein Dev-Server).

## Backend-Umsetzung Paket A (2026-10-29)

Keine Datenbank- und keine Rechteänderung: Die Ablauf-Tabelle trägt die neuen Einstellungen schon (JSON).

**Kern** (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`, Commit 61238ed, **noch nicht deployt**)
- `FREIGESCHALTET` um `kreativ`, `differenzierung`, `arbeitsblatt`, `lernsituation` erweitert.
- Prompt: gibt `anzahl`, `art`, `stufen`, `dauer`, `sozialform` an `build_prompt` weiter, mit dem `output`-Wert, den die alte Oberfläche übergab (`seite`, `word` nur bei Differenzierung, sonst `h5p`) → Prompt zeichengleich.
- Prüfen/Bauen: Bei Word-Ausgabe verlangt der Kern die werkzeugeigene Hauptliste (`phasen`, `aufgaben`, `versions`) statt `chapters`. Bau: Differenzierung → `.docx`; Arbeitsblatt/Lernsituation → ZIP. Als Seite liefern alle die Kapitel-YAML wie bisher. Ergebnis enthält `enthaelt` (ZIP-Inhalt), `einheit` (Phasen/Versionen/Aufgaben) und `hatVorschau`.
- Tests `kern_test.py`: 30 grün (neu 10: Prompt gleich für alle vier Werkzeuge und Formate, ZIP/Word, Fehlerfälle). `werkzeugtest.py` unverändert 22/24; die zwei bekannten Altfehler (deploy-paket, podcast 403) bestehen weiter.

**App**
- Vier Werkzeuge `aktiv: true`. Einstellungs-Schema, Standardwerte und Werkzeugwechsel kennen die werkzeugeigenen Felder; `kernBauen` reicht `enthaelt`, `einheit`, `hatVorschau` durch. Schritt 5 zeigt „12 Aufgaben“/„3 Phasen“/„2 Versionen“ je nach Werkzeug und lässt „0 Kapitel“ weg.
- Tests: Gesamtsuite 1705 grün, tsc und Lint sauber.

**Vor dem Live-Gang nötig (/deploy)**
1. Kern deployen (`vercel deploy --prod` im Kern-Ordner), **vor** dem Push der App – sonst meldet der alte Kern „noch nicht freigeschaltet“.
2. Danach App pushen.

**Nicht geprüft:** echter Durchlauf mit einer echten KI-Antwort gegen den deployten Kern und Browseransicht (kein Dev-Server). Die Tipps je Werkzeug sind weiter offen.

## QA Test Results – Paket A (2026-10-29)

**Umfang:** Kreative Einheit, Differenzierung, Arbeitsblatt, Lernsituation + Gerüst für Schritt 2/5. **Tester:** QA (AI).
**Wie getestet:** Auf Wunsch des Nutzers ohne Dev-Server und ohne Browser/Playwright (bringt den Rechner zum Absturz). Geprüft: Code gegen die Kriterien, App-Tests (1705 grün), Kern-Tests (30 grün), und der **echte Kern-Code mit den Beispiel-YAMLs aus den echten Prompts** (Prüfen + Bauen für Arbeitsblatt, Lernsituation, Differenzierung). **Nicht geprüft:** Aussehen/Bedienung im Browser, Handybreite, Tastatur/Screenreader, Hell/Dunkel, Zwischenablage.

| Kriterium | Ergebnis |
|---|---|
| Karten der 4 Werkzeuge aktiv | ✅ (Test) |
| Fünf Schritte, Prüfstelle, Vorschau, „anderes Werkzeug“ | ✅ gleicher Ablauf wie PROJ-51 (Code) |
| Prompts zeichengenau gleich | ✅ Kern-Tests vergleichen mit `build_prompt` (alle Formate) |
| Dateien inhaltsgleich | ✅ gleiche Bauer wie die alte Oberfläche; echter Bau OK (ZIP 2 Dateien, DOCX) |
| Auswahlmöglichkeiten wie heute | ✅ Werte aus `oberflaeche.py` übernommen (siehe Abweichungen unten) |
| Höchstens 3 Einstellungen direkt, Rest „Mehr Optionen“ | ✅ Test über alle Werkzeuge |
| Eine Zeile Erklärung; **aufklappbare „Tipps“** | ⚠️ Zeile ja, Tipps nein (BUG-1) |
| ZIP-Hinweis „Darin: …“ | ✅ |
| „Seite“ nur bei Werkzeugen mit Seiten-Ausgabe | ✅ Test |
| Überarbeiten (Tippfehler/Kapitel neu) | ➖ Gibt es in der App noch für keines der Werkzeuge (auch PROJ-51 nicht); nicht Teil von Paket A |

**Sicherheit:** Alle Routen prüfen weiter die Lehrer-Rolle und lesen nur eigene Abläufe (Tests aus PROJ-51 grün). Werkzeugeigene Einstellungen: Schema begrenzt jeden Wert auf 100 Zeichen, `einstellungenFuerWechsel` verwirft unbekannte Schlüssel (kein Müll in der Datenbank). Seltsame Werte (`anzahl: "abc"`, `dauer: "-5"`, 7 Stufen, `sozialform: "zzz"`) lassen den Kern nicht abstürzen (geprüft). Freitext-Einstellungen (`stufen`) landen nur im Prompt der eigenen Lehrkraft (kein Dritter betroffen). Keine neuen Geheimnisse, keine neue Tabelle, keine RLS-Änderung.

### Bugs
- **BUG-1 (Medium):** Die „Tipps je Werkzeug“ fehlen. Sie liegen in der alten Werkzeugkiste in deren (pausierter) Datenbank. Aufklapp-Feld ist fertig, aber leer und erscheint deshalb nicht. Kein Blocker; nachliefern, sobald die Texte da sind.
- **BUG-2 (Low):** Weicht von der Spec-Tabelle ab, bewusst: Differenzierung ohne Niveau/Bildungsgang/Lernfeld (wirken im Prompt nicht), Arbeitsblatt mit „Anzahl/Zeit“ statt „Umfang“. Spec-Tabelle entsprechend lesen (dokumentiert oben).
- **Hinweis:** Die beiden alten Befunde von `werkzeugtest.py` (deploy-paket, podcast 403) bestehen unverändert und gehören nicht zu Paket A.

**Entscheidung:** Keine Critical/High-Fehler → **Paket A produktionsreif**, Status Approved (ein Browser-Durchgang durch den Nutzer in Produktion steht aus, wie bei PROJ-51).


## Umsetzung Paket B (2026-10-29): Kahoot, Moodle, LearningApps

Keine Datenbank- und keine Rechteänderung (Einstellungen und Ergebnis sind JSON in der Ablauf-Tabelle).

**Kern** (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`, Commit 737234e)
- `FREIGESCHALTET` um `kahoot`, `moodle`, `learningapps` erweitert. Prompt gibt `types`, `zeitlimit`, `kategorie`, `vorlagen` an `build_prompt` weiter; fehlt `anzahl`, gelten die alten Vorgaben (Kahoot 12, Moodle 20, LearningApps 8) → Prompt zeichengleich.
- Antwort: eigene Form `questions:` bzw. `apps:`; fehlt sie, dieselben Sätze wie in der alten Werkzeugkiste („Im eingefügten Text wurden keine Fragen gefunden.“). Prüfstelle (`qualitaet`) und Vorschau (`vorschau`) nutzen die bestehenden Prüfer dieser Werkzeuge.
- Bau: Kahoot → `.xlsx`, Moodle → `.gift.txt`, LearningApps → `.txt`. Für LearningApps liefert der Kern zusätzlich `texte` (ein Block je Übung, aus derselben Funktion wie die Datei; `ausgabe.py` wurde dafür ohne Änderung der Datei umgebaut, byte-gleich geprüft).
- Tests `kern_test.py`: 52 grün (neu 10: Prompt gleich für alle drei, Dateien gleich wie die Bauer, Blöcke stehen in der Gesamtdatei, falsche Form, zu lange Kahoot-Frage, leere Fragen). `werkzeugtest.py` unverändert 22/24 (die zwei bekannten Altfehler: deploy-paket, podcast 403).

**App**
- Drei Werkzeuge `aktiv: true`, ohne Formatwahl. Neue Feldart `text` (Ordner in der Fragensammlung). Beim Werkzeugwechsel werden Zahlen in den Bereich des neuen Werkzeugs geholt (60 Fragen aus Moodle → 30 bei Kahoot) und unpassende Häkchen verworfen.
- Schritt 5: Hat das Ergebnis `texte`, gibt es je Übung einen Block mit eigenem „Kopieren“-Knopf statt „Herunterladen“; klappt die Zwischenablage nicht, bleibt der Text zum Markieren stehen. Die Vorschau bleibt.
- Tests: Gesamtsuite 1720 grün, tsc und Lint sauber (außer dem noch nicht eingecheckten Tipps-Test einer parallelen Sitzung, siehe unten).

| Werkzeug | Direkt | Mehr Optionen |
|---|---|---|
| Kahoot-Quiz | Anzahl Fragen (1–30, Standard 12), Niveau | Zeitlimit je Frage (Automatisch · 5–120 Sek.), Bildungsgang, Lernfeld |
| Moodle-Fragen | Anzahl Fragen (1–60, Standard 20), Fragetypen (7, Standard MC + W/F), Niveau | Ordner in der Fragensammlung, Bildungsgang, Lernfeld |
| LearningApps | Vorlagen (4, Standard Zuordnung + Lückentext), Niveau, Elemente je Übung (4–20, Standard 8) | Bildungsgang |

**Abweichungen von der Tabelle oben** (so wirkt es in der alten Werkzeugkiste)
- Kahoot und Moodle behalten **Lernfeld** (die alte Oberfläche zeigt es dort); LearningApps hat keins.
- LearningApps: „Elemente je Übung“ steht direkt (die Spec nennt nur Vorlagen und Niveau; die alte Oberfläche hat das Feld).
- Kahoot-Datei heißt `Kahoot_Quiz.xlsx` (früher nach dem Skript benannt; der Kern kennt den Skriptnamen nach dem Einlesen nicht mehr).
- Kahoot, Moodle und LearningApps haben eine **Vorschau** (die Spec vermutete keine); sie kostet nichts und stammt aus der alten Werkzeugkiste.
- Die **Tipps** fehlen weiter (BUG-1 aus Paket A, Texte liegen in der pausierten alten Datenbank). Eine parallele Sitzung arbeitet daran; ihr Test verlangt Tipps für jedes freigeschaltete Werkzeug, also auch für diese drei.

## QA Test Results – Paket B (2026-10-29)

**Wie getestet:** Ohne Dev-Server und ohne Browser (bringt den Rechner zum Absturz). Code gegen die Kriterien, App-Tests, Kern-Tests mit echtem Kern-Code und Beispielantworten im Format der echten Prompts.

| Kriterium | Ergebnis |
|---|---|
| Karten der 3 Werkzeuge aktiv | ✅ (Test) |
| Fünf Schritte, Prüfstelle, Vorschau, „anderes Werkzeug“ | ✅ gleicher Ablauf wie Paket A |
| Prompts zeichengenau gleich | ✅ Kern-Tests vergleichen mit `build_prompt` (inkl. Standardanzahl) |
| Dateien inhaltsgleich | ✅ gleiche Bauer; Test vergleicht Bytes mit dem Bauer |
| Auswahlmöglichkeiten wie heute | ✅ Test (Zeitlimits, 7 Fragetypen, 4 Vorlagen) |
| Höchstens 3 direkt, Rest „Mehr Optionen“ | ✅ Test |
| LearningApps: Kopieren je Vorlage statt Download | ✅ Test (Kopieren, Fehlerfall Zwischenablage) |
| Kahoot-Limit 95/60 Zeichen: Prüfstelle meldet | ✅ Test („Frage wird abgeschnitten“) |
| Eine Zeile Erklärung; aufklappbare Tipps | ⚠️ Zeile ja, Tipps nein (BUG-1, wie Paket A) |
| Überarbeiten (Tippfehler/Kapitel neu) | ➖ gibt es in der App für kein Werkzeug (nicht Teil von Paket B) |

**Sicherheit:** Alle Routen prüfen weiter die Lehrer-Rolle und lesen nur eigene Abläufe. Das neue Textfeld „Ordner“ ist auf 100 Zeichen begrenzt (Schema) und landet nur im Prompt der eigenen Lehrkraft. `texte` aus dem Kern wird auf Text und 100.000 Zeichen je Block begrenzt (Test mit Fremdwerten). Der Text wird als Text angezeigt (`<pre>`, kein HTML). Keine neue Tabelle, keine neuen Geheimnisse.

**Nicht geprüft:** Aussehen und Bedienung im Browser, Handybreite, Tastatur/Screenreader, Hell/Dunkel, Zwischenablage im echten Browser, echter Durchlauf mit einer echten KI-Antwort.

**Bugs:** BUG-1 (Medium, Tipps fehlen) besteht fort, kein Blocker. Keine Critical/High-Fehler → Paket B produktionsreif.

## Umsetzung Paket C (2026-10-30): Klassenarbeit, Lernlied

Keine Datenbank- und keine Rechteänderung (Einstellungen und Ergebnis sind JSON in der Ablauf-Tabelle).

**Kern** (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`)
- `FREIGESCHALTET` um `pruefung` und `lied` erweitert. Prompt reicht `mcprozent`, `genre` und `lied_umfang` an `build_prompt` weiter; fehlt der MC-Anteil, gilt wie in der alten Oberfläche 30 %, fehlt die Dauer 60 Minuten → Prompt zeichengleich.
- **Klassenarbeit:** Format Word (Vorgabe) oder H5P. Word → ZIP aus Schülerblatt und Lösungen (derselbe Bauer `build_pruefung_docx`, Notenschlüssel `ihk`/`frei`, Hilfsmittel); H5P nimmt wie früher die Kapitel-Form. Die Zahl neben dem Titel sind die **Gesamtpunkte** („40 Punkte“). Fehlen Punkte, wird die Datei trotzdem gebaut (wie in der alten Werkzeugkiste).
- **Lernlied:** immer ZIP (`build_lied_zip`: Liedtexte, Karaoke-Blatt, Karaoke-Lösung, Handreichung, `Musik-KI-Prompts.txt`). Das Ergebnis trägt einen Satz `hinweis` zur Musik-KI.
- Tests `kern_test.py`: 67 grün (neu 15: Prompt gleich für Word/H5P/Vorgaben/Lied, ZIP-Inhalt gleich wie die Bauer, Notenschlüssel wirkt, Fehlerfälle, Prüfstelle lesbar). `werkzeugtest.py` unverändert 22/24 (die zwei Altfehler: deploy-paket, podcast 403).

**App**
- Beide Werkzeuge `aktiv: true`. Neu in der Werkzeugliste: `sichtbarWenn` (ein Feld erscheint nur bei passendem Wert eines anderen; genutzt für „Notengrenzen“ beim freien Notenschlüssel) und `hinweis` im Ergebnis (Schritt 5 zeigt den Satz zur Musik-KI).
- Tipps für beide Werkzeuge sind eingetragen.

| Werkzeug | Direkt | Mehr Optionen |
|---|---|---|
| Klassenarbeit | Bearbeitungszeit (15–180 Min., Standard 60), Niveau; Format ZIP/H5P | Aufgabentypen (4, Standard Offen + MC + Rechnen), Anteil Multiple Choice (0–100 %, Standard 30), Notenschlüssel (IHK/frei), Notengrenzen (nur bei „frei“), Erlaubte Hilfsmittel, Bildungsgang, Lernfeld |
| Lernlied | Musikrichtung (8, Standard Electro), Wie viele Lieder (3, Standard je Kapitel) | Niveau, Bildungsgang |

**Abweichungen / Entscheidungen**
- Bearbeitungszeit der Klassenarbeit ist auf **15–180 Minuten** begrenzt (die alte Oberfläche ließ 10–1350 zu, der Prompt kürzt aber ohnehin auf 15–180). Beim Werkzeugwechsel wird ein Wert aus der Lernsituation (z. B. 300) in diesen Bereich geholt.
- „Aufgabentypen“ steht unter „Mehr Optionen“, weil die Spec nur Dauer, Format und Niveau direkt nennt.
- Lernlied hat keine Lernfeld-Auswahl (Spec: Niveau, Bildungsgang).
- Eine Vorschau gibt es für beide (Klassenarbeit: Aufgaben mit Punkten und Lösung; Lernlied: Liedübersicht).

## QA Test Results – Paket C (2026-10-30)

**Wie getestet:** Ohne Dev-Server und ohne Browser (bringt den Rechner zum Absturz). Code gegen die Kriterien, App-Tests, Kern-Tests mit echtem Kern-Code und Beispielantworten im Format der echten Prompts.

| Kriterium | Ergebnis |
|---|---|
| Karten der 2 Werkzeuge aktiv | ✅ (Test) |
| Fünf Schritte, Prüfstelle, Vorschau, „anderes Werkzeug“ | ✅ gleicher Ablauf wie Paket A/B |
| Prompts zeichengenau gleich | ✅ Kern-Tests vergleichen mit `build_prompt` (Word, H5P, Vorgaben, Lied mit und ohne Auswahl) |
| Dateien inhaltsgleich | ✅ ZIP-Inhalt und Lösungsblatt-Bytes gleich wie die Bauer |
| Notenschlüssel / Notengrenzen / Hilfsmittel wirken | ✅ Test (freier Schlüssel ändert das Lösungsblatt) |
| Auswahlmöglichkeiten wie heute | ✅ Test (4 Aufgabentypen, 8 Musikrichtungen, 3 Umfänge) |
| Höchstens 3 direkt, Rest „Mehr Optionen“ | ✅ Test |
| Klassenarbeit ohne Punkte / Erwartungshorizont | ✅ Datei wird trotzdem gebaut, Prüfstelle meldet |
| Lernlied: Satz zur Musik-KI in Schritt 5, Karaoke funktioniert auch ohne Musik | ✅ Test |
| Eine Zeile Erklärung; aufklappbare Tipps | ✅ |

**Sicherheit:** Alle Routen prüfen weiter die Lehrer-Rolle und lesen nur eigene Abläufe. Neue Textfelder (Notengrenzen, Hilfsmittel) sind auf 100 Zeichen begrenzt (Schema) und landen nur im Dokument bzw. Prompt der eigenen Lehrkraft; falsche Notengrenzen fallen im Kern still auf den IHK-Schlüssel zurück. `hinweis` aus dem Kern wird auf Text und 300 Zeichen begrenzt und als Text angezeigt. Keine neue Tabelle, keine neuen Geheimnisse.

**Nicht geprüft:** Aussehen und Bedienung im Browser, Handybreite, Tastatur/Screenreader, Hell/Dunkel, Öffnen der Word-Dateien in Word, echter Durchlauf mit einer echten KI-Antwort.

**Bugs:** Keine neuen. Hinweis: Der Test „hat für jedes freigeschaltete Werkzeug kurze Tipps“ aus der parallelen Sitzung (noch nicht eingecheckt) schlägt für die Paket-A/B-Werkzeuge ohne Tipps fehl (BUG-1); Klassenarbeit und Lernlied erfüllen ihn. Keine Critical/High-Fehler → Paket C produktionsreif.

## Umsetzung Paket D (2026-10-30): Video-Fragen

Keine Datenbank- und keine Rechteänderung (Transkript liegt als Einlesung im privaten Speicher, Link und Länge stehen in den Kennzahlen des Ablaufs).

**Kern** (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`)
- `FREIGESCHALTET` um `youtube` erweitert. Neu: `POST /api/einlesen-video` (`kern.einlesen_video`) legt das Transkript als Einlesung ab (`text.txt` + `video.json` mit dem Link). Danach laufen Prompt, Prüfstelle und Bau wie bei jedem Werkzeug.
- Prompt reicht Link, Videolänge und Fragetypen an `build_prompt` weiter; fehlt die Anzahl, gilt wie in der alten Oberfläche 12. Das Transkript braucht mindestens 100 Zeichen (nicht 200 wie ein Skript); Obergrenze 200.000.
- Ausgaben wie in der alten Oberfläche: **Word** (`build_youtube_docx`, eine `.docx`), **H5P Interactive Video** und **H5P Quiz** (beide über den Kapitel-Bauer, Dateiendung `.h5p`).
- Tests `kern_test.py`: 80 grün (neu 13: Prompt gleich für Word/Video/Quiz, mit und ohne Link und Anzahl, Word-Bytes gleich wie der Bauer, H5P für Video und Quiz, Prüfstelle meldet fehlende Lösung, zu kurzes/langes Transkript, falsche Form). `werkzeugtest.py` unverändert 22/24 (die zwei Altfehler: deploy-paket, podcast 403).

**App**
- Neues Merkmal `eingabe: 'video'` an Video-Fragen. Schritt 1 heißt dort **„Video“**: Link (freiwillig, nur http/https, nie abgerufen), großes Transkript-Feld mit Zeichenzähler und aufklappbarer Anleitung („…“ → „Transkript anzeigen“).
- Der Ablauf entsteht mit **einem** Aufruf (`POST /ablaeufe` mit `video` statt `datei`): anlegen → der Kern legt das Transkript ab → Kennzahlen speichern. Scheitert etwas, wird alles wieder entfernt.
- **Wechselregel:** Zwischen Video-Fragen und den anderen Werkzeugen gibt es keinen Wechsel. In Schritt 2 sind die jeweils anderen Einträge der Werkzeugliste ausgegraut („braucht ein Transkript“ / „braucht ein Skript“), dazu steht ein Hinweis; der Server lehnt den Wechsel mit einem Satz ab. Statt einen Sprung zu Schritt 1 zu machen (Edge Case der Spec), ist der Wechsel gar nicht erst möglich, wie es die Kriterien verlangen.
- **Nachgezogen (BUG-1):** Tipps für Kahoot, Moodle und LearningApps ergänzt. Damit ist der Test „hat für jedes freigeschaltete Werkzeug kurze Tipps“ wieder grün.

| Werkzeug | Format | Direkt | Mehr Optionen |
|---|---|---|---|
| Video-Fragen | Word · H5P Interactive Video · H5P Quiz | Niveau | Anzahl Fragen (1–40, Standard 12), Fragetypen (4, Standard MC + Lückentext + W/F), Videolänge (optional), Bildungsgang, Lernfeld |

**Abweichungen / Entscheidungen**
- Die Spec nennt „Format (Word / H5P)“. Die alte Werkzeugkiste hat **drei** Ausgaben (Word, H5P Interactive Video, H5P Quiz); damit „keine Auswahlmöglichkeit wegfällt“, sind es drei.
- Lernfeld bleibt (die alte Oberfläche zeigt es), die Spec nennt es nicht.
- Eine Vorschau gibt es für alle drei Ausgaben (aus der alten Werkzeugkiste).

## QA Test Results – Paket D (2026-10-30)

**Wie getestet:** Ohne Dev-Server und ohne Browser (bringt den Rechner zum Absturz). Code gegen die Kriterien, App-Tests, Kern-Tests mit echtem Kern-Code und Beispielantworten im Format der echten Prompts.

| Kriterium | Ergebnis |
|---|---|
| Karte aktiv | ✅ (Test) |
| Schritt 1 heißt „Video“, Feld für Link (freiwillig) und großes Transkript-Feld | ✅ (Test) |
| Anleitung zum Transkript unter dem Feld | ✅ (Test) |
| Transkript unter 100 Zeichen wird abgelehnt | ✅ im Browser (Zähler, „Weiter“ gesperrt), im Server und im Kern (Tests) |
| „Gleiches Skript, anderes Werkzeug“ nicht verfügbar | ✅ Einträge ausgegraut, Hinweis, Server lehnt ab (Tests) |
| Fünf Schritte, Prüfstelle, Vorschau | ✅ gleicher Ablauf wie Paket A–C |
| Prompt zeichengenau gleich | ✅ Kern-Tests vergleichen mit `build_prompt` (Word, Video, Quiz, mit/ohne Link, mit/ohne Anzahl) |
| Dateien inhaltsgleich | ✅ Word-Bytes gleich wie `build_youtube_docx`; H5P über den gewohnten Bauer |
| Auswahlmöglichkeiten wie heute | ✅ Test (3 Ausgaben, 4 Fragetypen, Anzahl bis 40) |
| Höchstens 3 direkt, Rest „Mehr Optionen“ | ✅ Test |
| Eine Zeile Erklärung; aufklappbare Tipps | ✅ |
| Überarbeiten (Tippfehler/Kapitel neu) | ➖ gibt es in der App für kein Werkzeug (nicht Teil von Paket D) |

**Sicherheit:** Alle Routen prüfen weiter die Lehrer-Rolle und lesen nur eigene Abläufe. Der Link wird per Zod auf http/https und 300 Zeichen begrenzt (`javascript:` u. Ä. wird abgewiesen, Test) und nie abgerufen; das Transkript ist auf 200.000 Zeichen begrenzt und landet nur als Text im Prompt der eigenen Lehrkraft. Video-Fragen lassen sich weder mit einer Datei anlegen noch Skript-Werkzeuge mit einem Transkript (Test). Keine neue Tabelle, keine neuen Geheimnisse.

**Nicht geprüft:** Aussehen und Bedienung im Browser, Handybreite, Tastatur/Screenreader, Hell/Dunkel, Einfügen eines echten YouTube-Transkripts, Öffnen der Word-Datei in Word, Import des H5P in Moodle, echter Durchlauf mit einer echten KI-Antwort.

**Bugs:** Keine neuen. BUG-1 (Tipps) ist behoben. Keine Critical/High-Fehler → Paket D produktionsreif.

## Deployment

### Paket A – 2026-10-29
- **Kern** (`werkzeugkiste-kern`, Commit 61238ed) zuerst per `vercel deploy --prod` (vom Nutzer ausgeführt), danach **App** per Push auf `main` (`93b5f31`), Production „Ready“. Route ohne Login: 401.
- Live: Kreative Einheit, Differenzierung, Arbeitsblatt, Lernsituation. Keine Datenbankänderung.
- Tag: `v1.54.0-PROJ-54-paketA`.
- **Noch offen:** Browser-/Handy-Durchgang durch den Nutzer; Tipps je Werkzeug (BUG-1); Pakete B–E. Das Feature bleibt bis dahin „In Progress“.

### Paket B – 2026-10-29
- **Kern** (`werkzeugkiste-kern`, Commit 737234e) zuerst per `vercel deploy --prod`, danach **App** per Push auf `main` (`a48bd17`), Production „Ready“. Kern ohne Kennwort: 401; App-Route ohne Login: 401. Es ging nur dieser eine Commit hinaus.
- Live: Kahoot-Quiz, Moodle-Fragen, LearningApps. Keine Datenbankänderung.
- Tag: `v1.54.1-PROJ-54-paketB`.
- **Noch offen:** Browser-/Handy-Durchgang durch den Nutzer (Kahoot-Import in Kahoot, GIFT-Import in Moodle, Kopieren in den LearningApps-Editor); Tipps je Werkzeug (BUG-1; die parallele Sitzung muss auch die drei neuen Werkzeuge bedenken); Pakete C–E. Das Feature bleibt bis dahin „In Progress“.

### Paket C – 2026-10-30
- **Kern** (`werkzeugkiste-kern`, Commits c4b37b7 und Hinweis-Commit) zuerst per `vercel deploy --prod`, danach **App** per Push auf `main` (`4fa7f28`), Production „Ready“. Kern ohne Kennwort: 401; App-Route ohne Login: 401. Es ging nur dieser eine Commit hinaus.
- Live: Klassenarbeit, Lernlied. Keine Datenbankänderung.
- Tag: `v1.54.2-PROJ-54-paketC`.
- **Noch offen:** Browser-/Handy-Durchgang durch den Nutzer (Word-Dateien der Klassenarbeit in Word öffnen, Musik-KI-Prompt in suno.com); Tipps der Pakete A/B (BUG-1, der Tipps-Test in `werkzeugkiste.test.ts` schlägt dafür fehl); Pakete D–E. Das Feature bleibt bis dahin „In Progress“.

### Paket D – 2026-10-30
- **Kern** (`werkzeugkiste-kern`, Commit 030957a) zuerst per `vercel deploy --prod`, danach **App** per Push auf `main` (`a115567`), Production „Ready“. App-Route ohne Login: 401. Es ging nur dieser eine Commit hinaus.
- Live: Video-Fragen (Word, H5P Interactive Video, H5P Quiz). Keine Datenbankänderung. Zusätzlich Tipps für Kahoot, Moodle und LearningApps (BUG-1 aus Paket A/B behoben).
- Tag: `v1.54.3-PROJ-54-paketD`.
- **Noch offen:** Browser-/Handy-Durchgang durch den Nutzer (echtes YouTube-Transkript einfügen, Word-Datei in Word öffnen, H5P-Interactive-Video in Moodle); Paket E (Podcast; zuerst prüfen, ob eine neuere `edge-tts`-Version den 403 des Sprachdienstes behebt). Das Feature bleibt bis dahin „In Progress“.
