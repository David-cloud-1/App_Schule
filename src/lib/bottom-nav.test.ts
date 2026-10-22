import { describe, it, expect } from 'vitest'
import { bottomNavActiveHref, showBottomNav } from './bottom-nav'

describe('showBottomNav', () => {
  it.each(['/', '/subjects', '/betrieb', '/shop', '/leaderboard', '/profile', '/exam', '/exam-history', '/profile/', '/leistungsnachweise', '/subjects/stg'])(
    'zeigt die Leiste auf %s',
    (path) => expect(showBottomNav(path)).toBe(true),
  )

  it.each(['/quiz', '/blitzrunde', '/subjects/stg/extra', '/exam/abc', '/exam/abc/results', '/pruefung', '/pruefung/ABCD', '/admin', '/login', '/register', null])(
    'blendet sie auf %s aus',
    (path) => expect(showBottomNav(path)).toBe(false),
  )
})

describe('bottomNavActiveHref', () => {
  it('ordnet Prüfungsseiten dem Lernen-Tab zu', () => {
    expect(bottomNavActiveHref('/exam', '/betrieb')).toBe('/subjects')
    expect(bottomNavActiveHref('/exam-history', '/betrieb')).toBe('/subjects')
    expect(bottomNavActiveHref('/leistungsnachweise', '/betrieb')).toBe('/subjects')
    expect(bottomNavActiveHref('/subjects/stg', '/betrieb')).toBe('/subjects')
  })

  it('ordnet den Shop dem Betrieb-Tab zu', () => {
    expect(bottomNavActiveHref('/shop', '/betrieb')).toBe('/betrieb')
    expect(bottomNavActiveHref('/betrieb', '/betrieb')).toBe('/betrieb')
  })

  it('ohne Betrieb ist der Shop selbst der Eintrag', () => {
    expect(bottomNavActiveHref('/shop', '/shop')).toBe('/shop')
  })

  it('Startseite und übrige Tabs', () => {
    expect(bottomNavActiveHref('/', '/betrieb')).toBe('/')
    expect(bottomNavActiveHref('/leaderboard', '/betrieb')).toBe('/leaderboard')
    expect(bottomNavActiveHref('/profile', '/betrieb')).toBe('/profile')
  })
})
