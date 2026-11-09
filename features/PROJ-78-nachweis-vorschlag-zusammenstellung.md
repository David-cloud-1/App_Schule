# PROJ-78: Nachweis in zwei Klicks – Vorschlag nach Thema, Anzahl & Schwierigkeit

## Status: Architected
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-27 (Fragen-Zusammenstellung / Editor), PROJ-39 (Kategorisierung), PROJ-12 (Thema, Klassenstufe)
- Requires: PROJ-74-Datenbasis (Lösungsquoten aus `quiz_answers` für die Schwierigkeit)
- Optional: PROJ-75 (gesperrte Fragen werden ausgeschlossen), PROJ-73 (Fragen mit offenen Meldungen werden ausgeschlossen)

## Summary
Statt Fragen einzeln zusammenzusuchen, gibt die Lehrkraft Thema, Anzahl und Schwierigkeitsmix an und bekommt einen Vorschlag für den Nachweis. Der Vorschlag landet im bekannten Zusammenstell-Editor und lässt sich dort frei ändern. Schwierigkeit wird aus echten Antworten der Azubis abgeleitet.

## User Stories
- Als **Lehrkraft** möchte ich mit wenigen Angaben einen Nachweis-Entwurf bekommen, damit ich nicht 20 Fragen einzeln suchen muss.
- Als **Lehrkraft** möchte ich steuern, wie viele leichte, mittlere und schwere Fragen enthalten sind, damit der Nachweis fair und aussagekräftig ist.
- Als **Lehrkraft** möchte ich einzelne Vorschläge tauschen oder neu würfeln können, damit der Entwurf zu meinem Unterricht passt.
- Als **Lehrkraft** möchte ich Fragen ausschließen, die ich zuletzt schon verwendet habe, damit Nachweise nicht wiederholt werden.

## Acceptance Criteria

### Eingaben
- [ ] Im Zusammenstell-Editor gibt es „Vorschlag erstellen“ mit: Fach (Mehrfachauswahl), Thema (Mehrfachauswahl, optional), Klassenstufe, Anzahl Fragen (Zahl, 5–60) und Schwierigkeitsmix.
- [ ] Schwierigkeitsmix: Voreinstellungen „ausgewogen“ (30 % leicht, 50 % mittel, 20 % schwer), „eher leicht“, „eher schwer“ und „eigene Verteilung“ mit drei Reglern, deren Summe 100 % ergibt.
- [ ] Schwierigkeit je Frage aus der Lösungsquote im freien Üben: leicht ≥ 75 %, mittel 40–74 %, schwer < 40 %. Fragen mit zu wenigen Antworten (< 20) zählen als „mittel“; ein Hinweis nennt, wie viele Fragen im Vorschlag so eingestuft wurden.
- [ ] Ausschluss-Optionen (alle standardmäßig an): gesperrte Fragen (PROJ-75), Fragen mit offener Meldung (PROJ-73), Fragen, die ich in den letzten N Nachweisen verwendet habe (N wählbar: 1, 3, 5, nie).
- [ ] Nur Fragen, die für Nachweise zulässig sind (aktiv, im richtigen Fachbereich, bei Bedarf „nur für Nachweise“ eingeschlossen).

### Ergebnis
- [ ] Der Vorschlag erscheint als Liste im Editor mit Fragetext (gekürzt), Thema, Schwierigkeit (Chip) und Lösungsquote.
- [ ] Oben steht eine Zusammenfassung: Anzahl nach Schwierigkeit, Verteilung nach Thema, geschätzte Bearbeitungszeit.
- [ ] Jede Frage lässt sich **entfernen**, **tauschen** (bietet 3 Alternativen gleichen Themas und gleicher Schwierigkeit) oder per Ziehen verschieben.
- [ ] „Neu würfeln“ erzeugt einen neuen Vorschlag mit denselben Angaben; „Fixierte“ Fragen (Schloss-Symbol) bleiben dabei erhalten.
- [ ] Gibt es nicht genug passende Fragen, wird so viel wie möglich vorgeschlagen und angezeigt, was fehlt („Für Thema X gibt es nur 4 von 7 gewünschten Fragen“); es wird nie mit Fragen aufgefüllt, die den Filtern widersprechen.
- [ ] Der Vorschlag wird erst durch „Übernehmen“ Teil des Nachweis-Entwurfs; bereits manuell gewählte Fragen bleiben auf Wunsch erhalten (Schalter „Zu meiner Auswahl hinzufügen“ statt „ersetzen“).

## Edge Cases
- Lehrkraft wählt ein Thema ohne Fragen: leerer Zustand mit Link zum Fragenimport.
- Gewünschte Anzahl größer als vorhandene Fragen: Anzahl wird auf das Mögliche begrenzt, mit Hinweis.
- Regler summieren nicht auf 100 %: Übernehmen-Knopf deaktiviert, Restwert wird angezeigt.
- Fragen mit Bild oder langem Fließtext: Zählen zur geschätzten Zeit mit höherem Wert (z. B. 1,5 ×), damit die Dauerschätzung nicht zu knapp ist.
- Zwei sehr ähnliche Fragen (gleiche Textanfänge) im Vorschlag: Der Vorschlag meidet Dubletten innerhalb desselben Themas, soweit möglich.
- Zufall: „Neu würfeln“ liefert nicht dieselben Fragen wie zuvor, solange Alternativen vorhanden sind.

## Technical Requirements
- Performance: Vorschlag unter 1 s bei 5000 Fragen im Pool (serverseitige Auswahl, kein Laden des gesamten Pools im Browser).
- Security: Nur Lehrkräfte mit Zugriff auf den Nachweis; antwortbezogene Quoten werden nicht an Azubis ausgeliefert.
- Keine KI, keine laufenden Kosten (regelbasierte Auswahl).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Ergebnis der Bestandsprüfung:** Vieles ist schon da und wird wiederverwendet:
- Der Zusammenstell-Editor (`assessment-question-selector`, `question-picker`) mit der Auswahl als Menge von Frage-IDs.
- Die Regel „welche Fragen sind für einen Nachweis zulässig" (aktiv, Multiple-Choice, richtiger Fachbereich, eigene private Fragen). Sie steckt in `assessment-questions.ts` und gilt auch beim Speichern. Der Vorschlag nutzt dieselbe Regel, damit er nie etwas vorschlägt, das beim Speichern abgelehnt würde.
- Die Lösungsquoten pro Frage aus PROJ-74 (Datenbank-Funktion `question_difficulty_stats`). Sie liefert nur Summen und keine Nutzerdaten. Lehrkräfte dürfen die Rohantworten nicht lesen, die Funktion darf es.
- Gesperrte Fragen (PROJ-75) und offene Meldungen (PROJ-73) sind bereits als Kennzeichen an den Fragen bzw. als Zähler in der PROJ-74-Funktion vorhanden.
- Jeder Nachweis speichert seine Fragen (Entwurf bzw. eingefroren beim Öffnen) und den Ersteller. Daraus lässt sich „in meinen letzten N Nachweisen verwendet" ableiten.

### A) Bausteine (Oberfläche)
```
Zusammenstell-Editor (besteht)
+-- Knopf „Vorschlag erstellen"  (neu)
|
+-- Dialog „Vorschlag erstellen"  (neu)
|   +-- Auswahl Fach (mehrere), Thema (mehrere, optional), Klassenstufe
|   +-- Anzahl Fragen (5–60)
|   +-- Schwierigkeitsmix
|   |   +-- Voreinstellungen: ausgewogen / eher leicht / eher schwer
|   |   +-- „eigene Verteilung": drei Regler, Rest-Anzeige bis 100 %
|   +-- Ausschlüsse (alle an): gesperrte Fragen, Fragen mit offener Meldung,
|   |   zuletzt verwendete (1 / 3 / 5 / nie)
|   +-- Schalter „Zu meiner Auswahl hinzufügen" statt „ersetzen"
|   +-- Knopf „Vorschlag erstellen"
|
+-- Vorschau des Vorschlags  (neu, im Dialog, vor dem Übernehmen)
|   +-- Zusammenfassung: Anzahl je Schwierigkeit, Verteilung je Thema,
|   |   geschätzte Bearbeitungszeit, Hinweis „x Fragen mangels Daten als mittel eingestuft"
|   +-- Hinweis, was fehlt („Für Thema X nur 4 von 7 Fragen")
|   +-- Liste der Vorschläge
|   |   +-- Frage (gekürzt), Thema, Schwierigkeits-Chip, Lösungsquote
|   |   +-- Aktionen: Schloss (fixieren), Tauschen (3 Alternativen), Entfernen, Ziehen
|   +-- Knöpfe: „Neu würfeln" (Fixierte bleiben) und „Übernehmen"
|
+-- Leerzustand: Thema ohne Fragen → Link zum Fragen-Import (besteht)
```
Der Dialog nutzt vorhandene shadcn-Bausteine (Dialog, Select, Slider, Switch, Badge). Es gibt keine neue Seite, alles bleibt im bekannten Editor.

### B) Daten (in Alltagssprache)
**Es wird nichts Neues dauerhaft gespeichert.** Der Vorschlag ist ein Entwurf im Dialog. Erst „Übernehmen" legt die gewählten Fragen in die normale Auswahl des Nachweis-Entwurfs. Danach läuft alles wie bisher (Speichern, Prüfung, Öffnen).

Pro Frage wird für den Vorschlag kurz berechnet und angezeigt:
- Schwierigkeit: leicht ab 75 % Lösungsquote, mittel 40–74 %, schwer unter 40 %.
- Bei weniger als 20 Antworten gilt „mittel", und diese Fragen werden gezählt (für den Hinweis).
- Geschätzte Bearbeitungszeit: Grundwert pro Frage, mit dem Faktor 1,5 bei Bild oder langem Text.

Die Lösungsquote bleibt in der Lehrkräfte-Ansicht. Azubis bekommen sie nie zu sehen, weil der Vorschlag nur über Lehrkräfte-Wege läuft.

**Backend nötig? Ja, ein kleines.** Die Auswahl muss auf dem Server laufen. Der Pool kann 5000 Fragen groß sein, und die Lösungsquoten dürfen nicht im Browser landen. Geplant ist eine neue Lehrkräfte-Route für den Vorschlag mit drei Aufgaben: erstellen/neu würfeln, Alternativen zum Tauschen liefern und die Lösungsquoten mitgeben. **Keine neue Tabelle.** Eine kleine Datenbank-Erweiterung ist wahrscheinlich nur nötig, falls die vorhandene Quoten-Funktion nicht für beliebige Fragen-Listen (statt nur Bereichs-Pool) taugt. Das klärt `/backend` anhand des Codes.

### C) Wie der Vorschlag ausgewählt wird (regelbasiert, ohne KI)
1. Zulässigen Pool bilden (gleiche Regel wie beim Speichern), dann nach Fach, Thema und Klassenstufe filtern.
2. Ausschlüsse anwenden: gesperrte Fragen, offene Meldungen, in den letzten N eigenen Nachweisen verwendete Fragen sowie bereits fixierte oder schon gewählte Fragen.
3. Jede Frage nach Lösungsquote einer Stufe zuordnen.
4. Die Wunschverteilung in Stückzahlen umrechnen. Rundungsreste gehen an die mittlere Stufe.
5. Pro Stufe zufällig ziehen, dabei möglichst gleichmäßig über die gewählten Themen verteilen und Fast-Dubletten (gleicher Textanfang im selben Thema) meiden.
6. Gibt es zu wenig Fragen, wird so viel wie möglich vorgeschlagen und der Fehlbetrag benannt. Es wird nie mit unpassenden Fragen aufgefüllt.
7. „Neu würfeln" meidet die zuvor vorgeschlagenen Fragen, solange Alternativen da sind. „Tauschen" nimmt Fragen gleichen Themas und gleicher Stufe.

### D) Technische Entscheidungen (und warum)
- **Auswahl auf dem Server:** schnell (Ziel unter 1 Sekunde) und die Quoten verlassen die Lehrkräfte-Seite nicht.
- **Keine neue Tabelle, kein Speichern des Vorschlags:** weniger Fehlerquellen. Der Nachweis bleibt die einzige Quelle der Wahrheit, und die bestehende Prüfung beim Speichern fängt alles Unzulässige ab.
- **Vorhandene Quoten-Funktion wiederverwenden:** dieselben Zählregeln wie bei „Was fällt allen schwer?", also keine zweite, abweichende Definition von „schwer".
- **Rein regelbasiert:** keine KI-Kosten, vorhersehbares Verhalten, leicht zu erklären.
- **Vorschau vor dem Übernehmen:** die Lehrkraft behält die Kontrolle, bereits gewählte Fragen bleiben auf Wunsch erhalten.
- **Tauschen und Fixieren nur im Dialog:** der Editor bleibt unverändert, sodass bestehende Abläufe nicht gestört werden.

### E) Abhängigkeit und Hinweis
- PROJ-74 ist laut Memory pausiert, die Quoten-Funktion existiert aber im Code (Migration 20261113). **Vor dem Bauen prüfen:** Ist diese Migration in Produktion eingespielt? Falls nicht, muss sie für PROJ-78 live gehen, sonst gelten alle Fragen als „mittel".
- Bis genug Antworten gesammelt sind, werden viele Fragen als „mittel" eingestuft. Der Hinweis im Ergebnis macht das für die Lehrkraft sichtbar.

### F) Pakete
Keine neuen Pakete nötig. Das Ziehen der Vorschläge nutzt, was der Editor bereits hat. Falls dort noch kein Ziehen existiert, reicht ein einfaches Hoch/Runter statt Drag-and-drop (Entscheidung bei `/frontend`).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
