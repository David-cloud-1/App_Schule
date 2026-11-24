# PROJ-62: Konten anlegen & Sammel-Anlage per CSV (Super-Admin)

## Status: Approved
**Created:** 2026-10-27
**Last Updated:** 2026-11-24 (Frontend und Backend gebaut, QA steht aus)

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


## Implementation Notes – Frontend (2026-11-24)

**Stand:** Oberfläche, Einlese-Logik und Druckansicht sind gebaut und getestet. Die Schnittstellen sind mit dem Backend dazugekommen (siehe unten). Nicht im Browser geprüft, nichts deployt.

### Was gebaut wurde
- **`src/lib/account-create.ts`** (reine Logik, Tests: 26): Typen der Schnittstellen, CSV einlesen (Komma/Semikolon, UTF-8 oder Windows-1252, BOM), Spalten an der Kopfzeile erkennen (Name, E-Mail, Bereich, Rolle; „e-mail“, „Mail“ u. ä.), Zeilen für den Server aufbereiten (E-Mail klein, Leerzeichen weg, Dateizeile mitgeführt), 300-Zeilen-Grenze, Päckchen à 25, Zugangsliste als CSV (Name entschärft gegen Excel-Formeln, Passwort unverändert), Vorlage, Wiederholungsliste.
- **`create-account-menu.tsx`**: „Konto anlegen“ (grüne Hauptaktion, nur Super-Admin) im Kopf der Nutzerliste mit „Einzeln“ und „Aus CSV-Liste“; der Export bleibt als ruhiger Button daneben.
- **`create-account-dialog.tsx`**: Formular (Name, E-Mail, Rolle als Segment Azubi/Lehrkraft/Super-Admin, Bereich, Start-Passwort mit Vorschlag), Bestätigungs-Häkchen bei Super-Admin (wird beim Rollenwechsel zurückgenommen), danach Zugangsdaten mit „Kopieren“ und „Zettel drucken“.
- **`bulk-account-import.tsx`** + Seite **`/admin/users/aus-liste`** (nur Super-Admin, sonst Umleitung wie bei der Nutzer-Detailseite): drei Schritte – Datei wählen (Vorlage, Bereich für alle bzw. für Zeilen ohne eigene Angabe, Spalten-Zuordnung nur bei unklarer Kopfzeile) → Vorschau (Zähler, Tabelle mit Status OK/Warnung/Fehler mit Symbol und Begründung) → Ergebnis (Passwörter, „Zugangszettel drucken“, „Liste als CSV“, „Nicht angelegte Zeilen als CSV“, Fehlerliste).
- **`access-slips.tsx`**: Zugangszettel, 8 je A4-Seite (2 × 4), gestrichelte Schnittlinien, weiß auf Papier. Sie entstehen nur im Browser aus den Daten im Arbeitsspeicher (keine Druckadresse, keine URL mit Passwort). `globals.css` blendet beim Drucken alles außer den Zetteln aus.
- Tests: Bibliothek 26, Dialog 8, Zettel 5, Sammel-Seite 12, Zugangs-Wächter der Seite 5, Nutzerliste +4. Typprüfung, ESLint und `npm run build` sind sauber.

### Entscheidungen und Abweichungen (bitte prüfen)
1. **Bereich immer ausdrücklich gewählt** (Abweichung aus dem Tech Design, vom Nutzer bestätigt am 2026-11-24): Voreinstellung ist der aktuelle Bereich der Bereichsleiste; es gibt keine Zuordnung nach E-Mail-Domain.
2. **Rollen:** einzeln Azubi, Lehrkraft, Super-Admin (mit Bestätigung); „Bereichs-Admin“ wird nicht mehr angeboten, weil PROJ-127 die Rolle überflüssig gemacht hat. In der Sammel-Anlage nur Azubi und Lehrkraft; ein Rollenwort „Super-Admin“ in der Datei ist ein Zeilenfehler.
3. **Päckchen:** Der Browser sendet die OK-Zeilen in Päckchen zu je 25 mit gemeinsamer `batchId`, `batchIndex` und `batchCount`. Bei einem Fehler oder Verbindungsabbruch stoppt er; bisher Angelegtes bleibt, die übrigen Zeilen gibt es als „Nicht angelegte Zeilen als CSV“.
4. **Verlassen-Schutz:** Beim Ergebnis fragt „Fertig“ bzw. „Zur Nutzerliste“ nach („Zugangsdaten wirklich verwerfen?“), und `beforeunload` warnt beim Neuladen oder Tab-Schließen. **Grenze:** Ein Klick in die Seitenleiste (App-interne Navigation) lässt sich im App Router nicht abfangen; dort gehen die Passwörter ohne Rückfrage verloren.
5. **Passwörter in der CSV** werden bewusst nicht gegen Formeln entschärft (sonst stimmt das Passwort nicht); erzeugte Passwörter beginnen immer mit einem Buchstaben.
6. Die Vorlage wird mit Semikolon und BOM erzeugt (deutsches Excel).

### Vertrag für `/backend` (Schnittstellen, noch zu bauen)
Alle drei prüfen **selbst** mit `requireSuperAdmin` (das Tor der Lehrkraft-Freigabeliste lässt `/api/admin/users/**` für Lehrkräfte durch). Fehler als `{ error: "…" }` mit passendem Status; die Meldung steht dem Super-Admin 1:1 im Dialog.

| Aufruf | Anfrage | Antwort |
|---|---|---|
| `POST /api/admin/users/create` | `{ name, email, role: student\|teacher\|admin, departmentId, password }` | `{ account: { name, email, password, role, departmentName } }`; 409 „Konto existiert schon – Passwort ggf. über ‚Passwort neu vergeben‘ setzen.“ |
| `POST /api/admin/users/create/preview` | `{ rows: [{ line, name, email, department, role }], defaultDepartmentId \| null }` | `{ rows: [{ line, name, email, departmentId, departmentName, role: student\|teacher\|null, status: ok\|warning\|error, reason }] }`, legt nichts an |
| `POST /api/admin/users/create/bulk` | wie Vorschau, dazu `batchId`, `batchIndex`, `batchCount` | `{ created: [{ line, name, email, password, role, departmentName }], failed: [{ line, name, email, reason }] }`; jedes Konto neu prüfen, Passwörter serverseitig mit demselben Generator wie PROJ-58 |

Hinweise für den Server: `department` aus der Datei ist Kürzel oder Name (leer → `defaultDepartmentId`); Rollenwörter über `parseBulkRole` aus der Bibliothek (leer = Azubi, sonst Zeilenfehler); höchstens 25 Zeilen je Päckchen und 300 je `batchId`; das Limit „3 Sammel-Anlagen pro Stunde“ zählt **verschiedene `batchId`**, nicht Aufrufe; Protokoll `user.create` je Konto (ohne Passwort) und `user.bulk_create` je Sammel-Anlage; Konto als bestätigt anlegen, Pflichtwechsel-Merker setzen, Pseudonym bei Lehrkraft/Admin; die hochgeladene Datei kommt nie an (nur Zeilen).

## Implementation Notes – Backend (2026-11-24)

**Stand:** Drei Schnittstellen gebaut und getestet. **Keine Migration nötig**, keine neue Tabelle, keine neue Rechte-Regel. Nicht deployt.

### Schnittstellen
| Route | Was sie tut |
|---|---|
| `POST /api/admin/users/create` | Ein Konto: prüft Eingaben (Zod), Bereich aktiv, legt an, gibt `{ account }` mit Start-Passwort und Bereichs-Adresse zurück. 409 bei vorhandener E-Mail. |
| `POST /api/admin/users/create/preview` | Prüft bis 300 Zeilen gegen Bereiche und vorhandene Konten, legt nichts an. Schreibt einen Protokolleintrag „Konten-Liste geprüft“ nur mit Zahlen. |
| `POST /api/admin/users/create/bulk` | Ein Päckchen (≤ 25 Zeilen): prüft jede Zeile erneut, legt die OK-Zeilen mit je eigenem Server-Passwort an (5 gleichzeitig), meldet `created` und `failed`. Das letzte Päckchen schreibt „Konten aus Liste angelegt“. |

### Wie ein Konto entsteht (`create/_lib/create-account.ts`)
1. `auth.admin.createUser` mit `email_confirm: true` (keine Mail), Name in `user_metadata.full_name`, Pflichtwechsel-Merker in `app_metadata` (wie PROJ-58).
2. Den Profil-Datensatz legt der bestehende Datenbank-Trigger `on_auth_user_created` an (Rolle Azubi). Danach werden Rolle, Bereich und Anzeigename gesetzt. Weil der Bereich jetzt feststeht, ändert die Zuordnung nach Adresse beim ersten Login (`assignDepartmentIfMissing`) nichts mehr.
3. Protokoll `user.create` (Rolle, Bereichskürzel, bei Sammel-Anlage `batch_id`; **kein Passwort, keine E-Mail**) über `writeAuditLogStrict`.
4. Lehrkraft und Super-Admin bekommen ein Pseudonym (`ensurePseudonym`, PROJ-44).
5. **Rücknahme:** Scheitert Schritt 2 oder 3, wird das Konto sofort wieder gelöscht. Es bleibt kein halbes Konto und keines ohne Protokoll.

### Sicherheit und Grenzen
- Alle drei Routen prüfen selbst `requireSuperAdmin` (die Lehrkraft-Freigabeliste lässt `/api/admin/users/**` durch; Lehrkräfte bekommen hier 403, getestet).
- Passwörter erscheinen nur in der Antwort. Fehler-Logs enthalten nur Fehlercodes. Tests prüfen, dass weder Protokoll noch Antwort im Fehlerfall das Passwort enthalten.
- **Limit „3 Sammel-Anlagen pro Stunde“:** gezählt werden verschiedene `batch_id` in den `user.create`-Einträgen der letzten Stunde. Eine schon laufende Anlage darf fertig werden. Höchstens 300 Konten je `batch_id`, 25 je Aufruf, 12 Päckchen. Dazu gilt das allgemeine Limit im Proxy (120 schreibende Aufrufe pro Minute).
- Sammel-Anlage nur Azubi und Lehrkraft; „Admin“, „Super-Admin“, „Bereichs-Admin“ in der Rollen-Spalte sind Zeilenfehler („Admin-Rollen nur einzeln anlegen.“).
- Vorhandene E-Mails (auch gesperrte Konten) kommen aus `auth.admin.listUsers` (seitenweise, wie die Nutzerliste). Bei vielen tausend Konten wäre das der erste Ort zum Beschleunigen.

### Abweichungen und Ergänzungen
- **Adresse auf dem Zettel je Bereich:** Hat ein Bereich eine eigene Domain, steht diese auf dem Zettel (`appUrl`), sonst die aktuelle Adresse. So landen Tourismus-Azubis gleich auf ihrer Seite, falls Tourismus eine eigene Adresse hat.
- **Protokoll der Vorschau** (`user.bulk_preview`): nicht in der Spec. Der Wächtertest aus PROJ-127 verlangt für jede schreibende Verwaltungs-Route einen Eintrag, und die Vorschau verrät, welche E-Mails ein Konto haben. Nur Zahlen, keine Adressen.
- **Zahlen in „Konten aus Liste angelegt“:** „angelegt“ zählt der Server. „Übersprungen“ und „fehlerhaft“ stammen aus der Vorschau im Browser, weil diese Zeilen den Server beim Anlegen nie erreichen. Bricht eine Sammel-Anlage vor dem letzten Päckchen ab, fehlt dieser Sammel-Eintrag; die `user.create`-Einträge stehen trotzdem.
- **Lehrkräfte** werden mit dem Anzeigenamen angelegt; Vor- und Nachname fragt PROJ-121 beim ersten Login ab.
- Neue Protokoll-Bezeichnungen: „Konto angelegt“, „Konten aus Liste angelegt“, „Konten-Liste geprüft“ (Änderungsprotokoll), „Konto angelegt“ (Nutzer-Detailseite).

### Tests
- Prüfregeln 18, Einzel-Anlage 18, Vorschau 7, Sammel-Anlage 14 (Rechte 401/403, Eingaben 400, Erfolgsfall, Rücknahme, Limits, erneute Prüfung, Protokoll ohne Passwort).
- Gesamte Suite: 4632 von 4633 grün. Der eine Fehler (`werkzeugkiste-auszug.test.ts`, „nennt die Urheberin …“) hat mit PROJ-62 nichts zu tun; Datei und Test sind seit 2026-11-13 unverändert.
- Typprüfung, ESLint und `npm run build` sauber.

## QA Test Results

**Tested:** 2026-11-24 · **Stand:** Commit 0e478ac · **Tester:** QA Engineer (AI, Opus)
**Methode:** Code-Prüfung aller Kriterien, Red-Team-Analyse, lesende Abfragen an der Produktions-Datenbank (Trigger, Rollen-Regel, Bereiche), automatische Tests. **Kein Browser-Test und kein Playwright:** Dev-Server und Playwright bringen den Rechner zum Absturz (Projektregel). Cross-Browser, Responsive und Druckbild sind deshalb **nicht geprüft**.

### Datenbank-Befunde (lesend, Produktion)
- `on_auth_user_created` legt das Profil mit Rolle Azubi an; `trg_assign_pseudonym` vergibt beim Anlegen jedes Profils ein Pseudonym (alle 175 Azubis haben eines). Neue Konten erscheinen in der Rangliste also nie mit Klarnamen.
- `profiles_name_schutz` (PROJ-121) greift nur für `authenticated`, nicht für den Service-Zugang: Das Setzen des Anzeigenamens beim Anlegen funktioniert.
- Rollen-Regel erlaubt `student`, `teacher`, `admin`, `department_admin`. `prevent_last_admin_change` stört die Rücknahme eines frisch angelegten Super-Admins nicht.
- Bereiche: SPED → `spedilern.vercel.app`, TOUR → `touristiklern.vercel.app`; die Zettel-Adresse je Bereich stimmt.

### Acceptance Criteria Status

#### AC-1: Einzeln anlegen
- [x] „Konto anlegen“ (grün, nur Super-Admin) mit „Einzeln“ und „Aus CSV-Liste“ (Test: Lehrkraft und Bereichs-Admin sehen es nicht)
- [x] Formular mit Pflichtfeldern, E-Mail-Prüfung, Rolle Standard Azubi, Start-Passwort mit Vorschlag (≥ 8 Zeichen)
- [x] Bereich: wird ausdrücklich gewählt (bestätigte Abweichung statt E-Mail-Domain)
- [x] Konto bestätigt, ohne Mail, mit Pflichtwechsel-Merker (gleicher Weg wie PROJ-58)
- [x] Zugangsdaten mit „Kopieren“, „Zettel drucken“ und Hinweis „später nicht mehr abrufbar“
- [x] Lehrkraft/Super-Admin: Pseudonym (Trigger + `ensurePseudonym`)

#### AC-2: Sammel-Anlage per CSV
- [x] Komma/Semikolon, UTF-8/Windows-1252, Vorlage zum Herunterladen
- [x] Ohne Bereich-Spalte ein Bereich für alle, ohne Rolle-Spalte Azubi
- [x] Vorschau mit OK/Warnung/Fehler und Begründung (alle fünf Fehlerarten, „existiert schon“ als Warnung)
- [x] „{n} Konten anlegen“ legt nur OK-Zeilen an; Server prüft erneut
- [x] Höchstens 300 Zeilen (Browser und Server)
- [x] Eigenes Passwort je Konto, nicht änderbar
- [x] Ergebnis: Zugangszettel (8 je Seite, Schnittlinien, weiß), Liste als CSV, Hinweis „einzige Gelegenheit“
- [ ] **BUG-2:** Rückfrage beim Verlassen nur über „Fertig“, „Zur Nutzerliste“ und Neuladen, nicht über die Seitenleiste
- [x] Protokoll `user.create` je Konto ohne Passwort, `user.bulk_create` mit Zahlen

#### AC-3: Rechte
- [x] Nur Super-Admin; 401 ohne Login, 403 für Lehrkraft, Bereichs-Admin, Azubi (alle drei Routen getestet)
- [x] Sammel-Anlage nur Azubi und Lehrkraft; Admin-Rollen nur einzeln mit Bestätigungs-Häkchen

### Edge Cases Status
- [x] E-Mail existiert schon (auch gesperrt): nicht angelegt, Meldung mit Verweis auf „Passwort neu vergeben“
- [x] Kein Bereich zuordenbar und keiner gewählt: Zeilenfehler
- [x] Abbruch mittendrin: Angelegtes bleibt sichtbar, fehlende Zeilen als CSV, zweiter Versuch überspringt Vorhandene
- [x] Andere Reihenfolge/Schreibweise der Kopfzeile wird erkannt
- [ ] **BUG-3:** Unklare Kopfzeile – Bereich und Rolle lassen sich nicht mehr zuordnen, sobald Name und E-Mail gewählt sind
- [x] Leere Zeilen und Leerzeichen ignoriert, E-Mails klein
- [ ] **BUG-6:** Leere Zeilen verschieben die angezeigte Zeilennummer
- [x] Selbst-Registrierung mit vergebener E-Mail scheitert (bestehender Weg)
- [x] Höchstens 8 Zettel je A4 mit Seitenumbruch (Code; Druckbild nicht geprüft, siehe BUG-7)

### Security Audit Results
- [x] Authentifizierung: alle Routen 401 ohne Login
- [x] Autorisierung: `requireSuperAdmin` in jeder Route, obwohl die Lehrkraft-Freigabeliste `/api/admin/users/**` durchlässt; Seite `/admin/users/aus-liste` leitet Nicht-Super-Admins um
- [x] Passwörter: nur in der Antwort; nicht in Protokoll, Logs (nur Fehlercodes) oder Datenbank-Klartext; Tests prüfen das
- [x] Eingaben: Zod auf allen Routen, unbekannte Felder werden verworfen; Namen werden in React und auf den Zetteln als Text ausgegeben (kein XSS); CSV-Formeln in Namen entschärft
- [x] Keine halben Konten: Rücknahme, wenn Profil oder Protokoll scheitern
- [x] Limits: 3 Sammel-Anlagen/Stunde, 300 Konten je Anlage, 25 je Aufruf, dazu 120 schreibende Aufrufe/Minute im Proxy
- [x] CSRF: JSON-POST mit SameSite-Lax-Cookies wie alle Verwaltungs-Routen
- [ ] **BUG-9 (Low):** Limit lässt sich als Super-Admin umgehen (zwei gleichzeitige Starts oder eine wiederverwendete `batchId`) – nur der Super-Admin selbst kann das
- [ ] **BUG-10 (Low):** Antworten mit Passwörtern ohne `Cache-Control: no-store`

### Bugs Found

#### BUG-1: Mac-Excel-CSV (ohne UTF-8) zeigt Umlaute falsch *(nicht verifiziert)*
- **Severity:** Medium
- **Steps:** In Excel für Mac „Kommagetrennte Werte (.csv)“ statt „CSV UTF-8“ speichern, Datei mit „Jürgen“ hochladen.
- **Expected:** „Jürgen“. **Actual (erwartet):** Excel für Mac schreibt dabei Mac-Roman; die App liest Windows-1252 und zeigt z. B. „JŠrgen“. Sichtbar in der Vorschau, aber leicht zu übersehen; falsch angelegte Namen müssen umbenannt werden.
- **Priority:** Fix before deployment empfohlen (Hinweis „Als CSV UTF-8 speichern“ an der Datei-Auswahl und/oder Warnung bei auffälligen Zeichen)

#### BUG-2: Verlassen über die Seitenleiste verwirft Passwörter ohne Rückfrage
- **Severity:** Medium
- **Steps:** Sammel-Anlage abschließen, auf der Ergebnisseite in der Seitenleiste „Startseite“ klicken.
- **Expected:** Rückfrage „Zugangsdaten wirklich verwerfen?“ (Spec). **Actual:** Seite wechselt sofort, Passwörter sind weg (nur „Passwort neu vergeben“ hilft). Bekannte Grenze des App Routers, im Frontend dokumentiert.
- **Priority:** Fix before deployment empfohlen (z. B. Klicks auf Links im Rahmen abfangen, solange Zugangsdaten offen sind)

#### BUG-3: Bereich- und Rollen-Spalte nicht zuordenbar, sobald Name und E-Mail stehen
- **Severity:** Medium
- **Steps:** Datei mit Kopfzeile „Wer;Adresse;Abteilung;Art“ hochladen → Zuordnung erscheint. Name und E-Mail wählen.
- **Expected:** Bereich und Rolle lassen sich noch zuordnen. **Actual:** Das Zuordnungs-Feld verschwindet sofort (Bedingung `!columnsComplete`). Alle Zeilen bekommen den Bereich für alle und Rolle Azubi. Gleiches gilt, wenn Name/E-Mail erkannt werden, die Bereich-Spalte aber anders heißt („Abteilung“): Sie wird stillschweigend ignoriert. In der Vorschau sichtbar, Lehrkräfte würden aber als Azubi angelegt, wenn man es übersieht.
- **Priority:** Fix before deployment empfohlen (Zuordnung offen lassen bzw. „Spalten anpassen“ immer anbieten)

#### BUG-4: Pseudonym neuer Konten passt nicht zum Bereich
- **Severity:** Low
- **Steps:** Tourismus-Azubi per Liste anlegen.
- **Actual:** Der Trigger vergibt das Pseudonym beim Anlegen, noch ohne Bereich (allgemeine Wörter). Bei der Selbst-Registrierung erzeugt `assignDepartmentIfMissing` es danach passend zum Bereich neu; bei PROJ-62 entfällt dieser Schritt, weil der Bereich schon gesetzt ist.
- **Priority:** Nice to have (nach dem Setzen des Bereichs neu erzeugen, wie bei der Registrierung)

#### BUG-5: Inaktive Bereiche stehen in der Auswahl
- **Severity:** Low
- **Actual:** Die Auswahl zeigt alle Bereiche aus dem Layout, auch inaktive; der Server lehnt sie mit „Bereich unbekannt.“ ab. Heute sind beide Bereiche aktiv.
- **Priority:** Nice to have

#### BUG-6: Zeilennummern verschieben sich bei leeren Zeilen
- **Severity:** Low
- **Steps:** Datei mit einer Leerzeile zwischen zwei Personen.
- **Actual:** Die Vorschau nennt für die Person nach der Leerzeile eine Zeile zu wenig (leere Zeilen werden vor dem Zählen entfernt).
- **Priority:** Nice to have

#### BUG-7: Druckbild nicht geprüft (Seitenhöhe fest 270 mm)
- **Severity:** Low (Risiko)
- **Actual:** Die Zettel-Seite ist fest 270 mm hoch. Bei großen Druckrändern (z. B. Safari) kann eine Seite überlaufen und leere Seiten erzeugen. `window.print()` startet verzögert, nicht direkt aus dem Klick; Safari kann nachfragen.
- **Priority:** Beim ersten Browser-Test prüfen

#### BUG-8: Datei ohne Kopfzeile, bei der in Zeile 1 die E-Mail fehlt
- **Severity:** Low
- **Actual:** Zeile 1 gilt dann als Kopfzeile und fehlt in der Vorschau; ohne Kopfzeile wird außerdem eine dritte Spalte (Bereich) ignoriert. Die Zuordnung erscheint, die verlorene Zeile wird aber nicht gemeldet.
- **Priority:** Nice to have

#### BUG-9: Limit „3 pro Stunde“ als Super-Admin umgehbar
- **Severity:** Low · nur der Super-Admin selbst kann das, kein Angriff von außen
- **Priority:** Nice to have

#### BUG-10: Kein `Cache-Control: no-store` bei Antworten mit Passwörtern
- **Severity:** Low · POST-Antworten werden praktisch nie zwischengespeichert; reine Vorsicht
- **Priority:** Nice to have

#### BUG-11: Einzel-Dialog setzt sich zurück, wenn sich die Bereichsleiste ändert
- **Severity:** Low
- **Actual:** Der Dialog füllt sich neu, sobald sich `scope` ändert (z. B. Bereichswechsel in einem anderen Tab mit `router.refresh`); dabei verschwinden auch angezeigte Zugangsdaten.
- **Priority:** Nice to have

### Automatische Tests
- `npm test`: 4632/4633 grün. Der eine Fehler (`werkzeugkiste-auszug.test.ts`) ist alt und hat mit PROJ-62 nichts zu tun (Datei und Test seit 2026-11-13 unverändert) – trotzdem als Regression zu klären.
- PROJ-62 eigene Tests: 126 (Bibliotheken 44, Oberfläche 29, Routen 39, Seiten-Wächter 5, Nutzerliste 4, Wächter PROJ-127 grün).
- `npm run test:e2e` **nicht ausgeführt** (Playwright, Projektregel). Kein neuer E2E-Test.
- Typprüfung, ESLint, `npm run build` sauber.

### Summary
- **Acceptance Criteria:** 3 Gruppen, 18 von 19 Punkten erfüllt (offen: Rückfrage beim Verlassen über die Seitenleiste)
- **Edge Cases:** 7 von 9 erfüllt
- **Bugs Found:** 11 (0 Critical, 0 High, 3 Medium, 8 Low)
- **Security:** bestanden; zwei Low-Befunde
- **Production Ready:** JA nach Regel (kein Critical/High). **Empfehlung:** BUG-1 bis BUG-3 vor dem Livegang beheben, danach ein kurzer Browser-Test durch dich (Anlegen einzeln, Liste mit 3 Zeilen, Zettel drucken in Chrome und Safari).

## Deployment
_To be added by /deploy_
