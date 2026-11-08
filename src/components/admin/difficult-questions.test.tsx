import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DifficultQuestions } from './difficult-questions'

function row(p: Record<string, unknown>) {
  return {
    question_id: 'q1', question_text: 'Was ist ein Frachtbrief?', class_level: 10, topic_id: 't1', topic_name: 'Frachtrecht',
    subject_id: 's1', subject_name: 'STG', department_id: 'd1', attempts: 30, correct: 6,
    top_wrong_option_text: 'Eine Rechnung', top_wrong_count: 12, open_reports: 1, last_changed_at: null, first_counted_at: null,
    ...p,
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ items: [row({}), row({ question_id: 'q2', question_text: 'Seltene Frage', attempts: 4, correct: 1 })], totalQuestions: 5 }),
  })))
})
afterEach(() => vi.unstubAllGlobals())

describe('DifficultQuestions', () => {
  it('zeigt Themen mit Quote und trennt zu wenige Antworten', async () => {
    render(<DifficultQuestions />)
    expect(await screen.findByText('Frachtrecht')).toBeInTheDocument()
    expect(screen.getByText('21 %')).toBeInTheDocument()
  })

  it('zeigt im Reiter „Fragen“ die Ampel „Antwort prüfen“ und die Abschnittsüberschrift', async () => {
    render(<DifficultQuestions />)
    await screen.findByText('Frachtrecht')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Fragen' }))
    expect((await screen.findAllByText('Antwort prüfen')).length).toBeGreaterThan(0)
    expect(screen.getByText(/Zu wenige Antworten/)).toBeInTheDocument()
    expect(screen.getByText('Seltene Frage')).toBeInTheDocument()
  })

  it('zeigt den Leerzustand ohne Antworten', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ items: [], totalQuestions: 3 }) })))
    render(<DifficultQuestions />)
    await waitFor(() => expect(screen.getByText(/erscheinen hier Auswertungen/)).toBeInTheDocument())
  })

  it('zeigt bei Fehler einen verständlichen Satz', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })))
    render(<DifficultQuestions />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
