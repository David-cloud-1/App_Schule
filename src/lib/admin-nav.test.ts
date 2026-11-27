import { describe, it, expect } from 'vitest'
import {
  ADMIN_COMMAND_ACTIONS,
  ADMIN_HOME_HREF,
  ADMIN_NAV_GROUPS,
  adminCommandActionsFor,
  adminHomeActionsFor,
  adminPagesFor,
  adminNavMatch,
  teacherRoleLabel,
  adminNavGroupsFor,
  isAdminNavActive,
} from './admin-nav'

describe('Admin-Navigation (PROJ-40/130)', () => {
  const labelsOf = (role: 'teacher' | 'department_admin' | 'admin') =>
    adminNavGroupsFor(role).map((g) => g.items.map((i) => i.label))

  it('hat für jede Rolle dieselbe Reihenfolge (PROJ-130)', () => {
    const gemeinsam = [
      ['Leistungsnachweise', 'Übungsprüfungen'],
      ['Lerninhalte'],
      ['Werkzeugkiste', 'Abwesenheiten', 'Nachschlagen', 'Lehrerzimmer'],
      ['Nutzer', 'Einstellungen des Bereichs', 'Shop-Gegenstände', 'Änderungsprotokoll'],
    ]
    expect(labelsOf('teacher')).toEqual(gemeinsam)
    expect(labelsOf('department_admin')).toEqual(gemeinsam)
    expect(labelsOf('admin')).toEqual([
      gemeinsam[0],
      gemeinsam[1],
      gemeinsam[2],
      [...gemeinsam[3], 'Zuständigkeiten', 'Abwesenheitsarten', 'Bereiche anlegen'],
    ])
  })

  it('hat höchstens 9 Hauptpunkte samt „Start“ (PROJ-130)', () => {
    for (const role of ['teacher', 'department_admin', 'admin'] as const) {
      const haupt = adminNavGroupsFor(role).reduce((n, g) => n + (g.collapsible ? 1 : g.items.length), 1)
      expect(haupt).toBe(9)
    }
  })

  it('zeigt keine alten Namen mehr, behält sie aber als Suchwörter (PROJ-130)', () => {
    const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items)
    const labels = items.map((i) => i.label)
    for (const alt of ['Inhalte', 'Prüfungssimulation', 'Kalender', 'Fachbereich', 'Fachbereiche', 'Items', 'Meine Fächer', 'Schulrecht', 'Checklisten']) {
      expect(labels).not.toContain(alt)
    }
    const suche = (href: string) => items.find((i) => i.href === href)!.aliases
    expect(suche('/admin/kalender')).toContain('Kalender')
    expect(suche('/admin/exam-sets')).toContain('Prüfungssimulation')
    expect(suche('/admin/department-settings')).toContain('Fachbereich')
    expect(suche('/admin/shop-items')).toContain('Hof-Items')
  })

  it('hat für jeden Eintrag eine eindeutige Adresse unter /admin', () => {
    const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items).flatMap((i) => [i, ...(i.subPages ?? [])])
    const hrefs = items.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(items.filter((i) => !i.external).every((i) => i.href.startsWith('/admin/'))).toBe(true)
  })

  it('hält „Nachschlagen“ auf Schulrecht und Checklisten aktiv (PROJ-130)', () => {
    for (const path of ['/admin/nachschlagen', '/admin/schulrecht', '/admin/checklisten/abc']) {
      expect(isAdminNavActive(path, '/admin/nachschlagen')).toBe(true)
    }
    expect(adminNavMatch('/admin/schulrecht')?.subPage?.label).toBe('Schulrecht')
  })

  it('nimmt bei verschachtelten Adressen die genaueste (Abwesenheitsarten)', () => {
    expect(adminNavMatch('/admin/kalender/arten')?.item.label).toBe('Abwesenheitsarten')
    expect(isAdminNavActive('/admin/kalender/arten', '/admin/kalender')).toBe(false)
    expect(isAdminNavActive('/admin/kalender', '/admin/kalender')).toBe(true)
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

  it('zeigt jeder Lehrkraft die Inhalts-Seiten (PROJ-70: keine Fach-Eintragung nötig)', () => {
    const labels = adminNavGroupsFor('teacher').flatMap((g) => g.items.map((i) => i.label))
    expect(labels).toEqual(expect.arrayContaining(['Lerninhalte', 'Übungsprüfungen']))
  })

  it('führt „Fragen aus Material“ nicht mehr als eigene Seite, sondern als Schnellaktion in „Fragen hinzufügen“ (PROJ-132)', () => {
    for (const role of ['admin', 'teacher'] as const) {
      expect(adminPagesFor(role).map((p) => p.href)).not.toContain('/admin/ai-generator')
    }
    expect(adminNavMatch('/admin/ai-generator')).toBeNull()
  })

  it('bietet auf der Startseite nur Schnellaktionen für sichtbare Seiten', () => {
    const ids = (role: 'teacher' | 'department_admin') =>
      adminHomeActionsFor(role).map((a) => a.id)
    // PROJ-127: „Fragen aus Material“ nur noch für den Super-Admin, „Nutzer“ für alle Lehrkräfte
    expect(ids('department_admin')).toEqual(['neuer-nachweis', 'fragen', 'nutzer', 'werkzeugkiste'])
    expect(ids('teacher')).toEqual(['neuer-nachweis', 'fragen', 'nutzer', 'werkzeugkiste'])
  })

  it('markiert Unterseiten als aktiv, die Übersicht nur auf /admin', () => {
    expect(isAdminNavActive('/admin/leistungsnachweise/123', '/admin/leistungsnachweise')).toBe(true)
    expect(isAdminNavActive('/admin/leistungsnachweise', '/admin/leistungsnachweise')).toBe(true)
    expect(isAdminNavActive('/admin/inhalte', '/admin/leistungsnachweise')).toBe(false)
    expect(isAdminNavActive('/admin', ADMIN_HOME_HREF)).toBe(true)
    expect(isAdminNavActive('/admin/inhalte', ADMIN_HOME_HREF)).toBe(false)
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
    const inhalte = ['gemeldete-fragen', 'schwierigste-fragen', 'papierkorb']
    expect(ids('department_admin')).toEqual(['neuer-nachweis', ...inhalte, 'werkzeugkiste', 'schulrecht', 'neuer-beitrag', 'mein-konto', 'lern-app', 'darstellung'])
    // PROJ-46: eine Lehrkraft darf jetzt auch eigene Leistungsnachweise anlegen
    // PROJ-130: „Meine Fächer“ steht nicht mehr im Menü, Lehrkräfte finden es in der Suche
    expect(ids('teacher')).toEqual(['neuer-nachweis', ...inhalte, 'werkzeugkiste', 'schulrecht', 'neuer-beitrag', 'mein-konto', 'meine-faecher', 'lern-app', 'darstellung'])
  })

  it('führt jede Aktion mit Seitenbezug auf eine echte Navigations-Seite zurück', () => {
    const hrefs = new Set(adminPagesFor('admin').map((i) => i.href))
    for (const action of ADMIN_COMMAND_ACTIONS) {
      if (action.kind === 'link' && action.requiresHref) expect(hrefs.has(action.requiresHref)).toBe(true)
    }
  })
})
