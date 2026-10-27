# PROJ-60: Konto löschen (DSGVO)

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
