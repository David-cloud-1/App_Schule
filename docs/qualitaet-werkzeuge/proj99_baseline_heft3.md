# PROJ-99 – Ausgangswerte: Heft 3 „Haftung des Spediteurs nach ADSp“ (alter Weg)

Gemessen am 2026-11-16 an der gespeicherten KI-Antwort des Ablaufs (Werkzeug Kreativ, kostenloser Weg, Ausgabe Seite, Niveau mittel, Bildungsgang Spedition). Nur die Reihenfolge der Element-Typen je Kapitel, nicht der Text. Die Antwort hat 141.325 Zeichen.

## Typenfolge je Kapitel (14 Kapitel + Abschlusskapitel)
Siehe Tabelle der Typen unten. Jedes Kapitel endet in der gleichen Folge `summary, text (Merke), question_set, selbsteinschaetzung`.

| Messwert | Heft 3 (alt) |
|---|---|
| Kapitel / Elemente | 14 / 221 |
| `text` (Lehrtext, Boxen) | 50 (23 %) |
| `accordion` (Begriffe und Hilfen) | 48 (22 %), in 11 von 14 Kapiteln mindestens 3 |
| gleicher Schlussblock `summary → text → question_set → selbsteinschaetzung` | **14 von 14 Kapiteln**, zusammen 25 % aller Elemente |
| `freitext` | in 14 von 14 Kapiteln |
| Spiel-Typen (`drag_drop`, `reihenfolge`, `fallakte`, `mark_words`, `drag_words` …) | 8 % der Elemente, in 9 von 14 Kapiteln |
| `fallakte` | 1× in 14 Kapiteln |
| `reihenfolge` | 2× |
| Kapitel ganz ohne Spiel-Typ | 5 von 14 |
| nie verwendete Typen | `memory_game`, `crossword`, `find_words`, `schaetzrunde`, `bildzuordnung`, `image_sequencing`, `trainer`, `flashcards`, `dialog_cards` |
| längste Serie gleicher Typ hintereinander | 3 (nur `rechenweg` in Rechenkapiteln, fachlich sinnvoll) |

## Was das bedeutet
- Der **Typenmix ist nicht schlecht** (rund 19 Typen, auch `drag_drop`, `reihenfolge`, `mark_words`). Die Regel „dasselbe Format höchstens zweimal hintereinander“ greift hier kaum.
- Das Problem ist der **gleiche Rhythmus in jedem Kapitel**: Lehrtext → Begriffs-Aufklapper → Aufgabe → Aufklapper (Hilfe) …, und der **identische Schlussblock** mit vier Elementen in allen 14 Kapiteln.
- **Spiel-Aufgaben sind selten** (8 %) und die auffälligen Typen kommen nie vor.

Die Messung sagt nichts über die **Qualität der Aufgabentexte**. Das beurteilt später `einheit-abnehmen` (Opus).

## Messsatz „alt“ (4 echte Läufe, gemessen 2026-11-16)

Typfolgen aus den gespeicherten Antworten der App, abgelegt im Kern-Repo unter `messsatz/alt/`. Alle vier Hefte sind Spedition.

| Heft | Werkzeug | Kapitel | Elemente | Aufklapper | Spiel-Typen (Elemente) | Kapitel ohne Spiel | Gleicher Schluss | Offene Frage in Kapiteln | nie verwendet |
|---|---|---|---|---|---|---|---|---|---|
| Heft 3 ADSp | Kreativ | 14 | 221 | 22 % | 8 % | 5 | 14/14 (summary, Merke-Text, question_set, selbsteinschaetzung) | 14 | 9 Typen |
| Basics rund um den LKW | Kreativ | 15 | 398 | 18 % | 8 % | 2 | 15/15 (wie oben) | 15 | 6 Typen |
| Incoterms 2020 | Ganzes Skript | 7 | 113 | 0 % | 7 % | 4 | 4/7 (freitext, question_set, selbsteinschaetzung) | 6 | 11 Typen |
| LKW-Verkehr Pegasus Teil 1 | Ganzes Skript | 13 | 154 | 3 % | 5 % | 7 | 13/13 (question_set, selbsteinschaetzung) | 7 | 11 Typen |

**Muster über alle vier:** Spiel-Typen machen nur 5–8 % der Elemente aus, jedes Heft endet in (fast) jedem Kapitel gleich, die Offene Frage steckt in fast jedem Kapitel. „Kreativ“ hat zusätzlich viele Aufklapper (18–22 %), „Ganzes Skript“ nicht (0–3 %). „Basics rund um den LKW“ hat 75 Bilder, teils bis zu 14 hintereinander.

**Nicht vergleichbar:** `Heft2_Haftung_des_FF_nach_HGB/output.yaml` (H5P, Ganzes Skript) hat kein Seitenformat und ist abwechslungsreicher (Schluss in 1 von 9 Kapiteln, 14 % Spiel). Es ist keine Referenz für „Kreativ“ und „Seite“ und gehört nicht in den Messsatz.

**Lücke:** Es gibt keinen echten Lauf aus einem anderen Bildungsgang (Tourismus, KSK). Dafür muss ein Skript neu erzeugt werden.
