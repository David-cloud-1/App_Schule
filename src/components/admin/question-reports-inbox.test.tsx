import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuestionReportsInbox } from './question-reports-inbox'

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

let calls: { url: string; method?: string }[] = []
let reportItems: unknown[] = []

beforeEach(() => {
  calls = []
  reportItems = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method })
      return { ok: true, json: async () => ({ items: reportItems, total: reportItems.length, page: 1, pageSize: 25 }) }
    }),
  )
})

const lastReportsCall = () => [...calls].reverse().find((c) => c.url.startsWith('/api/admin/question-reports?'))?.url ?? ''

const group = (over: Record<string, unknown> = {}) => ({
  question_id: 'q1', status: 'offen', question_text: 'Was ist ein CMR?', department_id: 'd1', report_count: 1,
  reasons: [], oldest_at: '2026-11-01T00:00:00Z', newest_at: '2026-11-01T00:00:00Z', handled_by_name: null,
  claimed_at: null, claimed_by_me: false, changed_since_report: false, in_trash: false, ...over,
})

describe('QuestionReportsInbox im Reiter „Gemeldet“ (PROJ-73, PROJ-131)', () => {
  it('lädt ohne Auswahl alle Meldungen und hat keine eigenen Fach- und Themen-Filter', async () => {
    render(<QuestionReportsInbox />)
    await screen.findByText('Alles erledigt')
    expect(lastReportsCall()).not.toContain('subject=')
    expect(screen.queryByRole('combobox', { name: 'Fach filtern' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Grund filtern' })).toBeInTheDocument()
  })

  it('schränkt auf die Auswahl im Baum ein, sagt es und lässt alle zeigen', async () => {
    const onShowAll = vi.fn()
    render(<QuestionReportsInbox restriction={{ subjectId: 's1', topicId: 'ohne', label: 'KSK › Ohne Thema' }} onShowAll={onShowAll} />)
    await screen.findByText('Keine passenden Meldungen')
    expect(lastReportsCall()).toContain('subject=s1')
    expect(lastReportsCall()).toContain('topic=ohne')
    expect(screen.getByText('KSK › Ohne Thema')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Alle Meldungen zeigen' }))
    expect(onShowAll).toHaveBeenCalled()
  })

  it('zeigt eine gemeldete Frage im Papierkorb mit „Wiederherstellen“', async () => {
    reportItems = [group({ in_trash: true })]
    const onChanged = vi.fn()
    render(<QuestionReportsInbox onChanged={onChanged} />)
    expect(await screen.findByText('Frage liegt im Papierkorb')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Wiederherstellen' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(calls.some((c) => c.method === 'POST' && c.url === '/api/admin/trash/question/q1')).toBe(true)
  })
})
