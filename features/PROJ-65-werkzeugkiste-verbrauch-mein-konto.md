# PROJ-65: Werkzeugkiste – Mein Verbrauch (im eigenen Konto)

## Status: Architected
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

### Überblick in einem Satz
Eine neue Karte auf „Mein Konto“ liest die eigenen Läufe, die PROJ-64 schon speichert, und zeigt Monatssumme und Liste. Es entsteht **keine neue Tabelle und kein neuer Server-Aufruf**.

### Wo die Daten herkommen
- Alles steht schon in der Tabelle der Läufe (PROJ-64): Datum, Werkzeug, Dateiname, Status und der genaue Betrag in Euro.
- Die Lehrkraft darf dank der vorhandenen Zugriffsregel **nur ihre eigenen** Läufe lesen. Die Seite fragt mit der normalen Anmeldung der Person, nicht mit Sonderrechten. Fremde Daten sind damit auch bei einem Programmierfehler nicht erreichbar.
- Die Seite lädt die Läufe der letzten Zeit (höchstens 500, neueste zuerst) und rechnet **in der Seite** zusammen: Summe je Monat, Anzahl, Liste. Bei der erwarteten Nutzung (wenige Läufe je Woche) ist das winzig und braucht keine eigene Abfrage je Monat.
- Monate werden nach **deutscher Zeit** gebildet (Europe/Berlin), damit ein Lauf um 00:30 Uhr im richtigen Monat landet.

### Komponentenaufbau
```
Mein Konto (vorhandene Seite)
+-- … bisherige Karten …
+-- NEU: Karte „Werkzeugkiste – mein Verbrauch“   (gleicher Rahmen wie die anderen Karten)
    +-- Kopfzeile: Titel + Monatsauswahl (nur Monate mit Verbrauch + laufender Monat)
    +-- Kennzahl: „1,84 €“  +  „aus 12 direkten Erstellungen“
    +-- Liste der Läufe des Monats (neueste zuerst, zuerst 10, „Mehr anzeigen“)
    |   +-- Zeile: Datum · Werkzeug · Titel/Dateiname · Betrag   (+ Zusatz „abgebrochen“)
    +-- Leerzustand: „Du hast die direkte Erstellung noch nicht genutzt …“
    +-- Fehlerzustand: wie die übrigen Karten („Erneut versuchen“)
    +-- Fußhinweis: „Beträge ca., umgerechnet aus US-Dollar“
```
- Die Monatsauswahl ist die einzige Stelle, die interaktiv ist. Sie wechselt den Monat über die Adresse der Seite (`?verbrauch=2026-10`), so bleibt der Monat beim Neuladen erhalten und die Karte bleibt eine reine Serverkarte.
- „Mehr anzeigen“ blendet die schon geladenen Einträge ein (kein neuer Aufruf).
- Genutzt werden vorhandene Bausteine: Karten-Rahmen von „Mein Konto“, Auswahlfeld (Select), Leerzustand. Neue Bausteine entstehen nur für die Karte selbst und die Monatsauswahl.

### Darstellung von Zeilen und Beträgen
- Datum kurz („28.10.“), Werkzeug mit seinem Namen aus der Werkzeugliste, Titel = Dateiname des Skripts (der Entwurf selbst kann nach 7 Tagen weg sein, der Eintrag bleibt).
- Beträge mit zwei Nachkommastellen, unter einem Cent „< 0,01 €“. Die Summe rechnet mit den genauen Werten, nicht mit den gerundeten.
- Läufe ohne Kosten (Abbruch vor dem ersten KI-Aufruf) erscheinen nicht.
- Auf dem Handy bricht jede Zeile in zwei Zeilen um (oben Datum + Betrag, darunter Werkzeug + Titel), es gibt keinen seitlichen Bildlauf.

### Tech-Entscheidungen (warum)
| Entscheidung | Warum |
|---|---|
| Serverseitig laden wie die übrigen Karten | „Mein Konto“ lädt schon alles auf dem Server, und jede Karte fängt eigene Fehler auf, ohne die anderen zu stören. |
| Normale Anmeldung statt Sonderrechte | Die Zugriffsregel in der Datenbank erledigt den Schutz. Weniger Code, weniger Risiko. |
| Monat in der Adresse | Neuladen und Zurück-Knopf funktionieren, und die Karte braucht keinen Zustand im Browser. |
| Zusammenrechnen in der Seite | Wenige Zeilen. Eine eigene Datenbankfunktion wäre mehr Aufwand ohne Nutzen. |
| Keine neue Migration | Alle Spalten sind seit PROJ-64 da. |

### Abhängigkeiten
- Keine neuen Pakete, keine Datenbankänderung.

### Umfang des Baus
- Kein Backend nötig (nur eine Abfrage in den vorhandenen Ladefunktionen von „Mein Konto“).
- Oberfläche: eine Karte, eine Monatsauswahl, ein paar Rechenfunktionen mit Tests.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
