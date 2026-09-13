# PROJ-18: Rückkehr-Erinnerung per Web-Push

## Status: Architected
**Created:** 2026-09-05
**Last Updated:** 2026-09-13

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
      Ergebnis-Bildschirm eine Karte „Täglich erinnert werden?" mit den Optionen
      „Ja, um 17 Uhr" und „Nein danke".
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
- [ ] Ein täglicher Cron-Lauf um 17:00 Uhr Europe/Berlin verschickt die
      Erinnerungen (Sommer-/Winterzeit korrekt, d. h. Cron in UTC entsprechend).
- [ ] Es geht **höchstens eine** Benachrichtigung pro Nutzer und Tag raus.
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
- [ ] Reagiert ein Nutzer 5 Erinnerungen in Folge nicht (kein Öffnen der App am
      selben oder Folgetag), pausiert der Versand auf höchstens eine pro Woche.
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
