# PROJ-69: Werkzeugkiste – kostenloser Weg in Teilen (lange Skripte)

## Status: In Progress
**Created:** 2026-11-03
**Last Updated:** 2026-11-03

## Kontext
Im kostenlosen Weg (Prompt kopieren → eigene KI → Antwort zurückkopieren) bekommt die Lehrkraft heute **einen** Prompt für das ganze Skript. Bei langen Skripten scheitert das zweifach:
- Die KI nimmt die Eingabe nicht vollständig an (Praxistest 2026-10-28: 117.000 Zeichen Skript + 37.000 Zeichen Anweisung, ChatGPT Free kürzte die Anweisung weg).
- Die **Antwort bricht ab**, weil sie zu lang wird (Nutzer, 2026-11-03: „bricht irgendwann immer ab“).

PROJ-68 macht Prompt und Antwort kürzer, aber ein dickes Heft bleibt zu lang für eine einzige Antwort. Der bezahlte Weg (PROJ-64) zerlegt lange Skripte schon in Teile. Der Kern kann das (`teilen`, `zusammenfuegen`) und kann aus einer abgeschnittenen Antwort die vollständigen Kapitel retten (`retten`). Diese Spec bringt dasselbe in den kostenlosen Weg.

### Entscheidungen
- **E1 – Qualität vor Kürze (Nutzer, 2026-11-03):** wie PROJ-68 E1.
- **E2 – Automatisch, aber sichtbar (Annahme, Claude 2026-11-03):** Die App entscheidet anhand der Länge, ob geteilt wird. Die Lehrkraft muss nichts einstellen, sieht aber vor dem Kopieren, dass es z. B. „3 Teile“ sind und warum.
- **E3 – Erst die langen Werkzeuge (Annahme, Claude 2026-11-03):** Geteilt wird bei „Ganzes Skript“ und „Kreative Selbstlerneinheit“ (H5P und Seite). Andere Werkzeuge haben kurze Antworten und bleiben bei einem Prompt. Ob weitere folgen, wird nach der Praxis entschieden.
- **E4 – Teilgröße für kostenlose KIs (OFFEN, wird gemessen):** Die Teile sind kleiner als im bezahlten Weg (dort ~22.000 Zeichen Skript). Der Wert wird so festgelegt, dass die Antwort in **ChatGPT Free** mit dem gekürzten Prompt aus PROJ-68 vollständig ankommt. Gemessen an Heft 2, festgehalten in dieser Spec.

## Dependencies
- Requires: PROJ-51 (Ablauf, Schritte 3 und 4, Prüfstelle), PROJ-64 (Kern-Funktionen Teilen, Zusammenfügen, Retten)
- Sollte nach PROJ-68 kommen: Mit kürzerem Prompt passen größere Teile, also braucht es weniger Teile.
- Berührt: PROJ-52 (Meine Materialien): Entwürfe mit Teilen müssen sich speichern und fortsetzen lassen.

## User Stories
- Als **Lehrkraft mit langem Skript und kostenloser KI** möchte ich mehrere kurze Prompts nacheinander bekommen, damit jede Antwort vollständig ankommt.
- Als **Lehrkraft** möchte ich jede Teil-Antwort einzeln einfügen und sofort sehen, ob sie in Ordnung ist, damit ich einen kaputten Teil gleich wiederholen kann und nicht erst am Ende.
- Als **Lehrkraft** möchte ich am Ende **eine** fertige Datei bekommen, wie bei einem kurzen Skript, damit ich die Teile nicht selbst zusammenbauen muss.
- Als **Lehrkraft**, deren KI trotzdem mittendrin abbricht, möchte ich, dass die fertigen Kapitel erhalten bleiben und ich nur den Rest nachholen muss.
- Als **Lehrkraft** möchte ich die Arbeit unterbrechen (z. B. nach Teil 2 von 4) und später weitermachen, ohne die fertigen Teile zu verlieren.
- Als **Lehrkraft mit kurzem Skript** möchte ich, dass sich für mich nichts ändert.

## Acceptance Criteria

### Teilen
- [ ] Ist die Auswahl kürzer als die Teilgröße (E4), ändert sich nichts: ein Prompt, eine Antwort, wie heute.
- [ ] Ist sie länger, zerlegt die App sie an Kapitel-Überschriften bzw. Seitengrenzen in gleichmäßig große Teile (wie im bezahlten Weg). Ein Abschnitt wird nie mitten im Text zerschnitten.
- [ ] Vor dem ersten Kopieren steht ein Satz: „Dein Skript ist lang. Damit die Antwort deiner KI nicht abbricht, bekommst du es in X Teilen.“ Dazu je Teil die enthaltenen Kapitel bzw. Seiten.
- [ ] Jeder Teil-Prompt sagt der KI, welcher Teil es ist („Teil 2 von 3“), und bittet bei Teil 2 ff. um eine Antwort ohne Deckblatt. Deckblatt und Abschlusskapitel entstehen wie im bezahlten Weg.

### Kopieren und Einfügen je Teil
- [ ] Schritt 3/4 zeigt die Teile als Liste mit Zustand: offen, eingefügt und geprüft, mit Befund.
- [ ] Je Teil: „Prompt kopieren“ und ein eigenes Feld für die Antwort.
- [ ] Nach dem Einfügen prüft die App den Teil sofort mit der vorhandenen Prüfstelle und zeigt das Ergebnis in einem Satz.
- [ ] Ein Teil kann jederzeit neu eingefügt werden (ersetzt die alte Teil-Antwort).
- [ ] „Weiter zur Datei“ ist erst möglich, wenn alle Teile eingefügt sind und keiner einen Befund „hoch“ hat.
- [ ] Die App fügt die Teile zu **einer** Antwort zusammen (ein Deckblatt, alle Kapitel in Reihenfolge, ein Abschlusskapitel). Danach laufen Prüfen, Vorschau und Bauen wie heute.

### Abgebrochene Antwort retten
- [ ] Ist eine eingefügte (Teil-)Antwort mittendrin abgeschnitten, erkennt die App das, behält alle vollständigen Kapitel und sagt in einem Satz, welche Kapitel fehlen.
- [ ] Für die fehlenden Kapitel gibt es einen **Nachhol-Prompt** (nur die fehlenden Abschnitte). Dessen Antwort wird an derselben Stelle ergänzt.
- [ ] Das gilt auch bei einem Prompt ohne Teilung (kurzes Skript, KI bricht trotzdem ab).

### Speichern und Fortsetzen
- [ ] Eingefügte Teil-Antworten bleiben beim Verlassen der Seite erhalten. Beim Wiederöffnen des Ablaufs (auch über „Meine Materialien“) steht die Lehrkraft beim nächsten offenen Teil.
- [ ] Ändert die Lehrkraft Auswahl oder Einstellungen, nachdem schon Teile eingefügt sind, fragt die App vorher nach (`AlertDialog`), weil die Teile dann neu entstehen.

### Darstellung
- [ ] Nur vorhandene Bausteine (Button, AlertDialog, Hinweis-Box, Progress, `ws-*`-Farben), mobil bedienbar (44 px), Fortschritt in Worten („Teil 2 von 3 eingefügt“).

## Edge Cases
- **Teil in falscher Reihenfolge eingefügt** (Antwort zu Teil 3 im Feld von Teil 2): Die App vergleicht die Kapiteltitel mit den erwarteten Abschnitten und warnt in einem Satz. Die Lehrkraft entscheidet.
- **Gleiche Antwort zweimal eingefügt:** Warnung „Diese Antwort hast du schon bei Teil X eingefügt.“
- **KI liefert bei Teil 2 doch ein Deckblatt/Abschlusskapitel:** wird beim Zusammenfügen still verworfen bzw. eingesammelt wie im bezahlten Weg.
- **Kapitel überschneiden sich an der Teilgrenze** (gleicher Titel am Ende von Teil 1 und am Anfang von Teil 2): Hinweis in der Vorschau. Kein automatisches Löschen von Inhalt.
- **Skript ohne Überschriften/Seitenmarken** (z. B. .txt): kann nicht sinnvoll geteilt werden → ein Prompt wie heute, plus Hinweis „Bei sehr langen Texten kann die Antwort abbrechen. Dann hilft der Nachhol-Prompt.“
- **Ein einzelner Abschnitt ist allein länger als die Teilgröße:** bleibt ein Teil (nicht zerschnitten). Bricht er ab, greift „retten + Nachhol-Prompt“.
- **Nachhol-Prompt bricht wieder ab:** erneut retten, erneut nachholen. Es gibt keine Höchstzahl, aber ab dem zweiten Mal den Hinweis, den Abschnitt in den Einstellungen kleiner zu wählen.
- **Bilder:** Jeder Teil nennt nur die Bildmarker seiner Abschnitte. In der fertigen Datei sind alle Bilder vorhanden.
- **Bezahlter Weg (PROJ-64) ist eingeschaltet:** Er bleibt davon unberührt und nutzt weiter seine eigene Teilgröße.

## Technical Requirements
- Wiederverwendung der Kern-Funktionen `teilen`, `zusammenfuegen`, `retten` (mit eigener Teilgröße für den kostenlosen Weg). Kein zweiter Mechanismus.
- Sicherheit wie bisher: Lehrer-Rolle, nur eigene Abläufe, Teil-Antworten im privaten Speicher der Werkzeugkiste, Größengrenzen je Teil-Antwort.
- Kein Dev-Server/Browser-Test durch Claude (bringt den Rechner zum Absturz). Browser- und Handytest macht der Nutzer in Produktion.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick in einem Satz
Die App holt sich vom Kern wie im bezahlten Weg die Teile, lässt sich je Teil einen eigenen Prompt bauen, prüft jede eingefügte Teil-Antwort sofort, rettet abgeschnittene Antworten mit einem Weiterschreib-Prompt und fügt am Ende alles zu **einer** Antwort zusammen. Ab dort läuft der bekannte Ablauf (Prüfen, Vorschau, Bauen) unverändert.

### Wer macht was
| Teil | Aufgabe | Neu oder vorhanden |
|---|---|---|
| **Kern** | Auswahl in Teile zerlegen (`teilen`) | vorhanden (PROJ-64), bekommt die **Teilgröße als Angabe** von der App |
| **Kern** | Teile zusammenfügen (`zusammenfuegen`), vollständige Kapitel retten (`retten`), Prüfstelle | vorhanden |
| **Kern** | Prompt für einen Teil: „Teil 2 von 3, ohne Deckblatt“, Schlusszeile am Ende der Antwort | **neu** (kleine Ergänzung am vorhandenen Prompt-Bau) |
| **Kern** | Weiterschreib-Prompt: „Kapitel A–D hast du schon, schreibe ab dort weiter“ | **neu** |
| **Kern** | Erkennen, ob eine Antwort abgeschnitten ist; Kapiteltitel gegen die erwarteten Abschnitte vergleichen | **neu** (eine Prüffunktion) |
| **App (Server)** | Teile anlegen und speichern, Teil-Antwort annehmen und prüfen, zusammenfügen | **neu** |
| **App (Oberfläche)** | Teil-Liste in Schritt 3, Rettung bei abgeschnittener Antwort, Rückfrage bei geänderter Auswahl | **neu** |

Der bezahlte Weg (PROJ-64) bleibt unberührt: Er ruft `teilen` weiter ohne Teilgröße auf und bekommt den bisherigen Wert (22.000 Zeichen).

### Ablauf für die Lehrkraft
```
Schritt 2 „Prompt erstellen“
  │
  ├─ App fragt den Kern: Wie viele Teile bei Teilgröße X?
  │     1 Teil  → alles wie heute (ein Prompt, ein Antwortfeld)
  │     3 Teile → Schritt 3 zeigt die Teil-Liste
  │
  ├─ Je Teil (in beliebiger Reihenfolge, auch mit Pause dazwischen):
  │     „Prompt kopieren“ → eigene KI → Antwort einfügen
  │     App + Kern prüfen sofort:
  │        ✓ vollständig, Befund in einem Satz
  │        ✗ abgeschnitten → vollständige Kapitel bleiben,
  │                          Weiterschreib-Prompt kopieren → Antwort einfügen → wird angehängt
  │        ! falscher Teil / doppelt eingefügt → Warnung, Lehrkraft entscheidet
  │
  ├─ Alle Teile da, keiner „hoch“ → „Weiter zur Datei“
  │     Kern fügt zusammen: ein Deckblatt, Kapitel in Reihenfolge, ein Abschlusskapitel
  │
  └─ Schritt 4 und 5 wie heute (Prüfung der Gesamtantwort, Vorschau, Bauen)
```

### Komponenten (Oberfläche)
```
Ablauf (PROJ-51, bekannter Rahmen, fünf Schritte bleiben)
+-- Schritt 2 „Einstellungen“
|   +-- NEU: Rückfrage-Dialog (AlertDialog), wenn schon Teil-Antworten da sind
|         „Deine 2 eingefügten Teile gehen dabei verloren. Trotzdem ändern?“
+-- Schritt 3 „Prompt kopieren“
|   +-- 1 Teil: unverändert (SchrittPrompt)
|   +-- mehrere Teile: NEU Teil-Liste
|       +-- Hinweis-Box „Dein Skript ist lang … in 3 Teilen.“
|       +-- Fortschritt in Worten + Balken („Teil 1 von 3 eingefügt“)
|       +-- Je Teil eine aufklappbare Karte (Accordion, immer nur eine offen)
|       |   +-- Kopf: „Teil 2 von 3“, enthaltene Kapitel bzw. Seiten, Zustand-Pill
|       |   |         (offen · eingefügt · geprüft · abgeschnitten · Befund)
|       |   +-- „Prompt kopieren“
|       |   +-- Antwortfeld + „Einfügen und prüfen“
|       |   +-- Ergebnis in einem Satz (Prüfstelle)
|       |   +-- Warnung: falscher Teil / schon bei Teil X eingefügt
|       |   +-- Rettungs-Box (nur bei abgeschnittener Antwort)
|       |       +-- „Kapitel 1–4 sind da, ab ‚Haftung des Frachtführers‘ fehlt der Rest.“
|       |       +-- „Weiterschreib-Prompt kopieren“ + eigenes Antwortfeld
|       |       +-- ab der 2. Runde: Tipp „Wähle den Abschnitt in den Einstellungen kleiner.“
|       +-- Fuß: „Weiter zur Datei“ (Hauptaktion, erst aktiv, wenn alles da ist)
+-- Schritt 4 „Antwort prüfen“
|   +-- mehrere Teile: zeigt die zusammengefügte Antwort (kein Einfügefeld mehr)
|   |   +-- Hinweis bei Überschneidung an einer Teilgrenze (gleicher Kapiteltitel)
|   +-- 1 Teil: wie heute, NEU dieselbe Rettungs-Box, wenn die Antwort abgeschnitten ist
+-- Schritt 5 „Fertig“ (unverändert)
```
- Beim Öffnen springt die Liste auf den **nächsten offenen Teil**. Das gilt auch beim Wiederöffnen über „Meine Materialien“.
- Der Prompt eines Teils wird beim Aufklappen geladen, nicht erst beim Klick auf „Kopieren“. So klappt das Kopieren auch auf dem iPhone (Safari erlaubt Kopieren nur direkt nach dem Tippen).
- Nur vorhandene Bausteine: Accordion, Button, Textarea, AlertDialog, Alert (Hinweis-Box), Progress, Badge, `ws-*`-Farben.
- Skript ohne Überschriften und Seitenmarken (.txt): kein Teilen, ein Prompt wie heute plus der Hinweis aus den Edge Cases.

### Daten (in einfachen Worten)
**Ablauf** (vorhanden, `werkzeug_ablaeufe`) bekommt **eine** neue Angabe: die Teil-Liste. Je Teil:
- Nummer und die Auswahl dieses Teils (welche Abschnitte bzw. Seiten), Zeichenzahl
- Titel der enthaltenen Abschnitte (für die Anzeige und den Reihenfolge-Vergleich)
- Zustand: offen, eingefügt, abgeschnitten, fertig
- Ergebnis der Prüfstelle (höchste Stufe, ein Satz)
- Bei Rettung: Zahl der vollständigen Kapitel, Zahl der Weiterschreib-Runden
- Fingerabdruck der Antwort (zum Erkennen von „doppelt eingefügt“)
- Die verwendete Teilgröße (damit eine spätere Änderung von E4 alte Entwürfe nicht durcheinanderbringt)

Die Teil-Antworten selbst liegen als Dateien im **privaten Speicher** der Werkzeugkiste, im Ordner des Ablaufs (wie die Teil-Antworten im bezahlten Weg). Nach dem Zusammenfügen steht die Gesamtantwort wie heute im Feld `antwort` des Ablaufs. Die Teil-Dateien bleiben liegen, bis der Ablauf gelöscht wird, damit ein einzelner Teil später noch ersetzt werden kann.

**Ohne Teil-Liste** (alte Entwürfe, kurze Skripte, alle anderen Werkzeuge) gilt alles wie bisher.

**Wer sieht was:** wie bisher. Nur die Lehrkraft selbst (Zeilen-Regeln von `werkzeug_ablaeufe`), Dateien nur über den Server. Kein Super-Admin-Zugriff auf fremde Teile.

### Teilgröße (E4)
- **Startwert: 8.000 Zeichen Skripttext je Teil.** Grundlage ist die Messung aus PROJ-68: Heft 2 (22.000 Zeichen) ergibt mit dem neuen Prompt ~19.000 Token Antwort, also etwa 0,9 Token je Skript-Zeichen. 8.000 Zeichen ergeben ~7.000 Token und damit eine Antwort, die kostenlose KIs erfahrungsgemäß noch am Stück ausgeben.
- Der Wert steht an **einer** Stelle in der App und wird dem Kern mitgegeben. Der Nutzer misst ihn an Heft 2 in ChatGPT Free (Teil 1 von 3 einfügen, kommt die Antwort vollständig?). Das Ergebnis wird in dieser Spec festgehalten und der Wert bei Bedarf angepasst. Das ist eine Zeile, kein Umbau.
- Heft 2 wird damit zu **3 Teilen**, das 117.000-Zeichen-Skript zu etwa 15. Für sehr lange Skripte zeigt der Hinweis zusätzlich: „Tipp: Wähle in Schritt 1 nur die Kapitel für die nächsten Wochen aus.“
- Die Warnschwelle des Kerns (60.000 Zeichen, „sehr langes Skript“) erscheint im Teil-Weg nicht mehr, denn sie gilt für einen einzigen Prompt.

### Abgeschnittene Antwort erkennen und retten
- **Erkennen:** Jeder Prompt (auch ohne Teilung) bittet die KI, als letzte Zeile eine feste Schlusszeile zu schreiben. Fehlt sie, oder ist das Abschlusskapitel bzw. das letzte Kapitel unvollständig oder die Antwort nicht lesbar, gilt sie als abgeschnitten. Die Schlusszeile ist ein Kommentar und stört weder Prüfen noch Bauen. Zwei Merkmale statt einem, weil manche KIs die Schlusszeile vergessen, obwohl alles da ist: Dann entscheidet der Aufbau.
- **Retten:** Die vorhandene Kern-Funktion `retten` behält alle vollständigen Kapitel (wie im bezahlten Weg).
- **Nachholen:** Statt „nur die fehlenden Abschnitte“ fragt der Weiterschreib-Prompt nach dem **Rest dieses Teils**: Er enthält denselben Skripttext und nennt die schon fertigen Kapiteltitel („Diese Kapitel hast du schon geschrieben … Schreibe ab dem nächsten weiter, ohne Deckblatt“). Die Antwort wird hinten angehängt (über `zusammenfuegen`).
  - **Warum so:** Welche Abschnitte des Skripts ein Kapitel abdeckt, lässt sich nicht sicher zuordnen (die KI fasst Abschnitte zusammen oder teilt sie). Die KI selbst weiß anhand der Titel, wo sie aufgehört hat. Der Prompt bleibt trotzdem kurz, denn der Teil hat nur ~8.000 Zeichen.
- Bricht auch der Weiterschreib-Prompt ab: wieder retten, wieder weiterschreiben. Ab der zweiten Runde steht der Tipp, den Abschnitt kleiner zu wählen.

### Warnungen (Edge Cases)
| Fall | Wie erkannt | Was passiert |
|---|---|---|
| Antwort zu Teil 3 im Feld von Teil 2 | Kern vergleicht die Kapiteltitel der Antwort mit den Abschnittstiteln des Teils (grobe Wortübereinstimmung) | Warnung in einem Satz, Lehrkraft entscheidet („trotzdem übernehmen“ / „ersetzen“) |
| Gleiche Antwort zweimal | Fingerabdruck stimmt mit einem anderen Teil überein | „Diese Antwort hast du schon bei Teil X eingefügt.“ |
| Teil 2 liefert doch ein Deckblatt/Abschlusskapitel | beim Zusammenfügen | wie im bezahlten Weg: Deckblatt verworfen, Abschlussfragen eingesammelt |
| Gleicher Kapiteltitel an einer Teilgrenze | beim Zusammenfügen | Hinweis in Schritt 4, nichts wird gelöscht |
| Ein Abschnitt allein größer als die Teilgröße | `teilen` schneidet nie mitten im Abschnitt | bleibt ein Teil, bei Abbruch greift die Rettung |
| PDF/Word-Bilder | Prompt je Teil nennt nur die Bildmarker seiner Seiten/Abschnitte | Bauen nutzt das ganze eingelesene Skript, alle Bilder sind da |

### Schnittstellen der App (neu, in Worten)
- **Teile anlegen:** beim „Prompt erstellen“. Liefert die Teil-Liste, bei 1 Teil wie bisher den einen Prompt.
- **Prompt eines Teils holen** (normal oder Weiterschreiben).
- **Teil-Antwort einfügen:** speichert die Datei, prüft, erkennt Abbruch, rettet, prüft auf Reihenfolge und Doppel, gibt Zustand und Satz zurück.
- **Zusammenfügen:** erst wenn alle Teile da sind und keiner „hoch“ hat; schreibt die Gesamtantwort, Schritt 4 folgt.
- **Teile verwerfen:** nach der Rückfrage bei geänderter Auswahl oder Einstellung.

Alle mit der Prüfung „Lehrer-Rolle und eigener Ablauf“ wie die vorhandenen Routen, Größengrenze je Teil-Antwort 500.000 Zeichen (wie beim Kapitel-Einsetzen), Gesamtantwort wie bisher höchstens 2 Mio. Zeichen, höchstens 40 Teile je Ablauf.

### Technische Entscheidungen (warum)
| Entscheidung | Warum |
|---|---|
| Kern-Funktionen aus PROJ-64 wiederverwenden, nur Teilgröße als Angabe | Ein Mechanismus für beide Wege. Fehler werden einmal behoben. |
| Teil-Liste als eine Angabe am Ablauf, Antworten als Dateien | Keine neue Tabelle, „Meine Materialien“ und das Aufräumen nach 7 Tagen greifen von selbst. Große Texte gehören in den Speicher, nicht in die Zeile. |
| Prompt je Teil beim Aufklappen holen, nicht alle vorab speichern | Der Prompt ergibt sich jederzeit neu aus Skript, Auswahl und Einstellungen. Kein Speicher für 15 × 25.000 Zeichen. |
| Weiterschreib-Prompt statt Prompt für „fehlende Abschnitte“ | Kapitel lassen sich Abschnitten nicht sicher zuordnen. Weiterschreiben ab dem letzten fertigen Titel ist robust. |
| Schlusszeile + Aufbauprüfung zum Erkennen eines Abbruchs | Im kostenlosen Weg gibt es keine Meldung „Antwort abgeschnitten“ wie bei der bezahlten KI. |
| Fünf Schritte bleiben, Teile leben in Schritt 3 | Die Lehrkraft kennt den Ablauf. Schritt 4 (Prüfen, Vorschau) bleibt eine Stelle für die Gesamtantwort. |
| Nur „Ganzes Skript“ und „Kreativ“ (E3) | Nur sie haben lange Antworten. Die Liste der Werkzeuge mit Teilen steht an einer Stelle und lässt sich erweitern. |

### Risiken und offene Punkte
- **E4 nicht gemessen:** 8.000 Zeichen sind eine Hochrechnung. Ist ChatGPT Free knapper, wird die Rettung oft gebraucht. Dann den Wert senken (z. B. 6.000). Messung durch den Nutzer an Heft 2 vor dem Deploy oder direkt danach.
- **Viele Teile bei sehr langen Skripten:** 15 Mal kopieren ist mühsam, aber jeder Teil kommt an. Der Tipp „nur die nächsten Kapitel auswählen“ lenkt dahin, wie Lehrkräfte ohnehin arbeiten.
- **Abschlusskapitel aus vielen Teilen:** `zusammenfuegen` begrenzt die Fragen schon heute (höchstens 15). Bei 15 Teilen kommt aus jedem nur eine Frage, also prüfen wir das Ergebnis am 117.000-Zeichen-Skript.
- **Reihenfolge-Vergleich ist grob:** Er warnt nur, er blockiert nie. Fehlalarme kosten einen Klick.
- **Aufräumen:** Beim Bau prüfen, dass der tägliche Zeitplan den ganzen Ordner des Ablaufs löscht, also auch die Teil-Dateien.

### Abhängigkeiten (Pakete)
Keine neuen. App: vorhandene shadcn-Bausteine. Kern: vorhandenes Python (PyYAML).

### Umfang des Baus
- **Kern** (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`): Teilgröße als Angabe bei `teilen`, Teil-Angabe und Schlusszeile im Prompt, Weiterschreib-Prompt, Abbruch- und Reihenfolge-Prüfung, Tests. Kern-Deploy durch den Nutzer.
- **Datenbank:** eine neue Angabe (Teil-Liste) an `werkzeug_ablaeufe`, mit Rücknahme. Einspielen durch den Nutzer im SQL Editor.
- **App-Server:** die fünf Schnittstellen oben, Tests.
- **Oberfläche:** Teil-Liste in Schritt 3, Rettungs-Box (Schritt 3 und 4), Rückfrage in Schritt 2, Tests.
- **Reihenfolge:** Kern zuerst (die App braucht die neuen Kern-Funktionen), dann Datenbank, dann App.

## Backend-Umsetzung

### Kern (2026-11-03, `~/Schule/Werkzeugkiste`, Zweig `proj69`, Commit `9e66c8a`, noch nicht auf `vercel-kern`, nicht deployt)
- **`POST /api/teilen`** nimmt `max_zeichen` (begrenzt auf 2.000–40.000). Ohne Angabe gelten wie bisher 22.000 Zeichen, der bezahlte Weg bleibt also unverändert.
- **`POST /api/prompt`** nimmt `teil: {nr, von, fertig}` (nur `skript`/`kreativ`, sonst Fehler):
  - `von > 1`: Block **TEILAUFTRAG – TEIL n VON N**. Teil 1 beginnt mit `cover:`, ab Teil 2 ohne. `final_chapter` hat nur `ceil(12/N)` Fragen (2–5) und `ceil(8/N)` Kernaussagen (1–4) zu diesem Teil, damit die zusammengefügte Lernzielkontrolle mindestens 8 Fragen hat.
  - `fertig: [Kapiteltitel]`: Block **WEITERSCHREIBEN**. Er nennt die fertigen Kapitel, verlangt nur die restlichen, ohne `cover:`, und bei `von = 1` ein Abschlusskapitel über die ganze Einheit.
  - Beide Blöcke stehen vor `LEHRTEXT:`. Bei Teilen entfällt die Warnung ab 60.000 Zeichen.
- **Schlusszeile:** Jeder Prompt für „Ganzes Skript“ und „Kreativ“ (auch ohne Teil) verlangt am Ende die Zeile `# ENDE DER ANTWORT`. Das ist ein YAML-Kommentar und stört weder Prüfen noch Bauen.
- **`POST /api/teil-pruefen`** `{antwort, werkzeug, einlesung?, teile?: [auswahl], nr?}` → `{vollstaendig, lesbar, kapitel: [titel], gerettet: yaml|null, geretteteKapitel, eherTeil: n|null}`.
  - Vollständig = Schlusszeile vorhanden **oder** `final_chapter` mit `question_set` und `summary`.
  - Unlesbar, aber mit Schlusszeile = nicht abgeschnitten, sondern fehlerhaft: Das meldet wie bisher die Prüfstelle.
  - Sonst `retten`. `gerettet = null`, wenn kein Kapitel vollständig ist.
  - `eherTeil`: Vergleich der Wörter, die nur im Skripttext eines Teils vorkommen. Gemeldet wird nur bei klarem Abstand (mindestens 8 und mindestens doppelt so viele wie beim eigenen Teil). Die Einlesung wird nur geladen, wenn `teile` mitkommt.
- **`POST /api/zusammenfuegen`** liefert zusätzlich `hinweise`, z. B. „Teil 1 endet und Teil 2 beginnt mit dem Kapitel …“. Das gilt bei gleichem Kapiteltitel an einer Teilgrenze (ohne Nummern verglichen).
- **Gerettet + Weiterschreiben:** Die App fügt `[gerettet, fortsetzung]` mit `zusammenfuegen` zusammen. Das Deckblatt kommt aus dem geretteten Teil, das Abschlusskapitel aus der Fortsetzung.
- **Tests:** 14 neu (`KostenlosInTeilen`). Die alten Vergleiche „zeichengleich mit der alten Oberfläche“ gelten für den Prompt ohne den Schlusszeilen-Block (`_ohne_schluss`). Ergebnis: 155 grün, `prompt_diff.py` synchron, `werkzeugtest.py` 22/24 (bekannte Altfehler Podcast, Deploy-Paket).
- **Heft 2 mit 8.000 Zeichen:** **4 Teile** (Seiten 1–4, 5–9, 10–14, 15–17; 6.301 / 7.203 / 7.519 / 3.901 Zeichen), nicht 3 wie im Design geschätzt. Ein Teil-Prompt hat 23.000–26.500 Zeichen. Eine halb abgeschnittene echte Antwort wird erkannt, 4 Kapitel bleiben erhalten.

### Kern, Nachtrag (Commit `89537a4`)
- `POST /api/pruefen` nimmt `teil: true`: Ein Teil wird nicht für sein kleines oder fehlendes Abschlusskapitel bemängelt („Abschlussquiz zu kurz“, „Abschlusskapitel fehlt“). Ohne `teil` gilt die volle Regel. Kern-Tests: 156 grün.

### Datenbank (`supabase/migrations/20261106_proj69_teile.sql`, Rücknahme `_down.sql`, **noch nicht eingespielt**)
- Eine neue Spalte `werkzeug_ablaeufe.teile` (jsonb, NULL = kein Teil-Weg, höchstens 200 KB). Keine neue Tabelle und keine neue Regel: Die Zeilen-Regeln von `werkzeug_ablaeufe` gelten für die Spalte von selbst.
- **Vor dem App-Deploy einspielen**, denn die Spalte steht in der Spaltenliste jeder Abfrage (`ABLAUF_SPALTEN`).

### App-Server (2026-11-03)
**Typen** (`src/lib/werkzeugkiste.ts`): `AblaufTeile` (Teilgröße, Teile, `zusammengefuegt`, `hinweise`), `AblaufTeil` (Nummer, `inhalt`, Auswahl, Zustand `offen`/`abgeschnitten`/`fertig`, Kapitel, Befund `ok`/`mittel`/`hoch`, Satz, Runden, Fingerabdruck), `AblaufAbbruch` an der Prüfung (`pruefung.abgeschnitten`: Kapitel, rettbar, Runde), Konstanten `TEIL_ZEICHEN_KOSTENLOS` (8.000, E4) und `TEILE_MAX` (40). `Ablauf.teile` ist neu. **Schrittregel:** Schritt 3 ist mit Prompt *oder* Teil-Liste erlaubt, Schritt 4 mit Teil-Liste erst nach dem Zusammenfügen.

**Schnittstellen** (alle: Lehrer-Rolle, nur eigene Abläufe, Zod mit `.strict()`):
| Route | Aufgabe |
|---|---|
| `POST …/ablaeufe/:id/prompt` (geändert) | Bei „Ganzes Skript“ und „Kreativ“ fragt sie den Kern `/api/teilen` mit 8.000 Zeichen. Bei mehr als einem Teil entsteht die Teil-Liste (`prompt: null`, eine alte Antwort entfällt), sonst der eine Prompt wie bisher. Sind schon Teil-Antworten da, bleibt alles unverändert. |
| `PATCH …/ablaeufe/:id` (geändert) | Ändert sich Auswahl, Einstellung oder Werkzeug wirklich und es gibt eingefügte Teil-Antworten, antwortet sie mit **409** `{code: 'teile_vorhanden', eingefuegt: n}`. Die Oberfläche fragt dann nach (`AlertDialog`) und ruft `DELETE …/teile`. Ohne eingefügte Antwort entfällt die Teil-Liste still. |
| `DELETE …/ablaeufe/:id/teile` | Teil-Liste, Teil-Dateien und eine zusammengefügte Gesamtantwort verwerfen. |
| `POST …/teile/:nr/prompt` `{weiter?}` | Prompt dieses Teils, mit `weiter` der Weiterschreib-Prompt. Nichts wird gespeichert. |
| `POST …/teile/:nr/antwort` `{antwort, weiter?, trotzdem?}` | Teil-Antwort prüfen und speichern. Antwort: `{uebernommen: true, ablauf, teil, geretteteKapitel, nachbesserungsPrompt, tippKleiner}`. Bei Warnung (`doppelt`, `falscher_teil`) oder unlesbarer Antwort: `{uebernommen: false, warnung \| fehler}` ohne Speichern. Mit `trotzdem: true` wird die Warnung übergangen. |
| `POST …/ablaeufe/:id/zusammenfuegen` `{unvollstaendigOk?}` | Teile zu **einer** Antwort zusammenfügen, prüfen, ablegen. 400 bei offenem Teil oder Befund „hoch“, **409** `{code: 'unvollstaendig', teile}` bei abgeschnittenem Teil ohne Zustimmung. Antwort enthält `hinweise` (Überschneidung, unvollständiger Teil). |
| `POST …/ablaeufe/:id/weiterschreiben` | Für eine Antwort **ohne Teile**, die die Prüfung als abgeschnitten gemeldet hat: kürzt sie auf die vollständigen Kapitel und liefert den Weiterschreib-Prompt (`prompt`, `kapitel`, `runde`, `tippKleiner`). |
| `POST …/ablaeufe/:id/fortsetzung` `{antwort}` | Antwort auf diesen Prompt: wird angehängt, die Gesamtantwort geprüft. Bricht auch sie ab, bleiben ihre Kapitel und die nächste Runde folgt. |
| `POST …/ablaeufe/:id/pruefen` (geändert) | Bei „Ganzes Skript“ und „Kreativ“ fragt sie zusätzlich den Kern, ob die Antwort abgeschnitten wirkt, und legt `pruefung.abgeschnitten` ab. Fällt die Zusatzfrage aus, gilt die Prüfung trotzdem. |

**Abweichungen vom Design**
- **Fertig bauen räumt auf:** Nach dem Bauen entfallen Teil-Liste und Teil-Dateien (die Gesamtantwort bleibt am Ablauf). Die Spec ließ sie liegen; bei fertigen Materialien sind Teile nicht mehr änderbar (400), „Antwort überarbeiten“ arbeitet auf der Gesamtantwort.
- **Neu einlesen** verwirft die Teile (sie gehören zum alten Skript).
- **Weiterschreiben ohne Teile** ist nur freigegeben, wenn die Prüfung einen Abbruch gemeldet hat: Sonst würde eine vollständige Antwort beim Retten ihr Abschlusskapitel verlieren.
- **Teil-Dateien** heißen `teil-frei-<nr>.yaml` (die des bezahlten Wegs `teil-<nr>.yaml`), damit beide Wege nie kollidieren.
- **Runden** zählen bei Teilen die eingefügten, ohne Teile die ausgegebenen Weiterschreib-Prompts. Der Tipp „kleineren Abschnitt wählen“ (`tippKleiner`) erscheint, sobald auch die Nachhol-Antwort abbricht (Teile) bzw. ab der zweiten Runde (ohne Teile).

**Tests:** `src/app/api/admin/werkzeugkiste/teile.test.ts` (48: Teil-Liste anlegen, kurzes Skript und kurze Werkzeuge unverändert, eingefügte Teile bleiben, 409 bei Änderung, Teil-Prompt und Weiterschreiben, vollständig/abgeschnitten/Fortsetzung/doppelt/falscher Teil/unlesbar/schwerer Befund, Zusammenfügen mit Sperren und 409, Abbruch ohne Teile, Aufräumen beim Bauen, Hilfsfunktionen). Ein bestehender Test (Prompt-Route) kennt die zusätzliche Frage an den Kern. Gesamtsuite 2.401 grün, Typen, Lint und Build sauber.

**Nicht geprüft:** Echter Lauf gegen den deployten Kern (Kern ist nur lokal getestet), Oberfläche (kommt mit `/frontend`).

## Frontend-Umsetzung (2026-11-03)

**Neue Bausteine** (`src/components/werkzeugkiste/`)
- `schritt-teile.tsx`: **Schritt 3 bei Teilen.** Hinweis „Dein Skript ist lang … in N Teilen“ (ab 8 Teilen mit dem Tipp, in Schritt 1 weniger Kapitel zu wählen), Fortschritt in Worten und als Balken („1 von 3 Teilen eingefügt“), eine aufklappbare Karte je Teil (immer nur eine offen, beim Öffnen der erste unfertige Teil). Je Teil: Kopfzeile mit Inhalt und Zustand als getönte Pill (offen · geprüft · mit Hinweisen · Fehler · abgeschnitten, immer mit Wort), „Prompt kopieren“, Antwortfeld, „Einfügen und prüfen“, Prüfergebnis in einem Satz. Fertige Teile lassen sich ersetzen. Unter der Liste steht, warum „Weiter zur Datei“ noch gesperrt ist.
  - **Prompt beim Aufklappen holen**, nicht erst beim Kopieren, damit „Kopieren“ auf dem iPhone direkt nach dem Tippen läuft. Prompts und Entwürfe überleben das Zuklappen.
  - **Warnungen** („schon bei Teil X eingefügt“, „passt eher zu Teil X“) erscheinen mit „Trotzdem bei Teil N übernehmen“ und „Nicht übernehmen“; der Text bleibt im Feld.
  - Nach dem Einfügen geht die Liste zum nächsten unfertigen Teil, **außer** der Teil hat einen schweren Befund oder ist abgeschnitten. Dann bleibt er offen, damit Satz, Nachbesserungs-Prompt bzw. Rest-Prompt zu sehen sind.
- `abbruch-rettung.tsx`: **Rettungs-Box** für eine abgeschnittene Antwort. Nennt die fertigen Kapitel, holt den Weiterschreib-Prompt (bei Teilen sofort, ohne Teile auf Knopfdruck, weil das Holen die Antwort kürzt), „Anhängen und prüfen“. Bricht auch das Nachholen ab, erscheint der Tipp „kleineren Abschnitt in Schritt 1 wählen“. Ein abgeschnittener Teil lässt sich alternativ ganz neu anfragen.
- `teile-dialoge.tsx`: zwei `AlertDialog`: **„Die Teile entstehen neu“** (Auswahl oder Einstellung ändern bei eingefügten Teilen, roter Bestätigungsknopf) und **„Ein Teil ist unvollständig“** (Weiter ohne den Rest, mit „Rest nachholen“ als sichere Wahl).

**Geändert**
- `ablauf-seite.tsx`: Schritt 3 zeigt bei `ablauf.teile` die Teil-Liste mit eigenem Titel „Dein Skript in Teilen“. „Weiter zur Datei“ (die eine grüne Hauptaktion) ist gesperrt, solange ein Teil fehlt oder einen schweren Befund hat; ist schon zusammengefügt, geht es ohne neuen Kern-Aufruf weiter. Schritt 1 und 2 speichern über `speichereMitRueckfrage`: Antwortet der Server mit 409 `teile_vorhanden`, fragt der Dialog nach, verwirft die Teile und speichert erneut. Schritt 4 zeigt die Hinweise vom Zusammenfügen und, für Antworten ohne Teile, die Rettungs-Box (ist nichts zu retten, steht ein Satz statt eines nutzlosen Knopfs).
- `schritt-antwort.tsx`: neue Felder `hinweise` und `rettung`.
- `werkzeugkiste-api.ts`: `WerkzeugFehler` trägt den `code` der Schnittstelle (`teile_vorhanden`, `unvollstaendig`); neue Aufrufe `ladeTeilPrompt`, `sendeTeilAntwort`, `fuegeTeileZusammen`, `verwirfTeile`, `schreibeWeiter`, `setzeFort`.
- Nur vorhandene Bausteine (Accordion, Badge, Progress, Button, Textarea, AlertDialog) und `ws-*`-Farben; Bedienelemente mindestens 44 px; Zustände nie nur als Farbe.

**Tests:** `teile.test.tsx` (29: Hilfen, Teil-Liste, Einfügen, Warnungen, Fehler, Rettung, Dialoge) und `teile-seite.test.tsx` (16: Schritt 3 mit Sperre, Zusammenfügen, Rückfragen, Rückfrage in Schritt 2, Rettung in Schritt 4). Gesamtsuite 2.446 grün, Typen und Build sauber, Lint ohne neue Meldung. Beim Schreiben der Tests aufgefallen und behoben: Die Liste sprang nach einem schweren Befund zum nächsten Teil und versteckte den Fehlersatz.

**Nicht geprüft:** Aussehen, Handy (insbesondere Kopieren auf dem iPhone), echter Ablauf gegen den deployten Kern. Browser- und Handytest macht der Nutzer in Produktion.

### Noch offen
- **Deploy-Reihenfolge:** 1) Migration `20261106_proj69_teile.sql` im SQL Editor einspielen, 2) Kern `proj69` nach `vercel-kern` und deployen, 3) App deployen. Danach E4 (8.000 Zeichen) an Heft 2 in ChatGPT Free messen und den Wert in `TEIL_ZEICHEN_KOSTENLOS` bei Bedarf anpassen.
- `/qa`: gegen die Akzeptanzkriterien prüfen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
