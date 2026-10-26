# PROJ-45: Lehrkräfte-Arbeitsbereich – modernes Layout für Desktop & Handy

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
