import type { SessionRow, SnapshotQuestion } from '@/lib/graded-assessments'

/**
 * Aufgabenanalyse eines Leistungsnachweises (PROJ-75): Lösungsquote,
 * Trennschärfe, Antwortverteilung und eine Ampel je Frage. Rechnet nur aus
 * bereits bewerteten Sitzungen (applyGrading) und kennt keine Datenbank.
 */

/** Ab so vielen gewerteten Abgaben ist die Trennschärfe aussagekräftig */
export const MIN_PARTICIPANTS_FOR_DISCRIMINATION = 8
/** Anteil der besten bzw. schwächsten Teilnehmer für den Vergleich */
export const DISCRIMINATION_GROUP_SHARE = 0.27

export type AnalysisLight = 'none' | 'green' | 'yellow' | 'red'
export type AnalysisReason =
  | 'wrong_option_wins'
  | 'negative_discrimination'
  | 'too_easy'
  | 'too_hard'
  | 'weak_discrimination'

export interface ItemOption {
  id: string
  text: string
  isCorrect: boolean
  selectedCount: number
  percent: number
}

export interface ItemAnalysis {
  id: string
  position: number
  text: string
  /** aus der Wertung genommen (zählt nicht für Punkte und Note) */
  excluded: boolean
  answered: number
  correctCount: number
  /** 0–100, null ohne Antworten */
  correctRate: number | null
  /** −1 … 1, null bei zu wenigen Teilnehmern */
  discrimination: number | null
  unanswered: number
  options: ItemOption[]
  light: AnalysisLight
  reasons: AnalysisReason[]
}

export interface AssessmentAnalysis {
  participants: number
  discriminationAvailable: boolean
  items: ItemAnalysis[]
}

export const ANALYSIS_REASON_HINT: Record<AnalysisReason, string> = {
  wrong_option_wins:
    'Eine falsche Antwort wurde häufiger gewählt als die richtige. Prüfe, ob sie auch richtig sein kann oder die Lösung falsch hinterlegt ist.',
  negative_discrimination:
    'Starke Teilnehmer lösten die Frage seltener als schwache. Das deutet auf eine missverständliche oder fehlerhafte Frage hin.',
  too_easy: 'Fast alle haben die Frage gelöst. Sie trennt die Leistungen kaum.',
  too_hard: 'Weniger als jeder Fünfte hat die Frage gelöst. Prüfe, ob sie im Unterricht dran war.',
  weak_discrimination: 'Die Frage unterscheidet kaum zwischen starken und schwachen Teilnehmern.',
}

function round(value: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

function rate(correct: number, total: number): number {
  return total > 0 ? correct / total : 0
}

export function analyzeAssessment(rows: SessionRow[], part: number): AssessmentAnalysis {
  const partKey = String(part)
  // Nur abgegebene, nicht ausgeschlossene Versuche
  const scored = rows.filter((r) => r.status !== 'in_progress' && !r.excluded_from_grading)
  const perSession = scored.map((r) => r.results_json?.parts?.[partKey]?.questions ?? [])

  const reference: SnapshotQuestion[] = perSession.find((qs) => qs.length > 0) ?? []
  const mc = reference.filter((q) => q.type === 'multiple_choice')

  // Gesamtpunktzahl je Teilnehmer ohne die aus der Wertung genommenen Fragen
  const totals = perSession.map((qs) => qs.filter((q) => q.type === 'multiple_choice' && !q.excluded && q.is_correct).length)
  const participants = scored.length
  const discriminationAvailable = participants >= MIN_PARTICIPANTS_FOR_DISCRIMINATION

  // Reihenfolge nach Gesamtpunkten, beste zuerst (stabil)
  const order = totals.map((t, i) => ({ t, i })).sort((a, b) => b.t - a.t || a.i - b.i)
  const groupSize = Math.max(1, Math.round(participants * DISCRIMINATION_GROUP_SHARE))
  const upper = new Set(order.slice(0, groupSize).map((o) => o.i))
  const lower = new Set(order.slice(Math.max(0, order.length - groupSize)).map((o) => o.i))

  const items: ItemAnalysis[] = mc.map((ref, index) => {
    let answered = 0
    let correctCount = 0
    let unanswered = 0
    let upperCorrect = 0
    let lowerCorrect = 0
    const picks = new Map<string, number>()

    perSession.forEach((qs, sessionIndex) => {
      const q = qs.find((x) => x.id === ref.id)
      if (!q) return
      if (q.student_answer) {
        answered += 1
        picks.set(q.student_answer, (picks.get(q.student_answer) ?? 0) + 1)
      } else {
        unanswered += 1
      }
      const ok = !!q.is_correct
      if (ok) correctCount += 1
      if (upper.has(sessionIndex) && ok) upperCorrect += 1
      if (lower.has(sessionIndex) && ok) lowerCorrect += 1
    })

    const total = answered + unanswered
    const correctRate = total > 0 ? Math.round((correctCount / total) * 100) : null
    const discrimination = discriminationAvailable
      ? round(rate(upperCorrect, groupSize) - rate(lowerCorrect, groupSize), 2)
      : null

    const options: ItemOption[] = (ref.answer_options ?? []).map((o) => {
      const selectedCount = picks.get(o.id) ?? 0
      return {
        id: o.id,
        text: o.option_text,
        isCorrect: o.is_correct,
        selectedCount,
        percent: total > 0 ? Math.round((selectedCount / total) * 100) : 0,
      }
    })

    const reasons: AnalysisReason[] = []
    let light: AnalysisLight = total === 0 ? 'none' : 'green'
    if (total > 0) {
      const topWrong = Math.max(0, ...options.filter((o) => !o.isCorrect).map((o) => o.selectedCount))
      if (topWrong > 0 && topWrong > correctCount) reasons.push('wrong_option_wins')
      if (discrimination !== null && discrimination < 0) reasons.push('negative_discrimination')
      const red = reasons.length > 0
      if (correctRate !== null && correctRate > 95) reasons.push('too_easy')
      if (correctRate !== null && correctRate < 20) reasons.push('too_hard')
      if (discrimination !== null && discrimination < 0.15 && !reasons.includes('too_easy')) {
        reasons.push('weak_discrimination')
      }
      light = red ? 'red' : reasons.length > 0 ? 'yellow' : 'green'
    }

    return {
      id: ref.id,
      position: index + 1,
      text: ref.question_text ?? '',
      excluded: !!ref.excluded,
      answered,
      correctCount,
      correctRate,
      discrimination,
      unanswered,
      options,
      light,
      reasons,
    }
  })

  return { participants, discriminationAvailable, items }
}
