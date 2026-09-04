import { describe, it, expect } from 'vitest'
import { checkImportRows, buildFixPrompt, rowToQuestion, type ImportRow } from './question-import'

const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  question_text: 'Was kennzeichnet den Leihvertrag?',
  antwort_a: 'Die entgeltliche Überlassung von Sachen auf Zeit',
  antwort_b: 'Die unentgeltliche Überlassung zum Gebrauch',
  antwort_c: 'Die Herstellung eines Werkes gegen Vergütung',
  antwort_d: 'Die Leistung von Diensten gegen Entgelt aller Art',
  antwort_e: 'Die Übertragung von Eigentum gegen Kaufpreis',
  korrekte_antwort: 'B',
  erklaerung: 'Beim Leihvertrag wird unentgeltlich zum Gebrauch überlassen.',
  fach_code: 'BGP',
  schwierigkeit: 'mittel',
  ...over,
})

describe('rowToQuestion', () => {
  it('bildet Buchstaben auf den Index ab', () => {
    expect(rowToQuestion(row({ korrekte_antwort: 'D' })).correct_index).toBe(3)
  })

  it('stürzt bei unvollständigen KI-Antworten nicht ab', () => {
    const broken = { question_text: 'Frage?' } as unknown as ImportRow
    expect(() => rowToQuestion(broken)).not.toThrow()
    expect(rowToQuestion(broken).options).toEqual(['', '', '', '', ''])
  })
})

describe('checkImportRows', () => {
  it('lässt saubere Zeilen durch', () => {
    const result = checkImportRows([row(), row()])
    expect(result.clean).toBe(2)
    expect(result.flagged).toHaveLength(0)
  })

  it('beanstandet den Satzanfang-Tell und merkt sich die Position', () => {
    const result = checkImportRows([
      row(),
      row({ antwort_b: 'Unentgeltliche Überlassung zum Gebrauch' }),
    ])
    expect(result.clean).toBe(1)
    expect(result.flagged[0].index).toBe(1)
    expect(result.flagged[0].blockers.map((b) => b.code)).toContain('first_word_tell')
  })

  it('meldet nur Blocker, keine Warnungen', () => {
    const result = checkImportRows([row({ erklaerung: null })])
    expect(result.flagged).toHaveLength(0)
  })
})

describe('buildFixPrompt', () => {
  it('enthält Fragetext, Beanstandung, Regeln und das Ausgangs-JSON', () => {
    const flagged = checkImportRows([
      row({ antwort_b: 'Unentgeltliche Überlassung zum Gebrauch' }),
    ]).flagged
    const prompt = buildFixPrompt(flagged)
    expect(prompt).toContain('Was kennzeichnet den Leihvertrag?')
    expect(prompt).toContain('Alle Distraktoren beginnen mit')
    expect(prompt).toContain('REGELN FÜR ANTWORTOPTIONEN')
    expect(prompt).toContain('"rows"')
    expect(prompt).toContain('Unentgeltliche Überlassung zum Gebrauch')
  })
})
