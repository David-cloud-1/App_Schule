# PROJ-68: Werkzeugkiste – kürzere Prompts und Antworten ohne Qualitätsverlust

## Status: Architected
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

### Überblick
Alles passiert im **Kern** (Repository `~/Schule/Werkzeugkiste`, Zweig `vercel-kern`). Die Lern-App bekommt den Prompt weiterhin fertig vom Kern und ändert sich nicht. Keine Datenbank, keine neuen Pakete, keine Kosten.

Was heute wo passiert und was sich ändert:

| Stelle im Kern | Heute | Mit PROJ-68 |
|---|---|---|
| Prompt-Bau (`prompts.py`) | schreibt der KI 6.800 Zeichen Stilangaben vor und wiederholt Regeln in der Selbstprüfung | nennt nur noch die Kennzeichen (je ein Satz), kurze Selbstprüfung, Vorlage ohne verbotene Typen |
| H5P-Generator | ergänzt Design nur für Überschriften und Tabellen ohne Stil | ergänzt Design auch für alle Boxen, Schritt-Listen, Vergleiche, Zebra-Tabellen |
| Interaktive Seite (`seite.py`) | übernimmt das HTML der KI unverändert | nutzt **denselben** Design-Übersetzer wie H5P |
| Prüfstelle (`qualitaet.py`) | meldet Überschrift ohne Stil als Fehler | meldet das nicht mehr, denn der Generator setzt den Stil |
| Regelwerk `CLAUDE.md` + Agent `prompt-sync` + `prompt_diff.py` | CLAUDE.md ist die „Quelle der Wahrheit“ und hat die alten Langtexte | CLAUDE.md wird mitgezogen, damit der Abgleich die Kürzung nicht zurückholt |

### A) Ablauf (nichts Neues für die Lehrkraft)
```
Lehrkraft kopiert Prompt (kürzer)
   → eigene KI schreibt Antwort (kürzer: Kennzeichen statt Stilangaben)
   → Antwort zurück in die App
   → Kern prüft (Prüfstelle) und baut
        +-- Design-Übersetzer: Kennzeichen → bisheriges Schuldesign
        |      (vorhandene Stilangaben bleiben unangetastet)
        +-- H5P-Datei / Interaktive Seite / Vorschau sehen aus wie bisher
```

### B) Die Kennzeichen (was die KI schreibt)
Die KI schreibt normales, schlichtes HTML und markiert eine Box nur mit ihrem Namen, z. B. „diese Box ist eine Merke-Box“. Der Generator macht daraus die bisherige Box mit Farben, Rahmen und Überschrift („Merke:“, „Lernziele“, „Ausgangssituation“ …).

| Kennzeichen | Wird zu (wie bisher) |
|---|---|
| lernziele | Lernziele-Box mit „Nach diesem Kapitel kannst du…“ |
| ausgangssituation, arbeitsauftrag | blaue bzw. beige Box mit Titelzeile |
| merke, tipp, achtung, beispiel | Hinweis-Boxen mit farbigem Rand |
| mission (PIL-Fallakte), pruefung (IHK-Simulation) | Fall- bzw. Prüfungs-Box |
| schritte (nummerierte Liste) | Liste mit runden Nummern |
| vergleich (zwei Spalten, z. B. Vorteile/Nachteile) | Zweispalten-Layout grün/orange |
| zebra (Tabelle) | Tabelle mit dunklem Kopf und Streifen |
| Überschriften, normale Tabellen | wie heute schon automatisch |

Regeln des Übersetzers:
- **Stilangaben der KI haben Vorrang.** Hat ein Element schon einen Stil, bleibt er stehen. Alte Antworten und gemischte Antworten bauen daher unverändert.
- Gängige Schreibvarianten werden erkannt (Groß/Klein, mit oder ohne Umlaut).
- Ein unbekanntes Kennzeichen bleibt als normaler Absatz stehen, ohne Fehler.
- Schreibt die KI einen eigenen Boxtitel (z. B. „⭐ Prüfungsrelevant:“ in der Achtung-Box), wird er übernommen, sonst setzt der Generator den Standardtitel.
- Die Box-Vorlagen stehen **an einer Stelle** im Kern. H5P, Seite und Vorschau nutzen sie gemeinsam, deshalb kann das Design nicht mehr auseinanderlaufen.

### C) Prompt aufräumen (was im Prompt wegfällt bzw. bleibt)
- **Weg:** alle ausgeschriebenen Stilangaben (Design-Richtlinien, Beispiel-HTML in der Antwortvorlage, Seiten-Block), `crossword` in der H5P-Vorlage, die Prüfpunkte zu Kreuzwortwörtern und Inline-CSS.
- **Gekürzt:** Die Selbstprüfung wird eine kurze Liste der Punkte, die die KI erfahrungsgemäß vergisst (jede Skript-Aufgabe, jedes Bild, nichts vorgelöst, eigene Zahlen im Rechenbeispiel, Kapitelaufbau vollständig, YAML-Regeln). Regeln, die nur wiederholt werden, fallen weg.
- **Bleibt inhaltlich gleich:** alle fachlichen und didaktischen Regeln, die YAML-Regeln, die Typenliste, die Pflicht-Menge je Kapitel (E4 bleibt offen).
- Die Bausteine, die mehrere Werkzeuge teilen (Design, Aufgabentypen), werden einmal gekürzt und wirken damit in allen Werkzeugen aus der Tabelle oben, auch beim Überarbeiten und beim „Kapitel neu anfragen“ (PROJ-52).

### D) Qualitätsnachweis (Vergleichsbericht)
Ein kleines Prüfskript im Kern vergleicht zwei Antworten zum selben Skript und gibt eine Tabelle aus:
- Länge von Prompt und Antwort (Zeichen, geschätzte Token)
- umgesetzte Skript-Aufgaben, Bilder (Soll aus dem Skript gegen Ist), Kapitel, Elemente je Typ
- Befunde der Prüfstelle nach Stufe
- **Anteil der Antwort je Baustein** (Aufwärm-Quiz, Begriffe, Zusammenfassung, Abschluss-Quiz, Abschlusskapitel). Das ist die Grundlage für E4.

**Wer die Antworten schreibt:** Claude (über Claude Code, ohne Zusatzkosten), mit identischen Bedingungen für alt und neu: je Skript und Prompt zwei Durchläufe, bewertet wird der schlechtere (siehe Edge Cases). Skripte: Heft 2 (Haftung) und ein KSK-Heft mit Rechenaufgaben und Tabellen. Dazu kommt die Stichprobe von 15 Aufgaben je Skript, von Hand gelesen. Das Ergebnis steht als Tabelle in dieser Spec. Erst danach wird deployt.

Optional, empfohlen: ein Durchlauf von Heft 2 mit dem neuen Prompt in **ChatGPT Free** durch den Nutzer, um zu sehen, ob die Antwort jetzt vollständig ankommt. Das ist zugleich der Messwert für PROJ-69 (Teilgröße).

### E) Tests
- **Ersetzt:** die Tests „Prompt zeichengleich mit der alten Werkzeugkiste“. **Neu:** Jeder Prompt enthält die Pflicht-Regeln (Stichwortliste je Regel), enthält keine Stilangaben und zeigt in der Vorlage nur erlaubte Typen.
- **Neu:** Jedes Kennzeichen ergibt genau das bisherige Design (Vergleich mit den bisherigen Box-Vorlagen); eine Antwort mit Inline-CSS ergibt dieselbe Datei wie vorher; gemischte und unbekannte Kennzeichen bauen ohne Fehler; die Seite bekommt dasselbe Design wie H5P.
- **Bleibt:** die „Datei gleich“-Tests (H5P inhaltsgleich, Word gleich) und `werkzeugtest.py` (22/24, zwei bekannte Altfehler).
- **Prüfstelle:** Der Test zu „Überschrift ohne Stil“ wird umgedreht (kein Befund mehr).

### F) Reihenfolge (drei Pakete, je für sich auslieferbar)
1. **Design-Übersetzer + Prüfstelle:** Der Generator versteht die Kennzeichen, der Prompt ist noch unverändert. Ungefährlich, weil die KI noch Inline-CSS schreibt und das unangetastet bleibt.
2. **Prompt kürzen** + `CLAUDE.md`, `prompt-sync`, `prompt_diff.py` mitziehen + neue Prompt-Tests.
3. **Vergleichsbericht** und Messwerte in die Spec, dann die Freigabe durch den Nutzer und das Kern-Deploy.

Paket 1 muss vor Paket 2 live sein. Sonst würden neue, kurze Antworten von einem alten Generator ohne Boxen gebaut.

### G) Entscheidungen und Begründung
| Entscheidung | Warum |
|---|---|
| Design setzt der Generator, nicht die KI | Die KI muss 250–550 Zeichen je Box nicht mehr abschreiben, und Abschreibfehler im Design gibt es dann nicht mehr. Das Aussehen bestimmt der Code, also ist es immer gleich. |
| Kennzeichen als schlichtes HTML-Merkmal statt neuer YAML-Elementtypen | Der YAML-Aufbau bleibt identisch, also müssen Prüfstelle, Zusammenfügen (PROJ-64) und Überarbeiten (PROJ-52) nicht umgebaut werden. Alte Antworten bleiben gültig. |
| Ein gemeinsamer Übersetzer für H5P und Seite | Die Seite hatte bisher gar keinen Design-Ausgleich. Eine Stelle verhindert, dass beide auseinanderlaufen. |
| Vorhandene Stile haben Vorrang | Abwärtskompatibel: Entwürfe, Materialien und Antworten aus der Zeit vor PROJ-68 bauen unverändert. |
| Vergleich mit Claude statt kostenloser Fremd-KI | Wiederholbar, kostenlos und unter gleichen Bedingungen für alt und neu. Den Praxis-Check in ChatGPT Free macht der Nutzer optional. |
| Pflicht-Menge je Kapitel bleibt (E4) | Hier geht es um Qualität, deshalb entscheidet der Nutzer. Diese Spec liefert nur die Zahlen. |

### H) Risiken
- **KI ignoriert die Kennzeichen** und schreibt schlichtes HTML ohne Boxen: Dann fehlen Boxen, die Datei bleibt aber lesbar. Im Vergleich zählen wir die Boxen je Kapitel (alt gegen neu). Fällt die Zahl, wird die Anweisung deutlicher gefasst.
- **Kürzere Selbstprüfung lässt die KI schludern:** Genau das misst der Vergleich (Skript-Aufgaben, Bilder, Befunde). Fällt ein Wert, kommt der betreffende Prüfpunkt zurück.
- **PROJ-64-Kostenschätzung** nutzt einen Erfahrungswert „Antwort zu Skript“. Mit kürzeren Antworten wird die Schätzung zu hoch, also auf der sicheren Seite. Den Wert nach dem Vergleich anpassen.

### Abhängigkeiten (Pakete)
Keine neuen. Alles mit vorhandenem Python (PyYAML) im Kern.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
