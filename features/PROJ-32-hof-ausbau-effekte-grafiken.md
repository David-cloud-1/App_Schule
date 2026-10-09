# PROJ-32: Hof-Ausbau – Effekte für teure Items & mehr Grafiken

## Status: In Review
**Created:** 2026-10-09
**Last Updated:** 2026-10-09
**Priorität:** P2

## Dependencies
- **Requires:** PROJ-26 (Hof-Szene, SVG-Set, Kategorien)
- **Requires:** PROJ-31 (Tourismus-Set und -Szene) — die Erweiterung gilt für
  *beide* Fachbereiche und baut auf deren Sets auf. Kann erst nach PROJ-31
  vollständig abgeschlossen werden.
- **Berührt:** PROJ-20 (Preise/Käufe), PROJ-19 (Münzen) — nur lesend, ändert
  Preislogik und Kauf-Ablauf nicht.

## Problem

Nach PROJ-26 und PROJ-31 besteht jede Hof-Szene aus nur 5 bis 7 Grafiken je
Kategorie. Wer lange spart und ein teures Item kauft, sieht es genauso
unscheinbar wie ein günstiges. Damit fehlt ein sichtbarer Lohn für Ausdauer,
und die Sammlung ist schnell „durch". Der Shop soll zum Weiterspielen
motivieren (siehe [engagement-retention-problem]), nicht nach den ersten
Käufen leer laufen.

## Lösung

1. **Mehr Grafiken:** Beide Sets (`SPED`, `TOUR`) wachsen auf mindestens 8
   Illustrationen je Kategorie (also mindestens 32 je Fachbereich).
2. **Seltenheitsstufen mit sichtbarem Effekt:** Jedes Item hat eine
   Seltenheit, die sich aus dem Preis ableitet (feste Schwellen) oder vom
   Admin gewählt wird: Standard, Selten, Episch. Seltene Items bekommen einen
   dezenten Glanz-Rahmen, epische zusätzlich einen kurzen Schimmer
   (Animation). Der Effekt erscheint in Shop-Kachel *und* Hof-Szene.
3. **Rein visuell:** Keine Auswirkung auf XP, Münzen, Ranglisten oder
   Spielmechanik.

## User Stories

- Als **Azubi** möchte ich sehen, dass sich teure Items besonders anfühlen,
  damit sich langes Sparen sichtbar lohnt.
- Als **Azubi** möchte ich in jeder Kategorie genug Auswahl haben, damit ich
  nicht schon nach wenigen Wochen alles besitze.
- Als **Azubi** mit Bewegungsempfindlichkeit möchte ich, dass Animationen
  abgeschaltet sind, wenn mein Gerät „Bewegung reduzieren" meldet.
- Als **Admin** möchte ich die Seltenheit eines Items sehen und bei Bedarf
  überschreiben, damit der Effekt zu meiner Preisgestaltung passt.
- Als **Admin** möchte ich aus mindestens 8 Grafiken je Kategorie wählen
  können, damit ich den Katalog ohne Code-Änderung vergrößern kann.

## Acceptance Criteria

### Grafiken
- [ ] `SPED` und `TOUR` enthalten je mindestens 8 Illustrationen pro
      Kategorie; alle bestehenden Icon-Schlüssel bleiben unverändert gültig
- [ ] Neue Illustrationen folgen Palette und Stil aus `docs/DESIGN.md` und
      sind auf dunklem Hintergrund klar erkennbar

### Seltenheit & Effekt
- [ ] Jedes Item hat genau eine Seltenheit (Standard/Selten/Episch); bestehende
      Items erhalten durch die Migration einen sinnvollen Wert (kein Item ohne
      Seltenheit)
- [ ] Die Schwellen für die automatische Zuordnung sind dokumentiert und im
      Code zentral definiert (nicht verstreut)
- [ ] Der Admin sieht die Seltenheit in Liste und Formular und kann sie
      überschreiben; die Auswahl ist fest (kein Freitext) und serverseitig
      validiert
- [ ] Shop-Kachel und Hof-Szene zeigen den Effekt identisch; Standard-Items
      sehen unverändert aus (keine Regression zu PROJ-26)
- [ ] Der Effekt ist auch ohne Farbwahrnehmung erkennbar (z. B. zusätzlich
      Form/Label „Selten"/„Episch") und für Screenreader als Text vorhanden
- [ ] Bei `prefers-reduced-motion: reduce` laufen keine Animationen; der
      statische Rahmen bleibt
- [ ] Der Effekt verändert weder Preis, Kauf-Ablauf, Münzstand noch XP

### Leistung & Layout
- [ ] Die Hof-Szene mit 20 epischen Items bleibt flüssig scrollbar auf einem
      Mittelklasse-Smartphone (keine Dauer-Animation auf allen Items
      gleichzeitig, z. B. nur einmaliger Schimmer beim Erscheinen)
- [ ] Kein horizontaler Überlauf bei 320 px

## Edge Cases

- **Preis eines Items wird nachträglich geändert:** Die Seltenheit folgt dem
  *aktuellen* Wert (bzw. dem Admin-Override), nicht dem eingefrorenen
  Kaufpreis. Das ist bewusst und im Admin sichtbar.
- **Admin setzt die Seltenheit manuell, ändert danach den Preis:** Der
  manuelle Wert bleibt bestehen, bis er zurückgesetzt wird.
- **Gekauftes, später deaktiviertes Item:** bleibt samt Effekt in der Szene.
- **Gerät mit schwacher Leistung oder Energiesparmodus:** Animation darf
  entfallen, ohne dass das Item unvollständig wirkt.
- **Sehr viele epische Items in einer Zone:** Effekt bleibt dezent, die Zone
  wirkt nicht überladen.
- **Konto ohne Käufe:** Leerzustand unverändert.

## Technical Requirements (optional)
- Kosten: keine neuen laufenden Kosten
- Barrierefreiheit: Effekt nie ausschließlich über Farbe, Reduced-Motion
- Performance: CSS-Effekte statt JS-Animation, keine zusätzlichen Requests

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Kurzfassung
Zwei unabhängige Teile: **(1) mehr Grafiken** (reiner Inhalt im Code) und
**(2) Seltenheitsstufen mit Effekt** (ein neues optionales Feld, eine zentrale
Regel, ein wiederverwendbarer Rahmen). Beides wirkt in Shop *und* beiden
Hof-Szenen, ohne Preis-, Kauf- oder XP-Logik anzufassen.

### A) Bausteine (visueller Baum)

```
Zentrale Seltenheits-Regel                 (NEU, eine Stelle im Code)
+-- Schwellen: ab 100 = Selten, ab 250 = Episch  (Vorschlag, dort änderbar)
+-- "Wirksame Seltenheit" = Admin-Wahl, sonst aus aktuellem Preis abgeleitet

Seltenheits-Rahmen um die Item-Grafik      (NEU, wiederverwendbar)
+-- Standard: wie bisher, unverändert
+-- Selten:   Glanz-Rahmen + kleines Textlabel "Selten"
+-- Episch:   kräftigerer Rahmen + Label "Episch" + einmaliger Schimmer

Verwendet in:
+-- Shop-Kachel                            (bestehend)
+-- Hof-Item-Kachel für beide Szenen       (bestehend aus PROJ-31)
+-- Admin: Spalte "Seltenheit" in der Liste, Auswahl im Formular (bestehend, erweitert)

Grafik-Bibliothek
+-- Spedition: 5/7/5/5  ->  mind. 8 je Kategorie  (+10 Grafiken)
+-- Tourismus: 6/6/6/6  ->  mind. 8 je Kategorie  (+8 Grafiken)
```

### B) Daten (Klartext)
- **Ein neues, optionales Feld am Shop-Item: "Seltenheit manuell gesetzt"**
  (leer = automatisch aus dem Preis, sonst Standard/Selten/Episch).
- **Die wirksame Seltenheit wird nie gespeichert**, sondern bei Bedarf aus
  Preis + optionalem Admin-Wert berechnet. Dadurch folgt sie automatisch dem
  *aktuellen* Preis (Edge Case aus der Spec), und die Migration muss keine
  Bestandsitems umschreiben: Jedes Item hat sofort eine Seltenheit, ohne dass
  ein Wert eingetragen wird.
- Der Kaufpreis eines gekauften Exemplars (eingefroren) bleibt unberührt und
  hat mit der Seltenheit nichts zu tun.
- Die Shop-Schnittstelle liefert die fertig berechnete Seltenheit je Item mit
  (für Shop-Liste *und* "gekaufte Items"), damit Browser und Server nie
  unterschiedlich rechnen können.

### C) Technische Entscheidungen (Begründung)
1. **Ableiten statt speichern.** Weniger Daten, keine Migration der Altwerte,
   keine Inkonsistenz, wenn der Preis später geändert wird.
2. **Manuelles Überschreiben als einziges neues Feld.** Deckt "Admin möchte
   Seltenheit anpassen" ab, ohne die Preislogik zu berühren; die Auswahl ist
   fest (drei Werte, per Datenbank-Check abgesichert, serverseitig validiert).
3. **Eine zentrale Regel mit Schwellen im Code.** Eine Stelle zum Ändern; die
   Schwellen sind dokumentiert (Akzeptanzkriterium). Die Preise der aktuellen
   Kataloge (30 bis 300) ergeben damit eine sinnvolle Verteilung:
   Standard ≈ die Hälfte, Selten ≈ ein Drittel, Episch nur die teuersten.
4. **Effekt per CSS, nicht per Skript.** Läuft auf dem Grafikprozessor, kostet
   keine zusätzlichen Netzwerkanfragen und lässt sich per
   "Bewegung reduzieren" sauber abschalten.
5. **Schimmer nur einmal beim Erscheinen**, keine Dauer-Animation: schont
   Akku und Leistung, auch bei 20 epischen Items in einer Szene.
6. **Nie nur Farbe:** Stufe zusätzlich als Textlabel und als Text in der
   Screenreader-Liste ("... — Episch").
7. **Ein Rahmen-Baustein für alle Stellen.** Shop und beide Szenen sehen
   dadurch garantiert gleich aus; die in PROJ-31 vorbereitete Item-Kachel
   nimmt ihn einfach auf.
8. **Keine Änderung an Rechten, Login, Münzen, XP, Kauf-Ablauf.**

### D) Was sich an Bestehendem ändert
| Bereich | Änderung |
|---------|----------|
| Datenbank | 1 neues optionales Feld am Shop-Item mit Wertebegrenzung |
| Shop-Schnittstelle (Liste, gekaufte Items) | liefert zusätzlich die berechnete Seltenheit |
| Admin-Schnittstellen (anlegen/ändern) | nehmen die optionale manuelle Seltenheit an und prüfen sie |
| Admin-Oberfläche | Spalte in der Liste, Auswahl "Automatisch / Standard / Selten / Episch" im Formular |
| Shop-Kachel und Hof-Item-Kachel | nutzen den Seltenheits-Rahmen |
| Screenreader-Liste der Galerie | hängt die Stufe an, wenn nicht "Standard" |
| Grafik-Bibliothek | +10 Spedition, +8 Tourismus |

### E) Reihenfolge der Umsetzung (Vorschlag)
1. Zentrale Seltenheits-Regel mit Tests (Schwellen, Override, Ränder)
2. Feld + Schnittstellen + Validierung mit Tests
3. Rahmen-Baustein, Einbau in Shop und beide Szenen, Admin-Anzeige
4. Neue Grafiken (Spedition +10, Tourismus +8) mit Tests
5. Regressionstest: Standard-Items sehen aus und verhalten sich wie vorher

### F) Abhängigkeiten (Pakete)
Keine neuen Pakete.

### G) Risiken & Hinweise
- **Schwellen sind eine Produktentscheidung:** 100/250 ist ein Vorschlag; die
  Lehrkraft kann einzelne Items per Override anpassen.
- **Gestaltungsaufwand** für 18 weitere Grafiken ist der größte Posten.
- **Visuelle Abnahme von Hand nötig** (kein Browser-Test auf diesem Rechner).
- **Reihenfolge der Tabelle "Seltenheit" im Admin** darf bestehende Spalten
  nicht verdrängen (Layout auf schmalen Bildschirmen prüfen).

## Implementation Notes (Frontend/Backend, 2026-10-09)
- **Regel:** `src/lib/hof-rarity.ts` — Schwellen zentral (`RARITY_THRESHOLDS`: ab 100 Selten, ab 250 Episch), `getEffectiveRarity(price, override)`: Admin-Wert vor Preis. Die wirksame Stufe wird nie gespeichert.
- **Datenbank:** Migration `20261009_proj32_seltenheit.sql` (+ `_down`): optionales Feld `shop_items.rarity_override` mit CHECK (standard/selten/episch). Bestehende Items brauchen keinen Wert (kein Backfill). **Noch nicht in der Produktions-DB angewendet** – muss VOR dem Code-Deploy laufen, weil die Schnittstellen die Spalte lesen.
- **Schnittstellen:** `GET /api/shop/items` liefert `rarity` je Item und je gekauftem Item (aus dem *aktuellen* Preis, nicht dem Kaufpreis); Rohwert und Preis der gekauften Items gehen nicht raus. Admin-GET liefert `rarity` + `rarity_override`; POST/PATCH nehmen `rarity_override` (Enum oder `null` = automatisch) an und validieren serverseitig.
- **Darstellung:** `hof-rarity-frame.tsx` (`HofRarityFrame`, `HofRarityLabel`) in Shop-Kachel und der gemeinsamen Hof-Item-Kachel (beide Szenen). Selten: Glanz-Ring + Label; Episch: kräftiger Ring + Label + einmaliger Schimmer (CSS in `globals.css`, entfällt bei `prefers-reduced-motion`). Standard unverändert. Screenreader-Liste ergänzt „— Selten/Episch".
- **Admin:** Spalte „Seltenheit" (mit „(manuell)"-Hinweis) und Auswahl „Automatisch (…)/Standard/Selten/Episch" im Formular.
- **Grafiken:** Spedition 21 → 31 (+10), Tourismus 24 → 32 (+8); jetzt mind. 8 je Kategorie in beiden Sets, alle bisherigen Schlüssel unverändert.
- Keine Änderung an Münzen, XP, Kauf-Ablauf, Rechten oder Login.

## QA Test Results
**Stand 2026-10-09 – automatisierte Prüfung, visuelle Abnahme steht aus**

- 743 Tests grün (neu: Regel inkl. Ränder/Override/Preisänderung, Schnittstellen inkl. „folgt aktuellem Preis" und „Rohwert nicht ausgeliefert", Admin-Validierung, Rahmen/Label/Kachel/beide Szenen, Mindestanzahl und Eindeutigkeit der Grafiken, Gültigkeit aller Alt-Schlüssel). `tsc` und Lint ohne Fehler.
- Verteilung der aktuellen Kataloge: Spedition 30–250 Münzen, Tourismus 30–300 → 6 Standard / 4 Selten / 2 Episch (Spedition), 5 / 3 / 2 (Tourismus) bei automatischer Zuordnung.
- **Nicht geprüft (kein Browser):** Optik von Ring, Glanz und Schimmer, Lesbarkeit der Labels, 320-px-Layout inkl. Admin-Tabelle mit der neuen Spalte, die 18 neuen Grafiken.
- Performance-AC „20 epische Items": Schimmer läuft nur einmal (1 Durchlauf) und nur per CSS; echte Messung am Gerät steht aus.

## Deployment
_To be added by /deploy_
