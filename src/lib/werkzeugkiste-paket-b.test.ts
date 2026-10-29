import { describe, expect, it } from 'vitest'
import { einstellungenFuerWerkzeug, feldOptionen, feldStandards, findeWerkzeug, type AblaufEinstellungen } from './werkzeugkiste'
import { einstellungenFuerWechsel, standardEinstellungen } from './werkzeugkiste-server'

const EINST: AblaufEinstellungen = { format: '', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' }

describe('Paket B: Kahoot, Moodle, LearningApps (PROJ-54)', () => {
  it('schaltet die drei Werkzeuge frei, ohne Formatwahl', () => {
    for (const id of ['kahoot', 'moodle', 'learningapps']) {
      const w = findeWerkzeug(id)
      expect(w?.aktiv, id).toBe(true)
      expect(w?.formate, id).toEqual([])
    }
  })

  it('übernimmt Standardwerte und Grenzen der alten Oberfläche', () => {
    expect(feldStandards('kahoot')).toMatchObject({ anzahl: '12', zeitlimit: 'auto' })
    expect(feldStandards('moodle')).toMatchObject({ anzahl: '20', types: 'mc,tf', kategorie: '' })
    expect(feldStandards('learningapps')).toMatchObject({ anzahl: '8', vorlagen: 'zuordnung,lueckentext' })
    const zahl = (w: string) => findeWerkzeug(w)!.felder.find((f) => f.id === 'anzahl')!
    expect([zahl('kahoot').min, zahl('kahoot').max]).toEqual([1, 30])
    expect([zahl('moodle').min, zahl('moodle').max]).toEqual([1, 60])
    expect([zahl('learningapps').min, zahl('learningapps').max]).toEqual([4, 20])
    expect(zahl('learningapps').label).toBe('Elemente je Übung')
  })

  it('bietet dieselben Auswahlmöglichkeiten wie die alte Werkzeugkiste', () => {
    const e = standardEinstellungen('kahoot')
    const liste = (w: string, feld: string) =>
      feldOptionen(findeWerkzeug(w)!.felder.find((f) => f.id === feld)!, e, null).map((o) => o.key)
    expect(liste('kahoot', 'zeitlimit')).toEqual(['auto', '5', '10', '20', '30', '60', '90', '120'])
    expect(liste('moodle', 'types')).toEqual(['mc', 'tf', 'short', 'num', 'match', 'cloze', 'ms'])
    expect(liste('learningapps', 'vorlagen')).toEqual(['zuordnung', 'lueckentext', 'quiz', 'gruppen'])
  })

  it('zeigt die Spec-Einstellungen direkt und den Rest unter „Mehr Optionen“', () => {
    const ort = (w: string) => {
      const f = findeWerkzeug(w)!.felder
      return { direkt: f.filter((x) => x.ort === 'direkt').map((x) => x.id), mehr: f.filter((x) => x.ort === 'mehr').map((x) => x.id) }
    }
    expect(ort('kahoot')).toEqual({ direkt: ['anzahl', 'niveau'], mehr: ['zeitlimit', 'bildungsgang', 'lernfeld'] })
    expect(ort('moodle')).toEqual({ direkt: ['anzahl', 'types', 'niveau'], mehr: ['kategorie', 'bildungsgang', 'lernfeld'] })
    expect(ort('learningapps')).toEqual({ direkt: ['vorlagen', 'niveau', 'anzahl'], mehr: ['bildungsgang'] })
  })

  it('holt beim Werkzeugwechsel Zahlen in den neuen Bereich und verwirft unpassende Häkchen', () => {
    // 60 Fragen aus Moodle passen nicht zu Kahoot (höchstens 30) und nicht zu LearningApps (höchstens 20)
    const moodle = { ...EINST, anzahl: '60', types: 'mc,num' }
    expect(einstellungenFuerWerkzeug('kahoot', moodle).anzahl).toBe('30')
    expect(einstellungenFuerWerkzeug('learningapps', moodle).anzahl).toBe('20')
    // 2 Elemente sind für LearningApps zu wenig (mindestens 4)
    expect(einstellungenFuerWerkzeug('learningapps', { ...EINST, anzahl: '2' }).anzahl).toBe('4')
    // Fragetypen gibt es nur bei Moodle; Vorlagen nur bei LearningApps
    const nachKahoot = einstellungenFuerWerkzeug('kahoot', moodle)
    expect(nachKahoot).not.toHaveProperty('types')
    expect(einstellungenFuerWerkzeug('moodle', { ...EINST, types: 'quatsch' }).types).toBe('mc,tf')
    expect(einstellungenFuerWerkzeug('moodle', { ...EINST, types: 'short,quatsch' }).types).toBe('short')
  })

  it('der Server verwirft fremde Felder beim Werkzeugwechsel und behält die eigenen', () => {
    const e = einstellungenFuerWechsel('moodle', { ...EINST, types: 'mc', kategorie: 'Recht', zeitlimit: '30', vorlagen: 'quiz' })
    expect(e).toMatchObject({ types: 'mc', kategorie: 'Recht', anzahl: '20' })
    expect(e).not.toHaveProperty('zeitlimit')
    expect(e).not.toHaveProperty('vorlagen')
  })
})
