import { describe, it, expect } from 'vitest'
import { analyzeQuestion, analyzeBatch, firstWord, isNumericSet, hasAbsoluteWord } from './question-quality'

const codes = (q: Parameters<typeof analyzeQuestion>[0]) =>
  analyzeQuestion(q).findings.map((f) => f.code)

/** Saubere Basisfrage: gleich lange Optionen, gleiches Anfangswort, kein Signalwort. */
const clean = {
  question_text: 'Was kennzeichnet den Leihvertrag?',
  options: [
    'Die entgeltliche Überlassung von Sachen auf Zeit',
    'Die unentgeltliche Überlassung zum Gebrauch',
    'Die Herstellung eines Werkes gegen Vergütung',
    'Die Leistung von Diensten gegen Entgelt aller Art',
    'Die Übertragung von Eigentum gegen Kaufpreis',
  ],
  correct_index: 1,
  explanation: 'Beim Leihvertrag wird eine Sache unentgeltlich zum Gebrauch überlassen.',
}

describe('analyzeQuestion – saubere Frage', () => {
  it('meldet keine Blocker', () => {
    const report = analyzeQuestion(clean)
    expect(report.ok).toBe(true)
    expect(report.blockers).toBe(0)
  })
})

describe('Längen-Tell', () => {
  it('erkennt die richtige Antwort als längste Option', () => {
    expect(
      codes({
        ...clean,
        options: [
          'Die entgeltliche Überlassung',
          'Die unentgeltliche Überlassung einer Sache zum Gebrauch auf Zeit ohne Entgelt',
          'Die Herstellung eines Werkes',
          'Die Leistung von Diensten',
          'Die Übertragung von Eigentum',
        ],
      })
    ).toContain('longest_is_correct')
  })

  it('meldet knappen Vorsprung nur als Warnung — sonst entsteht das inverse Muster', () => {
    const report = analyzeQuestion({
      ...clean,
      options: ['Die AAAAA', 'Die BBBB', 'Die CCCC', 'Die DDDD', 'Die EEEE'],
      correct_index: 0,
    })
    expect(report.findings.map((f) => f.code)).toContain('longest_marginal')
    expect(report.blockers).toBe(0)
  })

  it('nimmt reine Zahlenoptionen aus', () => {
    expect(
      codes({
        question_text: 'Wie hoch ist die Höchsthaftung je Schadensfall?',
        options: [
          '2,5 Millionen Euro',
          '1,25 Millionen Euro',
          '600.000 Euro',
          '850.000 Euro',
          '3 Millionen Euro',
        ],
        correct_index: 1,
        explanation: 'Die Begrenzung liegt bei 1,25 Mio. Euro je Schadensfall.',
      })
    ).not.toContain('longest_is_correct')
  })
})

describe('Satzanfang-Tell', () => {
  it('erkennt die einzige Option, die aus dem Muster fällt', () => {
    expect(
      codes({
        ...clean,
        options: [
          'Die entgeltliche Überlassung von Sachen auf Zeit',
          'Unentgeltliche Überlassung zum Gebrauch',
          'Die Herstellung eines Werkes gegen Vergütung',
          'Die Leistung von Diensten gegen Entgelt',
          'Die Übertragung von Eigentum gegen Kaufpreis',
        ],
        correct_index: 1,
      })
    ).toContain('first_word_tell')
  })

  it('greift nicht, wenn die Distraktoren zwei Anfangswörter haben', () => {
    expect(
      codes({
        ...clean,
        options: [
          'Die entgeltliche Überlassung von Sachen',
          'Unentgeltliche Überlassung zum Gebrauch',
          'Eine Herstellung eines Werkes gegen Lohn',
          'Die Leistung von Diensten gegen Entgelt',
          'Eine Übertragung von Eigentum gegen Geld',
        ],
        correct_index: 1,
      })
    ).not.toContain('first_word_tell')
  })
})

describe('Telegrammstil', () => {
  it('erkennt Stichpunkt zwischen ausformulierten Sätzen', () => {
    expect(
      codes({
        question_text: 'Wann gilt eine Sendung als versandfertig?',
        options: [
          'Wenn die Ware vollständig kommissioniert und im Lager bereitgestellt ist',
          'Versandfertig, markiert, Papiere dabei',
          'Wenn der Frachtführer die Sendung bereits übernommen hat',
          'Wenn die Rechnung an den Empfänger versendet worden ist',
          'Wenn die Zollanmeldung durch den Ausführer erstellt wurde',
        ],
        correct_index: 1,
        explanation: 'Versandfertig heißt verpackt, markiert und dokumentiert.',
      })
    ).toContain('telegram_style')
  })
})

describe('Signalwörter', () => {
  it('erkennt die Absolutwort-Fabrik in den Distraktoren', () => {
    const found = codes({
      question_text: 'Welche Abgabe fällt auf die Lohnsteuer an?',
      options: [
        'Ausschließlich die Kirchensteuer der Arbeitnehmer',
        'Der Solidaritätszuschlag auf die Lohnsteuer',
        'Nur die Gewerbesteuer der Arbeitgeberseite',
        'Immer die Umsatzsteuer des Arbeitgebers',
        'Lediglich die Grundsteuer der Gemeinde',
      ],
      correct_index: 1,
      explanation: 'Auf die Lohnsteuer wird der Solidaritätszuschlag erhoben.',
    })
    expect(found).toContain('absolute_overuse')
    expect(found).toContain('absolute_distractor_tell')
  })

  it('lässt ein einzelnes Signalwort zu', () => {
    expect(
      codes({
        ...clean,
        options: [
          'Die entgeltliche Überlassung von Sachen auf Zeit',
          'Die unentgeltliche Überlassung zum Gebrauch',
          'Die Herstellung eines Werkes nur gegen Vergütung',
          'Die Leistung von Diensten gegen Entgelt aller Art',
          'Die Übertragung von Eigentum gegen Kaufpreis',
        ],
      })
    ).not.toContain('absolute_overuse')
  })
})

describe('Struktur', () => {
  it('erkennt falsche Optionszahl', () => {
    expect(codes({ ...clean, options: clean.options.slice(0, 4), correct_index: 1 })).toContain(
      'option_count'
    )
  })

  it('erkennt doppelte Optionen', () => {
    const opts = [...clean.options]
    opts[3] = opts[0]
    expect(codes({ ...clean, options: opts })).toContain('duplicate_options')
  })

  it('erkennt Füller-Optionen', () => {
    const opts = [...clean.options]
    opts[4] = 'Keine der genannten Antworten'
    expect(codes({ ...clean, options: opts })).toContain('filler_option')
  })

  it('warnt bei fehlender Erklärung', () => {
    expect(codes({ ...clean, explanation: null })).toContain('missing_explanation')
  })
})

describe('Hilfsfunktionen', () => {
  it('firstWord ignoriert Groß-/Kleinschreibung und Satzzeichen', () => {
    expect(firstWord('  „Die  Sendung"')).toBe('die')
  })

  it('hasAbsoluteWord trifft nur ganze Wörter', () => {
    expect(hasAbsoluteWord('Es gilt nur für Inlandsfahrten')).toBe(true)
    expect(hasAbsoluteWord('Die Nurdachhaus-Regelung')).toBe(false)
  })

  it('isNumericSet erkennt gemischte Sets nicht als numerisch', () => {
    expect(isNumericSet(['8,33 SZR/kg', '2 SZR/kg'])).toBe(true)
    expect(isNumericSet(['8,33 SZR/kg', 'Die Haftung ist unbegrenzt'])).toBe(false)
  })
})

describe('analyzeBatch – Quoten über viele Fragen', () => {
  /** Baut n Fragen, davon k mit knapp längster richtiger Antwort. */
  const build = (n: number, k: number) =>
    Array.from({ length: n }, (_, i) => ({
      question_text: `Frage ${i}?`,
      options:
        i < k
          ? ['Die AAAAA', 'Die BBBB', 'Die CCCC', 'Die DDDD', 'Die EEEE']
          : ['Die AAAA', 'Die BBBBB', 'Die CCCC', 'Die DDDD', 'Die EEEE'],
      correct_index: 0,
      explanation: 'Eine hinreichend lange Erklärung.',
    }))

  it('erkennt eine zu hohe Längenquote', () => {
    const m = analyzeBatch(build(100, 70)).metrics.find((x) => x.key === 'longest_is_correct')!
    expect(m.share).toBeCloseTo(0.7)
    expect(m.verdict).toBe('zu hoch')
  })

  it('erkennt das inverse Muster als zu niedrig', () => {
    const m = analyzeBatch(build(100, 0)).metrics.find((x) => x.key === 'longest_is_correct')!
    expect(m.verdict).toBe('zu niedrig')
  })

  it('akzeptiert Zufallsniveau', () => {
    const m = analyzeBatch(build(100, 20)).metrics.find((x) => x.key === 'longest_is_correct')!
    expect(m.verdict).toBe('ok')
  })
})

describe('Signalwort-Schwelle', () => {
  const withAbsolutes = (n: number) => {
    const opts = [
      'Die Herstellung eines Werkes gegen Vergütung',
      'Die Leistung von Diensten gegen Entgelt',
      'Die Übertragung von Eigentum gegen Geld',
      'Die Vermietung von Räumen auf Zeit',
      'Die Verwahrung von Sachen gegen Lohn',
    ]
    for (let i = 0; i < n; i++) opts[i] = opts[i].replace('Die ', 'Die nur ')
    return analyzeQuestion({
      question_text: 'Was kennzeichnet den Werkvertrag?',
      options: opts,
      correct_index: 4,
      explanation: 'Der Werkvertrag schuldet einen Erfolg.',
    })
  }

  it('zwei Signalwörter sind nur eine Warnung', () => {
    const r = withAbsolutes(2)
    expect(r.findings.map((f) => f.code)).toContain('absolute_frequency')
    expect(r.blockers).toBe(0)
  })

  it('drei Signalwörter blockieren', () => {
    const r = withAbsolutes(3)
    expect(r.findings.map((f) => f.code)).toContain('absolute_overuse')
    expect(r.ok).toBe(false)
  })
})
