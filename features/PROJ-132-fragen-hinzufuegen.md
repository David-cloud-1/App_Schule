# PROJ-132: Fragen hinzufügen – drei Wege mit Vorschau (Phase 3 Übersichtlichkeit, Teil 2)

## Status: Approved
**Created:** 2026-11-27
**Last Updated:** 2026-11-27 (Frontend und Backend gebaut)

## Worum es geht

Phase 3 aus [docs/plan-uebersichtlichkeit.md](../docs/plan-uebersichtlichkeit.md), Teil 2. Heute gibt es auf der Seite „Fragen“ den Dialog „Neue Frage“, große Knöpfe für den Export und Import von Tabellen und die eigene Seite „Fragen aus Material“. Dort stehen „Prompt“, „API-Key“, „Methode 1“ und ein JSON-Beispiel, und die Lehrkraft muss Platzhalter selbst in einem langen Text ersetzen. Neue Fragen von dort sind **sofort aktiv**.

Künftig führt ein grüner Knopf **„Fragen hinzufügen“** auf der Seite „Lerninhalte“ ([PROJ-131](PROJ-131-lerninhalte-an-einem-ort.md)) zu drei Wegen:
1. **Selbst schreiben:** eine Frage eintippen.
2. **Aus Material erstellen:** ein Skript hochladen, die eigene KI schreibt Vorschläge, die Lehrkraft prüft sie und übernimmt sie dann.
3. **Aus einer Tabelle übernehmen:** eine CSV-Datei mit vielen Fragen einlesen, prüfen und übernehmen.

Neue Fragen aus Material und Tabelle erscheinen **erst als Vorschau**. Für Azubis sichtbar werden sie erst nach „Übernehmen“.

**Grundlage:**
- Klickbare Vorschau `docs/vorschau/phase1-neuer-aufbau.html` (Dialog „Fragen hinzufügen“, Schrittfolge Material wählen → Mit deiner KI → Vorschau)
- Befunde aus dem Plan: B42, B43, B44, B47, B48
- Vereinbarter Weg für Fragen ([Memory: Wie Fragen entstehen]): kopierter Auftrag, externe KI, Antwort zurück. **Alles bleibt kostenlos.**

**Entscheidungen 27.11.2026 (Nutzer):**
- **E1 – Zuschnitt:** eigenes Feature nach PROJ-131.
- **E2 – Material:** Die Lehrkraft lädt eine **Datei hoch** (PDF, Word, PowerPoint). Die App liest den Text und baut daraus den fertigen Auftrag für die KI. Niemand ersetzt mehr Platzhalter von Hand.
- **E3 – Alte Seite:** „Fragen aus Material“ leitet nach dem Livegang auf „Lerninhalte“ weiter und öffnet dort „Fragen hinzufügen → Aus Material“. Das entspricht E2 in PROJ-131.

## Dependencies
- Requires: PROJ-131 (Seite „Lerninhalte“, Knopf „Fragen hinzufügen“)
- Nutzt: PROJ-38 (Import per Kopier-Auftrag, Prüfung der Importzeilen), PROJ-16 (Torwächter: Qualitätsprüfung neuer Fragen), PROJ-22 (Hinweise des Bereichs für den Auftrag), PROJ-9 (CSV-Import und -Export), PROJ-130 (Wörter „Auftrag für die KI“ und „Antwort der KI“)
- Nutzt vielleicht: Text-Auslese der Werkzeugkiste (PROJ-51/87, Python-Kern) für PDF, Word und PowerPoint. Das wird bei /architecture entschieden.

## User Stories
- Als **Lehrkraft** möchte ich einen einzigen Knopf „Fragen hinzufügen“ und dahinter drei klar beschriebene Wege. So muss ich nicht wissen, welche Seite was kann.
- Als **Lehrkraft** möchte ich mein Skript hochladen und einen fertigen Auftrag für meine KI bekommen. So muss ich keinen langen Text bearbeiten und keine Platzhalter suchen.
- Als **Lehrkraft** möchte ich die Vorschläge der KI erst ansehen, einzeln abwählen oder korrigieren und dann übernehmen. So sehen Azubis nie ungeprüfte Fragen.
- Als **Lehrkraft** möchte ich beim Schreiben einer Frage zuerst Fach und Thema wählen, und zwar nur aus meinem Bereich. So landet die Frage an der richtigen Stelle.
- Als **Lehrkraft** möchte ich eine Tabelle mit vielen Fragen einlesen und vorher sehen, welche Zeilen fehlerhaft sind.
- Als **Lehrkraft** möchte ich keine Fachwörter wie Prompt, JSON oder API-Key sehen. Ich arbeite mit Texten, nicht mit Technik.

## Acceptance Criteria

### Einstieg
- [ ] „Fragen hinzufügen“ (grün, Seitenkopf „Lerninhalte“) öffnet einen Dialog mit der Frage „Wie möchtest du Fragen hinzufügen?“ und drei großen Auswahlflächen mit je einem Satz:
  - „Selbst schreiben – Eine Frage mit Antworten eintippen.“
  - „Aus Material erstellen – Skript hochladen, deine KI schreibt Vorschläge, du prüfst sie vor dem Übernehmen.“
  - „Aus einer Tabelle übernehmen – Eine CSV-Datei mit vielen Fragen auf einmal einlesen.“
- [ ] Ist im Baum ein Thema gewählt, ist es in allen drei Wegen schon eingetragen.
- [ ] Der Tabellen-**Export** steht im `⋯`-Menü des Seitenkopfs als „Alle Fragen als Tabelle herunterladen“. Neben der Hauptaktion stehen keine großen Knöpfe für Export und Import mehr (B44).
- [ ] Nirgends steht ein Dialog in einem Dialog. Der Auswahl-Dialog wird durch den gewählten Weg ersetzt, und „Zurück“ führt wieder zur Auswahl.

### Weg 1: Selbst schreiben (B42, B43)
- [ ] Das Formular beginnt mit **„Fach und Thema“** als erstem Feld. Es ist **ein** Auswahlfeld, gruppiert nach Fach, und zeigt nur Fächer des gewählten Bereichs. Eine Mehrfachauswahl gibt es nicht.
- [ ] Ein Thema ist **Pflicht**. Ohne Thema sagt die Meldung am Feld: „Bitte wähle ein Thema. So finden Azubis die Frage im richtigen Lernpfad.“
- [ ] Die **Stufe ergibt sich aus dem Thema** und wird als Hinweis angezeigt („Stufe 10, aus dem Thema“). Ein eigenes Feld „Stufe: Alle“ gibt es nicht mehr.
- [ ] Danach folgen Schwierigkeit (`AdminSegmented` Leicht · Mittel · Schwer), Fragetyp (Auswahl · Freitext), Fragetext, Antworten mit Markierung der richtigen, die Erklärung (freiwillig) und „Für Azubis sichtbar“ (an).
- [ ] Der Satz „Antworten werden vollständig ersetzt“ entfällt (B43). Beim Bearbeiten einer bestehenden Frage sieht man einfach die aktuellen Antworten und ändert sie.
- [ ] Das Formular ist dasselbe für „Neue Frage“ und „Frage bearbeiten“. Es gilt also auch für Bearbeiten aus den Reitern „Fragen“, „Gemeldet“ und „Schwierig“.
- [ ] Speichern meldet per Toast „Frage gespeichert“. Die neue Frage erscheint im gewählten Thema, ohne dass die Seite neu lädt.
- [ ] Prüft der Torwächter (PROJ-16) und findet etwas, steht der Hinweis in Alltagssprache am Formular. Speichern bleibt möglich, wo das heute so ist.

### Weg 2: Aus Material erstellen (B47, B48, E2)
- [ ] Eine Schrittleiste mit drei Schritten: **Material wählen · Mit deiner KI · Vorschau**.
- [ ] **Schritt 1 – Material wählen:** „In welches Thema?“ (Pflicht, wie in Weg 1), Datei-Feld für PDF, Word (.docx) oder PowerPoint (.pptx), dazu die Wahl „Wie viele Vorschläge?“ (`AdminSegmented` 5 · 10 · 15 · 20). Nach dem Hochladen erscheint der Dateiname mit Haken. Kann die App aus der Datei Text lesen, ist „Weiter“ aktiv.
- [ ] **Schritt 2 – Mit deiner KI:** drei nummerierte Schritte.
  1. „Auftrag kopieren“: ein Knopf, der Toast meldet „Kopiert“.
  2. „In deiner KI einfügen“, mit einem Satz dazu: „zum Beispiel ChatGPT, Claude.ai oder die KI deiner Schule, kostenlos mit deinem eigenen Zugang“.
  3. „Antwort hier einfügen“, mit einem großen Feld „Antwort der KI“.
- [ ] Der Auftrag enthält schon Thema, Stufe, Bereich, die Hinweise des Bereichs (PROJ-22), die Zahl der Vorschläge und den Text des Skripts. **Die Lehrkraft muss im Auftrag nichts ändern.** Der Auftrag lässt sich über „Auftrag ansehen“ aufklappen, ist aber zunächst zugeklappt. So gibt es keine Scrollfalle in einem langen Textkasten (B47).
- [ ] Auf dem ganzen Weg stehen nicht die Wörter „Prompt“, „JSON“, „API-Key“, „Methode 1/2“ oder ein Code-Beispiel. Ein Wächter-Test prüft das, wie `begriffe.test.ts`.
- [ ] **Schritt 3 – Vorschau (B48):** Oben steht der Hinweis „**Noch nicht für Azubis sichtbar.** Wähle, welche Fragen du übernehmen möchtest. Ins Thema: LOP › Lagerlogistik.“ Darunter steht jede erkannte Frage als Karte mit Kästchen (vorab angehakt), Fragetext und richtiger Antwort. Aufklappen zeigt alle Antworten und die Erklärung.
- [ ] Jede Karte lässt sich in der Vorschau **bearbeiten** (dasselbe Formular wie Weg 1, ohne den Dialog zu verlassen) oder abwählen.
- [ ] Zeilen, die der Import-Check (PROJ-38) oder der Torwächter (PROJ-16) bemängelt, sind markiert und zeigen den Grund in einem Satz. Sie sind **nicht** vorab angehakt. Gibt es solche Zeilen, bietet die App „Auftrag zum Verbessern kopieren“ an (heutiger Fix-Auftrag).
- [ ] Der Knopf heißt „N Fragen übernehmen“ und nennt die Zahl der angehakten Fragen. Er ist bei 0 deaktiviert. Erst nach dem Klick werden die Fragen gespeichert und für Azubis sichtbar.
- [ ] Danach schließt sich der Dialog. Der Baum springt auf das Thema, und ein Toast meldet „12 Fragen in „Lagerlogistik“ übernommen“. Die Übernahme steht im Änderungsprotokoll, mit Herkunft „aus Material“ und Dateiname.
- [ ] Der alte bezahlte Weg mit eigenem API-Schlüssel („Methode 2“) erscheint nicht mehr in der Oberfläche. Die Hinweise auf `ANTHROPIC_API_KEY` entfallen. Ob der Code dahinter bleibt, klärt /architecture (siehe offene Fragen).

### Weg 3: Aus einer Tabelle übernehmen
- [ ] Eine Schrittleiste mit zwei Schritten: **Datei wählen · Vorschau**.
- [ ] Schritt 1: „In welches Thema?“, falls die Tabelle keine Themen-Spalte hat, dazu das Datei-Feld (.csv). Ein Satz erklärt die Spalten, und es gibt den Link „Beispiel-Tabelle herunterladen“.
- [ ] Schritt 2: dieselbe Vorschau wie bei Weg 2. Fehlerhafte Zeilen sind markiert, mit Grund und Zeilennummer, zum Beispiel: „Zeile 7: Es fehlt die richtige Antwort“. Danach kommt „N Fragen übernehmen“.
- [ ] Auch aus der Tabelle wird nichts sichtbar, bevor die Lehrkraft übernimmt.

### Alte Seite und Übergang (E3)
- [ ] Nach dem Livegang leitet `/admin/ai-generator` auf „Lerninhalte“ weiter und öffnet „Fragen hinzufügen → Aus Material“.
- [ ] Der Übergangseintrag „Fragen aus Material“ im `⋯`-Menü der Seite „Lerninhalte“ (aus PROJ-131) entfällt.

### Darstellung
- [ ] Am Handy ist der Dialog ein Vollbild mit fester Fußzeile („Zurück“, Hauptaktion). Die Schrittleiste passt auf 360 px.
- [ ] Bedienelemente mindestens 44 × 44 px, nur `ws-*`-Farben, Toasts für Erfolg, verständliche Fehlersätze ohne Technik.

## Edge Cases
- **Gescanntes PDF ohne Text:** „In dieser Datei steht kein lesbarer Text, sie ist vermutlich eingescannt. Nimm eine Datei, in der man Text markieren kann.“ „Weiter“ bleibt deaktiviert.
- **Skript zu lang für einen Auftrag:** Die App kürzt nicht stillschweigend. Sie sagt, wie viel hineinpasst, und lässt einen Teil wählen (zum Beispiel einen Seitenbereich oder ein Kapitel), oder sie teilt den Auftrag in Teile, wie die Werkzeugkiste (PROJ-69). Was davon, entscheidet /architecture.
- **Falsche Dateiart oder zu große Datei:** Sofortiger Hinweis am Feld mit erlaubten Arten und Höchstgröße. Es wird nichts hochgeladen.
- **Antwort der KI unvollständig oder im falschen Format:** „Die Antwort enthält keine Fragen, die wir lesen können. Kopiere bitte die **ganze** Antwort der KI.“ Ist die Antwort abgeschnitten, übernimmt die App die lesbaren Fragen, nennt die Zahl und rät zum erneuten Versuch.
- **KI liefert mehr oder weniger Fragen als bestellt:** Die Vorschau zeigt alle erkannten Fragen und nennt die Abweichung („Bestellt: 10, erhalten: 8“).
- **Doppelte Frage (gleicher Text existiert im Thema schon):** In der Vorschau steht „Gibt es schon in diesem Thema“. Die Frage ist nicht angehakt, ein Übernehmen bleibt aber möglich.
- **Dialog versehentlich geschlossen in Schritt 2 oder 3:** Die App fragt nach: „Fragen verwerfen? Die Antwort der KI geht verloren.“ Ein Entwurf wird nicht gespeichert.
- **Thema wird während des Ablaufs von jemand anderem gelöscht:** Beim Übernehmen sagt die App „Das Thema gibt es nicht mehr. Bitte wähle ein anderes.“ Die Vorschau bleibt erhalten.
- **Bereich wird während des Dialogs umgeschaltet:** Der Dialog bleibt beim Bereich, in dem er geöffnet wurde, und nennt ihn im Kopf.
- **Freitext-Fragen in der Antwort der KI oder in der Tabelle:** Sie werden als Freitext erkannt und ebenso in der Vorschau gezeigt.

## Offene Fragen für /architecture
- Wo wird der Text aus PDF, Word und PowerPoint gelesen: im Python-Kern der Werkzeugkiste oder in der App? Speicherlimit der Vercel-Funktionen beachten ([Memory: Vercel Function Storage]).
- Was passiert mit dem bezahlten Weg (Entwürfe, Jobs aus PROJ-10): ausblenden, abschalten oder entfernen? Vorschlag: nur ausblenden, weil PROJ-64 pausiert ist.
- Bleibt das Format der Antwort der KI wie heute (Zeilen aus PROJ-38), oder wird es lesbarer („Frage: … Richtig: … Falsch: …“ wie in der Vorschau)? Für die Lehrkraft unsichtbar, aber wichtig für die Fehlertoleranz.

## Technical Requirements
- Kostenlos: keine bezahlte KI, kein API-Schlüssel nötig.
- Hochgeladene Dateien werden nur zum Auslesen genutzt und nicht dauerhaft gespeichert, außer /architecture begründet etwas anderes.
- Rechte wie PROJ-70 (alle Lehrkräfte, alles protokolliert). Neue APIs kommen in die Freigabelisten (`roles.ts`).
- Kein Dev-Server und kein Playwright lokal. Geprüft wird mit Unit-Tests (Einlesen der Antwort und der Tabelle mit Beispieldateien), Build und einem Browser-Blick nach dem Deploy.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Stand:** 2026-11-27 · **Backend nötig:** ja, aber klein. Es gibt **keine neue Tabelle** und **keinen neuen Dienst**. Vorschläge liegen nur im Browser, bis die Lehrkraft „Übernehmen“ klickt.

### Was es schon gibt (und was wir weiterverwenden)
| Baustein | Herkunft | Wird zu |
|---|---|---|
| Datei → Text (PDF, Word) | PROJ-38 (`assessments/questions/material`) | Gemeinsamer Leser, dazu PowerPoint |
| Auftrag für die KI zusammenbauen, Antwort der KI einlesen, Duplikat- und Qualitätsprüfung | PROJ-38 (`assessment-import`, Vorschau-Schnittstelle) | Kern von Weg 2 |
| Torwächter, „Auftrag zum Verbessern“ | PROJ-16 / PROJ-9 (`question-import`) | Markierung in der Vorschau |
| Hinweise des Bereichs im Auftrag | PROJ-22 (`question-prompt`) | Bleibt Teil des Auftrags |
| Formular „Neue Frage / Frage bearbeiten“ | `question-form-modal` | Wird umgebaut (Weg 1) und in der Vorschau wiederverwendet |
| CSV lesen und Export | `csv-import-dialog`, `questions/export` | Weg 3 und Menüpunkt im `⋯`-Menü |
| Stapel-Protokoll („12 Fragen in einem Vorgang“) | PROJ-47 (`groupIntoBatch`) | Eintrag „aus Material“ bzw. „aus Tabelle“ |

### A) Aufbau der Oberfläche
```
Lerninhalte (PROJ-131)
+-- Seitenkopf
|   +-- [Fragen hinzufügen]  (grün, einzige Hauptaktion)
|   +-- ⋯-Menü: „Alle Fragen als Tabelle herunterladen“  (Knopf „Fragen aus Material“ entfällt)
|
+-- Dialog „Fragen hinzufügen“  (EIN Dialog, der Inhalt wechselt je Schritt; nie Dialog im Dialog)
    +-- Auswahl: „Wie möchtest du Fragen hinzufügen?“
    |   +-- Karte „Selbst schreiben“
    |   +-- Karte „Aus Material erstellen“
    |   +-- Karte „Aus einer Tabelle übernehmen“
    |
    +-- Weg 1: Selbst schreiben
    |   +-- Formular (Fach und Thema · Schwierigkeit · Fragetyp · Text · Antworten · Erklärung · Sichtbar)
    |
    +-- Weg 2: Aus Material erstellen   (Schrittleiste: Material wählen · Mit deiner KI · Vorschau)
    |   +-- Schritt 1: Thema, Datei, „Wie viele Vorschläge?“ (5 · 10 · 15 · 20)
    |   +-- Schritt 2: 1 Auftrag kopieren · 2 In deiner KI einfügen · 3 Antwort einfügen
    |   |             („Auftrag ansehen“ zugeklappt; bei langem Skript: Auswahl „Teil 1 · 2 · 3“)
    |   +-- Schritt 3: Vorschau
    |
    +-- Weg 3: Aus einer Tabelle übernehmen   (Schrittleiste: Datei wählen · Vorschau)
    |   +-- Schritt 1: Thema (falls die Tabelle keins nennt), Datei, „Beispiel-Tabelle herunterladen“
    |   +-- Schritt 2: Vorschau (dieselbe wie Weg 2)
    |
    +-- Gemeinsame Vorschau  (Weg 2 und 3)
    |   +-- Hinweis „Noch nicht für Azubis sichtbar … Ins Thema: LOP › Lagerlogistik“
    |   +-- Karten mit Kästchen: Frage, richtige Antwort, aufklappbar, „Bearbeiten“
    |   +-- Markierte Karten (Grund in einem Satz, nicht vorangehakt)
    |   +-- Fußzeile: „Zurück“ · „N Fragen übernehmen“
    |
    +-- Rückfrage beim Schließen: „Fragen verwerfen? Die Antwort der KI geht verloren.“
```
Am Handy ist derselbe Dialog ein Vollbild mit fester Fußzeile. Es gibt nur **eine** Vorschau-Komponente für Weg 2 und Weg 3, damit sich beide gleich anfühlen und nur einmal getestet werden müssen.

### B) Daten (in Alltagssprache)
- **Eine Frage in der Vorschau** hat: Fragetext, Fragetyp (Auswahl oder Freitext), Antworten mit der richtigen oder bei Freitext eine Musterantwort, Erklärung, Schwierigkeit und Stufe. Dazu kommen die Prüfergebnisse: Fehler, Hinweise des Torwächters und „Gibt es schon in diesem Thema“.
- **Wo liegt das?** Nur im Browser, solange der Dialog offen ist. Es gibt **keine Entwürfe in der Datenbank**. Schließt jemand den Dialog, fragt die App nach und verwirft dann alles. Das ist gewollt: Azubis können eine Vorschau nie sehen, weil sie gar nicht gespeichert ist.
- **Beim Übernehmen** werden alle angehakten Fragen in **einem Vorgang** gespeichert (alle oder keine). Jede Frage bekommt ihre Version wie heute, das Änderungsprotokoll bündelt sie als einen Eintrag: „12 Fragen aus Material ‚skript.pdf‘ übernommen“ bzw. „… aus Tabelle ‚fragen.csv‘ …“. Das ist die Herkunft aus den Kriterien.
- **Hochgeladene Dateien** werden gelesen und sofort vergessen. Gespeichert wird nichts, auch nicht der Text.
- **Das Format der KI-Antwort** bleibt wie in PROJ-38. Die Lehrkraft sieht es nie. Es wird nur um den Fragetyp Freitext erweitert (Musterantwort statt fünf Antworten).
- **Die Tabelle** bekommt zwei freiwillige Spalten: Fragetyp und Musterantwort. Alte Tabellen ohne diese Spalten laufen unverändert weiter.

### C) Entscheidungen zu den offenen Fragen
1. **Wo wird der Text aus PDF, Word und PowerPoint gelesen?** In der App selbst, im vorhandenen Leser. PDF und Word kann er schon. **PowerPoint** kommt dazu (eine .pptx ist ein Archiv aus Folien-Dateien, das wir mit dem schon installierten Paket `fflate` öffnen und deren Text sammeln). *Warum nicht der Python-Kern der Werkzeugkiste?* Er ist ein eigener Dienst. Ein zusätzlicher Dienst brächte Wartung, eine weitere Fehlerquelle und das Speicherlimit der Vercel-Funktionen mit, obwohl der Leser in der App längst läuft. Dateien bis **4 MB**, weil Vercel nicht mehr als 4,5 MB pro Aufruf annimmt. Größere Dateien bekommen den Hinweis, den Text direkt einzufügen (das gibt es heute schon).
2. **Zu langes Skript:** Die App kürzt **nie** stillschweigend. Ein Auftrag fasst höchstens rund 30.000 Zeichen (heutige Grenze). Ist das Skript länger, teilt die App es an Absatzgrenzen in **Teile** und sagt es offen: „Dein Skript ist lang. Wir teilen es in 3 Teile. Du kopierst nacheinander 3 Aufträge.“ In Schritt 2 wählt man „Teil 1 · Teil 2 · Teil 3“, jeder Teil hat seinen eigenen Auftrag und sein eigenes Antwortfeld. Die Vorschau sammelt die Fragen aller Teile. „Wie viele Vorschläge?“ gilt **je Teil**. So sieht die Lehrkraft nie ein halbes Skript. Das ist das Muster aus PROJ-69.
3. **Der bezahlte Weg (PROJ-10, „Methode 2“):** Nur **aus der Oberfläche nehmen**. Der Code und die Tabellen bleiben, weil PROJ-64 pausiert ist und ein Zurückholen billiger ist als ein Neubau. Die Seite `/admin/ai-generator` wird zur Weiterleitung (E3). Beim Bauen wird gezählt, ob noch offene Entwürfe aus früheren Läufen in der Datenbank liegen. Wenn ja, melden wir das, statt sie unsichtbar zu lassen.
4. **Format der KI-Antwort:** Es bleibt das bewährte Format aus PROJ-38. Es verträgt schon Eigenheiten der Chat-Programme (Markdown-Zeichen, Text vor und nach der Antwort, abgeschnittene Antworten). Ein „lesbareres“ Format würde das neu erfinden, ohne dass die Lehrkraft etwas davon merkt.

### D) Wichtige Abweichung von der Spec: die Stufe
Die Spec sagt „Die Stufe ergibt sich aus dem Thema“. **Themen haben in der Datenbank keine eigene Stufe.** Die Stufe hängt an der einzelnen Frage, und der Baum zeigt sie nur als Zählung. Wir lösen das so, ohne die Datenbank umzubauen:
- Hat das Thema schon Fragen, schlägt die App die **häufigste Stufe** der vorhandenen Fragen vor und zeigt „Stufe 10, wie die anderen Fragen im Thema“.
- Hat das Thema noch keine Fragen oder gemischte Stufen, steht **eine** Auswahl 10 · 11 · 12 (nur Stufen des Bereichs) direkt unter „Fach und Thema“. Ein „Alle“ gibt es nicht mehr.
Damit erreicht das Kriterium sein Ziel (keine Frage ohne Stufe, kein Feld „Alle“), und niemand muss Themen nachpflegen. Eine echte Stufe am Thema wäre ein größerer Umbau und gehört nicht in dieses Feature.

### E) Neue und geänderte Schnittstellen (kurz)
| Zweck | Art |
|---|---|
| Text aus Datei lesen (jetzt auch PowerPoint) | vorhanden, erweitert |
| Auftrag für die KI bauen (mit Thema, Stufe, Bereichshinweisen, Zahl, Skripttext, Teilen) | **neu**, baut auf dem Auftrag-Baustein von PROJ-38 und PROJ-22 auf |
| Antwort der KI oder Tabellenzeilen einlesen und prüfen (Fehler, Torwächter, Duplikate im Thema) | **neu**, ein Weg für beide |
| Angehakte Fragen übernehmen (alle oder keine, Protokoll mit Herkunft und Dateiname, prüft Thema und Bereich noch einmal) | **neu** |
| Frage anlegen/ändern (Weg 1) | vorhanden, bekommt den Fragetyp und die Stufe wie oben |
| Alter Tabellen-Import | wird ersetzt und nach dem Umzug entfernt, wenn ihn nichts anderes nutzt |
Alle neuen Routen kommen in die Freigabelisten (`roles.ts`). Rechte wie PROJ-70: alle Lehrkräfte, im Bereich, den sie bearbeiten dürfen, alles protokolliert. Beim Übernehmen wird das Thema gegen den Bereich geprüft (Schutz vor einem fremden Thema in der Anfrage) und die Zahl der Fragen begrenzt.

### F) Reihenfolge beim Bauen
1. **Backend zuerst (klein):** PowerPoint-Leser, Auftrag-Bau mit Teilen, Einlesen und Prüfen, Übernehmen mit Protokoll, Tabellenspalten für Freitext. Alles mit Unit-Tests auf Beispieldateien.
2. **Frontend:** Dialog mit Auswahl und Schrittleiste, gemeinsame Vorschau, Formular-Umbau, Menü und Weiterleitung, Wörterwächter-Test.
(Die Skills laufen laut Anweisung trotzdem in der Reihenfolge Frontend → Backend. Wir bauen die Backend-Teile zuerst, weil die Oberfläche auf ihnen aufsetzt. Das ist nur eine Abfolge der Arbeit, kein Konflikt.)

### G) Wörter und Wächter
Auf dem ganzen Weg fehlen Prompt, JSON, API-Key, „Methode 1/2“ und Code-Beispiele. Ein Wächter-Test (wie `begriffe.test.ts`) liest die neuen Dateien und schlägt fehl, wenn ein solches Wort auftaucht. Wörter: „Auftrag für die KI“, „Antwort der KI“, „Vorschau“, „Übernehmen“.

### H) Risiken
| Risiko | Gegenmaßnahme |
|---|---|
| Sehr große Antwort der KI | Obergrenze für Zeichen und Fragen je Übernahme, klare Meldung |
| Dialog im Dialog durch das wiederverwendete Formular | Das Formular wird in den Dialoginhalt eingebettet, nicht als eigener Dialog geöffnet |
| Alte Lesezeichen `/admin/ai-generator` | Weiterleitung mit Absicht auf „Fragen hinzufügen → Aus Material“ |
| Unvollständige KI-Antwort | Lesbare Fragen werden übernommen, die Zahl genannt, der Rest als Hinweis |
| PowerPoint mit Bildern statt Text | Meldung wie bei gescanntem PDF: „kein lesbarer Text“ |

### I) Pakete
Keine neuen. Genutzt werden `fflate` (PowerPoint öffnen), `papaparse` (Tabelle lesen), `mammoth` und `pdf-parse` (vorhanden).

### Offen für Sie (nur wenn Sie etwas anders wollen)
- Abweichung D (Stufe aus den vorhandenen Fragen statt aus einem Thema-Feld).
- Entscheidung C3 (bezahlten Weg nur ausblenden, nicht löschen).
- Entscheidung C2 (lange Skripte in Teile teilen statt Abschnitt wählen).

## Implementation Notes (2026-11-27)

**Gebaut (Backend zuerst, dann Frontend):**
- **PowerPoint-Leser** `src/lib/material-pptx.ts` (mit `fflate`), eingehängt in den gemeinsamen Dateileser; `.pptx` wird als Dateiart erkannt.
- **Logik** `src/lib/question-intake.ts` (reine Funktionen, vom Server und vom Browser genutzt): Skript in Teile teilen, Auftrag bauen, Antwort der KI einlesen (verträgt Text drumherum, Formatierungszeichen und abgeschnittene Antworten), Tabelle einlesen (neue Spalten `typ`, `musterantwort`, `fach_code`, `thema`), Fragen prüfen (Aufbau, Torwächter, Duplikate), Stufe vorschlagen, Verbesserungsauftrag, Protokolltext.
- **Schnittstellen** unter `/api/admin/questions/intake/`: `material` (Datei lesen und teilen), `prompt` (Auftrag), `preview` (einlesen und prüfen, legt nichts an), `accept` (übernehmen: alle oder keine, prüft Thema/Bereich/Stufe/Torwächter erneut, ein Protokolleintrag `question.intake` mit Herkunft und Dateiname, sonst Rücknahme). Die Freigabe kommt über das bestehende Präfix `/api/admin/questions` (keine Änderung an `roles.ts` nötig).
- **Oberfläche:** `AddQuestionsDialog` (Auswahl, drei Wege, Schrittleiste, Vollbild am Handy, Rückfrage beim Schließen), `IntakeMaterialFlow`, `IntakeTableFlow`, gemeinsame `IntakePreview` (Karten mit Kästchen, Aufklappen, Bearbeiten, „Auftrag zum Verbessern kopieren“, „N Fragen übernehmen“), `FachThemaSelect` (ein Feld, nach Fach gruppiert), gemeinsame `QuestionFields` (Formular und Karten zeigen dieselben Felder).
- **Formular „Frage schreiben/bearbeiten“** umgebaut: „Fach und Thema“ zuerst, Thema Pflicht, Stufe als Hinweis („Stufe 10, aus dem Thema“) mit „Ändern“, Schwierigkeit und Fragetyp als Segmente, Schalter „Für Azubis sichtbar“ (neu: `is_active` beim Anlegen), Toast „Frage gespeichert“, der Satz „Antworten werden vollständig ersetzt“ ist weg.
- **Seite „Lerninhalte“:** „Fragen hinzufügen“ öffnet den neuen Dialog; im `⋯`-Menü steht „Alle Fragen als Tabelle herunterladen“, der Import-Eintrag und „Fragen aus Material“ sind entfernt. Nach dem Übernehmen springt der Baum auf das Thema.
- **Alte Seite:** `/admin/ai-generator` leitet auf `/admin/inhalte?hinzufuegen=material` und öffnet den Weg „Aus Material“. Entfernt: die alte Seite, `csv-import-dialog` und die vier Entwurfs-Komponenten des bezahlten Wegs. Die bezahlten Schnittstellen und Tabellen bleiben (PROJ-64 pausiert). In der Datenbank liegen keine Entwürfe (`questions_draft` ist leer).
- **Wächter:** `fragen-hinzufuegen-woerter.test.ts` (keine Fachwörter in sichtbaren Texten) und ein Rendertest über alle Bildschirme.
- Tests: 370 Dateien, 4.925 grün; Build sauber.

**Abweichungen von der Spec (bewusst):**
1. **Stufe:** Themen haben in der Datenbank keine Stufe. Die Stufe wird aus den vorhandenen Fragen des Themas abgeleitet (Formular: genau eine Stufe im Thema; Vorschau: klar häufigste Stufe, mindestens 60 %). Sonst wählt die Lehrkraft aus den Stufen des Bereichs. Ein „Alle Stufen“ gibt es nicht mehr.
2. **Bestehende Fragen ohne Thema oder Stufe** bleiben beim Bearbeiten ohne beides speicherbar (Pflicht gilt nur für neue Fragen), sonst ließen sich solche Fragen aus der Meldungs-Inbox nicht mehr korrigieren.
3. **Tabellen mit unbekanntem Thema:** Die Zeile wird markiert („Das Thema … gibt es im Fach … nicht“), statt das Thema stillschweigend anzulegen wie der alte Import.
4. **Alle Bereiche (Super-Admin):** Für Tabellen mit eigener Fach- und Themen-Spalte braucht der Server einen festen Bereich. Es gibt dafür noch keine Auswahl im Dialog (bei fest gewähltem Bereich geht es).
5. Der alte Tabellen-Import `questions/bulk-import` bleibt als Schnittstelle bestehen, wird aber von der Oberfläche nicht mehr genutzt.

**Für /qa besonders prüfen:** PowerPoint- und Word-Dateien mit echten Skripten, sehr lange Skripte (Teile), abgeschnittene Antworten der KI, Übernehmen mit Protokolleintrag und Rücknahme, Dialog am Handy (360 px, feste Fußzeile), Rechte in fremdem Bereich, das Formular beim Bearbeiten aus „Gemeldet“ und „Schwierig“.

## QA Test Results

**Tested:** 2026-11-27
**App URL:** kein Dev-Server (laut Technical Requirements). Geprüft wurde per Code-Review, mit Unit-/Rendertests, Build und Lint. Der Browser-Blick folgt nach dem Deploy.
**Tester:** QA Engineer (AI)
**Stand:** Branch mit `7cbecfc` (Frontend) und `e154d2c` (Backend)

### Automatische Prüfungen
- `npm test`: 371 Dateien, 4.941 Tests grün (davon 16 neue QA-Tests in `src/lib/question-intake-qa.test.ts`)
- `npm run build`: sauber
- ESLint (geänderte Dateien): 0 Fehler, 1 Warnung (BUG-10)
- E2E: keine neue Playwright-Datei. Der Ablauf braucht ein Lehrkraft-Konto und einen Dev-Server, beides gibt es hier nicht (wie bei PROJ-120 bis PROJ-131).

### Acceptance Criteria Status

#### Einstieg
- [x] Grüner Knopf „Fragen hinzufügen“ öffnet die Auswahl „Wie möchtest du Fragen hinzufügen?“ mit drei Flächen und den Sätzen aus der Spec
- [x] Ein im Baum gewähltes Thema ist in allen drei Wegen eingetragen (`defaults.topicId` → `initialTopicId`)
- [x] Im `⋯`-Menü steht „Alle Fragen als Tabelle herunterladen“. Import-Knopf und „Fragen aus Material“ sind entfernt.
- [x] Kein Dialog im Dialog: Der Inhalt wechselt, „Zurück“ führt zur Auswahl. Nur die Rückfrage „verwerfen?“ ist ein AlertDialog, wie in der Spec gewollt.

#### Weg 1: Selbst schreiben
- [x] „Fach und Thema“ steht zuerst, als ein Feld, gruppiert, nur Themen des Bereichs, ohne Mehrfachauswahl
- [x] Thema ist Pflicht, mit dem Satz aus der Spec (bestehende Fragen ohne Thema bleiben speicherbar, Abweichung 2)
- [x] Die Stufe steht als Hinweis „Stufe 10, aus dem Thema“ mit „Ändern“, ein Feld „Alle“ gibt es nicht (Abweichung D, abgeleitet aus den Fragen des Themas)
- [x] Schwierigkeit und Fragetyp als Segmente, dann Text, Antworten, Erklärung und „Für Azubis sichtbar“ (an, wird beim Anlegen mitgeschickt)
- [x] Der Satz „Antworten werden vollständig ersetzt“ ist weg
- [x] Dasselbe Formular für Neu und Bearbeiten, auch in „Gemeldet“ (`QuestionFormBody`) und „Schwierig“
- [x] Toast „Frage gespeichert“, die Liste lädt ohne Seiten-Reload neu. Eine Einschränkung beschreibt BUG-8.
- [x] Torwächter-Hinweis „wo das heute so ist“: Das Einzelformular hatte nie eine Torwächter-Prüfung und hat auch jetzt keine. Das Kriterium greift hier nicht.

#### Weg 2: Aus Material erstellen
- [x] Schrittleiste mit drei Schritten: Material wählen · Mit deiner KI · Vorschau
- [x] Schritt 1: Thema (Pflicht), Datei (PDF/DOCX/PPTX), Wahl 5 · 10 · 15 · 20, Dateiname mit Haken, „Weiter“ erst nach erfolgreichem Lesen
- [x] Schritt 2: drei nummerierte Schritte, Toast „Kopiert“, Satz zu ChatGPT/Claude.ai/KI der Schule, großes Feld „Antwort der KI“
- [ ] Der Auftrag enthält Thema, Stufe, Bereich (Rolle und Zielgruppe), Bereichshinweise, Zahl und Text und ist zugeklappt. **Aber:** Nach einer Änderung der Zahl bleibt der alte Auftrag stehen (BUG-2).
- [x] Wächter-Test gegen Prompt, JSON, API-Key und Methode 1/2 in den sichtbaren Texten (`fragen-hinzufuegen-woerter.test.ts`). Hinweis dazu in BUG-4.
- [x] Schritt 3: Hinweis „Noch nicht für Azubis sichtbar … Ins Thema: LOP › Lagerlogistik“, Karten mit Kästchen, Fragetext, richtiger Antwort und Aufklappen
- [x] Jede Karte lässt sich in der Vorschau bearbeiten (`QuestionFields`, ohne neuen Dialog) und abwählen
- [x] Bemängelte Zeilen sind markiert, mit Grund, nicht angehakt. „Auftrag zum Verbessern kopieren“ ist da.
- [x] „N Fragen übernehmen“ nennt die Zahl, ist bei 0 deaktiviert und speichert erst beim Klick, alle oder keine, mit Rücknahme bei Fehlern
- [x] Danach schließt der Dialog, der Baum springt aufs Thema, Toast „12 Fragen in „Lagerlogistik“ übernommen“. Protokoll `question.intake` mit Herkunft und Dateiname, gebündelt per `groupIntoBatch`.
- [x] Der bezahlte Weg und `ANTHROPIC_API_KEY`-Hinweise sind aus der Oberfläche verschwunden, die Schnittstellen bleiben (C3)

#### Weg 3: Aus einer Tabelle übernehmen
- [x] Schrittleiste mit zwei Schritten: Datei wählen · Vorschau
- [x] Thema (falls die Tabelle keins nennt), CSV-Feld, Erklärsatz zu den Spalten, „Beispiel-Tabelle herunterladen“
- [x] Dieselbe Vorschau, Fehler mit „Zeile N: …“, dann „N Fragen übernehmen“ (siehe BUG-9 zur Zeilennummer)
- [x] Vor dem Übernehmen wird nichts gespeichert: Die Vorschau-Route legt nichts an

#### Alte Seite und Übergang
- [x] `/admin/ai-generator` leitet auf `/admin/inhalte?hinzufuegen=material` weiter und öffnet den Weg „Aus Material“. Der Parameter wird danach entfernt.
- [x] Der Übergangseintrag „Fragen aus Material“ im `⋯`-Menü ist entfernt

#### Darstellung
- [x] Am Handy Vollbild (`max-sm:h-dvh … rounded-none`) mit fester Fußzeile. Die Schrittleiste nutzt `flex-1` und `text-xs` und sollte auf 360 px passen (im Browser nach dem Deploy bestätigen).
- [x] Bedienelemente `min-h-11`, nur `ws-*`-Farben, getönte Flächen ≤ /15, Erfolg per Toast, Fehlersätze ohne Technik

### Edge Cases Status
- [x] Gescanntes PDF oder PowerPoint ohne Text: Satz aus der Spec, „Weiter“ bleibt aus
- [x] Zu langes Skript: offene Teilung in Teile (C2), getestet ohne Verlust (QA-Test „nichts geht verloren“)
- [x] Falsche Dateiart oder zu große Datei: Hinweis im Browser vor dem Hochladen, dazu eine zweite Prüfung auf dem Server
- [x] Unvollständige oder kaputte Antwort der KI: Satz aus der Spec. Bei abgeschnittener Antwort kommen die lesbaren Fragen mit Zahl und Hinweis.
- [x] Mehr oder weniger Fragen als bestellt: „Bestellt: 10, erhalten: 8“ (BUG-2 kann die Zahl verfälschen)
- [x] Doppelte Frage: „Gibt es schon in diesem Thema.“, nicht angehakt, aber übernehmbar
- [x] Dialog in Schritt 2/3 schließen: Rückfrage „Fragen verwerfen? Die Antwort der KI geht verloren.“ (Lücke beim Zurückgehen: BUG-6)
- [x] Thema inzwischen gelöscht: 404 „Das Thema gibt es nicht mehr. Bitte wähle ein anderes.“, die Vorschau bleibt
- [ ] Bereich wird während des Dialogs umgeschaltet: Der Dialog nennt den Bereich nicht im Kopf (BUG-3)
- [x] Freitext in Antwort und Tabelle wird erkannt und gezeigt

### Security Audit Results
- [x] Authentifizierung: Alle vier Routen beginnen mit `requireContentAdmin()`. Die Freigabe läuft über das Präfix `/api/admin/questions`.
- [x] Autorisierung: `guardTopics` prüft jedes Thema gegen den Bereich der Person (`assertCanAdminDepartmentContent`). Ein fremdes Thema wird wie ein fehlendes behandelt (404), es verrät also nicht, dass es existiert. Auch inaktive Bereiche werden abgelehnt.
- [x] Eingaben: Zod an jeder Route, Längen-, Zahl- und Stufengrenzen. Übernehmen prüft alles noch einmal auf dem Server und vertraut nicht der Vorschau.
- [x] XSS: Fragetexte und Dateinamen werden nur als React-Text gezeigt, nie als HTML
- [x] Protokoll lückenlos: `writeAuditLogStrict`, bei einem Fehler wird alles zurückgenommen
- [x] Keine Speicherung der Datei und ihres Textes, kein KI-Aufruf, keine Geheimnisse im Browser
- [ ] **PowerPoint-ZIP-Bombe (BUG-1):** Die Größe ist nur je Folie begrenzt, nicht für alle Folien zusammen
- [ ] Hinweis: Die Intake-Routen haben keine Ratenbegrenzung. Das ist wie bei den übrigen Admin-Routen und nur für angemeldete Lehrkräfte erreichbar. Kein eigener Bug, wird mit BUG-1 aber wichtiger.

### Bugs Found

#### BUG-1: PowerPoint-Leser ohne Gesamtgrenze, der Speicher läuft voll (ZIP-Bombe)
- **Severity:** Medium (Sicherheit/Verfügbarkeit, nur für angemeldete Lehrkräfte)
- **Steps to Reproduce:**
  1. Eine .pptx bauen mit 150 Folien zu je knapp 5 MB Leerzeichen. Gepackt ist sie 0,8 MB groß.
  2. Bei „Aus Material erstellen“ hochladen (`/api/admin/questions/intake/material`)
  3. Expected: Die Datei wird abgelehnt, sobald der entpackte Inhalt eine Gesamtgrenze überschreitet (zum Beispiel 50 MB)
  4. Actual: `readPptxText` entpackt alles. Gemessen: **+750 MB Speicher**, 2,6 s. Bei knapp 4 MB und 500 Folien wären es rund 2,5 GB, die Vercel-Funktion stürzt ab. `MAX_SLIDES` greift erst nach dem Entpacken.
- **Ort:** `src/lib/material-pptx.ts` (Filter nur `file.originalSize <= MAX_SLIDE_BYTES`)
- **Priority:** Fix before deployment (Summe im Filter mitzählen und Folienzahl schon im Filter begrenzen)

#### BUG-2: Neue Zahl der Vorschläge ändert den schon erstellten Auftrag nicht
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Aus Material: Thema und Datei wählen, 10 Vorschläge, „Weiter“ (der Auftrag wird erstellt)
  2. „Zurück“, auf 20 umstellen, „Weiter“
  3. Expected: Der Auftrag verlangt 20 Fragen
  4. Actual: `loadPrompt` liefert den zwischengespeicherten Auftrag mit 10 (`prompts` wird nur bei neuem Thema oder neuer Datei geleert, nicht bei `setCount`). Die Vorschau meldet dann „Bestellt: 20, erhalten: 10“.
- **Ort:** `intake-material-flow.tsx`, `AdminSegmented onChange={… setCount …}`
- **Priority:** Fix before deployment

#### BUG-3: Dialog nennt den Bereich nicht im Kopf
- **Severity:** Low
- **Steps:** Als Super-Admin mit mehreren Bereichen „Fragen hinzufügen“ öffnen, dann in der Bereichsleiste umschalten.
- **Expected (Edge Case):** Der Kopf nennt den Bereich, in dem der Dialog geöffnet wurde. **Actual:** Kein Bereichsname. Die Themenliste bleibt zwar (einmal beim Öffnen geladen), aber man sieht nicht, für welchen Bereich.
- **Priority:** Fix in next sprint

#### BUG-4: „Auftrag ansehen“ zeigt ein Code-Beispiel
- **Severity:** Low
- **Steps:** Schritt 2 → „Auftrag ansehen“ aufklappen.
- **Expected:** Auf dem Weg steht kein Code-Beispiel. **Actual:** Der Auftrag endet mit dem Format-Block `{ "rows": [ { "question_text": …, "antwort_a": … } ] }`. Er ist für die KI gedacht und zugeklappt, für die Lehrkraft aber sichtbar. Der Wächter-Test prüft nur die Quelltexte der Oberfläche, nicht den Auftrag.
- **Priority:** Nice to have (Satz über dem Feld: „Diesen Text liest nur deine KI.“ oder den Formatteil ausblenden)

#### BUG-5: Abgelehnte Übernahme markiert die betroffenen Karten nicht
- **Severity:** Low
- **Steps:** Übernehmen, und der Server lehnt mit 400 und `rejected: [{index, reason}]` ab (zum Beispiel eine Stufe, die es nicht mehr gibt).
- **Expected:** Die betroffenen Karten sind mit Grund markiert. **Actual:** Es erscheint nur „Einige Fragen sind noch nicht in Ordnung. Es wurde nichts übernommen.“, ohne Hinweis, welche Karte.
- **Priority:** Fix in next sprint

#### BUG-6: „Zurück“ aus „Mit deiner KI“ hebt den Schutz vor dem Verwerfen auf
- **Severity:** Low
- **Steps:** Antwort der KI einfügen, „Zurück“ zu Schritt 1, den Dialog schließen (X/Esc).
- **Expected:** Rückfrage, weil die eingefügte Antwort noch im Speicher ist. **Actual:** `changeStepDirty(0)` setzt dirty auf false, und der Dialog schließt ohne Rückfrage.
- **Priority:** Fix in next sprint

#### BUG-7: „Verwerfen“ in Weg 1 schließt den ganzen Dialog statt zur Auswahl zurückzugehen
- **Severity:** Low
- **Steps:** Selbst schreiben, etwas tippen, „Zurück“, dann „Verwerfen“.
- **Expected:** Zurück zur Auswahl („Zurück führt wieder zur Auswahl“). **Actual:** Der Dialog schließt.
- **Priority:** Nice to have

#### BUG-8: Weg 1 springt nicht zum Thema der neuen Frage
- **Severity:** Low
- **Steps:** Im Baum Thema A wählen, „Selbst schreiben“, im Formular Thema B wählen, speichern.
- **Expected:** Die Frage erscheint im gewählten Thema (B). **Actual:** `onSaved` meldet `topicIds: []`, der Baum bleibt auf A, und die neue Frage ist nicht zu sehen.
- **Priority:** Fix in next sprint

#### BUG-9: Tabellen-Randfälle: leere Themen-Spalten und Zeilennummern
- **Severity:** Low
- **Steps:**
  1. Die Beispiel-Tabelle (sie hat die Spalten `thema` und `fach_code`, aber leer) ohne gewähltes Thema einlesen: „Weiter“ geht, weil `hasOwnTopic` nur die Kopfzeile prüft. In der Vorschau sind alle Zeilen gesperrt mit „Wähle oben ein Thema“, aber in der Vorschau gibt es kein Themenfeld.
  2. Eine CSV mit Leerzeilen zwischen den Fragen: `skipEmptyLines` überspringt sie, die angezeigte „Zeile N“ passt nicht mehr zur Datei.
- **Priority:** Nice to have

#### BUG-10: Lint-Warnung `react-hooks/set-state-in-effect`
- **Severity:** Low
- **Ort:** `add-questions-dialog.tsx:68` (Zurücksetzen beim Öffnen im Effekt)
- **Priority:** Nice to have

#### BUG-11: Offene Bearbeitung einer Karte wird beim Übernehmen ignoriert
- **Severity:** Low
- **Steps:** In der Vorschau eine angehakte Karte bearbeiten, ohne „Fertig“ direkt „N Fragen übernehmen“ klicken.
- **Expected:** Die Änderung wird übernommen, oder der Knopf bittet zuerst um „Fertig“. **Actual:** Es wird die alte Fassung gespeichert, die Änderung geht still verloren.
- **Priority:** Fix in next sprint

### Nicht geprüft (Grenzen dieses Durchlaufs)
- Cross-Browser (Chrome, Firefox, Safari) und die Breiten 375/768/1440 px im echten Browser. Hier gibt es keinen Dev-Server. Geprüft wurden die Tailwind-Klassen im Code. Nach dem Deploy bitte einmal am Handy ansehen.
- Echte Word- und PowerPoint-Skripte aus dem Unterricht und eine echte Antwort von ChatGPT/Claude.ai (Logik mit Beispieldaten getestet).

### Regression
- Volle Vitest-Suite grün, inklusive PROJ-131 (Lerninhalte, Reiter, Baum), PROJ-38 (`assessment-import`), PROJ-82 (Inbox-Formular), PROJ-130 (`begriffe.test.ts`), Admin-Navigation und Weiterleitungen
- `teacher-tasks`: Die Aufgabe „Fragen-Entwürfe warten“ zeigt jetzt auf `/admin/inhalte`, wo es keine Entwürfe zu sehen gibt. Laut Implementation Notes ist `questions_draft` leer, die Aufgabe erscheint also nicht. Beobachten.

### Summary
- **Acceptance Criteria:** 33/34 bestanden (1 teilweise wegen BUG-2)
- **Edge Cases:** 9/10 bestanden (BUG-3)
- **Bugs Found:** 11 total (0 critical, 0 high, 2 medium, 9 low)
- **Security:** 1 Befund (BUG-1, Medium). Rechte, Validierung und Protokoll sind in Ordnung.
- **Production Ready:** YES nach der Regel (keine Critical- oder High-Bugs)
- **Recommendation:** Vor dem Deploy BUG-1 und BUG-2 beheben (beide klein), den Rest im nächsten Durchgang.

### Behebung der QA-Befunde (2026-11-27)
Alle 11 Befunde sind behoben, jeder mit eigenem Regressionstest (`add-questions-dialog.test.tsx` › „QA-Befunde“, `material-pptx.test.ts`, `question-intake-qa.test.ts`).
| Bug | Behebung |
|---|---|
| BUG-1 | `readPptxText` zählt im Filter die entpackte Gesamtgröße (höchstens 40 MB) und die Folienzahl, **bevor** entpackt wird. Ist die Datei zu groß, gibt die Route 413 mit „Diese PowerPoint-Datei ist zu groß zum Lesen. Teile sie in kleinere Dateien auf.“ zurück. Test: Eine 1-MB-Bombe wird abgelehnt, ohne nennenswerten Speicher. |
| BUG-2 | Eine neue Zahl der Vorschläge verwirft den zwischengespeicherten Auftrag, er wird neu gebaut. |
| BUG-3 | Bei mehreren Bereichen nennt der Kopf jedes Schritts „Bereich: …“, festgehalten beim Öffnen. |
| BUG-4 | Über dem aufgeklappten Auftrag steht: „Diesen Text liest nur deine KI. Am Ende steht, in welcher Form sie antworten soll. Du musst nichts daran ändern.“ |
| BUG-5 | Abgelehnte Fragen bekommen den Grund des Servers auf ihre Karte und werden abgewählt. |
| BUG-6 | „Zurück“ mit eingefügter Antwort der KI lässt die Rückfrage beim Schließen bestehen. |
| BUG-7 | „Verwerfen“ nach „Zurück“ in Weg 1 führt zur Auswahl. |
| BUG-8 | Weg 1 meldet das Thema der gespeicherten Frage, der Baum springt dorthin. |
| BUG-9 | Eine eigene Themen-Spalte zählt nur, wenn sie ausgefüllt ist. Leerzeilen werden erst nach dem Nummerieren entfernt, „Zeile N“ passt also zur Datei. Die Anzeige sagt „N Fragen“. Der Satz bei fehlendem Thema lautet jetzt „Gehe zurück und wähle ein Thema, oder trage es in der Tabelle ein.“ |
| BUG-10 | Das Zurücksetzen beim Öffnen läuft im Rendern statt im Effekt, ohne Lint-Warnung. |
| BUG-11 | Offene Bearbeitungen in der Vorschau werden beim Übernehmen erst angewendet und neu geprüft. |

Danach: `npm test` 371 Dateien, 4.951 Tests grün, `tsc` sauber, `npm run build` sauber. **Production Ready: YES.**

## Deployment
_To be added by /deploy_
