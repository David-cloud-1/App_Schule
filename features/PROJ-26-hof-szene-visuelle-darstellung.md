# PROJ-26: Visuelle Hof-Szene & kategorisierter Item-Katalog

## Status: In Review
**Created:** 2026-10-05
**Last Updated:** 2026-10-05
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-20 (Speditionshof & Shop) — diese Spec erweitert den
  bestehenden Shop direkt. PROJ-20 legt bewusst fest, dass Items nur aus
  Emoji-Icon + Name + Beschreibung bestehen (keine Bild-Uploads, keine
  Bild-KI). Diese Spec ersetzt das Emoji durch eine fest hinterlegte
  SVG-Icon-Bibliothek und ergänzt eine zusammenhängende Hof-Szene — ohne die
  Kosten-Entscheidung von PROJ-20 (keine Bild-Uploads/Bild-Hosting/Bild-KI)
  aufzugeben.
- **Gehört zu:** PROJ-7 (Achievements & Badges) als Vorbild für
  Galerie-Leerzustände, ansonsten keine neue Abhängigkeit.

## Problem

PROJ-20 zeigt gekaufte Hof-Items aktuell als reine Emoji-Kacheln
(`hof-gallery.tsx`). Das erfüllt die ursprüngliche Spec, wirkt aber wenig
lohnend für einen Shop, der zur Rückkehr motivieren soll (siehe
[engagement-retention-problem]-Kontext: wer spielt, soll es auch *sehen*,
wofür er gesammelt hat). Außerdem gibt es bisher nur 4 Katalog-Items ohne
thematische Gruppierung — das reicht nicht, um eine Sammlung spürbar wachsen
zu lassen.

## Lösung

1. **Kategorisierter Katalog:** `shop_items` bekommt ein Kategorie-Feld mit
   vier festen Werten: Fahrzeuge, Gebäude & Hof-Deko, Ladung & Ausstattung,
   Spedition-Abzeichen/Trophäen. Der Admin pflegt weiterhin frei neue Items
   in diesen Kategorien (kein Code-Deploy nötig für neuen Content — das bleibt
   aus PROJ-20 erhalten).
2. **Feste SVG-Icon-Bibliothek statt Emoji, je Fachbereich ein eigenes Set:**
   `shop_items` ist bereits pro Fachbereich getrennt (PROJ-22/23,
   `department_id`). Da Spedition- und Tourismus-Items fachlich nicht
   zueinander passen (LKW vs. Koffer/Flugzeug), bekommt jeder Fachbereich
   eine eigene, im Code hinterlegte Sammlung handgefertigter Inline-SVG-
   Illustrationen. Der Admin wählt beim Anlegen/Bearbeiten eines Items aus dem
   Icon-Set seines eigenen Fachbereichs, statt einen Emoji-Charakter
   einzutippen. Kein Bild-Upload, kein externer Bild-Dienst — bleibt
   kostenfrei wie in PROJ-20 festgelegt.
   **Scope dieser Spec:** Nur das Spedition-Icon-Set wird jetzt gebaut — das
   ist der einzige Fachbereich mit einem aktiven Shop-Katalog. Tourismus hat
   laut PROJ-25 bewusst noch keine Shop-Items; ein Tourismus-Icon-Set folgt
   erst, wenn dieser Fachbereich einen eigenen Katalog bekommt. Die Struktur
   (Icon-Set je Fachbereichs-Code) ist aber so angelegt, dass das später ohne
   Schema-Änderung ergänzt werden kann.
3. **Hof-Szene in "Mein Hof":** Die bisherige Kachel-Galerie im Profil wird zu
   einer zusammenhängenden, illustrierten Szene mit festen Zonen je
   Kategorie (z. B. Fahrzeuge auf einem Weg, Gebäude im Hintergrund, Deko
   verstreut, Trophäen auf einem Regal/Sims). Die Zuordnung zu Zonen ist
   automatisch über die Kategorie des Items — keine freie Positionierung
   durch den Nutzer.
4. **Shop-Seite bleibt bei Kacheln:** Der Kauf-Flow (Kacheln, Preis, Kauf-
   Button, "nicht leistbar") ändert sich nicht strukturell — nur das Emoji
   auf der Kachel wird durch dieselbe SVG-Illustration ersetzt.

## User Stories

- Als **Azubi** möchte ich meine gekauften Items als zusammenhängende,
  thematisch gruppierte Hof-Szene sehen, damit sich das Sammeln sichtbar und
  lohnend anfühlt (nicht nur eine Liste aus Icons).
- Als **Azubi** möchte ich auf einen Blick erkennen, zu welcher Kategorie ein
  Item gehört (Fahrzeug, Gebäude, Ladung, Trophäe), damit der Hof wie ein
  echter Speditionshof aussieht statt wie eine zufällige Sammlung.
- Als **Azubi** ohne Käufe in einer bestimmten Kategorie möchte ich keine
  leere, kaputt wirkende Fläche sehen, sondern eine dezente leere Zone.
- Als **Admin** möchte ich beim Anlegen eines Items eine passende
  Illustration aus einer vorgegebenen Bibliothek auswählen (mit Vorschau),
  damit ich keine Bild-Dateien besorgen oder hochladen muss.
- Als **Admin** möchte ich jedem Item eine der vier Kategorien zuweisen,
  damit es in der Hof-Szene in der richtigen Zone erscheint.

## Acceptance Criteria

### Datenmodell & Admin
- [ ] `shop_items` hat ein Pflichtfeld "Kategorie" mit genau den Werten
      Fahrzeuge, Gebäude & Hof-Deko, Ladung & Ausstattung,
      Spedition-Abzeichen/Trophäen
- [ ] Bestehende 4 Katalog-Items aus PROJ-20 erhalten im Zuge der Migration
      eine sinnvolle Kategorie (kein Item bleibt ohne Kategorie)
- [ ] Der Admin wählt beim Anlegen/Bearbeiten eines Items die Kategorie aus
      einer festen Auswahl (kein Freitext)
- [ ] Der Admin wählt die Illustration aus einer festen, bebilderten
      Icon-Bibliothek (Vorschau sichtbar vor dem Speichern) statt Emoji
      einzutippen
- [ ] Das Spedition-Icon-Set deckt zu Beginn mindestens 5 Illustrationen pro
      Kategorie ab (insgesamt mind. 20); ein Tourismus-Set ist nicht Teil
      dieser Spec, da Tourismus noch keinen Shop-Katalog hat
- [ ] Der Admin sieht beim Anlegen eines Items ausschließlich das Icon-Set
      seines eigenen Fachbereichs (keine Spedition-Icons für Tourismus-Admins
      und umgekehrt, sobald es mehrere Sets gibt)
- [ ] Der Ausgangskatalog enthält nach dieser Spec mindestens 2 aktive Items
      je Kategorie, damit alle vier Zonen beim ersten Aufruf befüllt sind
- [ ] Das bereits bestehende Referenzpreis-Item zu 75 Münzen (siehe PROJ-20,
      Startguthaben aus PROJ-19) bleibt davon unberührt bestehen

### Hof-Szene (Profil, "Mein Hof")
- [ ] "Mein Hof" zeigt eine zusammenhängende, illustrierte Szene mit vier
      erkennbaren Zonen (Fahrzeuge, Gebäude/Deko, Ladung/Ausstattung,
      Abzeichen/Trophäen)
- [ ] Jedes gekaufte Item erscheint als SVG-Illustration in der Zone seiner
      Kategorie
- [ ] Eine Zone ohne gekaufte Items dieser Kategorie wird dezent leer/
      ausgeblendet dargestellt, nicht als kaputt wirkende Lücke
- [ ] Ein Konto ganz ohne Käufe zeigt weiterhin den bestehenden einladenden
      Leerzustand (wie in PROJ-20), nicht eine leere Szene
- [ ] Die Szene bleibt mobile-tauglich (keine horizontale Seiten-Scrollbar,
      Zonen stapeln oder wrappen bei schmalen Bildschirmen)
- [ ] Für Screen-Reader bleibt der Inhalt zugänglich — eine textbasierte
      Alternative (z. B. versteckte Liste mit Item-Name + Kategorie) ist
      vorhanden, falls die Szene rein visuell/positionell aufgebaut ist
- [ ] Ein deaktiviertes, aber bereits gekauftes Item erscheint weiterhin in
      der passenden Zone der Hof-Szene (Fortsetzung von PROJ-20 BUG-2-Fix —
      keine Regression)

### Shop-Seite (Kacheln, unverändert im Ablauf)
- [ ] Jede Shop-Kachel zeigt dieselbe SVG-Illustration wie in der Hof-Szene
      statt eines Emoji
- [ ] Kauf-Button, Preis-Anzeige, "im Besitz"-Markierung und
      "nicht leistbar"-Zustand funktionieren unverändert wie in PROJ-20
- [ ] Die Kachel zeigt zusätzlich sichtbar die Kategorie des Items (z. B. als
      kleines Label oder Icon-Rahmenfarbe je Kategorie)

## Edge Cases

- **Ein Item wird nachträglich in eine andere Kategorie verschoben.** Bereits
  gekaufte Exemplare erscheinen danach in der Zone der *aktuellen* Kategorie
  — es gibt keine eingefrorene Kategorie pro Kauf (anders als der
  eingefrorene Preis aus PROJ-20, der bewusst bleibt).
- **Sehr viele Items in einer einzigen Zone (z. B. 20 Fahrzeuge).** Die Zone
  muss wachsen/wrappen können, ohne das Szenen-Layout zu sprengen oder
  horizontales Scrollen auf dem Smartphone zu erzwingen.
- **Alle vier Zonen sind leer außer einer.** Die Szene darf nicht wie ein
  Darstellungsfehler wirken — nur befüllte Zonen nehmen sichtbar Raum ein.
- **Admin löscht später eine Illustration aus der Bibliothek (Code-Änderung).**
  Items, die diese Illustration referenzieren, brauchen einen Fallback
  (z. B. ein generisches Platzhalter-Icon je Kategorie), damit nichts kaputt
  aussieht.
- **Ein neues Item passt thematisch zu keiner vorhandenen Illustration.** Das
  ist ein bekannter Kompromiss der festen Bibliothek (siehe Lösung, Punkt 2)
  — der Admin wählt die nächstbeste vorhandene Illustration; Erweiterung der
  Bibliothek selbst erfordert einen Code-Deploy (anders als neue Items, die
  deploy-frei bleiben).
- **Nutzer mit sehr altem, noch unkategorisiertem Item (Datenintegrität).**
  Darf durch die Migration nicht vorkommen — wird als Teil der Akzeptanz-
  kriterien verlangt (kein Item ohne Kategorie).

## Technical Requirements

- **Kostenrahmen:** keine Bild-Uploads, kein externer Bild-/Storage-Dienst,
  keine Bild-KI — ausschließlich Inline-SVG im Code, analog zur
  Lucide-Icon-Nutzung im übrigen Projekt. Bleibt vollständig innerhalb von
  Supabase Free Tier und Vercel Hobby (keine neue Abhängigkeit, siehe
  [DESIGN.md](docs/DESIGN.md)).
- **Mobile-First:** Zonen und Items mindestens so gut lesbar/antippbar wie
  die bisherige Kachel-Galerie; Touch-Ziele (Kauf-Button) bleiben ≥ 44 px.
- **Barrierefreiheit:** Kategorie-Zugehörigkeit und Item-Name dürfen sich
  nicht nur über Farbe/Position unterscheiden; textuelle Alternative für
  Screen-Reader vorhanden.
- **Kein Breaking Change am Kauf-Flow:** `POST /api/shop/purchase` und die
  Kauf-Atomarität aus PROJ-20 bleiben unverändert; diese Spec betrifft nur
  Darstellung und das neue Kategorie-Feld.
- **Rückwärtskompatibilität der Migration:** bestehende Käufe
  (`user_shop_items`) müssen nach der Migration weiterhin korrekt der (neu
  kategorisierten) `shop_items`-Zeile zugeordnet sein — reine additive
  Spalten-Migration, kein Datenverlust.

## Offene Punkte für /architecture

- Genaue Umsetzung der je Fachbereich getrennten SVG-Icon-Bibliothek
  (Icon-Key → SVG-Mapping pro Fachbereichs-Code, analog zu
  `BADGE_DEFINITIONS`?) und wie der Admin sie mit Vorschau auswählt (neues
  Form-Control im bestehenden `shop-item-form-modal.tsx`, gefiltert auf den
  eigenen Fachbereich).
- Genaues visuelles Konzept der vier Zonen (Anordnung, Hintergrund,
  Breakpoints) — Design-Entscheidung in Abstimmung mit
  [DESIGN.md](docs/DESIGN.md) (Dark Mode, abgerundete Formen, Duolingo/
  Instagram-Ästhetik).
- Migration der bestehenden 4 Items: welche Kategorie erhält welches
  Bestandsitem (fachliche Zuordnung, kein technisches Problem).
- Fallback-Icon-Strategie, falls ein referenzierter Icon-Key künftig aus der
  Bibliothek entfernt wird.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

**Icon-Bibliothek (neu, reiner Code, keine Bild-Dateien):**
```
Icon-Bibliothek
+-- Spedition-Icon-Set (jetzt gebaut)
|   +-- Kategorie Fahrzeuge      (z. B. 5+ Illustrationen: Sattelschlepper,
|   |                              Kleintransporter, Gabelstapler, ...)
|   +-- Kategorie Gebäude & Deko (Lagerhalle, Tor, Flaggen, ...)
|   +-- Kategorie Ladung & Ausstattung (Paletten, Container, Kisten, ...)
|   +-- Kategorie Abzeichen/Trophäen (Pokal, Schild, ...)
+-- Tourismus-Icon-Set (Platzhalter-Struktur, Inhalt folgt erst mit eigenem
    Shop-Katalog, siehe PROJ-25) — kein Bestandteil dieser Umsetzung
```
Jede Illustration hat einen Schlüssel (z. B. „lkw-rot") und ist fest einer
der vier Kategorien zugeordnet — dieselbe Zuordnung bestimmt sowohl die
Icon-Auswahl im Admin-Formular als auch die Zone in der Hof-Szene.

**Admin-Formular** (`shop-item-form-modal.tsx`, erweitert):
```
Item-Formular (bestehend: Name, Beschreibung, Preis)
+-- NEU: Kategorie-Auswahl (eine von vier festen Optionen)
+-- GEÄNDERT: Icon-Feld wird zum Icon-Picker — zeigt nur die Illustrationen
    aus dem Icon-Set des eigenen Fachbereichs, mit Vorschau statt Freitext
```

**Shop-Seite** (`shop-client.tsx`, strukturell unverändert):
```
Item-Kachel (bestehend: Name, Beschreibung, Preis, Kauf-Button, Zustände)
+-- GEÄNDERT: Emoji-Anzeige → SVG-Illustration aus der Icon-Bibliothek
+-- NEU: kleines Kategorie-Label/Farbakzent auf der Kachel
```

**Profil-Seite, „Mein Hof"** (`hof-gallery.tsx`, wird zur Hof-Szene):
```
Hof-Szene (ersetzt das bisherige 3-Spalten-Kachel-Raster)
+-- Zone „Fahrzeuge"            — nur sichtbar, wenn ≥ 1 Item dieser Kategorie
+-- Zone „Gebäude & Hof-Deko"   — nur sichtbar, wenn ≥ 1 Item dieser Kategorie
+-- Zone „Ladung & Ausstattung" — nur sichtbar, wenn ≥ 1 Item dieser Kategorie
+-- Zone „Abzeichen/Trophäen"   — nur sichtbar, wenn ≥ 1 Item dieser Kategorie
+-- Versteckte Text-Liste (Name + Kategorie je Item) für Screen-Reader
+-- Leerzustand (unverändert aus PROJ-20), wenn gar keine Käufe vorhanden sind
```
Jede Zone ordnet ihre Items automatisch nach der Kategorie des Items an —
es gibt keine vom Nutzer gespeicherte Position.

### B) Datenmodell (in normaler Sprache)

- **`shop_items` bekommt zwei neue Felder:**
  - **Kategorie:** einer von genau vier festen Werten (Fahrzeuge, Gebäude &
    Hof-Deko, Ladung & Ausstattung, Abzeichen/Trophäen) — bestimmt die Zone
    in der Hof-Szene.
  - **Icon-Schlüssel:** ein Text-Code, der auf genau eine Illustration im
    Icon-Set des Fachbereichs dieses Items verweist (z. B. „lkw-rot"). Ersetzt
    das bisherige freie Emoji-Textfeld als primäre Darstellung.
  - Das bestehende Emoji-Feld bleibt als Fallback/Übergang erhalten (z. B.
    falls ein Icon-Schlüssel einmal nicht auflösbar ist), wird aber im Shop
    und in der Hof-Szene nicht mehr angezeigt, sobald ein gültiger
    Icon-Schlüssel vorhanden ist.
- **Kein neues Feld für Positionierung** — automatische Zonen-Zuordnung über
  die Kategorie, keine gespeicherten Koordinaten pro Nutzer oder Item.
- **Die Icon-Bibliothek selbst lebt im Code, nicht in der Datenbank** — pro
  Fachbereichs-Code (z. B. „SPED") ein Satz von Illustrationen. Das ist
  dieselbe Art Entscheidung wie bei den bestehenden `BADGE_DEFINITIONS`:
  Inhalte, die Design-Arbeit brauchen, liegen im Code; Inhalte, die der Admin
  frei verwalten soll (Name, Beschreibung, Preis, Kategorie-Zuordnung je
  Item), bleiben in der Datenbank.
- **Migration der 4 bestehenden Spedition-Items:** bekommen beim Ausliefern
  dieser Spec rückwirkend eine passende Kategorie und einen passenden
  Icon-Schlüssel zugewiesen (reine Backfill-Änderung, kein Verhalten für
  Nutzer ändert sich dadurch).

### C) Tech-Entscheidungen (Begründung)

- **Eigenes Icon-Set je Fachbereich statt eines gemeinsamen Satzes:**
  Spedition- und Tourismus-Gegenstände passen fachlich nicht zusammen (LKW
  vs. Koffer/Flugzeug). Da `shop_items` ohnehin schon strikt nach
  Fachbereich getrennt ist (PROJ-22/23), ist ein getrenntes Icon-Set pro
  Fachbereichs-Code die konsistente Fortsetzung dieser bestehenden Trennung,
  statt einen Kompromiss aus „neutralen" Icons zu suchen, der zu keinem der
  beiden Fachbereiche richtig passt.
- **Nur das Spedition-Set wird jetzt gebaut:** Tourismus hat laut PROJ-25
  bewusst noch keinen Shop-Katalog (Entscheidung liegt bei der künftigen
  Lehrkraft). Ein Tourismus-Icon-Set vorab zu bauen wäre Aufwand ohne
  aktuellen Nutzen. Die Code-Struktur (Icon-Set-Nachschlag über den
  Fachbereichs-Code) erlaubt aber, später ein zweites Set zu ergänzen, ohne
  das Schema oder die Hof-Szenen-Logik zu ändern.
- **Icon-Schlüssel statt direktem Bild-/SVG-Inhalt in der Datenbank:** hält
  die „kein Bild-Upload"-Entscheidung aus PROJ-20 aufrecht. Der Admin wählt
  aus einer kuratierten, geschlossenen Liste statt Freitext einzugeben — das
  verhindert kaputte oder fehlende Grafiken, die bei freiem Text entstehen
  könnten.
- **Feste Kategorie als geschlossene Auswahl statt Freitext:** notwendig,
  damit die Hof-Szene die vier Zonen zuverlässig befüllen kann. Freitext
  („Fahrzeug" vs. „fahrzeuge" vs. „LKW") würde die automatische Zonierung
  unzuverlässig machen.
- **Automatische Zonen nach Kategorie statt freier Positionierung:** mit dem
  Nutzer in `/requirements` bewusst so entschieden — geringerer Aufwand,
  kein zusätzlicher Positions-Zustand pro Nutzer zu speichern, bleibt auf
  dem Smartphone robust (kein Drag-&-Drop auf kleinen Touch-Flächen nötig).
- **Shop-Seite bleibt bei Kacheln, keine Szene:** ebenfalls eine bewusste
  Entscheidung aus `/requirements` — der Kauf-Flow (Preis, Button,
  „nicht leistbar") ist an Kacheln gebunden; eine Szene mit Kauf-Interaktion
  wäre ein eigenes, größeres Thema.

### D) Abhängigkeiten (neue Pakete)

Keine. Die Illustrationen entstehen als Inline-SVG-React-Komponenten direkt
im Projekt (gleiche Technik wie die bereits genutzten `lucide-react`-Icons,
nur projekteigen gezeichnet) — keine neue Icon-Bibliothek, kein Bild-Hosting,
keine KI-Bildgenerierung.

### Offene Punkte aus der Spec — hier beantwortet

- **Icon-Bibliotheks-Struktur:** ein Icon-Set pro Fachbereichs-Code, jede
  Illustration mit festem Kategorie-Tag; Admin-Formular zeigt nur das Set des
  eigenen Fachbereichs mit Vorschau-Kacheln statt Freitext (siehe
  „Komponenten-Struktur").
- **Visuelles Zonen-Konzept:** vier klar getrennte, nur bei Inhalt sichtbare
  Zonen in der Hof-Szene, automatisch nach Kategorie befüllt, mit
  Text-Alternative für Barrierefreiheit.
- **Migration der Bestandsitems:** rückwirkende Kategorie- und
  Icon-Schlüssel-Zuweisung für die 4 bestehenden Spedition-Items als reine
  Backfill-Migration.
- **Fallback-Strategie:** bestehendes Emoji-Feld bleibt als technischer
  Fallback erhalten, falls ein Icon-Schlüssel einmal ins Leere verweist.

## Implementation Notes (Frontend)

**Stand 2026-10-05 — Frontend gebaut, Backend steht noch aus.** Gleiche
Vorgehensweise wie bei PROJ-19/20: clientseitig gegen den unten stehenden
Endpunkt-Vertrag verdrahtet, mit Fallback-Rendering statt Absturz, falls das
Backend die neuen Felder noch nicht liefert. Geprüft per `npm run build`
(fehlerfrei) und vollständigem Testlauf (561/561 grün — unverändert, da noch
keine API-Route angefasst wurde). `npm run lint` lässt sich in dieser
Umgebung aktuell nicht ausführen (ESLint 9 sucht eine `eslint.config.js`,
das Projekt hat nur eine ältere Konfigurationsform — vorbestehendes,
projektweites Problem, nicht durch diese Änderung verursacht).

**Gebaut:**
- `src/lib/hof-icons.tsx` — Icon-Bibliothek: 20 handgezeichnete Inline-SVG-
  Illustrationen für das Spedition-Set (5 je Kategorie), `HOF_CATEGORIES`
  (feste 4 Werte + Label), `getHofIconSet`/`getHofIconsByCategory`/
  `resolveHofIcon` je Fachbereichs-Code. Tourismus-Set bewusst leer (siehe
  Tech Design) — kein Shop-Katalog dort vorhanden.
- `src/components/hof-item-icon.tsx` — `HofItemIcon`: zentrale Render-Logik
  (SVG → altes Emoji-Feld → generisches Platzhalter-Icon), einmal gebaut,
  in Shop, Hof-Szene, Kauf-Bestätigung und Admin-Tabelle wiederverwendet.
- `src/components/admin/hof-icon-picker.tsx` — `HofIconPicker`: Icon-Auswahl
  im Admin-Formular, gefiltert auf Fachbereich **und** gewählte Kategorie,
  mit Vorschau je Illustration (44 px Touch-Ziele).
- `src/components/admin/shop-item-form-modal.tsx` — Freitext-Icon-Feld
  entfernt, ersetzt durch Kategorie-Select (shadcn `Select`) + `HofIconPicker`
  darunter; Kategorie-Wechsel setzt eine bereits gewählte Illustration
  zurück, damit Icon und Kategorie nie auseinanderlaufen; Validierung für
  beide Pflichtfelder ergänzt.
- `src/app/admin/shop-items/page.tsx` — neue Kategorie-Spalte in der Tabelle,
  Icon-Darstellung über `HofItemIcon` statt rohem Emoji-Span.
- `src/app/shop/shop-client.tsx` — Kachel zeigt `HofItemIcon` statt Emoji
  plus kleines Kategorie-Label; Kauf-Bestätigungsdialog ebenfalls auf
  `HofItemIcon` umgestellt.
- `src/components/hof-gallery.tsx` — zur Hof-Szene umgebaut: vier Zonen nach
  `HOF_CATEGORIES`, eine Zone wird nur gerendert, wenn mindestens ein
  gekauftes Item dieser Kategorie existiert; zusätzlich eine `sr-only`-Liste
  (Name + Kategorie je Item) als Text-Alternative für Screen-Reader: Die
  Szene selbst ist `aria-hidden`, die Liste trägt die zugängliche Information.
  Lade-/Fehler-/Leerzustand aus PROJ-20 unverändert übernommen.

**Angenommener API-Vertrag für `/backend`** (ergänzt den bestehenden
PROJ-20-Vertrag um zwei Felder, alte `icon`-Spalte bleibt als Fallback
erhalten):
- `GET /api/shop/items` → jedes Item zusätzlich mit
  `{ category: 'fahrzeuge' | 'gebaeude_deko' | 'ladung_ausstattung' |
  'abzeichen_trophaeen', icon_key: string }`; `owned_items` ebenso
- `POST /api/shop/purchase` → Response-`item` ebenfalls mit `category` +
  `icon_key` (fürs Bestätigungsdialog-Icon)
- `GET /api/admin/shop-items` → zusätzlich `category`, `icon_key`
- `POST /api/admin/shop-items` → Body zusätzlich `{ category, icon_key }`
  statt des bisherigen freien `icon`-Felds; Server validiert `category` gegen
  die vier festen Werte und `icon_key` optional gegen das Icon-Set des
  Fachbereichs (zusätzliche serverseitige Absicherung, da das Frontend die
  Auswahl zwar einschränkt, ein direkter API-Aufruf das aber umgehen könnte)
- `PATCH /api/admin/shop-items/[id]` → `category`/`icon_key` wie oben
  editierbar

**Wichtig für `/backend`:**
- Migration der 4 bestehenden Spedition-Items braucht eine Kategorie- und
  Icon-Schlüssel-Zuweisung passend zu den Namen (z. B. „Roter
  Sattelschlepper" → `fahrzeuge` / `sattelschlepper-rot`, „Ampel-Deko" →
  `gebaeude_deko` / am ehesten `hoftor` oder `strassenlaterne` je nach
  fachlicher Einschätzung, „Neues Lagertor" → `gebaeude_deko` / `hoftor`,
  „Wachhund Bello" → am ehesten `abzeichen_trophaeen`, da kein passendes
  Tier-Icon im Ausgangssatz existiert — oder das Set um ein Tier-Icon
  ergänzen, falls das fachlich stimmiger wirkt).
- Die gültigen `icon_key`-Werte des Spedition-Sets stehen in
  `src/lib/hof-icons.tsx` (`SPED_ICONS`) — Server-Validierung sollte exakt
  gegen diese Liste prüfen, nicht gegen Freitext.

**Noch nicht möglich:** interaktives Durchklicken im Browser mit echtem
Login — in dieser Umgebung fehlt ein Browser-Automatisierungs-Tool
(konsistent mit PROJ-19/20/21). Ein kurzer manueller Test durch den Nutzer
wird vor `/qa` empfohlen, insbesondere die Hof-Szene mit echten Käufen über
mehrere Kategorien hinweg.

## Implementation Notes (Backend)

**Stand 2026-10-05 — Backend gebaut, Migration nach expliziter Nutzer-
Freigabe auf die Produktions-DB angewendet** (Supabase-Projekt „Spedilern
App", `riqafwijurbxvywzlipx`). Rückwirkende Zuordnung der 4 Bestandsitems
per `SELECT` verifiziert — alle vier korrekt mit `category`/`icon_key`
belegt. Security-Advisor direkt danach geprüft: keine neuen Findings durch
diese Migration (die gemeldeten Punkte betreffen ausschließlich die
fachfremden `wk_*`/`sq_*`-Tabellen der separaten „Werkzeugkiste"/
„Speditionsquiz"-Anwendung im selben Projekt sowie bereits vorher
bestehende Funktionen — siehe auch der gleichartige Nebenbefund in PROJ-20).

**Datenbank** (`supabase/migrations/20261005_proj26_hof_kategorien_icons.sql`,
Rollback in `..._down.sql`):
- `shop_items` bekommt `category text NOT NULL` (CHECK gegen die vier festen
  Werte) und `icon_key text NOT NULL`
- `icon` (Emoji) verliert `NOT NULL` — bleibt als Fallback-Spalte bestehen,
  wird für neue Items aber nicht mehr befüllt
- Rückwirkende Zuordnung der 4 Spedition-Bestandsitems, inkl. zwei neuer
  Illustrationen im Icon-Set für den fachlich stimmigen Fall statt eines
  erzwungenen Kompromisses: `ampel` (für „Ampel-Deko") und `wachhund` (für
  „Wachhund Bello") — beide neu in `src/lib/hof-icons.tsx`, Kategorie
  `gebaeude_deko`. Das Spedition-Set hat dadurch jetzt 22 statt 20
  Illustrationen (weiterhin ≥ 5 je Kategorie, Akzeptanzkriterium erfüllt).
- Sicherer Rückfall (`abzeichen_trophaeen` / `pokal`) für unerwartete,
  unbenannte Bestandsitems, damit die NOT-NULL-Umstellung nie fehlschlägt.

**API-Routen (geändert):**
- `GET /api/shop/items` — `select` erweitert um `category, icon_key`, sowohl
  für den aktiven Katalog als auch für `owned_items` (Service-Client-Pfad)
- `GET /api/admin/shop-items` — `select` erweitert um `category, icon_key`
- `POST /api/admin/shop-items` — Body-Schema von `icon` auf
  `{ category, icon_key }` umgestellt (Zod-Enum gegen die vier festen
  Kategorie-Werte, abgeleitet aus `HOF_CATEGORIES`); zusätzliche
  Server-Prüfung `iconKeyBelongsToCategory(department.code, category,
  icon_key)` — verhindert, dass ein direkter API-Aufruf (am Frontend vorbei)
  eine zur Kategorie oder zum Fachbereich nicht passende Illustration setzt
- `PATCH /api/admin/shop-items/[id]` — gleiche Umstellung; validiert auch,
  wenn nur eines der beiden Felder im Request steht (das jeweils andere kommt
  dann vom bestehenden Datensatz) — verhindert ein stilles Auseinanderlaufen
  von Kategorie und Icon bei Teil-Updates
- `POST /api/shop/purchase` — **unverändert.** Die Kauf-Bestätigung im
  Frontend nutzt das bereits im Browser vorhandene Item-Objekt aus der
  vorherigen `GET /api/shop/items`-Antwort (inkl. `category`/`icon_key`) statt
  eines neuen Felds in der Purchase-Response — die ursprüngliche Annahme in
  den Frontend-Notizen war hier nicht nötig.

**Validierung:** `category` und `icon_key` sind Pflichtfelder beim Anlegen
(keine Icon-Picker-Auswahl im Frontend → leerer String → 400 durch Zod).
Serverseitige Kategorie/Icon-Übereinstimmungsprüfung ist bewusst zusätzlich
zur Frontend-Einschränkung vorhanden (Security-Regel: nie nur
client-seitig validieren).

**Tests:** 4 neue/angepasste Testfälle in
`src/app/api/admin/shop-items/route.test.ts` und
`.../shop-items/[id]/route.test.ts` (ungültige Kategorie, Icon/Kategorie-
Mismatch bei Anlage und bei Teil-Update). Gesamte Suite: 565/565 grün,
`npm run build` fehlerfrei. `npm run lint` weiterhin nicht ausführbar in
dieser Umgebung (vorbestehendes ESLint-9-Konfigurationsproblem, siehe
Frontend-Notizen).

**Noch offen:**
- Interaktiver Login-Test im Browser (kein Automatisierungstool in dieser
  Umgebung verfügbar) — empfohlen vor `/qa`, insbesondere: Admin legt ein
  Item mit neuer Kategorie/Icon an, Azubi kauft es, „Mein Hof" zeigt die
  passende Zone.

## QA Test Results

**Tested:** 2026-10-05
**Tester:** QA Engineer (AI)
**Methode:** Code gegen alle Akzeptanzkriterien geprüft, `npm test` (575/575
grün, inkl. 10 neuer Fälle: `src/lib/hof-icons.test.ts` plus eine
verschärfte Assertion im bestehenden PROJ-20-BUG-2-Regressionstest),
`npm run build` (fehlerfrei), DB-Prüfungen direkt gegen die Produktions-DB
(CHECK-Constraint und NOT-NULL live mit absichtlich ungültigen Inserts
getestet, RLS-Policies unverändert verifiziert, keine Testzeilen
hinterlassen). **Nicht getestet:** Browser-Darstellung, Responsive-Verhalten,
Cross-Browser, E2E — in dieser Umgebung steht kein
Browser-Automatisierungs-Tool zur Verfügung, und `npm run dev` /
`npx playwright install` sind auf dieser Maschine nicht nutzbar (bekanntes,
dauerhaftes Hardware-Problem, nicht Teil dieses Features). Ein kurzer
manueller Test durch den Nutzer wird empfohlen, bevor deployed wird.

### Acceptance Criteria Status

#### Datenmodell & Admin
- [x] `category` ist Pflichtfeld mit genau den 4 Werten — live mit
      ungültigem Insert gegen die Produktions-DB getestet: CHECK-Constraint
      hat abgelehnt (`23514 check_violation`), kein Datenmüll hinterlassen
- [x] Alle 4 Bestandsitems haben nach der Migration eine sinnvolle Kategorie
      (per `SELECT` gegen Produktion verifiziert)
- [x] Admin wählt Kategorie aus fester Auswahl (shadcn `Select`, kein
      Freitext mehr möglich)
- [x] Admin wählt Illustration aus fester Bibliothek mit Vorschau
      (`HofIconPicker`, Vorschau vor dem Speichern sichtbar)
- [x] Icon-Set deckt ≥ 5 Illustrationen je Kategorie ab (insgesamt 22) — als
      Unit-Test festgeschrieben (`hof-icons.test.ts`), damit künftige
      Icon-Änderungen das nicht stillschweigend unterschreiten
- [x] Admin sieht nur das Icon-Set des eigenen Fachbereichs (Picker ist nach
      `departmentCode` gefiltert; für Tourismus — leeres Set — zeigt der
      Picker korrekt einen Hinweistext statt Spedition-Icons)
- [ ] **BUG-1:** Ausgangskatalog deckt NICHT alle 4 Kategorien mit je
      ≥ 2 aktiven Items ab (siehe unten)
- [x] Referenzpreis-Item bleibt bei 75 Münzen, Kategorie/Icon-Zuweisung hat
      den Preis nicht verändert (verifiziert)

#### Hof-Szene (Profil, „Mein Hof")
- [x] Vier erkennbare Zonen, je nur sichtbar bei ≥ 1 Item dieser Kategorie
- [x] Jedes Item erscheint als SVG-Illustration in der Zone seiner Kategorie
- [x] Leere Zone wird nicht gerendert (kein kaputt wirkender Leerraum)
- [x] Account ohne Käufe zeigt weiterhin den bestehenden Leerzustand aus
      PROJ-20 (Code-Pfad unverändert übernommen)
- [~] Mobile-tauglich — strukturell plausibel (`flex flex-wrap`, keine festen
      Breiten), aber **nicht visuell im Browser verifiziert** (Umgebungs-
      einschränkung, siehe oben)
- [x] Screen-Reader-Textalternative vorhanden (`sr-only`-Liste mit Name +
      Kategorie, Szene selbst `aria-hidden`)
- [x] Deaktiviertes, aber gekauftes Item bleibt in der passenden Zone
      sichtbar — `owned_items`-Query liefert `category`/`icon_key`
      unabhängig von `is_active`; durch verschärften Regressionstest
      abgesichert (PROJ-20 BUG-2 bleibt behoben)

#### Shop-Seite
- [x] Kachel zeigt dieselbe SVG-Illustration wie die Hof-Szene
- [x] Kauf-Button, Preis, „im Besitz", „nicht leistbar" unverändert (Logik
      nicht angefasst, nur die Icon-Darstellung ersetzt)
- [x] Kachel zeigt die Kategorie sichtbar (Label-Pill)

### Edge Cases Status
- [x] Kategorie-Wechsel eines Items wirkt sofort auf bereits gekaufte
      Exemplare (keine eingefrorene Kategorie, anders als der Preis)
- [~] Viele Items in einer Zone — strukturell durch `flex-wrap` abgefangen,
      nicht visuell mit echten Massendaten getestet
- [x] Alle Zonen leer außer einer — aktuell live reproduziert (Produktion hat
      genau diesen Zustand: nur 2 von 4 Kategorien befüllt, siehe BUG-1)
- [x] Fallback-Icon greift, falls ein Icon-Schlüssel nicht auflösbar ist
      (`HofItemIcon`: SVG → altes Emoji-Feld → generisches Platzhalter-Icon)
- [x] Kein Item ohne Kategorie möglich (DB: `NOT NULL` + `CHECK`, live
      getestet)

### Security Audit Results
- [x] Authentifizierung: alle betroffenen Routen weiterhin hinter Login/
      Admin-Prüfung (unverändert aus PROJ-20/24)
- [x] Autorisierung: ein Fachbereichs-Admin kann weiterhin keine Items eines
      fremden Fachbereichs bearbeiten (`assertCanAdminDepartment` unverändert
      vor der neuen Prüfung ausgeführt)
- [x] Server-seitige Validierung über das Frontend hinaus: ein direkter
      API-Aufruf mit nicht zur Kategorie passendem `icon_key` wird mit 400
      abgelehnt (`iconKeyBelongsToCategory`, per Unit- und Integrationstest
      abgesichert) — verhindert, dass die Frontend-Einschränkung die einzige
      Schutzschicht ist
- [x] DB-CHECK als zweite Verteidigungslinie unterhalb der API bestätigt
      (direkter Insert-Versuch mit ungültiger Kategorie schlägt auch dann
      fehl, wenn die API-Schicht umgangen würde)
- [x] Kein XSS-Risiko durch neue Komponenten (kein `dangerouslySetInnerHTML`,
      React escaped Name/Beschreibung wie zuvor)
- [ ] **BUG-2 (Low):** `HofIconPicker` nutzt `role="radiogroup"`/`role="radio"`
      ohne die dafür laut WAI-ARIA erwartete Pfeiltasten-Navigation

### Bugs Found

#### BUG-1: Ausgangskatalog deckt nicht alle 4 Kategorien ab
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Produktionskatalog nach der Migration ansehen (`SELECT category,
     count(*) FROM shop_items WHERE is_active GROUP BY category`)
  2. Ergebnis: `fahrzeuge` → 1, `gebaeude_deko` → 3, `ladung_ausstattung` →
     0, `abzeichen_trophaeen` → 0
  3. Erwartet laut AC: mindestens 2 aktive Items je Kategorie
  4. Tatsächlich: zwei Zonen („Ladung & Ausstattung", „Abzeichen/Trophäen")
     sind für jeden Nutzer von Anfang an leer und werden in der Hof-Szene
     nie angezeigt; „Fahrzeuge" hat nur 1 statt mindestens 2
- **Ursache:** Das Backend hat die 4 Bestandsitems nur rückwirkend
  kategorisiert, aber keine neuen Seed-Items für die noch unbefüllten
  Kategorien ergänzt (reine Content-Lücke, kein Code-Fehler — die
  Zonen-Logik selbst arbeitet korrekt)
- **Priority:** Fix before deployment — ist aber ein reiner Content-Fix
  (zusätzliche `shop_items`-Zeilen für die fehlenden Kategorien), kein
  Code-Fix; kann z. B. über eine kleine additive Migration oder direkt über
  das bereits funktionierende Admin-Formular nachgeholt werden

#### BUG-2: Icon-Picker ohne Pfeiltasten-Navigation trotz Radio-Rollen
- **Severity:** Low
- **Steps to Reproduce:**
  1. Admin-Formular öffnen, Kategorie wählen → `HofIconPicker` erscheint
     (`role="radiogroup"` mit `role="radio"`-Buttons)
  2. Mit der Tastatur zwischen den Illustrationen navigieren
  3. Erwartet (WAI-ARIA Radiogroup Pattern): Pfeiltasten wechseln zwischen
     den Optionen, nur eine davon ist per Tab erreichbar
  4. Tatsächlich: jeder Icon-Button ist einzeln per Tab erreichbar, keine
     Pfeiltasten-Logik — funktioniert für Maus- und einfache
     Tastaturnutzung, weicht aber vom für diese ARIA-Rolle erwarteten
     Verhalten ab und kann Screenreader-Nutzer verwirren
- **Priority:** Nice to have — blockiert niemanden, ist aber ein
  ARIA-Rollen-/Verhaltens-Mismatch

### Summary
- **Acceptance Criteria:** 17/18 passed (1 Medium-Bug), alle dokumentierten
  Edge Cases verhalten sich wie spezifiziert
- **Bugs Found:** 2 total (0 critical, 0 high, 1 medium, 1 low)
- **Security:** Pass — serverseitige Kategorie/Icon-Validierung und
  DB-CHECK-Constraint live bestätigt, keine neuen Advisor-Findings durch die
  Migration
- **Production Ready:** NO. Kein Critical/High, aber BUG-1 sollte vor dem
  Deploy behoben werden — sonst erscheinen zwei von vier Hof-Szenen-Zonen
  für jeden Nutzer von Anfang an leer, was dem eigentlichen Zweck dieses
  Features (sichtbar wachsende Sammlung) direkt widerspricht. BUG-2 (Low)
  blockiert das Deployment nicht.
- **Recommendation:** Vor dem Deploy mindestens je 1–2 weitere Items für
  „Ladung & Ausstattung" und „Abzeichen/Trophäen" anlegen (und ein weiteres
  für „Fahrzeuge"), damit beim ersten Produktiv-Einsatz wirklich alle vier
  Zonen etwas zeigen. BUG-2 kann unabhängig davon später behoben werden.

### Fix BUG-1 (2026-10-09)
Migration `20261009_proj26_seed_katalog.sql` (+ `_down`) in der Produktions-DB
angewendet: 5 neue Spedition-Items (Blauer Transporter 60, Europalette 30,
Seecontainer 150, Pokal 100, Stern-Abzeichen 250). Aktive Items je Kategorie
jetzt: Fahrzeuge 2, Gebäude & Deko 3, Ladung 2, Trophäen 2 — alle vier Zonen
sind befüllbar. Das 75-Münzen-Referenzitem bleibt unberührt. BUG-2 (Low) offen.
Unit-Tests (49) grün, `tsc` ohne Fehler in `src`. Nächster Schritt: `/deploy`.

## Deployment
_To be added by /deploy_
