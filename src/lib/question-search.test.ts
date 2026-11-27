import { describe, it, expect } from 'vitest'
import { likePattern, questionOrAnswerFilter } from './question-search'

describe('Suche in Frage und Antwort (PROJ-131)', () => {
  it('behandelt % und _ wörtlich', () => {
    expect(likePattern(' 50% _x ')).toBe('%50\\% \\_x%')
  })
  it('setzt den Begriff in Anführungszeichen, damit Kommas den Filter nicht zerlegen', () => {
    expect(questionOrAnswerFilter('A, B (C)', [])).toBe('question_text.ilike."%A, B (C)%"')
  })
  it('nimmt Fragen mit passender Antwort dazu', () => {
    expect(questionOrAnswerFilter('CMR', ['a', 'b'])).toBe('question_text.ilike."%CMR%",id.in.(a,b)')
  })
})
