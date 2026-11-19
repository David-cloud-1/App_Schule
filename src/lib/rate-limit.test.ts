import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const rpc = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ rpc })) }))

import { checkRateLimit, rateLimitPolicy } from './rate-limit'

describe('rateLimitPolicy', () => {
  it('begrenzt schreibende API-Aufrufe normal', () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) {
      expect(rateLimitPolicy(m, '/api/question-reports')).toEqual({ bucket: 'schreiben', max: 120, windowSeconds: 60 })
    }
  })

  it('lässt Lesezugriffe, Seiten, Zeitpläne und interne Arbeiter aus', () => {
    expect(rateLimitPolicy('GET', '/api/admin/users')).toBeNull()
    expect(rateLimitPolicy('POST', '/admin/kalender')).toBeNull()
    expect(rateLimitPolicy('POST', '/api/cron/werkzeugkiste-aufraeumen')).toBeNull()
    expect(rateLimitPolicy('POST', '/api/intern/werkzeugkiste/teil')).toBeNull()
  })

  it('setzt für KI- und Einlese-Wege die knappe Grenze', () => {
    for (const path of [
      '/api/admin/ai-generate/upload',
      '/api/admin/exam-sets/extract',
      '/api/admin/werkzeugkiste/ablaeufe/abc/einlesen',
      '/api/admin/werkzeugkiste/ablaeufe/abc/direkt',
      '/api/admin/werkzeugkiste/ablaeufe/abc/weiterschreiben',
      '/api/admin/werkzeugkiste/ablaeufe/abc/fortsetzung',
    ]) {
      expect(rateLimitPolicy('POST', path)).toEqual({ bucket: 'teuer', max: 20, windowSeconds: 600 })
    }
  })

  it('behandelt ähnlich benannte Pfade nicht als teuer', () => {
    expect(rateLimitPolicy('POST', '/api/admin/ai-generate/drafts/bulk-accept')?.bucket).toBe('schreiben')
    expect(rateLimitPolicy('POST', '/api/admin/exam-sets/import')?.bucket).toBe('schreiben')
  })
})

describe('checkRateLimit', () => {
  const policy = { bucket: 'schreiben', max: 120, windowSeconds: 60 } as const

  beforeEach(() => {
    rpc.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://db.test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
  })
  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('zählt je Person und Kategorie', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, retry_after: 30 }], error: null })
    expect(await checkRateLimit('u1', policy)).toEqual({ allowed: true })
    expect(rpc).toHaveBeenCalledWith('rate_limit_hit', { p_key: 'u1:schreiben', p_max: 120, p_window_seconds: 60 })
  })

  it('sperrt mit Wartezeit, wenn das Limit erreicht ist', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, retry_after: 42 }], error: null })
    expect(await checkRateLimit('u1', policy)).toEqual({ allowed: false, retryAfter: 42 })
  })

  it('lässt durch, wenn Funktion fehlt, Datenbank scheitert oder Antwort unbrauchbar ist', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function not found' } })
    expect((await checkRateLimit('u1', policy)).allowed).toBe(true)
    rpc.mockRejectedValue(new Error('netz'))
    expect((await checkRateLimit('u1', policy)).allowed).toBe(true)
    rpc.mockResolvedValue({ data: [], error: null })
    expect((await checkRateLimit('u1', policy)).allowed).toBe(true)
  })

  it('lässt durch, wenn kein Service-Schlüssel gesetzt ist', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await checkRateLimit('u1', policy)).allowed).toBe(true)
    expect(rpc).not.toHaveBeenCalled()
  })
})
