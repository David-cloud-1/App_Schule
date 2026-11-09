# Product Requirements Document

## Vision
Eine mobile-first Web-App für angehende Speditionskaufleute in Bayern, die spielerisch und kontinuierlich auf ihre Abschlussprüfung vorbereitet. Inspiriert von Duolingo kombiniert die App strukturiertes Lernen der Ausbildungsinhalte (BGP, KSK, STG, LOP) mit starken Gamification-Elementen wie XP, Streaks, Badges und einer Rangliste — damit Azubis täglich motiviert bleiben.

## Target Users

### Primär: Auszubildende Speditionskaufleute (Bayern)
- Lernen neben dem Berufsalltag für ihre IHK-Abschlussprüfung
- Brauchen kurze, wiederholbare Lerneinheiten (5–15 Min. täglich)
- Sind es gewohnt, Apps am Smartphone zu nutzen
- Fühlen sich durch Wettbewerb und Fortschrittsanzeigen motiviert

### Sekundär: Admin (Ausbilder / Lehrer)
- Möchte Lernmaterial hochladen und daraus Fragen generieren lassen
- Braucht Kontrolle über Fragen: prüfen, bearbeiten, löschen
- Kein technisches Know-how vorausgesetzt

## Prüfungsstruktur (Fachlicher Kontext)

**Ausbildung:** Speditionskaufmann/-frau (IHK Bayern)

**Lernfächer:**
- **BGP** – Betriebliche und gesamtwirtschaftliche Prozesse
- **KSK** – Kaufmännische Steuerung und Kontrolle
- **STG** – Speditionelle und transportrelevante Geschäftsprozesse
- **LOP** – Logistische Leistungsprozesse

**Abschlussprüfung (3 Teile):**
1. **Leistungserstellung in Spedition und Logistik** – Transport, Umschlag, Lager, Logistik-DL, Marketing; verkehrsträgerübergreifend sowie verkehrsträgerspezifisch (Straße, Schiene, Luft, Binnenschiff, Seeschiff)
2. **Kaufmännische Steuerung und Kontrolle** – Kosten-/Leistungsrechnung, Controlling, Preisangebote (90 Min.)
3. **Wirtschafts- und Sozialkunde** – Allg. Wirtschaft, Gesellschaft, Bedeutung der Speditionsbranche

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | PROJ-1: User Authentication | Planned |
| P0 (MVP) | PROJ-2: Subject & Question Structure | Planned |
| P0 (MVP) | PROJ-3: Daily Learning Session / Quiz | Planned |
| P0 (MVP) | PROJ-4: XP & Level System | Planned |
| P0 (MVP) | PROJ-5: Streak System | Planned |
| P1 | PROJ-6: Learning Progress Dashboard | Deployed |
| P1 | PROJ-7: Achievements & Badges | Deployed |
| P1 | PROJ-8: Leaderboard | Deployed |
| P1 | PROJ-9: Admin Content Management Panel | Deployed |
| P2 | PROJ-10: AI Question Generation | Deployed |
| P2 | PROJ-11: Exam Simulation Mode | Deployed |
| P1 | PROJ-14: Lücken schließen | Deployed |
| P0 | PROJ-18: Rückkehr-Erinnerung per Web-Push | Architected |
| P0 | PROJ-19: Blitzrunde & Frachtmünzen | Deployed |
| P0 | PROJ-20: Speditionshof & Shop | Deployed |
| P1 | PROJ-21: Benotete Leistungsnachweise | Deployed |
| P1 | PROJ-22: Fachbereich als Datenbasis | Deployed |
| P1 | PROJ-23: Fachbereichs-Zuordnung für Azubis | Deployed |
| P1 | PROJ-24: Fachbereichs-Admins & Rechtetrennung | Deployed |
| P1 | PROJ-25: Onboarding Tourismus (Touristiklern-Grundgerüst) | Deployed |
| P1 | PROJ-26: Visuelle Hof-Szene & kategorisierter Item-Katalog | Deployed |
| P1 | PROJ-27: Leistungsnachweis – eigene Fragen-Zusammenstellung | Deployed |
| P1 | PROJ-28: Leistungsnachweis – Druck & Klassenauswertung | Deployed |
| P1 | PROJ-29: Bereichs-Umschalter für den Super-Admin | Deployed |
| P1 | PROJ-30: Fokus-Verlust-Protokoll bei Leistungsnachweisen | Deployed |
| P1 | PROJ-31: Tourismus-Reisebüro – Grafikset, Startkatalog & eigene Szene | Deployed |
| P2 | PROJ-32: Hof-Ausbau – Effekte für teure Items & mehr Grafiken | Deployed |
| P1 | PROJ-33: Echte Hof-Illustration (Spedition & Tourismus) | Deployed |
| P1 | PROJ-34: „Mein Betrieb“ – isometrische Ansicht & Selbst-Platzieren (Spedition) | Deployed |
| P1 | PROJ-35: „Mein Resort“ – Tourismus-Hotelkomplex (isometrisch) | Deployed |
| P1 | PROJ-36: Mehr Deko für „Mein Betrieb“ und „Mein Resort“ | Deployed |
| P1 | PROJ-37: Belebte Welt – Tiere, Gäste und Arbeiter laufen herum | Deployed |
| P1 | PROJ-38: Leistungsnachweis – Fragen-Import per Kopier-Prompt (kostenlos) | Deployed |
| P1 | PROJ-39: Leistungsnachweis – Kategorisierung & Filter | Deployed |
| P1 | PROJ-40: Lehrkräfte-Bereich übersichtlicher (Startseite & gruppierte Navigation) | Deployed |
| P1 | PROJ-41: Bottom-Navigation für Spieler & Umzug der Startseiten-Inhalte | Deployed |
| P1 | PROJ-42: „Heute“-Screen – aufgeräumte Spieler-Startseite | Deployed |
| P1 | PROJ-43: Lernbibliothek – Tab „Lernen“ & Fachseite mit Themenpfad | Deployed |
| P1 | PROJ-44: Lehrkraft-Rolle & Freischaltung | Deployed |
| P1 | PROJ-45: Lehrkräfte-Arbeitsbereich – modernes Layout für Desktop & Handy | Deployed |
| P1 | PROJ-46: Leistungsnachweise für Lehrkräfte ohne Fachbereich | Deployed |
| P1 | PROJ-47: Änderungsverlauf & Wiederherstellen für Inhalte | Deployed |
| P1 | PROJ-48: Fach-Zuständigkeiten für Lehrkräfte (selbst eingetragen) | Deployed |
| P1 | PROJ-49: Lehrkraft und Bereichs-Admin sichtbar trennen | Deployed |
| P1 | PROJ-50: Lehrkraft-Profil („Mein Konto“) & verkürzte Spielansicht | Deployed |
| P1 | PROJ-51: Werkzeugkiste – Rahmen & Durchstich „Ganzes Skript“ | Deployed |
| P1 | PROJ-52: Werkzeugkiste – Meine Materialien | Deployed |
| P1 | PROJ-53: Werkzeugkiste – Regal des Kollegiums | Deployed |
| P1 | PROJ-54: Werkzeugkiste – die übrigen 11 Werkzeuge | Deployed |
| P1 | PROJ-55: Schulrecht nachschlagen | Deployed |
| P2 | PROJ-56: Alte Werkzeugkiste ablösen | Planned |
| P1 | PROJ-57: Nutzerliste – Sortieren & Inaktiv-Filter | Deployed |
| P1 | PROJ-58: Passwort neu vergeben (mit Pflichtwechsel) | Deployed |
| P2 | PROJ-59: Nutzer-Detailseite (Super-Admin) | Deployed |
| P1 | PROJ-60: Konto löschen (DSGVO) | Deployed |
| P2 | PROJ-61: Nutzer – CSV-Export & Mehrfachauswahl (Super-Admin) | Deployed |
| P2 | PROJ-62: Konten anlegen & Sammel-Anlage per CSV (Super-Admin) | Architected |
| P1 | PROJ-63: Lehrerzimmer – Forum für den Austausch im Kollegium | Deployed |
| P1 | PROJ-64: Werkzeugkiste – Direkt erstellen (bezahlte KI) | In Progress |
| P1 | PROJ-65: Werkzeugkiste – Mein Verbrauch (im eigenen Konto) | Deployed |
| P1 | PROJ-66: Werkzeugkiste – Kostenübersicht für den Super-Admin | Planned |
| P1 | PROJ-67: Werkzeugkiste – Öffentlicher Link („Link für alle“) | Deployed |
| P1 | PROJ-68: Werkzeugkiste – kürzere Prompts und Antworten ohne Qualitätsverlust | Deployed |
| P1 | PROJ-69: Werkzeugkiste – kostenloser Weg in Teilen (lange Skripte) | Deployed |
| P1 | PROJ-70: Lehrkräfte-Bereich – Inhalte offen für alle, lückenlos protokolliert | Deployed |
| P1 | PROJ-71: Werkzeugkiste – zu lange Abschnitte weiter zerlegen | Deployed |
| P1 | PROJ-72: Frage melden (Azubi-Seite) | Deployed |
| P1 | PROJ-73: Meldungs-Inbox für Lehrkräfte (mit Rückmeldung & Belohnung) | Deployed |
| P1 | PROJ-74: „Was fällt allen schwer?“ – schwierigste Fragen und Themen | Deployed |
| P1 | PROJ-75: Leistungsnachweis – Aufgabenanalyse & Ausreißer | Deployed |
| P2 | PROJ-76: Leistungsnachweis – Gruppen A/B | In Review |
| P2 | PROJ-77: Notenschlüssel-Vorlagen & Notenlisten-Export | Deployed |
| P1 | PROJ-78: Nachweis in zwei Klicks – Vorschlag nach Thema, Anzahl & Schwierigkeit | Deployed |
| P2 | PROJ-79: Nachweis duplizieren & schwache Fragen ersetzen | Deployed |
| P2 | PROJ-80: Nachteilsausgleich & Nachschreiber im Leistungsnachweis | Planned |
| P1 | PROJ-81: Aufgabenliste für Lehrkräfte auf der Startseite | Deployed |
| P1 | PROJ-82: Gemeldete Fragen direkt in der Inbox prüfen, bearbeiten und abschließen | Deployed |

## Success Metrics
- **Daily Active Users (DAU):** ≥ 70% der registrierten Azubis nutzen die App mindestens 3x/Woche
- **Streak Retention:** Ø Streak-Länge ≥ 7 Tage nach 4 Wochen
- **Question Coverage:** ≥ 200 Fragen pro Fach vor dem ersten Prüfungsdurchgang
- **Prüfungserfolg:** Subjektive Selbsteinschätzung der Azubis verbessert sich messbar (Umfrage)

## Constraints
- **Team:** 1 Entwickler (AI-gestützt mit Claude Code)
- **Budget:** Niedrig — Supabase Free Tier + Vercel Hobby Plan als Start
- **Timeline:** MVP in 4–6 Wochen
- **Technologie:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Supabase
- **Plattform:** Mobile-First Responsive Web App (kein App Store)

## Non-Goals
- Native iOS / Android App (kein App Store)
- Echtzeit-Chat oder Kollaborationsfunktionen zwischen Azubis
- Lehrerverwaltung mit mehreren Admin-Accounts (vorerst 1 Admin)
- Automatische Kursplanerstellung / KI-gestütztes adaptives Lernen (Phase 2)
- Videoinhalt oder Audiodateien als Lernmaterial

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
