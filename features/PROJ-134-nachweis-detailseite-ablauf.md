# PROJ-134: Leistungsnachweis – Detailseite & Ablauf (Phase 4 Übersichtlichkeit, Teil 2)

## Status: In Progress
**Created:** 2026-11-27
**Last Updated:** 2026-11-27

## Worum es geht

Phase 4 aus [docs/plan-uebersichtlichkeit.md](../docs/plan-uebersichtlichkeit.md), Teil 2. Das Anlegen in drei Schritten steht in [PROJ-133](PROJ-133-nachweis-anlegen-in-drei-schritten.md). Dieses Feature macht den **Ablauf eines Nachweises** sichtbar und verlässlich:

- Die Detailseite zeigt nicht, bis wann man beitreten kann (B28).
- Der Weg Entwurf → Offen → Geschlossen → Freigegeben ist nirgends erklärt, „Ergebnisse freigeben“ ist schwer zu finden (B29).
- Abgelaufene Nachweise bleiben auf „Offen“, bis jemand von Hand schließt.
- Es gibt keine Möglichkeit, den Nachweis wie ein Azubi auszuprobieren (B30).
- Wer den Nachweis erstellt hat, sieht nur der Super-Admin (B104).
- „Trennschärfe“ in der Aufgabenanalyse ist unerklärt (B31).

**Entscheidungen (27.11.2026):**
- **E1 – Automatisches Schließen:** Nach „Beitritt bis“ kann niemand mehr beitreten. Der Nachweis wird **Geschlossen**, sobald alle Beigetretenen abgegeben haben oder ihre Bearbeitungszeit abgelaufen ist. Laufende Abgaben werden nicht abgebrochen.
- **E2 – Ausprobieren:** „Als Azubi ausprobieren“ ist ein **Testlauf ohne Spuren**. Die Lehrkraft schreibt den Nachweis selbst, das Ergebnis zählt nirgends mit und lässt sich löschen.
- **E3 – Ersteller:** sichtbar in der **Nachweis-Liste** (mit Filter „Nur meine“) und auf der **Detailseite**. Nicht in der Aufgabenliste der Startseite.

## Dependencies
- Requires: PROJ-21 (Leistungsnachweise: Status, Beitritt, Freigabe), PROJ-28 (Auswertung), PROJ-84 (Aufbau der Detailseite), PROJ-86 (Freigabe-Status in der Liste), PROJ-81 (Aufgabenliste)
- Requires: PROJ-75 (Aufgabenanalyse, Trennschärfe), PROJ-76 (Gruppen A/B), PROJ-30 (Fokus-Protokoll)
- Requires: PROJ-133 (Anlegen erzeugt Entwürfe mit „Beitritt bis“ und Klasse)
- Requires: PROJ-83 (Bedienmuster), PROJ-130 (Wörterliste)
- Rechte aus PROJ-24, PROJ-44, PROJ-46 und PROJ-70 bleiben unverändert

## User Stories
- Als **Lehrkraft** möchte ich auf der Detailseite sofort sehen, in welchem Schritt der Nachweis ist und was als Nächstes zu tun ist, damit ich nichts vergesse.
- Als **Lehrkraft** möchte ich sehen, bis wann man beitreten kann, damit ich den Azubis den richtigen Zeitraum nennen kann.
- Als **Lehrkraft** möchte ich, dass ein Nachweis nach Ablauf von selbst schließt, damit ich nicht daran denken muss.
- Als **Lehrkraft** möchte ich den Nachweis vor dem Öffnen selbst durchspielen, damit ich Fragen, Zeit und Ablauf prüfen kann.
- Als **Lehrkraft** möchte ich sehen, wer einen Nachweis erstellt hat und nur meine eigenen filtern können, damit ich im Kollegium den Überblick behalte.
- Als **Lehrkraft** möchte ich „Trennschärfe“ erklärt bekommen, damit ich die Aufgabenanalyse verstehe.

## Acceptance Criteria

### Schrittleiste
- [ ] Oben auf der Detailseite steht eine Schrittleiste **Entwurf · Offen · Geschlossen · Freigegeben**. Der aktuelle Schritt ist hervorgehoben, erledigte sind abgehakt, spätere sind blass.
- [ ] Unter der Leiste steht **ein** Satz, was jetzt gilt und zu tun ist, zum Beispiel: „Entwurf: Fragen prüfen, dann öffnen.“ · „Offen: Azubis können mit dem Code beitreten.“ · „Geschlossen: Ergebnisse prüfen, dann freigeben.“ · „Freigegeben: Azubis sehen ihre Note.“
- [ ] Die **eine grüne Hauptaktion** im Seitenkopf folgt dem Schritt: „Öffnen“ (Entwurf), „Schließen“ (Offen), „Ergebnisse freigeben“ (Geschlossen und nicht freigegeben). Bei „Freigegeben“ gibt es keine grüne Aktion, weitere Aktionen sind `variant="outline"`.
- [ ] „Ergebnisse freigeben“ ist **sichtbar** im Seitenkopf, nicht nur im Menü. Vor dem Freigeben erscheint eine Rückfrage mit Zahl der Abgaben und Hinweis, dass Azubis danach ihre Note sehen.
- [ ] Die Zuordnung der Schritte zu den bestehenden Zuständen: Entwurf = `draft`, Offen = `open`, Geschlossen = `closed` ohne `results_released_at`, Freigegeben = `closed` mit `results_released_at`. Die Datenbank bekommt dafür **keine** neue Statusart.
- [ ] Ein Nachweis mit abgelaufenem „Beitritt bis“, bei dem noch jemand schreibt, zeigt „Offen“ mit dem Zusatz „Beitritt beendet, noch N schreiben“.

### Beitritt bis sichtbar (B28)
- [ ] Im Seitenkopf oder in der Karte mit dem Beitrittscode steht „Beitritt bis **Do, 28.11., 23:59**“ (Datum und Uhrzeit, Wochentag, 24-Stunden-Zeit). Davor steht „Beitritt ab …“, wenn gesetzt.
- [ ] Im Entwurf steht dort „Beitritt noch nicht geöffnet“. Läuft der Beitritt, steht zusätzlich „noch 1 Std. 20 Min.“ (Zeit bis zum Ende). Nach Ablauf steht „Beitritt beendet“.
- [ ] „Beitritt bis“ lässt sich auf der Detailseite im Entwurf und im Status Offen verlängern („Beitritt verlängern“ mit Schnellwahlen „+30 Min.“, „+1 Std.“, „Heute 23:59“). Eine Verkürzung unter die jetzige Zeit ist nicht möglich. Das Verlängern wird im Änderungsverlauf festgehalten (PROJ-47/70).

### Automatisches Schließen (E1)
- [ ] Ein Nachweis im Status Offen **schließt von selbst**, wenn „Beitritt bis“ vorbei ist **und** keine Teilnehmenden mehr schreiben (alle haben abgegeben oder ihre Bearbeitungszeit ist abgelaufen). Der Zeitpunkt ist der Moment, in dem beides erstmals zutrifft.
- [ ] Wer zum Zeitpunkt „Beitritt bis“ schon schreibt, darf weiterschreiben. Die Zeit wird nicht verkürzt. Danach greift das automatische Schließen.
- [ ] Das Schließen geschieht **ohne** dass jemand die Seite offen hat (zeitgesteuert auf dem Server). Beim Aufrufen von Liste oder Detailseite wird der Stand zusätzlich nachgezogen, damit nichts auf „Offen“ hängt.
- [ ] Ein automatisch geschlossener Nachweis zeigt im Verlauf „Automatisch geschlossen (Beitritt abgelaufen)“ mit Zeitstempel. Ein Wiederöffnen von Hand bleibt möglich, solange das heute möglich ist.
- [ ] Hat niemand teilgenommen, schließt der Nachweis ebenfalls. Die Aufgabenliste (PROJ-81) führt ihn dann **nicht** als „zu prüfen“.
- [ ] Die Aufgabenliste auf der Startseite zeigt einen automatisch geschlossenen Nachweis mit Abgaben als „Ergebnisse freigeben“.

### Als Azubi ausprobieren (E2)
- [ ] Im Entwurf und im Status Offen gibt es in der Seitenkopf-Aktion `⋯` den Punkt „Als Azubi ausprobieren“. Er öffnet die Schülersicht des Nachweises mit einem deutlichen Band „Testlauf: zählt nicht“.
- [ ] Der Testlauf läuft mit der echten Dauer und Reihenfolge der Fragen (auch Gruppe A/B zur Wahl, wenn aktiv). Die Lehrkraft kann ihn abgeben und sieht Note und Antworten wie ein Azubi.
- [ ] Der Testlauf zählt **nicht** in „Beigetreten / Schreiben / Abgegeben“, Notenspiegel, Klassenauswertung, Aufgabenanalyse, Fokus-Protokoll oder Lösungsquoten. Er verbraucht keinen Beitrittscode und blockiert nicht den automatischen Abschluss.
- [ ] Testläufe sind in der Teilnehmerliste **nicht** sichtbar, aber unter „Meine Testläufe“ auf der Detailseite einsehbar und einzeln **löschbar**. Sie verschwinden beim Löschen des Nachweises und werden nach 30 Tagen automatisch entfernt.
- [ ] Im Entwurf funktioniert der Testlauf ohne Beitrittscode und ohne dass der Nachweis geöffnet sein muss.
- [ ] Der Testlauf ist **nur der Lehrkraft** zugänglich, die ihn startet (und Nutzern mit Bearbeitungsrecht). Azubis erreichen ihn nie.
- [ ] Der Azubi-Name im Testlauf lautet „Testlauf (Name der Lehrkraft)“ und erscheint nirgends in Ranglisten oder XP.

### Ersteller sichtbar (B104, E3)
- [ ] Auf der **Detailseite** steht unter dem Titel „Erstellt von **Vorname Nachname** am 27.11.2026“. Wurde der Nachweis kopiert, steht zusätzlich „Kopie von …“ (PROJ-79).
- [ ] In der **Nachweis-Liste** gibt es eine Spalte „Erstellt von“ (am Handy als Zeile in der Karte). Der Name gilt für **alle** Rollen, nicht mehr nur für den Super-Admin.
- [ ] Die Liste bekommt einen Filter **„Nur meine“** (`AdminSegmented`: Alle · Nur meine). Der bisherige Super-Admin-Filter „Erstellt“ geht darin auf.
- [ ] Ist der Ersteller gelöscht (DSGVO, PROJ-60), steht „Ehemaliges Konto“. Der Nachweis bleibt unverändert erhalten.
- [ ] Zeigt die Lehrkraft die Seite im Änderungsverlauf (PROJ-47), steht der Ersteller dort unverändert.

### Trennschärfe erklärt (B31)
- [ ] In der Aufgabenanalyse (PROJ-75) steht neben „Trennschärfe“ ein „?“ mit einem Satz: „Zeigt, wie gut eine Frage zwischen starken und schwachen Azubis unterscheidet. Nahe 0 oder negativ: Frage prüfen.“
- [ ] Die Werte sind in deutscher Schreibweise mit Komma. Der Wächtertest für Begriffe kennt das Wort.

### Wörter und Technik
- [ ] Neue Wörter nach der Wörterliste (PROJ-130). **Offen** bedeutet weiter nur „Leistungsnachweis läuft“. „Freigegeben“ ersetzt jede andere Bezeichnung für „Ergebnisse sichtbar“.
- [ ] Alle neuen Elemente nutzen ausschließlich `ws-*`-Farben und die Zustände aus `admin-states.tsx`. Hauptaktion rechts im Seitenkopf, höchstens eine grüne.
- [ ] Rechte bleiben wie heute. Wer einen Nachweis sehen darf, sieht den Ersteller. Wer bearbeiten darf, darf verlängern und Testläufe löschen.

## Edge Cases
- **Zwei Lehrkräfte gleichzeitig:** A schließt von Hand, während das automatische Schließen läuft. Das Ergebnis ist derselbe Zustand, es entsteht kein doppelter Verlaufseintrag und keine Fehlermeldung.
- **Ablauf mitten im Schreiben:** Eine Person schreibt um 23:58, der Beitritt endet 23:59. Sie schreibt zu Ende. Der Nachweis schließt erst danach.
- **Verlängern nach Ablauf:** „Beitritt bis“ ist vorbei und der Nachweis schon automatisch geschlossen. Verlängern ist nicht mehr möglich. Die Lehrkraft muss ihn erst wieder öffnen (heutiges Verhalten). Das steht als Hinweis auf der Seite.
- **Niemand tritt bei:** Der Nachweis schließt nach Ablauf mit „0 Abgaben“. Die Aufgabenliste führt keine Aufgabe „Ergebnisse freigeben“.
- **Zeitzone und Sommerzeit:** Alle Zeiten gelten in der Schulzeitzone, auch am Umstellungstag.
- **Testlauf bricht ab:** Der Browser wird geschlossen. Der Testlauf bleibt als „nicht abgegeben“ in „Meine Testläufe“ und lässt sich löschen. Er blockiert nichts.
- **Testlauf bei geschlossenem Nachweis:** Nicht möglich, der Punkt fehlt im Menü. Die Lehrkraft sieht ihre alten Testläufe weiterhin.
- **Gelöschter Ersteller:** siehe oben, „Ehemaliges Konto“. Nachweise ohne erkennbaren Ersteller (Altbestand) zeigen „Unbekannt“ statt eines leeren Feldes.
- **Alte Nachweise:** Bereits offene Nachweise mit abgelaufenem Beitritt werden beim ersten Lauf des Servers nachgezogen. Es gibt keine Rückwirkung auf bereits freigegebene.
- **Fokus-Verlust-Protokoll:** Im Testlauf wird es nicht geführt.

## Nicht Teil dieses Features
- Das Anlegen in drei Schritten (PROJ-133)
- Nachteilsausgleich und Nachschreiber (PROJ-80, zusätzliche Zeit je Person, spätere Termine)
- Klasse als echte Einheit (Phase 5)
- Änderungen an Bewertung, Notenberechnung oder Schülerseite außerhalb des Testlaufs
- Neue Statusarten in der Datenbank

## Technical Requirements (optional)
- Performance: Detailseite lädt Schrittleiste und Zeiten ohne zusätzliche Wartezeit; das automatische Schließen läuft zeitgesteuert (alle paar Minuten) und ist idempotent.
- Security: Testläufe sind per Zeilenschutz auf den Ersteller beschränkt; Ergebnisse von Testläufen fließen nirgends in Auswertungen ein (serverseitig gefiltert, nicht nur in der Anzeige).
- Datenschutz: Ersteller-Name nur aus dem Profil der Lehrkraft, gelöschte Konten ohne Namen.
- Tests: Unit-Tests co-located; E2E für „Beitritt abgelaufen → automatisch geschlossen“ und für den Testlauf.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Erstellt:** 2026-11-27 · Grundlage: bestehende Detailseite `/admin/leistungsnachweise/[id]`, Liste `/admin/leistungsnachweise`, Spieler `/exam/[sessionId]`, Tabellen `graded_assessments` und `exam_sessions`.

### Was es schon gibt (wird weiterverwendet)
- **Zustände:** `draft` / `open` / `closed` plus `results_released_at`. „Beitritt ab“ = `opens_at`, „Beitritt bis“ = `closes_at`. Keine neue Statusart nötig.
- **Gemeinsame Regeln** in `src/lib/graded-assessments.ts` (`effectiveAssessmentStatus`, `isJoinEnded`). Die Schrittleiste baut darauf auf.
- **Liegengebliebene Abgaben:** `finalizeOverdueAttempts` (in `assessment-submit.ts`) schließt Versuche ab, deren Zeit vorbei ist. Läuft heute nur beim Öffnen der Detailseite.
- **Zeitgesteuerte Jobs:** pg_cron ist in der Datenbank installiert und wird schon genutzt (Forum-Papierkorb). Vercel-Crons laufen im Hobby-Tarif nur täglich und reichen für „alle paar Minuten“ nicht.
- **Änderungsprotokoll** über `writeAuditLog` mit `graded_assessment.*`-Aktionen. Der Verlauf liest daraus.
- **Ersteller:** `created_by` und `copied_from_title` sind gespeichert. Die Liste löst Namen heute nur für den Super-Admin auf.

### A) Aufbau der Oberfläche

```
Detailseite Leistungsnachweis
+-- AdminPageHeader
|   +-- Titel · „Erstellt von Vorname Nachname am 27.11.2026“ (· „Kopie von …“)
|   +-- Rechts: EINE grüne Hauptaktion je Schritt
|   |     Entwurf → „Öffnen“ · Offen → „Schließen“ · Geschlossen → „Ergebnisse freigeben“
|   |     Freigegeben → keine grüne Aktion
|   +-- ⋯-Menü: Als Azubi ausprobieren (nur Entwurf/Offen), Duplizieren, Drucken, Löschen …
+-- Schrittleiste (NEU)  Entwurf ✓ · Offen ● · Geschlossen · Freigegeben
|   +-- Ein Satz: was jetzt gilt und zu tun ist
|   +-- Zusatz bei Bedarf: „Beitritt beendet, noch 3 schreiben“
+-- Karte „Beitritt“ (erweitert die bisherige Code-Karte)
|   +-- Beitrittscode
|   +-- „Beitritt ab Mi, 27.11., 08:00 · Beitritt bis Do, 28.11., 23:59“
|   +-- Zustand: „noch nicht geöffnet“ / „noch 1 Std. 20 Min.“ / „Beitritt beendet“
|   +-- Knopf „Beitritt verlängern“ (Entwurf + Offen) → Dialog mit
|         Schnellwahlen +30 Min. · +1 Std. · Heute 23:59 · eigene Zeit
|   +-- Hinweis nach Auto-Schließen: „Zum Verlängern erst wieder öffnen.“
+-- Meine Testläufe (NEU, nur wenn vorhanden)
|   +-- Zeile je Testlauf: Datum · abgegeben/nicht abgegeben · Note · Ansehen · Löschen
+-- Teilnehmer, Auswertung, Gruppen, Fokus-Protokoll (unverändert, ohne Testläufe)
+-- Aufgabenanalyse
    +-- „Trennschärfe“ mit „?“-Erklärung (Tooltip/Popover), Werte mit Komma

Rückfrage „Ergebnisse freigeben“ (AlertDialog)
+-- „24 Abgaben. Danach sehen die Azubis ihre Note.“ · Abbrechen · Freigeben

Nachweis-Liste
+-- Filterleiste: AdminSegmented „Alle · Nur meine“ (ersetzt den Super-Admin-Filter „Erstellt“)
+-- Tabelle: neue Spalte „Erstellt von“ für alle Rollen
+-- Handy-Karte: Zeile „Erstellt von …“

Schülersicht im Testlauf (/exam/[sessionId], gleicher Spieler)
+-- Band oben, auffällig (orange): „Testlauf: zählt nicht“
+-- Gruppe A/B wählbar beim Start, wenn Gruppen aktiv
+-- Ergebnisseite wie bei Azubis, Zurück-Link zur Detailseite
```

Neue Bausteine (alle mit `ws-*`-Farben und `admin-states.tsx`): **Schrittleiste**, **Beitritts-Karte mit Zeitangaben**, **Dialog „Beitritt verlängern“**, **Liste „Meine Testläufe“**, **Erklär-„?“** für Trennschärfe. Die Schrittleiste nutzt eine kleine reine Funktion „In welchem Schritt bin ich, welcher Satz, welche Hauptaktion?“, die Detailseite und Tests gemeinsam verwenden.

### B) Daten (in einfachen Worten)

**Leistungsnachweis** bekommt zwei Felder:
- **Automatisch geschlossen am** (Zeitpunkt, leer bei Schließen von Hand). Dient Verlauf und Hinweis „Zum Verlängern erst wieder öffnen“.
- Sonst nichts Neues. „Beitritt bis“ ist das bestehende Ende-Feld.

**Prüfungs-Sitzung** (eine Zeile je Versuch, wie bisher) bekommt ein Feld:
- **Testlauf von Nachweis** (Verweis auf den Nachweis). Beim Testlauf ist das normale Nachweis-Feld **leer**, nur dieses Feld ist gesetzt.
  - Warum so: Alle Auswertungen (Teilnehmer, Notenspiegel, Klassenauswertung, Aufgabenanalyse, Fokus-Protokoll, Export, Notenliste, Aufgabenliste, automatisches Schließen) suchen Sitzungen über das normale Nachweis-Feld. Ein Testlauf **kann dort gar nicht auftauchen**, ohne dass wir rund 15 Stellen einzeln anpassen und hoffen, keine zu vergessen. Das erfüllt „serverseitig gefiltert, nicht nur in der Anzeige“ am sichersten.
  - Wird der Nachweis gelöscht, verschwinden seine Testläufe mit.
  - Die wenigen Stellen, die „Sitzungen ohne Nachweis“ als Übungsprüfung lesen (Übungsprüfungs-Verlauf, Konto-Seite, Nutzer-Detail, Fortschritt zurücksetzen), schließen Testläufe ausdrücklich aus. Ein Wächtertest prüft das.
  - Die bisherige Regel „ein Versuch je Person und Nachweis“ bleibt für echte Teilnahmen. Testläufe sind beliebig oft möglich.
- Teilnehmername im Testlauf: „Testlauf (Name der Lehrkraft)“. Keine XP, keine Rangliste, kein Fokus-Protokoll.
- Zeilenschutz: Testläufe sieht und ändert nur, wer sie gestartet hat. Löschen dürfen zusätzlich Personen mit Bearbeitungsrecht am Nachweis (serverseitig geprüft).

**Gespeichert in:** Supabase (bestehende Tabellen, eine Migration mit Rückweg-Datei).

### C) Technische Entscheidungen (warum)

1. **Automatisches Schließen in der Datenbank, alle 5 Minuten (pg_cron).** Läuft ohne geöffnete Seite, kostet nichts extra und ist schon im Einsatz. Ein Datenbank-Job schließt jeden offenen Nachweis, bei dem „Beitritt bis“ vorbei ist und keine Sitzung mehr innerhalb ihrer Dauer liegt. Er setzt „Automatisch geschlossen am“ und schreibt den Verlaufseintrag „Automatisch geschlossen (Beitritt abgelaufen)“ – **im selben Schritt**, nur wenn der Nachweis da noch offen war. So entsteht nie ein doppelter Eintrag, auch wenn gleichzeitig jemand von Hand schließt (Edge Case „Zwei Lehrkräfte“). Der Handschluss prüft ebenso „nur wenn noch offen“ und meldet sonst einfach den neuen Stand statt eines Fehlers.
2. **Nachziehen beim Aufruf.** Liste und Detailseite rufen vor dem Laden dieselbe Schließ-Regel auf und schließen liegengebliebene Versuche ab (`finalizeOverdueAttempts`, jetzt auch in Liste, Freigeben und im täglichen Aufräum-Cron). So hängt nichts auf „Offen“, und Abgaben ohne Klick auf „Abgeben“ sind vor dem Freigeben fertig bewertet. Der erste Job-Lauf zieht alte Nachweise nach; bereits freigegebene bleiben unberührt.
3. **Testlauf über den vorhandenen Spieler.** Kein zweiter Spieler: `/exam/[sessionId]` und die Abgabe-Logik erkennen „Nachweis oder Testlauf eines Nachweises“ und verhalten sich gleich (Dauer, Reihenfolge, Gruppe, Note). Unterschiede: Band „Testlauf: zählt nicht“, kein Fokus-Protokoll, kein Beitrittscode nötig, auch im Entwurf (dann mit den aktuellen Entwurfsfragen). Start über eine neue, nur für Lehrkräfte erreichbare Route.
4. **Aufräumen nach 30 Tagen** im bestehenden täglichen Cron `werkzeugkiste-aufraeumen` (oder als zweiter pg_cron-Job). Abgebrochene Testläufe blockieren nichts, weil sie nirgends mitgezählt werden.
5. **Verlängern als eigene Aktion** („Beitritt bis“ ändern), erlaubt im Entwurf und im Status Offen, nie früher als jetzt, nie nach automatischem Schließen. Eintrag im Verlauf `graded_assessment.extend_join` mit alt → neu. Heute ist Bearbeiten nur im Entwurf erlaubt; das Verlängern ist bewusst die einzige Änderung im Status Offen.
6. **Ersteller für alle:** Die Liste löst die Namen jetzt für jede Rolle auf (nur Vor- und Nachname aus dem Profil). Leer wegen gelöschtem Konto → „Ehemaliges Konto“; Altbestand ohne Eintrag → „Unbekannt“. „Nur meine“ filtert serverseitig auf die eigene ID.
7. **Aufgabenliste (PROJ-81):** zählt „Ergebnisse freigeben“ nur bei mindestens einer echten Abgabe. Testläufe zählen dort automatisch nicht (siehe Datenmodell).
8. **Zeiten in der Schulzeitzone (Europe/Berlin)**, auch für „Heute 23:59“ und am Umstellungstag. Anzeige „Do, 28.11., 23:59“ und „noch 1 Std. 20 Min.“ über eine gemeinsame Formatierungsfunktion mit Tests.
9. **Wörter:** neue Texte in `begriffe.ts` / bestehende Wörterliste; „Freigegeben“ ersetzt andere Bezeichnungen, „Trennschärfe“ wird dem Begriffs-Wächtertest bekannt gemacht.

### D) Was gebaut wird (Überblick für /frontend und /backend)

| Bereich | Neu oder geändert |
|---|---|
| Datenbank | 2 Felder, Job „Nachweise automatisch schließen“ (alle 5 Min.), Zeilenschutz Testläufe, Aufräumen 30 Tage |
| API | Verlängern, Testlauf starten / auflisten / löschen, „Nur meine“ + Ersteller in der Liste, Nachziehen beim Laden, Freigeben mit Abgabenzahl |
| Detailseite | Schrittleiste, Hauptaktion je Schritt, Beitritts-Karte, Verlängern-Dialog, Meine Testläufe, Ersteller-Zeile |
| Liste | Spalte/Zeile „Erstellt von“, Segment „Alle · Nur meine“ |
| Spieler | Band „Testlauf: zählt nicht“, Gruppenwahl, Zurück zur Detailseite |
| Aufgabenanalyse | „?“ bei Trennschärfe, Komma-Schreibweise |
| Tests | Unit: Schritt-Regel, Zeitformat, Schließ-Regel, Wächter „Testläufe nie in Übungsprüfungen/Auswertungen“; E2E: Ablauf → automatisch geschlossen, Testlauf |

### E) Abhängigkeiten (Pakete)
Keine neuen Pakete. Alles mit vorhandenen shadcn/ui-Bausteinen (Dialog, AlertDialog, Popover/Tooltip, Badge), Lucide-Icons und der eingebauten Datumsformatierung des Browsers (`Intl`, Zeitzone Europe/Berlin).

### Offene Punkte für /backend
- Prüfen, ob das Änderungsprotokoll einen Eintrag ohne handelnde Person (System) zulässt; sonst einen festen System-Absender vorsehen.
- Im Entwurf hat der Nachweis noch keinen eingefrorenen Fragen-Stand: Der Testlauf nimmt die aktuellen Entwurfsfragen und friert sie nur für diesen Testlauf ein.

## Implementation Notes (Frontend + Backend, 2026-11-27)

**Datenbank** (`supabase/migrations/20261127_proj134_nachweis_ablauf.sql`, mit `_down`): `graded_assessments.auto_closed_at`, `exam_sessions.trial_assessment_id` (mit Prüfregel „nie zugleich assessment_id“), Funktion `close_expired_assessments()` (eine Anweisung, schreibt den Verlaufseintrag „System“ im selben Schritt, kein Doppeleintrag), Funktion `cleanup_assessment_trials()` (30 Tage), pg_cron: alle 5 Minuten schließen, täglich 03:40 Testläufe aufräumen. **Keine RLS-Änderung.** **Die Migration ist noch NICHT auf die Datenbank angewendet.** Bis dahin laufen Liste und Detailseite wie bisher (die Nachziehen-Funktion fängt die fehlende Funktion ab); Testlauf und Auto-Schließen brauchen sie.

**Backend:**
- `src/lib/nachweis-ablauf.ts` (+ Tests): Schritt, Satz, Hauptaktion, Beitrittszeiten (Europe/Berlin), „Heute 23:59“, Verlängern-Prüfung, Ersteller-Name.
- `src/lib/nachweis-sync.ts`: zieht abgelaufene Nachweise bei Liste und Detailseite nach; Detailseite schließt außerdem liegengebliebene Abgaben ab.
- `PATCH /api/admin/assessments/[id]`: neu `extend_join` (nur Entwurf/Offen, nur nach hinten, bedingtes Update gegen Wettlauf, Verlauf `graded_assessment.extend_join` mit von/nach); `close` ist nach Auto-Schließen oder bei Wettlauf kein Fehler und schreibt keinen zweiten Eintrag. GET liefert `createdByName`, `autoClosedAt`.
- `POST/GET /api/admin/assessments/[id]/testlauf`, `DELETE …/testlauf/[sessionId]`: Testlauf = eigene Sitzung mit `trial_assessment_id`, `assessment_id` bleibt leer, deshalb sehen ihn alle Auswertungen nie. Im Entwurf mit den aktuellen Entwurfsfragen, Gruppe A/B wählbar, höchstens 20 je Person und Nachweis. Abgabe über dieselbe Logik, sofort bewertet, kein Fokus-Protokoll.
- Spieler: `/exam/[sessionId]` und `/results` erkennen Testläufe (Band „Testlauf: zählt nicht“, Zurück zur Detailseite). Übungsprüfungs-Verlauf (`exam-history.ts`, `/api/exam/history`) schließt Testläufe aus; Wächtertest `src/lib/testlauf-waechter.test.ts`.
- Liste `GET /api/admin/assessments`: Ersteller-Name für alle Rollen (nur Vor-/Nachname aus dem Profil, Super-Admin zusätzlich Rückfall auf Anzeigename/E-Mail), `createdByMe`, Parameter `nurMeine=1`. Gelöschtes Konto: „Ehemaliges Konto“.

**Frontend:** `nachweis-schrittleiste.tsx`, `beitritt-verlaengern-dialog.tsx` (Schnellwahlen +30 Min. · +1 Std. · Heute 23:59 · Eigene Zeit), `nachweis-testlaeufe.tsx` („Meine Testläufe“, Gruppenwahl), Detailseite (Schrittleiste, „Beitritt ab/bis“ + Restzeit, „Beitritt verlängern“, „Erstellt von … am …“ / „Kopie von …“, Menüpunkt „Als Azubi ausprobieren“, Hauptaktion „Schließen“, Freigabe-Rückfrage mit Zahl der Abgaben), Liste (Spalte „Erstellt von“ für alle, `AdminSegmented` „Alle · Nur meine“ ersetzt den Super-Admin-Filter „Erstellt“), „?“-Erklärung bei Trennschärfe.

**Abweichungen / offen für QA:**
- **Wiederöffnen:** Heute gibt es keinen Weg, einen geschlossenen Nachweis wieder zu öffnen (Spec-Annahme „Wiederöffnen bleibt möglich“ trifft nicht zu). Nach Auto-Schließen verweist der Hinweis auf „Duplizieren“.
- **Handy-Liste:** Die Liste ist überall eine Tabelle, die in ihrem Rahmen scrollt. Eine eigene Kartenansicht gibt es nicht; „Erstellt von“ ist dort eine Spalte.
- **Aufgabenliste (PROJ-81):** unverändert. Sie liest Sitzungen über `assessment_id`, Testläufe tauchen dort nie auf; Nachweise ohne Abgaben führt sie ohnehin nicht als „Ergebnisse freigeben“.
- **Änderungsverlauf-Anzeige:** Eintrag `graded_assessment.auto_close` (Absender „System“) und `extend_join` werden geschrieben. Ob die Verlauf-Ansicht (PROJ-47/70) die neuen Aktionstypen lesbar benennt, ist in QA zu prüfen.
- **E2E-Tests** („Beitritt abgelaufen → automatisch geschlossen“, Testlauf) sind noch nicht geschrieben; sie brauchen die angewendete Migration.
- Gleichzeitig geändert auf Wunsch (PROJ-133-Assistent): „Selbst erstellen“ ist die grüne Hauptaktion in Schritt 1 (öffnet gleich „Frage suchen“), „Vorschlag erstellen“ steht als zweite Aktion daneben; das Fenster „Frage suchen“ ist breiter (bis `max-w-4xl`, zweispaltige Trefferliste) bzw. am Handy 92 % der Höhe.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
