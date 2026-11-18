# PROJ-114: Baukasten – Aufgaben an Ort und Stelle bearbeiten

## Status: In Review
**Created:** 2026-11-17
**Last Updated:** 2026-11-18 (zweite QA-Runde, Opus: 2 High-Funde)

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

### Bauschritt 4 (verkürzt) – Schnellfragen, Zusammenfassung, Tippkarten (2026-11-17, Sonnet)
**Gebaut:** `single_choice_set` (Frage + richtige Antwort in der Zeile, falsche Antworten als Liste darunter, neue Frage bringt zwei leere mit), `summary` (Fragen-Form **und** Aussagen-Form: Teile mit `bedingung`), `flashcards` (Antworten als Text „a / b“; eine vorhandene Liste bleibt eine Liste). Neue Bauplan-Bausteine: `unterliste`, `bedingung`, `liste`, `teileVon`. Finder gegen echte Kern-Seiten geprüft. 24 Typen mit Bauplan.

**Bewusst NICHT umgestellt (öffnen weiter in der Schublade, funktionieren wie bisher):** Fallakte, Kapiteltest, Video mit Fragen (verschachtelte Antworten/Fragen), Bildzuordnung, Hotspot, Bilder ordnen, Bild, Galerie (Bild-Werkzeuge PROJ-104–107), Tabelle, Diagramm. Auch „Typ wechseln“ und „Rohfassung“ öffnen weiter die Schublade. Das ist der Rest für einen Folge-Schritt (Bauschritt 5); damit ist PROJ-114 **nicht vollständig**, der Status bleibt „In Progress“.

**Prüfung:** nur automatisch (Vitest, tsc, ESLint, Build; 3822 Tests grün bis auf den alten Fehler in `werkzeugkiste-auszug.test.ts`). **Kein Browser-Test, kein Handy-Test, kein Praxisdurchgang mit einer echten Einheit** – laut Spec noch vor einem „Deployed“-Status nötig. Auf Wunsch des Nutzers (2026-11-17, „selbstständig bis deploy“) wurde trotzdem nach `main` ausgeliefert, ohne vorherige Freigabe des Vorschau-Links.

### Bauschritt 5 – Fallakte, Video-Fragen, Kapiteltest (2026-11-17, Sonnet, Zweig `proj-114-aufgabenwerk`, live seit 2026-11-17, Commit 7aa8821)
**Gebaut** (27 Typen mit Bauplan)
- **Fallakte:** Titel, Ausgangssituation, Urteil als Texte; Schritte mit Frage, „Wird danach enthüllt“ und eigener Antwortenliste (Kreis = richtig, Rückmeldung per Sprechblase). Feldnamen `titel/title`, `schritte/steps`, `antworten/answers` bleiben erhalten.
- **Video mit Fragen:** Adresse als Text (Hinweis ohne https), Fragen mit Zeitpunkt (getippt als mm:ss, gespeichert in Sekunden, Unsinn wird markiert und nicht gespeichert), Frage und Antwortenliste.
- **Kapiteltest:** Bestehensgrenze als Zahl; jede Frage als Karte nach dem Bauplan ihres Typs (Auswahl, Richtig/Falsch), mit **Unter-Werk** (`muster-g.ts`): eigene Fokus-Schlüssel (`q1:…`), eigener Zustand, Hinweise nur in der eigenen Karte. Neue Fragen per „＋ Auswahlfrage / Richtig oder falsch / Lückentext“, Löschen mit Toast, Umsortieren per Griff. Übernahme prüft jede Frage rekursiv mit demselben Prüfer.
- Umbau: `teile.ts` (Zeichnen und Normalisieren aller Teile, wiederverwendbar), `antwortenListe` aus Muster A herausgelöst (verschachtelbar), `EintragFeld.zeit`, `UnterAntworten`, `UnterBloeckeTeil`, `vorlage`. Finder gegen echte Kern-Seiten geprüft.

**Abweichungen / offen**
- **Lückentext-Frage im Kapiteltest:** zeigt den Text mit *Sternchen* (die Lücken-Auswahl braucht ein eigenes Werk) und einen Hinweis. Das widerspricht „keine Sternchen außerhalb der Rohfassung“ und sollte im Praxistest bewertet werden.
- Typ einer Kapiteltest-Frage lässt sich nicht wechseln (löschen und neu anlegen).
- **Weiter in der Schublade (Bauschritt 6):** Bildzuordnung, Hotspot, Bilder ordnen, Bild, Galerie (Bild-Werkzeuge), Tabelle, Diagramm; „Typ wechseln“/„Rohfassung“ öffnen die Schublade.
- Ziehen von Begriffen zwischen Kästen (Zuordnen) fehlt weiter.

**Tests:** 10 neue Fälle in `aufgabenwerk-b-d-f.test.ts`; Gesamtlauf 3832 grün, 1 alter fremder Fehler. `tsc`, ESLint (nur Warnungen), Build grün. Bündel 89 KB.

### Schritt 3 – Ein Weg zum Bearbeiten (2026-11-17, Opus, Zweig `proj-114-ein-weg`, nur lokal committet)
**Gebaut**
- **Gliederung, Hinweis der Prüfstelle und neuer Block aus dem Katalog** (auch Schnellauswahl und „+ Darunter“) öffnen Aufgaben mit Bauplan jetzt **in der Seite**. Die Schublade bleibt zu. Enter auf einem gewählten Block macht dasselbe. Typen ohne Bauplan (Tabelle, Diagramm, Bild-Typen), Lehrtext, Themen, Deckblatt und Lernzielkontrolle öffnen weiter die Schublade.
- **Vorgemerkte Öffnung** (`Vormerkung` in `baukasten-editor.tsx`): Die App merkt sich Stelle und Marke. Sie öffnet erst, wenn die Seite für die aktuelle gebaute Fassung „bereit“ gemeldet hat (`bereitFuer === v.html`) und die Stelle in der Seite der Stelle im Entwurf entspricht (`stelleStimmt` mit `v.gebautSchluessel`). Zeigt die Seite den Block schon, öffnet sie sofort, wie ein Klick in der Seite.
- **Auswege, nie ein stummes Nichts:** Der Neubau nach dem Vormerken scheitert (`v.bauFertig` zählt Bauversuche) → Schublade. Die Seite meldet beim Start „Abbruch“ (Block nicht auffindbar) → Schublade (gilt jetzt für jede Aufgabe). Nach 30 s ohne Ergebnis (`VORMERKUNG_MS`) → Schublade.
- **Verworfen (nichts öffnet):** andere Auswahl, Ausprobieren, Mehrfachauswahl, Schreibschutz, Dialog, oder der Block an der Stelle ist weg oder anders (Fingerabdruck beim ersten Blick). Beispiel: Nach Rückgängig steht dort wieder ein alter Block.
- **Zweiter Klick** auf eine schon in der Seite offene Aufgabe ändert nichts. Der Fix aus Commit 3167999 bleibt: Ist die Zeile nur gewählt, öffnet der Klick die Stelle. Bei offener Schublade hebt er die Auswahl auf.
- **Handy:** Ein Klick auf eine Aufgabe in der Gliederung schaltet auf „Vorschau“, damit man die Aufgabe sieht.
- **Layout:** Die Gliederung klappt beim Öffnen und Schließen der Schublade nicht mehr von selbst. Es gilt immer der gemerkte Zustand. Ausnahme: Unter 1280 px weicht sie der offenen Schublade, weil die drei Spalten (18/30/22 rem plus Abstände ≈ 1200 px) sonst seitlich überliefen. Begründung steht im Code. `gliederungTrotzSchublade` ist entfallen.

**Abweichungen**
- Ein „Abbruch“ der Seite öffnet jetzt auch bei einem Klick in der Seite die Schublade (bisher still geschlossen).
- Eine Vormerkung wird auch durch einen Build-Fehler beendet, der schon vor ihr lief. Die Vorschau ist dann ohnehin kaputt, die Schublade ist der sichere Weg.

**Tests:** In `baukasten-editor.test.tsx` gibt es 12 neue Fälle (Block „Ein Weg zum Bearbeiten“). Dazu kommen 3 Layout-Fälle, die 2 alte zum Einklappen ersetzen. 11 bestehende Fälle sind angepasst: Sie erreichen das Formular einer Aufgabe jetzt über den Ausweg „Abbruch“ oder nutzen den Lehrtext. Der Schutz bei Rückgängig ist per Gegenprobe belegt (Test schlägt ohne Fingerabdruck fehl). `tsc` grün; Vitest `src/components/werkzeugkiste` + `src/lib/werkzeugkiste` 1217 grün, 1 alter fremder Fehler (`werkzeugkiste-auszug.test.ts`).

**Offen / nicht geprüft (braucht Browser)**
- Die Zeitgrenze von 30 s ist nicht automatisch getestet.
- Handy: Ob die Seite nach dem Umschalten zur neuen Aufgabe scrollt.
- Das echte Timing mit dem Kern (Speichern → Neubau → „bereit“): Wie lange es bis zum Öffnen dauert.

**Prüfliste für den Nutzer (nach dem Livegang)**
1. **Block einfügen:** Katalog → z. B. Memory. Die Schublade bleibt zu. Nach kurzer Wartezeit („Vorschau wird aktualisiert“) geht die Aufgabe in der Seite auf (blauer Rahmen, „Bearbeiten“). Mit Tabelle oder Diagramm öffnet sofort die Schublade.
2. **Gliederung klicken:** Ein Klick auf eine Aufgabe öffnet sie in der Seite. Ein zweiter Klick auf dieselbe Zeile ändert nichts, das Getippte bleibt. Ein Klick auf Lehrtext oder Thema öffnet die Schublade.
3. **Hinweis klicken:** „Hinweise der Prüfstelle“ aufklappen und einen Hinweis zu einer Aufgabe anklicken. Die Aufgabe geht in der Seite auf.
4. **Rückgängig direkt nach dem Einfügen:** Block einfügen und sofort ⌘/Strg+Z drücken. Weder der alte Block an dieser Stelle noch die Schublade gehen auf.
5. **Schmales Fenster:** Unter 1280 px Breite einen Lehrtext öffnen. Die Gliederung weicht der Schublade und kommt beim Schließen zurück. Ab 1280 px bleibt sie offen, und nichts scrollt seitlich.
6. **Handy:** In der Gliederung eine Aufgabe antippen. Die Ansicht wechselt zu „Vorschau“, und die Aufgabe ist offen.

**Stand nach Livegang (2026-11-17, cf5376f):** Im Browser geprüft wurden Gliederungs-Klick, Einfügen (öffnet nach ca. 15 s Neubau in der Seite) und Rückgängig direkt nach dem Einfügen. Alle drei sind ok. Hinweis-Klick, Handy und schmales Fenster sind nicht geprüft.

### Schritt 4 – Verbesserungsvorschläge in Alltagssprache (2026-11-17, Sonnet, 21481e7)
- „Hinweise der Prüfstelle“ heißt jetzt **„Verbesserungsvorschläge“**. Die Kern-Texte („Kapitel 4 – Kapitel zu groß“) übersetzt die App in ganze Sätze mit Vorschlag (`src/lib/werkzeugkiste-hinweise.ts`, etwa 20 häufige Titel). „Kapitel“ wird zu „Thema“, „gesamte Datei“ zu „Ganzes Material“. Unbekannte Titel bleiben stehen, damit nichts verschluckt wird. Der Originaltext steht im `title`.
- **„Element“ statt „Block“** in Gliederung, Menüs und Meldungen. „+ Block“ heißt jetzt „+ Element“.
- Solange eine neue Aufgabe auf ihre Öffnung wartet, zeigt die Kopfzeile **„Aufgabe wird vorbereitet …“**.
- Abweichung: Die Hinweise werden nicht nach Stelle gruppiert, die Liste bleibt flach.

### Schritt 5 – Katalog gestrafft, „Liste mit Vorschau“ (2026-11-17, Opus)
Vor dem Bau gab es einen klickbaren Prototyp mit zwei Varianten: https://claude.ai/artifact/BMvUHDj8UDu1Sssch8ABYa. Der Nutzer hat **Variante B** gewählt und Familien und Aufbau so freigegeben.
- **Links** steht eine kurze Liste aller Typen nach Gruppen (eine Zeile je Typ, Mini-Skizze, ✓ = wird ausgewertet). **Rechts** stehen große Skizze, Erklärung, „Gut für“ und **„Einfügen“**. Ein Klick wählt aus, Einfügen geschieht per Knopf, Doppelklick oder Enter. Die Pfeiltasten wandern durch die Liste und wählen dabei aus. Am Handy (unter 768 px) klappt die Erklärung unter der Zeile auf.
- **Familien** (`FAMILIEN`, `katalogZeilen` in `werkzeugkiste-katalog.ts`): Aus 35 Typen werden 29 Zeilen. Die Art wählt man im Segment:
  - Bild: Ein Bild, Galerie
  - Auswahlfrage: Eine Frage, Mehrere Fragen
  - Lückentext: Eintippen, Mit Tipp, Wörter ziehen
  - Rechenaufgabe: Eine Rechnung, Viele kurze
  - Lernkarten: Umdrehen, Antwort tippen

  Familien gibt es nur beim Hinzufügen. Beim „Aufgabentyp ändern“ und im Kapiteltest bleiben die Typen einzeln.
- „Aus Material übernehmen“ ist jetzt ein leiser Link neben der Suche. Die Pille „wird ausgewertet“ ist durch ✓ ersetzt, die Fußzeile erklärt sie.
- Tests: `katalog-test-hilfe.ts` (`waehleImKatalog`, `zeigeImKatalog`) für den Zwei-Schritt-Ablauf. `katalog.test.tsx` ist neu gefasst (Familien, Doppelklick/Enter, Art-Wahl). Die übrigen Katalog-Klicks in `baukasten-editor.test.tsx` und `typ-wechsel.test.tsx` laufen über den Helfer. Vitest 1224 grün, 1 alter fremder Fehler.
- Nicht im Browser geprüft: Handy-Ansicht, Fokus nach Doppelklick.

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
3. Texte werden als **reiner Text** behandelt (Steuerzeichen raus, Längenlimit; Tags bleiben als Text stehen und werden vom Kern maskiert bzw. bereinigt, wie bisher in der Schublade), Zahlen und Ja/Nein streng geprüft, Mindestzahlen eingehalten.
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
**Geprüft:** 2026-11-17 (Opus 5.5), Zweig `proj-114-aufgabenwerk` (Stand a1e7644). Nur Code-Prüfung und automatische Läufe. Kein Dev-Server, kein Browser. Die QA wurde wegen des Zeitlimits vorzeitig abgeschlossen. Was nur im Code gelesen und nicht per Test belegt ist, steht unten als **„nicht verifiziert“**.

### Zusammenfassung
- **Freigabe-Empfehlung: Nein** (Status bleibt „In Progress“). Es gibt keinen kritischen Sicherheitsfund. Die Nachrichtenprüfung und `uebernimmAufgabe` grenzen eine manipulierte Seite auf die offene Aufgabe ein. Offen sind aber ein **High-Fund (Datenverlust oder falscher Block nach einer Strukturänderung bei offener Aufgabe, nicht verifiziert)** und mehrere Medium-Funde zum Datenverlust in der Übernahme, davon 3 per Test belegt. Dazu ist die Spec selbst unvollständig (Bauschritt 6, Ziehen bei Zuordnen, Sternchen im Kapiteltest), und der Praxisdurchgang im Browser fehlt.
- **Automatische Läufe:** `npx vitest run` ergibt 3832 grün und 1 roten Test, den bekannten fremden Fehler in `werkzeugkiste-auszug.test.ts`. `tsc --noEmit` ist grün. `eslint src/components/werkzeugkiste/editor` meldet 0 Fehler und 5 Warnungen. `npm run build` ist grün.
- **Neue Belegtests:** `src/components/werkzeugkiste/editor/aufgabenwerk-qa.test.ts` (5 Fälle). Der Sicherheitsfall ist grün. **4 Fälle sind absichtlich rot** und belegen BUG-2, BUG-3, BUG-4 und BUG-6. Vor dem nächsten Commit beheben oder auf `it.fails` stellen, sonst ist der Gesamtlauf rot.

### Akzeptanzkriterien
| # | Kriterium | Ergebnis | Beleg / Bemerkung |
|---|---|---|---|
| 1 | Klick macht die Aufgabe an Ort und Stelle bearbeitbar, die übrige Seite bleibt | Erfüllt (Code) | `vorschau-skript.ts` Klick → `wkAufgabe` → `oeffneAufgabe` (`baukasten-editor.tsx:869`). Für 27 Typen. Bild-Typen, Tabelle und Diagramm öffnen die Schublade (Bauschritt 6). |
| 2 | Klick auf einen Eintrag setzt den Fokus genau dorthin | Teilweise | Finder für 21 Typen. Ohne Finder (öffnen ohne Eintrag): `find_words`, `trainer`, `memory_game`, `crossword`, `freitext`, `calculation_exercise`. Die Zählung gegen echte Kern-Seiten wurde in dieser QA **nicht neu nachgerechnet** (Zeitlimit). Bauschritt 2–5 melden das als geprüft. |
| 3 | Unklarer Eintrag öffnet ohne Eintrag, nie falsch | Erfüllt (Code) | `eintragFuerBlock` (`bauplan.ts:849`) vergleicht die Anzahl, sonst `null`. Unbekannter Typ ergibt `null`. |
| 4 | Fertig / Esc / Klick daneben schließen, Klick auf andere Aufgabe wechselt direkt | Erfüllt (Code) | `eintritt.ts:163`, `vorschau-skript.ts:417–420`. Einschränkung: Siehe BUG-5 (Neubau während einer offenen Aufgabe). |
| 5 | Höchstens eine Aufgabe offen, schließt Lehrtext-Schreiben aus | Erfüllt (Code) | `oeffneAufgabe` prüft `schreibRef`. `startAufgabe` beendet die vorherige Aufgabe. |
| 6 | Nichts davon in Ausprobieren, Download, Link, Regal, Druck | Erfüllt (Code) | Nur bei `modus==="bearbeiten"` und `!lesen`. Das Werk wird nur in die Editor-Vorschau nachgeladen. |
| 7 | Tippen, Hinzufügen usw. sofort, ohne Neubau | Erfüllt (Code) | `pausiert` in `useEditorVorschau`. |
| 8 | Autosave; Tippen in einem Feld ergibt einen Rückgängig-Schritt | Teilweise | Gruppe `aufgabe-{nr}-{gruppe}` (`baukasten-editor.tsx:928`). Gleiche Aktionsgruppen direkt nacheinander werden aber zusammengefasst (BUG-8). |
| 9 | Nach „Fertig“ Neubau, bis dahin kein Flackern | Teilweise | Beim **Wechsel** zu einer anderen Aufgabe gibt es keinen Neubau. Die vorige Aufgabe bleibt bis zum nächsten „Fertig“ in der vereinfachten Ersatz-Ansicht (`eintritt.ts:198`). Das weicht vom Tech Design ab (Low, BUG-11). |
| 10 | Gespeicherte Struktur ändert sich nicht | Teilweise | Leere `feedback`-Felder kommen dazu. Zahl und Text tauschen bei Kopfrechnen. `correct: 1` geht verloren (BUG-2). Zusatzfelder im Kapiteltest wandern (BUG-3). |
| 11 | Löschen sofort, Toast mit „Rückgängig“ ≥ 6 s | Erfüllt (Code) | 8000 ms (`baukasten-editor.tsx:930`). Der Toast bei einer Kategorie nennt die Zahl nicht (bekannt). |
| 12 | Zeilenwerkzeuge bei Hover/Fokus, auf Touch immer | Nicht geprüft | CSS in `design.ts`. Braucht Browser. |
| 13 | Umsortieren per Griff und Alt+↑/↓ | Teilweise | In A, B, C, F und Trainer vorhanden. Im Kapiteltest geht der Fokus nach dem Umsortieren oder Löschen verloren (BUG-9). Begriffe bei Zuordnen lassen sich nicht sortieren oder ziehen (bekannt). |
| 14 | Neuer Eintrag sichtbar und mit Fokus | Erfüllt (Code) | `listen.ts:71`. |
| 15 | Mindestzahlen mit Hinweis | Erfüllt (Code) | `listen.ts:45`. |
| 16 | `⋯`: Typ wechseln, Rohfassung, Duplizieren, Löschen | Teilweise | Typ wechseln und Rohfassung öffnen die Schublade (bewusste Abweichung). |
| 17 | 44 px, Tastatur, Fokus, aria-label, Ansagen | Teilweise / nicht geprüft | Labels und Ansagen sind im Code vorhanden (`eintritt.ts:279`, `:250`). Trefferflächen und sichtbarer Fokus nicht geprüft (Browser). |
| 18 | Muster A | Teilweise | Nur Kreis, keine Kästchen (bewusst). Sonst erfüllt. |
| 19 | Muster B | Erfüllt (Code) | — |
| 20 | Muster C | Erfüllt (Code) | Darstellung unter 400 px nicht geprüft. |
| 21 | Muster D | Nicht erfüllt | Ziehen zwischen Kästen fehlt (bekannt). Fehler beim Umbenennen von Kategorien (BUG-7). |
| 22 | Muster E | Teilweise | Für die 4 Lückentext-Typen im Code vorhanden. Im Kapiteltest Sternchen (bekannt). |
| 23 | Muster F | Erfüllt (Code) | — |
| 24 | Alle 35 Typen an Ort und Stelle, Wächter-Test | Bewusst begrenzt (2026-11-18) | 27 von 35; Bauschritt 6 zurückgestellt, die 7 Bild-/Tabellen-/Diagramm-Typen bleiben in der Schublade. |
| 25 | Tests je Typ für Öffnen, Ändern, Hinzufügen, Umsortieren, Löschen + Rückgängig | Teilweise | Nicht für jeden Typ jeder Fall. Rückgängig nur auf App-Ebene. |
| 26 | Praxisdurchgang mit echter Einheit (Laptop + Handy) | Nicht erfüllt | Fehlt. |

### Funde

#### Critical
Keine.

#### High
- **BUG-1 – Offene Sitzung zeigt nach einer Strukturänderung auf einen anderen Block (nicht verifiziert, aus dem Code abgeleitet).** `baukasten-editor.tsx:878` merkt sich die Sitzung mit festem `ort` (Thema/Blocknummer). Bei `beende` (`:886`) bleibt sie in `sitzungen`, bis die Seite „fertig“ meldet. `beiAufgabe` (`:917–928`) schreibt jede spätere `aufgabeAenderung` auf den Block, der **jetzt** an `ort` steht, sofern der Typ gleich ist.
  - **Ablauf:** Aufgabe k0-e3 (Auswahl) offen, eben getippt, Zeitgeber 600 ms läuft noch. Die Lehrkraft löscht in der Gliederung k0-e3 oder einen Block darüber, oder verschiebt einen Block. Der Effekt `:953` schickt `beende`, die Seite sendet den letzten Stand (`eintritt.ts:244`). Dieser landet auf dem Block, der nachgerückt ist. Ist es ebenfalls eine Auswahlfrage, überschreibt er dessen Frage und Antworten.
  - Ähnlich, ohne Zeitgeber: Rückgängig oder Wiederholen oben, das einen Block vor der offenen Aufgabe einfügt oder entfernt. Der Effekt `:934–946` schickt dann den Stand des **anderen** Blocks in den offenen Editor, und weitere Änderungen gehen an diesen.
  - **Empfehlung:** Die Sitzung an die Block-Identität binden (z. B. den Fingerabdruck aus `gespeichertSchluessel` oder ein Vergleich mit `sit.bekannt` vor dem Schreiben). Bei jeder Strukturänderung außerhalb der Aufgabe mit `vorbei` schließen. Nach `beende` nur noch eine Meldung annehmen, und nur, wenn der Block noch derselbe ist.

#### Medium
- **BUG-2 – „Richtig“ geht verloren, wenn es nicht als `true` gespeichert ist (Test rot).** In `bauplan.ts:1067` und `:919` steht `correct: roh.correct === true`. Der Kern wertet aber jeden wahren Wert (`seite.py:375`, `:1267`). Ein Bestandsblock mit `correct: 1`, `"true"` oder `"ja"` zeigt beim Öffnen keinen gesetzten Kreis (`muster-a.ts:84`) und verliert bei der ersten Änderung irgendwo im Block die richtige Antwort. Betrifft Auswahl, Fallakte, Video und Kapiteltest. **Empfehlung:** In `normalisiere` wie bei `wahrfalsch` auf boolean umrechnen.
- **BUG-3 – Kapiteltest: Zusatzfelder wandern beim Umsortieren oder Löschen zur falschen Frage (Test rot).** `uebernimmFragen` (`bauplan.ts:1024–1025`) nimmt die Grundlage nach **Position** (`alt[i]`) statt nach Herkunft. Nach dem Tauschen trägt Frage 1 die Zusatzfelder (z. B. `quelle`) von Frage 0. Fragen ohne `type` (der Kern nimmt dann Auswahl an) verlieren alle Zusatzfelder, weil `normalisiere` den Typ ergänzt und die Grundlage dann `{type}` ist. **Empfehlung:** Zusatzfelder aus dem Vorschlag übernehmen, wenn es sie in irgendeiner Original-Frage gab (wie `fremdeFelder`), statt nach Position.
- **BUG-4 – Bestandsblöcke über der Höchstzahl lassen sich nicht mehr ändern (Test rot).** Eine Auswahl mit 11 Antworten (Höchstzahl 10) wird bei **jeder** Änderung abgelehnt („Zu viele Antworten.“, Toast nach jeder Tipp-Pause). Getipptes wird nicht gespeichert und ist nach „Fertig“ weg. Dasselbe gilt für jede Höchstlänge (z. B. Kreuzwort-Wort 60 Zeichen) und alle Listen-Höchstzahlen. Der Kern kennt diese Grenzen nicht. **Empfehlung:** Beim Öffnen am Ort warnen und Listen nur „nicht wachsen lassen“. Mindestens sollte das Werk nach einer Ablehnung den gespeicherten Stand zurückbekommen, damit nichts scheinbar gespeichert ist.
- **BUG-5 – Ein Neubau, der schon läuft, schließt die gerade geöffnete Aufgabe (nicht verifiziert).** `bauen()` (`use-editor-zustand.ts:249–276`) prüft `pausiert` nur vor dem Start. Ablauf: „Fertig“ an Aufgabe A, Neubau startet, innerhalb von ca. 1–3 s Klick auf Aufgabe B. Kommt dann die neue Seite an, gilt `beiNeueSeite` (`baukasten-editor.tsx:1390–1397`): B verschwindet ohne Hinweis, und bis zu 600 ms Getipptes gehen verloren. **Empfehlung:** Eine Seite, die eintrifft, während eine Aufgabe oder ein Schreibvorgang offen ist, zurückhalten, bis die Sitzung endet. Oder vorher `flush` anstoßen und die Aufgabe nach dem Laden wieder öffnen.
- **BUG-6 – Zahlengrenzen des Bauplans werden in der Übernahme nicht geprüft (Test rot).** `bauplan.ts:1086` prüft nur 0–100000. Ein Bauplan mit `min`/`max` (Bestehensgrenze 0–100, Runden 1–5, Höhe 2–12) lässt z. B. `pass_percentage: 500` speichern. Der Kern zeigt dann „500 % zum Bestehen“, und Bestehen wird unmöglich. **Empfehlung:** In der Übernahme `teil.min` und `teil.max` erzwingen.
- **BUG-7 – Zuordnen: Beim Umbenennen einer Kategorie auf einen bestehenden Namen wandern deren Begriffe endgültig (nicht verifiziert).** `muster-d.ts:30–33` ordnet nach `indexOf`, also nach dem ersten gleichnamigen Kasten. `benenne` (`:72–79`) nimmt nur Begriffe mit, die gerade dem Kasten zugeordnet sind. Beispiel: „Bahn“ und „Bahnhof“. Löscht man bei „Bahnhof“ rückwärts, landet man kurz bei „Bahn“, und alle Begriffe von „Bahnhof“ gehen in den ersten Kasten über. Beim Weitertippen bleiben sie dort. Dasselbe passiert, wenn zwei Kategorien leer geräumt werden. **Empfehlung:** Begriffe beim Umbenennen nach Kastennummer führen (Zustand je Begriff) statt nach Namen. Oder doppelte Namen beim Tippen nicht übernehmen.

#### Low
- **BUG-8 – Gleiche Aktionen direkt nacheinander bilden einen einzigen Rückgängig-Schritt.** Die Gruppen heißen `loeschen-antwort`, `umsortieren`, `richtig` usw. (`baukasten-editor.tsx:928`). Zusammen mit `GRUPPE_MS` in `use-editor-zustand.ts:165` holt „Rückgängig“ im zweiten Lösch-Toast **beide** gelöschten Einträge zurück. Das ist verständlich, entspricht aber nicht „Rückgängig stellt Eintrag und Position wieder her“. Ebenso: Rückgängig oben, während die Tipp-Pause läuft, verwirft den noch nicht gemeldeten Text (`eintritt.ts:284–286`) und macht zusätzlich den vorigen Schritt rückgängig. **Empfehlung:** Für Aktionen eine laufende Nummer an die Gruppe hängen. Vor Rückgängig oben `flush` anfordern.
- **BUG-9 – Kapiteltest: Fokus nach Löschen und Umsortieren geht ins Leere.** `muster-g.ts:96` setzt den Fokus-Schlüssel `q{i}:frage`, das Feld heißt aber `q{i}:question`. Nach Alt+Pfeil am Griff bleibt der Fokus am alten Platz (`key=${i}`). Das nächste Alt+Pfeil verschiebt dann die **andere** Frage. Dazu gibt `erstesFeldVon` für `unterbloecke` `q0:antwort-0` statt `q0:question` zurück (`teile.ts:49`).
- **BUG-10 – Kleinere Strukturänderungen beim Speichern.** Jede Antwort und jedes Paar bekommt ein leeres `feedback` bzw. ein leeres zweites Feld (`bauplan.ts:898–902`). Kopfrechnen speichert Text „96“ als Zahl 96 und 12.5 als Text „12.5“ (`:954`). Video: Ein als Kommazahl oder Text gespeicherter Zeitpunkt blockiert jede Änderung am Block (`:941`). Zusatzfelder, die Objekte oder Listen sind, gehen in Einträgen verloren (`fremdeFelder`, `:876`). Der Kern liest alle diese Fälle gleich. Es widerspricht nur der Regel „gespeicherte Struktur ändert sich nicht“.
- **BUG-11 – Beim Wechsel A → B bleibt A bis zum nächsten „Fertig“ in der vereinfachten Ersatz-Ansicht** (`eintritt.ts:198–212`, z. B. Gruppen nur als Titelliste). Das Tech Design sah einen Neubau beim Wechsel vor.
- **Hinweis (kein Fehler):** `reinerText` entfernt keine Tags. Das Tech Design (Entscheidung 4, Punkt 3) verspricht „keine Tags“. Getestet ist: HTML landet unverändert im Block. Das ist dasselbe Verhalten wie in der Schublade. Der Kern gibt diese Felder mit `_esc` aus (Frage, Antworten) oder mit `_saeubern` (Erklärung, Rückseite, Fallakte, Schätzrunde u. a., `seite.py:361`, `:559`, `:1222–1319`). Ein neuer Angriffsweg entsteht also nicht. Die Doku sollte das richtigstellen.

### Korrekturrunde nach der QA (2026-11-17, Sonnet)
| Fund | Stand | Was geändert wurde |
|---|---|---|
| BUG-1 High | **behoben** | Jede Sitzung merkt sich einen Fingerabdruck von allem außer ihrer Aufgabe (`restSignatur`). Ändert er sich (Block gelöscht, eingefügt, verschoben, Rückgängig davon), wird die Aufgabe geschlossen und nichts geschrieben; Hinweis-Toast. Gleiches gilt vor „Duplizieren/Löschen“. |
| BUG-2 | **behoben** | `normalisiere` rechnet `correct` wie der Kern (Python-Wahrheit) auf true/false um – für Antworten, Fallakte, Video, Kapiteltest. |
| BUG-3 | **behoben** | Kapiteltest-Zusatzfelder werden nach Namen aus dem Original behalten statt nach Position; Fragen ohne `type` behalten ihre Zusatzfelder. |
| BUG-4 | **behoben** | Höchstzahlen gelten mindestens für den Bestand; Textlängen als harte Grenze 20 000 statt Richtwert. Eine abgelehnte Änderung schickt der Seite den gespeicherten Stand zurück. |
| BUG-5 | **behoben** | Eine fertig gebaute Seite wird verworfen, solange eine Aufgabe/ein Schreibvorgang offen ist; danach baut die Vorschau neu. |
| BUG-6 | **behoben** | `min`/`max` der Zahlenfelder werden erzwungen (ein unveränderter Bestandswert bleibt erlaubt). |
| BUG-7 | **behoben** | Ein Kategoriename, den es schon gibt, wird nicht übernommen (Entwurf im Feld, Hinweis), so fallen keine Begriffe zusammen. |
| BUG-8 | **behoben** | Aktionsgruppen (Löschen, Neu, Umsortieren, Richtig, Verschieben) bekommen eine laufende Nummer: ein Rückgängig-Schritt je Aktion. |
| BUG-9 | **behoben** | Fokus-Schlüssel im Kapiteltest `q{i}:question`. |
| BUG-10 | offen (Low) | Leere `feedback`-Felder, Zahl/Text bei Kopfrechnen, verschachtelte Zusatzfelder. Kern liest alles gleich. |
| BUG-11 | offen (Low) | Beim Wechsel A → B bleibt A bis zum nächsten Neubau in der Ersatz-Ansicht. |
Tests: `aufgabenwerk-qa.test.ts` (alle grün, 4 ehemals rote Fälle + 7 neue), 3 Fälle in `aufgabenwerk-b-d-f.test.ts`. Nicht im Browser geprüft: BUG-1, -5, -7 sind per Einheitentest abgesichert (Fingerabdruck, Entwurfsname), der echte Ablauf nicht.

### Sicherheit (Red Team) – Ergebnis
- `liesWunsch` (`vorschau-nachrichten.ts:194–226`) prüft: Marke nur als Block, Gruppe nach `^[a-z0-9_-]{1,60}$`, Größe ≤ 200 000 Zeichen per `JSON.stringify` (Zyklen und zu tiefe Verschachtelung landen im `catch` und ergeben `null`). Eintrag und Anzahl werden als ganze Zahlen geprüft.
- Die App schreibt nur auf den Block der Sitzung und nur bei gleichem Typ. `uebernimmAufgabe` übernimmt nur Bauplan-Felder. Unbekannte Block-Felder kommen aus dem Original, fremde Eintragsfelder nur, wenn es sie im Original gab und sie einfache Werte sind. Steuerzeichen werden entfernt, Längen begrenzt, `correct` als strenges boolean gelesen. **Belegt im Test „Sicherheit“:** `__proto__` und `constructor` als Schlüssel, ein neues Feld, ein Typwechsel und ein Kapiteltest im Kapiteltest werden abgewiesen bzw. verworfen. Kein Prototype-Pollution. Die Rekursion hat höchstens Tiefe 1, weil `erlaubt` keinen `question_set` enthält.
- Restrisiko: Eine manipulierte Seite kann nur die geöffnete Aufgabe falsch füllen, oder über BUG-1 den Block, der danach an derselben Stelle steht. Das ist kein Rechteproblem (eigener Entwurf, Schreibschutz greift über `z.gesperrt`), aber ein Fehler in der Datenintegrität.

### Nicht geprüft (braucht Browser)
- Gesamter Praxisdurchgang „Basics rund um den LKW“ am Laptop und am Handy (Kriterium 26), Bildschirmtastatur, „Als Lücke“ über der Auswahl auf Touch-Geräten.
- Trefferflächen 44 px, sichtbarer Fokus, Zeilenwerkzeuge bei Hover und Touch, klebende Fußleiste bei 30+ Einträgen, Darstellung unter 400 px, Hell/Dunkel.
- Ansagen im Bildschirmleser, Ziehen am Griff mit Maus und Finger.
- BUG-1, BUG-5 und BUG-7 im echten Ablauf, Klick während eines Neubaus.
- Erneuter Abgleich der Finder-Zählung (`FINDER`/`sichtbar()`) mit frisch gebauten Kern-Seiten für Randfälle (leere oder ungültige Einträge, Aliasnamen). Er wurde in dieser QA wegen des Zeitlimits **nicht wiederholt**.
- Cross-Browser (Chrome, Firefox, Safari).

### Browser-Durchgang Laptop (2026-11-18, Chrome, Production, „Basics rund um den LKW (Kopie)“)
Jeder Typ mit Bauplan im Material über die Gliederung bzw. per Klick in die Seite geöffnet: Begriffe zum Aufklappen, Lückentext, Lückentext mit Hinweis, Wörter markieren, Wörter ziehen (mit Zusatzwörtern), Memory, Zuordnen, Trainer, Offene Frage, Fallakte, Zusammenfassung, Kapiteltest, Selbsteinschätzung, Lernkarten zum Tippen, Video mit Fragen, Auswahlfrage (eine/mehrere richtig), Richtig oder falsch, Reihenfolge, Wörtersuche, Rechenweg, Rechenaufgabe, Schnellfragen. Alle öffnen in der Seite mit der einen Leiste.

| Geprüft | Ergebnis |
|---|---|
| Klick auf einen Eintrag (Aufklappen „Stückgut“) öffnet genau dort mit Fokus | ✅ |
| Tippen → „Wird gespeichert …“, Rückgängig oben stellt den Text her (auch im offenen Werk) | ✅ |
| Begriff hinzufügen (Fokus im neuen Eintrag), × löscht, Toast „Begriff gelöscht · Rückgängig“ holt ihn zurück | ✅ |
| Leiste klebt beim Scrollen oben an der Aufgabe | ✅ |
| Lückentext: Wort markieren → „Als Lücke“, Klick auf die Lücke öffnet das Fenster, „Lücke entfernen“ | ✅ |
| Alt+↓ sortiert eine Antwort um, Fokus wandert mit; Rückgängig stellt die Reihenfolge her | ✅ |
| BUG-1 im echten Ablauf: Element über der offenen Aufgabe per „Nach unten“ verschoben → Aufgabe schließt, nichts landet am falschen Block; nach Rückgängig ist die Aufgabe unversehrt | ✅ |
| „Fertig“ ohne Eingabe: Vorschau baut neu, Gliederung/Vorschläge unverändert | ✅ |

**Funde und Korrektur (gleicher Tag):**
- **Nebenfelder ohne Beschriftung (Medium):** Musterlösung (Offene Frage), Ergebnis (Rechenaufgabe), Ausgangssituation/Urteil (Fallakte) standen fett und nur mit Platzhalter da – gefüllt war nicht mehr erkennbar, wofür das Feld steht. Jetzt: nur das erste Textfeld (Frage/Aufgabe/Titel) ist fett, jedes weitere hat eine sichtbare Beschriftung darüber, normale Schrift und einen Rahmen (`textTeil`, `design.ts`). Die Arbeitsanweisung bleibt wie bisher.
- **Fallakte zeigte rohe `<p>`-Tags (Medium):** Besteht ein Text nur aus einfachen `<p>`-Absätzen, steht er im Feld als Absätze mit Leerzeile; Tippen speichert wieder `<p>`-Absätze (Sonderzeichen maskiert), ohne Eingabe bleibt er unverändert. Texte mit weiteren Tags bleiben wie sie sind (`absaetzeAusHtml`/`absaetzeZuHtml`/`textFeldWert` in `teile.ts`; auch in der Ersatz-Ansicht nach „Fertig“).
- **Rechenweg: Einheit bricht mitten im Wort um (Low):** kurze Felder (≤ 40 Zeichen) haben jetzt eine Mindestbreite von 5,5 em.
- **Block-Leiste nach „Fertig“ senkrecht gestapelt (Low, Ursache in PROJ-118):** siehe Commit `fix(PROJ-118)` – Leiste wird vor dem Messen an den linken Rand gestellt.
- Kein Fehler: Ein Toast blieb stehen, weil die Testautomatik die Maus über dem Toast „vergessen“ hatte (Sonner pausiert bei Hover); mit echter Maus verschwindet er.

Tests: `aufgabenwerk-praxis.test.ts` (7 Fälle). Werkzeugkiste 771/771 grün, `tsc` grün, ESLint 0 Fehler.
**Noch nicht geprüft:** Handy (Tastatur, Leiste unten), Bild-Typen/Tabelle/Diagramm (Bauschritt 6), Safari/Firefox.

### Zweite QA-Runde (2026-11-18, Opus, Production Commit 91e702d)
Geprüft: Restarbeiten aus 91e702d (Dialoge statt Schublade, Ziehen beim Zuordnen, Kapiteltest-Lückentext, BUG-10). Wege: Code-Durchsicht, Probe-Tests in jsdom (danach gelöscht), Browser-Durchgang in Chrome (Production, „Basics rund um den LKW (Kopie)“, nichts dauerhaft verändert). Nicht geprüft: Tablet, Safari/Firefox, Kapiteltest-Lückentext im Browser (im Testmaterial gibt es keinen).

| Geprüft | Ergebnis |
|---|---|
| Zuordnen: Begriff am Griff in einen anderen Kasten ziehen, speichern, Rückgängig | ✅ (Browser) |
| Ziehen außerhalb der Kästen ändert nichts | ✅ (Test) |
| Mehr … → „Quelltext bearbeiten“ öffnet Dialog mit YAML; Abbrechen ändert nichts | ✅ (Browser, Laden ca. 4 s mit Platzhalter) |
| Mehr … → „Aufgabentyp ändern …“ öffnet den Katalog | ✅ (Browser) |
| Typ wählen → Rückfrage „Wechseln?“ → Wechsel | ❌ BUG-12 |
| Kapiteltest-Lückentext zeigt Marken statt Sternchen, gespeichert bleibt Sternchen | ✅ (Test) |
| Kapiteltest: Lückentext-Frage löschen oder umsortieren | ❌ BUG-13 |
| BUG-10: Text-Zeitpunkt im Video blockiert nicht mehr, bleibt Text; ungültiger Wert weiter abgewiesen | ✅ (Test) |

**Funde**
- **BUG-12 (High) – „Aufgabentyp ändern“ tut nichts, sobald eine Rückfrage nötig ist.** Schritte: Auswahlfrage öffnen → Mehr … → Aufgabentyp ändern … → „Richtig oder falsch“ → „Zu diesem Typ wechseln“. Erwartet: Rückfrage „Von … zu … wechseln?“. Tatsächlich: Dialog schließt, nichts passiert. Ursache: `TypWechsel` ruft `onOpenChange(false)` vor `setPlan`; der Aufrufer (`baukasten-editor.tsx` `aufgabeDialog`, ebenso `block-menue.tsx` `wechsel`) blendet die ganze Komponente samt Rückfrage dabei aus. Betroffen sind auch das Block-Menü (⋯ → Aufgabentyp ändern, schon vor 91e702d) – nur der Knopf in der Schublade (`TypWechselKnopf`) funktioniert, und die Schublade öffnet für Aufgaben mit Bauplan nicht mehr. Damit ist der Typwechsel für 27 Typen in der Seite nicht erreichbar. Unveränderte Beispielblöcke (ohne Rückfrage) wechseln weiter.
- **BUG-13 (High) – Kapiteltest: falscher Text nach Löschen/Umsortieren von Lückentext-Fragen.** Schritte (belegt per Probe-Test): Kapiteltest mit zwei Lückentext-Fragen, erste löschen (oder per Alt+↓ tauschen). Karte 1 zeigt danach weiter den Text der gelöschten Frage; tippt man dort, wird ein Mischtext gespeichert (Beispiel: „Erster *Satz* hier.!“ aus „Erster *Text* hier.“ und „Zweiter *Satz* dort.“). Ursache: Karten sind nach Platz (`key=${i}`) verschlüsselt; das Textfeld wird nur neu geschrieben, wenn es in der Karte noch nicht existiert (`muster-g.ts`), und der Zustand des Unter-Werks hängt ebenfalls am Platz. Rückgängig holt den alten Stand zurück; ohne Bemerken bleibt der Fehler aber gespeichert.
- **BUG-14 (Low) – Neue Lückentext-Frage im Kapiteltest: Fokus landet im Feld „Bestehensgrenze“ statt im Text.** `hinzu('fill_blanks')` setzt den alten Schlüssel `q<n>:lueckentext`, das Feld heißt jetzt `lt-text`.
- **BUG-15 (Low) – „Aufgabentyp ändern …“ steht auch bei Typen ohne Wechselziel im Menü** (z. B. Zuordnen). Klick schließt die Aufgabe und meldet nur „keinen anderen Typ“. Besser: Eintrag ausblenden oder ausgegraut mit Grund.
- **BUG-16 (Low) – Block-Leiste bricht wieder um:** Nach dem Schließen einer Auswahlfrage stand „Löschen“ in einer zweiten Zeile (Vorschau ca. 680 px breit). Gehört zu PROJ-118 (Fix afe90d3); nicht weiter eingegrenzt.

**Sicherheit:** Kein Befund. Die neuen Dialoge öffnen nur für die gerade offene Aufgabe (Ort aus der Sitzung, nicht aus der Nachricht); „Quelltext“ geht wie bisher über den Kern; Ziehen setzt nur vorhandene Kategorien, die Übernahme prüft weiter alles; BUG-10 lässt nur Textwerte zu, die schon im gespeicherten Block standen.

**Empfehlung: nicht freigeben.** BUG-12 und BUG-13 zuerst beheben, dann BUG-14/15; BUG-16 bei PROJ-118 prüfen. Status **In Review**.

## Deployment
**2026-11-17:** Bauschritt 1–4 (verkürzt, 24 Typen) per Push `proj-114-aufgabenwerk:main` (Commit d5200f6) nach Production, Build Ready, API ohne Login 401. Keine Migration, kein Kern-Deploy. **Nicht im Browser geprüft**, Rest-Typen (Fallakte, Kapiteltest, Video, Bild-Typen, Tabelle, Diagramm) weiter in der Schublade; Status bleibt In Progress.

**Stand 2026-11-17 (Abend):** Production = Commit `d5e7ba3` (Bauschritt 1–5 + QA-Korrekturen BUG-1 bis BUG-9). Build Ready. Offen: siehe Liste „Offene Aufgaben“ unten.

**Zusatzwörter bei „Wörter ziehen“ (2026-11-17, live):** Rückmeldung des Nutzers: Im Editor ließen sich keine zusätzlichen Begriffe und Auswahlmöglichkeiten anlegen. Neues Feld `distractors` (0–10 Zusatzwörter, stehen im Vorrat, passen in keine Lücke). App: Bauplan `drag_words` mit zweitem Teil (Zeilenliste, Überschrift, nach „Fertig“ als Kärtchen), Schublade (`LueckenFormular`) mit Textliste, Feld bei „Typ wechseln“ als bekannt. Kern: `seite.py` (Zusatzwörter nach den Lücken im Vorrat, kein Ablenker kann „richtig“ sein), `h5p_generator.py` (Parameter `distractors`, nur wenn vorhanden; ob H5P.DragText 1.10 ihn auswertet, ist nicht geprüft), Test `kern_zusatzwoerter_test.py`. Commits App f7f4f24, Kern 58311ad (Kern vor der App deployt). Nicht im Browser geprüft. Bekannt: „Typ wechseln“ öffnet weiter die Schublade und setzt dort einen Platzhaltertext. Fremder Fehlschlag `werkzeugkiste-auszug.test.ts` (Urheber-Untertitel) ist nicht von dieser Änderung.

### Offene Aufgaben
**Entscheidung des Nutzers (2026-11-18):** Bauschritt 6 wird **bewusst zurückgestellt**. Bildzuordnung, Hotspot, Bilder ordnen, Bild, Galerie, Tabelle und Diagramm bleiben in der Schublade (selten genutzt, eigene Bild-Werkzeuge aus PROJ-104–107, hohes Risiko für Datenverlust). Kriterium 24 („alle 35 Typen“) gilt dadurch als bewusst auf 27 von 35 begrenzt. Nur nachziehen, wenn der Praxisbetrieb zeigt, dass die Schublade bei diesen Typen häufig stört. Handy ist im Baukasten nachrangig (gebaut wird nur am PC und Tablet), der Handy-Durchgang entfällt vorerst.

1. ~~Praxisdurchgang im Browser~~ Laptop erledigt 2026-11-18. Handy zurückgestellt (nachrangig). Tablet bei Gelegenheit prüfen.
2. ~~Bauschritt 6~~ zurückgestellt (siehe Entscheidung oben).
3. ~~„Typ wechseln“ und „Rohfassung“ als eigene Dialoge~~ gebaut 2026-11-18 (`baukasten-editor.tsx`: `aufgabeDialog`; Typ wechseln = bestehender `TypWechsel`-Dialog, Quelltext = `Dialog` mit `EditorRohfassung`). Die Aufgabe schließt vorher; die Schublade öffnet dafür nicht mehr. Nicht im Browser geprüft.
4. ~~Ziehen zwischen Kästen (Zuordnen)~~ gebaut: Griff „⠿“ je Begriff, Zeiger-basiert (Maus, Finger, Stift), Ziel-Kasten wird markiert, „Verschieben nach …“ bleibt als Tastatur-Weg (`muster-d.ts`, `data-aw-kat`). ~~Lückentext im Kapiteltest ohne Sternchen~~ gebaut: die Frage nutzt jetzt Muster E in ihrer Karte (`muster-g.ts`: `beobachteKapitelLuecken`, `kapitelLueckenNeuerStand`); gespeichert wird weiter mit Sternchen.
5. ~~BUG-10~~ teilweise behoben (`bauplan.ts`, `uebernimmEintraege`): ein als Text gespeicherter Zeitpunkt (Video) blockiert Änderungen nicht mehr und bleibt Text; Zahlfelder, die im Bestand Text waren (Kopfrechnen), bleiben Text. Leere `feedback`-Felder und Hinweis waren schon vorher behoben. Offen bleibt: verschachtelte Zusatzfelder (Objekte/Listen) in Einträgen gehen weiter verloren; der Kern liest alles gleich. **BUG-11** bewusst nicht geändert: Die Ersatz-Ansicht nach „Fertig“ gilt bis zum nächsten Neubau, der nach jeder Änderung ohnehin kommt; ein sofortiger Neubau beim Wechsel würde das Tempo (PROJ-112) kosten.
6. Zweite QA-Runde (Opus) – jetzt dran, dazu Browser-Prüfung der neuen Dialoge, des Ziehens und des Kapiteltest-Lückentexts (Tests `aufgabenwerk-restarbeiten.test.ts` laufen grün, Werkzeugkiste-Editor 522/522); erst danach Status Deployed.

**2026-11-18 (Production, Commit a0dcd2b, Vercel Ready nach ca. 2,5 Min.; Keine Migration, kein Kern-Deploy):** Korrekturen aus dem Browser-Durchgang live. Live geprüft (Chrome): Fallakte (Ausgangssituation beschriftet, keine `<p>`-Tags), Offene Frage (Musterlösung beschriftet), Block-Leiste nach Esc einzeilig; nichts verändert (Rückgängig blieb aus). Status bleibt **In Progress** (Handy, Bauschritt 6 u. a. offen).

**2026-11-18 (Production, Commit 91e702d, Vercel Ready nach ca. 2 Min.; keine Migration, kein Kern-Deploy; API ohne Login 401):** Typ-wechseln-/Quelltext-Dialoge, Ziehen beim Zuordnen, Kapiteltest-Lückentext ohne Sternchen, BUG-10 teilweise sind live. Nicht im Browser geprüft, keine zweite QA. Status bleibt **In Progress**; als Nächstes Browser-Durchgang (Laptop/Tablet) und Opus-QA.
