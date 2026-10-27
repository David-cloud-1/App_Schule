# PROJ-58: Passwort neu vergeben (mit Pflichtwechsel)

## Status: Planned
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
- [ ] Ein Dialog nennt Name und E-Mail der Person und zeigt ein Feld mit einem **Vorschlag**: drei deutsche Wörter plus zweistellige Zahl, mit Bindestrichen getrennt (z. B. `Hafen-Kran-Wolke-47`). Er enthält keine verwechselbaren Zeichen (0/O, 1/l/I).
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
