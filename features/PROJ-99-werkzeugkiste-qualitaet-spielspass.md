# PROJ-99: Werkzeugkiste – höhere Qualität und Spielspaß für Selbstlerneinheiten

## Status: In Progress
**Created:** 2026-11-16
**Last Updated:** 2026-11-16 (Schritte 1, 3 und 4 gebaut, Kern live)

## Idee in einem Satz
Selbstlerneinheiten, die die Werkzeugkiste aus einem Skript baut, sollen abwechslungsreich und spielerisch sein, sodass Schüler sie ohne zusätzliche Erklärung durcharbeiten und gern machen, bei gleich langem oder kürzerem Prompt.

## Kontext
- Anlass (Nutzer, 2026-11-16): Heft 3 „Haftung des Spediteurs nach ADSp“ (Skript `~/Schule/Zwischenspeicher/Spedition/Heft_3_ADSp_26_27.docx`, in 10 Teile zerlegt) wirkt langweilig und gleichförmig. Ziel ist **nicht** nur dieses Heft, sondern **alle weiteren Skripte**.
- Das Skript ist die **Lehrer-Lösungsfassung** eines Aufgabenblatts: Kurzantworten, ja/nein-Fälle mit Begründung, SZR-Rechnungen, Tabelle der Haftungsgrenzen.
- Befund im Kern (`~/Schule/Werkzeugkiste`, `prompts.py`, Zweig `vercel-kern`):
  1. **Starres Kapitelmuster:** Impuls → Erarbeiten → „Hilfe 1/2/3“ → Selbstkontrolle → Merke-Box → Abschlussquiz. Jede Station sieht gleich aus.
  2. **Abwechslung nur als schwache Bitte:** „Typen abwechseln, wo es geht“, „verschiedene Boxen abwechseln“. Kein Mindestmix, keine Pflicht-Spielform.
  3. **Spiel-Typen werden nie verlangt:** Reihenfolge, Fallakte, Schätzrunde, Memory, Kreuzworträtsel u. a. gibt es im Kern, der Prompt fordert sie aber nicht.
  4. **Skript-Aufgaben werden 1:1 übernommen** („Lösung erscheint nur im Feedback“, „Situation exakt übernehmen“).
  5. **Zehn Teile ohne Gesamtblick** (PROJ-69): Jeder Teil wird einzeln erzeugt, keiner kennt die anderen.
  6. **Deko-Bild ohne Fachbezug** (Heft 3: Flugzeug und Schiffe zu „Haftung“).
  7. **Kein Spaß-Rahmen:** Geschichte, Spannung und Auflösung kommen im Prompt nicht vor.
- **Messung 2026-11-16 (Heft 3, alter Weg):** Der Typenmix ist nicht arm (rund 19 Typen). Das Problem ist der **gleiche Rhythmus in jedem Kapitel**: identischer Schlussblock in 14 von 14 Kapiteln (25 % aller Elemente), 22 % Aufklapper, nur 8 % Spiel-Typen, 9 Typen nie verwendet. Details: [proj99_baseline_heft3.md](../docs/qualitaet-werkzeuge/proj99_baseline_heft3.md). Die Regeln in B) wurden danach angepasst (ursprünglich: „Format höchstens zweimal hintereinander“, das greift nicht).
- Prompt heute (Kreativ, Ausgabe Seite, ohne Skripttext): **25.100 Zeichen** (~7.200 Token). Größte Blöcke: Ausgabeformat Seite 8.900, Ausgabeformat YAML 3.400, Aufgabentypen 2.100, Design-Richtlinien 1.500, Erarbeitung & Hilfen 1.200, Selbstprüfung 950.

## Entscheidungen (Nutzer, 2026-11-16)
- **E1 – Planung:** **Ein Plan vorab, in jeden Teil eingebettet.** Ein zusätzlicher Prompt am Anfang erzeugt einen Gesamtplan für das Heft (Spielform je Station, roter Faden). Die Lehrkraft fügt den Plan einmal ein, danach steckt er automatisch in jedem Teil-Prompt. Kostet einen Kopiervorgang mehr, sichert Abwechslung über das ganze Heft.
- **E2 – Skript-Aufgaben:** **Frei umbauen, Fachinhalt und Zahlen bleiben.** Aus Skript-Aufgaben darf ein passendes Format werden (z. B. ja/nein-Tabelle → Sortierspiel, Rechenfälle → Schätzrunde oder Fallakte). Fachaussagen, Rechenwerte und Lösungen des Skripts bleiben unverändert.
- **E3 – Strenge:** **Harte Regeln, die Prüfstelle meldet Verstöße als Hinweis.** Verstöße sperren das Veröffentlichen nicht (wie PROJ-89 E9).
- **E4 – Umfang erster Wurf:** **Nur Selbstlerneinheit** („Kreativ“ und „Ganzes Skript“) **als Seite**. Andere Werkzeuge und die H5P-Ausgabe bleiben unberührt.
- **E5 – Qualität vor Kürze (aus PROJ-68 E1):** Jede Kürzung muss im Vorher/Nachher-Vergleich bestehen, sonst wird sie zurückgenommen.
- **E6 – Modelle (Vorschlag, beim Review bestätigen):** Spezifikation und Architektur mit Sonnet. **Opus** für die Neufassung des Prompts und für den Qualitätsvergleich (Urteil über „besser, nicht nur anders“). Bescheid sagen, wenn es so weit ist (siehe Memory „Modellwechsel Werkzeugkiste“).

## Dependencies
- Requires: PROJ-51 (Ablauf, Prüfstelle), PROJ-69 (Teile im kostenlosen Weg), PROJ-68 (kürzere Prompts, Vorher/Nachher-Methode), PROJ-89 ff. (Prüfstelle im Editor, Hinweise)
- Berührt: PROJ-71 (lange Abschnitte zerlegen: Plan muss mit der Zerlegung zusammenpassen), PROJ-52 (Entwürfe mit Plan müssen sich speichern und fortsetzen lassen), PROJ-90 (Katalog der Aufgabentypen als Grundlage der Spielform-Tabelle)
- Eingriff im Kern-Repo `~/Schule/Werkzeugkiste`, Zweig `vercel-kern` (Prompts, Prüfstelle). PROJ-64 (bezahlte KI) bleibt pausiert und ist nicht betroffen.

## User Stories
- Als **Lehrkraft** möchte ich, dass aus meinem Skript eine Einheit mit **verschiedenen Aufgabenformen** und einem roten Faden entsteht, damit meine Schüler gern damit arbeiten.
- Als **Schüler** möchte ich die Einheit **ohne zusätzliche Erklärung** durcharbeiten können und dabei Spiel-Elemente (Sortieren, Fallgeschichte, Schätzen, Rätsel) statt immer gleicher Fragen erleben.
- Als **Lehrkraft mit langem Skript (10 Teile)** möchte ich, dass die Teile **zusammenpassen** und sich nicht wiederholen, damit das ganze Heft abwechslungsreich ist.
- Als **Lehrkraft** möchte ich, dass **meine Fachaussagen und Rechenwerte unverändert** bleiben, auch wenn Aufgaben anders aussehen.
- Als **Lehrkraft** möchte ich **vor dem Veröffentlichen sehen**, wo das Heft zu gleichförmig ist oder Bilder ohne Bezug enthält, damit ich gezielt nachbessern kann.
- Als **Lehrkraft mit kostenloser KI** möchte ich, dass die Prompts **nicht länger** werden und die Antworten weiter vollständig ankommen.
- Als **Betreiber der App** möchte ich **messen**, dass der neue Weg wirklich besser ist, damit ich nicht nur eine andere, sondern eine bessere Einheit bekomme.

## Acceptance Criteria

### A) Gesamtplan vorab (E1)
- [ ] Bei einer Selbstlerneinheit (Kreativ und Ganzes Skript, Ausgabe Seite) gibt es **vor Teil 1** einen **Plan-Schritt**: Die Lehrkraft kopiert einen Plan-Prompt in ihre KI und fügt die Antwort in die App ein.
- [ ] Der Plan enthält je Station: **Titel, Lernziel, Pflicht-Spielform, Art der Skript-Aufgaben (übernehmen/umbauen)**, dazu **einen roten Faden** (Fallgeschichte oder Leitszenario in 2–4 Sätzen) und eine **Bildliste** (welche Bilder aus dem Skript passen zu welcher Station, welche sind Dekoration).
- [ ] Die App **prüft den Plan** beim Einfügen (lesbar, alle Stationen des Skripts vorhanden) und zeigt Fehler verständlich. Ein fehlerhafter Plan lässt sich korrigieren oder neu erzeugen.
- [ ] Der Plan wird **in jeden Teil-Prompt eingebettet**, mit dem Hinweis, welche Stationen zu diesem Teil gehören. Die Lehrkraft muss nichts mehr einstellen.
- [ ] Der Plan ist **Teil des Entwurfs** (PROJ-52) und bleibt beim Unterbrechen und Fortsetzen erhalten.
- [ ] Die Lehrkraft kann den Plan **vor dem Start ansehen und ändern** (Spielform einer Station tauschen, Station streichen). Die Änderungen wirken in allen folgenden Teil-Prompts.
- [ ] Bei **kurzen Skripten ohne Teile** gibt es denselben Plan, aber **eingebettet in den einen Prompt**. Ein eigener Kopiervorgang entfällt, wenn das Skript ohne Teile auskommt.

### B) Regeln für Abwechslung und Spaß
- [ ] **Pflicht-Spielform je Station:** Jede Station enthält mindestens eine Aufgabe aus der Gruppe „Spielen & Ordnen“ (laut Plan), nicht nur Frage und Antwort.
- [ ] **Kein gleicher Rhythmus in jedem Kapitel (geändert 2026-11-16 nach der Messung):** Der **Schlussblock** (Zusammenfassung, Merke-Box, Abschlussquiz, Selbsteinschätzung) und die Offene Frage dürfen **nicht in jedem Kapitel in derselben Folge** stehen. Der Plan legt je Station fest, welche davon sie braucht. Gemeinsamer Schlussblock in höchstens der Hälfte der Kapitel.
- [ ] **Aufklapper und Hilfen begrenzt:** Begriffs-Aufklapper und Hilfe-Aufklapper zusammen höchstens etwa **10 % der Elemente** (Heft 3 alt: 22 %). Gestufte Hilfen nur bei anspruchsvollen Aufgaben (siehe unten).
- [ ] **Mindestanteil Spiel-Typen:** Mindestens etwa **20 % der Aufgaben** sind Spiel-Typen (Sortieren/Zuordnen, Reihenfolge, Fallakte, Wörter ziehen/markieren, Memory, Kreuzworträtsel, Wörtersuche, Schätzrunde, Bildzuordnung, Trainer). Heft 3 alt: 8 %. Die genaue Schwelle wird am Messsatz kalibriert.
- [ ] **Mindestmix im Heft:** Aufgaben der Gruppen Zuordnen/Ordnen, Rechnen/Schätzen, Spiele/Rätsel und Fälle sind jeweils **mindestens einmal** vertreten, sofern das Skript Stoff dafür hat. Typen, die im Heft nie vorkommen (Memory, Kreuzworträtsel, Schätzrunde u. a.), sollen dort vorkommen, wo der Stoff passt.
- [ ] **Roter Faden:** Mindestens eine **Fallgeschichte** zieht sich über mehrere Stationen (Fallakte oder wiederkehrende Ausgangssituation). Gibt das Skript eine Situation vor, wird sie verwendet.
- [ ] **Gestufte Hilfen** (Hilfe 1/2/3) nur noch bei **anspruchsvollen** Aufgaben, nicht mehr bei jeder.
- [ ] **Stoffart bestimmt Spielform** (kurze Tabelle im Prompt): Begriffe → Memory/Kreuzworträtsel/Lückentext; Fälle „gilt/gilt nicht“ → Sortier-Zuordnung; Ablauf → Reihenfolge; Zahlen → Rechenweg/Schätzrunde; Fallbeurteilung → Fallakte.
- [ ] **Bilder:** Bilder ohne Bezug zum Stoff werden **nicht** als Aufgabenbild oder Hauptbild verwendet. Der Plan nennt, welche Bilder zu welcher Station passen.

### C) Skript-Aufgaben umbauen (E2)
- [ ] Skript-Aufgaben dürfen in ein **passendes anderes Format** umgebaut werden.
- [ ] **Fachaussagen, Rechenwerte, Beträge und Lösungen** stimmen nach dem Umbau mit dem Skript überein. Prüfstelle und Vergleich (siehe F) prüfen das stichprobenartig.
- [ ] **Nichts vorwegnehmen** (Regel aus dem bisherigen Prompt) gilt weiter: Lösungen stehen nur im Feedback bzw. in der Antwortprüfung.
- [ ] Aufgaben, die sich **nicht sinnvoll umbauen lassen** (z. B. offene Begründungsfrage), bleiben als **Offene Frage** erhalten.
- [ ] Der **Lehrer-Charakter** des Skripts („Anmerkung Lehrkraft“, Musterlösungen) wird **nicht** in die Schülerfassung übernommen.

### D) Prompt-Länge (E5)
- [ ] Der Prompt für Kreativ/Ganzes Skript mit Ausgabe Seite ist **nicht länger als heute (25.100 Zeichen)**, **Ziel ≤ 20.000 Zeichen**, einschließlich der neuen Regeln. Der Plan-Prompt ist **kurz** (Ziel ≤ 5.000 Zeichen).
- [ ] Kürzungen: Doppelungen (Selbstprüfung, Aufgabentypen, Design-Richtlinien, Kapitelstruktur) entfallen. Die Beschreibung des Ausgabeformats wird dort gekürzt, wo der Generator das Verhalten ohnehin kennt.
- [ ] **Kein Test „Prompt zeichengleich mit alt“** mehr für diese Prompts (bereits aufgehoben durch PROJ-68 E2). Neue Tests prüfen stattdessen die **Struktur** (Plan-Platzhalter, Pflichtabschnitte vorhanden).
- [ ] Die **Antwortlänge** pro Teil wächst gegenüber heute **nicht** (ChatGPT Free liefert die Antwort weiter vollständig, wie in PROJ-69 gemessen).
- [ ] Jede einzelne Kürzung ist im **Vorher/Nachher-Vergleich** (F) bestanden, sonst wird sie zurückgenommen.

### E) Prüfstelle nach dem Bauen
- [ ] Die Prüfstelle meldet als **Hinweis** (kein Sperren, wie PROJ-89 E9):
  - Station **ohne Spiel-Aufgabe**
  - **gleicher Schlussblock in mehr als der Hälfte der Kapitel**
  - **zu viele Aufklapper und Hilfen** (über etwa 10 % der Elemente)
  - **Spiel-Anteil** unter der Schwelle
  - **Mindestmix** des Heftes nicht erreicht
  - **Bild ohne Bezug** (nicht in der Bildliste der Station oder als Dekoration markiert)
  - **Station aus dem Plan fehlt** im Ergebnis
  - Abweichung vom Plan (andere Spielform als geplant)
- [ ] Jeder Hinweis nennt **Fundstelle** (Thema und Block) und **Vorschlag** (z. B. „Hier eine Reihenfolge-Aufgabe einfügen“). Aus dem Hinweis führt ein Weg zum Block im Editor (PROJ-89).
- [ ] Die Prüfungen laufen **im Kern** und **ohne KI**. Sie kosten nichts.
- [ ] Heft, das alle Regeln erfüllt, zeigt **keinen** Hinweis dieser Art.

### F) Messsatz und Vorher/Nachher-Vergleich
- [ ] Ein **Messsatz aus 3–4 vorhandenen Skripten** liegt im Repo bzw. unter `docs/qualitaet-werkzeuge/` (ohne Urheberrechtsprobleme, nur eigene Skripte): **Heft 3 (ADSp)**, **Heft 2 (Haftung)** und mindestens ein **Skript aus einem anderen Bildungsgang** (z. B. Tourismus oder KSK), damit nicht nur Spedition gemessen wird.
- [ ] Der Vergleich läuft mit **altem und neuem Prompt** auf jedem Skript. Gemessen werden **Zahlen**: Typenmix, Anteil gleicher Schlussblöcke, Anteil Aufklapper, Anteil Spiel-Aufgaben, nie verwendete Typen, Bilder ohne Bezug, Zeichen des Prompts und der Antwort. **Ausgangswert Heft 3 (alt)** steht in [proj99_baseline_heft3.md](../docs/qualitaet-werkzeuge/proj99_baseline_heft3.md): Schlussblock in 14 von 14 Kapiteln, Aufklapper 22 %, Spiel-Typen 8 %, 9 Typen nie verwendet.
- [ ] Dazu gibt es ein **Urteil per `einheit-abnehmen`** (Opus, E6) zu: Fachlich korrekt? Spaß und Abwechslung spürbar? Selbstständig durcharbeitbar? Rechenwerte erhalten?
- [ ] **Abnahme:** Der neue Weg gilt als besser, wenn er bei allen Messskripten (a) **mehr Abwechslung** (messbar: weniger gleiche Schlussblöcke, weniger Aufklapper, mehr Spiel-Typen), (b) **keine neuen Fachfehler** und (c) **keine längere Antwort** zeigt. Sonst wird nachgebessert oder zurückgenommen.
- [ ] Der Bericht liegt unter `docs/qualitaet-werkzeuge/` und ist in der Spec verlinkt.

### G) Heft 3 als erster Messfall
- [ ] Heft 3 wird mit dem neuen Weg **neu erzeugt** (alle Teile). Ergebnis und Bericht werden dem Nutzer **im Editor** gezeigt (Vorschau).
- [ ] Der Nutzer entscheidet danach, ob das Ergebnis „gefällt“. Erst dann gilt die Änderung als abgenommen (Browser-Test durch den Nutzer, wie bei PROJ-89 ff.).

## Edge Cases
- **Skript ohne klare Stationen** (ein langer Fließtext): Der Plan bildet Stationen aus der Gliederung der Überschriften. Fehlen Überschriften, schlägt der Plan eine Einteilung vor, die die Lehrkraft ändern kann.
- **Skript mit nur Lehrtext und ohne Aufgaben:** Der Plan legt die Aufgaben fest. Kein Konflikt mit „Skript-Aufgaben umbauen“.
- **Skript mit nur Aufgaben (wie Heft 3):** Der Plan baut Aufgaben um, der Lehrtext der Einheit entsteht aus den Info-Texten des Skripts. Fehlen Info-Texte, bleibt die Station kurz und der Hinweis „Station hat wenig Erklärung“ erscheint.
- **Plan und Teile passen nicht zusammen** (Teilung weicht von den Stationen ab): Der Teil-Prompt bekommt **die Stationen, die inhaltlich zu seinem Skriptabschnitt gehören**. Eine Station, die über zwei Teile reicht, wird dem Teil zugeordnet, in dem sie beginnt. PROJ-71 (lange Abschnitte zerlegen) muss das berücksichtigen.
- **Die KI ignoriert den Plan** (andere Spielform als geplant): Die Prüfstelle meldet die Abweichung als Hinweis. Die Lehrkraft kann einzelne Blöcke ersetzen (Typ wechseln, PROJ-95).
- **Die KI erfindet Zahlen beim Umbau:** Fachwerte stehen im Prompt als **zu erhaltende Werte** (aus dem Skript). Die Prüfstelle meldet Zahlen im Ergebnis, die im Skript nicht vorkommen, als Hinweis „Wert nicht im Skript“.
- **Plan-Antwort ist abgeschnitten oder fehlerhaft:** Der Ablauf bietet „Plan erneut erzeugen“ und behält fertige Teile. Der Plan ist kurz genug, dass das in ChatGPT Free selten passiert.
- **Lehrkraft will keinen Plan** (Zeitnot): Ein Weg „Ohne Plan, mit Standardregeln“ bleibt möglich. Die Regeln aus B) stehen im Teil-Prompt, aber ohne Abstimmung über die Teile. Die Prüfstelle meldet fehlenden Plan nicht als Fehler.
- **Skript mit sehr vielen Stationen (>25):** Der Plan wird **nach Teilen** gegliedert, damit er kurz bleibt. Der Plan-Prompt wird bei sehr langen Skripten selbst geteilt.
- **Fachfremde Spielform** (Kreuzworträtsel für ein Thema ohne geeignete Wörter): Der Plan darf wählen und die Lehrkraft ändern. Ohne Stoff für den Typ entfällt er (siehe „sofern das Skript Stoff dafür hat“).
- **Bestehende Hefte:** Fertige Einheiten **ändern sich nicht**. Neue Regeln und Prüfungen gelten nur für neue Läufe. Die neuen Prüf-Hinweise lassen sich **auf Wunsch auch für ein bestehendes Heft** im Editor anzeigen (Taste „Auf Abwechslung prüfen“).
- **Bilder ohne Fachbezug im Skript** (wie Heft 3): Sie werden im Plan als Dekoration oder „nicht verwenden“ markiert. Die Lehrkraft entscheidet.
- **Kostenloser Weg bricht mitten im Heft ab:** Bereits fertige Teile bleiben (PROJ-69). Der Plan bleibt im Entwurf.

## Abgrenzung (nicht in PROJ-99)
- Andere Werkzeuge (Kahoot, Moodle, Arbeitsblatt, Lernsituation, Prüfung, Lied, Podcast) und die **H5P-Ausgabe**. Folgt nach der Praxis, wenn sich der Weg bewährt (E4).
- **Neue Aufgabentypen im Kern erfinden.** PROJ-99 nutzt die vorhandenen 32 Typen.
- **Bezahlte KI** (PROJ-64) und eigenes Planungsmodell. Bleibt pausiert.
- **Block per KI ausfüllen** im Editor (PROJ-93).
- **Design und Aussehen** der Seite (Schuldesign bleibt).
- **Automatische Korrektur** der Hefte nach der Prüfstelle (nur Hinweise, kein Selbstumbau).
- **Neue Bilder erzeugen** (nur vorhandene Bilder zuordnen).

## Risiken
- **Der Plan-Schritt ist ein zusätzlicher Kopiervorgang.** Er muss sich lohnen. Mitigation: Plan kurz halten, bei kurzen Skripten in den einen Prompt einbetten (A).
- **Mehr Regeln verlängern den Prompt.** Mitigation: Doppelungen streichen (D), harte Gesamtgrenze und Messung.
- **Freies Umbauen kann Fachinhalt verfälschen** (Zahlen, Begriffe). Mitigation: Werte-Prüfung (Edge Cases) und Urteil per `einheit-abnehmen`.
- **Qualität lässt sich nicht garantieren.** Es gilt der **Messsatz**: Er zeigt, ob es besser ist, nicht nur anders. Bei Misserfolg Rücknahme (E5).
- **Prüfstelle kann zu streng wirken** (zu viele Hinweise). Mitigation: Hinweise bündeln, nach Gewicht ordnen, nie sperren.
- **Gleichwertigkeit mit älteren Läufen:** Neue Hefte sehen anders aus als frühere. Das ist gewollt und wird im Bericht beschrieben.

## Technical Requirements
- **Betroffen:** Kern-Repo `~/Schule/Werkzeugkiste` (`prompts.py`, Prüfstelle in `kern_editor.py`/`seite.py`), App (Ablauf, Teile, Entwurf, Hinweise im Editor).
- **Kosten:** Keine zusätzlichen KI-Kosten für die Prüfstelle. Der Plan läuft über die KI der Lehrkraft.
- **Sicherheit:** Der Plan ist Text der Lehrkraft und wird wie jede Antwort **bereinigt** (Kern, wie PROJ-89). Nur Besitzerin/Besitzer sieht und ändert ihn.
- **Leistung:** Die Plan-Prüfung und die Prüfstelle ergänzen den Bau um höchstens **ca. 1 Sekunde**.
- **Barrierefreiheit:** Plan-Ansicht im Lehrkräfte-Bereich nach `docs/DESIGN.md` (ws-Tokens, 44-px-Ziele, Zustände aus `admin-states.tsx`).
- **Tests:** Struktur-Tests für Prompts (statt Zeichengleichheit), Tests der neuen Prüfungen im Kern, Regressionstest über den Messsatz.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-16. Grundlage: App (`src/components/werkzeugkiste/*`, `src/app/api/admin/werkzeugkiste/ablaeufe/*`, `src/lib/werkzeugkiste-*.ts`) und Kern (`~/Schule/Werkzeugkiste`: `prompts.py`, `kern.py`, `qualitaet.py`, `kern_editor.py`, Zweig `vercel-kern`).

### Was die Prüfung des Bestands ergeben hat
1. **Prompts entstehen nie auf Vorrat.** Der Kern baut sie bei jedem Aufruf neu aus Skript, Auswahl und Einstellungen (`kern.prompt`, auch für „Teil 2 von 3“). Ein Plan ist damit nur **eine weitere Zutat** und muss nirgends in die Prompts „hineingeflickt“ werden.
2. **Teile sind schon Stationen-nah.** Jeder Teil kennt seine Skript-Abschnitte (Auswahl). Eine Station des Plans lässt sich also über ihren Anfangs-Abschnitt dem passenden Teil zuordnen. Das ist die Antwort auf die offene Frage zu PROJ-71.
3. **Die Prüfstelle gibt es schon, zweimal:** `kern.pruefen` (für die eingefügte KI-Antwort) und `kern_editor.pruefen` (im Editor). Beide rufen **dieselbe** Prüfsammlung `qualitaet.pruefen` auf. Neue Prüfungen kommen einmal dort hinein und wirken überall. Sie blockieren nie, zeigen Befunde mit Fundstelle und kennen Schweregrade.
4. **Zahlen- und Wertprüfungen gibt es teils schon** in `qualitaet.py` (Zahlen im Skripttext vergleichen). Die Prüfung „Wert nicht im Skript“ baut darauf auf.
5. **Der Ablauf in der App ist schrittweise** (Fortschrittsanzeige „Schritt n von m“) und speichert Teile als eigene Spalte am Ablauf. Ein Plan ist ein weiteres Feld nach demselben Muster.
6. **Kein Kern-Eingriff am Bau der Seite.** `seite.py` und das Aussehen bleiben unverändert. Es ändern sich Prompts, Prüfstelle und der Ablauf drumherum.

### A) Komponenten-Struktur
```
Ablauf-Assistent (vorhanden)
+-- Schritt 1: Skript & Auswahl (vorhanden)
+-- Schritt 2: Einstellungen (vorhanden)
+-- NEU Schritt „Plan“  (nur Kreativ / Ganzes Skript, Ausgabe Seite; überspringbar)
|   +-- Kurzer Hinweis: „Ein Plan sorgt für Abwechslung über das ganze Heft“
|   +-- Plan-Prompt kopieren (Kopierknopf, wie im Prompt-Schritt)
|   +-- Plan-Antwort einfügen  → prüfen (verständliche Fehler, „Neu erzeugen“)
|   +-- Plan ansehen und ändern
|   |   +-- Kopf: roter Faden (2–4 Sätze, bearbeitbar)
|   |   +-- Stationen-Liste: Titel · Skript-Abschnitt · Spielform · „übernehmen/umbauen“ · Bilder
|   |   +-- je Station: Spielform tauschen, Station streichen
|   +-- „Ohne Plan weiter“  (Standardregeln, kein Abgleich über die Teile)
+-- Schritt Teile / Prompt (vorhanden)
|   +-- Teil-Prompt enthält jetzt den Plan-Ausschnitt dieses Teils      ← geändert (im Kern)
+-- Schritt Antwort / Prüfstelle (vorhanden)
|   +-- neue Hinweise: Spiel-Aufgabe fehlt · Wiederholung · Bild ohne Bezug · Abweichung vom Plan · Wert nicht im Skript  ← ergänzt
+-- Fertig (vorhanden)

Editor (vorhanden, PROJ-89 ff.)
+-- Hinweise der Prüfstelle: neue Hinweise mit Fundstelle und Vorschlag      ← ergänzt
+-- Menü „⋯“: „Auf Abwechslung prüfen“ (auch für bestehende Hefte)           ← neu
```

### B) Datenmodell (in einfachen Worten)
```
Plan (eine Angabe am Ablauf, wie die Teile-Liste):
- Roter Faden: 2–4 Sätze (Fallgeschichte oder Leitszenario)
- Stationen (je Station):
    - Titel
    - Lernziel (ein Satz)
    - Skript-Abschnitte, aus denen die Station besteht (Nummern aus der Einlesung)
    - Pflicht-Spielform (aus einer festen Liste, siehe unten)
    - Skript-Aufgaben: übernehmen / umbauen / keine vorhanden
    - Passende Bilder (Namen aus der Einlesung) und Bilder, die nur Dekoration sind
- Stand: wann erzeugt, aus welchem Skript (Länge/Prüfsumme), damit ein veralteter Plan erkannt wird

Feste Liste der Spielformen (Plan-Vokabular):
  Sortieren/Zuordnen · Reihenfolge · Fallgeschichte (Fallakte) · Rechnen/Schätzen ·
  Begriffsspiel (Memory, Kreuzworträtsel, Wörtersuche) · Lückentext/Wörter ziehen · Offene Frage
  (Jede Spielform ist an die Typen aus dem Katalog (PROJ-90) gebunden.)

Gespeichert in: neue Spalte „plan“ am Ablauf (Tabelle werkzeug_ablaeufe), NULL = kein Plan.
Größe begrenzt (wie bei „teile“). Gleiche Zeilen-Regeln wie der Ablauf: nur die eigene Lehrkraft.
```
Die Messdaten (Messsatz) sind **keine** App-Daten, sondern Dateien im Kern-Repo und Berichte unter `docs/qualitaet-werkzeuge/`.

### C) Wie die Teile zusammenspielen
```
Lehrkraft fügt Plan ein
   → Kern prüft den Plan gegen die Gliederung des Skripts
   → App speichert den Plan am Ablauf

Teil n wird gebaut:
   Kern nimmt: Skript-Abschnitte des Teils + Plan
   → wählt die Stationen, deren Anfangs-Abschnitt in diesem Teil liegt
   → schreibt in den Prompt: roter Faden (ganz kurz), diese Stationen mit Spielform und Bildern,
     dazu „Station k von m“ und was schon in früheren Teilen lief (nur Spielformen, nicht Texte)
```
So wissen alle Teile voneinander, **ohne** dass der Prompt mit der Zahl der Teile wächst: Er trägt nur den eigenen Ausschnitt plus zwei bis drei Zeilen Überblick.

### D) Tech-Entscheidungen (mit Begründung)
- **D1 – Der Kern baut den Plan-Prompt, prüft den Plan und schneidet ihn je Teil zu.** *Warum:* Der Kern kennt Gliederung, Abschnitte und Bilder der Einlesung. Die App muss nur speichern und anzeigen. Dasselbe Prinzip wie bei den Teilen.
- **D2 – Plan-Prompt bekommt kein Skript, nur die Gliederung mit Kennzahlen.** Je Abschnitt: Titel, Zahl der Aufgaben, Rechnungen, Tabellen, Bilder (alles automatisch aus der Einlesung, **ohne KI**). *Warum:* Der Prompt bleibt kurz (Ziel ≤ 5.000 Zeichen, plus Gliederung) und passt auch bei sehr langen Skripten in kostenlose KIs. Reicht die Gliederung für einen guten Plan nicht, bekommt der Plan-Prompt je Abschnitt eine Textvorschau von wenigen Zeilen. Das wird im Messsatz geprüft.
- **D3 – Der Plan hat ein festes Vokabular (Liste der Spielformen).** *Warum:* So kann die Prüfstelle ohne KI vergleichen („geplant: Reihenfolge, gebaut: Auswahlfrage“) und der Plan lässt sich im Formular per Auswahl ändern, ohne Freitext.
- **D4 – Neue Prüfungen kommen in `qualitaet.py`.** *Warum:* Dann wirken sie in der Prüfstelle nach der Antwort **und** im Editor, ohne Doppelarbeit. Alles ohne KI, ohne Kosten, ohne Sperre.
- **D5 – Heft-weite Regeln erst nach dem Zusammenfügen, Station-Regeln schon je Teil.** *Warum:* Mindestmix, Spiel-Anteil, Aufklapper-Anteil und der Anteil gleicher Schlussblöcke gelten für das ganze Heft. „Station ohne Spiel-Aufgabe“ lässt sich schon im Teil melden, damit die Lehrkraft einen schlechten Teil gleich wiederholt (wie PROJ-69).
- **D6 – „Bild ohne Bezug“ nur mit Plan sicher, ohne Plan nur als Tipp.** *Warum:* Ohne Plan weiß der Kern nicht, welches Bild zu welcher Station gehört. Eine Wort-Heuristik wäre unsicher und würde nerven. Ohne Plan gibt es daher höchstens einen leisen Tipp.
- **D7 – Fachwerte schützt der Kern: „Wert nicht im Skript“.** Zahlen und Beträge im Ergebnis, die im Skript nicht vorkommen (und nicht Rechenergebnis aus Skriptzahlen sind), werden als Hinweis gemeldet. *Warum:* Freies Umbauen (E2) darf nicht zu erfundenen Zahlen führen.
- **D8 – Prompt-Neufassung ersetzt, statt zu ergänzen.** Doppelte Regeln (Selbstprüfung, Aufgabentypen, Design, Kapitelstruktur) werden zusammengeführt, das starre Kapitelmuster wird zu einem **Rahmen mit Pflichtteilen** (Lernziele, Einstieg/Fall, Spielform, Sicherung, Abschluss), in dem die Spielform wechselt. Gestufte Hilfen nur bei schweren Aufgaben. *Warum:* Nur so bleibt der Prompt trotz neuer Regeln kurz.
- **D9 – Die Gleichwertigkeits-Tests (Zeichengleichheit) für diese Prompts entfallen** (PROJ-68 E2). Neue Tests prüfen Struktur: Pflichtabschnitte vorhanden, Plan-Platzhalter wird ersetzt, Länge unter der Grenze.
- **D10 – Bestehende Hefte bleiben unberührt.** Neue Regeln gelten für neue Läufe. „Auf Abwechslung prüfen“ im Editor wendet die Prüfungen auf Wunsch auf ein vorhandenes Heft an.

### E) Messung (Messsatz und Vergleich)
```
Messsatz (im Kern-Repo, nur eigene Skripte): Heft 3 (ADSp), Heft 2 (Haftung), 1 Skript anderer Bildungsgang
   │
   ├─ je Skript: Antwort mit ALTEM Prompt  (Referenz, bleibt als Datei liegen)
   └─ je Skript: Antwort mit NEUEM Prompt + Plan
        │
        ▼
   Zahlenvergleich (automatisch, ohne KI): Typenmix, längste Wiederholungsserie, Anteil Spiel-Aufgaben,
   Bilder ohne Bezug, Prompt-Zeichen, Antwort-Zeichen
        │
        ▼
   Urteil mit einheit-abnehmen (Opus): fachlich korrekt? spürbar abwechslungsreich? ohne Hilfe lösbar? Werte erhalten?
        │
        ▼
   Bericht in docs/qualitaet-werkzeuge/  →  Entscheidung: übernehmen · nachbessern · zurücknehmen
```
- Die Antworten werden wie in PROJ-68 **simuliert** (Sonnet bzw. Opus im Auftrag), nicht über die bezahlte KI der App.
- **Baseline zuerst:** Die Zahlen des **alten** Weges werden vor jeder Änderung gemessen. Ohne Ausgangswert gibt es später keinen Beleg.

### F) Reihenfolge der Umsetzung (je Schritt allein lauffähig)
| Schritt | Inhalt | Modell-Empfehlung |
|---|---|---|
| 1 | **Baseline und Messwerkzeug:** Prüfungen aus E) in `qualitaet.py`, Skript für den Zahlenvergleich, Referenzantworten (alter Prompt) | Sonnet |
| 2 | **Plan im Kern:** Plan-Prompt, Planprüfung, Zuschnitt je Teil (D1–D3, C) | Sonnet |
| 3 | **Prompt-Neufassung** (D8) und Plan-Block im Teil-Prompt, Längenmessung | **Opus** (Feinarbeit am Text) |
| 4 | **Vergleich am Messsatz**, Bericht, Entscheidung | **Opus** (Qualitätsurteil) |
| 5 | **App:** Schritt „Plan“, Speicherung (Migration), Anzeige und Ändern, Einbetten im Teil-Prompt | Sonnet |
| 6 | **Prüfstelle sichtbar:** neue Hinweise im Ablauf und im Editor, „Auf Abwechslung prüfen“ | Sonnet |
| 7 | **Heft 3 neu erzeugen**, Vorschau im Editor, Nutzer entscheidet | Sonnet (+ Opus für das Urteil, falls gewünscht) |

**Umsetzungsstand (2026-11-16):** Schritt 1 begonnen. Im Kern-Repo (`~/Schule/Werkzeugkiste`, Zweig `vercel-kern`, noch nicht committet) gibt es `abwechslung.py` (Kennzahlen je Heft, ohne KI) und `abwechslung_test.py` (5 Tests grün, Heft-3-Baseline als Prüfwert). Die Ausgangswerte stehen in [proj99_baseline_heft3.md](../docs/qualitaet-werkzeuge/proj99_baseline_heft3.md). Die Messwerte sind in die Prüfstelle (`qualitaet.py`, `_pruefe_abwechslung`) eingebaut: vier Hinweise (Kapitel ohne Spiel-Aufgabe je Teil; Jedes Kapitel endet gleich, Sehr viele Aufklapper, Wenig Aufgaben mit Spielcharakter erst im ganzen Heft), nur Ausgabe Seite bei Ganzes Skript/Kreativ, nie sperrend. Schwellen sind vorläufig (Konstanten `ABW_*`) und werden am Messsatz kalibriert. 11 Tests grün; bestehende Kern-Tests unverändert (in einer Fünfer-Kombination fallen 2 Tests von `kern_recht_test` aus, auch ohne diese Änderung: Reihenfolge-Effekt, einzeln grün). **Messsatz alt (2026-11-16):** 4 echte Läufe aus der App liegen im Kern-Repo unter `messsatz/alt/` (Heft 3 und Basics rund um den LKW mit Kreativ, Incoterms und Pegasus-LKW mit Ganzes Skript, alle Seite, alle Spedition). Ergebnis in [proj99_baseline_heft3.md](../docs/qualitaet-werkzeuge/proj99_baseline_heft3.md): Spiel-Typen 5–8 %, gleicher Schluss in 57–100 % der Kapitel, Offene Frage in fast jedem Kapitel; Aufklapper nur bei Kreativ hoch (18–22 %). Die Messfunktion erkennt dafür jetzt auch kurze gemeinsame Endfolgen (13 Tests grün). Heft 2 (`output.yaml`) ist H5P und kein Vergleich. Noch offen in Schritt 1: ein Skript aus einem anderen Bildungsgang (neu zu erzeugen), Kern deployen (CLI-Login prüfen).

**Umsetzungsstand Schritt 3 (2026-11-16, Opus):** Neuer Prompt `prompt_seite.py` im Kern, nur für Kreativ und Ganzes Skript mit Ausgabe Seite (`build_prompt` verzweigt dorthin; H5P und andere Werkzeuge unverändert). Länge ohne Skripttext: **11.500 statt 25.200 (Kreativ) bzw. 26.900 Zeichen (Ganzes Skript)**. Inhalt: Abwechslungsregeln (Spielform je Station, kein fester Bauplan, Aufklapper/Hilfen/Selbsteinschätzung sparsam, roter Faden, Stoff→Spielform-Tabelle), bewährte Regeln gekürzt (Lösungen, Tabellen, Bilder, Distraktoren, Feedback, Rechnen), **ein** Typenkatalog statt drei Listen, Kurzcheck. 10 Struktur-Tests (`prompt_seite_test.py`) grün, darunter: Katalog = gültiges YAML und deckt sich mit `seite.BAUSTEINE`; Teilauftrag greift. Der Plan-Platzhalter (`plan_block`) ist vorbereitet, der Plan selbst (Schritt 2) noch nicht gebaut.
- **Messsatz erweitert (Nutzer, 2026-11-16):** Tourismus mit Griechisches Festland, Mittelmeerraum Überblick und Reiserecht (aus `Unterichtsmaterialien`). Ägypten weggelassen (keine Bilder, inhaltlich nah am Mittelmeerraum).
- **Sparvariante (Nutzer):** alt nur aus echten Läufen, dazu eine alte Simulation (Mittelmeerraum). Befund: Sonnet ist schon mit dem alten Prompt verspielter (19 % Spiel-Elemente statt 5–8 % in echten Läufen), aber gleicher Schlussblock 6/6 und 14 % Aufklapper. **Spiel-Anteil daher nur Simulation gegen Simulation vergleichen**; der Schlussblock-Effekt ist modellunabhängig.

**Schritt 4 – Vergleich (2026-11-16):** Bericht [proj99_vergleich.md](../docs/qualitaet-werkzeuge/proj99_vergleich.md). Runde 1 war zu dünn (Lehrtext 3.400–5.000 Zeichen, kaum Bilder, keine Begründungsaufgaben); nach Nachbesserung (Runde 2: „genug Erklärung, 6–10 Aufgaben je Station“, „Bilder mit Fachbezug zeigen“, „Fall-Stationen begründen“, „`single_choice_set` hat kein Feedback“) Stoffmenge wie beim alten Prompt, Abwechslung bleibt (gleicher Schluss ≤ 43 %, Aufklapper 1–2 %, Offene Frage in den Fall-Stationen). Prompt-Endstand 12.588 / 12.756 Zeichen. Opus-Stichprobe Reiserecht: fachlich deckungsgleich mit den Skript-Lösungen, ohne Lehrkraft durcharbeitbar.

**Deploy Kern (2026-11-16):** Kern-Commit `8d9f486` (Zweig `vercel-kern`, nicht gepusht) per `vercel deploy --prod` aus dem Kern-Ordner, Bereitstellung `werkzeugkiste-kern-8cl876e3i` ist Production/Ready. Live sind: neuer Seiten-Prompt (nur Kreativ und Ganzes Skript mit Ausgabe Seite) und die vier Abwechslungs-Hinweise der Prüfstelle. Es ist **keine App-Änderung nötig**: Die App ruft den Kern auf und bekommt Prompt und Befunde von dort. Nicht gebaut: Plan-Schritt (Schritt 2 und 5), „Auf Abwechslung prüfen“ im Editor, Messsatz „neu“ für Mittelmeerraum und Heft 3 mit der Endfassung. Offen: Praxistest durch den Nutzer (Heft 3 neu mit eigener KI erzeugen) und danach die Entscheidung, ob der Plan-Schritt noch nötig ist.

Nach Schritt 4 gibt es einen **Haltepunkt**: Zeigt der Vergleich keine Verbesserung bei gleicher oder kürzerer Länge, wird nicht weitergebaut (E5).

### G) Datenbank-Änderung (eine Migration)
- Eine neue Angabe „plan“ am Ablauf (Spalte, wie „teile“). Keine neue Tabelle, keine neue Regel: Die Zeilen-Regeln des Ablaufs gelten von selbst.
- **Reihenfolge beim Deploy (Memory):** Migration **vor** dem Push, sonst bricht die Werkzeugkiste, weil die App die Spalte liest.
- Das Kern-Deploy läuft getrennt (`vercel deploy --prod` im Kern-Ordner, Zweig `vercel-kern`, vorher CLI-Login prüfen).

### H) Sicherheit und Leistung
- Der Plan ist Lehrkraft-Text, geht wie jede Antwort durch die Bereinigung im Kern. Er enthält nie Skripttext in Auszügen, die nicht ohnehin schon im Ablauf liegen.
- Zugriff: nur die eigene Lehrkraft, wie beim Ablauf.
- Plan-Prüfung und neue Prüfregeln: je unter etwa 1 Sekunde, kein KI-Aufruf, keine Kosten.

### I) Dependencies (Pakete)
Keine neuen Pakete, weder in der App noch im Kern.

### J) Offene Punkte, die im Bau entschieden werden
- **Reicht die Gliederung für einen guten Plan?** (D2) Entscheidet der Messsatz: sonst kurze Textvorschau je Abschnitt.
- **Wie viele Spielformen sind „Pflicht“ je Station bei sehr kurzen Stationen?** Der Messsatz zeigt, ob die Regel bei Stationen mit nur zwei Skript-Aufgaben passt.
- **Schwellen für „Mindestmix“** (z. B. wie viele Aufgaben braucht ein Heft für Gruppe X?). Werden an den Messskripten kalibriert, nicht geraten.
- **Wortlaut der Hinweise** der Prüfstelle: kurz, mit Vorschlag, wird im Bau mit dem Nutzer abgestimmt.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
