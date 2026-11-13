# PROJ-97: Werkzeugkiste – Baukasten: Hinzufügen präsenter & Vorschau aufgeräumt

## Status: Deployed
**Created:** 2026-11-13
**Last Updated:** 2026-11-13 (Frontend gebaut)

## Idee in einem Satz
Im Baukasten-Editor sind „Block hinzufügen“ und „Thema hinzufügen“ immer in Reichweite (feste Leiste in der Gliederung, Knopf direkt an jedem Block in der Vorschau, Menüeinträge, Tastenkürzel), und die Vorschau verdeckt weder Inhalt noch zeigt sie unnötige Bedienelemente.

## Kontext
- Rückmeldung des Nutzers (2026-11-13) nach PROJ-96: „Block oder Thema hinzufügen“ muss präsenter sein, nicht nur ganz unten im Inhaltsverzeichnis.
- Heute: „Block hinzufügen“ steht als gestrichelter Knopf am Ende jedes Themas, „Thema hinzufügen“ unter der letzten Themenkarte (`editor-gliederung.tsx`). Bei langer Seite sind beide nie gleichzeitig mit dem gerade bearbeiteten Block sichtbar. Dazu gibt es die Einfügestellen „+“ zwischen Blöcken (PROJ-90).
- Beobachtungen aus Screenshots (2026-11-13):
  - Der Seitenkopf der Seite (Titel, Fortschrittsleiste, „Drucken / als PDF sichern“, „Zurücksetzen“) scrollt in der Vorschau mit/klebt oben und verdeckt Inhalt (z. B. „Disposition“ halb verdeckt).
  - Der „Bearbeiten“-Knopf sitzt absolut oben rechts am Block (`.wk-k{top:8px;right:8px}`). Bei Blöcken, die zum Teil aus dem Sichtfeld gescrollt sind, schwebt er über der Kopfzeile bzw. der Fortschrittsleiste, bei Begriffs-Blöcken überdeckt er eine Zeile.
  - Mit geöffneter Schublade stehen drei Spalten (Gliederung, Vorschau, Schublade) nebeneinander, die Vorschau wird schmal.

## Nicht Teil dieses Features
- Der Fehler, dass im Lückentext der Vorschau rohes HTML (`<p>`, `<table>`, `<td>`) als Text erscheint, wird **separat** geprüft und behoben (Bugfix, vermutlich Kern/Import, kein UI-Thema).
- Keine Änderung am Katalog-Dialog (PROJ-90), am Datenmodell, an der YAML, an Entwurf/Veröffentlichen, Rückgängig/Wiederholen oder an der Prüfstelle.
- Keine Änderung am Aussehen der veröffentlichten Seite (Download, Link, Regal, Druck): Alles hier betrifft nur die Vorschau im Editor.

## Dependencies
- Requires: PROJ-89 (Baukasten-Editor), PROJ-90 (Katalog-Dialog, Einfügestellen), PROJ-96 (Vorschau als Hauptfläche, Schublade, `postMessage`-Rückkanal)
- Berührt: PROJ-83 (Bedienmuster, 44-px-Bedienelemente), PROJ-45 (Layout, Barrierefreiheit)

## Entscheidungen (Nutzer, 2026-11-13)
- **E1 – Hinzufügen immer sichtbar:** Es gibt vier Wege: feste Leiste in der Gliederung, Knopf an jedem Block in der Vorschau, Einträge im Block-Menü `⋯`, Tastenkürzel.
- **E2 – Eine Hauptaktion:** Die neuen Knöpfe sind `variant="outline"`. Grün bleibt allein „Veröffentlichen“ (PROJ-45).
- **E3 – Vorschau aufräumen:** Seitenkopf der Seite im Editor ausblenden bzw. nicht mitscrollen lassen; „Bearbeiten“-Knopf neu platzieren.
- **E4 – Schublade verdrängt Gliederung nicht mehr die Vorschau:** Beim Öffnen der Schublade klappt die Gliederung automatisch auf die schmale Leiste ein.

## Offene Vorschläge (bitte beim Review bestätigen oder ändern)
- **V1 – Kürzel:** `+` (ohne Modifier, wenn kein Eingabefeld Fokus hat) oder ⌘/Strg + Umschalt + A öffnet den Katalog-Dialog. Vorschlag: nur ⌘/Strg + Umschalt + A, damit `+` beim Tippen nie stört. Anzeige über `useIsApplePlatform()`.
- **V2 – Seitenkopf in der Vorschau:** Vorschlag: im Editor komplett ausblenden (Fortschritt, Drucken, Zurücksetzen sind dort ohne Nutzen). Alternative: nur nicht mehr „sticky“ machen.
- **V3 – Automatisches Einklappen:** Vorschlag: einklappen beim Öffnen der Schublade, Wiederaufklappen per Knopf; der gemerkte Zustand (offen/zu) wird dadurch nicht überschrieben.

## User Stories
- Als **Lehrkraft** möchte ich jederzeit, ohne zu scrollen, einen neuen Block oder ein neues Thema anlegen können, damit ich beim Aufbauen im Fluss bleibe.
- Als **Lehrkraft** möchte ich in der Vorschau direkt unter einem Block „+ Darunter einfügen“ klicken, damit ich dort ergänze, wo ich die Lücke sehe.
- Als **Lehrkraft** möchte ich im Block-Menü „Darüber“ und „Darunter“ einfügen wählen, damit ich auch ohne die Einfügestellen genau platziere.
- Als **Lehrkraft mit Tastatur** möchte ich den Katalog per Kürzel öffnen, damit ich nicht zur Maus greifen muss.
- Als **Lehrkraft** möchte ich in der Vorschau den ganzen Inhalt lesen, ohne dass ein Seitenkopf Text verdeckt.
- Als **Lehrkraft** möchte ich, dass der „Bearbeiten“-Knopf nie über anderem Inhalt oder Bedienelementen liegt.
- Als **Lehrkraft** möchte ich bei geöffneter Schublade eine breite Vorschau behalten.

## Acceptance Criteria

### Feste Leiste in der Gliederung
- [x] Oben in der Gliederung steht eine Leiste, die beim Scrollen der Gliederung sichtbar bleibt (sticky), mit zwei Outline-Knöpfen „Block“ (Plus-Icon) und „Thema“ (Plus-Icon). Beide mindestens 44 × 44 px, mit sichtbarem Text und Fokusring.
- [x] „Block“ öffnet den Katalog-Dialog. Der neue Block wird **hinter dem gewählten Block** eingefügt. Ist ein Thema gewählt, steht er am Ende dieses Themas. Ist nichts oder die Lernzielkontrolle/das Deckblatt gewählt, steht er am Ende des letzten Themas.
- [x] „Thema“ legt ein neues Thema **hinter dem gewählten Thema** an (bzw. am Ende) und wählt es aus, wie der bisherige Knopf unten.
- [x] Nach dem Einfügen ist der neue Block gewählt, seine Schublade offen, die Vorschau springt zu ihm (bisheriges Verhalten von PROJ-90).
- [x] Die bisherigen Knöpfe „Block hinzufügen“ am Themenende und „Thema hinzufügen“ am Ende bleiben bestehen (kein Wegfall, nur zusätzliche Wege).
- [x] Im schreibgeschützten Zustand (`gesperrt`) sind die Knöpfe deaktiviert wie die übrige Gliederung.
- [x] Im eingeklappten Zustand der Gliederung (schmale Leiste) gibt es einen sichtbaren „+“-Knopf (mit `aria-label` „Block hinzufügen“), der denselben Dialog öffnet.

### Knopf an jedem Block in der Vorschau
- [x] Jeder Block in der Vorschau zeigt neben „Bearbeiten“ einen zweiten Knopf „+ Darunter“ (aria-label „Block darunter einfügen“). Sichtbarkeit wie „Bearbeiten“: beim Darüberfahren/Fokus, auf Touch-Geräten immer, dort 44 px.
- [x] Ein Klick sendet per `postMessage` eine Nachricht mit der Sprungmarke des Blocks (z. B. `{ wkEinfuegen: 'k0-e3' }`). Die App öffnet den Katalog-Dialog mit Einfügeposition hinter diesem Block.
- [x] Themen (Kapitelüberschrift) zeigen „+ Block ins Thema“ (fügt am Anfang des Themas ein). Deckblatt und Lernzielkontrolle zeigen keinen Einfügeknopf.
- [x] Die App nimmt die Nachricht nur vom eigenen Rahmen (`event.source`) und nur mit gültiger Sprungmarke an (wie `wkWaehle`). Alles andere wird verworfen.
- [x] Ist die Vorschau veraltet (Neubau läuft), wird die Nachricht wie `wkWaehle` abgelehnt, der Knopf bleibt ohne Wirkung und es erscheint kein Fehler.
- [x] Die Knöpfe sind nur in der Editor-Vorschau vorhanden, nicht in Download, Link, Regal und Druck (`@media print` blendet sie ebenfalls aus).

### Block-Menü
- [x] Das `⋯`-Menü eines Blocks enthält „Darüber einfügen …“ und „Darunter einfügen …“. Beide öffnen den Katalog-Dialog mit der passenden Position.
- [x] Das Menü des Themas behält „Block hinzufügen …“ (am Ende) und bekommt zusätzlich „Thema darunter einfügen“.

### Tastenkürzel
- [x] Das Kürzel (V1, **geändert auf Alt+Umschalt+B**, siehe Umsetzung) öffnet den Katalog-Dialog mit denselben Positionsregeln wie der Leistenknopf „Block“. Es wirkt nicht, solange ein Dialog offen ist oder der Editor schreibgeschützt ist.
- [x] Das Kürzel steht als Tooltip am Leistenknopf und wird plattformrichtig angezeigt (⌘ bzw. Strg).

### Vorschau aufgeräumt
- [x] Im Editor ist der Seitenkopf der Seite (Titel, Fortschritt, „Drucken / als PDF sichern“, „Zurücksetzen“) nicht mehr sticky bzw. ausgeblendet (V2). Kein Inhalt wird mehr durch ihn verdeckt.
- [x] Die veröffentlichte Seite, Download, Link und Druck bleiben unverändert: Die Anpassung greift nur im eingebetteten Editor-Rahmen.
- [x] Der „Bearbeiten“-Knopf (und „+ Darunter“) liegt in einer eigenen Leiste am Blockrand bzw. in der Kopfzeile des Blocks und überdeckt weder Text noch Bedienelemente (Begriffe zum Aufklappen, Aufgaben-Kopfzeile, Fortschrittsleiste).
- [x] ~~Bei hohen Blöcken bleibt der Knopf beim Scrollen am oberen Rand des sichtbaren Blockteils erreichbar.~~ **Entfällt mit V4 a):** Die Knöpfe stehen in einer eigenen Zeile über dem Block, folgen dem Scrollen nicht mehr (siehe Umsetzung).

### Gliederung klappt bei Schublade ein
- [x] Öffnet sich die Schublade (ab 1024 px), klappt die Gliederung automatisch zur schmalen Leiste ein. Die Vorschau gewinnt die Breite.
- [x] Schließt die Schublade, kehrt die Gliederung zu dem Zustand zurück, den die Person vorher gewählt hatte (nur Wiederherstellung, kein eigener Wert im Browserspeicher).
- [x] Wird die Gliederung bei offener Schublade bewusst aufgeklappt, bleibt sie offen, bis die Schublade schließt (keine Schleife aus Auf- und Zuklappen).

### Barrierefreiheit & Bedienung
- [x] Alle neuen Knöpfe sind per Tab erreichbar, haben `aria-label`, sichtbaren Fokus (`focus-visible:ring-ws-green`) und mindestens 44 × 44 px auf Touch-Geräten.
- [x] Animationen höchstens 200 ms und entfallen bei „Bewegung reduzieren“.
- [x] Farben nur über `ws-*`-Tokens in der App; im Vorschau-Rahmen Kontrast ≥ 4,5 : 1 wie bisher.

### Handy
- [x] In der Ansicht „Gliederung“ (unter 1024 px) ist die feste Leiste sichtbar. In der Ansicht „Vorschau“ sind „+ Darunter“ und „Bearbeiten“ je 44 px groß, ohne dass sie sich überlappen.

## Edge Cases
- **Leere Seite oder leeres Thema:** „Block“ in der Leiste fügt ins erste Thema bzw. ins gewählte leere Thema ein. Gibt es kein Thema, legt „Block“ zuerst Thema 1 an, oder der Knopf ist deaktiviert mit Hinweis (im Architekturschritt entscheiden).
- **Gewählter Block wurde gelöscht oder verschoben:** Die Einfügeposition wird zum Zeitpunkt des Klicks aus der aktuellen Auswahl berechnet, nie aus einem zwischengespeicherten Index.
- **Vorschau-Neubau läuft:** „+ Darunter“ in der alten Vorschau verweist auf eine Marke, die nicht mehr passt: Nachricht wird abgelehnt, ohne Fehlermeldung (wie bei „Bearbeiten“).
- **Seitengröße bei 8 MB:** Der Katalog-Dialog weist wie bisher auf die Platzgrenze hin. Die neuen Wege umgehen die Prüfung nicht.
- **Schreibgeschützt (Konflikt, anderes Fenster):** Alle neuen Knöpfe und das Kürzel sind wirkungslos bzw. deaktiviert.
- **Kürzel im Texteditor:** Ein Kürzel mit Modifier darf im Rich-Text-Feld keine Eingabe stören und wird dort nicht ausgelöst (Fokus in Eingabefeld/Editor).
- **Blöcke ohne Marke in der Vorschau:** Blöcke, die keine gültige `data-wk`-Marke haben (z. B. Teile der Lernzielkontrolle), bekommen keinen Einfügeknopf.
- **Eingebettete Aufgabenkopfzeile:** Bei Aufgaben sitzt „Bearbeiten“ neben „Aufgabe n“ (`.aufgabe>.wk-k`). Der neue Knopf darf „gelöst“ rechts nicht überdecken.
- **Schublade offen, Gliederung bewusst aufgeklappt, dann anderer Block gewählt:** Zustand bleibt, kein erneutes Einklappen.
- **Große Schrift/Zoom 200 %:** Die feste Leiste bricht um, ohne Inhalte abzuschneiden oder seitlich zu scrollen.

## Technical Requirements
- Performance: Der Einfüge-Dialog öffnet in < 200 ms; das Einfügen löst genau einen Neubau der Vorschau aus.
- Security: Neuer Rückkanal ist so streng wie `wkWaehle`: gleiche Quelle, gleiche Markenprüfung (`MARKE_KNOPF`). Der Rahmen bleibt `sandbox="allow-scripts"` ohne `allow-same-origin`.
- Browser Support: Chrome, Firefox, Safari, auch Touch-Geräte.
- Betroffene Dateien (voraussichtlich): `editor-gliederung.tsx`, `vorschau-skript.ts`, `baukasten-editor.tsx`, `editor-vorschau.tsx`, `katalog-dialog.tsx` (nur Aufruf), zugehörige Tests (`baukasten-editor.test.tsx`, `katalog.test.tsx`).
- Kein Datenbank- und kein Kern-Eingriff erwartet, der Seitenkopf-Eingriff ist ein CSS-/Skriptanteil der Vorschau.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Erstellt:** 2026-11-13 · **Umfang:** nur Oberfläche, kein Backend, keine Datenbank, kein Eingriff im Python-Kern.

### Was schon da ist (und wiederverwendet wird)
- Der **Katalog-Dialog** (PROJ-90) und das Einfügen eines Blocks leben heute in der Gliederung. Dort gibt es schon „an welche Stelle einfügen“ (Thema + Position), den Dialog, das Bild-Fenster, das Aufklappen des Themas und das Scrollen zum neuen Block. Das wird nicht neu gebaut.
- Die **Gliederung bleibt immer im Seitenaufbau**, auch wenn sie eingeklappt oder am Handy gerade nicht sichtbar ist (sie ist dann nur versteckt). Der Dialog öffnet sich als Überlagerung und funktioniert deshalb auch dann.
- Die **Vorschau-Hilfsfunktion** (kleines Skript, das nur im Browser in die Seite eingefügt wird) setzt schon die „Bearbeiten“-Knöpfe, positioniert sie beim Scrollen und schickt Klicks als Nachricht an die App. Die App prüft Absender und Marke. Das neue „+ Darunter“ nutzt genau diesen Weg.
- Die **Seitenkopf-Leiste** der gebauten Seite hat im Kern einen festen Namen (`.navi`, klebt oben). Sie kann im Editor-Rahmen allein durch eine Stilregel der Hilfsfunktion ausgeblendet werden, ohne den Kern anzufassen.
- **Teilweise vorhanden:** Die Gliederung blendet sich heute schon unter 1280 px aus, sobald die Schublade offen ist. Neu ist, dass das auf allen Desktop-Breiten gilt.

### A) Komponenten-Struktur
```
Editor-Rahmen (Arbeitsfläche)
+-- Kopfzeile (unverändert: Schließen, Titel, Rückgängig/Wiederholen, ⋯, Veröffentlichen)
+-- Linke Spalte
|   +-- Schmale Leiste (Gliederung eingeklappt)
|   |   +-- Aufklapp-Knopf (vorhanden)
|   |   +-- NEU: „+“-Knopf „Block hinzufügen“
|   +-- Gliederung (aufgeklappt)
|       +-- NEU: Feste Leiste oben (bleibt beim Scrollen)
|       |   +-- Knopf „+ Block“
|       |   +-- Knopf „+ Thema“
|       +-- Deckblatt
|       +-- Themenkarten
|       |   +-- Themen-Menü ⋯ (NEU: „Thema darunter einfügen“)
|       |   +-- Blockzeilen
|       |   |   +-- Block-Menü ⋯ (NEU: „Darüber einfügen“, „Darunter einfügen“ – vorhanden, wird nur geprüft/ergänzt)
|       |   +-- Einfügestellen „+“ zwischen Blöcken (vorhanden)
|       |   +-- Knopf „Block hinzufügen“ am Themenende (vorhanden)
|       +-- Knopf „Thema hinzufügen“ (vorhanden)
|       +-- Lernzielkontrolle
|       +-- Katalog-Dialog und Bild-Fenster (vorhanden, bleiben hier zu Hause)
+-- Vorschau (iframe)
|   +-- Kopfzeile der Vorschau (unverändert)
|   +-- Seite
|       +-- Seitenkopf (.navi) → im Editor ausgeblendet
|       +-- Pro Thema/Block: NEU eine kleine Knopfgruppe „Bearbeiten | + Darunter“
+-- Schublade (Formular des gewählten Blocks)
```

### B) Daten und Zustand (einfach erklärt)
Es wird **nichts Neues gespeichert**: kein neues Feld im Material, nichts in der Datenbank, nichts im Browser-Speicher.
- **Einfüge-Anfrage:** Der Editor-Rahmen kann der Gliederung zurufen: „Öffne den Katalog an dieser Stelle (Thema X, Position Y)“. Die Gliederung führt das mit ihrem vorhandenen Ablauf aus. Quellen der Anfrage: Leistenknopf, „+“ in der schmalen Leiste, Tastenkürzel, Klick in der Vorschau.
- **Einfügeregel („wohin kommt der neue Block?“):** eine einzige kleine, getestete Regel an einer Stelle, die alle vier Wege benutzen:
  - Block gewählt → direkt dahinter.
  - Thema gewählt → am Ende dieses Themas.
  - Deckblatt, Lernzielkontrolle oder nichts gewählt → am Ende des letzten Themas.
  - Es gibt kein Thema mehr → zuerst wird automatisch „Thema 1“ angelegt, dann der Block eingefügt (Antwort auf die offene Frage aus dem Spec).
  - Die Regel liest die Auswahl **im Moment des Klicks**, nie einen alten Wert.
- **Zustand „Gliederung trotz Schublade“:** eine kurze Merkgröße nur für die laufende Auswahl. Sie sagt: „Die Person hat die Gliederung bewusst aufgeklappt, obwohl die Schublade offen ist.“ Sie verfällt, sobald die Schublade schließt. Der dauerhaft gemerkte Zustand (offen/zu im Browser) wird dadurch **nie überschrieben**, so kehrt die Gliederung nach dem Schließen von selbst in den früheren Zustand zurück.

### C) Neue Nachricht Vorschau → App
- Neben dem vorhandenen „Bearbeiten“-Klick (`wkWaehle`) gibt es eine zweite Nachricht „Block darunter einfügen“ mit derselben Marke (`k0-e3`, `k0`).
- Gleiche Sicherheitsregeln wie bisher: nur vom eigenen Rahmen, nur gültige Marke, sonst verworfen. Der Rahmen bleibt abgeschottet.
- Gleiche Veraltet-Prüfung wie „Bearbeiten“: Läuft ein Neubau oder ist der Entwurf noch nicht gespeichert, wird die Nachricht abgelehnt, und es erscheint dieselbe kurze Meldung „Die Vorschau wird gerade aktualisiert. Bitte gleich noch einmal klicken.“.
- Themen-Marken (`k0`) bedeuten „am Anfang dieses Themas einfügen“. Deckblatt und Lernzielkontrolle bekommen keinen Einfügeknopf.

### D) Entscheidungen und Begründung
1. **Dialog bleibt in der Gliederung, der Rahmen ruft ihn nur.** Alternative wäre, den ganzen Einfügeablauf in den Rahmen zu verschieben. Das wäre ein großer Umbau an einer funktionierenden, gut getesteten Stelle für denselben Nutzen. Die Anfrage-Lösung ist klein und gefahrlos.
2. **Seitenkopf nur ausblenden, nicht ändern.** Die Seite wird im Kern gebaut. Eine Stilregel im Hilfsskript wirkt nur in der Editor-Vorschau (das Skript wird nie in die gespeicherte oder veröffentlichte Datei geschrieben). Drucken und Zurücksetzen gehören zur veröffentlichten Seite und sind im Editor ohne Nutzen. Damit entfällt auch der Grund, warum der „Bearbeiten“-Knopf heute über der Kopfleiste schwebt (er rechnet im Moment mit dem Rand des Fensters, nicht mit dem Seitenkopf).
3. **Knopfgruppe statt zwei einzelner Knöpfe.** „Bearbeiten“ und „+ Darunter“ sitzen in einer gemeinsamen Gruppe an einer Stelle, mit weißem, deckendem Hintergrund und sichtbarem Rand. So können sie sich nie gegenseitig überlappen und bleiben auf der weißen Seite gut lesbar (Kontrast ≥ 4,5 : 1).
4. **Kürzel mit Modifier (⌘/Strg + Umschalt + A).** Ein einzelnes „+“ würde beim Tippen oder in Eingabefeldern stören. Der Kürzel-Code liegt neben dem vorhandenen Rückgängig-Kürzel, folgt derselben Regel („nicht in Eingabefeldern“) und zeigt die Taste plattformrichtig (⌘ oder Strg).
5. **Eine Hauptaktion bleibt grün (Veröffentlichen).** Die neuen Knöpfe sind Outline-Knöpfe aus dem vorhandenen Design-Baukasten (shadcn Button), keine eigenen Varianten.
6. **Neue Bedienelemente nur mit vorhandenen Bausteinen:** Button, Tooltip, Dropdown-Menü. Es wird keine neue shadcn-Komponente installiert.

### E) Offener Punkt zur Entscheidung (bitte beim Review wählen)
**V4 – Wo sitzt die Knopfgruppe in der Vorschau, damit sie nichts überdeckt?**
- **a) Eigene schmale Zeile oberhalb jedes Blocks (Empfehlung):** Jeder Block bekommt in der Editor-Vorschau oben einen schmalen Streifen (ca. 32 px) für die Knöpfe. Sie überdecken nie Text oder Aufgaben. Nachteil: Die Vorschau ist je Block etwas höher als die echte Seite.
- **b) Schwebend wie heute, aber mit deckendem Hintergrund:** Die echte Seitenhöhe bleibt erhalten, die Gruppe kann aber bei hohen Blöcken einzelne Zeilen kurz verdecken (z. B. bei „Begriffe zum Aufklappen“).

### F) Reihenfolge beim Bauen (jede Stufe einzeln prüfbar)
1. Vorschau: Seitenkopf ausblenden, Knopfgruppe mit „+ Darunter“, neue Nachricht inklusive Absenderprüfung.
2. Einfügeregel und Einfüge-Anfrage (Rahmen → Gliederung), Tastenkürzel.
3. Feste Leiste in der Gliederung, „+“ in der schmalen Leiste, Menüeinträge.
4. Automatisches Einklappen bei geöffneter Schublade.
5. Tests: Einfügeregel (alle Fälle inkl. „kein Thema“), Nachrichtenprüfung (fremde Quelle, ungültige Marke, veraltete Vorschau), Kürzel (nicht in Eingabefeldern, nicht bei offenem Dialog, nicht schreibgeschützt), Einklapp-Zustand (kein Überschreiben des gemerkten Werts, keine Schleife).

### G) Abhängigkeiten (Pakete)
Keine neuen Pakete. Alles mit vorhandenen Bausteinen (shadcn Button, Tooltip, Dropdown-Menü, Lucide-Icons).

### H) Risiken
- **Mittel:** Die Vorschau-Marken zählen Themen und Blöcke durch. Nach „Block darunter einfügen“ verschieben sich alle folgenden Marken. Darum nimmt die App Nachrichten nur an, wenn die Vorschau zum gespeicherten Entwurf passt (vorhandene Regel).
- **Gering:** Die Stilregel, die den Seitenkopf ausblendet, hängt am Klassennamen aus dem Kern. Ändert der Kern ihn, käme der Kopf in der Vorschau zurück (kein Funktionsverlust). Ein Test hält den Namen fest.
- **Gering:** Zwei Wege, die gleichzeitig den Dialog öffnen (Kürzel während eines Klicks): Der Dialog öffnet nur, wenn er nicht schon offen ist.

## Umsetzung (Frontend, 2026-11-13)
**Gebaut** (V4 = a, vom Nutzer gewählt):
- `vorschau-skript.ts`: Über jedem Thema, Block und der Lernzielkontrolle steht in der Editor-Vorschau eine eigene schmale Knopfzeile (`.wk-leiste`, ≥ 32 px, auf Touch 44 px) mit „Bearbeiten“ und – außer an der Lernzielkontrolle – „+ Darunter“ (Block) bzw. „+ Block“ (Thema). Neue Nachricht `{ wkEinfuegen: marke }`. Der Seitenkopf `.navi` ist ausgeblendet. Die Knopfzeile des gewählten Bereichs ist hervorgehoben (`.wk-leiste-aktiv`). Die alte Nachführung der Knöpfe beim Scrollen (`lage()`) ist weg, weil nichts mehr überdeckt wird.
- `editor-vorschau.tsx`: neues Prop `onEinfuegen`, gleiche Absender- und Markenprüfung und gleiche Veraltet-Meldung wie „Bearbeiten“.
- `einfuege-stelle.ts` (neu, mit `einfuege-stelle.test.ts`): die gemeinsame Einfügeregel, die Stelle aus einer Vorschau-Marke und „neues Thema hinter dem gewählten“.
- `editor-gliederung.tsx`: feste Leiste oben („Block“, „Thema“, `sticky`), Prop `einfuegenAnfrage` (nummerierte Bitte des Rahmens; der Dialog bleibt in der Gliederung), Themen-Menü „Thema darunter einfügen“, Thema 1 entsteht bei leerer Seite erst mit dem gewählten Block. Das Block-Menü hatte „Block darüber/darunter einfügen“ schon.
- `baukasten-editor.tsx`: „+“-Knopf in der schmalen Leiste, Kürzel, `beiVorschauEinfuegen`, automatisches Einklappen der Gliederung bei offener Schublade (`gliederungTrotzSchublade`, verfällt, wenn nichts mehr gewählt ist; der gemerkte Zustand wird nie überschrieben).

**Abweichungen vom Spec:**
1. **Kürzel Alt+Umschalt+B** (⌥⇧B auf Apple) statt ⌘/Strg+Umschalt+A: Chrome belegt ⌘/Strg+Umschalt+A mit der Tab-Suche, die Seite kann sie nicht abfangen. Das Kürzel gilt auch in Eingabefeldern, weil es dort nichts tippt; bei offenem Dialog oder im Schreibschutz wirkt es nicht.
2. **Knopfzeile folgt dem Scrollen nicht mehr** (ersetzt das AC „bei hohen Blöcken am oberen Rand erreichbar“): Eine feste Zeile über dem Block überdeckt nie Inhalt; wer mitten in einem hohen Block ist, wählt über die Gliederung oder scrollt zur Zeile.
3. **Die Knopfzeilen sind immer sichtbar** (nicht nur beim Darüberfahren), in ruhiger Optik; so sind „Bearbeiten“ und „+“ auch ohne Maus auffindbar und der Platz springt nicht.
4. **Unter 1280 px** schließt der Aufklapp-Knopf bei offener Schublade wie bisher die Schublade (für drei Spalten ist dort kein Platz); ab 1280 px klappt die Gliederung dabei bewusst neben der Schublade auf.

**Tests:** 11 neue Editor-Tests (Leiste, „+“ in der schmalen Leiste, Menü, Kürzel, Nachrichten aus der Vorschau inkl. fremder Absender/ungültiger Marke/Lernzielkontrolle/veralteter Vorschau, Einklapp-Zustand), 5 Hilfsskript-Tests, 10 Tests der Einfügeregel. Vier bestehende PROJ-90/96-Tests mussten auf das neue Einklappen angepasst werden (Gliederung bleibt im Aufbau, ist nur versteckt). `tsc`, `eslint` (nur bekannte Warnungen) und `npm run build` laufen sauber.
**Offen:** Browser-Test (Knopfzeilen in der echten Seite, Handy-Größe, Einklappen bei geöffneter Schublade). Kein Dev-Server gestartet.

## QA Test Results
**Getestet:** 2026-11-13 · **Methode:** Code-Review des Diffs, Unit-/Integrationstests, ESLint. **Kein Browser-Test, kein Playwright** (Dev-Server bewusst nicht gestartet, siehe Memory „Kein Dev-Server“).

### Automatisierte Tests
- `npx vitest run src/components/werkzeugkiste/editor`: **11 Dateien, 141 Tests, alle grün** (darunter 11 neue Editor-Tests, 5 Hilfsskript-Tests, 10 Tests der Einfügeregel).
- `eslint` auf dem Editor-Ordner: 0 Fehler, 5 Warnungen (die gezeigte `react-hooks/refs` in `editor-gliederung.tsx` liegt in unverändertem Code, Altlast).
- `tsc`/`build` wurden in dieser Sitzung nicht neu gelaufen (Frontend meldet sie sauber).

### Acceptance Criteria (nach Code-Prüfung)
| Bereich | Ergebnis |
|---|---|
| Feste Leiste in der Gliederung (Block/Thema, sticky, gesperrt, schmale Leiste mit „+“) | Bestanden (Code + Tests); Optik offen |
| Knopf „+ Darunter“ / „+ Block“ in der Vorschau, `wkEinfuegen`, Absender-/Markenprüfung, Veraltet-Ablehnung | Bestanden (Tests für fremde Quelle, ungültige Marke, Lernzielkontrolle, veraltete Vorschau) |
| Kein Knopf in Download/Link/Regal/Druck | Bestanden: Skript wird nur im Browser eingefügt, `@media print` blendet Leiste aus |
| Block-Menü / Themen-Menü | Bestanden |
| Tastenkürzel (Alt+Umschalt+B, nicht bei Dialog/Schreibschutz, Tooltip plattformrichtig) | Bestanden, mit Abweichung (siehe BUG-1) |
| Vorschau aufgeräumt (`.navi` ausgeblendet, eigene Knopfzeile) | Bestanden im Code; **visuell nicht geprüft** |
| Gliederung klappt bei Schublade ein / Wiederherstellung / keine Schleife | Bestanden (Tests, gemerkter Wert wird nie überschrieben) |
| Barrierefreiheit (aria-label, Fokusring, 44 px, reduzierte Bewegung) | Bestanden im Code; 44-px-Größen auf Touch **nicht am Gerät geprüft** |
| Handy-Ansicht | Nur Code geprüft, **Browser-Test offen** |

### Security-Audit
- Rückkanal `wkEinfuegen` ist so streng wie `wkWaehle`: Quelle über `event.source`, Marke über `auswahlAusMarke` (Länge ≤ 40, Regex), zusätzlich `einfuegeortAusMarke` prüft, dass Thema/Block existiert. Fremde oder erfundene Marken ergeben `undefined`, nichts passiert.
- Sandbox des Rahmens unverändert (`allow-scripts`, ohne `allow-same-origin`). Marke im Skript wird vor `querySelector` bereinigt. Aria-Label nutzt `textContent` (kein HTML-Einschleusen).
- Keine neuen API-Routen, keine Datenbank-, keine Kern-Änderung. Keine Geheimnisse, kein neuer Speicher im Browser.
- Ergebnis: **keine Funde.**

### Regression
Vier bestehende PROJ-90/96-Tests wurden angepasst (Gliederung bleibt im Aufbau, ist nur versteckt); alle Editor-Tests grün. Nicht geprüft: Verhalten der veröffentlichten Seite im Browser.

### Bugs / Abweichungen
- **BUG-1 (Low):** Das Kürzel wirkt auch in Eingabefeldern und im Rich-Text-Feld; der Edge Case verlangt „dort nicht ausgelöst“. Bewusst so umgesetzt (Alt+Umschalt+B tippt nichts), aber nicht mit dem Spec-Text vereinbar. Spec anpassen oder Verhalten ändern.
- **BUG-2 (Low):** Zwischen 1024 und 1279 px schließt der Aufklapp-Knopf bei offener Schublade die Schublade, statt die Gliederung aufzuklappen (dokumentierte Abweichung 4). Der „+“-Knopf daneben funktioniert.
- **BUG-3 (Low, Hinweis):** Die Knopfzeilen sind immer sichtbar und machen die Vorschau je Block ca. 32–36 px höher als die echte Seite (Entscheidung V4 a, dokumentiert).
- **Offen (kein Bug):** Browser-Test der Knopfzeilen in der echten Seite (Einfügen vor `.aufgabe`, Layout bei Begriffs-Blöcken), Handy 375 px, Zoom 200 %. E2E-Datei `tests/PROJ-97-*.spec.ts` nicht geschrieben (kein Playwright auf diesem Rechner).

### Entscheidung
**Production-ready: JA** (keine Critical/High-Bugs), unter dem Vorbehalt, dass der Browser-Test nach dem Deploy nachgeholt wird (wie bei PROJ-89–96).

## Deployment
**Deployed:** 2026-11-13 · https://spedilern.vercel.app · Tag `v1.97.0-PROJ-97`

Vor dem Deploy behoben: BUG-1 (Kürzel wirkt nicht mehr in Eingabefeldern/Texteditor, +1 Test) und BUG-2 (zwischen 1024 und 1279 px klappt der Knopf die Gliederung wirklich auf, wenn er die Schublade schließt). BUG-3 bleibt als bewusste Entscheidung V4 a. Keine Migration. **Offen:** Browser-Test (Knopfzeilen in der echten Seite, Handy 375 px, Zoom 200 %).
