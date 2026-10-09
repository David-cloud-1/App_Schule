# PROJ-35: „Mein Resort" – Tourismus-Hotelkomplex (isometrisch)

## Status: Planned
**Created:** 2026-10-09
**Last Updated:** 2026-10-09
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-34 (isometrische Welt, Selbst-Platzieren, Lager-Leiste,
  Land-Wachstum, Stilvorgabe) — die Technik wird hier nicht neu gebaut, sondern
  mit Tourismus-Inhalt befüllt
- **Requires:** PROJ-25/31 (Fachbereich Tourismus, Reisetaler, Katalog)
- **Ersetzt:** den Tourismus-Teil der flachen Darstellung (PROJ-31/33)

## Problem

Tourismus-Azubis haben ein Reisebüro-Thema, aber keinen Ort, den sie aufbauen
können. Die Tycoon-Grafik kennt nur Logistik (Lkw, Hallen, Container). Für
Tourismus fehlt jedes isometrische Sprite.

## Lösung

Im Tourismus-Bereich entsteht ein **Hotelkomplex („Mein Resort")** nach
demselben Prinzip wie PROJ-34: Land, Lager-Leiste, Selbst-Platzieren, Wachstum,
Aufbau-Animation. Neu sind **ca. 30 isometrische Sprites** im selben Stil und
ein **Resort-Katalog**: Gebäude (Hotelhaus, Restaurant, Rezeption), Freizeit
(Pool, Spielplatz, Minigolf, Strandbar), Natur und Deko (Palmen, Liegen,
Sonnenschirme, Brunnen) und Transfer (Shuttlebus, Kleinbus), dazu Abzeichen.

## User Stories

- Als **Tourismus-Azubi** möchte ich ein Hotel mit Pool, Spielplatz und
  Restaurant selbst aufbauen, damit sich mein Fortschritt wie ein echtes
  Tourismus-Projekt anfühlt.
- Als **Tourismus-Azubi** möchte ich meine gekauften Reise-Items selbst setzen
  und umbauen.
- Als **Tourismus-Admin** möchte ich Resort-Items anlegen und ein passendes
  Sprite mit Vorschau auswählen.
- Als **Spedition-Azubi** möchte ich, dass sich an meinem Betrieb nichts ändert.

## Acceptance Criteria

- [ ] Die Seite „Mein Resort" (Bezeichnung aus den Fachbereichsdaten) zeigt für
      Tourismus-Konten die isometrische Welt mit Resort-Motiv (Strand/Park,
      Promenade, Zaun/Hecken), Spedition-Konten weiterhin PROJ-34
- [ ] Mindestens 30 Resort-Sprites, mindestens 6 je Kategorie, im Stil der
      Stilvorgabe aus PROJ-34; Probe-Sprites werden vor der Serie freigegeben
- [ ] Die Shop-Kategorien des Fachbereichs heißen Gebäude, Freizeit,
      Natur & Deko, Transfer; die technischen Kategorienwerte in der
      Datenbank bleiben unverändert (nur Anzeigenamen), Abzeichen bleiben als
      Auswahl erreichbar
- [ ] Der Startkatalog Tourismus wird auf Resort-Items umgestellt oder
      ergänzt; bereits gekaufte Items bleiben erhalten und erhalten ein
      passendes Sprite (kein Item verliert sein Aussehen)
- [ ] Kauf, Lager-Leiste, Selbst-Platzieren, Land-Wachstum, Animationen und
      Barrierefreiheit entsprechen PROJ-34
- [ ] Der Admin-Icon-Picker zeigt ausschließlich Tourismus-Sprites für
      Tourismus-Admins, serverseitig geprüft
- [ ] Fehlendes Sprite → neutraler Platzhalter

## Edge Cases

- **Bereits gekaufte Tourismus-Items aus PROJ-31** (z. B. „Flugzeug",
  „Reisekoffer"): Sie müssen im Resort sinnvoll vorkommen oder auf passende
  Resort-Sprites abgebildet werden, damit niemand etwas „verliert".
- **Item passt zu keinem Sprite:** nächstbestes oder Platzhalter; neue Sprites
  erfordern einen Code-Deploy (wie bisher).
- **Konto in beiden Fachbereichen (PROJ-29):** getrennte Welten und Positionen.
- Alle Edge Cases aus PROJ-34 gelten sinngemäß.

## Non-Goals
- Wirtschaftsmechanik (Gäste, Auslastung) – rein kosmetisch
- Drehen/Spiegeln, Mehr-Kachel-Gebäude
- Neue Fachbereiche

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
