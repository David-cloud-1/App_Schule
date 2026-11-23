# PROJ-125: Onboarding neuer Lehrkräfte – Mentor/in hakt ab

## Status: Planned
**Created:** 2026-11-20
**Last Updated:** 2026-11-20

## Kontext
Die Leitlinie „5.2.1 Onboarding neue Lehrkräfte“ (QSE-Team, 01.07.2025) ist im Original schon eine **Checkliste in drei Phasen** mit Spalten Thema, geplanter Termin, Zuständigkeit, „durchgeführt (Datum)“, Kommentar und auszuhändigende Dokumente:
- **Phase 1:** vor Dienstbeginn oder schnellstmöglich am Schuljahresbeginn (9 Punkte, Juni/Juli)
- **Phase 2:** die ersten Wochen an der Schule (11 Punkte, nach Anfangskonferenz im September)
- **Phase 3:** im Verlauf des ersten Dienstjahres (9 Punkte)

Zuständig sind wechselnde Stellen: Schulleitung (SL), Fachbetreuung (FBs), Mentor/in, Anwenderbetreuung (AWB), Sekretariat (SEK) und weitere (Dienststellenpersonalrat, Sicherheitsbeauftragte/r, RBS).

Anders als bei PROJ-122 hakt hier **nicht die Person selbst** ab, sondern ihre **Mentorin oder ihr Mentor**. Das braucht eine eigene Zugriffsregel und ist deshalb ein eigenes Feature.

### Entscheidungen (Nutzer, 2026-11-20)
- **E1 – Der Mentor / die Mentorin hakt ab,** für alle Schritte, auch für die anderer Zuständiger (SL, FBs, AWB, SEK). Das entspricht dem Original, das ein Blatt mit Datum ist.
- **E2 – Neue Lehrkraft sieht mit:** Lesezugriff auf den eigenen Einarbeitungsplan, ohne Bearbeiten.
- **E3 – Fachbetreuung und Mentor/in** gehören zu den Nutzern und haben Lehrkräfte-Status, keine eigene Rolle nötig (Nutzer bestätigt, 2026-11-20).
- **E4 – Konto schon vor Dienstbeginn:** Die neue Lehrkraft hat ein Konto, bevor Phase 1 beginnt (Nutzer, 2026-11-20, Antwort „ja“ auf die Frage nach dem Konto). Ein Platzhalter-Plan ohne Konto ist nicht nötig.

## Dependencies
- Requires: PROJ-122 (Seitenrahmen, Schrittdarstellung, Original-Darstellung, Stand-Hinweis)
- Requires: PROJ-44 (Lehrkraft-Rolle und Freischaltung), PROJ-59 (Nutzer-Detailseite), PROJ-24 (Rollenmodell)
- Berührt: PROJ-60 (Konto löschen), PROJ-70 (Änderungsprotokoll)

## User Stories
- Als **Mentor/in** möchte ich für meine neue Kollegin oder meinen neuen Kollegen einen Einarbeitungsplan anlegen, damit nichts vergessen wird.
- Als **Mentor/in** möchte ich Schritte als erledigt markieren und das Datum festhalten, damit klar ist, was schon geschehen ist.
- Als **Mentor/in** möchte ich sehen, welche Schritte noch aussehen und wer jeweils zuständig ist, damit ich nachfragen oder nachhaken kann.
- Als **neue Lehrkraft** möchte ich sehen, was in meiner Einarbeitung vorgesehen ist und was schon erledigt wurde, damit ich weiß, was auf mich zukommt.
- Als **Schulleitung** möchte ich einsehen, wie weit die Einarbeitung ist (siehe Offene Fragen).

## Acceptance Criteria

### Anlegen und Zuordnen
- [ ] Der Mentor bzw. die Mentorin legt einen Einarbeitungsplan für eine **neue Lehrkraft** an und wählt sie aus der Lehrkräfte-Liste aus. Pro neuer Lehrkraft gibt es höchstens einen offenen Plan.
- [ ] Die Zuordnung Mentor/in ↔ neue Lehrkraft ist im Plan sichtbar (Namen beider) und durch den Super-Admin änderbar.
- [ ] Ein Plan enthält die drei Phasen mit allen Schritten des Originals in der Reihenfolge der Leitlinie. Pro Schritt: Thema, geplanter Termin (Monat, falls vorgegeben), Zuständigkeit, Kommentar und auszuhändigende Dokumente.
- [ ] Der geplante Termin ist im Original ein Monat (Juni/Juli/September) oder leer. Er wird so angezeigt, nicht in ein Datum umgerechnet.

### Abhaken
- [ ] **Nur die zugeordnete Mentorin bzw. der zugeordnete Mentor** (und der Super-Admin) kann Schritte abhaken. Die neue Lehrkraft sieht den Plan, aber ohne Bedienelemente zum Abhaken.
- [ ] Beim Abhaken wird das **Datum der Durchführung** festgehalten (Standard heute, änderbar). Es erscheint in der Spalte „durchgeführt“.
- [ ] Ein Haken lässt sich zurücknehmen; Datum und Haken werden dabei entfernt.
- [ ] Fortschritt je Phase und insgesamt („Phase 1: 6 von 9“).
- [ ] Phasen lassen sich als Tabs oder Abschnitte umschalten (`AdminTabs*`).
- [ ] Der Plan ist mit dem Original daneben darstellbar wie in PROJ-122 (nebeneinander am Laptop, Tabs am Handy).

### Sichtbarkeit
- [ ] Die **neue Lehrkraft** sieht ausschließlich ihren eigenen Plan, und zwar lesend.
- [ ] Der **Mentor** sieht die Pläne seiner zugeordneten neuen Lehrkräfte, sonst keine.
- [ ] Der **Super-Admin** sieht alle Pläne (Pflege, Vertretung bei Ausfall des Mentors).
- [ ] Andere Lehrkräfte, auch Bereichs-Admins, sehen keine fremden Pläne.
- [ ] Wer außerdem Einsicht bekommt (Schulleitung, Fachbetreuung), steht in den Offenen Fragen und wird nicht stillschweigend angenommen.

### Inhalt (aus dem Original)
- [ ] Schritte und Wortlaut folgen dem Original. Nummerierungslücken im Original (Phase 2 ohne Nr. 9, Phase 3 ohne Nr. 3) werden nicht stillschweigend gefüllt; sie sind als offene Frage vermerkt.
- [ ] Bei jedem Schritt mit Dokumenten steht, was auszuhändigen ist (z. B. Handbuch für das nächste Schuljahr, Blockplan und Stundenplan, Personalbogen, Notfallplan, Sicherheitsordner, Organigramm). Die Dokumente selbst liegen nicht in der App.
- [ ] Personennamen im Original (z. B. eine namentlich genannte Zuständige für die ASV-Einweisung) stehen nicht fest in der Liste; die Zuständigkeit wird als Funktion geführt.

### Konten & Zeitpunkt
- [ ] Ein Plan kann **vor** dem Dienstbeginn angelegt werden, sobald die neue Lehrkraft ein freigeschaltetes Konto hat (PROJ-44). Ohne Konto lässt sich kein Plan anlegen; die Auswahl zeigt dann den Hinweis „Zuerst Konto freischalten“.
- [ ] Wird das Konto der neuen Lehrkraft gelöscht (PROJ-60), wird ihr Plan mit gelöscht. Wird das Konto der Mentorin oder des Mentors gelöscht, bleibt der Plan erhalten und ist bis zur neuen Zuordnung nur für den Super-Admin sichtbar.

### Zustände & Barrierefreiheit
- [ ] Leer-, Lade- und Fehlerzustände wie in PROJ-122.
- [ ] 44-px-Bedienelemente, Tastaturbedienung, Kontrast, Druck (Plan als Übergabeblatt) wie in PROJ-122. Die Druckansicht zeigt Thema, Zuständigkeit, geplant und durchgeführt (Datum).
- [ ] Der Mentor sieht, wer für einen offenen Schritt zuständig ist (SL, FBs, AWB, SEK, DPR, Sicherheitsbeauftragte/r, RBS), in lesbaren Wörtern, nicht als Kürzel.

## Edge Cases
- **Mentor wechselt oder fällt aus:** Der Super-Admin ordnet den Plan einer anderen Person zu; Haken und Daten bleiben.
- **Neue Lehrkraft hat zwei Mentoren:** nicht vorgesehen; pro Plan genau eine Mentorin oder ein Mentor. Eine Stellvertretung läuft über den Super-Admin.
- **Mentor hakt ab, was jemand anderes erledigt hat:** zulässig (E1); das Datum der Durchführung bleibt änderbar. Eine Protokollierung, wer abgehakt hat, ist vorgesehen.
- **Neue Lehrkraft meldet, ein Schritt sei nicht erfolgt:** Es gibt keinen Dialog darüber in der App; sie spricht ihre Mentorin an. (Kein Kommentarfeld in diesem Feature.)
- **Plan wird für dieselbe Person im nächsten Jahr wieder gebraucht** (z. B. Wiederkehr nach Elternzeit): Ein neuer Plan ist möglich, der alte bleibt archiviert.
- **Leitlinie ändert sich mitten in einer Einarbeitung:** Laufende Pläne behalten ihre Fassung, ein Hinweis nennt die Änderung; neue Schritte können in laufende Pläne übernommen werden (Entscheidung beim Mentor).
- **Quereinsteiger ohne Phase 1:** Schritte lassen sich als „nicht zutreffend“ markieren (zählt nicht gegen den Fortschritt, bleibt dokumentiert).
- **Datum in der Zukunft:** Das Datum der Durchführung darf höchstens heute sein. Geplantes steht im Feld „geplanter Termin“, nicht unter „durchgeführt“.
- **Datenschutz:** Der Plan enthält keine Beurteilungen, nur Schritte und Daten. Ein Freitextkommentar wird nicht angeboten.

## Technical Requirements
- Sicherheit: Zugriff ausschließlich über Zeilenzugriffsregeln (Mentor des Plans, neue Lehrkraft lesend, Super-Admin); kein Zugriff über Gruppenrollen.
- Protokoll: Wer wann welchen Schritt abgehakt oder zurückgenommen hat, wird festgehalten (nur sichtbar für Super-Admin).
- Datenschutz: nur Schritt-ID, Datum, Zuordnung, Name der Person; keine Freitexte.
- Performance: Plan öffnet unter 1 s; Abhaken unter 300 ms gespeichert.

## Offene Fragen
- **Wer legt Mentor-Zuordnungen fest?** Annahme: Mentor selbst oder Super-Admin. Alternativ nur Super-Admin.
- **Wer bekommt Einsicht außer Mentor, neuer Lehrkraft und Super-Admin?** Schulleitung, Fachbetreuung, QSE-Team (Zuständigkeit laut Leitlinie)? Vorschlag: Schulleitung lesend, wenn sie ein Super-Admin-Konto hat.
- **Nummerierungslücken im Original:** Fehlt in Phase 2 ein Punkt 9 und in Phase 3 ein Punkt 3 (offenbar gestrichen)? Beim QSE-Team klären.
- **Prüfung der Leitlinie:** Sie ist mit „Überprüfung: Ende SJ“ markiert; ist die aktuelle Fassung noch gültig?
- **Eigene Checkliste der neuen Lehrkraft** („Was habe ich selbst schon erledigt?“): gewünscht? Das würde der Regel „Haken sieht nur die Person selbst“ aus PROJ-122 entsprechen und wäre ein Zusatz.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
