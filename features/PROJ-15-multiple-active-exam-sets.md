# PROJ-15: Mehrere aktive Prüfungssets pro Teil

## Status: Deployed
**Created:** 2026-07-17
**Last Updated:** 2026-07-17

## Deployment
**Deployed:** 2026-07-17
**Production URL:** https://spedilern.vercel.app
**Vercel Deployment ID:** dpl_2qN1moUjfnfAbgqPz12rRgB6dBkE
Gemeinsam deployt mit den PROJ-11-Verbesserungen (Scoring-Fix, teacher-driven UI, Autosave).

## Dependencies
- Erweitert PROJ-11 (Exam Simulation Mode)
- Nutzt PROJ-9 (Admin Content Management) / Prüfungssets

## Summary
Bisher konnte pro Prüfungsteil nur **ein** Set gleichzeitig aktiv sein — beim Aktivieren wurde jedes andere Set desselben Teils automatisch deaktiviert. Damit ließ sich verschiedenen Klassen nicht gleichzeitig eine unterschiedliche Prüfung zuweisen (Klassenstufe 10/11/12 unterscheidet parallele Klassen derselben Stufe nicht, und Profile haben keine Klassen-/Kohortenzuordnung).

Diese Erweiterung erlaubt **beliebig viele gleichzeitig aktive Sets pro Teil**. Schüler:innen wählen auf der Landing die konkrete Prüfung, die ihr Ausbilder angesagt hat. Kein Kohorten-System nötig.

## User Stories
- Als Ausbilder möchte ich mehrere Prüfungen pro Teil gleichzeitig aktiv halten, damit verschiedene Klassen unterschiedliche Prüfungen schreiben können.
- Als Azubi möchte ich beim Start die konkrete freigegebene Prüfung auswählen, damit ich genau die vom Ausbilder angesagte schreibe.

## What was built

### Admin
- `PATCH /api/admin/exam-sets/[id]`: Sibling-Deaktivierung entfernt — Aktivieren eines Sets lässt andere Sets desselben Teils unberührt.
- `exam-sets-client.tsx`: Optimistisches Toggle flippt nur noch das eine Set; Beschreibung angepasst ("Pro Teil können mehrere Sets gleichzeitig aktiv sein").

### Student
- `exam/page.tsx`: Lädt **alle** aktiven Sets, gruppiert nach Teil (`setsByPart`).
- `exam-landing-client.tsx`: Pro Teil werden die aktiven Prüfungen als Auswahl (Radio-Verhalten, max. eine pro Teil) angezeigt. Bei genau einer Prüfung wird sie als einzelne Option gezeigt; mehrere Teile bleiben kombinierbar. Start sendet `setIds`.
- `POST /api/exam/sessions`: Neuer `setIds`-Pfad — lädt die gewählten aktiven Sets, gruppiert Fragen nach Teil, Dauer aus dem Set (Fallback: Teil-Standard). Ablehnung bei zwei Sets desselben Teils ("Pro Teil kann nur eine Prüfung gewählt werden") und wenn kein Set (mehr) aktiv ist. `parts`-Pfad bleibt als Fallback erhalten (Pool/Kompatibilität).
- `results_json.setNames` speichert je Teil den gewählten Set-Namen (für spätere Anzeige/Verlauf).

## Design-Entscheidungen
- **Max. eine Prüfung pro Teil je Session** — hält die `results_json.parts`-Struktur (nach Teilnummer gekeyt) kollisionsfrei und entspricht der realen Nutzung (man schreibt nicht zwei Teil-1-Prüfungen gleichzeitig).
- **Keine Klassenstufen-Zuordnung** für Sets — Klassenstufe 10/11/12 kann parallele Klassen nicht unterscheiden; die Zuordnung erfolgt bewusst über die benannte Auswahl.
- **Keine Migration nötig** — nutzt das bestehende `is_active`-Feld; nur die Single-Active-Erzwingung wurde entfernt.

## Edge Cases
- Set wird während der Auswahl deaktiviert → POST prüft `is_active` erneut und lehnt ab.
- Kein aktives Set für einen Teil → Teil gesperrt ("Noch keine Prüfung freigegeben").
- Zwei Sets desselben Teils via API → 400.

## Nachtrag (2026-10-09): Prüfungssets bearbeiten

Bestehende Sets lassen sich jetzt nachträglich ändern, statt sie löschen und neu anlegen zu müssen.

- **Admin-Oberfläche:** Neben „Aktivieren/Deaktivieren" steht ein Stift-Symbol (`aria-label` „Prüfungsset bearbeiten"). Es öffnet denselben Dialog wie „Neues Prüfungsset", vorbelegt mit Name, Dauer und den gewählten Fragen. Der **Prüfungsteil ist beim Bearbeiten gesperrt** (nur angezeigt), weil Fragen und Teil zusammenpassen müssen.
- **Neu beim Anlegen:** Statt nur „Prüfungsteil" gibt es „Prüfung / Fach": entweder eine ganze Abschlussprüfung (Teil) oder ein einzelnes Fach; der Teil wird aus dem Fach abgeleitet und angezeigt. Beim Fach-Weg ist der Fächerfilter der Fragenauswahl vorbelegt.
- **Themenfilter:** Die Themenliste der Fragenauswahl zeigt nur Themen, zu denen es zur gewählten Klasse und zum gewählten Fach Fragen gibt; ein Wechsel von Klasse oder Fach setzt das Thema zurück.
- **Nur eigener Fachbereich:** Die Seite listet nur Sets des gerade gewählten Fachbereichs (auch für den Super-Admin mit Bereichs-Umschalter).
- **API:** `PATCH /api/admin/exam-sets/[id]` nimmt zusätzlich `question_ids` (1–1000 UUIDs) an; die Bereichsprüfung gilt wie bisher vor jedem Schreibzugriff. Das Anlegen (`POST`) ist unverändert.
- **Keine Auswirkung auf laufende oder abgeschlossene Prüfungen:** Prüfungssitzungen kopieren ihre Fragen beim Start, und Leistungsnachweise frieren die Fragen beim Öffnen ein (PROJ-21/27). Eine Änderung wirkt nur auf neue Durchläufe.
- **Tests:** 9 neue Fälle für die Route (Login, Rolle, unbekanntes Set, fremder Bereich ohne Schreibzugriff, Austausch der Fragen, Statuswechsel allein, ungültige Eingaben, Löschen).
- **Nicht getestet:** Der Dialog im Browser (Bearbeiten, Fach-Auswahl, Themenfilter) — hier ohne Browser nicht möglich.
