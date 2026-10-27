# PROJ-57: Nutzerliste – Sortieren & Inaktiv-Filter

## Status: Architected
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
