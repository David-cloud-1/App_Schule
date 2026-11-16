# PROJ-103: Baukasten – Lehrtext direkt in der Seite tippen

## Status: In Review
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Lehrtexte, Themen-Überschriften, Boxen (Merke, Tipp …), das Deckblatt und Bildunterschriften bearbeitet man direkt in der Seite wie in Word, mit einer kleinen Formatleiste am Text. Aufgaben bleiben im Formular.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- PROJ-96 hat „Text direkt in der Seite“ noch verworfen: Die Seite wird aus der YAML gebaut, ein Rückweg HTML → YAML wäre verlustbehaftet. Der Nutzer will es jetzt ausdrücklich für Lehrtext (2026-11-16).
- Heute bearbeitet `text-editor.tsx` (in der Schublade) Lehrtext in einer gestalteten Ansicht mit Boxen und hat einen HTML-Schalter (PROJ-89 E8, PROJ-98).

## Entscheidungen (Nutzer, 2026-11-16)
- **E1 – Umfang:** Direkt tippen gilt für **Lehrtext-Blöcke, Themen-Überschriften, Deckblatt (Titel, Untertitel), Boxen im Lehrtext und Bildunterschriften**.
- **E2 – Aufgaben bleiben im Formular:** Aufgabentext, Antworten, Lösungen, Feedback und Distraktoren werden weiter in der Schublade bearbeitet, weil dort Pflichtfelder und Prüfregeln hängen.

## Dependencies
- Requires: PROJ-101 (Auswahl, Modus Bearbeiten, Block-Leiste)
- Ersetzt für Lehrtext: das Formular in der Schublade als Standardweg. Der HTML-Schalter bleibt in der Schublade als Profi-Weg.
- Berührt: PROJ-98 (Box-Menü), PROJ-89 E8 (Bereinigung `_saeubern()`)

## User Stories
- Als **Lehrkraft** möchte ich einen Tippfehler sehen, hineinklicken und ihn sofort korrigieren.
- Als **Lehrkraft** möchte ich Text fett machen, eine Liste anlegen oder einen Absatz in eine Merke-Box setzen, ohne ein Formular zu öffnen.
- Als **Lehrkraft** möchte ich eine Themen-Überschrift direkt umbenennen.
- Als **Lehrkraft** möchte ich Text aus Word einfügen, ohne dass seltsame Formatierungen mitkommen.
- Als **Lehrkraft am Handy** möchte ich einen Satz im Lehrtext ändern können.

## Acceptance Criteria

### Schreibmodus
- [ ] Im Modus Bearbeiten öffnet ein Klick auf einen bereits ausgewählten Lehrtext (oder ein Doppelklick auf einen nicht ausgewählten) den Schreibmodus mit dem Cursor an der Klickstelle.
- [ ] Themen-Überschrift, Deckblatt-Titel/-Untertitel und Bildunterschrift gehen genauso in den Schreibmodus (nur reiner Text, ohne Formatleiste).
- [ ] Im Schreibmodus sieht der Text aus wie in der fertigen Seite (gleiche Schrift, Boxen, Abstände). Ein dezenter Rahmen zeigt, dass man schreibt.
- [ ] Esc oder ein Klick außerhalb beendet den Schreibmodus und übernimmt die Änderung. Autosave und Neubau laufen wie bei Formular-Änderungen.
- [ ] Rückgängig/Wiederholen: Während des Schreibens wirkt ⌘/Strg + Z innerhalb des Textes. Nach dem Verlassen ist die gesamte Textänderung ein Schritt im Editor-Verlauf.

### Formatleiste (Lehrtext)
- [ ] Im Schreibmodus zeigt die Block-Leiste die Formatierung: Fett, Kursiv, Überschrift (2 Stufen), Liste, nummerierte Liste, Link, Box (Lernziele, Merke, Tipp, Achtung, Beispiel, Ausgangssituation, Arbeitsauftrag), Tabelle einfügen.
- [ ] Bei markiertem Text erscheint zusätzlich eine kleine Leiste direkt über der Markierung (Fett, Kursiv, Link, In Box setzen).
- [ ] Mit dem Cursor in einer Box: „Box-Art ändern“, „Neue Box darunter“, „Box auflösen (Text bleibt)“, „Box löschen“ (Funktionen aus PROJ-98, jetzt direkt am Text).
- [ ] Gängige Kürzel: ⌘/Strg + B, I, K. „- “ oder „1. “ am Zeilenanfang startet eine Liste. „/“ am Zeilenanfang öffnet den Katalog und setzt den gewählten Block hinter den aktuellen Absatz (der Lehrtext wird dort geteilt).
- [ ] Enter in einer leeren letzten Zeile beendet den Lehrtext und bietet „+ Block“ darunter an.

### Einfügen
- [ ] Eingefügter Text aus Word, Google Docs oder Webseiten behält nur Fett, Kursiv, Listen, Links, Überschriften und einfache Tabellen. Schriftarten, Farben, Größen und Skripte werden entfernt.
- [ ] Eingefügte Bilder im Text werden als eigener Bild-Block hinter dem Lehrtext angelegt (Weg aus PROJ-104), nicht in den Text eingebettet.

### Grenzen und Sicherheit
- [ ] Gespeichert wird weiter in der YAML im bisherigen Format des Lehrtexts. Ein Lehrtext, der direkt bearbeitet und gespeichert wurde, sieht im Formular und im HTML-Schalter identisch aus.
- [ ] Inhalte durchlaufen dieselbe Bereinigung wie heute (keine Skripte, Event-Attribute oder `javascript:`-Links).
- [ ] Teile eines Lehrtexts, die der Schreibmodus nicht sicher bearbeiten kann (komplexe Tabellen, eigenes Inline-CSS aus der KI), sind im Schreibmodus geschützt: Sie sind sichtbar, aber gesperrt, mit dem Hinweis „In der Schublade bearbeiten“. Sie gehen nie verloren.

### Handy
- [ ] Antippen eines ausgewählten Lehrtexts öffnet den Schreibmodus. Die Formatleiste sitzt über der Bildschirmtastatur (Fett, Liste, Box, Fertig).

## Edge Cases
- **Lehrtext enthält HTML, das der Schreibmodus nicht kennt:** Unbekannte Teile werden 1:1 erhalten (geschützte Insel), kein stilles Entfernen.
- **Text wird komplett geleert:** Beim Verlassen bleibt ein leerer Lehrtext mit Platzhalter (PROJ-101). Er wird nicht automatisch gelöscht.
- **Vorschau baut während des Schreibens neu** (zum Beispiel durch Autosave): Der Schreibmodus wird nicht unterbrochen, der Cursor springt nicht. Neu gebaut wird erst nach dem Verlassen.
- **Sehr langer Lehrtext:** Tippen bleibt flüssig (keine spürbare Verzögerung).
- **Zwei Leerzeichen, geschützte Leerzeichen, Silbentrennung:** Bleiben erhalten.
- **Schreibgeschützt:** Kein Schreibmodus. Text lässt sich markieren und kopieren.
- **Rechtschreibprüfung des Browsers:** Ist im Schreibmodus aktiv (Sprache Deutsch).

## Nicht Teil dieses Features
- Aufgaben direkt in der Seite bearbeiten (E2).
- Zusammenarbeit mehrerer Personen gleichzeitig.

## Technical Requirements
- Performance: Tasteneingabe ohne merkbare Verzögerung (< 16 ms pro Taste). Kein Neubau der Seite während des Tippens.
- Sicherheit: Sandbox des Vorschau-Rahmens bleibt. Text aus dem Rahmen wird in der App bereinigt, bevor er in die YAML kommt.

## Offene Punkte für `/architecture`
- Schreibt man im iframe (`contenteditable` im eingespielten Skript) oder legt die App einen Editor (vorhandene `text-editor.tsx`-Erweiterungen) passgenau über den Block?
- Wie wird „geschützte Insel“ für unbekanntes HTML umgesetzt?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Erstellt:** 2026-11-16 (Sonnet 5.5 – laut Reihenplan war Opus vorgesehen, bitte den Entwurf kritisch gegenlesen). Baut auf dem Grundsatz aus PROJ-101 auf: *Die Seite zeigt und meldet, die App entscheidet und speichert.*

### Ausgangslage (Bestand, geprüft)
- Der Kern baut die Seite **nicht** 1:1 aus dem gespeicherten Text. Er schreibt ihn um: Boxen bekommen Rahmen, Farben und Titelzeile, Schritt-Listen und Vergleiche werden zu eigenen Bauteilen, Überschriften und Tabellen bekommen Stil-Angaben (`schuldesign.py`). **Aus der fertigen Seite lässt sich der gespeicherte Text deshalb nicht zurückgewinnen.** Genau das war der Grund, warum PROJ-96 „Text direkt in der Seite“ verworfen hat.
- Das Formular (`text-editor.tsx`) hat den passenden Text-Motor schon: Tiptap mit Boxen, Vergleichen und „unveränderlichen Inseln“ für alles, was es nicht sicher bearbeiten kann. Eine **Rundreise-Prüfung** stellt sicher, dass nichts verloren geht. Das Ergebnis ist bereits getestet.
- Aufgabentexte, Überschriften, Deckblatt und Bildunterschriften sind dagegen **reiner Text**, den der Kern nur maskiert (`_esc`). Dort ist der Rückweg verlustfrei.

### Entscheidung 1: Welcher Motor schreibt, und wo?
| | A) Eigenbau mit dem Browser-Schreibfeld (`contenteditable`) in der Seite | B) Tiptap der App als Schicht über dem Rahmen | **C) Derselbe Tiptap-Motor wie im Formular, in der Seite (gewählt)** |
|---|---|---|---|
| Fühlt sich an wie | Word, aber Boxen, Listen und Tabellen müssten wir selbst nachbauen | Text „schwebt“ über der Seite, Folgeblöcke rutschen nicht mit | Echtes Schreiben auf der Seite, der Rest rutscht natürlich mit |
| Regeln für Boxen, Inseln, Rundreise | Müssten ein zweites Mal gebaut werden | Vorhanden | **Identisch zum Formular, weil derselbe Code** |
| Testbar ohne Browser-Lauf | Nein (der Test-Ersatz kennt die Browser-Schreibbefehle nicht) | Ja | **Ja** (Motor wird wie das Formular getestet) |
| Bedienung auf Laptop/Handy | Je Browser anders (Safari/iPad bekannt heikel) | Positionen müssen bei jedem Scrollen nachgeführt werden | Alles an einem Ort, Leiste klebt am Text |
| Kürzel („- “, „1. “, ⌘B …) | Selbst bauen | Vorhanden | **Vorhanden** |

**Warum C:** Da wir keinen Browser-Lauf durch Claude machen (siehe Memory „Kein Dev-Server“), ist ein bereits getesteter Motor der sicherste Weg. Außerdem gilt: Was direkt in der Seite getippt wird und was im Formular steht, folgt zwingend denselben Regeln – das Kriterium „sieht im Formular und im HTML-Schalter identisch aus“ ist damit eingebaut, nicht erkämpft.
**Preis:** Der Motor muss einmal als kleines eigenes Programm gebündelt werden, das in der abgeschotteten Seite läuft. Es wird **erst beim ersten Schreiben nachgeladen**, nicht bei jedem Öffnen der Vorschau.

### Entscheidung 2: „Schreib-Fassung“ statt umgebauter Seite
Beim Schreibstart tauscht die Seite den Lehrtext-Block gegen die **gespeicherte Fassung** des Textes (die die App mitschickt) aus und zeigt sie in einem **Schreib-Design**, das den Boxen und Überschriften der fertigen Seite nachempfunden ist (Farben und Titelzeilen wie im Papier-Design des Formulars). Nach dem Schreiben baut der Kern die Seite neu, und der Block sieht wieder aus wie fertig gestaltet.
- Der Block darf beim Wechsel **leicht anders aussehen** (Stil nachgebaut, nicht vom Kern gerechnet). Das ist die Ehrlichkeitsgrenze der Spec („gleiche Schrift, Boxen, Abstände“ = ähnlich genug, nicht pixelgleich). Im Browser-Test prüfen wir, dass kein Sprung stört.
- Die Cursor-Stelle bestimmt die Seite aus dem Klickpunkt im neuen Layout (Wort-genau reicht).
- **Kein Kern-Umbau nötig.** Kein Kern-Deploy.

### Entscheidung 3: Zwei Schreib-Arten
```
Schreibmodus
+-- Einfach (immer eingebaut, winzig): Themen-Überschrift, Deckblatt-Titel/-Untertitel, Bildunterschrift
|     reiner Text, eine Zeile, Enter = fertig, Einfügen immer als reiner Text, keine Formatleiste
+-- Lehrtext (Tiptap, wird beim ersten Mal nachgeladen)
      Formatleiste, Boxen, Listen, Link, Tabelle einfügen, geschützte Inseln
```
Aufgabentexte, Lösungen, Feedback und Distraktoren bleiben im Formular (E2). Ein Klick darauf wählt nur aus, wie bisher.

### Entscheidung 4: Geschützte Inseln gehen nie verloren
Alles, was der Motor nicht sicher bearbeiten kann (Tabellen mit Stil, eigenes CSS aus der KI, fremde `div`s, Bilder), ist im Schreibmodus **sichtbar, aber gesperrt**, mit dem Hinweis „In der Schublade bearbeiten“. **Die App behält das Original jeder Insel bei sich** und setzt es nach dem Schreiben an der alten Stelle wieder ein. Was die Seite für eine Insel zurückschickt, wird nicht gelesen. Selbst ein Fehler im Schreibwerk kann so keine Insel verändern.
Besteht ein Block die Rundreise-Prüfung insgesamt nicht (wie heute im Formular), öffnet der Schreibmodus gar nicht, sondern bietet „In der Schublade bearbeiten (HTML)“ an.

### Entscheidung 5: Kein Neubau beim Tippen, Zwischenstände bleiben still
- Solange man schreibt, **baut die App die Vorschau nicht neu** (auch nicht bei Autosave). Der Cursor springt nie. Ein Neubau, der in der Zeit fällig würde, läuft direkt nach dem Verlassen.
- Die Seite meldet **nicht jede Taste**, sondern einen **Zwischenstand nach kurzer Pause** (etwa 2 Sekunden Ruhe). Die App nimmt ihn in den Entwurf auf (Autosave bleibt damit wirksam, ein Absturz verliert höchstens ein paar Sekunden), **ohne** einen eigenen Rückgängig-Schritt und ohne Neubau.
- Beim Verlassen (Esc, Klick daneben, „Fertig“) kommt der Endstand. Die App macht daraus **einen** Eintrag im Editor-Verlauf. Der Verlauf kann das schon: Einträge mit gleicher Gruppe werden zusammengefasst.
- Während des Schreibens gilt ⌘/Strg + Z **im Text**, danach im Editor-Verlauf.

### Entscheidung 6: Sicherheit – die App reinigt, nie die Seite
Die Seite schickt nur einen Wunsch („Block k0-e3 hat neuen Text“, mit Größenlimit). Die App prüft wie bei jedem Wunsch (`liesWunsch`: eigener Rahmen, gültige Marke, Block existiert, Vorschau aktuell, nicht schreibgeschützt) und lässt den Text dann **durch dieselbe Reinigung wie im Formular** laufen: Einfüge-Reinigung, Motor-Schema, Aufräumen, Entfernen von Skripten und Ereignis-Attributen, Link-Prüfung (nur Web und Mail). Erst dann wird der Text gespeichert. Der abgeschottete Rahmen bleibt wie er ist (`sandbox="allow-scripts"`).
Eingefügter Text aus Word, Google Docs oder Webseiten läuft dabei durch dieselbe Einfüge-Reinigung wie im Formular (nur Fett, Kursiv, Listen, Links, Überschriften, einfache Tabellen).

### A) Aufbau (was die Lehrkraft sieht)
```
Vorschau (bestehend, Modus Bearbeiten)
+-- Gewählter Lehrtext (Rahmen + Block-Leiste, bestehend)
|   +-- Klick auf bereits gewählten Text / Doppelklick / Enter / Tippen auf Handy → Schreibmodus
+-- Schreibmodus (NEU)
|   +-- Text in Schreib-Design, dezenter grüner Rahmen, Rechtschreibprüfung Deutsch
|   +-- Block-Leiste wechselt auf Formatleiste:
|   |     Fett · Kursiv · Überschrift (2 Stufen) · Liste · Nummerierung · Link · Box ▾ · Tabelle · Fertig
|   +-- Mit Cursor in einer Box: Box-Art ändern · Neue Box darunter · Box auflösen · Box löschen
|   +-- Markierter Text: kleine Leiste direkt darüber (Fett · Kursiv · Link · In Box setzen)
|   +-- Geschützte Inseln: gesperrt, Hinweis „In der Schublade bearbeiten“ (klickbar → Schublade)
|   +-- „/“ am Zeilenanfang: Block-Katalog, gewählter Block kommt hinter den Absatz (Text wird geteilt)
|   +-- Enter in leerer letzter Zeile: Text endet, „+ Block“ darunter wird angeboten
|   +-- Handy: Leiste fest über der Bildschirmtastatur (Fett · Liste · Box · Fertig)
+-- Themen-Überschrift / Deckblatt / Bildunterschrift: Einfach-Modus, Rahmen, Enter oder Esc beendet
+-- Formular-Schublade (bestehend): HTML-Schalter bleibt als Profi-Weg
```

### B) Daten
- **Keine neuen gespeicherten Daten**, keine Datenbank-Änderung, kein neues YAML-Format, keine neue API, keine neue Freigabe im Proxy. Der Lehrtext liegt weiter so im Entwurf wie heute (`content` als HTML-Text).
- **Neue Nachrichten** (Text, streng geprüft wie die bisherigen):
  - App → Seite: *Schreibstart* (Marke, gespeicherte Fassung mit Platzhalter-Nummern für Inseln, Klickpunkt, schreibgeschützt ja/nein), *Schreibende erzwingen* (z. B. wenn der Nutzer in der Gliederung etwas anderes wählt).
  - Seite → App: *Zwischenstand* und *Endstand* (Marke + Text), *Abbruch*, *Block hinter Absatz n einfügen* (für „/“), *Insel bearbeiten wünschen*.
- Die Nachrichtenliste in `vorschau-nachrichten.ts` bekommt diese Fälle samt Längen- und Typ-Prüfung. Alles andere wird verworfen.

### C) Technische Entscheidungen (begründet)
| Entscheidung | Warum |
|---|---|
| Derselbe Motor im Rahmen (C) | Gleiche Regeln wie das Formular, bereits getestet, Kürzel gratis, ohne Browser-Lauf absicherbar |
| Schreib-Fassung aus der gespeicherten Quelle | Die fertige Seite ist vom Kern umgebaut, ein Rückweg wäre verlustbehaftet |
| Inseln: Original bleibt in der App | Verlust praktisch ausgeschlossen, auch bei Fehlern im Schreibwerk |
| Nachladen beim ersten Schreiben | Vorschau öffnet nicht langsamer für Lehrkräfte, die nur Aufgaben bearbeiten |
| Zwischenstand nach Pause, kein Neubau | Cursor springt nie, Autosave schützt, Verlauf bleibt ein Schritt |
| Reinigung nur in der App | Der Rahmen bleibt abgeschottet; Seite ist nicht vertrauenswürdig |
| Formatleiste in der Seite, nicht in der App | Sitzt am Text und über der Handy-Tastatur (Grundsatz PROJ-101); Befehle laufen ohne Nachrichtenumweg |
| Leiste: eigenes Stylesheet im Skript, 44 px bei Touch, Kontrast ≥ 4,5 : 1 | Wie bei der bestehenden Block-Leiste; derselbe Kontrast-Test |

### D) Was neu gebaut wird, was bleibt
- **Neu:** Schreibwerk (Text-Motor + Formatleiste + Schreib-Design) als nachladbares Programm für die Vorschau; „Einfach“-Schreiber im Hilfsskript; neue Nachrichten und deren Prüfung; Zwischenstand-Annahme und Neubau-Pause in `baukasten-editor.tsx`/`editor-vorschau.tsx`; Aufteilen eines Lehrtexts bei „/“ (nach Absatz-Nummer, in der App gerechnet); Schreib-Design als gemeinsame Farbliste neben dem Papier-Design des Formulars.
- **Wiederverwendet:** `textErweiterungen`, Rundreise-Prüfung, Einfüge-Reinigung und Aufräumen aus `werkzeugkiste-text.ts`, Block-Menü-Funktionen aus PROJ-98, Verlauf mit Gruppen, `AdminSegmented` nicht nötig.
- **Unverändert:** Kern (kein Deploy), Datenbank, APIs, Proxy-Listen, Formular und HTML-Schalter in der Schublade, Aufgaben.

### E) Abhängigkeiten (Pakete)
- **Keine neuen Laufzeit-Pakete.** Tiptap ist schon da.
- Zum Bündeln des Schreibwerks wird ein Bündelwerkzeug gebraucht (es liegt über die Test-Werkzeuge vermutlich schon im Projekt; im Bau prüfen, sonst ein kleines Entwicklungs-Paket). Das Ergebnis wird beim Bauen erzeugt und als statische Datei ausgeliefert. Ein Test begrenzt seine Größe.

### F) Tests
- Motor/Reinigung: Rundreise mit Lehrtext-Beispielen (Boxen, Listen, Tabellen, Inseln, KI-Text mit Inline-CSS), „bearbeitet und gespeichert = im Formular identisch“, Insel bleibt byte-gleich, Einfüge-Reinigung (Word-Müll, Skripte, `javascript:`).
- Nachrichten: zu lange Texte, falsche Marke, fremder Absender, schreibgeschützt, Vorschau veraltet → verworfen.
- Zusammenspiel: Autosave während des Schreibens baut nicht neu; Neubau läuft nach dem Verlassen; ein Verlaufseintrag pro Schreibvorgang; ⌘Z im und nach dem Text.
- Kontrast-Test für die Formatleiste; Größen-Test fürs Schreibwerk.
- **Browser-Test (Nutzer, manuell):** Laptop, iPad quer, Handy – Cursor an Klickstelle, kein Sprung beim Wechsel, Tastatur/Leiste am Handy, Einfügen aus Word, Rechtschreibprüfung.

### G) Risiken und offene Punkte
- **Aussehen beim Wechsel:** Schreib-Design ist ein Nachbau. Gegenmaßnahme: dieselben Farben wie Papier-Design und Kern, Vergleich im Browser-Test.
- **Bündeln und Nachladen in die abgeschottete Seite** ist neu im Projekt. Gegenmaßnahme: **Durchstich zuerst** (Absatz tippen, Fett/Kursiv, Esc, Neubau), dann Boxen, Listen, Tabelle, Handy. Scheitert der Durchstich (Laden/Größe), ist Plan B der Motor als Schicht über dem Rahmen (Spalte B), mit Nachführen der Lage.
- **Bilder im Einfügen:** Der Weg „eingefügtes Bild wird eigener Bild-Block“ hängt an PROJ-104 (noch Planned). Bis dahin wird ein eingefügtes Bild nicht übernommen, mit kurzem Hinweis „Bild bitte als Bild-Block einfügen“. Zu klären bei `/frontend`.
- **Texte im Einfach-Modus** enthalten keine Formatierung; Zeichen wie `<` und `&` bleiben Text (die App maskiert wie der Kern).
- **Modellwahl:** Bau mit Sonnet möglich; für den Durchstich (Nachladen in den Rahmen) lohnt Opus, danach wieder Sonnet.

## Umsetzung (Frontend, 2026-11-16, Sonnet)
**Gebaut nach dem Tech Design (Entscheidungen 1–6), ohne Kern-, Datenbank-, API- oder Paket-Änderung.** Kern bleibt unverändert, also kein Kern-Deploy.

| Datei | Inhalt |
|---|---|
| `schreibwerk/eintritt.ts` (neu) | Das Schreibwerk für Lehrtext: derselbe Tiptap-Motor wie im Formular (`textErweiterungen`), Formatleiste (Fett, Kursiv, H2, H3, Liste, Nummerierung, Link mit eigenem Eingabefeld, Box wählen/ändern, Box darunter/auflösen/löschen, Fertig), Zwischenstand nach 2 s Pause, Endstand bei Fertig/Esc, Handy-Leiste über der Tastatur (`visualViewport`), Einfügen mit Einfüge-Reinigung (Bilder werden entfernt, Hinweis), geschützte Inseln |
| `schreibwerk/schreib-design.ts` (neu) | Schreib-Design (Farben wie Papier-Design und Kern) und Formatleisten-Stylesheet, `SCHREIB_FARBEN` mit Kontrast-Test |
| `schreibwerk/schreibwerk-bundle.generated.ts` (erzeugt) | Gebündeltes Schreibwerk (~328 KB, ein Test begrenzt auf 700 KB). Bauen mit `npm run schreibwerk:bauen` (`scripts/werkzeugkiste/schreibwerk-bauen.mjs`, nutzt das schon vorhandene Vite). Ein Test prüft, dass der Stand zu den Quellen passt |
| `schreiben.ts` (neu) | App-Seite: welcher Teil sich direkt bearbeiten lässt, lesen/setzen in der Struktur, Rundreise-Prüfung, **Reinigung** der Seiten-Antwort, **Insel-Prüfung** (jede Insel im Ergebnis muss eine des Originals sein, sonst wird nichts übernommen) |
| `vorschau-nachrichten.ts` | Neue Wünsche `schreibe`, `schreibZwischen`, `schreibEnde`, `schreibAbbruch` (Marke, Teil aus fester Liste, Textlänge ≤ 200 000) |
| `vorschau-skript.ts` | Auslöser (Doppelklick, oder Klick auf den schon gewählten Text), Einfach-Schreiber (Themen-Überschrift, Deckblatt-Titel/-Untertitel, Bildunterschrift: reiner Text, Enter/Esc beendet, Einfügen nur als Text), Nachladen des Schreibwerks, Schreibzone vom Einfrieren und von den Tasten-Kürzeln ausgenommen, Klick außerhalb beendet das Schreiben |
| `editor-vorschau.tsx` | Schickt Schreibwerk und Start (`wkSchreibStart`), Befehle `beende`/`vorbei`, meldet neue Seiten |
| `baukasten-editor.tsx` | Sitzung, Annahme von Zwischen-/Endstand, Reinigung, ein Verlaufseintrag je Sitzung, Beenden bei anderer Auswahl/Formular/Dialog/Ausprobieren, Hinweis bei nicht direkt bearbeitbarem Text |
| `use-editor-zustand.ts` | `aendere(…, gruppe, ohneZeitgrenze)` (eine Sitzung = ein Schritt) und `useEditorVorschau(…, pausiert)`: **kein Neubau beim Schreiben**, danach nur bei geändertem Stand |

**Verhalten gegenüber der Spec**
- Doppelklick auf Lehrtext, Themen-Überschrift, Deckblatt-Titel/-Untertitel und Bildunterschrift schreibt direkt (vorher: Formular). „Bearbeiten“ in der Leiste, Enter und die Gliederung öffnen weiter das Formular.
- Lässt sich ein Lehrtext nicht verlustfrei bearbeiten (Rundreise-Prüfung), öffnet stattdessen die Schublade mit Hinweis auf die HTML-Ansicht.
- Kommt der Endstand ohne echte Änderung zurück, wird nichts gespeichert und die gebaute Fassung kommt zurück (`wkSchreibVorbei`).

**Noch nicht umgesetzt (offen für Folgearbeit, bewusst nicht im ersten Wurf)**
- Kleine Leiste direkt über markiertem Text („In Box setzen“).
- „/“ am Zeilenanfang (Katalog, Lehrtext teilen) und „Enter in leerer letzter Zeile → + Block darunter“.
- Tabelle einfügen (Tiptap-Tabellen sind nicht installiert; bestehende Tabellen bleiben als geschützte Inseln erhalten).
- Eingefügte Bilder werden entfernt (mit Hinweis), solange PROJ-104 fehlt.
- Link anklicken/bearbeiten außer über die Leiste.

**Tests:** 267 Editor-Tests grün (neu: `schreiben.test.ts` 14, `schreibwerk.test.ts` 13, `schreiben-skript.test.ts` 12, 7 Integrationstests „Direkt in der Seite schreiben“). Gesamtlauf 3592 grün, 1 rot in `werkzeugkiste-auszug.test.ts` (Regal-Kopie, nicht angefasst). `tsc` sauber.
**Browser-Test (offen, vom Nutzer):** Laptop, iPad quer, Handy: Cursor an der Klickstelle, kein Sprung beim Wechsel gebaute ↔ Schreib-Fassung, Formatleiste und Bildschirmtastatur, Einfügen aus Word, Rechtschreibprüfung, Rückgängig im Text und danach, Boxen im Schreib-Design gegen die fertige Seite vergleichen.

## QA Test Results

**Geprüft:** 2026-11-16 (QA, Sonnet 5.5) – **Code-Review + automatische Tests, kein Browser-Lauf** (Regel „Kein Dev-Server“: `npm run dev`/Playwright stürzen den MacBook ab). Alle Aussagen zur Oberfläche sind deshalb aus dem Code und den Tests abgeleitet, **nicht im Browser gesehen**.

### Automatische Tests
- `tsc --noEmit`: sauber.
- `eslint` auf den geänderten Dateien: 0 Fehler, 2 Warnungen, beide Altbestand (`baukasten-editor.tsx:137`, `:1053`), nicht aus PROJ-103.
- Vitest `src/components/werkzeugkiste/editor`: **18 Dateien, 274 Tests grün** (inkl. `schreiben`, `schreibwerk`, `schreiben-skript`, Integration „Direkt in der Seite schreiben“; Bündel-Stand und Größengrenze werden mitgeprüft).
- Gesamtlauf nicht neu gemacht; der Entwickler meldet 1 roten Test in `werkzeugkiste-auszug.test.ts` (Regal-Kopie, nicht aus PROJ-103). **Vor dem Deploy prüfen, dass er auch auf `main` rot ist.**
- Playwright-E2E: nicht geschrieben (siehe oben). Die Browser-Abnahme bleibt beim Nutzer.

### Acceptance Criteria
| Kriterium | Ergebnis |
|---|---|
| Schreibmodus per Doppelklick / Klick auf gewählten Text | Code ✅, Browser offen |
| Überschrift, Deckblatt, Bildunterschrift als Einfach-Schreiber | Code ✅ (`einfachText`, Enter/Esc), Browser offen |
| Schreib-Design wie fertige Seite, dezenter Rahmen | Nachbau, Aussehen nur im Browser prüfbar |
| Esc / Klick außerhalb übernimmt, Autosave + Neubau | Code ✅ (Neubau pausiert, danach nur bei geändertem Stand) |
| Rückgängig: ⌘Z im Text, danach ein Verlaufsschritt | Code ✅ (Gruppe `schreib-<nr>`, ohne Zeitgrenze), ⌘Z im Text nur im Browser prüfbar |
| Formatleiste (Fett, Kursiv, H2/H3, Listen, Link, Box) | Code ✅, **Tabelle einfügen fehlt** |
| Leiste über markiertem Text („In Box setzen“) | ❌ nicht umgesetzt (laut Umsetzungsnotiz) |
| Cursor in Box: Art ändern, darunter, auflösen, löschen | Code ✅, Browser offen |
| Kürzel ⌘B/I/K, „- “/„1. “ | Motor-Kürzel ✅; „/“-Katalog ❌, „Enter in leerer letzter Zeile → + Block“ ❌ |
| Einfügen: Word-Müll entfernt | Code ✅ (Einfüge-Reinigung), Browser offen |
| Eingefügte Bilder → eigener Bild-Block | ❌ (Bilder werden entfernt, Hinweis; hängt an PROJ-104, im Tech Design so vorgesehen) |
| Gespeichert im bisherigen Format, identisch im Formular/HTML-Schalter | Code ✅ (Rundreise-Prüfung, Test) |
| Bereinigung wie heute | ⚠️ teilweise, siehe BUG-1/2 |
| Geschützte Inseln gesperrt und erhalten | Code ✅ (Insel-Prüfung im Ergebnis), Hinweis „In der Schublade bearbeiten“ nur im Browser prüfbar |
| Handy: Leiste über Tastatur (Fett, Liste, Box, Fertig) | Code ✅ (`visualViewport`), Browser/iPad offen |

**Zusammenfassung:** 8 Kriterien im Code erfüllt und getestet, 5 nicht umgesetzt (Markierungsleiste, „/“, Enter-leer, Tabelle einfügen, Bild-Block beim Einfügen – alle bewusst zurückgestellt und in der Umsetzungsnotiz benannt), der Rest braucht den Browser-Test.

### Edge Cases
- Unbekanntes HTML bleibt als Insel erhalten ✅ (Test). Direkt nicht bearbeitbarer Text öffnet die Schublade mit Hinweis ✅.
- Text geleert: bleibt leerer Lehrtext (`||undefined` nur bei Titel/Caption, Lehrtext bleibt `''`) ✅.
- Kein Neubau beim Tippen ✅ (`pausiert`).
- Schreibgeschützt: kein Schreibstart (`z.gesperrt`) ✅; Zwischenstände werden bei gesperrt nicht gespeichert ✅.
- Sehr langer Text / Tippgeschwindigkeit, Rechtschreibprüfung, geschützte/doppelte Leerzeichen: nur im Browser prüfbar, offen.

### Sicherheits-Audit (Red Team)
- ✅ Absender der Nachrichten wird geprüft (`e.source === rahmen.contentWindow`), Marke und Teil aus fester Liste, Größenlimit 200 000 Zeichen, Sitzung nur mit passender Marke.
- ✅ Insel-Prüfung: Jede Insel im Ergebnis muss eine des Originals sein, sonst wird nichts übernommen.
- ✅ Rahmen bleibt `sandbox="allow-scripts"` ohne `allow-same-origin`; keine neue API, kein neues Datenformat, keine Proxy-Änderung.
- ⚠️ Siehe BUG-1 und BUG-2 (Reinigung in der App ist schwächer als versprochen).
- Nicht prüfbar ohne Browser: tatsächliches Verhalten des Einfügens aus Word/Google Docs.

### Bugs
| ID | Schwere | Befund | Wo |
|---|---|---|---|
| BUG-1 | Low | **Reinigung wird übersprungen, wenn der Originaltext schon aktiven Inhalt hat.** `hatAktivenInhalt(html) && !hatAktivenInhalt(original)` → Enthält der Lehrtext z. B. schon einen `onclick` (KI-Text), geht ein neu hinzugefügtes `<script>` oder `javascript:`-Link ungereinigt durch. Der Kern entfernt beim Bauen ebenfalls, deshalb nur Low. Schritte: Lehrtext mit `onclick` anlegen, Seite sendet Endstand mit zusätzlichem `<script>` → wird übernommen. Fix: immer `entschaerfen`, außer das Stück ist identisch mit dem Original. | `schreiben.ts:124` |
| BUG-2 | Medium | **Die App normalisiert die Antwort der Seite nicht über das Motor-Schema/Aufräumen.** Das Tech Design (Entscheidung 6) verspricht „Einfüge-Reinigung, Motor-Schema, Aufräumen, Link-Prüfung (nur Web und Mail)“; umgesetzt ist nur `entschaerfen` plus Insel-Prüfung. Eine kompromittierte Seite (z. B. durch KI-Text mit Skript im Rahmen) kann beliebiges HTML, `data:`-/`file:`-Links oder fremde Tags in den Entwurf schreiben. Fix: Ergebnis in der App durch `textErweiterungen` parsen und `aufraeumen(alsHtml(…))` neu serialisieren; Links nur `http(s)`/`mailto`. | `schreiben.ts:121-133` |
| BUG-3 | Medium | **Stiller Textverlust, wenn die Insel-Prüfung fehlschlägt.** `beiSchreiben` ruft dann `beendeSitzung(true)` und zeigt nur einen Fehler-Toast; die Seite wird auf die gebaute Fassung zurückgesetzt und der getippte Text seit dem letzten Zwischenstand ist weg. Fix: Sitzung offen lassen oder den abgelehnten Text anbieten (kopieren). | `baukasten-editor.tsx` `beiSchreiben` |
| BUG-4 | Low (Verdacht, nicht belegt) | **Ort der Sitzung ist fest (`sit.ort`).** Ändert sich die Struktur während des Schreibens von außen (z. B. Rückgängig-Tasten in der App, Hintergrund-Konflikt/Neuladen), schreibt der Endstand in den Block mit demselben Index, nicht in den ursprünglichen. Der Effekt, der die Sitzung beendet, beobachtet nur Modus, Marke, Schublade und Dialog, nicht die Struktur. Im Browser nachstellen. | `baukasten-editor.tsx` Effekt „Lage ändert sich“ |
| BUG-5 | Medium | **5 Akzeptanzkriterien nicht umgesetzt** (siehe Tabelle). Ist in der Umsetzungsnotiz offen benannt; Entscheidung des Nutzers nötig, ob das für „Deployed“ reicht oder in eine Folge-Spec (z. B. PROJ-111) gehört. | – |

### Regression
Editor-Tests (PROJ-89 bis 102) laufen grün mit. Browser-Regression von Auswahl, Ziehen, Kopieren, Löschen (PROJ-101/102) mit dem neuen Doppelklick-Auslöser (vorher: Formular) ist **offen**; besonders prüfen: Doppelklick auf nicht gewählten Block, Enter öffnet weiter das Formular.

### Entscheidung
**Keine Critical/High-Bugs im Code. NICHT freigegeben (Status bleibt „In Review“)**, bis (1) BUG-2/BUG-3 behoben oder bewusst akzeptiert sind und (2) der Browser-Test des Nutzers (Laptop, iPad quer, Handy) durch ist. Die Browser-Punkte stehen oben in der Umsetzungsnotiz.

## Deployment
_To be added by /deploy_
