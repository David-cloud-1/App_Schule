import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BulkAccountImport } from './bulk-account-import'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import { BULK_CHUNK_SIZE, type PreviewRow } from '@/lib/account-create'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/admin/users/aus-liste',
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/admin/access-slips', () => ({
  AccessSlipsPrint: ({ accounts }: { accounts: unknown[] }) => <div data-testid="zettel">{accounts.length} Zettel</div>,
}))

const DEPARTMENTS = [
  { id: 'd1', name: 'Spedition', code: 'SPED' },
  { id: 'd2', name: 'Tourismus', code: 'TOUR' },
]

function renderPage() {
  return render(
    <AdminRoleProvider value={{ role: 'admin', isSuperAdmin: true, scope: { current: 'd1', departments: DEPARTMENTS } }}>
      <BulkAccountImport />
    </AdminRoleProvider>,
  )
}

/** jsdom kennt File.arrayBuffer nicht überall: die Bytes direkt mitgeben */
function csvFile(text: string, name = 'liste.csv'): File {
  const bytes = new TextEncoder().encode(text)
  const file = new File([bytes], name, { type: 'text/csv' })
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer })
  return file
}

async function upload(text: string) {
  fireEvent.change(screen.getByLabelText('CSV-Datei'), { target: { files: [csvFile(text)] } })
  await screen.findByText(/Zeilen gelesen/)
}

const previewRow = (line: number, patch: Partial<PreviewRow> = {}): PreviewRow => ({
  line,
  name: `Person ${line}`,
  email: `p${line}@example.de`,
  departmentId: 'd1',
  departmentName: 'Spedition',
  role: 'student',
  status: 'ok',
  reason: null,
  ...patch,
})

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body }
}

function bulkCsv(count: number) {
  return ['Name;E-Mail', ...Array.from({ length: count }, (_, i) => `Person ${i + 2};p${i + 2}@example.de`)].join('\n')
}

describe('Konten aus Liste anlegen (PROJ-62)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    push.mockClear()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
  })

  it('Schritt 1: erkennt die Spalten und erlaubt die Vorschau mit dem vorgewählten Bereich', async () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Vorlage herunterladen/ })).toBeInTheDocument()
    await upload('Name;E-Mail\nAnna Azubi;anna@example.de\nBen Berger;ben@example.de')
    expect(screen.getByText(/2 Zeilen gelesen/)).toBeInTheDocument()
    expect(screen.queryByText(/nicht eindeutig erkannt/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weiter zur Vorschau' })).toBeEnabled()
  })

  it('meldet eine zu lange Datei und lässt nichts weiter', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('CSV-Datei'), { target: { files: [csvFile(bulkCsv(301))] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('in mehrere Dateien')
    expect(screen.queryByRole('button', { name: 'Weiter zur Vorschau' })).not.toBeInTheDocument()
  })

  it('bittet um Zuordnung, wenn die Spalten unklar sind, und sperrt die Vorschau', async () => {
    renderPage()
    await upload('Wer;Adresse\nAnna;anna@example.de')
    expect(screen.getByText(/nicht eindeutig erkannt/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weiter zur Vorschau' })).toBeDisabled()
  })

  it('Schritt 2: zeigt jede Zeile mit Status und Begründung und zählt sie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          rows: [
            previewRow(2),
            previewRow(3, { status: 'warning', reason: 'Konto existiert schon – übersprungen.' }),
            previewRow(4, { status: 'error', email: 'kaputt', reason: 'E-Mail ungültig.', role: null }),
          ],
        }),
      ),
    )
    renderPage()
    await upload('Name;E-Mail\nA;a@example.de\nB;b@example.de\nC;kaputt')
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    await screen.findByText('Konto existiert schon – übersprungen.')
    expect(screen.getByText('E-Mail ungültig.')).toBeInTheDocument()
    expect(screen.getByText(/Warnungen/).textContent).toContain('1')
    expect(screen.getByRole('button', { name: '1 Konto anlegen' })).toBeEnabled()
    const fetchMock = vi.mocked(fetch)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/admin/users/create/preview')
    const body = JSON.parse(init.body as string)
    expect(body.defaultDepartmentId).toBe('d1')
    expect(body.rows[0]).toMatchObject({ line: 2, name: 'A', email: 'a@example.de' })
  })

  it('zeigt Fehler der Vorschau und bleibt in Schritt 1', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Zu viele Sammel-Anlagen in kurzer Zeit.' }, false)))
    renderPage()
    await upload('Name;E-Mail\nA;a@example.de')
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Sammel-Anlagen')
    expect(screen.getByRole('button', { name: 'Weiter zur Vorschau' })).toBeInTheDocument()
  })

  it('ohne OK-Zeile gibt es nichts anzulegen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ rows: [previewRow(2, { status: 'error', reason: 'Name leer.' })] })),
    )
    renderPage()
    await upload('Name;E-Mail\n;a@example.de')
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    await screen.findByText('Name leer.')
    expect(screen.getByRole('button', { name: '0 Konten anlegen' })).toBeDisabled()
  })

  it('Schritt 3: legt nur die OK-Zeilen in Päckchen an und zeigt die Passwörter einmalig', async () => {
    const total = BULK_CHUNK_SIZE + 5
    const previewRows = Array.from({ length: total }, (_, i) => previewRow(i + 2))
    previewRows.push(previewRow(total + 2, { status: 'error', reason: 'Name leer.' }))
    const createCalls: { rows: { line: number }[]; batchId: string; batchIndex: number; batchCount: number }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (url.endsWith('/preview')) return jsonResponse({ rows: previewRows })
        const body = JSON.parse(init.body as string)
        createCalls.push(body)
        return jsonResponse({
          created: body.rows.map((r: { line: number; name: string; email: string }) => ({
            line: r.line,
            name: r.name,
            email: r.email,
            password: `Hafen-Kran-Birke-${r.line}`,
            role: 'student',
            departmentName: 'Spedition',
          })),
          failed: [],
        })
      }),
    )
    renderPage()
    await upload(bulkCsv(total + 1))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    fireEvent.click(await screen.findByRole('button', { name: `${total} Konten anlegen` }))

    await screen.findByText(/einzige Gelegenheit, die Passwörter zu sehen/)
    expect(createCalls).toHaveLength(2)
    expect(createCalls[0].rows).toHaveLength(BULK_CHUNK_SIZE)
    expect(createCalls[1].rows).toHaveLength(5)
    expect(createCalls.every((c) => c.batchId === createCalls[0].batchId)).toBe(true)
    expect(createCalls.map((c) => c.batchIndex)).toEqual([0, 1])
    expect(createCalls.map((c) => c.batchCount)).toEqual([2, 2])
    // Zahlen fürs Protokoll „Sammel-Anlage“ gehen nur mit dem letzten Päckchen
    expect((createCalls[0] as { summary?: unknown }).summary).toBeUndefined()
    expect((createCalls[1] as { summary?: unknown }).summary).toEqual({ skipped: 0, invalid: 1, failed: 0 })
    // Die Fehlerzeile wurde nie gesendet
    expect(createCalls.flatMap((c) => c.rows.map((r) => r.line))).not.toContain(total + 2)

    expect(screen.getByText('Hafen-Kran-Birke-2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Zugangszettel drucken/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Liste als CSV/ })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /Zugangszettel drucken/ }))
    expect(screen.getByTestId('zettel')).toHaveTextContent(`${total} Zettel`)
  })

  it('Abbruch mittendrin: bisher Angelegtes bleibt sichtbar, die fehlenden Zeilen gibt es als Liste', async () => {
    const total = BULK_CHUNK_SIZE + 5
    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (url.endsWith('/preview')) return jsonResponse({ rows: Array.from({ length: total }, (_, i) => previewRow(i + 2)) })
        call += 1
        if (call === 2) return jsonResponse({ error: 'Der Server ist gerade nicht erreichbar.' }, false)
        const body = JSON.parse(init.body as string)
        return jsonResponse({
          created: body.rows.map((r: { line: number; name: string; email: string }) => ({
            line: r.line, name: r.name, email: r.email, password: `Hafen-Kran-Birke-${r.line}`, role: 'student', departmentName: 'Spedition',
          })),
          failed: [],
        })
      }),
    )
    renderPage()
    await upload(bulkCsv(total))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    fireEvent.click(await screen.findByRole('button', { name: `${total} Konten anlegen` }))
    expect(await screen.findByText(/Der Server ist gerade nicht erreichbar/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${BULK_CHUNK_SIZE}`), { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nicht angelegte Zeilen als CSV/ })).toBeInTheDocument()
    expect(screen.getByText('Hafen-Kran-Birke-2')).toBeInTheDocument()
  })

  it('Zeilen, die beim Anlegen scheitern, erscheinen mit Begründung', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/preview')
          ? jsonResponse({ rows: [previewRow(2), previewRow(3)] })
          : jsonResponse({
              created: [{ line: 2, name: 'Person 2', email: 'p2@example.de', password: 'Hafen-Kran-Birke-2', role: 'student', departmentName: 'Spedition' }],
              failed: [{ line: 3, name: 'Person 3', email: 'p3@example.de', reason: 'Konto existiert inzwischen schon.' }],
            }),
      ),
    )
    renderPage()
    await upload(bulkCsv(2))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    fireEvent.click(await screen.findByRole('button', { name: '2 Konten anlegen' }))
    expect(await screen.findByText(/Konto existiert inzwischen schon/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nicht angelegte Zeilen als CSV/ })).toBeInTheDocument()
  })

  it('Verlassen mit Zugangsdaten fragt nach; erst „Verwerfen“ geht zur Nutzerliste', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/preview')
          ? jsonResponse({ rows: [previewRow(2)] })
          : jsonResponse({
              created: [{ line: 2, name: 'Person 2', email: 'p2@example.de', password: 'Hafen-Kran-Birke-2', role: 'student', departmentName: 'Spedition' }],
              failed: [],
            }),
      ),
    )
    renderPage()
    await upload(bulkCsv(1))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    fireEvent.click(await screen.findByRole('button', { name: '1 Konto anlegen' }))
    await screen.findByText('Hafen-Kran-Birke-2')

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Zugangsdaten wirklich verwerfen?')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Zurück zu den Zugangsdaten' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByText('Hafen-Kran-Birke-2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Verwerfen und schließen' }))
    expect(push).toHaveBeenCalledWith('/admin/users')
  })

  it('warnt beim Neuladen, solange Passwörter nur hier stehen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/preview')
          ? jsonResponse({ rows: [previewRow(2)] })
          : jsonResponse({
              created: [{ line: 2, name: 'Person 2', email: 'p2@example.de', password: 'Hafen-Kran-Birke-2', role: 'student', departmentName: 'Spedition' }],
              failed: [],
            }),
      ),
    )
    renderPage()
    await upload(bulkCsv(1))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    fireEvent.click(await screen.findByRole('button', { name: '1 Konto anlegen' }))
    await screen.findByText('Hafen-Kran-Birke-2')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ohne angelegte Konten geht „Zur Nutzerliste“ sofort', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Zur Nutzerliste/ }))
    expect(push).toHaveBeenCalledWith('/admin/users')
  })

  it('zeigt, was erkannt wurde, und meldet nicht verwendete Spalten (BUG-3)', async () => {
    renderPage()
    await upload('Name;E-Mail;Abteilung;Art\nAnna;a@example.de;Spedition;Lehrkraft')
    expect(screen.getByText(/Erkannt: Name = Name · E-Mail = E-Mail · Bereich = – · Rolle = –/)).toBeInTheDocument()
    expect(screen.getByText(/Nicht verwendet: Abteilung, Art/)).toBeInTheDocument()
  })

  it('„Spalten anpassen“ öffnet die Zuordnung auch bei erkannten Spalten (BUG-3)', async () => {
    renderPage()
    await upload('Name;E-Mail;Abteilung;Art\nAnna;a@example.de;Spedition;Lehrkraft')
    expect(screen.queryByLabelText(/Spalte für den Bereich/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Spalten anpassen' }))
    expect(screen.getByLabelText(/Spalte für den Bereich/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Spalte für die Rolle/)).toBeInTheDocument()
    expect(screen.queryByText(/nicht eindeutig erkannt/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Zuordnung übernehmen' }))
    expect(screen.queryByLabelText(/Spalte für den Bereich/)).not.toBeInTheDocument()
  })

  it('Kopfzeile umschalten: die Person in Zeile 1 geht nicht stillschweigend verloren (BUG-8)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ rows: [previewRow(1), previewRow(2)] }))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    await upload('Anna Azubi;;Spedition\nBen Berger;ben@example.de;Spedition')
    expect(screen.getByText(/1 Zeilen gelesen/)).toBeInTheDocument()
    const toggle = screen.getByRole('switch', { name: /Erste Zeile ist die Kopfzeile/ })
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    expect(await screen.findByText(/2 Zeilen gelesen/)).toBeInTheDocument()
    // Ohne Kopfzeile sind die Spalten „Spalte 1…“: die E-Mail-Spalte wird erkannt, die Person in Zeile 1 steht dabei
    expect(screen.getByText(/E-Mail = Spalte 2/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    await screen.findByText('Person 1')
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.rows.map((r: { line: number }) => r.line)).toEqual([1, 2])
  })

  it('Umschalten, das die Grenze von 300 Zeilen überschreitet, meldet es und lässt alles beim Alten (BUG-8)', async () => {
    renderPage()
    await upload(bulkCsv(300)) // 300 Datensätze + Kopfzeile
    fireEvent.click(screen.getByRole('switch', { name: /Erste Zeile ist die Kopfzeile/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('in mehrere Dateien')
    expect(screen.getByRole('switch', { name: /Erste Zeile ist die Kopfzeile/ })).toBeChecked()
  })

  it('Zeilennummern in der Vorschau sind die Zeilen der Datei, auch nach Leerzeilen (BUG-6)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ rows: [previewRow(2), previewRow(5)] }))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    await upload('Name;E-Mail\nAnna;a@example.de\n\n\nBen;b@example.de')
    fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
    await screen.findByText('Person 5')
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.rows.map((r: { line: number }) => r.line)).toEqual([2, 5])
  })

  it('Klick auf einen Link im Rahmen fragt nach, solange Zugangsdaten offen sind (BUG-2)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/preview')
          ? jsonResponse({ rows: [previewRow(2)] })
          : jsonResponse({
              created: [{ line: 2, name: 'Person 2', email: 'p2@example.de', password: 'Hafen-Kran-Birke-2', role: 'student', departmentName: 'Spedition' }],
              failed: [],
            }),
      ),
    )
    // Ein Link „in der Seitenleiste“, außerhalb der Komponente
    const sidebarLink = document.createElement('a')
    sidebarLink.href = '/admin/leistungsnachweise'
    sidebarLink.textContent = 'Nachweise'
    document.body.appendChild(sidebarLink)
    try {
      renderPage()
      await upload(bulkCsv(1))
      fireEvent.click(screen.getByRole('button', { name: 'Weiter zur Vorschau' }))
      fireEvent.click(await screen.findByRole('button', { name: '1 Konto anlegen' }))
      await screen.findByText('Hafen-Kran-Birke-2')

      const clicked = fireEvent.click(sidebarLink)
      expect(clicked).toBe(false) // preventDefault: der Browser (und Next) wechselt die Seite nicht
      const dialog = await screen.findByRole('alertdialog')
      expect(within(dialog).getByText('Zugangsdaten wirklich verwerfen?')).toBeInTheDocument()
      expect(push).not.toHaveBeenCalled()

      fireEvent.click(within(dialog).getByRole('button', { name: 'Verwerfen und schließen' }))
      expect(push).toHaveBeenCalledWith('/admin/leistungsnachweise')
    } finally {
      sidebarLink.remove()
    }
  })

  it('Links werden vorher nicht abgefangen, Neuladen-Links und neue Tabs nie (BUG-2)', async () => {
    const link = document.createElement('a')
    link.href = '/admin/leistungsnachweise'
    document.body.appendChild(link)
    try {
      renderPage()
      // Noch keine Zugangsdaten: nichts wird abgefangen
      expect(fireEvent.click(link)).toBe(true)
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    } finally {
      link.remove()
    }
  })

  it('bietet nur aktive Bereiche an (BUG-5)', async () => {
    render(
      <AdminRoleProvider
        value={{
          role: 'admin',
          isSuperAdmin: true,
          scope: {
            current: 'd2',
            departments: [
              { id: 'd1', name: 'Spedition', code: 'SPED', isActive: true },
              { id: 'd2', name: 'Alt-Bereich', code: 'ALT', isActive: false },
              { id: 'd3', name: 'Tourismus', code: 'TOUR', isActive: true },
            ],
          },
        }}
      >
        <BulkAccountImport />
      </AdminRoleProvider>,
    )
    await upload(bulkCsv(1))
    // Der gerade gewählte Bereich ist inaktiv: nicht vorausgewählt, die Vorschau bleibt gesperrt
    expect(screen.getByRole('button', { name: 'Weiter zur Vorschau' })).toBeDisabled()
    // Radix Select braucht in jsdom diese Browser-Funktionen
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
    window.HTMLElement.prototype.releasePointerCapture = vi.fn()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: /Bereich für alle Zeilen/ }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    })
    expect(await screen.findByRole('option', { name: 'Spedition' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Tourismus' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Alt-Bereich' })).not.toBeInTheDocument()
  })
})

