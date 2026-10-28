# PROJ-64: Werkzeugkiste – Direkt erstellen (bezahlte KI)

## Status: Architected
**Created:** 2026-10-28
**Last Updated:** 2026-10-28

## Kontext
In PROJ-51 läuft die KI-Stufe nur über die eigene KI der Lehrkraft (E7 „Kostenlos“): Prompt kopieren, in ChatGPT o. ä. einfügen, Antwort zurückkopieren. Im ersten Praxistest (2026-10-28) zeigte sich:
- Für die meisten Kolleginnen und Kollegen ist dieser Weg im Alltag zu umständlich.
- Kostenlose KI-Zugänge scheitern an langen Skripten: Ein Skript mit 117.000 Zeichen plus 37.000 Zeichen Anweisungen war für ChatGPT Free zu lang. ChatGPT kürzte die Anweisungen weg und fragte nur noch „Was möchtest du daraus erstellen?“.

Deshalb gibt es künftig **zwei Wege**: „Direkt erstellen“ (die App fragt eine bezahlte KI selbst) und den bisherigen kostenlosen Weg für erfahrene Kolleginnen und Kollegen mit eigener KI.

### Entscheidungen (Nutzer, 2026-10-28)
- **E1 – Beide Wege:** „Direkt erstellen“ (bezahlt) und „Kostenlos mit eigener KI“ (Kopier-Weg wie in PROJ-51) stehen nebeneinander.
- **E2 – Für alle Werkzeuge:** Das Muster gilt für jedes Werkzeug. Umgesetzt wird es zuerst für „Ganzes Skript“ (PROJ-51), die übrigen Werkzeuge übernehmen es in PROJ-54.
- **E3 – Alle Lehrkräfte:** Jede Person mit Zugang zur Werkzeugkiste darf „Direkt erstellen“ nutzen, ohne eigene Freischaltung.
- **E4 – Vorauswahl:** „Direkt erstellen“ ist vorausgewählt. Der kostenlose Weg ist als zweiter Knopf klar sichtbar.
- **E5 – Grenze = Guthaben:** Es gibt keine Obergrenze je Person. Die Grenze ist das Guthaben, das der Super-Admin beim KI-Anbieter vorab auflädt (ohne automatisches Nachladen). Ist es aufgebraucht, ist nur noch der kostenlose Weg möglich.
- **E6 – Transparenz:** Vor dem Start sieht die Lehrkraft, was das Erstellen ungefähr kostet. Danach wird der genaue Betrag festgehalten. Übersichten: PROJ-65 (eigenes Konto) und PROJ-66 (Super-Admin).
- **E7 – Datenschutz:** An die KI geht nur Unterrichtsmaterial (Skripttext und Bilder). Genutzt wird eine bezahlte Schnittstelle, deren Eingaben nicht zum Training verwendet werden. Der Hinweis „Keine Schülerdaten im Skript“ steht beim Hochladen.

## Dependencies
- Requires: PROJ-51 (Werkzeugkiste-Rahmen, Ablauf, Kern, Prüfstelle)
- Requires: PROJ-10: Der bezahlte KI-Zugang (Anthropic) besteht dort bereits. Beide Features teilen sich das Guthaben.
- Wird ergänzt durch: PROJ-65 (Verbrauch im eigenen Konto), PROJ-66 (Kostenübersicht Super-Admin), PROJ-54 (weitere Werkzeuge)

## User Stories
- Als **Lehrkraft ohne eigene KI-Erfahrung** möchte ich nach dem Hochladen und den Einstellungen nur auf „Erstellen“ drücken, damit ich ohne Kopieren und ohne fremde Konten fertiges Material bekomme.
- Als **Lehrkraft** möchte ich vor dem Start sehen, was das ungefähr kostet, damit ich bewusst entscheide, ob ich den bezahlten oder den kostenlosen Weg nehme.
- Als **Lehrkraft mit einem langen Skript** möchte ich das ganze Skript in einem Durchgang verarbeiten lassen, damit ich es nicht selbst in Teile zerlegen muss.
- Als **erfahrene Lehrkraft mit eigener KI** möchte ich weiterhin den kostenlosen Weg wählen können, damit ich kein Schulgeld verbrauche.
- Als **Lehrkraft** möchte ich, dass ich bei leerem Guthaben ohne Sackgasse auf den kostenlosen Weg komme, damit ich trotzdem weiterarbeiten kann.
- Als **Super-Admin** möchte ich, dass nie mehr verbraucht werden kann als das aufgeladene Guthaben, damit keine unerwarteten Kosten entstehen.

## Acceptance Criteria

### Wegwahl (Schritt 2 → 3)
- [ ] Am Ende von Schritt 2 (Einstellungen) stehen zwei Möglichkeiten: Hauptaktion **„Direkt erstellen“** (grün, vorausgewählt) und Nebenaktion **„Kostenlos mit eigener KI“** (outline).
- [ ] Unter „Direkt erstellen“ steht die Kostenschätzung in einem Satz, z. B. „ca. 0,15 € · dauert etwa 1–2 Minuten“. Grundlage sind die Textmenge der aktuellen Auswahl und das gewählte Werkzeug.
- [ ] Ändert die Lehrkraft die Auswahl oder die Einstellungen, passt sich die Schätzung sofort an.
- [ ] „Kostenlos mit eigener KI“ führt in den bekannten Ablauf aus PROJ-51 (Prompt kopieren → Antwort einfügen). An diesem Weg ändert sich nichts.

### Direkt erstellen
- [ ] Nach dem Klick zeigt die App einen Warte-Bildschirm mit Fortschritt in Worten („Skript wird gelesen … Kapitel 3 von 6 … Datei wird gebaut“). Es gibt keinen endlosen Drehkreis ohne Erklärung.
- [ ] Die Lehrkraft darf die Seite verlassen oder neu laden. Kommt sie zurück, sieht sie den aktuellen Stand bzw. das fertige Ergebnis (der Ablauf steht in „Meine Abläufe“ bzw. ist über die Adresse erreichbar).
- [ ] Lange Skripte verarbeitet die App ohne Zutun der Lehrkraft. Das Ergebnis ist **eine** Datei mit allen Kapiteln, wie bei einem kurzen Skript.
- [ ] Die Prüfstelle läuft automatisch. Findet sie Wichtiges (Stufe „hoch“), bessert die App einmal selbst nach. Die Kosten der Nachbesserung zählen zum selben Lauf.
- [ ] Am Ende steht Schritt 5 „Fertig“ wie in PROJ-51 (Herunterladen, Vorschau, Weiter-Vorschläge). Zusätzlich steht dort der **genaue Betrag** dieses Laufs („Kosten: 0,13 €“).
- [ ] Bleiben nach der Nachbesserung Hinweise übrig, stehen sie in Schritt 5 als kurze Liste wie in PROJ-51. Die Datei wird trotzdem gebaut.

### Abbruch & Wiederholen
- [ ] Während der Erstellung gibt es „Abbrechen“. Bereits angefallene Kosten werden trotzdem erfasst, und die Lehrkraft sieht sie in einem Satz.
- [ ] Schlägt die Erstellung fehl (KI nicht erreichbar, Zeitgrenze), sieht die Lehrkraft einen verständlichen Satz und zwei Knöpfe: „Erneut versuchen“ und „Kostenlos mit eigener KI weitermachen“. Ihre Eingaben bleiben erhalten.

### Guthaben leer
- [ ] Meldet der KI-Anbieter, dass das Guthaben aufgebraucht ist, ist „Direkt erstellen“ gesperrt. Die Lehrkraft sieht den Satz: „Das Schulguthaben für die direkte Erstellung ist aufgebraucht. Du kannst kostenlos mit deiner eigenen KI weitermachen.“ Dazu gibt es einen Knopf in den kostenlosen Weg.
- [ ] Die Sperre gilt für alle, bis ein späterer Versuch wieder gelingt (der Super-Admin hat neu aufgeladen). Es gibt keine händische Freischaltung.
- [ ] Die Lehrkraft bekommt keine Fehlermeldung des Anbieters zu sehen, nur den Satz oben.

### Kostenerfassung
- [ ] Jeder Lauf wird mit Datum, Lehrkraft, Werkzeug, Textmenge, verwendetem Modell und **genauem Betrag** festgehalten. Der Betrag stammt aus der Verbrauchsangabe des Anbieters, nicht aus der Schätzung.
- [ ] Ein Lauf ohne Kosten (Abbruch vor dem ersten KI-Aufruf) wird nicht als Kostenposten gezählt.
- [ ] Der Eintrag bleibt erhalten, auch wenn der Ablauf nach 7 Tagen gelöscht wird (die Abrechnung hängt nicht am Entwurf).
- [ ] Beträge werden in Euro angezeigt. Rechnet der Anbieter in Dollar ab, gilt ein fester, vom Super-Admin pflegbarer Umrechnungskurs (PROJ-66). In der Anzeige steht dann „ca.“.

## Edge Cases
- **Sehr langes Skript (z. B. 300 Seiten):** Die Schätzung zeigt den höheren Betrag deutlich. Ab einer festen Schwelle (z. B. über 2 €) bestätigt die Lehrkraft mit einem zusätzlichen Klick („Das kostet ca. 2,40 €. Trotzdem erstellen?“).
- **Zwei Läufe gleichzeitig:** Eine Lehrkraft kann je Ablauf nur einen Lauf starten. Ein Doppelklick startet keinen zweiten (kostenpflichtigen) Lauf.
- **Guthaben reicht nur für einen Teil:** Bricht der Lauf mittendrin ab, weil das Guthaben endet, werden die bis dahin angefallenen Kosten erfasst. Die Lehrkraft sieht den Satz aus „Guthaben leer“ und kann mit dem kostenlosen Weg weitermachen.
- **Antwort der KI unlesbar:** Die App versucht es einmal neu (zählt zum selben Lauf). Scheitert auch das, gilt „Erstellung fehlgeschlagen“ mit beiden Knöpfen.
- **Skript enthält erkennbar Schülerdaten:** Die App kann das nicht sicher erkennen. Es gilt der Hinweis beim Hochladen (E7), eine automatische Prüfung gibt es nicht.
- **Fragen-Generator (PROJ-10) braucht das Guthaben auf:** Beide Features teilen sich das Guthaben. Dann gilt auch für die Werkzeugkiste „Guthaben leer“, und der Fragen-Generator meldet seinen eigenen Fehler.
- **Kostenloser Weg nach direktem Fehlschlag:** Der Ablauf springt in Schritt 3 (Prompt kopieren) mit derselben Auswahl und denselben Einstellungen.
- **Handy:** Der Warte-Bildschirm funktioniert auch bei gesperrtem Bildschirm bzw. App-Wechsel. Die Erstellung läuft auf dem Server weiter, die Lehrkraft holt das Ergebnis später ab.

## Technical Requirements
- **Sicherheit:** Der Schlüssel des KI-Anbieters liegt nur auf dem Server, nie im Browser. Nur Lehrer-Rollen können einen Lauf starten (wie PROJ-51).
- **Schutz vor Kosten-Missbrauch:** höchstens ein laufender Lauf je Ablauf und eine sinnvolle Höchstzahl an Läufen je Lehrkraft und Tag (z. B. 20). Darüber gilt ein freundlicher Satz und der kostenlose Weg.
- **Gleichwertigkeit:** Die Anweisungen an die KI sind dieselben wie im kostenlosen Weg (gleicher Prompt aus dem Kern), damit beide Wege gleich gutes Material liefern.
- **Dauer:** typisches Skript (20–40 Seiten) in höchstens etwa 3 Minuten. Die Erstellung darf die Zeitgrenze einzelner Server-Aufrufe nicht reißen.
- **Browser:** wie PROJ-51 (Chrome, Firefox, Safari, Handy).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick in einem Satz
Die App holt sich vom Python-Kern wie bisher den Prompt, schickt ihn selbst an Claude Sonnet 5.5, gibt die Antwort zurück an den Kern zum Prüfen und Bauen, und schreibt jeden Schritt mit seinen genauen Kosten in die Datenbank.

### Wer macht was
| Teil | Aufgabe | Neu oder vorhanden |
|---|---|---|
| **Python-Kern** | Skript einlesen, Prompt bauen, Antwort prüfen, Nachbesserungs-Prompt, Datei bauen | vorhanden (PROJ-51) |
| **Python-Kern** | Lange Auswahl in **Teile** zerlegen (an Überschriften bzw. Seiten) und mehrere Teil-Antworten zu **einer** Antwort zusammenfügen | **neu** (zwei kleine Funktionen) |
| **App (Server)** | Claude aufrufen, Läufe und Teile steuern, Kosten berechnen und speichern, Guthaben-Sperre | **neu** |
| **App (Oberfläche)** | Wegwahl mit Kostenschätzung, Warte-Bildschirm, Kosten in „Fertig“ | **neu** |

Der Kern bekommt **keinen** KI-Schlüssel. Er kennt weiterhin keine Konten, keine Datenbank und kein Geld (Entscheidung aus PROJ-51). Den Schlüssel hat nur die App, er ist schon da (`ANTHROPIC_API_KEY`, PROJ-10).

### Ablauf eines Laufs
```
Lehrkraft drückt „Direkt erstellen“
  │
  ├─ App: Lauf anlegen (Status „wartet“), Doppelstart ausgeschlossen
  ├─ Kern: Auswahl in Teile zerlegen   → z. B. 1 Teil (normales Skript) oder 6 Teile (117.000 Zeichen)
  │
  ├─ Für jeden Teil, parallel, jeweils in einem eigenen Server-Aufruf:
  │     Kern: Prompt für diesen Teil   (derselbe Prompt wie im kostenlosen Weg)
  │     Claude: Antwort schreiben      → Kosten dieses Teils sofort speichern
  │     Kern: Teil prüfen              → bei Befund „hoch“: einmal nachbessern lassen (gleiche Unterhaltung)
  │
  ├─ Sind alle Teile fertig:
  │     Kern: Teile zusammenfügen      (ein Deckblatt, alle Kapitel, ein Abschlusskapitel)
  │     Kern: Gesamtprüfung + Datei bauen + Vorschau   (wie PROJ-51)
  │
  └─ Lauf „fertig“: Ablauf springt auf Schritt 5, Kosten stehen fest
```

### Warum in Teilen und warum parallel
- Ein einzelner Server-Aufruf darf auf Vercel höchstens **5 Minuten** dauern. Claude schreibt grob 60–100 Wörter-Bausteine je Sekunde. Ein ganzes langes Skript in einer Antwort würde 10 Minuten und mehr dauern. Teile von etwa **20.000–25.000 Zeichen Skripttext** bleiben sicher unter der Grenze.
- Parallel laufen die Teile, damit auch ein langes Skript nach 2–4 Minuten fertig ist und nicht erst nach 20.
- Ein normales Skript (bis ~25.000 Zeichen) ist **ein** Teil. Für die meisten Lehrkräfte ändert sich also nichts an der Qualität gegenüber dem kostenlosen Weg.
- Jeder Teil bekommt den vollständigen Prompt. Die langen, gleichbleibenden Anweisungen (37.000 Zeichen) werden bei Claude **zwischengespeichert** („Prompt-Caching“). Ab dem zweiten Teil kosten sie nur noch ein Zwanzigstel.

### Wie der Lauf auch ohne offene Seite weiterläuft
- Jeder Schritt läuft als eigener Server-Aufruf. Ist er fertig, stößt er den nächsten an. Die Seite der Lehrkraft muss dafür nicht offen sein.
- Bleibt ein Teil hängen (Absturz, Zeitgrenze), merkt das die nächste Statusabfrage, entweder von der Lehrkraft (Warte-Bildschirm fragt alle 3 Sekunden) oder beim späteren Öffnen des Ablaufs. Der Teil wird dann **einmal** neu gestartet. Scheitert er wieder, gilt der Lauf als fehlgeschlagen.
- Wir nutzen bewusst keinen zusätzlichen Warteschlangen-Dienst. Vercel Hobby erlaubt Zeitpläne nur einmal am Tag, und eine Warteschlange wäre ein weiterer Baustein. Das Muster „Schritt stößt Schritt an, Statusabfrage repariert Hänger“ reicht für die Nutzung einer Schule.

### Komponenten (Oberfläche)
```
Ablauf (PROJ-51, bekannter Rahmen)
+-- Schritt 1 „Skript hochladen“
|   +-- NEU: Hinweiszeile „Bitte keine Schülerdaten im Skript“
+-- Schritt 2 „Was soll daraus werden?“
|   +-- Einstellungen (unverändert)
|   +-- NEU: Fuß mit zwei Wegen
|       +-- Hauptaktion „Direkt erstellen“  + Schätzzeile „ca. 0,15 € · etwa 1–2 Minuten“
|       +-- Nebenaktion „Kostenlos mit eigener KI“  (→ bisheriger Schritt 3)
|       +-- Rückfrage-Dialog ab 2 € („Das kostet ca. 2,40 €. Trotzdem erstellen?“)
|       +-- Sperr-Hinweis, wenn Guthaben leer oder Tageslimit erreicht
+-- NEU: Schritt „Wird erstellt“  (nur beim direkten Weg, ersetzt Schritt 3+4)
|   +-- Fortschritt in Worten („Teil 3 von 6 fertig … Datei wird gebaut“) + Balken
|   +-- „Abbrechen“ (mit Rückfrage, nennt bisherige Kosten)
|   +-- Fehlerfall: Satz + „Erneut versuchen“ + „Kostenlos mit eigener KI weitermachen“
+-- Schritt 5 „Fertig“ (unverändert)
    +-- NEU: Zeile „Kosten: 0,13 €“
    +-- verbliebene Hinweise der Prüfstelle (kurze Liste wie PROJ-51)
```
- **Schrittleiste:** Beim direkten Weg zeigt sie vier Schritte (Skript · Einstellungen · Erstellen · Fertig), beim kostenlosen Weg die bekannten fünf. Der Wechsel ist jederzeit möglich, solange kein Lauf läuft.
- Alle Teile nutzen die vorhandenen Bausteine (Button, AlertDialog, Progress, Hinweis-Box, `ws-*`-Farben).

### Daten (in einfachen Worten)
**Ablauf** (vorhanden, `werkzeug_ablaeufe`) bekommt einen Vermerk: gewählter Weg (direkt/kostenlos) und Verweis auf den aktuellen Lauf.

**Lauf** (neu, je „Direkt erstellen“-Klick ein Eintrag):
- Lehrkraft, Werkzeug, Skript-Dateiname, Zeichenzahl der Auswahl, Modell
- Status: wartet · läuft · fertig · abgebrochen · fehlgeschlagen; dazu ein verständlicher Fehlersatz
- Anzahl Teile gesamt und fertig (für den Fortschritt)
- Kosten: genauer Betrag in Dollar, Umrechnungskurs zum Zeitpunkt des Laufs, Betrag in Euro
- Beginn, Ende
- Verweis auf den Ablauf. Wird der Ablauf nach 7 Tagen gelöscht, bleibt der Lauf erhalten (nur der Verweis wird leer). So bleibt die Abrechnung vollständig (PROJ-65/66).

**Teil eines Laufs** (neu):
- Nummer, Status, Zahl der Versuche, Zeitpunkt des letzten Lebenszeichens (zum Erkennen von Hängern)
- Verbrauch je KI-Aufruf: eingehende, ausgehende und zwischengespeicherte Wörter-Bausteine, Betrag in Dollar
- Die Teil-Antwort liegt als Datei im vorhandenen privaten Speicher der Werkzeugkiste, nicht in der Tabelle.

**Einstellungen** (neu, genau ein Eintrag, später in PROJ-66 pflegbar):
- Umrechnungskurs Dollar → Euro (Startwert wird beim Bau eingetragen)
- „Guthaben leer seit“ (leer = alles in Ordnung)
- Preisliste je Modell (Eingabe, Ausgabe, Cache schreiben, Cache lesen)

**Wer sieht was:**
- Eine Lehrkraft liest nur ihre eigenen Läufe und Teile (Zeilen-Regeln wie bei den Abläufen).
- Der Super-Admin liest alle Läufe (für PROJ-66).
- Geschrieben wird **nur vom Server**. Aus dem Browser lässt sich kein Betrag ändern.

### Kosten: Schätzung und genauer Betrag
- **Schätzung (vor dem Start):** aus der Zeichenzahl der Auswahl, der Teilezahl und einem Erfahrungswert, wie lang die Antwort im Verhältnis zum Skript wird. Anfangs ist das ein fester Wert. Sobald echte Läufe da sind, kann die App den Durchschnitt der letzten Läufe nehmen, dann wird die Schätzung von selbst genauer. Angezeigt wird gerundet mit „ca.“.
- **Genauer Betrag (nach dem Lauf):** Claude meldet nach jedem Aufruf genau, wie viele Bausteine verbraucht wurden. Die App multipliziert mit der hinterlegten Preisliste und addiert alle Aufrufe des Laufs, Nachbesserungen eingeschlossen. Das entspricht der Abrechnung des Anbieters (ohne Steuern).
- **Richtwerte mit Sonnet 5.5** (Listenpreis 2 $ / 10 $ je Million Bausteine Ein/Aus):
  - normales Skript (~30 Seiten): ca. 0,15 €
  - sehr langes Skript (117.000 Zeichen, 6 Teile): ca. 0,70 €
  - Der größte Posten ist die **Antwort** (Ausgabe kostet das Fünffache der Eingabe).

### Guthaben leer, Tageslimit, Doppelstart
- **Guthaben leer:** Antwortet Claude mit „Guthaben zu niedrig“, setzt die App „Guthaben leer seit …“. Ab dann ist „Direkt erstellen“ für alle gesperrt, mit dem Satz aus den Akzeptanzkriterien und dem Knopf in den kostenlosen Weg.
  - **Wie die Sperre wieder aufgeht:** Höchstens einmal pro Stunde lässt die App **einen** Probe-Lauf zu. Gelingt er, ist die Sperre weg. Zusätzlich kann der Super-Admin in PROJ-66 auf „Ich habe aufgeladen“ drücken. Bis PROJ-66 gebaut ist, gilt nur die stündliche Probe.
- **Tageslimit:** höchstens 20 direkte Läufe je Lehrkraft und Tag (Schutz vor versehentlichen Schleifen, kein Budget-Werkzeug).
- **Doppelstart:** Die Datenbank erlaubt je Ablauf nur **einen** aktiven Lauf. Ein zweiter Klick zeigt einfach den laufenden an.
- **Abbrechen:** Der Lauf wird als „abgebrochen“ markiert. Teile, die gerade bei Claude laufen, werden noch zu Ende gerechnet (bezahlt ist es ohnehin), ihre Kosten zählen, ihr Ergebnis wird verworfen.

### Gleichwertigkeit mit dem kostenlosen Weg
- Der Prompt kommt unverändert aus dem Kern. Beide Wege bekommen also dieselben Anweisungen.
- Bei einem Teil ist die Antwort genau so aufgebaut wie im kostenlosen Weg. Prüfen und Bauen laufen über die vorhandenen Funktionen.
- Bei mehreren Teilen fügt der Kern die Kapitel zusammen: Deckblatt vom ersten Teil, Kapitel in Reihenfolge, **ein** Abschlusskapitel (Lernzielkontrolle). Dessen Fragen werden aus den Abschlusskapiteln der Teile gesammelt und auf eine sinnvolle Zahl begrenzt.

### Technische Entscheidungen (warum)
| Entscheidung | Warum |
|---|---|
| **Claude Sonnet 5.5** (Nutzerentscheidung) | Hält den langen, strengen Aufbau zuverlässig ein. Das spart Nachbesserungen, die ebenfalls Geld kosten. |
| **Anthropic-Zugang aus PROJ-10 mitnutzen** | Schlüssel, Abrechnung und Guthaben gibt es schon. Ein zweiter Anbieter hieße zweites Konto, zweites Guthaben. |
| **KI-Aufruf in der App, nicht im Kern** | Der Kern bleibt ohne Geheimnisse und ohne Geld. Die App hat Konten, Datenbank und Rechte. |
| **Teile statt eine Riesen-Antwort** | Zeitgrenze von 5 Minuten je Aufruf und kürzere Wartezeit durch Parallelität. |
| **Prompt-Caching** | Die 37.000 Zeichen Anweisungen sind in jedem Teil gleich. Zwischengespeichert kosten sie ab dem zweiten Teil fast nichts. |
| **Kosten aus der Verbrauchsangabe, nicht aus der Schätzung** | Nur so stimmt die Abrechnung mit dem Anbieter überein (Wunsch: „genaue Abrechnung“). |
| **Eigene Tabelle für Läufe** | Die Abrechnung muss die 7-Tage-Löschung der Entwürfe überleben. |
| **Keine Warteschlange, kein Zusatzdienst** | Hobby-Tarif, wenige Läufe am Tag. „Schritt stößt Schritt an“ plus Reparatur bei Statusabfrage reicht und kostet nichts extra. |

### Risiken und offene Punkte
- **Ratenlimits bei Anthropic:** Neue Konten dürfen nur eine begrenzte Menge je Minute verarbeiten. Sechs Teile parallel könnten daran stoßen. Dann laufen die Teile gestaffelt statt gleichzeitig, das dauert länger, kostet aber nicht mehr. Vor dem Bau prüfen wir die Stufe des Kontos.
- **Zusammenfügen mehrerer Teile:** Kapitel an Teilgrenzen können sich leicht überschneiden. Die Teilung an Überschriften hält das klein. Wir prüfen es beim Bau mit deinem 117.000-Zeichen-Skript.
- **Preise ändern sich:** Die Preisliste liegt in den Einstellungen und nicht im Code. Ändert Anthropic die Preise, passen wir einen Eintrag an.
- **Euro-Beträge sind „ca.“:** Anthropic rechnet in Dollar ab. Der Kurs ist fest hinterlegt.

### Abhängigkeiten (Pakete)
- Keine neuen. `@anthropic-ai/sdk` ist schon installiert (PROJ-10). Wir nehmen die neueste Version, falls nötig.

### Umfang des Baus
- **Kern:** zwei neue Funktionen samt Schnittstelle (Teilen, Zusammenfügen) und Tests
- **Datenbank:** zwei neue Tabellen, Einstellungen, Regeln, eine Ergänzung an `werkzeug_ablaeufe`
- **App-Server:** Lauf starten, Teil bearbeiten, Status abfragen (mit Hänger-Reparatur), Abbrechen, Schätzung
- **Oberfläche:** Wegwahl in Schritt 2, Warte-Schritt, Kostenzeile in Schritt 5, Hinweis in Schritt 1

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
