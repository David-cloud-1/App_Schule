# PROJ-35: „Mein Resort" – Tourismus-Hotelkomplex (isometrisch)

## Status: In Review
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
      Ausstattung & Deko, Transfer; die technischen Kategorienwerte in der
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

### Kurzfassung
Die gesamte Technik aus PROJ-34 (Welt, Kamera, Lager, Setzen, Animationen,
Schnittstellen, Datenhaltung) gilt für Tourismus **unverändert** – der Katalog
„Icon-Schlüssel → Sprite" und der Ort-Aufbau sind fachbereichsabhängig und
brauchen nur Tourismus-Inhalt. Neu sind: Sprites, ein Resort-Motiv für die Welt,
ein erweiterter Katalog und die Bezeichnung.

### A) Bausteine
```
Bestehend aus PROJ-34 (nur befüllt, nicht neu gebaut)
+-- Seite "Mein Resort", Lager-Leiste, Kamera, Animationen, Profil-Vorschau
+-- Datenhaltung "Platzierung" (gilt für beide Fachbereiche)

Neu für Tourismus
+-- Sprite-Satz Resort (weicher Stil)
|   +-- alle 32 bisherigen Tourismus-Icons bekommen ein isometrisches Sprite
|   +-- neue Resort-Sprites: Pool, Spielplatz, Restaurant, Strandbar, Minigolf, Liegen, Brunnen ...
+-- Resort-Motiv der Welt (Wiese heller, Sandweg, Promenade statt Straße, weiße Hecke)
+-- Startkatalog: bestehende 10 Items bleiben, ca. 10 Resort-Items kommen dazu
+-- Anzeigenamen der Kategorien: Transfer · Gebäude & Freizeit · Natur & Deko · Abzeichen
+-- Bezeichnung "Resort" (Fachbereichsdaten)
```

### B) Daten (Klartext)
- **Keine neue Tabelle, keine Schema-Änderung.** Platzierungen, Käufe, Seltenheit
  und Kategorien bestehen schon.
- **Neu:** ca. 10 Resort-Items als Daten (Migration), Preise in Reisetalern, mit
  Kategorie und Icon-Schlüssel.
- **Kategorien bleiben technisch dieselben vier.** Die Resort-Gruppen (Gebäude,
  Freizeit, Natur & Deko, Transfer) werden auf sie abgebildet:
  Transfer = Fahrzeuge · Gebäude & Freizeit = Gebäude/Deko ·
  Natur & Deko = Ausstattung · Abzeichen unverändert. Es ändern sich nur die
  Anzeigenamen (wie in PROJ-31).
- **Bereits gekaufte Items bleiben erhalten:** Jeder bisherige Tourismus-Schlüssel
  (Flugzeug, Reisebus, Palme, Strandhotel, Koffer, Globus, Reisepass, Pokal …)
  bekommt ein passendes Resort-Sprite; ein Test erzwingt das.

### C) Entscheidungen (Begründung)
1. **Technik wiederverwenden:** Der Fachbereichscode steuert Sprites, Motiv und
   Beschriftung schon heute (PROJ-34). Dadurch sind Link, Profil-Vorschau und
   Gating automatisch aktiv, sobald der Tourismus-Katalog nicht mehr leer ist.
2. **Neue Resort-Schlüssel brauchen auch einen Eintrag im flachen Tourismus-Set**,
   weil die Server-Prüfung „Icon passt zur Kategorie und zum Fachbereich" und der
   Admin-Picker darauf beruhen. Das flache Bild wird dafür aus dem Sprite
   erzeugt – kein zweites Zeichnen.
3. **Eigenes Welt-Motiv, gleiche Logik:** Nur Boden und Randgestaltung hängen am
   Fachbereich (Weg/Straße vs. Sand-Promenade); Layout, Kamera und Setzen nicht.
4. **Resort-Items als Daten:** Die Lehrkraft kann Preise, Seltenheit und
   Aktivstatus ändern; nur neue Sprites brauchen einen Deploy.
5. **Stil wie Spedition:** weicher Stil (Verläufe, dünne Konturen, weiche
   Schatten), damit beide Fachbereiche aus einem Guss wirken.
6. **Kein Eingriff in Rechte, Münzen, Login.**

### D) Was sich an Bestehendem ändert
| Bereich | Änderung |
|---------|----------|
| Sprite-Katalog | Eintrag für Tourismus statt leer |
| Flaches Tourismus-Set | + neue Resort-Schlüssel (Bild aus dem Sprite) |
| Welt-Komponente | Motiv-Auswahl nach Fachbereich (Boden/Randgestaltung) |
| Kategorie-Anzeigenamen Tourismus | Transfer / Gebäude & Freizeit / Natur & Deko / Abzeichen |
| Daten | neue Resort-Items; Bezeichnung „Resort" |
| Tourismus-Profil/Startseite | zeigen automatisch die neue Welt statt der flachen Galerie |

### E) Reihenfolge (Vorschlag)
1. Sprites für die 32 bestehenden Tourismus-Icons (in Teilen, mit Übersichtsbild)
2. Neue Resort-Sprites + Einträge im flachen Set
3. Resort-Motiv der Welt
4. Katalog-Migration + Bezeichnung + Kategorienamen
5. Tests und Sichtprüfung

### F) Abhängigkeiten
Keine neuen Pakete.

### G) Risiken
- **Umfang der Grafik** (ca. 42 Sprites) ist der größte Posten.
- **Abnahme am Handy** wie bei PROJ-34 durch den Nutzer.
- **Datenänderung auf Produktion** (neue Items sichtbar für alle Tourismus-Azubis):
  Zeitpunkt abstimmen.

## Implementation Notes (2026-10-09)
- **Sprites:** `src/lib/hof-welt/resort-weich.ts` – 32 Sprites für alle bisherigen Tourismus-Icons (Flugzeug, Reisebus, Zug, Kreuzfahrtschiff, Mietwagen, Heißluftballon, Segelboot, Seilbahn, Hotel, Reisebüro, Palme, Leuchtturm, Flughafen-Tower, Sonnenschirm, Berghütte, Zelt, Koffer, Globus, Reiseführer, Rucksack, Kompass, Bordkarte, Fotokamera, Sonnenbrille und acht Abzeichen) + 9 neue Resort-Bauten (Pool, Spielplatz, Restaurant mit Café-Schild, Strandbar, Minigolf mit Windmühle, Rezeption, Sonnenliegen, Brunnen, Shuttlebus). Weicher Stil wie Spedition.
- **Katalog:** `betrieb-sprites.ts` – `TOUR` ist befüllt; damit sind Link, Profil-Vorschau, Seite und Gating automatisch aktiv.
- **Flaches Set:** `hof-icons-tour.tsx` – die neuen Schlüssel stehen auch im flachen Tourismus-Set (Bild aus dem Sprite), damit Server-Prüfung und Admin-Picker unverändert funktionieren.
- **Welt-Motiv:** Sand-Promenade mit Muscheln statt Erdstraße vorne (`sandUrl` in `natur.ts`, Auswahl nach Fachbereich in `betrieb-welt.tsx`).
- **Kategorienamen Tourismus:** Transfer · Gebäude & Freizeit · Ausstattung & Deko · Abzeichen & Trophäen („Ausstattung & Deko“ statt „Natur & Deko“, weil dort auch Koffer, Globus, Kamera liegen).
- **Daten:** Migration `20261009_proj35_resort_katalog` (9 neue Items 50–220 Reisetaler, idempotent, mit Rollback; Bezeichnung „Resort“). **Noch nicht auf Produktion angewendet.**

## QA Test Results
**Stand 2026-10-09 – automatisiert + Sichtprüfung; Abnahme am Handy steht aus**
- 885 Tests grün (zweimal in Folge), `tsc` ohne Fehler, Lint 0 Fehler. Neu: jedes flache Tourismus-Icon hat ein Sprite (kein gekauftes Item verliert sein Aussehen), plausible Größen und gültiges SVG für alle 41 Schlüssel, Tippfehler-Schutz gegen das flache Set, Sand-Motiv vs. Erdstraße, Tourismus-Items ohne Platzhalter.
- Sichtprüfung (gerendert): Sprite-Übersicht `docs/vorschau/sprites-resort-serie.png`, Beispiel-Resort `docs/vorschau/resort-beispiel.png`. Dabei gefunden und behoben: abgeschnittenes Restaurant-Schild (jetzt „CAFÉ“).
- **Nicht geprüft:** Handy-Gefühl wie bei PROJ-34; Lesbarkeit der kleinen Schilder („HOTEL“, „REISEN“, „CAFÉ“) auf dem Gerät.
- **Hinweis:** Die flache Hof-Galerie aus PROJ-26/33 wird nur noch für unbekannte Fachbereiche gebraucht.

## Deployment
_To be added by /deploy_
