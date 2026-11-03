# Prompt-Prüfung Werkzeugkiste (Agent „prompt-pruefen“), Stand 2026-11-03

Grundlage: Zweig `vercel-kern`. Alle Prompts sind über `kern.prompt()` gebaut, mit den Standardwerten der Lern-App und einem kurzen Beispieltext. Die gebauten Anweisungen liegen in `scratchpad/qk/audit/p_*.txt`, das Mess-Skript ist `audit/messen.py`. Im Repository wurde nichts geändert.

Schätzregeln:
- Antwort-Token ≈ Zeichen ÷ 3,5 (deutsches YAML mit HTML lässt sich schlechter in Token zerlegen als Fließtext).
- Bezug für die Antwortlänge ist ein typisches Skript mit 20.000 Zeichen.
- Eichwert ist die echte Antwort zu Heft 2 (`Unterichtsmaterialien/Heft2_Haftung_des_FF_nach_HGB/output.yaml`, alter Prompt ohne Inline-CSS): **83.500 Zeichen ≈ 21.000–24.000 Token** für ein Skript mit 23.200 Zeichen und 9 Kapiteln.

---

## 1. Messtabelle

| Werkzeug × Ausgabe | Prompt-Anweisung (ohne Skript) | Bausteine | geschätzte Antwort (20k-Skript) | Abbruchgefahr (> 8.000 Token) |
|---|---|---|---|---|
| skript × H5P | 37.100 Z (~9.300 T) | Niveau, T0_OVERRIDE, MASTER komplett (16 Abschnitte, davon DESIGN 6.800, Selbstprüfung 3.550, Vorlage 4.000) | ~115.000 Z ≈ 33.000 T | **ja (4×)** |
| skript × Seite | 45.100 Z (~11.300 T) | wie oben + `_SEITE_BLOCK` (7.960) | ~130.000 Z ≈ 37.000 T | **ja (4–5×)** |
| kreativ × H5P | 29.000 Z (~7.250 T) | Niveau, T1-Abschnitte + 8 `_sec` (Typen, Design, YAML, Abschluss, Vorlage) | ~60.000 Z ≈ 17.000 T | **ja (2×)** |
| kreativ × Seite | 37.000 Z (~9.250 T) | wie oben + `_SEITE_BLOCK` | ~70.000 Z ≈ 20.000 T | **ja (2,5×)** |
| differenzierung × Word | 1.540 Z | Lernniveau-Referenz, Aufgabe, Vorlage | ~30–40.000 Z ≈ 9–11.000 T (3 Stufen schreiben das ganze Material neu) | **ja (knapp)** |
| differenzierung × H5P | 18.000 Z | + Typenliste, DESIGN, YAML, Vorlage | ~30.000 Z ≈ 8–9.000 T | **ja (knapp)** |
| differenzierung × Seite | 26.000 Z | + `_SEITE_BLOCK` | ~35.000 Z ≈ 10.000 T | **ja** |
| arbeitsblatt × Word | 3.230 Z | Niveau, Aufgabe, Vorlage | ~6.000 Z ≈ 1.700 T (12 Aufgaben) | nein |
| arbeitsblatt × Seite | 25.200 Z | Niveau, `_SEITE_BLOCK`, eigener Teil, Typenliste, DESIGN, Vorlage (ohne YAML-Regeln) | ~16.000 Z ≈ 4.500 T | nein |
| lernsituation × Word | 4.110 Z | Niveau, Erklärung, Aufgabe, Vorlage | ~7.000 Z ≈ 2.000 T | nein |
| lernsituation × Seite | 25.900 Z | wie arbeitsblatt × Seite | ~28.000 Z ≈ 8.000 T | **grenzwertig** |
| kahoot | 2.690 Z | Niveau, Aufgabe, Sprachstil, Grenzen, Vorlage | ~2.500 Z ≈ 700 T (12 Fragen) | nein |
| moodle | 3.790 Z | Niveau, Aufgabe, Kontext, Grenzen, Vorlage | ~10.000 Z ≈ 3.000 T (20 Fragen mit Feedback je Option) | nein |
| learningapps | 1.840 Z | Niveau, Kontext, Aufgabe, Vorlage | ~2.500 Z ≈ 700 T | nein |
| lied | 4.910 Z | Niveau, Aufgabe, Markieren, Singbarkeit, Aufbau, Vorlage | ~12–17.000 Z ≈ 3.500–5.000 T (ein Lied je Abschnitt; bei 14 Abschnitten wie im Seefracht-Skript ≈ 14 Lieder) | nein (bei vielen Abschnitten knapp) |
| pruefung × Word | 3.030 Z | AFB, Operatoren, Qualität, Aufgabe, Vorlage (**ohne Niveau-Block**) | ~7.000 Z ≈ 2.000 T | nein |
| pruefung × H5P | 19.200 Z | + Typenliste, DESIGN, YAML, Vorlage | ~15.000 Z ≈ 4.500 T | nein |
| youtube × Word | 2.030 Z | Niveau, Aufgabe, Vorlage | ~3.500 Z ≈ 1.000 T | nein |
| youtube × Video | 18.300 Z | Niveau, Aufgabe, Video-Teil, Typenliste, VIDEOS, DESIGN, YAML, Vorlage | ~6.000 Z ≈ 1.700 T | nein |
| youtube × Quiz | 18.100 Z | wie Video, mit Quiz-Teil | ~10.000 Z ≈ 3.000 T | nein |

Zusätzlich zur Anweisung kommt das Skript selbst: Heft 2 mit 22.100 Zeichen, Seefracht mit 54.200 Zeichen. Damit liegt der Gesamtprompt für „skript“ bei 57.000–91.000 Zeichen, also 15.000–23.000 Token.

**Wo die Länge der Antwort entsteht** (Heft 2, alter Prompt, Anteil an der Antwort):

| Baustein | Anteil |
|---|---|
| `text` | 20 % |
| `multiple_choice` | 19 % |
| `question_set` | 16 % (im Schnitt nur 3 Fragen je Kapitel, verlangt sind heute 5–8) |
| `accordion` | 12 % |
| `final_chapter` | 8 % |
| `true_false` | 7 % |
| `summary` | 5 % |
| Rest | 13 % |

Feedback-Felder allein machen 15 % aus. Quiz-Bausteine zusammen ergeben **55 %**. Mit dem heutigen Prompt kommen je Kapitel noch hinzu:
- etwa 3.000 Zeichen Inline-CSS: Lernziele-Box 450, je `<h2>`/`<h3>` 135, je Box 215–360, Tabelle 300 plus 70 je Zelle, Schrittliste 330 je Punkt
- etwa 1.300 Zeichen für weitere Fragen im `question_set` (5–8 statt 3)
- etwa 800 Zeichen für das Aufwärm-Quiz
- etwa 600 Zeichen für Mission-, „Wusstest du?“- und „Prüfungsrelevant“-Boxen

---

## 2. Die drei geplanten Vorhaben (PROJ-68) im Urteil

### 2a. Inline-CSS durch Kennzeichen ersetzen

**Nutzen:**
- Prompt: −5.500 Zeichen (DESIGN 6.800 → ca. 1.300) und −800 Zeichen in der Vorlage (`prompts.py:436–437`).
- Antwort: −3.000 Zeichen je Kapitel, also **−20 bis 25 %** bei skript und kreativ.

**Qualitätsrisiko: gering**, solange die Lernziele-, Ausgangs-, Merke-Boxen usw. weiter verlangt werden. Was die KI abschreibt, ist reine Form ohne Lerninhalt. Der Generator setzt das Design heute schon für `h2`/`h3`/`table`/`th`/`td` ein (`h5p_generator.py:234–266`).

**Abhängigkeiten, die die Spec nicht oder nur halb nennt:**
1. **`qualitaet.py:404–409`** meldet „Überschrift ohne Schul-Design“ als **mittel**, sobald `<h2>` ohne `style=` kommt. Das geht in den Nachbesserungs-Prompt, und der verlangt das **vollständige** YAML erneut (`qualitaet.py:1567`). Das ist schon heute ein Fehlalarm für H5P, weil `apply_school_design` hilft (Test: `audit/fehlalarm.py`, Fall „skript h5p, schlichtes <h2>“). Die Spec nennt das, es muss aber **in Paket 1** passieren, nicht später.
2. **`qualitaet.py:410–416`** prüft „Lernziele“ per Teilwort `lernziel` im Inhalt. Das Kennzeichen muss dieses Wort enthalten, etwa `<div class="lernziele">`. Bei einer Kurzform wie `[LZ]` gäbe es in jedem Kapitel einen Fehlalarm der Stufe **mittel**.
3. **Kennzeichen als HTML-Merkmal, nicht als Text-Token:** `vorschau.py:20` entfernt nur Tags. Ein Text-Kennzeichen wie `[MERKE]` stünde roh in der Vorschau, und bei einem Übersetzungsfehler auch in H5P und auf der Seite.
4. **Standardtitel im Code holen die PIL GmbH zurück:** Heute macht `_CREATIVE_BODY.replace(...)` aus „📁 PIL GmbH – Neuer Fall“ im Prompt „📁 Fallakte – Neuer Fall“ (`prompts.py:750–757`). Liegt die Mission-Box-Vorlage künftig im Generator, bekommt **jedes** Werkzeug (kreativ, Tourismus) den PIL-Titel. Deshalb: neutraler Standardtitel wie „📁 Neuer Fall“, und den Titel der KI übernehmen.
5. **Spalten-/Box-Titel nicht festschreiben:** Die Vergleichsvorlage hat fest „Vorteile/Nachteile“ (`prompts.py:323`), die Achtung-Box fest „Achtung:“, obwohl „⭐ Prüfungsrelevant:“ verlangt ist (`prompts.py:244`). Der Übersetzer darf nur einsetzen, wenn die KI keinen Titel liefert, sonst steht „Achtung: ⭐ Prüfungsrelevant:“ doppelt.
6. **`seite.py:129–134`** übernimmt das KI-HTML heute ohne jeden Ausgleich. Für die Seite ist der Übersetzer also Pflicht, nicht Kür. Die Spec sieht das vor.
7. Weitere Stellen mit Inline-CSS-Pflicht, die mitgezogen werden müssen:
   - `prompts.py:282` („ausschließlich Inline-CSS“)
   - `prompts.py:407` (Selbstprüfung)
   - `prompts.py:729` (T1-Selbstprüfung „Kein `<h2>`/`<h3>` ohne Inline-CSS“)
   - beim Überarbeiten: `build_ueberarbeiten_prompt` und `build_ueberarbeiten_kapitel_prompt` hängen `_sec("DESIGN-RICHTLINIEN")` an (`prompts.py:2175`, `2276`) und ziehen damit automatisch mit.
8. Nicht beurteilbar, aber vor dem Bau klären: ob H5P im Moodle der BayernCloud die Stilangaben in `H5P.AdvancedText` überhaupt behält (siehe Abschnitt 5). Der Übersetzer muss in jedem Fall **Inline-Stile** ausgeben, keine Klassen. Eigenes CSS gibt es in H5P nicht.

### 2b. Selbstprüfung entdoppeln

**Nutzen:** −2.500 Zeichen Prompt (3.550 → ca. 1.000). Für die Antwort bringt das **nichts**, denn die KI gibt die Liste nicht aus.

**Risiko: gering bis mittel.** Die Liste ist das Letzte, was die KI vor der Vorlage liest. Schwache Modelle halten sich bevorzugt an sie. Heute widerspricht sie sogar dem Seiten-Block (Befund M1) und sich selbst (`prompts.py:385` gegen `389`).

**Empfehlung:** acht Punkte behalten. Das sind die, die bei Verstoß eine Datei wertlos machen oder eine Nachbesserung auslösen:
- jede Skript-Aufgabe vorhanden
- jedes Bild vorhanden, gezählt
- nichts vorgelöst
- Rechenbeispiel mit eigenen Zahlen
- `question_set` nur mit 4 Typen
- `summary`: im Kapitel `questions`, im Abschlusskapitel `statements`
- `drag_drop`-Kategorien exakt gleich
- Kapitelaufbau vollständig

Die acht Punkte „Motivation & Ton“ (`prompts.py:411–419`) gehören dagegen auf den Prüfstand. Sie sind nicht maschinell prüfbar und verlangen je Kapitel Pflicht-Boxen („mind. 1 Wusstest du“, „mind. 1 spielerisches Muster“), verlängern also die Antwort. Das ist eine offene Frage an die Lehrkraft (Abschnitt 4).

**Achtung:** Kreativ hat eine **eigene** Selbstprüfung (`prompts.py:718–730`). Sie muss getrennt angepasst werden. Für Seite-Ausgaben braucht es eine Fassung ohne „kein find_words/crossword …“.

### 2c. Verbotenes `crossword` aus der Vorlage

**Nutzen und Risiko:** eindeutig sinnvoll, kein Qualitätsrisiko. Beleg: Die alte Heft-2-Antwort enthält `crossword`, `find_words`, `memory_game`, `flashcards` und `image_sequencing`, also alle fünf Typen, die H5P still zu Karteikarten macht.

**Übersehene Abhängigkeit:** Für die Seite-Ausgaben ist die Master-Vorlage (`prompts.py:497–500`) heute das **einzige** Beispiel für die YAML-Form von `crossword` (`words:` → `word:`/`clue:`). Der Seiten-Block beschreibt es nur in Worten (`prompts.py:1481–1484`). Seine YAML-Beispiele (`1504–1593`) zeigen 12 Typen, aber kein `crossword`. `seite.py:440–446` erwartet aber genau `words[].word/clue`.

→ Beim Streichen das `crossword`-Beispiel in `_SEITE_BLOCK` aufnehmen.

Außerdem gehören dazu:
- `prompts.py:389` (Prüfpunkt Kreuzwortwörter)
- die Doppelnennung `166` + `191` + `385`

Für H5P reicht eine Zeile „find_words, memory_game, flashcards, image_sequencing, crossword gibt es in H5P nicht“. Die Begründung zur BayernCloud (`166`) ist Hintergrund für Menschen.

---

## 3. Befunde nach Schwere

### Hoch

**H1 – Abbruch bei skript und kreativ ist mit Kürzen allein nicht lösbar** *(Länge)*
- **Fundstelle:** Antwortmenge aus `prompts.py:196–202`, `137`, `255`, `363–372`. Warnschwelle in `kern.py:66` (`_UMFANG_KNAPP = 60_000`) und `kern.py:319–321`.
- **Betroffen:** skript H5P/Seite, kreativ H5P/Seite (Differenzierung knapp).
- **Begründung:** Bei 20.000 Zeichen Skript liegt die Antwort bei 17.000–37.000 Token, also 2- bis 5-mal über der Grenze. Selbst mit −25 % durch Kennzeichen bleibt skript bei ~25.000 Token. Beleg: Heft 2 ergab schon ohne CSS ~21.000 Token. Die App warnt erst ab 60.000 Zeichen Auswahl. Bei skript ist aber schon ab ~6.000–7.000 Zeichen Skript mit Abbruch zu rechnen (~3,6 Zeichen Antwort je Zeichen Skript plus heutige Zusätze ≈ 5–6 : 1).
- **Vorschlag:** Die Schwelle je Werkzeug setzen, etwa skript ab 6.000, kreativ ab 12.000, Differenzierung ab 15.000 Zeichen. Dazu der Hinweis auf „in Teilen arbeiten“ (PROJ-69). Die Teilgröße für den kostenlosen Weg liegt damit bei **~5.000–6.000 Zeichen Skript**, nicht bei den 22.000 aus `kern.py:640` (das ist der Wert für den bezahlten Weg).

**H2 – PIL GmbH und Spedition fest verdrahtet, Widerspruch zum eigenen Vorrang-Hinweis** *(Qualität)*
- **Fundstelle:**
  - `_T0_OVERRIDE` `prompts.py:1606–1611` verbietet „insbesondere PIL GmbH“.
  - Derselbe skript-Prompt nennt PIL **15-mal**: `234–236`, `259–266`, `315`, `335`, `418` (Selbstprüfung: „PIL GmbH als Spedition in **allen** eigenen Szenarien“).
  - Spedition steht fest in `37` („für Speditionskaufleute in Bayern“), `230`, `274`, `412`.
  - Über `_sec("DESIGN-RICHTLINIEN")` (`315`, `335`) kommt die PIL-Mission-Box auch in youtube-, pruefung- und differenzierung-H5P sowie in arbeitsblatt-/lernsituation-Seite (je 3–4 Nennungen), ohne jeden Vorrang-Hinweis.
  - `_SEITE_BLOCK` `1570` („PIL GmbH – Fall #3“) steht sogar in kreativ × Seite, obwohl T1 „KEIN festes Modellunternehmen“ sagt (`708`).
- **Betroffen:** alle H5P- und Seite-Ausgaben, besonders für Tourismus, KEP und BVJ/BIK.
- **Begründung:** Die KI soll eine Regel per Vorab-Hinweis gegen 15 gegenteilige Stellen durchsetzen. Die letzte Prüfliste verlangt das Gegenteil. Eine Tourismus-Einheit mit Speditions-Fallakte und „Du als Speditionskaufmann“ ist für die Klasse falsch.
- **Vorschlag:** Die PIL- und Spedition-Stellen aus dem gemeinsamen Text herausnehmen und in **einen** Baustein legen, der nur bei Bildungsgang = Spedition (oder „auto“ mit Speditions-Skript) eingesetzt wird. Neutral formulieren: „Du als Auszubildende/r“, „📁 Neuer Fall“. `_T0_OVERRIDE` entfällt dann. Ob skript überhaupt PIL nutzen soll, ist eine offene Frage (Abschnitt 4).

**H3 – YouTube-Video: „2–3 Fragen“ gegen „etwa 12 Fragen“** *(Qualität)*
- **Fundstelle:**
  - `prompts.py:1225` („Platziere etwa {n} Fragen“)
  - dagegen `_sec("VIDEOS")` `prompts.py:223` („Dazu 2–3 Verständnisfragen“), angehängt in `1247`
  - und die Typenliste `185` („`interactive_video` … + 2–3 Fragen“)
- **Betroffen:** youtube × Video, youtube × Quiz.
- **Begründung:** Zwei Zahlen widersprechen sich. Die KI kann mit 2–3 Fragen „regelkonform“ antworten. `qualitaet.py` prüft die Anzahl bei Video/Quiz nicht (`_pruefe_buch`), also merkt es niemand. Das Werkzeug liefert dann ein fast wertloses Video.
- **Vorschlag:** `_sec("VIDEOS")` bei youtube nicht anhängen. In der Typenliste „2–3 Fragen“ nur für Videos innerhalb eines Skripts sagen. In `qualitaet.py` die Zahl der Videofragen gegen `anzahl` prüfen.

**H4 – Fehlalarme der Prüfstelle lösen eine komplette Neuausgabe aus** *(Länge und Qualität)*
- **Fundstelle:**
  - `qualitaet.py:377` (Kapitel ohne Abschlussquiz), `385` (Kapitel fast ohne Aufgaben), `412` (Lernziele fehlen), `405` (Überschrift ohne Stil)
  - `619` (Bildzuordnung ohne Koordinaten), dagegen der Prompt `prompts.py:1468` („lass sie weg“)
  - `337` (Abbildungen fehlen, **hoch**), obwohl die Seite-Prompts von arbeitsblatt und lernsituation nie verlangen, alle Bilder einzubauen
  - Nachbesserung „VOLLSTÄNDIGE korrigierte YAML erneut“ (`qualitaet.py:1567`)
- **Betroffen** (nachgestellt in `audit/fehlalarm.py`, genau nach Prompt gebaut):

| Ausgabe | Befunde der Stufe mittel |
|---|---|
| youtube × Video | 2 |
| lernsituation × Seite | 2 je Phasenkapitel |
| differenzierung × H5P | 2 je Stufe |
| pruefung × H5P | 1 |
| skript mit schlichtem `<h2>` | 1 |
| jede `bildzuordnung` | 1 |

- **Begründung:** Was mittel ist, landet im Nachbesserungs-Prompt. Die KI soll dann Abschlussquiz oder Lernziele ergänzen, die der Werkzeug-Prompt gar nicht verlangt. Bei `bildzuordnung` erfindet sie Koordinaten. Jede Runde verlangt das **ganze** YAML noch einmal, verdoppelt die Antwort und bricht in kostenlosen KIs ab.
- **Vorschlag:**
  - `_pruefe_buch` je Werkzeug parametrieren: Kapitelaufbau nur bei skript/kreativ, Lernziele nur dort, Bildpflicht nur, wo der Prompt sie verlangt.
  - Bildzuordnung auf Stufe tipp setzen, mit einem Hinweis an die Lehrkraft statt an die KI.
  - Die Nachbesserung bei Kapitel-Ausgaben kapitelweise über `kern.kapitel_prompt` (`kern.py:821`) anbieten.

### Mittel

**M1 – Seite-Ausgaben: Seiten-Block erlaubt, was Master und Selbstprüfung verbieten** *(Qualität)*
- **Fundstelle:** `_SEITE_BLOCK` `prompts.py:1470–1486` erlaubt `find_words`, `memory_game`, `flashcards`, `image_sequencing` und `crossword`. Dagegen stehen `190–191` („NICHT VERWENDEN“) und die Selbstprüfung `385`. `188` („Freischalten des nächsten Kapitels“) widerspricht `1451–1454`.
- **Betroffen:** skript × Seite, kreativ × Seite (T1 `728`), dazu über die Typenliste die Seite-Ausgaben von differenzierung, arbeitsblatt und lernsituation.
- **Begründung:** Der Vorrang-Satz steht ganz vorn, die Verbote ganz hinten. Die zuletzt gelesene Prüfliste schließt genau die Seite-Typen aus.
- **Vorschlag:** Typenliste und Selbstprüfung je Ausgabe bauen. Für `output == "seite"` die Zeilen „NICHT VERWENDEN“ und „Kein find_words …“ weglassen, ebenso „schaltet frei“.

**M2 – „VERFÜGBARE H5P-AUFGABENTYPEN – ALLE NUTZEN“ in Werkzeugen mit fester Typenauswahl** *(beides)*
- **Fundstelle:** Überschrift `prompts.py:150`, angehängt in `1246` (youtube), `1331` (differenzierung), `1434` (pruefung), `2100` und `2106` (Seite-Ausgaben). Dagegen `1243`: „Verwende nur diese Fragetypen“.
- **Begründung:** Die Liste (4.700 Zeichen) fordert Vielfalt, das Werkzeug will Beschränkung. Beleg für die Wirkung: Die alte Heft-2-Antwort nutzt 19 Typen, darunter 5, die H5P nur ersetzt.
- **Vorschlag:** Die Überschrift ohne „ALLE NUTZEN“. Für youtube, pruefung und differenzierung nur die Typen und Vorlagenteile mitschicken, die das Werkzeug zulässt. Das spart dort je ca. 6.000–8.000 Zeichen Prompt (Abschnitt 4 der Kürzungsliste).

**M3 – Lernsituation Word: Vorlage summiert 90 Minuten, Regel verlangt 60** *(Qualität)*
- **Fundstelle:**
  - Vorlage `prompts.py:1792`, `1799`, `1805`, `1811`: 20 + 25 + 30 + 15 = 90 Minuten
  - Regel `1757–1758`: „Summe … muss diesem Wert entsprechen“
  - Standard 60 Minuten (`kern.py:316`, App-Feld `DAUER` mit `standard: '60'`)
  - Prüfung `qualitaet.py:1108` meldet mittel, sobald die KI die Vorlage übernimmt (|90 − 60| > 15)
- **Vorschlag:** Die Phasendauern in der Vorlage aus `d` berechnen (z. B. 20/25/35/20 % von d), oder `dauer: <Minuten>` schreiben.

**M4 – Klassenarbeit ignoriert Niveau und Bildungsgang, Punkte-Regel nur in der Prüfstelle** *(Qualität)*
- **Fundstelle:**
  - `prompts.py:2093–2094`: nur `_lehrplan_block`, kein `_options_block`
  - Die Lern-App zeigt Niveau und Bildungsgang für „pruefung“ an (`src/lib/werkzeugkiste.ts`, Felder `NIVEAU`, `BILDUNGSGANG`)
  - `qualitaet.py:793` prüft „etwa ein Punkt je Minute“ (0,5–1,6), der Prompt sagt nur „passende Aufgabenzahl und Punkte“ (`1393`). Die Regel steht ausschließlich im Überarbeiten-Prompt (`2154`).
- **Begründung:** Wer „sehr leicht“ für eine BIK-Klasse wählt, bekommt eine Standardarbeit, und niemand sieht es. Die Punktzahl ist eine weiche Regel mit harter Prüfung.
- **Vorschlag:** `kopf` voranstellen und eine Zeile ergänzen: „Gesamtpunktzahl ≈ Bearbeitungszeit in Minuten (z. B. 60 Min. → 60 P.)“.

**M5 – Skript-Marker werden außerhalb von skript und kreativ nie erklärt** *(Qualität)*
- **Fundstelle:** `MUSTERLÖSUNGEN`, `BILDER` und `TABELLEN` (`prompts.py:48–118`) stehen nur in skript und kreativ. Nicht in arbeitsblatt (`1924ff`, `2007ff`), lernsituation (`1739ff`, `2038ff`), pruefung, differenzierung, kahoot, moodle, learningapps, lied.
- **Begründung:** Die Skripte tragen Hunderte Marker (Heft 2: 259 `[LÖSUNG]`; Seefracht: 1.387 `[LEER]`, 27 Tabellen, 13 Bilder). Ohne Erklärung kann die KI eine `[LÖSUNG]` als Aufgabentext oder Einstieg übernehmen, also das Arbeitsblatt vorlösen. Bei den Seite-Ausgaben meldet die Prüfstelle zugleich „Abbildungen fehlen“ (hoch, `qualitaet.py:337`), obwohl nie danach gefragt wurde.
- **Vorschlag:** Einen Kurzblock von ca. 350 Zeichen für alle Werkzeuge: „`[LÖSUNG]` = Musterlösung, nur in solution/Feedback, nie in Aufgabe oder Einstieg; `[LEER]` = Ausfüllfeld; `[BILD: …]` = Abbildung (bei Seite/H5P als `image`, sonst ignorieren); Tabellen stehen zwischen `[TABELLE]`.“

**M6 – Differenzierung H5P/Seite: „Sammle die Lösungen separat“ hat keinen Ort** *(Qualität und Format)*
- **Fundstelle:** `prompts.py:1303`, gilt auch für `output` h5p/seite (`1324–1336`).
- **Begründung:** Die Kapitel-YAML kennt kein `solutions:`. Die KI legt entweder ein Feld an, das ignoriert wird, oder ein sichtbares Lösungskapitel. Im zweiten Fall ist alles vorgelöst.
- **Vorschlag:** Für h5p/seite stattdessen: „Lösungen nur als richtige Antwort/Feedback bzw. `freitext.solution`.“

**M7 – Kreativ: gestufte Hilfe „Lösungsweg“ gegen „nichts vorwegnehmen“** *(Qualität)*
- **Fundstelle:** `prompts.py:683` (Accordion „Hilfe 1 / Hilfe 2 / Lösungsweg“) gegen `686` und `722`.
- **Begründung:** Ein Accordion steht vor der Bearbeitung offen im Kapitel. „Lösungsweg“ ist mehr als die verlangte „Teillösung“.
- **Vorschlag:** „Hilfe 3: Teillösung (z. B. der erste Rechenschritt), nie das Ergebnis.“

**M8 – Fachlich falsches Beispiel zur Haftungsgrenze, uneinheitliche Haftungsbegriffe** *(Qualität)*
- **Fundstelle:**
  - `prompts.py:146`: „Der Spediteur haftet nach § 461 HGB bis 5 SDR/kg“. Nach HGB gelten 8,33 SZR/kg (§ 461 Abs. 1 i. V. m. § 431 HGB). Das schuleigene Heft 2 sagt selbst „maximal bis 8,33 SZR pro kg“ (Skript-Zeile 207). „SDR“ ist die englische Abkürzung, Unterricht und IHK schreiben „SZR“. Auch `1082` (`*5 SDR je Kilogramm*`) ist betroffen.
  - `1652` (Moodle) nennt § 425 HGB „Obhutshaftung“, `161` nennt ihn „Gefährdungshaftung“. Das Skript ordnet „Gefährdungshaftung“ dem Frachtführer zu.
- **Begründung:** Beispiele aus dem Prompt landen erfahrungsgemäß wörtlich im Feedback.
- **Vorschlag:** „bis 8,33 SZR/kg (§ 431 HGB)“ und einheitlich die Begriffe des Skripts.

**M9 – Lernlied: Vorlage verstößt gegen die eigenen Regeln, keine Obergrenze** *(beides)*
- **Fundstelle:**
  - Refrain mit Sternchen (`prompts.py:1133`), obwohl `1089` es verbietet
  - „Paragraf 453“ als Ziffern (`1082`, `1133`), obwohl `1099–1100` „vierhundertdreiundfünfzig“ verlangt
  - Zeilen ohne Reim („Wien/an“ `1123–1124`, „genau/Mann“ `1133–1134`), obwohl `1097` „sauber reimen“ verlangt
  - „ein Lied pro inhaltlichem Abschnitt“ ohne Grenze (`1044`). Das Seefracht-Skript hat 14 Abschnittsmarker.
- **Vorschlag:** Die Vorlage regelkonform machen (Refrain ohne Sternchen, Zahl ausgeschrieben, Reime). „Höchstens 6 Lieder, Abschnitte notfalls zusammenfassen.“

**M10 – Pflicht-Mengen je Kapitel (Grundlage für E4)** *(Länge)*
- **Fundstelle:** Aufwärm-Quiz 3–5 (`prompts.py:255`), `summary` ohne Mengenangabe (`201`), `question_set` 5–8 (`137`, `202`, `401`, dreifach), Abschlusskapitel 10–15 (`369`, `382`). Accordion „**alle** Fachbegriffe“ (`199`) gegen „5–8“ (`177`) gegen „5–12“ (`88`).
- **Begründung:** Je Kapitel prüfen vier Quiz-Ebenen denselben Stoff. Quiz-Bausteine sind schon heute 55 % der Antwort, mit 5–8 statt im Schnitt 3 Fragen ~60 %. Das Accordion ist 12 %, und „alle“ treibt es nach oben.
- **Vorschlag** (Entscheidung der Lehrkraft, siehe Abschnitt 4):
  - Accordion einheitlich „5–8“
  - `summary` „3 Kernaussagen“
  - `question_set` „5“ statt „5–8“: Ratewahrscheinlichkeit für 70 % bleibt bei 4-Optionen-MC < 2 %, bei Wahr/Falsch ~19 %
  - Aufwärm-Quiz nur, wo das Skript-Kapitel keine eigenen Aufgaben hat

**M11 – Seite-Varianten von Arbeitsblatt und Lernsituation ohne YAML-Regeln, Lernsituation-Seite ohne „nichts vorwegnehmen“** *(Format und Qualität)*
- **Fundstelle:** `build_prompt` `prompts.py:2099–2101` und `2105–2107` ohne `_sec("YAML-REGELN")`. `_lernsituation_seite_body` (`2038–2075`) hat keine Regel, Lösungen aus dem Lehrtext zu halten. Das Arbeitsblatt hat sie (`2029`).
- **Begründung:** HTML-`content` mit Doppelpunkten („Merke:“, „Ausgangssituation:“) ohne die Regeln „`|` statt `>`“ und „Anführungszeichen“ erzeugt die häufigste Parser-Panne.
- **Vorschlag:** YAML-Regeln anhängen (1.160 Zeichen) und den Satz „nichts vorwegnehmen“ in den Lernsituations-Teil übernehmen.

**M12 – „Jedes Bild, keine Ausnahmen“ macht Briefkopf und Logos zu Lerninhalt** *(Qualität)*
- **Fundstelle:** `prompts.py:64`, `380`; erzwungen über `qualitaet.py:337` (hoch).
- **Begründung:** Heft 2 (`seite1_x9`) und Seefracht (`bild001–004`) beginnen mit Schulkopf-Grafiken vor „TEAM: Spedition / Luisenstr. 29“. Die KI muss sie als `image` mit erfundenem `alt` einbauen, sonst gibt es einen Befund der Stufe hoch.
- **Vorschlag:** „Logos und Briefkopf-Grafiken vor der ersten Überschrift weglassen“, und die Prüfstelle Bildmarker vor dem ersten Abschnitt nicht zählen lassen.

### Niedrig

- **N1:** Die Zählangaben im Seiten-Block stimmen nicht. „vier zusätzliche“ (`prompts.py:1442`), „Diese fünf“ (`1485`), „YAML-Form der vier neuen Typen“ (`1504`), gezeigt werden aber 12 und beschrieben 13. Die Zahlen streichen.
- **N2:** Arbeitsblatt-Seite verlangt „rechnen → `calculation_exercise`“ (`2003`), der Seiten-Block sagt „`rechenweg` statt `calculation_exercise` bei mehrstufigen Rechnungen“ (`1487–1491`, `1597`). Für Seite `rechenweg` angeben.
- **N3:** Bei youtube × Word steht `time` im Rahmen „mm:ss“ (`1186`). Ohne Anführungszeichen liest YAML `2:30` als 150 (geprüft), und im Word steht „150“ (`ausgabe.py:145`). Ergänzen: „Zeitmarke in Anführungszeichen“.
- **N4:** Die Rolle wird erst nach den Vorrang-Blöcken gesetzt („Du erstellst professionelle H5P Interactive Books …“, `prompts.py:36–37`, steht hinter `_SEITE_BLOCK` und `_T0_OVERRIDE`). Bei der Seite heißt es dann „H5P“. Den Rollensatz nach vorn ziehen und neutral formulieren („Lerneinheiten“).
- **N5:** Die YAML-Regeln 3–5 (`prompts.py:352–359`) sind überholt, der Generator verträgt Zahl, `"true"` und `70` ohnehin (`h5p_generator.py:1144`, `480`). Bei Moodle ist „kein `:`“ (`1717`) strenger als nötig, `_gift_esc` maskiert (`ausgabe.py:383`). Kürzen oder behalten, Wirkung gering.

**Abgleich mit der Dokumentation:** `prompt_diff.py` meldet CLAUDE.md und `MASTER_PROMPT` als synchron. Kein Befund.

---

## 4. Kürzungsliste (ohne Qualitätsverlust)

| # | Kürzung | Ersparnis Prompt | Ersparnis Antwort | Warum die Qualität nicht leidet |
|---|---|---|---|---|
| 1 | Inline-CSS → Kennzeichen (PROJ-68) | −6.300 Z in allen H5P/Seite-Prompts | −3.000 Z/Kapitel (−20 bis 25 % bei skript/kreativ) | Das Design setzt der Code. Abhängigkeiten aus 2a beachten |
| 2 | Selbstprüfung auf 8 Punkte (MASTER), T1 entsprechend | −2.500 Z | 0 | Es bleiben genau die Punkte mit hoher Fehlerfolge |
| 3 | `crossword` aus der Vorlage, die Verbotsliste auf eine Zeile, die BayernCloud-Begründung weg (`166`, `191`, `385`, `389`, `497–500`) | −700 Z | indirekt (keine Ersatz-Karteikarten) | Beleg: Die alte Antwort nutzte alle 5 Ersatz-Typen |
| 4 | youtube, pruefung, differenzierung H5P: nur die zugelassenen Typen und Vorlagenteile statt kompletter Typenliste und Vorlage | −6.000 bis −8.000 Z je Prompt (18.000 → ~10.000) | gering | Weniger Fehlanreize (M2) |
| 5 | youtube × Video ohne DESIGN-Abschnitt (kein Lehrtext nötig) | −6.800 Z (nach #1: −1.300) | gering | Das Element hat keinen `text` |
| 6 | Seiten-Block für Arbeitsblatt und Lernsituation nur mit passenden Typen, „mind. zwei je Kapitel“ dort streichen | −3.000 bis −4.000 Z | −2 Elemente je Kapitel | Ein Arbeitsblatt hat ein Kapitel, die Typen ergeben sich aus der Aufgabenart |
| 7 | Hintergrund für Menschen streichen: `50–51` (Herkunft der Marker), `165` (drag_drop-Umsetzung), `185` (30/60/90-Sekunden-Automatik), `218` (Generator akzeptiert Varianten), `1447–1448`, `1494–1495`, `1501–1503` (Begründungen im Seiten-Block), Teile von `1711–1715` und `1885–1888` | ~−1.500 Z | 0 | Die KI braucht die Regel, nicht ihre Begründung |
| 8 | Accordion einheitlich „5–8“ statt „alle Fachbegriffe“ (`199`) | ~0 | −3 bis 4 % | Steht schon als Empfehlung im Prompt (`177`), die Prüfstelle rät ab 12 Einträgen ab |
| 9 | Doppelte Mengenangaben auf eine Stelle (`question_set` 5–8: `137`/`202`/`401`; QS-Typen: `188`/`202`/`386`; Summary-Modus: `178–181`/`387–388`) | −600 Z | 0 | Die Regel bleibt einmal stehen, an der Kapitelstruktur |

Zusammen: skript × H5P ca. 37.100 → ~25.000 Zeichen Anweisung (−33 %, Ziel der Spec ≥ 30 %). Die Antwort wird −20 bis 25 % kürzer, mit den offenen Mengenfragen bis −40 %.

---

## 5. Offene Fragen an die Lehrkraft

1. **PIL GmbH im Werkzeug „Ganzes Skript“:** Soll skript die PIL GmbH als feste Spedition nutzen (Master, CLAUDE.md) oder keine Firma erfinden (`_T0_OVERRIDE`)? Heute verlangt der Prompt beides. Für Tourismus, KEP und BVJ/BIK ist PIL in jedem Fall falsch.
2. **Pflicht-Menge je Kapitel (E4):**
   - Aufwärm-Quiz nur bei Kapiteln ohne Skript-Aufgaben?
   - `question_set` fest 5?
   - Abschlusskapitel fest 10?
   - `summary` 3 Kernaussagen?

   Zusammen schätzungsweise −15 bis 20 % Antwort. Der Lerneffekt sinkt kaum, weil heute vier Ebenen denselben Stoff abfragen.
3. **Motivations-Pflichten:** Je Kapitel „mind. 1 Wusstest du“, eine Mission-Box, „⭐ Prüfungsrelevant“ und ein spielerisches Muster (`prompts.py:416–419`). Pflicht oder „wo es passt“? Kostet ~600 Zeichen je Kapitel, wird nicht geprüft.
4. **Differenzierung:** Wie lang darf eine Stufe sein? Heute schreibt die KI das ganze Material dreimal neu, was bei 20.000 Zeichen Skript zum Abbruch führt. Vorschlag: „je Stufe höchstens ~4.000 Zeichen, Kerninhalte“, oder ein Hinweis zur Auswahl kleinerer Abschnitte.
5. **Kreativ, dritte Hilfe:** „Teillösung“ oder „Lösungsweg“?
6. **Briefkopf-Grafiken:** Dürfen Logos und Schulkopf weggelassen werden?
7. **Teilgröße für den kostenlosen Weg (PROJ-69):** Bei ca. 8.000 Token Antwort passen bei skript nur ~5.000–6.000 Zeichen Skript in einen Teil. Ist das als Arbeitsweise zumutbar, oder soll der kostenlose Weg bei skript standardmäßig ein Umfang (z. B. 45/90 Min.) vorschlagen?

---

## 6. Was ich nicht beurteilen konnte

- **Echtes KI-Verhalten und Ausgabegrenzen von ChatGPT Free:** Ich habe keine KI laufen lassen. Die Antwortlängen sind Hochrechnungen aus der alten Heft-2-Antwort und den Pflicht-Mengen. Die Token-Zahl ist Zeichen ÷ 3,5 bzw. ÷ 4, ohne echten Tokenizer.
- **Ob H5P in Moodle/BayernCloud die Inline-Stile behält:** H5P-Kerne filtern HTML in `AdvancedText` je nach Bibliotheksversion beim Anzeigen. Bibliotheksdateien liegen nicht im Repository. Bitte einmal eine fertige H5P mit Boxen in der BayernCloud öffnen und prüfen. Werden Rahmen und Hintergründe dort entfernt, ist das CSS für H5P von vornherein Ballast. Das spricht zusätzlich für 2a, verändert aber den „Datei sieht gleich aus“-Nachweis.
- **Ob das H5P Interactive Book Kapitel wirklich erst nach dem `question_set` freischaltet** (Prompt `188` und Intro-Text in `h5p_generator.py:1301`): nicht prüfbar ohne Plattform.
- **Außerhalb der Prompts, aber ein Längentreiber:** Die Einlesung (`extraktion.py`) verdoppelt bei verbundenen Tabellenzellen den `[LÖSUNG]`-Inhalt (Seefracht-Skript, Zeilen 41 und 62: dieselbe Rechnung dreimal in einer Zelle). Außerdem erzeugt sie 23 Zeilen, die nur `[LEER]` enthalten (6.300 Zeichen); Tabellen machen 67 % des Seefracht-Textes aus. Das verlängert den Prompt um über 10 %. Prüfen sollte das der Zuständige für die Extraktion, nicht dieser Agent.
- Die fachliche Richtigkeit der Lehrplan-Blöcke (`lehrplaene.py`) und des Schulrecht-Prompts gehört nicht zu den freigeschalteten Ausgaben und wurde nicht geprüft.
