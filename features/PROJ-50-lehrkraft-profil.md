# PROJ-50: Lehrkraft-Profil („Mein Konto“) & verkürzte Spielansicht

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle & Freischaltung): Rollen `teacher`, `department_admin`, `admin`
- Requires: PROJ-45 (Lehrkräfte-Arbeitsbereich): Rahmen, Konto-Menü, `ws-*`-Farben, Darstellung hell/dunkel/System
- Requires: PROJ-46 (Leistungsnachweise für Lehrkräfte): eigene Nachweise mit Zustand Entwurf/offen/geschlossen
- Requires: PROJ-47 (Änderungsverlauf): wer hat welchen Inhalt wann geändert
- Requires: PROJ-48 (Fach-Zuständigkeiten): „Meine Fächer“
- Requires: PROJ-49 (Rollen sichtbar trennen): Rollenbezeichnung und Ein-Satz-Beschreibung

## Ausgangslage
Lehrkräfte sehen unter `/profile` dasselbe Spielerprofil wie Azubis (Level, Richtig/Falsch-Statistik, Wochenaktivität, Achievements, Mein Betrieb). Für ihre Arbeit ist das kaum nützlich. Ein Ort für ihr Konto, ihre Fächer, ihren Beitrag und offene Aufgaben fehlt.

## Wer
Alle Rollen mit Zugang zum Lehrkräfte-Bereich: Lehrkraft, Bereichs-Admin, Super-Admin. Für Azubis ändert sich nichts.

## User Stories
- Als Lehrkraft möchte ich auf einer Seite sehen, wer ich in der App bin (Name, Kürzel, Rolle, Fachbereich), damit ich weiß, was ich darf.
- Als Lehrkraft möchte ich meine Fächer direkt im Profil sehen und ändern, damit ich dafür nicht eine andere Seite suchen muss.
- Als Lehrkraft möchte ich sehen, was ich beigetragen habe (Fragen, Nachweise, zuletzt Bearbeitetes), damit ich schnell weiterarbeiten kann.
- Als Lehrkraft möchte ich meine offenen Aufgaben an einer Stelle sehen (Entwürfe, laufende Nachweise, noch nicht angesehene Auswertungen), damit nichts liegen bleibt.
- Als Lehrkraft möchte ich mein Passwort, meine E-Mail-Adresse (Anmeldename), die Darstellung, mein Pseudonym und die Ranglisten-Teilnahme im Profil einstellen, damit ich nicht den Super-Admin fragen muss.
- Als Lehrkraft, die selbst mitspielt, möchte ich meinen Spielstand kurz sehen, ohne dass er die Seite füllt.
- Als Azubi möchte ich mein Profil unverändert behalten.

## Acceptance Criteria

### Zugang & Rahmen
- [ ] Es gibt eine Seite „Mein Konto“ im Lehrkräfte-Bereich (`/admin/konto`), erreichbar über das Konto-Menü (oben im Menü) und die Schnellsuche (⌘K / Strg+K).
- [ ] Die Seite nutzt den Lehrkräfte-Rahmen: `AdminPageHeader`, `ws-*`-Farben, hell/dunkel, Desktop und Handy, Lade-, Leer- und Fehlerzustände aus `admin-states`.
- [ ] Azubis (`student`) kommen nicht auf die Seite (Weiterleitung wie beim übrigen Lehrkräfte-Bereich).

### 1. Kopf
- [ ] Zeigt Anzeigename, Kürzel (falls gesetzt), Rolle (Lehrkraft / Bereichs-Admin / Super-Admin) mit der Ein-Satz-Beschreibung aus PROJ-49 und den Fachbereich.
- [ ] Kürzel ist ein **freiwilliges** Feld, das die Lehrkraft selbst setzt, ändert und leert: 2–5 Zeichen, nur Buchstaben (inkl. Umlaute), wird in Großbuchstaben gespeichert.
- [ ] Ungültige Eingabe zeigt eine verständliche Meldung am Feld; Speichern bestätigt mit Toast.
- [ ] Kürzel muss **nicht** eindeutig sein (zwei Lehrkräfte dürfen dasselbe haben).

### 2. Meine Fächer
- [ ] Listet die eigenen Fach-Zuständigkeiten (PROJ-48).
- [ ] Fächer können direkt hier hinzugefügt und ausgetragen werden; es gelten dieselben Regeln und Rückmeldungen wie auf „Meine Fächer“.
- [ ] Ohne Fächer: Leerzustand mit einem Satz und der Aktion „Fach hinzufügen“.
- [ ] Bereichs-Admins und Super-Admin sehen statt der Liste einen Satz, was sie sehen dürfen (z. B. „Du siehst den ganzen Bereich Spedition.“), plus eigene Zuständigkeiten, falls eingetragen.

### 3. Mein Beitrag
- [ ] Zahlen: Anzahl Fragen, die ich angelegt habe; Anzahl Änderungen an Inhalten (aus dem Änderungsverlauf, ohne Löschungen gesondert zu zählen); Anzahl eigener Leistungsnachweise.
- [ ] Liste „Zuletzt bearbeitet“: die letzten 5 Inhalte, die ich geändert habe, mit Titel/Fragenanfang (gekürzt mit „…“, voller Text im `title`), Art (Frage, Thema, Fach …) und Zeitpunkt („vor 2 Std.“). Jeder Eintrag führt zum Inhalt.
- [ ] Gelöschte Inhalte in der Liste sind als „gelöscht“ gekennzeichnet und führen in den Papierkorb, falls dort noch vorhanden.
- [ ] Gezählt wird nur, was die Person selbst getan hat, unabhängig vom Fachbereich.
- [ ] Ohne jede Aktivität: Leerzustand „Noch nichts bearbeitet“ mit Link zu den Fragen.

### 4. Offene Aufgaben
- [ ] Drei Gruppen, jeweils nur **eigene** Nachweise:
  - **Entwürfe:** Nachweise im Zustand Entwurf.
  - **Laufen gerade:** offene Nachweise mit Anzahl bisheriger Abgaben.
  - **Auswertung noch nicht angesehen:** geschlossene Nachweise, deren Auswertung ich seit dem Schließen noch nicht geöffnet habe.
- [ ] Jeder Eintrag führt direkt zum Nachweis bzw. zu seiner Auswertung.
- [ ] Ein Nachweis verschwindet aus „noch nicht angesehen“, sobald die erstellende Person seine Auswertung einmal geöffnet hat. Andere Personen (z. B. Super-Admin) beim Ansehen ändern das nicht.
- [ ] Wird ein Nachweis wieder geöffnet und erneut geschlossen, gilt er wieder als „noch nicht angesehen“.
- [ ] Pro Gruppe höchstens 5 Einträge, darunter „Alle anzeigen“ (zur gefilterten Nachweis-Liste).
- [ ] Ohne offene Aufgaben: ein Satz „Alles erledigt“, keine leeren Gruppen.

### 5. Einstellungen
- [ ] **Passwort ändern:** aktuelles Passwort, neues Passwort, Wiederholung. Gleiche Mindestregeln wie bei der Registrierung. Falsches aktuelles Passwort → Meldung am Feld. Erfolg → Toast, Person bleibt angemeldet.
- [ ] **E-Mail (= Anmeldename) ändern:** Die aktuelle Adresse wird angezeigt; die Lehrkraft gibt eine neue Adresse ein. An die neue Adresse geht ein Bestätigungslink. Erst nach Klick auf den Link gilt die neue Adresse für die Anmeldung; bis dahin bleibt die alte gültig.
- [ ] Nach dem Absenden zeigt die Seite „Bestätigung ausstehend an <neue Adresse>“ mit der Möglichkeit, den Link erneut zu senden oder die Änderung abzubrechen.
- [ ] Ungültige Adresse oder eine Adresse, die schon zu einem anderen Konto gehört → verständliche Meldung am Feld (ohne zu verraten, wem sie gehört).
- [ ] Nach erfolgreicher Bestätigung: Toast „Deine E-Mail-Adresse wurde geändert“, Person bleibt angemeldet.
- [ ] Der Super-Admin kann E-Mail-Adressen weiterhin in der Nutzerverwaltung ändern.
- [ ] **Darstellung:** Dunkel / Hell / Wie System, dieselbe Einstellung wie im Konto-Menü (beide Stellen zeigen immer denselben Wert).
- [ ] **Pseudonym** ändern (Lehrkräfte erscheinen in der Rangliste nur unter Pseudonym, kein Klarname-Schalter).
- [ ] **Ranglisten-Teilnahme** ein/aus (gleiche Wirkung wie bisher im Spielerprofil).

### 6. Spiel (stark verkürzt)
- [ ] Ein eingeklappter Abschnitt „Mein Spielstand“ mit einer Zeile: Level, XP gesamt, aktueller Streak.
- [ ] Aufgeklappt: XP-Fortschrittsbalken und Link „Mein Betrieb“ sowie „Zum Spielerprofil“.
- [ ] Der Zustand auf/zu wird pro Gerät gemerkt.

### Spielerprofil `/profile` für Lehrkräfte
- [ ] Lehrkräfte sehen oben einen Hinweis „Dein Lehrkraft-Profil findest du unter Mein Konto“ mit Link zu `/admin/konto`.
- [ ] Darunter nur eine kurze Spielkarte: Name/Pseudonym, Level, XP, Streak, XP-Balken und „Mein Betrieb“.
- [ ] **Entfallen** für Lehrkräfte: Gesamtstatistik (Richtig/Falsch/Quote), Aktivität diese Woche, Achievements, Ranglisten-Einstellungen (die sind jetzt in „Mein Konto“).
- [ ] Der Bereichs-Umschalter (PROJ-29) bleibt für den Super-Admin auf `/profile` erhalten.
- [ ] Für Azubis bleibt `/profile` exakt wie bisher.

## Edge Cases
- **Lehrkraft ohne Fachbereich** (PROJ-46): Kopf zeigt „Kein Fachbereich“; Fächer-Abschnitt erklärt, dass Fächer erst mit Fachbereich wählbar sind; Nachweise und Beitrag funktionieren trotzdem.
- **Rolle ändert sich**, während die Seite offen ist (z. B. Lehrkraft wird Bereichs-Admin oder zurück zur Azubi-Rolle): Beim nächsten Laden gilt die neue Rolle; eine Person ohne Lehrkraft-Rolle wird wie im übrigen Bereich weitergeleitet.
- **Super-Admin mit Zweitkonto** (PROJ-29): „Mein Konto“ zeigt immer das gerade aktive Konto.
- **Inhalt im Verlauf wurde endgültig gelöscht** (nicht mehr im Papierkorb): Eintrag bleibt mit gespeichertem Titel sichtbar, ist aber nicht anklickbar.
- **Sehr viele Nachweise/Änderungen**: Zahlen werden auf dem Server gezählt, Listen auf 5 begrenzt; die Seite bleibt schnell.
- **Nachweise von früher** (vor diesem Feature geschlossen): gelten als „bereits angesehen“, damit die Liste beim Start nicht überquillt.
- **Passwort ändern schlägt fehl** (Netzwerk, Server): Fehlermeldung, Felder bleiben ausgefüllt (außer Passwörter werden aus Sicherheitsgründen geleert), Person bleibt angemeldet.
- **Konto über Google/Apple angemeldet** (kein eigenes Passwort): Statt „Passwort ändern“ steht „Passwort festlegen“ (ohne Feld für das aktuelle Passwort); die E-Mail-Änderung zeigt den Hinweis, dass die Google-/Apple-Anmeldung danach evtl. nicht mehr zum Konto passt.
- **Bestätigungslink abgelaufen oder in anderem Browser geöffnet**: verständliche Meldung, Änderung kann neu angestoßen werden; die alte Adresse bleibt gültig.
- **Tippfehler in der neuen Adresse**: Da die alte Adresse bis zur Bestätigung gültig bleibt, sperrt sich niemand aus; „Änderung abbrechen“ löst das.
- **Pseudonym bereits vergeben / unzulässig**: dieselbe Prüfung und Meldung wie bisher im Spielerprofil.
- **Kürzel mit Leerzeichen/Ziffern**: Leerzeichen am Rand werden entfernt, Ziffern/Sonderzeichen abgelehnt.

## Nicht Teil dieses Features
- Profilbild/Avatar
- Anzeigename ändern (bleibt wie bisher)
- Kollegium/Ansprechpartner-Übersicht, Nachweis übergeben, „Als Azubi ansehen“, Fehlermeldungen von Azubis, Lernstand meiner Fächer (eigene spätere Features)
- Änderungen am Azubi-Profil

## Technical Requirements
- Sicherheit: Alle Daten der Seite nur für die angemeldete Person selbst; fremde Nachweise oder Änderungen anderer erscheinen nie.
- Passwort-Änderung prüft das aktuelle Passwort auf dem Server.
- Barrierefreiheit und Bedienelemente nach `docs/DESIGN.md`, Abschnitt Lehrkräfte-Bereich.
- Performance: Seite lädt mit allen Abschnitten in < 1 s bei normalem Datenbestand.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
