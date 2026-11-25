# PROJ-109: Baukasten – Externe Einbettung (Kahoot, LearningApps, YouTube …) mit Zwei-Klick-Lösung

## Status: Approved
**Created:** 2026-11-16
**Last Updated:** 2026-11-25

## Idee in einem Satz
Ein Block „Einbetten“ nimmt einen Link zu Kahoot, LearningApps, YouTube, Padlet und ähnlichen Angeboten auf. In der Seite zeigt er zuerst eine Karte mit Datenschutz-Hinweis, Link und QR-Code, und erst nach einem Klick lädt das eingebettete Fenster.

Teil der Reihe „Baukasten direkt“, Übersicht und Leitbild in PROJ-101.

## Kontext
- Das Kahoot-Werkzeug (PROJ-54) liefert eine Excel-Datei für kahoot.com, kein einbettbares Spiel. Ein Kahoot wird live per PIN oder als Selbstlern-Challenge-Link gespielt. Eine Einbettung im Fenster unterstützt Kahoot nur eingeschränkt, deshalb ist Link + QR-Code der verlässliche Weg.
- Die Seite ist eine eigenständige HTML-Datei, die offline läuft. Eingebettete Inhalte brauchen Internet und laden Daten von Fremdanbietern (Schüler sind minderjährig: DSGVO).

## Entscheidungen (Nutzer, 2026-11-16)
- **E1 – Zwei-Klick-Lösung:** Zuerst eine Karte mit Hinweis „Lädt Inhalte von kahoot.com“. Geladen wird erst nach Klick. Dazu immer Link und QR-Code (auch für den Druck).

## Vorschläge (bitte beim Review bestätigen)
- **V1 – Erlaubte Anbieter (Liste):** YouTube (über `youtube-nocookie.com`), Vimeo, LearningApps, Kahoot (Link/Challenge), Padlet, Mentimeter, H5P.com/Lumi, GeoGebra, Google Forms, Microsoft Forms, ein selbst gehostetes Moodle. Andere Links werden nur als Karte mit Link/QR angezeigt, nie eingebettet.
- **V2 – „Für diese Seite merken“:** Der Klick auf „Laden“ gilt nur für diesen Block und diesen Besuch. Eine Option „Inhalte von youtube.com auf dieser Seite immer laden“ wird im Browser des Schülers gemerkt.

## Dependencies
- Requires: PROJ-101 (Block-Leiste, Leerzustände), PROJ-90 (Katalog)
- Berührt: Kern (`seite.py`: neuer Baustein „Einbetten“, QR-Code-Erzeugung offline, Content-Security der Seite), PROJ-67 (öffentlicher Link läuft in einer Sandbox, Einbettungen müssen dort funktionieren), PROJ-110 (Quiz-Show als Offline-Alternative zu Kahoot)

## User Stories
- Als **Lehrkraft** möchte ich mein Kahoot oder eine LearningApp per Link in die Seite einbauen, damit Schüler nicht suchen müssen.
- Als **Lehrkraft** möchte ich ein YouTube-Video an der passenden Stelle zeigen.
- Als **Lehrkraft** möchte ich sicher sein, dass ohne Zustimmung keine Daten an Fremdanbieter gehen.
- Als **Schüler** möchte ich mit dem Handy den QR-Code scannen, wenn ich die Seite ausgedruckt vor mir habe.
- Als **Schüler offline** möchte ich verstehen, warum der Inhalt nicht lädt, und den Link für später haben.

## Acceptance Criteria

### Anlegen
- [ ] Der Katalog hat „Einbetten (Video, Kahoot, LearningApps …)“. Ein neuer Block zeigt ein Feld „Link einfügen“.
- [ ] Nach dem Einfügen erkennt der Editor den Anbieter und zeigt dessen Namen und Symbol (eigene Darstellung, kein Laden vom Anbieter). Ein Titel wird vorgeschlagen und ist änderbar.
- [ ] Bei Anbietern auf der Liste (V1) wählt die Lehrkraft „Einbetten (nach Klick)“ oder „Nur Link und QR-Code“. Bei allen anderen gibt es nur „Link und QR-Code“, mit Hinweis.
- [ ] Optional: Arbeitsauftrag über der Karte (direkt getippt, PROJ-103), bei YouTube Startzeit und Endzeit.
- [ ] Ungültige Links (kein `https://`, `javascript:`, IP-Adressen, lokale Adressen) werden abgelehnt: „Dieser Link kann nicht eingebettet werden.“
- [ ] Ein YouTube-Link wird automatisch auf die datensparsame Variante umgestellt.

### Schüler-Ansicht
- [ ] Die Karte zeigt: Titel, Anbieter, Hinweis „Beim Laden werden Daten an <anbieter.de> übertragen.“, Knopf „Inhalt laden“, Link „In neuem Tab öffnen“ und einen QR-Code.
- [ ] Erst nach Klick auf „Inhalt laden“ wird das Fenster geladen (höchstmögliche Einschränkungen, Seitenverhältnis passend zum Anbieter).
- [ ] Ohne Internet zeigt die Karte „Für diesen Inhalt brauchst du Internet.“, und Link und QR-Code bleiben.
- [ ] Der QR-Code ist in der Datei enthalten (funktioniert offline) und groß genug zum Scannen (mindestens 3 cm im Druck).
- [ ] Druck: Karte mit Titel, Link als Text und QR-Code, ohne Fenster.
- [ ] Die Einbettung zählt nicht in den Fortschritt der Seite (nicht prüfbar).

### Editor
- [ ] In der Editor-Vorschau lädt nichts von außen, bis die Lehrkraft im Modus Ausprobieren „Inhalt laden“ klickt.
- [ ] Die Prüfstelle meldet Einbettungen ohne Titel oder mit nicht erreichbarem Link als Hinweis (sperrt nicht).

## Edge Cases
- **Kahoot-Live-PIN:** Eine PIN ist kein Link. Das Feld erkennt eine 6- bis 7-stellige Zahl und bietet „Kahoot-PIN anzeigen“ an (große Anzeige, Link zu kahoot.it). Hinweis: Die PIN gilt nur für das laufende Spiel.
- **Anbieter verbietet Einbettung** (Fenster bleibt leer): Nach dem Laden erscheint „Wird hier nicht angezeigt? In neuem Tab öffnen“ dauerhaft unter dem Fenster.
- **Sehr lange Links:** QR-Code bleibt lesbar (Fehlerkorrektur angepasst). Ab einer kritischen Länge Hinweis an die Lehrkraft, einen kürzeren Link zu nehmen.
- **Öffentlicher Link (PROJ-67, Sandbox):** Einbettungen und „In neuem Tab öffnen“ funktionieren dort ebenfalls.
- **Link ändert sich später / Inhalt gelöscht:** Die Seite zeigt, was der Anbieter liefert. Die Prüfstelle prüft beim Veröffentlichen.

## Nicht Teil dieses Features
- Eigene Kahoot-Spiele erzeugen oder hochladen (Kahoot-API).
- Offline-Spiel im Kahoot-Stil (PROJ-110).

## Technical Requirements
- Sicherheit: Nur `https`-Links. Eingebettetes Fenster mit minimalen Rechten. Kein Laden vor dem Klick, auch keine Vorschaubilder vom Anbieter.
- Datenschutz: Text des Hinweises vor dem Bau mit der Schule abstimmen (Formulierung für Minderjährige).

## Offene Punkte für `/architecture`
- QR-Code-Erzeugung im Kern (offline, ohne Fremdbibliothek zur Laufzeit).
- Verträgt sich die Content-Security der Seite und der Sandbox des öffentlichen Links mit eingebetteten Fenstern der Liste?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Stand:** 2026-11-25, Entscheidungen E2–E4 vom Nutzer am selben Tag.

### Weitere Entscheidungen (Nutzer, 2026-11-25)
- **E2 – Sandbox:** Läuft die Seite abgeschottet (öffentlicher Link, Editor-Vorschau), erkennt sie das selbst und zeigt **„In neuem Tab öffnen“ als Hauptknopf**. Eingebettet wird nur dort, wo die Seite normal läuft (heruntergeladene Datei, Moodle, Regal-Ansicht außerhalb der Sandbox).
- **E3 – Neue Tabs im öffentlichen Link:** Die Sandbox bekommt zusätzlich das Recht, neue Tabs zu öffnen, und diese Tabs laufen ohne Sperre. Das behebt nebenbei einen **bestehenden Fehler**: Der Link im Block „Interaktives Video“ ließ sich im öffentlichen Link bisher gar nicht öffnen. Die Seite selbst kommt weiterhin nicht an Cookies, Speicher oder Schnittstellen der App.
- **E4 – V1 und V2 übernommen:** Anbieterliste wie vorgeschlagen. „Inhalte von <anbieter> auf dieser Seite immer laden“ merkt sich der Browser des Schülers je Anbieter. In der Sandbox geht das nicht (kein Speicher), dort fragt die Seite jedes Mal.

### Warum die Sandbox den Ablauf bestimmt
Die Seite läuft an drei Orten mit unterschiedlichen Rechten:

| Ort | Einbetten möglich? | Hauptknopf |
|---|---|---|
| Heruntergeladene Datei, Moodle, LMS | ja | „Inhalt laden“ (Zwei-Klick) |
| Öffentlicher Link `/s/…` (PROJ-67) | eher nicht (Fenster erbt die Sperre) | „In neuem Tab öffnen“ |
| Editor-Vorschau (Baukasten) | eher nicht (gleiche Sperre) | „In neuem Tab öffnen“ |

Ein eingebettetes Fenster erbt die Sperre der Seite um es herum. YouTube, LearningApps usw. funktionieren ohne eigene Herkunft und Speicher meist nicht. Bestätigen kann das nur ein Browser-Test. Die Sperre zu lockern ist keine Option (Nutzer-Entscheidung PROJ-67). Deshalb erkennt die Seite die Sandbox selbst, wie sie es beim Lernfortschritt schon tut.

### A) Bausteine

```
Baukasten (App)
+-- Katalog: neuer Eintrag „Einbetten (Video, Kahoot, LearningApps …)“  (Nr. 34)
+-- Formular „Einbetten“ (Schublade, gleiche Leiste wie alle Blöcke, PROJ-118)
|   +-- Feld „Link einfügen“
|   |   +-- erkennt den Anbieter -> Name + Symbol (Lucide, keine Logos)
|   |   +-- erkennt eine Kahoot-PIN (6–7 Ziffern) -> „Kahoot-PIN anzeigen“
|   |   +-- lehnt ungültige Links ab: „Dieser Link kann nicht eingebettet werden.“
|   +-- Titel (vorgeschlagen, änderbar)
|   +-- Darstellung (Segment): „Einbetten (nach Klick)“ | „Nur Link und QR-Code“
|   |   (nur bei Anbietern der Liste; sonst fester Hinweis „nur Link und QR-Code“)
|   +-- bei YouTube/Vimeo: Startzeit, Endzeit
|   +-- Arbeitsauftrag (optional, direkt getippt wie Lehrtext, PROJ-103)
|   +-- Hinweis bei sehr langem Link: „Nimm einen kürzeren Link, sonst wird der QR-Code schwer lesbar.“
+-- Prüfstelle (Hinweise, sperren nicht)
    +-- „Einbettung ohne Titel“
    +-- „Link nicht erreichbar“ (nur bei Anbietern der Liste geprüft)

Seite (Kern, fertige HTML-Datei)
+-- Einbett-Karte
    +-- Titel, Anbieter, Arbeitsauftrag
    +-- Hinweis „Beim Laden werden Daten an <anbieter> übertragen.“
    +-- Hauptknopf: „Inhalt laden“ ODER (Sandbox / nur Link) „In neuem Tab öffnen“
    +-- Kästchen „Inhalte von <anbieter> auf dieser Seite immer laden“ (nicht in der Sandbox)
    +-- Link „In neuem Tab öffnen“ + QR-Code (in der Datei enthalten)
    +-- nach dem Laden: Fenster im passenden Seitenverhältnis
    |   + Zeile „Wird hier nicht angezeigt? In neuem Tab öffnen“ (bleibt dauerhaft)
    +-- ohne Internet: „Für diesen Inhalt brauchst du Internet.“ (Link + QR bleiben)
    +-- Kahoot-PIN-Variante: große PIN, Link zu kahoot.it, Hinweis „gilt nur für das laufende Spiel“
    +-- Druck: Titel, Link als Text, QR-Code (≥ 3,5 cm), kein Fenster
```

Die Karte zählt nicht zum Fortschritt (keine prüfbare Aufgabe).

### B) Daten

Keine neue Tabelle und keine Migration. Der Block liegt wie alle Blöcke im Seiteninhalt des Materials und hat diese Angaben:
- Link, so wie die Lehrkraft ihn eingefügt hat
- Art: Link oder Kahoot-PIN
- Titel
- Darstellung: einbetten oder nur Link/QR
- Startzeit/Endzeit (nur Video)
- Arbeitsauftrag (Text wie im Lehrtext)

**Anbieterliste, eine Quelle:** Eine kleine Liste (Anbieter, Name, erlaubte Adressen, Seitenverhältnis, nötige Fenster-Rechte, Symbol) liegt als Datei in der App, und eine Kopie davon liegt im Kern. Ein Test im Kern vergleicht beide, so wie bei den Katalog-Beispielen (PROJ-90). Die Adresse des Schul-Moodle wird als fester Eintrag nachgetragen, sobald der Nutzer sie nennt.

Im Browser des Schülers wird nur „Anbieter X immer laden“ gemerkt (je Seite, wie der Lernfortschritt).

### C) Technische Entscheidungen

1. **Das Fenster lädt nie den Link der Lehrkraft direkt.** Der Kern liest aus dem Link nur das Nötige (z. B. die Video-Kennung) und baut daraus die Einbett-Adresse des Anbieters neu, bei YouTube immer über `youtube-nocookie.com`. Was sich nicht eindeutig zuordnen lässt, wird nie eingebettet, sondern nur als Link/QR angezeigt. *Warum:* So landet keine fremde oder manipulierte Adresse im Fenster.
2. **Doppelte Prüfung:** Der Editor prüft beim Tippen (schnelle Rückmeldung). Der Kern prüft beim Bauen der Seite noch einmal, und nur seine Prüfung zählt. Abgelehnt werden: kein `https`, `javascript:`/`data:`, IP-Adressen, `localhost` und lokale Namen. *Warum:* Seiteninhalte können auch aus der Rohfassung oder aus der KI kommen.
3. **Fenster mit wenig Rechten:** Jeder Anbieter bekommt nur die Rechte aus seinem Listeneintrag (Skripte; Formulare nur bei Google/Microsoft Forms; Vollbild nur bei Video), keine Kamera, kein Mikrofon, kein Autoplay, keine Weitergabe der Seitenadresse über den Ursprung hinaus. Vor dem Klick steht nichts im Fenster, und es werden keine Vorschaubilder geladen.
4. **QR-Code im Kern beim Bauen der Seite:** Der Kern erzeugt den QR-Code als SVG mit der kleinen Python-Bibliothek **segno** (reines Python, ohne weitere Abhängigkeiten, feste Version wie alle Kern-Bibliotheken) und legt ihn direkt in die HTML-Datei. Die Seite braucht dafür zur Laufzeit nichts, und der Code funktioniert offline und im Druck. Die Fehlerkorrektur ist bei kurzen Links hoch und wird bei langen Links abgesenkt. Ab etwa 300 Zeichen erscheint der Hinweis an die Lehrkraft. *Warum segno statt selbst geschrieben:* QR-Codes sind fehleranfällig, segno ist erprobt und winzig.
5. **Sandbox-Erkennung in der Seite:** Das Seitenskript erkennt, dass es abgeschottet läuft (keine eigene Herkunft, kein Speicher), und schaltet die Karte auf „In neuem Tab öffnen“ um (E2). Die Editor-Vorschau ist damit automatisch sicher: Vor einem Klick lädt nichts von außen.
6. **Rechte der Sandboxen (E3):**
   - Öffentlicher Link: Die Sandbox darf neue Tabs öffnen, die ohne Sperre laufen. Fenster bleiben verboten. Nichts lädt in der Seite selbst nach, also gilt die bisherige Regel weiter.
   - Editor-Vorschau: dieselben zwei Rechte, damit „In neuem Tab öffnen“ beim Ausprobieren geht.
7. **Offline-Erkennung:** Die Seite prüft beim Klick, ob der Browser online ist. Zusätzlich gilt eine Zeitgrenze: Lädt das Fenster nicht, erscheint der Internet-Hinweis. Link und QR-Code bleiben immer sichtbar.
8. **„Link nicht erreichbar“ nur bei bekannten Anbietern:** Die Prüfstelle fragt nur bei Adressen der Anbieterliste nach, ob der Inhalt existiert. Andere Links werden nicht abgerufen. *Warum:* Wenn der Server beliebige Adressen aufruft, kann man ihn missbrauchen, um interne Adressen auszuspähen. Die Prüfung läuft über eine kleine App-Schnittstelle nur für Lehrkräfte. Sie muss in **beide Freigabelisten** in `roles.ts` (Wächter-Tests vorhanden).
9. **Text des Datenschutz-Hinweises an einer Stelle:** Die Formulierung steht als ein Text im Kern und lässt sich nach Abstimmung mit der Schule ohne Umbau ändern. **Vor dem Livegang abstimmen** (Technical Requirements).
10. **Bekannte Stolperstelle:** YouTube zeigt seit 2025 bei Aufrufen ohne Herkunftsangabe einen Fehler, z. B. aus einer lokal geöffneten Datei (`file://`). Abhilfe ist die dauerhafte Zeile „Wird hier nicht angezeigt? In neuem Tab öffnen“. Im Browser-Test eigens prüfen.

### D) Bauabschnitte

1. **Kern:** Baustein „Einbetten“ in `seite.py` (Karte, Fenster nach Klick, Sandbox-/Offline-Erkennung, Druck, Kahoot-PIN), Anbieterliste + Adress-Neubau, QR-Code mit segno, Tests (gefährliche Links, Neubau je Anbieter, QR im Druck, kein Fenster vor dem Klick, Listenvergleich).
2. **App:** Katalog-Eintrag, Formular mit Anbieter-Erkennung, Prüfstellen-Hinweise + Erreichbarkeits-Schnittstelle, Sandbox-Rechte für öffentlichen Link und Editor-Vorschau (Tests in `werkzeugkiste-links.test.ts` anpassen).
3. **Browser-Test durch den Nutzer** (kein Dev-Server): heruntergeladene Datei, Moodle, öffentlicher Link, Handy-QR vom Ausdruck.

Deploy wie immer: **Kern zuerst**, dann die App (aus der Kopie, keine fremden Dateien mitnehmen).

### E) Abhängigkeiten
- **Kern:** `segno` (QR-Codes als SVG, feste Version in `requirements.txt`)
- **App:** keine neuen Pakete

### Offene Punkte vor dem Bau
- Adresse des Schul-Moodle für die Anbieterliste.
- Datenschutz-Text mit der Schule abstimmen (kann parallel zum Bau laufen, muss vor dem Livegang fertig sein).

## Implementation Notes (Frontend, 2026-11-25)

**Gebaut (App-Seite):**
- `src/lib/werkzeugkiste-einbettung.ts` (+ Test): Anbieterliste, Linkprüfung (nur https, keine IP/lokalen Namen/Zugangsdaten), Anbieter- und Kahoot-PIN-Erkennung, Zeitangaben, Titelvorschlag.
- `editor-formulare-einbetten.tsx` (+ Test): Formular mit Link, Titel, Darstellung, Start-/Endzeit, Arbeitsauftrag, Hinweisen.
- Katalog-Eintrag `einbetten` (36 Einträge), Beispiel-JSON, Symbol, Skizze, Prüfstellen-Übersetzung „Einbettung ohne Titel“.
- Sandbox-Rechte (E3): öffentlicher Link und Editor-Vorschau erlauben neue Tabs (`allow-popups`, `allow-popups-to-escape-sandbox`), weiter ohne `allow-same-origin`.

**Feldnamen des Blocks (der Kern muss dieselben lesen):** `type: einbetten`, `url`, `titel`, `darstellung` (`einbetten` | `link`), `start`, `ende` (Text, z. B. „1:30“), `description` (Arbeitsauftrag).

**Abweichungen:**
- Anbieterliste ohne Moodle (zurückgestellt, Nutzer 2026-11-25).
- Kahoot und Google/Microsoft Forms starten mit „Nur Link und QR-Code“, alle anderen mit „Einbetten“. `forms.gle` (Kurzlink) ist nur Link/QR.
- Arbeitsauftrag ist ein Formularfeld, noch kein direktes Tippen in der Seite (PROJ-103).

**Offen:**
- Kern: Baustein `einbetten` in `seite.py` samt QR-Code (segno), Anbieterliste, Sandbox-Erkennung, Druck. Der Test „stimmt mit den Bausteinen des Kerns überein“ (`werkzeugkiste-katalog.test.ts`) ist bis dahin rot.
- App: Schnittstelle „Link erreichbar?“ (beide Freigabelisten in `roles.ts`), Livegang erst nach Datenschutz-Text.
- Im Test `baukasten-editor.test.tsx` schlug „ohne Zugriff …“ (403, 5,6-s-Wartezeit) in meinem Lauf fehl. Er berührt den neuen Block nicht, ob er schon vorher unter Last wackelte, ist nicht geprüft.

## Implementation Notes (Backend, 2026-11-25)

**Kern** (Repo Werkzeugkiste, Zweig `vercel-kern`, noch nicht deployt):
- Neues Modul `einbett_block.py` (Name bewusst nicht `einbettung.py`: Das gehört der Schulrecht-Suche). Linkprüfung, Anbieterliste (Kopie der App-Liste, Vergleichstest), Neuaufbau der Einbett-Adresse (YouTube immer `youtube-nocookie.com`), QR-Code per `segno==1.6.6` als SVG in der Datei, Datenschutz-Texte an einer Stelle (Konstanten oben im Modul).
- `seite.py`: Baustein `einbetten` (nicht prüfbar), CSS, Druckregeln (QR 3,8 cm, kein Fenster), Laufzeit. Vor dem Klick gibt es kein `<iframe>`, kein Bild und keinen Abruf; die Einbett-Adresse steht nur als Datenattribut. Abgeschottet läuft die Seite, wenn `localStorage` nicht zugänglich ist; dann ist „In neuem Tab öffnen“ der Hauptknopf (E2). „Immer laden“ je Anbieter im Browser (V2, nur außerhalb der Sandbox). Fenster mit minimalen Rechten, `allow-forms` nur bei Google/Microsoft Forms. Nach dem Laden bleibt die Zeile „Wird hier nicht angezeigt? In neuem Tab öffnen“. Internet-Hinweis bei fehlender Verbindung oder nach 10 s ohne Laden.
- `qualitaet.py`: Befund „Einbettung ohne Titel“ (Tipp), Typ als nur-Seite und passiv.
- Tests: `kern_einbettung_test.py` (24). Angepasst: `prompt_seite_test.py` (KI schreibt keine `einbetten`-Blöcke, sie darf keine Links erfinden), `kern_vorschau_marken_test.py` (Prüfsumme der veröffentlichten Seite neu gesetzt, nur Ergänzungen).

**App:**
- `POST /api/admin/werkzeugkiste/einbettung/pruefen` (Lehrkraft/Admin, Präfix steht schon in `roles.ts`, deshalb kein Eintrag nötig): prüft nur Anbieter der Liste, folgt keinen Weiterleitungen, 4-s-Grenze, höchstens 10 Links, eigene Rate-Limit-Klasse „teuer“.
- Beim Veröffentlichen hängt der Editor Hinweise „Link nicht erreichbar“ an die Prüfstelle an (sperrt nie; Fehler der Prüfung werden verschluckt).
- Tests: `werkzeugkiste-einbettung-server.test.ts` (Status-Einordnung, kein Abruf bei Fremden, Befunde mit Stelle).

**Abweichungen / Hinweise:**
- „Link nicht erreichbar“ erkennt nur eindeutig Totes (404, 410, 5xx, Namen nicht auflösbar). 401/403/429 und Zeitüberschreitung zählen als „nicht geprüft“. YouTube liefert auch für gelöschte Videos 200, das wird nicht erkannt.
- Das Fenster lädt nach Klick mit `referrerpolicy=strict-origin-when-cross-origin`. Ob YouTube aus einer lokal geöffneten Datei (`file://`) ohne Fehler spielt, ist im Browser zu prüfen (Design Nr. 10).

**Vor dem Livegang:** Kern zuerst deployen (`vercel deploy --prod`, aus der Kopie ohne fremde Dateien), dann die App. Datenschutz-Text mit der Schule abstimmen. Browser-Test durch den Nutzer: heruntergeladene Datei, öffentlicher Link (Sandbox), Handy-Scan des QR-Codes vom Ausdruck.

## QA Test Results (2026-11-25)

**Tester:** QA Engineer (AI), Code-Prüfung ohne Dev-Server und ohne Playwright (der MacBook stürzt sonst ab). Browser, Handy-Scan und Moodle prüft der Nutzer.

**Automatisch:** `npm test` 349 Dateien, 4712 Tests grün (auch „stimmt mit den Bausteinen des Kerns überein“). Kern: `kern_einbettung_test` 24, `prompt_seite_test` 10, `kern_vorschau_marken_test` 9 grün. `tsc` und ESLint ohne Fehler. Zusätzlich Stichproben direkt gegen `einbett_block.py` (Adressbau je Anbieter, Escaping, Täuschungs-Hosts wie `youtube.com.evil.com`).

### Acceptance Criteria

| Kriterium | Ergebnis |
|---|---|
| Katalog-Eintrag, Feld „Link einfügen“ | ✅ per Test |
| Anbieter erkannt, Name + Symbol, Titelvorschlag änderbar | ⚠️ Name und Titel ja; ein eigenes Symbol je Anbieter gibt es nicht, nur ein allgemeines (BUG-6) |
| Wahl „Einbetten (nach Klick)“ / „Nur Link und QR-Code“, sonst nur Link mit Hinweis | ✅ |
| Arbeitsauftrag, Start-/Endzeit bei Video | ✅ (Arbeitsauftrag als Formularfeld, Abweichung dokumentiert) |
| Ungültige Links abgelehnt (kein https, `javascript:`, IP, lokal) | ✅ App und Kern; Kern prüft zusätzlich per `ipaddress` |
| YouTube auf `youtube-nocookie.com` | ✅ Kern baut `/embed/<ID>` neu, Playlist-Teile fallen weg |
| Karte: Titel, Anbieter, Datenschutz-Hinweis, „Inhalt laden“, Link, QR | ✅ (Hinweis-Text bei YouTube ungenau, BUG-2) |
| Fenster erst nach Klick, wenig Rechte, Seitenverhältnis | ✅ vor dem Klick kein `<iframe>`, nur Datenattribut; keine Kamera/Mikrofon/Autoplay |
| Offline-Hinweis, Link + QR bleiben | ✅ im Code (`navigator.onLine` + 10 s); Browser-Test offen |
| QR in der Datei, ≥ 3 cm im Druck | ✅ segno-SVG, 3,8 cm |
| Druck: Titel, Link als Text, QR, kein Fenster | ✅ Druckregeln |
| Zählt nicht zum Fortschritt | ✅ keine Lösung, im Kern passiv |
| Editor-Vorschau lädt nichts von außen | ✅ Sandbox ohne Speicher → nur „In neuem Tab öffnen“ |
| Prüfstelle: ohne Titel / Link nicht erreichbar (sperrt nicht) | ✅ Titel im Kern; Erreichbarkeit beim Veröffentlichen |

**Edge Cases:** Kahoot-PIN ✅ · Anbieter verbietet Einbettung → Zeile „Wird hier nicht angezeigt?“ ✅ · lange Links (Fehlerkorrektur L, Hinweis ab 300 Zeichen) ✅ · öffentlicher Link (`allow-popups-to-escape-sandbox`, Links mit `noopener`) ✅ im Code, Browser-Test offen · gelöschter Inhalt: nur 404/410/5xx erkannt, YouTube nicht (dokumentiert).

### Security Audit
- ✅ Schnittstelle `einbettung/pruefen` nur für Lehrkräfte/Admins, Eingabe per Zod begrenzt (10 Links, 2000 Zeichen), Rate-Limit „teuer“.
- ✅ Kein SSRF: Abruf nur bei Hosts der Liste, keine Weiterleitungen, 4 s, Inhalt wird nicht gelesen.
- ✅ XSS: Titel, Link, Arbeitsauftrag werden im Kern maskiert (Probe mit `"><script>` und `<b>`).
- ✅ Einbett-Adresse aus geprüften Teilen neu gebaut, nie der Link direkt; `allow-same-origin` nur im Anbieter-Fenster, nie in den Sandboxen der App.
- ℹ️ Die Sandbox des öffentlichen Links darf jetzt Tabs ohne Sperre öffnen (E3, so entschieden). Eine Seite kann damit beliebige Adressen in einem neuen Tab öffnen, was sie über Links ohnehin schon konnte. Kein Befund.

### Bugs Found

#### BUG-1: „Immer laden“ gilt für alle Seiten, nicht nur für diese (Medium)
- Schlüssel ist `einb-immer-<anbieter>` ohne Seitenbezug. Der Fortschritt dagegen nutzt `seite-<titel>`.
- Schritte: Seite A (Moodle oder lokale Datei) → Haken „Inhalte von youtube-nocookie.com auf dieser Seite immer laden“ → Seite B auf derselben Adresse öffnen.
- Erwartet: Seite B fragt erneut. Tatsächlich: Seite B lädt YouTube sofort, ohne Klick. Der Text auf dem Kästchen verspricht etwas anderes (Datenschutz, Minderjährige).
- Dazu: „Eingaben löschen“ setzt den Haken nicht zurück.
- **Priorität:** vor dem Livegang beheben (Schlüssel an `SPEICHER` hängen, beim Zurücksetzen mitlöschen).

#### BUG-2: Datenschutz-Hinweis bei YouTube nennt den falschen Empfänger (Medium)
- Anzeige-Host ist `youtube-nocookie.com`. „In neuem Tab öffnen“ und der QR-Code führen aber auf `youtube.com`/`youtu.be`. In der Sandbox und bei „Nur Link“ steht dann „Beim Öffnen werden Daten an youtube-nocookie.com übertragen.“, der Tab geht aber zu youtube.com.
- **Priorität:** vor dem Livegang, zusammen mit dem Datenschutz-Text der Schule.

#### BUG-3: Padlet, Mentimeter, Google Forms bekommen keine echte Einbett-Adresse (Medium, Browser-Test entscheidet)
- Für diese Anbieter setzt der Kern den Link der Lehrkraft (bereinigt) ins Fenster, z. B. `padlet.com/lehrer/abc123` statt `padlet.com/embed/…`, Google Forms ohne `?embedded=true`. Viele Anbieter verbieten das Einbetten normaler Seiten, dann bleibt das Fenster leer (die Zeile „In neuem Tab öffnen“ fängt das auf).
- **Priorität:** beim Browser-Test je Anbieter prüfen; was leer bleibt, Adress-Neubau ergänzen oder auf „nur Link“ setzen.

#### BUG-4: App und Kern prüfen Links unterschiedlich streng (Low)
- Umlaut-Domain (`https://bücher.de/x`) oder Leerzeichen im Link: Der Editor nimmt den Link an („nicht auf der Liste, Link und QR-Code“). Der Kern lehnt ihn ab, und der Block fehlt in der Schülerseite ganz (nur eine Warnung im Bau).
- Ähnlich: `https://www.youtube.com/` ohne Video zeigt im Editor „Erkannt: YouTube … Einbetten“, der Kern fällt still auf „nur Link“ zurück.
- **Priorität:** nächster Durchgang.

#### BUG-5: Erreichbarkeitsprüfung verlängert das Veröffentlichen, Schnittstelle unbenutzt (Low)
- Die Prüfung läuft nach der Kern-Prüfung statt parallel dazu (bis zu 4 s mehr).
- `POST /api/admin/werkzeugkiste/einbettung/pruefen` wird von keiner Stelle der App aufgerufen. Sie ist abgesichert, aber im Moment toter Code.
- **Priorität:** nice to have.

#### BUG-6: Kein Symbol je Anbieter im Formular (Low)
- Das Kriterium nennt „Name und Symbol“. Das Formular zeigt immer dasselbe `ExternalLink`-Symbol.
- **Priorität:** nice to have.

### Nicht geprüft (Browser-Test durch den Nutzer)
Chrome/Firefox/Safari, 375/768/1440 px, heruntergeladene Datei (`file://`, YouTube-Fehler 153?), Moodle, öffentlicher Link, Handy-Scan vom Ausdruck, Offline-Hinweis.

### Summary
- **Acceptance Criteria:** 13/14 erfüllt, 1 teilweise (Symbol)
- **Bugs:** 6 (0 Critical, 0 High, 3 Medium, 3 Low)
- **Security:** bestanden
- **Production Ready:** JA im Sinne der Regel (keine Critical/High). **Empfehlung:** BUG-1 und BUG-2 vor dem Livegang beheben (beide betreffen den Datenschutz-Text, der ohnehin noch abgestimmt wird), BUG-3 im Browser-Test klären. Kern zuerst deployen.

## Deployment
_To be added by /deploy_
