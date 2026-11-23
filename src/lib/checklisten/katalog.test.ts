import { describe, it, expect } from 'vitest'
import {
  CHECKLISTEN,
  KENNUNG_MUSTER,
  checklistenFehlerStatus,
  hakenSchema,
  istChecklisteKennung,
  istVariante,
  neuStartenSchema,
  variantenSchema,
} from './katalog'

describe('Katalog der Checklisten (PROJ-122)', () => {
  it('hat nur Kennungen und Varianten, die zum Muster der Datenbank passen', () => {
    for (const [kennung, def] of Object.entries(CHECKLISTEN)) {
      expect(kennung).toMatch(KENNUNG_MUSTER)
      expect(def.varianten.length).toBeGreaterThan(0)
      expect(new Set(def.varianten).size).toBe(def.varianten.length)
      for (const v of def.varianten) expect(v).toMatch(/^[a-z0-9][a-z0-9-]{0,39}$/)
    }
  })

  it('kennt die beiden Pilot-Listen', () => {
    expect(istChecklisteKennung('dienstreise-beantragen')).toBe(true)
    expect(istChecklisteKennung('reisekosten-abrechnen')).toBe(true)
  })

  it('lehnt unbekannte Kennungen ab, auch Vererbtes aus dem Objekt', () => {
    for (const k of ['gibt-es-nicht', '', 'constructor', '__proto__', 'toString', null, undefined, 3]) {
      expect(istChecklisteKennung(k)).toBe(false)
    }
  })

  it('prüft Varianten je Liste', () => {
    expect(istVariante('dienstreise-beantragen', 'bezirksreise')).toBe(true)
    expect(istVariante('dienstreise-beantragen', 'klassenfahrt')).toBe(false)
    expect(istVariante('reisekosten-abrechnen', 'klassenfahrt')).toBe(true)
    expect(istVariante('gibt-es-nicht', 'klassenfahrt')).toBe(false)
  })

  it('verlangt beim Haken den gewünschten Zustand und streng geformte Kennungen', () => {
    expect(hakenSchema.safeParse({ schritt: 'a-1', erledigt: false }).success).toBe(true)
    expect(hakenSchema.safeParse({ schritt: 'a-1' }).success).toBe(false)
    expect(hakenSchema.safeParse({ schritt: '-a', erledigt: true }).success).toBe(false)
    expect(hakenSchema.safeParse({ schritt: 'a-1', erledigt: true, variante: null }).success).toBe(true)
    expect(variantenSchema.safeParse({ variante: null }).success).toBe(true)
    expect(variantenSchema.safeParse({}).success).toBe(false)
    expect(neuStartenSchema.safeParse({}).success).toBe(true)
  })

  it('übersetzt die Fehlercodes der Datenbank-Funktionen', () => {
    expect(checklistenFehlerStatus('CHK01')).toBe(400)
    expect(checklistenFehlerStatus('CHK02')).toBe(409)
    expect(checklistenFehlerStatus('42501')).toBe(403)
    expect(checklistenFehlerStatus('XX000')).toBeNull()
    expect(checklistenFehlerStatus(undefined)).toBeNull()
  })
})
