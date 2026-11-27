# PROJ-131: Lerninhalte an einem Ort (Phase 3 Übersichtlichkeit, Teil 1)

## Status: Deployed
**Created:** 2026-11-27
**Last Updated:** 2026-11-27 (Deployed)

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
- **E4 – Mehrfachauswahl (bei /architecture):** Die Mehrfachauswahl der alten Seite „Fragen“ zieht mit in den Reiter „Fragen“ um.

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
- [ ] **Mehrfachauswahl (E4):** Jede Zeile hat ein Häkchen. Sobald etwas angehakt ist, erscheint über der Liste eine Leiste „N ausgewählt“ mit Thema ändern, Stufe, Fach, Schwierigkeit, Ausblenden/Einblenden und Löschen. Löschen und Ausblenden fragen vorher mit der Zahl nach. Alles kann die alte Seite „Fragen“ heute auch.
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

**Stand:** 2026-11-27 · **Ergebnis:** kein neues Datenmodell, keine Migration, keine neuen Pakete. Die Seite `/admin/inhalte` wird ausgebaut, und die vorhandenen Bausteine (Baum, Fragen-Panel, Meldungs-Inbox, Schwierigste Fragen, Papierkorb) ziehen als Reiter auf diese Seite.

**Entscheidung E4 (27.11.2026, Nutzer):** Die **Mehrfachauswahl** der alten Seite „Fragen“ kommt mit in den Reiter „Fragen“: Häkchen je Zeile, darüber die Leiste „N ausgewählt: Thema ändern · Stufe · Fach · Schwierigkeit · Ausblenden/Einblenden · Löschen“. Die vorhandene Schnittstelle für Massenänderungen wird weiter genutzt. Erst danach darf die alte Adresse weiterleiten.

### A) Aufbau der Seite

```
Lerninhalte  (/admin/inhalte)
+-- Seitenkopf „Lerninhalte“ + ein Satz
|   +-- [Fragen hinzufügen]  (grün, öffnet heute den Dialog „Neue Frage“)
|   +-- ⋯  Neues Fach … · Tabelle exportieren · Tabelle importieren · Fragen aus Material
|
+-- Linke Spalte (ab 1024 px) / einklappbare Leiste „Fach und Thema: …“ (Handy)
|   +-- Stufe: Alle · 10 · 11 · 12            (wie PROJ-85)
|   +-- Baum
|       +-- Alle Fächer ................ 1.234
|       +-- [Zwischenüberschrift Bereich – nur bei „Alle Bereiche“]
|       +-- LOP  (fett)  ................. 312   ⋯  Bearbeiten · Thema hinzufügen ·
|       |   Logistische Leistungsprozesse (klein, eine Zeile, „…“)   Für Azubis ausblenden … ·
|       |   │ Lagerlogistik  Stufe 10 ..... 24     Verlauf
|       |   │ Ohne Thema .................... 3
|       |   │ + Thema hinzufügen (leise)
|       +-- BGP  [ausgeblendet] .......... 834
|
+-- Rechte Spalte
    +-- Reiter: Fragen · Gemeldet (3) · Schwierig · Papierkorb (5)
    |
    +-- Reiter „Fragen“
    |   +-- Kopf „LOP › Lagerlogistik · 24 Fragen, davon 3 ausgeblendet“
    |   +-- Suchfeld · Filter (Alle · Für Azubis sichtbar · Ausgeblendet) · „Suche und Filter zurücksetzen“
    |   +-- Leiste für die Mehrfachauswahl (erscheint, sobald etwas angehakt ist)
    |   +-- Fragenzeile (× 25)
    |   |   +-- ☐  Fragetext (ganz)  ·  Fach › Thema · Stufe · Schwierigkeit · [ausgeblendet]
    |   |   +-- „Ausgeblendet von Frau Huber am 27.11.“ (nur wenn ausgeblendet)
    |   |   +-- rechts: Schalter „Für Azubis sichtbar“ · Stift · ⋯ (Verlauf, Duplizieren, Löschen)
    |   |   +-- aufgeklappt: Antworten (✓ richtig), Erklärung bzw. Musterlösung
    |   +-- „Weitere 25 anzeigen (noch N)“
    |   +-- Leerzustand / „Keine Frage gefunden“
    |
    +-- Reiter „Gemeldet“    → vorhandene Meldungs-Inbox, eingeschränkt auf die Auswahl im Baum
    +-- Reiter „Schwierig“   → vorhandene Liste, fester Satz „ab 30 Antworten“, Zeilen klappen auf
    +-- Reiter „Papierkorb“  → Fragen · Themen · Fächer (Segment), Wiederherstellen
```

**Was mit den Teilen passiert:**

| Teil heute | Künftig |
|---|---|
| Inhalts-Baum (PROJ-85) | bleibt, neu gezeichnet: Kürzel fett, Name klein auf einer Zeile, Themen eingerückt, Stufe in derselben Zeile, „Alle Fächer“ oben, „Thema hinzufügen“ unten, „Fach ausblenden“ im `⋯`-Menü statt Schalter |
| Fragen-Panel der Inhalte-Seite | wird zum Reiter „Fragen“: Aufklappen, „Weitere 25“, Mehrfachauswahl, neuer Ausblenden-Ablauf, Suche über alle Fächer |
| Seite „Fragen“ (1.261 Zeilen) | Mehrfachauswahl, Export/Import und der Dialog „Neue Frage“ ziehen um, danach Weiterleitung |
| Seiten „Fächer“ und „Themen“ | alles Nötige steht schon im Baum, Weiterleitung |
| Seite „Gemeldete Fragen“ | Inbox wird in den Reiter eingehängt, Weiterleitung |
| Seite „Schwierigste Fragen“ | Liste wird in den Reiter eingehängt, Weiterleitung |
| Seite „Papierkorb“ | Fragen/Themen/Fächer → Reiter; Übungsprüfungen → Seite „Übungsprüfungen“; Lehrerzimmer hat schon einen eigenen Papierkorb; danach Weiterleitung |
| Seite „Fragen aus Material“ | bleibt bis PROJ-132, nur über `⋯` erreichbar |

### B) Daten (kein neues Datenmodell)

Alles, was die Seite braucht, ist schon gespeichert:

- **Frage:** Text, Antworten mit „richtig“, Erklärung, Musterlösung, Stufe, Schwierigkeit, Thema, Fach (über die Fach-Zuordnung), „für Azubis sichtbar“, Papierkorb-Datum.
- **Wer hat wann ausgeblendet:** Die Versionsgeschichte aus PROJ-47 legt bei jedem Aus- und Einblenden automatisch einen Eintrag mit Person und Zeitpunkt an. Daraus entsteht „Ausgeblendet von Frau Huber am 27.11.“. Ist der letzte Eintrag der Einführungsstand („Stand bei Einführung“), steht dort „Schon vor dieser Änderung ausgeblendet“.
- **Warum ausgeblendet („nach einer Meldung“):** Änderungen lassen sich heute schon zu einem Vorgang mit kurzer Beschreibung bündeln. Wird eine Frage aus der Meldungs-Inbox heraus ausgeblendet, bekommt der Vorgang die Beschreibung „Nach einer Meldung“. Dafür braucht es keine neue Spalte, nur die Inbox muss den Vorgang mitschicken.
- **Rückgängig** ist einfach ein zweites Umschalten. Es landet als eigener Eintrag im Verlauf und im Änderungsprotokoll. Damit gilt die Forderung „jedes Rückgängig wird erfasst“.
- **Zahlen im Baum:** Der Baum lädt heute schon jede Frage einmal (nur Stufe, Thema, Fach). Neu kommt „sichtbar ja/nein“ dazu, damit „davon N ausgeblendet“ ohne zweiten Abruf stimmt.

### C) Technische Entscheidungen (und warum)

1. **Ausbauen statt neu bauen.** `/admin/inhalte` hat schon Baum, Adresse mit Auswahl, Handy-Ansicht und Fehlerzustände. Das spart Zeit und hält bewährtes Verhalten.
2. **Reiter und Auswahl stehen in der Adresse** (z. B. `?reiter=gemeldet&fach=…&thema=…`). Wie heute ändert ein Klick nur die Adresse, ohne die Seite neu zu laden. So funktionieren Neu laden, Zurück und geteilte Links.
3. **Weiterleitungen zentral in den Next.js-Einstellungen** statt auf jeder alten Seite. Eine Liste: alte Adresse → neue Adresse mit Reiter. Suchbegriffe und Filter werden dabei übersetzt (z. B. `?subject=LOP` → `?fach=<LOP>`), wo das geht. Die alten Seiten-Dateien werden danach gelöscht. **Reihenfolge:** Erst wenn ein Reiter fertig ist, wird die zugehörige alte Seite umgeleitet. So fehlt nie etwas.
4. **Eine Zählregel an einer Stelle.** Heute zählen Baum (alle Fragen) und Start (nur sichtbare, über die Fächerliste) verschieden, daher 834 gegen 736. Künftig rechnet **ein** gemeinsamer Baustein: „nicht im Papierkorb, im gewählten Bereich, sichtbare und ausgeblendete zusammen“. Baum, Listenkopf, Start und Schnellsuche nutzen ihn. Ein Test prüft, dass alle für ein Fach dieselbe Zahl liefern. Für Lehrkräfte ohne Super-Admin-Recht bleiben private Nachweis-Fragen wie heute draußen, auf allen Wegen gleich.
5. **Antworten kommen mit der Liste.** Die Fragenliste liefert für die 25 Zeilen gleich Antworten (mit „richtig“), Erklärung und Musterlösung mit. Aufklappen ist dann sofort da, ohne Wartezeit und ohne Extra-Abruf. Die Liste ist nur für Lehrkräfte, damit bleibt die richtige Antwort geschützt.
6. **„Weitere 25 anzeigen“ statt Seitenzahlen.** Die Schnittstelle liefert wie bisher Abschnitte, nur jetzt mit 25 statt 20 Fragen. Die Oberfläche hängt den nächsten Abschnitt unten an und behält die Bildlaufposition.
7. **Ausblenden sofort, mit Rückgängig.** Der Schalter ändert die Zeile sofort und speichert im Hintergrund. Der Toast (7 s) trägt die Kennung **seiner** Frage. „Rückgängig“ holt nur diese Frage zurück. Ändert jemand anderes die Frage gleichzeitig, meldet die vorhandene Versionsprüfung (PROJ-47) den Konflikt, und B bekommt einen Hinweis.
8. **Fach ausblenden mit Rückfrage.** Die Zahl in der Rückfrage („312 Fragen in 9 Themen“) kommt aus dem schon geladenen Baum, ohne neuen Abruf.
9. **Reiter „Gemeldet“ und „Schwierig“ übernehmen die fertigen Bausteine** und bekommen nur eine Einschränkung auf Fach/Thema. Die Meldungs-Schnittstelle kann das schon. Die Auswertung „Schwierig“ kann schon nach Fach filtern, und das Thema wird danach aussortiert. Der Filter „Mindestens … Antworten“ entfällt. Die Schwelle ist fest 30.
10. **Zahlen an den Reitern** („Gemeldet 3“) kommen aus derselben Aufgaben-Zählung wie die Liste „Zu erledigen“ auf dem Start. Damit sind sie gleich.
11. **Papierkorb:** Die vorhandene Papierkorb-Schnittstelle bleibt, der Reiter zeigt nur Fragen, Themen und Fächer. Gelöschte Übungsprüfungen bekommen auf der Seite „Übungsprüfungen“ einen Link „Papierkorb“.
12. **Rechte und Freigaben:** wie PROJ-70. Es entstehen keine neuen Schnittstellen. Die Freigabelisten in `roles.ts` werden aufgeräumt (alte Seiten raus, Weiterleitungen bleiben erreichbar). Die Wächter-Tests prüfen das.
13. **Menü, Schnellsuche, Brotkrumen, Start-Aufgaben** zeigen auf `/admin/inhalte?reiter=…`. Ein Test durchsucht den Lehrkräfte-Bereich nach Links auf alte Adressen und schlägt fehl, wenn noch einer übrig ist.

### D) Abhängigkeiten (Pakete)

Keine neuen Pakete. Genutzt wird, was schon da ist: shadcn/ui (Collapsible, Checkbox, Switch, AlertDialog), `AdminTabs`, `AdminSegmented`, `AdminRowActions`, `admin-states`, `sonner` (Toast mit Aktion „Rückgängig“).

### E) Bauschritte (Vorschlag, je Schritt Tests + Build)

1. **Zählregel und Baum:** gemeinsamer Zählbaustein, Baum neu gezeichnet (B103, B45), „Alle Fächer“, „Ohne Thema“, Fach ausblenden mit Rückfrage (B41), Zahlen-Vergleichstest (B35).
2. **Reiter „Fragen“:** Kopf, Suche über alle Fächer, ein Filter, Aufklappen (B102), „Weitere 25“ (B39), Ausblenden mit Rückgängig und „von wem“ (B40), Mehrfachauswahl (E4).
3. **Reiter „Gemeldet“, „Schwierig“, „Papierkorb“** samt Zahlen an den Reitern (B49, B74 anteilig), Papierkorb-Link bei Übungsprüfungen.
4. **Umzug und Aufräumen:** Seitenkopf mit `⋯`-Menü (B44), Weiterleitungen, Menü als ein Punkt, Schnellsuche, Start-Links, alte Seiten löschen, Navigations- und Wörterlisten-Tests anpassen (B34).

**Modellwahl:** Bauen nach dieser Spec mit **Sonnet**. Schritt 4 (Weiterleitungen und Freigabelisten) danach mit **Opus** gegenlesen, weil neue oder entfallende Seiten in zwei Freigabelisten stehen müssen (`roles.ts`).

**Risiken:**
- Die Seite „Fragen“ ist groß. Wird beim Umzug etwas vergessen, fehlt es nach der Weiterleitung. Deshalb vor Schritt 4 eine Liste aller Funktionen der alten Seite abhaken.
- Tempo: Die Antworten in der Liste machen jeden Abschnitt etwas größer (25 Fragen, unkritisch). Der Baum lädt eine Spalte mehr, die Zahl der Abrufe bleibt gleich.

## Implementation Notes (2026-11-27)

Alle vier Bauschritte sind fertig und je einzeln committet. 4.829 Tests grün, Build sauber, Lint ohne Fehler. **Noch nicht gepusht, nicht deployt und nicht im Browser geprüft.** Keine Migration, kein neues Paket, keine neue Schnittstelle.

**Gebaut:**
- **Zählregel** an einer Stelle (`lib/question-count*.ts`), benutzt von Baum und Fächer-Schnittstelle. Ursache für 834 gegen 736 (BGP Spedition, am 27.11. in der Datenbank nachgeprüft: 834 Fragen, 736 sichtbar): Der Start zählte nur sichtbare. Zusätzlich war die alte Zählung über eingebettete Zeilen auf 1000 begrenzt.
- **Baum** neu gezeichnet; die Fragen-Schnittstelle liefert 25 je Abschnitt, Antworten, `hidden_info` („warum und von wem“, `lib/hidden-info.ts`), Suche in Frage **und** Antwort.
- **Grund „nach einer Meldung“:** `PATCH /api/admin/questions/[id]` mit `reason: 'meldung'` bündelt die Version zum Vorgang „Nach einer Meldung“.
- **Seite** `/admin/inhalte` = „Lerninhalte“ mit vier Reitern, Kopf-Menü (Neues Fach, Export, Import, Fragen aus Material), am Handy Baum als einklappbare Leiste.
- **Weiterleitungen** in `lib/redirects.ts` (eingebunden in `next.config.ts`), alte Seiten gelöscht, Freigabeliste in `roles.ts` bereinigt. Ein Wächter-Test schlägt fehl, wenn wieder ein Link auf eine alte Adresse entsteht.

**Abweichungen und Funde:**
- **Azubi-Seite geändert (nötig für B41):** Bisher beachtete kein Azubi-Weg `subjects.is_active`, und die Verwaltung ließ ein Fach mit sichtbaren Fragen gar nicht ausblenden. Jetzt ist Ausblenden immer erlaubt, und Fächerlisten, Quiz, Blitzrunde, Lücken, Themen und die Zufallsauswahl der Übungsprüfung lassen ausgeblendete Fächer weg. Von Lehrkräften zusammengestellte Übungsprüfungen bleiben unverändert. Am 27.11. war kein Fach ausgeblendet, für Azubis ändert sich also zunächst nichts.
- **Lehrerzimmer-Papierkorb:** Die Spec ging davon aus, dass es schon einen eigenen gibt. Es gab nur den Reiter auf der Seite „Papierkorb“. Jetzt öffnet er als Fenster im Lehrerzimmer, ebenso bei den Übungsprüfungen.
- **Reiter „Schwierig“:** Themen-Rangliste und Zeitraum bleiben als Segmente erhalten. Die Stufe kommt aus dem Baum.
- **Bewusst entfallen:** Filter nach Schwierigkeit und Sortieren auf der alten Seite „Fragen“ (die Spec will einen Filter), die Spalte „Erstellt“, die Suche nach Themennamen.
- **Suche:** Treffer in den Antworten sind auf 200 begrenzt, damit die Anfrage-Adresse kurz bleibt. Treffer im Fragetext sind nicht begrenzt.
- **Zahlen:** Die Schnellsuche zeigt keine Fragenzahlen. Verglichen werden Baum, Listenkopf und Start.
- **Tabellen-Export** folgt Fach, Thema und Stufe im Baum. Er nutzt weiter die bisherige Export-Schnittstelle: Sie arbeitet im Arbeitsbereich der Person, bei „Alle Bereiche“ also nur in einem Bereich (wie bisher).

**Für /qa besonders prüfen:** Ausblenden eines Fachs auf der Azubi-Seite, „Rückgängig“-Toast, Handy bei 360 px, Weiterleitungen mit `?q=` und `?tab=`.

## QA Test Results

**Stand:** 2026-11-27 · **Geprüft von:** /qa (Opus) · **Ergebnis:** produktionsreif. 0 Critical, 0 High, 0 Medium, 5 Low.

**So wurde geprüft:** Code der 82 geänderten Dateien gelesen (Commits 0687226 bis 0921c14), dazu automatische Tests, Typprüfung, Lint und Build. Rechte und Daten wurden **lesend** in der Produktions-Datenbank geprüft. Wie vereinbart lief kein Dev-Server und kein Playwright (siehe Technical Requirements). Darum gibt es keinen Test in mehreren Browsern und keine echten Messungen bei 360/768/1440 px. Die Darstellung ist nur anhand der Klassen im Code geprüft. **Der Browser-Blick nach dem Deploy ist Pflicht.**

### Automatische Prüfungen
| Prüfung | Ergebnis |
|---|---|
| `vitest` | 365 Dateien, **4.829 Tests grün** |
| `tsc --noEmit` | ohne Fehler |
| `eslint` (admin, lib) | 0 Fehler, 19 Warnungen (alle schon vorher vorhanden) |
| `npm run build` | sauber |
| Links auf alte Adressen im Code | keine (grep über `src/`, Wächter-Test vorhanden) |

### Akzeptanzkriterien
| Bereich | Ergebnis | Anmerkung |
|---|---|---|
| Seite, Kopf, `⋯`-Menü, eine grüne Hauptaktion | ✅ | „Fragen aus Material“ steht nur für den Super-Admin im Menü, wie bisher die Seite |
| Reiter in der Adresse (`?reiter=`, `fach`, `thema`, `klasse`) | ✅ | Suchbegriff steht nur beim Öffnen in der Adresse (`?q=`), siehe BUG-4 |
| Weiterleitungen | ✅ mit Einschränkung | Reihenfolge laut Next-Doku: `redirects` laufen vor dem Proxy, die Rechteprüfung gilt fürs Ziel. `?q=` bleibt erhalten. Filter gehen verloren, siehe BUG-2 |
| Menü, Schnellsuche (3 Reiter-Einträge), Start-Aufgabe „gemeldet“, Kachel „Meine Fächer“ | ✅ | |
| Baum: Alle Fächer, Kürzel fett + Name einzeilig mit `title`, Einrückung 24 px mit Linie, gleiche Schriftgröße, Stufe in der Zeile nur bei „Alle“, „Thema hinzufügen“, Gruppen bei „Alle Bereiche“ | ✅ | Zuklappen des gewählten Fachs wirkt nicht, siehe BUG-1 |
| kein „Knoten“ im sichtbaren Text | ✅ | |
| Reiter „Fragen“: Kopf mit „davon N ausgeblendet“, Suche über alle Fächer und in Antworten, ein Filter, Zurücksetzen | ✅ | |
| Aufklappen (Haken **und** Wort „richtig“, Erklärung, Musterlösung, `aria-expanded`, Enter/Leertaste über `<button>`) | ✅ | |
| Zeilenaktionen, Löschen rot mit `AlertDialog` | ✅ | |
| „Weitere 25 anzeigen (noch N)“, stabile Reihenfolge (`order id`) | ✅ | |
| Ausblenden sofort + Toast 7 s mit „Rückgängig“, je Frage eigener Toast | ✅ | Konflikt (409): Klick gilt trotzdem, mit Hinweis |
| „Ausgeblendet von … am …“ / „Schon vor dieser Änderung ausgeblendet“ | ✅ | In der DB: alle 668 heute ausgeblendeten Fragen haben als letzten Stand „Stand bei Einführung“ und zeigen damit richtig „Schon vor dieser Änderung“ |
| Protokoll für Aus-/Einblenden und Rückgängig | ✅ | Trigger schreibt `deactivated`/`activated` mit Person; Audit `question.activate/deactivate` stimmt jetzt auch mit `expected_version` |
| Mehrfachauswahl mit Rückfrage bei Löschen/Ausblenden, Päckchen à 200 | ✅ | |
| Leerzustände | ✅ | |
| Fach ausblenden über `⋯`, Rückfrage mit Zahl, Pille, Einblenden ohne Rückfrage | ✅ | Protokoll-Eintrag ungenau, siehe BUG-3 |
| Azubi-Seite lässt ausgeblendete Fächer weg | ✅ | Fächerlisten, `/api/questions`, Blitzrunde, Lernrunden, Schwächen, Themen, Übungsprüfung-Zufall. Alle hängen an `getDepartmentSubjectIds` (`is_active`), der Zwischenspeicher wird beim Umschalten geleert. Es gibt 0 Fragen mit mehreren Fächern, also bleibt keine über ein zweites Fach sichtbar |
| Reiter „Gemeldet“: Einschränkung auf Fach/Thema inkl. „Ohne Thema“, „Alle Meldungen zeigen“, „Frage liegt im Papierkorb“ + Wiederherstellen, Grund „Nach einer Meldung“ | ✅ | |
| Reiter „Schwierig“: fester Satz „ab 30“, „Im Thema zeigen“ fehlt bei gelöschtem Thema | ✅ | |
| Reiter „Papierkorb“: Segmente, Endgültig nur Super-Admin; Übungsprüfungen und Lehrerzimmer als Fenster | ✅ | |
| Zahlen: eine Zählregel (Baum, Listenkopf, Start) | ✅ | gleiche Filter (Papierkorb, Bereich, privat), Test vorhanden |
| Handy: Baum als Leiste, Aktionen unter dem Text, 44 px, nur `ws-*` | ✅ (Code) | im Browser noch nicht gesehen |
| Laden/Fehler, Zahl im Kopf erst nach dem Laden | ✅ | |

### Edge Cases
Bereich wechseln (der Umschalter löscht `fach`/`thema` und lädt neu) ✅ · gelöschtes Thema in der Adresse (Hinweis + „Alle Fächer“) ✅ · Rückgängig nach Seitenwechsel (Toast bleibt, Speichern geht trotzdem) ✅ · mehrere Toasts ✅ · zwei Lehrkräfte (409 → Hinweis) ✅ · Fach mit 0 Fragen ✅ · über 3.000 Fragen (25 je Abschnitt) ✅ · Super-Admin „Alle Bereiche“ (Gruppen, Bereich-Pille nur dort) ✅

### Sicherheit (Red Team)
- **Rechte:** Es gibt keine neue Schnittstelle. Alle geänderten Routen prüfen weiter mit `requireContentAdmin` und Bereich (`scopeDepartmentIds`). Die alten Seiten sind aus `TEACHER_ADMIN_PATHS` entfernt, die Weiterleitung läuft vorher. ✅
- **Dienst-Client** nur in `loadHiddenInfo`, nach der Rechteprüfung und nur für die IDs, die der Nutzer gerade lesen darf. Er gibt nur einen Satz mit Name und Datum heraus (Namen sind im Bereich ohnehin sichtbar, PROJ-70). ✅
- **Suche:** `%`, `_`, `\` und Anführungszeichen werden maskiert. Kommas und Klammern zerlegen den `.or()`-Filter nicht. Die Antwort-IDs kommen aus der DB (UUIDs). Private Fragen bleiben über die Hauptabfrage draußen. ✅
- **`reason: 'meldung'`:** fest auf einen Wert (`z.literal`). Er bündelt nur die eigene, gerade entstandene Version. ✅
- **Antworten in der Liste:** nur für Lehrkräfte (Verwaltungs-Schnittstelle). Für Azubis ändert sich nichts. ✅
- **RLS:** `questions_read` filtert `deleted_at` nicht. Darum findet die Prüfung „Frage im Papierkorb“ auch für Lehrkräfte die Zeile. ✅

### Gefundene Fehler (alle Low)

**BUG-1 (Low): Gewähltes Fach lässt sich nicht zuklappen.** `content-tree.tsx` setzt `sOpen = selected.subjectId === subject.id || expanded.has(…)`. Der Pfeil „LOP zuklappen“ (und ← auf der Tastatur) ändert nichts, solange das Fach oder eines seiner Themen gewählt ist. Das folgt der Spec („immer aufgeklappt“), aber der Knopf verspricht etwas anderes. *Schritte:* LOP › Lagerlogistik wählen, auf den Pfeil bei LOP klicken, nichts passiert. *Vorschlag:* Pfeil beim gewählten Fach ausblenden oder Zuklappen erlauben.

**BUG-2 (Low): Weiterleitungen übernehmen Filter nicht.** `/admin/questions?subject=LOP` landet auf „Alle Fächer“, weil die Seite `subject` nicht liest. Das Tech Design (C3) sah die Übersetzung in `?fach=<id>` vor. `/admin/papierkorb?tab=topic` oder `?tab=subject` öffnet das Segment „Fragen“ statt „Themen“ bzw. „Fächer“. `?q=` funktioniert. Betroffen sind nur alte Lesezeichen.

**BUG-3 (Low): Fach aus- und einblenden steht im Protokoll als „subject.update“.** `PATCH /api/admin/subjects/[id]` zählt `Object.keys(parsed.data).length === 1`. Die Seite schickt aber immer `expected_version` mit. Bei den Fragen wurde dasselbe Muster in diesem Feature behoben (`changedKeys`), bei den Fächern nicht. Der Verlauf (`content_versions`) zeigt den Vorgang trotzdem richtig als `deactivated`/`activated`.

**BUG-4 (Low): Suche über alle Fächer ist im Kopf und bei der Baum-Auswahl verwirrend.** (a) Während einer Suche steht oben weiter „LOP › Lagerlogistik“, darunter „12 Treffer in allen Fächern“. (b) Ein Klick auf einen anderen Eintrag im Baum löscht den eingegebenen Suchbegriff, weil das Panel per `key` neu startet und die Suche nicht in der Adresse steht. *Vorschlag:* Bei aktiver Suche als Titel „Suche in allen Fächern“ zeigen und `q` in die Adresse schreiben.

**BUG-5 (Low, Tempo): `GET /api/admin/subjects` lädt jetzt bei jedem Aufruf alle Fragen des Bereichs zum Zählen.** Das sind heute rund 3.800 (SPED) bzw. 4.500 (TOUR) Zeilen in 4 bis 5 Abfragen. Gebraucht werden die Zahlen nur auf dem Start („Meine Fächer“). Die anderen Aufrufer (Meldung prüfen, Nachweis-Kategorien, Änderungen, Fragen aus Material, `use-admin-subject-codes`) brauchen nur die Fächerliste. *Vorschlag:* Zählen nur mit `?counts=1`.

### Nicht geprüft (nach dem Deploy im Browser)
Echte Darstellung bei 360/768/1440 px und Hell/Dunkel; Safari/Firefox; Toast „Rückgängig“ von Hand; ein Fach ausblenden und als Azubi prüfen, dass es fehlt (danach wieder einblenden); Lehrkraft-Ansicht ohne Super-Admin-Recht; Tempo der ersten Ansicht.

### Entscheidung
**Produktionsreif: JA.** Es gibt keine Critical-, High- oder Medium-Fehler. Die fünf Low-Befunde können vor oder nach dem Deploy behoben werden.

### Nachbesserung der 5 Low-Befunde (2026-11-27)
- **BUG-1 behoben:** Das gewählte Fach lässt sich zuklappen (`content-tree.tsx`). Beim Zurück/Vor im Browser klappt das Fach aus der Adresse wieder auf.
- **BUG-2 behoben:** Alte Lesezeichen `?subject=<Kürzel>` werden auf `fach=<id>` übersetzt (unbekanntes Kürzel wird verworfen). `?tab=topic|subject` des alten Papierkorbs wählt das Segment.
- **BUG-3 behoben:** Fach aus-/einblenden steht mit `expected_version` im Protokoll als `subject.activate/deactivate` (wie bei den Fragen).
- **BUG-4 behoben:** Bei aktiver Suche heißt der Titel „Suche in allen Fächern“, die Zahl steht als „N Treffer“. Der Suchbegriff steht in der Adresse (`?q=`) und bleibt bei Klick im Baum erhalten.
- **BUG-5 behoben:** `GET /api/admin/subjects` zählt nur mit `?counts=1` (nur Start „Meine Fächer“).
- Tests: 365 Dateien, 4.832 grün; Build sauber.

## Deployment
- **Produktion:** https://spedilern.vercel.app (Vercel-Projekt `spedilern`, Deployment `dpl_8bTrHq6HwWeJzHZ1jQ34xre8ngC9`, Commit `8a8da36` auf `main`)
- **Deployed:** 2026-11-27 · Build READY, keine neuen Laufzeitfehler im Deployment
- **Datenbank:** keine Migration nötig
- **Geprüft nach dem Deploy:** Weiterleitung `/admin/questions?subject=LOP` → `/admin/inhalte?subject=LOP` (Kürzel bleibt erhalten, danach Login)
- **Noch von Hand im Browser zu prüfen (Pflicht laut QA):** 360/768/1440 px, Hell/Dunkel, Toast „Rückgängig“, Fach ausblenden und als Azubi gegenprüfen (danach wieder einblenden), Ansicht als Lehrkraft ohne Super-Admin-Recht, Tempo der ersten Ansicht
- **Rollback:** Vercel → Deployments → vorheriges Deployment `dpl_FguMdAHMHKj8CtgsNTQbccUGQmuG` „Promote to Production“
