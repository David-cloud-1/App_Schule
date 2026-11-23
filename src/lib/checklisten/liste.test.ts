import { describe, expect, it } from 'vitest'
import {
  berechneFortschritt,
  brauchtVariante,
  datumDeutsch,
  istFristAnnahme,
  sichtbareHinweise,
  sichtbareSchritte,
  standText,
} from './liste'
import { dienstreiseBeantragen as dr } from './listen/dienstreise-beantragen'
import { reisekostenAbrechnen as rk } from './listen/reisekosten-abrechnen'

const ids = (l: Parameters<typeof sichtbareSchritte>[0], v: string | null) => sichtbareSchritte(l, v).map((s) => s.id)

describe('Varianten (Dienstreise beantragen)', () => {
  it('zeigt vor der Wahl keine Schritte und keine Hinweise', () => {
    expect(brauchtVariante(dr, null)).toBe(true)
    expect(ids(dr, null)).toEqual([])
    expect(sichtbareHinweise(dr, null)).toEqual([])
  })

  it('zeigt die Anlagen nur in der passenden Variante', () => {
    expect(ids(dr, 'dienstreise-inland')).toContain('anlage-programm-einladung')
    expect(ids(dr, 'dienstreise-inland')).toContain('anlage-klassenfahrt-formular')
    expect(ids(dr, 'dienstreise-inland')).not.toContain('anlage-einladung')
    expect(ids(dr, 'dienstreise-inland')).not.toContain('anlage-a1')
    expect(ids(dr, 'fortbildungsreise-ausland')).toEqual(expect.arrayContaining(['anlage-einladung', 'anlage-a1']))
    expect(ids(dr, 'fortbildungsreise-ausland')).not.toContain('anlage-programm-einladung')
    expect(ids(dr, 'bezirksreise')).not.toContain('anlage-a1')
    expect(ids(dr, 'bezirksreise')).toContain('anlage-einladung') // Achatswies = Fortbildungsreise Inland
  })

  it('lässt beim Dienstgang keine Schritte und keine Warnung „ohne Antrag“ zu', () => {
    expect(ids(dr, 'dienstgang')).toEqual([])
    expect(sichtbareHinweise(dr, 'dienstgang')).toEqual([])
    expect(berechneFortschritt(dr, 'dienstgang', []).fertig).toBe(false)
  })

  it('behält Haken beim Wechsel: nur gemeinsame Schritte zählen, entfallene bleiben gespeichert', () => {
    const haken = ['antrag-ausfuellen', 'anlage-a1', 'anlage-einladung']
    const ausland = berechneFortschritt(dr, 'fortbildungsreise-ausland', haken)
    const inland = berechneFortschritt(dr, 'fortbildungsreise-inland', haken)
    expect(ausland.erledigt).toBe(3)
    expect(inland.erledigt).toBe(2) // a1 zählt in Inland nicht, bleibt aber in der Liste der Haken
    const zurueck = berechneFortschritt(dr, 'fortbildungsreise-ausland', haken)
    expect(zurueck.erledigt).toBe(3)
  })

  it('rechnet „fertig“ aus den Haken', () => {
    const alle = sichtbareSchritte(dr, 'bezirksreise').map((s) => s.id)
    expect(berechneFortschritt(dr, 'bezirksreise', alle).fertig).toBe(true)
    expect(berechneFortschritt(dr, 'bezirksreise', alle.slice(1)).fertig).toBe(false)
    // Zurückhaken macht den Durchlauf wieder offen
    expect(berechneFortschritt(dr, 'bezirksreise', alle.slice(0, -1)).fertig).toBe(false)
  })

  it('zählt unbekannte Haken nicht mit', () => {
    expect(berechneFortschritt(dr, 'bezirksreise', ['gibt-es-nicht']).erledigt).toBe(0)
  })
})

describe('Reisekosten abrechnen', () => {
  it('zeigt Klassenfahrt-Angaben nur in der Variante Klassenfahrt', () => {
    expect(ids(rk, 'klassenfahrt')).toEqual(expect.arrayContaining(['kosten-pruefen', 'programm-bezug']))
    expect(ids(rk, 'dienstreise')).not.toContain('kosten-pruefen')
    expect(ids(rk, 'fortbildungsreise')).not.toContain('programm-bezug')
  })

  it('führt die Sechs-Monats-Frist in allen Varianten', () => {
    for (const v of ['dienstreise', 'fortbildungsreise', 'klassenfahrt']) {
      const schritt = sichtbareSchritte(rk, v).find((s) => s.id === 'antrag-stellen')
      expect(schritt?.frist).toBe('innerhalb von sechs Monaten nach der Reise')
    }
  })

  it('zeigt „Private Ausgaben“ nur bei der Klassenfahrt', () => {
    expect(sichtbareHinweise(rk, 'klassenfahrt').map((h) => h.id)).toContain('privat')
    expect(sichtbareHinweise(rk, 'dienstreise').map((h) => h.id)).not.toContain('privat')
  })

  it('kennzeichnet die Frist nur bei Dienst- und Fortbildungsreisen als Annahme', () => {
    const s = rk.schritte.find((x) => x.id === 'antrag-stellen')!
    expect(istFristAnnahme(s, 'dienstreise')).toBe(true)
    expect(istFristAnnahme(s, 'fortbildungsreise')).toBe(true)
    expect(istFristAnnahme(s, 'klassenfahrt')).toBe(false)
    expect(sichtbareHinweise(rk, 'klassenfahrt').map((h) => h.id)).not.toContain('frist-annahme')
    expect(sichtbareHinweise(rk, 'dienstreise').map((h) => h.id)).toContain('frist-annahme')
  })
})

describe('Datum', () => {
  it('formatiert deutsch und kennt fehlende Stände', () => {
    expect(datumDeutsch('2025-05-07')).toBe('07.05.2025')
    expect(standText('2025-05-07')).toBe('Stand 07.05.2025')
    expect(standText(null)).toBe('Ohne Stand-Angabe')
  })
})
