# PROJ-129: Quiz-Varianten – Richtig/Falsch, Rauswerfen, Joker & Wette

## Status: In Progress
**Created:** 2026-11-23
**Last Updated:** 2026-11-23
**Priorität:** P1

## Dependencies
- **Requires:** PROJ-3 (Daily Learning Session / Quiz) – das normale Quiz (`/quiz`) bekommt die Varianten
- **Requires:** PROJ-4 (XP & Level) und PROJ-19 (Blitzrunde & Frachtmünzen) – Wertung in XP und Münzen, die Blitzrunde wird umgebaut
- **Requires:** PROJ-21 (Antwortschlüssel) – der Server entscheidet über richtig/falsch, nie der Browser
- **Berührt:** PROJ-14 (Lücken schließen) – Wann eine Antwort eine Lücke öffnet oder schließt, ändert sich nur für Varianten (siehe Wertung); der Modus selbst bleibt reines Multiple-Choice
- **Berührt:** PROJ-74 (schwierigste Fragen) – Antworten aus Varianten fließen schwächer in die Statistik ein
- **Bleibt unverändert:** PROJ-11 (Prüfungssimulation), PROJ-21/27 (Leistungsnachweise), PROJ-72 (Frage melden)
- **Später, nicht Teil dieser Spec:** „Tagesrunde“ als eigener Modus (siehe „Nicht Teil dieser Spec“)

## Hintergrund

Das Spielspaß-Audit (PROJ-17) zeigt: In der Session selbst stimmt alles (Trefferquote 69,5 %, 51 % freiwillige Zweitrunden). Trotzdem soll das Quiz abwechslungsreicher werden, ohne dass dafür neue Fragen geschrieben werden müssen.

**Grundsatz:** Jede Frage bleibt eine Multiple-Choice-Frage in der Datenbank (1 richtige, 3–4 falsche Optionen, Erklärung). Die Varianten sind nur eine **andere Darstellung derselben Frage**. Multiple-Choice bleibt die Grundstruktur des Quiz.

Befund aus dem Bestand (Stichprobe 1000 Fragen): fast alle Fragen haben genau 5 Optionen und immer eine Erklärung. Damit sind Richtig/Falsch und Rauswerfen ohne neue Inhalte möglich.

## Entscheidungen (mit dem Nutzer am 2026-11-23 festgelegt)

| Thema | Entscheidung |
|---|---|
| Einbau | Varianten kommen **eingestreut ins normale Quiz** (`/quiz`), keine feste „Tagesrunde“ |
| Blitzrunde | Wird **komplett Richtig/Falsch** |
| Wann eine Frage als Variante erscheinen darf | Nur Fragen, die der Spieler **mindestens 1× klassisch (MC) richtig** beantwortet hat. Neue und nie gekonnte Fragen kommen immer als MC |
| Wette | **Freiwillig auf die letzte Frage** der Runde: Der Rundenbonus wird eingesetzt, richtig = verdoppelt, falsch = Bonus weg. Nie ein Verlust unter den Münzstand vor der Runde |
| Joker | **Ja, dabei:** kleiner Rauswerfen-Joker gegen Frachtmünzen bei MC-Fragen |
| Unverändert | Lücken schließen, Prüfungssimulation, Leistungsnachweise bleiben reines MC |

## User Stories
- Als **Azubi** möchte ich im Quiz nicht nur Multiple-Choice-Fragen sehen, sondern ab und zu schnelle Richtig/Falsch-Fragen, damit die Runde abwechslungsreich bleibt.
- Als **Azubi** möchte ich bei manchen Fragen die falschen Antworten wegstreichen, damit ich mich aktiver mit den Optionen beschäftigen muss und es sich wie ein kleines Spiel anfühlt.
- Als **Azubi** möchte ich vor der letzten Frage meinen Rundenbonus riskieren können, damit die Runde einen spannenden Höhepunkt bekommt, ohne dass ich Münzen von früher verlieren kann.
- Als **Azubi** möchte ich bei einer schwierigen Frage gegen wenige Frachtmünzen zwei falsche Antworten wegnehmen können, damit ich Münzen sinnvoll einsetzen kann.
- Als **Azubi** möchte ich in der Blitzrunde schnell „stimmt / stimmt nicht“ antworten, damit die 60 Sekunden hektisch und spaßig sind.
- Als **Lehrkraft** möchte ich verhindern können, dass eine bestimmte Frage als Variante gestellt wird, falls sie sich dafür nicht eignet.
- Als **Betreiber** möchte ich alle Varianten mit einem Schalter ausschalten können, damit bei Problemen sofort wieder alles wie bisher läuft.

## Acceptance Criteria

### Verteilung im normalen Quiz (`/quiz`)
- [ ] Von 10 Fragen einer Runde sind höchstens 3 Varianten, die übrigen klassisches MC.
- [ ] Es erscheinen nie zwei Varianten hintereinander.
- [ ] Die erste Frage der Runde ist immer klassisches MC.
- [ ] Die letzte Frage der Runde ist immer klassisches MC (damit die Wette auf eine echte MC-Frage geht).
- [ ] Eine Frage darf nur dann als Variante erscheinen, wenn der Spieler sie schon mindestens einmal klassisch richtig beantwortet hat.
- [ ] Hat der Spieler im gewählten Pool (Fach/Klassenstufe/Thema) zu wenige gekannte Fragen, besteht die Runde komplett aus klassischem MC.
- [ ] Welche Frage als Variante erscheint und in welcher Form, legt der **Server** fest, nicht der Browser.
- [ ] Der Modus „Lücken schließen“ (`mode=weak`), die Prüfungssimulation und alle Leistungsnachweise enthalten **nie** Varianten.

### Variante „Richtig/Falsch“
- [ ] Gezeigt werden die Frage und genau **eine** vorgeschlagene Antwort: mit gleicher Wahrscheinlichkeit die richtige oder eine zufällig gewählte falsche Option.
- [ ] Der Spieler antwortet mit „Stimmt“ oder „Stimmt nicht“. Wischen ist erlaubt, es gibt aber immer auch zwei Schaltflächen (≥ 44 px).
- [ ] Nach der Antwort kommt dieselbe Erklärung wie beim klassischen MC, und sie passt in beiden Fällen (vorgeschlagene Antwort richtig oder falsch).
- [ ] Der Server entscheidet, ob die Antwort richtig war. Der Browser kennt den Vorschlag, aber nicht die Lösung, bevor geantwortet wurde.
- [ ] Fragen, die sich nicht eignen, erscheinen nie als Richtig/Falsch: Fragen mit Verneinung („nicht“, „außer“, „falsch“, „kein“), Fragen, deren Optionen aufeinander verweisen („alle genannten“, „a und b“), und Fragen, bei denen Frage plus Aussage zu lang für den Bildschirm sind.

### Variante „Rauswerfen“
- [ ] Alle Optionen der Frage sind sichtbar. Der Spieler tippt die Optionen an, die er für **falsch** hält, und sie werden weggestrichen.
- [ ] Die Frage ist bestanden, sobald alle falschen Optionen weggestrichen sind. Die richtige Option bleibt übrig.
- [ ] Der Spieler hat **2 Herzen**. Streicht er die richtige Option weg, verliert er ein Herz, und die Option bleibt sichtbar. Bei 0 Herzen gilt die Frage als falsch, und die Lösung wird gezeigt.
- [ ] Die Prüfung, ob eine angetippte Option falsch ist, läuft über den Server. Die Lösung ist vor dem Antippen im Browser nicht auslesbar.
- [ ] Rauswerfen gibt es nur bei Fragen mit mindestens 4 Optionen.
- [ ] Nach der Frage kommt die Erklärung wie beim klassischen MC.

### Joker „Zwei weg“ (Frachtmünzen)
- [ ] Bei klassischen MC-Fragen gibt es einen Joker-Knopf. Er entfernt **zwei falsche** Optionen (nie die richtige).
- [ ] Der Joker kostet Frachtmünzen (Höhe legt `/architecture` fest, Richtwert 5) und ist pro Frage nur einmal nutzbar.
- [ ] Reichen die Münzen nicht, ist der Knopf gesperrt und zeigt den Preis. Der Münzstand wird nie negativ.
- [ ] Die Münzen werden serverseitig abgezogen und der Joker nur akzeptiert, wenn der Spieler sie hat. Ein Browser-Eingriff schafft keinen kostenlosen Joker.
- [ ] Der Joker steht nicht bei Variantenfragen, in der Prüfungssimulation, in Leistungsnachweisen und in „Lücken schließen“ zur Verfügung.

### Wette auf die letzte Frage
- [ ] Vor der letzten Frage einer Runde mit mindestens 5 Fragen (die den Rundenbonus auslöst) erscheint ein freiwilliges Angebot: „Rundenbonus einsetzen?“.
- [ ] Der Spieler kann ablehnen. Dann läuft alles wie heute.
- [ ] Setzt er den Bonus ein: **richtig** → der Rundenbonus wird verdoppelt, **falsch** → der Rundenbonus entfällt.
- [ ] Eingesetzt wird nur der Rundenbonus dieser Runde. Der Münzstand vor der Runde sinkt durch die Wette nie.
- [ ] Der Server rechnet die Wette. Das Ergebnis ist im Browser nicht veränderbar.
- [ ] Bei weniger als 5 Fragen (kein Rundenbonus) wird keine Wette angeboten.
- [ ] Der Ausgang der Wette ist auf dem Ergebnisbildschirm sichtbar (z. B. „Wette gewonnen: +3 Münzen“).

### Blitzrunde (PROJ-19)
- [ ] Alle Fragen der Blitzrunde werden als Richtig/Falsch gestellt, wenn der Spieler genug gekannte Fragen hat. Tagesbonus, 60-Sekunden-Grenze und Münzregeln bleiben im Grundsatz wie heute.
- [ ] Hat der Spieler zu wenige gekannte Fragen, läuft die Blitzrunde mit klassischem MC wie bisher, ohne Fehlermeldung.
- [ ] Reines Raten darf sich nicht lohnen: Ein Spieler, der nur rät (50 % Treffer), verdient im Erwartungswert höchstens halb so viele Münzen wie ein Spieler mit 80 % Trefferquote. (Wie das erreicht wird, entscheidet `/architecture`, z. B. durch Zeitabzug, geringere Münzen pro Treffer oder Abzug bei Fehlern.)

### Wertung und Lernstand
- [ ] **Klassisches MC:** XP und Münzen wie heute (10 XP, 1 Münze je richtiger Antwort, Rundenbonus wie heute).
- [ ] **Rauswerfen:** XP und Münzen wie klassisches MC bei 0 Fehlgriffen, reduziert bei 1 Fehlgriff, nichts bei Scheitern. Eine bestandene Rauswerfen-Frage zählt wie eine klassisch richtige Antwort für den Lernstand.
- [ ] **Richtig/Falsch:** reduzierte XP und Münzen (Faktor legt `/architecture` fest, Richtwert die Hälfte). Eine richtige Antwort **schließt keine Lücke** und zählt nicht als Nachweis für „gekannt“.
- [ ] **Falsche Antwort in jeder Variante** zählt wie ein Fehler und kann eine Lücke öffnen.
- [ ] **Richtig mit Joker** gibt volle XP, schließt aber keine Lücke.
- [ ] Jede gespeicherte Antwort trägt ihre Darstellungsform (klassisch, Richtig/Falsch, Rauswerfen, mit Joker), damit Statistik und Fun-Audit sie unterscheiden können.
- [ ] Die Schwierigkeitsstatistik (PROJ-74) rechnet Richtig/Falsch-Antworten schwächer als MC-Antworten.
- [ ] Streak, Badges und Level-Berechnung funktionieren mit allen Darstellungsformen unverändert (eine Runde zählt wie bisher für den Streak).

### Darstellung und Bedienung
- [ ] Alle Varianten folgen dem Design-System (`docs/DESIGN.md`): Dark Mode, `rounded-2xl`, Touch-Ziele ≥ 44 px, Animationen höchstens 200 ms, grüner/roter Feedback-Flash für 500 ms.
- [ ] Jede Variante trägt ein kleines, klares Etikett (z. B. „Wischfrage“, „Rauswerfen“), damit der Spieler sofort versteht, was zu tun ist. Beim ersten Mal erscheint ein kurzer Hinweis (ein Satz).
- [ ] Alle Varianten sind ohne Wischen, nur mit Tippen und per Tastatur bedienbar. Elemente haben passende Beschriftungen für Screenreader.
- [ ] „Frage melden“ (PROJ-72) bleibt in jeder Variante erreichbar und meldet die zugrunde liegende Frage.
- [ ] Die Ergebnis-Übersicht am Rundenende zeigt weiterhin jede Frage mit der richtigen Antwort und der Erklärung.

### Steuerung und Schutz
- [ ] Ein Schalter (Konfiguration auf dem Server) schaltet **alle** Varianten und den Joker global ab. Dann verhält sich das Quiz wie vor dieser Änderung.
- [ ] Lehrkräfte können eine Frage als „nur klassisch“ markieren. Eine so markierte Frage erscheint nie als Variante. *(Kann-Kriterium: Falls der Umfang zu groß wird, wird dies als eigene Spec nachgezogen. Die automatische Erkennung ungeeigneter Fragen bleibt Pflicht.)*

## Edge Cases
- **Zu wenige gekannte Fragen** im gewählten Pool (neuer Spieler, enges Thema): Die Runde besteht aus klassischem MC, ohne Meldung. Das Gleiche gilt für die Blitzrunde.
- **Frage mit Verneinung** („Welche Aussage trifft **nicht** zu?“): Kein Richtig/Falsch, kein Rauswerfen, nur klassisches MC. Beim Rauswerfen würde die Logik sonst auf den Kopf gestellt.
- **Frage mit Verweis-Optionen** („alle genannten“, „a und b“, „keine der Antworten“): nie Variante.
- **Frage mit weniger als 4 Optionen:** kein Rauswerfen. Richtig/Falsch ist erlaubt.
- **Aussage zu lang** (Frage plus Vorschlag passen nicht mehr gut auf den Bildschirm): kein Richtig/Falsch für diese Frage.
- **Joker bei zu wenig Münzen:** Knopf gesperrt, Preis sichtbar, Stand wird nie negativ.
- **Joker wird doppelt gesendet** (Doppelklick, langsames Netz): Er wird nur einmal abgerechnet.
- **Wette bei Runde unter 5 Fragen:** nicht angeboten, weil kein Rundenbonus existiert.
- **Wette wird im Browser manipuliert:** Der Server rechnet den Bonus allein aus der Antwort und der Einsatz-Angabe nach. Eine gefälschte „gewonnen“-Meldung ändert nichts.
- **Verbindungsabbruch mitten in der Runde:** Verhalten wie heute (Antworten werden am Rundenende gespeichert). Die Varianten dürfen das nicht verschlechtern, d. h. keine Münzabbuchung ohne gespeicherte Runde.
- **Seite wird mitten in einer Rauswerfen-Frage neu geladen:** Die Frage beginnt neu oder die Runde wird neu aufgebaut, wie heute. Es entstehen keine doppelten Münz- oder XP-Gutschriften.
- **Geratene Richtig/Falsch-Serie in der Blitzrunde:** Reines Dauerraten bringt im Erwartungswert deutlich weniger Münzen als ernsthaftes Spielen.
- **Frage wird während der Runde von einer Lehrkraft geändert oder deaktiviert:** Die laufende Runde wird mit dem Stand beim Start zu Ende gespielt. Es entstehen keine Fehler.
- **Frage ist durch einen laufenden Leistungsnachweis gesperrt** (PROJ-21): bleibt aus dem Üben ausgeschlossen, auch als Variante.
- **Tourismus und Spedition:** Alles gilt für beide Fachbereiche gleich. Die Auswahl der Fragen richtet sich wie bisher nach dem eigenen Bereich.
- **Frage gemeldet** (PROJ-72) während eine Variante gezeigt wird: Die Meldung bezieht sich auf die Frage, nicht auf den Vorschlag.

## Technical Requirements
- **Sicherheit:** Der Server entscheidet bei jeder Variante über richtig/falsch, über Joker-Abzug und Wettergebnis. Der Browser bekommt die Lösung nicht vor der Antwort. (Heute ignoriert der Server das `is_correct` des Browsers bereits, das muss auch für die neuen Wege gelten.)
- **Datenschutz/RLS:** Neue Tabellen oder Spalten brauchen Row Level Security. Änderungen an RLS-Richtlinien brauchen eine ausdrückliche Freigabe.
- **Validierung:** Alle neuen Eingaben (Darstellungsform, Joker, Wette) werden serverseitig mit Zod geprüft.
- **Performance:** Das Laden einer Runde bleibt für den Spieler spürbar gleich schnell (< 200 ms zusätzliche Serverzeit für die Variantenauswahl).
- **Messbarkeit:** Der Fun-Auditor (`npm run fun:audit`) kann den Anteil der Varianten und die Trefferquote je Darstellungsform auswerten.
- **Tests:** Unit-Tests für Verteilungsregeln (nie zwei Varianten hintereinander, erste und letzte Frage MC), Eignungsprüfung der Fragen, Wertung je Darstellungsform und Wette. Kein Dev-Server nötig.
- **Browser:** Mobile zuerst (Safari iOS, Chrome Android), danach Desktop.

## Nicht Teil dieser Spec
- **„Tagesrunde“** (feste Dramaturgie aus Aufwärmen, Hauptteil, Härtetest und Finale, einmal am Tag, Zähler „heute haben N Azubis die Tagesrunde geschafft“): bewusst später, eigene Spec. Sie baut auf den hier gebauten Varianten auf. Vorher soll gemessen werden, wie die Web-Push-Erinnerung (PROJ-18) wirkt.
- **„Jahrgangsfrage des Tages“:** Gehört zur Tagesrunde. Dafür müsste zuerst die Jahrgangsstufe im Profil erfasst werden.
- **Zuordnen (Paare), Zahl eintippen, Lernkarte:** mögliche spätere Varianten, hier nicht enthalten.
- **Wette bei jeder Frage („sicher/unsicher“):** abgelehnt, es bleibt bei der einen Wette am Rundenende.
- **Neue Fragen oder Umbau der Datenbank-Fragen:** Die Fragen bleiben unverändert.

## Offene Punkte für `/architecture`
- Höhe des Jokerpreises und des Abschlags für Richtig/Falsch und Rauswerfen mit Fehlgriff.
- **Höhe der Wette:** Der Rundenbonus beträgt heute nur 3 Münzen. Prüfen, ob das als Einsatz spannend genug ist oder ob der Einsatz anders berechnet werden muss (ohne den Grundsatz „nie unter den Stand vor der Runde“ aufzugeben).
- Mechanik gegen Dauerraten in der Blitzrunde (Zeitabzug, Münzabzug, Serie).
- Wie die Lösung vor der Antwort aus dem Browser herausgehalten wird (heute bekommt der Browser sie für das freie Üben mitgeliefert, siehe `attachAnswerKey`). Für Richtig/Falsch, Rauswerfen, Joker und Wette darf das nicht so bleiben.
- Technische Erkennung ungeeigneter Fragen (Verneinung, Verweis-Optionen, Länge) und ob sie bei jeder Runde berechnet oder einmalig an der Frage gespeichert wird.
- Speicherung der Darstellungsform je Antwort und Auswirkung auf `computeWeakQuestionIds` (Lücken) und PROJ-74.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Erstellt 2026-11-23. Grundlage: bestehender Code in `src/app/quiz/` (Seite + Client), `src/app/api/quiz/sessions`, `src/app/api/quiz/blitz/*`, `src/lib/answer-key.ts`, `src/lib/weak-questions.ts`, PROJ-74-Funktion `question_difficulty_stats`.

### Ausgangslage (was heute passiert)
- Die Quiz-Seite lädt 10 Fragen **mit Lösung** (`attachAnswerKey`) in den Browser. Der Browser zeigt sofort grün/rot und schickt am Ende alle Antworten auf einmal.
- Der Server prüft beim Speichern zwar selbst nach (XP und Münzen sind nicht fälschbar), aber wer in die Entwicklerwerkzeuge schaut, sieht jede Lösung vorab.
- Für eine Wette, einen Joker oder Rauswerfen ist das nicht tragbar: Wer die Lösung kennt, gewinnt jede Wette und braucht nie einen Joker.
- Die Blitzrunde arbeitet genauso (Lösung im Browser, Wertung am Ende über einen Start-Token).

### Kernentscheidung: „Die Runde lebt auf dem Server“
Statt die Lösungen mitzuschicken, legt der Server beim Start jeder Runde einen **Rundenzettel** an. Der Browser bekommt nur Fragen und Optionen, nie die Lösung. Jede Antwort wird **sofort einzeln** an den Server geschickt; der Server antwortet mit „richtig/falsch“, der richtigen Option und der Erklärung. Am Ende rechnet der Server die Runde **allein aus seinem Rundenzettel** ab, der Browser meldet nur noch „fertig“.

**Warum:** Ein einziges, einfaches Prinzip deckt alles ab: Richtig/Falsch, Rauswerfen (jedes Antippen wird geprüft), Joker (der Server streicht zwei falsche Optionen) und Wette (das Ergebnis kennt nur der Server). Nebenbei ist das alte Lösungs-Leck im freien Üben geschlossen.

**Preis dafür:** Nach dem Antippen dauert es einen Netzwerk-Hin-und-Rückweg (typisch 100–200 ms), bis grün/rot erscheint. Die angetippte Option wird sofort markiert („wird geprüft“), damit es sich nicht träge anfühlt. Für den Spieler ist das kaum spürbar; bei sehr schlechtem Netz erscheint ein „Nochmal versuchen“.

**Gilt für:** normales Quiz (`/quiz`) und Blitzrunde. **Nicht** für „Lücken schließen“ (bleibt wie heute, weil dort keine Varianten, Joker oder Wetten vorkommen), Prüfungssimulation und Leistungsnachweise (eigene, unveränderte Wege).

### A) Bildschirm-Aufbau (Spielerseite)

```
Quiz-Seite /quiz
+-- Kopfzeile (Fortschritt 3/10, Münzstand, Frage melden)
+-- Fragekarte – je nach Darstellungsform genau eine davon:
|   +-- Klassisch (MC)
|   |   +-- Frage + 4–5 Optionen
|   |   +-- Joker-Knopf „Zwei weg · 5 🪙“ (gesperrt mit Preis, wenn zu wenig Münzen)
|   +-- Richtig/Falsch („Wischfrage“-Etikett)
|   |   +-- Frage + eine vorgeschlagene Antwort als große Karte
|   |   +-- Knöpfe „Stimmt“ / „Stimmt nicht“ (Wischen optional, Tastatur ←/→)
|   +-- Rauswerfen („Rauswerfen“-Etikett)
|       +-- Frage + alle Optionen, Antippen streicht durch
|       +-- 2 Herzen oben rechts
+-- Erst-Hinweis (ein Satz, einmal je Variante, gemerkt im Gerät)
+-- Feedback-Bereich (Flash grün/rot 500 ms, Erklärung, „Weiter“)
+-- Wett-Angebot vor der letzten Frage (Dialog)
|   +-- „Einsatz: 8 🪙 – richtig = 16, falsch = 0“
|   +-- „Einsetzen“ / „Lieber nicht“
+-- Ergebnis-Bildschirm (wie heute + Zeile „Wette gewonnen: +8 🪙“ bzw. „Joker: −5 🪙“)
    +-- Fragen-Übersicht mit richtiger Antwort und Erklärung (wie heute)

Blitzrunde /blitzrunde
+-- 60-Sekunden-Uhr, Punktestand
+-- Richtig/Falsch-Karte (Stimmt / Stimmt nicht) – oder klassisch, wenn zu wenig gekannte Fragen
+-- Ergebnis: Punkte = Treffer − Fehler, Münzen, XP

Lehrkräfte-Bereich (Kann-Kriterium)
+-- Frage bearbeiten: Schalter „Nur klassisch stellen“
```

Die drei Fragekarten werden als eigene, kleine Bausteine neben dem heutigen Quiz-Client gebaut (shadcn `Button`, `Dialog`/`AlertDialog`, `Badge`, `Progress`). Der Ergebnis-Bildschirm und „Frage melden“ werden wiederverwendet.

### B) Datenmodell (in Worten)

**Neu: Rundenzettel (eine Zeile je gestarteter Runde, normales Quiz und Blitzrunde)**
- Wem die Runde gehört, Art (Quiz/Blitz), Startzeit, „abgerechnet ja/nein“
- Gewählter Pool (Fach, Stufe, Thema) – nur zur Auswertung
- Je Frage in der Reihenfolge der Runde:
  - Frage-ID und Darstellungsform (klassisch / Richtig-Falsch / Rauswerfen)
  - **richtige Option zum Startzeitpunkt** (Schnappschuss, damit eine Änderung durch eine Lehrkraft mitten in der Runde nichts durcheinanderbringt)
  - bei Richtig/Falsch: die vorgeschlagene Option
  - bisheriger Spielstand der Frage: Antwort, richtig/falsch, Fehlgriffe beim Rauswerfen, Joker genutzt + weggestrichene Optionen
- Wette: angeboten ja/nein, eingesetzt ja/nein, Einsatz
- Gilt höchstens 3 Stunden; danach wird er nicht mehr abgerechnet und später aufgeräumt.

**Zugriff:** Die Tabelle hat Row Level Security, aber **keine** Lese- oder Schreibrechte für Spieler. Nur der Server (Service-Schlüssel) liest und schreibt sie. Grund: Der Zettel enthält die Lösungen. → **Neue RLS-Richtlinie, braucht deine ausdrückliche Freigabe** (siehe Technical Requirements).

**Erweitert: gespeicherte Antworten (`quiz_answers`)**
- Neues Feld **Darstellungsform**: klassisch, richtig_falsch, rauswerfen, joker. Alle bisherigen Antworten gelten als „klassisch“.
- Neues Feld **Fehlgriffe** (nur Rauswerfen: 0, 1 oder 2).
- Bei Richtig/Falsch wird die vorgeschlagene Option gespeichert, „richtig“ heißt „richtig eingeschätzt“.
- Die Antworten werden wie heute erst beim Abrechnen am Rundenende geschrieben (aus dem Rundenzettel), nicht schon während der Runde.

**Erweitert: Runden (`quiz_sessions`)** – neue Felder für Wette (eingesetzt, Einsatz, Ergebnis) und Joker-Kosten, damit Ergebnis-Bildschirm, Verlauf und Fun-Audit sie zeigen können.

**Erweitert: Fragen (Kann-Kriterium)** – Schalter „nur klassisch“, Standard aus.

**Blitzrunde:** Der bisherige Start-Token (`blitz_starts`) wird durch den Rundenzettel ersetzt. Die Tagessperre über `blitz_rounds` (eine Runde pro Tag) bleibt unverändert.

### C) Ablauf einer Quiz-Runde
1. **Start (Seite lädt):** Server wählt wie heute 10 Fragen. Dann plant er die Varianten (siehe D), legt den Rundenzettel an und schickt Fragen + Optionen **ohne Lösung** an den Browser.
2. **Antworten:** Jede Antwort (MC-Tipp, Stimmt/Stimmt nicht, jedes Rauswerfen-Antippen) geht einzeln an den Server. Er prüft gegen den Zettel, trägt sie ein und antwortet mit Ergebnis, richtiger Option und Erklärung (bei Rauswerfen: „weg“ oder „Herz verloren“). Eine Frage kann nur einmal beantwortet werden; doppelt gesendete Anfragen bekommen dieselbe Antwort.
3. **Joker:** Anfrage an den Server → er prüft Münzstand und Vorrat, merkt sich den Joker im Zettel und schickt die zwei zu streichenden Optionen. Ein zweiter Joker-Klick auf dieselbe Frage liefert dieselben zwei Optionen ohne weitere Kosten.
4. **Wette:** Vor der letzten Frage meldet der Browser „setze ein“ oder „nicht“. Der Server trägt es ein, **bevor** die letzte Frage beantwortet werden kann.
5. **Abrechnen:** Browser meldet „fertig“. Der Server rechnet XP, Münzen, Joker-Kosten, Wette, Streak und Badges aus dem Zettel, speichert Runde und Antworten und setzt „abgerechnet“. Ein zweites „fertig“ ändert nichts.
6. **Abbruch / Neu laden:** Wie heute: Die angefangene Runde verfällt, es wird nichts gutgeschrieben und **nichts abgebucht** (auch kein Joker). Beim Neuladen entsteht eine neue Runde.

### D) Regeln und Zahlen (offene Punkte der Spec, hier entschieden)

**Verteilung im Quiz (Server, beim Start)**
- Platz 1 und 10 immer klassisch. Auf den Plätzen 2–9 höchstens 3 Varianten, nie zwei nebeneinander.
- Kandidaten sind nur Fragen, die der Spieler schon **klassisch richtig** beantwortet hat und die geeignet sind (siehe unten). Gibt es keine Kandidaten, bleibt alles klassisch.
- Zufällig: 0–3 Varianten je Runde, im Schnitt etwa 2. Zwischen Richtig/Falsch und Rauswerfen wird gleich verteilt, sofern die Frage beides kann.
- „Gekannt“ wird mit einer einzigen Abfrage ermittelt (Frage-IDs mit klassisch richtiger Antwort des Spielers). Zusatzzeit deutlich unter 200 ms.

**Eignung einer Frage – live bei jeder Runde berechnet, nicht gespeichert**
- Kein Richtig/Falsch und kein Rauswerfen bei Verneinung in der Frage („nicht“, „kein/keine“, „außer“, „falsch“, „unzutreffend“) und bei Verweis-Optionen („alle genannten“, „keine der …“, „a und b“, „beide“).
- Rauswerfen nur ab 4 Optionen.
- Richtig/Falsch nur, wenn Frage + längste Option zusammen höchstens ca. 280 Zeichen haben (passt auf ein Handy ohne Scrollen).
- Fragen mit Schalter „nur klassisch“ nie als Variante.
- **Warum live statt gespeichert:** Die Prüfung ist ein paar Textvergleiche für 10–40 Fragen, also praktisch ohne Kosten. Sie ist immer aktuell, wenn eine Lehrkraft eine Frage ändert, und braucht keine Datenbank-Änderung an 4000+ Fragen. Die Regeln stehen in einer kleinen, getesteten Hilfsdatei und lassen sich jederzeit nachschärfen.

**Richtig/Falsch-Vorschlag:** 50 % die richtige Option, 50 % eine zufällige falsche. Der Server wählt und merkt sich den Vorschlag im Zettel. Die Erklärung passt in beiden Fällen, weil sie die richtige Antwort erklärt; nach der Antwort wird zusätzlich die richtige Option angezeigt („Richtig wäre: …“).

**Wertung je Darstellungsform (normales Quiz)**

| Form | XP | Münzen | Zählt für Lernstand („gekannt“, Lücke schließen) | Falsch öffnet Lücke |
|---|---|---|---|---|
| Klassisch richtig | 10 (+5 ab Streak 7, wie heute) | 1 | ja | ja |
| Richtig/Falsch richtig | 5 (+2 ab Streak 7) | ½ | **nein** (neutral) | ja |
| Rauswerfen, 0 Fehlgriffe | 10 (+5) | 1 | ja | – |
| Rauswerfen, 1 Fehlgriff | 5 (+2) | ½ | ja (Spec: bestanden = richtig) | – |
| Rauswerfen, 2 Fehlgriffe (gescheitert) | 0 | 0 | – | ja |
| Klassisch mit Joker richtig | 10 (+5) | 1 | **nein** (neutral) | ja |

- Halbe Münzen werden für die ganze Runde zusammengezählt und am Ende abgerundet (z. B. 7 ganze + 3 halbe = 8 Münzen).
- **„Neutral“** heißt: Die Antwort zählt weder als Treffer in Serie noch unterbricht sie eine. Die Lücken-Berechnung (`computeWeakQuestionIds`) überspringt solche Antworten beim Schließen, wertet Fehler aber normal.
- Der Rundenbonus (3 Münzen ab 5 Fragen) und die Punktzahl „7/10“ bleiben wie heute; jede bestandene Variante zählt als richtig.

**Joker „Zwei weg“**
- Preis **5 Münzen** (eine halbe normale Runde: lohnt sich bei echter Unsicherheit, wird aber nicht reflexhaft genutzt).
- Höchstens **2 Joker pro Runde**, nicht auf der Wettfrage (sonst wäre die Wette zu billig zu gewinnen).
- Der Server gibt den Joker nur frei, wenn der aktuelle Münzstand mindestens alle Joker dieser Runde deckt. Abgebucht wird beim Abrechnen zusammen mit dem Gewinn. Falls der Stand in der Zwischenzeit im Shop ausgegeben wurde, wird nie unter 0 gebucht.
- **Bewusster Kompromiss:** Wer einen Joker nutzt und die Runde dann abbricht, zahlt nichts (Spec: keine Abbuchung ohne gespeicherte Runde). Er bekommt dafür aber auch keine XP und Münzen. Der „Gewinn“ ist nur, die Lösung einer Frage gesehen zu haben – das ist beim Üben ohnehin erwünscht.

**Wette**
- Der Rundenbonus allein (3 Münzen) ist als Einsatz zu klein, um spannend zu sein. **Einsatz = alle Münzen, die in dieser Runde bis zur letzten Frage verdient wurden (inklusive Rundenbonus), höchstens 10.** Typisch: 6–9 Münzen.
- Richtig → Einsatz verdoppelt. Falsch → Einsatz weg. Der Münzstand **vor der Runde** wird nie angetastet, Grundsatz der Spec bleibt erhalten.
- Angeboten nur bei Runden mit mindestens 5 Fragen und wenn der Einsatz mindestens 1 Münze beträgt; die letzte Frage ist immer klassisch, ohne Joker.
- **Warum diese Höhe:** Bei der heutigen Trefferquote (~70 %) bringt die Wette im Schnitt etwa +40 % auf den Einsatz, also rund +3 Münzen je Runde für Spieler, die immer wetten. Das ist spürbar, sprengt aber die Shop-Preise nicht. Die Obergrenze 10 hält Ausreißer klein. Nach 2–3 Wochen prüft der Fun-Auditor die Münz-Inflation.
- Wette und Joker berühren keine XP: XP bleiben ein reines Lern-Maß (Rangliste bleibt fair).

**Blitzrunde komplett Richtig/Falsch – Mittel gegen Dauerraten**
- **Punkte = Treffer − Fehler**, nie unter 0. Münzen: 2 je Punkt + Tagesbonus 10 (wie heute). XP: 3 je Punkt.
- Rechnung: Ein Rater (50 %) kommt im Schnitt auf 0 Punkte → ca. 10–14 Münzen (Tagesbonus + Zufallsschwankung). Ein Spieler mit 80 % und 30 Antworten hat 18 Punkte → 46 Münzen. Das erfüllt „höchstens die Hälfte“ deutlich.
- Heute gibt die Blitzrunde bei 15 richtigen MC-Antworten 55 Münzen; mit Richtig/Falsch sind mehr Antworten in 60 s möglich, die neue Rechnung hält die Ausschüttung in derselben Größenordnung.
- Hat der Spieler weniger als 40 gekannte geeignete Fragen, läuft die Blitzrunde klassisch – dann mit den **heutigen** Münzregeln, aber ebenfalls ohne Lösung im Browser.
- Damit 60 Sekunden flüssig bleiben, zeigt der Browser nach dem Tippen sofort die nächste Karte; das grün/rote Ergebnis der vorigen Antwort erscheint kurz darauf als kleiner Flash am Rand und im Punktestand. Die Endabrechnung kommt nur vom Server.
- Blitzrunden-Antworten werden wie heute **nicht** in `quiz_answers` gespeichert und beeinflussen weder Lücken noch Statistik.

**Schwierigkeitsstatistik (PROJ-74)**
- Richtig/Falsch-Antworten zählen mit halbem Gewicht in „Versuche“ und „richtig“ und **nicht** für „häufigste falsche Antwort“ (sonst würde der zufällige Vorschlag die Auswertung verzerren). Joker-Antworten zählen nur, wenn falsch.
- Das ist eine Änderung an der bestehenden Datenbank-Funktion `question_difficulty_stats` (neue Migration mit Rückweg).

**Fun-Audit:** `npm run fun:audit` bekommt einen Abschnitt „Varianten“: Anteil je Darstellungsform, Trefferquote je Form, Wett-Quote und -Ausgang, Joker-Nutzung, Münzen je Runde vorher/nachher.

### E) Schalter und Schutz
- **Hauptschalter** als Umgebungsvariable auf Vercel (`QUIZ_VARIANTEN`, an/aus). Aus = keine Varianten, kein Joker, keine Wette, Blitzrunde wieder mit klassischen Fragen und heutigen Münzregeln. Wirkt nach einem Neu-Deploy (ca. 2 Minuten, per CLI).
- **Warum keine Datenbank-Einstellung:** Es gibt bisher keine Einstellungs-Tabelle; für einen Notschalter, der hoffentlich nie gebraucht wird, lohnt sie sich nicht.
- **Wichtig:** Der Schalter schaltet die **Varianten** ab, nicht den neuen Rundenzettel. Das Quiz läuft auch bei „aus“ über die serverseitige Prüfung. Deshalb geht dieser Teil als **eigener erster Bauschritt** live und wird ein paar Tage beobachtet, bevor Varianten dazukommen (siehe F). Fällt er aus, ist der Rückweg ein normales Zurückrollen des Deploys.
- Alle neuen Eingaben (Antwort, Darstellungsform, Joker, Wette, Runden-ID) werden mit Zod geprüft. Jede Anfrage prüft, dass der Rundenzettel dem angemeldeten Spieler gehört, nicht abgerechnet und nicht älter als 3 Stunden ist.
- Gesperrte Fragen (laufender Leistungsnachweis, „nur für Nachweise“) werden wie heute schon vor der Planung aussortiert.
- Lehrkräfte- und Super-Admin-Konten können das Quiz wie heute spielen; keine neuen Freigabelisten nötig, da es Spielerseiten sind. (Falls neue API-Wege unter `/api/quiz/…` in der Proxy-Liste gepflegt werden müssen, wird das beim Bau geprüft.)

### F) Bau-Reihenfolge (je Schritt einzeln testbar und auslieferbar)

| Schritt | Inhalt | Sichtbar für Spieler | Modell |
|---|---|---|---|
| 1 | Rundenzettel + Einzelprüfung jeder Antwort im normalen Quiz; Lösung raus aus dem Browser; Feld „Darstellungsform“ in `quiz_answers` | Nein (nur minimal verzögertes Feedback) | Opus (Sicherheit, Geld) |
| 2 | Blitzrunde auf Rundenzettel + Richtig/Falsch + Treffer−Fehler-Wertung | Ja | Sonnet |
| 3 | Eignungsprüfung, Variantenplanung, Richtig/Falsch- und Rauswerfen-Karten im Quiz, Lücken-Regel, PROJ-74-Gewichtung | Ja | Sonnet (Planung/Regeln: Opus-Review) |
| 4 | Joker und Wette inkl. Ergebnis-Bildschirm | Ja | Opus (Münzen) |
| 5 | Hauptschalter, Fun-Audit-Abschnitt, Kann-Kriterium „nur klassisch“ | Teilweise | Haiku/Sonnet |
| 6 | `/qa` gegen alle Acceptance Criteria | – | Opus |

### G) Tech-Entscheidungen auf einen Blick

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Lösung vor der Antwort | Nie im Browser, jede Antwort einzeln am Server geprüft | Einzige Lösung, die Wette, Joker und Rauswerfen fälschungssicher macht; schließt nebenbei das alte Leck |
| Rundenzustand | Rundenzettel-Tabelle, nur Server-Zugriff | Wiederholbar, doppelte Anfragen harmlos, Fragenstand beim Start eingefroren |
| Speichern der Antworten | Erst beim Abrechnen (wie heute) | Spec: keine Abbuchung ohne gespeicherte Runde; Abbruch bleibt folgenlos |
| Eignung der Fragen | Live berechnet, Regeln in getesteter Hilfsdatei | Keine Migration an tausenden Fragen, immer aktuell |
| Joker-Abbuchung | Beim Abrechnen, Deckung beim Klick geprüft | Erfüllt „keine Abbuchung ohne gespeicherte Runde“ und „nie negativ“ |
| Wetteinsatz | Rundenmünzen bis max. 10 statt nur 3er-Bonus | Spannend genug, Grundsatz „nie unter Vorstand“ bleibt |
| Anti-Raten Blitzrunde | Treffer − Fehler | Einfach zu verstehen, Raten bringt im Schnitt 0 |
| Notschalter | Umgebungsvariable | Kein neuer Tabellenbau für einen Notfall-Schalter |

### H) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** Wischen wird mit eingebauten Zeiger-Ereignissen gebaut (die Knöpfe bleiben die Hauptbedienung). Zod, shadcn/ui und Lucide sind vorhanden.

### I) Bewusste Abweichungen / Präzisierungen gegenüber der Spec
- **Wette:** Einsatz sind alle Rundenmünzen (max. 10), nicht nur der 3er-Rundenbonus. Grundsatz „nie unter den Stand vor der Runde“ bleibt.
- **Joker:** zusätzlich höchstens 2 pro Runde und nicht auf der Wettfrage.
- **Blitzrunde mit zu wenig gekannten Fragen:** bekommt ebenfalls keine Lösung mehr im Browser (sonst bliebe dort das Leck offen).
- **Rauswerfen mit 1 Fehlgriff:** halbe XP/Münzen, zählt aber wie in der Spec als „bestanden“ für den Lernstand.

### J) Datenbank-Änderungen (Überblick, Migration mit Rückweg je Schritt)
- Neue Tabelle Rundenzettel mit RLS ohne Spieler-Rechte (**Freigabe nötig**)
- `quiz_answers`: Darstellungsform, Fehlgriffe (Standard „klassisch“/0, rein additiv)
- `quiz_sessions`: Wett- und Joker-Felder (rein additiv)
- `questions`: „nur klassisch“ (Kann-Kriterium, rein additiv)
- `question_difficulty_stats` (PROJ-74): Gewichtung nach Darstellungsform
- Aufräumen alter, nicht abgerechneter Rundenzettel (z. B. beim Start einer neuen Runde des Spielers)

## Frontend-Umsetzung (2026-11-23)

> Tech Design vom Nutzer am 2026-11-23 freigegeben. Umfang: ganze Oberfläche + API-Vertrag; die API-Wege baut `/backend`.

### Was gebaut wurde
- **API-Vertrag** `src/lib/quiz-round.ts`: Typen für Start, Antworten, Joker, Wette und Abrechnung, Zod-Schemas für alle Anfragen (vom Server wiederzuverwenden), Zahlen aus dem Design (Joker 5, max. 2, Wette max. 10, 2 Herzen, Blitz 60 s) und reine Anzeigeregeln (`jokerState`, `swipeDecision`, `blitzPoints`, Ergebnistexte). Die erwarteten Wege stehen im Kopfkommentar der Datei:
  - `POST /api/quiz/rounds` `{kind:'blitz'}` → `BlitzRoundStart` (409 = heute schon gespielt)
  - `POST /api/quiz/rounds/[id]/answer` → `resolved` oder Rauswerfen-Schritt (`eliminated` / `heart_lost`); mit der Antwort auf die **vorletzte** Frage kommt `wager_offer`
  - `POST /api/quiz/rounds/[id]/joker` → zwei gestrichene Optionen (402 zu wenig Münzen, 409 nicht erlaubt)
  - `POST /api/quiz/rounds/[id]/wager` `{accept}`
  - `POST /api/quiz/rounds/[id]/finish` (ohne Body) → `QuizRoundResult` bzw. `BlitzRoundResult`; 404/410 = Runde abgelaufen
- **Browser-Aufrufe** `src/lib/quiz-round-api.ts`: ein stiller zweiter Versuch bei Netzfehler (Server-Wege sind wiederholbar), Blitz-Start ohne Wiederholung.
- **Bausteine** `src/components/quiz-round/`: `ChoiceOptions` (MC ohne Lösung, „wird geprüft“), `TrueFalseCard` (Knöpfe ≥ 44 px, Wischen, ←/→), `EliminateOptions` + `Hearts`, `JokerButton` („Zwei weg · 5 🪙“, gesperrt mit Grund), `WagerDialog` (AlertDialog), `FormBadge` (Etikett + Erst-Hinweis je Variante, gemerkt im Gerät), `FeedbackFlash` (500 ms, Bildschirm oder Rand), `RoundReview` (Übersicht mit Darstellungsform).
- **Hook** `src/hooks/use-first-time-hint.ts` (localStorage mit try/catch, auf dem Server nie sichtbar).
- **Neue Clients:** `src/app/quiz/quiz-round-client.tsx` (normales Quiz: Antwort einzeln am Server, Varianten, Joker, Wett-Dialog vor der letzten Frage, Ergebnis mit „Wette gewonnen/verloren“ und Joker-Kosten, „Nochmal versuchen“ bei Netzfehler, „Runde abgelaufen“) und `src/app/blitzrunde/blitz-round-client.tsx` (sofort nächste Karte, Ergebnis als Rand-Flash, Live-Punkte = Treffer − Fehler, Abrechnung nach Zeit oder letzter Karte, wartet höchstens 3 s auf offene Antworten).
- **Animationen** in `globals.css`: `quiz-shake`, `quiz-pop` (je 200 ms), `quiz-flash` (500 ms), bei „Bewegung reduzieren“ ohne Bewegung.
- **Tests:** `quiz-round.test.ts`, `variant-cards.test.tsx`, `quiz-round-client.test.tsx` (ganze Runde mit Joker, Wischfrage, Wette; Netzfehler-Wiederholung), `blitz-round-client.test.tsx` – 29 Tests grün, Lint sauber.

### Für `/backend` offen (bewusst nicht im Frontend)
- **Umschalten:** `src/app/quiz/page.tsx` rendert für den Normalmodus noch den alten `QuizClient` (mit Lösung). `/backend` legt dort den Rundenzettel an und rendert `<QuizRoundClient start={…} subject={…} totalAvailable={…} />`. `mode=weak` bleibt beim alten `QuizClient`. `src/app/blitzrunde/page.tsx` rendert dann `BlitzRoundClient` statt `BlitzClient`. Grund: Solange die Wege fehlen, bleibt die Live-App unverändert lauffähig, auch wenn zwischendurch etwas anderes deployt wird.
- Danach können `blitz-client.tsx` und die alten Wege `/api/quiz/blitz/start|finish` entfallen; `quiz-client.tsx` bleibt für „Lücken schließen“.
- Proxy-Freigabe der neuen Wege `/api/quiz/rounds/**` prüfen (Spielerseite, auch für Lehrkräfte-Konten).
- Blitzrunde: Bei schnellen Richtig/Falsch-Antworten reichen 40 Karten evtl. nicht für 60 s. Der Client rechnet nach der letzten Karte ab; der Server sollte eher ~60 Karten liefern.
- Hauptschalter `QUIZ_VARIANTEN=aus`: Server liefert nur `form:'classic'`, `joker.enabled=false` und kein `wager_offer`, dann zeigt die Oberfläche automatisch nichts davon.

### Abweichungen
- Wischen nutzt ein Inline-`transform` (folgt dem Finger), sonst nur Tailwind.
- „Frage melden“ steht wie bisher im Feedback-Bereich nach der Antwort; bei Varianten wird keine gewählte Option mitgeschickt (Meldung gilt der Frage).
- Kein Browser-Test (Dev-Server nicht erlaubt), nur Vitest.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
