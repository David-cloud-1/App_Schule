# PROJ-128: Baukasten – Video mit Fragen: Aufgabentyp je Frage wählen

## Status: Architected
**Created:** 2026-11-26
**Last Updated:** 2026-11-26
**Priorität:** P2

## Dependencies
- **Requires:** PROJ-90 (Aufgabentyp-Katalog) – dort steht das heutige Formular „Video mit Fragen“
- **Requires:** PROJ-89 (Baukasten-Editor) – Schublade, Prüfstelle, Vorschau
- **Berührt:** PROJ-118 (Eine Leiste für alles) – neue Bedienstellen übernehmen Leiste und Wörter aus `bedien-design.ts` / `bedien-woerter.ts`
- **Berührt:** Kern der Werkzeugkiste (`seite.py`, `qualitaet.py`, `prompt_seite.py`) – rendert und wertet die Fragen aus
- **Nicht Teil:** eingebettetes Video, das an den Zeitpunkten anhält (eigenes Feature, falls gewünscht)

## Hintergrund
„Video mit Fragen“ (`interactive_video`) kennt heute nur eine Art Frage: die Auswahlfrage mit genau einer richtigen Antwort. Das Video öffnet sich in einem neuen Tab. Unter dem Link stehen die Fragen mit „ab Minute …“. Lehrkräfte wollen zu einer Videostelle auch andere Fragearten stellen, etwa eine Aussage prüfen, einen Begriff einsetzen oder Schritte ordnen.

## Entscheidungen (Nutzer, 2026-11-26)
- **E1 – Wo gewählt wird:** im Editor, **je Frage**. Die KI-Erstellung bekommt keine eigene Vorgabe dafür. Was sie heute erzeugt (Auswahlfragen), bleibt gültig.
- **E2 – Umfang:** alle **kurzen Abfrage-Typen**, die zu einem Zeitpunkt im Video passen:
  1. Auswahlfrage, eine richtig (wie heute)
  2. Auswahlfrage, mehrere richtig (**neu im ganzen Baukasten**)
  3. Richtig oder falsch
  4. Lückentext
  5. Offene Frage (eigene Antwort, danach Musterlösung)
  6. Reihenfolge
  7. Zuordnen
  8. Rechenaufgabe

  Ganze Blöcke wie Lehrtext, Bild, Kreuzworträtsel, Memory, Fallakte oder Kapiteltest gehören **nicht** dazu.
- **E3 – Video bleibt, wie es ist:** Link in neuem Tab, Zeitmarke „ab Minute mm:ss“ über jeder Frage.
- **E4 – Auswertung wie heute:** „X von Y richtig“. Alle bewertbaren Fragen zählen gleich. Offene Fragen zählen nicht mit und bleiben ohne Bewertung. Es gibt keine Bestehensgrenze.

## User Stories
- Als Lehrkraft möchte ich beim Hinzufügen einer Video-Frage den Aufgabentyp wählen, damit die Frage zur Videostelle passt (Aussage prüfen, Begriff einsetzen, Ablauf ordnen …).
- Als Lehrkraft möchte ich den Typ einer schon angelegten Video-Frage ändern können, ohne Zeitpunkt und Fragetext neu einzugeben.
- Als Lehrkraft möchte ich in einem Video mehrere Fragetypen mischen, damit das Anschauen abwechslungsreich bleibt.
- Als Schüler/in möchte ich, dass jede Video-Frage genauso funktioniert wie derselbe Aufgabentyp sonst auf der Seite, damit ich nichts Neues lernen muss.
- Als Schüler/in möchte ich nach „Auswerten“ sehen, wie viele Fragen ich richtig hatte und welche Antwort jeweils stimmt.
- Als Lehrkraft möchte ich, dass meine bestehenden Video-Blöcke unverändert weiter funktionieren.

## Acceptance Criteria

### Editor – Typ wählen
- [ ] Unter „Fragen“ im Formular „Video mit Fragen“ heißt der Knopf weiter „Frage hinzufügen“. Danach wählt die Lehrkraft den Typ aus den 8 Typen aus E2. Die Namen stimmen mit `TYP_NAMEN` überein, es ist kein technischer Typname zu sehen.
- [ ] Jede Frage zeigt oben ihren Typ. Über ein Dropdown (mehr als 4 Werte, PROJ-83) lässt er sich ändern.
- [ ] Beim Typwechsel bleiben **Zeitpunkt** und **Fragetext/Arbeitsauftrag** erhalten. Typeigene Felder (Antworten, Lücken, Paare …) starten mit kurzem Beispielinhalt wie im Katalog (PROJ-90 E2). Gehen dabei Eingaben verloren, fragt der Editor vorher nach.
- [ ] Jede Frage hat das Feld **Zeitpunkt (mm:ss)** wie heute, dazu die Felder ihres Typs. Sie entsprechen dem Formular desselben Typs als eigener Block.
- [ ] „Auswahlfrage, mehrere richtig“: Antworten mit Häkchen statt Radioknopf, mindestens eine muss richtig sein.
- [ ] Die Prüfstelle meldet je Frage fehlende Pflichtangaben mit „Thema N – Video mit Fragen, Frage M: …“.
- [ ] Ein neuer Video-Block startet wie heute mit **einer** Auswahlfrage (eine richtig).

### Schülerseite (Kern)
- [ ] Jeder der 8 Typen erscheint im Video-Block mit Zeitmarke und verhält sich wie derselbe Typ als eigener Block (Bedienung, Rückmeldung richtig/falsch, Feedback).
- [ ] „Auswerten“ zeigt „X von Y richtig“. Y zählt nur die bewertbaren Fragen, offene Fragen sind nicht dabei.
- [ ] Besteht der Block nur aus offenen Fragen, gilt er als erledigt, sobald jede Frage beantwortet und ihre Musterlösung aufgedeckt ist. Eine Zahl „0 von 0“ erscheint nie.
- [ ] Der Block zählt wie heute in den Fortschritt der Seite. Antworten bleiben beim Neuladen erhalten, wie bei den übrigen Aufgaben.
- [ ] Druckansicht: Jede Frage erscheint in der Druckform ihres Typs. Die Lösungen stehen wie bisher im Lösungsteil.
- [ ] „Auswahlfrage, mehrere richtig“ zählt nur als richtig, wenn genau alle richtigen Antworten gewählt sind.

### Bestand & KI
- [ ] Vorhandene Video-Blöcke (Fragen ohne `type` oder mit `multiple_choice`) sehen genauso aus und verhalten sich wie vorher.
- [ ] Der Seiten-Prompt darf die neuen Typen verwenden, muss es aber nicht. Die Regel „2–3 Fragen“ bleibt.
- [ ] Unbekannte Fragetypen in einem Video-Block überspringt der Kern mit Warnung (wie beim Kapiteltest). Der Editor zeigt sie als „Unbekannte Frage“ mit Rohfassung, statt sie zu löschen.

## Edge Cases
- **Typwechsel mit Inhalt:** Von Auswahlfrage zu Richtig/Falsch: Die Frage wird zur Aussage, die Antworten gehen verloren. Davor kommt die Rückfrage „Antworten gehen verloren – trotzdem wechseln?“.
- **Mehrere richtig, aber nur eine markiert:** gültig. Die Frage verhält sich dann für Schüler wie „mehrere richtig“ (Häkchen), damit die Anzahl nicht verraten wird.
- **Keine Antwort als richtig markiert** (Auswahl mehrere): Die Prüfstelle meldet „mittel“. Der Kern rendert die Frage und warnt.
- **Zeitpunkt leer oder ungültig:** Die Frage erscheint ohne Zeitmarke, wie heute. Das ist kein Fehler.
- **Zeitpunkte nicht aufsteigend:** Die Reihenfolge der Liste gilt. Der Editor sortiert nicht selbst um, zeigt aber einen leisen Hinweis „Frage 3 liegt vor Frage 2 im Video“.
- **Nur offene Fragen:** siehe AC. Es gibt keine Prozentzahl.
- **Sehr viele Fragen (> 10):** erlaubt. Die Prüfstelle gibt den Hinweis „viele Fragen – Video ggf. teilen“.
- **Block in Material vom Regal übernommen (PROJ-108):** Die Fragetypen bleiben erhalten.

## Technical Requirements (optional)
- Kern und Editor müssen dieselben Fragetypen kennen (eine Liste, Test prüft Gleichstand, wie beim Kapiteltest `_QS_ERLAUBT`).
- Die Bedienung folgt PROJ-83 und PROJ-118 (Dropdown, Wörter aus `bedien-woerter.ts`, 44 px auf Touch).
- Auswertung nur im Browser der Seite, wie heute. Es kommt keine neue Datenbank und kein neuer Server-Weg hinzu.

## Nicht Teil dieser Spec
- Eingebettetes YouTube mit Anhalten an den Zeitpunkten
- Vorgabe für die KI, welche Typen sie für Video-Fragen nutzt
- Bestehensgrenze für Video-Blöcke
- „Auswahlfrage, mehrere richtig“ als eigener Block außerhalb des Videos (kann später aus diesem Feature übernommen werden)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Entscheidung E5 (Nutzer, 2026-11-26): Jede Video-Frage ist eine echte Aufgabe
Jede Frage im Video ist intern die fertige Aufgabe ihres Typs und prüft sich **sofort selbst**, so wie derselbe Typ sonst auf der Seite. Es gibt **keinen gemeinsamen Knopf „Auswerten“** mehr. Oben im Video-Kasten steht ein mitlaufender Stand „3 von 5 gelöst“. Der Block gilt als erledigt, sobald alle bewertbaren Fragen gelöst sind.
- **Folge für den Bestand:** Bestehende Videos zeigen dieselben Fragen weiter. Jede Frage prüft sich jetzt aber einzeln, statt am Ende gemeinsam ausgewertet zu werden. Diese Änderung ist gewollt.
- **Damit ersetzt:** Die Kriterien „‚Auswerten‘ zeigt X von Y richtig“ werden zu „Der Stand zeigt X von Y gelöst“. „Vorhandene Video-Blöcke verhalten sich wie vorher“ gilt nur noch für den **Inhalt**, nicht für den Prüfablauf.
- **Warum:** Der Kern hat für jeden der 8 Typen schon fertige Bedienung, Rückmeldung, Druckform und Speicherung. Nutzt das Video sie mit, gibt es keine zweite Fassung, die mit der Zeit auseinanderläuft. Neue Typen kommen später fast ohne Mehraufwand hinzu.

### A) Aufbau – was die Lehrkraft im Editor sieht
```
Schublade „Video mit Fragen“
+-- Adresse des Videos (wie heute)
+-- Fragen (Liste, verschiebbar)
|   +-- Frage 1
|   |   +-- Kopfzeile: Typname + Knopf „Aufgabentyp ändern“
|   |   +-- Zeitpunkt (mm:ss)
|   |   +-- Formular des gewählten Typs (dasselbe wie beim eigenen Block)
|   +-- Frage 2 …
|   +-- „Frage hinzufügen“ → Katalog, gefiltert auf die 8 Video-Typen
+-- Hinweise der Prüfstelle je Frage
```
Dafür gibt es ein Vorbild: Der **Kapiteltest** macht das schon genauso (gefilterter Katalog, Typwechsel-Knopf, je Frage das Formular des Typs). Das Video übernimmt diesen Aufbau. Es entsteht keine neue Bedienung.

```
Seite für Schüler (Kern)
Video-Kasten
+-- Link zum Video (neuer Tab) + Hinweiszeile
+-- Stand „X von Y gelöst“
+-- Frage 1: Zeitmarke „ab Minute 1:20“ + Aufgabe ihres Typs (prüft sich selbst)
+-- Frage 2: Zeitmarke + Aufgabe …
```

### B) Daten – was gespeichert wird
Am Speicherort ändert sich nichts. Der Block steht wie heute in der YAML des Materials:
- Video-Block: Adresse + Liste der Fragen
- Jede Frage: **Typ**, **Zeitpunkt** in Sekunden und genau die Felder, die derselbe Typ als eigener Block hat (z. B. Lückentext: Text mit *Sternchen*; Reihenfolge: Schritte)
- Fragen ohne Typ gelten wie bisher als Auswahlfrage. Alte Materialien brauchen keine Umwandlung.
- Neu für „mehrere richtig“: Bei der Auswahlfrage dürfen **mehrere** Antworten als richtig markiert sein. Ein eigener Typname ist dafür nicht nötig.

Es gibt keine Datenbank-Änderung, kein neues API und kein neues Paket.

### C) Technische Entscheidungen
| Entscheidung | Warum |
|---|---|
| **Eine Liste der Video-Typen**, die Kern und Editor beide kennen, und ein Test, der den Gleichstand prüft (wie beim Kapiteltest) | Der Editor bietet nie einen Typ an, den die Seite überspringt. |
| **Kern: Jede Frage wird mit dem vorhandenen Baustein ihres Typs gebaut**, als Unter-Aufgabe im Video-Kasten | Bedienung, Feedback, Druck und Speichern sind schon da und getestet. |
| **Fortschritt:** Unter-Aufgaben zählen nicht einzeln in den Seitenbalken. Das Video zählt weiter als **eine** Aufgabe und ist fertig, wenn alle bewertbaren Unter-Aufgaben gelöst sind. | Der Fortschrittsbalken bestehender Seiten bleibt gleich. |
| **Offene Frage** zählt nicht in „X von Y“. Besteht der Block nur aus offenen Fragen, ist er erledigt, wenn alle Musterlösungen aufgedeckt sind. | Entspricht E4. „0 von 0“ erscheint nie. |
| **„Mehrere richtig“** baut der Kern als Auswahlfrage mit Häkchen und Knopf „Prüfen“, sobald mehr als eine Antwort richtig ist oder die Lehrkraft es so einstellt | So verrät die Bedienung nicht, wie viele Antworten richtig sind. Die bisherige Warnung „genau eine erwartet“ entfällt für diesen Fall. |
| **Typwechsel** nutzt PROJ-95: Innerhalb einer Familie (z. B. Auswahl ↔ Richtig/Falsch) bleibt der Inhalt erhalten. Zwischen Familien bleiben Zeitpunkt und Fragetext, der Rest startet mit Beispielinhalt. Vorher kommt dieselbe Rückfrage wie in PROJ-95. | Die Regeln und Dialoge gibt es schon. |
| **Bearbeiten in der Seite (PROJ-114/118):** Adresse und Auswahlfragen gehen weiter direkt in der Seite. Fragen anderer Typen öffnen die Schublade an genau dieser Frage. | Folgt der Regel „in der Seite, wo das geht, sonst die Schublade“. Damit muss das Aufgabenwerk nicht für jeden Typ als Unter-Aufgabe umgebaut werden. |
| **Klick in der Vorschau** auf eine Frage öffnet genau diese Frage (Marke je Unter-Aufgabe) | Gleiches Verhalten wie bei den übrigen Blöcken |
| **Prüfstelle (Kern + Editor):** Meldungen tragen „Frage M“ und prüfen jede Frage mit den Regeln ihres Typs | Gleiche Wortwahl wie bei der übrigen Prüfstelle; Hinweise „Zeitpunkte nicht aufsteigend“ und „mehr als 10 Fragen“ |
| **Seiten-Prompt:** Er erlaubt die 8 Typen beim Video ausdrücklich, „2–3 Fragen“ bleibt | Kleine Änderung, und Abwechslung wird möglich |
| **H5P-Ausgabe:** bleibt bei Auswahlfragen. Andere Typen überspringt sie mit Warnung. | H5P-Material lässt sich im Baukasten nicht bearbeiten, darum gehört die Ausgabe nicht zum Umfang. |

### D) Betroffene Teile
- **App (Editor):** Video-Formular (Aufbau wie Kapiteltest), Liste der Video-Typen, Auswahlfrage mit Häkchen-Modus, Bauplan „Video“ im Aufgabenwerk (nur Auswahlfragen direkt in der Seite), Prüfstelle des Editors, Lösungs-Kennzeichnung der Vorschau
- **Kern (Werkzeugkiste):** Video-Baustein (Unter-Aufgaben), Seitenskript (Stand „X von Y gelöst“, Fortschritt, eigene Rückmeldezeile des Video-Kastens), Auswahlfrage mit mehreren richtigen Antworten, Prüfstelle (`qualitaet.py`), Seiten-Prompt, Kern-Tests
- **Reihenfolge beim Ausrollen:** zuerst der Kern (er versteht dann alte und neue Videos), danach die App. Andersherum würde die Seite neue Fragetypen überspringen.

### E) Risiken
- **Verschachtelte Aufgaben im Seitenskript:** Manche Bausteine suchen ihre Rückmeldezeile oder ihren Zustand innerhalb „ihrer“ Aufgabe. Im Video-Kasten liegen jetzt Aufgaben in einer Aufgabe. Die Kern-Tests müssen für jeden der 8 Typen zeigen, dass jede Rückmeldung bei der richtigen Frage ankommt und gespeicherte Antworten beim Neuladen zurückkommen.
- **Gespeicherter Stand alter Videos:** Bei Schülern, die ein altes Video schon bearbeitet haben, passt der gemerkte Stand nicht mehr. Er wird verworfen, und die Fragen erscheinen leer. Das ist einmalig und harmlos, steht aber hier, damit es nicht überrascht.

### F) Pakete
Keine neuen.

### Modellwahl
- Kern und Seitenskript (verschachtelte Aufgaben, Fortschritt): **Opus**
- Editor-Formular nach dem Vorbild Kapiteltest, Prompt, Tests: **Sonnet**

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
