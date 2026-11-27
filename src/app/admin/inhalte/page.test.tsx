import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import InhaltePage from './page'
import { buildContentTree } from '@/lib/content-tree'

const nav = vi.hoisted(() => ({ query: '' }))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/inhalte',
  useSearchParams: () => new URLSearchParams(nav.query),
}))
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/components/department-provider', () => ({ useClassLevelOptions: () => [] }))
vi.mock('@/components/admin/admin-role-provider', () => ({
  useOptionalAdminRole: () => null,
  useAdminRole: () => ({ role: 'teacher', scope: null }),
}))

const tree = buildContentTree({
  subjects: [
    { id: 's1', name: 'Logistik', code: 'LOP', is_active: true, department_id: 'd1', version_number: 1, departments: { id: 'd1', name: 'Spedition', code: 'SPED' } },
  ],
  topics: [{ id: 't1', name: 'Lagerlogistik', subject_id: 's1', version_number: 1 }],
  questions: [{ topic_id: 't1', class_level: 10, is_active: false, question_subjects: [{ subject_id: 's1' }] }],
})

let urls: string[] = []
let pushed: string[] = []

beforeEach(() => {
  nav.query = ''
  urls = []
  pushed = []
  vi.clearAllMocks()
  vi.spyOn(window.history, 'pushState').mockImplementation((_s, _t, url) => void pushed.push(String(url)))
  vi.spyOn(window.history, 'replaceState').mockImplementation((_s, _t, url) => void pushed.push(String(url)))
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    urls.push(url)
    const json = url.startsWith('/api/admin/content-tree')
      ? tree
      : url.startsWith('/api/admin/tasks')
        ? { counts: { openReports: 3 } }
        : url === '/api/admin/trash?type=count'
          ? { count: 5 }
          : url.startsWith('/api/admin/question-reports')
            ? { items: [], total: 0, page: 1, pageSize: 25 }
            : { questions: [], total: 0, items: [] }
    return { ok: true, status: 200, json: async () => json }
  }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Lerninhalte-Seite (PROJ-131)', () => {
  it('zeigt vier Reiter mit den Zahlen für Gemeldet und Papierkorb', async () => {
    render(<InhaltePage />)
    await screen.findByRole('tree')
    await waitFor(() => expect(screen.getByRole('tab', { name: /Gemeldet/ })).toHaveTextContent('3'))
    expect(screen.getByRole('tab', { name: /Papierkorb/ })).toHaveTextContent('5')
    expect(screen.getAllByRole('tab').map((t) => t.textContent?.replace(/\d/g, ''))).toEqual(
      expect.arrayContaining(['Fragen', 'Gemeldet', 'Schwierig', 'Papierkorb']),
    )
  })

  it('schreibt den Reiter in die Adresse', async () => {
    render(<InhaltePage />)
    await screen.findByRole('tree')
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Gemeldet/ }))
    expect(pushed).toContain('/admin/inhalte?reiter=gemeldet')
  })

  it('öffnet den Reiter aus der Adresse mit derselben Auswahl und schränkt ihn ein', async () => {
    nav.query = 'reiter=gemeldet&fach=s1&thema=t1'
    render(<InhaltePage />)
    expect(await screen.findByText(/Nur Meldungen zu/)).toHaveTextContent('LOP › Lagerlogistik')
    await waitFor(() => expect(urls.some((u) => u.startsWith('/api/admin/question-reports?') && u.includes('topic=t1'))).toBe(true))
  })

  it('führt einen Link auf ein gelöschtes Thema zu „Alle Fächer“ mit Hinweis', async () => {
    nav.query = 'fach=s1&thema=weg'
    render(<InhaltePage />)
    await screen.findByRole('tree')
    await waitFor(() => expect(toastMock.info).toHaveBeenCalledWith(expect.stringContaining('Dieses Thema gibt es nicht mehr')))
    expect(pushed).toContain('/admin/inhalte')
  })

  it('hat am Handy eine einklappbare Leiste mit der Auswahl', async () => {
    nav.query = 'fach=s1&thema=t1'
    render(<InhaltePage />)
    const bar = await screen.findByRole('button', { name: /Fach und Thema: LOP › Lagerlogistik/ })
    expect(bar).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(bar)
    expect(bar).toHaveAttribute('aria-expanded', 'true')
  })
})
