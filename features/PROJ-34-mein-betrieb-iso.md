# PROJ-34: „Mein Betrieb" – isometrische Ansicht & Selbst-Platzieren (Spedition)

## Status: In Progress
**Created:** 2026-10-09
**Last Updated:** 2026-10-09
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-20 (Shop & Käufe), PROJ-26 (Item-Katalog, Icon-Schlüssel),
  PROJ-32 (Seltenheit), PROJ-22/23 (Fachbereiche, Hof-/Münznamen als Daten)
- **Ersetzt:** PROJ-33 (flache Hof-Illustration im Profil). PROJ-33 bleibt bis
  zum Deploy dieses Features live und wird dann abgelöst.
- **Nutzt:** die isometrische Zeichentechnik aus dem eigenen Projekt
  `spedition-tycoon` (`src/welt/*`: Iso-Bausteine, Bodenkacheln, Fahrzeuge,
  Gebäudeteile). Die benötigten Module werden in die App kopiert; es entsteht
  keine Laufzeit-Abhängigkeit zum Tycoon-Projekt.
- **Folgt:** PROJ-35 (Tourismus-Resort mit neuen Sprites)

## Problem

PROJ-26 bis PROJ-33 zeigen gekaufte Items als flache Kacheln bzw. flache
Illustration im Profil. Das wirkt wie eine Liste und nicht wie etwas, das man
aufbaut und stolz zeigt. Gewollt war von Anfang an eine **grafische
Aufbau-Welt im Stil von Hay Day / Spedition Tycoon**: ein eigener Ort, den der
Azubi selbst gestaltet.

## Lösung

Eine **eigene Seite „Mein Betrieb"** (Fachbereich Spedition) mit einer
isometrischen Welt: gezäunter Betriebsgrund mit Straße ringsum. Gekaufte Items
liegen zunächst in einer **Lager-Leiste** am Rand und werden vom Azubi **selbst
auf Kacheln gesetzt**, verschoben und wieder ins Lager gelegt. Das Land wächst
mit der Zahl der Käufe. Beim Platzieren gibt es eine kurze Aufbau-Animation.
Dieselben isometrischen Sprites erscheinen im Shop und im Admin-Formular, damit
alles gleich aussieht.

### Entscheidungen (Abstimmung 2026-10-09)
- Eigene Seite statt Karton im Profil; im Profil nur eine kleine Vorschau mit
  Link dorthin
- Bezeichnung für Spedition: **„Mein Betrieb"** (rein Daten, kein Code-Name)
- Ansicht: Bildschirmbreite, ca. halbe Bildschirmhöhe, **verschieb- und
  zoombar**
- Start klein und leer, **wächst mit den Käufen**
- Der Azubi **platziert selbst**; Positionen werden gespeichert
- Gekaufte, noch nicht gesetzte Items liegen in einer **Lager-Leiste**
- Kauf löst eine **Aufbau-Animation** aus
- **Stil: Hay-Day-inspiriert**, aufbauend auf der Tycoon-Technik (warm, satt,
  dicke Konturen, runde Formen, weiche Schatten, kleine Leerlauf-Bewegungen)
- Spedition zuerst, Tourismus als eigenes Feature (PROJ-35)

## User Stories

- Als **Azubi** möchte ich meinen Betrieb als lebendige, isometrische Welt
  sehen, damit sich das Sammeln wie Aufbauen anfühlt.
- Als **Azubi** möchte ich gekaufte Items selbst auf eine Kachel setzen, damit
  mein Betrieb so aussieht, wie ich ihn mir ausgesucht habe.
- Als **Azubi** möchte ich Items verschieben und zurück ins Lager legen, damit
  ich umbauen kann.
- Als **Azubi** möchte ich die Welt mit den Fingern verschieben und zoomen, um
  auch bei vielen Items den Überblick zu behalten.
- Als **Azubi** möchte ich sehen, wie ein neues Item aufgebaut wird, damit sich
  der Kauf belohnend anfühlt.
- Als **Azubi** möchte ich, dass das Land mit meinen Käufen wächst, damit ich
  Platz für Neues bekomme.
- Als **Azubi mit Screenreader/ohne Drag-Fähigkeit** möchte ich Items auch per
  Antippen und Auswählen setzen können, ohne ziehen zu müssen.
- Als **Admin** möchte ich im Item-Formular dasselbe Sprite wie im Betrieb
  sehen und auswählen.

## Acceptance Criteria

### Seite & Navigation
- [ ] Es gibt eine eigene Seite „Mein Betrieb" (Bezeichnung aus den
      Fachbereichsdaten), erreichbar aus der Navigation und per Link aus dem
      Profil
- [ ] Im Profil zeigt eine kleine statische Vorschau den aktuellen Betrieb mit
      Link zur Seite; ein Konto ohne Käufe sieht den einladenden Leerzustand
      mit Link zum Shop
- [ ] Die bisherige flache Hof-Illustration (PROJ-33) wird abgelöst, die
      Textliste für Screenreader bleibt erhalten
- [ ] Nur Spedition-Konten sehen die isometrische Ansicht; Tourismus zeigt bis
      PROJ-35 weiterhin die bestehende Darstellung

### Welt
- [ ] Die Welt ist isometrisch (2:1) mit Boden, Straße ringsum, Holzzaun an den
      hinteren Kanten und einem gepflasterten Betriebsgrund
- [ ] Die Ansicht füllt die Bildschirmbreite bei ca. halber Bildschirmhöhe und
      lässt sich per Ein-Finger-Ziehen verschieben und per Pinch zoomen
      (Desktop: Ziehen, Mausrad, Zoom-Knöpfe)
- [ ] Verschieben und Zoomen sind begrenzt, sodass die Welt nie komplett aus
      dem Bild geschoben werden kann; ein „Zentrieren"-Knopf stellt die
      Ansicht wieder her
- [ ] Items sind bei der Standard-Zoomstufe auf 320 px Breite erkennbar
      (mindestens 40 px Gesamthöhe je Sprite)
- [ ] Leerlauf-Bewegungen (Fahne, Rauch o. ä.) entfallen bei
      „Bewegung reduzieren"

### Land & Wachstum
- [ ] Das Land beginnt klein (Startgröße als Konstante) und wächst mit der
      Zahl der gekauften Items nach einer dokumentierten Regel bis zu einer
      Obergrenze
- [ ] Neues Land erscheint mit einer kurzen Animation und ohne Position bereits
      gesetzter Items zu verändern
- [ ] Das Land schrumpft nie (auch nicht, wenn ein Item später deaktiviert
      wird)

### Platzieren
- [ ] Gekaufte, noch nicht gesetzte Items erscheinen in einer Lager-Leiste mit
      Sprite und Name
- [ ] Der Azubi setzt ein Item per Ziehen auf eine freie Kachel **oder** per
      Antippen von Item und danach Kachel (Tastatur-/Screenreader-tauglich)
- [ ] Ein gesetztes Item lässt sich verschieben oder ins Lager zurücklegen
- [ ] Pro Kachel steht höchstens ein Item; belegte oder ungültige Kacheln
      lehnen das Setzen ab (sichtbarer Hinweis, keine stille Ablehnung)
- [ ] Jedes gekaufte Item ist entweder gesetzt oder im Lager, nie doppelt, nie
      verloren
- [ ] Positionen werden pro Konto gespeichert und sind nach Neuladen und auf
      einem zweiten Gerät identisch
- [ ] Der Server prüft Besitz, Kachel innerhalb des freigeschalteten Landes und
      Eindeutigkeit; ein Azubi kann nur seine eigenen Positionen ändern
- [ ] Ein bereits gekauftes, später deaktiviertes Item bleibt platzierbar und
      sichtbar

### Kauf-Animation
- [ ] Nach einem Kauf zeigt der Betrieb das neue Item in der Lager-Leiste mit
      kurzer Aufbau-/Hüpf-Animation; ein Hinweis führt zum Setzen
- [ ] Beim Setzen eines Items läuft eine kurze Platzier-Animation
- [ ] Alle Animationen entfallen bei „Bewegung reduzieren"

### Sprites & Stil
- [ ] **Stilfreigabe vor Massenproduktion:** zuerst 3 bis 4 Probe-Sprites
      (z. B. Lkw, Halle, Container, Pokal) im Hay-Day-Stil; erst nach
      ausdrücklicher Freigabe entstehen die übrigen
- [ ] Eine kurze Stilvorgabe (Palette, Konturstärke, Lichtrichtung, Proportionen,
      Schatten) liegt als Dokument im Repository und gilt für alle Fachbereiche
- [ ] Jedes Spedition-Item hat ein isometrisches Sprite; wo das Tycoon-Projekt
      eines liefert, wird es wiederverwendet, sonst im selben Stil neu
      gezeichnet
- [ ] Fehlt das Sprite eines Items, erscheint ein neutraler Platzhalter (kein
      leerer Platz, kein Fehler)
- [ ] Shop-Kachel und Admin-Formular zeigen dasselbe isometrische Sprite;
      Seltenheits-Rahmen (PROJ-32) bleibt erhalten
- [ ] Alle Sprites sind Inline-SVG; keine Bild-Uploads, keine externen
      Dienste, keine neuen laufenden Kosten

### Bezeichnungen & Technik
- [ ] Die Bezeichnung „Mein Betrieb" stammt aus den Fachbereichsdaten (nicht
      fest im Code)
- [ ] Die Seite lädt in akzeptabler Zeit auch mit 40 Items (kein Ruckeln beim
      Verschieben und Zoomen auf einem Mittelklasse-Smartphone)
- [ ] Die Seite ist ohne Maus bedienbar; die Textliste nennt je Item Name,
      Status (gesetzt/im Lager) und Kachel

## Edge Cases

- **Mehr Items als freie Kacheln:** Land wächst nach der Regel; reicht auch das
  nicht (Obergrenze erreicht), bleiben Items im Lager und der Hinweis „Kein
  Platz mehr frei" erscheint.
- **Zwei Geräte setzen gleichzeitig dieselbe Kachel:** Der Server entscheidet
  (erste gewinnt); das zweite Gerät bekommt eine verständliche Meldung und
  lädt den Stand neu.
- **Item wird zwischen Kauf und Setzen deaktiviert:** bleibt platzierbar.
- **Konto wechselt den Fachbereich oder ist verknüpft (PROJ-29):** Positionen
  gelten je Konto; es erscheinen nur Items des eigenen Fachbereichs.
- **Verbindung bricht beim Setzen ab:** Das Item bleibt im Lager bzw. an der
  alten Stelle; kein Zwischenzustand mit „verschwundenem" Item.
- **Sehr kleiner Bildschirm / hohe Schriftgröße:** Leiste und Knöpfe bleiben
  bedienbar (Touch-Ziele mindestens 44 px).
- **Sprite fehlt oder Schlüssel nicht auflösbar:** Platzhalter.
- **Zoom/Verschieben auf Geräten ohne Mehrfachberührung:** Zoom-Knöpfe als
  Ersatz.
- **Sehr viele Items (40+):** Ansicht bleibt flüssig; Items außerhalb des
  sichtbaren Ausschnitts dürfen eingespart werden.

## Non-Goals (diese Spec)
- Tourismus-Resort und dessen Sprites (siehe PROJ-35)
- Drehen oder Spiegeln von Items; Items mit mehr als einer Kachel Fläche
- Fremde Betriebe ansehen oder Besuche (Mehrspieler)
- Produktions-/Wirtschaftsmechanik wie im Tycoon (rein kosmetisch)
- Handgemalte Pixelgrafik; Ziel ist „Hay-Day-inspiriert" in Vektorform

## Technical Requirements (optional)
- Kosten: keine neuen laufenden Kosten
- Security: Besitz- und Positionsprüfung serverseitig, nur eigene Daten
- Performance: Sprites als gecachte SVG-Bilder, keine zusätzlichen Requests je
  Item
- Barrierefreiheit: Tastaturbedienung, Textliste, Reduced-Motion

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Kurzfassung
Drei neue Dinge: **(1)** die isometrische Zeichentechnik aus dem Tycoon wird als
Baustein in die App übernommen, **(2)** eine kleine neue Datenhaltung für
„welches Item steht auf welcher Kachel", **(3)** eine neue Seite mit Welt,
Lager-Leiste und Bedienung. Kauf, Münzen und Seltenheit bleiben unverändert.

### A) Bausteine (visueller Baum)

```
Startseite (bestehend)
+-- Link "Mein Betrieb"                    (NEU, neben Shop/Rangliste/Profil)

Profil (bestehend)
+-- "Mein Betrieb"-Vorschau                (ersetzt die flache Illustration)
    +-- kleine, nicht bedienbare Welt
    +-- Link zur Seite / Link zum Shop bei leerem Konto

Seite "Mein Betrieb"                       (NEU)
+-- Kopfzeile (Name, Zentrieren, Zoom + / -)
+-- Welt-Ansicht (Bildschirmbreite, halbe Höhe, verschieb- und zoombar)
|   +-- Boden mit Kacheln, Straße ringsum, Zaun (hinten)
|   +-- Gesetzte Items als Sprites (hinten nach vorne sortiert)
|   +-- Markierung freier Kacheln beim Platzieren
|   +-- Platzier-/Wachstums-Animation
+-- Lager-Leiste (gekaufte, noch nicht gesetzte Items)
+-- Hinweis-Zeile ("Tippe ein Item, dann eine Kachel")
+-- Textliste für Screenreader (Name, Status, Kachel)

Shop / Admin (bestehend)
+-- Item-Bild zeigt das isometrische Sprite   (statt flachem Icon)
+-- Seltenheits-Rahmen bleibt (PROJ-32)

Zeichentechnik (aus dem Tycoon übernommen)
+-- Iso-Bausteine, Palette, Bodenkacheln, Zaun, Fahrzeuge, Gebäudeteile
+-- Sprite-Katalog "Schlüssel -> Sprite" (NEU, je Item ein Eintrag)
+-- Stilvorgabe (Dokument)
```

### B) Daten (Klartext)

**Neu: „Platzierung".** Pro Konto und gekauftem Item höchstens ein Eintrag mit:
- wem es gehört (Konto),
- welches gekaufte Item,
- auf welcher Kachel (zwei Zahlen: Spalte und Reihe im Betriebsgrund).

Ein Item ohne Eintrag liegt im Lager. „Zurück ins Lager legen" löscht den
Eintrag. Die Datenbank garantiert selbst, dass
- ein Item nicht doppelt gesetzt werden kann und
- keine Kachel zweimal belegt wird.

**Nicht gespeichert, sondern berechnet:**
- **Landgröße.** Aus der Zahl der gekauften Items nach einer festen Regel
  (**umgesetzt:** Kantenlänge = Wurzel aus 2·Items + 12, aufgerundet, zwischen 4
  und 10 – also 0 Items 4×4, 7 Items 6×6, 16 Items 7×7, 31 Items 9×9, ab 44 Items
  10×10; ursprünglicher Vorschlag „je 3 Items eine Kachel mehr“ machte den Betrieb
  schon bei 31 Items zu leer). Das Land wächst nach vorne/außen; die Kachel (0,0) hinten
  bleibt der Anker. Dadurch ändert Wachstum nie die Position gesetzter Items,
  und das Land kann nicht schrumpfen.
- **Seltenheit** (wie PROJ-32), **Sprite** (aus dem Icon-Schlüssel des Items).
- **Kamera** (Verschiebung/Zoom): nur im Browser, wird nicht gespeichert.

**Die Bezeichnung „Mein Betrieb"** kommt aus den bestehenden Fachbereichsdaten
(Hofname, Kurzname). Beim Umstellen müssen alle Textstellen, die den Namen in
Sätzen verwenden („Zum …", „…-Items"), geprüft werden.

### C) Technische Entscheidungen (Begründung)

1. **Tycoon-Technik kopieren statt neu bauen.** Der Probe-Hof zeigt: Sie läuft
   in der App ohne Änderung. Das spart Wochen und garantiert denselben Look wie
   der Tycoon. Nachteil: Zwei Kopien können auseinanderlaufen; deshalb eigener
   Ordner und kurze Herkunfts-Notiz.
2. **Welt als ein SVG mit gemeinsamer Kamera-Gruppe.** Verschieben und Zoomen
   sind dann nur eine Transformation auf einer Gruppe: läuft flüssig auch auf
   schwächeren Handys. Boden-Kacheln werden einmal definiert und wiederverwendet
   (nicht 100 einzelne Bilder), damit die Seite leicht bleibt.
3. **Eigene kleine Gestensteuerung** (Ein-Finger-Ziehen, Zwei-Finger-Zoom,
   Mausrad, Zoom-Knöpfe, Begrenzung, „Zentrieren"). Der Tycoon macht es
   genauso; wir brauchen keine zusätzliche Bibliothek.
4. **Setzen per Antippen ist der Hauptweg, Ziehen die Komfort-Variante.**
   Antippen funktioniert zuverlässig auf dem Handy, mit Tastatur und
   Screenreader; Ziehen kollidiert auf dem Handy mit dem Verschieben der Welt.
5. **Server prüft alles.** Besitz, Kachel im freigeschalteten Land, nicht belegt,
   nur eigene Daten. Zusätzlich sichern Eindeutigkeits-Regeln in der
   Datenbank gegen Doppelbelegung bei gleichzeitigen Aktionen
   (zwei Geräte).
6. **Land aus der Zahl der Käufe ableiten, nicht speichern.** Keine
   Inkonsistenz, keine Migration bei Regeländerung, nichts zu pflegen.
7. **Kauf-Ablauf bleibt unangetastet.** Gekaufte Items landen automatisch im
   Lager (kein Platzierungs-Eintrag). Der Kauf muss deshalb nichts über den
   Betrieb wissen.
8. **Kein Eingriff in Münzen, XP, Login oder Seltenheit.** Es kommen zwei
   Zugriffsregeln für die neue Platzierungs-Tabelle hinzu (nur eigene Zeilen).
9. **Sprites als Katalog „Icon-Schlüssel -> Zeichenfunktion".** Gleicher
   Schlüssel wie bisher; das alte flache Icon bleibt als Rückfall für Items
   ohne isometrisches Sprite (Platzhalter, kein leerer Platz).
10. **Stilprobe als feste Hürde.** 3 bis 4 Probe-Sprites werden gezeichnet und
    von dir freigegeben, bevor die Serie entsteht. So kostet ein falscher Stil
    kein ganzes Set.

### D) Was sich an Bestehendem ändert
| Bereich | Änderung |
|---------|----------|
| Datenbank | neue Tabelle „Platzierung" mit Eindeutigkeitsregeln und Zugriffsregeln für eigene Zeilen; Fachbereichsdaten Spedition: Bezeichnung |
| Schnittstellen | neu: Platzierungen lesen, Item setzen/verschieben, Item zurücklegen; bestehende Shop-Schnittstelle bleibt |
| Startseite, Profil | Link bzw. Vorschau „Mein Betrieb" |
| Hof-Galerie (PROJ-33) | wird durch die Vorschau ersetzt; Textliste bleibt |
| Shop-Kachel, Admin-Formular/-Liste | zeigen das isometrische Sprite, Rahmen bleibt |
| Tourismus | unverändert bis PROJ-35 |

### E) Reihenfolge der Umsetzung (Vorschlag)
1. **Stilprobe** (3 bis 4 Sprites) -> deine Freigabe
2. Zeichentechnik übernehmen + statische Welt mit Land-Regel und Tests
3. Datenhaltung + Schnittstellen + Tests (Besitz, Grenzen, Doppelbelegung)
4. Seite: Kamera, Lager-Leiste, Setzen/Verschieben/Zurücklegen
5. Animationen (Kauf, Setzen, Wachstum) mit Reduced-Motion
6. Sprite-Serie für alle Spedition-Items
7. Shop/Admin/Profil-Vorschau, Bezeichnung „Mein Betrieb"
8. Sicht- und Regressionsprüfung (Bilder rendern, Spedition-Kauf unverändert)

### F) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### G) Risiken & Hinweise
- **Größter Posten ist die Grafik** (Sprites für alle Spedition-Items, einige
  neu zu zeichnen). Deshalb die Stilfreigabe vorweg.
- **Bedienung auf dem Handy** (Verschieben/Zoomen gegen Ziehen eines Items)
  ist der heikelste Teil; Antippen-Setzen ist der sichere Weg.
- **Gleichzeitiges Setzen auf zwei Geräten:** Der Server entscheidet, das
  zweite Gerät lädt neu und zeigt eine Meldung.
- **Auf diesem Rechner kein Browser-Test:** Ich prüfe per gerendertem Bild und
  Tests; Gestensteuerung und Gefühl müssen am Handy von dir abgenommen werden.
- **Name „Mein Betrieb"** steckt in Sätzen („Zum …"); Texte vor dem Deploy
  alle ansehen.

## Implementation Notes

### Stand 2026-10-09 – Schritte 1 bis 7 umgesetzt, Schritt 8 (Prüfung) läuft; noch nicht live
- **Stil (Schritt 1, freigegeben):** erst Tycoon-Stil, dann „Hay-Day, bunt/verspielt" (dicke braune Konturen) – vom Nutzer anhand seines Hay-Day-Screenshots zugunsten eines **weichen Stils** verworfen: nahtlose Wiese mit Gräsern/Blümchen, Erdweg, üppige Bäume aus Kugeln mit Licht/Schatten, dünne Konturen, weiße Lattenzäune, weiche Schatten. Probebilder in `docs/vorschau/`.
- **Technik (Schritt 2):** Tycoon-Zeichentechnik nach `src/lib/hof-welt/` kopiert (Herkunft und Änderungen: dortige `README.md`); Palette dort bunter. Neu: `natur.ts` (weicher Stil: Wiese, Weg, Baum, Scheune, Zaun, Lagerhalle, Bürohaus, Container, Pokal, Platzhalter), `stil.ts`, `sprites-betrieb.ts` (Wimpel, Markise, Beet, Busch, Kegel, Wegweiser).
- **Landregel** `src/lib/betrieb-land.ts`: Kantenlänge = ⌈√(2·Items + 12)⌉, 4 bis 10; nie schrumpfend, Wachstum verschiebt keine Items. (Erste Fassung „+1 je 3 Items“ im Bild als zu leer erkannt und ersetzt.)
- **Welt-Layout** `src/lib/betrieb-welt.ts`: Betriebsgrund + 1 Kachel Rand (hinten Wiese hinter weißem Zaun, vorne Straße); Bildschirmposition hängt nur von der Kachel ab; Zeichenreihenfolge hinten→vorne.
- **Sprite-Katalog** `src/lib/betrieb-sprites.ts`: Icon-Schlüssel → Sprite, Platzhalter-Kiste für alles ohne Sprite. Aktuell 15 Einträge (u. a. Lagerhalle, Bürogebäude, Sattelschlepper, Container, Pokal, Scheune, Baum, Beet, Busch, Kegel, Wegweiser). Der Tippfehler-Test fing `buerohaus` statt `buerogebaeude` ab.
- **Komponente** `src/components/betrieb-welt.tsx`: ein SVG, Boden/Zaun/Sprites einmal in `defs` und per `use` wiederholt; Seltenheits-Raute unter Items; Items außerhalb des Landes werden nicht gezeichnet.
- Bilder: `docs/vorschau/betrieb-welt-start.png`, `betrieb-welt-gewachsen.png`.
- **Schritt 3 – Daten:** Tabelle `betrieb_platzierungen` (Migration `20261009_proj34_betrieb_platzierungen`): Primärschlüssel (user, item), Fremdschlüssel auf `user_shop_items` (nur wirklich Gekauftes), `UNIQUE (user, x, y)` (eine Kachel ein Item), Kacheln 0–9; RLS nur Lesen eigener Zeilen, Schreibrechte entzogen (Service-Rolle). Gegen die echte DB in einer zurückgerollten Transaktion geprüft. Schnittstellen `GET /api/betrieb`, `PUT/DELETE /api/betrieb/platzierung` (Zod, Besitz, Landgrenze, 409 bei belegter Kachel), `src/lib/betrieb-stand.ts`.
- **Schritt 4 – Seite:** `/betrieb` mit Kamera (Ziehen, Pinch, Mausrad, Zoom-Knöpfe, Zentrieren, begrenzt), Lager-Leiste, Antippen-Setzen (Item → freie Kachel), Verschieben, „Ins Lager“, Zugriff „Per Liste setzen“ für Tastatur/Screenreader, optimistische Updates mit Rückfall; Treffererkennung (Sprite-Fläche, vorderstes Item). Reine Logik in `betrieb-kamera.ts` und `betrieb-treffer.ts` getestet.
- **Schritt 5 – Animationen:** Aufstell-Hüpfer, hüpfendes neues Item im Lager (`?neu=…` aus dem Shop-Dialog „Jetzt aufstellen“), sanftes Einblenden neuen Landes beim ersten Öffnen nach Wachstum (+ Hinweis); alle entfallen bei „Bewegung reduzieren“.
- **Schritt 6 – Sprites:** alle 31 Spedition-Items haben ein weiches Sprite (`spedition-weich.ts`); ein Test erzwingt das für jedes flache Icon.
- **Schritt 7 – Einbindung:** `HofItemIcon` bevorzugt das Sprite (Shop-Kachel, Kaufdialog, Admin-Liste, Icon-Picker); Profil zeigt `BetriebVorschau` statt der flachen Galerie (Tourismus behält die Galerie bis PROJ-35); Startseite-Link; Shop-Titel „Shop“; Migration `20261009_proj34_betrieb_name` (Bezeichnung „Betrieb“).
- **Offen:** Schritt 8 (Prüfung) abschließen, Migrationen auf Produktion anwenden, Deploy, Abnahme am Handy (Gesten!).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
