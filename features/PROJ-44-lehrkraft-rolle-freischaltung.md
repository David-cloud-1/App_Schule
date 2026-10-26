# PROJ-44: Lehrkraft-Rolle & Freischaltung

## Status: In Progress
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
    stattdessen ein Satz: „Als Lehrkraft erscheinst du in der Rangliste immer unter deinem Pseudonym.“
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
- **Profil:** Für Lehrer-Rollen ist der Schalter „Mit Klarnamen erscheinen“ ausgeblendet. Stattdessen steht dort: „Als Lehrkraft erscheinst du in der Rangliste immer unter deinem Fantasienamen.“ „Neu würfeln“ bleibt möglich.
- **Nutzerverwaltung:** Rollen-Filter (Alle · Azubis · Lehrkräfte · Bereichs-Admins · Super-Admin), Schalter „Alle Bereiche“ (nur Super-Admin, lädt `?scope=all`, zeigt dann die Spalte „Bereich“), Spalte „Letzter Login“ für Lehrer-Rollen, Rolle „Lehrkraft“ im Rollen-Menü, Bestätigungstext mit Name **und** E-Mail sowie dem Hinweis „Erstellte Inhalte bleiben erhalten …“ beim Entziehen (`role-change-text.ts` + Tests).
- `tsconfig.json`: `scripts/scratch` (git-ignorierte lokale Wegwerf-Skripte mit Syntaxfehlern) von der Typprüfung ausgenommen, weil sie den lokalen `npm run build` blockierten. Auf Vercel waren sie nie vorhanden.

**Vertrag für /backend (noch offen):**
1. Migration + Rückweg: `profiles.role` erlaubt `teacher`. Neue Spalte `teacher_welcome_seen boolean not null default false`, für die eigene Zeile selbst schreibbar (Spalten-Grant wie `starter_coins_seen`).
2. `src/app/admin/layout.tsx`: `teacher_welcome_seen` mitlesen und `showTeacherWelcome: role === 'teacher' && !teacher_welcome_seen` in den Rollen-Kontext geben.
3. `POST /api/profile/teacher-welcome`: setzt `teacher_welcome_seen = true` für die eigene Zeile.
4. `src/proxy.ts`: `/admin`-Seiten für alle Lehrer-Rollen öffnen. Lehrkraft per `mayOpenAdminPath` nur auf freigegebene Seiten, sonst Umleitung auf `/admin`. `/api/admin/**` bleibt nur für Verwaltungs-Rollen (403 für Lehrkraft). Eingeloggte auf `/login`/`/register` → `/start`.
5. `GET /api/admin/users?scope=all` (nur Super-Admin, sonst 403): ohne Bereichsfilter, zusätzlich `department_name`. Für alle Antworten zusätzlich `last_sign_in_at` aus den Login-Konten.
6. `PATCH /api/admin/users/[id]`: Rollenwert `teacher` zulassen (weiterhin nur Super-Admin). Beim Wechsel zu `teacher` bleibt `department_id` unverändert.
7. `GET /api/leaderboard`: Für Lehrer-Rollen immer `pseudonym`, `show_real_name` ignorieren (Liste und eigene Zeile).
8. `src/lib/database.types.ts` neu erzeugen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
