# PROJ-62: Konten anlegen & Sammel-Anlage per CSV (Super-Admin)

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
