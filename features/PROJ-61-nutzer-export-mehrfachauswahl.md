# PROJ-61: Nutzer – CSV-Export & Mehrfachauswahl (Super-Admin)

## Status: Architected
**Created:** 2026-10-27
**Last Updated:** 2026-11-03

## Kontext
Der Super-Admin pflegt Konten heute einzeln. Zu Schuljahresbeginn oder bei Bereichs-Umstellungen müssen aber viele Konten gleich behandelt werden. Außerdem braucht er die Liste als Datei, z. B. für Gespräche mit Ausbildungsbetrieben oder als Übersicht für Kolleginnen und Kollegen.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1:** Export und Mehrfachauswahl gibt es **nur für den Super-Admin**.

## Dependencies
- Requires: PROJ-57 (Sortieren & Filter; der Export nimmt genau diese Ansicht)
- Berührt: PROJ-24 (Bereich verschieben), bestehendes Sperren/Entsperren

## User Stories
- Als **Super-Admin** möchte ich die aktuell gefilterte und sortierte Liste als CSV herunterladen, damit ich sie in Excel weiterverwenden kann.
- Als **Super-Admin** möchte ich mehrere Personen ankreuzen und auf einmal sperren oder entsperren, damit ich z. B. einen abgeschlossenen Jahrgang schnell stilllege.
- Als **Super-Admin** möchte ich mehrere Personen auf einmal in einen anderen Fachbereich verschieben.
- Als **Super-Admin** möchte ich mit einem Klick alle gefilterten Personen auswählen, z. B. „seit 30 Tagen inaktiv“.

## Acceptance Criteria

### CSV-Export
- [ ] Im Seitenkopf gibt es „Exportieren“ (`variant="outline"`, Download-Icon).
- [ ] Exportiert werden genau die gerade sichtbaren Zeilen in der sichtbaren Reihenfolge (Suche, Filter, Sortierung, Bereichs-Ansicht).
- [ ] Spalten: Name, E-Mail, Rolle, Bereich, XP, Level, Streak, Letzte Session, Letzter Login, Status, Registriert am.
- [ ] Format: Semikolon als Trennzeichen, UTF-8 mit BOM (Umlaute in Excel korrekt), deutsches Datumsformat `TT.MM.JJJJ`.
- [ ] Dateiname: `nutzer-{bereich oder alle}-{JJJJ-MM-TT}.csv`.
- [ ] Zellen, die mit `=`, `+`, `-` oder `@` beginnen, werden entschärft (CSV-Injection).
- [ ] Sind Zeilen angekreuzt, fragt der Button: „Nur Auswahl ({n})“ oder „Alle sichtbaren ({m})“.
- [ ] Jeder Export erzeugt einen Protokoll-Eintrag `user.export` mit Anzahl und Filter (ohne Personendaten).

### Mehrfachauswahl
- [ ] Die Tabelle bekommt für den Super-Admin vorne eine Checkbox-Spalte. Die erste Spalte bleibt dann nicht stehen (Regel aus PROJ-45).
- [ ] Die Checkbox in der Überschrift wählt alle **sichtbaren** Zeilen aus oder ab. Ist nur ein Teil gewählt, zeigt sie den Zwischenzustand.
- [ ] Bei mindestens einer Auswahl erscheint eine Aktionsleiste: „{n} ausgewählt“ · Sperren · Entsperren · Bereich ändern · Exportieren · Auswahl aufheben. Am Handy steht sie fest am unteren Rand.
- [ ] Jede Sammelaktion fragt per `AlertDialog` nach und nennt die Anzahl. Bei mehr als 5 Personen nennt sie die ersten 5 Namen plus „und {x} weitere“.
- [ ] „Bereich ändern“ fragt den Ziel-Bereich ab (Auswahlfeld mit allen Fachbereichen).
- [ ] Nach der Aktion zeigt ein Toast das Ergebnis: „{a} gesperrt“ bzw. „{a} von {n} gesperrt, {b} fehlgeschlagen“ mit „Details“.
- [ ] Jede einzelne Änderung erzeugt ihren eigenen Protokoll-Eintrag (wie bei der Einzelaktion).
- [ ] Ändern sich Filter oder Suche, bleibt die Auswahl erhalten. Die Leiste zählt aber nur, was noch sichtbar ist. Ausgeblendete Zeilen werden nicht verändert.

### Rechte
- [ ] Bereichs-Admins sehen weder Checkboxen noch Export. Die Sammel-Route lehnt sie mit 403 ab.
- [ ] Das eigene Konto und der verknüpfte Zweitaccount werden bei Sammelaktionen übersprungen und im Ergebnis als „übersprungen“ genannt.

## Edge Cases
- Super-Admin-Konten in der Auswahl: Sie werden bei Sperren und Verschieben übersprungen („übersprungen: Super-Admin“).
- Bereichs-Admins in der Auswahl werden verschoben: Ihre Rolle hängt am Bereich. Sie werden deshalb übersprungen mit dem Hinweis „Rolle zuerst ändern“.
- Sehr große Auswahl (> 200): Die Aktion läuft in Teilen und zeigt einen Fortschritt. Ein Abbruch mittendrin hinterlässt einen klaren Stand („120 von 300 erledigt“).
- Leere Liste: „Exportieren“ ist deaktiviert.
- Netzfehler mitten in einer Sammelaktion: bereits erledigte Änderungen bleiben. Der Toast nennt, was fehlt, und „Erneut versuchen“ wiederholt nur die fehlgeschlagenen.

## Technical Requirements (optional)
- CSV wird im Browser aus den bereits geladenen Daten erzeugt. Es gibt keinen zusätzlichen Personendaten-Abruf.
- Sammelaktionen: eine Server-Route mit Liste von IDs, höchstens 500 pro Aufruf.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
**Frontend plus eine kleine Server-Erweiterung, keine Datenbank-Änderung.**
- Der **CSV-Export** entsteht im Browser aus der bereits geladenen Liste (so verlangt es die Spec). Der Server bekommt nur eine kurze Meldung „Export mit n Zeilen“ fürs Protokoll.
- Die **Sammelaktionen** (Sperren, Entsperren, Bereich ändern) brauchen eine neue Server-Schnittstelle. Nur dort lassen sich Rechte prüfen, Konten überspringen und jede Änderung einzeln protokollieren.
- Es gibt keine neue Tabelle und keine Migration. Das Protokoll (`admin_audit_log`) nimmt die neuen Einträge ohne Änderung auf.

### Komponenten-Struktur
```
Nutzer-Seite (/admin/users) — bestehend
+-- AdminPageHeader „Nutzer“ — bestehend
|   +-- NEU: Button „Exportieren“ (outline, Download-Icon; nur Super-Admin)
|        +-- ohne Auswahl: exportiert sofort alle sichtbaren Zeilen
|        +-- mit Auswahl: kleines Menü „Nur Auswahl (n)“ / „Alle sichtbaren (m)“
+-- Filterleiste — bestehend (Suche, Rolle, Aktivität, Sortieren, Alle Bereiche)
+-- Tabelle — bestehend
|   +-- NEU (nur Super-Admin): Checkbox-Spalte ganz vorn
|   |    +-- Überschrift: alle sichtbaren an/ab, Zwischenzustand bei Teilauswahl
|   |    +-- je Zeile: Checkbox (nicht für das eigene Konto)
|   +-- Erste Spalte bleibt für den Super-Admin nicht stehen (Regel PROJ-45)
+-- NEU: Aktionsleiste „{n} ausgewählt“
|   +-- Sperren · Entsperren · Bereich ändern · Exportieren · Auswahl aufheben
|   +-- Desktop: unter der Filterleiste · Handy: fest am unteren Rand
+-- NEU: Bestätigungs-Dialog für Sammelaktionen (AlertDialog)
|   +-- Anzahl, erste 5 Namen + „und {x} weitere“
|   +-- bei „Bereich ändern“: Auswahlfeld mit allen Fachbereichen
|   +-- Fortschrittsbalken, solange die Aktion läuft
+-- NEU: Ergebnis-Toast mit „Details“ und „Erneut versuchen“
     +-- Details: Liste der übersprungenen und fehlgeschlagenen Konten mit Grund
```

### Daten (in Alltagssprache)
Es wird **nichts Neues gespeichert**. Neu sind nur Protokoll-Einträge und zwei zusätzliche Felder in der Nutzerliste:

- **Protokoll „Export“** (`user.export`): wer, wann, wie viele Zeilen, welcher Filter und welche Sortierung. **Keine Namen, keine E-Mails.**
- **Protokoll „Sammelaktion“:** pro betroffener Person ein eigener Eintrag, genau wie bei der Einzelaktion (`user.ban`, `user.unban`, `user.move_department`). In der Protokoll-Seite und auf der Detailseite (PROJ-59) erscheinen sie damit ohne weiteren Aufwand.
- **Nutzerliste (bestehende Schnittstelle) liefert zwei Felder mehr:** „Registriert am“ (steht schon in der Profil-Tabelle, wurde bisher nur nicht mitgeschickt) und den **Bereichsnamen immer**, nicht nur in „Alle Bereiche“. Beides braucht die CSV. Es ist dieselbe Personengruppe wie heute, nur zwei Felder mehr.
- **Auswahl:** Die angekreuzten Personen merkt sich nur die geöffnete Seite (nicht der Browser-Speicher, nicht die Adresse). Neuladen leert die Auswahl. Das ist gewollt: Eine Sammelaktion soll nie auf einer vergessenen Auswahl von gestern laufen.

### Die CSV-Datei
- Spalten, Trennzeichen (Semikolon), UTF-8 mit BOM, Datumsformat `TT.MM.JJJJ` und Dateiname wie in der Spec.
- „Level“ wird aus den XP berechnet (dieselbe Formel wie in der App), nicht gespeichert.
- **CSV-Injection-Schutz:** Textzellen, die mit `=`, `+`, `-` oder `@` beginnen, bekommen ein vorangestelltes Zeichen, sodass Excel sie nie als Formel liest. Das gilt für Namen und E-Mails, denn Azubis wählen ihren Namen selbst.
- Der Export hat **eine** feste Quelle: dieselbe gefilterte und sortierte Liste, die die Tabelle zeigt. So stimmen Datei und Bildschirm immer überein.
- Ablauf: erst Protokoll-Meldung an den Server, danach der Download. Schlägt die Meldung fehl, gibt es **keinen** Download („Export konnte nicht protokolliert werden“). So gibt es keinen unprotokollierten Export von Personendaten.

### Die Sammelaktion (Server)
Eine neue Schnittstelle nimmt eine Aktion und eine Liste von Konto-Ids (höchstens 500) und antwortet **pro Person** mit „erledigt“, „übersprungen (Grund)“ oder „fehlgeschlagen“. Sie ist nur für den Super-Admin; Bereichs-Admins und Lehrkräfte bekommen 403, auch wenn sie die Adresse direkt aufrufen.

Der Server entscheidet selbst, wen er überspringt. Der Browser blendet nur aus, der Server erzwingt:

| Fall | Sperren / Entsperren | Bereich ändern |
|---|---|---|
| Eigenes Konto | übersprungen | übersprungen |
| Verknüpfter Zweitaccount | übersprungen | übersprungen |
| Super-Admin-Konto | übersprungen („Super-Admin“) | übersprungen („Super-Admin“) |
| Bereichs-Admin | wird gesperrt | übersprungen („Rolle zuerst ändern“) |
| Konto existiert nicht mehr | übersprungen („nicht gefunden“) | übersprungen („nicht gefunden“) |
| Schon im Ziel-Bereich / schon gesperrt | übersprungen („schon erledigt“) | übersprungen („schon dort“) |

Jede erfolgreiche Änderung schreibt sofort ihren eigenen Protokoll-Eintrag. Bricht etwas mittendrin ab, bleibt alles Erledigte gültig und protokolliert.

### Große Auswahl und Fehler
- Der Browser schickt die Auswahl in **Teilen zu je 100** (die Obergrenze von 500 pro Aufruf bleibt als Sicherung auf dem Server). Ein Fortschrittsbalken zeigt „120 von 300 erledigt“.
- Bei Netzfehler oder Abbruch bleibt der Stand klar: Der Toast nennt, was erledigt ist und was fehlt. „Erneut versuchen“ schickt **nur** die fehlgeschlagenen Ids noch einmal.
- Nach der Aktion wird die Liste neu geladen. Erfolgreich bearbeitete Personen werden abgewählt, übersprungene und fehlgeschlagene bleiben angekreuzt (für „Erneut versuchen“ bzw. zum Nachsehen in „Details“).
- Während eine Aktion läuft, sind Filter und Auswahl gesperrt, damit sich die Ziel-Liste nicht unter der Aktion ändert.

### Tech-Entscheidungen
| Entscheidung | Warum |
|---|---|
| CSV im Browser erzeugen | So verlangt es die Spec. Es gibt keinen zweiten Abruf von Personendaten, und Datei und Bildschirm können nicht auseinanderlaufen. |
| Trotzdem Protokoll-Meldung an den Server, vor dem Download | Personendaten verlassen das System. Das soll nachvollziehbar sein, und zwar ohne Personendaten im Protokoll. |
| Eine neue Sammel-Schnittstelle statt 300 Einzelaufrufe | Die Rechte- und Überspringen-Regeln stehen dann an einer Stelle auf dem Server und lassen sich testen. Die bestehende Einzel-Schnittstelle bleibt unverändert. |
| Pro Person ein Protokoll-Eintrag | Verlangt die Spec, und die Detailseite (PROJ-59) zeigt so auch Sammelaktionen am einzelnen Konto. |
| Teile zu je 100 im Browser | Fortschrittsanzeige und sauberes Fortsetzen, ohne dass ein einzelner Aufruf zu lange läuft. |
| Auswahl nur im Speicher der Seite | Keine vergessene Auswahl, keine Personendaten im Browser-Speicher. |
| Kein Rollenwechsel in der Sammelaktion | Steht nicht in der Spec; Rollen sind sicherheitsrelevant und bleiben Einzelaktion. |

### Neue Bausteine
- **CSV-Logik** als eigene getestete Datei (z. B. `src/lib/user-csv.ts`): Zeilen bauen, Injection entschärfen, Datum formatieren, Dateiname bilden. Reine Logik, vollständig mit Vitest prüfbar.
- **Auswahl-Logik** (z. B. in `src/lib/user-list.ts` oder eigener Hook): „sichtbare ∩ ausgewählte“, Zwischenzustand der Kopf-Checkbox.
- **Aktionsleiste** und **Sammel-Dialog** als eigene Komponenten unter `src/components/admin/`. Die bestehende Bereichs-Auswahl (`MoveDepartmentDialog`) ist auf eine Person zugeschnitten und wird nicht umgebaut; der Sammel-Dialog nutzt dieselbe Fachbereichs-Liste.
- **Neue Schnittstellen:** Sammelaktion (Sperren / Entsperren / Bereich ändern) und Export-Meldung. Beide nutzen den vorhandenen Super-Admin-Zugang und das vorhandene Protokoll.
- **Bestehend, wiederverwendet:** shadcn `Checkbox`, `AlertDialog`, `Progress`, `Select`, `DropdownMenu`; `SortableTableHead` und die Tabellen-Regeln aus PROJ-45/57.

### Abhängigkeiten (Pakete)
Keine neuen Pakete.

### Tests (geplant)
- **Unit:** CSV (Trennzeichen, BOM, Umlaute, Datum, Level, Injection für `=`/`+`/`-`/`@`, Anführungszeichen und Zeilenumbruch in Namen, leere Werte, Dateiname).
- **Schnittstelle:** 403 für Bereichs-Admin und Lehrkraft; Überspringen-Tabelle komplett; Teilfehler; mehr als 500 Ids; ungültige Ids; ein Protokoll-Eintrag pro Änderung; Export-Eintrag ohne Personendaten.
- **Komponente:** Kopf-Checkbox mit Zwischenzustand, Leiste zählt nur Sichtbares, Dialog nennt 5 Namen plus „und {x} weitere“, Export-Menü bei Auswahl, Bereichs-Admin sieht weder Checkboxen noch Export.

### Offene Punkte zur Freigabe
1. **Export blockiert, wenn das Protokoll nicht erreichbar ist.** Ich empfehle das (Datenschutz vor Bequemlichkeit). Alternative: trotzdem herunterladen und nur warnen.
2. **Übersprungene Super-Admins beim Entsperren.** Die Spec nennt nur Sperren und Verschieben. Ich überspringe sie bei allen drei Aktionen, damit die Regel einheitlich bleibt.
3. **Zwei Felder mehr in der Nutzerliste** („Registriert am“, Bereichsname immer). Das weicht minimal von „kein zusätzlicher Personendaten-Abruf“ ab, ist aber nötig für die in der Spec geforderten Spalten.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
