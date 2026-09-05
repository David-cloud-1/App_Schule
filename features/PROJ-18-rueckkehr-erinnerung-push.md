# PROJ-18: Rückkehr-Erinnerung per Web-Push

## Status: Planned
**Created:** 2026-09-05
**Last Updated:** 2026-09-05

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
