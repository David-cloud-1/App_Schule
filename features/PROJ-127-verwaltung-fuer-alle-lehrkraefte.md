# PROJ-127: Verwaltung für alle Lehrkräfte (Bereichs-Admin und Lehrkraft zusammenlegen)

## Status: Approved
**Created:** 2026-11-22
**Last Updated:** 2026-11-22

## Kontext
Heute gibt es zwei Lehrer-Rollen mit fast gleichem Inhalt: **Lehrkraft** (`teacher`) und **Bereichs-Admin** (`department_admin`). Seit PROJ-70 sehen und bearbeiten beide alle Lerninhalte, und jede Änderung ist protokolliert und rückgängig zu machen (PROJ-47). Der echte Unterschied ist die Gruppe **„Verwaltung“** im Menü: Nutzer, Fachbereich-Einstellungen, Items, Änderungsprotokoll und „Fragen aus Material“. Sie sehen heute nur Bereichs-Admins und der Super-Admin.

Entscheidung des Nutzers (2026-11-22): **Alle Lehrkräfte dürfen die Verwaltung nutzen** („Vertrauen statt Freigabe“, wie bei PROJ-47/48/70), **sofern jede Änderung nachvollziehbar ist (von wem, wann, alter und neuer Wert)**. Die Rolle Bereichs-Admin wird damit überflüssig. Gefährliche, nicht rückholbare Aktionen und die Rollenvergabe bleiben beim Super-Admin.

Abgrenzung: Die neue Rolle **Sekretariat** und die **„Ansicht als Rolle“-Vorschau** sind eigene, spätere Projekte.

## Dependencies
- Requires: PROJ-24 (Fachbereichs-Admins & Rechtetrennung) – bisherige Verwaltungsrechte und Bereichsprüfung
- Requires: PROJ-44 (Lehrkraft-Rolle & Freischaltung) – Rolle `teacher`, Vergabe nur durch den Super-Admin
- Requires: PROJ-47 (Änderungsverlauf & Wiederherstellen) – Rückgängig für Inhalte
- Requires: PROJ-49 (Lehrkraft und Bereichs-Admin sichtbar trennen) – Texte und Menügruppen, die angepasst werden
- Requires: PROJ-70 (Inhalte offen für alle, lückenlos protokolliert) – Bereichsleiste für alle Lehrkräfte, gleiches Vertrauensmodell
- Requires: PROJ-9 / PROJ-24 – bestehendes Änderungsprotokoll (`admin_audit_log`)

## Entscheidungen (2026-11-22)
1. **Bereich:** Die Verwaltung gilt wie bei den Inhalten für **alle Bereiche mit der Bereichsleiste** (PROJ-70). Die Lehrkraft wählt Spedition oder Tourismus und verwaltet dort. Kein fester Bereich pro Lehrkraft nötig.
2. **Rückgängig:** Bei Items und Fachbereich-Einstellungen steht im Änderungsprotokoll der **alte und der neue Wert**. Zurücksetzen geschieht **von Hand**. Kein eigener Versionsverlauf und kein „Zurücksetzen“-Knopf.
3. **Rolle Bereichs-Admin:** Die bestehenden Bereichs-Admins (rund 11 Konten) werden per Migration auf **Lehrkraft** umgestellt. Der Code der Rolle `department_admin` bleibt zunächst ungenutzt stehen und wird in einem späteren Aufräum-Schritt entfernt.
4. **Bleibt beim Super-Admin:** Konto löschen (PROJ-60), Fortschritt zurücksetzen, Rollen und Status vergeben (Lehrkraft, Vertretungslehrkraft, später Sekretariat), Fachbereiche anlegen, Zuständigkeiten, Abwesenheitsarten.
5. **Keine eigene Historie** für Items, Passwort, Fortschritt und Löschen. Das Änderungsprotokoll reicht.

## User Stories
- Als **Lehrkraft** möchte ich Items und Fachbereich-Einstellungen eines Bereichs pflegen, ohne den Super-Admin zu fragen, damit ich Dinge selbst schnell richtigstellen kann.
- Als **Lehrkraft** möchte ich in der Nutzerliste Azubis sperren, entsperren, in einen anderen Bereich verschieben und ihnen ein neues Passwort vergeben, damit ich meiner Klasse bei Problemen sofort helfe.
- Als **Lehrkraft** möchte ich „Fragen aus Material“ nutzen, damit ich Fragen aus meinem Skript erzeugen kann.
- Als **Lehrkraft** möchte ich im Änderungsprotokoll sehen, wer was wann geändert hat, auch den alten Wert, damit ich Fehler zurückdrehen und die Person fragen kann.
- Als **Super-Admin** möchte ich bei jeder Verwaltungsaktion einer Lehrkraft sehen, wer sie ausgeführt hat und was vorher dort stand, damit ich bei Missbrauch oder Versehen eingreifen kann.
- Als **Super-Admin** möchte ich, dass Löschen, Fortschritt zurücksetzen und Rollenvergabe nur ich ausführen kann, damit nichts Unwiderrufliches durch ein Versehen passiert.
- Als **bisheriger Bereichs-Admin** möchte ich nach der Umstellung alles weiter tun können, was ich bisher getan habe (außer den Super-Admin-Aktionen), ohne neu angelernt zu werden.

## Acceptance Criteria

### Zugang und Menü
- [ ] Jede Lehrkraft (`teacher`) sieht im Menü die Gruppe „Verwaltung“ mit **Nutzer, Fachbereich (Einstellungen), Items, Änderungsprotokoll**. Für den Super-Admin bleiben zusätzlich Zuständigkeiten, Abwesenheitsarten, Fachbereiche und **Fragen aus Material**.
- [ ] **Bezahlte KI bleibt beim Super-Admin** (Entscheidung 2026-11-22, Architektur): „Fragen aus Material“ und „Prüfungsset aus PDF auslesen“ rufen die kostenpflichtige Claude-API auf. Beide sind nur für den Super-Admin sichtbar und aufrufbar (403 für Lehrkräfte). Lehrkräfte nutzen den kostenlosen Kopier-Prompt (PROJ-38).
- [ ] **„Alle Änderungen einer Person zurücknehmen“** (PROJ-47) darf jede Lehrkraft nutzen. Das Zurücknehmen erzeugt neue Versionen und ist damit selbst umkehrbar.
- [ ] Die Seiten sind auch per direktem Link für Lehrkräfte erreichbar (Seitenliste in `roles.ts`). Die Schnittstellen unter `/api/admin/**` für diese Seiten sind für Lehrkräfte freigegeben (Schnittstellenliste in `roles.ts`).
- [ ] Die Lehrkraft arbeitet in dem Bereich, den sie in der Bereichsleiste gewählt hat (PROJ-70). Ohne Wahl gilt der Standardbereich wie bisher bei Lehrkräften.
- [ ] Der Menüpunkt „Meine Fächer“ bleibt für alle Lehrkräfte erhalten, weil er weiter zu den Fach-Zuständigkeiten (PROJ-48) gehört.

### Nutzerverwaltung durch Lehrkräfte
- [ ] Eine Lehrkraft sieht in der Nutzerliste **nur Azubis** (`role = student`) des gewählten Bereichs, keine anderen Lehrkräfte und keine Super-Admins.
- [ ] Eine Lehrkraft darf bei Azubis: **sperren, entsperren, in einen anderen Bereich verschieben, Passwort neu vergeben** (mit Pflichtwechsel, PROJ-58). Das entspricht dem, was ein Bereichs-Admin heute darf.
- [ ] Eine Lehrkraft darf bei **Konten anderer Lehrkräfte oder des Super-Admins** nichts ändern (Server liefert 403, nicht nur ausgeblendet).
- [ ] **Nur der Super-Admin** darf: Konto löschen, Fortschritt zurücksetzen, Rolle oder Status (Lehrkraft, Vertretungslehrkraft, Sekretariat) vergeben oder entziehen, Konten per CSV anlegen, Nutzer exportieren (soweit heute Super-Admin-only). Die Knöpfe sind für Lehrkräfte nicht sichtbar; ein direkter Aufruf der Schnittstelle liefert 403.

### Items und Fachbereich-Einstellungen
- [ ] Lehrkräfte dürfen Items des gewählten Bereichs anlegen, ändern, aktivieren und deaktivieren, und Fachbereich-Einstellungen des gewählten Bereichs ändern.
- [ ] Die Bereichsprüfung bleibt: Eine Lehrkraft ändert nur Objekte im gerade gewählten Bereich. Objekte ohne Bereich (verwaist) darf nur der Super-Admin ändern.

### Nachvollziehbarkeit
- [ ] **Jede** schreibende Verwaltungs-Schnittstelle (Nutzer, Items, Fachbereich-Einstellungen) schreibt einen Eintrag ins Änderungsprotokoll mit: ausführende Person (Name, nicht nur Kennung), Zeitpunkt, Art, betroffenes Objekt (Bezeichnung lesbar), **alter und neuer Wert** in `details`.
- [ ] Ein **automatischer Test** durchläuft alle schreibenden Routen der Verwaltung und schlägt fehl, wenn eine keinen Protokolleintrag schreibt (Wächtertest, damit künftige Routen nicht vergessen werden).
- [ ] Schlägt das Schreiben ins Protokoll fehl, wird die Verwaltungsaktion **nicht stillschweigend ohne Eintrag** ausgeführt. Der Nutzer bekommt eine verständliche Fehlermeldung. (Heute schluckt `writeAuditLog` Fehler; das gilt für die Verwaltungsaktionen von Lehrkräften nicht mehr.)
- [ ] Das Änderungsprotokoll zeigt Lehrkräften und Super-Admin dieselben Einträge des gewählten Bereichs, filterbar nach Person, Art und Zeitraum, und stellt alten und neuen Wert lesbar nebeneinander dar.
- [ ] Bei Items und Fachbereich-Einstellungen steht im Eintrag eine Zeile „Zuletzt geändert von <Name> am <Datum>“ auf der jeweiligen Seite (wie bei Fragen in PROJ-47).

### Migration der bisherigen Bereichs-Admins
- [ ] Per Migration werden alle Konten mit `role = department_admin` auf `teacher` umgestellt. Vor der Umstellung gibt es eine **Probe** (SQL zum Anschauen: Liste der Konten mit Name, E-Mail, Bereich), damit der Nutzer prüfen kann, wen es betrifft.
- [ ] Der bisherige Bereich im Profil (`department_id`) bleibt erhalten; er schadet einer Lehrkraft nicht und dient weiter für Standardbereich und Anzeige.
- [ ] Nach der Umstellung können die Betroffenen alles, was sie vorher durften (außer Löschen/Fortschritt/Rollen, die ein Bereichs-Admin auch vorher nicht durfte). Zusätzlich sehen sie wie Lehrkräfte alle Bereiche. **Bewusste Ausnahmen** (Entscheidung 2026-11-22): Sie verlieren die bezahlten KI-Wege und das Moderieren im Lehrerzimmer (bleibt nur Super-Admin).
- [ ] **Mit dem Bereich geteilte Leistungsnachweise** sieht jede Lehrkraft, deren Profil zu diesem Bereich gehört (bisher nur der Bereichs-Admin). Ersteller und Super-Admin sehen sie wie bisher.
- [ ] **Regal-Freigaben „für den Fachbereich“** (PROJ-53) sieht jede Lehrkraft, deren Profil zu diesem Bereich gehört oder die dort ein Fach eingetragen hat (bisher: Fach-Eintragung oder Bereichs-Admin).
- [ ] Die Migration ist wiederholbar (zweiter Lauf ändert nichts) und rückholbar: Die Liste der umgestellten Konten wird festgehalten, damit sie im Notfall wieder auf `department_admin` gesetzt werden können.
- [ ] Ein Super-Admin, der nicht in der Liste steht, bleibt unverändert.

### Texte und Anzeige
- [ ] Die Rollenbeschreibung der Lehrkraft im Konto-Menü sagt, dass sie Inhalte, Nutzer und Einstellungen aller Bereiche verwaltet (statt „Das verwaltet dein Bereichs-Admin“). Der Hinweistext bei gesperrten Seiten („Das verwaltet dein Bereichs-Admin.“) nennt künftig den Super-Admin.
- [ ] Die Rollen-Auswahl beim Vergeben der Rolle (Nutzer-Detailseite, Super-Admin) bietet „Bereichs-Admin“ nicht mehr zur Neuvergabe an.
- [ ] Bestehende Tests für Rollen, Menü und Seitenlisten sind angepasst; neue Tests decken die geöffnete Verwaltung für Lehrkräfte und das 403 bei Super-Admin-Aktionen ab.

## Edge Cases
- **Lehrkraft will einen anderen Lehrer sperren oder dessen Passwort ändern:** 403. Das Konto taucht in ihrer Nutzerliste gar nicht auf.
- **Zwei Lehrkräfte ändern gleichzeitig dasselbe Item:** Die letzte Änderung gewinnt, beide stehen mit altem und neuem Wert im Protokoll. So lässt sich die frühere Fassung finden.
- **Lehrkraft ändert versehentlich Item-Preise:** Der alte Wert steht im Protokoll. Zurücksetzen von Hand, wie vereinbart.
- **Lehrkraft verschiebt einen Azubi in den anderen Bereich:** Der Azubi verliert seinen bereichsbezogenen Stand wie bisher beim Verschieben durch einen Bereichs-Admin; der Eintrag nennt alten und neuen Bereich.
- **Bisheriger Bereichs-Admin ohne zugewiesenen Bereich (`department_id` leer):** Nach der Umstellung arbeitet er als Lehrkraft im Standardbereich. Vorher war er „fail closed“ ohne Zugriff.
- **Lehrkraft ruft eine Super-Admin-Seite per Link auf (z. B. Nutzer-Detail, Fachbereiche):** Umleitung zur Übersicht mit Hinweis „Das verwaltet der Super-Admin.“.
- **Protokoll ist nicht erreichbar:** Verwaltungsaktion bricht mit verständlichem Fehler ab, kein stilles Weitermachen ohne Eintrag.
- **Lehrerzimmer:** Nach der Umstellung moderiert nur noch der Super-Admin (Entscheidung 2026-11-22).
- **Konto eines ausgeschiedenen Lehrers:** Der Name bleibt im Protokoll lesbar (kein „Unbekannt“), auch wenn das Konto später gesperrt oder gelöscht wird. Bei gelöschtem Konto steht der letzte bekannte Name als Text im Eintrag.
- **Datenschutz:** Alle Lehrkräfte sehen Azubi-Namen und E-Mail-Adressen der Nutzerliste. Das ist eine bewusste Entscheidung des Nutzers (Vertrauen statt Freigabe); der Export der Nutzerliste (CSV) bleibt Super-Admin-only.
- **„Fragen aus Material“ / „Prüfungsset aus PDF“:** kostenpflichtig (Claude-API), deshalb nur Super-Admin. Eine Lehrkraft, die die Seite per Link öffnet, wird zur Übersicht geleitet („Das verwaltet der Super-Admin.“). Auf der Seite Prüfungssimulation ist der Knopf „Aus PDF auslesen“ für Lehrkräfte nicht sichtbar.
- **Lehrkraft schreibt in „Alle Bereiche“:** Bei Items und Fachbereich-Einstellungen gibt es kein „alle“. Ist in der Bereichsleiste „Alle Bereiche“ gewählt, fordert die Seite zuerst die Wahl eines Bereichs (wie beim Anlegen von Inhalten).

## Nicht Teil dieses Features
- Neue Rolle **Sekretariat** (eigenes Projekt, später): sieht Schulrecht und Kalender-Eintragungen, kein Lehrerzimmer, keine Vertretungen eintragen.
- **Ansicht als Rolle** (Rollen-Vorschau für den Super-Admin), eigenes Projekt, später.
- Entfernen des Codes der Rolle `department_admin` (späterer Aufräum-Schritt).
- Eigener Versionsverlauf oder „Zurücksetzen“-Knopf für Items und Einstellungen.
- Sicherung/Frist vor dem Löschen von Konten (Löschen bleibt Super-Admin-only).

## Technical Requirements (optional)
- Security: Jede Prüfung serverseitig; Ausblenden im Menü ersetzt nie die Schnittstellenprüfung. Neue/geöffnete Seiten und Schnittstellen brauchen Einträge in beiden Freigabelisten in `src/lib/roles.ts` (Wächtertests vorhanden, siehe `lehrkraft-freigabelisten`).
- Nachvollziehbarkeit: Protokolleintrag und Aktion gehören zusammen; bei Fehler im Protokoll keine stille Fortsetzung.
- Server/Client-Grenze: Icons und Funktionen nicht als Prop von Server- an Client-Komponenten reichen (Produktions-500, Tests merken es nicht).
- Deploy-Reihenfolge: Probe und Migration der Rollen vor dem Code-Push prüfen und einspielen (siehe Deploy-Ablauf).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

> Erstellt 2026-11-22 (Opus). Grundlage: Lesen von `src/app/api/admin/_lib/auth.ts`, `src/lib/roles.ts`, `src/lib/admin-nav.ts`, den Verwaltungs-Schnittstellen und allen Datenbank-Regeln, die `department_admin` erwähnen.

### Ausgangslage (was der Code heute macht)
- **Zwei Türsteher im Server:** „Inhalte“ (alle Lehrer-Rollen, mit Bereichsleiste, PROJ-70) und „Verwaltung“ (nur Bereichs-Admin und Super-Admin, fester eigener Bereich). Die Verwaltung hängt an rund 35 Schnittstellen.
- **Datenbank-Regeln** prüfen bei Items, Item-Besitz, Änderungsprotokoll, Profilen, KI-Entwürfen, KI-Aufträgen und Nachweisen die Regel „darf diesen Bereich verwalten“. Sie kennt nur Super-Admin und Bereichs-Admin des eigenen Bereichs.
- **Weitere Stellen kennen die Rolle Bereichs-Admin namentlich:** geteilte Nachweise, Regal-Freigaben für den Fachbereich, Moderation im Lehrerzimmer, Wiederherstellen im Änderungsverlauf. Wer umgestellt wird, verliert dort sonst still Rechte. Darum werden diese Stellen gezielt angepasst (oder bewusst so gelassen, siehe Entscheidungen).
- **Nutzerliste, Passwort, Sperren, Fachbereich-Einstellungen** laufen schon heute über den Server mit Dienstschlüssel. Dort entscheidet allein die Prüfung im Code, nicht die Datenbank-Regel. **Items** laufen mit der Sitzung der Person; dort zählt die Datenbank-Regel.
- **Protokoll:** Die Schreib-Hilfe schluckt Fehler. Eine Aktion kann also heute ohne Eintrag durchgehen.

### A) Was die Lehrkraft sieht (Oberflächen-Bausteine)
```
Lehrkräfte-Bereich (Menü)
+-- Mein Unterricht (unverändert)
+-- Inhalte (unverändert, „Fragen aus Material“ jetzt nur Super-Admin)
+-- Verwaltung  ← neu für alle Lehrkräfte
|   +-- Nutzer
|   |   +-- Liste: nur Azubis des gewählten Bereichs
|   |   +-- Zeilen-Aktionen: Sperren/Entsperren, Bereich verschieben, Passwort neu
|   |   +-- (ausgeblendet für Lehrkräfte: Löschen, Fortschritt zurücksetzen,
|   |        Rolle/Status, Detailseite, CSV-Export, Konten anlegen)
|   +-- Fachbereich (Einstellungen des gewählten Bereichs)
|   |   +-- Zeile „Zuletzt geändert von … am …“
|   +-- Items (Shop des gewählten Bereichs)
|   |   +-- Zeile „Zuletzt geändert von … am …“ je Item
|   +-- Änderungsprotokoll
|       +-- Filter: Person, Art, Zeitraum
|       +-- Eintrag: wer · wann · was · alter Wert → neuer Wert
|       +-- „Alle Änderungen einer Person zurücknehmen“ (PROJ-47)
+-- Nur Super-Admin: Zuständigkeiten, Abwesenheitsarten, Fachbereiche, Fragen aus Material
Bereichsleiste oben (gibt es schon): Spedition / Tourismus / Alle
+-- Bei „Alle“ fordern Items und Fachbereich-Einstellungen zuerst einen Bereich
```
Bestehende Bausteine werden wiederverwendet: `AdminPageHeader`, `AdminRowActions`, `AdminEmptyState`, die Bereichsleiste (`admin-scope-bar`) und das vorhandene Protokoll-Panel. Neue Oberflächen sind nur die Alt/Neu-Darstellung im Protokoll und die Zeile „Zuletzt geändert“.

### B) Rechte im Server: ein neuer Türsteher „Verwaltung“
- Der bisherige Türsteher „Verwaltung“ wird für die geöffneten Seiten ersetzt durch einen, der **alle Lehrer-Rollen** einlässt und den **Bereich aus der Bereichsleiste** nimmt, genau wie bei den Inhalten. Für Schreibzugriffe muss ein einzelner Bereich gewählt sein.
- **Super-Admin-Aktionen** bekommen einen eigenen, strengen Türsteher („nur Super-Admin“). Das gibt es für Löschen, Fortschritt, Name und E-Mail schon. Neu darunter: Rolle und Status vergeben, Vertretungsplaner-Status, CSV-Export, Zuständigkeiten, Fachbereiche, die beiden bezahlten KI-Wege und der Bereichs-Umschalter des Super-Admins.
- **Nutzer-Aktionen einer Lehrkraft** prüfen zusätzlich: Ziel ist ein Azubi im gewählten Bereich. Andere Lehrkräfte, verknüpfte Zweitkonten und der Super-Admin sind tabu (403). Das übernimmt die Regel, die heute für den Bereichs-Admin gilt.
- **Freigabelisten in `roles.ts`:** Die geöffneten Seiten und Schnittstellen kommen in beide Listen. Die bestehenden Wächtertests prüfen, dass nichts fehlt.

Aufteilung der heutigen Verwaltungs-Schnittstellen:

| Gruppe | Wer darf danach | Beispiele |
|---|---|---|
| Geöffnet für alle Lehrkräfte | Lehrkraft + Super-Admin | Nutzerliste, Sperren/Entsperren, Bereich verschieben, Passwort neu, Items, Fachbereich-Einstellungen, Änderungsprotokoll, Personen-Rücknahme und Vorgänge im Änderungsverlauf, Fragen-Statistik und -Export |
| Nur Super-Admin | Super-Admin | Rolle/Status, Vertretungsplaner, Löschen, Fortschritt, Name, E-Mail, CSV-Export, Zuständigkeiten, Fachbereiche, Fragen aus Material, Prüfungsset aus PDF, Bereichs-Umschalter |

### C) Datenbank (Regeln und Daten)
Alle Änderungen an Datenbank-Regeln brauchen laut Projektregel deine ausdrückliche Freigabe. Geplant sind:

1. **Neue Regel „darf Bereich verwalten (Verwaltung)“**: Super-Admin immer; jede Lehrer-Rolle für jeden vorhandenen Bereich; ein leerer Bereich nur der Super-Admin. Sie gilt für **Items, Item-Besitz (Lesen) und das Änderungsprotokoll (Lesen und Schreiben)**. Die alte Regel bleibt für alles andere unverändert. So öffnet sich nichts, was nicht geöffnet werden soll (z. B. KI-Entwürfe, Profile).
2. **Profile:** keine Öffnung der Datenbank-Regel. Die Nutzerliste läuft schon über den Server, der die Liste auf Azubis des Bereichs beschränkt. So sehen Lehrkräfte nie fremde Lehrer- oder Admin-Profile über die Datenbank.
3. **Geteilte Nachweise:** Die zwei Regeln, die heute „Bereichs-Admin des Bereichs“ sagen, sagen künftig „Lehrer-Rolle, deren Profil zu diesem Bereich gehört“.
4. **Regal-Freigaben für den Fachbereich:** gleiche Anpassung (Profil-Bereich statt Bereichs-Admin), die Fach-Eintragung bleibt als zweiter Weg.
5. **Wiederherstellen im Änderungsverlauf (PROJ-47):** Die Stelle, die nur Bereichs-Admin und Super-Admin zulässt, lässt alle Lehrer-Rollen zu. Die Prüfung „darf diesen Inhalt pflegen“ dahinter folgt PROJ-70 (alle Lehrkräfte). Beim Bau wird geprüft, dass Fächer, Themen und Prüfungssets dort nicht noch an der alten Regel hängen.
6. **Moderation im Lehrerzimmer:** bleibt unverändert. Nach der Umstellung gibt es keine Bereichs-Admins mehr, damit moderiert nur noch der Super-Admin (Entscheidung).
7. **Rollen-Umstellung (Daten):** Vorher eine **Probe** (Liste der Betroffenen mit Name, E-Mail, Bereich). Dann setzt die Umstellung alle Bereichs-Admins auf Lehrkraft und schreibt **pro Konto einen Eintrag ins Änderungsprotokoll** („Rolle Bereichs-Admin → Lehrkraft, Quelle: PROJ-127“). Dieser Eintrag ist zugleich die Liste für den Rückweg. Ein zweiter Lauf findet niemanden mehr und ändert nichts. Der Bereich im Profil bleibt stehen. Die Rolle `department_admin` bleibt in der Datenbank erlaubt, damit der Rückweg möglich ist.

### D) Nachvollziehbarkeit
- **Strenge Protokoll-Hilfe:** Neben der bisherigen, die Fehler schluckt, gibt es eine strenge. Bei Verwaltungsaktionen wird erst der alte Stand gelesen, dann geändert, dann protokolliert. Scheitert das Protokoll, meldet die Schnittstelle einen Fehler. Wo möglich, laufen Änderung und Eintrag zusammen, sonst wird die Änderung zurückgerollt.
- **Inhalt jedes Eintrags:** Person (Kennung und Name als Text, damit der Name auch nach dem Löschen eines Kontos lesbar bleibt), Zeitpunkt, Art, Objekt mit lesbarer Bezeichnung, **alte und neue Werte** der geänderten Felder. Passwörter werden nie gespeichert, nur „Passwort neu vergeben“.
- **„Zuletzt geändert von“** bei Items und Fachbereich-Einstellungen wird aus dem jüngsten Protokolleintrag gelesen. Es braucht keine neue Spalte.
- **Wächtertest:** Ein Test geht alle schreibenden Verwaltungs-Schnittstellen durch und schlägt fehl, wenn eine nicht die strenge Protokoll-Hilfe nutzt. Neue Routen können das nicht mehr vergessen.

### E) Texte
- Rollenbeschreibung der Lehrkraft und Hinweis bei gesperrten Seiten („Das verwaltet der Super-Admin.“) in `roles.ts`.
- Rollen-Auswahl auf der Nutzer-Detailseite: „Bereichs-Admin“ fällt weg.
- Konto-Menü und Menü-Hinweise, die heute „ganzer Bereich“ für Bereichs-Admins sagen, entfallen mit der Rolle von selbst.

### F) Tests
- Rollen, Menü und Freigabelisten: Lehrkraft sieht Verwaltung, nicht die Super-Admin-Punkte.
- Für jede Super-Admin-Aktion: Lehrkraft bekommt 403.
- Nutzer-Aktionen: Lehrkraft gegen Azubi im Bereich erlaubt, gegen Lehrkraft, Zweitkonto und Super-Admin 403.
- Strenge Protokoll-Hilfe: Fehler im Protokoll führt zu Fehlerantwort, ohne Änderung.
- Wächtertest „jede schreibende Verwaltungs-Route protokolliert“.
- Datenbank-Probe nach dem Einspielen: Lehrkraft darf Item im Bereich ändern, Azubi nicht; geteilte Nachweise sichtbar für Profil-Bereich.

### G) Reihenfolge beim Einspielen
1. **Datenbank-Regeln** einspielen (nur erweiternd, für heutige Nutzer folgenlos). Rückweg-Datei wie immer daneben.
2. **Code** deployen (neuer Türsteher, Menü, Texte, strenges Protokoll).
3. **Probe** ansehen: Wer wird umgestellt?
4. **Rollen-Umstellung** einspielen. Danach kurzer Browser-Test mit einem umgestellten Konto.
Rückweg: Rollen anhand der Protokolleinträge zurücksetzen, Regel-Rückweg-Datei einspielen, Code zurückrollen.

### H) Pakete
Keine neuen Pakete.

### Modellwahl
- Datenbank-Regeln, neuer Türsteher, strenges Protokoll, Wächtertest: **Opus** (sicherheitsrelevant).
- Menü, Texte, Alt/Neu-Darstellung, „Zuletzt geändert“: **Sonnet**.
- Abschluss-QA der Rechte: **Opus**.

## Implementation Notes (Backend, 2026-11-22, Opus)

### Türsteher (`src/app/api/admin/_lib/auth.ts`)
- `requireAdmin()` ist **entfernt**. Jede Route ruft bewusst einen der beiden neuen Türsteher auf (ein Wächtertest prüft, dass `requireAdmin(` nirgends mehr vorkommt):
  - `requireManager()`: alle Lehrer-Rollen. Super-Admin wie bisher mit Bereichs-Umschalter; Lehrkraft mit dem Bereich der Bereichsleiste (`admin_bereich`), bei „Alle“ oder ohne Wahl mit dem Profil-Bereich, sonst dem Standardbereich. Neues Feld `scopeIsAll`.
  - `requireSuperAdmin()`: nur `role = admin`.
- `assertSingleDepartment()`: 400 „Bitte wähle oben in der Bereichsleiste einen Bereich aus.“ für Schreibzugriffe auf Items und Einstellungen bei „Alle Bereiche“.
- `canAdminDepartment()`: Lehrkraft = gewählter Bereich (bei „Alle“ jeder Bereich), verwaiste Objekte nur Super-Admin.
- `canViewAssessment()` und `TeacherAuthResult.ownDepartmentId`: geteilte Nachweise für jede Lehrer-Rolle mit passendem Profil-Bereich.
- **Strenges Protokoll:** `writeAuditLogStrict()` → `true/false`, `auditFailedResponse()` (503, verständlicher Satz), `changedFields()` für `{feld: {alt, neu}}`. Beide Hilfen speichern den **Namen der handelnden Person als Text** (`admin_name`). Fehlt die Spalte noch (Migration nicht eingespielt), wird ohne Namen geschrieben.

### Aufteilung der Routen
| Türsteher | Routen |
|---|---|
| `requireManager` | `users` (GET), `users/[id]` (PATCH), `users/[id]/password`, `shop-items`, `shop-items/[id]`, `department-settings`, `audit-log`, `content-history/{changes,people,people/[id]/preview,people/[id]/revert,batches/[id]}`, `questions/[id]/stats`, `questions/export`, `departments` (nur GET, gekürzte Felder) |
| `requireSuperAdmin` | `ai-generate/**`, `exam-sets/extract`, `exam-sets/import`, `context/department`, `departments` (POST), `departments/[id]`, `teacher-assignments/**`, `users/bulk`, `users/export-log`, `users/[id]/vertretungsplaner`, `users/_lib/target.ts` (Detailseite, Löschen, Fortschritt, Name, E-Mail), `werkzeugkiste/ki-test` |

### Nutzerverwaltung
- `src/app/api/admin/users/_lib/manage-target.ts` → `mayManageUserTarget()`: Lehrkraft nur bei Azubis mit Bereich im gewählten Bereich, nie Lehrkräfte, Super-Admin oder Zweitkonten. **403** statt bisher 404.
- Nutzerliste: Lehrkraft sieht nur `role = student` (bei „Alle“ alle Azubis mit Bereich), `.limit(5000)`.
- Sperren/Entsperren und Verschieben: erst ändern, dann streng protokollieren, bei Fehler **zurückdrehen** (Sperre zurück, Bereich zurück). Verschieben prüft den Ziel-Bereich.
- Passwort: **erst Protokoll, dann Änderung**, weil ein Passwort nicht zurückzunehmen ist. Scheitert danach das Setzen, folgt der Nachtrag `user.password_set_failed`.
- Rollenvergabe: `ASSIGNABLE_ROLES` (`student`, `teacher`, `admin`); „Bereichs-Admin“ wird mit verständlicher Meldung abgelehnt. **Fund beim Bauen:** Durch die lose Schema-Union wurde `{ role: 'department_admin', department_id }` bei einer Ablehnung still als „Verschieben“ ausgeführt. Die drei Schemas sind jetzt `.strict()`.
- Einträge nennen das betroffene Konto lesbar (`object_label`) sowie alten und neuen Wert.

### Items und Fachbereich-Einstellungen
- Anlegen, Ändern, Aktivieren: alter Stand → Änderung → strenges Protokoll mit `details.changes` (alt/neu) → bei Fehler Rückbau (Item löschen bzw. alte Werte zurückschreiben).
- GET liefert „Zuletzt geändert“: `last_change` je Item bzw. `lastChange` für den Bereich (`_lib/last-change.ts`, liest nur Name, Zeitpunkt und Art) sowie `needsDepartment` bei „Alle Bereiche“.

### Änderungsprotokoll
- Lehrkraft: Einträge des gewählten Bereichs (bei „Alle“ alle mit Bereich). Einträge ohne Bereich sieht nur der Super-Admin.
- Neuer Filter `admin_id` (Person). `admin_name` aus dem Eintrag zuerst, sonst wie bisher aus Profil oder E-Mail.

### Änderungsverlauf der Inhalte (PROJ-47/70)
- Auswertung je Person, Vorschau, Personen-Rücknahme und Vorgangs-Rücknahme stehen jeder Lehrer-Rolle offen. Was sichtbar ist, begrenzt weiter die Datenbank-Regel von `content_versions`.

### Menü, Freigabelisten, Texte
- `admin-nav.ts`: Nutzer, Fachbereich, Items, Änderungsprotokoll mit `teacherVisible`; „Fragen aus Material“ hat jetzt `superAdminOnly`.
- `roles.ts`: Seiten `/admin/{users,department-settings,shop-items,audit-log}` und Schnittstellen `/api/admin/{users,department-settings,shop-items,audit-log,departments}` in beiden Listen. Rollentext der Lehrkraft: „Du verwaltest Inhalte, Nutzer und Einstellungen aller Bereiche …“. Hinweis bei gesperrten Seiten: „Das verwaltet der Super-Admin.“
- Prüfungssimulation: „Aus Datei importieren“ (bezahlte KI) nur noch für den Super-Admin sichtbar.
- Regal-Optionen: Profil-Bereich zählt für jede Lehrer-Rolle (wie `regal_in_bereich`).

### Datenbank (noch NICHT eingespielt, Freigabe durch den Nutzer nötig)
- [20261126_proj127_verwaltung_fuer_alle.sql](../supabase/migrations/20261126_proj127_verwaltung_fuer_alle.sql) (+ `_down`): Spalte `admin_audit_log.admin_name` + zwei Indizes; neue Regel `can_manage_department()`; `shop_items`, `user_shop_items` (Lesen), `admin_audit_log` (Lesen; Schreiben: jede Lehrer-Rolle, **nur im eigenen Namen** `admin_id = auth.uid()`); `can_view_assessment` (Profil-Bereich statt Bereichs-Admin); `regal_in_bereich`; `content_changes_per_person`, `person_revert_plan`, `revert_person_changes` für alle Lehrer-Rollen, wobei **private Fragen anderer** in Plan und Rücknahme ausgelassen werden. `can_admin_department` (Profile, KI-Entwürfe, KI-Aufträge, Prüfungsteile) und `forum_is_moderator` bleiben unverändert.
- [20261127_proj127_rollen_umstellung.sql](../supabase/migrations/20261127_proj127_rollen_umstellung.sql) (+ `_down`): `department_admin` → `teacher`, pro Konto ein Protokolleintrag (`details.quelle = 'PROJ-127'`). Diese Einträge dienen auch als Liste für den Rückweg. Wiederholbar.
- Proben: [proj127_betroffene_probe.sql](../supabase/tests/proj127_betroffene_probe.sql) (nur lesen: wer wird umgestellt) und [proj127_regeln_probe.sql](../supabase/tests/proj127_regeln_probe.sql) (endet mit „PROBE-ERGEBNIS“).
- Geprüft (lesend): Die Trigger auf `profiles` stören die Umstellung nicht. `restore_content_version` lässt Lehrkräfte schon heute zu (seit PROJ-70), dort ist keine Änderung nötig.

### Tests
- Neu: `verwaltung-protokoll-waechter.test.ts` (jede schreibende Route unter users/shop-items/department-settings protokolliert, von Lehrkräften erreichbar → streng; kein `requireAdmin`). Auth-Tests für `requireManager`/`requireSuperAdmin`/`writeAuditLogStrict`/`changedFields`/`canViewAssessment`. Nutzer-, Passwort-, Items-, Einstellungs-, Verlauf-, Menü-, Proxy- und Rollen-Tests auf PROJ-127 umgestellt (403 gegen Lehrkraft/Super-Admin/Zweitkonto, 503 + Rückbau bei Protokollfehler).
- Stand: 4280 Tests grün, Build grün. 1 roter Test (`werkzeugkiste-auszug.test.ts`, „aus dem Regal von …“) war **schon vor PROJ-127 rot**. `npm run lint` ist unabhängig davon kaputt (Plugin `react-hooks` fehlt in der Konfiguration).

### Offen für /frontend (Sonnet)
- Alt/Neu-Darstellung im Änderungsprotokoll (`details.changes`, `details.gesperrt`, `from/to`), Filter nach Person (`admin_id`).
- Zeile „Zuletzt geändert von … am …“ auf Items- und Fachbereich-Seite (`last_change`, `lastChange`).
- Hinweis „Bitte Bereich wählen“ bei `needsDepartment`. Rollen-Auswahl ohne „Bereichs-Admin“ (`users/page.tsx`, `role-change-text.ts`). Super-Admin-Knöpfe sind dort schon heute an `isSuperAdmin` gebunden.

### Entscheidung Fragen-Ablage in Nachweisen (2026-11-22)
- Der Nutzer hat entschieden: **Alle Lehrkräfte dürfen Nachweis-Fragen im Bereich ihres Profils in den Bereichs-Pool speichern** (vorher nur Bereichs-Admins). Umgesetzt in `assessments/questions` (`canEditPool`) und `assessments/questions/import` (`isOwnDepartment`): Super-Admin überall, jede Lehrer-Rolle nur bei `departmentId === ownDepartmentId`. Ohne Profil-Bereich oder in einem fremden Bereich bleibt die Frage weiter privat und „nur für Nachweise“. Die Datenbank-Regel `questions_insert_admin` erlaubt Lehrkräften öffentliche Fragen schon seit PROJ-70.

## Implementation Notes (Frontend, 2026-11-22, Sonnet)
- **Änderungsprotokoll** (`admin/audit-log/page.tsx`): neue Spalte „Änderung (alt → neu)“ (Baustein `components/admin/audit-details.ts`, mit Test), Namen der handelnden Person sind klickbar und filtern per `admin_id`; neue Aktionsarten (Items, Fachbereich-Einstellungen, Passwort fehlgeschlagen) im Filter.
- **Items / Fachbereich-Einstellungen:** Zeile „Zuletzt geändert von … am …“ (`LastChangedLine`); bei `needsDepartment` („Alle Bereiche“) ein Hinweis „Bitte wähle einen Bereich“ statt Liste/Formular, Hauptaktion dann ausgeblendet.
- **Nutzerliste:** Rollenwechsel bietet nur `ASSIGNABLE_ROLES` an (kein Bereichs-Admin); Sonderfall Bereichs-Admin im Bestätigen entfernt. `role-change-text.ts` und Test auf die neue Rollenbeschreibung angepasst.
- Stand: tsc sauber, 296 Tests in den betroffenen Ordnern grün. Nicht im Browser geprüft (kein Dev-Server).

## QA Test Results

**Geprüft:** 2026-11-22 (Code-, Test- und Migrations-Review; **kein Browser, kein Playwright**, weil der Dev-Server den Mac zum Absturz bringt, siehe Memory „Kein Dev-Server“). Die Datenbank-Migrationen sind noch nicht eingespielt, die Regeln wurden nur als SQL gelesen.

### Automatische Tests
- `vitest`: 4285 grün, 1 rot. Der rote Test (`werkzeugkiste-auszug.test.ts`, „aus dem Regal von …“) war schon vor PROJ-127 rot und gehört nicht zu diesem Feature.
- `tsc --noEmit`: sauber. `npm run lint` ist unabhängig davon kaputt (Plugin `react-hooks` fehlt in der Konfiguration).
- Neue Tests: `audit-details.test.ts` (Alt/Neu-Zeilen), Wächtertest `verwaltung-protokoll-waechter.test.ts`, Auth-, Nutzer-, Passwort-, Items-, Einstellungs- und Proxy-Tests (403 gegen Lehrkraft, Zweitkonto, Super-Admin; 503 mit Rückbau bei Protokollfehler).
- Kein E2E-Test geschrieben: ohne Browser läuft er nicht. Die Browser-Prüfung steht unten als Checkliste.

### Acceptance Criteria (nach Code-Lage)
| Bereich | Ergebnis |
|---|---|
| Menü, Seiten- und Schnittstellenlisten (`roles.ts`, `admin-nav.ts`) | bestanden (Wächtertests grün) |
| Bezahlte KI nur Super-Admin (`ai-generate/**`, `exam-sets/extract`, `exam-sets/import`) | bestanden, `requireSuperAdmin` |
| Bereichswahl über die Bereichsleiste, „Alle“ fordert Bereich bei Items/Einstellungen | bestanden, Hinweis im Frontend ergänzt |
| Nutzerliste nur Azubis, Aktionen nur bei Azubis im Bereich, sonst 403 | bestanden (`mayManageUserTarget`) |
| Nur Super-Admin: Löschen, Fortschritt, Rollen, CSV, Export | bestanden (`requireSuperAdmin`; die `/api/admin/users`-Freigabe öffnet nur, was die Route selbst zulässt) |
| Strenges Protokoll, Rückbau bei Fehler, Passwort erst Protokoll | bestanden |
| Alt/Neu-Darstellung, Filter nach Person, „Zuletzt geändert“ | bestanden (Frontend, Komponententests) |
| Rollen-Auswahl ohne Bereichs-Admin | bestanden |
| Migration der Bereichs-Admins (wiederholbar, Protokoll pro Konto, Rückweg) | bestanden im Review: `admin_id` ist nullable (PROJ-60), Bereich bleibt, zweiter Lauf findet niemanden |
| Datenbank-Regeln (geteilte Nachweise, Regal, Rücknahme) | im Review stimmig, **Probe nach dem Einspielen offen** |

### Fundene Probleme
- **M1 (Medium) – Datenbank-Weg an der Protokollpflicht vorbei:** `shop_items_admin_all` ist `FOR ALL` mit `can_manage_department()`. Jede Lehrkraft darf damit über die Supabase-Schnittstelle direkt Items anlegen, ändern und **löschen**, ohne dass ein Protokolleintrag entsteht (Items mit Käufen sind durch `ON DELETE RESTRICT` geschützt, ungekaufte nicht). Das widerspricht dem Ziel „lückenlos protokolliert“, auch wenn die App-Schnittstelle sauber protokolliert. Vorschlag: Datenbank-Trigger auf `shop_items`, der Änderung und Löschen selbst ins Protokoll schreibt, oder das Löschen für Lehrkräfte sperren. Änderung an Datenbank-Regeln braucht die Freigabe des Nutzers.
- **L1 (Low) – Protokoll fälschbar im eigenen Namen:** Die Insert-Regel erlaubt jeder Lehrkraft Einträge mit `admin_id = auth.uid()` für beliebige Objekte und Bereiche. Fremde Namen sind nicht möglich. Folgenlos, solange das Protokoll nur gelesen wird.
- **L2 (Low) – Zählung privater Fragen:** `content_changes_per_person` zählt auch private Fragen anderer in der Auswertung je Person. Titel und Rücknahme sind ausgenommen, nur die Anzahl ist sichtbar.
- **L3 (Info) – Passwort-Vergabe:** Eine Lehrkraft kann bei „Alle Bereiche“ jedes Azubi-Passwort neu setzen und sich damit als Azubi anmelden. Das ist laut Spec gewollt (wie beim Bereichs-Admin), begrenzt auf 20 pro Stunde und protokolliert.

### Behoben nach der QA (2026-11-23)
- **M1 behoben:** `shop_items_admin_all` gilt nur noch für den Super-Admin. Neue Regel `shop_items_teacher_select` gibt Lehrkräften nur Lesen. `POST /api/admin/shop-items` und `PATCH …/[id]` schreiben mit dem Dienstschlüssel, erst nach der Bereichsprüfung und mit strengem Protokoll. Die Migration (noch nicht eingespielt) und die Rückweg-Datei sind angepasst, die Probe erwartet „Lehrkraft ändert Item direkt = 0“. Route-Tests angepasst.
- **L2 behoben:** `content_changes_per_person` lässt private Fragen anderer weg, wie `person_revert_plan`.
- **L1 bewusst offen:** Einträge nur im eigenen Namen zu erlauben, bleibt so; ein Zwang auf einen Bereich könnte Einträge ohne Bereich verhindern. **L3** ist gewollt.
- Stand: tsc sauber, 1128 Tests in `api/admin` grün.

### Sicherheitsprüfung
- Jede Route unter `/api/admin` mit PROJ-127-Bezug nutzt `requireManager` oder `requireSuperAdmin`; `requireAdmin` kommt nirgends mehr vor (Wächtertest).
- Ziel-Konten werden serverseitig geprüft (403), nicht nur im Menü ausgeblendet.
- Ungültige Bereichs-Cookies fallen auf den Profil-Bereich zurück, keine Rechteausweitung.
- Die Rollenvergabe lehnt `department_admin` ab, die Schemas sind `.strict()`.
- Keine Geheimnisse oder Passwörter im Protokoll.

### Offen: Browser-Test nach dem Livegang (mit einem umgestellten Konto)
Menü „Verwaltung“ sichtbar · Nutzer sperren/verschieben/Passwort · Lehrkraft-Zeile ohne Menü · Items ändern, Zeile „Zuletzt geändert“ · „Alle Bereiche“ zeigt Hinweis · Protokoll mit Alt/Neu und Personenfilter · „Fragen aus Material“ per Link leitet um · Handy 375 px.

### Entscheidung
**Produktionsreif: JA, unter Vorbehalt.** Keine Critical/High-Fehler. M1 sollte vor oder kurz nach dem Livegang entschieden werden (Datenbank-Freigabe nötig). Reihenfolge laut Tech Design: Regeln → Code → Probe → Rollen-Umstellung.


## Deployment
_To be added by /deploy_
