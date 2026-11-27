# PROJ-132: Fragen hinzufügen – drei Wege mit Vorschau (Phase 3 Übersichtlichkeit, Teil 2)

## Status: Planned
**Created:** 2026-11-27
**Last Updated:** 2026-11-27

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
