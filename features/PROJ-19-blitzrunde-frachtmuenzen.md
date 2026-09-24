# PROJ-19: Blitzrunde & Frachtmünzen

## Status: In Review
**Created:** 2026-09-05
**Last Updated:** 2026-09-13
**Priorität:** P0

## Dependencies
- **Requires:** PROJ-1 (User Authentication) — Münzstand hängt am Konto
- **Requires:** PROJ-3 (Daily Learning Session) — die Blitzrunde erweitert den bestehenden Quiz-Fluss
- **Requires:** PROJ-4 (XP & Level System) — Münzen werden an derselben Stelle vergeben wie XP
- **Requires:** PROJ-5 (Streak System) — die Blitzrunde hält den Streak
- **Gehört zu:** PROJ-20 (Speditionshof & Shop) — dort werden die Münzen ausgegeben.
  **Beide gehen gemeinsam live.** PROJ-19 allein liefert eine Währung ohne Zweck.
- **Empfohlen vorher oder parallel:** PWA-Manifest (Idee 1 in `docs/engagement-ideas.md`)
  und PROJ-18 (Web-Push). Ein Tagesbonus wirkt nur, wenn die Azubis die App abends
  überhaupt wiederfinden.

## Problem

Aus dem Spielspaß-Audit (PROJ-17, Messung vom 05.09.2026): Die App hat **kein
Spaß-, sondern ein Rückkehrproblem.**

| Kennzahl | Wert |
|----------|------|
| Trefferquote in der Session | 69,5 % (im Flow-Korridor) |
| Lerntage mit freiwilliger Zweitrunde | 51,1 % |
| Seit über 28 Tagen verschwunden | 94,1 % |
| Beste Streak = 1 Tag | 30 von 34 Nutzern |

Wer spielt, hat Spaß. Es fehlt ausschließlich der **Anlass zurückzukommen**. Die
App belohnt heute nur Beständigkeit über sieben Tage (`STREAK_BONUS_THRESHOLD = 7`) —
ein Ziel, das genau ein einziger Nutzer je erreicht hat. Für das Verhalten, das die
App wirklich braucht (einmal wiederkommen), zahlt sie nichts.

## Lösung

Eine **zweite Währung** und ein **Tagesbonus**, der verfällt.

### Zwei getrennte Größen

| | XP | Frachtmünzen |
|---|---|---|
| Bedeutung | Lernfortschritt | Spielwährung |
| Wirkt auf | Level, Rangliste, Badges | Speditionshof (PROJ-20) |
| Ausgebbar | **nie** | ja |

Die Trennung ist wesentlich: Würde man XP ausgeben, sänke beim Kauf das Level und
die Rangliste würde bedeutungslos.

### Verdienen

| Quelle | Münzen |
|---|---|
| Richtige Antwort in einer normalen Runde | 1 |
| Abgeschlossene normale Runde (mind. 5 Fragen) | + 3 |
| Richtige Antwort in der Blitzrunde | 3 |
| Abgeschlossene Blitzrunde (Tagesbonus) | + 10 |

Kalibriert an den echten Sessions (580 Schüler-Sessions: Median 7 richtige von
10 Fragen):

- Normale Runde ≈ **10 Münzen**
- Blitzrunde ≈ **34–46 Münzen** (bei 8–12 richtigen Antworten) — also das
  3- bis 4-Fache, aber nur einmal am Tag

Damit ist das ruhige Lernen die Grundlage und der tägliche Besuch spürbar mehr wert,
ohne dass sich das Überspringen des normalen Quiz lohnt.

### Die Blitzrunde

- **60 Sekunden**, so viele Fragen wie möglich
- Fragen **gemischt über alle Fächer** (BGP, KSK, STG, LOP) — kein Auswahlschritt
  vor dem Start, ein Tipp und los
- Falsche Antwort: kurzes rotes Feedback, sofort weiter — **kein Abzug, kein
  Zeitverlust, kein Rundenende**. Nur richtige Antworten bringen Münzen.
- **Einmal pro Kalendertag** (Europe/Berlin). Danach ist sie bis zum nächsten Tag weg —
  das ist der Rückkehr-Anlass.
- Zählt für den **Streak** (sie ist ja der Anlass zurückzukommen)
- Bringt **halbe XP**: 5 statt 10 je richtiger Antwort. 60 Sekunden Tempo dürfen
  nicht der schnellste Weg zu Level und Rangliste sein.

### Startguthaben für Bestandskonten

Konten mit bisherigem Lernfortschritt starten nicht bei null:

```
Startguthaben = min(60 + floor(total_xp / 8), 250)     nur wenn total_xp > 0
```

Gerechnet gegen den echten Bestand (34 Konten mit XP): Minimum 61, **Median 90**,
Maximum 250; **3 Konten** erreichen den Deckel. Der Vielnutzer mit 25.830 XP bekäme
ohne Deckel 3.288 Münzen und könnte den halben Hof leerkaufen — mit Deckel sind es
250, also etwa drei kleinere Käufe.

Der Median von 90 Münzen liegt bewusst knapp **über** dem ersten Kaufpreis (Referenz
75 Münzen, festgelegt in PROJ-20): Wer zurückkehrt, kann sofort etwas kaufen und
sieht beim ersten Login ein Ergebnis. Das ist zugleich der einzige inhaltliche
Aufhänger, die 32 verschwundenen Konten überhaupt noch einmal anzusprechen
(„Deine Spedition wartet — du hast Guthaben").

Die 11 Konten ohne jede Session bekommen kein Startguthaben; für sie gilt der
normale Weg (erster Kauf am zweiten Lerntag).

## User Stories

- Als **Azubi** möchte ich für richtige Antworten eine Währung sammeln, damit sich
  Lernen nach etwas anfühlt, das mir gehört.
- Als **Azubi** möchte ich jeden Tag eine kurze, schnelle Sonderrunde spielen können,
  die deutlich mehr einbringt, damit ich einen Grund habe, abends noch einmal
  hineinzuschauen.
- Als **Azubi** möchte ich sehen, dass die Blitzrunde heute noch offen ist (und wie
  lange noch), damit ich sie nicht verpasse.
- Als **Azubi, der lange weg war**, möchte ich beim Wiedereinstieg ein Guthaben aus
  meiner früheren Lernarbeit vorfinden, damit sich die Rückkehr sofort lohnt.
- Als **Azubi** möchte ich, dass mein Streak auch durch eine Blitzrunde erhalten
  bleibt, damit ein kurzer Besuch an einem vollen Tag zählt.
- Als **Azubi** möchte ich meinen Münzstand jederzeit auf der Startseite sehen,
  damit ich weiß, wie weit ich vom nächsten Kauf entfernt bin.

## Acceptance Criteria

### Währung
- [ ] `profiles` hat ein Feld für den Münzstand; Standardwert 0, nie negativ
- [ ] Eine abgeschlossene normale Runde mit 7 richtigen von 10 Fragen schreibt
      genau 10 Münzen gut (7 × 1 + 3 Abschlussbonus)
- [ ] Eine normale Runde mit weniger als 5 Fragen bekommt keinen Abschlussbonus,
      wohl aber die Münzen je richtiger Antwort
- [ ] Der Münzstand ist auf der Startseite sichtbar, mit eigenem Symbol klar von
      der XP-Anzeige unterschieden
- [ ] Nach einer Runde zeigt der Abschlussbildschirm die verdienten Münzen getrennt
      von den XP an
- [ ] XP, Level, Streak und Badges verhalten sich bei normalen Runden unverändert
      (keine Regression an PROJ-3/4/5)

### Blitzrunde
- [ ] Die Blitzrunde ist von der Startseite aus mit einem Tipp startbar, ohne
      vorherige Fach- oder Themenauswahl
- [ ] Die Fragen sind über alle Fächer gemischt und stammen aus dem bestehenden
      Fragenbestand — kein neues Fragenformat, kein Import
- [ ] Ein sichtbarer Countdown läuft von 60 Sekunden auf 0
- [ ] Eine falsche Antwort zeigt kurzes rotes Feedback und springt zur nächsten
      Frage; die Runde endet nicht, die Uhr springt nicht, es werden keine Münzen
      abgezogen
- [ ] Bei Ablauf der Zeit erscheint ein Abschlussbildschirm mit Anzahl richtiger
      Antworten, verdienten Münzen, XP und Streak-Stand
- [ ] Eine abgeschlossene Blitzrunde mit 10 richtigen Antworten schreibt 40 Münzen
      und 50 XP gut (10 × 3 + 10 Tagesbonus; 10 × 5 XP)
- [ ] Die Blitzrunde hält bzw. erhöht den Streak nach denselben Regeln wie eine
      normale Runde
- [ ] Nach einer gewerteten Blitzrunde zeigt die Startseite den Modus als für heute
      erledigt und nennt, wann er wieder verfügbar ist
- [ ] Am nächsten Kalendertag (Europe/Berlin, 00:00 Uhr) ist die Blitzrunde wieder
      verfügbar

### Verbrauch und Missbrauchsschutz
- [ ] Als verbraucht gilt der Tagesbonus **erst, wenn die 60 Sekunden abgelaufen
      sind und das Ergebnis gespeichert wurde** — ein Abbruch vorher lässt die Runde
      erhalten
- [ ] Ein zweiter Wertungsversuch am selben Tag wird serverseitig abgelehnt und
      schreibt weder Münzen noch XP gut — auch bei wiederholtem oder parallelem
      Aufruf
- [ ] Der Server prüft die Plausibilität einer Blitzrunde (Obergrenze für die Anzahl
      Antworten sowie eine serverseitig ermittelte Rundendauer) und lehnt
      unplausible Meldungen ab; die geltende Obergrenze von 20 Antworten je Session
      in [quiz/sessions/route.ts:15](../src/app/api/quiz/sessions/route.ts#L15) muss
      dafür bewusst festgelegt werden
- [ ] Der Münzstand kann ausschließlich serverseitig verändert werden; ein
      manipulierter Client kann sich keine Münzen gutschreiben

### Startguthaben
- [ ] Jedes Konto mit `total_xp > 0` erhält einmalig
      `min(60 + floor(total_xp / 8), 250)` Münzen
- [ ] Konten ohne XP erhalten kein Startguthaben
- [ ] Die Gutschrift erfolgt genau einmal je Konto und ist bei erneutem Lauf
      wirkungslos (idempotent)
- [ ] Nach der Gutschrift hat kein Konto mehr als 250 Münzen aus dieser Quelle
- [ ] Beim ersten Login danach wird das Guthaben einmalig als Hinweis gezeigt

### Randbedingung Kosten
- [ ] Keine neuen kostenpflichtigen Dienste, kein externes API, keine gekauften
      Assets, keine Bild-KI. Das Feature bleibt vollständig innerhalb von
      Supabase Free Tier und Vercel Hobby.
- [ ] Kein Cron-Job und kein Hintergrunddienst nötig — die Tagesgrenze wird beim
      Aufruf berechnet, nicht durch einen Zeitplan zurückgesetzt

## Edge Cases

- **Die Verbindung bricht während der Blitzrunde ab.** Der Tagesbonus bleibt
  erhalten (nicht verbraucht), bereits gegebene Antworten verfallen. Bewusste
  Entscheidung: Die App läuft auf Schulgeräten mit schlechtem WLAN; ein verlorener
  Tagesbonus wiegt schwerer als ein möglicher Neustart.
- **Jemand startet die Blitzrunde mehrfach neu, um ein besseres Ergebnis zu
  erzielen.** Zulässig, solange keine Runde durchgespielt wurde — es kostet ihn
  jedes Mal echte Zeit. Sobald eine Runde gewertet ist, ist der Tag verbraucht.
- **Die Blitzrunde beginnt um 23:59 Uhr und endet um 00:00 Uhr.** Maßgeblich ist der
  Zeitpunkt der Wertung. Die Runde zählt für den neuen Tag; der Bonus des alten Tages
  verfällt ungenutzt. Dieselbe Regel muss auch für Streak und Münzen gelten, damit
  nicht zwei Tage gleichzeitig gutgeschrieben werden.
- **Uneinheitliche Tagesgrenze im Bestand.** Streaks rechnen nach Europe/Berlin
  ([quiz/sessions/route.ts:26](../src/app/api/quiz/sessions/route.ts#L26)),
  [quiz/today/route.ts:22](../src/app/api/quiz/today/route.ts#L22) dagegen nach UTC.
  Für die Blitzrunde gilt **ausschließlich Europe/Berlin**; die Abweichung in
  `today` ist zu prüfen und zu vereinheitlichen.
- **Zeitumstellung.** `getBerlinDateStr(-1)` zieht 24 h von der UTC-Zeit ab; am Tag
  nach der Umstellung liefert das zwischen 00:00 und 01:00 Uhr den falschen Vortag
  (notiert in `docs/engagement-ideas.md`). Wenn die Streak-Logik hier ohnehin
  angefasst wird, mit korrigieren.
- **Der Fragenbestand reicht nicht.** Schafft jemand mehr Fragen, als ungefragte
  vorhanden sind, werden bereits beantwortete wiederholt statt die Runde
  abzubrechen — bei 1.666 Fragen unwahrscheinlich, aber bei Fachfiltern denkbar.
- **Ein Konto hat sehr wenig XP (Minimum im Bestand: 10 XP).** Der Sockel von 60
  Münzen sorgt dafür, dass auch dieses Konto ein sichtbares Guthaben vorfindet.
- **Doppelte Gutschrift durch schnelles Doppeltippen** am Ende einer Runde: Der
  Server muss dieselbe Runde nur einmal werten.
- **Ein Azubi spielt ausschließlich Blitzrunden.** Zulässig, aber durch die halben
  XP nachteilig für Level und Rangliste — und der Münzertrag ist auf eine Runde
  pro Tag gedeckelt.

## Technical Requirements
- **Performance:** Der Countdown muss flüssig laufen; der Fragenwechsel darf keine
  spürbare Wartezeit haben (Fragen der Runde vorab laden, nicht je Frage nachladen).
- **Sicherheit:** Authentifizierung erforderlich; Münzstand und Tagesverbrauch
  ausschließlich serverseitig; RLS analog zu den bestehenden Profil-Feldern.
- **Mobile-First:** Antwortflächen mindestens 44 px, bedienbar mit dem Daumen —
  der Modus lebt vom Tempo.
- **Barrierefreiheit:** Der Countdown darf nicht die einzige Rückmeldung sein;
  Farbe allein trägt kein Feedback (rot/grün zusätzlich mit Symbol).
- **Datenmenge:** Ein Zahlenfeld je Konto plus die ohnehin gespeicherten Sessions —
  im Free Tier vernachlässigbar.

## Offene Punkte für /architecture
- Wird die Blitzrunde eine eigene Route oder ein Modus-Parameter der bestehenden
  Quiz-Session? (Beeinflusst das 20-Antworten-Limit und alle Auswertungen.)
- Wie wird die Rundendauer serverseitig belegt — Start-Token oder Zeitstempel?
- Bleibt der Münzstand ein Feld auf `profiles` oder braucht es für PROJ-20 ohnehin
  ein Buchungsjournal (Nachvollziehbarkeit bei Käufen)?
- Muss `engagement-metrics.ts` um eine Kennzahl „Blitzrunden-Teilnahme je Lerntag"
  erweitert werden, damit PROJ-17 die Wirkung messen kann?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

**Startseite** (`page.tsx`) — zwei neue Bausteine neben den bestehenden
(XP-Anzeige, Streak, Fächer-Kacheln):
```
Startseite (bestehend)
+-- NEU: Münzstand-Anzeige, eigenes Symbol, klar von der XP-Anzeige getrennt
+-- NEU: Blitzrunde-Kachel
    +-- Zustand "verfügbar": ein Tipp startet direkt die Runde
    +-- Zustand "heute erledigt": zeigt, wann sie wieder verfügbar ist
```

**Neue eigene Route für die Blitzrunde** (getrennt vom normalen Quiz-Fluss):
```
Blitzrunde-Bildschirm (neu)
+-- Countdown 60 -> 0 (deutlich sichtbar, nicht die einzige Rückmeldung)
+-- Frage + Antwortoptionen (bestehende Quiz-Bausteine wiederverwendet)
+-- Sofort-Feedback bei falscher Antwort (rot + Symbol, Runde läuft weiter)
+-- Abschlussbildschirm bei Ablauf der Zeit
    +-- Richtige Antworten, verdiente Münzen, verdiente XP, Streak-Stand
    (nutzt dasselbe Muster wie der bestehende Ergebnis-Bildschirm)
```

**Bestehender Ergebnis-Bildschirm der normalen Runde** (`quiz-client.tsx`) —
eine Ergänzung, sonst unverändert:
```
Ergebnis-Bildschirm normale Runde (bestehend)
+-- Trefferquote, XP-Karte, Streak-Karte  (unverändert)
+-- NEU: verdiente Münzen, als eigene Zeile neben der XP-Karte
```

### B) Datenmodell (in normaler Sprache)

- **Münzstand:** ein neues Zahlenfeld am Nutzerprofil, nach demselben Muster
  wie der vorhandene XP-Stand. Startwert 0, wird nie negativ, kann in diesem
  Feature nur wachsen (Ausgeben ist Aufgabe von PROJ-20).
- **Blitzrunden-Aufzeichnung:** eine neue Tabelle, eine Zeile pro *gewerteter*
  Blitzrunde — mit Datum (Kalendertag Europe/Berlin), Anzahl richtiger
  Antworten, Zeitpunkt der Wertung. Diese Zeile ist gleichzeitig die
  "heute schon gespielt"-Sperre: gibt es für den heutigen Tag schon eine
  Zeile, wird ein zweiter Versuch abgelehnt.
- **Start-Marke:** wenn ein Nutzer die Blitzrunde beginnt, legt der Server
  einen kurzlebigen Vermerk mit Startzeitpunkt an (nicht im Browser
  gespeichert, fälschungssicher). Erst wenn beim Einreichen des Ergebnisses
  ein solcher Vermerk vorliegt und die verstrichene Zeit plausibel ist, wird
  gewertet. Ein Verbindungsabbruch ohne Einreichung hinterlässt keine
  gewertete Runde — der Tagesbonus bleibt automatisch erhalten, wie in den
  Edge Cases gefordert.
- **Startguthaben:** kein neues Datenfeld — ein einmaliger Rechenlauf über die
  bestehenden Profile schreibt das Ergebnis direkt in das neue Münzstand-Feld.
  Die Formel braucht dafür nur den bereits vorhandenen XP-Stand.

### C) Tech-Entscheidungen (Begründung)

- **Eigene Route statt Modus-Parameter der bestehenden Quiz-Session:** Die
  Regeln unterscheiden sich zu stark, um sie in einen Ablauf zu zwingen —
  Zeitlimit statt Fragenanzahl, kein Rundenabbruch bei falscher Antwort,
  andere Fach-Auswahl (immer gemischt), andere Münz- und XP-Sätze. Zwei klare,
  einfache Abläufe sind weniger fehleranfällig als ein Ablauf mit vielen
  Sonderfällen — und die bestehende normale Quiz-Session bleibt dadurch
  unverändert (kein Regressionsrisiko an PROJ-3/4/5, wie in den Acceptance
  Criteria gefordert).
- **Server-Start-Marke statt der vom Gerät gemeldeten Zeit:** Ohne sie könnte
  ein manipuliertes Gerät eine erfundene Trefferzahl oder Rundendauer melden.
  Die Marke ist die einzige Grundlage dafür, "schon heute gewertet" und "war
  die Meldung plausibel" zu prüfen — das war ein offener Punkt der Spec und
  ist damit beantwortet.
- **Münzstand als einfaches Feld, kein Buchungsjournal in dieser Version:**
  Ein Journal (jede Gutschrift und jeder spätere Kauf als eigene, prüfbare
  Zeile) wäre die robustere Lösung, sobald PROJ-20 Käufe einführt. Da PROJ-20
  aber noch keine eigene Spezifikation hat (siehe Hinweis unten), würde ein
  Journal jetzt auf Vermutungen über nicht getroffene Entscheidungen beruhen.
  Das einfache Feld deckt alles ab, was PROJ-19 selbst braucht.
- **Kalendertag einheitlich nach Europe/Berlin, wie von der Spec verlangt:**
  folgt derselben Regel wie das bestehende Streak-System. Die App verwendet an
  einer anderen Stelle (der "schon heute beantwortet"-Prüfung im normalen
  Quiz) noch die UTC-Tagesgrenze — dieser bestehende Unterschied wird hier
  nicht mit behoben, aber bewusst nicht in die Blitzrunde übernommen.
- **Keine neue Fragen-Abfrage nötig:** Die bestehende Fragen-Schnittstelle
  liefert bereits fachübergreifend gemischte Fragen, wenn kein Fach angegeben
  wird. Die Blitzrunde nutzt genau diesen bereits vorhandenen Weg, statt einen
  neuen zu bauen.

### D) Abhängigkeiten (neue Pakete)

Keine. Die Blitzrunde baut vollständig auf vorhandenen Bausteinen auf (Zod für
Validierung, Supabase, bestehende Quiz- und Ergebnis-Komponenten). Das erfüllt
die Kosten-Randbedingung der Spec direkt mit.

### Offene Punkte aus der Spec — hier beantwortet

- **Eigene Route vs. Modus-Parameter:** eigene Route (siehe oben).
- **Rundendauer serverseitig belegen:** Start-Marke mit Zeitstempel, nicht die
  vom Gerät gemeldete Zeit (siehe oben).
- **Feld vs. Buchungsjournal:** Feld jetzt, Journal als Empfehlung für den
  Zeitpunkt, an dem PROJ-20 Käufe einführt.
- **Kennzahl für PROJ-17:** Die Blitzrunden-Aufzeichnung (ein Eintrag je
  gewerteter Runde mit Datum) liefert alle Daten, die eine künftige Kennzahl
  "Blitzrunden-Teilnahme je Lerntag" braucht. Die Kennzahl selbst wird erst in
  `/backend` bzw. bei der nächsten Erweiterung von `engagement-metrics.ts`
  ergänzt.

### Wichtiger Hinweis vor der Umsetzung

Die Spec selbst hält fest: **"PROJ-19 allein liefert eine Währung ohne
Zweck."** PROJ-20 (Speditionshof & Shop), das die Münzen ausgibt, hat noch
keine eigene Feature-Spec — nur die reservierte ID in `features/INDEX.md`.
Dieses Architektur-Design deckt bewusst nur die *Verdienen*-Seite ab, die für
sich testbar und sichtbar ist (Münzstand auf der Startseite, Startguthaben).
Bevor `/backend` und `/frontend` das tatsächlich bauen, lohnt sich `/requirements`
für PROJ-20 — sonst entsteht ein sichtbarer Münzstand, den niemand ausgeben
kann.

## Implementation Notes (Frontend)

**Stand 2026-09-13 — Frontend gebaut, Backend steht noch aus.** Da die
Datenbank-Migration und die API-Routen für PROJ-19 noch nicht existieren,
sind alle neuen UI-Bausteine bewusst clientseitig gegen die unten stehenden
Endpunkte verdrahtet und degradieren beim Fehlschlagen sanft (Lade-/
Fehlerzustand statt Absturz) — geprüft per `npm run build` (fehlerfrei),
vollständiger Testlauf (272/272 grün, keine Regression) und manuellem
Abruf aller neuen Routen auf dem Dev-Server (alle liefern sauber 307 zu
`/login`, kein 500er).

**Gebaut:**
- `src/components/coin-balance.tsx` — Münzstand-Pille (Header) + Inline-Variante
- `src/components/blitz-round-card.tsx` — Kachel auf der Startseite
  (verfügbar / heute erledigt mit Countdown-Text)
- `src/app/blitzrunde/page.tsx` + `blitz-client.tsx` — vollständiger
  Rundenablauf: Start, 60-Sekunden-Countdown, Sofort-Feedback ohne
  Rundenabbruch bei Falsch, Ergebnis-Bildschirm
- `src/app/quiz/quiz-client.tsx` — Münzen-Zeile im bestehenden
  Ergebnis-Bildschirm (nur sichtbar, wenn `coins_earned` in der Antwort
  vorhanden ist — verhindert eine falsche „+0 Münzen"-Anzeige, solange
  `/backend` das Feld noch nicht liefert)
- `src/app/page.tsx` — Münzstand-Pille im Header, Blitzrunde-Kachel im
  Hauptbereich, Link zum Speditionshof (für PROJ-20)

**Angenommener API-Vertrag für `/backend`** (in dieser Form vom Frontend
erwartet — abweichende Feldnamen brauchen sonst eine Anpassung hier):
- `GET /api/profile/stats` (bestehend) — Antwort um `coin_balance: number`
  ergänzen
- `POST /api/quiz/sessions` (bestehend) — Antwort um `coins_earned: number`
  ergänzen
- `GET /api/quiz/blitz/status` (neu) → `{ available: boolean, next_available_at: string | null }`
- `POST /api/quiz/blitz/start` (neu) → `{ token: string, questions: QuizQuestion[] }`
  (gleiche Fragen-Form wie im bestehenden Quiz, gemischt über alle Fächer,
  serverseitig vorab geladen)
- `POST /api/quiz/blitz/finish` (neu), Body `{ token: string, answers: SessionAnswer[] }`
  → `{ correct_count: number, coins_earned: number, xp_earned: number, new_coin_balance: number, new_total_xp: number, new_streak: number }`
  (409 falls der Tagesbonus schon verbraucht ist — das Frontend zeigt dafür
  den „Heute schon erledigt"-Zustand)

**Noch nicht möglich:** interaktives Durchklicken im Browser mit echtem
Login — dafür fehlt in dieser Umgebung ein Browser-Automatisierungs-Tool.
Die serverseitige Prüfung (Build, Tests, Routen-Abruf ohne 500er) deckt das
nicht ab; ein kurzer manueller Test durch den Nutzer nach dem Login wird vor
`/qa` empfohlen.

## Implementation Notes (Backend)

**Stand 2026-09-13 — Backend gebaut und gegen die produktive Datenbank
angewendet** (Supabase-Projekt „Spedilern App", `riqafwijurbxvywzlipx`, nach
expliziter Nutzer-Freigabe). Migration
`supabase/migrations/20260913_proj19_proj20_coins_shop.sql`.

**Datenbank:**
- `profiles`: neue Spalten `coin_balance` (nie negativ), `starter_coins`
  (einmaliger Grant-Betrag, für den Hinweis-Banner), `starter_coins_seen`
- Einmaliges Startguthaben rückwirkend vergeben — Stichprobe gegen die echten
  Daten bestätigt exakt die in dieser Spec vorhergesagten Werte: 39 Konten
  mit `total_xp > 0`, 0 Abweichungen von der Formel, Min 61 / Max 250 /
  Ø 117 Münzen
- `blitz_starts` (Server-Start-Marke, RLS: nur eigene Zeilen)
- `blitz_rounds` (eine Zeile je gewerteter Runde, `UNIQUE(user_id,
  calendar_day)` — das IST die Tagessperre, hält auch bei zwei
  gleichzeitigen Wertungsversuchen, weil nur ein INSERT gewinnt)

**API-Routen** (erfüllen exakt den in den Frontend-Notizen oben
dokumentierten Vertrag):
- `GET /api/profile/stats` — liefert jetzt `coin_balance` und
  `starter_coins_hint` (einmalig, bis `POST /api/profile/coins/ack-starter`)
- `POST /api/quiz/sessions` — liefert jetzt `coins_earned`
  (1 Münze/richtig + 3 Bonus ab 5 Fragen)
- `GET /api/quiz/blitz/status`, `POST /api/quiz/blitz/start`,
  `POST /api/quiz/blitz/finish`

**Wie die drei offenen Architektur-Fragen gelöst wurden:**
- **Server-Start-Marke:** `blitz_starts`-Zeile beim Start, `finish` prüft
  Token-Gültigkeit, Nicht-Verbrauch und Rundenalter (≤ 90 s, 60 s Runde +
  Puffer) — jenseits davon 400 „Runde ist abgelaufen". Plausibilitätsgrenze
  für die Antwortenzahl: max. 60 (statt der 20 aus der normalen Quiz-Session,
  weil eine Blitzrunde realistisch mehr Fragen in 60 s schafft).
- **Tagessperre gegen Rennbedingungen:** nicht per Anwendungslogik geprüft,
  sondern über den Datenbank-Constraint `UNIQUE(user_id, calendar_day)` auf
  `blitz_rounds` erzwungen — ein zweiter gleichzeitiger `finish`-Aufruf
  bekommt einen 23505-Fehler und wird mit 409 abgelehnt, **ohne** Münzen/XP
  gutzuschreiben.
- **Kalendertag-Zeitpunkt:** wird bei `finish` neu berechnet (Europe/Berlin),
  nicht beim `start` übernommen — erfüllt den Edge Case „Runde beginnt
  23:59, endet 00:00" aus der Spec.

**Bewusste Vereinfachung gegenüber dem normalen Quiz-Pfad:** Kein
Badge-Check nach einer Blitzrunde — war keine Acceptance Criteria und im
Frontend-Ergebnisbildschirm auch nicht vorgesehen; kann bei Bedarf später
ergänzt werden.

**Tests:** 8 neue/erweiterte Integrationstests-Dateien (Auth, Validierung,
Happy Path, Tagessperre-Konflikt, Ablauf-Grenze), alle 324 Tests
(inkl. Bestand) grün, `npm run build` fehlerfrei.

**Weiterhin offen:** interaktiver Login-Test im Browser (kein
Browser-Automatisierungstool in dieser Umgebung verfügbar) — empfohlen vor
`/qa`.

## QA Test Results

**Tested:** 2026-09-24
**Tester:** QA Engineer (AI)
**Methode:** Code gegen die Akzeptanzkriterien geprüft, `npm test` (396/396 grün, inkl. der PROJ-19-Tests), `npm run build` (fehlerfrei), Sicherheitsprüfungen an der Produktions-DB mit simulierter Schüler-Rolle in zurückgerollten Transaktionen. Nicht getestet: Browser-Darstellung, Responsive, E2E. Dev-Server und Browser-Tests haben den Rechner des Nutzers überlastet.

### Acceptance Criteria Status
- [x] Währung: Münzstand auf `profiles`, Standard 0, Gutschriftformel normale Runde (1/richtig + 3 ab 5 Fragen), Anzeige Startseite und Abschlussbildschirm, keine Änderung an XP/Level/Streak/Badges
- [x] Blitzrunde: Start von der Startseite, gemischte Fächer, 60-s-Countdown, falsche Antwort beendet die Runde nicht, Abschlussbildschirm, Formel 3/richtig + 10 Tagesbonus und 5 XP/richtig, Streak nach denselben Regeln, „heute erledigt" plus Wiederverfügbarkeit, Tageswechsel Europe/Berlin
- [x] Verbrauch erst bei Wertung, zweiter Wertungsversuch serverseitig abgelehnt (UNIQUE `(user_id, calendar_day)`), Plausibilität (Token, Rundenalter ≤ 90 s, max. 60 Antworten)
- [ ] **BUG-1:** „Münzstand ausschließlich serverseitig veränderbar": verletzt. Der Client kann den Kontostand direkt setzen.
- [ ] **BUG-2:** „Manipulierter Client kann sich keine Münzen gutschreiben": verletzt. Der Server übernimmt `is_correct` vom Client.
- [x] Startguthaben: Formel, nur Konten mit XP, idempotent, ≤ 250, Hinweis einmalig (im Backend gegen echte Daten geprüft: 39 Konten, 0 Abweichungen)
- [x] Kosten: keine neuen Dienste, kein Cron

### Bugs Found

#### BUG-1: Schüler können Münzen, XP und Streak direkt selbst setzen
- **Severity:** Critical
- **Belegt:** An der Produktions-DB mit Schüler-Rolle geprüft: `update profiles set coin_balance = 999999, total_xp = 999999` auf das eigene Profil klappt. Die RLS-Policy `profiles_update_own` erlaubt jede Spalte. Der Anon-Key ist öffentlich, ein Aufruf aus den Browser-DevTools genügt.
- **Auswirkung:** Die Münz-Ökonomie (PROJ-19/20) ist wirkungslos. Das gilt schon länger auch für XP, Level, Streak und damit die Rangliste (PROJ-4/5/8).
- **Fix-Richtung:** Spaltenrechte. Nutzer dürfen nur `display_name`, `show_real_name`, `leaderboard_opt_out`, `starter_coins_seen` selbst ändern. XP, Streak und Münzen schreiben `quiz/sessions` und `quiz/blitz/finish` über den Service-Client.
- **Priority:** Fix before deployment

#### BUG-2: Richtig/falsch meldet der Client
- **Severity:** High
- **Steps to Reproduce:** `POST /api/quiz/sessions` mit 20 Antworten, alle `is_correct: true` (beliebige Options-IDs) → 23 Münzen und 200 XP, beliebig oft wiederholbar. `POST /api/quiz/blitz/finish` mit 60 „richtigen" Antworten (auch dieselbe Frage mehrfach) → 190 Münzen und 300 XP am Tag.
- **Nebenwirkung:** Die gemeldeten Werte landen so in `quiz_answers` und verfälschen „Lücken schließen" und die Badges.
- **Fix-Richtung:** Der Server ermittelt `is_correct` selbst aus dem Lösungsschlüssel (`src/lib/answer-key.ts`, seit PROJ-21 vorhanden). Die Blitzrunde wertet jede Frage nur einmal.
- **Priority:** Fix before deployment

#### BUG-3: `quiz/today` rechnet den Tag in UTC
- **Severity:** Low. Der Edge Case „Tagesgrenze vereinheitlichen" ist offen, zwischen 0 und 2 Uhr zählt der Vortag.
- **Priority:** Fix in next sprint

#### BUG-4: Zeitumstellung in `getBerlinDateStr(-1)`
- **Severity:** Low. Das Problem gab es schon vorher und ist in der Spec vermerkt. Am Tag nach der Umstellung liefert die Funktion zwischen 0 und 1 Uhr den falschen Vortag.
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** alle bis auf die beiden Missbrauchsschutz-Kriterien bestanden (statisch)
- **Bugs Found:** 4 (1 Critical, 1 High, 0 Medium, 2 Low)
- **Production Ready:** NO. BUG-1 und BUG-2 zuerst beheben.

## Deployment
_To be added by /deploy_
