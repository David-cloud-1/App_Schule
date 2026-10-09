# PROJ-37: Belebte Welt – Tiere, Gäste und Arbeiter laufen herum

## Status: In Review
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

### Kurzfassung
Die Bewegung ist **reine Anzeige im Browser**. Nichts davon wird gespeichert.
Nur ein Punkt berührt die Datenhaltung: **Tiere sind Shop-Items**, die nicht
platziert werden. Alles andere (Gäste, Arbeiter, Wandern, Zeichnen) ist neuer
Browser-Code mit reiner, testbarer Rechnung.

### A) Bausteine
```
Seite "Mein Betrieb/Resort" (bestehend)
+-- Welt (bestehend)
|   +-- Figuren-Ebene (NEU): Tiere, Gäste, Personal, in die Zeichenreihenfolge einsortiert
+-- Bewegungs-Schleife (NEU): langsamer Takt, pausiert bei verstecktem Tab, aus bei "Bewegung reduzieren"
+-- Reaktion auf Antippen eines Tiers (NEU): kleines Herz, keine Auswahländerung

Reine Rechnung (NEU, ohne Browser testbar)
+-- Wandern: nächster Schritt auf freien Nachbarkacheln, Pausen, Ausweichen
+-- Figuren-Regeln: welche Gebäude welche Figuren hervorbringen, Obergrenze 12
+-- Figuren-Zeichnungen: Mensch, Hund, Katze, Huhn, Flamingo, Papagei, Krebs (2 Blickrichtungen, 2 Schritt-Posen)

Daten
+-- Tiere = normale Shop-Items (Migration), vom Server als "läuft frei" markiert
+-- Gäste/Personal: keine Daten
```

### B) Daten
- **Keine neue Tabelle.** Die vorhandene Platzierungs-Tabelle bleibt unberührt.
- **Tiere** sind Einträge im Katalog (Preis, Seltenheit, Aktiv wie bei allen Items).
  Welche Schlüssel „Lebewesen“ sind, steht im Code (eine Liste je Fachbereich). Der
  Bestand-Abruf markiert sie; sie erscheinen nie im Lager. Die Schnittstelle
  „Item setzen“ lehnt sie ab.
- **Land:** Tiere zählen wie jeder Kauf.

### C) Entscheidungen
1. **Bewegung nur im Browser:** keine Kosten, keine Synchronisation, kein Datenschutzthema.
2. **Wandern auf dem Kachelgitter:** Figuren gehen von Kachel zu Kachel (4 Richtungen)
   über freie Felder. Das passt zur Platzier-Logik und braucht keine Kollisionsphysik.
3. **Deterministisch:** ein Startwert pro Figur liefert immer denselben Ablauf. Das
   macht die Rechnung testbar (kein Zufall im Test).
4. **Langsamer Takt (ca. 8 Aktualisierungen pro Sekunde) mit weicher Überblendung**
   statt 60 Bilder pro Sekunde: schont Akku und ältere Handys.
5. **Obergrenze 12 Figuren**, Reihenfolge: Tiere zuerst, dann Gäste/Personal.
6. **Hohe Gebäude verdecken Figuren dahinter** (Zeichenreihenfolge nach Tiefe wie bei Items).
7. **Antippen:** Treffer auf ein Tier hat Vorrang und löst nur eine Reaktion aus; für
   Gäste/Personal gilt das normale Verhalten (Kachel/Item).
8. **„Bewegung reduzieren“:** Figuren stehen still an ihrem Startplatz.
9. **Profil-Vorschau:** Figuren stehen still (keine Schleife).
10. **Kein Eingriff in Münzen, Rechte, Login.**

### D) Was sich an Bestehendem ändert
| Bereich | Änderung |
|---------|----------|
| Bestand-Berechnung | Tiere als „läuft frei“ markiert, nicht im Lager |
| Schnittstelle „Item setzen“ | lehnt Tiere ab (neuer Fehlercode) |
| Lager-Leiste, Textliste | Tiere ausgeblendet bzw. „läuft frei herum“ |
| Welt-Komponente | optionale Figuren-Ebene |
| Seite | Schleife, Antippen-Reaktion |
| Katalog/Flache Sets | Tier-Schlüssel mit Standbild |
| Daten | Tier-Items als Migration |

### E) Reihenfolge
1. Wander-Rechnung + Tests · 2. Figuren-Regeln + Tests · 3. Figuren-Zeichnungen +
Übersichtsbild · 4. Tier-Items (Katalog, Server, Bestand, Migration) · 5. Welt +
Seite (Schleife, Reaktion, Reduced-Motion) · 6. Tests, Sichtprüfung

### F) Risiken
- Gefühl der Bewegung ist ohne Browser nicht prüfbar (Handy-Abnahme).
- Performance mit 12 Figuren: Takt und Obergrenze sind die Gegenmaßnahmen.
- Zeichenreihenfolge bei Figuren zwischen zwei Kacheln (Tiefe wird beim Überschreiten der Kachelgrenze umgesetzt).

## Implementation Notes (2026-10-09)
- **Wandern** (`betrieb-wandern.ts`): deterministische Rechnung (mulberry32), Schritte auf freien Nachbarkacheln, Pausen 0,7–3,2 s, ca. 0,42 Kacheln/s, Ausweichen bei plötzlich belegter Kachel (Breitensuche), Heimat-Radius für Gäste/Personal, Zeitsprünge auf 250 ms begrenzt.
- **Figuren-Regeln** (`betrieb-figuren.ts`): Tiere (Spedition: Hofhund, Hofkatze, Hühner; Tourismus: Strandhund, Flamingo, Papagei, Krebs), automatische Gäste/Personal je Gebäude (Hotel→2 Gäste, Pool, Strandbar, Restaurant, Spielplatz→2 Kinder, Eisdiele … / Lagerhalle, Tankstelle, Gabelstapler, Lkw → Arbeiter/Fahrer), Obergrenze 12, Tiere zuerst, stabile IDs und Startwerte.
- **Zeichnungen** (`hof-welt/figuren.ts`): 13 Figuren, je 2 Schritt-Posen, gespiegelt für die andere Blickrichtung; Standbilder der Tiere für Shop/Katalog.
- **Tiere im System:** `BetriebItem.lebewesen`; nie im Lager, nie gesetzt; `PUT /api/betrieb/platzierung` lehnt sie mit `not_placeable` ab; zählen für das Land. Migration `20261009_proj37_tiere` (3 + 4 Items, 40–90 Münzen). **Noch nicht auf Produktion angewendet.**
- **Welt/Seite:** Figuren-Ebene in `BetriebWelt` (Zeichenreihenfolge nach Tiefe, weiche Überblendung nur beim Gehen, 30 % größer), Schleife in `betrieb-client.tsx` (Takt 125 ms, Pause bei verstecktem Tab ohne Aufholen, Stopp beim Verlassen, **aus bei „Bewegung reduzieren“**), Tier antippen → Herz (Auswahl bleibt unberührt). Profil-Vorschau zeigt keine Figuren (bleibt still).

## QA Test Results
**Stand 2026-10-09 – automatisiert + Sichtprüfung; Gefühl der Bewegung steht aus**
- 951 Tests grün (mehrere Durchläufe), `tsc` ohne Fehler, Lint 0 Fehler. Neu u. a.: Wandern (15 Tests: deterministisch, bleibt im Land, nie auf belegten Kacheln, Ausweichen, Heimat, kein Sprung nach Tab-Wechsel), Figuren-Regeln (12), Tier-Items inkl. Abgleich Migration ⇄ Sprites (5), Treffer (4), Welt-Ebene (7), Seite (9: Figuren erscheinen/verschwinden mit Gebäuden, laufen, bleiben von belegten Kacheln weg, pausieren im Hintergrund, still bei „Bewegung reduzieren“, deterministischer Start, **eine** Schleife statt Neustart je Takt, Aufräumen beim Verlassen), Server lehnt Tiere ab.
- Migration gegen die echte Datenbank in zurückgerollter Transaktion geprüft.
- Sichtprüfung: `docs/vorschau/figuren.png`, `resort-figuren.png`.
- **Nicht geprüft:** Flüssigkeit der Bewegung am echten Handy, Akku-/Leistung bei 12 Figuren, Tippgenauigkeit auf Tiere.

## Deployment
_To be added by /deploy_
