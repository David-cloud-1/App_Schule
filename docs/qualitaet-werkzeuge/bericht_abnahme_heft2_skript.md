# Abnahme: „Ganzes Skript → H5P“, STG Heft 2 (Haftung FF/Spediteur nach HGB)

**Grundlage:** `antwort_heft2_skript.yaml` (6 Kapitel, 96 Elemente, ~29.556 Token), Prompt `prompt_heft2_skript.txt`, Skripttext `heft2_skript.txt`, zur Gegenprobe das Original-PDF `Unterichtsmaterialien/Heft2_Haftung_des_FF_nach_HGB/…_Lsg.pdf`.
**Prüfstelle:** grün, 0 Befunde. Alle 4 Bilder vorhanden.

**Urteil:** Die Rechnungen stimmen durchgehend und die Einheit ist fachlich weitgehend sauber. Drei Skript-Aufgaben fehlen jedoch, weil die Textextraktion ganze Seitenanfänge verschluckt (das ist kein KI-Fehler). Außerdem sind die Quizbausteine zu etwa zwei Dritteln Wiederholung. Abzüglich CSS ist die Antwort um rund ein Drittel kürzbar, ohne dass der Lerneffekt leidet.

---

## 0. Vorab, liegt außerhalb der KI: Die Extraktion verliert Seitenanfänge (hoch)

`extraktion.py:401` verwirft einen **ganzen Textblock**, sobald seine *erste* Zeile in den oberen 5 % der Seite liegt. PyMuPDF fasst aber oft Überschrift und folgenden Text zu einem Block zusammen. Auf S. 4 beginnt der Block bei y = 36,0 (Grenze 42,1) und umfasst 30 Zeilen, die alle verloren gehen. Mit dem aktuellen Code nachgestellt.

Im Prompt fehlen deshalb unter anderem:
- S. 4: Überschrift „2. Die Haftung des Spediteurs“, **Situation 3** (Fischhändler Huber, kein Kühlfahrzeug bestellt, 6 h Verspätung, 2.000 € entgangener Gewinn) sowie die Aufgabenstellungen 1 und 2.
- S. 5: **Situation 4** (200 kg Käse verschwinden im *Umschlagslager*, 16 €/kg plus 8 €/kg Gewinnaufschlag) und Aufgabe 5 („Gilt Fracht- oder Speditionsrecht?“).
- S. 9: Abschnitt **„7. Die Haftung des Spediteurs für andere (§ 462 HGB)“** mit Frage.
- S. 12: Anfang von Übung 3 („…für 475,00 € Entgelt **17** Paletten…“), dazu die Anfänge von 1.6, Übung 6, 6.3 und 7 sowie mehrere Kapitelüberschriften.

Folgen in der Einheit: Situation 3 ist erfunden (Kap. 2: „Verzollung vergessen, Standgebühren 2.000 €“). Situation 4 wird zum Frachtschaden „200 kg Ware beschädigt + Produktionsstillstand“, obwohl sie im Skript im Umschlagslager spielt. Übung 3 spricht von „fünf Paletten“ statt 17; die Ergebnisse bleiben trotzdem richtig. Diese Lücke ist **systematisch und betrifft jedes PDF-Skript**. Vorschlag: zeilenweise statt blockweise filtern, also im Zeilen-Loop `line["bbox"][1] < page_height*0.05` prüfen.

---

## 1. Was die Klasse falsch lernen würde

| Fundstelle | Befund |
|---|---|
| Kap. 1, `multiple_choice` 1.7, Antwort 4 + Feedback | Der Distraktor lautet „Haftung wird auf das **Doppelte** der Fracht begrenzt“, das Feedback dazu „eine solche Begrenzung gilt für Lieferfristüberschreitungen“. Damit lernt die Klasse „doppelte Fracht“ bei Lieferfrist, richtig ist die **dreifache** (§ 431 Abs. 3 HGB). |
| final_chapter, MC 9 („Wechselbrücken … zweiter Fahrer“) | Richtige Antwort: „Der zweite **Fahrer** als ausführender Frachtführer“. Der Fahrer ist aber nicht der Frachtführer. Das widerspricht dem Feedback in Kap. 1, question_set MC 1 („Die Haftung richtet sich gegen den Frachtführer, nicht gegen den Fahrer persönlich“). |
| Prompt Z. 122 (= `CLAUDE.md:240`, `prompts.py:146`) | Im Muster-Feedback steht „§ 461 HGB bis **5 SDR/kg**“. Das ist falsch, über § 461 Abs. 1 i. V. m. § 431 HGB gelten 8,33 SZR. In diese Einheit ist der Fehler nicht durchgesickert, er steht aber in jedem Prompt. Ebenso `prompts.py:1082` („`*5 SDR je Kilogramm*`“) in einem anderen Werkzeug. |

**Nachgerechnet und richtig:** 864,00 €; 2.811,38 € (270 × 8,33 × 1,25); 2.082,50 €; 19.000,00 / 4.165,00 / 14.835,00 €; Teilschaden 22.347,90 + 5.959,44 = 28.307,34 €; Höchstgrenze 3.180,6 kg × 8,33 × 1,25 = 33.118,00 €; Lieferfrist 3 × 475 = 1.425 € > 1.050 €; Gesamt 29.357,34 €. Alle eigenen Beispiele stimmen ebenfalls (1.561,88; 2.603,13 / 3.646,87; 15.618,75; 5.206,25; 15.000; 6.247,50; 5.000; 1.041,25; 2.400). Jedes `result` entspricht der [LÖSUNG]. Die Paragraphen §§ 425, 426, 427, 431, 433, 437, 449, 461, 408/410/411/413 sind korrekt zugeordnet. Absenderhaftung „8,33 SZR, Verbraucher nur bei Verschulden“ (§ 414) ist richtig. Den Skript-Tippfehler „§ 421“ hat die KI zu § 431 korrigiert, das ist in Ordnung.

## 2. Was den Lerneffekt kostet

**Fehlende Skript-Aufgaben** (der schwerste Befund):
- **6.2, Erstattung Situation 1 (864,00 €) und Situation 3 (2.000,00 € samt Begründung „Verschulden → Vermögensschaden unbegrenzt“)** wird nirgends abgefragt. Kap. 3 rechnet nur die Höchstgrenze von Situation 1 und die Erstattung von Situation 4. Der zentrale Vergleich „Schaden < Höchstgrenze → voller Schaden“ fehlt bei Situation 1, Situation 3 fehlt ganz. Eine Teilursache ist Abschnitt 0, die [LÖSUNG]-Zeilen standen aber im Prompt.
- **Abschnitt 7 / § 462** („haftet für Güter- und Vermögensschäden, aber nicht Güterfolgeschäden, die eingesetzte Frachtführer zu vertreten haben“) fehlt komplett, im YAML kommt „eingesetzt“ nicht vor. Die [LÖSUNG] stand im Prompt (S. 9).
- **Aufgabe 5** („Speditionsrecht, da nicht bei Transport entstanden“) taucht nur im Feedback von Aufgabe 6 auf und ist keine eigene Aufgabe.

**Vorwegnahme** (sinngemäß, nicht wörtlich, deshalb sieht die Prüfstelle sie nicht):
- **Kap. 6, accordion:** „Höhere Gewalt: außergewöhnliches und unvorhersehbares Ereignis“ und „Gefahren der Straße: … Wetterlagen, Fahrbahnverhältnisse“ stehen direkt vor Aufgabe 1 (Lücken: *außergewöhnlich*, *unvorhersehbar*, *eigentümliche*, *Straße*) und vor 2.1–2.3. Damit ist die Aufgabe vorgelöst.
- **Kap. 5, accordion + Wusstest-du-Box:** „Begegnungsverkehr: zwei Fahrzeuge fahren zeitlich abgestimmt aufeinander zu und tauschen die Ladeeinheit“ und „…fahren mit ihren eigenen Lkw wieder nach Hause“ lösen 7.1 (drag_words) und 7.2 (true_false) vor.
- **Kap. 5, drag_drop 6.1:** Die Items enthalten die Lösung schon in Klammern („Berthold (*verspricht die Transportausführung*)“). Die Zuordnung ist dadurch geschenkt.
- **Kap. 1, Blitz-Quiz Q3 + fill_blanks 1.1:** Bei „Erklären Sie Selbsteintritt“ steht die Erklärung („führt den Transport selbst aus“) als Vorgabe im Lückentext. Abgefragt werden nur „Frachtführer/Frachtrecht“, und das Blitz-Quiz davor hat es schon beantwortet.
- **Kap. 2, Ausgangssituation vor Aufgabe 6:** „Der Schaden entstand nicht beim eigentlichen Transport, sondern während das Gut in der Obhut deiner Firma war“ ist exakt die Lösung von Aufgabe 5 und Aufgabe 6.
- **Kap. 4, MC 8.1 Teil 3** nennt zwei [LÖSUNG]-Werte in der Frage: „Warenschaden 20.000,00 €“ und „verbleibende 1.000,00 €“ (Deckungslücke Müller). Beide wären als eigene `calculation_exercise` zu rechnen. Ähnlich steht in Kap. 3 der Güterfolgeschaden von 1.600 € in der Frage.

**Ratbarkeit** (nur Länge und Wahrheitswert zählen, die Position nicht):
- *Position:* In 35 von 36 MC/SC steht die richtige Antwort auf Platz 1. Das ist **für H5P folgenlos**, weil `h5p_generator.py:121` `randomAnswers: True` setzt. Die Ursache ist die Prompt-Vorlage (`correct: true` immer zuerst, Z. 420–436, 527–551). Andere Ausgaben habe ich nicht geprüft.
- *Länge:* In MC/SC ist die richtige Antwort in 25 von 36 Fällen die längste (20 davon eindeutig). Bei `summary` gilt das in **18 von 18**, beim Blitz-Quiz in 14 von 21. Wer „die längste“ wählt, besteht die Summaries ohne Wissen.
- *true_false:* 19 Aussagen sind wahr, 4 falsch. Wer immer „wahr“ tippt, kommt auf 83 % und knackt jede 70-%-Hürde, sofern das Set TF-lastig ist.
- *Distraktoren ohne Lernbezug:* Häufig kommen „Der Empfänger“, „Reiserücktrittsversicherung“, „Straßenverkehrsamt“, „Zollbehörde“, „Brücke über eine Autobahn“, „steuerfreier Gewinn“, „nur Seetransporte“ vor. Das Wort „Empfänger“ steht 32-mal in der Antwort, oft als Füll-Distraktor. Dazu kommen Feedback-Formeln an absurden Optionen: 9-mal „das ist eine häufige Verwechslung“, wo keine plausible Verwechslung vorliegt, 59-mal „Fast!“ und 34-mal „Guter Versuch“.

## 3. Länge (der Schwerpunkt dieser Abnahme)

**Lehrtext ist nicht aufgebläht, das CSS schon.** Die `text`-Elemente umfassen 33.443 Zeichen. Davon sind nur **14.067 sichtbarer Text**, aber **16.705 Inline-CSS (50 %)** und 2.671 übrige Tags. Der sichtbare Text liegt nah am Skript ohne [LÖSUNG]-Zeilen (12.799 Zeichen), dazu kommen 6 Pflicht-Boxen je Typ (Lernziele, Mission, ⭐ Prüfungsrelevant, Wusstest du). Über alle Elemente gerechnet macht Inline-CSS 15 % der Antwort aus (~4.400 Token), ohne jeden Lerneffekt.

**Die Quizbausteine wiederholen sich.** Eine Zählung nach Kernaussagen zeigt:
- „Erhöhung gilt für den ausführenden FF nur mit Information und schriftlicher Zustimmung“ kommt **8-mal** vor (Kap. 4 fill, TF 8.2, summary, QS; Kap. 5 MC 6.2, summary, QS-TF; final).
- „Güterfolgeschaden wird nicht ersetzt“ kommt **~9-mal** vor, „Transportversicherung schließt die Deckungslücke“ **7-mal** (Kap. 2 Blitz ×2, TF, summary, QS; Kap. 3 QS; final), „Selbsteintritt → Frachtrecht“ und „verschuldensunabhängig“ je **6-mal**.
- Wörtliche Dubletten: Blitz-Quiz Kap. 4 Q2 ist identisch mit Blitz-Quiz Kap. 5 Q1 („Wer erbringt die tatsächliche Transportleistung?“, gleiche Optionen). QS Kap. 6 fill (Absender 8,33 SZR / Verbraucher) entspricht wörtlich der Lösung von 4.2 aus demselben Kapitel. QS Kap. 6 MC 6 (Lack, Regress) wiederholt 5.2. QS Kap. 2 TF 2 (Stapler im Lager) ist die Situation von Aufgabe 6.

**question_sets** (35 Fragen, 18 % der Antwort): **Nur etwa 11 der 35 Fragen bringen einen neuen Fall oder neue Zahlen** (z. B. Kap. 1 Entladen durch Empfänger, Kap. 3 500 kg Elektroteile, Kap. 4 600 kg × 20 SZR, Kap. 6 Lieferfrist 800 € Fracht, Kap. 6 200 kg × 40 €/kg). Etwa 24 sind Wiederholung oder reine Abfrage: Definitionen („nach dem Skript nur innerdeutsch“), Paragraphennummern, dieselben Fälle mit neuem Firmennamen (Nordtrans, Gruber, Maier). Kap. 5 hat 1 neue von 6 Fragen. Der Prompt verlangt etwa 70 % Anwendung, erreicht sind rund 30 %.

**final_chapter** (12 Fragen + 10 Statements, 6 %): Alle 12 Fragen wiederholen bereits Gefragtes, die Statements wiederholen die Kapitel-Summaries. Als Lernzielkontrolle ist das legitim. Zusammen mit den Kapitel-Quizzen wird derselbe Stoff aber vier- bis fünfmal abgefragt.

**Kürzungsvorschläge mit geschätzter Ersparnis** (1 % ≈ 295 Token):

| Baustein | heute | Vorschlag | Ersparnis |
|---|---|---|---|
| Inline-CSS | 15 % | Boxen als Kurzmarker (`<div class="merke">` o. ä.), CSS fügt der Generator ein | **~4.000 Token**, Lerneffekt unverändert |
| question_set je Kapitel | 18 % | 3–4 Fragen, *nur* neue Fälle/Zahlen; Abfragewissen raus | **~2.300 Token** |
| summary (questions) in Kapiteln | 4 % | streichen (18/18 längste = ratbar, reine Wiederholung); final-Statements genügen | **~1.200 Token** |
| single_choice_set als Aufwärmer | ~3,5 % | streichen (wiederholt oder löst vor); Typ nur für Skript-Aufgaben wie 7.3–7.5 | **~1.000 Token** |
| accordion | 4 % | nur Begriffe, die keine Skript-Aufgabe sind; max. 4 | **~500 Token** |
| final_chapter | 6 % | 8 statt 12 Fragen | **~600 Token** |
| **Summe** | | | **~9.600 Token (~33 %) → ~20.000 statt 29.500** |

Auch ohne Generator-Änderung bringen die reinen Prompt-Kürzungen etwa **5.600 Token (~19 %)**. Die Skript-Aufgaben selbst (fill/drag/MC/calc etc., zusammen ~25 %) sind der eigentliche Lernkern und sollten nicht gekürzt werden.

## 4. Systematisch vs. einmalig

**Systematisch, Ursache im Prompt (Vorschläge für `CLAUDE.md`, Abschnitt Master-Prompt):**

1. **Widerspruch zwischen „accordion: alle Fachbegriffe des Kapitels“ (Z. 153, 175) und „Wusstest du“ (Z. 226) einerseits und „nichts vorwegnehmen“ (Z. 98) andererseits.** Das ist dasselbe Muster wie beim früheren Qualitätseinbruch. Tritt in Kap. 1, 5 und 6 auf.
   Vorschlag: *„Ins accordion und in Wusstest-du-Boxen gehören nur Begriffe, die das Skript im Lehrtext selbst erklärt. Ist die Erklärung eines Begriffs eine Skript-Aufgabe („Erklären Sie …“, „Was ist …?“), steht sie weder im accordion noch in einer Box noch als Vorgabe im Lückentext.“*
2. **Das Blitz-Quiz als Aufwärmer (Z. 230) kann nur vorwegnehmen oder wiederholen.** Am Kapitelanfang gibt es noch kein Wissen, das abgefragt werden könnte.
   Vorschlag: *„`single_choice_set` nur für Skript-Aufgaben mit mehreren Teilfragen; kein Aufwärm-Quiz.“* Ersatzweise: *„Aufwärm-Quiz nur zu Stoff früherer Kapitel.“*
3. **Der Pflichtsatz pro Kapitel ist zu groß für den Stoff:** Blitz-Quiz 3–5, summary, question_set 5–8, final 10–15 (Z. 172–178, 345). Ein Skript-Abschnitt mit 3 Aufgaben gibt nicht 15 neue Fragen her, also wiederholt die KI. Dazu kommt ein **zweiter Widerspruch:** Das question_set soll „neue Zahlen“ bringen (Z. 178), erlaubt aber nur MC/SC/TF/fill (Z. 164), während „Rechenaufgaben nie als MC“ gilt (Z. 104). Die neuen Rechenfälle landen deshalb als MC mit vier Beträgen (Kap. 3, 4, 5, 6).
   Vorschlag: *„question_set: 3–5 Fragen, jede mit neuem Fall oder neuen Zahlen; keine Frage, die eine Aufgabe oder summary-Aussage dieses Kapitels wiederholt. Gibt der Stoff keinen neuen Fall her, lieber weniger Fragen.“* Dazu `summary` in Kapiteln streichen. Die 70-%-Hürde erst ab 4 Fragen anwenden oder per `fill_blanks` mit Zahlenlücke rechnen lassen.
4. **Keine Regel zur Antwortlänge und zum Wahr/Falsch-Verhältnis.** Ergebnis: summary 18/18 längste richtig, MC 25/36, TF 19:4. Die Vorlage setzt außerdem `correct: true` immer zuerst und als einzigen TF-Wert.
   Vorschlag: *„Die richtige Option ist nicht systematisch die längste oder genaueste; Distraktoren gleich lang und gleich konkret. Bei true_false etwa die Hälfte falsche Aussagen.“* **Maschinell prüfbar, gehört nach `qualitaet.py`:** Anteil „richtig = längste“ je Einheit (> 60 % → gelb), TF-Anteil „wahr“ (> 70 % → gelb), Position der richtigen Antwort (nur für Ausgaben ohne Mischung).
5. **Falsches Fachbeispiel im Prompt:** „§ 461 HGB bis 5 SDR/kg“ (Z. 122 / `CLAUDE.md:240` / `prompts.py:146`, ähnlich `prompts.py:1082`). Ersetzen durch „…haftet nach § 461 Abs. 1 i. V. m. § 431 HGB bis 8,33 SZR/kg.“
6. **Feedback-Formeln** („Fast! / Guter Versuch – das ist eine häufige Verwechslung:“, Z. 223–224) werden mechanisch auch an absurde Optionen gehängt.
   Vorschlag: *„Die Formeln nur verwenden, wenn der Distraktor wirklich eine typische Verwechslung ist.“* Besser wäre, absurde Distraktoren gleich zu vermeiden (Z. 115–118 verbietet sie bereits, zu weich formuliert).
7. **[LÖSUNG]-Werte in der Aufgabenstellung** (8.1 Teil 3, Kap. 3 1.600 €). Z. 32 regelt nur, dass nichts in `text` landet.
   Ergänzen: *„Kein [LÖSUNG]-Wert, auch kein Zwischenergebnis, steht in einer Frage oder Aufgabenstellung; jeder wird selbst abgefragt.“*

**Einmalig** (Nachbesserungs-Prompt genügt): „doppelte Fracht“ in 1.7; „Fahrer“ statt Frachtführer in final MC 9; fehlende Abfrage der Erstattung 6.2 für Situation 1 und 3; fehlende Aufgabe zu § 462; Aufgabe 5 nur im Feedback.

## 5. Was ich nicht beurteilen konnte

- Den Originalwortlaut der durch die Extraktion verlorenen Aufgaben (Abschnitt 2, Aufgaben 1/2; Übung 6.3/7-Einleitung) habe ich nur stichprobenhaft im PDF gesehen. Die von der KI ergänzten Situationen sind plausibel, aber erfunden. Erst nach der Reparatur der Extraktion ist ein fairer Vollständigkeitsvergleich möglich.
- Ob die Antwortmischung auch in den Ausgaben Word/Seite greift, habe ich nicht geprüft; geprüft ist nur H5P.
- Die Fachaussage zu 7.3/7.4 (nur der ausführende FF haftet für seinen Abschnitt) folgt dem Skript. § 437 HGB (Gesamtschuld mit dem vertraglichen FF) bleibt unerwähnt, gemäß Regel ist das kein Befund.

*Prüfstelle meldet zusätzlich: nichts (grün).*
