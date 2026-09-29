import { describe, expect, it } from 'vitest'
import { chainMock, eqValue, hasCall } from '@/test/supabase-chain-mock'
import { normalizeHost, pickDepartment, resolveDepartment, toBranding, mapDepartment } from './departments'

function row(id: string, domain: string | null, sort_order: number) {
  return {
    id, code: id.toUpperCase(), slug: id, domain, name: `Name ${id}`, app_name: `App ${id}`, tagline: 't',
    meta_title: 'm', meta_description: 'd', icon_name: 'Truck', currency_name: 'Münzen', hof_name: 'Hof',
    prompt_role: 'Rolle', target_group: 'Zielgruppe', prompt_notes: null, class_levels: [10, 11, 12],
    pseudonym_nouns: ['Frachter'], sort_order, is_active: true,
  }
}
const DEPARTMENTS = [row('sped', 'spedilern.vercel.app', 1), row('tour', 'touristiklern.vercel.app', 2)]

/** Datenbank-Ersatz: departments nach id/domain, profiles mit festem Bereich */
function db(profileDepartment: string | null) {
  return chainMock((table, calls) => {
    if (table === 'profiles') return { data: { department_id: profileDepartment } }
    if (table !== 'departments') return {}
    const id = eqValue(calls, 'id')
    const domain = eqValue(calls, 'domain')
    if (id !== undefined) return { data: DEPARTMENTS.find((d) => d.id === id) ?? null }
    if (domain !== undefined) return { data: DEPARTMENTS.find((d) => d.domain === domain) ?? null }
    // Rückfall: erster nach sort_order
    return { data: hasCall(calls, 'order') ? DEPARTMENTS[0] : null }
  }).client
}

describe('normalizeHost', () => {
  it.each([
    ['TouristikLern.Vercel.app', 'touristiklern.vercel.app'],
    ['localhost:3000', 'localhost'],
    ['a.example.com, proxy.internal', 'a.example.com'],
    ['', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected)
  })
})

describe('resolveDepartment', () => {
  it('nimmt vor dem Login den Bereich der aufgerufenen Adresse', async () => {
    const d = await resolveDepartment(db(null), { userId: null, host: 'touristiklern.vercel.app' })
    expect(d?.id).toBe('tour')
  })

  it('nimmt für unbekannte Adressen (Vorschau, localhost) den Rückfall-Bereich', async () => {
    const d = await resolveDepartment(db(null), { userId: null, host: 'spedilern-git-main.vercel.app' })
    expect(d?.id).toBe('sped')
  })

  it('nimmt nach dem Login den Bereich aus dem Profil — auch auf der Adresse eines anderen Bereichs', async () => {
    const d = await resolveDepartment(db('tour'), { userId: 'u1', host: 'spedilern.vercel.app' })
    expect(d?.id).toBe('tour')
  })

  it('fällt für Profile ohne Bereich auf den Rückfall-Bereich zurück', async () => {
    const d = await resolveDepartment(db(null), { userId: 'u1', host: 'touristiklern.vercel.app' })
    expect(d?.id).toBe('sped')
  })
})

describe('toBranding', () => {
  it('gibt keine Prompt-Texte oder Wortlisten an den Browser weiter', () => {
    const branding = toBranding(mapDepartment(DEPARTMENTS[0]))
    expect(branding).not.toHaveProperty('promptRole')
    expect(branding).not.toHaveProperty('pseudonymNouns')
    expect(branding).toMatchObject({ appName: 'App sped', currencyName: 'Münzen', hofName: 'Hof' })
  })
})

describe('pickDepartment (zwischengespeicherte Liste, ohne Datenbank)', () => {
  const list = DEPARTMENTS.map(mapDepartment)

  it('nimmt nach dem Login den Bereich aus dem Profil', () => {
    expect(pickDepartment(list, { departmentId: 'tour', host: null })?.id).toBe('tour')
  })

  it('nimmt vor dem Login den Bereich der Adresse', () => {
    expect(pickDepartment(list, { departmentId: null, host: 'TouristikLern.vercel.app' })?.id).toBe('tour')
  })

  it('fällt bei unbekannter Adresse oder unbekanntem Profil-Bereich auf den ersten Bereich zurück', () => {
    expect(pickDepartment(list, { departmentId: null, host: 'preview-xyz.vercel.app' })?.id).toBe('sped')
    expect(pickDepartment(list, { departmentId: 'geloescht', host: 'touristiklern.vercel.app' })?.id).toBe('sped')
  })

  it('liefert null, wenn keine Bereiche geladen werden konnten', () => {
    expect(pickDepartment([], { departmentId: null, host: 'spedilern.vercel.app' })).toBeNull()
  })
})
