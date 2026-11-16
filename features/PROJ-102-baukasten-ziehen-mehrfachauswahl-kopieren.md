# PROJ-102: Baukasten – Ziehen in der Vorschau, Mehrfachauswahl, Kopieren & Einfügen

## Status: Deployed
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Blöcke lassen sich direkt in der Seite an eine andere Stelle ziehen, auch in ein anderes Thema. Mehrere Blöcke (zum Beispiel alle Bilder) lassen sich auswählen und gemeinsam verschieben, kopieren oder löschen, und mit ⌘/Strg + C/V auch in ein anderes Material übertragen.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1:** Ziehen direkt in der Vorschau, auch über Themengrenzen.
- **E2:** Mehrfachauswahl mit gemeinsamem Verschieben, Kopieren und Löschen.
- **E3:** Kopieren & Einfügen per Tastenkürzel, auch zwischen zwei Materialien.
- **E4:** Am Handy: Verschieben ja (über „Nach oben/unten“ und „Verschieben nach …“), Mehrfachauswahl nein.

## Dependencies
- Requires: PROJ-101 (Auswahl, Block-Leiste mit Ziehgriff, Modus Bearbeiten)
- Berührt: PROJ-89 (Ziehen in der Gliederung, Rückgängig), PROJ-108 (Übernehmen aus anderen Materialien nutzt dieselbe Einfüge-Logik)

## User Stories
- Als **Lehrkraft** möchte ich einen Block in der Seite anfassen und dorthin ziehen, wo er hingehört, damit ich nicht in der Gliederung suchen muss.
- Als **Lehrkraft** möchte ich alle Bilder eines Themas auf einmal auswählen und weiter nach oben schieben.
- Als **Lehrkraft** möchte ich mehrere Blöcke kopieren und in ein anderes meiner Materialien einfügen, damit ich Gutes wiederverwende.
- Als **Lehrkraft** möchte ich mehrere veraltete Blöcke auf einmal löschen und das bei Bedarf in einem Schritt rückgängig machen.
- Als **Lehrkraft am Handy** möchte ich einen Block in ein anderes Thema verschieben, ohne fummelig ziehen zu müssen.

## Acceptance Criteria

### Ziehen in der Vorschau
- [ ] Am Ziehgriff der Block-Leiste lässt sich der ausgewählte Block mit der Maus ziehen. Während des Ziehens zeigt eine farbige Linie die Einfügestelle, der Block selbst ist halbtransparent.
- [ ] Ziehen bis an den oberen oder unteren Rand der Vorschau scrollt die Seite automatisch.
- [ ] Ablegen ist zwischen zwei Blöcken, am Anfang und am Ende jedes Themas und in leeren Themen möglich, nicht im Deckblatt und nicht innerhalb eines anderen Blocks. Ausnahme: Bild-Galerie (PROJ-105).
- [ ] Themen lassen sich an ihrer Überschrift ziehen. Sie können nur zwischen anderen Themen abgelegt werden (vor der Lernzielkontrolle).
- [ ] Esc während des Ziehens bricht ab, nichts ändert sich.
- [ ] Nach dem Ablegen ist der Block weiter ausgewählt und sichtbar. Ein Schritt Rückgängig stellt die alte Stelle wieder her.
- [ ] Tastatur: Mit ausgewähltem Block verschiebt ⌥/Alt + Pfeil hoch/runter ihn um eine Stelle, auch über Themengrenzen hinweg.

### Verschieben nach … (alle Geräte)
- [ ] Im „⋯“-Menü steht „Verschieben nach …“. Es öffnet eine Liste aller Themen. Die Wahl setzt den Block (oder die Auswahl) ans Ende des gewählten Themas.
- [ ] Am Handy ist das der Weg zum Verschieben. Dazu kommen „Nach oben“ und „Nach unten“ in der festen Leiste.

### Mehrfachauswahl (Laptop/Tablet)
- [ ] ⌘/Strg + Klick fügt einen Block zur Auswahl hinzu oder entfernt ihn. Umschalt + Klick wählt alle Blöcke zwischen dem zuletzt gewählten und dem angeklickten aus, auch über Themengrenzen.
- [ ] In der Gliederung funktioniert dieselbe Auswahl (Kontrollkästchen erscheinen beim Darüberfahren).
- [ ] Ist mehr als ein Block ausgewählt, zeigt die Leiste „N Blöcke ausgewählt“ mit: Verschieben nach …, Duplizieren, Kopieren, Löschen, Auswahl aufheben.
- [ ] „Alle gleichen auswählen“ im „⋯“-Menü eines Blocks wählt alle Blöcke dieses Typs aus (zum Beispiel alle Bilder), wahlweise im Thema oder auf der ganzen Seite.
- [ ] Ziehen eines Blocks aus der Mehrfachauswahl verschiebt alle gewählten Blöcke zusammen. Sie werden in ihrer bisherigen Reihenfolge an der Einfügestelle abgelegt.
- [ ] Löschen mehrerer Blöcke ist **ein** Schritt für Rückgängig. Ab 5 Blöcken fragt ein `AlertDialog` „N Blöcke löschen?“.
- [ ] Themen können nicht mit Blöcken gemischt ausgewählt werden.

### Kopieren & Einfügen
- [ ] ⌘/Strg + C kopiert die ausgewählten Blöcke, ⌘/Strg + X schneidet aus, ⌘/Strg + V fügt hinter dem ausgewählten Block ein (ohne Auswahl am Ende des sichtbaren Themas). Dieselben Aktionen stehen im „⋯“-Menü.
- [ ] Ein kurzer Hinweis bestätigt: „3 Blöcke kopiert“ bzw. „3 Blöcke eingefügt“.
- [ ] Kopieren und Einfügen funktioniert zwischen zwei Materialien desselben Kontos, auch in einem anderen Browser-Tab und nach einem Neuladen.
- [ ] Bilder kommen beim Einfügen in ein anderes Material mit. Das Ziel-Material bekommt eine eigene Kopie, und die 8-MB-Grenze wird vor dem Einfügen geprüft.
- [ ] Ein Block, den das Ziel nicht kennt (anderes Werkzeug, anderer Typ-Umfang), wird nicht eingefügt. Hinweis: „1 Block passt nicht in dieses Material und wurde ausgelassen.“
- [ ] Eingefügte Blöcke sind danach ausgewählt.
- [ ] Ein Einfügen ist ein Schritt für Rückgängig.

### Allgemein
- [ ] Schreibgeschützt: Kopieren geht, Ziehen, Ausschneiden, Einfügen und Löschen nicht.
- [ ] Jede Änderung löst Autosave und Neubau der Vorschau aus wie heute. Mehrere Verschiebungen kurz nacheinander bauen die Vorschau nur einmal neu.

## Edge Cases
- **Ziehen während die Vorschau neu baut:** Ziehen startet erst, wenn die Vorschau aktuell ist. Bis dahin zeigt der Griff „Wird aktualisiert …“.
- **Letzter Block eines Themas wird verschoben:** Das Thema bleibt leer stehen und zeigt den Leerzustand (PROJ-101). Es wird nicht automatisch gelöscht.
- **Einfügen ins selbe Material:** Es entstehen Kopien mit neuen Kennungen. Der Text bleibt gleich, ohne „(Kopie)“.
- **Zwischenablage enthält etwas anderes** (normaler Text): ⌘/Strg + V im Modus Bearbeiten ohne Textfeld fügt einen Lehrtext-Block mit diesem Text ein (Formatierung bereinigt).
- **Kopiert aus einem Material, das inzwischen gelöscht ist:** Einfügen geht trotzdem, sofern die Bilder noch erreichbar sind. Sonst kommt der Block ohne Bild und mit Hinweis.
- **Sehr viele Blöcke** (zum Beispiel 50 ausgewählt): Verschieben und Löschen bleiben flüssig. Die Vorschau baut einmal neu.
- **Lernzielkontrolle:** Sie ist nicht verschiebbar und nicht kopierbar.

## Nicht Teil dieses Features
- Übernehmen aus dem Regal oder aus fremden Materialien mit Auswahl-Dialog (PROJ-108).
- Ziehen von Dateien von außen (PROJ-104).

## Technical Requirements
- Sicherheit: Eingefügte Inhalte laufen durch dieselbe Prüfung wie Formular-Eingaben (Bereinigung, Prüfstelle). Bilder werden nur aus Materialien des eigenen Kontos kopiert.
- Performance: Ablegen fühlt sich sofort an (unter 100 ms bis zur Rückmeldung). Der Neubau der Vorschau läuft danach.

## Offene Punkte für `/architecture`
- Ziehen im iframe vs. App-Schicht. Wie arbeiten `@dnd-kit` (schon im Projekt) und die Vorschau zusammen?
- Wo liegt die „Zwischenablage“ für materialübergreifendes Kopieren (System-Zwischenablage, Browser-Speicher oder Server)?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Erstellt:** 2026-11-16 (Sonnet). Baut auf dem Grundsatz G1 aus PROJ-101 auf: *Die Seite zeigt und meldet, die App entscheidet und speichert.*

### Ausgangslage (Bestand)
- Die Vorschau ist eine abgeschottete Seite mit Hilfsskript (PROJ-101). Sie kennt jeden Block über seine Sprungmarke und meldet Wünsche an die App. Die App prüft sie streng (`liesWunsch`) und ändert die Struktur samt Rückgängig und Autosave.
- Die Gliederung kann schon Blöcke per Ziehen sortieren (`@dnd-kit`). Verschieben, Duplizieren und Löschen gibt es als fertige Bausteine im Editor-Zustand. Alles läuft heute für **einen** Block.
- Bilder liegen pro Material: hochgeladene als `eigen_…` im Ordner des Materials, die übrigen im Bilder-Paket der Einlesung. Ein Bild-Block verweist nur per Name darauf.
- Der Entwurf ist begrenzt (2,4 Mio. Zeichen), hochgeladene Bilder auf 8 MB je Material.

### Antworten auf die offenen Punkte
**1. Ziehen: in der Seite, nicht mit `@dnd-kit`.**
`@dnd-kit` arbeitet nur im selben Dokument. Die Vorschau ist ein abgeschotteter Rahmen, dort funktioniert es nicht. Also gilt wie bei der Leiste: Das Hilfsskript in der Seite übernimmt das Ziehen (es kennt Lage, Scrollen und Größe der Blöcke). Es meldet am Ende nur **einen Wunsch**: „Diese Blöcke vor/hinter Marke X ablegen“. `@dnd-kit` bleibt für die Gliederung.
- Ziehen beginnt nur am Ziehgriff der Block-Leiste (kommt neu dazu, Platz ist seit PROJ-101 frei). So kollidiert es nie mit Aufgaben oder dem Textmarkieren.
- Beim Ziehen zeigt das Skript Einfügelinie, halbtransparenten Block und scrollt am Rand automatisch. Gültige Ablageorte berechnet das Skript, die App **prüft sie nochmals**.
- Mit der Maus nur ein Wunsch am Ende (nicht bei jeder Mausbewegung). Dadurch bleibt es flüssig.

**2. Zwischenablage: der Browser des Nutzers, nicht der Server.**

| Weg | Urteil |
|---|---|
| System-Zwischenablage | Nimmt keine Bilder-Verweise mit, Browser fragen oft nach Erlaubnis, in der Vorschau-Seite gesperrt. Nur als Zusatz für „normalen Text einfügen“. |
| Server (eigene Ablage) | Braucht neue Datenbank, Aufräumen, Datenschutz-Überlegung. Zu schwer für den Nutzen. |
| **Browser-Speicher (gewählt)** | Hält Blöcke zwischen Tabs und nach dem Neuladen, ohne neue Datenbank. Gehört nur diesem Browser. |

Die Zwischenablage speichert die kopierten Blöcke, **aus welchem Material** sie stammen, **wer** sie kopiert hat und wann. Sie wird verworfen, wenn eine andere Person angemeldet ist (gemeinsamer Rechner) und nach 7 Tagen. Fehlt der Browser-Speicher (z. B. privates Fenster), geht Kopieren innerhalb derselben Sitzung weiter, und ein Hinweis sagt, dass es nicht übers Neuladen hinaus hält.

### G1: Blöcke werden **nie** als Rohdaten aus der Seite entgegengenommen
Die Seite meldet nur Marken („k2-e4“). Welche Inhalte kopiert werden, liest die App aus **ihrer eigenen** Struktur. So kann eine manipulierte Seite keinen Fremdinhalt einschleusen. Beim Einfügen läuft jeder Block durch dieselbe Prüfung und Bereinigung wie Eingaben aus Formularen.

### G2: Eine zentrale Funktion für „Blöcke einsetzen“
Ziehen, Verschieben nach …, Einfügen aus der Zwischenablage und später PROJ-108 (aus Materialien/Regal übernehmen) enden alle in **einer** Funktion: „Diese Blöcke an diese Stelle setzen“. Sie vergibt neue Kennungen, ordnet nichts doppelt an, prüft die Grenzen und ist **ein** Rückgängig-Schritt. Das hält das Verhalten überall gleich und spart PROJ-108 Arbeit.

### A) Aufbau (was die Lehrkraft sieht)
```
Baukasten-Editor
+-- Vorschau (abgeschottete Seite mit Hilfsskript)
|   +-- Block-Leiste
|   |   +-- NEU: Ziehgriff (Maus), „Nach oben/unten“ (Handy, feste Leiste)
|   |   +-- Einzelblock: Bearbeiten · Darunter · Duplizieren · ⋯ · Löschen
|   |   +-- Mehrere gewählt: „N Blöcke ausgewählt“ · Verschieben nach … · Duplizieren
|   |                         · Kopieren · Löschen · Auswahl aufheben
|   +-- NEU: Mehrfachauswahl (⌘/Strg + Klick, Umschalt + Klick), alle gewählten mit Rahmen
|   +-- NEU: Ziehen: Einfügelinie, halbtransparenter Block, Auto-Scrollen, Esc bricht ab
|   +-- Themen-Überschrift mit Ziehgriff (nur zwischen Themen ablegbar)
+-- Gliederung: Kontrollkästchen beim Darüberfahren, gleiche Mehrfachauswahl
+-- ⋯-Menü (bestehend, erweitert):
|   Kopieren · Ausschneiden · Einfügen · Alle gleichen auswählen (im Thema / auf der Seite)
|   · Verschieben nach … (öffnet Themenliste)
+-- NEU: Themenliste „Verschieben nach …“ (kleiner Dialog, auch am Handy)
+-- NEU: Hinweis nach dem Einfügen/Kopieren (kurzer Toast, „3 Blöcke eingefügt“)
+-- NEU: Rückfrage „N Blöcke löschen?“ ab 5 Blöcken (AlertDialog)
```
Tastatur: ⌘/Strg + C / X / V, Alt + Pfeil hoch/runter (verschiebt um eine Stelle auch über Themen hinweg). Das Skript leitet diese Kürzel zusätzlich an die App weiter (Liste der erlaubten Tasten wächst um C, X, V, A).

### B) Daten
- **Keine Datenbank-Änderung, kein neues Format der YAML, keine neuen Pakete.**
- **Auswahl:** Aus „einem Block“ wird „eine Liste von Blöcken“ im Editor-Zustand. Themen und Blöcke lassen sich nicht mischen. Die Seite bekommt die Liste nach jedem Neubau zurückgemeldet.
- **Zwischenablage (Browser-Speicher):** kopierte Blöcke (Inhalt), Herkunfts-Material, Kopierer, Zeitpunkt. Höchstens 50 Blöcke und etwa 1 MB, sonst Hinweis „Bitte weniger Blöcke auf einmal“.
- **Neue Nachrichten Seite → App:** Ziehen beendet (Marken der Blöcke, Zielmarke, davor/dahinter), Auswahl um Marke erweitern, Bereich auswählen, Blockmenü für Mehrfachauswahl. Alle werden wie bisher streng gelesen (Marken, feste Listen, Zahlen begrenzt).
- **Neue Nachricht App → Seite:** Liste der gewählten Marken statt einer.

### C) Bilder beim Einfügen in ein anderes Material
Ein Bild-Block verweist nur auf den Namen. Im Zielmaterial gibt es dieses Bild nicht. Deshalb braucht es **einen kleinen neuen Server-Weg** („Bilder ins Material übernehmen“):
1. Die App meldet: Herkunfts-Material, Ziel-Material, Liste der Bildnamen.
2. Der Server prüft, dass **beide** Materialien dem angemeldeten Konto gehören (sonst Ablehnung, kein Fremdzugriff über die Zwischenablage).
3. Er prüft die Platzgrenze (8 MB) **vor** dem Kopieren. Reicht es nicht, wird **nichts** eingefügt, mit klarem Satz.
4. Er legt für jedes Bild eine eigene Kopie im Ordner des Ziel-Materials an (neuer Name, wie beim Hochladen) und gibt die neue Zuordnung Alt → Neu zurück.
5. Die App setzt die Blöcke mit den neuen Namen ein.
Bilder aus dem Skript-Paket des Herkunfts-Materials liest dafür der Kern (nur er öffnet das Paket). Ist das Herkunfts-Material inzwischen gelöscht oder nicht lesbar, kommt der Block ohne Bild und mit Hinweis (Spec).
**Im selben Material** braucht es das nicht: Beide Blöcke zeigen auf dasselbe Bild.

### D) Technische Entscheidungen (begründet)
| Entscheidung | Warum |
|---|---|
| Ziehen im Hilfsskript, Wunsch an die App | `@dnd-kit` reicht nicht in den abgeschotteten Rahmen. Positionen kennt nur die Seite. Sicherheit und Rückgängig bleiben unverändert. |
| Ziehen nur am Griff | Keine Kollision mit Aufgaben, Textmarkieren und PROJ-104 (Bild-Anfasser). |
| App liest die Inhalte selbst, die Seite nennt nur Marken | Eine manipulierte Seite kann nichts einschleusen. |
| Eine zentrale „Einsetzen“-Funktion | Gleiches Verhalten für Ziehen, Verschieben, Einfügen und PROJ-108, ein Rückgängig-Schritt. |
| Zwischenablage im Browser-Speicher | Tab-übergreifend, ohne neue Datenbank, ohne Berechtigungsabfrage. |
| Bilder per Server-Kopie, vor dem Einfügen geprüft | Keine halben Zustände („Bild fehlt“) und 8-MB-Grenze bleibt sicher. |
| Vorschau baut nach Mehrfachaktionen einmal neu | Wie im Autosave: Wünsche kurz nacheinander ergeben einen Neubau. |
| Mehrfachauswahl nicht am Handy | Spec E4. Dort reichen „Nach oben/unten“ und „Verschieben nach …“. |
| Schreibgeschützt: nur Kopieren | Die App lehnt ändernde Wünsche zusätzlich selbst ab (doppelte Sicherung wie PROJ-101). |

### E) Was neu gebaut wird, was bleibt
- **Neu/umgebaut:** Ziehen, Mehrfachauswahl und Leiste im Hilfsskript, Annahme der neuen Wünsche, zentrale „Einsetzen“-Funktion und Zwischenablage im Editor-Zustand, Themenliste, Kontrollkästchen in der Gliederung, ⋯-Menü erweitert, **ein** neuer Server-Weg für Bilder.
- **Kern:** keine Änderung nötig. Der Kern wird nur zum Lesen von Paket-Bildern aufgerufen (bestehender Weg).
- **Unverändert:** Datenbank, YAML-Format, Katalog, Formulare, Veröffentlichen, Schublade.

### F) Tests
- Skript: Mehrfachauswahl (⌘/Umschalt), Ziehen meldet genau einen Wunsch, Esc bricht ab, Ablage im Deckblatt und in Blöcken abgelehnt, Lernzielkontrolle nicht ziehbar.
- Nachrichten: unbekannte Marke, fremder Absender, Themen und Blöcke gemischt, übergroße Zahlen werden verworfen.
- Einsetzen: Reihenfolge bleibt, neue Kennungen, Rückgängig = ein Schritt, Einfügen am Ende ohne Auswahl, unbekannter Typ ausgelassen mit Hinweis.
- Zwischenablage: wird beim Kontowechsel verworfen, alt nach 7 Tagen, Grenze 50 Blöcke.
- Server: Bilder nur zwischen eigenen Materialien, Platzgrenze vor dem Kopieren, kein Pfad nach oben, keine Teilergebnisse bei Fehler.
- Browser-Test (manuell, kein Dev-Server durch Claude): Ziehen mit Maus und Auto-Scrollen, Handy-Wege, Kopieren zwischen zwei Tabs.

### G) Risiken
- **Aufgaben mit eigener Zieh-Logik** (Drag & Drop, Memory) schlucken Ziehen. Gegenmaßnahme: Das Skript fängt sie im Modus Bearbeiten schon seit PROJ-101 vorher ab. Beim Bau wird Ziehen zusätzlich auf diesen Typen geprüft.
- **Einfügen nach alter Kopie:** Wurde der Herkunftsblock inzwischen geändert, gilt der Stand **beim Kopieren**. Das ist gewollt und wird im Hinweis nicht eigens erklärt.
- **Sehr große Auswahl (50+):** Ein Neubau, ein Rückgängig-Schritt. Wird im Test mit 50 Blöcken geprüft.

### Modell-Empfehlung
`/frontend` für das Ziehen und die Mehrfachauswahl: **Sonnet** reicht, das Muster steht seit PROJ-101. `/backend` für den Bilder-Weg: **Sonnet**, aber die Prüfung „nur eigene Materialien“ sorgfältig testen lassen. Für `/qa` bei den Sicherheitsfällen (Bilder fremder Materialien) gern **Opus**.

### Empfohlene Bau-Reihenfolge
1. Zentrale „Einsetzen“-Funktion plus Mehrfachauswahl und gemeinsames Löschen/Verschieben (ohne Ziehen).
2. Ziehen in der Seite und Alt + Pfeile, „Verschieben nach …“.
3. Zwischenablage im selben Material.
4. Bilder-Weg und Kopieren zwischen Materialien.
So ist nach jedem Schritt etwas Brauchbares fertig.

## Umsetzung (Frontend + Backend, 2026-11-16, Sonnet)
**Gebaut nach dem Tech Design (G1/G2), ohne Datenbank-, Kern- oder Paket-Änderung.**

| Datei | Inhalt |
|---|---|
| `src/lib/werkzeugkiste-bloecke.ts` (neu) | Reine Funktionen: Orte ordnen, Bereich, „alle gleichen“, mehrere löschen/verschieben/einsetzen, Alt+Pfeil-Ziel, Bildnamen finden und ersetzen, Fremdtext als Lehrtext |
| `block-zwischenablage.ts` (neu) | Zwischenablage im Browser-Speicher (Person, 7 Tage, höchstens 50 Blöcke und ~1 MB; ohne Speicher nur bis zum Neuladen) |
| `vorschau-skript.ts` | Ziehgriff in der Leiste, Ziehen mit Einfügelinie, Auto-Scrollen, Esc; ⌘/Strg- und Umschalt-Klick; Sammel-Leiste „N Blöcke ausgewählt“; Nach oben/unten am Handy; Tasten C, X, V, Alt+Pfeil |
| `vorschau-nachrichten.ts` | Neue Wünsche `mehr`, `lege`, `legeThema`, `kopiere` (streng gelesen), Tasten c/x/v |
| `editor-vorschau.tsx` | schickt die Marken aller gewählten Blöcke (`mehr`) an die Seite |
| `baukasten-editor.tsx` | Mehrfachauswahl-Zustand, zentrale Funktionen (verschieben, löschen mit Rückfrage ab 5, duplizieren, kopieren/ausschneiden/einfügen, Bilder übernehmen, Themen ziehen, Alt+Pfeil) |
| `block-menue.tsx` | Menü für einen oder mehrere Blöcke: Verschieben nach …, Kopieren, Ausschneiden, Einfügen, Alle gleichen auswählen, Auswahl aufheben |
| `editor-gliederung.tsx` | ⌘/Strg- und Umschalt-Klick auf einen Block, gewählte Blöcke hervorgehoben |
| API `…/editor/bilder/uebernehmen` (neu) | Bilder zwischen **eigenen** Materialien kopieren: erst lesen, dann Anzahl und Seitengröße prüfen, dann schreiben; bei Fehler wird aufgeräumt |
| `GET …/editor` | liefert zusätzlich `nutzer` (für die Zwischenablage) |

**Abweichungen von der Spec (bewusst)**
- **Gliederung:** Mehrfachauswahl per ⌘/Strg- bzw. Umschalt-Klick, **keine** Kontrollkästchen beim Darüberfahren.
- **Einfügen ohne Auswahl** landet am Ende des **letzten** Themas (die Seite meldet kein „sichtbares Thema“).
- **Themen ziehen:** nur vor ein anderes Thema oder ans Ende (vor die Lernzielkontrolle).
- **Ziehen bei veralteter Vorschau:** Die App lehnt den Wunsch ab und die Kopfzeile sagt „Vorschau wird gerade aktualisiert“ (statt Text am Griff).
- **Fremdtext einfügen** (⌘/Strg+V ohne eigene Zwischenablage) nutzt die System-Zwischenablage nur, wenn der Browser sie freigibt; sonst Hinweis „Zwischenablage ist leer“.
- **„Alle gleichen auswählen“** steht im ⋯-Menü eines Blocks (im Thema / auf der Seite).
- Die 8-MB-Prüfung der Bilder ist eine Schätzung (Seitengröße + eingebettete Bildgröße wie beim Hochladen).

**Tests:** 16 reine Funktionen (`werkzeugkiste-bloecke.test.ts`), 5 Zwischenablage, 20 Integrationstests (`baukasten-mehrfach.test.tsx`), 15 neue Skript-/Nachrichten-Tests, 10 Server-Tests (`bilder-uebernehmen.test.ts`). Gesamt 3536 grün; **1 bekannter Fehlschlag außerhalb dieses Features:** `werkzeugkiste-auszug.test.ts` („nennt die Urheberin …“, gehört zu PROJ-100). `tsc` sauber, Produktions-Build läuft durch.

**Offen**
- Browser-Test (Laptop, iPad quer, Handy): Optik der Sammel-Leiste, Ziehen mit Auto-Scrollen, Ziehen über Aufgaben mit eigener Zieh-Logik (Drag & Drop, Memory), Kopieren zwischen zwei Tabs.

## QA Test Results
**Geprüft:** 2026-11-16 (Opus, Code-Review und automatische Tests; kein Dev-Server, kein Playwright nach Nutzer-Vorgabe)

### Automatische Prüfungen
| Prüfung | Ergebnis |
|---|---|
| `npx tsc --noEmit -p .` | sauber (Exit 0) |
| `npx vitest run src/components/werkzeugkiste src/lib/werkzeugkiste src/app/api/admin/werkzeugkiste` | 68 Dateien, 1244 Tests: 1243 grün, **1 rot = bekannter Fehlschlag** `werkzeugkiste-auszug.test.ts` („nennt die Urheberin …“, PROJ-100, nicht dieses Feature) |
| Neue QA-Tests `src/components/werkzeugkiste/editor/vorschau-skript-mehrfach-qa.test.ts` | 8 grün, 1 `it.fails` (belegt BUG-1) |

Die QA-Tests prüfen: Ziehen endet bei blur, Moduswechsel und pointercancel ohne Wunsch, und der Auto-Scroll-Takt stoppt. Im Schreibschutz und am Handy startet kein Ziehen. Während des Ziehens gehen keine Tasten an die App. Alt+Pfeil kommt mit `alt=true` an. `liesWunsch` lehnt falsche Marken, Typen und Zusätze bei `wkMehr`, `wkLege`, `wkLegeThema` und `wkKopiere` ab. Zusatzfelder (z. B. eingeschleuste Blöcke) werden nie durchgereicht.

### Acceptance Criteria
**Ziehen in der Vorschau**
- ✅ Ziehgriff in der Block-Leiste, Einfügelinie (`.wk-linie`), gezogene Blöcke halbtransparent (`.wk-zieht`).
- ⚠️ Auto-Scrollen am Rand ist umgesetzt (Takt 30 ms, Rand 60 px) und im Test belegt. Ob es sich im Browser gut anfühlt, ist noch nicht geprüft.
- ✅ Ablegen zwischen Blöcken, am Themenanfang und in leeren Themen. Deckblatt und Lernzielkontrolle sind ausgeschlossen. Das prüfen Skript und `liesWunsch`, die App prüft die Stelle noch einmal.
- ✅ Themen nur zwischen Themen bzw. vor die Lernzielkontrolle. Abweichung „nur vor ein anderes Thema oder ans Ende“ ist vertretbar, weil das gleichwertig ist.
- ✅ Esc bricht ab, nichts ändert sich.
- ⚠️ Nach dem Ablegen ist der Block weiter gewählt, Rückgängig ist ein Schritt. **Aber** nach dem Rückgängig bleibt die Auswahl auf der neuen Stelle stehen und rahmt dort einen anderen Block (siehe BUG-3).
- ✅ ⌥/Alt + Pfeil verschiebt um eine Stelle, auch über Themengrenzen (`eineStelle`). Am ersten bzw. letzten Block geschieht nichts.

**Verschieben nach …**
- ✅ „Verschieben nach …“ im ⋯-Menü mit allen Themen. Es setzt ans Ende des Themas, auch bei Mehrfachauswahl.
- ✅ Handy: „Nach oben/unten“ in der festen Leiste (als Alt+Pfeil an die App), kein Ziehgriff.

**Mehrfachauswahl**
- ⚠️ ⌘/Strg+Klick und Umschalt+Klick funktionieren, auch über Themengrenzen. Der Anker für Umschalt+Klick stimmt aber nicht immer (BUG-2).
- ⚠️ Gliederung: Mehrfachauswahl per ⌘/Strg- bzw. Umschalt-Klick, **keine Kontrollkästchen** (bewusste Abweichung). Vertretbar, aber die Funktion ist dort nicht auffindbar, weil es keinen sichtbaren Hinweis gibt. Den Anker-Fehler aus BUG-2 gibt es hier ebenfalls.
- ✅ Die Leiste zeigt „N Blöcke ausgewählt“ mit Griff, Kopieren, Duplizieren, ⋯ (Verschieben nach …, Auswahl aufheben) und Löschen.
- ✅ „Alle gleichen auswählen“ (im Thema / auf der Seite) steht im ⋯-Menü eines Einzelblocks.
- ✅ Ziehen aus der Mehrfachauswahl verschiebt alle Blöcke in alter Reihenfolge (`verschiebeBloecke`). Eine nicht zusammenhängende Auswahl wird an der Zielstelle zusammengeführt.
- ✅ Mehrfach-Löschen ist ein Rückgängig-Schritt. Ab 5 Blöcken erscheint der `AlertDialog` „N Blöcke löschen?“.
- ✅ Themen und Blöcke lassen sich nicht mischen: `wkMehr` nimmt nur Block-Marken an, ein Thema-Klick mit ⌘ wird zur Einzelauswahl.

**Kopieren & Einfügen**
- ⚠️ ⌘/Strg + C/X/V und die Menü-Einträge sind vorhanden. Abweichungen: Ohne Auswahl wird am Ende des **letzten** Themas eingefügt (vertretbar). ⌘C bei markiertem Text in der Vorschau kopiert Blöcke statt Text (BUG-1).
- ✅ Hinweise „N Blöcke kopiert / eingefügt / ausgeschnitten“.
- ✅ Zwischen Materialien desselben Kontos, über Tabs und nach dem Neuladen (`localStorage`). Bei einem anderen Konto wird der Inhalt verworfen.
- ✅ Bilder kommen mit (eigene Kopie im Ziel-Material), Anzahl und 8-MB-Schätzung werden vor dem Schreiben geprüft. Die Seitengröße liefert der Browser, siehe Security.
- ⚠️ Unbekannte Typen werden ausgelassen und gemeldet. Geprüft wird nur gegen den Gesamtkatalog (`istBekannterTyp`), nicht je Werkzeug. Das ist ausreichend, solange alle Baukasten-Materialien dasselbe Format haben.
- ✅ Eingefügte Blöcke sind danach gewählt.
- ✅ Ein Einfügen ist ein Rückgängig-Schritt.

**Allgemein**
- ✅ Schreibschutz: Kopieren geht. Ziehen, Ausschneiden, Einfügen, Löschen, Verschieben und `legeThema` lehnt die App doppelt ab: `z.gesperrt` in jeder ändernden Funktion, und Marken-Wünsche scheitern ohnehin an `speicherstand !== 'gespeichert'`. Das Skript blendet Griff und Ändern-Knöpfe aus.
- ✅ Jede Änderung geht über `z.aendere` (Autosave), die Vorschau baut gebündelt neu.

**Edge Cases:** Leeres Thema bleibt stehen ✅ · Einfügen ins selbe Material ergibt Kopien ohne „(Kopie)“, ohne Bild-Kopie ✅ · Fremdtext wird nur als Text eingefügt, maskiert und auf 20 000 Zeichen gekürzt ✅ · gelöschtes Herkunfts-Material: Blöcke kommen ohne Bild und mit Hinweis ✅ · Lernzielkontrolle nicht verschiebbar und nicht kopierbar ✅ · Ziehen bei veralteter Vorschau: Die App lehnt ab und die Kopfzeile meldet es (Abweichung vertretbar).

### Security-Audit (Red Team)
**Neuer Server-Weg `…/editor/bilder/uebernehmen`**
- **Besitz:** Beide Materialien werden mit dem Nutzer-Client geladen. Die RLS auf `werkzeug_ablaeufe` zeigt nur eigene Zeilen (`owner_id = auth.uid() AND has_teacher_role()`). Zusätzlich prüft der Server `owner_id === user.id` (doppelte Sicherung) ✅
- **Informationsabfluss:** Ein fremdes Material ist durch die RLS unsichtbar und liefert dieselbe Antwort wie ein gelöschtes (`200 {fehlend: alle}`). Ob eine fremde ID existiert, lässt sich so nicht erkennen. Der 403-Zweig ist praktisch nicht erreichbar, aber harmlos ✅
- **Pfade und Namen:** `BILD_NAME` erlaubt nur `images/` plus `[A-Za-z0-9_][A-Za-z0-9_.-]{0,120}`. Unterordner, Backslash, Unicode, `..` und ein führender Punkt sind damit ausgeschlossen, die Länge ist begrenzt (≤ 160). `images/eigen_x.vorschau.jpg` passt nicht zu `EIGENER_PFAD` und geht deshalb nur als Paket-Name an den Kern, nie als Speicherpfad. Ziel-Namen vergibt immer der Server (`randomBytes`) ✅
- **Zahlen:** `seitenGroesse` muss eine ganze Zahl zwischen 0 und 50 Mio. sein. NaN und Infinity kommen per JSON als `null` an und werden mit 400 abgewiesen ✅. Der Wert kommt aber vom Browser. Wer zu wenig angibt, schadet nur sich selbst, weil das Veröffentlichen die 8 MB im Kern ohnehin erzwingt (Low, siehe BUG-6).
- **Grenzen:** Höchstens 40 Pfade (doppelte werden entfernt), höchstens 30 eigene Bilder im Ziel, beides vor dem Schreiben geprüft ✅. Nebenläufigkeit: Zwei gleichzeitige Aufrufe können die 30er-Grenze überschreiten. Das gilt genauso für das bestehende Hochladen (BUG-5, Low).
- **Teilfehler:** Alles Angelegte wird im `catch` entfernt ✅. Bricht der Server nach `maxDuration` ab, läuft kein Aufräumen. Die verwaisten Dateien entfernt das Aufräumen beim Veröffentlichen (PROJ-92) ✅
- **DoS:** Ein Aufruf hält bis zu 40 Bilder (je ≤ ~3 MB) zuzüglich Base64 im Speicher und ruft den Kern bis zu 80-mal nacheinander auf. Die Anzahl wird erst nach dem Lesen geprüft. Nur für angemeldete Lehrkräfte erreichbar (BUG-5, Low).
- **Kern-Ergebnis:** Anders als beim Hochladen wird `r.bytes` aus `bild-ablegen` nicht gegen `ERGEBNIS_MAX_BYTES` geprüft (BUG-6, Low).
- **Proxy/Rollen:** Die Route liegt unter `/api/admin/werkzeugkiste` (Freigabe für Lehrkräfte in `src/lib/roles.ts`) und nutzt `requireTeacherOrAdmin`. Schüler kommen nicht hinein: Proxy und RLS (`has_teacher_role`) lassen sie nicht durch ✅

**Nachrichten aus der Vorschau (G1)**
- Die neuen Wünsche tragen nur Marken und feste Werte. Die Inhalte liest die App aus ihrer eigenen Struktur, und eingeschleuste Felder werden verworfen (QA-Test) ✅
- Marken-Wünsche bei veralteter Vorschau werden abgelehnt. `kopiere` kopiert immer die Auswahl der App, nicht eine Marke der Seite ✅

**Zwischenablage (`localStorage`)**
- Wird beim Kontowechsel verworfen, gilt 7 Tage, höchstens 50 Blöcke und ~1 MB ✅. Ein manipulierter Eintrag (nur über Same-Origin-Zugriff möglich) läuft durch `istBlock`, Typ-Filter, JSON-Kopie und beim Speichern durch `strukturSchema`. Die Bereinigung beim Bau übernimmt der Kern, wie bei Formular- und Rohfassungs-Eingaben ✅. `__proto__` aus `JSON.parse` wird eine eigene Eigenschaft, es gibt keine Prototype-Pollution.
- `textAlsBlock` maskiert `& < > "`, daher kein HTML aus der System-Zwischenablage ✅
- Datenschutz-Hinweis: Kopierte Inhalte bleiben nach dem Abmelden bis zu 7 Tage im Browser-Speicher. Sie werden erst verworfen, wenn eine andere Person den Editor öffnet (BUG-7, Low).

### Bugs
| # | Schweregrad | Fundstelle | Beschreibung / Reproduktion | Vorschlag |
|---|---|---|---|---|
| BUG-1 | **Medium** | `src/components/werkzeugkiste/editor/vorschau-skript.ts:410` | ⌘/Strg+C bzw. X in der Vorschau: Bei gewähltem Block fängt das Skript die Taste auch dann ab, wenn Text markiert ist. Die App prüft das (`baukasten-editor.tsx:718`), das Skript nicht. Reproduktion: Block wählen, Text im Block markieren, ⌘C. Ergebnis: Kopiert wird der Block (Toast „1 Block kopiert“), nicht der Text. Belegt durch `it.fails` in `vorschau-skript-mehrfach-qa.test.ts`. | Im Skript `&&!String(getSelection()).length` für c/x ergänzen. |
| BUG-2 | Low | `src/components/werkzeugkiste/editor/baukasten-editor.tsx:389`, `:513` | Der Anker für Umschalt+Klick wird nur bei Klick in der Vorschau bzw. ⌘-Klick gesetzt. Klick in der Gliederung, Pfeiltasten, Verschieben, Einfügen und „Alle gleichen“ setzen ihn nicht zurück. Reproduktion: Block A in der Vorschau klicken, mit ↓ auf B, Umschalt+Klick auf D. Ergebnis: A–D statt B–D gewählt. Nach einem Verschieben zeigt der Anker auf die alte Stelle. | Anker in `setAuswahlRoh`/`waehleOrte` auf den Primärblock setzen (außer bei „bereich“). |
| BUG-3 | Low | `baukasten-editor.tsx` (Undo ohne Auswahl-Abgleich, `use-editor-zustand.ts:140`) | Nach Rückgängig eines Verschiebens bleibt die Auswahl auf den neuen Indizes stehen und rahmt andere Blöcke. Ein folgendes Entf löscht diese. Das Muster gibt es seit PROJ-101 (Duplizieren), durch Mehrfachauswahl und Alt+Pfeil fällt es jetzt öfter auf. | Beim Rückgängig die Mehrfachauswahl aufheben oder die Stelle zurückrechnen. |
| BUG-4 | Low | `baukasten-editor.tsx:434–482` (`fuegeEin`) | Die Bilder werden vor dem Typ-Filter kopiert (auch für Blöcke, die dann ausgelassen werden). `ziel` wird vor dem `await` berechnet, Änderungen während der Server-Anfrage sind also nicht berücksichtigt. Doppeltes ⌘V startet zwei Kopien. `bildPfadeIn` findet auch Bildnamen im Fließtext und meldet sie als „fehlend“. Bei mehr als 40 Bildern oder Namen über 121 Zeichen lehnt der Server mit 400 ab, und nichts wird eingefügt. | Erst filtern, dann Bilder übernehmen. Ziel nach dem `await` neu bestimmen, Einfügen sperren, solange eine Anfrage läuft. Pfade nur aus Bild-Feldern sammeln. |
| BUG-5 | Low | `src/app/api/admin/werkzeugkiste/ablaeufe/[id]/editor/bilder/uebernehmen/route.ts:97–134` | Die Anzahl-Prüfung (30) läuft erst nach dem Lesen aller bis zu 40 Bilder (Speicher und Zeit). Zwei gleichzeitige Aufrufe können zusammen mehr als 30 Bilder anlegen (Race, wie beim Hochladen). | `vorhanden + pfade.length` vorab prüfen. Die Race ist akzeptabel bzw. wird über das Aufräumen behandelt. |
| BUG-6 | Low | `uebernehmen/route.ts:153` und `:136` | `bild-ablegen`: `r.bytes` wird nicht gegen `ERGEBNIS_MAX_BYTES` geprüft (das Hochladen tut es). Die 8-MB-Prüfung vertraut der `seitenGroesse` aus dem Browser. Ist die Vorschau noch nicht gebaut, ist sie 0. | Ergebnisgröße prüfen. Seitengröße optional aus der zuletzt gebauten Entwurfsvorschau serverseitig lesen. |
| BUG-7 | Low | `src/components/werkzeugkiste/editor/block-zwischenablage.ts` | Kopierte Inhalte bleiben nach dem Abmelden bis zu 7 Tage in `localStorage` (gemeinsamer Rechner). | Beim Abmelden `leereZwischenablage()` aufrufen. |

Keine Critical- oder High-Bugs.

### Regression
- PROJ-101 (Auswählen, Leiste, Tasten), PROJ-89/96/98 (Gliederung, Schublade, Löschen/Einfügen), PROJ-92 (Bilder): Alle bestehenden Tests sind grün. `baukasten-editor.test.tsx` wurde im Commit nur geringfügig angepasst (7 Zeilen), ohne Prüfungen abzuschwächen.
- Das Einfrieren der Aufgaben bleibt erhalten, der bestehende Skript-Test „friert Aufgaben ein“ ist grün. Ziehen beginnt nur am Griff in `.wk-ui`.
- Bekannter Fehlschlag außerhalb des Features: `werkzeugkiste-auszug.test.ts` (PROJ-100).

### Offen für den Nutzer (Browser)
- Ziehen mit der Maus samt Auto-Scrollen (Chrome, Firefox, Safari), auch über Aufgaben mit eigener Zieh-Logik (Drag & Drop, Memory).
- Sammel-Leiste „N Blöcke ausgewählt“ bei 1440 px und 768 px (iPad quer), Umbruch der Leiste. Handy 375 px: „Nach oben/unten“ und „Verschieben nach …“.
- Kopieren zwischen zwei Tabs bzw. Materialien samt Bildern. Einfügen von Fremdtext (Freigabe der System-Zwischenablage je Browser, Safari fragt nach).
- BUG-1 im Browser gegenprüfen (Text markieren und ⌘C in der Vorschau).

### Entscheidung
**Approved** – keine Critical- oder High-Bugs offen. Empfehlung: BUG-1 (Medium) vor dem Deploy beheben, weil es ein übliches Kopieren stört. Die Low-Bugs können später folgen.

### Nachbesserung (2026-11-16, Sonnet, nach QA mit Opus)
- **BUG-1 (Medium) behoben:** Das Hilfsskript fängt ⌘/Strg+C und X nicht mehr ab, wenn in der Seite Text markiert ist. Der QA-Test ist jetzt ein normaler Test.
- **BUG-2 behoben:** Ausgangspunkt für Umschalt+Klick ist jeder zuletzt einzeln gewählte Block (auch nach Pfeiltasten, Gliederung, Verschieben, Einfügen).
- **BUG-4 teilweise behoben:** Bilder werden nur noch für Blöcke kopiert, die das Material kennt. Offen (Low): Einfügestelle vor der Server-Anfrage, doppeltes ⌘V, mehr als 40 Bilder.
- **BUG-6 teilweise behoben:** Die Größe des Ergebnisses beim Ablegen wird geprüft (3 MB wie beim Hochladen). Offen (Low): Die Seitengröße kommt vom Browser.
- **Offen, bewusst nicht behoben (Low):** BUG-3 (Auswahl nach Rückgängig, Muster seit PROJ-101), BUG-5 (30er-Grenze erst nach dem Lesen, Rennen wie beim Hochladen), BUG-7 (Zwischenablage bleibt bis 7 Tage im Browser-Speicher).

### Entscheidung
**Approved** (keine Critical/High-Bugs offen). Browser-Test des Nutzers steht aus.

## Deployment
**Deployed 2026-11-16** (Push `fa60632` auf `main`, Vercel-Produktion `spedilern-ofic0agll`, Ready). Keine Datenbank-Migration, keine Kern-Änderung. Neue Route ohne Anmeldung liefert 401. Browser-Test des Nutzers steht aus.
