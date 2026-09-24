# PROJ-21: Benotete Leistungsnachweise

## Status: Approved
**Created:** 2026-09-14
**Last Updated:** 2026-09-24

## Dependencies
- Requires: PROJ-1 (User Authentication) — Teilnahme nur mit Account
- Requires: PROJ-9 (Admin Content Management) — Admin-Bereich, Rollenprüfung
- Requires: PROJ-11 (Exam Simulation Mode) — Prüfungs-Runner, Timer, Autosave
- Requires: PROJ-15 (Mehrere aktive Prüfungssets) — `exam_question_sets` als Grundlage
- Berührt: PROJ-4 (XP), PROJ-5 (Streak), PROJ-8 (Leaderboard), PROJ-19 (Frachtmünzen) — siehe Belohnungen

## Summary
Der Ausbilder kann aus einem bestehenden Prüfungsset einen **benoteten Leistungsnachweis** machen: einen einmaligen Durchlauf mit eigenem Beitrittscode, Zeitfenster und automatischer Benotung nach IHK-Schlüssel. Die Klasse entsteht implizit — wer den Code eingibt, ist Teilnehmer. Eine dauerhafte Klassen- oder Kohortenzuordnung am Profil gibt es bewusst **nicht** (Klassenstufe 10/11/12 trennt parallele Klassen nicht, siehe PROJ-15).

Ein Leistungsnachweis ist damit klar abgegrenzt von der freien Prüfungssimulation: dort übt man beliebig oft und bewertet offene Antworten selbst, hier zählt genau ein Versuch und die Note steht automatisch fest.

## User Stories
- Als **Ausbilder** möchte ich zu einem Prüfungsset einen benoteten Nachweis mit Code anlegen, damit meine Klasse eine echte Leistungskontrolle schreiben kann, ohne dass ich jeden Azubi vorher einer Klasse zuordnen muss.
- Als **Ausbilder** möchte ich den Code ansagen oder als Link/QR verschicken, damit auch Nachschreiber und Azubis im Homeoffice teilnehmen können.
- Als **Ausbilder** möchte ich nach der Arbeit eine Notenliste mit Klarnamen sehen und exportieren, damit ich die Noten in mein Notenheft übertragen kann.
- Als **Ausbilder** möchte ich sehen, welche Fragen die Klasse reihenweise falsch hatte, damit ich weiß, was ich in der nächsten Stunde wiederholen muss.
- Als **Ausbilder** möchte ich entscheiden, wann die Klasse ihre Noten sieht, damit nicht die ersten Fertigen den anderen die Lösungen zuflüstern.
- Als **Azubi** möchte ich mit einem kurzen Code in die angesagte Prüfung kommen, damit ich nicht in einer Liste nach dem richtigen Set suchen muss.
- Als **Azubi** möchte ich nach einem WLAN-Aussetzer zurück in meine laufende Prüfung, damit mich ein technisches Problem nicht die Note kostet.

## Acceptance Criteria

### Anlegen (Admin)
- [ ] Im Admin unter Prüfungssets gibt es zu jedem Set die Aktion „Benoteten Leistungsnachweis anlegen".
- [ ] Beim Anlegen erfasst der Ausbilder: Titel, Zeitfenster (Start/Ende), Dauer in Minuten (Vorbelegung aus `duration_minutes` des Sets), Notenschlüssel (Vorbelegung IHK).
- [ ] Enthält das gewählte Set mindestens eine offene Frage (`type = 'open'`), wird das Anlegen mit einer klaren Meldung abgelehnt: „Benotete Leistungsnachweise unterstützen nur Multiple-Choice-Fragen. Dieses Set enthält N offene Fragen."
- [ ] Enthält das Set weniger als 5 aktive Fragen, wird das Anlegen abgelehnt.
- [ ] Beim Anlegen wird ein eindeutiger, verwechslungsarmer Beitrittscode erzeugt (Großbuchstaben + Ziffern ohne `0/O`, `1/I/L`; 6 Zeichen, angezeigt in zwei Blöcken, z. B. `7K2M-QX`).
- [ ] Zum Code gehört ein Beitritts-Link mit demselben Token, der als kopierbarer Link und als QR-Code angezeigt wird.
- [ ] Der Nachweis startet im Status **Entwurf** und ist erst nach „Öffnen" beitretbar.
- [ ] Beim Öffnen werden die Fragen-IDs des Sets als Snapshot am Nachweis festgeschrieben; spätere Änderungen am Set verändern eine laufende oder abgeschlossene Prüfung nicht.
- [ ] Der Ausbilder kann einen Nachweis jederzeit manuell schließen (kein weiterer Beitritt) und einen Entwurf löschen.

### Beitreten (Azubi)
- [ ] Es gibt eine Seite zum Code-Eintippen sowie einen Direktaufweg über den Link/QR (Code vorausgefüllt).
- [ ] Der Code wird unabhängig von Groß-/Kleinschreibung, Leerzeichen und Bindestrichen erkannt.
- [ ] Vor dem Start wird einmalig der Klarname (Vor- und Nachname, min. 3 Zeichen) abgefragt und mit der Teilnahme festgeschrieben; der Azubi kann ihn danach nicht mehr ändern.
- [ ] Der Startbildschirm zeigt vorab: Titel, Anzahl Fragen, Dauer, „1 Versuch", „zählt für eine Note" — der Start ist ein bewusster Klick.
- [ ] Ein Leistungsnachweis taucht **nicht** in der normalen Prüfungsauswahl auf; er ist ausschließlich über den Code erreichbar.
- [ ] Beitritt ist nur möglich, solange der Nachweis offen ist und das Zeitfenster läuft; sonst erscheint der Grund („Noch nicht freigegeben" / „Beitritt beendet").

### Schreiben
- [ ] Fragenreihenfolge und Antwortoptionen sind pro Teilnehmer gemischt; die Reihenfolge bleibt für denselben Teilnehmer über die ganze Prüfung stabil (auch nach Wiedereinstieg).
- [ ] Antworten werden laufend gespeichert (wie in PROJ-11).
- [ ] Nach Verbindungsabbruch oder geschlossenem Tab führt derselbe Code zurück in die laufende Prüfung; die Uhr lief währenddessen weiter.
- [ ] Der Timer richtet sich nach der Dauer **ab individuellem Start**; das Ende des Beitrittsfensters beendet laufende Prüfungen nicht.
- [ ] Läuft die eigene Zeit ab, wird automatisch mit den bis dahin gegebenen Antworten abgegeben.
- [ ] Ein zweiter Versuch ist gesperrt; nach Abgabe zeigt der Code nur noch den Status an.
- [ ] Während der Prüfung gibt es keine Auflösung, keine Erklärungen und kein Zurückspringen zu bereits aufgelösten Fragen.

### Benotung
- [ ] Jede Frage zählt einen Punkt; die Prozentzahl ist erreichte Punkte / Gesamtpunkte.
- [ ] Nicht beantwortete Fragen zählen als falsch.
- [ ] Die Note wird automatisch bei Abgabe berechnet — Standard IHK-Schlüssel: 100–92 = 1, 91–81 = 2, 80–67 = 3, 66–50 = 4, 49–30 = 5, 29–0 = 6.
- [ ] Der Notenschlüssel ist pro Leistungsnachweis überschreibbar; die Grenzen müssen lückenlos und absteigend sein, sonst wird das Speichern abgelehnt.
- [ ] `self_score` (Selbstbewertung offener Fragen) ist in diesem Modus nicht erreichbar.

### Ergebnisse (Azubi)
- [ ] Nach Abgabe sieht der Azubi nur eine Bestätigung („Abgegeben — dein Ergebnis wird freigegeben, sobald dein Ausbilder es freischaltet").
- [ ] Erst nach Freigabe durch den Ausbilder sieht er Punkte, Prozent, Note und die Frage-für-Frage-Auflösung mit Erklärungen.
- [ ] Die Freigabe gilt für alle Teilnehmer eines Nachweises gemeinsam (ein Klick).
- [ ] Freigegebene Ergebnisse bleiben im Prüfungsverlauf des Azubis sichtbar und sind dort als benoteter Leistungsnachweis gekennzeichnet.

### Auswertung (Admin)
- [ ] Live-Übersicht während der Arbeit: wie viele sind beigetreten, wie viele schreiben noch, wie viele haben abgegeben.
- [ ] Teilnehmerliste nach Abgabe: Klarname, Punkte, Prozent, Note, Bearbeitungsdauer, Abgabezeit — sortierbar.
- [ ] Notenspiegel: Anzahl je Note 1–6 als Balken, dazu Durchschnittsnote und Bestehensquote.
- [ ] Fragenanalyse: je Frage die Trefferquote, absteigend nach Fehlerhäufigkeit sortiert, mit Verteilung auf die Antwortoptionen.
- [ ] CSV-Export der Teilnehmerliste (Semikolon-getrennt, UTF-8 mit BOM, damit Excel Umlaute korrekt anzeigt).
- [ ] Klarnamen sind ausschließlich in der Admin-Auswertung sichtbar — nie für andere Azubis, nie im Leaderboard, nie in der API-Antwort für Nicht-Admins.

### Belohnungen
- [ ] Ein Leistungsnachweis vergibt **keine** XP und **keine** Frachtmünzen (verhindert Farming und hält die Rangliste vom Notendruck frei).
- [ ] Der Tag zählt für die Streak — der Azubi hat nachweislich gelernt.
- [ ] Beantwortete Fragen fließen nicht in „Lücken schließen" (PROJ-14) ein, solange die Ergebnisse nicht freigegeben sind; danach schon.

## Edge Cases
- **Set wird nach dem Öffnen geändert** (Fragen ergänzt/entfernt) → laufender Nachweis nutzt den Fragen-Snapshot, bleibt unverändert.
- **Frage wird während der Arbeit deaktiviert oder gelöscht** → sie bleibt über den Snapshot Teil der Prüfung; gelöschte Fragen fallen aus der Wertung und reduzieren die Gesamtpunktzahl für alle gleichermaßen.
- **Code-Kollision beim Erzeugen** → neuer Code wird generiert, bis er eindeutig ist (max. 30 Versuche, danach Fehlermeldung).
- **Azubi tritt zweimal bei** (zweites Gerät, zweiter Tab) → er landet in derselben laufenden Prüfung, es entsteht keine zweite Teilnahme.
- **Code gerät an Unbeteiligte** → sie können teilnehmen und erscheinen mit Klarnamen in der Liste; der Ausbilder kann eine Teilnahme aus der Wertung nehmen (bleibt sichtbar, zählt nicht im Notenspiegel).
- **Nachzügler startet 10 Minuten zu spät** → bekommt die volle Bearbeitungszeit, solange das Beitrittsfenster noch offen ist.
- **Nachschreiber** → der Ausbilder öffnet denselben Nachweis erneut oder legt einen zweiten mit neuem Code an; beide Wege müssen funktionieren.
- **Ausbilder gibt Ergebnisse frei, während jemand noch schreibt** → dieser Teilnehmer sieht seine Auflösung erst nach eigener Abgabe.
- **Azubi ohne Account öffnet den Link** → Login/Registrierung, danach automatisch zurück zum Beitritt mit erhaltenem Code.
- **Nachweis wird gelöscht, während jemand schreibt** → Löschen ist nur für Entwürfe und für Nachweise ohne Teilnehmer erlaubt; sonst nur „Schließen".
- **Zwei Nachweise aus demselben Set gleichzeitig offen** (Klasse A und Klasse B) → erlaubt, getrennte Codes, getrennte Auswertungen.
- **Leerer Klarname oder offensichtlicher Fantasiename** → Pflichtfeld mit Mindestlänge; inhaltliche Prüfung ist nicht automatisierbar, der Ausbilder sieht den Namen in der Liste und kann nachfragen.

## Technical Requirements
- **Sicherheit:** Der Beitrittscode ist der einzige Zugangsweg; Codes dürfen nicht erratbar sein (kein fortlaufender Zähler). Rate-Limit auf die Code-Einlösung gegen Durchprobieren.
- **Sicherheit:** RLS — ein Azubi darf ausschließlich seine eigene Teilnahme lesen; Teilnehmerliste, Klarnamen und Fragenanalyse nur für Rolle `admin`.
- **Sicherheit:** Die Korrektheit der Antwortoptionen (`is_correct`) darf vor der Ergebnisfreigabe nicht an den Client ausgeliefert werden — die Bewertung passiert serverseitig.
- **Datenschutz:** Klarnamen sind personenbezogene Leistungsdaten; sie gehören zur Teilnahme, nicht zum Profil, und werden mit dem Nachweis gelöscht.
- **Mobile-First:** Code-Eingabe und Prüfungs-Runner am Smartphone bedienbar; die Admin-Auswertung darf breiter sein (Tabelle mit horizontalem Scroll).
- **Datenmodell (Skizze, Details in /architecture):** neue Tabelle `graded_assessments` (id, exam_set_id, title, access_code unique, question_ids_snapshot, duration_minutes, opens_at, closes_at, status `draft|open|closed`, max_attempts, grading_scale jsonb, shuffle, results_released_at, created_by) sowie `exam_sessions.assessment_id` und `exam_sessions.participant_name`.

## Out of Scope (Phase 2)
- Offene Fragen mit Lehrer-Korrekturansicht (Punkte händisch vergeben) — bewusst zurückgestellt, das Datenmodell bleibt dafür offen.
- Nachträglich eine fehlerhafte Frage aus der Wertung nehmen und alle Noten neu berechnen.
- Gewichtete Fragen (mehr als ein Punkt pro Frage).
- Dauerhafte Klassen/Kurse mit Schülerlisten und Notenverlauf über mehrere Nachweise.
- Aufsichtsfunktionen (Tab-Wechsel erkennen, Vollbildzwang, Sperrmodus).
- Mehrere Admin-/Ausbilder-Accounts mit getrennten Nachweisen (PRD-Non-Goal).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

**Admin-Bereich** (neuer Abschnitt neben „Prüfungssets", analog zu dessen Aufbau)

```
Admin > Prüfungssets
+-- Bestehende Set-Karte
    +-- NEU: Aktion "Leistungsnachweis erstellen"

Admin > Leistungsnachweise (neue Seite)
+-- Liste aller Nachweise (Titel, Set, Status-Badge, Teilnehmerzahl)
+-- "Neu erstellen"-Dialog
|   +-- Set-Auswahl (nur Sets ohne offene Fragen wählbar)
|   +-- Titel, Zeitfenster, Dauer (vorbelegt aus Set)
|   +-- Notenschlüssel-Editor (vorbelegt: IHK-Schlüssel, Grenzen anpassbar)
+-- Detailseite je Nachweis
    +-- Kopfbereich: Code (groß, in 2 Blöcken), Link zum Kopieren, QR-Code
    +-- Status-Steuerung: Entwurf -> Öffnen -> Schließen (+ Löschen nur im Entwurf)
    +-- Live-Kachel: Beigetreten / Schreiben noch / Abgegeben
    +-- Nach Abgaben: "Ergebnisse freigeben"-Button (einmalig, für alle gemeinsam)
    +-- Auswertungs-Tabs
        +-- Teilnehmerliste (Name, Punkte, %, Note, Dauer, Abgabezeit) + CSV-Export
        +-- Notenspiegel (Balken je Note 1-6, Ø-Note, Bestehensquote)
        +-- Fragenanalyse (Trefferquote je Frage, Antwortverteilung)
```

**Azubi-Bereich**

```
Prüfungssimulation-Landing (bestehende Seite)
+-- NEU: Kachel "Ich habe einen Code" -> Beitrittsseite
    (kein neuer Punkt in der Haupt-Navigation nötig — Zugang sonst nur über Link/QR)

Beitrittsseite (neue Route, Code vorausgefüllt bei Link-/QR-Aufruf)
+-- Code-Eingabe (4-6-stellig, Groß-/Kleinschreibung & Trennzeichen egal)
+-- Bei erstem Beitritt: Namensabfrage (Vor-/Nachname)
+-- Infobildschirm: Titel, Fragenzahl, Dauer, "1 Versuch", "zählt für eine Note"
+-- Start-Button

Prüfungs-Runner (bestehender Runner aus PROJ-11, erweitert)
+-- Gleiche Timer-/Autosave-Mechanik wie heute
+-- NEU: feste, pro Teilnehmer gemischte Reihenfolge; kein Zurückblättern zu bereits beantworteten Fragen
+-- Abgabe -> Bestätigungsseite ("Abgegeben, wartet auf Freigabe") statt sofortiger Auflösung

Ergebnisseite (nur nach Freigabe erreichbar)
+-- Wiederverwendung der bestehenden Ergebnis-Ansicht aus PROJ-11, mit Kennzeichnung "Benoteter Leistungsnachweis" und Note zusätzlich zur Prozentzahl

Prüfungsverlauf (bestehende Seite)
+-- Einträge aus Leistungsnachweisen sind mit Note und Badge gekennzeichnet
```

### B) Datenmodell (fachlich beschrieben)

**Neu: Leistungsnachweis** — ein einzelner benoteter Durchlauf zu einem bestehenden Prüfungsset
- Titel, Verweis auf das zugrunde liegende Set
- Eindeutiger Beitrittscode
- Eingefrorene Liste der Fragen (Snapshot beim Öffnen, damit spätere Set-Änderungen nichts mehr beeinflussen)
- Zeitfenster für den Beitritt (Start/Ende) und Dauer je Teilnehmer
- Status: Entwurf / Offen / Geschlossen
- Notenschlüssel (die sechs Grenzwerte, änderbar, IHK-Werte als Vorschlag)
- Zeitpunkt der Ergebnisfreigabe (leer = noch nicht freigegeben)
- Ersteller (Ausbilder)

**Erweiterung: Prüfungssitzung** (bestehende Tabelle aus PROJ-11/15)
- Verweis auf den Leistungsnachweis (leer bei normaler Übungsprüfung)
- Klarname des Teilnehmers, einmalig festgeschrieben
- Die für diesen Teilnehmer feste, gemischte Fragen-/Antwortreihenfolge
- Kennzeichnung, ob die Teilnahme aus der Wertung genommen wurde (für Unbeteiligte, die versehentlich beigetreten sind)
- Punkte, Prozent und berechnete Note liegen wie bisher im Ergebnis-Datensatz der Sitzung

Kein neues Feld am Profil, keine Klassen-Tabelle — die Zuordnung „wer gehört zur Prüfung" ergibt sich ausschließlich aus den Sitzungen, die zu einem Leistungsnachweis gehören.

### C) Tech-Entscheidungen (Begründung)

- **Eigene Tabelle statt Erweiterung der Prüfungssets:** Ein Set bleibt wiederverwendbar für normales Üben; ein Leistungsnachweis ist ein einzelner, terminierter Durchlauf davon. So können zwei Klassen dasselbe Set gleichzeitig mit unterschiedlichem Code und Zeitfenster schreiben, ohne sich zu stören.
- **Fragen-Snapshot beim Öffnen:** Verhindert, dass eine spätere Set-Bearbeitung eine laufende oder bereits bewertete Arbeit rückwirkend verändert — wichtig, sobald einmal Noten vergeben wurden.
- **Code als einziger Zugangsweg, keine Klassenzuordnung:** Setzt die schon in PROJ-15 getroffene Entscheidung fort (Klassenstufe trennt parallele Klassen nicht) und erspart eine Verwaltungsebene, die aktuell niemand pflegen müsste.
- **Serverseitige Bewertung:** Die richtigen Antworten werden dem Browser während der Prüfung nicht mitgegeben — nur die Fragen und Optionen selbst. Ausgewertet wird beim Abgeben auf dem Server, wie es die Sicherheitsanforderung verlangt.
- **Manuelle Ergebnisfreigabe statt automatisch beim Fensterende:** Deckt sich mit der Entscheidung, dass der Ausbilder bewusst freigibt, statt dass Ergebnisse zeitgesteuert erscheinen — praktisch, wenn eine Arbeit doch mal etwas länger dauert.
- **QR-Code wird im Browser aus dem Beitrittslink erzeugt**, nicht über einen externen Dienst — funktioniert offline-tauglich und ohne zusätzliche Kosten, passt zum Low-Budget-Rahmen des Projekts.
- **Kein Eintrag in der Hauptnavigation:** Ein Leistungsnachweis ist ein seltener, terminierter Vorgang. Der Einstieg über eine Kachel auf der bestehenden Prüfungssimulations-Seite plus Link/QR genügt und hält die Navigation aufgeräumt (Design-Prinzip: eine Hauptaktion pro Screen).
- **Wiederverwendung des bestehenden Prüfungs-Runners** (Timer, Autosave, Fortschrittsanzeige aus PROJ-11) statt eines Neubaus — nur Reihenfolge-Fixierung und das Abschalten der sofortigen Auflösung kommen dazu.
- **Keine externe Integration nötig:** Die App bleibt vollständig auf dem bestehenden Supabase/Vercel-Stack; für den Zugriffsschutz (Schutz gegen Code-Erraten) genügt ein einfacher, datenbankgestützter Zähler fehlgeschlagener Versuche je Nutzer — kein zusätzlicher Dienst notwendig.

### D) Abhängigkeiten (zu installierende Pakete)

- Eine schlanke QR-Code-Bibliothek für den Browser (erzeugt den QR-Code aus dem Beitrittslink, keine Server-Anbindung nötig)

Keine weiteren neuen Pakete — Formulare, Tabellen, Dialoge und Diagramme werden mit den bereits vorhandenen shadcn/ui-Komponenten gebaut.

## Implementation Notes (Frontend)

**Stand 2026-09-23 — Frontend gebaut, Backend steht noch aus.** Datenbank-Tabelle
und API-Routen für PROJ-21 existieren noch nicht; alle neuen UI-Bausteine sind
bewusst clientseitig gegen den unten dokumentierten Vertrag verdrahtet und
degradieren beim Fehlschlagen sanft (Lade-/Fehlerzustand statt Absturz) —
geprüft per `npm run build` (fehlerfrei) und vollständigem Testlauf
(324/324 grün, keine Regression).

**Gebaut:**
- `src/components/admin/grading-scale-editor.tsx` — Editor für die sechs
  Notengrenzen, vorbelegt mit dem IHK-Schlüssel, mit Validierung (lückenlos
  absteigend, Note 6 = 0 %)
- `src/components/admin/create-assessment-modal.tsx` — Anlegen-Dialog (Set,
  Titel, Zeitfenster, Dauer, Notenschlüssel)
- `src/app/admin/leistungsnachweise/page.tsx` — Übersicht aller Nachweise,
  öffnet den Anlegen-Dialog auch direkt aus den Prüfungssets heraus
  (`?createFromSet=<id>`)
- `src/app/admin/leistungsnachweise/[id]/page.tsx` — Detailseite: Code/Link/QR
  (`qrcode.react`), Status-Steuerung (Öffnen/Schließen/Löschen/Freigeben),
  Live-Kachel (pollt alle 8 s solange offen), drei Auswertungs-Tabs
  (Teilnehmer inkl. Ausschluss-Checkbox + CSV-Export, Notenspiegel,
  Fragenanalyse)
- `src/app/admin/exam-sets/exam-sets-client.tsx` — neue Aktion „Leistungsnachweis"
  je Set, verlinkt in den vorausgefüllten Anlegen-Dialog
- `src/components/admin/admin-tabs.tsx` — neuer Reiter „Leistungsnachweise"
- `src/components/join-assessment-client.tsx` + `src/app/pruefung/page.tsx` +
  `src/app/pruefung/[code]/page.tsx` — Beitritts-Flow: Code eingeben (oder per
  Link/QR vorausgefüllt) → einmalige Namensabfrage → Infobildschirm → Start;
  bei bereits laufender/abgegebener Teilnahme direkter Sprung zur Session
- `src/app/exam/exam-landing-client.tsx` — Kachel „Ich habe einen Code" auf
  der bestehenden Prüfungssimulations-Seite als einziger Einstiegspunkt neben
  Link/QR (bewusst kein Punkt in der Hauptnavigation)
- `src/app/exam/[sessionId]/page.tsx` + `exam-session-client.tsx` — liest ein
  optionales `results_json.assessment.title` und zeigt es als Badge im Header
  („zählt für eine Note"); der Runner selbst (Timer, Autosave, keine
  Sofortauflösung) ist unverändert wiederverwendet
- `src/app/exam/[sessionId]/results/page.tsx` + `exam-results-client.tsx` —
  vor Freigabe nur „Abgegeben, wartet auf Freigabe" statt Auflösung; nach
  Freigabe zusätzlich Note/Punkte-Karte statt der normalen Trophy-Karte
- `src/app/exam-history/page.tsx` — Leistungsnachweis-Badge und Note (bzw.
  „Note ausstehend") statt der normalen Prozent-/Bestanden-Anzeige
- `src/proxy.ts` — Redirect zu `/login` behält den ursprünglich angeforderten
  Pfad jetzt als `?redirect=` (vorher ging er verloren); `login`- und
  `register`-Seite lesen den Parameter und reichen ihn durch Passwort- und
  OAuth-Login sowie den `/auth/callback?next=`-Umweg durch — nötig, damit ein
  Azubi ohne Session über den Beitrittslink zuerst zum Login kommt und danach
  automatisch mit erhaltenem Code zu `/pruefung/<code>` zurückkehrt (Edge Case
  aus der Spec)

**Bewusste Design-Entscheidung — Ergebnis-Gating über `results_json` statt
neuer Tabellen-Joins:** Die Runner- und Ergebnisseiten sind Server-Components,
die direkt per Supabase-Client auf `exam_sessions` lesen; `graded_assessments`
existiert im generierten `database.types.ts` noch nicht und ließe sich dort
nicht typsicher joinen. Damit das Frontend schon jetzt fertig und typsicher
steht, erwartet es alle nötigen Leistungsnachweis-Infos direkt in
`exam_sessions.results_json.assessment` (`title`, `accessCode`, `released`,
und nach Freigabe zusätzlich `grade`, `points`, `totalPoints`) — vom Backend
bei Beitritt geschrieben und bei Freigabe für jede betroffene Session
aktualisiert. Das entspricht dem bereits bestehenden Muster (`setNames` aus
PROJ-15 liegt genauso in `results_json`).

**Angenommener API-Vertrag für `/backend`** (in dieser Form vom Frontend
erwartet — abweichende Feldnamen brauchen sonst eine Anpassung hier):

*Admin:*
- `GET /api/admin/assessments` → `{ assessments: [{ id, title, examSetName,
  part, status: 'draft'|'open'|'closed', accessCode, participantCount,
  submittedCount, createdAt }] }`
- `POST /api/admin/assessments`, Body `{ examSetId, title, opensAt, closesAt,
  durationMinutes, gradingScale: {grade, minPercent}[] }` → 201 `{ id }`
  (400 bei offenen Fragen im Set, < 5 Fragen, ungültigem Zeitfenster oder
  ungültigem Notenschlüssel)
- `GET /api/admin/assessments/[id]` → volles Detail inkl. `joinUrl`,
  `gradingScale`, `resultsReleasedAt`, `live: { joined, inProgress, submitted }`
- `PATCH /api/admin/assessments/[id]`, Body `{ action: 'open'|'close'|
  'release_results' }` (friert bei `open` den Fragen-Snapshot ein; `release_results`
  schreibt `assessment` in **jede** betroffene `exam_sessions.results_json`)
- `DELETE /api/admin/assessments/[id]` — nur `draft` oder ohne Teilnehmer
- `GET /api/admin/assessments/[id]/results` → `{ participants: [{ sessionId,
  name, points, totalPoints, percent, grade, durationMinutes, submittedAt,
  excluded, status }], gradeDistribution: { counts, average, passRate },
  questions: [{ id, text, correctCount, totalCount, options: [{id, text,
  isCorrect, selectedCount}] }] }`
- `PATCH /api/admin/assessments/[id]/participants/[sessionId]`, Body
  `{ excluded: boolean }`
- `GET /api/admin/assessments/[id]/export` → CSV-Download (Semikolon, UTF-8
  mit BOM)

*Azubi:*
- `POST /api/assessments/lookup`, Body `{ code }` → `{ id, title,
  questionCount, durationMinutes, status: 'not_open'|'open'|'closed',
  needsName, existingSessionId, existingSessionStatus? }`; 404 bei unbekanntem
  Code, 429 bei zu vielen Versuchen (Schutz gegen Code-Erraten)
- `POST /api/assessments/[id]/join`, Body `{ code, participantName? }` →
  `{ sessionId }` — legt die `exam_sessions`-Zeile mit fixierter, gemischter
  Fragen-/Antwortreihenfolge an (oder gibt die bestehende zurück) und
  schreibt `results_json.assessment` hinein
- Bestehende `PATCH /api/exam/sessions/[id]` (save/submit/abort) und
  `/exam/[sessionId]`-Seiten laufen unverändert weiter; das Backend muss dort
  nur intern erkennen, dass es sich um eine Leistungsnachweis-Session handelt
  (z. B. über `assessment_id`), um MC-only + serverseitige Bewertung
  durchzusetzen

**Verifikation:** `npm run build` fehlerfrei, `npm test` 324/324 grün. Ein
kurzer Testlauf mit `next dev` zeigte alle neuen und bestehenden Routen mit
sauberen 307-Redirects zu `/login` (kein 500er) — ein erster Durchlauf hatte
einen `adapterFn is not a function`-Fehler in `src/proxy.ts` gezeigt, der sich
als einmaliger Turbopack-Kaltstart-Fehler erwies und beim erneuten Start nicht
mehr auftrat; betraf ohnehin unveränderte Routen gleichermaßen. Interaktives
Durchklicken mit echtem Login und echten Daten (Beitritts-Flow, Admin-Tabs,
QR-Code-Darstellung) ist in dieser Umgebung nicht möglich — ein manueller Test
durch den Nutzer nach `/backend` wird empfohlen, insbesondere für den
Namensabfrage- und Freigabe-Flow.

**Noch nicht möglich:** Kein Backend heißt, dass jede neue Admin-/Beitritts-
Seite aktuell nur Lade- und Fehlerzustände zeigt (alle `fetch()`-Aufrufe
laufen ins Leere, bis `/backend` die Routen anlegt) — erwartetes, gewolltes
Verhalten in dieser Phase.

## Implementation Notes (Backend)

**Stand 2026-09-23 — Backend gebaut und gegen die produktive Datenbank
angewendet** (Supabase-Projekt „Spedilern App", `riqafwijurbxvywzlipx`, nach
ausdrücklicher Nutzer-Freigabe für Migration, RLS-Policies und die
`proxy.ts`-Änderung am Login-Flow). Migration
`supabase/migrations/20260923_proj21_graded_assessments.sql` — rein additiv,
die 32 bestehenden Prüfungs-Sessions sind unverändert.

**Datenbank:**
- `graded_assessments` — RLS an, **nur** Admin-Policy (`FOR ALL`). Bewusst
  keine Lese-Policy für Schüler: Zugriff ausschließlich über die Code-Routen
  mit Service-Client, damit Entwürfe und abgelaufene Nachweise nicht
  auffindbar sind. `exam_set_id` mit `ON DELETE RESTRICT` (ein Set mit
  Nachweis lässt sich nicht still wegwerfen)
- `exam_sessions` + `assessment_id`, `participant_name`,
  `excluded_from_grading`; Unique-Index `(assessment_id, user_id)` ist die
  eigentliche Ein-Versuch-Sperre (NULL bei normalen Prüfungen → greift dort
  nicht)
- `assessment_lookup_attempts` — Zähler für fehlgeschlagene Code-Eingaben,
  RLS ohne Policy (nur Service-Client)
- `src/lib/database.types.ts` um die neuen Tabellen/Spalten ergänzt (aus dem
  generierten Schema übernommen)

**Direkt an der echten DB verifiziert** (in einer zurückgerollten
Transaktion, danach 0 Nachweise / 32 Sessions wie vorher): Schüler sieht 0
Nachweise, Admin sieht ihn; zweite Session desselben Schülers für denselben
Nachweis scheitert am Unique-Index; normale Prüfungs-Sessions (ohne
`assessment_id`) weiterhin beliebig oft möglich. Security-Advisor: einziger
neuer Hinweis ist „RLS ohne Policy" auf `assessment_lookup_attempts` —
beabsichtigt, gleiches Muster wie die bestehenden `*_progress`-Tabellen.

**API-Routen** (erfüllen den in den Frontend-Notizen dokumentierten Vertrag):
- `GET/POST /api/admin/assessments`
- `GET/PATCH/DELETE /api/admin/assessments/[id]` (Aktionen `open` mit
  Fragen-Snapshot, `close`, `release_results`; Feldänderungen nur im Entwurf;
  Löschen nur Entwurf oder ohne Teilnehmer; jede Admin-Aktion im Audit-Log)
- `GET /api/admin/assessments/[id]/results`, `…/export` (CSV, Semikolon,
  UTF-8 mit BOM), `PATCH …/participants/[sessionId]`
- `POST /api/assessments/lookup` (Rate-Limit: 10 Fehlversuche / 10 Minuten
  je Nutzer → 429), `POST /api/assessments/[id]/join`
- Gemeinsame Logik (Notenschlüssel-Validierung, Benotung, Status aus
  Admin-Status + Zeitfenster, Code-Erzeugung) in `src/lib/graded-assessments.ts`

**Geändert:**
- `PATCH /api/exam/sessions/[id]` — ersetzte `results_json` bei Abgabe
  bisher komplett; trägt jetzt die Nachweis-Infos mit durch und benotet
  sofort, falls die Ergebnisse schon freigegeben waren (Nachzügler)
- `PATCH /api/exam/sessions/[id]/self-score` — 403 für Nachweis-Sessions

**Zwei Sicherheitslücken aus der Frontend-Phase behoben:** Da die
Prüfungs- und Ergebnisseiten Server Components sind, die ihre Daten als Props
an Client Components geben, landete alles in `results_json` im Seitenquelltext
— auch das, was die Oberfläche nicht anzeigt.
- `src/app/exam/[sessionId]/page.tsx` — während eines Nachweises wird
  `is_correct` jeder Antwortoption auf dem Server überschrieben, bevor die
  Seite an den Browser geht (vorher per Quelltext/DevTools ablesbar)
- `src/app/exam/[sessionId]/results/page.tsx` — vor der Freigabe wird die
  komplette Auflösung auf dem Server entfernt, nicht nur ausgeblendet
- Die Benotung liest die richtigen Antworten weiterhin aus dem gespeicherten
  Snapshot in der DB, nie aus Client-Daten

**Entwurfsentscheidungen beim Bauen:**
- **Beitritt nur, wenn Status „offen" UND Zeitfenster läuft** — ein Nachweis,
  den der Ausbilder zu schließen vergisst, nimmt nach `closesAt` trotzdem
  niemanden mehr auf
- **Freigabe erst nach „Beitritt schließen"** — verhindert, dass neue
  Teilnehmer beitreten, während die anderen schon ihre Lösungen sehen
- **„Bestanden" im Notenspiegel = Note 1–4**
- **Admin sieht Noten sofort**, auch vor der Freigabe — die Freigabe steuert
  nur, was die Azubis sehen
- **Reihenfolge-Mischung ohne Frontend-Änderung:** Fragen und Antwortoptionen
  werden beim Beitritt gemischt und so gespeichert (`display_order` neu
  vergeben) — der unveränderte Runner zeigt sie dadurch gemischt und stabil
  auch nach einem Wiedereinstieg

**Tests:** 51 neue (32 für die Benotungs-/Code-Logik, 11 für
`/api/admin/assessments`, 8 für `/api/assessments/lookup`), gesamt 375/375
grün, `npm run build` fehlerfrei. **Nicht durch eigene Tests abgedeckt:**
`join`, `results`, `export`, `participants` und die Änderungen an
`exam/sessions/[id]` — die Kernlogik dahinter (Benotung, Teilnehmerzeilen,
Status) ist über die Lib-Tests abgesichert, die Ein-Versuch-Sperre und RLS
über den DB-Test oben. Ein Durchklicken im Browser war in dieser Umgebung
nicht möglich (der Dev-Server hat den Rechner des Nutzers überlastet).

## QA Test Results

**Tested:** 2026-09-23
**Tester:** QA Engineer (AI)
**Methode:** Code gegen jedes Akzeptanzkriterium geprüft, `npm test` (375/375 grün), `npm run build` (fehlerfrei), Sicherheitsprüfungen direkt an der Produktions-DB mit simulierter Schüler- bzw. Admin-Rolle in zurückgerollten Transaktionen.
**Nicht getestet:** Darstellung im Browser, Responsive (375/768/1440 px), Cross-Browser, Playwright-E2E. Dev-Server und Browser-Tests haben den Rechner des Nutzers mehrfach durch vollen Speicher abstürzen lassen und waren deshalb ausdrücklich ausgeschlossen. Ein manueller Durchlauf am Handy durch den Nutzer steht noch aus.

### Acceptance Criteria Status

#### Anlegen (Admin)
- [x] Aktion „Leistungsnachweis" an jedem Prüfungsset
- [x] Titel, Zeitfenster, Dauer (aus Set vorbelegt), Notenschlüssel (IHK vorbelegt)
- [x] Set mit offenen Fragen wird beim Anlegen mit Anzahl abgelehnt
- [ ] BUG-4: „Weniger als 5 **aktive** Fragen" — gezählt werden alle Fragen-IDs, auch deaktivierte
- [ ] BUG-8: Code eindeutig und aus dem richtigen Alphabet, aber in der Admin-Ansicht ohne Trennstrich (`7K2MQX` statt `7K2M-QX`)
- [x] Beitrittslink zum Kopieren + QR-Code
- [x] Startet als Entwurf, erst nach „Öffnen" beitretbar
- [x] Fragen-Snapshot beim Öffnen
- [x] Schließen jederzeit, Entwurf löschen

#### Beitreten (Azubi)
- [x] Code-Seite und Direktlink mit vorausgefülltem Code
- [x] Groß-/Kleinschreibung, Leerzeichen, Bindestriche egal (Test)
- [x] Klarname einmalig, min. 3 Zeichen, danach nicht änderbar
- [x] Startbildschirm mit Titel, Fragenzahl, Dauer, „1 Versuch", „zählt für eine Note"
- [x] Taucht nicht in der normalen Prüfungsauswahl auf
- [x] Beitritt nur offen + im Fenster, sonst mit Grund

#### Schreiben
- [x] Fragen und Optionen je Teilnehmer gemischt, stabil nach Wiedereinstieg
- [x] Autosave
- [x] Wiedereinstieg mit weiterlaufender Uhr
- [x] Timer ab individuellem Start, Fensterende beendet laufende Arbeiten nicht
- [ ] BUG-2: Automatische Abgabe bei Zeitablauf passiert nur im Browser. Der Server nimmt Antworten auch nach Ablauf noch an
- [x] Zweiter Versuch gesperrt (an der DB geprüft)
- [ ] BUG-1: Die Oberfläche zeigt keine Auflösung, aber die Lösungen sind während der Prüfung abrufbar

#### Benotung
- [x] 1 Punkt je Frage, Prozent = Punkte / Gesamt
- [x] Unbeantwortet = falsch (Test)
- [x] Note nach IHK-Schlüssel (alle Grenzwerte getestet)
- [x] Notenschlüssel überschreibbar, Validierung lückenlos/absteigend
- [x] Selbstbewertung gesperrt (403)

#### Ergebnisse (Azubi)
- [ ] BUG-1: Oberfläche zeigt vor der Freigabe nur die Bestätigung, die Lösungen sind aber über andere Wege abrufbar
- [ ] BUG-3: Nach Freigabe sichtbar, aber **nicht** für Arbeiten, die mit „Beenden" abgegeben wurden
- [ ] BUG-3: Freigabe mit einem Klick erreicht die „Beenden"-Abgaben nicht
- [x] Im Prüfungsverlauf mit Badge und Note gekennzeichnet

#### Auswertung (Admin)
- [x] Live-Übersicht (Beigetreten/Schreiben/Abgegeben)
- [ ] BUG-9: Teilnehmerliste hat alle Spalten, ist aber nicht sortierbar
- [x] Notenspiegel mit Ø-Note und Bestehensquote
- [x] Fragenanalyse nach Fehlerquote sortiert, mit Antwortverteilung
- [x] CSV-Export mit Semikolon + BOM (siehe aber BUG-6, BUG-10)
- [x] Klarnamen nur in Admin-Routen

#### Belohnungen
- [x] Keine XP, keine Frachtmünzen
- [ ] BUG-7: Der Tag zählt **nicht** für die Streak
- [ ] BUG-11: Antworten fließen auch nach Freigabe nicht in „Lücken schließen" ein

### Edge Cases Status
- [x] Set nach dem Öffnen geändert → Snapshot bleibt
- [ ] BUG-4: Frage nach dem Öffnen deaktiviert → spätere Beitritte bekommen weniger Fragen als frühere
- [ ] BUG-5: Offene Frage nach dem Anlegen ins Set gelegt → wird beim Öffnen nicht erneut geprüft und landet im Nachweis
- [x] Code-Kollision → neuer Code (Test)
- [x] Doppelter Beitritt → dieselbe Session (DB-Test + idempotenter Endpunkt)
- [x] Unbeteiligte → aus der Wertung nehmbar
- [x] Nachzügler bekommt volle Zeit
- [ ] BUG-12: Nachschreiber über zweiten Nachweis möglich; ein geschlossener Nachweis lässt sich aber nicht wieder öffnen (laut Spec sollen beide Wege gehen)
- [x] Freigabe während jemand schreibt → wird bei dessen Abgabe sofort benotet und freigegeben
- [x] Ohne Login → Code bleibt über Login/Registrierung erhalten (statisch geprüft)
- [x] Löschen nur als Entwurf oder ohne Teilnehmer
- [x] Zwei parallele Nachweise aus demselben Set
- [x] Name mit Mindestlänge

### Security Audit Results
- [x] Alle neuen Routen verlangen Login; Admin-Routen `requireAdmin` + `proxy.ts`
- [x] Schüler kann `graded_assessments` nicht lesen (DB: 0 Zeilen als Schüler, 1 als Admin)
- [x] Beitritt nur mit passender ID **und** Code
- [x] Code-Erraten gebremst (10 Fehlversuche / 10 Min → 429)
- [x] Klarnamen nicht in Schüler-Antworten
- [x] XSS: alle Namen/Titel laufen durch React-Escaping
- [ ] BUG-1 (Critical): Lösungen während der Prüfung und vor der Freigabe abrufbar
- [ ] BUG-2 (High): Zeitlimit nur im Browser
- [ ] BUG-6 (Medium): CSV-Formel-Injection über den Klarnamen

### Bugs Found

#### BUG-1: Lösungen sind während der Prüfung und vor der Freigabe abrufbar
- **Severity:** Critical (verletzt die Sicherheitsanforderung der Spec: `is_correct` darf vor der Freigabe nicht an den Client)
- **Belegt:** An der Produktions-DB mit Schüler-Rolle geprüft. Ein Schüler kann alle 3.846 richtigen Antwortoptionen lesen.
- **Wege, auf denen die Lösungen abrufbar sind:**
  1. **Tabelle `answer_options`:** Die Policy `answer_options_authenticated_read` gibt jedem eingeloggten Nutzer `is_correct`. Der Anon-Key ist öffentlich im Browser-Bundle. Ein Schüler kann in den DevTools die angezeigten Options-IDs abfragen und bekommt die Lösung. Diese Lücke gibt es schon länger, für PROJ-21 wird sie aber entscheidend.
  2. **Eigene `exam_sessions`-Zeile:** Sie ist per RLS lesbar, direkt per PostgREST, über `GET /api/exam/sessions/[id]` und über `GET /api/exam/history`. `results_json` enthält während der Prüfung `is_correct` je Option und nach der Abgabe (vor der Freigabe) die komplette Auswertung. Die Schwärzung in den Server Components deckt nur die Seiten ab, nicht diese Wege.
  3. **Übungs-API `/api/questions`:** liefert Fragen mit Lösungen, seitenweise nach Thema (max. 50 je Abruf). Wer eine Prüfungsfrage kennt, findet sie dort über den Text. Das ist für das Üben so gewollt.
- **Steps to Reproduce (Weg 1):** Leistungsnachweis starten → DevTools → `supabase.from('answer_options').select('id,is_correct').eq('question_id', <ID aus der Seite>)` → liefert die richtige Option.
- **Fix-Umfang:**
  - Weg 2 lässt sich innerhalb von PROJ-21 schließen: keine Lösungen in der Session-Zeile, benoten und Auflösung schreiben erst bei der Freigabe.
  - Weg 1 braucht eine Spaltenrechte-Änderung an `answer_options` und den Umbau von ca. 15 bestehenden Routen (Quiz, Blitzrunde, Prüfung, Admin) auf den Service-Client. Das ist ein Regressionsrisiko für mehrere bereits ausgelieferte Features.
  - Weg 3 ist eine Produktentscheidung.
- **Priority:** Fix before deployment

#### BUG-2: Zeitlimit wird nur im Browser durchgesetzt
- **Severity:** High
- **Steps to Reproduce:** Prüfung starten → Tab schließen → nach Ablauf der Zeit `PATCH /api/exam/sessions/[id]` mit `{action:'save', answers:{…}}` und danach `submit` aufrufen → wird angenommen und benotet.
- **Expected:** Nach `started_at + Dauer` (plus kleinem Puffer) nimmt der Server keine Antworten mehr an und benotet mit dem letzten Stand davor.
- **Priority:** Fix before deployment

#### BUG-3: „Beenden"-Abgaben werden nie freigegeben
- **Severity:** High
- **Steps to Reproduce:** Im Runner „Beenden → Prüfung abgeben" (setzt `status = 'aborted'`) → Admin schließt und gibt frei → die Freigabe verarbeitet nur `status = 'completed'` → der Azubi sieht dauerhaft „wartet auf Freigabe", im Verlauf „Note ausstehend". In der Admin-Liste hat er dagegen eine Note.
- **Priority:** Fix before deployment

#### BUG-4: Deaktivierte Fragen machen den Nachweis ungleich
- **Severity:** Medium
- **Steps to Reproduce:** Nachweis öffnen → eine der Fragen deaktivieren → neuer Beitritt bekommt diese Frage nicht (`join` filtert `is_active`), frühere Teilnehmer haben sie noch. Laut Spec gilt der Snapshot für alle gleich. Außerdem zählt die ≥5-Prüfung beim Anlegen auch deaktivierte Fragen mit.
- **Priority:** Fix before deployment

#### BUG-5: Offene Fragen können nachträglich in den Nachweis gelangen
- **Severity:** Medium
- **Steps to Reproduce:** Nachweis anlegen (Set rein MC) → offene Frage ins Set aufnehmen → „Öffnen" → der Snapshot enthält die offene Frage. Der Azubi sieht ein Textfeld, die Frage zählt aber nicht.
- **Priority:** Fix before deployment

#### BUG-6: CSV-Formel-Injection über den Klarnamen
- **Severity:** Medium
- **Steps to Reproduce:** Als Name `=HYPERLINK("http://…";"klick")` eingeben → CSV-Export in Excel öffnen → die Zelle wird als Formel ausgeführt.
- **Expected:** Werte, die mit `= + - @` beginnen, werden entschärft (z. B. mit vorangestelltem `'`).
- **Priority:** Fix before deployment

#### BUG-7: Leistungsnachweis zählt nicht für die Streak
- **Severity:** Medium. Die Abgabe berührt `profiles` nicht. Bei normalen Prüfungen ist das genauso, das AK verlangt es für Nachweise aber ausdrücklich.
- **Priority:** Fix in next sprint

#### BUG-8: Code in der Admin-Ansicht ohne Trennstrich
- **Severity:** Low. `formatAccessCode` ist vorhanden, wird in den Admin-Routen aber nicht verwendet.
- **Priority:** Nice to have

#### BUG-9: Teilnehmerliste nicht sortierbar
- **Severity:** Low
- **Priority:** Fix in next sprint

#### BUG-10: Abgabezeit im CSV in UTC
- **Severity:** Low. `toLocaleString` läuft auf dem Server (Vercel = UTC), deshalb liegt die Zeit 1–2 h daneben.
- **Priority:** Nice to have

#### BUG-11: Nachweis-Antworten fließen nie in „Lücken schließen" ein
- **Severity:** Low. PROJ-14 liest nur `quiz_answers`.
- **Priority:** Fix in next sprint

#### BUG-12: Geschlossener Nachweis lässt sich nicht wieder öffnen
- **Severity:** Low. Einen zweiten Nachweis anzulegen funktioniert als Ausweichweg.
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 30/40 bestanden (statisch geprüft)
- **Bugs Found:** 12 gesamt (1 Critical, 2 High, 4 Medium, 5 Low)
- **Security:** Issues found (BUG-1, BUG-2, BUG-6)
- **Production Ready:** NO
- **Recommendation:** Vor dem Deploy mindestens BUG-1 bis BUG-6 beheben. Für BUG-1 Weg 1 ist eine Entscheidung nötig, weil der Fix bestehende Features berührt.

### Nachtest nach den Fixes (2026-09-24)

Der Nutzer hat für BUG-1 den vollständigen Fix gewählt und die Rechte-Änderung an `answer_options` damit freigegeben.

| Bug | Status | Wie behoben / geprüft |
|---|---|---|
| BUG-1 Weg 1 (`answer_options`) | ✅ behoben | Migration `20260924_proj21_lock_answer_key.sql`: `anon`/`authenticated` sehen nur noch `id, question_id, option_text, display_order`. Die 7 Server-Pfade, die den Lösungsschlüssel brauchen (Übungs-API, Lücken schließen, Quiz-Seite, Blitzrunde, Prüfungssimulation, Admin-Fragenliste, Admin-Export), holen ihn über `src/lib/answer-key.ts` mit dem Service-Client. Die Fragen selbst lädt weiter der Nutzer-Client, die RLS-Regeln für Fragen gelten unverändert. Wird erst nach dem Deploy angewendet, weil der alte Code `is_correct` noch direkt liest. |
| BUG-1 Weg 2 (Session-Zeile) | ✅ behoben | Die Nachweis-Session speichert beim Beitritt nur Fragen und Optionen, **ohne** Lösung, Erklärung und Musterlösung. Bei der Abgabe kommen nur die Antworten dazu (`submitted_answers`). Bewertet wird bei der Freigabe mit dem Schlüssel aus der DB (`gradeSnapshot`), die Admin-Ansicht bewertet live. Dadurch sind auch `GET /api/exam/sessions/[id]` und `/api/exam/history` ohne Lösungen. Test: vor der Freigabe stehen weder `is_correct` noch Erklärungen in der Zeile. |
| BUG-1 Weg 3 (Übungs-API) | ✅ behoben | Fragen eines Nachweises, der offen ist oder in dem noch jemand schreibt, fehlen in Übungs-API, Quiz, Lücken schließen, Blitzrunde und Prüfungssimulation (`getLockedQuestionIds`). |
| BUG-2 Zeitlimit | ✅ behoben | Nach `Start + Dauer + 60 s` beantwortet der Server Autosave mit 409 und ignoriert mit einer späten Abgabe geschickte Antworten. Es zählt der letzte rechtzeitig gespeicherte Stand. Getestet. |
| BUG-3 „Beenden"-Abgaben | ✅ behoben | Die Freigabe verarbeitet `completed` **und** `aborted`. Getestet (`applyGrading`). |
| BUG-4 deaktivierte Fragen | ✅ behoben | Beim Anlegen zählen nur aktive Fragen. Beim Öffnen wird der Snapshot auf aktive MC-Fragen eingefroren. Der Beitritt lädt den Snapshot per Service-Client ohne `is_active`-Filter, alle bekommen dieselben Fragen. |
| BUG-5 offene Fragen nachträglich | ✅ behoben | „Öffnen" prüft das Set erneut und lehnt ab, wenn es inzwischen offene Fragen enthält. |
| BUG-6 CSV-Injection | ✅ behoben | `csvEscape` entschärft Werte, die mit `= + - @` beginnen. Getestet. |
| BUG-8 Code-Format | ✅ behoben | Admin-Liste und -Detail zeigen `7K2M-QX`. |
| BUG-10 CSV in UTC | ✅ behoben | Abgabezeit in `Europe/Berlin`. |
| BUG-7, BUG-9, BUG-11, BUG-12 | offen | Medium/Low, Priorität „next sprint" bzw. „nice to have". Blockieren den Deploy nicht. |

**Bekannte Grenze (Nutzungshinweis, kein Bug):** Ist dasselbe Prüfungsset gleichzeitig als normale Prüfungssimulation **aktiviert**, konnten Azubis es vorher üben und die Lösungen sehen. Für einen Leistungsnachweis ein Set nehmen, das nicht zum Üben freigegeben ist.

**Tests:** 396/396 grün (21 neu: `gradeSnapshot`, `applyGrading`, `csvEscape`, `answer-key`, Abgabe-Pfad inkl. Zeitlimit und „keine Lösungen vor Freigabe"). 5 bestehende Testdateien bekommen `answer-key` als Durchreiche gemockt, weil ihre Testdaten `is_correct` schon enthalten. `npm run build` fehlerfrei.

**Production Ready (nach Fixes):** YES. Voraussetzung: Die Sperr-Migration wird direkt nach dem Deploy angewendet und an der DB geprüft.

## Deployment
_To be added by /deploy_
