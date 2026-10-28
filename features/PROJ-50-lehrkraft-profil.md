# PROJ-50: Lehrkraft-Profil („Mein Konto“) & verkürzte Spielansicht

## Status: Approved
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
- [ ] **E-Mail (= Anmeldename) ändern, ohne Bestätigungs-Mail** (die App verschickt keine; Entscheidung 2026-10-27): Die aktuelle Adresse wird angezeigt. Für die neue Adresse gibt es drei Pflichtfelder: neue Adresse, neue Adresse wiederholen (Einfügen gesperrt), aktuelles Passwort.
- [ ] Die Änderung gilt **sofort** für die Anmeldung. Ein Hinweis sagt das vorher deutlich; nach dem Speichern erscheint „E-Mail-Adresse geändert. Melde dich ab jetzt mit der neuen Adresse an.“ und die angezeigte Adresse (auch im Konto-Menü) ist aktuell.
- [ ] Die Adressen sind ungleich, ungültig oder gleich der aktuellen → Meldung am Feld, nichts wird gesendet. Falsches Passwort → Meldung am Passwort-Feld, nichts wird geändert. Eine bereits vergebene Adresse bekommt dieselbe allgemeine Meldung wie eine ungültige (verrät nicht, wem sie gehört).
- [ ] **Google-/Apple-Konten** (ohne eigenes Passwort) können die Adresse hier nicht ändern; ein Hinweis erklärt, dass das beim Anbieter geschieht.
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
- **Konto über Google/Apple angemeldet** (kein eigenes Passwort): Statt „Passwort ändern“ steht „Passwort festlegen“ (ohne Feld für das aktuelle Passwort); die E-Mail-Adresse ist nicht änderbar (Hinweis statt Formular).
- **Tippfehler in der neuen Adresse**: Weil die Adresse sofort gilt, schützt die doppelte Eingabe (Einfügen gesperrt) davor. Wer es trotzdem falsch hat, meldet sich beim Super-Admin, der die Adresse in der Nutzerverwaltung korrigieren kann.
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
| **E-Mail ändern über den Server, sofort gültig** (Entscheidung 2026-10-27: „es gibt im Moment keine E-Mail-Bestätigung“) | Die App und Supabase verschicken keine Bestätigungs-Mails. Schutz stattdessen durch Passwort-Bestätigung und doppelte Eingabe. Ohne Passwort (Google/Apple) keine Änderung. |
| **„Angesehen“ wird beim Laden der Auswertung gesetzt**, nur wenn die erstellende Person lädt | Kein eigener Knopf nötig; Admins, die mitschauen, verfälschen nichts. |
| **Spielstand auf/zu pro Gerät** im Browser gemerkt | Reine Ansichts-Vorliebe, muss nicht synchronisiert werden. |

### D) Einstellung beim Anmeldedienst
Keine. Da die App keine Bestätigungs-Mails nutzt, ist nichts umzustellen. Eine geänderte E-Mail-Adresse ändert **nicht** den Fachbereich (die Zuordnung nach Mail-Domain greift nur bei Konten ohne Fachbereich).

### E) Was gebaut wird
**Datenbank (1 Migration + Rückweg):** Kürzel-Feld im Profil · „angesehen am“ bei Nachweisen (bestehende geschlossene = angesehen) · Zähl-Funktion für „Mein Beitrag“ (nur eigene Einträge).

**Server-Schnittstellen (neu):** Kürzel speichern · Passwort ändern/festlegen · E-Mail ändern.
**Server-Schnittstellen (angepasst):** Auswertung eines Nachweises setzt „angesehen“, wenn der Ersteller lädt.

**Oberfläche:** Seite „Mein Konto“ mit den Karten oben · Eintrag im Konto-Menü und in der Schnellsuche · `/profile` für Lehrkräfte verkürzt.

**Tests:** Kürzel-Prüfung, Passwort (falsches altes Passwort, Google-Konto), E-Mail (vergeben, ungültig, erneut senden), „angesehen“ nur durch Ersteller, Zahlen nur eigene Einträge, `/profile` Azubi unverändert / Lehrkraft verkürzt.

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
4. `POST /api/profile/email` `{ email, currentPassword }`, die Änderung gilt sofort (siehe „Revision“ in den Backend-Notizen).
5. `creator_viewed_at` setzen, wenn die erstellende Person die Auswertung (`GET /api/admin/assessments/[id]/results`) eines geschlossenen Nachweises lädt; nie bei anderen Personen.
6. (entfällt) Einstellung „Secure email change“ ist nicht mehr nötig, siehe Revision.

## Implementation Notes (Backend, 2026-10-27)

**Entscheidungen des Nutzers (2026-10-27, wegen Regel „Änderungen am Anmelde-Ablauf/Rechten brauchen Freigabe“):** (1) **Kein „Abbrechen“-Knopf** für die E-Mail-Änderung, also auch kein Eingriff in das Schema des Anmeldedienstes. (2) Passwort wird auf dem Server geprüft und dann mit dem Service-Konto gesetzt. (3) Kürzel per Spalten-Recht direkt vom Browser, nicht über das Service-Konto.

**Migration** `20261027_proj50_lehrkraft_konto.sql` (+ `_down`), **noch nicht an der Produktions-DB angewendet**; der Trockenlauf (Block mit `RAISE EXCEPTION`, zurückgerollt) bestand: Format-Regel greift, 4 geschlossene Nachweise würden als „angesehen“ markiert. Inhalt: `profiles.kuerzel` mit Format-Regel `^[A-ZÄÖÜẞ]{2,5}$` und `GRANT UPDATE (kuerzel)`; `graded_assessments.creator_viewed_at` (bestehende geschlossene Nachweise = angesehen). Rein additiv. Keine neue Tabelle, keine neue Policy; die bestehende Policy „profiles_update_own“ begrenzt auf die eigene Zeile.

**Schnittstellen** (alle nur für Lehrer-Rollen, Azubis 403):
- `PATCH /api/profile/kuerzel`, Prüfung mit `parseKuerzel`, schreibt nur die eigene Spalte.
- `POST /api/profile/password`: aktuelles Passwort per Wegwerf-Client geprüft (Sitzung bleibt unberührt), neues per `admin.updateUserById`; Google/Apple-Konten ohne Passwort dürfen eines festlegen; 429 bei Rate-Limit; Passwörter werden nie geloggt.
- `POST /api/profile/email` `{ email, currentPassword }`: prüft das Passwort, setzt die Adresse sofort per Service-Konto (`email_confirm: true`); vergebene und ungültige Adresse geben dieselbe Meldung; Google/Apple-Konten 403.
- `GET /api/admin/assessments/[id]/results` setzt `creator_viewed_at`, wenn die erstellende Person eine geschlossene Auswertung öffnet (Regel in `src/lib/assessment-viewed.ts`). Hinweis: Die Detailseite lädt die Auswertung beim Öffnen immer mit; schließt die Lehrkraft einen Nachweis auf dieser Seite, gilt er dadurch sofort als angesehen. Fehler beim Markieren verhindern die Auswertung nie.

**Tests:** 28 neue Tests (Kürzel, Passwort, E-Mail, „angesehen“, Callback); Gesamtsuite grün.

**Revision 2026-10-27 (E-Mail ohne Bestätigung):** Der Nutzer wies darauf hin, dass es keine E-Mail-Bestätigung gibt. Das ursprünglich geplante Verfahren (Link an die neue Adresse, erneut senden, Rücksprung über `/auth/callback`) wurde komplett entfernt. Stattdessen: sofort gültig, geschützt durch aktuelles Passwort und doppelte Eingabe; Google/Apple-Konten können nicht ändern (Entscheidung „Sofort, mit Schutz“). Der Zusatz im `/auth/callback` und die Hinweis-Komponente wurden zurückgenommen. Hinweis: dass Supabase-Änderungen ohne Bestätigung sofort gelten, ist hier umgesetzt über `email_confirm: true` und unabhängig von der Projekt-Einstellung; im QA an einem Test-Konto bestätigen.

**Vor dem Deploy (Reihenfolge):**
1. Migration an Produktion anwenden (vor dem Push, sonst zeigt „Mein Konto“ einen Fehler).
2. Keine Einstellungen in Supabase Auth nötig.

**Zusammenspiel mit PROJ-58 (Pflichtwechsel):** Setzt PROJ-58 später ein Merkmal „muss Passwort ändern“, muss `POST /api/profile/password` es mit zurücksetzen. Bis dahin berührt PROJ-50 das nicht.

## QA Test Results

**Tested:** 2026-10-28
**App URL:** keine (laut Absprache kein Dev-Server und kein Playwright auf diesem Rechner, siehe Notiz „Kein Dev-Server“)
**Tester:** QA Engineer (AI)
**Methode:** Code-Review aller PROJ-50-Dateien, Vitest (gesamt 1565 Tests grün), `tsc`, Produktions-Build, Datenbank-Simulation an der Produktions-DB als echte Rollen (`SET LOCAL ROLE authenticated` + JWT-Claims) in zurückgerollten Blöcken. **Nicht getestet:** Browser-Darstellung (Chrome/Firefox/Safari, 375/768/1440 px), E2E-Tests, echter E-Mail-Wechsel an einem Konto.

**Fund nebenbei (2026-10-28):** PROJ-50 ist **bereits live**: Der Deploy von PROJ-57/58 (`b1f31a3`) hat `main` gepusht und damit die PROJ-50-Commits bis `c96be8c` mit ausgeliefert. Live-Prüfung ohne Login: alle neuen Schnittstellen 401, `/admin/konto` leitet zur Anmeldung. Die PROJ-50-Migration ist an der Produktions-DB **bereits angewendet** (Spalten, Spalten-Recht, 4 geschlossene Nachweise = angesehen), aber nicht in `schema_migrations` eingetragen und nicht aus dieser Sitzung. Rein additiv, der live laufende Code (ohne PROJ-50) ist davon nicht betroffen. Beim Deploy also nicht noch einmal ausführen (die Format-Regel würde mit „existiert schon“ scheitern).

### Acceptance Criteria Status

#### AC-1: Zugang & Rahmen
- [x] `/admin/konto` im Konto-Menü („Mein Konto“, darunter „Spielerprofil“), in der Schnellsuche und in den Brotkrumen/Handy-Titel
- [x] Lehrkräfte-Rahmen, ws-Farben, Lade-/Leer-/Fehlerzustände je Karte (Code-Review)
- [x] Azubis: Proxy und Layout leiten um; `/admin/konto` ist für reine Lehrkräfte freigegeben

#### AC-2: Kopf
- [x] Name, Rolle mit Satz, Fachbereich bzw. „Kein Fachbereich“, Kürzel
- [x] Kürzel 2–5 Buchstaben inkl. Umlaute, groß gespeichert, leer = entfernen, Fehler am Feld, Toast (Tests + DB: Format-Regel greift, fremde Zeile 0 Treffer, Rolle bleibt gesperrt)
- [x] Kürzel nicht eindeutig

#### AC-3: Meine Fächer
- [x] Lehrkraft: Liste, Hinzufügen, Austragen über dieselben Schnittstellen wie PROJ-48, Leerzustand
- [x] Bereichs-/Super-Admin: Umfangs-Satz (dokumentierte Abweichung: keine eigene Zuständigkeitsliste)

#### AC-4: Mein Beitrag
- [x] Drei Zahlen auf dem Server gezählt, nur eigene Einträge, Stichtag-Hinweis, Leerzustand
- [x] „gelöscht“-Kennzeichen, Papierkorb-Link, endgültig Gelöschtes nicht anklickbar
- [x] „Zuletzt bearbeitet“ führt in die passende Liste; Fragen und Themen öffnen mit dem Titel als Suchtext (`?q=`), so steht der Eintrag oben (BUG-3 behoben, siehe Fix-Notizen)

#### AC-5: Offene Aufgaben
- [x] Drei Gruppen nur eigener Nachweise, je max. 5, „Alle N anzeigen“, „Alles erledigt“
- [x] „angesehen“ nur durch die erstellende Person (DB-Simulation: Update als Ersteller 1 Zeile; Regel-Tests für Fremde)
- [x] Bestehende geschlossene Nachweise gelten als angesehen
- [x] „Laufen gerade“ zeigt die Abgaben der Klasse (BUG-1 behoben)

#### AC-6: Einstellungen
- [x] Passwort ändern (aktuelles Passwort geprüft) bzw. festlegen (Google/Apple), Fehler am Feld, bleibt angemeldet
- [x] E-Mail sofort ändern mit doppelter Eingabe + Passwort; Google/Apple nur Hinweis; vergebene Adresse verrät nichts
- [x] Darstellung teilt den Zustand mit dem Konto-Menü
- [x] Pseudonym neu würfeln, Ranglisten-Teilnahme (wiederverwendete Bausteine im ws-Stil)

#### AC-7: Spielstand
- [x] Eingeklappt Level/XP/Streak, aufgeklappt Balken + Links, Zustand pro Gerät (fehlertolerant)

#### AC-8: `/profile` für Lehrkräfte
- [x] Hinweis-Karte, kurze Spielkarte, Mein Betrieb, Bereichs-Umschalter bleibt; Statistik/Woche/Achievements/Rangliste entfallen (Abfragen werden gar nicht gemacht)
- [x] Azubi-Profil unverändert (Code-Diff: alle Änderungen hinter `isTeacher`)

### Edge Cases Status
- [x] Lehrkraft ohne Fachbereich: „Kein Fachbereich“, Fächer trotzdem wählbar (dokumentierte Abweichung)
- [x] Rollenwechsel: beim nächsten Laden gilt die neue Rolle
- [x] Super-Admin mit Zweitkonto: Seite zeigt das aktive Konto (Sitzung)
- [x] Viele Einträge: Zählungen per `count`, Listen begrenzt
- [x] Google/Apple-Konto: „Passwort festlegen“, keine E-Mail-Änderung
- [x] Tippfehler in neuer Adresse: doppelte Eingabe, Einfügen gesperrt
- [x] Pseudonym: dieselbe Logik wie bisher
- [x] Passwort ändern schlägt fehl → Passwörter werden geleert, auch bei einer Server-Fehlermeldung (BUG-4 behoben)
- [x] Gelöschtes im „Zuletzt bearbeitet“ erscheint mit Link zum Papierkorb, nicht fälschlich als „endgültig gelöscht“ (BUG-5 behoben)

### Security Audit Results
- [x] Ohne Login: alle neuen Schnittstellen 401, Seite leitet zur Anmeldung
- [x] Azubis: neue Schnittstellen 403
- [x] Fremde Daten: alle Abfragen auf die eigene Person gefiltert, RLS zusätzlich; Kürzel einer fremden Zeile lässt sich nicht setzen (0 Zeilen), Rolle nicht änderbar (`insufficient_privilege`)
- [x] Passwort/E-Mail nur mit geprüftem aktuellen Passwort; Passwörter nie geloggt (Test); vergebene Adresse nicht unterscheidbar
- [x] Während eines Pflichtwechsels (PROJ-58) sperrt der Proxy `/api/profile/*`, kein Umgehen des Pflichtwechsels
- [x] Eingaben per Zod geprüft, Ausgabe nur über React (kein XSS-Pfad)
- [x] Die Passwortprüfung beendet die dabei erzeugte Sitzung wieder (BUG-2 behoben)
- [x] Fehlversuche bei der Passwortprüfung sind je Person begrenzt (BUG-6 behoben, siehe Fix-Notizen für die Grenzen)

### Bugs Found

#### BUG-1: Abgaben bei laufenden Nachweisen werden falsch gezählt — BEHOBEN 2026-10-28
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Lehrkraft öffnet einen Nachweis, zwei Azubis geben ab
  2. „Mein Konto“ → Offene Aufgaben → Laufen gerade
  3. Expected: „2 Abgaben“
  4. Actual: „0 Abgaben“ (nur eigene Probe-Abgaben würden gezählt). Ursache: `konto-data.ts` zählt `exam_sessions` mit dem Client der Lehrkraft; die Policy „Users see own exam sessions“ erlaubt nur die eigenen Zeilen. Die Auswertungs-Route nutzt dafür das Service-Konto. In der DB-Simulation bestätigt.
- **Priority:** Fix before deployment

#### BUG-2: Verwaiste Sitzung nach jeder Passwortprüfung — BEHOBEN 2026-10-28
- **Severity:** Low
- **Steps to Reproduce:** Passwort oder E-Mail in „Mein Konto“ ändern → `verifyCurrentPassword` meldet sich mit `signInWithPassword` an und verwirft den Client, ohne die neue Sitzung zu beenden. Expected: keine zusätzliche Sitzung. Actual: je Versuch eine weitere Sitzung in `auth.sessions`.
- **Priority:** Nice to have (z. B. nach der Prüfung `signOut` auf dem Wegwerf-Client)

#### BUG-3: „Zuletzt bearbeitet“ führt nur zur Liste — BEHOBEN 2026-10-28
- **Severity:** Low
- **Steps to Reproduce:** Eintrag in „Zuletzt bearbeitet“ anklicken. Expected (AC): der Inhalt. Actual: die passende Liste ohne Auswahl; die Listen kennen keinen Direktlink.
- **Priority:** Nice to have

#### BUG-4: Passwortfelder bleiben nach Server-Fehler gefüllt — BEHOBEN 2026-10-28
- **Severity:** Low
- **Steps to Reproduce:** Falsches aktuelles Passwort eingeben → „Passwort ändern“. Expected (Edge Case): Passwörter geleert. Actual: alle drei Felder bleiben gefüllt.
- **Priority:** Fix in next sprint

#### BUG-5: Gelöschtes Prüfungsset kann als „endgültig gelöscht“ erscheinen — BEHOBEN 2026-10-28
- **Severity:** Low
- **Steps to Reproduce:** Reine Lehrkraft löscht ein Prüfungsset → „Mein Konto“. Expected: „gelöscht“ mit Link zum Papierkorb. Actual: möglicherweise nicht anklickbar, weil die Existenzprüfung mit dem Client der Lehrkraft läuft und RLS das gelöschte Set verbirgt. Nur aus den Policies abgeleitet, nicht mit Daten nachgestellt (keine Lehrkraft-Konten in der DB).
- **Priority:** Nice to have

#### BUG-6: Gemeinsames Rate-Limit für die Passwortprüfung — BEHOBEN 2026-10-28
- **Severity:** Low
- **Steps to Reproduce:** Viele falsche Passwortversuche über `/api/profile/password` → Supabase antwortet mit 429, auch für andere Lehrkräfte, die kurz danach ihr Passwort ändern wollen (alle Aufrufe kommen von der Server-IP).
- **Priority:** Nice to have (eigenes Limit je Person, z. B. 5 Versuche/10 Min.)

### Summary
- **Acceptance Criteria:** 8 Bereiche geprüft, 6 vollständig bestanden, 2 mit Befund (AC-4 teilweise, AC-5 Abgaben-Zahl)
- **Bugs Found:** 6 total (0 critical, 0 high, 1 medium, 5 low), alle behoben
- **Security:** Bestanden, zwei kleine Härtungs-Hinweise (BUG-2, BUG-6)
- **Production Ready:** YES (keine Critical/High)
- **Stand nach den Fixes (2026-10-28):** Alle 6 Befunde behoben (siehe Fix-Notizen), 1593 Tests grün, Build grün. Die Fixes sind noch nicht deployt.
- **Offen vor dem Deploy:** Sichtprüfung im Browser (Handy + Laptop, hell/dunkel) und ein echter E-Mail-Wechsel an einem Testkonto, beides mangels Dev-Server nur nach dem Deploy bzw. an einer Vorschau-Version möglich

### Fix-Notizen (2026-10-28)
- **BUG-1:** `loadAufgaben` zählt die Abgaben mit dem Service-Konto, aber nur für Nachweise, die die eigene (per RLS gefilterte) Abfrage geliefert hat. Test mit Mock-Clients belegt, dass Sitzungen nie mit dem Lehrkraft-Client gelesen werden.
- **BUG-2:** `verifyCurrentPassword` beendet die Prüf-Sitzung mit `signOut({ scope: 'local' })` (nur diese, nie die der Person), und zwar nur nach erfolgreicher Anmeldung.
- **BUG-3:** `contentHref` hängt für Fragen und Themen `?q=<Titel>` an (auf 80 Zeichen gekürzt, kodiert); die Seiten „Fragen“ und „Themen“ füllen damit ihre Suche vor (`useSearchParams`, Suspense-Grenze). Fächer und Prüfungssets stehen in kurzen Listen und behalten den einfachen Link; ohne Titel oder bei Gelöschtem ebenfalls.
- **BUG-4:** Die drei Passwortfelder werden auch nach einer Server-Fehlermeldung geleert (Eingabefehler im Formular selbst lassen die Felder stehen, damit nichts neu getippt werden muss).
- **BUG-5:** Die Existenzprüfung für Gelöschtes läuft mit dem Service-Konto; sie liefert nur ja/nein für Inhalte, die die Person selbst geändert hat.
- **BUG-6:** `src/lib/attempt-limiter.ts`: höchstens 5 Fehlversuche je Person in 10 Minuten, danach 429 ohne den Anmeldedienst zu fragen; ein Erfolg setzt zurück. **Grenze:** läuft im Speicher der Server-Instanz, ist also keine harte Sperre über alle Instanzen. Es verhindert, dass eine einzelne Person das gemeinsame Limit des Dienstes für alle Lehrkräfte aufbraucht, mehr nicht.
- **Neue Tests (28):** Begrenzer, Konto-Daten (Abgaben, Papierkorb-Prüfung, „angesehen“), Passwort-/E-Mail-Schnittstelle (Sitzung beenden, Begrenzung), Direktlinks, Felder leeren.

## Deployment
_To be added by /deploy_
