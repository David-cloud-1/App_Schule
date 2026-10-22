# PROJ-42: „Heute“-Screen – aufgeräumte Spieler-Startseite

## Status: Deployed
**Created:** 2026-10-22
**Last Updated:** 2026-10-22 (deployed)

## Dependencies
- Requires: PROJ-41 (Bottom-Navigation). Sie hat bereits Kacheln, Statistik und Prüfungs-Einstiege von der Startseite verlegt.
- PROJ-3 / PROJ-13 (Quiz, Themenauswahl): „Weiterlernen“ startet eine normale Lernrunde
- PROJ-4 (XP & Level): Level-Fortschritt in der Hero-Karte
- PROJ-5 (Streak): Streak in der Statusleiste und den Wochenpunkten
- PROJ-14 (Lücken schließen): kompakte Nebenaktion
- PROJ-19 (Blitzrunde & Frachtmünzen): kompakte Nebenaktion, Münzstand in der Statusleiste

## Ausgangslage
Die Startseite zeigt viele gleich gewichtete Karten. Die Streak erscheint mehrfach (Level-Karte, Hinweis „Heute noch nicht gelernt“, Wochenaktivität), und drei farbige Aktionen konkurrieren miteinander. Ziel ist **eine Hauptaktion pro Screen**: Öffnen, sehen was heute zu tun ist, mit einem Tap loslernen.

## Aufbau (von oben nach unten)
1. **Statusleiste:** schmal, keine Karte. Enthält Streak 🔥, XP ⚡, Münzen 🪙 und den Avatar mit Profil-Menü.
2. **Begrüßung und Wochenpunkte:** „Hallo, {Name}“ und darunter 7 Punkte (Mo–So) für die Lerntage dieser Woche.
3. **Hero-Karte:** die einzige große Fläche. Sie enthält Tagesziel, Level-Fortschritt und den Button „Weiterlernen“.
4. **Zwei kompakte Nebenaktionen nebeneinander:** Blitzrunde und Lücken schließen.
5. **„Deine Fächer“:** horizontal scrollbare Fortschrittsringe.

## User Stories
- Als Azubi möchte ich beim Öffnen sofort sehen, was heute zu tun ist, damit ich ohne Nachdenken loslegen kann.
- Als Azubi möchte ich mit einem Tap dort weiterlernen, wo ich aufgehört habe, damit ich nicht jedes Mal Fach und Thema neu auswählen muss.
- Als Azubi möchte ich ein klares Tagesziel (10 Fragen) mit Fortschritt sehen, damit ich weiß, wann ich für heute „fertig“ bin.
- Als Azubi möchte ich meine Streak und Woche auf einen Blick sehen, damit ich motiviert bin, sie nicht abreißen zu lassen.
- Als Azubi möchte ich Blitzrunde und Lücken schließen schnell finden, ohne dass sie das normale Lernen verdrängen.
- Als Azubi möchte ich meinen Fortschritt pro Fach kompakt sehen, ohne lange scrollen zu müssen.

## Acceptance Criteria

### Statusleiste
- [ ] Sie zeigt die aktuelle Streak (Flammen-Icon und Zahl), die Gesamt-XP (Blitz-Icon und Zahl), den Münzstand und den Avatar.
- [ ] Ein Tap auf den Avatar öffnet das bestehende Profil-Menü (Profil, ggf. Admin-Bereich, Abmelden).
- [ ] Die Streak-Flamme ist grau, wenn die Streak 0 ist, und orange, wenn sie größer als 0 ist.
- [ ] Die bisherige große Level-Karte und der Hinweis „Heute noch nicht gelernt“ entfallen.

### Begrüßung & Wochenpunkte
- [ ] Die Begrüßung lautet „Hallo, {Anzeigename}“.
- [ ] Darunter stehen 7 Punkte (Mo–So der aktuellen Woche). Gelernte Tage sind gefüllt (orange), der heutige Tag ist markiert und künftige Tage sind leer bzw. gedämpft.
- [ ] Hat der Azubi heute noch nicht gelernt und die Streak ist größer als 0, steht eine kurze Zeile dabei: „Lerne heute, um deine {n}-Tage-Streak zu halten“. Sobald heute gelernt wurde, entfällt sie.

### Hero-Karte
- [ ] Sie zeigt das **Tagesziel: 10 Fragen pro Tag** (fest, für alle gleich) als Fortschritt „x/10 Fragen“ mit Balken. Gezählt werden alle heute beantworteten Fragen aus normalen Runden, Lücken schließen und Blitzrunde.
- [ ] Sie zeigt den Level-Fortschritt kompakt: aktuelles Level, „noch {n} XP → Lvl {n+1}“ und einen dünnen Balken.
- [ ] Sie enthält den Hauptbutton **„Weiterlernen“** (Primary-Grün, volle Breite) und darunter klein das Ziel, z. B. „STG · Frachtvertrag“.
- [ ] „Weiterlernen“ startet direkt eine neue Lernrunde zum **zuletzt gelernten Fach/Thema** des Azubis, ohne Umweg über die Fächerseite.
- [ ] Gibt es kein zuletzt gelerntes Thema oder hat das letzte Thema heute keine Fragen mehr, heißt der Button **„Fach auswählen“** und führt in den Tab „Lernen“ (`/subjects`).
- [ ] Ist das Tagesziel erreicht, zeigt die Karte einen Erfolgszustand („Tagesziel geschafft! 🎉“, Balken voll). Der Button bleibt als „Weiterlernen“ nutzbar.

### Nebenaktionen
- [ ] **Blitzrunde:** eine kompakte Kachel (Icon, „Blitzrunde“, „60 s · 3× Münzen“). Ist sie heute schon gespielt, ist die Kachel gedämpft, zeigt „Morgen wieder“ und ist nicht antippbar.
- [ ] **Lücken schließen:** eine kompakte Kachel (Icon, „Lücken schließen“, „{n} offen“) mit Link zu `/quiz?mode=weak`. Bei 0 Lücken zeigt sie „Keine Lücken 💪“ und ist gedämpft.
- [ ] Beide Kacheln stehen nebeneinander, sind gleich groß und mindestens 44 px hoch.

### Fächer
- [ ] Die Überschrift lautet „Deine Fächer“, darunter liegt eine horizontal scrollbare Reihe aus einem Ring pro Fach des eigenen Fachbereichs.
- [ ] Jeder Ring zeigt den Anteil richtig beantworteter Fragen in der Fachfarbe. In der Mitte steht das Fach-Icon, darunter das Kürzel (z. B. „STG“) und der Prozentwert.
- [ ] Ein Tap auf einen Ring öffnet die bestehende Fach-Auswahl (Themen/Session-Sheet) für dieses Fach.
- [ ] Die ausführlichen Fachkarten mit je zwei Balken entfallen auf der Startseite und bleiben im Tab „Lernen“.

### Gestaltung
- [ ] Nur die Hero-Karte hat Hintergrundfläche und Rahmen. Statusleiste, Begrüßung, Fächer-Reihe und die Überschriften stehen frei auf dem Hintergrund, die Nebenaktionen sind dezent.
- [ ] Ohne Scrollen sind auf einem iPhone (390 × 844) mindestens Statusleiste, Begrüßung, Hero-Karte und Nebenaktionen sichtbar.
- [ ] Erscheinen und Fortschrittsbalken haben dezente Animationen (200 ms, ease-out), wie in DESIGN.md beschrieben.

### Bestehende Elemente
- [ ] Die Onboarding-Karte für neue Nutzer (noch keine Session) bleibt erhalten und steht über der Hero-Karte.
- [ ] Der einmalige Startmünzen-Hinweis (PROJ-19) bleibt erhalten.

## Edge Cases
- **Ganz neuer Azubi:** Streak 0, alle Wochenpunkte leer, Tagesziel 0/10, Button „Fach auswählen“, alle Fachringe bei 0 %. Die Onboarding-Karte ist sichtbar.
- **Zuletzt gelerntes Thema wurde gelöscht oder deaktiviert:** Es gilt das Verhalten wie ohne letztes Thema, also „Fach auswählen“.
- **Zuletzt gelerntes Fach gehört nicht mehr zum eigenen Fachbereich** (z. B. nach dem Bereichswechsel eines Super-Admins, PROJ-29): ebenfalls „Fach auswählen“.
- **Mehr als 10 Fragen heute:** Der Balken bleibt voll, die Zahl zeigt den echten Wert (z. B. „23/10“) und den Erfolgszustand.
- **Tageswechsel um Mitternacht:** Tagesziel und Blitzrunden-Status gelten nach deutscher Zeit (Europe/Berlin), wie Streak und Blitzrunde bisher.
- **Viele Fächer (z. B. 8 im Tourismus):** Die Ringreihe scrollt horizontal. Das Seitenlayout bekommt keinen horizontalen Scroll.
- **Maximales Level erreicht:** Die Level-Zeile zeigt „Max-Level erreicht“ statt „noch n XP“.

## Technical Requirements
- Kein neues Einstellungsfeld nötig, das Tagesziel ist fest 10.
- „Zuletzt gelerntes Fach/Thema“ wird aus den vorhandenen Quiz-Daten ermittelt (letzte abgeschlossene Session).
- Die Startseite soll nicht spürbar langsamer laden als heute.
- Leaderboard-, XP- und Streak-Logik bleiben unverändert. Das Feature ändert nur die Darstellung.

## Non-Goals
- Kein wählbares Tagesziel (5/10/20). Das kann später ergänzt werden.
- Keine gemischte fachübergreifende Runde als Fallback für „Weiterlernen“.
- Keine Änderungen am Quiz-Ablauf selbst.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponentenstruktur
```
Startseite „Heute“ (/)
+-- Statusleiste: 🔥 Streak · ⚡ XP · Münzen (bestehender Baustein) · Avatar/Profil-Menü (bestehend)
+-- Onboarding-Karte (bestehend, nur neue Nutzer) · Startmünzen-Hinweis (bestehend)
+-- Begrüßung + Wochenpunkte Mo–So (NEU)
+-- Hero-Karte (NEU)
|   +-- Tagesziel x/10 + Balken (bzw. Erfolgszustand)
|   +-- Level-Zeile + dünner Balken
|   +-- Button „Weiterlernen“ / „Fach auswählen“ + Ziel-Zeile („STG · Frachtvertrag“)
+-- Nebenaktionen (2 Kacheln)
|   +-- Blitzrunde (bestehende Statusabfrage, neue kompakte Darstellung)
|   +-- Lücken schließen (Anzahl offener Lücken)
+-- „Deine Fächer“: horizontale Ring-Reihe (NEU); Tap öffnet bestehende Themen-Auswahl
+-- (Bottom-Navigation aus PROJ-41)
```

### Woher die Werte kommen (alles aus vorhandenen Daten)
- **Tagesziel:** heutige Antworten (deutsche Zeit) aus normalen Runden und Lücken schließen, plus die richtigen Antworten der heutigen Blitzrunde. Die Blitzrunde speichert keine Einzelantworten, sondern nur die Zahl der richtigen. *Abweichung von der Spec: Bei der Blitzrunde zählen nur die richtigen Antworten.*
- **Wochenpunkte:** Tage mit abgeschlossener Lernrunde oder Blitzrunde in der laufenden Woche (Mo–So, deutsche Zeit).
- **Weiterlernen:**
  - Das Fach ist das der letzten Lernrunde mit Fach.
  - Das Thema wird aus den Fragen dieser Runde abgelesen: Stammten alle aus demselben Thema, war es eine Themen-Runde. Sonst wird das ganze Fach weitergelernt.
  - Geprüft wird, ob es heute noch unbeantwortete aktive Fragen in diesem Fach/Thema gibt. Wenn nein, oder wenn das Fach nicht mehr zum eigenen Bereich gehört, heißt der Button „Fach auswählen“.
- **Lücken:** dieselbe Berechnung wie auf der Fächerseite.
- **Fachringe:** Anteil richtig beantworteter aktiver Fragen, wie bisher in den Fachkarten.

### Entscheidungen
- **Keine Datenbank-Änderung:** Das zuletzt gelernte Thema wird aus vorhandenen Runden und Antworten erschlossen, statt es neu zu speichern. Das ist schneller umgesetzt und ohne Migration risikolos.
- **Die Berechnungen (Wochenpunkte, Tagesziel, Weiterlernen-Ziel) liegen als kleine reine Funktionen in einer eigenen Datei.** So lassen sie sich mit Unit-Tests absichern, ohne die Seite zu starten.
- **Die Themen-Auswahl beim Tippen auf einen Ring** nutzt das bestehende Sheet der Fächerseite.

### Pakete
Keine neuen.

## Implementation Notes (Frontend)
- `src/app/page.tsx` wurde neu aufgebaut. Neue Bausteine: `today-week-dots.tsx`, `today-hero-card.tsx`, `subject-rings.tsx`. `blitz-round-card.tsx` ist jetzt die kompakte Kachel `BlitzRoundTile`. Die Rechenlogik liegt in `src/lib/home-today.ts`.
- **Abweichungen von der Spec:**
  - Bei der Blitzrunde zählen fürs Tagesziel nur die richtigen Antworten, weil keine Einzelantworten gespeichert werden.
  - Die Lücken-Kachel heißt kurz „Lücken“, weil „Lücken schließen“ in die halbe Breite nicht passt.
  - Die Fächerkarten mit zwei Balken gab es im Tab „Lernen“ nie. Der Fortschritt pro Fach steht jetzt nur noch als Ring auf der Startseite. Über den Ringen gibt es zusätzlich einen Link „Alle anzeigen“ zu „Lernen“.
  - Die Onboarding-Karte steht unter der Begrüßung und über der Hero-Karte.
- „Weiterlernen“ nimmt die letzte Runde **mit Fach**. Gemischte Runden über alle Fächer werden übersprungen. Das Thema gilt, wenn alle Fragen der Runde aus einem Thema stammen. Gibt es seit UTC-Mitternacht keine unbeantworteten aktiven Fragen mehr, heißt der Button „Fach auswählen“. Das ist dieselbe Regel, nach der das Quiz Fragen ausblendet.

## QA Test Results
**Datum:** 2026-10-22 · **Methode:** statische Prüfung, Unit-/Komponententests, Abfrage-Plausibilität an der Produktions-DB (nur lesend), Production-Build.

| Kriterium | Ergebnis |
|---|---|
| Statusleiste: Streak, XP, Münzen, Avatar-Menü; graue Flamme bei 0 | ✅ |
| Große Level-Karte und „Heute noch nicht gelernt“ entfernt | ✅ |
| Begrüßung, Wochenpunkte Mo–So (gelernt, heute, künftig), Streak-Hinweis nur wenn nötig | ✅ Test `home-today.test.ts` (inkl. Zeitumstellung 25.10.) |
| Tagesziel x/10, Erfolgszustand, „23/10“ bei mehr als 10 | ✅ Test `today-hero-card.test.tsx` |
| Level-Zeile inkl. Max-Level | ✅ Test |
| Weiterlernen → letztes Fach/Thema; Fallback „Fach auswählen“ | ✅ Tests `pickContinueTarget`; DB-Stichprobe ergibt plausible Ziele (z. B. „LOP · Distributionslogistik“) |
| Blitzrunde-Kachel, nach dem Spielen „Morgen wieder“ und nicht antippbar | ✅ |
| Lücken-Kachel mit Anzahl; bei 0 gedämpft | ✅ |
| Fachringe horizontal scrollbar, Tap öffnet die Themen-Auswahl | ✅ |
| Nur die Hero-Karte als große Fläche | ✅ |
| Erster Bildschirm (390 × 844) zeigt Statusleiste bis Nebenaktionen | ✅ rechnerisch ca. 650 px inkl. Navigation |
| Onboarding und Startmünzen-Hinweis bleiben | ✅ |

**Edge Cases:** Neuer Azubi (keine Runde → „Fach auswählen“, 0 %), gelöschtes Thema, Fach außerhalb des Bereichs, Tageswechsel nach Berliner Zeit, viele Fächer (Reihe scrollt), Max-Level: alle per Test oder Code-Review abgedeckt.
**Sicherheit:** keine neuen Endpunkte. Alle Abfragen laufen mit der eigenen `user_id` bzw. der Session-ID der eigenen letzten Runde über RLS.
**Performance:** zwei zusätzliche kleine Abfragen nach dem Hauptladen (Antworten der letzten Runde, Fragen und Name des Themas).

**Bugs:** keine Critical/High/Medium.
**Entscheidung:** READY

## Deployment
- **Produktion:** https://spedilern.vercel.app, deployed am 2026-10-22 (Commit `c4c160a`, Vercel „Ready“)
- Keine Datenbank-Migration nötig.
- Smoke-Test: geschützte Routen (`/`, `/subjects`, `/profile`, `/betrieb`) leiten ohne Login auf `/login` um, `/login` liefert 200.
- **Offen:** Sichtprüfung am Handy durch den Nutzer (Layout bei 375 px, Leiste bei offener Tastatur, Weiterlernen-Einstieg).
