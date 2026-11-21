# PROJ-18: Rückkehr-Erinnerung per Web-Push

## Status: Deployed
**Created:** 2026-09-05
**Last Updated:** 2026-11-21 (live gegangen ohne QA; wieder aufgenommen; Nachträge 5–10: 19 Uhr, Opt-in auf „Heute“, abwechselnde Texte, zwei Adressen, nur Di/Do statt täglich)

## Problem

Die App hat kein Spaßproblem, sondern ein Rückkehrproblem. Das Spielspaß-Audit
(PROJ-17, Messung vom 04.09.2026, 45 Schülerkonten ohne Admin-/Testkonten) zeigt
beides nebeneinander:

| Kennzahl | Wert | Ziel |
|----------|------|------|
| In den letzten 7 Tagen aktiv | 2,9 % | ≥ 50 % |
| Zweiter Tag erreicht | 38,2 % | ≥ 50 % |
| Drei Tage in Woche 1 | 2,9 % | ≥ 30 % |
| Seit über 28 Tagen verschwunden | 94,1 % | ≤ 30 % |
| Trefferquote in der Session | 69,5 % | 65–85 % ✓ |
| Lerntage mit freiwilliger Zweitrunde | 51 % | ✓ |

Wer spielt, hat Spaß. Es fehlt ausschließlich der Anlass zurückzukommen: Die App
besitzt heute **keinen einzigen Weg**, sich in Erinnerung zu bringen. Die letzten
Sessions fast aller Konten liegen 45–46 Tage zurück, gehäuft um 11 Uhr vormittags
— die App lief im Unterricht und wurde danach nie privat geöffnet.

Dieses Feature ist Idee 1 aus `docs/engagement-ideas.md`.

## Dependencies
- Requires: PROJ-1 (User Authentication) — Erinnerungen hängen am angemeldeten Konto
- Requires: PROJ-5 (Streak System) — der Nachrichtentext greift `current_streak` auf
- Requires: PROJ-3 (Daily Learning Session) — Opt-in erscheint nach der ersten Runde
- Misst gegen: PROJ-17 (Spielspaß-Audit) — `active_7d`, `second_day`, `week1_habit`

## Scope-Entscheidungen (mit dem Nutzer abgestimmt, 05.09.2026)

1. **Zustellzeit:** feste Uhrzeit für alle, 17:00 Uhr Europe/Berlin. Ein Cron-Lauf
   pro Tag — läuft sicher im Vercel-Gratistarif. Keine individuelle Uhrzeit in v1.
2. **Inhalt:** bei laufendem Streak Streak-Rettung, sonst neutrale kurze Einladung.
3. **Opt-in:** direkt nach der ersten abgeschlossenen Quiz-Runde, auf dem
   Ergebnis-Bildschirm. Nie beim ersten Öffnen der App.
4. **Abklingen:** nach 5 aufeinanderfolgenden Erinnerungen ohne Reaktion pausieren,
   danach höchstens noch eine pro Woche.

### Nachträge vor dem Bau (mit dem Nutzer abgestimmt, 21.11.2026)

Die Spec stammt vom September. Seitdem gibt es zwei Adressen (SpediLern,
TouristikLern), die Blitzrunde und den „Heute“-Screen. Neue Messung (175
Schülerkonten): 42 % haben nie gespielt, 33 % nur am Anmeldetag, und dieser Tag
liegt meist im Unterricht.

5. **Uhrzeit 19 Uhr statt 17 Uhr** (Europe/Berlin, stundengenau). Ersetzt Punkt 1.
6. **Opt-in auch auf „Heute“:** Zusätzlich zur Karte nach der ersten Runde steht
   auf dem „Heute“-Screen eine Karte „Erinnerungen einrichten“, bis der Schüler
   entschieden hat. Damit kann die Lehrkraft die Einrichtung (Home-Bildschirm +
   Erlaubnis) am Anmeldetag gemeinsam im Unterricht machen. Ergänzt Punkt 3, „nie
   ungefragt beim Seitenaufruf“ gilt weiter: Der Browser-Dialog kommt nur nach Tippen.
7. **Abwechselnde Texte:** 6–8 kurze Texte je Fachbereich, die sich abwechseln.
   Ein Streak-Text kommt nur, wenn der Streak heute noch zu retten ist. Ersetzt die
   zwei festen Texte.
8. **„Heute gelernt“** umfasst Quiz-Session, Blitzrunde und Prüfungssimulation.
9. **Je Adresse eigenes Manifest** (Name und Symbol von SpediLern bzw.
   TouristikLern). Push-Anmeldungen gelten je Adresse.
10. **Höchstens zweimal pro Woche statt täglich** (Nutzerentscheidung 21.11.2026,
    „täglich nervt“): feste Tage **Dienstag und Donnerstag, 19 Uhr** (Europe/Berlin).
    Der Cron läuft weiter einmal täglich (Vercel Hobby), der Versand-Job sendet
    aber nur an diesen zwei Wochentagen. Wer an dem Tag schon gelernt hat
    (Session, Blitzrunde oder Prüfungssimulation), bekommt nichts. Ersetzt Punkt 1
    und die Regel „eine pro Tag“ durch „höchstens eine pro Termin, zwei pro Woche“.
    Abklingen: nach **4** Erinnerungen in Folge ohne Reaktion (≈ 2 Wochen) nur noch
    **eine alle 14 Tage** (Dienstag). Ersetzt Punkt 4 (vorher 5 / wöchentlich).
    Die Streak-Erinnerung entfällt als eigener Fall: Bei zwei Terminen pro Woche
    wäre „dein Streak ist in Gefahr“ meist falsch. Der Streak-Text kommt nur, wenn
    der Streak heute tatsächlich noch zu retten ist (letzte Session gestern).
    Texte und Oberfläche sprechen daher von „Erinnerung“, nicht von „täglich“.

## User Stories

- Als Azubi möchte ich nach meiner ersten Runde gefragt werden, ob ich täglich
  erinnert werden will, damit ich das Lernen nicht schlicht vergesse.
- Als Azubi mit laufendem Streak möchte ich rechtzeitig erfahren, dass mein Streak
  heute noch zu retten ist, damit ich ihn nicht unbemerkt verliere.
- Als Azubi möchte ich Erinnerungen mit einem Klick wieder abstellen können, ohne
  in den Browser-Einstellungen suchen zu müssen.
- Als Azubi, der heute schon gelernt hat, möchte ich keine Erinnerung mehr bekommen,
  damit die Meldung nie überflüssig wirkt.
- Als iPhone-Nutzer möchte ich verständlich erklärt bekommen, warum ich die App
  erst zum Home-Bildschirm hinzufügen muss, damit ich nicht bei einem stummen
  Fehler stehen bleibe.
- Als Admin möchte ich sehen können, wie viele Nutzer Erinnerungen aktiviert haben
  und wie viele darüber zurückkommen, damit die Wirkung messbar ist.

## Acceptance Criteria

### Installierbarkeit (PWA-Grundlage)
- [ ] Die App liefert ein Web-App-Manifest mit Name, Icons (192 px und 512 px),
      `display: standalone`, Startseite `/` und Themefarbe `#111827`.
- [ ] Ein Service Worker ist registriert und empfängt `push`- und
      `notificationclick`-Ereignisse.
- [ ] Der Service Worker verändert das Caching-Verhalten der App nicht
      (kein Offline-Caching in v1 — nur Push).

### Opt-in
- [ ] Nach der ersten abgeschlossenen Quiz-Runde erscheint auf dem
      Ergebnis-Bildschirm eine Karte „Erinnert werden?" mit den Optionen
      „Ja, bitte" und „Nein danke" (Zeiten siehe Nachtrag 10).
- [ ] Die Karte erscheint genau einmal; bei „Nein danke" wird sie frühestens nach
      14 Tagen und höchstens einmal erneut gezeigt.
- [ ] Erst nach Tippen auf „Ja" fragt der Browser um die Benachrichtigungs-Erlaubnis
      (nie ungefragt beim Seitenaufruf).
- [ ] Wird die Browser-Erlaubnis verweigert, zeigt die App eine ruhige Erklärung
      und fragt nicht erneut.
- [ ] Auf iOS ohne Home-Bildschirm-Installation zeigt die Karte statt des Dialogs
      eine bebilderte Anleitung („Teilen → Zum Home-Bildschirm").
- [ ] Der Aktivierungszustand ist jederzeit im Profil sichtbar und dort mit einem
      Klick umschaltbar.

### Versand
- [ ] Ein täglicher Cron-Lauf verschickt die Erinnerungen, aber nur dienstags und
      donnerstags zwischen 19:00 und 19:59 Uhr Europe/Berlin (Nachtrag 10) (Sommer-/Winterzeit korrekt, d. h. Cron in UTC
      entsprechend). Vercel garantiert im Hobby-Tarif nur Stundengenauigkeit,
      keine exakte Minute — das ist für dieses Feature ausreichend und kein Bug.
- [ ] Es geht **höchstens eine** Benachrichtigung pro Nutzer und Tag raus, und
      höchstens zwei pro Woche (Dienstag, Donnerstag).
- [ ] Nutzer, die am selben Tag bereits eine Quiz-Session abgeschlossen haben,
      erhalten keine Erinnerung.
- [ ] Nutzer mit `current_streak >= 1` erhalten den Streak-Text
      („Dein 4-Tage-Streak wartet — eine Runde reicht"), alle anderen den
      neutralen Text („5 Minuten für deine Prüfung?").
- [ ] Ein Tippen auf die Benachrichtigung öffnet die App direkt im Quiz-Einstieg,
      ohne Zwischenseite.
- [ ] Der Cron-Endpunkt ist gegen Aufrufe von außen abgesichert (`CRON_SECRET`)
      und antwortet Unbefugten mit 401.
- [ ] Der Versand läuft ohne kostenpflichtigen Dienst (Web-Push-Standard mit
      eigenen VAPID-Schlüsseln).

### Abklingen und Abmelden
- [ ] Reagiert ein Nutzer 4 Erinnerungen in Folge nicht (kein Öffnen der App am
      selben oder Folgetag), sinkt der Versand auf höchstens eine alle 14 Tage.
- [ ] Nach einer beliebigen Reaktion (Session am Erinnerungstag) beginnt die
      Zählung von vorn und der tägliche Rhythmus kehrt zurück.
- [ ] Eine abgelaufene oder vom Browser zurückgewiesene Subscription (HTTP 404/410)
      wird beim nächsten Versand automatisch gelöscht.
- [ ] Ein Nutzer kann mehrere Geräte anmelden; jedes Gerät bekommt die Meldung,
      aber die Tagesgrenze „eine pro Tag" gilt je Nutzer, nicht je Gerät.

### Messbarkeit
- [ ] Der Fun Auditor kann auswerten, wie viele Nutzer Erinnerungen aktiviert haben
      und wie viele Sessions innerhalb von 3 Stunden nach einer Erinnerung starten
      (neue Kennzahlen in `src/lib/engagement-metrics.ts`).
- [ ] Kennzahlen `active_7d`, `second_day` und `week1_habit` bleiben die Zielgrößen
      und werden vor dem Start als Ausgangswert festgehalten.

## Edge Cases

- **Nutzer öffnet die App um 16:55 Uhr und lernt** — die Erinnerung um 17 Uhr muss
  entfallen; maßgeblich ist der Tagesstand zum Versandzeitpunkt, nicht ein
  vorberechneter Empfängerkreis.
- **Nutzer hat mehrere Geräte, meldet sich auf einem ab** — nur die Subscription
  dieses Geräts wird gelöscht, die anderen bleiben aktiv.
- **Browser-Erlaubnis nachträglich in den Systemeinstellungen entzogen** — der
  Versand schlägt still fehl; die gespeicherte Subscription wird nach dem ersten
  404/410 entfernt und das Profil zeigt wieder „nicht aktiv".
- **iOS-Nutzer aktiviert in Safari statt in der Home-Bildschirm-App** — die Karte
  erkennt das (kein `standalone`-Modus) und zeigt die Installationsanleitung statt
  eines Fehlers.
- **Cron-Lauf fällt aus oder läuft doppelt** — pro Nutzer und Tag darf höchstens
  eine Meldung entstehen; ein zweiter Lauf am selben Tag verschickt nichts.
- **Nutzer hat noch nie eine Session gespielt** — bekommt keine Erinnerung; das
  Feature richtet sich an aktivierte Nutzer, nicht an Registrierte.
- **Streak ist heute schon gebrochen** (letzte Session vorgestern) — es wird der
  neutrale Text verschickt, keine falsche Streak-Behauptung.
- **Sommerzeitumstellung** — die Meldung kommt weiterhin um 17 Uhr Ortszeit an.
- **Nutzer mit deaktiviertem Konto oder Leaderboard-Opt-out** — Opt-out betrifft
  nur die Rangliste, nicht die Erinnerung; deaktivierte Konten bekommen nichts.

## Technical Requirements

- **Kostenrahmen:** kein kostenpflichtiger Dienst. Web-Push-Standard mit eigenen
  VAPID-Schlüsseln, Versand aus einer Vercel Function; ein Cron-Lauf pro Tag.
- **Datenschutz:** Der Push-Payload enthält keinen Namen, keine E-Mail und keine
  Lerninhalte — nur Titel, Kurztext und Ziel-URL.
- **Sicherheit:** Der Versand-Endpunkt ist nur über `CRON_SECRET` erreichbar; der
  private VAPID-Schlüssel liegt ausschließlich serverseitig.
- **Browser:** Chrome, Firefox, Edge (Android und Desktop) uneingeschränkt; Safari
  ab iOS 16.4 nur als Home-Bildschirm-App — dieser Weg muss erklärt werden.
- **Performance:** Der tägliche Lauf muss den Versand für mindestens 500 Nutzer
  innerhalb des Function-Timeouts schaffen.
- **Barrierefreiheit / Design:** Opt-in-Karte im bestehenden Dark-Mode-Stil,
  Touch-Ziele ≥ 44 px (siehe `docs/DESIGN.md`).

## Offene Punkte für /architecture

- Genaue Cron-Frequenz im gebuchten Vercel-Tarif prüfen (v1 braucht nur einen
  Lauf pro Tag; eine spätere individuelle Uhrzeit bräuchte stündliche Läufe).
- Ablage der Subscriptions (eigene Tabelle mit RLS) und der Zählerstände für das
  Abklingen.
- Ob der Service Worker später Offline-Caching übernehmen soll — in v1 bewusst nicht.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

**Neue installierbare App-Grundlage** (betrifft die ganze App, nicht nur diese Seite):
```
App-Wurzel (layout.tsx)
+-- Web-App-Manifest (Name, Icons 192/512, standalone, Themefarbe)
+-- Service Worker (nimmt Push entgegen, öffnet die App bei Klick)
```

**Opt-in-Karte** — erscheint auf dem bestehenden Ergebnis-Bildschirm (`quiz-client.tsx`),
direkt unter der Streak-Karte, vor "Nochmal üben":
```
Ergebnis-Bildschirm (bestehend)
+-- Trefferquote, XP-Karte, Streak-Karte  (bestehend, unverändert)
+-- NEU: Erinnerungs-Karte "Täglich erinnert werden?"
|   +-- Fall A (Chrome/Firefox/Android/Desktop): zwei Buttons
|   |     "Ja, um 17 Uhr" / "Nein danke"
|   +-- Fall B (iPhone, nicht zum Home-Bildschirm hinzugefügt):
|   |     bebilderte Anleitung "Teilen -> Zum Home-Bildschirm" statt Buttons
|   +-- Fall C (schon aktiviert / schon entschieden): Karte wird nicht angezeigt
+-- Fragen-Review, "Nochmal üben"  (bestehend, unverändert)
```

**Profil-Seite** (`profile/page.tsx`) — neuer Baustein neben den bestehenden
Privatsphäre-Einstellungen:
```
Privatsphäre-Karte (bestehend: Pseudonym, Rangliste-Opt-out)
+-- NEU: Erinnerungs-Zeile "Tägliche Erinnerung" mit Ein/Aus-Schalter
```

**Neuer Hintergrund-Job** (kein UI, läuft täglich automatisch):
```
Vercel Cron (17:00 Europe/Berlin)
+-- Versand-Endpunkt: prüft pro aktiviertem Nutzer den Tagesstand,
    verschickt höchstens eine Nachricht, entfernt tote Anmeldungen
```

### B) Datenmodell (in normaler Sprache)

**Neue Tabelle "Erinnerungs-Anmeldungen"** — eine Zeile pro Gerät, auf dem ein
Nutzer Erinnerungen erlaubt hat:
- Gehört zu: einem Nutzer-Konto
- Geräte-Schlüssel (technische Adresse, unter der der Browser dieses Gerät
  erreichbar macht — vom Browser vergeben, nicht von uns lesbar)
- Erstellt am
- Zähler "Erinnerungen ohne Reaktion in Folge" (für das Abklingen)

Ein Nutzer kann mehrere Zeilen haben (mehrere Geräte). Beim Abmelden auf einem
Gerät wird nur dessen Zeile gelöscht.

**Neues Feld auf dem bestehenden Nutzerprofil:**
- "Erinnerungen aktiv?" (ja/nein) — für die schnelle Anzeige im Profil, ohne
  erst die Anmeldungs-Tabelle durchsuchen zu müssen
- "Opt-in-Karte zuletzt abgelehnt am" — steuert die 14-Tage-Wiedervorlage

**Kein neues Feld für den Streak-Text nötig** — der Versand-Job liest den
bereits vorhandenen `current_streak` und die letzte Session direkt aus den
bestehenden Tabellen (Streak-System, PROJ-5).

**Geheime Schlüssel** (kein Datenbank-Datenmodell, sondern Konfiguration):
Ein Schlüsselpaar, mit dem Nachrichten als "von dieser App" ausgewiesen werden
(Web-Push-Standard-Verfahren). Der geheime Teil liegt nur auf dem Server, nie
im Browser-Code.

### C) Tech-Entscheidungen (Begründung)

- **Web-Push-Standard statt Firebase/OneSignal/Anbieter-Dienst:** Kostenlos,
  kein Drittanbieter-Konto, funktioniert mit dem eigenen Schlüsselpaar direkt
  über die Browser-Hersteller. Passt zum Budget-Rahmen aus dem PRD (Supabase
  Free Tier + Vercel Hobby).
- **Ein Cron-Lauf am Tag, feste Uhrzeit:** Der Vercel-Hobby-Tarif erlaubt Cron-
  Jobs nur höchstens täglich, nicht stündlich. Eine feste Uhrzeit für alle
  passt darum genau in den kostenlosen Rahmen; individuelle Uhrzeiten wären
  ein späterer Ausbauschritt mit kostenpflichtigem Tarif.
- **Opt-in erst nach der ersten Runde, nie beim ersten Öffnen:** Browser-
  Erlaubnis-Dialoge, die sofort erscheinen, werden fast immer weggeklickt und
  können danach nicht mehr sauber erneut gefragt werden. Nach einem Erfolgs-
  erlebnis ist die Zustimmungsquote nachweislich höher.
- **iOS bekommt eine Anleitung statt eines Dialogs:** Safari erlaubt Push nur
  aus einer zum Home-Bildschirm hinzugefügten App heraus — ein direkter
  Dialog würde dort schlicht wirkungslos bleiben oder einen stummen Fehler
  erzeugen.
- **Kein Offline-Caching im Service Worker (v1):** Der Service Worker wird
  ausschließlich für Push installiert. Caching würde riskieren, dass Nutzer
  veraltete Fragen sehen — das ist explizit nicht Ziel dieses Features.
- **Abklingen über einen einfachen Zähler statt komplexer Regeln:** Fünf
  Erinnerungen ohne Reaktion in Folge senken die Frequenz auf wöchentlich;
  jede Reaktion setzt den Zähler zurück. Einfach nachvollziehbar und im
  Versand-Job mit einer einzigen Zahl pro Anmeldung abbildbar.

### D) Abhängigkeiten (neue Pakete)

- **web-push** — verschickt Nachrichten nach dem Web-Push-Standard und erzeugt
  das Schlüsselpaar; einzige neue Laufzeit-Abhängigkeit.
- Kein UI-Paket nötig: Karte und Profil-Schalter entstehen aus vorhandenen
  shadcn/ui-Bausteinen (Karte, Button/Switch), Icons aus der bereits
  eingebundenen Lucide-Bibliothek.

### Offene Punkte aus der Spec — hier beantwortet

- **Cron-Frequenz:** ein Lauf pro Tag reicht für v1 und passt in den
  Vercel-Hobby-Tarif; wird in `/backend` als Cron-Konfiguration angelegt.
- **Ablage der Anmeldungen:** eigene Tabelle mit Zugriffsschutz, wie oben unter
  "Datenmodell" beschrieben — Feinheiten (Indizes, genaue Zugriffsregeln)
  gehören in `/backend`.
- **Offline-Caching später:** bewusst nicht in v1, keine Vorbereitung dafür
  nötig — ein Service Worker kann später erweitert werden, ohne die Push-
  Funktion neu zu bauen.

## Implementation Notes – Frontend (21.11.2026)

**Gebaut (Oberfläche und Browser-Seite, ohne Server):**
- `public/sw.js`: Service Worker nur für `push` und `notificationclick`, kein `fetch`-Handler, kein Caching. Meldung trägt ein festes `tag`, eine noch sichtbare ältere Meldung wird ersetzt. Klick fokussiert ein offenes Fenster und navigiert, sonst öffnet er `/quiz`.
- `src/app/manifest.ts`: Manifest je Adresse (Name, Symbole, `standalone`, Themefarbe `#111827`). Dazu `appleWebApp` und Apple-Touch-Icon in `layout.tsx`.
- `public/icons/*` (je `sped`, `tour`, `neutral`: 192, 512, maskable 512, Apple 180) aus `scripts/app-icons-erzeugen.mjs`. Randlos grün, weil iOS/Android die Ecken selbst runden.
- `src/proxy.ts`: `/manifest.webmanifest` und `/sw.js` ohne Anmeldung erreichbar (sonst leitet der Proxy zum Login um und die Installation scheitert stumm).
- `src/lib/push-client.ts` (+ Test): reine Regeln: Geräteprüfung (iOS-Safari → Anleitung), Opt-in-Wiedervorlage (14 Tage, höchstens einmal erneut), Symbol-Zuordnung, VAPID-Umwandlung.
- `src/hooks/use-push-reminder.ts`: Zustand und Aktionen. Browser-Erlaubnis nur im Klick-Handler (`Notification.requestPermission` vor jedem anderen `await`, wegen Safari).
- `src/components/reminder-opt-in-card.tsx` (+ Test): Karte in zwei Varianten, `result` (Ergebnis-Bildschirm, `quiz-client.tsx`) und `home` („Heute“, `page.tsx`, nicht für Lehrkräfte). Fälle: normal, iPhone-Anleitung, schon aktiv, abgelehnt, blockiert.
- `src/components/reminder-toggle.tsx`: Schalter „Tägliche Erinnerung“ in einer eigenen „Erinnerung“-Karte im Profil (gilt je Gerät).

**Abweichungen von der Spec:**
- Texte der Oberfläche auf „Erinnerung“ statt „täglich“ umgestellt (Nachtrag 10); Knopf „Ja, bitte"; `REMINDER_DAYS_LABEL` in `push-client.ts`.
- Die Karte auf dem Ergebnis-Bildschirm erscheint nicht nur nach der *ersten* Runde, sondern bei jeder Runde, bis entschieden ist (Nachtrag 6). Danach sorgen Wiedervorlage-Regel und Server-Stand für Ruhe.
- Die Erinnerungskarte auf „Heute“ steht unter der Hauptaktion, nicht darüber.

**Erwartete Schnittstellen für `/backend`** (vom Frontend schon aufgerufen, noch nicht vorhanden):
- `GET /api/push/status` → `{ enabled, declined_at, decline_count }`
- `POST /api/push/subscribe` Body `{ subscription }` (PushSubscriptionJSON)
- `POST /api/push/unsubscribe` Body `{ endpoint }` → `{ enabled }` (ob noch ein anderes Gerät aktiv ist)
- `POST /api/push/decline` (zählt `decline_count` hoch, setzt `declined_at`)
- Umgebungsvariable `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (ohne sie bleibt die Karte unsichtbar)

**Geprüft:** `tsc` und ESLint sauber, 31 neue Tests grün. Gesamtsuite 4114 von 4115: ein roter Test in `werkzeugkiste-auszug.test.ts` (Untertitel „aus dem Regal von …“), schon vorher vorhanden und unabhängig von PROJ-18. **Nicht im Browser geprüft** (kein Dev-Server, siehe Memory).

## Implementation Notes – Backend (21.11.2026)

**Datenbank** (`supabase/migrations/20261125_proj18_push_erinnerung.sql`, Rückweg `…_down.sql`, Probe `supabase/tests/proj18_push_probe.sql`):
- `push_subscriptions`: ein Gerät je Zeile (Endpunkt eindeutig, Schlüssel, `https`-Prüfung, Längenprüfung).
- `push_reminder_state`: je Konto Ablehnung der Karte (`declined_at`, `decline_count`) und Versandstand (`last_sent_date`, `last_sent_at`, `sent_count`, `ignored_in_a_row`).
- RLS an, **bewusst ohne Policy**, Rechte für `anon`/`authenticated` entzogen: Zugriff nur über die Service-Rolle (wie `rate_limits`). Kaskade auf `auth.users`, die Kontolöschung (PROJ-60) räumt mit auf.
- **Abweichung von der Tech-Design-Skizze:** Statt neuer Felder in `profiles` eine eigene Tabelle. Grund: `profiles` hat Spaltenrechte (siehe PROJ-121), und Endpunkte/Schlüssel dürfen nie über das Nutzerprofil lesbar sein. Der Zähler „ohne Reaktion“ liegt je Konto, nicht je Gerät (Spec: Tagesgrenze gilt je Nutzer).
- **Noch nicht auf Produktion angewendet.** Reihenfolge: Migration → Probe → Schlüssel bei Vercel → Deploy.

**Schnittstellen** (`src/app/api/push/*`, alle mit Anmeldeprüfung und Zod, Fehlertexte ohne Technik): `GET status`, `POST subscribe`, `POST unsubscribe`, `POST decline`.
- **SSRF-Schutz:** `subscribe` nimmt nur Adressen der Push-Dienste von Chrome/Edge (FCM), Firefox, Apple und Windows an (`isAllowedPushEndpoint`, getestet gegen Vorsilben-/Pfad-/Port-/Zugangsdaten-Tricks). Sonst könnte jemand den Versand-Job auf interne Adressen lenken.
- Derselbe Endpunkt gehört genau einem Konto (geteiltes Gerät: wer sich neu anmeldet, übernimmt). Höchstens 5 Geräte je Konto, das älteste fliegt raus. Wiedereinschalten setzt das Abklingen zurück.

**Versand** (`src/lib/push-reminder.ts` Regeln, `push-reminder-job.ts` Ablauf, `push-send.ts` web-push, Route `api/cron/push-erinnerung`):
- `vercel.json`: zwei Einträge (`30 17` und `30 18` UTC, nur Di/Do). Der Lauf prüft selbst „Di/Do, 19 Uhr Berlin“; der Eintrag zur falschen Stunde tut nichts. So stimmt es in Sommer- und Winterzeit.
- Entscheidung je Konto (`decideReminder`): nie gespielt → nichts; heute gelernt (Runde/Blitzrunde/Prüfung) → nichts; heute schon gesendet → nichts; abgeklungen (4 ignoriert) → nur alle 14 Tage; Streak-Text nur, wenn die letzte Runde gestern war.
- **Doppelversand-Schutz:** Der Tag wird vor dem Senden bedingt in `push_reminder_state` eingetragen (ein zweiter, auch gleichzeitiger Lauf findet ihn belegt). Kommt bei allen Geräten nur ein vorübergehender Fehler zurück, wird der alte Stand zurückgeschrieben, damit der nächste Termin es erneut versucht. 404/410 löscht das Gerät.
- Texte: 7 abwechselnde (reihum nach `sent_count`), Münz-/Hofname und App-Name aus dem Fachbereich, keine Namen oder Lerninhalte. Meldung verfällt nach 4 Stunden (TTL).
- `?dry=1` (mit gültigem `CRON_SECRET`): rechnet nur, zählt, sendet und speichert nichts, läuft zu jeder Zeit. Antwort enthält nur Zahlen.
- Ohne gültiges `CRON_SECRET`: 401. Ohne VAPID-Schlüssel: 500, kein Versand.

**Schlüssel:** Paar lokal in `.env.local` erzeugt (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`), in `.env.local.example` dokumentiert, optional `VAPID_SUBJECT`. **Bei Vercel noch nicht eingetragen.** Der öffentliche Schlüssel wird beim Bauen eingebettet, also vor dem Deploy setzen.

**Neue Pakete:** `web-push` (+ `@types/web-push`).

**Geprüft:** `tsc` sauber, ESLint ohne Fehler (keine Warnung aus neuen Dateien). Backend 102 neue Tests (Regeln 54, Schnittstellen 22, Versand-Job 15, Cron-Route 11), dazu 31 aus dem Frontend-Schritt. Produktions-Build läuft durch, Manifest und alle fünf neuen Routen sind enthalten. Gegenproben: SSRF-Schutz und Doppelversand-Schutz einzeln ausgeschaltet, die jeweiligen Tests schlagen an. Verschlüsselung und VAPID-Signatur offline mit einem Schein-Gerät geprüft (Inhalt nicht im Klartext, Signatur für den Push-Dienst). Gesamtsuite 4216 von 4217, der eine rote Test (`werkzeugkiste-auszug`) ist älter und unabhängig.

**Offen / nicht geprüft:**
- Tabellen existieren noch nicht auf Produktion; deshalb noch kein Trockenlauf gegen echte Daten und keine echte Meldung an ein Gerät.
- Vercel-Hobby: Dass zwei Cron-Einträge auf denselben Pfad (je 2×/Woche) erlaubt sind, ist laut Doku für mehrere Einträge belegt, die genauen Hobby-Grenzen habe ich nicht bestätigt. Beim Deploy mit `vercel crons ls` prüfen.
- Ob wirklich eine Meldung auf einem iPhone/Android-Handy ankommt, lässt sich nur mit einem echten Gerät nach dem Deploy prüfen.

## QA Test Results
_To be added by /qa_

## Deployment

**Live seit 2026-11-21** (Commit `ea1a1a5`, Vercel-Deployment `spedilern-5fm05t4t8`, Production, Ready). **Ohne `/qa` ausgeliefert** (Entscheidung des Nutzers, damit der Termin am Donnerstag erreicht wird).

**Reihenfolge, wie sie lief:** Migration `20261125_proj18_push_erinnerung` im SQL-Editor → Probe bestanden (alle 9 Werte wie erwartet) → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` (Sensitive) bei Vercel für Production gesetzt → Prüfung des committeten Stands in getrenntem Worktree (`tsc` sauber, 4216/4217 Tests, Build ok) → Push auf `main`.

**Kontrollen nach dem Deploy (ohne Login, auf der echten Adresse):**
- `/manifest.webmanifest` 200; auf spedilern.vercel.app Name „SpediLern“ mit `sped-*`-Symbolen, auf touristiklern.vercel.app „TouristikLern“ mit `tour-*`-Symbolen.
- `/sw.js` 200 ohne Login (beide Adressen), `/icons/sped-192.png` 200.
- `GET /api/push/status` sowie `POST subscribe`, `unsubscribe`, `decline` ohne Anmeldung: je 401.
- `GET /api/cron/push-erinnerung` ohne und mit falschem Geheimnis: 401.
- `vercel crons ls`: drei Einträge angenommen (`…?fenster=sommer` 30 17 * * 2,4, `…?fenster=winter` 30 18 * * 2,4 und der alte Aufräum-Job). Damit sind zwei Einträge auf denselben Pfad im Hobby-Tarif zulässig.

**Nicht geprüft / offen:**
- **Öffentlicher Schlüssel im Live-Code:** ohne Login nicht prüfbar (Karte lädt erst nach der Anmeldung). Beweis ist, dass die Karte auf „Heute“ erscheint. Erscheint sie nicht, fehlt der Schlüssel im Build; dann bei Vercel prüfen und neu deployen.
- **Echte Meldung auf einem Handy:** nicht getestet. Nächster Termin **Donnerstag, 26.11.2026, 19 Uhr Berlin**.
- **Trockenlauf gegen echte Daten:** erst sinnvoll, wenn Geräte angemeldet sind (`GET /api/cron/push-erinnerung?dry=1` mit `CRON_SECRET`).
- **`/qa` steht aus.** Besonders prüfen: iPhone-Weg (Home-Bildschirm, Anleitung), Zeitumstellung, Verhalten nach „Nein danke“ und nach blockierter Erlaubnis.
- Bekannt und nicht von PROJ-18: ein alter roter Test in `werkzeugkiste-auszug.test.ts`.

