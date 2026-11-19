# PROJ-121: Lehrkräfte geben bei der ersten Anmeldung Vor- und Nachnamen an (Pflicht)

## Status: Deployed
**Created:** 2026-11-19
**Last Updated:** 2026-11-19

## Kontext
Im Lehrkräfte-Bereich erscheinen Personen mit ihrem Anzeigenamen (`profiles.display_name`), der oft nur aus der E-Mail-Adresse entstanden ist oder nur vom Super-Admin geändert werden kann (PROJ-59). Im Kollegium (Abwesenheitskalender und Vertretung PROJ-120, Lehrerzimmer PROJ-63, Änderungsverlauf PROJ-47, Nutzerliste) ist deshalb nicht immer klar, wer gemeint ist. Jede Lehrkraft soll daher ihren echten Namen angeben, und zwar sofort bei der ersten Anmeldung.

### Entscheidungen (Nutzer, 2026-11-19)
- **E1:** Es gibt eine **Pflicht** bei der ersten Anmeldung. Wer noch keinen Namen angegeben hat, kommt nicht in die App.
- **E2:** Die Pflicht gilt für **alle mit Zugang zum Lehrkräfte-Bereich**: Lehrkraft, Bereichs-Admin und Super-Admin. Azubis sind nicht betroffen.
- **E3:** Bestehende Konten ohne Namen werden **beim nächsten Login** ebenfalls gefragt.
- **E4:** Aus Vorname und Nachname wird **automatisch der Anzeigename** „Vorname Nachname“. Alle Stellen, die den Anzeigenamen zeigen, zeigen damit den echten Namen.
- **E5:** Der echte Name ist **nur für Lehrkräfte und Admins** sichtbar. Azubis sehen weiter nur Pseudonym bzw. Spielnamen (PROJ-44).
- **E6:** Die Lehrkraft kann den Namen später in „Mein Konto“ selbst ändern, aber nicht leeren.

## Dependencies
- Requires: PROJ-1 (Anmeldung), PROJ-44 (Lehrkraft-Rolle, Pseudonym), PROJ-45 (Lehrkräfte-Rahmen, `ws-*`-Farben), PROJ-50 (Mein Konto, Karte „Über mich“)
- Vorbild: PROJ-58 (Pflichtwechsel Passwort: Weiterleitung vor allem anderen, Seite `/passwort-festlegen`)
- Berührt: PROJ-59 (Umbenennen durch Super-Admin), PROJ-62 (Konten anlegen), PROJ-63 / PROJ-120 (Namen im Kollegium)

## User Stories
- Als **Lehrkraft** möchte ich bei der ersten Anmeldung meinen Vor- und Nachnamen eintragen, damit mich Kolleginnen und Kollegen erkennen.
- Als **Lehrkraft** möchte ich meinen Namen später in „Mein Konto“ korrigieren können (Tippfehler, Namensänderung).
- Als **Bereichs-Admin oder Super-Admin** möchte ich in Nutzerliste, Kalender, Lehrerzimmer und Verlauf echte Namen sehen, damit ich weiß, wer etwas getan hat.
- Als **Lehrkraft mit bestehendem Konto** möchte ich beim nächsten Login einmalig nach meinem Namen gefragt werden, ohne dass etwas anderes kaputtgeht.
- Als **Azubi** möchte ich, dass sich nichts ändert und ich weiterhin nur Pseudonyme von Lehrkräften sehe.
- Als **Super-Admin** möchte ich Namen weiterhin über die Nutzer-Detailseite korrigieren können, damit ich bei Fehlern helfen kann.

## Acceptance Criteria

### Pflichtabfrage
- [ ] Rollen `teacher`, `department_admin` und `admin` ohne gespeicherten Vor- und Nachnamen landen nach dem Login **vor allem anderen** auf der Seite „Wie heißt du?“ (`/name-festlegen`). Die Start-Weiche (`/start`), alle Seiten unter `/admin` und alle Verwaltungs-Schnittstellen (`/api/admin`) leiten dorthin um (bei APIs: Antwort 403 mit klarer Meldung), bis der Name gespeichert ist. *(Entscheidung 2026-11-19: reine Azubi-Seiten wie `/quiz` bleiben bewusst ungeprüft, siehe Tech Design C.2.)*
- [ ] Ist zusätzlich ein Passwortwechsel (PROJ-58) fällig, kommt **zuerst** das Passwort, danach der Name.
- [ ] Die Seite hat zwei Felder „Vorname“ und „Nachname“, einen Satz Erklärung („Dein Kollegium sieht dich mit diesem Namen.“) und die Schaltfläche „Weiter“. Sie nutzt `ws-*`-Farben, Bedienelemente ab 44 px, Fokus sichtbar, Layout für Handy und Laptop.
- [ ] „Abmelden“ ist auf der Seite möglich.
- [ ] Nach erfolgreichem Speichern geht die Person auf die Startseite ihres Bereichs (`/admin`), nicht zurück ins Leere.
- [ ] Azubis (`student`) werden nie auf diese Seite geleitet. Ruft ein Azubi sie direkt auf, geht er auf seine Startseite.

### Eingabe und Prüfung
- [ ] Beide Felder sind Pflicht. Leere oder nur aus Leerzeichen bestehende Eingabe ist nicht erlaubt.
- [ ] Länge je Feld 1 bis 60 Zeichen (nach Entfernen von Leerzeichen am Rand). Doppelte Leerzeichen innerhalb werden zu einem zusammengezogen.
- [ ] Erlaubt sind Buchstaben aller Sprachen (inkl. Umlaute, Akzente), Bindestrich, Apostroph, Punkt (z. B. „Anna-Lena“, „O’Neill“, „von der Heide“, „Dr.“). Ziffern, Sonderzeichen wie `<`, `>`, `@`, `/` und Emojis werden abgelehnt.
- [ ] Fehlermeldungen stehen verständlich direkt am Feld („Bitte gib deinen Vornamen ein.“). Speichern bestätigt mit Toast („Danke, {Vorname}!“).
- [ ] Die Schreibweise wird so gespeichert, wie sie getippt wurde (keine automatische Großschreibung).

### Speichern und Anzeigename
- [ ] Gespeichert werden `first_name` und `last_name` am Profil.
- [ ] Mit dem Speichern wird `display_name` automatisch auf „Vorname Nachname“ gesetzt, und zwar für Rollen `teacher`, `department_admin`, `admin`.
- [ ] Das Pseudonym (PROJ-44) und die Ranglisten-Einstellung bleiben unverändert. Azubis sehen weiter nur das Pseudonym.
- [ ] Der Änderungsverlauf und das Protokoll der Änderungen (`writeAuditLog`) halten fest: wer, wann, alter und neuer Name. Beim Erstmal-Eintragen steht „Name erstmals angegeben“.

### Ändern in „Mein Konto“
- [ ] Die Karte „Über mich“ zeigt Vor- und Nachnamen mit der Aktion „Name ändern“ (wie beim Kürzel: Bearbeiten, Speichern, Abbrechen).
- [ ] Beide Felder bleiben Pflicht. Leeren ist nicht möglich.
- [ ] Nach dem Ändern wird `display_name` mit angepasst, und die neue Schreibweise erscheint überall.

### Super-Admin
- [ ] „Umbenennen“ auf der Nutzer-Detailseite (PROJ-59) bleibt. Bei Lehrkräften und Admins ändert er Vor- und Nachnamen (zwei Felder) statt nur des Anzeigenamens, damit beide Werte nie auseinanderlaufen.
- [ ] Bei Azubis bleibt „Umbenennen“ wie bisher (nur Anzeigename).

### Sichtbarkeit
- [ ] Der echte Name erscheint nur im Lehrkräfte-Bereich (Nutzerliste, Kalender, Lehrerzimmer, Änderungsverlauf, Meldungs-Inbox).
- [ ] In der Azubi-Ansicht (Rangliste, Rückmeldung zu gemeldeten Fragen, Nachweise) erscheint bei Lehrkräften weiter nur das Pseudonym bzw. „Lehrkraft“. Das wird durch einen Test abgesichert.

### Bestehende Konten
- [ ] Beim Livegang haben alle bisherigen Lehrkräfte und Admins noch keinen Namen und werden beim nächsten Login einmalig abgefragt. Bis dahin bleibt ihr bisheriger Anzeigename erhalten.
- [ ] Das Feld darf bei bereits gespeicherten Konten zunächst leer sein. Es gibt keinen Vorschlag aus E-Mail oder Anzeigename, weil das Raten falsch wäre.

### Neue Konten
- [ ] Wird ein Konto neu freigeschaltet (PROJ-44) oder angelegt (PROJ-62, geplant), kommt es als Lehrkraft ohne Namen an und wird bei der ersten Anmeldung abgefragt.
- [ ] Wird ein Azubi später zur Lehrkraft befördert, wird er beim nächsten Login nach dem Namen gefragt.

## Edge Cases
- **Mehrere Tabs / zwei Geräte:** Wurde der Name auf einem Gerät gespeichert, lässt die Seite auf dem anderen Gerät beim nächsten Aufruf durch (kein Dauer-Umleiten, keine veraltete Sperre).
- **Sitzung läuft ab:** Die Pflicht prüft der Server bei jeder Anfrage. Wer die Seite offen lässt und neu anmeldet, wird erneut abgefragt, falls noch nichts gespeichert ist.
- **Gleicher Name bei zwei Personen:** Erlaubt (zwei „Anna Müller“). Der Name ist nicht eindeutig. Unterscheidbar bleiben Kürzel und E-Mail-Adresse in der Nutzerliste.
- **Sehr langer oder zusammengesetzter Name:** Wird mit „…“ gekürzt dargestellt, der volle Text steht im `title`. Beim Speichern wird nichts abgeschnitten.
- **Schadcode im Feld:** Eingaben mit `<`/`>` werden abgelehnt, überall wird maskiert ausgegeben.
- **Netzwerkfehler beim Speichern:** Meldung „Netzwerkfehler. Bitte versuche es erneut.“ und die Eingabe bleibt erhalten.
- **Fachbereich ohne Lehrkräfte-Zuordnung / Rolle entzogen:** Wird die Rolle entzogen (Lehrkraft wieder Azubi), entfällt die Pflicht sofort. Name und Anzeigename bleiben.
- **Kontolöschung (PROJ-60):** `first_name` und `last_name` werden mit dem Konto gelöscht bzw. anonymisiert wie der Anzeigename.
- **Rechte:** Lehrkräfte dürfen nur **ihre eigenen** Namensspalten schreiben. Ein Azubi darf sie weder lesen noch schreiben (API 403).
- **Wer die Seite überspringen will:** Direktaufruf einer Admin-URL, des Browser-Zurück-Knopfs oder einer API führt immer wieder auf die Pflichtseite zurück.
- **Erst-Anmeldung ist zugleich Passwortwechsel:** Reihenfolge Passwort, dann Name, ohne Endlosschleife.

## Technical Requirements
- Security: Schreiben nur am eigenen Profil, serverseitige Prüfung (Zod), Spaltenrechte wie beim Kürzel (`GRANT UPDATE (first_name, last_name)`). `display_name` selbst bleibt für Lehrkräfte nicht frei beschreibbar (PROJ-44), das Setzen erfolgt über die API.
- Performance: Die Pflichtprüfung darf keine zusätzliche Datenbankabfrage pro Seitenaufruf auslösen (Vorbild PROJ-58: Markierung im Token statt Abfrage).
- Datenschutz (DSGVO): Echte Namen sind personenbezogen. Sie werden nur im Lehrkräfte-Bereich angezeigt und sind in der Kontolöschung berücksichtigt. Hinweis in der Datenschutzerklärung prüfen.
- Tests: Wächtertest, dass Azubi-Seiten und -APIs keine echten Namen von Lehrkräften ausgeben (wie bei den Freigabelisten, siehe `roles.ts`).

## Nicht Teil dieses Features
- Vorschläge zum Namen aus der E-Mail-Adresse.
- Titel, Anrede, Kürzel-Automatik. Das Kürzel bleibt freiwillig (PROJ-50).
- Echte Namen für Azubis.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Kurzfassung
Das Feature braucht ein **Backend**: zwei neue Felder am Profil, eine kleine Schnittstelle zum Speichern und eine Pflichtprüfung im Türsteher der App (Proxy). Neue Pakete werden nicht gebraucht. Alles baut auf vorhandenen Mustern auf: Pflicht-Seite wie bei PROJ-58, Bearbeiten-Feld wie beim Kürzel (PROJ-50).

### A) Bausteine (Komponentenbaum)
```
Pflicht-Seite „Wie heißt du?“ (neue, eigenständige Seite, ohne Seitenleiste)
+-- Kopf: Titel + ein Satz („Dein Kollegium sieht dich mit diesem Namen.“)
+-- Formular
|   +-- Feld „Vorname“ (Fehlertext direkt am Feld)
|   +-- Feld „Nachname“ (Fehlertext direkt am Feld)
|   +-- Schaltfläche „Weiter“ (Ladezustand beim Speichern)
+-- „Abmelden“ (wie bei der Passwort-Pflichtseite)

Mein Konto (vorhanden) → Karte „Über mich“
+-- Überschrift: bisher nur der Anzeigename, künftig „Vorname Nachname“
+-- NEU: Zeile „Name“ mit Aktion „Name ändern“
|   +-- zwei Felder Vorname / Nachname, Speichern, Abbrechen (wie beim Kürzel)
+-- Fachbereich, Kürzel (unverändert)

Nutzer-Detailseite (Super-Admin, vorhanden) → Dialog „Umbenennen“
+-- Bei Lehrkräften/Admins: zwei Felder statt einem
+-- Bei Azubis: unverändert ein Feld
```
Nach der Pflicht-Seite geht die Person auf ihre Startseite (`/admin` bzw. die Start-Weiche).

### B) Daten (in Alltagssprache)
Am Profil jeder Person kommen zwei **freiwillige** Felder dazu:
- Vorname (1–60 Zeichen)
- Nachname (1–60 Zeichen)

„Noch nicht angegeben“ heißt: beide Felder sind leer. Daran erkennt die App, wen sie fragen muss. Bestehende Lehrkräfte und Admins haben beim Livegang automatisch noch keinen Namen und werden damit beim nächsten Login gefragt. Es muss nichts nachträglich befüllt oder markiert werden.

Der **Anzeigename** bleibt das Feld, das die ganze App schon benutzt. Er wird beim Speichern automatisch auf „Vorname Nachname“ gesetzt. Dadurch ändern sich Kalender, Lehrerzimmer, Verlauf und Nutzerliste ohne Einzelanpassung. Das Pseudonym wird nicht angefasst.

Gespeichert wird in der bestehenden Profil-Tabelle. Es entsteht keine neue Tabelle. Protokoll: Jede Namensänderung kommt ins vorhandene Änderungsprotokoll der Verwaltung (wer, wann, alter und neuer Name, beim ersten Mal „Name erstmals angegeben“).

### C) Technische Entscheidungen (mit Begründung)

**1. Wie erkennt die App, dass jemand noch einen Namen angeben muss? → Aus dem Profil, nicht aus einer Markierung im Konto.**
Bei PROJ-58 (Passwort) steht eine Markierung im Konto der Person. Hier wäre das riskanter: Alle bestehenden Konten müssten nachträglich markiert werden, und bei jeder Rollenvergabe („Azubi wird Lehrkraft“, Freischaltung, später PROJ-62) müsste jemand daran denken, die Markierung zu setzen. Vergisst es eine Stelle, ist die Pflicht umgangen. Wenn die App stattdessen schlicht schaut, ob Vorname und Nachname im Profil leer sind, gilt die Regel automatisch für alle: heute, morgen und für jede künftige Rollenvergabe.
Keine zusätzliche Datenbankabfrage: Der Türsteher liest für Lehrkräfte-Seiten die Rolle ohnehin schon aus dem Profil. Die beiden Namensfelder kommen in dieselbe Abfrage.

**2. Wo wird die Pflicht durchgesetzt? → Im Lehrkräfte-Bereich, an der Start-Weiche und in allen Verwaltungs-Schnittstellen.**
- Alle Seiten und Schnittstellen unter `/admin` und `/api/admin`: Türsteher schickt Seiten auf die Pflicht-Seite, Schnittstellen bekommen die Antwort 403 mit klarer Meldung.
- Start-Weiche (`/`, Ziel nach dem Login): schickt Lehrer-Rollen ohne Namen auf die Pflicht-Seite.
- Der Passwort-Pflichtwechsel (PROJ-58) bleibt davor. Es gibt dadurch keine Schleife.
- **Abweichung von der Spec (zur Freigabe):** Die Spec sagt „alle Seiten“. Die reinen Azubi-Seiten (z. B. `/quiz`, `/shop`) würden eine Lehrkraft ohne Namen über die direkte Adresse weiter erreichen. Eine Prüfung dort würde bei **jedem** Seitenaufruf aller Azubis eine zusätzliche Abfrage kosten, obwohl es sie nicht betrifft. Da die Lehrkraft über Login, Start-Weiche und den ganzen Lehrkräfte-Bereich nicht an der Pflicht vorbeikommt und auf den Azubi-Seiten keine Namen angezeigt werden, schlage ich vor, es dabei zu belassen. Wollt ihr es doch lückenlos, geht das über eine zusätzliche Markierung im Konto (Aufwand: Rollenvergabe-Stellen anpassen, bestehende Konten markieren).

**3. Wer darf was schreiben? → Nur die Person selbst, nur über die neue Schnittstelle.**
Der Server prüft Rolle und Eingabe (Länge, erlaubte Zeichen, keine `<`/`>`), schreibt dann Vorname, Nachname und den abgeleiteten Anzeigenamen in einem Schritt. Dass Vor- und Nachname und Anzeigename nie auseinanderlaufen, ist wichtiger als eine direkte Schreibmöglichkeit am Feld. Deshalb schreibt der Server den Anzeigenamen mit erhöhten Rechten, und Azubis können die neuen Felder weder lesen noch schreiben. Dasselbe gilt für „Umbenennen“ des Super-Admins: Er ändert Vor- und Nachnamen, der Anzeigename zieht automatisch nach.

**4. Pflicht-Seite außerhalb von `/admin`.**
Wie die Passwort-Pflichtseite liegt sie auf einer eigenen Adresse (`/name-festlegen`), ohne Seitenleiste, damit nichts anderes bedienbar ist. Sie verwendet die Farben des Lehrkräfte-Bereichs (hell/dunkel nach gemerkter Darstellung), nicht die dunkle Azubi-Optik. Wer sie ohne Pflicht aufruft (Azubi oder Name schon da), wird auf die Startseite geschickt, wie bei der Passwort-Seite.

**5. Sicherheit gegen Umgehung.**
Die Prüfung läuft bei jeder Anfrage auf dem Server. Zurück-Knopf, Direktaufruf einer Admin-Adresse oder eine zweite Sitzung ändern nichts. Das Absenden wirkt sofort, auch auf dem zweiten Gerät.

**6. Datenschutz & Löschen.** Die neuen Felder gehören zum Konto und werden bei „Konto löschen“ (PROJ-60) wie der Anzeigename entfernt bzw. anonymisiert. Das ist bei der Umsetzung zu prüfen. Datenschutzerklärung um „Vor- und Nachname der Lehrkräfte“ ergänzen.

### D) Berührte vorhandene Stellen (zum Anpassen, nicht neu bauen)
| Stelle | Änderung |
|---|---|
| Türsteher (Proxy) | Namens-Pflicht für Lehrer-Rollen auf `/admin` und `/api/admin` |
| Start-Weiche (Startseite) | Lehrer-Rollen ohne Namen → Pflicht-Seite |
| „Mein Konto“ (Daten und Karte „Über mich“) | Name anzeigen und ändern |
| Nutzer-Detailseite, „Umbenennen“ | Zwei Felder bei Lehrkräften und Admins |
| Konto löschen (PROJ-60) | Neue Felder mit entfernen |
| Freigabelisten der Rollen (`roles.ts`) | Neue Seite und Schnittstelle eintragen (zwei Listen, mit Wächtertest) |

### E) Neu zu bauen
- Eine Datenbank-Migration (zwei Felder am Profil, Spalten-Rechte)
- Eine Schnittstelle „eigenen Namen speichern“
- Die Pflicht-Seite „Wie heißt du?“
- Eine gemeinsame Namens-Prüfregel (eine Quelle für Seite, Konto und Admin-Dialog)
- Tests: Pflicht-Weiterleitung, Eingabe-Regeln, Rechte (Azubi 403), „Azubis sehen keine echten Namen“

### F) Pakete
Keine neuen. Formular und Prüfung nutzen die vorhandenen Bausteine (react-hook-form, Zod, shadcn/ui).

### G) Empfohlene Reihenfolge
1. `/backend`: Migration, Schnittstelle, Prüfregel, Türsteher-Pflicht, Start-Weiche, Umbenennen, Löschen
2. `/frontend`: Pflicht-Seite, Karte „Über mich“, Dialog „Umbenennen“
3. `/qa`: Opus-Prüfung der Umgehungswege (Zurück-Knopf, zweite Sitzung, Rollenwechsel)
4. Migration **vor** dem Push einspielen (siehe Deploy-Ablauf), weil sonst die Seite die neuen Felder nicht findet.

## Implementation Notes – Backend (2026-11-19)
Entscheidung des Nutzers: Tech Design Variante 1 (Pflicht im Lehrkräfte-Bereich und an der Start-Weiche, ohne Konto-Markierung).

**Neu**
- Migration `supabase/migrations/20261123_proj121_lehrkraft_name.sql` (+ `_down`): `profiles.first_name`, `profiles.last_name` (NULL = nicht angegeben, Länge 1–60). **Kein** Spalten-Recht für Nutzer, geschrieben wird nur über die Service-Rolle. **Noch nicht eingespielt.**
- `src/lib/personen-name.ts`: gemeinsame Prüfregel (Zod), `composeDisplayName`, Protokoll-Aktion `user.name_set`.
- `src/app/api/profile/name/route.ts`: `PATCH` für den eigenen Namen. Nur Lehrer-Rollen (Azubi 403). Schreibt Vorname, Nachname und Anzeigename in einem Schritt, Protokoll mit „erstmals angegeben“ bzw. alt/neu, nichts bei unverändertem Namen. Fehler mit Feldangabe (`field`) für die Meldung am Feld.
- `src/lib/roles.ts`: `NAME_REQUIRED_PATH`, `NAME_API_PATH`, `NAME_REQUIRED_MESSAGE`, `hasPersonName` (liegt hier statt in `personen-name.ts`, damit der Türsteher kein Zod lädt).

**Geändert**
- `src/proxy.ts`: im `/admin`-Block werden `first_name`/`last_name` mit derselben Abfrage wie die Rolle gelesen (keine zusätzliche Abfrage). Lehrer-Rolle ohne Namen: Seiten → `/name-festlegen`, `/api/admin` → 403 mit Meldung. Passwort-Pflichtwechsel bleibt davor.
- `src/app/start/page.tsx`: Lehrer-Rolle ohne Namen → `/name-festlegen`.
- `src/app/api/admin/users/[id]/rename/route.ts`: bei Lehrer-Rollen `{ firstName, lastName }` (Anzeigename zieht nach), bei Azubis unverändert `{ name }`.
- `src/lib/konto-data.ts`: `KontoHead` um `firstName`/`lastName` erweitert.
- `src/lib/user-detail.ts`: Klartext „Name selbst angegeben“.

**Tests (alle grün):** `personen-name.test.ts`, `api/profile/name/route.test.ts`, `proxy.test.ts` (Pflicht-Name, 3 Rollen, Passwort zuerst, kein Schleifen), `rename/route.test.ts` (Lehrer-Rollen), `konto.test.tsx`. `tsc` und ESLint ohne Befund. Im gesamten Lauf scheitert ein vorhandener, unabhängiger Test: `werkzeugkiste-auszug.test.ts` (Regal-Urheber im Untertitel).

**Konto löschen (PROJ-60):** Nichts nötig. Der Ablauf löscht zuletzt das Auth-Konto samt Profil, damit auch die neuen Spalten.

**Noch offen**
- Vor dem Push: Migration einspielen (Deploy-Ablauf), sonst gibt es die Namensspalten nicht.
- Datenschutzerklärung: In der App gibt es keine eigene Seite dazu. Den Hinweis „Vor- und Nachname der Lehrkräfte“ muss die Schule dort ergänzen, wo sie die Erklärung führt.
- Browser-Prüfung durch den Nutzer (kein Dev-Server von mir): Ablauf mit einer Lehrkraft ohne Namen, hell/dunkel, Handy.

## Implementation Notes – Frontend (2026-11-19)
**Neu**
- `src/app/name-festlegen/page.tsx`: Server-Wache. Nicht angemeldet → Login; Azubi, Rolle entzogen oder Name schon da → `/start`; sonst die Seite. Liest die Darstellung aus dem Cookie `ws_theme`.
- `src/components/name-festlegen-form.tsx`: Pflicht-Seite „Wie heißt du?“ mit Vorname, Nachname, „Weiter“ und „Abmelden“. Eigenständig ohne Seitenleiste, nur `ws-*`-Farben, Bedienelemente ab 44 px. Leere Felder melden sich erst nach „Weiter“. Nach dem Speichern erscheint „Danke, {Vorname}!“ und nach 0,8 s die volle Navigation zu `/start` (damit der Türsteher neu entscheidet). 401 → Login, 403 → `/start`, Netzwerkfehler mit Satz, Eingabe bleibt.
- `src/components/admin/person-name-fields.tsx`: gemeinsame Felder und `validatePersonName` für Pflicht-Seite, „Mein Konto“ und Umbenennen-Dialog.

**Geändert**
- `konto-ueber-mich.tsx`: Die Überschrift der Karte zeigt den Namen mit Stift „Name ändern“; beim Bearbeiten ersetzen zwei Felder (Speichern/Abbrechen, kein Leeren möglich) die Überschrift. Fehlt ein Teil, steht darunter ein Hinweis. (Nach QA BUG-4 so umgebaut, der Name steht nur einmal.)
- `user-detail-dialogs.tsx` / `user-detail-view.tsx` / `types.ts` / `user-detail-server.ts` / `users/_lib/target.ts`: Der Overview-Abschnitt liefert `firstName`/`lastName`. Der Umbenennen-Dialog zeigt bei Lehrer-Rollen zwei Felder (sendet `{ firstName, lastName }`), bei Azubis unverändert „Anzeigename“.

**Tests (alle grün):** `name-festlegen-form.test.tsx` (9), `app/name-festlegen/page.test.tsx` (6), `konto.test.tsx` (+5), `user-detail-view.test.tsx` (+2). Gesamtlauf: 4079 von 4080 grün, `tsc` und ESLint ohne Befund. Der eine Fehler ist der vorhandene, unabhängige `werkzeugkiste-auszug.test.ts`.

## QA Test Results
**Getestet:** 2026-11-19 · **Art:** Code- und Datenbank-Prüfung (Quelltext, automatische Tests, Lesezugriff auf die Produktionsdatenbank). **Nicht getestet:** Browser (Chrome/Firefox/Safari), 375/768/1440 px, echter Anmelde-Ablauf. Grund: Kein Dev-Server und kein Playwright auf diesem Rechner (Absturzgefahr), und der Code ist noch nicht live. Das muss der Nutzer einmal von Hand prüfen (siehe unten).

### Automatische Tests
- Gesamtlauf: **4082 von 4083 grün**. Der eine Fehler (`werkzeugkiste-auszug.test.ts`, Regal-Urheber im Untertitel) tritt auch auf einem sauberen Stand ohne PROJ-121 auf und gehört nicht zu diesem Feature.
- `tsc` und ESLint ohne Befund.
- Neu in der QA: `src/lib/personen-name-waechter.test.ts` (3 Tests). Er hält fest, welche Dateien die Namensfelder anfassen, und schlägt fehl, sobald eine Azubi-Seite oder Azubi-Schnittstelle sie benutzt (mit einer Probedatei nachgewiesen, danach entfernt).
- Keine Playwright-Tests geschrieben: ohne Browser-Lauf wären es ungeprüfte Tests.

### Acceptance Criteria
| Bereich | Kriterium | Ergebnis |
|---|---|---|
| Pflicht | Lehrer-Rollen ohne Namen → Pflicht-Seite (Seiten unter `/admin`, Start-Weiche) | Bestanden (Proxy- und Seiten-Tests, 3 Rollen) |
| Pflicht | `/api/admin` → 403 mit klarer Meldung | Bestanden |
| Pflicht | Passwortwechsel kommt zuerst, keine Schleife | Bestanden (Test) |
| Pflicht | Seite hat zwei Felder, Erklärsatz, „Weiter“, „Abmelden“; 44 px; `ws-*`-Farben | Bestanden im Code und Komponententest; **Optik nicht im Browser gesehen** |
| Pflicht | Danach Startseite des Bereichs | Bestanden (Test, über `/start`) |
| Pflicht | Azubis nie auf der Seite | Bestanden (Seiten-Wache und Türsteher-Test) |
| Eingabe | Pflicht, 1–60 Zeichen, erlaubte Zeichen, Ziffern/`<`/`@`/Emoji abgelehnt, Leerzeichen bereinigt | Bestanden (Einheitentests) |
| Eingabe | Meldung am Feld, Toast „Danke, {Vorname}!“ | Bestanden (Komponententest) |
| Speichern | Vorname, Nachname und Anzeigename „Vorname Nachname“ in einem Schritt | Bestanden |
| Speichern | Pseudonym und Rangliste unberührt | Bestanden |
| Speichern | Protokoll „erstmals angegeben“ bzw. alt/neu | Bestanden |
| Mein Konto | „Name ändern“ (Stift an der Überschrift), beide Pflicht, Anzeigename zieht nach | Bestanden |
| Super-Admin | Zwei Felder bei Lehrer-Rollen, Azubis unverändert | Bestanden |
| Sichtbarkeit | Azubis sehen keine echten Namen | Bestanden: Rangliste zeigt bei Lehrkräften nur das Pseudonym (vorhandener Test), kein Azubi-Pfad liest die Namensfelder (Wächtertest), und die Datenbank erlaubt Azubis nur die eigene Zeile (RLS geprüft) |
| Bestehende Konten | Beim nächsten Login gefragt, ohne Nachpflege | Bestanden (Regel „leer = fragen“) |
| Neue Konten / Beförderung | Gefragt | Bestanden (gleiche Regel) |
| Rolle entzogen | Pflicht entfällt | Bestanden |
| Konto löschen | Spalten verschwinden mit dem Profil | Bestanden (Ablauf liest PROJ-60 durch) |
| Zwei Geräte | Zweites Gerät wird nicht dauernd umgeleitet | Bestanden (Seiten-Test) |

### Sicherheitsprüfung
- **Rechte in der Datenbank (live geprüft):** Auf `profiles` darf ein angemeldeter Nutzer nur die eigene Zeile lesen, und das Schreiben ist nur für wenige Spalten freigegeben. `first_name`/`last_name` haben kein Schreibrecht für Nutzer (Tabellen-UPDATE ist entzogen, neue Spalten erben nichts). Direktes Schreiben über den öffentlichen Schlüssel ist damit nicht möglich.
- **Mass-Assignment:** Rolle, Id und Anzeigename im Body werden ignoriert (Test).
- **Eingabe:** `<`, `>`, Steuer- und Bidi-Zeichen werden abgelehnt, Ausgabe erfolgt als Text. Regulärer Ausdruck ist linear (kein ReDoS).
- **Umgehung der Pflicht:** Direktaufruf von `/admin/...`, Zurück-Knopf, API-Aufruf: alle serverseitig gesperrt. Kein Merker im Konto, den man beeinflussen könnte.
- **Abmelden** auf der Pflicht-Seite funktioniert unabhängig vom Türsteher.

### Gefundene Fehler (alle behoben, Stand 2026-11-19)
| ID | Schwere | Beschreibung | Behebung |
|---|---|---|---|
| BUG-1 | Mittel | Die Datenbank erlaubte jedem angemeldeten Nutzer, `display_name` der eigenen Zeile direkt zu schreiben (Spalten-Recht aus PROJ-22, live bestätigt). Eine Lehrkraft konnte sich so einen beliebigen Anzeigenamen geben, auch den einer Kollegin. | Datenbank-Regel `profiles_name_schutz` in der Migration: Bei Lehrer-Rollen lehnt sie jede Änderung von `display_name` ab, die über die Nutzer-Sitzung kommt. Server-Schnittstellen (Service-Rolle) und Azubis sind nicht betroffen. Nachweis durch die Probe [proj121_name_probe.sql](../supabase/tests/proj121_name_probe.sql). |
| BUG-2 | Mittel (Livegang) | Ohne Migration bekommen alle Lehrkräfte und Admins „Kein Zugang“, weil die Abfragen die neuen Spalten lesen. | Per Ablauf: Migration zuerst, Spalten live prüfen, dann erst pushen. Die `_down`-Datei nennt die Rückroll-Reihenfolge (erst Code, dann Migration). |
| BUG-3 | Niedrig | Kein Ratenlimit auf `PATCH /api/profile/name`. | Gelöst durch das globale Limit im Türsteher (120 schreibende Aufrufe pro Minute und Person, Commit 8bfdae7). Keine eigene Änderung nötig. Das Limit wirkt erst, wenn dessen Migration `20261124_rate_limit.sql` eingespielt ist. |
| BUG-4 | Niedrig | Der Name stand in „Mein Konto“ doppelt. | Der Name ist jetzt die Überschrift der Karte mit Stift „Name ändern“; beim Bearbeiten ersetzen die zwei Felder die Überschrift. Fehlt ein Teil, steht darunter „Vor- und Nachname noch nicht angegeben.“ |
| BUG-5 | Niedrig | Das Zeichen ‘ war im Namen nicht erlaubt. | Erlaubt (zusammen mit ' und ’). Test ergänzt. |

### Nicht prüfbar ohne Browser (Aufgabe für den Nutzer, ca. 5 Minuten)
1. Lehrkraft ohne Namen anmelden → Pflicht-Seite erscheint, Felder leer, Fehlertexte, Speichern, „Danke“, Landung auf `/admin`.
2. Gleiche Lehrkraft: Zurück-Knopf und `/admin/questions` direkt → bleibt gesperrt, solange kein Name da ist (vor dem Speichern).
3. Hell, dunkel, Handy: Lesbarkeit und Bedienbarkeit der Pflicht-Seite und der Zeile „Name“ in „Mein Konto“.
4. Super-Admin: Nutzer-Detailseite → „Name ändern“ bei Lehrkraft (zwei Felder) und bei Azubi (ein Feld).

### Entscheidung
**Produktionsreif: JA, unter Bedingungen.** Keine kritischen oder hohen Fehler. Bedingungen: (1) Migration vor dem Push einspielen und mit der Probe prüfen (BUG-1/BUG-2), (2) einmal die vier Browser-Schritte oben durchgehen.

## Deployment
**Live seit 2026-11-19** (Commit 7d757f7, Vercel-Production `spedilern`, Build Ready nach etwa 2 Minuten).

**Ablauf**
1. Migration `20261123_proj121_lehrkraft_name.sql` vom Nutzer im SQL-Editor eingespielt, danach Probe `proj121_name_probe.sql`: `spalten=2, trigger=1`, alle vier Prüfungen `true`.
2. Lesend nachgeprüft: Spalten `first_name`/`last_name`, beide Längen-Regeln und der Schutz `profiles_name_schutz` stehen in der Produktion.
3. Push mit genau einem Commit (nichts Fremdes mitgefahren).
4. Ohne Login geprüft: `/name-festlegen`, `/admin`, `/start` leiten zum Login (307), `PATCH /api/profile/name` und `POST …/rename` antworten 401.

**Beim Livegang betroffen:** 21 Konten mit Lehrer-Rolle (Lehrkraft, Bereichs-Admin, Super-Admin) hatten noch keinen Namen und werden beim nächsten Login einmalig gefragt.

**Offen**
- Browser-Prüfung durch den Nutzer (vier Schritte im Abschnitt QA).
- Datenschutzerklärung der Schule um „Vor- und Nachname der Lehrkräfte“ ergänzen (in der App gibt es keine eigene Seite dafür).
- Rückrollen nur in dieser Reihenfolge: erst Code, dann `20261123_proj121_lehrkraft_name_down.sql`.
