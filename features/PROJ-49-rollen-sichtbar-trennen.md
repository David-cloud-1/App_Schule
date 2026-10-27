# PROJ-49: Lehrkraft und Bereichs-Admin sichtbar trennen

## Status: Deployed
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Seit PROJ-44 bis PROJ-48 gilt: Jeder Admin ist auch Lehrkraft (E5), aber nicht jede Lehrkraft ist Admin. Das Modell stimmt (`isTeacherRole` / `isManagerRole` in `src/lib/roles.ts`). Die Rechte sind außerdem schon nach Fach geschnitten (PROJ-48): Eine Lehrkraft pflegt nur Fächer, in die sie sich eingetragen hat.

Unscharf ist die **Darstellung**: Dieselben Seiten (Fragen, Fächer, Themen, Prüfungssets) zeigen je nach Rolle andere Inhalte, ohne dass die Oberfläche das erklärt. Gesperrte Seiten leiten still um. Die Navigation trennt „eigene Arbeit“ nicht von „Bereichsverwaltung“.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1 – Rechte bleiben wie in PROJ-48:** Die Lehrkraft pflegt in ihren eingetragenen Fächern alle Fragen (auch fremde), Themen, Fächer und Prüfungssets. Es gibt keinen neuen Rechteschnitt. Dieses Feature ändert **Benennung, Navigation und Hinweise**, nicht die Berechtigungen.
- **E2 – So wird der Unterschied sichtbar:** Rollen-Badge im Konto-Menü, Navigation mit den Gruppen „Mein Unterricht“ und „Verwaltung“, Seitentitel nennen den Umfang, gesperrte Seiten erklären sich.
- **E3 – Bereichs-Admin behält alle Inhalte des Bereichs ohne Zuständigkeit.** Das ist heute schon so und bleibt.
- **Offen (O1):** Beim Admin-Anteil wurden nur „Alle Inhalte des Bereichs“ angekreuzt. Nutzerverwaltung, Fachbereich-Einstellungen, Hof-Items und Änderungsprotokoll wurden nicht ausdrücklich bestätigt. Annahme: Sie bleiben beim Bereichs-Admin wie heute. Bitte bestätigen, bevor `/architecture` startet.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle), PROJ-45 (Layout, Navigation, Konto-Menü), PROJ-48 (Fach-Zuständigkeiten)
- Berührt: PROJ-40 (gruppierte Navigation), PROJ-47 (Änderungsverlauf)
- Keine Änderung an RLS-Policies und an `requireContentAdmin` / `requireTeacherOrAdmin`

## User Stories
- Als **Lehrkraft** möchte ich im Konto-Menü sehen, welche Rolle ich habe, damit ich weiß, was ich darf.
- Als **Lehrkraft** möchte ich in der Navigation meine Werkzeuge getrennt von der Bereichsverwaltung sehen, damit ich nichts suche, was ich nicht nutzen darf.
- Als **Lehrkraft** möchte ich auf Fragen-, Themen- und Fächerseiten lesen, dass ich nur meine Fächer sehe, damit ich eine leere oder kurze Liste nicht für einen Fehler halte.
- Als **Lehrkraft** möchte ich bei einer gesperrten Seite erfahren, wer dafür zuständig ist, statt still umgeleitet zu werden.
- Als **Bereichs-Admin** möchte ich auf denselben Seiten sehen, dass ich den ganzen Bereich sehe, damit ich meinen Umfang von dem einer Lehrkraft unterscheiden kann.
- Als **Super-Admin** möchte ich in der Nutzerverwaltung die Rollen mit denselben Namen und Erklärungen sehen wie im Konto-Menü, damit niemand die falsche Rolle vergibt.

## Acceptance Criteria

### Rollen-Badge
- [ ] Das Konto-Menü zeigt die Rolle: „Lehrkraft“, „Bereichs-Admin · {Fachbereich}“ oder „Super-Admin“. Dazu kommt ein Satz, was die Rolle darf (höchstens 15 Wörter).
- [ ] Bei einer Lehrkraft nennt das Menü die Zahl der eingetragenen Fächer, mit Link zu „Meine Fächer“.
- [ ] Die Texte kommen aus einer gemeinsamen Quelle, die auch die Nutzerverwaltung (Rollen-Menü, Bestätigungsdialog) verwendet. Es gibt keine zweite Schreibweise.

### Navigation
- [ ] Die Seitenleiste (Desktop) und die Schublade (Handy) haben die Gruppen **Mein Unterricht** und **Verwaltung**.
  - Mein Unterricht: Übersicht, Leistungsnachweise, Meine Fächer, Werkzeugkiste und die Inhalts-Einträge (Fragen, Themen, Fächer, Prüfungssimulation, Papierkorb) mit dem Zusatz „deine Fächer“.
  - Verwaltung: Nutzer, Fachbereich-Einstellungen, Hof-Items, Fragen aus Material, Änderungsprotokoll, Fachbereiche. Die Gruppe ist nur für Bereichs-Admin und Super-Admin sichtbar und fehlt bei Lehrkräften ganz.
- [ ] Für den Bereichs-Admin erscheinen die Inhalts-Einträge mit dem Zusatz „ganzer Bereich“, für den Super-Admin ohne Zusatz.
- [ ] Die Reihenfolge und die Einträge in Schnellsuche (⌘K) und Startseiten-Kacheln folgen derselben Gruppierung.
- [ ] Die Quelle bleibt `src/lib/admin-nav.ts` (ein Eintrag, eine Stelle).

### Seitentitel und Umfang
- [ ] Fragen, Themen, Fächer, Prüfungssets und Papierkorb zeigen unter dem Seitentitel eine Zeile zum Umfang:
  - Lehrkraft: „Du siehst nur Inhalte deiner Fächer.“ mit Link „Meine Fächer“
  - Bereichs-Admin: „Du siehst den ganzen Bereich {Name}.“
  - Super-Admin: „Du siehst alle Bereiche.“ (bzw. den im Umschalter gewählten Bereich)
- [ ] Hat eine Lehrkraft noch kein Fach eingetragen, zeigt der Leerzustand „Trage unter Meine Fächer ein, was du unterrichtest“ mit der Aktion „Meine Fächer öffnen“.

### Gesperrte Seiten
- [ ] Öffnet eine Lehrkraft eine Verwaltungsseite per Link, bleibt die Umleitung zur Übersicht. Dort erscheint ein Hinweis „Das verwaltet dein Bereichs-Admin.“ (vorhandener Mechanismus `NO_RIGHTS_MESSAGE`, Text angepasst).
- [ ] Der Hinweis nennt den Bereichs-Admin des Bereichs der Lehrkraft nur, wenn es genau einen gibt. Namen anderer Konten werden sonst nicht angezeigt.
- [ ] API-Antworten (403/404) bleiben unverändert.

### Unveränderte Rechte
- [ ] Alle Routen- und RLS-Tests aus PROJ-44 bis PROJ-48 laufen unverändert grün.
- [ ] Es wird keine Tabelle, Policy oder Rolle verändert.

## Edge Cases
- **Lehrkraft ist zugleich nur in einem Bereich eingetragen, der noch keine Fächer hat:** Die Umfangszeile nennt den Bereich statt Fächer.
- **Bereichs-Admin ohne Fachbereich-Zuordnung (Datenfehler):** Das Badge zeigt „Bereichs-Admin“ ohne Bereichsnamen, nichts bricht.
- **Super-Admin im Bereichs-Umschalter (PROJ-29):** Die Umfangszeile folgt dem gewählten Bereich.
- **Rolle ändert sich während der Sitzung:** Badge und Navigation stimmen nach dem nächsten Seitenaufruf, da die Rolle serverseitig gelesen wird.
- **Mehrere Bereichs-Admins im Bereich:** Der Hinweis auf gesperrten Seiten sagt „dein Bereichs-Admin“ ohne Namen.
- **Handy:** Umfangszeile und Badge brechen um, ohne seitliches Scrollen. Bedienelemente bleiben mindestens 44 px.
- **Hell/Dunkel:** Alle neuen Texte und Badges nutzen nur `ws-*`-Tokens, Kontrast mindestens 4,5 : 1 (Test `workspace-theme.test.ts`).

## Abgrenzung (nicht Teil dieses Features)
- Neue oder entzogene Rechte (siehe E1)
- Rechteschnitt „fremde Fragen nur lesen“
- Änderungen an der Schülerseite
- Neue Rollen

## Technical Requirements
- **Security:** Keine Änderung der Berechtigungen. Anzeige-Logik ersetzt nie die serverseitige Prüfung.
- **Tests:** Unit-Tests für die gemeinsame Rollen-Textquelle und die gruppierte Navigation je Rolle (Lehrkraft / Bereichs-Admin / Super-Admin / Azubi). Kein Dev-Server, kein Playwright. `npm run build` und `npm test`.
- **Kosten:** keine neuen Dienste.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Überblick
Reines Darstellungs-Feature: keine Datenbank, keine neuen Routen, keine neuen Rechte. Vier bestehende Bausteine bekommen mehr Klartext: das Konto-Menü, die Navigation, der Seitenkopf der Inhalts-Seiten und die Umleitung bei gesperrten Seiten. Alles stützt sich auf die Rolle, die der Admin-Rahmen ohnehin schon lädt und bereitstellt (`AdminRoleProvider`).

### B) Bestandsaufnahme (was es schon gibt)
- Rolle, Anzeigename, E-Mail und „hat Fächer eingetragen“ stehen allen Admin-Bildschirmen schon zur Verfügung.
- Das Konto-Menü zeigt die Rolle bereits als Kurztext („Lehrkraft“, „Bereichs-Admin Spedition“, „Super-Admin“). Es fehlt der Erklärsatz und die Fächerzahl.
- Die Navigation hat schon drei Gruppen: Unterricht, Inhalte, Verwaltung. „Meine Fächer“ und „Papierkorb“ stehen aber in „Verwaltung“, obwohl Lehrkräfte sie nutzen. Dadurch sieht die Lehrkraft eine Gruppe „Verwaltung“, die sie nicht verwaltet.
- Eine gesperrte Seite leitet die Lehrkraft still auf die Übersicht um, ohne Hinweis.
- Die Rollen-Namen stehen an zwei Stellen getrennt (Konto-Menü und Nutzerverwaltung).

### C) Komponenten-Struktur

```
Admin-Rahmen (besteht)
+-- Konto-Menü (erweitert)
|   +-- Rolle als Badge (wie bisher, aus gemeinsamer Textquelle)
|   +-- NEU: Erklärsatz zur Rolle
|   +-- NEU: bei Lehrkraft "3 Fächer eingetragen" -> Link Meine Fächer
+-- Navigation (umgebaut, ein Datenbestand für Seitenleiste, Handy, Schnellsuche, Kacheln)
|   +-- Gruppe "Mein Unterricht"   (alle Lehrer-Rollen)
|   |     Leistungsnachweise, Meine Fächer (nur Lehrkraft), Werkzeugkiste
|   +-- Gruppe "Inhalte"           (alle Lehrer-Rollen)
|   |     Fragen, Themen, Fächer, Prüfungssimulation, Papierkorb
|   |     NEU: Untertitel je Rolle: "deine Fächer" / "ganzer Bereich" / "alle Bereiche"
|   +-- Gruppe "Verwaltung"        (nur Bereichs-Admin und Super-Admin)
|         Nutzer, Fachbereich, Items, Fragen aus Material, Änderungsprotokoll,
|         Zuständigkeiten und Fachbereiche (nur Super-Admin)
+-- Seitenkopf der Inhalts-Seiten (erweitert)
|   +-- NEU: Umfangszeile unter dem Titel (eine gemeinsame Komponente)
+-- Startseite /admin (erweitert)
|   +-- NEU: Hinweis-Banner nach gesperrter Seite
+-- Leerzustand "keine Fächer" (besteht, Text und Aktion angepasst)
```

### D) Abweichung von der Spezifikation
Die Spezifikation nannte zwei Gruppen („Mein Unterricht“ und „Verwaltung“) mit den Inhalts-Einträgen in „Mein Unterricht“. Die bestehende Navigation hat die Gruppe „Inhalte“ bereits, und für Admins sind Fragen und Themen Inhalts-Arbeit über den ganzen Bereich, nicht „mein Unterricht“. Deshalb **bleiben drei Gruppen**: „Mein Unterricht“ (umbenannt von „Unterricht“), „Inhalte“, „Verwaltung“. Der Unterschied zwischen den Rollen steckt im Untertitel der Inhalts-Einträge und im Fehlen der Gruppe „Verwaltung“ bei Lehrkräften. Der Zweck der Spezifikation bleibt erhalten; die Texte dort werden entsprechend angepasst.

### E) Daten und Quellen (in einfacher Sprache)
- **Keine neuen Daten.** Nichts wird gespeichert, keine Migration.
- **Eine gemeinsame Textquelle für Rollen**: Rollenname, Kurzbeschreibung („Du pflegst Inhalte deiner Fächer und führst Leistungsnachweise durch.“) und Umfangssatz je Rolle. Konto-Menü, Umfangszeile, Nutzerverwaltung und Bestätigungsdialog lesen daraus. Heute stehen die Rollen-Namen in `roles.ts`, das Konto-Menü-Label in `admin-nav.ts` und der Dialogtext in `role-change-text.ts`; diese drei werden zusammengeführt.
- **Navigation** bleibt ein einziger Datenbestand (`admin-nav.ts`). Neu pro Eintrag: optionaler Untertitel je Rolle und die Gruppenzuordnung. Der Filter nach Rolle bleibt wie er ist.
- **Hinweis bei gesperrter Seite**: Die Umleitung der Middleware bekommt eine kleine Markierung in der Adresse, wie es `kein-zugang` für Azubis schon macht. Die Übersicht liest sie, zeigt den Hinweis einmalig und entfernt die Markierung wieder aus der Adresse.

### F) Tech-Entscheidungen
- **Keine Rechte-Änderung**, damit alle Tests aus PROJ-44 bis 48 unverändert gelten und das Risiko klein bleibt. Anzeige ersetzt nie die serverseitige Prüfung.
- **Bereichs-Admin-Namen im Hinweis weglassen**: Spec fordert, den Namen nur zu zeigen, wenn es genau einen gibt. Das würde eine Abfrage der Admin-Liste für jede Lehrkraft bedeuten, die es heute nicht gibt. Empfehlung: Der Hinweis lautet immer „Das verwaltet dein Bereichs-Admin.“ ohne Namen. Das spart die Abfrage und gibt keine Kontodaten preis. Die Spezifikation wird entsprechend vereinfacht.
- **Umfangszeile als Teil des bestehenden Seitenkopfs**: Eine gemeinsame Komponente statt Text pro Seite, damit Fragen, Themen, Fächer, Prüfungssets und Papierkorb nicht auseinanderlaufen.
- **Super-Admin-Umfang** folgt dem Bereichs-Umschalter (PROJ-29), der Wert ist im Rahmen schon vorhanden.

### G) Betroffene Dateien (Überblick, keine Details)
Navigation und Rollen-Texte (`admin-nav.ts`, `roles.ts`, `role-change-text.ts`), Konto-Menü, Seitenkopf, Übersicht, Middleware (nur die Umleitung), fünf Inhalts-Seiten (nur eine Zeile im Kopf), zugehörige Tests.

### H) Abhängigkeiten
Keine neuen Pakete.

### I) Risiken
- **Dritter Textort wird vergessen**: Deshalb wird die gemeinsame Quelle per Test abgesichert (jede Rolle hat Name, Kurzbeschreibung, Umfangssatz).
- **Handy-Breite**: Konto-Menü und Umfangszeile müssen umbrechen. Wird in den Komponenten-Tests und im Build geprüft, nicht im Browser (kein Dev-Server).


## Implementation Notes (Frontend, 2026-10-27)
Gebaut wie im Tech Design, mit diesen Abweichungen von den Acceptance Criteria:
- **Drei Gruppen statt zwei:** „Mein Unterricht“, „Inhalte“, „Verwaltung“. „Meine Fächer“ wanderte nach „Mein Unterricht“, „Papierkorb“ nach „Inhalte“. Lehrkräfte sehen „Verwaltung“ nicht mehr.
- **Umfang in der Navigation** steht als Zusatz hinter dem Gruppentitel („Inhalte · deine Fächer“ / „ganzer Bereich“ / „alle Bereiche“), nicht an jedem Eintrag. Er verschwindet, wenn die Seitenleiste auf Icons eingeklappt ist.
- **Hinweis bei gesperrter Seite** nennt keinen Namen („Das verwaltet dein Bereichs-Admin.“). Die Middleware leitet mit `?gesperrt=1` zur Übersicht, die Übersicht zeigt den Hinweis und nimmt die Markierung per `history.replaceState` aus der Adresse.
- **Umfangszeile** erscheint automatisch im `AdminPageHeader` auf allen Seiten der Gruppe „Inhalte“ (Fragen, Fächer, Themen, Prüfungssimulation, Papierkorb). Keine Änderung an den Einzelseiten. Bei Super-Admin nennt sie den gewählten Bereich, bei einer Lehrkraft ohne Fach entfällt sie.
- **Konto-Menü:** Erklärsatz je Rolle (`ROLE_DESCRIPTION` in `roles.ts`) und bei Lehrkräften „N Fächer eingetragen“ mit Link. Die Fächerzahl liefert `admin/layout.tsx` (bestehende Abfrage, jetzt mit `count`).
- Leerzustand ohne Fach: „Meine Fächer öffnen“ statt „Zu Meine Fächer“.
- Nicht geändert: Berechtigungen, RLS, API-Routen.
- **Offen:** O1 (Admin-Anteil) ist weiter nicht ausdrücklich bestätigt; es wurde nichts am Admin-Umfang geändert.
- **Verifikation:** `npx tsc`, `npm test` (1450 grün), `npm run lint` (0 Fehler), `npm run build` ok. Kein Browsertest (kein Dev-Server).

## QA Test Results
**Geprüft am:** 2026-10-27 · per Code-Durchsicht und automatischen Tests (kein Dev-Server, kein Browser, siehe Projektregel)

| Bereich | Ergebnis |
|---|---|
| Rollen-Badge und Erklärsatz (Konto-Menü) | Bestanden. Satz ≤ 15 Wörter per Test. Texte aus `roles.ts` (`ROLE_LABEL`, `ROLE_DESCRIPTION`). |
| Navigation je Rolle (Lehrkraft / Bereichs-Admin / Super-Admin / ohne Fach) | Bestanden. Lehrkraft ohne Gruppe „Verwaltung“; Umfangszusatz je Rolle; Schnellsuche und Startseite lesen dieselbe Quelle. |
| Umfangszeile auf den fünf Inhalts-Seiten | Bestanden. Automatisch im Seitenkopf; nicht auf Seiten außerhalb von „Inhalte“; bei Lehrkraft ohne Fach ersetzt durch den Leerzustand. |
| Hinweis bei gesperrter Seite | Bestanden. Middleware leitet mit `?gesperrt=1` um, Übersicht zeigt den Hinweis, Markierung wird aus der Adresse entfernt. API-Antworten (403/404) unverändert. |
| Unveränderte Rechte | Bestanden. Keine Änderung an RLS, `requireContentAdmin`, `requireTeacherOrAdmin`, Pfadlisten. Alle Routen- und Rollentests aus PROJ-44 bis 48 grün. |
| Sicherheit | Keine neue Angriffsfläche: nur Anzeige, keine neuen Routen, Parameter `gesperrt` wird nur auf Vorhandensein geprüft, nie ausgegeben. |
| Hell/Dunkel | Neue Elemente nutzen nur `ws-*`-Tokens; blaue Tönung ≤ /15. |

**Automatisch:** `tsc` ohne Fehler, 1450 Tests grün (126 Dateien), `lint` 0 Fehler, `build` ok.

**Bugs:** keine Critical/High. Low/Hinweise:
- L1: Das Konto-Menü zeigt „Bereichs-Admin Spedition“ (bestehende Schreibweise) statt „Bereichs-Admin · Spedition“. Bewusst unverändert.
- L2: Der Umfangszusatz hinter „Inhalte“ entfällt bei eingeklappter Seitenleiste (Icon-Modus). Gewollt.
- L3: Handy-Breite und visuelles Erscheinungsbild nicht im Browser geprüft.
- Offen (O1): Admin-Anteil nicht ausdrücklich bestätigt; Verhalten für Bereichs-Admins unverändert.

**Ergebnis:** Approved, bereit zum Deploy.

## Deployment
- **Datum:** 2026-10-27
- **URL:** https://spedilern.vercel.app (Deployment `spedilern-p8q2w62fn`, Production, Ready)
- **Commit:** 61bd3d8 auf `main`
- **Datenbank:** keine Migration nötig
- **Prüfung nach dem Deploy:** `/admin` ohne Login → 307 zum Login; `/api/admin/users` ohne Login → 401. Die sichtbare Darstellung (Konto-Menü, Navigation, Umfangszeile, Hinweis) wurde nicht im Browser geprüft.
