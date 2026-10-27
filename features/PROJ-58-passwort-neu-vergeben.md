# PROJ-58: Passwort neu vergeben (mit Pflichtwechsel)

## Status: Approved
**Created:** 2026-10-27
**Last Updated:** 2026-10-27

## Kontext
Azubis vergessen ihr Passwort oder haben keinen Zugriff auf ihre E-Mails. Der Weg über „Passwort vergessen“ scheitert dann im Unterricht. Admins sollen direkt ein neues Passwort vergeben und es der Person mündlich oder auf Papier mitteilen können.

### Entscheidungen (Nutzer, 2026-10-27)
- **E1:** Der Admin vergibt das Passwort selbst und teilt es mit. Es wird keine E-Mail verschickt.
- **E2:** Die App **schlägt ein gut lesbares Passwort vor**. Der Admin kann es übernehmen oder selbst eins eintippen.
- **E3:** **Pflichtwechsel:** Nach dem nächsten Login muss die Person zuerst ein eigenes Passwort festlegen. Danach kennt der Admin das Passwort nicht mehr.
- **E4:** **Super-Admin und Bereichs-Admins** dürfen das. Bereichs-Admins nur bei Azubis (Rolle `student`) ihres eigenen Bereichs, also mit derselben Regel wie beim Sperren.

## Dependencies
- Requires: PROJ-1 (Authentifizierung, Login, `/reset-password`), PROJ-24 (Bereichstrennung)
- Wird genutzt von: PROJ-62 (Konten anlegen nutzt dasselbe Start-Passwort mit Pflichtwechsel)

## User Stories
- Als **Admin** möchte ich in der Nutzerliste bei einer Person „Passwort neu vergeben“ wählen, damit sie sofort wieder lernen kann.
- Als **Admin** möchte ich einen Passwort-Vorschlag bekommen, den man leicht vorlesen und abtippen kann, damit ich mir keins ausdenken muss.
- Als **Admin** möchte ich das Passwort nach dem Speichern einmal gut lesbar sehen und kopieren können, damit ich es weitergeben kann.
- Als **Azubi** möchte ich nach dem Login mit dem vergebenen Passwort direkt ein eigenes festlegen, damit nur ich mein Passwort kenne.
- Als **Super-Admin** möchte ich im Änderungsprotokoll sehen, wer wann bei wem ein Passwort vergeben hat, damit Missbrauch auffällt.

## Acceptance Criteria

### Vergeben
- [ ] In der Aktionsspalte der Nutzerliste gibt es den Eintrag „Passwort neu vergeben“ (Schlüssel-Icon).
- [ ] Ein Dialog nennt Name und E-Mail der Person und zeigt ein Feld mit einem **Vorschlag**: drei deutsche Wörter plus zweistellige Zahl, mit Bindestrichen getrennt (z. B. `Hafen-Kran-Birke-47`). Er enthält keine verwechselbaren Zeichen (0/O, 1/l/I).
- [ ] Ein Button „Neuer Vorschlag“ erzeugt einen anderen Vorschlag.
- [ ] Das Feld ist änderbar. Regel: mindestens 8 Zeichen (wie bei `/reset-password`). Bei zu kurzer Eingabe erscheint ein Hinweis direkt am Feld, und Speichern ist gesperrt.
- [ ] Nach „Passwort setzen“ zeigt der Dialog das Passwort groß und gut lesbar (Monospace) mit „Kopieren“. Der Hinweis lautet: „Teile das Passwort jetzt mit. Es wird nicht gespeichert und ist später nicht mehr abrufbar.“
- [ ] Schließt man den Dialog, ist das Passwort weg. Es lässt sich nirgendwo wieder anzeigen.
- [ ] Erfolg: Toast „Passwort für {Name} gesetzt“.

### Pflichtwechsel
- [ ] Mit dem Setzen wird das Konto als „muss Passwort ändern“ markiert.
- [ ] Meldet sich die Person danach an, landet sie **vor allem anderen** auf „Neues Passwort festlegen“. Alle anderen Seiten (Lernen, Hof, Admin-Bereich) leiten dorthin um, bis sie es geändert hat.
- [ ] Das neue Passwort braucht mindestens 8 Zeichen und darf nicht gleich dem vergebenen sein.
- [ ] Nach dem Ändern wird die Markierung entfernt und die Person landet auf ihrer normalen Startseite.
- [ ] „Abmelden“ ist auf der Pflicht-Seite möglich.

### Sitzungen
- [ ] Mit dem Setzen werden alle laufenden Sitzungen der Person beendet (andere Geräte werden abgemeldet).

### Rechte
- [ ] Super-Admin: bei allen Konten außer dem eigenen.
- [ ] Bereichs-Admin: nur bei Azubis des eigenen Bereichs. Bei Lehrkräften, anderen Admins oder Azubis anderer Bereiche antwortet der Server mit 404 (wie beim Sperren), und der Menüeintrag fehlt.
- [ ] Lehrkräfte ohne Admin-Rolle haben keinen Zugriff.
- [ ] Das eigene Konto ist ausgeschlossen. Dafür gibt es den normalen Weg im Konto.

### Protokoll
- [ ] Jede Vergabe erzeugt einen Eintrag `user.password_set` im Änderungsprotokoll (wer, bei wem, wann, Bereich). Das Passwort selbst steht **nie** im Protokoll, in Logs oder in der Antwort an andere Clients.

## Edge Cases
- Ein gesperrtes Konto bekommt ein neues Passwort: erlaubt, bleibt aber gesperrt. Der Dialog weist darauf hin („Konto ist gesperrt – Login erst nach Entsperren möglich“).
- Zwei Admins vergeben fast gleichzeitig ein Passwort: Das zuletzt gesetzte gilt. Beide Einträge stehen im Protokoll.
- Netzfehler beim Setzen: Fehlermeldung, Dialog bleibt offen mit dem eingegebenen Passwort, „Erneut versuchen“. Erst nach Erfolg wird das Passwort als gültig angezeigt.
- Die Person nutzt danach „Passwort vergessen“ per Mail: Der Pflichtwechsel ist damit erfüllt und die Markierung wird entfernt.
- Ein Admin vergibt einem Admin-Konto ein Passwort (nur Super-Admin): Der Pflichtwechsel gilt auch dort, auch im Lehrkräfte-Bereich.
- Der Vorschlag darf keine anstößigen Wortkombinationen ergeben (kuratierte Wortliste, nur neutrale Wörter, z. B. aus Logistik und Natur).

## Technical Requirements (optional)
- Security: Das Passwort wird nur serverseitig gesetzt (Service-Rolle), nie im Klartext gespeichert oder geloggt. Die Bereichs-Prüfung passiert im Route-Code, weil die Route RLS umgeht (wie bei PATCH `/api/admin/users/:id`).
- Rate-Limit: höchstens 20 Vergaben pro Admin und Stunde.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Das Feature besteht aus drei Teilen:
1. ein **Dialog** in der Nutzerliste,
2. eine **Server-Schnittstelle**, die das Passwort setzt,
3. eine **Pflicht-Seite** „Neues Passwort festlegen“, auf die der Proxy jede markierte Person schickt.

Es gibt keine neue Tabelle. Die Markierung „muss Passwort ändern“ liegt in den **geschützten Konto-Daten von Supabase Auth** (`app_metadata`). Nur der Server kann sie ändern, die Person selbst nicht.

### Komponenten-Struktur
```
Nutzer-Seite (/admin/users) — bestehend
+-- Aktionsmenü je Zeile — bestehend
    +-- NEU: „Passwort neu vergeben“ (Schlüssel-Icon; nur wenn erlaubt)
        +-- NEU: Passwort-Dialog
            +-- Schritt 1: Name/E-Mail, Feld mit Vorschlag, „Neuer Vorschlag“,
            |   Hinweis bei gesperrtem Konto, „Passwort setzen“
            +-- Schritt 2: Passwort groß (Monospace) + „Kopieren“ + Hinweis
                „wird nicht gespeichert“

NEU: Pflicht-Seite /passwort-festlegen (Schüler-Design, dunkel, mobil)
+-- Kurzer Satz „Lege dein eigenes Passwort fest“
+-- Neues Passwort + Wiederholung (mind. 8 Zeichen)
+-- „Speichern“ → weiter zur normalen Startseite (/start)
+-- „Abmelden“
```

### Ablauf
1. Der Admin öffnet den Dialog. Der Browser erzeugt einen **Vorschlag** aus einer kuratierten, neutralen Wortliste (Logistik und Natur, ohne verwechselbare Zeichen), mit sicherem Zufall.
2. „Passwort setzen“ schickt ID und Passwort an eine **neue Server-Route** (z. B. `POST /api/admin/users/{id}/password`). Sie prüft:
   - Admin? Nicht das eigene Konto?
   - Bereichs-Admin: Ziel ist Azubi im eigenen Bereich, sonst 404 (dieselbe Regel wie beim Sperren in `users/[id]/route.ts`).
   - Mindestens 8 Zeichen?
   - Rate-Limit: höchstens 20 Vergaben pro Admin und Stunde.
3. Die Route setzt mit der Service-Rolle das Passwort und die Markierung `must_change_password`. Danach **beendet sie alle Sitzungen** der Person.
4. Sie schreibt den Protokoll-Eintrag `user.password_set` (ohne Passwort) und antwortet nur mit „ok“. Das Passwort zeigt der Dialog aus seinem eigenen Speicher an und vergisst es beim Schließen.
5. Die Person meldet sich an. Der **Proxy** sieht die Markierung (sie steckt im Konto-Objekt, das er sowieso abruft, ohne zusätzliche Abfrage). Er leitet jede Seite auf `/passwort-festlegen` um, API-Aufrufe bekommen 403. Ausnahmen: die Pflicht-Seite selbst, ihre Schnittstelle und Abmelden.
6. Auf der Pflicht-Seite schickt die Person ihr neues Passwort an eine **zweite neue Route** (z. B. `POST /api/account/password`). Sie setzt das Passwort und entfernt die Markierung. Supabase lehnt dabei ein gleiches Passwort selbst ab („same password“). Dafür muss das vergebene Passwort nirgends gespeichert werden.
7. **„Passwort vergessen“** (`/reset-password`) nutzt künftig dieselbe Route. So erfüllt auch der Mail-Weg den Pflichtwechsel.

### Daten
| Was | Wo | Wer darf es ändern |
|---|---|---|
| Passwort | Supabase Auth (verschlüsselt, wie bisher) | Server-Route (Admin), Person selbst |
| Markierung „muss Passwort ändern“ | Supabase Auth `app_metadata` | nur Server (Service-Rolle) |
| Protokoll `user.password_set` | bestehende Tabelle `admin_audit_log` | nur Server |

**Sitzungen beenden:** Supabase bietet über die Admin-Schnittstelle kein „alle Geräte abmelden“ für eine fremde Person. Deshalb gibt es eine kleine Datenbank-Funktion, die die Sitzungen dieser Person löscht. Ausführen darf sie nur die Service-Rolle (Migration). Bis die Funktion läuft, schützt zusätzlich der Proxy: Auch eine alte Sitzung landet sofort auf der Pflicht-Seite.

**Rate-Limit:** Es braucht keine neue Tabelle. Die Route zählt die eigenen `user.password_set`-Einträge des Admins in der letzten Stunde im Änderungsprotokoll.

### Entscheidungen
| Entscheidung | Warum |
|---|---|
| Markierung in `app_metadata` statt Profil-Spalte | Die Person kann sie nicht selbst entfernen. Der Proxy bekommt sie ohne zusätzliche Datenbank-Abfrage pro Seitenaufruf. |
| Pflicht-Prüfung im Proxy | Eine zentrale Stelle für alle Seiten (Lernen, Hof, Admin-Bereich). Keine Seite kann sie vergessen. |
| Passwort-Vorschlag im Browser | Das Passwort muss sowieso einmal zum Server. Der Vorschlag braucht keinen Server-Aufruf, und „Neuer Vorschlag“ geht sofort. |
| Eigene Route für den Passwortwechsel der Person | Nur der Server darf die Markierung entfernen. Passwort setzen und Markierung entfernen passieren zusammen. |
| Wortliste als feste Datei im Code | Neutral kuratiert, ohne anstößige Kombinationen. Kein externer Dienst, kostenlos. |

### Berührte Stellen
- `src/proxy.ts`: Pflicht-Umleitung, vor den Rollen-Prüfungen.
- `src/app/admin/users/page.tsx`: Menüeintrag und Dialog (Dialog als eigene Komponente unter `src/components/admin/`).
- `src/app/reset-password/page.tsx`: nutzt die neue Route.
- Neu: Pflicht-Seite, zwei Routen, Wortliste mit Vorschlags-Funktion, Migration für „Sitzungen beenden“.
- `src/lib/roles.ts`: Der Pfad `/passwort-festlegen` gilt als „immer erlaubt“.

### Abhängigkeiten (Pakete)
Keine neuen Pakete.

### Tests
- Route Admin: Super-Admin ok; Bereichs-Admin bei eigenem Azubi ok, bei Lehrkraft, fremdem Bereich oder Admin 404; Lehrkraft 403; eigenes Konto 400; zu kurz 400; Rate-Limit 429; das Protokoll enthält kein Passwort.
- Route Person: setzt Passwort und entfernt Markierung; gleiches Passwort → verständliche Meldung; ohne Login 401.
- Proxy: markiert → Umleitung auf Pflicht-Seite (auch `/admin`), API 403; Pflicht-Seite und Abmelden bleiben erreichbar; nicht markiert → unverändert.
- Vorschlag: Format, keine verwechselbaren Zeichen, ausreichende Vielfalt.

### Umsetzung (2026-10-27)
- **Vorschlag:** `src/lib/password-suggestion.ts` — 80 neutrale Wörter ohne `l`, `I`, `O`, Umlaute; Zahl aus 2–9; `crypto.getRandomValues`. Tests prüfen Format, Zeichen und Streuung.
- **Dialog:** `src/components/admin/set-password-dialog.tsx` — Vorschlag, „Neuer Vorschlag“, Mindestlänge mit Hinweis am Feld, Hinweis bei gesperrtem Konto, danach Anzeige (Monospace) mit „Kopieren“. Beim Schließen wird das Passwort aus dem Speicher gelöscht. In der Nutzerliste als Schlüssel-Knopf neben „Sperren“ (gleiche Regel: Bereichs-Admin nur Azubis).
- **Admin-Route:** `POST /api/admin/users/[id]/password` — Bereichsprüfung wie beim Sperren (404), eigenes Konto 400, Zweitaccount (PROJ-29) 404, Rate-Limit 20/Stunde über `admin_audit_log` (429), setzt Passwort + `app_metadata.must_change_password = true`, beendet Sitzungen, Protokoll `user.password_set` ohne Passwort.
- **Migration:** `20261027_proj58_revoke_sessions.sql` — `admin_revoke_user_sessions(uuid)` (security definer, nur `service_role`) löscht `auth.sessions` und `auth.refresh_tokens`. Spaltentypen und Rechte in der Produktions-DB geprüft (nur lesend). Schlägt der Aufruf fehl, bleibt die Vergabe erfolgreich, denn der Proxy schickt auch alte Sitzungen auf die Pflicht-Seite.
- **Eigene Route:** `POST /api/account/password` — setzt das Passwort über die eigene Sitzung (Supabase lehnt ein unverändertes mit `same_password` ab) und entfernt danach den Merker per Service-Rolle. Auch `/reset-password` („Passwort vergessen“) nutzt jetzt diese Route.
- **Proxy:** `src/proxy.ts` — Merker gesetzt → jede Seite auf `/passwort-festlegen`, jede API außer `/api/account/password` 403; `/auth/*` bleibt erreichbar. Ohne Merker leitet `/passwort-festlegen` zur Start-Weiche. Konstanten in `src/lib/roles.ts`.
- **Pflicht-Seite:** `src/app/passwort-festlegen/page.tsx` im Schüler-Design (dunkel, mobil) mit „Abmelden“.
- **Abweichung:** keine inhaltliche. Der Spec-Beispielvorschlag wurde auf `Hafen-Kran-Birke-47` geändert, weil „Wolke“ ein verwechselbares `l` enthält.

## QA Test Results

**Datum:** 2026-10-27 · **Umfang:** Code-Review gegen alle AC und Edge Cases, Routen-, Proxy-, Komponenten- und Unit-Tests, Build, Lint, Prüfung der Produktions-DB (nur lesend: Spaltentypen `auth.sessions`/`auth.refresh_tokens`, DELETE-Recht von `postgres`). **Kein** Browser-Test (Nutzer-Vorgabe). Der echte Ablauf gegen Supabase (Passwort setzen → Login → Pflichtwechsel) ist deshalb **erst nach dem Deploy** einmal von Hand zu prüfen.

**Automatisiert:** `npm test` 1563 Tests grün · Build grün · Lint ohne Befund.
Neu: Admin-Route (13), eigene Route (7), Proxy (+4), Vorschlag (5), Pflicht-Seite (3), Nutzerliste (+4 für PROJ-58).

### Acceptance Criteria
| Bereich | Ergebnis |
|---|---|
| Eintrag mit Schlüssel-Icon in der Aktionsspalte | ✅ |
| Dialog nennt Name + E-Mail, Vorschlag im Format Wort-Wort-Wort-Zahl ohne 0/O/1/l/I | ✅ (Test) |
| „Neuer Vorschlag“, Feld änderbar, < 8 Zeichen → Hinweis + Speichern gesperrt | ✅ (Test) |
| Nach dem Setzen: Monospace-Anzeige, „Kopieren“, Hinweis „nicht gespeichert“ | ✅ (Test) |
| Beim Schließen weg, nirgends wieder abrufbar | ✅ (State wird geleert, Antwort enthält kein Passwort) |
| Toast „Passwort für {Name} gesetzt“ | ✅ |
| Merker gesetzt, Proxy leitet jede Seite (auch `/admin`) um, API 403 | ✅ (Proxy-Test) |
| Neues Passwort ≥ 8 und ≠ vergebenes | ✅ (Supabase `same_password`, Route-Test) |
| Nach Ändern Merker weg, Weiter zu `/start` · „Abmelden“ möglich | ✅ |
| Sitzungen beendet | ✅ Code + DB-Rechte geprüft · ⚠️ Live-Wirkung erst nach Migration + Deploy prüfbar |
| Rechte: Super-Admin alle außer sich · Bereichs-Admin nur eigene Azubis (sonst 404) · Lehrkraft 403 · eigenes Konto 400 | ✅ (Route-Tests) |
| Protokoll `user.password_set` ohne Passwort | ✅ (Test) · siehe BUG-58-1 |

### Edge Cases
- Gesperrtes Konto → erlaubt, Hinweis im Dialog ✅
- Netzfehler → Meldung, Eingabe bleibt, „Erneut versuchen“ ✅ (Test)
- „Passwort vergessen“ erfüllt Pflichtwechsel ✅ (gleiche Route; mit Merker landet der Reset-Link ohnehin auf der Pflicht-Seite)
- Admin-Konten mit Merker → auch im Lehrkräfte-Bereich umgeleitet ✅ (Test)
- Wortliste neutral ✅ (geprüft: 80 Wörter, keine verwechselbaren Zeichen)
- Zwei Admins gleichzeitig → das letzte Passwort gilt, zwei Protokoll-Einträge ✅

### Security (Red Team)
- **Rechte-Umgehung:** Bereichs-Admin auf Lehrkraft, fremden Bereich, Admin oder Zweitaccount → 404, ohne Hinweis auf die Existenz ✅. Ungültige ID → 404 ✅.
- **Merker selbst entfernen:** unmöglich. `app_metadata` lässt sich nur mit der Service-Rolle ändern, `updateUser` kennt nur `user_metadata` ✅. Mit dem vergebenen Passwort durch die eigene Route → `same_password`, der Merker bleibt ✅ (Test). Schlägt nur das Entfernen des Merkers fehl, wird bewusst **nicht** auf anderem Weg freigeschaltet ✅.
- **Passwort-Leck:** nicht in Antwort, Protokoll oder `console.error` (nur Fehlercodes) ✅.
- **DB-Funktion:** `security definer`, `search_path = ''`, `execute` nur für `service_role` ✅.
- **Rate-Limit:** 20 pro Admin und Stunde ✅ (Test). *Info:* Das Zählen läuft über das Protokoll. Fällt dessen Schreiben aus, wird nicht gezählt (gleiches Muster wie die bestehende Protokollierung).
- **CSRF:** Die Routen lesen JSON aus dem Body. Supabase-Cookies sind `SameSite=Lax`, ein fremder Formular-POST trägt also keine Sitzung mit ✅ (Muster wie bestehende Admin-Routen).
- **Hinzunehmendes Restrisiko (Info):** Wer das vergebene Passwort kennt (der Admin), könnte sich vor der Person anmelden und das Passwort selbst festlegen. Das liegt in der Natur des Features. Es fällt auf, weil die Person dann nicht mehr hineinkommt, und der Vorgang steht im Protokoll.

### Bugs
- **BUG-58-1 (Low) — ✅ behoben (Protokoll zeigt „Passwort neu vergeben“, „Rolle geändert“, „Bereich gewechselt“, alle drei auch im Filter):** Das Änderungsprotokoll zeigt `user.password_set` als Rohtext, und der Aktions-Filter bietet es nicht an. Das Gleiche gilt schon für die bestehenden `user.role_change` und `user.move_department`.
- **BUG-58-2 (Low) — ✅ behoben (Text jetzt „Du hast ein vorläufiges Passwort bekommen.“):** Die Pflicht-Seite sagt „Du hast ein Passwort von deiner Lehrkraft bekommen“. Bei Lehrkräften oder Admins, deren Passwort der Super-Admin vergeben hat, passt „Lehrkraft“ nicht.

### Ergebnis
**Production-ready: JA.** Keine Critical/High-Bugs. Vor dem Push muss die Migration `20261027_proj58_revoke_sessions.sql` in die Produktion. Ohne sie funktioniert alles, nur „andere Geräte abmelden“ entfällt, und der Proxy fängt das auf.

## Deployment
_To be added by /deploy_
