# PROJ-60: Konto löschen (DSGVO)

## Status: Deployed
**Created:** 2026-10-27
**Last Updated:** 2026-11-03

## Kontext
Wenn jemand die Ausbildung verlässt oder die Löschung seiner Daten verlangt, kann der Super-Admin ein Konto heute nur sperren. Das Konto und die persönlichen Daten bleiben dabei bestehen. Für die DSGVO (Recht auf Löschung, Datensparsamkeit) braucht es ein echtes Löschen.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1:** Löschen darf **nur der Super-Admin**.
- **E2:** **Benotete Leistungsnachweise bleiben anonymisiert erhalten.** Konto und persönliche Daten sind weg. In der Klassenauswertung steht das Ergebnis als „Gelöschtes Konto“, damit Durchschnitt und Statistik stimmen.

## Dependencies
- Requires: PROJ-1 (Auth), PROJ-21/28/30 (Leistungsnachweise, Klassenauswertung, Fokus-Verlust), PROJ-47 (Änderungsprotokoll)
- Nutzt: PROJ-59 (Detailseite, dort steht die Aktion in der Gefahrenzone)

## User Stories
- Als **Super-Admin** möchte ich ein Konto endgültig löschen, damit ich Löschanfragen nach DSGVO erfüllen kann.
- Als **Super-Admin** möchte ich vor dem Löschen sehen, was gelöscht und was anonymisiert behalten wird, damit ich keine Überraschung erlebe.
- Als **Lehrkraft** möchte ich, dass meine Klassenauswertung nach einer Löschung weiter stimmt, damit Noten und Durchschnitt nachvollziehbar bleiben.
- Als **gelöschte Person** möchte ich, dass weder Name noch E-Mail irgendwo in der App bleiben.

## Acceptance Criteria

### Aufruf
- [ ] „Konto löschen“ steht in der Gefahrenzone der Detailseite (PROJ-59) und im Aktionsmenü der Nutzerliste. Beides ist nur für den Super-Admin sichtbar.
- [ ] Ein `AlertDialog` listet auf:
  - **Wird gelöscht:** Login, E-Mail, Anzeigename, Pseudonym, XP, Streak, Münzen, Hof/Betrieb, Lernverlauf, Badges, Push-Abos, Rangliste.
  - **Bleibt anonym erhalten:** {Anzahl} benotete Leistungsnachweise, angezeigt als „Gelöschtes Konto“.
- [ ] Zur Bestätigung muss man die E-Mail-Adresse eintippen. Erst dann ist „Endgültig löschen“ aktiv (roter Button).

### Löschen
- [ ] Das Auth-Konto und das Profil werden gelöscht. Die Person kann sich nicht mehr anmelden, und die E-Mail ist für eine Neu-Registrierung wieder frei.
- [ ] Alle persönlichen Spiel- und Lerndaten (siehe Liste oben) werden gelöscht.
- [ ] Abgaben in Leistungsnachweisen werden von der Person **gelöst**: kein Name, keine E-Mail, keine Konto-Verknüpfung. Punkte, Note, Antworten und Fokus-Verlust-Zahl bleiben.
- [ ] Klassenauswertung und Druckansichten zeigen solche Abgaben als „Gelöschtes Konto“. Durchschnitt und Notenverteilung enthalten sie weiter.
- [ ] Die Rangliste zeigt die Person nicht mehr.
- [ ] Erfolg: Toast „Konto gelöscht“, Rückkehr zur Nutzerliste.

### Protokoll
- [ ] Protokoll-Eintrag `user.delete` mit Zeitpunkt, ausführendem Admin, Bereich und der Zahl anonymisierter Nachweise. Er enthält **keinen** Namen und **keine** E-Mail der gelöschten Person, nur eine Kennung ohne Personenbezug.
- [ ] Ältere Protokoll-Einträge zu dieser Person nennen danach „Gelöschtes Konto“ statt Name oder E-Mail.

### Rechte
- [ ] Nur der Super-Admin. Andere bekommen 403.
- [ ] Das eigene Konto und der verknüpfte Zweitaccount des Super-Admins lassen sich hier nicht löschen.
- [ ] Ein Konto mit der Rolle Super-Admin (`admin`) lässt sich nicht löschen. Vorher muss die Rolle geändert werden.

## Edge Cases
- Die Person ist gerade eingeloggt: Ihre Sitzung endet. Der nächste Aufruf landet auf dem Login.
- Die Person schreibt gerade einen Leistungsnachweis: Die Löschung ist erlaubt. Die laufende Abgabe wird nicht mehr angenommen, bisher Gespeichertes wird wie oben anonymisiert.
- Lehrkraft mit eigenen Inhalten (Fragen, Nachweise, Materialien): Die Inhalte bleiben im Bereich. Als Autor erscheint „Gelöschtes Konto“. Der Dialog nennt die Zahl der betroffenen Inhalte.
- Teilweise fehlgeschlagene Löschung (z. B. Auth gelöscht, Profil nicht): Der Vorgang muss als Ganzes gelingen oder sauber wiederholbar sein. Es dürfen keine halben Konten bleiben. Bei Fehlern erscheint die Meldung „Löschen fehlgeschlagen – erneut versuchen“, und ein erneuter Versuch setzt fort.
- Doppelklick oder zwei Admins gleichzeitig: Der zweite Versuch meldet „Konto nicht gefunden“, ohne Fehlerseite.
- Backups (Supabase): Daten verschwinden aus Backups erst mit deren Ablauf. Das wird in der Datenschutzerklärung erwähnt, nicht im Dialog.

## Technical Requirements (optional)
- Security: Die Löschung läuft nur serverseitig mit Super-Admin-Prüfung. Keine Rückgängig-Funktion, die Löschung ist endgültig (kein Papierkorb).
- Alle Fremdschlüssel auf das Profil müssen geprüft sein: löschen oder auf „anonym“ setzen. Keine Tabelle darf das Löschen blockieren.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Grundlage: Prüfung der Live-Datenbank am 2026-11-03 (alle Verknüpfungen auf Konto und Profil, nur lesend).

### Was bereits da ist
- **Nutzer-Detailseite (PROJ-59)** mit Gefahrenzone, Dialog-Bausteinen und gemeinsamer Super-Admin-Prüfung (`requireSuperAdminTarget`). Die Löschung hängt sich dort ein, es entsteht keine neue Seite.
- **Nutzerliste** mit Aktionsmenü, dort kommt ein Eintrag dazu.
- **Änderungsprotokoll** (`admin_audit_log`), das jede Admin-Aktion festhält.
- Das Löschen eines Auth-Kontos entfernt über die Datenbank schon heute den größten Teil der persönlichen Daten selbständig (Profil, XP, Lernverlauf, Blitzrunden, Shop, Badges, Forum-Merkzettel, Regal, Werkzeug-Abläufe, Schulrecht-Fälle, öffentliche Links).

### Wichtigster Befund: drei Stolperfallen in der Datenbank
Würde man heute einfach das Konto löschen, passiert Falsches:

1. **Benotete Abgaben würden mitgelöscht.** Die Abgabe (Punkte, Note, Antworten) hängt fest am Konto. Löschen des Kontos löscht sie, E2 („bleibt anonym erhalten“) wäre verletzt. Die Abgabe muss künftig *ohne* Konto existieren dürfen.
2. **Lehrkräfte können nicht gelöscht werden, wenn sie Nachweise angelegt haben.** Die Fragen-Zusammenstellung eines Nachweises hängt am Konto der Lehrkraft und würde mitgelöscht, der Nachweis blockiert das aber. Ergebnis: Löschen scheitert halb. Die Zusammenstellung muss ohne Autor weiterbestehen.
3. **Das Änderungsprotokoll würde Einträge verlieren.** Wird ein Admin oder eine Lehrkraft gelöscht, verschwinden heute auch deren Protokollzeilen. Gleiches gilt für KI-Aufträge. Das Protokoll soll bleiben, nur ohne Person dahinter.

Dazu zwei **Daten ohne Sicherung durch die Datenbank**: die platzierten Hof-Gegenstände („Mein Betrieb“) und die alten Werkzeugkisten-Einträge tragen die Konto-Kennung, werden aber beim Löschen nicht automatisch entfernt. Sie würden als Waisen liegen bleiben. Außerdem steht auf jeder Nachweis-Abgabe zusätzlich der **Klarname als Kopie**. Auch der muss weg, sonst bleibt der Name doch erhalten.

### A) Bausteine der Oberfläche
```
Nutzer-Detailseite (PROJ-59)
+-- Gefahrenzone
|   +-- „Konto löschen“ (roter Button, nur Super-Admin, nicht bei eigenem Konto,
|       Zweitaccount oder Super-Admin-Rolle)
|       +-- Lösch-Dialog (AlertDialog)
|           +-- „Wird gelöscht“ (Liste)
|           +-- „Bleibt anonym erhalten“ (Zahl Nachweise, Zahl Lehrkraft-Inhalte)
|           +-- Feld „E-Mail zur Bestätigung eintippen“
|           +-- „Endgültig löschen“ (rot, erst aktiv bei richtiger E-Mail)
Nutzerliste
+-- Aktionsmenü pro Zeile
    +-- „Konto löschen“ → derselbe Dialog
Klassenauswertung / Druckansicht / Protokoll / Autorenanzeige
+-- zeigen „Gelöschtes Konto“, wo vorher ein Name stand
```
Dialog und Zählungen kommen vom Server: Beim Öffnen holt der Dialog eine **Vorschau** (wie viele Nachweise, wie viele Inhalte), damit die Zahlen stimmen und nichts erraten wird.

### B) Datenmodell (in Alltagssprache)
**Wird gelöscht (zusammen mit dem Konto):** Login, E-Mail, Profil mit Anzeigename und Pseudonym, XP, Streak, Münzen, Lernverlauf, Blitzrunden, Shop-Käufe, Hof und Betrieb, Badges, Forum-Merkzettel, eigene Regal-Freigaben und Downloads, Werkzeug-Abläufe, Schulrecht-Fälle, öffentliche Links, Fach-Zuständigkeiten. Die Rangliste speist sich aus dem Profil und zeigt die Person dadurch nicht mehr.

**Bleibt, aber ohne Personenbezug:**
- Benotete Abgaben: Punkte, Note, Antworten, Fokus-Verlust-Zahl bleiben. Konto-Verknüpfung **und** Klarname-Kopie werden entfernt.
- Nachweis-Zusammenstellungen, Fragen, KI-Läufe, Forum-Beiträge, Änderungsverlauf: Autor wird leer, die Anzeige sagt „Gelöschtes Konto“.
- Änderungsprotokoll: Alle Zeilen bleiben. Wo die gelöschte Person als Ausführende stand, wird sie leer. Wo sie das *Ziel* war, wird die Kennung geleert, damit die Zeile niemanden mehr bezeichnet.
- **Neuer Protokoll-Eintrag `user.delete`:** Zeitpunkt, ausführender Admin, Bereich, Zahl anonymisierter Nachweise. Keine Namen, keine E-Mail, nur eine zufällige Kennung ohne Personenbezug.

**Neu in der Datenbank (nur Änderungen an bestehenden Regeln, keine neuen Tabellen):**
- Abgabe, Nachweis-Zusammenstellung, Protokoll und KI-Aufträge dürfen künftig „ohne Person“ bestehen.
- Platzierungen im Betrieb und alte Werkzeugkisten-Einträge werden beim Löschen mit entfernt.

### C) Technische Entscheidungen (mit Begründung)
| Entscheidung | Warum |
|---|---|
| **Eine einzige serverseitige Löschfunktion** statt mehrerer Einzelaufrufe aus der App | Spec verlangt „ganz oder gar nicht“. Anonymisieren und Aufräumen laufen in der Datenbank als **ein** Vorgang. Der Konto-Login wird **zuletzt** gelöscht. |
| **Reihenfolge: erst anonymisieren, dann Konto löschen** | Bricht es mittendrin ab, existiert das Konto noch und ein erneuter Versuch läuft ohne Schaden weiter („wiederholbar“). Es entstehen keine halben Konten. |
| **Nur Super-Admin, Service-Zugriff nach der Prüfung** | Wie bei Passwort und Umbenennen (PROJ-58/59): gemeinsame Prüfung, andere bekommen 403. Gesperrt: eigenes Konto, Zweitaccount, Rolle Super-Admin. |
| **Bestätigung per E-Mail-Eingabe, vom Server geprüft** | Schutz vor Fehlklicks; Dialog allein genügt nicht, der Server vergleicht die Eingabe selbst. |
| **Anzeige „Gelöschtes Konto“ an der Anzeigestelle** | Statt Platzhalter-Namen zu speichern, zeigen Klassenauswertung, Druck, Protokoll und Autorenzeilen „Gelöschtes Konto“, sobald keine Person mehr zugeordnet ist. So bleibt nirgends ein Rest-Name. |
| **Zweiter Versuch → „Konto nicht gefunden“** | Doppelklick und zwei Admins sind damit harmlos, keine Fehlerseite. |
| **Keine Rückgängig-Funktion** | Vorgabe der Spec. Der Dialog sagt das deutlich. |

### D) Abhängigkeiten
Keine neuen Pakete. Die Änderung besteht aus einer Datenbank-Migration (mit Rückbau-Datei wie üblich), einer neuen Admin-Schnittstelle (Vorschau und Löschen), dem Dialog in der Detailseite und im Listenmenü sowie kleinen Anpassungen an den Anzeigestellen (Klassenauswertung, Druck, Protokoll, Autoren).

### E) Reihenfolge der Umsetzung
1. **Backend zuerst** (hier steckt das Risiko): Migration, Löschfunktion, Schnittstelle, Tests mit Fällen Schüler / Lehrkraft mit Nachweisen / Admin im Protokoll / Doppelaufruf.
2. **Frontend:** Dialog, Gefahrenzone, Listenmenü, „Gelöschtes Konto“ an den Anzeigestellen.
3. **QA:** Gegenprobe, dass nach der Löschung weder Name noch E-Mail irgendwo in den Daten steht.

### F) Offene Punkte (kein Blocker)
- **Datenschutzerklärung:** Hinweis auf Backups (Spec nennt ihn) liegt außerhalb der App. Bitte separat ergänzen.
- **Test an Produktion:** Löschen ist endgültig. Getestet wird mit einem eigens angelegten Wegwerf-Konto, nie mit einem echten.
- **Vorhandene Waisen:** Die Migration sollte einmalig prüfen, ob schon verwaiste Betrieb- oder Werkzeugkisten-Zeilen existieren, und sie mit aufräumen.

## Umsetzung (Backend + Frontend, 2026-11-03)

**Abweichungen / Ergänzungen zum Tech Design**
- **Dateien im Speicher:** Die Werkzeugkiste legt Dateien unter `<konto-id>/<material-id>/…` im Bucket `werkzeugkiste` ab. Die Datenbank räumt sie nicht auf, deshalb löscht die Schnittstelle sie vor dem Auth-Konto (wiederholbar).
- **Reihenfolge in der Schnittstelle:** Datenbank-Funktion `konto_loeschen_vorbereiten` → Dateien → `auth.admin.deleteUser` → Protokoll `user.delete`. Bei einem Wiederholungsversuch nach Abbruch zeigt das Protokoll „0 anonymisierte Nachweise“, weil die Abgaben beim ersten Lauf schon gelöst wurden (bekannte, bewusst akzeptierte Ungenauigkeit).
- **Protokoll-Altlasten:** Zeilen zu der Person (`object_type` user/account) verlieren Kennung, Bezeichnung und Details. Zeilen, in denen die Person ausführte, werden durch `SET NULL` zu „Gelöschtes Konto“.
- **Nur Löschen erlaubt für:** Schüler, Lehrkraft, Bereichs-Admin. Gesperrt: eigenes Konto, Zweitaccount, Rolle `admin` (Meldung „Ändere zuerst die Rolle“).
- **Nutzerliste:** statt Menü ein Papierkorb-Icon in der Aktionsspalte (die Zeile hat nur Icon-Buttons), sichtbar nur für den Super-Admin.
- **Außerhalb des Umfangs:** Die separate Werkzeugkiste-App (eigenes, pausiertes Supabase-Projekt) wird nicht angefasst. Push-Abos gibt es nicht (PROJ-18 zurückgestellt).

**Dateien**
- Migration `supabase/migrations/20261105_proj60_konto_loeschen.sql` (+ `_down`), Probe `supabase/tests/proj60_konto_loeschen_probe.sql`
- Schnittstelle `src/app/api/admin/users/[id]/delete/route.ts` (GET Vorschau, POST Löschen)
- `src/lib/konto-loeschen.ts`, `src/components/admin/delete-account-dialog.tsx`
- Anpassungen: Gefahrenzone/Detailseite, Nutzerliste, Protokoll-Seite und Detail-Protokoll (Person ohne Konto), `buildParticipantRows` (Klassenauswertung/Export/Zeugnisse zeigen „Gelöschtes Konto“)

**Tests:** Schnittstelle (14), Hilfsfunktionen (5), Detailseite/Dialog (+3). Gesamt 2282 Tests grün, `tsc` und ESLint sauber.

## QA Test Results
Statisch und per Test geprüft (2026-11-03), kein Browser-Durchlauf:
- Rechte: 403 für Bereichs-Admin, 400 für eigenes Konto, Zweitaccount und Super-Admin-Rolle, 401 ohne Login (live per `curl` bestätigt).
- Bestätigung wird serverseitig geprüft (E-Mail, Groß-/Kleinschreibung egal). Falsche Eingabe ändert nichts.
- Reihenfolge und Abbruchverhalten getestet: Fehler bei Datenbank, Dateien oder Auth-Löschung lässt das Konto bestehen und schreibt kein Protokoll.
- Protokoll `user.delete` enthält weder Konto-Id noch Namen noch E-Mail.
- Datenbank-Probe in einer zurückgerollten Transaktion bestanden: Abgabe bleibt anonym (ohne Konto, ohne Klarname), Lehrkraft mit Zusammenstellung und Protokollzeile lässt sich löschen, Protokoll nennt die Person nicht mehr, zweiter Lauf harmlos, anon/authenticated dürfen die Funktionen nicht aufrufen.
- Offen: ein echter Löschlauf mit Wegwerf-Konto im Browser (Nutzer klickt selbst durch), Hinweis auf Backups in der Datenschutzerklärung.

## Deployment
- 2026-11-03: Migration `20261105_proj60_konto_loeschen.sql` per SQL-Editor auf Produktion (Probe vorher bestanden, danach lesend verifiziert), Push `f72f445` auf `main`, Vercel „Ready“, Routen liefern 401 ohne Login, keine Fehler in den Produktions-Logs.
