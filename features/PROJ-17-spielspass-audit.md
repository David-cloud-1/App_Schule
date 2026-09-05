# PROJ-17: Spielspaß-Audit (Fun Auditor)

**Status:** Deployed
**Erstellt:** 2026-09-04
**Priorität:** P1

## Problem

Die Fragen-Qualität ist seit PROJ-16 abgesichert. Ob die Fragen überhaupt
gespielt werden, misst niemand. Der Lernerfolg hängt aber an der Rückkehr:
eine fachlich perfekte Frage, die niemand mehr aufruft, lehrt nichts.

Die Erstmessung bestätigt den Verdacht deutlich (Schülerkonten, ohne die
12 Admin-/Testkonten):

| Kennzahl | Wert | Ziel |
|----------|------|------|
| Registriert und losgelegt | 75,6 % | ≥ 80 % |
| Zweiter Tag erreicht | 38,2 % | ≥ 50 % |
| Drei Tage in Woche 1 | 2,9 % | ≥ 30 % |
| In den letzten 7 Tagen aktiv | 2,9 % | ≥ 50 % |
| Seit über 28 Tagen verschwunden | 94,1 % | ≤ 30 % |
| Hat je Streak 3 erreicht | 5,9 % | ≥ 40 % |

Die Gegenprobe fällt umgekehrt aus: Trefferquote 69,5 % (im Flow-Korridor),
Median 10 Fragen je Runde, und 51 % der Lerntage enthalten mehr als eine
**freiwillige** Runde. Wer spielt, hat Spaß — es fehlt der Anlass zurückzukommen.
Die letzten Sessions fast aller Konten liegen 45–46 Tage zurück, gehäuft um
11 Uhr: Die App lief im Unterricht und danach nie privat.

## Lösung

Dieselbe Dreiteilung wie bei PROJ-16 — Messung als Fundament, Wissensbasis
darüber, Agent obendrauf.

### 1. Kennzahlen als Code — `src/lib/engagement-metrics.ts`
`analyzeEngagement()` berechnet 18 Kennzahlen in fünf Gruppen: Ankommen,
Wiederkommen, Gewohnheit, Session, Anreize. Reine Funktionen ohne
Datenbankzugriff, 21 Unit-Tests daneben.

Übernommene Designentscheidungen aus der Fragen-Qualität:
- **Korridore statt Maxima.** Die Trefferquote hat eine Ober- *und* eine
  Untergrenze (65–85 %): zu leicht kostet genauso Spaß wie zu schwer, nur aus
  der anderen Richtung.
- **Faire Nenner.** Wiederkehr-Quoten zählen nur Nutzer, deren erster Lerntag
  mindestens sieben Tage zurückliegt — sonst gilt jede gestrige Anmeldung als
  Abbruch.
- **Kein Urteil bei dünner Datenlage.** Unter acht Fällen liefert eine Kennzahl
  das Verdikt „zu wenig daten" statt einer Scheingenauigkeit.
- **Europe/Berlin als Tagesgrenze** — dieselbe, nach der die App Streaks zählt
  (`src/app/api/quiz/sessions/route.ts`).

### 2. Nutzungs-Audit — `npm run fun:audit`
`scripts/engagement/audit.ts` lädt die Nutzungsdaten und gibt Kennzahlen,
Streak-Verteilung, Badge-Besitz, Fächerverteilung, Tageszeit-Histogramm und die
Liste verschwundener Nutzer aus. `--save` legt einen Snapshot ab und zeigt den
Trend gegen den letzten Lauf. `npm run fun:user -- <id>` zeigt den Verlauf eines
einzelnen Azubis Tag für Tag.

Standardmäßig zählen nur Konten mit Rolle `student`: die 12 Admin-/Testkonten
üben mit hunderten Sessions und würden jede Wiederkehr-Quote schönrechnen.

### 3. Wissensbasis und Agent
- `docs/engagement-patterns.md` — Musterkatalog (Streak-Auffangnetz, Tagesziel,
  Ligen, Erinnerungszeitpunkt, Flow-Korridor, Lernpfad …) mit Wirkprinzip,
  dazu die harten Grenzen aus dem PRD.
- `docs/engagement-ideas.md` — Ideen-Backlog, vom Agenten fortgeschrieben.
  Jede Idee: Was, Warum, Wirkung (auf welche Kennzahl), Aufwand, Risiko.
- `.claude/agents/fun-auditor.md` — misst, liest den Gamification-Code, sieht
  sich verschwundene Nutzer einzeln an, schlägt Ideen vor. Ändert **keinen
  App-Code**; gebaut wird über `/requirements` → `/frontend`.
- `.claude/skills/fun/SKILL.md` — `/fun audit | ideen | nutzer <id>`.

## Warum ein Agent und nicht nur ein Script

Zwei Dinge kann keine Kennzahl: Erstens erklären, *warum* eine Zahl schlecht
steht — dass alle Konten am selben Vormittag aufhörten, war erst im Einzelverlauf
sichtbar. Zweitens beurteilen, ob eine bestehende Mechanik unsichtbar ist oder
fehlt; dafür muss man den Code lesen. Der Agent ist auf beides verpflichtet:
Ein Audit ohne gelesenen Code und ohne angesehene Einzelnutzer gilt als
unvollständig.

## Acceptance Criteria

- [x] `npm run fun:audit` läuft gegen die Produktionsdaten und liefert alle
      Kennzahlen mit Verdikt
- [x] Admin-/Testkonten sind standardmäßig ausgeklammert, `--mit-admins` hebt es auf
- [x] `--save` schreibt Snapshot und zeigt den Trend gegen den letzten Lauf
- [x] `npm run fun:user -- <id>` zeigt den Tagesverlauf eines Nutzers
- [x] Kennzahlen mit Ober- und Untergrenze; „zu wenig daten" statt Scheinurteil
- [x] Unit-Tests für Tagesgrenze, Streak-Brüche, faire Nenner und Korridore
- [x] Musterkatalog und Ideen-Backlog angelegt
- [x] Agent und Skill `/fun` verfügbar
- [x] Erster vollständiger Agenten-Durchlauf (`/fun ideen`) mit Backlog-Neuordnung (05.09.2026)
- [x] Die zwei vom Agenten geforderten Kennzahlen ergänzt: Trefferquote am
      Rückkehrtag und Sessions außerhalb der Schulzeit (05.09.2026)

## Implementierungsnotizen

- `db()`, `loadAll()` und die Argument-Helfer liegen jetzt in `scripts/lib/db.ts`;
  `scripts/quality/lib.ts` re-exportiert sie. So hängt das Engagement-Audit nicht
  an der Fragen-Qualität. Das bestehende `quality:audit` läuft unverändert.
- `berlinHour()` musste auf Locale `sv` mit `hourCycle: 'h23'` umgestellt werden:
  das deutsche Format liefert „19 Uhr", was `Number()` zu `NaN` macht und das
  Tageszeit-Histogramm still zerstört hätte. Von einem Unit-Test gefunden.
- Snapshots unter `scripts/engagement/history/` sind in `.gitignore` — sie
  enthalten Nutzer-IDs verschwundener Azubis.
- Kennzahl `stickiness` steht derzeit auf „dünne daten": in den letzten 28 Tagen
  war nur ein Schülerkonto aktiv. Das ist der Befund, nicht ein Fehler.
- Die beiden Nachzügler-Kennzahlen (05.09.2026):
  - `return_day_accuracy` — Trefferquote an Lerntagen, denen eine Pause von
    mindestens 7 Tagen vorausging. Korridor 60–90 %, aktuell **52,8 %**
    (282/534) → schwach. Der Agentenbefund ist damit auf voller Datenbasis
    bestätigt: Wer zurückkommt, trifft auf denselben Schwierigkeitsgrad wie vor
    der Pause und erlebt einen Misserfolg.
  - `after_school` — Anteil Sessions vor 8 oder ab 14 Uhr (Europe/Berlin).
    Ziel ≥ 40 %, aktuell **35,7 %** (207/580) → schwach. Der Agent hatte 8 %
    genannt; mit dem hier festgelegten Fenster 8–14 Uhr liegt der Wert höher,
    weil die 14-Uhr-Spitze (89 Sessions, direkt nach Schulschluss) mitzählt.
    Die Aussage bleibt dieselbe — die App gehört überwiegend dem Stundenplan.
  - Beide haben `minBase: 30`; unter 30 Antworten bzw. Sessions urteilen sie
    nicht.

## Ergebnis des ersten Agenten-Durchlaufs (05.09.2026)

Der Fun Auditor hat zwei Annahmen des Start-Backlogs korrigiert: Ein
Wochen-Reset der Rangliste existiert bereits (`period=week`), und `class_level`
sitzt auf `questions`, nicht auf `profiles` — die Klassen-Liga ist deshalb L
statt M. Die Idee „Tagesziel-Ring" wurde entkräftet: Das Rundenende in
`quiz-client.tsx` ist bereits stark, dort bricht nichts ab.

Neuer Befund, der in keiner bestehenden Kennzahl stand: **Die Trefferquote fällt
am Rückkehrtag nach längerer Pause von 71 % auf 50 %** (14 Fälle, 11 davon
abwärts) — unter den Flow-Korridor. Wer zurückkommt, erlebt Versagen und bleibt
dann endgültig weg. Zwei Kennzahlen sollten deshalb in
`src/lib/engagement-metrics.ts` ergänzt werden: „Trefferquote am Rückkehrtag"
und „Anteil Sessions außerhalb der Schulzeit (8–14 Uhr)" — letztere misst
direkt, ob die App den Klassenraum verlassen hat (heute 8 %).

Einschränkung des 94-%-Verdikts: Gemessen wird über die Sommerferien (letzter
Klassentag 21.07.). Der Wert bleibt gültig, weil schon im Schuljahr 26 von 34
aktivierten Konten nur ein bis zwei Lerntage hatten — er ist aber kein akutes
Absacken.

Nebenbefund ohne Handlungsdruck: `getBerlinDateStr(-1)` in
`src/app/api/quiz/sessions/route.ts` rechnet 24 Stunden auf UTC und liegt am Tag
nach der Zeitumstellung zwischen 00:00 und 01:00 Uhr um einen Tag daneben.
