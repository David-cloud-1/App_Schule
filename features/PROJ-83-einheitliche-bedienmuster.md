# PROJ-83: Einheitliche Bedienmuster im Lehrkräfte-Bereich

## Status: Approved
**Created:** 2026-11-10
**Last Updated:** 2026-11-10

## Hintergrund
Ein Durchgang durch die Live-App (2026-11-10, Laptop und Handy, als Super-Admin) und der Vergleich mit LimeSurvey haben gezeigt: Der Lehrkräfte-Bereich sieht ruhig und professionell aus, aber dieselbe Aufgabe wird je nach Seite anders bedient.

- **„Wenige Optionen wählen“** gibt es in vier Optiken (blasse Pillen, Kasten-Tabs, Unterstrich-Tabs, Schalter) und zusätzlich als Dropdown, auch für 2 bis 4 Werte. Ein Dropdown in der Fragenliste zeigt nur „Alle…“ und ist abgeschnitten.
- **Zeilenaktionen:** Die Nachweis-Liste hat ein `⋯`-Menü. Fragen, Themen, Fächer und Prüfungssets zeigen 3 bis 4 Icons je Zeile, darunter in jeder Zeile ein rotes Löschen.
- **Kleinigkeiten:** Die Fragenliste zeigt beim Laden „0 Fragen insgesamt“. In jeder Zeile steht „Zuletzt geändert von Stand bei Einführung am …“. Die Hilfe-Karte in der Seitenleiste verdeckt unten Einträge. Auf dem Handy ist die Aktionsspalte der Fragenliste abgeschnitten.

Dieses Feature vereinheitlicht die Bedienmuster. Es ist die Grundlage für den späteren Inhalts-Baum.

**Bewusst nicht Teil von PROJ-83:**
- die doppelte Bereichsanzeige (Umschalter links oben und „Du siehst: …“ unter dem Titel); das wird zusammen mit dem Inhalts-Baum entschieden
- das Aufräumen der Nachweis-Detailseite (Karte „Ablage“, Kennzahlen)
- der Inhalts-Baum (Fach → Thema, Fragen rechts)
- Änderungen an der Schülerseite

## Dependencies
- Requires: PROJ-45 (Lehrkräfte-Arbeitsbereich: Design-Tokens, Regeln für Bedienflächen und Kontraste)
- Requires: PROJ-47 (Änderungsverlauf: Quelle der Zeile „Zuletzt geändert von …“)
- Betrifft: PROJ-9, PROJ-11, PROJ-21, PROJ-39 (die Seiten, die umgestellt werden)
- Rechte aus PROJ-24, PROJ-44, PROJ-48 und PROJ-70 bleiben unverändert

## User Stories
- Als Lehrkraft möchte ich bei jeder Auswahl mit wenigen Optionen (z. B. Status, Schwierigkeit) alle Optionen sofort sehen und mit einem Klick wählen, damit ich nicht erst ein Dropdown öffnen muss.
- Als Lehrkraft möchte ich dieselbe Aufgabe auf jeder Seite gleich bedienen, damit ich nicht neu lernen muss, wo „Bearbeiten“, „Verlauf“ und „Löschen“ stehen.
- Als Lehrkraft möchte ich, dass ich beim Scrollen in einer langen Liste nicht aus Versehen auf ein rotes „Löschen“ tippe.
- Als Lehrkraft möchte ich beim Laden einer Liste keine falschen Zahlen („0 Fragen“) sehen, damit ich nicht denke, die Fragen seien weg.
- Als Lehrkraft am Handy möchte ich alle Aktionen einer Zeile erreichen, ohne dass etwas abgeschnitten ist.
- Als Super-Admin möchte ich in der Seitenleiste jeden Eintrag erreichen, auch auf einem kleinen Laptop-Bildschirm.

## Acceptance Criteria

### A) Einheitliches Segment-Muster für Auswahlen mit wenigen Optionen
- [ ] Es gibt **ein** Bedienmuster für „aus 2 bis 4 Werten genau einen wählen“ (Segment-Schalter), das alle Werte gleichzeitig zeigt. Es gilt die Regel: bis 4 Werte = Segment, mehr = Dropdown.
- [ ] Der gewählte Wert ist deutlich erkennbar (nicht nur über die Farbe) und hat den Kontrast von mindestens 4,5 : 1 in hellem und dunklem Modus.
- [ ] Jeder Teil des Segments ist mindestens 44 px hoch und per Tastatur (Pfeiltasten, Tab) bedienbar. Der Fokus ist sichtbar.
- [ ] Auf dem Handy (430 px Breite) passt das Segment entweder in eine Zeile oder bricht sauber in die nächste. Die Seite scrollt nie seitlich.
- [ ] **Fragenliste:** Status (Alle / Aktiv / Inaktiv) und Schwierigkeit (Alle / Leicht / Mittel / Schwer) sind Segmente. Das abgeschnittene Dropdown „Alle…“ entfällt. Fach, Klasse und Thema bleiben Dropdowns.
- [ ] **Leistungsnachweise (Liste):** Die Statusfilter (Alle / Entwurf / Offen / Geschlossen) sind ein Segment im selben Muster. Schuljahr, Klasse, Fach und Ersteller bleiben Dropdowns.
- [ ] Bestehende Filterlogik bleibt gleich: gleiche Ergebnisse, gleiche Voreinstellungen, Filter wirken wie vorher auf die Adresse oder den Zustand der Seite.

### B) Einheitliche Tab-Optik
- [ ] Alle Tab-Leisten im Lehrkräfte-Bereich haben dieselbe Optik: Nachweis-Detail (Teilnehmer / Notenspiegel / Fragenanalyse), Gemeldete Fragen (Offen / Korrigiert / Nicht übernommen / Frage entfällt), Papierkorb, Änderungsprotokoll, Lehrerzimmer (Alle Beiträge / Gemeldet) und Werkzeugkiste (Werkzeuge / Meine Materialien / Regal des Kollegiums).
- [ ] Tabs wechseln Ansichten, Segmente wählen Werte. Beides ist an der Optik unterscheidbar.
- [ ] Aktiver Tab ist deutlich erkennbar, mindestens 44 px hoch, Kontrast ≥ 4,5 : 1.
- [ ] Auf dem Handy scrollt eine zu lange Tab-Leiste in sich waagerecht, die Seite nie.

### C) Einheitliche Zeilenaktionen
- [ ] In den Listen **Fragen, Themen, Fächer und Prüfungssets** zeigt jede Zeile höchstens eine sichtbare Symbol-Aktion („Bearbeiten“) plus ein `⋯`-Menü, wie in der Nachweis-Liste. Verlauf und Löschen stehen im Menü.
- [ ] Prüfungssets behalten ihre beschrifteten Hauptaktionen („Leistungsnachweis“, „Aktivieren“) in der Zeile. Die Symbole für Verlauf und Löschen wandern ins Menü.
- [ ] „Löschen“ steht im Menü als letzter Eintrag, getrennt und rot. Löschen geschieht weiterhin erst nach einem Bestätigungsdialog (kein Löschen direkt aus dem Menü).
- [ ] Die Einträge im Menü hängen von denselben Rechten ab wie heute. Wer eine Aktion heute nicht sieht, sieht sie auch im Menü nicht. Leere Menüs gibt es nicht (ohne Aktionen entfällt das `⋯`).
- [ ] Alle Symbol-Buttons haben eine Bedienfläche von mindestens 44 × 44 px und einen `aria-label`. Das Menü ist per Tastatur erreichbar und schließt mit Escape.
- [ ] **Status-Schalter der Fragenliste** bleibt in der Zeile. Er trägt eine sichtbare Beschriftung („Aktiv“ / „Inaktiv“), nicht nur die Farbe. Nach dem Umschalten erscheint eine kurze Bestätigung (Toast). Bei einem Fehler springt der Schalter zurück und es erscheint eine verständliche Meldung.

### D) Kleinkram aus dem Durchgang
- [ ] **Ladezustand:** Die Fragenliste zeigt, solange die Daten laden, keine Zahl („0 Fragen insgesamt“). Die Anzahl erscheint erst nach dem Laden. Der Leerzustand („Keine Fragen“) erscheint nur, wenn wirklich nichts gefunden wurde. Dasselbe gilt für jede andere Liste mit „… insgesamt“.
- [ ] **„Stand bei Einführung“:** Einträge, die seit der Einführung des Verlaufs nicht geändert wurden, zeigen keinen Text „Zuletzt geändert von Stand bei Einführung am …“. Bei echten Änderungen steht weiter „Zuletzt geändert von Name am Datum“.
- [ ] **Hauptaktion:** Auf jeder Seite ist die gefüllte Hauptaktion grün, auch „Ergebnisse freigeben“ im Nachweis-Detail (heute blau). Auf jeder Seite gibt es höchstens eine gefüllte Hauptaktion.
- [ ] **Seitenleiste:** Bei einer Fensterhöhe von 700 px sind alle Einträge erreichbar und keiner liegt verdeckt hinter der Hilfe-Karte („Du brauchst Hilfe?“). Bei zu wenig Höhe darf die Hilfe-Karte kleiner werden oder sich einklappen.
- [ ] **Handy-Tabelle der Fragenliste:** Auf 430 px Breite ist die Aktionsspalte vollständig sichtbar oder per Tabelle-Scroll erreichbar, und die Überschrift ist nicht abgeschnitten.

### E) Qualität
- [ ] Alle neuen Bausteine erscheinen in hellem und dunklem Modus korrekt, nur mit den `ws-*`-Tokens (keine festen Farbwerte). Der Kontrast-Test (`workspace-theme.test.ts`) deckt sie ab und besteht.
- [ ] Bewegungen sind höchstens 200 ms und entfallen bei „Bewegung reduzieren“.
- [ ] Jede umgestellte Seite hat Tests für die Kernfunktion: Filter liefert dasselbe Ergebnis, Menü zeigt nur erlaubte Einträge, Löschen verlangt Bestätigung.
- [ ] Die Schülerseite ändert sich nicht.

## Edge Cases
- Ein Segment hat einen Wert, der gerade keine Treffer liefert → die Auswahl bleibt möglich, die Liste zeigt den Leerzustand mit Hinweis auf den Filter.
- Ein Segment hat unerwartet mehr als 4 Werte (z. B. spätere Erweiterung) → die Regel „mehr als 4 = Dropdown“ gilt, der Baustein bricht nicht.
- Sehr schmale Handys (360 px) mit 4 Segment-Werten → Umbruch oder eigenes Scrollen, kein Überlauf der Seite.
- Eine Lehrkraft hat nur Leserechte oder keine Löschrechte → das Menü zeigt weder „Löschen“ noch ein leeres `⋯`.
- Ein Eintrag im Papierkorb oder mit fremdem Bereich → die Zeilenaktionen folgen den Rechten des jeweiligen Bereichs.
- Zwei Aktionen fast gleichzeitig (Schalter umlegen, während die Liste neu lädt) → der Schalter zeigt den echten Zustand, nie einen Zwischenzustand dauerhaft.
- Der Status-Schalter schlägt fehl (Netz weg) → Schalter springt zurück, Fehlermeldung statt stiller Änderung.
- Seite wird während des Ladens verlassen → keine Fehlermeldung, kein „0“ in späteren Anzeigen.
- Sehr langer Fragetext oder Themenname → wird mit „…“ gekürzt, voller Text im `title`, Zeilenaktionen bleiben sichtbar.
- Tastaturnutzer: Tab-Reihenfolge in der Zeile ist Bearbeiten → Menü, Pfeiltasten im Segment und in den Tabs.
- Hoher Kontrast und dunkler Modus: Aktiver Zustand von Segment und Tab bleibt erkennbar.

## Technical Requirements
- Performance: Der Umbau darf die Ladezeit der Listen nicht verschlechtern; Filtern bleibt sofort.
- Sicherheit: Keine neuen Schnittstellen, keine Änderung an Rechten. Löschen bleibt serverseitig geprüft.
- Barrierefreiheit: WCAG AA, 44 px Bedienfläche, sichtbarer Fokus, Beschriftungen für Icons.
- Browser: aktuelle Versionen von Chrome, Safari, Firefox; Laptop, Tablet und Handy.
- Server/Client-Grenze: Bausteine bekommen nur Namen oder Texte als Parameter, keine Icon-Funktionen (bekannter Produktionsfehler, den die Tests nicht finden).

## Offene Fragen für die Architektur
- Welche Optik bekommen Tabs, Segmente und das `⋯`-Menü, damit sie zu den bestehenden Karten und Tabellen passen?
- Wie werden die vorhandenen Bausteine (`ToggleGroup`, `Tabs`, `DropdownMenu`) erweitert, ohne die Schüler-Seite zu berühren?
- Wo steht die Regel „bis 4 Werte = Segment“ so, dass sie bei neuen Seiten automatisch gilt (Design-Regel in `docs/DESIGN.md`)?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Grundsatz:** Keine neuen Abhängigkeiten, keine Datenbank, keine neuen Schnittstellen. Die Bausteine setzen auf den vorhandenen shadcn-Primitiven auf (`ToggleGroup`, `Tabs`, `DropdownMenu`) und nutzen nur `ws-*`-Tokens. Die Schülerseite (`ui/tabs.tsx` wird dort weiter benutzt) bleibt unberührt.

**Drei neue Bausteine in `src/components/admin/`:**
| Baustein | Aufgabe | Aufbau |
|---|---|---|
| `admin-segmented.tsx` | „aus 2 bis 4 Werten einen wählen“ | `ToggleGroup type="single"`, Rolle `radiogroup`, gewählter Wert mit Tönung, Rahmen und fetter Schrift, 44 px, scrollt in sich. Erneuter Klick auf den gewählten Wert lässt die Auswahl bestehen. |
| `admin-tabs.tsx` | Ansichten wechseln | `Tabs`-Primitive, aber grün unterstrichen (Optik der Werkzeugkiste, die schon so aussah), 44 px, scrollt in sich. |
| `admin-row-actions.tsx` | Zeilenaktionen | Stift-Button plus `DropdownMenu` mit `⋯`. Einträge mit `hidden` (Rechte) erscheinen nicht, leeres Menü entfällt, Löschen steht rot hinter einem Trennstrich. |

**Entscheidungen:**
- Optik für Tabs = Unterstrich (die Werkzeugkiste hatte sie schon, LimeSurvey auch), für Segmente = gerahmter Schalter. So sind „Ansicht wechseln“ und „Wert wählen“ unterscheidbar.
- Regel „bis 4 Werte = Segment“ steht in `docs/DESIGN.md` (Abschnitt „Bedienmuster“) und als Konstante `SEGMENTED_MAX_OPTIONS`.
- Löschen bleibt immer hinter dem bestehenden Bestätigungsdialog; die Rechtelogik der Seiten wird nicht angefasst.

**Umgestellt:**
- Segmente: Fragenliste (Status, Schwierigkeit), Nachweis-Liste (Status).
- Tabs: Nachweis-Detail, Gemeldete Fragen, Papierkorb, Änderungsprotokoll, Lehrerzimmer, Werkzeugkiste, Schwierigste Fragen, Fach-Zuständigkeiten.
- Zeilenmenü: Fragen, Themen, Fächer, Prüfungssets.
- Kleinkram: Zahlen beim Laden, „Stand bei Einführung“ (`LastChangedLine`), Hauptaktion „Ergebnisse freigeben“ grün, Hilfe-Karte entfällt unter 760 px Fensterhöhe, Aktionsspalte der Fragenliste klebt am rechten Rand.

## QA Test Results

**Stand 2026-11-10, Code-Ebene (vor dem Deploy):**
- `tsc` ohne Fehler, `eslint` 0 Fehler, `npm run build` erfolgreich, `vitest` 238 Dateien / 2772 Tests grün (inkl. Kontrast-Test der Tokens).
- Neue Tests: `admin-segmented` (Rollen, Wechsel, erneuter Klick, 44 px), `admin-tabs` (aktiver Tab, 44 px, scrollt in sich), `admin-row-actions` (Stift sichtbar, Menü-Reihenfolge, Löschen zuletzt, Einträge ohne Rechte, leeres Menü entfällt), `content-meta` („Stand bei Einführung“ blendet sich aus), Nachweis-Filter (Segment statt Pillen).
- Keine neuen Schnittstellen, keine Datenbankänderung, keine Rechteänderung; Löschen läuft weiter über die bestehenden Bestätigungsdialoge.
- Server/Client-Grenze: Alle neuen Bausteine sind `'use client'` und bekommen nur Texte und fertige Elemente, keine Funktions-Icons.

**Prüfung im Browser (Live):** siehe Abschnitt „Deployment“.

**Bekannte Einschränkungen:** Die Optik des dunklen Modus und die Rollen Lehrkraft und Bereichs-Admin wurden nur über Tokens und Tests, nicht per Klick-Durchgang geprüft.

**Ergebnis:** Keine kritischen oder hohen Fehler. Freigegeben für den Deploy.

## Deployment
_To be added by /deploy_
