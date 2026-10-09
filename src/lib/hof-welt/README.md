# hof-welt – isometrische Zeichentechnik für „Mein Betrieb" (PROJ-34/35)

Herkunft: Kopie aus dem eigenen Projekt `spedition-tycoon` (`src/welt/`), Stand
2026-10-09. Es gibt keine Laufzeit-Abhängigkeit dorthin.

| Datei | Herkunft | Inhalt |
|-------|----------|--------|
| `iso.ts` | Tycoon, unverändert | Iso-Projektion, Licht, Quader, Dächer, Fenster, `sprite()` |
| `bauteile.ts` | Tycoon, unverändert | Hallen, Bürohaus, Container, Bäume, Fahnen … |
| `fahrzeuge.ts` | Tycoon, unverändert | Lkw u. a. in vier Blickrichtungen |
| `boden.ts` | Tycoon, unverändert | Bodenkacheln (derzeit nicht genutzt, siehe `natur.ts`) |
| `karte.ts` | neu (Mini-Shim) | nur die Typen, die `boden.ts` braucht |
| `palette.ts` | Tycoon, **geändert** | sonnigere, buntere Palette für den Hay-Day-Stil |
| `stil.ts` | neu | Stilschicht (`STIL_WEICH`: dünne Konturen) |
| `natur.ts` | neu | weicher Stil: Wiese, Erdweg, Bäume, Scheune, Zaun, Lagerhalle, Bürohaus, Container, Pokal |
| `sprites-betrieb.ts` | neu | verspielte Details (Wimpelkette, Markise, Beet, Busch, Kegel, Wegweiser) |

Der aktuelle Stil ist der „weiche" (`natur.ts`): Verläufe, weiche Schatten, dünne
Konturen. Die Tycoon-Fahrzeuge werden über `STIL_WEICH` angepasst.
Änderungen im Tycoon-Projekt werden **nicht** automatisch übernommen.
