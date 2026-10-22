# PROJ-41: Bottom-Navigation für Spieler & Umzug der Startseiten-Inhalte

## Status: Deployed
**Created:** 2026-10-22
**Last Updated:** 2026-10-22 (deployed)

## Dependencies
- PROJ-1 (User Authentication): Navigation nur für eingeloggte Spieler
- PROJ-6 (Learning Progress Dashboard): Gesamtstatistik und Wochenaktivität ziehen um
- PROJ-11 (Exam Simulation Mode): Prüfungssimulation und Prüfungsverlauf ziehen um
- PROJ-20 / PROJ-34 (Shop, Mein Betrieb): Shop wird nur noch über den Betrieb erreicht
- Nachfolger: PROJ-42 (Heute-Screen) baut auf dieser Navigation auf

## Ausgangslage
Die Spieler-Startseite enthält bisher alle Einstiege als Kacheln und Karten: Betrieb, Shop, Rangliste, Prüfungssimulation, Statistik und Fächer. Eine feste Navigation gibt es nicht. Deshalb ist die Startseite überladen, und jede Unterseite braucht einen eigenen „Zurück“-Link.

## User Stories
- Als Azubi möchte ich unten eine feste Navigation haben, damit ich mit einem Tap zwischen den Hauptbereichen wechseln kann, wie in Instagram oder Duolingo.
- Als Azubi möchte ich jederzeit sehen, in welchem Bereich ich gerade bin, damit ich mich nicht verliere.
- Als Azubi möchte ich Prüfungssimulation und Prüfungsverlauf beim Lernen finden, weil sie dort thematisch hingehören.
- Als Azubi möchte ich meine Gesamtstatistik und Wochenaktivität in meinem Profil sehen, damit die Startseite frei für das Lernen von heute bleibt.
- Als Azubi möchte ich den Shop direkt in meinem Betrieb erreichen, weil ich dort meine Münzen ausgebe.
- Als Azubi möchte ich, dass die Navigation während eines Quiz verschwindet, damit ich nicht versehentlich eine Runde abbreche.

## Acceptance Criteria

### Navigation
- [ ] Eine Bottom-Navigation ist am unteren Bildschirmrand fixiert und hat 5 Einträge mit Icon und Beschriftung: **Heute** (`/`), **Lernen** (`/subjects`), **Betrieb** (`/betrieb`), **Rangliste** (`/leaderboard`), **Ich** (`/profile`).
- [ ] Der aktive Eintrag ist farbig hervorgehoben (Primary-Grün), die übrigen sind gedämpft (TextMuted).
- [ ] Auf Unterseiten bleibt der passende Eintrag aktiv, z. B. `/shop` → Betrieb und `/exam-history` → Lernen.
- [ ] Jeder Eintrag ist mindestens 44 × 44 px groß.
- [ ] Die Navigation berücksichtigt die Safe Area von iPhones (Home-Indikator), es wird nichts verdeckt.
- [ ] Seiteninhalte haben unten genug Abstand, sodass kein Inhalt hinter der Navigation verschwindet.
- [ ] Die Navigation erscheint auf: `/`, `/subjects`, `/betrieb`, `/shop`, `/leaderboard`, `/profile`, `/exam`, `/exam-history`.
- [ ] Die Navigation erscheint **nicht** in laufenden Sessions (`/quiz`, `/blitzrunde`, laufende Prüfungssimulation, `/pruefung/[code]`), nicht im Admin-Bereich und nicht auf Login-, Registrier- und Passwort-Seiten.
- [ ] Die Navigation hat die Breite `max-w-md` und ist auf Desktop zentriert, wie der Rest der App.

### Umzug der Inhalte
- [ ] **Lernen (`/subjects`):** Oben stehen gut sichtbar die Einstiege „Prüfungssimulation“ und „Prüfungsverlauf“. Fächerliste und „Lücken schließen“ bleiben wie bisher.
- [ ] **Ich (`/profile`):** Die Gesamtstatistik (Richtig / Falsch / Quote) und die Wochenaktivität (7 Tage) werden zusätzlich zu den bisherigen Profilinhalten angezeigt.
- [ ] **Betrieb:** Der Shop bleibt über den vorhandenen Shop-Link im Betrieb erreichbar. Einen eigenen Nav-Eintrag für den Shop gibt es nicht.
- [ ] Auf der Startseite entfallen: die Kacheln Betrieb / Shop / Rangliste, die Gesamtstatistik, die Wochenaktivitäts-Karte, der Button „Prüfungssimulation“ und der Link „Prüfungsverlauf“. Die übrigen Startseiten-Inhalte bleiben bis PROJ-42 unverändert.
- [ ] Die „Zurück zur Startseite“-Pfeile auf den Hauptbereichen (Fächer, Betrieb, Rangliste, Profil) entfallen, weil die Navigation sie ersetzt. Auf Unterseiten wie dem Shop bleibt ein Zurück-Pfeil zum Betrieb erhalten.
- [ ] Das Profil-Menü oben rechts (Admin-Bereich, Abmelden) bleibt erreichbar.

## Edge Cases
- **Admin spielt als Spieler:** Sieht die Navigation wie alle anderen. Der Admin-Zugang bleibt im Profil-Menü.
- **Spieler ohne Fachbereich (PROJ-23):** Wird wie bisher zur Zuordnung umgeleitet. Auf dieser Seite gibt es keine Navigation.
- **Tourismus-Spieler (PROJ-35):** Der Eintrag „Betrieb“ führt zu deren Resort. Die Beschriftung passt sich an, z. B. „Resort“.
- **Sehr kleine Bildschirme (≤ 340 px):** Alle 5 Beschriftungen bleiben einzeilig lesbar, notfalls mit kleinerer Schrift. Es gibt keinen Umbruch.
- **Bildschirmtastatur offen (z. B. Pseudonym im Profil ändern):** Die Navigation darf das Eingabefeld nicht verdecken.
- **Deep-Link auf `/pruefung/[code]` (Leistungsnachweis):** Die Seite erscheint ohne Navigation, damit nichts ablenkt und kein Fokusverlust ausgelöst wird (PROJ-30).

## Technical Requirements
- Kein neues Datenbankfeld nötig. Es ändern sich nur Darstellung und Navigation.
- Die Seitenwechsel über die Navigation sollen sich sofort anfühlen (Next.js-Prefetch).
- Barrierefreiheit: `nav`-Element mit Label, aktiver Eintrag mit `aria-current="page"`.
- Icons: Lucide, `size-6`, gemäß DESIGN.md.

## Non-Goals
- Kein neues Design der Startseite selbst. Das ist PROJ-42.
- Keine Navigation für den Admin- bzw. Lehrkräfte-Bereich, der hat seine eigene (PROJ-40).
- Keine Badges oder Zähler an den Nav-Icons. Das kann eine spätere Erweiterung werden.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponentenstruktur
```
Grundlayout (alle Seiten)
+-- Seiteninhalt
+-- Bottom-Navigation (NEU, erscheint nur auf den Spieler-Hauptbereichen)
    +-- Heute      → /
    +-- Lernen     → /subjects   (aktiv auch auf /exam, /exam-history)
    +-- Betrieb    → /betrieb    (aktiv auch auf /shop; Beschriftung aus dem Fachbereich: „Betrieb“ / „Resort“)
    +-- Rangliste  → /leaderboard
    +-- Ich        → /profile
    +-- Platzhalter-Fläche unter dem Inhalt, damit nichts verdeckt wird

Lernen (/subjects)       + neue Zeile „Prüfungssimulation · Prüfungsverlauf“ oben
Ich (/profile)           + Gesamtstatistik (bestehender Baustein) + Wochenaktivität (bestehender Baustein)
Startseite (/)           − Kacheln, Statistik, Wochenaktivität, Prüfungs-Buttons
Fächer, Rangliste, Profil, Betrieb, Prüfungssimulation, Prüfungsverlauf: Zurück-Pfeil zur Startseite entfällt
Shop                     Zurück-Pfeil führt zum Betrieb statt zur Startseite
```

### Entscheidungen
- **Eine Navigation im Grundlayout statt auf jeder Seite einzeln:** Sie wird nur einmal gebaut. Anhand der aufgerufenen Adresse entscheidet sie selbst, ob sie erscheint (feste Liste der Hauptbereiche). Quiz, Blitzrunde, laufende Prüfung, Leistungsnachweis, Admin und Login bleiben so automatisch frei.
- **Ob es einen Betrieb gibt, wird einmal auf dem Server ermittelt.** Ohne Betrieb (Bereich ohne Grafiken) führt der Eintrag zum Shop. Heute haben Spedition und Tourismus beide einen Betrieb.
- **Nutzt die vorhandenen Statistik-Bausteine** (Gesamtstatistik, Wochenaktivität) im Profil weiter. Das Profil lädt dafür zusätzlich die Antworten und die Lerntage der letzten 7 Tage, genau wie bisher die Startseite.
- Die vorhandene shadcn-„Navigation Menu“-Komponente ist ein Desktop-Dropdown-Menü und passt nicht für eine Tab-Leiste. Die Leiste ist deshalb ein schlankes eigenes `nav`-Element mit Links.

### Daten
Keine neuen Daten, keine Datenbank-Änderung.

### Pakete
Keine neuen.

## Implementation Notes (Frontend)
- `src/components/bottom-nav.tsx` (Leiste) und `src/lib/bottom-nav.ts` (Sichtbarkeit und aktiver Eintrag als reine Funktionen) sind im Grundlayout `src/app/layout.tsx` eingehängt. Dort wird einmal ermittelt, ob der Bereich einen Betrieb hat. Ohne Betrieb heißt der Eintrag „Shop“ und führt zu `/shop`.
- Lernen (`/subjects`): Oben stehen „Prüfungssimulation“ (breit) und „Verlauf“ (kompakt). Ausgeschrieben passt „Prüfungsverlauf“ bei 375 px nicht neben die Simulation. Der Screenreader-Name bleibt „Prüfungsverlauf“.
- Profil: Gesamtstatistik und Wochenaktivität (letzte 7 Tage) sind hinzugekommen. Als Lerntag zählt jetzt auch ein Tag, an dem nur die Blitzrunde gespielt wurde.
- Zurück-Pfeile: Bei Rangliste, Profil und Betrieb entfallen sie. **Abweichung:** Prüfungssimulation und Prüfungsverlauf behalten ihren Pfeil, er führt jetzt zu „Lernen“ statt zur Startseite. Der Shop-Pfeil führt zum Betrieb.
- `subject-progress-card.tsx` wurde entfernt, weil es nicht mehr verwendet wird.

## QA Test Results
**Datum:** 2026-10-22 · **Methode:** statische Prüfung, Unit-/Komponententests, Production-Build. Dev-Server und Playwright laufen auf diesem Rechner nicht. Die Browser-Prüfung am Handy macht der Nutzer.

| Kriterium | Ergebnis |
|---|---|
| 5 Einträge mit Icon und Beschriftung, aktiver Eintrag grün | ✅ Test `bottom-nav.test.tsx` |
| Unterseiten aktivieren den passenden Tab (Shop → Betrieb, Exam → Lernen) | ✅ Test `bottom-nav.test.ts` |
| Touch-Ziele ≥ 44 px | ✅ Einträge 60 px hoch, 1/5 der Breite |
| Safe Area / kein verdeckter Inhalt | ✅ `env(safe-area-inset-bottom)` und Platzhalter unter dem Inhalt |
| Sichtbar nur auf den 8 Hauptseiten, nicht in Quiz/Blitz/Prüfung/Leistungsnachweis/Admin/Login | ✅ Test `bottom-nav.test.ts` |
| `max-w-md` zentriert | ✅ |
| Prüfung in „Lernen“, Statistik und Woche in „Ich“, Shop über den Betrieb | ✅ |
| Kacheln, Statistik, Woche und Prüfungs-Buttons nicht mehr auf der Startseite | ✅ |
| Profil-Menü erreichbar | ✅ in der Statusleiste der Startseite |
| Overlays (Sheet, Dialog) liegen über der Leiste | ✅ z-50 > z-40 |
| `nav` mit Label, `aria-current` | ✅ |

**Sicherheit:** Es gibt keine neuen Endpunkte. Alle neuen Abfragen filtern auf die eigene `user_id` und laufen über den Nutzer-Client mit RLS.
**Regression:** `vitest` 100 Dateien, 1100 Tests grün (vor den neuen Tests). Typprüfung (`src/`) und Lint sind sauber, `npm run build` ist grün.

**Bugs:** keine Critical/High.
- *Low (offen, Beobachtung):* Auf iOS kann die fixierte Leiste bei offener Tastatur über dem Eingabefeld liegen, z. B. beim Pseudonym im Profil. Das ist nicht im Browser verifiziert und muss am Handy geprüft werden.

**Entscheidung:** READY

## Deployment
- **Produktion:** https://spedilern.vercel.app, deployed am 2026-10-22 (Commit `c4c160a`, Vercel „Ready“)
- Keine Datenbank-Migration nötig.
- Smoke-Test: geschützte Routen (`/`, `/subjects`, `/profile`, `/betrieb`) leiten ohne Login auf `/login` um, `/login` liefert 200.
- **Offen:** Sichtprüfung am Handy durch den Nutzer (Layout bei 375 px, Leiste bei offener Tastatur, Weiterlernen-Einstieg).
