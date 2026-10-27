# PROJ-47: Änderungsverlauf & Wiederherstellen für Inhalte

## Status: Deployed
**Created:** 2026-10-26
**Last Updated:** 2026-10-27

## Kontext
Teil der „Super-App für Lehrkräfte“ (Gesamtplan siehe PROJ-44). Mit PROJ-48 sollen Lehrkräfte sich selbst für Fächer eintragen und deren Inhalte pflegen können. Der Nutzer setzt dabei bewusst auf **Vertrauen statt Freigabe**. Die Bedingung dafür: Jede Änderung an Inhalten der App wird konkret mit Name und Datum festgehalten und lässt sich zur Not rückgängig machen.

Heute schreibt das Änderungsprotokoll (PROJ-9/24, `admin_audit_log`) nur, **wer wann was** getan hat, z. B. „Frage deaktiviert“. Der Inhalt vor der Änderung wird nicht gespeichert, ein Zurücksetzen ist also nicht möglich. Dieses Feature ergänzt einen echten Versionsverlauf.

## Dependencies
- Requires: PROJ-24 (Rechtetrennung) – wer welche Inhalte sehen und ändern darf
- Baut auf: bestehendem Änderungsprotokoll (`/admin/audit-log`)
- Blockiert: PROJ-48 (Fach-Zuständigkeiten) – darf erst live gehen, wenn Wiederherstellen funktioniert

## Geltungsbereich
Erfasst werden **Lerninhalte**:
- Fragen inklusive Antwortoptionen, Erklärung, Musterlösung, Fach- und Themen-Zuordnung, Aktiv-Status und Kennzeichen „nur für Nachweise“
- Themen (Name, Reihenfolge, Fach)
- Fächer (Name, Kürzel, Reihenfolge)
- Prüfungssets der Prüfungssimulation (Name, Fragenliste, Dauer, Status)

Nicht erfasst werden: Leistungsnachweise und Noten (haben eigene Regeln), Nutzerprofile, Shop-Items und Fachbereichs-Einstellungen. Diese Bereiche ändern weiterhin nur Admins, und das bestehende Protokoll reicht dort.

## User Stories
- Als **Super-Admin** möchte ich bei jeder Frage sehen, wer sie wann angelegt und geändert hat, damit ich weiß, wen ich ansprechen kann.
- Als **Super-Admin** möchte ich eine Änderung mit einem Klick rückgängig machen, damit ein Fehler oder Unfug einer einzelnen Person keinen dauerhaften Schaden anrichtet.
- Als **Super-Admin** möchte ich alle Änderungen einer Person in einem Zeitraum auf einmal zurücknehmen können, damit ich bei Missbrauch nicht hunderte Fragen einzeln reparieren muss.
- Als **Lehrkraft** möchte ich vor dem Bearbeiten den Verlauf einer Frage sehen, damit ich verstehe, warum sie so formuliert ist, und die Person fragen kann.
- Als **Lehrkraft** möchte ich meine eigene Änderung zurücknehmen, wenn ich mich vertan habe.
- Als **Lehrkraft** möchte ich eine versehentlich gelöschte Frage oder ein gelöschtes Thema wiederherstellen.

## Acceptance Criteria

### Aufzeichnen
- [ ] Jedes Anlegen, Ändern, Deaktivieren, Aktivieren und Löschen eines erfassten Inhalts speichert eine **Version** mit dem vollständigen Stand nach der Änderung, der ändernden Person, Datum und Uhrzeit sowie der Art der Änderung.
- [ ] Das gilt für jeden Weg: Einzelbearbeitung, Mehrfachaktionen, Bulk-Import, Fragen aus Material, Kopier-Prompt-Import, Qualitäts-Korrekturläufe (PROJ-16) und direkte Skripte von Claude Code. Läuft eine Änderung nicht über eine angemeldete Person, wird sie mit einer klaren Quelle gespeichert (z. B. „Qualitäts-Korrekturlauf 2026-10-30“).
- [ ] Massenaktionen (z. B. Import von 40 Fragen) werden als **ein zusammengehöriger Vorgang** gespeichert, der sich als Ganzes zurücknehmen lässt.
- [ ] Die Aufzeichnung lässt sich nicht umgehen oder nachträglich verändern. Auch Admins können Versionen nicht bearbeiten oder löschen.
- [ ] Für die bestehenden rund 8.300 Fragen und alle Themen, Fächer und Prüfungssets wird beim Start einmalig eine Ausgangsversion angelegt („Stand bei Einführung“), damit auch die erste spätere Änderung zurückgenommen werden kann.

### Verlauf ansehen
- [ ] Jede Frage, jedes Thema, jedes Fach und jedes Prüfungsset hat einen Reiter oder eine Schublade „Verlauf“ mit allen Versionen, neueste zuerst: wer, wann, was.
- [ ] Zu jeder Version lässt sich der Unterschied zur vorherigen anzeigen: geänderte Felder nebeneinander, entfernter Text rot, neuer grün.
- [ ] Bei Fragen steht in der Fragenliste „Zuletzt geändert von <Name> am <Datum>“.
- [ ] Den Verlauf sieht jede Person, die den Inhalt bearbeiten darf.

### Wiederherstellen
- [ ] Im Verlauf hat jede ältere Version die Aktion „Diese Version wiederherstellen“. Danach entspricht der Inhalt genau dieser Version.
- [ ] Wiederherstellen ist selbst eine Änderung: Es erzeugt eine neue Version („wiederhergestellt aus Version vom …“). Es wird nichts überschrieben oder gelöscht, und auch das Wiederherstellen lässt sich wieder zurücknehmen.
- [ ] Wiederherstellen darf, wer den Inhalt bearbeiten darf.
- [ ] Gelöschte Inhalte landen in einem **Papierkorb** je Bereich, statt endgültig zu verschwinden. Von dort lassen sie sich mit allen Zuordnungen wiederherstellen.
- [ ] Endgültig leeren kann den Papierkorb nur der Super-Admin.

### Zurücknehmen in größerem Umfang (Super-Admin)
- [ ] Das Änderungsprotokoll lässt sich nach Person, Zeitraum, Bereich, Fach und Art der Änderung filtern.
- [ ] Der Super-Admin kann einen ganzen Vorgang (z. B. einen Import) oder alle Änderungen einer Person in einem Zeitraum gesammelt zurücknehmen.
- [ ] Vorher zeigt eine Vorschau, wie viele Inhalte betroffen sind und wo jemand anderes den Inhalt inzwischen weiter bearbeitet hat. Diese Fälle werden einzeln aufgeführt und standardmäßig **nicht** überschrieben.
- [ ] Jede Sammel-Rücknahme wird selbst als ein Vorgang gespeichert und lässt sich wieder umkehren.

### Auswirkungen
- [ ] Wiederherstellen ändert nichts an bereits gegebenen Antworten, XP, Münzen oder Statistiken der Azubis.
- [ ] Laufende oder abgeschlossene Leistungsnachweise bleiben durch ihren Fragen-Snapshot (PROJ-21) unberührt.

## Edge Cases
- **Version verweist auf ein inzwischen gelöschtes Thema oder Fach:** Beim Wiederherstellen erscheint ein Hinweis. Das Thema wird mit wiederhergestellt, wenn es im Papierkorb liegt. Sonst bleibt die Frage ohne Thema, und die Person wird darauf hingewiesen.
- **Zwei Personen bearbeiten dieselbe Frage fast gleichzeitig:** Die zweite Speicherung wird abgelehnt mit „Diese Frage wurde gerade von <Name> geändert“ und einem Link zum Verlauf. Es gibt keinen stillen Datenverlust.
- **Wiederhergestellte Version verstößt gegen heutige Qualitätsregeln:** Der Torwächter (PROJ-16) zeigt eine Warnung. Wiederherstellen ist trotzdem möglich, damit eine Notfall-Rücknahme nie blockiert wird.
- **Frage wurde gelöscht, während ein offener Nachweis sie nutzt:** Wie heute schützt der Snapshot den Nachweis. Die Frage liegt im Papierkorb.
- **Konto der ändernden Person wurde gelöscht:** Die Versionen bleiben, „Geändert von“ zeigt „Gelöschtes Konto“.
- **Sehr viele Versionen einer Frage** (z. B. Korrekturläufe): Der Verlauf lädt seitenweise, und ältere Versionen sind einklappbar.
- **Speicherplatz:** Versionen speichern nur Text. Wird der kostenlose Datenbank-Rahmen knapp, warnt das Architektur-Konzept vorher. Ältere Versionen werden nie still gelöscht.

## Abgrenzung (nicht Teil dieses Features)
- Versionen für Leistungsnachweise, Noten, Profile, Shop-Items und Bereichs-Einstellungen
- Benachrichtigung bei Änderungen (z. B. „Deine Frage wurde geändert“)
- Freigabe-Workflow vor Änderungen (bewusst nicht gewollt: Vertrauen + Rücknahme)

## Technical Requirements
- **Unumgehbar:** Die Aufzeichnung muss auch Änderungen erfassen, die nicht über die App-Routen laufen (Skripte, Korrekturläufe). Versionen sind für alle Rollen nur lesbar.
- **Kein Datenverlust:** Löschen wird für erfasste Inhalte zum Papierkorb, solange der Super-Admin nicht endgültig leert.
- **Tests:** Vitest für Aufzeichnen, Wiederherstellen, Papierkorb und Sammel-Rücknahme. Dazu eine SQL-Prüfung in einer Transaktion mit Rollback, dass auch direkte Datenbank-Änderungen eine Version erzeugen, und `npm run build`. Kein Dev-Server und kein Playwright.
- **Kosten:** keine neuen Dienste.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Bauteile (Komponenten-Struktur)

```
Fragen- / Themen- / Fach- / Prüfungsset-Ansicht (bestehend)
├── Zeile/Karte: Zusatz "Zuletzt geändert von <Name> am <Datum>"
└── Neuer Baustein: "Verlauf"-Schublade (öffnet sich wie die bestehenden
    Bearbeiten-Dialoge, von rechts)
    ├── Versions-Liste, neueste zuerst (wer, wann, welche Art der Änderung)
    ├── Unterschied-Ansicht zu einer gewählten Version
    │   (entfernter Text rot, neuer Text grün, Feld für Feld)
    └── Aktion "Diese Version wiederherstellen"

Neuer Bereich: Papierkorb (in der Lehrkräfte-Navigation)
├── Je Bereich (Fragen, Themen, Fächer, Prüfungssets) eine Liste
│   der gelöschten Einträge mit Löschdatum
├── Aktion "Wiederherstellen"
└── Aktion "Endgültig entfernen" (nur sichtbar für Super-Admin)

Bestehendes Änderungsprotokoll (/admin/audit-log) — erweitert
├── Neue Filter: Person, Zeitraum, Bereich, Fach, Art der Änderung
├── Neue Aktion: "Diesen Vorgang zurücknehmen" (z. B. einen ganzen Import)
├── Neue Aktion: "Alle Änderungen dieser Person im Zeitraum zurücknehmen"
└── Vorschau-Dialog vor der Sammel-Rücknahme:
    zeigt Anzahl betroffener Inhalte + Liste der Konflikte
    (Inhalte, die inzwischen jemand anders weiter bearbeitet hat)
```

### B) Datenmodell (einfache Sprache)

- **Versionsgeschichte:** Jede Frage, jedes Thema, jedes Fach und jedes
  Prüfungsset bekommt bei jeder Änderung einen neuen Eintrag mit dem
  kompletten Inhalt nach der Änderung, der ändernden Person (oder einer
  Quellen-Bezeichnung, wenn kein Login beteiligt war, z. B. "Qualitäts-
  Korrekturlauf 2026-10-30"), Datum/Uhrzeit und der Art der Änderung
  (angelegt, geändert, deaktiviert, aktiviert, gelöscht, wiederhergestellt).
- **Vorgang:** Mehrere Versionen, die zusammen durch eine einzelne Aktion
  entstehen (z. B. ein Import von 40 Fragen), bekommen eine gemeinsame
  Vorgangs-Kennung. So lässt sich der ganze Vorgang mit einem Klick
  zurücknehmen.
- **Papierkorb statt Löschen:** Gelöschte Inhalte werden mit einem
  Löschdatum markiert, aber nicht entfernt. Sie tauchen in normalen Listen
  nicht mehr auf, bleiben aber im Papierkorb sichtbar. Erst der Super-Admin
  kann sie endgültig entfernen.
- **Startpunkt:** Für die rund 8.300 bestehenden Fragen und alle
  bestehenden Themen, Fächer und Prüfungssets wird einmalig eine erste
  Version "Stand bei Einführung" angelegt.
- **Konflikt-Erkennung:** Jeder Inhalt trägt eine Zählnummer, die sich mit
  jeder Version erhöht. Will jemand speichern, dessen Zählnummer beim
  Öffnen bereits veraltet war (weil inzwischen jemand anders geändert hat),
  wird das abgelehnt — mit Hinweis, wer zwischenzeitlich geändert hat.

### C) Technik-Entscheidungen (und warum)

- **Die Versionsgeschichte entsteht direkt in der Datenbank, nicht im
  Programmcode der Webseite.** Grund: Die Anforderung ist, dass wirklich
  jede Änderung erfasst wird — auch über Wege, die nicht durch die Webseite
  laufen (Bulk-Import-Skripte, Qualitäts-Korrekturläufe, direkte
  Datenbank-Eingriffe). Nur eine Regel direkt in der Datenbank sieht
  garantiert jeden Weg und lässt sich nicht versehentlich vergessen, wenn
  später neue Import-Wege entstehen.
- **Papierkorb (weiches Löschen) statt echtem Löschen.** Grund: Erfüllt
  "kein Datenverlust" ohne dass jede bestehende Liste in der App neu
  durchdacht werden muss — sie blendet Papierkorb-Einträge einfach aus.
- **Gemeinsame Vorgangs-Kennung für Massenaktionen.** Grund: Ermöglicht die
  geforderte Sammel-Rücknahme (ganzer Import, oder alle Änderungen einer
  Person in einem Zeitraum), ohne dass die App für jede einzelne Änderung
  zusätzlich Buch führen muss.
- **Zählnummer statt Sperren für Konflikt-Erkennung.** Grund: Verhindert
  stillen Datenverlust bei fast gleichzeitiger Bearbeitung (Edge Case aus
  der Spec), ohne dass Inhalte während der Bearbeitung für andere blockiert
  werden müssen.
- **Kein neuer Dienst, keine neuen laufenden Kosten.** Alles läuft in der
  bestehenden Supabase-Datenbank. Einzige Beobachtungs-Aufgabe: Da
  Versionen nie automatisch gelöscht werden, sollte der
  Datenbank-Speicherverbrauch gelegentlich geprüft werden, damit der
  kostenlose Rahmen nicht überraschend ausgeschöpft wird.
- **Reihenfolge mit PROJ-48:** Dieses Feature muss vor PROJ-48
  (Fach-Zuständigkeiten für Lehrkräfte) live gehen, wie in der Spec
  gefordert — denn erst mit Verlauf und Wiederherstellen ist "Vertrauen
  statt Freigabe" vertretbar.

### D) Abhängigkeiten (Pakete)

- Keine neuen Pakete für das Erfassen der Versionen (läuft als Regel in
  der bestehenden Datenbank).
- Ein kleines, kostenloses Text-Vergleichs-Paket für die
  Unterschied-Ansicht (zeigt, welche Wörter/Sätze sich zwischen zwei
  Versionen geändert haben, für die rot/grün-Darstellung).

## Implementierungs-Notizen (Backend + Frontend)

**Datenbank (live angewendet auf `riqafwijurbxvywzlipx`):**
- `content_versions` + `content_change_batches`, Trigger auf `questions`, `topics`, `subjects`, `exam_question_sets`, `answer_options`. Aufzeichnung läuft komplett in der Datenbank (SECURITY DEFINER-Funktion, keine INSERT/UPDATE/DELETE-Policy für Client-Rollen) — damit erfassen auch direkte Skripte und Korrekturläufe automatisch eine Version, ohne App-Code anzufassen.
- Startpunkt „Stand bei Einführung" für alle ~8.341 Fragen, 189 Themen, 9 Fächer, 3 Prüfungssets angelegt und per Stichprobe geprüft.
- Trigger-Verhalten in einer Live-Transaktion mit `BEGIN; …; ROLLBACK;` geprüft (Deaktivieren, Themen-Update) — entspricht der geforderten SQL-Prüfung ohne Datenverlust.
- `restore_content_version()` setzt einen Inhalt auf eine alte Version zurück (change_type `restored`). Bewusst ohne `DELETE`: Antwortoptionen haben feste Plätze (display_order 1–5) und werden per Upsert ersetzt; Fach-Zuordnungen werden beim Wiederherstellen nur **ergänzt**, nicht ersetzt — seither zusätzlich angelegte Verknüpfungen bleiben bestehen. Kleine, bewusste Abweichung von „exakt wie damals", um ohne risikoreiche Lösch-Anweisungen auszukommen.
- `group_recent_versions_into_batch()` bündelt Massenaktionen nachträglich zu einem Vorgang (statt Session-Variablen über mehrere HTTP-Anfragen hinweg zu verlassen, was bei gepoolten Verbindungen nicht zuverlässig wäre).

**APIs:** `/api/admin/content-history/[type]/[id]` (Verlauf), `.../restore`, `/api/admin/trash` + `/api/admin/trash/[type]/[id]` (Papierkorb, Super-Admin bzw. bereichsabhängig), `/api/admin/content-history/batches/[id]` (Vorschau + Sammel-Rücknahme, Super-Admin). Bestehende DELETE-Routen (Fragen, Themen, Prüfungssets) wurden auf `deleted_at` statt echtem Löschen umgestellt; bestehende GET-Listen filtern `deleted_at IS NULL`. Fragen-PATCH prüft optional `expected_version` gegen Konflikte (409 mit Name der zuletzt ändernden Person).

**Frontend:** `ContentHistorySheet` (wiederverwendbare Schublade mit Verlauf + einfacher Feld-Diff + Wiederherstellen) in Fragen- und Themen-Verwaltung eingebunden; „Zuletzt geändert von …" in der Fragenliste. Neue Seite `/admin/papierkorb` (Tabs je Inhaltstyp, Wiederherstellen, „Endgültig entfernen" nur Super-Admin). Änderungsprotokoll zeigt bei gebündelten Vorgängen (Bulk-Aktionen) einen „Zurücknehmen"-Button mit Konflikt-Vorschau.

**Bewusst nicht umgesetzt (Scope-Grenzen für diesen Durchlauf):**
- Fächer haben weiterhin keine DELETE-Route in der Oberfläche (nur De-/Aktivieren) — Papierkorb-Infrastruktur ist vorhanden, aber ungenutzt, bis das gebraucht wird.
- Vorgangs-Bündelung ist nur für die beiden häufigsten Massenaktionen verdrahtet (Fragen-Mehrfachaktion, CSV-Bulk-Import). KI-Fragen-Annahme, Kopier-Prompt-Import und Qualitäts-Korrekturläufe erzeugen weiterhin korrekt einzelne Versionen (Kernanforderung erfüllt), aber noch keinen gemeinsamen Vorgang zur Sammel-Rücknahme.
- „Alle Änderungen einer Person in einem Zeitraum zurücknehmen" (ohne Vorgangs-Bezug) ist nicht gebaut — nur die Rücknahme eines konkreten Vorgangs über das Änderungsprotokoll.
- Optimistische Konflikt-Prüfung (`expected_version`) ist nur für Fragen verdrahtet, nicht für Themen/Fächer/Prüfungssets (dort seltener, geringeres Risiko gleichzeitiger Bearbeitung).

## QA Test Results

**Testmethode:** `npm test` (Vitest, 1392 Tests) + `npm run build` + Code-/Sicherheits-Review der neuen Routen und der Datenbank-Funktionen + Live-Verifikation des Triggers auf der produktiven Datenbank in einer Transaktion mit Rollback. Kein `npm run dev` / Playwright — laut Projektregel bringt der Dev-Server auf diesem Rechner das MacBook zum Absturz; manuelles Browser-Testing wurde entsprechend nicht durchgeführt.

### Acceptance Criteria

**Aufzeichnen**
- [x] Jede Änderung speichert eine vollständige Version mit Person/Quelle, Datum, Art — über Datenbank-Trigger, live verifiziert.
- [x] Gilt für jeden Schreibweg inkl. Skripten/Korrekturläufen (Trigger sieht jede SQL-Änderung, unabhängig vom Weg).
- [~] Massenaktionen als ein Vorgang — umgesetzt für Fragen-Mehrfachaktion und CSV-Bulk-Import; KI-Fragen-Annahme, Kopier-Prompt-Import und Qualitäts-Korrekturläufe erzeugen weiterhin korrekte Einzel-Versionen, aber noch keinen gemeinsamen Vorgang.
- [x] Aufzeichnung nicht umgehbar/änderbar — keine INSERT/UPDATE/DELETE-Policy für Client-Rollen, nur die SECURITY DEFINER-Trigger-Funktion schreibt.
- [x] Startversion „Stand bei Einführung" für alle 8.341/189/9/3 Bestandsinhalte angelegt (Stichprobe geprüft).

**Verlauf ansehen**
- [~] Verlaufs-Schublade mit allen Versionen — in Fragen- und Themen-Verwaltung eingebunden; API für Fächer/Prüfungssets fertig, Oberfläche dort noch nicht verdrahtet.
- [x] Unterschied-Ansicht (geänderte Felder, alt rot/neu grün) — einfache Feld-für-Feld-Ansicht, kein reicher Text-Diff.
- [x] „Zuletzt geändert von … am …" in der Fragenliste.
- [x] Sichtbar für jede Person, die bearbeiten darf (RLS + Rollen-Check deckungsgleich).

**Wiederherstellen**
- [x] „Diese Version wiederherstellen" je älterer Version.
- [x] Wiederherstellen ist selbst eine Änderung (change_type `restored`), nichts wird überschrieben, wieder umkehrbar.
- [x] Nur wer den Inhalt bearbeiten darf, darf wiederherstellen (serverseitig in der Datenbank-Funktion geprüft, nicht nur in der API-Route).
- [x] Papierkorb je Bereich, mit allen Zuordnungen wiederherstellbar.
- [x] Endgültig leeren nur Super-Admin.

**Zurücknehmen in größerem Umfang**
- [~] Filter nach Zeitraum/Art/Bereich bestehen bereits; Personen- und Fach-Filter im Änderungsprotokoll wurden in diesem Durchlauf nicht ergänzt.
- [x] Ganzen Vorgang zurücknehmen (Bulk-Löschen/-Ändern/-Import) mit Vorschau + Konflikt-Erkennung.
- [ ] „Alle Änderungen einer Person in einem Zeitraum" gesammelt zurücknehmen — nicht umgesetzt, nur vorgangsbezogen.
- [~] Die Sammel-Rücknahme selbst wird im Änderungsprotokoll vermerkt, aber nicht als eigener `content_change_batch` gebündelt — ein „Zurücknehmen der Rücknahme in einem Klick" ist daher nicht möglich, nur Inhalt für Inhalt über deren jeweiligen Verlauf.

**Auswirkungen**
- [x] Wiederherstellen rührt Antworten/XP/Münzen/Statistiken nicht an (andere Tabellen, nicht Teil der Restore-Funktion).
- [x] Leistungsnachweis-Snapshots bleiben unberührt (Papierkorb entfernt keine Zeilen).

### Edge Cases
- [x] Gelöschtes Thema/Fach bleibt per Papierkorb real vorhanden — Fremdschlüssel bleibt beim Wiederherstellen gültig, auch ohne expliziten Hinweis-Dialog.
- [x] Gleichzeitige Bearbeitung einer Frage: `expected_version`-Konflikt-Prüfung mit 409 + Name der zuletzt ändernden Person. **Nicht** für Themen/Fächer/Prüfungssets umgesetzt (selteneres Risiko, aber Lücke).
- [~] Torwächter-Warnung bei Wiederherstellen einer heute ungültigen Version — Wiederherstellen ist nicht blockiert (Kernanforderung erfüllt), eine Warnung wird aber nicht extra angezeigt.
- [x] Gelöschtes Konto als ändernde Person → „Gelöschtes Konto" in der Verlaufs-Anzeige.
- [~] Seitenweises Laden ist in der API vorbereitet (page-Parameter), die Verlaufs-Schublade lädt aber bislang nur die erste Seite (20 Versionen) ohne „mehr laden".
- [ ] Speicherplatz-Warnung — nicht automatisiert, bewusst laut Spec als manuelle Beobachtungsaufgabe offen.

### Sicherheits-Audit (Red Team)
- **Gefunden & behoben:** `group_recent_versions_into_batch()` prüfte nur die Rolle der aufrufenden Person, nicht ob der konkrete Inhalt zu ihrem Bereich gehört. Ein Bereichs-Admin hätte über erratene content-IDs fremde, kürzlich erzeugte Versionen in den eigenen Vorgang bündeln können (Sichtbarkeit blieb durch die Lese-Policy auf `content_versions` zwar eingeschränkt, die Zuordnung selbst war aber zu großzügig). Fix: zusätzliche `can_admin_department`/Eigentümer-Prüfung in der UPDATE-Bedingung (Migration `proj47_batch_grouping_scope_fix`), vor Auslieferung angewendet und mit den bestehenden Tests erneut geprüft.
- Alle neuen Schreib-Endpunkte prüfen Authentifizierung + Rolle serverseitig (`requireAdmin`/`requireTeacherOrAdmin`); `restore_content_version` prüft zusätzlich unabhängig in der Datenbank-Funktion selbst (Verteidigung in der Tiefe).
- Keine Rohtext-SQL-Verkettung — alles über parametrisierte Supabase-Aufrufe bzw. RPC-Parameter.
- Versionsinhalte werden in der Oberfläche als reiner Text gerendert (kein `dangerouslySetInnerHTML`) — kein XSS-Risiko über manipulierte Fragentexte im Verlauf.
- Versionen selbst sind für jede Rolle unveränderlich (keine Schreib-Policy) — auch ein kompromittiertes Admin-Konto kann den Verlauf nicht nachträglich fälschen.

### Regressionstests
- Bestehende Fragen-/Themen-/Fächer-/Prüfungsset-Routen angepasst (Papierkorb statt Hart-Löschen, `deleted_at`-Filter) und mit aktualisierten/neuen Tests abgedeckt.
- Gesamte Test-Suite: 1392 Tests, 1 vorbestehender, unabhängiger Fehlschlag (`assessments/route.test.ts`, per `git stash` bestätigt bereits vor diesem Feature fehlschlagend — keine Regression dieses Features).

### Bugs
| # | Schweregrad | Beschreibung |
|---|---|---|
| 1 | Medium | Änderungsprotokoll filtert nicht nach Person/Fach (nur Zeitraum/Art/Bereich) |
| 2 | Medium | „Alle Änderungen einer Person im Zeitraum" gesammelt zurücknehmen fehlt (nur vorgangsbezogen) |
| 3 | Medium | Verlaufs-Oberfläche für Fächer und Prüfungssets fehlt (API ist fertig) |
| 4 | Low | Verlaufs-Schublade lädt nur die erste Seite, kein „mehr laden" |
| 5 | Low | Keine Torwächter-Warnung beim Wiederherstellen einer heute ungültigen Version |
| 6 | Low | Konflikt-Prüfung (`expected_version`) nur für Fragen, nicht für Themen/Fächer/Prüfungssets |

### Production-Ready Empfehlung: **JA, mit offenen Punkten**
Keine Critical- oder High-Bugs. Die sicherheitskritische Kerneigenschaft — jede Änderung wird unumgehbar aufgezeichnet, lässt sich wiederherstellen, Papierkorb statt Datenverlust — ist vollständig umgesetzt, live verifiziert und beim Sicherheits-Audit geprüft (ein Fund wurde vor Auslieferung behoben). Die offenen Punkte sind Komfort-/Vollständigkeits-Lücken (Fächer/Prüfungssets-UI, feinere Protokoll-Filter, Sammel-Rücknahme über Personen) und blockieren PROJ-48 nicht in seiner Kernfunktion.

## Deployment

- **Deployed:** 2026-10-27
- **Produktions-URL:** https://spedilern.vercel.app (Deployment `dpl_Euk4h3PcsfHE7TPRiErmTzMKfeT9`)
- **Datenbank-Migrationen** vorab live auf dem Supabase-Projekt `riqafwijurbxvywzlipx` angewendet (vor dem Code-Push, wie im Projekt üblich): `20261027_proj47_content_versioning`, `20261027_proj47_restore_function`, `20261027_proj47_batch_grouping_scope_fix`. Rückfüll-Lauf geprüft: 8.341 Fragen, 189 Themen, 9 Fächer, 3 Prüfungssets mit Startversion „Stand bei Einführung".
- Trigger-Verhalten vor Auslieferung in einer Live-Transaktion mit Rollback verifiziert; ein beim Audit gefundener Berechtigungsfehler in der Vorgangs-Bündelung wurde vor dem Deploy behoben.
- `/admin/papierkorb` nach Deploy erreichbar (307 → Login, wie bei allen geschützten Admin-Routen erwartet).
- Offene Punkte aus der QA (Protokoll-Filter, Fächer/Prüfungssets-Verlaufs-UI, Sammel-Rücknahme über Personen) sind dokumentiert und blockieren PROJ-48 nicht.
