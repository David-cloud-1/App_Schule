import { describe, it, expect } from 'vitest'
import {
  forumErrorStatus,
  formatForumBadge,
  hideInputSchema,
  listQuerySchema,
  postInputSchema,
  reportInputSchema,
  replyInputSchema,
  solutionInputSchema,
} from './forum'

const ID = '11111111-1111-4111-8111-111111111111'

describe('postInputSchema', () => {
  const ok = { category: 'tipp', title: 'Ein guter Titel', body: 'Ein ausreichend langer Text.' }

  it('akzeptiert einen gültigen Beitrag und kürzt Leerraum', () => {
    const r = postInputSchema.safeParse({ ...ok, title: '  Ein guter Titel  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.title).toBe('Ein guter Titel')
  })

  it('lehnt zu kurzen Titel und Text sowie falsche Kategorie ab', () => {
    expect(postInputSchema.safeParse({ ...ok, title: 'Hi' }).success).toBe(false)
    expect(postInputSchema.safeParse({ ...ok, body: 'kurz' }).success).toBe(false)
    expect(postInputSchema.safeParse({ ...ok, category: 'witz' }).success).toBe(false)
  })

  it('zählt Leerzeichen nicht mit', () => {
    expect(postInputSchema.safeParse({ ...ok, title: '     a     ' }).success).toBe(false)
  })

  it('erzwingt die Obergrenzen (120 / 5000 Zeichen)', () => {
    expect(postInputSchema.safeParse({ ...ok, title: 'x'.repeat(121) }).success).toBe(false)
    expect(postInputSchema.safeParse({ ...ok, title: 'x'.repeat(120) }).success).toBe(true)
    expect(postInputSchema.safeParse({ ...ok, body: 'x'.repeat(5001) }).success).toBe(false)
    expect(postInputSchema.safeParse({ ...ok, body: 'x'.repeat(5000) }).success).toBe(true)
  })

  it('verlangt gültige Kennungen für Fachbereich und Fach, erlaubt null', () => {
    expect(postInputSchema.safeParse({ ...ok, department_id: 'abc' }).success).toBe(false)
    expect(postInputSchema.safeParse({ ...ok, department_id: ID, subject_id: null }).success).toBe(true)
  })
})

describe('replyInputSchema', () => {
  it('braucht 1 bis 3000 Zeichen', () => {
    expect(replyInputSchema.safeParse({ body: '   ' }).success).toBe(false)
    expect(replyInputSchema.safeParse({ body: 'Danke!' }).success).toBe(true)
    expect(replyInputSchema.safeParse({ body: 'x'.repeat(3001) }).success).toBe(false)
  })
})

describe('listQuerySchema', () => {
  it('setzt Standardwerte', () => {
    const r = listQuerySchema.parse({})
    expect(r.sort).toBe('activity')
    expect(r.offset).toBe(0)
    expect(r.only_open).toBe(false)
    expect(r.mine).toBe(false)
  })

  it('liest Filter aus der URL', () => {
    const r = listQuerySchema.parse({ category: 'frage', only_open: '1', mine: 'true', sort: 'helpful', offset: '20', q: ' Frachtbrief ' })
    expect(r).toMatchObject({ category: 'frage', only_open: true, mine: true, sort: 'helpful', offset: 20, q: 'Frachtbrief' })
  })

  it('lehnt unbekannte Sortierung und negativen Offset ab', () => {
    expect(listQuerySchema.safeParse({ sort: 'zufall' }).success).toBe(false)
    expect(listQuerySchema.safeParse({ offset: '-1' }).success).toBe(false)
  })
})

describe('Melden, Ausblenden, Lösung', () => {
  it('Meldung braucht Ziel und Grund, Hinweis höchstens 300 Zeichen', () => {
    const base = { target_type: 'post', target_id: ID, reason: 'unpassend' }
    expect(reportInputSchema.safeParse(base).success).toBe(true)
    expect(reportInputSchema.safeParse({ ...base, reason: 'doof' }).success).toBe(false)
    expect(reportInputSchema.safeParse({ ...base, note: 'x'.repeat(301) }).success).toBe(false)
    expect(reportInputSchema.safeParse({ ...base, target_type: 'forum' }).success).toBe(false)
  })

  it('Ausblenden braucht ein boolesches „hidden“', () => {
    expect(hideInputSchema.safeParse({ target_type: 'reply', target_id: ID, hidden: true }).success).toBe(true)
    expect(hideInputSchema.safeParse({ target_type: 'reply', target_id: ID }).success).toBe(false)
  })

  it('Lösung: Kennung oder null zum Zurücknehmen', () => {
    expect(solutionInputSchema.safeParse({ reply_id: ID }).success).toBe(true)
    expect(solutionInputSchema.safeParse({ reply_id: null }).success).toBe(true)
    expect(solutionInputSchema.safeParse({}).success).toBe(false)
  })
})

describe('forumErrorStatus', () => {
  it('übersetzt die Fehlercodes der Datenbank', () => {
    expect(forumErrorStatus('FRM01')).toBe(429)
    expect(forumErrorStatus('FRM02')).toBe(404)
    expect(forumErrorStatus('FRM03')).toBe(403)
    expect(forumErrorStatus('FRM04')).toBe(400)
    expect(forumErrorStatus('FRM05')).toBe(409)
  })

  it('kennt fremde Codes nicht', () => {
    expect(forumErrorStatus('23505')).toBeNull()
    expect(forumErrorStatus(undefined)).toBeNull()
  })
})

describe('formatForumBadge', () => {
  it('zeigt nichts bei 0, die Zahl bis 9 und „9+“ ab 10', () => {
    expect(formatForumBadge(0)).toBeNull()
    expect(formatForumBadge(-3)).toBeNull()
    expect(formatForumBadge(3)).toBe('3')
    expect(formatForumBadge(9)).toBe('9')
    expect(formatForumBadge(10)).toBe('9+')
    expect(formatForumBadge(250)).toBe('9+')
  })
})
