# PROJ-63: Lehrerzimmer – Forum für den Austausch im Kollegium

## Status: In Progress
**Created:** 2026-10-28
**Last Updated:** 2026-10-29

## Kontext
Lehrkräfte sollen sich in der App austauschen können: Tipps teilen, Fragen stellen, Unterrichtsideen weitergeben. Das „Lehrerzimmer“ ist ein schlichtes Forum im Lehrkräfte-Bereich (`/admin`). Es ist kein Chat und hat keine Echtzeit. Material (Dateien) wird nicht hier geteilt, dafür gibt es das Regal des Kollegiums (PROJ-53).

### Entscheidungen (Nutzer, 2026-10-28)
- **E1 – Ein gemeinsames Forum:** Alle Lehrkräfte aus Spedition und Tourismus sehen alle Beiträge. Ein Beitrag kann optional einen Fachbereich tragen, danach wird gefiltert.
- **E2 – Umfang der ersten Version:** Beiträge mit Antworten, „Hilfreich“-Daumen, Fragen als gelöst markieren. **Kein** Verlinken von Regal-Material, **keine** Datei-Anhänge.
- **E3 – Hinweise nur in der App:** Ein Zähler in der Seitenleiste zeigt Neues. Es werden keine E-Mails oder Push-Nachrichten verschickt.
- **E4 – Moderation:** Jede Person bearbeitet und löscht die eigenen Beiträge. Super-Admin und Bereichs-Admins können jeden Beitrag ausblenden, das wird protokolliert. Lehrkräfte können Beiträge melden.
- **E5 – Name:** „Lehrerzimmer“ in der Seitenleiste, Icon mit Sprechblasen (Lucide `MessagesSquare`).
- **E6 – Textformat:** Einfache Formatierung: Absätze, **fett**, *kursiv*, Aufzählungen und anklickbare Links. Keine Bilder, kein HTML.
- **E7 – Papierkorb:** Gelöschte Beiträge und Antworten liegen 30 Tage im Papierkorb (PROJ-47) und lassen sich wiederherstellen.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle): nur Lehrer-Rollen haben Zugang
- Requires: PROJ-45 (Lehrkräfte-Arbeitsbereich): Seitenleiste, Seitenkopf, Zustände, Tokens
- Requires: PROJ-22/24 (Fachbereiche): für die Fachbereichs-Kennzeichnung und die Rechte der Bereichs-Admins
- Requires: PROJ-47 (Änderungsverlauf & Papierkorb): für Löschen und Wiederherstellen
- Requires: PROJ-50 (Mein Konto): Anzeigename der Lehrkraft
- Optional: PROJ-2 (Fächer): optionale Fach-Kennzeichnung eines Beitrags

## User Stories
- Als **Lehrkraft** möchte ich einen Tipp für den Unterricht teilen, damit Kolleginnen und Kollegen davon profitieren.
- Als **Lehrkraft** möchte ich eine Frage ans Kollegium stellen und die hilfreichste Antwort als Lösung markieren, damit andere mit derselben Frage sie schnell finden.
- Als **Lehrkraft** möchte ich nach Kategorie, Fachbereich, Fach und Stichwort filtern, damit ich Passendes schnell finde.
- Als **Lehrkraft** möchte ich gute Beiträge und Antworten als „hilfreich“ markieren, damit die besten nach oben wandern.
- Als **Lehrkraft** möchte ich in der Seitenleiste sehen, ob es neue Antworten auf meine Beiträge oder neue Beiträge gibt, damit ich nichts verpasse.
- Als **Lehrkraft** möchte ich meine eigenen Beiträge bearbeiten und löschen und einen unpassenden Beitrag melden können.
- Als **Super-Admin oder Bereichs-Admin** möchte ich unpassende Beiträge ausblenden und gemeldete Beiträge prüfen, damit das Lehrerzimmer ein angenehmer Ort bleibt.

## Acceptance Criteria

### Navigation & Zugang
- [ ] In der Seitenleiste des Lehrkräfte-Bereichs gibt es den Eintrag **„Lehrerzimmer“** (Icon `MessagesSquare`) für alle Lehrer-Rollen: Lehrkraft, Bereichs-Admin, Super-Admin.
- [ ] Azubis sehen den Eintrag nie. Direkte Aufrufe von Lehrerzimmer-Seiten oder -Schnittstellen durch Azubis oder Abgemeldete liefern 404 bzw. leiten zur Anmeldung.
- [ ] Das Lehrerzimmer ist über die Schnellsuche (⌘K / Strg+K) erreichbar.

### Übersicht (Beitragsliste)
- [ ] Die Seite beginnt mit `AdminPageHeader`: Titel „Lehrerzimmer“, ein Satz Beschreibung, rechts die grüne Hauptaktion **„Neuer Beitrag“**.
- [ ] Jeder Eintrag in der Liste zeigt: Kategorie-Pill (Tipp · Frage · Idee), Titel, die ersten ca. 140 Zeichen Text, Fachbereich und Fach (falls gesetzt), „von [Anzeigename]“, relative Zeit („vor 2 Std.“), Anzahl Antworten, Anzahl „hilfreich“. Gelöste Fragen tragen die Pill **„gelöst“**.
- [ ] Beiträge mit Antworten, die die angemeldete Person noch nicht gesehen hat, sind hervorgehoben (z. B. Punkt vor dem Titel).
- [ ] **Filter** als Chips bzw. Auswahl über der Liste: Kategorie (alle · Tipp · Frage · Idee), Fachbereich (alle · Spedition · Tourismus), Fach (nur Fächer, die in Beiträgen vorkommen), „Nur offene Fragen“, „Meine Beiträge“.
- [ ] **Suchfeld**: Es durchsucht Titel und Text der Beiträge und Antworten.
- [ ] **Sortierung**: „Neueste Aktivität“ (Standard: neuer Beitrag oder neue Antwort), „Neueste Beiträge“, „Hilfreichste“.
- [ ] Gewählte Filter, Suche und Sortierung stehen in der URL, damit eine Ansicht als Link weitergegeben werden kann.
- [ ] Es werden 20 Beiträge geladen, weitere über „Mehr laden“.
- [ ] Desktop: Liste über die volle Inhaltsbreite. Handy: Karten untereinander, alles bedienbar mit mindestens 44 px.
- [ ] Zustände: Laden → `AdminLoadingState` (list). Leer → `AdminEmptyState` „Noch keine Beiträge. Teile den ersten Tipp mit dem Kollegium.“ mit der Hauptaktion. Ist die Liste nur durch Filter leer → „Keine Beiträge passen zu den Filtern“ mit „Filter zurücksetzen“. Fehler → `AdminErrorState`.

### Beitrag schreiben
- [ ] „Neuer Beitrag“ öffnet ein Formular (eigene Seite oder Dialog, schmal `max-w-2xl`) mit:
  - **Kategorie** (Pflicht): Tipp · Frage · Idee
  - **Titel** (Pflicht, 5–120 Zeichen)
  - **Text** (Pflicht, 10–5000 Zeichen) mit einfacher Formatierung (E6) und einer kleinen Werkzeugleiste (fett, kursiv, Aufzählung, Link) sowie einer Vorschau
  - **Fachbereich** (optional): Spedition · Tourismus · keiner. Vorbelegt mit dem eigenen Fachbereich, wenn es genau einen gibt
  - **Fach** (optional): Auswahl aus den Fächern des gewählten Fachbereichs
- [ ] Fehler werden direkt am Feld auf Deutsch angezeigt (Zod + react-hook-form).
- [ ] Nach dem Speichern: Toast „Beitrag veröffentlicht“ und Weiterleitung auf den Beitrag.
- [ ] Ungespeicherter Text geht beim Verlassen nicht still verloren: Es kommt eine Rückfrage, oder der Entwurf wird lokal gemerkt.

### Beitrag ansehen & antworten
- [ ] Die Detailseite übergibt `breadcrumb={titel}` und zeigt den vollen Beitrag mit Formatierung, Autor, Zeit und „bearbeitet“-Hinweis, falls geändert.
- [ ] Darunter stehen die Antworten chronologisch, die älteste zuerst, ohne Verschachtelung. Eine als Lösung markierte Antwort steht **oben** mit grünem Rahmen und der Kennzeichnung „Lösung“.
- [ ] Unten gibt es ein Antwortfeld (1–3000 Zeichen, gleiche Formatierung) mit „Antworten“. Die neue Antwort erscheint sofort, dazu ein Toast.
- [ ] Beim Öffnen gelten Beitrag und alle Antworten als „gesehen“ für die angemeldete Person.

### „Hilfreich“
- [ ] Unter jedem Beitrag und jeder Antwort steht ein Daumen-Button „Hilfreich“ mit Zähler. Ein Klick setzt die Markierung, ein zweiter nimmt sie zurück.
- [ ] Jede Person kann pro Beitrag oder Antwort höchstens einmal „hilfreich“ geben. Für eigene Beiträge oder Antworten geht das nicht: Der Button ist ausgegraut, `title` „Eigener Beitrag“.
- [ ] Der Button hat ein `aria-pressed`, das den Zustand angibt.

### Frage als gelöst markieren
- [ ] Nur bei Kategorie **Frage**: Wer die Frage gestellt hat, sieht an jeder fremden Antwort „Als Lösung markieren“.
- [ ] Es gibt höchstens eine Lösung pro Frage. Eine andere zu markieren ersetzt die bisherige, und die Markierung lässt sich zurücknehmen.
- [ ] Gelöste Fragen tragen in der Liste die Pill „gelöst“ und fallen aus dem Filter „Nur offene Fragen“ heraus.

### Bearbeiten, Löschen, Melden
- [ ] Am eigenen Beitrag oder an der eigenen Antwort bietet ein Menü (⋯) **„Bearbeiten“** und **„Löschen“**. Nach dem Bearbeiten steht „bearbeitet“ mit der Zeit im `title`.
- [ ] Löschen fragt erst per `AlertDialog`. Ein gelöschter Beitrag verschwindet mit allen Antworten und landet im Papierkorb (E7). Eine gelöschte Antwort verschwindet allein.
- [ ] Am fremden Beitrag oder an der fremden Antwort bietet das Menü **„Melden“**: Es öffnet einen Dialog mit Grund (unpassend · falsch/irreführend · Urheberrecht · Sonstiges) und optional einem Satz Freitext. Danach kommt ein Toast „Danke, die Admins schauen es sich an“. Pro Person und Beitrag kann man einmal melden.

### Moderation
- [ ] Super-Admin und Bereichs-Admins sehen an jedem Beitrag und jeder Antwort zusätzlich **„Ausblenden“**. Bereichs-Admins dürfen das bei allen Beiträgen, nicht nur bei denen des eigenen Fachbereichs, weil das Forum gemeinsam ist (E1).
- [ ] Ein ausgeblendeter Beitrag ist für alle anderen unsichtbar. Die Person, die ihn geschrieben hat, sieht ihn weiterhin mit dem Hinweis „Von der Moderation ausgeblendet“ und kann ihn bearbeiten oder löschen.
- [ ] Admins können Ausgeblendetes wieder **einblenden**.
- [ ] Ausblenden und Einblenden werden im Änderungsprotokoll (PROJ-47) erfasst: wer, wann, welcher Beitrag.
- [ ] Admins sehen im Lehrerzimmer einen Filter bzw. Reiter **„Gemeldet“** mit allen gemeldeten Beiträgen und Antworten, der Anzahl der Meldungen und den Gründen. Dort gibt es „Ausblenden“ oder „Meldung verwerfen“.

### Hinweis-Zähler in der Seitenleiste
- [ ] Am Eintrag „Lehrerzimmer“ erscheint ein Zähler-Badge. Er zählt (a) neue Antworten auf eigene Beiträge und (b) neue Beiträge seit dem letzten Besuch der Übersicht.
- [ ] Für Admins kommt die Anzahl offener Meldungen hinzu. Sie wird als eigener Zähler oder farblich getrennt angezeigt.
- [ ] Ab 10 zeigt der Zähler „9+“. Bei 0 erscheint kein Badge.
- [ ] Der Zähler ist auch bei eingeklappter Seitenleiste (Icon-Modus) und in der Schublade am Handy sichtbar.
- [ ] Der Zähler aktualisiert sich bei jedem Seitenwechsel im Lehrkräfte-Bereich. Ohne Neuladen in Echtzeit ist ausreichend.

## Edge Cases
- **Autorin oder Autor verliert die Lehrer-Rolle:** Die Beiträge bleiben stehen, damit das Wissen erhalten bleibt, und zeigen den Namen weiter. Die Person selbst hat keinen Zugang mehr.
- **Konto wird gelöscht** (PROJ-60): Beiträge und Antworten bleiben stehen, als Autor erscheint „Ehemalige Lehrkraft“. Die Verbindung zum Konto wird entfernt.
- **Beitrag wird gelöscht, während jemand antwortet:** Das Absenden scheitert mit „Dieser Beitrag wurde inzwischen gelöscht“. Der getippte Text bleibt im Feld, damit man ihn kopieren kann.
- **Doppeltes Absenden** (Doppelklick, langsame Verbindung): Der Button ist während des Sendens gesperrt. Es entsteht nur ein Beitrag bzw. eine Antwort.
- **Frage wird in Kategorie „Tipp“ geändert, obwohl eine Lösung markiert ist:** Die Lösungs-Markierung entfällt still. Wird sie wieder zur „Frage“, bleibt sie ungelöst.
- **Als Lösung markierte Antwort wird gelöscht oder ausgeblendet:** Die Frage gilt wieder als offen.
- **Wiederherstellen aus dem Papierkorb:** Ein wiederhergestellter Beitrag kommt mit allen Antworten, „Hilfreich“-Markierungen und Lösungs-Markierung zurück, die mit ihm gelöscht wurden.
- **Schädlicher Inhalt im Text** (Skript, HTML, `javascript:`-Links): Wird nie ausgeführt. Nur die erlaubte Formatierung (E6) wird dargestellt, Links nur mit `http(s)`/`mailto` und mit `rel="noopener noreferrer nofollow"` und `target="_blank"`.
- **Sehr lange Wörter oder URLs** zerreißen das Layout nicht, sie brechen um.
- **Lehrkraft ohne Fachbereich** (PROJ-46): kann ganz normal lesen und schreiben. Das Feld Fachbereich ist dann mit „keiner“ vorbelegt.
- **Spam / Flut:** Höchstens 10 Beiträge und 30 Antworten pro Person und Stunde. Darüber kommt eine freundliche Meldung „Bitte kurz warten“.

## Technical Requirements
- **Sicherheit:** Zugangs- und Bearbeitungsrechte werden in der Datenbank (RLS) bzw. serverseitig durchgesetzt, nicht nur in der Oberfläche. Ausgeblendete Beiträge sind für Unbefugte auch über direkte Abfragen nicht lesbar.
- **Datenschutz:** Angezeigt wird der Anzeigename, nie die E-Mail-Adresse. Wer „hilfreich“ gegeben hat, sieht man nicht, nur die Anzahl. Meldungen sind nur für Admins sichtbar. Wer gemeldet hat, bleibt für die gemeldete Person verborgen.
- **Design:** Nur `ws-*`-Tokens, hell und dunkel, höchstens eine grüne Hauptaktion pro Seite, Zustände aus `admin-states.tsx` (siehe docs/DESIGN.md, Lehrkräfte-Bereich).
- **Leistung:** Die erste Seite der Übersicht lädt bei 1000 Beiträgen in unter einer Sekunde. Der Zähler in der Seitenleiste bremst den Seitenwechsel nicht spürbar.
- **Kosten:** Keine bezahlten Dienste. Supabase Free Tier reicht, kein Realtime, kein Mail-Versand.

## Abgrenzung (nicht Teil dieses Features)
- Datei-Anhänge, Bilder und das Verlinken von Regal-Material (siehe PROJ-53)
- E-Mail- oder Push-Benachrichtigungen
- Verschachtelte Antworten (Antwort auf Antwort), @-Erwähnungen, Direktnachrichten
- Abonnieren fremder Beiträge
- Zugang für Azubis
- Getrennte Foren je Fachbereich

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Bauteile (Komponenten-Struktur)

```
Seitenleiste (bestehend, AdminNav)
└── Gruppe „Mein Unterricht“ → neuer Eintrag „Lehrerzimmer“ (für alle Lehrer-Rollen)
    └── Zähler-Badge (neue Antworten + neue Beiträge; bei Admins zusätzlich offene Meldungen)

Schnellsuche (bestehend, ⌘K) → Eintrag „Lehrerzimmer“

/admin/lehrerzimmer  — Übersicht
├── AdminPageHeader: „Lehrerzimmer“ + Hauptaktion „Neuer Beitrag“
├── Reiter (nur Admins): „Alle Beiträge“ | „Gemeldet (N)“
├── Filterleiste: Kategorie-Chips · Fachbereich · Fach · „Nur offene Fragen“ · „Meine Beiträge“
│   + Suchfeld + Sortierung (alles in der URL)
├── Beitragsliste (Karten, volle Breite)
│   └── Beitragskarte: Kategorie-Pill, „gelöst“-Pill, Punkt für Ungelesenes, Titel,
│       Textanfang, Fachbereich/Fach, Autor, Zeit, Antworten, Hilfreich
├── „Mehr laden“
└── Zustände: Laden / Leer / „Keine Treffer“ / Fehler (admin-states)

/admin/lehrerzimmer/neu  — Beitrag schreiben (schmal, max-w-2xl)
└── Beitragsformular (wird fürs Bearbeiten wiederverwendet)
    ├── Kategorie (Tipp · Frage · Idee), Titel, Fachbereich, Fach
    └── Texteditor: kleine Werkzeugleiste (fett, kursiv, Aufzählung, Link)
        + Reiter „Schreiben | Vorschau“, Entwurf wird lokal gemerkt

/admin/lehrerzimmer/[id]  — Beitrag ansehen (Brotkrumen = Titel)
├── Beitrag (formatiert) + Hilfreich-Button + Menü ⋯
│   (Bearbeiten · Löschen | Melden | Ausblenden/Einblenden für Admins)
├── Hinweisband „Von der Moderation ausgeblendet“ (nur für Autor/Admins)
├── Lösungs-Antwort oben (grüner Rahmen)
├── Antwortliste (chronologisch), je Antwort: Hilfreich, Menü ⋯,
│   „Als Lösung markieren“ (nur Fragesteller, nur bei Fragen)
└── Antwortfeld (gleicher Texteditor)

Gemeinsame Bausteine
├── Formatierte-Text-Anzeige (zeigt nur die erlaubte Formatierung)
├── Melden-Dialog (Grund + optionaler Satz)
└── Löschen-Bestätigung (AlertDialog)

Papierkorb (bestehend, /admin/papierkorb) → neuer Reiter „Lehrerzimmer“
└── Eigene gelöschte Beiträge/Antworten (Super-Admin: alle) mit „Wiederherstellen“
```

### B) Datenmodell (einfache Sprache)

Alles liegt in der bestehenden Supabase-Datenbank, in fünf neuen Tabellen:

- **Beiträge:** Kategorie (Tipp/Frage/Idee), Titel, Text (mit der einfachen Formatierung), optional Fachbereich und Fach, Autor, angelegt/zuletzt bearbeitet, Zeitpunkt der „letzten Aktivität“ (neuer Beitrag oder neue Antwort; für die Standard-Sortierung), Verweis auf die Lösungs-Antwort, Zähler für Antworten und „hilfreich“, außerdem **gelöscht am** (Papierkorb) und **ausgeblendet am/von** (Moderation).
- **Antworten:** gehören zu genau einem Beitrag; Text, Autor, Zeiten, Hilfreich-Zähler, gelöscht am, ausgeblendet am/von.
- **Hilfreich-Markierungen:** wer welchen Beitrag oder welche Antwort markiert hat. Pro Person und Ziel nur einmal. Sichtbar ist nach außen nur die Anzahl.
- **Meldungen:** gemeldeter Beitrag/Antwort, meldende Person, Grund, optionaler Satz, Status (offen · erledigt durch Ausblenden · verworfen), wer es bearbeitet hat. Nur Admins können sie lesen.
- **Lesestand:** pro Person „Übersicht zuletzt besucht am“ und pro Person und Beitrag „zuletzt gelesen am“. Daraus entstehen der Punkt für Ungelesenes und der Zähler in der Seitenleiste.

Weitere Regeln:
- **Konto gelöscht:** Die Verbindung zum Autor wird geleert, die Texte bleiben stehen und erscheinen als „Ehemalige Lehrkraft“.
- **Papierkorb:** Löschen setzt nur „gelöscht am“. Ein gelöschter Beitrag nimmt seine Antworten mit, beim Wiederherstellen kommen sie gemeinsam zurück. Nach 30 Tagen räumt eine tägliche Aufgabe in der Datenbank endgültig auf.
- **Ausblenden/Einblenden** wird zusätzlich ins bestehende Änderungsprotokoll (`admin_audit_log`) geschrieben.
- **Suche:** Volltext-Suchindex mit deutscher Sprache über Titel und Text, damit z. B. „Frachtbrief“ auch „Frachtbriefe“ findet.

### C) Technik-Entscheidungen (und warum)

- **Rechte sitzen in der Datenbank (RLS), die Schnittstellen prüfen zusätzlich die Rolle.** Wie bei allen Lehrkräfte-Funktionen bisher (`requireTeacherOrAdmin`). So sieht ein Azubi das Forum auch dann nicht, wenn jemand direkt die Datenbank abfragt. Ausgeblendete Beiträge sind nur für Autor und Admins lesbar, Meldungen nur für Admins.
- **Eigene Schnittstellen unter `/api/admin/lehrerzimmer/…`** statt direkter Datenbank-Zugriffe aus dem Browser. Das ist dasselbe Muster wie bei den übrigen Admin-Seiten. Dort werden auch die Anzeigenamen der Autoren dazugeholt, nie die E-Mail-Adressen.
- **Kein Versionsverlauf wie bei Fragen (PROJ-47), nur der Papierkorb.** Forenbeiträge sind persönliche Texte und kein gemeinsamer Lerninhalt. Ein „bearbeitet“-Hinweis genügt, und eine Versionsgeschichte wäre hier unnötiger Aufwand.
- **Formatierung als Markdown-Text gespeichert und beim Anzeigen streng gefiltert.** Die Werkzeugleiste setzt nur einfache Zeichen wie `**fett**` ein. Beim Anzeigen werden ausschließlich Absätze, fett, kursiv, Listen und Links dargestellt. Alles andere (HTML, Bilder, Skripte, `javascript:`-Links) wird als normaler Text gezeigt oder entfernt. Das ist deutlich sicherer und leichter als ein „Word-artiger“ Editor.
- **Zähler werden gespeichert, nicht jedes Mal gezählt.** Antworten- und Hilfreich-Zahlen pflegt die Datenbank selbst mit, wenn etwas dazukommt oder wegfällt. Dadurch bleibt die Liste auch bei 1000 Beiträgen schnell.
- **Seitenleisten-Zähler über eine einzige kleine Abfrage**, die bei jedem Seitenwechsel im Lehrkräfte-Bereich neu geholt wird. Echtzeit (Supabase Realtime) ist dafür nicht nötig und würde nur Verbindungen kosten.
- **Flut-Schutz in der Datenbank:** Vor dem Speichern wird gezählt, wie viele Beiträge oder Antworten die Person in der letzten Stunde geschrieben hat (Grenzen 10 / 30). Das braucht keinen Zusatzdienst.
- **Lösung markieren nur durch den Fragesteller:** wird serverseitig geprüft. Wird die Lösungs-Antwort gelöscht oder ausgeblendet, setzt die Datenbank die Frage automatisch wieder auf „offen“.
- **Doppeltes Absenden:** Der Button wird während des Sendens gesperrt, zusätzlich verwirft der Server gleiche Texte derselben Person innerhalb weniger Sekunden.
- **Keine neuen laufenden Kosten:** kein Mail-Versand, kein Realtime, kein Bild-Speicher.

### D) Abhängigkeiten (Pakete)

- **react-markdown:** zeigt den formatierten Text sicher an, ohne HTML einzuschleusen. Erlaubt werden nur Absatz, fett, kursiv, Liste und Link.
- Sonst nichts Neues: Formulare (react-hook-form + Zod), Dialoge, Tabs und Menüs (shadcn/ui), Toasts (sonner) und Icons (lucide-react) sind schon da.

### E) Umsetzungs-Reihenfolge
1. `/backend`: Tabellen, Rechte (RLS), Zähler, Flut-Schutz, Aufräum-Aufgabe, Schnittstellen.
2. `/frontend`: Übersicht, Schreiben, Detailseite, Seitenleisten-Eintrag mit Zähler, Papierkorb-Reiter.
   (Abweichend vom üblichen Ablauf zuerst das Backend, weil die Oberfläche fast nur aus Datenanzeige besteht.)

## Implementierungs-Notizen (Backend, 2026-10-29)

**Stand: Backend fertig. Migration am 2026-10-29 von David im Supabase-SQL-Editor auf `riqafwijurbxvywzlipx` eingespielt** (der Aufruf über das Werkzeug war abgelehnt worden). Prüfung danach: 6 Tabellen alle mit RLS, 29 Funktionen, Aufräum-Job `forum-papierkorb-aufraeumen` vorhanden, nur SELECT für `anon`/`authenticated` auf den Tabellen, kein `anon`-Zugriff auf `forum_*`-Funktionen. Die Tabellen sind noch leer.

**Datenbank** (`supabase/migrations/20261029_proj63_lehrerzimmer.sql`, Rückweg `..._down.sql`):
- Tabellen `forum_posts`, `forum_replies`, `forum_helpful`, `forum_reports`, `forum_post_reads`, `forum_user_state`, alle mit RLS. Deutsche Volltextsuche (`tsvector`, GIN) über Titel/Text von Beiträgen und Antworten.
- **Authenticated hat nur SELECT.** Jede Änderung läuft über `SECURITY DEFINER`-Funktionen `forum_*`, die Rolle, Besitz, Längen und Flut-Schutz selbst prüfen. Dadurch lassen sich Zähler, Ausblenden und Lösung nicht per direktem Zugriff verfälschen. Bewusste Abweichung von „Policy je INSERT/UPDATE/DELETE“ aus den Backend-Regeln: Ohne Schreib-Policy ist direktes Schreiben gesperrt.
- Sichtbarkeit (RLS): nur Lehrer-Rollen (`has_teacher_role()`); ausgeblendet nur für Autor + Admins/Bereichs-Admins; gelöscht nur für Autor + Super-Admin; Hilfreich-Markierungen nur die eigenen; Meldungen nur für Admins/Bereichs-Admins.
- Zähler (Antworten, Hilfreich, letzte Aktivität) und das Zurücksetzen einer Lösung pflegen Trigger. Wird die Lösungs-Antwort gelöscht oder ausgeblendet, ist die Frage wieder offen. Ein Kategorie-Wechsel weg von „Frage“ entfernt die Lösung.
- Flut-Schutz: 10 Beiträge, 30 Antworten, 20 Meldungen je Person und Stunde (Fehler `FRM01`). Doppelt Abgesendetes innerhalb von 30 Sekunden wird zusammengefasst.
- Papierkorb: Löschen setzt `deleted_at`; `pg_cron`-Job `forum-papierkorb-aufraeumen` räumt täglich um 03:15 nach 30 Tagen auf. Antworten, Hilfreich-Markierungen und Lösung kommen beim Wiederherstellen mit zurück, da sie nie angefasst werden.
- Ausblenden/Einblenden schreibt in `admin_audit_log` (`forum.hide` / `forum.unhide`, Bereich des Beitrags). **Frontend-Aufgabe:** Beschriftungen für diese zwei Aktionstypen in `ACTION_TYPES` von `/admin/audit-log` ergänzen (ohne sie wird der Rohtext angezeigt).
- Fehlercodes → HTTP: `FRM01` 429, `FRM02` 404, `FRM03` 403, `FRM04` 400, `FRM05` 409.

**Schnittstellen** (`/api/admin/lehrerzimmer/…`, Anmeldung per `requireTeacherOrAdmin`):
`posts` (GET Liste, POST neu) · `posts/[id]` (GET Beitrag + Antworten und „gelesen“, PATCH, DELETE) · `posts/[id]/restore` · `posts/[id]/replies` (POST) · `posts/[id]/solution` (PUT) · `replies/[id]` (PATCH, DELETE) · `replies/[id]/restore` · `helpful` · `reports` (GET nur Admins, POST melden) · `reports/resolve` · `hide` · `nav-counts` · `visit` · `trash`.

**Gemeinsam:** `src/lib/forum.ts` (Kategorien, Grenzen, Zod-Regeln, Fehler-Zuordnung, Zähler-Format „9+“) für Schnittstellen und die spätere Oberfläche.

**Abweichungen von der Spec / offene Punkte:**
- Azubis und Abgemeldete bekommen auf den Schnittstellen **403 bzw. 401** (wie alle Admin-Schnittstellen), nicht 404. Die Seiten selbst können später per `notFound()` antworten.
- Das Paket `react-markdown` aus dem Tech Design ist erst beim Frontend nötig und wurde noch nicht installiert.
- Das Aufräumen von Meldungen zu endgültig entfernten Beiträgen geschieht über `ON DELETE CASCADE`.

**Tests:** `src/lib/forum.test.ts` und Route-Tests in `src/app/api/admin/lehrerzimmer/` (63 Tests, grün; Anmeldung, Eingabe-Prüfung, Fehler-Zuordnung, Moderation nur für Admins). `tsc` und ESLint ohne Befund für die neuen Dateien. Diese Tests mocken die Datenbank.

**Datenbank-Prüfung (Live-DB, in zurückgerollten Transaktionen; es blieb nichts zurück):** Es gibt noch keine Lehrkraft, deshalb wurden zwei Bereichs-Admins in der Transaktion zeitweise auf „teacher“ gesetzt. Geprüft mit je eigener Anmeldung (`request.jwt.claims` + `SET ROLE authenticated`), 50 Fälle, alle in Ordnung (zwei davon, die „neue Antwort“-Hinweise, bestanden erst im zweiten Durchlauf mit simuliertem Zeitabstand, siehe Hinweis unten):
- Azubi: kann nicht schreiben (FRM03), sieht keine Namen, Zähler 0, direktes INSERT/UPDATE gesperrt (42501).
- Doppeltes Absenden = ein Beitrag; zu kurzer Titel abgelehnt; unbekannter Fachbereich abgelehnt.
- Hilfreich: setzen/zurücknehmen, nicht für Eigenes, fremde Markierungen unsichtbar.
- Lösung: nur der Fragesteller, nur bei Fragen; Löschen der Lösungs-Antwort macht die Frage wieder offen; Kategorie-Wechsel entfernt die Lösung.
- Melden: einmal pro Person, nicht für Eigenes; Lehrkräfte sehen weder Meldungen noch dürfen sie ausblenden; Admin sieht Meldung und Zähler.
- Ausblenden: für andere unsichtbar (Liste und Detail), Antworten darauf abgelehnt, Autor sieht es weiter, Änderungsprotokoll hat 2 Einträge (hide/unhide).
- Papierkorb: Löschen/Wiederherstellen, Antworten kommen mit zurück, fremder Papierkorb unsichtbar, fremdes Wiederherstellen abgelehnt.
- Suche: deutsche Wortstämme („Frachtbrief“ findet „Frachtbriefe“), findet auch Text in Antworten.
- Flut-Schutz greift beim 11. Beitrag je Stunde (FRM01). Konto gelöscht → „Ehemalige Lehrkraft“.
- Seitenleisten-Zähler (neue Antworten, offene Meldungen) stimmen. Hinweis zum Test: In einer einzigen Transaktion ist `now()` überall gleich, daher musste ein Zeitabstand simuliert werden. In echten Anfragen ist das kein Thema.

**Noch nicht geprüft:** Verhalten mit echten Lehrkräften und über die Oberfläche (kommt mit `/frontend` und `/qa`); das tägliche Aufräumen nach 30 Tagen (der Job ist angelegt, gelaufen ist er noch nicht).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
