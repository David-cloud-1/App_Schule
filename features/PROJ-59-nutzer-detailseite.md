# PROJ-59: Nutzer-Detailseite (Super-Admin)

## Status: Deployed
**Created:** 2026-10-27
**Last Updated:** 2026-11-02

## Kontext
Die Nutzerliste zeigt pro Person nur eine Zeile. Für Support-Fragen („bei mir zählt der Streak nicht“), Gespräche mit Azubis und Pflegearbeiten braucht der Super-Admin eine Seite pro Person, die alles bündelt und die nötigen Korrekturen erlaubt.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1:** Die Detailseite gibt es **nur für den Super-Admin**. Bereichs-Admins behalten die Liste wie bisher.
- **E2:** Auf der Detailseite liegen auch die Pflege-Aktionen: **Anzeigename ändern**, **E-Mail ändern / als bestätigt markieren**, **Fortschritt zurücksetzen**.
- **E3:** „Ansicht als …“ und Kennzahlen über der Tabelle kommen ins Backlog, nicht in dieses Feature.

## Dependencies
- Requires: PROJ-57 (Nutzerliste, von dort verlinkt), PROJ-4/5/6/7 (XP, Streak, Fortschritt, Badges), PROJ-21/30 (Leistungsnachweise, Fokus-Verlust), PROJ-47 (Änderungsprotokoll)
- Nutzt: PROJ-58 (Passwort-Dialog), PROJ-60 (Löschen) als Aktionen im Seitenkopf, sobald diese gebaut sind

## User Stories
- Als **Super-Admin** möchte ich in der Nutzerliste auf einen Namen tippen und eine Übersicht dieser Person sehen, damit ich Fragen schnell beantworten kann.
- Als **Super-Admin** möchte ich den Lernstand je Fach und die Trefferquote sehen, damit ich Stärken und Lücken erkenne.
- Als **Super-Admin** möchte ich Streak-Verlauf, Badges und Leistungsnachweise sehen, damit ich Beschwerden nachprüfen kann.
- Als **Super-Admin** möchte ich einen unpassenden Anzeigenamen korrigieren, damit die Rangliste sauber bleibt.
- Als **Super-Admin** möchte ich eine falsch geschriebene E-Mail korrigieren und als bestätigt markieren, wenn die Bestätigungsmail nicht ankommt.
- Als **Super-Admin** möchte ich den Fortschritt eines Kontos zurücksetzen, z. B. bei Testkonten.
- Als **Super-Admin** möchte ich die letzten Protokoll-Einträge zu dieser Person sehen, damit ich weiß, wer was geändert hat.

## Acceptance Criteria

### Aufruf
- [ ] Für den Super-Admin ist der Name in der Nutzerliste ein Link auf `/admin/users/{id}`.
- [ ] Bereichs-Admins sehen keinen Link. Ein direkter Aufruf leitet zur Übersicht um, mit dem Hinweis „Das verwaltet der Super-Admin.“ (Mechanismus aus PROJ-49).
- [ ] Der Seitenkopf nutzt `AdminPageHeader` mit `breadcrumb={Name}`, darunter E-Mail, Rolle (Badge), Bereich und Status.

### Inhalte (nur lesen)
- [ ] **Steckbrief:** registriert am, letzter Login, letzte Lern-Session, E-Mail bestätigt ja/nein.
- [ ] **Spielstand:** XP, Level, aktueller und längster Streak, Frachtmünzen.
- [ ] **Lernstand je Fach:** beantwortete Fragen, Trefferquote in %, zuletzt gelernt. Fächer ohne Aktivität werden ausgeblendet.
- [ ] **Aktivität:** Lerntage der letzten 30 Tage als Kalenderstreifen (gelernt / nicht gelernt).
- [ ] **Badges:** erhaltene Badges mit Datum.
- [ ] **Leistungsnachweise:** Titel, Datum, Punkte/Note, Zahl der Fokus-Verluste, mit Link auf die jeweilige Auswertung.
- [ ] **Protokoll:** die letzten 20 Einträge des Änderungsprotokolls, die diese Person betreffen (Sperren, Rolle, Bereich, Passwort, Name, E-Mail, Zurücksetzen), mit „Alle anzeigen“ zum gefilterten Protokoll.
- [ ] Jeder Abschnitt hat einen eigenen Lade-, Leer- und Fehlerzustand (`admin-states`). Fällt ein Abschnitt aus, bleiben die anderen nutzbar.

### Anzeigename ändern
- [ ] „Name ändern“ öffnet einen Dialog. Regeln wie bei der Registrierung (Länge, erlaubte Zeichen).
- [ ] Erfolg: Toast, Name sofort in Seite und Liste aktualisiert, Protokoll-Eintrag `user.rename` mit alt/neu.

### E-Mail ändern / bestätigen
- [ ] „E-Mail ändern“ öffnet einen Dialog mit der neuen Adresse. Die neue Adresse gilt sofort, ohne Bestätigungsmail.
- [ ] Ist die Adresse schon vergeben, erscheint der Fehler „Diese E-Mail gehört schon zu einem anderen Konto.“
- [ ] Ist die E-Mail unbestätigt, gibt es zusätzlich „Als bestätigt markieren“.
- [ ] Beides erzeugt Protokoll-Einträge (`user.email_change` mit alt/neu, `user.email_confirm`).
- [ ] Hinweis im Dialog: Der Fachbereich wird **nicht** automatisch an die neue Adresse angepasst. Das geht über „Bereich ändern“.

### Fortschritt zurücksetzen
- [ ] „Fortschritt zurücksetzen“ steht in einem Bereich „Gefahrenzone“ unten auf der Seite.
- [ ] Ein `AlertDialog` erklärt, was verloren geht: XP, Level, Streak, Frachtmünzen, Hof/Betrieb-Items, Lernverlauf und Badges. Ausdrücklich **nicht** betroffen sind Leistungsnachweise (Noten bleiben).
- [ ] Zur Bestätigung muss man den Anzeigenamen eintippen.
- [ ] Erfolg: Toast, Seite zeigt den Nullstand, Protokoll-Eintrag `user.progress_reset` mit den alten Kennzahlen (XP, Streak, Münzen).

### Rechte
- [ ] Alle Lese- und Schreibwege prüfen serverseitig auf Super-Admin. Bereichs-Admins und Lehrkräfte bekommen 403.
- [ ] Das eigene Konto: Die Detailseite ist lesbar, aber E-Mail-Änderung und Zurücksetzen sind gesperrt (wie bisher „Du kannst dich nicht selbst bearbeiten“).

## Edge Cases
- Die Person wird gelöscht, während die Seite offen ist: Der nächste Aufruf zeigt „Konto nicht gefunden“ mit Link zurück zur Liste.
- Person ohne jede Aktivität: Alle Abschnitte zeigen kurze Leerzustände statt leerer Tabellen.
- Verknüpfter Zweitaccount des Super-Admins (PROJ-29): Er ist nicht in der Liste und deshalb nicht verlinkt. Ein direkter Aufruf zeigt einen Hinweis „Zweitaccount von {Hauptkonto}“.
- Lehrkraft- oder Admin-Konto: Die Seite funktioniert gleich. Die Abschnitte Lernstand und Hof sind oft leer, das ist in Ordnung.
- Anzeigename mit Pseudonym (Lehrkräfte, PROJ-44): Angezeigt werden der echte Name und darunter das Pseudonym. Geändert wird nur der Anzeigename.
- Zurücksetzen bei laufender Lern-Session der Person: Die laufende Session darf danach keine alten Werte zurückschreiben. Sie startet beim nächsten Abschluss vom Nullstand.

## Technical Requirements (optional)
- Laden: Der Seitenkopf erscheint < 1 s, die Abschnitte dürfen nachladen.
- Security: Service-Rolle nur in Routen mit Super-Admin-Prüfung. Keine Daten anderer Personen in der Antwort.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Stand:** 2026-11-02. Grundlage: Spec oben und der bestehende Nutzerbereich (PROJ-57 Liste, PROJ-58 Passwort, Änderungsprotokoll PROJ-47).

### Überblick
Eine Seite pro Person, nur für den Super-Admin. Die Seite besteht aus Lese-Abschnitten und drei Pflege-Aktionen. Die Abschnitte laden unabhängig voneinander, damit ein Ausfall eines Abschnitts (z. B. Leistungsnachweise) die anderen nicht blockiert. Vieles ist schon da und wird nur zusammengeführt. Neue Datenbank-Tabellen sind nicht nötig.

### Component Structure
```
Nutzer-Detailseite (/admin/users/[Person])
+-- Kopfzeile (Name, E-Mail, Rolle, Bereich, Status, Brotkrumen)
+-- Lese-Abschnitte (je eigener Lade-, Leer- und Fehlerzustand)
|   +-- Steckbrief (Anmeldung, letzter Login, E-Mail bestätigt)
|   +-- Spielstand (XP, Level, Streak, Frachtmünzen)
|   +-- Lernstand je Fach (Trefferquote, zuletzt gelernt)
|   +-- Aktivität (Kalenderstreifen 30 Tage)
|   +-- Badges mit Datum
|   +-- Leistungsnachweise (Link zur Auswertung)
|   +-- Protokoll (letzte 20 Einträge, „Alle anzeigen“)
+-- Pflege-Aktionen (Dialoge)
|   +-- Name ändern
|   +-- E-Mail ändern / als bestätigt markieren
|   +-- Passwort neu vergeben (vorhandener Dialog aus PROJ-58)
+-- Gefahrenzone (unten)
    +-- Fortschritt zurücksetzen (mit Eintippen des Namens)
    +-- Konto löschen (kommt mit PROJ-60, hier nur Platzhalter)
```

### Data Model (plain language)
Es werden keine neuen Tabellen angelegt. Die Daten stammen aus dem Bestand:
- **Konto-Stammdaten:** Name, Rolle, Bereich, Pseudonym, Zweitaccount-Verknüpfung, Sperr-/Pflichtwechsel-Status. Diese Daten liegen beim Konto-Profil.
- **Anmeldedaten:** E-Mail, Bestätigungsstatus, letzter Login. Diese liegen beim Anmeldedienst (Supabase Auth).
- **Spielstand:** XP, Level, aktueller und längster Streak, Frachtmünzen. Liegen beim Profil.
- **Lernverlauf:** beantwortete Fragen und Treffer je Fach. Kommt aus den Antworten der Lernsitzungen.
- **Badges:** erhaltene Badges mit Datum.
- **Leistungsnachweise:** Ergebnisse, Punkte und Fokus-Verluste (PROJ-21/30).
- **Protokoll:** das bestehende Änderungsprotokoll, gefiltert auf diese Person.

**Zurücksetzen** löscht nicht. Die Lernverläufe, Badges, der Spielstand und die Hof-/Betriebs-Items werden auf den Nullstand gesetzt. Leistungsnachweise bleiben unberührt.

### Tech Decisions (WHY)
- **Eine Seite, mehrere unabhängige Abschnitte:** Jeder Abschnitt holt seine Daten selbst. So erfüllen wir die Vorgabe „ein Ausfall blockiert nichts“ und die Seite bleibt schnell (< 1 s für den Kopf).
- **Vorhandene Bausteine wiederverwenden:** Der Passwort-Dialog (PROJ-58), das Protokoll (PROJ-47) und die Sperr-/Rollen-Regeln aus der Nutzerliste bleiben die einzige Quelle. Nichts wird doppelt gebaut.
- **Alle Schreibwege laufen über den Server:** Der Browser darf die Daten nicht direkt ändern. Die Super-Admin-Prüfung steht bei jedem Aufruf im Server, nicht nur in der Oberfläche. Das ist das Muster der bestehenden Nutzer-Routen.
- **Jede Pflege-Aktion schreibt ins Protokoll:** Name, E-Mail, Bestätigung und Zurücksetzen erzeugen je einen Eintrag mit den alten und neuen Werten. Das Zurücksetzen speichert die alten Kennzahlen (XP, Streak, Münzen), damit es nachvollziehbar bleibt.
- **Zurücksetzen als ein Vorgang:** Alle betroffenen Daten werden in einem Schritt zurückgesetzt. Sonst entstünde ein halb zurückgesetzter Stand, falls der Vorgang unterbrochen wird.
- **Laufende Sitzungen:** Beim Zurücksetzen erhält die Person einen Zeitstempel „Nullstand seit“. Sitzungen, die davor begonnen haben, dürfen beim Abschluss keine alten Werte mehr schreiben. Das ist einfacher und sicherer, als laufende Sitzungen zu beenden.
- **E-Mail ändern ohne Bestätigungsmail:** Die neue Adresse gilt sofort, wie in der Spec gewünscht. Das ist ein bewusster Vertrauensschritt des Super-Admins. Die Änderung steht im Protokoll.
- **Eigenes Konto gesperrt:** Die Seite ist für das eigene Konto lesbar. E-Mail-Änderung und Zurücksetzen sind abgeschaltet, wie bei der bestehenden Nutzerverwaltung.

### Dependencies (packages)
Keine neuen Pakete. Vorhanden sind Dialoge, Tabellen und Toasts aus der Oberfläche sowie der bestehende Anmeldedienst.

### Entscheidungen (Nutzer, 2026-11-02: „wie vorgeschlagen“)
- **E4:** Zurücksetzen und laufende Lernsitzungen: Sitzungen, die davor begonnen haben, schreiben beim Abschluss keine alten Werte zurück. Laufende Sitzungen werden nicht beendet. *(Umsetzung weicht vom Entwurf ab, siehe „Abweichungen“: Es braucht keinen Zeitstempel.)*
- **E5:** Zweitaccount des Super-Admins: Hinweis „Zweitaccount von {Hauptkonto}“ plus Link auf die Detailseite des Hauptkontos.
- **E6:** „Konto löschen“ (PROJ-60) bleibt ein leerer Platzhalter in der Gefahrenzone, bis PROJ-60 gebaut ist. Im Moment ist dort nichts sichtbar.

## Umsetzung (2026-11-02)

**Seite:** `/admin/users/[id]` (`src/app/admin/users/[id]/page.tsx`, Server) prüft die Rolle und leitet alle außer dem Super-Admin mit `?gesperrt=super` zur Übersicht um; dort steht „Das verwaltet der Super-Admin.“ (`AdminHome` hat dafür `blockedBy`). Die Oberfläche liegt in `src/components/admin/user-detail/` (Ansicht, Abschnitte, Dialoge, Lade-Hook).

**Schnittstellen** (alle über `requireSuperAdminTarget`: Super-Admin, UUID, Konto existiert; sonst 401/403/404):
- `GET /api/admin/users/[id]/detail/[section]` mit `overview`, `learning`, `badges`, `assessments`, `log`. Jeder Abschnitt lädt einzeln.
- `POST …/rename` (Name 2–50 Zeichen), `POST …/email` (sofort gültig, `email_confirm`), `POST …/email/confirm`, `POST …/reset-progress` (Name muss serverseitig stimmen).
- `GET /api/admin/audit-log` kennt jetzt `object_id`; die Protokollseite liest `?person=<id>` und zeigt „Nur eine Person“ zum Aufheben.
- Rein fachliche Regeln und Aufbereitung: `src/lib/user-detail.ts`, Abschnitts-Abfragen: `src/lib/user-detail-server.ts`.

**Keine Datenbankänderung** (keine Migration, keine neuen Umgebungsvariablen, keine neuen Pakete).

**Zurücksetzen löscht:** `quiz_answers`, `quiz_sessions`, `user_badges`, `blitz_rounds`, `blitz_starts`, `betrieb_platzierungen`, `user_shop_items` und Prüfungssimulationen (`exam_sessions` ohne Nachweis-Id). Danach Profil: XP 0, Streak 0, längster Streak 0, letzte Session leer, Münzen 0. Leistungsnachweise (`exam_sessions` mit Nachweis-Id) bleiben. Protokoll `user.progress_reset` mit den alten Werten und den Löschzahlen je Tabelle.

### Abweichungen vom Entwurf
- **Kein Zeitstempel „Nullstand seit“.** Eine Lernrunde existiert erst beim Abschluss und liest dort den dann aktuellen Stand der Person. Eine Runde, die der Azubi während des Zurücksetzens im Browser offen hat, startet also automatisch vom Nullstand. Das Fenster zwischen Lesen und Schreiben im Abschluss selbst ist wenige Millisekunden groß und wird nicht zusätzlich gesichert. Dafür braucht es keine neue Spalte und keine Migration.
- **Zurücksetzen ist nicht eine einzige Datenbank-Transaktion**, sondern eine feste Reihenfolge (abhängige Zeilen zuerst, Profil zuletzt). Bricht ein Schritt ab, bleibt das Profil auf dem alten Stand, die Antwort sagt „bitte noch einmal versuchen“, und der zweite Versuch läuft sauber durch (jeder Schritt ist wiederholbar). Das Protokoll entsteht erst nach Erfolg.
- **Anzeigename-Regeln:** Bei der Registrierung gibt es keinen Namen (er entsteht aus der E-Mail). Deshalb gilt neu: 2 bis 50 Zeichen, keine Steuer- und Zeilenumbruch-Zeichen.
- **Prüfungssimulationen** werden mit zurückgesetzt, weil sie zum Lernverlauf zählen (Spec nennt sie nicht ausdrücklich).
- **Passwort neu vergeben** wird bei Zweitaccounts nicht angeboten (die Schnittstelle aus PROJ-58 lehnt sie ab).

## QA Test Results

**Stand:** 2026-11-02 · **Tester:** QA (AI) · **Geprüft:** Spec-Abgleich, Quelltext-Prüfung, automatische Tests, Lesezugriff auf die Produktions-Datenbank. **Nicht geprüft:** Browser, Handy, Hell/Dunkel, Screenreader (Projektregel: kein Dev-Server).

### Automatische Prüfung
- Neue Tests: `user-detail.test.ts` (12), Schnittstellen `detail`, `rename`, `email` (+`confirm`), `reset-progress` (zusammen 34: detail 12, rename 8, email 8, reset-progress 6), `audit-log` (+1), `user-detail-view.test.tsx` (10), Zugang `[id]/page.test.tsx` (5), Nutzerliste (+2).
- Gesamtsuite 2241 grün (193 Dateien), `tsc` sauber, ESLint ohne Meldungen in den eigenen Dateien.

### Akzeptanzkriterien
| Bereich | Ergebnis |
|---|---|
| Aufruf: Link in der Liste nur für Super-Admin, Bereichs-Admin kein Link, direkter Aufruf → Übersicht mit „Das verwaltet der Super-Admin.“ | ✅ (Test) |
| Seitenkopf mit `AdminPageHeader`, Brotkrumen = Name, E-Mail, Rolle, Bereich, Status | ✅ |
| Steckbrief, Spielstand, Lernstand je Fach (leere Fächer ausgeblendet), Aktivität 30 Tage, Badges, Leistungsnachweise (Punkte/Note/Fokus/Link), Protokoll (20, „Alle anzeigen“) | ✅ (Test) |
| Eigener Lade-/Leer-/Fehlerzustand je Abschnitt, Ausfall blockiert die anderen nicht | ✅ (Test) |
| Name ändern: Dialog, Regeln, Toast, Protokoll `user.rename` alt/neu | ✅ (Test). Regeln: siehe Abweichungen |
| E-Mail ändern: sofort gültig, „schon vergeben“-Satz, „Als bestätigt markieren“, Protokolle, Hinweis zum Fachbereich | ✅ (Test) |
| Zurücksetzen: Gefahrenzone, `AlertDialog` mit Verlustliste und „Leistungsnachweise bleiben“, Namen eintippen (auch serverseitig), Protokoll mit alten Werten | ✅ (Test) |
| Rechte: alle Wege 401/403 für Nicht-Super-Admins, eigenes Konto lesbar, E-Mail und Zurücksetzen gesperrt | ✅ (Test). Name ändern am eigenen Konto ist erlaubt (Spec sperrt nur E-Mail und Zurücksetzen) |
| Edge: Konto gelöscht → „Konto nicht gefunden“ mit Link; Person ohne Aktivität → Leerzustände; Zweitaccount mit Hinweis und Link; Pseudonym wird angezeigt | ✅ (Test) |
| Edge: Zurücksetzen bei laufender Session | ✅ durch Aufbau (siehe Abweichungen), nicht als Test abbildbar |

### Datenbank (nur lesend gegen Produktion)
- Alle in den Abfragen verwendeten Tabellen und Spalten existieren (14 Tabellen geprüft).
- Fremdschlüssel auf die zu leerenden Tabellen sind nur `ON DELETE CASCADE` (Antworten → Sessions, Platzierungen → gekaufte Items, Fokus-Daten → Prüfungssitzungen). Nichts kann das Löschen blockieren.
- Auf den zu leerenden Tabellen und den Profil-Spalten für XP, Streak und Münzen liegen keine Trigger. Der Trigger „letzter Super-Admin“ betrifft nur die Rolle.
- Das Löschen selbst wurde **nicht** gegen Produktion ausgeführt (zerstörend, und schreibende Aufrufe laufen über den Nutzer). Es ist per Test mit Mock belegt (Reihenfolge, Filter `assessment_id IS NULL`, Abbruchverhalten).

### Sicherheit
- Service-Rolle wird erst nach der Super-Admin-Prüfung ausgegeben; Ziel-Id wird als UUID geprüft; alle Eingaben laufen durch Zod; die Bestätigung beim Zurücksetzen wird serverseitig geprüft.
- Antworten enthalten keine Passwörter, Tokens oder Daten anderer Personen. Protokoll-Details werden in der Oberfläche nur als Text ausgegeben (React-Escaping).
- Der Protokoll-Eintrag ist „best effort“ (bestehendes Muster der Protokoll-Funktion): Schlägt nur das Schreiben des Eintrags fehl, ist die Änderung trotzdem durchgeführt.

### Bugs
| ID | Schwere | Beschreibung |
|---|---|---|
| BUG-1 | Low ✅ | Passwort-Knopf erschien bei Zweitaccounts, die Schnittstelle lehnt sie aber ab. Behoben: Knopf wird ausgeblendet (Test). |
| BUG-2 | Low (offen) | Lernstand, Aktivität und Badges laden mit Obergrenzen (5000 Sessions, 200 Badges, 50 Nachweise). Bei außergewöhnlich vielen Runden wären ältere nicht eingerechnet. Für den heutigen Bestand unkritisch. |

**Keine Critical/High-Fehler → produktionsreif, Status Approved.** Offen nach dem Deploy: einmal als Super-Admin im Browser und am Handy durchklicken (Liste → Detailseite, Dialoge, Hell/Dunkel).

## Deployment

**2026-11-02:** Push auf `main` (Commits `e3b9a59` Design, `81d19e6` Umsetzung). Production `spedilern` Ready (Build 2 Min.).
- **Keine Migration**, keine neuen Umgebungsvariablen, keine neuen Pakete.
- Vor dem Push: committeter Stand in einem sauberen Worktree geprüft (2202 Tests grün, `tsc` sauber, `npm run build` erfolgreich).
- Es wurden **nur die PROJ-59-Commits** gepusht. Zwei Commits einer parallelen Sitzung (PROJ-67) lagen lokal schon auf `main` und gingen bewusst nicht mit raus.
- Nach dem Deploy: alle neuen Routen ohne Login 401, Seite ohne Login Umleitung zur Anmeldung, in den Vercel-Fehlerprotokollen der ersten 15 Minuten nichts.
- **Noch offen:** Durchgang im Browser und am Handy als Super-Admin (Liste → Detailseite, Name/E-Mail ändern, Zurücksetzen an einem Testkonto, Hell/Dunkel), eingeloggter Aufruf der Seite (die Server/Client-Grenze lässt sich nur dort prüfen, siehe Projekt-Erfahrung PROJ-50).
