# PROJ-38: Leistungsnachweis – Fragen-Import per Kopier-Prompt (kostenlos)

## Status: Deployed
**Created:** 2026-10-20
**Last Updated:** 2026-10-20

## Dependencies
- Requires: PROJ-27 (Nachweis – eigene Fragen-Zusammenstellung) — ersetzt den Ablauf des Dialogs „Fragen aus Datei importieren"
- Requires: PROJ-21 (Benotete Leistungsnachweise) — Sperre von Nachweis-Fragen im Übungsbetrieb
- Requires: PROJ-16 (Fragen-Qualitätssicherung) — Torwächter prüft die importierten Fragen
- Requires: PROJ-22/24 (Fachbereich, Rechtetrennung) — Fragen landen im Fachbereich des Admins
- Vorlage: bestehender Kopier-Prompt für Fragen (`/api/admin/question-prompt`, PROJ-22)

## Summary
Der Knopf „Auslesen" im Dialog „Fragen aus Datei importieren" ruft heute die Claude-API auf. Ohne `ANTHROPIC_API_KEY` bricht er mit „AI-Service ist nicht konfiguriert." ab; mit Key kostet jeder Aufruf Geld. Außerdem werden offene Aufgaben (Freitext, Tabellen, Aufzählungen) nicht zu Multiple-Choice umgewandelt, sondern übersprungen.

Neu: Der Ausbilder lädt Aufgabenblatt (und optional Lösungsblatt) hoch oder fügt den Text ein. Die App liest den Text **ohne KI** aus und baut daraus einen **fertigen Prompt**. Der Ausbilder kopiert ihn in einen kostenlosen KI-Chat (ChatGPT, Gemini, Claude.ai), fügt die JSON-Antwort zurück in die App ein, sieht eine Vorschau mit Qualitätsprüfung und importiert. Die Fragen stehen danach im Nachweis-Dialog zur Auswahl. Kosten: 0 €, kein API-Key, für alle Kollegen nutzbar.

Der KI-Aufruf über die Claude-API entfällt aus diesem Dialog (kein Parallelweg, siehe Abgrenzung).

## User Stories
- Als **Ausbilder** möchte ich eine alte Stegreifaufgabe (auch als `.doc`) hochladen und daraus Multiple-Choice-Fragen für einen Nachweis erhalten, damit ich bestehendes Material weiterverwenden kann, ohne Fragen neu zu tippen.
- Als **Ausbilder** möchte ich zusätzlich das Lösungsblatt angeben, damit die richtigen Antworten aus meiner Lösung kommen und nicht von der KI geraten werden.
- Als **Ausbilder** möchte ich den Text auch direkt einfügen können, damit ich nicht blockiert bin, wenn eine Datei nicht lesbar ist (z. B. gescanntes PDF).
- Als **Ausbilder** möchte ich den fertigen Prompt mit einem Klick kopieren, damit ich ihn in meinen eigenen kostenlosen KI-Chat einfügen kann.
- Als **Ausbilder** möchte ich die Antwort der KI einfügen und eine Vorschau mit Warnungen sehen, damit ich fehlerhafte Fragen vor dem Import erkenne.
- Als **Ausbilder** möchte ich, dass importierte Fragen nur für Nachweise nutzbar sind, damit ungeprüfte KI-Fragen nicht bei den Azubis im Quiz landen.
- Als **Fachbereichs-Admin** möchte ich dieselbe Funktion für meinen Fachbereich nutzen, damit nicht jede Kollegin und jeder Kollege den Super-Admin bitten muss.

## Acceptance Criteria

### Schritt 1 – Material angeben
- [ ] Der Dialog „Fragen aus Datei importieren" bleibt im Nachweis-Dialog an gleicher Stelle erreichbar; der Knopf „Auslesen" (KI-Aufruf) wird durch den neuen Ablauf ersetzt.
- [ ] Der Ausbilder kann ein **Aufgabenblatt** hochladen (PDF, `.docx`, `.doc`; bis 50 MB wie bisher).
- [ ] Optional kann ein **Lösungsblatt** als zweite Datei hochgeladen werden (gleiche Formate).
- [ ] Alternativ kann der Text **direkt in ein Textfeld eingefügt** werden (Aufgabe und, getrennt, Lösung).
- [ ] Die Dateien werden serverseitig ohne KI in Text umgewandelt; die Datei selbst wird nicht gespeichert.
- [ ] Wirft der Server beim Auslesen einen Fehler oder enthält das Ergebnis weniger als 50 Zeichen, erscheint die Meldung „Kein verwertbarer Text – bitte Text direkt einfügen" und das Textfeld ist vorbereitet.
- [ ] Der erkannte Text wird dem Ausbilder zur Kontrolle angezeigt und kann vor dem Prompt noch bearbeitet werden (z. B. um Tabellenreste zu bereinigen).
- [ ] `.doc` wird zuverlässig verarbeitet, auch wenn der Browser den Dateityp als `application/msword`, leer oder `application/octet-stream` meldet (Erkennung zusätzlich über Dateiendung/Dateiinhalt).

### Schritt 2 – Prompt kopieren
- [ ] Die App erzeugt einen fertigen Prompt aus: Rolle und Zielgruppe des Fachbereichs, gültige Fach-Kürzel (aktive Fächer des Bereichs), Regeln, Ausgabeformat und dem Text von Aufgabe und Lösung.
- [ ] Die Regeln im Prompt verlangen: offene Aufgaben (Freitext, Zuordnungen, Aufzählungen, Kürzel) in Multiple-Choice mit genau 5 Optionen und genau 1 richtiger Antwort umwandeln; richtige Antworten **aus dem Lösungsblatt** übernehmen; ohne Lösungsblatt nur Fragen erzeugen, deren Antwort aus dem Text sicher hervorgeht, sonst `needs_review`; Aufgaben, die sich nicht als MC fassen lassen (Zeichnungen, freie Skizzen), weglassen und in einem Feld `skipped` benennen; keine Inhalte erfinden, die nicht im Material stehen.
- [ ] Der Prompt verlangt dieselben Qualitätsregeln wie der bestehende Fragen-Prompt (z. B. richtige Antwort nicht systematisch die längste, keine Signalwörter, gleichartige Distraktoren).
- [ ] Der Prompt verlangt als Ausgabe ausschließlich JSON im Format des Imports: `questions[]` mit `question_text`, `options[]` (2–5), `correct_index` (0-basiert), `fach_code`, optional `explanation`, sowie `skipped[]` (Liste kurzer Hinweise).
- [ ] Ein Klick auf „Prompt kopieren" legt den Prompt in die Zwischenablage und bestätigt es sichtbar; zusätzlich ist der Prompt in einem Textfeld lesbar (falls Kopieren blockiert wird).
- [ ] Übersteigt der Prompt eine übliche Chat-Grenze (ca. 30.000 Zeichen), warnt die App und schlägt vor, das Material in Teilen zu importieren; nichts wird stillschweigend abgeschnitten.
- [ ] Es werden keine externen Dienste aufgerufen und keine Kosten verursacht.

### Schritt 3 – Antwort einfügen und prüfen
- [ ] Ein Textfeld nimmt die Antwort der KI auf; JSON in Markdown-Codeblöcken (```json) oder mit Text davor/danach wird erkannt.
- [ ] Ungültiges JSON ergibt eine verständliche Meldung („Antwort ist kein gültiges JSON – bitte die KI bitten, nur JSON auszugeben") statt eines technischen Fehlers; die eingefügte Antwort bleibt im Feld erhalten.
- [ ] Jede Frage wird gegen das Import-Schema geprüft (Text 1–1000 Zeichen, 2–5 Optionen mit je 1–500 Zeichen, `correct_index` innerhalb der Optionen); fehlerhafte Fragen werden in der Vorschau einzeln markiert und nicht importiert, die übrigen bleiben nutzbar.
- [ ] Unbekannte oder fehlende `fach_code` werden dem Standardfach des Bereichs zugeordnet; die Vorschau zeigt das zugeordnete Fach je Frage an.
- [ ] Der **Torwächter** (`analyzeQuestion`/`analyzeBatch`) läuft über alle Fragen; Warnungen werden je Frage angezeigt, Blocker verhindern den Import der betreffenden Frage mit Begründung.
- [ ] Die Vorschau zeigt je Frage Text, alle Optionen, die als richtig markierte Option und Warnungen; der Ausbilder kann Fragen **abwählen**.
- [ ] Der Ausbilder kann in der Vorschau die richtige Antwort korrigieren (Auswahl einer anderen Option), bevor er importiert.
- [ ] `skipped`-Hinweise der KI werden als Info angezeigt („Nicht umgewandelt: …").

### Schritt 4 – Import
- [ ] Importiert werden die in der Vorschau gewählten, gültigen Fragen; Duplikate (identischer Fragetext im Fachbereich) werden erkannt, in der Vorschau markiert und standardmäßig nicht importiert.
- [ ] Importierte Fragen gehören zum Fachbereich des Admins; Fach über `fach_code`, sonst Standardfach (wie bisher).
- [ ] Importierte Fragen werden mit der Herkunft „Nachweis-Import" gekennzeichnet und sind **nur im Nachweis-Dialog auswählbar**; sie erscheinen nicht in Quiz, Lücken schließen, Blitzrunde, Prüfungssimulation oder Übungs-API.
- [ ] In der Fragenverwaltung sind diese Fragen als „nur für Nachweise" erkennbar; der Admin kann sie dort bearbeiten, löschen oder für den Übungsbetrieb **freigeben**.
- [ ] Nach dem Import sind die neuen Fragen im Nachweis-Dialog automatisch ausgewählt (wie bisher) und die Anzahl erscheint in einer Bestätigung.
- [ ] Der Import wird im Audit-Log protokolliert (wer, wie viele Fragen).
- [ ] Der Import legt weiterhin **kein Prüfungsset** an.

### Rechte
- [ ] Alle Admin-Rollen (Super-Admin, Fachbereichs-Admins) können die Funktion nutzen; Nicht-Admins erhalten 401/403.
- [ ] Ein Fachbereichs-Admin kann nur Fragen in seinem Fachbereich anlegen; Fach-Kürzel anderer Bereiche werden ignoriert (Standardfach).

### Abgrenzung / Bestand
- [ ] Der KI-Weg über die Claude-API (`/api/admin/exam-sets/extract`) wird für den Nachweis-Dialog nicht mehr verwendet. Der Import im Prüfungsset-Dialog (PROJ-15) bleibt unverändert, solange er nicht ausdrücklich mit umgestellt wird (siehe offene Punkte).
- [ ] Der bisherige Weg, Fragen für einen Nachweis **aus dem Katalog auszuwählen** (Suche, Filter, Sortierung, Prüfungsset als Startauswahl; PROJ-27), bleibt unverändert erhalten. Der Kopier-Prompt-Import ist nur ein zusätzlicher Weg daneben.
- [ ] Bereits angelegte Nachweise, Teilnehmer-Pfade, Benotung und Auswertung bleiben unverändert.

## Edge Cases
- Aufgabenblatt enthält nur Tabellen/Zeichnungen (z. B. Vertragsskizze): Der Text ist dünn; die KI soll solche Teile in `skipped` melden, nichts erfinden. Die App zeigt die Hinweise an.
- Nur Aufgabenblatt, kein Lösungsblatt: Prompt weist die KI an, unsichere Antworten mit `needs_review` zu kennzeichnen; die Vorschau zeigt „Antwort ungeprüft", der Ausbilder muss die richtige Antwort bestätigen, bevor die Frage importierbar ist (Nachweise brauchen einen feststehenden Schlüssel).
- Lösungsblatt passt nicht zum Aufgabenblatt (falsche Datei): Die KI-Antwort wird trotzdem eingefügt; die Vorschau mit richtiger Antwort je Frage ist die Kontrolle. Die App erkennt den Widerspruch nicht automatisch.
- KI gibt mehr als 200 Fragen oder 0 Fragen zurück: über 200 wird abgelehnt mit Hinweis, in Teilen zu importieren; 0 Fragen ergibt eine klare Meldung.
- KI liefert weniger als 5 Optionen oder 2 richtige Antworten: Frage wird als fehlerhaft markiert und nicht importiert.
- Dieselbe Antwort wird zweimal eingefügt oder der Import wird doppelt geklickt: Duplikat-Erkennung und gesperrter Knopf während des Imports verhindern Doppel.
- Sehr großes Material (z. B. 80+ Seiten): Warnung vor zu langem Prompt, Empfehlung zum Teilen; nichts wird ohne Hinweis gekürzt.
- Zwischenablage nicht verfügbar (Browser-Einstellung): Prompt ist im Textfeld markier- und kopierbar.
- Dialog wird zwischen den Schritten geschlossen: Eingaben gehen verloren, es wurde noch nichts importiert; ein bereits importierter Stand bleibt bestehen.
- Datei verschlüsselt oder passwortgeschützt: verständliche Fehlermeldung, Hinweis auf Texteinfügung.
- Super-Admin wechselt den Fachbereich (PROJ-29) während des Dialogs: Prompt und Fächerliste beziehen sich auf den aktiven Bereich; beim Wechsel wird der Dialog zurückgesetzt.

## Technical Requirements
- Kosten: 0 €; kein Aufruf externer KI-Dienste, kein API-Key erforderlich.
- Datenschutz: Das Material verlässt die App nur über die Zwischenablage durch den Ausbilder selbst; die App speichert weder Datei noch Prompt.
- Security: Admin-Authentifizierung auf allen neuen Endpunkten; serverseitige Validierung aller Fragen (Zod, Fachbereich); keine Ausführung eingefügter Inhalte (Text wird nur als Text behandelt und beim Anzeigen escaped).
- Performance: Textauslesen einer 5-MB-Datei in unter 10 Sekunden; Prompt-Aufbau ohne Netzwerkaufruf.
- Barrierefreiheit/Touch: Dialog bedienbar auf Smartphone (Dark Mode, Touch-Ziele ≥ 44 px).

## Offene Punkte für /architecture
- Wie wird „nur für Nachweise" technisch abgebildet (neues Kennzeichen an der Frage, z. B. Herkunft/Sichtbarkeit) und wo müssen die Übungs-Pfade es beachten? Sperre aus PROJ-21 als Vorbild.
- Textauslesen: eigener leichter Endpunkt ohne KI (Wiederverwendung von `extractText`), inkl. Dateityp-Erkennung für `.doc`.
- Soll derselbe Kopier-Weg später auch den Datei-Import im Prüfungsset-Dialog (PROJ-15) ersetzen? Hier nur Nachweis-Dialog; Entscheidung des Auftraggebers offen.
- Soll der Prompt-Baustein mit `buildQuestionPrompt` (PROJ-22) geteilt werden, um Regeln nicht doppelt zu pflegen?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Grundidee
Fast alles, was wir brauchen, gibt es schon: das Auslesen von Text aus PDF/Word (ohne KI), den Prompt-Baukasten mit den Qualitätsregeln des Fachbereichs, das Einfüge-Format des Bulk-Imports samt Torwächter-Prüfung und den Korrektur-Prompt. Neu sind nur der **Zusammenbau zu einem Nachweis-Prompt**, ein **geführter Dialog** und das Kennzeichen **„nur für Nachweise"**. Es gibt keinen KI-Aufruf und keine neue Software-Abhängigkeit.

### A) Komponentenstruktur
```
Nachweis anlegen/bearbeiten (besteht, unverändert)
+-- Fragen-Auswahl aus dem Katalog (besteht, unverändert – bleibt erhalten)
+-- Knopf „Fragen aus Datei importieren" (besteht)
    +-- Import-Dialog (UMGEBAUT, 4 Schritte)
        +-- Schritt 1 „Material"
        |   +-- Aufgabenblatt: Datei wählen ODER Text einfügen
        |   +-- Lösungsblatt (optional): Datei wählen ODER Text einfügen
        |   +-- Kontrollfeld „erkannter Text" (bearbeitbar)
        +-- Schritt 2 „Prompt"
        |   +-- Fertiger Prompt (lesbar) + Knopf „Kopieren"
        |   +-- Hinweis „Längenwarnung" (bei sehr langem Material)
        |   +-- Kurze Anleitung: „In ChatGPT/Gemini/Claude einfügen, Antwort kopieren"
        +-- Schritt 3 „Antwort einfügen"
        |   +-- Textfeld für die KI-Antwort
        |   +-- Fehlermeldung bei ungültigem JSON (Antwort bleibt stehen)
        +-- Schritt 4 „Vorschau & Import"
            +-- Liste der Fragen (aufklappbar): Text, 5 Optionen, richtige Antwort wählbar
            +-- Markierungen: Warnung / Blocker / Duplikat / „Antwort ungeprüft"
            +-- Info „Nicht umgewandelt: …" (aus der KI-Antwort)
            +-- Knopf „Korrektur-Prompt kopieren" (bei Blockern, vorhandener Baustein)
            +-- Knopf „N Fragen importieren"

Fragenverwaltung (Admin) – kleine Ergänzung
+-- Kennzeichen „nur für Nachweise" an der Frage
+-- Aktion „Für Übungsbetrieb freigeben"
```

### B) Datenmodell (in Alltagssprache)
Jede Frage bekommt **ein zusätzliches Kennzeichen: „nur für Nachweise" (ja/nein, Standard nein)**.
- Bestehende Fragen bleiben unverändert („nein").
- Über den Kopier-Prompt importierte Fragen erhalten „ja".
- Mit „Für Übungsbetrieb freigeben" wird es auf „nein" gestellt; die Frage erscheint dann wie jede andere im Quiz.
- Im Katalog des Nachweis-Dialogs sind solche Fragen normal auswählbar.

Sonst wird nichts gespeichert: weder die hochgeladene Datei noch der Prompt noch die KI-Antwort. Alles bleibt im Dialog, bis importiert wird.

**Auswirkung auf die Übungswege:** Quiz, Lücken schließen, Blitzrunde, Prüfungssimulation und Übungs-API nutzen bereits eine gemeinsame Sperrliste (Fragen offener Nachweise, PROJ-21). Diese Liste wird um „nur für Nachweise"-Fragen erweitert. Damit greift die Sperre an einer einzigen Stelle statt in fünf Wegen einzeln.

### C) Tech-Entscheidungen (und warum)
- **Bulk-Import-Format wiederverwenden** (Zeilen mit Antwort A–E und Buchstabe der richtigen Antwort) statt eines neuen Formats. Warum: Kollegen und KI kennen es schon, die Prüfung und der Korrektur-Prompt existieren bereits, und der Prompt muss nur um das Feld „übersprungen" ergänzt werden. *Abweichung zur Spezifikation:* dort stand „`questions[]` mit `correct_index`"; fachlich identisch, nur das bekannte Format.
- **Antwort-Erkennung tolerant:** Die App findet das JSON auch in Codeblöcken oder mit Text davor/danach und akzeptiert zusätzlich das Format aus dem Datei-Import (`questions[]`), falls die KI es liefert.
- **Prompt serverseitig bauen:** Rolle, Zielgruppe, Fächer und Zusatzhinweise kommen aus dem Fachbereich des Admins (wie beim bestehenden Fragen-Prompt); der Server kennt sie, der Browser müsste sie erst laden. Der Qualitätsregel-Baustein wird geteilt, damit die Regeln nur an einer Stelle gepflegt werden (klärt die Frage aus den offenen Punkten).
- **Textauslesen eigener schlanker Weg ohne KI:** nutzt die vorhandene Auslese-Funktion für PDF/.docx/.doc. Der Dateityp wird zusätzlich an der Dateiendung und am Dateiinhalt erkannt, weil Browser `.doc` oft falsch melden. Die alte KI-Auslese-Route für den Nachweis-Dialog wird nicht mehr aufgerufen; sie bleibt für den Prüfungsset-Dialog bestehen (dort unverändert, Entscheidung für später).
- **Prüfung in der Vorschau serverseitig:** Duplikate (gleicher Fragetext im Fachbereich) lassen sich nur mit Datenbankzugriff erkennen; Torwächter und Schema-Prüfung laufen dort mit. Der Import-Endpunkt prüft **nochmals**, ohne dem Browser zu vertrauen.
- **Import-Endpunkt erweitern statt neu bauen:** Der vorhandene Weg „Fragen für Nachweis anlegen" nimmt zusätzlich Erklärung, Schwierigkeit, Klassenstufe und das Kennzeichen entgegen und lehnt Blocker und Duplikate serverseitig ab. Der Katalog-Weg bleibt unberührt.
- **Rechte:** Wie bisher für den Import – jeder Admin; Fragen landen im Fachbereich des Admins.
- **Fragen ohne Lösungsblatt:** Der Schlüssel eines Nachweises muss feststehen. Fragen mit `needs_review` werden in der Vorschau mit „Antwort ungeprüft" markiert und lassen sich erst importieren, wenn der Ausbilder die richtige Antwort bewusst bestätigt.

### D) Neue/geänderte Endpunkte (Überblick)
| Zweck | Art |
|---|---|
| Datei(en) → Text, ohne KI | neu |
| Material → fertiger Prompt | neu |
| KI-Antwort → Vorschau (Schema, Torwächter, Duplikate, Fach-Zuordnung) | neu |
| Fragen anlegen (inkl. Kennzeichen „nur für Nachweise") | erweitert |
| Frage für Übungsbetrieb freigeben | erweitert (bestehende Frage-Bearbeitung) |
| Sperrliste der Übungswege | erweitert |

### E) Datenbank-Änderung
Eine kleine Migration: ein neues Ja/Nein-Feld an den Fragen (Standard „nein"), mit Rücknahme-Skript. Keine Änderung an Nachweisen, Teilnehmern oder Ergebnissen.

### F) Risiken
- **Bestehende Fragen aus Datei-Importen:** Die 11 Fragen der Stegreifaufgabe (heute aktiv) können nachträglich auf „nur für Nachweise" gesetzt werden – das ist eine einmalige Datenpflege, kein Teil des Features.
- **Prüfungssets (PROJ-15):** Deren Fragenauswahl zeigt „nur für Nachweise"-Fragen weiter an; in der Prüfungssimulation greift aber die gemeinsame Sperrliste. Bleibt so, solange der Set-Dialog nicht umgestellt wird.
- **Qualität der KI-Antwort** hängt vom Chat des Kollegen ab; die Vorschau mit Torwächter und Korrektur-Prompt fängt die häufigsten Fehler ab, die inhaltliche Prüfung bleibt beim Ausbilder.

### G) Abhängigkeiten (Pakete)
Keine neuen. Vorhandene Bausteine werden wiederverwendet (Textauslese für PDF/Word, Torwächter, Prompt-Baukasten, Schema-Prüfung).

### H) Build-Reihenfolge
1. Datenbank-Migration und Sperrliste (Backend)
2. Endpunkte: Text auslesen, Prompt bauen, Vorschau, Import erweitern (Backend)
3. Umbau des Import-Dialogs und Kennzeichen in der Fragenverwaltung (Frontend)
4. Tests und QA

## Implementation Notes (2026-10-20)
- Migration `20261020_proj38_assessment_only.sql` (+ `_down`): Spalte `questions.assessment_only` (Standard false); an der Produktions-DB angewendet, 8.341 Bestandsfragen unverändert.
- `src/lib/assessment-import.ts`: Prompt-Baustein (nutzt `buildQualityRules`), tolerante Antwort-Erkennung (Bulk-Format `rows` und `questions[]`), Duplikat-Schlüssel, Torwächter-Anbindung, Dateityp-Erkennung am Inhalt.
- Neue Endpunkte unter `/api/admin/assessments/questions/`: `material` (Text auslesen, 1 Datei, max. 4 MB), `prompt`, `preview`. `import` erweitert um `assessmentOnly`, Erklärung, Schwierigkeit, Klassenstufe; prüft Blocker und Duplikate serverseitig (422/409).
- Sperrliste `getLockedQuestionIds` schließt `assessment_only`-Fragen ein; `/api/questions` filtert direkt in der Abfrage (kurze URL); Themenliste zählt sie nicht mehr.
- Admin-Fragenliste: Kennzeichen „Nur für Nachweise" und Aktion „Für Übung freigeben" (PATCH `assessment_only: false`).
- UI: neuer Dialog `assessment-import-dialog.tsx` (4 Schritte) ersetzt den KI-Import im Nachweis-Dialog; Katalog-Auswahl unverändert.
- **Abweichungen/Grenzen:** Upload-Limit 4 MB je Datei (Vercel-Body-Limit 4,5 MB) — größere Dateien: Text einfügen. Die KI-Route `/api/admin/exam-sets/extract` bleibt für den Prüfungsset-Dialog bestehen. Torwächter läuft im Dialog nach jeder Änderung der richtigen Antwort erneut (im Browser).
- Tests: `assessment-import.test.ts` (20), `assessment-only.test.ts` (Routen), `answer-key.test.ts` erweitert; gesamt 986 grün.

## QA Test Results
_To be added by /qa_

## Deployment
- 2026-10-20: Migration an Produktions-DB angewendet, Push auf main (Commit c232515), Vercel-Production „Ready". Neue Routen ohne Login: 401.
- Nicht im Browser getestet (kein Dev-Server, siehe Projekt-Regel): der Dialog ist nur durch Typprüfung, Lint, Build und Routen-Tests abgesichert — Sichtprüfung durch den Auftraggeber steht aus.
