# Abnahme: drei Einheiten (Kahoot Seefracht, Klassenarbeit Heft 2, Arbeitsblatt Seefracht)

Stand 2026-11-03. Maßstab: die mitgelieferten Prompts und Skripttexte. Prüfstelle (`messe_antwort.py … word`)
meldet für alle drei **grün, 0 Befunde**. Alles Folgende ist zusätzlich. Am Repository wurde nichts geändert.

Nachgerechnet habe ich **jede** Zahl in Antworten und Musterlösungen. **Keine Rechnung ist falsch.** Das gilt für
Frachttonnen, M/G-Entscheidung, Staffel, Kursumrechnung, Wertrate mit Mindestfracht, FAK mit Umschlag und Rabatt,
BAF/CAF und Sofortrabatt sowie 8,33 SZR × 1,25 €, Deckungslücke und Haftungskorridor. Die Schwächen liegen
in der Didaktik, nicht in den Zahlen.

---

## 1. Kahoot – Seefrachtrechnen (12 Fragen, ~2.400 Zeichen)

**Urteil:** Alles fachlich richtig und knapp, aber durch die Antwortposition fast vollständig erratbar.

### Was die Klasse falsch lernen würde
Nichts. Geprüft habe ich frt = 1 t oder 1 m³, M/G = höherer Wert, 4,8 m³/6,5 t → Gewicht, 1,875 × 70 = 131,25 €,
7,45 : 2,31 = 3,225 → „bis 4x“ = 24,90 USD, 13,375 × 123 = 1.645,13 USD : 1,15 = 1.430,55 € (wie im Skript),
3,1 % × 26.800 = 830,80 € → Mindestfracht 3.200 €. Alles stimmt.

### Was den Lerneffekt kostet
- **HOCH – Richtige Antwort steht fast immer an Platz 1.** Bei 11 von 12 Fragen ist `correct: [1]`, bei allen
  10 Multiple-Choice-Fragen. In Kahoot heißt das: Wer immer das rote Dreieck drückt, gewinnt. Ein Fehler der Ausgabe
  verstärkt das: `ausgabe.build_kahoot_xlsx` mischt die Antworten nicht.
  → **Prompt-Lücke:** Das Formatbeispiel in `prompts._kahoot_body` (AUSGABEFORMAT) zeigt für die MC-Frage
  `correct: [1]`, und keine Regel verlangt eine wechselnde Position. Das Modell übernimmt das Beispiel. Das ist
  **maschinell prüfbar** und gehört nach `qualitaet._pruefe_kahoot`, z. B. als Befund, wenn mehr als 50 % der
  richtigen Antworten an derselben Position stehen. Alternativ mischt `build_kahoot_xlsx` die Antworten mit festem Seed.
- **MITTEL – Frage 10 ist durch die Kürzung mehrdeutig.** „…Welche Rate? 2x: 26,40; 4x: 24,90; 6x: 23,40 USD“:
  Ohne „bis … messend“ ist unklar, ob „2x“ eine Obergrenze oder einen genauen Wert meint. Frage 3 („Wie viel
  ergibt eine Frachttonne?“) ist sprachlich schief. Das ist ein **Ausrutscher**. Der Prompt nennt die 95-Zeichen-Grenze,
  sagt aber nicht, dass man bei Platznot den Inhalt vereinfachen soll statt abzukürzen.
- **MITTEL – Der Fragenpool lässt Teile aus.** Es fehlen reine Maßraten, Wertstaffel, FAK-Raten,
  Schwergut- und Längenzuschlag (H.L./L.A.), das Abrechnungsschema und die Rabatte (Sofortrabatt 9,5 %). Zu den
  Zuschlägen gibt es nur eine Frage (BAF), zu M/G dagegen drei (6, 7, 10). Das ist ein **Ausrutscher**, denn der
  Prompt verlangt „Decke die wichtigsten Inhalte … ab“.

### Feinschliff
- Einige Distraktoren sind absurd und machen die Frage ratbar: F2 „Fahrtrichtung/Fertigtonne“, F3 „1 kg oder 1 Liter“,
  F12 „26.800,00 EUR“ (das ist der Warenwert).
- F7, F8, F10, F11 und F12 sind die Beispiele aus dem Skript mit denselben Zahlen. Wer das Lösungsskript kennt,
  erinnert sich an das Ergebnis, statt zu rechnen. Für ein Kahoot ist das vertretbar.

### Länge
Unauffällig. Mit rund 600 Token ist die Antwort sehr knapp, kein Teil ist aufgebläht.

---

## 2. Klassenarbeit – Heft 2 Haftung (14 Aufgaben, 60 P., 60 Min., ~11.200 Zeichen)

**Urteil:** Rechnerisch und rechtlich korrekt (Punktesumme 60, MC-Anteil 18 P. = 30 %, aufsteigende AFB). Die Arbeit
besteht aber fast nur aus übernommenen Skriptaufgaben, mehrere Aufgaben verraten sich gegenseitig, und das
Speditionsrecht fehlt ganz.

### Was die Klasse falsch lernen würde
Nichts Rechnerisches. Geprüft habe ich §§ 407–452 / 453–466 / 467–475 HGB, 8,33 SZR/kg brutto, dreifache Fracht bei
Lieferfristüberschreitung, die sechs Ausschlüsse nach § 427 HGB, 270 kg × 3,20 = 864 €, 270 × 8,33 × 1,25 = 2.811,38 €,
200 kg: 3.200 € gegen 2.082,50 €, 100 kg: 1.041,25 €, 400 kg: 20.000 / 19.000 / 4.165 / 14.835 €,
2-SZR-Begrenzung gilt automatisch, eine Erhöhung nur mit schriftlicher Zustimmung. Fristen kommen im Heft nicht vor,
also auch nicht in der Arbeit.

- **MITTEL – Der Fall widerspricht sich selbst.** Die Ausgangssituation nennt das offene Fahrzeug. Aufgabe 4 sagt
  ausdrücklich „vereinbarungsgemäß im offenen Fahrzeug“. Aufgabe 10 verlangt dann aber: „Gehe davon aus, dass kein
  Haftungsausschluss vorliegt“ → 864 €. Im Skript (S. 7, Situation 2) steht genau für diesen Fall
  **0,00 € (Haftungsausschluss)**. Wer das Heft gelernt hat, schreibt 0 € und gerät in Konflikt mit der Aufgabe. Die
  wichtigste Transferfrage des Falls (Ausschluss → keine Erstattung) wird damit nicht geprüft. Das ist ein
  **Ausrutscher**, verstärkt durch die Regel „EINE Ausgangssituation“ (Prompt Z. 16).

### Was den Lerneffekt kostet
- **HOCH – Aufgaben lösen sich gegenseitig vor.** In Aufgabe 6 (MC, 3 P.) lautet Option B wörtlich „Gefährdungshaftung …
  unabhängig vom Verschulden …, solange das Gut in seiner Obhut ist“. Genau das ist der Erwartungshorizont von
  Aufgabe 8 (4 P.). In Aufgabe 4 nennt die Aufgabenstellung selbst den ersten der vier geforderten Ausschlüsse
  (offenes Fahrzeug). Damit sind etwa 5 Punkte geschenkt.
  → **Prompt-Lücke:** Der Prompt verlangt „EINE Ausgangssituation“ und „Teilaufgaben bauen logisch aufeinander auf“
  (Z. 16, 18). Eine Regel, dass keine Aufgabe die Lösung einer anderen enthalten darf, fehlt.
- **HOCH – Bei MC ist fast immer B richtig.** Bei 5 von 6 MC-Aufgaben ist die Antwort B (Aufgaben 2, 3, 6, 7, 12), nur
  Aufgabe 1 hat A. In Aufgabe 6 ist B außerdem die mit Abstand längste Option. Auch die Word-Ausgabe mischt nicht.
  → **Prompt-Lücke:** Das Formatbeispiel zeigt `answer: "B"` (Prompt Z. 41), genau wie beim Kahoot. Das ist
  **maschinell prüfbar** (Anteil gleicher Buchstaben) und gehört nach `qualitaet.py`.
- **MITTEL – AFB III besteht aus wörtlich übernommenen Skriptfällen.** Aufgabe 12 entspricht Skript 6.3 (Deininger,
  2 SZR), Aufgabe 13 entspricht Skript 2.2/2.3 (Sturm, Frost) samt Lösungssätzen, Aufgabe 14 entspricht Skript 8.1
  (Müller/Ferntrans, gleiche Zahlen). Auch Aufgabe 10 (Mooshofer) und Aufgabe 11 (Situation 4) übernehmen die Skriptzahlen.
  Die Klasse kennt die Lösungen aus dem Lösungsheft, deshalb ist das Reproduktion und kein Transfer. Das sind 21 von
  60 Punkten mit AFB-III-Etikett.
  → **Prompt-Lücke, zwei Regeln widersprechen sich:** Z. 4 sagt „AFB III – auf **neue** Situation übertragen“.
  Z. 13 sagt „AUSSCHLIESSLICH auf Basis des Materials … Erfinde keine fachlichen Inhalte“. Das Modell löst den
  Widerspruch zugunsten der Übernahme. Es fehlt der Satz, dass neue Fälle und neue Zahlen ausdrücklich erlaubt sind,
  solange die Regeln aus dem Material stammen.
- **MITTEL – Operator und Aufgabentyp passen nicht zusammen.** Aufgabe 6 ist eine MC-Aufgabe mit „Erkläre“. Aufgabe 12
  ist eine MC-Aufgabe mit „Beurteile“ (AFB III), obwohl man nur einen Satz aus dem Skript ankreuzt. → **Prompt-Lücke,
  Regeln widersprechen sich:** Z. 11 verlangt „Beginne JEDE Aufgabenstellung mit einem passenden Operator“. Z. 24
  verlangt rund 30 % MC. Z. 10 legt die AFB-III-Operatoren fest. Diese Operatoren lassen sich nicht ankreuzen.
  Vorschlag: MC nur in AFB I/II, mit „Gib an / Wähle aus / Berechne“.
- **MITTEL – Wichtige Teile des Hefts fehlen, und die Rechenaufgaben sind gleichförmig.**
  - Die Spediteurshaftung fehlt ganz: Verschuldens- und Obhutshaftung, § 461, unbegrenzte Haftung für Vermögensschäden,
    S. 4–6. Der Titel sagt aber „…und Spediteurs“.
  - Ebenso fehlen die Absenderhaftung (§§ 408–413), die Folge „Güterfolgeschaden wird nicht ersetzt“ (Aufgabe 9 ordnet
    die Schadensarten nur zu) und die anspruchsvollste Rechnung des Hefts (S. 12: Teilschaden 40 %, 3.180,6 kg,
    Lieferfrist = dreifache Fracht).
  - Alle fünf Rechnungen folgen demselben Muster: kg × 8,33 × 1,25 und dann vergleichen.
  - → **Prompt-Lücke:** Der Klassenarbeit-Prompt verlangt nicht, die Kernthemen abzudecken (Z. 17 sagt nur „prüft
    konkret Inhalt aus dem Material“).

### Feinschliff
- Bei Aufgabe 14 (`fall`, AFB III) haben drei von vier Teilaufgaben AFB II. Die Verteilung pro Teilaufgabe ist
  I 16 / II 32 / III 12 Punkte. Das passt zum Schwerpunkt II, aber das Etikett der Aufgabe stimmt nicht.
- Aufgabe 9 c: Eine bloße Verspätung ist noch kein Schaden. Besser „…, dem Kunden entsteht dadurch ein Mehraufwand“.
- Aufgabe 5 (Begegnungsverkehr beschreiben) ist für eine Haftungsarbeit eine Randfrage. Die Haftungsfragen dazu aus
  Skript 7.3–7.5 fehlen.

### Länge
Weitgehend angemessen. Die Gesamt-`solution` von Aufgabe 14 wiederholt die vier Teillösungen und ist überflüssig.
Ursache ist das Formatbeispiel, das bei `fall` neben `subtasks` zusätzlich `solution:` zeigt (Prompt Z. 42–47).
Die drei MC-Aufgaben im AFB I (Aufgaben 1–3) fragen nur die Zusammenfassungstabelle ab und bringen pro Zeichen wenig.

---

## 3. Arbeitsblatt – Seefrachtrechnen (15 Aufgaben, ~9.100 Zeichen)

**Urteil:** Sauber. Alle Musterlösungen stimmen, das Lösungsblatt passt Aufgabe für Aufgabe zum Blatt, der Aufbau
geht von den Begriffen zur Rechnung. Es gibt zwei Abstriche: Teile des Stoffs fehlen, und bei MC verrät die Länge
die richtige Antwort.

### Was die Klasse falsch lernen würde
Nichts.
- A6: 2,052 m³ × 3 = 6,156 frt × 88 = 541,73 €
- A7: 408 USD = 354,78 €
- A9: 136,30 € gegen 142,10 € → Maß
- A10: 3,5-mal messend → 29,50 USD → 185,85 USD = 161,61 €
- A11: 1.164 € bzw. 744 € → 900 €
- A14: 3.624 € − 10 % = 3.261,60 €. Der Rabatt auf den Betrag einschließlich Umschlag entspricht dem Skript.
- A15: 1.440 + 180 + 57,60 = 1.677,60 €, abzüglich 9,5 % (159,37 €) = 1.518,23 €

### Was den Lerneffekt kostet
- **MITTEL – Bei MC ist die richtige Antwort oft die längste.** Das betrifft A1 (Option C, etwa doppelt so lang),
  A3 (A) und A8 (B), also 3 von 5 MC-Aufgaben. Wer die längste, genaueste Option wählt, liegt richtig.
  → **Prompt-Lücke:** Der Arbeitsblatt-Prompt (Abschnitt AUFGABE, Z. 10–20) hat **keine** Regel zu Distraktoren.
  Der Kahoot-Prompt hat eine („Distraktoren plausibel …“). Das ist **maschinell prüfbar** (Anteil „richtige = längste
  Option“) und gehört nach `qualitaet.py`.
- **MITTEL – Teile des Stoffs fehlen.** Die Wertstaffel (Abschnitt 6) fehlt ebenso wie Schwergut- und Längenzuschlag
  (H.L./L.A., Abschnitt 9) und damit der Schritt „erhöhte Grundfracht“ im Abrechnungsschema. A15 übt zwar
  Zuschläge und Rabatt, aber nicht diese beiden.
  → **Prompt-Lücke:** Der Arbeitsblatt-Prompt verlangt keine Abdeckung der Kernthemen.

### Feinschliff
- Die Zeit ist knapp bemessen: 8 einfache Aufgaben × 2 Min. plus 7 Rechenaufgaben × 5–8 Min. ergeben 51–72 Min. bei
  60 Min. Vorgabe.
- A5 (4,8 m³ / 3,9 t) ist fast das Skriptbeispiel (4,8 / 3,8). Das ist unkritisch.

### Länge
Gut genutzt. Die MC-Lösungen erklären auch, warum die Distraktoren falsch sind, und sind damit für die Lehrkraft
wertvoll. Kein Teil ist aufgebläht.

---

## 4. Systematisch und einmalig

| Muster | Wo | Ursache | Vorschlag (für `CLAUDE.md`/Prompt, **nicht eingetragen**) |
|---|---|---|---|
| Richtige Antwort an fester Position | Kahoot (11/12 an Platz 1), Klassenarbeit (5/6 „B“) | Das Formatbeispiel gibt `correct: [1]` bzw. `answer: "B"` vor, und eine Regel zur Position fehlt | „Verteile die richtige Antwort gleichmäßig auf alle Positionen. Keine Position darf bei mehr als der Hälfte der Fragen richtig sein.“ Zusätzlich in `qualitaet.py` prüfen oder beim Export mit festem Seed mischen. |
| Richtige Antwort = längste Option | Arbeitsblatt (3/5), Klassenarbeit A6 | Im Arbeitsblatt- und Klassenarbeit-Prompt fehlt eine Distraktor-Regel | „Alle Optionen einer MC-Aufgabe sind etwa gleich lang und gleich konkret. Die richtige ist nicht die genaueste.“ Lässt sich in `qualitaet.py` prüfen. |
| Skriptfälle 1:1 als AFB III | Klassenarbeit (21 P.) | Widerspruch zwischen „neue Situation“ (Z. 4) und „AUSSCHLIESSLICH Material / nichts erfinden“ (Z. 13) | „Für AFB II/III wählst du neue Fälle und neue Zahlen. Nur die Regeln und Sätze stammen aus dem Material. Übernimm keine Übungsaufgabe des Skripts mit ihren Zahlen.“ |
| MC mit AFB-III-Operator | Klassenarbeit A6, A12 | Widerspruch zwischen „JEDE Aufgabe mit Operator“ (Z. 11), 30 % MC (Z. 24) und den AFB-III-Operatoren (Z. 10) | „MC-Aufgaben nur in AFB I/II mit ‚Gib an / Wähle aus / Berechne‘. ‚Begründe/Beurteile‘ nur bei offenen Aufgaben.“ |
| Aufgaben verraten einander | Klassenarbeit A4, A6 → A8 | „Eine Situation, aufbauende Aufgaben“ ohne Gegenregel | „Keine Aufgabe, Option oder Situation darf die erwartete Antwort einer anderen Aufgabe enthalten.“ |
| Stoff unvollständig abgedeckt | alle drei (H.L./L.A. fehlen in beiden Seefracht-Einheiten, Speditionsrecht in der Klassenarbeit) | Kahoot: weiche Regel. Klassenarbeit und Arbeitsblatt: keine Regel | „Decke jedes Hauptkapitel des Materials mit mindestens einer Aufgabe ab. Ist das nicht möglich, kürze innerhalb der Kapitel.“ |

**Einmalig:** der Widerspruch im Mooshofer-Fall (offenes Fahrzeug gegen „kein Ausschluss“), die mehrdeutige
Kahoot-Frage 10, absurde Einzeldistraktoren im Kahoot.

## 5. Was ich nicht beurteilen konnte

- Kahoot: ob die Lehrkraft in Kahoot „Antworten mischen“ einschaltet. Das würde den Positionsbefund entschärfen.
  Die Importdatei selbst mischt nicht.
- Inhalte der Skriptbilder (Fax bei IHK-Aufgabe 3, Grafiken). Sie liegen nur als `[BILD]` vor, ihre Vollständigkeit ist
  nicht geprüft.
- Das Word-Layout (Schreibzeilen, Platz). Geprüft habe ich nur das YAML, keine gerenderte Datei.
