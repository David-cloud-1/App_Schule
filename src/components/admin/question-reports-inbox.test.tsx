import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QuestionReportsInbox } from './question-reports-inbox'

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

const tree = {
  departments: [
    {
      id: 'd1',
      name: 'Spedition',
      code: 'SPED',
      subjects: [
        {
          id: 's1',
          name: 'Kaufmännische Steuerung',
          code: 'KSK',
          is_active: true,
          version_number: 1,
          counts: { l10: 0, l11: 0, l12: 0, none: 0 },
          no_topic: { l10: 0, l11: 0, l12: 0, none: 0 },
          topics: [{ id: 't1', name: 'Kostenrechnung', version_number: 1, counts: { l10: 0, l11: 0, l12: 0, none: 0 } }],
        },
        {
          id: 's2',
          name: 'Politik',
          code: 'PUG',
          is_active: true,
          version_number: 1,
          counts: { l10: 0, l11: 0, l12: 0, none: 0 },
          no_topic: { l10: 0, l11: 0, l12: 0, none: 0 },
          topics: [],
        },
      ],
    },
  ],
}

let calls: string[] = []
let treeOk = true
let reportItems: unknown[] = []

// jsdom kennt die Zeiger-Funktionen nicht, die Radix-Auswahlfelder brauchen
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  calls = []
  treeOk = true
  reportItems = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url)
      if (url.startsWith('/api/admin/content-tree')) {
        return treeOk ? { ok: true, json: async () => tree } : { ok: false, json: async () => ({}) }
      }
      return { ok: true, json: async () => ({ items: reportItems, total: reportItems.length, page: 1, pageSize: 25 }) }
    }),
  )
})

const lastReportsCall = () => [...calls].reverse().find((c) => c.startsWith('/api/admin/question-reports?')) ?? ''

function pick(name: string, option: string) {
  const trigger = screen.getByRole('combobox', { name })
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' })
  fireEvent.click(within(document.body).getByRole('option', { name: option }))
}

describe('QuestionReportsInbox – Filter Fach und Thema (PROJ-73)', () => {
  it('bietet Fach-Auswahl aus dem Inhalts-Baum und schickt die Fach-ID an die Schnittstelle', async () => {
    render(<QuestionReportsInbox />)
    await screen.findByRole('combobox', { name: 'Fach filtern' })
    expect(lastReportsCall()).not.toContain('subject=')
    pick('Fach filtern', 'Kaufmännische Steuerung')
    await waitFor(() => expect(lastReportsCall()).toContain('subject=s1'))
  })

  it('zeigt die Themen erst nach der Fach-Wahl und filtert danach nach Thema', async () => {
    render(<QuestionReportsInbox />)
    await screen.findByRole('combobox', { name: 'Fach filtern' })
    expect(screen.queryByRole('combobox', { name: 'Thema filtern' })).not.toBeInTheDocument()
    pick('Fach filtern', 'Kaufmännische Steuerung')
    await screen.findByRole('combobox', { name: 'Thema filtern' })
    pick('Thema filtern', 'Kostenrechnung')
    await waitFor(() => expect(lastReportsCall()).toMatch(/subject=s1.*topic=t1|topic=t1.*subject=s1/))
  })

  it('setzt das Thema zurück, wenn das Fach wechselt', async () => {
    render(<QuestionReportsInbox />)
    await screen.findByRole('combobox', { name: 'Fach filtern' })
    pick('Fach filtern', 'Kaufmännische Steuerung')
    await screen.findByRole('combobox', { name: 'Thema filtern' })
    pick('Thema filtern', 'Kostenrechnung')
    pick('Fach filtern', 'Politik')
    await waitFor(() => expect(lastReportsCall()).toContain('subject=s2'))
    expect(lastReportsCall()).not.toContain('topic=')
    expect(screen.queryByRole('combobox', { name: 'Thema filtern' })).not.toBeInTheDocument()
  })

  it('lässt die Fach-Auswahl weg, wenn der Baum nicht lädt, die Liste funktioniert trotzdem', async () => {
    treeOk = false
    render(<QuestionReportsInbox />)
    await screen.findByText('Alles erledigt')
    expect(screen.queryByRole('combobox', { name: 'Fach filtern' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Grund filtern' })).toBeInTheDocument()
  })

  it('sagt bei gesetztem Filter „Keine passenden Meldungen“ statt „Alles erledigt“', async () => {
    render(<QuestionReportsInbox />)
    await screen.findByRole('combobox', { name: 'Fach filtern' })
    pick('Fach filtern', 'Politik')
    await screen.findByText('Keine passenden Meldungen')
    expect(screen.queryByText('Alles erledigt')).not.toBeInTheDocument()
  })
})
