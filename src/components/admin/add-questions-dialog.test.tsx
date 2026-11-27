import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AddQuestionsDialog } from './add-questions-dialog'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/components/department-provider', () => ({
  useClassLevelOptions: () => [
    { value: '10', label: 'Stufe 10' },
    { value: '11', label: 'Stufe 11' },
    { value: '12', label: 'Stufe 12' },
  ],
}))

const TOPIC = '11111111-1111-4111-8111-111111111111'

const topicsResponse = {
  topics: [
    {
      id: TOPIC,
      name: 'Lagerlogistik',
      subject_id: 's1',
      class_levels: [10],
      subjects: { id: 's1', code: 'LOP', name: 'Logistische Leistungsprozesse', departments: { name: 'Spedition' } },
    },
  ],
}

function item(over: Record<string, unknown> = {}, reasons: string[] = []) {
  return {
    question: {
      question_text: 'Was ist ein Hochregallager?',
      type: 'multiple_choice',
      options: ['Ein Lager für hohe Regale', 'Ein Zolllager', 'Ein Tanklager', 'Ein Kühlhaus', 'Ein Freilager'],
      correct_index: 0,
      sample_answer: null,
      explanation: 'Es nutzt die Höhe.',
      difficulty: 'leicht',
      class_level: 10,
      errors: [],
      ...over,
    },
    reasons,
    blockers: [],
    warnings: [],
    duplicate: false,
    topic_id: TOPIC,
    topic_label: 'LOP › Lagerlogistik',
  }
}

let calls: { url: string; body: unknown }[] = []
let previewItems: ReturnType<typeof item>[]
let acceptStatus = 201

beforeEach(() => {
  // Radix (Schalter, Auswahlfeld) misst Größen; jsdom kennt das nicht
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  vi.clearAllMocks()
  calls = []
  acceptStatus = 201
  previewItems = [item(), item({ question_text: 'Zweite Frage?' }), item({ question_text: 'Dritte Frage?', errors: ['Es fehlt die richtige Antwort.'], correct_index: null, source_row: 3 }, ['Es fehlt die richtige Antwort.'])]
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true })
  global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url)
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body
    calls.push({ url: u, body })
    if (u === '/api/admin/topics') return new Response(JSON.stringify(topicsResponse))
    if (u.endsWith('/intake/material')) return new Response(JSON.stringify({ parts: ['Ein langes Skript über Lagerlogistik.'], chars: 38, kind: 'pdf' }))
    if (u.endsWith('/intake/prompt')) return new Response(JSON.stringify({ prompt: 'AUFTRAG-TEXT mit allem Nötigen', length: 30, tooLong: false, targetGroup: 'Auszubildende' }))
    if (u.endsWith('/intake/preview')) {
      return new Response(JSON.stringify({ items: previewItems, skipped: [], truncated: false, requested: 10, topic: { id: TOPIC, label: 'LOP › Lagerlogistik', class_levels: [10, 11, 12], suggested_class_level: 10 } }))
    }
    if (u.endsWith('/intake/accept')) {
      return new Response(JSON.stringify(acceptStatus === 201 ? { imported: (body as { items: unknown[] }).items.length, ids: [], topic_ids: [TOPIC] } : { error: 'Einige Fragen sind noch nicht in Ordnung. Es wurde nichts übernommen.' }), { status: acceptStatus })
    }
    return new Response('{}')
  }) as unknown as typeof fetch
})

function open(props: Partial<React.ComponentProps<typeof AddQuestionsDialog>> = {}) {
  const onDone = vi.fn()
  const onOpenChange = vi.fn()
  render(<AddQuestionsDialog open onOpenChange={onOpenChange} onDone={onDone} defaults={{ topicId: TOPIC }} {...props} />)
  return { onDone, onOpenChange }
}

/** Die Wörter, die Lehrkräfte auf diesem Weg nie sehen sollen (PROJ-132) */
const VERBOTEN = /prompt|json|api-?key|methode|anthropic|token/i

describe('Fragen hinzufügen: Auswahl', () => {
  it('fragt, wie man Fragen hinzufügen möchte, und bietet drei Wege mit je einem Satz', async () => {
    open()
    expect(await screen.findByText('Wie möchtest du Fragen hinzufügen?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Selbst schreiben/ })).toHaveTextContent('Eine Frage mit Antworten eintippen.')
    expect(screen.getByRole('button', { name: /Aus Material erstellen/ })).toHaveTextContent('Skript hochladen, deine KI schreibt Vorschläge, du prüfst sie vor dem Übernehmen.')
    expect(screen.getByRole('button', { name: /Aus einer Tabelle übernehmen/ })).toHaveTextContent('Eine CSV-Datei mit vielen Fragen auf einmal einlesen.')
  })

  it('zeigt auf keinem Bildschirm Fachwörter wie Prompt, JSON oder API-Key', async () => {
    open()
    await screen.findByText('Wie möchtest du Fragen hinzufügen?')
    expect(document.body.textContent).not.toMatch(VERBOTEN)

    fireEvent.click(screen.getByRole('button', { name: /Aus Material erstellen/ }))
    await screen.findByText('Material wählen')
    expect(document.body.textContent).not.toMatch(VERBOTEN)

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    fireEvent.click(await screen.findByRole('button', { name: /Aus einer Tabelle übernehmen/ }))
    await screen.findByText('Datei wählen')
    expect(document.body.textContent).not.toMatch(VERBOTEN)
  })

  it('öffnet auf Wunsch gleich einen Weg (Link der alten Seite) und „Zurück“ führt wieder zur Auswahl', async () => {
    open({ initialWay: 'material' })
    expect(await screen.findByText('Material wählen')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))
    expect(await screen.findByText('Wie möchtest du Fragen hinzufügen?')).toBeInTheDocument()
  })

  it('öffnet nie einen zweiten Dialog über dem ersten (nur einer ist da)', async () => {
    open({ initialWay: 'material' })
    await screen.findByText('Material wählen')
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})

describe('Weg 1: Selbst schreiben', () => {
  it('beginnt mit „Fach und Thema“, nennt die Stufe als Hinweis und verlangt ein Thema', async () => {
    open({ defaults: {} })
    fireEvent.click(await screen.findByRole('button', { name: /Selbst schreiben/ }))
    const first = await screen.findByText('Fach und Thema')
    expect(first).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText('Bitte wähle ein Thema. So finden Azubis die Frage im richtigen Lernpfad.')).toBeInTheDocument()
    expect(screen.queryByText(/vollständig ersetzt/)).not.toBeInTheDocument()
  })

  it('übernimmt die Stufe aus dem Thema, wenn das Thema nur eine Stufe hat', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: /Selbst schreiben/ }))
    expect(await screen.findByText('Stufe 10, aus dem Thema')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Stufe' })).not.toBeInTheDocument()
  })
})

describe('Weg 2: Aus Material erstellen', () => {
  async function toStepTwo() {
    open()
    fireEvent.click(await screen.findByRole('button', { name: /Aus Material erstellen/ }))
    await screen.findByText('Material wählen')
    const input = document.getElementById('material-file') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'skript.pdf', { type: 'application/pdf' })] } })
    await screen.findByText('skript.pdf')
    const next = screen.getByRole('button', { name: 'Weiter' })
    await waitFor(() => expect(next).toBeEnabled())
    fireEvent.click(next)
    await screen.findByRole('heading', { name: 'Mit deiner KI' })
  }

  it('weist falsche Dateiarten sofort ab, ohne etwas hochzuladen', async () => {
    open({ initialWay: 'material' })
    await screen.findByText('Material wählen')
    const input = document.getElementById('material-file') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'notiz.txt')] } })
    expect(await screen.findByText(/Diese Dateiart geht nicht/)).toBeInTheDocument()
    expect(calls.some((c) => c.url.endsWith('/intake/material'))).toBe(false)
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()
  })

  it('führt durch Auftrag kopieren, Einfügen in die KI und Antwort einfügen; der Auftrag ist zugeklappt', async () => {
    await toStepTwo()
    expect(await screen.findByText('Auftrag kopieren', { selector: 'h3' })).toBeInTheDocument()
    expect(screen.getByText('In deiner KI einfügen')).toBeInTheDocument()
    expect(screen.getByText(/zum Beispiel ChatGPT, Claude.ai oder die KI deiner Schule, kostenlos mit deinem eigenen Zugang/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Auftrag für die KI')).not.toBeInTheDocument()

    const copy = screen.getAllByRole('button', { name: 'Auftrag kopieren' })[0]
    await waitFor(() => expect(copy).toBeEnabled())
    fireEvent.click(copy)
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Kopiert'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AUFTRAG-TEXT mit allem Nötigen')

    fireEvent.click(screen.getByRole('button', { name: 'Auftrag ansehen' }))
    expect(await screen.findByLabelText('Auftrag für die KI')).toHaveValue('AUFTRAG-TEXT mit allem Nötigen')
    expect(document.body.textContent).not.toMatch(VERBOTEN)
    expect(calls.find((c) => c.url.endsWith('/intake/prompt'))?.body).toMatchObject({ topic_id: TOPIC, class_level: 10, count: 10 })
  })

  it('zeigt die Vorschau mit vorab angehakten guten Fragen, markiert die fehlerhafte und übernimmt erst auf Klick', async () => {
    const { onDone, onOpenChange } = open()
    fireEvent.click(await screen.findByRole('button', { name: /Aus Material erstellen/ }))
    await screen.findByText('Material wählen')
    fireEvent.change(document.getElementById('material-file') as HTMLInputElement, { target: { files: [new File(['x'], 'skript.pdf')] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.change(await screen.findByLabelText('Antwort der KI'), { target: { value: '{"rows":[]}' } })
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau ansehen' }))

    expect(await screen.findByText('Noch nicht für Azubis sichtbar.')).toBeInTheDocument()
    expect(screen.getByText(/Ins Thema: LOP › Lagerlogistik/)).toBeInTheDocument()
    expect(screen.getByText('Bestellt: 10, erhalten: 3.')).toBeInTheDocument()
    expect(screen.getByText(/Zeile 3: Es fehlt die richtige Antwort\./)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Frage 1 übernehmen' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Frage 3 übernehmen' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Frage 3 übernehmen' })).toBeDisabled()

    // Noch nichts gespeichert
    expect(calls.some((c) => c.url.endsWith('/intake/accept'))).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '2 Fragen übernehmen' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ count: 2, topicIds: [TOPIC] }))
    const accept = calls.find((c) => c.url.endsWith('/intake/accept'))!.body as { source: string; file_name: string; items: { topic_id: string; answers: { is_correct: boolean }[] }[] }
    expect(accept).toMatchObject({ source: 'material', file_name: 'skript.pdf' })
    expect(accept.items).toHaveLength(2)
    expect(accept.items[0].answers.filter((a) => a.is_correct)).toHaveLength(1)
    expect(toastMock.success).toHaveBeenCalledWith('2 Fragen in „Lagerlogistik“ übernommen')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('deaktiviert „Übernehmen“ bei 0 angehakten Fragen und zeigt Fehler vom Server', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: /Aus Material erstellen/ }))
    fireEvent.change(document.getElementById('material-file') as HTMLInputElement, { target: { files: [new File(['x'], 'skript.pdf')] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.change(await screen.findByLabelText('Antwort der KI'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Vorschau ansehen' }))
    await screen.findByText('Noch nicht für Azubis sichtbar.')

    acceptStatus = 400
    fireEvent.click(screen.getByRole('button', { name: '2 Fragen übernehmen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Es wurde nichts übernommen.')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Frage 1 übernehmen' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Frage 2 übernehmen' }))
    expect(screen.getByRole('button', { name: '0 Fragen übernehmen' })).toBeDisabled()
  })

  it('fragt vor dem Schließen nach, wenn die Antwort der KI sonst verloren ginge', async () => {
    const { onOpenChange } = open()
    fireEvent.click(await screen.findByRole('button', { name: /Aus Material erstellen/ }))
    fireEvent.change(document.getElementById('material-file') as HTMLInputElement, { target: { files: [new File(['x'], 'skript.pdf')] } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Weiter' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    await screen.findByLabelText('Antwort der KI')

    fireEvent.keyDown(screen.getAllByRole('dialog')[0], { key: 'Escape' })
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText('Fragen verwerfen?')).toBeInTheDocument()
    expect(within(confirm).getByText('Die Antwort der KI geht verloren.')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)

    fireEvent.click(within(confirm).getByRole('button', { name: 'Verwerfen' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('Weg 3: Aus einer Tabelle übernehmen', () => {
  it('liest eine CSV-Datei, zeigt Zeile und Grund und übernimmt erst nach Klick', async () => {
    const { onDone } = open()
    fireEvent.click(await screen.findByRole('button', { name: /Aus einer Tabelle übernehmen/ }))
    await screen.findByText('Datei wählen')
    expect(screen.getByRole('button', { name: 'Beispiel-Tabelle herunterladen' })).toBeInTheDocument()

    const csv = 'question_text,antwort_a,antwort_b,antwort_c,antwort_d,antwort_e,korrekte_antwort\nFrage?,a,b,c,d,e,A\n'
    fireEvent.change(document.getElementById('table-file') as HTMLInputElement, { target: { files: [new File([csv], 'fragen.csv', { type: 'text/csv' })] } })
    await screen.findByText(/fragen\.csv · 1 Zeile/)
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(await screen.findByText('Noch nicht für Azubis sichtbar.')).toBeInTheDocument()
    expect(screen.getByText(/Zeile 3: Es fehlt die richtige Antwort\./)).toBeInTheDocument()
    const preview = calls.find((c) => c.url.endsWith('/intake/preview'))!.body as { rows: Record<string, string>[]; topic_id: string }
    expect(preview.topic_id).toBe(TOPIC)
    expect(preview.rows).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '2 Fragen übernehmen' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(calls.find((c) => c.url.endsWith('/intake/accept'))!.body).toMatchObject({ source: 'table', file_name: 'fragen.csv' })
  })

  it('weist eine Datei, die keine CSV ist, am Feld ab', async () => {
    open({ initialWay: 'table' })
    await screen.findByText('Datei wählen')
    fireEvent.change(document.getElementById('table-file') as HTMLInputElement, { target: { files: [new File(['x'], 'fragen.xlsx')] } })
    expect(await screen.findByText(/Bitte wähle eine CSV-Datei/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()
  })
})
