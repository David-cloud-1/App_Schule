# PROJ-113: Baukasten – Klicks in die Vorschau nie unnötig blockieren

## Status: Deployed
**Created:** 2026-11-16
**Last Updated:** 2026-11-16 (Deployed: App 51453a4)

## Idee in einem Satz
Nach einer Änderung bleibt die Vorschau sofort bedienbar. Ein Klick auf einen Block, den die Änderung nicht berührt hat, wird nicht mehr abgewiesen.

## Anlass
Der Nutzer meldete nach PROJ-111/112: „ist noch immer relativ langsam“.

## Messung (2026-11-16, Kern-Protokoll von Vercel)
Aus den Anfrage-IDs (Startzeit) und den Protokollzeiten: `/api/editor/bauen` braucht warm **0,6 bis 1,2 s**, `/pruefen` 0,1 bis 0,8 s. Nur der erste Aufruf nach einem Deploy war kalt: **6,3 s** (Abhängigkeiten werden beim Start installiert). Der Kern ist also nicht der Engpass. Auch die App-Funktion läuft in `dub1`, wie der Kern.

## Ursache
Nach jeder Änderung wies der Editor jeden Klick in die Vorschau mit „Die Vorschau wird gerade aktualisiert. Bitte gleich noch einmal klicken“ ab, bis Speichern (Wartezeit + Anfrage), Warten auf den Neubau (1,5 s) und der Neubau selbst fertig waren. Das sind mehrere Sekunden pro Änderung, in denen sich der Editor tot anfühlt. Die Abweisung war pauschal, obwohl die Nummerierung der Marken (`k0-e3`) nur bei Struktur-Änderungen falsch wird.

## Entscheidungen
- **E1 – Klick geht, wenn die Stelle stimmt:** Jede Stelle (Thema `k0`, Block `k0-e1`) hat einen Fingerabdruck (Titel bzw. JSON des Blocks). Stimmt der Fingerabdruck der angeklickten Stelle in der gezeigten Seite mit dem aktuellen Entwurf überein, trifft der Klick denselben Block, und er wird ausgeführt.
- **E2 – Sicher abgewiesen wird nur,** wenn der angeklickte Block selbst geändert wurde, davor ein Block eingefügt oder gelöscht wurde (Nummern verschoben) oder nicht sicher ist, aus welchem Stand die Seite stammt (während des Baus wurde erneut gespeichert).
- **E3 – Deckblatt und Lernzielkontrolle** hängen nicht an der Nummerierung und gehen immer.
- **E4 – Wartezeit gedeckelt:** Die adaptive Wartezeit aus PROJ-112 ist auf höchstens 3 s begrenzt (vorher 5 s), damit sie die Aktualisierung nicht unnötig verzögert.

## Acceptance Criteria
- [x] Klick auf einen unveränderten Block geht sofort, auch während Speichern und Neubau (Test).
- [x] Klick auf das neue, der Seite unbekannte Thema wird mit „Bitte gleich noch einmal klicken“ abgewiesen (Test).
- [x] `stelleStimmt`: bearbeiteter Nachbar ok, bearbeiteter angeklickter Block nein, davor eingefügt nein, gelöscht nein, Titel des Themas, Deckblatt/Abschluss immer (Tests).
- [x] Nach einem fehlgeschlagenen Neubau bleibt der Hinweis „Vorschau ist nicht aktuell“ für Stellen, die nicht stimmen.
- [ ] **Offen:** Wirkung im Betrieb. Kommt es weiter zu Verzögerungen, sind die nächsten Kandidaten: Kern vorwärmen (erster Bau nach Pause 6 s), nur den geänderten Block in der Seite austauschen, Bilder in der Vorschau kleiner.

## Implementation Notes
`use-editor-zustand.ts`: `markenSchluessel`, `stelleStimmt`, Zustand `gespeichertSchluessel` (gehört zu `gespeichertAm`), `gebautSchluessel` in `useEditorVorschau` (null, wenn während des Baus erneut gespeichert wurde). `baukasten-editor.tsx`: `beiWunsch` nutzt `stelleStimmt` statt `laedt`/`gebautFuer`/`speicherstand`.
