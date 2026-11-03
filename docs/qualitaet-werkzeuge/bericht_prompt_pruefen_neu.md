# Prompt-Prüfung Werkzeugkiste – Gegenprüfung nach PROJ-68 (Stand 2026-11-03)

Grundlage: Arbeitszweig `/Users/davidzach/Schule/Werkzeugkiste-paket1`, Commit `059b932`. Alle Prompts sind über `kern.prompt()` gebaut, mit den Standardwerten der Lern-App und einem kurzen Beispieltext (Skript `neu/audit/messen.py`, gebaute Anweisungen `neu/audit/p_*.txt`). Die Fehlalarm-Nachstellung liegt in `neu/audit/fehlalarm.py`, die alte Fassung von `prompts.py` zum Vergleich in `neu/audit/prompts_alt.py`. Im Repository wurde nichts geändert. `prompt_diff.py` meldet CLAUDE.md und `MASTER_PROMPT` als synchron.

Neuer Eichwert: In `scratchpad/qk/neu/` liegt eine Antwort auf den **neuen** skript-Prompt zu Heft 2 (`antwort_heft2_skript_2.yaml`). Sie hat 81.200 Zeichen (≈ 23.000 Token), 9 Kapitel, `question_set` 3–4 Fragen, final 8, kein `style=`. Das Skript hat 23.200 Zeichen. Wer sie erzeugt hat, weiß ich nicht. Ich nutze sie nur als Beleg für Längen.

---

## 1. Status der Befunde aus dem früheren Bericht

| Nr. | Status | Beleg |
|---|---|---|
| **H1** Abbruch skript/kreativ | **offen** | Die Warnschwelle ist unverändert bei 60.000 Zeichen (`kern.py:68`), nicht nach Werkzeug gestaffelt. Die neue Heft-2-Antwort hat **81.200 Z ≈ 23.000 T**, also fast so viel wie die alte Antwort ohne Inline-CSS (83.500 Z). Das Verhältnis Antwort zu Skript liegt weiter bei **3,5 : 1**. Damit passen in den kostenlosen Weg nur ~8.000 Zeichen Skript je Durchlauf. |
| **H2** PIL GmbH / Spedition fest verdrahtet | **erledigt** | `PIL` kommt in `prompts.py` nicht mehr vor, `_T0_OVERRIDE` ist entfallen. Die Unternehmensregel steht einmal (`prompts.py:138`), Kreativ entspricht ihr (`457`, `474`). Die Mission-Box hat einen neutralen Standardtitel „📁 Neuer Fall“ (`schuldesign.py:61–63`). Das Fallakte-Beispiel ist neutral (`1324`). Rest: Die Beispiele in Typenliste und Vorlage bleiben speditionsbezogen (`87`, `252`, `270`, `313`). Das sind nur Beispiele, deshalb kein Befund. |
| **H3** YouTube „2–3“ gegen „etwa n“ Fragen | **teilweise** | Im Prompt erledigt: youtube hängt `_sec("VIDEOS")` nicht mehr an (`987–990`), und die Typenliste nennt keine Zahl mehr (`106`). Offen in `qualitaet.py`: Es gibt keine Prüfung der Videofragen gegen `anzahl`. Zudem meldet sie bei youtube × Video weiter **mittel** „Kapitel fast ohne Aufgaben“ (`qualitaet.py:458–462`, nachgestellt), weil das Kapitel laut Prompt genau ein Element hat. |
| **H4** Fehlalarme lösen eine Neuausgabe aus | **teilweise** | Erledigt: Lernziele, Abschlussquiz und Kapitelgröße prüft sie nur noch bei skript/kreativ (`qualitaet.py:414`, `446`, `483`). Der Alarm „Überschrift ohne Stil“ ist entfernt. Bildzuordnung meldet sie nur noch als tipp (`691`). Logos zählen nicht mehr (`_ohne_kopfbereich`, `290–301`). **Offen:** (a) Die Bildpflicht meldet **hoch** für jedes Werkzeug (`385–412`, ohne Bedingung), obwohl Arbeitsblatt-, Lernsituations-, Prüfungs-, Differenzierungs- und YouTube-Prompts sie nie verlangen. Der Marker-Kurzblock sagt nur „ignoriere sie, wenn das Ausgabeformat keine Bilder kennt“ (`prompts.py:1839`), die Seite kennt aber Bilder. Kreativ verlangt „Reduziere auf die Kernideen“ (`422`), der geteilte Bilderabschnitt dagegen „keines weglassen“ (`55`). (b) Lernsituation × Seite meldet je Phasenkapitel mittel „fast ohne Aufgaben“ (nachgestellt). (c) Die Nachbesserung verlangt weiter das **vollständige** YAML (`qualitaet.py:1676`). |
| **M1** Seiten-Block gegen Master-Verbote | **erledigt** | Die Verbotszeile gilt nur noch „in einer H5P-Datei“ (`109`). Die Selbstprüfung enthält kein „kein find_words“ mehr (`184–191`, T1 `467–478`). „Freischalten“ ist aus der Typenliste entfernt (`107`). |
| **M2** „ALLE NUTZEN“ / volle Typenliste | **teilweise** | Die Überschrift ist neutral (`89`). youtube, pruefung und differenzierung bekommen aber weiter die volle Typenliste und die volle Vorlage mit 17 Typen (`987–990`, `1076–1079`, `1188–1191`). Bei youtube × Video sind das 6.400 von 8.200 Zeichen. |
| **M3** Lernsituation Word: 90 gegen 60 Min. | **erledigt** | Die Phasendauern werden aus `d` berechnet (`1493–1494`, `1542–1559`). |
| **M4** Klassenarbeit ohne Niveau, Punkte-Regel | **erledigt** | `kopf` steht davor (`1860`), „Gesamtpunktzahl ≈ Minuten“ steht im Prompt (`1146–1147`). |
| **M5** Marker außerhalb skript/kreativ | **erledigt** | `_MARKER_KURZ` (`1834–1841`) gilt für alle außer youtube (Transcript, braucht ihn nicht). |
| **M6** Differenzierung: Lösungen ohne Ort | **teilweise** | Für Word erledigt. Für H5P ist daraus ein **neuer Fehler** geworden (N-H2): `freitext.solution` gibt es nur auf der Seite. |
| **M7** Kreativ: „Lösungsweg“ | **erledigt** | „Hilfe 3: Teillösung … nie das Ergebnis“ (`432`, `470`). |
| **M8** 5 SDR / Haftungsbegriffe | **erledigt** | „§ 431 HGB bis 8,33 SZR je kg“ (`87`), die Lied-Markierung lautet „acht Komma drei drei Sonderziehungsrechte“ (`823`). „Gefährdungshaftung“ ist weg, Moodle und Arbeitsblatt sagen einheitlich „Obhutshaftung“ (`1397`, `1727`). |
| **M9** Lernlied-Vorlage, Obergrenze | **erledigt (Rest niedrig)** | Refrain ohne Sternchen, Zahl ausgeschrieben, saubere Reime (`864–879`), „Höchstens 6 Lieder“ (`814`). Rest: Der Überarbeiten-Prompt sagt weiter „„Paragraf 453“, nicht „§ 453““ (`1943`) gegen die Regel in `840–841` (siehe N-N6). |
| **M10** Pflicht-Mengen (E4) | **erledigt** | Kein Aufwärm-Quiz und keine `summary` im Kapitel (`120`), `question_set` 3–4 (`118`, `188`), final 8 (`178`), Accordion einheitlich 5–8 (`103`, `116`). Die Prüfstelle zieht nach (`qualitaet.py:361–362`). Rest im Umfang-Block, siehe N-M1. |
| **M11** YAML-Regeln Seite-Varianten / Lernsituation „nichts vorwegnehmen“ | **teilweise** | Die YAML-Regeln sind angehängt (`1866`, `1872`). Lernsituation × Seite hat weiter keinen Satz „Lehrtext/Box nimmt kein Phasenergebnis vorweg“. Er steht nur indirekt im Marker-Block (`1836–1837`) und beim `freitext` (`1820–1823`). Das Arbeitsblatt hat ihn (`1783–1784`). |
| **M12** Logos/Briefkopf | **erledigt** | Ausnahme im Prompt (`55`, `185`), die Prüfstelle überspringt den Kopfbereich (`qualitaet.py:290–301`, `389`). |
| **N1** Zählangaben im Seiten-Block | **erledigt** | „dieser Typen“ (`1253`). Die „vier“ steht nur noch im Code-Kommentar (`1196`). |
| **N2** Arbeitsblatt-Seite `calculation_exercise` statt `rechenweg` | **offen** | `_AB_SEITE_TYPEN["rechnen"]` (`1757`) gegen den Seiten-Block (`1238–1241`, `1349`). |
| **N3** youtube Word `time` ohne Anführungszeichen | **offen** | Die Regel lautet weiter nur „Format mm:ss“ (`927`). Die Vorlage hat Anführungszeichen (`935`), die Regel nicht. `2:30` ohne Anführungszeichen wird als 150 gelesen (geprüft). |
| **N4** Rolle hinter den Vorrang-Blöcken | **teilweise** | Der Rollensatz ist neutral („digitale Lerneinheiten“, `36–37`), steht aber weiter hinter `_SEITE_BLOCK`. Wirkung gering. |
| **N5** YAML-Regeln 3–5 / Moodle-Doppelpunkt | **teilweise** | Die YAML-Regeln sind auf 3 gekürzt (`167–170`). Das Doppelpunkt-Verbot bei Moodle bleibt (`1464`). |

**Kürzungsliste**

| # | Status | Beleg |
|---|---|---|
| 1 | erledigt | 0 `style=` in allen 20 gebauten Prompts; DESIGN 6.817 → 1.462 Z |
| 2 | erledigt | Selbstprüfung 3.552 → 858 Z, 8 Punkte (`184–191`) |
| 3 | erledigt | Eine Zeile (`109`), `crossword` aus der Vorlage, Beispiel im Seiten-Block (`1290–1293`) |
| 4 | offen | Volle Typenliste und Vorlage bei youtube, pruefung, differenzierung (siehe M2) |
| 5 | offen | youtube × Video hat weiter DESIGN (`988`). Die Ersparnis wäre jetzt nur 1.462 Z |
| 6 | teilweise | „mind. zwei je Kapitel“ ist weg (`1348`). Arbeitsblatt- und Lernsituations-Seite bekommen aber weiter alle 15 Seitentypen (siehe N-M4) |
| 7 | teilweise | Die Master-Hintergründe sind weg. Im Seiten-Block bleiben `1201–1208`, `1213–1214`, `1251–1252` |
| 8 | erledigt | `103`, `116` |
| 9 | erledigt | Menge des `question_set` nur in `118` und `188`, Summary-Modus nur in `104` und `190` |

**Entscheidungen der Lehrkraft**, alle umgesetzt:
- Motivationsboxen „wo es passt“ (`142`)
- Logos entfallen (`55`)
- Kreativ-Hilfe 3 = Teillösung (`432`)
- Differenzierung ≤ ~4.000 Z je Stufe (`1043–1044`)

---

## 2. Neue Befunde aus der Überarbeitung

### Hoch

**N-H1 – Kreativ verlangt `summary` mit `questions` im Kapitel, der Prompt zeigt aber nirgends mehr, wie das aussieht, und die Typenliste verbietet es sinngemäß** *(Qualität und Format)*
- **Fundstelle:**
  - T1 verlangt die `summary` im Kapitel: `prompts.py:433`, `444` („`summary` (questions): … 3 Aussagen, je ≥ 2 Distractors“), Selbstprüfung `476`.
  - Die geteilte Typenliste sagt nur „`summary` – im `final_chapter` mit `statements:`“ (`104`).
  - Die Vorlage zeigt nur die `statements`-Form (`325–327`).
  - Die alte Typenliste hatte beide Modi und ein `questions`/`distractors`-Beispiel (`prompts_alt.py`, Abschnitt „ZUSAMMENFASSUNG“). Es ist beim Kürzen weggefallen.
- **Betroffen:** kreativ × H5P, kreativ × Seite.
- **Begründung:**
  - Der Generator erwartet `questions[].correct` und `distractors` (`h5p_generator.py:1196–1208`). Andere Feldnamen ergeben ein leeres Widget.
  - Schreibt die KI nach der Typenliste `statements` ins Kapitel, meldet `qualitaet.py:525–530` **hoch**, und die Nachbesserung verlangt das ganze YAML neu.
- **Vorschlag:** In `_T1_KAPITELSTRUKTUR` Punkt 5 ein Mini-Beispiel ergänzen (~150 Z): `- type: summary` / `questions:` / `- correct: "…"` / `distractors: ["…", "…"]`. In der Typenliste ergänzen: „(nur in der kreativen Einheit zusätzlich im Kapitel mit `questions` – siehe Kapitelstruktur)“.

**N-H2 – Differenzierung × H5P schreibt `freitext` vor, den es in H5P nicht gibt** *(Format)*
- **Fundstelle:** `prompts.py:1047–1048` („bei offenen Fragen in `freitext.solution`“) gilt für `output` h5p **und** seite. Der Seiten-Block, der `freitext` erklärt, kommt nur bei seite (`1075`, `1354–1356`).
- **Betroffen:** differenzierung × H5P.
- **Begründung:** `qualitaet.py:435–439` meldet **hoch** „Aufgabentyp `freitext` gibt es in H5P nicht“, der Generator überspringt das Element. Differenzierungsmaterial enthält typischerweise offene Aufgaben. Das ist der Ersatz für alten Befund M6, nur ins Gegenteil verkehrt.
- **Vorschlag:** Nach Ausgabe trennen. Für h5p wie bei youtube: „Offene Fragen als `text` (Frage) + `accordion` (term: „Mögliche Antwort“)“ (vgl. `977`). Für seite bleibt `freitext.solution`.

### Mittel

**N-M1 – Der Umfang-Block verlangt weiter `summary` je Kapitel** *(beides)*
- **Fundstelle:** `prompts.py:618` („Aufgaben (zusätzlich zu `summary` und `question_set`)“) steht vor dem Master. Dagegen `120` („keine Zusammenfassung mit Auswahlfragen im Kapitel“) und `190`.
- **Betroffen:** skript × H5P und × Seite, sobald ein Umfang gewählt ist.
- **Begründung:** Der Block „hat Vorrang vor Umfangsangaben weiter unten“ (`616`). E4 wird so bei jeder Umfangswahl wieder aufgehoben, und das kostet je Kapitel ~5 % Antwort.
- **Vorschlag:** Den Klammertext je Werkzeug setzen: skript „(zusätzlich zum `question_set`)“, kreativ wie bisher.

**N-M2 – Die Prüfstelle verlangt 8 Fragen im Abschlussquiz bei Werkzeugen, deren Prompt keine Zahl nennt, und nennt selbst noch „10–15“** *(Prüfung ohne Regel)*
- **Fundstelle:**
  - Die finale Prüfung mit 8–12 Fragen gilt für jedes `final_chapter` (`qualitaet.py:361–366`, `711–713`).
  - Lernsituation × Seite verlangt ein `final_chapter` ohne Zahl (`prompts.py:1826–1828`). Die angehängte Vorlage zeigt **eine** Frage (`315–324`), `_sec("ABSCHLUSSKAPITEL")` ist dort nicht dabei.
  - Der Wunschtext „Abschlusskapitel fehlt“ nennt „10–15 Fragen“ (`qualitaet.py:705–707`), der Prompt verlangt 8 (`prompts.py:178`).
- **Betroffen:** lernsituation × Seite (nachgestellt: 6 Fragen → mittel „Abschlussquiz zu kurz“), skript/kreativ bei fehlendem Abschluss.
- **Vorschlag:** In `_lernsituation_seite_body` „`question_set` mit 8 Fragen“ ergänzen. In `qualitaet.py:706` „8 Fragen“ setzen.

**N-M3 – Kennzeichen und HTML wirken nur in `text.content`, der Prompt lenkt sie aber auch in Aufgabenfelder** *(Formatfalle)*
- **Fundstelle:** Das Design wird nur auf `text` angewandt (`h5p_generator.py:243`, `seite.py:132`). Auf der Seite werden Fragetexte und `fill_blanks` maskiert: `seite.py:169`, `232`, `205` (`_esc(roh)`). Dagegen stehen:
  - `prompts.py:68` und `1755–1756`: „`fill_blanks` mit der Tabelle als HTML in der Aufgabe“. Auf der Seite stehen dann `<table>`-Tags als roher Text.
  - `prompts.py:140`: „Komplexe Aufgaben … stehen in einer Ausgangssituation“, ohne Ortsangabe. Die alte Fassung sagte „als `Ausgangssituation`-Box **vor** der eigentlichen Aufgabe“ (alter Abschnitt SITUATIONSPRINZIP). Die KI kann jetzt `<div class="ausgangssituation">` in `question:`/`task:` setzen: auf der Seite roh sichtbar, in H5P ohne Design.
- **Betroffen:** alle Seite-Ausgaben (besonders Arbeitsblatt mit Aufgabenart „Tabelle“), H5P optisch.
- **Vorschlag:**
  - In DESIGN eine Zeile: „Boxen, Tabellen und Überschriften nur in `type: text`, die Aufgabe folgt als eigenes Element.“
  - Für die Seite die Lückentabelle als Tabelle im `text` davor und die Lücken als Sätze im `fill_blanks`. Oder `seite.baue_fill_blanks` lässt Tabellen-HTML zu. Das entscheidet der Generator-Zuständige.

**N-M4 – Der Seiten-Block ist nicht mitgekürzt und jetzt der größte Einzelbaustein** *(Länge)*
- **Fundstelle:** `_SEITE_BLOCK` (`prompts.py:1199–1352`) 7.964 → 7.610 Z, während der Master 36.237 → 15.995 Z schrumpfte. Anteil: skript × Seite 32 %, arbeitsblatt/lernsituation × Seite 44–46 %. Dazu kommt `1348–1351`: „Nutze diese Typen …: `schaetzrunde` als Einstieg, `fallakte` …, `selbsteinschaetzung` ganz ans Kapitelende“.
- **Betroffen:** alle Seite-Ausgaben.
- **Begründung:**
  - Arbeitsblatt und Lernsituation (ein Kapitel bzw. Phasenkapitel) bekommen alle 15 Seitentypen samt YAML.
  - Die Nutzungsempfehlung fügt bei skript/kreativ je Kapitel 2–3 Elemente hinzu, also genau die Art Pflicht-Menge, die E4 abgebaut hat.
- **Vorschlag:**
  - Für arbeitsblatt/lernsituation nur die Typen aus `_AB_SEITE_TYPEN` plus `freitext`/`rechenweg` mitschicken (~−4.500 Z).
  - Die Begründungen in `1201–1208`, `1213–1214`, `1251–1252` streichen (~−700 Z).
  - Aus der Empfehlung „höchstens zwei dieser Zusatztypen je Kapitel“ machen.

**N-M5 – `schaetzrunde` als Kapiteleinstieg widerspricht „nichts vorwegnehmen“ und „kein Aufwärm-Quiz“** *(Qualität)*
- **Fundstelle:** `prompts.py:1246–1249` („Als Einstieg ins Kapitel … Haftungssummen … Nur Zahlen nehmen, die im Skript stehen“), `1348`. Dagegen `78` („Kein Lösungswert … steht in einer Frage“) und `120`.
- **Betroffen:** skript × Seite, kreativ × Seite.
- **Begründung:** Die Zahlen im Skript sind häufig `[LÖSUNG]`-Werte, etwa die Haftungshöchstsumme in Heft 2. Die Schätzrunde löst sie am Kapitelanfang auf, bevor die Aufgabe kommt.
- **Vorschlag:** „Nie eine Zahl, die im Skript als `[LÖSUNG]` einer Aufgabe steht.“

**N-M6 – Bilder in `bildzuordnung`/`image_sequencing` zählen nicht als verwendet** *(Prüfung ohne Regel)*
- **Fundstelle:** `qualitaet.py:395–400` zählt nur `type: image`. Der Seiten-Block lässt dieselben Bildmarker in `bildzuordnung.path` und `image_sequencing.steps[].path` verwenden (`prompts.py:1220–1223`, `1232–1234`, `1278–1311`).
- **Betroffen:** alle Seite-Ausgaben.
- **Begründung:** Wer das Bild regelkonform als Bildzuordnung nutzt, bekommt **hoch** „Abbildung(en) fehlen“, oder die KI baut das Bild doppelt ein.
- **Vorschlag:** In `sammle` auch `path` unter `bildzuordnung` und `image_sequencing` zählen.

### Niedrig

- **N-N1:** Die Typenliste beschreibt das Accordion als „5–8 Fachbegriffe … ohne eigene Skript-Aufgabe“ (`103`). Kreativ nutzt es für Hilfe 1–3 (`432`), youtube und pruefung als „Mögliche Antwort“ bzw. „Erwartungshorizont“ (`969–970`, `977`, `1183–1184`). Die Prüfstelle meldet nichts (nachgestellt). Vorschlag: „Fachbegriffe (5–8) – oder als Aufklapp-Hilfe/Lösung, wo das Werkzeug es sagt“.
- **N-N2:** Arbeitsblatt × Seite verlangt ein `question_set` mit „5–8“ Fragen (`1788`), die Prüfstelle sieht 3–4 vor und meldet ab 7 einen Tipp (nachgestellt mit 8 Fragen).
- **N-N3:** Die Lernziele-Box bekommt vom Generator automatisch „Nach diesem Kapitel kannst du…“ (`schuldesign.py:210–211`). Der Wunschtext der Prüfstelle sagt der KI, genau diesen Satz zu schreiben (`qualitaet.py:485–486`). Folgt die KI der Nachbesserung, steht er doppelt. Den Klammersatz streichen.
- **N-N4:** Differenzierung × Seite trägt die Überschrift „AUSGABE: H5P INTERACTIVE BOOK“ (`1070`).
- **N-N5:** Die Prüfstelle meldet bei Kahoot „richtige Antwort meist die längste“ (`qualitaet.py:808`). Der Kahoot-Prompt hat keine Längenregel (`645–652`). Vorschlag: eine Zeile „Antworten gleich lang“ ergänzen.
- **N-N6:** Lied-Überarbeiten „„Paragraf 453“, nicht „§ 453““ (`1943`) widerspricht `840–841` („vierhundertdreiundfünfzig“). Vorschlag: „Zahlen ausgeschrieben lassen“.
- **N-N7:** „Jeder Hauptabschnitt wird **ein** Kapitel (höchstens ~25 Elemente)“ (`112`) plus „Keine [Skript-Aufgabe] darf fehlen“ (`42`). Für einen Hauptabschnitt mit mehr Aufgaben gibt es keine Regel, und der Wunschtext von „Kapitel zu groß“ (`qualitaet.py:451–457`) ist dann nicht erfüllbar. Die neuen Antworten bleiben bei höchstens 15 Elementen, deshalb nur niedrig. Vorschlag: „notfalls in ‚Teil 1/Teil 2‘ teilen“.

**Keine Befunde** in diesen Prüfpunkten:
- Antwortvorlage gegen `schuldesign.py`: Alle 12 Kennzeichen der Tabelle (`146–163`) sind in `_BOXEN`/`_BEKANNT` bekannt, `data-titel` ersetzt den Standardtitel (`schuldesign.py:147`), Vergleichsspalten haben keinen festen Titel (`174`), Umlaute werden normalisiert (`115`).
- Die Prüfstelle findet „lernziel“ in `class="lernziele"`.
- `vorschau.py` entfernt die Tags, Kennzeichen erscheinen also nicht roh.

---

## 3. Messtabelle alt → neu

Prompt ohne Skript in Zeichen. Antwort geschätzt für ein Skript mit 20.000 Zeichen, Token ≈ Zeichen ÷ 3,5. Grenze für kostenlose KIs ~8.000 Token.

| Werkzeug × Ausgabe | Prompt alt | Prompt neu | Δ | Antwort alt | Antwort neu | Abbruch neu |
|---|---|---|---|---|---|---|
| skript × H5P | 37.100 | 16.505 | −56 % | ~33.000 T | **~20.000 T** (Beleg Heft 2: 81.200 Z bei 23.200 Z Skript) | **ja (2,5×)** |
| skript × Seite | 45.100 | 24.115 | −47 % | ~37.000 T | ~22.000 T (+ Seitentypen) | **ja (2,7×)** |
| kreativ × H5P | 29.000 | 15.767 | −46 % | ~17.000 T | ~13.000 T | **ja (1,6×)** |
| kreativ × Seite | 37.000 | 23.377 | −37 % | ~20.000 T | ~15.000 T | **ja (1,9×)** |
| differenzierung × Word | 1.540 | 2.152 | +40 % | ~10.000 T | ~4.500 T (3 × 4.000 Z + Lösungen) | nein |
| differenzierung × H5P | 18.000 | 8.732 | −51 % | ~8.500 T | ~5.000 T | nein |
| differenzierung × Seite | 26.000 | 16.342 | −37 % | ~10.000 T | ~5.500 T | nein |
| arbeitsblatt × Word | 3.230 | 3.987 | +23 % | ~1.700 T | ~2.900 T (Beleg Seefracht: 10.100 Z) | nein |
| arbeitsblatt × Seite | 25.200 | 16.512 | −34 % | ~4.500 T | ~3.700 T | nein |
| lernsituation × Word | 4.110 | 4.540 | +10 % | ~2.000 T | ~2.000 T | nein |
| lernsituation × Seite | 25.900 | 17.174 | −34 % | ~8.000 T | ~6.300 T | nein (knapp) |
| kahoot | 2.690 | 3.119 | +16 % | ~700 T | ~700 T (Beleg: 2.100 Z) | nein |
| moodle | 3.790 | 4.220 | +11 % | ~3.000 T | ~3.000 T | nein |
| learningapps | 1.840 | 2.274 | +24 % | ~700 T | ~700 T | nein |
| lied | 4.910 | 5.474 | +11 % | 3.500–5.000 T | ≤ ~3.800 T (höchstens 6 Lieder) | nein |
| pruefung × Word | 3.030 | 4.835 | +60 % | ~2.000 T | ~3.200 T (Beleg Heft 2: 11.300 Z) | nein |
| pruefung × H5P | 19.200 | 10.932 | −43 % | ~4.500 T | ~3.700 T | nein |
| youtube × Word | 2.030 | 2.027 | 0 % | ~1.000 T | ~1.000 T | nein |
| youtube × Video | 18.300 | 8.194 | −55 % | ~1.700 T | ~1.700 T | nein |
| youtube × Quiz | 18.100 | 8.002 | −56 % | ~3.000 T | ~2.800 T | nein |

Die Zunahme bei den kleinen Prompts (+400 bis +1.800 Z) kommt fast nur von `_MARKER_KURZ` (430 Z) und, bei pruefung, vom jetzt vorangestellten Niveau-Block (M4). Beides ist gewollt.

**Wo die Antwortlänge jetzt entsteht** (neue Heft-2-Antwort):

| Baustein | alt | neu |
|---|---|---|
| `question_set` | 16 % | **22,5 %** |
| `text` | 20 % | 21 % |
| `multiple_choice` | 19 % | 16 % |
| `accordion` | 12 % | 8,5 % |
| `fill_blanks` | – | 8 % |
| `final_chapter` | 8 % | 7 % |
| `summary`, Aufwärm-Quiz | 5 % | 0 % |

Feedback macht weiter 15 % aus.

Das `question_set` ist trotz 3–4 Fragen anteilig gewachsen. Grund ist die Pflicht zu einer „neuen, vollständigen Rechnung“ mit eigener Ausgangssituation je Kapitel (`118`). Die Antwort ist gegenüber der alten Heft-2-Antwort ohne CSS nur −3 % kürzer, gegenüber dem alten Prompt mit CSS geschätzt −30 %. **Abbruch bei skript und kreativ bleibt nur über kleinere Teile lösbar** (H1, PROJ-69). Sinnvolle Teilgröße für den kostenlosen Weg: ~8.000 Zeichen Skript (skript), ~12.000 (kreativ).

---

## 4. Offene Fragen an die Lehrkraft

1. **Teilgröße und Warnschwelle (H1):** Soll die App bei skript schon ab ~8.000 Zeichen Auswahl warnen bzw. in Teile schneiden? Die neue Antwort zeigt, dass die Kürzung die Abbruchgefahr nicht beseitigt hat.
2. **Seitentypen je Kapitel (N-M4):** Sollen Schätzrunde, Fallakte und Selbsteinschätzung „höchstens zwei je Kapitel“ sein, oder bleibt es bei „wo sie fachlich passen“? Das kostet je Kapitel ~1.500–2.500 Zeichen.
3. **Rechnung im `question_set` (`118`):** Lohnt sich die Pflicht „mindestens eine neue, vollständige Rechnung“ in jedem Rechenkapitel? Sie ist der Grund, warum das Kapitelquiz trotz weniger Fragen anteilig gewachsen ist.

## 5. Was ich nicht beurteilen konnte

- Wer die neuen Antworten in `scratchpad/qk/neu/` erzeugt hat (Modell, Plattform) und ob `antwort_heft2_skript_1.yaml` (4 Kapitel, ohne Abschluss) ein Abbruch war.
- Echtes Verhalten kostenloser KIs. Ich habe keinen echten Tokenizer und keine eigene KI-Ausführung genutzt.
- Ob H5P in der BayernCloud die vom Generator gesetzten Inline-Stile behält (offen wie im alten Bericht).
