# PROJ-91: Werkzeugkiste – Baukasten: Blöcke Tabelle und Diagramm

## Status: Deployed
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Im Baukasten-Editor gibt es zwei neue Blöcke: eine **Tabelle**, die man wie eine Tabelle bearbeitet (Zeilen/Spalten statt HTML), und ein **Diagramm** (Säulen, Balken, Linie, Kreis, auch mehrere Reihen), das aus einer kleinen Datentabelle entsteht.

## Kontext
- Heute stehen Tabellen als HTML mit Inline-CSS in Textblöcken (Vorlagen im Master-Prompt: grauer Kopf, Zebrastreifen). Bearbeiten geht in PROJ-89 nur über die gestaltete Ansicht oder das HTML des Textblocks.
- Entscheidung E4 aus PROJ-89: Grafiken auch als „einfache Diagramme aus einer kleinen Tabelle“.
- Beide brauchen neue Bausteine im Kern (`seite.py`: `BAUSTEINE`, CSS, ggf. `LAUFZEIT`). Die Seite muss offline bleiben: keine Diagramm-Bibliothek aus dem Netz, Diagramm als eingebettetes SVG, das mitdruckt.

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Umfang:** Beides in einem Projekt, in zwei Bauabschnitten. **Abschnitt A: Tabelle**, **Abschnitt B: Diagramm** (nutzt dasselbe Tabellen-Bearbeitungsfeld für seine Daten).
- **E2 – Diagrammarten:** Säulen/Balken, Linie, Kreis; mehrere Reihen mit Legende.
- **E3 – Bestand:** Vorhandene HTML-Tabellen in Textblöcken lassen sich **per Knopf im Textblock** in einen Tabellen-Block umwandeln. Keine automatische Umwandlung.
- **E4 – Aufgaben auf Grundlage:** **nicht** in diesem Projekt. Lehrkraft stellt die Aufgabe darunter als normalen Block. Verknüpfung wäre ein eigenes späteres Projekt.

## User Stories
1. Als Lehrkraft will ich eine Tabelle in einem Material einfügen und Zeilen und Spalten wie in einer Tabellenkalkulation bearbeiten, ohne HTML zu kennen.
2. Als Lehrkraft will ich Zellen aus Excel oder Word einfügen und die Tabelle übernehmen lassen, damit ich nichts abtippen muss.
3. Als Lehrkraft will ich Kopfzeile und Stil (grauer Kopf, Zebrastreifen) wählen und eine Bildunterschrift setzen, damit die Tabelle zum Rest des Materials passt.
4. Als Lehrkraft will ich eine bestehende HTML-Tabelle aus einem Textblock in einen Tabellen-Block umwandeln, damit ich altes Material bequem bearbeiten kann.
5. Als Lehrkraft will ich aus einer kleinen Datentabelle ein Säulen-, Balken-, Linien- oder Kreisdiagramm erzeugen, mit Titel, Achsenbeschriftung und Einheit.
6. Als Lehrkraft will ich mehrere Datenreihen in einem Diagramm zeigen, mit Legende, um z. B. zwei Jahre zu vergleichen.
7. Als Azubi will ich Tabellen und Diagramme am Handy lesen können und sie im Ausdruck der Seite wiederfinden.

## Acceptance Criteria

### Abschnitt A – Tabellen-Block
- [ ] Im Katalog „Block hinzufügen“ gibt es den Typ **Tabelle** (Kennung `tabelle`); er erscheint auch in der Typ-Liste des Katalog-Tests.
- [ ] Formular: Zellen als Raster; Zeilen/Spalten hinzufügen, löschen, verschieben; Schalter „Erste Zeile ist Kopfzeile“ (Standard an); Stil „Grauer Kopf“ / „Zebrastreifen“ / „Beides“; optionale Bildunterschrift.
- [ ] Mindestgröße 1 × 1, Obergrenze 30 Zeilen × 12 Spalten; darüber eine verständliche Meldung statt Fehler.
- [ ] Einfügen mehrerer Zellen aus Excel/Word (Tab- und Zeilentrenner) füllt das Raster ab der gewählten Zelle und erweitert es bei Bedarf bis zur Obergrenze.
- [ ] Zellinhalt ist reiner Text (Zeilenumbruch erlaubt, kein HTML); Sonderzeichen werden maskiert angezeigt.
- [ ] Die Seite zeigt die Tabelle mit Kopf, Zebra und Unterschrift laut Einstellung; breite Tabellen scrollen in ihrem Rahmen, nie die ganze Seite seitlich (Handy).
- [ ] Im Druck erscheint die Tabelle vollständig, ohne Scrollrahmen, Zeilen werden nicht mitten durch zerrissen.
- [ ] Tabellen-Block zählt nicht in den Fortschritt (nicht in `PRUEFBAR`).
- [ ] Textblock hat einen Knopf „Tabelle herauslösen“, wenn der Text eine einfache HTML-Tabelle enthält: Die Tabelle wird zum eigenen Block direkt dahinter, Text davor bleibt, Text danach wird ein weiterer Textblock.
- [ ] Zellen mit verbundenen Zellen (colspan/rowspan) oder verschachtelten Elementen werden nicht stillschweigend verändert: Die Umwandlung meldet, was verloren ginge, und lässt die Wahl „Trotzdem umwandeln“ oder „Abbrechen“.
- [ ] Die Umwandlung ist im Editor rückgängig zu machen.

### Abschnitt B – Diagramm-Block
- [ ] Neuer Typ **Diagramm** (Kennung `diagramm`) im Katalog.
- [ ] Formular: Art (Säulen, Balken, Linie, Kreis – ein Segment mit 4 Werten), Datentabelle (erste Spalte Beschriftung, weitere Spalten je eine Reihe, Reihenname in der Kopfzeile), Titel, Beschriftung der Wertachse, Einheit, Bildunterschrift.
- [ ] Werte werden als Zahlen mit deutschem Komma akzeptiert („12,5“); Tausenderpunkte werden toleriert. Nicht-Zahlen markieren die Zelle und verhindern das Speichern mit klarer Meldung.
- [ ] Kreisdiagramm nutzt nur die erste Reihe; bei mehreren Reihen erscheint ein Hinweis im Formular.
- [ ] Negative Werte sind bei Säulen/Balken/Linie erlaubt (Nulllinie sichtbar), beim Kreis nicht (Meldung).
- [ ] Obergrenze: 12 Beschriftungen, 5 Reihen (Kreis: 8 Segmente).
- [ ] Ausgabe als eingebettetes SVG ohne Netzzugriff; Legende, Achsen, Gitterlinien und Zahlenbeschriftung lesbar bei Handybreite.
- [ ] Farben sind unterscheidbar auch im Schwarzweiß-Druck und für Farbsehschwäche (zusätzlich Muster oder Linienform/Markierung je Reihe).
- [ ] Das Diagramm ist für Screenreader beschrieben (`role="img"` mit Titel und Kurzbeschreibung) und die Datentabelle ist als ausklappbare „Werte als Tabelle“ verfügbar.
- [ ] Skaliert mit der Seitenbreite; im Druck ohne Verzerrung und ohne Seitenumbruch mitten im Diagramm.
- [ ] Diagramm-Block zählt nicht in den Fortschritt.

### Beide
- [ ] Der Master-Prompt/die KI-Anweisung kennt beide Typen, damit die KI sie nutzen darf und nie HTML schreibt (Vorgabe aus PROJ-89).
- [ ] Beispielinhalte für beide Typen liegen in `src/lib/werkzeugkiste-katalog-beispiele.json`; die Kern-Tests bauen sie.
- [ ] Der Vergleichstest Katalog ↔ `BAUSTEINE` bleibt grün.
- [ ] Bedienelemente mindestens 44 px, Tastatur bedienbar (Pfeile im Raster, Tab verlässt es).
- [ ] Bestandsmaterial ohne diese Typen ändert sich nicht (Rückwärtskompatibilität).

## Edge Cases
- Leere Tabelle / leere Zellen: bleiben leer erhalten, Block lässt sich speichern; vollständig leerer Block zeigt im Editor einen Hinweis.
- Sehr lange Zellentexte oder Wörter ohne Leerzeichen: werden umgebrochen, sprengen das Layout nicht.
- Einfügen von sehr großen Excel-Bereichen: nur bis zur Obergrenze übernehmen, Meldung „Nur die ersten 30 Zeilen × 12 Spalten übernommen“.
- Spalte oder Zeile löschen, bis nur eine bleibt: letzte Zeile/Spalte nicht löschbar.
- Kopfzeile ausgeschaltet bei Zebrastreifen: Zebra beginnt in der ersten Zeile.
- Diagramm mit einer Reihe aus lauter Nullen oder gleichen Werten: Achse bekommt trotzdem sinnvolle Skala, kein Teilen durch null.
- Sehr große oder sehr kleine Zahlen (Millionen, 0,001): Achsenbeschriftung wird gerundet/gekürzt, bleibt lesbar.
- Linie mit fehlender Zelle in einer Reihe: Lücke in der Linie, nicht Null.
- Lange Beschriftungen bei Säulen: werden schräg oder gekürzt mit Volltext im `title`; bei Balken bekommen sie mehr Platz links.
- Diagrammart wechseln (z. B. Säulen → Kreis) behält die Daten; nicht passende Daten (negativ) lösen die Meldung aus, nicht Datenverlust.
- Kern-Antwortgröße: Eingebettete SVGs bleiben klein (keine Rastergrafik), damit das 4,5-MB-Limit nicht berührt wird.
- Offline: Seite funktioniert ohne Netz, keine externen Skripte.
- Tabelle aus Textblock mit Inline-Stilen (Masterprompt-Vorlage): Stil wird auf „Grauer Kopf/Zebrastreifen“ abgebildet, sonstige Stile gehen verloren und werden in der Meldung genannt.

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst)
- Empfohlen: PROJ-90 (Katalog), damit die neuen Blöcke dort auftauchen

## Abgrenzung
- Bilder/Fotos → PROJ-92
- Tabellen mit Lücken zum Ausfüllen (das bleibt `fill_blanks` mit Tabelle im Text)
- Aufgaben, die auf Tabelle/Diagramm verweisen („Lies ab“) → späteres eigenes Projekt
- Verbundene Zellen (colspan/rowspan), Formeln, Zellfarben pro Zelle: nicht enthalten

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Kurzfassung:** Kein neues Backend, keine Datenbank, keine Migration, keine neuen Pakete. Die zwei Blöcke folgen dem Weg, den PROJ-90 für die 32 Typen gebaut hat: ein Eintrag im Katalog, ein Formular im Editor, ein „Bauer“ im Kern, der daraus die Seite macht. Das Diagramm wird im Kern selbst als einfache Vektorgrafik (SVG) gezeichnet, deshalb braucht die Seite weder Netz noch eine Diagramm-Bibliothek.

### A) Bausteine (wo etwas dazukommt)

```
Editor (App_Schule, Browser)
+-- Katalog „Block hinzufügen“
|   +-- neue Gruppe/Einträge: „Tabelle“ und „Diagramm“ (mit Vorschaubild)
+-- Formular Tabelle                     <- gemeinsames Raster-Feld (neu)
|   +-- Raster aus Zellen (Zeilen/Spalten +, −, verschieben, Einfügen aus Excel)
|   +-- Schalter Kopfzeile, Auswahl Stil, Bildunterschrift
+-- Formular Diagramm
|   +-- Auswahl Art (Säulen | Balken | Linie | Kreis)
|   +-- dasselbe Raster-Feld für die Daten (Beschriftung | Reihe 1 | Reihe 2 …)
|   +-- Titel, Beschriftung Wertachse, Einheit, Bildunterschrift
|   +-- Live-Vorschau des Diagramms im Formular
+-- Textblock
    +-- Knopf „Tabelle herauslösen“ (nur sichtbar, wenn der Text eine Tabelle enthält)

Kern (Werkzeugkiste, Python, baut die fertige Seite)
+-- Bauer „tabelle“     -> gestaltete Tabelle mit Rahmen, scrollt auf dem Handy
+-- Bauer „diagramm“    -> gezeichnetes SVG + Legende + ausklappbare Werte-Tabelle
+-- Druck-Regeln        -> Tabelle ohne Scrollrahmen, nichts wird mittendrin zerrissen
+-- Master-Prompt       -> KI darf beide Typen nutzen (schreibt nie selbst HTML)
```

### B) Daten (in Alltagssprache)
Die Blöcke liegen wie alle anderen im Material der Lehrkraft (dort, wo heute schon der Baukasten speichert). Es entsteht **keine neue Ablage**.

- **Tabelle:** Liste von Zeilen, jede Zeile eine Liste von Zellentexten · Schalter „erste Zeile ist Kopfzeile“ · Stil (grauer Kopf / Zebra / beides) · Bildunterschrift (optional).
- **Diagramm:** Art · Titel · Beschriftung der Wertachse · Einheit · Bildunterschrift (optional) · Beschriftungen (X-Achse bzw. Segmente) · Reihen (Name + Zahlenliste, gleich lang wie die Beschriftungen, einzelne Werte dürfen fehlen).
- Zahlen werden im Formular so gespeichert, wie die Lehrkraft sie tippt („12,5“), und erst beim Bauen gelesen. So geht beim Bearbeiten nichts verloren.
- Unbekannte Zusatzfelder bleiben wie bei allen Formularen unverändert erhalten.

### C) Technische Entscheidungen (und warum)

| Entscheidung | Warum |
|---|---|
| **Ein gemeinsames Raster-Feld** für Tabelle und Diagramm-Daten | Die Lehrkraft lernt eine Bedienung. Einmal gebaut, zweimal genutzt – das ist auch der Grund für die Reihenfolge „erst Tabelle, dann Diagramm“. |
| **Diagramm als selbst gezeichnetes SVG im Kern** | Läuft offline, druckt scharf, skaliert mit der Breite, bleibt klein (kein Bild, keine Bibliothek). Passt zum 4,5-MB-Limit der Kern-Antworten. |
| **Dasselbe Zeichnen auch für die Live-Vorschau im Formular** | Die Vorschau im Editor zeigt, was die Azubis sehen. Es gibt dafür bereits eine Vorschau, die den Kern aufruft; das Formular nutzt deren Ergebnis, keine zweite Zeichenlogik, die auseinanderlaufen könnte. |
| **Zellen sind reiner Text, kein HTML** | Schützt vor kaputtem Layout und vor eingeschleustem Code; Sonderzeichen werden sauber maskiert. Entspricht der Regel „die KI und das Formular schreiben nie HTML“. |
| **Muster/Formen zusätzlich zu Farben** | Unterscheidbar im Schwarzweiß-Druck und bei Farbsehschwäche (Spec). Farben stammen aus der bestehenden Seiten-Farbwelt. |
| **Textbeschreibung und „Werte als Tabelle“ am Diagramm** | Screenreader und Lesende ohne Grafik bekommen dieselben Zahlen. |
| **Herauslösen nur per Knopf, mit Warnung bei Verlust** | Altes Material bleibt unangetastet, bis die Lehrkraft es will. Verbundene Zellen oder Sonderformatierung werden vorher benannt; Rückgängig im Editor ist vorhanden. |
| **Beide Typen zählen nicht in den Fortschritt** | Sie haben keine Selbstkontrolle (Aufgabe darunter ist ein eigener Block, Spec E4). |
| **Keine Datenbank-Änderung** | Materialien speichern Blöcke bereits als freie Struktur; neue Typen brauchen nur Kennungen. |

### D) Berührte Stellen (damit nichts vergessen wird)
Entspricht der Liste, die schon bei PROJ-90 für jeden neuen Typ gelten musste:
- **App:** Katalog-Einträge, Formulare, Vorschaubilder (Skizzen), Typ-Namen in der Anzeige, Beispielinhalte (JSON), Katalog-Test (Anzahl der Typen steigt von 32 auf 34), Test für „Tabelle herauslösen“.
- **Kern (eigenes Repo `Werkzeugkiste`, Zweig `vercel-kern`):** die zwei Bauer, Aussehen für Bildschirm und Druck, Master-Prompt, Typ-Namen der Vorschau, Prüfregeln der Qualitätskontrolle, Tests (Beispiele werden gebaut, SVG enthält Werte/Legende, Zahlen mit Komma, Grenzwerte).
- **Deploy-Reihenfolge:** erst Kern, dann App (sonst zeigt der Editor Typen, die der Kern noch „unbekannt“ nennt). Zwei getrennte Auslieferungen: Abschnitt A (Tabelle), danach Abschnitt B (Diagramm).

### E) Abhängigkeiten (Pakete)
Keine neuen. Das Raster-Feld baut auf vorhandenen shadcn-Bausteinen (Eingabefeld, Segmente `AdminSegmented`, Schalter) auf.

### F) Risiken und Gegenmaßnahmen
- **Aufwand der Tabellen-Erkennung im Textblock:** Der Text-Editor behandelt Tabellen heute als geschützte, nicht bearbeitbare Insel. Das Herauslösen liest nur diese Insel – einfache Tabellen (Masterprompt-Vorlage) gehen sicher, exotische werden mit Warnung behandelt.
- **Lesbarkeit auf dem Handy:** Diagramm braucht Mindestbreite; Beschriftungen werden gekürzt/gedreht, Volltext im `title`. Im Test mit 360 px prüfen.
- **Browser-Prüfung:** Wie bei PROJ-89/90 bleibt nach dem Bau ein Durchgang als Lehrkraft (Desktop und Handy) offen; kein Dev-Server auf dem MacBook, daher Tests und Build.

### G) Bauabschnitte
1. **A – Tabelle:** Raster-Feld, Formular, Kern-Bauer, Druck, „Tabelle herauslösen“, Prompt, Tests → Deploy.
2. **B – Diagramm:** Formular mit Vorschau, SVG-Zeichnen für 4 Arten + mehrere Reihen, Barrierefreiheit, Prompt, Tests → Deploy.

## Umsetzung (2026-11-12)
Beide Bauabschnitte wurden **in einer Auslieferung** gebaut und ausgeliefert (Abweichung vom Plan „zwei Deploys“: der Aufwand für das gemeinsame Raster-Feld ist derselbe, ein Deploy weniger Risiko).

**Kern (`Werkzeugkiste`, Zweig `vercel-kern`, Commit `238f835`):**
- Neu `diagramm.py`: zeichnet Säulen/Balken/Linie/Kreis als SVG ohne Bibliothek. Reihen unterscheiden sich durch Muster (Säulen, Kreis) bzw. Strichart + Markierung (Linie). Legende, Textbeschreibung (`role="img"`, `<title>`/`<desc>`) und „Werte als Tabelle“ (im Druck ausgeblendet).
- `seite.py`: Bauer `baue_tabelle`, `baue_diagramm`, CSS für Bildschirm und Druck. Zellen sind reiner Text, alles wird maskiert.
- `prompts.py` (Master-Prompt kennt beide Typen), `qualitaet.py` (nur Seite, passiv, Befunde bei leeren Blöcken), `vorschau.py`.
- Tests: `kern_tabelle_test.py` (33 Tests: Zahlen, Grenzen, Maskierung, Druckregeln, Muster, ids). Gesamt 235 Tests grün.
- **Beim Testen gefunden und behoben:** Reihenname und Einheit standen unmaskiert in den `<title>`-Tooltips der Säulen/Balken/Marken (HTML-Einschleusung).

**App:**
- `src/lib/werkzeugkiste-tabelle.ts`: Raster-Rechenwerk, Einfügen aus Excel (Tab/Zeilen/Anführungszeichen), Zahlenlesen wie im Kern, Diagramm-Prüfung, `tabelleAusHtml` (Herauslösen) und `loeseTabelleHeraus`.
- `raster-feld.tsx` (gemeinsames Raster, Pfeiltasten hoch/runter, 44 px), `editor-formulare-tabelle.tsx` (Tabelle, Diagramm), `tabelle-herausloesen.tsx` (Knopf im Textblock mit Verlust-Warnung).
- Katalog: 33 Einträge (neu: Tabelle, Diagramm in „Lesen & Nachschlagen“), Skizzen, Typnamen, Beispiel-JSON (vom Kern-Test mitgebaut).

**Abweichungen von Spec/Entwurf:**
- **Keine eigene Live-Vorschau im Diagramm-Formular.** Die vorhandene Seitenvorschau des Editors zeigt das fertige Diagramm; eine zweite Zeichenlogik im Browser wäre Doppelarbeit gewesen.
- Die Spec nennt „Bildunterschrift“: gespeichert als `caption` (wie beim Bild). Weitere Felder: `zeilen`, `kopfzeile`, `stil`; `art`, `titel`, `achse`, `einheit`, `beschriftungen`, `reihen[{name, werte}]`.
- Zebra ohne Kopfzeile beginnt mit der ersten Zeile schattiert.
- Herauslösen nur für Tabellen auf oberster Ebene des Textes; Tabellen in Boxen/Listen werden benannt, aber nicht umgewandelt.

## QA Test Results
Ausgeführt am 2026-11-12 (statisch, Tests, Build, Sichtprüfung der Zeichnungen als PNG; **kein Browser-Durchgang**, siehe No-Dev-Server-Regel).

| Bereich | Ergebnis |
|---|---|
| App: `tsc`, `vitest` (41 Dateien, 649 Tests), `npm run build` | grün |
| Kern: 235 Tests inkl. Sicherheitstests | grün |
| Katalog ↔ `BAUSTEINE`-Vergleich, Beispiele bauen ohne Warnung | grün |
| Sichtprüfung Säulen, Balken, Linie, Kreis (Muster, Lücken, Negativwerte) | in Ordnung |
| Sicherheit: Zellen-/Titel-/Reihennamen mit HTML | maskiert (Befund oben behoben) |

**Offen (nur im Browser prüfbar, Lehrkraft-Durchgang):** Tabelle am Handy (Scrollrahmen), Einfügen aus echtem Excel/Word, Druckansicht (Seitenumbruch), Diagramm bei 360 px, Herauslösen mit echtem Material, Screenreader.

## Bekannte Einschränkungen
- Nicht-Zahlen im Diagramm verhindern das Speichern nicht hart; der Kern überspringt das Diagramm mit Warnung, das Formular markiert die Zelle rot.
- Tabellenzellen: kein Fett/Links (reiner Text, bewusst).

## Deployment
- **2026-11-12:** Kern `238f835` (Vercel `werkzeugkiste-kern`, per CLI, Ready) vor der App; App `8867983` (Push auf `main`, Vercel `spedilern`, Ready). Tag `v1.91.0-PROJ-91`.
- Keine Migration, keine neuen Umgebungsvariablen. Route ohne Login liefert 401 wie erwartet.
- Kern-Commits liegen nur lokal und per CLI-Deploy in Produktion (Zweig `vercel-kern` ist nicht gepusht).
- **Offen:** Browser-Durchgang als Lehrkraft (Desktop und Handy), siehe QA.
