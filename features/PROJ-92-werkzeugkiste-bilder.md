# PROJ-92: Werkzeugkiste – Baukasten: Bilder hochladen und aus dem Skript übernehmen

## Status: Planned (Rahmen – Details werden vor dem Bau mit /requirements festgelegt)
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Im Baukasten-Editor kann die Lehrkraft Bild-Blöcke einfügen oder austauschen, entweder mit einem eigenen hochgeladenen Bild oder mit einem Bild aus ihrem Skript.

## Kontext
- Entscheidung E4 aus PROJ-89: eigene Bilder hochladen **und** Bilder aus dem Skript, auch solche, die die KI nicht verwendet hat.
- Bilder sind heute `image`-Blöcke mit `path` auf ein beim Einlesen gespeichertes Bild (`images/…`). Beim Fertigstellen speichert die App zusätzlich einen „Bilder-Auszug" mit den verwendeten Bildern (PROJ-53). Das Skript wird nach 12 Monaten entfernt (PROJ-52), Regal-Kopien haben gar keins.
- `seite.py` bettet Bilder als Base64 ein, verkleinert ab 350 KB und lehnt Seiten über 8 MB ab.
- Hochgeladene Bilder zählen gegen die 2-GB-Grenze je Konto.

## Grober Umfang (noch nicht festgelegt)
- Bild hochladen (PNG, JPG, ggf. WebP/SVG offen), mit Alternativtext (Pflicht) und Bildunterschrift
- Galerie „Bilder aus dem Skript": alle beim Einlesen gefundenen Bilder, verwendete markiert
- Bild in einem vorhandenen Bild-Block austauschen
- Größe/Breite wählen (z. B. ganz, halb)
- Anzeige, wie viel der 8-MB-Grenze die Seite schon belegt
- Offen: Bild zuschneiden/drehen
- Offen: Was gilt, wenn das Skript schon entfernt ist (nur noch Bilder-Auszug verfügbar)?

## Dependencies
- Requires: PROJ-89 (Editor-Grundgerüst)
- Berührt: PROJ-52 (Speicher, 12-Monats-Regel), PROJ-53 (Bilder-Auszug bei Regal-Kopien)

## Abgrenzung
- Diagramme → PROJ-91
- Bildzuordnung (`bildzuordnung`) mit Punkten auf dem Bild: Formular kommt mit PROJ-90
- Bilder per KI erzeugen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
