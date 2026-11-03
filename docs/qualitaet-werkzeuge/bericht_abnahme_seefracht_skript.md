# Abnahme: „Ganzes Skript → H5P“ – Seefrachtrechnen, Teil 1 (Abschnitte 1–9)

**Urteil:** Fachlich sauber. Alle 14 Skript-Aufgaben sind da, und jedes Ergebnis stimmt mit der [LÖSUNG] überein. Den Lerneffekt kosten drei Dinge: die fünf Zusätze zu M/G stehen als aufgedeckte Karteikarten da, beim Baukran nimmt ein Feedback das Ergebnis der nächsten Aufgabe vorweg, und weil es nur ein Kapitel gibt, prüfen Kapitelquiz und Lernzielkontrolle denselben Stoff zweimal und nur oberflächlich. Etwa 40 % der Antwort sind Gestaltungs-CSS und doppelte Aufgabenrahmen.

Ausgangslage Prüfstelle: grün, 1 Tipp („Zwei gleiche Aufgaben hintereinander“). Diesen Tipp führe ich unten nicht noch einmal auf.
Messung: 49.961 Zeichen (~12.500 Token), 1 Kapitel mit 57 Elementen, alle 5 Bilder vorhanden, Inline-CSS 9.237 Zeichen (18 %).

---

## 0. Abgleich Vollständigkeit und Nachrechnung

| # | Skript-Aufgabe / [LÖSUNG] | Element in der Einheit | [LÖSUNG] | Einheit | nachgerechnet |
|---|---|---|---|---|---|
| 1 | Venezuela M/G, 5 × 2.623 kg | calc_ex (Z. 115) | 13,280 frt | 13,280 | 2,04·1,05·1,24 = 2,656 → ×5 = 13,280 > 13,115 t ✓ |
| 2 | Venezuela M/G, 5 × 2.675 kg | calc_ex (Z. 124) | 13,375 frt | 13,375 | 13,375 t > 13,280 m³ ✓ |
| 3 | Lücke „bei … Maß / bei … Gewicht“ | fill_blanks (Z. 128) | – | ✓ | (andere Lücken gesetzt, vertretbar) |
| 4 | „immer das höhere Ergebnis“ | fill_blanks (Z. 137) | höhere | ✓ | – |
| 5 | Gewichtsrate 5 × 2.675 kg, 123 USD/t | calc_ex (Z. 163) | 1.430,55 € | 1.430,55 € | 1.645,13 : 1,15 = 1.430,55 ✓ (ohne Zwischenrundung 1.430,54. Der Hinweis „mit gerundetem USD-Betrag weiter“ ist also nötig und richtig) |
| 6 | 1.875 kg × 70 €/t | calc_ex (Z. 172) | 131,25 € | 131,25 € | ✓ |
| 7 | Kran-LKW 98 t × 213,85 USD/t | calc_ex (Z. 181) | 18.223,74 € | 18.223,74 € | 20.957,30 : 1,15 ✓ |
| 8 | Druckmaschine Belem | calc_ex (Z. 222) | 1.913,72 € | 1.913,72 € | 22,932 × 95,97 = 2.200,78 : 1,15 ✓ |
| 9 | Industriepresse Maracaibo | calc_ex (Z. 231) | 3.106,76 € | 3.106,76 € | 3.572,77 : 1,15 = 3.106,76 ✓ (ungerundet 3.106,75, Hinweis nötig) |
| 10 | 5 Zusätze (M/G, W/M, per frt, in Schiffswahl, in Reeders Wahl) | **dialog_cards** (Z. 240) | 5 Begriffe | aufgedeckt | **keine Aufgabe** (siehe B1) |
| 11 | Abrechnung: m³ > t / m³ < t / frt | fill_blanks (Z. 254) | Maß/Gewicht/frt | ✓ | – |
| 12 | Kiste 4,8 m³ / 3,8 t + „Das bedeutet“ (2 Lösungen) | calc_ex + fill_blanks (Z. 280/284) | 1,263 | 1,263 | ✓ |
| 13 | Kiste 4,8 m³ / 6,5 t + „Das bedeutet“ (2 Lösungen) | calc_ex + fill_blanks (Z. 293/297) | 0,738 | 0,738 | ✓ |
| 14 | Maschine St. Petersburg 161,05 € M/G | calc_ex (Z. 307) | 2.061,44 € | 2.061,44 € | 11,904 m³ < 12,8 t → 12,8 × 161,05 ✓ |
| 15 | Baukran: frt, günstigstes Angebot, Preis | calc_ex + single_choice + calc_ex (Z. 332–354) | 414,196 / 29.790,25 € | ✓ / ✓ | Summe 414,196 m³ > 117,40 t. VdK 30.029,21 €, Little 19.363,66 GBP : 0,65 = 29.790,25 € ✓ |

Auch die eigenen Beispiele und Übungen habe ich nachgerechnet, alle richtig: 7,128 frt; 659,27 €; 576,00 €; 1,286; 297,50 €; 585,00 €. Ebenso alle Zahlen im question_set und in der Lernzielkontrolle: 3,2 frt; 4 m³/5,2 frt; 560 €; 6,0 frt; 320 €; 3 m³.
**Ergebnis: Keine Skript-Aufgabe fehlt, keine Musterlösung ist falsch.** Die Reihenfolge des Skripts bleibt erhalten.

---

## 1. Was die Klasse falsch lernen würde

Nichts Belastbares. Alle Musterlösungen stimmen mit den Werten der [LÖSUNG] überein. Die Zwischenrundung auf USD-Cent ist ausdrücklich angegeben, wo sie das Ergebnis verändert (Z. 164, 223, 232).

## 2. Was den Lerneffekt kostet

**B1 – Skript-Aufgabe in passive Karteikarten verwandelt (mittel, Kap. 1, dialog_cards Z. 240).**
Im Skript sind die fünf Zusätze für M/G-Raten fünf Lösungsfelder ([LÖSUNG]), die die Schüler selbst ausfüllen. In der Einheit sind sie Karteikarten, deren Vorderseite schon die Lösung zeigt („M/G“, „W/M“ …). Zum Erarbeiten bleibt nichts. Dasselbe Wissen steht außerdem schon im Accordion („M/G-Rate (W/M)“, Z. 60) und wird im Blitz-Quiz abgefragt, *bevor* der Abschnitt kommt (Z. 84).
Besser wäre ein `drag_words` oder `fill_blanks` mit Hinweisen, z. B. „englisch: *W/M*“, „je *Frachttonne*“, „in *Reeders* Wahl“.

**B2 – Feedback verrät das Ergebnis der nächsten Rechenaufgabe (mittel, Kap. 1, single_choice Z. 336 → calc_ex Z. 352).**
Die Auswahlfrage „Welche Reederei ist günstiger?“ kommt *vor* der Preisberechnung. Ihr Feedback nennt beide Endbeträge (29.790,25 € / 30.029,21 €). Danach wird genau 29.790,25 € als Rechenergebnis verlangt, die Rechenaufgabe ist damit wertlos. Dazu kommt: Die Auswahlfrage ist eine verkappte Rechenaufgabe mit zwei echten Optionen, also 50/50 ratbar (Prompt Regel 5: „niemals Rechenaufgaben in multiple_choice“).
Abhilfe: Reihenfolge Frachttonnen → beide Preise als calc_ex → erst dann die Auswahl, und zwar ohne Beträge im Feedback.

**B3 – Kapitelquiz und Lernzielkontrolle prüfen dasselbe, und zwar nicht die Kernkompetenz (mittel, question_set Z. 415, final_chapter Z. 485).**
Der Kern des Abschnitts sind 13 Rechenaufgaben: frt × Rate, Umrechnung von USD/GBP in €. Davon kommt im question_set (7 Fragen) **keine einzige** vor. Dort stehen nur Vergleiche in einem Schritt (Maß > Gewicht?), eine Begriffsfrage (Outsider), eine Regelfrage (Rundung) und eine Kursregel als richtig/falsch. In der Lernzielkontrolle (12 Fragen) ist es genauso.
Beide wiederholen dieselben Aussagen aus den Aufgaben des Kapitels:
- „Outsider = keiner Konferenz angeschlossen“: 5-mal abgefragt (Blitz-Quiz, mark_words, question_set, final MC, final summary)
- „bei M/G zählt der größere Wert“: über 8-mal (2× fill_blanks, drag_drop, summary, 2× question_set, 2× final)
- „gespalten → höhere Fracht“: 4-mal abgefragt plus 3 Erwähnungen
- „USD durch Kurs teilen“: 3-mal abgefragt plus 2 Erwähnungen

Die 70-%-Hürde wird so mit Faustregeln genommen, ohne dass einmal eine Fracht in Euro berechnet werden muss. Ursache ist ein Regelkonflikt im Prompt (siehe Abschnitt 4, S2).

**B4 – ratbare Fragen durch fachfremde Distractors (gering bis mittel, 3 Stellen).**
- Blitz-Quiz (Z. 69–78): „10 m³ / 1.000 m³“ je Frachttonne und „Schiffe ohne Ladung“ für Outsider sind absurd.
- final single_choice (Z. 549): Distractors „FOB“ und „LDM“ stammen aus einem anderen Sachgebiet.
- mark_words (Z. 91): Markiert werden soll „20 %“, das ist kein Fachbegriff.

Jede dieser Fragen ist ohne Stoffkenntnis lösbar.

## 3. Feinschliff

- **fill_blanks nehmen nur eine Schreibweise an.** Alternativen mit `/` gibt es nur bei Zahlen (`4/4,0/4,000`), nie bei Wörtern. Betroffen: `*Raummaß*` (Z. 286, „Maß“ ist auch richtig), `*Euro*` (Z. 528, „EUR“/„€“ werden abgelehnt), `*Kurs*` („Wechselkurs“), `*höhere*` (Z. 138, „größere“). Das Muster ist durchgängig, die Prompt-Regel (Z. 135) wird nur für Zahlen umgesetzt.
- **Alle fünf Bilder haben den Alt-Text „Abbildung aus dem Skript“.** Bei bild001–004 (Deckblatt, vermutlich Logos) ist das in Ordnung. Bei bild005 neben dem Merke-Kasten ließe sich der Text aus dem Kontext ableiten.
- **Section 4 (gespaltene Raten) ist ganz selbst erfunden:** eigenes Beispiel und eigene Übung (585 €). Das ist für sich sauber, siehe aber Abschnitt 5 (Teilschnitt).

---

## 4. Systematisch vs. einmalig

### S1 – Nur 1 Kapitel mit 57 Elementen: eine echte Prompt-Lücke (systematisch)

**Befund.** Der Prompt schreibt vor, wie *jedes* Kapitel aufgebaut ist (Z. 172–178, 357). Er sagt aber an keiner Stelle, **wann ein neues Kapitel beginnt** (Skript-Gliederung? Abschnittsnummern? Umfang?). Gleichzeitig verteuert er jedes weitere Kapitel: Pflicht sind dann Lernziele-Box, Accordion, summary mit questions, ein question_set mit 5–8 Fragen, ein „Wusstest du“-Kasten, eine Fallakte usw. Ein Sprachmodell, das an Kosten und Länge denkt, macht deshalb nur ein Kapitel. Das Skript gibt die Teilung klar vor: Allgemeines/Frachttonne – 1. Gewichtsraten – 2. Maßraten – 3. M/G-Raten (mit Baukran) – 4. gespaltene Raten.
Ein Nebeneffekt der Gestaltungsregel „Alle weiteren text-Elemente beginnen direkt mit dem gestylten `<h2>`“ (Z. 306): Die Einheit hat **19 Kapitelbalken (`<h2>`) innerhalb eines einzigen Kapitels**. Optisch gibt es damit Kapitel, technisch nicht.

**Folgen:**
- **Lernzielkontrolle:** Das question_set am Kapitelende soll „das nächste Kapitel freischalten“. Hier schaltet es nur die Lernzielkontrolle frei, die laut Prompt „aus allen Kapiteln“ fragt (Z. 345), also aus demselben einen Kapitel. Das sind zwei Abschlusstests über denselben Stoff (siehe B3): 7 + 12 Fragen, 10.738 Zeichen, 21 % der Antwort.
- **Rückmeldung zum Lernstand:** Ein Quiz nach 50 Elementen sagt nicht, *welcher* Ratentyp sitzt. Nach jedem Abschnitt ein kleines question_set würde genau das zeigen.
- **Abgeschnittene Antworten:** `kern.retten()` (kern.py, Abschnitt „Abgeschnittene Antworten retten“) schneidet **nur an Kapitelgrenzen**. Bricht eine kostenlose KI diese Antwort ab, bleibt bei einem einzigen Kapitel **nichts** übrig. Bei fünf Kapiteln wären es die fertigen. Das ist der schwerste praktische Effekt.

**Vorschlag für `CLAUDE.md`, Abschnitt Master-Prompt → KAPITELSTRUKTUR** (als Vorschlag, nicht eingetragen):
> „**Kapitel bilden:** Jeder nummerierte oder überschriebene Hauptabschnitt des Skripts wird ein eigenes Kapitel (Richtwert 8–20 Elemente). Ein Kapitel mit mehr als 25 Elementen ist zu teilen. Innerhalb eines Kapitels gliederst du mit `<h3>`, nicht mit `<h2>` – `<h2>` steht nur am Kapitelanfang.“

Maschinell prüfbar, gehört nach `qualitaet.py`: „Kapitel mit mehr als 25 Elementen“ als gelber Befund, „nur 1 Kapitel bei mehr als 30 Elementen“ als gelber Befund.

### S2 – Regelkonflikt: question_set soll anwenden, darf aber nicht rechnen (systematisch)

**Befund.** Drei Vorgaben widersprechen sich:
- Z. 178: question_set = Anwendungsebene mit „neuen Zahlen“.
- Z. 164: im question_set nur multiple_choice, single_choice, true_false, fill_blanks.
- Z. 104: „niemals Rechenaufgaben in multiple_choice/true_false“.

Das Modell weicht deshalb auf Rechnungen in einem Schritt oder als Auswahl aus (question_set Z. 455, final Z. 558) oder fragt Regeln ab. Eine echte Frachtberechnung kommt in keinem Abschlusstest vor (B3). Genau dieses Muster („alles erhalten“ gegen „nichts vorwegnehmen“) beschreibt die Anweisung als frühere Ursache.

**Vorschlag:**
> „Bei Rechen-Kapiteln enthält das `question_set` mindestens 2 `fill_blanks`-Fragen mit einer neuen, vollständigen Rechnung (neue Sendungsdaten, Ergebnis als Lücke mit Zahlvarianten, z. B. `*1.234,56/1234,56*`). Rechenfragen im question_set nie als Auswahl.“

### S3 – [LÖSUNG]-Inhalte landen in passiven Elementen (systematisch, Prompt-Lücke)

**Befund.** Der Prompt verbietet [LÖSUNG]-Inhalte nur in `text` und `calculation_example` (Z. 32, 98, 372). `accordion` und `dialog_cards` nennt er nicht, obwohl sie ebenso offen sichtbar sind. So stehen in Accordion und Karteikarten die Lösungen der Skript-Lücken („M/G-Rate (W/M)“, „über 1 = mehr als 1 mal messend → Maß“, die 5 Zusätze), bevor die Lücken kommen (B1). Das Accordion soll laut Z. 175 „alle Fachbegriffe des Kapitels“ enthalten, und das zieht die Lösungen dorthin.

**Vorschlag (Ergänzung zu Z. 32):**
> „… niemals in ein `text`-, `calculation_example`-, `accordion`- oder `dialog_cards`-Element. Begriffe, die das Skript als [LÖSUNG] abfragt, gehören nicht ins Accordion des Kapitels.“

Maschinell prüfbar: Die Prüfstelle sollte ihren Abgleich auf wörtliche [LÖSUNG]-Überschneidung auch auf `accordion.items[].term/definition` und `dialog_cards.cards[].front` ausdehnen.

### S4 – Ergebnisse in Feedbacks vor der zugehörigen Rechenaufgabe (einmalig, aber maschinell prüfbar)

B2 kommt hier nur einmal vor. Das Muster lässt sich aber billig erkennen: Erscheint das `result` einer `calculation_exercise` wörtlich in einem *vorangehenden* Feedback oder einer Antwortoption, ist das ein gelber Befund in `qualitaet.py`.

### S5 – Widerspruch PIL GmbH (systematisch im Prompt, hier folgenlos)

Der Vorrang-Hinweis (Z. 9) verbietet „PIL GmbH“. Z. 209–212, 236, 291, 394 schreiben sie vor. Das Modell hat sauber nach dem Vorrang gehandelt („deine Spedition“, Fallakte ohne Firmennamen). Der Widerspruch kostet aber Prompt-Länge und gefährdet schwächere Modelle. Vorschlag: die PIL-Absätze im Prompt für „Ganzes Skript“ streichen, statt sie nachträglich zu überstimmen.

Einmalig sind B2 und die Distractors in B4.

---

## 4a. Länge: wo viel Antwort wenig Lerneffekt bringt

| Baustein | Zeichen | Anteil | Lerneffekt | Einsparung |
|---|---|---|---|---|
| **Inline-CSS** (`style="…"`) | 9.237 | **18 %** | null (reine Gestaltung, wiederholt sich wörtlich: 19 `<h2>`-Balken, ~11 Ausgangssituations-, ~8 Arbeitsauftrag-Boxen) | Generator setzt das Design, KI schreibt nur Klassen bzw. Kurzmarker (`<div class="merke">`) → ca. –8.000 Zeichen |
| **Aufgabenrahmen-Texte** (text direkt vor calc_ex) | 10.134 | **20 %** (davon 58 % CSS) | gering: 12 Rahmen, die Situation und Daten wiederholen, die im `task` der folgenden calc_exercise noch einmal vollständig stehen (z. B. Baukran-Segmente doppelt, Z. 329 + 333) | Situation nur einmal, im `task`. Box nur bei echter Skript-Ausgangssituation → ca. –6.000 Zeichen |
| **final_chapter** | 6.636 | **13 %** | gering: Wiederholung des question_set (B3). Bei mehreren Teilen nimmt `kern.zusammenfuegen()` reihum höchstens 15 Fragen und 12 Sätze aus *allen* Teilen. Bei vermutlich 3 Teilen (55.494 Zeichen Skript ÷ 22.000) bleiben von den 12 Fragen dieses Teils ~5, von den 9 Sätzen ~4 | Im Teil-Prompt höchstens 5 Fragen und 4 Sätze verlangen → ca. –3.500 Zeichen |
| question_set | 4.102 | 8 % | mittel (siehe B3) | – (Inhalt verbessern, nicht kürzen) |
| summary + accordion + dialog_cards | 3.564 | 7 % | gering bis mittel, überschneiden sich stark (Outsider, M/G, gespalten je 3–5×) | Accordion auf 5 Begriffe, die keine Skript-Lösungen sind |
| Rechenelemente (13 calc_ex + 5 calc_example) | 5.731 | 11 % | **hoch** | – |

Fazit Länge: Rund 40 % der Antwort (CSS plus doppelte Aufgabenrahmen, teils überlappend) und weitere ~7 % verworfene Abschlussfragen bringen fast keinen Lerneffekt. Die eigentlichen Rechenaufgaben, der Kern des Skripts, machen nur 11 % aus. Bei ~12.500 Token liegt die Antwort im Bereich, in dem kostenlose KIs abbrechen. Zusammen mit S1 (nur ein Kapitel, also nichts zu retten) ist das das größte Ausfallrisiko dieser Einheit.

---

## 5. Was ich nicht beurteilen konnte

- **Teilschnitt mitten in Abschnitt 4.** Teil 1 endet nach Überschrift und Regelsatz von „4. Verschiedene Raten“. Das zugehörige Skript-Beispiel mit [LÖSUNG] (Kiste 1.815 kg / 1,598 cbm, 52 €/frt G, 64 €/frt M → 102,27 €) steht erst in `[[ABSCHNITT 10]]`, also in Teil 2. Der Prompt sagt dem Modell nicht, dass es Teil 1 von n bearbeitet. Es hat deshalb für Abschnitt 4 ein eigenes Beispiel, eine eigene Übung und eigene Quizfragen erfunden. Teil 2 wird dasselbe Thema mit dem Skript-Beispiel noch einmal bringen. Ob das nach `zusammenfuegen()` doppelt wirkt, kann ich ohne Teil 2 nicht prüfen. Hinweis an `kern.teilen()`: Es schneidet an `[[ABSCHNITT]]`-Grenzen, und ein Abschnitt aus Überschrift und Regelsatz ohne seine Aufgabe ist ein ungünstiger Schnittpunkt. Ein Satz im Teil-Prompt („Dies ist Teil x von n, das Skript geht weiter, für angeschnittene Themen keine eigenen Aufgaben ergänzen“) würde reichen.
- *(geklärt, siehe Nachtrag G1 unten)*

---

## Nachtrag G1 – Generator, nicht KI (mittel, betrifft 5 Rechenaufgaben)

Geprüft mit `h5p_generator._blanks_with_alternatives()`:
- `"13,280"` wird nur als `13,280` angenommen, `"414,196"` nur als `414,196`, `"1,263"` und `"0,738"` ebenso. Wer „13,28“ einträgt, also die korrekte Zahl ohne Nachkommanull, wird als falsch gewertet.
- `build_calculation_exercise` zeigt dabei den Hinweis „**Betrag in Euro** – € und Nachkommastellen sind optional“ (h5p_generator.py, `build_calculation_exercise`). Das ist doppelt falsch: Gesucht sind Frachttonnen bzw. ein Verhältnis und keine Euro, und die Nachkommastellen sind gerade **nicht** optional.

Betroffen sind calc_ex Z. 115, 124, 280, 293 und 332. Die Musterlösungen der KI sind richtig. Der Fehler liegt im Hinweistext und in den fehlenden Varianten für Nicht-Euro-Ergebnisse. Vorschlag: Bei `result` ohne Währungszeichen den Hinweis neutral formulieren („Zahl mit drei Nachkommastellen“) und Varianten ohne Nachkommanullen zulassen (`13,280/13,28`). Alternativ im Prompt `result: "13,280 frt"` mit Einheit verlangen und die Einheit im Hinweis anzeigen.
- **Inhalt der Bilder** bild001–005. Ob die Alt-Texte passen, kann ich ohne die Bilddateien nicht beurteilen.
