# Abnahme Lauf 3: „Ganzes Skript → H5P“, STG Heft 2, nach den Prompt-Korrekturen (PROJ-68)

**Grundlage:** `lauf3/prompt_heft2_skript.txt` (gegenüber `neu/` geändert: Z. 57 keine Füllaufgaben, Z. 58 TF 40–60 % auch je Quiz, Z. 75/88 Accordion nur 3–5 und nur bei Bedarf, Z. 112 Ausgangssituation als Box, Z. 150 final mit neuen Fällen, Z. 200 `single_choice`-Muster). Skripttext `heft2_skript.txt` ist dieselbe alte Einlesung (Situation 3/4, Überschrift „2. Haftung des Spediteurs“, Anfang von 1.6 und Aufgabe 5 fehlen). Antwort `lauf3/antwort_heft2_skript.yaml`: 9 Kapitel, 85 Elemente, 80,9 KB (L1 79,5 KB, L2 82,9 KB, also gleich lang).
Geladen über `kern._antwort_laden(…, "skript", "h5p")`.

**Prüfstelle:** grün, 6 Tipps. Davon widersprechen drei den neuen Prompt-Regeln (siehe N1).
**Bilder:** 3 von 4, es fehlt nur das Logo. So ist es gewollt.

**Kurzurteil:** **Besser als der vorherige Lauf.** Gegen Lauf 2 ist er klar besser, gegen Lauf 1 etwas besser. Alle Rechnungen stimmen, das Skript ist vollständig abgedeckt, und vier der fünf Korrekturen greifen messbar: Accordion, keine Füllaufgaben, TF-Anteil, Ausgangssituation als Box. Dazu kommt Ratbarkeit „längste Antwort“ mit 45 %, dem besten Wert bisher. **Nicht greift die Korrektur am Abschlussquiz:** Nur 1 von 8 Fragen ist neu. **Nicht auslieferbar** ist der Lauf wegen Kapitel 2. Dort lernt die Klasse zum Fixkostenspediteur Widersprüchliches und an einer Stelle fachlich Falsches. Nach einer gezielten Nachbesserung von Kap. 2 ist er einsetzbar.

---

## 1. Was die Klasse falsch lernen würde

| # | Fundstelle | Befund | neu/alt |
|---|---|---|---|
| **A1** (hoch) | Kap. 2, „Der Schaden im Lager“ + Aufgabe 5 | Die KI erfindet einen Fall: Die PIL ist **Fixkostenspediteur**, beim Umschlag im eigenen Lager fällt eine Palette. Richtig sein soll in Aufg. 5 „Speditionsrecht, weil nicht beim Transport“. Der Distraktor „Frachtrecht, weil die PIL zum Pauschalpreis wie ein Frachtführer haftet“ ist aber genau das, was die Merke-Box zwei Elemente davor lehrt („haftet wie ein Frachtführer auf der **gesamten** Transportstrecke“). Rechtlich ist er sogar die vertretbarere Antwort: Nach § 459 HGB gilt für die Beförderung Frachtrecht, und ein beförderungsbedingter Umschlag gehört nach herrschender Meinung zur Beförderung. Wer den Lehrtext anwendet, wird bestraft. Im Skript gehören Aufg. 3–6 zu Situation 3/4 und haben mit dem Fixkostenspediteur nichts zu tun. | **neu** |
| **A2** (hoch) | Kap. 2, Aufg. 3 / 4 / 6 | Derselbe erfundene Fall trägt zwei Haftungsprinzipien. Aufg. 3 sagt „Ja, der Spediteur haftet für den von ihm **verschuldeten** Schaden“, Aufg. 4 fragt nach der Befreiung von der **Verschuldens**haftung. Aufg. 6 erklärt dagegen „Verschuldenshaftung, weil es auf den Fehler des Mitarbeiters ankommt“ für falsch, denn es gelte die Obhutshaftung. Das ist der Befund F2 aus Lauf 1, wieder da. Ursache: Die Aufgaben 3/4 (Situation 3, ohne Obhut) und 5/6 (Situation 4, Umschlag) werden in einen Fall gelegt. | **besteht fort** (L1-F2) |
| **A3** (mittel) | Kap. 2, Aufgabe 1.10 | Die Beschreibung fragt „Wie haftet der **Fixkostenspediteur**?“, der Lückentext beschreibt aber Obhuts- und Verschuldenshaftung des Spediteurs. Das widerspricht der Merke-Box („wie ein Frachtführer“ = Gefährdungshaftung). Auslöser ist die verlorene Überschrift „2. Die Haftung des Spediteurs“ in der Einlesung. | **besteht fort** (F1) |
| **A4** (mittel) | Kap. 1, 1.7, Feedback „Haftung wird halbiert“: „Das Gesetz kennt hier nur ganz oder gar nicht.“ Ebenso Kap. 4, Sit. 2: „Eine Teilung gibt es nicht. Entweder haftet der Frachtführer oder er ist ausgeschlossen.“ | Als Merksatz ist das falsch. § 425 Abs. 2 HGB kennt die Schadensteilung bei Mitverursachung durch Absender oder Empfänger, und § 427 schließt nur aus, „soweit“ der Schaden aus der Gefahr entstand. Gemeint ist der Fall, gelernt wird aber eine absolute Regel. | **neu** |
| A5 (gering) | Kap. 1, Accordion „VBGL“ | Der Name ist verkürzt. Richtig heißt es „Vertragsbedingungen für den Güterkraftverkehrs-, **Speditions-** und Logistikunternehmer“. | neu |

**Nachgerechnet, alles richtig:** 15.800 − 15.530 = 270 kg × 3,20 = 864,00. Beispiel 50 × 6,50 = 325,00. Quiz 60 × 0,45 = 27,00. Beispiel 150 × 9 = 1.350 < 150 × 8,33 × 1,25 = 1.561,875 → 1.561,88. 270 × 8,33 × 1,25 = 2.811,375 → 2.811,38. Sit. 2: 0,00. Sit. 3: 2.000,00. Sit. 4: 3.200,00 gegen 2.082,50, Folgeschaden 1.600 nicht ersetzt → 2.082,50. Quiz 500 kg: 6.000 > 5.206,25. 8.1: 20.000 / 19.000 / 4.165 / 14.835 / 1.000. Quiz 300 kg: 3.123,75 (Distraktor 14,17 = Mittel aus 20 und 8,33, stimmig). Beispiel Kap. 6: 1.500 + 375 = 1.875; 250 kg × 8,33 × 1,25 = 2.603,125 → 2.603,13; 3 × 300 = 900 > 700; zusammen 2.575,00. Übung 3: 22.347,90 + 5.959,44 = 28.307,34; 3.180,6 kg × 8,33 × 1,25 = 33.117,9975 → 33.118,00 (wie im Skript auf volle Euro); 3 × 475 = 1.425 > 1.050; Gesamt 29.357,34. Quiz Kap. 6: 2 × 250 × 4 + 250 × 4 × 0,5 = 2.500. Final: 700 × 18 = 12.600 > 7.288,75.
**Paragraphen:** § 425 (Gefährdung, Obhut), § 426 (unabwendbar), § 427 (offenes Fahrzeug, Verpackung, Ver-/Entladen, natürliche Beschaffenheit, Kennzeichnung, lebende Tiere), § 431 (8,33 SZR, jetzt richtig statt „§ 421“), § 449 (2–40 SZR, nur innerdeutsch), § 437-Gedanke (Erhöhung nur mit schriftlicher Zustimmung, Einschränkung wirkt automatisch), § 461 Abs. 2, §§ 408/410/411/413, Absenderhaftung 8,33 SZR verschuldensunabhängig, Verbraucher nur bei Verschulden. SZR-Definition (IWF, 5 Währungen). Alles zugeordnet wie im Skript.

## 2. Was den Lerneffekt kostet

**Vollständigkeit: vollständig.** Abgedeckt sind 1.1–1.10, 3–6, die Schadensarten-Zuordnung, die Positionstabelle, Sit. 1–4 (Höchstgrenze und Erstattung), die Aufgabe zu § 462 („eingesetzter FF“, MC in Kap. 4), die Korridor-Tabelle, 8.1 a–e, 8.2, Übung 1, 2.1–2.3, Übung 3 a–d (die Höchstgrenze 33.118 ist diesmal gefragt), 4.1, 4.2, 5.1, 5.2 a–c, 6.1–6.4 und 7.1–7.5. Die Versicherungsseite S. 7 steht nur im Accordion. Nicht eigens gefragt sind die [LÖSUNG]-Zwischenwerte 3.180,6 kg und 1.600 € (Folgeschaden Sit. 4). Beide stecken im Endergebnis, das ist vertretbar.

**Abschlussquiz (Korrektur Z. 150): greift nicht.** Neu ist nur 1 von 8 Fragen: die Rechnung mit 700 kg, die aber dieselbe Schablone wie das Quiz in Kap. 4 nutzt. Die übrigen 7 wiederholen Kapitelfragen:
- Kern „eigener LKW → Frachtrecht“ wiederholt 1.1 und das Quiz in Kap. 9.
- Verpackung → § 427 wiederholt 1.8.
- „reiner Vermögensschaden = unbeschädigtes Gut“ wiederholt die Quizze in Kap. 3 und 6.
- gefährliches Gut → Absender wiederholt das TF im Quiz von Kap. 7 und 4.1.
- „Erhöhung gilt nicht automatisch“ wiederholt Kap. 5 und 8 (zum ~10. Mal).
- Weber/Klein wiederholt 1.9.
- „Produktionsausfall nicht ersetzt“ wiederholt das Quiz in Kap. 4.

Vorher waren es 2/8 (L1) und 1/8 (L2), es gibt also keine Besserung. TF im final: 1 wahr zu 3 falsch, also 25 % und außerhalb der 40–60 %.

**Kapitelquizze: eher schlechter.** Etwa 10–11 von 33 Fragen bringen einen neuen Fall oder neue Zahlen, das sind ~32 % (L1 48 %, L2 39 %). Kap. 8 bringt 0/4 (Fischer/Aigner/Brandl = 6.1, Weinhändler = 6.3, beide TF = 7.1 und 7.5). Kap. 9 bringt 0/3. Kap. 2 bringt 0/3 (Hartl = Merke-Box). Kap. 7 bringt 1/4. Kap. 3 Frage 4 („Produktionsausfall absichern → Transportversicherung mit Zusatz“) steht wörtlich im Accordion desselben Kapitels. Kap. 9 TF „Das Lagergeschäft wird erst in der 11. Jgst. behandelt“ hat keinen Lernwert. Gute neue Fälle: Lenz und Bauholz im Regen (Kap. 1), Lieferfrist mit Wartekosten (Kap. 3), Brandl „per E-Mail informiert, aber nicht zugestimmt“ (Kap. 5), Meteorit (Kap. 6), Chemiefass (Kap. 7) und alle fünf neuen Rechnungen.

**Vorwegnahme** (sinngemäß, die Prüfstelle findet sie nicht):
- **Kap. 9, `drag_drop` + `fill_blanks` (Ergänzungen):** Beide fragen ab, was die Übersichtstabelle im selben Kapitel direkt darüber zeigt (§§, Haftungsprinzip, 8,33, dreifache Fracht). Das ist reines Abschreiben.
- **Kap. 6, Aufgabe 1:** Die Arbeitsauftrag-Box darüber sagt „die der **Straße** und dem Kraftwagen **eigentümlichen** Gefahren“. Damit sind 2 der 4 Lücken („eigentümliche“, „Straße“) vorgegeben.
- **Kap. 3, Positionstabelle:** Vorgegebene Zellen lösen Lücken in anderen Zeilen. „Höchstgrenze: unbegrenzt“ steht in Zeile 2 und löst Zeile 1. „max. 8,33 SZR je kg brutto“ steht in Zeile 3 und löst Zeile 2.
- **Kap. 8, 7.1 → 7.2:** Die richtige Option von 7.1 („… und kehren um“) und ihr Feedback („kehren zum Abgangsort zurück“) beantworten 7.2. Zum Teil liegt das am Skript, die Wirkung ist trotzdem da.
- **Kap. 6, Quiz-Rechnung:** „Die Höchstgrenze … liegt über dem Schaden“ nimmt den Vergleichsschritt vorweg. Übrig bleibt eine reine Güterschadenrechnung (wie L1).
- **Kap. 7, 4.1 `drag_drop`:** Die vier Absender-Pflichten stehen fertig als Kärtchen da. Die Gegenkategorie ist offensichtlich Frachtführer-Sache (Fahrfehler, Reifenpanne, verspätete Bereitstellung). Die Aufgabe „Nenne …“ wird so zum Sortieren nach „wer tut das?“, ohne Stoffkenntnis.
- **Kap. 8, 6.4 `drag_drop`:** Gleiche Wörter verbinden Karte und Kategorie („gesetzliche Haftung“ ↔ „Gesetzliche Regelhaftung“, „eingeschränkt“ ↔ „2 SZR“). Nur 3 Karten.
- *Behoben gegenüber Lauf 1/2:* 6.1 ohne Klammer-Lösung. Begegnungsverkehr ohne Accordion und Tipp-Box. Aufg. 5/6 ohne Lösung in der Frage. Sit. 3 ohne vorgelöste Lücken. Übung 3 nennt 33.118 nicht mehr in der Aufgabe. Die Lager-Spalte bleibt leer (F3 aus L2 behoben). Die Frage „Wie nennt man den Ausführenden?“ ist weg.

**Ratbarkeit** (nach Angleichung; MC/SC in Kapiteln, Quizzen, final und `single_choice_set`):

| | VORHER | L1 | L2 | **Lauf 3** |
|---|---|---|---|---|
| richtige = längste (inkl. gleich lang) | 69 % | 57 % | 72 % | **18/40 = 45 %** |
| davon deutlich (> 15 % länger) | 16 | 8 | 16 | **5** (7.1, 7.2, 7.5, Quiz Kap. 8 „Weinhändler“, final „Weber“) |
| TF wahr : falsch | 19 : 4 | 6 : 13 | 3 : 11 | **10 : 12 (45 % wahr)** |
| richtige Option auf Platz 1 / letzter Platz (Rohtext, MC/SC) | 35/36 / – | – | 38/39 / – | **2/34 / 0/34** |
| Auswahlfragen ohne Feedback | 1 | 6 | 9 | **15** (alle MC in Quizzen und final) |

- *TF:* Insgesamt ausgewogen. **Neues Muster:** Jedes der 9 Kapitelquizze hat genau 2 TF, und zwar **immer genau eine wahre und eine falsche**. Wer das einmal merkt, kennt nach der ersten TF die zweite. Das ist die Folge der neuen Regel „40–60 % auch innerhalb jedes Kapitelquiz“ bei 2 TF je Quiz.
- *Position:* Die richtige Option steht fast nie zuerst und nie zuletzt, sondern auf Platz 2 oder 3. Für H5P ist das wegen `randomAnswers` folgenlos (Word/Seite nicht geprüft).
- *Feedback:* Die `single_choice` in den Kapiteln haben jetzt Feedback, das neue Muster Z. 200 wirkt. Alle 15 MC in den `question_set`s und im final sind dagegen ohne Feedback, siehe P2. Dazu kommen 5.2 a–c und 7.3–7.5 als `single_choice_set` ohne jede Begründung, obwohl das Skript bei 7.3–7.5 „Begründen Sie“ verlangt.
- *Distraktoren:* Überwiegend ernsthaft. Absurd sind final „Absenderin, es gilt Absenderrecht“, final „Keinen von beiden, weil es zwei Frachtführer gibt“ und Kap. 4 Quiz „Pauschale je Palette“.

## 3. Feinschliff

- Kap. 5, Fall Müller: „euer Subunternehmer … für euch“ bricht die Du-Form.
- Kap. 4 bezieht sich auf „Situation 1–4“, deren Box im vorigen Kapitel steht. Weil jede Frage die nötigen Fakten wiederholt, ist das tragbar. Die neue Regel „Box direkt vor der Aufgabe“ ist hier aber nicht erfüllt.
- Kap. 8, 6.2: Die Situation steht im Fragefeld (Skript-Wortlaut), während die Variante 6.3 korrekt als Box davor steht.
- Lücken ohne Varianten bei langen Phrasen: „*dreifacher Betrag für Verlust*“, „*eigentümliche*“ (Beugung), „*verschuldensunabhängig*“ („unabhängig vom Verschulden“ wird nicht angenommen).
- Kap. 1 Accordion: VBGL und ADSP stehen schon im Vergleich darüber, „Frachtbrief“ ist Allgemeinwissen. Das Accordion von Kap. 1 könnte entfallen.
- Übung 3 „fünf Paletten“ (laut VORHER-Bericht 17 im Original) besteht fort. Für die Ergebnisse ist das harmlos.

## 4. Greifen die Korrekturen? Neue Probleme durch die Korrekturen

| Korrektur | Ergebnis |
|---|---|
| Accordion nur 3–5, nur bei Bedarf | **greift.** 2 Accordions mit je 3 Begriffen (L1/L2: eines in jedem Kapitel, 8–9 % der Antwort, jetzt 2 %). Kap. 3 bricht die Regel „kein Begriff, den eine Aufgabe abfragt“ (Transportversicherung → Quiz-Frage 4). |
| Keine Füllaufgaben zwischen Skript-Aufgaben | **greift.** Kein eigenes Element zwischen Skript-Aufgaben. 8.1 a–e und Übung 3 a–d bleiben zusammen. Ergänzungen gibt es nur in Kap. 9 (ohne Skript-Aufgabe), dort aber vorgelöst. |
| TF 40–60 % | **greift insgesamt** (45 %). Neues Muster „genau 1:1 je Quiz“, final 25 %. |
| Ausgangssituation als Box vor der Aufgabe | **greift** (Kap. 1, 2, 3, 5, 6, 7, 8 mit Boxen). Wahrscheinliche **Nebenwirkung:** Wo die Einlesung die Situation verloren hat, erfindet die KI jetzt einen Fall, damit die Box gefüllt ist. In Kap. 2 entsteht so A1/A2. L2 hatte in derselben Lage keine Box und fragte abstrakt. |
| `single_choice`-Muster | **greift** für Kapitel-SC (alle mit Feedback). |
| final mit 8 neuen Fragen | **greift nicht** (1/8 neu). |

**Neue Probleme durch die Korrekturen:**
- **N1 Prüfstelle widerspricht dem neuen Prompt** (`qualitaet.py`, nicht nachgezogen). Der Tipp „Kein Accordion im Kapitel“ kommt 7 × (Z. 432–435, prüft weiter auf die alte Pflicht), obwohl der Prompt jetzt „nur wenn nötig“ sagt. „Zwei gleiche Aufgaben hintereinander“ (Z. 451–457) meldet die fünf `calculation_exercise` von 8.1, die laut Z. 57 zusammenbleiben *sollen*, dazu die Skript-Folgen 2.1–2.3 (MC) und Aufg. 5/6 (SC). „Nur eine Lücke im langen Text“ (Z. 194) meldet die Quiz-Rechnungen mit einer Ergebnislücke, die das Muster Z. 298 genau so verlangt. Die Tipps gehen nicht in den Nachbesserungs-Prompt (`nur_wichtige=True`). Die Lehrkraft sieht aber 6 „Verbesserungen“, die der Prompt verbietet, und wer „alle Punkte“ nachbessern lässt, holt die alten Muster zurück. → `prompt-sync`: Accordion-Tipp streichen, Gleiche-Typen-Tipp nur für eigene Ergänzungen bzw. nicht für `calculation_exercise`, Ein-Lücken-Tipp nicht im `question_set`.
- **N2 TF 1:1 je Quiz** (siehe oben). Das folgt direkt aus Z. 58 „auch innerhalb jedes Kapitelquiz“.
- **N3 Erfundener Fall Kap. 2** (A1/A2). Das wird wahrscheinlich durch Z. 112 verstärkt.

## 5. Systematisch oder einmalig – mit Prompt-Stelle

**Systematisch, Ursache im Prompt:**
- **P1 Neuheit in Quizzen und final scheitert an der Menge** (Kap.-Quiz ~32 % neu, final 1/8). Z. 90 verlangt „**3–4 Fragen**, nur neue Fälle“ für jedes der 9 Kapitel, Z. 150 dazu „8 Fragen … keine wiederholt“. Für ein 17-seitiges Heft sind das ~41 „neue“ Fälle, so viel gibt der Stoff nicht her. Die beiden Vorgaben (Anzahl gegen Neuheit) widersprechen sich, und die KI löst den Widerspruch zugunsten der Anzahl. Vorschlag für `CLAUDE.md`: *„question_set: 2–4 Fragen; lieber 2 neue Fälle als 4 mit Wiederholung. Keine Frage, deren Antwort im Lehrtext oder in einer Aufgabe der Einheit schon steht. final_chapter: 6–8 Fragen, jede mit neuem Fall oder neuen Zahlen; ist der Stoff erschöpft, weniger Fragen.“* Der Vorschlag Nr. 7 aus dem Vorlauf ist damit weiter offen.
- **P2 Quiz-MC ohne Feedback** (15 ×). Das AUSGABEFORMAT zeigt im `question_set` (Z. 287–296) und im final weiterhin MC-Antworten **ohne** `feedback:`. Nachgezogen wurde nur das Muster für `single_choice` (Z. 200). Vorschlag: im `question_set`-Muster `feedback:` je Option ergänzen. Satz: *„Auch im question_set und im final_chapter hat jede Auswahl-Option ein Feedback.“* Maschinell prüfbar → `qualitaet.py` gelb „Auswahlfrage ohne Feedback“.
- **P3 TF-Regel je Quiz zu starr** (Z. 58, Z. 161). Bei 2 TF je Quiz erzwingt „40–60 % auch innerhalb jedes Kapitelquiz“ genau 1:1. Vorschlag: *„40–60 % wahr über die ganze Einheit; in einem Quiz nicht alle TF gleich.“*
- **P4 Fehlende Situation → Erfindung** (A1/A2; L1 hatte dasselbe). Z. 111/112 sagen „Situation exakt übernehmen“ und „komplexe Aufgaben bekommen eine Box“, aber nichts dazu, was bei *fehlender* Situation gilt. Vorschlag (wie im Vorlauf Nr. 6): *„Fehlt erkennbar die Situation zu einer Skript-Aufgabe, erfinde einen Fall je Situation, der genau zu den [LÖSUNG]-Zeilen passt. Lege Aufgaben, die im Skript zu verschiedenen Situationen gehören, nie in einen Fall zusammen, und gib dem Fall keine Rolle (z. B. Fixkostenspediteur), die die [LÖSUNG] verändern würde.“* Der eigentliche Hebel bleibt die Reparatur der Einlesung (S. 4–5 und S. 8).
- **P5 Prüfstelle nicht nachgezogen** (N1). Das ist kein Prompt-Fehler, sondern ein fehlender Lauf von `prompt-sync` für `qualitaet.py` Z. 194, 432–435 und 451–457.

**Einmalig** (Nachbesserungs-Prompt genügt): A3 (1.10-Titel), A4 („nur ganz oder gar nicht“), A5 (VBGL), Kap. 9 Ergänzungen vorgelöst, Kap. 6 Aufg. 1 Lücken in der Box, Kap. 7 4.1 Sortieraufgabe ohne Stoff, Accordion Kap. 3 → Quizfrage, Du-Form in Kap. 5.

## 6. Was ich nicht beurteilen konnte

- Den Originalwortlaut von Situation 3/4, Abschnitt 2 und der Einleitung zu Übung 3 kenne ich nicht, weil die Einlesung sie verloren hat. A1–A3 sind daran gemessen, was das Skript in den [LÖSUNG]-Zeilen zeigt.
- Kap. 9: Ob „unbegrenzt (strittig)“ im Original zur Speditions-Spalte bei den Vermögensschäden gehört, lässt der zerrissene Tabellentext nicht erkennen.
- Darstellung in H5P (Mischung der Antworten, Tabellen-HTML im Lückentext) habe ich nicht gerendert. Word und Seite habe ich nicht geprüft.

*Prüfstelle meldet zusätzlich (alle Tipp): zweimal fill_blanks hintereinander (Kap. 1); „Nur eine Lücke im langen Text“ (5 ×); „Kein Accordion im Kapitel“ (7 ×); gleiche Typen hintereinander in Kap. 2, 4 und 6 (siehe N1).*
