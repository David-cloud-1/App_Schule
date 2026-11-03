# Abnahme NACHHER: drei Einheiten (Kahoot Seefracht, Klassenarbeit Heft 2, Arbeitsblatt Seefracht)

Stand 2026-11-03, PROJ-68. Es gab denselben Skripttext und dasselbe Erzeuger-Modell wie beim ersten Lauf, aber die neuen Prompts aus
`Werkzeugkiste-paket1`. Den VORHER-Stand beschreibt `docs/qualitaet-werkzeuge/bericht_abnahme_kurz.md`. Am Repository habe ich nichts geändert.

**Prüfstelle** (neu, `messe_antwort.py … word`): Sie meldet für alle drei Einheiten **grün und 0 Befunde**. Ich habe das selbst nachgeprüft.

| Einheit | Antwort vorher → nachher | Prompt vorher → nachher |
|---|---|---|
| Kahoot | 2.435 → 2.194 Zeichen | 58.031 → 58.473 Zeichen (+ nur Marker-Block) |
| Klassenarbeit | 11.405 → 11.472 Zeichen | 26.117 → 27.961 Zeichen (+ 5 Qualitätsregeln, neues Formatbeispiel) |
| Arbeitsblatt | 9.364 → 10.314 Zeichen | 58.550 → 59.326 Zeichen (+ Abdeckungs- und MC-Regel) |

Hinweis: Bei diesen drei Werkzeugen ist der Prompt **länger** geworden, nicht kürzer. Es kamen genau die Regeln dazu, die die
VORHER-Abnahme vorgeschlagen hatte. Der Kahoot-Prompt ist inhaltlich unverändert. Den Positionsfehler beim Kahoot behebt jetzt
der Export (`ausgabe._kahoot_mischen`), nicht der Prompt.

Ich habe **jede** Zahl nachgerechnet. **Keine Rechnung ist falsch.** Das war schon vorher so, es gibt also keinen Verlust.

---

## 1. Kahoot – Seefrachtrechnen (12 Fragen)

**Urteil: besser, aber nicht wegen des Prompts.** Die Fragen sind etwa gleich gut wie vorher, mit etwas besseren
Distraktoren und Formulierungen. Den schwersten Befund behebt jetzt der Export. Ein Qualitätsverlust ist nicht zu erkennen.

**Nachgerechnet:** 3 m³ und 2 t bei M/G ergeben 3 frt. 1,875 t × 70 € = 131,25 €. 25.400 € × 3 % = 762,00 €. 3,1 % × 26.800 € = 830,80 €,
also gilt die Mindestfracht von 3.200 €. 1,815 × 52 = 94,38 € gegen 1,598 × 64 = 102,27 €, die höhere Fracht gilt, also nach Maß. Die Distraktoren
196,65 € (Summe) und 98,33 € (Mittel) stimmen als Fehlerbilder. Die Wahr/Falsch-Aussagen (keine verbindlichen Tarife, Ad valorem,
gespaltene Raten → höhere Fracht, Skript Z. 192) sind richtig. Alle Fragen sind kürzer als 95 Zeichen, alle Antworten kürzer als 60 Zeichen, alle Zeiten sind zulässig.

### a) Behoben / fortbestehend
- **Behoben (vorher HOCH): Die richtige Antwort steht an Platz 1.** Im YAML stimmt das immer noch für 9 von 9 MC-Fragen (`correct: [1]`). In der
  Kahoot-Datei aus `build_kahoot_xlsx` stehen die richtigen MC-Antworten jetzt an den Plätzen 4, 1, 2, 3, 1, 4, 4, 3, 2. Das habe ich nachgeprüft.
  Das Problem ist für die Klasse also gelöst, aber im Export und nicht im Prompt.
- **Behoben:** Die mehrdeutige Staffelfrage (F10) und die schiefe Frage F3 gibt es nicht mehr. Die absurden Distraktoren „Fahrtrichtung“, „1 kg oder 1 Liter“
  und „26.800 €“ sind weg. F11 hat jetzt die echten Fehlerbilder Summe und Differenz.
- **Besteht fort (MITTEL): Der Fragenpool lässt Teile aus und klumpt.** Es fehlen reine Maßraten, die Staffel (vorher noch da), die Wertstaffel,
  die Kursumrechnung (vorher noch da), H.L./L.A., das Abrechnungsschema und die Rabatte. Dagegen gibt es drei Fragen zu Ad valorem (F5, F10, F11) und
  vier zur Familie M/G und gespaltene Raten (F3, F4, F9, F12). Die Lücke hat sich verschoben, kleiner ist sie nicht geworden. Ursache: Der Kahoot-Prompt hat die
  Abdeckungsregel, die Klassenarbeit und Arbeitsblatt bekommen haben, **nicht** bekommen.
- **Besteht fort (Feinschliff):** Vier der fünf Rechenfragen sind Skriptbeispiele mit denselben Zahlen: F6 (Skript Z. 69), F10 (Z. 271), F11 (Z. 281),
  F12 (Z. 195). Für ein Kahoot ist das vertretbar.
- **Besteht fort (Feinschliff):** Einzelne Distraktoren sind schwach. F3 hat „Mindestgewicht“ und „Menge pro Gesamtwert“, F6 hat „131.250,00 €“, das um den Faktor 1.000 daneben liegt.

### b) Neue Mängel
Keine belastbaren.

---

## 2. Klassenarbeit – Heft 2 Haftung (14 Aufgaben, 60 P., 60 Min.)

**Urteil: deutlich besser.** Vier der sechs Prompt-Lücken aus der VORHER-Abnahme sind geschlossen. Die beiden übrigen sind
abgeschwächt. Neu ist eine Abdeckungslücke (§ 426), die vorher nicht da war. Sie wiegt aber weniger als das, was behoben ist.

**Nachgerechnet:**
- Punkte: 2+2+2+5+3+3+3+3+3+6+5+7+4+12 = **60**. Auf MC entfallen 2+2+2+3+3+3+3 = **18 P. = 30 %**.
- AFB-Verteilung: AFB I 14 P., AFB II 34 P., AFB III 12 P., Schwerpunkt also AFB II. Die Reihenfolge steigt auf.
- A10: 640 × 12,50 = 8.000 €. 640 × 8,33 × 1,20 = 6.397,44 €. Die Lücke beträgt 1.602,56 €.
- A11: 3 × 310 = 930 €. Der Kunde trägt 270 €.
- A12: 300 × 30 = 9.000 €. 300 × 40 × 1,20 = 14.400 € liegt darüber, der Kunde bekommt also 9.000 €. Roth-Trans haftet mit 300 × 8,33 × 1,20 = 2.998,80 €. Bei Donau-Logistik bleiben 6.001,20 € hängen.
- Die Teilpunkte jeder Lösung ergeben die Aufgabenpunkte.
- Rechtlich stimmt alles mit dem Skript überein: § 427 (sechs Ausschlüsse, fünf verlangt), Absender bis 8,33 SZR verschuldensunabhängig und Verbraucher nur bei Verschulden
  (S. 13), keine Güterfolgeschäden (S. 6), organisierender Spediteur mit Verschuldenshaftung und unbegrenzter Haftung für Vermögensschäden (S. 6), 2 SZR wirken automatisch
  und eine Erhöhung nur mit Information und schriftlicher Zustimmung (S. 9/15), Transportversicherung freiwillig für den Auftraggeber (S. 7).

### a) Behoben / fortbestehend
- **Behoben (vorher HOCH): Bei MC ist fast immer B richtig.** Jetzt sind es B, D, A, C, A, B, D, also A 2, B 2, C 1, D 2. Die richtige Option ist bei 3 von 7
  die längste, aber nur knapp (Faktor 1,06–1,15). Die einzige Ausnahme ist A6 mit „Reiner Vermögensschaden“, und das ist ein Fachbegriff.
- **Behoben (vorher HOCH): Aufgaben verraten sich gegenseitig.** Die Gefährdungshaftungs-Option, die vorher A8 löste, gibt es nicht mehr. A4 nennt keinen
  Ausschluss mehr in der Aufgabenstellung. Es bleiben nur schwache Restspuren (siehe Feinschliff).
- **Behoben (MITTEL): Der Fall widerspricht sich (offenes Fahrzeug gegen „kein Ausschluss“).** Die neue Situation enthält keinen solchen Konflikt mehr.
- **Behoben (MITTEL): MC mit AFB-III-Operator.** Alle MC-Aufgaben stehen jetzt in AFB I oder II. AFB III (A14) ist komplett offen und nutzt
  „Begründe / Beurteile / Nimm Stellung“.
- **Behoben (MITTEL): Das Speditionsrecht fehlt, die Rechenaufgaben sind gleichförmig.** Neu dabei sind Fixkostenspediteur (A3), Absenderhaftung (A7),
  „Güterfolgeschaden wird nicht ersetzt“ (A8), Spediteur gegen vertraglichen Frachtführer (A13) und Versicherung/Deckungslücke (A14c). Es gibt jetzt drei
  verschiedene Rechenwege statt fünfmal kg × 8,33 × Kurs: Grenze gegen Schaden (A10), dreifache Fracht bei Lieferfrist (A11) und Erhöhung mit Unterfrachtführer (A12).
- **Behoben (Feinschliff/Länge):** Die doppelte Gesamt-`solution` bei `fall` ist weg. Das AFB-Etikett von A14 stimmt jetzt, alle Teilaufgaben sind AFB III.
  Die Schadensart-Aufgabe nennt jetzt einen echten Schaden (Vertragsstrafe).
- **Besteht fort, abgeschwächt (MITTEL): AFB III baut auf Skriptfällen auf, nur mit neuen Namen.** A14a ist Skript 7.5 („wer haftet, wenn nicht
  nachweisbar …“), nur heißen die Orte jetzt Regensburg–Kassel–Hamburg statt Lübeck–Fulda–Lörrach. Die Lösung ist dieselbe. A14b ist Skript 6.3 (S. 15:
  2 SZR, ausführender Frachtführer weiß nichts, Begrenzung wirkt automatisch). Damit sind 8 von 12 AFB-III-Punkten Reproduktion (vorher 21 Punkte).
  A14c ist echter Transfer. A12 übernimmt das Schema aus Skript 8.1, aber mit neuen Zahlen. Das ist regelkonform.
  → Die neue Regel „Fälle nicht 1:1“ unterläuft das Modell, indem es die Namen austauscht.
- **Besteht fort, abgeschwächt (MITTEL): Operator und MC passen nicht zusammen.** A3 heißt „Beschreibe, woran man … erkennt“, A7 „Erkläre die Haftung …“, A9 „Erkläre,
  was … Begegnungsverkehr …“. Alle drei sind MC-Aufgaben, man kreuzt also nur an. Die neue Regel verbietet nur MC in AFB III. „Erkläre“ und „beschreibe“ stehen aber weiter
  in der AFB-I/II-Liste, und „Beginne JEDE Aufgabenstellung mit einem Operator“ zwingt zu einem dieser Verben.
- **Besteht fort (Feinschliff): Begegnungsverkehr als Randfrage.** A9 bringt 3 P. für eine Begriffsfrage (Skript 7.1). Inzwischen fragt A14a immerhin die
  Haftungsfrage dazu ab.

### b) Neue Mängel
- **NEU (MITTEL): Die Haftungsbefreiung nach § 426 fehlt.** Unabwendbares Ereignis und höhere Gewalt (Skript 1.3, S. 4 Nr. 4, Übungen S. 11: Ölspur, Sturm,
  Frost) kommen in keiner Aufgabe vor. Vorher prüfte A13 das ab. Die Regel „jedes Hauptkapitel“ ist trotzdem formal erfüllt, weil § 426 ein Unterpunkt
  von Kapitel 1 ist. Die schwerste Rechnung des Hefts (S. 12: Teilschaden 40 % plus Lieferfrist) fehlt weiterhin.
- **NEU (Feinschliff): A9 ist über ein Stichwort ratbar.** Die Frage sagt „mit Wechselbrücken“, und nur Option D enthält „Wechselbrücken“. D ist zugleich die längste Option.
- **NEU (Feinschliff): Restspuren über die Distraktoren.** In A7 ist Option D „Höchstens die dreifache Fracht“, das ist die Regel, die A11 (2 P.) und A13 (1 P.) brauchen.
  In A8 ist Option B „Güterfolgeschäden ersetzt der Frachtführer nicht“, das bringt 1 P. in A14c. A1 (Gefährdungshaftung) und A13 prüfen denselben Punkt doppelt.
  Zusammen sind das etwa 3 P. Hinweis, vorher waren es etwa 5 P. Lösung.

---

## 3. Arbeitsblatt – Seefrachtrechnen (15 Aufgaben, 60 Min.)

**Urteil: besser.** Beide MITTEL-Befunde von vorher sind behoben. Wertstaffel und Schwergut sind jetzt dabei, und die richtige Antwort ist nicht mehr die
längste. Die Rechnungen sind wieder durchgehend richtig, die Aufgaben haben neue Zahlen. Neu sind nur Kleinigkeiten.

**Nachgerechnet:**
- A5: 1,8 × 1,2 × 1,1 = 2,376 m³, mal 4 = 9,504 frt.
- A6: 13,12 t × 96 = 1.259,52 USD, das sind 1.095,23 €.
- A7: 15,12 m³ × 88,50 = 1.338,12 USD, das sind 1.163,58 €.
- A8: 136,30 € gegen 139,92 €, es gilt Maß.
- A9: 7,2 : 2,4 = 3,0, also „bis 4x“: 201,60 USD, das sind 175,30 €.
- A10: 9.600 : 8 = 1.200 €/frt, das ergibt 95 €/frt (Staffel = Skript-Haustarif).
- A11: 2.880 € und 1.845 €, für den zweiten gilt die Mindestfracht von 2.800 €. Zusammen 5.680 €.
- A14: 496,00 + 43,40 = 539,40 USD, das sind 469,04 €. Der H.L.-Zuschlag geht nur aufs Schwergutkollo, wie in der Skriptlösung (Z. 342ff.).
- A15: 30 frt × 84 = 2.520 €, plus 285 € ergibt 2.805 €, minus 10 % Zeitrabatt ergibt 2.524,50 €. Die Reihenfolge Zwischensumme minus Rabatt entspricht dem Skriptschema.
- Das Lösungsblatt passt Aufgabe für Aufgabe zum Blatt. Der Einstieg löst nichts vor.

### a) Behoben / fortbestehend
- **Behoben (MITTEL): Die richtige MC-Antwort ist die längste.** Vorher war das bei 3 von 5 so, jetzt nur bei 1 von 5 (A12, Faktor 1,06, also unerheblich). Die Lösungen
  liegen bei D, A, B, C, B, wechseln also die Position.
- **Behoben (MITTEL): Teile des Stoffs fehlen.** Die Wertstaffel (A10) ist jetzt dabei, ebenso der Schwergutzuschlag (A14), Maßraten, Staffel, gespaltene Raten, FAK, BAF und CAF sowie Zeitrabatt
  mit Kontrakt. Jeder der zehn Skriptabschnitte kommt vor.
  Es fehlt nur noch der **Längenzuschlag (L.A.)**, und die Kette des Abrechnungsschemas („erhöhte Grundfracht“ mit H.L. und Zu-/Abschlägen und Rabatt) wird nie
  an einer Aufgabe zusammen geübt. Das ist Feinschliff.
- **Behoben (Feinschliff):** A5 hat keine Skriptzahlen mehr (vorher 4,8/3,9 statt 4,8/3,8).
- **Besteht fort (Feinschliff): Die Zeit ist knapp.** Es gibt 7 einfache Aufgaben × 2 Min. und 8 Rechenaufgaben × 5–8 Min., zusammen 54–78 Min. bei 60 Min. Vorgabe. Vorher waren es
  51–72 Min. Die Zeit ist also minimal knapper geworden, weil eine Rechenaufgabe mehr dabei ist (wegen der größeren Abdeckung).

### b) Neue Mängel
- **NEU (Feinschliff): A12 verrät einen Teil von A13.** Option A in A12 lautet „Zuschlag bei stark steigenden Ölpreisen“, und genau das ist der Anlass für den BAF, den
  A13 abfragt. Der Prompt schließt das ausdrücklich aus („Keine Aufgabe enthält die Antwort einer anderen“).
- **NEU (Feinschliff): A4 hat Distraktoren, die keine typische Verwechslung sind.** „Nach Mittelwert (5,15 frt)“ und „Nach Summe beider (10,3 frt)“
  nennt die eigene Lösung „rechnerisch erfundene Verfahren“. Damit ist A4 praktisch eine Frage mit zwei Optionen. Die neue Regel verlangt aber „typische Verwechslungen“.
- **Länge:** Die Antwort ist um 10 % länger, das sind etwa 950 Zeichen mehr. Sie stecken in zwei zusätzlichen Stoffgebieten, nicht in Füllstoff. Das ist kein Befund.

---

## 4. Systematisch und einmalig

| Muster | Stand | Ursache | Vorschlag (für `CLAUDE.md`/Prompt, **nicht eingetragen**) |
|---|---|---|---|
| Richtige Antwort an fester Position | Klassenarbeit und Arbeitsblatt **behoben** (Prompt). Kahoot **behoben im Export**, im YAML weiter 9/9 an Platz 1 | Das Kahoot-Formatbeispiel zeigt weiter `correct: [1]` | Keiner nötig, solange `_kahoot_mischen` bleibt. Wer das YAML anderswo nutzt (z. B. Moodle aus Kahoot-Daten), bekommt aber weiter Platz 1. |
| Richtige = längste Option | **behoben** | Die neue MC-Regel greift | – |
| Skriptfälle als AFB III | **abgeschwächt** (21 → 8 P.) | Die Regel „nicht 1:1“ lässt sich durch Umbenennen erfüllen | „Neue Namen und Orte machen noch keinen neuen Fall. Ändere die Sachlage selbst, z. B. ist der Schaden nachweisbar auf einem Abschnitt entstanden, oder es geht um eine Erhöhung statt einer Begrenzung, sodass die Lösung des Skripts nicht mehr passt.“ |
| MC mit Operator, den man nicht ankreuzen kann | **abgeschwächt** (AFB III frei, 3 von 7 MC mit „Erkläre/Beschreibe“) | „JEDE Aufgabe mit Operator“ trifft auf eine AFB-I/II-Liste mit „erkläre, beschreibe“ | „MC-Aufgaben beginnen mit ‚Gib an‘, ‚Wähle aus‘, ‚Ordne zu‘ oder ‚Berechne‘.“ **Maschinell prüfbar** (`type: mc` + Fragebeginn „Erkläre/Beschreibe/Begründe/Beurteile“) → `qualitaet._pruefe_pruefung`. |
| Aufgaben verraten einander | **weitgehend behoben**, Restspuren über Distraktoren (Klassenarbeit A7/A8, Arbeitsblatt A12) | Die Regel nennt MC-Optionen, das Modell prüft aber nur die richtigen Optionen | Ergänzen: „… auch falsche MC-Optionen nennen keine Regel, die eine andere Aufgabe abfragt.“ |
| Stoff unvollständig | Arbeitsblatt **behoben**, Klassenarbeit **verschoben** (Speditionsrecht dazu, § 426 weg), Kahoot **unverändert lückenhaft** | Der Kahoot-Prompt hat die Abdeckungsregel nicht bekommen. Bei der Klassenarbeit greift „Hauptkapitel“ zu grob | Kahoot: „Verteile die Fragen über alle Hauptabschnitte, höchstens zwei Fragen je Abschnitt.“ Klassenarbeit: „… und die Kernfragen jedes Kapitels (z. B. Haftung, Haftungsbefreiung, Höhe).“ |

**Einmalig:** A9 ist über ein Stichwort ratbar (Klassenarbeit), die Distraktoren in A4 sind schwach (Arbeitsblatt), dazu einzelne schwache Kahoot-Distraktoren.

## 5. Was ich nicht beurteilen konnte

- Das Word-Layout (Schreibzeilen, Platz). Geprüft habe ich nur das YAML. Beim Kahoot habe ich zusätzlich die Excel-Ausgabe aus `build_kahoot_xlsx`
  geprüft, und zwar nur die Position der richtigen Antwort.
- Die Inhalte der Skriptbilder (`[BILD]`).
- Ob die Unterschiede beim Kahoot aus dem Prompt kommen oder nur Streuung des Modells sind. Der Prompt ist dort inhaltlich gleich geblieben. Die Verschiebung der Abdeckung
  ist deshalb eher Zufall als Wirkung.
