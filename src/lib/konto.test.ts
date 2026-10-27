import { describe, it, expect } from 'vitest'
import {
  contentHref,
  contentTitleFromSnapshot,
  emailChangeSchema,
  formatRelativeTime,
  parseKuerzel,
  passwordChangeSchema,
} from './konto'

describe('parseKuerzel (PROJ-50)', () => {
  it('schreibt groß und entfernt Leerzeichen am Rand', () => {
    expect(parseKuerzel('  za ')).toEqual({ ok: true, value: 'ZA' })
  })

  it('erlaubt Umlaute', () => {
    expect(parseKuerzel('öü')).toEqual({ ok: true, value: 'ÖÜ' })
  })

  it('leer heißt „Kürzel entfernen“', () => {
    expect(parseKuerzel('')).toEqual({ ok: true, value: null })
    expect(parseKuerzel('   ')).toEqual({ ok: true, value: null })
  })

  it('lehnt zu kurze, zu lange und unzulässige Eingaben ab', () => {
    for (const bad of ['a', 'abcdef', 'A1', 'A B', 'A-B', 'ab!']) {
      expect(parseKuerzel(bad).ok, bad).toBe(false)
    }
  })
})

describe('passwordChangeSchema', () => {
  it('akzeptiert ein ausreichend langes, wiederholtes Passwort', () => {
    expect(passwordChangeSchema.safeParse({ currentPassword: 'alt', newPassword: 'neues-passwort', confirmPassword: 'neues-passwort' }).success).toBe(true)
  })

  it('braucht für Konten ohne Passwort kein aktuelles Passwort', () => {
    expect(passwordChangeSchema.safeParse({ newPassword: 'neues-passwort', confirmPassword: 'neues-passwort' }).success).toBe(true)
  })

  it('lehnt zu kurze und ungleiche Passwörter ab', () => {
    expect(passwordChangeSchema.safeParse({ newPassword: 'kurz', confirmPassword: 'kurz' }).success).toBe(false)
    const r = passwordChangeSchema.safeParse({ newPassword: 'neues-passwort', confirmPassword: 'anderes-passwort' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual(['confirmPassword'])
  })
})

describe('emailChangeSchema', () => {
  it('bereinigt und prüft die Adresse', () => {
    expect(emailChangeSchema.parse({ email: '  Lehrer@Schule.DE ' }).email).toBe('lehrer@schule.de')
    expect(emailChangeSchema.safeParse({ email: 'keine-adresse' }).success).toBe(false)
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-27T12:00:00Z')
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  it('formuliert kurz und auf Deutsch', () => {
    expect(formatRelativeTime(ago(10_000), now)).toBe('gerade eben')
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('vor 5 Min.')
    expect(formatRelativeTime(ago(2 * 3_600_000), now)).toBe('vor 2 Std.')
    expect(formatRelativeTime(ago(30 * 3_600_000), now)).toBe('gestern')
    expect(formatRelativeTime(ago(3 * 86_400_000), now)).toBe('vor 3 Tagen')
    expect(formatRelativeTime(ago(20 * 86_400_000), now)).toBe('07.10.2026')
  })

  it('gibt bei ungültigem Datum nichts zurück', () => {
    expect(formatRelativeTime('kein-datum', now)).toBe('')
  })
})

describe('Inhalte im Verlauf', () => {
  it('führt Gelöschtes in den Papierkorb, sonst zur Liste des Inhalts', () => {
    expect(contentHref('question', true)).toBe('/admin/papierkorb')
    expect(contentHref('question', false)).toBe('/admin/questions')
    expect(contentHref('exam_question_set', false)).toBe('/admin/exam-sets')
  })

  it('liest den Titel aus der Momentaufnahme', () => {
    expect(contentTitleFromSnapshot('question', { question_text: ' Was ist CMR? ' })).toBe('Was ist CMR?')
    expect(contentTitleFromSnapshot('topic', { name: 'Incoterms' })).toBe('Incoterms')
    expect(contentTitleFromSnapshot('subject', null)).toBe('Fach ohne Titel')
  })
})
