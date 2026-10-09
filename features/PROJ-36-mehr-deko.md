# PROJ-36: Mehr Deko für „Mein Betrieb“ und „Mein Resort“

## Status: Deployed
**Created:** 2026-10-09
**Last Updated:** 2026-10-09
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-34 (Betrieb, Sprite-Katalog, Platzieren), PROJ-35 (Resort)
- **Verwandt:** PROJ-37 (belebte Welt) – unabhängig deploybar; PROJ-37 baut auf
  den hier entstehenden Deko-Sprites nur indirekt auf

## Problem
Nach PROJ-34/35 gibt es je Fachbereich nur 31 bzw. 41 Items; viele davon sind
Fahrzeuge, Gebäude und Abzeichen. Zum **Gestalten** fehlt Kleinkram, der einen
Ort lebendig macht: Hecken, Bänke, Blumenkübel, Schilder, Zierrat. Die Welt wirkt
dadurch aufgeräumter und leerer als ein Hay-Day-Hof.

## Lösung
Je Fachbereich kommen **ca. 20 neue kaufbare Deko-Items** mit weichem Sprite und
günstigen Preisen dazu (15–200 Münzen). Sie nutzen die vorhandene Technik
(Katalog, Platzieren, Seltenheit, Land-Regel) unverändert.

**Spedition (20):** Fahrzeuge: Tankwagen, Kipper, Abschleppwagen · Gebäude & Deko:
Hecke, Blumenkübel, Parkbank, Werbeschild, Verkehrsschild, Schranke, Schuppen,
Wasserturm, Imbisswagen, Brückenwaage, Wetterfahne · Ausstattung: Reifenstapel,
Ölfässer, Hubwagen, Containerturm, Mülleimer, Rasttisch.

**Resort (20):** Transfer: Golfcart, Tuk-Tuk, Fahrradständer · Gebäude & Freizeit:
Tennisplatz, Hochzeitsbogen, Pavillon, Saunahaus, Eisdiele, Volleyballfeld,
Bungalow, Lotusteich · Ausstattung & Deko: Strandkorb, Lebhecke, Hängematte,
Tiki-Fackeln, Surfbretter, Gartenlaterne, Blumenkübel, Rettungsring-Ständer,
Sandburg.

## User Stories
- Als **Azubi** möchte ich viele kleine Deko-Items kaufen, damit ich meinen
  Betrieb bzw. mein Resort persönlich gestalten kann.
- Als **Azubi** möchte ich günstige Items zum frühen Sammeln haben, damit sich
  auch kleine Münzbeträge lohnen.
- Als **Admin** möchte ich die neuen Items im Katalog sehen und Preis/Seltenheit
  anpassen können.
- Als **Azubi** möchte ich, dass bereits Gekauftes unverändert bleibt.

## Acceptance Criteria
- [ ] Spedition: mindestens 20, Tourismus: mindestens 20 neue aktive Items, je mit
      Name, Beschreibung, Kategorie, Preis und isometrischem Sprite
- [ ] Jeder neue Icon-Schlüssel steht im flachen Set des Fachbereichs und im
      Sprite-Katalog (Tests erzwingen die Übereinstimmung); keine
      Schlüssel-Überschneidung zwischen den Fachbereichen
- [ ] Preise liegen zwischen 15 und 200; mindestens 8 Items je Fachbereich
      kosten höchstens 60 (Einstiegs-Deko)
- [ ] Die Sprites folgen dem weichen Stil aus PROJ-34 (Verläufe, dünne
      Konturen, weiche Schatten) und sind bei Standard-Zoom erkennbar
- [ ] Kategorien bleiben die vier technischen Werte; Anzeigenamen unverändert
- [ ] Die Migration ist idempotent, hat eine Rollback-Datei und ändert keine
      bestehenden Items oder Käufe
- [ ] Land-Regel und Item-Limit: alle Items passen weiterhin ins größte Land
      (Gesamtzahl je Fachbereich höchstens 100)
- [ ] Shop-Kachel, Lager und Admin zeigen die neuen Sprites ohne Platzhalter

## Edge Cases
- **Item ohne passendes Sprite (Tippfehler im Schlüssel):** Test schlägt fehl,
  bevor es live geht; im Notfall Platzhalter-Kiste.
- **Azubi besitzt mehr Items als Kacheln (über 100):** Rest bleibt im Lager.
- **Gleicher Name wie ein bestehendes Item:** Migration überspringt es.
- **Zu viele Items im Shop auf kleinem Bildschirm:** Liste bleibt scrollbar.

## Non-Goals
- Bewegung/Figuren (siehe PROJ-37)
- Neue Fachbereiche, neue Kategorien

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Kurzfassung
Reiner Inhalts-Ausbau, **keine neue Technik, keine Schema-Änderung.** Je Fachbereich
kommen 20 Einträge in zwei Katalogen dazu: Sprites (Code) und Shop-Items (Daten).

### A) Bausteine
```
Bestehend (unverändert)
+-- Sprite-Katalog "Schlüssel -> Sprite", Platzieren, Lager, Seltenheit, Land-Regel
+-- Flaches Icon-Set je Fachbereich (für Admin-Picker und Server-Prüfung)

Neu
+-- Spedition-Deko-Sprites (20)  Datei neben spedition-weich
+-- Resort-Deko-Sprites (20)     Datei neben resort-weich
+-- Einträge im flachen Set (Bild aus dem Sprite, wie bei den Resort-Bauten)
+-- Daten-Migration: 20 + 20 Shop-Items mit Preisen
```

### B) Daten
Keine neue Tabelle. Je Item: Name, Beschreibung, Kategorie (eine der vier), Preis,
Icon-Schlüssel, Fachbereich. Die Wirkungen (Platzieren, Seltenheit, Land) folgen
aus den bestehenden Regeln. Seltenheit leitet sich aus dem Preis ab: Deko bis 99
ist „Standard“, teure Bauten (Wasserturm, Tennisplatz, Saunahaus) sind „Selten“
oder „Episch“.

### C) Entscheidungen
1. **Gleiche Zeichenbausteine und Palette** wie PROJ-34/35: einheitlicher Look.
2. **Pro Fachbereich eigene Schlüssel** (z. B. „hecke“ vs. „lebhecke“): keine
   Doppelbelegung, damit die Fachbereichs-Trennung (Server-Prüfung, Picker) eindeutig bleibt.
3. **Flaches Icon aus dem Sprite** statt zweiter Zeichnung: ein Bild pro Item.
4. **Preis-Staffelung:** mindestens 8–10 Einstiegs-Items bis 60 Münzen, damit sich
   früher Spielstand lohnt; Prestige-Bauten bis 200.
5. **Migration idempotent** (kein Duplikat bei zweitem Lauf).

### D) Änderungen am Bestehenden
Nur Erweiterungen: Katalog-Karten, flaches Set, Daten. Keine Änderung an Seite,
Schnittstellen oder Rechten.

### E) Reihenfolge
1. Spedition-Sprites + Übersichtsbild · 2. Resort-Sprites + Übersichtsbild ·
3. Katalog und flache Sets · 4. Migration · 5. Tests, Sichtprüfung

### F) Risiken
Grafikaufwand (40 Sprites); Preis-/Balance-Gefühl muss der Nutzer prüfen.

## Implementation Notes (2026-10-09)
- **Sprites:** `src/lib/hof-welt/spedition-deko.ts` (20: Tankwagen, Kipper, Abschleppwagen, Hecke, Blumenkübel, Parkbank, Werbeschild, Verkehrsschild, Schranke, Schuppen, Wasserturm, Imbisswagen, Brückenwaage, Wetterfahne, Reifenstapel, Ölfässer, Hubwagen, Containerturm, Mülleimer, Rasttisch) und `resort-deko.ts` (20: Golfcart, Tuk-Tuk, Fahrradständer, Tennisplatz, Hochzeitsbogen, Pavillon, Saunahaus, Eisdiele, Volleyballfeld, Bungalow, Lotusteich, Strandkorb, Blütenhecke, Hängematte, Tiki-Fackeln, Surfbretter, Gartenlaterne, Blumenkübel, Rettungsring, Sandburg). Teils mit Bewegung (Rauch, Fahne, flackerndes Licht).
- **Einbindung:** Sprite-Katalog (`betrieb-sprites.ts`) und flache Sets (`hof-icons.tsx`, `hof-icons-tour.tsx`) über die gemeinsame Hilfsfunktion `iconsAusSprites` (`hof-icons-sprite.tsx`) – ein Bild pro Item.
- **Daten:** Migration `20261009_proj36_mehr_deko` (+ Rollback): 20 + 20 Items, Preise Spedition 15–190, Tourismus 20–200; je Fachbereich mind. 10 Items bis 60. Idempotent, nur INSERT. **Noch nicht auf Produktion angewendet.**

## QA Test Results
**Stand 2026-10-09 – automatisiert + Sichtprüfung; Abnahme der Preise/Optik durch den Nutzer steht aus**
- Tests grün (Gesamtsuite zweimal). Neu (`betrieb-deko.test.ts`, 13 Tests): je Fachbereich mind. 20 neue Items mit Sprite und flachem Icon, Server-Prüfung „Icon gehört zur Kategorie“, **Abgleich Sprite ⇄ Migration** (gleiche Schlüssel und Kategorien, keine Extras), Preisgrenzen 15–200, mind. 8 Einstiegs-Items ≤ 60, eindeutige Namen, keine Schlüssel-Überschneidung zwischen den Fachbereichen, Migration nur INSERT mit Namensprüfung.
- Migration gegen die echte Datenbank in zurückgerollter Transaktion geprüft: Spedition 9 → 29, Tourismus 19 → 39 Items.
- Sichtprüfung: `docs/vorschau/sprites-spedition-deko.png`, `sprites-resort-deko.png`.
- **Nicht geprüft:** Preis-/Balance-Gefühl, Optik am Handy.

## Deployment
- **Production URL:** https://spedilern.vercel.app, https://touristiklern.vercel.app (Seite `/betrieb`)
- **Deployed:** 2026-10-09 (Commit 0a8ba28, Vercel-Deployment spedilern-49eirmley, Status Ready, keine Fehler-Logs)
- **Reihenfolge eingehalten:** zuerst die Migrationen auf Produktion (`proj36_mehr_deko`, `proj37_tiere`), danach Push. Verifiziert: Spedition 9 → 32 Items, Tourismus 19 → 43 Items (inkl. 3 bzw. 4 Tiere). 
- Build und 951 Tests auf dem sauberen Commit grün; Login-Seiten 200; `/betrieb` ohne Anmeldung → 307, `/api/betrieb` und `PUT /api/betrieb/platzierung` ohne Anmeldung → 401.
- **Offen – Abnahme am Handy:** Gefühl der Bewegung, Akku/Leistung bei bis zu 12 Figuren, Tippen auf Tiere, Preise und Optik der neuen Items.
