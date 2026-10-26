import { describe, it, expect } from 'vitest'
import {
  isManagerRole,
  isTeacherRole,
  isUserRole,
  mayOpenAdminPath,
  ROLE_LABEL,
  safeRedirectTarget,
  START_PATH,
  startPathFor,
} from './roles'

describe('Rollen-Übersicht (PROJ-44)', () => {
  it('kennt vier Rollen mit Klartext-Namen', () => {
    expect(ROLE_LABEL).toEqual({
      student: 'Azubi',
      teacher: 'Lehrkraft',
      department_admin: 'Bereichs-Admin',
      admin: 'Super-Admin',
    })
    expect(isUserRole('teacher')).toBe(true)
    expect(isUserRole('user')).toBe(false)
    expect(isUserRole(null)).toBe(false)
  })

  it('zählt Lehrkraft, Bereichs-Admin und Super-Admin als Lehrer-Rollen, Azubis nicht', () => {
    expect(isTeacherRole('teacher')).toBe(true)
    expect(isTeacherRole('department_admin')).toBe(true)
    expect(isTeacherRole('admin')).toBe(true)
    expect(isTeacherRole('student')).toBe(false)
    expect(isTeacherRole(undefined)).toBe(false)
    expect(isTeacherRole('irgendwas')).toBe(false)
  })

  it('gibt Verwaltungsrechte nur Bereichs-Admin und Super-Admin, nicht der Lehrkraft', () => {
    expect(isManagerRole('admin')).toBe(true)
    expect(isManagerRole('department_admin')).toBe(true)
    expect(isManagerRole('teacher')).toBe(false)
    expect(isManagerRole('student')).toBe(false)
  })

  it('schickt alle Lehrer-Rollen nach dem Login in den Lehrkräfte-Bereich, Azubis auf die Startseite', () => {
    expect(startPathFor('teacher')).toBe('/admin')
    expect(startPathFor('department_admin')).toBe('/admin')
    expect(startPathFor('admin')).toBe('/admin')
    expect(startPathFor('student')).toBe('/')
    expect(startPathFor(null)).toBe('/')
  })

  it('lässt eine Lehrkraft nur auf die Übersicht, Verwaltungs-Rollen überall hin', () => {
    expect(mayOpenAdminPath('teacher', '/admin')).toBe(true)
    expect(mayOpenAdminPath('teacher', '/admin/')).toBe(true)
    for (const path of ['/admin/questions', '/admin/users', '/admin/leistungsnachweise', '/admin/departments', '/administrator']) {
      expect(mayOpenAdminPath('teacher', path)).toBe(false)
    }
    expect(mayOpenAdminPath('department_admin', '/admin/questions')).toBe(true)
    expect(mayOpenAdminPath('admin', '/admin/departments')).toBe(true)
    expect(mayOpenAdminPath('student', '/admin')).toBe(false)
  })

  it('nimmt als Login-Ziel nur Pfade innerhalb der App, sonst die Start-Weiche', () => {
    expect(safeRedirectTarget('/pruefung/ABCD')).toBe('/pruefung/ABCD')
    expect(safeRedirectTarget(null)).toBe(START_PATH)
    expect(safeRedirectTarget('')).toBe(START_PATH)
    expect(safeRedirectTarget('https://evil.example')).toBe(START_PATH)
    expect(safeRedirectTarget('//evil.example')).toBe(START_PATH)
    expect(safeRedirectTarget('/\\evil.example')).toBe(START_PATH)
  })
})
