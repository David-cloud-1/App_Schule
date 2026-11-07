# PROJ-79: Nachweis duplizieren & schwache Fragen ersetzen

## Status: Planned
**Created:** 2026-11-07
**Last Updated:** 2026-11-07

## Dependencies
- Requires: PROJ-21 (Nachweise), PROJ-27 (Zusammenstell-Editor)
- Optional: PROJ-75 (Ampel zeigt, welche Fragen ersetzt werden sollten), PROJ-78 (Ersatz-Vorschläge), PROJ-76 (Gruppeneinstellung wird übernommen)

## Summary
Aus einem bestehenden Nachweis wird mit einem Klick ein neuer Entwurf mit denselben Einstellungen und Fragen. Schwache oder auffällige Fragen aus dem alten Durchlauf werden markiert und gezielt durch passende Ersatzfragen ausgetauscht. Ideal für den Nachweis des nächsten Schuljahres oder einer Parallelklasse.

## User Stories
- Als **Lehrkraft** möchte ich einen früheren Nachweis kopieren, damit ich nicht von vorn anfange.
- Als **Lehrkraft** möchte ich im Entwurf sehen, welche Fragen beim letzten Mal schlecht liefen, damit ich sie austauschen kann.
- Als **Lehrkraft** möchte ich für eine Frage einen passenden Ersatz gleichen Themas und gleicher Schwierigkeit bekommen, damit der Nachweis vergleichbar bleibt.
- Als **Lehrkraft** möchte ich, dass beim Kopieren keine Ergebnisse oder Teilnehmer mitkommen.

## Acceptance Criteria

### Duplizieren
- [ ] In der Nachweis-Liste und auf der Detailseite gibt es „Duplizieren“ (nicht als grüne Hauptaktion, sondern als `outline`-Aktion im Menü).
- [ ] Der Entwurf übernimmt: Fragenliste in der Reihenfolge, Fachbereich, Kategorie (PROJ-39), Dauer, Notenschlüssel, Mischeinstellung, Gruppenoption (PROJ-76), Anzeigeoptionen.
- [ ] Der Entwurf übernimmt **nicht**: Beitrittscode (neuer wird erzeugt), Zeitfenster (leer), Teilnehmer, Ergebnisse, Fokus-Protokoll, Freigabestatus, Nachteilsausgleich (PROJ-80).
- [ ] Titel wird „<Titel> (Kopie)“ und ist im Editor sofort änderbar; der Nachweis steht als Entwurf in der Liste mit Hinweis „Kopie von …“ (Link zum Original).
- [ ] Wer den Nachweis nicht sehen darf, kann ihn nicht duplizieren (gleiche Rechteprüfung wie beim Ansehen).

### Schwache Fragen markieren und ersetzen
- [ ] Im Editor des kopierten Entwurfs zeigt jede Frage, soweit PROJ-75 vorhanden ist, die Ampel aus dem Original-Durchlauf (Lösungsquote, Trennschärfe) als Chip; rote und gelbe lassen sich per Filter „Nur auffällige“ anzeigen.
- [ ] Je Frage die Aktion „Ersetzen“: bietet bis zu 5 Ersatzfragen mit gleichem Thema und ähnlicher Schwierigkeit (Regeln wie PROJ-78), die nicht schon im Entwurf stehen und nicht gesperrt sind.
- [ ] Sammelaktion „Alle auffälligen ersetzen“ erzeugt für jede auffällige Frage den besten Ersatz und zeigt eine Vorschau, bevor etwas übernommen wird.
- [ ] Ersetzen behält die Position der Frage im Nachweis.
- [ ] Fehlt PROJ-75-Datenbasis (weil das Original nie ausgewertet wurde), zeigt der Editor die Ampel nicht, „Ersetzen“ bleibt manuell möglich.

## Edge Cases
- Frage im Original ist inzwischen gelöscht oder deaktiviert: Platzhalterzeile „Frage nicht mehr verfügbar“ mit sofortigem „Ersetzen“; ein Entwurf mit Platzhalter lässt sich nicht starten.
- Frage wurde seit dem Original geändert (PROJ-47): Chip „Frage geändert seit dem letzten Nachweis“, damit die Ampel nicht blind übernommen wird.
- Kein Ersatz vorhanden (Thema leer gespielt): Hinweis mit Link zum Fragenimport (PROJ-38).
- Original wird nach dem Kopieren gelöscht: Kopie bleibt unabhängig (kein Verweis nötig außer dem Titelhinweis).
- Mehrfaches Duplizieren: Titel zählen hoch („(Kopie 2)“), kein Fehler.
- Duplizieren eines Nachweises aus fremdem Fachbereich (nur Super-Admin oder Inhalte offen nach PROJ-70): Der Entwurf gehört dem Fachbereich der duplizierenden Person, nicht dem Original.

## Technical Requirements
- Performance: Duplizieren unter 1 s, rein serverseitig.
- Security: Rechteprüfung auf dem Original und auf dem Zielbereich; Aktion im Protokoll (wer, wann, Quelle).
- Keine KI, keine laufenden Kosten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
