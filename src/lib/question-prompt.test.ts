import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildQuestionPrompt, buildUploadExamContext, formatClassLevels } from './question-prompt'
import { buildQualityRules } from './question-rules'

// Werte des Bereichs Spedition, wie sie die Migration 20260929_proj22 anlegt
const SPED = {
  promptRole: 'Experte für Prüfungsfragen im Bereich Spedition und Logistik (IHK Bayern)',
  targetGroup: 'angehende Speditionskaufleute',
  promptNotes: null,
  classLevels: [10, 11, 12],
}
const SPED_SUBJECTS = [
  { code: 'BGP', name: 'Betriebliche und gesamtwirtschaftliche Prozesse' },
  { code: 'KSK', name: 'Kaufmännische Steuerung und Kontrolle' },
  { code: 'STG', name: 'Speditionelle und transportrelevante Geschäftsprozesse' },
  { code: 'LOP', name: 'Logistische Leistungsprozesse' },
  { code: 'PUG', name: 'Politik und Gesellschaft' },
]

// Der Prompt, wie er vor PROJ-22 fest in src/app/admin/ai-generator/page.tsx stand
const BEFORE = fs.readFileSync(
  path.join(import.meta.dirname, '__fixtures__/sped-question-prompt-before-proj22.txt'),
  'utf8',
)

// Die einzigen gewollten Änderungen: zwei Beispiele mit Speditionsvokabular
// in den Qualitätsregeln wurden fachneutral formuliert.
const NEUTRALIZED_EXAMPLES: [string, string][] = [
  ['nicht "Versandfertig, markiert, Papiere dabei", sondern "Die Sendung ist versandfertig verpackt, markiert und dokumentiert"',
   'nicht "Vollständig, geprüft, abgelegt", sondern "Die Unterlagen sind vollständig, geprüft und abgelegt"'],
  ['"Ein Lkw hat Fixkosten von 224 € je Tag.', '"Eine Maschine hat Fixkosten von 224 € je Tag.'],
]

// Zusätzliche, bewusste Neuerung (2026-10-02): Fachbereiche mit kurzen
// Dokumenten (z. B. Tourismus) sollen nicht auf 75 Fragen hin "aufgefüllt"
// werden. Siehe [[tourismus-kurze-skripte-prompt]] in docs/Memory.
const ADDED_RULE_LINE =
  '- Die Anzahl richtet sich nach dem tatsächlichen Stoffumfang des Dokuments, nicht nach einer Zielzahl — bei einem kurzen Dokument sind deutlich weniger als 75 Fragen normal und richtig. Lieber wenige gute Fragen als Fragen erzwingen oder wiederholen.\n'

describe('buildQuestionPrompt', () => {
  it('erzeugt für Spedition exakt den bisherigen Prompt (bis auf die neutralisierten Beispiele und die neue Mengen-Regel)', () => {
    let expected = BEFORE
    for (const [from, to] of NEUTRALIZED_EXAMPLES) {
      expect(expected).toContain(from)
      expected = expected.replace(from, to)
    }
    expect(expected).toContain('- Maximal 75 Fragen\n')
    expected = expected.replace('- Maximal 75 Fragen\n', `- Maximal 75 Fragen\n${ADDED_RULE_LINE}`)
    expect(buildQuestionPrompt(SPED, SPED_SUBJECTS)).toBe(expected)
  })

  it('listet genau die übergebenen Fächer in ihrer Reihenfolge', () => {
    const prompt = buildQuestionPrompt(SPED, [
      { code: 'RVT', name: 'Reiseverkehrstouristik' },
      { code: 'KSK', name: 'Kaufmännische Steuerung' },
    ])
    expect(prompt).toContain('FÄCHER:\n- RVT = Reiseverkehrstouristik\n- KSK = Kaufmännische Steuerung\n\nREGELN:')
    expect(prompt).not.toContain('BGP')
    expect(prompt).toContain('"fach_code": "RVT"')
  })

  it('setzt Rolle und Zielgruppe des Bereichs ein', () => {
    const prompt = buildQuestionPrompt(
      { ...SPED, promptRole: 'Experte für Tourismus', targetGroup: 'angehende Tourismuskaufleute' },
      SPED_SUBJECTS,
    )
    expect(prompt.startsWith('Du bist ein Experte für Tourismus.\n')).toBe(true)
    expect(prompt).toContain('Zielgruppe sind Berufsschüler (angehende Tourismuskaufleute)')
    expect(prompt).not.toContain('Speditionskaufleute')
  })

  it('hängt Zusatzhinweise der Lehrkraft vor dem JSON-Format an', () => {
    const prompt = buildQuestionPrompt({ ...SPED, promptNotes: '  Bitte nur Fragen zum Pauschalreiserecht.  ' }, SPED_SUBJECTS)
    const notesAt = prompt.indexOf('ZUSATZHINWEISE DER LEHRKRAFT:\nBitte nur Fragen zum Pauschalreiserecht.')
    expect(notesAt).toBeGreaterThan(0)
    expect(notesAt).toBeLessThan(prompt.indexOf('Antworte AUSSCHLIESSLICH'))
  })

  it('lässt leere Zusatzhinweise weg', () => {
    expect(buildQuestionPrompt({ ...SPED, promptNotes: '   ' }, SPED_SUBJECTS)).not.toContain('ZUSATZHINWEISE')
  })

  it('passt die Klassenstufen-Regel an den Bereich an', () => {
    expect(buildQuestionPrompt({ ...SPED, classLevels: [11, 12] }, SPED_SUBJECTS)).toContain('- klassenstufe: 11 oder 12 —')
    const none = buildQuestionPrompt({ ...SPED, classLevels: [] }, SPED_SUBJECTS)
    expect(none).toContain('- klassenstufe: immer weglassen (null)')
    expect(none).toContain('"klassenstufe": null')
  })
})

describe('formatClassLevels', () => {
  it('formatiert natürlichsprachig', () => {
    expect(formatClassLevels([10, 11, 12])).toBe('10, 11 oder 12')
    expect(formatClassLevels([10])).toBe('10')
    expect(formatClassLevels([])).toBe('')
  })
})

describe('buildQualityRules', () => {
  it('enthält kein Speditionsvokabular mehr außer der eingesetzten Zielgruppe', () => {
    const rules = buildQualityRules('ZIELGRUPPE')
    expect(rules).toContain('Berufsschüler (ZIELGRUPPE)')
    expect(rules).not.toMatch(/Spedition|Lkw|Sendung/i)
  })
})

describe('buildUploadExamContext', () => {
  it('nutzt dieselbe Zielgruppe und Fächerliste wie der kopierte Prompt', () => {
    const ctx = buildUploadExamContext(SPED, SPED_SUBJECTS)
    expect(ctx).toContain('Prüfungsfragen für angehende Speditionskaufleute')
    expect(ctx).toContain('BGP (Betriebliche und gesamtwirtschaftliche Prozesse), KSK (')
    expect(ctx).toContain(buildQualityRules(SPED.targetGroup))
  })
})
