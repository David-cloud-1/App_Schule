# PROJ-96: Werkzeugkiste – Baukasten: Vorschau als Hauptfläche mit Formular-Schublade

## Status: Deployed
**Created:** 2026-11-12
**Last Updated:** 2026-11-12 (Frontend gebaut)

## Idee in einem Satz
Im Baukasten-Editor füllt die Vorschau die Breite. Ein Klick auf den Stift-Knopf an einem Block in der Vorschau wählt ihn aus, sein Formular öffnet sich in einer Schublade am rechten Rand, und die Gliederungsliste ist eingeklappt, bis man sie braucht.

## Kontext
- Heute (PROJ-89 E7) stehen Liste/Formular links und Vorschau rechts als zwei etwa gleich breite Spalten. Das Formular verdrängt die Vorschau, man springt zwischen Liste und Seite hin und her. Rückmeldung des Nutzers (2026-11-12): „mit den 2 Spalten noch nicht ganz so gut“.
- Ein echtes Bearbeiten im HTML der Vorschau (contenteditable) wurde verworfen: Die Seite wird aus der YAML gebaut, ein Rückweg HTML → YAML wäre verlustbehaftet, Rückgängig/Autosave/Prüfstelle hängen an der YAML. Dieses Feature ist der **Mittelweg**: Es fühlt sich wie „direkt in der Seite“ an, der Kern und das Datenmodell bleiben unberührt.
- Die Vorschau ist ein abgeschotteter iframe (`sandbox="allow-scripts"` ohne `allow-same-origin`). Die App sendet schon heute per `postMessage` eine Sprungmarke (`data-wk`: `k0`, `k0-e3`, `abschluss`) in die Seite. Neu ist die **Rückrichtung** aus der Seite in die App.

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Formular als Schublade rechts:** Das Formular des gewählten Blocks öffnet sich in einer schmalen Schublade am rechten Rand über der Vorschau. Schließen per Knopf oder Esc.
- **E2 – Stift-Knopf am Block:** Beim Darüberfahren (auf Touch-Geräten immer sichtbar) erscheint an jedem Block ein kleiner „Bearbeiten“-Knopf. Aufgaben bleiben in der Vorschau normal spielbar. Gewählt wird nur über den Knopf, nie durch Klick auf den Block selbst.
- **E3 – Startansicht:** Vorschau groß, Gliederung eingeklappt als schmaler Streifen, aufklappbar.
- **E4 – Handy:** Wie bisher zwischen Liste und Vorschau umschaltbar. Die Formular-Schublade füllt dabei den Bildschirm (von unten hochgezogen).

## Nicht Teil dieses Features
- Kein Bearbeiten von Text direkt in der Seite (contenteditable).
- Keine Änderung am Python-Kern, an `seite.py`, am Format der YAML, an Entwurf/Veröffentlichen, Rückgängig/Wiederholen oder an der Prüfstelle.
- Kein neuer Editor-Inhalt: Die Formulare, der Katalog (PROJ-90) und „Typ wechseln“ (PROJ-95) bleiben unverändert und erscheinen nur an anderer Stelle.
- Der Fehler mit sichtbaren `<p>`-Tags nach „Typ wechseln“ (siehe Nebenbefund) wird **separat** behoben (Bugfix an PROJ-95), nicht hier.

## Dependencies
- Requires: PROJ-89 (Baukasten-Editor, Vorschau, Sprungmarken `data-wk`)
- Requires: PROJ-90 (Katalog), PROJ-92 (Platzanzeige in der Vorschau-Kopfzeile), PROJ-95 (Knopf „Typ wechseln“ im Formularkopf)
- Berührt: PROJ-83 (Bedienmuster: Schublade, 44-px-Bedienelemente), PROJ-45 (Layout, Barrierefreiheit)

## User Stories
- Als **Lehrkraft** möchte ich beim Bearbeiten die Seite groß sehen, damit ich beurteile, wie sie für Schüler aussieht.
- Als **Lehrkraft** möchte ich in der Vorschau direkt am Block auf „Bearbeiten“ klicken, damit ich nicht in einer Liste nach dem Block suchen muss.
- Als **Lehrkraft** möchte ich Aufgaben in der Vorschau weiter ausprobieren können, ohne versehentlich in den Bearbeiten-Modus zu springen.
- Als **Lehrkraft** möchte ich die Gliederung bei Bedarf aufklappen, um Themen und Blöcke zu verschieben, und sie sonst wegklappen, damit mehr Platz bleibt.
- Als **Lehrkraft am Handy** möchte ich weiterhin zwischen Liste und Vorschau wechseln und das Formular bequem im Vollbild bedienen.
- Als **Lehrkraft mit Tastatur** möchte ich die Schublade und den Stift-Knopf ohne Maus bedienen können.

## Acceptance Criteria

### Layout
- [x] Beim Öffnen des Editors (ab 1024 px Breite) nimmt die Vorschau die volle Inhaltsbreite ein. Die Gliederung ist ein schmaler Streifen am linken Rand mit Aufklapp-Knopf (mit `aria-label`, Tooltip, Kürzel optional).
- [x] Ein Klick auf den Aufklapp-Knopf zeigt die Gliederung (Liste zum Ziehen, Verschieben, Duplizieren, Löschen, Einfügen wie in PROJ-89/90) neben der Vorschau. Ein erneuter Klick klappt sie ein. Sie funktioniert im aufgeklappten Zustand unverändert.
- [x] Der Zustand der Gliederung (offen/zu) wird pro Person im Browser gemerkt. Beim ersten Öffnen ist sie zu.
- [x] Ein Knopf „Vollbreite Vorschau“ blendet Gliederung und Schublade aus und gibt der Vorschau die gesamte Breite. Ein Knopf bringt zurück.
- [x] Die Vorschau-Kopfzeile (Titel, „wird aktualisiert“, Platzanzeige „Seite: x MB von 8 MB“) bleibt erhalten und sichtbar.

### Auswahl über die Vorschau
- [x] Jeder Block, jedes Thema (Kapitelüberschrift), das Deckblatt und die Lernzielkontrolle in der Vorschau zeigt beim Darüberfahren (Touch: immer, dezent) einen „Bearbeiten“-Knopf mit Stift-Icon und `aria-label`.
- [x] Ein Klick auf den Knopf schickt die Sprungmarke des Blocks per `postMessage` an die App. Die App wählt den Block aus und öffnet die Schublade mit dem passenden Formular.
- [x] Ein Klick auf den Block selbst (Aufgabe lösen, Karten umdrehen, Wörter ziehen, Prüfen) löst keine Auswahl aus und bleibt voll spielbar.
- [x] Der gewählte Block ist in der Vorschau hervorgehoben (Rahmen in der Hauptfarbe) und bleibt im Sichtfeld, wenn die Schublade öffnet.
- [x] Die App nimmt Nachrichten aus dem Vorschau-Rahmen nur an, wenn sie vom eigenen Rahmen kommen (`event.source`), und nur mit gültiger Sprungmarke. Sonst werden sie verworfen.
- [x] Die Knöpfe gibt es nur in der Vorschau des Editors. Die veröffentlichte Seite, Download, Link, Regal und Druck enthalten sie nicht.

### Schublade
- [x] Die Schublade (ca. 420–480 px, `max-w-[90vw]`) zeigt oben den Blocktyp und Titel, rechts den Schließen-Knopf, darunter das bisherige Formular bzw. die Rohfassung, einschließlich „Typ wechseln“ (PROJ-95) und der Umschaltung Formular/Rohfassung.
- [x] Änderungen im Formular wirken wie heute: Entwurf wird automatisch gesichert, die Vorschau baut sich neu, Rückgängig/Wiederholen im Kopf des Editors funktionieren unverändert.
- [x] Die Vorschau bleibt neben der Schublade sichtbar und aktualisiert sich nach Änderungen. Die Scrollposition der Vorschau springt dabei nicht an den Anfang, sondern kehrt zum gewählten Block zurück (bisherige Sprungmarke).
- [x] Wählt man in der Vorschau einen anderen Block, wechselt die Schublade auf dessen Formular. Ungesicherte Eingaben gehen nicht verloren, weil sie vorher in den Entwurf übernommen werden (wie beim Blockwechsel heute).
- [x] Esc und der Schließen-Knopf schließen die Schublade (Handy: auch Tipp daneben). Der Fokus kehrt auf die gewählte Zeile der Gliederung zurück, sonst auf „Gliederung einblenden“ bzw. die Vorschau. *Angepasst nach QA (2026-11-12): Am Desktop ist die Schublade angedockt und nicht modal, deshalb schließt ein Klick daneben nicht (die Vorschau soll bedienbar bleiben).*
- [x] Block auswählen, löschen oder duplizieren aus der Gliederung öffnet die Schublade wie bisher (Auswahl) bzw. schließt sie, wenn der Block nicht mehr existiert.

### Handy und Tablet (< 1024 px)
- [x] Wie bisher gibt es eine Umschaltung Liste / Vorschau. Standard beim Öffnen: Vorschau.
- [x] Der Stift-Knopf in der Vorschau ist immer sichtbar und mindestens 44 × 44 px groß.
- [x] Die Schublade erscheint als Blatt von unten, füllt den Bildschirm (bis unter die Kopfzeile), lässt sich per Knopf, Esc und Tipp daneben schließen. *Angepasst nach QA (2026-11-12): Wischen nach unten entfällt, shadcn-`Sheet` kann es nicht.*
- [x] Kein seitliches Scrollen der Seite.

### Barrierefreiheit und Bedienung
- [x] Schublade ist per Tastatur erreichbar, Fokus wandert beim Öffnen hinein, Rolle und Name sind gesetzt. Handy: modales Blatt mit Fokus-Einschluss. Desktop: angedockte, nicht modale Spalte (`aside` mit Namen), der Fokus bleibt nicht eingeschlossen. *Angepasst nach QA (2026-11-12).*
- [x] Die Knöpfe in der Vorschau sind per Tab erreichbar (Reihenfolge wie im Dokument) und haben einen sichtbaren Fokus.
- [x] Animationen höchstens 200 ms und entfallen bei „Bewegung reduzieren“.
- [x] Neue Bedienelemente im Editor-Rahmen nutzen die `ws-*`-Farbtokens (keine festen Farbwerte). Die Knöpfe innerhalb der Vorschau-Seite verwenden das Seiten-Farbschema des Kerns, dürfen aber den Seiteninhalt nicht verschieben (positioniert über dem Block).

## Edge Cases
- **Block ist sehr hoch (z. B. langer Text):** Der Stift-Knopf bleibt am oberen Rand des Blocks sichtbar (sticky), auch wenn man in der Mitte des Blocks ist.
- **Vorschau baut sich gerade neu:** Ein Klick auf einen Stift-Knopf während des Ladens wird zur Schublade vorgemerkt und wirkt nach dem Neubau, oder der Knopf ist solange deaktiviert. Es gibt keine Auswahl auf einer Sprungmarke, die es nicht mehr gibt.
- **Vorschau-Fehler / Seite nicht gebaut:** Es gibt keine Knöpfe. Die Gliederung bleibt eine vollwertige Bedienung (Fehlerzustand mit „Erneut versuchen“ wie heute). Die Liste kann trotzdem aufgeklappt werden.
- **Block verschwindet beim Neubau** (z. B. nach Typ-Wechsel in einen anderen Typ oder Rückgängig): Die Auswahl springt auf den nächsten vorhandenen Block oder schließt die Schublade, kein leeres Formular.
- **Kaputter Block:** Der Kern überspringt ihn mit Warnung. Er hat in der Vorschau keinen Knopf, ist aber in der Gliederung weiter wählbar.
- **Mehrere Knöpfe überlagern sich** (verschachtelte Marken wie Thema → Block): Pro Block genau ein Knopf, das Thema hat seinen eigenen an der Überschrift.
- **Schmales Fenster ≥ 1024 px:** Sind Gliederung und Schublade zusammen offen, wird die Vorschau höchstens bis zu einer Mindestbreite von 480 px verkleinert. Darunter blendet sich die Gliederung automatisch aus.
- **Touch-Gerät mit Maus (Hybrid):** Knöpfe sind sichtbar, wenn Hover fehlt oder Fokus im Block liegt.
- **Kein JavaScript in der Vorschau / Kern liefert alte Seite:** Ohne die neuen Sprungmarken-Knöpfe fällt der Editor auf Auswahl über die Gliederung zurück. Er bricht nicht.
- **Nachrichten aus fremden Quellen:** Werden stillschweigend verworfen (Sicherheit: kein Ändern des Entwurfs über das iframe).

## Technical Requirements
- Sicherheit: Sandbox des iframes bleibt unverändert (`allow-scripts`, kein `allow-same-origin`). Nachricht nur mit Prüfung von Absender-Rahmen und Format der Marke.
- Die Knöpfe werden nur in die **Vorschau**-Fassung der Seite eingebaut (z. B. über ein Vorschau-Flag beim Bau oder ein Skript, das die App in den Rahmen schickt), nie in die veröffentlichte Datei. Ob das im Kern oder in der App geschieht, entscheidet `/architecture`. Das Datenmodell bleibt unberührt.
- Performance: Auswahl öffnet die Schublade in unter 200 ms (ohne Neubau). Kein zusätzlicher Neubau der Seite durch das Öffnen/Schließen von Schublade und Gliederung.
- Browser: aktuelle Versionen von Chrome, Firefox, Safari (inkl. iOS Safari).

## Offene Punkte für `/architecture`
- Wo entstehen die Stift-Knöpfe (im Kern per Vorschau-Flag oder durch ein von der App eingespieltes Skript)? Auswirkung auf Platzanzeige (8-MB-Grenze) und Veröffentlichen.
- Wie bleibt die Scrollposition der Vorschau beim Neubau stabil?
- Schublade für Desktop und Handy: ein Bauteil (shadcn `Sheet`/`Drawer`) oder zwei?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Stand:** 2026-11-12. Reines Frontend-Feature. Keine Datenbank, keine neue API, keine Änderung am Python-Kern.

### Was der Code heute schon hergibt
- Die Vorschau wird vom Kern mit Sprungmarken gebaut (nur für die Vorschau, die veröffentlichte Datei hat keine). Marken gibt es für Themen (`k0`), Blöcke (`k0-e3`) und die Lernzielkontrolle (`abschluss`, `abschluss-question_set`, `abschluss-summary`). **Das Deckblatt hat keine Marke.**
- Die App fügt der gebauten Seite schon selbst ein kleines Skript hinzu (für „springe zu Block X“). Es wird erst im Browser eingefügt, nie in die gespeicherte oder veröffentlichte Datei. Genau dort kommen auch die Stift-Knöpfe hinein.
- „Welcher Block ist gewählt?“ ist schon ein einziger Zustand im Editor und steuert die Vorschau. Er muss nur auch aus der Vorschau gesetzt werden können.
- **Der größte Aufwand:** Die Formulare sitzen heute **mitten in der Gliederung**. Das gewählte Thema oder der gewählte Block klappt dort auf, und das Formular erscheint darunter. Für die Schublade muss das Formular aus der Liste heraus an eine zentrale Stelle ziehen, ohne dass sich an Formular, Rohfassung, „Typ wechseln“ oder Text-Editor etwas ändert.

### A) Komponentenstruktur
```
Baukasten-Editor (Seite, bleibt)
+-- Kopfzeile (Speichern-Anzeige, Rückgängig/Wiederholen, Veröffentlichen)  [unverändert]
+-- Befund-/Fehlerhinweise                                                    [unverändert]
+-- Umschalter „Gliederung | Vorschau“ (nur unter 1024 px)                   [bleibt]
+-- Arbeitsfläche
    +-- Gliederungs-Streifen / Gliederung                                     [NEU eingeklappt]
    |     Streifen: Aufklapp-Knopf, Anzahl Themen
    |     Aufgeklappt: Liste zum Ziehen, Verschieben, Duplizieren, Löschen, Einfügen
    |     (Zeilen wählen nur noch aus, das Formular klappt NICHT mehr in der Liste auf)
    +-- Vorschau (Hauptfläche)
    |     +-- Vorschau-Kopfzeile (Titel, „wird aktualisiert“, Platzanzeige)   [bleibt]
    |     +-- Knopf „Vollbreite Vorschau“                                     [NEU]
    |     +-- Seite im abgeschotteten Rahmen                                  [bleibt]
    |           +-- Stift-Knopf an jedem Thema und Block                      [NEU, nur Vorschau]
    +-- Formular-Schublade                                                    [NEU]
          Kopf: Blocktyp + Titel, Schließen-Knopf
          Inhalt: bisheriges Formular / Rohfassung / Typ wechseln / Text-Editor
          (Deckblatt-, Thema-, Block-, Abschluss-Formular werden hierher umgezogen)
```

### B) Datenmodell (in Klartext)
- **Datenbank und Entwurf: keine Änderung.** Die YAML, das Speichern, Rückgängig/Wiederholen, Veröffentlichen und die Prüfstelle bleiben wie sie sind.
- **Neu, nur im Browser dieser Person:** „Gliederung offen oder zu“ (beim ersten Mal: zu). Wird lokal gemerkt. Fehlt der Speicher oder ist er gesperrt, startet der Editor einfach mit „zu“.
- **Neu, nur im Arbeitsspeicher:** „Vollbreite Vorschau an/aus“ und „Schublade offen/zu“. „Schublade offen“ ergibt sich daraus, ob ein Block gewählt ist. Beides wird nicht gespeichert.
- **Nachricht Vorschau → App:** enthält nur die Sprungmarke des Blocks als Text. Die App akzeptiert sie nur,
  - wenn sie aus **dem eigenen Vorschau-Rahmen** kommt (Absender-Prüfung am Rahmen, nicht an der Herkunft, denn der abgeschottete Rahmen hat keine eigene Herkunft),
  - und wenn die Marke genau ein bekanntes Muster hat (Thema, Block oder Lernzielkontrolle).
  Alles andere wird still verworfen, damit die Seite niemals Befehle an den Editor geben kann.

### C) Technische Entscheidungen und Begründung
1. **Stift-Knöpfe kommen aus der App, nicht aus dem Kern.** Der Kern bleibt unberührt, es gibt keinen Deploy des Kern-Projekts und kein Risiko für die veröffentlichten Seiten. Die Knöpfe stehen nur in der Vorschau im Browser, nie in der gespeicherten Datei, dem Download, dem Link, dem Regal oder dem Druck. Das hält die Zusage „nur in der Vorschau“ von selbst ein.
2. **Eine Schublade, zwei Darstellungen.**
   - **Ab 1024 px: angedockt als dritte Spalte**, nicht als Fläche über der Vorschau. *Abweichung zum Spezifikationstext („über der Vorschau“):* Eine Schublade, die die Vorschau überdeckt oder abdunkelt, verdeckt ausgerechnet den Block, den man gerade bearbeitet, und sperrt das Ausprobieren. Angedockt bleibt die Vorschau sichtbar, live und bedienbar. Die Vorschau gibt dafür etwas Breite ab (Mindestbreite 480 px, darunter blendet sich die Gliederung selbst aus).
   - **Unter 1024 px: Blatt von unten** mit dem vorhandenen shadcn-Bauteil `Sheet`. Das gibt Esc, Fokusführung und Wischen gratis und füllt auf dem Handy den Bildschirm.
   - Der Inhalt (Formulare) ist in beiden Fällen **derselbe Baustein**, damit es nur einmal gepflegt wird.
3. **Gliederung = Auswahl, Schublade = Bearbeiten.** Die Liste zeigt nur noch, was es gibt, und wählt aus. Alle Bearbeitungen (Formular, Rohfassung, Typ wechseln) liegen an einer Stelle. Das beseitigt das heutige „Formular klappt mitten in der Liste auf und schiebt alles weg“.
4. **Gewählter Block wird in der Vorschau hervorgehoben**, ebenfalls über das eingefügte Skript (Rahmen in der Hauptfarbe, ausgelöst durch dieselbe Marke wie das Springen).
5. **Neubau stört die Auswahl nicht.** Der Neubau läuft weiter so, wie er ist (nach dem Speichern, nie mehrere gleichzeitig). Der Rahmen springt danach zur gewählten Marke zurück, wie heute. Ein Stift-Klick während des Neubaus wird nicht verloren: Die Marke wird vorgemerkt und gilt, sobald die neue Seite da ist. Gibt es die Marke nicht mehr, schließt die Schublade.
6. **Deckblatt:** Es hat im Kern keine Marke und bekommt deshalb **keinen Stift-Knopf in der Vorschau**. Es bleibt über die Gliederung erreichbar. *Abweichung zur Spezifikation (Deckblatt hat Knopf):* Ein Knopf am Deckblatt bräuchte eine Kern-Änderung. Das lohnt für ein einmaliges Element nicht und kann später nachgeholt werden.
7. **Vollbreite Vorschau** blendet Gliederung und Schublade aus (reine Anzeige, der Auswahlzustand bleibt).
8. **Gemerkter Zustand der Gliederung** liegt im Browser (wie andere kleine Vorlieben in der App), nicht im Konto. Eine Konto-Einstellung wäre für „Liste auf oder zu“ übertrieben.
9. **Designregeln:** Farben ausschließlich über die `ws-*`-Tokens, Bedienelemente mind. 44 px, Animationen ≤ 200 ms und bei „Bewegung reduzieren“ aus (DESIGN.md, Lehrkräfte-Bereich). Die Knöpfe *innerhalb* der Seite haben ihr eigenes kleines Farbschema im Seitenstil, weil dort kein Tailwind gilt. Sie sind hell genug für Kontrast ≥ 4,5 : 1.

### D) Aufteilung der Arbeit
Das Feature ist ein Paket, sollte aber in dieser Reihenfolge gebaut und einzeln geprüft werden, weil Schritt 2 das Risiko trägt:
1. **Nachricht Vorschau → App** mit Absender- und Mustertest, Stift-Knöpfe und Hervorhebung im eingefügten Skript. Noch ohne Schublade: Der Klick wählt aus, die Gliederung zeigt es an.
2. **Formulare aus der Gliederung in die Schublade umziehen.** Die Gliederung wählt nur noch aus. Tests für Formular, Rohfassung, Typ-wechseln und Text-Editor müssen weiter laufen.
3. **Layout:** Gliederung eingeklappt (mit Merken), angedockte Schublade ab 1024 px, Blatt von unten darunter, Vollbreite-Knopf.
4. **Feinschliff:** Randfälle (Neubau, Blockwechsel, verschwundener Block), Tastatur, Fokus, Handy.

### E) Neue Pakete
- **Keine.** `Sheet` (shadcn) ist bereits installiert, ebenso `Collapsible` und `Tooltip`.

### F) Risiken
- **Mittel:** Das Umziehen der Formulare (Schritt 2). Die Gliederung hat über 1000 Zeilen, und Drag-and-drop, Katalog, Bilddialog und Typ-wechseln hängen am Formularort. Gegenmittel: Formular-Bausteine unverändert lassen, nur den Einhängeort ändern; vorhandene Tests (Formulare, Text-Editor, Typ wechseln, Katalog) vorab grün halten.
- **Niedrig:** Der Stift-Knopf in sehr hohen Blöcken oder beim Überlagern von Block und Thema. Gegenmittel: Knopf klebt am Blockanfang, pro Marke genau einer.
- **Niedrig:** Ein älterer Kern ohne Marken. Dann gibt es keine Knöpfe, und die Gliederung bleibt vollwertig erreichbar.

### G) Auswirkungen auf andere Features
- PROJ-89, PROJ-90, PROJ-95: gleiche Formulare und Funktionen, nur an neuem Ort. Texte in Tests, die „Formular unter dem Block“ voraussetzen, müssen angepasst werden.
- PROJ-92: Platzanzeige bleibt in der Vorschau-Kopfzeile.
- Kern-Repo, Datenbank, Veröffentlichen, Link, Regal: **nicht berührt.**

## Implementation Notes (Frontend, 2026-11-12)
**Gebaut** – reines Frontend, kein Kern, keine API, keine Migration.

**Neue Dateien** (alle in `src/components/werkzeugkiste/editor/`)
- `vorschau-skript.ts`: Hilfsskript der Vorschau (zieht aus `use-editor-zustand.ts` um) mit Stift-Knöpfen, Hervorhebung, Scroll-Meldung und „bereit“-Meldung. Dazu `auswahlAusMarke()`, die eine Marke aus der Seite in eine Auswahl übersetzt und alles Fremde verwirft.
- `editor-schublade.tsx`: Schublade mit Kopf und Inhalt. Hierhin zogen um: Deckblatt-, Thema-, Block- und Lernzielkontrolle-Formular samt Rohfassung, „Typ wechseln“ und Tabelle-herauslösen. Dazu `gueltigeAuswahl()`.

**Geändert**
- `editor-gliederung.tsx`: Zeilen wählen nur noch aus (`aria-current` statt `aria-expanded`), keine Formulare mehr in der Liste. Kein eigener Bilder-Provider mehr, `Aendere`/`GliederungProps` werden exportiert.
- `editor-vorschau.tsx`: Nachrichten-Weg in beide Richtungen, Knopf „Vorschau über die ganze Breite“, Hinweis „Bitte gleich noch einmal klicken“.
- `use-editor-zustand.ts`: Hook liefert zusätzlich `gebautFuer` (für welchen Speicherstand die gezeigte Seite gebaut wurde).
- `baukasten-editor.tsx`: neues Layout, Zustand der Gliederung (gemerkt unter `wk-editor-gliederung`), Vollbreite, Auswahl aus der Vorschau, Schublade, Bilder-Provider für Gliederung und Schublade.

**Entscheidungen beim Bauen**
- **Scrollposition bleibt stabil (offene Frage aus der Architektur):** Die Seite meldet ihre Scrollposition, die App schickt sie nach einem Neubau zurück, sobald die neue Seite „bereit“ meldet. Das ersetzt die frühere Wartezeit von 150 ms.
- **Veraltete Vorschau:** Ein Klick wird nur angenommen, wenn die gezeigte Seite zum gespeicherten Entwurf passt (nicht beim Bauen, nicht bei ungespeicherten Änderungen, nicht zwischen Speichern und Neubau). Sonst erscheint in der Vorschau-Kopfzeile ein Hinweis. Das verhindert eine falsche Stelle, weil die Marken Themen und Blöcke durchzählen.
- **Gewählter Block verschwindet** (Löschen, Rückgängig, Neubau): Die Schublade schließt sich. Es springt nicht auf einen Nachbarn.
- **Kam die Auswahl aus der Seite**, springt die Vorschau nicht zum Block (er ist ja schon zu sehen), sonst scrollt sie wie bisher hin.
- **Stift-Knopf an hohen Blöcken:** Er wandert beim Scrollen mit, solange der Block im Bild ist (kein CSS-`sticky`, damit der Seitenaufbau nie verschoben wird).
- **Fokus:** Beim Wechsel der Stelle zieht der Fokus in die Schublade, außer ein Feld darin hat ihn schon (z. B. der Titel eines Themas). Esc schließt, aber nicht, wenn es nur einen Dialog darüber schließt.
- **Unter 1280 px mit offener Schublade** blendet sich die Gliederung selbst aus (Streifen bleibt), damit die Vorschau mindestens 30 rem breit bleibt. Der Knopf im Streifen schließt dann die Schublade und zeigt die Liste.

**Abweichungen von der Spezifikation** (aus dem Tech Design bestätigt, siehe dort)
- Schublade am Desktop angedockt als dritte Spalte statt über der Vorschau.
- Kein Stift-Knopf am Deckblatt (im Kern keine Marke). Es bleibt über die Gliederung erreichbar.
- **Neu, nicht im Tech Design:** Auf dem Handy lässt sich das Blatt **nicht per Wischen nach unten** schließen. Das shadcn-`Sheet` kann es nicht. Es schließt per Knopf, Esc und Tipp daneben.

**Tests:** 15 neue Tests in `baukasten-editor.test.tsx` (Gliederung ein-/ausklappen und merken, Speicher gesperrt, Schublade öffnen/schließen/Esc, Auswahl aus der Vorschau, fremder Absender und ungültige Marken, veraltete Vorschau, Vollbreite, Löschen, Handy-Blatt, Marken-Parser, Hilfsskript in jsdom ausgeführt). Bestehende Tests: nur der gemerkte Startzustand der Gliederung wurde gesetzt (sie startet jetzt zu). Gesamte Suite: 3382 Tests grün, `tsc` und `npm run build` ohne Fehler.

**Noch offen**
- **Browser-Test** (kein Dev-Server wegen Absturzgefahr): Stift-Knöpfe in der echten Seite, Hover/Touch, Hervorhebung, Scrollposition nach Neubau, Layout bei 1024–1280 px, Blatt auf dem Handy. Die Skript-Logik ist in jsdom geprüft, aber nicht in einem echten Browser.
- Der Fehler mit sichtbaren `<p>`-Tags in „Wörter ziehen“ nach „Typ wechseln“ ist weiter separat zu beheben (Bugfix an PROJ-95).

## QA Test Results
**Datum:** 2026-11-12 · **Geprüft von:** /qa (Code-Durchsicht, Unit-Tests, statisches Browser-Rendering)
**Methode:** Kein Dev-Server und kein Playwright (Absturzgefahr am MacBook). Stattdessen: Durchsicht aller PROJ-96-Dateien, gesamte Vitest-Suite, `tsc`, ESLint, eine echte Kern-Vorschau (`seite.py`, `marken=True`, Heft 2 Haftung) mit dem eingefügten Hilfsskript als Bildschirmfoto in Chrome ohne Fenster (Knöpfe dauerhaft eingeblendet wie auf Touch-Geräten).

### Automatische Prüfungen
- `npm test`: **269 Dateien, 3385 Tests grün** (inkl. 15 neue Editor-Tests aus dem Frontend).
- Neu von QA: `editor-schublade.test.ts` (2 Tests, `gueltigeAuswahl`: vorhandene Stellen, gelöschte/fehlende Stellen).
- `tsc --noEmit`: ohne Fehler. ESLint im Editor-Ordner: 0 Fehler, 5 Warnungen (Altbestand: dnd-kit `isOver`, `setState` im Lade-Effekt, `aria-disabled` an `section`).
- E2E (Playwright): **nicht ausgeführt** (siehe Methode).

### Prüfseite für den Browser-Test
[docs/vorschau/proj96-pruefseite.html](../docs/vorschau/proj96-pruefseite.html): echte Kern-Vorschau mit Hilfsskript im abgeschotteten Rahmen (`sandbox="allow-scripts"`), daneben ein Protokoll der Nachrichten. Per Doppelklick öffnen, kein Server nötig. Damit lassen sich Hover, Stift-Klick, Hervorhebung, „Neubau simulieren“ (Scrollposition) und Touch in Chrome, Firefox, Safari und auf dem iPhone (per AirDrop/Dateien) prüfen.

### Acceptance Criteria
| Bereich | Kriterium | Ergebnis |
|---|---|---|
| Layout | Vorschau volle Breite, Gliederung als Streifen mit Aufklapp-Knopf (`aria-label`, `title`) | ✅ Code + Test |
| Layout | Aufklappen/Einklappen, Gliederung unverändert bedienbar | ✅ Test |
| Layout | Zustand gemerkt (`wk-editor-gliederung`), erstes Mal zu, Speicher gesperrt → zu | ✅ Test |
| Layout | Knopf „Vollbreite Vorschau“ und zurück | ✅ Test · ⚠️ siehe BUG-1 |
| Layout | Vorschau-Kopfzeile mit Platzanzeige bleibt | ✅ Code |
| Auswahl | Stift-Knopf an Themen, Blöcken, Lernzielkontrolle mit `aria-label` | ✅ Bildschirmfoto + Test · Deckblatt ohne Knopf (bestätigte Abweichung) |
| Auswahl | Klick schickt Marke, App wählt aus, Schublade öffnet | ✅ Test · ❌ im Vollbreite-Modus (BUG-1) |
| Auswahl | Klick auf den Block selbst wählt nicht aus | ✅ Test (Klick-Abfang nur an `.wk-k`, Weitergabe an Seitenskripte gestoppt) · ⚠️ Knopf überdeckt Teile des Blocks (BUG-4) |
| Auswahl | Hervorhebung, bleibt im Sichtfeld | ✅ Code (`wk-aktiv`, `still`-Sprung) · im echten Browser offen |
| Auswahl | Nur eigener Rahmen (`event.source`), nur gültige Marke | ✅ Test + Durchsicht |
| Auswahl | Knöpfe nur in der Vorschau | ✅ Skript nur in `useEditorVorschau`; Veröffentlichen/Download/Link/Regal unberührt; `@media print` blendet aus |
| Schublade | Kopf mit Typ und Titel, Schließen, Formular/Rohfassung/Typ wechseln | ✅ Code + Test |
| Schublade | Autosave, Neubau, Rückgängig unverändert | ✅ Test-Suite grün |
| Schublade | Scrollposition bleibt beim Neubau | ✅ Code (Scroll-Meldung + `wkBereit`) · im echten Browser offen |
| Schublade | Anderer Block → Schublade wechselt, nichts geht verloren | ✅ Code (Änderungen gehen sofort über `aendere` in den Entwurf) |
| Schublade | Esc/Schließen/Klick daneben schließt, **Fokus kehrt zurück** | ❌ Fokus kehrt am Desktop nicht zurück (BUG-2); Klick daneben nur auf dem Handy (BUG-3) |
| Schublade | Löschen schließt, Auswahl aus Gliederung öffnet | ✅ Test · ⚠️ Duplizieren davor verschiebt die Auswahl (BUG-7) |
| Handy | Umschalter, Standard Vorschau | ✅ Test |
| Handy | Stift-Knopf immer sichtbar, ≥ 44 × 44 px | ✅ CSS (`hover:none`/`pointer:coarse`) + Bildschirmfoto |
| Handy | Blatt von unten, Knopf/Esc, **Wischen** | ⚠️ Wischen fehlt (BUG-6, dokumentierte Abweichung) |
| Handy | Kein seitliches Scrollen | ✅ Code (`min-w-0`, `max-w` nicht nötig im Blatt) · im echten Browser offen |
| A11y | Fokus in Schublade, Dialog-Verhalten, Rolle/Name | ✅ Handy (`Sheet`) · ⚠️ Desktop: `aside` mit Namen, kein Fokus-Einschluss (BUG-3) |
| A11y | Knöpfe per Tab, sichtbarer Fokus | ✅ CSS (`.wk-k:focus`, `focus-visible`-Rahmen) |
| A11y | Animationen ≤ 200 ms, „Bewegung reduzieren“ | ✅ CSS |
| A11y | `ws-*`-Tokens im Rahmen, Knöpfe in der Seite verschieben nichts | ✅ Durchsicht + Bildschirmfoto |

**Ergebnis:** 21 von 25 erfüllt, 2 nicht erfüllt (Vollbreite + Stift, Fokus-Rückgabe), 2 nur teilweise (Dialog-Verhalten am Desktop, Wischen).

### Edge Cases
- Sehr hoher Block: Knopf wandert beim Scrollen mit (`lage()`), ✅ Code.
- Vorschau baut neu / ungespeichert: Klick wird abgelehnt mit Hinweis, ✅ Test. Keine Auswahl auf veralteter Marke.
- Vorschau-Fehler: ⚠️ BUG-5 (irreführender Hinweis).
- Block verschwindet: Schublade schließt, ✅ Test.
- Kaputter Block: Kern liefert keine Marke, also kein Knopf, Gliederung bleibt, ✅ Code.
- Verschachtelte Knöpfe: Thema-Marke sitzt an der `h2`, nicht am Abschnitt, also nie zwei Knöpfe übereinander. ✅ Kern geprüft.
- Schmales Fenster 1024–1280 px: Gliederung blendet sich bei offener Schublade aus (Mindestbreite 30 rem), ✅ Code (1024 px: 48 + 480 + 352 + Abstände = 960 px, passt).
- Hybrid Touch + Maus: Knopf sichtbar bei Hover oder Tastaturfokus auf dem Knopf, nicht schon bei Fokus irgendwo im Block. Unkritisch.
- Fremde Nachrichten: werden verworfen, ✅ Test.
- Thema ohne Titel / Lernzielkontrolle ohne Titel: Der Kern baut dann keine `h2`, also gibt es keinen Knopf. Erreichbar über die Gliederung. Hinweis, kein Fehler.

### Security-Audit (Red Team)
- **Iframe-Sandbox unverändert** (`allow-scripts` ohne `allow-same-origin`), `referrerPolicy="no-referrer"`. ✅
- **Rückweg Seite → App:** Absender-Prüfung über `e.source === contentWindow`, Marke per Regex, Länge ≤ 40, danach `gueltigeAuswahl` gegen den Entwurf. Riesige Zahlen oder unbekannte Muster ergeben `null`. Die Nachricht kann nur **auswählen**, nie den Entwurf ändern. ✅
- Skripte im Material selbst (gleicher Rahmen) könnten `wkWaehle` senden. Folge: höchstens eine Auswahl im eigenen Editor. Kein Risiko.
- **Einfügen des Skripts:** CSS und Icon per `JSON.stringify`, kein `</script>` im Text. Marke im `querySelector` wird bereinigt. ✅
- App → Seite mit Ziel `'*'` ist nötig (Rahmen ohne Herkunft). Es gehen nur Marke und Scrollzahl hinüber, keine Daten der App. ✅
- Keine neue API, keine DB-Änderung, keine Geheimnisse im Client. ✅

### Bugs
**BUG-1 – Medium: Stift-Klick im Vollbreite-Modus ohne sichtbare Wirkung.**
Schritte: Desktop → „Vorschau über die ganze Breite“ → an einem Block „Bearbeiten“ klicken. Erwartet: Die Schublade öffnet (und Vollbreite endet). Ist: Die Auswahl wird gesetzt und der Block hervorgehoben, die Schublade bleibt aber ausgeblendet (`schubladeZeigen = !vollbreit || istMobil`). Für die Lehrkraft passiert „nichts“. Vorschlag: Ein angenommener Stift-Klick beendet die Vollbreite, oder die Knöpfe werden im Vollbreite-Modus ausgeblendet.

**BUG-2 – Medium (Barrierefreiheit): Fokus kehrt beim Schließen der angedockten Schublade nicht zurück.**
Schritte: Desktop → Block in der Gliederung wählen (oder per Stift) → Esc oder „Bearbeiten schließen“. Erwartet laut AC: Fokus auf das auslösende Element bzw. die Zeile in der Gliederung. Ist: Die `aside` wird entfernt, und der Fokus fällt auf `body`. Tastaturnutzer verlieren ihre Stelle. Auf dem Handy erledigt das `Sheet` das selbst.

**BUG-3 – Low: Angedockte Schublade ohne „Klick daneben schließt“ und ohne Fokus-Einschluss.**
AC verlangt Dialog-Verhalten. Die Architektur hat bewusst „angedockt, Vorschau bleibt bedienbar“ gewählt, was einem Fokus-Einschluss widerspricht. Vorschlag: AC an die Entscheidung anpassen (nicht modal, `aside` mit Namen), statt Code zu ändern. **Entscheidung des Nutzers nötig.**

**BUG-4 – Low: Stift-Knopf überdeckt Teile des Blocks.**
Bildschirmfoto (Touch, 800 px): Der Knopf (`top:8px; right:8px`) liegt über der rechten Ecke der Aufgaben-Kopfzeile, wo nach dem Lösen „gelöst“ steht, und teils über der ersten Textzeile oder der ersten Aufklapp-Leiste (Aufgabe 5: „Transportstrecke.“ halb verdeckt). Auf Touch-Geräten ist das dauerhaft so, am Desktop beim Darüberfahren. Ein Tipp auf diese Stelle wählt aus, statt die Aufgabe zu bedienen. Vorschlag: Bei Aufgaben den Knopf in die Kopfzeile vor `.stand` setzen, auf Touch nur das Icon (44 × 44 px) ohne Wort.

**BUG-5 – Low: Irreführender Hinweis nach fehlgeschlagenem Neubau.**
Schlägt ein Neubau fehl, bleibt die alte Seite stehen (`gebautFuer` ≠ `gespeichertAm`). Jeder Stift-Klick wird abgelehnt mit „Die Vorschau wird gerade aktualisiert. Bitte gleich noch einmal klicken.“, obwohl nichts aktualisiert wird. Erst „Erneut versuchen“ hilft. Vorschlag: Bei `fehler` lautet der Hinweis „Vorschau nicht aktuell – bitte ‚Erneut versuchen‘ oder über die Gliederung wählen“.

**BUG-6 – Low: Blatt auf dem Handy lässt sich nicht nach unten wischen.**
Von Frontend dokumentierte Abweichung (shadcn `Sheet` kann es nicht). Schließen per Knopf, Esc und Tipp daneben geht. Vorschlag: so lassen und AC anpassen, oder auf shadcn `Drawer` (vaul) wechseln.

**BUG-7 – Low (Altbestand aus PROJ-89): Auswahl hängt an der Position.**
Schritte: Block 4 eines Themas wählen (Schublade offen) → in der Gliederung Block 2 duplizieren (die Kopie landet an Stelle 3). Ist: Die Schublade zeigt jetzt den früheren Block 3. Der Kopf wechselt den Titel, aber ohne Hinweis. Gleiches gilt für Rückgängig nach dem Einfügen oberhalb und für „Thema duplizieren“ vor dem gewählten Thema. Es gehen keine Daten verloren, aber man bearbeitet leicht den falschen Block.

### Regression
- PROJ-89/90/91/92/95: alle bestehenden Tests (Formulare, Text-Editor, Katalog, Bilder, Tabelle/Diagramm, Typ wechseln) grün. Die Formulare sind unverändert, nur der Ort ist neu.
- Veröffentlichte Seite, Download, Link, Regal: kein Code-Pfad nutzt `mitSprungSkript` außer der Editor-Vorschau. ✅
- Kern: unberührt (nur gelesen).

### Noch offen (Browser durch den Nutzer)
Mit der Prüfseite oder im Editor nach dem Deploy: Hover am Desktop, Stift-Klick, Hervorhebung, Scrollposition nach „Neubau simulieren“, Firefox und Safari, iPhone (Knopf 44 px, Blatt von unten, kein seitliches Scrollen), Layout bei 1024 px und 1280 px.

### Nachtest nach Korrekturen (2026-11-12)
Nutzer: „gerne weiter bis deploy“. Behoben:
- **BUG-1** ✅ Ein angenommener Stift-Klick beendet die Vollbreite (`beiVorschauWahl`), Test ergänzt.
- **BUG-2** ✅ `schliesseSchublade()` setzt den Fokus auf die gewählte Zeile, sonst „Gliederung einblenden“, sonst die Vorschau (nur Desktop). Test prüft, dass der Fokus nicht auf `body` fällt (jsdom kennt `offsetParent` nicht, getestet wird also der Rückfall).
- **BUG-4** ✅ teilweise: Bei Aufgaben sitzt der Knopf 110 px vom rechten Rand in der Kopfzeile und lässt „gelöst“ frei. Bei Lehrtexten bleibt er rechts oben.
- **BUG-5** ✅ Nach fehlgeschlagenem Neubau steht ein eigener Hinweis („Die Vorschau ist nicht aktuell. Bitte ‚Erneut versuchen‘ klicken oder die Stelle in der Gliederung wählen.“), Test ergänzt.
- **BUG-3, BUG-6** → bewusste Abweichung, Acceptance Criteria angepasst (siehe oben).
- **BUG-7** bleibt offen (Altbestand aus PROJ-89, Low, kein Datenverlust). Eigenes Ticket bei Bedarf.
Tests: alle Editor-Tests grün, neue Tests für BUG-1/2/5.

### Entscheidung
**Formal production-ready: JA.** Es gibt keine Critical- oder High-Bugs. **Empfehlung: erst BUG-1 und BUG-2 beheben** (beide klein), weil sie je ein Acceptance Criterion verletzen. BUG-3 und BUG-6 per Entscheidung in der Spezifikation klären. **Nach Nachtest: Approved, danach deployt.**

## Deployment
**Live seit 2026-11-12** (Commit abc07ac, Vercel-Production `spedilern`, Build „Ready“). Kein Kern-Deploy, keine Migration. Routen ohne Login geprüft. Mit ausgeliefert: der lokale Statuscommit zu PROJ-95 (nur Doku).

**Offen:** Browser-Test durch den Nutzer (Hover, Stift-Klick, Hervorhebung, Scrollposition nach Neubau, Firefox/Safari/iPhone), am besten mit [docs/vorschau/proj96-pruefseite.html](../docs/vorschau/proj96-pruefseite.html) und im Editor. BUG-7 (Auswahl hängt an der Position beim Duplizieren) bleibt als Low-Altlast.
