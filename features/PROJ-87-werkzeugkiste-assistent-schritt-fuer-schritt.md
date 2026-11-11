# PROJ-87: Werkzeugkiste – Assistent „Schritt für Schritt“

## Status: Deployed (Teil 1)
**Created:** 2026-11-11
**Last Updated:** 2026-11-11

## Kontext
Die Werkzeugkiste führt Lehrkräfte durch fünf Schritte (Skript → Einstellungen → Prompt kopieren → Antwort einfügen → Prüfen & Herunterladen, siehe PROJ-51/54). Das ist übersichtlich, setzt aber voraus, dass man weiß, was eine „KI-Antwort“ ist, wohin man den Prompt kopiert und warum die Prüfstelle etwas meldet. Wirkliche Anfänger bleiben an diesen Stellen hängen.

Dieses Feature ergänzt jedes Werkzeug um einen **Assistenten „Schritt für Schritt“**: eine kurze, geführte Hilfe, die bei Bedarf einschaltbar ist und die Lehrkraft durch den Ablauf begleitet. Der Assistent ist **kein Chat und ruft keine KI auf**. Er besteht aus fest geschriebenen, gepflegten Texten und kostet im Betrieb nichts (PROJ-51 E7).

Ein Chat-Assistent mit KI („Frag mich“) ist bewusst **nicht** Teil dieses Features. Er wäre ein späterer Ausbau auf diesem Baustein und hängt an der Kostenfrage von PROJ-64 (pausiert).

### Entscheidungen (Nutzer, 2026-11-11)
- **E1 – Nur auf Knopfdruck:** Der Assistent ist nie dauerhaft sichtbar. Ein Knopf „Hilfe: Schritt für Schritt“ im Seitenkopf schaltet ihn ein. Ohne Klick bleibt die Seite so übersichtlich wie heute.
- **E2 – Einmal anbieten:** Beim allerersten Öffnen eines Werkzeugs erscheint ein kleines Angebot „Neu hier? Ich führe dich durch.“ mit „Ja“ und „Nein, danke“. Die Antwort wird pro Werkzeug gemerkt, das Angebot kommt danach nie wieder (der Hilfe-Knopf bleibt).
- **E3 – Umfang:** Der Assistent führt durch alle fünf Schritte jedes Werkzeugs. Startseite, Meine Materialien und Regal bekommen eine kurze Einführung in einem späteren Feature.
- **E4 – Rollout:** Erst das Muster am Werkzeug „Ganzes Skript“, dann Texte prüfen und mit einer echten Anfänger-Lehrkraft testen, danach die übrigen 11 Werkzeuge.
- **E5 – Kostenlos:** Keine KI-Aufrufe, keine Kosten, keine neuen Dienste.

## Dependencies
- Requires: PROJ-51 (Rahmen & Ablauf „Ganzes Skript“): der Assistent liegt über dem Fünf-Schritte-Ablauf
- Requires: PROJ-45 / PROJ-83 (Tokens, Bedienmuster, Zustände)
- Wird ausgerollt auf: PROJ-54 (die übrigen 11 Werkzeuge)
- Berührt: PROJ-69 / PROJ-71 (Antwort in Teilen einfügen: bekommt eigene Hilfetexte)

## User Stories
- Als **Anfänger-Lehrkraft** möchte ich bei Bedarf Schritt für Schritt erklärt bekommen, was ich tun soll, damit ich nicht raten muss.
- Als **Anfänger-Lehrkraft** möchte ich in jedem Schritt genau eine klare Anweisung und ein Beispiel sehen, damit ich mich nicht durch viel Text lesen muss.
- Als **Anfänger-Lehrkraft** möchte ich wissen, wann ich zum nächsten Schritt weiter kann, damit ich nichts überspringe.
- Als **Anfänger-Lehrkraft** möchte ich bei einer Fehlermeldung der Prüfstelle in einfachen Worten erfahren, was ich jetzt tun soll, damit ich nicht aufgebe.
- Als **geübte Lehrkraft** möchte ich den Assistenten nie sehen müssen, damit er mich nicht stört.
- Als **Lehrkraft am Handy** möchte ich die Hilfe auch auf dem Smartphone nutzen, ohne dass sie das Formular verdeckt.
- Als **Super-Admin** möchte ich die Hilfetexte an einer Stelle pflegen können, damit sie sich nicht in vielen Dateien verstecken.

## Acceptance Criteria

### Einschalten und Ausschalten
- [ ] Jedes Werkzeug mit Assistent zeigt im Seitenkopf rechts einen Knopf **„Hilfe: Schritt für Schritt“** als `variant="outline"` (nie als grüne Hauptaktion, E1). Er ist mindestens 44 px hoch und per Tastatur erreichbar.
- [ ] Ohne Klick ist der Assistent unsichtbar. Die Seite sieht aus wie heute.
- [ ] Ein Klick öffnet den Assistenten. Ein zweiter Klick auf den Knopf, ein Schließen-Symbol („Hilfe schließen“) oder die Esc-Taste schließt ihn. Der Ablauf selbst (Eingaben, Schritt, Entwurf) bleibt dabei unverändert.
- [ ] Der Zustand „Assistent offen / zu“ bleibt beim Wechsel zwischen den Schritten desselben Ablaufs erhalten. Bei einem neuen Ablauf ist er wieder zu (außer die Lehrkraft nimmt das Angebot aus E2 an).

### Erstes Angebot (E2)
- [ ] Beim allerersten Öffnen eines Werkzeugs erscheint oben im Ablauf eine kleine Karte: „Neu hier? Ich führe dich Schritt für Schritt durch.“ mit den Knöpfen **„Ja, bitte“** und **„Nein, danke“**.
- [ ] „Ja, bitte“ öffnet den Assistenten im ersten Schritt. „Nein, danke“ schließt die Karte. In beiden Fällen wird die Antwort **pro Werkzeug** gemerkt, die Karte erscheint nie wieder.
- [ ] Das Angebot ist kein Dialog: Es blockiert nichts, die Lehrkraft kann es ignorieren und direkt loslegen. Wer es ignoriert, bekommt es beim nächsten Besuch nochmals, bis er „Ja“ oder „Nein“ gewählt hat.
- [ ] Im Konto steht kein Schalter, der den Assistenten dauerhaft ausschaltet, weil er nie von selbst aufgeht (E1).

### Aufbau des Assistenten (gemeinsamer Baustein)
- [ ] Auf dem Desktop erscheint der Assistent als **Seitenfeld rechts** neben dem Formular, auf dem Handy als **Schublade von unten**, die höchstens die halbe Bildschirmhöhe einnimmt. Das Formular bleibt bedienbar und sichtbar (auf dem Handy kann die Schublade eingeklappt werden und zeigt dann nur die Titelzeile).
- [ ] Der Assistent zeigt oben eine **Schrittanzeige** („Schritt 2 von 5“) und dazu den Namen des Schritts.
- [ ] Pro Schritt besteht der Inhalt aus **höchstens**:
  1. einer **Überschrift** in Frageform oder Befehlsform („Skript hochladen“),
  2. **einem Satz Anweisung** (höchstens 20 Wörter),
  3. **einem Beispiel** in einer Zeile (kursiv oder in einer Randbox),
  4. **einem Erkennungszeichen** „Fertig, wenn …“ (ein Satz),
  5. **höchstens einem Knopf** („Zeig mir die Stelle“ oder „Weiter“).
- [ ] Pro Schritt gibt es **keinen** Fließtext mit mehr als ca. 40 Wörtern insgesamt. Längere Erklärungen stehen unter einem aufklappbaren „Mehr dazu“, standardmäßig zu.
- [ ] **Keine Fachwörter** ohne Erklärung: „Prompt“ heißt im Assistenten „Auftrag an die KI“ (in Klammern einmal „Prompt“), „KI-Antwort“ steht für die Antwort der Lehrkraft-KI (ChatGPT, Copilot o. Ä.), „Prüfstelle“ heißt „Kontrolle“. Die Begriffe sind im Assistenten und in der Oberfläche gleich benannt.
- [ ] Alle Texte duzen die Lehrkraft, sind in einfachem Deutsch und mit „du“ konsistent mit der restlichen Oberfläche.
- [ ] „Zeig mir die Stelle“ scrollt zum passenden Feld oder Knopf im Formular und hebt ihn **2 Sekunden** mit einem sichtbaren Rahmen (`ring-ws-green`) hervor. Bei „Bewegung reduzieren“ erfolgt der Sprung ohne Animation.
- [ ] Der Assistent hat „Zurück“ und „Weiter“. „Weiter“ springt in die nächste Hilfeseite. Er schaltet den eigentlichen Ablauf **nicht** automatisch weiter. Die Lehrkraft handelt selbst im Formular.

### Mitgehen mit dem Ablauf
- [ ] Wechselt die Lehrkraft im Formular den Schritt (Weiter/Zurück im Ablauf), zeigt der Assistent automatisch die Hilfeseite zu diesem Schritt.
- [ ] Der Assistent erkennt, ob der aktuelle Schritt **erledigt** ist (z. B. Skript eingelesen, Prompt kopiert, Antwort eingefügt, Kontrolle bestanden) und zeigt dann ein grünes Häkchen mit „Erledigt“ und den Hinweis auf den nächsten Schritt. Das Erkennungszeichen aus dem Seitenfeld bleibt sichtbar.
- [ ] Ist der Schritt noch nicht erledigt, zeigt der Assistent die Anweisung und das Erkennungszeichen („Fertig, wenn …“).
- [ ] Beim Wiederöffnen eines gespeicherten Entwurfs (PROJ-52) zeigt der Assistent die Hilfeseite zum aktuellen Schritt, nicht zum ersten.

### Hilfe bei Stolpersteinen
- [ ] Meldet die Kontrolle ein Problem (z. B. Antwort unvollständig, Antwort passt nicht zum Werkzeug, Bilder fehlen), zeigt der Assistent **automatisch** eine kurze Handlungshilfe zu genau diesem Problem: ein Satz, was passiert ist, ein Satz, was jetzt zu tun ist, optional ein Knopf („Nachbesserungs-Auftrag kopieren“).
- [ ] Mindestens diese Fälle haben eigene Texte: Skript konnte nicht gelesen werden · Datei zu groß · Antwort zu lang für eine Eingabe (Teile, PROJ-69/71) · Antwort unvollständig · Antwort passt nicht zum Werkzeug · Kontrolle meldet Fehler · Bilder/Lösungen fehlen.
- [ ] Technische Meldungen werden im Assistenten nie angezeigt. Die Texte stehen in der Sprache der Lehrkraft, nicht in der des Systems (wie `AdminErrorState`).

### Pflege der Texte
- [ ] Alle Hilfetexte stehen **zentral** in einer Datei bzw. Struktur, getrennt vom Oberflächen-Code, damit ein Text ohne Eingriff in Komponenten geändert werden kann.
- [ ] Ein automatischer Test prüft für jede Hilfeseite: Anweisung ≤ 20 Wörter, Gesamttext pro Schritt ≤ 40 Wörter (ohne „Mehr dazu“), ein Erkennungszeichen vorhanden, keine Wörter aus einer **Verbotsliste** (z. B. „Prompt“ außerhalb der einmaligen Klammer, „Token“, „Payload“, „Parser“, „Endpoint“).
- [ ] Für jedes Werkzeug existiert für jeden der fünf Schritte eine Hilfeseite. Ein Test schlägt fehl, wenn ein Werkzeug mit aktivem Assistenten eine Hilfeseite vermisst.

### Barrierefreiheit & Design
- [ ] Seitenfeld bzw. Schublade haben eine Überschrift, `aria-label` und rollen-korrekte Beschriftung (z. B. `complementary`). Der Fokus geht beim Öffnen in den Assistenten und beim Schließen zurück zum Hilfe-Knopf.
- [ ] Der Assistent nutzt ausschließlich `ws-*`-Tokens (keine festen Farbwerte), Kontrast ≥ 4,5 : 1 in beiden Modi.
- [ ] Alle Bedienelemente mindestens 44 × 44 px. Animationen höchstens 200 ms, bei „Bewegung reduzieren“ keine.
- [ ] Ein Bildschirmleser liest die Schrittzahl und den Erledigt-Zustand vor („Schritt 2 von 5, erledigt“).
- [ ] Beim Drucken ist der Assistent nicht sichtbar.

### Rollout (E4)
- [ ] **Teil 1:** Baustein und Hilfetexte für „Ganzes Skript“ (Format H5P und Seite). Danach eine **Textprüfung** (unabhängiges Gegenlesen) und ein **Test mit einer echten Anfänger-Lehrkraft**. Erst nach Freigabe geht es weiter.
- [ ] **Teil 2:** Hilfeseiten für die übrigen 11 Werkzeuge. Pro Werkzeug werden nur die Stellen neu geschrieben, die vom Grundmuster abweichen (Schritt 2 Einstellungen, Schritt 5 Ergebnis, Sonderfälle Video-Fragen/Podcast).
- [ ] Werkzeuge ohne fertige Hilfeseiten zeigen **keinen** Hilfe-Knopf (nicht einen leeren Assistenten).

## Edge Cases
- **Lehrkraft schließt den Assistenten mitten im Schritt:** Eingaben bleiben, beim nächsten Öffnen steht er wieder auf der Seite des aktuellen Schritts.
- **Lehrkraft springt über die Schrittleiste zurück:** Der Assistent folgt und zeigt die Hilfe des gewählten Schritts, auch wenn dieser schon erledigt ist.
- **Das Feld, auf das „Zeig mir die Stelle“ zeigt, ist zugeklappt** (z. B. „Mehr Optionen“): Der Bereich klappt auf, dann wird markiert.
- **Schmale Geräte (Handy hochkant):** Die Schublade verdeckt nie das gerade hervorgehobene Feld. Sie fährt nach „Zeig mir die Stelle“ auf die Titelzeile zurück.
- **Mehrere Tabs/Geräte:** Das gemerkte Angebot gilt pro Konto. Wer es auf dem Laptop beantwortet, bekommt es am Handy nicht nochmals. (Ist das Speichern nicht möglich, ist das Angebot beim nächsten Mal wieder da. Das ist akzeptabel.)
- **Werkzeug mit Sonderfall (Video-Fragen: Transkript statt Skript):** Schritt 1 hat eigene Hilfetexte („Transkript einfügen“).
- **Antwort wird in Teilen eingefügt (PROJ-69/71):** Schritt 4 zeigt zusätzlich „Teil 2 von 3“ im Hilfetext und erklärt in einem Satz, dass die Teile nacheinander eingefügt werden.
- **Hilfetext fehlt zu einem Problemfall:** Der Assistent zeigt die allgemeine Meldung „Das hat nicht geklappt. Versuche es noch einmal oder lade eine andere Datei hoch.“ mit dem zugehörigen Knopf, nie eine leere Karte oder einen technischen Text.
- **Lehrkraft nutzt Tastatur und Bildschirmleser:** Alle Knöpfe sind erreichbar, der Fokus bleibt sinnvoll, der Hinweis „Erledigt“ wird angesagt.

## Technical Requirements
- Performance: Der Assistent lädt keine zusätzlichen Dienste. Hilfetexte sind statisch und werden mit dem Werkzeug geladen.
- Kosten: keine (E5), kein KI-Aufruf.
- Datenschutz: Gespeichert wird nur „Angebot beantwortet: ja/nein“ je Werkzeug und Konto. Keine Inhalte der Lehrkraft.
- Browser Support: wie der Lehrkräfte-Bereich (Chrome, Firefox, Safari, aktuelle Handy-Browser).

## Abgrenzung (nicht Teil dieses Features)
- **Chat-Assistent mit KI** („Frag mich“): späteres Feature, hängt an PROJ-64.
- Einführung für Startseite „Werkzeuge“, „Meine Materialien“ und „Regal des Kollegiums“: eigenes späteres Feature.
- Anleitung für andere Bereiche des Lehrkräfte-Bereichs (Fragen, Nachweise, Lehrerzimmer).
- Videos, Bilder-Anleitungen, Screenshots: bewusst nur Text.
- Mehrsprachigkeit (nur Deutsch).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Stand:** 2026-11-11 · Nutzerentscheidung zur Speicherung: **im Konto** (nicht nur im Browser).

### Was ich im bestehenden Ablauf gefunden habe (und was das für die Spezifikation heißt)
- Der Ablauf ist eine **eigene Vollbild-Seite ohne Seitenleiste**, mit einer schmalen Kopfzeile (Schließen, Titel) und einer mittigen Spalte (ca. 48 rem breit). Es gibt dort keinen „Seitenkopf rechts“. **Der Hilfe-Knopf kommt deshalb in die Kopfzeile des Ablaufs, rechts.** Das ersetzt die Formulierung „Seitenkopf“ aus der Spezifikation, am Verhalten ändert sich nichts.
- Die fünf Schritte sind bei **allen** Werkzeugen derselbe Rahmen. Der Assistent kann sich also **einmal** an diesen Rahmen hängen, statt in jedem der 12 Werkzeuge einzeln eingebaut zu werden. Das macht den Rollout in Teil 2 klein.
- Es gibt aber **sieben Varianten** von Schritten, die eigene Hilfetexte brauchen:
  Skript hochladen · Video + Transkript (nur Video-Fragen) · Einstellungen · Auftrag an die KI (ein Auftrag) · Auftrag in Teilen (langes Skript) · Antwort einfügen und Kontrolle · Fertig.
  Eine Kopie aus dem Regal beginnt bei „Antwort“ und hat keinen Schritt 1–3. Dort zeigt der Assistent von Anfang an die Hilfe zu Schritt 4.
- Der Weg „Direkt erstellen“ (bezahlte KI) ist ausgeblendet. Er bekommt **keine** Hilfetexte, bis PROJ-64 wieder aktiv wird.
- Der Ablauf weiß schon selbst, wie weit er ist (Skript eingelesen, Einstellungen gewählt, Auftrag erzeugt, Antwort geprüft, Ergebnis vorhanden). Daraus lässt sich fast alles für „Erledigt“ ablesen. **Neu** ist nur ein Signal „Auftrag wurde kopiert“, das der Schritt „Auftrag an die KI“ an den Assistenten meldet.

### A) Aufbau (Komponenten-Baum)
```
Ablauf-Rahmen (besteht schon)
+-- Kopfzeile
|   +-- Schließen (besteht)
|   +-- Titel (besteht)
|   +-- NEU: Hilfe-Knopf „Hilfe: Schritt für Schritt“
+-- Mittlere Spalte (besteht)
|   +-- Fortschrittsanzeige (besteht)
|   +-- NEU: Angebots-Karte „Neu hier? Ich führe dich durch.“ (nur beim ersten Öffnen)
|   +-- Überschrift, Inhalt des Schritts, Fußzeile (bestehen)
+-- NEU: Assistent
    +-- Auf großem Bildschirm: Seitenfeld rechts neben der Spalte
    +-- Auf Laptop-Fenster / Tablet / Handy: Schublade (Handy: von unten, halbe Höhe, einklappbar)
    +-- Inhalt
        +-- Schrittanzeige „Schritt 2 von 5 · Einstellungen“
        +-- Überschrift der Hilfeseite
        +-- Eine Anweisung (1 Satz)
        +-- Ein Beispiel (1 Zeile)
        +-- „Fertig, wenn …“ mit Häkchen, sobald erledigt
        +-- „Zeig mir die Stelle“ (markiert das Feld 2 Sekunden)
        +-- „Mehr dazu“ (zugeklappt)
        +-- Zurück / Weiter innerhalb der Hilfe
        +-- Bei Problem: Hilfekarte statt Standardseite (z. B. „Antwort unvollständig“)
```
Die vorhandenen Bausteine (Seitenfeld/Schublade, Fortschritt, Karten, Zustände) werden wiederverwendet. Es werden keine neuen Pakete gebraucht.

### B) Welche Daten es gibt (einfache Sprache)
**1. Hilfetexte (fest geschrieben, keine Datenbank)**
```
Eine zentrale Textsammlung, getrennt vom Oberflächen-Code:
- je Hilfeseite: Überschrift, Anweisung, Beispiel, „Fertig, wenn …“,
  „Mehr dazu“, welches Feld markiert werden soll
- Standardseiten für die sieben Schritt-Varianten
- Abweichungen je Werkzeug nur dort, wo sie wirklich anders sind
  (z. B. Einstellungen bei Klassenarbeit, Ergebnis beim Podcast)
- Handlungshilfen für die Problemfälle (je ein Text)
- Verbotsliste für Fachwörter
```
Die Texte werden zusammen mit der Seite ausgeliefert. Es gibt keine Ladezeit und keine Kosten. Änderungen an den Texten sind normale Code-Änderungen mit Test. Eine Pflege-Oberfläche für Super-Admins gibt es **nicht**. Das war in der Spezifikation als Story genannt, ist aber durch „eine zentrale Datei, gewartet im Projekt“ erfüllt und bleibt offen, falls später eine Oberfläche nötig wird.

**2. „Angebot beantwortet“ (Datenbank, neue kleine Tabelle)**
```
Je Lehrkraft und Werkzeug eine Zeile mit:
- Wer (das Konto)
- Welches Werkzeug
- Antwort: „Ja, bitte“ oder „Nein, danke“
- Wann
Es gibt keine Inhalte der Lehrkraft und nichts Persönliches außer dem Konto.
```
- Nur die Lehrkraft selbst sieht ihre Zeilen. Wird das Konto gelöscht (PROJ-60), verschwinden die Zeilen mit.
- Es gibt **höchstens eine Zeile je Konto und Werkzeug**. Beantwortet jemand das Angebot erneut (z. B. auf einem zweiten Gerät gleichzeitig), gilt die letzte Antwort.

**3. „Assistent offen / zu“ (nur im Moment, kein Speichern)**
Der Zustand lebt, solange der Ablauf offen ist. Bei einem neuen Ablauf ist der Assistent zu, außer die Lehrkraft hat im Angebot „Ja, bitte“ gewählt.

### C) Ablauf im Hintergrund (ohne Code)
- **Beim Öffnen eines Ablaufs:** Die Seite fragt einmalig: „Hat diese Lehrkraft das Angebot für dieses Werkzeug schon beantwortet?“ Nur wenn nein, erscheint die Karte. Solange die Antwort noch lädt oder die Abfrage scheitert, wird **kein** Angebot gezeigt (kein Aufblitzen, kein Fehlerhinweis). Der Hilfe-Knopf funktioniert auch ohne diese Abfrage.
- **Klick auf „Ja“ / „Nein“:** Die Karte verschwindet sofort, die Antwort wird im Hintergrund gespeichert. Scheitert das Speichern, kommt die Karte beim nächsten Mal wieder. Das ist akzeptiert (Spezifikation, Edge Cases).
- **„Erledigt“ erkennen:** Pro Schritt wird aus dem schon vorhandenen Stand des Ablaufs gelesen.
  | Schritt | gilt als erledigt, wenn … |
  |---|---|
  | 1 Skript / Video | die Datei bzw. das Transkript eingelesen ist (Kennzahlen da) |
  | 2 Einstellungen | die Lehrkraft den Schritt verlassen hat (Weg nach 3 ist offen) |
  | 3 Auftrag | der Auftrag erzeugt **und** kopiert wurde (neues Signal, nur in dieser Sitzung); bei Teilen: alle Teile als kopiert markiert |
  | 4 Antwort | die Kontrolle bestanden hat |
  | 5 Fertig | die Datei einmal heruntergeladen wurde |
- **Problemfälle:** Die Kontrolle liefert schon heute strukturierte Meldungen. Der Assistent ordnet sie den sieben Problemhilfen zu. Findet er keine passende, zeigt er die allgemeine Meldung aus der Spezifikation.
- **„Zeig mir die Stelle“:** Wichtige Felder und Knöpfe im Formular bekommen eine feste Kennung. Der Assistent nutzt sie. Ist ein Bereich zugeklappt, klappt er auf. Die Kennungen stehen im Texte-Verzeichnis, nicht im Hilfetext.
- **Berechtigung:** Wie überall in der Werkzeugkiste: nur Rollen des Lehrkräfte-Bereichs. Azubis bekommen weder Seite noch Schnittstelle (403).

### D) Technische Entscheidungen (warum so)
| Entscheidung | Warum |
|---|---|
| **Assistent hängt am gemeinsamen Ablauf-Rahmen, nicht an jedem Werkzeug** | Alle 12 Werkzeuge nutzen denselben Rahmen. So wird der Baustein einmal gebaut und im Rollout nur noch mit Texten gefüllt. |
| **Fest geschriebene Texte, kein KI-Aufruf** | Spezifikation E5. Kostenlos, vorhersehbar, prüfbar. Ein Test kann Länge und Wortwahl erzwingen. |
| **Texte zentral, nicht in den Schritt-Komponenten** | Die Texte lassen sich als Ganzes gegenlesen (auch durch Opus oder eine echte Lehrkraft), ohne Oberflächen-Code zu lesen. |
| **Seitenfeld nur ab großem Bildschirm, sonst Schublade** | Die mittlere Spalte ist schmal (≈ 48 rem). Ein Seitenfeld daneben passt erst ab etwa 1280 px. Auf einem kleinen Laptop-Fenster wäre es eine Zumutung. Dann gilt die Schublade wie auf dem Handy. |
| **Angebot im Konto speichern (neue Tabelle)** | Nutzerentscheidung: gilt auf allen Geräten. Eine kleine Tabelle mit einer Zeile pro Konto und Werkzeug ist ausreichend. Nichts Schwereres (kein Profil-Feld), weil Profilspalten aus Sicherheitsgründen gesperrt sind. |
| **Nur „beantwortet“ speichern, nicht „Assistent war offen“** | Sparsam beim Datenschutz und einfach. Ob der Assistent beim nächsten Mal offen ist, bestimmt der Hilfe-Knopf. |
| **Keine Pflege-Oberfläche für Texte** | Die Texte ändern sich selten und brauchen ohnehin eine Prüfung. Eine Oberfläche wäre mehr Aufwand als Nutzen. Die Story „Super-Admin pflegt Texte“ wird als „zentrale Datei“ erfüllt. |

### E) Drei Fallstricke aus der Projekterfahrung
1. **Neue Lehrkräfte-Schnittstelle:** Eine neue Seite oder API im Lehrkräfte-Bereich braucht Einträge in **zwei** Freigabelisten (`roles.ts`). Sonst blockiert der Proxy. Es gibt Wächter-Tests dafür, sie laufen mit.
2. **Server/Client-Grenze:** Icons und Funktionen dürfen nicht als Prop vom Server an eine Client-Komponente gehen (sonst Produktions-500, Tests merken es nicht). Der Assistent bekommt Icons als fertige Elemente und die Texte als reine Daten.
3. **Migration vor dem Push:** Die neue Tabelle wird vor dem Deploy angelegt, die Probe kommt als anklickbarer Link für den SQL-Editor.

### F) Umsetzungsschritte
**Teil 1 – Baustein + „Ganzes Skript“**
1. `/backend`: neue Tabelle (eine Zeile pro Konto und Werkzeug) + eine kleine Schnittstelle: Antwort lesen, Antwort speichern. Dazu die zwei Freigabelisten.
2. `/frontend`: Hilfe-Knopf, Angebots-Karte, Assistent (Seitenfeld/Schublade), Schrittanzeige, „Zeig mir die Stelle“, Problemhilfen. Kennungen an die Felder und Knöpfe. Signal „Auftrag kopiert“.
3. Texte für „Ganzes Skript“ in allen Varianten + Texttest (Länge, Verbotsliste, Vollständigkeit).
4. `/qa`: Handy, Tastatur, Bildschirmleser, Hell/Dunkel, „Bewegung reduzieren“.
5. **Textprüfung** (unabhängiges Gegenlesen, z. B. Opus) und **Test mit einer echten Anfänger-Lehrkraft**. Erst nach Freigabe weiter zu Teil 2.

**Teil 2 – die übrigen 11 Werkzeuge**
6. Nur die Abweichungen schreiben (Einstellungen in Schritt 2, Ergebnis in Schritt 5, Sonderfälle Video-Fragen und Podcast). Pro Werkzeug laufen derselbe Test und dieselbe Prüfung.

### G) Neue Pakete
Keine. Es werden vorhandene Bausteine (Seitenfeld/Schublade, Karten, Zustände) und das bestehende Test-Werkzeug genutzt.

### H) Offene Punkte für die Umsetzung
- **Breite:** Ab welcher Fensterbreite das Seitenfeld statt der Schublade erscheint, entscheidet das Aussehen. Zielwert ca. 1280 px. Beim Bauen mit der Ablauf-Spalte abstimmen.
- **„Schritt 2 erledigt“** hat kein klares Ereignis (die Lehrkraft verlässt ihn nur mit „Weiter“). Vorschlag: erledigt, sobald Einstellungen gespeichert sind. Das prüft `/frontend` am echten Ablauf.
- **„Fertig“ (Schritt 5) erledigt:** Download-Ereignis ist heute nicht erfasst. Vorschlag: nur Sitzungs-Signal wie bei „Auftrag kopiert“, nicht speichern.

## Implementation Notes – Backend (Teil 1)

**Stand:** 2026-11-11 · `/backend` fertig, `/frontend` offen.

- **Migration:** [20261119_proj87_hilfe_angebot.sql](../supabase/migrations/20261119_proj87_hilfe_angebot.sql) (Rücknahme `_down.sql`). Tabelle `werkzeug_hilfe_angebot`: Primärschlüssel (`owner_id`, `werkzeug`) = höchstens eine Zeile je Konto und Werkzeug, `antwort` nur `ja`/`nein`, `beantwortet_am`. `ON DELETE CASCADE` auf `auth.users` (PROJ-60). RLS: nur eigene Zeilen lesen/anlegen/ändern, nur mit Lehrer-Rolle (`has_teacher_role()`), kein Löschen, kein Zugriff für `anon`.
- **Schnittstelle:** `GET /api/admin/werkzeugkiste/hilfe-angebot?werkzeug=` → `{ werkzeug, beantwortet, antwort }`; `PUT` mit `{ werkzeug, antwort }` überschreibt (Upsert, letzte Antwort gilt). Beide über `requireTeacherOrAdmin`, Werkzeug wird gegen `WERKZEUGE` geprüft, Konto-ID stammt nie aus dem Body, Fehlertexte ohne Technik.
- **Gemeinsame Typen/Schemas:** `src/lib/werkzeugkiste-hilfe-angebot.ts`.
- **Freigabelisten (`roles.ts`):** keine Änderung nötig. Die Route liegt unter `/api/admin/werkzeugkiste`, das beide Listen bereits als Präfix führen (Seite und Schnittstelle).
- **Tests:** `src/app/api/admin/werkzeugkiste/hilfe-angebot.test.ts` (11 Fälle: offen/beantwortet, nur eigene Zeile, 400 bei unbekanntem Werkzeug/Antwort/kaputtem JSON, 500 ohne Technik-Text, 401/403, Upsert-Schlüssel, `owner_id` nicht aus dem Body). `tsc` sauber.
- **Hinweis fürs Frontend:** Beim Laden des Angebots bei Fehler oder Wartezeit keine Karte zeigen (Tech Design C). Speichern im Hintergrund, Fehler nicht anzeigen.
- **Rechte-Nachbesserung:** Die Probe zeigte, dass `authenticated` das Löschrecht behielt (RLS blockte es trotzdem). Behoben in `20261119_proj87_hilfe_angebot_rechte.sql` und in der Hauptmigration.
- **Offen:** Migration muss vor dem Deploy in der Produktionsdatenbank laufen (SQL-Editor).

## Implementation Notes – Frontend (Teil 1, „Ganzes Skript“)

**Stand:** 2026-11-11 · Teil 1 gebaut. Teil 2 (übrige 11 Werkzeuge) wartet auf Textprüfung und Anfänger-Test (E4).

- **Texte zentral:** `src/lib/werkzeugkiste-hilfe-texte.ts` (reine Daten: 7 Standardseiten, `HILFE_ABWEICHUNGEN` je Werkzeug für Teil 2, 8 Problemhilfen, Verbotsliste). Logik in `src/lib/werkzeugkiste-hilfe.ts` (`HILFE_WERKZEUGE = ['skript']`, Seitenwahl, „erledigt“, Problem-Zuordnung). Werkzeuge außerhalb der Liste zeigen **keinen** Hilfe-Knopf.
- **Baustein:** `src/components/werkzeugkiste/ablauf-assistent.tsx` (`useHilfe`, `HilfeKnopf`, `HilfeAngebot`, `HilfePanel`, `zeigeStelle`). Er hängt am gemeinsamen `AblaufRahmen` (neue optionale Eigenschaft `hilfe`), nicht an einzelnen Werkzeugen. Eingebaut in `ablauf-seite.tsx` (Schritte 1–5) und `ablauf-neu.tsx` (Skript hochladen, dort entsteht der Ablauf).
- **Abweichung von der Spezifikation:** Der Hilfe-Knopf sitzt in der Kopfzeile des Ablaufs (kein Seitenkopf vorhanden). **Überarbeitet nach dem ersten Test (2026-11-11):** Die erste Fassung legte den Assistenten als halbhohe Schublade über das Formular und verdeckte den „Weiter“-Knopf. Jetzt gilt: ab **1280 px** ein Seitenfeld rechts, das die Formularspalte nach links schiebt; darunter (Handy, Tablet) eine **Karte im Seitenfluss** direkt unter dem Fortschritt, einklappbar. Der Assistent liegt nie über dem Formular. Das bewusst abgewichene „Schublade von unten“ ist damit ersetzt.
- **Verwechslung „Weiter“:** Die Blätter-Knöpfe in der Hilfe heißen „Hilfe zu Schritt N“. Ist der Schritt erledigt, bietet der Assistent einen grünen Knopf **„Weiter zu Schritt N“**, der den Hauptknopf des Formulars drückt (die Lehrkraft löst es selbst aus; ist der Knopf gerade nicht drückbar, wird die Fußzeile markiert). Das geht über die Spezifikation hinaus („schaltet nicht automatisch weiter“) und ist Nutzerwunsch aus dem ersten Test.
- **Aufgeräumt:** Beispiel als leise Zeile statt Kasten, „Erledigt“ als kleines Häkchen, „Zeig mir die Stelle“ nur solange der Schritt offen ist.
- **Mitgehen:** Die Hilfeseite folgt dem Schritt des Formulars. Zurück/Weiter blättert nur in der Hilfe und springt beim nächsten Schrittwechsel zurück. Ein neues Signal „Auftrag kopiert“ (`KopierKnopf.beiKopiert`) und „heruntergeladen“ (`SchrittFertig.beimHerunterladen`) gilt nur in der Sitzung.
- **„Erledigt“:** 1 = Skript eingelesen · 2 = Auftrag liegt vor (Einstellungen gespeichert) · 3 = Auftrag kopiert bzw. alle Teile haben Antwort · 4 = Kontrolle lesbar, ohne Fehler · 5 = Download gestartet.
- **Problemhilfen:** werden automatisch aus Kontrolle, Hochladen und Aktionsfehlern abgeleitet (abgeschnitten, nicht lesbar, Bilder/Lösungen fehlen, Datei zu groß, Lesefehler, „zu lang“, sonst allgemein). Die Zuordnung „passt nicht zum Werkzeug“ und „zu lang“ beruht auf Stichwörtern in der Meldung und ist Näherung.
- **Angebot:** `useHilfe` fragt `GET /hilfe-angebot` einmal; bei Fehler oder Wartezeit erscheint nichts. „Ja, bitte“ öffnet den Assistenten (auch auf der Folgeseite nach dem Upload, über `sessionStorage`, einmalig), speichert im Hintergrund per `PUT`.
- **Markierung:** `data-hilfe`-Kennungen an Datei, Abschnittsauswahl, Einstellungen, Kopieren, Teile, Antwortfeld, Kontrolle, Herunterladen und Fußzeile (`weiter`). 2 Sekunden `ring-ws-green`, bei „Bewegung reduzieren“ ohne weiches Scrollen.
- **Barrierefreiheit/Design:** `aside` mit Label, Fokus beim Öffnen in den Assistenten und beim Schließen zurück zum Knopf (`#wk-hilfe-knopf`), Esc schließt (nicht über offenen Dialogen), Schrittzahl und „erledigt“ in einem `role="status"`, nur `ws-*`-Tokens, 44-px-Bedienelemente, `print:hidden`.
- **Tests:** `werkzeugkiste-hilfe.test.ts` (Textregeln: Anweisung ≤ 20 und Seite ≤ 40 Wörter, „Fertig, wenn …“, Verbotsliste, „Prompt“ nur einmal in Klammern, duzen, Vollständigkeit 7 Varianten × Werkzeug, Problemzuordnung, „erledigt“), `ablauf-assistent.test.tsx` (Knopf, Angebot, Hook, Panel, Fokus, Esc, Markierung 2 s, Rahmen), `ablauf-assistent-seite.test.tsx` (echter Ablauf: Knopf, Angebot ja/nein/Fehler, Mitgehen, Teile, Problemhilfe, Kopie aus dem Regal, Werkzeug ohne Hilfe). Gesamtlauf 2906 Tests grün, `tsc` und `eslint` sauber, `npm run build` ok.
- **Nicht umgesetzt / bewusst offen:**
  - „Zeig mir die Stelle“ klappt zugeklappte Bereiche („Mehr Optionen“) nicht auf: Kein Hilfeziel liegt in einem zugeklappten Bereich.
  - Die Oberfläche heißt weiter „Prompt kopieren / Prompt erstellen“; der Assistent sagt „Auftrag an die KI (Prompt)“ und nennt Knopfnamen in Anführungszeichen. Eine Umbenennung der Oberfläche steht aus.
  - Video-Variante hat Texte, ist aber erst mit Teil 2 aktiv (`youtube` steht nicht in `HILFE_WERKZEUGE`).
  - Keine Pflege-Oberfläche für Texte (siehe Tech Design D).

## QA Test Results

**Stand:** 2026-11-11 · statische Prüfung durch den Entwickler (kein Dev-Server, kein Browser auf diesem Rechner; siehe Projektregel).

| Bereich | Ergebnis |
|---|---|
| Acceptance Criteria Einschalten/Ausschalten, Angebot, Aufbau, Mitgehen, Problemhilfen, Pflege der Texte | per Test belegt (siehe oben) |
| Barrierefreiheit (Rolle, Fokus, Esc, Statusansage) | per Test belegt; Screenreader-Lauf **nicht** gemacht |
| Kontraste | nur `ws-*`-Tokens, getönte Flächen ≤ /15; kein neuer Token |
| Sicherheit | Schnittstelle nur für Lehrer-Rollen, eigene Zeile per RLS und `owner_id`, Datenbankprobe bestanden (Fremdzugriff, Azubi, Löschen, ungültige Antwort) |
| Handy, Hell/Dunkel, „Bewegung reduzieren“, Seitenfeld ab 1280 px | **nicht im Browser geprüft**, bitte einmal durchklicken |
| Textprüfung (unabhängiges Gegenlesen) und Test mit einer Anfänger-Lehrkraft | **offen** und Voraussetzung für Teil 2 |

Keine kritischen oder hohen Fehler bekannt.



## Deployment
**2026-11-11 · Teil 1 (Werkzeug „Ganzes Skript“) live** · Commit `01646df`, Vercel-Projekt `spedilern`, Production „Ready“.

- Reihenfolge: Migration `20261119_proj87_hilfe_angebot.sql` und `_rechte.sql` zuerst im SQL-Editor, Probe [proj87_hilfe_angebot_probe.sql](../supabase/tests/proj87_hilfe_angebot_probe.sql) bestanden (T1–T6 wie erwartet), danach Push auf `main`.
- Prüfung nach dem Deploy: `GET` und `PUT /api/admin/werkzeugkiste/hilfe-angebot` ohne Login → 401, `/admin/werkzeugkiste/neu` leitet zur Anmeldung um (307), keine Fehler in den Produktions-Logs (15 Minuten).
- **Noch offen:** einmal eingeloggt durchklicken (Handy, Hell/Dunkel, Seitenfeld ab 1280 px), Textprüfung und Test mit einer Anfänger-Lehrkraft. Erst danach Teil 2 (übrige 11 Werkzeuge).
