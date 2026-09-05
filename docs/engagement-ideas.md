# Ideen-Backlog Spielspaß

> Gepflegt vom **Fun Auditor** (`/fun ideen`). Jede Idee nennt die Kennzahl,
> die sie bewegen soll. Reihenfolge: Wirkung je Aufwand, oberste zuerst.
> Der Musterkatalog dahinter steht in `docs/engagement-patterns.md`.

**Stand:** 05.09.2026, erster vollständiger Audit-Durchlauf
(`scripts/engagement/history/2026-09-05-07-07-59.json`). Kein Trend — es ist
der erste gespeicherte Snapshot.

## Befund

Die Kennzahlen der Erstbefundung bestätigen sich: 34 von 45 Schülerkonten
haben je gespielt, 94,1 % sind seit über 28 Tagen weg, 30 von 34 stehen bei
bester Streak = 1. In der Session dagegen stimmt alles — 69,5 % Trefferquote,
Median 10 Fragen, 51,1 % der Lerntage mit freiwilliger Zweitrunde.

Drei Messungen aus diesem Lauf schärfen das Bild und verändern die Reihenfolge:

**1. Die App wurde ausschließlich im Unterricht benutzt — nicht bloß
überwiegend.** Rechnet man die drei Vielnutzer heraus (`0f4190d2`, `ae4522f0`,
`333242b0`), liegen **179 von 195 Sessions (92 %) zwischen 8 und 14 Uhr**.
Nur **3 von 45 Konten** hatten je eine Wochenend-Session. Die Lerntage der
Klasse sind vier Kalendertage: 12.05., 19.05., 20.07., 21.07. — genau die
Tage, an denen auch die Konten angelegt wurden (14 / 8 / 17 / 3 Anmeldungen).
Die Deutung „App lief im Unterricht, nie privat" ist damit nicht nur plausibel,
sondern quantifiziert.

**2. Wer zurückkommt, wird mit Misserfolg empfangen.** Über alle 14 Rückkehr-
fälle nach ≥ 14 Tagen Pause fällt die Trefferquote von **71 % vorher auf 50 %
am Rückkehrtag** — unter die Untergrenze des Flow-Korridors. In 11 von 14
Fällen ging es abwärts, teils drastisch (`634aa771`: 79 % → 44 %; `f453c5e4`:
75 % → 38 %). Die einzige Kennzahl, die in der Session bisher „ok" stand, kippt
also genau in dem Moment, auf den es ankommt.

**3. Die Rückkehr-Kennzahl wird derzeit über die Sommerferien gemessen.** Der
letzte Klassentag war der 21.07., die letzte Session eines Vielnutzers der
04.09. Für den 28-Tage-Horizont heißt das: „94 % verschwunden" enthält den
kompletten Ferienzeitraum. Das entschuldigt nichts — schon während des
Schuljahrs hatten 26 von 34 aktivierten Konten nur **einen oder zwei**
Lerntage, und die lagen auf Klassentagen —, aber die Zahl darf im
September nicht als Beweis für ein akutes Absacken gelesen werden.

## Offene Ideen

### 1. Die App auf den Startbildschirm bringen (PWA-Manifest)
- **Was:** `manifest.webmanifest` (Name, Icons 192/512, `display: standalone`,
  `theme_color: #111827`), Apple-Touch-Icon, plus ein dezenter Hinweis nach der
  dritten Session: „Zum Startbildschirm hinzufügen — dann bist du in einem Tipp
  wieder da."
- **Warum:** `git ls-files public` und `src/app/layout.tsx` zeigen: es gibt kein
  Manifest, kein Icon, keinen Service Worker. Die App ist ein Browser-Tab. Wer
  im Unterricht eine URL geöffnet und den Tab abends geschlossen hat, hat keinen
  Weg zurück außer der Erinnerung an die Adresse. Das erklärt, warum 26 von 34
  Konten bei ein bis zwei Lerntagen stehen, obwohl die Session selbst gefällt.
- **Wirkung:** `active_7d` (2,9 %), `second_day` (38,2 %). Ziel: `second_day`
  über 50 %. Zugleich Voraussetzung für Idee 5 — Web-Push auf iOS geht nur aus
  einer installierten PWA heraus.
- **Aufwand:** S — eine Datei, ein Icon-Satz, ein Meta-Tag.
- **Risiko:** Gering. Der Installations-Hinweis darf nicht bei jedem Besuch
  erscheinen (einmal, danach dauerhaft weggeklickt). Ein Service Worker mit
  Caching würde Fragen-Updates verzögern — deshalb bewusst **kein** Offline-
  Cache, nur Installierbarkeit.

### 2. Wiedereinstieg mit Rückenwind
- **Was:** Wer nach mehr als sieben Tagen zurückkommt, bekommt nicht die normale
  Fächerübersicht, sondern eine Runde „Wiedereinstieg": 5 Fragen, die dieser
  Nutzer früher schon richtig beantwortet hat, plus einen Satz Einordnung
  („Willkommen zurück — die ersten fünf kennst du schon"). Erst danach der
  reguläre Einstieg.
- **Warum:** Gemessen: 71 % Trefferquote vorher, **50 % am Rückkehrtag** über 14
  Fälle. Die App wirft Zurückkehrende bei Null in den vollen Fragenpool, in dem
  inzwischen neuer Stoff liegt. Der erste Eindruck nach der Pause ist „ich kann
  das nicht mehr" — der teuerste Moment, um zu enttäuschen. `PROJ-14` („Lücken
  schließen") tut das Gegenteil: es sucht gezielt die Fehler heraus.
- **Wirkung:** Trefferquote am Rückkehrtag zurück in den Korridor (Ziel ≥ 65 %),
  darüber `streak_recovery` (62,5 %) und `active_7d`. Neue Kennzahl nötig:
  „Trefferquote am Rückkehrtag" gehört in `engagement-metrics.ts`.
- **Aufwand:** M — Fragenauswahl über `quiz_answers` (richtig beantwortete IDs
  des Nutzers) und eine Verzweigung im Einstieg.
- **Risiko:** Zu leichte Fragen langweilen — deshalb hart auf 5 begrenzt und nur
  einmal je Rückkehr. Fällt die Gesamt-Trefferquote dadurch über 85 %, ist die
  Dosis zu hoch; im nächsten Audit mitlesen.

### 3. Streak-Belohnung nach vorne holen — Tag 2 muss sich lohnen
- **Was:** Drei kleine Eingriffe: (a) ein Badge „Zweiter Tag" für die erste
  Rückkehr überhaupt; (b) der XP-Bonus greift ab Streak 2 statt ab 7, dafür
  kleiner (+2 XP je richtiger Antwort, ab 7 wie bisher +5); (c) ein Freeze-Tag
  pro Woche plus Reparaturhinweis am Folgetag.
- **Warum:** Gelesen in `src/app/api/quiz/sessions/route.ts`: `calcNewStreak`
  kennt genau drei Fälle — heute, gestern, sonst 1. Kein Auffangnetz. Und
  `STREAK_BONUS_THRESHOLD = 7`: die einzige XP-Belohnung für Beständigkeit
  liegt bei sieben Tagen. Von 34 Nutzern hat genau **einer** je Streak 7
  erreicht. In `src/lib/badges.ts` ist das erste Streak-Badge „Feuerstarter"
  bei 3 Tagen — auch das haben nur 2 Nutzer. Für das Verhalten, das die App
  wirklich braucht (einmal wiederkommen), zahlt sie **nichts**.
- **Wirkung:** `streak_3plus` (5,9 %), `second_day` (38,2 %). Ziel:
  `streak_3plus` über 20 % im nächsten Audit.
- **Aufwand:** S — zwei Konstanten, eine Badge-Definition, eine Bedingung.
- **Risiko:** Ein Freeze entwertet den Streak, wenn er zu großzügig ist —
  höchstens einer je Woche, sichtbar als verbrauchtes Guthaben. Der kleinere
  Frühbonus darf den 7-Tage-Bonus nicht überflüssig machen.

### 4. Wochenserie neben der Tagesserie
- **Was:** Zweiter Zähler „Wochen in Folge mit mindestens 2 Lerntagen", gleich
  neben der Flamme. Die Tagesserie bleibt, verliert aber ihre Alleinstellung.
- **Warum:** Das Streak-Histogramm ist eine Wand: 30 von 34 stehen bei 1. Ein
  Tagesstreak setzt tägliches Lernen voraus; Berufsschule läuft im Wochen- oder
  Blockrhythmus, die Klasse war an vier Kalendertagen in vier Monaten
  gemeinsam da. Eine Serie, die für die Zielgruppe strukturell unerreichbar
  ist, motiviert nicht, sie zeigt nur Versagen an. Ein Wochenmaß ist mit zwei
  Lerntagen gewinnbar und passt zum PRD-Ziel „mindestens 3×/Woche".
- **Wirkung:** `week1_habit` (2,9 %), `stickiness` (6 Tage). Ziel: mindestens
  ein Drittel der Aktivierten mit Wochenserie ≥ 2.
- **Aufwand:** M — neue Spalte auf `profiles` plus Berechnung beim Session-POST;
  die Wochenlogik gibt es als Muster schon in `src/app/api/leaderboard/route.ts`.
- **Risiko:** Zwei konkurrierende Zähler auf einem Bildschirm verwirren. Die
  Wochenserie muss klar die ruhigere, die Tagesserie die laute Anzeige sein —
  sonst leidet die Verständlichkeit der Startseite.

### 5. Erinnerung zur eigenen Lernzeit — mit korrigierter Uhrzeit
- **Was:** Opt-in-Erinnerung (E-Mail oder Web-Push aus der installierten PWA)
  höchstens einmal täglich, Abmeldung in einem Klick.
- **Warum:** `active_7d` steht bei 2,9 %. Die App hat keinen einzigen Weg, sich
  in Erinnerung zu bringen — bestätigt: kein Mailversand, kein Push, kein
  Service Worker im Repo.
- **Korrektur gegenüber der Erstfassung:** Die Uhrzeit **darf nicht** aus dem
  Tageszeit-Histogramm abgeleitet werden. Der Gipfel um 11 Uhr ist Unterrichts-
  zeit (92 % der Schüler-Sessions liegen zwischen 8 und 14 Uhr). Eine Erinnerung
  um 11 Uhr erreicht die Azubis im Betrieb oder im Klassenzimmer. Sinnvoll ist
  ein fester Abendslot (Vorschlag 18:30 Uhr) mit freier Wahl im Profil.
- **Wirkung:** `active_7d`, `second_day`, `week1_habit`.
- **Aufwand:** M — E-Mail über Supabase ist der günstigere Weg als Web-Push;
  ein Vercel-Cron im Hobby-Plan reicht für einen Tageslauf.
- **Risiko:** Ungefragte Erinnerungen kosten Vertrauen und landen im Spam, was
  die Absenderreputation der ganzen App beschädigt. Nur Opt-in, harte
  Frequenzgrenze. Ohne Idee 1 fällt die Push-Variante auf iOS aus.

### 6. Tagesauftrag der Klasse
- **Was:** Der Admin hinterlegt für einen Tag einen kurzen Auftrag (Fach +
  Thema + 10 Fragen), der bei allen Schülern oben auf der Startseite steht:
  „Auftrag für heute — von deiner Lehrkraft". Nach Ablauf zeigt die Startseite,
  wie viele aus der Klasse ihn erledigt haben (nur die Zahl, keine Namen).
- **Warum:** Der einzige nachweislich funktionierende Auslöser in vier Monaten
  Daten ist der Unterricht — jeder Massentag (12.05., 19.05., 20.07., 21.07.)
  ist ein Schultag. Statt gegen diesen Befund anzukämpfen, nutzt die Idee ihn:
  Die Lehrkraft kann den Anlass setzen, und der Auftrag gilt bis Mitternacht,
  wandert also aus der Unterrichtsstunde in den Abend.
- **Wirkung:** `active_7d`, `second_day`. Ziel: an einem Auftragstag mindestens
  die Hälfte der aktivierten Konten mit einer Session, davon ein Viertel nach
  16 Uhr.
- **Aufwand:** M — eine Tabelle `daily_assignments`, ein Admin-Formular, eine
  Karte auf der Startseite. Bleibt im PRD-Rahmen (ein Admin, kein Chat).
- **Risiko:** Verschiebt die Motivation von innen nach außen — wer nur noch auf
  Aufträge wartet, lernt in den Ferien gar nicht mehr. Deshalb höchstens zwei
  Aufträge pro Woche, und der freie Einstieg bleibt gleichrangig sichtbar.
  Hängt zudem daran, dass die Lehrkraft mitspielt; ohne sie tut die Karte nichts.

### 7. Countdown auf den Prüfungstermin
- **Was:** Der IHK-Termin als Datum im Profil, daraus „noch 87 Tage" auf der
  Startseite, dazu die zwei Fächer mit dem geringsten Abdeckungsgrad.
- **Warum:** Der eigentliche Antrieb der Zielgruppe ist die Abschlussprüfung —
  die App nennt sie nirgends. `src/app/page.tsx` zeigt XP, Level, Streak,
  Wochenpunkte und Fächerfortschritt; ein Zeitbezug zum Prüfungsziel fehlt
  vollständig.
- **Wirkung:** `active_7d`, `activation` (75,6 %).
- **Aufwand:** S — eine Spalte auf `profiles`, eine Karte.
- **Risiko:** Druck statt Motivation, wenn der Ton mahnend wird. Sachlich
  formulieren, kein rotes Countdown-Blinken. Wer kein Datum einträgt, sieht die
  Karte nicht.

### 8. Zwei tote Badges ersetzen
- **Was:** „Level 25" und „Prüfungsreif" durch erreichbare Ziele ersetzen.
- **Warum:** Gerechnet aus `src/lib/xp-utils.ts` (`getXpForLevel` = 50·n·(n−1))
  und `src/lib/badges.ts`: Level 25 verlangt 30 000 XP, Level 50 (= „Prüfungs-
  reif") 122 500 XP, also rund 12 250 richtige Antworten. Der aktivste Nutzer
  aller Zeiten steht nach **290 Sessions** bei 25 830 XP — er hat Level 25 nicht
  erreicht. Diese Badges sind nicht zufällig leer, sie sind rechnerisch
  unerreichbar. Vorschlag: „Prüfungsreif" an die Prüfungssimulation binden
  (z. B. drei bestandene Durchgänge — `exam_completion` steht bei 66,7 %, die
  Mechanik funktioniert), „Level 25" auf Level 15 senken.
- **Wirkung:** `dead_badges` (2 → 0), `badge_median`.
- **Aufwand:** S — Datenpflege plus `BADGE_DEFINITIONS`.
- **Risiko:** Gering. Rückwirkende Vergabe über `isRetroactive` prüfen, sonst
  bekommt niemand das neue Badge für längst Geleistetes.

### 9. Klassen-Liga statt Gesamtrangliste
- **Was:** Wöchentliche Rangliste innerhalb der eigenen Klasse mit Auf- und
  Abstieg.
- **Warum:** Die Gesamtliste wird von einem einzigen Konto mit 25 830 XP
  angeführt — für alle anderen ist sie entschieden. Der Wettbewerb, der in
  einer Berufsschulklasse zählt, ist der in der Klasse.
- **Korrektur gegenüber der Erstfassung:** Zwei Annahmen dort waren falsch.
  (a) Ein Wochen-Reset existiert bereits — `src/app/api/leaderboard/route.ts`
  kennt `period=week|month|all` mit Montag-Grenze. Neu wäre nur die
  Gruppierung. (b) „Klassenstufen gibt es bereits (PROJ-12)" stimmt nicht:
  `supabase/migrations/20260424_proj12_class_level_topics.sql` setzt
  `class_level` auf `questions`, `questions_draft` und `generation_jobs` —
  **nicht auf `profiles`**. Ohne Klassenzuordnung der Nutzer gibt es keine
  Liga. Aufwand darum M→L statt M.
- **Wirkung:** `active_7d`, `stickiness`; beobachten: `leaderboard_optout`
  (11,1 %, darf nicht steigen).
- **Aufwand:** L — Klassenzuordnung auf `profiles`, Pflege dieser Zuordnung,
  Gruppierung in der API, UI.
- **Risiko:** Hebt `active_7d` und senkt zugleich womöglich
  `leaderboard_optout` ins Negative — Wettbewerbsdruck schreckt Schwächere ab.
  In einer Klasse mit 20 Konten ist die Anonymität des Pseudonyms zudem dünn:
  wer Letzter ist, ist unter Umständen erkennbar. Opt-out muss bleiben.

### 10. Tagesziel mit sichtbarem Ring
- **Was:** Kleines, selbstgewähltes Tagesziel (z. B. 20 XP) mit Fortschritts-
  ring auf der Startseite.
- **Warum:** Ein sichtbar erreichbares Ende macht den Einstieg billig.
- **Einschränkung aus diesem Audit:** Die ursprüngliche Begründung („die App hat
  kein Ende einer Tagesportion") trägt nur halb. `src/app/quiz/quiz-client.tsx`
  hat einen ordentlichen Rundenabschluss mit Ergebnis, XP, Streak, Fragen-
  Review und einem prominenten „Nochmal üben" — und 51,1 % der Lerntage
  enthalten tatsächlich eine zweite Runde. Der Abschluss ist also nicht das
  Problem. Deshalb von Platz 3 nach unten: Die Idee verbessert eine Kennzahl,
  die bereits „ok" steht.
- **Wirkung:** `second_day`, `week1_habit`, `voluntary_extra` (51,1 %, schon ok).
- **Aufwand:** M.
- **Risiko:** Ein zu hoch gewähltes Ziel frustriert. Ein Ring, der abends leer
  bleibt, ist eine tägliche Niederlagemeldung — dieselbe Falle wie beim
  Tagesstreak (siehe Idee 4).

## Korrekturen am Startbestand (04.09.2026 → 05.09.2026)

Nichts gestrichen — keine Idee wurde von den Zahlen widerlegt. Verschoben und
korrigiert wurde:

| Erstfassung | jetzt | Grund |
|---|---|---|
| 1 Erinnerung | 5 | Setzt Idee 1 voraus (kein Manifest, kein Push möglich); Uhrzeit-Herleitung aus dem Histogramm korrigiert |
| 2 Streak-Auffangnetz | 3 | Bleibt vorn, erweitert um den Befund `STREAK_BONUS_THRESHOLD = 7` |
| 3 Tagesziel-Ring | 10 | Begründung teilweise entkräftet: Rundenabschluss funktioniert, `voluntary_extra` steht bei 51,1 % |
| 4 Klassen-Liga | 9 | Zwei falsche Annahmen korrigiert (Wochen-Reset existiert; `class_level` fehlt auf `profiles`), Aufwand M → L |
| 5 Tote Badges | 8 | Unverändert gültig, jetzt mit Rechnung belegt |
| 6 Prüfungs-Countdown | 7 | Unverändert |

Neu: 1 (PWA-Manifest), 2 (Wiedereinstieg), 4 (Wochenserie), 6 (Tagesauftrag).

## Beobachtungen ohne eigene Idee

- **`calcNewStreak` und die Zeitumstellung.** `getBerlinDateStr(-1)` zieht 24 h
  von der UTC-Zeit ab und formatiert dann nach Berlin. Am Tag nach der
  Zeitumstellung liefert das zwischen 00:00 und 01:00 Uhr (Frühjahr) den
  vorvorletzten Tag statt gestern — ein Streak bräche dort zu Unrecht. Zweimal
  im Jahr, eine Stunde, und es gibt genau eine Session um 0 Uhr in den Daten.
  Kein Handlungsdruck, aber notiert, falls die Streak-Logik ohnehin angefasst
  wird (Idee 3).
- **Nur ein Konto war in den letzten 7 Tagen aktiv** (`ae4522f0`, 14 Lerntage,
  Streak 5, zuletzt 04.09.). Alle Rückkehr-Kennzahlen stützen sich derzeit auf
  ein bis drei Konten. Vor dem nächsten Klassentag sind Quoten mit weniger als
  zehn Nennern nicht belastbar — der Einzelblick (`npm run fun:user`) ist die
  ehrlichere Auskunft.
- **Elf Konten haben sich angemeldet und nie gespielt** (34 von 45 ergibt
  `activation` = 75,6 %). Fünf davon stammen vom
  20.07. — dem Tag mit 17 Neuanmeldungen. Vermutlich Anmeldungen, die im
  Unterricht nicht mehr bis zur ersten Runde kamen; das ist eher ein Problem
  der Unterrichtsminute als eines der App.
