import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chainMock, type ChainResolver } from '@/test/supabase-chain-mock'

vi.mock('@/app/api/admin/_lib/auth', () => ({ requireTeacherOrAdmin: vi.fn() }))
vi.mock('@/lib/supabase-server', () => ({ createServiceClient: vi.fn() }))

import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { POST as neuerAblauf } from './ablaeufe/route'
import { PATCH as ablaufSpeichern } from './ablaeufe/[id]/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = { params: Promise.resolve({ id: ID }) }

const BASIS_ZEILE = {
  id: ID,
  owner_id: 'u1',
  werkzeug: 'youtube',
  status: 'laeuft',
  schritt: 1,
  datei_name: null,
  datei_groesse: null,
  kennzahlen: null,
  gliederung: [],
  auswahl: { seiten: '', abschnitte: [] },
  einstellungen: { format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' },
  prompt: null,
  antwort: null,
  pruefung: null,
  ergebnis: null,
  updated_at: '2026-10-28T08:00:00Z',
}

let zeile: Record<string, unknown> | null
let db: ReturnType<typeof chainMock>
let speicher: Record<string, ReturnType<typeof vi.fn>>
let kernFetch: ReturnType<typeof vi.fn>

function anmelden(resolver?: ChainResolver) {
  db = chainMock(
    resolver ??
      ((_table, calls) => {
        const methods = calls.map((c) => c.method)
        if (methods.includes('update')) {
          const upd = calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>
          zeile = zeile ? { ...zeile, ...upd } : null
          return { data: zeile }
        }
        if (methods.includes('delete')) return { data: null }
        return { data: zeile, count: 0 }
      }),
  )
  vi.mocked(requireTeacherOrAdmin).mockResolvedValue({
    error: null,
    user: { id: 'u1', email: 'l@schule.de' },
    supabase: db.client,
    role: 'teacher',
    isSuperAdmin: false,
    isDepartmentAdmin: false,
    suggestedDepartmentId: null,
  } as never)
}

function json(body: unknown, method = 'POST') {
  return new Request('http://test.local', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  zeile = { ...BASIS_ZEILE }
  speicher = {
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/lesen?token=t' } }),
    createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://speicher.test/schreiben?token=t' } }),
    list: vi.fn().mockResolvedValue({ data: [{ name: 'skript.pdf' }, { name: 'einlesung.zip' }] }),
    remove: vi.fn().mockResolvedValue({ data: [] }),
    download: vi.fn().mockResolvedValue({ data: new Blob(['<html>Vorschau</html>']), error: null }),
  }
  vi.mocked(createServiceClient).mockReturnValue({ storage: { from: () => speicher } } as never)
  kernFetch = vi.fn()
  vi.stubGlobal('fetch', kernFetch)
  vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
  vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
  anmelden()
})

function kernAntwort(body: unknown, status = 200) {
  kernFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

describe('Video-Fragen: Ablauf anlegen (PROJ-54, Paket D)', () => {
  const transkript = 'Der Spediteur haftet nach dem HGB für Schäden am Gut. '.repeat(5)
  const video = { url: 'https://www.youtube.com/watch?v=abc', transkript }

  it('legt den Ablauf an, lässt den Kern das Transkript ablegen und speichert die Kennzahlen', async () => {
    kernAntwort({ zeichen: transkript.trim().length })
    const res = await neuerAblauf(json({ werkzeug: 'youtube', video }))
    expect(res.status).toBe(201)
    const url = kernFetch.mock.calls[0][0] as string
    expect(url).toBe('https://kern.test/api/einlesen-video')
    const gesendet = JSON.parse((kernFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(gesendet).toMatchObject({ transkript, url: video.url })
    expect(gesendet.einlesung_ziel.url).toContain('schreiben')
    expect(speicher.createSignedUploadUrl).toHaveBeenCalledWith(`u1/${ID}/einlesung.zip`, { upsert: true })
    const update = db.writes.find((w) => w.method === 'update')!.payload as Record<string, unknown>
    expect(update.kennzahlen).toMatchObject({ zeichen: transkript.trim().length, videoUrl: video.url })
    const insert = db.writes.find((w) => w.method === 'insert')!.payload as Record<string, unknown>
    expect(insert.werkzeug).toBe('youtube')
    expect(insert).not.toHaveProperty('datei_name')
    expect((await res.json()).ablauf.id).toBe(ID)
  })

  it('der Link ist freiwillig', async () => {
    kernAntwort({ zeichen: 10 })
    const res = await neuerAblauf(json({ werkzeug: 'youtube', video: { url: '', transkript } }))
    expect(res.status).toBe(201)
    const update = db.writes.find((w) => w.method === 'update')!.payload as { kennzahlen: Record<string, unknown> }
    expect(update.kennzahlen).not.toHaveProperty('videoUrl')
  })

  it('weist ein zu kurzes Transkript und einen Link ohne Web-Adresse mit verständlichem Satz ab', async () => {
    const kurz = await neuerAblauf(json({ werkzeug: 'youtube', video: { url: '', transkript: 'zu kurz' } }))
    expect(kurz.status).toBe(400)
    expect((await kurz.json()).error).toMatch(/Transkript/)
    const link = await neuerAblauf(json({ werkzeug: 'youtube', video: { url: 'javascript:alert(1)', transkript } }))
    expect(link.status).toBe(400)
    expect((await link.json()).error).toMatch(/Link/)
    expect(kernFetch).not.toHaveBeenCalled()
    expect(db.writes).toHaveLength(0)
  })

  it('Video-Fragen gehen nicht mit einer Datei, ein Skript-Werkzeug nicht mit einem Transkript', async () => {
    const r1 = await neuerAblauf(json({ werkzeug: 'youtube', datei: { name: 'a.pdf', groesse: 10, typ: '' } }))
    expect(r1.status).toBe(400)
    expect((await r1.json()).error).toMatch(/Video-Transkript/)
    const r2 = await neuerAblauf(json({ werkzeug: 'skript', video }))
    expect(r2.status).toBe(400)
    expect(db.writes).toHaveLength(0)
  })

  it('räumt auf und meldet verständlich, wenn der Kern das Transkript ablehnt', async () => {
    kernAntwort({ error: 'Bitte das Transkript des Videos einfügen.', hint: 'In YouTube …' }, 400)
    const res = await neuerAblauf(json({ werkzeug: 'youtube', video }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Transkript/)
    expect(db.writes.some((w) => w.method === 'delete')).toBe(true)
    expect(speicher.remove).toHaveBeenCalled()
  })

  it('PATCH: kein Wechsel zwischen Video-Fragen und Skript-Werkzeugen', async () => {
    const hin = await ablaufSpeichern(json({ werkzeug: 'skript' }, 'PATCH'), ctx)
    expect(hin.status).toBe(400)
    expect((await hin.json()).error).toMatch(/Video-Fragen/)
    zeile = { ...BASIS_ZEILE, werkzeug: 'skript', datei_name: 'heft.pdf' }
    expect((await ablaufSpeichern(json({ werkzeug: 'youtube' }, 'PATCH'), ctx)).status).toBe(400)
    expect((await ablaufSpeichern(json({ werkzeug: 'kahoot' }, 'PATCH'), ctx)).status).toBe(200)
  })

  it('PATCH: Einstellungen von Video-Fragen bleiben erhalten', async () => {
    const einst = { format: 'quiz', niveau: 'schwer', bildungsgang: 'auto', lernfeld: '', umfang: '', anzahl: '8', types: 'mc,open', videolen: '8:30' }
    const res = await ablaufSpeichern(json({ einstellungen: einst }, 'PATCH'), ctx)
    expect(res.status).toBe(200)
    const upd = db.writes.find((w) => w.method === 'update')!.payload as { einstellungen: Record<string, string> }
    expect(upd.einstellungen).toMatchObject({ format: 'quiz', anzahl: '8', types: 'mc,open', videolen: '8:30' })
  })
})
