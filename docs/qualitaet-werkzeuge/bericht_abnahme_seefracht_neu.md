# Abnahme NACHHER: „Ganzes Skript → H5P“, Seefrachtrechnen Teil 1 (PROJ-68, neuer Prompt)

**Urteil:** Beide Läufe sind klar besser als VORHER, auch der schwächere. Fachlich sind beide fehlerfrei: Alle 14 Skript-Aufgaben sind da, jede [LÖSUNG] stimmt, und jede eigene Rechnung stimmt (alles nachgerechnet). Die drei Hauptbefunde von vorher sind behoben: ein Kapitel statt fünf, keine Rechnung im Kapitelquiz, Baukran-Ergebnis im Feedback. Inline-CSS ist auf 0 % gesunken.
**Schwächerer Lauf: Lauf 2.** Er bringt drei neue Mängel mit: Füllfragen zwischen den Skript-Rechnungen, eine Lernzielkontrolle, die das Kapitelquiz wörtlich wiederholt, und gespaltene Raten, bei denen die Abkürzung immer zum richtigen Ergebnis führt. Zwei davon gehen auf Lücken oder Widersprüche im Prompt zurück.

Ausgangslage Prüfstelle: beide grün.
- Lauf 1, 2 Tipps: „Zwei gleiche Aufgaben hintereinander“ (4 Stellen), „Nur eine Lücke im langen Text“ (Lernzielkontrolle).
- Lauf 2, 2 Tipps: „Zwei gleiche Aufgaben hintereinander“, „Feedback stark unsymmetrisch“ (Lernzielkontrolle).

Diese Tipps führe ich unten nicht noch einmal auf.
Gestaltung geprüft: `h5p_generator.apply_school_design` setzt alle verwendeten Kennzeichen um. Geprüft habe ich lernziele, ausgangssituation, mission, merke, achtung mit `data-titel="⭐ Prüfungsrelevant:"`, tipp, vergleich und `ol.schritte`. Danach ist kein `data-titel` mehr übrig, und die eigenen Titel samt Emoji werden übernommen. Die Antworten nutzen die Kennzeichen korrekt.

| | VORHER | Lauf 1 | Lauf 2 |
|---|---|---|---|
| Umfang | 49.961 Z. / ~12.500 Tok. | 39.810 Z. / ~9.950 Tok. (−20 %) | 46.834 Z. / ~11.700 Tok. (−6 %) |
| Kapitel / Elemente | 1 / 57 | 5 / 39 (9-7-6-12-5) | 6 / 52 (5-10-9-7-15-6) |
| Inline-CSS | 18 % | 0 % | 0 % |
| Skript-Aufgaben / [LÖSUNG] korrekt | 14/14 | 14/14 | 14/14 |
| Kapitelquiz mit neuer Rechnung | 0 von 1 | 5 von 5 | 5 von 5 Rechen-Kapiteln |
| Lernzielkontrolle: neue Rechnungen | 0 | 3 | **0** (beide Rechnungen sind Wiederholungen) |
| Wahr/Falsch (wahr : falsch) | – | 6 : 7 | 6 : 9 |
| Richtige Antwort = längste | – | 0 von 7 | 5 von 16 (nur 2 deutlich) |

Antwortreihenfolge und Fragenreihenfolge mischt der Generator (`randomAnswers`, `randomQuestions`). Dass die richtige Antwort oft an erster Stelle steht, schadet deshalb nicht.

---

## 0. Abgleich Vollständigkeit und Nachrechnung

| # | Skript-Aufgabe / [LÖSUNG] | Lauf 1 | Lauf 2 | geprüft |
|---|---|---|---|---|
| 1 | Venezuela M/G 2.623 kg → 13,280 frt | calc_ex K1 ✓ | calc_ex K2 ✓ | 2,656 × 5 = 13,280 > 13,115 t |
| 2 | Venezuela M/G 2.675 kg → 13,375 frt | calc_ex K1 ✓ | calc_ex K2 ✓ | 13,375 t > 13,280 m³ |
| 3 | Lücke „bei … Maß / bei … Gewicht“ | fill K1 ✓ | fill K2 ✓ | – |
| 4 | „immer das höhere Ergebnis“ | fill K1 (`*höhere*`) ✓ | fill K2 (`*höhere/größere*`) ✓ | – |
| 5 | Gewichtsrate 123 USD/t → 1.430,55 € | calc_ex K2 ✓ | calc_ex K3 ✓ | 1.645,13 : 1,15. Rundungshinweis steht in L1 im Merke-Kasten, in L2 in der Aufgabe |
| 6 | 1.875 kg × 70 €/t → 131,25 € | ✓ | ✓ | – |
| 7 | Kran-LKW → 18.223,74 € | ✓ | ✓ | 20.957,30 : 1,15 |
| 8 | Druckmaschine → 1.913,72 € | calc_ex K3 ✓ | calc_ex K4 ✓ | 22,932 × 95,97 = 2.200,78 : 1,15 |
| 9 | Industriepresse → 3.106,76 € | ✓ | ✓ | ohne Zwischenrundung 3.106,75. Hinweis vorhanden |
| 10 | 5 Zusätze (M/G, W/M, frt, Schiffswahl, Reeders Wahl) | drag_drop K4 | drag_drop K5 | siehe A3 |
| 11 | Abrechnung m³>t / m³<t / frt | fill K4 ✓ | fill K5 ✓ | – |
| 12 | Kiste 3,8 t → 1,263 + „Das bedeutet“ | calc_ex + fill ✓ | calc_ex + fill ✓ | 4,8 : 3,8 |
| 13 | Kiste 6,5 t → 0,738 + „Das bedeutet“ | calc_ex + fill ✓ | calc_ex + fill ✓ | 4,8 : 6,5 |
| 14 | St. Petersburg → 2.061,44 € | ✓ | ✓ | 11,904 m³ < 12,8 t |
| 15 | Baukran → 29.790,25 € | 1 calc_ex ✓ | calc_ex + single_choice danach ✓ | 414,196 m³ > 117,40 t. VdK 30.029,21 €, Little 19.363,66 GBP : 0,65 = 29.790,25 € |

Eigene Beispiele und Quizrechnungen, alle nachgerechnet und richtig:
- **Lauf 1:** 3,168 frt; 5,292 frt; 494,45 €; 619,20 €; 698,18 €; 1,800 m³; 1.420,80 €; 2,133; 2.288,00 €; 216,00 €; 304,50 €; 263,50 €; 1,200 frt; 470,40 €; 1.440,00 €.
- **Lauf 2:** 3,800 frt; 3,600 frt; 0,929 m³ (0,928625); 7,2 frt; 1.047,27 €; 952,00 €; 75 € statt 108 €; 6,4 frt; 672,00 €; 420,00 €; 0,648 m³; 1,500; 184,32 €; 480,00 €; 660,00 €; 550,00 €.

Auch die Zahlen in den Distraktoren stimmen (14,0 / 0,4 / 26,4 / 13,6 / 127,50 / 255,00 / 10,7 / 1,7).
**Ergebnis: Keine Skript-Aufgabe fehlt, keine Musterlösung ist falsch, die Reihenfolge des Skripts bleibt erhalten, und das in beiden Läufen.**

---

## (a) VORHER-Befunde: behoben oder fortbestehend

| Befund VORHER | Lauf 1 | Lauf 2 |
|---|---|---|
| **B1** 5 Zusätze als aufgedeckte Karteikarten, dazu vorab im Accordion und im Blitz-Quiz | **teilweise behoben.** Jetzt ein drag_drop, Accordion und Blitz-Quiz sind frei. Die Zuordnung ist aber über Schlüsselwörter lösbar (A3) | **behoben.** drag_drop „zeigt M/G an“ oder „etwas anderes“ mit CIF, FIO und THC als Distraktoren. Der Lehrtext sagt ausdrücklich „arbeitest du gleich selbst heraus“ |
| **B2** Feedback verrät das Baukran-Ergebnis vor der Rechnung | **behoben** (keine Auswahlfrage mehr) | **behoben.** Die Auswahlfrage steht jetzt *nach* der Rechnung, ihr Feedback nennt keine Beträge |
| **B3** Kapitelquiz und Lernzielkontrolle ohne Rechnung, dieselben Faustregeln doppelt | **weitgehend behoben.** In jedem Kapitelquiz eine neue Rechnung, in der Lernzielkontrolle 3 neue (darunter eine Sendung aus zwei Teilen als Transfer). Rest: 1 Wahr/Falsch-Aussage zum Verhältnis wiederholt K4 fast wörtlich | **im Kapitel behoben, in der Lernzielkontrolle nicht** (N2) |
| **B4** absurde, fachfremde Distraktoren | **fortbestehend, weniger** (A4) | **fortbestehend, weniger** (A4) |
| **G1** Hinweis „Betrag in Euro“ bei frt, „13,28“ abgelehnt | **behoben** im Generator: jetzt „in frt – die Einheit ist optional“ mit den Varianten `13,280 frt/13,280/13,28`. Kleiner Rest siehe F3 | wie Lauf 1 |
| **S1** nur 1 Kapitel, 19 `<h2>` darin, `kern.retten()` kann nichts retten | **behoben.** 5 Kapitel genau nach Skript-Gliederung, `<h2>` nur am Kapitelanfang | **behoben.** 6 Kapitel, weil „Allgemeine Berechnungsvorschriften“ als eigenes Überblickskapitel abgetrennt ist (siehe Länge) |
| **S2** Regelkonflikt: Kapitelquiz soll anwenden, darf aber nicht rechnen | **behoben** | **behoben** |
| **S3** [LÖSUNG] in Accordion und Karten | **behoben.** Kein Lösungsbegriff im Accordion, keine dialog_cards. Rest: Der Schritt-Kasten in K4 nennt „Der größere Wert ergibt die Frachttonnen“, kurz bevor die Lücke m³ > t / frt kommt (gering, einmalig) | **behoben** |
| **S4** Ergebnis im Feedback vor der zugehörigen Aufgabe | **behoben** | Beim Baukran behoben. **Das Muster taucht aber zwischen Kapitelquiz und Lernzielkontrolle wieder auf** (N2: 0,929) |
| **S5** PIL-GmbH-Widerspruch im Prompt | **behoben** (der neue Prompt nennt PIL nicht mehr) | **behoben** |
| **Länge** CSS 18 %, doppelte Aufgabenrahmen 20 %, final 13 % | **behoben:** CSS 0 %, kein Rahmen-Text mehr vor den Rechenaufgaben, final 10 % | CSS 0 %, keine Rahmen. Dafür neu: Füllfragen 10 % (N1) |
| Feinschliff: fill_blanks nehmen nur eine Schreibweise an | **teilweise.** `*Raummaß/Maß*` und `*frt/Frachttonne*`, aber `*höhere*` und `*größer*` ohne Varianten | **besser.** `*höhere/größere*`, `*größer als/größer/>*`, Zahlen mit 3–4 Varianten |
| Feinschliff: Alt-Text bild005 „Abbildung aus dem Skript“ | fortbestehend | fortbestehend |
| Abschnitt 5: Teilschnitt mitten in „4. gespaltene Raten“ | **fortbestehend.** Eigenes Beispiel, eigene Übung und eigenes Quiz erfunden. Der Prompt sagt weiterhin nicht „Teil x von n“ | **fortbestehend** |

---

## (b) NEUE Mängel

### 1. Was die Klasse falsch lernen würde
Nichts. In keinem Lauf gibt es einen fachlichen Fehler.

### 2. Was den Lerneffekt kostet

**N1 – Füllfragen zwischen den Skript-Rechenaufgaben (mittel, nur Lauf 2, systematisch, Prompt-Widerspruch).**
Lauf 2 schiebt zwischen aufeinanderfolgende `calculation_exercise` 8 eigene Wahr/Falsch- und Auswahlfragen:
- K2: TF „Eine Frachttonne ist entweder 1 t oder 1 m³“ direkt unter dem Merke-Kasten, der genau das sagt.
- K3: 1 TF und 1 single_choice.
- K4: 1 TF.
- K5: 1 multiple_choice zu W/M, 1 TF „Segment einzeln?“ direkt vor dem Baukran, 1 single_choice „welche Reederei“ danach.
- K6: 1 TF.

Zusammen sind das 4.672 Zeichen, 10 % der Antwort. Fast alle fragen einen Satz ab, der zwei Elemente vorher im Lehrtext stand (Reproduktion, kein Lerngewinn). Mehrere nehmen außerdem die Denkleistung der folgenden Skript-Aufgabe vorweg: „Raummaß spielt keine Rolle“ steht vor dem Kran-LKW mit den Ablenk-Maßen, „Gesamtsendung statt Segment“ vor dem Baukran.
*Ursache:* Zwei Regeln widersprechen sich.
- Regel 2: „Gleiche Typen nie zweimal direkt hintereinander“. Die Prüfstelle prüft das auch („Zwei gleiche Aufgaben hintereinander“).
- PRIORITÄT 2: „Eigene Aufgaben nur dort, wo ein Abschnitt keine Skript-Aufgabe hat“.

Das Skript stellt aber Rechenaufgaben direkt nacheinander („Aufgaben: …“). Lauf 1 hat die Typregel gebrochen und dafür einen Tipp der Prüfstelle bekommen, Lauf 2 hat Füllstoff eingeschoben. Das ist dasselbe Muster wie der frühere Einbruch, als „alles erhalten“ gegen „nichts vorwegnehmen“ stand.

**N2 – Die Lernzielkontrolle wiederholt das Kapitelquiz wörtlich und ist teils vorgelöst (mittel, Lauf 2 deutlich, Lauf 1 schwach, systematisch, Prompt-Lücke).**
In Lauf 2 sind 3 der 8 Fragen Wiederholungen:
- **184,32 €:** Die Lückenaufgabe ist Zeichen für Zeichen identisch mit dem Kapitelquiz in K5.
- **0,929 m³:** Dasselbe Packstück (1,15 × 0,85 × 0,95) war in K2 schon eine Auswahlfrage. Dort stand 0,929 als richtige Option, das Feedback rechnete es sogar vor („0,928625 m³ wird … gerundet“).
- **„Verhältnis 0,85“:** Dieselbe Aussage wie im Kapitelquiz K5, nur mit umgedrehtem Wahrheitswert.

Die Lernzielkontrolle enthält damit **keine einzige neue Rechnung**. Wer das Kapitelquiz bestanden hat, hat 2 der 8 Antworten schon gesehen, und das sind schon gut ein Drittel der 6 Punkte, die die 70-%-Hürde verlangt.
In Lauf 1 wiederholt nur eine Wahr/Falsch-Aussage („Verhältnis über 1 → Gewicht“) die Frage aus K4.
*Ursache:* Der Prompt verlangt „nur neue Fälle, keine Wiederholung“ nur für das `question_set` im Kapitel. Für `final_chapter` heißt es nur „8 Fragen aus allen Kapiteln, gemischt, Anwendung“, und „aus allen Kapiteln“ liest das Modell als „aus den Kapitelquizzen“.

**N3 – Gespaltene Raten: Die Abkürzung führt immer zum richtigen Ergebnis (mittel, nur Lauf 2, einmalig).**
Beispiel (5 t / 8 m³), Übung (12 t / 9 m³) und Quizaufgabe (6 t / 10 m³) sind so gewählt, dass die größere Menge auch die höhere Fracht ergibt. Wer fälschlich wie bei M/G rechnet (größere Zahl nehmen, nur diese Seite ausrechnen), löst alle drei richtig. Der Merke- und der Tipp-Kasten warnen genau vor diesem Fehler, prüfen ihn aber an keiner Stelle.
Lauf 1 macht es vorbildlich. Bei 3,5 m³ / 2,9 t ergibt das Gewicht die höhere Fracht (304,50 €), ebenso bei 4,2 m³ / 3,1 t (263,50 €).

**A3 – Die Zuordnung der Zusätze ist über Schlüsselwörter lösbar (gering bis mittel, nur Lauf 1, einmalig).**
Die Kategorien heißen „Kürzel für Maß und Gewicht“, „Abrechnung je Einheit“ und „Wahl liegt bei der Reederei“. Die Begriffe stehen mit Auflösung da: „M/G (Maß/Gewicht)“, „W/M (Weight/Measurement)“, „in Reeders Wahl“. Jeder Begriff passt also wörtlich zu seiner Kategorie, eine Kategorie hat nur einen einzigen Begriff.
Dazu kommt: Die Einteilung legt nahe, die fünf Zusätze bedeuteten Verschiedenes. Das Skript sagt aber, dass **alle fünf** die Abrechnung nach Maß oder Gewicht anzeigen. Lauf 2 trifft genau diese Kernaussage.

**A4 – Fachfremde oder absurde Distraktoren (gering, beide Läufe, systematisch).**
- Lauf 1: „1,500 m³, weil nur die Länge zählt“ (K3), „weil 1,500 näher an der Zahl 1 liegt“ (K4), „Spediteur ohne eigenes Lagerhaus“ und „Kunde ohne Rahmenvertrag“ beim Outsider (Lernzielkontrolle).
- Lauf 2: „UNO-Einheitstarif“ und „Staatsreederei mit Behördentarif“ (K1), die drei erfundenen Auflösungen von W/M („Wertzoll/Mehrwert“, „Wechselkurs/Marge“, „Wartezeit/Miete“, K5), und dreimal „…, weil der Unterschied zählt“ (K2, K3, Lernzielkontrolle).

Ursache ist wahrscheinlich die feste Zahl von 4 Optionen. Wo es nur ein oder zwei echte Missverständnisse gibt, füllt das Modell mit Unsinn auf.

### 3. Feinschliff

- **F1 – Baukran nur noch mit einem Ergebnisfeld (beide Läufe).** Das Ergebnis 29.790,25 € wird geprüft. Die [LÖSUNG]-Zwischenwerte 414,196 frt und 30.029,21 € (Van der Kerk) prüft keine Aufgabe mehr. VORHER war die Frachttonnen-Rechnung eine eigene Aufgabe. Bei einer Aufgabe mit 5 Segmenten und 2 Angeboten erfährt die Schülerin so nicht, *wo* sie sich verrechnet hat. Typischer Fehler: Sie trägt 30.029,21 € ein, weil sie das falsche Angebot gewählt hat. Vorschlag: Bei mehreren [LÖSUNG]-Werten in einer Skript-Aufgabe wird jeder Zwischenwert zu einer eigenen `calculation_exercise`.
- **F2 – Zahl-Lücken im Quiz nehmen zu wenige Schreibweisen an (Lauf 1, systematisch).** Die `fill_blanks` im Quiz erweitert der Generator nicht (nur `calculation_exercise` läuft durch `_blanks_with_alternatives`). Lauf 1 hat das Prompt-Muster `*1.234,56 €/1.234,56*` wörtlich übernommen. Abgelehnt werden deshalb „1,2“ (`*1,200/1,200 frt*`), „2288“ (`*2.288,00 €/2.288,00*`), „1440“ und „619,2“. Lauf 2 gibt selbst mehr Varianten an. **Maschinell lösbar:** In `build_fill_blanks` jede rein numerische Lücke durch `_blanks_with_alternatives` schicken. Dann hängt es nicht mehr am Modell.
- **F3 – Hinweistext des Generators uneinheitlich.** Bei `13,280 frt` steht „auf 2 Nachkommastellen genau“, bei `13,375 frt` „auf 3 Nachkommastellen genau“. Der Merke-Kasten fordert drei Stellen. Vorschlag: Bei Einheiten wie frt oder m³ die Stellenzahl des `result` nennen, ohne die Endnullen abzuziehen, und die kürzere Form trotzdem annehmen.
- **F4 – `*m³ > t/m³>t*` (Lauf 2, K5).** Die Schülerin muss ein hochgestelltes ³ tippen. „m3 > t“ und „Maß > Gewicht“ werden abgelehnt.
- **F5 – „Fast!“ bei offensichtlich falschen Antworten (beide Läufe, Lauf 1 14-mal, Lauf 2 22-mal).** Beispiele: „Fast! Mit dem Lager hat das nichts zu tun“, „Fast! W/M hat nichts mit Zoll zu tun“. Der Prompt gibt „Fast! …“ als Beispiel für ermutigendes Feedback, das Modell setzt es pauschal ein. Vorschlag: „‚Fast!‘ nur bei knapp falschen Antworten (Rundung, Verwechslung zweier ähnlicher Fälle).“

---

## (c) Urteil je Lauf

| Lauf | Urteil | Begründung |
|---|---|---|
| **Lauf 1** | **deutlich besser** als VORHER | Alle Hauptbefunde behoben. In jedem Kapitelquiz eine neue Rechnung, die gespaltenen Raten werden echt geprüft, keine Füllfragen, 20 % kürzer. Rest: A3, A4, F1, F2 |
| **Lauf 2** | **besser** als VORHER | S1, S2, B1, B2 und CSS behoben, B1 sogar besser als in Lauf 1. Neu dazugekommen sind N1, N2 und N3. Nur 6 % kürzer, weil die Einsparung bei CSS und Aufgabenrahmen zum Teil in Füllfragen, ein Überblickskapitel ohne Skript-Aufgabe und eine doppelte Lernzielkontrolle fließt |

## (d) Bewertet wird der schlechtere Lauf: Lauf 2

**Gesamturteil: besser als VORHER, aber noch nicht gut.** Die strukturellen Ausfallrisiken von vorher sind weg: ein Kapitel, also nichts zu retten, keine Rechnung im Abschluss, 18 % CSS. Fachlich ist alles richtig, und B1 löst Lauf 2 besser als Lauf 1.
Den Lerneffekt kosten zwei Prompt-Lücken, die das Modell in beiden Läufen mal trifft und mal nicht:
- **N1** (Typregel gegen Ergänzungsverbot) ist der Grund, warum Lauf 2 Füllstoff einschiebt.
- **N2** (keine Neu-Regel für `final_chapter`) ist der Grund, warum die Lernzielkontrolle wiederholt.

Beide sind mit je einem Satz behebbar. Dann wäre Lauf 2 etwa so gut wie Lauf 1, denn N3 ist einmalig.

## Systematisch vs. einmalig, mit Formulierungsvorschlägen (nicht eingetragen)

| Befund | Art | Vorschlag |
|---|---|---|
| **N1** | systematisch, Regelwiderspruch | In AUFGABEN – GRUNDPRINZIP, Regel 2 ergänzen: „*Ausnahme: Rechenaufgaben des Skripts dürfen direkt aufeinander folgen. Schiebe nie eigene Fragen zwischen Skript-Aufgaben, nur um den Typ zu wechseln.*“ **Für `qualitaet.py`:** den Tipp „Zwei gleiche Aufgaben hintereinander“ für `calculation_exercise` abschalten. Sonst erzeugt die Prüfstelle selbst den Druck zum Füllstoff |
| **N2** | systematisch, Prompt-Lücke | ABSCHLUSSKAPITEL: „*8 **neue** Anwendungsfälle aus allen Kapiteln. Keine Frage, kein Zahlenbeispiel und kein Packstück aus einem Kapitelquiz wiederholen. Mindestens 2 neue Rechnungen als `fill_blanks`.*“ **Maschinell prüfbar:** gleiche `fill_blanks`-Texte oder dieselbe Zahlenfolge in `final_chapter` und in einem `question_set` als gelber Befund |
| **A4** | systematisch | Regel 3 ergänzen: „*Lieber 3 echte Optionen als 4 mit einer absurden. `single_choice` mit 3 Optionen ist erlaubt.*“ |
| **F2** | systematisch, Generator | `build_fill_blanks`: numerische Lücken automatisch um Varianten erweitern (siehe oben) |
| **F5** | systematisch, Prompt-Beispiel | siehe oben |
| **N3** | einmalig | Optional allgemein, unter RECHENAUFGABEN: „*Bei Vergleichsregeln (M/G, gespaltene Raten, günstigstes Angebot) enthält mindestens eine Aufgabe einen Fall, in dem die naheliegende Abkürzung falsch ist.*“ |
| **A3**, **F4** | einmalig | Nachbesserungs-Prompt genügt |
| **F1** | mittelbar systematisch | RECHENAUFGABEN: „*Enthält die [LÖSUNG] einer Skript-Aufgabe mehrere Zwischenergebnisse (z. B. frt, dann Preis je Angebot), wird jedes zu einer eigenen `calculation_exercise`.*“ |
| Teilschnitt | systematisch (fortbestehend) | in `kern.teilen()` bzw. im Teil-Prompt: „*Dies ist Teil x von n. Für ein Thema, das am Ende nur angeschnitten ist, keine eigenen Aufgaben ergänzen.*“ |

---

## (e) Länge: Was kostet jetzt am meisten, und lohnt es sich?

| Baustein | Lauf 1 | Lauf 2 | Lerneffekt | Bewertung |
|---|---|---|---|---|
| question_set (Kapitel) | 9.069 Z. (26 %) | 10.194 Z. (25 %) | **mittel bis hoch.** Jetzt mit echten neuen Rechnungen. Etwa die Hälfte der Wahr/Falsch- und Auswahlfragen sagt aber nur Regeln aus dem Lehrtext nach. Je Option ein Feedback-Satz | lohnt sich überwiegend. Kürzen, indem die Regel-Nachsagen wegfallen, nicht die Rechnungen |
| text (Lehrtext) | 9.736 Z. (28 %) | 9.213 Z. (23 %) | **hoch**, denn er trägt den Skript-Inhalt. Davon sind ~4.400 Z. (11 %) Lernziele-Boxen (~1.700), Ausgangssituationen (~1.400) und Tipp/Achtung (~1.200) | Lernziele mit 4 Punkten × 5–6 Kapitel sind Pflicht und bringen wenig. 2–3 Punkte würden reichen |
| accordion | 3.309 Z. (9 %) | 3.763 Z. (9 %) | **gering.** Die Pflicht von 5–8 Begriffen je Kapitel erzwingt bei 5–6 Kapiteln ~30 Begriffe. Viele sind trivial („Reederei“, „Segment“, „Alternative“, „Verschiffung“) oder doppelt (L1: Kolli 2×, Frachtrate 2×, Maß-/Gewichtsrate 2×; L2: Raummaß 3×, Kubikmeter 2×) | **größte Einsparung ohne Verlust.** Vorschlag: „*`accordion` nur, wenn das Kapitel mindestens 5 neue Fachbegriffe hat. Kein Begriff in zwei Kapiteln.*“ Das spart etwa 2.000–2.500 Z. |
| final_chapter | 4.077 Z. (10 %) | 3.945 Z. (9 %) | L1 mittel, **L2 gering** (N2). Bei mehreren Teilen nimmt `kern.zusammenfuegen()` ohnehin nur einen Teil davon | im Teil-Prompt höchstens 5 Fragen und 4 Sätze, dafür neu (N2) |
| eigene Einzelfragen im Kapitel | 0 | 4.672 Z. (10 %) | **gering** (N1) | entfällt mit dem N1-Satz |
| Überblickskapitel ohne Skript-Aufgabe (nur L2) | – | ~3.800 Z. (8 %), 9 Abfragen zu 3 Fakten (Outsider, keine Tarife, Wert) | gering | Mit „Hauptabschnitt“ ist nicht eindeutig gesagt, ob „Allgemeine Berechnungsvorschriften“ ein eigenes Kapitel wird. Vorschlag: „*Ein Abschnitt ohne eigene Skript-Aufgabe wird mit dem folgenden Kapitel zusammengelegt.*“ |
| Rechenelemente (calc_ex + calc_example) | 6.062 Z. (15 %) | 5.904 Z. (13 %) | **hoch**, das ist der Kern | – |

**Fazit Länge:** Was VORHER am meisten kostete, ist weg: CSS und doppelte Aufgabenrahmen, zusammen ~40 %. Jetzt kosten **Kapitelquiz und Lehrtext** am meisten (je ~25 %), und beide lohnen sich überwiegend. Wenig bringen noch:
- **Lauf 1:** ~20 % (Accordion-Pflicht, Lernziele-Boxen, Teile der Lernzielkontrolle)
- **Lauf 2:** ~35 %. Zu denselben Teilen kommen Füllfragen, Überblickskapitel und doppelte Lernzielkontrolle.

Mit N1, N2 und der Accordion-Regel käme ein Lauf wie Lauf 2 auf etwa 9.000–9.500 Token, ohne Lerneffekt zu verlieren. Weil die Einheit jetzt 5–6 Kapitel hat, kann `kern.retten()` eine abgebrochene Antwort an den Kapitelgrenzen retten. Das größte Ausfallrisiko von VORHER ist damit gebannt.

---

## Was ich nicht beurteilen konnte

- Ob Teil 2 die gespaltenen Raten mit dem Skript-Beispiel (102,27 €) noch einmal bringt und ob das nach `zusammenfuegen()` doppelt wirkt. Teil 2 liegt nicht vor.
- Inhalt von bild005: Ob ein passender Alt-Text abzuleiten wäre, kann ich ohne die Bilddatei nicht sagen.
- Wie sich die Prüfstelle nach der Änderung an N1 verhält. Ich habe `qualitaet.py` nicht geändert.
