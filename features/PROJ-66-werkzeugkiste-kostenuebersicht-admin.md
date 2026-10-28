# PROJ-66: Werkzeugkiste – Kostenübersicht für den Super-Admin

## Status: Planned
**Created:** 2026-10-28
**Last Updated:** 2026-10-28

## Kontext
Der Super-Admin lädt das Guthaben beim KI-Anbieter vorab auf (PROJ-64, E5). Er braucht eine Übersicht, wie viel insgesamt und je Lehrkraft verbraucht wurde, um rechtzeitig nachzuladen und die Kosten gegenüber Schule oder Förderverein belegen zu können.

## Dependencies
- Requires: PROJ-64 (Kostenerfassung je Lauf)
- Requires: PROJ-24/49 (Rolle Super-Admin)

## User Stories
- Als **Super-Admin** möchte ich sehen, wie viel die direkte Erstellung diesen Monat insgesamt gekostet hat, damit ich weiß, wann ich nachladen muss.
- Als **Super-Admin** möchte ich den Verbrauch je Lehrkraft sehen, damit ich die Nutzung einschätzen und bei Bedarf ansprechen kann.
- Als **Super-Admin** möchte ich das aufgeladene Guthaben eintragen und das ungefähre Restguthaben sehen, damit ich nicht erst beim Fehler merke, dass es leer ist.
- Als **Super-Admin** möchte ich die Übersicht als Tabelle herunterladen, damit ich sie für die Abrechnung weitergeben kann.

## Acceptance Criteria

### Zugang
- [ ] Die Seite **„KI-Kosten“** liegt in der Gruppe „Verwaltung“ der Seitenleiste und ist **nur für den Super-Admin** sichtbar und erreichbar. Lehrkräfte und Bereichs-Admins werden umgeleitet bzw. erhalten 403 (wie andere reine Verwaltungsseiten).

### Übersicht
- [ ] Oben stehen drei Kennzahlen: **Verbrauch im gewählten Monat**, **Verbrauch seit Beginn** (bzw. seit der letzten Aufladung) und **Restguthaben (ca.)**.
- [ ] Das Restguthaben ergibt sich aus den eingetragenen Aufladungen minus dem erfassten Verbrauch. Es steht dort der Hinweis „ca. – maßgeblich ist das Konto beim Anbieter“.
- [ ] Fällt das Restguthaben unter eine einstellbare Warnschwelle (Standard 5 €), erscheint auf der Seite und auf der Startseite des Super-Admins ein orangefarbener Hinweis „Guthaben fast aufgebraucht“.
- [ ] Wurde zuletzt „Guthaben leer“ gemeldet (PROJ-64), steht ein roter Hinweis mit Datum: „Seit 12.11. ist die direkte Erstellung gesperrt. Lade beim Anbieter nach.“

### Je Lehrkraft
- [ ] Eine Tabelle zeigt je Lehrkraft für den gewählten Monat: Name, Anzahl Läufe, Betrag. Standardmäßig ist sie nach Betrag absteigend sortiert, Name und Anzahl sind ebenfalls sortierbar.
- [ ] Ein Klick auf eine Zeile klappt die einzelnen Läufe der Person auf (Datum, Werkzeug, Skript, Betrag).
- [ ] Mit einer Monatsauswahl lassen sich frühere Monate ansehen.
- [ ] Die Summe aller Zeilen stimmt mit der Kennzahl „Verbrauch im gewählten Monat“ überein.

### Guthaben & Einstellungen
- [ ] Der Super-Admin trägt Aufladungen ein (Datum, Betrag in Euro, optional Notiz). Die Liste der Aufladungen ist sichtbar, ein Eintrag lässt sich nach Rückfrage löschen.
- [ ] Er pflegt den Umrechnungskurs Dollar → Euro (PROJ-64) und die Warnschwelle. Ein geänderter Kurs gilt nur für **neue** Läufe, alte Beträge bleiben unverändert.

### Export
- [ ] „Als CSV herunterladen“ liefert alle Läufe des gewählten Monats (Datum, Lehrkraft, Werkzeug, Skript, Modell, Betrag in Euro und im Original).

## Edge Cases
- **Lehrkraft-Konto gelöscht:** Die Läufe bleiben für die Abrechnung erhalten und erscheinen als „Gelöschtes Konto“, ohne Namen.
- **Keine Aufladung eingetragen:** Statt des Restguthabens steht „Noch keine Aufladung eingetragen“ mit einem Knopf „Aufladung eintragen“.
- **Fragen-Generator (PROJ-10) nutzt dasselbe Guthaben:** Dessen Verbrauch wird hier nicht erfasst. Das Restguthaben ist dann zu hoch geschätzt. Deshalb steht dort der Hinweis „ca.“, und das wird in einem Satz auf der Seite erklärt.
- **Leerer Monat:** Kennzahl 0,00 € und Leerzustand in der Tabelle („In diesem Monat wurde nichts direkt erstellt.“).
- **Viele Lehrkräfte (> 50):** Die Tabelle scrollt in ihrem Rahmen (`ws-table-scroll`), mit einer Suche nach Namen.

## Technical Requirements
- **Sicherheit:** Nur der Super-Admin liest fremde Kostendaten, geprüft auf dem Server und durch Zeilen-Regeln. Bereichs-Admins sehen keine Kosten anderer.
- **Design:** Lehrkräfte-Bereich (PROJ-45), höchstens eine grüne Hauptaktion („Aufladung eintragen“).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
