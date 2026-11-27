# Plan: Die App für Anfänger sofort bedienbar machen

> Stand: 2026-11-26 · Grundlage: zwei Browser-Durchläufe am 26.11. (Live-App, Laptop + Handy, alle Seiten des Lehrkräfte-Bereichs und der Schülerseite)
> Ziel: Eine Lehrkraft, die die App noch nie gesehen hat, erledigt die 5 Prüfaufgaben (unten) ohne Hilfe.

## Entscheidungen (26.11.2026)

| Frage | Entscheidung |
|---|---|
| Klassen (z. B. SP10C) als echte Einheit | **Später** – erst Aufbau und Begriffe aufräumen, dann neu bewerten |
| Was sehen normale Lehrkräfte im Menü? | **Alles sichtbar lassen** (PROJ-127 bleibt), Verwaltung aber gesammelt unten |
| Leistungsnachweis + Prüfungssimulation | **Getrennt lassen, nur einheitlich umbenennen** |
| Reihenfolge | **Erst Fehler (Phase 0), dann klickbare Vorschau (Phase 1)** |
| Kalender (Abwesenheiten) | **Zurückgestellt** – wird in dieser Form wahrscheinlich nicht gebraucht; Befunde B66–B72 ruhen |
| Wörterliste (Phase 2) | **Freigegeben** wie unten im Entwurf |
| Modellwahl | Opus für Entscheiden/Architektur (Phase 1–4, Design-Regeln), Sonnet für klar umrissene Umsetzung (Phase 0, Bauen nach Spec), Haiku für reine Textänderungen |

## Leitregeln für jede Änderung

1. **Ein Wort, eine Bedeutung.** Jeder Begriff steht in der Wörterliste (Phase 2) und wird überall gleich benutzt.
2. **Ein Weg pro Aufgabe.** Gibt es zwei Wege für dasselbe, fällt einer weg oder wird zum Unterpunkt des anderen.
3. **Das Wichtigste ist sichtbar.** Hauptaktion und Zeilenaktionen nie hinter Seitwärtsscrollen, Filter nie vor dem Inhalt.
4. **Nichts geht ohne Rückmeldung live.** Was Azubis sofort sehen, zeigt vorher eine Vorschau oder fragt nach.
5. **Gleiches sieht gleich aus.** Ein Listen-Muster, ein Anlegen-Muster, feste Farbbedeutungen.
6. **Keine Technik-Wörter.** Kein Prompt, JSON, API-Key, Knoten, Trennschärfe ohne Erklärung, kein Englisch, keine PROJ-Nummern.

## Die 5 Prüfaufgaben (Messlatte für alle Phasen)

Gemessen werden Klicks, Zeit und die Stelle, an der jemand hängen bleibt – vorher (Ist) und nach jeder Phase.

1. Lege einen benoteten Test mit 10 Fragen zum Thema Seefracht für die SP10C am Freitag an.
2. Trag ein, dass du nächsten Dienstag auf Fortbildung bist.
3. Finde die Frage „Welche Stelle ist für Ursprungszeugnisse zuständig?“ und korrigiere einen Tippfehler.
4. Mach aus deinem Skript ein Kahoot-Quiz.
5. Ein Test ist vorbei: Sieh die Noten an und gib die Ergebnisse frei.

## Phase 0 – Fehler beheben (sofort, 1–2 Tage)

**Stand 26.11.2026:** live und im Browser geprüft (4.763 Tests grün). Offen: ein Übungsprüfungs-Set aktivieren (F5, Entscheidung der Lehrkraft). Nächster Schritt: Phase 1 (klickbare Vorschau, mit Opus).

| # | Fehler | Ursache | Betrifft |
|---|---|---|---|
| F1 | Teilnehmer/Abgaben fehlen (0/0) bei Nachweisen anderer Lehrkräfte in Übersicht und Liste | `/api/admin/assessments` liest `exam_sessions` mit Nutzer-Client (Zeilenschutz) statt Dienst-Client | PROJ-21/46 |
| F2 | „1 Nachweis beendet, nicht freigegeben“ → leere Liste; abgelaufener Nachweis steht weiter als „Offen“ / „Läuft gerade“ | `tasks/route.ts` zählt `open` + abgelaufen, Filter `assessment-filter.ts` nur `closed` | PROJ-81/86 |
| F3 | Streak veraltet (z. B. 30, obwohl zuletzt am 27.07. gelernt) in Nutzerliste/Detail | `current_streak` ohne Prüfung von `last_session_date` angezeigt | PROJ-5/59 |
| F4 | „Mein Konto: Alles erledigt“ widerspricht „Zu erledigen“ auf der Übersicht | zwei Aufgabenlisten mit eigener Logik | PROJ-50/81 |
| F5 | Schülerseite „Prüfung üben“: alle 3 Teile leer | alle Prüfungssets inaktiv; Lehrkräfte sehen keinen Hinweis | PROJ-11/15 |
| F6 | Quiz abbrechen verwirft Antworten ohne Hinweis | – (prüfen: gewollt? dann ansagen, sonst speichern) | PROJ-3 |

Kleinkram im selben Zug: „(PROJ-48)“ aus der Zuständigkeiten-Seite, „Previous/Next“ → „Zurück/Weiter“ bei den Fragen, Noten mit Komma („4,0“), Kategorie-Karten im Lehrerzimmer (Text ragt über den Rahmen), Platzhalter „Titel oder Code such“ abgeschnitten, „Entwurf gespeichert“ beim bloßen Öffnen des Baukastens, Checklisten-Karte „Angefangen: 0 von 7“.

## Phase 1 – Klickbare Vorschau & Test mit Kolleg/innen

- Klickbare Vorschau (ohne echten Code) von: Menü, Start, Lerninhalte, Leistungsnachweis anlegen, Abwesenheit eintragen.
- 2–3 Kolleg/innen (mindestens eine, die die App nicht kennt) lösen die 5 Prüfaufgaben – erst in der echten App, dann in der Vorschau.
- **Ergebnis:** Wir wissen, ob der neue Aufbau trägt, bevor eine Zeile App-Code geändert wird.

**Stand 27.11.2026:** Vorschau gebaut: `docs/vorschau/phase1-neuer-aufbau.html` (eine Datei, Beispieldaten, kein App-Code geändert), auch als privater Link veröffentlicht. Enthalten sind Menü nach Phase 2 (Verwaltung unten, ein Bereichs-Umschalter), Start mit einer Liste „Zu erledigen“, Lerninhalte an einem Ort (Phase 3) und Leistungsnachweis in 3 Schritten mit Detailseite (Phase 4). Unten rechts gibt es eine „Testleitung“: Prüfaufgabe wählen, Zeit und Klicks mitzählen, Ergebnisse kopieren. **Nicht enthalten:** Abwesenheiten (zurückgestellt, Prüfaufgabe 2 entfällt) und Werkzeugkiste (Prüfaufgabe 4). Diese Punkte und Nachschlagen, Lehrerzimmer und Verwaltung sind nur Platzhalter. **Nächster Schritt:** Test mit 2–3 Kolleg/innen, erst in der echten App, dann in der Vorschau. Danach die Ergebnisse hier eintragen.

**Test 27.11.2026 (Kolleg/innen, Vorschau):** Menü, Begriffe und Aufbau kamen gut an („gefällt uns schon gut“). Drei Wünsche wurden als neue Befunde aufgenommen: B102 (Antworten aufklappen) und B103 (Fach-/Themenbaum unübersichtlich) für Phase 3, B104 (Ersteller des Nachweises sichtbar) für Phase 4. Phase 2 startet damit als **PROJ-130**.

Was die Vorschau aus der Befundliste schon zeigt (zum Prüfen im Test, in der App erst ab Phase 2–4 abgehakt): B1–B4, B6, B9, B24 (Menü und Begriffe), B16 (Erste Schritte statt fester Linkliste), B22–B33 (Nachweis), B34–B50 außer B46 (Lerninhalte), dazu B7 teilweise (Suche findet auch Fragen und Nachweise) und B83 teilweise (aktive Menüpunkte und Segmente neutral statt grün).

## Phase 2 – Begriffe & Menü

**Feature:** [PROJ-130](../features/PROJ-130-begriffe-und-menue.md) (In Progress, 27.11.2026) – „Lerninhalte“ bis Phase 3 als aufklappbarer Menüpunkt, „Nachschlagen“ als Einstiegsseite mit zwei Karten.

**Stand 27.11.2026:** alle vier Bauschritte fertig (4776 Tests grün, Build sauber), Befunde unten abgehakt. **Noch nicht live und noch nicht im Browser geprüft.** Nächster Schritt: `/qa` für PROJ-130, dann `/deploy`.

**Menü (für alle Lehrkräfte gleich, Verwaltung gesammelt unten):**

```
Start
Leistungsnachweise      (benotet, für die Klasse)
Übungsprüfungen         (frei, ohne Note – heißt auf der Schülerseite gleich)
Lerninhalte             (Phase 3)
Werkzeugkiste
Abwesenheiten           (bisher „Kalender“ – zurückgestellt, bleibt vorerst wie er ist)
Nachschlagen            (Schulrecht + Checklisten)
Lehrerzimmer
──────────
Verwaltung              Nutzer · Fachbereich · Items · Änderungsprotokoll
                        (+ nur Super-Admin: Zuständigkeiten, Abwesenheitsarten, Fachbereiche)
```

**Ein Bereichs-Umschalter:** nur oben links. Kein „Du siehst: alle Bereiche“ auf den Seiten, alle Dialoge übernehmen den gewählten Bereich.

**Wörterliste (freigegeben am 26.11.2026):**

| Statt … | künftig | Bedeutung |
|---|---|---|
| Fachbereich, Zielbereich | **Bereich** | Spedition oder Tourismus |
| Abteilung (Kalender) | **Abteilung** (bleibt, aber mit Erklärung) | Schul-Abteilung (Spedition, Touristik, KEP …) – nicht dasselbe wie Bereich |
| Prüfungssimulation, Prüfungsset, Prüfung üben | **Übungsprüfung** | frei, ohne Note |
| Klasse (für 10/11/12) | **Stufe** | Jahrgangsstufe |
| Klasse | **Klasse** | SP10C usw. |
| Thema (im Baukasten) | **Kapitel** | Abschnitt einer Lernseite |
| Kalender | **Abwesenheiten** | wer fehlt wann |
| Offen (Kalender) | **Vertretung fehlt** | |
| Öffentlich / Regal / Veröffentlichen / Teilen | **Für Azubis (Link)** · **Fürs Kollegium (Regal)** · **Änderungen übernehmen** | |
| Anpassen (Regal) | **Kopie bearbeiten** | |
| Leere Seite anlegen / Eigene Seite bauen | **Eigene Seite bauen** | |

## Phase 3 – Lerninhalte an einem Ort

- Inhalte, Fragen, Fächer, Themen, Gemeldete Fragen, Schwierigste Fragen und Papierkorb (Fragen) werden **eine** Seite „Lerninhalte“: links Fach › Thema, rechts die Fragen; Reiter Fragen · Gemeldet · Schwierig · Papierkorb.
- **„Fragen hinzufügen“** mit drei Wegen: selbst schreiben · aus Material (Assistent wie in der Werkzeugkiste: Datei hochladen statt Platzhalter im Prompt ersetzen) · Datei importieren (CSV).
- Neue KI-Fragen erst als **Vorschau**, dann „Übernehmen“ (nicht mehr „sofort aktiv“).
- Fragen aus-/einschalten mit kurzer Rückfrage oder „Rückgängig“-Toast.
- Zahlen überall gleich (heute 834 vs. 736 für BGP).

## Phase 4 – Leistungsnachweis in 3 Schritten

1. **Was?** Bereich (vorausgefüllt), Fach, Thema, Stufe, Anzahl, Schwierigkeit → Vorschlag.
2. **Prüfen:** vorgeschlagene Fragen ansehen, tauschen, eigene ergänzen (freie Auswahl nur hier, mit Suche statt 3.355 Fragen auf einmal).
3. **Wann & für wen?** Klasse (sichtbares Feld, nicht in „Ablage“), Datum, Dauer, Notenschlüssel.

Dazu: „Beitritt bis“ auf der Detailseite sichtbar, Ablauf als Schrittleiste (Entwurf → Offen → Geschlossen → Freigegeben), abgelaufene Nachweise schließen sich selbst, Notenschlüssel-Vorlage direkt anlegbar, „Als Azubi ausprobieren“.

## Phase 5 – Klassen (später, nach Phase 2–4 neu bewerten)

Klasse als echte Einheit (Azubis zugeordnet, Lernstand und Nachweise je Klasse). Bis dahin: Klasse als sichtbares Feld im Nachweis (Phase 4).

## Phase 6 – Design-Regeln & Hilfe

- **Farben mit fester Bedeutung:** Grün = Hauptaktion und Erfolg. Gewählte Segmente und aktive Menüpunkte neutral statt grün. Zeilenaktionen als Umriss-Knopf, nicht gefüllt. Rot nur für Fehler, Löschen, Dringendes.
- **Ein Listen-Muster:** Tabelle ab Laptop, Karten am Handy; Aktionsspalte immer sichtbar (bleibt rechts stehen); höchstens 5 Spalten, der Rest in der Detailansicht.
- **Filter:** Suche + ein Hauptfilter sichtbar, Rest hinter „Filter (n)“; aktive Filter als Hinweis „Filter aktiv – zurücksetzen“.
- **Ein Anlegen-Muster:** kurz = Dialog, lang = eigene Seite mit Schritten. Nie Dialog im Dialog.
- **Weniger Pillen:** Bereich-Pille nur, wenn mehrere Bereiche sichtbar sind.
- **Erste Schritte** auf dem Start für neue Lehrkräfte; „?“-Hilfe je Seite nach dem Vorbild der Werkzeugkiste; die Schnellsuche findet auch Inhalte (Fragen, Nachweise, Materialien).
- **Werkzeugkiste:** einmalige Erklärung des KI-Wegs (3 Bilder: kopieren → einfügen → zurückholen); unfertige Werkzeuge („Podcast – kommt bald“) ausblenden; Vorschau im Regal.
- **Schüleransicht für Lehrkräfte:** Rahmen „Du siehst die App wie ein Azubi – zurück“, Lehrkräfte nicht in der Azubi-Rangliste.
- **Tempo:** Inhalte und Fragen laden heute ~4 s; Ziel unter 1,5 s.

## Phase 7 – Schülerseite

- **Themen aufräumen** (Datenpflege, gemeinsam): sprechende Namen statt „10. Klasse – Teil 3“, Dubletten zusammenführen (Luftfracht / Luftfracht Teil 1 / …), „Ohne Thema“ auflösen, Reihenfolge wie im Unterricht statt alphabetisch, Fachnamen in beiden Bereichen gleich aufgebaut.
- Blitzrunde mit Startbildschirm „Bereit?“.
- Nach einer Antwort: Erklärung und „Weiter“ fest am unteren Rand.
- Zahlen oben (Streak, XP, Münzen) und die Lücken-Kachel beschriften bzw. beim Antippen erklären; Fach-Prozent erklären („3 % gemeistert“).
- „Code von deiner Lehrkraft“ statt „von deinem Ausbilder“.
- Fantasienamen grammatisch richtig („Gewandte Lieferung“).
- Kalender-Testdaten und Test-Beiträge („Test“, „Ex“, „Test_Eintrag1“) aus der Live-App entfernen.

## Noch offen / nicht geprüft

- Anmeldung, Registrierung, erste Anmeldung neuer Lehrkräfte und Azubis (nur eingeloggt getestet) → in Phase 1 mit einer Kollegin durchspielen.
- Echte Azubi-Sicht (nur Lehrkraft-Spielansicht gesehen).
- Werkzeug-Schritte 2–5 (brauchen einen Upload).
- Wörterliste: Namen gemeinsam festlegen, vor allem „Übungsprüfung“ und die Teilen-Begriffe.

## Umsetzung

Jede Phase ab 2 wird ein eigenes Feature (`/requirements` → `/architecture` → bauen → `/qa`). Phase 0 läuft als `fix(PROJ-X)` an den betroffenen Features.

**Regel:** Jede Spec übernimmt alle Befunde ihrer Phase aus der Liste unten als Akzeptanzkriterien. Am Ende jeder Phase wird hier abgehakt. Ein Befund darf nur mit Begründung gestrichen werden.

## Anhang: Vollständige Befundliste (Stand 26.11.2026)

Spalte **Ph.** = Phase, in der der Befund erledigt wird. ☐ = offen, ☑ = erledigt.

### Allgemein & Menü
| # | Befund | Ph. | |
|---|---|---|---|
| B1 | 20 Menüpunkte (auch für normale Lehrkräfte), Gruppen „Weitere Seiten“/„Verwaltung“ ohne erkennbare Logik | 2 | ☑ |
| B2 | „Fachbereich“ und „Fachbereiche“ stehen untereinander | 2 | ☑ |
| B3 | Bereich wird bis zu 3× pro Seite abgefragt (Umschalter, „Du siehst“, „Wird angelegt in“), Dialoge übernehmen ihn nicht | 2 | ☑ |
| B4 | 4 Wörter für Bereich (Bereich, Fachbereich, Zielbereich, Abteilung) | 2 | ☑ |
| B5 | Doppelte Wortbedeutungen: Thema (Kapitel/Lernthema), Klasse (Stufe/SP10C), Offen (gut/Alarm), Kalender (nur Abwesenheiten) | 2 | ☑ |
| B6 | Konto-Menü: „Mein Konto“, „Spielerprofil“, „Zur Lern-App“ – drei ähnliche Einträge, dazu „Zur Lern-App“ oben rechts | 2 | ☑ |
| B7 | Schnellsuche findet nur Seitennamen („Frachtbrief“, „Ex Heft“ → nichts); „krank“ → Werkzeugkiste zuerst | 6 | ☐ |
| B8 | Übersicht: Klicks in den ersten 3–5 s wirkungslos, ohne Rückmeldung | 6 | ☐ |
| B9 | Seitenbeschreibungen brauchen „Nicht zu verwechseln mit …“ (Zeichen für unklare Begriffe) | 2 | ☑ |
| B10 | Keine Hilfe/„Erste Schritte“ außerhalb der Werkzeugkiste, kein gefahrloses Ausprobieren | 6 | ☐ |
| B11 | Interne Nummer „(PROJ-48)“ sichtbar | 0 | ☑ |
| B12 | Englisch: „Previous/Next“, Items, Opt-out, Session, Lvl – *Items, Session, Lvl im Lehrkräfte-Bereich erledigt; Schülerseite in Phase 7* | 0 / 2 | ◐ |

### Übersicht & Aufgaben
| # | Befund | Ph. | |
|---|---|---|---|
| B13 | F1: 0/0 Teilnehmer bei fremden Nachweisen (Übersicht, Liste) | 0 | ☑ |
| B14 | F2: „Nachweis beendet“ → leere Liste; abgelaufener Nachweis bleibt „Offen“/„Läuft gerade“ | 0 | ☑ |
| B15 | F4: „Mein Konto: Alles erledigt“ vs. 3 Aufgaben auf der Übersicht | 0 | ☑ |
| B16 | „Das kannst du als Nächstes tun“ ist feste Linkliste, nicht persönlich | 6 | ☐ |
| B17 | „0 schreiben“ – holprige Formulierung | 0 | ☑ |

### Leistungsnachweise
| # | Befund | Ph. | |
|---|---|---|---|
| B18 | 6 Filter vor 2 Einträgen; am Handy ein ganzer Bildschirm | 6 | ☐ |
| B19 | Code am Handy außerhalb des Bildschirms (Tabelle statt Karten) | 6 | ☐ |
| B20 | Spalten „Zielbereich“ (immer gleich) und „Teilnehmer 1/1“ (Bedeutung unklar) | 6 | ☐ |
| B21 | Platzhalter „Titel oder Code such“ abgeschnitten | 0 | ☑ |
| B22 | Anlegen: ein Riesendialog, 3.355 Fragen auf einmal (≈40.000 Elemente, 6.710 Kästchen), „Alle angezeigten wählen“ markiert alle | 4 | ☐ |
| B23 | Zwei konkurrierende Startwege (Vorschlag vs. Startauswahl aus Prüfungssimulation); Vorschlag als Dialog im Dialog | 4 | ☐ |
| B24 | Zielbereich nicht vorausgefüllt – *Bereich kommt aus dem Umschalter (Phase 2); Rest mit dem neuen Anlegen in Phase 4* | 2 / 4 | ◐ |
| B25 | Klasse versteckt in „Ablage – nur zum Sortieren“ | 4 | ☐ |
| B26 | Beitritt-Standard ≈ 2 Stunden ab jetzt, wechselt (23:59 / 00:10) | 4 | ☐ |
| B27 | „Gesperrte Fragen“, „Bearbeitungszeit je Teilnehmer“ – Fachwörter | 4 | ☐ |
| B28 | Detailseite zeigt nicht, bis wann der Beitritt offen ist | 4 | ☐ |
| B29 | Ablauf Entwurf → Offen → Geschlossen → Freigegeben nicht erklärt; „Ergebnisse freigeben“ nicht sichtbar | 4 | ☐ |
| B30 | Kein „Als Azubi ausprobieren“ | 4 | ☐ |
| B31 | „Trennschärfe“ ohne Erklärung | 4 | ☐ |
| B32 | Noten als „4.0“ statt „4,0“ | 0 | ☑ |
| B33 | Notenschlüssel-Vorlage nur über einen neuen Nachweis anlegbar | 4 | ☐ |

### Fragen & Inhalte
| # | Befund | Ph. | |
|---|---|---|---|
| B34 | Fragen an 5 Orten (Inhalte, Fragen, Fächer, Themen, Fragen aus Material) + Gemeldet/Schwierig getrennt | 3 | ☐ |
| B35 | Zahlen widersprechen sich (BGP 834 vs. 736) | 3 | ☐ |
| B36 | Fragen-Seite: Suchfeld am Laptop zerdrückt | 0 | ☑ |
| B37 | Bearbeiten/⋯ erst nach Seitwärtsscrollen (Fragen, Inhalte-Status-Spalte) | 6 | ☐ |
| B38 | Fragetext auf 3 Zeilen gekürzt, schmale Spalte | 6 | ☐ |
| B39 | Blättern: 417 Seiten, Anzeige nur 1–5, Englisch – *Englisch erledigt; Blättern in Phase 3* | 0 / 3 | ◐ |
| B40 | Schalter Aktiv/Inaktiv wirkt sofort, ohne Rückfrage; Grund für „Inaktiv“ unklar | 3 | ☐ |
| B41 | Fach-Schalter (Fächer-Seite) deaktiviert ein ganzes Fach mit einem Klick | 3 | ☐ |
| B42 | „Neue Frage“: Fach/Thema ganz unten, Fächer beider Bereiche gemischt, Mehrfachauswahl, Thema freiwillig, Stufe „Alle“ | 3 | ☐ |
| B43 | „Antworten werden vollständig ersetzt“ – beunruhigender Technik-Satz | 3 | ☐ |
| B44 | CSV Export/Import als große Knöpfe neben der Hauptaktion | 3 | ☐ |
| B45 | Inhalts-Baum: „Knoten“, Fachnamen abgeschnitten, Tourismus erscheint trotz Umschalter | 3 | ☐ |
| B46 | Inhalte und Fragen laden ≈ 4 s | 6 | ☐ |
| B47 | Fragen aus Material: „Prompt“, „API-Key“, „Methode 1“, JSON-Beispiel; Platzhalter selbst im langen Text ersetzen; Scrollfalle im Textkasten | 3 | ☐ |
| B48 | Fragen aus Material: „sofort aktiv“ ohne Vorschau | 3 | ☐ |
| B49 | Schwierigste Fragen: Zeilen führen nirgends hin (kein „Üben lassen“/„In Nachweis“); Filter „Mindestens … Antworten“ | 3 | ☐ |
| B50 | Gemeldete Fragen: eigener Bereichsfilter (B3) | 2 | ☑ |

### Werkzeugkiste & Baukasten
| # | Befund | Ph. | |
|---|---|---|---|
| B51 | KI-Weg (kopieren → fremde KI → zurück) nirgends erklärt | 6 | ☐ |
| B52 | „Skript hochladen“ als Hauptknopf und Werkzeug-Kacheln: unklar, was zuerst | 6 | ☐ |
| B53 | „Podcast – kommt bald“ gleichrangig zwischen fertigen Werkzeugen | 6 | ☐ |
| B54 | Assistent-Hilfe schiebt das Upload-Feld aus dem Bild | 6 | ☐ |
| B55 | Schritte „Prompt“/„Antwort“ als Fachwörter | 2 | ☑ |
| B56 | Meine Materialien: „Bearbeiten“ am Laptop nur nach Seitwärtsscrollen; am Handy (Karten) besser | 6 | ☐ |
| B57 | Suchfeld „Titel“ winzig | 6 | ☐ |
| B58 | Teilen-Begriffe: Öffentlich / Nicht veröffentlicht / Regal 1 Person·privat·alle / Veröffentlichen / Teilen … / Öffentlicher Link … | 2 | ☑ |
| B59 | ⋯-Menü mit 8+ Einträgen, „KI-Antwort herunterladen“ | 6 | ☐ |
| B60 | „Leere Seite anlegen“ vs. „Eigene Seite bauen“; „Bearbeiten“ vs. „Anpassen“ | 2 | ☑ |
| B61 | Regal: keine Vorschau, nur Herunterladen; Material ohne sprechenden Titel („Kahoot-Quiz“); „Von: Lehrkraft“ anonym | 6 | ☐ |
| B62 | Baukasten: „Entwurf gespeichert“ beim bloßen Öffnen, „Entwurf verwerfen“ zugleich ausgegraut | 0 | ☑ |
| B63 | Baukasten: Block-Leiste verdeckt die Kapitel-Überschrift – *nach Phase 6 verschoben: Eingriff ins Vorschau-Skript, nicht nebenbei* | 6 | ☐ |
| B64 | Baukasten: Gliederung kürzt Kapitelnamen („Einstieg und …“) | 6 | ☐ |
| B65 | „Veröffentlichen“ im Baukasten ≠ „Öffentlich“ in der Liste (B58) | 2 | ☑ |

### Kalender (Abwesenheiten) – zurückgestellt (26.11.2026)
| # | Befund | Ph. | |
|---|---|---|---|
| B66 | Link „2 Abwesenheiten in 14 Tagen“ zeigt den ganzen Monat mit 9 Einträgen | – | ⏸ |
| B67 | Filter „Offen“ bleibt danach unbemerkt eingeschaltet | – | ⏸ |
| B68 | Liste beginnt in der Vergangenheit; Monatsansicht beginnt mit Vormonatstagen, heute unter dem Rand | – | ⏸ |
| B69 | Vergangene Abwesenheiten weiter rot „Vertretung gebraucht“; alles rot → Alarm-Müdigkeit | – | ⏸ |
| B70 | Namen abgeschnitten („Davi…“); Einträge mal Name, mal Uhrzeit, mal „Test“ | – | ⏸ |
| B71 | „Abwesenheit eintragen“: „Alle auswählen“ bei Personen (gefährlich), 7 Abteilungs-Kästchen ohne Erklärung/Vorauswahl | – | ⏸ |
| B72 | 4 Filterreihen | – | ⏸ |

### Lehrerzimmer, Checklisten, Schulrecht
| # | Befund | Ph. | |
|---|---|---|---|
| B73 | Neuer Beitrag: Kategorie-Karten zu niedrig, Text ragt über den Rahmen | 0 | ☑ |
| B74 | 7 Filter; eigener zweiter Papierkorb | 6 / 3 | ☐ |
| B75 | Checklisten: „Angefangen: 0 von 7“, obwohl nichts angefangen | 0 | ☑ |
| B76 | Schulrecht und Checklisten getrennt, obwohl beides Nachschlagen | 2 | ☑ |

### Verwaltung
| # | Befund | Ph. | |
|---|---|---|---|
| B77 | F3: Streak veraltet in Nutzerliste/Detail | 0 | ☑ |
| B78 | Nutzer ohne Namen („—“), keine Klasse sichtbar/filterbar | 5 | ☐ |
| B79 | Änderungsprotokoll: Rohcodes „user.name_set“, „Objekt-Typ: user“ | 6 | ☐ |
| B80 | Prüfungssimulation: Zeilenknöpfe „Leistungsnachweis“/„Aktivieren“ unklar; kein Hinweis, dass nichts aktiv ist (F5) | 0 / 2 | ☑ |
| B81 | Fachbereich-Einstellungen: „Zusatzhinweise für den Fragen-Prompt“ – Fachwort | 2 | ☑ |
| B82 | Testdaten in der Live-App („Test“, „Ex“, „Test_Eintrag1“) | 7 | ☐ |

### Design
| # | Befund | Ph. | |
|---|---|---|---|
| B83 | Grün für alles (Hauptaktion, aktiv, gewählt, Erfolg, Schalter, jede Zeile) | 6 | ☐ |
| B84 | Gleiche Inhalte verschieden dargestellt (Tabelle/Karten/Zeilen) | 6 | ☐ |
| B85 | Anlegen mal Dialog, mal Seite, mal Assistent, mal Dialog im Dialog | 6 | ☐ |
| B86 | Zu viele Pillen (Bereich in jeder Zeile, lange Fachnamen) | 6 | ☐ |
| B87 | Wichtiges klein/grau (Fokus-Regel), Filter groß | 6 | ☐ |
| B88 | Tabellen mit 7–8 Spalten passen nicht auf den Laptop | 6 | ☐ |
| B89 | Schüleransicht für Lehrkräfte ohne Rahmen; Lehrkräfte in der Azubi-Rangliste | 6 | ☐ |

### Schülerseite
| # | Befund | Ph. | |
|---|---|---|---|
| B90 | F5: „Prüfung üben“ für alle 3 Teile leer – *Hinweis eingebaut; ein Set muss noch von Hand aktiviert werden* | 0 | ☑ |
| B91 | F6: Quiz abbrechen verwirft Antworten ohne Hinweis | 0 | ☑ |
| B92 | Themennamen uneinheitlich, Dubletten, „Ohne Thema“, alphabetisch statt Unterrichtsreihenfolge, Fachnamen je Bereich verschieden aufgebaut | 7 | ☐ |
| B93 | Blitzrunde startet die Uhr sofort | 7 | ☐ |
| B94 | Lücken startet ohne Erklärung, was „Lücken“ sind | 7 | ☐ |
| B95 | Nach der Antwort: Erklärung und „Weiter“ unter dem Rand | 7 | ☐ |
| B96 | Zahlen oben (1 · 612 · 48) und Kachel „3“ ohne Beschriftung, auch nicht beim Antippen | 7 | ☐ |
| B97 | Fach-Prozent unklar („1 %“ vs. „0 von 25 Themen gemeistert · 3 %“) | 7 | ☐ |
| B98 | „1-Tage-Streak“ holprig; Streak 1, obwohl nur Montag markiert (mit F3 prüfen) – *Streak-Fehler erledigt; Formulierung in Phase 7* | 0 / 7 | ◐ |
| B99 | Beitritt: „Code von deinem Ausbilder“ (gemeint: Lehrkraft); Platzhalter „7K2M-QX“ sieht aus wie ein echter Code | 7 | ☐ |
| B100 | Fantasienamen grammatisch falsch („Gewandter Lieferung“, „Beharrlicher Hubgerüst“) | 7 | ☐ |
| B101 | „Opt-out-Einstellungen“ | 7 | ☐ |

### Aus dem Test mit Kolleg/innen (27.11.2026)
| # | Befund | Ph. | |
|---|---|---|---|
| B102 | Fragen: Klick auf eine Frage soll die Antwortmöglichkeiten aufklappen | 3 | ☐ |
| B103 | Fach-/Themenbaum unübersichtlich: lange Fachnamen über 3 Zeilen, Themen größer als Fächer und kaum eingerückt, „Stufe“ unter jedem Thema | 3 | ☐ |
| B104 | Leistungsnachweise: sichtbar, welche Lehrkraft den Nachweis erstellt hat (heute nur für den Super-Admin) | 4 | ☐ |
