# Abnahme Lauf 4: „Ganzes Skript → H5P“, STG Heft 2 (PROJ-68)

**Grundlage:** `lauf3/prompt_heft2_skript_v2.txt`. Neu gegenüber Lauf 3: Quiz-Muster mit `feedback` (Z. 288–301), Wahr/Falsch 40–60 % über die ganze Einheit (Z. 58, 161), je Skript-Situation ein eigener Fall (Z. 111), „neu“ = Abwandlung genügt (Z. 90, 150) und Selbstprüfungspunkt Z. 162. Skripttext `heft2_skript_neu.txt` ist vollständig: Situation 1–5, Überschrift „2. Die Haftung des Spediteurs“, 17 Paletten in Übung 3. Antwort `lauf3/antwort_heft2_skript_v2.yaml`: 10 Kapitel, 90 Elemente, 76,8 KB (Lauf 3: 9 Kapitel, 85 Elemente, 80,9 KB).
Geladen über `kern._antwort_laden(…, "skript", "h5p")` im Worktree `Werkzeugkiste-paket1`.

**Prüfstelle:** grün mit 3 Tipps (zwei gleiche Typen hintereinander in K1 und K9, „richtige Antwort meist die längste“ bei 21/31). Die Fehlalarme aus N1 in Lauf 3 sind weg.
**Bilder:** 3 von 4, das Logo fehlt. So ist es gewollt.

**Kurzurteil:** **Besser als Lauf 3, aber in dieser Form knapp nicht auslieferbar.** Alle Rechnungen stimmen. Alle Skript-Aufgaben sind da. Die Kapitel zu Spediteurhaftung und Situation 3/4 sind jetzt fachlich sauber, A1–A3 sind behoben. Alle Auswahlfragen haben Feedback. Die Neuheit der Quizfragen steigt von ~32 % auf ~50 %, im Abschlussquiz von 1/8 auf 4/8.
Neu hinzugekommen sind:
- eine fachlich irreführende Feedback-Stelle beim Begegnungsverkehr (7.4)
- eine nicht lösbare Quizfrage (K10)
- Teilaufgaben, die die Ergebnisse anderer Teilaufgaben nennen
- der fehlende Abschnitt 9 „Zusammenfassung“
- die Ratbarkeit „längste Antwort“ ist deutlich schlechter (68 % statt 45 %)

Nach **einer** gezielten Nachbesserung ist die Einheit einsetzbar.

---

## 1. Was die Klasse falsch lernen würde

| # | Fundstelle | Befund | Schwere |
|---|---|---|---|
| **B1** | K10, 7.4, Distraktor „Frachtführer Odin, weil er den Auftrag erhielt“ mit Feedback „Nein – der Schaden entstand nicht in seinem Abschnitt.“ Dazu 7.3, Feedback „bei nachweisbarem Abschnitt haftet **nur** der dortige Frachtführer“ | Gelernt wird: Ist der Schaden in Herolds Abschnitt nachweisbar, ist der vertragliche Frachtführer Odin frei. Das ist falsch. Odin haftet gegenüber dem Absender für die ganze Strecke und auch für Herold (§ 428 HGB), Herold haftet daneben als Gesamtschuldner (§ 437 Abs. 3). Es widerspricht auch der Einheit selbst: 7.5 sagt „Odin haftet für die gesamte Strecke“, 1.9 „wir haften für den ausführenden Frachtführer“, K7 „Baumgartner steht für Lenz ein“. Die Skript-Lösung „Herold“ bleibt richtig. Falsch sind der von der KI gewählte Distraktor und die Begründung „nur“. | **mittel** (einmalig, vom Skript begünstigt) |
| **B2** | K10 Quiz, `single_choice` „Frachtführer Weber (Passau) und Frachtführer Roth tauschen in Nürnberg …“ | Wer vertraglicher Frachtführer ist, steht nirgends. Die richtige Antwort „Weber, weil er für die ganze Strecke haftet“ lässt sich aus dem Sachverhalt nicht ableiten, das Feedback setzt diese Rolle stillschweigend voraus. Die Frage ist so geraten statt gelöst. | **mittel** (einmalig) |

**Nachgerechnet, alles richtig:**
- **Kap. 1:** Beispiel 8.400 − 8.150 = 250 × 2,50 = 625,00. 1.4: 270 × 3,20 = 864,00. Quiz: 360 × 1,80 = 648,00.
- **Kap. 4:** Quiz 820 × 3 = 2.460,00 (< 3.100).
- **Kap. 6:**
  - Beispiel: 150 × 12 = 1.800 > 150 × 8,33 × 1,20 = 1.499,40.
  - Sit. 1: 270 × 8,33 × 1,25 = 2.811,375 → 2.811,38, erstattet 864,00. Sit. 2: 0. Sit. 3: 2.000,00. Sit. 4: 200 × 8,33 × 1,25 = 2.082,50 < 3.200.
  - Quiz: 90 × 8,33 × 1,40 = 1.049,58.
- **Kap. 8:** 8.1: 20.000 / 19.000 / 4.165 / 14.835 / 1.000. Quiz: 250 × 8,33 × 1,30 = 2.707,25.
- **Kap. 9:** Übung 3: 22.347,90 + 5.959,44 = 28.307,34; 3.180,6 × 8,33 × 1,25 = 33.117,9975 → 33.118,00 (Skript-Wert); 3 × 475 = 1.425 > 1.050; gesamt 29.357,34. Quiz: 1.200 × 5 = 6.000 (< 12.495).
- **Kap. 10:** Quiz 300 × 8,33 × 1,25 = 3.123,75.
- **Abschlussquiz:** 640 × 8,33 × 1,20 = 6.397,44.

**Paragraphen geprüft und richtig:**
- **Frachtführer:** § 425 (Obhut, verschuldensunabhängig), § 426 (unabwendbar), § 427 (alle 6 Ausschlüsse; „offenes Fahrzeug + Regen → Ausschluss“ im Abschlussquiz ist richtig), § 431 (8,33 SZR; das Skript-„§ 421“ in Kap. 8 ist zu § 431 korrigiert, Lieferfrist 3-fache Fracht, sonstige Vermögensschäden 3-facher Verlustbetrag).
- **Spediteur:** Fixkostenspediteur wie Frachtführer (§ 459), § 461 Abs. 2 (Verschulden, umgekehrte Beweislast) und Obhutshaftung im Umschlag, § 462.
- **Haftung ändern und Absender:** § 449 (2–40 SZR, nur innerdeutsch), Erhöhung nur mit Information und schriftlicher Zustimmung, Einschränkung automatisch. §§ 408/410/411/413, Absender 8,33 SZR verschuldensunabhängig, Verbraucher nur bei Verschulden.
- **Versicherung:** GüKG-Pflichtversicherung.

**A4 aus Lauf 3 ist entschärft:** „Hälfte/Teilung“ wird jetzt nur noch mit „hier“ verneint.

## 2. Was den Lerneffekt kostet

**Vollständigkeit:** Alle Skript-Aufgaben sind vorhanden: 1.1–1.10, Text 1 und Aufg. 2–6 zu Sit. 3/4, die Zuordnung der Schadensarten, die Positionstabelle, 6.1/6.2 zu Sit. 1–4, § 462, die Korridortabelle, 8.1 a–e, 8.2, Übung 1, 2.1–2.3, 3 a–e, 4.1, 4.2, 5.1, 5.2 und 6.1–6.4 und 7.1–7.5.
- **B3 (mittel): Skript-Abschnitt 9 „Zusammenfassung“ fehlt ganz.** Es fehlt die Übersichtstabelle Fracht-/Speditions-/Lagergeschäft mit Rechtsgrundlage, Haftungsprinzip, Höchstgrenzen und Ausschlüssen. Gesucht nach „Lagergeschäft“, „467“ und „strittig“, keine Treffer. Lauf 3 hatte das Kapitel. Die 8 Kernaussagen im `summary` ersetzen die Tabelle nur zum Teil.
- Nicht eigens gefragt sind die [LÖSUNG]-Werte 3.200 € (Schaden Sit. 4), 1.600 € (Folgeschaden Sit. 4) und 3.180,6 kg. Wie in Lauf 3 ist das vertretbar.

**B4 (mittel, systematisch): Teilaufgaben nennen die Ergebnisse anderer Teilaufgaben.** In H5P stehen alle auf derselben Seite, man liest sie also vor dem Lösen:
- **8.1 (d)** nennt „PIL haftet mit 19.000,00 €, Ferntrans mit 4.165,00 €“. Das sind die Lösungen von (b) und (c). **8.1 (e)** nennt noch einmal 19.000,00. Übrig bleiben zwei bloße Subtraktionen gegebener Zahlen.
- **Kap. 6, Sit. 1 Erstattung** nennt „Höchstgrenze beträgt 2.811,38 €“, die Lösung der Aufgabe direkt davor.
- **Kap. 6, Sit. 4 Erstattung** nennt „Höchstgrenze 2.082,50 €“. Das ist die Lösung der vorigen Aufgabe **und** die eigene Lösung.
- **Übung 3 (e)** nennt „Güterschaden in voller Höhe plus … in Höhe des angegebenen Schadens 1.050,00 €“. Das nimmt die beiden Vergleichsentscheidungen vorweg, die das Skript als Lösung ausweist. **3 (b)** gibt zusätzlich den Rechenweg vor („Rechne mit der beschädigten Menge: 3 Paletten gänzlich und 2 Paletten zu je 40 %“). Genau das ist der Kniff der Aufgabe.

In Lauf 3 war das bei Übung 3 behoben. Jetzt tritt es an mehreren Stellen auf, wo die KI eine Skript-Rechnung in Teile zerlegt.

**Neuheit der Quizfragen (Korrektur P1): greift teilweise.**

| Kapitel | neu / Fragen | Wiederholung |
|---|---|---|
| K1 | 3/4 | TF Fixkostenspediteur = Lehrtext 1.10 wörtlich |
| K2 | 2/3 | TF Beweislast = Lehrtext |
| K3 | 2/4 | beide TF (Nachnahme, „teilweise“) = Tabelle im Lehrtext |
| K4 | 1/4 | Moser „Schreibtisch → Verschulden“ und beide TF = vorgegebene Tabellenzeile 1 |
| K5 | 0/3 | alle drei aus Tipp-Box/Vergleich, zwei davon zum selben Satz („Zusatz zur Transportversicherung“) |
| K6 | 2/4 | SZR-Definition = Lehrtext, „immer voller Warenwert“ = Beispielrechnung |
| K7 | 2/3 | TF Güterfolgeschäden = `fill_blanks` direkt darüber |
| K8 | 2/4 | TF „automatisch“ = Korridortabelle, TF „veränderbar“ = Lehrtext |
| K9 | 1/4 | Hagel steht wörtlich in Übung 1, TF Verbraucher = 4.2, TF Güterfolgeschäden zum ~6. Mal |
| K10 | 3/4 | TF Begegnungsverkehr = 7.1 |
| **gesamt** | **18/37 ≈ 50 %** | Lauf 3: ~32 % |

**Abschlussquiz:** 4/8 neu (Moll-Pauschalpreis, Eder-Umschlag, 640-kg-Rechnung, Hauser „offenes Fahrzeug + Regen“, die beste Frage der Einheit). Die übrigen wiederholen:
- § 462 wiederholt K7.
- „Regen/Glatteis keine höhere Gewalt“ wiederholt Übung 1.
- „Information + schriftliche Zustimmung“ wiederholt die Korridortabelle und 6.2.
- **Nachnahme wiederholt das TF im K3-Quiz.** Das verbietet Z. 150 ausdrücklich.

Lauf 3 kam auf 1/8.
**Über die Quizgrenzen hinweg** wiederholen sich Fälle:
- K1 Brandl/Huber ≈ K7 Baumgartner/Lenz
- K2 Aigner ≈ K4 Moser
- K8 Weber 40 SZR ≈ K10 Hartl 20 SZR
- dazu dreimal dieselbe Schablone „x kg × 8,33 × Kurs“

**Muster:** Fast alle Wiederholungen kommen aus **Lehrtext, Tabelle oder Tipp-Box**. Diese Quellen nennt die Neuheitsregel nicht (siehe P6).

**Ratbarkeit** (MC/SC in Kapiteln, Quizzen und final, 31 Fragen):

| | Lauf 3 | **Lauf 4** |
|---|---|---|
| richtige = längste (inkl. gleich lang) | 18/40 = 45 % | **21/31 = 68 %** |
| davon deutlich (> 15 % länger) | 5 | **10** (Aufg. 5, 2.1, 2.2, 2.3, 7.3; Quiz K2 Kraus, K5 Roth, K6 500 €, K10 Weber; final Hauser) |
| TF wahr : falsch | 10 : 12 | **9 : 9 (50 %)** |
| Auswahlfragen ohne Feedback | 15 | **0** |

- **B5 (mittel): Die Ratbarkeit ist schlechter.** Die Prüfstelle meldet sie, aber nur als Tipp. Ursache: Bei „Begründe!“-Aufgaben (2.1–2.3, 7.3–7.5, Aufg. 5) und bei Quiz-Fällen trägt nur die richtige Option eine Begründung („Ja, mit Ölspuren muss er als Gefahr der Straße rechnen“), die Distraktoren sind kurze Behauptungen. Seit P2 sind 7.3–7.5 MC statt `single_choice_set`. Das bringt Feedback, aber auch dieses Längenmuster.
- *TF:* Insgesamt genau 50 %. Das **1:1-Muster bleibt**: Alle 4 Quizze mit 2 TF haben genau eine wahre und eine falsche Aussage. Von den 6 Quizzen mit 1 TF sind 4 falsch. Weil der Generator `randomQuestions: True` setzt, wirkt nur noch das 1:1. Das ist gering.
- *Distraktoren:* Überwiegend ernsthaft. Absurd sind:
  - „Reisegepäckversicherung des Fahrers“ (K5)
  - „Rabatt für Stammkunden“ (K6)
  - „Mittelwert“ (K6)
  - „Nur an den Hersteller“ (K1)
  - „Der Empfänger in Lörrach als Auftraggeber“ (7.5)
  - „Weil die Brücke öffentliche Infrastruktur ist“ (2.2)
- *Feedback:* Fast überall mit Grund. Dünn sind einzelne Distraktor-Feedbacks in 2.2/2.3 und 7.4 („Nein – das ändert nichts an der Haftung.“, „… ist nicht der Grund.“, „Der Fahrerwechsel ändert nichts.“).

**Vorwegnahme, sonst:**
- **K4 Positionstabelle (besteht fort, gering):** Die vorgegebene Zeile 1 („Vermögensschäden: unbegrenzt“) löst die Lücke in Zeile 2, die „8,33“ in Zeile 2 löst Zeile 3.
- **K9 Quiz-Rechnung (besteht fort, gering):** „Die Höchstgrenze liegt weit über dem Schaden“ nimmt den Vergleich vorweg.
- **K5:** `single_choice` „Wer deckt die Differenz?“ fragt dasselbe wie das Kärtchen „Sie springt bei der Deckungslücke ein“ im `drag_drop` direkt davor. Die beiden Ergänzungen decken sich also.
- *Behoben gegenüber Lauf 3:* Die vorgelösten Ergänzungen in K9 sind weg (das Kapitel fehlt allerdings ganz, siehe B3). In Übung 1 ist jetzt nur noch 1 Lücke („Straße“) durch die Aufgabenstellung vorgegeben statt 2. 4.1 ist kein Sortieren ohne Stoff mehr. 6.4 ist kein Wortgleichheits-`drag_drop` mehr. Der Lehrtext in K2 lässt den Satz „unabwendbares Ereignis“ weg, der Aufg. 4 vorgelöst hätte.

## 3. Feinschliff

- **K4 Tabelle:** Die Lücke `*dreifacher Betrag für Verlust/dreifacher Betrag* für Verlust des Gutes` ergibt als Hauptlösung „… für Verlust für Verlust des Gutes“. Nur die zweite Variante passt.
- **K2 Aufg. 2:** Die Skript-Lösung „haftet, wenn ihm ein Verschulden **nachgewiesen** werden kann“ steht neben dem Lehrtext und dem Quiz-TF zur **umgekehrten** Beweislast. Das ist vom Skript vorgegeben, kein Fehler der KI. Die Lehrkraft sollte es aber wissen.
- **Namen:** „Roth“ steht in drei Rollen (K5 Spedition, K10 zweimal Frachtführer), „Kraus“ und „Weber“ je zweimal. In K10 stehen beide Roth-Fragen im selben Quiz. Das kann verwirren.
- **Accordion K1:** VBGL/ADSP stehen schon im Vergleich darüber (wie in Lauf 3). Bei VBGL ist der Name weiter verkürzt, aber nicht mehr falsch.

## 4. Vergleich mit Lauf 3

| Lauf 3 | Lauf 4 |
|---|---|
| A1 erfundener Fixkosten-Fall, Distraktor „Frachtrecht“ | **behoben.** Sit. 3/4 stehen wie im Skript, Aufg. 5 ist sauber. |
| A2 zwei Haftungsprinzipien in einem Fall | **behoben.** Sit. 3 (Verschulden) und Sit. 4 (Obhut) sind getrennt. |
| A3 1.10 „Fixkostenspediteur“ als falscher Lückentext | **behoben.** 1.10 ist jetzt Lehrtext in K1. |
| A4 „nur ganz oder gar nicht“ | **behoben** (mit „hier“ eingeschränkt). |
| A5 VBGL-Name | entschärft (verkürzt, nicht falsch). |
| N2 TF 1:1 je Quiz | **teilweise.** Gesamt 50 %, aber jedes Quiz mit 2 TF ist weiter 1:1. |
| P1 Neuheit Quiz / final | **verbessert.** ~32 % → ~50 %, final 1/8 → 4/8. Ziel nicht erreicht. |
| P2 Quiz-MC ohne Feedback | **behoben** (0 von 31). |
| P3 TF-Regel zu starr | **behoben** im Prompt, Wirkung siehe N2. |
| P4 fehlende Situation → Erfindung | **behoben** (neue Einlesung und Z. 111). Kein erfundener Fall mehr. |
| N1 Prüfstelle widerspricht dem Prompt | **behoben** (keine Accordion- und Ein-Lücken-Fehlalarme mehr). |

**Neu:** B1 (7.4-Feedback), B2 (Weber/Roth unlösbar), B3 (Abschnitt 9 fehlt), B4 (Teilaufgaben nennen Ergebnisse), B5 (Ratbarkeit 45 % → 68 %).

## 5. Systematisch oder einmalig, mit Prompt-Stelle

**Systematisch, Ursache im Prompt:**
- **P6 Neuheitsregel nennt die Quellen nicht vollständig.** Z. 90 sagt „keine Wiederholung der Kapitelaufgaben oder des Accordions“, Z. 162 sagt „in einer Aufgabe, einem Feedback oder einem Accordion“. **Lehrtext, Tabellen und Tipp-/Merke-Boxen fehlen**, und genau daraus stammen fast alle Wiederholungen (K4 1/4, K5 0/3). Außerdem verbietet nichts, dass sich Fälle zwischen Kapitelquizzen wiederholen. Formulierungsvorschlag für `CLAUDE.md`: *„Keine Quizfrage, deren Antwort wörtlich oder sinngemäß im Lehrtext, in einer Tabelle, einer Box, einer Aufgabe, einem Feedback oder einem früheren Quiz steht. Eine Abwandlung braucht einen Transfer (anderer Umstand, der die Entscheidung prüft), nicht nur einen anderen Firmennamen.“* Offen bleibt die Spannung „3–4 Fragen“ gegen „nur neue“. Die Lehrkraft hat entschieden, die Anzahl zu behalten. Dann muss die Regel die Quellen vollständig nennen.
- **P7 Zerlegte Skript-Rechnungen nennen Zwischenergebnisse (B4).** Z. 39 („`calculation_exercise` je Aufgabe“) und Z. 57 („Rechenaufgaben des Skripts bleiben zusammen“) führen zum Zerlegen in a–e. Wie eine Teilaufgabe auf ein früheres Ergebnis verweist, regelt aber keine Stelle. Z. 50 („kein Zwischenergebnis in einer Frage“) wird dabei gebrochen. Vorschlag: *„Zerlegst du eine Skript-Rechnung in Teilaufgaben, nennt keine Teilaufgabe das Ergebnis einer anderen oder die Entscheidung des Vergleichs. Verweise mit ‚dein Ergebnis aus (b)‘.“* Maschinell prüfbar: `qualitaet.py` könnte melden, wenn ein `result` einer `calculation_exercise` als Zahl in einer anderen `task` desselben Kapitels vorkommt (gelb).
- **P8 „Begründe“-Aufgaben als MC → richtige Antwort am längsten (B5).** Z. 58 verlangt gleich lange Optionen, die Muster Z. 191–212 zeigen aber keine Begründung in den Optionen. Vorschlag: *„Verlangt die Aufgabe eine Begründung, trägt **jede** Option eine Begründung gleicher Länge (‚Nein, weil …‘ / ‚Ja, weil …‘).“* Die Prüfstelle meldet das schon. Bei > 50 % sollte sie es aber als **gelb** statt als Tipp melden, damit es in den Nachbesserungs-Prompt kommt (`qualitaet.py`, Regel „Richtige Antwort meist die längste“).
- **P9 Skript-Abschnitt ohne Aufgabe fällt weg (B3).** Z. 12 verlangt „alle Themen“, die Selbstprüfung Z. 156–157 zählt aber nur Aufgaben und Bilder. Vorschlag für die Selbstprüfung: *„Jeder nummerierte Abschnitt des Skripts (auch Zusammenfassungen und Übersichtstabellen) steht in einem Kapitel.“*

**Einmalig** (ein Nachbesserungs-Prompt genügt):
- B1: 7.4-Distraktor ersetzen, Feedback in 7.3 ohne „nur“.
- B2: Weber als vertraglichen Frachtführer benennen.
- K4: Lücke „dreifacher Betrag“.
- K5: Doppelung der beiden Ergänzungen.
- Namen Roth/Kraus.
- Absurde Distraktoren.

**N2 (TF 1:1):** Durch `randomQuestions` ist das gering. Will man es ganz weg: *„In einem Quiz mit zwei Wahr/Falsch-Aussagen dürfen auch beide wahr oder beide falsch sein.“*

## 6. Was ich nicht beurteilen konnte

- Die Original-Tabelle in Abschnitt 4 (Spalten 2/3 als [LEER]) und die Übersicht in Abschnitt 9 sind in der Einlesung zerrissen. Ob die vierte Spalte in Abschnitt 4 im Schülerheft leer ist, lässt sich nicht sicher sagen. Die Lückenwahl der KI ist plausibel.
- Gerendertes H5P (Tabellen-HTML im Lückentext, Seitenaufteilung) habe ich nicht geprüft, Word und Seite auch nicht.

*Prüfstelle meldet zusätzlich (Tipp): zwei `fill_blanks` hintereinander (K1, 3 Stellen), zwei `multiple_choice` hintereinander (K9, 2.1–2.3, Skript-Folge), „richtige Antwort meist die längste“ (21/31).*
