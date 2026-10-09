# PROJ-36: Mehr Deko für „Mein Betrieb“ und „Mein Resort“

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
