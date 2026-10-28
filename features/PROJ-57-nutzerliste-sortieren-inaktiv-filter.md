# PROJ-57: Nutzerliste – Sortieren & Inaktiv-Filter

## Status: Deployed
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Die Nutzerverwaltung (`/admin/users`) ist fest nach XP sortiert. Suchen, Rollen-Filter und „Alle Bereiche“ (nur Super-Admin) gibt es schon. Admins wollen die Liste nach jeder Spalte ordnen und schnell sehen, wer nicht mehr lernt. Das hilft gegen das Rückkehrproblem (94 % kommen nicht wieder).

### Entscheidungen (Nutzer, 2026-10-27)
- **E1:** Sortieren und Inaktiv-Filter gibt es für **alle Admins**: Super-Admin und Bereichs-Admin, jeweils im Bereich, den sie sehen.
- **E2:** Inaktiv-Filter mit den Stufen **7 / 14 / 30 Tage** plus **„Nie eingeloggt“**. Grundlage ist die letzte Lern-Session.
- **E3:** Klassen oder Gruppen gibt es nicht. Es gibt deshalb keinen Klassen-Filter.

## Dependencies
- Requires: PROJ-9 (Admin-Panel), PROJ-24 (Bereichstrennung), PROJ-45 (Layout, Tabellen-Regeln)
- Wird genutzt von: PROJ-61 (Export nimmt die sortierte und gefilterte Liste)

## User Stories
- Als **Admin** möchte ich auf eine Spaltenüberschrift tippen und die Liste danach sortieren, damit ich z. B. die zuletzt eingeloggten Personen oben sehe.
- Als **Admin** möchte ich die Sortierrichtung mit einem zweiten Tippen umdrehen, damit ich auch die schwächsten oder ältesten Einträge oben habe.
- Als **Admin** möchte ich mit einem Klick alle sehen, die seit 7, 14 oder 30 Tagen nicht gelernt haben, damit ich sie ansprechen kann.
- Als **Admin** möchte ich alle sehen, die sich nie eingeloggt haben, damit ich Registrierungsprobleme erkenne.
- Als **Admin** möchte ich, dass Sortierung und Filter beim Neuladen erhalten bleiben, damit ich einen Link auf genau diese Ansicht teilen oder speichern kann.

## Acceptance Criteria

### Sortieren
- [ ] Sortierbar sind: Name, E-Mail, Bereich (nur in „Alle Bereiche“), XP, Streak, Letzte Session, Letzter Login und Status.
- [ ] Ein Klick auf eine Überschrift sortiert nach dieser Spalte. Der erste Klick nutzt die sinnvolle Richtung: Texte A→Z, Zahlen und Daten absteigend (höchste bzw. neueste oben). Ein zweiter Klick dreht die Richtung um.
- [ ] Die aktive Spalte zeigt einen Pfeil (auf/ab). Die Überschrift ist ein Button mit `aria-sort` und mindestens 44 px hoch.
- [ ] Leere Werte („nie“, kein Name, kein Bereich) stehen in beiden Richtungen immer **am Ende**.
- [ ] Namen werden deutsch sortiert (Umlaute richtig, Groß/Klein egal).
- [ ] Status-Reihenfolge: Aktiv vor Gesperrt.
- [ ] Bei gleichen Werten entscheidet der Name (A→Z), damit die Reihenfolge stabil bleibt.
- [ ] Standard ohne Auswahl: XP absteigend, wie heute.
- [ ] Am Handy gibt es zusätzlich ein Auswahlfeld „Sortieren nach“, weil Überschriften in der seitlich scrollenden Tabelle schwer zu treffen sind.

### Inaktiv-Filter
- [ ] Neben dem Rollen-Filter gibt es ein Auswahlfeld „Aktivität“ mit: Alle · Seit 7 Tagen inaktiv · Seit 14 Tagen inaktiv · Seit 30 Tagen inaktiv · Nie eingeloggt.
- [ ] „Seit X Tagen inaktiv“ zeigt Personen, deren letzte Lern-Session mehr als X Tage zurückliegt, **oder** die nie eine Session hatten.
- [ ] „Nie eingeloggt“ zeigt Personen ohne einen einzigen Login.
- [ ] Die Tage werden nach Kalendertagen in deutscher Zeit (Europe/Berlin) gezählt, wie beim Streak.
- [ ] Der Filter kombiniert sich mit Suche, Rollen-Filter und „Alle Bereiche“ (UND-Verknüpfung).
- [ ] Die Kopfzeile zeigt weiter „{gefiltert} von {gesamt}“.
- [ ] Ergibt die Filterung nichts, erscheint ein Leerzustand („Niemand passt zu diesem Filter“) mit der Aktion „Filter zurücksetzen“.

### Gedächtnis
- [ ] Sortierung, Richtung und Aktivitätsfilter stehen in der Adresse (z. B. `?sort=login&dir=asc&aktiv=14`). Neuladen und geteilte Links zeigen dieselbe Ansicht.
- [ ] Ungültige Werte in der Adresse werden still ignoriert. Dann gilt der Standard.

### Rechte
- [ ] Bereichs-Admins sortieren und filtern nur die Konten ihres Bereichs (wie heute). Es werden keine zusätzlichen Daten geladen.

## Edge Cases
- Person mit Login, aber ohne Lern-Session: Sie zählt bei „Seit X Tagen inaktiv“ mit, bei „Nie eingeloggt“ nicht.
- Gesperrte Konten erscheinen im Inaktiv-Filter auch, mit dem Status „Gesperrt“. Ein eigener Ausschluss ist nicht nötig, weil man nach Status sortieren kann.
- Der verknüpfte Zweitaccount des Super-Admins (PROJ-29) bleibt weiterhin ausgeblendet.
- Lehrkräfte und Admins haben oft keine Lern-Session. Sie erscheinen im Inaktiv-Filter, wenn der Rollen-Filter auf „Alle Rollen“ steht. Bewusst so, der Rollen-Filter grenzt ein.
- Ein Wechsel auf „Alle Bereiche“, während nach „Bereich“ sortiert ist, und zurück: Die Spalte verschwindet, die Sortierung fällt auf den Standard zurück.
- Sehr lange Listen (> 1000 Konten): Das Sortieren passiert ohne spürbare Verzögerung (< 100 ms).

## Technical Requirements (optional)
- Keine neue Datenbank-Spalte nötig. Alle Werte liefert `/api/admin/users` heute schon.
- Tabellen-Regeln aus PROJ-45 bleiben (`ws-table-scroll`, `ws-table-sticky`, Farben nur über `ws-*`).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
**Nur Frontend.** Die Nutzerliste lädt heute schon alle nötigen Werte (Name, E-Mail, Bereich, XP, Streak, letzte Session, letzter Login, gesperrt). Sortieren und Filtern passieren im Browser auf der bereits geladenen Liste. Es gibt keine neue Schnittstelle, keine Datenbank-Änderung und keine Rechte-Änderung.

### Komponenten-Struktur
```
Nutzer-Seite (/admin/users) — bestehend
+-- AdminPageHeader „Nutzer“ („{gefiltert} von {gesamt}“) — bestehend
+-- Filterleiste
|   +-- Suche — bestehend
|   +-- Rollen-Filter — bestehend
|   +-- NEU: Aktivitäts-Filter (Alle · 7 · 14 · 30 Tage · Nie eingeloggt)
|   +-- NEU: „Sortieren nach“-Auswahl (nur Handy, < 640 px)
|   +-- „Alle Bereiche“-Schalter — bestehend (nur Super-Admin)
+-- Tabelle — bestehend
|   +-- NEU: sortierbare Spaltenüberschriften (Button + Pfeil + aria-sort)
+-- NEU: Leerzustand „Niemand passt zu diesem Filter“ + „Filter zurücksetzen“
```

### Neue Bausteine
- **Sortier- und Filter-Logik als eigene, getestete Hilfsdatei** (z. B. `src/lib/user-list.ts`): Sie bekommt die Liste plus Sortierung und Filter und gibt die geordnete Liste zurück. Dort stehen die Regeln aus der Spec: leere Werte ans Ende, deutsche Sortierung, Name als Gleichstand-Entscheider, Kalendertage nach Berliner Zeit (`berlinDay` aus `engagement-metrics.ts` wird wiederverwendet). Weil sie reine Logik ist, lässt sie sich ohne Browser vollständig mit Vitest prüfen.
- **Sortierbare Spaltenüberschrift** als kleine Komponente unter `src/components/admin/`. PROJ-61 und weitere Tabellen können sie später wiederverwenden.
- **Zustand in der Adresse:** Sortierung, Richtung und Aktivität werden als `?sort=…&dir=…&aktiv=…` gelesen und geschrieben. Dabei kommt kein neuer Eintrag in den Browser-Verlauf (ersetzen statt hinzufügen). Ungültige Werte fallen auf den Standard zurück.

### Daten
Es wird nichts Neues gespeichert. „Inaktiv seit X Tagen“ vergleicht `last_session_date` mit dem heutigen Tag in Berliner Zeit. „Nie eingeloggt“ heißt: kein `last_sign_in_at`.

### Entscheidungen
| Entscheidung | Warum |
|---|---|
| Sortieren im Browser statt in der Datenbank | Die Liste ist schon vollständig geladen (Bereich: wenige hundert Konten). Ein Klick sortiert sofort, ohne Ladezeit und ohne neue Schnittstelle. |
| Logik in eigener Datei statt in der Seite | Die Nutzer-Seite hat schon 530 Zeilen. Getrennte Logik ist testbar und für PROJ-61 (Export „in sichtbarer Reihenfolge“) wiederverwendbar. |
| Zustand in der Adresse statt im Browser-Speicher | Links lassen sich teilen, und Neuladen behält die Ansicht. So steht es in der Spec. |

### Abhängigkeiten (Pakete)
Keine neuen Pakete.

### Tests
- Unit: Sortier- und Filter-Logik (alle Spalten, beide Richtungen, leere Werte, Umlaute, Tagesgrenze Berlin, Kombination mit Suche und Rolle, ungültige Adresse).
- Komponente: Klick auf Überschrift → `aria-sort` und Reihenfolge, Leerzustand mit „Filter zurücksetzen“.

### Umsetzung (2026-10-27)
- **Logik:** `src/lib/user-list.ts` (+ 16 Unit-Tests) — Sortierung, Aktivitäts-Filter, Lesen/Schreiben der Adresse. Kalendertage über `berlinDay` aus `engagement-metrics.ts`.
- **Komponente:** `src/components/admin/sortable-table-head.tsx` (Button mit Pfeil, `aria-sort`, 44 px), wiederverwendbar für PROJ-61.
- **Seite:** `src/app/admin/users/page.tsx` — sortierbare Überschriften, Auswahlfeld „Aktivität“, am Handy (< 640 px) zusätzlich „Sortieren nach“, Leerzustand mit „Filter zurücksetzen“. Adresse wird per `history.replaceState` geschrieben (kein Verlaufseintrag).
- **Abweichung:** „Letzter Login“ zeigt die Tabelle jetzt für **alle** Rollen, nicht mehr nur für Lehrer-Rollen (PROJ-44). Sonst wäre die Sortierung nach Login und der Filter „Nie eingeloggt“ bei Azubis nicht nachvollziehbar. Die Schnittstelle lieferte den Wert schon immer für alle.
- Ist nach „Bereich“ sortiert und „Alle Bereiche“ aus, gilt der Standard (XP absteigend). Die Adresse behält den Wert, damit er beim Wiedereinschalten zurückkommt.

## QA Test Results

**Datum:** 2026-10-27 · **Umfang:** Code-Review gegen alle AC und Edge Cases, Unit- und Komponenten-Tests, Build, Lint. **Kein** Browser-/Playwright-Test (Nutzer-Vorgabe: kein Dev-Server). Cross-Browser und 375/768/1440 px deshalb nicht geprüft.

**Automatisiert:** `npm test` 137 Dateien / 1563 Tests grün · `npm run build` grün · ESLint auf allen geänderten Dateien ohne Befund.
Neu: `src/lib/user-list.test.ts` (16), `src/app/admin/users/page.test.tsx` (+4 für PROJ-57).

### Acceptance Criteria
| Bereich | Ergebnis |
|---|---|
| Sortierbare Spalten (8, Bereich nur bei „Alle Bereiche“) | ✅ |
| Erste Richtung Text A→Z / Zahl+Datum absteigend, zweiter Klick dreht | ✅ (Test) |
| Pfeil + `aria-sort`, Button ≥ 44 px | ✅ |
| Leere Werte immer am Ende | ✅ (Test, beide Richtungen) |
| Deutsche Sortierung, Groß/Klein egal | ✅ (Test mit „Ömer“/„anna“) |
| Status: Aktiv vor Gesperrt · Gleichstand nach Name · Standard XP absteigend | ✅ |
| Handy-Auswahl „Sortieren nach“ | ✅ (`sm:hidden`) |
| Aktivitäts-Filter 7/14/30/nie, Berliner Kalendertage, Kombination mit Suche/Rolle | ✅ (Test inkl. Tagesgrenze) |
| „{gefiltert} von {gesamt}“, Leerzustand mit „Filter zurücksetzen“ | ✅ |
| Adresse lesen/schreiben, ungültige Werte still ignoriert | ✅ |
| Bereichs-Admin sieht nur eigenen Bereich (unverändert) | ✅ |

### Edge Cases
- Login ohne Session → bei „inaktiv“ dabei, bei „nie eingeloggt“ nicht ✅ (Test)
- Gesperrte Konten erscheinen im Inaktiv-Filter ✅ · Zweitaccount bleibt ausgeblendet ✅ (Server unverändert)
- Sortierung nach „Bereich“, dann „Alle Bereiche“ aus → Standard ✅ (aber siehe BUG-57-1)
- > 1000 Konten: Sortieren per `useMemo`, O(n log n) ✅ (nicht gemessen)

### Bugs
- **BUG-57-1 (Low) — ✅ behoben (Klick vergleicht mit der angezeigten Sortierung, Regressionstest):** Ist in der Adresse noch „Bereich“ gespeichert, die Spalte aber ausgeblendet, bewirkt der **erste** Klick auf „XP“ nichts Sichtbares. Grund: Der Klick vergleicht mit der gespeicherten statt der angezeigten Sortierung. *Repro:* Alle Bereiche an → nach Bereich sortieren → Alle Bereiche aus → auf „XP“ klicken.
- **BUG-57-2 (Low, kosmetisch) — offen gelassen:** Beim Öffnen eines Links mit `?sort=…` steht die Liste für einen Augenblick in der Standard-Reihenfolge, weil die Adresse erst nach dem ersten Zeichnen gelesen wird. Während des Ladens sieht man nur Platzhalter, also praktisch unsichtbar.

### Security
Keine neue Schnittstelle, keine neuen Daten. Namen werden als Text gerendert (kein XSS).

### Ergebnis
**Production-ready: JA.** Keine Critical/High-Bugs.

## Deployment
- **Produktion:** https://spedilern.vercel.app
- **Deployed:** 2026-10-28 (Push `c96be8c` auf `main`, Vercel-Build „Ready“)
- **Migration vorab (vom Nutzer im SQL Editor eingespielt):** keine nötig
- **Rauchtest ohne Login (curl):** `/admin/users` → 307 zum Login; Seite lädt ohne Fehler
