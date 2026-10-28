# PROJ-63: Lehrerzimmer – Forum für den Austausch im Kollegium

## Status: Planned
**Created:** 2026-10-28
**Last Updated:** 2026-10-28

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
