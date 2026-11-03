# PROJ-61: Nutzer – CSV-Export & Mehrfachauswahl (Super-Admin)

## Status: Deployed
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

### Umsetzung (2026-11-03)
- **Logik:** `src/lib/user-csv.ts` (CSV, Injection-Schutz, Datum, Dateiname; 17 Tests) und `src/lib/user-bulk.ts` (Überspringen-Regeln, Teile, Namensliste, Ergebnissatz; 12 Tests).
- **Schnittstellen:** `POST /api/admin/users/bulk` (Sperren / Entsperren / Bereich ändern, höchstens 500 Ids, 5 Konten gleichzeitig, pro Änderung ein Protokoll-Eintrag mit `details.bulk`) und `POST /api/admin/users/export-log` (Eintrag `user.export` mit Anzahl und Filter; nur ob gesucht wurde, nicht wonach). Beide: 401 ohne Anmeldung, 403 für alles außer Super-Admin.
- **Nutzerliste:** `GET /api/admin/users` liefert zusätzlich `created_at` und den Bereichsnamen immer.
- **Oberfläche:** `user-bulk-bar.tsx` (Aktionsleiste; Handy fest unten, ab 640 px über der Tabelle), `user-bulk-dialog.tsx` (Rückfrage mit Namen, Ziel-Bereich, Fortschrittsbalken; „Details“-Dialog), Seite `/admin/users` mit Checkbox-Spalte, Export-Button im Seitenkopf. Für den Super-Admin ist `ws-table-sticky` aus (Regel PROJ-45).
- **Tests:** 2353 Tests in 200 Dateien grün, `npm run build` grün, ESLint ohne Fehler (45 bestehende Warnungen, keine neuen in den eigenen Dateien).
- **Abweichungen von Spec und Design:**
  1. **Schon gesperrt / schon entsperrt** erkennt der Browser (er kennt den Status aus der Liste) und lässt diese Personen aus der Anfrage heraus. Der Dialog sagt „{k} ist schon gesperrt und wird ausgelassen“. Der Server sperrt idempotent. So entstehen keine Protokoll-Einträge ohne Änderung, ohne dass der Server pro Person den Sperr-Status nachschlagen muss.
  2. **„Exportieren“ in der Aktionsleiste** exportiert immer nur die Auswahl (die Leiste gehört zur Auswahl). Die Frage „Nur Auswahl / Alle sichtbaren“ stellt der Button im Seitenkopf, sobald etwas angekreuzt ist.
  3. **Dateiname:** Im Bereichs-Modus steht der Name des Bereichs aus den Daten (z. B. `nutzer-tourismus-2026-11-03.csv`), in „Alle Bereiche“ steht `alle`.
  4. **Level** in der CSV nutzt dieselbe Formel wie die App (`getLevelFromXp`).
- **Nicht geprüft:** Kein Browsertest (Nutzer-Vorgabe: kein Dev-Server). Die Optik auf 375 / 768 / 1440 px und der echte Download in Excel sind deshalb noch nicht von Hand angesehen.

## QA Test Results

**Datum:** 2026-11-03 · **Umfang:** Code-Review gegen alle Acceptance Criteria und Edge Cases, Unit-, Schnittstellen- und Komponententests, Build, Lint, Sicherheitsprüfung. **Kein** Browser-/Playwright-Test.

### Acceptance Criteria
| Bereich | Ergebnis |
|---|---|
| Export-Button im Kopf (outline, Download-Icon), nur Super-Admin | ✅ (Test: Bereichs-Admin sieht ihn nicht) |
| Export = sichtbare Zeilen in sichtbarer Reihenfolge | ✅ |
| 11 Spalten, Semikolon, UTF-8 mit BOM, `TT.MM.JJJJ` | ✅ (Test) |
| Dateiname `nutzer-{bereich/alle}-{Datum}.csv` | ✅ (Test, Berliner Datum) |
| CSV-Injection (`=` `+` `-` `@`, zusätzlich Tab/CR) | ✅ (Test) |
| Mit Auswahl: „Nur Auswahl (n)“ / „Alle sichtbaren (m)“ | ✅ (Test) |
| Protokoll `user.export` mit Anzahl und Filter, ohne Personendaten | ✅ (Test: kein Suchtext, keine Namen) |
| Checkbox-Spalte nur für Super-Admin, erste Spalte steht nicht fest | ✅ |
| Kopf-Checkbox wählt sichtbare an/ab, Zwischenzustand | ✅ (Test, `aria-checked="mixed"`) |
| Aktionsleiste mit allen fünf Einträgen, Handy fest unten | ✅ (Optik nicht im Browser gesehen) |
| `AlertDialog` je Sammelaktion mit Anzahl und bis zu 5 Namen + „und {x} weitere“ | ✅ (Test mit 230 Konten) |
| „Bereich ändern“ mit Auswahlfeld aller Fachbereiche | ✅ (Start gesperrt ohne Ziel) |
| Toast „{a} von {n} …“ mit „Details“ | ✅ (Test) |
| Pro Änderung ein eigener Protokoll-Eintrag | ✅ (Test: nicht für Übersprungene und Fehlgeschlagene) |
| Auswahl bleibt bei Filterwechsel, Leiste zählt nur Sichtbares | ✅ (Test) |
| Bereichs-Admin: keine Checkboxen, kein Export, 403 | ✅ (Seite + beide Schnittstellen getestet, auch Lehrkraft und Azubi) |
| Eigenes Konto und Zweitaccount übersprungen | ✅ (Checkbox gesperrt; Server überspringt zusätzlich) |

### Edge Cases
- Super-Admin in der Auswahl → übersprungen („Super-Admin“) bei Sperren, Entsperren und Verschieben ✅
- Bereichs-Admin beim Verschieben → „Rolle zuerst ändern“ ✅
- > 200 Konten → Teile zu je 100 mit Fortschritt ✅ (Test: 100 / 100 / 30)
- Leere Liste → „Exportieren“ deaktiviert ✅
- Netzfehler / Teilfehler → Erledigtes bleibt, Rest als fehlgeschlagen, „Erneut versuchen“ schickt nur diese Ids ✅ (Teilfehler getestet; der Weg „Erneut versuchen“ ist per Code-Review geprüft, nicht per Test)
- Kein Protokoll möglich → kein Download ✅ (Test)

### Sicherheit
- Beide Schnittstellen prüfen Anmeldung und Super-Admin **vor** jeder Datenbank-Abfrage; Ids sind per Zod als UUID begrenzt (höchstens 500), Aktion ist eine feste Liste, der Ziel-Bereich muss existieren. Der Service-Schlüssel wird nur nach der Super-Admin-Prüfung benutzt.
- Der Server erzwingt die Überspringen-Regeln selbst; die Oberfläche ist nur Anzeige. Kein Weg, per direktem Aufruf das eigene Konto, Super-Admins oder einen Zweitaccount zu ändern.
- Das Protokoll enthält keine Personendaten: weder Namen noch E-Mails noch Suchtext.
- Keine neue Datenbank-Änderung, also keine neue RLS-Regel und keine Migration.

### Bugs
Keine Critical/High gefunden. Offene Beobachtungen:
- **OBS-61-1 (Low):** „Erneut versuchen“ ist nur Teil des Toasts (15 s sichtbar). Danach hilft das erneute Ankreuzen, denn fehlgeschlagene Konten bleiben markiert. Absicht, kein Fehler.
- **OBS-61-2 (Low):** Browser-Prüfung steht aus (Optik, Download in Excel). Bitte einmal am Handy und am Laptop kurz ansehen.

**Ergebnis: Approved.**

## Deployment
- **Datum:** 2026-11-03 · **URL:** https://spedilern.vercel.app (Vercel-Projekt `spedilern`, Production, Status Ready nach 1 Minute Build)
- **Commits:** `7f7a17d` (Code), `48b477d` (Doku/QA) · **Tag:** `v1.61.0-PROJ-61`
- **Datenbank:** keine Migration nötig (nur neue Protokoll-Einträge in der bestehenden Tabelle).
- **Prüfung nach dem Deploy:** `POST /api/admin/users/bulk` und `POST /api/admin/users/export-log` antworten ohne Login mit 401, `GET /api/admin/users` ebenfalls; Vercel-Fehlerlog der letzten 15 Minuten leer.
- **Mit ausgeliefert:** Beim Push fuhren die noch nicht veröffentlichten, reinen Dokumentations-Commits der Specs PROJ-68/69 und der Status-Eintrag PROJ-60 mit (kein Code).
- **Offen:** Sichtprüfung im Browser durch den Nutzer (Handy und Laptop, Download in Excel), siehe OBS-61-2.
