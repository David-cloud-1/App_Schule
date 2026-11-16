# PROJ-109: Baukasten – Externe Einbettung (Kahoot, LearningApps, YouTube …) mit Zwei-Klick-Lösung

## Status: Planned
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Ein Block „Einbetten“ nimmt einen Link zu Kahoot, LearningApps, YouTube, Padlet und ähnlichen Angeboten auf. In der Seite zeigt er zuerst eine Karte mit Datenschutz-Hinweis, Link und QR-Code, und erst nach einem Klick lädt das eingebettete Fenster.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- Das Kahoot-Werkzeug (PROJ-54) liefert eine Excel-Datei für kahoot.com, kein einbettbares Spiel. Ein Kahoot wird live per PIN oder als Selbstlern-Challenge-Link gespielt. Eine Einbettung im Fenster unterstützt Kahoot nur eingeschränkt, deshalb ist Link + QR-Code der verlässliche Weg.
- Die Seite ist eine eigenständige HTML-Datei, die offline läuft. Eingebettete Inhalte brauchen Internet und laden Daten von Fremdanbietern (Schüler sind minderjährig: DSGVO).

## Entscheidungen (Nutzer, 2026-11-16)
- **E1 – Zwei-Klick-Lösung:** Zuerst eine Karte mit Hinweis „Lädt Inhalte von kahoot.com“. Geladen wird erst nach Klick. Dazu immer Link und QR-Code (auch für den Druck).

## Vorschläge (bitte beim Review bestätigen)
- **V1 – Erlaubte Anbieter (Liste):** YouTube (über `youtube-nocookie.com`), Vimeo, LearningApps, Kahoot (Link/Challenge), Padlet, Mentimeter, H5P.com/Lumi, GeoGebra, Google Forms, Microsoft Forms, ein selbst gehostetes Moodle. Andere Links werden nur als Karte mit Link/QR angezeigt, nie eingebettet.
- **V2 – „Für diese Seite merken“:** Der Klick auf „Laden“ gilt nur für diesen Block und diesen Besuch. Eine Option „Inhalte von youtube.com auf dieser Seite immer laden“ wird im Browser des Schülers gemerkt.

## Dependencies
- Requires: PROJ-101 (Block-Leiste, Leerzustände), PROJ-90 (Katalog)
- Berührt: Kern (`seite.py`: neuer Baustein „Einbetten“, QR-Code-Erzeugung offline, Content-Security der Seite), PROJ-67 (öffentlicher Link läuft in einer Sandbox, Einbettungen müssen dort funktionieren), PROJ-110 (Quiz-Show als Offline-Alternative zu Kahoot)

## User Stories
- Als **Lehrkraft** möchte ich mein Kahoot oder eine LearningApp per Link in die Seite einbauen, damit Schüler nicht suchen müssen.
- Als **Lehrkraft** möchte ich ein YouTube-Video an der passenden Stelle zeigen.
- Als **Lehrkraft** möchte ich sicher sein, dass ohne Zustimmung keine Daten an Fremdanbieter gehen.
- Als **Schüler** möchte ich mit dem Handy den QR-Code scannen, wenn ich die Seite ausgedruckt vor mir habe.
- Als **Schüler offline** möchte ich verstehen, warum der Inhalt nicht lädt, und den Link für später haben.

## Acceptance Criteria

### Anlegen
- [ ] Der Katalog hat „Einbetten (Video, Kahoot, LearningApps …)“. Ein neuer Block zeigt ein Feld „Link einfügen“.
- [ ] Nach dem Einfügen erkennt der Editor den Anbieter und zeigt dessen Namen und Symbol (eigene Darstellung, kein Laden vom Anbieter). Ein Titel wird vorgeschlagen und ist änderbar.
- [ ] Bei Anbietern auf der Liste (V1) wählt die Lehrkraft „Einbetten (nach Klick)“ oder „Nur Link und QR-Code“. Bei allen anderen gibt es nur „Link und QR-Code“, mit Hinweis.
- [ ] Optional: Arbeitsauftrag über der Karte (direkt getippt, PROJ-103), bei YouTube Startzeit und Endzeit.
- [ ] Ungültige Links (kein `https://`, `javascript:`, IP-Adressen, lokale Adressen) werden abgelehnt: „Dieser Link kann nicht eingebettet werden.“
- [ ] Ein YouTube-Link wird automatisch auf die datensparsame Variante umgestellt.

### Schüler-Ansicht
- [ ] Die Karte zeigt: Titel, Anbieter, Hinweis „Beim Laden werden Daten an <anbieter.de> übertragen.“, Knopf „Inhalt laden“, Link „In neuem Tab öffnen“ und einen QR-Code.
- [ ] Erst nach Klick auf „Inhalt laden“ wird das Fenster geladen (höchstmögliche Einschränkungen, Seitenverhältnis passend zum Anbieter).
- [ ] Ohne Internet zeigt die Karte „Für diesen Inhalt brauchst du Internet.“, und Link und QR-Code bleiben.
- [ ] Der QR-Code ist in der Datei enthalten (funktioniert offline) und groß genug zum Scannen (mindestens 3 cm im Druck).
- [ ] Druck: Karte mit Titel, Link als Text und QR-Code, ohne Fenster.
- [ ] Die Einbettung zählt nicht in den Fortschritt der Seite (nicht prüfbar).

### Editor
- [ ] In der Editor-Vorschau lädt nichts von außen, bis die Lehrkraft im Modus Ausprobieren „Inhalt laden“ klickt.
- [ ] Die Prüfstelle meldet Einbettungen ohne Titel oder mit nicht erreichbarem Link als Hinweis (sperrt nicht).

## Edge Cases
- **Kahoot-Live-PIN:** Eine PIN ist kein Link. Das Feld erkennt eine 6- bis 7-stellige Zahl und bietet „Kahoot-PIN anzeigen“ an (große Anzeige, Link zu kahoot.it). Hinweis: Die PIN gilt nur für das laufende Spiel.
- **Anbieter verbietet Einbettung** (Fenster bleibt leer): Nach dem Laden erscheint „Wird hier nicht angezeigt? In neuem Tab öffnen“ dauerhaft unter dem Fenster.
- **Sehr lange Links:** QR-Code bleibt lesbar (Fehlerkorrektur angepasst). Ab einer kritischen Länge Hinweis an die Lehrkraft, einen kürzeren Link zu nehmen.
- **Öffentlicher Link (PROJ-67, Sandbox):** Einbettungen und „In neuem Tab öffnen“ funktionieren dort ebenfalls.
- **Link ändert sich später / Inhalt gelöscht:** Die Seite zeigt, was der Anbieter liefert. Die Prüfstelle prüft beim Veröffentlichen.

## Nicht Teil dieses Features
- Eigene Kahoot-Spiele erzeugen oder hochladen (Kahoot-API).
- Offline-Spiel im Kahoot-Stil (PROJ-110).

## Technical Requirements
- Sicherheit: Nur `https`-Links. Eingebettetes Fenster mit minimalen Rechten. Kein Laden vor dem Klick, auch keine Vorschaubilder vom Anbieter.
- Datenschutz: Text des Hinweises vor dem Bau mit der Schule abstimmen (Formulierung für Minderjährige).

## Offene Punkte für `/architecture`
- QR-Code-Erzeugung im Kern (offline, ohne Fremdbibliothek zur Laufzeit).
- Verträgt sich die Content-Security der Seite und der Sandbox des öffentlichen Links mit eingebetteten Fenstern der Liste?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
