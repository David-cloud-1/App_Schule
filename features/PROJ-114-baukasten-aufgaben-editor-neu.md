# PROJ-114: Baukasten – Aufgaben-Editor neu (einheitliche Schublade, 6 Muster)

## Status: Planned
**Created:** 2026-11-17
**Last Updated:** 2026-11-17

## Idee in einem Satz
Die Schublade im Baukasten wird ein richtig guter Aufgaben-Editor: gleicher Aufbau für jeden Aufgabentyp, sechs wiederkehrende Bedienmuster statt 30 Einzelformularen, immer nur das Nötige sichtbar, sodass auch Lehrkräfte ohne Erfahrung sofort zurechtkommen.

Teil der Reihe „Baukasten direkt“. Folge-Specs: PROJ-115 (Klick in der Seite öffnet den Eintrag), PROJ-116 (Lösungen im Modus Bearbeiten sichtbar).

## Anlass
Rückmeldung des Nutzers (2026-11-17) am Material „Basics rund um den LKW (Kopie)“: Bei „Wörter ziehen“, „Wörter markieren“ und „Begriffe zum Aufklappen“ sei die Bearbeitung „total unübersichtlich und nicht schön gelöst“. Ziel: „Dieses Mal muss das wirklich sitzen, über alle Aufgaben und Boxen im Baukasten. Dieser muss unglaublich gut werden.“

## Warum die bisherigen Schritte nicht gereicht haben
- PROJ-101–113 haben die **Seite** umgebaut (Auswählen, Leiste, Ziehen, Tippen, Bilder). Die **Formulare** in der Schublade stammen unverändert aus PROJ-89/90.
- Alle Listen laufen über einen Baustein `Liste` (34 Stellen in 25 Formularen): jeder Eintrag eine große, immer offene Karte mit drei Icons (hoch, runter, löschen). Vier Begriffe füllen zwei Bildschirmhöhen.
- Jedes Formular wurde für sich gebaut. Gleiche Aufgaben bedienen sich verschieden (z. B. „Zuordnen“: pro Begriff ein Dropdown für die Kategorie).
- Lückentexte verlangen Sternchen-Schreibweise (`*Wort:Tipp*`) – für Einsteiger eine Programmiersprache.
- Der Kopf der Schublade („Typ wechseln“, „Formular | Rohfassung“) belegt über 200 px, bevor der Inhalt beginnt. Unter fast jedem Feld steht ein Hinweissatz.

## Grundsatz-Entscheidung (Nutzer, 2026-11-17)
**Seite zum Anschauen und Anklicken, Schublade als richtig guter Editor.** Aufgaben werden nicht direkt in der Seite bearbeitet (wie Google Forms/Kahoot): Die Aufgaben zeichnet der Python-Kern, jeder der 30 Typen mit eigenem HTML und Skript, und jede Änderung baut die Seite in Sekunden neu. Direktes Bearbeiten wäre langsam und fehleranfällig. Lehrtext und Boxen (PROJ-103) bleiben, wie sie sind, direkt in der Seite.

## Entscheidungen
- **E1 – Löschen:** Sofort, mit Toast „Rückgängig“ (kein Rückfrage-Dialog). Rückgängig oben im Editor bleibt zusätzlich. (Nutzer, 2026-11-17)
- **E2 – Kopfbereich:** „Typ wechseln“ und „Rohfassung“ wandern ins `⋯`-Menü der Schublade. Der Kopf zeigt nur Typ-Name, `⋯` und `✕`. (Nutzer, 2026-11-17)
- **E3 – Prototyp zuerst:** Vor dem Bau eine klickbare Seite (privater Link) mit 5 Aufgabentypen, hell und dunkel, Desktop und Handy. Erst nach Freigabe wird gebaut. (Nutzer, 2026-11-17)
- **E4 – Ausliefern:** Jeder Bauschritt zuerst als Vercel-Vorschau-Link (eigener Zweig), live erst nach Freigabe durch den Nutzer.
- **E5 – Ersetzt:** Die Lücken-Liste aus dem Fix vom 2026-11-17 (Commit `72712d6`) geht in Muster E auf.

## Aufbau der Schublade (gilt für jeden Typ)
```
┌ Begriffe zum Aufklappen            ⋯  ✕ ┐   ⋯ = Typ wechseln, Rohfassung,
│                                        │       Duplizieren, Löschen
│ Arbeitsanweisung                       │   Platzhalter statt Hinweistext
│ Inhalt  ── nach Muster A–F ──          │   immer offen
│ ▸ Rückmeldungen & Hilfen   2           │   zugeklappt, Zahl zeigt Inhalt
│ ▸ Einstellungen                        │   zugeklappt (Punkte, Grenzen …)
└────────────────────────────────────────┘
```

## Die sechs Muster
| Muster | Bedienung | Typen |
|---|---|---|
| **A Antworten** | Zeilen mit Kreis (eine richtig) bzw. Kästchen (mehrere richtig) davor; Klick darauf macht sie richtig. Graue Zeile „Antwort hinzufügen“ am Ende. Rückmeldung je Antwort hinter einem kleinen Link. | Einfach-/Mehrfachauswahl, Schnellfragen, Zusammenfassung (Fragen), Tippkarten, Hotspot (Bereiche richtig), Richtig/Falsch (zwei feste Zeilen) |
| **B Zeilen** | Einzeilig, Griff ⠿. Enter = neue Zeile darunter, Rücktaste in leerer Zeile = löschen und Fokus nach oben, Einfügen mehrerer Zeilen = mehrere Einträge. | Reihenfolge, Wörtersuche, Kernaussagen, Störer, Ablenker, Falsche Antworten, Selbsteinschätzung, Bilder ordnen (Texte) |
| **C Paare** | Kurz: zwei Felder nebeneinander in einer Zeile. Lang: aufklappbare Zeile, nur eine offen, zugeklappt Titel + Anfang des zweiten Felds. | Kurz: Memory, Kopfrechnen, Kreuzwort, Schätzrunde, Bildzuordnung (Begriffe). Lang: Begriffe zum Aufklappen, Karten (dialog_cards) |
| **D Gruppen** | Kategorien als Abschnitte, Begriffe darin als Chips mit „+ Begriff“. Chip zwischen Gruppen ziehbar, per Tastatur über Menü „Verschieben nach …“. | Zuordnen (drag_drop), Trainer |
| **E Markieren im Text** | Wort im Textfeld auswählen → Knopf „Als Lücke“ / „Als Lösung“. Gesetzte Stellen farbig hinterlegt, darunter als Chips; Klick auf Chip öffnet kleines Fenster (Wort, Tipp, Entfernen). Keine Sternchen außerhalb der Rohfassung. | Lückentext, erweiterter Lückentext, Wörter ziehen, Wörter markieren |
| **F Schritte** | Nummerierte, aufklappbare Karten, nur eine offen. Innen beliebige Felder und Muster. | Rechenweg, Fallakte, Rechenbeispiel, Kapiteltest, Video-Fragen |

Einzelfeld-Typen ohne Liste (Rechenaufgabe, Freitext, Bild) bekommen nur den einheitlichen Aufbau. Bild-Typen behalten ihre Bild-Werkzeuge (PROJ-104–107); ihre Listen nutzen A, B oder C. Tabelle und Diagramm behalten ihren Tabellen-Editor im einheitlichen Rahmen. Abschluss und Deckblatt nutzen den Aufbau und Muster B.

## User Stories
- Als **Lehrkraft ohne Erfahrung** möchte ich beim Öffnen eines Blocks sofort den Inhalt sehen, nicht Schalter und Hinweistexte, damit ich nicht überlegen muss, wo ich anfange.
- Als **Lehrkraft** möchte ich lange Listen (Begriffe, Karten, Schritte) als kurze Zeilen sehen und nur den Eintrag aufklappen, an dem ich arbeite, damit ich den Überblick behalte.
- Als **Lehrkraft** möchte ich bei einer Auswahlfrage die richtige Antwort mit einem Klick auf den Kreis davor festlegen, wie ich es von Google Forms kenne.
- Als **Lehrkraft** möchte ich bei einem Lückentext ein Wort markieren und „Als Lücke“ klicken, statt Sternchen zu tippen.
- Als **Lehrkraft** möchte ich eine Liste aus Word in eine Liste einfügen und daraus automatisch mehrere Einträge erhalten, damit ich nicht jeden einzeln anlegen muss.
- Als **Lehrkraft** möchte ich bei „Zuordnen“ die Begriffe direkt unter ihrer Kategorie sehen und anlegen, statt für jeden Begriff eine Kategorie auszuwählen.
- Als **Lehrkraft** möchte ich etwas versehentlich Gelöschtes mit einem Klick zurückholen.
- Als **Lehrkraft am Handy** möchte ich dieselben Muster bequem mit dem Finger bedienen.
- Als **erfahrene Lehrkraft** möchte ich Typ wechseln und Rohfassung weiterhin erreichen.

## Acceptance Criteria

### Schritt 0 – Prototyp (vor jedem App-Code)
- [ ] Klickbare Seite (privater Link) mit den Typen Begriffe zum Aufklappen (C lang), Einfachauswahl (A), Wörter ziehen (E), Zuordnen (D), Rechenweg (F); Muster B kommt in mindestens einem davor (z. B. Ablenker/Falsche Antworten).
- [ ] Hell und dunkel umschaltbar, Breite Desktop und Handy umschaltbar; Farben aus den `ws-*`-Werten.
- [ ] Tippen, Aufklappen, Ziehen, Löschen mit Rückgängig, Enter/Rücktaste, Einfügen mehrerer Zeilen und „Als Lücke“ sind bedienbar.
- [ ] Der Nutzer gibt den Prototyp frei oder nennt Änderungen; Änderungen werden eingearbeitet, bevor Schritt 1 beginnt.

### Aufbau der Schublade (alle Typen)
- [ ] Der Kopf zeigt Typ-Name, `⋯` und `✕`; der erste Inhalt beginnt höchstens 120 px unter der Oberkante der Schublade (Desktop).
- [ ] `⋯` enthält: Typ wechseln, Rohfassung bearbeiten, Block duplizieren, Block löschen (rot, ganz unten).
- [ ] Rohfassung öffnet sich in der Schublade mit Knopf „Zurück zum Formular“; sie funktioniert wie heute.
- [ ] Abschnitte „Rückmeldungen & Hilfen“ und „Einstellungen“ sind zugeklappt, zeigen die Zahl ausgefüllter Felder und erscheinen nur, wenn der Typ solche Felder hat.
- [ ] Felder zeigen ein Beispiel als Platzhalter. Ein Hinweissatz unter dem Feld steht nur, wenn eine Regel verletzt ist, und zwar an dieser Stelle (z. B. „Noch eine falsche Antwort nötig“ an der Liste).
- [ ] Mehrzeilige Felder wachsen mit dem Inhalt (keine feste Höhe, kein innerer Scrollbalken bis 12 Zeilen).

### Gemeinsame Regeln aller Muster
- [ ] Löschen eines Eintrags wirkt sofort und zeigt einen Toast „… gelöscht“ mit „Rückgängig“ (mindestens 6 s sichtbar). Rückgängig stellt Eintrag und Position wieder her.
- [ ] Jeder Eintrag hat ein `⋯` mit Duplizieren und Löschen; Reihenfolge per Griff ⠿ ziehbar und per Tastatur (Menü „Nach oben/unten“).
- [ ] Ein neu angelegter Eintrag ist sofort sichtbar (bei C lang/F aufgeklappt) und sein erstes Feld hat den Fokus.
- [ ] Bei aufklappbaren Mustern ist höchstens ein Eintrag offen; der offene bleibt offen, solange darin getippt wird.
- [ ] Mindestanzahlen (z. B. „mindestens zwei Kategorien“) sperren das Löschen nicht stillschweigend: Der Menüpunkt ist deaktiviert und nennt den Grund im Tooltip.
- [ ] Alle Bedienelemente mindestens 44 × 44 px; vollständig per Tastatur bedienbar; sichtbarer Fokus; Icons ohne Text mit `aria-label`.
- [ ] Jede Änderung speichert automatisch und erzeugt einen Rückgängig-Schritt wie heute (Tippen in einem Feld = ein Schritt).

### Muster A – Antworten
- [ ] Bei „genau eine richtig“ ist der Marker ein Kreis, bei „mehrere richtig“ ein Kästchen; ein Klick setzt bzw. wechselt die richtige Antwort.
- [ ] Die letzte Zeile „Antwort hinzufügen“ legt beim Hineinklicken oder Tippen eine neue Antwort an.
- [ ] Enter in einer Antwort springt zur nächsten bzw. legt eine neue an.
- [ ] Rückmeldung je Antwort ist über „Rückmeldung“ an der Zeile erreichbar; vorhandene Rückmeldungen sind an einem Punkt erkennbar.

### Muster B – Zeilen
- [ ] Enter legt eine neue Zeile darunter an, Rücktaste in leerer Zeile löscht sie und setzt den Fokus ans Ende der vorigen.
- [ ] Einfügen von Text mit Zeilenumbrüchen (auch Aufzählungszeichen aus Word: •, -, 1.) erzeugt je Zeile einen Eintrag, ohne Aufzählungszeichen; leere Zeilen werden übersprungen.
- [ ] Ist eine Höchstzahl erreicht, werden überzählige Zeilen nicht angelegt und ein Hinweis nennt die Zahl.

### Muster C – Paare
- [ ] Kurze Paare stehen ab 400 px Schubladenbreite nebeneinander, darunter untereinander.
- [ ] Lange Paare zeigen zugeklappt Titel und die ersten ~60 Zeichen des zweiten Felds; leere Pflichtfelder sind zugeklappt orange markiert.

### Muster D – Gruppen
- [ ] Jede Kategorie ist ein Abschnitt mit Titel-Feld und ihren Begriffen als Chips; „+ Begriff“ legt einen Begriff in dieser Kategorie an.
- [ ] Chips lassen sich zwischen Kategorien ziehen und per Menü „Verschieben nach …“ umhängen.
- [ ] Löschen einer Kategorie mit Begriffen löscht die Begriffe mit (Rückgängig stellt alles her); der Toast nennt die Anzahl.

### Muster E – Markieren im Text
- [ ] Im Textfeld sind gesetzte Stellen farbig hinterlegt; Sternchen sind dort nicht sichtbar.
- [ ] Wird Text ausgewählt, erscheint direkt daran ein Knopf „Als Lücke“ (bei Wörter markieren: „Als Lösung“); bei Auswahl über eine bestehende Stelle hinweg oder über mehrere Absätze ist er deaktiviert mit Grund.
- [ ] Unter dem Text stehen alle Stellen als Chips in Textreihenfolge; Klick auf einen Chip öffnet ein kleines Fenster mit Wort (bei Lückentext zusätzlich „weitere richtige Schreibweisen“), Tipp (Wörter ziehen, erweiterter Lückentext) und „Lücke entfernen“.
- [ ] „Lücke entfernen“ lässt das Wort als normalen Text stehen.
- [ ] Die gespeicherte Struktur (Sternchen-Schreibweise) bleibt unverändert, Rohfassung zeigt sie wie bisher.
- [ ] HTML-Tags im Klartext (`<p>`) werden beim Öffnen erkannt und mit einem Klick entfernt (wie im Fix vom 2026-11-17).

### Muster F – Schritte
- [ ] Schritte sind nummeriert, zugeklappt mit Nummer und Titel bzw. Anfang des ersten Felds, nur einer offen.

### Vollständigkeit
- [ ] Alle Typen mit Formular (`FORMULARE` inkl. Katalog, derzeit 35 Einträge) nutzen den neuen Aufbau; kein Formular nutzt mehr den alten Baustein `Liste`/`TextListe` (Wächter-Test schlägt sonst fehl).
- [ ] Für jeden Typ gibt es einen Test, der Anlegen, Ändern, Umsortieren und Löschen eines Eintrags prüft.
- [ ] Am Ende ein Durchgang mit einer echten Einheit (z. B. „Basics rund um den LKW“): jeden vorkommenden Typ einmal anlegen, ändern, umsortieren, löschen – im Vorschau-Link, vor dem Livegang.

## Edge Cases
- **Sehr lange Listen (30+ Einträge, z. B. Wörtersuche, Kapiteltest):** Zugeklappte Zeilen halten die Liste kurz; die Schublade scrollt, die Kopfzeile bleibt stehen.
- **Bestandsblöcke mit fehlerhaften Daten** (fehlende Felder, HTML im Klartext, Sternchen ohne Gegenstück): Das Formular zeigt, was lesbar ist, markiert Fehler am Ort und zerstört nichts beim Öffnen. Nicht lesbare Teile bleiben in der Rohfassung erreichbar.
- **Unbekannte Felder** im Block (z. B. von der KI) bleiben beim Speichern erhalten (wie heute).
- **Einfügen eines sehr langen Texts in Muster B** (z. B. 200 Zeilen): Nur bis zur Höchstzahl, Hinweis mit Zahl.
- **Schnelles Tippen während die Vorschau neu baut:** Die Schublade reagiert sofort; die Vorschau folgt verzögert wie heute.
- **Rückgängig nach Typ wechseln oder Rohfassung:** verhält sich wie heute (ein Schritt).
- **Schreibschutz** (fremdes Material, nur ansehen): Alle Muster zeigen den Inhalt lesbar ohne Bedienelemente.
- **Handy:** Schublade als Vollbild-Blatt; Ziehen nur über den Griff (kein versehentliches Ziehen beim Scrollen); Auswahl-Knopf in Muster E erscheint über der Bildschirmtastatur.
- **Wörter markieren:** Ein Wort, das mehrfach im Text vorkommt, wird nur an der ausgewählten Stelle markiert.

## Nicht Teil dieser Spec
- Klick in der Seite öffnet den Eintrag → PROJ-115.
- Lösungen im Modus Bearbeiten sichtbar → PROJ-116.
- Aufgaben direkt in der Seite bearbeiten (verworfen, siehe Grundsatz).
- Lehrtext und Boxen (bleiben direkt in der Seite, PROJ-103).
- Vorschau-Tempo Stufe 2 (PROJ-112).
- Änderungen am Kern oder an der gespeicherten Struktur.

## Dependencies
- Requires: PROJ-89/90 (Formulare, Katalog), PROJ-96 (Schublade), PROJ-111 (eine Bedienstelle)
- Berührt: PROJ-83 (Bedienmuster: `⋯`-Menü, Löschen rot unten), PROJ-45 (Tokens, 44 px, Barrierefreiheit), PROJ-95 (Typ wechseln, jetzt im Menü)
- Grundlage für: PROJ-115, PROJ-116

## Modellwahl
- Schritt 0 (Prototyp) und Schritt 1 (Grundgerüst, Muster-Bausteine): **Opus**
- Schritt 2 (Formulare umstellen, Typ für Typ): **Sonnet**
- QA: **Opus**

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
