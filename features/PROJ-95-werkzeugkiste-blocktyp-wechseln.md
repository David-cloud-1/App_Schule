# PROJ-95: Werkzeugkiste – Baukasten: Typ eines Blocks wechseln

## Status: Approved
**Created:** 2026-11-12
**Last Updated:** 2026-11-12 (gebaut und geprüft)

## Idee in einem Satz
Im Baukasten-Editor wandelt die Lehrkraft einen vorhandenen Block in einen **verwandten** Aufgabentyp um, z. B. eine Auswahlfrage in „Richtig oder falsch". Vorab zeigt ein Dialog, was übernommen wird und was verloren geht. Der Wechsel ist ein Schritt für Rückgängig.

## Kontext
- Bei der Ausarbeitung von PROJ-90 (2026-11-12) abgetrennt (PROJ-90 E1).
- Heute bleibt der Lehrkraft nur: Block löschen und neu einfügen (PROJ-90) und den Inhalt von Hand abtippen.
- Nur Typen, deren Inhalt sich fachlich entspricht, lassen sich wechseln. Das verhindert, dass beim Wechsel „aus dem Nichts" Inhalt entsteht oder fast alles verloren geht.

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Nur verwandte Typen:** Gewechselt wird innerhalb fester Familien (siehe unten). Alles andere geht weiterhin über „Block löschen, neuen einfügen". Es gibt **keinen** Sammelweg „beliebiger Typ".
- **E2 – Dialog vor jedem Wechsel:** Nach der Wahl des Zieltyps zeigt ein Dialog die Liste „Übernommen / Geht verloren / Bitte prüfen". Erst „Wechseln" ändert den Block.
- **E3 – Zwei Einstiege:** Eintrag „Typ wechseln …" im `⋯`-Menü des Blocks **und** ein Knopf im Kopf des geöffneten Formulars. Beide öffnen den Katalog aus PROJ-90 im Wechsel-Modus.
- **E4 – Beispielblöcke:** Trägt der Block noch unveränderten Beispielinhalt (Hinweis „Beispielinhalt noch nicht ersetzt", PROJ-90 E2), wird einfach das Beispiel des Zieltyps eingesetzt. Kein Dialog, es geht nichts verloren.

## Die Wechsel-Familien
Wechsel sind **in beide Richtungen** und **zwischen allen Typen einer Familie** möglich.

| Familie | Typen | Gemeinsamer Kern |
|---|---|---|
| **Fragen** | Auswahlfrage (`multiple_choice` und `single_choice`), Richtig oder falsch (`true_false`), Schnellfragen (`single_choice_set`) | Frage mit richtiger und falschen Antworten |
| **Lücken & Wörter** | Lückentext (`fill_blanks`), Lückentext mit Hinweis (`advanced_fill_blanks`), Wörter ziehen (`drag_words`), Wörter markieren (`mark_words`) | Fließtext mit markierten Wörtern |
| **Karten** | Lernkarten zum Umdrehen (`dialog_cards`), Lernkarten zum Tippen (`flashcards`), Memory (`memory_game`) | Karten mit Vorder- und Rückseite |
| **Reihenfolgen** | Reihenfolge (`reihenfolge`), Bilder ordnen (`image_sequencing`) | Liste von Schritten in richtiger Reihenfolge |

Typen außerhalb dieser Familien (z. B. Kreuzworträtsel, Rechenweg, Tabelle, Bild, Lehrtext) bieten keinen Wechsel an.

### Was jeder Wechsel übernimmt (Sollverhalten)
**Fragen**
- Auswahlfrage → Richtig/falsch: Frage wird zur Aussage. Ob sie stimmt, kann niemand erraten: voreingestellt ist „richtig", der Dialog nennt das unter „Bitte prüfen". Antworten und ihr Feedback gehen verloren.
- Richtig/falsch → Auswahlfrage: Aussage wird zur Frage, es entstehen zwei Antworten „Richtig" und „Falsch" (die passende ist markiert). Die beiden Rückmeldungen werden dem jeweiligen Antworttext als Feedback zugeordnet.
- Auswahlfrage → Schnellfragen: eine Schnellfrage. Die erste richtige Antwort wird die richtige, alle falschen werden die falschen. Weitere richtige Antworten und das Feedback je Antwort gehen verloren (Dialog nennt Anzahl).
- Schnellfragen → Auswahlfrage: die **erste** Schnellfrage wird zur Auswahlfrage. Alle weiteren Fragen gehen verloren (Dialog nennt Anzahl und lässt abbrechen).
- Richtig/falsch ⇄ Schnellfragen: wie über die Auswahlfrage (Aussage ↔ erste Frage mit den Antworten „Richtig"/„Falsch"). Mehrere Schnellfragen → nur die erste, Rest geht verloren.
- `single_choice` und `multiple_choice` sind eine Familie mit dem Katalogeintrag „Auswahlfrage" (PROJ-90 E8). Wechsel **zu** „Auswahlfrage" legt `multiple_choice` an.

**Lücken & Wörter**
- Text und die Position aller markierten Wörter bleiben erhalten.
- Zusatzangaben, die der Zieltyp nicht kennt, gehen verloren und stehen im Dialog: z. B. alternative Schreibweisen („sieben/7") beim Wechsel nach „Lückentext mit Hinweis", „Wörter ziehen" oder „Wörter markieren" (es bleibt die erste), Hinweise in Klammern beim Wechsel aus „Lückentext mit Hinweis" in einen Typ ohne Hinweise.
- Wechsel nach „Lückentext mit Hinweis": Lücken bekommen keinen Hinweis. Der Dialog nennt das unter „Bitte prüfen".

**Karten**
- Alle Karten (Vorder-/Rückseite) bleiben erhalten, ebenso der Arbeitsauftrag, wo beide Typen einen haben. „Lernkarten zum Umdrehen" hat keinen Arbeitsauftrag: er geht beim Wechsel dorthin verloren und bleibt in der Gegenrichtung leer (der Typ nimmt dann seinen Standardtext).
- Nach „Lernkarten zum Tippen": die Rückseite wird zur erwarteten Antwort. Der Dialog weist unter „Bitte prüfen" darauf hin, wenn Rückseiten lang sind (länger als 40 Zeichen).
- Aus „Lernkarten zum Tippen" nach „Umdrehen"/„Memory": mehrere akzeptierte Antworten („7/sieben") bleiben als Text in der Rückseite stehen.
- Nach „Memory": der Dialog weist darauf hin, dass lange Karten dort schlecht lesbar sind, wenn eine Seite länger als 40 Zeichen ist.

**Reihenfolgen**
- Reihenfolge → Bilder ordnen: jeder Schritt wird ein Schritt mit Text, ohne Bild. Arbeitsauftrag bleibt.
- Bilder ordnen → Reihenfolge: nur die Texte der Schritte bleiben, **Bilder gehen verloren** (Dialog nennt die Anzahl). Schritte ohne Text werden mit „Schritt N" aufgefüllt und im Dialog genannt.

## Dependencies
- Requires: PROJ-89 (Editor, Rückgängig, Rohfassung, Prüfstelle), PROJ-90 (Katalog, Formulare aller Typen, Beispielinhalte, Erkennung „Beispielinhalt unverändert")
- Berührt: PROJ-91/PROJ-92 (keine Wechsel für Tabelle, Diagramm, Bild), PROJ-93 (Block per KI) – später ggf. eigener Wechselweg

## User Stories
- Als **Lehrkraft** möchte ich eine Auswahlfrage mit einem Klick in „Richtig oder falsch" umwandeln, damit ich die Frage nicht neu abtippen muss.
- Als **Lehrkraft** möchte ich vor dem Wechsel sehen, was erhalten bleibt und was verloren geht, damit ich keine Inhalte aus Versehen verliere.
- Als **Lehrkraft** möchte ich einen versehentlichen Wechsel mit Rückgängig sofort zurücknehmen können.
- Als **Lehrkraft** möchte ich den Wechsel aus dem `⋯`-Menü und aus dem offenen Block heraus starten, damit ich ihn an der Stelle finde, an der ich gerade arbeite.
- Als **Lehrkraft** möchte ich bei einem frisch eingefügten Beispielblock einfach den Typ tauschen können, ohne Dialog, weil ja noch nichts Eigenes drinsteht.
- Als **Lehrkraft** möchte ich verstehen, warum ein Typ nicht wählbar ist (andere Familie), damit ich weiß, dass ich stattdessen einen neuen Block einfügen muss.

## Acceptance Criteria

### Einstieg
- [ ] Im `⋯`-Menü jedes Blocks, der zu einer Familie gehört, steht „Typ wechseln …" (zwischen „Duplizieren" und „Löschen", Löschen bleibt ganz unten, rot). Bei Blöcken ohne Familie fehlt der Eintrag.
- [ ] Im Kopf des geöffneten Formulars steht ein Knopf „Typ wechseln" (Variante `outline`, 44 px). Bei Blöcken ohne Familie fehlt er.
- [ ] Beides öffnet den **Katalog** aus PROJ-90 im Wechsel-Modus. Titel „Typ wechseln – aktuell: {Name des Typs}". Die Hinweiszeile lautet „Wähle einen verwandten Typ. Der Inhalt wird soweit möglich übernommen."
- [ ] Im Wechsel-Modus sind **nur die Typen der eigenen Familie wählbar** (ohne den aktuellen Typ). Alle anderen Einträge bleiben sichtbar, sind ausgegraut und zeigen „Nicht möglich: Dieser Typ hat keinen vergleichbaren Inhalt. Füge dafür einen neuen Block ein." Per Bildschirmleser sind sie als „nicht verfügbar" erkennbar.
- [ ] Der aktuelle Typ ist als „Aktueller Typ" gekennzeichnet und nicht wählbar.
- [ ] „Zuletzt verwendet" entfällt im Wechsel-Modus. Ein Wechsel verändert „Zuletzt verwendet" nicht.
- [ ] Suche, Tastaturbedienung, Esc/✕/„Abbrechen" funktionieren wie in PROJ-90. Abbrechen ändert nichts.

### Dialog „Typ wechseln"
- [ ] Nach Klick auf einen wählbaren Typ öffnet sich der Bestätigungsdialog „Von {Alt} zu {Neu} wechseln?".
- [ ] Der Dialog hat bis zu drei Abschnitte, leere entfallen: **Wird übernommen** (z. B. „Frage, 3 Antworten"), **Geht verloren** (z. B. „Feedback zu den Antworten", „2 weitere Fragen"), **Bitte prüfen** (z. B. „Ob die Aussage stimmt, ist auf ‚richtig' voreingestellt.").
- [ ] Die Einträge stehen in Lehrkraft-Sprache und nennen **Anzahlen**, wo Inhalte verloren gehen.
- [ ] Verlustfreie Wechsel zeigen den Dialog trotzdem (E2) mit dem Satz „Es geht nichts verloren." und nur dem Abschnitt „Wird übernommen".
- [ ] Zwei Knöpfe: „Wechseln" (grün, Hauptaktion) und „Abbrechen". Abschnitt „Geht verloren" ist deutlich hervorgehoben (Warnfarbe `ws-orange`, mit Symbol, nicht nur Farbe).
- [ ] Der Dialog ist per Tastatur bedienbar, der Fokus liegt beim Öffnen auf „Abbrechen" (sicherer Standard), wenn etwas verloren geht, sonst auf „Wechseln".

### Wechsel
- [ ] Der Block behält **Platz, Thema und Position**. Er wird durch den umgewandelten Block ersetzt, bleibt geöffnet und zeigt das Formular des neuen Typs.
- [ ] Der Wechsel ist **ein Schritt** für Rückgängig/Wiederholen (PROJ-89). Rückgängig stellt den alten Block **vollständig** wieder her, inklusive Inhalten, die beim Wechsel verloren gingen.
- [ ] Der Wechsel wird wie jede Änderung automatisch gespeichert. Danach erscheint ein kurzer Toast „Typ gewechselt zu {Name}" mit Aktion „Rückgängig".
- [ ] Die Vorschau baut nach dem Wechsel neu und springt zum Block.
- [ ] **Felder, die das alte Formular nicht kannte** (neuere KI-Antworten), gehen beim Wechsel verloren, wenn der Zieltyp sie nicht kennt. Der Dialog nennt sie unter „Geht verloren" als „Weitere Angaben (N)".
- [ ] Der neue Block verwendet die Feldnamen aus dem Master-Prompt des Zieltyps (nicht die Aliasnamen des alten Blocks).
- [ ] Das Ergebnis eines Wechsels baut im Kern **ohne neue Warnung**. Eine bereits vorhandene Warnung des alten Blocks (z. B. fehlendes Feld) wird nicht stillschweigend „repariert", sondern bleibt als Hinweis stehen, wenn das Feld auch im neuen Typ fehlt.

### Beispielblock (E4)
- [ ] Trägt der Block den Hinweis „Beispielinhalt noch nicht ersetzt", ersetzt der Wechsel den Inhalt durch das **Beispiel des Zieltyps**. Kein Dialog. Toast „Typ gewechselt zu {Name}" mit „Rückgängig".
- [ ] Ist der Block nur **teilweise** geändert (irgendein Inhaltsfeld weicht vom Beispiel ab), gilt er als eigener Inhalt: normaler Dialog, normale Übernahme.

### Kapiteltest
- [ ] Fragen **im Kapiteltest** (Thema und Lernzielkontrolle) bieten „Typ wechseln" ebenfalls an, aber nur zwischen den dort erlaubten Fragetypen **Auswahlfrage und Richtig oder falsch** (Lückentext hat dort keinen Partner in der Familie „Fragen" und wechselt nicht). Der Katalog im Wechsel-Modus ist dort entsprechend gefiltert, die Hinweiszeile „Im Kapiteltest sind nur diese Fragetypen möglich." erscheint.
- [ ] Der Wechsel dort gilt für **eine** Frage und ist ein Schritt für Rückgängig.

### Zugänglichkeit und Layout
- [ ] Alle Bedienelemente mindestens 44 × 44 px, sichtbarer Fokus. Der Dialog ist ein `AlertDialog`-ähnliches Muster; der Fokus kehrt nach Abbrechen an den auslösenden Knopf zurück, nach dem Wechsel in das neue Formular.
- [ ] Unter 1024 px Breite füllt der Katalog den Bildschirm (wie PROJ-90), der Bestätigungsdialog ist ein Bottom-Sheet bzw. zentrierter Dialog mit scrollbarem Inhalt.
- [ ] Texte nutzen ws-Tokens (kein fester Farbwert).

## Edge Cases
- **Block in Rohfassung mit unlesbarem YAML:** Der Wechsel ist nicht möglich. Der Knopf/Menüeintrag ist deaktiviert mit „Die Rohfassung ist nicht lesbar. Bitte zuerst korrigieren." (nichts wird geraten).
- **Block mit leerem Inhalt** (Pflichtfelder leer): Wechsel geht. Leere Felder bleiben leer, Prüfhinweise des Zieltyps erscheinen wie bei jedem Block.
- **Mehrere richtige Antworten in der Auswahlfrage → Schnellfragen / Richtig-falsch:** Es bleibt die erste richtige, die anderen gehen verloren und werden im Dialog mit Anzahl genannt.
- **Auswahlfrage ohne richtige Antwort → Schnellfragen:** Wechsel geht, im Dialog unter „Bitte prüfen": „Es war keine richtige Antwort markiert." Das Feld bleibt leer (Prüfhinweis des Kerns).
- **Schnellfragen mit 12 Fragen → Auswahlfrage:** Dialog nennt „11 weitere Fragen gehen verloren". Wer nicht verlieren will, bricht ab (kein Teilen in mehrere Blöcke, siehe Abgrenzung).
- **Lückentext mit sehr vielen Lücken → „Wörter markieren":** Text und Markierungen bleiben. Kein Limit.
- **Lernkarten mit 30 Karten → Memory:** Alle Karten bleiben, auch wenn Memory in der Praxis weniger Paare verträgt. Der Dialog weist unter „Bitte prüfen" darauf hin, wenn mehr als 12 Karten vorhanden sind (Verständlichkeit, keine Sperre).
- **Bilder ordnen mit Bildern, die in der Auswahl fehlen:** Beim Wechsel zu „Reihenfolge" gehen die Bilder ohnehin verloren; Rückgängig stellt sie wieder her.
- **Wechsel, während die Vorschau noch baut:** wirkt sofort in der Gliederung, die Vorschau baut danach erneut (PROJ-89: nie mehrere Bauaufträge gleichzeitig).
- **Hin- und Herwechseln:** A → B → A stellt nicht den Originalinhalt her, wenn B Teile verloren hat. Hinweis im Dialog, dass Rückgängig der sichere Weg zurück ist.
- **Zwei Browser-Tabs am selben Entwurf:** wie PROJ-89 (neuere Fassung gewinnt, Hinweis bei Konflikt). Der Wechsel ist eine ganz normale Änderung.
- **Veröffentlichte Seite:** Der Wechsel wirkt nur im Entwurf. Veröffentlichte Seiten ändern sich erst nach „Veröffentlichen" (PROJ-89).
- **Zieltyp im Kern künftig nicht mehr vorhanden / Katalog weicht ab:** Der Eintrag erscheint nicht (Test aus PROJ-90 meldet Abweichung).

## Abgrenzung (nicht in PROJ-95)
- Wechsel zwischen **nicht** verwandten Typen (E1). Nicht geplant.
- Eine Familie mit mehreren Schnellfragen **in mehrere Auswahlfragen zerlegen** (wäre mehrere Blöcke in einem Schritt). Später als eigene Idee möglich.
- Weitere Familien, z. B. Begriffe zum Aufklappen ⇄ Lernkarten, Rechenaufgabe ⇄ Rechenweg, Zuordnen ⇄ Memory. Erst, wenn der Bedarf sich zeigt.
- Wechsel von Tabelle, Diagramm, Bild, Lehrtext.
- KI-gestützter Wechsel (z. B. „aus der Auswahlfrage eine Richtig/falsch-Frage mit sinnvoller Aussage machen") → PROJ-93.
- Mehrere Blöcke gleichzeitig wechseln.

## Risiken
- **Verlust-Berechnung muss stimmen:** Der Dialog darf nichts auslassen, was tatsächlich verloren geht, und nichts nennen, was bleibt. Rundreise-Test je Wechselpaar mit den Beispielen aus PROJ-90 und mit echten KI-Antworten (inkl. Feldaliasen wie `steps`/`schritte`).
- **Textsyntax der Lückentypen** (Sternchen, Schrägstriche, Klammern) ist subtil. Die genaue Umsetzungsregel je Paar hängt an `seite.py` und wird in der Architektur anhand des Kerns festgelegt.
- **Gesamtzahl der Wechselpaare:** Fragen 6 Richtungen (3 Katalogtypen), Lücken 12, Karten 6, Reihenfolgen 2 = 26 gerichtete Wechsel. Ein Test baut jedes Paar durch den Kern und prüft „keine neue Warnung".
- **Familien-Zuordnung läuft vom Katalog auseinander**, wenn PROJ-90 um Typen erweitert wird. Ein automatischer Test prüft, dass jeder Typ einer Familie im Katalog steht.

## Technical Requirements
- **Sicherheit:** wie PROJ-89/90. Der Wechsel läuft vollständig im Browser auf dem Entwurf. Es gibt keine neue Schnittstelle und keine Änderung der Datenbank. Bereinigung bleibt im Kern.
- **Leistung:** Dialog und Katalog öffnen ohne spürbare Wartezeit (unter 300 ms). Die Verlust-Liste wird synchron berechnet.
- **Rückgängig:** Wechsel läuft über dieselbe Änderungsfunktion wie alle Bearbeitungen (ein Schritt).
- **Design:** nach `docs/DESIGN.md` (Lehrkräfte-Bereich: ws-Tokens, 44-px-Ziele, `AdminRowActions`).
- **Tests:** Rundreise- und Verlust-Tests je gerichtetem Wechselpaar, Test „Wechsel ergibt Block ohne Kern-Warnung", Test „Rückgängig stellt Originalblock her".

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-12. Grundlage: Editor und Katalog aus PROJ-89/90 (`src/components/werkzeugkiste/editor/*`, `src/lib/werkzeugkiste-katalog.ts`, `src/lib/werkzeugkiste-editor.ts`) und der Kern (`seite.py`, `prompts.py`, Ordner `Werkzeugkiste`).

### Was die Prüfung des Bestands ergeben hat
1. **Kein Server nötig.** Der Wechsel ist eine reine Änderung am Entwurf im Browser, wie Verschieben oder Duplizieren. Er läuft über dieselbe Änderungsfunktion des Editors, ist damit automatisch **ein** Rückgängig-Schritt und wird automatisch gespeichert. Keine neue Schnittstelle, keine Datenbankänderung, kein Eingriff in den Kern.
2. **Der Katalog-Dialog lässt sich wiederverwenden.** Er kann schon auf eine Teilmenge von Typen gefiltert werden (Kapiteltest). Neu ist nur ein zweiter Modus „Wechseln": die übrigen Typen bleiben sichtbar, aber ausgegraut.
3. **Die Erkennung „Beispielinhalt unverändert" gibt es schon** (PROJ-90). Sie wird für E4 mitbenutzt.
4. **Im Kapiteltest gibt es heute schon eine einfache Typ-Auswahl** pro Frage (Auswahlliste „Fragetyp"). Sie übernimmt nur den Fragetext und verwirft den Rest **ohne Warnung**. Sie wird durch den neuen Wechsel ersetzt (siehe Entscheidungen).
5. **Der Kern kennt Mindest- und Höchstzahlen, die die Spec noch nicht nannte:**
   - Memory: mindestens 3 Paare, **höchstens 10** (mehr werden abgeschnitten, mit Warnung). Die Spec nannte „mehr als 12"; richtig ist **mehr als 10**.
   - Lernkarten zum Tippen: mindestens 2 Karten. Reihenfolge und Bilder ordnen: mindestens 3 Schritte.
   - Lernkarten zum Umdrehen haben ein Feld **Titel** (nicht „Arbeitsauftrag"), Memory und Lernkarten zum Tippen haben einen Arbeitsauftrag (`description`). Der Titel geht deshalb in beide Richtungen verloren bzw. bleibt leer.
   - Die Rückseite der Umdrehkarten und der Memory-Karten darf Formatierung enthalten, bei Lernkarten zum Tippen ist sie reiner Text.
   - Schnellfragen brauchen pro Frage mindestens eine falsche Antwort (mit nur einer falschen gibt es eine Rate-Warnung).
6. **Die vier Lückentypen schreiben Lücken unterschiedlich:** Lückentext `*Wort*` mit Varianten `*a/b*`; Wörter ziehen `*Wort*` mit Tipp `*Wort:Tipp*`; Wörter markieren `*Wort*` ohne Varianten oder Tipps (das Wort steht wörtlich); Lückentext mit Hinweis wird im Master-Prompt als `*Wort* (Hinweis)` beschrieben.
7. ⚠ **Auffälligkeit im Bestand (nicht Teil dieses Features):** Der Kern erkennt den Hinweis bei „Lückentext mit Hinweis" nur in der Form `*Wort (Hinweis)*` (Klammer **innerhalb** der Sterne). Master-Prompt und Katalog-Beispiel schreiben aber `*Wort* (Hinweis)`. Nach Lektüre des Codes (nicht ausgeführt) würde die Seite dann den Hinweis als gewöhnlichen Text hinter der Lücke zeigen und keinen „?"-Knopf bauen. Das sollte vor oder neben diesem Feature geprüft werden (eigener Fehlerfall, vermutlich ein Satz im Kern oder im Prompt). Der Wechsel versteht deshalb **beide** Schreibweisen als Eingabe und schreibt beim Wechsel **in** „Lückentext mit Hinweis" keine Hinweise, damit er das Problem nicht verbreitet.

### A) Komponenten-Struktur
```
Editor (vorhanden)
+-- Gliederung
|   +-- Block-Zeile
|   |   +-- ⋯-Menü: „Typ wechseln …"                         ← neu (nur bei Blöcken mit Familie)
|   |   +-- geöffneter Block
|   |       +-- Kopf: Knopf „Typ wechseln"                    ← neu
|   |       +-- Formular des Typs (vorhanden)
|   +-- Kapiteltest-Formular
|       +-- je Frage: „Typ wechseln" statt Auswahlliste „Fragetyp"   ← ersetzt
+-- Katalog-Fenster (vorhanden, PROJ-90)
|   +-- neuer Modus „Wechseln": Titel „Typ wechseln – aktuell: …"
|       +-- Familie des Blocks: wählbar
|       +-- aktueller Typ: markiert „Aktueller Typ", nicht wählbar
|       +-- alle übrigen: ausgegraut + Grund
|       +-- ohne „Zuletzt verwendet"
+-- Bestätigungsdialog „Von A zu B wechseln?"                 ← neu
|   +-- Abschnitt „Wird übernommen"
|   +-- Abschnitt „Geht verloren"  (Warnfarbe, Symbol, Anzahlen)
|   +-- Abschnitt „Bitte prüfen"
|   +-- Knöpfe: „Abbrechen" · „Wechseln"
+-- Toast „Typ gewechselt zu …" mit „Rückgängig"
```

### B) Daten (in Alltagssprache)
**Nichts wird neu gespeichert.** Der gewechselte Block ersetzt den alten im Entwurf und wird mit ihm gespeichert und veröffentlicht. Ein Wechsel hinterlässt keine Spur außer dem neuen Typ.

**Neu im Programm (feste Information, keine Datenbank):**
- **Die Wechsel-Familien** mit den vier Gruppen aus der Spec.
- **Wechsel-Regeln je Familie**: Welche Felder in welche Felder übertragen werden, was verloren geht und was geprüft werden sollte. Gebündelt in einem eigenen kleinen Programmteil mit **reinen Rechenfunktionen** (Block rein, Block und Dialogliste raus). Er hängt weder an der Oberfläche noch an einem Server und ist deshalb vollständig testbar.
- **Dialogtexte** entstehen aus denselben Regeln, nicht aus einer getrennten Liste. So können Dialog und Ergebnis nicht auseinanderlaufen.

**Pro Wechsel berechnet:**
- der neue Block
- „Wird übernommen" (z. B. „Frage, 3 Antworten")
- „Geht verloren" mit Anzahlen (z. B. „Feedback zu den Antworten", „2 weitere Fragen", „Weitere Angaben (2)")
- „Bitte prüfen" (z. B. „Ob die Aussage stimmt, ist auf ‚richtig' voreingestellt", „Memory zeigt höchstens 10 Paare")

### C) Wechsel-Regeln im Überblick
| Familie | Gemeinsamer Kern | Wichtigste Verluste/Prüfhinweise |
|---|---|---|
| **Fragen** | Frage-/Aussagetext, richtige und falsche Antworten | Feedback je Antwort; weitere richtige Antworten; weitere Schnellfragen; „richtig/falsch" ist nicht herleitbar → voreingestellt „richtig" und im Dialog genannt |
| **Lücken & Wörter** | Text mit Sternchen, Position aller Lücken, Arbeitsauftrag | Varianten (`a/b`) → es bleibt die erste; Tipps (`:Tipp` bzw. `(Hinweis)`) gehen verloren; in „Lückentext mit Hinweis" entstehen keine Hinweise |
| **Karten** | Vorder- und Rückseite, Arbeitsauftrag wo vorhanden | Titel der Umdrehkarten; Formatierung der Rückseite beim Wechsel zu „Tippen" (wird zu Text); mehrere akzeptierte Antworten („7/sieben") bleiben als Text; Memory: unter 3 Karten Warnung, über 10 abgeschnitten (nur angezeigt, im Block bleiben alle) |
| **Reihenfolgen** | Schritte in Reihenfolge, Arbeitsauftrag | Bilder gehen beim Wechsel zu „Reihenfolge" verloren; leere Schritttexte werden „Schritt N" |

Regeln gelten für **beide Schreibweisen der Feldnamen** (z. B. `steps`/`items`, `cards`/`pairs`, `question`/`text`). Der neue Block benutzt die Namen aus dem Master-Prompt.

### D) Ablauf
1. Lehrkraft wählt „Typ wechseln" (Menü oder Knopf im Block, im Kapiteltest an der Frage).
2. Ist der Block **unverändertes Beispiel** → sofort das Beispiel des Zieltyps einsetzen, Toast. (Ende)
3. Sonst öffnet der Katalog im Wechsel-Modus mit der Familie des Blocks.
4. Auswahl eines Zieltyps → Bestätigungsdialog mit den drei Listen (auch bei verlustfreiem Wechsel, E2).
5. „Wechseln" → Block wird ersetzt, bleibt geöffnet, Fokus im neuen Formular, Vorschau baut neu, Toast mit „Rückgängig". „Abbrechen" ändert nichts.

### E) Technische Entscheidungen (und warum)
| Entscheidung | Warum |
|---|---|
| **Wechsel nur im Browser, ohne Server und Kern.** | Der Wechsel schreibt nur den Entwurf um. Dort laufen Rückgängig, Speichern und Prüfstelle schon. Der Kern prüft das Ergebnis ohnehin beim nächsten Bau der Vorschau. |
| **Wechsel-Regeln als eigener, reiner Programmteil.** | Dialog und Ergebnis kommen aus derselben Berechnung. Alle 26 gerichteten Wechsel lassen sich automatisch testen (inklusive „Block baut im Kern"). |
| **Katalog-Fenster mit zweitem Modus statt eigenem Fenster.** | Ein Bedienmuster für „einfügen" und „wechseln". Suche, Tastatur, Vorschaubilder und ausgegraute Einträge sind schon gebaut. |
| **Dialog auch bei verlustfreiem Wechsel.** | Entscheidung E2. Dialog ist kurz, Fokus auf „Wechseln". Rückgängig bleibt das Netz. |
| **Auswahlliste „Fragetyp" im Kapiteltest wird ersetzt.** | Sie arbeitet ohne Warnung und verwirft Inhalt. Zwei Wege für dasselbe wären widersprüchlich. Folge: **Auswahlfrage → Lückentext im Kapiteltest entfällt**, weil Lückentext keine Familie mit den Fragetypen bildet (die alte Auswahlliste kopierte nur den Fragetext und ließ die Lücken leer). Neue Lückentext-Fragen kommen weiter über „Frage hinzufügen". |
| **Beispiel-Block: Beispiel des Zieltyps statt Übertragung.** | Entscheidung E4. Übertragung von Platzhaltertext wäre Rauschen. |
| **Dialog erwähnt Mindest- und Höchstzahlen des Kerns.** | Der Kern überspringt z. B. ein Memory mit zwei Paaren. Dann sieht die Lehrkraft den Grund im Dialog, nicht erst als Leerstelle in der Vorschau. |

### F) Änderungen an der Spec (aus der Prüfung)
- Memory: Grenze **10 Paare** statt 12 (Kern); Mindestzahl 3. Hinweise unter „Bitte prüfen" auch bei zu wenigen Karten/Schritten (Memory unter 3, Lernkarten zum Tippen unter 2, Reihenfolge/Bilder ordnen unter 3).
- Kriterium „Ergebnis baut ohne neue Warnung" gilt **außer** der Dialog hat die Warnung vorab unter „Bitte prüfen" genannt (z. B. Wechsel von 2 Umdrehkarten zu Memory).
- Umdrehkarten haben einen **Titel**, keinen Arbeitsauftrag: Titel geht verloren, nach „Umdrehen" ist er leer.
- Im Kapiteltest ersetzt „Typ wechseln" die Auswahlliste „Fragetyp" (siehe E).

### G) Abhängigkeiten (Pakete)
Keine neuen Pakete. Dialog (`AlertDialog`), Toast (sonner), Menü und Katalog-Fenster sind vorhanden.

### H) Teststrategie
- **Rechentests je gerichtetem Wechsel** (26): Beispielblock des Quelltyps → Wechsel → Ergebnis plausibel, Dialoglisten stimmen.
- **Kern-Test:** Jedes Ergebnis wird durch den Kern gebaut (wie der Beispiel-Test aus PROJ-90); erwartete Warnungen sind die im Dialog angekündigten.
- **Rundreise mit Alias-Feldnamen** (`steps`/`schritte`, `cards`/`pairs`) und mit beiden Schreibweisen des Hinweises.
- **Wächter:** Jeder Typ der Familien ist im Katalog; kein Typ steht in zwei Familien.
- **Oberfläche:** Menüeintrag nur bei Blöcken mit Familie, Katalog im Wechsel-Modus (Ausgrauen mit Grund), Dialog (Fokus, Abbrechen, Wechseln), Rückgängig stellt den Originalblock wieder her, Toast.
- **Kapiteltest:** Wechsel einer Frage, Select „Fragetyp" ist weg.

## Implementation Notes (Frontend)
- **Neu:** `src/lib/werkzeugkiste-blocktyp-wechsel.ts` (Familien, `wechselZiele`, `planeWechsel`: reine Rechenfunktionen, Dialoglisten und neuer Block aus einer Berechnung), `src/components/werkzeugkiste/editor/typ-wechsel.tsx` (`TypWechsel` = Katalog im Wechsel-Modus + Bestätigungsdialog, `TypWechselKnopf` für den Kapiteltest).
- **Geändert:** `katalog-dialog.tsx` (Prop `wechsel`: nur Familie wählbar, aktueller Typ „Aktueller Typ“, übrige ausgegraut mit Grund, kein „Zuletzt verwendet“), `editor-gliederung.tsx` (Menüeintrag „Typ wechseln …“ und Knopf im geöffneten Block, Rückgängig-Aktion im Toast), `editor-formulare.tsx` (Kapiteltest: Auswahlliste „Fragetyp“ ersetzt durch „Typ wechseln“).
- **Kein Backend, keine Migration, keine neuen Pakete.** Der Wechsel läuft über `aendere` ohne Gruppenschlüssel, ist also immer ein eigener Rückgängig-Schritt.
- **Abweichungen/Entscheidungen beim Bau:**
  - Wörter ziehen kennt Tipps (`*Wort:Tipp*`). Ein Hinweis aus „Lückentext mit Hinweis“ wird dorthin **übernommen**, nicht verworfen (in der Spec stand „geht verloren“).
  - Wechsel *in* „Lückentext mit Hinweis“ erzeugt keine Hinweise und sagt das unter „Bitte prüfen“ (Hinweis-Schreibweise siehe Befund unten).
  - Bei Schnellfragen mit mehreren Fragen bleibt nur die erste (Dialog nennt die Zahl).
  - Der Dialog liest `description` bei den Lücken-Typen mit; Umdrehkarten haben `title`, der verloren geht.
  - Memory-Grenze im Dialog: 10 Paare (Kern), Mindestzahlen 3/2/3.

## QA Test Results

**Stand 2026-11-12, geprüft per Tests und Code-Durchsicht (kein Browser: Dev-Server auf diesem Rechner nicht erlaubt).**

- **Automatisch:** 78 Rechentests (`werkzeugkiste-blocktyp-wechsel.test.ts`: alle 26 gerichteten Wechsel, Beispielblock-Weg, Verlustlisten, Alias-Felder, beide Hinweis-Schreibweisen), 8 Oberflächentests (`typ-wechsel.test.tsx`: Wechsel-Modus, Ausgrauen, Dialog, Abbrechen, Rückgängig-Aktion, Beispielweg, Kapiteltest). Gesamtlauf: 268 Dateien, 3341 Tests grün. `tsc` ohne Fehler, ESLint ohne neue Meldungen, `npm run build` erfolgreich.
- **Acceptance Criteria:** Einstieg (Menü + Knopf, nur bei Blöcken mit Familie), Wechsel-Modus des Katalogs, Dialog mit drei Abschnitten, Ersetzen an gleicher Stelle, ein Rückgängig-Schritt, Toast mit „Rückgängig“, Beispielblock ohne Dialog, Kapiteltest: erfüllt (Tests).
- **Sicherheit:** Keine neue Schnittstelle, keine neuen Daten. Der Wechsel schreibt nur in den Entwurf des eigenen Materials; Bereinigung und Prüfung bleiben im Kern. Kein Befund.
- **Bugs:** keine kritischen oder hohen.
- **Bekannte Grenzen / offen:**
  - **BUG-1 (niedrig):** Der Knopf „Typ wechseln“ im geöffneten Block wirkt auf den **gespeicherten** Block. Ungespeicherte, noch unlesbare Rohfassungs-Eingaben werden dabei verworfen (die Spec wollte den Wechsel sperren). Der Dialog zeigt den Zustand des Blocks, Rückgängig stellt ihn her.
  - **Befund im Bestand (nicht PROJ-95):** Der Kern erkennt Hinweise bei „Lückentext mit Hinweis“ nur als `*Wort (Hinweis)*`, Master-Prompt und Katalog-Beispiel schreiben `*Wort* (Hinweis)`. Aus dem Code gelesen, nicht im Browser bestätigt. Eigener Fehlerfall.
  - **Browser-Durchgang offen** (Menü, Katalog-Modus, Dialog, Handy 360 px, Tastatur).

## Deployment
_To be added by /deploy_
