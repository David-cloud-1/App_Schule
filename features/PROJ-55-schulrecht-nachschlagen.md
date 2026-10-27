# PROJ-55: Schulrecht nachschlagen

## Status: Planned
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
