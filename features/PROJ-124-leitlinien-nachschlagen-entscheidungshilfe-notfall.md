# PROJ-124: Leitlinien nachschlagen – Info-Seiten, Entscheidungshilfe „Darf ich weitergeben?“ und Notfall-Ansicht

## Status: Planned
**Created:** 2026-11-20
**Last Updated:** 2026-11-20

## Kontext
Nicht jede Handlungsleitlinie ist ein Ablauf. Sieben davon sind **Regelwerke zum Nachschlagen**, bei denen es nichts abzuhaken gibt, und zwei Teile brauchen eine eigene Darstellung:
- **Entscheidungshilfe:** „Weitergabe von Informationen an Ausbildungsbetriebe“ beantwortet im Kern die Frage „Darf ich das weitergeben, und wie?“.
- **Notfall-Ansicht:** „Erste Hilfe im Unterricht“ wird im Ernstfall gelesen, nicht abgehakt: große Schrift, Notrufnummern, kurze Schritte.

Dieses Feature liefert die Darstellung dieser Leitlinien im Look von PROJ-122 (Original grafisch aufbereitet), aber **ohne Haken**. Es nutzt den Text aus Schulrecht.

### Entscheidungen (Nutzer, 2026-11-19/20)
- **E1 – Teamstunden bleibt reine Info.**
- **E2 – „Wahl Ausschüsse“ nur als Info, ohne Namen.** Die Namensspalten sind in Schulrecht bereits entfernt; auch hier erscheinen keine Namen (auch nicht von Schülersprechern).
- **E4 – Zuständigkeiten mit Namen:** Die Reihenfolge der Vertretung der Schulleitung wird **mit den Namen** gezeigt (Nutzer, 2026-11-20), nur für Lehrer-Rollen und mit Stand der Leitlinie.
- **E3 – Notfall-Text bleibt wortgleich.** Medizinische und sicherheitsrelevante Angaben werden nicht umformuliert und nicht gekürzt.

## Dependencies
- Requires: PROJ-122 (Seitenrahmen, Original-Darstellung, Stand-Hinweis), PROJ-55/88 (Schulrecht-Text)
- Requires: PROJ-45 / PROJ-83 (Tokens, Bedienmuster)
- Berührt: PROJ-123 (Liste „Chronische Erkrankung melden“ verweist auf die Notfall-Ansicht)

## Die Seiten

| Seite | Art | Quelle | Inhalt in Kürze |
|---|---|---|---|
| Teamstunden | Info | 4.2.2 Teamstunden (02.04.2025) | Festlegung der Teams, 30 Stunden im Schuljahr, Planung bis Ende September, Protokoll je Sitzung |
| Aufsichtspflicht | Info | 4.2.2 Aufsichtspflicht (12.03.2025) | § 6 MLDO, Einteilung durch die stellvertretende Schulleitung, Aufsicht in der großen Pause wechselt jährlich |
| Zuständigkeiten bei Abwesenheit der Schulleitung | Info | 4.2.2 (23.06.2026) | § 29 MLDO, Reihenfolge der Vertretung mit Namen (E4) |
| Stundenausfall und Stundenmehrung | Info | 4.1.3 (07.04.2025) | Plus-/Minusstunden, Arbeitszeitkonto, Rechenbeispiel |
| Freie Unterrichtstage bei Vollzeit und Teilzeit | Info | 5.1.2 (07.04.2025) | Tabelle „bezahlte Stunden → Unterrichtstage“, Wunschzettel nach den Osterferien |
| Wahl der Ausschüsse | Info, ohne Namen | 3.2 (27.10.2025) | Disziplinar-, Lehr- und Lernmittel-, Kassenprüfungsausschuss, Berufsschulbeirat (nur Funktionen) |
| Weitergabe von Informationen an Ausbildungsbetriebe | Entscheidungshilfe | 1.4 (15.09.2025) | Was Betriebe und Erziehungsberechtigte erfahren müssen, was nicht (Noten) |
| Erste Hilfe im Unterricht | Notfall-Ansicht | 2.2.1 (07.10.2025) | Akute Notfälle, Medikamente, epileptischer Anfall |

## User Stories
- Als **Lehrkraft** möchte ich eine Regel wie „Freie Unterrichtstage“ schnell nachschlagen und gut lesbar sehen, damit ich nicht das PDF suchen muss.
- Als **Lehrkraft** möchte ich bei einem Anruf eines Ausbildungsbetriebs in wenigen Klicks erfahren, ob ich eine Information geben darf.
- Als **Lehrkraft** möchte ich im Notfall sofort sehen, was zu tun ist und welche Nummer ich wähle.
- Als **Lehrkraft** möchte ich wissen, wie aktuell eine Seite ist (Stand der Leitlinie).
- Als **Lehrkraft** möchte ich bei Teamstunden die Anforderungen (30 Stunden, Protokoll, Termine) im Überblick lesen.

## Acceptance Criteria

### Info-Seiten (6)
- [ ] Jede der sechs Info-Seiten zeigt den Text der Leitlinie einheitlich gesetzt: Titel, Überschriften, Absätze, Listen, Tabellen und Warnhinweise; dazu Stand, Zuständigkeit und „Gültig ab“.
- [ ] Gesetzes- und Verordnungstexte, die eine Leitlinie zitiert (z. B. MLDO § 6 oder § 29), erscheinen als Zitatblock, klar vom eigenen Text der Schule getrennt.
- [ ] Tabellen (z. B. „bezahlte Stunden → Unterrichtstage“) sind am Handy lesbar (scrollen in sich, erste Spalte bleibt stehen, wo sie die Zeile benennt, `ws-table-scroll` / `ws-table-sticky`).
- [ ] Jede Seite nennt das Original als verbindliche Quelle und zeigt den Stand; ändert sich die Leitlinie in Schulrecht, erscheint derselbe Hinweis wie in PROJ-122.
- [ ] Die Seiten sind in der Übersicht der Checklisten unter einem eigenen Abschnitt „Zum Nachschlagen“ zu finden.
- [ ] Die Suche der Übersicht findet auch diese Seiten über Alltagswörter.
- [ ] „Wahl der Ausschüsse“ enthält **keinen** Personennamen. Ein automatischer Test prüft das gegen eine Liste der im PDF vorkommenden Namen (Liste liegt nur im Test, nicht in der App).

### Entscheidungshilfe „Darf ich weitergeben?“
- [ ] Der Nutzer wählt in wenigen Schritten, **an wen** (Ausbildungsbetrieb, Erziehungsberechtigte) und **was** (Fehltage, Erziehungs- und Ordnungsmaßnahmen, deutlicher Leistungsabfall, Noten, ausbildungsbedeutsame Angelegenheiten) weitergegeben werden soll, und **wie** (telefonisch, schriftlich, Notenblatt).
- [ ] Die Antwort lautet je Kombination „Pflicht, baldmöglichst informieren“, „nicht vorgesehen“ oder „nur mit vorheriger schriftlicher Einwilligung der oder des Auszubildenden (bei Minderjährigen auch der Eltern)“, jeweils mit Verweis auf die Stelle im Original (BSO § 25 bzw. Stellungnahme der Rechtsabteilung).
- [ ] Kombinationen, die die Leitlinie nicht klärt, ergeben „In der Leitlinie nicht geregelt, bitte Schulleitung fragen“ und erfinden keine Antwort.
- [ ] Der Entscheidungsbaum steht neben dem Originaltext (wie bei PROJ-122: nebeneinander bzw. Tabs).
- [ ] Es werden keine Eingaben gespeichert (kein Protokoll von Nachfragen zu einzelnen Schülern).

### Notfall-Ansicht „Erste Hilfe im Unterricht“
- [ ] Die Ansicht hat große Schrift (mindestens 18 px Fließtext), kurze nummerierte Schritte und hohen Kontrast (auch im dunklen Modus).
- [ ] Die Notrufnummer 112 steht oben und ist am Handy per Tipp wählbar (`tel:`-Link). Das Sekretariat (und ersatzweise die Technische Hausverwaltung) steht direkt darunter, ebenfalls wählbar. Die Nummern stammen aus der Leitlinie und werden mit Stand angezeigt.
- [ ] Die Reihenfolge der Schritte entspricht exakt der Leitlinie: Erste-Hilfe-Maßnahmen einleiten, Notruf 112, Sekretariat informieren, weitere Lehrkraft zur Unterstützung, Rettungskräfte einweisen (Schranke, Aufzug, zweites Fahrzeug), nach dem Zielkrankenhaus fragen, Erziehungsberechtigte bei Minderjährigen informieren.
- [ ] Die Abschnitte „Abgabe von Medikamenten“ und „Erste Hilfe bei epileptischem Anfall“ stehen **wortgleich** wie im Original (Test gegen den Schulrecht-Text).
- [ ] Es gibt **keine Haken** und keine Speicherung.
- [ ] Die Ansicht ist von jeder Seite im Lehrkräfte-Bereich in einem Klick erreichbar (Symbol in der Kopfzeile) und lädt schnell (unter 1 s bei normaler Verbindung). Eine Offline-Verfügbarkeit gehört nicht zu diesem Feature (siehe Offene Fragen).
- [ ] Unterhalb steht der Teil „Schwere chronische Erkrankungen“ mit Verweis auf die Checkliste „Chronische Erkrankung oder Allergie melden“ (PROJ-123).

### Allgemein
- [ ] Alle Seiten gehören zum Lehrkräfte-Bereich (Lehrkraft, Bereichs-Admin, Super-Admin); Azubis sehen sie nicht. Proxy-Listen und Wächtertests wie in PROJ-122.
- [ ] Alle Farben aus `ws-*`-Tokens, Bedienelemente mindestens 44 × 44 px, Fokus sichtbar, Druck hell auf weiß.
- [ ] Vor dem Livegang liest eine unabhängige Prüfung (Opus) Entscheidungsbaum und Notfall-Ansicht gegen das Original. Die Notfall-Ansicht geht erst nach ausdrücklicher Freigabe durch den Nutzer live.

## Edge Cases
- **Leitlinie ändert sich:** Stand-Hinweis wie in PROJ-122; bei der Notfall-Ansicht zusätzlich ein Hinweis „Bitte im Original prüfen“, bis die Seite angepasst ist.
- **Telefonnummern ändern sich:** Die Nummern stehen nur dort, wo die Leitlinie sie nennt, und gehören zum Stand. Änderungen laufen über die Leitlinie, nicht über freie Eingabe in der App.
- **Entscheidungshilfe zu telefonischen Auskünften:** Die Rechtsabteilung sagt, dass telefonische Auskünfte nur mit vorheriger schriftlicher Zustimmung möglich sind; die Hilfe darf das nicht abschwächen und nicht verschärfen.
- **Zuständigkeiten mit Namen:** Die Reihenfolge besteht aus Personennamen und ändert sich (die Leitlinie nennt dafür einen jährlichen Hinweis in der Anfangskonferenz). Die Seite zeigt immer den Stand; bei geänderter Leitlinie erscheint der Hinweis aus PROJ-122.
- **Sehr kleine Bildschirme / Querformat:** Tabellen scrollen in sich, nichts läuft seitlich aus dem Bild.
- **Sehbehinderung / Screenreader:** Nummern- und Schrittlisten sind echte Listen; Telefonlinks haben ein verständliches Label („Notruf 112 anrufen“).
- **Versehentlicher Notruf:** Der `tel:`-Link wählt nicht selbst; Handy und Betriebssystem zeigen ihre übliche Bestätigung.
- **Kopierte Auskünfte:** Die Entscheidungshilfe gibt keine Rechtsberatung; ein kurzer Hinweis nennt die Rechtsabteilung bzw. die Schulleitung für Einzelfälle.

## Offene Fragen
- **Offline für die Notfall-Ansicht:** Soll sie auch ohne Netz im Handy verfügbar sein? Das wäre ein eigener Ausbau (Zwischenspeicherung) und hängt von der Schulleitung ab.
- **Telefonnummer der Technischen Hausverwaltung** (Mobilnummer in der Leitlinie): darf sie in der App stehen?
- **Entscheidungshilfe:** Soll sie auch für die Weitergabe an Dritte außerhalb von Betrieb und Erziehungsberechtigten gelten (z. B. Berufsberatung)? Die Leitlinie regelt das nicht.
- **Zusammenfassung des Ausschuss-Textes:** Ist die Darstellung der Zusammensetzung des Berufsschulbeirats (nur Funktionen) für die Kolleginnen und Kollegen ausreichend?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
