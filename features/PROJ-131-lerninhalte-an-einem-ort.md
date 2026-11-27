# PROJ-131: Lerninhalte an einem Ort (Phase 3 Übersichtlichkeit, Teil 1)

## Status: Planned
**Created:** 2026-11-27
**Last Updated:** 2026-11-27

## Worum es geht

Phase 3 aus [docs/plan-uebersichtlichkeit.md](../docs/plan-uebersichtlichkeit.md), Teil 1. Heute liegen Fragen an fünf Orten (Übersicht, Fragen, Fächer, Themen, Fragen aus Material), dazu kommen eigene Seiten für Gemeldete Fragen, Schwierigste Fragen und den Papierkorb. Künftig gibt es **eine** Seite „Lerninhalte“: links Fach › Thema, rechts die Fragen, darüber die Reiter **Fragen · Gemeldet · Schwierig · Papierkorb**.

Teil 2, „Fragen hinzufügen“ mit drei Wegen, steht in [PROJ-132](PROJ-132-fragen-hinzufuegen.md). Auf dieser Seite öffnet der grüne Knopf „Fragen hinzufügen“ bis dahin den heutigen Dialog „Neue Frage“.

**Grundlage:**
- Inhalts-Baum aus PROJ-85 (`/admin/inhalte`). Diese Seite wird zur Seite „Lerninhalte“ ausgebaut und nicht neu erfunden.
- Klickbare Vorschau `docs/vorschau/phase1-neuer-aufbau.html`, Teil „Lerninhalte“. Der Test mit Kolleg/innen am 27.11.2026 ergab zwei Wünsche: B102 (Antworten aufklappen) und B103 (Baum übersichtlicher).
- Befunde aus dem Plan: B34, B35, B39 (Rest), B40, B41, B45, B49, B102, B103 und für den Papierkorb anteilig B74.

**Entscheidungen 27.11.2026 (Nutzer):**
- **E1 – Zuschnitt:** Phase 3 wird in zwei Features geteilt. Dieses Feature ist die Seite, PROJ-132 ist „Fragen hinzufügen“.
- **E2 – Alte Seiten:** Sie fallen aus dem Menü, und ihre Adressen **leiten weiter** auf „Lerninhalte“ mit dem passenden Reiter. Lesezeichen funktionieren also weiter.
- **E3 – Ausschalten:** Eine einzelne Frage wird sofort ausgeblendet, danach erscheint ein Toast mit „Rückgängig“. Wer ein ganzes Fach ausblendet, bekommt vorher eine **Rückfrage** mit der Zahl der betroffenen Fragen.

## Dependencies
- Baut auf: PROJ-85 (Inhalts-Baum), PROJ-130 (Menü, Bereichs-Umschalter, Wörterliste), PROJ-83 (Bedienmuster: `AdminTabs`, `AdminRowActions`, `AdminSegmented`, Zustände)
- Nutzt: PROJ-73/82 (Meldungs-Inbox), PROJ-74 (Schwierigste Fragen), PROJ-47/70 (Verlauf, Papierkorb, Protokoll), PROJ-12 (Stufen und Themen)
- Vor: PROJ-132 (Fragen hinzufügen) hängt den neuen Dialog an den Knopf dieser Seite. Phase 4 („Leistungsnachweis in 3 Schritten“) ergänzt im Reiter „Schwierig“ den Knopf „In neuen Leistungsnachweis“.

## User Stories
- Als **Lehrkraft** möchte ich alle Fächer, Themen und Fragen auf einer Seite finden. So muss ich nicht zwischen fünf Seiten wählen, wenn ich eine Frage korrigieren will (Prüfaufgabe 3).
- Als **Lehrkraft** möchte ich auf eine Frage klicken und ihre Antworten sehen. So prüfe ich eine Frage, ohne den Bearbeiten-Dialog zu öffnen.
- Als **Lehrkraft** möchte ich einen ruhigen Baum mit kurzen Fachnamen und klar eingerückten Themen. So erkenne ich die Ordnung auf einen Blick.
- Als **Lehrkraft** möchte ich eine falsch ausgeblendete Frage mit einem Klick zurückholen. So kostet ein Fehlklick nichts.
- Als **Lehrkraft** möchte ich gemeldete und schwierige Fragen dort sehen, wo auch die Fragen stehen, und von dort direkt bearbeiten.
- Als **Lehrkraft** möchte ich überall dieselbe Fragenzahl sehen. So kann ich den Zahlen trauen.
- Als **Lehrkraft am Handy** möchte ich erst Fach und Thema wählen und dann die Fragen lesbar sehen.

## Acceptance Criteria

### Seite, Menü und Weiterleitungen (B34, E2)
- [ ] „Lerninhalte“ ist im Menü **ein** Punkt ohne Unterpunkte. Er führt auf die Seite „Lerninhalte“ mit dem Seitenkopf „Lerninhalte“ und einem Satz Beschreibung, zum Beispiel: „Fächer, Themen und Fragen, mit denen die Azubis in der App lernen.“
- [ ] Im Seitenkopf rechts steht genau eine grüne Hauptaktion, „Fragen hinzufügen“. Ein `⋯`-Menü daneben enthält „Neues Fach …“ und, bis PROJ-132 fertig ist, die heutigen Knöpfe für Export und Import der Tabelle. Neben der Hauptaktion stehen keine großen Knöpfe für Export und Import mehr.
- [ ] Unter dem Seitenkopf: links der Baum, rechts die Reiter **Fragen · Gemeldet · Schwierig · Papierkorb** (`AdminTabs`). „Gemeldet“ und „Papierkorb“ zeigen eine Zahl, wenn dort etwas liegt.
- [ ] Der gewählte Reiter steht in der Adresse. Neu laden, Zurück und ein geteilter Link öffnen denselben Reiter mit derselben Auswahl im Baum.
- [ ] Die alten Adressen leiten weiter: Fragen, Fächer, Themen und Übersicht → Reiter „Fragen“. Gemeldete Fragen → „Gemeldet“. Schwierigste Fragen → „Schwierig“. Papierkorb → „Papierkorb“ (zu Übungsprüfungen und Lehrerzimmer siehe unten). Eine Adresse mit Suchbegriff oder Filter behält ihn, wo das möglich ist.
- [ ] Die Seite „Fragen aus Material“ bleibt bis PROJ-132 erreichbar, aber nicht über das Menü. Der Weg dorthin führt über „Fragen hinzufügen“ und das `⋯`-Menü.
- [ ] Die Schnellsuche (⌘K / Strg+K), die Brotkrumen und die Aufgabenliste auf dem Start („3 Fragen wurden gemeldet“) führen auf die neue Seite und den passenden Reiter, nicht mehr auf die alten Seiten.
- [ ] Der Test der Navigation (`admin-nav.test.tsx`) und der Wächter für die Wörterliste werden angepasst. Kein Link im Lehrkräfte-Bereich zeigt noch auf eine alte Adresse.

### Baum (B103, B45)
- [ ] Ganz oben im Baum steht „Alle Fächer“ mit der Gesamtzahl. Darunter stehen die Fächer **des Bereichs, der oben links gewählt ist**. Ein Fach aus dem anderen Bereich erscheint nie (B45). Ist „Alle Bereiche“ gewählt (Super-Admin), sind die Fächer nach Bereich gruppiert, jeweils mit einer Zwischenüberschrift.
- [ ] Jedes Fach zeigt fett sein **Kürzel** (z. B. „LOP“) und darunter in kleiner Schrift den ausgeschriebenen Namen auf **einer** Zeile. Ein zu langer Name wird mit „…“ gekürzt, der volle Text steht im `title`. Kein Fachname läuft über drei Zeilen.
- [ ] Themen stehen sichtbar eingerückt unter ihrem Fach, mit einer Linie oder einem Abstand von mindestens 16 px. Ihre Schrift ist **kleiner oder gleich** groß wie die des Fachs und nie größer.
- [ ] Die Stufe steht nicht mehr als eigene Zeile unter jedem Thema. Sie erscheint als kleine Angabe in derselben Zeile („Stufe 10“), und das nur, wenn im Stufen-Filter „Alle“ gewählt ist.
- [ ] Jede Zeile zeigt rechts die Zahl der Fragen. Die Zählregel steht unten unter „Zahlen“.
- [ ] Fächer lassen sich auf- und zuklappen. Ein Fach mit der gewählten Auswahl ist immer aufgeklappt.
- [ ] Der Stufen-Filter über dem Baum (Alle · 10 · 11 · 12, `AdminSegmented`) bleibt wie in PROJ-85.
- [ ] Das `⋯`-Menü je Fach und je Thema bleibt (Bearbeiten, Umbenennen, Thema hinzufügen, Verlauf, Löschen wie in PROJ-85). Im sichtbaren Text, in `aria-label` und in Meldungen steht nie „Knoten“ (B45).
- [ ] Unter den Themen eines aufgeklappten Fachs steht ein leiser Knopf „Thema hinzufügen“.

### Reiter „Fragen“ (B102, B39, B40)
- [ ] Die Liste zeigt die Fragen der Auswahl im Baum. Darüber steht ein Kopf mit dem Namen der Auswahl („LOP › Lagerlogistik“) und der Zahl, etwa „24 Fragen, davon 3 ausgeblendet“.
- [ ] Über der Liste: ein Suchfeld „Frage oder Antwort suchen“ und **ein** Filter „Alle Fragen · Für Azubis sichtbar · Ausgeblendet“. Ist ein Suchbegriff eingegeben, sucht die App in **allen** Fächern des Bereichs und sagt das („12 Treffer in allen Fächern“). Wer sucht oder filtert, sieht den Knopf „Suche und Filter zurücksetzen“.
- [ ] Jede Zeile zeigt den Fragetext vollständig, ohne Kürzung auf drei Zeilen. Darunter stehen Fach › Thema, Stufe, Schwierigkeit und bei Bedarf die Pille „ausgeblendet“.
- [ ] **Klick auf die Frage klappt sie auf (B102).** Dann sieht man alle Antworten, die richtige deutlich markiert (Haken und Wort „richtig“, nicht nur Farbe), dazu die Erklärung, falls es eine gibt. Ein zweiter Klick klappt die Frage zu. Bei Freitext-Fragen erscheint statt der Antworten die Musterlösung. Mit der Tastatur geht das per Enter und Leertaste, und `aria-expanded` stimmt.
- [ ] Aufklappen ändert nichts und speichert nichts. Bearbeiten startet nur über das Stift-Symbol.
- [ ] Rechts in jeder Zeile, immer sichtbar und ohne Seitwärtsscrollen: der Schalter „Für Azubis sichtbar“, das Stift-Symbol (Bearbeiten) und `⋯` mit Verlauf, Duplizieren und Löschen. Löschen steht unten, ist rot und fragt per `AlertDialog` nach.
- [ ] **Blättern (B39):** keine Seitenzahlen mehr. Die Liste zeigt zuerst 25 Fragen, darunter steht „Weitere 25 anzeigen (noch N)“. Beim Nachladen bleibt die Bildlaufposition erhalten.
- [ ] **Ausblenden (B40, E3):** Ein Klick auf den Schalter blendet die Frage sofort aus. Ein Toast meldet „Ausgeblendet. Azubis sehen die Frage nicht mehr.“ und bietet etwa 7 Sekunden lang „Rückgängig“ an. Einblenden meldet „Wieder für Azubis sichtbar“, ebenfalls mit „Rückgängig“.
- [ ] Bei einer ausgeblendeten Frage steht klein, **warum** und **von wem**, zum Beispiel: „Ausgeblendet von Frau Huber am 27.11.“ oder „Ausgeblendet nach einer Meldung“. Das gilt auch für Bestandsfragen, die bei Einführung schon ausgeblendet waren: Bei ihnen steht „Schon vor dieser Änderung ausgeblendet“. Ein „Inaktiv“ ohne Erklärung gibt es nicht mehr.
- [ ] Jedes Aus- und Einblenden und jedes „Rückgängig“ wird im Änderungsprotokoll erfasst (wie PROJ-70).
- [ ] Ist die Auswahl leer, zeigt `AdminEmptyState` den Satz „Hier gibt es noch keine Fragen“ und den Knopf „Fragen hinzufügen“. Ist eine Suche ohne Treffer, zeigt er „Keine Frage gefunden“ mit einem Tipp zur Schreibweise.

### Fach ausblenden (B41, E3)
- [ ] Ein Fach blendet man im `⋯`-Menü des Fachs aus („Für Azubis ausblenden …“), nicht mehr über einen offenen Schalter in einer Liste.
- [ ] Vorher fragt ein `AlertDialog` nach: „LOP für Azubis ausblenden? 312 Fragen in 9 Themen sind dann nicht mehr im Quiz.“ Die Knöpfe heißen „Abbrechen“ und „Ausblenden“.
- [ ] Ein ausgeblendetes Fach trägt im Baum die Pille „ausgeblendet“. Wieder einblenden geht über dasselbe Menü, ohne Rückfrage, mit Toast.

### Reiter „Gemeldet“ (B34, B50)
- [ ] Der Reiter zeigt die Meldungs-Inbox aus PROJ-73/82 mit ihren Funktionen: prüfen, Frage bearbeiten, abschließen mit Rückmeldung und Belohnung, Meldung ablehnen.
- [ ] Die Inbox folgt dem Bereichs-Umschalter und hat keinen eigenen Bereichsfilter.
- [ ] Ist im Baum ein Fach oder Thema gewählt, zeigt der Reiter nur die Meldungen dazu. Der Kopf sagt das, und ein Knopf „Alle Meldungen zeigen“ hebt die Einschränkung auf.
- [ ] Die Zahl am Reiter ist dieselbe Zahl, die die Aufgabenliste auf dem Start zeigt.

### Reiter „Schwierig“ (B49)
- [ ] Der Reiter zeigt die schwierigsten Fragen aus PROJ-74, sortiert nach dem Anteil richtiger Antworten, aufsteigend.
- [ ] Über der Liste steht ein Satz statt des Filters „Mindestens … Antworten“: „Fragen, die Azubis am häufigsten falsch beantworten. Gezählt werden Fragen ab 30 Antworten.“ Die Schwelle ist fest.
- [ ] Jede Zeile zeigt „N % richtig bei M Antworten“ als Text und als kleinen Balken, dazu Fach › Thema. Eine Zeile führt immer irgendwohin: Klick klappt die Antworten auf wie im Reiter „Fragen“. Dazu gibt es „Bearbeiten“ und „Im Thema zeigen“. Letzteres wählt das Thema im Baum und wechselt zum Reiter „Fragen“.
- [ ] Ist im Baum ein Fach oder Thema gewählt, gilt die Einschränkung wie im Reiter „Gemeldet“.
- [ ] „In neuen Leistungsnachweis“ kommt mit Phase 4. *Begründung:* Der heutige Anlegen-Dialog ist der Befund B22, und ihn hier anzubinden wäre doppelte Arbeit.

### Reiter „Papierkorb“ (B34, B74 anteilig)
- [ ] Der Reiter zeigt gelöschte **Fragen, Themen und Fächer** des gewählten Bereichs. Ein `AdminSegmented` wählt zwischen Fragen, Themen und Fächern.
- [ ] Jeder Eintrag zeigt, wer ihn wann gelöscht hat, und bietet „Wiederherstellen“ an. Endgültig löschen bleibt dem Super-Admin vorbehalten und fragt nach (wie heute).
- [ ] Gelöschte **Übungsprüfungen** stehen künftig auf der Seite „Übungsprüfungen“ (Link oder Reiter „Papierkorb“). Gelöschte **Lehrerzimmer**-Beiträge stehen im Papierkorb des Lehrerzimmers. Danach gibt es keine eigene Seite „Papierkorb“ mehr, und die alte Adresse leitet auf diesen Reiter weiter.

### Zahlen (B35)
- [ ] **Eine Zählregel für die ganze App:** Eine Frage zählt, wenn sie nicht im Papierkorb liegt und zum gewählten Bereich gehört. Ausgeblendete Fragen zählen mit und werden als „davon N ausgeblendet“ genannt.
- [ ] Baum, Listenkopf, die Zahl unter „Lerninhalte“ auf dem Start und die Schnellsuche zeigen für dieselbe Auswahl dieselbe Zahl. Ein Test vergleicht die Zahlen für ein Fach.
- [ ] Gehört eine Frage zu keinem Thema („Ohne Thema“), erscheint sie im Baum unter ihrem Fach als eigener Eintrag „Ohne Thema“ und wird mitgezählt. Das Aufräumen dieser Fragen gehört zu Phase 7.

### Handy und Darstellung
- [ ] Unter 1024 px steht der Baum oben als einklappbare Leiste „Fach und Thema: LOP › Lagerlogistik“. Nach der Auswahl klappt sie zu, und die Fragen stehen darunter.
- [ ] Reiter und Fragenzeilen passen auf 360 px Breite, ohne seitliches Scrollen der Seite. Die Aktionen einer Zeile stehen am Handy unter dem Text.
- [ ] Alle Bedienelemente sind mindestens 44 × 44 px groß, nur Farb-Tokens (`ws-*`) sind erlaubt, Hell- und Dunkelmodus erreichen WCAG AA.
- [ ] Laden zeigt Skeleton-Zeilen (`AdminLoadingState`), Fehler `AdminErrorState` mit „Erneut versuchen“. Zahlen im Kopf erscheinen erst nach dem Laden.

## Edge Cases
- **Rückgängig nach Seitenwechsel:** Wer innerhalb der 7 Sekunden die Seite wechselt, kann nicht mehr rückgängig machen. Die Änderung bleibt gespeichert, und es geht nichts verloren. Der Schalter funktioniert weiterhin.
- **Mehrere Fragen schnell hintereinander ausblenden:** Jeder Toast gehört zu seiner Frage. „Rückgängig“ holt nur die Frage dieses Toasts zurück.
- **Zwei Lehrkräfte gleichzeitig:** A blendet eine Frage aus, B hat die Seite noch offen. Bei B erscheint der Stand nach dem nächsten Laden oder Klick. Klickt B auf den Schalter einer schon geänderten Frage, gilt der Zustand, den B sieht, und B bekommt einen Hinweis.
- **Frage im Papierkorb, die noch gemeldet ist:** Die Meldung bleibt im Reiter „Gemeldet“ und zeigt „Frage liegt im Papierkorb“ mit „Wiederherstellen“.
- **Thema einer Meldung oder schwierigen Frage ist gelöscht:** Die Zeile zeigt das Fach und „Ohne Thema“, „Im Thema zeigen“ fehlt dann.
- **Bereich wechseln, während ein Thema gewählt ist:** Die Auswahl springt auf „Alle Fächer“ des neuen Bereichs, und der Reiter bleibt.
- **Alter Link mit gelöschtem Thema in der Adresse:** Die Seite zeigt „Alle Fächer“ und den Hinweis „Dieses Thema gibt es nicht mehr“.
- **Fach mit 0 Fragen ausblenden:** Die Rückfrage sagt „Das Fach hat noch keine Fragen“ und bleibt trotzdem, damit der Ablauf gleich bleibt.
- **Sehr viele Fragen in „Alle Fächer“ (über 3.000):** Die Liste lädt nur die ersten 25. Suche und Filter laufen über alle Fragen.
- **Super-Admin mit „Alle Bereiche“:** Der Baum ist nach Bereich gruppiert, Zahlen und Reiter gelten für beide Bereiche, und jede Zeile zeigt eine Bereich-Pille (nur in dieser Ansicht).

## Technical Requirements
- Kein neues Datenmodell nötig, außer vielleicht für den Grund des Ausblendens (bei /architecture klären).
- Rechte wie PROJ-70: Alle Lehrkräfte dürfen Inhalte ändern, und alles wird protokolliert. Neue Seiten und APIs brauchen einen Eintrag in den Freigabelisten (`roles.ts`).
- Tempo: Die erste Ansicht soll nicht langsamer sein als `/admin/inhalte` heute. Ziel unter 1,5 s ist Phase 6 (B46).
- Kein Dev-Server und kein Playwright lokal. Geprüft wird mit Unit-Tests, Build und einem Browser-Blick nach dem Deploy.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
