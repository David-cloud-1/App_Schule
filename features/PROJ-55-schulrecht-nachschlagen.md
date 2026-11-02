# PROJ-55: Schulrecht nachschlagen

## Status: In Review
**Created:** 2026-10-27
**Last Updated:** 2026-11-02

## Kontext
Teil des Werkzeugkiste-Umzugs (Übersicht in PROJ-51). „Schulrecht nachschlagen“ ist das 13. Werkzeug der alten Werkzeugkiste und anders als die übrigen: Es gibt **keinen Upload**. Die Lehrkraft stellt eine Alltagsfrage aus dem Lehrerzimmer („Muss ich einen Leistungsnachweis ankündigen?“). Die App findet **ohne KI** die einschlägigen Paragraphen im Wortlaut aus den mitgelieferten bayerischen Schulvorschriften (BayEUG, BaySchO, BSO, BayDSG, DSGVO, Dienstordnung u. a.).

Wer mehr will als den Gesetzestext, kann optional einen Prompt mit genau diesen Fundstellen in die eigene KI kopieren und bekommt daraus eine **Aktennotiz (Word)**. Weil die KI den Wortlaut vor sich hat, kann sie keine Paragraphen erfinden. Die Prüfung der Antwort meldet trotzdem Fundstellen, die nicht in den gelieferten Texten stehen.

Grundlage ist `Rechtsauskunft-Konzept.md` in der Werkzeugkiste. Dort sind auch die Gründe für die Anonymisierung und den Haftungshinweis festgehalten.

### Entscheidungen
- **E1 – Eigener Navigationseintrag** „Schulrecht“ in der Gruppe „Mein Unterricht“, nicht als Werkzeug-Karte (Nutzer, 2026-10-27). Es ist ein Nachschlagewerk, kein Material-Werkzeug.
- **E2 – Nachschlagen zuerst:** Die Fundstellen sind das Hauptergebnis. Prompt und Aktennotiz sind ein optionaler zweiter Schritt und standardmäßig nicht im Vordergrund.
- **E3 – Datenschutz vor Bequemlichkeit:** Bevor ein Prompt kopiert werden kann, werden Personenbezüge (Namen, Klassen, Daten) angezeigt, und die Lehrkraft bestätigt die Ersetzung. Ersetzt wird nie stillschweigend (wie bisher).
- **E4 – Fragen werden nicht gespeichert:** Weil Fragen regelmäßig Personenbezug haben, speichert die App weder die Frage noch den Sachverhalt dauerhaft. Die Aktennotiz wird heruntergeladen, nicht in „Meine Materialien“ abgelegt. *(Vom Nutzer bestätigt, 2026-10-27.)*

## Dependencies
- Requires: PROJ-51 (Hintergrund-Dienst, Zugangsregeln, Rahmen)
- Unabhängig von PROJ-52/51/52

## User Stories
- Als **Lehrkraft** möchte ich eine rechtliche Frage in Alltagssprache eintippen und sofort die passenden Paragraphen im Wortlaut sehen, damit ich mitten im Schultag eine verlässliche Grundlage habe.
- Als **Lehrkraft, die nicht weiß, wie sie fragen soll**, möchte ich über Themen wie „Fehlzeiten“ oder „Handy“ einsteigen.
- Als **Lehrkraft** möchte ich eine Vorschrift auch ohne Frage durchblättern.
- Als **Lehrkraft** möchte ich zu einem konkreten Fall eine Aktennotiz mit Rechtsgrundlage erstellen lassen, ohne dass Namen von Schülerinnen und Schülern in eine fremde KI gelangen.
- Als **Lehrkraft** möchte ich gewarnt werden, wenn die KI eine Fundstelle nennt, die gar nicht in den Texten steht.

## Acceptance Criteria

### Seite & Zugang
- [ ] Der Navigationseintrag „Schulrecht“ (Gruppe „Mein Unterricht“) führt auf eine eigene Seite mit `AdminPageHeader` (Titel „Schulrecht“, Beschreibung „Paragraphen zu Fragen aus dem Schulalltag – im Wortlaut, ohne KI.“). Er ist auch in der Schnellsuche (⌘K) zu finden.
- [ ] Zugang haben alle Lehrer-Rollen, Azubis nie (404).

### Fragen & Fundstellen
- [ ] Im Mittelpunkt steht ein großes Suchfeld „Was willst du wissen?“.
- [ ] Darunter stehen die Themen-Chips der Startauswahl (Leistungsnachweise · Fehlzeiten · Ordnungsmaßnahmen · Aufsichtspflicht · Nachteilsausgleich · Ausbildungsbetrieb · Datenschutz · Handy · Vorrücken · Prüfungen) sowie „Weitere Themen“. Ein Klick füllt die Beispielfrage des Themas ein und sucht.
- [ ] Über „Quellen eingrenzen“ (zugeklappt) lassen sich Rechtsquellen an- und abwählen. Standard sind alle.
- [ ] Die Fundstellen erscheinen ohne KI als Liste: Vorschrift, Paragraph bzw. Artikel, Überschrift, Stand-Datum. Der Wortlaut ist aufklappbar, der erste Treffer ist aufgeklappt.
- [ ] Die Suche liefert dieselben Treffer in derselben Reihenfolge wie die heutige Werkzeugkiste: Themen, Wortstamm-Suche und Ähnlichkeitssuche mit dem Einbettungsmodell.
- [ ] Jede Fundstelle hat „Text kopieren“ (Wortlaut mit Quellenangabe).
- [ ] Ergebnis in unter 2 Sekunden nach Absenden.

### Vorschriften durchblättern
- [ ] Über „Vorschriften durchblättern“ öffnet sich die Liste der Rechtsquellen. Jede zeigt ihr Inhaltsverzeichnis, und jede Norm ist aufklappbar.

### Aktennotiz (optional, E2)
- [ ] Unter den Fundstellen steht eine Outline-Aktion **„Aktennotiz zu einem Fall erstellen“**. Sie öffnet einen geführten Ablauf in drei Schritten: **Sachverhalt · Prompt · Aktennotiz**. Optik und Bedienung entsprechen dem Ablauf aus PROJ-51.
- [ ] **Sachverhalt:** Feld für den Fall. Beim Weitergehen erkennt die App Personenbezüge und zeigt jeden Fund mit Ersetzungsvorschlag (z. B. „Max Müller“ → „Schüler A“, „10b“ → „Klasse X“). Die Lehrkraft kann jeden Vorschlag annehmen, ändern oder ablehnen (E3). Erst danach geht es weiter.
- [ ] **Prompt:** wie Schritt 3 in PROJ-51 (großer Kopierknopf, Kurzanleitung). Der Prompt enthält die Fundstellen im Wortlaut und den bestätigten, anonymisierten Sachverhalt. Er ist zeichengenau derselbe wie heute.
- [ ] **Aktennotiz:** Antwortfeld. Die Prüfung meldet Fundstellen in der Antwort, die nicht unter den gelieferten Texten sind („Die KI nennt Art. 99 BayEUG – diese Stelle wurde ihr nicht gegeben. Bitte prüfen.“).
- [ ] Ergebnis ist eine Word-Datei mit Sachverhalt, Rechtsgrundlage, Einschätzung, Datum und Haftungshinweis, inhaltsgleich mit der heutigen Werkzeugkiste.
- [ ] Ein Haftungshinweis ist auf der Seite und in der Aktennotiz sichtbar: „Keine Rechtsberatung. Im Zweifel Schulleitung oder Rechtsabteilung fragen.“

### Datenschutz (E4)
- [ ] Frage, Sachverhalt und Aktennotiz werden nicht dauerhaft gespeichert. Ein laufender Aktennotiz-Ablauf übersteht ein Neuladen der Seite, wird aber spätestens nach 24 Stunden gelöscht.
- [ ] Fragen und Sachverhalte erscheinen nicht in Server-Logs oder Fehlerberichten.

## Edge Cases
- **Keine Treffer:** „Dazu wurde nichts gefunden. Formuliere die Frage anders oder wähle ein Thema.“ Dazu kommen die Themen-Chips.
- **Sehr kurze Frage** (ein Wort): Es wird trotzdem gesucht, mit dem Hinweis „Mit einer ganzen Frage findest du genauere Stellen.“
- **Einbettungsmodell nicht verfügbar** (z. B. Kaltstart-Problem): Die Suche läuft mit Themen und Wortstamm weiter, statt zu scheitern (wie heute).
- **Lehrkraft lehnt alle Anonymisierungsvorschläge ab:** Ein deutlicher Hinweis erscheint („Der Sachverhalt enthält Namen. Er wird an eine externe KI weitergegeben.“). Weiter geht es erst nach ausdrücklicher Bestätigung.
- **Veraltete Vorschrift:** Jede Fundstelle zeigt ihr Stand-Datum. Das Aktualisieren der Rechtsquellen bleibt ein manueller Schritt (wie heute) und ist nicht Teil dieses Features.

## Technical Requirements
- **Kosten:** Suche und Ähnlichkeitssuche laufen ohne kostenpflichtige KI (lokales Modell, wie heute).
- **Leistung:** Auch der erste Aufruf nach längerer Pause (Laden des Modells) liefert in unter 10 Sekunden ein Ergebnis. Danach dauert es unter 2 Sekunden.
- **Datenschutz:** siehe E3/E4.

## Abgrenzung (nicht Teil dieses Features)
- Automatische Aktualisierung der Rechtsquellen
- Teilen von Aktennotizen im Regal
- Eine KI direkt in der App (bleibt manuell und kostenlos)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-01. Baut auf dem Tech Design von PROJ-51 auf (App = Gesicht, Python-Kern = bewährte Logik, Rolle wird zuerst geprüft). Grundlage der Suche ist die heutige Werkzeugkiste (`schulrecht_suche.py`, `schulrecht_themen.py`, `schulrecht_anonymisierung.py`, `einbettung.py`, `Rechtsauskunft-Konzept.md`).

### Das Bild im Großen

PROJ-55 ist anders als die übrigen Werkzeuge: kein Skript, kein Speicher-Upload, und die Frage darf **nirgends hängen bleiben**. Deshalb gibt es zwei klar getrennte Teile.

```
TEIL 1 – Nachschlagen (kein Speichern, keine KI)
Lehrkraft tippt Frage
   -> Lern-App prüft Rolle, reicht die Frage durch (nur im Nachrichtenkörper)
   -> Werkzeugkiste-Kern: Themen -> Wortstamm -> Ähnlichkeitssuche
   -> Fundstellen im Wortlaut zurück. Nichts wird gespeichert.

TEIL 2 – Aktennotiz (optional, nur eine kurze Zwischenablage)
Sachverhalt -> Personenbezüge erkennen & bestätigen -> Prompt -> Antwort prüfen -> Word
   -> nur der BESTÄTIGTE, anonymisierte Text liegt bis zu 24 h in einer eigenen kleinen Tabelle
   -> die Word-Datei wird erzeugt und direkt heruntergeladen, nie abgelegt
```

### Wo die Logik lebt

**Im Werkzeugkiste-Kern (Python), nicht in der App nachgebaut.** Begründung: Die Rechtstexte (rund 2 MB, 617 Normen, 11 Vorschriften), die Themenliste, die Wortstamm-Regeln, das Einbettungsmodell, die Anonymisierung, die Fundstellenprüfung und die Word-Aktennotiz existieren dort und sind erprobt. Die Anforderung „dieselben Treffer in derselben Reihenfolge“ und „Prompt zeichengenau gleich“ ist nur dann garantiert, wenn derselbe Code läuft. Die alte Oberfläche läuft bis PROJ-56 aus denselben Modulen weiter, so kann nichts auseinanderlaufen.

Der Kern bekommt neue, schlanke Aufrufe (nur für die App, geschützt durch dasselbe Kennwort wie in PROJ-51):

| Aufruf (Kern) | Zweck |
|---|---|
| Themen & Quellen | Chips der Startauswahl, „Weitere Themen“, Liste der Rechtsquellen |
| Suchen | Frage + gewählte Quellen -> Fundstellen (Vorschrift, Nummer, Überschrift, Stand, Wortlaut) |
| Vorschrift / Norm | Inhaltsverzeichnis einer Vorschrift, Wortlaut einer Norm (zum Durchblättern) |
| Erkennen | Sachverhalt -> Funde mit Ersetzungsvorschlag |
| Prompt | bestätigter Sachverhalt + Fundstellen -> Prompt |
| Prüfen | KI-Antwort -> Befunde zu erfundenen Fundstellen |
| Aktennotiz | Sachverhalt, Fundstellen, Antwort -> Word-Datei |
| Aufwärmen | lädt das Einbettungsmodell vor (ohne Frage) |

### Component Structure

```
Lehrkräfte-Bereich (bestehender Rahmen)
+-- Seitenleiste: neuer Eintrag „Schulrecht“ (Gruppe „Mein Unterricht“, unter „Werkzeugkiste“)
+-- Schnellsuche (⌘K): Eintrag „Schulrecht“
+-- Seite Schulrecht  (/admin/schulrecht)
    +-- AdminPageHeader (Titel, ein Satz, keine grüne Hauptaktion nötig)
    +-- Haftungshinweis (ruhige Hinweisbox: „Keine Rechtsberatung. Im Zweifel Schulleitung …“)
    +-- Suchfeld „Was willst du wissen?“ (groß) + Knopf „Nachschlagen“
    +-- Themen-Chips (10 Startthemen) + „Weitere Themen“ (aufklappbar)
    +-- „Quellen eingrenzen“ (zugeklappt, Häkchen je Rechtsquelle)
    +-- Ergebnis
    |   +-- Hinweiszeile (z. B. „Mit einer ganzen Frage findest du genauere Stellen“)
    |   +-- Fundstellen-Liste
    |   |   +-- Fundstelle (Vorschrift · § · Überschrift · Stand; Wortlaut aufklappbar;
    |   |                   „Text kopieren“; erster Treffer aufgeklappt)
    |   +-- Leerzustand „Dazu wurde nichts gefunden …“ + Themen-Chips
    |   +-- Outline-Aktion „Aktennotiz zu einem Fall erstellen“
    +-- „Vorschriften durchblättern“ (aufklappbar)
        +-- Rechtsquelle (Inhaltsverzeichnis) -> Norm aufklappbar

Aktennotiz-Ablauf (eigene Ansicht ohne Seitenleiste, wie der Ablauf aus PROJ-51)
+-- Kopf (✕ mit Rückfrage, „Aktennotiz“), Fortschritt: Sachverhalt · Prompt · Aktennotiz
+-- 1 Sachverhalt: Textfeld; beim Weitergehen Liste der Funde mit Vorschlag
|        (annehmen / ändern / ablehnen); Warnhinweis, wenn alles abgelehnt wurde
+-- 2 Prompt: großer Kopierknopf, Kurzanleitung (Baustein aus PROJ-51 wiederverwendet)
+-- 3 Aktennotiz: Antwortfeld, Prüf-Box (erfundene Fundstellen), „Word herunterladen“
+-- Haftungshinweis auf jedem Schritt
```

Wiederverwendet werden: `AdminPageHeader`, die Zustände aus `admin-states.tsx`, der Ablauf-Rahmen mit Fortschritt und Fuß, der Kopierknopf und die Prüf-Box aus PROJ-51, shadcn `Collapsible`, `Accordion`, `Badge`, `Input`/`Textarea`, `Checkbox`, `AlertDialog`. **Neu** sind nur die Fundstellen-Karte, die Funde-Liste mit Ersetzungsfeld und die Seitenseite selbst. Keine neuen Pakete.

### Data Model (in Worten)

**Teil 1 (Nachschlagen):** nichts wird gespeichert. Auch keine „Fragen ohne Treffer“-Statistik (das hatte die alte Werkzeugkiste als Idee; fällt wegen E4 weg).

**Teil 2: neue kleine Tabelle „Schulrecht-Fall“** (eine Zeile pro begonnener Aktennotiz):
- Eindeutige Nummer, Besitzer (Lehrkraft)
- Aktueller Schritt und Zustand
- **Bestätigter, anonymisierter** Sachverhalt (nie der Originaltext)
- Die gelieferten Fundstellen (nur Verweise wie „BayEUG Art. 56“, nicht der Wortlaut; den holt der Kern bei Bedarf)
- Erzeugter Prompt, eingefügte KI-Antwort, letztes Prüfergebnis
- Angelegt am, zuletzt bearbeitet am, **läuft ab am** (24 Stunden nach der letzten Bearbeitung)

Dazu **kein Speicherbereich**: Die Word-Datei wird auf Abruf erzeugt und direkt an den Browser geschickt.

**Wer darf was:** Wie bei den Abläufen aus PROJ-51 sieht und ändert eine Lehrkraft nur eigene Fälle, durchgesetzt von der Datenbank (Zeilenregeln). Azubis haben keinen Zugriff. Auch der Super-Admin liest fremde Fälle nicht.

**Aufräumen:** Der bestehende tägliche Zeitplan (`werkzeugkiste-aufraeumen`) löscht zusätzlich abgelaufene Fälle. Weil „spätestens nach 24 Stunden“ gilt, läuft er für diese Tabelle **stündlich**, oder die Oberfläche blendet Fälle nach Ablauf unabhängig vom Löschen aus (Entscheidung beim Bauen, siehe unten).

**Rohtext vor der Bestätigung:** Der Originaltext des Sachverhalts, der Namen enthalten kann, bleibt **nur im Browser dieser Sitzung** (er übersteht Neuladen, verschwindet beim Schließen des Tabs) und geht nur zum Erkennen kurz an den Kern, ohne gespeichert zu werden. In die Datenbank kommt erst der bestätigte Text.

### Tech Decisions (warum so)

| Entscheidung | Warum |
|---|---|
| Suche, Anonymisierung, Prüfung und Aktennotiz laufen im Kern | Gleiche Treffer, gleicher Prompt, gleiche Word-Datei wie heute, ohne Nachbau. Rechtstexte und Themenliste bleiben an **einer** Stelle. |
| Eigene kleine Tabelle statt der Tabelle aus PROJ-51/52 | „Meine Materialien“ listet alles aus der Ablauf-Tabelle (Entwürfe 7 Tage, fertige Materialien dauerhaft). Schulrecht-Fälle haben andere Regeln (24 Stunden, nie dauerhaft, nie im Regal) und würden dort versehentlich auftauchen, ablaufen oder geteilt werden können. Getrennt ist sicherer und einfacher. |
| Frage wandert nur im Nachrichtenkörper, nie in der Adresse | Die alte Werkzeugkiste schickt die Frage in der Adresse (GET). Adressen stehen in Zugriffsprotokollen. Das verletzt E4 und wird für die App ausdrücklich anders gebaut (POST). Außerdem: Fragen und Sachverhalte erscheinen in keinem eigenen Protokolleintrag, Fehlermeldungen nennen keinen Inhalt. |
| Themen-Klick füllt die Beispielfrage ein und sucht | Wie in der Spec; die Beispielfragen liefert der Kern. |
| Fundstellen-Suche ist **nicht** zwischengespeichert; Themenliste, Quellenliste und Durchblättern **schon** | Suchen enthalten Fragen mit Personenbezug (kein Cache). Die übrigen Inhalte sind öffentliche Rechtstexte, ändern sich nur manuell und können lange gemerkt werden. Das hält die Seite flott. |
| Modell vorwärmen, sobald die Seite öffnet | Das Einbettungsmodell (rund 130 MB) braucht beim ersten Mal Ladezeit. Ein Aufwärm-Aufruf ohne Frage beim Öffnen der Seite nimmt die Wartezeit weg und hält das 10-Sekunden-Ziel auch nach Pausen. |
| Suche läuft mit Themen und Wortstamm weiter, wenn das Modell nicht lädt | Wie heute, gewünschtes Verhalten laut Spec. Die Seite zeigt dann kein Fehlerbild. |
| Ähnlichkeitstreffer bleiben als „ungeprüft“ gekennzeichnet | So macht es die alte Werkzeugkiste; ein Treffer aus dem Modell ist ein Vorschlag, kein sicherer Treffer. |
| Word-Aktennotiz wird heruntergeladen, nicht gespeichert | E4. Sie läuft über die App (klein, weit unter 4,5 MB) und wird nirgends abgelegt. |

### Sicherheit & Datenschutz

- **Rolle zuerst:** Jede Seite und jeder Aufruf prüft die Lehrer-Rolle serverseitig (`requireTeacherOrAdmin`). Azubis: Seiten leiten auf die Startseite, Aufrufe 403 (bestehende Regel, `roles.ts` bekommt `/admin/schulrecht` und `/api/admin/schulrecht`). Laut Spec antwortet die Seite für Azubis mit 404.
- **Kern nur für die App:** Kennwort wie in PROJ-51, Adresse nie im Browser.
- **Keine Inhalte in Logs:** Keine Frage, kein Sachverhalt, keine Antwort in Server-Protokollen, Fehlertexten oder Auditprotokoll. Der Kern schreibt nur Dauer und Status.
- **Anonymisierung wird nie stillschweigend:** Der Weg zum Prompt ist technisch erst frei, wenn der Fall einen bestätigten Sachverhalt hat. Hat die Lehrkraft alle Vorschläge abgelehnt, braucht es eine ausdrückliche zusätzliche Bestätigung, die im Fall vermerkt wird.
- **Haftungshinweis** fest eingebaut: auf der Seite, über dem Prompt, in der Aktennotiz.
- **Rechtsquellen:** Es bleiben amtliche Normtexte. Die Quellen mit Verwaltungsvorschrift-Rang (KMS) sind noch nicht dabei (keine sauberen Volltexte) und werden hier nicht nachgebaut.

### Erster Prüfpunkt beim Bauen (vor der Oberfläche)

Wie bei PROJ-51 zuerst die technische Frage klären: **Läuft das Einbettungsmodell im Kern auf Vercel schnell genug?**
- Kern mit `onnxruntime`, `tokenizers`, Modell und Vorberechnungs-Datei bereitstellen und messen: Kaltstart bis zum ersten Treffer (Ziel unter 10 s), danach unter 2 s.
- Gleichwertigkeit: etwa 15 echte Lehrerzimmer-Fragen liefern in der App dieselben Treffer in derselben Reihenfolge wie die heutige Werkzeugkiste. Außerdem prüfen: Prompt zeichengenau, Fundstellenprüfung, Word-Datei inhaltsgleich.
- **Fallback**, falls der Kern dadurch zu groß oder zu langsam wird (Paket war bei PROJ-51 schon bei 320 MB): das Schulrecht als eigenes kleines Vercel-Projekt `werkzeugkiste-recht` aus demselben Repository, damit die anderen Werkzeuge nicht leiden. Die App ändert sich dadurch nicht, nur die Adresse.
- **Zu klären dabei:** Das Modell (~129 MB) und die Vorberechnung (~860 KB) stehen heute in der `.vercelignore`, weil sie nicht ins Git gehören. Der Bereitstellungsweg (beim Bauen herunterladen oder direkt aus dem Ordner mitgeben) wird am Prüfpunkt festgelegt. Die Vorberechnung muss nach jeder Änderung der Rechtsquellen neu erzeugt werden (manuell, wie heute).

### Dependencies

- **Lern-App:** keine neuen Pakete.
- **Werkzeugkiste-Kern:** zusätzlich `onnxruntime`, `tokenizers`, `numpy` (stehen schon in der `requirements.txt` der Werkzeugkiste und waren in PROJ-51 bewusst noch draußen) sowie das Einbettungsmodell. `python-docx` ist für die Aktennotiz schon da.
- **Einrichtung:** eine Datenbank-Migration (Tabelle „Schulrecht-Fall“ samt Zeilenregeln), Erweiterung des Aufräum-Zeitplans, zwei Pfade in `roles.ts`, ein Navigationseintrag.

### Offene Punkte für die Freigabe

1. **Eigene Tabelle statt gemeinsamer Ablauf-Tabelle** (empfohlen, siehe oben).
2. **Aufräumen stündlich oder Ausblenden nach Ablauf:** Die 24 Stunden gelten hart. Empfehlung: abgelaufene Fälle sind für die Oberfläche sofort unsichtbar (Abfrage prüft die Ablaufzeit), das physische Löschen läuft im bestehenden Tageszeitplan. Damit braucht es keinen zweiten, stündlichen Zeitplan.
3. **Rohtext im Browser** (nur Sitzung) statt auf dem Server: Einfachste Lösung, die E3 („nie ohne Bestätigung ersetzen“) und E4 zugleich einhält. Nachteil: Neuladen funktioniert nur im selben Tab.
4. **Ähnlichkeitssuche bei schwachen Treffern** (offener Punkt aus dem Konzept, Abschnitt 12): Die Spec verlangt „dieselben Treffer wie heute“. Diese Änderung gehört daher **nicht** in PROJ-55, sondern wäre ein eigenes Folge-Feature.

## Frontend-Umsetzung (2026-11-01)

> Die Freigabe des Tech Designs kam mit dem Aufruf von `/frontend`. Die vier „Offenen Punkte“ sind so umgesetzt wie empfohlen (eigene Tabelle, Ausblenden nach 24 h, Rohtext nur im Browser-Tab, Ähnlichkeitssuche unverändert).

**Seiten**
- `/admin/schulrecht`: Seitenkopf (ohne grüne Hauptaktion), Haftungshinweis, großes Suchfeld „Was willst du wissen?“, Themen-Chips (Start + „Weitere Themen“), „Quellen eingrenzen“ (zugeklappt), Fundstellen-Liste (erster Treffer aufgeklappt), „Vorschriften durchblättern“, Outline-Aktion „Aktennotiz zu einem Fall erstellen“.
- `/admin/schulrecht/fall`: Schritt 1 eines neuen Falls (Sachverhalt → Namen und Daten prüfen). Der Originaltext bleibt in `sessionStorage` dieses Tabs.
- `/admin/schulrecht/fall/[id]?schritt=1…3`: gespeicherter Fall mit Sachverhalt, Prompt und Aktennotiz. Der Schritt steht in der Adresse (Browser-Zurück, Neuladen).
- Ablauf-Ansicht ohne Seitenleiste: `istFallPfad` im Rahmen (`AdminShell`).

**Bausteine** (`src/components/schulrecht/`): `schulrecht-seite`, `fundstelle-karte` (Vorschrift · Nummer · Überschrift · Stand, „ungeprüft“-Kennzeichen, Rang-Hinweis, „Text kopieren“), `vorschriften-durchblaettern` (Inhaltsverzeichnis und Wortlaut werden erst beim Öffnen geladen), `sachverhalt-funde` (jeder Fund mit Ersetzungsvorschlag, ändern/ablehnen, Vorschau des Textes, Warnung plus ausdrückliche Bestätigung bei „alle abgelehnt“), `fall-seite`.
Wiederverwendet aus PROJ-51: `AblaufRahmen` (jetzt mit eigenen Schritten, Kopftitel und Schließen-Ziel), `SchliessenKnopf`, `SchrittPrompt`/`KopierKnopf`, `Hinweis`.

**Logik und Schnittstelle**
- `src/lib/schulrecht.ts`: Typen, feste Texte (Haftungshinweis, Warnungen, Leerzustand), Ersetzungslogik (`wendeErsetzungenAn`, `alleAbgelehnt`), Schritt-Regeln, Kopiertext mit Quellenangabe, Zwischenspeicher im Tab.
- `src/lib/schulrecht-api.ts`: Client für `/api/admin/schulrecht` mit der Liste der Aufrufe, die `/backend` bauen muss (siehe unten). Frage, Sachverhalt und Antwort gehen nur als POST-Körper.

**Navigation & Rechte:** Eintrag „Schulrecht“ in „Mein Unterricht“ (unter Werkzeugkiste, für alle Lehrer-Rollen), Aktion „Schulrecht nachschlagen“ in der Schnellsuche, `/admin/schulrecht` und `/api/admin/schulrecht` in den Lehrkraft-Freigaben (`roles.ts`).

**Schnittstelle für `/backend`** (alle unter `/api/admin/schulrecht`, Antworten wie in `schulrecht.ts` typisiert, Fehler als `{error, hint?}`):

| Aufruf | Zweck |
|---|---|
| `GET /themen` | `{start, weitere, quellen}`, darf gemerkt werden |
| `POST /suche {frage, quellen?}` | `{fundstellen, themenHinweis?}`, nie gemerkt, nie geloggt |
| `POST /aufwaermen` | lädt das Einbettungsmodell vor |
| `GET /vorschrift?kuerzel=` · `GET /norm?kuerzel=&nr=` | Durchblättern, darf gemerkt werden |
| `POST /erkennen {sachverhalt}` | `{funde}` mit Position und Vorschlag, nichts speichern |
| `POST /faelle {sachverhalt, fundstellen, alleAbgelehnt}` | Fall mit bestätigtem Text anlegen |
| `GET/PATCH/DELETE /faelle/:id` | lesen (abgelaufen = 404), Schritt erhöhen, verwerfen |
| `POST /faelle/:id/prompt` · `/pruefen {antwort}` | Prompt bauen · erfundene Fundstellen melden |
| `POST /faelle/:id/aktennotiz` | Word-Datei direkt als Antwort (mit `Content-Disposition`), nirgends ablegen |

**Abweichungen und Hinweise**
- **Azubis:** Die Spec nennt 404; der Rahmen leitet sie wie überall im Lehrkräfte-Bereich auf `/?kein-zugang=1` um (Server-Aufrufe 403). Vor dem Deploy klären, ob 404 für diese Seite wirklich gewollt ist.
- Ohne die Schnittstelle zeigt die Seite die Fehlerzustände (Themen/Suche), aber keine Treffer. Der Durchlauf ist erst nach `/backend` möglich.
- Nicht im Browser geprüft (kein Dev-Server, siehe Projektregel). Geprüft sind Tests, Typen, Lint und Produktions-Build.

**Tests:** `src/lib/schulrecht.test.ts` (9), `src/components/schulrecht/schulrecht.test.tsx` (11: Seite, Themen, Quellen-Eingrenzung, Kurzfrage, Leerzustand, Übergabe an den Ablauf, Fehler, Personenbezüge), angepasste Navigations- und Rollen-Tests. Gesamtsuite 2117 grün, Lint ohne Befund, Build sauber.

## Backend-Umsetzung (2026-11-02)

**Kern** (Repository `Werkzeugkiste`, Zweig `vercel-kern`, Commit „feat(PROJ-55): Kern für Schulrecht“, nicht gepusht): neues Modul `kern_recht.py` (reine Funktionen) und acht Routen in `app.py` unter `/api/recht/…` (`themen`, `suche`, `aufwaermen`, `vorschrift`, `norm`, `erkennen`, `prompt`, `pruefen`, `aktennotiz`). Es ruft dieselben Module wie die alte Oberfläche (`schulrecht_suche`, `schulrecht_anonymisierung`, `build_schulrecht_prompt`, `qualitaet`, `build_aktennotiz_docx`). Der Kern hält nichts fest; Fundstellen kommen als Verweis (Kürzel + Nummer) und werden dort wieder zum Wortlaut aufgelöst. Die Fundstellenprüfung liefert die ausformulierten Sätze der Prüfstelle („Die Antwort nennt BayEUG Art. 99 – … wurde der KI aber nicht im Wortlaut mitgegeben“). `onnxruntime` und `tokenizers` sind jetzt fest versioniert (1.19.2 / 0.22.2); Modell und Normvektoren stehen nicht mehr in der `.vercelignore`.
- **Tests:** `kern_recht_test.py` (19): Treffer und Reihenfolge für 10 Fragen gleich wie `suche_json`, Prompt zeichengleich, Aktennotiz inhaltsgleich (Absatztexte), Erkennen, Prüfung, Kennwortschutz (401), Fehlersätze.

**Datenbank** (`supabase/migrations/20261103_proj55_schulrecht_faelle.sql`, Rückweg `…_down.sql`): Tabelle `schulrecht_faelle` (bestätigter Sachverhalt, Fundstellen-Verweise, Prompt, Antwort, Prüfung, `laeuft_ab_am` = 24 h nach letzter Bearbeitung). RLS für alle vier Rechte: nur Besitzerin/Besitzer **und** Lehrer-Rolle, Lesen und Ändern nur vor Ablauf (abgelaufene Fälle sind sofort unsichtbar). Auch der Super-Admin sieht fremde Fälle nicht; `anon` ohne Rechte. Grenzen per CHECK (5000 Zeichen Sachverhalt, 60 000 Antwort, höchstens 30 Fundstellen). **Stündlicher Aufräum-Job per pg_cron** (`schulrecht-faelle-aufraeumen`), dazu der tägliche Vercel-Zeitplan als Rückfall und Aufräumen bei jedem Anlegen.
- Probe: `supabase/tests/proj55_schulrecht_probe.sql` (14 Rechte- und Grenzfälle, rollt am Ende zurück; endet absichtlich mit „PROBE-ERGEBNIS“).

**Routen** (`src/app/api/admin/schulrecht/…`, Hilfen in `src/lib/schulrecht-server.ts`): genau die Liste aus der Frontend-Umsetzung, alle mit `requireTeacherOrAdmin`, Zod-Prüfung (strikt, keine fremden Felder) und verständlichen Fehlersätzen. Suche, Erkennen und alle Fall-Antworten tragen `Cache-Control: no-store`; Themen, Vorschrift und Norm (öffentliche Rechtstexte) dürfen eine Stunde im Browser liegen. Frage und Sachverhalt gehen nie in einer Adresse; die App schreibt sie in keine Protokollzeile. Die Word-Datei läuft über `kernDatei` direkt zum Browser. Höchstens 20 offene Fälle je Lehrkraft (429).

**Tests:** `schulrecht.test.ts` (Routen, 17: Rollen, Validierung, Frage nur im Körper, Cache-Köpfe, Fall anlegen/lesen/404/Schritt/Löschen, Prompt, Prüfung, Word-Datei ohne Ablage, Zeitplan). Gesamtsuite 2136 grün, Build sauber, Lint ohne Fehler.

### Noch offen (vor `/qa` und Deploy)
1. **Migration einspielen:** Schreibende SQL-Aufrufe an die Produktion werden abgelehnt, die Migration muss der Nutzer im SQL-Editor ausführen: zuerst die Probe `supabase/tests/proj55_schulrecht_probe.sql` (Ergebnis unter „PROBE-ERGEBNIS“ prüfen), dann die echte Migration. Ohne sie bricht nur Schulrecht (Fälle), nichts Bestehendes.
2. **Prüfpunkt auf Vercel (Kaltstart des Modells) steht aus:** Der Kern wurde als Vorschau bereitgestellt (Pakete inklusive Modell gingen durch, `/api/gesund` antwortet). Die Messung der Suche scheiterte, weil die Vorschau-Umgebung kein `KERN_SECRET` hat; das Hinterlegen eines Geheimnisses wurde nicht erlaubt. Zum Messen entweder `KERN_SECRET` für „Preview“ im Vercel-Projekt `werkzeugkiste-kern` eintragen, oder der Kern geht direkt in Produktion (`vercel deploy --prod` im Ordner `Werkzeugkiste`; die Änderung ist nur additiv) und die Messung läuft dort. Zielwerte: erster Aufruf unter 10 s, danach unter 2 s; die 10 Beispielfragen in der App gegen die alte Werkzeugkiste vergleichen. Reicht das Paket nicht, Ausweichweg `werkzeugkiste-recht` (siehe Tech Design).
3. **Reihenfolge beim Deploy:** Migration → Kern (Produktion) → App-Push. Der App-Code greift nur auf neue Routen und die neue Tabelle zu; Bestehendes bleibt unberührt.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
