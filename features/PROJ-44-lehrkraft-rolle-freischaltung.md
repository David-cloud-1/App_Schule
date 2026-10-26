# PROJ-44: Lehrkraft-Rolle & Freischaltung

## Status: Planned
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Kontext
Erster Baustein der „Super-App für Lehrkräfte“: Die Lern-App bleibt für Azubis wie sie ist. Lehrkräfte sollen über **ein** Konto alle Lehrer-Werkzeuge nutzen, auch ohne einem Fachbereich zugeordnet zu sein. Heute gibt es nur drei Rollen (`student`, `department_admin`, `admin`). Ein `department_admin` ist immer an einen Fachbereich gebunden und verwaltet dessen Inhalte. Eine Lehrkraft, die „nur“ unterrichtet, gibt es nicht.

Gesamtplan (Reihenfolge mit dem Nutzer am 2026-10-26 abgestimmt):
1. **PROJ-44** Lehrkraft-Rolle & Freischaltung (dieses Feature)
2. **PROJ-45** Lehrkräfte-Arbeitsbereich: modernes Layout für Desktop und Handy, hell/dunkel
3. **PROJ-46** Leistungsnachweise für Lehrkräfte ohne Fachbereich
4. **PROJ-47** Änderungsverlauf & Wiederherstellen für Inhalte
5. **PROJ-48** Fach-Zuständigkeiten für Lehrkräfte (selbst eingetragen)
6. später: Werkzeugkiste mit gemeinsamem Login (einheitliches Konto statt eigener Kürzel-Konten)
7. später: Ablage & „Regal des Kollegiums“ der Werkzeugkiste in die App übernehmen

### Entscheidungen (Nutzer, 2026-10-26)
- **E1 – Kein Selbstauswahl-Feld:** Lehrkräfte registrieren sich genau wie Azubis. Es gibt **keine** Auswahl „Ich bin Lehrkraft“ und keine Anfrage-Funktion, weil Schüler das ausnutzen würden. Der Super-Admin kennt das Kollegium und macht passende Konten selbst zur Lehrkraft.
- **E2 – Jede E-Mail-Adresse:** Keine Pflicht zur Schuladresse. Geprüft wird ausschließlich durch die Freischaltung des Super-Admins.
- **E3 – Spielen optional, inkognito:** Eine Lehrkraft landet nach dem Login im Lehrkräfte-Bereich. Die Lern-App kann sie weiter normal nutzen und darf auch in der Rangliste mitspielen, dort aber **immer unter Pseudonym** und **ohne Kennzeichnung als Lehrkraft**. Das gilt für alle Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin).
- **E4 – Bescheid in der App:** Keine E-Mail. Beim nächsten Öffnen nach der Freischaltung sieht die Lehrkraft einmalig einen Willkommens-Hinweis.
- **E5 – Bereichs-Admin = Lehrkraft plus:** Ein Bereichs-Admin hat alle Rechte einer Lehrkraft und zusätzlich die Verwaltungsrechte im eigenen Fachbereich.
- **E6 – Rolle entziehen:** Die Person verliert sofort den Zugriff. Ihre erstellten Inhalte (z. B. Leistungsnachweise und Noten, PROJ-46) bleiben erhalten und sind nur noch für den Super-Admin sichtbar.

## Dependencies
- Requires: PROJ-1 (User Authentication) – normale Registrierung und Login
- Requires: PROJ-24 (Fachbereichs-Admins & Rechtetrennung) – Rollenmodell, `requireAdmin()`, Rollenvergabe nur durch Super-Admin, Schutz des letzten Super-Admins
- Requires: PROJ-40 (Lehrkräfte-Bereich übersichtlicher) – Startseite und gruppierte Navigation, die hier rollenabhängig gefiltert werden
- Berührt: PROJ-8 (Leaderboard) – Lehrer-Konten erscheinen dort nur unter Pseudonym
- Berührt: PROJ-29 (Bereichs-Umschalter / verknüpfte Konten) – bestehende Zweitkonten dürfen nicht kaputtgehen
- Blockiert: PROJ-45 (rollenabhängige Navigation), PROJ-46 (Nachweise ohne Fachbereich)

## User Stories
- Als **Super-Admin** möchte ich ein bestehendes Konto in der Nutzerverwaltung zur Lehrkraft machen, damit Kolleginnen und Kollegen die Lehrer-Werkzeuge nutzen können, ohne einen Fachbereich verwalten zu müssen.
- Als **Super-Admin** möchte ich Konten über alle Fachbereiche hinweg nach Name oder E-Mail suchen, damit ich eine Lehrkraft finde, egal über welche Bereichs-Adresse sie sich registriert hat.
- Als **Super-Admin** möchte ich alle Lehrkräfte und Bereichs-Admins auf einen Blick sehen, damit ich weiß, wer Zugang zum Lehrkräfte-Bereich hat.
- Als **Super-Admin** möchte ich einer Lehrkraft die Rolle jederzeit wieder entziehen, damit jemand, der die Schule verlässt, sofort keinen Zugriff mehr hat.
- Als **Lehrkraft** möchte ich nach dem Login direkt im Lehrkräfte-Bereich landen, damit ich nicht erst durch die Schüler-App muss.
- Als **Lehrkraft** möchte ich nach meiner Freischaltung einmal kurz erklärt bekommen, was ich jetzt kann, damit ich weiß, wo ich anfange.
- Als **Lehrkraft** möchte ich im Lehrkräfte-Bereich nur sehen, was ich auch nutzen darf, damit die Oberfläche übersichtlich bleibt.
- Als **Lehrkraft** möchte ich in der Lern-App und der Rangliste mitspielen können, ohne als Lehrkraft erkannt zu werden, damit ich sehe, was meine Schüler sehen, und die Azubis nicht befangen sind.
- Als **Azubi** möchte ich, dass sich niemand selbst Lehrer-Rechte geben kann, damit Noten und Klassenarbeiten geschützt bleiben.

## Acceptance Criteria

### Rolle
- [ ] Es gibt eine neue Rolle **„Lehrkraft“**. Sie braucht keinen Fachbereich.
- [ ] Die Registrierung bleibt unverändert: kein Feld, keine Auswahl und kein Hinweis auf eine Lehrkraft-Rolle (E1). Jedes neue Konto ist ein Azubi-Konto.
- [ ] Nur der Super-Admin kann die Rolle „Lehrkraft“ vergeben oder entziehen. Ein Bereichs-Admin kann das nicht (Oberfläche ausgeblendet, Server lehnt mit 403 ab).
- [ ] Niemand kann sich die Rolle selbst geben, auch nicht per direktem Datenbank- oder API-Aufruf. Der bestehende Spaltenschutz auf `profiles.role` gilt weiter.
- [ ] Ein Bereichs-Admin hat automatisch alle Rechte einer Lehrkraft (E5). Für ihn ändert sich gegenüber heute nichts, außer dass die Lehrkraft-Funktionen dazukommen.
- [ ] Rollenwechsel wirken bei der nächsten Anfrage. Die Rolle wird serverseitig bei jeder Anfrage aus der Datenbank gelesen, nicht aus dem Login-Token.

### Nutzerverwaltung (Super-Admin)
- [ ] Die Nutzerverwaltung hat eine Suche nach Name oder E-Mail über **alle** Fachbereiche hinweg, unabhängig vom gewählten Bereich im Umschalter.
- [ ] Es gibt einen Filter nach Rolle: Alle · Azubis · Lehrkräfte · Bereichs-Admins · Super-Admin.
- [ ] Im Rollen-Menü eines Kontos steht „Lehrkraft“ als Auswahl, zusätzlich zu Azubi, Bereichs-Admin und Super-Admin.
- [ ] Vor jedem Rollenwechsel erscheint ein Bestätigungsdialog mit Name **und** E-Mail-Adresse des Kontos, damit keine Verwechslung bei gleichen Namen passiert.
- [ ] Jeder Rollenwechsel wird im Änderungsprotokoll mit alter und neuer Rolle erfasst (wie heute `user.role_change`).
- [ ] Die Liste zeigt pro Lehrkraft und Bereichs-Admin das Datum des letzten Logins, damit verwaiste Zugänge auffallen.

### Rolle entziehen (E6)
- [ ] Wird eine Lehrkraft zum Azubi zurückgestuft, kommt sie ab der nächsten Anfrage nicht mehr in den Lehrkräfte-Bereich (Seiten leiten in die Lern-App um, API antwortet 403).
- [ ] Ihre erstellten Inhalte bleiben unverändert gespeichert. Der Bestätigungsdialog weist darauf hin: „Erstellte Inhalte bleiben erhalten und sind danach nur noch für dich sichtbar.“
- [ ] Wird die Lehrkraft später erneut freigeschaltet, sieht sie ihre früheren Inhalte wieder.

### Lehrkräfte-Bereich für die Rolle „Lehrkraft“
- [ ] Nach dem Login landet eine Lehrkraft im Lehrkräfte-Bereich, nicht auf der Spieler-Startseite. Ein `?redirect=` aus einem Link (z. B. Druckansicht) hat Vorrang.
- [ ] Navigation und Startseite zeigen der Lehrkraft nur ihre Einträge: Übersicht, Leistungsnachweise (sobald PROJ-46 live ist) und Werkzeugkiste. Fragen, Nutzer, Fächer, Themen, Prüfungssimulation, Fragen aus Material, Fachbereich-Einstellungen, Hof-Items, Änderungsprotokoll und Fachbereiche sind ausgeblendet.
- [ ] Alle Bereichs-Verwaltungsseiten und ihre API-Routen lehnen eine Lehrkraft serverseitig ab (Seite: Umleitung zur Übersicht, API: 403). Ausblenden allein reicht nicht.
- [ ] Bis PROJ-46 live ist, zeigt die Startseite der Lehrkraft statt der Leistungsnachweis-Kachel nichts Kaputtes: entweder gar keine Kachel oder eine klar als „bald verfügbar“ markierte.
- [ ] Der Bereichs-Umschalter (PROJ-29) erscheint für Lehrkräfte nicht.

### Willkommen (E4)
- [ ] Beim ersten Öffnen des Lehrkräfte-Bereichs nach der Freischaltung erscheint einmalig ein kurzer Willkommens-Hinweis (höchstens 3 Sätze plus „Los geht’s“), der die verfügbaren Werkzeuge nennt.
- [ ] Nach dem Schließen erscheint er auf keinem Gerät wieder (gemerkt am Konto, nicht nur im Browser).
- [ ] Es wird keine E-Mail verschickt.

### Lern-App für Lehrkräfte (E3)
- [ ] Im Lehrkräfte-Bereich gibt es einen gut sichtbaren Wechsel „Zur Lern-App“, in der Lern-App einen Wechsel zurück „Zum Lehrkräfte-Bereich“.
- [ ] Lehrer-Konten (Lehrkraft, Bereichs-Admin, Super-Admin) erscheinen in der Rangliste wie normale Spieler, aber **immer unter ihrem Pseudonym**. Der Klarname wird dort nie angezeigt, auch wenn „Echten Namen zeigen“ eingeschaltet ist.
- [ ] Weder Rangliste noch Spielerprofil noch sonst ein für Azubis sichtbarer Ort zeigt, dass ein Konto eine Lehrer-Rolle hat (kein Abzeichen, kein Hinweis, kein abweichendes Aussehen).
- [ ] Hat ein Lehrer-Konto noch kein Pseudonym, bekommt es beim Rollenwechsel automatisch eines nach den bestehenden Regeln. Die Lehrkraft kann es danach selbst ändern.
- [ ] Der Ranglisten-Opt-out (`leaderboard_opt_out`) funktioniert für Lehrkräfte wie für alle.
- [ ] Bestehende XP, Münzen, Streak und Hof eines Kontos bleiben beim Rollenwechsel erhalten (nichts wird gelöscht).
- [ ] Lehrkräfte werden aus Nutzungs-Auswertungen über Azubis herausgerechnet (z. B. Fun-Audit-Kennzahlen, Klassen-Statistiken), so wie heute verknüpfte Zweitkonten.

## Edge Cases
- **Schüler tarnt sich:** Ein Azubi registriert sich mit dem Namen einer Lehrkraft. → Er bleibt Azubi, bis der Super-Admin ihn freischaltet. Der Bestätigungsdialog zeigt die E-Mail-Adresse, damit die Verwechslung auffällt.
- **Falsches Konto freigeschaltet:** Der Super-Admin macht versehentlich einen Azubi zur Lehrkraft. → Er kann sofort zurückstufen. Die Rolle wirkt ab der nächsten Anfrage, das Änderungsprotokoll zeigt beide Wechsel.
- **Rolle wird während einer laufenden Sitzung entzogen:** Die Lehrkraft hat den Bereich offen. → Die nächste Aktion oder der nächste Seitenaufruf scheitert mit einem verständlichen Hinweis und einer Umleitung in die Lern-App. Es bleiben keine Altrechte aus zwischengespeicherten Sitzungen.
- **Lehrkraft mit doppeltem Konto:** Eine Kollegin hat sich zweimal registriert (privat und dienstlich). → Beide erscheinen in der Suche mit E-Mail. Der Super-Admin schaltet eines frei. Ein Zusammenführen von Konten ist nicht Teil dieses Features.
- **Login über Google/Apple:** Eine Lehrkraft meldet sich per OAuth an. → Sie wird genauso freigeschaltet und behandelt wie ein E-Mail-Konto.
- **Konto wird gelöscht:** Löscht sich eine Lehrkraft selbst oder wird sie gelöscht, gelten dieselben Regeln wie heute für Admins. Erstellte Leistungsnachweise bleiben erhalten (`created_by` wird leer) und sind für den Super-Admin sichtbar.
- **Super-Admin stuft sich selbst zur Lehrkraft herab:** Der bestehende Schutz des letzten Super-Admins verhindert das, wenn er der letzte ist.
- **Bereichs-Admin wird zur Lehrkraft herabgestuft:** Er verliert die Verwaltungsrechte für seinen Fachbereich, behält aber die Lehrkraft-Funktionen. Sein `department_id` bleibt gespeichert (für den Wechsel in die Lern-App), gibt aber keine Rechte.
- **Lehrkraft-Konto mit Fachbereich:** Das Konto hat durch die Registrierung über eine Bereichs-Adresse bereits einen Fachbereich. → Der Fachbereich bestimmt nur, welche Lern-App sie sieht. Er gibt keine Verwaltungsrechte.
- **Azubi kennt das Pseudonym der Lehrkraft** (z. B. weil sie es in der Klasse erwähnt): Das ist ihre eigene Entscheidung. Die App verrät es nicht.
- **Pseudonym klingt nach Klarnamen** (z. B. „FrauPettinger“): Es gelten die bestehenden Pseudonym-Regeln. Eine zusätzliche Prüfung gibt es nicht.
- **Verknüpftes Zweitkonto (PROJ-29):** Das Tourismus-Testkonto des Super-Admins bleibt ein Azubi-Konto. Der Sitzungswechsel funktioniert unverändert.

## Abgrenzung (nicht Teil dieses Features)
- Neues Layout, Seitenleiste neu, hell/dunkel → PROJ-45
- Leistungsnachweise für Lehrkräfte → PROJ-46
- Inhalte pflegen (Fragen, Themen, Fächer) für eigene Fächer → PROJ-48, abgesichert durch PROJ-47
- Werkzeugkiste mit gemeinsamem Login, Ablage und Regal → spätere Features. Bis dahin bleibt die Werkzeugkiste ein externer Link.
- Klassen- oder Kurs-Zuordnung von Azubis zu Lehrkräften
- Mehrere Schulen

## Technical Requirements
- **Security:** Prüfung von Rolle und Rechten hart auf Server- und Datenbankebene. Jede neue oder geänderte RLS-Policy bekommt Rückweg-SQL im selben Commit. Lehrkräfte dürfen über RLS keine Profile, Noten oder Inhalte von Fachbereichen lesen, für die sie keine Rechte haben.
- **Regression:** Für die 11 Bereichs-Admins und den Super-Admin ändert sich nichts außer den neuen Lehrkraft-Funktionen. Routen-Tests je Rolle: Super-Admin / Bereichs-Admin / Lehrkraft / Azubi.
- **Tests:** Vitest und `npm run build`, RLS-Matrix per SQL in einer Transaktion mit Rollback. Kein Dev-Server und kein Playwright (Projekt-Memory „Kein Dev-Server“).
- **Kosten:** keine neuen Dienste, kein E-Mail-Versand.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
