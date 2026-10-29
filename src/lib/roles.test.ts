import { describe, it, expect } from 'vitest'
import {
  contentScopeShort,
  contentScopeText,
  isManagerRole,
  isTeacherRole,
  isUserRole,
  mayOpenAdminPath,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  safeRedirectTarget,
  START_PATH,
  startPathFor,
  teacherMayCallApiPath,
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

  it('lässt eine Lehrkraft auf Übersicht, Leistungsnachweise und Inhalts-Seiten (PROJ-48), aber nicht auf Nutzer-/Bereichsverwaltung', () => {
    expect(mayOpenAdminPath('teacher', '/admin')).toBe(true)
    expect(mayOpenAdminPath('teacher', '/admin/')).toBe(true)
    expect(mayOpenAdminPath('teacher', '/admin/leistungsnachweise')).toBe(true)
    expect(mayOpenAdminPath('teacher', '/admin/leistungsnachweise/a1')).toBe(true)
    // PROJ-48: Fragen/Fächer/Themen/Prüfungssimulation/Papierkorb/Meine Fächer
    // darf eine Lehrkraft öffnen — welche Inhalte sie darin sieht, entscheiden
    // die API-Routen über ihre Fach-Zuständigkeiten (requireContentAdmin).
    for (const path of ['/admin/questions', '/admin/subjects', '/admin/topics', '/admin/exam-sets', '/admin/papierkorb', '/admin/my-subjects', '/admin/konto']) {
      expect(mayOpenAdminPath('teacher', path)).toBe(true)
    }
    for (const path of ['/admin/users', '/admin/departments', '/administrator', '/admin/leistungsnachweise-andere-seite']) {
      expect(mayOpenAdminPath('teacher', path)).toBe(false)
    }
    expect(mayOpenAdminPath('department_admin', '/admin/questions')).toBe(true)
    expect(mayOpenAdminPath('admin', '/admin/departments')).toBe(true)
    expect(mayOpenAdminPath('student', '/admin')).toBe(false)
  })

  it('lässt jede Lehrkraft in die Werkzeugkiste samt Ablauf und deren Schnittstelle (PROJ-51)', () => {
    for (const path of ['/admin/werkzeugkiste', '/admin/werkzeugkiste/neu', '/admin/werkzeugkiste/ablauf/abc']) {
      expect(mayOpenAdminPath('teacher', path)).toBe(true)
    }
    expect(teacherMayCallApiPath('/api/admin/werkzeugkiste/ablaeufe/abc/einlesen')).toBe(true)
    expect(teacherMayCallApiPath('/api/admin/werkzeugkiste-fremd')).toBe(false)
    expect(mayOpenAdminPath('student', '/admin/werkzeugkiste')).toBe(false)
  })

  it('lässt jede Lehrkraft ins Lehrerzimmer samt Schnittstelle, Azubis nicht (PROJ-63)', () => {
    for (const path of ['/admin/lehrerzimmer', '/admin/lehrerzimmer/neu', '/admin/lehrerzimmer/abc/bearbeiten']) {
      expect(mayOpenAdminPath('teacher', path)).toBe(true)
    }
    expect(teacherMayCallApiPath('/api/admin/lehrerzimmer/posts')).toBe(true)
    expect(teacherMayCallApiPath('/api/admin/lehrerzimmer/nav-counts')).toBe(true)
    expect(teacherMayCallApiPath('/api/admin/lehrerzimmer-fremd')).toBe(false)
    expect(mayOpenAdminPath('teacher', '/admin/lehrerzimmer-fremd')).toBe(false)
    expect(mayOpenAdminPath('student', '/admin/lehrerzimmer')).toBe(false)
  })

  it('nimmt als Login-Ziel nur Pfade innerhalb der App, sonst die Start-Weiche', () => {
    expect(safeRedirectTarget('/pruefung/ABCD')).toBe('/pruefung/ABCD')
    expect(safeRedirectTarget(null)).toBe(START_PATH)
    expect(safeRedirectTarget('')).toBe(START_PATH)
    expect(safeRedirectTarget('https://evil.example')).toBe(START_PATH)
    expect(safeRedirectTarget('//evil.example')).toBe(START_PATH)
    expect(safeRedirectTarget('/\\evil.example')).toBe(START_PATH)
  })

  // QA PROJ-44, BUG-1: Der Browser entfernt Tab und Zeilenumbruch aus Adressen,
  // `/<Tab>/evil.example` würde sonst zu `//evil.example` (fremde Domain).
  it('weist Pfade mit Tab/Zeilenumbruch/Steuerzeichen ab, die der Browser zu //fremde-domain macht', () => {
    for (const raw of ['/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/\u0000/evil.example', '/\u007f/x', '/ok\npfad']) {
      expect(safeRedirectTarget(raw)).toBe(START_PATH)
    }
  })

  it('weist Backslash an jeder Stelle ab, weil der Browser ihn wie / liest', () => {
    for (const raw of ['/\\evil.example', '/pfad\\..\\..', '/a\\b']) {
      expect(safeRedirectTarget(raw)).toBe(START_PATH)
    }
  })

  it('führt jedes erlaubte Ergebnis tatsächlich auf dieselbe Herkunft', () => {
    const base = 'https://spedilern.vercel.app'
    const inputs = ['/start', '/pruefung/ABCD', '/admin/leistungsnachweise/1?x=1#a', '///evil.example', 'javascript:alert(1)', 'http:evil.example', ' /x', '/\t/evil.example']
    for (const raw of inputs) {
      const target = safeRedirectTarget(raw)
      expect(new URL(target, base).origin).toBe(base)
    }
  })

  it('lässt normale Pfade mit Suchparametern und Anker unverändert durch', () => {
    expect(safeRedirectTarget('/pruefung/ABCD?code=7K2M-QX#start')).toBe('/pruefung/ABCD?code=7K2M-QX#start')
    expect(safeRedirectTarget('/admin/leistungsnachweise/abc/druck/klasse')).toBe('/admin/leistungsnachweise/abc/druck/klasse')
  })
})

describe('Rollen-Texte (PROJ-49)', () => {
  it('hat für jede Lehrer-Rolle einen Erklärsatz von höchstens 15 Wörtern', () => {
    for (const role of ['teacher', 'department_admin', 'admin'] as const) {
      const words = ROLE_DESCRIPTION[role].split(/\s+/).length
      expect(words).toBeGreaterThan(0)
      expect(words).toBeLessThanOrEqual(15)
    }
  })

  it('nennt den Umfang je Rolle', () => {
    expect(contentScopeText('teacher', 'Spedition')).toBe('Du siehst nur Inhalte deiner Fächer.')
    expect(contentScopeText('department_admin', 'Spedition')).toBe('Du siehst den ganzen Bereich Spedition.')
    expect(contentScopeText('department_admin')).toBe('Du siehst den ganzen Bereich.')
    expect(contentScopeText('admin', 'Tourismus')).toBe('Du siehst den Bereich Tourismus.')
    expect(contentScopeText('admin')).toBe('Du siehst alle Bereiche.')
  })

  it('hat eine Kurzform für die Navigation', () => {
    expect(contentScopeShort('teacher')).toBe('deine Fächer')
    expect(contentScopeShort('department_admin')).toBe('ganzer Bereich')
    expect(contentScopeShort('admin')).toBe('alle Bereiche')
  })
})
