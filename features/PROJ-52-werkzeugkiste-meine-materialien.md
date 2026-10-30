# PROJ-52: Werkzeugkiste – Meine Materialien

## Status: In Progress
**Created:** 2026-10-27
**Last Updated:** 2026-10-30

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

> Stand 2026-10-30. Baut auf dem Tech Design von PROJ-51 auf. Es kommt **kein neuer Baustein** dazu: Ein „Material“ ist ein fertiger Ablauf, ein „Entwurf“ ein unfertiger. Beide stehen schon heute in derselben Tabelle.

### Das Bild im Großen

```
Reiter „Meine Materialien“ (ersetzt den „Kommt bald“-Platzhalter)
   |  liest die Liste der eigenen Abläufe (neu: Such-, Filter- und Seiten-Abfrage)
   v
Tabelle „Werkzeug-Abläufe“ (besteht, wird um wenige Felder ergänzt)
   Entwurf  = Ablauf, Skript eingelesen, noch nicht fertig  -> läuft nach 7 Tagen ab
   Material = fertiger Ablauf                                -> läuft nie ab
   |
   v
Privater Speicher „werkzeugkiste“ (besteht): Skript, Einlesung, fertige Datei, Vorschau
```

Der geführte Ablauf aus PROJ-51 bleibt unverändert die Werkstatt. „Meine Materialien“ ist die Ablage davor und danach: Hier landet alles, hier wird es wiedergefunden, fortgesetzt, überarbeitet oder gelöscht.

### Was die Prüfung des Bestands ergeben hat (wichtig für den Bau)

Beim Lesen von PROJ-51 und PROJ-54 sind vier Dinge aufgefallen, die die Spec nicht sagt. Sie stecken alle im Entwurf unten.

1. **„Gleiches Skript, anderes Werkzeug“ überschreibt heute das Material.** Der Knopf in Schritt 5 öffnet denselben Ablauf noch einmal bei Schritt 2. Sobald Materialien bleiben, würde ein Werkzeugwechsel das fertige Material zerstören. Er muss künftig einen **neuen** Ablauf mit Kopie des Skripts anlegen.
2. **Die Bremse „höchstens 50 offene Abläufe“ zählt heute auch fertige.** Mit dauerhaft gespeicherten Materialien wäre eine Lehrkraft nach 50 Materialien gesperrt. Künftig zählt die Bremse nur Entwürfe. Für Materialien gilt die Speichergrenze (2 GB).
3. **„Überarbeiten“ ist in der App noch nicht gebaut.** Die Prüfberichte der Pakete A–D vermerken es jeweils als „kommt mit PROJ-52“. Die alte Werkzeugkiste kennt zwei Wege: **Tippfehler direkt im Text ersetzen** (reiner Text-Ersatz, ohne KI) und **ein einzelnes Kapitel neu anfragen** (eigener Prompt nur für dieses Kapitel). Beides muss neu gebaut werden, der zweite Weg braucht den Kern.
4. **Ein Material hat heute genau eine Datei** (bei mehreren Teilen ein ZIP, z. B. Arbeitsblatt plus Lösungsblatt). Die „kurze Auswahl bei mehreren Dateien“ aus der Spec entfällt deshalb, solange kein Werkzeug mehrere Einzeldateien liefert. Das ZIP lässt sich direkt herunterladen.

### Component Structure

```
Reiter „Meine Materialien“ (in der bestehenden Werkzeugkiste-Seite)
+-- Speicher-Hinweis (nur ab 90 % der 2 GB: „Dein Speicher ist fast voll. Lösche Altes.“)
+-- Werkzeugleiste: Suchfeld (Titel, Skriptname) · Filter „Werkzeug“
+-- Liste (Desktop: Tabelle im Rahmen, erste Spalte stehend · Handy: Karten)
|   +-- Entwurfs-Zeile (oben, Kennzeichnung „Entwurf“, „bei Schritt 3 · Prompt“,
|   |                   ab Tag 6: „wird morgen gelöscht“, Knopf „Fortsetzen“)
|   +-- Material-Zeile (Titel, darunter Format · aus [Skriptname] und ggf.
|   |                   „Skript entfernt“, Werkzeug, Erstellt relativ, Knopf „Herunterladen“,
|   |                   Menü ⋯)
|   +-- „Mehr laden“ (ab 50 Einträgen seitenweise)
+-- Leerzustand (AdminEmptyState, „Noch kein Material erstellt“, Hauptaktion nur hier)
+-- Fehlerzustand (AdminErrorState, „Erneut versuchen“)
Menü ⋯ je Material
+-- Vorschau ansehen        (öffnet den vorhandenen Vorschau-Dialog)
+-- Überarbeiten            (Ablauf bei Schritt 4, ausgegraut wenn das Skript entfernt wurde)
+-- Gleiches Skript, anderes Werkzeug   (neuer Ablauf bei Schritt 2; ausgegraut nach 12 Monaten)
+-- Umbenennen              (kleiner Dialog mit einem Feld)
+-- KI-Antwort herunterladen (.yaml)
+-- Löschen                 (AlertDialog „Material endgültig löschen?“)
Schritt 5 des Ablaufs
+-- Hinweis „Automatisch unter Meine Materialien gespeichert“ mit Link
+-- „Gleiches Skript, anderes Werkzeug“ legt jetzt eine Kopie an (siehe Fund 1)
Schritt 4 des Ablaufs (neu, nur bei einem bestehenden Material oder Entwurf mit Antwort)
+-- „Tippfehler direkt korrigieren“ (aufklappbar: Suchen-und-Ersetzen im Antworttext)
+-- „Kapitel neu anfragen“ (Kapitelwahl, eigener Prompt zum Kopieren, Antwort für nur dieses Kapitel)
Ablauf-Schließen (✕)
+-- Rückfrage-Text ändert sich auf „Dein Zwischenstand bleibt 7 Tage unter Meine Materialien“
```

Alles aus vorhandenen shadcn-Bausteinen (Table, Card, Input, Select, DropdownMenu, Dialog, AlertDialog, Badge, Collapsible, Skeleton) und den Zuständen aus `admin-states.tsx`. Keine neuen Pakete.

### Data Model (in Worten)

Die Tabelle „Werkzeug-Abläufe“ (PROJ-51) bekommt diese Ergänzungen:

- **Titel** (von der Lehrkraft änderbar). Wird beim Fertigstellen aus der KI-Antwort übernommen, sonst aus dem Skriptnamen. Bisher steht der Titel nur im fertigen Ergebnis und ließe sich nicht umbenennen.
- **Skript hochgeladen am.** Davon läuft die 12-Monats-Uhr. Bei einer Kopie („anderes Werkzeug“) wird der **ursprüngliche** Zeitpunkt mitgenommen, damit eine Kopie die Aufbewahrung nicht verlängert.
- **Skript entfernt am** (leer, solange das Skript noch da ist). Daran erkennt die Liste den Hinweis „Skript wurde nach 12 Monaten entfernt“.
- **Speichergröße** der Dateien des Ablaufs (für die 2-GB-Grenze, ohne bei jeder Anfrage den Speicher zu durchsuchen).
- **Läuft ab am** wird **leer erlaubt**: Fertige Materialien haben keinen Ablauftermin mehr. Nur Entwürfe behalten ihn (7 Tage nach der letzten Bearbeitung).

Zustände, die sich aus vorhandenen Feldern ergeben (kein neues Feld):
- **Entwurf** = Zustand „läuft“ **und** das Skript ist eingelesen (Kennzahlen vorhanden). Wurde der Upload abgebrochen, ist die Zeile noch nicht eingelesen, taucht in der Liste nicht auf und wird mit den anderen nach 7 Tagen weggeräumt (erfüllt „wird gar nicht erst angelegt“ aus der Spec).
- **Material** = Zustand „fertig“.
- **Zuletzt bearbeitet** = das vorhandene Änderungsdatum. **Zuletzt erreichter Schritt** = das vorhandene Feld „Schritt“.

**Wer darf was:** unverändert. Die Datenbankregeln aus PROJ-51 (nur eigene Zeilen, nur mit Lehrer-Rolle, auch der Super-Admin sieht fremde nicht) gelten schon für alles, was PROJ-52 braucht. **Die Zugriffsregeln werden nicht angefasst.** Ein fremdes Material ruft deshalb „nicht gefunden“ (404) hervor, so wie in PROJ-51.

**Bestehende Zeilen:** Fertige Abläufe, die schon vor diesem Feature entstanden sind (Tests der Pakete A–D), werden mit der Migration zu Materialien. Entwürfe behalten ihre Frist.

### Wie die Liste arbeitet

- **Eine Abfrage pro Seite**: Die App fragt die eigenen Abläufe ab (Suche, Werkzeugfilter, Seitengröße 50) und bekommt nur die schmalen Listenfelder zurück. Nie die KI-Antwort oder den Prompt, sonst wären 200 Einträge zu schwer. Das hält die Liste unter einer Sekunde.
- **Sortierung**: Entwürfe zuerst, innerhalb davon und bei den Materialien nach „zuletzt bearbeitet“.
- **Suche** läuft in Titel und Skriptname, ohne Beachtung der Groß-/Kleinschreibung. Eingaben werden so behandelt, dass Sonderzeichen nichts „auslösen“.
- **Relative Daten** („heute“, „gestern“, „vor 3 Tagen“) rechnet die Oberfläche aus dem Zeitpunkt.
- **Spalte „Regal“** bleibt bis PROJ-53 ausgeblendet.

### Der Weg eines Materials

| Wann | Was passiert |
|---|---|
| Skript eingelesen | Der Ablauf erscheint als Entwurf. Jede Bearbeitung setzt die 7 Tage neu. |
| Schritt 5 erreicht (Material erstellt) | Der Ablauf wird Material: Titel wird gesetzt, der Ablauftermin entfällt, die Speichergröße wird eingetragen. Schritt 5 zeigt „Automatisch gespeichert“. |
| „Überarbeiten“ | Öffnet denselben Ablauf bei Schritt 4 mit der gespeicherten Antwort. Wird neu gebaut, **ersetzt** die neue Datei die alte. Bis dahin bleibt die zuletzt gebaute Fassung downloadbar. |
| „Gleiches Skript, anderes Werkzeug“ | Legt einen **neuen** Ablauf an, kopiert Skript und Einlesung im Speicher (ohne Umweg über die App) und öffnet Schritt 2. Das alte Material bleibt unberührt. Die Einstellungen werden auf die Standardwerte des neuen Werkzeugs gesetzt. |
| „Fortsetzen“ eines Entwurfs | Öffnet den Ablauf bei seinem weitesten Schritt. |
| „Löschen“ | Nach Rückfrage verschwinden Zeile und alle Dateien. (Hinweis „verschwindet auch aus dem Regal“ folgt mit PROJ-53.) |
| 7 Tage ohne Bearbeitung (nur Entwurf) | Der tägliche Zeitplan löscht Zeile und Dateien. |
| 12 Monate nach dem Hochladen | Der tägliche Zeitplan entfernt Skriptdatei **und** Einlesung (Text und Bilder). Titel, Antwort und fertige Datei bleiben. Die Zeile bekommt „Skript entfernt am“. |

### Die Zwei-Tabs-Regel (Edge Case aus der Spec)
Beim Neubauen schickt die Oberfläche den Stand mit, den sie gesehen hat. Hat sich das Material inzwischen woanders geändert, fragt die App nach („Dieses Material wurde inzwischen geändert. Trotzdem ersetzen?“). Bestätigt die Lehrkraft, gewinnt die zuletzt erstellte Fassung.

### Speichergrenze (2 GB je Lehrkraft)
- Die Summe der Speichergrößen aller eigenen Abläufe wird beim **Start** eines neuen Ablaufs (Hochladen oder Kopie) geprüft. Über der Grenze lehnt die App den Start mit Hinweis auf „Löschen“ ab.
- **Bewusst nicht am Ende:** Ein Material, das schon erarbeitet und gebaut wird, wird nie wegen des Speichers abgelehnt. Sonst wäre die Arbeit der Lehrkraft (und bei künftiger bezahlter KI das Geld) umsonst.
- Ab 90 % zeigt der Reiter „Meine Materialien“ den Hinweis.

### Sicherheit
- Alle neuen Aufrufe prüfen zuerst die Lehrer-Rolle (wie überall in der Werkzeugkiste) und lesen nur über die Datenbankregeln der eigenen Zeilen.
- Download-Adressen bleiben kurzlebig (120 Sekunden) und nicht erratbar, so wie in PROJ-51. Die Datei läuft nie durch die App.
- Das Kopieren des Skripts für „anderes Werkzeug“ passiert **innerhalb des Speichers** und nur zwischen zwei Ordnern derselben Lehrkraft.
- „KI-Antwort herunterladen“ liefert den gespeicherten Text als Datei (höchstens 2 MB, also unter der 4,5-MB-Grenze von Vercel).
- Das Suchfeld und die Umbenennung werden serverseitig geprüft (Länge, Zeichen). Titel werden nie als Seitenbestandteil gedeutet, sondern nur als Text angezeigt.
- Keine Inhalte (Titel, Skripttext, Antworten) in Fehlerberichten.

### Tech Decisions (warum so)

| Entscheidung | Warum |
|---|---|
| Dieselbe Tabelle wie die Abläufe, keine neue „Materialien“-Tabelle | PROJ-51 hat das so vorgesehen. Zwei Tabellen hießen, bei jedem Fertigstellen Daten umzuziehen und zwei Löschwege zu pflegen. |
| Entwurf und Material aus Zustand + Kennzahlen abgeleitet | Kein zusätzliches Feld, das auseinanderlaufen könnte. |
| Kopie des Skripts im Speicher statt erneut hochladen | Die Lehrkraft lädt nichts noch einmal hoch (Spec: „ohne das Skript erneut hochzuladen“), und große Dateien laufen nie durch die App. |
| Ursprüngliches Hochlade-Datum bleibt bei Kopien | Sonst ließe sich die 12-Monats-Löschung durch „anderes Werkzeug“ ewig hinauszögern. Das widerspräche dem Zweck (Datensparsamkeit bei Verlagsmaterial). |
| Speichergrenze am Anfang prüfen | Sie kostet die Lehrkraft nie fertige Arbeit. |
| Bremse „50 offene Abläufe“ nur für Entwürfe | Sonst sperrt die Ablage die Lehrkraft nach 50 Materialien. |
| Listenabfrage mit schmalen Feldern | Prompt und Antwort sind mehrere hundert Kilobyte je Zeile. |
| Aufräumen im bestehenden täglichen Zeitplan erweitern | Er läuft schon, ist geschützt (`CRON_SECRET`) und räumt Dateien und Zeilen zusammen. Dateien lassen sich nur über die Speicher-Schnittstelle löschen, daher nicht allein per Datenbank. |
| Tippfehler-Korrektur als reiner Text-Ersatz in der Oberfläche | So macht es auch die alte Werkzeugkiste. Es braucht keine KI und keinen Kern-Aufruf, danach wird die geänderte Antwort wie gewohnt geprüft. |
| „Kapitel neu anfragen“ braucht einen neuen Kern-Aufruf | Der Prompt für ein einzelnes Kapitel liegt im Kern (`prompts.py`) und muss zeichengenau derselbe bleiben. Deshalb wird er dort abgerufen, nicht in der App nachgebaut. |

### Aufteilung in zwei Pakete (jedes einzeln live)

| Paket | Inhalt | Warum getrennt |
|---|---|---|
| **1 – Ablage** | Automatisches Speichern und Titel, Entwürfe (Liste, Fortsetzen, 7 Tage), Liste mit Suche/Filter/Seiten und Handy-Karten, Herunterladen, Vorschau, Umbenennen, Löschen, „Gleiches Skript, anderes Werkzeug“ als Kopie, KI-Antwort herunterladen, 12-Monats-Aufräumen, Speichergrenze, neue Rückfrage beim ✕, Anpassung der 50er-Bremse | Das ist der Kern des Features und braucht den Kern (Python) nicht. Es lässt sich allein prüfen und ausliefern. |
| **2 – Überarbeiten** | Tippfehler direkt korrigieren, Kapitel neu anfragen (neuer Kern-Aufruf), Zwei-Tabs-Warnung beim Ersetzen | Braucht den Kern, damit der Prompt zeichengenau wie in der alten Werkzeugkiste ist. Bis dahin ist „Überarbeiten“ der Weg zu Schritt 4 mit gespeicherter Antwort (ohne die zwei Hilfen). |

### Dependencies
- **Lern-App:** keine neuen Pakete.
- **Werkzeugkiste-Kern:** keine neuen Pakete. Nur Paket 2 ergänzt einen Aufruf für den Kapitel-Prompt.
- **Einrichtung:** eine Datenbank-Migration (neue Felder, „Läuft ab am“ darf leer sein). Der tägliche Zeitplan existiert schon.

### Auswirkungen auf andere Features
- **PROJ-53 (Regal):** hängt eine Freigabe an ein Material. Das Löschen und „Überarbeiten“ muss dann die Freigabe berücksichtigen (Spec dort). Die Spalte „Regal“ wird erst dort sichtbar.
- **PROJ-60 (Konto löschen):** Beim Löschen des Kontos verschwinden die Zeilen von selbst, die **Dateien im Speicher nicht**. PROJ-60 muss sie ausdrücklich mit entfernen. Das gehört in dessen Spec.
- **PROJ-54 (Pakete A–D live):** Die fertigen Materialien der Test-Läufe werden zu Materialien statt nach 7 Tagen zu verschwinden.

### Entscheidungen (Nutzer, 2026-10-30)
1. **Überarbeiten nach 12 Monaten (Skript entfernt):** Die Bilder aus dem Skript stecken in der Einlesung. Ist sie weg, lässt sich keine überarbeitete Datei mehr bauen. Deshalb sind „Überarbeiten“ **und** „Gleiches Skript, anderes Werkzeug“ ausgegraut mit dem Hinweis „Skript wurde nach 12 Monaten entfernt“. Herunterladen, Vorschau, Umbenennen, KI-Antwort und Löschen gehen weiter. (Erweitert die Spec, die nur „anderes Werkzeug“ nennt.)
2. **Zwei Pakete**, jedes einzeln live: Paket 1 „Ablage“, Paket 2 „Überarbeiten“ (siehe Tabelle oben).

### Modellempfehlung für den Bau
- **Paket 1 (Ablage):** Sonnet 5.5. Datenbank-Ergänzung, Liste, Aktionen, Aufräumen: viel, aber nach bekanntem Muster aus PROJ-51.
- **Paket 2 (Überarbeiten):** Sonnet 5.5. Ein neuer Kern-Aufruf, bei dem die Gleichheit des Prompts mit der alten Werkzeugkiste per Test belegt werden muss. Opus nur, falls das festfährt.

## Frontend-Umsetzung Paket 1 „Ablage“ (2026-10-30)

**Noch nicht lauffähig ohne `/backend`:** Der Reiter ruft Schnittstellen auf, die es noch nicht gibt (siehe unten). **Nicht deployen, bevor das Backend steht**, sonst zeigt der Reiter „Meine Materialien“ in Produktion einen Fehler.

**Neu**
- `src/components/werkzeugkiste/meine-materialien.tsx`: Reiter-Inhalt mit Speicher-Hinweis (ab 90 %), Suchfeld (300 ms Pause), Werkzeug-Filter, Tabelle im Rahmen (`ws-table-scroll ws-table-sticky`, erste Spalte steht) ab 768 px, darunter Karten, „Mehr laden“, Leerzustand (Hauptaktion nur dort), „Nichts gefunden“ mit Zurücksetzen, Fehlerzustand mit „Erneut versuchen“. Aktionen je Zeile: Hauptknopf (Entwurf „Fortsetzen“, Material „Herunterladen“, reine Texte wie LearningApps „Öffnen“) und Menü ⋯ (Vorschau, Überarbeiten, Gleiches Skript/anderes Werkzeug, Umbenennen, KI-Antwort herunterladen, Löschen). Umbenennen-Dialog, Lösch-`AlertDialog` (Entwurf und Material mit eigenem Text).
- `src/components/werkzeugkiste/vorschau-dialog.tsx`: Vorschau-Dialog aus Schritt 5 herausgelöst, damit Liste und Schritt 5 denselben nutzen.
- `src/lib/werkzeugkiste-materialien.ts` (+ Test): Typen `MaterialZeile` / `MaterialListe`, relative Daten, Entwurfsstand („bei Schritt 3 · Prompt“), Löschwarnung ab dem vorletzten Tag, Speicherstand, Regeln für die ausgegrauten Aktionen nach 12 Monaten.

**Geändert**
- `werkzeugkiste-seite.tsx`: „Kommt bald“-Platzhalter des Reiters ersetzt. Ist die Ablage ganz leer, entfällt „Skript hochladen“ im Seitenkopf (steht nur im Leerzustand).
- `schritt-fertig.tsx`: Hinweis „Automatisch unter Meine Materialien gespeichert“ mit Link statt „7 Tage lang bereit“. **„Gleiches Skript, anderes Werkzeug“ legt jetzt eine Kopie an** (statt denselben Ablauf noch einmal zu öffnen und das Material zu überschreiben) und leitet auf Schritt 2 des neuen Ablaufs. Bei Video-Fragen ausgeblendet (`anderesWerkzeug={false}`).
- `ablauf-seite.tsx` / `ablauf-rahmen.tsx`: Das ✕ **löscht den Ablauf nicht mehr**. Rückfrage jetzt „Dein Zwischenstand bleibt 7 Tage unter Meine Materialien“ mit grüner Bestätigung „Schließen“. In `ablauf-neu.tsx` (vor dem Einlesen, kein Entwurf) bleibt es beim Löschen mit dem alten Text.
- `werkzeugkiste-api.ts`: Aufrufe `ladeMaterialien`, `benenneMaterialUm`, `kopiereFuerAnderesWerkzeug`, `antwortHref`.

**Schnittstelle, die `/backend` bauen muss** (alle unter `/api/admin/werkzeugkiste`, alle mit `requireTeacherOrAdmin`, Zod, eigene Zeilen über RLS):

| Aufruf | Zweck | Antwort |
|---|---|---|
| `GET /materialien?suche=&werkzeug=&seite=&je=` | Liste der eigenen Entwürfe und Materialien, schmale Zeilen (nie Prompt/Antwort). Entwurf = Zustand „läuft“ **und** eingelesen. Entwürfe zuerst, dann nach zuletzt bearbeitet. Suche in Titel und Skriptname (Sonderzeichen entschärfen). `je` höchstens 50 | `MaterialListe`: `{ eintraege: MaterialZeile[], gesamt, hatMehr, speicher: { genutztBytes, grenzeBytes } }` |
| `PATCH /ablaeufe/:id` `{titel}` | Umbenennen (1–120 Zeichen, getrimmt) | `{ ablauf }` |
| `POST /ablaeufe/:id/kopie` | Neuer Ablauf: Skript und Einlesung im Speicher kopieren, Kennzahlen/Gliederung/Dateiname übernehmen, ursprüngliches „Skript hochgeladen am“ behalten, Einstellungen auf Standard des Werkzeugs, Schritt 2. Ablehnen bei entferntem Skript (409), Video-Fragen (409) und voller Speichergrenze | `{ ablauf }` |
| `GET /ablaeufe/:id/antwort` | Gespeicherte KI-Antwort als `.yaml`-Download | Datei |
| `DELETE /ablaeufe/:id` | besteht, löscht Zeile und Dateien | `{ ok: true }` |

`MaterialZeile` steht in `src/lib/werkzeugkiste-materialien.ts`. Wichtig dafür: `titel` (Material: gespeicherter Titel; Entwurf: Skriptname), `format` (Format-Schlüssel des Ergebnisses), `hatDatei` (false bei reinen Texten), `hatVorschau`, `hatAntwort`, `skriptEntfernt`, `erstelltAm` (bei Material: Zeitpunkt der Fertigstellung), `laeuftAbAm` (nur Entwürfe).

**Außerdem im Backend nötig** (laut Tech Design): Migration (Titel, „Skript hochgeladen am“, „Skript entfernt am“, Speichergröße, `laeuft_ab_am` darf leer sein; bestehende fertige Abläufe bekommen keinen Ablauftermin mehr), Titel beim Fertigstellen setzen, die „50 offenen Abläufe“-Bremse nur für Entwürfe, Speichergrenze 2 GB beim Start (Anlegen und Kopie, nie nach dem Bauen), Erweiterung des täglichen Zeitplans (Skripte nach 12 Monaten entfernen, `skript entfernt am` setzen).

**Tests:** `werkzeugkiste-materialien.test.ts` (13) und `meine-materialien.test.tsx` (10: Leerzustand samt Meldung an die Seite, Entwurf/Material, reine Texte, Speicherhinweis, Suche und Zurücksetzen, „Mehr laden“, Fehler mit Wiederholen, Löschen nach Rückfrage, ausgegraute Aktionen nach 12 Monaten, Umbenennen). Ein bestehender Test (`paket-b.test.tsx`) prüft jetzt den Materialien-Link statt „7 Tage“. Gesamtsuite 1906 grün, `tsc`, Lint und Produktions-Build sauber.

**Nicht geprüft:** Aussehen und Bedienung im Browser (kein Dev-Server, siehe Projektregel), Handy-Breite, Hell/Dunkel, Tastatur im Menü ⋯. Das gehört in den Browser-Durchgang nach dem Backend.

**Abweichung von der Spec:** Die „kurze Auswahl bei mehreren Dateien“ entfällt (ein Material hat eine Datei, siehe Tech Design). Die Spalte „Regal“ erscheint erst mit PROJ-53.

## Backend-Umsetzung Paket 1 „Ablage“ (2026-10-30)

**Datenbank: Migration liegt bereit, ist aber NICHT angewendet** (der Probelauf an der Produktions-Datenbank wurde nicht freigegeben). `supabase/migrations/20261030_proj52_meine_materialien.sql` (+ `_down`). Sie ist rein additiv, der alte Code läuft damit weiter. **Sie muss vor dem Push angewendet werden**, sonst scheitern alle Werkzeugkiste-Abfragen an den neuen Spalten.
- Neue Spalten in `werkzeug_ablaeufe`: `titel`, `skript_hochgeladen_am` (Start der 12-Monats-Uhr, bestehende Zeilen ab `created_at`), `skript_entfernt_am`, `speicher_bytes`, `hat_antwort` (berechnet, damit die Liste die Antwort nicht laden muss). Vorhanden war keine davon (am 2026-10-30 geprüft; 1 fertiger Ablauf in Produktion).
- `laeuft_ab_am` darf leer sein; fertige Zeilen werden mit der Migration geleert. Ein **Trigger** leert den Termin für `status = 'fertig'` bei jedem Schreiben, egal welcher Code schreibt.
- Derselbe Trigger sperrt `speicher_bytes`, `skript_hochgeladen_am` und `skript_entfernt_am` für den Browser-Schlüssel (`authenticated`); nur der Server-Schlüssel setzt sie. Sonst ließe sich die 2-GB-Grenze umgehen.
- Funktion `wk_speicher_genutzt()` (nur `authenticated`, zählt dank RLS nur eigene Zeilen), zwei Indizes (Liste, 12-Monats-Aufräumen).
- **Zugriffsregeln (RLS) unverändert.**
- **Probelauf:** `scratchpad/probe.sql` (Migration plus Prüfungen, endet mit `RAISE EXCEPTION`, rollt alles zurück) prüft Bestandszeile, Zähler-Schutz für `authenticated`, Schreibrecht für `service_role`, Termin-Regel und Verbrauchsfunktion.

**Routen** (`/api/admin/werkzeugkiste`, alle `requireTeacherOrAdmin`, Zod, eigene Zeilen über RLS):
- `GET /materialien` — schmale Listenzeilen (Pfade ins Ergebnis-JSON statt der Spalte; nie Prompt/Antwort), nur eingelesene Abläufe, Entwürfe zuerst, dann zuletzt bearbeitet; Suche in Titel und Skriptname (Sonderzeichen des Filters entschärft), Werkzeug-Filter, Seiten à 50, `gesamt`/`hatMehr`/Speicherstand.
- `PATCH /ablaeufe/:id` — neu `titel` (1–120 Zeichen, getrimmt, keine Steuerzeichen), nur für fertige Materialien.
- `POST /ablaeufe/:id/kopie` — neuer Ablauf bei Schritt 2; Skript und Einlesung werden im Speicher kopiert, die 12-Monats-Uhr läuft vom ersten Hochladen weiter; 409 bei entferntem Skript, bei Video-Fragen und bei vollem Speicher; räumt auf, wenn das Kopieren scheitert.
- `GET /ablaeufe/:id/antwort` — gespeicherte Antwort als `.yaml`-Anhang (`nosniff`, kein Cache, Dateiname aus dem Titel bereinigt).
- Geändert: `POST /ablaeufe` zählt für die 50er-Bremse nur noch Entwürfe und prüft die Speichergrenze (409 mit Satz „Dein Speicher ist voll …“, **nie nach dem Bauen**; fällt die Abfrage aus, wird nicht gesperrt). `…/bauen` setzt den Titel (KI-Titel; ein von der Lehrkraft geänderter bleibt) und zählt den Speicher neu; `…/einlesen`, Video-Anlage und der (ausgeblendete) direkte Weg ebenso.
- **Tägliche Aufräum-Route:** löscht jetzt nur Entwürfe (`status = 'laeuft'`, nie Material) und entfernt zusätzlich bei fertigen Materialien Skriptdatei und Einlesung 12 Monate nach dem Hochladen (Ergebnis, Antwort, Vorschau bleiben), setzt `skript_entfernt_am` und zählt den Speicher neu. Antwort: `{ geloescht, gefunden, skripteEntfernt }`.

**Abweichung vom Frontend-Vertrag:** `erstelltAm` ist die Anlage des Ablaufs (`created_at`), nicht der Zeitpunkt der Fertigstellung.

**Tests:** `materialien.test.ts` (29: Rollen, Liste mit Suche/Filter/Seiten/schmalen Spalten, Umbenennen, Titel beim Bauen, Speichergrenze, 50er-Bremse, Kopie samt Aufräumen und Uhr, Antwort-Download), `werkzeugkiste-materialien-server.test.ts` (14: Titelregeln, Suchbegriff, 12-Monats-Grenze, Entfernen nur der Skript-Dateien). Bestehende Tests angepasst (Speicher-Abfrage im Mock, Zeitplan). Gesamtsuite 1949 grün, `tsc` und Lint sauber.

**Offen / nicht geprüft**
- Migration anwenden und die Trigger-Regeln an der echten Datenbank prüfen (Probelauf siehe oben). Die Tests laufen mit Mocks; Trigger, `hat_antwort` und die JSON-Pfade im `select` (`ergebnis->>titel` …) sind bisher **nur gelesen, nicht gegen Postgres/PostgREST ausgeführt**.
- Vercel-Zeitplan unverändert (bestehender Eintrag in `vercel.json`).
- Die zwei Hilfen von Paket 2 (Tippfehler, Kapitel neu) fehlen noch.

## QA Test Results – Paket 1 „Ablage“

**Getestet:** 2026-10-30 · **Stand:** Arbeitsverzeichnis auf `main` (noch nicht committet) · Datenbank mit angewendeter Migration
**Tester:** QA Engineer (AI)

### Wie getestet wurde, und was NICHT
Auf Wunsch des Nutzers gilt „kein Dev-Server, kein Playwright“ (beides bringt den Rechner zum Absturz). Es wurde **kein Browser verwendet**. Geprüft wurde:
- Code gegen jedes Akzeptanzkriterium des Pakets 1 (Komponenten, Routen, Migration)
- 1949 Vitest-Tests (darunter 14 + 29 + 13 + 10 neue), Lint (0 Fehler), Produktions-Build, `tsc`
- die Migration an der **echten Produktions-Datenbank, nur lesend**: Spalten, Trigger und Funktion vorhanden; kein fertiges Material mit Ablauftermin; die JSON-Pfade der Listen-Abfrage (`ergebnis->>titel`, `->texte->0->>titel` …) und `hat_antwort` liefern an der vorhandenen Zeile die erwarteten Werte; Supabase-Sicherheitsprüfung ohne Befund zur neuen Funktion oder Tabelle
- Sicherheits-Durchsicht (Zugriff, Eingaben, Header)

**Nicht geprüft (Lücke!):** Aussehen und Bedienung im Browser, Handy-/Tablet-/Desktop-Breite, Chrome/Firefox/Safari, Hell/Dunkel, Tastatur im Menü ⋯, Drag-and-drop. **Der Trigger wurde nicht mit Schreibzugriffen geprüft** (der Probelauf mit Rollback wurde nicht freigegeben); seine Regeln (Termin leeren, Zähler-Schutz) stehen nur im Code und in der Migration. Es gibt im System kein Konto mit der Rolle „Lehrkraft“, die Liste wurde also nie mit echten Daten mehrerer Nutzer durchlaufen. **Kein Playwright-Test geschrieben**, weil er sich hier nicht ausführen lässt (ein ungeprüfter Test wäre wertlos).

### Akzeptanzkriterien Paket 1

| Gruppe | Ergebnis | Bemerkung |
|---|---|---|
| Automatisch speichern (4) | 4 ✅ | Titel aus der KI-Antwort bzw. Skriptname, umbenennbar, Hinweis mit Link in Schritt 5, Überarbeiten ersetzt (dieselbe Zeile). Gespeichert werden Skript, Antwort und Datei (Titel, Einstellungen, Skriptname bestehen in der Zeile). |
| Entwürfe (4) | 4 ✅ | Kennzeichnung samt Stand, „Fortsetzen“ öffnet am weitesten Schritt, Entwurf wird per Fertigstellung zum Material, „wird morgen gelöscht“ ab dem vorletzten Tag. 7-Tage-Löschung per Zeitplan (nur Entwürfe). |
| Liste (7) | 6 ✅ · 1 ➖ | Tabelle/Karten, Sortierung, Suche, Filter, Seiten à 50, Leerzustand mit Hauptaktion nur dort. ➖ Spalte „Regal“ erst mit PROJ-53 (vorgesehen). |
| Aktionen je Material (5) | 4 ✅ · 1 ⚠️ | Menü vollständig, Löschen nur nach `AlertDialog` mit Toast. ⚠️ Teil „mehrere Dateien: kurze Auswahl“ entfällt bewusst (ein Material = eine Datei, siehe Tech Design); ➖ Regal-Hinweis im Lösch-Dialog erst mit PROJ-53. „Überarbeiten“ öffnet Schritt 4 mit der Antwort; die zwei Hilfen (Tippfehler, Kapitel neu) sind **Paket 2**. |
| Aufbewahrung 12 Monate (2) | 2 ✅ | Zeitplan entfernt Skript und Einlesung fertiger Materialien (Ergebnis, Antwort, Vorschau bleiben); „Skript entfernt“-Hinweis in der Zeile; Überarbeiten und anderes Werkzeug ausgegraut (Entscheidung 2026-10-30). |
| Sichtbarkeit (2) | 2 ✅ | Nur eigene Zeilen (RLS plus `owner_id`), fremde Aufrufe 404 (Tests). |

### Randfälle
- ✅ Speichergrenze 2 GB (Start abgelehnt mit Satz, nie nach dem Bauen; Ausfall der Abfrage sperrt nicht), Hinweis ab 90 %.
- ✅ Kopie mit Aufräumen bei Fehler, entferntem Skript, Video-Fragen, vollem Speicher; 12-Monats-Uhr läuft von der ersten Hochladung weiter.
- ✅ Abgebrochener Upload erscheint nicht in der Liste (nur eingelesene Abläufe).
- ✅ Gleicher Titel mehrfach erlaubt; Titel mit Steuerzeichen, leer oder zu lang abgelehnt.
- ➖ Zwei Tabs (Hinweis beim Ersetzen): **Paket 2**.
- ➖ Konto löschen: Dateien müssen von PROJ-60 mitgelöscht werden (dort zu vermerken).

### Bugs
| ID | Schwere | Beschreibung |
|---|---|---|
| BUG-1 | Medium | **Fehlende Datei beim Herunterladen:** „Herunterladen“ ist ein Link auf die Download-Route. Fehlt die Datei im Speicher, antwortet die Route mit 404-JSON bzw. der Speicher mit einer JSON-Fehlerseite. Die Spec verlangt den ruhigen Satz „Die Datei ist nicht mehr vorhanden. Über Überarbeiten neu erstellen.“, ohne technischen Fehler. Die Oberfläche fängt das nicht ab. Kein Blocker (tritt nur bei verlorenen Dateien auf), Nachbesserung vor oder mit Paket 2. |
| BUG-2 | Low | Nach „Überarbeiten“ speichert die Prüfung die neue Antwort sofort, die Datei bleibt bis zum Neubau die alte. „KI-Antwort herunterladen“ kann dann von der Datei abweichen. Im Tech Design so vorgesehen, Paket 2 kann es mit der Zwei-Tabs-Regel klären. |
| BUG-3 | Low | „Erstellt“ zeigt die Anlage des Ablaufs, nicht die Fertigstellung (kein eigenes Feld). Bei Entwürfen, die Tage liegen, steht ein früheres Datum als das Fertigstellen. |
| BUG-4 | Low | Die Liste hat keine Begrenzung der Anfragen pro Zeit (nur Lehrer-Rolle und 50 Zeilen je Seite). Bei etwa 20 Lehrkräften unkritisch. |

### Sicherheit (Red Team)
- ✅ **Zugriff:** Jede Route prüft zuerst die Lehrer-Rolle; Zeilen nur über RLS (plus `owner_id`); fremde IDs liefern 404. Die Kopie arbeitet nur zwischen Ordnern derselben Lehrkraft.
- ✅ **Zähler-Schutz:** Speichergröße und Skript-Zeitpunkte sind für den Browser-Schlüssel per Trigger gesperrt (nur im Code/Migration belegt, nicht per Schreibtest).
- ✅ **Eingaben:** Zod auf Suche (Länge, Zeichen entschärft für den Filter), Werkzeug (nur bekannte), Seite/Größe (Grenzen), Titel (Länge, keine Steuerzeichen). Titel werden von React als Text angezeigt (kein HTML).
- ✅ **Antwort-Download:** `Content-Disposition: attachment`, `nosniff`, `no-store`, Dateiname aus dem Titel bereinigt (kein Header-Einschleusen).
- ✅ **Datenschutz:** Die Liste lädt nie Prompt oder Antwort; Skripte werden nach 12 Monaten entfernt.
- ✅ **Geheimnisse:** keine neuen Umgebungsvariablen; Zeitplan weiterhin durch `CRON_SECRET` geschützt.

### Regression
Gesamtsuite 1949 grün (vorher 1906); Produktions-Build, `tsc`, Lint (0 Fehler) sauber. Angepasst wurden nur der Zeitplan-Test, die Speicher-Abfrage in zwei Mock-Setups und ein Text in Schritt 5. PROJ-51/54 (Ablauf, alle freigeschalteten Werkzeuge) sind per Tests grün; die Schritt-5-Ansicht wurde nur per Komponententest geprüft.

### Entscheidung
**Keine Critical/High-Fehler → Paket 1 produktionsreif, Status Approved.** Vor dem Live-Gang schon erledigt: Migration angewendet. Nach dem Deploy steht ein Browser-/Handy-Durchgang durch den Nutzer aus (Liste, Menü ⋯, Umbenennen, Löschen, „Fortsetzen“, „anderes Werkzeug“).

## Deployment

### Paket 1 „Ablage“ – 2026-10-30
- **Datenbank** zuerst: Migration `20261030_proj52_meine_materialien` vom Nutzer im Supabase-Dashboard angewendet (der Probelauf mit Rollback war nicht freigegeben). Danach lesend geprüft: Spalten, Trigger und Funktion vorhanden, kein fertiges Material mit Ablauftermin.
- **App** per Push auf `main` (`b5e3d3a`), Production „Ready“ (https://spedilern.vercel.app). Es ging nur dieser eine Commit hinaus. Kern (Python) unverändert, keine neuen Umgebungsvariablen, Zeitplan-Eintrag in `vercel.json` unverändert.
- Ohne Login: `GET /materialien` 401, `GET …/antwort` 401, `POST …/kopie` 401, Zeitplan-Route 401, Seite leitet auf die Anmeldung um (307).
- Tag: `v1.52.0-PROJ-52-paket1`.
- **Noch offen:** Browser-/Handy-Durchgang durch den Nutzer (Liste, Suche, Menü ⋯, Umbenennen, Löschen, „Fortsetzen“, „Gleiches Skript, anderes Werkzeug“, Schließen mit ✕); Trigger-Regeln mit Schreibzugriff prüfen; BUG-1 (Hinweis bei fehlender Datei); Paket 2 „Überarbeiten“ (Tippfehler, Kapitel neu, Zwei-Tabs-Warnung). Das Feature bleibt bis dahin „In Progress“.
