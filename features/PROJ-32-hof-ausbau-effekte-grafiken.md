# PROJ-32: Hof-Ausbau – Effekte für teure Items & mehr Grafiken

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
