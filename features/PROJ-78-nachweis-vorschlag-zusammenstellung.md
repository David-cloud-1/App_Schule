# PROJ-78: Nachweis in zwei Klicks – Vorschlag nach Thema, Anzahl & Schwierigkeit

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
