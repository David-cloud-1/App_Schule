# PROJ-37: Belebte Welt – Tiere, Gäste und Arbeiter laufen herum

## Status: Planned
**Created:** 2026-10-09
**Last Updated:** 2026-10-09
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-34/35 (Welt, Katalog, Platzieren), PROJ-32 (Seltenheit)
- **Berührt:** PROJ-34-Schnittstellen (Tiere sind Items, werden aber nicht
  platziert)

## Problem
Die Welt aus PROJ-34/35 steht still: Gebäude, Fahrzeuge, Bäume. Ein Ort, an dem
„etwas los“ ist, motiviert zum Weiterspielen (Hay Day: Tiere, Figuren). Der
Wunsch: ein Hund, der herumläuft, Gäste im Hotel, Arbeiter im Betrieb.

## Lösung
Zwei Arten von Figuren, die auf den freien Kacheln **spazieren gehen**:

1. **Tiere (kaufbar):** eigene Shop-Items. Nach dem Kauf erscheinen sie von selbst
   im Gelände und laufen herum; sie werden **nicht** auf eine Kachel gesetzt und
   liegen nie im Lager. Spedition: Hofhund, Hofkatze, Hühner. Resort:
   Strandhund, Flamingo, Papagei, Krebs.
2. **Gäste und Personal (automatisch):** Sie erscheinen von selbst passend zu den
   gesetzten Gebäuden und Anlagen – Resort: Gäste an Hotel, Pool, Strandbar,
   Restaurant; Kinder am Spielplatz. Spedition: Arbeiter an Lagerhalle,
   Tankstelle und Gabelstapler, Fahrer am Lkw. Nicht kaufbar, kein Eintrag in der
   Datenbank.

Sie laufen langsam von Kachel zu Kachel über freie Felder, weichen Gebäuden aus,
bleiben stehen, winken oder wedeln. Alles läuft nur im Browser (reine Anzeige).

## User Stories
- Als **Azubi** möchte ich einen Hund kaufen, der in meinem Betrieb herumläuft,
  damit es lebendig wirkt.
- Als **Azubi** möchte ich Gäste im Resort sehen, wenn ich Hotel und Pool
  gebaut habe, damit sich mein Aufbau belebt anfühlt.
- Als **Azubi** möchte ich Arbeiter im Betrieb sehen, wenn ich Hallen und
  Fahrzeuge habe.
- Als **Azubi mit Bewegungsempfindlichkeit** möchte ich, dass sich nichts bewegt,
  wenn mein Gerät „Bewegung reduzieren“ meldet.
- Als **Azubi** möchte ich, dass die Figuren meine Bedienung nicht stören (Tippen
  auf Items, Verschieben).
- Als **Admin** möchte ich Tiere wie andere Items im Katalog pflegen (Preis,
  Seltenheit, Aktiv).

## Acceptance Criteria
### Tiere (kaufbar)
- [ ] Spedition mindestens 3, Tourismus mindestens 4 Tier-Items mit eigenem
      Sprite (mindestens zwei Blickrichtungen) und Shop-Eintrag
- [ ] Ein gekauftes Tier erscheint ohne Platzieren in der Welt, taucht nie in der
      Lager-Leiste auf und lässt sich nicht setzen (Server lehnt Platzierung
      eines Tiers ab)
- [ ] Tiere zählen für das Land wie andere Käufe
- [ ] Ein deaktiviertes, bereits gekauftes Tier läuft weiter
### Gäste und Personal (automatisch)
- [ ] Gäste/Personal erscheinen nur, wenn ein passendes Gebäude gesetzt ist; sie
      verschwinden wieder, wenn es ins Lager zurückgelegt wird
- [ ] Anzahl wächst mit der Zahl passender Gebäude, höchstens 12 Figuren
      gleichzeitig (Gäste + Personal + Tiere)
- [ ] Gäste/Personal erzeugen keine Datenbankzeilen und keine Kosten
### Bewegung
- [ ] Figuren laufen nur über freie Kacheln innerhalb des Landes, nie durch
      Gebäude oder gesetzte Items; sie bleiben im Land und weichen aus
- [ ] Sie laufen langsam (ca. eine Kachel pro 2–3 Sekunden), halten zwischendurch
      an und zeigen eine kleine Leerlauf-Bewegung
- [ ] Sie liegen in der Zeichenreihenfolge korrekt vor/hinter Gebäuden
- [ ] Sie fangen kein Tippen ab: Tippen auf Kachel/Item verhält sich wie in
      PROJ-34; ein Tipp auf ein Tier zeigt eine kurze Reaktion (Herz/Bellen),
      ändert aber keine Auswahl
- [ ] Bei „Bewegung reduzieren“ stehen Figuren still (an festen Plätzen)
- [ ] Die Bewegung pausiert bei verstecktem Tab und stoppt beim Verlassen der Seite
- [ ] In der Profil-Vorschau stehen Figuren still
### Technik
- [ ] 12 Figuren auf einem Mittelklasse-Smartphone ohne spürbares Ruckeln beim
      Verschieben/Zoomen
- [ ] Kein neuer Datenbank-Zustand für Bewegung; Wegfindung ist rein testbar
      (deterministisch bei gleichem Startwert)
- [ ] Beim Setzen/Entfernen von Items blockierte Kacheln werden sofort
      berücksichtigt (Figur auf neu belegter Kachel weicht aus)

## Edge Cases
- **Alle Kacheln belegt:** Figuren bleiben stehen.
- **Figur steht auf einer Kachel, die gerade belegt wird:** geht zur nächsten freien.
- **Land wächst:** neue Kacheln werden begehbar.
- **Sehr viele Tiere gekauft:** Darstellung auf 12 begrenzt; Rest ruht „unsichtbar“.
- **Tab im Hintergrund:** keine Aufholbewegung beim Zurückkehren (kein Sprung).
- **Langsames Gerät:** Bewegung darf ruckeln, aber nicht Bedienung blockieren.

## Non-Goals
- Speichern von Figurpositionen; Interaktion wie Füttern; Tag/Nacht
- Eigene Gäste-Items zum Kaufen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
