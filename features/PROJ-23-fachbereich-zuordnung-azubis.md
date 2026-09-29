# PROJ-23: Fachbereichs-Zuordnung für Azubis

## Status: In Progress
**Created:** 2026-09-29
**Last Updated:** 2026-09-29

## Dependencies
- Requires: PROJ-22 (Fachbereich als Datenbasis) — Bereiche, Adresse je Bereich, Bereich am Profil
- Requires: PROJ-1 (User Authentication) — Registrierung per E-Mail und Google
- Berührt: PROJ-3/13 (Quiz, Themenwahl), PROJ-8 (Rangliste), PROJ-11/15 (Prüfungssimulation), PROJ-14 (Lücken schließen), PROJ-19 (Blitzrunde), PROJ-20 (Shop), PROJ-21 (Leistungsnachweise)
- Grundlage für: PROJ-25 (Tourismus anlegen)
- Nicht enthalten: Umhängen von Azubis durch Lehrkraft/Admin → PROJ-24

## Summary
Neue Azubis landen automatisch im Fachbereich der Adresse, über die sie sich registrieren (`spedilern.vercel.app` → Spedition, `touristiklern.vercel.app` → Tourismus). Ab dann sieht jeder Azubi **nur Inhalte und Mitspieler seines Bereichs**: Fächer, Fragen, Blitzrunde, Lücken, Prüfungen, Leistungsnachweise, Shop und Rangliste.

Solange es nur Spedition gibt, ändert sich für niemanden etwas Sichtbares. Das Feature schafft die Trennung, bevor mit PROJ-25 der zweite Bereich dazukommt.

Grundlage und Entscheidungen: [docs/plans/mehrere-fachbereiche.md](../docs/plans/mehrere-fachbereiche.md), Abschnitt 5 sowie E1, E5, E7.

## User Stories
- Als **neue Tourismus-Azubi** möchte ich mich über `touristiklern.vercel.app` registrieren (E-Mail oder Google) und sofort in TouristikLern landen, ohne etwas auswählen oder einen Code eingeben zu müssen.
- Als **Azubi** möchte ich nur Fächer und Fragen meiner Ausbildung sehen — auch in der Blitzrunde und beim gemischten Lernen —, damit ich nicht mit fachfremden Fragen Zeit verliere.
- Als **Azubi** möchte ich in der Rangliste nur mit meinem eigenen Ausbildungsberuf verglichen werden.
- Als **Azubi** möchte ich in der Prüfungssimulation und im Shop nur die Angebote meines Bereichs sehen.
- Als **Lehrkraft** möchte ich sicher sein, dass ein Leistungsnachweis-Code meines Bereichs nicht von Azubis eines anderen Bereichs eingelöst werden kann.
- Als **Azubi, der sich auf der falschen Adresse anmeldet**, möchte ich trotzdem meine eigenen Inhalte sehen und einen Hinweis auf meine richtige App bekommen.
- Als **bestehender Spedition-Azubi** möchte ich, dass sich für mich nichts ändert.

## Acceptance Criteria

### Zuordnung bei der Registrierung
- [ ] Wer sich über die Adresse eines Bereichs registriert, wird diesem Bereich zugeordnet — bei E-Mail-Registrierung und bei Google-Login gleichermaßen.
- [ ] Die Zuordnung passiert automatisch; es gibt keine Auswahlseite und keinen Code.
- [ ] Registrierung über eine Adresse ohne Bereich (Vercel-Vorschau, lokale Entwicklung) → Zuordnung zum ersten Bereich (Spedition).
- [ ] Das Pseudonym wird aus den Nomen des zugeordneten Bereichs gebildet.
- [ ] Die Zuordnung wird serverseitig anhand der aufgerufenen Adresse bestimmt; ein Azubi kann seinen Bereich weder bei der Registrierung noch danach selbst wählen oder ändern.
- [ ] Bestehende Profile behalten ihren Bereich (alle Spedition); ein späterer Login über eine andere Adresse ändert den Bereich nie.

### Inhalte nur aus dem eigenen Bereich
- [ ] Fächerliste (Startseite, Fächer-Seite, Fach-Fortschritt) zeigt nur Fächer des eigenen Bereichs.
- [ ] Quiz je Fach, gemischtes Lernen und Themenauswahl verwenden nur Fragen und Themen des eigenen Bereichs.
- [ ] Die Blitzrunde zieht Fragen nur aus Fächern des eigenen Bereichs.
- [ ] „Lücken schließen" bietet nur Fragen des eigenen Bereichs an (auch falls jemand früher in einem anderen Bereich war).
- [ ] Die Prüfungssimulation zeigt nur aktive Prüfungssets des eigenen Bereichs.
- [ ] Der Shop zeigt nur Artikel des eigenen Bereichs; ein Artikel eines anderen Bereichs kann auch über einen direkten Aufruf nicht gekauft werden.
- [ ] Die Fragen-Schnittstelle liefert auch bei direktem Aufruf keine Fragen anderer Bereiche.

### Rangliste
- [ ] Die Rangliste zeigt nur Azubis des eigenen Bereichs (alle Zeiträume, die es heute gibt).
- [ ] Die eigene Platzierung bezieht sich auf den eigenen Bereich.

### Leistungsnachweise
- [ ] Ein Code eines Leistungsnachweises aus einem anderen Bereich wird abgelehnt mit der Meldung „Dieser Code gehört zu einem anderen Fachbereich." — sowohl bei der Code-Suche als auch beim Beitritt über den Link.
- [ ] Codes des eigenen Bereichs funktionieren unverändert.

### Hinweis bei falscher Adresse
- [ ] Ist ein eingeloggter Azubi auf der Adresse eines anderen Bereichs, erscheint ein unaufdringlicher Hinweis „Deine App heißt {App-Name} — hier geht's zu {Adresse}" mit Link zur richtigen Adresse.
- [ ] Auf der richtigen Adresse und auf Adressen ohne Bereich (Vorschau) erscheint kein Hinweis.
- [ ] Der Hinweis lässt sich schließen und erscheint in dieser Sitzung nicht erneut.

### Unveränderter Betrieb für Spedition
- [ ] Für bestehende Spedition-Azubis sind Fächer, Fragenzahl je Fach, Rangliste (Reihenfolge und Punkte), Shop, Prüfungssets und Blitzrunde identisch mit vorher (Stichprobe vor/nach).
- [ ] Keine spürbar längeren Ladezeiten (Referenz: Messwerte aus PROJ-22).

## Edge Cases
- **Registrierung über `touristiklern.vercel.app`, bevor es Tourismus gibt:** Die Adresse hat noch keinen Bereich → Zuordnung zu Spedition (wie jede unbekannte Adresse). Sobald PROJ-25 Tourismus anlegt, gilt die Adresse für neue Registrierungen.
- **Google-Login mit Umweg über Google:** Der Bereich richtet sich nach der Adresse, auf der der Login begonnen hat bzw. zurückkehrt — nicht nach einem Cookie einer anderen Adresse.
- **Bestehender Nutzer meldet sich zum ersten Mal auf der anderen Adresse an:** Bereich bleibt, Hinweis erscheint.
- **Profil ohne Bereich** (z. B. Fehler bei der Zuordnung): wird wie Spedition behandelt, bis ein Admin es zuordnet; kein Absturz, keine leeren Seiten.
- **Leistungsnachweis-Link wird geteilt** und von einem Azubi eines anderen Bereichs geöffnet: Ablehnung mit klarer Meldung, kein Teilnahme-Eintrag.
- **Bereich hat noch keine Fächer/Fragen/Prüfungssets/Shop-Artikel:** leere Zustände wie heute bei leeren Listen, keine Fehler.
- **Admins** (`role = 'admin'`) sehen in den Lernwegen ihren eigenen Profil-Bereich wie ein Azubi; bereichsübergreifende Sicht gibt es nur im Admin-Panel (PROJ-24).
- **Rangliste mit nur einem Azubi im Bereich:** zeigt diesen einen Eintrag, keine Mitspieler anderer Bereiche als Auffüllung.

## Nicht Teil dieses Features
- Umhängen von Azubis in einen anderen Bereich, Bereichs-Admins, Rechtetrennung im Admin-Panel → PROJ-24
- Anlegen des Bereichs Tourismus mit Fächern, Prüfungsaufbau, Shop-Artikeln → PROJ-25
- Auswahlseite „Welche Ausbildung machst du?" (entfällt, Entscheidung 2026-09-29)
- Trennung der Inhalte per Datenbank-Zugriffsregeln (E5: Filter im Code; Personen- und Notendaten trennt PROJ-24 per RLS)

## Technical Requirements
- **Kosten:** keine zusätzlichen Dienste.
- **Sicherheit:** Der Bereich eines Azubis wird nur serverseitig gesetzt; Azubis haben weiterhin kein Schreibrecht auf `department_id`.
- **Tests:** ohne Dev-Server/Playwright — Nachweis über Vitest (inkl. Szenario mit zwei Bereichen), Build und SQL-Stichproben vor/nach.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Zwei Teile: **(1) Zuordnung** neuer Profile anhand der Adresse und **(2) Filter** aller Lernwege auf den eigenen Bereich. Beides baut auf den Bausteinen aus PROJ-22 auf (zwischengespeicherte Bereichsliste, Bereich pro Seitenaufruf). Überwiegend Backend; sichtbar neu ist nur der Hinweis bei falscher Adresse.

### A) Zuordnung bei der Registrierung

**Problem:** Das Profil entsteht automatisch in der Datenbank, sobald ein Konto angelegt wird — in dem Moment weiß niemand, über welche Adresse die Person kam. Heute setzt die Datenbank deshalb pauschal „Spedition".

**Lösung: Zuordnung beim ersten Kontakt mit dem Server**

```
Registrierung (E-Mail oder Google)
│
├── Datenbank legt Profil an ── Bereich: leer (neu: kein Standardwert mehr)
│
└── erster Server-Kontakt nach der Anmeldung — an zwei Stellen:
    ├── Rückkehr vom Google-Login / aus einem E-Mail-Link (Login-Rückkehr-Route)
    └── jeder Seitenaufruf (der Bereich wird dort ohnehin gelesen)
        │
        └── "Bereich zuordnen" (nur wenn noch leer):
            ├── Adresse der Anfrage → Bereich (unbekannt → erster Bereich)
            ├── Bereich speichern — nur wenn er noch leer ist
            └── Pseudonym mit den Nomen dieses Bereichs neu erzeugen
```

- Die Zuordnung läuft ausschließlich auf dem Server mit Admin-Rechten; der Browser liefert keinen Bereich mit. Azubis haben weiterhin kein Schreibrecht auf den Bereich.
- „Nur wenn noch leer" macht den Schritt wiederholbar und sicher: Zwei gleichzeitige Seitenaufrufe führen nicht zu zwei verschiedenen Bereichen, ein späterer Login auf einer anderen Adresse ändert nichts.
- Bis zur Zuordnung (Sekundenbruchteile) und falls sie scheitert, gilt wie in PROJ-22 der Rückfall-Bereich — keine leeren Seiten.

### B) Filter auf den eigenen Bereich

Eine zentrale Frage „Welche Fächer gehören zum Bereich dieses Nutzers?" — zwischengespeichert wie die Bereichsliste — ersetzt überall die bisherige Annahme „alle Fächer". Daraus folgen alle Filter:

| Lernweg | Filter |
|---|---|
| Startseite (Fach-Fortschritt), Fächer-Seite, Fächer-Schnittstelle | nur Fächer des Bereichs |
| Quiz je Fach, gemischtes Lernen, Themen | nur Fragen/Themen dieser Fächer; ein Fach eines anderen Bereichs → keine Fragen |
| Fragen-Schnittstelle | Fach-Kürzel schon seit PROJ-22 im Bereich; zusätzlich ohne Kürzel nur Fragen des Bereichs |
| Blitzrunde | Fragenpool = Fragen der Fächer des Bereichs |
| Lücken schließen, Tagesziel | nur Fragen des Bereichs |
| Prüfungssimulation | nur aktive Sets des Bereichs (Sitzungsstart ist seit PROJ-22 gefiltert, jetzt auch die Auswahlseite) |
| Shop-Anzeige | nur Artikel des Bereichs |
| **Shop-Kauf** | Prüfung **in der Datenbank-Kauffunktion**: Artikel muss zum Bereich des Käufers gehören (die Funktion ist direkt aus dem Browser aufrufbar, ein Filter im Code allein reicht nicht) |
| Rangliste | nur Profile des Bereichs (läuft mit Admin-Rechten, daher Filter im Code zwingend) |
| Leistungsnachweis: Code-Suche und Beitritt | Bereich des Nachweises = Bereich des Azubis, sonst „Dieser Code gehört zu einem anderen Fachbereich." |

### C) Hinweis bei falscher Adresse

```
Grundlayout
└── Bereichs-Kontext (aus PROJ-22) — neu zusätzlich: "richtige Adresse"
    └── Hinweis-Leiste (nur eingeloggt + Adresse gehört zu einem ANDEREN Bereich)
        ├── „Deine App heißt TouristikLern — hier geht's zu touristiklern.vercel.app"
        └── Schließen (gemerkt für diese Browser-Sitzung)
```
Der Server erkennt beides bereits: den Bereich der Adresse und den Bereich des Profils. Weichen sie ab und hat die Adresse einen Bereich, gibt das Layout die richtige Adresse mit. Vorschau-Adressen (ohne Bereich) lösen keinen Hinweis aus.

### D) Datenmodell (in Worten)
Keine neuen Tabellen. Zwei Änderungen:
- **Profile:** Der Standardwert „Spedition" für den Bereich entfällt — neue Profile starten leer und werden wie oben zugeordnet. Bestehende Profile bleiben unverändert.
- **Shop-Kauffunktion:** prüft zusätzlich, dass der Artikel zum Bereich des Käufers gehört (neue Fehlermeldung „Artikel gehört zu einem anderen Fachbereich").

Die Standardwerte an Fächern, Prüfungssets usw. bleiben bis PROJ-24.

### E) Technische Entscheidungen

| Entscheidung | Begründung |
|---|---|
| Zuordnung auf dem Server statt beim Anlegen in der Datenbank | Nur der Server kennt die Adresse der Anfrage; der Browser könnte sie fälschen. |
| Zuordnung an zwei Stellen (Login-Rückkehr + Seitenaufruf) | Google- und E-Mail-Link-Anmeldungen laufen über die Rückkehr-Route, E-Mail-Registrierung ohne Bestätigung springt direkt in die App — so ist jeder Weg abgedeckt. |
| „Nur speichern, wenn leer" | Wiederholbar, keine Wettläufe, kein nachträglicher Wechsel durch eine andere Adresse. |
| Fächer je Bereich zwischengespeichert | Jeder Lernweg braucht diese Liste; so kostet der Filter keine zusätzliche Datenbankabfrage (Lehre aus PROJ-22 BUG-1). |
| Kauf-Prüfung in der Datenbank | Einzige Stelle, die auch direkte Aufrufe erfasst. |
| Filter im Code, nicht per Zugriffsregeln (E5) | Inhalte sind nicht vertraulich; weniger Risiko am Kern der App. Personen- und Notendaten trennt PROJ-24 per RLS. |

### F) Auslieferung
1. **Code ausliefern** (Filter, Zuordnung, Hinweis, neue Kauf-Prüfung). Solange der Standardwert noch existiert, bekommen neue Profile weiterhin sofort Spedition — nichts ändert sich.
2. **Danach Standardwert am Profil entfernen** — ab dann greift die Zuordnung per Adresse.

Rückweg: Standardwert wieder setzen; Code-Rücknahme per Vercel. Da es noch keinen zweiten Bereich gibt, landen bis PROJ-25 alle neuen Profile ohnehin in Spedition.

### G) Nachweis ohne Dev-Server
- Vitest mit **zwei Bereichen** (Test-Daten): Zuordnung je Adresse, „nur wenn leer", Filter je Lernweg, Rangliste, Nachweis-Code eines anderen Bereichs, Hinweis-Bedingung.
- Kauffunktion per SQL als Azubi in einer zurückgerollten Transaktion gegen einen Test-Artikel eines Test-Bereichs.
- Vorher/nachher-Stichprobe für Spedition: Fächer, Fragenzahlen, Rangliste, Shop, Prüfungssets.
- Ladezeit auf der Vercel-Vorschau gegen die Werte aus PROJ-22.

### H) Abhängigkeiten (Pakete)
Keine neuen Pakete.

## Implementation Notes (Backend)
**Stand 2026-09-29 — Code fertig, lokal committet. Migration Schritt 1 angewendet (Kauf-Prüfung aktiv, Pseudonym-Funktion nur noch für authenticated/service_role); Schritt 2 erst nach dem Deploy.**

### Zuordnung
- `assignDepartmentIfMissing(userId, host)` in `src/lib/departments-server.ts`: Bereich der Adresse (unbekannt → erster Bereich), Speichern per Service-Client **nur wenn `department_id` noch leer** (`.is('department_id', null)`), danach Pseudonym per `generate_unique_pseudonym(p_department_id)` neu. Bei bereits gesetztem Bereich: keine Änderung, kein neues Pseudonym.
- Aufgerufen in `src/app/auth/callback/route.ts` (Google-Login, E-Mail-Links; Fehler blockiert den Login nicht) und in `getRequestContext()` bei jedem Seitenaufruf, falls das Profil noch keinen Bereich hat (E-Mail-Registrierung ohne Bestätigung).
- Hinweis bei falscher Adresse: `getRequestContext()` liefert `correctAddress` (App-Name + Adresse des eigenen Bereichs), wenn die aufgerufene Adresse zu einem anderen Bereich gehört; über den Bereichs-Kontext an die Oberfläche (Anzeige: `/frontend`).

### Filter
Neue zwischengespeicherte Liste `getDepartmentSubjectIds(departmentId)` (5 Min., Tag `department-subjects`, beim Anlegen eines Fachs sofort geleert) und `getDepartmentOfUser()` (Profil + zwischengespeicherte Bereichsliste).

| Stelle | Änderung |
|---|---|
| Startseite, Fächer-Seite, `GET /api/subjects` | nur Fächer des Bereichs |
| Quiz-Seite (je Fach, gemischt, Lücken-Modus) | Fragen immer über `question_subjects` auf die Fächer des Bereichs beschränkt; Fach eines anderen Bereichs → zurück zur Fächerauswahl; Klassenstufen aus dem Bereich |
| `GET /api/topics` | nur für Fächer des Bereichs; Klassenstufen aus dem Bereich |
| `GET /api/questions` | ohne Kürzel nur Fragen des Bereichs; Klassenstufe muss im Bereich existieren |
| `GET /api/quiz/weak` | Lücken und Zählung nur in Fächern des Bereichs; Fach eines anderen Bereichs → leer |
| `POST /api/quiz/blitz/start` | Pool nur aus Fächern des Bereichs |
| Prüfungs-Startseite | nur aktive Sets des Bereichs |
| `GET /api/shop/items` | nur Artikel des Bereichs |
| `purchase_shop_item()` (Datenbank) | neue Prüfung `item_other_department` (Route meldet „Item nicht gefunden") |
| `GET /api/leaderboard` | alle Zeiträume nur Profile des Bereichs; Wochen-/Monats-XP fremder Nutzer werden verworfen |
| `POST /api/assessments/lookup`, `POST /api/assessments/[id]/join` | Nachweis eines anderen Bereichs → 403 „Dieser Code gehört zu einem anderen Fachbereich." |

`NO_DEPARTMENT_ID` (gültige UUID ohne Treffer) als Filterwert, falls kein Bereich bestimmbar ist — Listen bleiben leer statt fehlerhaft.

### Datenbank
- `20260929_proj23_shop_department_check.sql` — Kauf-Prüfung + PROJ-22 QA BUG-2 (`generate_unique_pseudonym` nicht mehr für `PUBLIC`/`anon`). Probelauf als echter Azubi (zurückgerollt): fremder Artikel → `item_other_department`, eigener Artikel → gekauft, anonymer Pseudonym-Aufruf → verweigert.
- `20260929_proj23_profiles_no_default_department.sql` — Standardwert am Profil entfernen; **erst nach dem Deploy anwenden**.

### Tests
- 508/508 Vitest grün, `npm run build` grün.
- Neu: `departments-server.test.ts` (Zuordnung je Adresse, Rückfall, „nur wenn leer", Pseudonym), Login-Rückkehr (Zuordnung + Login trotz Fehler), Rangliste (Filter + fremde Wochen-XP), Lücken (Zählung/fremdes Fach), Blitzrunde, Fächer, Shop, Code-Suche (fremder Bereich → 403).
- `src/test/setup.ts` ersetzt `next/cache` in Tests (Zwischenspeicher durchreichen).

### Nebenbei
- PROJ-22 QA BUG-3 (feste Klassenstufen) teilweise behoben: Quiz-Seite, Themen- und Fragen-Schnittstelle nutzen die Stufen des Bereichs. Offen: Admin-Fragenliste/-Export, Upload-Pfad, Datenbank-Prüfungen in `generation_jobs`/`questions_draft`.

## Implementation Notes (Frontend)
- `src/components/wrong-address-banner.tsx`: Hinweis-Leiste oben auf jeder Seite (im Grundlayout), nur wenn der Bereichs-Kontext `correctAddress` liefert — also eingeloggt **und** Adresse eines anderen Bereichs. Text „Deine App heißt {App-Name} — hier geht's zu {Adresse}" mit Link, Icon des eigenen Bereichs, Schließen-Knopf (44 px, `aria-label`). Aufgebaut aus shadcn `Alert` + `Button`, Farben nach Design-System (Secondary Blau).
- Schließen wird im Sitzungsspeicher gemerkt (`sessionStorage`, mit Rückfall, falls nicht verfügbar); angezeigt wird erst nach dem Lesen — kein Aufblitzen bei bereits geschlossenem Hinweis.
- Test `wrong-address-banner.test.tsx`: Anzeige mit Link, keine Anzeige ohne `correctAddress`, Schließen bleibt in der Sitzung erhalten.
- Gesamt: 511/511 Vitest grün, `npm run build` grün.
- Sichtbar erst ab PROJ-25 (solange es nur Spedition gibt, gehört keine Adresse zu einem anderen Bereich).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
