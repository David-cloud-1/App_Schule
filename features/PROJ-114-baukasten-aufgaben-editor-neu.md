# PROJ-114: Baukasten – Aufgaben an Ort und Stelle bearbeiten

## Status: In Progress
**Created:** 2026-11-17
**Last Updated:** 2026-11-17 (Bauschritt 3 gebaut, Zweig `proj-114-aufgabenwerk`)

## Idee in einem Satz
Ein Klick auf eine Aufgabe in der Seite macht sie an Ort und Stelle bearbeitbar (wie bei Google Forms): Sie sieht weiter aus wie für die Schüler, nur sind Texte jetzt Eingabefelder. Es gibt keine zweite Fläche, nichts steht doppelt, und alle Aufgabentypen bedienen sich nach denselben sechs Mustern.

Teil der Reihe „Baukasten direkt“ (Leitbild PROJ-101: Die Seite meldet, die App entscheidet). Enthält den früheren Entwurf PROJ-115 (Klick öffnet den Eintrag). Folge-Spec: PROJ-116 (Lösungen im Modus Bearbeiten sichtbar).

## Anlass
Rückmeldung des Nutzers (2026-11-17) am Material „Basics rund um den LKW (Kopie)“: Bei „Wörter ziehen“, „Wörter markieren“ und „Begriffe zum Aufklappen“ sei die Bearbeitung „total unübersichtlich und nicht schön gelöst“. Ziel: „Dieses Mal muss das wirklich sitzen, über alle Aufgaben und Boxen im Baukasten.“

## Warum die bisherigen Schritte nicht gereicht haben
- PROJ-101–113 haben die Seite umgebaut. Die Formulare in der Schublade stammen unverändert aus PROJ-89/90: jeder Eintrag eine große, immer offene Karte mit drei Icons, Hinweissätze unter fast jedem Feld, über 200 px Kopf vor dem Inhalt.
- Lückentexte verlangen Sternchen-Schreibweise (`*Wort:Tipp*`).
- **Grundproblem (erkannt am Prototyp v1):** Schublade neben der Seite heißt, alles doppelt zu sehen – die Antworten in der Seite und noch einmal im Formular. Auch eine gut gestaltete Schublade bleibt dadurch umständlich. Prototyp v1 (Schublade mit Mustern) fand der Nutzer „sehr sehr umständlich und unübersichtlich“, Prototyp v2 (Bearbeiten an Ort und Stelle) „schon viel besser“.

## Grundsatz-Entscheidung (Nutzer, 2026-11-17, nach Prototyp v2)
**Die gewählte Aufgabe wird in der Seite selbst zum Editor.** Die App spielt den Aufgaben-Editor in die Vorschau ein, so wie seit PROJ-103 den Text-Editor für den Lehrtext. Während des Bearbeitens baut der Kern nicht neu; erst nach „Fertig“ wird die Aufgabe neu gebaut. Die Schublade wird für Aufgaben nicht mehr gebraucht.

## Entscheidungen
- **E1 – Löschen:** Sofort, mit Toast „Rückgängig“ (kein Rückfrage-Dialog). Rückgängig oben im Editor bleibt zusätzlich.
- **E2 – Seltene Aktionen:** „Typ wechseln“, „Rohfassung“, „Block duplizieren“, „Block löschen“ liegen im `⋯` der Fußleiste der Aufgabe.
- **E3 – Prototyp zuerst:** v1 (Schublade) verworfen, v2 (an Ort und Stelle) als Richtung freigegeben: https://claude.ai/artifact/9EGpLAjwTLvcn1WUPTsBuu
- **E4 – Ausliefern:** Jeder Bauschritt zuerst als Vercel-Vorschau-Link (eigener Zweig), live erst nach Freigabe durch den Nutzer.
- **E5 – Ersetzt:** die Lücken-Liste aus dem Fix vom 2026-11-17 (Commit `72712d6`) und die Formular-Schublade für Aufgaben (PROJ-96, PROJ-111). Die Schublade bleibt nur, wo sie nötig ist (siehe offene Punkte).
- **E6 – PROJ-115 aufgegangen:** Ein Klick auf einen Eintrag (Begriff, Antwort, Lücke …) öffnet die Aufgabe genau dort. Das gehört untrennbar zum Bearbeiten an Ort und Stelle.

## Aufbau einer Aufgabe im Bearbeiten-Zustand (gilt für jeden Typ)
- Blauer Rahmen und Schild „Bearbeiten“ oben links an der Aufgabe.
- Inhalt sieht aus wie für die Schüler; Texte sind Eingabefelder ohne Rahmen (gestrichelte Linie beim Darüberfahren, blau hinterlegt beim Tippen). Platzhalter zeigen ein Beispiel.
- Arbeitsanweisung als Zeile über der Aufgabe; leer zeigt sie die Standard-Anweisung als Platzhalter.
- Zeilenwerkzeuge (Griff zum Ziehen, ×, typabhängig Rückmeldung oder Hinweis) erscheinen beim Darüberfahren bzw. Fokus; auf Touch-Geräten immer sichtbar.
- Fußleiste (bleibt beim Scrollen unten an der Aufgabe stehen): Typ-Name, „Optionen“ (nur wenn der Typ welche hat), `⋯`, „Fertig“.
- Fehler stehen an der Stelle, die betroffen ist („Klick auf den Kreis vor der richtigen Antwort.“).

## Die sechs Muster (Bedienung in der Seite)
| Muster | Bedienung | Typen |
|---|---|---|
| **A Antworten** | Klick auf Kreis bzw. Kästchen vor der Antwort macht sie richtig. Zeile „Antwort hinzufügen“ am Ende. Sprechblase an der Zeile öffnet die Rückmeldung darunter. | Einfach-/Mehrfachauswahl, Schnellfragen, Zusammenfassung (Fragen), Tippkarten, Hotspot (Bereiche richtig), Richtig/Falsch |
| **B Zeilen** | Nummerierte Liste. Enter = neue Zeile, Rücktaste in leerer Zeile = löschen, Einfügen mehrerer Zeilen = mehrere Einträge (Aufzählungszeichen werden entfernt). | Reihenfolge, Wörtersuche, Kernaussagen, Störer, Ablenker, Selbsteinschätzung, Bilder ordnen (Texte) |
| **C Paare** | Kurz: beide Teile nebeneinander in einer Zeile. Lang: wie die Schülersicht (z. B. Aufklapp-Leiste), Klick klappt den Eintrag auf, der zweite Teil steht darunter; nur einer offen. | Kurz: Memory, Kopfrechnen, Kreuzwort, Schätzrunde, Bildzuordnung (Begriffe). Lang: Begriffe zum Aufklappen, Karten |
| **D Gruppen** | Kategorien als Kästen wie bei den Schülern, Begriffe darin; „+ Begriff“ im Kasten, Enter legt an. Begriffe zwischen Kästen ziehen oder anklicken → „Verschieben nach …“. | Zuordnen, Trainer |
| **E Markieren im Text** | Wort auswählen → schwebender Knopf „Als Lücke“ (bei Wörter markieren „Als Lösung“). Lücken grün im Text; Klick öffnet kleines Fenster (Wort, Tipp, weitere Schreibweisen, „Lücke entfernen“). Die Wörter zum Ziehen entstehen von selbst. Keine Sternchen außerhalb der Rohfassung. | Lückentext, erweiterter Lückentext, Wörter ziehen, Wörter markieren |
| **F Schritte** | Jeder Schritt eine Zeile (z. B. „Schritt 1: Frage = Ergebnis Einheit“), Hinweis über Fragezeichen-Knopf darunter. | Rechenweg, Fallakte, Rechenbeispiel, Kapiteltest, Video-Fragen |

Einzelfeld-Typen (Rechenaufgabe, Freitext) nutzen nur den einheitlichen Aufbau. Bild-Typen behalten ihre Bild-Werkzeuge aus PROJ-104–107; ihre Listen nutzen A, B oder C. Tabelle und Diagramm: siehe offene Punkte. Lehrtext und Boxen bleiben wie in PROJ-103 (direkt tippen) und folgen denselben Regeln (Klick, tippen, Fertig/Esc).

## User Stories
- Als **Lehrkraft ohne Erfahrung** möchte ich auf die Aufgabe klicken, die ich ändern will, und direkt darin tippen, ohne eine zweite Ansicht verstehen zu müssen.
- Als **Lehrkraft** möchte ich auf einen bestimmten Begriff, eine Antwort oder eine Lücke klicken und genau dort landen.
- Als **Lehrkraft** möchte ich die richtige Antwort mit einem Klick auf den Kreis festlegen, wie ich es von Google Forms kenne.
- Als **Lehrkraft** möchte ich bei einem Lückentext ein Wort markieren und „Als Lücke“ klicken, statt Sternchen zu tippen.
- Als **Lehrkraft** möchte ich eine Liste aus Word einfügen und daraus automatisch mehrere Einträge erhalten.
- Als **Lehrkraft** möchte ich bei „Zuordnen“ die Begriffe direkt in ihre Kategorie schreiben und zwischen Kategorien ziehen.
- Als **Lehrkraft** möchte ich etwas versehentlich Gelöschtes mit einem Klick zurückholen.
- Als **Lehrkraft** möchte ich beim Tippen nicht auf die Vorschau warten.
- Als **Lehrkraft am Handy oder Tablet** möchte ich dieselbe Bedienung mit dem Finger nutzen.
- Als **erfahrene Lehrkraft** möchte ich Typ wechseln und Rohfassung weiterhin erreichen.

## Acceptance Criteria

### Öffnen und Schließen
- [ ] Im Modus Bearbeiten macht ein Klick auf eine Aufgabe sie an Ort und Stelle bearbeitbar; die übrige Seite bleibt sichtbar und unverändert.
- [ ] Ein Klick auf einen Eintrag (Begriff, Antwort, Lücke, Kategorie, Schritt) setzt den Fokus genau dorthin (bei C lang: Eintrag aufgeklappt, Fokus in der Erklärung; bei E: Fenster der Lücke offen).
- [ ] Lässt sich der Eintrag nicht eindeutig zuordnen (unbekannter Typ, veraltete Vorschau), öffnet sich die Aufgabe ohne Eintrag – nie an einem falschen.
- [ ] „Fertig“, Esc oder ein Klick außerhalb schließen; ein Klick auf eine andere Aufgabe wechselt direkt dorthin (ohne zusätzlichen Klick).
- [ ] Höchstens eine Aufgabe ist gleichzeitig im Bearbeiten-Zustand; Lehrtext-Schreibmodus und Aufgaben-Bearbeiten schließen sich gegenseitig aus.
- [ ] Im Modus Ausprobieren, im Download, im öffentlichen Link, im Regal und im Druck gibt es nichts davon.

### Tempo und Speichern
- [ ] Tippen, Hinzufügen, Löschen, Umsortieren reagieren sofort (ohne Neubau durch den Kern).
- [ ] Jede Änderung wird automatisch gespeichert wie heute (Entwurf, Autosave); Tippen in einem Feld ergibt einen Rückgängig-Schritt.
- [ ] Nach „Fertig“ wird die Aufgabe neu gebaut; bis dahin bleibt die bearbeitete Fassung stehen (kein Flackern, kein Springen).
- [ ] Die gespeicherte Struktur (YAML, Sternchen-Schreibweise) ändert sich nicht; Rohfassung zeigt sie wie bisher.

### Gemeinsame Regeln
- [ ] Löschen wirkt sofort, Toast „… gelöscht“ mit „Rückgängig“ (mindestens 6 s); Rückgängig stellt Eintrag und Position wieder her.
- [ ] Zeilenwerkzeuge erscheinen bei Maus beim Darüberfahren und bei Fokus, auf Touch immer.
- [ ] Umsortieren per Griff (Maus und Finger) und per Tastatur (Alt + ↑/↓ in der Zeile).
- [ ] Neuer Eintrag ist sofort sichtbar und hat den Fokus.
- [ ] Mindestanzahlen verhindern Löschen mit einem erklärenden Hinweis statt stillschweigend.
- [ ] `⋯` der Fußleiste: Typ wechseln, Rohfassung bearbeiten, Block duplizieren, Block löschen (rot, unten). Rohfassung und Typ wechseln funktionieren wie heute.
- [ ] Bedienelemente mindestens 44 × 44 px Trefferfläche (Touch), vollständig per Tastatur bedienbar, sichtbarer Fokus, Icons ohne Text mit `aria-label`; Bildschirmleser hört „… wird bearbeitet“ und „… fertig“.

### Muster A–F
- [ ] **A:** Kreis bei „genau eine richtig“, Kästchen bei „mehrere richtig“; Klick setzt bzw. wechselt; Enter springt zur nächsten Antwort oder legt eine an; Rückmeldung je Antwort über die Sprechblase, vorhandene ist markiert.
- [ ] **B:** Enter, Rücktaste und Einfügen wie oben; Höchstzahl wird mit Hinweis eingehalten.
- [ ] **C:** Kurze Paare nebeneinander (unter 400 px untereinander); lange Paare wie die Schülersicht, nur einer offen, fehlender zweiter Teil zugeklappt orange markiert („Erklärung fehlt“).
- [ ] **D:** Kästen je Kategorie, „+ Begriff“ mit Enter, Ziehen zwischen Kästen, „Verschieben nach …“ per Klick; Kategorie löschen nimmt ihre Begriffe mit (Rückgängig stellt alles her, Toast nennt die Zahl).
- [ ] **E:** Auswahl → „Als Lücke“/„Als Lösung“; bei Auswahl über eine Lücke oder mehrere Absätze deaktiviert mit Grund; Satzzeichen und Leerzeichen am Rand der Auswahl werden nicht mitgenommen; Fenster mit Wort, Tipp (Wörter ziehen, erweiterter Lückentext), weitere Schreibweisen (Lückentext), „Lücke entfernen“ (Wort bleibt als Text). HTML-Tags im Klartext (`<p>`) werden erkannt und mit einem Klick entfernt.
- [ ] **F:** Schritt als Zeile, Hinweis per Knopf darunter.

### Vollständigkeit
- [ ] Alle Aufgabentypen mit Formular (derzeit 35 in `FORMULARE` inkl. Katalog) sind an Ort und Stelle bearbeitbar; ein Wächter-Test schlägt fehl, wenn ein Typ fehlt.
- [ ] Für jeden Typ gibt es Tests für Öffnen, Ändern, Hinzufügen, Umsortieren, Löschen + Rückgängig.
- [ ] Vor dem Livegang ein Durchgang mit einer echten Einheit (z. B. „Basics rund um den LKW“) im Vorschau-Link: jeden vorkommenden Typ einmal öffnen, ändern, umsortieren, löschen – am Laptop und am Handy.

## Edge Cases
- **Vorschau wird gerade neu gebaut, während man klickt:** Klick wartet nicht; öffnet, sobald die Seite steht, oder wählt den Block wie heute.
- **Bestandsblöcke mit fehlerhaften Daten** (fehlende Felder, HTML im Klartext, Sternchen ohne Gegenstück): zeigen, was lesbar ist, Fehler am Ort markieren, beim Öffnen nichts zerstören; Rest über Rohfassung erreichbar.
- **Unbekannte Felder** im Block bleiben beim Speichern erhalten.
- **Sehr lange Aufgaben** (30+ Einträge): Fußleiste bleibt sichtbar, Seite scrollt normal.
- **Gleiches Wort mehrfach im Lückentext:** nur die ausgewählte Stelle wird zur Lücke; Klick auf eine Lücke ordnet nach Reihenfolge im Text zu.
- **Schreibschutz** (fremdes Material): Aufgabe öffnet sich nicht zum Bearbeiten; Hinweis wie heute.
- **Mehrfachauswahl** (PROJ-102, Umschalt/Strg-Klick): wählt Blöcke wie heute, öffnet keine Aufgabe.
- **Handy:** Bildschirmtastatur verdeckt das Feld nicht; „Als Lücke“ erscheint über der Auswahl; Ziehen nur am Griff.
- **Rückgängig/Wiederholen oben während eine Aufgabe offen ist:** wirkt auf die offene Aufgabe und zeigt den Stand sofort.

## Offene Punkte für `/architecture`
- Wie der Editor in die Vorschau kommt (Bündel wie das Schreibwerk aus PROJ-103?), wie Änderungen zur App gelangen (Nachrichten, „Seite meldet, App entscheidet“) und wie der Kern-Neubau nach „Fertig“ nur diese Aufgabe betrifft oder die Seite ruhig neu lädt.
- Wie das Kern-HTML jedes Typs gefunden und ersetzt wird (Marken `data-wk`), ohne Kern-Änderung, falls möglich.
- Tabelle und Diagramm: an Ort und Stelle oder weiter in der Schublade? Bild-Typen: Zusammenspiel mit den Bild-Werkzeugen aus PROJ-104–107.
- Was mit der Schublade passiert (nur noch für Sonderfälle oder ganz weg), und mit der Gliederung (PROJ-96).

## Nicht Teil dieser Spec
- Lösungen in der Seite anzeigen → PROJ-116.
- Änderungen an der gespeicherten Struktur.
- Vorschau-Tempo Stufe 2 (PROJ-112) – wird durch diese Spec beim Tippen weniger wichtig.

## Dependencies
- Requires: PROJ-89/90 (Formulare, Katalog), PROJ-101 (Auswählen, Modus Bearbeiten/Ausprobieren, Nachrichten Seite → App), PROJ-103 (eingespielter Editor in der Vorschau)
- Berührt: PROJ-96 und PROJ-111 (Schublade), PROJ-102 (Mehrfachauswahl, Ziehen), PROJ-104–107 (Bilder), PROJ-95 (Typ wechseln), PROJ-83 und PROJ-45 (Bedienmuster, Barrierefreiheit)
- Grundlage für: PROJ-116

## Modellwahl
- `/architecture`: **Opus** (neue Architektur: Editor in der Vorschau)
- Grundgerüst und Muster-Bausteine: **Opus**
- Typen umstellen (Typ für Typ): **Sonnet**
- QA: **Opus**

## Umsetzung

### Bauschritt 1 – Grundgerüst + Muster A (2026-11-17, Opus, Zweig `proj-114-aufgabenwerk`)
**Gebaut**
- `editor/aufgabenwerk/bauplan.ts`: Baupläne für `multiple_choice`, `single_choice`, `true_false`; Prüfen/Zusammenführen (`uebernimmAufgabe`), Eintrags-Zählprüfung (`eintragFuerBlock`), Hinweise am Ort, Lösch-Texte für den Toast. Wird in App und Seite gleichermaßen genutzt.
- `editor/aufgabenwerk/eintritt.ts` + `design.ts`: Aufgabenwerk mit Preact + htm (kein JSX-Umbau nötig), nachgeladen beim ersten Öffnen; gebaut mit `npm run aufgabenwerk:bauen` (30 KB), Frische-Test wie beim Schreibwerk.
- Muster A: Kreis setzt die richtige Antwort, Enter zur nächsten/neuen Antwort, Rücktaste in leerer Zeile löscht, Einfügen mehrerer Zeilen = mehrere Antworten, Alt+↑/↓ und Griff (Zeiger) zum Umsortieren, Sprechblase öffnet die Rückmeldung (vorhandene markiert), Mindestzahl erklärt statt still zu verweigern, Hinweise am Ort („Klick auf den Kreis …“). Richtig/Falsch: Rückmeldungen hängen an ihrer Antwort und tauschen beim Umstellen mit.
- Rahmen: Schild „Bearbeiten“, klebende Fußleiste (Typ · ⋯ · Fertig), `⋯` = Typ wechseln, Rohfassung, Duplizieren, Löschen (rot, unten); Esc/Fertig/Klick daneben beenden; Klick auf eine andere Aufgabe wechselt direkt; Ansage für Bildschirmleser.
- Seiten-Skript: Klick auf Aufgabe meldet `wkAufgabe` mit Eintrag und gezählter Anzahl; Klicks und Tasten in der offenen Aufgabe bleiben in der Seite (`wk-aufgabenzone`).
- App: Sitzungen je Marke, Prüfen + Speichern jeder Änderung (eine Verlaufs-Gruppe je Feld/Aktion), kein Neubau solange offen, Rückgängig/Toast/Schublade schicken den neuen Stand zurück in die Seite, Schließen bei Moduswechsel, anderer Auswahl, Dialog, Mehrfachauswahl, Schreibschutz.

**Abweichungen / Entscheidungen beim Bau**
- `multiple_choice` und `single_choice` haben im Kern dieselbe Form (genau eine richtig) → beide mit **Kreis**. Kästchen („mehrere richtig“) kommen erst mit einem Typ, der das braucht.
- Auch ein Klick auf eine Aufgabe, die der Kern als Platzhalter zeigt („noch nicht fertig ausgefüllt“), öffnet sie an Ort und Stelle; ebenso „Bearbeiten“ in der Leiste, Doppelklick und Enter.
- „Typ wechseln“ und „Rohfassung“ öffnen vorerst die Schublade an dieser Stelle (dort wohnen die Dialoge); eigene Dialoge folgen, wenn die Schublade für Aufgaben wegfällt (Bauschritt 4).
- Zusatzfelder einer Antwort bleiben erhalten, wenn es sie im gespeicherten Block schon gab; neue Felder aus der Seite werden verworfen.
- „Optionen“ erscheint noch nicht – keiner der drei Typen hat welche.

**Tests:** `aufgabenwerk.test.ts` (37: Bündel, Kontrast, Bauplan, Werk, Nachrichten, Seiten-Skript), 7 neue Fälle in `baukasten-editor.test.tsx`. Gesamtlauf: 3751 grün, 1 alter Fehler in `werkzeugkiste-auszug.test.ts` (schlägt auch ohne diese Änderung fehl). `tsc` und `npm run build` grün.

**Vorschau-Link:** https://spedilern-git-proj-114-aufgabenwerk-david-cloud-1s-projects.vercel.app (Supabase-Variablen dafür am 2026-11-17 auch für „Preview“ eingetragen; die Vorschau nutzt die echte Datenbank).

### Bauschritt 2 – Muster E und C (2026-11-17, Opus, Zweig `proj-114-aufgabenwerk`)
**Gebaut**
- **Muster E** für `fill_blanks`, `advanced_fill_blanks`, `drag_words`, `mark_words`: Text direkt in der Seite tippen; Lücken (bzw. Lösungen) als grüne Marken. Wort auswählen → schwebender Knopf „Als Lücke“/„Als Lösung“ (oder Enter); gesperrt mit Grund bei Auswahl über eine Lücke oder mehrere Zeilen; Satz- und Leerzeichen am Rand bleiben draußen; bei „Wörter markieren“ immer ganze Wörter. Klick auf eine Lücke öffnet ein Fenster: Wort, „Auch richtig“ (Lückentext, erweiterter Lückentext), Tipp (erweiterter Lückentext, Wörter ziehen), „Lücke entfernen“ (Wort bleibt als Text). Leeres Wort wird erklärt statt übernommen. Bei „Wörter ziehen“ erscheinen die Wörter zum Ziehen von selbst unter dem Text. HTML-Reste (`<p>`) und einzelne Sternchen werden am Ort gemeldet, `<p>` mit einem Klick entfernt.
- **Lückentext-Übersetzer** (`aufgabenwerk/luecken.ts`) mit denselben Regeln wie der Kern (`_LUECKE`, `_LUECKE_HINWEIS`, Wort-Zählung bei „Wörter markieren“). Unveränderte Lücken behalten ihre Original-Schreibweise → Rundreise immer verlustfrei; beim Öffnen wird nichts verändert.
- **Muster C lang** für `accordion` und `dialog_cards`: Aufklapp-Leiste wie in der Schülersicht, immer nur ein Eintrag offen, fehlende Erklärung/Rückseite zugeklappt orange markiert. Enter im Begriff → Erklärung, Enter in der Erklärung → nächster bzw. neuer Begriff (Umschalt+Enter = neue Zeile).
- **Muster C kurz** für `crossword`: Wort und Umschreibung nebeneinander (unter 400 px untereinander).
- Gemeinsame Listen-Mechanik (`listen.ts`) für A und C (und später B, D, F): Hinzufügen, Löschen mit Mindestzahl, Griff/Alt+Pfeil, Einfügen mehrerer Zeilen.
- Arbeitsanweisung (`description`) als Zeile über der Aufgabe, leer mit der Standard-Anweisung des Kerns als Platzhalter; leer gespeichert wird das Feld entfernt.
- **Klick auf einen Eintrag** für alle neuen Typen: Die App schickt der Seite eine Liste „Block → Typ“ (der Kern kennzeichnet Aufklapp-Begriffe und Karten nicht als Aufgabe); das Seiten-Skript zählt Einträge über einen Finder je Typ. Der Kern lässt unvollständige Begriffe/Karten weg – die App rechnet die angezeigte Nummer auf den gespeicherten Eintrag um; bei „Wörter markieren“ öffnet ein Klick auf eine Lösung ihr Fenster, ein anderes Wort öffnet die Aufgabe ohne Eintrag.
- Die Lücken-Liste aus Commit `72712d6` ist aus dem Formular entfernt (E5).

**Abweichungen / Entscheidungen beim Bau**
- `memory_game` und `arithmetic_quiz` (ebenfalls „C kurz“) kommen erst in Bauschritt 3: Memory speichert je nach Alter `cards`/`pairs` und `front`/`a`, Kopfrechnen Zahlen statt Text – das braucht eigene Regeln in der Übernahme.
- Enter im Lückentext legt keine neue Zeile an (der Kern zeigt Zeilenumbrüche nicht), sondern macht aus einer Auswahl eine Lücke. Bestehende Zeilenumbrüche bleiben erhalten und sichtbar.
- Beim Öffnen von „Begriffe zum Aufklappen“ ohne angeklickten Eintrag ist der erste Begriff aufgeklappt (er hat den Fokus).
- Ein Klick auf „Bearbeiten“ in der Leiste oder Enter öffnet jetzt auch Lückentexte an Ort und Stelle; die Gliederung öffnet weiter die Schublade.

**Tests:** `aufgabenwerk-e-c.test.ts` (35: Übersetzer inkl. Rundreise, Bauplan, Textfeld, Werk E und C), `aufgabenwerk.test.ts` angepasst (37), 10 ältere Editor-Tests auf das neue Verhalten umgestellt (Schublade jetzt am Lehrtext geprüft), 1 neuer App-Test. Gesamtlauf: 3787 grün, 1 alter fremder Fehler (`werkzeugkiste-auszug.test.ts`). `tsc` und Build grün. Bündel 53 KB.

### Bauschritt 3 – Muster B, D, F, Einzelfeld, Memory/Kopfrechnen (2026-11-17, Sonnet, Zweig `proj-114-aufgabenwerk`)
**Gebaut** (12 neue Typen, jetzt 22 mit Bauplan)
- **Muster B** (`muster-b.ts`) für `reihenfolge`, `find_words` und die Rechenschritte des Rechenbeispiels: nummerierte Zeilen, Enter/Rücktaste/Einfügen/Alt+Pfeil/Griff wie bei A und C. Bei der Wörtersuche werden Wörter, die als Objekte gespeichert waren, beim ersten Ändern zu Text – wie schon im Formular.
- **Muster F** (`muster-f.ts`) für `rechenweg`, `schaetzrunde`, `selbsteinschaetzung`: jeder Schritt eine Zeile mit Feldern nebeneinander; Seltenes (Hinweis, Kommentar, Quelle, „Wo man nachsieht“) hinter dem Fragezeichen-Knopf. **C kurz** (gleicher Baustein) für `memory_game` (bleibt bei `cards`/`pairs` und `front`/`a`) und `arithmetic_quiz` (ganze Zahlen werden als Zahl gespeichert).
- **Muster D** (`muster-d.ts`): `drag_drop` mit Kasten je Kategorie, „＋ Begriff“, „Verschieben nach …“ (Auswahl), Kategorie umbenennen nimmt ihre Begriffe mit (auch beim Leeren und Neutippen), Kategorie löschen nimmt ihre Begriffe mit, Begriffe ohne gültige Kategorie stehen in „Ohne Kategorie“. `trainer` mit Kasten je Gruppe: Titel, Hinweis, Einträge in Reihenfolge, Störer, Runden.
- **Einzelfeld:** `calculation_exercise`, `freitext` (Frage, Musterlösung, Zahlfelder „Mindestens Zeichen“ und „Höhe“), `calculation_example` (Formel, Erklärung, Schritte, Ergebnis).
- Bauplan: gleichwertige Feldnamen (`question`/`task`, `cards`/`pairs`, `schritte`/`steps` …) werden erkannt und beim Speichern **beibehalten** (`loese`, `echterName`); neue Teil-Arten `zeilen`, `eintraege`, `zahl`, `zuordnen`, `gruppen`; `pruefe` für typbezogene Hinweise; `uebernimmAufgabe` prüft alle neuen Teile (nur bekannte Felder, Längen, Zahlen 0–100000, Zusatzfelder bleiben).
- Klick auf einen Eintrag: Finder für `reihenfolge` (`.plaetze .platz`), `calculation_example`, `arithmetic_quiz`, `rechenweg`, `schaetzrunde`, `selbsteinschaetzung`, `drag_drop` (Klick auf eine Kategorie). Die Zählregeln wurden gegen echte Kern-Seiten (`seite.baue_seite`) geprüft: leere Einträge fallen dort weg, die App rechnet um. Ohne Finder (Eintrag-Klick öffnet nur die Aufgabe): `find_words`, `trainer`, `memory_game`, `freitext`, `calculation_exercise` – die Seite zeichnet sie per Skript neu bzw. mischt.
- `listen.ts` kann jetzt auch Listen, die nicht direkt im Block liegen (`holen`/`schreibe`).

**Abweichungen / offen**
- **Ziehen von Begriffen zwischen Kästen fehlt noch**; es gibt „Verschieben nach …“ (Auswahl je Begriff). Ziehen zwischen Kästen und Umsortieren der Begriffe innerhalb eines Kastens kommen in Bauschritt 4 oder entfallen nach dem Praxistest.
- Der Lösch-Toast für eine Kategorie nennt die Zahl der mitgelöschten Begriffe nicht („Kategorie samt ihren Begriffen gelöscht“); Rückgängig stellt alles her.
- **Fallakte** (verschachtelte Antworten je Schritt) und **Kapiteltest/Video-Fragen** kommen in Bauschritt 4. Ebenso Bild-Typen, Schnellfragen, Zusammenfassung, Tippkarten.
- Im Rechenbeispiel (Muster F laut Spec) stehen die Rechenschritte als einfache Zeilen (Muster B), weil sie reine Texte sind.

**Tests:** `aufgabenwerk-b-d-f.test.ts` (29: Bauplan, Übernahme inkl. Feldnamen/Zahlen, Hinweise, Werk B, D, F), `aufgabenwerk.test.ts` angepasst. Gesamtlauf: 3816 grün, 1 alter fremder Fehler (`werkzeugkiste-auszug.test.ts`). `tsc`, ESLint und `npm run build` grün. Bündel 76 KB.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Erstellt:** 2026-11-17 (Opus 5.5). Baut auf zwei bewährten Grundsätzen auf: *Die Seite zeigt und meldet, die App prüft und speichert* (PROJ-101) und *ein eingespielter Motor in der Seite, nachgeladen beim ersten Gebrauch* (PROJ-103, Schreibwerk).

### Ausgangslage (Bestand, geprüft)
- Die Vorschau ist eine **abgeschottete Seite** (eigener Rahmen ohne Zugriff auf die App). Die App kann dort **nichts direkt zeichnen** – weder ihre Formulare noch ihre Knöpfe oder Farben. Alles, was in der Seite bedient wird, muss als eigenes kleines Programm in die Seite gebracht werden. Genau so läuft seit PROJ-103 das Schreibwerk für den Lehrtext.
- Der Kern baut **die ganze Seite** aus dem Entwurf. Marken (`data-wk`) gibt es nur pro Block, nicht pro Eintrag (Antwort, Begriff, Lücke).
- Die 35 Formulare (`FORMULARE` + Katalog) laufen in der App und bauen fast alle Listen über einen gemeinsamen Baustein. Sie lesen und schreiben bereits genau die gespeicherte Struktur, die wir behalten wollen.
- Die App hat schon: Wunsch-Prüfung (`liesWunsch`), Editor-Verlauf mit Zusammenfassen gleicher Gruppen, Autosave, „kein Neubau während des Schreibens“ (PROJ-103), Toasts, Rohfassung, Typ wechseln.

### Entscheidung 1: Ein „Aufgabenwerk“ in der Seite
| | A) Formular der App schwebt über der Seite | **B) Eigenes Aufgabenwerk in der Seite (gewählt)** | C) Kern baut Bearbeiten-Fassung |
|---|---|---|---|
| Sieht aus wie die Schülersicht | Nein, liegt darüber, rutscht beim Scrollen | **Ja, ersetzt die Aufgabe an ihrer Stelle** | Ja |
| Tempo beim Tippen | Sofort | **Sofort** | Jede Taste ein Neubau – zu langsam |
| Aufwand | Positionen ständig nachführen, Handy heikel | Ein zweites nachgeladenes Paket wie das Schreibwerk | Großer Kern-Umbau in Python |
| Sicherheit | Unverändert | Unverändert (Seite meldet nur) | Unverändert |

**Warum B:** Nur so wird die Aufgabe wirklich *an Ort und Stelle* zum Editor, wie im freigegebenen Prototyp v2. Das Muster ist im Projekt schon erprobt (Schreibwerk), samt Bauskript, Frische-Test und Nachladen.

- Das Aufgabenwerk wird **erst beim ersten Öffnen einer Aufgabe** nachgeladen, nicht bei jedem Öffnen der Vorschau.
- Es bekommt ein **eigenes Aussehen, das den Aufgaben der Schülerseite nachempfunden ist** (wie das Schreib-Design aus PROJ-103), plus die Bearbeiten-Zeichen aus dem Prototyp (blauer Rahmen, Schild, gestrichelte Felder). Hell/Dunkel folgt der Vorschau.
- **Hinweis zur Regel „shadcn first“:** In der abgeschotteten Seite gibt es weder React-Bausteine der App noch Tailwind. Das Aufgabenwerk nutzt deshalb eigene, schlichte Bausteine. Alles außerhalb der Seite (Toast, Rohfassung, Typ wechseln, Optionen-Dialog falls nötig) bleibt shadcn in der App.

### Entscheidung 2: Eine Typ-Beschreibung als einzige Quelle
Statt 35 neue Formulare zu schreiben, gibt es **eine Tabelle „Typ → Bauplan“**. Jeder Typ sagt in einfachen Daten:
- welche Teile er hat und nach welchem **Muster (A–F)** sie bedient werden (Beispiel „Zuordnen“: Arbeitsanweisung + Muster D),
- welche gespeicherten Felder dazugehören, Mindest- und Höchstzahlen, Standard-Anweisung, Platzhalter-Beispiele,
- welche Einstellungen unter „Optionen“ stehen (z. B. zufällige Reihenfolge, Bestehensgrenze).

Diese Tabelle nutzen **beide Seiten**: das Aufgabenwerk zum Zeichnen, die App zum Prüfen und Zusammenführen. Damit gilt: Ein Typ ohne Bauplan fällt im **Wächter-Test** auf (Kriterium „Vollständigkeit“), und Seite und App können sich nie über Felder uneinig sein.

Die sechs Muster sind sechs Bausteine im Aufgabenwerk. Ein Typ wird umgestellt, indem man seinen Bauplan einträgt – das ist die „Sonnet-Arbeit Typ für Typ“.

### Entscheidung 3: Was hin und her geht (Nachrichten)
```
App → Seite
+-- Aufgabe öffnen: Marke, Typ, gespeicherter Block, Eintrag (falls Klick darauf), schreibgeschützt, Handy
+-- Neuer Stand: nach Rückgängig/Wiederholen oder „Rückgängig“ im Toast
+-- Schließen erzwingen: z. B. Wahl in der Gliederung, Moduswechsel, neue Seite

Seite → App
+-- Öffnen wünschen: Marke + Eintrag (Art und Nummer), vom Seiten-Skript beim Klick
+-- Änderung: Marke + ganzer neuer Block + Gruppe für den Verlauf („Antwort 2 Text“, „Löschen“)
+-- Optionen / Typ wechseln / Rohfassung / Duplizieren / Löschen wünschen (aus dem ⋯)
+-- Fertig / Abbruch
```
- **Jede Aktion** (Hinzufügen, Löschen, Richtig setzen, Umsortieren) wird **sofort** gemeldet. **Tippen** wird nach kurzer Pause gemeldet und landet mit seiner Gruppe zusammengefasst als **ein** Rückgängig-Schritt pro Feld.
- Die App speichert jeden Stand in den Entwurf (Autosave wie heute), **baut aber nicht neu**, solange die Aufgabe offen ist. Erst nach „Fertig“ (bzw. beim Wechsel zu einer anderen Aufgabe) baut der Kern die Seite neu; die bearbeitete Fassung bleibt bis dahin stehen, Scrollposition bleibt (wie heute).
- **Löschen + Toast:** Die Seite meldet nur eine Änderung „gelöscht“. Den Toast mit „Rückgängig“ (≥ 6 s) zeigt die App; „Rückgängig“ ist derselbe Schritt wie im Editor-Verlauf und schickt den alten Stand zurück in die Seite. Ein einziger Rückgängig-Weg für alles.

### Entscheidung 4: Die App prüft, die Seite schlägt nur vor
Was die Seite als neuen Block schickt, wird **nicht einfach übernommen**:
1. Wunsch-Prüfung wie bisher (eigener Rahmen, gültige Marke, Block existiert, Vorschau aktuell, nicht schreibgeschützt, Größenlimit).
2. **Nur die Felder aus dem Bauplan** werden übernommen; alle **unbekannten Felder** kommen aus dem gespeicherten Original (Edge Case „unbekannte Felder bleiben erhalten“).
3. Texte werden als **reiner Text** behandelt (Längenlimit, keine Tags), Zahlen und Ja/Nein streng geprüft, Mindestzahlen eingehalten.
4. Erst dann Speichern und Verlaufseintrag.
Ein Fehler im Aufgabenwerk kann damit höchstens die gerade offene Aufgabe falsch füllen, nie andere Blöcke oder fremde Felder.

### Entscheidung 5: Lückentexte ohne Sternchen (Muster E)
Ein kleiner **Übersetzer** wandelt die gespeicherte Sternchen-Schreibweise in „Text mit Lücken“ (Wort, Tipp, weitere Schreibweisen) und zurück. Gespeichert wird **unverändert** in Sternchen-Schreibweise.
- Eine **Rundreise-Prüfung** (hin und zurück muss denselben Text ergeben) läuft beim Öffnen. Besteht ein Bestandsblock sie nicht (Sternchen ohne Gegenstück o. ä.), öffnet die Aufgabe trotzdem, zeigt den lesbaren Teil, markiert die Stelle und **ändert nichts, bis die Lehrkraft dort etwas tut**. Der Weg über die Rohfassung bleibt.
- HTML-Reste im Klartext (`<p>`) erkennt der Übersetzer und bietet „Entfernen“ an.
- Der Übersetzer ist reiner, gut testbarer Code und wird von App und Aufgabenwerk gemeinsam genutzt.

### Entscheidung 6: Klick auf einen Eintrag – ohne Kern-Änderung
Der Kern markiert keine Einträge. Das Seiten-Skript bekommt deshalb je Typ einen **Finder**: „Antworten sind die Zeilen in diesem Block, Lücken die Eingabefelder im Text …“. Er zählt, welcher Eintrag angeklickt wurde.
- **Sicherheitsregel:** Stimmt die Anzahl der gefundenen Einträge nicht mit dem gespeicherten Block überein (veraltete Vorschau, unbekannter Typ, Sonderfall), öffnet die Aufgabe **ohne Eintrag** – nie an einem falschen (Kriterium erfüllt).
- Abgesichert durch Tests mit **eingefrorenen Kern-Seiten je Typ** (einmal aus dem Kern erzeugt und eingecheckt). Ändert sich der Kern später, schlagen diese Tests an.
- **Vorteil:** kein Kern-Deploy für PROJ-114. Falls ein Typ sich nicht sicher zählen lässt, öffnet er eben ohne Eintrag; eine spätere Kern-Marke wäre dann eine kleine Ergänzung.

### Entscheidung 7: Was aus Schublade und Gliederung wird
| Bereich | Künftig |
|---|---|
| Aufgaben (alle mit Muster A–F oder Einzelfeld) | **An Ort und Stelle.** Die Schublade öffnet für sie nicht mehr. |
| Lehrtext, Überschriften, Deckblatt, Bildunterschrift | Wie PROJ-103 (Schreibwerk), gleiche Regeln für Klick/Esc/Fertig. |
| Bild, Galerie | Bild-Werkzeuge aus PROJ-104–106, unverändert. |
| Hotspot, Bildzuordnung, Bilder ordnen | Bild-Werkzeuge bleiben; ihre **Listen** an Ort und Stelle (A, C bzw. B). |
| **Tabelle, Diagramm** | **Bleiben in der Schublade.** Das Raster-Feld dort ist bereits eine Tabelle zum Tippen; ein zweites in der Seite brächte wenig und kostete viel. Kann später folgen. |
| Kapiteltest, Lernzielkontrolle | An Ort und Stelle, jede Frage als eigene Karte nach ihrem Muster (letzter Bauschritt, weil verschachtelt). |
| Rohfassung, Typ wechseln | Aus dem `⋯` der Aufgabe, öffnen die bestehenden Dialoge der App. |
| Gliederung (PROJ-96) | **Bleibt** als Inhaltsverzeichnis zum Springen und Umsortieren von Blöcken; ein Klick darauf schließt eine offene Aufgabe. |
| Lücken-Liste aus Commit `72712d6` | Entfällt mit Bauschritt 2. |

Die Schublade bleibt also nur für Tabelle, Diagramm und die Einheiten-Einstellungen.

### A) Aufbau (was die Lehrkraft sieht)
```
Vorschau, Modus Bearbeiten
+-- Klick auf Aufgabe / Eintrag  → Aufgabe wird zum Editor (Seiten-Skript meldet, App öffnet)
+-- Aufgabe im Bearbeiten-Zustand (Aufgabenwerk)
|   +-- Schild „Bearbeiten“, blauer Rahmen
|   +-- Arbeitsanweisung (Zeile, Standard als Platzhalter)
|   +-- Inhalt nach Muster
|   |   +-- A Antworten: Kreis/Kästchen · Text · Sprechblase → Rückmeldung · „Antwort hinzufügen“
|   |   +-- B Zeilen: Nummer · Text · Griff · ×
|   |   +-- C Paare: kurz nebeneinander | lang aufklappbar wie Schülersicht
|   |   +-- D Gruppen: Kasten je Kategorie · Begriffe · „+ Begriff“ · Verschieben nach …
|   |   +-- E Text mit Lücken: Auswahl → „Als Lücke“/„Als Lösung“ · Lücken-Fenster
|   |   +-- F Schritte: Zeile je Schritt · Hinweis-Knopf
|   +-- Fehler am Ort („Klick auf den Kreis vor der richtigen Antwort.“)
|   +-- Fußleiste (klebt unten): Typ-Name · Optionen · ⋯ · Fertig
|         ⋯ = Typ wechseln · Rohfassung · Duplizieren · Löschen (rot)
+-- App außerhalb der Seite
    +-- Toast „… gelöscht – Rückgängig“
    +-- Rückgängig/Wiederholen oben (wirken auf die offene Aufgabe)
    +-- Dialoge: Rohfassung, Typ wechseln (bestehend)
    +-- Schublade nur noch für Tabelle, Diagramm, Einstellungen
```

### B) Daten
- **Keine neuen gespeicherten Daten**, keine Datenbank-Änderung, keine neue API, kein neues YAML-Format, keine neue Proxy-Freigabe. Blöcke liegen weiter so im Entwurf wie heute.
- **Neu im Code (nicht gespeichert):** die Typ-Bauplan-Tabelle, der Lückentext-Übersetzer, die Finder je Typ, die neuen Nachrichten in der Nachrichtenliste (mit Typ- und Längenprüfung).
- **Kein Kern-Umbau, kein Kern-Deploy.**

### C) Technische Entscheidungen (begründet)
| Entscheidung | Warum |
|---|---|
| Aufgabenwerk in der Seite, nachgeladen | Einziger Weg zu echtem „an Ort und Stelle“; Muster aus PROJ-103 erprobt |
| Kleine Oberflächen-Bibliothek **Preact** im Aufgabenwerk | Listen mit Hinzufügen, Löschen, Ziehen und Fokus sind mit reinem Browser-Code fehleranfällig; Preact ist sehr klein (wenige KB), funktioniert wie React und ist mit den vorhandenen Test-Werkzeugen ohne Browser-Lauf testbar (wichtig, weil kein Dev-Server) |
| Ein Bauplan je Typ statt 35 Formulare | Einheitliche Bedienung erzwungen, Wächter-Test möglich, Typen schnell umstellbar |
| App übernimmt nur Bauplan-Felder | Unbekannte Felder bleiben, Fehler der Seite bleiben eingegrenzt |
| Neubau erst nach „Fertig“ | Kein Flackern, kein Springen, Tippen ohne Wartezeit |
| Ein Rückgängig-Weg (Editor-Verlauf) | Toast, Knopf oben und Tastenkürzel verhalten sich gleich |
| Finder je Typ mit Zählprüfung statt Kern-Marken | Kein Kern-Deploy; im Zweifel „ohne Eintrag“ statt falsch |
| Ziehen mit eigenem Griff im Aufgabenwerk | Die App-Bibliothek zum Ziehen (`@dnd-kit`) läuft nicht in der Seite; das Seiten-Skript kann Ziehen schon (PROJ-102), derselbe Ansatz für Zeilen |

### D) Bauschritte (jeder als Vercel-Vorschau-Link, live erst nach Freigabe – E4)
| Schritt | Inhalt | Modell |
|---|---|---|
| 1 Grundgerüst | Aufgabenwerk + Bauskript + Frische-Test, Nachrichten, Prüfen/Zusammenführen, Öffnen/Schließen/Wechseln, Fußleiste, `⋯`, Toast-Rückgängig, Optionen, Fehler am Ort; **Muster A** mit Einfach-/Mehrfachauswahl, Richtig/Falsch | Opus |
| 2 Die Sorgenkinder | **Muster E** (alle 4 Lückentexte, Übersetzer) und **Muster C** (Begriffe zum Aufklappen, Karten, kurze Paare); Lücken-Liste aus `72712d6` entfernen | Opus |
| 3 Restliche Muster | **B, D, F** und Einzelfeld-Typen | Sonnet |
| 4 Alle Typen | Übrige Baupläne (Bild-Typen-Listen, Kapiteltest, Lernzielkontrolle), Klick auf Eintrag für alle Finder, Wächter-Test „jeder Typ hat Bauplan“, Schublade für Aufgaben abschalten | Sonnet |
| QA + Praxisdurchgang | Akzeptanzkriterien, Sicherheit der Nachrichten, Durchgang „Basics rund um den LKW“ am Laptop und Handy | Opus |

### E) Risiken
- **Aussehen nachempfunden, nicht vom Kern gerechnet:** Beim Öffnen und nach „Fertig“ kann die Aufgabe leicht anders aussehen. Gleiche Ehrlichkeitsgrenze wie bei PROJ-103; im Vorschau-Link prüfen.
- **Finder hängen am Kern-HTML:** abgefangen durch Zählprüfung und eingefrorene Kern-Seiten in den Tests.
- **Großer Umfang (35 Typen):** abgefangen durch Bauplan-Tabelle und Freigabe nach jedem Schritt.

### F) Abhängigkeiten (Pakete)
- `preact` – kleine Oberflächen-Bibliothek für das Aufgabenwerk in der Seite (nur im nachgeladenen Paket, nicht in der App).
- Sonst nichts Neues: Bauskript (Vite), Toasts (sonner), Tests (Vitest) sind vorhanden.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
