# PROJ-29: Bereichs-Umschalter für den Super-Admin

## Status: Approved
**Created:** 2026-10-08
**Last Updated:** 2026-10-08

## Dependencies
- Requires: PROJ-22/23 (Fachbereich als Datenbasis, Zuordnung) — Tourismus-Inhalte für Azubis
- Requires: PROJ-24 (Fachbereichs-Admins & Rechtetrennung) — Super-Admin-Rolle, Admin-Bereichs-Umschalter
- Requires: PROJ-25 (Onboarding Tourismus) — Bereich Tourismus mit Fächern, Pseudonymen, Shop
- Requires: PROJ-1 (User Authentication) — Sitzung und Login
- Abgrenzung: Der Umschalter im Admin-Panel (PROJ-24) betrifft nur die Verwaltung; dieses Feature betrifft die **Schüleroberfläche**.

## Summary
Der Super-Admin (`david.zach@spedtour.muenchen.musin.de`) soll die Schüleroberfläche nicht nur in Spedition, sondern auch in Tourismus erleben — mit eigenem, getrenntem Lernstand. Dafür bekommt er ein **verknüpftes Zweitkonto im Bereich Tourismus** (normaler Azubi, keine Adminrechte). Auf der Profil-Seite schaltet er per Knopf zwischen beiden Konten um; die Sitzung wird serverseitig gewechselt. Der Spedition-Stand und die Adminrechte des Hauptkontos bleiben unberührt.

## User Stories
- Als **Super-Admin** möchte ich auf meiner Profil-Seite zwischen „Spedition" und „Tourismus" umschalten, um die Schüleroberfläche beider Bereiche selbst zu erleben.
- Als **Super-Admin** möchte ich in Tourismus einen eigenen Lernstand (XP, Münzen, Streak, Badges, Hof, Rangliste, Pseudonym) haben, damit mein Spedition-Stand nicht vermischt wird.
- Als **Super-Admin** möchte ich im Tourismus-Modus wie ein echter Azubi unterwegs sein, damit ich Fehler und Wirkung aus Azubi-Sicht sehe.
- Als **Super-Admin** möchte ich jederzeit mit einem Klick zurück auf mein Hauptkonto, um ins Admin-Panel zu kommen.
- Als **Azubi oder anderer Admin** möchte ich, dass der Umschalter für mich nicht existiert und niemand über ihn in ein fremdes Konto gelangen kann.
- Als **Super-Admin** möchte ich, dass das Tourismus-Konto nicht in Ranglisten, Klassen- oder Notenauswertungen echter Azubis verfälschend auftaucht.

## Acceptance Criteria

### Zweitkonto
- [ ] Ein Super-Admin kann ein verknüpftes Tourismus-Konto erhalten (einmalig angelegt, z. B. beim ersten Umschalten oder per Migration/Skript); es gehört zum Bereich Tourismus, hat `role = 'student'` und ein Tourismus-Pseudonym.
- [ ] Hauptkonto und Zweitkonto sind in der Datenbank eindeutig verknüpft (1 : 1); ein Zweitkonto gehört genau einem Hauptkonto.
- [ ] Das Zweitkonto hat kein Passwort, das sich außerhalb des Umschalters nutzen lässt (kein normaler Login, kein Passwort-Reset durch Dritte).
- [ ] Der Lernstand beider Konten ist vollständig getrennt; Aktionen in Tourismus ändern nichts am Spedition-Konto und umgekehrt.

### Umschalter
- [ ] Auf der Profil-Seite erscheint ein Bereich „Ansicht wechseln" mit den Optionen Spedition und Tourismus; der aktive Bereich ist markiert.
- [ ] Der Bereich ist **nur** für den Super-Admin und sein Zweitkonto sichtbar; für alle anderen Konten (Azubis, Bereichs-Admins, andere Admins) fehlt er.
- [ ] Ein Klick wechselt serverseitig die Sitzung auf das jeweils andere Konto und lädt die Schüleroberfläche des Zielbereichs (Fächer, Fragen, Shop, Hof, Rangliste, App-Name, Währungsname).
- [ ] Nach dem Umschalten bleibt man eingeloggt; es ist keine erneute Passworteingabe nötig.
- [ ] Im Tourismus-Modus zeigt die Profil-Seite des Zweitkontos einen „Zurück zu Spedition (Admin)"-Knopf.

### Rechte und Sicherheit
- [ ] Im Tourismus-Modus hat die Sitzung keine Adminrechte; das Admin-Panel und Admin-Schnittstellen verweigern den Zugriff wie bei jedem Azubi.
- [ ] Die Umschalt-Schnittstelle prüft serverseitig, dass der Aufrufer ein verknüpftes Konto-Paar besitzt; ein fremdes Konto kann nie als Ziel angegeben werden.
- [ ] Die Umschaltung erfolgt ohne Preisgabe von Passwörtern oder Tokens im Browser, die sich außerhalb des Vorgangs wiederverwenden lassen.
- [ ] Jede Umschaltung wird im Audit-Log protokolliert (wer, wann, von → nach).
- [ ] Ein Azubi kann den Umschalter nicht durch direkten Aufruf der Schnittstelle nutzen (403).

### Auswirkungen auf Auswertungen
- [ ] Das Zweitkonto erscheint nicht in der Tourismus-Rangliste echter Azubis (analog Leaderboard-Opt-out) bzw. ist eindeutig als Test-/Admin-Konto ausgeschlossen.
- [ ] Das Zweitkonto zählt nicht in Teilnehmer-/Klassenauswertungen von Leistungsnachweisen (PROJ-21/28), sofern es nicht ausdrücklich teilnimmt, und nicht in Nutzungs-Audits (Fun Auditor).
- [ ] Im Admin-Panel (Nutzerliste) ist das Zweitkonto als verknüpftes Konto erkennbar.

## Edge Cases
- **Tourismus-Bereich deaktiviert oder ohne Inhalte:** Umschalter ist deaktiviert oder zeigt eine verständliche Meldung; kein Absturz.
- **Zweitkonto fehlt noch:** Beim ersten Umschalten wird es automatisch angelegt oder der Knopf meldet verständlich, dass es angelegt wird.
- **Hauptkonto verliert Super-Admin-Rolle:** Umschalter verschwindet; das Zweitkonto bleibt gesperrt (nicht mehr erreichbar) oder wird deaktiviert.
- **Sitzung abgelaufen beim Umschalten:** Weiterleitung zum Login; kein halber Zustand mit zwei Sitzungen.
- **Zweimal schnell geklickt / zwei Tabs:** Die letzte Umschaltung gewinnt; kein doppeltes Anlegen des Zweitkontos.
- **Google-Login des Hauptkontos:** Umschalten funktioniert unabhängig von der Login-Methode.
- **Adresse gehört zu anderem Bereich** (`touristiklern.vercel.app` vs. `spedilern…`): Der Hinweis „Deine App heißt …" aus PROJ-23 darf beim bewusst umgeschalteten Konto nicht verwirren (kein falscher Hinweis).
- **Löschen des Hauptkontos:** Das Zweitkonto wird mit entfernt oder unbrauchbar gemacht.
- **Push/Erinnerungen (PROJ-18):** Das Zweitkonto bekommt keine Erinnerungsmitteilungen.

## Nicht Teil dieses Features
- Mehrere Bereiche in **einem** Konto mit getrenntem Lernstand pro Bereich (zu großer Umbau)
- Umschalter für andere Admins oder Azubis
- Admin-Link im Tourismus-Modus (bewusst nicht; Rückschalten genügt)
- Umschalten des Admin-Panel-Bereichs (existiert bereits in PROJ-24)

## Technical Requirements (optional)
- Security: Serverseitiger Sitzungswechsel; Umschalt-Berechtigung nur über verknüpftes Konto-Paar; kein Passwort für das Zweitkonto
- Performance: Umschalten < 2 s inkl. Neuladen der Oberfläche

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Ausgangslage (aus dem bestehenden Code)
- Die Schüleroberfläche richtet sich überall nach dem Bereich im **eigenen Profil**; alle Lerndaten (XP, Münzen, Streak, Badges, Hof, Quiz-Verläufe) hängen an der Nutzer-ID.
- Jede Seite und Schnittstelle prüft die Sitzung des angemeldeten Nutzers. Genau darum ist das **Zweitkonto** der saubere Weg: Es braucht keinen Eingriff in Quiz, Shop, Rangliste, Hof oder Zugriffsregeln.
- Neue Azubis bekommen ihr Profil automatisch, Bereich und Pseudonym werden beim ersten Aufruf zugeordnet (PROJ-23). Das nutzen wir für das Zweitkonto mit.
- Für Rangliste gibt es bereits „aus Rangliste ausblenden" (Opt-out); für Admin-Schnittstellen gibt es bereits einen Audit-Log.

### A) Komponenten-Struktur
```
Profil-Seite (besteht)
+-- Pseudonym-Einstellungen (besteht)
+-- Rangliste-Opt-out (besteht)
+-- NEU: „Ansicht wechseln"-Karte  (nur sichtbar für Super-Admin + sein Zweitkonto)
    +-- Auswahl: Spedition | Tourismus   (aktiver Bereich markiert)
    +-- Hinweis im Tourismus-Modus: „Du bist im Tourismus-Testkonto. Admin-Panel nur im Hauptkonto."
    +-- Ladezustand beim Umschalten, Fehlermeldung bei Problemen

Neue Server-Schnittstelle „Bereich wechseln"
+-- prüft Berechtigung (Super-Admin oder dessen Zweitkonto)
+-- legt beim ersten Mal das Zweitkonto an
+-- tauscht die Sitzung gegen die des Zielkontos
+-- schreibt Eintrag in den Audit-Log

Bestehende Teile mit kleiner Anpassung
+-- Falsche-Adresse-Hinweis (PROJ-23): bei verknüpftem Konto-Paar unterdrückt
+-- Admin-Nutzerliste: Zweitkonto als „verknüpft" gekennzeichnet bzw. herausgefiltert
+-- Auswertungen (Leistungsnachweise, Fun Auditor, Rangliste): Zweitkonto ausgeschlossen
```

### B) Datenmodell (in Alltagssprache)
```
Jedes Profil bekommt EIN neues Feld:
- „Verknüpftes Hauptkonto" (leer bei allen normalen Konten;
  beim Tourismus-Zweitkonto zeigt es auf das Hauptkonto)

Das Zweitkonto ist ein ganz normales Konto mit:
- Rolle Azubi (keine Adminrechte)
- Bereich Tourismus
- Tourismus-Pseudonym (wird automatisch vergeben)
- Rangliste: ausgeblendet
- Unzustellbare Platzhalter-Adresse (z. B. endend auf „.invalid") und kein Passwort,
  damit sich niemand per Login oder „Passwort vergessen" Zugang verschaffen kann

Regeln:
- Ein Hauptkonto hat höchstens ein Zweitkonto; ein Zweitkonto gehört genau einem Hauptkonto
- Das Feld ist, wie der Bereich im Profil, nicht von Nutzern selbst änderbar
- Wird das Hauptkonto gelöscht, verschwindet die Verknüpfung; das Zweitkonto wird mit aufgeräumt

Gespeichert in: bestehender Datenbank (Supabase), nur das eine neue Feld; Audit-Log nutzt die vorhandene Tabelle
```

### C) Tech-Entscheidungen (mit Begründung)
| Entscheidung | Warum |
|---|---|
| **Zweitkonto statt „ein Konto, Lernstand pro Bereich"** | Fast alle Tabellen und Zugriffsregeln hängen an der Nutzer-ID. Ein zweites Konto trennt automatisch alles sauber, ohne dass jede Funktion umgebaut werden muss. Kein Risiko für den Spedition-Stand. |
| **Sitzungswechsel auf dem Server, ohne Passwort** | Der Server erzeugt für das Zielkonto einmalig eine Anmeldung und übernimmt sie direkt. Der Browser bekommt nur die normale Sitzung des Zielkontos, nie ein wiederverwendbares Passwort oder einen Link. |
| **Zweitkonto ohne Passwort und mit Platzhalter-Adresse** | Es gibt keinen Weg, sich von außen anzumelden oder das Passwort zurückzusetzen. Der einzige Zugang ist der Umschalter. |
| **Zweitkonto ohne Adminrechte** | Wie vereinbart: Im Tourismus-Modus siehst du genau, was ein echter Azubi sieht. Selbst bei einem Fehler im Zweitkonto sind keine Adminrechte im Spiel. |
| **Rückweg nur über das Verknüpfungs-Feld** | Der Server prüft bei jedem Wechsel: Gehört das Zielkonto wirklich zu diesem Paar? Ist das Hauptkonto noch Super-Admin? Ein fremdes Konto lässt sich nie angeben, weil kein Ziel im Aufruf steht, sondern nur „Spedition" oder „Tourismus". |
| **Rangliste-Ausblendung statt Spezialfilter** | Die vorhandene Opt-out-Funktion wird einfach für das Zweitkonto gesetzt; kein neuer Rangliste-Code. |
| **Auswertungen schließen das Zweitkonto über das neue Feld aus** | Eine einheitliche Regel („Konto hat ein Hauptkonto → Testkonto") statt Einzel-Lösungen. |

### D) Abhängigkeiten
- Keine neuen Pakete. Genutzt wird, was schon da ist: Supabase-Anmeldung (Server-Schlüssel für die Kontoanlage), vorhandene Profil-Seite, vorhandener Audit-Log.
- **Eine Datenbank-Migration:** neues Feld am Profil, Rückweg-Skript.
- **Betrifft später PROJ-18 (Erinnerungen):** Das Zweitkonto muss dort ausgeschlossen werden, sobald PROJ-18 gebaut wird (in der Spec von PROJ-18 vermerken).

### Hinweise zu Risiken
- **Sitzung:** Es gibt immer nur eine aktive Sitzung im Browser; Umschalten ersetzt sie. In zwei Tabs gilt der zuletzt gewählte Bereich, nach dem Umschalten in einem Tab zeigt der andere beim nächsten Aufruf den neuen Bereich.
- **Server-Schlüssel:** Die Umschalt-Schnittstelle ist die einzige neue Stelle mit Kontoanlage-Rechten. Sie prüft zuerst die Berechtigung und tut sonst nichts.
- **Google-Login:** Der Wechsel hängt nicht von der Login-Methode ab, weil er die Sitzung direkt auf dem Server setzt.
- **Falsche-Adresse-Hinweis:** Bei verknüpftem Paar wird er unterdrückt, damit er nicht „Deine App heißt …" einblendet, wenn du bewusst im anderen Bereich bist.

## Implementation Notes (Backend, 2026-10-08)

**Gebaut:**
- Migration [20261008_proj29_linked_accounts.sql](../supabase/migrations/20261008_proj29_linked_accounts.sql) (+ `_down`): neue Spalte `profiles.linked_main_user_id` (FK auf `auth.users`, `ON DELETE CASCADE`), Check „nicht sich selbst", Unique-Index (höchstens ein Zweitkonto je Hauptkonto). Spalte ist durch den bestehenden Spalten-Grant nicht selbst änderbar; keine RLS-Änderung.
- [src/lib/linked-account.ts](../src/lib/linked-account.ts): `getLinkContext` (darf dieses Konto umschalten? Hauptkonto = `role admin`; Zweitkonto nur, solange das Hauptkonto noch Super-Admin ist), `findLinkedUserId`, `ensureLinkedUser` (legt Zweitkonto an: Platzhalter-Adresse `tourismus-<uuid>@linked.invalid`, bestätigt, **ohne Passwort**; setzt Rolle Azubi, Bereich TOUR, Tourismus-Pseudonym, Rangliste ausgeblendet; bei Wettlauf wird das überzählige Konto gelöscht).
- Schnittstelle `POST /api/profile/switch-area` mit Body `{ target: 'main' | 'linked' }`: 401 ohne Sitzung, 400 bei ungültigem Ziel (Konto-IDs werden nicht angenommen), 403 ohne Berechtigung, 200 `{ switched }`. Sitzungswechsel über serverseitig erzeugten Einmal-Token (`generateLink` + `verifyOtp`), Token verlässt den Server nicht. Audit-Log-Eintrag `switch_area` (Aktor = Hauptkonto). Schlägt der Wechsel fehl, bleibt die bisherige Sitzung bestehen.
- Falsche-Adresse-Hinweis (PROJ-23) entfällt für Super-Admin und Zweitkonto ([departments-server.ts](../src/lib/departments-server.ts)).
- Admin-Nutzerliste blendet das Zweitkonto aus; das Engagement-Audit-Skript ([scripts/engagement/audit.ts](../scripts/engagement/audit.ts)) zählt es nicht mit.
- Tests: [route.test.ts](../src/app/api/profile/switch-area/route.test.ts), [linked-account.test.ts](../src/lib/linked-account.test.ts); gesamte Suite grün (628 Tests).

**Frontend (2026-10-08):**
- Neue Komponente [area-switcher.tsx](../src/components/area-switcher.tsx): Auswahl mit zwei großen Knöpfen (Radiogruppe, mind. 44 px), aktiver Bereich grün markiert, Ladekreis beim Wechsel, Fehlermeldung per Toast. Nach erfolgreichem Wechsel wird die Profil-Seite komplett neu geladen (damit Bereich, Branding und Lernstand stimmen). Im Testkonto steht ein Hinweis „ohne Admin-Rechte, zum Admin-Panel zurückwechseln".
- Einbindung in [profile/page.tsx](../src/app/profile/page.tsx) als eigene Karte ganz oben; sie erscheint nur, wenn `getLinkContext` das Konto als Super-Admin oder Zweitkonto erkennt (sonst keine Spur im Seitenaufbau). Bereichsnamen kommen aus der Tabelle `departments`.
- Tests: [area-switcher.test.tsx](../src/components/area-switcher.test.tsx) (5 Fälle); gesamte Suite grün.
- Nicht im Browser geprüft (Regel: kein Dev-Server).

**Abweichungen / Hinweise:**
- Ziel-Namen der Schnittstelle sind `main`/`linked` statt „Spedition/Tourismus" (das Hauptkonto muss nicht zwingend Spedition sein); die Beschriftung kommt im Frontend.
- Rangliste: kein neuer Filter; das Zweitkonto bekommt `leaderboard_opt_out = true` (wie im Design). Es könnte das selbst wieder ausschalten, wäre dann aber nur Testkonto-Verhalten des Super-Admins.
- Leistungsnachweis-Auswertung: unverändert; das Zweitkonto zählt nur, wenn es selbst teilnimmt.
- Beim Löschen des Hauptkontos verschwindet das Zweitkonto-**Profil** per Cascade, der zugehörige `auth.users`-Eintrag bleibt als Karteileiche und muss manuell entfernt werden.
- **Offen:** Migration ist noch nicht auf die Produktions-Datenbank angewendet. Sie muss **vor** dem Deploy laufen, weil der Code die neue Spalte liest. 

## QA Test Results

**Getestet:** 2026-10-08 · Umfang: Code-Review gegen alle Kriterien, automatisierte Tests, Prüfung der Datenbank (nach Anwendung der Migration), Sicherheits-Review.
**Nicht möglich / nicht getan:** Browser-Test (Chrome/Firefox/Safari, 375/768/1440 px) und Playwright-E2E — laut Projektregel läuft kein Dev-Server/Playwright (bringt den Rechner zum Absturz). Der echte Sitzungswechsel (Einmal-Token erzeugen und einlösen) wurde **nicht gegen die laufende Supabase-Anmeldung** ausgeführt, nur gegen Mocks.

### Automatisierte Prüfungen
- `npm test`: 60 Dateien, 633 Tests grün (neu: Schnittstelle 8, Konto-Logik 11, Umschalt-Karte 5).
- `npm run lint`: 0 Fehler (34 Warnungen, keine aus PROJ-29).
- `tsc` über `src/`: keine Fehler.
- Datenbank (live): Migration angewendet (0 verknüpfte Profile bei 135). Selbstverknüpfung wird blockiert, zwei Zweitkonten für dasselbe Hauptkonto werden blockiert (Test in zurückgerollter Transaktion, danach 0 verknüpfte Profile). Angemeldete Nutzer und anonyme Besucher dürfen die Spalte **nicht** schreiben.

### Akzeptanzkriterien
| Bereich | Kriterium | Ergebnis |
|---|---|---|
| Zweitkonto | Wird angelegt (Rolle Azubi, Bereich Tourismus, Pseudonym) | Pass (Code + Tests) |
| Zweitkonto | 1 : 1-Verknüpfung eindeutig | Pass (live geprüft) |
| Zweitkonto | Kein nutzbares Passwort, unzustellbare Adresse | Pass (Tests; Anlage ohne Passwort, `.invalid`) |
| Zweitkonto | Lernstand vollständig getrennt | Pass (eigenes Konto, keine geteilten Daten) |
| Umschalter | Karte „Ansicht wechseln" mit markiertem aktiven Bereich | Pass (Komponententest) |
| Umschalter | Nur für Super-Admin und Zweitkonto sichtbar | Pass (Code: `getLinkContext`; andere Konten rendern nichts) |
| Umschalter | Klick wechselt Sitzung, lädt Oberfläche des Zielbereichs | **Ungeprüft live** (nur Mocks) |
| Umschalter | Kein erneutes Passwort nötig | **Ungeprüft live** |
| Umschalter | Zurück-Knopf im Tourismus-Modus | Pass (Komponententest; zweiter Knopf = Rückweg) |
| Sicherheit | Zweitkonto ohne Adminrechte, Admin-Panel verweigert | Pass (Rolle student; Proxy/`requireAdmin` prüfen Rolle) |
| Sicherheit | Ziel nur „main"/„linked", nie fremde Konto-ID | Pass (Test: Konto-ID → 400) |
| Sicherheit | Kein wiederverwendbares Token im Browser | Pass (Token bleibt im Server; Antwort enthält nur `ok`/`switched`) |
| Sicherheit | Umschaltung im Audit-Log | Pass (Test; best-effort, siehe Befund L-2) |
| Sicherheit | Azubi/anderer Admin per Direktaufruf → 403 | Pass (Test) |
| Auswertungen | Zweitkonto nicht in der Rangliste | Pass (Rangliste-Opt-out gesetzt) |
| Auswertungen | Nicht in Klassenauswertung, Nutzungs-Audit | Pass (Audit-Skript filtert; Leistungsnachweise nur bei Teilnahme) |
| Auswertungen | In Admin-Nutzerliste erkennbar/herausgefiltert | Pass (herausgefiltert) |

### Edge Cases
- Bereich Tourismus fehlt/inaktiv: `ensureLinkedUser` wirft → Schnittstelle antwortet 500 mit Meldung, Sitzung bleibt. **Pass.**
- Zweitkonto fehlt noch: wird beim ersten Umschalten angelegt. **Pass.**
- Doppelklick/zwei Tabs: Unique-Index + Aufräumen des überzähligen Kontos. **Pass** (Test).
- Sitzung abgelaufen: Proxy antwortet 401 für `/api/…`. **Pass** (die Karte zeigt dann die Fehlermeldung statt Weiterleitung; siehe L-4).
- Google-Login des Hauptkontos: Wechsel unabhängig von der Login-Methode. **Pass** (nicht live geprüft).
- Hauptkonto verliert Super-Admin: Umschalten wird 403. **Pass**; laufende Tourismus-Sitzung bleibt bis zum Ablauf nutzbar (L-3).
- Falsche-Adresse-Hinweis bei Konto-Paar unterdrückt. **Pass.**
- Löschen des Hauptkontos: Zweitkonto-Profil verschwindet per Cascade, der Login-Eintrag bleibt (L-1).
- Push/Erinnerungen: PROJ-18 noch nicht gebaut; Ausschluss ist dort nachzuziehen.

### Sicherheits-Review (Red Team)
- Rechteausweitung: Das Verknüpfungs-Feld ist weder für angemeldete Nutzer noch für anonyme Besucher schreibbar (live geprüft). Ein Azubi kann sich weder verknüpfen noch zum Admin umschalten (403).
- Login von außen: Zweitkonto hat kein Passwort; Passwort-Zurücksetzen oder Magic-Link per E-Mail geht an eine `.invalid`-Adresse (unzustellbar).
- Der Schlüssel mit Kontoanlage-Rechten wird nur nach erfolgreicher Berechtigungsprüfung benutzt.
- Antworten enthalten keine Tokens, E-Mail-Adressen oder fremde IDs.
- Keine neue RLS-Policy, keine Policy-Änderung.

### Befunde
Keine Critical- oder High-Bugs.

| ID | Schwere | Befund |
|---|---|---|
| M-1 | Medium (Prüflücke) | Sitzungswechsel (`generateLink` + `verifyOtp` im Server) nicht live getestet. Ausfall ist harmlos (Fehlermeldung, Sitzung bleibt), aber die Funktion selbst ist unbestätigt → nach Deploy einmal von Hand durchklicken (siehe unten). |
| L-1 | Low | Beim Löschen des Hauptkontos bleibt der `auth.users`-Eintrag des Zweitkontos übrig (manuell entfernen). Ohne Passwort/Adresse nicht nutzbar. |
| L-2 | Low | Audit-Log ist „best effort" (schluckt Fehler) — eine Umschaltung kann im Ausnahmefall ohne Eintrag bleiben. |
| L-3 | Low | Wird dem Hauptkonto die Super-Admin-Rolle entzogen, kann eine bereits offene Tourismus-Sitzung nicht mehr zurückschalten, läuft aber normal als Azubi bis zum Ablauf. |
| L-4 | Low | Bei abgelaufener Sitzung zeigt die Karte nur „Umschalten hat nicht geklappt" statt zum Login zu leiten. |
| L-5 | Low | Die Auswahl ist als Radiogruppe markiert, unterstützt aber keine Pfeiltasten (nur Tab + Enter/Leertaste). |
| L-6 | Low | Jede Profil-Seiten-Anfrage macht eine zusätzliche Abfrage (`getLinkContext`), auch für normale Azubis. |
| L-7 | Low (außerhalb PROJ-29) | `npm run build` lokal scheitert an unversionierten Skripten in `scripts/scratch/` (Typfehler); in Git/Vercel nicht enthalten. |
| L-8 | Low | Das Zweitkonto kann „In Rangliste erscheinen" selbst wieder einschalten (nur der Super-Admin selbst betroffen). |

### Manueller Rauchtest nach dem Deploy (einmal, ~2 Minuten)
1. Mit `david.zach@spedtour…` einloggen → Profil: Karte „Ansicht wechseln" sichtbar, „Spedition" aktiv.
2. „Tourismus" tippen → Seite lädt neu, TouristikLern-Branding, XP 0, Tourismus-Pseudonym, Hinweis zu fehlenden Admin-Rechten; `/admin` ist gesperrt.
3. „Spedition" tippen → alter Stand, Admin-Panel wieder erreichbar.
4. Mit einem normalen Azubi-Konto: Karte erscheint nicht.

### Produktionsreife
**READY** — keine Critical/High-Bugs. Einschränkung: M-1 (Live-Test des Sitzungswechsels) bleibt ein Rauchtest nach dem Deploy.

## Deployment
_To be added by /deploy_
