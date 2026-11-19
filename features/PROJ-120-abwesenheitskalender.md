# PROJ-120: Abwesenheitskalender für Lehrkräfte (mit Vertretungsplanung)

## Status: Planned
**Created:** 2026-11-19
**Last Updated:** 2026-11-19

## Kontext
Abwesenheiten (Fortbildung, Dienstreise, Krankheit …) stehen heute nirgends gemeinsam sichtbar. Die Vertretungsplaner erfahren sie auf Umwegen. Dieses Feature bringt einen **gemeinsamen Kalender im Lehrkräfte-Bereich**: Alle Lehrkräfte sehen, wer wann fehlt. Die Vertretungsplaner sehen, wo noch eine Vertretung fehlt, und haken sie ab, sobald sie eingetragen ist. Die Anbindung an WebUntis oder Outlook ist ausdrücklich der **zweite Schritt** und nicht Teil dieser Spec.

### Entscheidungen (Nutzer, 2026-11-19)
- **E1 – Eigene Abteilungsliste:** Spedition, Touristik, Verkehrsservice, KEP, BIK/BVJ sowie „Alle“. Unabhängig von den Fachbereichen der Azubi-Inhalte (PROJ-22).
- **E2 – Vertretungsplaner = Zusatzrecht:** Der Super-Admin schaltet das Recht pro Lehrkraft ein. Es gibt keine neue Hauptrolle und beliebig viele Planer.
- **E3 – Arten:** Fortbildung, Unterrichtsgang, Dienstreise, Mitwirkung Abschlussprüfung, Klassenfahrt/Exkursion, Sonstige Abwesenheit. Krank wird als „Sonstige Abwesenheit“ eingetragen. Der Super-Admin kann weitere Arten hinzufügen.
- **E4 – Zeit:** ganze Tage oder wahlweise Uhrzeiten (von–bis).
- **E5 – Kein Datenschutz-Sonderweg:** Alle Lehrkräfte sehen alles, was eingetragen wird, auch den optionalen Freitext bei „Sonstige“. Niemand muss einen Grund nennen; „krank“ muss nicht als Grund stehen.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle), PROJ-24 (Rollenmodell, `requireAdmin()`), PROJ-45 (Layout, Seitenleiste, Tokens), PROJ-83 (Bedienmuster), PROJ-40/81 (Startseite, „Zu erledigen“-Karte)
- Berührt: PROJ-59 (Nutzer-Detailseite, dort wird das Planer-Recht gesetzt), PROJ-70 (Änderungsprotokoll)
- Folge-Feature (nicht Teil dieser Spec): Anbindung WebUntis / Outlook

## User Stories
- Als **Lehrkraft** möchte ich meine Abwesenheit (z. B. Fortbildung) mit Zeitraum eintragen, damit alle Bescheid wissen und eine Vertretung geplant werden kann.
- Als **Lehrkraft** möchte ich für eine Kollegin oder einen Kollegen eine Abwesenheit eintragen können, damit nichts verloren geht, wenn sie oder er es selbst nicht schafft.
- Als **Lehrkraft** möchte ich benachrichtigt werden, wenn jemand für mich einen Termin angelegt hat, damit ich ihn prüfen kann.
- Als **Lehrkraft** möchte ich im Kalender sehen, ob für eine Abwesenheit schon eine Vertretung eingetragen wurde, damit ich nicht nachfragen muss.
- Als **Vertretungsplaner** möchte ich sehen, welche Abwesenheiten noch keine Vertretung haben, und mit einem Klick abhaken, dass sie eingetragen ist.
- Als **Vertretungsplaner** möchte ich nach Abteilung filtern, damit ich nur die Fälle sehe, die ich bearbeite.
- Als **Lehrkraft** möchte ich einen Eintrag für eine, mehrere oder alle Abteilungen anlegen, weil eine Fortbildung mehrere Abteilungen betreffen kann.
- Als **Super-Admin** möchte ich festlegen, wer Vertretungsplaner ist, und neue Abwesenheitsarten anlegen.

## Acceptance Criteria

### Zugang & Navigation
- [ ] Neuer Eintrag „Kalender“ in der Seitenleiste des Lehrkräfte-Bereichs (`/admin/kalender`), sichtbar für alle Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin). Azubis sehen und erreichen ihn nicht (Seite leitet um, API antwortet 403).
- [ ] Der Kalender gilt für die ganze Schule und ist **unabhängig** vom Bereichs-Umschalter (PROJ-29).

### Ansichten
- [ ] Ansichten: **Monat**, **Woche** und **Liste**. Am Handy ist die Liste die Standardansicht. Am Rechner ist es der Monat.
- [ ] Navigation: Vor, Zurück, „Heute“, Sprung auf Monat/Woche. Die Woche beginnt am Montag, Datumsformat deutsch.
- [ ] Jeder Eintrag zeigt: Name der Lehrkraft, Art (Farbe plus Icon plus Text, nie nur Farbe), Zeitraum, Abteilungen (Kürzel), Vertretungsstatus.
- [ ] Mehrtägige Einträge laufen als Balken über die Tage. Einträge mit Uhrzeit zeigen sie.
- [ ] Ein Klick auf einen Eintrag öffnet die Details (Seitenschublade am Rechner, Vollbild-Blatt am Handy) mit allen Angaben, Ersteller, Änderungsdatum und den erlaubten Aktionen.
- [ ] An Tagen mit vielen Einträgen zeigt der Monat „+N weitere“, das die Tagesliste öffnet.

### Filter
- [ ] Filter nach Abteilung: **Alle · Spedition · Touristik · Verkehrsservice · KEP · BIK/BVJ** (Segment/Dropdown nach PROJ-83). Die Auswahl bleibt beim Seitenwechsel erhalten.
- [ ] „Alle“ zeigt alle Einträge. Ein Abteilungsfilter zeigt Einträge, die diese Abteilung enthalten, **und** Einträge, die für „alle Abteilungen“ angelegt wurden.
- [ ] Zusätzlicher Filter „Vertretung“: Alle · Offen · Eingetragen. Zusätzlich Filter nach Art und eine Suche nach Name.
- [ ] Der Planer-Filter „Offen“ ist für Planer vorbelegt erreichbar (ein Klick), ohne dass er für alle voreingestellt ist.

### Eintragen
- [ ] „Abwesenheit eintragen“ (eine grüne Hauptaktion im Seitenkopf) öffnet ein Formular mit: **Person** (Standard: man selbst, auswählbar aus allen Lehrkräften mit Suche), **Art**, **Von/Bis** (Datum), Schalter „Ganztägig“ (aus = Uhrzeit von–bis), **Abteilungen** (eine, mehrere oder „Alle Abteilungen“), optionale **Notiz**.
- [ ] Bei „Alle Abteilungen“ werden die Einzelauswahlen ausgeblendet. Es wird mindestens eine Abteilung oder „Alle“ verlangt.
- [ ] Bei der Art **„Sonstige Abwesenheit“** erscheint zusätzlich ein **optionales Freitextfeld**. Ein kurzer Hinweis darunter: „Für alle Lehrkräfte sichtbar. Einen Grund musst du nicht nennen.“
- [ ] Validierung: Von ≤ Bis. Bei Uhrzeiten Von < Bis, ein Zeitraum von höchstens 365 Tagen. Fehlertexte stehen am Feld, in verständlichem Deutsch.
- [ ] Jede Lehrkraft kann Einträge für sich **und für andere** anlegen. Der Ersteller wird gespeichert und im Eintrag angezeigt („eingetragen von …“).
- [ ] Doppelt-Warnung: Gibt es für dieselbe Person schon einen sich überschneidenden Eintrag, erscheint ein Hinweis mit Link darauf. Speichern bleibt möglich (z. B. Fortbildung am Vormittag, Krankheit am Nachmittag).

### Bearbeiten & Löschen
- [ ] Bearbeiten und Löschen dürfen: die betroffene Person, der Ersteller, jeder Vertretungsplaner und der Super-Admin. Alle anderen sehen die Aktionen nicht, der Server lehnt mit 403 ab.
- [ ] Löschen fragt per `AlertDialog` nach. Danach gibt es für 10 Sekunden „Rückgängig“ im Toast.
- [ ] Ändert jemand Zeitraum, Art oder Abteilungen eines Eintrags, dessen Vertretung schon als eingetragen gilt, fällt der Status automatisch auf **„Offen“** zurück, und der Eintrag zeigt „Geändert nach Vertretung“. So fällt eine veraltete Vertretung auf.
- [ ] Änderungen und Löschungen werden im Änderungsprotokoll erfasst (wer, was, wann, alt/neu).

### Vertretung
- [ ] Jeder Eintrag hat einen Vertretungsstatus: **Offen** (Standard) oder **Vertretung eingetragen**. Planer können außerdem **„Keine Vertretung nötig“** setzen (z. B. Dienstreise ohne Unterricht).
- [ ] Nur Vertretungsplaner (und der Super-Admin) können den Status ändern, mit einem Klick am Eintrag (Häkchen-Knopf in Liste, Details und Kalenderkarte). Der Status ist jederzeit zurücknehmbar.
- [ ] Bei „Vertretung eingetragen“ speichert das System **wer** und **wann** und zeigt es allen Lehrkräften an („Vertretung eingetragen von Frau/Herr X am 20.11.“).
- [ ] Im Kalender ist der Status ohne Klick erkennbar: offene Einträge mit orangem Rand und Text „Vertretung offen“, erledigte mit grünem Häkchen und Text „Vertretung eingetragen“. Wieder nie nur Farbe.
- [ ] Normale Lehrkräfte können den Status nur ansehen. Der Schalter ist für sie nicht vorhanden.
- [ ] Vergangene Einträge behalten ihren Status. Für sie wird der Offen-Zähler nicht mehr gezählt.

### Benachrichtigungen (nur im Dashboard)
- [ ] Legt jemand einen Eintrag **für eine andere Person** an, sieht diese Person beim nächsten Öffnen auf der Startseite einen kurzen Hinweis: „X hat dich eingetragen: Fortbildung, 24.–25.11.“ mit Link zum Eintrag und „Okay“ zum Wegklicken.
- [ ] Ändert oder löscht jemand anderes einen Eintrag, der eine Person betrifft, sieht sie ebenfalls einen kurzen Hinweis.
- [ ] Wird die Vertretung abgehakt, sieht die **betroffene Person** (und, falls abweichend, der Ersteller) einen kurzen Hinweis „Vertretung für deine Abwesenheit am … ist eingetragen“.
- [ ] Vertretungsplaner sehen in der „Zu erledigen“-Karte (PROJ-81) eine Zeile „X Abwesenheiten in den nächsten 14 Tagen ohne Vertretung“ mit Link auf den Kalender (Filter „Offen“). Bei 0 erscheint die Zeile nicht.
- [ ] Hinweise verschwinden nach „Okay“ oder spätestens nach 14 Tagen. Es gibt **keine** E-Mails oder Pushes.
- [ ] Wer sich selbst einträgt, bekommt keinen Hinweis. Ebenso nicht, wer für sich selbst ändert.

### Automatische Aktualisierung
- [ ] Legt jemand einen Eintrag an, ändert oder löscht ihn oder setzt einen Vertretungsstatus, sehen alle, die den Kalender gerade offen haben, die Änderung **innerhalb weniger Sekunden**, ohne neu zu laden.
- [ ] Das gilt für alle Ansichten (Monat, Woche, Liste), für die Filter-Ergebnisse, für die offene Detail-Schublade, für die Karte „Neu für dich“ und für den Zähler „ohne Vertretung“ in „Zu erledigen“.
- [ ] Die Aktualisierung stört nicht: Scrollposition, gewählter Zeitraum, Filter und ein offenes Formular bleiben erhalten. Bereits Getipptes geht nie verloren.
- [ ] Ändert jemand anderes den Eintrag, den man gerade in der Detail-Schublade ansieht, aktualisieren sich die Angaben dort sofort. Hat man ihn gerade **im Formular offen**, erscheint oben der Hinweis „Dieser Eintrag wurde gerade von X geändert“ mit „Neu laden“. Beim Speichern ohne Neuladen greift die Versionsprüfung („wurde gerade geändert“).
- [ ] Wird der offene Eintrag von jemand anderem gelöscht, zeigt die Schublade „Eintrag wurde gelöscht“.
- [ ] Neu hinzugekommene oder geänderte Einträge werden kurz (höchstens 200 ms Animation, bei „Bewegung reduzieren“ ohne) hervorgehoben.
- [ ] Ist die Live-Verbindung unterbrochen (z. B. WLAN weg, Laptop im Ruhezustand), lädt der Kalender beim Zurückkehren in den Tab bzw. bei wiederhergestellter Verbindung automatisch neu und prüft danach zusätzlich jede Minute, bis die Live-Verbindung wieder steht. Ein dezenter Hinweis „Offline – Stand von 10:42“ ist sichtbar, solange keine Verbindung besteht.
- [ ] Live-Aktualisierungen zeigen nur, was die Person ohnehin sehen darf. Azubis erhalten keine Daten.

### Verwaltung (Super-Admin)
- [ ] In der Nutzerverwaltung bzw. Nutzer-Detailseite (PROJ-59) gibt es für jede Lehrer-Rolle einen Schalter **„Vertretungsplaner“**. Nur der Super-Admin sieht und ändert ihn. Jede Änderung wird protokolliert, es gibt einen Bestätigungsdialog mit Name und E-Mail.
- [ ] Neue Seite „Abwesenheitsarten“ (nur Super-Admin): Liste mit Name, Farbe (aus den `ws-*`-Tokens), Icon, Reihenfolge, aktiv/inaktiv. Man kann **Arten hinzufügen, umbenennen, umsortieren und deaktivieren**. Eine Art mit Einträgen kann nicht gelöscht, nur deaktiviert werden. Die Art „Sonstige Abwesenheit“ ist fest und nicht deaktivierbar.
- [ ] Die Abteilungen sind als feste Liste hinterlegt (Spedition, Touristik, Verkehrsservice, KEP, BIK/BVJ). Eine Verwaltungsseite dafür gehört nicht zu diesem Feature.

## Edge Cases
- **Eintrag über Monatswechsel/Jahreswechsel:** wird in beiden Monaten angezeigt, der Balken läuft durch.
- **Wochenenden:** Einträge dürfen Wochenenden enthalten. Der Kalender zeigt sie, zählt für „Vertretung offen“ aber nur Werktage ab dem ersten Werktag des Zeitraums.
- **Zeitzone/Zeitumstellung:** Alles rechnet in deutscher Ortszeit. Ein Eintrag am Umstellungstag zeigt die richtigen Uhrzeiten.
- **Person verliert die Lehrer-Rolle (PROJ-44 E6) oder wird gelöscht (PROJ-60):** Ihre Einträge bleiben für den Super-Admin erhalten. Im Kalender erscheint der Name weiter, bei gelöschten Konten „Ehemalige Lehrkraft“. Vertretungsplaner, die das Recht verlieren, behalten ihre früheren Haken.
- **Zwei Planer klicken gleichzeitig:** Der zuletzt gespeicherte Status gilt, ein veralteter Klick zeigt „Status wurde gerade geändert“ und lädt neu. Nie ein stilles Überschreiben.
- **Eintrag wird gelöscht, während ein anderer ihn öffnet:** Die Details zeigen „Eintrag wurde gelöscht“, kein technischer Fehler.
- **Sehr viele Einträge (z. B. 80 Lehrkräfte, Fortbildungswoche):** Der Monat bleibt lesbar durch „+N weitere“, die Liste lädt je Seite 50 Einträge nach.
- **Eintrag für „Alle Abteilungen“ und einzelne Abteilung gleichzeitig:** Nicht möglich, „Alle“ ersetzt die Einzelauswahl.
- **Leerer Kalender:** `AdminEmptyState` mit Text „Keine Abwesenheiten in diesem Zeitraum“ und der Hauptaktion.
- **Ladefehler:** `AdminErrorState` mit „Erneut versuchen“.
- **Eintrag in der Vergangenheit:** erlaubt (z. B. nachträglich eintragen), ohne Hinweise an die Planer.
- **Inaktive Art:** Bestehende Einträge zeigen sie weiter. Im Formular ist sie nicht mehr wählbar.
- **Viele Änderungen kurz hintereinander** (z. B. ein Planer hakt 20 Einträge ab): Die Ansicht sammelt sie und lädt höchstens etwa einmal pro Sekunde neu, statt zu flackern.
- **Kalender läuft stundenlang offen (z. B. im Lehrerzimmer am Bildschirm):** Nach Mitternacht springt die Markierung „Heute“ auf den neuen Tag. Die Live-Verbindung erneuert sich selbst, auch nach Ablauf der Anmeldung im Hintergrund.
- **Sehr langer Freitext/Notiz:** Auf 300 Zeichen begrenzt, im Kalender gekürzt mit „…“, vollständig in den Details und im `title`.

## Technical Requirements
- Performance: Der Kalender lädt je Ansicht nur den sichtbaren Zeitraum (Monat/Woche/Seite), unter 500 ms. Der Zähler „Vertretung offen“ ist ein einzelner serverseitiger Aufruf.
- Security: Eigene Tabellen mit RLS. Lesen nur für Lehrer-Rollen, Schreiben nach den Regeln oben. Der Vertretungsstatus ist nur für Planer änderbar, auch bei direktem API- oder Datenbankaufruf. Kein Zugriff für Azubis.
- Datenschutz: Daten bleiben in der bestehenden Datenbank (EU). Nur Lehrer-Rollen sehen Einträge. Hinweis im Formular zur Sichtbarkeit (siehe oben).
- Barrierefreiheit: Alle Status und Arten sind nicht nur farblich unterscheidbar. Bedienelemente mindestens 44 px, Tastaturbedienung für Monatsraster und Filter, Kontrast wie im Workspace-Test.
- Design: nur `ws-*`-Tokens, `AdminPageHeader`, `AdminSegmented`, `AdminTabs`, `AdminStates`. Es gibt keine eigene Optik.
- Nicht Teil dieser Spec: WebUntis-/Outlook-Anbindung, E-Mail- oder Push-Benachrichtigungen, Wiederholungen („jeden Mittwoch“), Feiertage und Ferien, Stundenplan-Abgleich, Export.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Umfang:** Backend (neue Tabellen, Rechte, Server-Schnittstellen) **und** Frontend (neue Seite, Formular, Hinweise). Kein neues Paket nötig.

### A) Aufbau der Oberfläche
```
/admin/kalender  (neu, alle Lehrer-Rollen)
+-- AdminPageHeader „Kalender“ · Hauptaktion „Abwesenheit eintragen“
+-- Werkzeugleiste
|   +-- Zeitnavigation: Zurück · Heute · Vor · Zeitraum-Titel („November 2026“)
|   +-- Ansicht: AdminSegmented Monat | Woche | Liste
|   +-- Filter Abteilung: Dropdown (6 Werte) · Vertretung: AdminSegmented Alle | Offen | Eingetragen
|   +-- Weitere Filter (Popover): Art, Name suchen
|   +-- Für Planer: Schnellknopf „Offene Vertretungen“
+-- Kalenderfläche (je nach Ansicht)
|   +-- Monatsraster (Mo–So, Balken für mehrtägige Einträge, „+N weitere“)
|   +-- Wochenraster (Tagesspalten, ganztägig oben, Uhrzeiten darunter)
|   +-- Liste/Agenda (nach Tagen gruppiert, Standard am Handy, lädt 50 je Seite nach)
|   +-- Leer-, Lade- und Fehlerzustand aus admin-states
+-- Eintragskarte (überall gleich): Name · Art (Icon+Text) · Zeit · Abteilungs-Kürzel · Vertretungsstatus
+-- Detail-Schublade (Sheet rechts, am Handy von unten)
|   +-- alle Angaben, „eingetragen von …“, „zuletzt geändert …“
|   +-- Vertretungsstatus mit Knöpfen (nur Planer): Vertretung eingetragen · Keine Vertretung nötig · Zurück auf offen
|   +-- AdminRowActions: Bearbeiten · ⋯ (Löschen rot, mit AlertDialog)
+-- Formular-Dialog „Abwesenheit eintragen / bearbeiten“
    +-- Person (Suche über alle Lehrkräfte, Standard: ich)
    +-- Art (Dropdown aus den aktiven Arten)
    +-- Von / Bis · Schalter „Ganztägig“ · bei aus: Uhrzeit von / bis
    +-- Abteilungen: Kästchen „Alle Abteilungen“ oder Einzelauswahl
    +-- Freitext (nur bei „Sonstige Abwesenheit“, optional) · Notiz (optional)
    +-- Hinweis bei Überschneidung mit Link

/admin (Startseite, bestehend)
+-- NEU Karte „Neu für dich“ (nur wenn Hinweise da sind): kurze Zeilen mit Link und „Okay“
+-- „Zu erledigen“ (PROJ-81): neue Zeile für Planer „X Abwesenheiten ohne Vertretung (14 Tage)“

/admin/kalender/arten  (neu, nur Super-Admin)
+-- Tabelle: Name · Farbe · Icon · Reihenfolge (ziehen) · aktiv-Schalter · Anzahl Einträge
+-- Hauptaktion „Art hinzufügen“

/admin/users/[id]  (bestehend, nur Super-Admin)
+-- neuer Schalter „Vertretungsplaner“ mit Bestätigung (Name + E-Mail)
```
Seitenleiste: neuer Eintrag „Kalender“ (Icon Kalender) in der Gruppe für den Schulalltag, für alle Lehrer-Rollen; „Abwesenheitsarten“ nur für den Super-Admin bei den Verwaltungsseiten.

### B) Datenmodell (in Worten)
**Abteilungen** (neue, feste Liste, getrennt von den Azubi-Fachbereichen):
- Kürzel, Name, Reihenfolge — Spedition, Touristik, Verkehrsservice, KEP, BIK/BVJ. Einmalig angelegt, ohne Verwaltungsseite.

**Abwesenheitsarten:**
- Name, Farbe (Name eines `ws-*`-Tokens, keine freien Farbwerte), Icon (aus fester Lucide-Auswahl), Reihenfolge, aktiv ja/nein, Kennzeichen „fest“ (nur bei „Sonstige Abwesenheit“: nicht deaktivierbar, nicht umbenennbar), Kennzeichen „mit Freitext“ (zeigt das Freitextfeld).
- Startbestand: Fortbildung, Unterrichtsgang, Dienstreise, Mitwirkung Abschlussprüfung, Klassenfahrt/Exkursion, Sonstige Abwesenheit.

**Abwesenheit** (ein Eintrag):
- betroffene Lehrkraft, Ersteller, Art
- Datum von, Datum bis; ganztägig ja/nein; Uhrzeit von/bis (nur wenn nicht ganztägig)
- „alle Abteilungen“ ja/nein, sonst eine Liste der gewählten Abteilungen (eigene Zuordnungstabelle, damit der Abteilungsfilter schnell ist)
- Freitext (bis 300 Zeichen), Notiz (bis 300 Zeichen)
- Vertretungsstatus: offen · eingetragen · nicht nötig; dazu „gesetzt von“ und „gesetzt am“
- „geändert nach Vertretung“ ja/nein
- angelegt am, geändert am, geändert von; Versionszähler (für „wurde gerade geändert“)
- gelöscht am (weiches Löschen, damit „Rückgängig“ und das Protokoll funktionieren)

**Hinweis** („Neu für dich“):
- Empfänger, Anlass (für dich eingetragen · geändert · gelöscht · Vertretung eingetragen), Verweis auf den Eintrag, auslösende Person, kurzer Text, erstellt am, gesehen am. Hinweise älter als 14 Tage werden nicht mehr angezeigt.

**Konto (bestehend):** neues Merkmal „ist Vertretungsplaner“. Es ist wie die Rolle geschützt: Nur der Super-Admin kann es über den Server ändern, niemand kann es sich selbst geben.

**Protokoll:** Anlegen, Ändern, Löschen, Statuswechsel und Planer-Recht landen im bestehenden Änderungsprotokoll.

Speicherort: bestehende Supabase-Datenbank (EU). Alles serverseitig, nichts im Browser außer den gewählten Filtern und der Ansicht.

### C) Technische Entscheidungen (mit Begründung)
- **Datum und Uhrzeit getrennt als Ortszeit gespeichert** (Datum von/bis + Uhrzeit von/bis), nicht als Zeitstempel. *Warum:* Eine Abwesenheit „24.11. ganztägig“ ist ein Kalendertag in Deutschland. So gibt es keine verrutschten Tage durch Zeitzonen oder die Zeitumstellung.
- **Kalenderraster selbst gebaut** aus vorhandenen Bausteinen (Tabelle/Raster, Sheet, Popover, Dropdown), **kein Kalender-Paket**. *Warum:* Wir brauchen nur Monat, Woche und Liste mit Balken. Fertige Kalender-Pakete sind groß, schwer an die `ws-*`-Farben und die 44-px-Regel anzupassen und bringen eigene Optik mit. Datumsrechnung mit den Bordmitteln des Browsers (deutsches Format, Montag als Wochenanfang), gekapselt in einem kleinen, getesteten Hilfsmodul.
- **Rechte doppelt abgesichert:** in der Datenbank (Zeilenregeln: lesen alle Lehrer-Rollen über die vorhandene Prüfung „hat Lehrer-Rolle“; schreiben nur Betroffene, Ersteller, Planer, Super-Admin) **und** in den Server-Schnittstellen. *Warum:* Selbst ein direkter Datenbankaufruf kann keinen Vertretungsstatus setzen, wenn man kein Planer ist.
- **Vertretungsstatus nur über eine eigene Server-Aktion** änderbar, nie über das normale Bearbeiten. *Warum:* So kann eine Lehrkraft beim Bearbeiten ihres Eintrags den Status nicht versehentlich oder absichtlich auf „eingetragen“ setzen. Dieselbe Stelle setzt automatisch „zurück auf offen“, wenn sich Zeit, Art oder Abteilungen ändern.
- **Versionszähler gegen gleichzeitige Klicks:** Jede Änderung schickt die Version mit, die man gesehen hat. Passt sie nicht mehr, kommt „Status wurde gerade geändert“ und die Ansicht lädt neu. *Warum:* Zwei Planer überschreiben sich nie still.
- **Hinweise als eigene Liste pro Empfänger**, erzeugt vom Server beim Speichern. *Warum:* einfach, schnell zu zählen und ohne E-Mail oder Push (Spec). Der Zähler für Planer kommt in die bestehende „Zu erledigen“-Abfrage (PROJ-81), damit die Startseite nur einen Aufruf mehr macht.
- **Automatische Aktualisierung über Supabase Realtime** (im Projekt schon beim KI-Generator im Einsatz, im Free Tier enthalten). Der Kalender hört auf Änderungen an den Abwesenheiten und an den eigenen Hinweisen. Bei einer Änderung übernimmt er **nicht** den mitgeschickten Inhalt, sondern lädt den sichtbaren Zeitraum kurz neu (gesammelt, höchstens ca. einmal pro Sekunde). *Warum:* So gelten immer dieselben Rechte- und Filterregeln wie beim normalen Laden, und es kann nichts angezeigt werden, was man nicht sehen darf. Die Zeilenregeln der Datenbank gelten auch für die Live-Benachrichtigungen. *Rückfallebene:* Neu laden beim Zurückkehren in den Tab und, solange die Live-Verbindung fehlt, einmal pro Minute. *Warum:* Schul-WLAN und Laptops im Ruhezustand unterbrechen Verbindungen oft.
- **Nur sichtbaren Zeitraum laden:** Die Schnittstelle bekommt „von–bis“ und die Filter. *Warum:* Auch bei vielen Einträgen bleibt jede Ansicht unter 500 ms.
- **Freigabelisten für Lehrkräfte erweitern:** Die Seite und die Schnittstelle des Kalenders kommen in die vorhandene Liste der Pfade, die eine Lehrkraft (nicht nur Admins) öffnen darf. *Warum:* Sonst würde die bestehende Zugangssperre normale Lehrkräfte aussperren.
- **Vorbereitet für Schritt 2 (WebUntis/Outlook), ohne es zu bauen:** Jeder Eintrag hat eine dauerhafte Kennung und „geändert am“. Damit lässt sich später ein Kalender-Abo (iCal-Link für Outlook) oder ein Abgleich anschließen, ohne das Datenmodell umzubauen.

### D) Schnittstellen (Überblick, in Worten)
- Einträge für einen Zeitraum mit Filtern abrufen · Eintrag anlegen · ändern · löschen · Löschen rückgängig machen
- Vertretungsstatus setzen (nur Planer/Super-Admin)
- Lehrkräfte für die Personensuche auflisten (nur Name, keine E-Mail)
- Arten auflisten · Art anlegen/ändern/sortieren/deaktivieren (nur Super-Admin)
- Eigene Hinweise abrufen · Hinweis als gesehen markieren
- Planer-Recht setzen (nur Super-Admin, über die Nutzerverwaltung)
- Bestehende „Zu erledigen“-Abfrage: neue Zahl „offene Vertretungen in 14 Tagen“ (nur für Planer)

### E) Abhängigkeiten (Pakete)
- **Keine neuen Pakete.** Genutzt werden vorhandene: shadcn/ui (Sheet, Dialog, Popover, Command für die Personensuche, Select, Checkbox, Switch, Table), lucide-react (Icons), react-hook-form + zod (Formular und Prüfung), sonner (Toasts mit „Rückgängig“).

### F) Vorgeschlagene Bau-Reihenfolge
1. **Backend:** Tabellen, Startbestand (Abteilungen, Arten), Rechte, Planer-Merkmal, Schnittstellen, Protokoll, Hinweise, Zähler in „Zu erledigen“.
2. **Frontend:** Kalenderseite (Liste zuerst, dann Monat, dann Woche), Formular, Detail-Schublade, Hinweis-Karte, Planer-Schalter, Arten-Seite.
3. **QA:** Rechte-Tests (Lehrkraft / Planer / Super-Admin / Azubi), Zeitumstellung, gleichzeitige Klicks, Kontrast-Test.

### Risiken
- **Freigabeliste vergessen:** Ohne Eintrag in die Lehrkraft-Pfade sehen nur Admins den Kalender → Test in `teacher-api-gate.test.ts` ergänzen.
- **Monatsraster am Handy:** sehr eng. Deshalb ist dort die Liste Standard und der Monat zeigt nur farbige Markierungen mit „+N“.
- **Live-Verbindungen im Free Tier:** Supabase erlaubt gleichzeitig 200 Live-Verbindungen. Bei einem Kollegium von unter 100 Personen ist das ausreichend; der Kalender öffnet pro Browser-Tab nur eine Verbindung und schließt sie beim Verlassen der Seite.
- **Geschütztes Planer-Merkmal:** muss wie die Rolle vor Selbstzuweisung geschützt werden (bestehender Spaltenschutz auf dem Konto wird erweitert).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
