# PROJ-68: Werkzeugkiste – kürzere Prompts und Antworten ohne Qualitätsverlust

## Status: Planned
**Created:** 2026-11-03
**Last Updated:** 2026-11-03

## Kontext
Die Prompts der Werkzeugkiste wurden in PROJ-51/54 bewusst **zeichengenau** aus der alten Werkzeugkiste übernommen, nie überarbeitet. Folge im Alltag: Wer den Prompt in eine kostenlose KI kopiert, bekommt bei längeren Skripten eine Antwort, die **mittendrin abbricht**.

Bestandsaufnahme (2026-11-03, Anweisungen ohne Skripttext):

| Werkzeug / Ausgabe | Anweisung | Bemerkung |
|---|---|---|
| Ganzes Skript – H5P | 37.100 Zeichen (~9.300 Token) | lange Antwort |
| Ganzes Skript – Seite | 45.100 Zeichen (~11.300 Token) | lange Antwort |
| Kreativ – H5P / Seite | 29.000 / 37.000 Zeichen | lange Antwort |
| Lernsituation / Arbeitsblatt – Seite | 25.900 / 25.200 Zeichen | lange Antwort |
| YouTube, Differenzierung, Prüfung – H5P | 18.000–19.100 Zeichen | mittel |
| Kahoot, Moodle, Word-Varianten, Lied, Podcast | 1.500–4.900 Zeichen | unkritisch |

Woher die Länge kommt:
- **Design als Inline-CSS:** Die KI soll für jede Box (Lernziele, Merke, Tipp, Achtung, Ausgangssituation …) 250–550 Zeichen Stilangaben abschreiben, mehrmals pro Kapitel. Das bläht die **Antwort** auf. Die Design-Richtlinien selbst sind 6.800 Zeichen des Prompts. Für Überschriften und Tabellen setzt der Generator das Design schon heute selbst ein, wenn es fehlt.
- **Doppelungen:** Die „Selbstprüfung“ (3.500 Zeichen) wiederholt fast jede Regel ein zweites Mal. Die Antwortvorlage zeigt das Kreuzworträtsel, obwohl es verboten ist.
- **Pflicht-Menge je Kapitel:** Aufwärm-Quiz, Begriffe, Skript-Aufgaben, Zusammenfassung mit Fragen, Abschluss-Quiz (5–8), „Wusstest du?“-Box, dazu ein Abschlusskapitel (10–15 Fragen).

Vergleichswert: Heft 2 (Haftung, 9 Kapitel) ergab schon mit dem alten Prompt ohne Inline-CSS ~21.000 Token Antwort.

### Entscheidungen
- **E1 – Qualität vor Kürze (Nutzer, 2026-11-03):** Ziel ist „effizienter, ohne dass die Qualität leidet“. Jede Kürzung muss im Vorher/Nachher-Vergleich bestehen (siehe unten), sonst wird sie zurückgenommen.
- **E2 – „Zeichengenau gleich“ endet (Nutzer, 2026-11-03):** Die Gleichwertigkeits-Tests aus PROJ-51/54 („Prompt zeichengleich mit `build_prompt` der alten Werkzeugkiste“) werden bewusst ersetzt. Die Prompts dürfen sich ändern. Die erzeugten **Dateien** müssen weiter gleich aussehen.
- **E3 – Design macht der Generator (Annahme, Claude 2026-11-03):** Die KI schreibt nur noch kurze Kennzeichen (z. B. eine Box „Merke“), der Generator setzt das bisherige Schuldesign ein. Das Aussehen der fertigen Datei bleibt unverändert.
- **E4 – Pflicht-Menge je Kapitel (OFFEN, Nutzer entscheidet):** Ob Bausteine je Kapitel wegfallen oder optional werden (z. B. Aufwärm-Quiz, Zusammenfassung mit Fragen), entscheidet der Nutzer nach dem ersten Vergleich. Bis dahin bleibt die Menge unverändert. Diese Spec liefert dafür nur die Messwerte.

## Dependencies
- Requires: PROJ-51 (Kern, Prüfstelle, Generator), PROJ-54 (übrige Werkzeuge)
- Hilft: PROJ-64 (Direkt erstellen): kürzere Prompts und Antworten senken dort die Kosten und die Laufzeit.
- Wird ergänzt durch: PROJ-69 (kostenloser Weg in Teilen)

## User Stories
- Als **Lehrkraft mit kostenloser KI** möchte ich, dass die Antwort auf meinen Prompt vollständig ankommt, damit ich nicht mittendrin abbrechen und neu anfangen muss.
- Als **Lehrkraft** möchte ich, dass die fertige Lerneinheit genauso gut aussieht und genauso viele, gute Aufgaben hat wie bisher, damit sich die Kürzung für mich nur als „geht jetzt durch“ bemerkbar macht.
- Als **Lehrkraft** möchte ich einen kürzeren Prompt kopieren, damit meine KI die Anweisungen nicht wegkürzt und gleich mit der Arbeit beginnt.
- Als **Lehrkraft**, die eine **ältere Antwort** (mit vollem Design) zurückkopiert oder überarbeitet, möchte ich, dass sie weiterhin korrekt gebaut wird.
- Als **Super-Admin** möchte ich beim bezahlten Weg (PROJ-64) weniger zahlen, ohne dass das Ergebnis schlechter wird.
- Als **Nutzer (Entwickler)** möchte ich Messwerte je Baustein sehen, damit ich über die Pflicht-Menge je Kapitel (E4) begründet entscheiden kann.

## Acceptance Criteria

### Kürzere Antwort durch Design-Kennzeichen
- [ ] Für jede Box, die der Prompt heute mit Inline-CSS vorgibt (Lernziele, Ausgangssituation, Arbeitsauftrag, Merke, Tipp, Achtung, Beispiel, Mission/Fallakte, Prüfungssimulation, Schritt-Liste, Vergleich/Zweispalten, Zebrastreifen-Tabelle), gibt es ein kurzes Kennzeichen, das die KI stattdessen schreibt.
- [ ] Der Generator ersetzt jedes Kennzeichen durch genau das Design, das die Box bisher hatte. Für dieselbe inhaltliche Antwort sieht die fertige Datei (H5P und Interaktive Seite) gleich aus wie mit Inline-CSS.
- [ ] Der Prompt enthält keine ausgeschriebenen Stilangaben mehr, nur noch die Liste der Kennzeichen mit je einem Satz, wofür sie da sind.
- [ ] Antworten **mit** Inline-CSS (alte Antworten, KI hält sich nicht daran) werden weiterhin unverändert gebaut. Vorhandenes Design wird nie überschrieben.
- [ ] Gilt für alle Werkzeuge und Ausgaben, die heute die Design-Richtlinien oder den Seiten-Block mitschicken (Ganzes Skript, Kreativ, YouTube-H5P, Differenzierung-H5P, Prüfung-H5P, Lernsituation-/Arbeitsblatt-Seite).

### Aufgeräumter Prompt
- [ ] Die Selbstprüfung enthält keine Regel mehr, die weiter oben wortgleich oder sinngleich schon steht. Sie bleibt als kurze Liste der wichtigsten Prüfpunkte (z. B. „jede Skript-Aufgabe vorhanden“, „jedes Bild vorhanden“, „keine vorgelöste Aufgabe“).
- [ ] Die Antwortvorlage zeigt nur Aufgabentypen, die erlaubt sind (kein `crossword` in H5P-Prompts).
- [ ] Widersprüche werden aufgelöst (z. B. Prüfpunkt zu Kreuzwortwörtern, obwohl Kreuzworträtsel in H5P verboten sind).
- [ ] Jede fachliche Regel (Lösungen nicht vorwegnehmen, Bilder vollständig, Tabellen-Umsetzung, Distraktoren, Feedback, Rechenaufgaben, PIL GmbH, Du-Form, YAML-Regeln) bleibt inhaltlich erhalten.
- [ ] Die werkzeugeigenen Prompts (Kahoot, Moodle, Word-Varianten …) werden nur angefasst, wenn dieselben Bausteine darin vorkommen. Sie sind heute schon kurz.

### Messbares Ziel
- [ ] „Ganzes Skript – H5P“: Anweisung um **mindestens 30 %** kürzer (heute 37.100 Zeichen).
- [ ] Antwort für Heft 2 mit gleichem Inhalt um **mindestens 20 %** kürzer als mit dem heutigen Prompt.
- [ ] Je Werkzeug aus der Tabelle oben wird die neue Anweisungslänge in dieser Spec festgehalten.

### Qualitätsnachweis (Pflicht vor Freigabe)
- [ ] Vergleich alt/neu an **Heft 2** (Haftung) und mindestens **einem zweiten Skript mit Rechenaufgaben und Tabellen** (z. B. ein KSK-Heft): beide Prompts, gleiche KI, gleiche Einstellungen.
- [ ] Neu hat **mindestens so viele Skript-Aufgaben** umgesetzt wie alt, und **jedes Bild** des Skripts ist vorhanden.
- [ ] Die Prüfstelle (Kern) meldet bei neu keine zusätzlichen Befunde der Stufe „hoch“.
- [ ] Stichprobe von mindestens 15 Aufgaben je Skript: keine vorgelöste Aufgabe, Distraktoren und Feedback gleichwertig, Design der Boxen gleich.
- [ ] Ergebnis steht als kurze Tabelle in dieser Spec (Antwortlänge, Aufgaben, Bilder, Befunde, Auffälligkeiten). Fällt ein Punkt schlechter aus, wird die Ursache behoben oder die betreffende Kürzung zurückgenommen.
- [ ] Die Messwerte je Baustein (wie viel Antwort entfällt auf Aufwärm-Quiz, Zusammenfassung, Abschluss-Quiz, Abschlusskapitel) stehen in der Spec als Grundlage für E4.

### Tests
- [ ] Die Tests „Prompt zeichengleich“ in `kern_test.py` werden ersetzt durch: Prompt enthält alle Pflicht-Regeln (Stichworte je Regel), enthält keine Inline-Stile, Antwortvorlage nur mit erlaubten Typen.
- [ ] Neue Tests: jedes Kennzeichen wird zum bisherigen Design; Antwort mit Inline-CSS bleibt gleich; unbekanntes Kennzeichen stört den Bau nicht.
- [ ] „Datei gleich“-Tests (H5P inhaltsgleich, Word gleich) bleiben bestehen und grün.

## Edge Cases
- **KI schreibt trotzdem Inline-CSS** (gewohnheitsmäßig oder aus alter Antwort): wird unverändert übernommen, sieht aus wie bisher.
- **KI mischt** Kennzeichen und Inline-CSS in einer Antwort: beides wird korrekt dargestellt.
- **KI erfindet ein Kennzeichen**, das es nicht gibt: der Inhalt erscheint als normaler Absatz ohne Box. Kein Abbruch, kein Befund „hoch“.
- **Kennzeichen falsch geschrieben** (Groß/Klein, Umlaut, Leerzeichen): gängige Varianten werden erkannt (z. B. „Merke“/„merke“).
- **Überarbeiten (PROJ-52):** Das bestehende YAML ist dort die Formatvorgabe. Alte YAMLs mit Inline-CSS bleiben gültig. Neue Überarbeitungen dürfen Kennzeichen nutzen.
- **Gespeicherte Entwürfe und Materialien** aus der Zeit vor PROJ-68 lassen sich weiter bauen und herunterladen.
- **Interaktive Seite und H5P** nutzen dieselben Kennzeichen. Das Design ist dasselbe wie bisher.
- **Druck/Word-Ausgaben** sind nicht betroffen (sie haben kein Inline-CSS im Prompt).
- **Qualitätsvergleich hängt vom KI-Zufall ab:** Je Skript und Prompt werden zwei Durchläufe gemacht. Bewertet wird der schlechtere.

## Technical Requirements
- Änderungen nur im Kern-Repository (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`): Prompt-Bau und Generator. Die Lern-App ändert sich nicht.
- Keine neue KI, keine Kosten: Der Vergleich läuft über den kostenlosen Weg oder Claude Code.
- Der Agent `prompt-sync` und `prompt_diff.py` (Abgleich mit CLAUDE.md) werden angepasst oder als veraltet gekennzeichnet, damit sie die alten Texte nicht zurückholen.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
