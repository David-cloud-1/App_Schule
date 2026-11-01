import { describe, expect, it } from 'vitest'
import {
  geladenText,
  MAX_PERSONEN,
  NOTIZ_MAX,
  regalPill,
  STUFEN,
  stufenText,
  teilenToast,
} from '@/lib/werkzeugkiste-regal'

describe('Regal – Hilfsfunktionen (PROJ-53)', () => {
  it('bietet genau die vier Stufen aus der Spec an, „Nur ich“ zuerst', () => {
    expect(STUFEN.map((s) => s.id)).toEqual(['privat', 'fachbereich', 'alle', 'ausgewaehlte'])
    expect(STUFEN[0].label).toBe('Nur ich')
  })

  it('kennt die Grenzen der Spec (200 Zeichen Notiz, 50 Personen)', () => {
    expect(NOTIZ_MAX).toBe(200)
    expect(MAX_PERSONEN).toBe(50)
  })

  describe('Pill in „Meine Materialien“', () => {
    it('zeigt ohne Freigabe „privat“', () => {
      expect(regalPill(null)).toEqual({ text: 'privat', ton: 'still' })
      expect(regalPill(undefined).text).toBe('privat')
    })
    it('zeigt Fachbereich, alle und die Zahl der Personen', () => {
      expect(regalPill({ stufe: 'fachbereich', personen: 0, bereiche: 2, entnommen: false }).text).toBe('Fachbereich')
      expect(regalPill({ stufe: 'alle', personen: 0, bereiche: 0, entnommen: false }).text).toBe('alle')
      expect(regalPill({ stufe: 'ausgewaehlte', personen: 1, bereiche: 0, entnommen: false }).text).toBe('1 Person')
      expect(regalPill({ stufe: 'ausgewaehlte', personen: 7, bereiche: 0, entnommen: false }).text).toBe('7 Personen')
    })
    it('zeigt eine Entnahme durch den Admin vor allem anderen', () => {
      const p = regalPill({ stufe: 'alle', personen: 0, bereiche: 0, entnommen: true })
      expect(p.text).toBe('vom Admin aus dem Regal genommen')
      expect(p.ton).toBe('rot')
    })
  })

  it('formuliert die Toasts nach dem Speichern', () => {
    expect(teilenToast('fachbereich')).toBe('Mit deinem Fachbereich geteilt')
    expect(teilenToast('alle')).toBe('Mit allen Lehrkräften geteilt')
    expect(teilenToast('ausgewaehlte', 1)).toBe('Mit 1 Person geteilt')
    expect(teilenToast('ausgewaehlte', 3)).toBe('Mit 3 Personen geteilt')
    expect(teilenToast('privat')).toMatch(/Aus dem Regal genommen/)
  })

  it('erklärt jede Stufe in einem Satz, bei einem Fachbereich mit dessen Namen', () => {
    expect(stufenText('privat')).toBe('Nur du siehst dieses Material.')
    expect(stufenText('fachbereich', 'Spedition')).toBe('Alle Lehrkräfte in Spedition sehen es im Regal.')
    expect(stufenText('fachbereich')).toMatch(/gewählten Fachbereichen/)
    expect(stufenText('alle')).toBe('Alle Lehrkräfte der Schule sehen es im Regal.')
  })

  it('schreibt den Ladezähler wie in der Spec', () => {
    expect(geladenText(0)).toBe('0× geladen')
    expect(geladenText(12)).toBe('12× geladen')
  })
})
