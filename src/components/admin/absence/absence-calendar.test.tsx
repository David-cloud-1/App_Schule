import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AbsenceCalendar } from '@/components/admin/absence/absence-calendar'
import { todayIso } from '@/lib/absence'
import type { Abwesenheit, KalenderIch } from '@/lib/kalender'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/supabase-browser', () => {
  const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }
  return { createClient: () => ({ channel: () => channel, removeChannel: vi.fn() }) }
})

const today = todayIso()

function row(over: Partial<Abwesenheit> = {}): Abwesenheit {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    person_id: 'p1',
    person_name: 'Anna Beispiel',
    erstellt_von: 'p1',
    erstellt_von_name: 'Anna Beispiel',
    art_id: 't1',
    art_name: 'Fortbildung',
    art_farbe: 'blue',
    art_icon: 'graduation-cap',
    datum_von: today,
    datum_bis: today,
    ganztaegig: true,
    zeit_von: null,
    zeit_bis: null,
    alle_abteilungen: true,
    abteilungen: [],
    freitext: null,
    notiz: null,
    vertretung_status: 'offen',
    vertretung_von_name: null,
    vertretung_am: null,
    geaendert_nach_vertretung: false,
    version: 1,
    created_at: '2026-11-19T08:00:00Z',
    updated_at: '2026-11-19T08:00:00Z',
    darf_bearbeiten: false,
    storniert_am: null,
    storniert_von_name: null,
    ...over,
  }
}

function mockApi(items: Abwesenheit[], ich: KalenderIch = { id: 'p2', ist_planer: false, ist_super_admin: false }) {
  const meta = {
    ich,
    arten: [
      { id: 't1', name: 'Fortbildung', farbe: 'blue', icon: 'graduation-cap', sort_order: 1, aktiv: true, fest: false, mit_freitext: false, anzahl: 1 },
    ],
    lehrkraefte: [{ id: 'p2', name: 'Ben Muster' }],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/meta')) return new Response(JSON.stringify(meta))
      return new Response(JSON.stringify({ items, hasMore: false }))
    }),
  )
}

describe('AbsenceCalendar (PROJ-120)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('absence-calendar-prefs', JSON.stringify({ view: 'list' }))
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('zeigt am Handy die Liste mit Name, Art und Vertretungsstatus als Text', async () => {
    mockApi([row()])
    render(<AbsenceCalendar />)
    expect(await screen.findByText('Anna Beispiel')).toBeInTheDocument()
    expect(screen.getAllByText('Fortbildung').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vertretung fehlt').length).toBeGreaterThan(0)
  })

  it('zeigt im Monatsraster Name und „fehlt“ als Text an der Marke', async () => {
    window.localStorage.setItem('absence-calendar-prefs', JSON.stringify({ view: 'month' }))
    mockApi([row()])
    render(<AbsenceCalendar />)
    const chip = await screen.findByTitle('Anna Beispiel: Fortbildung, Vertretung fehlt')
    expect(chip).toHaveTextContent('Anna Beispiel')
    expect(chip).toHaveTextContent('fehlt')
  })

  it('zeigt den Leerzustand mit Hauptaktion', async () => {
    mockApi([])
    render(<AbsenceCalendar />)
    expect(await screen.findByText('Keine Abwesenheiten in diesem Zeitraum')).toBeInTheDocument()
  })

  it('zeigt den Fehlerzustand mit „Erneut versuchen“', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    render(<AbsenceCalendar />)
    expect(await screen.findByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
  })

  it('zeigt normalen Lehrkräften weder Status-Schalter noch Bearbeiten', async () => {
    mockApi([row()])
    render(<AbsenceCalendar />)
    fireEvent.click(await screen.findByText('Anna Beispiel'))
    await screen.findByText('Eingetragen von')
    expect(screen.queryByRole('button', { name: /In Untis erfasst/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bearbeiten/ })).not.toBeInTheDocument()
  })

  it('gibt Vertretungsplanern den Status-Schalter', async () => {
    mockApi([row()], { id: 'p3', ist_planer: true, ist_super_admin: false })
    render(<AbsenceCalendar />)
    fireEvent.click(await screen.findByText('Anna Beispiel'))
    await waitFor(() => expect(screen.getByRole('button', { name: /In Untis erfasst/ })).toBeInTheDocument())
  })

  it('zeigt Bearbeiten nur, wenn der Server es erlaubt (darf_bearbeiten)', async () => {
    mockApi([row({ darf_bearbeiten: true })])
    render(<AbsenceCalendar />)
    fireEvent.click(await screen.findByText('Anna Beispiel'))
    await waitFor(() => expect(screen.getByRole('button', { name: /Bearbeiten/ })).toBeInTheDocument())
  })

  it('öffnet mit „?vertretung=offen“ gleich mit dem Filter „Vertretung fehlt“', async () => {
    mockApi([row(), row({ id: '22222222-2222-4222-8222-222222222222', person_name: 'Carla Fertig', vertretung_status: 'eingetragen' })])
    render(<AbsenceCalendar initialSubstitute="open" />)
    expect(await screen.findByText('Anna Beispiel')).toBeInTheDocument()
    expect(screen.queryByText('Carla Fertig')).not.toBeInTheDocument()
  })

  const storniert = {
    vertretung_status: 'eingetragen' as const,
    storniert_am: '2026-11-20T09:00:00Z',
    storniert_von_name: 'Anna Beispiel',
  }

  it('zeigt gelöschte Einträge mit eingetragener Vertretung gelb als „Gelöscht – Vertretung zurücknehmen“', async () => {
    mockApi([row(storniert)])
    render(<AbsenceCalendar />)
    expect(await screen.findByText('Gelöscht – Vertretung zurücknehmen')).toBeInTheDocument()
    expect(screen.queryByText('Vertretung eingetragen')).not.toBeInTheDocument()
  })

  it('zeigt gelöschte Einträge auch im Filter „Vertretung fehlt“ (Planer müssen noch handeln)', async () => {
    mockApi([row(storniert)])
    render(<AbsenceCalendar initialSubstitute="open" />)
    expect(await screen.findByText('Anna Beispiel')).toBeInTheDocument()
  })

  it('gibt Planern „Vertretung zurückgenommen“ statt der Status-Knöpfe', async () => {
    mockApi([row(storniert)], { id: 'p3', ist_planer: true, ist_super_admin: false })
    render(<AbsenceCalendar />)
    fireEvent.click(await screen.findByText('Anna Beispiel'))
    await waitFor(() => expect(screen.getByRole('button', { name: /Vertretung zurückgenommen/ })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Zurück auf „Vertretung fehlt“/ })).not.toBeInTheDocument()
  })

  it('zeigt Normal-Lehrkräften nur den Hinweis und „Löschung zurücknehmen“, kein Bearbeiten', async () => {
    mockApi([row({ ...storniert, darf_bearbeiten: true })])
    render(<AbsenceCalendar />)
    fireEvent.click(await screen.findByText('Anna Beispiel'))
    await waitFor(() => expect(screen.getByRole('button', { name: /Löschung zurücknehmen/ })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Vertretung zurückgenommen/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Bearbeiten/ })).not.toBeInTheDocument()
  })
})
