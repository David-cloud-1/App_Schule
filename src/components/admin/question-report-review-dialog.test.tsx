import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuestionReportReviewDialog } from './question-report-review-dialog'

// Radix (Auswahlknöpfe, Kontrollkästchen) misst Größen per ResizeObserver, den jsdom nicht kennt
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

// Radix-Select meldet in jsdom beim Befüllen leere Werte (Optionen noch nicht bekannt) und würde das Formular „verändern“
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/department-provider', () => ({
  useClassLevelOptions: () => [{ value: '10', label: 'Klasse 10' }],
}))
vi.mock('@/components/admin/target-department-field', () => ({ useNeedsTargetDepartment: () => false }))

const Q = '550e8400-e29b-41d4-a716-446655440001'

const question = {
  id: Q,
  question_text: 'Zwischen welchen Breitenkreisen liegt die tropische Zone?',
  difficulty: 'leicht',
  explanation: 'Die Tropen liegen zwischen den Wendekreisen.',
  type: 'multiple_choice',
  class_level: 10,
  topic_id: null,
  version_number: 3,
  answer_options: ['A1', 'B1', 'C1', 'D1', 'E1'].map((t, i) => ({
    id: `o${i}`,
    option_text: t,
    is_correct: i === 2,
    display_order: i + 1,
  })),
  question_subjects: [{ subjects: { id: 's1', code: 'TP', name: 'Tourismus' } }],
}

const reports = [
  {
    id: 'r1',
    reason: 'tippfehler_unklar',
    note: 'Unklar formuliert',
    chosen_option_text: 'E1',
    status: 'offen',
    created_at: '2026-11-09T10:00:00Z',
    response_text: null,
  },
]

type Call = { url: string; method: string; body?: unknown }
let calls: Call[]
let patchStatus = 200
let closeStatus = 200
let reviewStatus = 200

const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const method = init?.method ?? 'GET'
  calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined })
  const json = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data })
  if (url === '/api/admin/subjects') return json({ subjects: [{ id: 's1', code: 'TP', name: 'Tourismus' }] })
  if (url.endsWith('/review')) return json(reviewStatus === 200 ? { question } : { error: 'x' }, reviewStatus)
  if (url.endsWith('/claim')) return json({ ok: true })
  if (url.endsWith('/close')) return json(closeStatus === 200 ? { closed: 1, rewarded: 1 } : { error: 'Kaputt' }, closeStatus)
  if (url.startsWith('/api/admin/questions/')) return json(patchStatus === 200 ? { ok: true } : { error: 'Ungültig' }, patchStatus)
  return json({ items: reports })
})

beforeEach(() => {
  vi.clearAllMocks()
  calls = []
  patchStatus = 200
  closeStatus = 200
  reviewStatus = 200
  vi.stubGlobal('fetch', fetchMock)
})

function renderDialog(over: Partial<React.ComponentProps<typeof QuestionReportReviewDialog>> = {}) {
  const onClosed = vi.fn()
  const onExit = vi.fn()
  render(
    <QuestionReportReviewDialog
      questionId={Q}
      position={{ index: 2, total: 12 }}
      readOnly={false}
      claimedByOther={null}
      onClosed={onClosed}
      onExit={onExit}
      {...over}
    />,
  )
  return { onClosed, onExit }
}

const closeCalls = () => calls.filter((c) => c.url.endsWith('/close'))
const patchCalls = () => calls.filter((c) => c.method === 'PATCH')

async function ready() {
  await screen.findByText('„Unklar formuliert“')
}

async function startEdit() {
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Frage korrigieren' }))
  await screen.findByDisplayValue(question.question_text)
}

function edit() {
  fireEvent.change(screen.getByDisplayValue(question.question_text), { target: { value: 'Neuer Fragetext ungefähr?' } })
}

const saveBtn = () => screen.getByRole('button', { name: /Speichern & abschließen|Abschließen wiederholen/ })

describe('QuestionReportReviewDialog', () => {
  it('zeigt erst die Ansicht: Meldung, Frage einmal, Richtig und gewählte Antwort, Fortschritt', async () => {
    renderDialog()
    await ready()
    expect(screen.getByText('3 von 12')).toBeTruthy()
    expect(screen.getByText('Richtig')).toBeTruthy()
    expect(screen.getByText('Gewählt')).toBeTruthy()
    expect(screen.queryByDisplayValue(question.question_text)).toBeNull() // noch kein Formular
    expect(calls.some((c) => c.url.endsWith('/claim') && c.method === 'POST')).toBe(true)
  })

  it('„Frage ist korrekt“ schließt sofort, ohne Pflichttext und ohne Speichern', async () => {
    const { onClosed } = renderDialog()
    await ready()
    expect(screen.getByText('„Geprüft, keine Änderung.“')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Frage ist korrekt' }))
    await waitFor(() => expect(onClosed).toHaveBeenCalled())
    expect(closeCalls()[0].body).toMatchObject({ result: 'nicht_uebernommen', report_ids: ['r1'] })
    expect(patchCalls()).toHaveLength(0)
  })

  it('Ergänzung per Textbaustein wird mitgeschickt und in der Vorschau gezeigt', async () => {
    const { onClosed } = renderDialog()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Ergänzen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Die Frage ist korrekt, siehe Erklärung.' }))
    expect(screen.getByText('„Geprüft, keine Änderung. Die Frage ist korrekt, siehe Erklärung.“')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Frage ist korrekt' }))
    await waitFor(() => expect(onClosed).toHaveBeenCalled())
    expect(closeCalls()[0].body).toMatchObject({ response: 'Die Frage ist korrekt, siehe Erklärung.' })
  })

  it('„Speichern & abschließen“ ist ohne Änderung gesperrt', async () => {
    renderDialog()
    await startEdit()
    expect((saveBtn() as HTMLButtonElement).disabled).toBe(true)
  })

  it('speichert zuerst und schließt danach als „korrigiert“ (nur offene Meldungen)', async () => {
    const { onClosed } = renderDialog()
    await startEdit()
    edit()
    fireEvent.click(saveBtn())
    await waitFor(() => expect(onClosed).toHaveBeenCalled())
    const order = calls.filter((c) => c.method !== 'GET' && !c.url.endsWith('/claim')).map((c) => c.method + ' ' + c.url)
    expect(order).toEqual([`PATCH /api/admin/questions/${Q}`, `POST /api/admin/question-reports/${Q}/close`])
    expect(closeCalls()[0].body).toMatchObject({ result: 'korrigiert', report_ids: ['r1'] })
  })

  it('schließt NIE, wenn das Speichern fehlschlägt', async () => {
    patchStatus = 400
    const { onClosed } = renderDialog()
    await startEdit()
    edit()
    fireEvent.click(saveBtn())
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 20))
    expect(closeCalls()).toHaveLength(0)
    expect(onClosed).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue('Neuer Fragetext ungefähr?')).toBeTruthy() // Eingaben bleiben
  })

  it('wiederholt nach fehlgeschlagenem Abschluss nur den Abschluss, nicht das Speichern', async () => {
    closeStatus = 500
    const { onClosed } = renderDialog()
    await startEdit()
    edit()
    fireEvent.click(saveBtn())
    await screen.findByText(/Die Frage ist gespeichert, die Meldung ist aber noch offen/)
    expect(onClosed).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Zurück' })).toBeNull()

    closeStatus = 200
    fireEvent.click(screen.getByRole('button', { name: 'Abschließen wiederholen' }))
    await waitFor(() => expect(onClosed).toHaveBeenCalled())
    expect(patchCalls()).toHaveLength(1)
    expect(closeCalls()).toHaveLength(2)
  })

  it('„Frage entfällt“ deaktiviert erst die Frage, dann wird geschlossen', async () => {
    const { onClosed } = renderDialog()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Frage entfällt …' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Frage deaktivieren und schließen' }))
    await waitFor(() => expect(onClosed).toHaveBeenCalled())
    expect(patchCalls()[0].body).toEqual({ is_active: false })
    expect(closeCalls()[0].body).toMatchObject({ result: 'entfaellt' })
  })

  it('„Frage entfällt“ schließt nicht, wenn das Deaktivieren fehlschlägt', async () => {
    patchStatus = 500
    const { onClosed } = renderDialog()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Frage entfällt …' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Frage deaktivieren und schließen' }))
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    await new Promise((r) => setTimeout(r, 20))
    expect(closeCalls()).toHaveLength(0)
    expect(onClosed).not.toHaveBeenCalled()
  })

  it('fragt bei ungespeicherten Änderungen vor „Zurück“ nach und zeigt dann wieder die Ansicht', async () => {
    renderDialog()
    await startEdit()
    edit()
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    await screen.findByText('Änderungen verwerfen?')
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))
    await screen.findByRole('button', { name: 'Frage korrigieren' })
    expect(screen.queryByDisplayValue('Neuer Fragetext ungefähr?')).toBeNull()
  })

  it('zeigt bei fehlender Frage kein „Frage korrigieren“', async () => {
    reviewStatus = 404
    renderDialog()
    await screen.findByText('Diese Frage gibt es nicht mehr.')
    expect(screen.queryByRole('button', { name: 'Frage korrigieren' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Frage entfällt …' })).toBeTruthy()
  })

  it('ist im Nur-Lesen-Modus ohne Abschluss-Leiste und ohne Übernehmen', async () => {
    renderDialog({ readOnly: true, position: null })
    await ready()
    expect(screen.queryByRole('button', { name: 'Frage ist korrekt' })).toBeNull()
    expect(calls.some((c) => c.url.endsWith('/claim'))).toBe(false)
  })

  it('zeigt den Hinweis, wenn eine Kollegin die Meldung prüft', async () => {
    renderDialog({ claimedByOther: 'Franz Melf' })
    await ready()
    expect(screen.getByText('Wird gerade von Franz Melf geprüft.')).toBeTruthy()
  })
})
