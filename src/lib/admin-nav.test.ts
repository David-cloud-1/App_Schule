import { describe, it, expect } from 'vitest'
import {
  ADMIN_HOME_HREF,
  ADMIN_NAV_GROUPS,
  adminNavGroupsFor,
  adminNavLabel,
  isAdminNavActive,
  WERKZEUGKISTE_URL,
} from './admin-nav'

describe('Admin-Navigation (PROJ-40)', () => {
  it('gruppiert in Unterricht, Inhalte und Einstellungen', () => {
    expect(ADMIN_NAV_GROUPS.map((g) => g.label)).toEqual(['Unterricht', 'Inhalte', 'Einstellungen'])
  })

  it('hat für jeden Eintrag eine eindeutige Adresse unter /admin', () => {
    const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items)
    const hrefs = items.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(items.filter((i) => !i.external).every((i) => i.href.startsWith('/admin/'))).toBe(true)
  })

  it('verlinkt die Werkzeugkiste als externen Eintrag für alle Admins', () => {
    for (const isSuper of [true, false]) {
      const item = adminNavGroupsFor(isSuper)
        .flatMap((g) => g.items)
        .find((i) => i.label === 'Werkzeugkiste')!
      expect(item.href).toBe(WERKZEUGKISTE_URL)
      expect(item.external).toBe(true)
    }
  })

  it('zeigt Super-Admins „Fachbereiche“, Fachbereichs-Admins nicht', () => {
    const labels = (isSuper: boolean) =>
      adminNavGroupsFor(isSuper).flatMap((g) => g.items.map((i) => i.label))
    expect(labels(true)).toContain('Fachbereiche')
    expect(labels(false)).not.toContain('Fachbereiche')
    expect(labels(false)).toHaveLength(labels(true).length - 1)
  })

  it('verwendet die neuen, verständlichen Namen', () => {
    const labels = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).toEqual(
      expect.arrayContaining(['Änderungsprotokoll', 'Fragen aus Material', 'Prüfungssimulation']),
    )
    expect(labels).not.toContain('Audit-Log')
    expect(labels).not.toContain('KI-Generator')
    expect(labels).not.toContain('Prüfungssets')
  })

  it('benennt den Items-Eintrag nach dem Fachbereich', () => {
    const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items)
    const shop = items.find((i) => i.href === '/admin/shop-items')!
    expect(adminNavLabel(shop, 'Hof')).toBe('Hof-Items')
    const fragen = items.find((i) => i.href === '/admin/questions')!
    expect(adminNavLabel(fragen, 'Hof')).toBe('Fragen')
  })

  it('markiert Unterseiten als aktiv, die Übersicht nur auf /admin', () => {
    expect(isAdminNavActive('/admin/leistungsnachweise/123', '/admin/leistungsnachweise')).toBe(true)
    expect(isAdminNavActive('/admin/leistungsnachweise', '/admin/leistungsnachweise')).toBe(true)
    expect(isAdminNavActive('/admin/questions', '/admin/leistungsnachweise')).toBe(false)
    expect(isAdminNavActive('/admin', ADMIN_HOME_HREF)).toBe(true)
    expect(isAdminNavActive('/admin/questions', ADMIN_HOME_HREF)).toBe(false)
  })
})
