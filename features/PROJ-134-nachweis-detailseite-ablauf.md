# PROJ-134: Leistungsnachweis – Detailseite & Ablauf (Phase 4 Übersichtlichkeit, Teil 2)

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
