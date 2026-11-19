import { describe, it, expect } from 'vitest'
import { composeDisplayName, firstNameSchema, lastNameSchema, personNameSchema } from './personen-name'
import { hasPersonName } from './roles'

describe('personNameSchema (PROJ-121)', () => {
  it('akzeptiert übliche Namen, auch mit Umlauten, Bindestrich, Apostroph, Punkt und Leerzeichen', () => {
    for (const first of ['Anna', 'Anna-Lena', 'Jörg', 'Zoë', 'Dr. Ali', "D'Arcy", 'D’Arcy', 'D‘Arcy', 'Çağla']) {
      expect(firstNameSchema.safeParse(first).success, first).toBe(true)
    }
    for (const last of ['Müller', 'von der Heide', "O'Neill", 'Meier-Schmidt', 'Łukasiewicz']) {
      expect(lastNameSchema.safeParse(last).success, last).toBe(true)
    }
  })

  it('trimmt Ränder und zieht doppelte Leerzeichen zusammen, ohne Schreibweise zu ändern', () => {
    expect(personNameSchema.parse({ firstName: '  anna ', lastName: 'von   der  Heide ' })).toEqual({
      firstName: 'anna',
      lastName: 'von der Heide',
    })
  })

  it('lehnt leere und nur aus Leerzeichen bestehende Eingaben ab', () => {
    for (const v of ['', '   ']) {
      const r = firstNameSchema.safeParse(v)
      expect(r.success).toBe(false)
      expect(r.error?.issues[0].message).toBe('Bitte gib deinen Vornamen ein.')
    }
    expect(lastNameSchema.safeParse('').error?.issues[0].message).toBe('Bitte gib deinen Nachnamen ein.')
  })

  it('lehnt Ziffern, Sonderzeichen, Tags und Emojis ab', () => {
    for (const v of ['Anna1', '<b>Anna</b>', 'Anna@x', 'An/na', 'Anna 😀', '-Anna', '(Anna)', 'Anna;DROP']) {
      expect(firstNameSchema.safeParse(v).success, v).toBe(false)
    }
  })

  it('lehnt mehr als 60 Zeichen ab, erlaubt genau 60', () => {
    expect(firstNameSchema.safeParse('a'.repeat(60)).success).toBe(true)
    expect(firstNameSchema.safeParse('a'.repeat(61)).success).toBe(false)
  })

  it('lehnt Nicht-Text ab', () => {
    expect(personNameSchema.safeParse({ firstName: 5, lastName: 'x' }).success).toBe(false)
    expect(personNameSchema.safeParse({ firstName: 'Anna' }).success).toBe(false)
    expect(personNameSchema.safeParse(null).success).toBe(false)
  })

  it('setzt den Anzeigenamen als „Vorname Nachname“ zusammen', () => {
    expect(composeDisplayName('Erika', 'Muster')).toBe('Erika Muster')
  })
})

describe('hasPersonName', () => {
  it('braucht beide Teile', () => {
    expect(hasPersonName({ first_name: 'A', last_name: 'B' })).toBe(true)
    expect(hasPersonName({ first_name: 'A', last_name: null })).toBe(false)
    expect(hasPersonName({ first_name: ' ', last_name: 'B' })).toBe(false)
    expect(hasPersonName(null)).toBe(false)
    expect(hasPersonName(undefined)).toBe(false)
  })
})
