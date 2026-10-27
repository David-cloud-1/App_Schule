import { describe, it, expect } from 'vitest'
import {
  defaultDir,
  matchesActivity,
  parseUserListParams,
  sortUsers,
  userListParams,
  type UserListRow,
} from './user-list'

function row(name: string | null, extra: Partial<UserListRow> = {}): UserListRow & { id: string } {
  return {
    id: name ?? 'leer',
    display_name: name,
    email: name ? `${name.toLowerCase()}@example.de` : null,
    department_name: null,
    total_xp: 0,
    current_streak: 0,
    last_session_date: null,
    last_sign_in_at: null,
    banned: false,
    ...extra,
  }
}

const names = (rows: { display_name: string | null }[]) => rows.map((r) => r.display_name)

describe('sortUsers (PROJ-57)', () => {
  it('sortiert Namen deutsch: Umlaute richtig, Groß/Klein egal', () => {
    const rows = [row('Zoe'), row('Ömer'), row('anna'), row('Otto'), row('Bert')]
    expect(names(sortUsers(rows, 'name', 'asc'))).toEqual(['anna', 'Bert', 'Ömer', 'Otto', 'Zoe'])
  })

  it('dreht die Richtung um', () => {
    const rows = [row('A', { total_xp: 5 }), row('B', { total_xp: 50 }), row('C', { total_xp: 20 })]
    expect(names(sortUsers(rows, 'xp', 'desc'))).toEqual(['B', 'C', 'A'])
    expect(names(sortUsers(rows, 'xp', 'asc'))).toEqual(['A', 'C', 'B'])
  })

  it('stellt leere Werte in beiden Richtungen ans Ende', () => {
    const rows = [
      row('Ohne'),
      row('Alt', { last_sign_in_at: '2026-01-01T10:00:00Z' }),
      row('Neu', { last_sign_in_at: '2026-10-01T10:00:00Z' }),
    ]
    expect(names(sortUsers(rows, 'login', 'desc'))).toEqual(['Neu', 'Alt', 'Ohne'])
    expect(names(sortUsers(rows, 'login', 'asc'))).toEqual(['Alt', 'Neu', 'Ohne'])
  })

  it('setzt Konten ohne Namen und ohne Bereich ans Ende', () => {
    const rows = [row(null), row('Berta', { department_name: 'Tourismus' }), row('Anton', { department_name: 'Spedition' })]
    expect(names(sortUsers(rows, 'name', 'desc'))).toEqual(['Berta', 'Anton', null])
    expect(names(sortUsers([row('Ohne'), ...rows.slice(1)], 'department', 'asc'))).toEqual(['Anton', 'Berta', 'Ohne'])
  })

  it('entscheidet Gleichstand nach Name A→Z, auch bei absteigender Sortierung', () => {
    const rows = [row('Carla', { current_streak: 3 }), row('Anna', { current_streak: 3 }), row('Bea', { current_streak: 9 })]
    expect(names(sortUsers(rows, 'streak', 'desc'))).toEqual(['Bea', 'Anna', 'Carla'])
  })

  it('Status: Aktiv vor Gesperrt', () => {
    const rows = [row('Gesperrt', { banned: true }), row('Aktiv')]
    expect(names(sortUsers(rows, 'status', 'asc'))).toEqual(['Aktiv', 'Gesperrt'])
  })

  it('verändert die Eingabe nicht', () => {
    const rows = [row('B'), row('A')]
    sortUsers(rows, 'name', 'asc')
    expect(names(rows)).toEqual(['B', 'A'])
  })

  it('erste Richtung: Texte aufsteigend, Zahlen/Daten absteigend', () => {
    expect(defaultDir('name')).toBe('asc')
    expect(defaultDir('status')).toBe('asc')
    expect(defaultDir('xp')).toBe('desc')
    expect(defaultDir('login')).toBe('desc')
  })
})

describe('matchesActivity (PROJ-57)', () => {
  // 27.10.2026, 00:30 in Berlin (= 26.10. 23:30 UTC, Sommerzeit endet erst am 25.10.)
  const now = new Date('2026-10-26T23:30:00Z')

  it('„Seit 7 Tagen inaktiv“ zählt Kalendertage in Berliner Zeit', () => {
    expect(matchesActivity(row('A', { last_session_date: '2026-10-20' }), '7', now)).toBe(false) // 7 Tage
    expect(matchesActivity(row('A', { last_session_date: '2026-10-19' }), '7', now)).toBe(true) // 8 Tage
  })

  it('nimmt Konten ohne Lern-Session in die Inaktiv-Filter auf', () => {
    expect(matchesActivity(row('A', { last_sign_in_at: '2026-10-26T08:00:00Z' }), '30', now)).toBe(true)
  })

  it('„Nie eingeloggt“ fragt nur den Login ab', () => {
    expect(matchesActivity(row('A'), 'never', now)).toBe(true)
    expect(matchesActivity(row('A', { last_sign_in_at: '2026-10-26T08:00:00Z' }), 'never', now)).toBe(false)
  })

  it('„Alle“ lässt jeden durch', () => {
    expect(matchesActivity(row('A', { last_session_date: '2026-10-26' }), 'all', now)).toBe(true)
  })
})

describe('Adresse lesen/schreiben (PROJ-57)', () => {
  it('liest gültige Werte', () => {
    expect(parseUserListParams(new URLSearchParams('sort=login&dir=asc&aktiv=14'))).toEqual({
      sort: 'login',
      dir: 'asc',
      activity: '14',
    })
  })

  it('ignoriert ungültige Werte still', () => {
    expect(parseUserListParams(new URLSearchParams('sort=passwort&dir=quer&aktiv=99'))).toEqual({
      sort: 'xp',
      dir: 'desc',
      activity: 'all',
    })
  })

  it('nimmt ohne Richtung die erste Richtung der Spalte', () => {
    expect(parseUserListParams(new URLSearchParams('sort=name')).dir).toBe('asc')
  })

  it('lässt Standardwerte weg und behält fremde Parameter', () => {
    expect(userListParams({ sort: 'xp', dir: 'desc', activity: 'all' }, new URLSearchParams('x=1')).toString()).toBe('x=1')
    expect(userListParams({ sort: 'name', dir: 'asc', activity: 'never' }).toString()).toBe('sort=name&dir=asc&aktiv=never')
  })
})
