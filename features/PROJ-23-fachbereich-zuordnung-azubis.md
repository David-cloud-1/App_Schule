# PROJ-23: Fachbereichs-Zuordnung für Azubis

## Status: Planned
**Created:** 2026-09-29
**Last Updated:** 2026-09-29

## Dependencies
- Requires: PROJ-22 (Fachbereich als Datenbasis) — Bereiche, Adresse je Bereich, Bereich am Profil
- Requires: PROJ-1 (User Authentication) — Registrierung per E-Mail und Google
- Berührt: PROJ-3/13 (Quiz, Themenwahl), PROJ-8 (Rangliste), PROJ-11/15 (Prüfungssimulation), PROJ-14 (Lücken schließen), PROJ-19 (Blitzrunde), PROJ-20 (Shop), PROJ-21 (Leistungsnachweise)
- Grundlage für: PROJ-25 (Tourismus anlegen)
- Nicht enthalten: Umhängen von Azubis durch Lehrkraft/Admin → PROJ-24

## Summary
Neue Azubis landen automatisch im Fachbereich der Adresse, über die sie sich registrieren (`spedilern.vercel.app` → Spedition, `touristiklern.vercel.app` → Tourismus). Ab dann sieht jeder Azubi **nur Inhalte und Mitspieler seines Bereichs**: Fächer, Fragen, Blitzrunde, Lücken, Prüfungen, Leistungsnachweise, Shop und Rangliste.

Solange es nur Spedition gibt, ändert sich für niemanden etwas Sichtbares. Das Feature schafft die Trennung, bevor mit PROJ-25 der zweite Bereich dazukommt.

Grundlage und Entscheidungen: [docs/plans/mehrere-fachbereiche.md](../docs/plans/mehrere-fachbereiche.md), Abschnitt 5 sowie E1, E5, E7.

## User Stories
- Als **neue Tourismus-Azubi** möchte ich mich über `touristiklern.vercel.app` registrieren (E-Mail oder Google) und sofort in TouristikLern landen, ohne etwas auswählen oder einen Code eingeben zu müssen.
- Als **Azubi** möchte ich nur Fächer und Fragen meiner Ausbildung sehen — auch in der Blitzrunde und beim gemischten Lernen —, damit ich nicht mit fachfremden Fragen Zeit verliere.
- Als **Azubi** möchte ich in der Rangliste nur mit meinem eigenen Ausbildungsberuf verglichen werden.
- Als **Azubi** möchte ich in der Prüfungssimulation und im Shop nur die Angebote meines Bereichs sehen.
- Als **Lehrkraft** möchte ich sicher sein, dass ein Leistungsnachweis-Code meines Bereichs nicht von Azubis eines anderen Bereichs eingelöst werden kann.
- Als **Azubi, der sich auf der falschen Adresse anmeldet**, möchte ich trotzdem meine eigenen Inhalte sehen und einen Hinweis auf meine richtige App bekommen.
- Als **bestehender Spedition-Azubi** möchte ich, dass sich für mich nichts ändert.

## Acceptance Criteria

### Zuordnung bei der Registrierung
- [ ] Wer sich über die Adresse eines Bereichs registriert, wird diesem Bereich zugeordnet — bei E-Mail-Registrierung und bei Google-Login gleichermaßen.
- [ ] Die Zuordnung passiert automatisch; es gibt keine Auswahlseite und keinen Code.
- [ ] Registrierung über eine Adresse ohne Bereich (Vercel-Vorschau, lokale Entwicklung) → Zuordnung zum ersten Bereich (Spedition).
- [ ] Das Pseudonym wird aus den Nomen des zugeordneten Bereichs gebildet.
- [ ] Die Zuordnung wird serverseitig anhand der aufgerufenen Adresse bestimmt; ein Azubi kann seinen Bereich weder bei der Registrierung noch danach selbst wählen oder ändern.
- [ ] Bestehende Profile behalten ihren Bereich (alle Spedition); ein späterer Login über eine andere Adresse ändert den Bereich nie.

### Inhalte nur aus dem eigenen Bereich
- [ ] Fächerliste (Startseite, Fächer-Seite, Fach-Fortschritt) zeigt nur Fächer des eigenen Bereichs.
- [ ] Quiz je Fach, gemischtes Lernen und Themenauswahl verwenden nur Fragen und Themen des eigenen Bereichs.
- [ ] Die Blitzrunde zieht Fragen nur aus Fächern des eigenen Bereichs.
- [ ] „Lücken schließen" bietet nur Fragen des eigenen Bereichs an (auch falls jemand früher in einem anderen Bereich war).
- [ ] Die Prüfungssimulation zeigt nur aktive Prüfungssets des eigenen Bereichs.
- [ ] Der Shop zeigt nur Artikel des eigenen Bereichs; ein Artikel eines anderen Bereichs kann auch über einen direkten Aufruf nicht gekauft werden.
- [ ] Die Fragen-Schnittstelle liefert auch bei direktem Aufruf keine Fragen anderer Bereiche.

### Rangliste
- [ ] Die Rangliste zeigt nur Azubis des eigenen Bereichs (alle Zeiträume, die es heute gibt).
- [ ] Die eigene Platzierung bezieht sich auf den eigenen Bereich.

### Leistungsnachweise
- [ ] Ein Code eines Leistungsnachweises aus einem anderen Bereich wird abgelehnt mit der Meldung „Dieser Code gehört zu einem anderen Fachbereich." — sowohl bei der Code-Suche als auch beim Beitritt über den Link.
- [ ] Codes des eigenen Bereichs funktionieren unverändert.

### Hinweis bei falscher Adresse
- [ ] Ist ein eingeloggter Azubi auf der Adresse eines anderen Bereichs, erscheint ein unaufdringlicher Hinweis „Deine App heißt {App-Name} — hier geht's zu {Adresse}" mit Link zur richtigen Adresse.
- [ ] Auf der richtigen Adresse und auf Adressen ohne Bereich (Vorschau) erscheint kein Hinweis.
- [ ] Der Hinweis lässt sich schließen und erscheint in dieser Sitzung nicht erneut.

### Unveränderter Betrieb für Spedition
- [ ] Für bestehende Spedition-Azubis sind Fächer, Fragenzahl je Fach, Rangliste (Reihenfolge und Punkte), Shop, Prüfungssets und Blitzrunde identisch mit vorher (Stichprobe vor/nach).
- [ ] Keine spürbar längeren Ladezeiten (Referenz: Messwerte aus PROJ-22).

## Edge Cases
- **Registrierung über `touristiklern.vercel.app`, bevor es Tourismus gibt:** Die Adresse hat noch keinen Bereich → Zuordnung zu Spedition (wie jede unbekannte Adresse). Sobald PROJ-25 Tourismus anlegt, gilt die Adresse für neue Registrierungen.
- **Google-Login mit Umweg über Google:** Der Bereich richtet sich nach der Adresse, auf der der Login begonnen hat bzw. zurückkehrt — nicht nach einem Cookie einer anderen Adresse.
- **Bestehender Nutzer meldet sich zum ersten Mal auf der anderen Adresse an:** Bereich bleibt, Hinweis erscheint.
- **Profil ohne Bereich** (z. B. Fehler bei der Zuordnung): wird wie Spedition behandelt, bis ein Admin es zuordnet; kein Absturz, keine leeren Seiten.
- **Leistungsnachweis-Link wird geteilt** und von einem Azubi eines anderen Bereichs geöffnet: Ablehnung mit klarer Meldung, kein Teilnahme-Eintrag.
- **Bereich hat noch keine Fächer/Fragen/Prüfungssets/Shop-Artikel:** leere Zustände wie heute bei leeren Listen, keine Fehler.
- **Admins** (`role = 'admin'`) sehen in den Lernwegen ihren eigenen Profil-Bereich wie ein Azubi; bereichsübergreifende Sicht gibt es nur im Admin-Panel (PROJ-24).
- **Rangliste mit nur einem Azubi im Bereich:** zeigt diesen einen Eintrag, keine Mitspieler anderer Bereiche als Auffüllung.

## Nicht Teil dieses Features
- Umhängen von Azubis in einen anderen Bereich, Bereichs-Admins, Rechtetrennung im Admin-Panel → PROJ-24
- Anlegen des Bereichs Tourismus mit Fächern, Prüfungsaufbau, Shop-Artikeln → PROJ-25
- Auswahlseite „Welche Ausbildung machst du?" (entfällt, Entscheidung 2026-09-29)
- Trennung der Inhalte per Datenbank-Zugriffsregeln (E5: Filter im Code; Personen- und Notendaten trennt PROJ-24 per RLS)

## Technical Requirements
- **Kosten:** keine zusätzlichen Dienste.
- **Sicherheit:** Der Bereich eines Azubis wird nur serverseitig gesetzt; Azubis haben weiterhin kein Schreibrecht auf `department_id`.
- **Tests:** ohne Dev-Server/Playwright — Nachweis über Vitest (inkl. Szenario mit zwei Bereichen), Build und SQL-Stichproben vor/nach.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
