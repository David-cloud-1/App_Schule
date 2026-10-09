# PROJ-31: Tourismus-Reisebüro – Grafikset, Startkatalog & eigene Szene

## Status: Planned
**Created:** 2026-10-09
**Last Updated:** 2026-10-09
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-26 (Hof-Szene, SVG-Icon-Set je Fachbereichs-Code,
  Kategorien) — die Struktur `ICON_SETS[code]` ist dort bewusst so angelegt,
  dass ein `TOUR`-Set ohne Schema-Änderung ergänzt werden kann.
- **Requires:** PROJ-25 (Fachbereich `TOUR`: App „TouristikLern", Münzname
  „Reisetaler", Hofname „Reisebüro"/„Büro") und PROJ-24 (Tourismus-Admin
  pflegt den Katalog über die bestehende „Hof-Items"-Seite).
- **Ersetzt eine Festlegung aus PROJ-25:** PROJ-25 hat den Tourismus-Shop
  bewusst leer gelassen. Dieses Feature liefert jetzt einen Startkatalog,
  damit der Shop beim Start nicht leer ist; die Lehrkraft kann alles
  anpassen, deaktivieren und ergänzen.
- **Verwandt:** PROJ-32 (Hof-Ausbau für beide Fachbereiche) baut auf diesem
  Feature auf, ist aber unabhängig deploybar.

## Problem

Tourismus-Azubis (touristiklern.vercel.app) haben ein „Reisebüro" und
„Reisetaler", aber nichts, wofür sie die Reisetaler ausgeben können: Der
Shop ist leer, das Icon-Set für `TOUR` ist leer (`TOUR: []`), und die
Hof-Szene aus PROJ-26 zeigt neutrale Zonen mit Spedition-Beschriftung
(„Fahrzeuge", „Hof-Deko", „Ladung"). Die Rückkehr-Motivation durch Sammeln
(siehe PROJ-19/20) greift damit im zweiten Fachbereich überhaupt nicht.

## Lösung

1. **Tourismus-Grafikset:** Ein eigenes Set handgefertigter Inline-SVG-
   Illustrationen für `TOUR` (kein Bild-Upload, kein externer Dienst — bleibt
   kostenfrei wie PROJ-20/26). Gleiche vier technische Kategorien, aber
   Reise-Themen: Verkehrsmittel (Flugzeug, Reisebus, Zug, Kreuzfahrtschiff,
   …), Gebäude & Deko (Hotel, Reisebüro-Fassade, Palme, …), Ausstattung
   (Koffer, Globus, Reiseführer, …), Abzeichen & Trophäen.
2. **Fachbereichsspezifische Kategorienamen:** Die technischen Werte
   (`fahrzeuge`, `gebaeude_deko`, …) bleiben unverändert (DB-Check bleibt).
   Nur die *angezeigten* Namen hängen vom Fachbereich ab, z. B. Tourismus:
   „Verkehrsmittel", „Hotels & Reise-Deko", „Reiseausstattung",
   „Abzeichen & Trophäen".
3. **Startkatalog Tourismus:** Mindestens 2 aktive Items je Kategorie, Preise
   in Reisetalern, abgestimmt auf das Startguthaben (PROJ-19), inklusive
   eines Referenzitems zum selben Preis wie in Spedition (75), damit der
   erste Kauf früh möglich ist.
4. **Eigene Szene fürs Reisebüro:** „Mein Büro" im Profil zeigt eine für
   Tourismus gestaltete, zusammenhängende Illustration (eigener Hintergrund
   und eigene Zonenanordnung, z. B. Flughafen-/Hafen-Vorfeld für
   Verkehrsmittel, Hotelfassaden im Hintergrund, Reise-Deko im Vordergrund,
   Trophäen auf einem Regal im Reisebüro). Die Zuordnung zu Zonen bleibt
   automatisch über die Kategorie, keine freie Positionierung.

## User Stories

- Als **Tourismus-Azubi** möchte ich meine Reisetaler im Shop gegen
  reisetypische Items (Flugzeug, Hotel, Koffer, …) eintauschen, damit sich das
  Sammeln zu meinem Beruf passt und nicht nach Spedition aussieht.
- Als **Tourismus-Azubi** möchte ich in „Mein Büro" eine Szene sehen, die wie
  ein Reisebüro-/Reiseumfeld wirkt, damit sich mein Fortschritt sichtbar
  lohnt.
- Als **Tourismus-Azubi** ohne Käufe möchte ich weiterhin einen
  einladenden Leerzustand statt einer leeren Szene sehen.
- Als **Tourismus-Admin** möchte ich beim Anlegen/Bearbeiten eines Items eine
  Illustration aus dem Reise-Set mit Vorschau wählen, damit ich keine Bilder
  besorgen muss.
- Als **Tourismus-Admin** möchte ich die Startitems anpassen, deaktivieren und
  eigene ergänzen können, damit der Katalog zu meinem Unterricht passt.
- Als **Spedition-Azubi** möchte ich, dass sich an meinem Hof, meinen
  Kategorienamen und meinem Katalog durch dieses Feature nichts ändert.

## Acceptance Criteria

### Grafikset & Kategorien
- [ ] `getHofIconSet('TOUR')` liefert mindestens 20 Illustrationen, mindestens
      5 je Kategorie; kein Icon-Schlüssel ist in `TOUR` und `SPED` doppelt
      mit unterschiedlicher Bedeutung belegt
- [ ] Der Admin eines Fachbereichs sieht im Icon-Picker ausschließlich das Set
      seines Fachbereichs (Tourismus-Admin keine LKW-Icons und umgekehrt)
- [ ] Die serverseitige Prüfung „Icon gehört zur Kategorie im Set dieses
      Fachbereichs" (PROJ-26) funktioniert für `TOUR`; ein Spedition-Icon-
      Schlüssel wird für ein Tourismus-Item serverseitig abgelehnt
- [ ] Die Kategorienamen erscheinen in Shop-Kachel, Admin-Liste, Admin-
      Formular, Hof-Szene und Screenreader-Liste im fachbereichs-
      spezifischen Wortlaut; die DB-Werte der Kategorien bleiben unverändert
- [ ] Alle Illustrationen verwenden die Farbpalette aus `docs/DESIGN.md` und
      sind auf dunklem Hintergrund klar erkennbar (kein weißer Hintergrund)

### Startkatalog
- [ ] Der Fachbereich `TOUR` hat nach der Migration mindestens 2 aktive Items
      je Kategorie, jedes mit gültiger Kategorie und gültigem Icon-Schlüssel
      aus dem `TOUR`-Set
- [ ] Mindestens ein aktives Tourismus-Item kostet exakt 75 Reisetaler
- [ ] Die Migration ist idempotent (zweimaliges Anwenden erzeugt keine
      Duplikate) und hat eine Rollback-Datei
- [ ] Spedition-Items bleiben unverändert (Anzahl, Preise, Kategorien)
- [ ] Die Texte der Startitems verwenden „Reisetaler"/„Büro" und nirgends
      „Frachtmünzen"/„Hof"/Spedition-Begriffe

### Szene „Mein Büro"
- [ ] Ein Tourismus-Konto mit Käufen sieht die Tourismus-Szene (eigener
      Hintergrund und Zonenanordnung), ein Spedition-Konto weiterhin die
      bisherige Hof-Szene aus PROJ-26
- [ ] Jedes gekaufte Item erscheint in der Zone seiner Kategorie; eine Zone
      ohne Käufe nimmt keinen sichtbaren Raum ein bzw. wirkt nicht kaputt
- [ ] Ein Konto ganz ohne Käufe zeigt den einladenden Leerzustand mit Link
      zum Shop (Wortlaut „Büro"/„Reisebüro"), nicht die leere Szene
- [ ] Ein bereits gekauftes, später deaktiviertes Item bleibt in der Szene
      sichtbar (keine Regression zu PROJ-20 BUG-2)
- [ ] Die Szene hat keine horizontale Scrollbar bei 320 px Breite, auch mit
      20 Items in einer Zone
- [ ] Für Screenreader existiert eine textbasierte Alternative mit Item-Name
      und Kategorie (wie in PROJ-26)
- [ ] Die Szene respektiert `prefers-reduced-motion` (falls Bewegung
      eingesetzt wird)

### Shop & Admin
- [ ] Kauf-Ablauf, „im Besitz", „Dir fehlen N Reisetaler" und Preisanzeige
      funktionieren unverändert (Regressionstest gegen PROJ-20/26)
- [ ] Ein Tourismus-Admin kann Items aus dem Reise-Set anlegen, bearbeiten und
      deaktivieren; ein Super-Admin im Bereichs-Umschalter (PROJ-29) sieht
      beim Wechsel auf Tourismus das Reise-Set

## Edge Cases

- **Item verweist auf einen Schlüssel, der im Set fehlt** (Illustration wird
  später im Code entfernt): Fallback auf ein generisches Platzhalter-Icon je
  Kategorie bzw. das alte Emoji-Feld, nichts darf kaputt aussehen
  (Fortsetzung PROJ-26).
- **Super-Admin wechselt den Bereich (PROJ-29) in einer offenen Item-
  Bearbeitung:** Der Icon-Picker zeigt nie ein Set, das nicht zum Fachbereich
  des Items gehört.
- **Nutzer wechselt den Fachbereich** (PROJ-23/29, verknüpfte Konten): Die
  Käufe gehören zum jeweiligen Fachbereichskonto; es erscheinen keine
  Spedition-Items in der Tourismus-Szene und umgekehrt.
- **Lehrkraft deaktiviert alle Startitems einer Kategorie:** Kein Fehler,
  Shop zeigt die Kategorie ohne Items nicht; bereits Gekauftes bleibt
  sichtbar.
- **Item wird in eine andere Kategorie verschoben:** Gekaufte Exemplare
  erscheinen in der Zone der *aktuellen* Kategorie (wie PROJ-26).
- **Thema passt zu keiner Illustration:** Bekannter Kompromiss der festen
  Bibliothek; Erweiterung erfordert Code-Deploy (wie PROJ-26).
- **Sehr schmale Bildschirme / große Schrift:** Zonen stapeln, Item-Namen
  werden gekürzt statt überzulaufen.

## Technical Requirements (optional)
- Kosten: keine neuen laufenden Kosten (kein Bild-Hosting, keine Bild-KI)
- Security: Kategorie-/Icon-Validierung bleibt serverseitig; RLS unverändert
- Performance: Szene bleibt reines Inline-SVG, keine zusätzlichen Requests
- Barrierefreiheit: Textalternative und Kontrast wie PROJ-26

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
