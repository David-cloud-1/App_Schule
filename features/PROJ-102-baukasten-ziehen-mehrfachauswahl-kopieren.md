# PROJ-102: Baukasten – Ziehen in der Vorschau, Mehrfachauswahl, Kopieren & Einfügen

## Status: In Progress
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
_To be added by /qa_

## Deployment
_To be added by /deploy_
