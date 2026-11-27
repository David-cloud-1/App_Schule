import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ContentQuestionPanel } from './content-question-panel'
import { buildContentTree } from '@/lib/content-tree'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/components/department-provider', () => ({
  useClassLevelOptions: () => [{ value: '10', label: 'Stufe 10' }],
}))

const tree = buildContentTree({
  subjects: [
    { id: 's1', name: 'Logistik', code: 'LOP', is_active: true, department_id: 'd1', version_number: 1, departments: { id: 'd1', name: 'Spedition', code: 'SPED' } },
  ],
  topics: [{ id: 't1', name: 'Lagerlogistik', subject_id: 's1', version_number: 1 }],
  questions: [],
})

function question(i: number, over: Record<string, unknown> = {}) {
  return {
    id: `q${i}`,
    question_text: `Frage Nummer ${i}`,
    difficulty: 'leicht',
    explanation: i === 1 ? 'Weil es so ist.' : null,
    type: 'multiple_choice',
    sample_answer: null,
    is_active: true,
    class_level: 10,
    topic_id: 't1',
    version_number: 3,
    topics: { id: 't1', name: 'Lagerlogistik' },
    question_subjects: [{ subjects: { id: 's1', code: 'LOP', name: 'Logistik' } }],
    answer_options: [
      { id: 'a', option_text: 'Falsch', is_correct: false, display_order: 1 },
      { id: 'b', option_text: 'Stimmt', is_correct: true, display_order: 2 },
    ],
    hidden_info: null,
    ...over,
  }
}

let calls: { url: string; init?: RequestInit }[] = []
let list: { questions: unknown[]; total: number }
let patchStatus = 200

beforeEach(() => {
  vi.clearAllMocks()
  calls = []
  patchStatus = 200
  list = { questions: [question(1), question(2, { is_active: false, hidden_info: 'Ausgeblendet von Anna Huber am 27.11.' })], total: 30 }
  global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    calls.push({ url: u, init })
    if (u.endsWith('/stats')) return new Response(JSON.stringify({ total: 4, correctRate: 50 }))
    if (init?.method === 'PATCH') {
      const status = patchStatus
      patchStatus = 200
      return new Response(JSON.stringify(status === 409 ? { error: 'Geändert.', conflict: true } : { ok: true, version_number: 4 }), { status })
    }
    return new Response(JSON.stringify(list))
  }) as typeof fetch
})

function setup(over: Partial<Parameters<typeof ContentQuestionPanel>[0]> = {}) {
  const props: Parameters<typeof ContentQuestionPanel>[0] = {
    subject: tree.departments[0].subjects[0],
    topic: tree.departments[0].subjects[0].topics[0],
    klasse: 'all',
    tree,
    totals: { total: 30, hidden: 3 },
    subjects: [{ id: 's1', code: 'LOP', name: 'Logistik' }],
    onAdd: vi.fn(),
    onChanged: vi.fn(),
    ...over,
  }
  render(<ContentQuestionPanel {...props} />)
  return props
}

const listCalls = () => calls.filter((c) => !c.init?.method && !c.url.endsWith('/stats'))
const patches = () => calls.filter((c) => c.init?.method === 'PATCH')

describe('Reiter „Fragen“ (PROJ-131)', () => {
  it('zeigt Auswahl und dieselben Zahlen wie der Baum', async () => {
    setup()
    expect(screen.getByRole('heading', { name: 'LOP › Lagerlogistik' })).toBeInTheDocument()
    expect(screen.getByText('30 Fragen, davon 3 ausgeblendet')).toBeInTheDocument()
    await screen.findByText('Frage Nummer 1')
    expect(listCalls()[0].url).toContain('topic_id=t1')
  })

  it('klappt Antworten auf: richtige mit Wort „richtig“, Erklärung, zweiter Klick klappt zu (B102)', async () => {
    setup()
    const button = await screen.findByRole('button', { name: /^Frage Nummer 1/, expanded: false })
    expect(screen.queryByText('Stimmt')).not.toBeInTheDocument()
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const row = screen.getByText('Stimmt').closest('li')!
    expect(within(row).getByText('richtig')).toBeInTheDocument()
    expect(screen.getByText('Weil es so ist.')).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
    fireEvent.click(button)
    expect(screen.queryByText('Stimmt')).not.toBeInTheDocument()
  })

  it('zeigt bei Freitext die Musterlösung', async () => {
    list = { questions: [question(1, { type: 'open', answer_options: [], sample_answer: 'Die Musterantwort' })], total: 1 }
    setup()
    fireEvent.click(await screen.findByRole('button', { name: /^Frage Nummer 1/ }))
    expect(screen.getByText('Musterlösung')).toBeInTheDocument()
    expect(screen.getByText('Die Musterantwort')).toBeInTheDocument()
  })

  it('nennt bei ausgeblendeten Fragen, warum und von wem (B40)', async () => {
    setup()
    expect(await screen.findByText('Ausgeblendet von Anna Huber am 27.11.')).toBeInTheDocument()
    expect(screen.getByText('ausgeblendet')).toBeInTheDocument()
  })

  it('blendet sofort aus und bietet „Rückgängig“ an, das nur diese Frage zurückholt (E3)', async () => {
    const props = setup()
    fireEvent.click(await screen.findByRole('switch', { name: /Frage Nummer 1/ }))
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled())
    expect(JSON.parse(String(patches()[0].init!.body))).toEqual({ is_active: false, expected_version: 3 })
    const [message, options] = toastMock.success.mock.calls[0]
    expect(message).toBe('Ausgeblendet. Azubis sehen die Frage nicht mehr.')
    expect(options.duration).toBe(7000)
    expect(options.action.label).toBe('Rückgängig')
    options.action.onClick()
    await waitFor(() => expect(patches()).toHaveLength(2))
    expect(patches()[1].url).toBe('/api/admin/questions/q1')
    expect(JSON.parse(String(patches()[1].init!.body))).toEqual({ is_active: true })
    expect(props.onChanged).toHaveBeenCalled()
  })

  it('übernimmt den Klick auch bei gleichzeitiger Änderung und gibt einen Hinweis', async () => {
    patchStatus = 409
    setup()
    fireEvent.click(await screen.findByRole('switch', { name: /Frage Nummer 1/ }))
    await waitFor(() => expect(patches()).toHaveLength(2))
    expect(toastMock.info).toHaveBeenCalledWith(expect.stringContaining('trotzdem übernommen'))
    expect(JSON.parse(String(patches()[1].init!.body))).toEqual({ is_active: false })
  })

  it('sucht in allen Fächern, nennt die Treffer und setzt zurück', async () => {
    setup()
    await screen.findByText('Frage Nummer 1')
    fireEvent.change(screen.getByRole('textbox', { name: 'Frage oder Antwort suchen' }), { target: { value: 'Fracht' } })
    expect(await screen.findByText('30 Treffer')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suche in allen Fächern' })).toBeInTheDocument()
    const last = listCalls().at(-1)!.url
    expect(last).toContain('q=Fracht')
    expect(last).not.toContain('topic_id')
    expect(last).not.toContain('subject_id')
    fireEvent.click(screen.getByRole('button', { name: 'Suche und Filter zurücksetzen' }))
    await waitFor(() => expect(screen.getByText('30 Fragen, davon 3 ausgeblendet')).toBeInTheDocument())
  })

  it('bietet statt Seitenzahlen „Weitere … anzeigen“ und hängt an (B39)', async () => {
    setup()
    await screen.findByText('Frage Nummer 1')
    list = { questions: [question(26)], total: 30 }
    fireEvent.click(screen.getByRole('button', { name: 'Weitere 25 anzeigen (noch 28)' }))
    expect(await screen.findByText('Frage Nummer 26')).toBeInTheDocument()
    expect(screen.getByText('Frage Nummer 1')).toBeInTheDocument()
    expect(listCalls().at(-1)!.url).toContain('page=2')
    expect(screen.queryByText(/Seite \d+ von/)).not.toBeInTheDocument()
  })

  it('zeigt leere Auswahl und leere Suche unterschiedlich', async () => {
    list = { questions: [], total: 0 }
    const props = setup()
    expect(await screen.findByText('Hier gibt es noch keine Fragen')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fragen hinzufügen' }))
    expect(props.onAdd).toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Frage oder Antwort suchen' }), { target: { value: 'xyz' } })
    expect(await screen.findByText('Keine Frage gefunden')).toBeInTheDocument()
  })

  it('fragt beim Ausblenden der Auswahl mit der Zahl nach und ändert dann gesammelt (E4)', async () => {
    setup()
    await screen.findByText('Frage Nummer 1')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Alle angezeigten Fragen auswählen' }))
    expect(screen.getByText('2 ausgewählt')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ausblenden …' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('2 Fragen ausblenden?')
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ausblenden' }))
    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0].url).toBe('/api/admin/questions/bulk')
    expect(JSON.parse(String(patches()[0].init!.body))).toEqual({ ids: ['q1', 'q2'], is_active: false })
  })
})
