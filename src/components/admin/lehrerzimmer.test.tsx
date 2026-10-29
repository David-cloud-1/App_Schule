import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'
import { AdminNav } from './admin-nav'
import { LehrerzimmerOverview } from './lehrerzimmer-overview'
import { ForumThreadView } from './forum-thread-view'
import { ForumPostForm } from './forum-post-form'
import type { ForumListItem, ForumThread } from '@/lib/forum'
import type { TeacherRole } from '@/lib/roles'

// ── Next-Navigation: Adresse als veränderlicher Zustand ───────────────────
let mockPath = '/admin/lehrerzimmer'
let mockSearch = ''
const push = vi.fn()
const replace = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ push, replace }),
}))

const POST_ID = '11111111-1111-4111-8111-111111111111'
const REPLY_A = '22222222-2222-4222-8222-222222222222'
const REPLY_B = '33333333-3333-4333-8333-333333333333'

function item(over: Partial<ForumListItem> = {}): ForumListItem {
  return {
    id: POST_ID,
    category: 'frage',
    title: 'Wie erkläre ich Incoterms?',
    snippet: 'Hat jemand eine gute Übung?',
    author_name: 'Frau Meier',
    is_mine: false,
    department_id: null,
    department_name: 'Spedition',
    subject_id: null,
    subject_name: null,
    reply_count: 2,
    helpful_count: 3,
    is_solved: false,
    is_hidden: false,
    has_unread: false,
    my_helpful: false,
    created_at: '2026-10-29T10:00:00Z',
    edited_at: null,
    last_activity_at: '2026-10-29T11:00:00Z',
    ...over,
  }
}

type Routes = Record<string, (init?: RequestInit) => { status?: number; body: unknown }>
let calls: { url: string; init?: RequestInit }[] = []

/** Antwortet nach Adresse; Reihenfolge: genauester Treffer zuerst. */
function stubFetch(routes: Routes) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calls.push({ url, init })
      // genauester (längster) Pfad gewinnt, damit /posts/ID/replies nicht von /posts/ID verschluckt wird
      const key = Object.keys(routes)
        .filter((k) => url.startsWith(k))
        .sort((a, b) => b.length - a.length)[0]
      const res = key ? routes[key](init) : { body: {} }
      const status = res.status ?? 200
      return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(res.body) })
    }),
  )
}

const DEPT = '44444444-4444-4444-8444-444444444444'
const SUBJ = '55555555-5555-4555-8555-555555555555'
const CATALOG = {
  departments: [{ id: DEPT, name: 'Spedition', code: 'SPED' }],
  subjects: [{ id: SUBJ, name: 'BGP', code: 'BGP', department_id: DEPT }],
  own_department_ids: [DEPT],
}
const NAV0 = { new_posts: 0, new_replies: 0, open_reports: 0 }

function wrap(ui: React.ReactNode, role: TeacherRole = 'teacher') {
  return renderInWorkspace(ui, { role })
}

beforeEach(() => {
  mockViewport(1280)
  mockPath = '/admin/lehrerzimmer'
  mockSearch = ''
  push.mockClear()
  replace.mockClear()
  window.localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

describe('Seitenleisten-Zähler (PROJ-63)', () => {
  it('zeigt neue Hinweise am Lehrerzimmer-Eintrag mit Text für Screenreader', async () => {
    stubFetch({ '/api/admin/lehrerzimmer/nav-counts': () => ({ body: { new_posts: 2, new_replies: 1, open_reports: 0 } }) })
    wrap(<AdminNav />)
    const link = await screen.findByRole('link', { name: /Lehrerzimmer/ })
    await waitFor(() => expect(within(link).getByText('3 neue Hinweise')).toBeInTheDocument())
    expect(within(link).queryByText(/Meldungen/)).toBeNull()
  })

  it('zeigt Admins offene Meldungen getrennt und „9+“ ab zehn', async () => {
    stubFetch({ '/api/admin/lehrerzimmer/nav-counts': () => ({ body: { new_posts: 12, new_replies: 0, open_reports: 2 } }) })
    wrap(<AdminNav />, 'department_admin')
    const link = await screen.findByRole('link', { name: /Lehrerzimmer/ })
    await waitFor(() => expect(within(link).getByText('2 offene Meldungen')).toBeInTheDocument())
    expect(within(link).getByText('9+')).toBeInTheDocument()
  })

  it('zeigt nichts bei 0 und bei Fehlern, die Navigation bleibt benutzbar', async () => {
    stubFetch({ '/api/admin/lehrerzimmer/nav-counts': () => ({ status: 500, body: { error: 'x' } }) })
    wrap(<AdminNav />)
    const link = await screen.findByRole('link', { name: 'Lehrerzimmer' })
    expect(link.textContent).toBe('Lehrerzimmer')
  })
})

describe('Übersicht', () => {
  it('zeigt die Beiträge mit Kategorie, Antworten, Hilfreich und Punkt für Ungelesenes', async () => {
    stubFetch({
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
      '/api/admin/lehrerzimmer/visit': () => ({ body: { ok: true } }),
      '/api/admin/lehrerzimmer/posts': () => ({
        body: { items: [item({ has_unread: true }), item({ id: 'p2', title: 'Gelöste Frage', is_solved: true })], hasMore: false },
      }),
    })
    wrap(<LehrerzimmerOverview />)
    expect(await screen.findByRole('link', { name: /Wie erkläre ich Incoterms\?/ })).toHaveAttribute(
      'href',
      `/admin/lehrerzimmer/${POST_ID}`,
    )
    expect(screen.getByRole('img', { name: 'Neu oder ungelesen' })).toBeInTheDocument()
    expect(screen.getByText('gelöst')).toBeInTheDocument()
    // Hauptaktion im Kopf, nicht im Leerzustand
    expect(screen.getAllByRole('link', { name: /Neuer Beitrag/ })).toHaveLength(1)
  })

  it('merkt sich den Besuch der Übersicht', async () => {
    stubFetch({
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
      '/api/admin/lehrerzimmer/visit': () => ({ body: { ok: true } }),
      '/api/admin/lehrerzimmer/posts': () => ({ body: { items: [item()], hasMore: false } }),
    })
    wrap(<LehrerzimmerOverview />)
    await screen.findByText('Wie erkläre ich Incoterms?')
    await waitFor(() => expect(calls.some((c) => c.url === '/api/admin/lehrerzimmer/visit' && c.init?.method === 'POST')).toBe(true))
  })

  it('zeigt bei leerem Forum den Leerzustand mit der einzigen Hauptaktion', async () => {
    stubFetch({
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
      '/api/admin/lehrerzimmer/visit': () => ({ body: { ok: true } }),
      '/api/admin/lehrerzimmer/posts': () => ({ body: { items: [], hasMore: false } }),
    })
    wrap(<LehrerzimmerOverview />)
    expect(await screen.findByText('Noch keine Beiträge')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Neuer Beitrag/ })).toHaveLength(1)
  })

  it('unterscheidet „keine Treffer“ von „leer“ und setzt die Filter zurück', async () => {
    mockSearch = 'category=idee&mine=1'
    stubFetch({
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
      '/api/admin/lehrerzimmer/visit': () => ({ body: { ok: true } }),
      '/api/admin/lehrerzimmer/posts': () => ({ body: { items: [], hasMore: false } }),
    })
    wrap(<LehrerzimmerOverview />)
    expect(await screen.findByText('Keine Beiträge passen zu den Filtern')).toBeInTheDocument()
    // Die Filter kamen aus der Adresse und gingen an die Schnittstelle
    expect(calls.find((c) => c.url.startsWith('/api/admin/lehrerzimmer/posts'))?.url).toContain('category=idee')
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }))
    expect(replace).toHaveBeenCalled()
    expect(replace.mock.calls.at(-1)?.[0]).not.toContain('category')
    expect(replace.mock.calls.at(-1)?.[0]).not.toContain('mine')
  })

  it('lädt mit „Mehr laden“ die nächsten Beiträge nach', async () => {
    stubFetch({
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
      '/api/admin/lehrerzimmer/visit': () => ({ body: { ok: true } }),
      '/api/admin/lehrerzimmer/posts?offset=1': () => ({ body: { items: [item({ id: 'p2', title: 'Zweiter Beitrag' })], hasMore: false } }),
      '/api/admin/lehrerzimmer/posts': () => ({ body: { items: [item()], hasMore: true } }),
    })
    wrap(<LehrerzimmerOverview />)
    fireEvent.click(await screen.findByRole('button', { name: 'Mehr laden' }))
    expect(await screen.findByText('Zweiter Beitrag')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mehr laden' })).toBeNull()
  })

  it('zeigt einen verständlichen Fehler mit „Erneut versuchen“', async () => {
    stubFetch({
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
      '/api/admin/lehrerzimmer/posts': () => ({ status: 500, body: { error: 'kaputt' } }),
    })
    wrap(<LehrerzimmerOverview />)
    expect(await screen.findByRole('alert')).toHaveTextContent('nicht geladen')
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
  })

  it('zeigt den Reiter „Gemeldet“ nur Admins', async () => {
    const routes: Routes = {
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: { ...NAV0, open_reports: 3 } }),
      '/api/admin/lehrerzimmer/visit': () => ({ body: { ok: true } }),
      '/api/admin/lehrerzimmer/posts': () => ({ body: { items: [item()], hasMore: false } }),
    }
    stubFetch(routes)
    const { unmount } = wrap(<LehrerzimmerOverview />, 'teacher')
    await screen.findByText('Wie erkläre ich Incoterms?')
    expect(screen.queryByRole('tab', { name: /Gemeldet/ })).toBeNull()
    unmount()
    stubFetch(routes)
    wrap(<LehrerzimmerOverview />, 'department_admin')
    expect(await screen.findByRole('tab', { name: 'Gemeldet (3)' })).toBeInTheDocument()
  })
})

// ── Beitragsseite ─────────────────────────────────────────────────────────

function thread(over: { post?: Partial<ForumThread['post']>; replies?: ForumThread['replies'] } = {}): ForumThread {
  return {
    post: {
      id: POST_ID,
      category: 'frage',
      title: 'Wie erkläre ich Incoterms?',
      body: 'Hat jemand eine **gute** Übung?',
      author_name: 'Frau Meier',
      is_mine: false,
      department_id: null,
      department_name: null,
      subject_id: null,
      subject_name: null,
      reply_count: 2,
      helpful_count: 1,
      solution_reply_id: null,
      is_hidden: false,
      my_helpful: false,
      created_at: '2026-10-29T10:00:00Z',
      edited_at: null,
      ...over.post,
    },
    replies: over.replies ?? [
      { id: REPLY_A, body: 'Erste Antwort', author_name: 'Herr Bauer', is_mine: false, helpful_count: 0, is_solution: false, is_hidden: false, my_helpful: false, created_at: '2026-10-29T10:30:00Z', edited_at: null },
      { id: REPLY_B, body: 'Zweite Antwort', author_name: 'Frau Klein', is_mine: false, helpful_count: 2, is_solution: false, is_hidden: false, my_helpful: false, created_at: '2026-10-29T11:00:00Z', edited_at: null },
    ],
  }
}

function stubThread(t: ForumThread, extra: Routes = {}) {
  stubFetch({
    '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
    [`/api/admin/lehrerzimmer/posts/${POST_ID}`]: () => ({ body: t }),
    ...extra,
  })
}

describe('Beitragsseite', () => {
  it('zeigt den Beitrag formatiert und die Antworten in zeitlicher Reihenfolge', async () => {
    stubThread(thread())
    wrap(<ForumThreadView id={POST_ID} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Wie erkläre ich Incoterms?' })).toBeInTheDocument()
    expect(screen.getByText('gute').tagName).toBe('STRONG')
    const texts = screen.getAllByText(/^(Erste|Zweite) Antwort$/).map((n) => n.textContent)
    expect(texts).toEqual(['Erste Antwort', 'Zweite Antwort'])
  })

  it('stellt die Lösungs-Antwort nach oben und kennzeichnet sie', async () => {
    const t = thread()
    t.replies[1].is_solution = true
    t.post.solution_reply_id = REPLY_B
    stubThread(t)
    wrap(<ForumThreadView id={POST_ID} />)
    await screen.findByText('Zweite Antwort')
    const items = screen.getAllByRole('listitem').filter((li) => li.id.startsWith('antwort-'))
    expect(items[0]).toHaveTextContent('Zweite Antwort')
    expect(items[0]).toHaveTextContent('Lösung')
    expect(screen.getByText('gelöst')).toBeInTheDocument()
  })

  it('bietet „Als Lösung markieren“ nur dem Fragesteller und nur an fremden Antworten', async () => {
    const t = thread({ post: { is_mine: true } })
    t.replies[1].is_mine = true
    stubThread(t)
    const { unmount } = wrap(<ForumThreadView id={POST_ID} />)
    await screen.findByText('Erste Antwort')
    // Nur die fremde (erste) Antwort bekommt den Knopf
    expect(screen.getAllByRole('button', { name: 'Als Lösung markieren' })).toHaveLength(1)
    unmount()

    stubThread(thread())
    wrap(<ForumThreadView id={POST_ID} />)
    await screen.findByText('Erste Antwort')
    expect(screen.queryByRole('button', { name: 'Als Lösung markieren' })).toBeNull()
  })

  it('markiert die Lösung über die Schnittstelle und lädt neu', async () => {
    stubThread(thread({ post: { is_mine: true } }), {
      [`/api/admin/lehrerzimmer/posts/${POST_ID}/solution`]: () => ({ body: { ok: true } }),
    })
    wrap(<ForumThreadView id={POST_ID} />)
    const buttons = await screen.findAllByRole('button', { name: 'Als Lösung markieren' })
    fireEvent.click(buttons[0])
    await waitFor(() => {
      const call = calls.find((c) => c.url.endsWith('/solution'))
      expect(call?.init?.method).toBe('PUT')
      expect(JSON.parse(String(call?.init?.body))).toEqual({ reply_id: REPLY_A })
    })
  })

  it('sperrt „Hilfreich“ für Eigenes und setzt es sonst um', async () => {
    const t = thread({ post: { is_mine: true } })
    stubThread(t, {
      '/api/admin/lehrerzimmer/helpful': () => ({ body: { helpful: true, count: 1 } }),
    })
    wrap(<ForumThreadView id={POST_ID} />)
    await screen.findByText('Erste Antwort')
    const helpfulButtons = screen.getAllByRole('button', { name: /^Hilfreich/ })
    expect(helpfulButtons[0]).toBeDisabled() // eigener Beitrag
    fireEvent.click(helpfulButtons[1]) // fremde Antwort
    await waitFor(() => expect(helpfulButtons[1]).toHaveAttribute('aria-pressed', 'true'))
  })

  it('zeigt Lehrkräften an fremden Beiträgen „Melden“, aber kein Ausblenden', async () => {
    stubThread(thread())
    wrap(<ForumThreadView id={POST_ID} />, 'teacher')
    await screen.findByText('Erste Antwort')
    expect(screen.getAllByRole('button', { name: /melden$/ }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Weitere Aktionen/ })).toBeNull()
  })

  it('zeigt Admins das Menü mit „Ausblenden“ und dem Hinweisband bei Ausgeblendetem', async () => {
    stubThread(thread({ post: { is_hidden: true } }))
    wrap(<ForumThreadView id={POST_ID} />, 'department_admin')
    await screen.findByText('Erste Antwort')
    expect(screen.getByText(/Von der Moderation ausgeblendet/)).toBeInTheDocument()
    fireEvent.pointerDown(screen.getAllByRole('button', { name: /Weitere Aktionen: Beitrag/ })[0], { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Einblenden' })).toBeInTheDocument()
  })

  it('behält den Antworttext, wenn der Beitrag inzwischen gelöscht wurde', async () => {
    stubThread(thread(), {
      [`/api/admin/lehrerzimmer/posts/${POST_ID}/replies`]: () => ({ status: 404, body: { error: 'Dieser Beitrag wurde inzwischen gelöscht.' } }),
    })
    wrap(<ForumThreadView id={POST_ID} />)
    const field = await screen.findByLabelText('Deine Antwort')
    fireEvent.change(field, { target: { value: 'Meine lange Antwort' } })
    fireEvent.click(screen.getByRole('button', { name: 'Antworten' }))
    expect(await screen.findByText('Dieser Beitrag wurde inzwischen gelöscht.')).toBeInTheDocument()
    expect(field).toHaveValue('Meine lange Antwort')
  })

  it('fragt vor dem Löschen und leitet danach zur Übersicht', async () => {
    stubThread(thread({ post: { is_mine: true } }), {
      [`/api/admin/lehrerzimmer/posts/${POST_ID}`]: (init) => (init?.method === 'DELETE' ? { body: { ok: true } } : { body: thread({ post: { is_mine: true } }) }),
    })
    wrap(<ForumThreadView id={POST_ID} />)
    await screen.findByText('Erste Antwort')
    fireEvent.pointerDown(screen.getByRole('button', { name: /Weitere Aktionen: Beitrag/ }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Löschen' }))
    expect(await screen.findByText('Beitrag löschen?')).toBeInTheDocument()
    expect(calls.some((c) => c.init?.method === 'DELETE')).toBe(false) // noch nicht gelöscht
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/lehrerzimmer'))
  })

  it('zeigt bei nicht sichtbarem Beitrag einen Hinweis statt eines Fehlers', async () => {
    stubFetch({
      '/api/admin/lehrerzimmer/nav-counts': () => ({ body: NAV0 }),
      [`/api/admin/lehrerzimmer/posts/${POST_ID}`]: () => ({ status: 404, body: { error: 'Nicht gefunden.' } }),
    })
    wrap(<ForumThreadView id={POST_ID} />)
    expect(await screen.findByText('Diesen Beitrag gibt es nicht mehr')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zurück zum Lehrerzimmer' })).toHaveAttribute('href', '/admin/lehrerzimmer')
  })
})

// ── Formular ──────────────────────────────────────────────────────────────

describe('Beitragsformular', () => {
  const formRoutes = (): Routes => ({
    '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
    '/api/admin/lehrerzimmer/posts': () => ({ status: 201, body: { id: POST_ID } }),
  })

  it('zeigt Fehler am Feld und sendet nichts, wenn Angaben fehlen', async () => {
    stubFetch(formRoutes())
    wrap(<ForumPostForm />)
    fireEvent.click(await screen.findByRole('button', { name: 'Veröffentlichen' }))
    expect(await screen.findByText('Bitte eine Kategorie wählen.')).toBeInTheDocument()
    expect(screen.getByText(/Der Titel braucht mindestens 5 Zeichen/)).toBeInTheDocument()
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false)
  })

  it('veröffentlicht, räumt den Entwurf weg und öffnet den Beitrag', async () => {
    stubFetch(formRoutes())
    wrap(<ForumPostForm />)
    fireEvent.click(await screen.findByRole('radio', { name: /Tipp/ }))
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Mein erster Tipp' } })
    fireEvent.change(screen.getByLabelText('Text des Beitrags'), { target: { value: 'Ein ausreichend langer Text.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/lehrerzimmer/${POST_ID}`))
    const post = calls.find((c) => c.init?.method === 'POST')
    expect(JSON.parse(String(post?.init?.body))).toMatchObject({ category: 'tipp', title: 'Mein erster Tipp', department_id: DEPT })
    expect(window.localStorage.getItem('forum-draft-v1')).toBeNull()
  })

  it('stellt einen gemerkten Entwurf wieder her und lässt ihn verwerfen', async () => {
    window.localStorage.setItem(
      'forum-draft-v1',
      JSON.stringify({ category: 'idee', title: 'Halbfertiger Titel', body: 'Halber Text', departmentId: 'none', subjectId: 'none' }),
    )
    stubFetch(formRoutes())
    wrap(<ForumPostForm />)
    expect(await screen.findByText(/Entwurf wurde wiederhergestellt/)).toBeInTheDocument()
    expect(screen.getByLabelText('Titel')).toHaveValue('Halbfertiger Titel')
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf verwerfen' }))
    expect(screen.getByLabelText('Titel')).toHaveValue('')
    expect(window.localStorage.getItem('forum-draft-v1')).toBeNull()
  })

  it('zeigt die Fehlermeldung des Servers (z. B. Flut-Schutz) und bleibt auf der Seite', async () => {
    const routes = formRoutes()
    routes['/api/admin/lehrerzimmer/posts'] = () => ({ status: 429, body: { error: 'Bitte kurz warten, du hast gerade viele Beiträge geschrieben.' } })
    stubFetch(routes)
    wrap(<ForumPostForm />)
    fireEvent.click(await screen.findByRole('radio', { name: /Frage/ }))
    fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Noch ein Beitrag' } })
    fireEvent.change(screen.getByLabelText('Text des Beitrags'), { target: { value: 'Ein ausreichend langer Text.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Veröffentlichen' }))
    expect(await screen.findByText(/Bitte kurz warten/)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('erlaubt das Bearbeiten nur eigener Beiträge', async () => {
    stubFetch({
      '/api/admin/lehrerzimmer/catalog': () => ({ body: CATALOG }),
      [`/api/admin/lehrerzimmer/posts/${POST_ID}`]: () => ({ body: thread({ post: { is_mine: false } }) }),
    })
    wrap(<ForumPostForm postId={POST_ID} />)
    expect(await screen.findByText('Du kannst nur eigene Beiträge bearbeiten.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Speichern' })).toBeNull()
  })
})
