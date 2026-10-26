# PROJ-45: Lehrkräfte-Arbeitsbereich – modernes Layout für Desktop & Handy

## Status: In Progress
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Kontext
Teil 2 der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Die Schülerseite bleibt Mobile-First und Dark Mode wie in `docs/DESIGN.md`. Lehrkräfte arbeiten dagegen oft am Laptop, am Beamer oder drucken aus. Der Lehrkräfte-Bereich soll sich deshalb anfühlen wie ein aktuelles professionelles Werkzeug (Vorbilder: Linear, Notion, Vercel-Dashboard): ruhig, schnell, übersichtlich, mit derselben Qualität auf Desktop und Handy.

PROJ-40 hat bereits Startseite, Seitenleiste (Desktop) und Menü (Handy) eingeführt. Dieses Feature baut darauf auf und hebt den Bereich auf ein durchgängiges, modernes Niveau. **Es kommen keine neuen Fachfunktionen dazu.**

### Entscheidungen (Nutzer, 2026-10-26)
- **E1 – Desktop und Handy gleichwertig:** Auf großen Bildschirmen gibt es eine Seitenleiste, auf dem Handy eine kompakte Navigation.
- **E2 – Hell und dunkel wählbar:** Standard ist dunkel (passend zur App). Wählbar sind hell, dunkel und „wie System“. Der helle Modus ist vor allem für Beamer und Druck gedacht.

## Dependencies
- Requires: PROJ-40 (Lehrkräfte-Bereich übersichtlicher) – Startseite, gruppierte Navigation, bestehende URLs
- Requires: PROJ-44 (Lehrkraft-Rolle & Freischaltung) – rollenabhängige Navigation für Lehrkraft / Bereichs-Admin / Super-Admin
- Berührt: PROJ-28 (Druckansichten) – müssen unverändert funktionieren

## User Stories
- Als **Lehrkraft am Laptop** möchte ich eine feste Seitenleiste mit allen meinen Bereichen, damit ich mit einem Klick überall hinkomme.
- Als **Lehrkraft** möchte ich die Seitenleiste einklappen können, damit ich bei breiten Tabellen (z. B. Notenliste) mehr Platz habe.
- Als **Lehrkraft am Handy** möchte ich den Bereich genauso gut bedienen können, damit ich unterwegs schnell einen Nachweis öffnen oder einen Code nachsehen kann.
- Als **Lehrkraft am Beamer** möchte ich auf einen hellen Modus umschalten, damit die Klasse den Code oder die Auswertung gut lesen kann.
- Als **geübte Lehrkraft** möchte ich mit einer Schnellsuche (Tastenkürzel ⌘K / Strg+K) Seiten und Aktionen finden, damit ich nicht durch Menüs klicken muss.
- Als **Lehrkraft** möchte ich immer sehen, wo ich bin und wie ich zurückkomme, damit ich mich auch in tieferen Seiten nicht verliere.
- Als **Lehrkraft** möchte ich ein Konto-Menü mit Profil, Darstellung, „Zur Lern-App“ und Abmelden, damit Persönliches an einer festen Stelle liegt.
- Als **Lehrkraft mit Sehschwäche** möchte ich gute Kontraste, Tastaturbedienung und lesbare Schriftgrößen, damit ich den Bereich ohne Mühe nutzen kann.

## Acceptance Criteria

### Grundgerüst
- [ ] Alle Seiten des Lehrkräfte-Bereichs nutzen dasselbe Grundgerüst: Navigation, Kopfzeile mit Seitentitel, Inhaltsbereich. Seiten haben keine eigenen, abweichenden Kopfzeilen mehr.
- [ ] Jede Seite hat einen einheitlichen Seitenkopf: Titel, optional ein Satz Beschreibung, rechts die Hauptaktion (z. B. „Neuer Leistungsnachweis“). Pro Seite gibt es höchstens eine hervorgehobene Hauptaktion.
- [ ] Auf Unterseiten zeigt eine Brotkrumen-Zeile den Weg (z. B. „Leistungsnachweise › Klassenarbeit LF5“). Jedes Glied ist klickbar.
- [ ] Der Inhaltsbereich nutzt auf großen Bildschirmen die Breite sinnvoll: Tabellen und Listen werden breit, Formulare und Lesetexte bleiben auf eine gut lesbare Zeilenlänge begrenzt.
- [ ] Alle bestehenden URLs unter `/admin/...` funktionieren weiter. Lesezeichen bleiben gültig.

### Navigation Desktop (ab Tablet-Querformat)
- [ ] Links steht eine feste Seitenleiste mit den Gruppen aus PROJ-40, gefiltert nach Rolle (PROJ-44).
- [ ] Die Seitenleiste lässt sich auf eine schmale Icon-Leiste einklappen. Im eingeklappten Zustand zeigt jedes Icon beim Überfahren und beim Tastaturfokus seinen Namen.
- [ ] Der Zustand eingeklappt/ausgeklappt wird im Browser gemerkt.
- [ ] Oben in der Seitenleiste steht der Name des Bereichs, unten das Konto-Menü.
- [ ] Der aktive Eintrag ist hervorgehoben, auch auf Unterseiten.

### Navigation Handy
- [ ] Unterhalb der Tablet-Breite gibt es keine Seitenleiste. Die Kopfzeile zeigt Menü-Button, Seitentitel und Konto-Menü.
- [ ] Das Menü öffnet als Seitenschublade mit denselben Einträgen wie am Desktop und schließt nach Auswahl, beim Tippen daneben und per Wischgeste.
- [ ] Alle Bedienelemente sind mindestens 44 × 44 px groß.
- [ ] Tabellen werden auf dem Handy als Karten oder als waagerecht scrollbare Tabelle mit fester erster Spalte gezeigt. Die Seite selbst scrollt nie seitlich.

### Darstellung hell/dunkel (E2)
- [ ] Im Konto-Menü kann die Lehrkraft zwischen **Dunkel** (Standard), **Hell** und **Wie System** wählen.
- [ ] Die Wahl gilt sofort, ohne Neuladen, und wird gemerkt. Beim nächsten Öffnen erscheint die Seite ohne kurzes Aufblitzen der falschen Farbe.
- [ ] Beide Modi erfüllen WCAG 2.1 AA bei Kontrasten: Text mindestens 4,5 : 1, große Schrift und Bedienelemente mindestens 3 : 1.
- [ ] Die Markenfarben aus `docs/DESIGN.md` (Grün, Blau, Orange, Rot, Gold) bleiben erkennbar. Im hellen Modus werden sie wo nötig abgedunkelt, damit sie die Kontrastwerte erfüllen.
- [ ] Die Schülerseite (Lern-App) bleibt immer dunkel. Die Wahl betrifft ausschließlich den Lehrkräfte-Bereich.
- [ ] Druckansichten (PROJ-28) drucken immer hell auf weiß, unabhängig von der Wahl.

### Schnellsuche
- [ ] Mit ⌘K (Mac) bzw. Strg+K (Windows) und über ein Such-Symbol in der Kopfzeile öffnet sich eine Schnellsuche.
- [ ] Sie findet alle Seiten, die die Rolle sehen darf, und die wichtigsten Aktionen (mindestens: „Neuer Leistungsnachweis“, „Werkzeugkiste öffnen“, „Zur Lern-App“, „Darstellung wechseln“).
- [ ] Sie ist vollständig mit der Tastatur bedienbar: Pfeiltasten, Enter, Esc.
- [ ] Sie zeigt nie Einträge, für die die Rolle keine Rechte hat.
- [ ] Inhalte wie einzelne Nachweise oder Fragen durchsucht sie in diesem Feature nicht (spätere Erweiterung).

### Konto-Menü
- [ ] Das Konto-Menü zeigt Name und E-Mail und die Rolle in Klartext („Lehrkraft“, „Bereichs-Admin Spedition“, „Super-Admin“).
- [ ] Es enthält: Profil, Darstellung, „Zur Lern-App“, Abmelden.

### Zustände & Rückmeldungen
- [ ] Während Daten laden, zeigen Listen und Tabellen Platzhalter in der Form des späteren Inhalts statt eines Drehkreises über die ganze Seite.
- [ ] Leere Listen zeigen einen freundlichen Leerzustand mit einem Satz Erklärung und der passenden Hauptaktion (z. B. „Noch keine Leistungsnachweise. Lege deinen ersten an.“).
- [ ] Fehler beim Laden zeigen eine verständliche Meldung mit „Erneut versuchen“, keine technischen Fehlertexte.
- [ ] Erfolgreiche Aktionen bestätigen sich mit einer kurzen Einblendung (Toast). Löschen braucht immer eine Bestätigung.

### Barrierefreiheit & Qualität
- [ ] Der ganze Bereich ist ohne Maus bedienbar. Der Fokus ist immer sichtbar, und es gibt einen Link „Zum Inhalt springen“.
- [ ] Alle Icons ohne Text haben eine Beschriftung für Screenreader.
- [ ] Animationen sind kurz (≤ 200 ms) und entfallen, wenn das System „Bewegung reduzieren“ eingestellt hat.
- [ ] Die Startseite des Lehrkräfte-Bereichs ist auf einem durchschnittlichen Handy über Mobilfunk in unter 2,5 Sekunden nutzbar (Largest Contentful Paint).
- [ ] `docs/DESIGN.md` bekommt einen Abschnitt „Lehrkräfte-Bereich“ mit hellen und dunklen Farbwerten, Layout-Regeln und Komponenten-Regeln, damit künftige Seiten einheitlich bleiben.

## Edge Cases
- **Sehr lange Namen** (Nachweis-Titel, Lehrkraft-Name) in Seitenleiste, Brotkrumen oder Kopfzeile → werden mit „…“ gekürzt, der volle Text erscheint beim Überfahren oder Fokussieren.
- **Kleiner Laptop (1280 px) mit eingeblendeter Seitenleiste und breiter Notentabelle** → Die Tabelle scrollt innerhalb ihres Rahmens. Die Seitenleiste lässt sich einklappen, die Seite selbst scrollt nicht seitlich.
- **Gerät wechselt das Farbschema** (z. B. Mac schaltet abends auf dunkel) bei Einstellung „Wie System“ → Der Bereich folgt sofort.
- **Browserspeicher gesperrt oder gelöscht** (privates Fenster) → Es gelten die Standards (dunkel, Seitenleiste ausgeklappt). Nichts geht kaputt.
- **Rolle mit nur zwei Einträgen** (Lehrkraft) → Die Navigation wirkt nicht leer: Gruppen ohne Einträge werden ausgeblendet, und die Startseite füllt den Platz sinnvoll.
- **Druck aus dem dunklen Modus** → Der Druck erfolgt immer hell, ohne Navigation und Kopfzeile.
- **Tablet hochkant** → zählt als Handy-Layout. Querformat zeigt die Seitenleiste.

## Abgrenzung (nicht Teil dieses Features)
- Neue Fachfunktionen oder neue Seiten (außer Konto-Menü und Schnellsuche)
- Änderungen an der Schülerseite
- Volltextsuche über Nachweise, Fragen oder Materialien
- Integration der Werkzeugkiste (bleibt bis zu einem späteren Feature ein externer Link)

## Technical Requirements
- **shadcn/ui first:** vorhandene Bausteine nutzen (z. B. Sidebar, Sheet, Command, DropdownMenu, Breadcrumb, Skeleton, Sonner), keine Eigenbauten bereits installierter Komponenten.
- **Farben als Design-Tokens** (CSS-Variablen) für hell und dunkel, damit keine Seite feste Farbwerte wie `#111827` mehr direkt verwendet.
- **Browser:** aktuelle Versionen von Chrome, Edge, Safari (macOS/iOS), Firefox.
- **Tests:** Vitest für Navigation, Rollenfilter und Darstellungswahl, dazu `npm run build`. Kein Dev-Server und kein Playwright (Projekt-Memory „Kein Dev-Server“). Sichtprüfung über statische Vorschaubilder in `docs/vorschau/`.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Ergebnis in einem Satz:** Reines Oberflächen-Feature ohne Datenbank und ohne neue API-Routen. Es entsteht ein neuer gemeinsamer Rahmen (Seitenleiste, Kopfzeile, Seitenkopf, Schnellsuche, Konto-Menü), eine Farb-Schicht für hell/dunkel, und alle bestehenden Lehrkräfte-Seiten werden auf diese Schicht umgestellt.

### Ausgangslage (geprüft am 2026-10-26)
- Rahmen aus PROJ-40: eigene Seitenleiste (`aside`) ab 1024 px, darunter `Sheet`-Menü. Nicht einklappbar, kein Konto-Menü, keine Schnellsuche.
- **Farben sind fest eingetragen:** 1.691 Farbwerte in 42 Dateien (12 Seiten, ca. 30 Bausteine). Es sind aber nur rund 20 verschiedene Werte, 6 davon machen über 80 % aus. Deshalb lässt sich die Umstellung weitgehend automatisch erledigen.
- Bereits installiert und bisher ungenutzt: shadcn-Bausteine `Sidebar`, `Command` (Schnellsuche), `Breadcrumb`, `Skeleton`, `DropdownMenu`, `Tooltip`. `AlertDialog` und `Sonner` sind schon im Einsatz.
- Neun Seiten zeigen beim Laden einen Drehkreis; vier Seiten fragen beim Löschen schon über einen Dialog nach.

### A) Aufbau der Oberfläche

```
Lehrkräfte-Rahmen (gemeinsames Layout, alle /admin-Seiten)
+-- Link „Zum Inhalt springen“ (nur bei Tastaturfokus sichtbar)
|
+-- Seitenleiste (ab 1024 px, einklappbar auf Icon-Leiste)
|   +-- Kopf: Bereichsname (z. B. „Lehrkräfte · Spedition“)
|   +-- Übersicht
|   +-- Gruppen Unterricht / Inhalte / Einstellungen (nach Rolle gefiltert,
|   |   leere Gruppen ausgeblendet)
|   +-- Fuß: Konto-Menü
|
+-- Kopfzeile (fest oben)
|   +-- Handy: Menü-Button · Seitentitel · Such-Symbol · Konto-Avatar
|   +-- Desktop: Einklapp-Button · Brotkrumen · Such-Feld (⌘K) ·
|       Bereichs-Umschalter (nur Super-Admin)
|
+-- Mobil-Menü (unter 1024 px: Schublade von links, gleiche Einträge)
|
+-- Inhaltsbereich
|   +-- Seitenkopf: Titel · ein Satz Beschreibung · eine Hauptaktion
|   +-- Seiteninhalt: „breit“ (Tabellen, Listen) oder „schmal“ (Formulare, Texte)
|
+-- Schnellsuche (Fenster über allem, ⌘K / Strg+K)
|   +-- Gruppe „Seiten“ (aus der Navigations-Liste, nach Rolle gefiltert)
|   +-- Gruppe „Aktionen“ (Neuer Leistungsnachweis, Werkzeugkiste öffnen,
|       Zur Lern-App, Darstellung: Hell / Dunkel / Wie System)
|
+-- Konto-Menü (aufklappend)
    +-- Name · E-Mail · Rolle in Klartext
    +-- Profil · Darstellung (3 Optionen) · Zur Lern-App · Abmelden

Wiederverwendbare Zustands-Bausteine (für alle Seiten)
+-- Lade-Platzhalter in Form von Tabelle, Kartenliste oder Formular
+-- Leerzustand (Icon, ein Satz, passende Hauptaktion)
+-- Fehlerzustand (verständlicher Satz + „Erneut versuchen“)
+-- Responsive Tabelle (Handy: waagerecht scrollbar mit fester erster Spalte,
    oder Kartenansicht, je nach Seite)
```

**Eine Liste als Wahrheitsquelle bleibt:** Seitenleiste, Mobil-Menü, Startseiten-Kacheln, Brotkrumen und Schnellsuche lesen alle aus der vorhandenen Navigations-Liste aus PROJ-40. Neu kommt dort nur eine kleine Aktionsliste für die Schnellsuche dazu. Der Rollenfilter ist derselbe wie für die Seitenleiste. So kann die Schnellsuche nie Einträge zeigen, die die Seitenleiste verbirgt.

### B) Datenmodell
Es werden **keine Daten in der Datenbank gespeichert**. Im Browser werden zwei kleine Einstellungen gemerkt, beide als Cookie:

| Einstellung | Werte | Standard, wenn nichts gemerkt ist |
|---|---|---|
| Darstellung | dunkel · hell · wie System | dunkel |
| Seitenleiste | ausgeklappt · eingeklappt | ausgeklappt |

Warum Cookie statt reinem Browserspeicher: Der Server kann die Seite gleich in der richtigen Farbe und mit der richtigen Leistenbreite ausliefern. Dadurch gibt es **kein Aufblitzen** der falschen Farbe. Ist der Speicher gesperrt (privates Fenster), gelten die Standards.

Für das Konto-Menü werden nur Daten genutzt, die das Layout schon lädt: Anzeigename, E-Mail, Rolle, Fachbereich.

### C) Technische Entscheidungen (und warum)

| Entscheidung | Begründung |
|---|---|
| **shadcn-`Sidebar` statt eigener Leiste** | Ist installiert und bringt alles mit, was die Spec verlangt: Einklappen auf Icon-Leiste, Namen per Tooltip, Merken per Cookie, Handy-Schublade, Tastaturkürzel. In PROJ-40 wurde sie wegen fehlender Farbvariablen noch zurückgestellt; die kommen jetzt ohnehin. |
| **Umschaltpunkt Handy/Desktop auf 1024 px** | Die Spec zählt Tablet hochkant als Handy. Der Umschaltpunkt der Sidebar liegt heute bei 768 px und wird angehoben. Dieser Wert wird nur von der Sidebar genutzt, die Schülerseite ist nicht betroffen. |
| **Farb-Schicht aus Design-Tokens** | Statt fester Werte wie `#111827` gibt es benannte Rollen wie „Hintergrund“, „Fläche“, „Rand“, „Text“, „Text gedämpft“, „Marke Grün“ usw., jeweils mit hellem und dunklem Wert. Eine Seite sagt nur noch „Fläche“, und der Modus entscheidet die Farbe. |
| **Farben gelten nur im Lehrkräfte-Bereich** | Die Schülerseite bleibt fest dunkel. Die Farb-Schicht hängt am Lehrkräfte-Rahmen. Wichtig: Dialoge, Menüs und Toasts werden technisch außerhalb des Rahmens gezeichnet. Die Farben werden deshalb so an der Seite verankert, dass auch diese Fenster sie übernehmen. Verlässt man den Bereich, fällt alles automatisch auf die Schülerfarben zurück. |
| **„Wie System“ rein über das Stylesheet** | Der Browser kennt das Systemschema selbst. Wechselt der Mac abends auf dunkel, folgt der Bereich sofort, ohne Neuladen und ohne Skript. |
| **Kein `next-themes` für den Lehrkräfte-Bereich** | Das Paket schaltet die ganze Seite um und würde auch die Schülerseite erfassen. Eine kleine eigene Lösung mit Cookie ist hier einfacher und vermeidet das Aufblitzen. `next-themes` bleibt nur dort, wo es heute schon steckt (Toast-Baustein). |
| **Umstellung der Farben per Skript** | Die rund 20 Farbwerte werden einmalig den Tokens zugeordnet (z. B. `#111827` → Hintergrund, `#4B5563` → Rand). Ein Skript ersetzt alle 1.691 Stellen, danach wird jede Datei kurz gegengelesen. Seltene Sonderfarben (Hover-Töne wie `#4CAD02`) bekommen eigene Hover-Tokens. Das ist deutlich sicherer als Handarbeit. |
| **Markenfarben im hellen Modus abgedunkelt** | Grün, Blau, Orange, Rot und Gold erfüllen auf Weiß die Kontrastwerte nicht. Für den hellen Modus gibt es dunklere Varianten derselben Farbtöne. Die Marke bleibt erkennbar. |
| **Kontraste werden automatisch geprüft** | Ein Test berechnet für jedes Text/Hintergrund-Paar beider Modi das Kontrastverhältnis (mindestens 4,5 : 1 bzw. 3 : 1). Fällt eine Farbe später durch, schlägt der Test fehl. |
| **Druck immer hell** | Im Druck werden die hellen Werte erzwungen und Navigation, Kopfzeile und Seitenkopf-Aktionen ausgeblendet. Die Druckseiten aus PROJ-28 bleiben inhaltlich unverändert. |
| **Schnellsuche mit `Command`** | Installierter shadcn-Baustein mit Pfeiltasten, Enter, Esc und Filtern eingebaut. Er wird erst beim ersten Öffnen nachgeladen, damit die Startseite schnell bleibt. |
| **Brotkrumen aus der Navigations-Liste** | Der erste Teil („Leistungsnachweise“) kommt aus der Liste. Nur auf Detailseiten liefert die Seite den letzten Teil selbst (z. B. den Titel des Nachweises). |
| **Konto-Menü mit `DropdownMenu`** | Installiert und tastaturbedienbar. „Profil“ führt auf die vorhandene Profilseite der Lern-App, weil es keine eigene Lehrkräfte-Profilseite gibt (neue Seiten sind laut Abgrenzung nicht Teil dieses Features). Der Bereichs-Umschalter für den Super-Admin bleibt in der Kopfzeile. |
| **Startseite ohne Datenabfrage** | Bleibt wie in PROJ-40. Zusammen mit dem Nachladen der Schnellsuche ist das die Grundlage für das Ziel „unter 2,5 s“. |
| **Animationen entfallen bei „Bewegung reduzieren“** | Gilt für Schublade, Einklappen, Schnellsuche und Toasts. Alle anderen Übergänge bleiben bei höchstens 200 ms. |
| **Alle URLs bleiben** | Keine Weiterleitungen, Lesezeichen bleiben gültig. |

### D) Betroffene Dateien

**Neu:**
- Farb-Schicht (Tokens hell und dunkel, Druckregeln) im globalen Stylesheet und in der Tailwind-Konfiguration
- Darstellungs-Baustein (Wahl lesen und speichern, Umschalten ohne Neuladen)
- Rahmen-Bausteine: Seitenkopf, Brotkrumen, Konto-Menü, Schnellsuche
- Zustands-Bausteine: Lade-Platzhalter, Leerzustand, Fehlerzustand, responsive Tabelle
- Einmal-Skript zur Farbumstellung (wird nach dem Lauf nicht mehr gebraucht)
- Tests: Rollenfilter der Schnellsuche, Darstellungswahl, Brotkrumen, Kontrastprüfung

**Geändert:**
- Lehrkräfte-Rahmen (Layout + Shell): auf `Sidebar` umgebaut, Cookies werden beim Ausliefern gelesen
- Navigations-Liste: zusätzlich Aktionsliste für die Schnellsuche
- Alle 12 Lehrkräfte-Seiten und ihre Bausteine: Farben auf Tokens, eigener Seitenkopf statt eigener Überschriften, Lade-, Leer- und Fehlerzustände vereinheitlicht, breite Tabellen auf dem Handy umgestellt
- `docs/DESIGN.md`: neuer Abschnitt „Lehrkräfte-Bereich“

**Nicht betroffen:** Datenbank, API-Routen, Rechteprüfung (Middleware), Schülerseite, Inhalt der Druckseiten.

### E) Reihenfolge der Umsetzung
Das Feature ist groß. Damit es jederzeit lauffähig bleibt, wird in drei Schritten gebaut, jeweils mit Build und Tests:
1. **Fundament:** Farb-Schicht, Darstellungswahl, neuer Rahmen mit Sidebar, Konto-Menü, Schnellsuche, Seitenkopf und Brotkrumen. Die Seiten sehen danach im dunklen Modus aus wie vorher.
2. **Seiten umstellen:** Farbskript über alle Dateien, Seitenköpfe einsetzen, Tabellen fürs Handy. Erst danach wird der helle Modus im Konto-Menü freigeschaltet, damit nie halb helle Seiten zu sehen sind.
3. **Feinschliff:** Lade-, Leer- und Fehlerzustände, Toasts und Lösch-Bestätigungen überall, Barrierefreiheit, Abschnitt in `docs/DESIGN.md`.

### F) Zu beachten
- **Größtes Risiko ist Schritt 2:** Ein falsch zugeordneter Farbwert fällt nur im hellen Modus auf. Deshalb Kontrasttest plus statische Vorschaubilder in `docs/vorschau/` für die drei meistgenutzten Seiten (Leistungsnachweise, Nachweis-Detail, Fragen) in beiden Modi.
- **Kein Dev-Server, kein Playwright** (Projekt-Memory). Optik und Responsive werden über Komponententests, Build und Vorschaubilder geprüft. Die endgültige Sichtprüfung im Browser macht der Nutzer nach dem Deploy.
- **Rollenfilter bleibt nur Anzeige.** Die echte Rechteprüfung bleibt serverseitig, wie in PROJ-40/44.
- **Schülerseite:** Nach der Umstellung wird geprüft, dass keine Lern-App-Seite die neuen Tokens verwendet und sie fest dunkel bleibt.

### G) Pakete
**Keine neuen.** `Sidebar`, `Command` (cmdk), `Breadcrumb`, `Skeleton`, `DropdownMenu`, `Tooltip`, `Sheet`, `AlertDialog`, `Sonner` und Lucide-Icons sind bereits installiert.

### H) Aufteilung der Arbeit
Nur `/frontend`. `/backend` entfällt, weil nichts auf dem Server oder in der Datenbank geändert wird.

## Implementation Notes (Frontend, 2026-10-26)

**Entscheidung während der Umsetzung (Nutzer, 2026-10-26):** Weiße Schrift auf den leuchtenden Markenfarben erreicht nur ca. 2 : 1. Gefüllte Buttons bekommen deshalb im dunklen Modus fast schwarze Schrift (#111827 auf #58CC02 = 8,5 : 1), im hellen Modus dunkleres Grün mit weißer Schrift. Token `ws-on-accent`.

**Gebaut (Schritt 1 – Fundament):**
- Farb-Schicht `--ws-*` in `src/app/globals.css` (dunkel als Standard, hell, „Wie System“ per `prefers-color-scheme`, Druck immer hell) und `ws-*`-Farben in `tailwind.config.ts`. Über `html:has(.ws-root…)` erreichen die Werte auch Portale (Dialoge, Menüs, Toasts). Die shadcn-Variablen (`--background`, `--popover` …) werden im Lehrkräfte-Bereich auf die Palette abgebildet, die `sidebar`-Farben zeigen auf die ws-Tokens.
- Gegenüber `docs/DESIGN.md` leicht angepasst, damit die Kontraste reichen: dunkles Rot #FF5C5C (statt #FF4B4B für Text), Hinweistext #8B93A1 (statt #6B7280).
- `src/lib/workspace-theme.ts`: Cookie `ws_theme` (1 Jahr), Standards, Parser. Das Layout liest `ws_theme` und `sidebar_state` auf dem Server, deshalb gibt es kein Aufblitzen.
- Neuer Rahmen `admin-shell.tsx` auf Basis der shadcn-`Sidebar` (`collapsible="icon"`, Tooltips im eingeklappten Zustand, ⌘B, Rail). Umschaltpunkt in `use-mobile.tsx` auf 1024 px angehoben (wird nur von der Sidebar genutzt), `md:` → `lg:` in `ui/sidebar.tsx`. Dort zusätzlich: Wischgeste schließt die Handy-Schublade, deutsche Beschriftungen, `print:hidden`, Cookie 1 Jahr.
- `admin-topbar.tsx`: Handy mit Menü, Seitentitel, Suche und Konto; Desktop mit Einklappen, Brotkrumen (`adminCrumbs`), Suchfeld ⌘K und Bereichs-Umschalter (Super-Admin; auf dem Handy in der Schublade).
- `admin-account-menu.tsx`: Name, E-Mail, Rolle in Klartext (`teacherRoleLabel`), Profil (→ `/profile` der Lern-App), Darstellung (3 Optionen), Zur Lern-App, Abmelden.
- `admin-command-palette.tsx` (wird erst beim ersten Öffnen per `next/dynamic` geladen): Seiten und Aktionen mit demselben Rollenfilter wie die Navigation (`adminNavItemsFor`, `adminCommandActionsFor`). „Neuer Leistungsnachweis“ öffnet `/admin/leistungsnachweise?neu=1`; die Liste öffnet dann den Anlage-Dialog und entfernt den Parameter.
- `workspace-provider.tsx`: Darstellung, Brotkrumen-Zusatz der Detailseiten, Schnellsuche.
- Link „Zum Inhalt springen“, `prefers-reduced-motion` schaltet im ganzen Bereich Übergänge ab. Toaster liegt jetzt im Rahmen und folgt der Darstellung.

**Gebaut (Schritt 2 – Seiten umstellen):**
- Einmal-Skript: 1.663 feste Farbwerte in 40 Dateien → ws-Tokens, 50× `text-white` auf gefüllten Flächen → `text-ws-on-accent`. Danach keine `#xxxxxx`-Werte mehr unter `src/app/admin` und `src/components/admin`. Bewusst unverändert: Papier-Bögen (`assessment-print`) und der weiße QR-Code-Hintergrund.
- `DifficultyBadge` (nur im Lehrkräfte-Bereich genutzt) auf Tokens; das Seltenheits-Label der Shop-Items bekommt im Lehrkräfte-Bereich Token-Farben (in der Lern-App unverändert).
- `AdminPageHeader` auf allen Seiten (Übersicht, Leistungsnachweise + Detail, Fragen, Nutzer, Fächer, Themen, Prüfungssimulation, Fragen aus Material, Fachbereich, Items, Änderungsprotokoll, Fachbereiche). Themen hatte bisher keine Überschrift. Die Nachweis-Detailseite liefert ihren Titel für die Brotkrumen und zeigt auf dem Handy zusätzlich „‹ Leistungsnachweise“.
- Tabellen-Container mit `ws-table-scroll`: scrollen in ihrem Rahmen (min. 40rem), die erste Spalte bleibt stehen. Der Inhaltsbereich hat `overflow-x-clip`.

**Gebaut (Schritt 3 – Feinschliff):**
- `admin-states.tsx`: `AdminLoadingState` (table/list/cards/form), `AdminEmptyState`, `AdminErrorState`.
- Fehlerzustand mit „Erneut versuchen“ statt Toast + irreführend leerer Liste: Fächer, Fachbereiche, Items, Nutzer, Änderungsprotokoll, Fragen, Themen, Fachbereich-Einstellungen (vorher endloser Skeleton bei Fehler), Leistungsnachweise + Detail + beide Druckseiten.
- Leerzustände mit Hauptaktion: Fächer, Fachbereiche, Items, Leistungsnachweise („Noch keine Leistungsnachweise“ + „Neu erstellen“), Prüfungssimulation, Themen.
- Prüfungssimulation bestätigt Anlegen, Speichern, Importieren, (De-)Aktivieren und Löschen jetzt per Toast. Alle Löschaktionen hatten schon einen Bestätigungsdialog.
- `docs/DESIGN.md`: neuer Abschnitt „Lehrkräfte-Bereich“ (Tokens hell/dunkel, Layout-, Komponenten- und Zustandsregeln).

**Tests:** `workspace-theme.test.ts` (Kontraste beider Modi aus der echten CSS-Datei, Parser), `admin-shell.test.tsx` (16: Cookies, Einklappen, Schublade inkl. Wischen, Konto-Menü, Darstellungswechsel, Schnellsuche per ⌘K/Strg+K/Symbol, Rollenfilter, Enter-Navigation), `admin-topbar.test.tsx` (Brotkrumen, Kürzen, Seitenkopf, Zustände), `admin-nav.test.ts` (+4). Gemeinsamer Helfer `workspace-test-utils.tsx`.

**Geprüft:** Vitest komplett grün (110 Dateien, 1.267 Tests). `npm run build` erfolgreich. ESLint: keine Fehler, keine neuen Warnungen. Im gebauten CSS sind die Token-Blöcke und `html:has(...)` vorhanden.
**Sichtprüfung:** Skizzen mit den echten Token-Werten in `docs/vorschau/lehrkraefte-desktop.png` und `docs/vorschau/lehrkraefte-handy.png`. Echte Seiten konnten ohne Browser nicht gerendert werden (kein Dev-Server). Die Abnahme im Browser (beide Modi, Handy, Beamer, Druck) steht aus.

**Offen / bewusst nicht gemacht:**
- „Profil“ führt auf die Profilseite der Lern-App (immer dunkel), weil eine eigene Lehrkräfte-Profilseite eine neue Seite wäre.
- Brotkrumen-Link „Leistungsnachweise“ verwirft gesetzte Filter. Der „‹“-Link auf dem Handy behält sie.
- Ladezeit (LCP < 2,5 s) nicht messbar ohne Browser. Die Startseite lädt weiterhin keine Daten, und die Schnellsuche wird nachgeladen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
