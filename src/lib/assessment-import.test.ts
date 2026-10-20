import { describe, it, expect } from 'vitest'
import {
  buildAssessmentImportPrompt,
  parseAiAnswer,
  extractJson,
  duplicateKey,
  assessQuestionQuality,
  detectMaterialKind,
  MAX_IMPORT_QUESTIONS,
} from './assessment-import'

const department = {
  promptRole: 'erfahrener Berufsschullehrer',
  targetGroup: 'angehende Speditionskaufleute',
  promptNotes: null,
  classLevels: [10, 11, 12],
}
const subjects = [{ code: 'STG', name: 'Speditionelle Geschäftsprozesse' }]

const row = (over: Record<string, unknown> = {}) => ({
  question_text: 'Welches Verkehrsmittel eignet sich für 80 t Getreide?',
  antwort_a: 'Die Bahn über den Gleisanschluss',
  antwort_b: 'Der LKW im Nahverkehr',
  antwort_c: 'Das Flugzeug im Frachtverkehr',
  antwort_d: 'Das Seeschiff im Küstenverkehr',
  antwort_e: 'Das Binnenschiff auf dem Rhein',
  korrekte_antwort: 'A',
  erklaerung: 'Große Mengen mit Gleisanschluss: Bahn.',
  fach_code: 'STG',
  schwierigkeit: 'mittel',
  klassenstufe: 10,
  ...over,
})

describe('buildAssessmentImportPrompt', () => {
  it('enthält Aufgabe, Fächer, Qualitätsregeln und das JSON-Format', () => {
    const p = buildAssessmentImportPrompt(department, subjects, { task: 'Aufgabe 1: Nennen Sie zwei Vorteile des LKW.' })
    expect(p).toContain('Aufgabe 1: Nennen Sie zwei Vorteile des LKW.')
    expect(p).toContain('STG = Speditionelle Geschäftsprozesse')
    expect(p).toContain('REGELN FÜR ANTWORTOPTIONEN')
    expect(p).toContain('"rows"')
    expect(p).toContain('"skipped"')
    expect(p).toContain('angehende Speditionskaufleute')
  })

  it('verlangt ohne Lösungsblatt needs_review statt Raten', () => {
    const p = buildAssessmentImportPrompt(department, subjects, { task: 'x'.repeat(60) })
    expect(p).toContain('KEIN Lösungsblatt')
    expect(p).not.toContain('--- LÖSUNGSBLATT ---')
  })

  it('bindet das Lösungsblatt ein und verweist darauf', () => {
    const p = buildAssessmentImportPrompt(department, subjects, { task: 'Aufgabe', solution: 'Bahn, Flugzeug' })
    expect(p).toContain('--- LÖSUNGSBLATT ---\nBahn, Flugzeug')
    expect(p).toContain('stammt IMMER aus dem Lösungsblatt')
  })

  it('übernimmt Zusatzhinweise des Fachbereichs', () => {
    const p = buildAssessmentImportPrompt({ ...department, promptNotes: 'Duzen' }, subjects, { task: 'x' })
    expect(p).toContain('ZUSATZHINWEISE DER LEHRKRAFT:\nDuzen')
  })
})

describe('extractJson', () => {
  it('liest reines JSON', () => expect(extractJson('{"a":1}')).toEqual({ a: 1 }))
  it('liest JSON im Codeblock', () => expect(extractJson('Hier:\n```json\n{"a":1}\n```\nViel Erfolg')).toEqual({ a: 1 }))
  it('liest JSON mit Text davor und danach', () => expect(extractJson('Klar! {"a":1} Fertig.')).toEqual({ a: 1 }))
  it('liefert null bei Unsinn', () => expect(extractJson('kein json')).toBeNull())
})

describe('parseAiAnswer', () => {
  it('liest das Bulk-Import-Format', () => {
    const r = parseAiAnswer(JSON.stringify({ rows: [row()], skipped: ['Aufgabe 5: Zeichnung'] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.questions).toHaveLength(1)
    expect(r.questions[0]).toMatchObject({ correct_index: 0, difficulty: 'mittel', class_level: 10, needs_review: false, errors: [] })
    expect(r.questions[0].options).toHaveLength(5)
    expect(r.skipped).toEqual(['Aufgabe 5: Zeichnung'])
  })

  it('liest das Format questions/options/correct_index', () => {
    const r = parseAiAnswer(JSON.stringify({ questions: [{ question_text: 'F?', options: ['a', 'b', 'c'], correct_index: 2, fach_code: 'STG' }] }))
    expect(r.ok && r.questions[0].correct_index).toBe(2)
  })

  it('markiert fehlenden Schlüssel als needs_review', () => {
    const r = parseAiAnswer(JSON.stringify({ rows: [row({ korrekte_antwort: null, needs_review: true })] }))
    expect(r.ok && r.questions[0]).toMatchObject({ correct_index: null, needs_review: true })
  })

  it('meldet Strukturfehler je Frage statt abzustürzen', () => {
    const r = parseAiAnswer(JSON.stringify({ rows: [{ question_text: '' }, row({ antwort_b: 'Die Bahn über den Gleisanschluss' })] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.questions[0].errors.length).toBeGreaterThan(0)
    expect(r.questions[1].errors).toContain('Doppelte Antwortoptionen')
  })

  it('akzeptiert Antworten in einem ```-Block', () => {
    expect(parseAiAnswer('```json\n' + JSON.stringify({ rows: [row()] }) + '\n```').ok).toBe(true)
  })

  it('verständliche Fehler bei ungültigem JSON, fehlender Liste, leerer Liste und zu vielen Fragen', () => {
    expect(parseAiAnswer('nope')).toMatchObject({ ok: false, error: expect.stringContaining('kein gültiges JSON') })
    expect(parseAiAnswer('{"x":1}')).toMatchObject({ ok: false })
    expect(parseAiAnswer('{"rows":[]}')).toMatchObject({ ok: false, error: expect.stringContaining('keine Fragen') })
    const many = { rows: Array.from({ length: MAX_IMPORT_QUESTIONS + 1 }, () => row()) }
    expect(parseAiAnswer(JSON.stringify(many))).toMatchObject({ ok: false, error: expect.stringContaining('Teilen') })
  })

  it('fällt bei unbekannter Schwierigkeit auf mittel zurück', () => {
    const r = parseAiAnswer(JSON.stringify({ rows: [row({ schwierigkeit: 'sehr schwer' })] }))
    expect(r.ok && r.questions[0].difficulty).toBe('mittel')
  })
})

describe('duplicateKey', () => {
  it('ignoriert Groß-/Kleinschreibung, Leerraum und Satzzeichen am Ende', () => {
    expect(duplicateKey('Was  ist   LBS?')).toBe(duplicateKey('was ist lbs'))
  })
})

describe('assessQuestionQuality', () => {
  it('prüft nichts ohne bekannten Schlüssel', () => {
    expect(assessQuestionQuality({ question_text: 'F?', options: ['a', 'b'], correct_index: null, explanation: null })).toEqual({ blockers: [], warnings: [] })
  })

  it('findet den Satzanfang-Tell als Blocker', () => {
    const blockers = assessQuestionQuality({
      question_text: 'Was kennzeichnet den Leihvertrag?',
      options: [
        'Die entgeltliche Überlassung von Sachen auf Zeit',
        'Unentgeltliche Überlassung zum Gebrauch',
        'Die Herstellung eines Werkes gegen Vergütung',
        'Die Leistung von Diensten gegen Entgelt aller Art',
        'Die Übertragung von Eigentum gegen Kaufpreis',
      ],
      correct_index: 1,
      explanation: null,
    }).blockers
    expect(blockers.length).toBeGreaterThan(0)
  })
})

describe('detectMaterialKind', () => {
  it('erkennt PDF, DOC und DOCX am Inhalt', () => {
    expect(detectMaterialKind(Buffer.from('%PDF-1.7 ...'), 'x.pdf')).toBe('pdf')
    expect(detectMaterialKind(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]), 'x.doc')).toBe('doc')
    expect(detectMaterialKind(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]), 'x.docx')).toBe('docx')
  })

  it('erkennt .doc auch bei falscher Endung und lehnt fremde Dateien ab', () => {
    expect(detectMaterialKind(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]), 'blatt')).toBe('doc')
    expect(detectMaterialKind(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0]), 'tabelle.xlsx')).toBeNull()
    expect(detectMaterialKind(Buffer.from('hallo'), 'x.txt')).toBeNull()
  })
})
