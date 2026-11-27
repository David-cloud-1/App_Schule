import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AssessmentWizard } from './assessment-wizard'

const push = vi.fn()
let search = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => new URLSearchParams(search),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const DEPT = 'dept-1'
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const cand = (n: number) => ({
  id: uid(n),
  question_text: `Frage ${n}`,
  topic: 'Luftfracht',
  class_level: 11,
  subject_codes: ['BGP'],
  isPrivate: false,
  attempts: 30,
  correct: 20,
  openReports: 0,
  blocked: false,
  level: 'mittel',
  rate: 67,
  rated: true,
})

type Call = { url: string; body: Record<string, unknown> | null }
let calls: Call[] = []
let departmentList = [{ id: DEPT, name: 'Spedition', code: 'SP' }]
let saveResponse: { ok: boolean; status?: number; json: unknown } = { ok: true, json: { id: 'new-1' } }

function route(url: string, init?: RequestInit) {
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null
  calls.push({ url, body })
  const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json })
  if (url === '/api/admin/assessments/departments') return ok({ departments: departmentList, suggestedDepartmentId: DEPT })
  if (url.startsWith('/api/admin/assessments/category-options')) return ok({ subjects: [], classes: ['SP10C', 'SP11A'] })
  if (url === '/api/admin/assessments/questions/search') {
    if (body?.action === 'facets') {
      return ok({ subjects: ['BGP'], topics: [{ name: 'Luftfracht', subjects: ['BGP'], levels: [11] }], classLevels: [11] })
    }
    return ok({ items: [], missing: [] })
  }
  if (url === '/api/admin/assessments/suggest') return ok({ items: [1, 2, 3, 4, 5, 6].map(cand), shortages: [], emptyTopics: [], poolSize: 30, hiddenByRecent: 0, statsAvailable: true })
  if (url === '/api/admin/assessments/schluessel-vorlagen') return ok({ templates: [] })
  if (url === '/api/admin/assessments') return { ok: saveResponse.ok, status: saveResponse.status ?? (saveResponse.ok ? 201 : 400), json: async () => saveResponse.json }
  return ok({})
}

beforeEach(() => {
  calls = []
  search = ''
  departmentList = [{ id: DEPT, name: 'Spedition', code: 'SP' }]
  push.mockClear()
  saveResponse = { ok: true, json: { id: 'new-1' } }
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => route(url, init)))
  // Radix Select/Popover brauchen diese Browser-Funktionen
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as never
})
afterEach(() => vi.unstubAllGlobals())

async function pickSubject() {
  fireEvent.click(await screen.findByRole('button', { name: /^Fach: Alle/ }))
  fireEvent.click(await screen.findByRole('checkbox', { name: 'BGP' }))
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
}

async function toStep2() {
  render(<AssessmentWizard />)
  await pickSubject()
  fireEvent.click(await screen.findByRole('button', { name: /Vorschlag erstellen/ }))
  await screen.findByText(/6 Fragen/)
}

describe('Nachweis anlegen in drei Schritten (PROJ-133)', () => {
  it('zeigt bei einem Bereich diesen als Text und meldet ein fehlendes Fach am Feld', async () => {
    render(<AssessmentWizard />)
    expect(await screen.findByText('Spedition')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Vorschlag erstellen/ }))
    expect(await screen.findByText('Bitte wähle mindestens ein Fach.')).toBeInTheDocument()
    expect(calls.some((c) => c.url.endsWith('/suggest'))).toBe(false)
  })

  it('führt von „Was?“ über „Prüfen“ zu „Wann und für wen?“ und hält die Schrittleiste aktuell', async () => {
    await toStep2()
    const nav = screen.getByRole('navigation', { name: 'Schritte' })
    expect(within(nav).getByRole('button', { name: /Schritt 2: Prüfen/ })).toHaveAttribute('aria-current', 'step')
    // Schritt 3 ist erst nach „Weiter“ erreichbar
    expect(within(nav).getByRole('button', { name: /Schritt 3/ })).toBeDisabled()
    const suggest = calls.find((c) => c.url.endsWith('/suggest'))!
    expect(suggest.body).toMatchObject({ action: 'suggest', departmentId: DEPT, subjects: ['BGP'], count: 20 })

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
    expect(((await screen.findByLabelText('Titel')) as HTMLInputElement).value).toContain('BGP')
    expect((screen.getByLabelText('Beitritt bis') as HTMLInputElement).value).toMatch(/T23:59$/)
    expect(screen.getByText(/Danach kann niemand mehr beitreten/)).toBeInTheDocument()
  })

  it('Zurück behält die Angaben', async () => {
    await toStep2()
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }))
    expect(await screen.findByLabelText(/Anzahl Fragen/)).toHaveValue('20')
    expect(screen.getByRole('button', { name: /^Fach: BGP/ })).toBeInTheDocument()
  })

  it('verlangt eine Klasse und speichert dann mit className null bei „Keine / gemischt“', async () => {
    await toStep2()
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
    await screen.findByLabelText('Titel')

    fireEvent.click(screen.getByRole('button', { name: 'Entwurf speichern' }))
    expect(await screen.findByText(/Bitte wähle eine Klasse/)).toBeInTheDocument()
    expect(calls.some((c) => c.url === '/api/admin/assessments' && c.body)).toBe(false)

    fireEvent.click(screen.getByRole('combobox', { name: 'Klasse' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Keine / gemischt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf speichern' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/leistungsnachweise/new-1'))
    const save = calls.find((c) => c.url === '/api/admin/assessments' && c.body)!
    expect(save.body).toMatchObject({ departmentId: DEPT, className: null })
    expect((save.body!.questionIds as string[]).length).toBe(6)
  })

  it('lehnt einen Beitritt in der Vergangenheit am Feld ab', async () => {
    await toStep2()
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
    fireEvent.change(await screen.findByLabelText('Beitritt bis'), { target: { value: '2020-01-01T10:00' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'Klasse' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Keine / gemischt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf speichern' }))
    expect(await screen.findByText(/liegt in der Vergangenheit/)).toBeInTheDocument()
    expect(calls.some((c) => c.url === '/api/admin/assessments' && c.body)).toBe(false)
  })

  it('markiert vom Server abgelehnte Fragen und kehrt zu „Prüfen“ zurück', async () => {
    saveResponse = { ok: false, status: 400, json: { error: '1 gewählte Fragen sind nicht zulässig', invalidQuestionIds: [uid(2)] } }
    await toStep2()
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
    await screen.findByLabelText('Titel')
    fireEvent.click(screen.getByRole('combobox', { name: 'Klasse' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Keine / gemischt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf speichern' }))
    expect(await screen.findByText(/nicht mehr zulässig/)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('„Selbst erstellen“ führt zu Schritt 2 ohne Frage und öffnet die Suche; „Weiter“ erst ab 5 Fragen', async () => {
    render(<AssessmentWizard />)
    fireEvent.click(await screen.findByRole('button', { name: /Selbst erstellen/ }))
    expect(await screen.findByRole('dialog', { name: 'Frage suchen' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(await screen.findByText(/Noch keine Frage gewählt/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Weiter/ })).toBeDisabled()
    expect(calls.some((c) => c.url.endsWith('/suggest'))).toBe(false)
  })

  it('Titel und Dauer folgen den Angaben, bis die Lehrkraft sie selbst ändert', async () => {
    await toStep2()
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
    const title = (await screen.findByLabelText('Titel')) as HTMLInputElement
    expect(title.value).toMatch(/^BGP · Luftfracht|^BGP · /)
    const duration = screen.getByLabelText(/Dauer/) as HTMLInputElement
    const firstDuration = duration.value

    // zurück zu „Prüfen“, zwei Fragen weg, wieder nach vorn: die Dauer folgt der Fragenzahl
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Frage entfernen' })[0])
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
    expect((screen.getByLabelText(/Dauer/) as HTMLInputElement).value).not.toBe('')
    expect(Number((screen.getByLabelText(/Dauer/) as HTMLInputElement).value)).toBeLessThanOrEqual(Number(firstDuration))

    // eigener Titel und eigene Dauer bleiben bei jedem weiteren Durchgang erhalten
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Mein Titel' } })
    fireEvent.change(screen.getByLabelText(/Dauer/), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }))
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }))
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Mein Titel')
    expect((screen.getByLabelText(/Dauer/) as HTMLInputElement).value).toBe('90')
  })

  it('erlaubt „Weiter“ erst ab 5 Fragen und nennt, wie viele fehlen', async () => {
    await toStep2()
    expect(screen.getByRole('button', { name: /Weiter/ })).toBeEnabled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Frage entfernen' })[0])
    expect(screen.getByRole('button', { name: /Weiter/ })).toBeEnabled() // 5 Fragen
    fireEvent.click(screen.getAllByRole('button', { name: 'Frage entfernen' })[0])
    expect(screen.getByRole('button', { name: /Weiter/ })).toBeDisabled() // 4 Fragen
    expect(screen.getByText(/Es fehlt noch 1 Frage/)).toBeInTheDocument()
  })

  it('leert beim Bereichswechsel die Auswahl und geht zu Schritt 1 zurück', async () => {
    departmentList = [
      { id: DEPT, name: 'Spedition', code: 'SP' },
      { id: 'dept-2', name: 'Tourismus', code: 'TO' },
    ]
    await toStep2()
    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }))
    fireEvent.click(await screen.findByRole('combobox', { name: 'Bereich' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Tourismus' }))
    expect(await screen.findByText(/Du hast den Bereich gewechselt/)).toBeInTheDocument()
    // Schritt 2 ist wieder gesperrt, bis ein neuer Vorschlag oder „Selbst erstellen“ kommt
    expect(within(screen.getByRole('navigation', { name: 'Schritte' })).getByRole('button', { name: /Schritt 2/ })).toBeDisabled()
  })

  it('fängt die Zurück-Taste ab und fragt nach, sobald etwas eingegeben ist', async () => {
    await toStep2()
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByText('Angaben gehen verloren')).toBeInTheDocument()
  })

  it('fragt auch nach, wenn nur Schritt 1 ausgefüllt ist', async () => {
    render(<AssessmentWizard />)
    await pickSubject()
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(await screen.findByText('Angaben gehen verloren')).toBeInTheDocument()
  })

  it('startet aus „Schwierig“ bei Schritt 2 mit den übergebenen Fragen', async () => {
    search = 'aus=schwierig'
    window.sessionStorage.setItem('nachweis-neu-aus-schwierig', JSON.stringify({ questionIds: [uid(1), uid(2)], departmentId: DEPT }))
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      if (url === '/api/admin/assessments/questions/search' && body?.action === 'lookup') {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: uid(1), question_text: 'Frage 1', topic: 'Luftfracht', class_level: 11, subject_codes: ['BGP'], level: 'schwer', rate: 20, rated: true, attempts: 40, isPrivate: false, blocked: false, openReports: 0 },
              { id: uid(2), question_text: 'Frage 2', topic: 'Luftfracht', class_level: 11, subject_codes: ['BGP'], level: 'schwer', rate: 25, rated: true, attempts: 40, isPrivate: false, blocked: false, openReports: 0 },
            ],
            missing: [uid(3)],
          }),
        }
      }
      return route(url, init)
    }))
    render(<AssessmentWizard />)
    expect(await screen.findByText('Frage 1')).toBeInTheDocument()
    expect(screen.getByText(/2 Fragen/)).toBeInTheDocument()
    expect(screen.getByText(/1 Frage gehört nicht zu diesem Bereich/)).toBeInTheDocument()
    // Schritt 1 gilt als ausgefüllt und bleibt über die Leiste erreichbar
    expect(within(screen.getByRole('navigation', { name: 'Schritte' })).getByRole('button', { name: /Schritt 1/ })).toBeEnabled()
    expect(window.sessionStorage.getItem('nachweis-neu-aus-schwierig')).toBeNull()
  })
})
