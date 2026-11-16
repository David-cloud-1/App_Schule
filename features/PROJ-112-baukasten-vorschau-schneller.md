# PROJ-112: Baukasten – Vorschau schneller

## Status: In Review
**Created:** 2026-11-16
**Last Updated:** 2026-11-16

## Idee in einem Satz
Nach jeder Änderung im Baukasten soll die Vorschau spürbar früher aktuell sein, ohne dass sich Inhalt oder veröffentlichte Seite ändern.

## Anlass
Der Nutzer meldete (2026-11-16): „alles sehr sehr langsam“, bei einer Seite mit 5,7 MB.

## Wie es heute ablief
Jede Speicherung löst nach 1,5 s einen kompletten Neubau aus:
1. Die App schickt die Struktur an den Kern (`/api/editor/bauen`) und parallel die Prüfstelle (`/pruefen`).
2. Der Kern lädt die Einlesung (Skript mit allen Bildern, auch bei `pruefen`) und danach **nacheinander** bis zu 40 eigene Bilder herunter.
3. Er verkleinert große Bilder (PyMuPDF), baut die Seite und **baut zusätzlich eine zweite Fassung** (`vorschau_html`), die der Editor gar nicht benutzt.
4. Die App lädt die ganze Seite (hier 5,7 MB) herunter und ersetzt damit den Vorschau-Rahmen.

## Entscheidungen
- **E1 – Ehrlich messen:** Es gibt keine Messwerte aus dem Betrieb (Vercel-Protokolle reichen nur eine Stunde zurück). Diese Stufe nimmt nur Schritte, die sicher Zeit sparen und die Ausgabe nicht verändern. Die App schreibt die Messwerte in die Browser-Konsole (`[Vorschau] … kB gebaut: Server … ms, Laden … ms`), damit die nächste Stufe auf Zahlen beruht.
- **E2 – Ausgabe bleibt bytegleich.** Die veröffentlichte Seite ändert sich nicht (Test: Seite mit und ohne zweite Fassung identisch).
- **E3 – Nicht in dieser Stufe:** nur den geänderten Block neu bauen und im Rahmen austauschen (groß, riskant, Aufgaben müssen neu starten); Bilder in der Vorschau per Adresse statt eingebettet.

## Umgesetzt (Stufe 1)
**Kern** (Commit 342cedf, live 2026-11-16):
- Einlesung und eigene Bilder werden **gleichzeitig** geladen.
- Zwischenspeicher je Instanz, Schlüssel ist der Pfad der Adresse ohne Zugriffsmarke: Einlesung 45 s (kann ersetzt werden), eigene Bilder 15 min (zufällige Namen, ändern sich nie). Höchstens 96 MB, Einzeldatei bis 48 MB.
- Das Verkleinern eines Bildes wird gemerkt (Schlüssel: Inhalt). Misslingt es, wird nichts gemerkt, damit die Warnung jedes Mal kommt.
- Die zweite Fassung wird nur gebaut, wenn die App ein `vorschau_ziel` angibt (der Editor gibt keines an).

**App:**
- Nach einem langsamen Bau wartet der nächste länger (halbe Bauzeit, mindestens 1,5 s, höchstens 5 s). So staut sich bei langsamer Leitung keine Schlange von Neubauten (`vorschauWartezeit`).
- Messwerte in der Konsole (siehe E1).

## Acceptance Criteria
- [x] Seite aus dem Editor-Bau ist mit und ohne zweite Fassung byte-gleich.
- [x] Zweiter Abruf derselben Quelle kommt aus dem Speicher, auch mit neuer Zugriffsmarke; abgelaufene Einträge werden neu geladen; der Speicher bleibt unter der Grenze.
- [x] Parallel geladene Bilder ergeben dasselbe wie nacheinander, in derselben Reihenfolge.
- [x] Wartezeit: 1,5 s ohne Messwert und bei schnellen Bauten, sonst halbe Bauzeit, nie über 5 s.
- [ ] **Offen:** Wirkung im Betrieb messen (Konsole, Material mit vielen Bildern) und danach über Stufe 2 entscheiden.

## Tests
Kern: `kern_tempo_test.py` (8 Tests), alle 291 Kern-Tests grün. App: `vorschau-wartezeit.test.ts`.
