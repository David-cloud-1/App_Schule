# PROJ-114: Baukasten – Aufgaben an Ort und Stelle bearbeiten

## Status: Planned
**Created:** 2026-11-17
**Last Updated:** 2026-11-17 (Richtung nach Prototyp v2 geändert: keine Schublade, Bearbeiten in der Seite)

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

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
