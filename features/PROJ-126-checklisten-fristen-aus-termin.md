# PROJ-126: Checklisten – Fristen aus einem Termin berechnen

## Status: Planned
**Created:** 2026-11-20
**Last Updated:** 2026-11-20

## Kontext
Viele Schritte der Leitlinien hängen an einem **Termin**: „mindestens 14 Tage vor der Reise“, „zwei Wochen vor der Abschlussfeier“, „spätestens drei Tage vor Ausgabe der Zeugnisse“. Andere haben **feste Stichtage im Schuljahr**: Bis 15. Oktober, bis Ende September, nach dem 20. Oktober, zum 1. Juli.

In PROJ-122/123 stehen Fristen als Text. Dieses Feature rechnet sie **aus einem eingegebenen Termin** in konkrete Daten um und zeigt, was fällig oder überfällig ist. Es ist der letzte Baustein und eine Zusatzfunktion; die Listen funktionieren ohne ihn.

Es gibt **keine Benachrichtigungen** (Web-Push ist zurückgestellt, PROJ-18). Die Fälligkeit zeigt sich nur in der App, wenn man hineinschaut.

## Dependencies
- Requires: PROJ-122 (Grundgerüst), PROJ-123 (Listen mit hinterlegten Fristen)
- Berührt: PROJ-81 (Startseite „Zu erledigen“, siehe Offene Fragen), PROJ-120 (Abwesenheitskalender, Schuljahres-Termine)

## Welche Fristen es gibt

| Liste | Art | Frist (laut Leitlinie) |
|---|---|---|
| Dienstreise beantragen | relativ zur Reise | Antrag mindestens 14 Tage vorher |
| Reisekosten abrechnen | relativ zum Reiseende | Antrag innerhalb von sechs Monaten nach der Reise (alle Reisen laut Nutzer, von der Schulleitung noch zu bestätigen, siehe PROJ-122 E10) |
| Zeugnisse abgeben | relativ zur Ausgabe | spätestens drei Tage vor Ausgabe an die Schüler/innen |
| Abschlussfeier vorbereiten | relativ zur Feier | zwei Wochen vorher: Urkunden-Namen und Liedwünsche erfragen; eine Woche vorher: Liedwünsche melden, Zeugnisse im Sekretariat abgeben |
| Prüfungswesen melden | relativ zum Prüfungstermin | Liste spätestens zwei Wochen vorher |
| Fächerbefreiung erfassen | Stichtag im Schuljahr | Anträge bis 15. Oktober (Leitlinie) bzw. 10. Oktober (Formular). Beide Stichtage werden angezeigt (PROJ-123 E6) |
| Krankmeldung | relativ zum Tag | bis 07:30 Uhr am Tag selbst; Attest ab Tag 4 |
| Attestpflicht | relativ zum Attest | Attest innerhalb von zehn Tagen |
| Klassentagebuch abgeben | Stichtag je Klasse | frühestens am letzten Schultag der Klasse |

## User Stories
- Als **Lehrkraft** möchte ich bei meiner Dienstreise das Reisedatum eingeben und sehen, bis wann der Antrag spätestens vorliegen muss.
- Als **Klassenleitung** möchte ich das Datum der Abschlussfeier eingeben und sehen, wann ich Urkunden-Namen, Liedwünsche und Zeugnisse abgeben muss.
- Als **Klassenleitung** möchte ich für die Zeugnisse das Ausgabedatum eingeben und die Abgabefrist sehen.
- Als **Lehrkraft** möchte ich sehen, welche Schritte überfällig sind, damit ich sie zuerst erledige.
- Als **Lehrkraft** möchte ich, dass die Schuljahres-Stichtage (z. B. 15. Oktober) automatisch im richtigen Jahr stehen.

## Acceptance Criteria

### Termin eingeben
- [ ] Listen mit termin-bezogenen Fristen haben oben ein Datumsfeld mit passender Beschriftung („Datum der Reise“, „Datum der Abschlussfeier“, „Ausgabe der Zeugnisse“, „Prüfungstermin“). Der Termin gehört zum **Durchlauf** und wird mit diesem gespeichert.
- [ ] Datumsfelder verwenden das deutsche Format (TT.MM.JJJJ) und lassen sich per Tastatur und Touch bedienen.
- [ ] Ohne Termin zeigt die Liste die Fristen wie in PROJ-122 als Text; mit Termin kommen berechnete Daten dazu.

### Berechnung
- [ ] Fristen mit „Tage“ rechnen mit **Kalendertagen** („mindestens 14 Tage vor“ = Termin minus 14 Kalendertage, einschließlich); Fristen mit „Wochen“ entsprechend (7 Tage je Woche); Fristen mit „Monaten“ rechnen mit Kalendermonaten (sechs Monate nach der Reise = gleicher Tag sechs Monate später).
- [ ] Fällt eine berechnete Frist auf ein Wochenende, wird sie **nicht verschoben**, aber mit Wochentag angezeigt („Fr 16.10.2026“); das Wochenende wird als Hinweis genannt („fällt auf ein Wochenende, besser früher abgeben“).
- [ ] Ferien und Feiertage werden nicht berücksichtigt (die Leitlinien nennen sie nicht). Eine Frist in den Ferien bleibt angezeigt, ein Hinweis nennt, dass die Schule dann nicht besetzt ist (Schulferienkalender: siehe Offene Fragen).
- [ ] Stichtage im Schuljahr (z. B. 15. Oktober, Ende September, 1. Juli, 20. Oktober) werden dem **laufenden Schuljahr** zugeordnet (Schuljahr beginnt am 1. August). Liegt der Stichtag schon vorbei, wird er für das **nächste** Vorkommen angezeigt, mit Hinweis.
- [ ] Alle Berechnungen sind durch automatische Tests mit festen Daten abgedeckt (Beispiele: 14 Tage vor einem Montag; sechs Monate nach 31. August; Schaltjahr; Stichtag vor/nach 1. August).

### Anzeige
- [ ] Jeder Schritt mit Frist zeigt das berechnete Datum und eine Statusmarke: **offen**, **bald fällig** (innerhalb von 3 Tagen, wählbar fest im Code), **überfällig**, **erledigt**. Status wird nicht nur durch Farbe vermittelt, sondern auch durch Text und Symbol.
- [ ] Ein Zähler oben nennt Überfälliges („1 Schritt überfällig“).
- [ ] Abgehakte Schritte gelten nie als überfällig.
- [ ] Wird der Termin geändert, werden die Fristen neu berechnet; Haken bleiben unberührt.
- [ ] Liegt der Termin in der Vergangenheit, fragt die Liste „Ist der Termin richtig?“ und zeigt trotzdem alle Fristen.
- [ ] Ein Hinweis erklärt, dass die App **nicht von selbst erinnert** (keine Mitteilungen).

### Verknüpfung mit anderen Teilen
- [ ] In der Übersicht (PROJ-122) kann man nach „Fällig“ sortieren oder filtern: angefangene Listen mit überfälligen oder bald fälligen Schritten stehen oben.
- [ ] Optional (siehe Offene Fragen): Die Startseiten-Karte „Zu erledigen“ (PROJ-81) nennt „2 Checklisten mit fälligen Schritten“.

## Edge Cases
- **Mehrere Termine in einer Liste** (z. B. Feier und Ausgabe): jeder Termin hat ein eigenes Datumsfeld; Schritte beziehen sich auf den richtigen.
- **Kein Termin bekannt:** Die Liste funktioniert weiter; berechnete Daten fehlen, Fristen stehen als Text.
- **Frist liegt in der Vergangenheit beim Start:** Schritt gilt sofort als überfällig, Hinweis „Der Termin liegt zu nah“ statt Fehlermeldung.
- **Zeitzone und Sommerzeit:** Alle Daten sind reine Kalendertage ohne Uhrzeit, in der Zeitzone Europe/Berlin; keine Verschiebung durch Sommerzeit.
- **Fristen in Stunden** (z. B. „bis 07:30 Uhr“ bei der Krankmeldung): werden als Text mit Uhrzeit angezeigt, nicht als Status berechnet.
- **Termin ändert sich nach Fristablauf:** Die Neuberechnung ändert Status entsprechend; keine Historie der Fristen.
- **Schuljahreswechsel:** Stichtage springen am 1. August zum neuen Schuljahr; laufende Durchläufe behalten ihre berechneten Daten.
- **Leitlinie ändert Frist (z. B. von 14 auf 21 Tage):** Wird die Liste angepasst, rechnen laufende Durchläufe mit der neuen Frist; ein Hinweis nennt die Änderung.

## Technical Requirements
- Alle Rechenregeln liegen an **einer** Stelle und haben Tests mit festen Beispielen; Listen verweisen nur auf Frist-Art und Zahl.
- Daten werden als reine Datumswerte gespeichert, ohne Uhrzeit.
- Keine neuen externen Dienste, keine Benachrichtigungen.

## Offene Fragen
- **Schulferien und Feiertage berücksichtigen?** Die Leitlinien nennen sie nicht. Vorschlag: nicht rechnen, nur Hinweis. Falls gewünscht, bräuchte es einen Ferienkalender (Bayern) in der App.
- **Startseiten-Karte „Zu erledigen“ (PROJ-81)** um fällige Checklisten ergänzen?
- **„Bald fällig“ = 3 Tage:** passende Grenze? Eventuell je Liste unterschiedlich.
- **Fächerbefreiung:** Welche Frist gilt endgültig, 15. oder 10. Oktober? Bis dahin werden beide angezeigt, die frühere als „besser bis“.
- **Reisekosten:** Schulleitung bestätigt die Sechs-Monats-Frist für Dienstreisen (gleiche Frage wie PROJ-122, E10)?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
