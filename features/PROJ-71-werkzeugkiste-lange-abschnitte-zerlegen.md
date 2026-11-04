# PROJ-71: Werkzeugkiste – zu lange Abschnitte weiter zerlegen

## Status: In Progress
**Created:** 2026-11-04
**Last Updated:** 2026-11-04

## Kontext
Die Werkzeugkiste zerlegt lange Skripte in Teile, damit die KI jede Antwort vollständig liefert (PROJ-64 bezahlter Weg, PROJ-69 kostenloser Weg). Der Kern schneidet dabei **nur an Überschriften** (Word) bzw. **an Seiten** (PDF). Ein einzelner Abschnitt wird nie zerschnitten, auch wenn er viel größer ist als die Teilgröße.

**Praxisfall (2026-11-04):** `Außenhandel_SJ_2026_27.docx` (Lehrkraft-Fassung mit Lösungen, 51.210 Zeichen) hat nur **drei Überschriften** im ganzen Dokument. Der Abschnitt „Zusammenfassende Übungsaufgaben“ ist ein einziger Teil mit **27.643 Zeichen** und 8 Bildmarkern (Teilgröße im kostenlosen Weg: 8.000). Der Prompt dazu hatte rund 54.000 Zeichen. Die Bayerncloud-KI (AIS.chat) hörte nach den FIATA-Dokumenten auf und ließ das letzte Achtel aus: Haftungstabellen Luftfracht, Videohinweis mit QR-Codes, Dokumenteninkasso, Aufgabe 7. Die Prüfstelle meldete „3 Abbildung(en) fehlen“ (Befund „hoch“) und sperrte „Weiter zur Datei“. Die Meldung war richtig: Sie zeigt, dass Inhalt fehlt, nicht nur Bilder.

Wer sein Skript nicht selbst mit Überschriften versieht, kommt mit einem zu großen Abschnitt nicht weiter. Dasselbe gilt für den (derzeit ausgeblendeten) Direkt-Weg: Dort ändert eine kleinere Teilgröße bei einem solchen Skript nichts.

### Entscheidungen (Annahmen, Claude 2026-11-04, bitte bestätigen oder ändern)
- **E1 – Ein Mechanismus im Kern für beide Wege:** Die Zerlegung steckt in der Kern-Funktion `teilen`. Kostenloser und bezahlter Weg nutzen sie, beide profitieren ohne eigene Umsetzung.
- **E2 – Nur zu große Abschnitte werden weiter zerlegt:** Ein Abschnitt, der nicht größer ist als die Teilgröße, bleibt unverändert. Alle Skripte, die heute gut laufen, bekommen dieselben Teile wie bisher.
- **E3 – Schnittstellen werden automatisch gefunden**, die Lehrkraft muss nichts auswählen. Reihenfolge der Vorlieben: (1) vor einer Zeile „Aufgabe N“ bzw. „Aufgabe N.M“, (2) vor einem Absatz mit Überschrift-Charakter (kurze Zeile ohne Satzende, gefolgt von Text), (3) an einer Absatzgrenze (Leerzeile).
- **E4 – Nie schneiden in:** einer Tabelle, zwischen Bildmarker und zugehöriger Bildunterschrift, zwischen einer Aufgabe und ihren Teilaufgaben a), b), c), zwischen einer Aufgabe und ihrer `[LÖSUNG]`.
- **E5 – Teile sind ungefähr gleich groß**, wie bisher bei der Zerlegung an Überschriften.
- **E6 – Bestehende Abläufe bleiben unverändert:** Wer schon Teil-Antworten eingefügt hat, behält seine Teile (die Sperre gegen Änderung aus PROJ-69 gilt weiter). Neue Abläufe und neu erzeugte Teil-Listen nutzen die neue Zerlegung.
- **E7 – Hinweis in Schritt 1 oder 2:** Hat ein Skript nur wenige Überschriften und ist ein Abschnitt viel größer als die Teilgröße, steht ein kurzer Tipp da: „Dein Skript hat nur wenige Überschriften. Die App teilt deshalb mitten in den Abschnitten. Mit Überschriften in Word wird die Aufteilung genauer.“

## Dependencies
- Requires: PROJ-51 (Kern: Einlesen, Prüfstelle, Generator), PROJ-69 (Teile im kostenlosen Weg, Teilgröße, Teil-Liste)
- Hilft: PROJ-64 (Direkt erstellen), sobald der Weg wieder eingeschaltet wird

## User Stories
- Als **Lehrkraft mit einem Word-Skript ohne viele Überschriften** möchte ich, dass die App lange Abschnitte selbst in handliche Teile zerlegt, damit die KI jeden Teil vollständig bearbeitet.
- Als **Lehrkraft** möchte ich, dass kein Text und kein Bild beim Zerlegen verloren geht oder doppelt vorkommt, damit die fertige Lerneinheit das ganze Skript abdeckt.
- Als **Lehrkraft** möchte ich, dass Aufgaben nicht mitten im Satz oder zwischen Frage und Lösung getrennt werden, damit die KI Aufgabe und Lösung zusammen sieht.
- Als **Lehrkraft mit einem gut gegliederten Skript** möchte ich, dass sich nichts ändert, damit meine bisherigen Abläufe weiter wie gewohnt laufen.
- Als **Lehrkraft** möchte ich auf der Teil-Karte sehen, welchen Ausschnitt des Skripts dieser Teil enthält, damit ich weiß, wo ich bin.
- Als **Nutzer (Entwickler)** möchte ich, dass die Zerlegung bei gleichem Skript und gleicher Auswahl immer gleich ausfällt, damit die gespeicherte Teil-Liste eines Ablaufs nachvollziehbar und stabil bleibt.

## Acceptance Criteria
### Zerlegen
- [ ] Ein Abschnitt, der größer als die Teilgröße ist, wird in mehrere Unterteile zerlegt. Bei `Außenhandel_SJ_2026_27.docx` und Teilgröße 8.000 ergeben sich für den Abschnitt „Zusammenfassende Übungsaufgaben“ mindestens 4 Unterteile, keiner größer als etwa das 1,25-fache der Teilgröße.
- [ ] Alle Unterteile zusammen ergeben den ursprünglichen Abschnittstext **vollständig, ohne Lücke und ohne Überlappung**.
- [ ] Jeder der 8 Bildmarker (`bild011` bis `bild018`) liegt in genau einem Unterteil.
- [ ] Abschnitte, die höchstens so groß sind wie die Teilgröße, ergeben exakt dieselben Teile wie vor der Änderung (Regressionstest mit zwei bekannten Skripten, z. B. Heft 2 und Seefracht).
- [ ] Gleiches Skript und gleiche Auswahl ergeben immer dieselben Teile (stabil, ohne Zufall).
- [ ] Die Zerlegung gilt für die Auswahl nach Abschnitten bei Word-Dateien. Die Zerlegung nach Seiten bei PDF-Dateien bleibt unverändert.

### Schnittstellen
- [ ] Wo eine Zeile „Aufgabe N“ in der Nähe der Zielgröße liegt, wird davor geschnitten.
- [ ] Es wird nie in einer Tabelle geschnitten, nie zwischen einem Bildmarker und der direkt folgenden Bildunterschrift, nie zwischen einer Aufgabe und ihren Teilaufgaben oder ihrer Lösung.
- [ ] Gibt es keine der bevorzugten Stellen, wird an einer Absatzgrenze geschnitten, nie mitten in einem Satz.

### Oberfläche
- [ ] Die Teil-Karte zeigt, welchen Ausschnitt der Teil enthält, zum Beispiel „Zusammenfassende Übungsaufgaben, 2. Teil (ab Aufgabe 3)“.
- [ ] Bei einem Skript mit großem Abschnitt und wenigen Überschriften erscheint der Tipp aus E7.
- [ ] Der Teil-Prompt enthält nur den Text seines Unterteils. Die Prüfstelle prüft die Bildmarker nur für diesen Unterteil.

### Zusammenfügen und Prüfen
- [ ] Die Teil-Antworten mehrerer Unterteile desselben Abschnitts werden wie bisher zusammengefügt (ein Deckblatt, Kapitel in Reihenfolge, ein Abschlusskapitel). Fängt ein Unterteil ohne Überschrift an, ist das kein Fehler.
- [ ] Mit `Außenhandel_SJ_2026_27.docx` meldet die Prüfstelle für keinen Unterteil „Abbildung(en) fehlen“, wenn die KI alle Bilder dieses Unterteils eingebaut hat.

## Edge Cases
- **Abschnitt ohne jede Grenze** (reiner Fließtext, z. B. 20.000 Zeichen): Schnitt an Absatzgrenzen, ungefähr gleich große Teile.
- **Eine einzige Tabelle ist größer als die Teilgröße:** Sie bleibt ganz in einem Teil (kein Schnitt in der Tabelle). Dieser Teil ist dann größer als die Teilgröße und bekommt einen Hinweis.
- **Zwei Bilder direkt hintereinander (z. B. QR-Code und Foto):** Sie bleiben zusammen im selben Teil.
- **Aufgabe mit Lösung, die über die Zielgröße hinausgeht:** Die Aufgabe bleibt ganz im Teil, auch wenn er dadurch etwas größer wird.
- **Sehr langes Skript:** Würde die Zerlegung mehr als 40 Teile ergeben (Grenze aus PROJ-69), erscheint der bekannte Hinweis, in Schritt 1 weniger Abschnitte zu wählen.
- **Benachbarte Unterteile beginnen mit derselben Kapitelüberschrift:** Die KI nennt das Kapitel doppelt. Das gilt als Hinweis beim Zusammenfügen („Überschneidung an einer Teilgrenze“), nicht als Fehler.
- **Skript ohne Gliederung (txt, Skript ohne Abschnittsmarker):** Verhalten wie heute, ein Teil. Das ist hier nicht Teil des Auftrags.
- **Lehrkraft ändert die Auswahl in Schritt 1, nachdem Teile eingefügt wurden:** Es gilt die bekannte Rückfrage aus PROJ-69.

## Technical Requirements
- **Kein neuer Dienst, keine Kosten:** Die Zerlegung läuft rein im Kern, ohne KI.
- **Laufzeit:** Zerlegung eines Skripts mit 200.000 Zeichen unter 2 Sekunden.
- **Qualität vor Kürze:** Die Zerlegung darf Inhalt weder verlieren noch verdoppeln. Das ist wichtiger als gleich große Teile.
- **Deployment:** Die Änderung betrifft den Kern (`werkzeugkiste-kern`, Zweig `vercel-kern`) und die App. Der Kern wird per `vercel deploy --prod` ausgeliefert.

## Out of Scope
- Erkennen von Überschriften an Fettdruck oder Schriftgröße im Word-Dokument (könnte später die Schnittstellen verbessern).
- Zerlegung von PDF-Dateien innerhalb einer Seite.
- Änderungen an der Prüfstelle selbst. Ihre Meldung „Abbildung(en) fehlen“ bleibt „hoch“, weil sie echten Inhaltsverlust anzeigt.

## Offene Fragen
- **Zielgröße der Unterteile:** Es gilt die Teilgröße des jeweiligen Wegs (8.000 kostenlos). Soll sie für sehr große Abschnitte kleiner werden?
- **Tipp E7:** Soll der Tipp bei jedem Skript mit wenigen Überschriften erscheinen oder nur bei Abschnitten über 3-facher Teilgröße?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick in einem Satz
Der Kern schneidet einen zu großen Abschnitt beim Anlegen der Teil-Liste in mehrere „Ausschnitte“. Jeder Ausschnitt ist ein eigener Teil, der sich im ganzen restlichen System wie ein normaler Teil verhält. Neue Bausteine braucht es dafür nicht, nur eine zusätzliche Angabe an jedem Teil.

### Wer macht was
| Baustein | Aufgabe | Änderung |
|---|---|---|
| **Python-Kern** | Zu große Abschnitte finden, Schnittstellen suchen, Ausschnitte bilden; die Auswahl eines Teils anwenden (Prompt, Prüfstelle, „falscher Teil“) | erweitert: eine Funktion, die alle bestehenden Aufrufer schon benutzen |
| **App (Server)** | Die neue Angabe an jedem Teil annehmen, speichern und weitergeben; Teil-Beschriftung bilden | kleine Anpassungen |
| **App (Oberfläche)** | Karte zeigt den Ausschnitt in Worten; Tipp zu wenigen Überschriften | kleine Anpassung am Teil-Dialog |
| **Datenbank** | Die Teil-Liste ist schon ein flexibles Datenfeld | **keine Migration**, nur etwas mehr Inhalt je Teil |

Es gibt keine neue Seite, keine neue Schnittstelle, keinen neuen Dienst und keine Kosten.

### Ablauf einer Teilung
```
Lehrkraft wählt in Schritt 1 (wie heute) Abschnitte oder Seiten
  │
  ├─ Schritt 2 → Schritt 3: App fragt den Kern: „Wie viele Teile bei Teilgröße X?“
  │     App sagt dazu: „Zu große Abschnitte bitte weiter zerlegen“ (neue Angabe)
  │
  ├─ Kern, je Abschnitt:
  │     kleiner als die Teilgröße   → bleibt wie heute (kleine Abschnitte werden wie bisher gruppiert)
  │     größer als die Teilgröße    → in gleich große Ausschnitte zerlegen,
  │                                    jeder Ausschnitt wird ein eigener Teil
  │
  ├─ App speichert die Teil-Liste (jeder Teil: Abschnitt + ggf. Ausschnitt)
  │
  └─ Ab hier alles wie in PROJ-69: Prompt je Teil, Antwort einfügen, sofort prüfen,
     Zusammenfügen, Schritt 4 und 5
```
Alles Weitere (Prompt, Prüfstelle, „falscher Teil“-Warnung, Rettung abgeschnittener Antworten) bekommt vom Teil dieselbe Auswahl wie bisher, nur mit dem Ausschnitt dazu.

### Wie ein Teil beschrieben wird (Datenmodell, in einfachen Worten)
Jeder Teil kennt heute: Nummer, Beschriftung, Auswahl (Abschnitte oder Seiten), Zeichenzahl, Zustand, Kapitel, Befund, Satz, Runden, Fingerabdruck der Antwort.

**Neu, nur bei zerlegten Abschnitten und sonst leer:**
- **Ausschnitt:** von welcher bis zu welcher Stelle im Text dieses Abschnitts (Zeichenpositionen). Der Kern schneidet beim Anlegen genau einmal und der Wert wird dann **gespeichert**.
- **Unterteil:** „Teil 2 von 4 dieses Abschnitts“, für die Beschriftung.
- **Beginnt mit:** die ersten Worte des Ausschnitts, zum Beispiel „Aufgabe 3“.

Gespeichert wird das in der vorhandenen Teil-Liste des Ablaufs. Die Auswahl der Lehrkraft in Schritt 1 ändert sich nicht. Sie sieht den Ausschnitt nie selbst und stellt ihn nie ein.

### Wie der Kern die Schnittstellen findet (in Worten)
1. **Wie viele Ausschnitte:** Größe des Abschnitts geteilt durch die Teilgröße, aufgerundet. Die Ausschnitte sollen ungefähr gleich groß werden.
2. **Wo geschnitten wird:** Der Kern sucht an jeder Zielstelle, etwa 1/4 Ausschnitt nach links und rechts, die beste Schnittstelle. Der Rang der Stellen:
   1. vor einer Zeile „Aufgabe N“ oder „Aufgabe N.M“,
   2. vor einer kurzen Zeile ohne Satzende, die wie eine Überschrift aussieht und von Text gefolgt wird,
   3. an einer Absatzgrenze (Leerzeile).
3. **Wo nie geschnitten wird:** in einer Tabelle, zwischen einem Bildmarker und dessen Bildunterschrift, vor einer Teilaufgabe a), b), c), vor einer Lösung. Diese Stellen zählen nicht als Kandidaten.
4. **Kein Kandidat in Reichweite:** Der Kern nimmt die nächste erlaubte Stelle weiter weg. Gibt es keine, bleibt der Abschnitt ein Teil mit Hinweis (zum Beispiel eine einzige riesige Tabelle).
5. **Kontrolle:** Die Ausschnitte zusammen müssen genau den Abschnittstext ergeben, ohne Lücke und ohne Überlappung. Sonst wird nicht zerlegt, sondern der Abschnitt bleibt ein Teil, mit Hinweis.
6. **Gruppierung:** Kleine Abschnitte werden wie heute gruppiert. Die Ausschnitte eines großen Abschnitts bilden **immer eigene Teile** und werden nicht mit Nachbarabschnitten vermischt. So bleibt die Beschreibung eines Teils einfach.

**Beispiel Außenhandel (Teilgröße 8.000):** Abschnitt 1 (13.027 Zeichen) wird 2 Teile, Abschnitt 2 (27.643 Zeichen) wird 4 Teile, Abschnitt 3 (2.754 Zeichen) bleibt ein Teil. Zusammen sieben Teile mit je rund 7.000 Zeichen. Die Bilder `bild016` bis `bild018` liegen im letzten Teil von Abschnitt 2, zusammen mit Aufgabe 7.

### Komponenten (Oberfläche)
```
Schritt 3 „Prompt kopieren“ bei Teilen (PROJ-69, schritt-teile)
+-- Hinweis-Box „Dein Skript ist lang … in N Teilen“
|     +-- NEU (nur wenn ein Abschnitt zerlegt wurde): Tipp zu wenigen Überschriften
+-- Fortschritt „2 von 7 Teilen eingefügt“
+-- Teil-Karten (Accordion, wie bisher)
      +-- Kopf: „Teil 3 von 7“ + NEU Beschriftung mit Ausschnitt,
      |         z. B. „Zusammenfassende Übungsaufgaben, 2. von 4 (ab Aufgabe 3)“
      +-- Rest wie bisher
```
Es werden keine neuen Oberflächenbausteine gebraucht, alles besteht aus vorhandenen shadcn/ui-Teilen.

### Tech-Entscheidungen (warum)
| Entscheidung | Warum |
|---|---|
| **Ausschnitt als gespeicherte Position, nicht als „Teil 3 von 4 neu berechnen“** | Ändert sich später eine Regel im Kern, würden neu berechnete Schnitte bei laufenden Abläufen anders ausfallen. Eine gespeicherte Position bleibt für diesen Ablauf stabil (Spec E6). |
| **Ein einziger Ort im Kern wendet die Auswahl an** | Prompt, Prüfstelle, „falscher Teil“-Warnung und das Teilen selbst benutzen schon dieselbe Funktion. Wer dort den Ausschnitt versteht, hat ihn überall. |
| **Kleine Abschnitte nicht anfassen** | Skripte, die heute gut laufen, ergeben exakt dieselben Teile. Das ist der wichtigste Regressionsschutz (Spec E2). |
| **Ausschnitte nie mit anderen Abschnitten mischen** | Ein Teil beschreibt dann entweder „ganze Abschnitte“ oder „ein Ausschnitt eines Abschnitts“. Das hält Datenmodell, Prompt und Beschriftung einfach. |
| **Neue Angabe „zerlegen erlaubt“ von der App an den Kern** | Eine alte App ohne Verständnis für Ausschnitte würde mehrere Teile mit demselben ganzen Abschnitt bekommen, also doppelte Prompts. Mit der Angabe ist die Reihenfolge der Auslieferung egal. |
| **Prüfstelle bleibt unverändert** | Sie prüft nur den Text des Teils. Mit einem Ausschnitt sieht sie nur noch die Bilder dieses Ausschnitts. Der Befund „Abbildung(en) fehlen“ bleibt „hoch“ und zeigt echten Inhaltsverlust. |
| **Keine Datenbank-Migration** | Die Teil-Liste ist ein flexibles Feld. Neue Angaben sind optional, alte Abläufe haben sie nicht und laufen weiter wie bisher. |

### Abweichungen von der Spec (bei Freigabe bitte bestätigen)
- **Tipp (E7) steht in Schritt 3** über der Teil-Liste, nicht in Schritt 1 oder 2. Erst dort steht fest, dass wirklich zerlegt wurde. Er erscheint, sobald mindestens ein Abschnitt zerlegt ist.
- **Direkt-Weg (E1):** Der Kern-Teil gilt sofort auch für PROJ-64. Die App-Seite des Direkt-Weges (Teile für die Kostenschätzung und die Läufe) reicht den Ausschnitt noch nicht weiter. Das ist ein kleiner Nachtrag, sobald der Weg wieder eingeschaltet wird. Er ist derzeit ausgeblendet und deshalb nicht Teil dieses Baus.
- **User Story „Fingerabdruck“:** Gemeint war, dass die gespeicherte Teil-Liste stabil bleibt. Der „Fingerabdruck“ in PROJ-69 gehört zur eingefügten Antwort, nicht zu den Teilen.

### Risiken und offene Punkte
- **„Falscher Teil“-Warnung:** Sie vergleicht Wörter, die nur in einem Teil vorkommen. Ausschnitte desselben Abschnitts haben mehr gemeinsamen Wortschatz, die Warnung greift also seltener. Sie bleibt ein Hinweis und blockiert nie.
- **Gleiche Kapitelüberschrift zweimal:** Benachbarte Ausschnitte können mit demselben Kapiteltitel beginnen. Das ist ein bekannter Hinweis beim Zusammenfügen, kein Fehler.
- **Schnitt mitten in einer Aufgabe mit mehreren Absätzen:** Kommt ein Aufgabentext ohne „Aufgabe N“-Zeile vor, könnte ein Schnitt hineinfallen. Dagegen stehen die Sperrzonen (Teilaufgaben, Lösungen, Tabellen). Beim Praxistest mit dem Skript Außenhandel wird das geprüft.
- **Sehr viele Teile:** Wird die Grenze von 40 Teilen überschritten, erscheint der bekannte Hinweis.

### Dependencies (Pakete)
Keine neuen Pakete, weder im Kern noch in der App.

### Umfang des Baus
- **Kern:** Zerlegung mit den Schnittregeln; Anwendung des Ausschnitts in der gemeinsamen Auswahl-Funktion; zusätzliche Angaben je Teil in der Antwort; Tests (Außenhandel-Beispiel, Regressionsfälle, Sperrzonen, Vollständigkeit ohne Lücke und Überlappung).
- **App (Server):** die neue optionale Angabe an der Auswahl eines Teils annehmen und speichern (Prüfregel und Teil-Liste); Beschriftung des Teils; die Angabe „zerlegen erlaubt“ mitschicken.
- **App (Oberfläche):** Beschriftung auf der Karte; Tipp in der Hinweis-Box.
- **Reihenfolge:** Erst Kern mit Tests, dann App, dann Kern deployen (Vercel-CLI, durch dich). Danach Praxistest mit `Außenhandel_SJ_2026_27.docx`.

## Implementation Notes (Backend, 2026-11-04)

**Kern** (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`, noch nicht committet und nicht deployt):
- `kern.py`: `teilen(…, zerlegen=False)` zerlegt einen Word-Abschnitt, der größer als die Teilgröße ist, in Ausschnitte. `_schnittstellen` findet die erlaubten Stellen (Rang 1 vor „Aufgabe N“, Rang 2 vor überschriftähnlicher Zeile, Rang 3 Absatzgrenze), `_zerlegen` wählt sie, `_abschnitt_zerlegen` baut die Teile. `_auswahl_anwenden` versteht `auswahl.ausschnitt = {von, bis}` und ist damit der eine Ort für Prompt, Prüfstelle und „falscher Teil“.
- Sperrzonen: Tabellen (`[TABELLE]…[/TABELLE]`), direkt nach `[BILD:]`, vor a)/b)/c), vor `[LÖSUNG]` (auch Lösungstabellen). Bilder unmittelbar vor „Aufgabe N“ wandern mit der Aufgabe.
- Ergebnis je Teil zusätzlich: `unterteil {nr, von}`, `beginnt`, `zuGross` (nur wenn wahr). Ohne Zerlegung bleibt die Ausgabe zeichengleich zu vorher.
- `app.py`: `/api/teilen` nimmt `zerlegen`. Ein älterer Kern ignoriert das Feld, die Auslieferungsreihenfolge ist egal.
- Tests: 19 neue in `kern_test.py` (`AbschnittZerlegen`, `AussenhandelZerlegen`), gesamt 155 grün.

**App:**
- `werkzeugkiste.ts`: `TeilAuswahl` (mit `ausschnitt`), `AblaufTeil.unterteil/beginnt/zuGross`.
- `werkzeugkiste-teile-server.ts`: `legeTeileAn` übernimmt Ausschnitt und Unterteil (ungültige Werte entfallen), `beschreibeTeil` beschriftet „Titel, 2. von 4 (ab Aufgabe 3)“.
- `…/ablaeufe/[id]/prompt/route.ts`: schickt `zerlegen: true`.
- `schritt-teile.tsx`: Tipp zu wenigen Überschriften (sobald ein Abschnitt zerlegt ist) und Hinweis bei zu großem Teil.
- Keine Migration, keine neue Route: Teil-Prompt, Antwort-Prüfung und „falscher Teil“ reichen `teil.auswahl` unverändert durch.
- Tests: 6 neue (`teile.test.ts`, `teile-seite.test.tsx`); alle 549 Werkzeugkiste-Tests, `tsc` und ESLint grün.

**Messwerte:** Außenhandel_SJ_2026_27.docx bei 8.000: 8 Teile (Vorspann 1, Abschnitt 1 → 2, Abschnitt 2 → 4, Abschnitt 3 → 1), größter Teil 7.634. `bild011`–`bild018` je in genau einem Teil, `bild016`–`bild018` mit Aufgabe 7 im letzten Teil von Abschnitt 2. 261.000 Zeichen in 0,01 s.

**Abweichungen / Offenes:**
- **Vorspann (Entscheidung 2026-11-04: muss mit rein):** Text vor der ersten Überschrift ging schon vor PROJ-71 in den Teilen verloren (Außenhandel: 7.778 Zeichen, `bild001`–`bild006`). Jetzt ist er bei „ganzes Skript“ (keine Abschnitte gewählt) eine eigene Einheit: Kern-Auswahl `vorspann: true`, Beschriftung „Einstieg (Text vor der ersten Überschrift)“, wird bei Bedarf wie jeder Abschnitt zerlegt. Wer Abschnitte selbst wählt, bekommt ihn nicht. Außenhandel: 8 Teile, `bild001`–`bild018` je in genau einem. Auch der Direkt-Weg reicht `vorspann` durch (`werkzeugkiste-direkt.ts`). Kern-Tests 159, App-Tests 550 grün.
- Nicht end-to-end mit einer echten KI-Antwort geprüft: Der Test belegt, dass der Text des Ausschnitts nur seine eigenen Bildmarker enthält, die Prüfstelle selbst läuft unverändert darauf.
- Der Direkt-Weg (PROJ-64) reicht den Ausschnitt noch nicht weiter (wie im Tech Design vorgesehen).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
