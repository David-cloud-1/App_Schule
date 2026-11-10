# PROJ-85: Inhalts-Baum – Fach → Thema mit Fragenliste

## Status: Approved
**Created:** 2026-11-10
**Last Updated:** 2026-11-10

## Kontext
Fächer, Themen und Fragen liegen heute auf drei getrennten Seiten (`/admin/subjects`, `/admin/topics`, `/admin/questions`). Wer eine Frage in einem bestimmten Thema sucht, wechselt die Seite und stellt Filter neu ein. Ob ein Thema leer oder dünn besetzt ist, sieht man nirgends auf einen Blick.

Vorbild ist LimeSurvey: links die Struktur als Baum, rechts der Inhalt des gewählten Knotens. Das Feature gehört zur Reihe PROJ-83 bis PROJ-85 (siehe PROJ-83 „Einheitliche Bedienmuster“) und nutzt deren Bausteine (`AdminSegmented`, `AdminRowActions`, Zustände aus `admin-states`).

### Entscheidungen (Nutzer, 2026-11-10)
- **E1 – Übergang:** Der Baum kommt als **neue Seite „Inhalte“** dazu. Die Seiten „Fächer“, „Themen“ und „Fragen“ bleiben unverändert erreichbar. Ob und wann sie entfallen, klärt ein späteres Feature.
- **E2 – Im Baum:** Fach/Thema anklicken (rechts erscheinen die Fragen), Zähler pro Fach und Thema, über das `⋯`-Menü Thema anlegen und umbenennen, Fach bearbeiten und aktivieren/deaktivieren, Thema löschen (mit Rückfrage), Änderungsverlauf öffnen.
- **E3 – Fragenliste rechts:** Bearbeiten, Verlauf, Löschen (`AdminRowActions`), Aktiv/inaktiv-Schalter, grüne Hauptaktion „Neue Frage“ mit vorbelegtem Fach und Thema, Suche und Statusfilter innerhalb der Auswahl.
- **E4 – Handy:** Erst nur der Baum. Tippen auf einen Knoten öffnet die Fragenliste als eigene Ansicht mit „Zurück“.
- **E5 – Klassenstufen:** Filter über dem Baum („Alle / 10 / 11 / 12“ als `AdminSegmented`). Baum und Zähler zeigen nur passende Themen. Der Baum bleibt zweistufig.
- **E7 – Thema löschen (2026-11-10, bei /architecture):** Ein Thema mit Fragen lässt sich **nirgends** löschen, weder im Baum noch auf der Seite „Themen“. Der Server prüft das. Bisher verschob „Themen“ das Thema trotz Fragen in den Papierkorb, und die Fragen verloren ihre Zuordnung.
- **E6 – Bereichsanzeige:** Auf der neuen Seite gibt es **keine** Zeile „Du siehst: …“. Der gewählte Bereich ist der oberste Knoten des Baums. Die alten Seiten bleiben, wie sie sind.

## Dependencies
- Requires: PROJ-2 / PROJ-12 (Fächer, Themen, Klassenstufen)
- Requires: PROJ-29 (Bereichs-Umschalter): bestimmt, welcher Bereich im Baum steht
- Requires: PROJ-45 (Layout, Tokens), PROJ-83 (Bedienmuster)
- Requires: PROJ-47 / PROJ-70 (Verlauf, Papierkorb, offene Rechte für alle Lehrkräfte)
- Nutzt wieder: Fach-Dialog, Fragen-Dialoge (Anlegen/Bearbeiten), Verlauf-Seitenleiste der bestehenden Seiten

## User Stories
- Als Lehrkraft möchte ich alle Fächer und Themen als Baum sehen, damit ich die Struktur des Fragenbestands auf einen Blick erfasse.
- Als Lehrkraft möchte ich neben jedem Fach und Thema die Zahl der Fragen sehen, damit ich leere oder dünne Themen sofort erkenne.
- Als Lehrkraft möchte ich ein Thema anklicken und rechts direkt seine Fragen sehen, bearbeiten und schalten, ohne die Seite zu wechseln.
- Als Lehrkraft möchte ich in einem gewählten Thema eine neue Frage anlegen, bei der Fach und Thema schon ausgefüllt sind.
- Als Lehrkraft möchte ich Themen direkt im Baum anlegen, umbenennen und löschen, damit ich die Struktur dort pflege, wo ich sie sehe.
- Als Lehrkraft möchte ich den Baum auf eine Klassenstufe einschränken, damit ich nur die Themen meiner Klasse sehe.
- Als Lehrkraft am Handy möchte ich erst den Baum sehen und nach Antippen die Fragen, damit beides lesbar bleibt.

## Acceptance Criteria

### Seite und Navigation
- [ ] Neue Seite `/admin/inhalte` mit Titel „Inhalte“ im `AdminPageHeader`. Sie steht in der Seitenleiste in der Gruppe, in der heute „Fragen“ steht.
- [ ] Die Seiten „Fächer“, „Themen“ und „Fragen“ funktionieren unverändert weiter.
- [ ] Zugriff haben dieselben Rollen wie heute auf „Fragen“ (Lehrkraft, Bereichs-Admin, Super-Admin). Was jemand ändern darf, entspricht den heutigen Seiten (PROJ-70).
- [ ] Die Auswahl (Fach/Thema, Klassenfilter) steht in der Adresse. Neu laden oder Link teilen zeigt dieselbe Auswahl.

### Baum (links, ab 1024 px)
- [ ] Oberster Knoten ist der aktuell gewählte Bereich (z. B. „Spedition“). Beim Super-Admin mit „Alle Bereiche“ erscheint je Bereich ein oberster Knoten.
- [ ] Darunter die Fächer, darunter ihre Themen. Fächer lassen sich auf- und zuklappen. Ein Knoten „Ohne Thema“ je Fach erscheint nur, wenn es solche Fragen gibt.
- [ ] Jedes Fach und jedes Thema zeigt die Zahl seiner Fragen (aktive und inaktive zusammen). Ein Thema mit 0 Fragen ist als leer erkennbar (gedämpfter Zähler).
- [ ] Inaktive Fächer bleiben sichtbar, aber erkennbar gedämpft und mit Hinweis „inaktiv“.
- [ ] Der gewählte Knoten ist hervorgehoben (`ws-green`). Der Baum ist per Tastatur bedienbar (Pfeiltasten hoch/runter, rechts/links auf- und zuklappen, Enter wählt).
- [ ] Über dem Baum: Klassenfilter „Alle / 10 / 11 / 12“ (`AdminSegmented`). Er blendet Themen ohne passende Klassenstufe aus, und die Zähler zählen nur Fragen dieser Stufe.
- [ ] Lange Namen werden mit „…“ gekürzt, der volle Name steht im `title`.

### Aktionen im Baum (`⋯`-Menü)
- [ ] Am Fach: „Fach bearbeiten“ (bestehender Fach-Dialog), „Aktivieren/Deaktivieren“, „Thema anlegen“, „Verlauf“.
- [ ] Am Thema: „Umbenennen“, „Verlauf“, „Löschen“ (ganz unten, rot, mit `AlertDialog`).
- [ ] Ein Thema mit Fragen lässt sich nicht löschen, solange es Fragen hat. Die Rückfrage nennt die Zahl und verweist darauf, die Fragen erst zu verschieben (E7: gilt ab jetzt auch auf „Themen“, der Server lehnt ab).
- [ ] Nach jeder Aktion aktualisieren sich Baum und Zähler ohne Neuladen. Erfolg zeigt einen kurzen Toast.

### Fragenliste (rechts)
- [ ] Zeigt die Fragen des gewählten Knotens: Thema → seine Fragen, Fach → alle Fragen des Fachs, Bereich → Hinweis „Wähle links ein Fach oder Thema“.
- [ ] Kopf der Liste: Pfad (Fach › Thema), Zahl der Fragen, grüne Hauptaktion „Neue Frage“ (nur bei gewähltem Fach oder Thema, Fach und Thema vorbelegt).
- [ ] Suchfeld (Fragetext) und Statusfilter „Alle / Aktiv / Inaktiv“ (`AdminSegmented`), beide nur innerhalb der Auswahl.
- [ ] Pro Zeile: Fragetext (gekürzt), Klassenstufe, Schwierigkeit, Aktiv-Schalter und `AdminRowActions` (Bearbeiten, Verlauf, Löschen mit `AlertDialog`).
- [ ] Bearbeiten und Anlegen nutzen die bestehenden Fragen-Dialoge. Verschiebt eine Bearbeitung die Frage in ein anderes Thema, verschwindet sie aus der Liste, und beide Zähler stimmen danach.
- [ ] Bei vielen Fragen lädt die Liste seitenweise (wie heute auf „Fragen“), sie scrollt in ihrem Rahmen (`ws-table-scroll`).

### Handy und Tablet hochkant (< 1024 px)
- [ ] Zuerst ist nur der Baum sichtbar (volle Breite).
- [ ] Tippen auf Fach oder Thema öffnet die Fragenliste als eigene Ansicht mit „Zurück“-Knopf. „Zurück“ (auch die Browser-Zurück-Taste) führt zum Baum, Auf-/Zuklapp-Zustand bleibt erhalten.
- [ ] Alle Bedienelemente mindestens 44 × 44 px. Die Seite scrollt nie seitlich.

### Zustände
- [ ] Laden: Skeleton für Baum und Liste, Kopfzahlen erst nach dem Laden („Wird geladen …“, nie „0“).
- [ ] Leer: Bereich ohne Fächer → `AdminEmptyState` mit Verweis auf „Fächer“. Thema ohne Fragen → `AdminEmptyState` mit „Neue Frage“.
- [ ] Fehler: `AdminErrorState` mit „Erneut versuchen“, getrennt für Baum und Liste.

## Edge Cases
- **Gewähltes Thema wird gelöscht oder umbenannt** (auch von einer anderen Lehrkraft): Nach dem Neuladen springt die Auswahl auf das Fach. Ein kurzer Hinweis erklärt, dass das Thema nicht mehr existiert.
- **Adresse zeigt auf ein Thema, das es nicht (mehr) gibt oder das im aktuellen Bereich nicht liegt:** Auswahl fällt auf den Bereichsknoten zurück, kein Fehlerbildschirm.
- **Bereich wird oben links umgeschaltet:** Baum lädt neu, die Auswahl wird zurückgesetzt.
- **Klassenfilter blendet das gewählte Thema aus:** Auswahl fällt auf das Fach zurück.
- **Frage ohne Klassenstufe** bei aktivem Klassenfilter: zählt nicht mit und erscheint nicht (wie auf „Fragen“).
- **Gleichzeitige Bearbeitung** (Versionskonflikt): bestehende Meldung `showVersionConflict`, Liste und Zähler laden neu.
- **Doppelter Themenname im selben Fach** beim Anlegen/Umbenennen: verständliche Fehlermeldung im Dialog, nichts wird gespeichert.
- **Sehr viele Themen in einem Fach (> 50):** Baum bleibt bedienbar, scrollt in sich.
- **Fach deaktiviert:** Themen und Fragen bleiben im Baum sichtbar und bearbeitbar. Das Fach ist für Azubis ausgeblendet (wie heute).

## Nicht Teil dieses Features
- Entfernen oder Umleiten der alten Seiten „Fächer“, „Themen“, „Fragen“ (eigenes Feature, sobald der Baum sich bewährt hat).
- Mehrfachauswahl, Sammelaktionen, CSV-/Kopier-Prompt-Import und Export in der Fragenliste. Dafür bleibt die Seite „Fragen“.
- Fach anlegen oder löschen im Baum (bleibt auf „Fächer“).
- Drag-and-Drop zum Verschieben von Fragen oder Umsortieren von Themen.
- Entfernen der „Du siehst“-Zeile auf anderen Seiten.

## Technical Requirements
- Sicherheit: nur angemeldete Konten mit Zugriff auf den Lehrkräfte-Bereich. Rechte serverseitig wie bei den bestehenden Schnittstellen.
- Leistung: Baum mit Zählern für einen Bereich (ca. 30 Fächer, 300 Themen, 5.000 Fragen) in unter 1 s sichtbar.
- Barrierefreiheit: Baum mit Baum-Rolle und Tastaturbedienung, sichtbarer Fokus, Icons ohne Text mit `aria-label`.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Die neue Seite „Inhalte“ ist eine **Ansicht auf vorhandene Daten**. Fächer, Themen und Fragen bleiben, wie sie sind. Neu sind nur: eine Abfrage, die den Baum samt Zählern in einem Schritt liefert, ein paar kleine Erweiterungen bestehender Schnittstellen und die Lösch-Sperre für Themen (E7). Fast alle Dialoge werden wiederverwendet.

### A) Aufbau der Seite

```
/admin/inhalte
+-- AdminPageHeader „Inhalte“ (Beschreibung, keine Aktion im Kopf)
+-- Arbeitsfläche (ab 1024 px zwei Spalten, darunter eine)
    |
    +-- Linke Spalte: Baum-Panel (scrollt in sich)
    |   +-- Klassenfilter „Alle / 10 / 11 / 12“ (AdminSegmented)
    |   +-- Baum (Rolle „tree“, Tastatur)
    |   |   +-- Bereich „Spedition“            (oberster Knoten, je Bereich einer)
    |   |       +-- Fach „KSK“  [312]  ⋯        (auf-/zuklappbar, inaktiv = gedämpft)
    |   |       |   +-- Thema „Kostenrechnung“  [48]  ⋯
    |   |       |   +-- Thema „Controlling“     [0]   ⋯   (gedämpfter Zähler)
    |   |       |   +-- „Ohne Thema“  [5]                 (nur wenn > 0)
    |   |       +-- Fach „BGP“ …
    |   +-- Zustände: Skeleton / Leer (Verweis auf „Fächer“) / Fehler + Erneut versuchen
    |
    +-- Rechte Spalte: Fragen-Panel
        +-- Handy: „Zurück“-Knopf zum Baum
        +-- Kopf: Pfad (Fach › Thema), „N Fragen“, grüne Hauptaktion „Neue Frage“
        +-- Suchfeld + Statusfilter „Alle / Aktiv / Inaktiv“ (AdminSegmented)
        +-- Fragentabelle (ws-table-scroll, seitenweise)
        |   +-- Zeile: Fragetext (gekürzt), Klasse, Schwierigkeit, Aktiv-Schalter, AdminRowActions
        +-- Zustände: „Wähle links ein Fach oder Thema“ / Leer mit „Neue Frage“ / Skeleton / Fehler

Dialoge (alle schon vorhanden, nur eingebunden):
+-- Fach bearbeiten          → bestehender Fach-Dialog (subject-form-modal)
+-- Thema anlegen/umbenennen → kleiner Namens-Dialog (wie heute auf „Themen“)
+-- Thema löschen            → AlertDialog; bei Fragen nur Hinweis „erst verschieben“
+-- Frage anlegen/bearbeiten → bestehender Fragen-Dialog (question-form-modal)
+-- Verlauf                  → bestehende Verlauf-Seitenleiste (content-history-sheet)
+-- Versionskonflikt         → bestehende Meldung showVersionConflict
```

**Neue Bausteine** (alle unter `src/components/admin/`):
- `content-tree` – der Baum selbst mit Tastaturbedienung und `⋯`-Menüs
- `content-question-panel` – rechte Spalte mit Kopf, Suche, Filter, Tabelle
- `topic-name-dialog` – Anlegen/Umbenennen eines Themas (aus der Seite „Themen“ herausgelöst, damit beide Seiten ihn teilen)

### B) Woher die Daten kommen

**Baum mit Zählern (neu):** eine Schnittstelle „Inhalts-Baum“ liefert für den Bereich der Bereichsleiste auf einmal:
- Bereiche → Fächer (Name, Kürzel, aktiv?, Versionsnummer) → Themen (Name, Versionsnummer)
- je Fach und je Thema die Zahl der Fragen, **aufgeteilt nach Klassenstufe** (10, 11, 12, ohne Stufe), dazu je Fach die Zahl „Ohne Thema“

Weil die Zahlen schon nach Stufe aufgeteilt ankommen, rechnet die Seite beim Umschalten des Klassenfilters nur noch um. Es gibt keine neue Anfrage und kein Flackern.

Gezählt wird in der Datenbank mit einer neuen, nur lesenden Funktion (eine Abfrage statt 5.000 Fragen über das Netz zu holen). Sie zählt nach denselben Regeln wie die Seite „Fragen“:
- nur nicht gelöschte Fragen, Themen und Fächer
- private Nachweis-Fragen nur für den Super-Admin (PROJ-46)
- der Bereich kommt über das Fach, wie überall

**Fragenliste:** nutzt die bestehende Fragen-Schnittstelle (20 je Seite, Suche, Status, Klasse, Thema, „ohne Thema“). Eine Ergänzung: Filter nach **Fach-ID** statt nur nach Kürzel, weil gleiche Kürzel („KSK“) in mehreren Bereichen vorkommen.

**Zähl-Regel bei Fragen mit mehreren Fächern:** Eine Frage kann mehreren Fächern zugeordnet sein. Sie zählt in jedem dieser Fächer. Unter einem Thema erscheint sie nur, wenn das Thema zu diesem Fach gehört. Fach-Zahl = alle Fragen des Fachs, deshalb kann sie größer sein als die Summe der Themen plus „Ohne Thema“. Das ist gewollt und selten.

**Was gespeichert wird:** nichts Neues. Keine neue Tabelle, keine neue Spalte.

### C) Auswahl in der Adresse
Die Adresse hält Fach, Thema (oder „ohne“), Klassenstufe und auf dem Handy die Ansicht „Liste“, z. B. `/admin/inhalte?fach=…&thema=…&klasse=11`.
- Neu laden und Link teilen zeigen dieselbe Auswahl.
- Auf dem Handy legt das Öffnen der Liste einen Eintrag im Browser-Verlauf an. So führen „Zurück“-Knopf und Browser-Zurück gleich zum Baum.
- Der Auf-/Zuklapp-Zustand steht nicht in der Adresse, sondern im Speicher der Seite. Er bleibt beim Wechsel Baum ↔ Liste erhalten, Fächer mit der gewählten Auswahl klappen automatisch auf.
- Zeigt die Adresse auf ein unbekanntes, gelöschtes oder fremdes Thema, fällt die Auswahl still auf Fach bzw. Bereich zurück (mit kurzem Hinweis, wenn es ein bekanntes Thema war).

### D) Änderungen an Bestehendem
| Was | Änderung | Warum |
|---|---|---|
| Thema löschen (Server) | lehnt ab, solange das Thema Fragen hat, und nennt die Zahl | E7, schützt vor Fragen ohne Zuordnung |
| Seite „Themen“ | Lösch-Rückfrage zeigt die Sperre statt „verlieren ihre Zuordnung“ | E7, gleiche Regel überall |
| Fragen-Schnittstelle | zusätzlicher Filter nach Fach-ID | Kürzel sind nicht eindeutig |
| Fragen-Dialog | kann beim Anlegen Fach und Thema vorbelegen | „Neue Frage“ im gewählten Thema |
| Seitenleiste + Schnellsuche (⌘K) | Eintrag „Inhalte“ in der Gruppe von „Fragen“ | Erreichbarkeit |

Rechte: Die neue Lese-Schnittstelle prüft wie alle Inhalts-Schnittstellen „Zugang zum Lehrkräfte-Bereich“ und den Bereich der Bereichsleiste. Alle Änderungen laufen über die **bestehenden** Schnittstellen. Rechte, Protokoll (PROJ-70), Papierkorb und Versionskonflikt (PROJ-47) gelten deshalb automatisch.

### E) Technische Entscheidungen (warum)
- **Zählen in der Datenbank statt im Browser:** Die Seite „Themen“ holt heute alle Fragen seitenweise, um Klassenstufen abzuleiten. Für 5.000 Fragen dauert das zu lange. Eine Datenbank-Funktion liefert die fertigen Zahlen in einem Aufruf, damit bleibt der Baum unter 1 Sekunde.
- **Zahlen nach Klassenstufe vorab aufgeteilt:** Der Klassenfilter fühlt sich sofort an, und die Datenbank wird nicht bei jedem Klick gefragt.
- **Eigener Baum statt Bibliothek:** shadcn/ui hat keinen Baum. Zweistufig mit Tastaturbedienung ist überschaubar. Eine Baum-Bibliothek bringt mehr Gewicht als Nutzen.
- **Bestehende Fragen-Schnittstelle wiederverwenden:** Suche, Seiten, Antwortschlüssel und Rechte sind dort schon gelöst und getestet. Eine zweite Liste würde auseinanderlaufen.
- **Nach jeder Änderung Baum und Liste neu laden** statt Zahlen im Browser hochzuzählen. Der Baum-Aufruf ist billig, und so stimmen die Zähler auch nach Verschieben oder Konflikten sicher.
- **Ein Baum-Aufruf je Bereichswechsel:** Schaltet jemand oben links den Bereich um, lädt die Seite neu und setzt die Auswahl zurück.
- **Server/Client-Grenze:** Icons gehen als fertige Elemente an `AdminRowActions` und `⋯`-Menüs, nie als Funktion (Produktions-500 aus früheren Features).

### F) Datenbank
- **Neu:** eine nur lesende Zähl-Funktion (läuft mit den Rechten des aufrufenden Kontos, RLS gilt weiter). Mit Rückbau-Datei.
- **Index prüfen:** Fach-Zuordnung der Fragen nach Fach suchbar. Fehlt der Index, kommt er in dieselbe Migration.
- Keine neuen Tabellen, keine Änderung an RLS-Regeln.

### G) Pakete
Keine neuen Pakete. Genutzt werden vorhandene shadcn/ui-Teile (DropdownMenu, AlertDialog, Dialog, Switch, Input, Skeleton) und Lucide-Icons.

### H) Tests (geplant)
- Baum: Tastatur (hoch/runter/rechts/links/Enter), gedämpfte Zähler, inaktives Fach, „Ohne Thema“ nur bei > 0, Klassenfilter rechnet um und fängt ausgeblendete Auswahl ab.
- Auswahl aus der Adresse inkl. Rückfall bei unbekanntem Thema.
- Themen-Löschen: Server lehnt mit Fragen ab (409), ohne Fragen Papierkorb wie bisher.
- Fragen-Schnittstelle: Filter nach Fach-ID respektiert den Bereich.
- Zähl-Funktion: privat nur für Super-Admin, Gelöschtes zählt nicht.

### I) Reihenfolge
1. `/backend`: Zähl-Funktion + Baum-Schnittstelle, Fach-ID-Filter, Lösch-Sperre.
2. `/frontend`: Seite, Baum, Fragen-Panel, Handy-Ansicht, Vorbelegung im Fragen-Dialog, Seite „Themen“ anpassen.

Abweichend von der üblichen Reihenfolge zuerst Backend: Der Baum braucht die Zähler, sonst lässt sich die Oberfläche nicht sinnvoll bauen.

## Implementation Notes (Backend + Frontend, 2026-11-10)

**Gebaut**
- Seite `/admin/inhalte` mit Baum links und Fragenliste rechts ([page.tsx](../src/app/admin/inhalte/page.tsx)), Bausteine `content-tree`, `content-question-panel`, `topic-name-dialog` unter `src/components/admin/`.
- Neue Lese-Schnittstelle `GET /api/admin/content-tree`; reine Logik (Zählen, Auswahl auflösen) in `src/lib/content-tree.ts`.
- Fragen-Schnittstelle: neuer Filter `subject_id`. Fragen-Formular: neue Vorbelegung `defaults` (Fach, Thema, Klassenstufe).
- Lösch-Sperre (E7): `DELETE /api/admin/topics/[id]` antwortet 409 mit Zahl, solange das Thema Fragen hat. Dialogtext auf „Themen“ angepasst.
- Navigation: Eintrag „Inhalte“ in der Gruppe „Inhalte“ und in der Hauptliste (vor „Fragen“), gleiche Rollen wie „Fragen“.
- Bereichsleiste: neuer Modus `compact` (ohne „Du siehst: …“, nur Umschalter), damit E6 gilt und Lehrkräfte den Bereich trotzdem wechseln können.

**Abweichung vom Tech Design:** Keine Datenbank-Funktion und keine Migration. Die Route zählt im Server seitenweise (1000 Zeilen je Anfrage, gleiches Muster wie die Themen-Route). Grund: Migrationen an der Produktion muss der Nutzer von Hand einspielen, und der Bestand (ca. 4.000 Fragen je Bereich) ist klein genug. Wird der Baum bei „Alle Bereiche“ spürbar langsam, lässt sich die Zählung später in eine Funktion verlagern, ohne die Oberfläche zu ändern.

**Weitere Entscheidungen**
- Aktivieren/Deaktivieren eines Fachs prüft der Server (keine Deaktivierung bei aktiven Fragen), die Meldung erscheint als Toast.
- Klassenstufe wird in „Neue Frage“ mit vorbelegt, wenn der Klassenfilter gesetzt ist.
- Löscht jemand das gewählte Thema selbst, springt die Auswahl ohne Hinweis aufs Fach. Verschwindet es durch andere, erscheint der Hinweis „Dieses Thema gibt es nicht mehr“.

## QA Test Results (2026-11-10)

**Automatisch:** 2806 Tests grün (242 Dateien), `tsc` ohne Fehler, `npm run build` grün, neue Routen im Build. Neue Tests: Baum-Logik und Auswahl (8), Baum-Komponente inkl. Tastatur, Zähler, Klassenfilter, Menüs (10), Baum-Schnittstelle inkl. 401/403, gelöscht/privat (5), Lösch-Sperre (2), Fach-ID-Filter (2).
**Datenbank (lesend):** benutzte Spalten und Fremdschlüssel vorhanden; Bestand 8.341 Fragen, 189 Themen, 9 Fächer.

| Kriterium | Ergebnis |
|---|---|
| Seite, Navigation, Rollen wie „Fragen“ | erfüllt (Nav-Test, Schnittstelle prüft Rolle) |
| Alte Seiten unverändert | erfüllt, außer Dialogtext bei „Themen“ (E7) |
| Auswahl in der Adresse | erfüllt (`fach`, `thema`, `klasse`, `ansicht`) |
| Baum, Zähler, gedämpft, inaktiv, Tastatur | erfüllt (Komponententest) |
| Menüs, Lösch-Sperre, Toast | erfüllt |
| Fragenliste, Suche, Status, seitenweise | erfüllt |
| Handy: Baum → Liste mit Zurück | im Code umgesetzt, **nicht im Browser geprüft** |
| Zustände Laden/Leer/Fehler | erfüllt |

**Nicht im Browser geprüft** (kein Dev-Server erlaubt): Handy-Ansicht, Aussehen, Zurück-Taste. Bitte einmal auf Handy und Laptop durchklicken.

**Sicherheit:** Alle Schreibzugriffe laufen über bestehende Schnittstellen mit Rechteprüfung. Neue Route ist rein lesend, prüft Anmeldung und Rolle, filtert Bereich, gelöschte Inhalte und private Nachweis-Fragen (nur Super-Admin). `subject_id` wird als UUID geprüft.

**Bugs:** keine kritischen oder hohen. Offen (niedrig): Bei „Alle Bereiche“ lädt der Baum alle Fragen seitenweise nacheinander, bei ca. 8.000 Fragen etwa 2 Sekunden zu erwarten; nicht gemessen.

## Deployment
_To be added by /deploy_
