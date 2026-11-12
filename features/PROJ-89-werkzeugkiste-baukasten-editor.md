# PROJ-89: Werkzeugkiste – Baukasten-Editor für fertige Materialien

## Status: Planned (nur Idee und Rahmen, Funktionsumfang noch offen)
**Created:** 2026-11-12
**Last Updated:** 2026-11-12

## Idee in einem Satz
Eine Lehrkraft kann ein fertiges Material (zuerst die „Interaktive Seite") nachträglich bearbeiten: Bausteine verschieben, löschen, ergänzen und neue Themen, Tabellen und Grafiken einfügen, ohne die HTML-Datei anzufassen.

## Ausgangslage (Problem)
- Die Interaktive Seite wird nicht von Hand geschrieben. Die KI liefert eine strukturierte Antwort (YAML mit Kapiteln und Aufgaben). Die App speichert sie in `werkzeug_ablaeufe.antwort`. Der Python-Kern (Modul `seite`, eigenes Vercel-Projekt) baut daraus die HTML.
- Nachträglich ändern lässt sich heute fast nichts: nur Tippfehler ersetzen (`werkzeugkiste-ueberarbeiten.ts`) oder alles neu erzeugen.
- Die Seite direkt als HTML zu bearbeiten ist keine Lösung. Änderungen gingen beim nächsten Erzeugen verloren, das Markup ist unübersichtlich, und freies HTML wäre ein Sicherheitsrisiko, weil Schülerinnen und Schüler die Seiten öffnen.

## Grundgedanke
Bearbeitet wird die **gespeicherte Struktur**, nicht die HTML. Die HTML wird daraus jedes Mal neu gebaut. So bleiben Seite, H5P und Vorschau konsistent.

## Entscheidungen
Noch keine. Siehe „Offene Fragen".

## Offene Fragen (vor der Detailplanung zu klären)
1. **Python-Kern:** Wo liegt der Quellcode (laut PROJ-51 `~/Schule/Werkzeugkiste`)? Wir brauchen das Schema der Antwort und die vorhandenen Aufgabentypen.
2. **Ausgabeformate:** Nur Interaktive Seite, oder auch H5P für Moodle?
3. **Welche Werkzeuge** werden zuerst editierbar? Vorschlag: „Ganzes Skript" und „Arbeitsblatt".
4. **Geteilte Links und Regal:** Aktualisiert eine Änderung sie sofort, oder gibt es eine neue Version, die bewusst veröffentlicht wird?
5. **Grafiken:** Eigene Uploads, Bilder aus dem Skript wiederverwenden oder erzeugte Diagramme?
6. **Neue Inhalte:** Nur manuell schreiben, oder auch „Baustein per KI erzeugen" über den kopierten Prompt (kostenfrei wie heute)?

## Noch zu planen: Funktionsumfang des Baukastens
Wird in einem eigenen Planungsschritt festgelegt (Requirements). Bisher nur gesammelte **Kandidaten**, keine Zusage:
- Bausteine verschieben (Drag & Drop), duplizieren, löschen, ein- und ausblenden
- Bausteine bearbeiten (Texte, Antwortmöglichkeiten, Lösungen)
- Neue Bausteine: Text, Tabelle, Bild/Grafik, Merkkasten, vorhandene Aufgabentypen
- Neue Kapitel/Themen anlegen, auch per KI
- Kapitel aus anderen Materialien oder dem Regal übernehmen
- Live-Vorschau neben dem Editor
- Änderungsverlauf und Wiederherstellen (PROJ-47)

## Dependencies
- Requires: PROJ-51 (Ablauf, Kern), PROJ-52 (Meine Materialien)
- Berührt: PROJ-53 (Regal), PROJ-67 (öffentlicher Link), PROJ-47 (Änderungsverlauf), PROJ-60 (Konto löschen)

## Grobe Phasen (Vorschlag)
0. **Analyse:** Kern lesen, Schema und Aufgabentypen erfassen. Kein Code.
1. **Bestehende Materialien bearbeiten** (verschieben, löschen, Texte ändern, Live-Vorschau, Neu-Bauen).
2. **Neue Blöcke** (Tabelle, Bild, neue Themen), jeweils mit Schema-Erweiterung im Kern.
3. **Zusammenbauen aus mehreren Materialien** (Regal/andere Materialien).

## Abgrenzung
- Kein freies HTML-Feld. Inhalte laufen weiter durch die bestehende Bereinigung.
- Kein Bearbeiten durch Schülerinnen und Schüler. Sie bearbeiten nur ihre Antworten in der fertigen Seite.
- Keine Änderung an den Regal-Regeln (`regal_darf_sehen`).

## Risiken
- Neue Blöcke erfordern Änderungen im zweiten Projekt (Kern). Die Vorgabe „inhaltsgleich zur alten Werkzeugkiste" aus PROJ-51/54 muss für bearbeitete Materialien bewusst gelockert werden.
- Nicht jeder neue Block lässt sich in H5P abbilden.
- Bilder zählen gegen die 2-GB-Grenze je Konto. Dazu kommt das 4,5-MB-Limit je Anfrage.
- Bereits veröffentlichte Links dürfen nicht unbemerkt ihren Inhalt ändern (siehe Frage 4).

## Nächste Schritte
1. Offene Fragen 1–6 klären.
2. `/requirements` für den Funktionsumfang.
3. `/architecture`, danach erst Frontend/Backend.
