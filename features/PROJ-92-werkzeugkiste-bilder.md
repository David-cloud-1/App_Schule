# PROJ-92: Werkzeugkiste – Baukasten: Bilder hochladen und aus dem Skript übernehmen

## Status: Deployed
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Im Baukasten-Editor kann die Lehrkraft Bild-Blöcke einfügen oder austauschen, entweder mit einem eigenen hochgeladenen Bild oder mit einem Bild aus ihrem Skript, und das Bild zuschneiden, drehen und in der Breite wählen.

## Kontext
- Entscheidung E4 aus PROJ-89: eigene Bilder hochladen **und** Bilder aus dem Skript, auch solche, die die KI nicht verwendet hat.
- Bilder sind heute `image`-Blöcke mit `path` auf ein beim Einlesen gespeichertes Bild (`images/…`). Beim Fertigstellen speichert die App zusätzlich einen „Bilder-Auszug“ mit den verwendeten Bildern (PROJ-53). Das Skript wird nach 12 Monaten entfernt (PROJ-52), Regal-Kopien haben gar keins.
- `seite.py` bettet Bilder als Base64 ein, verkleinert ab 350 KB und lehnt Seiten über 8 MB ab.
- Hochgeladene Bilder zählen gegen die 2-GB-Grenze je Konto.

## Entscheidungen (2026-11-12)
- **F1 – Formate:** PNG, JPG, WebP. Kein SVG (kann Skripte enthalten), kein GIF.
- **F2 – Bearbeitung:** Breite wählen, Drehen (90°-Schritte) **und** Zuschneiden, direkt im Browser. Das Original bleibt erhalten, das bearbeitete Ergebnis wird als neues Bild gespeichert.
- **F3 – Ohne Skript:** Die Galerie zeigt nur den Bilder-Auszug, mit Hinweis „Weitere Bilder aus dem Skript sind nicht mehr verfügbar.“ Hochladen geht immer.
- **F4 – Alternativtext:** Pflicht beim Einfügen und Austauschen, Bildunterschrift optional. Bei Skript-Bildern wird ein vorhandener Text vorausgefüllt.

## User Stories
- Als Lehrkraft möchte ich ein eigenes Bild (Foto, Screenshot, Grafik) in mein Material einfügen, damit ich es nicht nur mit KI-Bildern aus dem Skript gestalten muss.
- Als Lehrkraft möchte ich aus allen Bildern meines Skripts wählen, auch aus solchen, die die KI nicht verwendet hat, damit eine wichtige Abbildung nicht fehlt.
- Als Lehrkraft möchte ich ein falsch gewähltes Bild in einem vorhandenen Bild-Block austauschen, ohne den Block neu anzulegen.
- Als Lehrkraft möchte ich ein Bild zuschneiden, drehen und in der Breite anpassen (ganz, halb, klein), damit es auf dem Handy der Azubis gut aussieht.
- Als Lehrkraft möchte ich sehen, wie viel der 8-MB-Grenze die Seite schon belegt, damit das Veröffentlichen nicht erst am Ende scheitert.
- Als Lehrkraft mit Regal-Kopie (ohne Skript) möchte ich weiterhin Bilder hochladen und die verwendeten Bilder austauschen können.

## Acceptance Criteria
**Hochladen**
- [ ] Im Editor gibt es „Bild einfügen“ (neuer Block) und „Bild austauschen“ (in vorhandenem Bild-Block), jeweils mit den Wegen „Hochladen“ und „Aus dem Skript“.
- [ ] Erlaubt sind PNG, JPG, WebP. Die Prüfung erfolgt am Dateiinhalt, nicht nur an der Endung. Andere Dateien werden mit „Dieses Format wird nicht unterstützt. Erlaubt sind PNG, JPG und WebP.“ abgelehnt.
- [ ] Eine Datei ist höchstens 10 MB groß (vor der Verkleinerung). Größere Dateien werden abgelehnt mit klarer Meldung.
- [ ] Große Bilder werden vor dem Speichern im Browser auf eine vernünftige Kantenlänge verkleinert; der Bildinhalt bleibt erkennbar.
- [ ] Hochladen per Dateiauswahl und per Ziehen auf den Block; auf dem Handy auch mit der Kamera/Fotoauswahl.
- [ ] Der Fortschritt ist sichtbar; bei Fehler bleibt der Block unverändert und es erscheint „Erneut versuchen“.

**Alternativtext & Beschriftung**
- [ ] „Übernehmen“ ist gesperrt, solange der Alternativtext leer ist; ein Hinweis erklärt, warum.
- [ ] Die Bildunterschrift ist optional.
- [ ] Bei Bildern aus dem Skript wird ein vorhandener Text vorausgefüllt, bleibt aber änderbar.

**Galerie „Bilder aus dem Skript“**
- [ ] Zeigt alle beim Einlesen gefundenen Bilder als Vorschaubilder; bereits im Material verwendete sind markiert („Verwendet“).
- [ ] Ein Klick wählt das Bild; dasselbe Bild darf mehrfach verwendet werden.
- [ ] Ist das Skript entfernt oder fehlt es (Regal-Kopie), zeigt die Galerie nur den Bilder-Auszug samt Hinweis aus F3.
- [ ] Gibt es gar keine Bilder, erscheint ein Leerzustand mit der Aktion „Bild hochladen“.

**Bearbeiten**
- [ ] Breite wählbar: Ganz, Halb, Klein (`AdminSegmented`, bis 4 Werte).
- [ ] Drehen in 90°-Schritten links/rechts.
- [ ] Zuschneiden mit verschiebbarem Rahmen, auf dem Handy per Touch bedienbar, Bedienelemente mind. 44 px.
- [ ] „Zurücksetzen“ stellt das Original wieder her. Die Bearbeitung verändert nie das Original-Bild im Skript.
- [ ] Die Vorschau der Seite zeigt das bearbeitete Bild in der gewählten Breite.

**Platzbedarf**
- [ ] Der Editor zeigt „Seite: N MB von 8 MB“ (Balken). Ab 80 % färbt er sich warnend (Orange), ab 100 % rot mit Hinweis.
- [ ] Beim Hochladen wird vorher geprüft, ob die Seite damit über 8 MB wüchse; dann Warnung, nicht stilles Scheitern.

**Speicher & Regal**
- [ ] Hochgeladene Bilder zählen gegen die 2-GB-Grenze des Kontos; ist sie erreicht, erscheint die bekannte Speicher-Meldung und der Upload wird nicht angenommen.
- [ ] Hochgeladene Bilder werden in den Bilder-Auszug aufgenommen, damit sie nach Entfernen des Skripts und in Regal-Kopien erhalten bleiben.
- [ ] Wird ein Bild nirgends mehr verwendet, wird es beim Veröffentlichen aus dem Auszug entfernt (kein Speicher-Leak).

**Sicherheit**
- [ ] Nur die Besitzerin/der Besitzer des Materials (bzw. wer es bearbeiten darf) kann Bilder hochladen oder wählen.
- [ ] Dateiname und Pfad werden serverseitig vergeben; Client-Pfade werden nie zum Lesen von Dateien genutzt (Lehre aus BUG-7 in PROJ-89).
- [ ] Alternativtext und Unterschrift werden beim Bau der Seite maskiert.

## Edge Cases
- **Animierte WebP / Bild mit Transparenz:** Wird als Standbild bzw. mit Transparenz übernommen; keine Fehlermeldung.
- **Foto mit EXIF-Drehung (Handy):** Wird beim Laden richtig ausgerichtet; Standortdaten (EXIF) werden entfernt.
- **Datei mit falscher Endung** (z. B. `.png`, aber ausführbar/HTML): Abgelehnt, weil der Inhalt nicht passt.
- **Sehr kleines Bild (< 100 px):** Wird angenommen, mit Hinweis „Das Bild ist sehr klein und wirkt unscharf.“
- **Zwei Browser-Tabs / gleichzeitiges Speichern:** Es gilt der Stand-Vergleich aus PROJ-89; ein Bild wird nur dem Entwurf zugefügt, der Upload selbst geht nicht verloren.
- **Verbindung bricht beim Upload ab:** Block unverändert, keine halbfertige Datei im Speicher.
- **Austauschen eines Bildes, das in `bildzuordnung` (Punkte auf dem Bild) steckt:** Es erscheint eine Warnung, dass die Punkte neu gesetzt werden müssen (Austausch möglich). Das Formular der Bildzuordnung selbst gehört zu PROJ-90.
- **Bild fehlt (Datei weg):** Bestehendes Verhalten aus PROJ-89 bleibt: „Bild fehlt“ im Block, Platzhalter in der Vorschau; „Austauschen“ ist dort der Weg zur Reparatur.
- **Zuschneiden auf winzigen Ausschnitt:** Mindestgröße des Rahmens; darunter nicht übernehmbar.
- **Seite würde durch das Bild 8 MB überschreiten:** Warnung vor dem Übernehmen; Veröffentlichen bleibt wie in PROJ-89 gesperrt.
- **Material wurde inzwischen aus dem Regal entfernt/geändert:** Hochladen geht nur im eigenen Material.

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst)
- Berührt: PROJ-52 (Speicher, 12-Monats-Regel), PROJ-53 (Bilder-Auszug bei Regal-Kopien), PROJ-90 (Bildzuordnung), PROJ-91 (Seitengröße gemeinsam mit Diagramm)

## Abgrenzung
- Diagramme → PROJ-91
- Bildzuordnung (`bildzuordnung`) mit Punkten auf dem Bild: Formular kommt mit PROJ-90
- Bilder per KI erzeugen: nicht Teil dieses Features
- Bildbearbeitung über Drehen, Zuschneiden und Breite hinaus (Filter, Zeichnen, Pfeile): nicht Teil dieses Features
- SVG, GIF und Videos: nicht unterstützt

## Technical Requirements
- Performance: Verkleinern/Zuschneiden im Browser, Upload eines 10-MB-Fotos auf dem Handy in unter ca. 10 s.
- Sicherheit: Inhaltsprüfung serverseitig, Berechtigung wie bei den Editor-Routen, keine Pfadübernahme vom Client.
- Browser: Aktuelles Chrome, Safari (iOS) und Firefox.
- Barrierefreiheit: Zuschneiden auch per Tastatur bedienbar; Alternativtext Pflicht.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Was schon da ist (und wiederverwendet wird)
- Der Bild-Block kennt bereits **Bildname, Alternativtext, Unterschrift und Breite** (z. B. 100 %). Es braucht kein neues Datenfeld im Entwurf.
- Die Bildauswahl für Bild-Block und Bildzuordnung (PROJ-90, `material-bilder`) lädt schon alle Bilder des Skripts bzw. des Bilder-Auszugs mit Vorschau. Sie wird zur Galerie erweitert, nicht neu gebaut.
- Die Editor-Vorschau meldet nach jedem Bau schon die Seitengröße; daraus wird die 8-MB-Anzeige.
- Speichergrenze (2 GB), Speicherzähler und das Aufräumen nach 12 Monaten gibt es (PROJ-52). Das Aufräumen löscht nur `skript.*` und `einlesung.zip`, eigene Bilder bleiben also stehen.

### A) Bausteine der Oberfläche
```
Baukasten-Editor (vorhanden)
+-- Kopfleiste
|   +-- NEU: Platzanzeige „Seite: 3,2 MB von 8 MB“ (Balken, ab 80 % orange, ab 100 % rot)
+-- Gliederung / Block-Formular „Bild“ (vorhanden, erweitert)
|   +-- Vorschaubild des Blocks
|   +-- Alternativtext (Pflicht) und Unterschrift
|   +-- NEU: Breite (Ganz / Halb / Klein)
|   +-- NEU: Knopf „Bild austauschen“ und „Bild bearbeiten“
+-- Katalog „Block einfügen“ (vorhanden)
|   +-- NEU: Eintrag „Bild“ führt direkt in den Bild-Dialog
+-- NEU: Bild-Dialog (ein Dialog für Einfügen und Austauschen)
    +-- Reiter „Hochladen“
    |   +-- Ablagefläche / Dateiauswahl / Kamera (Handy)
    |   +-- Fortschrittsanzeige, Fehlermeldung mit „Erneut versuchen“
    +-- Reiter „Aus dem Skript“
    |   +-- Galerie mit Vorschaubildern, „Verwendet“-Marke
    |   +-- Hinweis, wenn das Skript nicht mehr da ist
    |   +-- Leerzustand mit Knopf „Bild hochladen“
    +-- Schritt „Bearbeiten“ (nach der Wahl)
    |   +-- Zuschneiden (Rahmen, Touch und Tastatur)
    |   +-- Drehen links / rechts
    |   +-- Zurücksetzen
    |   +-- Alternativtext (Pflicht), Unterschrift, Breite
    |   +-- Hinweis, wenn die Seite dadurch über 8 MB wüchse
    +-- Knopf „Übernehmen“ (gesperrt ohne Alternativtext)
```
Alles aus bestehenden Bausteinen (Dialog, Reiter `AdminTabs`, `AdminSegmented`, Fortschrittsbalken, Toast). Nur das **Zuschneiden** braucht eine eigene Komponente.

### B) Wo die Bilder liegen (Datenmodell in Alltagssprache)
**Neu: eigener Bildordner je Material** im bestehenden privaten Speicher, neben Ausgabe, Vorschau und Einlesung. Jedes hochgeladene (oder bearbeitete) Bild ist **eine eigene Datei** mit einem von der App vergebenen Namen, der mit `eigen_` beginnt (z. B. `images/eigen_k3x9.jpg`). Pro Bild merkt sich die App nur: Name, Maße (Breite × Höhe), Dateigröße, Zeitpunkt.

Warum eigene Dateien statt ein Paket: Zwei gleichzeitige Uploads können sich nicht überschreiben, Löschen ist trivial, und die Liste für die Galerie ist einfach der Ordner.

Es gibt **keine neue Datenbanktabelle**. Der Bildname steht wie bisher im Bild-Block des Entwurfs; Alternativtext, Unterschrift und Breite ebenfalls.

Bearbeiten (Zuschneiden/Drehen) macht der Browser. Heraus kommt immer ein **neues** Bild; das Skript-Original bleibt unberührt im Skript.

### C) Wie die Teile zusammenspielen
1. **Vorbereiten im Browser:** Das gewählte Bild wird im Browser geladen, nach EXIF-Drehung ausgerichtet, nach dem Bearbeiten auf höchstens ca. 1 800 Pixel Kantenlänge verkleinert und neu als JPEG (bzw. PNG bei Transparenz) gespeichert. Ergebnis liegt deutlich unter 4 MB. So passt es durch die App (Vercel erlaubt höchstens 4,5 MB je Anfrage). Das Original (bis 10 MB) verlässt den Browser nie.
2. **Hochladen:** Der Browser schickt das fertige Bild an eine neue Route des Editors. Die App prüft Anmeldung, Zugriff auf das Material, Speichergrenze (2 GB) und die Höchstzahl (30 eigene Bilder je Material).
3. **Prüfen durch den Kern:** Die App legt das Bild kurz zwischen; der Kern (Python mit Bildbibliothek, wie bisher für Skript-Bilder) öffnet es **wirklich als Bild**, lehnt Kaputtes und Verkleidetes ab (falsche Endung, HTML, SVG, übergroße Pixelzahl), entfernt Metadaten wie den Standort und legt das saubere Bild im Bildordner ab. Er meldet Maße und ein kleines Vorschaubild zurück.
4. **Galerie:** Die bestehende Bilderliste liefert künftig Skript-Bilder, Bilder aus dem Bilder-Auszug **und** eigene Bilder, mit Marke „Verwendet“ (Abgleich mit dem Entwurf).
5. **Bauen (Vorschau und Veröffentlichen):** Die App übergibt dem Kern zusätzlich Leseadressen **nur der eigenen Bilder, die der Entwurf wirklich benutzt**. Der Kern führt sie mit den Skript-Bildern zusammen. Die Namen können nicht kollidieren (`eigen_`). Das Verkleinern ab 350 KB und das 8-MB-Limit bleiben unverändert.
6. **Veröffentlichen:** Der Bilder-Auszug (für Regal-Kopien) nimmt künftig auch die benutzten eigenen Bilder auf. Eigene Bilder, die nirgends mehr im Entwurf stehen, werden gelöscht. Danach wird der Speicherzähler aktualisiert.
7. **Platzanzeige:** Nach jedem Vorschau-Bau steht die Seitengröße fest. Beim Hochladen wird zusätzlich abgeschätzt (alte Größe + eingebettete Größe des neuen Bildes, höchstens ca. 400 KB), ob die 8 MB reißen, und gewarnt, bevor „Übernehmen“ geht.
8. **Material löschen:** Der Bildordner liegt im Ordner des Materials und verschwindet mit ihm.

### D) Entscheidungen und Begründungen
| Entscheidung | Warum |
|---|---|
| **Bearbeiten im Browser, nicht im Kern** | Sofortige Rückmeldung beim Ziehen des Rahmens, kein Netz-Hin-und-Her, kein Rechenaufwand auf dem Server. |
| **Browser verkleinert vor dem Hochladen** | Hält jede Anfrage unter dem Vercel-Limit und spart dem Konto Speicher. Für eine Lernseite auf dem Handy reichen ca. 1 800 Pixel. |
| **Der Server vertraut dem Browser nicht** | Der Kern prüft jedes Bild erneut am Inhalt, auch wenn der Browser es schon sauber gemacht hat (Lehre aus BUG-7 in PROJ-89: nie Pfade oder Dateien des Clients ungeprüft verwenden). |
| **Namen vergibt immer die App** | Es kann kein Pfad wie `../` eingeschleust werden; Namen sind eindeutig. |
| **Keine neue Tabelle** | Dateien im Speicher + Name im Entwurf genügen. Keine neue Rechteverwaltung (RLS) nötig, es gelten die vorhandenen Regeln des Materials. |
| **Eigene Bilder in den Bilder-Auszug aufnehmen** | Sonst fehlen sie in Regal-Kopien, wie schon bei Skript-Bildern gelöst. |
| **Nur benutzte Bilder an den Kern geben** | Der Bau bleibt schnell, auch wenn 30 Bilder hochgeladen wurden. |
| **Zuschneiden mit fertiger Bibliothek** | Touch, Tastatur und Zoom sind aufwendig und fehleranfällig; ein erprobtes Paket ist günstiger als Eigenbau. |

### E) Abweichung von der Spec
- „Zurücksetzen“ stellt das Original **innerhalb des Dialogs** wieder her. Von hochgeladenen Bildern wird das unbearbeitete Original **nicht dauerhaft** gespeichert (spart Speicher). Wer ein Bild später nochmals bearbeitet, bearbeitet das gespeicherte Ergebnis; wer das Original zurückwill, lädt es neu hoch. Bei Skript-Bildern geht das Original immer wieder aus dem Skript bzw. Auszug zu holen.

### F) Was der Kern (Python-Projekt `Werkzeugkiste`) bekommt
- Ein neuer Aufruf „Bild prüfen und ablegen“ (öffnen, Format/Pixelgrenze prüfen, Metadaten entfernen, Vorschaubild).
- Der Aufruf zum Bauen akzeptiert zusätzlich eine Liste eigener Bilder (Name + Leseadresse) und mischt sie in die Bilder des Skripts.
- Neuer Kern-Stand muss **vor** der App live gehen (wie bei PROJ-91), alte App-Stände ohne die Liste funktionieren weiter.

### G) Abhängigkeiten (Pakete)
- `react-easy-crop` – Zuschneiden mit Zoom, Touch und Tastatur.
- Kern: keine neuen Pakete (Bildbibliothek ist schon dabei, sie verkleinert Bilder heute schon).

### H) Risiken / worauf beim Bau zu achten ist
- **Server/Client-Grenze:** Icons nur als fertiges Element an Client-Komponenten übergeben (Produktions-500-Falle).
- **Zeitstempel-Vergleich** beim Speichern des Entwurfs bleibt wie in PROJ-89 (`+00:00` gegen `Z`).
- **Vorschaubilder im Editor** kommen als eingebettete Adresse (wie bisher), nicht als Link, damit keine Browser-Sicherheitsregel sie blockiert.
- **Mobile Safari:** Große Fotos im Browser verkleinern kann Speicherprobleme machen; Verkleinern in zwei Stufen und Fehler abfangen („Das Bild ist zu groß für dieses Gerät“).
- **Neue Routen** brauchen den Eintrag in beiden Freigabelisten für Lehrkräfte (`roles.ts`), die Wächter-Tests prüfen das.

### I) Aufteilung für den Bau
1. **Kern:** Bild prüfen/ablegen + eigene Bilder beim Bauen (mit Tests, Deploy vor App).
2. **App-Server:** Upload-Route, erweiterte Bilderliste, Bau mit eigenen Bildern, Auszug und Aufräumen beim Veröffentlichen.
3. **Oberfläche:** Bild-Dialog (Hochladen, Galerie, Bearbeiten), Bild-Block-Formular, Platzanzeige.

## Umsetzung (2026-11-12)
**Kern** (`Werkzeugkiste`, Zweig `vercel-kern`, Commit 4fcc0f9): neuer Aufruf `/api/editor/bild-ablegen` (`kern_editor.bild_ablegen`): prüft PNG/JPEG am Dateikopf (ohne zu entpacken), begrenzt auf 36 Megapixel bzw. 10 000 px Seitenlänge, verlangt, dass Dateityp und Inhalt zusammenpassen, kodiert mit PyMuPDF neu (entfernt EXIF und Angehängtes), begrenzt auf 2 000 px, liefert Vorschaubild. `bauen` nimmt `eigene_bilder` (nur Namen im Muster `images/eigen_…`, höchstens 40). 10 neue Kern-Tests.

**App-Server:** `werkzeugkiste-bilder.ts` (Konstanten, Namensmuster, Formaterkennung), `werkzeugkiste-bilder-server.ts` (Liste, Lesen, Bau-Adressen, Aufräumen). Neue Route `POST …/editor/bilder/hochladen`. Die Bilderliste liefert eigene Bilder zuerst und das Feld `skript`. Vorschau und Veröffentlichen geben dem Kern nur die benutzten eigenen Bilder. Der Bilder-Auszug (`erzeugeAuszug`) nimmt benutzte eigene Bilder auf, auch ohne Einlesung. Nach dem Veröffentlichen fliegen nicht mehr benutzte eigene Bilder raus (Schonfrist 15 Minuten für frisch hochgeladene). Ordnerlisten lesen jetzt bis 300 Dateien.

**Oberfläche:** `bild-dialog.tsx` (Reiter „Aus dem Skript“ und „Hochladen“, Markierung „Verwendet“, Hinweis bei fehlendem Skript, Leerzustand), `bild-bearbeiten.tsx` (Zuschneiden, Drehen, Zurücksetzen, Alternativtext-Pflicht, Fortschritt, Warnung vor 8 MB), `werkzeugkiste-bild-bearbeiten.ts` (Leinwand-Arbeit im Browser), Platzanzeige „Seite: N MB von 8 MB“ in der Vorschau-Kopfzeile, „Bild bearbeiten“ im Bild-Block.

**Abweichungen von Spec und Tech Design:**
- **Zuschneiden mit `react-image-crop` (11.1.2) statt `react-easy-crop`:** easy-crop kennt nur feste Seitenverhältnisse, die Spec verlangt einen frei verschiebbaren Rahmen.
- **WebP wandelt der Browser um.** Der Kern hat keine Bibliothek für WebP (PyMuPDF kann es nicht), akzeptiert also nur PNG und JPEG. Für die Lehrkraft ändert sich nichts. Durchsichtiges WebP bleibt als PNG durchsichtig.
- **Breite** bleibt das vorhandene Auswahlfeld aus PROJ-90 (klein 40 % / mittel 70 % / ganze Breite), nicht neu „Ganz/Halb/Klein“.
- **Bearbeiten arbeitet auf der Arbeitsgröße:** bei Skript-Bildern auf der 1 200-px-Fassung aus der Bildauswahl, bei eigenen Bildern auf dem gespeicherten Bild. Das Skript-Original bleibt unberührt, ein Zurücksetzen geht nur innerhalb des Fensters (wie im Tech Design vermerkt).
- **Katalog:** Bild-Typen sind nicht mehr „ausgegraut, wenn das Material keine Bilder hat“, weil das Bild-Fenster jetzt auch Hochladen anbietet.
- **„Bild bearbeiten“ nur im Bild-Block,** nicht bei der Bildzuordnung: Zuschneiden würde die gesetzten Punkte verschieben.
- **Alternativtext aus dem Skript:** Die Einlesung enthält keine Bildbeschreibungen, es gibt also nichts vorauszufüllen.

## QA Test Results

**Stand 2026-11-12 (automatisch und per Code-Durchsicht; Browser-Durchgang steht aus).**
Alle Tests grün (3 253 App-Tests, 168 + 10 Kern-Tests), `tsc` ohne neue Fehler, Produktions-Build erfolgreich.

| Bereich | Ergebnis |
|---|---|
| Hochladen: PNG/JPEG am Inhalt erkannt, SVG/HTML/GIF/leer abgelehnt, zu groß, 30er-Grenze, Speicher voll, Kern lehnt ab, Aufräumen bei Fehlern | getestet (Route und Kern) |
| Name vom Server, kein Client-Pfad; Namensmuster auch im Kern | getestet |
| Pixel-Bombe (30 000 × 30 000 im Dateikopf) wird vor dem Entpacken abgelehnt; Anhang hinter dem Bild wird entfernt | Kern-Test |
| Liste: eigene zuerst, keine Doppelten, ohne Skript nur eigene, `skript`-Marke | getestet |
| Bau: nur benutzte eigene Bilder an den Kern; alter Aufruf unverändert | getestet |
| Veröffentlichen: unbenutzte weg, frische bleiben, Auszug enthält eigene (auch ohne Einlesung) | getestet |
| Dialog: Galerie, „Verwendet“, Leerzustand, Format-/Größenfehler, Alternativtext-Pflicht, Upload-Fehler mit „Erneut versuchen“, 8-MB-Warnung | getestet (jsdom, Leinwand nachgebildet) |
| Platzanzeige Farben/Werte | getestet |
| Berechtigung: nur eigene, editierbare Materialien; 403/404 wie die anderen Editor-Routen | getestet |

**Nicht geprüft (braucht echten Browser):** Zuschneiden per Maus, Touch und Tastatur; Drehen; Fotos mit EXIF-Drehung vom Handy; durchsichtige PNG; Kamera-Auswahl auf iOS; Verhalten sehr großer Fotos auf Mobile Safari; Aussehen der Platzanzeige und des Dialogs auf 360 px; Druck. Der Nutzer prüft das wie bei PROJ-89 bis 91 nach dem Livegang.

**Gefundene Mängel (keine Critical/High):**
- **Low:** Kein Hinweis „Das Bild ist sehr klein und wirkt unscharf“ bei Bildern unter 100 px (Edge Case der Spec). Unter 32 px Ausschnitt ist „Übernehmen“ gesperrt.
- **Low:** Kein Hinweis beim Austauschen eines Bildes, das in einer Bildzuordnung steckt. Austauschen geht weiter wie bisher (PROJ-90); nur das Bearbeiten ist dort ausgeblendet.
- **Low:** Beim Hochladen aus einem zweiten Fenster kann ein Bild, das noch in keinem Block steht, vom Aufräumen eines anderen Fensters erfasst werden – die 15-Minuten-Schonfrist deckt das ab, danach wird es beim nächsten Veröffentlichen entfernt.
- **Low (offen):** Die Zahl 30 eigener Bilder je Material gilt auch für nicht benutzte; sie werden erst beim Veröffentlichen frei.

## Deployment
**2026-11-12.** Kern `werkzeugkiste-kern` per `vercel deploy --prod` (Commit 4fcc0f9, Zweig `vercel-kern`, weiter ungepusht), danach App `b68b492` per Push auf `main` (Vercel „Ready“). Keine Migration, keine neuen Umgebungsvariablen. Neues Paket `react-image-crop` 11.1.2. Neue Route ohne Anmeldung antwortet 401.

**Offen:** Browser-Durchgang als Lehrkraft (Desktop und Handy): Zuschneiden per Maus/Touch/Tastatur, Drehen, Handyfoto mit EXIF-Drehung, durchsichtiges PNG, Kamera-Auswahl auf iOS, Platzanzeige und Dialog bei 360 px. Dazu weiterhin `KERN_SECRET` erneuern.
