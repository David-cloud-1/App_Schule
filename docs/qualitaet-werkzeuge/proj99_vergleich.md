# PROJ-99 – Vergleich alter und neuer Seiten-Prompt (Kreativ)

Stand 2026-11-16. Messung mit `abwechslung.py` (Kern-Repo), Antworten simuliert mit Sonnet, Urteil Opus. Ausgangswerte der echten Läufe: [proj99_baseline_heft3.md](proj99_baseline_heft3.md).

## Prompt-Länge (ohne Skripttext)
| Prompt | Kreativ, Seite | Ganzes Skript, Seite |
|---|---|---|
| alt | 25.165 | 26.889 |
| neu (Endstand) | **12.588** | **12.756** |

H5P und die anderen Werkzeuge nutzen weiter den alten Prompt.

## Zwei Runden
- **Runde 1** (erste Fassung, `prompt_seite.py`): Abwechslung deutlich besser, aber die Einheiten wurden **zu dünn**: wenig Lehrtext, kaum Bilder, keine Begründungsaufgaben.
- **Runde 2** (Nachbesserung: „genug Erklärung, 6–10 Aufgaben je Station“, „Bilder mit Fachbezug zeigen“, „Fall-Stationen begründen“) an den beiden dünnsten Skripten.

## Zahlen
| Skript | Fassung | Elemente | Lehrtext | Bilder | Aufklapper | Spiel (Elemente) | gleicher Schluss | Offene Frage |
|---|---|---|---|---|---|---|---|---|
| Mittelmeerraum | alt (Sim.) | 88 | 11.328 | 13 | 14 % | 19 % | 6/6 | 4 Kap. |
| | neu R1 | 31 | 4.341 | 0 | 3 % | 42 % | 1/5 | 0 |
| Griechisches Festland | neu R1 | 40 | 3.447 | 1 | 8 % | 45 % | 1/6 | 1 |
| | **neu R2** | **82** | **12.121** | **15** | 2 % | 22 % | 2/6 | 4 |
| Reiserecht | neu R1 | 48 | 5.033 | 2 | 2 % | 21 % | 2/5 | 0 |
| | **neu R2** | **70** | **11.944** | 2 | 1 % | 20 % | 3/7 | 6 |
| Heft 3 ADSp | alt (echt) | 221 | – | 4 | 22 % | 8 % | 14/14 | 14 |
| | neu R1 | 110 | 17.017 | 0 | 3 % | 18 % | 6/18 | 2 |

**Vorsicht beim Spiel-Anteil:** Sonnet ist schon mit dem alten Prompt verspielter (19 %) als die KI der echten Läufe (5–8 %). Spiel-Anteile nur Simulation gegen Simulation vergleichen. Gleicher Schluss und Aufklapper hängen dagegen klar am Prompt (alt: 100 % gleicher Schluss in Simulation und Echtläufen).

## Urteil (Opus, Stichprobe Reiserecht R2, Station „Pauschalreise, verbundene Reiseleistung oder Einzelleistung?“)
- **Gut:** Lehrtext vor den Aufgaben, alle vier Reiseleistungsarten und die 25-%-Regel erklärt; dann Zuordnen, Markieren, eine Fallakte mit der Skript-Situation (Familie Obermayr) und Fälle zum Entscheiden; Selbsteinschätzung und Quiz am Ende. Fachlich mit den Skript-Lösungen deckungsgleich (geprüft: Verona-Fall, Obermayr, Rundreise, Versicherung). Ohne Lehrkraft durcharbeitbar.
- **Schwach:** Die Fälle stehen als `single_choice_set` – das hat **kein Feedback**. Beim Verona-Fall (Opernkarten unter 25 %, trotzdem Pauschalreise, weil wesentliches Merkmal) fehlt im Fall die Angabe, die die Lösung trägt; wer „Einzelleistung“ wählt, erfährt nicht, warum. → Prompt-Regel ergänzt (`single_choice_set` nur für schnelle Abfragen, lösungstragende Angaben in den Fall).
- **Prüfstelle:** meldet in Reiserecht R2 eine Auswahlfrage mit mehreren richtigen Antworten (HOCH) und in beiden R2-Läufen „Feedback ohne Inhalt“ in der Lernzielkontrolle. Die neuen Abwechslungs-Hinweise melden in R2 nichts.

## Ergebnis
Der neue Prompt ist **halb so lang**, die Kapitel **enden nicht mehr gleich**, **Aufklapper fallen von 14–22 % auf 1–3 %**, jede Station hat Spielformen, und nach Runde 2 bleibt der **Stoff erhalten** (Lehrtext und Elemente wie beim alten Prompt, Bilder mit Fachbezug wieder da, Begründungsaufgaben in den Fall-Stationen). Offen: Mittelmeerraum und Heft 3 wurden mit der Endfassung noch nicht neu erzeugt; echte Läufe mit der KI einer Lehrkraft stehen aus.
