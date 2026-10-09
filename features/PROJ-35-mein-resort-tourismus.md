# PROJ-35: „Mein Resort" – Tourismus-Hotelkomplex (isometrisch)

## Status: Architected
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

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
