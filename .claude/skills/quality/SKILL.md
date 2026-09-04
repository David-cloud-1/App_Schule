---
name: quality
description: Qualität der Prüfungsfragen messen und verbessern — Audit über den Bestand, Stichprobe lesen, Korrektur-Durchläufe starten. Use when checking or improving question quality, rate tells, or answer-option bias.
argument-hint: "audit | fix <befund-code> | sample"
user-invocable: true
---

# Fragen-Qualität

Sichert, dass ein Prüfling die richtige Antwort **nur am Fachwissen** erkennen kann — nie an einer äußerlichen Eigenschaft wie Länge, Satzbau oder Signalwörtern.

## Bausteine

| Was | Wo |
|-----|-----|
| Prüfregeln (deterministisch) | `src/lib/question-quality.ts` + Tests daneben |
| Generator-Regeln (Prompt) | `src/lib/question-rules.ts` — von beiden Generator-Pfaden importiert |
| Torwächter für neue Entwürfe | `src/app/api/admin/ai-generate/_lib/process-job.ts` |
| Bestands-Audit | `npm run quality:audit` |
| Korrektur mit Pflicht-Verifikation | `npm run quality:apply` |
| Agenten | `.claude/agents/question-auditor.md`, `question-fixer.md` |

## Ablauf

### `audit` (Standard)
Starte den **Question Auditor** als Subagent. Er misst alle Kennzahlen, liest eine Stichprobe und meldet, ob Handlungsbedarf besteht. Gib seinen Bericht wieder und nenne die Empfehlung.

### `fix <befund-code>`
1. Erst auditieren, wenn kein aktueller Bericht vorliegt — ohne Messung kein Durchlauf.
2. Mit dem Nutzer Durchlauf-Namen und Stopp-Kriterium festlegen.
3. **Question Fixer** als Subagent starten, Batches à 20 Fragen.
4. Nach dem Durchlauf erneut auditieren und die Kennzahlen vorher/nachher zeigen.

### `sample`
`npm run quality:sample -- 10` und die Fragen inhaltlich beurteilen: Fachlichkeit, Ton, ob eine Option ohne Fachwissen ins Auge springt.

## Die drei Regeln, an denen frühere Durchläufe gescheitert sind

1. **Zielwert ist Zufallsniveau, nicht null.** Bei fünf Optionen darf die richtige in ~20 % der Fragen die längste sein. Wird das auf 0 gedrückt, entsteht der ebenso brauchbare Trick „die längste ist nie richtig".
2. **Alle Kennzahlen zusammen messen.** Ein Durchlauf, der nur seine eigene Metrik prüft, erzeugt zuverlässig den nächsten Bias — so entstanden Satzanfang-Tell und Telegrammstil.
3. **Stichproben lesen, nicht nur zählen.** Der schwerste bisher gefundene Tell war in keiner Zahl sichtbar.

## Nach Änderungen am Torwächter oder an den Regeln

Codeänderungen brauchen Commit und Deploy (`/deploy`) — anders als reine Datenbankarbeit, die sofort wirkt.
