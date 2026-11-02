import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (f: () => unknown) => void f() }))

import { createServiceClient } from '@/lib/supabase-server'
import { linkBremseZuruecksetzen } from '@/lib/werkzeugkiste-links-server'
import { GET } from './route'

const CODE = 'ab12'.repeat(12)
const OWNER = '11111111-1111-4111-8111-111111111111'
const ABLAUF = '22222222-2222-4222-8222-222222222222'
const ctx = (code: string) => ({ params: Promise.resolve({ code }) })
const anfrage = (ip = '1.2.3.4') => new Request(`http://localhost/s/${CODE}`, { headers: { 'x-forwarded-for': ip } })

let rpc: ReturnType<typeof vi.fn>
let signedUrl: ReturnType<typeof vi.fn>

function dienst(opts: { zeile?: unknown; rpcFehler?: boolean; adresse?: string | null } = {}) {
  rpc = vi.fn((name: string) => {
    if (name === 'link_nachschlagen') {
      return Promise.resolve(opts.rpcFehler ? { data: null, error: { message: 'x' } } : { data: opts.zeile === undefined ? [{ ablauf_id: ABLAUF, owner_id: OWNER, titel: 'T' }] : opts.zeile, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
  signedUrl = vi.fn(() => Promise.resolve({ data: opts.adresse === null ? null : { signedUrl: opts.adresse ?? 'https://speicher.test/x' } }))
  vi.mocked(createServiceClient).mockReturnValue({ rpc, storage: { from: () => ({ createSignedUrl: signedUrl }) } } as never)
}

beforeEach(() => {
  vi.restoreAllMocks()
  linkBremseZuruecksetzen()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<html>Seite</html>', { status: 200 }))))
})

describe('GET /s/:code (PROJ-67)', () => {
  it('liefert die Seite ohne Anmeldung, in der Sandbox, ohne Zwischenspeicher', async () => {
    dienst()
    const res = await GET(anfrage(), ctx(CODE))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<html>Seite</html>')
    expect(res.headers.get('Content-Type')).toContain('text/html')
    expect(res.headers.get('Content-Security-Policy')).toContain('sandbox allow-scripts allow-modals')
    expect(res.headers.get('Content-Security-Policy')).not.toContain('allow-same-origin')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(res.headers.get('X-Robots-Tag')).toContain('noindex')
  })

  it('schlägt den Code nach und holt die Datei des richtigen Besitzers', async () => {
    dienst()
    await GET(anfrage(), ctx(CODE))
    expect(rpc).toHaveBeenCalledWith('link_nachschlagen', { p_code: CODE })
    expect(signedUrl).toHaveBeenCalledWith(`${OWNER}/${ABLAUF}/ausgabe`, expect.any(Number))
  })

  it('zählt den Aufruf, ohne Besucherdaten zu übergeben', async () => {
    dienst()
    await GET(anfrage('8.8.8.8'), ctx(CODE))
    expect(rpc).toHaveBeenCalledWith('link_aufruf_zaehlen', { p_code: CODE })
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('8.8.8.8')
  })

  it('antwortet bei ungültigem Code gleich, ohne die Datenbank zu fragen', async () => {
    dienst()
    for (const code of ['kurz', 'A'.repeat(48), `${CODE}0`, '../etc/passwd']) {
      const res = await GET(anfrage(), ctx(code))
      expect(res.status).toBe(404)
      expect(await res.text()).toContain('Dieser Link ist nicht mehr aktiv.')
    }
    expect(rpc).not.toHaveBeenCalled()
  })

  it('antwortet bei abgeschaltetem oder unbekanntem Link mit 404 und zählt nicht', async () => {
    dienst({ zeile: [] })
    const res = await GET(anfrage(), ctx(CODE))
    expect(res.status).toBe(404)
    expect(rpc).not.toHaveBeenCalledWith('link_aufruf_zaehlen', expect.anything())
  })

  it('sieht bei Datenbankfehler wie ein ungültiger Link aus (kein technischer Text)', async () => {
    dienst({ rpcFehler: true })
    const res = await GET(anfrage(), ctx(CODE))
    expect(res.status).toBe(404)
    const html = await res.text()
    expect(html).toContain('nicht mehr aktiv')
    expect(html).not.toMatch(/Fehler|supabase|Datenbank/i)
  })

  it('meldet 404, wenn die Datei im Speicher fehlt, und zählt nicht', async () => {
    dienst({ adresse: null })
    expect((await GET(anfrage(), ctx(CODE))).status).toBe(404)
    dienst()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('nein', { status: 400 }))))
    expect((await GET(anfrage(), ctx(CODE))).status).toBe(404)
    expect(rpc).not.toHaveBeenCalledWith('link_aufruf_zaehlen', expect.anything())
  })

  it('bremst einen Ansturm von einer Quelle mit 429', async () => {
    dienst()
    let letzte = 200
    for (let i = 0; i < 70; i++) letzte = (await GET(anfrage('7.7.7.7'), ctx(CODE))).status
    expect(letzte).toBe(429)
    expect((await GET(anfrage('7.7.7.8'), ctx(CODE))).status).toBe(200)
  })
})
