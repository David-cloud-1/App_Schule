# PROJ-33: Echte Hof-Illustration (Spedition & Tourismus)

## Status: In Review
**Created:** 2026-10-09
**Last Updated:** 2026-10-09
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-26 (Kategorien, Icon-Sets, Hof-Galerie im Profil)
- **Requires:** PROJ-31 (Tourismus-Set und -Kategorienamen), PROJ-32 (Seltenheit)
- **Korrigiert:** PROJ-26/PROJ-31. Beide Specs verlangen eine
  „zusammenhängende, illustrierte Szene". Ausgeliefert wurden nur Karten je
  Kategorie mit kleinen Icons (Spedition) bzw. Karten auf einem Verlauf
  (Tourismus). Dieses Feature löst die ursprüngliche Zusage ein.

## Problem

„Mein Hof" (Profil) sieht aus wie eine Liste: pro Kategorie eine Karte mit
kleinen Kacheln. Es fehlt der Eindruck eines Ortes, an dem die gekauften
Dinge stehen. Damit fehlt der Anreiz, den Hof wachsen zu sehen
(siehe [engagement-retention-problem]).

## Lösung

Der Hof (Spedition) bzw. das Büro (Tourismus) ist **ein durchgehendes Bild**:
Himmel, Hintergrundgebäude, Boden, Regal. Gekaufte Items stehen **groß** auf
festen Plätzen darin, automatisch nach Kategorie (keine freie
Positionierung, keine Speicherung von Positionen):

- **Gebäude & Deko:** hinten, vor der Kulisse (Spedition: Lagerhalle/Zaun;
  Tourismus: Skyline/Hotels)
- **Fahrzeuge:** vorne auf dem Hof (Spedition: Asphalt mit Fahrspur;
  Tourismus: Vorfeld/Landebahn)
- **Ladung & Ausstattung:** seitlich/davor (Spedition: Rampe/Lagerfläche;
  Tourismus: Terminal-Boden)
- **Abzeichen & Trophäen:** im Regal (je Reihe ein Brett)

Noch freie Plätze bleiben als dezente gestrichelte Schatten sichtbar
(„da ist noch Platz"). Beide Fachbereiche nutzen dieselbe Logik, nur mit
eigenem Motiv.

## User Stories

- Als **Azubi** möchte ich meinen Hof als zusammenhängendes Bild sehen, in
  dem meine Items stehen, damit sich das Sammeln wie der Aufbau eines Ortes
  anfühlt und nicht wie eine Liste.
- Als **Azubi** möchte ich meine Items groß genug sehen, um sie zu erkennen
  (nicht nur Mini-Icons).
- Als **Azubi** möchte ich freie Plätze sehen, damit ich weiß, dass ich den
  Hof noch ausbauen kann.
- Als **Azubi** mit seltenen Items möchte ich deren Glanz (PROJ-32) auch im
  Bild sehen.
- Als **Tourismus-Azubi** möchte ich ein Reisebüro-Umfeld statt eines
  Speditionshofs sehen.
- Als **Azubi mit Screenreader** möchte ich weiterhin eine Textliste meiner
  Items bekommen.

## Acceptance Criteria

### Szene
- [ ] „Mein Hof/Büro" zeigt eine durchgehende Illustration mit Himmel,
      Hintergrund, Boden und Regal, kein Kartenraster mehr
- [ ] Items erscheinen mit mindestens 56 px Kantenlänge (bei 320 px
      Bildschirmbreite), in der Zone ihrer Kategorie
- [ ] Jede Zone zeigt mindestens eine Reihe mit Plätzen; freie Plätze sind als
      dezente gestrichelte Platzhalter dargestellt und eindeutig nicht
      anklickbar/kaufbar
- [ ] Mehr Items als Plätze in einer Reihe: Die Zone wächst um weitere Reihen
      (Szene wird höher), nichts wird abgeschnitten, kein horizontaler
      Überlauf (geprüft mit 20 Items in einer Zone bei 320 px)
- [ ] Spedition und Tourismus zeigen jeweils ihr eigenes Motiv; Spedition ohne
      Tourismus-Elemente und umgekehrt
- [ ] Kategorienamen im Wortlaut des Fachbereichs (PROJ-31) als Beschriftung
      der Zonen
- [ ] Ein Konto ganz ohne Käufe zeigt weiterhin den einladenden Leerzustand
      mit Link zum Shop (nicht eine leere Szene)
- [ ] Gekaufte, später deaktivierte Items bleiben sichtbar
- [ ] Ein Item verschoben in eine andere Kategorie steht in der Zone der
      *aktuellen* Kategorie

### Items & Seltenheit
- [ ] Rare und epische Items zeigen Ring/Glanz wie in Shop-Kachel (PROJ-32),
      zusätzlich Text „Selten"/„Episch" (nie nur Farbe)
- [ ] Epischer Schimmer läuft einmal und entfällt bei „Bewegung reduzieren"
- [ ] Fehlt die Illustration eines Items (Schlüssel nicht auflösbar), wird
      das Emoji bzw. ein Platzhalter gezeigt, nie eine Lücke
- [ ] Der Name eines Items ist per Tooltip/Langdruck erreichbar

### Barrierefreiheit & Technik
- [ ] Die Szene ist für Screenreader ausgeblendet; die Textliste mit Name,
      Kategorie und Seltenheit bleibt vorhanden
- [ ] Die Szene skaliert flüssig mit der Breite (kein fester Pixelwert), ist
      reines Inline-SVG ohne zusätzliche Requests
- [ ] Kein Bild-Upload, keine neuen laufenden Kosten
- [ ] Kontrast: Zonenbeschriftungen und Seltenheits-Texte auf der Illustration
      sind lesbar
- [ ] Kein Eingriff in Datenbank, Rechte, Münzen, XP oder Kauf-Ablauf

## Edge Cases

- **Sehr viele Items (z. B. 40):** Szene wird lang; Seite bleibt scrollbar,
  Performance bleibt flüssig (statische Grafik, Schimmer nur einmal).
- **Sehr kurzer Name / sehr langer Name:** Namen stehen nicht in der Szene,
  nur im Tooltip; nichts kann überlaufen.
- **Gerät mit „Bewegung reduzieren":** keine Animation, Ringe bleiben.
- **Fachbereich ohne Szenen-Motiv (neuer, dritter Fachbereich):** neutrales
  Standardmotiv statt Fehler.
- **Emoji-Altitem ohne SVG-Schlüssel:** wird als Emoji in den Platz gesetzt.
- **Nutzer mit verknüpften Konten in zwei Fachbereichen (PROJ-29):** jedes
  Konto zeigt sein eigenes Motiv und seine eigenen Items.
- **Kategorie ohne Items, aber andere Zonen voll:** Zone zeigt nur freie
  Plätze, Szene wirkt trotzdem vollständig.

## Technical Requirements (optional)
- Kosten: keine; Performance: statisches Inline-SVG
- Barrierefreiheit: Textliste + Reduced-Motion

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Kurzfassung
Die Szene wird **ein einziges Inline-SVG** mit fester Zeichenfläche (360 Einheiten
breit) und skaliert per CSS mit der Bildschirmbreite. Positionen werden nie
gespeichert, sondern bei jedem Anzeigen aus Kategorie und Reihenfolge der
gekauften Items berechnet. Keine Datenbank-, Rechte- oder Schnittstellen-
Änderung (die Seltenheit liefert die Schnittstelle schon seit PROJ-32).

### A) Bausteine
```
Hof-Galerie (Profil)                      (bestehend)
+-- Leerzustand "noch nichts gekauft"     (bestehend, unverändert)
+-- Textliste für Screenreader            (bestehend, mit Seltenheit)
+-- Hof-Illustration                      (NEU, ersetzt die Karten)
    +-- Layout-Berechnung                 (NEU, reine Rechnung, testbar)
    +-- Motiv des Fachbereichs            (NEU: Spedition-Hof / Tourismus-Strand+Vorfeld)
    |   +-- Zone Gebäude/Deko   Himmel, Kulisse, Boden/Strand
    |   +-- Zone Fahrzeuge      Asphalt/Landebahn mit Spur
    |   +-- Zone Ladung         Rampe (Warnstreifen) / Terminal-Boden
    |   +-- Zone Trophäen       Regalwand mit Brettern
    +-- Item auf Platz                    (Grafik, Schatten, Seltenheits-Rahmen, Label)
    +-- Freier Platz                      (gestrichelter Schatten)
```

### B) Daten
Keine neuen Daten. Die Szene liest dieselben Felder wie bisher (Name, Kategorie,
Grafik-Schlüssel, Seltenheit).

### C) Entscheidungen (Begründung)
1. **Ein SVG statt vieler Karten:** erst dadurch wirkt es als zusammenhängender
   Ort; Boden, Kulisse und Items teilen sich ein Koordinatensystem.
2. **Berechnet statt gespeichert:** Käufe, Kategorie-Wechsel und
   Deaktivierung wirken sofort; keine Datenhaltung für Positionen.
3. **4 Plätze pro Reihe, 72 Einheiten große Items:** bei 320 px Breite ergibt das
   rund 64 px (Vorgabe: mind. 56 px). Mehr Items = weitere Reihen; die Szene
   wird höher, nichts wird abgeschnitten.
4. **Motiv je Fachbereich in einer eigenen Datei,** unbekannter Fachbereich fällt
   auf das Spedition-Motiv zurück.
5. **Freie Plätze als Schatten:** zeigt Raum zum Wachsen, sind eindeutig nicht
   klickbar.
6. **Namen nur als Tooltip + Textliste:** Namen in der Grafik würden bei langen
   Namen überlaufen.
7. **Seltenheit wie in PROJ-32,** aber SVG-eigen (Ring, Label-Plättchen, einmaliger
   Schimmer, entfällt bei „Bewegung reduzieren").

### D) Änderungen am Bestehenden
Die Karten-Szenen aus PROJ-26/PROJ-31 und die Kachel-Komponente entfallen. Die
Shop-Kachel (PROJ-32) bleibt unverändert.

### E) Abhängigkeiten
Keine neuen Pakete.

## Implementation Notes (2026-10-09)
- `src/lib/hof-scene-layout.ts` – reine Layout-Berechnung (4 Plätze/Reihe, Item 72, Reihe 98 Einheiten, feste Zonenreihenfolge, `OwnedHofItem`-Typ).
- `src/components/hof-scene-themes.tsx` – Motive: Spedition (Nachthimmel, Lagerhalle mit Rolltoren, Zaun, Asphalt mit Fahrspur, Rampe mit Warnstreifen, Holzregal) und Tourismus (Himmel mit Sonne, Skyline mit Hotels, Strand mit Wellen, Vorfeld mit Randlichtern, Terminal-Boden, Regal im Reisebüro).
- `src/components/hof-scene.tsx` – die Illustration; `hof-gallery.tsx` nutzt sie für beide Fachbereiche.
- `globals.css` – SVG-Schimmer (einmalig, entfällt bei „Bewegung reduzieren").
- Entfernt: `hof-scene-default.tsx`, `hof-scene-tourismus.tsx`, `hof-item-tile.tsx` (und deren Tests).
- Während der Umsetzung gefundene und behobene Probleme (Sichtprüfung am gerenderten Bild): Items waren mit 5 pro Reihe zu klein (jetzt 4, größer), standen über dem Boden statt darauf, Rarity-Label auf hellem Strand schlecht lesbar (jetzt dunkles Plättchen), Zonen-Plättchen zu schmal, Trophäen klebten am Label.
- **Abweichung von PROJ-26-AC:** Leere Zonen werden nicht mehr ausgeblendet, sondern zeigen freie Plätze (ausdrückliche Entscheidung 2026-10-09).

## QA Test Results
**Stand 2026-10-09**

- 765 Tests grün (neu: Layout – 8 Tests inkl. 20 Items/Wachstum um Reihen/kein seitlicher Überlauf/Determinismus/unbekannte Kategorie; Szene – 13 Tests inkl. Fachbereichs-Wortlaut, Fallback Emoji/Box, Seltenheit, Schimmer nur bei Episch, eindeutige Clip-IDs, Motiv-Fallback). `tsc` und Lint ohne Fehler.
- **Sichtprüfung:** Die Szene wurde statisch zu PNG gerendert (kein Dev-Server nötig) und für Spedition, Tourismus, Tourismus mit 21 Items und die leere Szene angesehen; Befunde siehe oben, alle behoben.
- **Nicht geprüft:** echter Browser (Schriftart Inter statt Ersatzschrift, Tooltip per Langdruck, tatsächlicher Schimmerablauf, 320-px-Gerät). Rechnerisch: Item 72 Einheiten x 320/360 = 64 px (≥ 56 px laut AC).
- Schimmer: einmalig, `prefers-reduced-motion` blendet ihn aus (CSS, nicht automatisiert testbar).

## Deployment
_To be added by /deploy_
