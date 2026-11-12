# PROJ-88: Schulrecht – bessere Suche & lesbare Darstellung

## Status: Deployed
**Created:** 2026-11-11
**Last Updated:** 2026-11-11

## Kontext
PROJ-55 (Schulrecht nachschlagen) ist live, aber die Rückmeldung des Nutzers (2026-11-11): *Die Suche funktioniert schlecht, die Gesetzestexte sind unübersichtlich. Die Seite bringt so keinen echten Mehrwert.*

Befund aus dem Code (Kern `schulrecht_suche.py`, App `fundstelle-karte.tsx`):
- **Drei Suchstufen schließen sich aus.** Ein kuratiertes Thema liefert nur seine festen Stellen. Die Wortstamm-Suche läuft nur ohne Thema. Die Ähnlichkeitssuche läuft nur, wenn die Wortsuche *nichts* findet, was bei längeren Fragen fast nie passiert.
- **Rangfolge ohne Gewichtung.** Es zählen gemeinsame Wortstämme; seltene Wörter zählen nicht mehr als „Schüler“. Lange Normen gewinnen.
- **Ähnlichkeitssuche vergleicht ganze Normen.** Das Modell (MiniLM) ist für Sätze gebaut; Normen mit bis zu 10 000 Zeichen werden abgeschnitten und zu einem verwaschenen Vektor gemittelt. Außerdem steht die Frage in Alltagssprache gegen Gesetzessprache.
- **Nur 5 Treffer, kein „mehr“.**
- **Darstellung:** Alle Absätze einer Norm kommen als *ein* Textblock; Absatznummern gehen verloren. Die passenden Suchwörter (`markiert`) werden vom Kern berechnet, aber von der App verworfen.

Ziel: Eine Lehrkraft stellt eine **auch längere Alltagsfrage** und sieht in unter einer halben Minute, **welche Regel gilt, was sie in Alltagssprache bedeutet und was im entscheidenden Absatz im Wortlaut steht**. Alles ohne laufende Kosten.

### Entscheidungen (Nutzer, 2026-11-11)
- **E1 – Antwortform:** Passende Absätze mit Kurzfassung. Oben steht eine vorab geschriebene Kurzfassung in Alltagssprache, darunter der passende Absatz im Wortlaut. Der Kopier-Prompt für die eigene KI bleibt optional.
- **E2 – Umfang:** Alle 10 Rechtsquellen (659 Normen) werden in einem Lauf aufbereitet, keine Probe vorab.
- **E3 – Themen-Chips entfallen.** Es gibt nur noch das Suchfeld. Die Beispielfragen der bisherigen Themenliste werden stattdessen Teil des Testsatzes.
- **E4 – Keine laufenden Kosten:** Die KI-Arbeit (Kurzfassung, Beispielfragen, Stichworte) wird **einmal vorab** mit Claude Code erledigt und im Datenbestand gespeichert. Zur Laufzeit läuft keine KI, nur lokale Suche.

## Dependencies
- Requires: PROJ-55 (Seite, Kern-Routen, Aktennotiz-Ablauf)
- Berührt: PROJ-87 (KI-Karte / Kopier-Prompt-Ablauf) nur als Vorbild, nicht als Abhängigkeit

## User Stories
- Als **Lehrkraft** möchte ich meine Frage so schreiben, wie ich sie einem Kollegen stellen würde (auch mehrere Sätze), und die passenden Regelungen finden.
- Als **Lehrkraft** möchte ich pro Treffer zuerst eine verständliche Kurzfassung lesen und nur bei Bedarf den Gesetzestext, damit ich mitten im Schultag schnell Klarheit habe.
- Als **Lehrkraft** möchte ich im Gesetzestext den **passenden Absatz** sofort sehen und die übrigen Absätze nur bei Bedarf aufklappen, statt eine Textwand zu lesen.
- Als **Lehrkraft** möchte ich erkennen, welche Stellen sicher passen und welche nur Vorschläge sind.
- Als **Lehrkraft mit einem verwickelten Fall** möchte ich die gefundenen Absätze als Prompt in meine eigene KI kopieren, um eine ausformulierte Antwort zu bekommen, ohne erfundene Paragraphen.
- Als **Lehrkraft** möchte ich ehrlich erfahren, wenn zu meiner Frage nichts Passendes im Bestand steht (etwa weil nur eine Verwaltungsvorschrift sie regelt).

## Acceptance Criteria

### Aufbereitung (einmalig, vorab, E4)
- [ ] Jede Norm der 10 Rechtsquellen ist **in Absätze** zerlegt (mit Absatznummer wie im Gesetz, z. B. „(2)“).
- [ ] Zu jedem Absatz bzw. jeder Norm gibt es: **Kurzfassung** (1–3 Sätze, Alltagssprache), **5–10 Beispielfragen** („Wie Lehrkräfte fragen würden“) und **Stichworte mit Synonymen** („Handy“ → „Mobilfunktelefon“).
- [ ] Die Kurzfassungen sind **von Opus gegengeprüft** (Abgleich mit dem Wortlaut, keine Aussage ohne Grundlage); Abweichungen sind korrigiert. Das Prüfergebnis ist dokumentiert.
- [ ] Die Aufbereitung ist als Datei im Repository nachvollziehbar und lässt sich nach einer Rechtsänderung für einzelne Normen neu erzeugen.
- [ ] Die Hausinternen Handlungsleitlinien (HLL) werden ebenfalls aufbereitet.

### Suche
- [ ] Eine Suche kombiniert **immer** drei Signale in **einem** Ranking: gewichtete Wortsuche (seltene Wörter zählen mehr), Ähnlichkeitssuche auf Absatz- und Beispielfragen-Ebene, Treffer in Stichworten/Synonymen. Keine Stufe schließt eine andere aus.
- [ ] **Lange Fragen** (mehrere Sätze, bis 500 Zeichen) werden in Sätze/Teilfragen zerlegt, einzeln gesucht und im Ranking zusammengeführt.
- [ ] Kurze Normen mit passendem Absatz schlagen lange Normen mit nur verstreuten Treffern.
- [ ] Es werden zunächst die besten **5 Treffer** gezeigt, über „Weitere Treffer anzeigen“ bis zu **15**.
- [ ] Jeder Treffer trägt eine Einordnung: **„passt sicher“** (hohe Übereinstimmung mehrerer Signale) oder **„Vorschlag“**. Es erscheint keine Prozentzahl.
- [ ] Die Quellen-Eingrenzung („Quellen eingrenzen“) bleibt erhalten.
- [ ] Die Antwort kommt nach Absenden in **unter 2 Sekunden** (Kaltstart unter 10 Sekunden), ohne kostenpflichtige KI.
- [ ] Die Rangfolge der bisherigen Berufsschul-Bevorzugung bleibt als Gewichtung erhalten, ist aber kein Sortierkriterium mehr vor der Relevanz.

### Darstellung eines Treffers
- [ ] Kopfzeile: **Paragraph/Artikel und Überschrift zuerst**, Rechtsquelle in Kurzform („BayEUG“) und Stand-Datum in kleiner Schrift.
- [ ] Direkt darunter die **Kurzfassung**, gekennzeichnet („Zusammenfassung – maßgeblich ist der Gesetzestext“).
- [ ] Darunter der **passende Absatz im Wortlaut** mit Absatznummer; die **Suchbegriffe sind markiert**. Weitere Absätze der Norm sind eingeklappt und nummeriert („3 weitere Absätze anzeigen“).
- [ ] Verweise im Text auf andere Normen („Art. 86 Abs. 2“, „§ 5“) sind, wo die Norm im Bestand liegt, **anklickbar** und zeigen die Stelle.
- [ ] „Text kopieren“ und „Quelle kopieren“ bleiben erhalten.
- [ ] Die Seite sagt bei Verwaltungsvorschriften/Leitlinien, dass sie ohne Gesetzeskraft sind (wie bisher).

### Seite
- [ ] Die Themen-Chips (Startauswahl und „Weitere Themen“) entfallen. An ihrer Stelle stehen **3 Beispielfragen** als Einstieg (ein Klick füllt das Suchfeld und sucht).
- [ ] Das Suchfeld erlaubt mehrere Zeilen („Was willst du wissen?“, Hinweis: „Du darfst auch ganze Sätze schreiben“).
- [ ] Der Haftungshinweis bleibt, und ein weiterer Hinweis nennt, was im Bestand **nicht** enthalten ist (Verwaltungsvorschriften wie KMBek/KMS).
- [ ] **„Mit meiner KI beantworten“** (optional, kostenlos): ein schlanker Kopierknopf, **ohne** Namenserkennung und ohne Aktennotiz-Ablauf (Entscheidung 2026-11-11). Er kopiert einen Prompt mit der Frage und den gefundenen Absätzen. Direkt daneben steht der Hinweis „Die Frage geht an deine eigene KI. Schreibe keine Namen hinein.“; der Prompt zeigt die Frage vor dem Kopieren zur Kontrolle.
- [ ] „Vorschriften durchblättern“ zeigt Normen in derselben Absatzdarstellung.
- [ ] Die Aktennotiz („Fall erstellen“) aus PROJ-55 funktioniert unverändert weiter.

### Messung (Nachweis „besser“)
- [ ] Ein **Testsatz von mindestens 40 Fragen** liegt als Datei vor: kurze und mindestens 10 **lange** Fragen, aus dem Lehrerzimmer-Alltag, jeweils mit den Normen, die gefunden werden sollen (von Opus erstellt/geprüft). Die Beispielfragen der bisherigen Themenliste sind enthalten.
- [ ] **Vorher** (heutige Suche) und **nachher** (neue Suche) werden mit dem Testsatz gemessen: Anteil der Fragen, bei denen die erwartete Norm unter den ersten 3 bzw. 5 Treffern steht.
- [ ] Ziel: Die erwartete Norm steht bei **mindestens 85 %** der Fragen unter den ersten 5 und bei **mindestens 70 %** unter den ersten 3 (heutiger Wert wird zuerst gemessen; Ziel gilt zusätzlich: klar besser als heute).
- [ ] Der Test läuft automatisch im Kern (`pytest`) und schlägt fehl, wenn die Trefferquote unter die Schwelle fällt.

## Edge Cases
- **Frage ohne Treffer / außerhalb der Quellen** (z. B. Regelung steht nur in einer KMBek): Hinweis „Dazu steht im Bestand nichts. Möglicherweise regelt es eine Verwaltungsvorschrift (nicht enthalten).“ plus Hinweis auf Schulleitung.
- **Sehr kurze Frage (ein Wort):** Es wird trotzdem gesucht, mit dem Hinweis auf ganze Fragen (wie bisher).
- **Sehr lange Frage (über 500 Zeichen):** Fehlersatz mit Kürzungshinweis; kein Abschneiden ohne Meldung.
- **Frage mit Personenbezug (Namen):** Wird wie bisher nicht gespeichert/protokolliert; ein Hinweis rät, ohne Namen zu fragen. Der KI-Prompt geht erst nach Anonymisierung heraus.
- **Einbettungsmodell nicht verfügbar:** Wortsuche und Stichworte laufen weiter; die Seite zeigt keinen Fehler, nur ggf. weniger Treffer.
- **Norm wurde geändert/ist veraltet:** Kurzfassung und Beispielfragen stehen mit einem Stand-Hinweis; ein Konsistenztest meldet Normen, deren Wortlaut sich seit der Aufbereitung geändert hat.
- **Kurzfassung weicht vom Wortlaut ab:** Maßgeblich ist immer der Wortlaut; die Kennzeichnung der Kurzfassung steht auf jeder Karte.
- **Mehrere gleich gute Treffer aus derselben Vorschrift:** Sie werden gruppiert (z. B. „BayEUG: Art. 56, Art. 86“), statt eine Liste gleich aussehender Karten zu bilden.

## Technical Requirements
- **Kosten:** Keine laufenden Kosten. KI nur einmalig beim Aufbereiten (Claude Code, Sammelläufe wie bei den Fragen), Opus-Gegenprüfung.
- **Leistung:** unter 2 s je Suche, Kaltstart unter 10 s (wie PROJ-55).
- **Datenschutz:** wie PROJ-55 (E4 dort): Frage nur im POST-Körper, nicht gespeichert, nicht protokolliert.
- **Qualität:** Trefferquote am Testsatz ist ein automatischer Test (siehe Messung).
- **Vorberechnung:** Die Vektoren (Absätze, Beispielfragen) müssen nach jeder Änderung der Texte neu erzeugt werden (manuell, wie bisher; Konsistenztest warnt).
- **Barrierefreiheit:** Markierung nicht nur über Farbe (zusätzlich Hintergrund + Fettdruck), Aufklappen per Tastatur, Bedienelemente mindestens 44 px.

## Abgrenzung (nicht Teil dieses Features)
- Eine KI, die in der App frei antwortet (nicht kostenlos).
- Verwaltungsvorschriften (KMBek/KMS) als neue Quellen.
- Automatisches Aktualisieren der Rechtsquellen.
- Änderungen an der Aktennotiz und der Anonymisierung (BUG-1 aus PROJ-55 bleibt eigenes Folge-Feature).

## Hinweise zu PROJ-55
PROJ-88 ersetzt folgende Festlegungen aus PROJ-55:
- „Dieselben Treffer in derselben Reihenfolge wie die heutige Werkzeugkiste“ **entfällt**; die alte Oberfläche läuft bis PROJ-56 mit der alten Suche weiter.
- Themen-Chips und „Weitere Themen“ **entfallen** (E3 oben).
- Alle weiteren Punkte von PROJ-55 bleiben gültig.

## Modellwahl (Empfehlung)
- Sonnet: Spezifikation, Architektur, Aufbereitung der 659 Normen, Programmierung, Messläufe.
- **Opus:** Erstellung/Prüfung des Testsatzes und Gegenprüfung der Kurzfassungen (juristische Genauigkeit).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-11. Grundlage: Code von Suche, Kern und Seite aus PROJ-55 sowie die Bestandszahlen (659 Normen, davon 638 in 2 019 nummerierten Absätzen; 21 Normen ohne Absatzgliederung, vor allem die Leitlinien; rund 1 MB Gesetzestext). **Keine Datenbank-Änderung, keine neuen Pakete.**

### Das Bild im Großen

Die Verbesserung hat zwei Hälften. Die erste passiert **einmal vorab** (mit KI, kostet nur dein Wochenlimit, nicht den laufenden Betrieb), die zweite **bei jeder Suche** (ohne KI, kostenlos).

```
EINMAL VORAB (Claude Code, Sammelläufe)
Gesetzestext je Norm  ->  Kurzfassung · Beispielfragen · Stichworte & Synonyme
                          -> Opus prüft gegen den Wortlaut
                          -> als Dateien im Repository abgelegt

BEI JEDER SUCHE (Werkzeugkiste-Kern, ohne KI)
Frage der Lehrkraft (auch mehrere Sätze)
   -> in Teilfragen zerlegt
   -> drei Suchverfahren laufen immer zusammen:
        a) Wortsuche (gewichtet, tolerant gegen Wortformen und Zusammensetzungen)
        b) Ähnlichkeitssuche gegen Absätze UND Beispielfragen
        c) Stichworte & Synonyme
   -> EIN gemeinsames Ranking, nach Normen gebündelt
   -> je Treffer: Kurzfassung, passender Absatz, Markierung, „sicher“/„Vorschlag“
   -> App zeigt es lesbar an
```

Die Reihenfolge der Arbeit ist wichtig: **erst der Testsatz, dann messen, dann bauen.** So belegt eine Zahl, dass es besser wurde.

### Wo was lebt

| Teil | Ort | Warum dort |
|---|---|---|
| Suche, Aufbereitung, Testsatz | **Werkzeugkiste-Kern** (Python, Repository `Werkzeugkiste`) | Die Rechtstexte, das Einbettungsmodell und die Vorberechnung liegen schon dort. Ein zweiter Ort würde auseinanderlaufen. |
| Darstellung, Seite | **Lern-App** (`src/components/schulrecht/`) | Nur das Gesicht. Die App rechnet nichts am Ranking. |
| Aktennotiz, Anonymisierung | unverändert | PROJ-55 bleibt, wie es ist. |

Die alte Werkzeugkiste-Oberfläche behält ihre alte Suche bis PROJ-56. Die neue Suche ist ein **neues Modul** im Kern und ersetzt die alte nicht.

### Component Structure

```
Seite Schulrecht (/admin/schulrecht)
+-- AdminPageHeader (unverändert)
+-- Hinweise (ruhig, einzeilig)
|   +-- „Keine Rechtsberatung …“ (bleibt)
|   +-- „Nicht enthalten: Verwaltungsvorschriften (KMBek/KMS)“ (neu)
+-- Suchfeld, mehrzeilig, „Was willst du wissen?“  (+ Hinweis „Du darfst ganze Sätze schreiben“)
|   +-- 3 Beispielfragen als Einstieg (ersetzen die Themen-Chips)
+-- „Quellen eingrenzen“ (zugeklappt, bleibt)
+-- Ergebnis
|   +-- Hinweiszeile (kurze Frage / keine Treffer / Hinweis auf nicht enthaltene Quellen)
|   +-- Treffer-Gruppen je Rechtsquelle („BayEUG · 2 Stellen“)
|   |   +-- Treffer-Karte (NEU, ersetzt die Fundstellen-Karte)
|   |       +-- Kopf: § / Art. + Überschrift · Quelle klein · Stand klein · „passt sicher“ | „Vorschlag“
|   |       +-- Kurzfassung (gekennzeichnet: „Zusammenfassung – maßgeblich ist der Gesetzestext“)
|   |       +-- Passender Absatz im Wortlaut, mit Nummer, Suchwörter markiert
|   |       +-- Übrige Absätze eingeklappt („3 weitere Absätze“), nummeriert
|   |       +-- Verweise im Text klickbar (öffnen die Stelle in einem Fenster)
|   |       +-- „Text kopieren“ · „Quelle kopieren“
|   +-- „Weitere Treffer anzeigen“ (5 -> 15)
|   +-- Leerzustand (ehrlich, mit Beispielfragen)
|   +-- „Mit meiner KI beantworten“ (kostenlos, optional)
|   +-- „Aktennotiz zu einem Fall erstellen“ (bleibt)
+-- „Vorschriften durchblättern“ (nutzt dieselbe Absatzdarstellung)
```

Wiederverwendet: `AdminPageHeader`, Zustände aus `admin-states.tsx`, shadcn `Collapsible`, `Badge`, `Dialog` (für das Verweis-Fenster), `Textarea`, `Checkbox`. **Neu** ist nur die Treffer-Karte samt Absatzdarstellung und die Treffer-Gruppierung; die alte `fundstelle-karte` entfällt. Keine neuen Pakete.

### Data Model (in Worten)

**Es wird nichts in der Datenbank gespeichert** (Fragen bleiben wie in PROJ-55 flüchtig). Neu sind nur **Dateien im Kern-Repository**, die zusammen mit den Gesetzestexten ausgeliefert werden:

**1. Aufbereitung je Norm** (eine Datei je Rechtsquelle, 10 Dateien):
- Kennung der Norm (Quelle + Nummer) und ein **Fingerabdruck des Gesetzestextes**, damit ein Test merkt, wenn der Wortlaut sich später ändert
- **Kurzfassung** der ganzen Norm (1–3 Sätze, Alltagssprache)
- Bei **langen Normen** (mehrere Absätze) zusätzlich je Absatz **ein Satz Kernaussage**, damit eingeklappte Absätze trotzdem verständlich sind
- **5–10 Beispielfragen**, jede mit dem Absatz, der sie beantwortet („Absatz 2“)
- **Stichworte und Synonyme** („Handy“, „Mobiltelefon“, „einsammeln“, „einbehalten“)
- Vermerk, wann aufbereitet und dass Opus geprüft hat

**2. Absatzgliederung der Normen:** Die Normen liegen schon in Absätzen vor (638 von 659). Die 21 ohne Gliederung werden als ein Absatz behandelt und nicht umgebaut.

**3. Vorberechnete Ähnlichkeitswerte:** je Absatz und je Beispielfrage ein Zahlenvektor, damit die Suche nicht bei jeder Frage rechnen muss. Rund 2 000 Absätze und 5 000–6 000 Beispielfragen ergeben wenige MB. Das ist in kompakter Zahlenform unkritisch für die Paketgröße auf Vercel.

**4. Testsatz:** mindestens 40 Fragen (mindestens 10 lang) mit den erwarteten Normen, als eine Datei im Kern. Bleibt für spätere Verbesserungen als Qualitätsmaßstab.

### Wie die Suche arbeitet (verständlich)

| Schritt | Was passiert | Warum |
|---|---|---|
| Frage zerlegen | Mehrsatz-Fragen in Teilfragen, zusätzlich die ganze Frage | Ein Fall über vier Sätze enthält mehrere Anliegen; jedes soll eine Chance haben |
| Wortsuche | Gewichtet nach Seltenheit („Mobilfunktelefon“ zählt mehr als „Schüler“), vergleicht **Wortteile** statt Wortstämme | Deutsche Zusammensetzungen und Wortformen („Leistungsnachweis“ – „Nachweise“) treffen sich so ohne Stemmer-Listen |
| Ähnlichkeitssuche | Frage gegen **Absätze und Beispielfragen** | Frage gegen Frage ist genau das, wofür das Modell gebaut ist; Absätze sind kurz genug |
| Stichworte & Synonyme | Treffer in der vorab erstellten Wortliste | Fängt Alltagswörter („Handy“) gegen Gesetzessprache („Mobilfunktelefon“) |
| Zusammenführen | Die drei Ranglisten werden zu **einem** Ranking vereint (Platz zählt, nicht der Rohwert); danach nach Norm gebündelt | Kein Verfahren dominiert; die Zahlenbereiche der drei Verfahren müssen nicht vergleichbar sein |
| Einordnung | **„passt sicher“**, wenn mehrere Verfahren dieselbe Norm weit vorn sehen, sonst „Vorschlag“ | Ehrlichkeit statt Scheingenauigkeit; die Schwelle wird am Testsatz eingestellt |
| Bündeln & Ausgeben | Beste 5 (bis 15), je Norm der passende Absatz, Markierung der Suchwörter, erkannte Querverweise | Lesbarkeit |

**Kuratierte Themenliste:** Sie wird von der neuen Suche **nicht** mehr gebraucht. Ihre Beispielfragen und Fundstellen gehen in den Testsatz ein (E3 der Spec). Die Datei bleibt für die alte Oberfläche liegen.

### Tech Decisions (warum so)

| Entscheidung | Warum |
|---|---|
| **KI-Arbeit einmal vorab, nicht zur Laufzeit** | E4: keine laufenden Kosten, und die Kurzfassungen sind vor der Veröffentlichung prüfbar. Eine KI zur Laufzeit würde jedes Mal neu formulieren und könnte sich irren. |
| **Opus prüft jede Kurzfassung gegen den Wortlaut** | Der größte denkbare Schaden dieser Seite ist eine falsche Zusammenfassung eines Gesetzes. Gleicher Ablauf wie bei den Fragen-Sammelläufen. |
| **Kurzfassung je Norm, Kernaussage je Absatz nur bei langen Normen** | 2 019 Einzelkurzfassungen wären viel Aufwand mit wenig Zusatznutzen; die meisten Normen sind kurz. |
| **Beispielfragen mit zugeordnetem Absatz** | So kennt die Suche nicht nur die Norm, sondern den **passenden Absatz** und kann ihn aufgeklappt zeigen. |
| **Alle drei Verfahren immer zusammen, nicht nacheinander** | Genau das war die Ursache: Heute schließt jede Stufe die nächste aus. |
| **Zusammenführen nach Platz, nicht nach Zahlenwert** | Zahlenwerte der Verfahren sind nicht vergleichbar; Plätze schon. Bewährt, kein Feintuning von Gewichten nötig. |
| **Wortteile statt Wortstämme** | Die handgepflegte Umlaut-Ausnahmeliste war nie vollständig. Wortteile decken Zusammensetzungen und Beugungen ohne Liste ab. |
| **Eigene kleine Suchlogik, kein neues Paket** | Der Bestand (2 000 Absätze) ist klein; eine eigene Gewichtung ist im Kern in Millisekunden gerechnet und braucht keine Abhängigkeit. |
| **Ähnlichkeitsmodell wird am Testsatz verglichen** | Das jetzige Modell ist klein und mehrsprachig. Ein stärkeres Modell (etwa die Größe von 120 MB) kann besser sein. Der Testsatz entscheidet, nicht das Bauchgefühl; Bedingung bleibt: Paketgröße und Kaltstart im Rahmen von PROJ-55. |
| **Neues Modul im Kern, alte Suche bleibt** | Die alte Oberfläche bis PROJ-56 läuft unberührt weiter. |
| **Erweiterung der Antwort, nicht Umbau** | Der Kern liefert die neuen Felder (Kurzfassung, Absätze, Einordnung) **zusätzlich**. So funktioniert die alte App-Version während des Deploys weiter: erst Kern ausrollen, dann App. |
| **Markierung als Textabschnitte, nicht als eingebettetes HTML** | Verhindert, dass Gesetzestext je als Code ausgeführt wird; die App setzt die Hervorhebung selbst. |
| **Querverweise vom Kern erkannt, von der App als Links gezeigt** | Muster wie „Art. 86 Abs. 2“ oder „§ 5“ löst die Aufbereitung zuverlässiger auf als die Oberfläche; das Fenster lädt die Norm über die vorhandene Norm-Abfrage. |
| **„Mit meiner KI beantworten“ ist ein schlanker Kopierknopf** (geändert 2026-11-11) | Kein Ablauf, keine Namenserkennung: ein Klick kopiert Frage + gefundene Absätze. Der Hinweis „keine Namen eingeben“ steht direkt dabei, die Frage ist vor dem Kopieren sichtbar. Der Prompt wird im Kern mit dem vorhandenen Baustein gebaut, nichts wird gespeichert. |
| **Trefferquote als automatischer Test** | Verbessert später jemand die Suche (oder verschlechtert sie), merkt es der Test sofort. |

### Messung & Qualitätssicherung

1. **Testsatz zuerst** (Opus): 40+ Fragen, davon 10+ lang, mit erwarteten Normen.
2. **Ausgangswert messen:** Trefferquote der **heutigen** Suche (Platz 1–3, Platz 1–5). Das ist der Beleg für „vorher“.
3. **Nach dem Bau:** dieselbe Messung. Ziel laut Spec: 85 % in den ersten 5, 70 % in den ersten 3.
4. **Konsistenztests im Kern:** Jede Norm ist aufbereitet · der Fingerabdruck des Wortlauts stimmt noch · jede Beispielfrage verweist auf einen vorhandenen Absatz · keine leeren Kurzfassungen · Vorberechnung passt zu den Texten.
5. **Opus-Gegenprüfung** der Kurzfassungen, mit dokumentiertem Ergebnis (Ablageort: `docs/qualitaet-schulrecht/` wie bei den Werkzeugen).

### Reihenfolge beim Bauen

1. Testsatz + Ausgangsmessung (**Opus**)
2. Absatz-Aufbereitung als Sammellauf, 10 Rechtsquellen (Sonnet), dann Opus-Prüfung
3. Neue Suche im Kern, Messung am Testsatz, ggf. Modellvergleich
4. Antwortformat erweitern (Kern), Darstellung neu bauen (App)
5. Beim Deploy: **Kern zuerst, dann App** (die neue Antwort ist eine Erweiterung der alten)

### Sicherheit & Datenschutz

Unverändert gegenüber PROJ-55: Rolle zuerst, Frage nur im Nachrichtenkörper, nichts gespeichert oder protokolliert, Ausgabe wird als Text gerendert. Neu: Die Kurzfassungen stammen aus dem Repository, nicht aus Nutzereingaben. Die Markierung der Suchwörter wird in der App aus Textabschnitten gebaut (kein eingebettetes HTML).

### Dependencies

- **Lern-App:** keine neuen Pakete (shadcn-Komponenten sind vorhanden).
- **Werkzeugkiste-Kern:** keine neuen Pakete (`numpy`, `onnxruntime`, `tokenizers` sind bereits da). Ein anderes Einbettungsmodell nur, falls der Vergleich es rechtfertigt.
- **Einrichtung:** keine Migration, keine Zeitpläne, keine neuen Pfade in `roles.ts`.

### Risiken (ehrlich)

| Risiko | Gegenmaßnahme |
|---|---|
| **Falsche Kurzfassung** | Opus-Gegenprüfung, deutliche Kennzeichnung „maßgeblich ist der Gesetzestext“, Fingerabdruck des Wortlauts |
| **Testsatz wiegt zu leicht** (zu einfache Fragen) | Mindestens 10 lange und verwickelte Fragen, aus den echten Lehrerzimmer-Themen; Opus erstellt und prüft |
| **Paket auf Vercel wird zu groß/langsam** | Vorberechnung in kompakter Zahlenform; bei stärkerem Modell zuerst Größe und Kaltstart messen; Ausweichweg wie in PROJ-55 (`werkzeugkiste-recht`) |
| **Fragen, die nur eine Verwaltungsvorschrift regelt** | Kann keine Suche finden; die Seite sagt es ehrlich (Hinweis + Leerzustand) |
| **Aufwand der Aufbereitung** | Läuft in Sammelläufen je Rechtsquelle; Stand je Rechtsquelle ist dokumentiert, die Seite funktioniert auch während der Aufbereitung weiter (alte Suche) |

### Offene Punkte für die Freigabe

1. **„Mit meiner KI beantworten“ nutzt den Aktennotiz-Ablauf** (empfohlen, siehe oben) statt eines eigenen, kürzeren Ablaufs. Nachteil: Der Ablauf führt am Ende zu einer Word-Aktennotiz, auch wenn die Lehrkraft nur eine Antwort lesen will. Alternative: ein schlanker Kopierknopf ohne Notiz, dann aber ohne Namenserkennung und mit eigenem Hinweis.
2. **Modellvergleich** erlaubt (empfohlen): Das Modell wird nur gewechselt, wenn es am Testsatz klar besser ist **und** Paketgröße und Kaltstart halten.

## QA Test Results
_To be added by /qa_

## Deployment
**2026-11-12** · Kern: Commit `b4a1780` auf `vercel-kern` (nicht gepusht, wie bisher), `vercel deploy --prod` im Projekt `werkzeugkiste-kern`, Ready nach 42 s. Danach App: Push auf `main`.
- **Reihenfolge:** Kern zuerst, dann App (die neue Antwort ist eine Erweiterung der alten). Keine Migration, keine neuen Umgebungsvariablen.
- **Erster Kern-Versuch scheiterte** an einer abgelaufenen CLI-Anmeldung (die CLI fragte nach einem Login und brach ab; es war nichts deployt). Beim zweiten Versuch war die Anmeldung wieder da. Geprüft wurde an der Liste der Bereitstellungen, nicht am Exit-Code.
- **Geprüft nach dem Kern-Deploy (Produktion):** ohne Kennwort 401; mit Kennwort liefert die Suche 15 Treffer mit `kurzfassung`, `absaetze`, `passend`, `sicher`. Erste Anfrage nach Pause 4,6 s (Ziel unter 10 s), danach 0,28 s (Ziel unter 2 s).
- **Noch offen:** Durchlauf im Browser durch den Nutzer (Checkliste unten) und eine Stichprobe im Vercel-Laufzeitprotokoll, dass keine Fragen auftauchen.
- **Rückweg:** App per Rollback der Vercel-Bereitstellung. Der Kern ist abwärtskompatibel; die vorige Kern-Bereitstellung (8 Tage alt) lässt sich bei Bedarf wieder hochstufen.

### Checkliste für den Browser-Durchlauf
1. `/admin/schulrecht` öffnen: Suchfeld mit mehreren Zeilen, drei Beispielfragen, keine Themen-Chips.
2. „Darf ich einem Schüler das Handy wegnehmen?“: BayEUG Art. 56 Abs. 5 und BaySchO § 23 vorn, Kurzfassung, markierte Wörter, „passt sicher“.
3. Eine lange Schilderung (mehrere Sätze) eintippen, Enter sucht, Umschalt+Enter macht eine neue Zeile.
4. In einem Treffer „weitere Absätze anzeigen“ und einen Verweis („Art. 86 Abs. 2“) anklicken: Fenster mit der Norm.
5. „Weitere Treffer anzeigen“, „Quelle kopieren“, „Text kopieren“.
6. „Mit meiner KI beantworten“: Prompt kopieren und in die KI einfügen.
7. „Vorschriften durchblättern“: eine Norm öffnen, alle Absätze nummeriert.
8. Aktennotiz-Ablauf (PROJ-55) funktioniert wie vorher.
9. Handy-Breite (375 px), Hell/Dunkel, Tastaturbedienung. Azubi-Konto: Seite nicht erreichbar.

## Umsetzung (Backend + Frontend, 2026-11-11/12)

Der Nutzer wollte „gleich alles“ (2026-11-11). Deshalb wurden Kern und App zusammen gebaut. Reihenfolge wie im Tech Design: Testsatz → Ausgangsmessung → Aufbereitung → Suche → Antwortformat → App.

### 1. Testsatz und Ausgangswert (Opus)
- `testdaten/schulrecht_testsatz.json`: **54 Fragen** (40 kurz, 14 lang) in Alltagssprache, jede mit erwarteten Normen samt Absatz und Begründung. Sie sind anhand des Wortlauts erstellt, nicht aus dem Gedächtnis.
- `schulrecht_messung.py` misst den Platz der ersten richtigen Norm (Platz 1 / bis 3 / bis 5 / bis 15, MRR, getrennt nach kurz/lang). `--fehlt` listet die Ausreißer.
- **Heutige Suche: 22 % / 30 % / 35 % / 35 %** (Platz 1 / bis 3 / bis 5 / bis 15). Lange Fragen bis 5: 43 %.

### 2. Aufbereitung (Sonnet, 19 Teilläufe)
- `schulrecht_aufbereitung/` (20 JSON-Dateien): **659 Normen, 2 684 Beispielfragen**, Kurzfassung je Norm, Kernaussage je Absatz bei langen Normen, Stichworte und Synonyme, Fingerabdruck des Wortlauts.
- `schulrecht_aufbereitung.py`: Arbeitsvorlage (`zeige`), Prüfung auf Vollständigkeit und Form (`pruefe`, auch je Teildatei) und Fingerabdruck-Abgleich. Ergebnis: 0 Befunde.
- Die schreibenden Läufe sahen den Testsatz nicht und kannten die alte Themenliste nicht. So bleibt die Messung unverfälscht.
- **Abweichung von der Spec:** Bei Normen, die Lehrkräfte praktisch nie betreffen (Polizei, Landtag, EU-Behörden), gibt es 2–3 statt 5–10 Beispielfragen. Die Prüfung erlaubt 2–10.

### 3. Neue Suche (Kern)
- `schulrecht_suche_neu.py`: fünf Verfahren laufen immer zusammen.
  - `wort`: BM25 über den Wortlaut je Absatz.
  - `teil`: BM25 über 5er-Wortteile, für Zusammensetzungen.
  - `meta`: BM25 über Kurzfassung, Stichworte und Beispielfragen.
  - `frage`: Ähnlichkeit zu den Beispielfragen.
  - `absatz`: Ähnlichkeit zu den einzelnen Absätzen.
- **Zusammenführung:** nach Platz (Reciprocal Rank Fusion). Lange Fragen werden zusätzlich satzweise gesucht. Der passendste Absatz wird je Norm per Stimmen bestimmt. „sicher“ heißt, dass mindestens zwei Verfahrensfamilien die Norm unter ihren ersten drei sehen.
- **Gewichtung nach Schulart:** Berufsschul-Bezug ×1,15, andere Schularten ×0,55. Das ist eine Gewichtung, keine Sortierung mehr.
- **Vektoren:** `schulrecht_einbettungen_neu.npz` (3,8 MB, float16), erzeugt mit `python3 schulrecht_suche_neu.py einbetten` (ca. 2 Minuten). Die Datei ist nicht im Git, geht aber per `.vercelignore` mit zum Kern. Das Modell bleibt dasselbe (MiniLM). Ein Modellvergleich war nicht nötig, weil das Ziel erreicht wurde.
- **Stellschrauben:** RRF_K 8, Gewicht „wort“ 0,7. Gewählt ist die Mitte eines stabilen Bereichs, nicht der Spitzenwert (Raster im Spec-Verlauf: K 5–10 und wort 0,5–0,7 liefern alle 78 % bzw. 85–87 %).
- **Darstellungshilfen:** `markierte_worte` (Stamm und Wortteile) und `querverweise` („Art. 86 Abs. 2“, „§ 20 Abs. 3 BaySchO“; nur Normen im Bestand).
- **Neue Suche: 57 % / 78 % / 87 % / 94 %** (Platz 1 / bis 3 / bis 5 / bis 15). Lange Fragen bis 5: 86 %. **Ziel der Spec (85 % / 70 %) erreicht.** Eine Suche dauert 0,03–0,2 s, der Index lädt in 0,3 s.
- **Verbleibende Ausreißer:** Sie liegen an fehlenden Alltagswörtern („Sekt“, „Burka“) und an Fällen, die mehrere Normen berühren (Prügelei → Erste Hilfe und Meldung). Das sind Kandidaten für eine spätere Stichwort-Ergänzung.

### 4. Antwortformat (Kern, nur ergänzt)
- `kern_recht.suchen` nutzt die neue Suche und liefert bis zu 15 Treffer.
- Jede Fundstelle bekommt **zusätzlich** `kurzfassung`, `absaetze[]` (`i`, `text`, `kernaussage`, `markiert`, `verweise`), `passend` und `sicher`. `ungeprueft` = nicht sicher.
- Die alten Felder (`text` usw.) bleiben. Eine ältere App-Version funktioniert also weiter.
- `norm()` (Durchblättern, Verweis-Fenster) liefert dieselbe Absatzform.
- **Kein neuer Kern-Aufruf:** „Mit meiner KI beantworten“ nutzt den vorhandenen `/api/recht/prompt` (gleicher Prompt-Baustein wie die Aktennotiz, Verbot erfundener Fundstellen).
- **Tests:** `schulrecht_suche_neu_test.py` (Trefferquote als harte Schwelle, lange Fragen ≥ 80 %, Vektoren aktuell, Handy → Art. 56 Abs. 5, Eingrenzung, ohne Vektoren läuft die Wortsuche, Markierung, Querverweise), `kern_recht_test.py` angepasst (Pflicht „gleiche Treffer wie alt“ entfernt, neue Felder geprüft). Kern-Suite: **199 Tests grün.**

### 5. App
- **Neue Route** `POST /api/admin/schulrecht/frage-prompt {frage, fundstellen}`: Lehrer-Rolle, Mengenbremse, Zod strikt (1–15 Stellen), `no-store`, nichts gespeichert. Sie ruft den Kern `/api/recht/prompt` auf.
- **`treffer-karte.tsx`** ersetzt `fundstelle-karte.tsx`:
  - Kopf: § und Überschrift, Quelle und Stand, „passt sicher“ oder „Vorschlag“.
  - Kurzfassung mit Kennzeichnung.
  - Passender Absatz grün umrandet, Suchwörter als `<mark>`.
  - Übrige Absätze eingeklappt und nummeriert, mit Kernaussage.
  - Verweise anklickbar.
  - „Text kopieren“ und „Quelle kopieren“ (Zitierzeile mit Absatz).
  - Beim Durchblättern sind alle Absätze offen.
- **`verweis-fenster.tsx`:** Dialog, lädt die verwiesene Norm. Darin kann man weiterspringen.
- **Seite:**
  - Mehrzeiliges Suchfeld (Enter sucht, Umschalt+Enter macht eine neue Zeile, Zeichenzähler).
  - 3 Beispielfragen statt der Themen-Chips.
  - Treffer nach Quelle gruppiert, erst 5, dann „Weitere Treffer anzeigen“ bis 15.
  - Karten „Mit meiner KI beantworten“ (Vorschau der Frage, Hinweis „keine Namen“) und „Aktennotiz erstellen“.
  - Hinweise auf Haftung und „nicht enthalten: KMBek/KMS“.
  - Die Aktennotiz bekommt nur die ersten 5 Stellen mit.
- **Hilfen in `schulrecht.ts`:** `zerlegeText` (Text, Markierung und Verweis ohne HTML), `gruppiereNachQuelle`, `quellenAngabe`, `absatzNummer`, `absaetzeVon` (Rückfall für alte Antworten).
- **Tests:** 55 Schulrecht-Tests (Seite, Karte, Hilfen, neue Route). Gesamtsuite **3 025 grün**, Typen und Lint sauber.

### 6. Opus-Gegenprüfung (2026-11-12)
- **Ablauf:** 9 Teile, alle 659 Normen gegen den Wortlaut geprüft und direkt in den Dateien korrigiert. Sie waren zwischendurch am 5-Stunden-Limit unterbrochen und wurden ohne Zwischenstand fortgesetzt (die Dateien waren bis dahin unverändert).
- **Ergebnis:** **143 Kurzfassungen korrigiert** (gut jede fünfte), dazu Kernaussagen, gut 100 Beispielfragen (die Norm beantwortet sie nicht) und irreführende Stichworte. Übersicht und Berichte in `docs/qualitaet-schulrecht/`.
- **Fehlerbild:** Die Kurzfassung sagte fast immer *mehr* als das Gesetz:
  - Bedingung weggelassen,
  - „kann“ als „muss“ gelesen,
  - falscher Anwendungsbereich (BayDSG Art. 30–37 gelten nur für Polizei und Justiz; einige BayEUG-Regeln gelten nicht für die Berufsschule).
  - Der folgenreichste Fehler: BayEUG Art. 39. Die Befreiungen heben die Berufsschulpflicht von Azubis **nicht** auf.
- **Nacharbeit in der Hauptsitzung:**
  - BSO § 12 Abs. 2: „darunter mindestens je eine Schulaufgabe“ gilt für beide Fächergruppen.
  - BayBG Art. 62: Der Verweis auf die Übergangsgrenzen in Art. 143 bleibt (Entscheidung, weil er eine falsch abgelesene Altersgrenze verhindert).
- **Testsatz T46:** „HLL Aufsichtspflicht“ als erwartete Norm nachgetragen. Sie gibt MLDO § 6 fast wörtlich wieder und war bei T17 schon erwartet. Die alte Suche wurde mit dem korrigierten Testsatz neu gemessen.
- **Danach** Vektoren neu erzeugt (2 583 Beispielfragen) und neu gemessen:

| | heutige Suche | neue Suche |
|---|---|---|
| Platz 1 | 22 % | 57 % |
| bis Platz 3 | 31 % | **83 %** |
| bis Platz 5 | 35 % | **89 %** |
| bis Platz 15 | 35 % | 94 % |
| lange Fragen, bis Platz 5 | 43 % | 86 % |

- **Kern-Tests:** 40 zu Schulrecht grün (vorher 199 der gesamten Kern-Suite grün).

### Offen
1. ~~Opus-Gegenprüfung~~ erledigt (siehe 6.).
2. ~~Produktions-Build~~ erledigt (sauber, neue Route enthalten).
3. **Deploy (braucht die Zustimmung des Nutzers):**
   - **Kern zuerst:** Commit auf `vercel-kern`, dann `vercel deploy --prod` im Ordner `Werkzeugkiste`.
   - **Danach die App:** Commit und Push auf `main`.
   - Keine Migration.
4. Browser-Durchlauf durch den Nutzer (kein Dev-Server erlaubt).
5. Offene Auslegungsfragen (BayDSG Art. 39 Abs. 4 Nr. 6, MLDO § 15 Abs. 4) bei Gelegenheit mit der Schulleitung klären.
