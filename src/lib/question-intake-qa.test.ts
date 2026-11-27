/**
 * PROJ-132 (QA): ergänzende Tests für Randfälle, die die vorhandenen Tests
 * nicht abdecken – Dateiart-Erkennung, Datei-Vorprüfung im Browser, Tabellen
 * mit eigener Fach-/Themen-Spalte und Teilen ohne Verlust.
 */
import { describe, expect, it } from 'vitest'
import { detectMaterialKind, MATERIAL_MAX_BYTES } from './assessment-import'
import { splitMaterial, parseIntakeTable, parseIntakeAnswer, validateIntakeQuestion, intakeDescription } from './question-intake'
import { checkMaterialFile } from '@/components/admin/intake-material-flow'

const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0])
const PDF = Buffer.from('%PDF-1.7 …')

describe('detectMaterialKind (PROJ-132)', () => {
  it('erkennt PDF am Inhalt, unabhängig vom Namen', () => {
    expect(detectMaterialKind(PDF, 'skript.docx')).toBe('pdf')
  })
  it('unterscheidet bei ZIP-Archiven PowerPoint und Word an der Endung', () => {
    expect(detectMaterialKind(ZIP, 'folien.PPTX')).toBe('pptx')
    expect(detectMaterialKind(ZIP, 'skript.docx')).toBe('docx')
  })
  it('lehnt andere ZIP-Archive ab (zum Beispiel Excel oder .zip)', () => {
    expect(detectMaterialKind(ZIP, 'tabelle.xlsx')).toBeNull()
    expect(detectMaterialKind(ZIP, 'archiv.zip')).toBeNull()
    expect(detectMaterialKind(ZIP, 'alt.ppt')).toBeNull()
  })
})

describe('checkMaterialFile – Vorprüfung im Browser (PROJ-132)', () => {
  it('lässt PDF, Word und PowerPoint bis 4 MB durch', () => {
    for (const name of ['a.pdf', 'b.docx', 'c.pptx', 'd.DOC']) {
      expect(checkMaterialFile({ name, size: 1000 })).toBeNull()
    }
    expect(checkMaterialFile({ name: 'a.pdf', size: MATERIAL_MAX_BYTES })).toBeNull()
  })
  it('meldet falsche Dateiart mit den erlaubten Arten', () => {
    expect(checkMaterialFile({ name: 'bild.png', size: 10 })).toMatch(/PDF, Word \(\.docx\) und PowerPoint \(\.pptx\)/)
  })
  it('meldet zu große und leere Dateien, bevor etwas hochgeladen wird', () => {
    expect(checkMaterialFile({ name: 'a.pdf', size: MATERIAL_MAX_BYTES + 1 })).toMatch(/größer als 4 MB/)
    expect(checkMaterialFile({ name: 'a.pdf', size: 0 })).toMatch(/leer/)
  })
})

describe('splitMaterial – nichts geht verloren (PROJ-132)', () => {
  it('jeder Teil hält die Grenze ein und alle Wörter bleiben in Reihenfolge erhalten', () => {
    const paragraphs = Array.from({ length: 60 }, (_, i) => `Absatz ${i}: ` + 'Wort '.repeat(40 + (i % 7) * 30))
    const text = paragraphs.join('\n\n')
    const parts = splitMaterial(text, 2000)
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(2000)
    const words = (s: string) => s.split(/\s+/).filter(Boolean)
    expect(words(parts.join('\n\n'))).toEqual(words(text))
  })
  it('gibt bei leerem Text keine Teile zurück', () => {
    expect(splitMaterial('   \n\n ')).toEqual([])
  })
})

describe('parseIntakeTable – Fach- und Themen-Spalte (PROJ-132)', () => {
  const row = {
    question_text: 'Was regelt die CMR?',
    antwort_a: 'Den internationalen Straßengüterverkehr',
    antwort_b: 'Den Seeverkehr',
    antwort_c: 'Den Luftverkehr',
    antwort_d: 'Die Binnenschifffahrt',
    antwort_e: 'Den Bahnverkehr',
    korrekte_antwort: 'a',
  }

  it('übernimmt Fach-Kürzel (groß) und Thema je Zeile', () => {
    const result = parseIntakeTable([{ ...row, fach_code: 'lop', thema: ' Lagerlogistik ' }])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.questions[0].fach_code).toBe('LOP')
    expect(result.questions[0].thema).toBe('Lagerlogistik')
    expect(result.questions[0].correct_index).toBe(0)
    expect(result.questions[0].errors).toEqual([])
  })

  it('leere Fach-/Themen-Zellen bleiben leer (dann gilt das oben gewählte Thema)', () => {
    const result = parseIntakeTable([{ ...row, fach_code: '', thema: '' }])
    expect(result.ok && result.questions[0].fach_code).toBeNull()
    expect(result.ok && result.questions[0].thema).toBeNull()
  })

  it('erlaubt reine Freitext-Tabellen ohne Antwort-Spalten', () => {
    const result = parseIntakeTable([{ question_text: 'Nenne zwei Incoterms.', typ: 'Freitext', musterantwort: 'EXW und DDP' }])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.questions[0].type).toBe('open')
    expect(result.questions[0].errors).toEqual([])
  })

  it('unbekannte Schwierigkeit wird „mittel“, ungültige richtige Antwort wird als Fehler markiert', () => {
    const result = parseIntakeTable([{ ...row, korrekte_antwort: 'F', schwierigkeit: 'extrem' }])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.questions[0].difficulty).toBe('mittel')
    expect(result.questions[0].errors).toContain('Es fehlt die richtige Antwort.')
  })
})

describe('parseIntakeAnswer – Randfälle (PROJ-132)', () => {
  it('liest eine reine Liste ohne „rows“-Hülle', () => {
    const result = parseIntakeAnswer(
      JSON.stringify([{ question_text: 'F?', antwort_a: '1', antwort_b: '2', antwort_c: '3', antwort_d: '4', antwort_e: '5', korrekte_antwort: 'B' }]),
    )
    expect(result.ok && result.questions[0].correct_index).toBe(1)
  })
  it('leere Liste ergibt den verständlichen Fehlersatz', () => {
    const result = parseIntakeAnswer('{ "rows": [] }')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/ganze Antwort der KI/)
  })
})

describe('validateIntakeQuestion & intakeDescription – Randfälle (PROJ-132)', () => {
  it('Freitext ohne Fragetext meldet den fehlenden Fragetext', () => {
    expect(
      validateIntakeQuestion({ question_text: '  ', type: 'open', options: [], correct_index: null, sample_answer: 'x', explanation: null }),
    ).toContain('Es fehlt der Fragetext.')
  })
  it('Einzahl und lange Dateinamen im Protokolltext', () => {
    expect(intakeDescription('table', 1)).toBe('1 Frage aus Tabelle übernommen')
    const long = 'x'.repeat(150) + '.csv'
    expect(intakeDescription('material', 3, long).length).toBeLessThan(120)
  })
})
