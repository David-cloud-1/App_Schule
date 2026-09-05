---
name: fun
description: Spielspaß und Wiederkehr prüfen — Nutzungs-Audit, Einzelnutzer-Verläufe, begründete Ideen fürs Backlog. Use when engagement, retention, streaks, badges, leaderboard, motivation or "warum kommt keiner wieder" come up.
argument-hint: "audit | ideen | nutzer <id>"
user-invocable: true
---

# Spielspaß

Sichert, dass die Azubis **wiederkommen**. Die Fragen-Qualität (`/quality`)
sorgt dafür, dass gelernt wird, was richtig ist — hier geht es darum, dass
überhaupt gelernt wird. Eine perfekte Frage, die niemand aufruft, lehrt nichts.

## Bausteine

| Was | Wo |
|-----|-----|
| Kennzahlen (reine Rechenlogik) | `src/lib/engagement-metrics.ts` + Tests daneben |
| Nutzungs-Audit | `npm run fun:audit` |
| Einzelverlauf eines Nutzers | `npm run fun:user -- <user-id>` |
| Musterkatalog (Duolingo & Co.) | `docs/engagement-patterns.md` |
| Ideen-Backlog | `docs/engagement-ideas.md` |
| Agent | `.claude/agents/fun-auditor.md` |

## Ablauf

### `audit` (Standard)
Starte den **Fun Auditor** als Subagent. Er misst die Nutzung, liest den
Gamification-Code, sieht sich verschwundene Nutzer einzeln an und meldet, wo es
abbricht. Gib seinen Bericht wieder und nenne die Empfehlung.

### `ideen`
Wie `audit`, aber mit dem Auftrag, das Backlog fortzuschreiben: neue Vorschläge
begründet ergänzen, widerlegte streichen, Reihenfolge nach Wirkung je Aufwand
neu setzen. Danach mit dem Nutzer die oberste Idee besprechen und bei Zustimmung
nach `/requirements` übergeben.

### `nutzer <id>`
`npm run fun:user -- <id>` — Tag für Tag, was dieser Azubi erlebt hat. Für die
Frage, warum jemand aufgehört hat. Bei einer kleinen Klasse aussagekräftiger
als jede Quote.

## Die vier Regeln, an denen Gamification üblicherweise scheitert

1. **Ein zu hoher Wert ist auch ein Befund.** 95 % Trefferquote heißt nicht „gut
   gelernt", sondern „zu leicht". Ziel ist der Korridor, nicht das Maximum —
   dieselbe Logik wie bei den Fragen.
2. **Erst prüfen, warum das Vorhandene nicht greift.** Streak, XP, Badges und
   Rangliste sind gebaut. Ein neues Feature obendrauf ist selten die Antwort;
   meist ist die bestehende Mechanik unsichtbar oder ohne Auffangnetz.
3. **Zahlen erklären nichts von selbst.** Dass alle Konten am selben Tag gegen
   11 Uhr aufhörten, hieß: die App lief im Unterricht, nie privat. Das stand in
   keiner Kennzahl — nur im Einzelverlauf.
4. **Die Grenzen des PRD gelten.** Keine native App, kein Chat, kein Budget für
   Dauerdienste. Dark Mode und mobile-first nach `docs/DESIGN.md`.

## Nach dem Audit

Ideen sind Vorschläge, kein Auftrag. Umgesetzt wird über den normalen Workflow:
`/requirements` für die Spec, dann `/frontend` oder `/backend`. Der Agent baut
nichts selbst.
