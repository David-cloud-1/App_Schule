# PROJ-85: Inhalts-Baum – Fach → Thema mit Fragenliste

## Status: Planned
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
- [ ] Ein Thema mit Fragen lässt sich nicht löschen, solange es Fragen hat. Die Rückfrage nennt die Zahl und verweist darauf, die Fragen erst zu verschieben (gleiches Verhalten wie heute auf „Themen“).
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
