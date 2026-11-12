# PROJ-89: Werkzeugkiste – Baukasten-Editor für fertige Materialien

## Status: Planned (nur Idee und Rahmen, Funktionsumfang noch offen)
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Eine Lehrkraft kann ein fertiges Material (zuerst die „Interaktive Seite") nachträglich bearbeiten: Bausteine verschieben, löschen, ergänzen und neue Themen, Tabellen und Grafiken einfügen, ohne die HTML-Datei anzufassen.

## Ausgangslage (Problem)
- Die Interaktive Seite wird nicht von Hand geschrieben. Die KI liefert eine strukturierte Antwort (YAML mit Kapiteln und Aufgaben). Die App speichert sie in `werkzeug_ablaeufe.antwort`. Der Python-Kern (`seite.py` im Repo `David-cloud-1/Werkzeugkiste`, eigenes Vercel-Projekt) baut daraus die HTML.
- Nachträglich ändern lässt sich heute fast nichts: nur Tippfehler ersetzen (`werkzeugkiste-ueberarbeiten.ts`) oder alles neu erzeugen.
- Die Seite direkt als HTML zu bearbeiten ist keine Lösung. Änderungen gingen beim nächsten Erzeugen verloren, das Markup ist unübersichtlich, und freies HTML wäre ein Sicherheitsrisiko, weil Schülerinnen und Schüler die Seiten öffnen.

## Grundgedanke
Bearbeitet wird die **gespeicherte Struktur**, nicht die HTML. Die HTML wird daraus jedes Mal neu gebaut. So bleiben Seite, H5P und Vorschau konsistent.

## Erkenntnisse aus dem Kern (Phase 0, 2026-11-12)
Quelle: Repo `David-cloud-1/Werkzeugkiste` (Vercel-Projekt `werkzeugkiste-kern`), vor allem `seite.py` und `CLAUDE.md`.
- **Die Struktur ist schon ein Baukasten:** `cover` (Deckblatt) → `chapters` (Themen, je `title` und `elements`) → `elements` (Blöcke mit `type`) → `final_chapter` (Lernzielkontrolle mit `question_set` und `summary`).
- **32 Bausteintypen** baut `seite.py` heute (`BAUSTEINE`), darunter `text`, `image`, `accordion`, Auswahl- und Lückenaufgaben, `drag_drop`, `reihenfolge`, `rechenweg`, `fallakte`, `freitext`, `trainer`, `memory_game`, `selbsteinschaetzung`. Ein neuer Typ ist eine Funktion mehr in `BAUSTEINE` (plus `PRUEFBAR`, CSS, Abschnitt in `LAUFZEIT`).
- **Fünf Werkzeuge** bauen die Seite aus **derselben Kapitel-YAML**: Ganzes Skript, Kreative Einheit, Differenzierung, Arbeitsblatt, Lernsituation. Ein Editor für diese YAML deckt alle fünf ab.
- **Tabellen sind kein eigener Block.** Sie stehen heute als HTML mit Inline-CSS in `text`-Blöcken (Vorlagen im Master-Prompt).
- **Bilder** sind `image`-Blöcke mit `path` auf ein beim Einlesen gespeichertes Bild (`images/…`). `seite.py` bettet sie als Base64 ein und verkleinert ab 350 KB. Die Seite darf höchstens 8 MB groß werden.
- **Sicherheit:** `content`-Felder laufen durch `_saeubern()` (entfernt Skripte, Event-Attribute, `javascript:`-URLs). Ein kaputter Block kippt nie die ganze Seite, er wird mit Warnung übersprungen.
- **Feste Zufallswerte:** Manche Bausteine (z. B. `find_words`) sind bewusst reproduzierbar gebaut. Neu-Bauen nach dem Bearbeiten ergibt also dieselben Rätsel.

## Entscheidungen (Nutzer, 2026-11-12)
- **E1 – Format:** Der Editor gilt **zuerst nur für die Interaktive Seite**. H5P bleibt außen vor und kann später folgen.
- **E2 – Werkzeuge:** Alle Werkzeuge, die eine Seite aus der Kapitel-YAML bauen (siehe Erkenntnisse), sind editierbar.
- **E3 – Teilen:** Speichern erzeugt einen **Entwurf**. Was öffentlicher Link und Regal zeigen, ändert sich erst nach **„Veröffentlichen"**.
- **E4 – Grafiken:** Alle drei Wege sind gewünscht: **eigene Bilder hochladen**, **Bilder aus dem Skript** wiederverwenden (auch nicht verwendete) und **einfache Diagramme** aus einer kleinen Tabelle erzeugen.
- **E5 – Neue Inhalte:** **Manuell und per KI.** Blöcke lassen sich leer anlegen und selbst ausfüllen. Für ein neues Thema oder einen Block gibt es einen kleinen Prompt zum Kopieren, die KI-Antwort wird eingefügt (kostenlos wie heute). Bezahlte KI („Direkt erstellen") ist nicht vorgesehen.

## Offene Fragen
Keine grundsätzlichen mehr. Die Details klärt der Requirements-Schritt (siehe unten).

## Noch zu planen: Funktionsumfang des Baukastens
Wird in einem eigenen Planungsschritt festgelegt (Requirements). Bisher nur gesammelte **Kandidaten**, keine Zusage:
- Bausteine verschieben (Drag & Drop), duplizieren, löschen, ein- und ausblenden
- Bausteine bearbeiten (Texte, Antwortmöglichkeiten, Lösungen)
- Neue Bausteine: Text, Tabelle (als eigener Block, heute nur HTML im Text), Bild (Upload / aus dem Skript), Diagramm, Boxen aus dem Skript-Design (Merke, Tipp, Achtung …), die 32 vorhandenen Aufgabentypen
- Neue Kapitel/Themen anlegen, auch per KI (E5)
- Deckblatt und Lernzielkontrolle bearbeiten
- Entwurf speichern und veröffentlichen (E3)
- Kapitel aus anderen Materialien oder dem Regal übernehmen
- Live-Vorschau neben dem Editor
- Änderungsverlauf und Wiederherstellen (PROJ-47)

## Dependencies
- Requires: PROJ-51 (Ablauf, Kern), PROJ-52 (Meine Materialien)
- Berührt: PROJ-53 (Regal), PROJ-67 (öffentlicher Link), PROJ-47 (Änderungsverlauf), PROJ-60 (Konto löschen)

## Grobe Phasen (Vorschlag)
0. **Analyse:** Kern lesen, Schema und Aufgabentypen erfassen. Kein Code. *(erledigt, siehe Erkenntnisse)*
1. **Bestehende Materialien bearbeiten** (verschieben, löschen, Texte ändern, Live-Vorschau, Neu-Bauen, Entwurf/Veröffentlichen).
2. **Neue Blöcke** (Tabelle, Bild-Upload, Diagramm, neue Themen per KI), jeweils mit Schema-Erweiterung im Kern.
3. **Zusammenbauen aus mehreren Materialien** (Regal/andere Materialien).

## Abgrenzung
- Kein freies HTML-Feld. Inhalte laufen weiter durch die bestehende Bereinigung.
- Kein Bearbeiten durch Schülerinnen und Schüler. Sie bearbeiten nur ihre Antworten in der fertigen Seite.
- Keine Änderung an den Regal-Regeln (`regal_darf_sehen`).

## Risiken
- Neue Blöcke erfordern Änderungen im zweiten Projekt (Kern). Die Vorgabe „inhaltsgleich zur alten Werkzeugkiste" aus PROJ-51/54 muss für bearbeitete Materialien bewusst gelockert werden.
- Nicht jeder neue Block lässt sich in H5P abbilden. Nach E1 ist das vorerst kein Problem, muss aber bedacht werden, falls H5P später dazukommt.
- Die Seite darf höchstens 8 MB groß werden (`MAX_SEITE_BYTES`). Viele hochgeladene Bilder stoßen schnell an diese Grenze.
- Bilder zählen gegen die 2-GB-Grenze je Konto. Dazu kommt das 4,5-MB-Limit je Anfrage.
- Bereits veröffentlichte Links dürfen nicht unbemerkt ihren Inhalt ändern (siehe Frage 4).

## Nächste Schritte
1. ~~Offene Fragen klären~~ (erledigt, E1–E5).
2. `/requirements` für den Funktionsumfang.
3. `/architecture`, danach erst Frontend/Backend.
