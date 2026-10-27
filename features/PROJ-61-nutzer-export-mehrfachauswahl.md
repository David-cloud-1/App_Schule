# PROJ-61: Nutzer – CSV-Export & Mehrfachauswahl (Super-Admin)

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Der Super-Admin pflegt Konten heute einzeln. Zu Schuljahresbeginn oder bei Bereichs-Umstellungen müssen aber viele Konten gleich behandelt werden. Außerdem braucht er die Liste als Datei, z. B. für Gespräche mit Ausbildungsbetrieben oder als Übersicht für Kolleginnen und Kollegen.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1:** Export und Mehrfachauswahl gibt es **nur für den Super-Admin**.

## Dependencies
- Requires: PROJ-57 (Sortieren & Filter; der Export nimmt genau diese Ansicht)
- Berührt: PROJ-24 (Bereich verschieben), bestehendes Sperren/Entsperren

## User Stories
- Als **Super-Admin** möchte ich die aktuell gefilterte und sortierte Liste als CSV herunterladen, damit ich sie in Excel weiterverwenden kann.
- Als **Super-Admin** möchte ich mehrere Personen ankreuzen und auf einmal sperren oder entsperren, damit ich z. B. einen abgeschlossenen Jahrgang schnell stilllege.
- Als **Super-Admin** möchte ich mehrere Personen auf einmal in einen anderen Fachbereich verschieben.
- Als **Super-Admin** möchte ich mit einem Klick alle gefilterten Personen auswählen, z. B. „seit 30 Tagen inaktiv“.

## Acceptance Criteria

### CSV-Export
- [ ] Im Seitenkopf gibt es „Exportieren“ (`variant="outline"`, Download-Icon).
- [ ] Exportiert werden genau die gerade sichtbaren Zeilen in der sichtbaren Reihenfolge (Suche, Filter, Sortierung, Bereichs-Ansicht).
- [ ] Spalten: Name, E-Mail, Rolle, Bereich, XP, Level, Streak, Letzte Session, Letzter Login, Status, Registriert am.
- [ ] Format: Semikolon als Trennzeichen, UTF-8 mit BOM (Umlaute in Excel korrekt), deutsches Datumsformat `TT.MM.JJJJ`.
- [ ] Dateiname: `nutzer-{bereich oder alle}-{JJJJ-MM-TT}.csv`.
- [ ] Zellen, die mit `=`, `+`, `-` oder `@` beginnen, werden entschärft (CSV-Injection).
- [ ] Sind Zeilen angekreuzt, fragt der Button: „Nur Auswahl ({n})“ oder „Alle sichtbaren ({m})“.
- [ ] Jeder Export erzeugt einen Protokoll-Eintrag `user.export` mit Anzahl und Filter (ohne Personendaten).

### Mehrfachauswahl
- [ ] Die Tabelle bekommt für den Super-Admin vorne eine Checkbox-Spalte. Die erste Spalte bleibt dann nicht stehen (Regel aus PROJ-45).
- [ ] Die Checkbox in der Überschrift wählt alle **sichtbaren** Zeilen aus oder ab. Ist nur ein Teil gewählt, zeigt sie den Zwischenzustand.
- [ ] Bei mindestens einer Auswahl erscheint eine Aktionsleiste: „{n} ausgewählt“ · Sperren · Entsperren · Bereich ändern · Exportieren · Auswahl aufheben. Am Handy steht sie fest am unteren Rand.
- [ ] Jede Sammelaktion fragt per `AlertDialog` nach und nennt die Anzahl. Bei mehr als 5 Personen nennt sie die ersten 5 Namen plus „und {x} weitere“.
- [ ] „Bereich ändern“ fragt den Ziel-Bereich ab (Auswahlfeld mit allen Fachbereichen).
- [ ] Nach der Aktion zeigt ein Toast das Ergebnis: „{a} gesperrt“ bzw. „{a} von {n} gesperrt, {b} fehlgeschlagen“ mit „Details“.
- [ ] Jede einzelne Änderung erzeugt ihren eigenen Protokoll-Eintrag (wie bei der Einzelaktion).
- [ ] Ändern sich Filter oder Suche, bleibt die Auswahl erhalten. Die Leiste zählt aber nur, was noch sichtbar ist. Ausgeblendete Zeilen werden nicht verändert.

### Rechte
- [ ] Bereichs-Admins sehen weder Checkboxen noch Export. Die Sammel-Route lehnt sie mit 403 ab.
- [ ] Das eigene Konto und der verknüpfte Zweitaccount werden bei Sammelaktionen übersprungen und im Ergebnis als „übersprungen“ genannt.

## Edge Cases
- Super-Admin-Konten in der Auswahl: Sie werden bei Sperren und Verschieben übersprungen („übersprungen: Super-Admin“).
- Bereichs-Admins in der Auswahl werden verschoben: Ihre Rolle hängt am Bereich. Sie werden deshalb übersprungen mit dem Hinweis „Rolle zuerst ändern“.
- Sehr große Auswahl (> 200): Die Aktion läuft in Teilen und zeigt einen Fortschritt. Ein Abbruch mittendrin hinterlässt einen klaren Stand („120 von 300 erledigt“).
- Leere Liste: „Exportieren“ ist deaktiviert.
- Netzfehler mitten in einer Sammelaktion: bereits erledigte Änderungen bleiben. Der Toast nennt, was fehlt, und „Erneut versuchen“ wiederholt nur die fehlgeschlagenen.

## Technical Requirements (optional)
- CSV wird im Browser aus den bereits geladenen Daten erzeugt. Es gibt keinen zusätzlichen Personendaten-Abruf.
- Sammelaktionen: eine Server-Route mit Liste von IDs, höchstens 500 pro Aufruf.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
