# PROJ-64: Werkzeugkiste – Direkt erstellen (bezahlte KI)

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
