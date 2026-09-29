# PROJ-22: Fachbereich als Datenbasis

## Status: Architected
**Created:** 2026-09-29
**Last Updated:** 2026-09-29

## Dependencies
- Requires: PROJ-2 (Subject & Question Structure) — Fächer werden einem Fachbereich zugeordnet
- Requires: PROJ-7 (Achievements & Badges) — Fach-Badges werden datengetrieben
- Requires: PROJ-9 / PROJ-10 (Admin, KI-Fragengenerierung) — Prompt-Baukasten, Import
- Requires: PROJ-11 / PROJ-15 (Prüfungssimulation, Prüfungssets) — Prüfungsteile aus der Datenbank
- Requires: PROJ-19 / PROJ-20 (Frachtmünzen, Speditionshof) — Münz- und Hof-Name je Bereich
- Requires: PROJ-21 (Benotete Leistungsnachweise) — Nachweise gehören zu einem Bereich
- Grundlage für: PROJ-23 (Zuordnung der Azubis), PROJ-24 (Bereichs-Admins & Rechtetrennung), PROJ-25 (Tourismus anlegen)

## Summary
Die App soll künftig mehrere Fachbereiche bedienen — zuerst Spedition (SpediLern) und Tourismus (TouristikLern). Heute stehen Fächer, Prüfungsaufbau, Badges, Prompt, App-Name, Münz- und Hof-Name sowie Pseudonym-Wörter fest auf Spedition im Code.

Dieses Feature macht daraus **Daten eines Fachbereichs**. Es wird genau ein Fachbereich angelegt — Spedition — und mit den heutigen Werten befüllt. **Für Azubis und für den Admin ändert sich sichtbar nichts.** Erst dadurch können die Folge-Features einen zweiten Bereich hinzufügen, ohne den Code zu kopieren.

Gesamtplan und alle Entscheidungen (E1–E9): [docs/plans/mehrere-fachbereiche.md](../docs/plans/mehrere-fachbereiche.md).

## User Stories
- Als **Azubi der Spedition** möchte ich, dass die App nach dem Umbau genau so aussieht und funktioniert wie vorher, damit ich ohne Unterbrechung weiterlernen kann und meine XP, Streaks, Badges und Münzen erhalten bleiben.
- Als **Super-Admin** möchte ich, dass alles, was einen Fachbereich ausmacht (Fächer, Prüfungsteile, Badges, Namen, Prompt-Rolle, Zielgruppe), an einer Stelle in der Datenbank steht, damit ein zweiter Bereich später ohne Code-Kopie angelegt werden kann.
- Als **Admin** möchte ich, dass der kopierbare Fragen-Prompt seine Fächerliste aus den angelegten Fächern bezieht, damit ein neues Fach sofort im Prompt steht und der Import es akzeptiert.
- Als **Admin** möchte ich, dass Fachkürzel nur innerhalb eines Bereichs eindeutig sein müssen, damit ein späterer Bereich dieselben Kürzel (z. B. `KSK`) verwenden kann, ohne dass Fragen im falschen Bereich landen.
- Als **Besucher der Login-Seite** möchte ich Name und Icon der App sehen, die zu der Adresse gehört, die ich aufgerufen habe, damit ich sicher bin, in der richtigen App zu sein.
- Als **Super-Admin** möchte ich, dass die Prüfungssimulation Teile, Fächer, Fragenzahl und Dauer aus der Datenbank liest, damit ein Bereich mit anderem Prüfungsaufbau ohne Code-Änderung abbildbar ist.

## Acceptance Criteria

### Fachbereich als Datensatz
- [ ] Es gibt einen Fachbereich **Spedition** mit: Name, App-Name „SpediLern", Untertitel, Icon (LKW), Münz-Name „Frachtmünzen", Hof-Name „Speditionshof", Prompt-Rolle, Zielgruppe „angehende Speditionskaufleute", Klassenstufen 10/11/12, Pseudonym-Nomen (heutige Liste), Adresse `spedilern.vercel.app`, Kurzname `spedition`.
- [ ] Alle 5 bestehenden Fächer, alle Prüfungsteile, alle Prüfungssets, alle Leistungsnachweise, alle Shop-Artikel und alle Profile sind dem Bereich Spedition zugeordnet.
- [ ] Jedes Fach, jeder Prüfungsteil, jedes Prüfungsset, jeder Leistungsnachweis und jeder Shop-Artikel **muss** einem Bereich zugeordnet sein (kein Anlegen ohne Bereich möglich).
- [ ] Neue Profile, die nach dem Deploy entstehen, werden automatisch dem Bereich Spedition zugeordnet (bis PROJ-23 die Zuordnung über die Adresse einführt).
- [ ] Admin-Aktionen im Audit-Log tragen den Bereich des betroffenen Objekts (für spätere Filterung in PROJ-24).

### Kein Speditions-Wert mehr fest im Code
- [ ] Im Anwendungscode (`src/`, außer Tests und Migrationen) kommen die Fachkürzel `BGP`, `KSK`, `STG`, `LOP`, `PUG` sowie die Begriffe „SpediLern", „Frachtmünzen", „Speditionshof" und „Speditionskaufleute" nicht mehr als feste Werte vor.
- [ ] Farben, Icons und Beschreibungen der Fächer kommen ausschließlich aus den Fach-Daten.
- [ ] App-Name, Untertitel und Icon auf allen Seiten (inkl. Login, Registrierung, Passwort vergessen/zurücksetzen, Ladeanzeige, Admin-Kopf) kommen aus dem Fachbereich.
- [ ] Münz- und Hof-Name in Shop, Blitzrunde, Quiz-Ergebnis, Startguthaben-Banner, Hof-Galerie und Admin-Shop kommen aus dem Fachbereich.

### Auftritt nach Adresse
- [ ] Die App ermittelt anhand der aufgerufenen Adresse, welcher Bereich gemeint ist, und zeigt vor dem Login dessen Namen, Icon und Browser-Tab-Titel.
- [ ] Nach dem Login gilt immer der Bereich aus dem Profil, nicht die Adresse.
- [ ] Unbekannte Adressen (z. B. Vercel-Vorschau-URLs, `localhost`, `touristiklern.vercel.app` solange kein Bereich Tourismus existiert) zeigen den Auftritt von Spedition.

### Prüfungsaufbau aus der Datenbank
- [ ] Die Prüfungsteile von Spedition sind als Daten hinterlegt: Teil 1 „Leistungserstellung in Spedition und Logistik" (STG + LOP, 20 Fragen, 90 Min.), Teil 2 „Kaufmännische Steuerung und Kontrolle" (KSK, 15 Fragen, 90 Min.), Teil 3 „Wirtschafts- und Sozialkunde" (BGP, 15 Fragen, 45 Min.) — jeweils mit heutiger Bezeichnung und Untertitel.
- [ ] Prüfungssimulation (Startseite, Sitzung, Ergebnis), Prüfungssets im Admin und das Anlegen von Leistungsnachweisen lesen Teile, zugehörige Fächer, Fragenzahl und Dauer aus diesen Daten.
- [ ] Die Anzahl der Teile ist nicht mehr auf 3 festgelegt; ein Bereich kann mehr oder weniger Teile haben.

### Badges datengetrieben
- [ ] Die Fach-Experten-Badges (BGP-, KSK-, STG-, LOP-Experte) sind Datensätze, die auf ein Fach und eine Schwelle (100 richtige Antworten) verweisen; ihre IDs bleiben unverändert.
- [ ] Für den Badge „Allrounder" zählen **alle aktiven Fächer des Bereichs** — für Spedition also neu auch **PUG** (bisher nur BGP, KSK, STG, LOP). Schwelle unverändert 10 richtige Antworten je Fach. *Bewusste Änderung auf Wunsch des Nutzers (2026-09-29); betrifft heute niemanden negativ: Beide Azubis, die die alte Bedingung erfüllen, haben auch in PUG ≥ 10.*
- [ ] Kein Azubi verliert einen bereits verdienten Badge; abgesehen von der Allrounder-Regel ergibt die neue Berechnung für jeden Azubi dieselben Badges wie die alte (Vergleich über alle Bestandsprofile).

### Fachkürzel je Bereich
- [ ] Ein Fachkürzel ist nur innerhalb eines Bereichs eindeutig; zwei Bereiche dürfen dasselbe Kürzel haben.
- [ ] Überall, wo ein Fach über sein Kürzel gesucht wird (Fragen-Import JSON und CSV, Prüfungsset-Import und -Extraktion, Fragenfilter und -Export im Admin, Fragen-API, Fach anlegen/umbenennen, KI-Upload-Pfad), wird es im richtigen Bereich gesucht.
- [ ] Ein Import-Kürzel, das im Zielbereich nicht existiert, wird zeilengenau abgelehnt mit Angabe der erlaubten Kürzel dieses Bereichs.
- [ ] Die fest eingetragenen Kürzellisten in den Entwurfs-Routen des KI-Upload-Pfads entfallen; erlaubt sind die Fächer des Bereichs.

### Prompt-Baukasten
- [ ] Der kopierbare Fragen-Prompt im Admin (`/admin/ai-generator`) wird aus Bereichsdaten zusammengesetzt: Rolle, Fächerliste (aktive Fächer mit Kürzel und Name), Klassenstufen, Qualitätsregeln mit Zielgruppe, optionale Zusatzhinweise, JSON-Format.
- [ ] Für Spedition ist der erzeugte Prompt inhaltlich identisch mit dem heutigen (Rolle, alle 5 Fächer inkl. PUG, Regeln, Qualitätsregeln, Format); Abweichungen nur in Leerzeichen/Zeilenumbrüchen.
- [ ] Wird ein Fach deaktiviert oder neu angelegt, erscheint die Änderung beim nächsten Öffnen der Seite im Prompt.
- [ ] Der bezahlte Upload-Pfad und der Korrekturauftrag (`buildFixPrompt`) verwenden dieselbe Rolle und Zielgruppe wie der kopierte Prompt.
- [ ] Die Qualitätsregeln selbst (Torwächter) bleiben unverändert und für alle Bereiche gleich; nur die Zielgruppe wird eingesetzt. Beispiele mit Speditionsvokabular in den Regeln werden fachneutral formuliert.

### Pseudonyme
- [ ] Pseudonyme werden aus gemeinsamen Adjektiven und den Nomen des Bereichs gebildet; für Spedition ergibt sich dieselbe Wortauswahl wie heute.
- [ ] Bestehende Pseudonyme bleiben unverändert.

### Unveränderter Betrieb
- [ ] `npm run build`, `npm run lint` und `npm test` laufen fehlerfrei.
- [ ] XP, Level, Streaks, Münzstände, gekaufte Hof-Gegenstände, Badges, Quiz- und Prüfungshistorie aller Bestandsnutzer sind nach dem Deploy unverändert (Stichprobe per DB vor/nach).
- [ ] Rangliste, Blitzrunde, Lücken schließen, Prüfungssimulation und Leistungsnachweise liefern für Spedition dieselben Ergebnisse wie vorher.

## Edge Cases
- **Neues Profil während der Umstellung:** Registriert sich jemand zwischen Datenbank-Migration und Code-Deploy, wird er trotzdem Spedition zugeordnet (Standardwert/Trigger, nicht nur Code).
- **Fach ohne Bereich:** Das Anlegen eines Fachs ohne Bereich wird abgelehnt; der Admin wählt den Bereich nicht aus (es gibt nur einen), er wird automatisch gesetzt.
- **Gleiches Kürzel in zwei Bereichen:** Ein Import mit `KSK` landet ausschließlich im Fach des Zielbereichs — muss per Test mit zwei Bereichen, die beide `KSK` haben, belegt werden.
- **Groß-/Kleinschreibung:** `ksk` und `KSK` gelten weiterhin als dasselbe Kürzel (heutiges Verhalten).
- **Prüfungsteil ohne aktive Fragen:** Verhalten wie heute (Teil ist nicht startbar bzw. Meldung wie bisher) — keine neue Fehlerquelle durch die Umstellung.
- **Prüfungsset mit Teil-Nummer, die es im Bereich nicht gibt:** Wird im Admin sichtbar als ungültig markiert statt stillschweigend ignoriert.
- **Neues Fach im Bereich:** Wird ein Fach aktiviert oder neu angelegt, zählt es ab sofort für den Allrounder; wer den Badge schon hat, behält ihn.
- **Badge-Schwelle geändert:** Bereits verdiente Badges bleiben erhalten, auch wenn eine Schwelle später erhöht wird.
- **Unbekannte Adresse:** Vorschau-URLs und lokale Tests funktionieren weiter und zeigen Spedition.
- **Fach deaktiviert:** Verschwindet aus dem Prompt und aus der Liste erlaubter Import-Kürzel; bestehende Fragen bleiben erhalten (heutiges Verhalten).
- **Leerer Pseudonym-Wortschatz:** Hat ein Bereich keine Nomen hinterlegt, wird auf eine neutrale Standardliste zurückgegriffen statt einen Fehler zu werfen.

## Nicht Teil dieses Features
- Zweiter Fachbereich Tourismus und seine Inhalte → PROJ-25
- Zuordnung neuer Azubis über die Adresse, Auswahlseite, Filter der Lernwege nach Bereich (Rangliste, Blitzrunde, Fächer …) → PROJ-23
- Rolle Bereichs-Admin, RLS-Umstellung, Bereichs-Umschalter und Einstellungsseite im Admin → PROJ-24
- Bearbeiten der Bereichsdaten über eine Oberfläche (in diesem Feature nur per Migration/SQL)
- Anpassung der Audit- und Engagement-Skripte sowie der Agenten → PROJ-25

## Technical Requirements
- **Kosten:** kein zusätzlicher Dienst, kein API-Verbrauch; der Prompt bleibt „kopieren → externe KI → JSON einfügen".
- **Reihenfolge der Auslieferung:** erst Datenbank-Erweiterung + Befüllung, dann Code, zuletzt Pflichtfelder/Eindeutigkeit verschärfen — jede Datenbank-Änderung mit Rückweg.
- **Tests:** ohne Dev-Server und Playwright; Nachweis über Build, Vitest und SQL-Vergleiche (Prompt-Text vorher/nachher, Badges vorher/nachher, Prüfungsteile vorher/nachher).
- **Performance:** Bereichsdaten werden pro Anfrage höchstens einmal geladen; keine spürbar längeren Ladezeiten auf Start-, Quiz- und Prüfungsseite.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Reiner Umbau „unter der Haube": Es entsteht **eine neue Datenquelle** (der Fachbereich) und **eine Handvoll zentraler Bausteine**, die diese Daten an alle Stellen verteilen, die heute Speditions-Werte fest eingebaut haben. Neue Seiten oder Knöpfe gibt es nicht. Backend (Datenbank) **und** Frontend sind betroffen.

### A) Neue zentrale Bausteine

```
Fachbereich (Datenbank)
│
├── Bereichs-Lader (Server)
│   ├── ermittelt den Bereich: eingeloggt → aus dem Profil,
│   │   sonst → aus der aufgerufenen Adresse, unbekannt → Spedition
│   ├── lädt Bereich + aktive Fächer + Prüfungsteile einmal pro Seitenaufruf
│   └── liefert Browser-Tab-Titel und Beschreibung (Metadaten)
│
├── Bereichs-Kontext (Browser)
│   └── stellt App-Name, Icon, Münz-Name, Hof-Name, Fachfarben
│       allen Bildschirm-Bausteinen bereit (Login, Shop, Blitzrunde, Quiz …)
│
├── Fach-Auflöser
│   └── „Kürzel + Bereich → Fach"; einzige Stelle, die Fächer über Kürzel sucht
│
├── Prompt-Baukasten
│   ├── Fragen-Prompt (kopierbar + bezahlter Upload-Pfad)
│   ├── Qualitätsregeln mit eingesetzter Zielgruppe
│   └── Korrekturauftrag
│
├── Prüfungsaufbau
│   └── Teile, Fächer je Teil, Fragenzahl, Dauer — für Simulation,
│       Prüfungssets und Leistungsnachweise
│
├── Badge-Regeln
│   └── Experten-Badges je Fach + Schwelle, Allrounder = alle aktiven Fächer
│
└── Pseudonym-Generator
    └── gemeinsame Adjektive + Nomen des Bereichs
```

**Warum ein Kontext im Browser?** Login-, Registrier-, Shop- und Quiz-Bildschirme laufen im Browser und können die Datenbank vor dem Login nicht fragen. Das Grundlayout lädt den Bereich deshalb einmal auf dem Server und reicht ihn nach unten durch — so kennt jeder Bildschirm sofort den richtigen Namen, ohne zusätzliche Ladezeit oder Flackern.

### B) Datenmodell (in Worten)

**Neu: Fachbereich** — pro Bereich ein Eintrag mit:
- Kurzname (`spedition`) und Adresse (`spedilern.vercel.app`)
- Name, App-Name, Untertitel, Icon
- Münz-Name, Hof-Name
- Prompt-Rolle, Zielgruppe, optionale Zusatzhinweise
- erlaubte Klassenstufen
- Nomen für Pseudonyme
- aktiv ja/nein

**Erweitert:**

| Was | Neu dazu |
|---|---|
| Profile | Bereich (Standard: Spedition, auch für neue Registrierungen) |
| Fächer | Bereich; Kürzel nur noch **je Bereich** eindeutig |
| Prüfungsteile (Tabelle existiert, war ungenutzt) | Bereich, Teil-Nummer, Untertitel, Fragenzahl, Dauer, Sortierung + Zuordnung „welche Fächer gehören zu welchem Teil" |
| Prüfungssets, Leistungsnachweise, Shop-Artikel | Bereich |
| Badges | optional: Fach + Schwelle (für Experten-Badges); Kennzeichen „Allrounder" |
| Audit-Log | Bereich des betroffenen Objekts |
| KI-Upload-Aufträge und -Entwürfe | Fach als Verweis statt als Kürzel-Text |

**Bewusst nicht erweitert:** Fragen, Antwortoptionen und Themen — ihr Bereich ergibt sich eindeutig über ihr Fach (jede Frage hat genau ein Fach). Das vermeidet doppelte Daten, die auseinanderlaufen könnten.

Gespeichert in: Supabase (bestehende Datenbank, kein neuer Dienst).

### C) Welche Bereiche der App angepasst werden

| Bereich der App | Was sich ändert (unsichtbar für Nutzer) |
|---|---|
| Grundlayout, Login, Registrierung, Passwort-Seiten, Ladeanzeige, Admin-Kopf | Name, Icon, Tab-Titel aus dem Bereich |
| Start-, Fächer-, Quiz-Seite, Fach-Karten, Fach-Etiketten | Farben, Icons, Beschreibungen aus den Fach-Daten |
| Prüfungssimulation (Start, Sitzung, Ergebnis), Prüfungs-Etiketten | Teile aus dem Prüfungsaufbau |
| Admin: Prüfungssets, Leistungsnachweis anlegen | Teile aus dem Prüfungsaufbau |
| Shop, Hof-Galerie, Münzanzeige, Startguthaben, Blitzrunde, Quiz-Ergebnis, Admin-Shop | Münz- und Hof-Name aus dem Bereich |
| Badges (Berechnung + Nachberechnung) | Badge-Regeln aus Daten |
| Admin: KI-Generator, CSV-Import, JSON-Import, Prüfungsset-Import/-Extraktion, Fragenliste/-Export, Fächer anlegen | Prompt-Baukasten, Fach-Auflöser |
| Bezahlter Upload-Pfad (Aufträge, Entwürfe, Übernahme) | Prompt-Baukasten, Fach als Verweis |
| Pseudonym neu würfeln + automatische Vergabe bei Registrierung | Pseudonym-Generator mit Bereichs-Nomen |

Rund 45 Dateien werden angefasst, davon ~20 nur für Namen/Texte.

### D) Technische Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Eine zentrale Quelle je Thema** (Fach-Auflöser, Prompt-Baukasten, Prüfungsaufbau) statt Einzelanpassungen | Heute suchen ~15 Stellen Fächer über Kürzel. Wenn nur noch eine Stelle das tut, kann ein Kürzel später nicht aus Versehen im falschen Bereich landen — und es gibt genau einen Ort zum Testen. |
| **Bereich einmal pro Seitenaufruf laden** und durchreichen | Keine zusätzliche Wartezeit; Seiten fragen nicht jede für sich die Datenbank. |
| **Adresse nur vor dem Login maßgeblich** | Nach dem Login entscheidet das Profil — so kann eine falsch aufgerufene Adresse niemanden in einen fremden Bereich bringen. |
| **Bereich nicht an Fragen speichern** | Jede Frage hat genau ein Fach; der Bereich folgt daraus. Weniger Pflege, keine Widersprüche. |
| **Badge-IDs bleiben** | Verdiente Abzeichen hängen an diesen IDs — so geht nichts verloren. |
| **Bereichsdaten zunächst nur per Migration pflegbar** | Es gibt in dieser Phase nur Spedition; die Einstellungsseite kommt mit den Bereichs-Admins (PROJ-24). |
| **Keine neuen Pakete** | Alles mit vorhandenen Mitteln (Next.js, Supabase). |

### E) Auslieferung in drei Schritten

1. **Datenbank erweitern und befüllen** — neue Felder zunächst optional, Spedition anlegen, alle Bestandsdaten zuordnen, Prüfungsaufbau und Badge-Regeln eintragen. Die laufende App merkt davon nichts (alte Felder bleiben).
2. **Code ausliefern** — liest ab jetzt aus den Bereichsdaten.
3. **Verschärfen** — Bereich wird Pflicht, Fachkürzel-Eindeutigkeit wechselt auf „je Bereich", alte Kürzel-Textfelder im Upload-Pfad entfallen.

Jeder Schritt hat einen Rückweg. Schritt 3 erst, wenn Schritt 2 live geprüft ist.

### F) Nachweis „Spedition merkt nichts"

Ohne Dev-Server, nur Build, Tests und Datenbank-Abfragen:

| Prüfung | Wie |
|---|---|
| Prompt identisch | Test vergleicht den erzeugten Spedition-Prompt mit dem heutigen Text |
| Badges identisch (außer Allrounder-Regel) | Abfrage „welche Badges stünden jedem Azubi zu" vorher/nachher |
| Prüfungsaufbau identisch | Test: Teile, Fächer, Fragenzahl, Dauer = heutige Werte |
| Gleiches Kürzel in zwei Bereichen | Test mit zwei Test-Bereichen, beide mit `KSK` |
| Spielstände unverändert | Stichprobe XP, Streak, Münzen, Hof-Gegenstände vor/nach Deploy |
| Keine festen Werte mehr | Suche im Code nach Kürzeln und Speditions-Begriffen (außer Tests/Migrationen) |

### G) Abhängigkeiten (Pakete)
Keine neuen Pakete.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
