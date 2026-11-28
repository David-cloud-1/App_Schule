# PROJ-135: Farben mit fester Bedeutung, weniger Pillen & ein Anlegen-Muster (Phase 6, Teil 1)

## Status: Planned
**Created:** 2026-11-28
**Last Updated:** 2026-11-28

## Worum es geht
Phase 6 aus [docs/plan-uebersichtlichkeit.md](../docs/plan-uebersichtlichkeit.md), Teil 1 von 6. Heute ist im Lehrkräfte-Bereich fast alles grün: die Hauptaktion, der aktive Menüpunkt, das gewählte Segment, der aktive Reiter, die Zähler im Menü, Schalter, Erfolg und Status. Grün steht 747-mal in 148 Dateien. Eine Lehrkraft erkennt deshalb nicht, **was sie als Nächstes tun soll**. Dazu kommen Bereichs-Pillen in jeder Zeile, obwohl oben schon ein Bereich gewählt ist, und das Anlegen sieht überall anders aus (Dialog, Seite, Assistent, Dialog im Dialog).

Dieses Feature legt fest, wofür jede Farbe steht, und setzt das im ganzen Bereich um. Gleiches gilt für Pillen und das Anlegen.

**Befunde (aus dem Plan):** B83 (Grün für alles), B85 (Anlegen uneinheitlich), B86 (zu viele Pillen), B87 (Wichtiges klein und grau).

## Entscheidungen (Nutzer, 2026-11-28)
- **E1 – Zuschnitt:** Phase 6 wird in sechs Features geteilt: 1) Farben, Pillen und Anlegen-Muster (dieses Feature), 2) Listen und Filter, 3) Hilfe, Erste Schritte und Suche, 4) Werkzeugkiste klarer, 5) Schüleransicht für Lehrkräfte, 6) Tempo. Dieses Feature kommt zuerst, weil die anderen auf den Farbregeln aufbauen.
- **E2 – Was grün bleibt:** die Hauptaktion, Erfolgsmeldungen, die Status „läuft“ und „fertig“, eingeschaltete Schalter und der Tastatur-Fokus. **Neutral** werden der aktive Menüpunkt, das gewählte Segment, der aktive Reiter und die Zähler im Menü.
- **E3 – Umfang:** der ganze Bereich unter `/admin`, auch Werkzeugkiste und Baukasten. Für den Baukasten wird nur `bedien-design.ts` angepasst, damit dort weiter eine Quelle gilt.
- **E4 – Bereichs-Pille:** erscheint in Listen und Karten nur, wenn oben „Alle Bereiche“ gewählt ist.
- **E5 – Anlegen:** Die Regel kommt in DESIGN.md, und alle Fälle von „Dialog im Dialog“ werden umgebaut. Zu lange Dialoge, die eigentlich eine Seite sein müssten, kommen auf eine Liste für später.

## Dependencies
- Baut auf: PROJ-45 (Farb-Tokens `ws-*`), PROJ-83 (AdminSegmented, AdminTabs, AdminRowActions), PROJ-130 (Bereichs-Umschalter), PROJ-118 (Baukasten-Quelle `bedien-design.ts`)
- Vor: die übrigen fünf Features aus Phase 6. Sie benutzen die Farbregeln von hier.
- Nicht betroffen: die Schülerseite (Phase 7) und die Papier-Ansichten (Druck, QR-Code bleiben `bg-white text-black`).

## User Stories
- Als **Lehrkraft, die die App nicht kennt**, will ich auf jeder Seite sofort sehen, welcher Knopf die Hauptaktion ist, damit ich ohne Suchen weiterkomme.
- Als **Lehrkraft** will ich, dass Grün immer dasselbe bedeutet („das ist die Aktion“ oder „das hat geklappt“), damit ich Farben nicht jedes Mal neu deuten muss.
- Als **Lehrkraft mit einem gewählten Bereich** will ich nicht in jeder Zeile „Spedition“ lesen, damit die Listen ruhiger werden und das Wichtige auffällt.
- Als **Lehrkraft** will ich, dass Anlegen überall gleich funktioniert (Kurzes im Dialog, Langes auf einer Seite mit Schritten), damit ich nie in einem Dialog über einem Dialog lande und den Faden verliere.
- Als **Lehrkraft am Handy oder am Beamer** will ich, dass wichtige Angaben (Titel, Datum, Status) gut lesbar sind und nicht klein und grau, damit ich sie auch aus der Entfernung erkenne.
- Als **Entwickler** will ich, dass ein Test fehlschlägt, wenn jemand Grün wieder für „aktiv“ oder „gewählt“ benutzt, damit die Regel nicht schleichend verloren geht.

## Acceptance Criteria

### A. Farbregel festgeschrieben
- [ ] `docs/DESIGN.md` (Abschnitt Lehrkräfte-Bereich) bekommt eine Tabelle **„Farbe = Bedeutung“**:
  - **Grün:** Hauptaktion (höchstens eine je Seitenkopf, wie bisher), Erfolg (Toast, Häkchen), Status „läuft“ und „fertig“, Schalter an, Tastatur-Fokus.
  - **Neutral** (`ws-text` auf `ws-raised`, Rand `ws-line`): aktiver Menüpunkt, gewähltes Segment, aktiver Reiter, Zähler, Auswahl in Listen.
  - **Blau:** Info und Links.
  - **Orange:** Warnung, „Vertretung fehlt“, „wartet auf dich“.
  - **Rot:** nur Fehler, Löschen und wirklich Dringendes.
  - **Gold:** nur Auszeichnungen.
- [ ] Die Regel steht auch im Plan unter Phase 6 als „umgesetzt in PROJ-135“.

### B. Neutral statt grün (B83)
- [ ] Der aktive Menüpunkt in der Seitenleiste und in der Handy-Schublade ist neutral hervorgehoben (Fläche `ws-raised`, Schrift `ws-text`, halbfett). Er bleibt deutlich vom nicht aktiven Punkt unterscheidbar, auch ohne Farbe (Fläche und Schriftstärke).
- [ ] Das gewählte Segment in `AdminSegmented` ist neutral. Wählbar und gewählt unterscheiden sich mit einem Kontrast von mindestens 3 : 1 (WCAG 1.4.11, Nicht-Text-Kontrast), in Hell und Dunkel.
- [ ] Der aktive Reiter in `AdminTabs` wird mit einer Linie in `ws-text` unterstrichen, nicht mehr grün.
- [ ] Die Zähler im Menü (z. B. neue Meldungen) sind neutral. Ein Zähler, der „wartet auf dich“ bedeutet, ist orange.
- [ ] Zeilenaktionen (Bearbeiten-Symbol und `⋯`) sind Umriss- oder Geister-Knöpfe, nie gefüllt grün.
- [ ] Ausgewählte Zeilen (Checkbox) sind neutral hervorgehoben, nicht grün.
- [ ] Grün gefüllt ist auf jeder Seite höchstens **ein** Knopf: die Hauptaktion. Weitere Aktionen sind `variant="outline"`. Das gilt auch in Dialogen: dort ist der bestätigende Knopf grün, „Abbrechen“ ist Umriss.
- [ ] Erfolgsmeldungen, Häkchen und die Status „läuft“ und „fertig“ bleiben grün.
- [ ] Rot erscheint nur bei Fehlern, beim Löschen (im `⋯`-Menü unten, im `AlertDialog`) und bei Dringendem. Wo Rot heute nur Aufmerksamkeit erzeugt, wird es orange oder neutral.
- [ ] Baukasten: `bedien-design.ts` übernimmt die Regel. Der gewählte Block und aktive Knöpfe der Leiste sind neutral, „Fertig“ bleibt die grüne Hauptaktion. Danach laufen `npm run schreibwerk:bauen` und `npm run aufgabenwerk:bauen`.

### C. Weniger Pillen (B86)
- [ ] Die Bereichs-Pille (Spedition/Tourismus) erscheint in Listen, Tabellen und Karten nur, wenn oben „Alle Bereiche“ gewählt ist.
- [ ] Ist ein Bereich gewählt, fehlt die Pille. Auf Detailseiten steht der Bereich weiter als ruhige Zeile.
- [ ] Lange Fachnamen in Zeilen erscheinen als Kürzel (z. B. „BGP“). Der volle Name steht im `title` und wird von Screenreadern vorgelesen.
- [ ] Eine Zeile zeigt höchstens **zwei** Pillen. Was darüber hinausgeht, steht in der Detailansicht.
- [ ] Status-Pillen (Entwurf, Offen, Geschlossen, Freigegeben …) bleiben, folgen aber der Farbregel aus A.

### D. Wichtiges sichtbar (B87)
- [ ] Titel, Datum und Status einer Zeile stehen in `ws-text`, nicht in `ws-muted` oder `ws-faint`.
- [ ] `ws-muted` ist für Nebentext und Labels, `ws-faint` nur für Hinweise und Gruppentitel. Die DESIGN.md sagt das ausdrücklich.
- [ ] Die Hauptaktion steht im Seitenkopf rechts und ist der auffälligste Knopf der Seite. Filter und Suche sind nicht größer als die Hauptaktion. (Das Listen- und Filter-Muster selbst ist Teil 2 von Phase 6.)

### E. Ein Anlegen-Muster (B85)
- [ ] `docs/DESIGN.md` bekommt die Regel: **Kurz = Dialog** (bis etwa 5 Felder, ein Schritt). **Lang = eigene Seite mit Schritten** (wie „Leistungsnachweis anlegen“ aus PROJ-133). **Nie Dialog im Dialog.** Eine Rückfrage per `AlertDialog` (z. B. „Wirklich löschen?“) ist erlaubt.
- [ ] Alle Anlegen-Wege im Bereich sind in einer Liste in dieser Spec erfasst (Ort, heutige Form, Soll-Form).
- [ ] Jeder Fall, in dem ein Dialog einen zweiten Dialog öffnet (außer `AlertDialog`), ist umgebaut: Der zweite Schritt wird ein Schritt im selben Dialog, ein ausklappbarer Bereich oder eine eigene Seite.
- [ ] Dialoge, die nach der Regel eine Seite sein müssten (mehr als ein Schritt oder viele Felder), stehen auf der Liste „später“ in dieser Spec und im Plan. Sie werden in diesem Feature nicht umgebaut.

### F. Absicherung
- [ ] Ein Test schlägt fehl, wenn eine Datei unter `src/components/admin`, `src/app/admin` oder `src/components/werkzeugkiste` Grün für einen aktiven oder gewählten Zustand benutzt (z. B. `data-[active=true]:…ws-green`, `data-[state=on]:…ws-green`, `data-[state=active]:…ws-green`).
- [ ] Der bestehende Kontrast-Test `src/lib/workspace-theme.test.ts` deckt neue oder geänderte Tokens ab: Text mindestens 4,5 : 1, gewähltes Segment gegen nicht gewähltes mindestens 3 : 1.
- [ ] `bedien-design.test.tsx` läuft weiter grün.
- [ ] Im Plan sind B83, B85, B86 und B87 abgehakt (☑, oder ◐ mit Hinweis auf die Liste „später“).

## Edge Cases
- **Kein Grün mehr für „aktiv“, aber Tastatur-Fokus grün:** Fokus-Ring und aktiver Zustand dürfen nicht verwechselt werden. Der Fokus ist ein Ring, der aktive Zustand ist eine Fläche.
- **Farbenblindheit / Graustufen:** Aktiv, gewählt und Status müssen auch ohne Farbe erkennbar sein (Fläche, Schriftstärke, Unterstreichung, Symbol oder Text).
- **Seiten ohne Hauptaktion** (z. B. Änderungsprotokoll): Es gibt keinen grünen Knopf. Kein Knopf wird „zur Not“ grün.
- **Leere Liste:** Die Hauptaktion steht nur im Leerzustand (Regel aus PROJ-45). Dort ist sie grün, im Kopf fehlt sie.
- **Mehrere gleichwertige Aktionen** (z. B. „Freigeben“ und „Verlängern“ auf der Nachweis-Seite): Die Aktion, die der Ablauf als Nächstes erwartet, ist grün. Die anderen sind Umriss. Wechselt der Status, wechselt auch die grüne Aktion.
- **„Alle Bereiche“ gewählt, aber eine Liste hat nur Einträge eines Bereichs:** Die Pille erscheint trotzdem, weil die Regel am Umschalter hängt und nicht am Inhalt. So springt die Darstellung nicht beim Filtern.
- **Lehrkraft ohne Bereichs-Umschalter** (nur ein Bereich freigegeben): Sie hat immer einen Bereich gewählt, also erscheint nie eine Pille.
- **Fach ohne Kürzel:** Der Name wird mit „…“ gekürzt, der volle Name steht im `title`.
- **Dialog im Dialog, der fachlich nötig scheint** (z. B. „Neue Notenschlüssel-Vorlage“ beim Anlegen): Er wird ein ausklappbarer Bereich im selben Schritt. Danach ist die neue Vorlage gleich ausgewählt.
- **Hell und Dunkel:** Jede neue oder geänderte Farbe gilt in beiden Modi und im Modus „Wie System“.
- **Druck:** Druckbögen bleiben schwarz auf weiß und sind nicht betroffen.

## Technical Requirements
- Nur bestehende `ws-*`-Tokens oder neue Tokens in beiden Modi. Keine festen Farbwerte (Regel aus PROJ-45).
- Barrierefreiheit: WCAG AA für Text (4,5 : 1) und für Bedienelemente (3 : 1).
- Animationen unverändert (höchstens 200 ms, entfallen bei „Bewegung reduzieren“).
- Keine Datenbank-Änderung, keine neuen Umgebungsvariablen.

## Nicht in diesem Feature
- Listen-Muster (Tabelle ab Laptop, Karten am Handy, Aktionsspalte immer sichtbar, höchstens 5 Spalten) und Filter-Muster: Teil 2 von Phase 6
- „Erste Schritte“, „?“-Hilfe, Schnellsuche über Inhalte: Teil 3
- Werkzeugkiste (KI-Weg erklären, „kommt bald“ ausblenden, Vorschau im Regal, B63 Block-Leiste): Teil 4
- Schüleransicht für Lehrkräfte: Teil 5
- Tempo: Teil 6
- Umbau langer Dialoge zu eigenen Seiten (nur erfasst, siehe E5)
- Schülerseite (Phase 7)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
