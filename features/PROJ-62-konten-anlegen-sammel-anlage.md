# PROJ-62: Konten anlegen & Sammel-Anlage per CSV (Super-Admin)

## Status: Architected
**Created:** 2026-10-27
**Last Updated:** 2026-11-05

## Kontext
Konten entstehen heute nur durch Selbst-Registrierung. Zu Schuljahresbeginn kostet das eine Unterrichtsstunde: Mails kommen nicht an, Adressen sind falsch geschrieben, Azubis landen im falschen Bereich. Der Super-Admin soll Konten vorab anlegen und den Azubis Zugangsdaten auf Papier geben können.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1:** **Nur Super-Admin.**
- **E2:** Erstes Passwort **wie beim Zurücksetzen** (PROJ-58): lesbarer Vorschlag oder selbst getippt, Pflichtwechsel beim ersten Login. Keine Einladungs-Mail.
- **E3:** Bei der CSV-Anlage gibt es eine **Liste zum Ausdrucken/Verteilen** mit den Zugangsdaten.

## Dependencies
- Requires: PROJ-58 (Passwort-Vorschlag und Pflichtwechsel), PROJ-22/23 (Fachbereiche und Zuordnung), PROJ-44 (Rollen, Pseudonym für Lehrkräfte)
- Berührt: PROJ-28 (Druck-Stil für Papier-Ansichten)

## User Stories
- Als **Super-Admin** möchte ich ein einzelnes Konto mit Name, E-Mail, Rolle und Bereich anlegen, damit eine Person ohne Registrierung starten kann.
- Als **Super-Admin** möchte ich eine CSV-Liste mit vielen Azubis hochladen und alle auf einmal anlegen, damit ein ganzer Jahrgang in Minuten startklar ist.
- Als **Super-Admin** möchte ich vor dem Anlegen eine Vorschau mit Fehlern sehen, damit ich falsche Zeilen korrigieren kann.
- Als **Super-Admin** möchte ich danach Zugangszettel drucken (pro Person ein Abschnitt zum Ausschneiden), damit ich sie im Unterricht verteilen kann.
- Als **Azubi** möchte ich mit dem Zettel einloggen und gleich ein eigenes Passwort festlegen.

## Acceptance Criteria

### Einzeln anlegen
- [ ] Im Seitenkopf der Nutzerliste: „Konto anlegen“ (grüne Hauptaktion, nur Super-Admin) mit einem Menü: „Einzeln“ · „Aus CSV-Liste“.
- [ ] Formular: Anzeigename (Pflicht), E-Mail (Pflicht, gültiges Format), Rolle (Standard Azubi), Fachbereich (Pflicht, Vorschlag anhand der E-Mail-Domain wie bei der Registrierung), Start-Passwort (Vorschlag, änderbar, mind. 8 Zeichen).
- [ ] Das Konto gilt als **bestätigt** (keine Bestätigungsmail) und ist mit Pflichtwechsel markiert (PROJ-58).
- [ ] Danach zeigt der Dialog die Zugangsdaten (E-Mail, Passwort, App-Adresse) mit „Kopieren“ und „Zettel drucken“. Der Hinweis lautet wie in PROJ-58: Das Passwort ist später nicht mehr abrufbar.
- [ ] Lehrkraft- oder Admin-Rolle: Pseudonym wird automatisch angelegt (wie beim Rollenwechsel).

### Sammel-Anlage per CSV
- [ ] Upload einer CSV- oder Excel-CSV-Datei (Komma oder Semikolon, UTF-8 oder Windows-1252) mit den Spalten `Name; E-Mail` und optional `Bereich; Rolle`. Es gibt eine Vorlage zum Herunterladen.
- [ ] Ohne Bereich-Spalte wählt der Super-Admin einen Bereich für alle Zeilen. Ohne Rolle-Spalte gilt „Azubi“.
- [ ] **Vorschau-Tabelle** vor dem Anlegen: jede Zeile mit Status „OK“, „Warnung“ oder „Fehler“ und Begründung:
  - Fehler: E-Mail ungültig, E-Mail doppelt in der Datei, Name leer, Bereich unbekannt, Rolle unbekannt.
  - Warnung: E-Mail hat schon ein Konto. Die Zeile wird übersprungen, das bestehende Konto bleibt unverändert.
- [ ] „{n} Konten anlegen“ legt nur die OK-Zeilen an. Fehlerzeilen werden nicht angelegt.
- [ ] Höchstens 300 Zeilen pro Datei. Darüber erscheint die Meldung „Bitte in mehrere Dateien teilen“.
- [ ] Jedes Konto bekommt einen eigenen Passwort-Vorschlag (nicht änderbar in der Sammel-Anlage).
- [ ] Nach dem Anlegen erscheint die Ergebnisseite mit:
  - **Zugangszettel drucken:** A4, pro Person ein Abschnitt mit App-Adresse, E-Mail, Start-Passwort und dem Satz „Beim ersten Login legst du ein eigenes Passwort fest.“ Mit Schnittlinien, weiß auf Papier (Ausnahme laut DESIGN.md).
  - **Liste als CSV** (Name, E-Mail, Start-Passwort) zum Herunterladen.
  - Hinweis: „Diese Seite ist die einzige Gelegenheit, die Passwörter zu sehen. Drucke oder speichere sie jetzt.“ Beim Verlassen fragt ein Dialog nach („Zugangsdaten wirklich verwerfen?“).
- [ ] Protokoll: ein Eintrag `user.create` pro Konto (ohne Passwort) und ein Eintrag `user.bulk_create` mit Anzahl angelegt, übersprungen und fehlerhaft.

### Rechte
- [ ] Nur Super-Admin. Die Route lehnt alle anderen mit 403 ab.
- [ ] Über die Sammel-Anlage dürfen nur die Rollen Azubi und Lehrkraft angelegt werden. Admin-Rollen gibt es nur einzeln und mit Bestätigung.

## Edge Cases
- Die E-Mail existiert schon (auch gesperrt): Das Konto wird nicht angelegt, und das bestehende bleibt unverändert. Die Meldung lautet: „Konto existiert schon – Passwort ggf. über ‚Passwort neu vergeben‘ setzen.“
- Die Domain passt zu keinem Bereich und es ist kein Bereich gewählt: Fehler in der Zeile.
- Der Upload bricht nach der Hälfte ab: Bereits angelegte Konten bleiben. Die Ergebnisseite zeigt die angelegten Konten mit Passwörtern und die fehlenden zum erneuten Hochladen. Doppelte werden beim zweiten Versuch als „existiert schon“ übersprungen.
- Die Datei hat eine Kopfzeile in anderer Reihenfolge oder mit anderer Schreibweise („e-mail“, „Mail“): Die Spalten werden anhand der Kopfzeile erkannt. Ist das nicht eindeutig, weist der Super-Admin sie in der Vorschau zu.
- Leere Zeilen und Leerzeichen am Rand werden ignoriert. E-Mails werden klein geschrieben.
- Die Person registriert sich selbst, bevor sie den Zettel bekommt: Die Registrierung scheitert, weil die E-Mail vergeben ist. Die normale Meldung verweist auf „Passwort vergessen“.
- Druck mit sehr vielen Personen: höchstens 8 Zettel pro A4-Seite, mit sauberen Seitenumbrüchen.

## Technical Requirements (optional)
- Security: Anlegen nur serverseitig mit Service-Rolle und Super-Admin-Prüfung. Passwörter nur in der Antwort an den anlegenden Admin, nie in Logs oder Datenbank-Klartext.
- Rate-Limit: höchstens 3 Sammel-Anlagen pro Stunde.
- Datenschutz: Die hochgeladene Datei wird nicht gespeichert, sie wird nur im Speicher verarbeitet.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Stand:** 2026-11-05 · **Backend nötig:** ja (Konten anlegen geht nur auf dem Server), **neue Datenbank-Tabelle:** nein

### Abweichung von der Spec (bitte bestätigen)
Die Spec schlägt den Bereich „anhand der E-Mail-Domain wie bei der Registrierung“ vor. Die Registrierung ordnet aber nach der **Web-Adresse der App** zu, nicht nach der E-Mail. Eine Zuordnung nach E-Mail-Domain gibt es nicht. Deshalb gilt: **Der Super-Admin wählt den Bereich immer selbst** (beim Einzelkonto im Formular, bei der Liste einmal für alle oder je Zeile in der CSV). Voreingestellt ist der Bereich, in dem der Super-Admin gerade arbeitet (PROJ-29, Bereichs-Umschalter).

### A) Oberfläche (Baumstruktur)
```
Nutzerliste (bestehende Seite)
+-- Seitenkopf
|   +-- „Konto anlegen“ (grün, nur Super-Admin) mit Menü
|       +-- „Einzeln“
|       +-- „Aus CSV-Liste“
|
+-- Dialog „Konto anlegen“ (einzeln)
|   +-- Formular: Name, E-Mail, Rolle, Bereich, Start-Passwort (Vorschlag, änderbar)
|   +-- Bestätigung bei Admin-Rollen
|   +-- Ergebnis: Zugangsdaten mit „Kopieren“ und „Zettel drucken“
|
+-- Neue Seite „Konten aus Liste anlegen“ (3 Schritte)
|   +-- 1. Datei wählen
|   |   +-- Vorlage herunterladen
|   |   +-- Bereich für alle Zeilen (wenn die Datei keinen enthält)
|   +-- 2. Vorschau
|   |   +-- Zusammenfassung: x OK · y Warnungen · z Fehler
|   |   +-- Tabelle: Zeile, Name, E-Mail, Bereich, Rolle, Status, Begründung
|   |   +-- Spalten-Zuordnung (nur wenn die Kopfzeile unklar ist)
|   |   +-- Knopf „{n} Konten anlegen“
|   +-- 3. Ergebnis (einmalig sichtbar)
|       +-- Warnhinweis: einzige Gelegenheit, Passwörter zu sehen
|       +-- „Zugangszettel drucken“ · „Liste als CSV“
|       +-- Liste der nicht angelegten Zeilen zum erneuten Hochladen
|       +-- Rückfrage beim Verlassen der Seite
|
+-- Druckansicht „Zugangszettel“ (A4, hell auf weiß, 8 Zettel je Seite, Schnittlinien)
```
Im Stil von `/admin` (DESIGN.md): Tokens `ws-*`, Bedienelemente mindestens 44 px, nur eine grüne Hauptaktion je Seite. Die Druckansicht ist die erlaubte Papier-Ausnahme und folgt dem Muster der Leistungsnachweis-Bögen (PROJ-28).

### B) Daten
Es kommt **keine neue Tabelle** dazu. Jedes Konto besteht aus dem, was die Registrierung ohnehin anlegt:
- Anmeldekonto (E-Mail, Passwort, als **bestätigt** markiert, Merker „Passwort beim ersten Login ändern“)
- Profil (Anzeigename, Rolle, Bereich, bei Lehrkraft/Admin ein Pseudonym)

**Wird nicht gespeichert:** die hochgeladene Datei und die Start-Passwörter im Klartext. Passwörter gibt es nur in der Antwort an den anlegenden Super-Admin und danach nicht mehr. Die Ergebnisseite hält sie nur im Arbeitsspeicher des Browsers (kein Zwischenspeicher, kein Cookie).

**Protokoll (bestehendes Änderungsprotokoll):**
- ein Eintrag „Konto angelegt“ je Konto (ohne Passwort)
- ein Eintrag „Sammel-Anlage“ mit Anzahl angelegt, übersprungen und fehlerhaft

### C) Ablauf der Sammel-Anlage
1. **Einlesen im Browser:** Die Datei wird im Browser gelesen (Komma oder Semikolon, UTF-8 oder Windows-1252, Spalten an der Kopfzeile erkannt). Sie verlässt den Rechner nicht.
2. **Prüfen auf dem Server:** Der Browser schickt nur die erkannten Zeilen. Der Server prüft Namen, E-Mail-Format, Dubletten in der Datei, Bereich und Rolle und fragt ab, welche E-Mails schon ein Konto haben. Das Ergebnis ist die Vorschau. Es wird noch nichts angelegt.
3. **Anlegen:** Erst der Klick auf „{n} Konten anlegen“ legt die OK-Zeilen an. Der Server prüft dabei alles **noch einmal**, weil zwischen Vorschau und Klick jemand ein Konto angelegt haben kann. Passwörter erzeugt der Server selbst (derselbe Vorschlags-Generator wie bei PROJ-58).
4. **Abbruch mittendrin:** Bereits angelegte Konten bleiben. Die Antwort enthält alle angelegten Konten mit Passwort und die fehlenden Zeilen. Beim erneuten Hochladen werden die schon vorhandenen als „existiert schon“ übersprungen.
5. **Große Listen:** Bis 300 Zeilen. Der Server arbeitet sie in kleinen Päckchen ab, damit die Zeitgrenze von Vercel nicht reißt. Der Browser zeigt einen Fortschrittsbalken.

### D) Technische Entscheidungen (mit Begründung)
| Entscheidung | Warum |
|---|---|
| **Wiederverwenden statt neu bauen:** Passwort-Vorschlag, Pflichtwechsel-Merker, Pseudonym-Anlage, Änderungsprotokoll, CSV-Hilfen und Druck-Stil gibt es schon (PROJ-58/61/28/44) | Weniger neuer Code, gleiches Verhalten wie überall sonst, schon getestet |
| **Vorschau und Anlegen sind zwei getrennte Server-Schritte** | Nichts wird angelegt, bevor der Super-Admin die Fehler gesehen hat. Die zweite Prüfung beim Anlegen fängt Wettläufe ab. |
| **Nur Super-Admin, serverseitig geprüft** | Die Oberfläche blendet die Aktion für andere aus. Die eigentliche Sperre ist der Server (403). |
| **Sammel-Anlage nur Azubi und Lehrkraft** | Wer Admin-Rechte vergibt, soll das einzeln und bewusst tun, mit Bestätigung. |
| **Höchstens 3 Sammel-Anlagen pro Stunde** | Gezählt im Änderungsprotokoll, wie das Limit bei PROJ-58. Das braucht keine neue Technik. |
| **Passwörter nie in Logs, Protokoll oder Datenbank-Klartext** | Datenschutz. Die Ergebnisseite ist deshalb einmalig, mit Rückfrage beim Verlassen. |
| **Keine Einladungs-Mail** | Entscheidung E2. Das vermeidet falsch geschriebene oder nicht ankommende Adressen. |
| **Bereich immer ausdrücklich wählen** | Siehe Abweichung oben. Verhindert Azubis im falschen Bereich. |

### E) Neue Bausteine (Überblick, ohne Code)
- **Server:** eine Aktion „Einzelnes Konto anlegen“, eine „Liste prüfen“ (Vorschau), eine „Liste anlegen“
- **Gemeinsame Logik:** CSV einlesen und Spalten erkennen, Zeilen prüfen, Zugangsliste als CSV
- **Oberfläche:** Menü im Seitenkopf, Dialog „Einzeln“, Seite „Aus Liste“ mit drei Schritten, Druckansicht der Zugangszettel
- **Tests:** Einlesen und Prüfen (Randfälle aus der Spec), Rechte (403 für alle außer Super-Admin), Wiederholung nach Abbruch, Passwörter nie im Protokoll

### F) Pakete
Keine neuen Pakete. Die vorhandenen CSV-Hilfen aus PROJ-61 werden erweitert, und die Zeichensatz-Erkennung (Windows-1252) läuft über die Standard-Funktionen des Browsers.

### G) Abhängigkeiten und Risiken
- **Voraussetzungen sind alle live:** PROJ-58, PROJ-22/23, PROJ-44
- **Zeitgrenze:** 300 Konten in einem Aufruf könnten zu lang dauern. Darum die kleinen Päckchen. Das wird mit einer echten 300er-Datei geprüft.
- **Mehrere Bereiche in einer Datei:** Eine Bereichs-Spalte (Kürzel oder Name) ist erlaubt. Unbekannte Werte sind Zeilenfehler.


## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
