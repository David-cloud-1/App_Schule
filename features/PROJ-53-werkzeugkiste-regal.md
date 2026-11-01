# PROJ-53: Werkzeugkiste – Regal des Kollegiums

## Status: In Progress
**Created:** 2026-10-27
**Last Updated:** 2026-11-01

## Kontext
Teil des Werkzeugkiste-Umzugs (Übersicht in PROJ-51). In der alten Werkzeugkiste gab es das „Regal des Kollegiums“: Eine Lehrkraft konnte fertiges Material schulweit freigeben, andere konnten es herunterladen. Das hochgeladene Ausgangsskript blieb immer privat, weil es oft aus Verlagsmaterial stammt.

In der App wird das Regal zum dritten Reiter der Werkzeugkiste. Neu ist, dass die Lehrkraft **pro Material** bestimmt, wer es sehen darf.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1 – Sichtbarkeit pro Material, vier Stufen:** Die Lehrkraft entscheidet für jedes Material selbst:
  1. **Nur ich** (Standard, nicht im Regal)
  2. **Mein Fachbereich**: alle Lehrkräfte, die im selben Fachbereich unterrichten
  3. **Alle Lehrkräfte** der Schule
  4. **Ausgewählte Kolleginnen und Kollegen**: namentlich ausgewählt
- **E2 – Skript bleibt privat:** Geteilt wird ausschließlich das fertige Material. Skripttext, Skriptdatei und KI-Antwort sieht nur die Besitzerin oder der Besitzer (wie bisher).
- **E3 – Freiwillig:** Nichts wird automatisch geteilt.

## Dependencies
- Requires: PROJ-51 (Rahmen), PROJ-52 (Meine Materialien: geteilt wird von dort aus)
- Requires: PROJ-48 (Fach-Zuständigkeiten) bzw. PROJ-22/24 (Fachbereich), um zu bestimmen, wer „im selben Fachbereich“ ist

## User Stories
- Als **Lehrkraft** möchte ich ein gelungenes Material mit meinem Fachbereich teilen, damit Kolleginnen und Kollegen nicht dasselbe noch einmal erstellen müssen.
- Als **Lehrkraft** möchte ich Material nur mit bestimmten Kolleginnen und Kollegen teilen, z. B. mit der Parallelklassen-Lehrkraft, ohne es gleich der ganzen Schule zu zeigen.
- Als **Lehrkraft** möchte ich jederzeit ändern oder zurücknehmen, wer mein Material sieht.
- Als **Lehrkraft** möchte ich im Regal nach Fach und Werkzeug filtern, damit ich schnell Passendes finde.
- Als **Lehrkraft** möchte ich ein Material aus dem Regal herunterladen oder als Ausgangspunkt für mein eigenes übernehmen und anpassen.
- Als **Lehrkraft** möchte ich sehen, wie oft mein geteiltes Material geladen wurde, als kleine Bestätigung.

## Acceptance Criteria

### Teilen
- [ ] In „Meine Materialien“ (Menü ⋯) und in Schritt 5 des Ablaufs gibt es **„Teilen …“**. Es öffnet einen Dialog.
- [ ] Der Dialog bietet die vier Stufen als Auswahl (E1) mit je einem erklärenden Satz:
  - Nur ich: „Nur du siehst dieses Material.“
  - Mein Fachbereich: „Alle Lehrkräfte in [Fachbereich] sehen es im Regal.“ Bei mehreren Fachbereichen kann die Lehrkraft einen oder mehrere ankreuzen.
  - Alle Lehrkräfte: „Alle Lehrkräfte der Schule sehen es im Regal.“
  - Ausgewählte: Suchfeld zur Auswahl von Lehrkräften nach Name, die Ausgewählten erscheinen als Chips mit ✕.
- [ ] Wird geteilt (Stufe 2–4), sind zusätzlich wählbar: **Fach** (aus den Fächern der App bzw. den eigenen Zuständigkeiten, optional) und eine **kurze Notiz** (höchstens 200 Zeichen, z. B. „Für die 11. Klasse, ca. 2 Doppelstunden“).
- [ ] Der Dialog weist sichtbar darauf hin: „Geteilt wird nur das fertige Material. Dein Skript bleibt privat.“ (E2)
- [ ] Speichern zeigt einen Toast („Mit deinem Fachbereich geteilt“). Die Spalte „Regal“ in „Meine Materialien“ zeigt die Stufe als Pill (privat · Fachbereich · alle · N Personen).
- [ ] Die Stufe lässt sich jederzeit ändern. „Nur ich“ nimmt das Material sofort aus dem Regal.

### Regal ansehen
- [ ] Der Reiter „Regal des Kollegiums“ zeigt alle Materialien, die die angemeldete Lehrkraft sehen darf: eigener Fachbereich, alle Lehrkräfte, namentlich freigegeben. Eigene geteilte Materialien erscheinen ebenfalls, als „von dir“ gekennzeichnet.
- [ ] Jede Karte zeigt Werkzeug · Format, Fach (falls gesetzt), Titel, Notiz, „von [Name]“, „N× geladen“ und **„Herunterladen“** sowie **„Anpassen“**.
- [ ] Ist ein Material namentlich mit mir geteilt, steht auf der Karte „mit dir geteilt“.
- [ ] Filter als Chips über der Liste: **Fach** (alle Fächer, die im sichtbaren Regal vorkommen) und **Werkzeug**. Dazu Sortierung „Neueste zuerst“ / „Am häufigsten geladen“ und ein Suchfeld (Titel, Notiz).
- [ ] Raster mit 3 Spalten auf dem Desktop, 1 Spalte auf dem Handy. Ab 30 Einträgen wird nachgeladen.
- [ ] Leerzustand: „Noch nichts geteilt. Teile dein erstes Material aus Meine Materialien.“ Der Link führt zum Reiter.

### Herunterladen & Anpassen
- [ ] „Herunterladen“ lädt die fertige Datei und erhöht den Zähler um 1. Eigene Downloads zählen nicht.
- [ ] **„Anpassen“** legt eine **Kopie** in „Meine Materialien“ der ladenden Lehrkraft an (Titel „[Titel] (Kopie)“, gleiches Werkzeug, gleiche KI-Antwort, **ohne** Skript) und öffnet sie bei Schritt 4 zum Überarbeiten. Das Original bleibt unverändert.
- [ ] Bei einer angepassten Kopie ist „Gleiches Skript, anderes Werkzeug“ ausgegraut (kein Skript, E2).

### Rechte
- [ ] Nur Lehrer-Rollen sehen das Regal. Azubis nie, auch nicht über direkte Aufrufe (404).
- [ ] Was eine Lehrkraft nach den Regeln nicht sehen darf, erscheint weder in der Liste noch über direkte Aufrufe oder Download-Links (404).
- [ ] Nur die Besitzerin oder der Besitzer kann die Sichtbarkeit ändern oder das Material löschen.
- [ ] Der **Super-Admin** kann jedes geteilte Material aus dem Regal nehmen (z. B. bei Urheberrechtsproblemen), aber nicht löschen. Die Besitzerin oder der Besitzer sieht danach „vom Admin aus dem Regal genommen“. Der Vorgang wird im Änderungsprotokoll erfasst.

## Edge Cases
- **Lehrkraft wechselt den Fachbereich oder trägt sich aus:** „Mein Fachbereich“-Freigaben gelten immer für die aktuelle Zuordnung. Wer nicht mehr im Bereich unterrichtet, sieht das Material nicht mehr, außer es ist anders freigegeben.
- **Lehrkraft ohne Fachbereich** (PROJ-46): Die Stufe „Mein Fachbereich“ ist ausgegraut mit dem Hinweis „Trage dich unter Meine Fächer ein“. Die anderen Stufen gehen.
- **Ausgewählte Person verliert die Lehrer-Rolle:** Sie sieht das Material nicht mehr. In der Freigabeliste erscheint sie als „kein Zugang mehr“ und kann entfernt werden.
- **Besitzerin oder Besitzer verliert die Rolle oder löscht das Konto:** Bei Rollenentzug verschwindet das Material aus dem Regal. Bei Kontolöschung wird es mitgelöscht. Bereits angelegte „Anpassen“-Kopien anderer bleiben bestehen.
- **Material wird überarbeitet, während es geteilt ist:** Das Regal zeigt automatisch die neue Fassung, die Freigabe bleibt.
- **Viele Ausgewählte:** Höchstens 50 Personen pro Material. Darüber hinaus ist „Fachbereich“ oder „Alle“ gedacht.
- **Download-Zähler-Missbrauch** (eine Person lädt 100-mal): Mehrfach-Downloads derselben Person am selben Tag zählen einmal.

## Technical Requirements
- **Sicherheit:** Die Sichtbarkeitsregeln werden serverseitig bzw. in der Datenbank durchgesetzt, nicht nur in der Oberfläche. Skript und KI-Antwort sind für Nicht-Besitzer technisch nicht abrufbar (E2).
- **Datenschutz:** Im Regal erscheint der Anzeigename der Lehrkraft, nicht die E-Mail-Adresse. Die Personensuche im Teilen-Dialog zeigt nur Lehrer-Rollen.
- **Leistung:** Das Regal mit 500 sichtbaren Einträgen lädt die erste Seite in unter einer Sekunde.

## Abgrenzung (nicht Teil dieses Features)
- Öffentliche Links für Personen ohne Konto
- Bewertungen oder Kommentare im Regal
- Gemeinsames Bearbeiten desselben Materials durch mehrere Lehrkräfte

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-01. Baut auf PROJ-51 und PROJ-52 auf. Ein „geteiltes Material“ ist ein fertiges Material aus „Meine Materialien“, an das eine **Freigabe** gehängt wird. Die Tabelle der Abläufe und ihre Zugriffsregeln bleiben unverändert streng privat.

### Entscheidungen (Nutzer, 2026-11-01)
1. **Antwort geht mit (präzisiert E2):** Privat bleiben Skripttext, Skriptdatei und Einlesung. Die KI-Antwort ist der Inhalt des fertigen Materials und steckt ohnehin in der Datei, die jede berechtigte Lehrkraft laden darf. „Anpassen“ kopiert sie deshalb mit.
2. **Fachbereich = Eingetragene + Bereichs-Admins:** Zu „Mein Fachbereich“ gehören Lehrkräfte mit Eintrag unter „Meine Fächer“ (PROJ-48) in diesem Bereich und die Bereichs-Admins dieses Bereichs.
3. **Super-Admin = Moderationsansicht:** Er sieht jedes geteilte Material und kann es aus dem Regal nehmen. Herunterladen und Anpassen gehen für ihn nur, wenn ihn die Freigabe auch regulär betrifft.
4. **Bilder:** Beim Fertigstellen speichert die App zusätzlich die Bilder, die im Material vorkommen („Bilder-Auszug“). Nur diese gehen an eine angepasste Kopie. Das Skript bleibt privat, die Kopie lässt sich trotzdem mit Bildern neu bauen.

### Das Bild im Großen

```
Meine Materialien (PROJ-52)                        Reiter „Regal des Kollegiums“
   |  „Teilen …“ → Dialog                              |  liest die „Regal-Sicht“
   v                                                   v
Freigabe (neu, hängt an einem Material)  ───►  Regal-Sicht (neu, nur schmale Felder)
   Stufe · Fach · Notiz · Bereiche · Personen         Titel · Werkzeug · Format · Fach · Notiz
                                                      Name der Lehrkraft · Zähler
   |                                                  NIE: Skript, Prompt, Antwort, Einlesung
   v
Tabelle „Werkzeug-Abläufe“ (unverändert privat)  ──►  Privater Speicher „werkzeugkiste“
   Download und „Anpassen“ laufen über den Server, der die Berechtigung zuerst prüft
```

Wichtig: Das Regal liest **nie direkt** aus der Ablauf-Tabelle. Sie bleibt „nur eigene Zeilen“. Das Regal bekommt eine eigene, schmale Sicht, die nur zeigt, was die Spec zeigen darf. Dadurch ist E2 (Skript bleibt privat) technisch erzwungen und nicht nur eine Oberflächenregel.

### Was die Prüfung des Bestands ergeben hat (wichtig für den Bau)

1. **Die Spec widersprach sich bei E2 und „Anpassen“.** Gelöst durch Entscheidung 1. Die Spec-Zeile „gleiche KI-Antwort, ohne Skript“ gilt unverändert.
2. **Eine Kopie ohne Skript lässt sich nicht neu bauen.** Der Bau-Schritt holt die Bilder aus der Einlesung, und die bekommt die Kopie nicht. Gelöst durch Entscheidung 4. Das ist eine kleine Ergänzung im bestehenden Bau-Schritt aus PROJ-52 (sie betrifft also schon ausgelieferten Code).
3. **Ältere Materialien haben noch keinen Bilder-Auszug.** Er wird beim ersten „Teilen“ aus der Einlesung nachgeholt. Ist die Einlesung schon weg (12 Monate), lässt sich das Material teilen und herunterladen, aber nicht anpassen. Die Karte zeigt „Anpassen“ dann nicht.
4. **„Ohne Skript“ gibt es nun in zwei Arten.** Bisher hieß das nur „Skript nach 12 Monaten entfernt“ (PROJ-52). Eine Regal-Kopie hat nie ein Skript. Die Ausgrauen-Hinweise in „Meine Materialien“ brauchen deshalb einen zweiten Text: „Dieses Material stammt aus dem Regal, es gibt kein Skript dazu“.
5. ~~„Kapitel neu anfragen“ braucht Text aus dem Skript~~ — **bei der Umsetzung geprüft und widerlegt (2026-11-01):** Der Kern baut den Kapitel-Prompt nur aus der Antwort, braucht also kein Skript. „Kapitel neu anfragen“ und „Tippfehler direkt korrigieren“ gehen bei einer Regal-Kopie beide. Eingeschränkt ist nur die Prüfstelle (siehe Umsetzung Paket 2).
6. **Löschen:** Das Löschen-Fenster in „Meine Materialien“ bekommt den Hinweis „verschwindet auch aus dem Regal“ (PROJ-52 hatte ihn für PROJ-53 vorgemerkt). Die Freigabe verschwindet automatisch mit dem Material. Kopien anderer bleiben, weil sie eigene Dateien haben.

### Component Structure

```
Reiter „Regal des Kollegiums“ (ersetzt den „Kommt bald“-Platzhalter)
+-- Werkzeugleiste: Suchfeld (Titel, Notiz) · Sortierung (Neueste / Am häufigsten geladen)
+-- Filter-Chips: Fach · Werkzeug (nur Werte, die im sichtbaren Regal vorkommen)
+-- Raster (Desktop 3 Spalten · Handy 1 Spalte), „Mehr laden“ ab 30 Einträgen
|   +-- Regal-Karte
|       +-- Kopf: Werkzeug · Format, Fach-Pill
|       +-- Titel (gekürzt, voller Text im title), Notiz
|       +-- Fuß: „von [Name]“ / „von dir“ · „mit dir geteilt“ · „N× geladen“
|       +-- Knöpfe: Herunterladen · Anpassen (bei eigenen Materialien ausgeblendet)
+-- Leerzustand (AdminEmptyState, Link zu „Meine Materialien“)
+-- Fehlerzustand (AdminErrorState)
+-- Moderationsansicht (nur Super-Admin, Umschalter oben im Reiter)
    +-- Tabelle: Titel · Besitzer · Stufe · Geladen · „Aus dem Regal nehmen“ (mit Grund)

„Teilen …“-Dialog (aus Menü ⋯ in Meine Materialien und aus Schritt 5)
+-- Stufenwahl (Radio): Nur ich · Mein Fachbereich · Alle Lehrkräfte · Ausgewählte
|   +-- Fachbereich: Häkchen, wenn mehrere (ausgegraut ohne Fachbereich, mit Hinweis)
|   +-- Ausgewählte: Suchfeld (nur Lehrer-Rollen) + Chips mit ✕, „kein Zugang mehr“-Chips
+-- Fach (optional) · Notiz (200 Zeichen mit Zähler)
+-- Hinweis „Geteilt wird nur das fertige Material. Dein Skript bleibt privat.“
+-- Speichern (Toast) · Abbrechen

Meine Materialien
+-- Spalte „Regal“ wird sichtbar: Pill (privat · Fachbereich · alle · N Personen · „vom Admin entnommen“)
+-- Menü ⋯: neuer Eintrag „Teilen …“
```

Alles aus vorhandenen Bausteinen (Card, Table, Dialog, AlertDialog, RadioGroup, Checkbox, Command/Popover für die Personensuche, Badge, Select, Input, Textarea, Skeleton, Tabs) und den Zuständen aus `admin-states.tsx`. Keine neuen Pakete.

### Data Model (in Worten)

**Freigabe** (neu, eine je geteiltem Material; „Nur ich“ heißt: keine Freigabe):
- Zu welchem Material, und wem es gehört. Verschwindet automatisch, wenn das Material gelöscht wird.
- **Stufe:** Fachbereich, Alle oder Ausgewählte.
- **Fach** (optional) und **Notiz** (höchstens 200 Zeichen).
- Geteilt am.
- **Entnommen:** wann, von wem, mit welchem Grund. Leer, solange das Material im Regal steht.

**Freigabe-Bereiche** (neu): welche Fachbereiche bei Stufe „Fachbereich“ sehen dürfen (einer oder mehrere).

**Freigabe-Personen** (neu): welche Lehrkräfte bei Stufe „Ausgewählte“ sehen dürfen. Höchstens 50 je Freigabe.

**Regal-Downloads** (neu): wer wann (Tag) welche Freigabe geladen hat. Je Person, Freigabe und Tag zählt es einmal. Die Zahl „N× geladen“ ist die Summe dieser Einträge, eigene Downloads der Besitzerin oder des Besitzers kommen nicht hinein.

**Werkzeug-Abläufe** (bestehend) bekommen:
- **Herkunft:** aus welchem Regal-Material die Kopie stammt, mit dem Namen der Urheberin oder des Urhebers als Text. Bleibt stehen, auch wenn das Original gelöscht wird. Daran erkennt die App „stammt aus dem Regal“ und „es gibt kein Skript“.
- Sonst nichts. Ob es ein Skript gibt, ergibt sich wie bisher aus den vorhandenen Feldern.

**Im Speicher** (neu je Material): der **Bilder-Auszug** (nur die im Material benutzten Bilder). Er zählt zur Speichergröße des Materials.

**Wer darf was:**
- Freigaben anlegen, ändern, zurücknehmen: nur die Besitzerin oder der Besitzer, und nur mit Lehrer-Rolle.
- Freigaben sehen (Regal): jede Lehrkraft, auf die eine Stufe zutrifft, **und** deren Besitzerin oder Besitzer noch die Lehrer-Rolle hat **und** die nicht entnommen ist.
- Moderation: nur der Super-Admin, über den Server.
- Azubis sehen und erreichen nichts davon (404).

**Bestehende Zugriffsregeln der Ablauf-Tabelle bleiben unverändert.** Neu kommen nur Regeln für die vier neuen Tabellen dazu (laut Projektregel muss das der Nutzer ausdrücklich freigeben, siehe unten).

### Wie die Sichtbarkeit durchgesetzt wird

Die Frage „darf diese Lehrkraft das sehen?“ beantwortet **eine einzige Stelle in der Datenbank**. Liste, Einzelaufruf, Download und „Anpassen“ nutzen dieselbe Antwort. So kann keiner dieser Wege versehentlich großzügiger sein als die anderen.

Eine Lehrkraft sieht eine Freigabe, wenn:
1. sie die Besitzerin oder der Besitzer ist, **oder**
2. die Stufe „Alle“ ist, **oder**
3. die Stufe „Fachbereich“ ist und die Lehrkraft in einem der angekreuzten Bereiche steht (Eintrag unter „Meine Fächer“ oder Bereichs-Admin dieses Bereichs), **oder**
4. die Stufe „Ausgewählte“ ist und sie namentlich dabei ist,

und zusätzlich der Besitzer noch Lehrkraft ist, die Freigabe nicht entnommen ist und die Anfragende selbst die Lehrer-Rolle hat. Wechselt jemand den Bereich, gilt sofort die neue Zuordnung (Edge Case der Spec), weil jedes Mal neu geprüft wird.

### Herunterladen, Zähler, Anpassen

| Aktion | Was passiert |
|---|---|
| Herunterladen | Der Server prüft die Sichtbarkeit (sonst 404), zählt höchstens einmal je Person und Tag, stellt dann den kurzlebigen Link (120 s) zur fertigen Datei aus. Die Datei läuft nie durch die App. |
| Anpassen | Der Server prüft Sichtbarkeit und die Speichergrenze der ladenden Lehrkraft (wie bei PROJ-52 zu Beginn, nie mittendrin). Dann legt er ein **neues Material** an: Titel „[Titel] (Kopie)“, gleiches Werkzeug, Antwort, Einstellungen und Prüfbericht übernommen, fertige Datei und Bilder-Auszug im Speicher kopiert, **kein Skript, keine Einlesung**. Danach öffnet er es bei Schritt 4. Das Original bleibt unberührt. |
| Teilen ändern | Stufe wechseln, Bereiche oder Personen ändern, Notiz anpassen: wirkt sofort. „Nur ich“ entfernt die Freigabe samt Downloadzählern. |
| Material überarbeiten, während es geteilt ist | Das Regal zeigt die neue Fassung, sobald sie gebaut ist. Die Freigabe bleibt. Bis dahin bleibt die zuletzt gebaute Fassung ladbar (wie in PROJ-52). |

Eine Kopie ist ein ganz normales Material der ladenden Lehrkraft: Sie kann es umbenennen, teilen, löschen, überarbeiten (ohne „Kapitel neu anfragen“, siehe Fund 5). Teilt sie es weiter, ist der Urheber an der Herkunft erkennbar.

### Das Regal ansehen

- **Eine Abfrage pro Seite** (30 Karten), Suche, Fach- und Werkzeugfilter, Sortierung werden in der Abfrage erledigt, nicht in der Oberfläche. Das hält 500 sichtbare Einträge unter einer Sekunde.
- **Die Filter-Chips** zeigen nur Werte, die im sichtbaren Regal tatsächlich vorkommen. Dafür braucht es eine kleine zweite Abfrage für die Filterwerte.
- **Suche** in Titel und Notiz, ohne Beachtung der Groß-/Kleinschreibung. Eingaben werden so behandelt, dass Sonderzeichen nichts „auslösen“.
- **Name der Lehrkraft:** der Anzeigename, nie die E-Mail-Adresse. Die Umsetzung folgt dem Lehrerzimmer (PROJ-63), falls das dort schon gelöst ist.
- **Personensuche im Dialog** liefert nur Name und Kennung von Lehrer-Rollen, ohne E-Mail und ohne Azubis.

### Moderation durch den Super-Admin

- Eigene Ansicht im Reiter, nur für den Super-Admin sichtbar. Sie listet alle aktiven Freigaben mit Besitzer, Stufe und Ladezahl.
- „Aus dem Regal nehmen“ verlangt einen kurzen Grund. Die Freigabe bekommt den Vermerk „entnommen von, am, Grund“ und verschwindet aus jedem Regal. Das Material selbst bleibt unangetastet bei der Besitzerin oder dem Besitzer, der Super-Admin kann es **nicht löschen**.
- Die Besitzerin oder der Besitzer sieht in „Meine Materialien“ die Pill „vom Admin aus dem Regal genommen“ mit dem Grund.
- Der Vorgang wird protokolliert. Die Spec nennt dafür das „Änderungsprotokoll“. Das aus PROJ-47 deckt Fragen und Lerninhalte ab. Für die Regal-Entnahme genügt der Vermerk an der Freigabe (wer, wann, Grund). Soll ein Eintrag im Änderungsprotokoll zusätzlich entstehen, ist das eine Rückfrage im Backend.

### Edge Cases (wie sie gelöst sind)

| Fall | Lösung |
|---|---|
| Lehrkraft wechselt den Fachbereich | Es wird jedes Mal neu geprüft, die neue Zuordnung gilt sofort. |
| Lehrkraft ohne Fachbereich | Stufe „Mein Fachbereich“ ist ausgegraut mit „Trage dich unter Meine Fächer ein“. Alle anderen Stufen gehen. |
| Ausgewählte Person verliert die Rolle | Sie sieht nichts mehr. Im Dialog erscheint sie als „kein Zugang mehr“-Chip und lässt sich entfernen. |
| Besitzer verliert die Rolle | Die Prüfung schlägt fehl, das Material verschwindet aus dem Regal. Kopien anderer bleiben. |
| Konto der Besitzerin oder des Besitzers wird gelöscht | Freigabe und Material verschwinden mit (die **Dateien im Speicher** muss PROJ-60 ausdrücklich mit entfernen, wie schon in PROJ-52 vermerkt). Kopien anderer bleiben. |
| Mehr als 50 Ausgewählte | Der Dialog verhindert es mit Hinweis auf „Fachbereich“ oder „Alle“. Die Datenbank erzwingt es zusätzlich. |
| Download-Missbrauch | Je Person, Freigabe und Tag zählt es einmal (Regal-Downloads). |
| Original nach „Anpassen“ gelöscht | Die Kopie bleibt, die Herkunft bleibt als Text stehen. |
| Zwei Personen laden gleichzeitig | Zählen getrennt. Doppelte Einträge derselben Person am selben Tag werden von der Datenbank abgewiesen und gelten als „schon gezählt“. |

### Sicherheit
- Jeder Aufruf prüft zuerst die Lehrer-Rolle (wie überall in der Werkzeugkiste). Nicht berechtigt heißt 404, nie 403, damit niemand Material „erraten“ kann.
- **Skript, Prompt, Einlesung und Antwort sind für Fremde nie abrufbar:** Das Regal liest nur aus der schmalen Sicht, und der Speicher hat weiter keine Regeln für angemeldete Nutzer.
- Download-Adressen bleiben kurzlebig (120 Sekunden) und nicht erratbar.
- „Anpassen“ kopiert **innerhalb des Speichers** vom Ordner der Besitzerin oder des Besitzers in den Ordner der ladenden Lehrkraft. Es werden nur die fertige Datei und der Bilder-Auszug kopiert, nie Skript oder Einlesung.
- Notiz, Titel und Personennamen werden nur als Text angezeigt, nie als Seitenbestandteil gedeutet. Länge und Zeichen werden serverseitig geprüft.
- Keine Inhalte (Titel, Notizen, Antworten) in Fehlerberichten.
- **Urheberrecht:** Das Regal enthält nur Material, das die Lehrkraft selbst freigibt (E3). Die Entnahme durch den Super-Admin ist der Schutz bei Beschwerden.

### Tech Decisions (warum so)

| Entscheidung | Warum |
|---|---|
| Freigabe als eigene Tabelle, nicht als Spalte an den Abläufen | So bleiben die strengen Regeln der Ablauf-Tabelle („nur eigene Zeilen, auch der Super-Admin sieht fremde nicht“) unangetastet. Eine Lockerung dort könnte Skript und Antwort versehentlich freigeben. |
| Regal liest aus einer schmalen Sicht, nie aus den Abläufen | Macht E2 technisch erzwungen. Selbst ein Fehler in der Oberfläche kann keine Skriptfelder zeigen, weil die Sicht sie nicht enthält. |
| Eine einzige Berechtigungsprüfung für Liste, Einzelaufruf, Download, Anpassen | Verhindert, dass ein Weg großzügiger ist als der andere (der häufigste Fehler bei Teilen-Funktionen). |
| Personen und Bereiche in eigenen Tabellen | Mehrere Bereiche und bis zu 50 Personen je Freigabe lassen sich so einzeln prüfen, begrenzen und in der Datenbank erzwingen. |
| Download-Zähler als Einträge je Person und Tag | Setzt „mehrfach am selben Tag zählt einmal“ ohne Sonderlogik um. Die Summe lässt sich daraus rechnen. |
| „Anpassen“ legt ein neues Material an, nie einen Verweis | Das Original darf sich nie unter der Kopie ändern. Wer das Original später löscht oder entnimmt, zerstört keine Kopie. |
| Bilder-Auszug statt Einlesung für die Kopie | Gibt der Kopie, was sie zum Neubauen braucht, aber nichts, was nicht ohnehin in der Datei steckt. |
| Entwürfe sind nicht teilbar | Ein Regal voller Halbfertigem wäre unbrauchbar. Teilen gibt es nur für fertige Materialien. |
| Entnahme als Vermerk an der Freigabe | Das Material bleibt unverändert und die Besitzerin oder der Besitzer erfährt den Grund. Wer, wann, Grund bleiben nachvollziehbar. |

### Aufteilung in zwei Pakete (jedes einzeln live)

| Paket | Inhalt | Warum getrennt |
|---|---|---|
| **1 – Teilen & Regal** | Die vier neuen Tabellen mit Zugriffsregeln, „Teilen …“-Dialog, Spalte „Regal“, Regal-Reiter mit Filter, Suche, Sortierung und Nachladen, Herunterladen mit Zähler, Hinweis im Löschen-Fenster | Das ist der Kern: ab hier können Lehrkräfte teilen und finden. Es braucht den Kern (Python) nicht und ändert keinen Bau-Code. |
| **2 – Anpassen & Moderation** | Bilder-Auszug beim Fertigstellen (und Nachholen für ältere Materialien), „Anpassen“ als Kopie, die zwei Ausgrauen-Texte, Moderationsansicht des Super-Admins mit Entnahme | „Anpassen“ greift in den ausgelieferten Bau-Schritt von PROJ-52 ein. Das soll einzeln prüfbar sein und das Teilen nicht aufhalten. Die Moderation kommt hier mit, weil sie erst mit echtem Regal-Inhalt sinnvoll testbar ist. |

### Dependencies
- **Lern-App:** keine neuen Pakete.
- **Werkzeugkiste-Kern:** keine Änderung nötig (der Bilder-Auszug entsteht in der App beim Bauen, falls der Bau-Schritt die benutzten Bilder dort kennt; das ist im Backend zu klären).
- **Einrichtung:** eine Datenbank-Migration (vier neue Tabellen, eine Sicht, die Berechtigungsfunktion, ein neues Feld „Herkunft“). Die Ablauf-Tabelle und der tägliche Zeitplan bleiben im Kern unverändert. Der Zeitplan räumt beim Löschen eines Materials den Bilder-Auszug mit weg.

### Auswirkungen auf andere Features
- **PROJ-52 (Meine Materialien):** Spalte „Regal“, Menüeintrag „Teilen …“, Hinweis im Löschen-Fenster, zwei Ausgrauen-Texte, Bilder-Auszug im Bau-Schritt.
- **PROJ-60 (Konto löschen):** muss neben den Ablauf-Dateien auch den Bilder-Auszug mit entfernen (steht schon als Auftrag aus PROJ-52).
- **PROJ-44/48 (Lehrer-Rolle, Zuständigkeiten):** Rollenentzug und Zuordnungswechsel wirken sofort, weil das Regal bei jedem Aufruf neu prüft. Das ist **keine** Änderung an diesen Features.
- **PROJ-63 (Lehrerzimmer):** Beide zeigen Lehrkräfte per Anzeigename. Falls das dort schon gelöst ist, wird es übernommen.

### Freigabe der Zugriffsregeln (Projektregel) – erteilt 2026-11-01
Laut `.claude/rules/security.md` brauchen Änderungen an Zugriffsregeln ausdrücklich deine Zustimmung. Dieses Feature **ändert keine bestehende Regel**, legt aber für vier neue Tabellen neue an und führt eine neue Berechtigungsfunktion ein. Vor dem Bau des Backends bitte bestätigen.

### Bestätigt (Nutzer, 2026-11-01: „ok gerne weiter bis deploy“)
Nach einer Entnahme durch den Super-Admin kann die Besitzerin oder der Besitzer das Material **nicht erneut teilen**, bis der Super-Admin es wieder zulässt. Sonst ließe sich die Entnahme (z. B. bei Urheberrechtsproblemen) mit einem Klick umgehen. Die Spec sagt dazu nichts.

### Modellempfehlung für den Bau
- **Paket 1 (Teilen & Regal):** Sonnet 5.5. Sicherheitsregeln nach klarem Muster, viel Oberfläche, aber alles bekannt aus PROJ-51 und PROJ-52.
- **Paket 2 (Anpassen & Moderation):** Sonnet 5.5. Opus nur, wenn der Bilder-Auszug im Bau-Schritt festfährt.

## Umsetzung Paket 1 „Teilen & Regal“ (2026-11-01)

**Stand:** Paket 1 ist live (2026-11-01). Code getestet (2052 Tests grün, `tsc` und `npm run build` ohne Fehler), Migration von der Nutzerin oder dem Nutzer im SQL-Editor angewendet (der Zugriff auf die Produktions-Datenbank per MCP wurde für Schreibzugriffe abgelehnt).

### Was gebaut wurde
- **Migration** [20261101_proj53_regal.sql](../supabase/migrations/20261101_proj53_regal.sql) (Rückweg: `…_down.sql`): Tabellen `regal_freigaben`, `regal_freigabe_bereiche`, `regal_freigabe_personen`, `regal_downloads`. Angemeldete Nutzer dürfen nur ihre **eigenen** Freigaben lesen, nichts direkt schreiben. Alles andere läuft über Funktionen: `regal_darf_sehen` (die eine Sichtbarkeitsregel), `regal_in_bereich`, `regal_liste`, `regal_filterwerte`, `regal_lehrkraefte`, `regal_freigabe_lesen`, `regal_freigabe_setzen`, `regal_freigabe_entfernen`, `regal_download_vorbereiten`. Die Ablauf-Tabelle und ihre Regeln sind **nicht angefasst**.
- **Schnittstellen** unter `/api/admin/werkzeugkiste`: `GET /regal`, `GET /regal/optionen`, `GET /regal/lehrkraefte`, `GET /regal/:id/download`, `GET/PUT/DELETE /ablaeufe/:id/freigabe`. `GET /materialien` liefert je Material den Vermerk `regal`.
- **Oberfläche:** `TeilenDialog` (aus dem Menü ⋯ und aus Schritt 5), Spalte „Regal“ mit Pill, Hinweis im Löschen-Fenster, Reiter `RegalReiter` mit Suche, Sortierung, Fach- und Werkzeug-Chips, Raster und „Mehr laden“.
- **Gemeinsame Hilfen:** `werkzeugkiste-regal.ts` (Typen, Texte), `werkzeugkiste-regal-server.ts` (Eingabeprüfung, Fehlerabbildung).

### Abweichungen und Hinweise
- **Reine Text-Materialien** (LearningApps) lassen sich teilen, aber nicht herunterladen. Die Karte sagt das. Übernehmen geht erst mit „Anpassen“ (Paket 2).
- **„Anpassen“ und die Moderationsansicht fehlen noch** (Paket 2). Die Datenbank kennt die Entnahme (`entnommen_*`) und sperrt danach das erneute Teilen schon jetzt.
- **Notiz-Zeichenprüfung** lässt nur Steuerzeichen außer Zeilenumbruch und Tabulator weg (NUL kann in Text ohnehin nicht vorkommen).
- **Spec-Auslegung „Fach“:** Auswahl = alle aktiven Fächer, die eigenen Zuständigkeiten stehen oben und sind markiert.

## QA Test Results – Paket 1 „Teilen & Regal“ (2026-11-01)

**Ergebnis: bestanden, keine kritischen oder hohen Fehler.** Geprüft wurde die Datenbank mit einem Probe-Skript ([supabase/tests/proj53_regal_probe.sql](../supabase/tests/proj53_regal_probe.sql)), das Migration und Tests in einem Lauf ausführt und am Ende alles zurückrollt. Das Skript lief im SQL-Editor durch, alle Zeilen entsprachen der Erwartung.

| Bereich | Geprüft | Ergebnis |
|---|---|---|
| Sichtbarkeit | Stufe Fachbereich: Kollege im Bereich sieht es, fremder Bereich, Azubi und Super-Admin (nicht im Bereich) nicht · Stufe „Alle“: Lehrkräfte ja, Azubi nein · Stufe „Ausgewählte“: nur die Gewählten, Karte meldet „mit dir geteilt“ | bestanden |
| Grenzen | fremder Bereich, 51 Personen, Azubi als ausgewählte Person, Notiz mit 201 Zeichen, Steuerzeichen: alle abgelehnt · fremdes Material lässt sich weder teilen noch entfernen (Freigabe bleibt) | bestanden |
| Zähler | zwei Downloads derselben Person am selben Tag zählen einmal · eigene Downloads zählen nicht · Download ohne Berechtigung liefert nichts | bestanden |
| Liste | Zähler, Filterwerte, Suche; ein einzelnes Prozentzeichen als Suche wirkt wörtlich und findet nichts | bestanden |
| Rechte | Besitzer liest eigene Freigaben direkt · direktes Schreiben und Lesen der Downloads für angemeldete Nutzer gesperrt · Kollege sieht fremde Freigaben und fremde Abläufe nicht · anonyme Aufrufe der Funktionen abgelehnt · Personensuche liefert Azubis nie | bestanden |
| Entnahme (Datenbankteil) | nach Entnahme sieht niemand das Material, die Besitzerin oder der Besitzer kann weder erneut teilen noch entfernen und sieht den Grund | bestanden |
| Rollenverlust, Löschen | Besitzer ohne Lehrer-Rolle: Material verschwindet aus dem Regal · Material löschen nimmt Freigabe und Downloads mit | bestanden |
| Oberfläche und Schnittstellen | 2052 Tests grün (u. a. Dialog, Regal-Reiter, Spalte „Regal“, alle Routen); `tsc` und `npm run build` ohne Fehler | bestanden |

### Hinweise (keine Fehler)
- **Nicht geprüft:** ein angemeldeter Durchlauf im Browser. Der Nutzer hat bewusst keinen Entwicklungsserver (stürzt den Rechner ab). Bitte einmal mit einem Lehrkraft-Konto den Reiter „Regal des Kollegiums“, „Teilen …“ im Menü ⋯ und Schritt 5 öffnen.
- Die Probe lief gegen Bereichs-Admins als Testpersonen, weil es in der Datenbank noch keine Konten mit der Rolle „Lehrkraft“ gibt. Die Regel für eingetragene Lehrkräfte (Zuständigkeit unter „Meine Fächer“) ist durch dieselbe Funktion abgedeckt, aber nicht mit echten Einträgen durchgespielt.
- Die Entnahme durch den Super-Admin ist nur im Datenbankteil gebaut, die Oberfläche kommt mit Paket 2.

## Deployment – Paket 1 (2026-11-01)
- Migration `20261101_proj53_regal.sql` im SQL-Editor angewendet. Geprüft danach: 4 Tabellen mit Zeilenschutz, 9 Funktionen, 3 Zugriffsregeln, 0 Freigaben.
- Push auf `main` (Commits f20011c, 90e6daa, 920b894), Vercel-Build „Ready“.
- Ohne Anmeldung liefern alle neuen Routen 401 (Lesen, Teilen, Entfernen, Download, Optionen, Personensuche, Meine Materialien). Vercel-Fehlerprotokoll der letzten 15 Minuten leer.

## Umsetzung Paket 2 „Anpassen & Moderation“ (2026-11-02)

**Stand:** Code fertig und getestet (2095 Tests grün, `tsc`, ESLint ohne Fehler, `npm run build` ohne Fehler). **Die zweite Migration ist noch nicht angewendet** und muss **vor dem Push** in die Datenbank, weil die App ab jetzt neue Spalten der Ablauf-Tabelle liest (`herkunft_name`, `auszug_am`). Ohne Migration bricht die ganze Werkzeugkiste.

### Was gebaut wurde
- **Bilder-Auszug ohne Änderung am Kern:** Beim Bauen (und beim ersten Teilen älterer Materialien) legt die App aus der Einlesung eine zweite Datei `auszug.zip` an. Sie enthält denselben Aufbau wie die Einlesung (`text.txt` und `images/…`), aber als Text nur einen Platzhalter und nur die Bilder, deren Dateiname in der Antwort vorkommt. Der Skripttext kommt nie mit. Dafür neues direktes Paket `fflate` (war schon als Unterpaket im Projekt).
- **Gegenprobe mit dem echten Kern** (lokal, mit Testheft und einer Antwort mit Bild): `bauen` liefert mit dem Auszug eine **byte-gleiche** interaktive Seite und die gleichen H5P-Bilder wie mit der vollen Einlesung; die Prüfstelle läuft mit dem Auszug (lesbar). Deshalb braucht es keine Änderung und keinen neuen Deploy des Kerns.
- **Anpassen** (`POST /regal/:id/anpassen`): legt ein neues Material der ladenden Lehrkraft an (Titel „… (Kopie)“, gleiche Antwort, Einstellungen, Prüfbericht, fertige Datei und Vorschau), der Auszug wird die „Einlesung“ der Kopie. Kein Skript, kein Prompt, keine Dateiangaben des Originals. Speichergrenze wird am Anfang geprüft, bei fehlender Datei wird alles wieder aufgeräumt. Das Original bleibt unberührt.
- **Kopie in der App:** Feld `herkunft_name` (nur der Server setzt es, Trigger). Die Kopie beginnt bei Schritt 4 (kein Zurück zu Skript oder Prompt), „Gleiches Skript, anderes Werkzeug“ ist ausgegraut mit „Stammt aus dem Regal, es gibt kein Skript dazu“, in der Liste steht „aus dem Regal von [Name]“. Überarbeiten, Kapitel neu anfragen, Tippfehler und Neubauen gehen.
- **Prüfstelle bei Kopien:** Sie prüft nur, ob die Antwort lesbar ist. Ihre Befunde vergleichen mit dem Skripttext, den die Kopie nicht hat; sie wären Fehlalarme und entfallen.
- **Moderation** (nur Super-Admin): Umschalter „Regal | Moderation“ im Reiter, Tabelle aller Freigaben mit Besitzer, Stufe, Ladezahl. „Aus dem Regal nehmen“ verlangt einen Grund (3 bis 300 Zeichen), „Wieder zulassen“ hebt die Sperre auf (die gesperrte Freigabe wird gelöscht, die Besitzerin oder der Besitzer kann neu teilen). Beide Vorgänge stehen im Änderungsprotokoll (`admin_audit_log`: `regal_entnommen`, `regal_wieder_zugelassen`). Das Material selbst fasst die Moderation nie an.
- **Migration** [20261102_proj53_paket2.sql](../supabase/migrations/20261102_proj53_paket2.sql) (Rückweg `…_down.sql`): neue Felder, Schutz-Trigger, `regal_liste` mit „anpassbar“ (Drop und neu), `regal_anpassen_quelle`, `regal_moderation_liste`, `regal_entnehmen`, `regal_wieder_zulassen`. Probe-Skript: [supabase/tests/proj53_paket2_probe.sql](../supabase/tests/proj53_paket2_probe.sql) (rollt am Ende alles zurück).

### Abweichungen und Hinweise
- **„Anpassen“ erscheint nur, wenn ein Bilder-Auszug da ist.** Bei Materialien, die vor Paket 2 gebaut wurden, entsteht er beim ersten Teilen (Einlesung muss dann noch vorhanden sein). Ältere, schon geteilte Materialien haben noch keinen; sie lassen sich laden, aber nicht anpassen, bis die Besitzerin oder der Besitzer die Freigabe einmal speichert oder das Material neu baut.
- Die Kopie trägt zur Speichergrenze der ladenden Lehrkraft bei (Datei, Vorschau, Auszug).
- Die Entnahme hat für die Besitzerin oder den Besitzer zwei Stellen: Pill in „Meine Materialien“ und Hinweis mit Grund im Teilen-Dialog.
