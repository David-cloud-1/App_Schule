# PROJ-59: Nutzer-Detailseite (Super-Admin)

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
