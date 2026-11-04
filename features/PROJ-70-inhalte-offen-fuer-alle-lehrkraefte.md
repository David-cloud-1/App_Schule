# PROJ-70: Lehrkräfte-Bereich – Inhalte offen für alle, lückenlos protokolliert

## Status: Approved
**Created:** 2026-11-04
**Last Updated:** 2026-11-04

## Kontext
Bisher sind die Rechte im Lehrkräfte-Bereich doppelt geschnitten: nach Fachbereich (PROJ-24) und nach eingetragenem Fach (PROJ-48). Eine Lehrkraft sieht und pflegt nur, was zu ihren eingetragenen Fächern gehört. Das erzeugt Verwaltungsaufwand (Eintragen, Sonderfälle, leere Listen) und hält Kolleginnen und Kollegen davon ab, einen Fehler einfach zu beheben, den sie in einem fremden Fach entdecken.

Der Nutzer hat sich umentschieden: **Im Lehrkräfte-Bereich sollen alle Lehrkräfte alle Inhalte sehen und pflegen dürfen.** Die Eingruppierung nach Fach und Bereich entfällt als Recht. Als Ausgleich zählt zweierlei: lückenlose Nachvollziehbarkeit jeder Änderung und die Möglichkeit, Änderungen und Löschungen rückgängig zu machen. Die Grundlage dafür liefert PROJ-47 (Versionsverlauf, Papierkorb, Wiederherstellen). Dieses Feature öffnet die Rechte und schließt die in PROJ-47 offen gebliebenen Lücken, die bei vielen Bearbeitenden wichtig werden.

### Entscheidungen (Nutzer, 2026-11-04)
- **E1 – Reichweite: über alle Fachbereiche.** Jede Lehrkraft sieht die Inhalte von Spedition und Tourismus (und künftiger Bereiche). Die Fachbereichs-Trennung bei **Inhalten** entfällt.
- **E2 – Ändern: alle dürfen alles ändern und löschen.** Löschen heißt immer Papierkorb. Endgültig leeren darf nur der Super-Admin.
- **E3 – Schülerdaten bleiben geschützt.** Noten, Ergebnisse, Fokus-Verlust-Protokolle, Nutzerliste, Passwörter, Konto löschen und Rollenvergabe bleiben bei Bereichs-Admin und Super-Admin. Das hat Datenschutz-Gründe und hängt nicht vom Vertrauen im Kollegium ab.
- **E4 – Rückgängig machen:** Einzelne Versionen stellt jede Lehrkraft wieder her (wie in PROJ-47). Sammel-Rücknahmen (ganzer Vorgang, alle Änderungen einer Person) macht nur der Super-Admin.
- **Annahme (vom Assistenten gesetzt, bitte bestätigen):** Leistungsnachweise (PROJ-21/27/46) bleiben wie sie sind, weil sie Noten und Ergebnisse enthalten. Werkzeugkiste-Materialien und Regal (PROJ-52/53), Shop-/Hof-Items und Fachbereich-Einstellungen sind nicht Teil dieses Features. Der kostenpflichtige KI-Generator bleibt dem Super-Admin vorbehalten (PROJ-48 E4, Regel „alles bleibt kostenlos“).

## Dependencies
- Requires: PROJ-47 (Änderungsverlauf & Wiederherstellen) – liefert Versionen, Papierkorb, Vorgänge
- Requires: PROJ-44 (Lehrkraft-Rolle), PROJ-45 (Layout), PROJ-49 (Rollen sichtbar trennen)
- Löst teilweise ab: PROJ-48 (Fach-Zuständigkeiten) – die Rechtewirkung der Eintragung entfällt, „Meine Fächer“ bleibt als Komfort
- Berührt: PROJ-24 (Rechtetrennung, nur für Inhalte), PROJ-29 (Bereichs-Umschalter), PROJ-16 (Torwächter), PROJ-38 (Kopier-Prompt)

## Geltungsbereich
**Offen für alle Lehrkräfte (sehen, anlegen, ändern, löschen in den Papierkorb, wiederherstellen):**
- Fragen inklusive Antwortoptionen, Erklärung, Fach- und Themen-Zuordnung, Aktiv-Status
- Themen
- Fächer (anlegen, umbenennen, aktivieren, deaktivieren)
- Prüfungssets der Prüfungssimulation
- Die kostenlosen Wege zum Anlegen: Kopier-Prompt und Bulk-Import

**Unverändert (nur Bereichs-Admin / Super-Admin):** Nutzerverwaltung, Noten und Ergebnisse, Fokus-Verlust-Protokolle, Rollenvergabe, Fachbereich-Einstellungen, Hof-Items, bezahlter KI-Generator, Fachbereiche anlegen, Papierkorb endgültig leeren.

## User Stories
- Als **Lehrkraft** möchte ich alle Fragen, Themen, Fächer und Prüfungssets sehen, auch aus anderen Fächern und Bereichen, damit ich Material finde, wiederverwende und abstimme.
- Als **Lehrkraft** möchte ich einen Fehler in einem fremden Fach direkt beheben, damit er nicht liegen bleibt.
- Als **Lehrkraft** möchte ich vor dem Bearbeiten sehen, wer eine Frage zuletzt geändert hat und wie sie früher lautete, damit ich im Zweifel nachfragen kann.
- Als **Lehrkraft** möchte ich eine versehentlich gelöschte oder verschlechterte Frage mit einem Klick wiederherstellen.
- Als **Super-Admin** möchte ich jede Änderung und Löschung jeder Person nachvollziehen, damit ich bei Fehlern oder Missbrauch weiß, wer was getan hat.
- Als **Super-Admin** möchte ich einen ganzen Vorgang oder alle Änderungen einer Person in einem Zeitraum gesammelt zurücknehmen, damit ich nicht Hunderte Fragen einzeln reparieren muss.
- Als **Azubi** möchte ich, dass sich für mich nichts ändert: Ich sehe weiterhin nur Inhalte meines Fachbereichs, und meine Daten sind für Lehrkräfte fremder Fächer nicht sichtbar.

## Acceptance Criteria

### Sehen und Ändern
- [ ] Jede Person mit Lehrer-Rolle (Lehrkraft, Bereichs-Admin, Super-Admin) sieht in Fragen, Themen, Fächern, Prüfungssimulation und Papierkorb die Inhalte **aller** Fachbereiche und Fächer.
- [ ] Dieselben Personen dürfen diese Inhalte anlegen, ändern, aktivieren, deaktivieren und in den Papierkorb legen, unabhängig von einer Fach-Eintragung.
- [ ] Wer neue Fächer anlegt, kann das in jedem Fachbereich tun. Neue Fachbereiche anlegen bleibt dem Super-Admin vorbehalten.
- [ ] Die Rechte gelten **auch auf Datenbank-Ebene**, nicht nur in der Oberfläche. Eine Lehrkraft kann nicht über direkte Datenbank-Zugriffe mehr (Schülerdaten) oder weniger (Inhalte) als beschrieben.
- [ ] Der Torwächter (PROJ-16) gilt weiterhin für jede Frage. Beim Anlegen gilt das Prompt-Gerüst des Fachbereichs, in dem das Fach liegt.
- [ ] Azubis sehen weiterhin nur Inhalte ihres eigenen Fachbereichs. Die Schülerseite ändert sich nicht.

### Schülerdaten bleiben geschützt
- [ ] Nutzerliste, Nutzer-Detailseiten, Passwort-Vergabe, Konto löschen, Rollenvergabe, Noten und Ergebnisse, Fokus-Verlust-Protokolle bleiben wie heute auf Bereichs-Admin (eigener Bereich) und Super-Admin beschränkt. Eine Lehrkraft erhält dort weiter 404 bzw. wird mit Hinweis umgeleitet (PROJ-49).
- [ ] Die Gruppe „Verwaltung“ in der Navigation bleibt für Lehrkräfte unsichtbar.
- [ ] Leistungsnachweise folgen weiter den Regeln aus PROJ-46.

### Navigation und Texte (Anpassung PROJ-48/49)
- [ ] Die Umfangszeile unter den Seitentiteln der Inhalts-Seiten lautet für Lehrkräfte „Du siehst alle Bereiche und Fächer.“ statt „Du siehst nur Inhalte deiner Fächer.“ Der Zusatz an der Gruppe „Inhalte“ lautet für Lehrkräfte „alle Bereiche“.
- [ ] Die Erklärsätze der Rollen (Konto-Menü, Nutzerverwaltung, Bestätigungsdialog) beschreiben den neuen Umfang. Die gemeinsame Textquelle aus PROJ-49 bleibt die einzige Stelle.
- [ ] Der Leerzustand „Trage unter Meine Fächer ein, was du unterrichtest“ entfällt. Eine Lehrkraft ohne Eintragung sieht alle Inhalte.
- [ ] „Meine Fächer“ bleibt als Komfort: Es steuert Startseiten-Kacheln und einen Standardfilter („nur meine Fächer“) in den Listen. Die Eintragung gibt und nimmt keine Rechte. Listen lassen sich mit einem Klick auf „Alle“ umschalten.
- [ ] Listen lassen sich nach Fachbereich, Fach und Thema filtern, damit die größere Menge übersichtlich bleibt.

### Immer klar sichtbar: In welchem Bereich bin ich? (Entscheidung Nutzer, 2026-11-04)
Wenn alle alles sehen, darf niemand raten müssen, ob eine Liste Spedition, Tourismus oder alle Bereiche zeigt. Das gilt besonders für unerfahrene Nutzende.
- [ ] Jede Seite, die Inhalte oder Personen auflistet (Fragen, Themen, Fächer, Prüfungssimulation, Papierkorb, Nutzer, Leistungsnachweise, Änderungsprotokoll), zeigt direkt unter dem Seitentitel eine **Bereichsleiste**: „Du siehst: Spedition“, „Du siehst: Tourismus“ oder „Du siehst: alle Bereiche“. Sie steht immer an derselben Stelle, in einfacher Sprache und ohne Kürzel.
- [ ] Die Bereichsleiste ist zugleich der **Umschalter** („Bereich wechseln“), mit den Optionen „Alle Bereiche“ und je einem Fachbereich. Wer die Leiste liest, kann damit auch sofort wechseln. Der Wechsel gilt für die Seite, ohne dass man ihn in einem Menü suchen muss.
- [ ] Die gewählte Einstellung bleibt beim Wechsel zwischen den Seiten erhalten (Fragen → Themen → Fächer) und wird im Cookie gemerkt, damit niemand in einer anderen Ansicht landet als er dachte. Neu eingeloggte Lehrkräfte starten mit ihrem eigenen Bereich, nicht mit „alle“.
- [ ] Jede Zeile bzw. Karte in einer Liste, die Bereiche mischen kann (Ansicht „Alle Bereiche“), trägt ein **Bereichs-Etikett** mit dem Namen („Spedition“, „Tourismus“). Es hängt nicht nur an der Farbe: Jeder Bereich hat zusätzlich Text. Farben kommen aus den `ws-*`-Tokens, Kontrast mindestens 4,5 : 1.
- [ ] Zeigt die Ansicht nur einen Bereich, entfällt das Etikett an den Zeilen, die Bereichsleiste bleibt.
- [ ] Beim **Anlegen** (Frage, Thema, Fach, Prüfungsset, Import, Kopier-Prompt) steht im Formular gut sichtbar „Wird angelegt in: Spedition · STG“. In der Ansicht „Alle Bereiche“ ist der Zielbereich ein Pflichtfeld ohne Vorauswahl, damit nichts versehentlich im falschen Bereich landet.
- [ ] **Nutzer:** Die Nutzerliste zeigt Bereichs-Admins ihren eigenen Bereich, fest und ohne Umschalter. Der Super-Admin sieht dort den Umschalter, jede Person mit Bereichs-Etikett, und die Ansicht „Alle Bereiche“ ist möglich.
- [ ] Der Umschalter ist **sichtbar, sobald mehr als ein Bereich existiert**, auch für Lehrkräfte. Die bisherige Regel aus PROJ-24 („nur für Super-Admin, nur bei mehr als einem Bereich“) wird für Inhalte angepasst. Für Schülerdaten sieht ihn nur der Super-Admin.
- [ ] Auf dem Handy bricht die Leiste um, bleibt in der Kopfzone sichtbar und hat Bedienelemente von mindestens 44 px. Kein seitliches Scrollen.
- [ ] Hat die Lehrkraft einen Filter gesetzt (Fach, Thema, „nur meine Fächer“), steht er als sichtbarer Chip mit „Zurücksetzen“ in der Leiste. Eine leere Liste nennt den Grund („Keine Fragen in Tourismus · KSK mit diesem Filter“) statt nur „Keine Ergebnisse“.
- [ ] Gedruckte oder exportierte Listen nennen den Bereich in der Kopfzeile.
- [ ] Die Umfangszeile aus PROJ-49 geht in dieser Bereichsleiste auf. Es gibt keine zweite, widersprüchliche Zeile.

### Lückenlose Nachvollziehbarkeit
- [ ] Jedes Anlegen, Ändern, Aktivieren, Deaktivieren, Löschen und Wiederherstellen eines Inhalts erzeugt eine Version mit Person, Zeitpunkt und Art (PROJ-47). Das gilt für **jeden** Weg, auch Bulk-Import, Kopier-Prompt-Import, Qualitäts-Korrekturläufe und direkte Skripte. Läuft eine Änderung nicht über eine angemeldete Person, steht eine klare Quelle in der Version.
- [ ] **Alle Massenaktionen** werden als ein zusammengehöriger Vorgang gespeichert: Mehrfachaktion in der Fragenliste, Bulk-Import, Kopier-Prompt-Import, Annahme von KI-Entwürfen, Qualitäts-Korrekturläufe (schließt Lücke aus PROJ-47).
- [ ] Der Verlauf („Verlauf“-Schublade) ist für **Fragen, Themen, Fächer und Prüfungssets** in der Oberfläche vorhanden (bisher nur Fragen und Themen), lädt weitere Seiten nach („mehr laden“) und zeigt für Wiederherstellungen eine Warnung, wenn die Version heutige Qualitätsregeln verletzt.
- [ ] Die Konflikt-Prüfung bei gleichzeitigem Bearbeiten (Zählnummer) gilt für **alle vier** Inhaltstypen, nicht nur für Fragen. Die zweite Speicherung wird abgelehnt mit „Wurde gerade von <Name> geändert“ und Link zum Verlauf.
- [ ] Die Aufzeichnung bleibt unumgehbar und nur lesbar, auch für den Super-Admin (PROJ-47).
- [ ] In jeder Liste steht „Zuletzt geändert von <Name> am <Datum>“ (bisher nur Fragenliste): Fragen, Themen, Fächer, Prüfungssets.

### Rückgängig machen
- [ ] Jede Lehrkraft kann eine einzelne frühere Version eines Inhalts wiederherstellen und Gelöschtes aus dem Papierkorb zurückholen (E4). Wiederherstellen ist selbst eine Änderung und lässt sich wieder zurücknehmen.
- [ ] Der Papierkorb zeigt für alle Lehrkräfte sämtliche gelöschten Inhalte aller Bereiche mit Name der löschenden Person und Datum.
- [ ] Nur der Super-Admin leert den Papierkorb endgültig (unverändert).
- [ ] Nur der Super-Admin sieht im Änderungsprotokoll Filter nach **Person**, Zeitraum, Fachbereich, Fach, Inhaltstyp und Art der Änderung (schließt Lücke aus PROJ-47).
- [ ] Nur der Super-Admin kann **alle Änderungen einer Person in einem Zeitraum** gesammelt zurücknehmen (schließt Lücke aus PROJ-47) sowie einen ganzen Vorgang.
- [ ] Vor jeder Sammel-Rücknahme zeigt eine Vorschau, wie viele Inhalte betroffen sind und wo jemand anderes den Inhalt seitdem weiter bearbeitet hat. Solche Fälle werden einzeln aufgeführt und standardmäßig **nicht** überschrieben.
- [ ] Jede Sammel-Rücknahme ist selbst ein Vorgang und lässt sich als Ganzes wieder umkehren (schließt Lücke aus PROJ-47).
- [ ] Das Änderungsprotokoll zeigt dem Super-Admin eine Zusammenfassung „Änderungen je Person“ (Anzahl angelegt / geändert / gelöscht im gewählten Zeitraum), damit Auffälligkeiten schnell sichtbar sind.

### Schutz vor Versehen
- [ ] Löschen und Mehrfachaktionen zeigen vorher einen Bestätigungsdialog mit der Anzahl betroffener Inhalte (bestehender `AlertDialog`).
- [ ] Gelöscht wird nie endgültig. Es gibt für Lehrkräfte keinen Weg, Inhalte oder Versionen dauerhaft zu entfernen.
- [ ] Das Wiederherstellen ändert nichts an Antworten, XP, Münzen und Statistiken der Azubis; laufende und abgeschlossene Nachweise bleiben durch ihren Snapshot unberührt (PROJ-47).

### Unverändertes
- [ ] Keine Änderung an Schülerseite, Gamification, Nachweis-Auswertung.
- [ ] Alle Routen- und RLS-Tests für Schülerdaten aus PROJ-24 und PROJ-44 laufen unverändert grün. Tests zu Fach-Zuständigkeiten (PROJ-48) werden an die neuen Regeln angepasst und ersetzt, nicht stillschweigend gelöscht.

## Edge Cases
- **Zwei Lehrkräfte ändern gleichzeitig dieselbe Frage:** Die zweite Speicherung wird mit Namen der ersten Person abgelehnt. Kein stiller Datenverlust.
- **Jemand nimmt eine ältere Änderung zurück, nachdem andere die Frage seitdem weiter bearbeitet haben:** Die Wiederherstellung zeigt vorher eine Warnung „Danach wurde noch <n>-mal geändert“. Sie bleibt möglich, weil sie selbst eine neue Version erzeugt.
- **Eine Lehrkraft löscht in einer Mehrfachaktion 300 Fragen:** Bestätigungsdialog nennt die Zahl, alles landet als ein Vorgang im Papierkorb, der Super-Admin nimmt ihn mit einem Klick zurück.
- **Ein Fach wird umbenannt oder deaktiviert, obwohl viele Fragen daran hängen:** Erlaubt und protokolliert. Der Verlauf des Fachs zeigt die alte Fassung, Wiederherstellen stellt sie samt Zuordnungen wieder her.
- **Wiederherstellen einer Frage, deren Thema oder Fach inzwischen im Papierkorb liegt:** Hinweis; das Thema bzw. Fach wird mit wiederhergestellt, wenn es im Papierkorb liegt (PROJ-47).
- **Frage wird gelöscht, während ein Nachweis sie nutzt:** Der Snapshot schützt den Nachweis, die Frage liegt im Papierkorb.
- **Konto der ändernden Person wurde gelöscht:** Versionen bleiben, „Geändert von“ zeigt „Gelöschtes Konto“.
- **Lehrkraft verliert die Lehrer-Rolle:** Sie verliert sofort den Zugriff auf alle Inhalte des Lehrkräfte-Bereichs. Ihre früheren Änderungen und deren Verlauf bleiben.
- **Kopier-Prompt-Import in ein fremdes Fach:** Erlaubt. Die Fragen tragen die Person und die Quelle „Kopier-Prompt“ in der Version.
- **Sehr viele Versionen oder große Datenmenge:** Verlauf lädt seitenweise. Wird der kostenlose Datenbank-Rahmen knapp, warnt das Architektur-Konzept vorher. Ältere Versionen werden nie still gelöscht.
- **Super-Admin nutzt den Bereichs-Umschalter (PROJ-29):** Für Inhalte filtert der Umschalter weiter die Ansicht; für Schülerdaten gilt er wie bisher als Bereichsfilter. Er ist jetzt die Bereichsleiste unter dem Seitentitel.
- **Fachbereich wird neu angelegt, während jemand die Seite offen hat:** Die Leiste kennt den neuen Bereich nach dem nächsten Laden. Gewählte Bereiche, die es nicht mehr gibt, fallen auf „Alle Bereiche“ zurück, mit Hinweis.
- **Jemand legt in „Alle Bereiche“ eine Frage an und übersieht das Zielfeld:** Speichern ist ohne Auswahl nicht möglich, der Fehler steht am Feld.
- **Bereich mit nur einem Fach oder ohne Inhalte:** Die Leiste zeigt ihn trotzdem; die leere Liste erklärt, dass dort noch nichts angelegt ist, und bietet die Hauptaktion an.

## Abgrenzung (nicht Teil dieses Features)
- Freigabe-Workflow vor Änderungen (bewusst nicht gewollt: Vertrauen + Rücknahme)
- Benachrichtigungen bei Änderungen („Deine Frage wurde geändert“)
- Rechte auf Leistungsnachweise, Noten, Ergebnisse, Nutzerdaten, Werkzeugkiste, Shop/Hof
- Neue Rollen oder ein Entzug von Rechten einzelner Lehrkräfte (Sperrliste)
- Änderungen an der Schülerseite
- Der bezahlte KI-Generator für Lehrkräfte (bleibt PROJ-64/Super-Admin)

## Technical Requirements
- **Security:** Rechte müssen Oberfläche, Server-Routen **und** Datenbank-Regeln (RLS) gemeinsam treffen. Offen für Inhalte, geschlossen für Schülerdaten. Die Datenbank-Prüfung der Rechte-Matrix (Lehrkraft / Bereichs-Admin / Super-Admin / Azubi × Inhalte / Schülerdaten, jeweils eigener und fremder Bereich) läuft in einer Transaktion mit Rollback.
- **Unumgehbar:** Versionen entstehen per Datenbank-Trigger auch für Skripte und direkte Zugriffe; für alle Rollen nur lesbar.
- **Kein Datenverlust:** Kein hartes Löschen durch Lehrkräfte; Papierkorb statt Löschen.
- **Migration:** Zuerst Datenbank-Regeln erweitern (Inhalte für Lehrer-Rollen öffnen), dann Code deployen, dann veraltete Fach-Rechte-Prüfungen entfernen. Jede Policy-Migration mit Rückweg-SQL (wie bei PROJ-24).
- **Performance:** Listen über alle Bereiche (rund 8.300+ Fragen) laden seitenweise; keine `.in()`-Listen mit tausenden IDs (Lehre aus PROJ-24, Incident BUG-5).
- **Tests:** Vitest für Rechte je Rolle, gemeinsame Konflikt-Prüfung, Vorgangs-Bündelung aller Massenaktionen, Personen-Sammel-Rücknahme, Umkehren einer Sammel-Rücknahme; SQL-Rechte-Matrix; `npm run build`. Kein Dev-Server, kein Playwright.
- **Kosten:** keine neuen Dienste.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick in einem Satz
Die Rechte für Inhalte hängen heute an **drei zentralen Datenbank-Funktionen** (PROJ-48). Wenn dort „Lehrkraft“ ohne Fach-Eintrag genügt, öffnet sich alles zugleich: Datenbank, Server und Oberfläche. Der Rest des Features ist **Sichtbarkeit** (die Bereichsleiste) und **Absicherung** (Verlauf, Konflikt-Schutz, Rücknahme), damit „alle dürfen alles“ ungefährlich bleibt.

### Was schon da ist (geprüft im Code)
| Baustein | Stand | Folge für PROJ-70 |
|---|---|---|
| Rechte-Funktionen `can_admin_subject`, `can_admin_department_content`, `can_admin_question` | Alle Policies für Fragen, Themen, Fächer, Prüfungssets hängen daran | **Ein Ort** für die Öffnung, keine Policy muss umgeschrieben werden |
| Versions-Trigger auf den vier Inhaltstabellen | Erfasst jeden Schreibweg (auch Skripte), nur lesbar | Bleibt die Grundlage der Nachvollziehbarkeit |
| `group_recent_versions_into_batch` | Wird von Mehrfachaktion und Bulk-Import schon benutzt | Nur noch die **übrigen** Massenwege anschließen |
| Konflikt-Prüfung (Zählnummer) | Nur im Fragen-Speichern | Auf Themen, Fächer, Prüfungssets ausdehnen |
| Verlauf-Schublade | Nur Fragen und Themen | Fächer und Prüfungssets ergänzen |
| Papierkorb | Weiches Löschen vorhanden | Löschen-Policies für Lehrkräfte schließen (siehe Sicherheit) |
| Bereichs-Umschalter (PROJ-24/29) | Nur Super-Admin, wählt genau einen Bereich | Wird zur Bereichsleiste mit „Alle Bereiche“ |
| Server-Zugang `requireContentAdmin` | Lehrkraft ohne Fach-Eintrag bekommt 403 | Wird geöffnet |

### A) Bauteile (Oberfläche)
```
Jede Inhalts-Seite (Fragen, Themen, Fächer, Prüfungssimulation, Papierkorb,
Nutzer, Leistungsnachweise, Änderungsprotokoll)
+-- AdminPageHeader (wie bisher)
+-- NEU: Bereichsleiste (ersetzt AdminScopeNote + DepartmentSwitcher)
|     +-- „Du siehst: Spedition“ / „Tourismus“ / „alle Bereiche“
|     +-- Umschalter „Bereich wechseln“ (Auswahlliste, 44 px, bricht auf dem Handy um)
|     +-- Filter-Chips (Fach, Thema, „nur meine Fächer“) mit „Zurücksetzen“
+-- Liste / Tabelle
|     +-- NEU: Bereichs-Etikett je Zeile (Text + Farbe), nur in „Alle Bereiche“
|     +-- NEU: „Zuletzt geändert von <Name> am <Datum>“ in allen vier Listen
|     +-- Leerzustand nennt Bereich und Filter („Keine Fragen in Tourismus · KSK …“)
+-- Anlegen-Formulare (Frage, Thema, Fach, Prüfungsset, Import, Kopier-Prompt)
|     +-- NEU: Zeile „Wird angelegt in: Spedition · STG“
|     +-- NEU: In „Alle Bereiche“ Pflichtfeld für den Zielbereich, ohne Vorauswahl
+-- Verlauf-Schublade (bestehend, jetzt für alle vier Inhaltstypen, „mehr laden“,
|     Warnung bei Verstoß gegen heutige Qualitätsregeln)
+-- Konflikt-Hinweis beim Speichern („Wurde gerade von <Name> geändert“ + Link zum Verlauf)

Änderungsprotokoll (nur Super-Admin erweitert)
+-- Filter: Person, Zeitraum, Bereich, Fach, Inhaltstyp, Art
+-- Zusammenfassung „Änderungen je Person“ (angelegt / geändert / gelöscht)
+-- Aktion „Alle Änderungen dieser Person im Zeitraum zurücknehmen“
+-- Vorschau-Dialog (Anzahl, Konflikte einzeln, Konflikte standardmäßig nicht überschreiben)
+-- Aktion „Diese Rücknahme umkehren“
```
Alles aus vorhandenen shadcn/ui-Teilen (Select, Badge, Sheet, AlertDialog, Table, Skeleton). Die Bereichsleiste ist **ein** gemeinsamer Baustein für alle Seiten, damit sie überall an derselben Stelle steht.

### B) Rechte und Daten (in einfachen Worten)
- **Rollenmatrix:** Lehrkraft, Bereichs-Admin und Super-Admin dürfen Inhalte aller Bereiche sehen und ändern. Azubis ändern sich nicht. Schülerdaten (Nutzer, Noten, Fokus-Protokolle, Rollen, Passwörter) hängen an **anderen** Funktionen (`can_admin_department` u. a.), die **nicht angefasst werden**. Das ist die Trennlinie des ganzen Features.
- **Öffnung in der Datenbank:** Die drei Funktionen liefern für jede Lehrer-Rolle „ja“, sobald der Inhalt nicht privat ist. Private Nachweis-Fragen (PROJ-46) bleiben unverändert beim Besitzer. Die Leseregel des Verlaufs (`content_versions_read`) wird ebenfalls auf „alle Lehrer-Rollen“ geöffnet. Die Wiederherstellungs-Funktion benutzt dieselben Funktionen und zieht automatisch mit.
- **Kein hartes Löschen für Lehrkräfte:** Die Lösch-Policies der vier Tabellen erlauben heute Lehrkräften mit Eintrag auch das echte Löschen direkt in der Datenbank. Mit der Öffnung hätte das jede Lehrkraft. Darum: echtes Löschen nur für den Super-Admin. Lehrkräfte löschen über den Papierkorb (Markierung). Private Nachweis-Fragen und das DSGVO-Löschen eines Kontos (PROJ-60) sind davon **ausgenommen** und werden dort geprüft.
- **Bereichswahl:** Ein neues Cookie merkt „Alle Bereiche“ oder einen Fachbereich. Das bestehende Cookie des Super-Admins bleibt für Seiten, die genau einen Bereich brauchen (Hof-Items, Bereich-Einstellungen, Nutzer-Aktionen). Die Leiste setzt beim Wählen eines konkreten Bereichs beide, „Alle Bereiche“ nur das neue. Ein unbekannter Wert fällt still auf „Alle Bereiche“ zurück, mit Hinweis.
- **Startbereich:** Lehrkraft und Bereichs-Admin starten im Bereich ihres Profils. Hat eine Lehrkraft keinen, nimmt die App den Bereich ihres ersten Eintrags unter „Meine Fächer“, sonst „Alle Bereiche“.
- **„Meine Fächer“:** Die Tabelle bleibt, verliert aber jede Rechtewirkung. Sie liefert nur die Startseiten-Kacheln und den Chip „Nur meine Fächer“.
- **Neue Angaben in den Listen:** Bereichs-Name und Kürzel je Zeile (kommt aus der Verbindung Fach → Bereich), zuletzt Geändert-von (gleicher Weg wie in der Fragenliste).

### C) Nachvollziehbarkeit und Rücknahme
| Lücke aus PROJ-47 | Lösung |
|---|---|
| Nicht alle Massenwege sind gebündelt (Mehrfachaktion und Bulk-Import sind es schon) | Die übrigen Wege (Kopier-Prompt-Import, Annahme von KI-Entwürfen, Qualitäts-Korrekturläufe) rufen nach der Aktion dieselbe Bündel-Funktion. Läufe ohne angemeldete Person tragen eine Quelle („Qualitäts-Korrekturlauf 2026-11-04“) statt eines Namens. Beim Bau wird jeder Schreibweg einmal gegen die Liste geprüft. |
| Konflikt-Schutz nur bei Fragen | Dieselbe gemeinsame Prüfung für Themen, Fächer, Prüfungssets. Die Oberfläche schickt beim Speichern die Zählnummer mit, die sie beim Öffnen sah. |
| Verlauf nur bei Fragen und Themen | Fächer und Prüfungssets bekommen die Schublade; die Liste lädt seitenweise. |
| Kein Filter nach Person im Protokoll | Filter und Zusammenfassung laufen **in der Datenbank** (eine Abfrage mit Zählung je Person), nicht durch Laden tausender Versionen in die App. Dazu ein Index auf Person + Zeitpunkt. |
| Keine Rücknahme nach Person | Neue Datenbank-Funktion „Vorschau“ (zählt Betroffene, markiert Konflikte, ändert nichts) und „Ausführen“. Beides nur für den Super-Admin, geprüft in der Funktion selbst. |
| Sammel-Rücknahme nicht umkehrbar | Die Rücknahme wird als **eigener Vorgang** gespeichert (jede Wiederherstellung erzeugt ohnehin eine Version). „Umkehren“ ist dann „diesen Vorgang zurücknehmen“ auf diesem neuen Vorgang. Kein Sonderfall. |

**Reihenfolge innerhalb einer Rücknahme:** Konflikte (inzwischen von anderen weiterbearbeitet) werden einzeln aufgelistet und übersprungen, es sei denn, der Super-Admin hakt sie bewusst an. Die Vorschau gilt nur für den Moment; beim Ausführen wird erneut geprüft.

### D) Technik-Entscheidungen (und warum)
| Entscheidung | Warum |
|---|---|
| **Öffnung in den drei Rechte-Funktionen, nicht in 15 Policies** | Eine Stelle, ein Rückweg-SQL, wirkt zugleich auf Datenbank, Server und Wiederherstellen. Die Policies selbst bleiben unberührt. |
| **Schülerdaten-Funktionen bleiben unverändert** | Trennlinie ist damit nachweisbar: Die Rechte-Matrix-Prüfung zeigt, dass nur Inhalte aufgingen. |
| **Bereichs-Filter in der Abfrage (Bereich), nicht als ID-Liste** | Bei rund 8.300+ Fragen über alle Bereiche scheitern lange `.in()`-Listen (Lehre BUG-5 aus PROJ-24). Seitenweise Laden mit Bereichs-Bedingung. |
| **Ein neues Bereichs-Cookie, altes Cookie bleibt** | Die Bereichsleiste braucht „Alle“, Shop und Einstellungen brauchen genau einen Bereich. So bricht keine bestehende Seite. |
| **Bündeln nachträglich, nicht per Session-Variable** | So hat PROJ-47 entschieden (gepoolte Verbindungen). Wir bleiben dabei. |
| **Sammel-Rücknahme als Datenbank-Funktion** | Eine Rücknahme berührt hunderte Zeilen. In einer Funktion läuft sie in einer Transaktion: ganz oder gar nicht. |
| **Rolle und Rechte frisch pro Anfrage** | Verliert eine Lehrkraft die Rolle, wirkt das sofort (Edge Case der Spec). |
| **Kein neuer Dienst, keine neuen Pakete, keine Kosten** | Alles in der vorhandenen Datenbank. |

### E) Reihenfolge des Baus (Migration-Disziplin aus der Spec)
1. **Datenbank zuerst (Backend):** Rechte-Funktionen öffnen, Lösch-Policies schließen, Leseregel des Verlaufs öffnen, Personen-Index, Funktionen für Auswertung und Sammel-Rücknahme. Jede Migration mit Rückweg-SQL. Die alte Oberfläche läuft weiter (sie schränkt selbst noch ein). Danach SQL-Rechte-Matrix in einer Transaktion mit Rollback.
2. **Server:** `requireContentAdmin` und die Rechte-Helfer öffnen, Listen-Routen auf Bereichsfilter umbauen, Etikett und „zuletzt geändert“ liefern, Konflikt-Prüfung ausdehnen, restliche Massenwege bündeln, neue Routen für Auswertung und Sammel-Rücknahme.
3. **Oberfläche (Frontend):** Bereichsleiste, Etiketten, Zielbereich-Pflichtfeld, Verlauf für alle vier Typen, Konflikt-Hinweis, Protokoll-Erweiterung, Texte in `roles.ts` (die eine Textquelle), Navigation.
4. **Aufräumen:** Veraltete Fach-Rechte-Prüfungen im Code entfernen, PROJ-48-Tests an die neuen Regeln anpassen.

Das ist **Backend zuerst, dann Frontend**. Zwischen den Schritten bleibt die App benutzbar.

### F) Risiken
- **Wirkung auf Azubis:** Jede Lehrkraft kann ein Fach oder Prüfungsset deaktivieren oder ändern, das Azubis sofort sehen. Das ist gewollt (E2) und durch Verlauf, Bestätigungsdialog und Rücknahme gedeckt. Ein Fach zu deaktivieren hat die größte Außenwirkung. Dort zeigt der Dialog die Zahl betroffener Fragen.
- **Löschen-Policies schließen:** Eine Lücke hier würde „kein harter Löschvorgang“ aushebeln. Darum eigener Test, und PROJ-60 sowie die Nachweis-Flows werden gegengeprüft, damit nichts, was heute funktioniert, bricht.
- **Speicher:** Versionen werden nie gelöscht. Grobe Schätzung: 10.000 weitere Änderungen mit je 1 bis 2 KB ergeben etwa 10 bis 20 MB, der kostenlose Rahmen liegt bei 500 MB. Beim QA den tatsächlichen Verbrauch prüfen und im Bericht nennen.
- **Mehr Daten in Listen:** Seitenweise laden, Bereichsfilter in der Abfrage, Index auf Bereich ist vorhanden (`idx_content_versions_department`).
- **Verwirrung durch Größe:** Gegenmittel ist die Bereichsleiste. Das ist bewusst keine Dekoration, sondern der Kern der Bedienung.
- **Vollständigkeit der Bündelung:** Neue Schreibwege würden den Trigger-Schutz nicht verlieren (Version entsteht immer), nur die Vorgangs-Gruppierung. Der Test „jeder Massenweg ergibt genau einen Vorgang“ fängt das.

### G) Entscheidungen (Nutzer, 2026-11-04)
1. **„Meine Fächer“ spielt keine Rolle.** Kein Standardfilter „Nur meine Fächer“, kein Chip, keine Wirkung auf Listen. Die Tabelle bleibt nur für die Startseiten-Kacheln. Das ersetzt die Zeile in den Acceptance Criteria zum Standardfilter.
2. **Startbereich:** Bereich des Profils, sonst „Alle Bereiche“ (ohne Blick auf „Meine Fächer“).
3. **Echtes Löschen nur für den Super-Admin:** freigegeben (Änderung der Lösch-Policies).
4. **Annahme bestätigt:** Leistungsnachweise, Werkzeugkiste, Shop/Hof und Fachbereich-Einstellungen bleiben wie sie sind.
5. **ID-Kollision gelöst:** Die Werkzeugkiste-Spec heißt jetzt PROJ-71 (INDEX, PRD und Code-Kommentare angepasst).

### H) Pakete
Keine neuen Pakete.

## Implementation Notes (Backend, 2026-11-04)

**Datenbank** (beide Migrationen am 2026-11-04 in Produktion eingespielt; Rückweg-SQL je Datei; Probe `proj70_rechte_probe.sql` bestanden: alle 20 Prüfwerte wie erwartet):
- `20261107_proj70_inhalte_offen.sql`: `can_admin_subject`, `can_admin_department_content`, `can_admin_question` geben jeder Lehrer-Rolle „ja“ (die Policies selbst bleiben unverändert). `content_versions_read` für alle Lehrer-Rollen offen, Versionen privater Nachweis-Fragen (ohne Bereich) bleiben beim Besitzer. Neuer Löschschutz (`guard_hard_delete`, BEFORE DELETE auf Fragen, Themen, Fächern, Prüfungssets): endgültiges Löschen nur Super-Admin. Ausnahmen: Dienst-Zugriffe ohne Anmeldung (`auth.uid()` leer, z. B. Konto löschen), private Nachweis-Fragen, und Rückbau eigener Inhalte der letzten 15 Minuten (Import-Abbruch räumt halb angelegte Fragen auf).
- `20261107_proj70_auswertung_ruecknahme.sql`: Index Person + Zeitpunkt; `content_changes_per_person` (Auswertung), `person_revert_plan` (Vorschau, ändert nichts), `revert_person_changes` (Rücknahme in Stücken von höchstens 200, ein Vorgang, setzt gelöschte Inhalte zurück, legt vom Nutzer angelegte in den Papierkorb). Alle drei nur Super-Admin, in der Funktion selbst geprüft; `anon` ohne Recht.
- Probe: `supabase/tests/proj70_rechte_probe.sql` (Rechte-Matrix Lehrkraft ohne Eintragung / Azubi / Bereichs-Admin / Super-Admin, Löschschutz, Sammel-Rücknahme; endet absichtlich mit „PROBE-ERGEBNIS“ und rollt zurück). Gelaufen, alle Werte wie erwartet.

**Server:**
- `_lib/auth.ts`: `requireContentAdmin` lässt jede Lehrer-Rolle ohne Fach-Eintragung herein, liefert `departmentIds` (alle Bereiche), `scopeDepartmentIds` (Bereichsleiste, `null` = alle) und `departmentId` (Zielbereich der Leiste). Neues Cookie `admin_bereich` („alle“ oder Bereichs-ID); Startbereich = Profil-Bereich, ohne Profil-Bereich „alle“, Super-Admin wie bisher sein gewählter Bereich. `resolveTargetDepartment` / `targetDepartmentMissing` für Neues (in „Alle Bereiche“ Pflichtfeld, 400 mit `field: department_id`). `canAdminSubject`/`…DepartmentContent`/`…Question` bleiben als eine Stelle, geben aber „ja“ (Bereich muss existieren).
- Neu: `POST /api/admin/context/bereich` (jede Lehrer-Rolle; setzt bei konkretem Bereich für den Super-Admin auch das alte Cookie), in `roles.ts` für Lehrkräfte freigegeben.
- Listen (`questions`, `topics`, `subjects`, `exam-sets`, `trash`, Seite Prüfungssets) filtern nach der Bereichsleiste (Bereichs-Bedingung in der Abfrage, keine ID-Listen). Antworten enthalten `department_name`/`department_code` (Etikett), `last_changed_by`/`last_changed_at` für alle vier Typen (gemeinsamer Helfer `loadLastChanges`), `version_number` für den Konflikt-Schutz; der Papierkorb zusätzlich `deleted_by`.
- Fragen-Liste: Fach-Kürzel wird im Bereich der Leiste gesucht, in „Alle Bereiche“ über alle Treffer.
- Konflikt-Schutz (`expected_version` → 409 mit Namen und `conflict: true`) jetzt auch bei Themen, Fächern und Prüfungssets.
- Vorgangs-Bündelung zusätzlich bei „KI-Entwürfe annehmen“ (bulk-accept) und Prüfungsset-Import; Mehrfachaktion, Bulk-Import (trägt auch den Kopier-Prompt) waren schon gebündelt.
- Super-Admin-Routen: `GET content-history/changes` (Filter Person, Zeitraum, Bereich, Fach, Typ, Art; seitenweise), `GET content-history/people` (Änderungen je Person), `GET …/people/[id]/preview` (Betroffene und Konflikte), `POST …/people/[id]/revert` (Rücknahme in Stücken, ein Vorgang; „umkehren“ = bestehende Vorgangs-Rücknahme).
- Texte (`roles.ts`): Lehrkraft = „Du siehst alle Bereiche und Fächer.“, Navigation „alle Bereiche“, Rollen-Erklärsatz angepasst. Admin-Layout blendet Inhalts-Seiten nicht mehr ohne Fach-Eintragung aus.

**Tests:** 2.497 grün (vorher 2.468): Auth (Rollen × Zugang, Startbereich, Cookie, Zielbereich), Bereichs-Cookie-Route, Konflikt bei Themen, Papierkorb mit Etikett und löschender Person, Auswertung, Vorschau, Sammel-Rücknahme (Konflikte, Stücke, Abbruch), Protokoll-Filter, `loadLastChanges`, Zeitraum-Prüfung. Alte PROJ-24/48-Tests („Bereichs-Admin sieht fremden Bereich nicht“, „Lehrkraft ohne Zuständigkeit 403/404“) wurden an die neuen Regeln angepasst und nicht gelöscht.

**Abweichungen / Offenes:**
- Fach-Zuständigkeiten (`teacher_subject_assignments`, `my-subjects`, `teacher-assignments`) bleiben unverändert in der Datenbank; ihre Rechte-Wirkung ist weg. Rest-Aufräumen (Navigation „Trag deine Fächer ein“, Leerzustand, Willkommens-Dialog) gehört zur Oberfläche.
- **Noch nicht gebaut (Oberfläche, `/frontend`):** Bereichsleiste, Bereichs-Etiketten, Zielbereich-Feld, Verlauf für Fächer und Prüfungssets, Konflikt-Hinweis mit Zählnummer, Protokoll-Oberfläche mit Rücknahme-Dialog, Aufräumen der Hinweise zu „Meine Fächer“.
- **Nicht umgesetzt:** Wiederherstellen-Warnung bei heutigen Qualitätsregeln liegt in der Oberfläche; Kopier-Prompt-Import ohne eigene Route (nutzt Bulk-Import). Der Prüfungsset-Import (`exam-sets/import`) bleibt Bereichs-Admin und Super-Admin vorbehalten (eigener Zugang `requireAdmin`), nicht Lehrkräften.
- Die SQL-Funktionen sind nur durch die Probe prüfbar (kein Dev-Server, keine Schreibzugriffe an die Produktion von hier). Reihenfolge laut Spec: Migrationen einspielen, Probe, dann Code deployen.

## Implementation Notes (Frontend, 2026-11-04)

**Neu:**
- `admin-scope-bar.tsx` (Bereichsleiste, ersetzt `admin-scope-note.tsx`): „Du siehst: Spedition / Tourismus / alle Bereiche“ plus Umschalter „Bereich wechseln“ (44 px, bricht auf dem Handy um), für jede Lehrer-Rolle sichtbar, sobald es mehr als einen Bereich gibt. Der Seitenkopf (`AdminPageHeader`) zeigt sie auf allen Seiten der Gruppe „Inhalte“. Das Admin-Layout löst den Bereich mit derselben Funktion wie die Routen auf (`resolveContentScope`, jetzt exportiert) und gibt ihn über `AdminRoleProvider.scope` weiter. Die Seitenleisten-Auswahl des Super-Admins ruft jetzt ebenfalls `/api/admin/context/bereich` auf, damit beide Umschalter denselben Stand haben.
- `content-meta.tsx`: `DepartmentTag` (Bereichs-Etikett als Text, nur in „Alle Bereiche“), `LastChangedLine` („Zuletzt geändert von … am …“), `useEmptyScopeText` (Leerzustand nennt den Bereich), `showVersionConflict` (409 → Hinweis mit „Verlauf ansehen“).
- `target-department-field.tsx`: „Wird angelegt in: …“, in „Alle Bereiche“ Pflichtfeld ohne Vorauswahl.
- `content-changes-panel.tsx` (nur Super-Admin, Reiter „Inhalte & Personen“ im Änderungsprotokoll): Änderungen je Person, Protokoll mit Filtern (Inhaltstyp, Art, Bereich), „Mehr laden“, „Alle zurücknehmen“ mit Vorschau, Konflikte einzeln (standardmäßig nicht überschreiben) und „Rücknahme umkehren“ im Erfolgs-Toast.

**Geändert:**
- Fragen, Themen, Fächer, Prüfungssets, Papierkorb: Bereichs-Etikett, „Zuletzt geändert“ (Prüfungssets-Seite lädt es jetzt), Leerzustand mit Bereich, Papierkorb mit löschender Person. Fächer und Prüfungssets haben jetzt die Verlauf-Schublade.
- Konflikt-Schutz in der Oberfläche: Fragen, Themen, Fächer und Prüfungssets senden `expected_version` und zeigen bei 409 den Hinweis mit Link zum Verlauf. Die Fragen-Liste liefert dafür `version_number`.
- Zielbereich: Fach-Dialog und Prüfungsset-Dialog mit `TargetDepartmentField`. Bei Fragen bestimmt das Fach den Bereich; die Fach-Chips nennen in „Alle Bereiche“ den Bereich dazu (gleiche Kürzel in mehreren Bereichen).
- Verlauf-Schublade: „Ältere Versionen laden“ (seitenweise) und Warnung „Danach wurde noch n-mal geändert“ vor dem Wiederherstellen.

**Tests:** 2.505 grün (neu: Bereichsleiste, Etikett, Zielbereich, Konflikt-Hinweis). `npm run build` ohne Fehler.

**Nachgetragen (zweiter Durchgang):**
- Zielbereich im Kopier-Prompt/Bulk-Import (`ai-generator`) und im CSV-Dialog: in „Alle Bereiche“ Pflichtfeld, der Prompt (Fächer) richtet sich nach dem gewählten Bereich.
- Fach-Filter im Protokoll „Inhalte & Personen“.
- Die „Trag deine Fächer ein“-Kachel auf der Startseite ist entfernt (Test angepasst, nicht gelöscht).

**Noch offen / bewusst nicht gebaut:**
- Prüfungsteile im Prüfungsset-Dialog stammen vom eigenen Bereich (`useExamParts`); für einen fremden Zielbereich fehlt eine Route, die dessen Teile liefert.
- Warnung beim Wiederherstellen bei Verstoß gegen heutige Qualitätsregeln (braucht Server-Prüfung).
- Bereichsleiste nur in der Gruppe „Inhalte“: Nutzer-, Nachweis- und Protokoll-Seiten filtern nicht nach der Leiste (eigener Bereichs-Cookie bzw. Nachweis-Regeln). Eine Leiste ohne Wirkung wäre irreführend, daher dort nicht gezeigt.
- Bereichsname in der Kopfzeile von Druck/Export: Es gibt keine gedruckten Inhaltslisten, die betroffen wären.
- Toter Code für `hasSubjectAssignments` in Navigation/Shell/Befehlspalette (Layout setzt immer `true`) bleibt, bis PROJ-48 aufgeräumt wird.
- Nicht im Browser geprüft (kein Dev-Server).

## QA Test Results

**Geprüft:** 2026-11-04 (Code- und Migrationsreview, automatisierte Tests). **Nicht geprüft:** Browser, Responsive, Cross-Browser, Playwright (Projektregel: kein Dev-Server, siehe Memory „Kein Dev-Server“). SQL-Funktionen nur über die vorhandene Probe `supabase/tests/proj70_rechte_probe.sql` (laut Implementierungsnotiz bestanden, hier nicht erneut ausgeführt).

### Automatisierte Prüfung
- `npm test`: 208 Dateien, **2.505 Tests grün**. `tsc --noEmit`: ohne Fehler. `npm run lint`: 0 Fehler, 55 Warnungen (bestehend).
- Neue/angepasste Tests decken Rollen × Zugang, Bereichs-Cookie, Konflikt-Schutz, Papierkorb, Auswertung, Vorschau, Sammel-Rücknahme, Bereichsleiste, Etikett, Zielbereich ab.

### Akzeptanzkriterien (nach Code-Review)
| Bereich | Ergebnis |
|---|---|
| Sehen und Ändern (Rechte-Funktionen, RLS, Torwächter, Azubis unverändert) | Bestanden, mit BUG-1 (Privat-Fragen) |
| Zielbereich-Pflichtfeld (Frage, Fach, Set, Import, CSV) | Bestanden; Set-Dialog siehe BUG-2 |
| Schülerdaten geschützt (`can_admin_department` & Co. unberührt) | Bestanden |
| Navigation und Texte, „Meine Fächer“ ohne Wirkung | Bestanden |
| **Bereichsleiste auf jeder Seite, die Inhalte oder Personen listet** | **Teilweise:** nur Gruppe „Inhalte“; Nutzer, Leistungsnachweise, Änderungsprotokoll ohne Leiste (BUG-3) |
| Etikett, „Zuletzt geändert“, Leerzustand mit Bereich | Bestanden (Code) |
| Lückenlose Nachvollziehbarkeit, Bündelung der Massenwege | Bestanden; Prüfungsset-Import bleibt Bereichs-Admin (dokumentierte Abweichung) |
| Verlauf für alle vier Typen, „mehr laden“, Konflikt-Schutz | Bestanden; **Warnung bei heutigen Qualitätsregeln fehlt** (BUG-4) |
| Rückgängig: Einzelversion, Papierkorb, nur Super-Admin leert, Sammel-Rücknahme mit Vorschau, Konflikte nicht überschreiben, umkehrbar | Bestanden (Tests + Funktionsreview) |
| Löschschutz (`guard_hard_delete`) | Bestanden; Ausnahmen (Dienst-Zugriff, privat, 15 Min. eigen) nachvollziehbar |
| Druck/Export nennt Bereich | Entfällt (keine gedruckten Inhaltslisten) |

### Gefundene Fehler
- **BUG-1 (Medium, Sicherheit): Jede Lehrkraft kann private Nachweis-Fragen anderer wiederherstellen.** `restore_content_version` (aus PROJ-48) prüft bei Fragen `… OR can_admin_question(p_content_id)`. Seit der Öffnung liefert `can_admin_question` für jede Lehrer-Rolle „ja“, auch für `is_private`-Fragen. Die Funktion ist `SECURITY DEFINER` und liest Versionen ohne RLS. Wer die UUID einer fremden privaten Frage und eine Versionsnummer kennt, kann sie auf eine ältere Fassung zurücksetzen (inklusive `is_private`/`owner_id` aus den Versionsdaten). Die UUID ist nicht erratbar und die Versionen sind per RLS verborgen, daher nicht Critical. Die Probe enthält keinen Privat-Fall. Verstößt gegen die Spec („Private Nachweis-Fragen bleiben beim Besitzer“, PROJ-46). Fix: In `restore_content_version` den Zweig für private Fragen vor `can_admin_question` prüfen (privat nur `can_manage_private_question`) oder `can_admin_question` für `is_private` auf `false` setzen, plus Fall in die Probe.
- **BUG-2 (Medium–High, Funktion): Prüfungsset-Dialog zeigt Prüfungsteile des eigenen Bereichs, auch bei fremdem Zielbereich.** `useExamParts()` kommt aus dem eigenen Bereich. Legt eine Lehrkraft in „Alle Bereiche“ ein Set für Tourismus an, kann sie nur Teile ihres Bereichs wählen. Das Anlegen in fremden Bereichen ist damit für Prüfungssets unvollständig (Spec: „in jedem Bereich anlegbar“). Offen laut Implementierungsnotiz, eine Route für die Teile des Zielbereichs fehlt.
- **BUG-3 (Medium): Bereichsleiste fehlt auf Nutzer-, Leistungsnachweis- und Protokoll-Seiten.** Spec verlangt sie dort (inkl. Nutzerliste: fester Bereich für Bereichs-Admin, Umschalter für Super-Admin). Bewusste Abweichung (Leiste ohne Wirkung wäre irreführend), aber nicht von der Spec gedeckt. Entscheidung des Nutzers nötig: Spec anpassen oder Leiste nachrüsten.
- **BUG-4 (Low): Keine Warnung beim Wiederherstellen, wenn die Version heutige Qualitätsregeln verletzt.** Acceptance Criterion offen (braucht Server-Prüfung).
- **BUG-5 (Low): Toter Code `hasSubjectAssignments`** in Navigation/Shell/Befehlspalette, Layout setzt immer `true`. Aufräumen, kein Verhalten betroffen.
- **Hinweis (Info):** SQL-Funktionen `person_revert_plan`/`revert_person_changes` sind nur durch die Probe abgedeckt; der Plan läuft pro Aufruf je Chunk erneut über alle Versionen der Person (Leistung bei sehr vielen Änderungen im Blick behalten). Speicherverbrauch der Versionen laut Spec beim QA zu nennen: nicht gemessen.

### Sicherheitsprüfung (Red Team, Code-Ebene)
- Super-Admin-Funktionen (`content_changes_per_person`, `person_revert_plan`, `revert_person_changes`) prüfen `is_admin()` selbst, `anon` ohne Recht. Bestanden.
- Schülerdaten-Funktionen unverändert, Nutzer-Routen weiter Bereichs-Admin/Super-Admin. Bestanden.
- Harter Löschschutz per Trigger greift auch bei direkten DB-Zugriffen; Ausnahme `auth.uid() IS NULL` ist nur über Service-Zugang erreichbar. Bestanden.
- Bereichs-Cookie `admin_bereich`: unbekannter Wert fällt auf „Alle Bereiche“ zurück; kein Rechtegewinn durch Manipulation, da Rechte unabhängig vom Cookie gelten. Bestanden.
- Offen: BUG-1.

### Entscheidung
**Kein Critical/High nach strenger Lesart, aber BUG-2 beeinträchtigt eine Kernfunktion (Sets in fremdem Bereich) und BUG-1 ist ein Rechteleck.** Empfehlung: **NOCH NICHT produktionsreif.** Erst BUG-1 und BUG-2 beheben, BUG-3 entscheiden, dann `/qa` erneut. Browser-Prüfung (375/768/1440 px, Chrome/Firefox/Safari) steht noch aus und muss manuell durch den Nutzer erfolgen.

### Erneute QA (2026-11-04)
BUG-1 bis BUG-5 behoben und geprüft: 2.509 Tests grün, `tsc`, Lint (0 Fehler), `npm run build` sauber; SQL-Probe in Produktion vollständig bestanden (T1–T8). Kein Critical/High offen. **Entscheidung: produktionsreif.** Einschränkung: keine Browser-/Responsive-/Cross-Browser-Prüfung (Projektregel „kein Dev-Server“); der Nutzer prüft die Oberfläche nach dem Deploy selbst.

### Behebung der QA-Funde (2026-11-04, auf Wunsch des Nutzers direkt umgesetzt)
- **BUG-1 behoben (Datenbank):** Migration `20261108_proj70_privat_schutz.sql` (+ `_down`): `can_admin_question` liefert für `is_private`-Fragen „nein“. Besitzer und Super-Admin laufen weiter über `can_manage_private_question`/`is_admin()` (Policies und `restore_content_version`). Probe `proj70_rechte_probe.sql` um T8a–c erweitert (fremde private Frage: Verwalten false, Wiederherstellen abgelehnt, Super-Admin darf). **Eingespielt, Probe bestanden (2026-11-04):** alle Werte T1–T8 wie erwartet (T8a `f`, T8b „nicht berechtigt“, T8c ok).
- **BUG-2 behoben:** `getExamPartsByDepartment` (neu) liefert die Prüfungsteile je Bereich; die Prüfungsset-Seite reicht sie an den Client. Teile, Fächer und Beschriftung folgen dem Zielbereich (Anlegen), dem Bereich des Sets (Bearbeiten, Liste) bzw. dem festen Bereich der Leiste. Beim Wechsel des Zielbereichs werden Teil und Fragenauswahl zurückgesetzt.
- **BUG-3 behoben:** Die Bereichsleiste steht jetzt auch bei **Nutzer**, **Leistungsnachweisen** (nur die Liste) und **Änderungsprotokoll**. Drei Modi: `content` (wie bisher), `assessments` (Umschalter für jede Lehrer-Rolle), `people` (Super-Admin mit Umschalter; Bereichs-Admin sieht den eigenen Bereich fest, ohne Umschalter). Wirkung: Nutzerliste folgt der Leiste („Alle Bereiche“ = `scope=all`, der alte Schalter entfällt mit Leiste); Nachweis-Liste lädt mit `departmentId` der Leiste; Audit-Log-Route nimmt `department_id` (nur wirksam für den Super-Admin); „Inhalte & Personen“ nutzt den Bereich der Leiste statt eines eigenen Bereichs-Filters.
- **BUG-4 behoben:** Der Wiederherstellen-Dialog der Verlauf-Schublade prüft die Fassung mit `analyzeVersionData` (Torwächter-Regeln, `question-quality.ts`) und nennt Verstöße vor dem Bestätigen. Wiederherstellen bleibt möglich.
- **BUG-5 behoben:** `hasSubjectAssignments`, `useHasSubjects`, `needsSubjects` und der `SubjectsGate`-Leerzustand sind entfernt; die zugehörigen Tests wurden an die neue Regel angepasst (nicht gelöscht, außer dem Test des entfernten Leerzustands).
- **Tests:** 2.509 grün, `tsc`, Lint (0 Fehler) und `npm run build` sauber. Neue Tests: Leistenmodi je Seite/Rolle, `analyzeVersionData`. Nicht im Browser geprüft.

## Deployment
_To be added by /deploy_
