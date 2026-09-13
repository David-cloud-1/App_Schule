# PROJ-20: Speditionshof & Shop

## Status: Architected
**Created:** 2026-09-13
**Last Updated:** 2026-09-13
**Priorität:** P0

## Dependencies
- **Requires:** PROJ-1 (User Authentication) — Sammlung und Kauf hängen am Konto
- **Requires:** PROJ-19 (Blitzrunde & Frachtmünzen) — der Münzstand ist die Währung
  dieses Shops; ohne PROJ-19 gibt es nichts auszugeben
- **Requires:** PROJ-9 (Admin Content Management Panel) — die Katalog-Pflege
  entsteht als neuer Bereich im bestehenden Admin-Panel
- **Gehört zu:** PROJ-19. Beide gehen gemeinsam live — PROJ-19 allein liefert eine
  Währung ohne Zweck, PROJ-20 allein hätte keine Einnahmequelle.

## Problem

PROJ-19 führt Frachtmünzen als Rückkehr-Anreiz ein (täglicher Bonus für die
Blitzrunde, Startguthaben aus bisherigem Lernfortschritt). Ohne eine Möglichkeit,
diese Münzen auszugeben, ist der Münzstand nur eine zweite, bedeutungslose Zahl
neben der XP-Anzeige — er motiviert nicht zur Rückkehr, wenn er zu nichts führt.

## Lösung

Ein Shop ("Speditionshof") mit rein kosmetischen Sammelstücken, die einmalig
gegen Frachtmünzen gekauft werden und danach dauerhaft in einer eigenen Sammlung
("Mein Hof") im Profil zu sehen sind — nach demselben Prinzip wie die bestehende
Badge-Galerie (PROJ-7), aber gekauft statt erspielt.

**Scope-Entscheidungen (mit dem Nutzer abgestimmt, 2026-09-13):**
1. **Nur Kosmetik**, keine funktionalen Vorteile (kein Streak-Freeze-Kauf o. Ä.)
   — verändert kein Spielverhalten, kein Balancing-Risiko.
2. **Einmalige Sammelstücke**, kein Verbrauch — ein Item gehört nach dem Kauf
   dauerhaft zum Konto, wie ein Badge.
3. **Katalog wird im Admin-Panel gepflegt**, nicht im Code fest hinterlegt —
   der Admin kann Items ohne Deploy anlegen, ändern und deaktivieren.
4. **Nur private Sichtbarkeit** — Items erscheinen ausschließlich in der
   eigenen Sammlung im Profil, nicht auf der Rangliste (PROJ-8) oder anderswo
   öffentlich. Keine Änderung an bestehenden Leaderboard-Komponenten nötig.
5. **Keine Bild-Uploads oder Bild-KI** — Items bestehen aus Emoji-Icon + Name +
   Beschreibung, genau wie die bestehenden `BADGE_DEFINITIONS`. Das hält das
   Feature kostenfrei und konsistent mit dem bestehenden Design.

## User Stories

- Als **Azubi** möchte ich meine gesammelten Frachtmünzen gegen Sammelstücke für
  meinen Speditionshof eintauschen, damit sich das Sammeln von Münzen lohnt.
- Als **Azubi** möchte ich vor dem Kauf sehen, was ein Item kostet und ob ich es
  mir leisten kann, damit ich nicht überrascht werde.
- Als **Azubi** möchte ich ein bereits gekauftes Item nicht versehentlich doppelt
  kaufen können.
- Als **Azubi** möchte ich meine gekauften Items in einer eigenen Sammlung
  ansehen können, damit sich der Kauf sichtbar auszahlt.
- Als **Admin** möchte ich neue Items mit Name, Beschreibung, Icon und Preis
  anlegen können, ohne Code zu ändern, damit der Hof mit der Zeit wächst.
- Als **Admin** möchte ich ein Item deaktivieren können, ohne es zu löschen,
  damit bereits gekaufte Items in den Sammlungen der Nutzer erhalten bleiben.

## Acceptance Criteria

### Shop-Ansicht
- [ ] Eine neue Seite "Speditionshof" zeigt alle aktiven Items als Kacheln mit
      Icon, Name, Beschreibung und Preis
- [ ] Der aktuelle Münzstand ist auf der Shop-Seite jederzeit sichtbar
- [ ] Bereits gekaufte Items sind deutlich als "im Besitz" markiert und nicht
      erneut kaufbar
- [ ] Items, die sich der Nutzer aktuell nicht leisten kann, bleiben sichtbar,
      aber der Kauf-Button ist deaktiviert und zeigt, wie viele Münzen fehlen

### Kauf
- [ ] Ein Kauf zieht den Preis vom Münzstand ab und schreibt das Item der
      Sammlung in einem einzigen, nicht unterbrechbaren Schritt gut — es darf
      keinen Zwischenzustand geben, in dem Münzen abgezogen, aber kein Item
      gutgeschrieben ist
- [ ] Der Server prüft vor jedem Kauf erneut, ob der Münzstand ausreicht — die
      Anzeige im Browser ist keine verlässliche Grundlage
- [ ] Derselbe Artikel kann von einem Nutzer nicht zweimal gekauft werden
- [ ] Zwei gleichzeitige Kaufversuche (Doppeltipp, zwei geöffnete Tabs) belasten
      den Münzstand nicht doppelt und schreiben das Item nicht doppelt gut
- [ ] Nach einem erfolgreichen Kauf zeigt eine kurze Bestätigung das neue Item
      (vergleichbares Muster wie die bestehende Badge-Freischaltung)

### Sammlung ("Mein Hof")
- [ ] Eine neue Sektion im Profil zeigt alle bisher gekauften Items
- [ ] Ein Konto ohne Käufe zeigt einen einladenden Hinweis statt einer leeren
      Fläche

### Admin-Verwaltung
- [ ] Der Admin kann im bestehenden Admin-Bereich Items anlegen: Name,
      Beschreibung, Emoji-Icon, Preis in Frachtmünzen
- [ ] Der Admin kann ein bestehendes Item bearbeiten (Name, Beschreibung, Preis,
      Icon)
- [ ] Der Admin kann ein Item deaktivieren; es verschwindet danach aus dem Shop,
      bleibt aber in der Sammlung bereits kaufender Nutzer unverändert sichtbar
- [ ] Ein Item, das schon mindestens einmal gekauft wurde, kann nur deaktiviert,
      nicht gelöscht werden — das verhindert verwaiste Einträge in Sammlungen
- [ ] Eine nachträgliche Preisänderung wirkt nur auf künftige Käufe; bereits
      gekaufte Items in bestehenden Sammlungen bleiben davon unberührt

## Edge Cases

- **Der Admin ändert den Preis, während ein Nutzer die Shop-Seite offen hat.**
  Maßgeblich ist der Preis zum Zeitpunkt des Kaufs auf dem Server, nicht der
  beim Laden der Seite angezeigte.
- **Der Admin deaktiviert ein Item, während ein Kauf unterwegs ist.** Der Kauf
  wird abgelehnt mit einer klaren Meldung, kein stiller Fehler und kein
  Münzabzug ohne Gegenwert.
- **Der Nutzer hat exakt den Preis als Münzstand.** Der Kauf muss möglich sein
  (Guthaben ≥ Preis, nicht >).
- **Startguthaben aus PROJ-19 reicht für den ersten Kauf.** PROJ-19 kalkuliert
  das Startguthaben bewusst knapp über einem Referenzpreis von 75 Münzen —
  mindestens ein Item im Ausgangskatalog muss zu diesem Preis verfügbar sein,
  sonst geht die Rechnung aus PROJ-19 nicht auf.
- **Sehr viele Items im Katalog.** Die Shop-Seite muss auch bei wachsendem
  Katalog mobile-tauglich bleiben (Scroll, keine feste Kachel-Anzahl).
- **Ein Nutzer ohne einzigen Kauf** sieht in "Mein Hof" einen einladenden
  Leerzustand statt einer leeren Fläche.
- **Sehr geringer Münzstand (0 oder wenig).** Alle Items bleiben sichtbar,
  keines ist versteckt — Sichtbarkeit motiviert weiter zu sammeln, auch wenn
  aktuell nichts kaufbar ist.

## Technical Requirements

- **Sicherheit:** Kauf-Logik ausschließlich serverseitig; Münzstand-Änderungen
  laufen über denselben geschützten Weg wie in PROJ-19; RLS auf allen neuen
  Tabellen analog zu bestehenden Mustern (z. B. `user_badges`).
- **Kostenrahmen:** keine Bild-Uploads, kein externer Bild-Dienst, keine
  Bild-KI — Items bestehen aus Emoji + Text, wie `BADGE_DEFINITIONS`. Bleibt
  vollständig innerhalb von Supabase Free Tier und Vercel Hobby.
- **Mobile-First:** Kacheln und Kauf-Buttons mindestens 44 px, bedienbar mit
  dem Daumen (siehe `docs/DESIGN.md`).
- **Barrierefreiheit:** "nicht leistbar" und "im Besitz" dürfen sich nicht nur
  über Farbe unterscheiden (zusätzlich Text/Symbol).
- **Datenmenge:** ein Katalog-Eintrag pro Item, ein Besitz-Eintrag pro Kauf —
  im Free Tier vernachlässigbar, selbst bei mehreren hundert Nutzern.

## Offene Punkte für /architecture

- Wie wird der "einmalige, nicht unterbrechbare" Kauf-Schritt (Münzabzug +
  Gutschrift zusammen) technisch abgesichert? PROJ-19 hat für den Münzstand
  bewusst kein Buchungsjournal angelegt — hier ist zu klären, ob der Kauf-Pfad
  eines braucht oder mit dem einfachen Feld auskommt.
- Genaue Ablage des Katalogs und der Besitz-Zuordnung (zwei Tabellen analog zu
  `badges` / `user_badges`, oder anders).
- Wie fügt sich die Admin-Verwaltung in den bestehenden Admin-Bereich ein
  (eigener Tab analog zu Fragen/Themen/Fächern)?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

**Neue Shop-Seite** (eigene Route, von der Startseite aus erreichbar):
```
Speditionshof-Seite (neu)
+-- Münzstand-Anzeige (wiederverwendet aus PROJ-19)
+-- Item-Kacheln (Raster, mobile-first)
    +-- Zustand "kaufbar": Icon, Name, Beschreibung, Preis, aktiver Kauf-Button
    +-- Zustand "im Besitz": Icon, Name, Beschreibung, Markierung „Im Besitz"
    +-- Zustand "nicht leistbar": wie kaufbar, aber Button deaktiviert +
        Hinweis „Dir fehlen X Münzen"
+-- Kauf-Bestätigung (kurzes Overlay, gleiches Muster wie die bestehende
    Badge-Freischaltung)
```

**Profil-Seite** (`profile/page.tsx`) — neue Sektion neben Badge-Galerie und
Privatsphäre-Einstellungen:
```
Profil (bestehend: Kopf, XP, Badge-Galerie, Privatsphäre)
+-- NEU: „Mein Hof" — Galerie der gekauften Items, gleiches Kachel-Muster wie
    die bestehende Badge-Galerie; leer → einladender Hinweis statt Leerfläche
```

**Admin-Bereich** — neuer Tab neben Fragen/Fächer/Themen/Nutzer, nach demselben
Muster wie die bestehende Fächer- und Themen-Verwaltung:
```
Admin-Navigation (bestehend, + 1 neuer Tab „Hof-Items")
+-- Item-Liste (Tabelle: Icon, Name, Preis, Status aktiv/inaktiv, Anzahl Käufe)
+-- Anlegen/Bearbeiten-Formular (gleiches Modal-Muster wie
    subject-form-modal.tsx): Name, Beschreibung, Emoji, Preis
+-- Deaktivieren-Aktion statt Löschen, sobald ein Item mind. 1 Kauf hat
```

### B) Datenmodell (in normaler Sprache)

Folgt exakt dem bereits im Projekt etablierten Muster von „Badges" +
„gehörte Badges" (PROJ-7) — hier nur gekauft statt erspielt:

- **Katalog „Hof-Items"** (neue Tabelle, vom Admin gepflegt): Name,
  Beschreibung, Emoji-Icon, Preis in Frachtmünzen, „aktiv?"-Kennzeichen
  (dasselbe Muster wie das bestehende `is_active` auf Fragen), Sortierung.
  Ein deaktiviertes Item verschwindet aus dem Shop, bleibt aber als Datensatz
  bestehen — nichts wird gelöscht, solange ein Kauf existiert.
- **„Gehörte Hof-Items"** (neue Tabelle, eine Zeile pro Kauf): welcher Nutzer,
  welches Item, gekauft am, **bezahlter Preis zum Kaufzeitpunkt**. Der
  gespeicherte Preis macht spätere Preisänderungen des Admins folgenlos für
  bereits erfolgte Käufe — genau die in der Spec geforderte Eigenschaft.
- **Kein neues Feld für den Münzstand nötig** — das existiert bereits als Teil
  von PROJ-19 und wird hier nur gelesen und verringert.

### C) Tech-Entscheidungen (Begründung)

- **Zwei-Tabellen-Muster wie bei Badges, nicht neu erfunden:** Der Kauf-Fall
  ist strukturell identisch zum Freischalt-Fall bei Badges (ein Katalog, eine
  Besitz-Zuordnung pro Nutzer) — dieselbe, bereits bewährte Struktur
  wiederzuverwenden ist weniger riskant als ein neues Muster einzuführen.
- **Bezahlter Preis wird pro Kauf mitgespeichert, nicht nur der aktuelle
  Katalogpreis referenziert:** Andernfalls würde eine spätere Preisänderung
  rückwirkend so aussehen, als hätte ein Nutzer früher einen anderen Preis
  gezahlt — die Spec verlangt ausdrücklich, dass bestehende Käufe unberührt
  bleiben.
- **Der Kauf-Schritt (Münzabzug + Gutschrift) läuft als eine einzige,
  serverseitige Operation, die entweder ganz oder gar nicht durchgeht:**
  Das beantwortet den offenen Punkt aus der Spec zum „nicht unterbrechbaren"
  Kauf. Ein separates Buchungsjournal für den Münzstand selbst (wie in PROJ-19
  zurückgestellt) ist dafür nicht nötig — die neue „Gehörte Hof-Items"-Tabelle
  übernimmt effektiv schon die Nachvollziehbarkeits-Rolle für diese eine
  Ausgabenart (jeder Kauf ist durch seine eigene Zeile ohnehin belegt).
- **Doppelkauf und Doppeltipp werden über eine Eindeutigkeits-Regel
  verhindert, nicht über Sperren im Client:** Die Kombination aus Nutzer und
  Item darf in der Besitz-Tabelle nur einmal vorkommen — ein zweiter
  gleichzeitiger Versuch scheitert an dieser Regel, statt sich auf Timing im
  Browser zu verlassen (dieselbe Art von Schutz, die PROJ-19 für die
  Blitzrunden-Tagessperre nutzt).
- **Admin-Verwaltung als eigener Tab nach bestehendem Muster, kein neues
  UI-Konzept:** Fächer- und Themen-Verwaltung existieren bereits mit
  Anlegen/Bearbeiten/Modal — der neue „Hof-Items"-Tab wiederholt dieses
  Muster, was den Lernaufwand für den Admin gering hält.
- **Löschen bewusst nicht möglich, sobald ein Kauf existiert:** Sonst
  entstünden Besitz-Einträge, die auf ein nicht mehr existierendes Item
  zeigen — Deaktivieren erreicht dasselbe Ziel (aus dem Shop verschwinden)
  ohne dieses Risiko.

### D) Abhängigkeiten (neue Pakete)

Keine. Shop-Kacheln, Admin-Formular und Kauf-Bestätigung entstehen aus
vorhandenen shadcn/ui-Bausteinen und dem bereits genutzten Emoji-Icon-Muster
der Badges — keine neuen Bibliotheken, keine Bild-Assets.

### Offene Punkte aus der Spec — hier beantwortet

- **Absicherung des „nicht unterbrechbaren" Kaufs:** eine einzige serverseitige
  Operation, kein separates Journal nötig (siehe oben).
- **Ablage von Katalog und Besitz:** zwei Tabellen nach dem Badges-Muster
  (siehe „Datenmodell").
- **Einbindung ins Admin-Panel:** neuer Tab „Hof-Items", gleiches
  Formular-Muster wie Fächer/Themen (siehe „Komponenten-Struktur").

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
