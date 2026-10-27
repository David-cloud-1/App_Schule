# PROJ-52: Werkzeugkiste – Meine Materialien

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Teil des Werkzeugkiste-Umzugs (Übersicht in PROJ-51). Die alte Werkzeugkiste hatte „Meine Ablage“. Dort war gespeichert, was eine Lehrkraft erstellt hatte, inklusive Skripttext, KI-Antwort und fertigen Dateien. In der App wird daraus der Reiter **„Meine Materialien“**. Er füllt sich **automatisch**, ohne extra Speichern-Knopf.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1 – Automatisch speichern:** Jedes fertig erstellte Material landet ohne Zutun in „Meine Materialien“.
- **E2 – Entwürfe 7 Tage:** Unfertige Abläufe (Skript hochgeladen, aber noch kein Material erstellt) erscheinen als **Entwurf** und lassen sich fortsetzen. Nach 7 Tagen ohne Bearbeitung werden sie automatisch gelöscht.
- **E3 – Skripte 12 Monate:** Wie bisher wird der Text des hochgeladenen Skripts nach 12 Monaten entfernt (Datensparsamkeit). Das fertige Material und die KI-Antwort bleiben.
- **E4 – Neustart:** Es werden keine alten Ablage-Einträge übernommen (siehe PROJ-51, E3).

## Dependencies
- Requires: PROJ-51 (Rahmen & Ablauf)
- Wird genutzt von: PROJ-53 (Teilen aus Meine Materialien heraus), PROJ-54 (alle Werkzeuge speichern hier)

## User Stories
- Als **Lehrkraft** möchte ich alles, was ich erstellt habe, an einem Ort wiederfinden, damit ich es nächstes Schuljahr erneut herunterladen kann.
- Als **Lehrkraft** möchte ich einen abgebrochenen Ablauf später fortsetzen, damit ich nach der KI-Pause nicht von vorne anfangen muss.
- Als **Lehrkraft** möchte ich ein erstelltes Material überarbeiten (z. B. Tippfehler oder ein Kapitel neu), ohne das Skript erneut hochzuladen.
- Als **Lehrkraft** möchte ich aus einem schon hochgeladenen Skript ein weiteres Material mit einem anderen Werkzeug machen.
- Als **Lehrkraft** möchte ich nicht mehr benötigtes Material löschen, damit meine Liste übersichtlich bleibt.
- Als **Lehrkraft** möchte ich nach Titel suchen und nach Werkzeug filtern, wenn meine Liste lang wird.

## Acceptance Criteria

### Automatisch speichern
- [ ] Sobald in Schritt 5 ein Material erstellt ist, steht es in „Meine Materialien“ (E1). Gespeichert werden Titel, Werkzeug, Einstellungen, Skriptname, Skripttext, KI-Antwort und die erzeugte(n) Datei(en).
- [ ] Der Titel kommt aus der KI-Antwort (Feld `title`). Fehlt er, wird der Skriptname verwendet. Die Lehrkraft kann den Titel umbenennen.
- [ ] Schritt 5 zeigt „Automatisch unter Meine Materialien gespeichert“ mit Link dorthin.
- [ ] Erstellt die Lehrkraft aus demselben Ablauf eine überarbeitete Fassung („Antwort überarbeiten“ → neu erstellen), **ersetzt** diese das bisherige Material, statt eine Kopie anzulegen.

### Entwürfe (E2)
- [ ] Sobald ein Skript eingelesen ist, entsteht ein Entwurf. Er steht in der Liste oben, gekennzeichnet als **„Entwurf“** mit dem zuletzt erreichten Schritt („bei Schritt 3 · Prompt“).
- [ ] „Fortsetzen“ öffnet den Ablauf genau an dieser Stelle, mit Skript, Einstellungen und bereits eingefügter Antwort.
- [ ] Wird ein Entwurf fertig, wird er zum normalen Material und verliert die Kennzeichnung.
- [ ] Entwürfe ohne Bearbeitung seit 7 Tagen werden automatisch gelöscht. Ab Tag 6 zeigt der Entwurf „wird morgen gelöscht“.

### Liste
- [ ] Die Liste ist eine Tabelle im Rahmen (`ws-table-scroll`, erste Spalte stehend) mit den Spalten **Titel** (darunter klein: Format · aus [Skriptname]), **Werkzeug**, **Erstellt** (relativ: „heute“, „gestern“, „vor 3 Tagen“, sonst Datum), **Regal** (erst ab PROJ-53) und den Aktionen.
- [ ] Sortiert wird nach „zuletzt bearbeitet“, neueste zuerst. Entwürfe stehen immer oben.
- [ ] Über der Liste stehen ein Suchfeld (Titel und Skriptname) und ein Filter „Werkzeug“.
- [ ] Auf dem Handy wird jede Zeile zur Karte (Titel, Werkzeug, Datum, Aktionen).
- [ ] Ab 50 Einträgen wird die Liste seitenweise geladen.
- [ ] **Leerzustand** (`AdminEmptyState`): „Noch kein Material erstellt.“ mit der Hauptaktion „Skript hochladen“. Der Seitenkopf zeigt die Hauptaktion dann nicht zusätzlich.

### Aktionen je Material
- [ ] Direkt sichtbar: **„Herunterladen“**. Bei mehreren Dateien (z. B. ZIP plus Einzeldateien) öffnet sich eine kurze Auswahl.
- [ ] Im Menü ⋯:
  - **Vorschau ansehen**
  - **Überarbeiten**: öffnet den Ablauf bei Schritt 4 mit der gespeicherten Antwort, inklusive der bisherigen Funktionen „Tippfehler ohne KI korrigieren“ und „einzelnes Kapitel neu anfragen“
  - **Gleiches Skript, anderes Werkzeug**: öffnet einen neuen Ablauf bei Schritt 2 mit dem gespeicherten Skript. Nach 12 Monaten ist das ausgegraut, mit Hinweis „Skript wurde nach 12 Monaten entfernt“.
  - **Umbenennen**
  - **KI-Antwort herunterladen** (`.yaml`, für Fortgeschrittene)
  - **Löschen**
- [ ] Löschen geht nur nach `AlertDialog` („Material endgültig löschen?“). Danach erscheint ein Toast.
- [ ] Ist das Material im Regal geteilt (PROJ-53), weist der Lösch-Dialog darauf hin: „Es verschwindet auch aus dem Regal.“

### Aufbewahrung (E3)
- [ ] Skripttexte und hochgeladene Skriptdateien werden 12 Monate nach dem Hochladen automatisch entfernt. Material, KI-Antwort und erzeugte Dateien bleiben.
- [ ] Die Lehrkraft sieht in der Zeile, wenn das Skript entfernt wurde (kleiner Hinweis, kein Fehler).

### Sichtbarkeit
- [ ] Jede Lehrkraft sieht **nur ihre eigenen** Materialien und Entwürfe. Das gilt auch für Bereichs-Admins und den Super-Admin. Teilen geht nur über das Regal (PROJ-53).
- [ ] Direkte Aufrufe fremder Materialien liefern 404.

## Edge Cases
- **Lehrkraft löscht ihr Konto oder verliert die Lehrer-Rolle:** Ihre privaten Materialien und Entwürfe werden mit dem Konto gelöscht. Bei Rollenentzug bleiben sie erhalten, sind aber nicht erreichbar, bis die Rolle zurückkommt. Was im Regal geteilt war, regelt PROJ-53.
- **Zwei Tabs bearbeiten dasselbe Material:** Die zuletzt erstellte Fassung gewinnt. Vor dem Ersetzen weist die App darauf hin, wenn das Material inzwischen anderswo geändert wurde.
- **Speicher der Lehrkraft sehr voll** (z. B. viele Podcast-ZIPs): Es gibt pro Lehrkraft eine Obergrenze (Vorschlag: 2 GB). Ab 90 % erscheint ein Hinweis, bei Überschreitung wird das Speichern neuer Materialien mit Hinweis auf „Löschen“ abgelehnt.
- **Download einer Datei, die im Speicher fehlt:** Klarer Hinweis („Die Datei ist nicht mehr vorhanden. Über Überarbeiten neu erstellen.“), kein technischer Fehler.
- **Entwurf ohne eingelesenes Skript** (Upload abgebrochen): Er wird gar nicht erst angelegt.
- **Gleicher Titel mehrfach:** Das ist erlaubt. Unterscheiden lassen sich die Einträge über Datum und Skriptname.

## Technical Requirements
- **Sicherheit:** Materialien und Dateien sind nur für die Besitzerin oder den Besitzer lesbar, serverseitig durchgesetzt. Download-Links sind kurzlebig und nicht erratbar.
- **Leistung:** Die Liste mit 200 Einträgen lädt in unter einer Sekunde.
- **Aufräumen:** Das Löschen abgelaufener Entwürfe und das Entfernen alter Skripte laufen automatisch, mindestens täglich.

## Abgrenzung (nicht Teil dieses Features)
- Teilen mit anderen (PROJ-53)
- Öffentlicher Link für Personen ohne Konto (gab es in der alten Werkzeugkiste als „Teilen-Link“, entfällt vorerst)
- Ordner oder Schlagworte für Materialien (später, falls die Liste zu lang wird)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
