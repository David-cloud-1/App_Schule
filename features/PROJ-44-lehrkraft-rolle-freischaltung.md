# PROJ-44: Lehrkraft-Rolle & Freischaltung

## Status: Deployed
**Created:** 2026-10-26
**Last Updated:** 2026-10-26

## Kontext
Erster Baustein der „Super-App für Lehrkräfte“: Die Lern-App bleibt für Azubis wie sie ist. Lehrkräfte sollen über **ein** Konto alle Lehrer-Werkzeuge nutzen, auch ohne einem Fachbereich zugeordnet zu sein. Heute gibt es nur drei Rollen (`student`, `department_admin`, `admin`). Ein `department_admin` ist immer an einen Fachbereich gebunden und verwaltet dessen Inhalte. Eine Lehrkraft, die „nur“ unterrichtet, gibt es nicht.

Gesamtplan (Reihenfolge mit dem Nutzer am 2026-10-26 abgestimmt):
1. **PROJ-44** Lehrkraft-Rolle & Freischaltung (dieses Feature)
2. **PROJ-45** Lehrkräfte-Arbeitsbereich: modernes Layout für Desktop und Handy, hell/dunkel
3. **PROJ-46** Leistungsnachweise für Lehrkräfte ohne Fachbereich
4. **PROJ-47** Änderungsverlauf & Wiederherstellen für Inhalte
5. **PROJ-48** Fach-Zuständigkeiten für Lehrkräfte (selbst eingetragen)
6. später: Werkzeugkiste mit gemeinsamem Login (einheitliches Konto statt eigener Kürzel-Konten)
7. später: Ablage & „Regal des Kollegiums“ der Werkzeugkiste in die App übernehmen

### Entscheidungen (Nutzer, 2026-10-26)
- **E1 – Kein Selbstauswahl-Feld:** Lehrkräfte registrieren sich genau wie Azubis. Es gibt **keine** Auswahl „Ich bin Lehrkraft“ und keine Anfrage-Funktion, weil Schüler das ausnutzen würden. Der Super-Admin kennt das Kollegium und macht passende Konten selbst zur Lehrkraft.
- **E2 – Jede E-Mail-Adresse:** Keine Pflicht zur Schuladresse. Geprüft wird ausschließlich durch die Freischaltung des Super-Admins.
- **E3 – Spielen optional, inkognito:** Eine Lehrkraft landet nach dem Login im Lehrkräfte-Bereich. Die Lern-App kann sie weiter normal nutzen und darf auch in der Rangliste mitspielen, dort aber **immer unter Pseudonym** und **ohne Kennzeichnung als Lehrkraft**. Das gilt für alle Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin).
- **E4 – Bescheid in der App:** Keine E-Mail. Beim nächsten Öffnen nach der Freischaltung sieht die Lehrkraft einmalig einen Willkommens-Hinweis.
- **E5 – Bereichs-Admin = Lehrkraft plus:** Ein Bereichs-Admin hat alle Rechte einer Lehrkraft und zusätzlich die Verwaltungsrechte im eigenen Fachbereich.
- **E6 – Rolle entziehen:** Die Person verliert sofort den Zugriff. Ihre erstellten Inhalte (z. B. Leistungsnachweise und Noten, PROJ-46) bleiben erhalten und sind nur noch für den Super-Admin sichtbar.

## Dependencies
- Requires: PROJ-1 (User Authentication) – normale Registrierung und Login
- Requires: PROJ-24 (Fachbereichs-Admins & Rechtetrennung) – Rollenmodell, `requireAdmin()`, Rollenvergabe nur durch Super-Admin, Schutz des letzten Super-Admins
- Requires: PROJ-40 (Lehrkräfte-Bereich übersichtlicher) – Startseite und gruppierte Navigation, die hier rollenabhängig gefiltert werden
- Berührt: PROJ-8 (Leaderboard) – Lehrer-Konten erscheinen dort nur unter Pseudonym
- Berührt: PROJ-29 (Bereichs-Umschalter / verknüpfte Konten) – bestehende Zweitkonten dürfen nicht kaputtgehen
- Blockiert: PROJ-45 (rollenabhängige Navigation), PROJ-46 (Nachweise ohne Fachbereich)

## User Stories
- Als **Super-Admin** möchte ich ein bestehendes Konto in der Nutzerverwaltung zur Lehrkraft machen, damit Kolleginnen und Kollegen die Lehrer-Werkzeuge nutzen können, ohne einen Fachbereich verwalten zu müssen.
- Als **Super-Admin** möchte ich Konten über alle Fachbereiche hinweg nach Name oder E-Mail suchen, damit ich eine Lehrkraft finde, egal über welche Bereichs-Adresse sie sich registriert hat.
- Als **Super-Admin** möchte ich alle Lehrkräfte und Bereichs-Admins auf einen Blick sehen, damit ich weiß, wer Zugang zum Lehrkräfte-Bereich hat.
- Als **Super-Admin** möchte ich einer Lehrkraft die Rolle jederzeit wieder entziehen, damit jemand, der die Schule verlässt, sofort keinen Zugriff mehr hat.
- Als **Lehrkraft** möchte ich nach dem Login direkt im Lehrkräfte-Bereich landen, damit ich nicht erst durch die Schüler-App muss.
- Als **Lehrkraft** möchte ich nach meiner Freischaltung einmal kurz erklärt bekommen, was ich jetzt kann, damit ich weiß, wo ich anfange.
- Als **Lehrkraft** möchte ich im Lehrkräfte-Bereich nur sehen, was ich auch nutzen darf, damit die Oberfläche übersichtlich bleibt.
- Als **Lehrkraft** möchte ich in der Lern-App und der Rangliste mitspielen können, ohne als Lehrkraft erkannt zu werden, damit ich sehe, was meine Schüler sehen, und die Azubis nicht befangen sind.
- Als **Azubi** möchte ich, dass sich niemand selbst Lehrer-Rechte geben kann, damit Noten und Klassenarbeiten geschützt bleiben.

## Acceptance Criteria

### Rolle
- [ ] Es gibt eine neue Rolle **„Lehrkraft“**. Sie braucht keinen Fachbereich.
- [ ] Die Registrierung bleibt unverändert: kein Feld, keine Auswahl und kein Hinweis auf eine Lehrkraft-Rolle (E1). Jedes neue Konto ist ein Azubi-Konto.
- [ ] Nur der Super-Admin kann die Rolle „Lehrkraft“ vergeben oder entziehen. Ein Bereichs-Admin kann das nicht (Oberfläche ausgeblendet, Server lehnt mit 403 ab).
- [ ] Niemand kann sich die Rolle selbst geben, auch nicht per direktem Datenbank- oder API-Aufruf. Der bestehende Spaltenschutz auf `profiles.role` gilt weiter.
- [ ] Ein Bereichs-Admin hat automatisch alle Rechte einer Lehrkraft (E5). Für ihn ändert sich gegenüber heute nichts, außer dass die Lehrkraft-Funktionen dazukommen.
- [ ] Rollenwechsel wirken bei der nächsten Anfrage. Die Rolle wird serverseitig bei jeder Anfrage aus der Datenbank gelesen, nicht aus dem Login-Token.

### Nutzerverwaltung (Super-Admin)
- [ ] Die Nutzerverwaltung hat eine Suche nach Name oder E-Mail über **alle** Fachbereiche hinweg, unabhängig vom gewählten Bereich im Umschalter.
- [ ] Es gibt einen Filter nach Rolle: Alle · Azubis · Lehrkräfte · Bereichs-Admins · Super-Admin.
- [ ] Im Rollen-Menü eines Kontos steht „Lehrkraft“ als Auswahl, zusätzlich zu Azubi, Bereichs-Admin und Super-Admin.
- [ ] Vor jedem Rollenwechsel erscheint ein Bestätigungsdialog mit Name **und** E-Mail-Adresse des Kontos, damit keine Verwechslung bei gleichen Namen passiert.
- [ ] Jeder Rollenwechsel wird im Änderungsprotokoll mit alter und neuer Rolle erfasst (wie heute `user.role_change`).
- [ ] Die Liste zeigt pro Lehrkraft und Bereichs-Admin das Datum des letzten Logins, damit verwaiste Zugänge auffallen.

### Rolle entziehen (E6)
- [ ] Wird eine Lehrkraft zum Azubi zurückgestuft, kommt sie ab der nächsten Anfrage nicht mehr in den Lehrkräfte-Bereich (Seiten leiten in die Lern-App um, API antwortet 403).
- [ ] Ihre erstellten Inhalte bleiben unverändert gespeichert. Der Bestätigungsdialog weist darauf hin: „Erstellte Inhalte bleiben erhalten und sind danach nur noch für dich sichtbar.“
- [ ] Wird die Lehrkraft später erneut freigeschaltet, sieht sie ihre früheren Inhalte wieder.

### Lehrkräfte-Bereich für die Rolle „Lehrkraft“
- [ ] Nach dem Login landen alle Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin) im Lehrkräfte-Bereich, nicht auf der Spieler-Startseite (Nutzer-Entscheidung 2026-10-26). Ein `?redirect=` aus einem Link (z. B. Druckansicht) hat Vorrang.
- [ ] Navigation und Startseite zeigen der Lehrkraft nur ihre Einträge: Übersicht, Leistungsnachweise (sobald PROJ-46 live ist) und Werkzeugkiste. Fragen, Nutzer, Fächer, Themen, Prüfungssimulation, Fragen aus Material, Fachbereich-Einstellungen, Hof-Items, Änderungsprotokoll und Fachbereiche sind ausgeblendet.
- [ ] Alle Bereichs-Verwaltungsseiten und ihre API-Routen lehnen eine Lehrkraft serverseitig ab (Seite: Umleitung zur Übersicht, API: 403). Ausblenden allein reicht nicht.
- [ ] Bis PROJ-46 live ist, zeigt die Startseite der Lehrkraft statt der Leistungsnachweis-Kachel nichts Kaputtes: entweder gar keine Kachel oder eine klar als „bald verfügbar“ markierte.
- [ ] Der Bereichs-Umschalter (PROJ-29) erscheint für Lehrkräfte nicht.

### Willkommen (E4)
- [ ] Beim ersten Öffnen des Lehrkräfte-Bereichs nach der Freischaltung erscheint einmalig ein kurzer Willkommens-Hinweis (höchstens 3 Sätze plus „Los geht’s“), der die verfügbaren Werkzeuge nennt.
- [ ] Nach dem Schließen erscheint er auf keinem Gerät wieder (gemerkt am Konto, nicht nur im Browser).
- [ ] Es wird keine E-Mail verschickt.

### Lern-App für Lehrkräfte (E3)
- [ ] Im Lehrkräfte-Bereich gibt es einen gut sichtbaren Wechsel „Zur Lern-App“, in der Lern-App einen Wechsel zurück „Zum Lehrkräfte-Bereich“.
- [ ] Lehrer-Konten (Lehrkraft, Bereichs-Admin, Super-Admin) erscheinen in der Rangliste wie normale Spieler, aber **immer unter ihrem Pseudonym**. Der Klarname wird dort nie angezeigt, auch wenn „Echten Namen zeigen“ eingeschaltet ist.
- [ ] Weder Rangliste noch Spielerprofil noch sonst ein für Azubis sichtbarer Ort zeigt, dass ein Konto eine Lehrer-Rolle hat (kein Abzeichen, kein Hinweis, kein abweichendes Aussehen).
- [ ] Hat ein Lehrer-Konto noch kein Pseudonym, bekommt es beim Rollenwechsel automatisch eines nach den bestehenden Regeln. Die Lehrkraft kann es danach selbst ändern.
- [ ] Der Ranglisten-Opt-out (`leaderboard_opt_out`) funktioniert für Lehrkräfte wie für alle.
- [ ] Bestehende XP, Münzen, Streak und Hof eines Kontos bleiben beim Rollenwechsel erhalten (nichts wird gelöscht).
- [ ] Lehrkräfte werden aus Nutzungs-Auswertungen über Azubis herausgerechnet (z. B. Fun-Audit-Kennzahlen, Klassen-Statistiken), so wie heute verknüpfte Zweitkonten.

## Edge Cases
- **Schüler tarnt sich:** Ein Azubi registriert sich mit dem Namen einer Lehrkraft. → Er bleibt Azubi, bis der Super-Admin ihn freischaltet. Der Bestätigungsdialog zeigt die E-Mail-Adresse, damit die Verwechslung auffällt.
- **Falsches Konto freigeschaltet:** Der Super-Admin macht versehentlich einen Azubi zur Lehrkraft. → Er kann sofort zurückstufen. Die Rolle wirkt ab der nächsten Anfrage, das Änderungsprotokoll zeigt beide Wechsel.
- **Rolle wird während einer laufenden Sitzung entzogen:** Die Lehrkraft hat den Bereich offen. → Die nächste Aktion oder der nächste Seitenaufruf scheitert mit einem verständlichen Hinweis und einer Umleitung in die Lern-App. Es bleiben keine Altrechte aus zwischengespeicherten Sitzungen.
- **Lehrkraft mit doppeltem Konto:** Eine Kollegin hat sich zweimal registriert (privat und dienstlich). → Beide erscheinen in der Suche mit E-Mail. Der Super-Admin schaltet eines frei. Ein Zusammenführen von Konten ist nicht Teil dieses Features.
- **Login über Google/Apple:** Eine Lehrkraft meldet sich per OAuth an. → Sie wird genauso freigeschaltet und behandelt wie ein E-Mail-Konto.
- **Konto wird gelöscht:** Löscht sich eine Lehrkraft selbst oder wird sie gelöscht, gelten dieselben Regeln wie heute für Admins. Erstellte Leistungsnachweise bleiben erhalten (`created_by` wird leer) und sind für den Super-Admin sichtbar.
- **Super-Admin stuft sich selbst zur Lehrkraft herab:** Der bestehende Schutz des letzten Super-Admins verhindert das, wenn er der letzte ist.
- **Bereichs-Admin wird zur Lehrkraft herabgestuft:** Er verliert die Verwaltungsrechte für seinen Fachbereich, behält aber die Lehrkraft-Funktionen. Sein `department_id` bleibt gespeichert (für den Wechsel in die Lern-App), gibt aber keine Rechte.
- **Lehrkraft-Konto mit Fachbereich:** Das Konto hat durch die Registrierung über eine Bereichs-Adresse bereits einen Fachbereich. → Der Fachbereich bestimmt nur, welche Lern-App sie sieht. Er gibt keine Verwaltungsrechte.
- **Azubi kennt das Pseudonym der Lehrkraft** (z. B. weil sie es in der Klasse erwähnt): Das ist ihre eigene Entscheidung. Die App verrät es nicht.
- **Pseudonym klingt nach Klarnamen** (z. B. „FrauPettinger“): Es gelten die bestehenden Pseudonym-Regeln. Eine zusätzliche Prüfung gibt es nicht.
- **Verknüpftes Zweitkonto (PROJ-29):** Das Tourismus-Testkonto des Super-Admins bleibt ein Azubi-Konto. Der Sitzungswechsel funktioniert unverändert.

## Abgrenzung (nicht Teil dieses Features)
- Neues Layout, Seitenleiste neu, hell/dunkel → PROJ-45
- Leistungsnachweise für Lehrkräfte → PROJ-46
- Inhalte pflegen (Fragen, Themen, Fächer) für eigene Fächer → PROJ-48, abgesichert durch PROJ-47
- Werkzeugkiste mit gemeinsamem Login, Ablage und Regal → spätere Features. Bis dahin bleibt die Werkzeugkiste ein externer Link.
- Klassen- oder Kurs-Zuordnung von Azubis zu Lehrkräften
- Mehrere Schulen

## Technical Requirements
- **Security:** Prüfung von Rolle und Rechten hart auf Server- und Datenbankebene. Jede neue oder geänderte RLS-Policy bekommt Rückweg-SQL im selben Commit. Lehrkräfte dürfen über RLS keine Profile, Noten oder Inhalte von Fachbereichen lesen, für die sie keine Rechte haben.
- **Regression:** Für die 11 Bereichs-Admins und den Super-Admin ändert sich nichts außer den neuen Lehrkraft-Funktionen. Routen-Tests je Rolle: Super-Admin / Bereichs-Admin / Lehrkraft / Azubi.
- **Tests:** Vitest und `npm run build`, RLS-Matrix per SQL in einer Transaktion mit Rollback. Kein Dev-Server und kein Playwright (Projekt-Memory „Kein Dev-Server“).
- **Kosten:** keine neuen Dienste, kein E-Mail-Versand.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage (geprüft am 2026-10-26)
- **Datenbank ist schon „fail closed“:** Ein Abgleich mit der Live-Datenbank zeigt, dass alle Zugriffsregeln (RLS) und Hilfsfunktionen gezielt nach `admin` oder `department_admin` fragen. Keine Regel behandelt „alles außer Azubi“ als Admin. Eine neue Rolle hat also von sich aus **keinerlei** zusätzliche Datenbank-Rechte. Für PROJ-44 muss deshalb **keine einzige Zugriffsregel geändert** werden.
- **Rollenprüfungen im Code sind verstreut:** An rund acht Stellen steht sinngemäß „ist admin oder department_admin“ (Middleware `proxy.ts`, Admin-Layout, Spieler-Startseite, Spieler-Menü, `requireAdmin()`, Navigation, Nutzerverwaltung). Genau dort entscheidet sich, ob eine Lehrkraft hineinkommt.
- **Pseudonyme gibt es für alle:** Jedes Konto bekommt beim Anlegen automatisch ein Pseudonym (seit PROJ-22). Die Rangliste zeigt heute den Klarnamen, wenn „Echten Namen zeigen“ an ist.
- **Fun-Audit zählt schon nur Azubis:** Das Auswertungsskript filtert bereits auf `student` und schließt Zweitkonten aus. Lehrkräfte fallen dort automatisch heraus.
- **Letzter Login ist vorhanden:** Die Nutzerverwaltung lädt die Login-Konten ohnehin. Das Datum des letzten Logins steht dort mit drin und muss nur angezeigt werden.

### A) Aufbau (Komponenten-Baum)

```
Nach dem Login
└── Start-Weiche (NEU, unsichtbar)
    → alle Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin) → Lehrkräfte-Bereich (Übersicht)
    → Azubis → Spieler-Startseite (wie heute)
    → ein ?redirect= aus einem Link hat immer Vorrang

Lehrkräfte-Bereich (bestehendes Grundgerüst aus PROJ-40)
├── Seitenleiste / Menü (bestehend, Rollenfilter erweitert)
│   ├── Lehrkraft sieht: Übersicht · Werkzeugkiste
│   │   (Leistungsnachweise kommen mit PROJ-46 dazu)
│   ├── Bereichs-Admin sieht: wie heute
│   └── Super-Admin sieht: wie heute
├── Übersicht / Startseite (bestehend)
│   ├── Kacheln nach Rolle gefiltert (Lehrkraft: Werkzeugkiste)
│   └── Willkommens-Hinweis (NEU, einmalig für frisch freigeschaltete Lehrkräfte)
│       → 3 Sätze + „Los geht’s“
├── „Zur Lern-App“ (bestehend als „Zurück zur App“, bleibt)
└── Nutzerverwaltung (bestehend, nur Super-Admin-Teile erweitert)
    ├── Suchfeld Name/E-Mail (NEU)
    ├── Umschalter „Nur dieser Bereich / Alle Bereiche“ (NEU, nur Super-Admin)
    ├── Rollen-Filter: Alle · Azubis · Lehrkräfte · Bereichs-Admins · Super-Admin (NEU)
    ├── Spalte „Letzter Login“ für Lehrer-Rollen (NEU)
    └── Rollen-Menü je Konto: + „Lehrkraft“ (erweitert)
        └── Bestätigungsdialog mit Name UND E-Mail (erweitert)
            → beim Entziehen: Hinweis „Erstellte Inhalte bleiben erhalten …“

Lern-App (Spielerseite)
├── Spieler-Menü: Eintrag heißt „Lehrkräfte-Bereich“, sichtbar für alle Lehrer-Rollen
├── Rangliste: Lehrer-Rollen immer unter Pseudonym, kein Hinweis auf die Rolle
└── Profil → „Echten Namen zeigen“: für Lehrer-Rollen ausgeblendet,
    stattdessen ein Satz: „In der Rangliste erscheinst du immer unter deinem Fantasienamen.“ (neutral formuliert, ohne Rollenhinweis; QA BUG-5c)
```

### B) Datenmodell (in einfachen Worten)

- **Rolle:** Jedes Profil hat weiterhin genau **eine** Rolle. Zu Azubi, Bereichs-Admin und Super-Admin kommt **„Lehrkraft“** dazu (technischer Name `teacher`). Die erlaubten Werte stehen in einer Datenbank-Regel. Diese wird um den neuen Wert erweitert.
- **„Lehrer-Rollen“ als Begriff:** Lehrkraft, Bereichs-Admin und Super-Admin gelten gemeinsam als Lehrer-Rollen. Das bestimmt, wer in den Lehrkräfte-Bereich darf und wer in der Rangliste nur unter Pseudonym erscheint. Die Verwaltungsrechte haben weiterhin nur Bereichs-Admin und Super-Admin.
- **Willkommen gesehen (NEU):** Ein Ja/Nein-Feld am Profil, Standard „nein“. Die Lehrkraft darf es selbst auf „ja“ setzen, so wie heute schon „Startmünzen gesehen“. Weil es am Konto hängt und nicht im Browser, erscheint der Hinweis auf keinem Gerät ein zweites Mal.
- **Fachbereich einer Lehrkraft:** bleibt so, wie er bei der Registrierung gesetzt wurde. Er bestimmt nur, welche Lern-App sie sieht, und gibt keine Rechte.
- **Unverändert:** XP, Münzen, Streak, Hof und Pseudonym. Beim Rollenwechsel wird nichts gelöscht.
- **Änderungsprotokoll:** Rollenwechsel werden schon heute als `user.role_change` mit alter und neuer Rolle gespeichert. Das gilt automatisch auch für „Lehrkraft“.
- Gespeichert wird alles in der bestehenden Supabase-Datenbank. Es gibt keinen neuen Dienst und keinen E-Mail-Versand.

### C) Technische Entscheidungen (Begründung)

1. **Neue eigene Rolle statt „Bereichs-Admin ohne Bereich“:** Ein Bereichs-Admin ohne Bereich ist heute absichtlich komplett gesperrt (Sicherheitsregel aus PROJ-24). Diese Regel aufzuweichen wäre riskanter als eine klar benannte neue Rolle, die von Anfang an nichts darf außer dem, was wir ihr ausdrücklich erlauben.

2. **Eine zentrale Stelle für „Wer darf was“:** Statt an acht Stellen einzeln „admin oder department_admin“ zu prüfen, gibt es künftig **eine** gemeinsame Rollen-Übersicht im Code: welche Rollen Lehrer-Rollen sind und welche verwalten dürfen. Alle bisherigen Stellen fragen dort nach. Das verhindert, dass eine Stelle vergessen wird, und erleichtert PROJ-46 und PROJ-48, die dort nur noch neue Rechte ergänzen.

3. **Zwei Tore statt einem:**
   - **Tor 1, Lehrkräfte-Bereich:** Hier kommen alle Lehrer-Rollen hinein (Seiten unter `/admin`).
   - **Tor 2, Verwaltung:** Die bestehende Prüfung `requireAdmin()` bleibt für alle Verwaltungsschnittstellen **unverändert** und lässt nur Bereichs-Admins und den Super-Admin durch. Eine Lehrkraft prallt dort automatisch mit 403 ab, auch wenn wir eine Seite vergessen würden.

   Zusätzlich lässt die Middleware eine Lehrkraft nur auf die für sie freigegebenen Seiten (vorerst nur die Übersicht). Jede andere Verwaltungsseite leitet sie zur Übersicht um. So gibt es doppelte Absicherung, wie in der Spec gefordert.

4. **Start-Weiche statt Zwangsumleitung:** Würde die Spieler-Startseite jede Lehrkraft sofort in den Lehrkräfte-Bereich schicken, käme sie nie mehr in die Lern-App. Deshalb landet ein Login (auch über Google/Apple) zuerst bei einer kleinen unsichtbaren Weiche, die nach Rolle verteilt. Wer danach bewusst „Zur Lern-App“ klickt, bleibt dort. Die Weiche gilt für **alle Lehrer-Rollen**, also Lehrkraft, Bereichs-Admin und Super-Admin (Nutzer-Entscheidung 2026-10-26). Azubis landen wie heute auf der Spieler-Startseite.

5. **Rolle bei jeder Anfrage frisch aus der Datenbank:** Das ist bereits heute so (PROJ-24) und bleibt so. Ein Entzug der Rolle wirkt also bei der nächsten Aktion, ohne Abmelden.

6. **Rangliste: Pseudonym erzwingen statt ausblenden:** Lehrkräfte spielen mit (Entscheidung E3). Die Rangliste ignoriert für Lehrer-Rollen den Schalter „Echten Namen zeigen“ und nimmt immer das Pseudonym. Weil das serverseitig in der Ranglisten-Schnittstelle passiert, kann der Klarname nicht durch einen Trick im Browser sichtbar werden. Andere Merkmale (Abzeichen, Farbe) gibt es für Rollen in der Rangliste ohnehin nicht. Das bleibt so.

7. **Bereichsübergreifende Suche nur für den Super-Admin:** Die Nutzerliste ist heute immer auf einen Bereich gefiltert. Für das Freischalten braucht der Super-Admin aber alle Konten, weil sich eine Kollegin auch über die Tourismus-Adresse registriert haben kann. Der neue Schalter „Alle Bereiche“ gibt es deshalb nur für den Super-Admin. Für Bereichs-Admins bleibt die Liste wie heute auf den eigenen Bereich begrenzt.

8. **Keine Änderung an Zugriffsregeln der Datenbank:** Weil die neue Rolle dort von Haus aus nichts darf (siehe Ausgangslage), gibt es in PROJ-44 nur zwei kleine Datenbank-Änderungen: den neuen Rollenwert erlauben und das Feld „Willkommen gesehen“ anlegen (selbst setzbar). Beides kommt mit Rückweg-Skript. Echte neue Rechte (Leistungsnachweise, Fächer) kommen erst mit PROJ-46 und PROJ-48.

### D) Was sich wo ändert (Überblick)

| Bereich | Änderung |
|---|---|
| Datenbank | Rollenwert „Lehrkraft“ erlauben, Feld „Willkommen gesehen“ (+ Rückweg) |
| Gemeinsame Rollen-Übersicht | NEU: Lehrer-Rollen / Verwaltungs-Rollen an einer Stelle |
| Middleware | Lehrer-Rollen in den Lehrkräfte-Bereich, Lehrkraft nur auf freigegebene Seiten, Verwaltungs-Schnittstellen unverändert |
| Login & OAuth-Rückkehr | Standardziel ist die Start-Weiche statt `/` |
| Admin-Layout & Navigation | Rollenfilter: Lehrkraft / Bereichs-Admin / Super-Admin (bisher nur „Super-Admin ja/nein“) |
| Übersicht | Willkommens-Hinweis |
| Nutzerverwaltung (Seite + Schnittstelle) | Suche, „Alle Bereiche“, Rollen-Filter, letzter Login, Rolle „Lehrkraft“, Dialog mit E-Mail |
| Rangliste + Profil | Pseudonym-Pflicht für Lehrer-Rollen, Schalter ausgeblendet |
| Spieler-Startseite / Spieler-Menü | Link „Lehrkräfte-Bereich“ für alle Lehrer-Rollen |

### E) Reihenfolge beim Ausrollen
1. Datenbank-Änderung zuerst. Das ist gefahrlos, weil noch niemand die Rolle hat.
2. Danach den Code deployen.
3. Erst dann das erste Konto zur Lehrkraft machen (Testkonto), prüfen und danach die echten Kolleginnen und Kollegen freischalten.

### F) Tests
- Rollen-Übersicht: welche Rolle darf in den Bereich, welche verwalten, welche Navigation.
- Middleware und Routen je Rolle: Super-Admin / Bereichs-Admin / Lehrkraft / Azubi. Lehrkraft auf Verwaltungs-Schnittstelle → 403, auf Verwaltungsseite → Umleitung zur Übersicht.
- Rollenwechsel-Schnittstelle: nur Super-Admin darf „Lehrkraft“ setzen oder entziehen, Bereichs-Admin → 403.
- Rangliste: Lehrkraft mit „Echten Namen zeigen = an“ erscheint trotzdem mit Pseudonym.
- SQL-Prüfung in einer Transaktion mit Rollback: Ein Testkonto mit Rolle „Lehrkraft“ kann in keiner Tabelle mehr lesen oder schreiben als ein Azubi und kann seine Rolle nicht selbst ändern.
- `npm test` + `npm run build`. Kein Dev-Server und kein Playwright.

### G) Abhängigkeiten (Pakete)
Keine neuen Pakete. Genutzt werden ausschließlich vorhandene shadcn/ui-Bausteine: Eingabefeld, Auswahlfeld, Tabelle, Dialog bzw. Bestätigungsdialog, Badge.

## Implementation Notes (Frontend Developer)

**Stand 2026-10-26 – Frontend fertig, Backend offen.** Bis zum Backend-Schritt bleibt eine Lehrkraft sicher ausgesperrt: Die Middleware (`proxy.ts`) und `requireAdmin()` lassen weiterhin nur `admin`/`department_admin` durch, und die Datenbank kennt den Rollenwert `teacher` noch nicht.

**Gebaut:**
- `src/lib/roles.ts` (+ Tests): zentrale Rollen-Übersicht – `UserRole`/`TeacherRole`/`ManagerRole`, `ROLE_LABEL`, `isTeacherRole`, `isManagerRole`, `startPathFor`, `mayOpenAdminPath` (Lehrkraft vorerst nur `/admin`), `safeRedirectTarget`.
- **Start-Weiche** `src/app/start/page.tsx`: Lehrer-Rollen → `/admin`, Azubis → `/`. Login, Registrierung und OAuth-Rückkehr (`auth/callback`) nutzen ohne `?redirect=` jetzt `/start` statt `/`.
- **Nebenbei behoben:** `auth/callback` hängte `next` ungeprüft an die eigene Adresse (`?next=@fremde-seite.de` hätte auf eine fremde Seite umgeleitet). Ziele laufen jetzt durch `safeRedirectTarget`, ebenso in Login und Registrierung. Test ergänzt.
- **Navigation & Startseite:** `adminNavGroupsFor(role)` statt `adminNavGroupsFor(isSuperAdmin)`. Neues Kennzeichen `teacherVisible` am Navigationseintrag. Lehrkraft sieht: Übersicht + Werkzeugkiste, auf der Startseite zusätzlich „Weitere Werkzeuge … folgen bald“.
- **Willkommens-Hinweis** `src/components/admin/teacher-welcome-dialog.tsx`: erscheint, wenn `role === 'teacher'` und `showTeacherWelcome` im Rollen-Kontext gesetzt ist. Schließen ruft `POST /api/profile/teacher-welcome` auf.
- **Kopfzeile:** „Admin“ → „Lehrkräfte“, neuer Button „Zur Lern-App“ (auf dem Handy nur Icon mit Screenreader-Text), Menü-Titel „Menü“, Navigation heißt für Screenreader „Lehrkräfte-Bereich“.
- **Admin-Layout:** lässt alle Lehrer-Rollen herein (`isTeacherRole`), Rollen-Kontext trägt `TeacherRole`.
- **Spieler-Startseite & Spieler-Menü:** Eintrag „Lehrkräfte-Bereich“ für alle Lehrer-Rollen (Prop `showTeacherArea` statt `isAdmin`).
- **Profil:** Für Lehrer-Rollen ist der Schalter „Mit Klarnamen erscheinen“ ausgeblendet. Stattdessen steht dort: „In der Rangliste erscheinst du immer unter deinem Fantasienamen.“ „Neu würfeln“ bleibt möglich.
- **Nutzerverwaltung:** Rollen-Filter (Alle · Azubis · Lehrkräfte · Bereichs-Admins · Super-Admin), Schalter „Alle Bereiche“ (nur Super-Admin, lädt `?scope=all`, zeigt dann die Spalte „Bereich“), Spalte „Letzter Login“ für Lehrer-Rollen, Rolle „Lehrkraft“ im Rollen-Menü, Bestätigungstext mit Name **und** E-Mail sowie dem Hinweis „Erstellte Inhalte bleiben erhalten …“ beim Entziehen (`role-change-text.ts` + Tests).
- `tsconfig.json`: `scripts/scratch` (git-ignorierte lokale Wegwerf-Skripte mit Syntaxfehlern) von der Typprüfung ausgenommen, weil sie den lokalen `npm run build` blockierten. Auf Vercel waren sie nie vorhanden.

## Implementation Notes (Backend Developer)

**Stand 2026-10-26.** Code fertig, getestet (1.173 Tests grün, `tsc` sauber). Datenbank-Migration geschrieben; Anwendung auf die Produktion siehe „Rollout“ unten.

**Migration** `20261026_proj44_teacher_role.sql` (+ `_down`): `profiles_role_check` erlaubt zusätzlich `teacher`; neue Spalte `profiles.teacher_welcome_seen boolean not null default false` mit Spalten-Grant für `authenticated` (wie `starter_coins_seen`). `role` und `department_id` bleiben nicht selbst schreibbar. **Keine Policy geändert** (alle Policies und Hilfsfunktionen fragen gezielt nach `admin`/`department_admin`, am 2026-10-26 gegen die Live-DB geprüft). Rein additiv, der bisherige Code läuft unverändert weiter.

**Code:**
- `src/proxy.ts`: `/admin` öffnet für alle Lehrer-Rollen. Eine reine Lehrkraft darf nur auf die Übersicht, andere Seiten leiten auf `/admin` um. `/api/admin/**` bleibt für die Lehrkraft 403. Fehlende/unbekannte Rolle → gesperrt (fail closed). Eingeloggte auf `/login`/`/register` → `/start`. Neuer Test `src/proxy.test.ts` (9 Fälle).
- `requireAdmin()` unverändert: lässt nur `admin`/`department_admin` durch, die Lehrkraft prallt an jeder Verwaltungs-Schnittstelle mit 403 ab (neuer Test, auch ohne Bereich).
- `src/app/admin/layout.tsx`: liest `teacher_welcome_seen`, setzt `showTeacherWelcome` nur für `teacher`.
- `POST /api/profile/teacher-welcome`: setzt das Feld in der eigenen Zeile (401 ohne Login).
- `GET /api/admin/users`: neues `?scope=all` (nur Super-Admin, sonst 403; ohne Bereichsfilter, liefert `department_name`). Alle Antworten enthalten `last_sign_in_at`.
- `PATCH /api/admin/users/[id]`: Rollenwert `teacher` (weiterhin nur Super-Admin, Bereichs-Admin → 403). `department_id` bleibt unberührt. Beim Zuweisen einer Lehrer-Rolle wird ein fehlendes Pseudonym nachgetragen (`src/lib/pseudonym-server.ts`). Rollenwechsel stehen wie bisher als `user.role_change` im Änderungsprotokoll.
- `GET /api/leaderboard`: Lehrer-Rollen immer mit Pseudonym (auch bei „Klarname an“, in Liste und eigener Zeile, Woche/Monat/Gesamt). Ohne Pseudonym erscheint „Unbekannt“, nie der Klarname.
- **Nebenbei gefunden und behoben:** Die Rangliste reichte per `...r` alle ausgewählten Felder an den Browser durch (u. a. `pseudonym`, `show_real_name`, `leaderboard_opt_out`). Mit der Rolle hätte das die Lehrer-Rolle für Azubis sichtbar gemacht. Die Antwort enthält jetzt nur noch `id`, `display_name`, `total_xp`, `rank`, `level`, `is_current_user` (Test prüft, dass weder Rolle noch Klarname noch Einstellungen auftauchen). Die Oberfläche nutzt die übrigen Felder nicht.
- `src/lib/database.types.ts`: `teacher_welcome_seen` ergänzt.

**Abweichung von der Spec:** Das Datum „Letzter Login“ zeigt die Oberfläche nur für Lehrer-Rollen an; die Schnittstelle liefert es für alle (geringe Zusatzinfo, kein Extra-Aufruf).

**Datenbank-Prüfung vor dem Anwenden** (Transaktion mit Rollback, gegen die Produktions-DB): Derselbe Nutzer sieht als Lehrkraft in 15 Tabellen (`profiles`, `questions`, `answer_options`, `graded_assessments`, `admin_audit_log`, `questions_draft`, `generation_jobs`, `shop_items`, `user_shop_items`, `quality_fix_progress`, `exam_sessions`, `exam_question_sets`, `topics`, `subjects`, `departments`) exakt dieselben Zeilen wie als Azubi. `is_admin()`, `is_department_admin()` und `can_admin_department()` liefern `false`. Eigene Zeile: nur `teacher_welcome_seen` setzbar; `role` und `department_id` selbst ändern wird mit „permission denied“ abgelehnt; fremde Profile, `questions`, `graded_assessments`, `subjects`, `shop_items` ändern: 0 Zeilen.

**Rollout:**
1. ✅ Migration `proj44_teacher_role` am 2026-10-26 auf die Produktion angewendet und nachgeprüft (Constraint erweitert, Spalte + Grant vorhanden, `role` weiterhin nicht schreibbar, 0 Konten mit Rolle `teacher`). Der bisher ausgelieferte Code läuft unverändert weiter.
2. ⏳ Code pushen (Commit `8c3ee41` und `27bc1a5`, noch nicht gepusht).
3. ⏳ Testkonto zur Lehrkraft machen, prüfen, erst dann die Kolleginnen und Kollegen freischalten.

**Hinweis:** Die Produktion hat inzwischen 17 Bereichs-Admins (PROJ-24 ging von 11 aus), 1 Super-Admin und 132 Azubis.

## QA Test Results

**Getestet:** 2026-10-26
**Umgebung:** kein Dev-Server und kein Playwright (Projekt-Memory „Kein Dev-Server“: beides bringt den MacBook zum Absturz). Stattdessen wie bei PROJ-24: Vitest, TypeScript, Lint, `npm run build` und transaktionale Prüfungen direkt gegen die Produktions-DB (alles per `RAISE EXCEPTION` zurückgerollt, keine Daten verändert). Nach der Migration war die DB-Prüfung nur lesend.
**Tester:** QA Engineer (AI)

**Nicht geprüft (braucht einen Browser):** Browser-übergreifend (Chrome/Firefox/Safari), Responsive-Ansicht (375/768/1440 px), Tastatur- und Screenreader-Bedienung, Aussehen der Oberfläche. Die Logik hinter allen Oberflächen ist per Komponenten- und Routen-Tests abgedeckt, das Aussehen **nicht**. E2E-Tests (`tests/PROJ-44-*.spec.ts`) wurden aus demselben Grund nicht geschrieben.

### Automatik
- `npm test`: **1.173 bestanden**, 1 erwarteter Fehlschlag (dokumentiert BUG-1), 0 Regressionen.
- `tsc --noEmit`: sauber. `npm run lint`: 0 Fehler (die 32 Warnungen sind alt, in den PROJ-44-Dateien keine). `npm run build`: grün, `/start` ist enthalten.
- 27 neue Tests aus Frontend/Backend plus 1 Regressionstest aus dieser QA.

### Datenbank (Produktion, zurückgerollt)
- Lehrkraft sieht in 15 Tabellen exakt dieselben Zeilen wie derselbe Nutzer als Azubi; `is_admin()`, `is_department_admin()`, `can_admin_department()` = false.
- Rolle und Bereich selbst ändern: „permission denied“. Eigenes Feld `teacher_welcome_seen`: setzbar. Fremde Profile, `questions`, `graded_assessments`, `subjects`, `shop_items`: 0 Zeilen änderbar.
- Letzter Super-Admin → Lehrkraft: vom Schutz-Trigger abgelehnt. Unbekannte Rolle: `check_violation`. Neue Konten starten als `student`. `generate_unique_pseudonym(NULL)` liefert einen Namen (Bereich nicht nötig).

### Akzeptanzkriterien: 30 von 30 bestanden
| Gruppe | Ergebnis | Beleg |
|---|---|---|
| Rolle (6) | ✅ 6/6 | DB-Prüfung, `requireAdmin`-Test, Rollen-Test, Registrierung unverändert (Code) |
| Nutzerverwaltung (6) | ✅ 6/6 | Routen-Tests (`scope=all`, Rolle `teacher`, Protokoll `from→to`), Textbaustein-Test. *Hinweis:* Die bereichsübergreifende Suche ist ein Schalter „Alle Bereiche“ (Standard: aus), wie im bestätigten Design. Die Spec-Formulierung „unabhängig vom Umschalter“ gilt erst mit eingeschaltetem Schalter. |
| Rolle entziehen (3) | ✅ 3/3 | Middleware-Test (Seite → `/`, API → 403), Dialogtext-Test; „Inhalte bleiben“ trivial erfüllt (der Rollenwechsel ändert nur `role`), echte Inhalte gibt es erst mit PROJ-46 |
| Lehrkräfte-Bereich (5) | ✅ 5/5 | Middleware- (9) und Navigations-Tests, Nav zeigt nur Übersicht + Werkzeugkiste |
| Willkommen (3) | ✅ 3/3 | Dialog- und Route-Test, am Konto gespeichert, keine E-Mail |
| Lern-App (7) | ✅ 7/7 | Ranglisten-Tests (Pseudonym, Antwortfelder), Profil, DB; „Klassen-Statistiken“: nur das Fun-Audit filtert auf Azubis (`role = student`), andere Auswertungen rechnen keine Rollen. Der Wechsel zurück sitzt im Spieler-Menü der Startseite („Lehrkräfte-Bereich“). |

### Edge Cases
✅ Schüler tarnt sich (Dialog nennt E-Mail) · ✅ falsches Konto freigeschaltet (zurückstufbar, beide Wechsel im Protokoll) · ✅ doppeltes Konto (Suche mit E-Mail) · ✅ OAuth (Callback → `/start`, Test) · ✅ letzter Super-Admin · ✅ Bereichs-Admin → Lehrkraft (`department_id` bleibt, Test prüft, dass nur `role` geschrieben wird) · ✅ Lehrkraft mit Fachbereich · ✅ Zweitkonto PROJ-29 (Code unberührt, Tests grün) · ⚠️ Rolle während laufender Sitzung entzogen: Umleitung und 403 funktionieren, aber ohne Hinweis (BUG-4) · ➖ Konto gelöscht: erst mit PROJ-46 prüfbar.

### Bugs

**BUG-1 – Umleitung auf fremde Seiten nach dem Login ist umgehbar (High, Sicherheit) – ✅ behoben**
`safeRedirectTarget()` ([src/lib/roles.ts](src/lib/roles.ts)) erkennt `//` und `/\` am Anfang, aber nicht Tab, Zeilenumbruch oder Wagenrücklauf. Der Browser entfernt diese Zeichen aus Adressen, aus `/\t/evil.example` wird `//evil.example`.
- *Schritte:* Link `…/login?redirect=%2F%09%2Fevil.example` öffnen, einloggen. Die Login- und Registrierungsseite setzen `window.location.href = redirectTarget`, der Browser landet auf `evil.example`. In Node nachgestellt: `new URL('/\t/evil.example', 'https://spedilern.vercel.app')` ergibt `https://evil.example/`; dasselbe mit `\n` und `\r`.
- *Auswirkung:* Phishing: Ein präparierter Link schickt Kolleginnen und Azubis nach dem echten Login auf eine fremde Seite. Vor PROJ-44 war das Ziel gar nicht geprüft; der Schutz ist also besser als vorher, aber lückenhaft, und die Frontend-Notizen („abgesichert“) stimmen so nicht.
- *Nicht betroffen:* Der serverseitige Callback (`next`) hängt das Ziel an die eigene Adresse an und bleibt auf derselben Domain.
- *Absicherung:* Der Test war zunächst als erwarteter Fehlschlag (`it.fails`) angelegt und ist nach dem Fix ein normaler Test.
- *Empfehlung (für /backend bzw. /frontend):* Steuerzeichen vor der Prüfung entfernen oder ablehnen und das Ergebnis über `new URL(…, origin)` auf dieselbe Herkunft prüfen.

**BUG-2 – Willkommens-Hinweis kann in derselben Sitzung wieder auftauchen (Low, nicht im Browser geprüft) – ✅ behoben**
Der Layout-Wert `showTeacherWelcome` wird einmal serverseitig berechnet und bleibt bei App-Navigation im Lehrkräfte-Bereich stehen. Kommt die Lehrkraft per „Zurück“ (Browser-Verlauf) oder, sobald PROJ-46 weitere Seiten bringt, per Klick zurück auf die Übersicht, kann der Hinweis erneut erscheinen, obwohl er in der DB als gesehen gilt. Heute nur über „Zurück“ erreichbar. *Empfehlung:* Schließen auch im Rollen-Kontext (Client) merken. Bitte im Browser bestätigen.

**BUG-3 – Super-Admin kann eine Lehrkraft nicht in einen anderen Bereich verschieben (Low) – ✅ behoben**
„Bereich verschieben“ erscheint in der Nutzerverwaltung nur bei Azubis ([src/app/admin/users/page.tsx](src/app/admin/users/page.tsx)), obwohl die Schnittstelle es für den Super-Admin bei jeder Rolle erlaubt. Hat sich eine Lehrkraft über die Adresse des falschen Bereichs registriert, sieht sie dauerhaft dessen Lern-App. *Empfehlung:* Aktion für Super-Admin auch bei Lehrer-Rollen zeigen.

**BUG-4 – Kein erklärender Hinweis, wenn die Rolle entzogen wurde (Low) – ✅ behoben**
Die Spec verlangt bei entzogener Rolle in laufender Sitzung „einen verständlichen Hinweis“. Heute leitet die Middleware stumm auf `/` um, API-Aufrufe zeigen das allgemeine „Aktion fehlgeschlagen“. *Empfehlung:* Kurzer Hinweis auf der Zielseite oder eine verständliche 403-Meldung im Lehrkräfte-Bereich.

**BUG-5 – Kleinigkeiten in der Nutzerverwaltung (Low) – ✅ behoben**
(a) Ein Bereichs-Admin sieht den Sperren-Knopf auch bei Lehrer-Konten und Admins seines Bereichs, bekommt beim Klick aber „Not found“ (die Schnittstelle erlaubt ihm nur Azubis; das Muster gab es für Admin-Zeilen schon vorher). (b) Wird eine Lehrkraft ohne Bereich zum Bereichs-Admin gemacht, erscheint nur „Invalid payload“ statt „Bereichs-Admin braucht einen Fachbereich“. (c) Der Profil-Hinweis „Als Lehrkraft erscheinst du …“ steht auch bei Bereichs-Admins und Super-Admin.

### Sicherheitsprüfung (Red Team)
- ✅ Rollen-Eskalation: Weder per Datenbank (Spalten-Grant) noch per API kann sich jemand `teacher` oder höher selbst geben; `teacher-welcome` schreibt nur ein einzelnes Feld der eigenen Zeile.
- ✅ Autorisierung: Lehrkraft prallt an jeder `/api/admin/**`-Route (Middleware **und** `requireAdmin`) mit 403 ab, auch ohne Bereich. Verwaltungsseiten leiten um. Bereichs-Admin kann weder `teacher` vergeben noch `scope=all` nutzen (403).
- ✅ Fail closed: fehlende oder unbekannte Rolle sperrt den Bereich.
- ✅ Datenschutz Rangliste: Klarname und Rolle verlassen den Server nicht. Die Antwort enthält nur noch 6 Felder (vorher wurden u. a. `pseudonym`, `show_real_name` mit durchgereicht). Sonst gibt keine Azubi-Seite Namen anderer aus.
- ✅ Keine Geheimnisse in den geänderten Dateien; keine neuen Umgebungsvariablen.
- ❌ Offene Umleitung (BUG-1).
- ⚠️ Nicht geprüft: Ratenbegrenzung der neuen Schnittstellen (`teacher-welcome` ist harmlos, `users?scope=all` nur für den Super-Admin).

### Regression
Alle bestehenden Tests grün (1.173), darunter Admin-Routen, Leistungsnachweise, Rangliste, Login-Callback, PROJ-29-Sitzungswechsel. Die Produktions-DB nach der Migration: 1 Super-Admin, 17 Bereichs-Admins, 132 Azubis, 0 Lehrkräfte, `role` weiterhin nicht schreibbar.

### Nachtest nach Fehlerbehebung (2026-10-26)

| Fehler | Behebung | Beleg |
|---|---|---|
| BUG-1 (High) | `safeRedirectTarget()` ([src/lib/roles.ts](src/lib/roles.ts)) lehnt Steuerzeichen (Tab, Zeilenumbruch, Wagenrücklauf, NUL …) und jeden Backslash ab und prüft das Ergebnis am Ende als Adresse: es muss auf derselben Herkunft bleiben. Gilt für Login, Registrierung und den Callback. | 4 Tests in `roles.test.ts`: die drei Umgehungen aus der QA, Backslash an jeder Stelle, „jedes Ergebnis bleibt auf derselben Herkunft“ (auch `///x`, `javascript:`, `http:x`), normale Pfade mit Suchparametern und Anker laufen unverändert durch. Der frühere `it.fails`-Test ist jetzt ein normaler, grüner Test. |
| BUG-2 | Das Schließen des Hinweises wird für die Lebensdauer der Browser-Seite gemerkt (`teacher-welcome-dialog.tsx`). Nach einem Neuladen entscheidet wieder das Konto in der Datenbank. Der Server setzt den Merker nie, er kann nicht zwischen Nutzern durchsickern. | Test: schließen, Übersicht neu aufbauen → kein zweiter Hinweis. |
| BUG-3 | „Bereich verschieben“ erscheint für den Super-Admin auch bei Lehrkräften und Bereichs-Admins (nicht bei sich selbst). Bei Bereichs-Admins weist der Dialog darauf hin, dass ihre Verwaltungsrechte mit dem Bereich wechseln. | 5 neue Oberflächentests (`users/page.test.tsx`), 2 neue Schnittstellen-Tests (Super-Admin darf, Bereichs-Admin bekommt 404). |
| BUG-4 | Ohne Zugang leitet die Middleware auf `/?kein-zugang=1` um, die Startseite zeigt einen Hinweis („Du hast keinen Zugang zum Lehrkräfte-Bereich. Falls du Lehrkraft bist, frag bitte die Administration.“). Schnittstellen antworten 403 mit einer verständlichen deutschen Meldung (fehlende Rolle bzw. „Dafür fehlen dir die Rechte“). | 2 geänderte und 1 neuer Middleware-Test. |
| BUG-5 | (a) Sperren-Knopf ist für Bereichs-Admins bei Lehrer-Konten und Admins deaktiviert, mit Erklärung. (b) Verständliche Meldung „Bereichs-Admin braucht einen Fachbereich.“ in Schnittstelle und Oberfläche. (c) Profil-Hinweis ohne Rollenwort. Dazu bekommen die Icon-Knöpfe in der Liste jetzt Beschriftungen für Screenreader. | Oberflächentests (a), Schnittstellen-Test (b). |

**Automatik nach den Fixes:** `npm test`: **1.187 bestanden**, 0 Fehlschläge, 0 erwartete Fehlschläge. `tsc --noEmit`: sauber. Lint: 0 Fehler, in den geänderten Dateien keine neuen Warnungen. `npm run build`: grün.

**Weiterhin nicht im Browser geprüft:** das Aussehen der Oberfläche (z. B. des neuen Hinweises auf der Startseite), Responsive-Ansicht, Browser-Vielfalt, Tastatur-Bedienung. Für BUG-2 ist das „Zurück“-Verhalten aus dem Code abgeleitet und nach dem Fix durch einen Test des Neuaufbaus abgedeckt, nicht im echten Browser.

### Entscheidung
**BEREIT für den Push.** Es sind keine Critical- oder High-Fehler offen, alle 30 Akzeptanzkriterien sind erfüllt, alle fünf gefundenen Fehler sind behoben und per Test abgesichert. Empfehlung nach dem Deployment: mit einem Testkonto einmal in Weiche, Willkommens-Hinweis, Rangliste (als Azubi und als Lehrkraft) und dem Hinweis „kein Zugang“ im Browser nachsehen.

## Deployment

- **Produktion:** https://spedilern.vercel.app
- **Deployt:** 2026-10-26 (Push auf `main`, Commit `399d5fb`, Vercel-Build „Ready“ nach ca. 1 Minute)
- **Datenbank:** Migration `proj44_teacher_role` war bereits vorher angewendet (siehe Implementation Notes); Rückweg: `20261026_proj44_teacher_role_down.sql`
- **Vor dem Push:** committeter Stand in getrenntem Arbeitsverzeichnis geprüft (`tsc` sauber, 1.187 Tests, Build grün)
- **Prüfung der Produktion ohne Login (curl):** `/` und `/start` leiten zum Login (mit Ziel `/start`), `/admin` leitet zum Login, `/api/admin/users`, `/api/admin/users?scope=all`, `POST /api/profile/teacher-welcome` und `/api/leaderboard` antworten 401, Login-Seite 200, Sicherheits-Header gesetzt.
- **Nicht geprüft (braucht ein Konto bzw. einen Browser):** Weiche nach dem Login, Willkommens-Hinweis, Rangliste mit Lehrkraft-Konto, Hinweis „kein Zugang“, Aussehen und Handy-Ansicht.
- **Jetzt zu tun (Nutzer):** Ein Testkonto in der Nutzerverwaltung zur Lehrkraft machen und die Punkte oben einmal im Browser durchgehen. Danach die Kolleginnen und Kollegen freischalten.
- **Tag:** `v1.44.0-PROJ-44`
