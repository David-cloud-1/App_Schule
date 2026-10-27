# PROJ-56: Alte Werkzeugkiste ablösen

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Letzter Schritt des Werkzeugkiste-Umzugs (Übersicht in PROJ-51). Solange PROJ-51 bis PROJ-55 gebaut werden, läuft die alte Werkzeugkiste auf Hugging Face (divadl-werkzeugkiste.hf.space) unverändert weiter. Kolleginnen und Kollegen haben dort Lesezeichen, und die Anleitung verweist darauf. Dieses Feature sorgt dafür, dass niemand ins Leere läuft und es am Ende nur noch **eine** Werkzeugkiste gibt.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1 – Parallelbetrieb bis zum Schluss:** Die alte Werkzeugkiste bleibt nutzbar, bis alle 13 Werkzeuge in der App laufen.
- **E2 – Neustart der Daten:** Alte Konten, Ablage und Regal werden nicht übernommen (PROJ-51, E3).

## Dependencies
- Requires: PROJ-51, PROJ-52, PROJ-53, PROJ-54, PROJ-55, alle live

## User Stories
- Als **Lehrkraft mit altem Lesezeichen** möchte ich auf die neue Werkzeugkiste geleitet werden, damit ich nicht vor einer toten Seite stehe.
- Als **Lehrkraft mit Material in der alten Ablage** möchte ich rechtzeitig erfahren, dass die alte Werkzeugkiste abgeschaltet wird, damit ich meine Dateien vorher herunterladen kann.
- Als **Betreiber** möchte ich nur noch ein System pflegen, damit Änderungen nicht doppelt gemacht werden müssen.

## Acceptance Criteria

### Ankündigung
- [ ] Sobald PROJ-54 live ist, zeigt die alte Werkzeugkiste oben einen nicht wegklickbaren Hinweis: „Die Werkzeugkiste ist umgezogen: [Link zur App]. Diese Seite wird am [Datum] abgeschaltet. Lade dein Material aus der Ablage bis dahin herunter.“
- [ ] Zwischen Ankündigung und Abschaltung liegen mindestens 4 Wochen.
- [ ] Die Anleitung (`/anleitung`) und die README der alten Werkzeugkiste verweisen auf die App.

### Umleitung
- [ ] Nach der Abschaltung zeigt die alte Adresse nur noch eine schlichte Seite: „Die Werkzeugkiste ist jetzt Teil der Lern-App“ mit Knopf zur Anmeldung. Sie leitet nach wenigen Sekunden automatisch weiter.
- [ ] In der App verweist nichts mehr auf die alte Adresse: Navigation, Schnellsuche, Startseiten-Kachel und `WERKZEUGKISTE_URL` werden entfernt bzw. durch die App-Seite ersetzt.

### Aufräumen
- [ ] Der alte Hugging-Face-Space läuft nur noch als Weiterleitungsseite, ohne Upload, Konten oder Datenbankzugriff.
- [ ] Das pausierte Supabase-Projekt `werkzeugkiste` wird nach Ablauf der Frist **nicht automatisch** gelöscht. Der Nutzer entscheidet selbst und ausdrücklich über die Löschung.
- [ ] Der Python-Kern wird nur noch an einer Stelle gepflegt. Die Doku in `~/Schule/Werkzeugkiste` (CLAUDE.md/README) sagt klar, wo das ist.

## Edge Cases
- **Lehrkraft versucht nach der Abschaltung, alte geteilte Links (`/geteilt/…`) zu öffnen:** Sie landet auf der Weiterleitungsseite mit dem Hinweis, dass geteilte Links der alten Werkzeugkiste nicht mehr gelten.
- **Fehler in der neuen Werkzeugkiste kurz nach der Umstellung:** Bis zur Abschaltung kann die alte Werkzeugkiste als Ausweich genannt werden. Danach gilt der normale Fehlerweg der App.
- **Ein Werkzeug funktioniert in der App noch nicht gleichwertig:** Dann wird nicht abgeschaltet. Die Abschaltung setzt voraus, dass die Vergleichstests aus PROJ-51 und PROJ-54 grün sind.

## Technical Requirements
- **Kein Datenverlust ohne Ansage:** Abschaltung erst nach Ankündigung und Frist (siehe oben).
- **Kosten:** Danach läuft nur noch das bestehende Hosting der App.

## Abgrenzung (nicht Teil dieses Features)
- Datenübernahme aus der alten Ablage (bewusst nicht, E2)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
