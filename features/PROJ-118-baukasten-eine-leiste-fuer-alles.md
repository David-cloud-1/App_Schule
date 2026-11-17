# PROJ-118: Baukasten – Eine Leiste für alles

## Status: Deployed
**Created:** 2026-11-17
**Last Updated:** 2026-11-17

## Hintergrund
PROJ-117 hat Farben, Höhen und Wörter angeglichen, das Ziel „einheitlich, selbsterklärend, sehr einfach“ aber verfehlt. Befund aus dem Live-Test (Chrome, spedilern.vercel.app, 2026-11-17):

| Situation | Was man heute sieht | Problem |
|---|---|---|
| Lehrtext öffnen (Doppelklick) | Schwebende Leiste in der Seite (F K H2 H3 • Liste 1. Liste Link · Box … · Diese Box … · Fertig) **und** dieselbe Leiste noch einmal in der Schublade rechts | Doppelt, widerspricht PROJ-111 „Eine Bedienstelle statt drei“ |
| Aufgabe öffnen | Blauer Rahmen, Schild „Bearbeiten“, **keine** Leiste oben; unten klebt eine Fußzeile „Kapiteltest … ⋯ Fertig“ | „Fertig“ steht beim Lehrtext oben rechts, bei Aufgaben unten rechts |
| Element nur angeklickt | „Lehrtext · Darunter · Duplizieren · ⋯ · Löschen“ / „Kapiteltest · Bearbeiten · Darunter · Duplizieren“ / „Thema · + Element · Löschen“ | Gleiches heißt verschieden, „Bearbeiten“ fehlt mal |
| Knöpfe „F“, „K“, „H2“, „H3“, „Box …“, „Diese Box …“ | Kürzel | Für Anfänger nicht erratbar |
| „Fertig“ im Lehrtext ohne Eingabe | „Veröffentlichen“ wird aktiv, „Rückgängig“ möglich | Stiller Fehler: Unverändertes Beenden gilt als Änderung |

Ziel: **Eine** Bearbeiten-Leiste, gleich gebaut für jedes Element, mit ganzen Wörtern.

## Dependencies
- Requires: PROJ-103 (Schreibwerk), PROJ-114 (Aufgabenwerk), PROJ-117 (gemeinsame Quelle `bedien-design.ts` / `bedien-woerter.ts`)
- Löst ab: die Kürzel-Wörter und die Leistenverteilung aus PROJ-117
- Berührt: PROJ-101 (Block-Leiste), PROJ-111 (Bedienstelle)

## User Stories
- Als Lehrkraft ohne Vorwissen will ich auf jedem Knopf ein ganzes Wort lesen („Fett“, „Überschrift“, „Kasten einfügen …“), damit ich nicht raten muss.
- Als Lehrkraft will ich beim Bearbeiten jedes Elements (Lehrtext, Aufgabe, Thema, Deckblatt) dieselbe Leiste an derselben Stelle sehen: links, was ich bearbeite, rechts „Fertig“.
- Als Lehrkraft will ich nie zwei gleiche Leisten gleichzeitig sehen.
- Als Lehrkraft will ich beim bloßen Anklicken eines Elements immer dieselben Wörter in derselben Reihenfolge sehen, und „Bearbeiten“ soll immer in die Leiste führen.
- Als Lehrkraft will ich, dass „Fertig“ ohne Eingabe nichts verändert (kein „Veröffentlichen“, kein Rückgängig-Schritt).

## Acceptance Criteria

### Eine Bearbeiten-Leiste
- [ ] Lehrtext, Aufgabe (alle Muster mit Bauplan), Thema-Titel, Deckblatt-Titel/-Untertitel und Bildunterschrift zeigen beim Bearbeiten in der Seite **dieselbe** Leiste: gleiche Form, Farben, Höhe aus `bedien-design.ts`.
- [ ] Links steht der Name des Elements in Alltagssprache (z. B. „Lehrtext“, „Kapiteltest“, „Thema“), rechts immer „Fertig“ (gefüllt, blau).
- [ ] Am Rechner steht die Leiste oben am geöffneten Element und bleibt beim Scrollen oben kleben; am Handy klebt sie unten über der Bildschirmtastatur.
- [ ] Die Aufgaben-Fußzeile (`.wk-aw-fuss`) und das Schild „Bearbeiten“ entfallen; ihre Inhalte stehen in der Leiste.
- [ ] `role="toolbar"`, Name „<Element> bearbeiten“, Esc = Fertig, sichtbarer Fokus, Knöpfe ≥ 44 px auf Touch, Kontrast ≥ 4,5 : 1.

### Ganze Wörter (einzige Quelle `bedien-woerter.ts`)
- [ ] Textknöpfe: **Fett, Kursiv, Überschrift, Unterüberschrift, Aufzählung, Nummerierung, Link** (Hinweistexte mit Tastenkürzel).
- [ ] Boxen heißen **Kasten**. Außerhalb eines Kastens: Auswahl „Kasten einfügen …“ (Merke, Tipp, …). In einem Kasten: Auswahl „Kasten ändern …“ mit „Art ändern in …“, „Neuer Kasten darunter“, „Kasten entfernen (Text bleibt)“, „Kasten löschen“. Ersetzt „Box …“ und „Diese Box …“.
- [ ] Schreibwerk, Aufgabenwerk, Block-Leiste und Schublade nehmen alle Beschriftungen aus `bedien-woerter.ts`; der Wächtertest schlägt bei eigenen Wörtern fehl.

### Inhalt der Leiste je Element
- [ ] **Lehrtext:** Textknöpfe, Kasten-Auswahl, „Als HTML bearbeiten“ (öffnet die Schublade), Fertig.
- [ ] **Aufgabe:** keine Formatknöpfe (Aufgabentext bleibt reiner Text), „Duplizieren“, „Löschen“, „Mehr …“ (Aufgabentyp ändern, Quelltext bearbeiten), Fertig. „Antwort hinzufügen“ bleibt am Ende der Liste, wo der neue Eintrag erscheint.
- [ ] **Thema, Deckblatt, Bildunterschrift:** Name, kurzer Hinweis „Enter = Fertig“, Fertig.

### Keine doppelte Leiste
- [ ] Wird ein Element in der Seite bearbeitet, ist die Schublade zu (wie schon bei Aufgaben).
- [ ] Öffnet man die Schublade für das gerade in der Seite bearbeitete Element (Gliederung, „Als HTML bearbeiten“), endet das Bearbeiten in der Seite vorher mit Endstand.
- [ ] Die Schublade behält ihre sichtbare Leiste (dieselben Wörter) für das, was nur dort geht (HTML-Ansicht, Felder ohne Seiten-Entsprechung).

### Block-Leiste beim Anklicken
- [ ] Gleiche Wörter und Reihenfolge für alle Elementarten: **Name · Bearbeiten · Darunter einfügen · Duplizieren · ⋯ · Löschen**; was bei einer Art nicht geht, fehlt, die Reihenfolge bleibt.
- [ ] „Bearbeiten“ ist immer sichtbar (auch bei offener Schublade) und führt immer in die Bearbeiten-Leiste: Lehrtext → Schreiben in der Seite, Aufgabe mit Bauplan → Aufgabenwerk, Thema → Titel in der Seite, Deckblatt → Titel in der Seite. Elemente ohne Seiten-Bearbeitung (Bild, Tabelle, Lernzielkontrolle …) öffnen wie bisher die Schublade.
- [ ] Doppelklick und Enter verhalten sich wie „Bearbeiten“.

### Stiller Fehler
- [ ] „Fertig“ ohne Eingabe (Lehrtext und einzeilige Texte) erzeugt keine Änderung: kein Rückgängig-Schritt, „Veröffentlichen“ bleibt, wie es war.

## Edge Cases
- **Handy:** Leiste unten über der Tastatur (Schreibwerk wie bisher, Aufgabenwerk neu); die Mitte scrollt waagerecht, Name und Fertig bleiben sichtbar; die Seite hat unten Platz (kein Verdecken der letzten Zeile).
- **Zwei Leisten:** Öffnet man ein zweites Element, schließt das erste mit Endstand; es ist nie mehr als eine Leiste sichtbar.
- **Lücken-Marken (Muster E):** Die schwebenden Knöpfe der Lücken bleiben in der Aufgabe; die Leiste ändert keinen Aufgabentext.
- **Esc:** schließt zuerst ein offenes Menü/Link-Feld, sonst = Fertig.
- **Lange Leiste am Rechner:** Mitte bricht um, nichts ragt aus dem Bild, die Aufgabe wird nicht breiter.
- **Dunkelmodus:** Schublade folgt `ws-*`, die Vorschau bleibt Papier-hell.
- **Schreibschutz/Ausprobieren:** keine Leiste, „Bearbeiten“ nur, wo es heute schon erscheint.
- **Bearbeiten, während die Seite neu baut:** Stimmt die Stelle nicht mehr, öffnet die Schublade (nie ein stummes Nichts).

## Technical Requirements
- Keine Datenbank, keine API, kein Kern-Umbau, keine neuen Pakete.
- Grundregel bleibt: Die Seite meldet, die App prüft und speichert. Neu ist nur der Wunsch „Formular öffnen“ (`wkFormular`).
- Beide Bündel neu gebaut (`schreibwerk:bauen`, `aufgabenwerk:bauen`), Frische-Tests grün.

## Nicht Teil dieser Spec
- Formatieren in Aufgabentexten (Kern-Umbau).
- „Seitengröße … MB von 8 MB“ (Datenproblem).
- Neue Funktionen in der Schublade.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (kurz)

**Gemeinsame Teile**
- `bedien-woerter.ts`: Textknöpfe mit ganzen Wörtern (`text`, `lang`), `KASTEN` (Einfügen/Ändern/Aktionen), `FERTIG`, `ELEMENT_LEISTE` (Name für Screenreader, „Als HTML bearbeiten“, „Mehr …“, Duplizieren, Löschen, Hinweis „Enter = Fertig“), `BLOCK_LEISTE` (Bearbeiten, Darunter einfügen, Duplizieren, Weitere Aktionen, Löschen).
- `bedien-design.ts`: `elementLeisteCss()` = Grundform der einen Leiste (Rahmen, Name links, Mitte, Fertig rechts, Handy unten). Schreibwerk, Aufgabenwerk und Vorschau-Skript setzen ihre Leiste mit denselben Klassen (`wk-el`, `wk-el-name`, `wk-el-mitte`, `wk-el-k`, `wk-el-fertig`) zusammen.

**Seite**
- Schreibwerk (`schreibwerk/eintritt.ts`): Leiste aus den Bausteinen, Kasten als **eine** Auswahl (einfügen bzw. ändern), Knopf „Als HTML bearbeiten“ → Endstand melden, dann `wkFormular`.
- Aufgabenwerk (`aufgabenwerk/eintritt.ts`, `design.ts`): Fußzeile und Schild weg, Leiste oben (Handy unten, über der Tastatur), Duplizieren/Löschen sichtbar, „Mehr …“-Menü mit Typ ändern/Quelltext.
- Vorschau-Skript: Thema/Deckblatt/Bildunterschrift bekommen dieselbe Leiste; Block-Leiste mit einheitlichen Wörtern; „Bearbeiten“ immer sichtbar.

**App**
- `baukasten-editor.tsx`: „Bearbeiten“/Doppelklick/Enter öffnen in der Seite, was dort geht; Schreiben in der Seite schließt die Schublade; geöffnete Schublade beendet Schreiben in der Seite; neuer Wunsch `formular`.
- Fehlerbehebung: Endstand, der sich vom Start nur in der Schreibweise unterscheidet, gilt als unverändert (Lehrtext über `rundreiseOk`, einzeilige Texte über `einfachText`).

## Entscheidungen
1. **„Kasten“ statt „Box“** – deutsches Alltagswort, passt zu „Merke-Kasten“, „Tipp-Kasten“.
2. **Eine Kasten-Auswahl statt zwei:** Außerhalb eines Kastens nur „einfügen“, darin nur „ändern“ (Art, darunter, entfernen, löschen). Ein Bedienelement weniger.
3. **Schublade zu beim Bearbeiten in der Seite** (wie bei Aufgaben seit PROJ-114). Kein Hinweis-Ersatz in der Schublade, weil zwei Orte für denselben Text Anfänger verwirren.
4. **„Antwort hinzufügen“ bleibt an der Liste** (Google-Forms-Prinzip: der Knopf steht dort, wo der neue Eintrag erscheint); die Leiste trägt die Element-Aktionen.
5. **Mitte scrollt am Handy waagerecht** statt dreizeilig umzubrechen, damit über der Tastatur Platz bleibt.

## Implementation Notes (2026-11-17)
- **Zielbild vor dem Bau:** `docs/vorschau/proj118-zielbild.png` (statisch mit sharp gerendert; liegt lokal, `docs/vorschau/*.png` ist in `.gitignore`).
- **Gemeinsame Quelle:** `bedien-woerter.ts` neu aufgebaut (`TEXT_KNOEPFE` mit `text` statt `kurz`, `KASTEN`, `FERTIG`, `ELEMENT_LEISTE`, `BLOCK_LEISTE`; `BOX_WAHL`/`BOX_AKTION` entfallen). `bedien-design.ts`: `elementLeisteCss()` (Klassen `wk-el`, `wk-el-name`, `wk-el-mitte`, `wk-el-k`, `wk-el-s`, `wk-el-fertig`, `wk-el-unten`, `wk-el-hinweis`).
- **Schreibwerk** (`schreibwerk/eintritt.ts`, `schreib-design.ts`): Leiste mit Name/Mitte/Fertig; ein Kasten-Feld (`art:<klasse>` / `aktion:<id>`), das sich je nach Cursor zwischen „einfügen“ und „ändern“ umbaut; „Als HTML bearbeiten“ meldet Endstand + `wkFormular`; Esc auf der Leiste = Fertig; Geschütztes sperrt auch das Kasten-Feld; Klickstelle wird um die Leistenhöhe versetzt.
- **Aufgabenwerk** (`aufgabenwerk/eintritt.ts`, `design.ts`): Schild und Fußzeile entfernt, Leiste oben (Handy unten, `--wk-tastatur` über `visualViewport`), Duplizieren/Löschen sichtbar, „Mehr …“ (Typ ändern, Quelltext) als Menü an der Leiste. Im Lücken-Fenster heißt der Schließen-Knopf jetzt „Schließen“ statt „Fertig“ (sonst zwei „Fertig“ gleichzeitig).
- **Vorschau-Skript:** Block-Leiste aus `BLOCK_LEISTE` (Bearbeiten · Darunter einfügen · Duplizieren · ⋯ · Löschen mit Text), „Bearbeiten“ immer sichtbar; Thema/Deckblatt/Bildunterschrift bekommen dieselbe Leiste (Cursor erst setzen, dann Leiste einfügen; Mausdruck auf der Leiste nimmt dem Text nicht den Fokus; Handy über der Tastatur); „Alle Blöcke …“ → „Alle Elemente …“.
- **App** (`baukasten-editor.tsx`, `vorschau-nachrichten.ts`): `seitenTeil()` + `starteSchreibenInSeite()` für „Bearbeiten“, Doppelklick und Enter; Schreiben in der Seite schließt die Schublade, eine geöffnete Schublade beendet das Schreiben; neuer Wunsch `formular`; Abbruch beim Schreiben öffnet die Schublade.
- **Stiller Fehler behoben:** Ursache war die Reinigung in der App: `uebernimmSchreibtext` schreibt jeden Text durch das Motor-Schema um (`<div class="merke"><p>x</p></div>` → `<div class="merke">x</div>`, Zeilenumbrüche zwischen Absätzen fallen weg, `<b>` → `<strong>`, Tabellen bekommen `<tbody>`). Damit war der Endstand bei fast jedem echten Lehrtext „anders“ als der Start, auch ohne Eingabe → Rückgängig-Schritt + Speichern + „Veröffentlichen“ aktiv. Jetzt: `rundreiseOk(start, gereinigt)` ⇒ Start bleibt; einzeilige Texte vergleichen `einfachText`.
- **Schublade** (`text-editor.tsx`): ganze Wörter, ein Kasten-Menü („Kasten einfügen …“ / „Kasten ändern …“ mit Art, Neuer Kasten darunter, entfernen, löschen), Zusatzknöpfe mit Text („Schritte“, „Link entfernen“, „Geschützten Teil löschen“).
- **Abweichung:** Ist die Leiste schmaler als 560 px (schmale Vorschau, Handy), bleibt sie einzeilig und die Mitte scrollt waagerecht (Container-Abfrage), statt fünf Zeilen hoch zu werden. Am Handy liegt „Mehr …“ in der Aufgabe dadurch evtl. erst nach Wischen sichtbar.
- `docs/DESIGN.md` Abschnitt „Bearbeiten-Leiste im Baukasten“ neu gefasst.

## QA Test Results (2026-11-17)
**Automatisch:** `npx vitest run src/components/werkzeugkiste`: 47 Dateien, 760 Tests grün. `npm test`: 3893 von 3894 grün; rot nur `src/lib/werkzeugkiste-auszug.test.ts` (schon vorher rot, nicht Teil dieser Arbeit). `tsc` ohne Fehler, ESLint 0 Fehler (5 alte Warnungen), `npm run build` grün. Frische-Tests beider Bündel grün.

**Sichtprüfung vor dem Livegang:** Musterseite mit dem echten CSS und den echten Bausteinen (Schreibwerk, Aufgabenwerk, einzeilige Leiste) lokal in Chrome angesehen (kein Dev-Server, nur eine statische Datei): breit, 375 px schmal, Deckblatt zentriert, „Mehr …“-Menü offen. Dabei gefunden und behoben: (1) „Mehr …“ stand rechts an „Fertig“ statt bei den anderen Knöpfen; (2) in schmaler Breite wurde die Lehrtext-Leiste fünf Zeilen hoch → einzeilig mit Wischen.

| Kriterium | Ergebnis |
|---|---|
| Dieselbe Leiste für Lehrtext, Aufgabe, Thema, Deckblatt, Bildunterschrift | ✅ gleiche Klassen/CSS aus `elementLeisteCss`, per Test |
| Name links, „Fertig“ rechts | ✅ per Test und Sicht |
| Rechner oben klebend, Handy unten über Tastatur | ✅ Code + Test (`wk-el-unten`); Tastatur-Verhalten nicht auf echtem Handy geprüft |
| Fußzeile und Schild der Aufgabe weg | ✅ per Test |
| Toolbar-Rolle, Name, Esc, 44 px, Kontrast | ✅ per Test (Kontrast-Wächter, Touch-Maß), Esc in allen drei Stellen |
| Ganze Wörter, eine Quelle, Wächter gegen Kürzel | ✅ |
| Kasten statt Box, ein Feld | ✅ Seite und Schublade |
| Keine doppelte Leiste | ✅ Schreiben schließt Schublade; Schublade beendet Schreiben (Test) |
| Block-Leiste gleiche Wörter/Reihenfolge, „Bearbeiten“ immer | ✅ per Test |
| „Bearbeiten“/Doppelklick/Enter → Leiste, sonst Schublade | ✅ per Test (Lehrtext, Thema, Lernzielkontrolle) |
| „Fertig“ ohne Eingabe ändert nichts | ✅ Ursache gefunden, Test mit Kasten-Text und mit Leerzeichen-Titel |

**Edge Cases:** Zwei Leisten: Klick auf ein anderes Element beendet das offene zuerst (Seite) ✅. Lücken-Marken: Muster E unverändert, Bündel-Tests grün ✅. Esc: Menü zuerst, dann Fertig ✅ (Test). Schmale Leiste ✅ (Sicht). Dunkelmodus: Schublade nur `ws-*`-Klassen ✅, Vorschau Papier-hell ✅. Schreibschutz: „Bearbeiten“ öffnet die Schublade (lesend) wie bisher ✅.

**Sicherheit:** Neuer Wunsch `wkFormular` wird wie alle Wünsche über `liesWunsch` (gültige Marke) geprüft und öffnet nur die Schublade; keine neuen Datenwege.

**Nicht geprüft:** echtes Handy (Tastatur), Safari/Firefox, Live-Durchgang vor dem Deploy (kein Dev-Server). Live-Sicht nach dem Deploy siehe unten.

**Ergebnis:** keine offenen Critical/High-Fehler → bereit.

## Deployment
**2026-11-17:** Push auf `main` (Commit b51a7f1; mitgefahren: b4ed8b7, nur der Status-Eintrag „Deployed“ von PROJ-117). Vercel-Production Ready (erstellt 22:07:48), https://spedilern.vercel.app antwortet (Startseite/Admin 307 ohne Anmeldung, /login 200). Keine Migration, keine Datenbank.

### Live-Sicht nach dem Deploy (Chrome, Super-Admin, Material „Basics rund um den LKW (Kopie)“, nichts verändert)
- Block-Leiste: „Thema · Bearbeiten · Darunter einfügen · Löschen“ und „Lehrtext · Bearbeiten · Darunter einfügen · Duplizieren · ⋯ · Löschen“ ✅. Bei ca. 690 px Vorschaubreite bricht die Block-Leiste am Lehrtext in zwei Zeilen um (⋯ und Löschen in Zeile 2) – kosmetisch, offen.
- Thema „Bearbeiten“: Leiste „Thema · Enter = Fertig · Fertig“ über der Überschrift ✅; „Fertig“ ohne Eingabe: Rückgängig bleibt aus ✅.
- Lehrtext (Doppelklick, zweiter Klick und „Bearbeiten“): eine Leiste mit ganzen Wörtern, „Kasten ändern …“, „Als HTML bearbeiten“, „Fertig“ rechts; keine Schublade daneben ✅. Cursor landet an der Klickstelle ✅. „Fertig“ und Esc ohne Eingabe bei einem Text mit Kasten: „Entwurf gespeichert“, Rückgängig aus ✅ (der gemeldete stille Fehler ist live behoben).
- Lückentext (Klick in den Text): dieselbe Leiste oben „Lückentext · Duplizieren · Löschen · Mehr … · Fertig“, keine Fußzeile ✅; „Fertig“ ohne Eingabe ändert nichts ✅.
- **Einmal beobachtet, nicht reproduzierbar:** Gleich nach dem ersten Laden (Vorschau wurde noch 13 s neu gebaut) führte „Bearbeiten“ am Lehrtext zu nichts Sichtbarem. Nach Neuladen klappte dieselbe Folge (Thema → Fertig → Lehrtext per Doppelklick, „Bearbeiten“, zweiter Klick) dreimal. Vermutung: Start fiel in den Neubau der Vorschau (die Seite war noch nicht „bereit“). Weiter beobachten.
