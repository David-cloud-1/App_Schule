# PROJ-65: Werkzeugkiste – Mein Verbrauch (im eigenen Konto)

## Status: Planned
**Created:** 2026-10-28
**Last Updated:** 2026-10-28

## Kontext
Mit PROJ-64 kostet „Direkt erstellen“ Geld aus dem Schulguthaben. Jede Lehrkraft soll nachvollziehen können, was sie selbst verbraucht hat. Das soll nicht kontrollieren, sondern Transparenz schaffen, damit jede Person selbst entscheidet, wann sie den kostenlosen Weg nimmt.

## Dependencies
- Requires: PROJ-64 (Kostenerfassung je Lauf)
- Requires: PROJ-50 (Seite „Mein Konto“)

## User Stories
- Als **Lehrkraft** möchte ich in „Mein Konto“ sehen, wie viel ich diesen Monat verbraucht habe, damit ich mein Nutzungsverhalten einschätzen kann.
- Als **Lehrkraft** möchte ich eine Liste meiner einzelnen Läufe mit Betrag sehen, damit ich weiß, welches Material wie viel gekostet hat.
- Als **Lehrkraft** möchte ich frühere Monate ansehen, damit ich meinen Verbrauch über das Schuljahr verfolgen kann.

## Acceptance Criteria
- [ ] In „Mein Konto“ gibt es einen Abschnitt **„Werkzeugkiste – mein Verbrauch“**.
- [ ] Oben steht eine Zahl: **Verbrauch im laufenden Monat** in Euro (z. B. „1,84 €“), darunter in einem Satz die Zahl der Läufe („aus 12 direkten Erstellungen“).
- [ ] Darunter steht eine Liste der Läufe des gewählten Monats, die neuesten zuerst: Datum, Werkzeug, Titel bzw. Dateiname des Skripts, Betrag. Die Liste zeigt höchstens 10 Einträge und lässt sich mit „Mehr anzeigen“ erweitern.
- [ ] Mit einer Monatsauswahl lassen sich frühere Monate ansehen. Es gibt Monate mit Verbrauch und den laufenden Monat.
- [ ] Abgebrochene Läufe mit Kosten stehen mit dem Zusatz „abgebrochen“ in der Liste.
- [ ] Ohne einen direkten Lauf erscheint ein Leerzustand: „Du hast die direkte Erstellung noch nicht genutzt. Der kostenlose Weg mit deiner eigenen KI verbraucht nichts.“
- [ ] Jede Lehrkraft sieht ausschließlich ihre eigenen Läufe. Ein Zugriff auf fremde Daten liefert keine Daten (auch nicht über die Schnittstelle).
- [ ] Beträge sind in Euro mit zwei Nachkommastellen. Wird umgerechnet (PROJ-64), steht ein kurzer Hinweis „Beträge ca., umgerechnet aus US-Dollar“.

## Edge Cases
- **Ablauf wurde gelöscht (7 Tage):** Der Kosteneintrag bleibt mit Werkzeug und Dateiname sichtbar, nur ein Link zum Ablauf entfällt.
- **Betrag unter 1 Cent:** Die Anzeige lautet „< 0,01 €“, die Summe rechnet mit dem genauen Wert.
- **Monatswechsel:** Maßgeblich ist der Start des Laufs in deutscher Zeit (Europe/Berlin).
- **Super-Admin oder Bereichs-Admin:** Sie sehen in „Mein Konto“ ebenfalls nur den eigenen Verbrauch. Die Gesamtübersicht steht in PROJ-66.
- **Handy:** Die Liste stapelt sich (Datum + Betrag in einer Zeile, Werkzeug + Titel darunter), es entsteht keine seitliche Scrollleiste.

## Technical Requirements
- **Sicherheit:** Die Kostendaten sind durch Zeilen-Regeln geschützt: Nur die eigene Person liest ihre Einträge, niemand schreibt sie aus dem Browser.
- **Design:** Lehrkräfte-Bereich (PROJ-45): `ws-*`-Tokens, `AdminLoadingState`/`AdminEmptyState`/`AdminErrorState`.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
