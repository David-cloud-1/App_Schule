# PROJ-130: Lehrkräfte-Bereich – Begriffe & Menü (Phase 2 Übersichtlichkeit)

## Status: In Progress
**Created:** 2026-11-27
**Last Updated:** 2026-11-27

## Worum es geht

Phase 2 aus [docs/plan-uebersichtlichkeit.md](../docs/plan-uebersichtlichkeit.md). Eine Lehrkraft, die die App nicht kennt, soll sich sofort zurechtfinden. Dafür bekommt das Menü eine klare Ordnung, es gibt nur noch **einen** Bereichs-Umschalter, und jeder Begriff hat genau eine Bedeutung (Wörterliste).

**Grundlage:**
- Wörterliste und Menü aus dem Plan (freigegeben am 26.11.2026)
- Klickbare Vorschau `docs/vorschau/phase1-neuer-aufbau.html`
- Test der Vorschau mit Kolleg/innen am 27.11.2026: Menü und Begriffe kamen gut an („gefällt uns schon gut“). Die drei Wünsche aus dem Test gehören zu Phase 3 und 4 und stehen im Plan (B102–B104).

**Entscheidungen 27.11.2026:**
- Ein Feature für ganz Phase 2 (Menü, Umschalter und Wörterliste zusammen).
- „Lerninhalte“ ist bis Phase 3 ein aufklappbarer Menüpunkt mit Unterpunkten. Die Seiten dahinter bleiben, wie sie sind.
- „Nachschlagen“ ist eine Einstiegsseite mit zwei Karten (Schulrecht, Checklisten).

## Dependencies
- Baut auf: PROJ-40 (gruppierte Navigation), PROJ-45 (Arbeitsbereich-Rahmen), PROJ-49/PROJ-70 (Bereichsleiste „Du siehst“), PROJ-127 (Verwaltung für alle Lehrkräfte), PROJ-55 (Schulrecht), PROJ-122 (Checklisten), PROJ-50 (Mein Konto)
- Vor: PROJ-131 ff. (Phase 3 „Lerninhalte an einem Ort“, Phase 4 „Leistungsnachweis in 3 Schritten“). Diese nutzen die hier festgelegten Begriffe.

## User Stories
- Als **neue Lehrkraft** möchte ich ein kurzes Menü mit sprechenden Namen, damit ich ohne Hilfe finde, wo ich einen Test anlege oder eine Frage korrigiere.
- Als **Lehrkraft** möchte ich den Bereich (Spedition/Tourismus) an genau einer Stelle wählen, damit ich nicht auf jeder Seite und in jedem Dialog erneut gefragt werde.
- Als **Lehrkraft** möchte ich, dass ein Wort überall dasselbe bedeutet, damit ich nicht raten muss, ob „Thema“, „Klasse“ oder „Öffentlich“ gerade etwas anderes heißt.
- Als **Lehrkraft** möchte ich Schulrecht und Checklisten unter einem Punkt „Nachschlagen“ finden, weil beides Nachschlagen ist.
- Als **Lehrkraft** möchte ich im Konto-Menü nur das Nötige sehen (mein Konto, Ansicht als Azubi, Abmelden), damit ich nicht zwischen drei ähnlichen Einträgen wähle.
- Als **Super-Admin** möchte ich meine zusätzlichen Verwaltungsseiten gesammelt unten im Menü finden, klar als „nur Super-Admin“ erkennbar.

## Acceptance Criteria

### A. Menü (B1, B2, B76)
- [ ] Die Seitenleiste (Laptop) und die Schublade (Handy) zeigen für **jede** Lehrer-Rolle diese Reihenfolge:
  1. Start
  2. Leistungsnachweise (Zusatz „mit Note“)
  3. Übungsprüfungen (Zusatz „ohne Note“)
  4. Lerninhalte (aufklappbar, siehe A2)
  5. Werkzeugkiste
  6. Abwesenheiten
  7. Nachschlagen
  8. Lehrerzimmer
  9. Trennlinie, darunter „Verwaltung“ (aufklappbar)
- [ ] A2 **Lerninhalte** klappt auf und zeigt: Übersicht (heute „Inhalte“), Fragen, Gemeldete Fragen, Schwierigste Fragen, Fächer, Themen, Papierkorb sowie für den Super-Admin „Fragen aus Material“. Die Gruppe klappt von selbst auf, wenn eine ihrer Seiten offen ist. Bis auf die Namen bleiben die Seiten unverändert.
- [ ] **Verwaltung** zeigt: Nutzer, Einstellungen des Bereichs (heute „Fachbereich“), Shop-Gegenstände (heute „Items“/„Hof-Items“) und Änderungsprotokoll. Nur für den Super-Admin kommen hinzu: Zuständigkeiten, Abwesenheitsarten und Bereiche anlegen (heute „Fachbereiche“), jeweils mit kleinem Hinweis „Super-Admin“.
- [ ] Die Gruppen „Mein Unterricht“, „Inhalte“ und „Weitere Seiten“ gibt es nicht mehr. Kein Menüpunkt ist hinter „Weitere Seiten“ versteckt.
- [ ] „Fachbereich“ und „Fachbereiche“ stehen nirgends mehr untereinander (B2).
- [ ] „Meine Fächer“ ist kein eigener Menüpunkt mehr. Lehrkräfte erreichen die Seite aus „Mein Konto“ (Abschnitt „Meine Fächer“ mit Link) und über die Schnellsuche.
- [ ] Die Zahl der Hauptpunkte (ohne aufgeklappte Unterpunkte) liegt bei höchstens 9, für normale Lehrkräfte wie für den Super-Admin.
- [ ] Brotkrumen und Seitentitel in der Handy-Kopfzeile nutzen dieselben Namen wie das Menü, also z. B. „Lerninhalte › Fragen“ oder „Verwaltung › Nutzer“.
- [ ] Die Schnellsuche (⌘K / Strg+K) findet jede Seite unter ihrem neuen Namen und zusätzlich unter dem alten (z. B. „Kalender“ → Abwesenheiten, „Fachbereich“ → Einstellungen des Bereichs, „Prüfungssimulation“ → Übungsprüfungen).
- [ ] Die Schnellaktionen auf der Startseite verwenden die neuen Namen.
- [ ] **Nachschlagen** (B76): Der Menüpunkt öffnet eine Einstiegsseite mit dem Seitenkopf „Nachschlagen“ (ein Satz Beschreibung) und zwei Karten, „Schulrecht“ und „Checklisten“. Jede Karte hat einen Satz Erklärung und führt auf die bestehende Seite. Auf beiden Unterseiten bleibt „Nachschlagen“ im Menü aktiv, die Brotkrumen lauten „Nachschlagen › Schulrecht“ bzw. „Nachschlagen › Checklisten“.
- [ ] Am Handy schließt die Schublade nach der Auswahl eines Unterpunkts. Aufklappbare Gruppen sind per Tastatur bedienbar (Enter/Leertaste) und melden ihren Zustand (`aria-expanded`).

### B. Konto-Menü (B6)
- [ ] Das Konto-Menü zeigt Name, Rolle in Klartext, „Mein Konto“, „Als Azubi ansehen“, „Darstellung“ und „Abmelden“.
- [ ] „Spielerprofil“ und „Zur Lern-App“ fallen weg. „Als Azubi ansehen“ führt dorthin, wohin heute „Zur Lern-App“ führt.
- [ ] Der Knopf „Zur Lern-App“ oben rechts in der Kopfzeile entfällt, weil er doppelt ist.
- [ ] Das Spielerprofil der Lehrkraft (Level, XP …) bleibt über die Lern-App erreichbar. Daten gehen dabei nicht verloren.

### C. Ein Bereichs-Umschalter (B3, B24 Teil Phase 2, B50)
- [ ] Der Bereich wird nur an **einer** Stelle gewählt: oben in der Seitenleiste (Laptop) bzw. oben in der Schublade (Handy), mit der Beschriftung „Bereich“ und dem gewählten Namen.
- [ ] Wählen dürfen alle, die heute schon wechseln dürfen, mit denselben Werten wie heute (einzelne Bereiche und „Alle Bereiche“). Wer nur einen Bereich hat, sieht ihn als ruhige Anzeige ohne Auswahl.
- [ ] Die Zeile „Du siehst: …“ mit eigenem Umschalter unter den Seitentiteln entfällt auf allen Seiten.
- [ ] **Anlegen-Dialoge** (neue Frage, neuer Leistungsnachweis, Import, Fragen aus Material, Übungsprüfung) fragen den Bereich **nicht** mehr ab, wenn oben ein einzelner Bereich gewählt ist. Sie übernehmen ihn und nennen ihn höchstens als ruhige Textzeile (z. B. „Bereich: Spedition“).
- [ ] Steht der Umschalter auf „Alle Bereiche“, fragen Anlegen-Dialoge den Bereich als Pflichtfeld ab, ohne Vorauswahl (heutige Schutzregel aus PROJ-70). Das Feld heißt „Bereich“, nicht „Zielbereich“ und nicht „Wird angelegt in“.
- [ ] Der Leistungsnachweis-Dialog füllt den Bereich aus dem Umschalter vor (B24, Teil Phase 2).
- [ ] Die Seite „Gemeldete Fragen“ hat keinen eigenen Bereichsfilter mehr und folgt dem Umschalter (B50).
- [ ] Seiten mit Schülerdaten (Nutzer, Änderungsprotokoll), auf denen Lehrkräfte und Bereichs-Admins heute fest den eigenen Bereich sehen, verhalten sich weiter so. Der Umschalter zeigt dort für diese Rollen einen kurzen Hinweis, z. B. „Auf dieser Seite immer: Spedition“, und ändert nichts.
- [ ] Bereichsunabhängige Seiten (Abwesenheiten, Nachschlagen, Lehrerzimmer, Werkzeugkiste) zeigen den Umschalter weiter, er wirkt dort aber nicht. Es gibt keine Fehlermeldung.
- [ ] Der Link „Meine Fächer“, der heute in der Bereichsleiste steht, ist für Lehrkräfte weiter erreichbar (über Mein Konto und die Inhalts-Seiten selbst, z. B. im Leerzustand „Du hast noch keine Fächer eingetragen“).

### D. Wörterliste (B4, B5, B9, B12 Rest, B55, B58, B60, B65, B80 Rest, B81)
Gilt für alle sichtbaren Texte im Lehrkräfte-Bereich: Menü, Seitenköpfe, Beschreibungen, Tabellenköpfe, Filter, Knöpfe, Dialoge, Toasts, Leer- und Fehlerzustände, Schnellsuche. „Übungsprüfung“ gilt zusätzlich auf der Schülerseite.

| Statt … | künftig |
|---|---|
| Fachbereich, Zielbereich | **Bereich** |
| Fachbereiche (Super-Admin-Seite) | **Bereiche anlegen** (Menü) / „Bereiche“ (Seitentitel) |
| Prüfungssimulation, Prüfungsset, Prüfung üben | **Übungsprüfung(en)** |
| Klasse (für 10/11/12) | **Stufe** |
| Klasse | **Klasse** (nur SP10C usw.) |
| Thema (im Baukasten = Abschnitt einer Lernseite) | **Kapitel** |
| Kalender | **Abwesenheiten** |
| Offen (Kalender-Filter/-Status) | **Vertretung fehlt** |
| Öffentlich / Öffentlicher Link / Nicht veröffentlicht | **Für Azubis (Link)**: an / aus |
| Regal · privat / 1 Person / alle, Teilen … | **Fürs Kollegium (Regal)**: an / aus |
| Veröffentlichen (Baukasten) | **Änderungen übernehmen** |
| Anpassen (Regal) | **Kopie bearbeiten** |
| Leere Seite anlegen | **Eigene Seite bauen** |
| Items, Hof-Items | **Shop-Gegenstände** |
| Lvl | **Level** |
| Session | **Lernrunde** |
| Prompt (Werkzeugkiste-Assistent, Bereichs-Einstellungen) | **Auftrag für die KI** |
| Antwort (Schritt im Assistenten) | **Antwort der KI** |

- [ ] Keiner der Begriffe aus der linken Spalte kommt als sichtbarer Text im Lehrkräfte-Bereich mehr vor. Ausnahmen gibt es nur in der Schnellsuche (alte Namen als Suchwörter) und in Rechtstexten (Schulrecht im Wortlaut). Ein automatischer Test prüft das für Menü, Seitenköpfe und die Wörter-Quelle des Baukastens (`bedien-woerter.ts`).
- [ ] **Abteilung** (Kalender) bleibt, bekommt aber im Eintragen-Dialog eine kurze Erklärung: „Abteilung der Schule (z. B. Spedition, Touristik, KEP) – nicht dasselbe wie der Bereich in der App“.
- [ ] **Doppelte Bedeutungen** (B5) sind aufgelöst: „Thema“ heißt nur noch Lernthema, „Klasse“ nur noch SP10C usw., „Offen“ nur noch „Leistungsnachweis läuft“, „Kalender“ kommt nicht mehr vor.
- [ ] **Übungsprüfungen** (B80 Rest): Die Seite heißt „Übungsprüfungen“ und der Seitenkopf sagt „Frei und ohne Note. Azubis üben damit für die Abschlussprüfung.“ Die Zeilenknöpfe heißen „Für Azubis freigeben“ bzw. „Zurückziehen“ (statt Aktivieren/Deaktivieren) und „Als Leistungsnachweis verwenden“ (statt „Leistungsnachweis“). Der Status heißt „Für Azubis sichtbar“ / „Nicht sichtbar“.
- [ ] Auf der Schülerseite heißt der Punkt „Prüfung üben“ künftig „Übungsprüfung“. Der Hinweis „Noch nichts freigegeben“ aus Phase 0 bleibt.
- [ ] **Seitenbeschreibungen** (B9) kommen ohne „Nicht zu verwechseln mit …“ aus. Jede Beschreibung ist ein Satz, der sagt, was man auf der Seite tut.
- [ ] **Englisch** (B12 Rest): Im Lehrkräfte-Bereich steht kein „Items“, „Item“, „Session“ oder „Lvl“ mehr.
- [ ] **Werkzeugkiste-Assistent** (B55): Die Schritte heißen z. B. „Auftrag kopieren“ und „Antwort der KI einfügen“. Das Wort „Prompt“ erscheint nicht mehr als Schrittname oder Knopf.
- [ ] **Teilen** (B58, B65): Liste „Meine Materialien“, Detail, ⋯-Menü und Baukasten verwenden nur noch „Für Azubis (Link)“, „Fürs Kollegium (Regal)“ und „Änderungen übernehmen“. Der Knopf im Baukasten und der Status in der Liste passen sichtbar zusammen: Hat ein Material Änderungen, die noch nicht übernommen sind, zeigt die Liste „Änderungen noch nicht übernommen“.
- [ ] **Eigene Seite / Kopie** (B60): „Leere Seite anlegen“ heißt überall „Eigene Seite bauen“, „Anpassen“ im Regal heißt „Kopie bearbeiten“.
- [ ] **Bereichs-Einstellungen** (B81): „Zusatzhinweise für den Fragen-Prompt“ heißt „Zusatzhinweise für die KI beim Erstellen von Fragen“, dazu ein Satz Erklärung.
- [ ] Die Wörterliste steht dauerhaft in `docs/DESIGN.md` (Abschnitt Lehrkräfte-Bereich), damit neue Seiten sie übernehmen.

### E. Abhaken im Plan
- [ ] B1–B6, B9, B12, B24 (Teil 2), B50, B55, B58, B60, B65, B76, B80 und B81 sind in `docs/plan-uebersichtlichkeit.md` abgehakt (☑ bzw. ◐ mit Hinweis auf den Rest in Phase 4).

## Edge Cases
- **Alte Adressen und Lesezeichen:** Seitenadressen bleiben gleich (z. B. `/admin/exam-sets`, `/admin/kalender`). Geändert wird nur, was man liest. Neu ist nur die Adresse von „Nachschlagen“. Alte Links aus Mails, Toasts oder dem Lehrerzimmer funktionieren weiter.
- **Neue Seite „Nachschlagen“:** Sie muss für jede Lehrer-Rolle freigegeben sein, auch für Lehrkräfte ohne Fach (wie Schulrecht und Checklisten). Sonst landen Lehrkräfte auf einer Fehlerseite. Dazu gehört der Eintrag in den Proxy-Freigabelisten.
- **Bereichswechsel mitten im Dialog:** Ein offener Anlegen-Dialog behält den Bereich, mit dem er geöffnet wurde. Wechselt jemand in einem anderen Tab den Bereich, wird nichts im falschen Bereich angelegt. Der Server prüft den Bereich wie heute.
- **„Alle Bereiche“ und Anlegen:** Ohne gewählten Bereich lässt sich nicht speichern. Die Fehlermeldung sagt: „Bitte wähle, in welchem Bereich die Frage angelegt wird.“
- **Lehrkraft ohne Fach oder Bereich:** Das Menü zeigt trotzdem alle Punkte, wie heute (PROJ-127). Inhaltsseiten zeigen den bekannten Leerzustand mit Link zu „Meine Fächer“.
- **Gespeicherter Menü-Zustand:** Eingeklappte Seitenleiste (Cookie `sidebar_state`) und ⌘B funktionieren weiter. Der Aufklapp-Zustand von „Lerninhalte“ und „Verwaltung“ bleibt beim Seitenwechsel erhalten.
- **Bestehende Materialien und Lernseiten:** Die Umbenennung „Thema“ → „Kapitel“ gilt nur für die Bedienung im Baukasten. Fertige Lernseiten, die Azubis schon sehen, ändern ihren Inhalt nicht.
- **Tests und Wächter:** Bestehende Tests, die alte Wörter erwarten (z. B. `bedien-design.test.tsx`, `admin-nav.test.tsx`), werden angepasst und nicht abgeschaltet.
- **Werkzeugkiste-Kern (Python):** Erzeugt der Kern sichtbare Bedientexte mit alten Begriffen (z. B. im Vorschau-Skript des Baukastens), werden auch diese umgestellt und der Kern neu ausgeliefert. Inhalte der Lernseiten bleiben unberührt.

## Nicht Teil dieses Features
- Zusammenlegen der Inhalts-Seiten zu einer Seite „Lerninhalte“, aufklappbare Antworten, übersichtlicherer Fach-/Themenbaum (Phase 3, B102–B103)
- Ersteller in der Nachweis-Liste, Nachweis-Anlegen in 3 Schritten, Feld „Klasse“ (Phase 4, B104)
- Inhalt und Aufbau der Abwesenheiten-Seite (B66–B72 zurückgestellt), nur der Name ändert sich
- Umstellung der Werkzeugkiste von „du“ auf „Sie“ (eigenes Vorhaben)
- Schülerseite außer „Übungsprüfung“ (Phase 7)
- Farben und Design-Regeln (Phase 6)

## Technical Requirements
- Keine Änderung an Rechten: Das Menü bleibt reine Anzeige, die Rechte prüft weiter der Server.
- Keine Datenbank-Änderung nötig. Der Bereichs-Umschalter nutzt das bestehende Cookie und den bestehenden Endpunkt.
- Barrierefreiheit wie in DESIGN.md: 44-px-Bedienflächen, sichtbarer Fokus, `aria-current` für die aktive Seite.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Kurz:** Nur Oberfläche, nur App-Repository. Keine Datenbank-Änderung, keine neue Schnittstelle, kein neues Paket, keine Änderung am Werkzeugkiste-Kern (alle Bedienwörter des Baukastens liegen in der App). Rechte bleiben unverändert beim Server.

### Ausgangslage im Code (27.11.2026)
- **Menü:** Eine einzige Quelle (`src/lib/admin-nav.ts`) speist Seitenleiste, Handy-Schublade, Schnellsuche, Brotkrumen und Schnellaktionen der Startseite. Heute hat sie drei Gruppen („Mein Unterricht“, „Inhalte“, „Verwaltung“) und dazu eine Liste „immer sichtbar“. Alles andere landet unter „Weitere Seiten“. Das ist gut, denn das neue Menü wird an **einer** Stelle umgebaut, und alle fünf Anzeigen folgen von selbst.
- **Bereich:** Es gibt heute **zwei** Umschalter:
  1. oben in der Seitenleiste, nur für den Super-Admin (`department-switcher.tsx`),
  2. die Leiste „Du siehst: …“ unter den Seitentiteln, für alle Rollen und mit „Alle Bereiche“ (`admin-scope-bar.tsx`).

  Beide speichern über **denselben** Weg (`/api/admin/context/bereich`, Cookie). Zusammenlegen ist deshalb reine Oberflächenarbeit.
- **Anlegen-Dialoge** nutzen schon ein gemeinsames Feld (`target-department-field.tsx`): fester Bereich als Textzeile, bei „Alle Bereiche“ als Pflichtauswahl. Der Leistungsnachweis-Dialog und einige weitere Dialoge haben noch eine eigene „Zielbereich“-Auswahl.
- **Baukasten-Wörter** liegen zentral in `bedien-woerter.ts`, dazu einige Stellen in Gliederung, Einfüge-Stelle und Vorschau-Skript.

### A) Aufbau (was man sieht)

```
Seitenleiste (Laptop) / Schublade (Handy)
+-- Kopf: „Lehrkräfte-Bereich“
+-- Bereichs-Umschalter  ← der einzige, für alle Rollen
|     „Bereich: Spedition ▾“  (Spedition · Tourismus · Alle Bereiche)
+-- Start
+-- Leistungsnachweise          mit Note   (Zähler offener Aufgaben bleibt)
+-- Übungsprüfungen             ohne Note
+-- Lerninhalte ▸ (klappt auf)
|     Übersicht · Fragen · Gemeldete Fragen (Zähler) · Schwierigste Fragen
|     Fächer · Themen · Papierkorb · [Fragen aus Material – nur Super-Admin]
+-- Werkzeugkiste
+-- Abwesenheiten
+-- Nachschlagen
+-- Lehrerzimmer                (Hinweis-Punkt bleibt)
+-- ───────────
+-- Verwaltung ▸ (klappt auf)
      Nutzer · Einstellungen des Bereichs · Shop-Gegenstände · Änderungsprotokoll
      [Super-Admin] Zuständigkeiten · Abwesenheitsarten · Bereiche anlegen

Kopfzeile
+-- Brotkrumen „Lerninhalte › Fragen“ / „Nachschlagen › Schulrecht“
+-- Suche (⌘K)
+-- Konto-Menü: Name · Rolle · Mein Konto · Als Azubi ansehen · Darstellung · Abmelden
     (Knopf „Zur Lern-App“ oben rechts entfällt)

Neue Seite „Nachschlagen“ (/admin/nachschlagen)
+-- Seitenkopf „Nachschlagen“ + ein Satz
+-- Karte „Schulrecht“  → bestehende Seite
+-- Karte „Checklisten“ → bestehende Seite

Seitenkopf aller Seiten
+-- Titel · Beschreibung · Aktionen
    (die Zeile „Du siehst: …“ entfällt)

Mein Konto
+-- neuer Abschnitt „Meine Fächer“ (nur Lehrkräfte) mit Link zur bestehenden Seite
```

### B) Bausteine und was mit ihnen passiert

| Baustein | Änderung |
|---|---|
| **Menü-Quelle** (`admin-nav.ts`) | Neu geordnet in: Hauptpunkte, Gruppe „Lerninhalte“, Gruppe „Verwaltung“. Jeder Eintrag bekommt zusätzlich **alte Namen als Suchwörter** (für die Schnellsuche) und optional **zugehörige Unterseiten** (Schulrecht und Checklisten gehören zu „Nachschlagen“, damit Menü-Markierung und Brotkrumen stimmen). Die Liste „immer sichtbar“ und die Gruppe „Weitere Seiten“ entfallen. |
| **Seitenleiste** (`admin-nav.tsx`) | Zeigt die neue Ordnung. Die einklappbaren Blöcke gibt es schon (Collapsible). Sie öffnen sich weiter von selbst, wenn die aktuelle Seite darin liegt. „Super-Admin“-Hinweis an den drei Zusatzseiten. |
| **Bereichs-Umschalter** (neu, ersetzt beide alten) | Sitzt im Kopf der Seitenleiste bzw. Schublade, für jede Rolle. Er bietet die Bereiche an, die die Rolle heute schon sehen darf, plus „Alle Bereiche“. Wer nur einen Bereich hat, sieht ihn als ruhige Anzeige. Er nutzt den bestehenden Speicherweg und lädt nach dem Wechsel die Seite neu (wie heute). |
| **Sonderfälle des Umschalters** | Er weiß, auf welcher Seite er steht. **Nutzer/Änderungsprotokoll** (Lehrkraft, Bereichs-Admin): ruhiger Hinweis „Auf dieser Seite immer: Spedition“. **Seiten, die genau einen Bereich brauchen** (Einstellungen des Bereichs, Shop-Gegenstände) bei „Alle Bereiche“: Hinweis „Auf dieser Seite: Spedition“. Das ist der zuletzt gewählte einzelne Bereich, den der Server heute schon merkt. **Bereichsunabhängige Seiten:** Umschalter sichtbar, ohne Wirkung. |
| **Seitenkopf** (`admin-page-header.tsx`) | Die automatische Bereichsleiste fällt weg. Die Datei `admin-scope-bar.tsx` und der alte `department-switcher.tsx` werden gelöscht. |
| **Bereichs-Feld in Dialogen** (`target-department-field.tsx`) | Bleibt die eine Stelle für alle Anlegen-Dialoge. Beschriftung „Bereich“ statt „Wird angelegt in“/„Zielbereich“. Die Dialoge mit eigener Zielbereich-Auswahl (Leistungsnachweis anlegen, Import, Fragen-Auswahl, Bereich ändern …) werden auf dieses Feld umgestellt, dadurch ist der Bereich **vorausgefüllt**. |
| **Gemeldete Fragen** | Der eigene Bereichsfilter entfällt. Die Liste zeigt, was der Umschalter vorgibt (die Daten kommen dafür schon heute aus dem gewählten Bereich). |
| **Konto-Menü, Kopfzeile, Mein Konto** | Einträge streichen bzw. umbenennen. „Meine Fächer“ als Abschnitt in Mein Konto. Die Seite „Meine Fächer“ selbst bleibt unverändert. |
| **Seite „Nachschlagen“** | Neue, schlichte Server-Seite ohne eigene Daten. Sie muss in die **beiden Proxy-Freigabelisten** in `roles.ts` (sonst sehen Lehrkräfte eine Fehlerseite). Der Wächter-Test dafür existiert bereits. |
| **Wörter-Quelle** (neu, `src/lib/begriffe.ts`) | Die Wörterliste als eine Datei: neuer Begriff, alte Begriffe, kurze Erklärung. Menü, Seitenköpfe und Schnellsuche lesen die Namen daraus. Der Baukasten behält seine eigene Quelle (`bedien-woerter.ts`), dort werden nur die Wörter getauscht. |
| **Wächter-Test** (neu) | Durchsucht die sichtbaren Texte im Lehrkräfte-Bereich (Seiten, Admin- und Werkzeugkiste-Komponenten, ohne Kommentare und Tests, ohne Schulrecht-Wortlaut) nach den alten Begriffen und schlägt bei einem Treffer fehl. So schleichen sich „Fachbereich“, „Prüfungssimulation“, „Prompt“ & Co. auch in neuen Seiten nicht wieder ein. |
| **Schülerseite** | Nur „Prüfung üben“ → „Übungsprüfung“ (Fächer-Seite, Prüfungsseite, Zurück-Beschriftung im Ergebnis). |
| **Abwesenheiten** | Nur Wörter: Menüname und Seitentitel, Filter/Status „Offen“ → „Vertretung fehlt“, Erklärsatz bei „Abteilung“. Aufbau und Logik bleiben (B66–B72 ruhen). |

### C) Daten
Es wird **nichts Neues gespeichert**. Tabellen- und Spaltennamen in der Datenbank (z. B. `departments`, `exam_sets`) bleiben, wie sie sind. Umbenannt wird nur, was Menschen lesen. Der gewählte Bereich liegt wie heute im Cookie (30 Tage). Der Auf-/Zuklapp-Zustand von „Lerninhalte“ und „Verwaltung“ gilt pro Sitzung im Browser (wie heute bei „Weitere Seiten“). Ein neues Cookie gibt es nicht.

### D) Entscheidungen und warum

| Entscheidung | Warum |
|---|---|
| **Seitenadressen bleiben** (`/admin/exam-sets`, `/admin/kalender` …) | Lesezeichen, Links in Lehrerzimmer-Beiträgen, Toasts und Tests bleiben gültig. Die Adresse sieht kaum jemand, den Namen jeder. |
| **Ein Umschalter für alle Rollen** statt zwei | Die Technik dahinter ist schon eins (gleicher Speicherweg). Weg fällt nur die doppelte Oberfläche, und das ist genau der Befund B3. |
| **Sonderfälle als Hinweis am Umschalter** statt einer Leiste auf der Seite | So bleibt eine einzige Stelle, an der man über den Bereich liest. Man wird trotzdem nicht getäuscht, wenn eine Seite den Bereich festhält. |
| **„Alle Bereiche“ bleibt als Wahl** | Lehrkräfte, die in beiden Bereichen unterrichten, nutzen es heute schon. Die Schutzregel (Pflichtauswahl beim Anlegen) bleibt. |
| **Wörterliste als eigene Datei + Wächter-Test** | Ohne Wächter kommen alte Wörter mit jeder neuen Seite zurück. Beim Baukasten hat dieses Muster (`bedien-design.test.tsx`) schon funktioniert. |
| **Alte Namen bleiben als Suchwörter** | Wer seit Monaten „Kalender“ oder „Prüfungssimulation“ sucht, findet die Seite weiter. Sichtbar ist nur der neue Name. |
| **Lerninhalte als Gruppe, nicht als neue Seite** | Phase 3 baut die gemeinsame Seite. Jetzt eine Zwischenseite zu bauen, wäre doppelte Arbeit. |
| **Icons bleiben in Client-Komponenten** | Die Menü-Quelle enthält Icons. Server-Seiten (z. B. „Nachschlagen“) dürfen sie nicht als Funktion weiterreichen, sonst gibt es in Produktion einen Fehler 500 (bekannte Falle, Tests merken es nicht). Die Seite „Nachschlagen“ bekommt ihre Icons deshalb als fertige Elemente. |

### E) Bau-Reihenfolge (jeder Schritt einzeln testbar und committbar)
1. **Menü & Seite „Nachschlagen“ & Konto-Menü**: Menü-Quelle, Seitenleiste, Brotkrumen, Schnellsuche mit alten Namen, neue Seite plus Freigabelisten, Konto-Menü, Kopfzeile, Mein Konto. Tests: `admin-nav`, `admin-shell`, `admin-topbar`, Freigabelisten-Wächter.
2. **Ein Bereichs-Umschalter**: neuer Umschalter mit Sonderfällen, Bereichsleiste aus dem Seitenkopf entfernen, Dialoge auf das gemeinsame Feld umstellen, Bereichsfilter bei Gemeldete Fragen entfernen. Tests: Umschalter je Rolle und Seite, Dialoge mit festem Bereich und mit „Alle Bereiche“.
3. **Wörterliste**: `begriffe.ts`, Wörter in Lehrkräfte-Bereich, Werkzeugkiste, Baukasten, Abwesenheiten und Schülerseite („Übungsprüfung“) tauschen, Wächter-Test, Wörterliste in `docs/DESIGN.md`. Danach `npm run schreibwerk:bauen` und `npm run aufgabenwerk:bauen` (Baukasten-Wörter).
4. **Abschluss**: alle Tests, Build, Befunde im Plan abhaken.

Schritt 1 ist **Frontend**, Schritt 2 **Frontend** (der Server-Endpunkt bleibt), Schritt 3 **Frontend + Texte**. Ein `/backend`-Schritt ist **nicht nötig**.

### F) Abhängigkeiten (Pakete)
Keine neuen. Genutzt wird, was schon da ist: shadcn `Sidebar`, `Collapsible`, `Select`/`DropdownMenu`, `Card`.

### G) Risiken
- **Viele Dateien, wenig Logik:** Die Wörterliste berührt geschätzt 60–100 Dateien. Der Wächter-Test sorgt dafür, dass keine Stelle vergessen wird. Bestehende Tests, die alte Wörter erwarten, werden mit angepasst.
- **Umschalter-Sonderfälle** sind der einzige Teil mit echtem Verhalten. Er wird je Rolle (Lehrkraft, Bereichs-Admin, Super-Admin) und Seitentyp getestet.
- **Kein Dev-Server** auf diesem Rechner: Die Prüfung läuft über Tests und Build. Der Blick im Browser kommt nach dem Livegang auf der echten Seite.

## Implementation Notes (Frontend)

Bau-Reihenfolge aus dem Tech Design: **1 ☑ · 2 ☑ · 3 ☑ · 4 ☐**

### Schritt 1: Menü, „Nachschlagen“, Konto-Menü (27.11.2026)
- `src/lib/admin-nav.ts` neu geordnet: Unterricht · Lerninhalte (aufklappbar) · Werkzeuge und Austausch · Verwaltung (aufklappbar). Neu je Eintrag: `hint`, `aliases` (alte Namen, nur Suchwörter), `subPages` (Schulrecht, Checklisten unter „Nachschlagen“).
- Neue Seite `/admin/nachschlagen`, in `TEACHER_ADMIN_PATHS` freigegeben (keine eigene Schnittstelle).
- Brotkrumen beginnen mit „Start“ und nennen die Gruppe („Start › Lerninhalte › Fragen“). Am Handy steht bei der Seite „Übersicht“ der Titel „Lerninhalte“.
- Konto-Menü: nur „Mein Konto“, „Als Azubi ansehen“, Darstellung, Abmelden. Auch der Eintrag „n Fächer eingetragen“ entfällt. „Zur Lern-App“ in der Kopfzeile ist entfernt. Die Karte „Meine Fächer“ auf „Mein Konto“ gab es schon (PROJ-50). Zusätzlich findet die Schnellsuche „Meine Fächer“ (nur Lehrkräfte).
- Ist eine Gruppe zugeklappt, zeigt ihr Kopf die Summe der Zähler (sonst wäre „Gemeldete Fragen“ unsichtbar).
- Der Aufklapp-Zustand liegt in `sessionStorage`.
- Seitenleiste 18 rem statt 16 rem, damit „Leistungsnachweise · mit Note“ in eine Zeile passt (**noch nicht im Browser geprüft**).
- Mitbehoben: `/admin/kalender/arten` gehörte bisher zum Menüpunkt „Kalender“; jetzt gewinnt die genaueste Adresse.
- Entfernt (ohne Verwendung): Gruppen-Hinweis „alle Bereiche“ (`adminNavGroupHint`, `contentScopeShort`), `usesHofName`, `managerVisible`.
- Die Bereichsleiste unter den Seitentiteln erscheint bis Schritt 2 wie bisher. Seitentitel und übrige Texte folgen in Schritt 3.
- Prüfung: 4766 Tests grün, Build und Lint sauber.

### Schritt 2: Ein Bereichs-Umschalter (27.11.2026)
- Neu ist `bereichs-umschalter.tsx` oben in Seitenleiste und Schublade, für **jede** Rolle. „Alle Bereiche“ steht als letzte Wahl unter den Bereichen. Gibt es nur einen Bereich, erscheint eine ruhige Anzeige.
- Gelöscht: `admin-scope-bar.tsx` (Leiste „Du siehst …“ unter den Seitentiteln, mit Test) und `department-switcher.tsx` (alter Super-Admin-Umschalter). Der Seitenkopf nennt keinen Bereich mehr.
- **Abweichung von der Spec (Edge Case „Nutzer/Änderungsprotokoll fest im eigenen Bereich“):** Seit PROJ-127 folgen beide Seiten auch für Lehrkräfte dem gewählten Bereich. Die alte Leiste zeigte dort trotzdem fest den eigenen Bereich, und das war falsch. Jetzt gilt der Umschalter überall. Ein Hinweis „Auf dieser Seite: …“ erscheint nur, wo die Seite wirklich etwas anderes zeigt: beim **Super-Admin** mit „Alle Bereiche“ auf Nutzer, Einstellungen des Bereichs und Shop-Gegenstände. Diese Seiten zeigen dann den zuletzt gewählten einzelnen Bereich. Dafür liefert das Layout `scope.workingDepartmentId` (`resolveSuperAdminDepartment` ist jetzt exportiert). Lehrkräfte bekommen auf Einstellungen und Shop bei „Alle Bereiche“ wie bisher die Bitte, einen Bereich zu wählen.
- Gemeldete Fragen (B50): Liste und Fach-Auswahl folgten schon dem Bereich. Es reichte, die eigene Leiste zu entfernen.
- Anlegen-Dialoge: Das gemeinsame Feld heißt „Bereich: …“ bzw. „Bereich (Pflicht)“. Der Leistungsnachweis-Dialog übernimmt den Bereich aus dem Umschalter als ruhige Zeile und fragt nur bei „Alle Bereiche“ (Pflicht, ohne Vorauswahl). B24 ist damit für Phase 2 erledigt.
- Server, Cookies und Rechte sind unverändert.
- Prüfung: 4770 Tests grün (neu: `bereichs-umschalter.test.tsx`), Build sauber.

### Schritt 3: Wörterliste (27.11.2026)
- Neu ist `src/lib/begriffe.ts` mit den Namen, den alten Begriffen und dem Erklärsatz zur „Abteilung“. Menü und die Seitenköpfe Übungsprüfungen, Shop-Gegenstände, Einstellungen des Bereichs und Bereiche lesen daraus.
- Neu ist der Wächter `begriffe.test.ts`. Er liest nur sichtbare Texte (keine Kommentare, Code-Namen oder Suchwörter) in Lehrkräfte-Seiten, Admin-Schnittstellen, Komponenten und den zugehörigen `lib`-Dateien. Ausnahmen sind der KI-Auftrag in `process-job.ts` und die Kasten-Überschrift „⭐ IHK-Prüfungssimulation“.
- Wörterliste steht in `docs/DESIGN.md`. Schreibwerk und Aufgabenwerk sind neu gebaut.
- Der Werkzeugkiste-Kern (Python) ist unverändert.
- **Festlegungen, wo die Spec keinen Wortlaut vorgab:**
  - Meldungen: Status „Neu“, Reiter „Zu prüfen“. Fragentyp „Freitext“. So bleibt „Offen“ dem laufenden Leistungsnachweis vorbehalten.
  - Schritte im Assistenten: „Auftrag kopieren“ und „Antwort der KI“ (Schulrecht: „Auftrag kopieren“).
  - Spalte „Fürs Kollegium (Regal)“: „aus“, „an · alle“, „an · Bereich“, „an · 3 Personen“. Der Menüpunkt „Teilen …“ heißt „Fürs Kollegium (Regal) …“.
  - Kasten-Auswahl im Baukasten: „IHK-Prüfung“. Die Überschrift **in** der Lernseite bleibt „⭐ IHK-Prüfungssimulation“, weil fertige Seiten ihren Inhalt nicht ändern (Kern).
  - Neue eigene Seiten beginnen mit „Kapitel 1“. Bestehende Materialien bleiben unverändert.
  - Seitenbeschreibungen auf einen Satz gekürzt (Übersicht, Gemeldete Fragen, Schwierigste Fragen, Meine Fächer, Leistungsnachweise, Themen, Abwesenheiten, Abwesenheitsarten, Checklisten).
- Unverändert: Azubi-Seite außer „Übungsprüfung“ (auch dort „Item“, „Lvl“, „Klasse“; Phase 7).
- Prüfung: 4776 Tests grün, Build sauber. `eslint src` meldet nur einen alten Fehler in `shop-items/[id]/route.test.ts`. **Noch nicht im Browser geprüft** (u. a. Breite der Schrittleiste, der Regal-Spalte und des Knopfs „Als Leistungsnachweis verwenden“ am Handy).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
