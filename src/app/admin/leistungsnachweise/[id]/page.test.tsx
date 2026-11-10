import { Suspense } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AssessmentDetailPage from './page'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/admin/leistungsnachweise/a1' }))
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg data-testid="qr" /> }))

function detail(status: 'draft' | 'open' | 'closed', extra: Record<string, unknown> = {}) {
  return {
    id: 'a1', title: 'Test', examSetName: null, part: 1, status, accessCode: 'ABC123', joinUrl: 'http://x/j',
    departmentId: 'd', departmentName: 'Spedition', departmentCode: 'SPED', opensAt: '', closesAt: '',
    durationMinutes: 45, gradingScale: [], resultsReleasedAt: null, focusTracking: false, focusAutoSubmitAfter: null,
    createdAt: '', schoolYear: '2026/27', className: null, subjectId: null,
    categoryOptions: { subjects: [], classes: [] }, questionCount: 10, unavailableQuestionIds: [],
    live: { joined: 7, inProgress: 2, submitted: 5 }, ...extra,
  }
}

function stubFetch(d: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.endsWith('/results')) {
      return { ok: true, json: async () => ({ focusTracking: false, participants: [], gradeDistribution: { counts: {}, average: null, passRate: null }, questions: [] }) }
    }
    return { ok: true, json: async () => d }
  }))
}

// React.use liest ein bereits erfülltes Promise synchron (kein Suspense-Umweg im Test)
const resolvedParams = Object.assign(Promise.resolve({ id: 'a1' }), { status: 'fulfilled', value: { id: 'a1' } })

async function renderPage() {
  render(
    <Suspense fallback={null}>
      <AssessmentDetailPage params={resolvedParams} />
    </Suspense>,
  )
  await screen.findByRole('heading', { name: 'Test' })
}

function openMenu() {
  fireEvent.keyDown(screen.getByRole('button', { name: /Weitere Aktionen/ }), { key: 'Enter' })
}

describe('Nachweis-Detailseite (PROJ-84)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('Entwurf: „Öffnen“ als einzige Hauptaktion, Rest im Menü, Löschen zuletzt', async () => {
    stubFetch(detail('draft'))
    await renderPage()
    expect(screen.getByRole('button', { name: /Öffnen/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fragen bearbeiten/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Drucken/ })).toBeNull()
    openMenu()
    expect(screen.getAllByRole('menuitem').map((e) => e.textContent)).toEqual([
      'Fragen bearbeiten', 'Zielbereich ändern', 'Duplizieren', 'Löschen',
    ])
  })

  it('Löschen aus dem Menü fragt erst im Dialog nach', async () => {
    stubFetch(detail('draft'))
    await renderPage()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Löschen' }))
    expect(await screen.findByText('Leistungsnachweis löschen?')).toBeInTheDocument()
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'DELETE')).toBe(false)
  })

  it('Offen: „Beitritt schließen“ ist die Hauptaktion, Menü ohne Entwurf-Einträge, Live-Kacheln und Code sichtbar', async () => {
    stubFetch(detail('open'))
    await renderPage()
    expect(screen.getByRole('button', { name: /Beitritt schließen/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Drucken & Export/ })).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('Beigetreten').previousElementSibling).toHaveTextContent('7')
    openMenu()
    expect(screen.getAllByRole('menuitem').map((e) => e.textContent)).toEqual(['Duplizieren', 'Löschen'])
  })

  it('Geschlossen: keine Code-Karte mehr, Zahlen bleiben; „Ergebnisse freigeben“ ist die Hauptaktion', async () => {
    stubFetch(detail('closed'))
    await renderPage()
    expect(screen.queryByText('Beitrittscode')).toBeNull()
    expect(screen.getByText('Abgegeben', { selector: 'p' }).previousElementSibling).toHaveTextContent('5')
    expect(screen.getByRole('button', { name: /Ergebnisse freigeben/ })).toBeInTheDocument()
  })

  it('Ablage erscheint als Zeile mit Ändern-Symbol, nicht als Formular', async () => {
    stubFetch(detail('open'))
    await renderPage()
    expect(screen.getByText(/2026\/27 · Keine Klasse · Kein Fach/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ablage ändern' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ablage speichern/ })).toBeNull()
  })
})
