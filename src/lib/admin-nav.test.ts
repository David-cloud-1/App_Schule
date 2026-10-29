import { describe, it, expect } from 'vitest'
import {
  ADMIN_COMMAND_ACTIONS,
  ADMIN_HOME_HREF,
  ADMIN_NAV_GROUPS,
  adminCommandActionsFor,
  adminHomeActionsFor,
  adminNavGroupHint,
  adminNavMatch,
  teacherRoleLabel,
  adminNavGroupsFor,
  adminNavLabel,
  isAdminNavActive,
} from './admin-nav'

describe('Admin-Navigation (PROJ-40)', () => {
  it('gruppiert in Mein Unterricht, Inhalte und Verwaltung', () => {
    expect(ADMIN_NAV_GROUPS.map((g) => g.label)).toEqual(['Mein Unterricht', 'Inhalte', 'Verwaltung'])
  })

  it('hat für jeden Eintrag eine eindeutige Adresse unter /admin', () => {
    const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items)
    const hrefs = items.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(items.filter((i) => !i.external).every((i) => i.href.startsWith('/admin/'))).toBe(true)
  })

  it('zeigt die Werkzeugkiste allen Lehrer-Rollen als Seite in der App (PROJ-51)', () => {
    for (const role of ['admin', 'department_admin', 'teacher'] as const) {
      const item = adminNavGroupsFor(role)
        .flatMap((g) => g.items)
        .find((i) => i.label === 'Werkzeugkiste')!
      expect(item.href).toBe('/admin/werkzeugkiste')
      expect(item.external).toBeFalsy()
    }
    expect(adminNavMatch('/admin/werkzeugkiste/ablauf/abc')?.item.label).toBe('Werkzeugkiste')
  })

  it('zeigt Super-Admins „Fachbereiche“ und „Zuständigkeiten“, Fachbereichs-Admins keins von beiden', () => {
    const labels = (role: 'admin' | 'department_admin') =>
      adminNavGroupsFor(role).flatMap((g) => g.items.map((i) => i.label))
    expect(labels('admin')).toContain('Fachbereiche')
    expect(labels('admin')).toContain('Zuständigkeiten')
    expect(labels('department_admin')).not.toContain('Fachbereiche')
    expect(labels('department_admin')).not.toContain('Zuständigkeiten')
    expect(labels('department_admin')).toHaveLength(labels('admin').length - 2)
  })

  it('zeigt weder Super-Admin noch Bereichs-Admin „Meine Fächer“ (PROJ-48 — die sind bereits bereichsweit zuständig)', () => {
    const labels = (role: 'admin' | 'department_admin') =>
      adminNavGroupsFor(role).flatMap((g) => g.items.map((i) => i.label))
    expect(labels('admin')).not.toContain('Meine Fächer')
    expect(labels('department_admin')).not.toContain('Meine Fächer')
  })

  it('zeigt einer Lehrkraft nur „Mein Unterricht“ und „Inhalte“, keine Verwaltung (PROJ-44/46/48/49)', () => {
    const groups = adminNavGroupsFor('teacher')
    expect(groups.map((g) => g.label)).toEqual(['Mein Unterricht', 'Inhalte'])
    expect(groups.map((g) => g.items.map((i) => i.label))).toEqual([
      ['Leistungsnachweise', 'Werkzeugkiste', 'Meine Fächer', 'Lehrerzimmer'],
      ['Fragen', 'Fächer', 'Themen', 'Prüfungssimulation', 'Papierkorb'],
    ])
  })

  it('hängt „Meine Fächer“ und Papierkorb nicht mehr an die Verwaltung', () => {
    const verwaltung = ADMIN_NAV_GROUPS.find((g) => g.id === 'verwaltung')!.items.map((i) => i.label)
    expect(verwaltung).not.toContain('Meine Fächer')
    expect(verwaltung).not.toContain('Papierkorb')
  })

  it('nennt hinter der Gruppe „Inhalte“ den Umfang der Rolle (PROJ-49)', () => {
    const inhalte = ADMIN_NAV_GROUPS.find((g) => g.id === 'inhalte')!
    const verwaltung = ADMIN_NAV_GROUPS.find((g) => g.id === 'verwaltung')!
    expect(adminNavGroupHint(inhalte, 'teacher')).toBe('deine Fächer')
    expect(adminNavGroupHint(inhalte, 'department_admin')).toBe('ganzer Bereich')
    expect(adminNavGroupHint(inhalte, 'admin')).toBe('alle Bereiche')
    expect(adminNavGroupHint(verwaltung, 'admin')).toBeNull()
  })

  it('zeigt einer Lehrkraft ohne eingetragenes Fach keine (leeren) Inhalts-Seiten', () => {
    const labels = adminNavGroupsFor('teacher', false).flatMap((g) => g.items.map((i) => i.label))
    expect(labels).toEqual(['Leistungsnachweise', 'Werkzeugkiste', 'Meine Fächer', 'Lehrerzimmer'])
    // für Admins spielt die Angabe keine Rolle
    expect(adminNavGroupsFor('department_admin', false)).toEqual(adminNavGroupsFor('department_admin'))
  })

  it('bietet auf der Startseite nur Schnellaktionen für sichtbare Seiten', () => {
    const ids = (role: 'teacher' | 'department_admin', hasSubjects = true) =>
      adminHomeActionsFor(role, hasSubjects).map((a) => a.id)
    expect(ids('department_admin')).toEqual(['neuer-nachweis', 'fragen', 'material', 'nutzer', 'werkzeugkiste'])
    expect(ids('teacher')).toEqual(['neuer-nachweis', 'fragen', 'werkzeugkiste'])
    expect(ids('teacher', false)).toEqual(['neuer-nachweis', 'werkzeugkiste'])
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

describe('Lehrkräfte-Arbeitsbereich (PROJ-45)', () => {
  it('findet den Eintrag zur Seite, auch auf Unterseiten', () => {
    expect(adminNavMatch('/admin/leistungsnachweise/abc')?.item.label).toBe('Leistungsnachweise')
    expect(adminNavMatch('/admin/audit-log')?.group.label).toBe('Verwaltung')
    expect(adminNavMatch('/admin')).toBeNull()
  })

  it('nennt die Rolle in Klartext', () => {
    expect(teacherRoleLabel('teacher', 'Spedition')).toBe('Lehrkraft')
    expect(teacherRoleLabel('department_admin', 'Spedition')).toBe('Bereichs-Admin Spedition')
    expect(teacherRoleLabel('admin', 'Spedition')).toBe('Super-Admin')
  })

  it('zeigt in der Schnellsuche nur Aktionen, deren Seite die Rolle sehen darf', () => {
    const ids = (role: 'teacher' | 'department_admin') => adminCommandActionsFor(role).map((a) => a.id)
    expect(ids('department_admin')).toEqual(['neuer-nachweis', 'werkzeugkiste', 'neuer-beitrag', 'mein-konto', 'lern-app', 'darstellung'])
    // PROJ-46: eine Lehrkraft darf jetzt auch eigene Leistungsnachweise anlegen
    expect(ids('teacher')).toEqual(['neuer-nachweis', 'werkzeugkiste', 'neuer-beitrag', 'mein-konto', 'lern-app', 'darstellung'])
  })

  it('führt jede Aktion mit Seitenbezug auf eine echte Navigations-Seite zurück', () => {
    const hrefs = new Set(ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)))
    for (const action of ADMIN_COMMAND_ACTIONS) {
      if (action.kind === 'link' && action.requiresHref) expect(hrefs.has(action.requiresHref)).toBe(true)
    }
  })
})
