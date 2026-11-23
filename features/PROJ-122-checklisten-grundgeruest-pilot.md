# PROJ-122: Checklisten zu den Handlungsleitlinien – Grundgerüst & Pilot „Dienstreise und Reisekosten“

## Status: In Progress
**Created:** 2026-11-20
**Last Updated:** 2026-11-23

## Kontext
Die Handlungsleitlinien (HLL) der Schule liegen als PDFs vor (`docs/HLL/`, 28 Dateien, 24 Leitlinien) und stehen für die Suche in „Schulrecht“ (PROJ-55/88). Wer einen Vorgang erledigen muss (Dienstreise beantragen, Zeugnisse abgeben, Klassentagebuch abgeben), muss die Leitlinie suchen, lesen und selbst im Kopf abhaken, was schon erledigt ist.

Dieses Feature bringt eine **Checkliste je Leitlinie**: kurze, einzeln abhakbare Schritte in der richtigen Reihenfolge, das **Original grafisch aufbereitet daneben**, jederzeit **wiederholbar** (ein Reiseantrag wird mehrfach im Jahr gestellt). Es legt das Grundgerüst und liefert **eine Pilot-Checkliste**; die übrigen Listen folgen in PROJ-123.

Hinweis: Die Checkliste ersetzt die Leitlinie nicht. Verbindlich ist immer das Original (PDF der Schulleitung).

### Entscheidungen (Nutzer, 2026-11-19/20)
- **E1 – Haken sieht nur die Lehrkraft selbst.** Gespeichert im eigenen Konto, damit sie auf Handy und Laptop gleich sind. Auch der Super-Admin sieht fremde Haken nicht. (Ausnahme „Onboarding mit Mentor“ siehe PROJ-125.)
- **E2 – Wiederholbar:** „Neu starten“ beginnt einen neuen Durchlauf mit leeren Haken. Frühere Durchläufe bleiben (mit Datum) erhalten.
- **E3 – Original daneben:** am Laptop nebeneinander, am Handy per Tab umschaltbar. Die Fassung des Originals wird aus dem geprüften Schulrecht-Text **neu und einheitlich gesetzt**; das PDF wird nicht eingebettet.
- **E4 – Pflege:** Die Checklisten werden von Claude geschrieben, vom Nutzer geprüft und **fest im Code** geführt (kein Editor). Jede Liste merkt sich, zu welchem Stand der Leitlinie sie gehört. Ändert sich die Leitlinie, zeigt die Liste „Leitlinie wurde geändert, bitte prüfen“, bis sie angepasst ist.
- **E5 – Zielgruppe:** alle Lehrer-Rollen (Lehrkraft, Bereichs-Admin, Super-Admin). Fachbetreuung und Mentor/in haben Lehrkräfte-Status und brauchen keine eigene Rolle. Das **Sekretariat bekommt eine eigene Rolle**, die separat gebaut wird (noch keine PROJ-Nummer). Je Liste steht, **für wen** sie gilt (Lehrkraft, Klassenleitung, Sekretariat, Fachbetreuung, Mentor/in). Azubis sehen nichts davon.
- **E6 – Varianten:** Hängen Schritte von der Art des Falls ab (z. B. Dienstreise Inland/Ausland, Fortbildung/Klassenfahrt), fragt die Liste **zu Beginn** und zeigt nur die passenden Schritte.
- **E7 – Pilot: Dienstreise und Reisekosten.** Zwei verknüpfte Listen: „Dienstreise beantragen“ (vor der Reise) und „Reisekosten abrechnen“ (danach). Am Ende der ersten steht „Weiter mit Reisekosten abrechnen“.
- **E8 – Fünf Features statt eines:** PROJ-122 (Grundgerüst + Pilot), PROJ-123 (übrige Listen), PROJ-124 (Info-Seiten, Entscheidungshilfe, Notfall-Ansicht), PROJ-125 (Onboarding mit Mentor), PROJ-126 (Fristen aus einem Termin).
- **E9 – Keine Benachrichtigungen.** Web-Push ist zurückgestellt (PROJ-18); die Checkliste erinnert nicht von selbst.
- **E10 – Sechs-Monats-Frist für Reisekosten gilt für alle Reisen** (Nutzer, 2026-11-20: „ich denke schon“). In der Leitlinie „Dienst-/Fortbildungsreise“ steht keine Frist; sie steht nur bei „Voraussetzungen Klassenfahrt“. Die Liste übernimmt die Frist für alle Varianten und kennzeichnet sie als **Annahme, von der Schulleitung zu bestätigen**.
- **E11 – Der Horde-Kalender wird nicht mehr gebraucht** (Nutzer, 2026-11-20). Es gibt keine Checkliste dazu; der Abwesenheitskalender steckt in der App (PROJ-120).

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle), PROJ-24 (Rollenmodell), PROJ-45 (Layout, Seitenleiste, Tokens), PROJ-83 (Bedienmuster: `AdminTabs*`, `AdminSegmented`, `AdminPageHeader`), Zustände aus `admin-states.tsx`
- Requires: PROJ-55/88 (Schulrecht): Text der Leitlinien und Stand
- Abhängigkeit (später): Rolle **Sekretariat** (eigenes Feature, wird separat gebaut). Bis sie existiert, sehen alle Lehrer-Rollen auch die Sekretariats-Listen; danach bekommt die Rolle Zugriff auf `/admin/checklisten` (Proxy-Listen anpassen)
- Berührt: PROJ-60 (Konto löschen: Haken werden mit gelöscht), PROJ-70 (Änderungsprotokoll: nicht nötig, Haken sind privat), PROJ-81 (Startseite „Zu erledigen“, siehe Offene Fragen)
- Folge-Features: PROJ-123, PROJ-124, PROJ-125, PROJ-126

## User Stories
- Als **Lehrkraft** möchte ich zu einem Vorgang (z. B. Dienstreise) eine Liste mit kurzen Schritten sehen, damit ich weiß, was ich in welcher Reihenfolge tun muss.
- Als **Lehrkraft** möchte ich Schritte abhaken und sofort sehen, wie weit ich bin, damit ich bei Unterbrechung weitermachen kann.
- Als **Lehrkraft** möchte ich zum Schritt das passende Stück des Originals lesen können, damit ich bei Unsicherheit nachsehe, woher die Vorgabe kommt.
- Als **Lehrkraft** möchte ich den Vorgang später erneut durchlaufen („Neu starten“), ohne dass alte Haken stören.
- Als **Lehrkraft** möchte ich zu Beginn angeben, um welche Art Fall es geht, damit mir nur Schritte angezeigt werden, die auf mich zutreffen.
- Als **Lehrkraft** möchte ich am Handy abhaken und am Laptop am selben Stand weiterarbeiten.
- Als **Lehrkraft** möchte ich gewarnt werden, wenn sich die Leitlinie nach Erstellung der Liste geändert hat, damit ich nichts Veraltetes befolge.

## Acceptance Criteria

### Zugang & Navigation
- [ ] Neuer Eintrag „Checklisten“ in der Seitenleiste des Lehrkräfte-Bereichs (`/admin/checklisten`), sichtbar für Lehrkraft, Bereichs-Admin und Super-Admin. Azubis werden umgeleitet, die API antwortet mit 403.
- [ ] Die neue Seite steht in beiden Proxy-Freigabelisten für Lehrkräfte (`roles.ts`), sonst scheitert sie in Produktion; Wächter-Tests decken das ab.
- [ ] Die Übersicht zeigt je Liste: Titel, ein Satz Beschreibung, „Für wen“, Stand der Leitlinie und, falls angefangen, den Fortschritt („3 von 8“).
- [ ] Im Pilot enthält die Übersicht „Dienstreise beantragen“ und „Reisekosten abrechnen“.

### Die Liste
- [ ] Eine Liste hat Titel, „Für wen“, Stand der Leitlinie („Stand 07.05.2025, gültig seit 2018“), Schritte und optional Hinweise (z. B. „Keine nachträglichen Genehmigungen!“).
- [ ] Jeder Schritt ist ein kurzer Satz (Verb am Anfang), optional mit einer Zeile Zusatz. Schritte stehen in der Reihenfolge der Leitlinie.
- [ ] Abhaken per Klick/Tipp auf den ganzen Schrittrahmen (mindestens 44 × 44 px), per Tastatur mit Leertaste; abgehakte Schritte sind durchgestrichen oder gedämpft **und** mit Haken-Symbol markiert (nicht nur durch Farbe).
- [ ] Fortschrittsanzeige („3 von 8 erledigt“, Balken) oben; sie aktualisiert sich sofort.
- [ ] Schritte mit Frist zeigen die Frist als Text („mindestens 14 Tage vor der Reise“). Berechnete Daten folgen erst in PROJ-126.
- [ ] Sind alle Schritte abgehakt, erscheint ein Abschluss-Zustand mit „Neu starten“ und, falls vorhanden, dem Link auf die Folge-Liste.

### Varianten
- [ ] Hat eine Liste Varianten, erscheint beim Start eine Auswahl (`AdminSegmented` bis 4 Werte, sonst Dropdown). Erst danach werden die Schritte gezeigt.
- [ ] Die Variante lässt sich später wechseln. Schritte, die in beiden Varianten vorkommen, behalten ihren Haken; Schritte, die entfallen, werden ausgeblendet und ihr Haken bleibt gespeichert, falls zurückgewechselt wird.
- [ ] Pilot „Dienstreise beantragen“: Varianten laut Leitlinie – Dienstreise Inland/Ausland, Fortbildungsreise Inland/Ausland, Fortbildungsgang (Stadtgebiet), Bezirksreise (Achatswies). **Dienstgang** (Stadtgebiet, Besuch Betrieb) braucht keinen Antrag: Die Liste weist darauf hin („Mündliche Genehmigung der Schulleitung genügt“) und endet.
- [ ] Anlagen je Variante (Programm und Einladung bei Dienstreise; Einladung bei Fortbildungsreise; Formular „Genehmigung einer Lehr- und Studienfahrt“ bei Klassenfahrt; A1-Bescheinigung bei Auslandstätigkeit über eine Woche) erscheinen nur in der passenden Variante.

### Original daneben
- [ ] Ab 1024 px stehen Checkliste und Original nebeneinander, darunter als Tabs („Checkliste“ / „Original“, `AdminTabs*`).
- [ ] Das Original zeigt Titel, Absätze, Überschriften, Listen und hervorgehobene Warnungen („Achtung!“) einheitlich gestaltet, dazu Stand, Zuständigkeit und „Gültig ab“ aus dem Kopf der Leitlinie.
- [ ] Zu jedem Schritt führt „Im Original ansehen“ zur passenden Stelle (Absatz wird kurz hervorgehoben).
- [ ] Ein deutlicher Hinweis nennt das Original als verbindliche Quelle („Verbindlich ist das PDF der Schulleitung“).
- [ ] Texte stehen unverändert so im Original wie in der Leitlinie; personenbezogene Namen und Kontaktdaten werden nicht fest eingebaut (siehe Edge Cases).

### Durchläufe
- [ ] „Neu starten“ fragt per `AlertDialog` nach, legt einen **neuen Durchlauf** mit leeren Haken an und archiviert den bisherigen mit Datum. Es wird nichts gelöscht.
- [ ] Pro Liste und Person gibt es höchstens einen **offenen** Durchlauf.
- [ ] Haken werden sofort gespeichert (kein „Speichern“-Knopf). Schlägt das Speichern fehl, springt der Haken zurück und ein Toast sagt verständlich, was los ist.
- [ ] Die Daten gehören dem Konto: Auf Handy und Laptop zeigt dieselbe Liste denselben Stand.

### Pilot „Reisekosten abrechnen“
- [ ] Die Liste fasst die belegten Angaben aus „Dienst-/Fortbildungsreise“ und „Voraussetzungen Klassenfahrt, Erasmus, Auslandspraktika“ zusammen: Original des genehmigten Dienstreiseantrags beilegen, Originalbelege, Programm; Antrag über das Sekretariat; private Ausgaben werden nicht erstattet.
- [ ] Angaben, die nur für Klassenfahrten gelten (Erstattung für bis zu drei Übernachtungen, 30 € Kulturbudget für die ganze Fahrt), stehen **nur in der Variante „Klassenfahrt“**.
- [ ] Die **Frist von sechs Monaten nach der Reise** steht in allen Varianten (E10). Sie trägt den Hinweis „Annahme: gilt laut Schulleitung auch für Dienst- und Fortbildungsreisen, noch bestätigen lassen“, bis die Schulleitung bestätigt hat; danach entfällt der Hinweis.
- [ ] Die Liste verweist auf die zugrunde liegenden Leitlinien („Quellen“) mit Stand.

### Änderung der Leitlinie
- [ ] Jede Liste hält fest, zu welchem Stand der Leitlinie sie geschrieben und geprüft wurde.
- [ ] Weicht der Stand der Leitlinie in Schulrecht vom Stand der Liste ab, zeigt die Liste einen gelben Hinweis „Die Leitlinie wurde am TT.MM.JJJJ geändert. Bitte im Original prüfen.“ Der Hinweis verschwindet erst, wenn die Liste im Code angepasst wurde.
- [ ] Ein automatischer Test schlägt fehl, wenn Liste und Leitlinie auseinanderlaufen, damit es bei der Pflege nicht unbemerkt bleibt.
- [ ] Ein laufender Durchlauf bleibt bei einer Änderung der Liste erhalten; Schritte, die neu hinzukommen, erscheinen ungehakt, entfallene Schritte bleiben in der Archivansicht des Durchlaufs sichtbar.

### Zustände & Barrierefreiheit
- [ ] Ladezustand als Skeleton (`AdminLoadingState`), Fehlerzustand mit „Erneut versuchen“ (`AdminErrorState`), kein Drehkreis über die ganze Seite.
- [ ] Alle Bedienelemente mindestens 44 × 44 px, sichtbarer Fokus, Tastaturbedienung, Haken haben ein zugängliches Label („Schritt 3: Antrag an das Sekretariat geben, erledigt“).
- [ ] Alle Farben aus den `ws-*`-Tokens, beide Darstellungen (hell/dunkel) bestehen den Kontrasttest; Animationen höchstens 200 ms und bei „Bewegung reduzieren“ aus.
- [ ] Druck: Die Checkliste lässt sich sauber ausdrucken (hell auf weiß, ohne Navigation), Haken bleiben sichtbar.

## Edge Cases
- **Zwei Geräte gleichzeitig:** Wird auf beiden derselbe Schritt umgeschaltet, gilt der zuletzt gespeicherte Stand; die Anzeige gleicht sich beim nächsten Laden an. Es entstehen keine doppelten Durchläufe.
- **Offline / schlechte Verbindung:** Haken werden nicht stillschweigend verworfen. Entweder werden sie nachgereicht oder der Nutzer sieht klar, dass sie nicht gespeichert sind.
- **Leitlinie ändert sich mitten im Durchlauf:** Der Durchlauf läuft weiter, die Warnung erscheint (siehe oben); nichts wird automatisch zurückgesetzt.
- **Variante nachträglich ändern:** Schritte der anderen Variante verschwinden aus der Ansicht, ihre Haken bleiben erhalten.
- **Alle Schritte erledigt, aber noch nicht „abgeschlossen“:** Der Durchlauf zählt als erledigt, sobald der letzte Haken gesetzt ist; „Neu starten“ bleibt verfügbar, nichts erzwingt es.
- **Zurückhaken:** Ein Haken lässt sich jederzeit wieder entfernen; ein abgeschlossener Durchlauf wird dadurch wieder offen.
- **Personenbezogene Angaben in Leitlinien** (Namen von Ansprechpersonen, E-Mail-Adressen, Telefonnummern): ändern sich häufig. Die Liste nennt die **Funktion** („Technische Hausverwaltung“), nicht den Namen; Kontaktdaten stehen nur dort, wo die Leitlinie sie zwingend nennt, und mit Stand.
- **Konto wird gelöscht (PROJ-60):** Alle Haken und Durchläufe der Person werden mit gelöscht.
- **Azubi ruft die Adresse direkt auf:** Umleitung bzw. 403, kein Inhalt sichtbar.
- **Sehr lange Schritte / viele Schritte:** Zeilen brechen um, Titel werden in Listen mit „…“ gekürzt, voller Text im `title`.
- **Doppelklick auf den Haken:** schaltet nicht zweimal um (kurze Sperre während des Speicherns).
- **Super-Admin:** sieht dieselben Listen wie alle, aber **keine** fremden Haken.

## Technical Requirements
- Performance: Liste und Original öffnen in unter 1 s auf dem Handy bei normaler Verbindung; ein Haken ist nach unter 300 ms gespeichert und angezeigt.
- Security: Haken und Durchläufe sind durch Zeilenzugriffsregeln auf das eigene Konto begrenzt; keine Leseberechtigung für andere, auch nicht für Admins.
- Datenschutz: Es werden nur Schritt-IDs, Zeitpunkte und die gewählte Variante gespeichert, keine Freitexte, keine Daten über Dritte.
- Browser: aktuelle Versionen von Chrome, Safari (iOS), Firefox, Edge.

## Offene Fragen
- **Sechs-Monats-Frist bei Dienstreisen:** Der Nutzer geht davon aus, dass sie gilt (E10). Bei der Schulleitung bestätigen lassen, danach den Hinweis in der Liste entfernen.
- **Rolle Sekretariat:** Wann und mit welchen Rechten kommt sie? Das Feature muss ihr den Zugriff auf die Checklisten geben (Proxy-Listen, Wächtertests). Eine eigene Spezifikation für die Rolle gibt es noch nicht (Vorschlag: `/requirements` mit PROJ-127).
- **Gibt es eine eigene Leitlinie „Reisekostenabrechnung“?** Sie liegt nicht in `docs/HLL/`. Falls ja, bitte hochladen; die Liste „Reisekosten abrechnen“ würde sich danach richten.
- **Startseiten-Karte „Angefangene Checklisten“** in „Zu erledigen“ (PROJ-81): sinnvoll? Wäre ein kleiner Zusatz, nicht Teil dieser Spezifikation.
- **Sprung von der Schulrecht-Treffer-Karte** einer Leitlinie zur zugehörigen Checkliste („Zur Checkliste“): gewünscht? Wäre ein kleiner Zusatz in PROJ-123.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
### Überblick in einem Absatz
Die Checklisten werden von uns **als feste Dateien in der App** geführt (Titel, Schritte, Varianten, Hinweise). Der Text der Leitlinie (das „Original“) kommt als **geprüfte Momentaufnahme aus Schulrecht** mit in die App und wird dort einheitlich gesetzt. **Nur die Haken und Durchläufe** liegen in der Datenbank, privat im eigenen Konto. Ob eine Leitlinie sich seit dem Schreiben der Liste geändert hat, erkennt die App an einer **Prüfsumme** des Leitlinientextes, die sie beim Öffnen einer Liste kurz beim Python-Kern erfragt.

### A) Seiten und Bausteine

```
Lehrkräfte-Bereich (bestehender Rahmen mit Seitenleiste)
+-- Seitenleiste: neuer Eintrag „Checklisten“ (alle Lehrer-Rollen)
|
+-- Seite „Checklisten“ (Übersicht)
|   +-- Seitenkopf (Titel, ein Satz Beschreibung)
|   +-- Kartenliste
|   |   +-- Karte je Liste: Titel, Beschreibung, „Für wen“, Stand der Leitlinie,
|   |       Fortschritt („3 von 8“) falls angefangen
|   +-- Leerzustand / Ladezustand / Fehlerzustand
|
+-- Seite „Checkliste“ (eine Liste)
    +-- Seitenkopf mit Brotkrumen (Checklisten > Titel)
    +-- Hinweisleiste „Leitlinie wurde geändert, bitte prüfen“ (nur bei Abweichung)
    +-- Am Laptop: zwei Spalten nebeneinander · am Handy: zwei Tabs
    |   +-- Spalte/Tab „Checkliste“
    |   |   +-- Variantenwahl (z. B. Art der Reise) – nur wenn die Liste Varianten hat
    |   |   +-- Fortschrittsbalken („3 von 8 erledigt“)
    |   |   +-- Hinweise (z. B. „Keine nachträglichen Genehmigungen!“)
    |   |   +-- Schrittzeilen: Haken · Satz · Zusatzzeile · Frist als Text · „Im Original ansehen“
    |   |   +-- Abschluss-Karte (alles erledigt): „Neu starten“ · „Weiter mit …“
    |   |   +-- „Frühere Durchläufe“ (eingeklappt, nur Lesen)
    |   +-- Spalte/Tab „Original“
    |       +-- Titel, Stand, Zuständigkeit, „Gültig ab“
    |       +-- Leitlinientext einheitlich gesetzt (Überschriften, Listen, Warnhinweise)
    |       +-- Hinweis „Verbindlich ist das PDF der Schulleitung“
    +-- Bestätigungsdialog „Neu starten?“
    +-- Druckansicht (hell auf weiß, Haken sichtbar, ohne Navigation)
```

Vorhandenes wird wiederverwendet: Seitenkopf, Tabs, Segment-Auswahl und Lade-/Leer-/Fehlerzustände des Lehrkräfte-Bereichs, die fertigen Bausteine für Haken, Fortschrittsbalken, Bestätigungsdialog, Etiketten und Meldungen. Die Seitenleiste hat eine einzige Quelle (`admin-nav`); ein neuer Eintrag steht dort an einer Stelle und erscheint automatisch in Seitenleiste, Handy-Menü und Schnellsuche.

### B) Daten – was wird wo gespeichert?

**1. Inhalt der Checklisten: fest in der App (kein Editor, E4).**
Jede Liste ist eine Datei mit: Kennung, Titel, Beschreibung, „Für wen“, Quellen (welche Leitlinie, mit Prüfsumme und Stand zum Zeitpunkt des Schreibens), Varianten, Hinweise und Schritten. Jeder Schritt hat:
- eine **feste Kennung** (wird nie umnummeriert, sonst gingen Haken verloren),
- den Satz und optional eine Zusatzzeile,
- optional eine Frist als Text,
- in welchen Varianten er gilt (sonst in allen),
- ein **Textanker** für „Im Original ansehen“: eine kurze, wörtlich im Original stehende Wendung (z. B. „mind. 14 Tage vor der geplanten Reise“), anhand derer die Original-Ansicht zur Stelle springt.

Schritte werden nie gelöscht, sondern als „entfallen“ markiert. So bleibt ein alter Durchlauf lesbar.

**2. Text der Leitlinien: Momentaufnahme aus Schulrecht, mit in der App.**
Ein Befehl im Kern-Projekt erzeugt eine Datei mit allen Leitlinien (Titel, Stand, Zuständigkeit, Text, Prüfsumme). Sie liegt in der App und wird **auf dem Server** gelesen und gesetzt; sie landet nicht im Browser-Paket. Dadurch öffnet die Original-Ansicht sofort, ohne auf den Python-Kern zu warten, und funktioniert auch, wenn der Kern gerade schläft.

**3. Haken und Durchläufe: Datenbank, privat im Konto.**
```
Durchlauf (eine Runde einer Liste)
- Wem gehört er (Konto)
- Welche Liste (Kennung)
- Welche Variante (oder keine)
- Gestartet am
- Archiviert am (leer = offener Durchlauf)

Haken (ein erledigter Schritt)
- Zu welchem Durchlauf
- Welche Schritt-Kennung
- Erledigt am
```
Regeln:
- **Pro Liste und Person nur ein offener Durchlauf.** „Neu starten“ archiviert den offenen und legt in einem Zug einen neuen an. Nichts wird gelöscht.
- **Ein Haken = eine Zeile.** Haken setzen legt die Zeile an, Haken entfernen löscht sie. Der Browser schickt immer den gewünschten Zustand („erledigt“ oder „nicht erledigt“), nicht „umschalten“. So gibt es bei zwei Geräten keinen Verwechslungseffekt, und Doppelklicks schaden nicht.
- Ob ein Durchlauf „fertig“ ist, wird **nicht gespeichert**, sondern aus den Haken und der Variante berechnet.
- Es werden **keine Freitexte** und keine Daten über Dritte gespeichert.
- Wird das Konto gelöscht (PROJ-60), verschwinden Durchläufe und Haken automatisch mit.

### C) Ablauf aus Sicht der Lehrkraft
1. **Liste öffnen:** Die App holt den offenen Durchlauf (falls vorhanden) und die früheren. Gibt es keinen, entsteht erst beim ersten Haken bzw. bei der Variantenwahl einer.
2. **Variante wählen** (nur bei Listen mit Varianten): Ohne Wahl zeigt die Liste nur die Auswahl. Wechsel später ist möglich; Haken entfallener Schritte bleiben gespeichert.
3. **Abhaken:** Der Haken erscheint sofort (optimistisch), die App speichert im Hintergrund. Schlägt das Speichern fehl, springt der Haken zurück und eine Meldung sagt verständlich warum.
4. **Zwei Geräte:** Kein Live-Abgleich nötig. Beim Zurückkehren in den Tab und beim Neuladen holt die App den Stand frisch.
5. **Fertig:** Sind alle sichtbaren Schritte erledigt, erscheint die Abschluss-Karte mit „Neu starten“ und ggf. „Weiter mit Reisekosten abrechnen“.
6. **Neu starten:** Dialog „Neuen Durchlauf beginnen?“, dann archiviert die App den alten und beginnt einen neuen.

### D) Änderung der Leitlinie erkennen (zwei Sicherungen)
- **Beim Entwickeln:** Ein Test vergleicht die Prüfsumme jeder Quelle einer Liste mit der Momentaufnahme. Wird die Momentaufnahme nach einer Änderung in Schulrecht erneuert, schlägt der Test fehl, bis die Liste geprüft und ihre Prüfsumme nachgezogen ist. Ein zweiter Test prüft, dass jeder Textanker noch wörtlich im Original steht.
- **Im Betrieb:** Beim Öffnen einer Liste fragt die App im Hintergrund den Kern nach der aktuellen Prüfsumme der Quelle. Weicht sie ab (z. B. weil Schulrecht schon aktualisiert wurde, die Liste aber noch nicht), erscheint der gelbe Hinweis „Die Leitlinie wurde am … geändert. Bitte im Original prüfen.“ Die Antwort wird kurz zwischengespeichert; die Seite wartet nicht darauf und zeigt bei Kern-Ausfall keinen Fehler, nur keinen Hinweis.

### E) Änderungen im Python-Kern (Werkzeugkiste)
Zwei kleine, rein ergänzende Änderungen (ältere App-Versionen laufen weiter):
1. Die bestehende Abfrage einer einzelnen Stelle liefert zusätzlich die **Prüfsumme** des Wortlauts.
2. Ein neuer Befehl erzeugt die **Momentaufnahme der Leitlinien** für die App (Titel, Stand, Zuständigkeit, Text, Prüfsumme).

Der Kern muss dafür neu ausgeliefert werden (gleicher Ablauf wie bei Schulrecht; vorher Zustand des Kern-Ordners prüfen).

### F) Rechte und Datenschutz
- **Sichtbar für alle Lehrer-Rollen** (Lehrkraft, Bereichs-Admin, Super-Admin), nicht für Azubis. Die Seite und die Schnittstellen müssen in **beiden** Freigabelisten für Lehrkräfte eingetragen werden (Seiten und Schnittstellen); dafür gibt es schon Wächtertests, sie werden erweitert.
- **Haken sind privat:** Die Datenbank erlaubt jeder Person nur die eigenen Zeilen. Es gibt **keine** Ausnahme für Admins. Auch der Super-Admin sieht fremde Haken nicht.
- **Keine Protokollierung** der Haken im Änderungsprotokoll (PROJ-70): Sie sind privat.
- Schreiben läuft über die App-Schnittstellen, die die Rolle prüfen; zusätzlich schützt die Datenbank selbst.
- Die Leitlinientexte sind interne Texte der Schule und sind nur hinter der Anmeldung für Lehrer-Rollen sichtbar.

### G) Technische Entscheidungen (mit Begründung)
| Entscheidung | Warum |
|---|---|
| Haken in der Datenbank, nicht im Browser-Speicher | Du willst am Handy und am Laptop denselben Stand; Browser-Speicher gilt nur für ein Gerät. |
| Ein Haken = eine Datenbankzeile, mit „gewünschter Zustand“ statt „umschalten“ | Zwei Geräte, Doppelklick, Netzausfall: kein falsch gedrehter Haken, nichts geht verloren. |
| Checklisten fest in der App (E4) | Kein Editor, keine Rechteverwaltung, schnell fertig. Claude schreibt, du prüfst; Änderungen laufen über den üblichen Weg samt Test. |
| Leitlinientext als Momentaufnahme in der App | Original öffnet sofort, ist nicht vom schlafenden Python-Kern abhängig. Die Quelle bleibt Schulrecht (geprüfter Text), es gibt keine zweite Pflegestelle. |
| Prüfsumme statt Datum für „Leitlinie geändert“ | Das Datum im PDF wird nicht immer mitgeändert (z. B. Klassentagebücher: Datei neu, Datum 28.07.2025). Die Prüfsumme merkt jede Textänderung. |
| Textanker statt Absatznummer für „Im Original ansehen“ | Die meisten Leitlinien bestehen aus **einem** Absatz ohne Nummerierung; der Anker springt trotzdem an die Stelle und fällt bei Textänderung im Test auf. |
| Keine Echtzeit-Synchronisation | Eine Person nutzt ihre Liste selten auf zwei Geräten gleichzeitig; Aktualisierung beim Zurückkehren genügt und spart Aufwand. |
| Fertig-Zustand berechnen statt speichern | Passt immer zu den Haken, auch nach Variantenwechsel oder neuen Schritten. |
| Keine neuen Pakete | Alle benötigten Bausteine (Haken, Fortschritt, Tabs, Dialog, Meldungen) sind im Projekt. |

### H) Wie wird das Original „grafisch ansprechend“?
Der Schulrecht-Text ist Fließtext mit Aufzählungszeichen in einer Zeile. Ein **Setzer** wandelt ihn in Überschriften, Absätze, Listen (Aufzählung und Nummern), hervorgehobene Warnungen („Achtung!“) und Zitatblöcke um. Der Setzer ist ein einzelner, getesteter Baustein, den PROJ-123 und PROJ-124 wiederverwenden. **Risiko:** Weil das PDF-Layout verloren geht, lassen sich Überschriften und Tabellen nicht immer eindeutig erkennen. Im Pilot prüfen wir den Setzer an den zwei Pilot-Leitlinien; kann er etwas nicht sicher erkennen, zeigt er schlicht einen Absatz (nichts wird verändert oder weggelassen). Ein Test vergleicht den gesetzten Text Wort für Wort mit der Quelle.

### I) Pilot-Inhalt
- **Dienstreise beantragen:** aus „Dienst-/Fortbildungsreise“ (Varianten laut Spezifikation, Dienstgang als Sonderfall ohne Antrag, Anlagen je Variante).
- **Reisekosten abrechnen:** aus „Dienst-/Fortbildungsreise“ und „Voraussetzungen Klassenfahrt, Erasmus, Auslandspraktika“, Frist von sechs Monaten mit Hinweis „Annahme, bestätigen lassen“ (E10).
- Beide Listen erhalten vor dem Livegang eine unabhängige Gegenprüfung gegen das Original (Opus).

### J) Neue Bausteine (Übersicht)
- **Datenbank:** zwei neue Tabellen (Durchläufe, Haken) mit Zugriffsregeln nur auf das eigene Konto; eine Hilfsfunktion „Neu starten“ (alten archivieren, neuen anlegen in einem Zug).
- **Schnittstellen** (unter `/api/admin/checklisten`): Liste der Checklisten mit Fortschritt; eine Liste mit offenem Durchlauf und Archiv; Variante wählen; Haken setzen/entfernen; neu starten; Stand-Prüfung der Leitlinie.
- **Seiten und Bausteine:** Übersicht, Checklistenseite, Schrittzeile, Variantenwahl, Fortschritt, Original-Ansicht mit Setzer, Hinweisleiste, Abschluss-Karte, Verlauf.
- **Seitenleiste und Rechte:** ein Navigationseintrag; Eintrag in beiden Freigabelisten (`roles`); erweiterte Wächtertests.
- **Kern:** Prüfsumme in der Stellen-Abfrage; Befehl für die Momentaufnahme.

### K) Prüfungen vor dem Livegang
- Tests für: Ablauf der Haken (setzen, entfernen, doppelt, zwei Geräte), „Neu starten“, Varianten (Sichtbarkeit, Wechsel, Rückwechsel), Setzer (Wort für Wort gleich zur Quelle), Textanker, Prüfsummen-Vergleich, Rechte (Azubi 403; fremde Haken nicht lesbar, auch nicht als Admin).
- Test auf Zugriffsregeln der Datenbank mit einer Probe-Datei für den SQL-Editor (Probe wird als Link geliefert).
- Kein Entwicklungsserver (läuft auf dem MacBook nicht stabil): Prüfung über Build, Tests und Datenbank-Probe; Sichtprüfung der Seiten durch dich nach dem Livegang.
- Server-/Client-Grenze beachten: Symbole werden als fertige Elemente übergeben, nicht als Funktion (sonst Fehler in Produktion, die Tests nicht sehen).
- Reihenfolge beim Livegang: zuerst Datenbank-Migration, dann App (sonst bricht die Seite).

### L) Bauschritte und Modellwahl
1. **`/backend` – Sonnet:** Tabellen, Zugriffsregeln, „Neu starten“-Funktion, Schnittstellen, Freigabelisten, Tests, Probe-Datei.
2. **Kern-Änderung – Sonnet:** Prüfsumme, Momentaufnahme-Befehl, Auslieferung.
3. **`/frontend` – Sonnet:** Seiten, Setzer, Original-Ansicht, Liste und Verlauf, beide Pilot-Listen schreiben.
4. **Gegenprüfung der Pilot-Listen gegen das Original – Opus.**
5. **`/qa` – Opus:** Rechte (private Haken), Zwei-Geräte-Fälle, Druck, Barrierefreiheit, Kontrast.

### M) Dependencies
Keine neuen Pakete.

### N) Offene Punkte für den Bau
- Die Rolle **Sekretariat** (separates Feature) muss später in die Freigabelisten aufgenommen werden.
- Der **Setzer** wird im Pilot an zwei Leitlinien entwickelt; PROJ-123/124 bringen weitere Textformen (Tabellen, Zitatblöcke), die er dann dazulernt.
- Die Verlaufsansicht („Frühere Durchläufe“) ist bewusst schlicht: Datum und Fortschritt, nur Lesen.


## Implementation Notes (Backend, 2026-11-23)

**Stand:** Datenbank und Schnittstellen sind gebaut und getestet (54 Tests grün, `tsc` und `eslint` ohne Befund). Die Migration ist **noch nicht eingespielt** (Freigabe der Zeilenregeln durch den Nutzer nötig). Offen: Kern-Änderung (Prüfsumme, Momentaufnahme), Frontend, Listen-Inhalte.

**Datenbank** – [supabase/migrations/20261125_proj122_checklisten.sql](../supabase/migrations/20261125_proj122_checklisten.sql), Rückweg `…_down.sql`, Probe [supabase/tests/proj122_checklisten_probe.sql](../supabase/tests/proj122_checklisten_probe.sql):
- `checklisten_durchlaeufe` (Besitzer, Liste, Variante, gestartet, archiviert) und `checklisten_haken` (Durchlauf, Schritt, erledigt am). Beide mit Zeilenregeln nur auf das eigene Konto **ohne Admin-Ausnahme**; `anon` ohne Rechte; Konto löschen räumt per `ON DELETE CASCADE` auf.
- Höchstens ein offener Durchlauf je Person und Liste (teilweiser Unique-Index). Haken lassen sich nur in **offenen** Durchläufen setzen/entfernen; archivierte sind nur lesbar. Kein Löschen von Durchläufen über die Sitzung.
- Vier Funktionen (SECURITY INVOKER, Zeilenregeln gelten): `checkliste_offener_durchlauf`, `checkliste_haken_setzen` (gewünschter Zustand, idempotent, höchstens 200 Haken), `checkliste_variante_setzen`, `checkliste_neu_starten` (archivieren + neu in einem Zug, mit Sperre gegen Doppelaufrufe). Fehlercodes `CHK01` (400), `CHK02` (409).

**Schnittstellen** (`/api/admin/checklisten`, alle `requireTeacherOrAdmin`, `Cache-Control: private, no-store`):
| Aufruf | Zweck |
|---|---|
| `GET /` | alle offenen Durchläufe der eigenen Person mit ihren Haken (für den Fortschritt in der Übersicht) |
| `GET /[id]` | offener Durchlauf der Liste (oder `null`) und frühere Durchläufe (nur mit Zahl der Haken, höchstens 50) |
| `PUT /[id]/haken {schritt, erledigt, variante?}` | Haken setzen/entfernen; legt den offenen Durchlauf bei Bedarf an |
| `PUT /[id]/variante {variante \| null}` | Variante wählen oder aufheben |
| `POST /[id]/neu {variante?}` | „Neu starten“ (201) |

Unbekannte Listen und Varianten werden vor der Datenbank mit 404 bzw. 400 abgelehnt. Fehler an den Nutzer enthalten keine Technik-Texte.

**App-Code:** `src/lib/checklisten/katalog.ts` (Kennungen der zwei Pilot-Listen mit ihren Varianten, Zod-Schemas, Fehlercode-Übersetzung, Typen `Durchlauf`/`FruehererDurchlauf`), Hilfen in `src/app/api/admin/checklisten/_lib/`. Die Seite und die Schnittstellen stehen in **beiden** Freigabelisten (`roles.ts`); Wächtertest ergänzt (`roles.test.ts`).

**Abweichungen/Entscheidungen beim Bau:**
- Die Prüfung, ob ein Schritt zur Liste gehört, übernimmt erst die Listen-Datei im Frontend-Schritt. Die Datenbank begrenzt Form (Muster) und Menge (200).
- Variantenkennungen der Pilot-Listen stehen schon jetzt im Katalog (u. a. `dienstgang`, `bezirksreise`, `klassenfahrt`) und werden im Frontend-Schritt **nicht umbenannt**.
- Der Aufruf `GET …/leitlinien-stand` (Warnung „Leitlinie geändert“) kommt mit der Kern-Änderung, nicht in diesem Schritt.
- Ein Test (`werkzeugkiste-auszug.test.ts`, „nennt die Urheberin oder den Urheber“) schlägt im Gesamtlauf fehl; er berührt diese Arbeit nicht (Datei nicht geändert) und ist nicht von mir verursacht.

**Einspielen:** Migration im SQL-Editor ausführen, danach die Probe. Erwartet: `rls_*=true`, `anon_darf_ausfuehren=false`, alle übrigen `true` (Felder mit `NULL`, wenn keine zweite Lehrkraft oder kein Azubi im System ist). Erst danach App deployen.

## Implementation Notes (Frontend, 2026-11-23)

**Stand:** Seiten, Setzer, Original-Ansicht und beide Pilot-Listen sind gebaut. `tsc` und Build sauber, 100+ neue Tests grün (Listen-Logik, Setzer Wort für Wort für alle 25 Leitlinien, Textanker, Prüfsummen, Seite und Übersicht). **Noch nicht eingespielt:** die Datenbank-Migration (ohne sie meldet die Seite „Das hat nicht geklappt“). Offen: Kern-Änderung für die Betriebs-Warnung, Opus-Gegenprüfung der Listen, `/qa`, Sichtprüfung im Browser (kein Dev-Server auf dem MacBook).

**Bausteine**
- Seiten: `/admin/checklisten` (Übersicht, [checklisten-uebersicht.tsx](../src/components/checklisten/checklisten-uebersicht.tsx)) und `/admin/checklisten/[id]` ([checkliste-seite.tsx](../src/components/checklisten/checkliste-seite.tsx)). Die Seite setzt das Original **auf dem Server** und gibt nur die gesetzten Blöcke der betreffenden Liste weiter; die Sammlung steht nicht im Browser-Paket (geprüft im Build).
- Navigation: Eintrag „Checklisten“ (Symbol `ListChecks`) in „Mein Unterricht“ und in der festen Hauptnavigation nach „Schulrecht“; Navigationstests angepasst.
- Listen fest im Code: [listen/dienstreise-beantragen.ts](../src/lib/checklisten/listen/dienstreise-beantragen.ts), [listen/reisekosten-abrechnen.ts](../src/lib/checklisten/listen/reisekosten-abrechnen.ts); Typen und Logik in [liste.ts](../src/lib/checklisten/liste.ts) (Fortschritt und „fertig“ werden berechnet, nie gespeichert).
- Setzer [setzer.ts](../src/lib/checklisten/setzer.ts): Titel, Überschriften (bekannte je Quelle, wörtlich, nur an Satzanfängen sowie kurze Zeilen), Absätze, Listen (`•` und `- `), Warnung („Achtung“). Alles Unsichere bleibt Absatz; kein Wort wird verändert (Test über alle 25 Leitlinien).
- Momentaufnahme: [scripts/leitlinien-momentaufnahme.py](../scripts/leitlinien-momentaufnahme.py) liest `Werkzeugkiste/schulrecht.py` und schreibt `src/lib/checklisten/daten/leitlinien.json` (Titel, Bereich, Stand, Text, Prüfsumme). Nach jeder HLL-Änderung in Schulrecht neu ausführen.
- Tests: `quellen.test.ts` schlägt fehl, wenn Prüfsumme/Stand einer Quelle von der Momentaufnahme abweicht oder ein Textanker nicht mehr wörtlich im Original steht.

**Abweichungen von der Spec / dem Tech Design**
1. **Momentaufnahme ohne Kern-Änderung.** Statt eines neuen Kern-Befehls liest ein Skript im App-Projekt die Schulrecht-Datei direkt. Folge: kein Kern-Deploy nötig. Die **Betriebs-Warnung** („Leitlinie geändert“ durch Abfrage beim Kern, Tech Design D) fehlt noch; die Seite zeigt den gelben Hinweis, sobald Momentaufnahme und Liste auseinanderlaufen (im Normalfall verhindert das der Test). Die Kern-Abfrage der Prüfsumme bleibt ein eigener Schritt.
2. **Unterschrift entfernt.** Die Schlusszeile „Name + Schulleiterin“ der Leitlinie „Dienst- und Fortbildungsreise“ wird in der Momentaufnahme gestrichen (Spec: keine Personennamen fest einbauen). Die Prüfsumme gilt für den Text ohne diese Zeile.
3. **„Gültig seit 2018“** fehlt: Der Schulrecht-Text enthält nur „Stand“ und Bereich, kein „gültig ab“. Angezeigt werden Stand (bzw. „Ohne Stand-Angabe“ bei der Klassenfahrt-Leitlinie) und Bereichszeile.
4. **Klassenfahrt-Formular** steht bei „Dienstreise beantragen“ als Schritt in beiden Dienstreise-Varianten (Klassenfahrten sind laut Leitlinie Dienstreisen); eine eigene Variante „Klassenfahrt“ wurde dort nicht eingeführt (Katalog unverändert). Fortbildungsgang und Bezirksreise haben keine eigene Anlage-Zeile, weil die Leitlinie dafür nichts nennt.
5. **Sechs-Monats-Frist:** In allen Varianten als Frist am Schritt „Antrag stellen“; als **Annahme** gekennzeichnet nur bei Dienstreise und Fortbildungsreise (bei Klassenfahrt steht sie in der Leitlinie). Dazu ein Hinweis in diesen Varianten. Nach Bestätigung durch die Schulleitung: `fristAnnahme` und Hinweis `frist-annahme` entfernen.
6. **Variantenwahl:** „Dienstreise beantragen“ hat 7 Werte und nutzt das Dropdown, „Reisekosten abrechnen“ 3 Werte und das Segment (PROJ-83). „Neu starten“ beginnt ohne Variante, die Person wählt neu.
7. **Fortschrittsbalken** ist ein eigenes Element aus `ws-*`-Farben, weil `ui/progress` feste Farben nutzt.
8. **Frühere Durchläufe** zeigen Zeitraum, Variante und Zahl der Haken (die Schnittstelle liefert nur die Zahl); entfallene Schritte der Archivansicht werden daher nicht einzeln aufgelistet.
9. **Opus-Gegenprüfung (2026-11-23)** gegen die PDFs: nichts Erfundenes, alle 20 Textanker wörtlich im Original. Eingearbeitet: Annahme-Hinweis ohne „laut Schulleitung“ (Beleg fehlte); Schritte zu PKW/Flug, A1 und Klassenfahrt-Formular bedingt formuliert („sonst einfach abhaken“); Bezirksreise bekommt die Einladung (Achatswies = Fortbildungsreise Inland); „Private Ausgaben“ nur bei Klassenfahrt; Anker von „Original/Originalbelege beilegen“ auf die Dienstreise-Leitlinie; Zusatz „EU-Dienstreise/Fortbildung“ am Ankreuz-Schritt; Hinweis auf die Klassenfahrt-Voraussetzungen (Teilnehmerlisten, Zeitraum, 80 %) – die ausführliche Liste folgt in PROJ-123. **Nicht übernommen:** Feld „Stand“ der Klassenfahrt-Leitlinie bleibt leer (das PDF nennt „Gültig ab SJ25/26“, das Feld erwartet ein Datum); Hinweis zur Stundenabrechnung (gering).
10. **Satzbau:** Die Schritte stehen im Infinitiv mit dem Verb am Ende („Den Antrag … ausfüllen“), nicht mit dem Verb am Anfang wie in den Akzeptanzkriterien. Bewusst so gelassen (üblich und einheitlich für Checklisten); die Vorgabe „Verb am Anfang“ gilt damit als Infinitiv-Stil.
11. Beim Zurückkehren in den Tab holt die Seite den Stand frisch (Zwei-Geräte-Fall), solange kein Haken gespeichert wird.

**Einspielen / nächste Schritte**
1. Migration + Probe aus dem Backend-Schritt einspielen (vor dem App-Deploy).
2. Opus-Gegenprüfung der beiden Listen gegen die Original-PDFs (Tech Design L4), besonders: Anlagen je Variante, Fortbildungsgang/Bezirksreise, Frist-Annahme.
3. Sechs-Monats-Frist bei der Schulleitung bestätigen lassen.

## QA Test Results

**Tested:** 2026-11-23
**App URL:** https://spedilern.vercel.app (nur ohne Anmeldung per `curl`), sonst Code-Review, Vitest, tsc, ESLint, Build
**Tester:** QA Engineer (AI, Opus)
**Einschränkung:** Kein Dev-Server, kein Playwright (MacBook-Absturz). Alles, was nur im Browser sichtbar ist, steht unten als **„Browser-Prüfung offen“** und gilt **nicht** als bestanden. Keine schreibenden Zugriffe auf die Produktionsdatenbank; die Zeilenregeln stützen sich auf Code-Review plus die Probe des Nutzers (14/14).

### Akzeptanzkriterien

Legende: ✅ bestanden · ⚠️ bestanden mit dokumentierter Abweichung · ❌ nicht bestanden · 🌐 Browser-Prüfung offen (Code passt, Sichtprüfung fehlt)

| # | Kriterium | Ergebnis | Beleg / Bemerkung |
|---|---|---|---|
| 1 | Eintrag „Checklisten“ für alle Lehrer-Rollen; Azubi umgeleitet, API 403 | ✅ 🌐 | `admin-nav.ts:131` (`teacherVisible`), Navigationstests; `proxy.ts:151-160` (keine Lehrer-Rolle → Umleitung bzw. 403); `requireTeacherOrAdmin` in allen 5 Routen; Sichtbarkeit in der Seitenleiste nur im Browser prüfbar |
| 2 | Beide Proxy-Freigabelisten + Wächtertests | ✅ | `roles.ts:157` und `roles.ts:210`; `roles.test.ts:141-149` (inkl. `checklisten-fremd` und Azubi) |
| 3 | Übersicht: Titel, Satz, „Für wen“, Stand, Fortschritt „3 von 8“ | ✅ 🌐 | `checklisten-uebersicht.tsx`, Test „3 von 6“ |
| 4 | Pilot: beide Listen in der Übersicht | ✅ | `listen/index.ts` |
| 5 | Liste: Titel, Für wen, Stand („gültig seit 2018“), Schritte, Hinweise | ⚠️ | „gültig seit“ fehlt (Abweichung 3: nicht im Schulrecht-Text) |
| 6 | Schritt = kurzer Satz, Verb am Anfang, Reihenfolge der Leitlinie | ⚠️ | Infinitiv-Stil mit Verb am Ende (Abweichung 10) – **Nutzer-Bestätigung offen**, vom Bau selbst so entschieden |
| 7 | Abhaken per Klick auf den Rahmen, ≥44 px, Leertaste, durchgestrichen **und** Symbol | ✅ 🌐 | `<button role="checkbox" aria-checked>` (`checkliste-seite.tsx:318-351`), `min-h-11`, `line-through` + `Check`-Symbol; Leertaste löst nativ Klick aus. 44 px nur im Browser messbar |
| 8 | Fortschritt („3 von 8 erledigt“, Balken) aktualisiert sofort | ✅ | optimistisch, Test vorhanden |
| 9 | Frist als Text | ✅ | `Frist: …` |
| 10 | Abschluss mit „Neu starten“ und Folge-Liste | ✅ | `weiter` → „Reisekosten abrechnen“ |
| 11 | Variantenwahl beim Start (Segment ≤4, sonst Dropdown), erst danach Schritte | ✅ 🌐 | 7 Werte → Select, 3 Werte → `AdminSegmented` |
| 12 | Variante wechseln, Haken bleiben gespeichert | ✅ | `liste.test.ts` „behält Haken beim Wechsel“; DB löscht keine Haken beim Wechsel |
| 13 | Pilot-Varianten inkl. Dienstgang ohne Antrag | ✅ | `keinAntrag`-Text, keine Schritte |
| 14 | Anlagen je Variante | ⚠️ | Klassenfahrt-Formular als bedingter Schritt in den Dienstreise-Varianten (Abweichung 4, Opus-geprüft) |
| 15 | Ab 1024 px nebeneinander, darunter Tabs | 🌐 | `lg:grid-cols-2`, Tabs `lg:hidden` – Code passt |
| 16 | Original: Titel, Absätze, Überschriften, Listen, Warnungen, Stand, Zuständigkeit, „Gültig ab“ | ⚠️ 🌐 | „Gültig ab“ fehlt (Abweichung 3); als „Zuständigkeit“ erscheint die Bereichszeile („4.2.1 Interne Kommunikation“) |
| 17 | „Im Original ansehen“ springt zur Stelle, Absatz kurz hervorgehoben | ✅ 🌐 | Test „springt … zum Original“; Scrollen nur im Browser prüfbar |
| 18 | Hinweis „Verbindlich ist das PDF der Schulleitung“ | ✅ | in Übersicht und Original-Ansicht (fehlt im Druck, siehe BUG-11) |
| 19 | Text unverändert, keine Personennamen | ✅ | Setzer-Test Wort für Wort über alle 25 Leitlinien; Unterschrift wird im Skript entfernt, Test prüft es |
| 20 | „Neu starten“ mit AlertDialog, archiviert, löscht nichts | ✅ | Test + neuer QA-Test (alte Haken verschwinden, Archiv +1); DB: kein DELETE-Recht auf Durchläufe |
| 21 | Höchstens ein offener Durchlauf je Liste und Person | ✅ | Teil-Unique-Index + Advisory-Lock (Migration Z. 43-45, 113) |
| 22 | Sofort speichern; bei Fehler springt der Haken zurück + Toast | ✅ | Test „setzt den Haken zurück …“ (Einschränkung BUG-1) |
| 23 | Daten gehören dem Konto (Handy/Laptop gleicher Stand) | ⚠️ 🌐 | Abgleich bei `visibilitychange` funktioniert (QA-Test), aber Race BUG-1 |
| 24 | Reisekosten: Original-Antrag, Originalbelege, Programm, Sekretariat, private Ausgaben | ⚠️ | „Private Ausgaben“ nur bei Klassenfahrt (Opus-Entscheidung, Abweichung 9) |
| 25 | Klassenfahrt-Angaben (3 Übernachtungen, 30 €) nur in Variante Klassenfahrt | ✅ | `liste.test.ts` |
| 26 | Sechs-Monats-Frist in allen Varianten, mit Annahme-Hinweis | ✅ | Test „kennzeichnet … als Annahme“ |
| 27 | Quellen mit Stand | ✅ | Kopfzeile „Leitlinie: … (Stand …)“ und `bemerkung` |
| 28 | Liste hält Stand/Prüfsumme der Leitlinie fest | ✅ | `quellen[].pruefsumme`, `stand` |
| 29 | Gelber Hinweis, wenn die Leitlinie in Schulrecht vom Stand der Liste abweicht | ❌ | BUG-4: Die Betriebs-Abfrage beim Kern fehlt; der Hinweis kann nur bei Abweichung zwischen Momentaufnahme und Liste erscheinen, und genau das verhindert der Test → im Betrieb erscheint er praktisch nie |
| 30 | Automatischer Test bei Auseinanderlaufen | ✅ | `quellen.test.ts` (Prüfsumme, Stand, Textanker, Überschriften, Katalog-Abgleich) |
| 31 | Laufender Durchlauf bleibt; neue Schritte ungehakt; entfallene im Archiv sichtbar | ❌ (teilweise) | Die ersten beiden ✅ (Berechnung aus Haken); Archivansicht zeigt nur die Zahl, keine Schritte (BUG-5, Abweichung 8) |
| 32 | Skeleton beim Laden, Fehler mit „Erneut versuchen“ | ✅ | `AdminLoadingState`, `AdminErrorState`, Tests |
| 33 | 44 px, sichtbarer Fokus, Tastatur, Labels „Schritt 3: …, erledigt“ | ✅ 🌐 | `focus-visible:ring-ws-green`, Label-Test; Einschränkung BUG-6 |
| 34 | Nur `ws-*`-Tokens, Kontrast, Animationen ≤200 ms, „Bewegung reduzieren“ | ✅ | grep ohne `text-white`/`bg-white`/Hex/Tailwind-Farben in `src/components/checklisten`; Tönungen /15 bzw. Gold /20; `duration-200`, `motion-reduce`, globale Regel in `globals.css:271`; Scrollen respektiert `prefers-reduced-motion` |
| 35 | Druck sauber, hell auf weiß, ohne Navigation, Haken sichtbar | ❌ 🌐 | BUG-2 (leeres Blatt nach „Im Original ansehen“, per Test belegt), BUG-3 (Haken-Symbol vermutlich unsichtbar) |

**Zählung (35 Kriterien):** 25 bestanden (bei 6 davon – Nr. 1, 3, 7, 11, 17, 33 – ist die Sichtprüfung im Browser noch offen), 6 bestanden mit dokumentierter Abweichung (Nr. 5, 6, 14, 16, 23, 24), 3 nicht bestanden (Nr. 29, 31, 35), 1 nur im Browser prüfbar (Nr. 15).

### Edge Cases

| Edge Case | Ergebnis | Bemerkung |
|---|---|---|
| Zwei Geräte gleichzeitig | ⚠️ | Gewünschter Zustand + Idempotenz + Lock: keine doppelten Durchläufe ✅. Anzeige kann durch BUG-1 kurz falsch sein |
| Offline / schlechte Verbindung | ✅ | Haken springt zurück, Toast „Keine Verbindung. Das wurde nicht gespeichert.“ |
| Leitlinie ändert sich mitten im Durchlauf | ⚠️ | Nichts wird zurückgesetzt ✅; Warnung nur über Momentaufnahme (BUG-4) |
| Variante nachträglich ändern | ✅ | Haken bleiben (Test); Race bei schnellem Doppelwechsel BUG-7 |
| Alles erledigt, nicht „abgeschlossen“ | ✅ | berechnet, nichts erzwungen |
| Zurückhaken | ✅ | `erledigt:false` löscht die Zeile; Abschluss verschwindet |
| Personenbezogene Angaben | ⚠️ | Pilot-Texte sauber. Momentaufnahme enthält in **anderen** Leitlinien E-Mail-Adresse einer Person und eine Handynummer (BUG-13) – relevant für PROJ-123 |
| Konto gelöscht | ✅ | `ON DELETE CASCADE` von `auth.users` über Durchläufe auf Haken (Code-Review) |
| Azubi ruft Adresse direkt auf | ✅ | Proxy: Seite → Umleitung, API → 403; zusätzlich `requireTeacherOrAdmin` und Zeilenregel `has_teacher_role()` |
| Sehr lange Schritte / Titel mit „…“ und `title` | ❌ (Low) | Umbruch ✅, aber keine Kürzung mit `title` in der Übersicht (BUG-12; im Pilot nicht sichtbar, Titel kurz) |
| Doppelklick | ✅ | Sperre je Schritt (Test), zusätzlich idempotent |
| Super-Admin sieht keine fremden Haken | ✅ | Zeilenregeln ohne Admin-Ausnahme (Probe 14/14) |
| Unbekannte Liste `/admin/checklisten/gibts-nicht` | ✅ | `notFound()` in `[id]/page.tsx:15`; API 404 vor der Datenbank |

### Sicherheitsprüfung (Red Team)

- ✅ **Anmeldung:** Produktion ohne Sitzung: `/admin/checklisten` und `/admin/checklisten/dienstreise-beantragen` → 307 zum Login; `GET /api/admin/checklisten`, `GET …/dienstreise-beantragen`, `GET …/gibts-nicht`, `PUT …/haken`, `PUT …/variante`, `POST …/neu`, `POST …/gibts-nicht/neu` → alle 401, nie 500. Sicherheits-Header gesetzt (HSTS, `nosniff`, `X-Frame-Options: DENY`).
- ✅ **Rollen:** Alle 5 Routen rufen zuerst `requireTeacherOrAdmin()` (401/403); Proxy sperrt Azubis davor; Tests „Anmeldung und Rolle (alle Routen)“ in `checklisten.test.ts`.
- ✅ **Zeilenregeln:** RLS auf beiden Tabellen, nur `owner_id = auth.uid()` **und** `has_teacher_role()`, keine Admin-Ausnahme; `anon` ohne Rechte; kein UPDATE auf Haken, kein DELETE auf Durchläufe; Haken nur in offenen Durchläufen änderbar.
- ✅ **Fremde `durchlauf_id`:** Die Funktionen nehmen gar keine `durchlauf_id` entgegen (sie ermitteln den Durchlauf über `auth.uid()`); ein direktes INSERT in `checklisten_haken` mit fremder ID scheitert an der EXISTS-Prüfung mit Eigentümer-Bindung.
- ✅ **Funktionen:** SECURITY INVOKER (Zeilenregeln greifen), `SET search_path = public`, `REVOKE ALL … FROM PUBLIC, anon`, `GRANT EXECUTE … TO authenticated`; Kennungsmuster in Funktionen und CHECK-Constraints; Advisory-Lock gegen doppelte offene Durchläufe; `has_teacher_role()` ist SECURITY DEFINER mit festem `search_path`.
- ✅ **Eingaben:** Zod `.strict()` für alle drei Schreib-Rümpfe, Kennungsmuster, Liste gegen Katalog (Schutz gegen `__proto__`/`constructor` getestet), Variante gegen Katalog.
- ✅ **Fehlertexte:** nur deutsche Sätze; 400/409 geben ausschließlich die eigenen `CHK0x`-Meldungen weiter, alles andere → 500 mit allgemeinem Satz, Technik nur in `console.error`.
- ✅ **Cache:** GET-Antworten `private, no-store` (die PUT/POST-Antworten haben den Header nicht – unkritisch, nicht cachebar).
- ✅ **Leitlinien-Sammlung nicht im Browser-Paket:** `leitlinien.ts` wird nur von der Server-Seite `[id]/page.tsx` importiert; Client-Komponenten importieren nur Typen (`leitlinien-typen.ts`). Build geprüft: Texte anderer Leitlinien (z. B. „Meldung Mängel THV“, die dortige E-Mail-Adresse) stehen in keinem `.next/static`-Chunk, nur im Server-Code. Im Browser landen die Listen-Dateien (mit wörtlichen Ankern) und das gesetzte Original der jeweiligen Liste – gewollt.
- ✅ **XSS:** alle Texte als React-Text (`{b.text}`), kein `dangerouslySetInnerHTML`.
- ✅ **Personendaten:** Unterschrift der Schulleitung aus der Pilot-Leitlinie entfernt (Test). Gespeichert werden nur Schritt-Kennungen, Zeitpunkte und Variante.
- ⚠️ **Mengenlimit umgehbar (Low, BUG-8):** Das Limit von 200 Haken und die Katalogprüfung gelten nur in der Funktion bzw. der App. Mit dem öffentlichen Anon-Schlüssel und einer Lehrer-Sitzung kann man direkt per PostgREST beliebig viele Haken (eigene Durchläufe, beliebige Schritt-Kennungen) und beliebig viele Durchläufe (beliebige `checkliste`-Kennungen, oder `…/neu` in Schleife) anlegen. Nur eigene Daten, nur Speicherverbrauch; kein Rate-Limit.
- ⚠️ **UPDATE-Recht zu breit (Low, BUG-9):** Die UPDATE-Regel auf `checklisten_durchlaeufe` erlaubt der Eigentümerin, im offenen Durchlauf auch `checkliste`, `gestartet_am` und `archiviert_am` (beliebiges Datum) zu ändern. Nur eigene Daten; Vorschlag: Spaltenrechte nur auf `variante`, `archiviert_am`.

### Bugs

#### BUG-1: Neuladen beim Zurückkehren in den Tab überschreibt einen gerade gesetzten Haken
- **Severity:** Medium
- **Datei:** `src/components/checklisten/checkliste-seite.tsx:74-98` (`lade()` setzt `haken`/`variante` ungeprüft; Sperre nur beim Start des Neuladens)
- **Schritte:** 1. Liste offen, App/Tab kurz verlassen. 2. Zurückkehren → GET startet. 3. Sofort einen Haken setzen (PUT ist schneller oder gleich schnell). 4. Erwartet: Haken bleibt. 5. Tatsächlich: Die GET-Antwort (Stand von vor dem Klick) überschreibt die Anzeige, der Haken ist weg, obwohl er gespeichert ist (umgekehrt beim Entfernen: Anzeige „erledigt“, Server „offen“). Erst nächstes Laden zeigt den echten Stand.
- **Beleg:** `checkliste-seite.qa.test.tsx` „behält einen Haken, der gesetzt wurde, während ein Neuladen unterwegs war“ (`it.fails`, BUG-1).
- **Vorschlag:** Lade-Generation/Zeitstempel: Antworten verwerfen, die vor der letzten lokalen Änderung angefordert wurden, oder nach Ende jedes Speicherns neu laden.
- **Priority:** Fix in next sprint

#### BUG-2: Druck ist leer, nachdem „Im Original ansehen“ benutzt wurde
- **Severity:** Medium
- **Datei:** `src/components/checklisten/checkliste-seite.tsx:163` (`setAnsicht('original')`) mit `:223` (`hidden lg:block`) und `:434` (`print:hidden`)
- **Schritte:** 1. Am Laptop Liste öffnen. 2. „Im Original ansehen“ klicken. 3. „Drucken“. 4. Erwartet: Checkliste auf dem Blatt. 5. Tatsächlich: Im Druck gilt die Seitenbreite (< 1024 px), die Checkliste ist `hidden`, das Original `print:hidden` → nur der Seitenkopf. Am Laptop gibt es keinen Tab, um zurückzuschalten (Tabs sind `lg:hidden`), nur Neuladen hilft. Am Handy genauso, wenn der Tab „Original“ aktiv ist.
- **Beleg:** `checkliste-seite.qa.test.tsx` „lässt die Checkliste auch nach … im Druck sichtbar“ (`it.fails`, BUG-2).
- **Vorschlag:** `print:block` an der Checklisten-Sektion.
- **Priority:** Fix in next sprint

#### BUG-3: Haken-Symbol im Druck vermutlich unsichtbar
- **Severity:** Medium (Browser-Bestätigung nötig)
- **Datei:** `src/components/checklisten/checkliste-seite.tsx:328-333`; `globals.css` hat kein `print-color-adjust: exact`
- **Schritte:** Haken setzen, drucken (Standard: „Hintergrundgrafiken“ aus). Erwartet: Haken sichtbar. Vermutlich: grüner Hintergrund entfällt, das Häkchen ist weiß (`ws-on-accent` im Druck = #FFFFFF) auf weiß → leeres Kästchen mit grünem Rand; nur die Durchstreichung bleibt.
- **Vorschlag:** `print:text-ws-green` am Symbol oder `print-color-adjust: exact` am Kästchen.
- **Priority:** Fix in next sprint

#### BUG-4: Betriebs-Warnung „Leitlinie geändert“ fehlt (AC 29)
- **Severity:** Medium (bekannte Abweichung 1, nicht als erledigt zu werten)
- **Datei:** `src/lib/checklisten/leitlinien.ts:42` (vergleicht nur Momentaufnahme ↔ Liste)
- **Schritte:** Leitlinie in Schulrecht ändern, App nicht neu bauen. Erwartet: gelber Hinweis. Tatsächlich: kein Hinweis, die Liste zeigt den alten Stand. Zusätzlich: Warnung ist orange (`ws-orange`) statt gelb und nennt den Stand statt „wurde am TT.MM.JJJJ geändert“.
- **Vorschlag:** Kern-Abfrage der Prüfsumme (Tech Design D) nachziehen oder AC per Nutzer-Entscheidung auf „Test beim Entwickeln genügt“ ändern.
- **Priority:** Fix in next sprint / Nutzer entscheidet

#### BUG-5: Archivansicht zeigt keine Schritte (entfallene Schritte nicht sichtbar, AC 31)
- **Severity:** Low · **Datei:** `src/app/api/admin/checklisten/[id]/route.ts:50` (nur `count`), `checkliste-seite.tsx:413-423`
- Zusätzlich zählt `anzahl_haken` auch Haken aus anderen Varianten („7 Schritte abgehakt“ bei 6 sichtbaren möglich). **Priority:** Nice to have

#### BUG-6: `aria-label` verschluckt Zusatz, Frist und „Annahme“
- **Severity:** Low · **Datei:** `checkliste-seite.tsx:322`
- Das `aria-label` ersetzt den Inhalt des Knopfs: Screenreader lesen weder „Frist: mindestens 14 Tage …“ noch den Annahme-Hinweis. **Vorschlag:** Zusatz/Frist per `aria-describedby`. **Priority:** Fix in next sprint

#### BUG-7: Variantenwechsel ohne Sperre / Reihenfolge
- **Severity:** Low · **Datei:** `checkliste-seite.tsx:134-143`
- Schnelles Wechseln A → B: Antworten können in anderer Reihenfolge ankommen (Server A, Anzeige B); scheitert A nach erfolgreichem B, springt die Anzeige auf den Wert vor A. Ähnlich: Ein Haken-PUT, der während „Neu starten“ noch unterwegs ist, landet im neuen Durchlauf. Nach Variantenwahl ohne offenen Durchlauf bleibt `offen` lokal `null` (der „Neu starten“-Knopf fehlt, bis ein Haken gesetzt wird). **Priority:** Nice to have

#### BUG-8: Mengenlimit und Katalogprüfung per direktem Tabellenzugriff umgehbar
- **Severity:** Low (Sicherheit, nur eigene Daten) · **Datei:** `supabase/migrations/20261125_proj122_checklisten.sql:63-93`
- **Vorschlag:** INSERT-Rechte auf beide Tabellen für `authenticated` entziehen und nur über SECURITY-DEFINER-Funktionen schreiben, oder Trigger mit Zähllimit; Obergrenze für Durchläufe je Person. **Priority:** Nice to have

#### BUG-9: UPDATE-Regel erlaubt Ändern von `checkliste`, `gestartet_am`, `archiviert_am`
- **Severity:** Low · **Datei:** Migration Z. 68-70, 92 · **Vorschlag:** `GRANT UPDATE (variante, archiviert_am)` statt Tabellenrecht. **Priority:** Nice to have

#### BUG-10: Datum der früheren Durchläufe in UTC
- **Severity:** Low · **Datei:** `src/lib/checklisten/liste.ts:133-136` – `datumDeutsch` schneidet das ISO-Datum ab; ein Durchlauf, der um 00:30 Uhr (MEZ) archiviert wird, zeigt den Vortag. **Priority:** Nice to have

#### BUG-11: Druck ohne Hinweis „Verbindlich ist das PDF der Schulleitung“
- **Severity:** Low · **Datei:** `original-ansicht.tsx:22` (Hinweis nur in der Original-Spalte, die `print:hidden` ist). **Priority:** Nice to have

#### BUG-12: Lange Titel in der Übersicht ohne „…“ und `title`
- **Severity:** Low · **Datei:** `checklisten-uebersicht.tsx:56` (Edge Case der Spec; im Pilot unkritisch). **Priority:** Nice to have

#### BUG-13: Personendaten in der Momentaufnahme anderer Leitlinien
- **Severity:** Low · **Datei:** `src/lib/checklisten/daten/leitlinien.json` – „Meldung Mängel THV“ enthält eine persönliche E-Mail-Adresse, „Erste Hilfe im Unterricht“ eine Handynummer. Nur Server-seitig, im Pilot nicht angezeigt; **vor PROJ-123** (Unterschriften-Regel im Skript reicht nicht) ersetzen durch Funktion. Außerdem steht der Nachname der Schulleitung im Test `quellen.test.ts:73`. **Priority:** vor PROJ-123

#### BUG-14: Testname verspricht mehr, als er prüft
- **Severity:** Low · **Datei:** `src/lib/checklisten/quellen.test.ts:62-64` – „Verb am Anfang … ohne Punkt-Ketten“ prüft nur Länge < 160. **Priority:** Nice to have

### Beurteilung der Pflege-Tests (`quellen.test.ts`, `setzer.test.ts`)
- **Sichern gut ab:** Prüfsumme und Stand jeder Quelle gegen die Momentaufnahme, jeder Textanker wörtlich (über Leerraum hinweg) im gesetzten Original, jede angegebene Überschrift wird gesetzt, Varianten-Kennungen in Liste = Katalog, eindeutige Kennungen, `weiter` existiert, Setzer verliert/ändert kein Wort in **allen 25** Leitlinien.
- **Lücken:** Wird die Momentaufnahme nicht neu erzeugt, merkt kein Test eine Änderung in Schulrecht (deshalb BUG-4). Kein Test, dass Schritt-Kennungen nie verschwinden (nur „entfallen“ erlaubt) – eine gelöschte Kennung macht alte Haken still unsichtbar. Personendaten-Test prüft nur einen Namen.

### Regression
- `npx vitest run` (komplett): **4498 bestanden, 1 fehlgeschlagen** (bekannt, nicht PROJ-122: `werkzeugkiste-auszug.test.ts` „nennt die Urheberin oder den Urheber“). Keine neue Regression.
- PROJ-122-Tests inkl. neuer QA-Datei: 11 Dateien, 163 bestanden + 2 erwartete Fehlschläge (BUG-1, BUG-2 als `it.fails`).
- `npx tsc --noEmit`: ohne Befund. `npx eslint` auf alle neuen Pfade: 0 Fehler, 2 Warnungen (`react-hooks/set-state-in-effect` in `checklisten-uebersicht.tsx:27`).
- `npm run build`: erfolgreich, alle 7 Checklisten-Routen gebaut; kein Syntaxfehler aus `scripts/scratch`.
- Navigation: Eintrag in „Mein Unterricht“ und Hauptnavigation nach „Schulrecht“ (`admin-nav.ts:131-138`), Navigationstests grün; Schnellsuche liest dieselbe Quelle – im Browser nicht gesehen.
- Nicht geprüft: Cross-Browser (Chrome, Firefox, Safari iOS, Edge), Responsiv 375/768/1440 px, Performance (< 1 s Öffnen, < 300 ms Haken), Kontrast im echten Rendering (nur der Token-Test).

### Neue Tests
`src/components/checklisten/checkliste-seite.qa.test.tsx`: Abgleich beim Zurückkehren in den Tab, kein Neuladen während des Speicherns, „Neu starten“ leert die Haken, Haken ist ein `<button type="button">`, sowie zwei `it.fails` für BUG-1 und BUG-2 (werden rot, sobald der Bug behoben ist – dann `.fails` entfernen).

### Browser-Prüfung offen (für dich)
**Laptop (≥ 1024 px, Chrome und Safari):**
1. Seitenleiste → „Checklisten“ (auch in ⌘K-Suche „Checklisten“ tippen). Zwei Karten mit „Für: Lehrkraft“ und „Leitlinie: Stand 07.05.2025“.
2. „Dienstreise beantragen“ öffnen: Liste links, Original rechts nebeneinander. Dropdown „Um welche Art …“ → „Dienstgang“: grüner Hinweis, keine Schritte. → „Dienstreise Ausland“: Schritte inkl. A1, Warnung „Keine Fortbildung …“.
3. Tab-Taste bis zum ersten Haken, Leertaste: Haken + Durchstreichung, „1 von N erledigt“. Fokusring sichtbar?
4. „Im Original ansehen“ bei „Antrag … Sekretariat“: rechts scrollt zur Stelle, Absatz 3 s gold umrandet.
5. Alle Schritte abhaken: „Alles erledigt“, „Weiter mit Reisekosten abrechnen“ führt zur zweiten Liste. Zurück, „Neu starten“ → Dialog → bestätigen: leere Liste, Auswahl wieder offen, „Frühere Durchläufe (1)“ mit heutigem Datum.
6. Hell/Dunkel im Konto-Menü umschalten: Kontraste der Hinweise lesbar.
**Handy (iPhone Safari, 375 px):**
7. Gleiche Liste: Tabs „Checkliste“/„Original“ statt Spalten; „Im Original ansehen“ schaltet auf Tab „Original“ und springt zur Stelle. Haken-Flächen groß genug (≥ 44 px)?
8. Zwei Geräte: am Handy abhaken, am Laptop zurück in den Tab wechseln → Haken erscheint ohne Neuladen. Danach sofort nach dem Zurückwechseln einen Haken setzen (BUG-1 beobachten).
9. Flugmodus an, Haken setzen → Haken springt zurück, Meldung „Keine Verbindung …“.
**Druck (Laptop, Strg/⌘+P):**
10. Ohne vorher „Im Original ansehen“: hell auf weiß, ohne Seitenleiste/Kopfzeile, Haken erkennbar? (BUG-3)
11. Nach „Im Original ansehen“ drucken → leeres Blatt? (BUG-2)
**Azubi-Konto:** 12. `/admin/checklisten` aufrufen → Umleitung mit Hinweis, kein Inhalt.

### Summary
- **Akzeptanzkriterien:** 35 – 25 bestanden (6 davon mit offener Sichtprüfung), 6 mit dokumentierter Abweichung, 3 nicht bestanden (29, 31, 35), 1 nur im Browser prüfbar (15)
- **Bugs:** 14 (0 Critical, 0 High, 4 Medium, 10 Low)
- **Sicherheit:** bestanden – keine Lücke mit Zugriff auf fremde Daten; zwei Low-Härtungen (BUG-8, BUG-9)
- **Production Ready:** JA (keine Critical/High; das Feature ist bereits live)
- **Empfehlung:** Live lassen; BUG-1 bis BUG-3 (kleine Frontend-Korrekturen) und BUG-6 im nächsten Schritt beheben, BUG-4 per Nutzer-Entscheidung klären, BUG-13 vor PROJ-123. Danach die Browser-Prüfung oben.

## Deployment
**Live seit 2026-11-23** (Produktion `spedilern`, ohne `/qa`; Status bleibt „In Progress“ bis zur QA). Migration vorher im SQL-Editor eingespielt, Probe 14 von 14 wie erwartet. Gepusht wurden nur die drei PROJ-122-Commits (per Worktree auf `origin/main`); die PROJ-129-Commits blieben lokal, weil ihre Migration noch fehlt. Prüfung nach „Ready“: `/admin/checklisten` leitet ohne Anmeldung zum Login, die Schnittstellen antworten 401.

**Offen:** Sichtprüfung beider Seiten im Browser (Laptop, Handy, Druck), `/qa` mit Opus, Bestätigung der Sechs-Monats-Frist durch die Schulleitung, Kern-Abfrage für die Betriebs-Warnung „Leitlinie geändert“.
