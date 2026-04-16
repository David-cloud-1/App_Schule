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
| P1 | PROJ-6: Learning Progress Dashboard | Planned |
| P1 | PROJ-7: Achievements & Badges | Planned |
| P1 | PROJ-8: Leaderboard | Planned |
| P1 | PROJ-9: Admin Content Management Panel | Planned |
| P2 | PROJ-10: AI Question Generation | Planned |
| P2 | PROJ-11: Exam Simulation Mode | Planned |

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
