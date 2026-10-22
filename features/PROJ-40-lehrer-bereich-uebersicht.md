# PROJ-40: Lehrkräfte-Bereich übersichtlicher (Startseite & gruppierte Navigation)

## Status: In Review
**Created:** 2026-10-22
**Last Updated:** 2026-10-22

## Dependencies
- Requires: PROJ-9 (Admin Content Management Panel) – bestehender Admin-Bereich
- Requires: PROJ-24 (Fachbereichs-Admins & Rechtetrennung) – Rollen `admin` und `department_admin`
- Requires: PROJ-29 (Bereichs-Umschalter für den Super-Admin) – Umschalter bleibt erhalten

## Ausgangslage
Der Admin-Bereich hat 10 Tabs (Super-Admin: 11) in einer horizontal scrollbaren Leiste. Auf dem Handy sind nur 2–3 sichtbar, alles steht gleichrangig nebeneinander, und `/admin` leitet direkt auf die Fragenliste um. Einige Begriffe (z. B. „Audit-Log“) sind für Lehrkräfte nicht selbsterklärend.

## Abgrenzung
- Es ändert sich **nur Navigation, Startseite und Beschriftung**. Keine Seite bekommt neue Funktionen, keine Datenbankänderung.
- Alle bestehenden URLs unter `/admin/...` bleiben unverändert.
- Neue Lehrkräfte-Tools (Klassen-Lernstand, Aufgaben zuweisen usw.) sind **nicht** Teil dieses Features, bekommen aber später einen Platz in der Navigation.

## Gruppierung der Navigation

| Gruppe | Einträge (bisheriger Name → neuer Name) |
|--------|------------------------------------------|
| **Unterricht** | Leistungsnachweise · Fragen · Nutzer |
| **Inhalte** | Fächer · Themen · Prüfungssets (→ Prüfungssimulation) · KI-Generator (→ Fragen aus Material) |
| **Einstellungen** | Fachbereich · Shop-Items (bleibt bereichsabhängig, z. B. „Hof-Items“) · Audit-Log (→ Änderungsprotokoll) · Fachbereiche (nur Super-Admin) |

Die neuen Namen sind Vorschläge und werden bei der Abnahme der Spec bestätigt.

## User Stories
- Als Lehrkraft möchte ich nach dem Öffnen des Admin-Bereichs eine Startseite mit den wichtigsten Aufgaben sehen, damit ich nicht erst suchen muss.
- Als Lehrkraft möchte ich die Bereiche nach Zweck gruppiert sehen (Unterricht, Inhalte, Einstellungen), damit ich Alltägliches von Einrichtung unterscheiden kann.
- Als Lehrkraft am Smartphone möchte ich über ein Menü alle Bereiche erreichen, ohne seitlich wischen zu müssen.
- Als Lehrkraft möchte ich verständliche Bezeichnungen, damit ich keine Entwicklerbegriffe interpretieren muss.
- Als Fachbereichs-Admin möchte ich nur Bereiche sehen, die ich nutzen darf, damit die Oberfläche nicht überladen ist.
- Als Super-Admin möchte ich weiterhin den Bereichs-Umschalter und den Bereich „Fachbereiche“ erreichen.

## Acceptance Criteria

### Startseite
- [ ] `/admin` zeigt eine Startseite statt Weiterleitung auf `/admin/questions`.
- [ ] Die Startseite zeigt große Kacheln für die Hauptaufgaben (mindestens: Leistungsnachweise, Fragen, Nutzer, Fragen aus Material erstellen), jeweils mit Icon, Titel und einem Satz Beschreibung.
- [ ] Jede Kachel führt zur passenden Unterseite, Kacheln sind mindestens 44 px hoch (Touch-Ziel).
- [ ] Die Startseite zeigt keine Kennzahlen und löst keine zusätzlichen Datenbankabfragen aus.
- [ ] Die Startseite begrüßt die Lehrkraft mit Namen (Fallback: E-Mail, wie in der Kopfzeile).

### Navigation Desktop
- [ ] Ab Tablet-/Desktop-Breite steht links eine feste Seitenleiste mit den drei Gruppen und deren Einträgen.
- [ ] Der aktive Eintrag ist klar hervorgehoben, auch auf Unterseiten (z. B. `/admin/leistungsnachweise/123`).
- [ ] Ein Eintrag „Übersicht“ führt zurück zur Startseite.
- [ ] Die bisherige Tab-Leiste entfällt.

### Navigation Mobil
- [ ] Unterhalb der Desktop-Breite zeigt die Kopfzeile einen Menü-Button, der ein seitliches Menü (Drawer) mit denselben Gruppen öffnet.
- [ ] Das Menü schließt sich nach Auswahl eines Eintrags und per Tippen außerhalb bzw. Schließen-Button.
- [ ] Es gibt kein horizontales Scrollen für die Navigation mehr.
- [ ] Kopfzeile zeigt auch mobil: Zurück zur App, aktuelle Seite bzw. „Admin“, und (Super-Admin) den Bereichs-Umschalter erreichbar.

### Rollen
- [ ] Fachbereichs-Admins sehen nicht den Eintrag „Fachbereiche“ und keine Kachel dazu (wie bisher).
- [ ] Nicht erlaubte Einträge werden ausgeblendet, nicht ausgegraut.
- [ ] Der serverseitige Schutz der Seiten bleibt unverändert (Ausblenden ersetzt keine Rechteprüfung).
- [ ] Der Bereichs-Umschalter (PROJ-29) ist für Super-Admins weiterhin sichtbar und funktioniert.

### Beschriftung & Kompatibilität
- [ ] Die Namen laut Tabelle oben werden in Navigation, Kacheln und Seitenüberschriften einheitlich verwendet.
- [ ] Der Eintrag für Shop-Items nutzt weiterhin den bereichsabhängigen Kurznamen (`hofShortName`).
- [ ] Alle bestehenden URLs unter `/admin/...` funktionieren unverändert; Lesezeichen bleiben gültig.
- [ ] Die Druckansichten der Leistungsnachweise (`/druck/einzeln`, `/druck/klasse`) zeigen weder Seitenleiste noch Kopfzeile (bisheriges Druckverhalten bleibt).
- [ ] Gestaltung gemäß `docs/DESIGN.md` (Dark Mode, `rounded-2xl`, Lucide-Icons, 200 ms Übergänge).

## Edge Cases
- **Sehr langer Anzeigename / E-Mail:** wird abgeschnitten, ohne die Kopfzeile zu sprengen.
- **Direkter Aufruf einer Unterseite ohne Berechtigung** (z. B. Fachbereichs-Admin öffnet `/admin/departments`): Verhalten wie bisher; die Navigation zeigt den Eintrag nicht an.
- **Bereichswechsel durch Super-Admin:** Navigation und Startseite bleiben stabil, nur der Name des Shop-Items-Eintrags passt sich dem Bereich an.
- **Drawer offen beim Drehen/Vergrößern des Geräts:** Beim Wechsel auf Desktop-Breite verschwindet der Drawer, die Seitenleiste erscheint, kein Zustandsfehler.
- **Druck:** Seitenleiste, Menü-Button und Kopfzeile sind im Druck ausgeblendet.
- **Tastatur/Screenreader:** Navigation ist per Tastatur bedienbar, aktiver Eintrag mit `aria-current`, Drawer mit Fokusfalle (wie shadcn `Sheet`).
- **Breite Tabellen auf Unterseiten** (Fragen, Nutzer): Die Seitenleiste darf den Inhalt nicht unbenutzbar verengen; die Inhaltsbreite bleibt auf Desktop ausreichend.

## Technical Requirements
- Performance: Startseite statisch renderbar, keine zusätzlichen Datenabfragen.
- Security: Keine Änderung der Rechteprüfung; Rollenfilter nur für die Anzeige.
- Browser Support: aktuelle Versionen von Chrome, Safari (iOS), Firefox.
- Vorhandene shadcn/ui-Bausteine nutzen (u. a. `Sheet`); keine eigenen Varianten bauen.
- Bestehende Tests der betroffenen Komponenten bleiben grün; neue Navigation bekommt Komponententests (Rollen-Filter, aktiver Eintrag).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Ergebnis in einem Satz:** Reines Oberflächen-Feature. Kein Backend, keine Datenbank, keine neuen API-Routen. Es ändern sich der gemeinsame Rahmen aller Admin-Seiten (Layout), die Navigation und die Startseite.

### A) Aufbau der Oberfläche

```
Admin-Rahmen (gemeinsames Layout, gilt für alle /admin-Seiten)
+-- Kopfzeile (oben, fest)
|   +-- Menü-Button (nur Handy/Tablet hochkant)
|   +-- Zurück zur App (Logo + App-Name)
|   +-- Titel "Admin"
|   +-- Bereichs-Umschalter (nur Super-Admin, bleibt wie er ist)
|   +-- Anzeigename der Lehrkraft
|
+-- Seitenleiste (nur Desktop/Tablet quer, links, fest)
|   +-- Eintrag "Übersicht" (Startseite)
|   +-- Gruppe "Unterricht"
|   |   +-- Leistungsnachweise · Fragen · Nutzer
|   +-- Gruppe "Inhalte"
|   |   +-- Fächer · Themen · Prüfungssimulation · Fragen aus Material
|   +-- Gruppe "Einstellungen"
|       +-- Fachbereich · Hof-/Reise-Items · Änderungsprotokoll
|       +-- Fachbereiche (nur Super-Admin)
|
+-- Menü-Drawer (Handy: gleiche Gruppen wie die Seitenleiste, gleitet von links ein)
|
+-- Inhaltsbereich (die jeweilige Admin-Seite, unverändert)

Startseite /admin
+-- Begrüßung mit Namen
+-- Kachel-Raster (1 Spalte Handy, 2 Spalten ab Tablet)
    +-- Kachel "Leistungsnachweise"
    +-- Kachel "Fragen"
    +-- Kachel "Nutzer"
    +-- Kachel "Fragen aus Material erstellen"
```

**Eine einzige Liste als Wahrheitsquelle:** Die Gruppen, Einträge, Namen, Icons und Rollen-Regeln stehen an genau einer Stelle. Seitenleiste, Drawer und (soweit passend) die Kacheln lesen alle daraus. So können Desktop und Handy nie auseinanderlaufen, und ein späteres neues Lehrkräfte-Tool braucht nur einen neuen Eintrag in dieser Liste.

### B) Datenmodell
Es werden **keine Daten gespeichert oder geändert**. Die Navigation ist feste Konfiguration im Programm. Genutzt werden nur Informationen, die schon geladen sind:
- Rolle der Lehrkraft (Super-Admin oder Fachbereichs-Admin), schon vorhanden
- Anzeigename bzw. E-Mail, schon in der Kopfzeile vorhanden
- Kurzname des Bereichs (z. B. „Hof“ bzw. „Reisebüro“) für den Shop-Items-Eintrag, schon vorhanden

### C) Technische Entscheidungen (und warum)
| Entscheidung | Begründung |
|---|---|
| **Seitenleiste am Desktop, Drawer am Handy** | Dieselbe Navigation, nur anders dargestellt. Am Handy wäre eine feste Leiste zu breit; am Desktop ist ein Drawer ein unnötiger Klick. |
| **Vorhandenen `Sheet`-Baustein für den Drawer** | Ist schon installiert (shadcn/ui) und bringt Tastatur-Bedienung, Fokus-Falle und Schließen per Tippen daneben mit. Laut Projektregel bauen wir keine eigene Variante. |
| **Navigation bleibt im gemeinsamen Layout** | Jede Admin-Seite bekommt sie automatisch; keine der 12 Seiten muss umgebaut werden. |
| **Alle URLs bleiben gleich** | Lesezeichen und Links in Anleitungen funktionieren weiter; keine Weiterleitungen nötig. |
| **Rollenfilter nur zur Anzeige** | Die echte Rechteprüfung bleibt serverseitig, wie sie ist. Ausblenden ist Komfort, kein Sicherheitsmechanismus. |
| **Startseite ohne Datenabfrage** | Lädt sofort, kostet nichts auf dem Free Tier und kann nicht „leer“ oder fehlerhaft sein. |
| **Druckansichten bleiben ohne Rahmen** | Das Layout blendet Kopfzeile und Seitenleiste im Druck bereits aus; das gilt auch für die neue Seitenleiste. |

### D) Betroffene Dateien
**Geändert:**
- Admin-Rahmen (Layout): Kopfzeile, Seitenleiste und Inhaltsbereich neu angeordnet
- Admin-Startseite: Weiterleitung entfällt, stattdessen Kachel-Seite
- Tab-Leiste: wird durch die neue Navigation ersetzt
- Überschriften der drei umbenannten Seiten (Änderungsprotokoll, Fragen aus Material, Prüfungssimulation)

**Neu:**
- Gemeinsame Navigations-Liste (Gruppen, Namen, Icons, Rollen)
- Seitenleiste, Mobil-Menü und Kachel-Raster als eigene kleine Bausteine
- Komponententests für Rollenfilter, aktiven Eintrag und Mobil-Menü

**Nicht betroffen:** Datenbank, alle API-Routen, die Inhalte der Admin-Seiten, die Schüler-Seiten.

### E) Zu beachten
- **Entscheidung (2026-10-22): Umbenennung überall angleichen.** „Prüfungssets“ wird in allen sichtbaren Texten zu „Prüfungssimulation“ (Navigation, Überschriften, Dialoge, Hinweise, Aria-Labels, Formulare wie „Startauswahl aus Prüfungsset“ im Leistungsnachweis-Dialog), ebenso „Audit-Log“ → „Änderungsprotokoll“ und „KI-Generator“ → „Fragen aus Material“. Nur sichtbare Texte, keine URLs, Datenbank- oder Code-Bezeichner. Aus Sicht der Spec zählt das zu den Beschriftungs-Kriterien.
- **Breite des Inhalts:** Die Seitenleiste nimmt auf dem Desktop etwa 240 px. Die breiten Tabellen (Fragen, Nutzer) behalten dadurch etwas weniger Platz. Die bisherige Maximalbreite wird deshalb nur noch für den Inhaltsbereich angewendet, nicht mehr fürs ganze Fenster.
- **Umschaltpunkt:** Seitenleiste ab Tablet-Querformat (ab ca. 1024 px), darunter Drawer. So bleibt es auch auf kleinen Laptops und Tablets nutzbar.
- **Testen ohne Dev-Server:** Wie bisher keine Browser-Tests lokal. Prüfung über Komponententests und Build.

### F) Pakete
Keine neuen. `Sheet` und Icons (Lucide) sind bereits installiert.

### G) Aufteilung der Arbeit
Nur `/frontend`. `/backend` entfällt, weil nichts auf dem Server oder in der Datenbank geändert wird.

## Implementation Notes (Frontend, 2026-10-22)
**Gebaut:**
- `src/lib/admin-nav.ts`: einzige Quelle für Gruppen, Einträge, Namen, Icons, Kachel-Auswahl und Rollenfilter (`adminNavGroupsFor`, `adminNavLabel`, `isAdminNavActive`).
- `src/components/admin/admin-nav.tsx`: gruppierte Navigation (Übersicht + 3 Gruppen), `aria-current` am aktiven Eintrag, 44-px-Zeilen.
- `src/components/admin/admin-shell.tsx`: Kopfzeile (feste Höhe), Seitenleiste ab 1024 px (`lg`), darunter Menü-Button + `Sheet` von links; im Druck ausgeblendet.
- `src/components/admin/admin-home.tsx` + `src/app/admin/page.tsx`: Startseite mit Begrüßung und 4 Kacheln (Leistungsnachweise, Fragen, Nutzer, Fragen aus Material), ohne Datenabfrage.
- `src/app/admin/layout.tsx`: nutzt `AdminShell`; `AdminRoleProvider` trägt zusätzlich `displayName` (optional).
- `admin-tabs.tsx` entfernt.
- Umbenennung in allen sichtbaren Texten: Prüfungssets → Prüfungssimulation (Admin-Seite, Dialoge, Aria-Labels, Leistungsnachweis-Dialog), Audit-Log → Änderungsprotokoll, KI-Generator → Fragen aus Material. Code-Kommentare und Bezeichner blieben unverändert.
- Tests: `admin-nav.test.ts` (6) und `admin-nav.test.tsx` (5): Gruppen, Rollenfilter, aktiver Eintrag, Menü schließt bei Auswahl, Kacheln.

**Abweichungen / Hinweise:**
- Die Seitenleiste ist ein schlichter `aside` aus Links, nicht der shadcn-`Sidebar`-Baustein (der bräuchte eigenen Provider und Theme-Variablen). Das Mobil-Menü nutzt `Sheet`, wie im Tech Design vorgesehen.
- Die Start-Kacheln sind in der Navigations-Liste per `tile: true` markiert; weitere Kacheln = ein Häkchen mehr.
- Inhaltsbreite: `max-w-7xl` gilt jetzt für Seitenleiste + Inhalt zusammen.

**Geprüft:** Vitest komplett grün (95 Dateien, 1052 Tests), ESLint ohne Fehler in den geänderten Dateien, `tsc` ohne Fehler unter `src/`. `npm run build` bricht lokal in der TypeScript-Phase an `scripts/scratch/` ab (lokaler, per `.gitignore` ausgeschlossener Ordner, nicht Teil dieses Features); der Compile-Schritt selbst war erfolgreich. Nicht im Browser geprüft (kein Dev-Server) – optische Abnahme (Seitenleiste, Menü, Kacheln) steht aus.

## QA Test Results

**Getestet:** 2026-10-22 · **Methode:** Code-Review gegen die Spec, Vitest (Komponenten), Regressionslauf. **Kein Browser-Test** (Dev-Server und Playwright laufen laut Projektabsprache nicht lokal); alle Punkte zu Optik und Responsive sind deshalb nur aus dem Code abgeleitet und **noch visuell abzunehmen**.

### Automatisierte Tests
- Vitest gesamt: 96 Dateien, 1055 Tests grün (14 neu für PROJ-40: `admin-nav.test.ts` 6, `admin-nav.test.tsx` 5, `admin-shell.test.tsx` 3).
- ESLint: keine Fehler in den neuen/geänderten Dateien. `tsc`: keine Fehler unter `src/`.
- Playwright: nicht ausgeführt. Die bestehenden E2E-Tests (PROJ-9/10/11) prüfen für `/admin` nur den Login-Redirect und nutzen weder Tabs noch Überschriften; sie sind von der Änderung nicht betroffen. Keine neuen E2E-Specs geschrieben, da sie hier nicht lauffähig geprüft werden können.

### Acceptance Criteria
| Bereich | Kriterium | Ergebnis |
|---|---|---|
| Startseite | `/admin` zeigt Startseite statt Weiterleitung | ✅ (Code + Test) |
| Startseite | Kacheln mit Icon, Titel, Beschreibung, richtige Ziele | ✅ Test prüft die vier Ziele |
| Startseite | Kacheln ≥ 44 px (`min-h-24`) | ✅ Code |
| Startseite | Keine Kennzahlen/Abfragen | ✅ Code (reiner Client-Baustein ohne fetch) |
| Startseite | Begrüßung mit Namen, Fallback E-Mail | ✅ Test (Name); Fallback im Layout (`display_name ?? email`) |
| Nav Desktop | Seitenleiste mit 3 Gruppen ab `lg` | ✅ Code/Test, optisch offen |
| Nav Desktop | Aktiver Eintrag auch auf Unterseiten | ✅ Test |
| Nav Desktop | Eintrag „Übersicht“; Tab-Leiste entfällt | ✅ |
| Nav Mobil | Menü-Button öffnet Drawer mit denselben Gruppen | ✅ Test |
| Nav Mobil | Drawer schließt nach Auswahl / außen / Schließen-Button | ✅ Auswahl getestet; außen/Button über Radix |
| Nav Mobil | Kein horizontales Scrollen der Navigation | ✅ Code |
| Nav Mobil | Kopfzeile: Zurück zur App, „Admin“, Umschalter erreichbar | ⚠️ siehe BUG-2 |
| Rollen | „Fachbereiche“ nur für Super-Admin, ausgeblendet statt ausgegraut | ✅ Test |
| Rollen | Serverschutz unverändert | ✅ Layout-Redirect und API-Prüfung unverändert |
| Rollen | Bereichs-Umschalter weiterhin sichtbar (nur Super-Admin) | ✅ Test |
| Beschriftung | Neue Namen einheitlich; Items-Eintrag mit Fachbereichs-Kurzname | ✅ Test + Suche (nur noch Code-Kommentare mit altem Begriff) |
| Kompatibilität | Alle URLs unverändert | ✅ |
| Kompatibilität | Druckansichten ohne Seitenleiste/Kopfzeile | ✅ Code (`print:hidden`); ⚠️ BUG-3 |
| Design | Dark Mode, `rounded-2xl`, Lucide, 200 ms | ✅ Code |

**Ergebnis: 17 von 19 Kriterien bestanden, 2 mit Einschränkung (BUG-2, BUG-3). Optische Abnahme steht aus.**

### Edge Cases
- Langer Anzeigename: ✅ `truncate` (Startseite und Kopfzeile).
- Direktaufruf ohne Berechtigung: ✅ Verhalten wie bisher (Seite `/admin/departments` ist clientseitig, die API verweigert Nicht-Super-Admins mit 403).
- Bereichswechsel: ✅ Navigation stabil, nur der Items-Name hängt am Fachbereich.
- **Drawer offen beim Vergrößern: ❌ BUG-1.**
- Druck: ✅ Seitenleiste, Menü-Button, Kopfzeile ausgeblendet.
- Tastatur/Screenreader: ✅ `aria-current`, Radix-Fokusfalle, Titel und Beschreibung am Drawer. Hinweis BUG-4.
- Breite Tabellen: ⚠️ nur visuell prüfbar (Inhalt hat ca. 240 px weniger Platz ab 1024 px).

### Bugs
- **BUG-1 (Medium) – Menü bleibt beim Wechsel auf Desktop-Breite offen.** Der Zustand des Menüs ist nicht an die Bildschirmbreite gekoppelt. Wer es am Tablet öffnet und dann auf ≥ 1024 px vergrößert/dreht, sieht Dunkel-Overlay und Menü über der neuen Seitenleiste; der Menü-Button ist dann ausgeblendet. Schließen geht nur per Overlay-Tipp oder X. Verstößt gegen den Edge Case der Spec. *Reproduktion:* Fenster < 1024 px, Menü öffnen, Fenster auf > 1024 px ziehen.
- **BUG-2 (Medium, nicht visuell bestätigt) – Kopfzeile bei Super-Admin auf 375 px zu breit.** Rechnerisch: 32 px Ränder + Menü-Button 44 + Logo 20 + „Admin“ ca. 73 + Bereichs-Umschalter fest 180 px + Abstände ≈ 385 px. Könnte den Umschalter anschneiden oder Querscrollen auslösen. Fachbereichs-Admins sind nicht betroffen. *Zu prüfen:* Super-Admin-Konto, Breite 375 px.
- **BUG-3 (Low) – Druck: Breitenbegrenzung.** Früher trug `main` `print:max-w-none`; jetzt liegt `max-w-7xl` auf dem äußeren Container ohne Druck-Ausnahme. Bei A4 vermutlich ohne sichtbaren Effekt, sollte aber mit der Druckvorschau der Leistungsnachweise (einzeln und Klasse) geprüft werden.
- **BUG-4 (Low) – Gruppentitel der Navigation sind `h2`.** Sie erscheinen in der Überschriften-Gliederung vor der `h1` jeder Seite. Besser als Beschriftung ohne Überschriften-Rolle.
- **Hinweis (Low) – Name in der Kopfzeile erst ab 640 px.** Auf kleinen Handys war der Name früher sichtbar; jetzt ist er dort nur noch auf der Startseite (Begrüßung) zu sehen.

### Security Audit
- Keine neuen API-Routen, keine Datenbank- oder Rechteänderung. Layout leitet weiterhin Nicht-Eingeloggte auf `/login` und Nicht-Admins auf `/` um.
- Rollenfilter wirkt nur auf die Anzeige; Direktaufruf einer Super-Admin-Seite wird weiterhin von den API-Routen mit 403 beantwortet (geprüft für `/api/admin/departments`).
- Der Name in `AdminRoleProvider` ist der eigene Anzeigename des Eingeloggten; React maskiert die Ausgabe (kein XSS-Pfad). Keine Geheimnisse im Client.
- Keine Befunde.

### Regression
- Gesamte Vitest-Suite grün. Betroffene Seiten (Fragen, Leistungsnachweise, Nutzer usw.) wurden inhaltlich nicht geändert; nur drei Texte (Überschriften/Dialoge) wurden umbenannt.

### Entscheidung
**READY mit Vorbehalt – keine Critical/High-Bugs.** Vor dem Deploy sollte die optische Abnahme (Handy 375 px, Tablet, Desktop, Druckvorschau) erfolgt sein.

### Fehlerbehebung (2026-10-22)
- **BUG-1 behoben:** `AdminShell` schließt das Menü per `matchMedia`, sobald die Breite ≥ 1024 px erreicht. Neuer Test `admin-shell.test.tsx` („schließt ein offenes Menü …“).
- **BUG-2 behoben:** Der Bereichs-Umschalter ist unter 640 px 144 px breit (`w-36 sm:w-[180px]`); Kopfzeile damit rechnerisch ca. 349 px statt 385 px. Visuelle Bestätigung auf 375 px steht aus.
- **BUG-3 behoben:** Der äußere Container hat im Druck `print:max-w-none print:mx-0`. Druckvorschau steht aus.
- **BUG-4 behoben:** Gruppentitel sind keine Überschriften mehr, sondern benennen ihre Liste per `aria-labelledby` (IDs über `useId`, damit Seitenleiste und Menü sich nicht überschneiden). Test angepasst.
- **Hinweis (Name in der Kopfzeile erst ab 640 px):** bewusst unverändert, da auf 375 px kein Platz neben dem Umschalter ist; der Name steht in der Begrüßung auf der Startseite.
- Erneut geprüft: Vitest 96 Dateien / 1056 Tests grün, ESLint und `tsc` (unter `src/`) ohne Fehler.

## Deployment
_To be added by /deploy_
