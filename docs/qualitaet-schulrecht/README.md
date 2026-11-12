# Schulrecht – Opus-Gegenprüfung der Aufbereitung (PROJ-88)

**Stand:** 2026-11-12

**Was geprüft wurde:** Zu jeder der 659 Normen hat Sonnet in 19 Teilläufen eine Kurzfassung in Alltagssprache geschrieben, dazu bei langen Normen je Absatz eine Kernaussage, außerdem Beispielfragen und Stichworte. Die Daten liegen im Werkzeugkiste-Repository unter `schulrecht_aufbereitung/`. Opus hat jede Norm in 9 Teilen gegen den Wortlaut geprüft und Fehler direkt in den Dateien korrigiert.

| Bericht | Normen | korrigierte Kurzfassungen |
|---|---|---|
| [BayEUG Art. 1–64](pruefung-bayeug-1.md) | 70 | 22 |
| [BayEUG Art. 65–125](pruefung-bayeug-2.md) | 67 | 17 |
| [BaySchO](pruefung-bayscho.md) | 50 | 15 |
| [BSO, Handlungsleitlinien, UrhG](pruefung-bso-hll-urhg.md) | 56 | 15 |
| [MLDO, BayDSG](pruefung-mldo-baydsg.md) | 84 | 23 |
| [BayBG](pruefung-baybg.md) | 130 | 15 |
| [BayPVG](pruefung-baypvg.md) | 103 | 20 |
| [DSGVO Art. 1–50](pruefung-dsgvo-1.md) | 50 | 8 |
| [DSGVO Art. 51–99](pruefung-dsgvo-2.md) | 49 | 8 |
| **Summe** | **659** | **143 (gut jede fünfte)** |

Außerdem wurden zahlreiche Kernaussagen korrigiert, Beispielfragen entfernt, die die Norm gar nicht beantwortet, und irreführende Stichworte gestrichen. Die Zahlen stehen in den einzelnen Berichten.

## Fehlerarten

Die Fehler gehen fast immer in dieselbe Richtung: **Die Kurzfassung sagte mehr, als das Gesetz hergibt.** Die häufigsten Fälle:

- **Bedingung weggelassen.** Beispiele:
  - DSGVO Art. 17: Ein Widerruf führt nur unter Bedingungen zur Löschpflicht.
  - BaySchO § 20: Die Zehn-Tage-Frist läuft erst ab dem Verlangen der Schule.
- **„kann“ als „muss“ gelesen und umgekehrt.** Beispiele:
  - BSO § 12 Abs. 4: Ein Täuschungsversuch kann mit Note 6 bewertet werden, er muss nicht.
  - BSO § 4: Die Teilnahme kann gestattet werden, das ist Ermessen und kein Anspruch.
- **Falscher Anwendungsbereich.** Beispiele:
  - BayDSG Art. 30–37 gelten nur für Polizei und Strafverfolgung.
  - BayEUG Art. 6, 27, 44, 55 gelten nicht für die Berufsschule.
- **Falsche Verknüpfung.** Beispiele:
  - BayEUG Art. 39: Die Befreiungen nach Abs. 3 heben die Berufsschulpflicht von Auszubildenden **nicht** auf („Abs. 2 bleibt unberührt“).
  - BayPVG Art. 75/76: Fortbildung unterliegt nur der Mitwirkung, nicht der Mitbestimmung.

## Nacharbeit

- **BSO § 12 Abs. 2:** „Darunter mindestens je eine Schulaufgabe“ steht am Ende des ganzen Satzes. Die Kurzfassung gibt das jetzt für beide Fächergruppen wieder, wie der Wortlaut. *(Nacharbeit in der Hauptsitzung.)*
- **BayBG Art. 62:** Der Hinweis auf die Übergangsgrenzen nach Art. 143 für vor 1964 Geborene bleibt. Er verweist nur auf die andere Norm und verhindert, dass jemand eine falsche Altersgrenze abliest.

## Offene Auslegungsfragen

Jeder Bericht nennt am Ende höchstens fünf Normen, bei denen Opus unsicher blieb. Für die Schule am wichtigsten:

- **BayDSG Art. 39 Abs. 4 Nr. 6:** Sind Schulen ganz ausgenommen oder nur bei Leistungsbeurteilungen und Prüfungen?
- **MLDO § 15 Abs. 4:** Wessen Einverständnis gemeint ist, bleibt offen.

Diese Fragen sollte bei Gelegenheit die Schulleitung oder die Rechtsabteilung klären.

## Dauerhafte Absicherung

`python3 schulrecht_aufbereitung.py pruefe` (auch als Test in `schulrecht_suche_neu_test.py`) meldet jede Norm, deren Wortlaut sich seit der Aufbereitung geändert hat (Fingerabdruck). Ändert sich eine Rechtsquelle, muss die betroffene Kurzfassung neu geschrieben und geprüft werden.
