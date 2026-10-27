# PROJ-46: Leistungsnachweise für Lehrkräfte ohne Fachbereich

## Status: Deployed
**Created:** 2026-10-26
**Last Updated:** 2026-10-27 (Deployed)

## Kontext
Teil 3 der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Heute können nur Bereichs-Admins und der Super-Admin Leistungsnachweise anlegen. Jeder Nachweis gehört dem Fachbereich des Admins, und alle Admins dieses Bereichs sehen ihn. Künftig sollen auch Lehrkräfte ohne Fachbereich Leistungsnachweise erstellen und durchführen, mit allen bestehenden Funktionen (PROJ-21, 27, 28, 30, 38, 39).

### Entscheidungen (Nutzer, 2026-10-26)
- **E1 – Zielbereich pro Nachweis:** Beim Anlegen wählt die Lehrkraft, für welchen Fachbereich der Nachweis ist (z. B. Spedition oder Tourismus). Sie nutzt den Fragenpool dieses Bereichs plus eigene importierte Fragen. Beitreten können nur Azubis dieses Bereichs, so wie heute.
- **E2 – Nur Ersteller und Super-Admin:** Nachweise und Noten einer Lehrkraft sieht nur sie selbst und der Super-Admin. Bereichs-Admins sehen sie nicht, auch nicht im eigenen Bereich.
- **E3 – Bereichs-Admins bleiben wie bisher:** Bereichs-Admins sehen weiterhin die Nachweise der anderen Bereichs-Admins ihres Bereichs (heutiges Verhalten). Nachweise von Lehrkräften gehören nicht dazu.
- **E4 – Bereichs-Admins dürfen auch fremde Bereiche:** Ein Bereichs-Admin kann wie jede Lehrkraft einen Nachweis für einen anderen Bereich anlegen. Dieser ist dann nur für ihn und den Super-Admin sichtbar.
- **E5 – Rolle entzogen:** Nachweise und Noten bleiben erhalten und sind danach nur noch für den Super-Admin sichtbar (siehe PROJ-44, E6).
- **E6 – Nachweis-Fragen bleiben privat:** Fragen, die eine Lehrkraft für einen Leistungsnachweis importiert, sind nur für sie selbst (und den Super-Admin) da. Sie kommen nie automatisch oder per Freigabe-Knopf in den Fragenpool oder in die Lern-App. Wer eine Frage im Pool haben will, lädt sie bewusst über die Fragen-Wege für den Pool hoch (Kopier-Prompt / Bulk-Import, für Lehrkräfte mit Fach-Zuständigkeit ab PROJ-48). Das ist ein eigener, bewusster Schritt mit der dortigen Prüfung.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle & Freischaltung) – Rolle „Lehrkraft“
- Requires: PROJ-21 (Benotete Leistungsnachweise), PROJ-27 (Fragen-Zusammenstellung), PROJ-28 (Druck & Klassenauswertung), PROJ-30 (Fokus-Verlust-Protokoll), PROJ-38 (Import per Kopier-Prompt), PROJ-39 (Kategorisierung & Filter) – deren Funktionen werden für Lehrkräfte freigegeben, nicht neu gebaut
- Requires: PROJ-23 (Fachbereichs-Zuordnung für Azubis) – bestimmt, wer beitreten darf
- Empfohlen vorher: PROJ-45 (Arbeitsbereich), nicht zwingend

## User Stories
- Als **Lehrkraft ohne Fachbereich** möchte ich einen benoteten Leistungsnachweis für meine Klasse anlegen, damit ich die App für Klassenarbeiten nutzen kann, ohne einen Fachbereich verwalten zu müssen.
- Als **Lehrkraft** möchte ich beim Anlegen auswählen, für welchen Fachbereich der Nachweis ist, damit ich die passenden Fragen bekomme und nur die richtigen Azubis beitreten können.
- Als **Lehrkraft** möchte ich Fragen aus dem Pool des Bereichs auswählen und eigene Fragen importieren, damit ich den Nachweis genau auf meinen Unterricht zuschneide.
- Als **Lehrkraft** möchte ich Code und QR zeigen, Ergebnisse freigeben, Noten exportieren, drucken und die Klassenauswertung sehen, also alles, was Bereichs-Admins heute können.
- Als **Lehrkraft** möchte ich, dass nur ich meine Nachweise und die Noten meiner Klasse sehe, damit sensible Daten nicht bei Kollegen landen.
- Als **Bereichs-Admin** möchte ich auch für einen anderen Bereich einen Nachweis anlegen können, damit ich Klassen aus beiden Bildungsgängen bewerten kann.
- Als **Super-Admin** möchte ich alle Nachweise der Schule sehen und nach Ersteller filtern, damit ich bei Problemen helfen und verwaiste Nachweise aufräumen kann.

## Acceptance Criteria

### Anlegen
- [ ] Lehrkräfte sehen im Lehrkräfte-Bereich den Eintrag „Leistungsnachweise“ und die Aktion „Neuer Leistungsnachweis“.
- [ ] Der Anlegen-Dialog fragt als ersten Schritt den **Zielbereich** ab (alle aktiven Fachbereiche). Bei Bereichs-Admins ist der eigene Bereich vorausgewählt. Bei Lehrkräften ohne Fachbereich ist nichts vorausgewählt, außer es gibt nur einen aktiven Bereich.
- [ ] Danach läuft der bestehende Ablauf aus PROJ-27 (Teil wählen, Fragen zusammenstellen, Titel, Zeitfenster, Dauer, Notenschlüssel, Kategorie) unverändert, bezogen auf den Zielbereich.
- [ ] Die Fragenauswahl zeigt die aktiven Multiple-Choice-Fragen des Zielbereichs und die eigenen importierten Fragen der Lehrkraft.
- [ ] Lehrkräfte können Fragen aus dem Bereichs-Pool **auswählen**, aber nicht bearbeiten, deaktivieren oder löschen.
- [ ] Import per Datei (PROJ-27) und per Kopier-Prompt (PROJ-38) steht Lehrkräften zur Verfügung. Importierte Fragen gehören der importierenden Person und dem Zielbereich. Sie sind dauerhaft **privat** (E6): Sie erscheinen nicht in der Lern-App, nicht in der Fragenauswahl anderer Lehrkräfte und nicht in der Fragenverwaltung der Bereichs-Admins.
- [ ] Die Lehrkraft kann ihre privaten Fragen bearbeiten und löschen, solange kein offener Nachweis sie verwendet, und sie in späteren eigenen Nachweisen wiederverwenden.
- [ ] Es gibt für Lehrkräfte keine Aktion, private Nachweis-Fragen in den Übungsbetrieb freizugeben. Die bestehende Aktion „Für Übung freigeben“ aus PROJ-38 bleibt Bereichs-Admins und dem Super-Admin für Fragen ihres Bereichs vorbehalten.
- [ ] Der Zielbereich steht in der Liste und auf der Detailseite jedes Nachweises.

### Durchführen & Auswerten
- [ ] Alle Funktionen aus PROJ-21, 28, 30 und 39 stehen für eigene Nachweise zur Verfügung: Öffnen und Schließen, Code und QR, Ergebnisse freigeben, Notenliste, Export, Einzel- und Klassendruck, Klassenauswertung, Fokus-Protokoll, Kategorien und Filter.
- [ ] Azubis treten wie heute per Code oder Link bei. Nur Azubis des Zielbereichs können beitreten, andere sehen die bestehende Meldung „Dieser Code gehört zu einem anderen Fachbereich.“
- [ ] Für Azubis ist kein Unterschied erkennbar, ob ein Nachweis von einer Lehrkraft oder einem Bereichs-Admin stammt.

### Sichtbarkeit (E2–E4)
- [ ] Eine Lehrkraft sieht in der Liste nur ihre eigenen Nachweise.
- [ ] Ein Bereichs-Admin sieht: alle Nachweise anderer Bereichs-Admins seines Bereichs, die für seinen Bereich angelegt wurden (wie heute), dazu seine eigenen Nachweise für fremde Bereiche. Nachweise von Lehrkräften sieht er nicht.
- [ ] Der Super-Admin sieht alle Nachweise aller Bereiche. Die Liste hat für ihn eine Spalte und einen Filter „Erstellt von“ (inklusive „Ehemalige / ohne Rolle“).
- [ ] Ein direkter Aufruf (URL, API, Export, Druck, Teilnehmer-Details) eines Nachweises, den die Person nicht sehen darf, liefert 404 (nicht 403), wie in PROJ-24.
- [ ] Teilnehmer-Namen, Noten und Fokus-Protokolle sind nur für Personen sichtbar, die den Nachweis sehen dürfen. Das ist auf Datenbankebene (RLS) und im Server-Code abgesichert.
- [ ] Lehrkräfte bekommen durch einen Nachweis keinen Zugriff auf Profile von Azubis außerhalb der Teilnehmerliste ihrer eigenen Nachweise.

### Rolle entzogen (E5)
- [ ] Verliert eine Lehrkraft ihre Rolle, bleiben ihre Nachweise, Noten und importierten Fragen unverändert erhalten. Ihre privaten Fragen sind danach nur noch für den Super-Admin sichtbar.
- [ ] Ein noch geöffneter Nachweis läuft weiter: Azubis können bis zum Ende des Zeitfensters beitreten und abgeben. Die Ergebnisse sieht nur der Super-Admin.
- [ ] Der Super-Admin kann solche Nachweise schließen, exportieren oder löschen.

### Bestehende Nachweise
- [ ] Alle bestehenden Nachweise bleiben für die heutigen Bereichs-Admins genauso sichtbar wie vorher (Regression).

## Edge Cases
- **Zielbereich im Entwurf ändern:** Die Lehrkraft wählt nachträglich einen anderen Zielbereich. → Nur im Entwurf erlaubt. Ausgewählte Fragen aus dem alten Bereichs-Pool werden nach einem Hinweis entfernt, eigene importierte Fragen bleiben. Nach dem Öffnen ist der Zielbereich fest.
- **Zielbereich wird deaktiviert:** Ein Fachbereich wird abgeschaltet. → Neue Nachweise dafür sind nicht mehr möglich. Bestehende bleiben sichtbar und auswertbar.
- **Frage wird nach dem Öffnen im Pool geändert oder deaktiviert:** Der bestehende Snapshot beim Öffnen (PROJ-21) schützt den Nachweis. Es ändert sich nichts.
- **Bereichs-Admin wird zur Lehrkraft herabgestuft:** Seine früheren Nachweise für den eigenen Bereich bleiben im Bereich, also sichtbar für die übrigen Bereichs-Admins. Er selbst sieht weiter alle Nachweise, die er erstellt hat.
- **Lehrkraft wird zum Bereichs-Admin hochgestuft:** Ihre bisherigen Nachweise bleiben nur für sie und den Super-Admin sichtbar. Sie werden nicht nachträglich für den Bereich geöffnet.
- **Lehrkraft will eine gute Nachweis-Frage für alle zugänglich machen:** Ist sie für das Fach zuständig (PROJ-48), lädt sie die Frage selbst über Kopier-Prompt oder Bulk-Import hoch. Sonst bittet sie eine zuständige Person darum. Die private Nachweis-Frage bleibt davon unberührt.
- **Zwei Lehrkräfte betreuen dieselbe Klasse:** Jede sieht nur ihre eigenen Nachweise. Gemeinsames Arbeiten kommt mit einem späteren Teilen-Feature. Bis dahin hilft der Export.
- **Azubi ohne Fachbereich oder aus einem anderen Bereich nutzt den Code** → bestehende Ablehnung, kein Datenleck über die Existenz des Nachweises hinaus.
- **Konto der Lehrkraft gelöscht:** Die Nachweise bleiben, „Erstellt von“ zeigt „Gelöschtes Konto“. Nur der Super-Admin sieht sie.
- **Super-Admin legt selbst einen Nachweis an:** Er wählt den Zielbereich wie alle (vorausgewählt: der Bereich aus dem Umschalter). Bereichs-Admins dieses Bereichs sehen ihn wie heute.

## Abgrenzung (nicht Teil dieses Features)
- Teilen von Nachweisen mit Kolleginnen und Kollegen
- Feste Klassen oder Kurse an Lehrkräfte binden
- Neue Fragetypen oder geänderte Benotung
- Lehrkräfte bearbeiten fremde Fragen im Pool eines Bereichs
- Freigabe von Nachweis-Fragen in den Fragenpool oder die Lern-App (bewusst ausgeschlossen, E6)
- Fragen für den Pool anlegen → PROJ-48 (Fach-Zuständigkeiten)

## Technical Requirements
- **Security:** Sichtbarkeit von Nachweisen, Teilnahmen, Noten, Fokus-Protokollen und importierten Fragen hart in RLS und in jeder betroffenen Route unter `src/app/api/admin/assessments/**`. Fremde Objekte liefern 404. Jede Policy-Migration mit Rückweg-SQL.
- **Tests:** Routen-Tests je Rolle (Super-Admin / Bereichs-Admin eigener Bereich / Bereichs-Admin fremder Bereich / Lehrkraft eigener / Lehrkraft fremder Nachweis / Azubi), RLS-Matrix per SQL in einer Transaktion mit Rollback, `npm run build`. Kein Dev-Server und kein Playwright.
- **Kosten:** keine neuen Dienste.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage (geprüft am 2026-10-27)
- Live: 1 Super-Admin, 17 Bereichs-Admins, noch keine Lehrkraft. 5 Nachweise (4 geschlossen, 1 offen), alle mit Ersteller und alle in einem Bereich. 0 Fragen mit „nur für Nachweise“. Aktive Bereiche: SPED und TOUR.
- **Wer einen Nachweis sehen darf, entscheidet heute genau eine Datenbank-Regel** auf der Nachweis-Tabelle: „Admin des Nachweis-Bereichs“. Jede Detail-Route (Ergebnisse, Export, Druck, Teilnehmer, Fokus) liest den Nachweis zuerst mit den Rechten der angemeldeten Person. Erst wenn das klappt, holt sie Namen, Noten und Fokus-Daten mit Server-Rechten. Findet sie nichts, antwortet sie mit 404. **Dieses Tor bauen wir um, nicht jede Route einzeln.**
- Azubis bekommen die Fragen beim Beitritt per Server in ihre Sitzung kopiert. Sie lesen die Fragentabelle dafür nicht selbst. Deshalb können wir private Fragen in der Datenbank verbergen, ohne dass das Durchführen bricht.
- **Gefundene Lücke (heute schon vorhanden):** Jede angemeldete Person darf alle *aktiven* Fragen und alle Antwortoptionen direkt aus der Datenbank lesen, auch Fragen „nur für Nachweise“. Für private Lehrkraft-Fragen reicht das nicht (E6). Das Design schließt die Lücke für private Fragen.

### A) Was sich auf den Seiten ändert

```
Lehrkräfte-Bereich (/admin)
+-- Seitenleiste & Startseite
|   +-- Eintrag „Leistungsnachweise“ jetzt auch für Lehrkräfte
|   +-- Schnellaktion „Neuer Leistungsnachweis“ auch für Lehrkräfte
|
+-- Leistungsnachweise (Liste)  /admin/leistungsnachweise
|   +-- Seitenkopf mit Hauptaktion „Neuer Leistungsnachweis“
|   +-- Filterleiste (PROJ-39) + NEU Filter „Zielbereich“
|   |   +-- nur Super-Admin: NEU Filter „Erstellt von“
|   |       (Personen, „Ehemalige / ohne Rolle“, „Gelöschtes Konto“)
|   +-- Tabelle
|       +-- NEU Spalte „Zielbereich“ (Pill, z. B. „Spedition“)
|       +-- nur Super-Admin: NEU Spalte „Erstellt von“
|
+-- Dialog „Neuer Leistungsnachweis“ (PROJ-27)
|   +-- NEU Schritt 0: Zielbereich wählen (aktive Bereiche)
|   |   +-- Bereichs-Admin: eigener Bereich vorausgewählt
|   |   +-- Super-Admin: Bereich aus dem Umschalter vorausgewählt
|   |   +-- Lehrkraft: leer, außer es gibt nur einen aktiven Bereich
|   +-- Teil wählen / Fragen zusammenstellen (Fragen des Zielbereichs
|   |   + eigene private Fragen), Titel, Zeitfenster, Notenschlüssel,
|   |   Kategorie (Fächer des Zielbereichs): unverändert
|   +-- Import per Datei / Kopier-Prompt: unverändert, legt Fragen
|       für den Zielbereich an (privat, siehe unten)
|
+-- Detailseite eines Nachweises
    +-- Kopfzeile zeigt den Zielbereich
    +-- Im Entwurf: „Zielbereich ändern“ mit Hinweis
    |   „X Fragen aus dem alten Bereich werden entfernt“
    +-- alles Weitere (Code/QR, Öffnen, Ergebnisse, Druck, Auswertung,
        Fokus, Kategorie) unverändert
```

In der Fragenauswahl tragen private Fragen ein kleines Schild „Meine Frage“. Bei Pool-Fragen fehlen für Lehrkräfte die Knöpfe Bearbeiten, Deaktivieren und Löschen. „Für Übung freigeben“ (PROJ-38) erscheint nie bei privaten Fragen.

Für Azubis ändert sich nichts: Beitritt, Durchführung und Ergebnisansicht bleiben gleich.

### B) Datenmodell (in Worten)

**Leistungsnachweis**: ein neues Merkmal:
- **„Für den Bereich geteilt“ (ja/nein)**: Wird einmal beim Anlegen festgelegt und ändert sich danach nicht mehr.
  - *Ja*, wenn ein Bereichs-Admin für seinen **eigenen** Bereich anlegt oder der Super-Admin anlegt. Dann sehen ihn die Bereichs-Admins dieses Bereichs (wie heute, E3).
  - *Nein* in allen anderen Fällen: Lehrkraft, oder Bereichs-Admin für einen fremden Bereich (E4).
  - Alle 5 bestehenden Nachweise bekommen *Ja*. Damit bleibt für die heutigen Bereichs-Admins alles gleich (Regression).
- Der **Zielbereich** ist das schon vorhandene Feld „Fachbereich“ des Nachweises. Neu ist nur, dass er beim Anlegen gewählt wird statt automatisch übernommen. Nach dem Öffnen ist er fest.
- **„Erstellt von“** gibt es schon. Wird ein Konto gelöscht, wird es leer. Die Oberfläche zeigt dann „Gelöschtes Konto“.

Weil das Merkmal beim Anlegen fest eingefroren wird, sind die Rollenwechsel aus den Edge Cases ohne Zusatzlogik erfüllt: Ein herabgestufter Bereichs-Admin lässt seine Bereichs-Nachweise im Bereich. Eine hochgestufte Lehrkraft öffnet ihre alten Nachweise nicht nachträglich.

**Frage**: ein neues Merkmal:
- **„Private Frage von …“ (Besitzer, sonst leer)**: Leer bedeutet Pool-Frage wie bisher. Gefüllt bedeutet, die Frage gehört nur dieser Person (E6). Sie ist automatisch „nur für Nachweise“ und kann nie freigegeben werden.
- Wer einen Nachweis für einen **fremden** Bereich anlegt (Lehrkraft, oder Bereichs-Admin außerhalb des eigenen Bereichs), importiert immer private Fragen. Ein Bereichs-Admin, der im **eigenen** Bereich importiert, verhält sich wie heute (PROJ-38: Bereichs-Frage „nur für Nachweise“, freigebbar).
- Fach und Bereich einer privaten Frage laufen wie bei jeder Frage über die Fach-Zuordnung. So bleibt sie im Zielbereich und taucht nur dort in der Auswahl der Besitzerin auf.

**Wer was sieht, als Regeln in der Datenbank (RLS)**

| Daten | Super-Admin | Bereichs-Admin | Lehrkraft | Azubi |
|---|---|---|---|---|
| Nachweis (und damit Ergebnisse, Export, Druck, Teilnehmer, Fokus) | alle | geteilte des eigenen Bereichs + selbst erstellte | nur selbst erstellte | keiner (wie heute, nur per Code über Server) |
| Private Fragen + deren Antwortoptionen | alle | nur eigene | nur eigene | keine |
| Pool-Fragen lesen | wie heute | wie heute | wie heute (aktive) | wie heute |
| Pool-Fragen ändern | alle | eigener Bereich | **nie** | nie |
| Profile von Azubis | wie heute | wie heute | **keine** neue Regel | nur eigenes |

- „Selbst erstellt“ gilt nur, solange die Person eine Lehrer-Rolle hat. Verliert sie die Rolle, sieht nur noch der Super-Admin den Nachweis und die privaten Fragen (E5).
- Diese Prüfung steht in **einer gemeinsamen Datenbank-Funktion** „darf diesen Nachweis sehen“. Sie gilt für die Nachweis-Tabelle und die Fokus-Protokolle. Server-Code und Datenbank fragen also dieselbe Stelle.
- Teilnehmer-Namen stehen in der Teilnahme selbst. Lehrkräfte brauchen deshalb **keinen** Profil-Zugriff auf Azubis. Daran ändern wir nichts.

### C) Server-Routen (`/api/admin/assessments/**`)
- **Neuer Zugangs-Check „Lehrkraft oder Admin“** nur für die Nachweis-Routen. Der bisherige Admin-Check für alle anderen Admin-Routen (Fragen, Fächer, Shop …) bleibt unverändert. Lehrkräfte kommen dort weiterhin nicht hinein.
- **Liste:** Der Filter „nur Nachweise des Arbeits-Bereichs“ entfällt. Die Liste zeigt genau das, was die Datenbank-Regel erlaubt. Für den Super-Admin heißt das: alle Bereiche, eingrenzbar über die Filter „Zielbereich“ und „Erstellt von“.
- **Anlegen:** nimmt den Zielbereich entgegen. Die Route prüft: Bereich existiert und ist aktiv. Fragen sind aktive Multiple-Choice-Fragen dieses Bereichs oder eigene private Fragen dieses Bereichs. Das Fach der Kategorie gehört zu diesem Bereich. Daraus setzt sie „Für den Bereich geteilt“. Der Wert kommt nie vom Browser.
- **Fragenauswahl, Import, Kopier-Prompt, Vorschau, Material:** arbeiten mit dem Zielbereich des Nachweises statt mit dem Arbeits-Bereich des Admins.
- **Zielbereich ändern:** nur im Entwurf. Pool-Fragen des alten Bereichs fliegen raus, eigene private Fragen bleiben. Die Kategorie wird geleert, wenn ihr Fach nicht zum neuen Bereich gehört.
- **Private Fragen bearbeiten oder löschen:** nur durch die Besitzerin und nur, wenn kein offener Nachweis sie nutzt. Geschlossene Nachweise sind durch ihren Fragen-Schnappschuss geschützt.
- **„Für Übung freigeben“** (Fragenverwaltung PROJ-38): lehnt private Fragen immer ab.
- Alle Detail-Routen behalten ihr Muster „erst Nachweis mit eigenen Rechten lesen, sonst 404“. Sie funktionieren dadurch automatisch für Lehrkräfte richtig. Jede Route wird trotzdem einzeln getestet.
- **Beitritt der Azubis:** unverändert, prüft weiter den Zielbereich.
- **Seiten-Freigabe:** `/admin/leistungsnachweise` und Unterseiten kommen auf die Liste der Seiten, die Lehrkräfte öffnen dürfen (PROJ-44 hat das bereits vorgesehen).

### D) Lern-App und Fragenverwaltung abschotten (E6)
- Alle Übungswege sperren Fragen „nur für Nachweise“ bereits aus (PROJ-38). Private Fragen haben dieses Merkmal immer, also kommt nichts in die Lern-App.
- Die Fragenverwaltung der Bereichs-Admins blendet private Fragen aus, auch die von Bereichs-Admins aus Nachweisen für fremde Bereiche. Nur der Super-Admin sieht sie, mit dem Vermerk „privat“.
- Die Datenbank-Regel zum Lesen von Fragen und Antwortoptionen schließt private Fragen für alle außer Besitzerin und Super-Admin aus (schließt die oben gefundene Lücke).

### E) Technische Entscheidungen (warum)
- **Ein eingefrorenes Merkmal statt Live-Berechnung aus der Rolle:** Würde die Sichtbarkeit jedes Mal aus der aktuellen Rolle der Erstellerin berechnet, würden Nachweise bei jedem Rollenwechsel auf- oder zugehen. Die Spec will genau das nicht.
- **Prüfung in der Datenbank und eine gemeinsame Funktion:** Die Rechte stehen an einer Stelle. Eine vergessene Route kann so nichts verraten, sie bekommt einfach nichts zurück und antwortet mit 404.
- **Eigener Zugangs-Check nur für Nachweise:** Würden wir den allgemeinen Admin-Check für Lehrkräfte öffnen, kämen sie auf einen Schlag in alle Admin-Routen. So bleibt die Öffnung klein und überprüfbar.
- **Private Fragen in derselben Fragentabelle (mit Besitzer)** statt in einer eigenen Tabelle: Schnappschuss, Antwortschlüssel, Druck und Auswertung funktionieren dann ohne Änderung.
- **Kein Rückfall auf den Arbeits-Bereich** bei Lehrkräften: Sie haben keinen. Der Zielbereich kommt immer vom Nachweis.

### F) Migration & Rückweg
- Eine Migration, rein additiv:
  - zwei neue Felder („geteilt“ am Nachweis, Bestand = ja; „Besitzer“ an der Frage, Bestand = leer)
  - die gemeinsame Funktion „darf Nachweis sehen“
  - angepasste Regeln für Nachweise, Fokus-Protokolle, Fragen, Antwortoptionen und Fach-Zuordnung (Lehrkräfte dürfen nur eigene private Fragen anlegen, ändern und löschen)
- Rückweg-SQL stellt die bisherigen Regeln wieder her und entfernt die Felder.
- Reihenfolge laut Deploy-Ablauf: erst Migration, dann Code. Der alte Code läuft mit der neuen Migration weiter, weil alle Bestandsnachweise „geteilt“ sind und es keine privaten Fragen gibt.

### G) Tests
- Routen-Tests je Rolle für Liste, Anlegen, Detail, Ergebnisse, Export, Berichte, Teilnehmer, Fokus, Kategorie, Fragenauswahl und Import: Super-Admin / Bereichs-Admin eigener Bereich / Bereichs-Admin fremder Nachweis / Lehrkraft eigener / Lehrkraft fremder Nachweis / Azubi.
- RLS-Matrix per SQL in einer Transaktion mit Rollback. Abgedeckt: alle Rollen, Rollenentzug (E5), Herab- und Hochstufung, private Fragen für Azubis unsichtbar.
- Reine Funktionen (Ableitung „geteilt“, Zielbereich-Wechsel, Filter „Erstellt von“) als Unit-Tests. Danach `npm run build`. Kein Dev-Server, kein Playwright.

### H) Abhängigkeiten
- Keine neuen Pakete, keine neuen Dienste.

## Implementation Notes (Backend, 2026-10-27)

**Datenbank (live angewendet und mit 39-Punkte-RLS-Matrix geprüft, Transaktion mit `RAISE EXCEPTION` am Ende):**
- `supabase/migrations/20261027_proj46_teacher_assessments.sql` (+ `..._down.sql`): `graded_assessments.shared_with_department` (Bestand = `true`), `questions.is_private` + `questions.owner_id`, zwei CHECK-Constraints (privat ⇒ nur-für-Nachweise; Besitzer nur bei privat), die Funktionen `has_teacher_role`, `can_view_assessment(_id)`, `assessment_shared_for`, `can_manage_private_question`, `question_is_private`, `can_read_question_options`, `can_edit_question`, zwei Trigger (`graded_assessments_guard` friert „geteilt“ ein und verweigert Fremd-Fragen; `questions_private_guard` setzt den Besitzer beim Anlegen und verweigert spätere Änderungen von `is_private`/`owner_id`), sowie neue RLS-Regeln auf `graded_assessments`, `assessment_focus_summary`, `assessment_focus_events`, `questions`, `answer_options`, `question_subjects`.
- `shared_with_department` wird **ausschließlich durch die Datenbank** gesetzt (Trigger), nie vom Server-Code übergeben — genau wie in der Spec verlangt.

**Server-Code:**
- `src/app/api/admin/_lib/auth.ts`: neuer Zugangs-Check `requireTeacherOrAdmin()` (lässt zusätzlich `teacher` herein) nur für Nachweis-Routen; `canViewAssessment`/`assertCanViewAssessment` spiegeln `can_view_assessment` aus der Datenbank für Routen, die den Service-Client nutzen (Ergebnisse, Berichte, Teilnehmer, Fokus). `requireAdmin` unverändert für alle übrigen Admin-Routen.
- `src/proxy.ts` + `src/lib/roles.ts`: Middleware ließ `/api/admin/**` bisher pauschal nur Bereichs-Admin/Super-Admin durch — neuer, auf `/api/admin/assessments/**` begrenzter Durchlass (`teacherMayCallApiPath`) für Lehrkräfte; Seiten-Zugang um `/admin/leistungsnachweise` erweitert (`TEACHER_ADMIN_PATHS`).
- `src/lib/assessment-questions.ts`: `fetchSelectableQuestions`/`checkQuestionSelection` nehmen jetzt einen optionalen `ownerId` entgegen und liefern zusätzlich die eigenen privaten Fragen des Zielbereichs (Feld `isPrivate`).
- `src/app/api/admin/assessments/route.ts` (Liste/Anlegen): `departmentId` kommt jetzt im Request statt aus dem Arbeitsbereich der anfragenden Person; Liste zeigt, was RLS erlaubt, mit Filtern `departmentId`/`createdBy` und (nur Super-Admin) `createdBy`/`createdByName`/`createdByFormer`.
- `src/app/api/admin/assessments/[id]/**` (Detail, Kategorie, Export, Berichte, Ergebnisse, Teilnehmer, Fokus): Zugangs-Check umgestellt; die Service-Client-Routen prüfen jetzt `assertCanViewAssessment` statt `assertCanAdminDepartment`.
- `src/app/api/admin/assessments/[id]/department/route.ts` (neu): Zielbereich im Entwurf wechseln — Pool-Fragen raus, eigene private Fragen bleiben, Prüfungsteil wird neu abgeleitet, Fach-Ablage geleert, falls sie nicht zum neuen Bereich passt. Nach dem Öffnen blockt zusätzlich der DB-Trigger.
- `src/app/api/admin/assessments/questions/**` (Auswahl, Import, Vorschau, Prompt): `departmentId` kommt jetzt aus der Anfrage; Import legt für einen fremden Bereich (Lehrkraft, oder Bereichs-Admin außerhalb des eigenen Bereichs) immer private, dauerhaft nur-für-Nachweise-Fragen an.
- `src/app/api/admin/assessments/questions/[id]/route.ts` (neu): eigene private Fragen bearbeiten/löschen — nur Besitzerin oder Super-Admin, blockt mit 409, solange ein **offener** Nachweis die Frage verwendet.
- `src/app/api/admin/questions/route.ts` + `export/route.ts`: blenden private Fragen für alle außer dem Super-Admin aus (`is_private`, `owner_id` zusätzlich im Select für den Super-Admin-Vermerk „privat“).
- „Für Übung freigeben“ (`assessment_only: false` auf eine private Frage) ist durch den CHECK-Constraint `questions_private_is_assessment_only` in der Datenbank blockiert, nicht nur im Server-Code.

**Tests:** 38 neue/angepasste Testfälle in den betroffenen Routen- und Bibliotheks-Testdateien, plus die Middleware-Tests. Gesamter Testlauf: **113 Testdateien, 1331 Tests, alle grün**. `npm run build` fehlerfrei. Kein Dev-Server, kein Playwright (siehe `.claude/rules`).

## Implementation Notes (Frontend, 2026-10-27)

**Neue, unterstützende API-Routen** (unter `/api/admin/assessments/**`, damit die Middleware sie auch einer Lehrkraft öffnet):
- `GET /api/admin/assessments/departments`: aktive Fachbereiche (id/name/code/Klassenstufen) für den Zielbereich-Schritt, plus `suggestedDepartmentId` (eigener Bereich bzw. Umschalter-Bereich).
- `GET /api/admin/assessments/category-options?departmentId=`: Fächer + bereits verwendete Klassen des **Zielbereichs** für die Ablage (PROJ-39) im Anlegen-Dialog — ersetzt dort den bisherigen Rückgriff auf `/api/admin/subjects` (Arbeitsbereich der anfragenden Person, für Lehrkräfte ohnehin unerreichbar).
- `GET /api/admin/assessments/[id]/route.ts` liefert jetzt zusätzlich `departmentId`/`departmentName`/`departmentCode`.
- `GET /api/admin/assessments/questions/[id]/route.ts` (neu, ergänzt die bestehende PATCH/DELETE-Route): volle Angaben einer eigenen privaten Frage für den Bearbeiten-Dialog.

**Komponenten:**
- `create-assessment-modal.tsx`: neuer Schritt „Zielbereich wählen“ ganz oben — bei genau einem aktiven Bereich automatisch vorbelegt, sonst der eigene Arbeitsbereich (Bereichs-Admin/Super-Admin) bzw. leer (Lehrkraft, E1). Ablage-Fächer/-Klassen und die Fragenauswahl laden danach für den **gewählten** Bereich nach, nicht mehr für den Arbeitsbereich der anfragenden Person. „Startauswahl aus Prüfungssimulation“ bleibt auf den eigenen Arbeitsbereich beschränkt (Prüfungssets sind nicht bereichsübergreifend abrufbar) und blendet sich für einen fremden Zielbereich aus.
- `assessment-question-selector.tsx` / `assessment-import-dialog.tsx` / `edit-assessment-questions-dialog.tsx`: nehmen jetzt `departmentId` als Pflicht-Prop entgegen und reichen ihn an alle Fragen-Endpunkte weiter, statt sich auf den Arbeitsbereich der anfragenden Person zu verlassen.
- `question-picker.tsx`: Klassenstufen-Filter wird jetzt aus den geladenen Fragen selbst abgeleitet (wie Fach/Thema) statt aus dem Bereichs-Kontext der anfragenden Person — notwendig, weil der Zielbereich jetzt vom gewählten Bereich kommen kann, nicht vom eigenen. Private Fragen tragen das Schild „Meine Frage“ und bekommen „Bearbeiten“/Löschen-Aktionen.
- `edit-private-question-dialog.tsx` (neu): eigene private Frage bearbeiten (Text, 2–5 Antwortoptionen, Schwierigkeit, Klassenstufe, Erklärung).
- `change-assessment-department-dialog.tsx` (neu): Zielbereich eines Entwurfs wechseln, mit Warnhinweis vor dem Speichern; die tatsächliche Anzahl entfernter Fragen zeigt die Rückmeldung nach dem Speichern.
- `assessment-filter.ts`/`assessment-filter-bar.tsx`: neue Filter „Zielbereich“ und (nur Super-Admin) „Erstellt von“ (inkl. „Gelöschtes Konto“ und Markierung „ehemalige Lehrkraft“), nach demselben client-seitigen Muster wie die bestehenden Schuljahr-/Klassen-/Fach-Filter.
- `admin-nav.ts`: Eintrag „Leistungsnachweise“ jetzt `teacherVisible`, dadurch automatisch auch Startseiten-Kachel und Schnellsuche-Aktion „Neuer Leistungsnachweis“ für Lehrkräfte sichtbar.

**Tests:** neue/angepasste Fälle in `assessment-filter.test.ts`, `admin-nav.test.ts`, `admin-nav.test.tsx`, `admin-shell.test.tsx`. Keine neuen Komponiententests für die größeren Dialoge (`create-assessment-modal.tsx`, `assessment-import-dialog.tsx`, `question-picker.tsx` u. a.) — das entspricht dem bisherigen Stand in diesem Bereich, dort gab es auch vorher keine. Gesamter Testlauf: **113 Testdateien, 1340 Tests, alle grün**. `npm run build` fehlerfrei.

**Bekannte, kleine Lücken:**
- Der Hinweistext im Fragen-Import-Dialog („… bis du sie in der Fragenverwaltung für den Übungsbetrieb freigibst“) gilt wörtlich nur für den eigenen Bereich; für einen fremden Zielbereich bleibt die Frage dauerhaft privat. Der Text wurde aus Zeitgründen nicht bereichsabhängig umformuliert — fachlich falsch wird dadurch nichts (die Freigabe-Aktion erscheint bei privaten Fragen ohnehin nicht), nur der Begleittext ist an dieser Stelle zu optimistisch.
- Edge Case „Zielbereich wird während des Bearbeitens deaktiviert“ und die volle Rollen-Matrix über die fertige Oberfläche sind noch nicht end-to-end durchgeklickt (kein Dev-Server/Playwright laut Projektregel) → Aufgabe für `/qa`.

## QA Test Results

**Getestet:** 2026-10-27 · **Tester:** QA Engineer (AI) · **Methode:** Code-Review gegen jedes Kriterium, Vitest, Build, plus eine eigene, zusätzliche RLS-Prüfung direkt an der Live-Datenbank (rückgerollte Transaktionen, nichts bleibt bestehen) für zwei Pfade, die die Backend-Phase noch nicht geprüft hatte.
**Nicht möglich:** Browser-, Cross-Browser- und Responsive-Test sowie Playwright E2E. Laut Projektabsprache laufen hier kein Dev-Server und kein Playwright (Absturzgefahr) — das steht auch so in den Technical Requirements dieser Spec. Alles, was nur im Browser sichtbar wäre (Layout, Klickpfade, Radix-Select-Verhalten bei einem nicht mehr passenden Wert), ist aus dem Code abgeleitet und **noch im Browser abzunehmen**. Keine neuen E2E-Specs, aus demselben Grund. Die drei bestehenden E2E-Specs mit `/admin`-Bezug (PROJ-9/10/11) prüfen nur unauthentifizierten Zugriff auf andere Admin-Routen — unverändertes Verhalten, nicht betroffen.

### Automatisierte Tests
- Vitest gesamt: **114 Dateien, 1.345 Tests grün** (113/1.340 nach Backend+Frontend + 5 neue für `question-picker.tsx`, die während der QA ergänzt wurden, weil diese Komponente trotz geänderter Logik noch keinen eigenen Test hatte).
- `npm run build`: fehlerfrei, alle neuen Routen (`/api/admin/assessments/departments`, `/category-options`, `/questions/[id]`, `/[id]/department`) und Seiten im Build-Output vorhanden.
- Zusätzliche Live-DB-Prüfung (rückgerollt): Beförderung einer Lehrkraft zum Bereichs-Admin lässt ihre alten, privaten Nachweise weiterhin nicht geteilt (`nach_befoerderung_immer_noch_nicht_geteilt=f`); ein Kollege im selben Bereich sieht sie weiterhin nicht (`B_sieht_befoerderten_alten_nicht=0`); ein deaktivierter Zielbereich lässt bestehende Nachweise für Bereichs-Admins weiterhin sichtbar (`B_sieht_bestand_trotz_inaktiv=5`). Alle drei Werte wie erwartet. Nach dem Rollback: Datenbank unverändert (5 Nachweise, 0 private Fragen, 0 Lehrkräfte — wie vorher).

### Acceptance Criteria Status

#### Anlegen
- [x] Lehrkräfte sehen „Leistungsnachweise“ und „Neuer Leistungsnachweis“ (Seitenleiste, Startseiten-Kachel, Schnellsuche) — `admin-nav.ts`/-Tests.
- [x] Zielbereich als erster Schritt, Vorbelegung wie gefordert (ein Bereich automatisch, sonst eigener Arbeitsbereich bzw. leer für Lehrkraft) — Code-Review `create-assessment-modal.tsx`.
- [x] Bestehender PROJ-27-Ablauf danach unverändert, jetzt bezogen auf den gewählten Zielbereich.
- [x] Fragenauswahl zeigt Bereichs-Pool + eigene private Fragen (`fetchSelectableQuestions` mit `ownerId`).
- [x] Lehrkräfte können Pool-Fragen nur auswählen: Der Picker zeigt Bearbeiten/Löschen ausschließlich bei `isPrivate` (neuer Test in `question-picker.test.tsx`), zusätzlich durch RLS abgesichert (Pool-Änderungen verlangen `can_admin_department`, das eine Lehrkraft nie erfüllt).
- [x] Datei- und Kopier-Prompt-Import verfügbar; Fragen für einen fremden Bereich werden immer privat angelegt (`import/route.ts`, getestet).
- [x] Private Fragen bearbeiten/löschen, blockiert bei Nutzung durch einen offenen Nachweis (409, getestet) — Wiederverwendung in späteren eigenen Nachweisen bestätigt (Code-Review: `fetchSelectableQuestions` ist Bereich+Besitzer-, nicht Nachweis-gebunden).
- [x] Keine Freigabe-Aktion für Lehrkräfte: Picker hat keinen solchen Knopf; Datenbank-Constraint verhindert „privat + freigegeben“ zusätzlich hart. Für den Super-Admin aber eine Lücke gefunden → **BUG-1**.
- [x] Zielbereich steht in Liste (Spalte, immer) und Detailseite (Pill im Kopf).

#### Durchführen & Auswerten
- [x] PROJ-21/28/30/39-Funktionen für eigene Nachweise verfügbar — alle Routen auf `requireTeacherOrAdmin`/`assertCanViewAssessment` umgestellt, je mit Routen-Tests.
- [x] Beitritt per Code/Link unverändert (Join-Route nicht angefasst, nutzt weiterhin den Service-Client und denselben Bereichs-Vergleich) — Regression bestätigt durch Code-Review, Datei unverändert in diesem Feature.
- [x] Für Azubis kein Unterschied erkennbar: Durchführung/Snapshot/Benotung laufen über denselben Service-Client-Pfad unabhängig von der Rolle der erstellenden Person.

#### Sichtbarkeit (E2–E4)
- [x] Lehrkraft sieht nur eigene Nachweise — RLS-Matrix (39 Punkte, Backend-Phase) + Routen-Tests.
- [x] Bereichs-Admin sieht geteilte des eigenen Bereichs + eigene fremde, keine Lehrkraft-Nachweise — RLS-Matrix + Live-Nachtest (Beförderung).
- [x] Super-Admin sieht alle, mit Filter/Spalte „Erstellt von“ (inkl. „Gelöschtes Konto“, Markierung ehemaliger Lehrkräfte) — `assessment-filter.ts`-Tests + Listen-Route-Tests.
- [x] Fremder Zugriff liefert 404, nicht 403 — durchgängig verifiziert (category/reports/results/export/participants/focus/department/questions[id]).
- [x] Teilnehmer/Noten/Fokus nur für Berechtigte, RLS + Server-Code — `assertCanViewAssessment` vor jedem Service-Client-Zugriff, getestet.
- [x] Keine neue Profil-Zugriffsmöglichkeit für Lehrkräfte — Migration fasst `profiles`-Policies nicht an; Teilnehmernamen kommen aus `exam_sessions.participant_name`, nicht aus `profiles`.

#### Rolle entzogen (E5)
- [x] Nachweise/Noten/Fragen bleiben, private Fragen danach nur Super-Admin sichtbar — RLS-Matrix (`T_ohne_rolle_sieht=0`, `T_ohne_rolle_frage=0`).
- [x] Ein offener Nachweis läuft weiter (Join-Route prüft nur Zeitfenster/Status, nicht die Rolle der erstellenden Person) — Code-Review, keine Kopplung gefunden.
- [x] Super-Admin kann solche Nachweise weiter verwalten — `isSuperAdmin`-Bypass überall bestätigt.

#### Bestehende Nachweise
- [x] Regression: alle 5 Bestandsnachweise bleiben für Bereichs-Admins sichtbar — live direkt nach der Migration verifiziert (`not_shared: 0`) und durch den Live-Nachtest in dieser QA-Runde erneut bestätigt (`B_sieht_bestand_trotz_inaktiv=5`).

### Edge Cases Status
- [x] **Zielbereich im Entwurf ändern:** Pool-Fragen raus, private bleiben, Teil/Fach-Ablage neu berechnet — Routen-Tests. Eine Folge davon beim Wiederverwenden privater Fragen über einen Bereichswechsel hinweg → **BUG-3**.
- [x] **Zielbereich wird deaktiviert:** Neue Nachweise blockiert (Anlegen + Zielbereich-ändern prüfen `is_active`), bestehende bleiben sichtbar — Code-Review + Live-Nachtest. UI-Detail bei einem bereits inaktiven Bestandsbereich → **BUG-2**.
- [x] **Frage nach dem Öffnen geändert/deaktiviert:** unverändertes PROJ-21-Verhalten, von diesem Feature nicht berührt.
- [x] **Bereichs-Admin → Lehrkraft:** RLS-Matrix bestätigt.
- [x] **Lehrkraft → Bereichs-Admin:** bisher ungetestete Richtung, in dieser QA-Runde live nachgeprüft (s. o.) — bestanden.
- [x] **Gute Nachweis-Frage für alle zugänglich machen:** außerhalb des Funktionsumfangs (PROJ-48), private Frage bleibt unberührt — nichts im Code widerspricht dem.
- [x] **Zwei Lehrkräfte, dieselbe Klasse:** jede sieht nur eigene Nachweise, kein Teilen — wie spezifiziert, trivial erfüllt.
- [x] **Azubi mit falschem/fehlendem Bereich:** unveränderte Join-Route, Code nicht berührt.
- [x] **Konto der Lehrkraft gelöscht:** `ON DELETE SET NULL` auf `owner_id`/`created_by`, „Gelöschtes Konto“ in der Liste, RLS lässt dann nur noch den Super-Admin herein (`owner_leer_bleibt_privat=t` in der Backend-Matrix).
- [x] **Super-Admin legt selbst an:** Zielbereich-Vorschlag kommt aus dem Bereichs-Umschalter (`suggestedDepartmentId`) — Code-Review.

### Security Audit Results
- [x] **Autorisierung (Nachweise):** Jede Route liest erst mit den Rechten der anfragenden Person; RLS verweigert fremde Zeilen, der Service-Client kommt erst danach zum Zug. Durchgängig 404 statt 403 bestätigt.
- [x] **Keine erweiterte API-Öffnung:** Die Middleware lässt Lehrkräfte ausschließlich unter `/api/admin/assessments/**` herein (`teacherMayCallApiPath`), geprüft in `proxy.test.ts` inkl. „andere `/api/admin/*`-Routen bleiben 403“.
- [x] **Private Fragen:** RLS schließt sie für alle außer Besitzerin/Super-Admin, auch beim direkten Lesen von `questions`/`answer_options` — schließt die in der Tech-Design-Phase gefundene Vorab-Lücke. Ein `CHECK`-Constraint verhindert „privat + freigegeben“ selbst für den Super-Admin auf Datenbankebene.
- [x] **Eingabevalidierung:** Alle neuen/geänderten Routen mit Zod-Schemas (`departmentId: z.string().uuid()` etc.), keine Rohwerte vom Client in SQL (Supabase-Client ist parametrisiert).
- [x] **Keine Dateninjektion über Fragetext/Titel:** React escaped automatisch, kein `dangerouslySetInnerHTML` in den geänderten/neuen Komponenten.
- [x] **CSV-Export (bestehend, PROJ-21):** unverändert, Formel-Injection-Schutz bleibt.
- [x] **Rate-Limiting:** keine neuen, unauthentifizierten Endpunkte — alle neuen Routen verlangen eine Sitzung.
- [ ] **Kleine, nicht sicherheitsrelevante Lücke:** Die Fragen-Routen (Auswahl/Import/Vorschau/Prompt) prüfen nicht, ob der übergebene Zielbereich aktiv ist (nur Anlegen und Zielbereich-ändern tun das) → siehe BUG-4. Kein Datenleck (aktive Fragen sind ohnehin allgemein lesbar), nur eine mögliche verwaiste private Frage in einem deaktivierten Bereich.

### Regressionstest
- Bestehende Admin-Routen außerhalb von `/api/admin/assessments/**` unverändert: `requireAdmin()` nicht angerührt, Middleware blockt Lehrkräfte dort weiterhin mit 403 (`proxy.test.ts`).
- Fragenverwaltung/-Export für Bereichs-Admins: vollständig unverändertes Ergebnis für Pool-Fragen (private werden zusätzlich ausgefiltert) — bestehende Tests weiterhin grün, neue Tests ergänzt.
- Azubi-Beitritt, Durchführung, Benotung, Druck (PROJ-21/28/30): Dateien in diesem Feature nicht verändert, verifiziert per Code-Diff (`git log --name-only`) — kein Berührungspunkt außer den absichtlich geänderten Zugangs-Checks der Admin-Routen.
- Vollständiger Vitest-Lauf nach jeder Änderung grün gehalten, keine einzige Regression in den 1.345 Tests.

### Bugs Found

**Nachtrag (2026-10-27, nach Nutzerwunsch „bitte alle Bugs beheben“):** Alle vier Bugs wurden behoben. Details je Bug unten unter „Fix“. Vollständiger Testlauf danach: **114 Dateien, 1.356 Tests grün**, `npm run build` fehlerfrei, Datenbank nach einem erneuten Live-Nachtest unverändert (5 Nachweise, 0 private Fragen).

#### BUG-1: Super-Admin sieht private Fragen in der Fragenverwaltung ohne Kennzeichnung; „Für Übung freigeben“ schlägt mit unklarer Meldung fehl
- **Severity:** Medium
- **Fix:** `question-form-modal.tsx` (Typ um `is_private`/`owner_id` ergänzt), `admin/questions/page.tsx` (Badge „Privat“ neben „Nur für Nachweise“; der „Für Übung freigeben“-Knopf erscheint jetzt nur noch, wenn `!is_private`), `admin/questions/[id]/route.ts` (PATCH lehnt `assessment_only: false` auf einer privaten Frage jetzt mit einer klaren 400-Meldung ab, statt den rohen Datenbank-Fehler durchzureichen — Verteidigung in der Tiefe, da die Oberfläche den Knopf jetzt ohnehin nicht mehr zeigt). 2 neue Tests in `admin/questions/[id]/route.test.ts`.
- **Betroffene Dateien:** `src/app/admin/questions/page.tsx`, `src/components/admin/question-form-modal.tsx`
- **Steps to Reproduce:**
  1. Eine Lehrkraft importiert eine private Nachweis-Frage (für einen fremden oder, als Bereichs-Admin, den eigenen Bereich mit `assessmentOnly`).
  2. Super-Admin öffnet `/admin/questions` im betroffenen Bereich.
  3. Erwartet (Tech Design D): Die private Frage ist zu sehen, mit dem Vermerk „privat“.
  4. Tatsächlich: Die Frage erscheint wie jede andere „Nur für Nachweise“-Frage, ohne jeden Hinweis, dass sie einer Lehrkraft gehört und nie regulär freigegeben werden kann.
  5. Klickt der Super-Admin trotzdem „Für Übung freigeben“ (sichtbar, weil die Schaltfläche nur an `assessment_only` hängt, nicht an `is_private`), schlägt das serverseitig an einem Datenbank-Constraint fehl; die Oberfläche zeigt nur „Freigabe fehlgeschlagen.“ statt eines erklärenden Hinweises.
- **Warum nicht kritischer:** Kein Datenverlust, keine Sicherheitslücke (der Datenbank-Constraint verhindert die Freigabe zuverlässig), betrifft ausschließlich das einzige Super-Admin-Konto, jederzeit wiederholbar ohne Folgeschäden.
- **Priority:** Fix before deployment empfohlen (Tech Design verlangt den Vermerk explizit), ist aber kein Blocker für die eigentlichen Akzeptanzkriterien (die sich auf Lehrkräfte beziehen, welche diese Seite nicht erreichen).

#### BUG-2: „Zielbereich ändern“-Auswahl zeigt möglicherweise einen leeren Wert, wenn der aktuelle Zielbereich inzwischen deaktiviert wurde
- **Severity:** Low (im Code vorhergesagt, nicht im Browser bestätigt)
- **Betroffene Datei:** `src/components/admin/change-assessment-department-dialog.tsx`
- **Steps to Reproduce:**
  1. Nachweis-Entwurf für Bereich X anlegen.
  2. Bereich X deaktivieren.
  3. „Zielbereich ändern“ öffnen.
  4. Erwartet: Das aktuell gewählte Feld zeigt zumindest den Namen von X (auch wenn er nicht mehr zur Auswahl steht) oder einen erklärenden Hinweis.
  5. Vermutlich tatsächlich: Radix `SelectValue` zeigt nichts an, weil kein `SelectItem` mit dem aktuellen Wert existiert (die Liste enthält nur aktive Bereiche).
- **Auswirkung:** Rein optisch. Ohne eine Auswahl zu treffen und zu speichern ändert sich nichts (`target === currentDepartmentId`-Kurzschluss greift weiterhin über den internen State, nicht über die Anzeige).
- **Priority:** Nice to have.
- **Fix:** `change-assessment-department-dialog.tsx` bekommt jetzt den Namen des aktuellen Zielbereichs als Prop (`currentDepartmentName`, von der Detailseite durchgereicht) und fügt ihn der Bereichsliste hinzu, falls er nicht unter den aktiven Bereichen auftaucht — mit dem Zusatz „(deaktiviert)“. Die Auswahl zeigt dadurch immer einen passenden Eintrag.

#### BUG-3: Eine mitgenommene private Frage wird nach einem Zielbereich-Wechsel in der Fragenauswahl unsichtbar (bleibt aber ausgewählt)
- **Severity:** Medium
- **Betroffene Dateien:** `src/app/api/admin/assessments/[id]/department/route.ts`, `src/lib/assessment-questions.ts`
- **Steps to Reproduce:**
  1. Lehrkraft legt einen Entwurf für Bereich Tourismus an, importiert eine private Frage (Fach-Zuordnung liegt dadurch bei einem Tourismus-Fach).
  2. „Zielbereich ändern“ auf Spedition.
  3. Die Frage bleibt laut Spec ausgewählt („eigene importierte Fragen bleiben“) — bestätigt, `draft_question_ids` behält die ID.
  4. „Fragen bearbeiten“ öffnen.
  5. Erwartet: Die private Frage erscheint im Picker, ggf. mit Hinweis, dass sie aus dem alten Bereich stammt.
  6. Tatsächlich: Die Frage erscheint **nicht** in der Liste (`fetchSelectableQuestions` filtert private Fragen weiterhin über ihre ursprüngliche, jetzt bereichsfremde Fach-Zuordnung), bleibt aber im „Gewählte Fragen“-Zähler mitgezählt und lässt sich über die Oberfläche nicht mehr gezielt abwählen.
- **Zusätzliche Folge:** Wird der Entwurf später geöffnet, prüft die Open-Route nur „aktiv + Multiple-Choice“, nicht die Fach-Zuordnung — die Frage landet im Snapshot, obwohl ihr Fach fachlich nicht zum neuen Zielbereich passt.
- **Warum nicht höher:** Kein Sicherheitsproblem (die Frage bleibt privat und nur für die Besitzerin sichtbar), kein Datenverlust, betrifft nur die Kombination „private Frage importiert UND danach Zielbereich gewechselt“ — vermutlich ein seltener Pfad. Workaround: Frage vor dem Wechsel bewusst abwählen und bei Bedarf im neuen Bereich neu importieren.
- **Priority:** Fix before deployment empfohlen, da er exakt den in der Spec beschriebenen Edge Case betrifft und zu einem inkonsistenten, für die Lehrkraft nicht nachvollziehbaren Zustand führt.
- **Fix:** `PATCH /api/admin/assessments/[id]/department` zieht die Fach-Zuordnung mitgenommener privater Fragen jetzt aktiv auf ein Fach des neuen Bereichs um (`question_subjects.subject_id` → Standardfach des neuen Bereichs, dieselbe Regel wie beim Import — neuer gemeinsamer Helfer `defaultSubjectIdFor` in `assessment-questions.ts`, auch von `import`/`preview` übernommen statt der bisherigen doppelten Inline-Logik). Dadurch taucht die Frage danach wieder korrekt in der Fragenauswahl des neuen Bereichs auf, und die spätere Open-Route-Prüfung sieht ein stimmiges Fach. Schlägt der Umzug fehl, bricht die Route mit 500 ab, statt einen inkonsistenten Zustand zu speichern. 3 neue Routen-Tests, 4 neue Unit-Tests für `defaultSubjectIdFor`.

#### BUG-4: Fragen-Routen prüfen den Zielbereich nicht auf „aktiv“
- **Severity:** Low
- **Betroffene Dateien:** `src/app/api/admin/assessments/questions/route.ts`, `.../import/route.ts`, `.../preview/route.ts`, `.../prompt/route.ts`
- **Beschreibung:** Nur `POST /api/admin/assessments` und `PATCH .../[id]/department` prüfen, dass der Zielbereich aktiv ist. Die Fragen-Routen nehmen jede existierende `departmentId` ohne Aktiv-Prüfung an. Über die Oberfläche nicht erreichbar (die Zielbereich-Auswahl zeigt nur aktive Bereiche), nur über einen direkten API-Aufruf. Folge wäre höchstens eine private Frage, die einem deaktivierten Bereich zugeordnet ist und nie in einem echten Nachweis landen kann (die Anlegen-Route blockt das weiterhin) — kein Sicherheits- oder Datenproblem, nur unnötige verwaiste Datensätze.
- **Priority:** Nice to have.
- **Fix (mit Einschränkung):** `import`, `preview` und `prompt` prüfen jetzt über die neue Hilfsfunktion `isDepartmentActive` (`src/lib/departments.ts`), ob der Zielbereich aktiv ist, und lehnen sonst mit 400 „Dieser Fachbereich ist nicht verfügbar.“ ab. **Bewusst nicht geändert:** die reine Fragenauswahl-Route (`GET .../questions`). Sie wird auch beim Bearbeiten eines bereits bestehenden Entwurfs aufgerufen, dessen Zielbereich inzwischen deaktiviert wurde — genau dieser Fall ist durch die Spec ausdrücklich geschützt („Bestehende bleiben sichtbar und auswertbar“). Eine Aktiv-Prüfung dort hätte das Bearbeiten eines solchen Entwurfs zu Unrecht blockiert und damit eine neue, gegenteilige Regression eingeführt. 3 neue Routen-Tests (prompt/preview/import).

### Summary
- **Acceptance Criteria:** 23/23 Kriterien-Gruppen bestanden (Prüfmethode: Code-Review + Tests; Browser-Abnahme steht noch aus)
- **Edge Cases:** 10/10 behandelt
- **Bugs Found:** 4 total (0 critical, 0 high, 2 medium, 2 low) — **alle 4 behoben** (siehe Fix-Vermerk je Bug oben)
- **Security:** Kein Critical/High-Fund.
- **Production Ready:** **JA** aus Sicht von Code-Review und automatisierten Tests. Offen bleibt ausschließlich die Browser-Abnahme (Layout, Klickpfade, insbesondere BUG-2, das nur im Code vorhergesagt und nicht im Browser bestätigt wurde) — kein Dev-Server hier, das übernimmt der Nutzer selbst.
- **Recommendation:** Deploy vorbereiten. Beim ersten echten Durchklicken gezielt auf das Verhalten von BUG-2 achten (Zielbereich-ändern-Dialog bei einem inzwischen deaktivierten Bestandsbereich).

### Nachtrag: Fix-Verifikation (2026-10-27)
- Vitest gesamt nach allen vier Fixes: **114 Dateien, 1.356 Tests grün** (11 neue Tests ggü. dem ersten QA-Durchlauf: 2 für BUG-1, 3 für BUG-3-Routen + 4 für den neuen Helfer `defaultSubjectIdFor`, 3 für BUG-4).
- `npm run build`: fehlerfrei.
- Live-DB danach erneut geprüft: unverändert (5 Nachweise, 0 private Fragen, 0 Lehrkräfte) — kein Fix hat auf die Datenbank selbst zugegriffen außer über die ohnehin bestehenden, bereits migrierten RLS-Regeln.

## Deployment

**Deployed:** 2026-10-27 · **Production-URL:** https://spedilern.vercel.app

- Migration bereits vor der Backend-Phase live angewendet (`20261027_proj46_teacher_assessments.sql`), daher kein zusätzlicher Migrationsschritt beim Deploy nötig — Reihenfolge laut Deploy-Ablauf (erst Migration, dann Code) eingehalten.
- Pre-Deployment-Checks: `npm run build` fehlerfrei, `npm run lint` 0 Fehler (37 vorbestehende, von diesem Feature unabhängige Warnungen; ein echter, selbst eingeführter Fund — ungenutzter `toast`-Import — vor dem Push behoben), gesamter Vitest-Lauf 114 Dateien/1.356 Tests grün.
- Push auf `main` (Commits `39e645d`…`e66ca38`) löste den Vercel-Production-Build aus. Build erfolgreich, Dauer 47 s.
- Verifikation ohne Login direkt gegen die Produktion:
  - `/` und `/admin/leistungsnachweise` → 307 zum Login (`/admin/leistungsnachweise` konkret zu `/login?redirect=%2Fadmin%2Fleistungsnachweise`).
  - `/api/admin/assessments`, `/api/admin/assessments/departments`, `/api/admin/assessments/category-options` → 401.
  - Andere Admin-Route (`/api/admin/questions`) weiterhin 401 — die Lehrkraft-Öffnung bleibt auf `/api/admin/assessments/**` begrenzt.
  - Live-DB danach: 6 Nachweise (ein neuer seit der QA-Prüfung, reguläre Nutzung), 0 davon „nicht geteilt" außerhalb erwarteter Fälle, 0 private Fragen — unauffällig.
- Keine neuen Umgebungsvariablen, keine neuen Dienste (`Kosten: keine neuen Dienste` laut Spec eingehalten).
- Kein Dev-Server, kein Playwright, auch beim Deploy nicht — Produktions-Check ausschließlich per `curl` und Supabase-Lesezugriff.
