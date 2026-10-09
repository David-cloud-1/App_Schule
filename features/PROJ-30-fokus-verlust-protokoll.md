# PROJ-30: Fokus-Verlust-Protokoll bei Leistungsnachweisen

## Status: Deployed
**Created:** 2026-10-08
**Last Updated:** 2026-10-08

## Dependencies
- Requires: PROJ-21 (Benotete Leistungsnachweise) — Teilnahme-Sitzung, Prüfungs-Runner, Abgabe, Teilnehmerliste
- Requires: PROJ-24 (Rechtetrennung) — nur Admins des eigenen Fachbereichs sehen das Protokoll
- Berührt: PROJ-28 (Druck & Klassenauswertung) — Anzeige im Ausdruck/CSV ist bewusst **nicht** Teil dieses Features (siehe Out of Scope)

## Summary
Verlässt ein Azubi während eines benoteten Leistungsnachweises die Prüfung (Tab-Wechsel, andere App, Fenster verlassen), wird das erkannt, **serverseitig protokolliert** und der Lehrkraft in der Auswertung klar angezeigt. Der Azubi bekommt beim Zurückkommen eine Warnung. Optional kann der Ausbilder pro Nachweis eine automatische Abgabe ab einer festgelegten Anzahl von Wechseln einschalten; standardmäßig wird nur markiert, die Lehrkraft entscheidet selbst über die Wertung.

Das Feature **verhindert** das Nachschlagen nicht, es macht es sichtbar und unattraktiv. Eine zweite Quelle (zweites Gerät, Split-Screen auf dem Tablet) wird technisch nicht erkannt. Das gehört zur Ehrlichkeit gegenüber dem Ausbilder und wird in der Oberfläche so benannt.

Das Out-of-Scope-Thema „Aufsichtsfunktionen (Tab-Wechsel erkennen)" aus PROJ-21 wird damit in dem hier beschriebenen Umfang aufgenommen. Vollbildzwang und Sperrmodus bleiben weiterhin draußen.

## User Stories
- Als **Ausbilder** möchte ich sehen, wie oft und wie lange ein Azubi während des Leistungsnachweises die Prüfung verlassen hat, damit ich Auffälligkeiten erkenne und fair darauf reagieren kann.
- Als **Ausbilder** möchte ich in der Teilnehmerliste auf einen Blick erkennen, bei wem eine Auffälligkeit stattfand, damit ich nicht jede Teilnahme einzeln öffnen muss.
- Als **Ausbilder** möchte ich je Azubi die einzelnen Wechsel mit Uhrzeit, Dauer und betroffener Frage sehen, damit ich im Gespräch konkret nachfragen kann.
- Als **Ausbilder** möchte ich optional einstellen, dass ab einer bestimmten Zahl von Wechseln automatisch abgegeben wird, damit ich bei strengen Arbeiten eine klare Grenze habe.
- Als **Azubi** möchte ich vor dem Start wissen, dass Wechsel protokolliert werden, und beim Zurückkommen eine klare Meldung bekommen, damit ich nicht aus Versehen etwas falsch mache.
- Als **Azubi** möchte ich bei einer eingehenden Nachricht oder einem kurzen Aufblitzen nicht sofort verdächtigt werden, damit die Auswertung fair bleibt.

## Acceptance Criteria

### Erkennung (Azubi-Seite)
- [ ] Während der Bearbeitung eines Leistungsnachweises wird erkannt, wenn die Seite in den Hintergrund geht (Tab-Wechsel, App-Wechsel, Bildschirm gesperrt) **oder** das Fenster den Fokus verliert.
- [ ] Beide Ereignisse (Sichtbarkeit und Fokus) für denselben Vorgang ergeben **einen** Eintrag, nicht zwei.
- [ ] Ein Eintrag besteht aus: Beginn (Zeitpunkt), Ende (Zeitpunkt der Rückkehr) bzw. „offen", Dauer und der Frage, bei der der Azubi gerade war.
- [ ] Nur Leistungsnachweise werden überwacht; normale Prüfungssimulation, Quiz und Blitzrunde bleiben unberührt.
- [ ] Die Überwachung ist erst aktiv, nachdem der Azubi bewusst auf „Start" geklickt hat, und endet mit der Abgabe.

### Toleranzgrenze
- [ ] Abwesenheiten **unter 3 Sekunden** werden protokolliert, aber als „kurz" gekennzeichnet; sie zählen **nicht** als Wechsel für Warnung, Auffälligkeitsmarkierung und Schwellenwert.
- [ ] Abwesenheiten **ab 3 Sekunden** zählen als Wechsel.
- [ ] Die Zahl 3 Sekunden ist an einer zentralen Stelle festgelegt (nicht pro Nachweis einstellbar).

### Warnung beim Zurückkommen
- [ ] Kommt der Azubi nach einem zählenden Wechsel zurück, erscheint sofort ein Hinweis-Dialog: „Du hast die Prüfung verlassen (Wechsel Nr. X). Das wird deinem Ausbilder angezeigt." Der Azubi bestätigt mit einem Klick.
- [ ] Die Prüfungszeit läuft während des Dialogs weiter.
- [ ] Bei jedem weiteren zählenden Wechsel erscheint der Dialog erneut mit der aktuellen Nummer.
- [ ] Ist die automatische Abgabe aktiv, nennt der Dialog zusätzlich die Grenze: „Bei N Wechseln wird deine Arbeit automatisch abgegeben." Ist sie nicht aktiv, steht dort kein Hinweis auf eine Abgabe.
- [ ] Für kurze Abwesenheiten (unter 3 Sekunden) erscheint kein Dialog.

### Information vorab
- [ ] Der Startbildschirm des Leistungsnachweises (PROJ-21) nennt in einem Satz: „Das Verlassen dieser Seite während der Prüfung wird protokolliert und dem Ausbilder angezeigt." Ist die automatische Abgabe aktiv, nennt er auch die Grenze.
- [ ] Der Hinweis erscheint nur, wenn die Protokollierung für diesen Nachweis aktiv ist; bei ausgeschalteter Protokollierung entfällt er.

### Einstellung pro Nachweis (Admin)
- [ ] Beim Anlegen eines Nachweises (und im Entwurf änderbar) gibt es den Schalter „Verlassen der Prüfung protokollieren". **Standard: an**.
- [ ] Zusätzlich gibt es die Option „Automatisch abgeben ab N Wechseln" mit einer Zahl N (ganze Zahl von 1 bis 20). **Standard: aus.** Die Option ist nur wählbar, wenn die Protokollierung an ist.
- [ ] Nach dem Öffnen des Nachweises sind beide Einstellungen nicht mehr änderbar (gleiche Regel wie die übrigen Felder im Entwurf), damit alle Azubis unter denselben Bedingungen schreiben.
- [ ] Bestehende Nachweise (vor diesem Feature) haben die Protokollierung **aus**; es ändert sich nichts an laufenden oder abgeschlossenen Arbeiten.

### Automatische Abgabe
- [ ] Ist sie aktiv und erreicht ein Azubi N zählende Wechsel, wird seine Arbeit mit den bis dahin gegebenen Antworten abgegeben, genau wie beim Ablauf der Zeit.
- [ ] Der Azubi sieht eine klare Meldung: „Deine Arbeit wurde abgegeben, weil du die Prüfung zu oft verlassen hast."
- [ ] Die Abgabe passiert **serverseitig**, nicht nur im Browser: Meldet der Server den N-ten zählenden Wechsel, nimmt er danach keine weiteren Antworten mehr an.
- [ ] In der Auswertung ist erkennbar, dass die Abgabe automatisch wegen Fokus-Verlusten erfolgte.
- [ ] Ist die automatische Abgabe aus, gibt es keine Konsequenz für den Azubi außer dem Dialog; die Note wird wie üblich berechnet.

### Anzeige für die Lehrkraft
- [ ] In der Teilnehmerliste gibt es eine Spalte „Fokus" mit Anzahl der zählenden Wechsel und Gesamtdauer, z. B. „3× · 1:42 min". Teilnehmer ohne Wechsel zeigen „—".
- [ ] Teilnehmer mit mindestens einem zählenden Wechsel tragen einen **klar erkennbaren Auffälligkeits-Hinweis** (farbiges Symbol/Badge „Auffällig" plus Text, nicht nur Farbe).
- [ ] Wurde automatisch abgegeben, steht zusätzlich „Automatisch abgegeben (Fokus-Grenze)" am Teilnehmer.
- [ ] Die Zeile ist aufklappbar bzw. führt zu einer Detailansicht je Azubi: Liste aller Einträge mit Uhrzeit (Europe/Berlin), Dauer, Nummer der Frage, bei der der Wechsel stattfand, und Kennzeichnung „kurz" für Abwesenheiten unter 3 Sekunden.
- [ ] Die Detailansicht trägt einen Hinweis zur Einordnung: „Ein Eintrag beweist kein Nachschlagen. Benachrichtigungen, Anrufe oder Gerätewechsel können ebenfalls einen Eintrag erzeugen."
- [ ] Ist die Protokollierung für den Nachweis ausgeschaltet, zeigt die Liste die Spalte nicht, statt lauter „—" zu zeigen.
- [ ] Die Daten sind schon während der Bearbeitung sichtbar (Live-Ansicht aktualisiert sich wie die bestehende Übersicht).

### Zugriff und Datenschutz
- [ ] Das Protokoll ist ausschließlich für Admins des Fachbereichs des Nachweises sichtbar; Azubis sehen weder ihr eigenes noch fremdes Protokoll (nur den Dialog beim Zurückkommen).
- [ ] Das Protokoll wird mit der Teilnahme bzw. dem Nachweis gelöscht, nicht länger aufbewahrt.
- [ ] Die Erfassung dient nur dem Leistungsnachweis; keine Weitergabe an andere Bereiche der App (Rangliste, Profil, Abzeichen).

## Edge Cases
- **Azubi schließt den Tab oder die App und kommt nicht zurück:** Der Eintrag bleibt „offen". Die Dauer wird bei der Abgabe bzw. beim Ablauf der Zeit abgeschlossen; offene Einträge zählen als Wechsel, sobald sie 3 Sekunden überschreiten.
- **Azubi kommt nach dem Schließen über denselben Code zurück (Wiedereinstieg, PROJ-21):** Der offene Eintrag wird mit dem Zeitpunkt des Wiedereinstiegs geschlossen und zählt als Wechsel. Der Dialog erscheint beim Wiedereinstieg.
- **Verbindungsabbruch / Offline beim Zurückkommen:** Der Wechsel geht nicht verloren; er wird gespeichert und beim nächsten erfolgreichen Kontakt nachgemeldet. Die automatische Abgabe wird dann nachträglich ausgelöst.
- **Bildschirm sperrt sich von selbst (Handy-Timeout):** Zählt wie ein Wechsel, wenn er 3 Sekunden überschreitet. Das ist ein bekannter Fehlalarm, der in der Detailansicht über den Einordnungshinweis abgefedert wird.
- **Eingehender Anruf, Benachrichtigung oder Systemdialog (z. B. Berechtigungsabfrage):** Kann einen Eintrag erzeugen. Kürzer als 3 Sekunden zählt nicht; länger zählt und wird von der Lehrkraft eingeordnet.
- **Zwei Geräte / zweiter Tab:** Beide melden an dieselbe Teilnahme; ein Wechsel im zweiten Tab zählt wie jeder andere.
- **Manipulation im Browser:** Der Browser meldet Wechsel selbst, ein technisch versierter Azubi kann die Meldung unterdrücken. Das wird akzeptiert und als Grenze offen kommuniziert (siehe Summary). Der Server verlangt aber plausible Daten (Beginn vor Ende, Zeitpunkt im Prüfungszeitraum, keine unbegrenzte Zahl von Einträgen).
- **Sehr viele Einträge (z. B. 200 Wechsel in kurzer Zeit):** Die Zahl der gespeicherten Einträge je Teilnahme ist begrenzt; die Zähler (Anzahl, Gesamtdauer) bleiben korrekt. Die Detailliste zeigt die Obergrenze an.
- **Azubi wird aus der Wertung genommen (`excluded_from_grading`):** Das Protokoll bleibt sichtbar, hat aber keine Auswirkung auf die Note.
- **Lehrkraft schaltet die Überwachung im Entwurf wieder aus:** Es werden keine Einträge erfasst, kein Hinweis auf dem Startbildschirm.
- **Mehrere Nachweise parallel:** Einträge gehören immer zur Teilnahme des jeweiligen Nachweises.
- **In-App-Browser / ältere Browser ohne Sichtbarkeits-Ereignisse:** Die Erfassung fällt auf das Fokus-Ereignis zurück; ist beides nicht verfügbar, bleibt der Nachweis nutzbar, und die Detailansicht zeigt „Keine Überwachung möglich" bei dieser Teilnahme.

## Technical Requirements
- **Sicherheit:** Die Meldung eines Wechsels läuft nur für die eigene, laufende Teilnahme an einem offenen Leistungsnachweis mit aktiver Protokollierung; fremde Teilnahmen, abgegebene oder normale Prüfungen werden abgelehnt.
- **Sicherheit:** Die Automatik der Abgabe entscheidet der Server anhand der gespeicherten Einträge, nicht anhand einer Behauptung des Browsers („ich habe N erreicht").
- **Sicherheit:** RLS — der Azubi darf das Protokoll weder lesen noch schreiben direkt per Datenbank; Lesen nur für Admins des Fachbereichs, Schreiben nur über die Server-Route.
- **Zuverlässigkeit:** Das Beenden des Tabs oder das Sperren des Handys darf die Meldung nicht verschlucken; der Beginn eines Wechsels wird möglichst sofort gemeldet, das Ende beim Zurückkommen.
- **Last:** Mehrere Wechsel pro Azubi und 30–40 Azubis gleichzeitig dürfen die Prüfung nicht verlangsamen; die Meldungen sind klein und blockieren die Bedienung nie.
- **Mobile-First:** Dialog und Hinweise sind am Smartphone bedienbar (Touch-Ziel mindestens 44 px); die Admin-Anzeige darf breiter sein.
- **Design:** Dialog und Badge im vorhandenen Dark-Mode-Stil; Warnfarbe Orange (`#FF9600`) für „Auffällig", Rot nur für die automatische Abgabe.
- **Datenschutz:** Neben den Zeitpunkten und der Fragenummer werden keine weiteren Daten erfasst (kein Inhalt anderer Tabs, keine Seiten-Adressen, keine Bildschirmaufnahmen).

## Out of Scope
- Vollbildzwang, Sperren von Kopieren/Rechtsklick, Safe Exam Browser — als eigenes Feature denkbar.
- Erkennung eines zweiten Geräts oder von Split-Screen.
- Anzeige des Fokus-Verlusts im Druck (PROJ-28) und im CSV-Export. Wird bei Bedarf als Ergänzung zu PROJ-28 nachgezogen.
- Automatische Notenabzüge oder Punktabzug; die Wertung entscheidet immer die Lehrkraft.
- Auswertung über mehrere Nachweise hinweg („Wiederholungstäter").
- Überwachung bei normaler Prüfungssimulation, Quiz und Blitzrunde.
- Einstellbare Toleranzgrenze (fest 3 Sekunden).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Ergebnis der Bestandsaufnahme:** Der Prüfungs-Runner (PROJ-11/21) speichert beim Tab-Wechsel bereits einen Entwurf per `visibilitychange`/`pagehide`. Die Erkennung des Wechsels hängt sich an diese Stelle. Neu sind: ein serverseitiges Protokoll, ein Meldeweg dorthin, ein Hinweis-Dialog und die Anzeige im Admin. Die automatische Abgabe nutzt die bestehende Abgabelogik für Leistungsnachweise (Zeitlimit-Prüfung, Fragen-Snapshot, Bewertung bei Freigabe) und baut sie nicht neu.

### A) Komponenten-Struktur

**Admin: Nachweis anlegen (besteht, wird erweitert)**
```
"Leistungsnachweis anlegen"-Dialog (PROJ-21)
+-- NEU: Schalter "Verlassen der Prüfung protokollieren" (Standard: an)
+-- NEU: Option "Automatisch abgeben ab N Wechseln" (Standard: aus, Zahl 1-20)
|        nur wählbar, wenn der Schalter oben an ist
+-- Hinweistext: erkennt kein zweites Gerät, ersetzt keine Aufsicht
```
Beide Einstellungen sind wie die übrigen Felder nur im Entwurf änderbar.

**Azubi: Beitritt und Prüfung**
```
Startbildschirm des Nachweises (join-assessment-client, besteht)
+-- NEU: Ein Satz "Das Verlassen dieser Seite wird protokolliert ..."
|        (nur wenn aktiv; nennt die Grenze, falls Auto-Abgabe an)

Prüfungs-Runner (exam-session-client, besteht)
+-- NEU: Fokus-Wächter (unsichtbar, nur bei aktivem Nachweis)
|        meldet "weg" und "zurück", merkt sich die aktuelle Frage
+-- NEU: Warn-Dialog beim Zurückkommen
|        "Du hast die Prüfung verlassen (Wechsel Nr. X) ..."
|        mit einem Bestätigen-Knopf, Uhr läuft weiter
+-- NEU: Meldung bei automatischer Abgabe, danach weiter zur Ergebnisseite

Ergebnisseite vor Freigabe (besteht)
+-- NEU: bei Auto-Abgabe zusätzlicher Satz
         "Deine Arbeit wurde abgegeben, weil du die Prüfung zu oft verlassen hast."
```

**Admin: Auswertung (Detailseite des Nachweises, besteht)**
```
Tab "Teilnehmer"
+-- NEU: Spalte "Fokus" ("3× · 1:42 min" oder "—"), nur bei aktivem Nachweis
+-- NEU: Badge "Auffällig" (Symbol + Text, orange)
+-- NEU: Badge "Automatisch abgegeben (Fokus-Grenze)" (rot)
+-- NEU: aufklappbare Detailzeile je Azubi
         Liste: Uhrzeit, Dauer, Nummer der Frage, Kennzeichen "kurz"
         + Einordnungshinweis "Ein Eintrag beweist kein Nachschlagen ..."
```
Die Daten kommen mit der vorhandenen 8-Sekunden-Aktualisierung der Live-Ansicht, ohne neuen Mechanismus.

### B) Datenmodell (in normaler Sprache)

**Erweiterung: Leistungsnachweis** (bestehende Tabelle aus PROJ-21)
- Ob die Protokollierung aktiv ist (Ja/Nein)
- Ab wie vielen Wechseln automatisch abgegeben wird (leer = keine Auto-Abgabe)
- Bestehende Nachweise bekommen "Protokollierung aus"; Neuanlage über die Oberfläche startet mit "an"

**Neu: Einzel-Einträge je Teilnahme** (das Detailprotokoll)
- Zu welcher Teilnahme (Sitzung) der Eintrag gehört
- Beginn und Ende der Abwesenheit (Ende leer = noch offen)
- Dauer in Sekunden
- Bei welcher Frage (ID und Nummer in der Reihenfolge dieses Azubis)
- Kennzeichen, ob der Eintrag zählt (3 Sekunden oder länger) oder "kurz" ist
- Eine vom Browser vergebene Eintragsnummer, damit eine doppelt gesendete Meldung nicht doppelt zählt
- Obergrenze: höchstens 200 Einträge je Teilnahme

**Neu: Zusammenfassung je Teilnahme** (eine Zeile pro Azubi)
- Anzahl zählender Wechsel
- Gesamtdauer der zählenden Wechsel
- Anzahl kurzer Abwesenheiten
- Kennzeichen "automatisch abgegeben wegen Fokus-Verlusten"

Die Zusammenfassung speist die Teilnehmerliste (schnell, auch bei 40 Azubis), die Einzel-Einträge nur die Detailansicht. Beide Tabellen werden in **einem Schritt** zusammen geändert, damit zwei gleichzeitig offene Tabs eines Azubis die Zähler nicht durcheinanderbringen.

**Zugriff:** Azubis haben auf beide Tabellen weder Lese- noch Schreibrecht. Lesen dürfen nur Admins des Fachbereichs des Nachweises (gleiche Regel wie bei den anderen Nachweis-Daten), geschrieben wird ausschließlich über die Server-Route. Beide Tabellen hängen an der Teilnahme und verschwinden mit ihr.

### C) Tech-Entscheidungen (begründet)

- **Eigene Tabellen statt `results_json`:** Die Teilnahme-Zeile ist für den Azubi selbst lesbar und wird bei der Abgabe neu geschrieben. Das Protokoll würde damit für den Azubi sichtbar und könnte beim Abgeben verloren gehen. Eigene Tabellen erfüllen die Vorgabe "Azubi sieht sein Protokoll nicht" und überleben die Abgabe.
- **Zeiten stempelt der Server:** Die Uhr im Browser des Azubis lässt sich verstellen. Der Server vergibt den Zeitpunkt beim Eingang der Meldung. Meldet der Browser beim Zurückkommen zusätzlich die gemessene Dauer, wird sie nur akzeptiert, soweit sie zur Serverzeit passt (nicht länger als die Zeit seit dem letzten Kontakt, nicht außerhalb der Prüfung).
- **Zwei Meldungen statt einer:** Beim Weggehen wird sofort eine kurze "Ich bin weg"-Meldung geschickt (so, dass sie auch beim Schließen des Tabs noch rausgeht, wie es der Runner schon beim Entwurf-Speichern macht). Beim Zurückkommen folgt "Ich bin wieder da". So ist ein Azubi, der nie zurückkommt, trotzdem als offener Eintrag sichtbar.
- **Offene Einträge schließt der Server:** Bei der nächsten Meldung desselben Azubis, beim Wiedereinstieg über den Code oder bei der Abgabe wird ein offener Eintrag mit dem dann aktuellen Zeitpunkt geschlossen. Beim Öffnen der Prüfung meldet der Runner immer "Ich bin da", damit auch der Wiedereinstieg erfasst wird.
- **Offline wird nachgemeldet:** Schlägt eine Meldung fehl, merkt sich der Runner sie und reicht sie bei der nächsten funktionierenden Verbindung nach (zusammen mit dem Autosave). Die automatische Abgabe greift dann nachträglich.
- **Automatische Abgabe entscheidet der Server:** Er zählt anhand der gespeicherten Einträge und gibt selbst ab, sobald N erreicht ist. Die Antwort an den Browser sagt "wurde abgegeben"; der Runner zeigt die Meldung und wechselt zur Ergebnisseite. Der Browser behauptet nie selbst, N erreicht zu haben.
- **Abgabelogik wiederverwenden:** Die Abgabe für Leistungsnachweise wird aus der Session-Route in eine gemeinsam nutzbare Funktion gezogen. Normale Abgabe und Fokus-Abgabe laufen so durch denselben Code (Zeitlimit, Snapshot, Bewertung bei Freigabe), und es entsteht kein zweiter Rechenweg für Noten.
- **Toleranz an einer Stelle:** Die 3-Sekunden-Grenze steht einmal zentral und wird von Server und Anzeige gemeinsam genutzt. Der Server bewertet "zählt / kurz" selbst und übernimmt die Einstufung nicht vom Browser.
- **Erkennung über Sichtbarkeit und Fokus, entdoppelt:** Beide Ereignisse für denselben Vorgang werden zu einem Eintrag zusammengefasst. Wo der Browser keine der beiden Meldungen liefert (manche In-App-Browser), bleibt der Nachweis nutzbar und der Azubi wird als "Keine Überwachung möglich" gekennzeichnet.
- **Missbrauchsschutz:** Meldungen werden nur für die eigene, laufende Teilnahme an einem offenen Nachweis mit aktiver Protokollierung angenommen. Pro Teilnahme gibt es höchstens 200 Einträge und eine Begrenzung der Meldungen pro Minute; die Zähler laufen darüber hinaus weiter.
- **Keine neuen Echtzeit-Dienste:** Die Lehrkraft sieht die Daten über die vorhandene 8-Sekunden-Aktualisierung. Kein Push, kein Websocket.
- **Bestehende Nachweise bleiben unberührt:** Die Voreinstellung "aus" für alte Nachweise sorgt dafür, dass Bestand, laufende Arbeiten und abgeschlossene Noten sich nicht ändern.
- **Freigabe nötig:** Neue Tabellen mit Zugriffsregeln und die Änderung an der Abgabe sind laut Projektregeln freigabepflichtig. Das wird beim `/backend`-Schritt ausdrücklich eingeholt.

### D) Abhängigkeiten (neue Pakete)

Keine. Dialog, Badge, Schalter und Tabelle kommen aus den vorhandenen shadcn/ui-Komponenten (AlertDialog, Switch, Badge, Collapsible).

### E) Aufteilung der Arbeit

- **Backend zuerst:** zwei Tabellen und zwei neue Spalten, eine Meldeschnittstelle für "weg/zurück/da", die gemeinsame Abgabefunktion samt Auto-Abgabe, Erweiterung der Nachweis-Anlage, der Beitrittsabfrage und der Ergebnis-Abfrage, Tests.
- **Frontend danach:** Fokus-Wächter und Dialog im Runner, Startbildschirm-Satz, Einstellungen im Anlegen-Dialog, Spalte, Badges und Detailzeile in der Teilnehmerliste.
- **Test am Gerät:** Tab-Wechsel, App-Wechsel, Bildschirmsperre und Anruf verhalten sich je nach Browser und Handy unterschiedlich und lassen sich nur an echten Geräten prüfen. Vor `/qa` wird ein kurzer Test mit iPhone, Android und Desktop empfohlen.

### F) Offene Punkte für die Umsetzung

- Soll die Meldung bei nicht erreichbarem Server den Azubi blockieren (Dialog erst nach erfolgreicher Meldung) oder nur lokal warnen? Vorschlag: nie blockieren, der Dialog erscheint immer sofort, die Meldung wird im Hintergrund nachgereicht.
- Das genaue Meldelimit pro Minute wird im Backend festgelegt (Vorschlag: großzügig, damit ehrliche Azubis nie ausgebremst werden).

## Implementation Notes (Backend)

**Stand 2026-10-08 — Backend gebaut, Migration in Produktion angewendet** (Supabase „Spedilern App", `riqafwijurbxvywzlipx`; rein additiv, Bestandsnachweise haben `focus_tracking = false`). Dateien: `supabase/migrations/20261008_proj30_focus_protocol.sql` (+ `_down`).

**Datenbank:**
- `graded_assessments` + `focus_tracking` (Standard false) und `focus_auto_submit_after` (1–20 oder leer); Check-Constraints: Auto-Abgabe setzt Protokollierung voraus.
- `assessment_focus_summary` (eine Zeile je Teilnahme: Zähler, Auto-Abgabe-Kennzeichen, Meldelimit-Fenster) und `assessment_focus_events` (Einzel-Einträge, eindeutig je `(session_id, client_event_id)`), beide mit `ON DELETE CASCADE` an der Teilnahme.
- RLS an. Azubis haben keinerlei Policy → kein Lesen, kein Schreiben. Admin-Leserecht über `can_admin_department`.
- `focus_report(...)` — `SECURITY DEFINER`, nur für `service_role` ausführbar. Ändert Zusammenfassung und Einträge in **einem** Schritt (Zeilensperre), damit zwei Tabs die Zähler nicht durcheinanderbringen. Aktionen `leave` / `return` / `resume` / `finalize`; Zeit stempelt der Server (höchstens bis Fristende); ohne bekannte „weg"-Meldung wird der Eintrag aus der gemeldeten Dauer nachgebaut, gedeckelt auf die Zeit seit dem letzten Kontakt; Obergrenze 200 Einträge (Zähler laufen weiter); Meldelimit 60 pro Minute.

**Code:**
- `src/lib/focus-tracking.ts` — zentrale Konstanten (Toleranz 3 s, 200 Einträge, 60/min), Einstellungs-Validierung, Formatierung („3× · 1:42 min"), Aufbereitung für die Teilnehmerliste (offene Einträge zählen live mit).
- `src/lib/assessment-submit.ts` — **Abgabe-Logik aus der Session-Route herausgezogen** (Autosave, Zeitlimit, Fragen-Snapshot, Bewertung bei Freigabe); normale Abgabe und Auto-Abgabe laufen durch denselben Code. Die Abgabe schließt offene Fokus-Einträge (Fehler dabei machen die Abgabe nie rückgängig). Verhalten der bestehenden Route unverändert (alle bisherigen Tests grün).
- `POST /api/exam/sessions/[id]/focus` — nur eigene, laufende Teilnahme an einem Nachweis mit aktiver Protokollierung; nach Fristende 409; Meldelimit → 429. Die **Auto-Abgabe entscheidet der Server**: Wer die Markierung `auto_submitted` zuerst setzt, gibt ab (kein doppeltes Auslösen); schlägt die Abgabe fehl, wird die Markierung zurückgenommen.
- `GET /api/admin/assessments/[id]/participants/[sessionId]/focus` — Detailprotokoll; Bereichsprüfung vor dem ersten Service-Client-Zugriff.
- Erweitert: `POST/PATCH/GET /api/admin/assessments` (Einstellungen, nur im Entwurf änderbar), `/results` (Spalte „Fokus" je Teilnehmer, nur wenn aktiv), `POST /api/assessments/lookup` (Hinweis für den Startbildschirm).

**Tests:** 36 neue Fälle (Bibliothek, Meldeschnittstelle, Detail-Route, Anlegen) — Gesamtlauf 681/681 grün. Die SQL-Funktion wurde zusätzlich an der echten Datenbank in einer zurückgerollten Transaktion geprüft (Zählen ab 3 s, kurz, Doppelmeldung, nachgebauter Eintrag mit Deckelung, Abschluss bei Abgabe, Meldelimit); danach 0 Testzeilen.

## Implementation Notes (Frontend)

**Stand 2026-10-08.** `tsc` ohne Fehler, `npm run build` fehlerfrei (neue Route erscheint), 681/681 Tests grün.

**Gebaut:**
- `src/hooks/use-focus-tracking.ts` — Fokus-Wächter für den Runner: erkennt Sichtbarkeits- und Fokus-Wechsel als **einen** Eintrag, meldet „weg" sofort (`keepalive`, damit es auch beim Schließen des Tabs rausgeht) und „zurück" mit gemessener Dauer, zeigt die Warnung **sofort** (ohne auf den Server zu warten), reicht fehlgeschlagene Meldungen aus einer Warteschlange (Speicher + `sessionStorage`) nach und übergibt an den Runner, wenn der Server abgegeben hat. Eine Eingabe im Fenster gilt als Rückkehr, falls ein Fokus-Ereignis ausbleibt (verhindert „hängende" Einträge). 11 Tests.
- `exam-session-client.tsx` — Fokus-Wächter eingebunden, Warn-Dialog („Du hast die Prüfung verlassen — Wechsel Nr. X …", Zeit läuft weiter, mit Grenze nur bei aktiver Auto-Abgabe), Abgabe-Meldung bei Auto-Abgabe; `exam/[sessionId]/page.tsx` liefert nur Einstellung und bisherigen Zählerstand an den Browser.
- Ergebnisseite — bei Auto-Abgabe der Satz „Deine Arbeit wurde abgegeben, weil du die Prüfung zu oft verlassen hast." Von der Protokoll-Tabelle geht nur dieses eine Kennzeichen an den Azubi.
- Startbildschirm (`join-assessment-client.tsx`) — Hinweis auf die Protokollierung, bei Auto-Abgabe mit Grenze.
- `focus-settings-fields.tsx` — Schalter „Verlassen der Prüfung protokollieren" (Standard an) und „Automatisch abgeben ab N Wechseln" (Standard aus, 1–20); im Anlegen-Dialog und im Entwurf (`FocusDraftSettings`), danach nur noch als Hinweiszeile.
- `focus-detail.tsx` + Detailseite des Nachweises — Spalte „Fokus" („3× · 1:42 min"), Badge „Auffällig" (Symbol + Text), „Gerade nicht in der Prüfung", „Automatisch abgegeben (Fokus-Grenze)", Banner „N Teilnehmer haben die Prüfung verlassen", aufklappbare Detailliste (Uhrzeit Europe/Berlin, Dauer, Frage, „kurz") mit Einordnungshinweis.

**Abweichungen von der Spec:**
- Texte sagen „deiner **Lehrkraft**" statt „deinem Ausbilder" — passend zur neuen Wortwahl in der App (Tourismus-Bereich).
- „Keine Überwachung möglich" (Spec-Edge-Case) wurde in einem zweiten Schritt am 2026-10-09 nachgezogen (siehe BUG-3): Kennt der Browser weder Sichtbarkeits- noch Fokus-Ereignisse, meldet der Runner das einmal; die Lehrkraft sieht in der Teilnehmerliste und in der Detailansicht den Hinweis.
- Die Admin-Lesepolicy der Einzel-Einträge läuft über `exam_sessions`; ein Bereichs-Admin kann sie dadurch **nicht direkt per Datenbank** lesen (sicher, weil strenger). Die App liest sie über die Server-Route mit Bereichsprüfung und Service-Client, daher keine Auswirkung auf die Funktion. Die Policy wurde am 2026-10-09 mit Freigabe korrigiert (siehe BUG-4).

**Noch nicht möglich:** Prüfung an echten Geräten (Tab-/App-Wechsel, Bildschirmsperre und Anruf verhalten sich je nach Browser und Handy verschieden) — in dieser Umgebung steht kein Browser zur Verfügung und `npm run dev` ist auf der Maschine nicht nutzbar. Ein kurzer Test mit iPhone, Android und Desktop wird empfohlen.

## QA Test Results

**Tested:** 2026-10-08
**Tester:** QA (AI) — Code gegen jedes Akzeptanzkriterium geprüft, `npm test` (681/681 grün), `tsc` (ohne Fehler), `npm run build` (fehlerfrei), SQL-Funktion und Zugriffsrechte direkt an der Produktions-Datenbank in zurückgerollten Transaktionen, Security-Advisor.
**Nicht getestet:** Darstellung im Browser, Responsive (375/768/1440 px), Cross-Browser und **echte Geräte** (Tab-/App-Wechsel, Bildschirmsperre, Anruf auf iPhone/Android). Dev-Server und Browser-Tests sind auf dieser Maschine ausgeschlossen (Abstürze). Ein kurzer manueller Test am Gerät steht aus.

### Acceptance Criteria Status

#### Erkennung
- [x] Seite im Hintergrund oder Fenster ohne Fokus wird erkannt (Hook-Tests: Sichtbarkeit, Blur)
- [x] Sichtbarkeit und Fokus für denselben Vorgang ergeben **einen** Eintrag (Test)
- [x] Eintrag mit Beginn, Ende/offen, Dauer, Frage (SQL-Test, Detail-Route-Test)
- [x] Nur Leistungsnachweise: der Wächter wird nur mit `focusTracking` aktiv; Route lehnt Nicht-Nachweis-Sessions mit 404 ab (Test)
- [x] Aktiv erst nach „Start", Ende mit der Abgabe (Runner wird erst nach dem Beitritt gemountet; Abgabe schließt offene Einträge — SQL `finalize` getestet)

#### Toleranzgrenze
- [x] < 3 s: protokolliert als „kurz", zählt nicht (SQL-Test, Hook-Test, Detailansicht)
- [x] ≥ 3 s zählt (SQL-Test)
- [x] Grenze zentral (`FOCUS_COUNT_FROM_SECONDS`), vom Server bewertet

#### Warnung
- [x] Dialog beim Zurückkommen mit Wechsel-Nummer, Bestätigung per Klick (Hook-Test; Dialog im Runner)
- [x] Zeit läuft weiter (Dialog stoppt den Timer nicht)
- [x] Erneut bei jedem weiteren zählenden Wechsel (Nummer zählt hoch)
- [x] Grenze im Dialog nur bei aktiver Auto-Abgabe
- [x] Kein Dialog unter 3 s (Test)

#### Information vorab
- [x] Satz auf dem Startbildschirm, nur bei aktiver Protokollierung, mit Grenze bei Auto-Abgabe

#### Einstellung pro Nachweis
- [x] Schalter (Standard an) und Auto-Abgabe (Standard aus, 1–20) im Anlegen-Dialog; Auto-Abgabe nur mit Protokollierung (Test: 400 sonst)
- [x] Nach dem Öffnen nicht mehr änderbar (gleiche Entwurf-Regel wie die übrigen Felder)
- [x] Bestandsnachweise: Protokollierung aus (an der DB geprüft: 4 Nachweise, 0 mit „an")

#### Automatische Abgabe
- [x] Bei N zählenden Wechseln gibt der **Server** ab, danach keine Antworten mehr (Test; gleiche Abgabelogik wie Zeitablauf)
- [x] Meldung an den Azubi (Runner-Dialog und Ergebnisseite)
- [x] Kein doppeltes Auslösen bei gleichzeitigen Meldungen (Test); Rücknahme der Markierung bei Fehlschlag (Test)
- [x] In der Auswertung erkennbar („Automatisch abgegeben (Fokus-Grenze)")
- [x] Ohne Auto-Abgabe keine Konsequenz außer Dialog (Test)

#### Anzeige für die Lehrkraft
- [x] Spalte „Fokus" („3× · 1:42 min", sonst „—"), nur bei aktiver Protokollierung
- [x] Badge „Auffällig" mit Symbol **und** Text; Banner über der Tabelle
- [x] Aufklappbare Detailliste mit Uhrzeit (Europe/Berlin), Dauer, Frage, „kurz"
- [x] Einordnungshinweis in der Detailansicht
- [x] Daten während der Bearbeitung sichtbar (offene Einträge zählen live mit; 8-Sekunden-Aktualisierung der Detailseite)

#### Zugriff und Datenschutz
- [x] Azubi: **kein Lesen, kein Schreiben, kein Funktionsaufruf** (an der Produktions-DB mit simulierter Azubi-Rolle geprüft: 0 Zeilen, INSERT blockiert, Funktion „permission denied")
- [x] Super-Admin liest; Route prüft den Fachbereich vor dem Service-Client-Zugriff, fremder Bereich → 404 (Test)
- [x] Löschung mit der Teilnahme (`ON DELETE CASCADE`)
- [x] Nur zwei Werte gehen an den Browser des Azubis (Einstellung, Zählerstand) und das Kennzeichen „automatisch abgegeben"

### Edge Cases Status
- [x] Tab geschlossen, nie zurück → Eintrag bleibt offen, Abgabe schließt ihn (SQL `finalize`)
- [x] Wiedereinstieg über den Code → „resume" schließt den Eintrag, Dialog erscheint (Hook-Test)
- [x] Offline beim Zurückkommen → Warteschlange, Nachmeldung bei „online"/Intervall (Test)
- [x] Zwei Tabs/Geräte → Zeilensperre, Doppelmeldungen entdoppelt (SQL-Test)
- [x] Manipulation: Dauer gedeckelt auf die Zeit seit dem letzten Kontakt, Server-Zeit, 200 Einträge, 60 Meldungen/Minute (SQL-Test)
- [x] Aus der Wertung genommene Teilnehmer: Protokoll bleibt sichtbar, ohne Einfluss auf die Note
- [x] Mehrere Nachweise parallel: Einträge hängen an der Teilnahme
- [x] „Keine Überwachung möglich" bei Browsern ohne Sichtbarkeits- und Fokus-Ereignisse (nachgezogen 2026-10-09, siehe BUG-3; Lib-, Route- und Hook-Tests)

### Security Audit Results
- [x] Alle Routen verlangen Login; Admin-Route zusätzlich Rolle + Fachbereich
- [x] Zod-Validierung aller Eingaben (UUIDs, Zahlenbereiche)
- [x] Zeit und Zählung entscheidet der Server, nicht der Browser; Browser kann sich höchstens selbst entlasten (Meldung unterdrücken) — in der Spec als Grenze benannt
- [x] Funktion `focus_report` für `anon`/`authenticated` nicht ausführbar (Advisor: nicht in den Listen)
- [x] Keine neuen Advisor-Warnungen durch die neuen Tabellen
- [x] Keine Geheimnisse, keine neuen Umgebungsvariablen

### Bugs Found

#### BUG-1: Fokus-Wächter startete bei neuem Ref-Objekt neu (behoben)
- **Severity:** Medium. Der Effekt hing an der Identität von `currentQuestionRef`; bei einem neu erzeugten Objekt hätte jedes Re-Rendern erneut „resume" gemeldet. Im Runner ist das Ref stabil, aber fragil. Von den neuen Hook-Tests gefunden, behoben, Test deckt es ab.

#### BUG-2: Fehlgeschlagene „resume"-Meldung wurde später nachgesendet (behoben)
- **Severity:** Low. Nachgesendet hätte sie einen Eintrag geschlossen, während der Azubi gerade wirklich weg ist (zu kurze Dauer). Wird jetzt nicht mehr in die Warteschlange gelegt; Test ergänzt.

#### BUG-3: „Keine Überwachung möglich" nicht umgesetzt (behoben 2026-10-09)
- **Severity:** Low. Umgesetzt mit zusätzlicher Spalte `tracking_unavailable` an der Zusammenfassung (Migration `20261009_proj30_tracking_unavailable.sql`, additiv, Standard false). Der Runner prüft beim Start, ob der Browser Sichtbarkeits-Status oder Fokus-Abfrage kennt; fehlt beides, wird einmal `unsupported` gemeldet und nichts weiter überwacht. Die Teilnehmerliste zeigt dann das Badge „Keine Überwachung möglich" statt eines irreführenden „—", die Detailansicht erklärt, dass ein leeres Protokoll hier nichts beweist.

#### BUG-4: Bereichs-Admin konnte Einzel-Einträge nicht direkt per Datenbank lesen (behoben 2026-10-09)
- **Severity:** Low. Die Leserechte-Policy lief über `exam_sessions`, die ein Bereichs-Admin nicht lesen darf. Fail-closed, die App las über die Server-Route, daher keine Funktionsauswirkung. Mit Freigabe per `ALTER POLICY` auf den Weg über die Zusammenfassungs-Tabelle umgestellt (`20261009_proj30_focus_events_policy.sql`, in Produktion angewendet). An der Produktions-DB in zurückgerollter Transaktion geprüft: Azubi 0 Einträge, Super-Admin und Bereichs-Admin des eigenen Bereichs sehen sie. Ein Bereichs-Admin eines fremden Bereichs existiert derzeit nicht und konnte nicht getestet werden (die Bereichslogik ist die bestehende `can_admin_department`).

### Summary
- **Acceptance Criteria:** alle erfüllt, soweit ohne Browser prüfbar
- **Bugs Found:** 4 (alle behoben)
- **Security:** keine offenen Lücken
- **Tests:** 689/689 grün
- **Production Ready:** YES — mit der Empfehlung eines kurzen Geräte-Tests (iPhone, Android, Desktop) nach dem Deploy. Wirksam ist die Funktion nur für **neu angelegte** Nachweise mit eingeschalteter Protokollierung; alles Bestehende bleibt unverändert.

## Deployment
**Deployed:** 2026-10-08
**Production URL:** https://spedilern.vercel.app
**Vercel Deployment:** `spedilern-iv6cnwuk8` (Production, Status Ready), ausgelöst per Push auf `main` (Commit d6747d3).

**Datenbank (Produktion, Supabase „Spedilern App"):** `proj30_focus_protocol` wurde **vor** dem Deploy angewendet (rein additiv; alte Nachweise haben die Protokollierung aus, daher ist der Bestand vom neuen Code unberührt). Rollback: `supabase/migrations/20261008_proj30_focus_protocol_down.sql` (löscht das Protokoll).

**Vor dem Deploy geprüft:** 654/654 Tests und `tsc` im **getrennten Checkout des committeten Stands** (ohne die fremden, uncommitteten Arbeiten an PROJ-26/28), dort auch `npm run build` fehlerfrei. Im Commit steckt ausschließlich PROJ-30; Detailseite und Beitritts-Client wurden aus dem letzten Commit plus nur den PROJ-30-Änderungen gebaut.

**Nach dem Deploy geprüft:** Build Ready; die neuen Routen antworten ohne Login mit 401 (Fokus-Meldung, Admin-Detailprotokoll, Beitrittsabfrage).

**Zweiter Deploy 2026-10-09** (Commit 75978d9, Vercel `spedilern-3cmfueb2r`, Production, Ready): Lese-Policy der Einzel-Einträge für Bereichs-Admins (`20261009_proj30_focus_events_policy.sql`, BUG-4) und Kennzeichen „Keine Überwachung möglich" (`20261009_proj30_tracking_unavailable.sql`, BUG-3). Beide Migrationen wurden vor dem Deploy in Produktion angewendet (Policy-Änderung bzw. additive Spalte mit Standard false); Rollback über die jeweiligen `_down`-Dateien. Im getrennten Checkout des Commits: 675/675 Tests, Build fehlerfrei; live antworten die neuen Routen ohne Login mit 401, die Spalte `tracking_unavailable` existiert in Produktion.

**Noch offen:**
- Manueller Test an echten Geräten (iPhone, Android, Desktop): einen Nachweis mit eingeschalteter Protokollierung anlegen, öffnen, beitreten, Tab/App wechseln, Warnung und Teilnehmerliste prüfen — auch die automatische Abgabe mit kleiner Grenze (z. B. 1). Das ist der einzige verbleibende Punkt und lässt sich nur am Gerät klären. Keine offenen Bugs.
