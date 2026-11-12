# Opus-Gegenprüfung Schulrecht-Aufbereitung: BayEUG Teil 1 (PROJ-88)

- **Dateien:** `schulrecht_aufbereitung/BayEUG_1.json`, `schulrecht_aufbereitung/BayEUG_2.json` (BayEUG, Positionen 1–70: Art. 1 bis Art. 64)
- **Geprüfte Normen:** 70 (davon 1 aufgehoben: Art. 37a)
- **Korrekturen:** Kurzfassung 22 · Kernaussage 16 · Fragen 21 (10 entfernt, 11 umformuliert bzw. Absatz korrigiert)
- **Prüfung:** `python3 schulrecht_aufbereitung.py pruefe …` meldet für beide Dateien „Aufbereitung vollständig und in Ordnung.“ `nr`, `fingerabdruck` und Stichworte sind unverändert.

## Korrekturen

| Norm | Art | vorher (gekürzt) | nachher (gekürzt) | Grund |
|---|---|---|---|---|
| Art. 5 | Frage | „Darf ich Unterricht in den Ferien ansetzen?“, „Betriebsurlaub … frei haben?“ | entfernt | Die Norm regelt nur Schuljahr und Ferienordnung, keine Unterrichtszeiten und keine Befreiung. |
| Art. 5a | irreführend | „… sowie berufsvorbereitende Maßnahmen nach dem SGB III“ | „… auch im Vorbereitungsdienst … SGB III, sofern diese keine Ersatzschule sind“ | Die Ausnahme für Ersatzschulen fehlte, ebenso der Vorbereitungsdienst als Teil der Ausnahme für den öffentlichen Dienst. |
| Art. 6 | irreführend | „Ganztagsangebote gibt es auf Antrag des Schulaufwandsträgers“ | „… an Grund-, Mittel-, Realschulen, Wirtschaftsschulen, Gymnasien und entsprechenden Förderschulen“ | Die Regel gilt nur für diese Schularten, also nicht für die Berufsschule, und „können“ ist keine Zusage. |
| Art. 7 | irreführend | „In jedem Klassenraum wird ein Kreuz angebracht“ | „In jedem Klassenraum der Grundschule …“ | Die Kreuzregel steht bei der Grundschule; Berufsschullehrkräfte könnten sie sonst auf sich beziehen. |
| Art. 7 | Frage | „Darf ich das Kreuz abhängen, weil es mich im Berufsschulunterricht stört?“ / „Ein Schüler stört sich …“ | entfernt / „Eltern stören sich am Kreuz … der Grundschule“ | Art. 7 gilt nicht für die Berufsschule, und widersprechen können laut Text die Erziehungsberechtigten. |
| Art. 8 | irreführend | „… wenn die genannten drei Voraussetzungen erfüllt sind“ | nennt qualifizierenden Abschluss, Englisch (5 Jahre) und Berufsabschluss mit Schnitt 3,0 | Die Kurzfassung verwies auf Voraussetzungen, die sie selbst nicht nennt. |
| Art. 12 | falsch | „Dieser schließt den mittleren Schulabschluss ein, wenn …“ | „Mit ihm wird auch der mittlere Schulabschluss verliehen, wenn …“ | So steht es im Wortlaut; der Berufsschulabschluss „schließt“ ihn nicht ein (heikel gemeldet). |
| Art. 12 | Kernaussage | Abs. 2 „… kommt dazu …, in Härtefällen ist eine andere Fremdsprache möglich“ | „wird auch verliehen … kann genehmigt werden“ | Wortlaut angeglichen; die andere Fremdsprache braucht eine Genehmigung. |
| Art. 12 | Frage | „Warum haben wir Blockunterricht …?“, „Zählt der Berufsschulabschluss, wenn … IHK nicht schafft?“ | „Darf … als Blockunterricht stattfinden?“, „Bekommt ein Azubi den mittleren Schulabschluss, wenn er die IHK-Prüfung nicht besteht?“ | Ein „Warum“ beantwortet die Norm nicht; die zweite Frage zielt jetzt auf das, was Abs. 2 tatsächlich regelt. |
| Art. 15 | falsch | „wird in der Regel nach einer Berufsausbildung und praktischer Berufstätigkeit besucht“ | „nach einer Berufsausbildung und in der Regel nach praktischer Berufstätigkeit“ | Die Berufsausbildung ist Pflicht; nur die Berufstätigkeit gilt „in der Regel“. |
| Art. 18 | Bedingung fehlte | „Überdurchschnittliche Absolventen … können die fachgebundene Hochschulreife zuerkannt bekommen“ | „… die die Fachhochschulreife erworben haben, kann … zuerkannt werden“ | Voraussetzung Fachhochschulreife ergänzt. |
| Art. 23 | Frage | „Muss ich Unterrichtsmaterial für einen Schüler in der Klinik bereitstellen?“ | entfernt | Die Norm sagt dazu nichts. |
| Art. 26 | irreführend | „Zustimmung … Elternbeirat bzw. Berufsschulbeirat“ | „Elternbeirat und bei Berufsschulen Berufsschulbeirat“, Schulträger verleiht auf Antrag der Schulleitung | Beide Gremien müssen zustimmen, nicht nur eines von beiden. |
| Art. 26 | Frage | „Wer muss zustimmen, wenn eine Schule aufgelöst wird?“ | „Wer muss vor der Auflösung … beteiligt werden?“ | Es geht um ein Benehmen, nicht um eine Zustimmung. |
| Art. 27 | falsch | „wenn Lehrkräfteausbildung und Räume dem staatlichen Standard entsprechen“ | „Ausbildung der Lehrkräfte steht nicht hinter der an staatlichen Schulen zurück und die Räume sichern einen einwandfreien Schulbetrieb“ | Für die Räume gibt es keinen „staatlichen Standard“ als Maßstab (heikel gemeldet). |
| Art. 27 | Kernaussage | Abs. 2 „ist der Elternbeirat … zu hören“ | „ist das Benehmen … herzustellen“ | Wortlaut angeglichen. |
| Art. 27 | Frage | „Darf eine städtische Berufsschule Schüler von außerhalb ablehnen?“ | „… städtische Wirtschaftsschule …“ | Abs. 3 gilt nur für Schulen, die keine Pflichtschulen sind; die Berufsschule ist eine Pflichtschule. |
| Art. 29 | Kernaussage | Abs. 5 „Schüler müssen die Lernziele nicht erreichen … Abschlusszeugnis mit Lernzielen“ | ergänzt um „soweit keine schulartspezifischen Voraussetzungen“ und „an Mittel- oder Berufsschule“ | Zwei Einschränkungen fehlten. |
| Art. 29 | Frage | „Lese-Rechtschreib-Schwäche – Nachteilsausgleich?“ / „Förderplan – muss ich den schreiben?“ | entfernt / „Wo ist der individuelle Förderplan geregelt?“ | LRS ohne sonderpädagogischen Förderbedarf regelt Art. 52; wer den Förderplan schreibt, steht hier nicht. |
| Art. 32a | Kernaussage | Abs. 3 „für den Verbundausschuss gelten Besonderheiten“; Abs. 4 „wird erst aufgelöst, wenn sie keine Klasse mehr hat …“ | „… gehören auch die Schülersprecher an“; „außer der Aufwandsträger beantragt die Auflösung … und nicht in einen Verbund eingegliedert wird“ | Inhalt war zu ungenau, und beide Ausnahmen zur Auflösung fehlten (heikel gemeldet). |
| Art. 33 | Kernaussage | Abs. 2 ohne Bedingung „heimatnächste Einrichtung“ | ergänzt | Die Bedingung fehlte. |
| Art. 38 | Bedingung fehlte | „darf … freiwillig weiter die Mittelschule besuchen“ | ergänzt: „Aufnahme kann abgelehnt werden, wenn Sicherheit, Ordnung oder Bildungsziele erheblich gefährdet wären“ | „darf“ stand ohne die Ablehnungsmöglichkeit da. |
| Art. 39 | falsch | „Ausnahmen gelten etwa für … Bundeswehr, Freiwilligendienst oder mittleren Schulabschluss“ | „Befreiungen … lassen diese Berufsschulpflicht der Auszubildenden unberührt“ | Wegen „Abs. 2 bleibt unberührt“ bleibt ein Azubi mit Realschulabschluss berufsschulpflichtig; die alte Fassung sagte das Gegenteil. |
| Art. 39 | Kernaussage | Abs. 3 „… Abs. 2 bleibt unberührt“ | „die Berufsschulpflicht der Auszubildenden nach Abs. 2 bleibt davon unberührt“ | Gleicher Punkt, verständlich formuliert. |
| Art. 41 | irreführend | „die Erziehungsberechtigten entscheiden nach Beratung“ | ergänzt um Abs. 4: Förderschule, wenn der Bedarf nicht gedeckt ist und eine Gefährdung oder Beeinträchtigung anderer vorliegt | Das Elternwahlrecht stand ohne seine gesetzliche Grenze da. |
| Art. 43 | Frage | „Was bedeutet das für uns, wenn ein Schüler als Gastschüler zu uns kommt?“ | entfernt | Wird von der Norm nicht beantwortet. |
| Art. 44 | irreführend | „Erziehungsberechtigte und volljährige Schüler dürfen Schulart … wählen“ | „Soweit keine Pflichtschule (wie die Berufsschule) zu besuchen ist …“; Beschränkung nur, wenn sonst kein geordneter Unterricht möglich ist | Die Wahlfreiheit gilt nicht für Pflichtschulen, und die Bedingung für eine Beschränkung fehlte. |
| Art. 44 | Kernaussage | Abs. 1 wie oben; Abs. 2 „bei bestimmten schweren Verurteilungen“ | „Für Nicht-Pflichtschulen …; mindestens ein Jahr Freiheitsstrafe wegen einer Vorsatztat, wenn Sicherheit gefährdet“ | Präzisiert. |
| Art. 50 | irreführend | „Pflichtfächer und gewählte Fächer müssen alle besuchen“ | „… soweit Rechtsvorschriften keine Ausnahmen vorsehen“; Kurse „eingerichtet“ | Der Vorbehalt für Ausnahmen fehlte. |
| Art. 50 | Frage | „Kann ich in meinem Fach Kurse … einrichten?“ | „Dürfen in einem Fach Kurse … eingerichtet werden?“ | Die Norm gibt das nicht der einzelnen Lehrkraft als Recht. |
| Art. 52 | irreführend | „Bei langandauernden erheblichen Beeinträchtigungen gibt es Nachteilsausgleich, in bestimmten Fällen … Notenschutz“ | „soweit erforderlich, bei gleichem fachlichem Niveau; Notenschutz nur bei bestimmten Beeinträchtigungen (z. B. Autismus, LRS) auf Antrag der Erziehungsberechtigten, mit Vermerk im Zeugnis“; Note „mit Begründung zu eröffnen“ | Der Kern des Nachteilsausgleichs (gleiches Niveau) und der Zeugnisvermerk beim Notenschutz fehlten (heikel gemeldet). |
| Art. 52 | Kernaussage | Abs. 5 „Notenschutz unter engen Voraussetzungen“ | nennt alle vier Beeinträchtigungsgruppen und die Bedingungen | Präzisiert. |
| Art. 52 | Frage | „Darf ich eine Note mit Tendenz geben, also 2 minus?“ | entfernt | Die Norm sagt zu Tendenzen nichts. |
| Art. 53 | Ungenau | „darf … wiederholt werden … Entscheidend ist die Klassenkonferenz“ | „kann … wiederholt werden … entscheidet in der Regel die Klassenkonferenz“ | Für einzelne Schularten kann ein anderes Gremium zuständig sein. |
| Art. 54 | Frage | „Darf ein Azubi, der durchgefallen ist, die Klasse nochmal besuchen?“ | „… die Abschlussprüfung der Schule nicht bestanden hat …“ | Sonst wäre das IHK-Durchfallen gemeint, das Art. 54 nicht regelt. |
| Art. 55 | irreführend | „Bleibt jemand … fern, kann die Schule … gleichstellen“ | „Bleibt dort jemand …“ (nur Nicht-Pflichtschulen), „nach erfolgloser Erkundigung“ | Gilt nicht für die Berufsschule. |
| Art. 55 | Kernaussage | Abs. 2 ohne Einschränkung auf die Schulart | „An Nicht-Pflichtschulen …“ | Gleicher Punkt. |
| Art. 56 | irreführend | „Handy nur mit Erlaubnis der Aufsicht bzw. nach allgemeiner Regel der Schulleitung“ | „im Unterricht nur mit Erlaubnis der Aufsicht, sonst … allgemeine Erlaubnis der Schulleitung im Einvernehmen mit dem Schulforum (nicht in Jgst. 1–7)“; Beschwerde „nacheinander“ | Das Schulforum und der Ausschluss der Jahrgangsstufen 1–7 fehlten (heikel gemeldet). |
| Art. 56 | Kernaussage | Abs. 4 ohne Ausnahmen zur Verhüllung; Abs. 5 „im Gebäude nur wenn …“ | Ausnahmen bei der Verhüllung ergänzt; Abs. 5 mit Gelände, Jgst. 1–7 und Festlegung der Apps | Präzisiert. |
| Art. 57 | Ungenau | „für … Bildung und Erziehung verantwortlich“ | „gemeinsam mit den Lehrkräften …“ | Der Wortlaut sieht eine gemeinsame Verantwortung vor. |
| Art. 57 | Frage | „Muss ich mich beim Chef melden, bevor ich mit einem Ausbilder spreche?“ | entfernt | Die Vertretung nach außen beantwortet diese Frage nicht. |
| Art. 58 | falsch | „Hält die Schulleitung einen Beschluss für rechtswidrig, muss sie ihn beanstanden und die Schulaufsicht einschalten“ | „… binnen eines Monats erneut beraten lassen; einen bindenden Beschluss beanstanden, aussetzen, Schulaufsicht entscheiden lassen“ | Die Beanstandung ist nur bei bindenden Beschlüssen vorgesehen, sonst eine erneute Beratung. |
| Art. 58 | Kernaussage / Frage | Abs. 5 „erneut beraten lassen oder beanstanden“; „Wer sitzt im Disziplinarausschuss?“ | Reihenfolge wie oben; „Ab wann muss eine Schule einen Disziplinarausschuss bilden?“ | Das „oder“ war falsch; die Besetzung regelt die Schulordnung, nicht Art. 58. |
| Art. 59 | Bedingung fehlte | „… wenn sie als Haltung verstanden werden können, die mit den Grundwerten unvereinbar ist“ | „sofern Schüler oder Eltern sie auch als Ausdruck … verstehen können; im Vorbereitungsdienst Ausnahmen im Einzelfall möglich“ | Es fehlten, aus wessen Sicht das Symbol gelesen wird, und die Ausnahme für den Vorbereitungsdienst (heikel gemeldet). |
| Art. 59 | Kernaussage | Abs. 2 „Einschränkung für bestimmte religiöse Symbole“ | Bedingung und Ausnahme ausgeschrieben | Präzisiert. |
| Art. 60 | Frage | „Darf ich einen Schüler zur Schulsozialarbeit schicken?“ | entfernt | Die Norm sagt dazu nichts. |
| Art. 60a | Ungenau | Ausnahme nur „Beschäftigte des Freistaats oder einer kommunalen Körperschaft“ | ergänzt: Vorlage bei der Schulleitung; Ausnahme, wenn eine Gefährdung ausgeschlossen erscheint | Eine zweite Ausnahme fehlte. |
| Art. 60a | Frage | „Muss ich als städtische Lehrkraft ein Führungszeugnis vorlegen?“ | „Muss eine bei der Stadt angestellte Verwaltungskraft …?“ | Abs. 3 betrifft nicht die Lehrkräfte, sondern sonstiges Personal. |
| Art. 62a | Frage | „… wird dafür freigestellt?“ | „Wie viele Landesschülersprecher gibt es und wer vertritt die Berufsschulen?“ | Zur Freistellung sagt die Norm nichts. |
| Art. 63 | Kernaussage / Frage | Abs. 4 „Einwendungen, über die das Schulforum entscheidet“; „Muss ich als betreuende Lehrkraft vor dem Druck lesen?“ | Ablauf: Einwendung, Schulforum, gütliche Einigung, sonst Untersagung; Frage entfernt | Der Ablauf war verkürzt; die Vorlage geht an die Schulleitung, nicht an die betreuende Lehrkraft. |

Hinweis: Drei Kurzfassungen (Art. 52, 56, 59) wurden nach der Korrektur auf höchstens 600 Zeichen gekürzt (Grenze in `pruefe`). Die Einzelheiten stehen in den Kernaussagen.

## Unsicher geblieben

1. **Art. 39 (Abs. 3 „Abs. 2 bleibt unberührt“):** Ich lese das so, dass Azubis nach BBiG/HwO trotz der Befreiungsgründe berufsschulpflichtig bleiben. Das ist die übliche Auslegung, aber eine Auslegung; die Kurzfassung hängt daran.
2. **Art. 44 Abs. 2 Satz 2 (Aufnahme bei Vorstrafe):** Ob Satz 2 wie Satz 1 nur für Nicht-Pflichtschulen gilt, sagt der Wortlaut nicht ausdrücklich; ich habe es so verstanden.
3. **Art. 52 Abs. 5 (Notenschutz bei Volljährigen):** Der Text nennt nur den Antrag der Erziehungsberechtigten. Die Kurzfassung gibt das so wieder; ob Volljährige selbst beantragen, regelt vermutlich die BaySchO.
4. **Art. 5a Abs. 2 Nr. 2 Buchst. c:** Die Ausnahme für Einrichtungen von Parteien, Gewerkschaften usw. für Mitglieder über 18 ist bewusst nicht in der Kurzfassung („u. a.“). Für Lehrkräfte ist sie kaum relevant.
5. **Art. 31 Frage „Verstoße ich gegen den Datenschutz, wenn ich dem Jugendamt etwas melde?“:** Habe ich stehen lassen, weil Abs. 1 Satz 2 die Grundlage für die Meldung ist. Eine vollständige Antwort bräuchte aber auch Datenschutzrecht.
