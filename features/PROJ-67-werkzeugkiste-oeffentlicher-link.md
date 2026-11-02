# PROJ-67: Werkzeugkiste – Öffentlicher Link („Link für alle“)

## Status: Approved
**Created:** 2026-11-02
**Last Updated:** 2026-11-02 (gebaut, QA)

## Idee in einem Satz
Eine Lehrkraft erzeugt aus einem fertigen Material (Interaktive Seite) mit einem Klick einen Link, den **jede Person mit dem Link ohne Konto** öffnen kann. Sie muss die Datei dafür nicht herunterladen oder selbst irgendwo hochladen. Den Link kann sie jederzeit wieder abschalten.

## Entscheidungen (mit dem Nutzer geklärt, 2026-11-02)
- **E1 – Laufzeit:** Ein Link gilt, **bis die Lehrkraft ihn abschaltet**. Es gibt keinen automatischen Ablauf.
- **E2 – Welche Materialien:** Nur Materialien im Format **Interaktive Seite (HTML)**. H5P-Dateien lassen sich ohne Moodle oder H5P-Player nicht öffnen, ein Link wäre dort sinnlos. Bei H5P steht statt der Schaltfläche der Hinweis „Nur bei Interaktiver Seite“.
- **E3 – Wo man den Link erzeugt:** An drei Stellen, mit demselben Verhalten:
  1. im Schritt **„Fertig“** neben „Herunterladen“ (der Weg „sofort teilen, ohne vorher zu speichern“),
  2. in **„Meine Materialien“** (je Material, dazu eine Übersicht aller aktiven Links),
  3. im **Teilen-Dialog des Regals** als weitere Option neben „Alle / Fachbereich / ausgewählte Personen“.
- **E4 – Absender:** Die öffentliche Seite zeigt **nichts über die Lehrkraft** (kein Name, keine Schule, keine E-Mail). Nur das Material.
- **Vorgabe aus PROJ-53:** Dort stand „Öffentliche Links für Personen ohne Konto“ ausdrücklich unter „Abgrenzung“. Dieses Feature holt es bewusst nach. Die Regal-Regeln (`regal_darf_sehen`) bleiben **unverändert**. Der öffentliche Link ist ein **eigener, zweiter Weg** und lockert sie nicht.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle) – nur Lehrkräfte und Admins erzeugen Links
- Requires: PROJ-51 (Rahmen, Schritt „Fertig“, fertige Datei im Speicher)
- Requires: PROJ-52 (Meine Materialien)
- Requires: PROJ-53 (Regal, Teilen-Dialog)
- Berührt: PROJ-60 (Konto löschen) – Links müssen mit dem Konto verschwinden

## User Stories
- Als Lehrkraft will ich im Schritt „Fertig“ mit einem Klick einen Link kopieren, damit ich das Material sofort teilen kann, ohne die Datei erst lokal zu speichern.
- Als Lehrkraft will ich, dass Schülerinnen, Schüler, Eltern und Kollegen ohne Konto das Material öffnen können, damit ich den Link in Moodle, WhatsApp, E-Mail oder auf einem Aushang (QR-Code) weitergeben kann.
- Als Lehrkraft will ich den Link jederzeit abschalten können, damit ich das Material zurückholen kann, wenn es nicht mehr öffentlich sein soll.
- Als Lehrkraft will ich in „Meine Materialien“ sehen, welche Materialien öffentlich sind, damit ich nicht vergesse, was im Netz steht.
- Als Lehrkraft will ich, dass auf der öffentlichen Seite nichts über mich steht, damit ich keine persönlichen Daten preisgebe.
- Als Super-Admin will ich alle aktiven öffentlichen Links sehen und abschalten können, damit ich bei Missbrauch eingreifen kann.

## Acceptance Criteria

### Link erzeugen
- [ ] Im Schritt „Fertig“ gibt es bei Interaktiver Seite neben „Herunterladen“ die Schaltfläche **„Link für alle erzeugen“**. Es bleibt **eine** Hauptaktion (Herunterladen), der Link-Knopf ist `variant="outline"`.
- [ ] Ein Klick erzeugt den Link, kopiert ihn in die Zwischenablage und zeigt „Link kopiert“. Die Lehrkraft muss nichts speichern oder hochladen.
- [ ] Vor dem ersten Erzeugen erscheint **einmal je Material** ein kurzer Hinweis: „Jeder, der diesen Link hat, kann das Material öffnen. Du kannst ihn jederzeit abschalten.“ Mit „Link erzeugen“ und „Abbrechen“.
- [ ] Der Link besteht aus einem **nicht erratbaren Code** (mindestens 128 Bit Zufall). Er enthält weder Material-ID noch Namen.
- [ ] Bei H5P-Materialien gibt es keine Schaltfläche, nur den Hinweis „Nur bei Interaktiver Seite“.
- [ ] Ein Material hat **höchstens einen aktiven Link**. Wird er erneut erzeugt, während einer aktiv ist, wird der bestehende angezeigt, kein zweiter angelegt.

### Link öffnen (ohne Konto)
- [ ] Wer den Link kennt, sieht die Seite **ohne Anmeldung**, ohne Weiterleitung auf die Login-Seite und ohne Vercel-Schutzseite.
- [ ] Die Seite funktioniert auf Handy und Laptop, auch die Interaktion (Aufgaben lösen, Prüfen), so wie die heruntergeladene Datei.
- [ ] Die öffentliche Seite enthält **keinen** Namen, keine E-Mail, keine Schule und keine Verweise auf Konto, Regal oder Skript der Lehrkraft.
- [ ] Skript, KI-Antwort und Prüfstellen-Befunde sind über den Link **nicht abrufbar**. Ausgeliefert wird nur die fertige Seite.
- [ ] Die Seite ist für Suchmaschinen gesperrt (`noindex`, `X-Robots-Tag`), damit sie nicht über eine Suche gefunden wird.
- [ ] Ein ungültiger oder abgeschalteter Link zeigt eine ruhige Seite „Dieser Link ist nicht mehr aktiv.“ (Status 404, ohne Hinweis, ob es ihn je gab).

### Abschalten und Verwalten
- [ ] Im Schritt „Fertig“, in „Meine Materialien“ (Menü ⋯) und im Teilen-Dialog gibt es **„Link abschalten“** (mit Bestätigung durch `AlertDialog`).
- [ ] Nach dem Abschalten liefert der alte Link **sofort** 404 (es gibt keinen Zwischenspeicher, siehe Tech Design).
- [ ] Wird später erneut ein Link erzeugt, ist er ein **neuer** Code. Der alte bleibt tot.
- [ ] „Meine Materialien“ zeigt eine Spalte bzw. ein Kennzeichen **„Öffentlich“** und einen Filter „Nur öffentliche“.
- [ ] Je Link werden die **Zahl der Aufrufe** und das Datum des letzten Aufrufs gezählt und der Lehrkraft angezeigt. Es werden **keine** Daten der Besucher gespeichert (keine IP, kein Gerät).
- [ ] Im Teilen-Dialog des Regals ist die Link-Option unabhängig von der Regal-Freigabe. Man kann nur den Link haben, nur das Regal oder beides.

### Löschen, Überarbeiten, Rolle
- [ ] **Material löschen:** Der Lösch-Dialog warnt „Der öffentliche Link wird dabei ebenfalls abgeschaltet.“ Nach dem Löschen liefert der Link 404.
- [ ] **Überarbeiten / neu bauen:** Der Link bleibt gleich, zeigt aber die **neue** Fassung. Der Dialog „Überarbeiten“ weist darauf hin: „Dein öffentlicher Link zeigt danach die neue Fassung.“
- [ ] **Lehrer-Rolle wird entzogen:** Alle Links der Person werden abgeschaltet. Bekommt sie die Rolle zurück, bleiben sie aus.
- [ ] **Konto wird gelöscht:** Alle Links verschwinden mit dem Konto (PROJ-60).
- [ ] Der Super-Admin sieht unter Werkzeugkiste eine Liste aller aktiven Links (Material, Besitzer, erzeugt am, Aufrufe) und kann jeden abschalten.

## Edge Cases
- **Fertige Datei fehlt im Speicher** (z. B. gelöscht, 404 beim Laden): Der Link erzeugt keine Fehlerseite mit technischem Text, sondern „Dieser Link ist nicht mehr aktiv.“ Die Lehrkraft sieht in „Meine Materialien“ „Datei fehlt, Link inaktiv“ (wie der bestehende Dateifehler aus PROJ-52).
- **Entwurf (Ablauf noch nicht fertig):** Kein Link möglich, die Schaltfläche gibt es erst im Schritt „Fertig“. Entwürfe werden nach 7 Tagen gelöscht, ein Link darauf wäre also unzuverlässig.
- **Zwei Browser-Tabs:** Erzeugt oder schaltet die Lehrkraft in zwei Tabs gleichzeitig, bleibt genau ein Link in einem eindeutigen Zustand (kein Doppel-Eintrag).
- **Link wird massenhaft aufgerufen** (Viral, Bot-Angriff): Eine Mengenbremse pro Link und Besucheradresse schützt die App. Bei Überschreitung zeigt sie „Gerade zu viele Zugriffe, bitte gleich nochmal versuchen“ (429).
- **Große Datei:** Eine Seite über 4,5 MB läuft nicht durch die App-Funktion, sondern wird direkt aus dem Speicher ausgeliefert, ohne dass der Speicher-Link sichtbar wird oder abläuft (der heutige Download-Link hält nur 120 s).
- **Link wird in Moodle/WhatsApp eingefügt:** Vorschau-Karten dürfen keinen Inhalt des Materials verraten. Als Titel erscheint nur der Materialtitel.
- **Material wird umbenannt:** Der Link ändert sich nicht.
- **Lehrkraft sucht nach dem Link später:** Er ist in „Meine Materialien“ jederzeit wieder kopierbar, nicht nur beim Erzeugen.
- **Fremde Skripte in der Seite:** Die Seite enthält Text aus einer KI-Antwort. Sie darf **nie** im Kontext der App laufen (Anmeldung, Cookies, Schnittstellen), sonst kann sie die Sitzung angemeldeter Lehrkräfte angreifen. Siehe Technische Anforderungen.
- **Missbrauch** (Link wird für Unerwünschtes genutzt): Super-Admin kann jeden Link abschalten. Eine Meldefunktion für Besucher gehört nicht in diese Version.

## Technische Anforderungen
- **Sicherheit, zentral:** Die öffentliche Seite läuft **getrennt von der angemeldeten App**: entweder auf einer eigenen Domain bzw. Unterdomain ohne App-Cookies oder mit `Content-Security-Policy: sandbox` und streng begrenzten Rechten. Sie hat **keinen Zugriff** auf Konto, Cookies, localStorage der App oder deren Schnittstellen. Die Entscheidung trifft `/architecture`.
- **Keine Lockerung bestehender Regeln:** Die Ablauf-Tabelle bleibt privat, die Regal-Funktionen bleiben unverändert. Der öffentliche Link hat eine eigene Tabelle (Code, Material, Erzeugt am, Aufrufe, Letzter Aufruf, Abgeschaltet am) und eine eigene Auslieferung.
- **Datenschutz:** Es werden keine Besucherdaten gespeichert. Der Hinweis im Dialog macht klar, dass der Link an Unbekannte weitergegeben werden kann (DSGVO: keine Schülernamen oder Noten im Material, Hinweis im Dialog).
- **Leistung:** Die öffentliche Seite lädt in unter 1 Sekunde (ohne Zwischenspeicher, damit Abschalten sofort wirkt).
- **Rechte:** Erzeugen und Abschalten nur für den Besitzer (Lehrkraft oder Admin) und den Super-Admin. Ohne Anmeldung liefern diese Routen 401. Nur die Auslieferung selbst ist öffentlich.
- **Browser:** Aktuelle Versionen von Chrome, Safari (iOS), Firefox und Edge.
- **Barrierefreiheit:** Schaltflächen mindestens 44 px, Link-Kopieren mit Rückmeldung per `toast.success`, Statusänderungen für Screenreader angesagt.

## Abgrenzung (nicht Teil dieses Features)
- **H5P** per Link (bräuchte eigenen Player, wäre ein eigenes Feature)
- Ablaufdatum, Passwortschutz oder Link nur für bestimmte Personen
- Anzeige des Absenders auf der Seite (bewusst nicht, E4)
- Ergebnisse oder Noten der Besucher einsammeln (die Seite zählt nur lokal im Browser)
- QR-Code-Erzeugung (kann später ergänzt werden, der Link allein reicht)
- Meldefunktion für Besucher
- Eigene Domain für Lehrkräfte oder Schul-Branding

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Stand 2026-11-02. Die App bekommt **eine** neue öffentliche Adresse und eine kleine Link-Tabelle. Die Ablauf-Tabelle, die Regal-Regeln und der Python-Kern bleiben unberührt.

### Was heute schon da ist (und wiederverwendet wird)
- Die fertige Interaktive Seite liegt als **eine einzige HTML-Datei** im privaten Speicher der App (`<Besitzer>/<Ablauf>/ausgabe`). Sie ist in sich geschlossen: Bilder sind eingebettet, nichts wird aus dem Netz nachgeladen, Eingaben laufen nur im Browser.
- Die Seite merkt sich den Lernfortschritt im Browser (`localStorage`), fängt aber ein Verbot sauber ab: „Die Seite läuft trotzdem.“ Das ist wichtig für die Sicherheitslösung unten.
- Es gibt schon eine kleine Mengenbremse (PROJ-55), einen „Datei fehlt“-Test und Fehlertexte im Muster der Werkzeugkiste.
- Die Anmelde-Schranke (`proxy.ts`) lässt nur eine feste Liste öffentlicher Pfade ohne Login durch. Die kommt hier um **einen** Pfad dazu.

### A) Bausteine (Übersicht)
```
Lehrkraft-Seite (angemeldet)                        Öffentlich (ohne Konto)
+-- Schritt „Fertig“                                +-- Seite /s/<Code>
|   +-- [Herunterladen]  (Hauptaktion, unverändert)     +-- liefert nur die fertige HTML-Seite
|   +-- [Link für alle erzeugen]  (outline)             +-- strenge Sicherheits-Kopfzeilen
|       +-- Hinweis-Dialog (einmal je Material)         +-- „Dieser Link ist nicht mehr aktiv.“
|       +-- Link kopieren · Aufrufe · Abschalten
+-- Meine Materialien
|   +-- Kennzeichen „Öffentlich“ + Filter „Nur öffentliche“
|   +-- Menü ⋯: Link kopieren · Link abschalten
+-- Regal · Teilen-Dialog
|   +-- zusätzliche Option „Link für alle“ (unabhängig von der Regal-Freigabe)
+-- Super-Admin · Werkzeugkiste
    +-- Liste aller aktiven Links (Material, Besitzer, erzeugt, Aufrufe) · abschalten
```
Die drei Orte der Lehrkraft nutzen **denselben** Baustein („Link-Feld“ mit Kopieren und Abschalten), damit sie sich nicht auseinanderentwickeln.

### B) Daten (in Alltagssprache)
Neue Tabelle **„Öffentliche Links“**, eine Zeile je Link:
- Code (langer Zufallscode, mindestens 128 Bit, nicht erratbar, einmalig)
- Zu welchem Material (Verweis auf den Ablauf; wird das Material gelöscht, verschwindet die Zeile mit)
- Besitzer
- Erzeugt am
- Abgeschaltet am (leer = aktiv)
- Zahl der Aufrufe und Zeitpunkt des letzten Aufrufs (**keine** Besucherdaten)

Regeln, die die Datenbank selbst durchsetzt (nicht nur die Oberfläche):
- **Höchstens ein aktiver Link je Material.** Zwei gleichzeitige Klicks ergeben trotzdem nur einen.
- Angemeldete Nutzer dürfen die Tabelle nur **lesen** (ihre eigenen Zeilen, Super-Admin alle). Erzeugen, Abschalten und Zählen laufen über Datenbankfunktionen (wie beim Regal).
- Die Zeile enthält **keinen** Skripttext und keine KI-Antwort.
- Gespeichert wird nur die Seite selbst, die schon im Speicher liegt. Es entsteht **keine zweite Kopie**.

### C) Technische Entscheidungen (mit Begründung)

**1. Eigene öffentliche Adresse `/s/<Code>`, kein Umweg über den Speicher-Link.**
Der Speicher (Supabase) liefert HTML-Dateien aus Sicherheitsgründen als reinen Text aus. Die Seite würde also nicht laufen. Außerdem laufen dessen Links nach 120 Sekunden ab. Deshalb liefert die App die Seite selbst aus: Sie schlägt den Code nach, prüft „aktiv?“, holt die Datei aus dem Speicher und gibt sie mit eigenen Kopfzeilen zurück.

**2. Die Sicherheit steckt in der Auslieferung: Sandbox statt eigener Domain.** *(wichtigste Entscheidung)*
Die Seite enthält Text aus einer KI-Antwort und braucht Skripte, damit die Aufgaben funktionieren. Läge sie unbehandelt auf der App-Domain, könnte ein eingeschleustes Skript die Sitzung einer eingeloggten Lehrkraft nutzen. Lösung: Die Antwort trägt die Anweisung „Sandbox“, **ohne** das Recht, als die App-Domain aufzutreten. Der Browser behandelt die Seite dann wie ein Fremdgebiet:
- Skripte dürfen laufen (Aufgaben, „Prüfen“) und der Druck-Dialog darf öffnen.
- **Kein Zugriff** auf Cookies, Anmeldung, Speicher oder Schnittstellen der App.
- Keine Verbindung ins Netz, keine Formulare, keine Fenster, keine Fremd-Bilder oder -Skripte (nur eingebettete Bilder).
- Zusätzlich: nicht in fremden Seiten einbettbar, nicht von Suchmaschinen indexierbar, nicht zwischengespeichert, kein Mitsenden der Herkunft.

*Warum nicht eine eigene Domain?* Sie wäre die noch stärkere Trennung, kostet aber eine Domain, einen zweiten Vercel-Aufbau und Pflege. Die Sandbox schützt gegen genau die Gefahr, um die es geht (Zugriff auf die App). Sollte sich später zeigen, dass der Fortschritt unbedingt gemerkt werden muss, ist die eigene Domain der Ausbau.

*Folge für die Lehrkraft (ehrlich sagen!):* In der Sandbox kann die Seite den **Lernfortschritt nicht im Browser merken**. Nach dem Neuladen ist der Stand weg. Die Seite läuft sonst unverändert (sie war schon dafür gebaut). Heruntergeladen und lokal geöffnet merkt sie sich den Fortschritt wie bisher. Das steht kurz im Hinweis-Dialog.

**3. Kein Zwischenspeicher am Rand, jeder Aufruf wird gezählt.**
Die Spec erlaubte bis zu 60 Sekunden Verzögerung beim Abschalten. Besser: Es gibt **keinen** Zwischenspeicher. Ein abgeschalteter Link ist dann **sofort** tot, und der Aufrufzähler stimmt. Die Ladezeit bleibt unter einer Sekunde, weil nur eine Zeile und eine Datei geholt werden. **Abweichung von der Spec (Verbesserung):** „höchstens 60 s“ wird zu „sofort“.

**4. Große Seiten werden gestreamt.**
Funktionen auf Vercel dürfen normal höchstens 4,5 MB am Stück zurückgeben. Seiten mit vielen Bildern können größer sein. Die Antwort wird deshalb als Datenstrom aus dem Speicher durchgereicht. In der QA wird mit einer Seite über 4,5 MB geprüft (kein Test bisher, siehe Risiko).

**5. Mengenbremse ohne Besucherdaten.**
Wie bei der Suche (PROJ-55): ein einfacher Zähler im Speicher je Link und Herkunft, nur Zeitpunkte, nichts Dauerhaftes. Er bremst ein Durchprobieren von Codes und einen Ansturm, ersetzt aber kein verteiltes Limit. Zusätzlich sorgt die Länge des Codes dafür, dass Raten aussichtslos ist. Der Fehlerfall „ungültig“ und „abgeschaltet“ sieht identisch aus (404), damit man nicht herausfinden kann, ob es einen Code je gab.

**6. Rechte wie beim Regal, nur der Besitzer erzeugt.**
Erzeugen und Abschalten: nur Besitzer (Lehrkraft oder Admin) und Super-Admin, alles über Datenbankfunktionen, ohne Anmeldung 401. Nur die Auslieferung selbst ist öffentlich. Bei Rollenentzug schaltet eine Datenbankregel alle Links der Person ab (nicht erst die Oberfläche). Bei Kontolöschung (PROJ-60) verschwinden sie mit dem Konto.

**7. Was „Überarbeiten“ bewirkt.**
Der Link zeigt bei jedem Aufruf die **aktuelle** fertige Datei. Wird das Material neu gebaut, sieht jeder sofort die neue Fassung. Der Link ändert sich nicht. Ist die Datei gerade im Neubau nicht da, erscheint „Dieser Link ist nicht mehr aktiv.“, nicht ein technischer Fehler.

**8. Format-Sperre auf dem Server.**
Die Funktion „Link erzeugen“ prüft selbst, dass das Material fertig ist und das Format „Interaktive Seite“ hat. Die Oberfläche blendet die Schaltfläche bei H5P nur aus; die Sperre liegt nicht nur dort.

### D) Wo liegt was (nur Orte, kein Code)
- **Neue öffentliche Seite** `/s/<Code>`: kommt in die Liste der Pfade ohne Anmeldung in der Anmelde-Schranke. Sonst landen Gäste auf der Login-Seite. (Lehre aus PROJ-63: das wird gern vergessen. Dazu kommt ein Test.)
- **Neue Schnittstellen für Lehrkräfte** unter den Werkzeugkiste-Routen: Link lesen/erzeugen/abschalten je Material, Liste „Meine Links“, Super-Admin-Liste. Reine Lehrkräfte brauchen dafür die Freigabe der Pfade in der Rollenliste.
- **Neue Datenbank-Migration** mit Tabelle, Funktionen, Rollenentzug-Regel; dazu eine Rückbau-Datei und ein Probe-Skript wie bei PROJ-53/55.
- **Bestehendes wird erweitert, nicht ersetzt:** Schritt „Fertig“, Menü in „Meine Materialien“, Teilen-Dialog, Lösch- und Überarbeiten-Dialog (Warntexte).

### E) Risiken und offene Punkte für die QA
- **Sandbox im echten Browser prüfen** (Chrome, Safari iOS, Firefox): Läuft die Seite, funktioniert „Prüfen“, öffnet sich der Druck-Dialog, bleibt der Fortschritt aus ohne Fehlermeldung? Das ist ohne Browser-Durchgang nicht belegbar (wie bei PROJ-53, siehe Notiz „kein Entwicklungsserver“). Der Nutzer macht den Durchgang auf einer Vorschau-Adresse.
- **Seite über 4,5 MB** wirklich öffentlich abrufen (Streaming-Annahme).
- **Angriffstest:** Eine Seite mit eingeschleustem Skript, das versucht, Cookies zu lesen, zur App zu verbinden oder weiterzuleiten, darf nichts davon erreichen.
- **Einbetten in Moodle per iframe** geht **nicht** (die App verbietet Einbettung global). Der Link selbst funktioniert in Moodle als normaler Link. Einbetten wäre ein eigenes späteres Feature.
- **Aufrufzähler** ist je Aufruf gezählt, nicht je Person (kein Wiedererkennen von Besuchern, bewusst).

### F) Neue Pakete
Keine. Alles geht mit dem, was schon installiert ist.

### Reihenfolge der Umsetzung
1. **Backend:** Tabelle, Funktionen, Rollenentzug-Regel, Probe-Skript, Schnittstellen, öffentliche Auslieferung, Anmelde-Schranke (Migration vor dem Push einspielen).
2. **Frontend:** Link-Feld in den drei Orten, Kennzeichen/Filter, Warntexte, Super-Admin-Liste.
3. **QA** mit Angriffstest und Browser-Durchgang durch den Nutzer.

Es sind **zwei Pakete** möglich: erst Backend + „Fertig“-Schritt + Super-Admin-Abschalter (liefert den eigentlichen Nutzen), dann „Meine Materialien“ + Regal-Dialog.

## Implementation Notes (Backend & Frontend)

> Stand 2026-11-02. Beide Pakete in einem Zug gebaut (Backend, dann Oberfläche).

**Datenbank** (`supabase/migrations/20261104_proj67_oeffentlicher_link.sql`, Rückweg `…_down.sql`, Probe `supabase/tests/proj67_links_probe.sql`)
- Tabelle `werkzeug_links` (Code mit 48 Hexzeichen, Material, Besitzer, erzeugt/abgeschaltet, Aufrufe, letzter Aufruf), RLS: angemeldete Nutzer lesen nur eigene Zeilen. Teilweiser Eindeutigkeits-Index = höchstens ein aktiver Link je Material.
- Funktionen für Besitzer: `link_lesen`, `link_erzeugen` (Format-Sperre „seite“ + `.html`, nur fertige eigene Materialien, gibt bei vorhandenem Link diesen zurück), `link_abschalten`. Super-Admin: `link_admin_liste`, `link_admin_abschalten`.
- Auslieferung: `link_nachschlagen` und `link_aufruf_zaehlen` sind **nur für `service_role`** ausführbar (anon und angemeldete Nutzer bekommen „permission denied“). `link_nachschlagen` prüft zusätzlich die Rolle der Besitzerin/des Besitzers.
- Trigger `werkzeug_links_rollenentzug` schaltet bei Verlust der Lehrer-Rolle alle Links der Person ab (kommt die Rolle zurück, bleiben sie aus).
- Die Ablauf-Tabelle und alle Regal-Funktionen bleiben unverändert.

**Schnittstellen** (alle unter `/api/admin/werkzeugkiste`, Rolle per `requireTeacherOrAdmin`, Pfade für reine Lehrkräfte schon über das Präfix freigegeben)
- `GET/POST/DELETE /ablaeufe/:id/link` (lesen · erzeugen · abschalten), `GET /links?seite=` und `DELETE /links/:id` nur Super-Admin (sonst 404).
- `GET /materialien` liefert je Material `oeffentlich: { aufrufe }` (nie den Code) und kennt `?oeffentlich=1` („Nur öffentliche“).

**Öffentliche Auslieferung** `/s/:code` (`src/app/s/[code]/route.ts`)
- `proxy.ts` lässt `/s/` ohne Anmeldung und ohne Cookie-Zugriff durch (früher Rücksprung, auch für Angemeldete).
- Code ungültig, abgeschaltet, Datei fehlt, Datenbankfehler: immer dieselbe 404-Seite „Dieser Link ist nicht mehr aktiv.“
- Antwort als Datenstrom aus dem Speicher (Adresse für 120 s, aber nur serverseitig genutzt), ohne Zwischenspeicher, Kopfzeilen: CSP `sandbox allow-scripts allow-modals` (**ohne** `allow-same-origin`), `default-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `frame-ancestors 'none'`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`.
- Aufrufzähler über `after()`, nur Zähler und Zeitpunkt. Mengenbremse im Speicher (120 pro Minute und Quelle, 60 pro Code und Quelle), danach 429.

**Oberfläche**
- Neuer Baustein `link-fuer-alle.tsx` (Link-Feld + Dialog) für alle drei Orte: Schritt „Fertig“ (Nebenaktion „Link für alle erzeugen“; mit vorhandenem Link ein Klick = kopieren, daneben Aufrufe und „Link verwalten“; bei anderen Formaten der Hinweis „Link für alle: nur bei Interaktiver Seite.“), „Meine Materialien“ (Menü-Eintrag, Kennzeichen „Öffentlich“ am Titel, Filter „Nur öffentliche“, Warnsatz im Löschen-Dialog) und Teilen-Dialog (eigener Abschnitt „Öffentlicher Link“ außerhalb des Formulars).
- Hinweis-Dialog vor dem ersten Erzeugen (Jeder mit Link; Fortschritt wird im Link nicht gemerkt; keine Namen oder Noten im Material), Abschalten immer erst nach `AlertDialog`.
- Überarbeiten (Schritt 4 bei fertigem Material): ist ein Link aktiv, steht dabei „Dein öffentlicher Link zeigt danach die neue Fassung.“
- Super-Admin: Abschnitt „Öffentliche Links“ unter „Moderation“ im Regal (Liste, Abschalten mit Bestätigung, ohne Code).

**Abweichungen von der Spec / Entscheidungen**
- Kein Zwischenspeicher am Rand: Abschalten wirkt **sofort** (Spec sagte höchstens 60 s). Spec-Zeilen angepasst.
- Hinweis-Dialog erscheint bei jedem Erzeugen (der Link ist danach aktiv, die Frage kommt also genau dann, wenn kein Link besteht), nicht „einmal je Material“ gespeichert. Das ist einfacher und genauso sicher.
- Der Hinweis-Dialog im Schritt „Fertig“ trägt den Fortschrittshinweis, weil die Sandbox den Lernfortschritt im Browser nicht merken lässt (die Seite fängt den gesperrten Speicher ab und läuft normal).
- Regal-Karten anderer Lehrkräfte bekommen keinen Link: Links gibt es nur für eigene Materialien.

## QA Test Results

> Stand 2026-11-02. Eigene Prüfung durch die Entwicklung (kein Browser, kein Entwicklungsserver: siehe Gedächtnis „Kein Dev-Server“).

**Ergebnis: keine Critical- oder High-Fehler. Status Approved, mit den offenen Punkten unten.**

| Prüfung | Ergebnis |
|---|---|
| Alle Tests (`npm test`) | 194 Dateien, **2265 Tests grün** (davon neu: 24 Oberfläche, 16 Schnittstellen, 8 öffentliche Auslieferung, 13 Bibliothek, 2 Anmelde-Schranke) |
| Typprüfung, Lint, `npm run build` | sauber, `/s/[code]` als dynamische Route im Build |
| Datenbank-Probe (`proj67_links_probe.sql`) in eingebettetem Postgres (PGlite) mit Nachbau von `profiles`, `werkzeug_ablaeufe`, `has_teacher_role`, `is_admin`, Rollen `anon`/`authenticated`/`service_role` | **33 Prüfzeilen, kein FAIL.** Migration und Rückbau laufen sauber, Rückbau lässt nichts zurück |
| Echte Supabase-Datenbank | Probe und Migration **durch den Nutzer einzuspielen** (Schreibzugriff auf Produktion ist uns gesperrt), siehe Deployment |

**Abgedeckt (Auszug aus der Probe):** Code 48 Hexzeichen; zweiter Klick liefert denselben Link (ein aktiver); H5P, fremdes Material, Entwurf und Azubi werden abgelehnt; Azubi und Kollegin sehen keine fremden Zeilen (RLS); `anon` und angemeldete Nutzer dürfen weder `link_nachschlagen` noch `link_aufruf_zaehlen` rufen und `anon` liest die Tabelle nicht; Abschalten wirkt sofort, der alte Code bleibt tot, ein neuer Code entsteht; Super-Admin sieht und schaltet ab, Lehrkräfte nicht; Rollenentzug schaltet ab und die Rückgabe der Rolle belebt nichts wieder; Löschen des Materials entfernt den Link.

**Sicherheits-Audit**
- Sandbox **ohne** `allow-same-origin`, ohne `allow-popups`, `allow-forms`, `allow-top-navigation` (Test prüft das); keine Verbindung ins Netz, keine Formulare, keine Fremdquellen, nicht einbettbar, nicht indexierbar, kein Zwischenspeicher, keine Herkunftsangabe.
- Öffentliche Antworten verraten nicht, ob ein Code je existierte (gleiche 404-Seite, ohne technische Texte). Ungültige Codes erreichen die Datenbank gar nicht.
- Skript, KI-Antwort und Prüfbefunde sind über den Link nicht erreichbar (ausgeliefert wird nur die fertige Datei). Die Übersicht des Super-Admins nennt nie den Code.
- Es gibt keine neue Umgebungsvariable und keine neue Abhängigkeit.

**Offene Punkte (nicht blockierend)**
1. **Browser-Durchgang durch den Nutzer** (Chrome, Safari iOS, Firefox) auf der Vorschau- oder Produktionsadresse: Läuft die Seite in der Sandbox (Aufgaben, „Prüfen“, Drucken, „Eingaben löschen?“)? Bleibt der Fortschritt aus, ohne Fehlermeldung? Wirkt „Link kopieren“ auf dem Handy?
2. **Seite über 4,5 MB** wirklich öffentlich abrufen (Datenstrom-Annahme, Spec Edge Case „Große Datei“).
3. **(Low)** Datei im Speicher fehlt: Der Link zeigt „nicht mehr aktiv“, aber „Meine Materialien“ nennt der Lehrkraft das noch nicht („Datei fehlt, Link inaktiv“, Spec Edge Case). Die Lehrkraft merkt es erst beim Download.
4. **(Low)** Eine Seite in der Sandbox kann sich per Klick auf einen Link selbst woandershin navigieren (z. B. ein Link im KI-Text). Das ist bei Seiten ohne Eltern-Seite nicht zu verhindern und bleibt ohne Zugriff auf die App.
5. **(Info)** Die Mengenbremse liegt im Speicher je Server-Instanz (wie bei PROJ-55). Sie bremst Durchprobieren und Ansturm, ist aber kein verteiltes Limit. Die Länge des Codes macht Raten aussichtslos.
6. **(Info)** Vorschau-Karten in Messengern lesen den `<title>` der Seite; das ist der Materialtitel der KI, keine Angabe zur Person.

## Deployment
_To be added by /deploy_
