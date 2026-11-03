# Abnahme NACHHER: „Ganzes Skript → H5P“, STG Heft 2, neuer Prompt (PROJ-68)

**Grundlage:** neuer Prompt `neu/prompt_heft2_skript.txt`, Skripttext `heft2_skript.txt` (alte Einlesung: Situation 3/4, § 462-Überschrift und Aufgabenanfänge fehlen, auf beiden Seiten des Vergleichs gleich). Lauf 1 `neu/antwort_heft2_skript_1.yaml` (7 Kapitel, 89 Elemente, ~19.500 Token), Lauf 2 `neu/antwort_heft2_skript_2.yaml` (9 Kapitel, 87 Elemente, ~20.300 Token). VORHER: `antwort_heft2_skript.yaml` (6 Kapitel, 96 Elemente, ~29.550 Token) und der Bericht `bericht_abnahme_heft2_skript.md`.
Beide Läufe habe ich über `kern._antwort_laden(…, "skript", "h5p")` geladen, also mit der Angleichung der Auswahlfragen.

**Prüfstelle (nach Angleichung):** Lauf 1 grün, Tipp „zwei gleiche Aufgaben hintereinander“ (Kap. 7). Lauf 2 grün, Tipp „richtige Antwort meist die längste“. `messe_antwort.py` lädt ohne Angleichung und meldet deshalb für Lauf 1 rot (12 × „keine richtige Antwort“). Das sind die 6 Kurzform-Fragen. Bilder: jeweils 3 von 4 vorhanden, es fehlt nur das Logo, und das ist gewollt.
**Design:** Stichprobe über alle `text`-Elemente beider Läufe. `schuldesign_anwenden` setzt alle 9 benutzten Kennzeichen um (lernziele, ausgangssituation, arbeitsauftrag, merke, tipp, achtung, vergleich, schritte, zebra), danach bleibt kein `class=` übrig. Inline-CSS liegt bei 0 % (VORHER 15 %).

**Kurzurteil:** Der neue Prompt bringt, was er versprochen hat. Die Antwort ist ein Drittel kürzer, das CSS ist weg, die Feedback-Floskeln sind weg, und die drei im VORHER fehlenden Skript-Aufgaben sind da. Alle Rechnungen stimmen, auch die neuen in den Kapitelquizzen. **Lauf 1 ist klar besser als VORHER, Lauf 2 nur leicht besser.** Lauf 2 hat die VORHER-Muster „richtige = längste“ und „Lösung in der Aufgabe“ behalten und bringt eigene neue Vorwegnahmen mit. Die neue Wahr/Falsch-Regel ist übererfüllt: Statt „fast alles wahr“ ist jetzt fast alles falsch.

---

## 1. Was die Klasse falsch lernen würde

| # | Lauf | Fundstelle | Befund |
|---|---|---|---|
| F1 | **beide** | Kap. 2, Aufgabe 1.10 (L1 `drag_words`, L2 `fill_blanks` „Wie haftet der **Fixkostenspediteur**?“) | Die [LÖSUNG] hinter dem Bild auf S. 3 (Obhuts- gegen Verschuldenshaftung) gehört zur verlorenen Überschrift „2. Die Haftung des Spediteurs“. Beide Läufe hängen sie an den Fixkostenspediteur. L1 schreibt ausdrücklich: „Der Fixkostenspediteur haftet unabhängig vom Verschulden … Ohne Obhut haftet er, wenn ihm ein Verschulden nachgewiesen werden kann.“ Das widerspricht dem Lehrtext zwei Elemente davor und dem eigenen Kapitelquiz („haftet wie ein Frachtführer auf der gesamten Strecke“). VORHER stand hier neutral „Wie haftet der Spediteur?“, der Fehler ist also **neu**. Auslöser ist die Einlesung, die Klasse lernt es trotzdem falsch. |
| F2 | L1 | Kap. 2, „Fall Brandl“ (erfunden) + Aufgaben 3, 4, 6 | Ein einziger erfundener Fall (Stapler fährt im Umschlaglager gegen eine Palette) soll vier Aufgaben tragen und widerspricht sich dabei. In Aufg. 3 haftet die Firma, „weil der Mitarbeiter den Schaden verschuldet hat“. Aufg. 4 fragt nach der Befreiung von der *Verschuldens*haftung (§ 461 Abs. 2). Aufg. 6 erklärt dagegen ausgerechnet die Antwort „Verschuldenshaftung, weil der Mitarbeiter schuld ist“ für falsch: „Das Gut war in Obhut, es kommt nicht auf Verschulden an.“ Im Skript gehören 3/4 zu Situation 3 (Verschulden, ohne Obhut) und 5/6 zu Situation 4 (Umschlagslager, Obhut). Die KI hat zwei Fälle zu einem verschmolzen. |
| F3 | L2 | Kap. 9, Zusammenfassungstabelle | Die Lager-Spalte („wird in der 11. Jgst. behandelt“) ist mit Inhalten gefüllt, die die KI rekonstruiert hat. Dabei ist das Haftungsprinzip verrutscht: Speditionsgeschäft = nur „Obhutshaftung“, Lagergeschäft = „Verschuldenshaftung“. Güterschäden „max. 8,33 SZR“ ist über alle drei Spalten gezogen, obwohl der Lagerhalter nach § 475 HGB unbegrenzt haftet. Die Tabelle widerspricht damit Kap. 2/3 desselben Laufs (organisierender Spediteur = Verschuldenshaftung). L1 hat die Tabelle richtig (Spedition „Obhutshaftung / Verschuldenshaftung“, Lager nur als Hinweis). |
| F4 | L2 | final, MC „entgangener Gewinn“, Distraktor „Er ersetzt sie unbegrenzt bei Vorsatz.“ | Dieser Distraktor ist fachlich **richtig**: Nach § 435 HGB entfallen bei Vorsatz und Leichtfertigkeit alle Haftungsgrenzen, auch für Folgeschäden. Das Feedback lautet nur „dies ist nicht Teil der Aufgabenstellung“, ist also leer und lässt den Widerspruch stehen. Ähnlich in Kap. 6, MC zu 3.500 €: „nur bei grober Fahrlässigkeit“ mit dem Feedback „auch das ändert nichts“. Das ist als absolute Aussage ebenfalls zu stark. |
| F5 | L2 | Kap. 5, Lehrtext | Der Tippfehler des Skripts „Nach HGB (§ 421) haftet der **Spediteur**“ ist wörtlich übernommen. VORHER und L1 korrigieren ihn zu § 431 und Frachtführer. Kein Fehler der KI im engeren Sinn, aber die Lehrkraft sollte ihn im Skript beheben. |

**Nachgerechnet und richtig (beide Läufe):** 864,00; 2.811,38 (270 × 8,33 × 1,25 = 2.811,375); 0,00 (Sit. 2); 2.000,00 (Sit. 3); 2.082,50 (Sit. 4, Folgeschaden 1.600 nicht ersetzt); 20.000 / 19.000 / 4.165 / 14.835 / 1.000 (8.1); 22.347,90 + 5.959,44 = 28.307,34; 3.180,6 kg × 8,33 × 1,25 = 33.117,9975 → 33.118,00 (nur L1 fragt das ab); 3 × 475 = 1.425 > 1.050; Gesamt 29.357,34 €.
**Eigene Beispiele und neue Quizrechnungen, alle richtig:** L1: 50 kg × 2,40 = 120,00; 150 × 8,33 × 1,20 = 1.499,40; 80 kg × 0,90 = 72,00; 320 × 8,33 × 1,30 = 3.465,28; 100 × 8,33 × 1,25 = 1.041,25; 80 × 8,33 × 1,25 = 833,00 (< 960); 500 × 8,33 × 1,20 = 4.998 (< 6.000). L2: 120 × 8,33 × 1,10 = 1.099,56 (> 540); 250 × 2,50 = 625; 150 × 8,33 × 1,20 = 1.499,40 (> 960); 250 × 20 × 1,10 = 5.500 / 250 × 8,33 × 1,10 = 2.290,75; 1.200 × 8,33 × 1,20 = 11.995,20 (< 14.400); 3 × 600 = 1.800; 100 × 30 × 1,20 = 3.600 / 999,60; 80 × 8,33 × 1,20 = 799,68 (> 720).
**Paragraphen:** §§ 425, 426, 427, 431, 449 (Korridor 2–40 SZR, nur innerdeutsch), 461 Abs. 2, 408/410/411/413 sind richtig zugeordnet, die Absenderhaftung „8,33 SZR, Verbraucher nur bei Verschulden“ ebenfalls. Die beiden VORHER-Fehler sind beseitigt: „doppelte Fracht“ steht nur noch als Distraktor mit richtigem Feedback (L2), und „Fahrer = ausführender Frachtführer“ kommt nicht mehr vor (L2 final: „der Fahrer haftet nicht gegenüber dem Kunden“). Das Prompt-Beispiel „5 SDR“ ist zu „§ 431, 8,33 SZR“ korrigiert.

## 2. Was den Lerneffekt kostet

**Vollständigkeit** (Skript: 1.1–1.10, 3–6, Schadensarten-Zuordnung, Positionstabelle, 6.1/6.2 für Sit. 1–4, § 462, Korridor-Tabelle, 8.1 in 5 Teilen, 8.2, Übung 1, 2.1–2.3, 3 in 5 Teilen, 4.1, 4.2, 5.1, 5.2, 6.1–6.4, 7.1–7.5):
- **L1: vollständig.** Jede [LÖSUNG] ist eine eigene Abfrage, auch 3.180,6 kg und 33.118 €.
- **L2: eine Lücke.** Übung 3, maximale Haftung (3.180,6 kg, 33.118,00 €) wird nicht gefragt. Der Wert steht stattdessen **in der Aufgabenstellung** der Gesamtrechnung („liegt unter der Höchstgrenze von 33.118,00 € … Lieferfrist 1.050 € (Höchstgrenze 1.425 €) … 3.500 € werden nicht ersetzt. Gesamthöhe?“). Damit sind zwei [LÖSUNG]-Werte vorweggenommen, und die Gesamtrechnung schrumpft auf 28.307,34 + 1.050. Das ist genau das „bloße Zusammenzählen gegebener Zahlen“, das der Prompt verbietet. Dazu fehlt die Ausgangssituation der Übung ganz, die Daten stehen verstreut in den Teilaufgaben.

**Vorwegnahme** (sinngemäß, die Prüfstelle findet sie nicht):
- **L2, Kap. 8, `drag_drop` 6.1:** „Frachtführer Berthold (*verspricht die Transportausführung*)“, „Knobel (*führt den Transport tatsächlich aus*)“. Die Lösung steht in Klammern, **wörtlich der VORHER-Befund, fortbestehend**. L1 hat ihn behoben.
- **beide, Begegnungsverkehr 7.1/7.2:** In L1 erklärt eine Tipp-Box am Kapitelanfang „Fahrer sind am selben Tag wieder zu Hause“, das löst 7.2. Das Accordion nennt „Wechselbrücke (WAB)“ und „Ladeeinheit … z. B. eine Wechselbrücke“, das sind die Lücken von 7.1. In L2 definiert das Accordion genau die Lückenwörter von 7.1 (Wechselbrücke, Ladeeinheit, Abgangsort) und dazu „Treffpunkt: Ort, an dem die Fahrer ihre Ladeeinheiten tauschen“. **Der VORHER-Befund besteht fort**, die neue Regel „accordion nur Begriffe ohne eigene Skript-Aufgabe“ wirkt hier nicht.
- **L2, Kap. 2, Aufg. 5 und 6:** Weil Situation 3/4 fehlen, fragt L2 abstrakt und nimmt die Begründung in die Frage: „Welches Recht gilt, wenn der Schaden *nicht beim Transport* … entstanden ist?“ ist die [LÖSUNG] „da nicht bei Transport entstanden“. „Welches Prinzip gilt, wenn das Gut *in der Obhut* … beschädigt wird?“ führt direkt zu „Obhutshaftung“. Beides wie VORHER Kap. 2.
- **L2, Kap. 4, Sit. 3:** Die Beschreibung lautet „Ein Verschulden des Spediteurs liegt vor … Schaden 2.000,00 €“, die Lücken sind *Verschulden* und *2.000,00*. Nur „unbegrenzt“ bleibt zu denken.
- **L2, Kap. 4, Sit. 4:** Der [LÖSUNG]-Zwischenwert 1.600 € steht als Distraktor („Ja, in voller Höhe von 1.600,00 €“) und wird nie gerechnet. VORHER stand er in der Frage, jetzt in milderer Form.
- **L2, final, single_choice:** „Wie nennt man den Ausführenden?“ führt zu „Ausführender Frachtführer“. Die Frage enthält die Antwort.
- **beide, Kap. 5:** Das Accordion „Regelhaftung = 8,33 SZR je kg“ steht direkt vor der Lücke „Regelhaftung von *8,33*“. Das TF zur 38-SZR-Erhöhung (eigene Ergänzung) nennt im Feedback die Regelhaftung 8,33 für Ferntrans, bevor 8.1 (Ferntrans) und 8.2 gefragt werden. Das ist leicht, aber in beiden Läufen gleich.
- **L1, Kap. 6, 4.1:** Die vier Fälle der Absenderhaftung (die eigentliche [LÖSUNG]) stehen vorgegeben im Text, abgefragt werden nur die Paragraphennummern 411/408/410/413. Lernkern verfehlt. L2 macht es richtig und fragt Verpackung/Frachtbrief/Gefährlichkeit/Urkunden ab.
- *Behoben gegenüber VORHER:* Das Accordion „höhere Gewalt“ in Kap. 6 ist weg (beide). Der Güterfolgeschaden 1.600 steht nicht mehr in der Frage (L1). Bei 8.1 stehen die Werte 20.000/1.000 nicht mehr in der Frage (beide, jetzt eigene Lücken). Die Erklärung „Selbsteintritt“ im Blitz-Quiz gibt es nicht mehr, weil das Blitz-Quiz entfallen ist.

**Ratbarkeit** (gezählt über alle MC/SC in Kapiteln, Quizzen und final, nach Angleichung):

| | VORHER | Lauf 1 | Lauf 2 |
|---|---|---|---|
| richtige = längste (eindeutig + gleichlang) | 25/36 = **69 %** | 17/30 = **57 %** | 28/39 = **72 %** |
| davon deutlich (> 15 % länger als zweitlängste) | 16 | 8 | 16 |
| true_false wahr : falsch | 19 : 4 (83 % wahr) | 6 : 13 (**68 % falsch**) | 3 : 11 (**79 % falsch**) |
| richtige Antwort auf Platz 1 (Rohtext) | 35/36 | 20/24 (+ 6 Kurzform) | 38/39 |
| Auswahlfragen ohne jedes Feedback | 1 | 6 | 9 |
| „Fast!“ / „Guter Versuch“ / „häufige Verwechslung“ | 59 / 34 / 10 | 7 / 0 / 0 | 2 / 0 / 0 |

- *Länge:* L1 bessert deutlich nach, L2 gar nicht. In L2 sind die Kernstellen eindeutig ratbar: 4.2 (88 gegen ≤ 67 Zeichen), 6.2 (113 gegen ≤ 82), 7.5, 8.2, Sit. 2, Sit. 4, Kap. 3 „Ergänzung“. In L1 bleiben 4.2 (84 gegen ≤ 65), 6.2 und 7.5 auffällig.
- *Wahr/Falsch:* Hier ist überkorrigiert. Wer in L2 immer „falsch“ tippt, kommt auf 79 % und knackt die 70-%-Hürde. In den Kapitelquizzen von L2 sind **alle 9** TF falsch. Das ist das Spiegelbild des VORHER-Befunds.
- *Position:* Unverändert, auch obwohl die Vorlage jetzt `correct: false` zuerst zeigt. Für H5P ist das wegen `randomAnswers` folgenlos.
- *Kein Feedback:* Die 6 Kurzform-Fragen in L1 (1.7, 3., 2.3, 4.2, 7.2, 7.5) und die `single_choice`-Fragen in den Quizzen von L2 haben kein Feedback. Bei „Begründe, wer haftet“ (L1 7.5, 3.) fehlt so die Begründung. **Ursache im Prompt:** Das AUSGABEFORMAT zeigt für `single_choice` kein Muster, nur `single_choice_set` mit `correct:`/`wrong:`. Die KI übernimmt diese Kurzform. Außerdem zeigt das Muster für `question_set` MC-Antworten ohne `feedback`.

**question_sets:**

| | VORHER | Lauf 1 | Lauf 2 |
|---|---|---|---|
| Fragen in Kapitelquizzen | 35 | 23 (3–4 je Kapitel ✓) | 33 (3–4 je Kapitel ✓) |
| davon neuer Fall / neue Zahlen | ≈ 11 (31 %) | ≈ 11 (**48 %**) | ≈ 13 (**39 %**) |
| neue Rechnung in jedem Rechen-Kapitel | – | ja (Kap. 1, 4, 5, 6) | ja (Kap. 1, 4, 5, 6, sogar 8) |
| final: neue Fälle | 0/12 | 2/8 | 1/8 |

Gute neue Fälle sind z. B. L1 „Diebstahl vom bewachten Parkplatz“, „Blitzschlag trotz Blitzschutz“ und „SZR-Kurs steigt“, L2 „ätzender Kanister → § 410“, „fehlende Zollpapiere → § 413“, „Erhöhung mit Zustimmung“ und die zweiteiligen Korridor-Rechnungen. Wiederholt werden dagegen dieselben Fälle mit neuem Namen (L1 Kap. 7 „Alt/Neu“ = 6.1, L2 Kap. 9 „A/B in Kassel“ = 7.5), wörtliche Neuauflagen von Kapitelaufgaben (L1 Kap. 3 „Produktionsstillstand → Transportversicherung“ = drag_drop zwei Elemente davor, L2 Kap. 1 Subunternehmer = 1.9) und reine Lehrtext-Abfragen. L2 Kap. 9 bringt **0 von 4** neuen Fragen. Gleiche Fragen über Kapitel hinweg: L1 Kap. 3 TF und final TF „organisierender Spediteur haftet bis 8,33 SZR“ sind fast wortgleich.

**Wiederholung derselben Kernaussage** (Schlagwortzählung in den Fragen-Elementen, darin sind die Skript-Aufgaben enthalten):
- „Erhöhung gilt für den ausführenden FF nur mit Zustimmung“: VORHER 8, L1 9, **L2 11**. 4 davon sind Skript-Aufgaben. L2 Kap. 5 fragt es innerhalb von 6 Elementen viermal ab (Lücke, TF, Schritt 3, 8.2), und Schritt 4 sagt es in der Aufgabe noch einmal vor.
- „Güterfolgeschaden wird nicht ersetzt“: VORHER ~9, L1 6, L2 7. „Vertraglicher FF haftet für die ganze Strecke“: L1 4, L2 5. „Wetter ist keine höhere Gewalt“: L1 6, L2 3. Gegenüber VORHER ist das kaum weniger. Die Wiederholung wandert nur vom Blitz-Quiz und der Zusammenfassung ins Kapitelquiz und ins final.

**Erfundene Inhalte** (Rekonstruktion der Lücken aus der Einlesung):
- **L1 erfindet viel:** den Fall Brandl (siehe F2), für Kap. 3 eine *zweite* Situation 3 (Disponent vergisst das Abholfahrzeug, Vertragsstrafe 2.000 €) und Situation 4 (Festpreis, Unfall von FF Berger, 200 kg Platinen, 8 €/kg Ausfall), dazu „fünf Paletten“ in Übung 3 (laut Original 17; die Ergebnisse ändert das nicht). Sit. 3 und 4 sind **fachlich stimmig** mit den Skript-Lösungen (reiner Vermögensschaden, unbegrenzt bei Verschulden, 2.082,50 €, Folgeschaden nicht ersetzt, § 462). Sit. 4 spielt aber im Frachtrecht statt im Umschlagslager. Für Aufg. 3–6 entstehen so drei verschiedene „Fälle“.
- **L2 erfindet wenig:** Sit. 3/4 nur als Stichworte aus den Lösungen, die Odin-Einleitung plausibel. Der Preis dafür sind die abstrakten Aufgaben 5/6 (Vorwegnahme, siehe oben) und die fehlerhaft gefüllte Lager-Spalte (F3).

**Kapitelbildung:** L1 hat 7 Kapitel. Kap. 6 („Höhere Gewalt … – Übungen“) enthält auch die Absenderhaftung, die der Titel nicht nennt. Kap. 7 hat 19 Elemente (Regress, Beteiligte, Begegnungsverkehr, Zusammenfassung). L2 teilt in 9 Kapitel genau nach den Übungsblöcken, das ist inhaltlich sauberer. Jedes Kapitel zieht aber Lernziele, Accordion und Quiz nach sich. Kap. 3 hat nur 6 Elemente, das Quiz von Kap. 9 ist reine Wiederholung. **Mehr Kapitel bedeuten mehr Pflichtbausteine und mehr Wiederholung.**

## 3. Feinschliff

- L2: Lernziele in Du-Form („Du erklärst …“) unter der Box-Kopfzeile „Nach diesem Kapitel kannst du…“ ergibt einen holprigen Satz. L1 schreibt im Infinitiv, das passt.
- L2: Doppeltes Euro-Zeichen nach Lücken (`*864,00/864,00 €* €`, ebenso bei 2.000 und 14.835). Wer „864,00 €“ tippt, sieht „€ €“.
- L2: Die Bezeichnungen „Ergänzung –“ und „Aufgabe –“ stehen für Schüler sichtbar in `description`.
- L1, Kap. 7, 5.1: Die Distraktoren „Verlust des Frachtbriefs“ und „Lieferfristüberschreitung“ kommen im Fall gar nicht vor und sind deshalb wertlos.
- Beide: Viele Accordion-Einträge ohne Lernwert („Haftung“, „Empfänger“, „Reklamation“, „Totalschaden“, „Güterschaden“, „Bruttogewicht“ zweimal in L2).

## 4. Systematisch oder einmalig

**Systematisch, Ursache im Prompt** (Vorschläge für `CLAUDE.md`, Abschnitt Master-Prompt):

1. **Kein `single_choice`-Muster im AUSGABEFORMAT** (6 Kurzform-Fragen in L1, 9 Fragen ohne Feedback in L2). Vorschlag: In die Vorlage gehört ein `single_choice` mit `answers:` und `feedback:` je Option, beim `question_set`-Muster ebenfalls `feedback:`. Satz: *„`single_choice` und `multiple_choice` immer mit `answers:` und Feedback je Option – die Kurzform `correct:`/`wrong:` nur in `single_choice_set`.“* **Maschinell prüfbar:** „Auswahlfrage ohne Feedback“ → gelb (`qualitaet.py`).
2. **Die TF-Regel ist zu stark formuliert:** „etwa die Hälfte falsch“ wird als „lieber alle falsch“ gelesen (L2: 9/9 in den Quizzen). Vorschlag: *„Bei true_false 40–60 % wahre Aussagen, auch innerhalb jedes question_set.“* **Maschinell:** TF-Anteil „wahr“ < 30 % oder > 70 % → gelb, je Datei und je Set.
3. **Die Längenregel greift nicht zuverlässig** (L2 72 %). Die Prüfstelle meldet sie, aber nur als Tipp. Vorschlag: den Befund ab > 60 % auf gelb heben, damit der Nachbesserungs-Prompt ihn trägt. Im Prompt konkreter: *„Kürze die richtige Option auf die Länge der Distraktoren; Begründungen gehören ins Feedback, nicht in die Antwort.“* Die langen richtigen Optionen sind fast immer Antwort plus Begründung.
4. **Accordion als Pflicht je Kapitel** (Z. 88: „5–8 Fachbegriffe“). Diese Pflicht erzeugt Füllbegriffe und die Begegnungsverkehr-Vorwegnahme. Die Regel „nur Begriffe ohne eigene Skript-Aufgabe“ wird nicht auf *Lückenwörter* bezogen. Vorschlag: *„accordion nur, wenn das Skript dort Fachbegriffe erklärt, höchstens 3–4 je Einheit; kein Begriff, der als Lücke oder Antwort einer Aufgabe vorkommt.“*
5. **Lösung in der Aufgabenstellung, wenn Fallangaben fehlen** (L2 Aufg. 5/6, Sit. 3, Übung 3 gesamt). Satz 50 verbietet Lösungswerte „in einer Frage“, gemeint ist aber auch `description:` und die Fallbeschreibung im `task`. Vorschlag: *„Fehlt im Skript die Ausgangssituation zu einer Aufgabe, nenne nur die Fakten des Falls – nie das Ergebnis der Prüfung (Recht, Prinzip, Höchstgrenze), auch nicht in `description` oder `task`. Jede [LÖSUNG]-Zahl einer Teilaufgabe wird selbst gefragt, nicht in einer späteren Teilaufgabe genannt.“*
6. **Rekonstruktion ist nicht geregelt.** Der Prompt sagt „Gibt das Skript eine Situation vor: exakt übernehmen“, schweigt aber dazu, was bei *fehlender* Situation gilt. L1 erfindet widersprüchlich (F2), L2 füllt die Lager-Spalte falsch (F3). Vorschlag: *„Fehlt erkennbar ein Teil (Aufgabe ohne Situation, Lösung ohne Frage), erfinde höchstens einen Fall je Aufgabe, der genau zu den [LÖSUNG]-Zeilen passt; mehrere Aufgaben zu verschiedenen Situationen nie in einem Fall zusammenlegen. Tabellenspalten, die das Skript ausdrücklich ausklammert („wird in der 11. Jgst. behandelt“), bleiben leer.“* Der eigentliche Hebel bleibt aber die Reparatur der Einlesung (Abschnitt 0 des VORHER-Berichts). Danach ist dieser Punkt weitgehend gegenstandslos.
7. **Die Kapitelquiz-Regel „nur neue Fälle“ erreicht 39–48 % statt fast 100 %.** Dass es 3–4 Fragen sein *müssen*, drängt die KI zum Füllen, wo der Stoff keinen neuen Fall hergibt (L2 Kap. 9). Vorschlag: *„2–4 Fragen; lieber 2 neue Fälle als 4 mit Wiederholung. Keine Frage, deren Antwort im Lehrtext dieses Kapitels wörtlich steht.“*

**Einmalig** (Nachbesserungs-Prompt genügt): F1 (Zuordnung zum Fixkostenspediteur, Ursache Einlesung), F4 (Vorsatz-Distraktor), F5 (§ 421 übernommen), L1 4.1 nur Paragraphennummern, L2 6.1 Klammer-Lösung, L2 final „Wie nennt man den Ausführenden?“, L2 Übung 3 Höchstgrenze nicht gefragt.

## 5. Antworten auf die Fragen des Auftrags

**(a) VORHER-Befunde**

| VORHER-Befund | Lauf 1 | Lauf 2 |
|---|---|---|
| „doppelte Fracht“ als falsches Feedback (1.7) | behoben | behoben |
| „Fahrer = ausführender FF“ (final) | behoben | behoben |
| Prompt-Fehler „5 SDR“ | behoben (Prompt) | behoben (Prompt) |
| 6.2 Erstattung Sit. 1 und Sit. 3 fehlt | behoben | behoben |
| § 462 fehlt | behoben (TF) | behoben (TF) |
| Aufgabe 5 nur im Feedback | behoben (TF) | behoben (SC, aber mit Lösung in der Frage) |
| Accordion „höhere Gewalt“ löst Übung 1 | behoben | behoben |
| Begegnungsverkehr: Box/Accordion löst 7.1/7.2 | **besteht fort** (Tipp-Box + Accordion) | **besteht fort** (Accordion) |
| drag_drop 6.1 mit Lösung in Klammern | behoben | **besteht fort** |
| Selbsteintritt-Erklärung als Vorgabe im Lückentext | gemildert (Blitz-Quiz weg, Vorgabe bleibt) | gemildert |
| Situation vor Aufg. 5/6 nennt die Lösung | behoben | **besteht fort** (in der Frage) |
| [LÖSUNG]-Werte in der Aufgabe (8.1, 1.600) | behoben | 8.1 behoben; 1.600 als Distraktor, **neu:** 33.118 in der Aufgabe |
| richtige = längste | gebessert (69 → 57 %) | **besteht fort** (72 %) |
| TF fast alles wahr | umgekehrt: 68 % falsch | umgekehrt: 79 % falsch |
| Füll-Distraktoren und Floskeln | weitgehend behoben | weitgehend behoben (einzelne absurde in SC_SET) |
| Inline-CSS 15 % | behoben (0 %) | behoben (0 %) |
| Quizbausteine zu zwei Dritteln Wiederholung | gebessert (QS 48 % neu) | leicht gebessert (39 % neu) |
| Blitz-Quiz und Summary im Kapitel | entfallen | entfallen |
| Fünf Paletten statt 17 (Folge der Einlesung) | besteht fort (harmlos) | entfällt (keine Anzahl genannt) |

**(b) Neue Mängel:** F1 (beide), F2 (L1), F3/F4/F5 (L2), Übung 3 Höchstgrenze nicht gefragt und als Vorgabe genannt (L2), TF-Überkorrektur (beide), Auswahlfragen ohne Feedback durch die Kurzform (L1 6, L2 9), Sit. 3 vorgelöst (L2), „Wie nennt man den Ausführenden?“ (L2), 4.1 nur Paragraphennummern (L1).

**(c) Je Lauf gegen VORHER:**
- **Lauf 1: besser.** Er ist vollständig, ein Drittel kürzer und hat deutlich weniger Ratbarkeit, mehr neue Quizfälle, keine Floskeln und eine richtige Zusammenfassung. Gewichtige neue Schwäche ist der erfundene, widersprüchliche Fall Brandl samt Fixkostenspediteur-Fehler in Kap. 2.
- **Lauf 2: leicht besser.** Kürze, CSS, Floskeln und die drei VORHER-Lücken sind gewonnen. Bei Ratbarkeit (72 %) und Vorwegnahme (6.1 wieder, Aufg. 5/6, Sit. 3, Übung 3) steht er nicht besser als VORHER. Dazu kommen zwei neue fachliche Fehler (Lager-Spalte, Vorsatz-Distraktor) und eine Teilaufgabe fehlt.

**(d) Der schlechtere Lauf ist Lauf 2.** Gesamturteil: Der neue Prompt ist eine klare Verbesserung und sollte bleiben. Die Kosten sanken um ~31–34 %, alle Rechnungen stimmen, und die strukturellen VORHER-Mängel (CSS, Blitz-Quiz, Summary, Floskeln, fehlende Aufgaben) sind behoben. Die Streuung zwischen den Läufen ist aber groß. Die Didaktik hängt bei Ratbarkeit und Vorwegnahme noch vom Glück ab, weil drei Regeln zu weich oder überdreht sind: Länge, TF-Anteil, Accordion-Pflicht. Hinzu kommt die fehlende `single_choice`-Vorlage (Punkte 1–4 in Abschnitt 4). Vor dem Einsatz an Heft 2 muss zuerst die Einlesung repariert werden. Sonst produziert jeder Lauf erfundene Fälle zu Situation 3/4 (F1–F3).

**(e) Länge: Anteile der Bausteine jetzt**

| Baustein | VORHER | Lauf 1 | Lauf 2 | Lerneffekt |
|---|---|---|---|---|
| text (Lehrtext, Situationen) | 32 % (davon die Hälfte CSS) | 25 % | 21 % | hoch, jetzt ohne CSS |
| question_set | 18 % | 18 % | 22 % | etwa zur Hälfte Wiederholung |
| multiple_choice | 10 % | 12 % | 15 % | Skript-Aufgaben, Kern |
| accordion | 4 % | **8 %** | **8 %** | gering, teils Vorwegnahme |
| final_chapter | 6 % | 7 % | 6 % | Lernzielkontrolle, 6–7 von 8 Fragen wiederholt |
| fill/drag/drop/TF/SC/calc | ~20 % | ~29 % | ~26 % | Kern |
| summary + Blitz-Quiz im Kapitel | 8 % | 0 | 0 | entfallen |
| Inline-CSS | 15 % | 0 | 0 | entfallen |

Am meisten kostet für wenig Lerneffekt:
- **Accordion** (je ~1.400–1.450 Token): Der Anteil hat sich verdoppelt, weil die neue Struktur es *je Kapitel* verlangt. Viele Einträge sind Allgemeinwissen, andere nehmen Aufgaben vorweg. Wird es auf „nur wo nötig, höchstens 3–4 je Einheit“ beschränkt, spart das **~1.000–1.200 Token**.
- **Wiederholte Quizfragen:** L1 ~12 von 23 (~1.600 Token), L2 ~20 von 33 (~2.350 Token). Werden 2–4 Fragen statt fest 3–4 zugelassen und Wiederholungen verboten, spart das **~1.000–2.000 Token**, je nach Kapitelzahl.
- **final_chapter:** Er ist als Lernzielkontrolle legitim. Da er fast nur Kapitelfragen wiederholt, würde ein Hinweis „mind. die Hälfte neue Fälle“ den Lerneffekt erhöhen, ohne dass es länger wird.
- **Kapitelzahl:** L2 kostet mit 9 Kapiteln ~800 Token mehr als L1 mit 7, fast nur durch Pflichtbausteine je Kapitel.

**Die Pflicht „neue Rechnung im Kapitelquiz“ ist ihren Platz wert.** Es sind 4–6 Lücken je Lauf zu je ~50–80 Token, zusammen ≈ 1,5 % der Antwort. Sie sind der wertvollste Teil der Quizze: echte neue Zahlen, alle 13 nachgerechnet richtig, beide Fälle „Schaden < Grenze“ und „Schaden > Grenze“ kommen vor, in L2 sogar die zweiteilige Korridor-Rechnung. Verbessern ließe sich nur, dass ein Hinweis in Klammern das Vergleichsergebnis nicht verrät (L1 Kap. 6: „(Höchstgrenze kleiner als Schaden)“) und dass Zwischenwerte als eigene Lücke gefragt werden (wie L2 Kap. 4 und Kap. 6, gut).

## 6. Was ich nicht beurteilen konnte

- Den Originalwortlaut von Situation 3/4, Abschnitt 2 und der Einleitung zu Übung 3 kenne ich nur aus dem VORHER-Bericht. Die Urteile zu F1–F3 und zu „fünf statt 17 Paletten“ stützen sich darauf. Einen fairen Vollständigkeitsvergleich gibt es erst nach der Reparatur der Einlesung.
- Ob die Mischung der Antworten auch in den Ausgaben Word und Seite greift (Position 1 in 38/39 bei L2), habe ich nicht geprüft.
- Wie `single_choice` ohne Feedback und Tabellen-HTML in `fill_blanks` in der H5P-Datei aussehen, habe ich nicht gerendert. Geprüft ist nur der Datenstand nach `_antwort_laden`.

*Prüfstelle meldet zusätzlich: L1 Tipp „zwei gleiche Aufgaben hintereinander“ (Kap. 7); L2 Tipp „richtige Antwort meist die längste“.*
