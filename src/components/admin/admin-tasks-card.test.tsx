import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminTasksCard } from './admin-tasks-card'

function stubCounts(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('AdminTasksCard (PROJ-81)', () => {
  it('zeigt „Alles erledigt“, wenn nichts ansteht', async () => {
    stubCounts({ counts: { openReports: 0, unreleasedAssessments: 0, upcomingDrafts: 0, draftQuestions: null } })
    render(<AdminTasksCard />)
    expect(await screen.findByText(/Alles erledigt/)).toBeInTheDocument()
  })

  it('zeigt nur Einträge mit offenen Punkten, verlinkt und nach Dringlichkeit sortiert', async () => {
    stubCounts({ counts: { openReports: 3, unreleasedAssessments: 1, upcomingDrafts: 2, draftQuestions: 0 } })
    render(<AdminTasksCard />)
    const links = await screen.findAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      '2 Nachweise im Entwurf haben in den nächsten 7 Tagen einen Termin',
      '3 gemeldete Fragen warten auf dich',
      '1 Nachweis ist beendet, die Ergebnisse sind noch nicht freigegeben',
    ])
    expect(links[1]).toHaveAttribute('href', '/admin/gemeldete-fragen')
  })

  it('behandelt eine unbrauchbare Antwort wie „nichts zu tun“, statt abzustürzen', async () => {
    stubCounts({ unerwartet: true })
    render(<AdminTasksCard />)
    expect(await screen.findByText(/Alles erledigt/)).toBeInTheDocument()
  })

  it('zeigt bei Ladefehler einen Hinweis und lädt auf Wunsch neu', async () => {
    const fetchMock = stubCounts({}, false)
    render(<AdminTasksCard />)
    const retry = await screen.findByRole('button', { name: 'Erneut versuchen' })
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ counts: { openReports: 1 } }) })
    fireEvent.click(retry)
    await waitFor(() => expect(screen.getByText('1 gemeldete Frage wartet auf dich')).toBeInTheDocument())
  })

  it('lädt über „Aktualisieren“ neu', async () => {
    const fetchMock = stubCounts({ counts: { openReports: 0 } })
    render(<AdminTasksCard />)
    await screen.findByText(/Alles erledigt/)
    const calls = fetchMock.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Aktualisieren' }))
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(calls))
  })
})
