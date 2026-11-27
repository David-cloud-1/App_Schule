import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DifficultQuestions } from './difficult-questions'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/department-provider', () => ({ useClassLevelOptions: () => [] }))

function row(p: Record<string, unknown>) {
  return {
    question_id: 'q1', question_text: 'Was ist ein Frachtbrief?', class_level: 10, topic_id: 't1', topic_name: 'Frachtrecht',
    subject_id: 's1', subject_name: 'Speditionsprozesse', department_id: 'd1', attempts: 40, correct: 8,
    top_wrong_option_text: 'Eine Rechnung', top_wrong_count: 12, open_reports: 1, last_changed_at: null, first_counted_at: null,
    ...p,
  }
}

let urls: string[] = []

beforeEach(() => {
  urls = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(url)
    if (url.startsWith('/api/admin/questions?')) {
      return {
        ok: true,
        json: async () => ({
          questions: [{ id: 'q1', type: 'multiple_choice', explanation: null, answer_options: [{ id: 'a', option_text: 'Ein Beförderungspapier', is_correct: true, display_order: 1 }] }],
        }),
      }
    }
    return {
      ok: true,
      json: async () => ({
        items: [
          row({ question_id: 'q3', question_text: 'Halb gewusst', attempts: 30, correct: 15, subject_id: 's2' }),
          row({}),
          row({ question_id: 'q2', question_text: 'Zu selten beantwortet', attempts: 29, correct: 1 }),
          row({ subject_id: 's2' }),
        ],
        totalQuestions: 5,
      }),
    }
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('Reiter „Schwierig“ (PROJ-74, PROJ-131)', () => {
  it('nennt die feste Schwelle statt eines Filters und zeigt nur Fragen ab 30 Antworten, schwierigste zuerst', async () => {
    render(<DifficultQuestions />)
    expect(screen.getByText(/Gezählt werden Fragen ab 30 Antworten\./)).toBeInTheDocument()
    expect(await screen.findByText('Was ist ein Frachtbrief?')).toBeInTheDocument()
    expect(screen.queryByText('Zu selten beantwortet')).not.toBeInTheDocument()
    expect(screen.queryByText(/Mindestens/)).not.toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('20 % richtig bei 40 Antworten')
    expect(items[1]).toHaveTextContent('50 % richtig bei 30 Antworten')
  })

  it('klappt die Antworten auf, wie im Reiter „Fragen“', async () => {
    render(<DifficultQuestions />)
    fireEvent.click(await screen.findByRole('button', { name: /^Was ist ein Frachtbrief/ }))
    expect(await screen.findByText('Ein Beförderungspapier')).toBeInTheDocument()
    expect(screen.getByText('richtig')).toBeInTheDocument()
    expect(urls).toContain('/api/admin/questions?question_id=q1')
  })

  it('schränkt auf die Auswahl im Baum ein und führt „Im Thema zeigen“ dorthin', async () => {
    const onShowInTopic = vi.fn()
    const onShowAll = vi.fn()
    render(
      <DifficultQuestions
        restriction={{ subjectId: 's1', topicId: 't1', label: 'STG › Frachtrecht' }}
        onShowAll={onShowAll}
        onShowInTopic={onShowInTopic}
        subjectCodes={{ s1: 'STG' }}
        topicIds={new Set(['t1'])}
      />,
    )
    expect(await screen.findByText('STG › Frachtrecht', { selector: 'span.font-semibold' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Im Thema zeigen' }))
    expect(onShowInTopic).toHaveBeenCalledWith('s1', 't1')
    fireEvent.click(screen.getByRole('button', { name: 'Alle Fragen zeigen' }))
    expect(onShowAll).toHaveBeenCalled()
  })

  it('lässt „Im Thema zeigen“ weg, wenn es das Thema nicht mehr gibt', async () => {
    render(<DifficultQuestions onShowInTopic={vi.fn()} topicIds={new Set()} />)
    await screen.findByText('Was ist ein Frachtbrief?')
    expect(screen.queryByRole('button', { name: 'Im Thema zeigen' })).not.toBeInTheDocument()
  })

  it('zeigt die Themen-Rangliste', async () => {
    render(<DifficultQuestions />)
    await screen.findByText('Was ist ein Frachtbrief?')
    fireEvent.click(screen.getByRole('radio', { name: 'Themen' }))
    expect((await screen.findAllByText('Frachtrecht')).length).toBeGreaterThan(0)
  })

  it('gibt die Stufe aus dem Baum an die Schnittstelle weiter', async () => {
    render(<DifficultQuestions klasse={11} />)
    await waitFor(() => expect(urls[0]).toContain('class_level=11'))
  })

  it('zeigt bei Fehler einen verständlichen Satz', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })))
    render(<DifficultQuestions />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
