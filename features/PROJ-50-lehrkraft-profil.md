# PROJ-50: Lehrkraft-Profil („Mein Konto“) & verkürzte Spielansicht

## Status: In Progress
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

### Überblick
Fast alles baut auf Vorhandenem auf: Fach-Zuständigkeiten (PROJ-48), Änderungsverlauf (PROJ-47), Nachweise (PROJ-21/46), Pseudonym/Rangliste (PROJ-8), Darstellung (PROJ-45). Neu sind nur **zwei Datenfelder**, **drei kleine Server-Schnittstellen** (Kürzel, Passwort, E-Mail) und die Seite selbst. Keine neuen Pakete.

### A) Seitenaufbau

```
/admin/konto  „Mein Konto“  (Lehrkräfte-Rahmen, ws-Farben)
+-- AdminPageHeader  (Titel „Mein Konto“, ein Satz)
+-- Zwei Spalten ab Desktop, eine Spalte auf dem Handy
|   Linke Spalte (Arbeit)
|   +-- Karte „Über mich“         Name, Kürzel (Stift → Inline-Bearbeiten), Rolle + Satz, Fachbereich
|   +-- Karte „Offene Aufgaben“   Gruppen: Entwürfe · Laufen gerade (Abgaben) · Auswertung noch nicht angesehen
|   |                             je max. 5, „Alle anzeigen“ → Nachweis-Liste; sonst „Alles erledigt“
|   +-- Karte „Mein Beitrag“      3 Zahlen + „gezählt seit 27.10.2026“ + Liste „Zuletzt bearbeitet“ (5)
|   Rechte Spalte (Konto)
|   +-- Karte „Meine Fächer“      Liste + Hinzufügen/Austragen (gleiche Bausteine wie /admin/my-subjects)
|   |                             Bereichs-Admin/Super-Admin: Umfangs-Satz statt Pflicht-Liste
|   +-- Karte „Anmeldung“         E-Mail (ändern / „Bestätigung ausstehend“) · Passwort ändern bzw. festlegen
|   +-- Karte „Darstellung & Rangliste“  Dunkel/Hell/System · Pseudonym · Ranglisten-Teilnahme
|   +-- Aufklappbereich „Mein Spielstand“  Level · XP · Streak → aufgeklappt: XP-Balken, Mein Betrieb, Spielerprofil
+-- Lade-/Fehlerzustände je Karte (eine Karte mit Fehler blockiert die anderen nicht)

/profile  (Spielerprofil)
+-- Azubi: unverändert
+-- Lehrkraft: Hinweis-Karte „Dein Lehrkraft-Profil → Mein Konto“
               + kurze Spielkarte (Name, Level, XP-Balken, Streak) + Mein Betrieb
               + Bereichs-Umschalter (nur Super-Admin, wie bisher)

Konto-Menü & Schnellsuche: neuer Eintrag „Mein Konto“ (ganz oben)
```

### B) Daten

**Neu im Profil jeder Person:**
- **Kürzel** – optional, 2–5 Buchstaben, groß geschrieben. Nur die Person selbst (und der Super-Admin) darf es ändern.

**Neu bei jedem Leistungsnachweis:**
- **„Auswertung von Ersteller angesehen am“** – Zeitpunkt. Leer = noch nicht angesehen. Wird gesetzt, wenn die erstellende Person die Auswertung zum ersten Mal nach dem Schließen öffnet; wenn andere (Super-Admin, Bereichs-Admin) hineinschauen, passiert nichts.
- Beim Einspielen werden alle **bereits geschlossenen** Nachweise als „angesehen“ markiert, damit die Liste am Start nicht überquillt.
- Hinweis: Ein geschlossener Nachweis kann heute nicht wieder geöffnet werden; der Fall „wieder öffnen“ aus den Edge Cases tritt daher nicht auf.

**Nur gelesen (vorhanden):**
| Abschnitt | Quelle |
|---|---|
| Kopf | Profil (Name, Rolle, Fachbereich, Kürzel) |
| Meine Fächer | Fach-Zuständigkeiten (PROJ-48) |
| Mein Beitrag | Änderungsverlauf (PROJ-47): „angelegt“ = Einträge mit Art *erstellt* bei Fragen; „Änderungen“ = alle eigenen Einträge; Titel kommt aus der gespeicherten Momentaufnahme, daher auch nach endgültigem Löschen lesbar |
| Mein Beitrag – Nachweise | Nachweise mit „erstellt von = ich“ |
| Offene Aufgaben | eigene Nachweise nach Zustand Entwurf / offen / geschlossen + neues Feld; Abgaben aus den Prüfungssitzungen |
| Spielstand | Profil (XP, Streak) |
| Anmeldung | Anmeldedienst: aktuelle E-Mail, ausstehende neue E-Mail, Anmeldeart (Passwort / Google / Apple) |

**Grenze „Mein Beitrag“:** Der Änderungsverlauf existiert erst seit PROJ-47 (27.10.2026). Ältere Arbeit ist niemandem zugeordnet; die Seite sagt das offen („gezählt seit 27.10.2026“).

### C) Technische Entscheidungen

| Entscheidung | Warum |
|---|---|
| **Seite liegt im Lehrkräfte-Bereich** (`/admin/konto`), nicht in `/profile` | Gleicher Rahmen, gleiche Darstellung hell/dunkel, gleicher Zugangsschutz wie alle Lehrkraft-Seiten; das Azubi-Profil bleibt unangetastet. |
| **Daten werden beim Laden auf dem Server gesammelt** (eine Abfragerunde pro Abschnitt, parallel) | Schnell, keine Zusatz-Schnittstelle nur zum Lesen; jede Abfrage nur mit „ich“ als Filter, dadurch sieht niemand fremde Daten. Die Datenbank-Regeln (RLS) gelten zusätzlich. |
| **Zahlen werden in der Datenbank gezählt**, Listen auf 5 begrenzt | Seite bleibt auch bei vielen Änderungen schnell. |
| **Formulare wiederverwenden:** Fächer, Pseudonym, Rangliste, Darstellung | Gleiche Regeln und Meldungen wie bisher; keine zweite Logik, die auseinanderlaufen kann. |
| **Kürzel über eine eigene kleine Schnittstelle** statt direktem Schreiben ins Profil | Prüft Länge/Zeichen auf dem Server und ändert garantiert nur dieses eine Feld (nie z. B. die Rolle). |
| **Passwort ändern über den Server:** prüft erst das aktuelle Passwort, setzt dann das neue | Wer an einem offenen Rechner sitzt, kann das Passwort nicht ohne das alte ändern. Bei Google/Apple-Konten ohne Passwort entfällt das alte Passwort („festlegen“). Der Anmeldedienst begrenzt zu viele Fehlversuche. |
| **E-Mail ändern über den Anmeldedienst (Supabase):** Bestätigungslink **nur an die neue Adresse** (Entscheidung 2026-10-27) | Funktioniert auch, wenn die alte Adresse nicht mehr abrufbar ist. Die alte Adresse gilt bis zum Klick weiter → kein Aussperren durch Tippfehler. Der Link führt über den vorhandenen Anmelde-Rücksprung zurück nach „Mein Konto“ mit Erfolgsmeldung. |
| **E-Mail: „erneut senden“ und „abbrechen“** über den Server | Abbrechen setzt die ausstehende Adresse zurück; dafür braucht es Server-Rechte, daher nicht im Browser. |
| **„Angesehen“ wird beim Laden der Auswertung gesetzt**, nur wenn die erstellende Person lädt | Kein eigener Knopf nötig; Admins, die mitschauen, verfälschen nichts. |
| **Spielstand auf/zu pro Gerät** im Browser gemerkt | Reine Ansichts-Vorliebe, muss nicht synchronisiert werden. |

### D) Einstellung beim Anmeldedienst (einmalig, Super-Admin/Deploy)
- In Supabase Auth: **„Secure email change“ ausschalten** (sonst muss auch die alte Adresse bestätigen). Das gilt projektweit; Azubis haben in der App aber keine E-Mail-Änderung, und die Änderung durch den Super-Admin in der Nutzerverwaltung ist davon nicht betroffen.
- Die Vorlage der Bestätigungs-Mail („Change Email Address“) auf Deutsch prüfen.
- Hinweis: Eine geänderte E-Mail-Adresse ändert **nicht** den Fachbereich (die Zuordnung nach Mail-Domain greift nur bei Konten ohne Fachbereich).

### E) Was gebaut wird
**Datenbank (1 Migration + Rückweg):** Kürzel-Feld im Profil · „angesehen am“ bei Nachweisen (bestehende geschlossene = angesehen) · Zähl-Funktion für „Mein Beitrag“ (nur eigene Einträge).

**Server-Schnittstellen (neu):** Kürzel speichern · Passwort ändern/festlegen · E-Mail ändern / erneut senden / abbrechen.
**Server-Schnittstellen (angepasst):** Auswertung eines Nachweises setzt „angesehen“, wenn der Ersteller lädt.

**Oberfläche:** Seite „Mein Konto“ mit den Karten oben · Eintrag im Konto-Menü und in der Schnellsuche · `/profile` für Lehrkräfte verkürzt · Erfolgsmeldung nach bestätigter E-Mail-Änderung.

**Tests:** Kürzel-Prüfung, Passwort (falsches altes Passwort, Google-Konto), E-Mail (vergeben, ungültig, abbrechen), „angesehen“ nur durch Ersteller, Zahlen nur eigene Einträge, `/profile` Azubi unverändert / Lehrkraft verkürzt.

### F) Pakete
Keine neuen Pakete.

## Implementation Notes (Frontend, 2026-10-27)

**Gebaut:** Seite `/admin/konto` ([page.tsx](../src/app/admin/konto/page.tsx)) mit sieben Karten als Komponenten `src/components/admin/konto-*.tsx` (Über mich, Offene Aufgaben, Mein Beitrag, Meine Fächer, Anmeldung, Darstellung & Rangliste, Spielstand). Gemeinsame Regeln (Kürzel, Passwort, E-Mail, Zeitangaben) in `src/lib/konto.ts`, Datensammlung auf dem Server in `src/lib/konto-data.ts`.
**Eingebunden:** „Mein Konto“ oben im Konto-Menü (der alte Eintrag „Profil“ heißt jetzt „Spielerprofil“), in der Schnellsuche (Aktion „Mein Konto“) und in den Brotkrumen; `/admin/konto` ist für alle Lehrer-Rollen freigeschaltet (`TEACHER_ADMIN_PATHS`).
**`/profile` für Lehrkräfte:** nur Hinweis-Karte „Dein Lehrkraft-Profil“, kurze Profilkarte (Name, Level, Streak, XP-Balken), „Mein Betrieb“ und der Bereichs-Umschalter. Statistik, Wochenaktivität, Achievements und Ranglisten-Einstellungen entfallen (die Abfragen dafür werden bei Lehrkräften gar nicht erst gemacht). Azubi-Profil unverändert.
**Wiederverwendet:** `PseudonymSettings` und `LeaderboardOptOutToggle` haben ein neues Merkmal `workspace` (ws-Farben statt fester Hex-Werte).
**Tests:** 28 neue Tests (`konto.test.ts`, `konto.test.tsx`), angepasst: Konto-Menü, Schnellsuche, Brotkrumen, Zugangsregeln. Gesamt 1479 Tests grün, Build grün.

**Abweichungen von der Beschreibung**
- **Bereichs-Admin/Super-Admin:** Die Fächer-Schnittstelle (`/api/admin/my-subjects`) ist bewusst nur für Lehrkräfte (PROJ-48). Diese Rollen sehen daher nur den Umfangs-Satz („Du siehst den ganzen Bereich …“), keine eigene Zuständigkeitsliste.
- **Lehrkraft ohne Fachbereich:** „Meine Fächer“ listet alle aktiven Bereiche; Fächer sind also auch ohne eigenen Fachbereich wählbar. Der geplante Erklärtext „erst mit Fachbereich wählbar“ entfällt.
- **„Mein Beitrag“:** Zähl-Funktion in der Datenbank ist nicht nötig; einfache Zählabfragen auf `content_versions` und `graded_assessments` genügen (RLS erlaubt jedem die eigenen Zeilen).

**Für /backend offen (die Oberfläche ruft diese Stellen schon auf)**
1. Migration (vor dem Deploy einspielen, sonst zeigt die Seite einen Fehler): `profiles.kuerzel` (text, optional) und `graded_assessments.creator_viewed_at` (timestamptz). Bestehende geschlossene Nachweise einmalig auf „angesehen“ setzen. Kürzel nur durch die Person selbst oder den Super-Admin änderbar; die Rolle darf dadurch nie änderbar werden.
2. `PATCH /api/profile/kuerzel` mit `{ kuerzel: string | null }` (Prüfung mit `parseKuerzel` aus `src/lib/konto.ts`).
3. `POST /api/profile/password` mit `{ currentPassword?, newPassword }`; prüft das aktuelle Passwort, bei Konten ohne Passwort entfällt es. Fehlerform `{ error, field?: 'currentPassword' | 'newPassword' }`.
4. `POST /api/profile/email` `{ email }` (Bestätigungslink nur an die neue Adresse), `PUT` = Link erneut senden, `DELETE` = ausstehende Änderung abbrechen. Rücksprung des Links nach `/admin/konto?email=bestaetigt` (bei Fehler `?email=fehler`).
5. `creator_viewed_at` setzen, wenn die erstellende Person die Auswertung (`GET /api/admin/assessments/[id]/results`) eines geschlossenen Nachweises lädt; nie bei anderen Personen.
6. Vor dem Deploy: in Supabase Auth „Secure email change“ ausschalten.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
