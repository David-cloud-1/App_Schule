# PROJ-25: Onboarding Tourismus (Touristiklern-Grundgerüst)

## Status: In Progress
**Created:** 2026-10-01
**Last Updated:** 2026-10-01

## Kontext
Entspricht Phase 4 aus `docs/plans/mehrere-fachbereiche.md`. Legt den zweiten Fachbereich „Touristiklern" technisch an, damit eine Tourismus-Lehrkraft dort eigenständig Fächer, Fragen, Prüfungssets und Shop-Artikel aufbauen kann — genau wie heute bei SpediLern. Die reale IHK-Prüfungsstruktur wurde recherchiert und ist Grundlage dieser Spec (siehe Quellen unten).

**Ausbildungsberuf (mit Nutzer geklärt, 2026-10-01):** Tourismuskaufmann/-frau (Kaufmann/Kauffrau für Privat- und Geschäftsreisen) — **nicht** zu verwechseln mit „Kaufmann/-frau für Tourismus und Freizeit" (anderer Beruf, andere Prüfungsordnung).

**Reale Prüfungsstruktur (recherchiert 2026-10-01):**

| Teil | Name | Dauer | Gewichtung |
|---|---|---|---|
| 1 | Geschäftsprozesse im Tourismus | 150 Min | 40 % |
| 2 | Kaufmännische Steuerung und Dienstleistungen in der touristischen Wertschöpfungskette | 90 Min | 20 % |
| 3 | Wirtschafts- und Sozialkunde | 60 Min | 10 % |
| 4 | Fallbezogenes Fachgespräch (mündlich, 20 Min) | — | 30 % |

Teil 4 ist mündlich und wird — wie bei Spedition auch nur die 3 schriftlichen Teile abgebildet sind — **nicht** in der App abgebildet.

Quellen: [Verordnung ReiseKfmAusbV 2011](https://www.gesetze-im-internet.de/reisekfmausbv_2011/BJNR095300011.html), [IHK Schwaben](https://www.ihk.de/schwaben/produktmarken/meine-pruefung/ausbildungspruefungen/pruefungen-a-z/tourismuskaufmann-frau-552834), [IHK Berlin](https://www.ihk.de/berlin/pruefungen-lehrgaenge/ausbildungspruefungen/pruefung-tourismuskaufmann-frau-fuer-privat-und-geschaeftsreisen-6176832).

**Entscheidungen mit dem Nutzer (2026-10-01):**
- Benotete Leistungsnachweise: ja, wie Spedition
- Klassenstufen: 10, 11, 12 (wie Spedition)
- Branding: App-Name „TouristikLern", Münzname „Reisetaler", Hofname „Reisebüro" (Domain `touristiklern.vercel.app` ist laut Plan-Dokument bereits reserviert/eingerichtet)
- Lehrkraft: noch offen — wird später manuell über die bestehende Nutzerverwaltung (PROJ-24) zur Bereichs-Admin gemacht, sobald die Person feststeht und sich registriert hat
- Fächer-Aufteilung: entscheidet die Lehrkraft selbst über die bestehende „Fächer"-Seite, sobald sie eingeladen ist — **PROJ-25 legt bewusst keine Fächer an**
- Shop-Artikel: pflegt die Lehrkraft selbst über die bestehende „Hof-Items"-Seite — **PROJ-25 legt bewusst keine Artikel an**

## Dependencies
- Requires: PROJ-22 (Fachbereich als Datenbasis)
- Requires: PROJ-23 (Fachbereichs-Zuordnung für Azubis) — automatische Zuordnung über `touristiklern.vercel.app`
- Requires: PROJ-24 (Fachbereichs-Admins & Rechtetrennung) — Rollenvergabe, Bereichs-Umschalter, Fachbereiche-Verwaltung

## User Stories
- Als Super-Admin möchte ich den Fachbereich Touristiklern technisch anlegen, damit eine Tourismus-Lehrkraft dort eigenständig Inhalte aufbauen kann, sobald sie feststeht.
- Als Super-Admin möchte ich, dass die reale IHK-Prüfungsstruktur (3 schriftliche Teile mit korrekter Dauer) von Anfang an korrekt hinterlegt ist, damit Prüfungssets und Leistungsnachweise später ohne Umwege funktionieren.
- Als künftige Tourismus-Lehrkraft möchte ich mich auf `touristiklern.vercel.app` registrieren und automatisch dem richtigen Bereich zugeordnet werden.
- Als Super-Admin möchte ich die Tourismus-Lehrkraft nachträglich zur Bereichs-Admin machen können, sobald sie feststeht.
- Als Super-Admin möchte ich im Bereichs-Umschalter zwischen Spedition und Tourismus wechseln können, um bei Bedarf auszuhelfen.

## Acceptance Criteria
- [ ] Neuer Fachbereich `TOUR` in `departments` angelegt: Name „Tourismuskaufleute", App-Name „TouristikLern", Domain `touristiklern.vercel.app`, Münzname „Reisetaler", Hofname „Reisebüro", Klassenstufen `{10,11,12}`, `prompt_role`/`target_group` passend zum Beruf „Tourismuskaufmann/-frau (Privat- und Geschäftsreisen)"
- [ ] 3 Prüfungsteile in `exam_parts` für `TOUR` angelegt, mit den recherchierten echten Daten (Name, Teil-Nummer, Dauer); Fragenanzahl je Teil als sinnvoller App-Standard gesetzt (anpassbar durch Super-Admin über die bestehende Fachbereiche-Verwaltung)
- [ ] Noch keine Fächer angelegt — bestätigt per Admin-Oberfläche: „Fächer"-Seite für `TOUR` zeigt eine leere Liste mit funktionierendem „Neues Fach"-Formular
- [ ] Noch keine Shop-Artikel angelegt — „Hof-Items"-Seite für `TOUR` zeigt eine leere Liste mit funktionierendem Anlegen-Formular
- [ ] Noch keine Lehrkraft zugeordnet — Rollenvergabe funktioniert über die bestehende Nutzerverwaltung, sobald jemand feststeht
- [ ] Azubis, die sich auf `touristiklern.vercel.app` registrieren (E-Mail oder Google), werden automatisch `TOUR` zugeordnet (Regressionscheck von PROJ-23, keine neue Funktion)
- [ ] Bereichs-Umschalter im Admin-Panel zeigt jetzt beide Bereiche (SPED, TOUR) für den Super-Admin an (PROJ-24-Funktion, wird hier erstmals sichtbar/wirksam, da bisher nur 1 Bereich existierte)
- [ ] Spedition bleibt unverändert: bestehende Fragen, Prüfungssets, Nutzer, Noten unangetastet (Regressionscheck)

## Edge Cases
- Eine Lehrkraft registriert sich auf `touristiklern.vercel.app`, **bevor** diese Spec umgesetzt ist → landet im Rückfall-Bereich SPED (bestehendes PROJ-23-Verhalten); muss danach manuell über „Bereich wechseln" (PROJ-24) umgehängt werden
- Jemand versucht, ein Prüfungsset für `TOUR` anzulegen, bevor Fächer existieren → Fächer-Auswahl ist leer, kein Absturz; Admin muss zuerst Fächer anlegen
- Der KI-Generator-Prompt für `TOUR` wird aufgerufen, solange keine Fächer existieren → Prompt zeigt eine leere Fächerliste; wird erst sinnvoll nutzbar, sobald mindestens ein Fach angelegt ist
- Die Tourismus-Lehrkraft möchte ein Fach-Kürzel nutzen, das bei Spedition bereits existiert (z. B. „KSK") → unkritisch, Kürzel sind seit PROJ-22 nur je Fachbereich eindeutig
- Der Super-Admin wählt im Bereichs-Umschalter „Touristiklern", obwohl dort noch nichts existiert → alle Admin-Seiten zeigen korrekt leere Listen statt eines Fehlers

## Technical Requirements
- **Umsetzung:** reine Datenmigration (SQL), analog zum SPED-Bootstrap aus PROJ-22 (`20260929_proj22_departments.sql`) — ein Insert für `departments`, drei Inserts für `exam_parts`. **Kein neuer Anwendungscode nötig** — Fächer-Verwaltung, Shop-Verwaltung und Rollenvergabe laufen bereits über bestehende Admin-Oberflächen (PROJ-9, PROJ-20, PROJ-24).
- Rückweg-Migration im selben Commit (Projekt-Konvention)
- Domain `touristiklern.vercel.app` und der zugehörige Supabase-Redirect sind laut Plan-Dokument (`docs/plans/mehrere-fachbereiche.md`, Abschnitt 5) bereits eingerichtet — keine Infrastruktur-Arbeit in dieser Spec

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Was sichtbar wird (kein neues UI nötig)

PROJ-25 baut **keine einzige neue Bildschirmkomponente**. Es füllt nur zwei bestehende Datentöpfe mit Inhalt, die alle schon gebauten Admin-Seiten automatisch aufgreifen:

```
Bereichs-Umschalter (Kopfzeile, Super-Admin, aus PROJ-24)
 └── zeigt ab jetzt 2 Einträge statt 1: „Speditionskaufleute“, „Tourismuskaufleute“
      └── Super-Admin wechselt auf „Tourismuskaufleute“
           ├── Fächer-Seite           → leer, „Neues Fach“-Formular funktioniert sofort
           ├── Hof-Items-Seite        → leer, „Neues Item“-Formular funktioniert sofort
           ├── Prüfungssets-Seite     → Teil-Auswahl zeigt die 3 echten Tourismus-Teile
           ├── Nutzer-Seite           → zunächst leer, bis sich jemand über touristiklern.vercel.app registriert
           └── Fachbereich-Einstellungen → zeigt Name, Adresse, Münz-/Hofname, editierbar
```

Login-/Registrierseite auf `touristiklern.vercel.app` zeigt ab sofort automatisch Name „TouristikLern“ und eigenes Branding (Mechanismus aus PROJ-22/23, läuft allein über die Host-Adresse — keine neue Logik).

### B) Datenmodell (in einfachen Worten)

Es entstehen **keine neuen Tabellen und keine neuen Spalten** — nur neue Zeilen in zwei bereits bestehenden Tabellen:

- **Ein neuer Fachbereichs-Datensatz** „Tourismuskaufleute“: Name, App-Name „TouristikLern“, Adresse `touristiklern.vercel.app`, Münzname „Reisetaler“, Hofname „Reisebüro“, Klassenstufen 10–12, sowie die Texte, die den KI-Prompt für Tourismus-Fragen später automatisch zusammensetzen (Rolle „Experte für Tourismuskaufleute (Privat-/Geschäftsreisen), IHK Bayern“, Zielgruppe „angehende Tourismuskaufleute“).
- **Drei neue Prüfungsteil-Datensätze**, mit den recherchierten echten IHK-Werten:

  | Teil | Titel | Dauer | Richtwert Fragenanzahl (App-Quiz, anpassbar) |
  |---|---|---|---|
  | 1 | Geschäftsprozesse im Tourismus | 150 Min | 30 |
  | 2 | Kaufmännische Steuerung & Dienstleistungen | 90 Min | 15 |
  | 3 | Wirtschafts- und Sozialkunde | 60 Min | 15 |

  Die Fragenanzahl ist ein reiner App-Komfortwert für die Prüfungssimulation (kein IHK-Wert) — an der echten Dauer und Gewichtung orientiert, später vom Super-Admin änderbar.
- **Bewusst leer gelassen:** keine Fächer, keine Shop-Artikel, keine Pseudonym-Wortliste (nutzt den bestehenden neutralen Rückfall „Entdecker“, „Lerner“ usw., bis die Lehrkraft eigene Wörter wünscht), keine zugeordnete Lehrkraft.
- Gespeichert wird weiterhin ausschließlich in der bestehenden Supabase-Datenbank.

### C) Technische Entscheidungen (Begründung)

- **Datenmigration statt neuer Oberfläche:** Einen Fachbereich samt Prüfungsstruktur anzulegen ist ein seltenes, einmaliges Ereignis (bisher genau einmal für Spedition passiert). Dafür eine dauerhafte „Prüfungsteile verwalten“-Seite zu bauen wäre Aufwand für eine Aktion, die vermutlich nie wieder gebraucht wird, solange nicht ständig neue Ausbildungsberufe dazukommen. Genau nach diesem Muster wurde auch Spedition ursprünglich angelegt.
- **Fächer/Shop-Artikel/Lehrkraft bewusst leer:** Diese Entscheidungen gehören inhaltlich der Tourismus-Lehrkraft, nicht dem Super-Admin — und die Werkzeuge dafür (Fächer-Seite, Hof-Items-Seite, Nutzerverwaltung mit Rollenvergabe) existieren bereits vollständig aus PROJ-9, PROJ-20 und PROJ-24. Sie jetzt vorab mit geratenen Inhalten zu befüllen würde nur Arbeit erzeugen, die später wieder verworfen wird.
- **Warum die reale IHK-Struktur statt eigener Annahmen:** Die Prüfungsteile bestimmen später, wie Prüfungssimulationen und benotete Leistungsnachweise aufgebaut sind — falsche Werte wären für die Lehrkraft mühsam nachträglich zu korrigieren. Die recherchierten Werte (Dauer, Gewichtung, Teil-Namen) stammen direkt aus der Ausbildungsverordnung und IHK-Quellen.
- **Keine Infrastruktur-Arbeit:** Adresse und Weiterleitung für `touristiklern.vercel.app` sind laut Plan-Dokument bereits eingerichtet — PROJ-25 muss daran nichts ändern.

### D) Abhängigkeiten (Pakete)

Keine. Es wird keine neue Bibliothek und kein neuer Dienst gebraucht.

## Implementation Notes (Backend Developer)

**Migration `20261001_proj25_tourismus_bootstrap.sql` (angewendet auf Produktion, 2026-10-01):**
- Fachbereich `TOUR` angelegt: `Tourismuskaufleute` / `TouristikLern`, Adresse `touristiklern.vercel.app`, Münzname „Reisetaler“, Hofname „Reisebüro“ (Kurzform „Büro“), Klassenstufen `{10,11,12}`, `sort_order=2`
- 3 Prüfungsteile angelegt: `GPT` (Geschäftsprozesse im Tourismus, 150 Min, Richtwert 30 Fragen), `KSD` (Kaufm. Steuerung & Dienstleistungen, 90 Min, 15 Fragen), `WISO` (Wirtschafts- & Sozialkunde, 60 Min, 15 Fragen) — Farben/Icons an die bestehende Spedition-Palette angeglichen (Blau/Orange/Lila je Teil-Nummer, app-weit konsistent)
- Bewusst **kein** `default_subject_id` je Teil gesetzt (keine Fächer vorhanden) und **keine** Fächer/Shop-Artikel/Pseudonym-Wortliste/Lehrkraft-Rolle — wie in der Spec festgelegt
- Rückweg: `20261001_proj25_tourismus_bootstrap_down.sql` (löscht `TOUR` nur, solange keine Fächer/Nutzer/Prüfungssets dort hängen — durch bestehende Fremdschlüssel technisch erzwungen)

**Kein Anwendungscode geändert** — wie im Tech Design vorgesehen. Verifiziert direkt nach der Migration:
- Spedition unverändert: 5 Fächer weiterhin SPED, Profilanzahl unverändert (organisches Wachstum durch reale Nutzung seit der letzten Prüfung, nicht durch diese Migration verursacht)
- Tourismus korrekt leer: 0 Fächer, 0 Profile unter `TOUR`
- `npm test` (560/560) und `npm run build` weiterhin grün (unverändert, da kein Code angefasst wurde)

**Für die QA-Prüfung noch offen:** Live-Verhalten der Login-/Registrierseite auf `touristiklern.vercel.app` (Branding, automatische Bereichszuordnung neuer Azubis) sowie Sichtbarkeit von „Tourismuskaufleute“ im Bereichs-Umschalter des Super-Admin — beides sollte jetzt automatisch funktionieren (PROJ-22/23/24-Mechanik), aber noch nicht erneut einzeln verifiziert.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
