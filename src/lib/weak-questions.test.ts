import { describe, it, expect } from 'vitest'
import { computeWeakQuestionIds } from './weak-questions'

const OLD = '2026-09-01T10:00:00Z'
const NEW = '2026-09-28T10:00:00Z'

const a = (question_id: string, is_correct: boolean, answered_at = NEW) => ({
  question_id,
  is_correct,
  answered_at,
})

describe('computeWeakQuestionIds', () => {
  describe('answers under the new rule', () => {
    it('marks a question as weak after one wrong answer', () => {
      expect(computeWeakQuestionIds([a('q1', false)])).toEqual(['q1'])
    })

    it('never marks questions that were always answered correctly', () => {
      expect(computeWeakQuestionIds([a('q1', true), a('q1', true)])).toEqual([])
    })

    it('keeps the gap open after only one correct answer', () => {
      expect(computeWeakQuestionIds([a('q1', false), a('q1', true)])).toEqual(['q1'])
    })

    it('closes the gap after two correct answers in a row, however many mistakes came before', () => {
      const answers = [a('q1', false), a('q1', false), a('q1', false), a('q1', true), a('q1', true)]
      expect(computeWeakQuestionIds(answers)).toEqual([])
    })

    it('reopens the gap on a new wrong answer', () => {
      const answers = [a('q1', false), a('q1', true), a('q1', true), a('q1', false)]
      expect(computeWeakQuestionIds(answers)).toEqual(['q1'])
    })

    it('does not count correct answers that were interrupted by a mistake', () => {
      const answers = [a('q1', false), a('q1', true), a('q1', false), a('q1', true)]
      expect(computeWeakQuestionIds(answers)).toEqual(['q1'])
    })

    it('lists untouched gaps before half-closed ones', () => {
      const answers = [a('q1', false), a('q1', true), a('q2', true), a('q2', false)]
      expect(computeWeakQuestionIds(answers)).toEqual(['q2', 'q1'])
    })
  })

  describe('answers from before the rule change', () => {
    it('keeps a gap the old error-rate rule had open', () => {
      const answers = [a('q1', false, OLD), a('q1', false, OLD), a('q1', true, OLD)]
      expect(computeWeakQuestionIds(answers)).toEqual(['q1'])
    })

    it('does not open a gap from an old mistake the old rule tolerated', () => {
      const answers = [a('q1', true, OLD), a('q1', true, OLD), a('q1', false, OLD)]
      expect(computeWeakQuestionIds(answers)).toEqual([])
    })

    it('closes an old gap with two correct answers in a row now', () => {
      const answers = [a('q1', false, OLD), a('q1', false, OLD), a('q1', true), a('q1', true)]
      expect(computeWeakQuestionIds(answers)).toEqual([])
    })

    it('counts correct answers from before the change towards closing an old gap', () => {
      const answers = [a('q1', false, OLD), a('q1', false, OLD), a('q1', false, OLD), a('q1', true, OLD), a('q1', true, OLD)]
      expect(computeWeakQuestionIds(answers)).toEqual([])
    })

    it('opens a gap for an old question on a new mistake', () => {
      const answers = [a('q1', true, OLD), a('q1', true, OLD), a('q1', false)]
      expect(computeWeakQuestionIds(answers)).toEqual(['q1'])
    })

    it('does not reopen a tolerated old question on a new correct answer', () => {
      const answers = [a('q1', true, OLD), a('q1', false, OLD), a('q1', true)]
      expect(computeWeakQuestionIds(answers)).toEqual([])
    })
  })
})
