# PROJ-121: Lehrkraft gibt bei der ersten Anmeldung Vor- und Nachnamen ein

## Status: Planned
**Created:** 2026-11-19
**Last Updated:** 2026-11-19

## Ausgangslage
Lehrkräfte erscheinen im Abwesenheitskalender (PROJ-120), im Lehrerzimmer (PROJ-63) und in Verläufen (PROJ-47) mit ihrem Anzeigenamen (`profiles.display_name`). Ist keiner gepflegt, wird er aus dem Anfang der E-Mail-Adresse gebildet. Das führt zu unbrauchbaren oder doppelten Einträgen (z. B. „Babsiboettger“, „Bettina Pettinger“ zweimal in der Personenliste). Der Name wird deshalb direkt beim ersten Mal erfasst.

### Entscheidungen (Nutzer, 2026-11-19)
- **E1 – Pflicht:** Ohne Vor- und Nachnamen geht es im Lehrkräfte-Bereich nicht weiter.
- **E2 – Bestand:** Auch bereits freigeschaltete Lehrer-Rollen ohne gepflegten Vor- und Nachnamen werden beim nächsten Öffnen des Lehrkräfte-Bereichs einmal gefragt.
- **E3 – Eigener Dialog:** Er erscheint **vor** dem bekannten Willkommens-Hinweis (PROJ-44), nicht darin.
- **E4 – Selbst änderbar:** Unter „Mein Konto“ (PROJ-50) kann die Lehrkraft den Namen später korrigieren. Änderungen werden protokolliert.

## Dependencies
- Requires: PROJ-44 (Lehrkraft-Rolle & Freischaltung): Rollen und einmaliger Willkommens-Dialog
- Requires: PROJ-50 (Lehrkraft-Profil „Mein Konto“): Stelle zum späteren Ändern
- Berührt: PROJ-120 (Abwesenheitskalender): Personenliste und Anzeige zeigen den echten Namen
- Berührt: PROJ-63 (Lehrerzimmer): Autorname
- Berührt: PROJ-8 (Leaderboard) und PROJ-44 E3: Der echte Name erscheint dort **nie**, Lehrkräfte spielen weiter unter Pseudonym

## User Stories
- Als **neue Lehrkraft** möchte ich beim ersten Öffnen des Lehrkräfte-Bereichs meinen Vor- und Nachnamen eingeben, damit mich das Kollegium im Kalender und im Lehrerzimmer erkennt.
- Als **bereits freigeschaltete Lehrkraft ohne Namen** möchte ich beim nächsten Öffnen einmal nach meinem Namen gefragt werden, damit mein Eintrag nicht mehr nach E-Mail-Resten aussieht.
- Als **Lehrkraft** möchte ich meinen Namen später unter „Mein Konto“ korrigieren können, damit Tippfehler oder ein Namenswechsel kein Fall für den Super-Admin werden.
- Als **Vertretungsplaner** möchte ich im Kalender und in der Personenliste echte, eindeutige Namen sehen, damit ich weiß, wer fehlt.
- Als **Super-Admin** möchte ich in der Nutzerverwaltung den eingegebenen Namen sehen, damit ich Konten sicher zuordnen kann.
- Als **Azubi** möchte ich, dass sich nichts ändert und kein Lehrer-Name in meiner Ansicht auftaucht.

## Acceptance Criteria

### Dialog
- [ ] Wer eine Lehrer-Rolle hat (Lehrkraft, Bereichs-Admin, Super-Admin) und noch keinen gepflegten Vor- **und** Nachnamen hat, sieht beim Öffnen des Lehrkräfte-Bereichs (`/admin`) einen Dialog „Wie heißt du?“ mit den Feldern **Vorname** und **Nachname** und dem Knopf „Speichern“.
- [ ] Der Dialog lässt sich nicht schließen (kein X, kein Esc, kein Tippen daneben) und blockiert den Bereich, bis beide Namen gespeichert sind (E1). Nur „Zur Lern-App“ bleibt als Ausweg, damit niemand festsitzt.
- [ ] Nach dem Speichern erscheint, falls noch nicht gesehen, direkt der Willkommens-Hinweis aus PROJ-44 (E3). Bestehende Lehrkräfte sehen nur den Namensdialog.
- [ ] Der Dialog erscheint auf jedem Gerät, bis ein Name im Konto gespeichert ist, und danach nie wieder.
- [ ] Der Dialog erklärt in einem Satz, wofür der Name genutzt wird („Das Kollegium sieht ihn im Kalender und im Lehrerzimmer. Schüler sehen ihn nie.“).

### Eingabe und Prüfung
- [ ] Beide Felder sind Pflicht, führende und folgende Leerzeichen werden entfernt, mehrfache Leerzeichen zu einem zusammengefasst.
- [ ] Erlaubt sind Buchstaben (auch Umlaute und Akzente), Leerzeichen, Bindestrich und Apostroph, je Feld 2 bis 40 Zeichen. Ziffern, E-Mail-Adressen und Sonderzeichen werden mit einem Hinweis am Feld abgelehnt, ohne technische Texte.
- [ ] Der Name wird als „Vorname Nachname“ im Anzeigenamen des Kontos gespeichert, Vor- und Nachname zusätzlich getrennt (für Sortierung nach Nachname).
- [ ] Die Prüfung passiert in der Oberfläche **und** im Server. Der Server lehnt fremde Konten (nur eigener Name) und Azubi-Konten mit 403 ab.

### Wirkung
- [ ] Kalender-Personenliste, Anzeige am Eintrag, „Eingetragen von“, Lehrerzimmer und Änderungsverläufe zeigen sofort den neuen Namen.
- [ ] Der Name erscheint nirgends in der Lern-App oder der Rangliste (PROJ-44 E3).
- [ ] Die Nutzerverwaltung zeigt den Namen, die Suche dort findet ihn.

### Später ändern
- [ ] Unter „Mein Konto“ gibt es die Felder Vorname und Nachname mit „Speichern“ und gleicher Prüfung, Toast „Name gespeichert“ (E4).
- [ ] Jede Änderung wird protokolliert (wer, wann, alter und neuer Name). Frühere Einträge zeigen immer den aktuellen Namen.
- [ ] Der Super-Admin kann den Namen weiterhin in der Nutzer-Detailseite (PROJ-59) setzen.

## Edge Cases
- **Zwei Lehrkräfte mit gleichem Namen:** erlaubt. Die Personenliste im Kalender zeigt dann zusätzlich den E-Mail-Anfang in Klammern zur Unterscheidung.
- **Schon ein gepflegter Anzeigename wie „Anna Meier“:** gilt als Vor- und Nachname (am letzten Leerzeichen getrennt), der Dialog erscheint nicht. Bei einem einzelnen Wort ohne Leerzeichen („Babsiboettger“) erscheint er.
- **Doppelkonten wie „Bettina Pettinger“ zweimal:** Die Namenseingabe löst das nicht von selbst. Beide Konten bekommen ihren Namen, der Super-Admin kann ein überzähliges Konto in der Nutzerverwaltung löschen oder zusammenlegen (außerhalb dieser Spec).
- **Keine Verbindung oder Serverfehler beim Speichern:** Eingaben bleiben stehen, Hinweis „Das hat nicht geklappt. Bitte versuche es noch einmal.“, kein Verlust.
- **Rolle wird entzogen, bevor gespeichert wurde:** Speichern wird abgelehnt, die Person landet in der Lern-App.
- **Super-Admin im Bereichs-Umschalter / verknüpfte Konten (PROJ-29):** Jedes Konto hat seinen eigenen Namen und wird einzeln gefragt.
- **Sehr lange oder leere Eingabe, nur Leerzeichen:** wird am Feld abgelehnt.
- **Handy:** Dialog nutzt die volle Breite, Felder mindestens 44 px, Tastatur verdeckt den Knopf nicht.

## Technical Requirements
- Security: Schreiben nur für das eigene Konto und nur mit Lehrer-Rolle, auch bei direktem API- oder Datenbankaufruf. Die Rolle wird serverseitig geprüft, nie aus dem Token.
- Datenschutz: Name nur für Lehrer-Rollen sichtbar, keine Weitergabe an Azubi-Ansichten.
- Barrierefreiheit: Fokus im ersten Feld, Fehlertexte am Feld, Enter speichert.
- Design: `ws-*`-Farben, Dialog nach DESIGN.md (ruhig, eine Hauptaktion).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
