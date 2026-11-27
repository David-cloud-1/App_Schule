import { describe, it, expect } from 'vitest'
import {
  MAX_PART_CHARS,
  NO_QUESTIONS_ERROR,
  TABLE_TEMPLATE,
  buildImproveRequest,
  buildIntakePrompt,
  checkIntakeQuestions,
  intakeDescription,
  parseIntakeAnswer,
  parseIntakeTable,
  salvageRows,
  splitMaterial,
  suggestClassLevel,
  validateIntakeQuestion,
  type IntakeQuestion,
} from './question-intake'
import Papa from 'papaparse'

const dept = { promptRole: 'erfahrene Lehrkraft', targetGroup: 'Auszubildende', promptNotes: 'Nutze Praxisbeispiele.', classLevels: [10, 11, 12] }

const goodRow = {
  question_text: 'Wofür steht die Abkürzung CMR?',
  antwort_a: 'Übereinkommen über den Beförderungsvertrag im internationalen Straßengüterverkehr',
  antwort_b: 'Eine Zollvorschrift der EU',
  antwort_c: 'Ein Versicherungsnachweis',
  antwort_d: 'Die Maut in Deutschland',
  antwort_e: 'Eine Lagerordnung',
  korrekte_antwort: 'A',
  erklaerung: 'Das CMR regelt den internationalen Straßentransport.',
  schwierigkeit: 'leicht',
}

describe('splitMaterial', () => {
  it('lässt kurze Texte in einem Teil', () => {
    expect(splitMaterial('Hallo Welt')).toEqual(['Hallo Welt'])
    expect(splitMaterial('   ')).toEqual([])
  })

  it('teilt lange Texte an Absatzgrenzen, kürzt nichts und hält die Grenze ein', () => {
    const paragraph = 'Satz eins. '.repeat(100).trim() // ~1.100 Zeichen
    const text = Array.from({ length: 60 }, (_, i) => `Absatz ${i}: ${paragraph}`).join('\n\n')
    const parts = splitMaterial(text)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.every((p) => p.length <= MAX_PART_CHARS)).toBe(true)
    expect(parts.join('\n\n')).toBe(text)
  })

  it('zerschneidet einen einzelnen riesigen Absatz an Satz- oder Wortgrenzen ohne Verlust', () => {
    const text = 'Wort '.repeat(20_000).trim()
    const parts = splitMaterial(text, 5_000)
    expect(parts.every((p) => p.length <= 5_000)).toBe(true)
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(text)
  })
})

describe('buildIntakePrompt', () => {
  const prompt = buildIntakePrompt(dept, {
    subjectName: 'Logistische Leistungsprozesse',
    topicName: 'Lagerlogistik',
    classLevel: 11,
    count: 10,
    text: 'Das Hochregallager spart Fläche.',
  })

  it('enthält Thema, Fach, Stufe, Zahl, Hinweise des Bereichs und den Text – nichts muss ersetzt werden', () => {
    expect(prompt).toContain('genau 10')
    expect(prompt).toContain('„Lagerlogistik“')
    expect(prompt).toContain('„Logistische Leistungsprozesse“')
    expect(prompt).toContain('Stufe 11')
    expect(prompt).toContain('Nutze Praxisbeispiele.')
    expect(prompt).toContain('Das Hochregallager spart Fläche.')
    expect(prompt).not.toMatch(/\[Hier|\[.*einfügen\]/)
  })

  it('verwendet für die Lehrkraft sichtbar keine Fachwörter wie JSON oder Prompt', () => {
    expect(prompt).not.toMatch(/json|prompt|api-key/i)
  })

  it('sagt bei mehreren Teilen, welcher Teil es ist', () => {
    const teil = buildIntakePrompt(dept, { subjectName: 'LOP', topicName: 'T', classLevel: null, count: 5, text: 'x', part: { index: 2, total: 3 } })
    expect(teil).toContain('Teil 2 von 3')
    expect(buildIntakePrompt(dept, { subjectName: 'LOP', topicName: 'T', classLevel: null, count: 5, text: 'x', part: { index: 1, total: 1 } })).not.toContain('Teile geteilt')
  })
})

describe('parseIntakeAnswer', () => {
  it('liest eine saubere Antwort', () => {
    const r = parseIntakeAnswer(JSON.stringify({ rows: [goodRow] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.truncated).toBe(false)
    expect(r.questions[0]).toMatchObject({ type: 'multiple_choice', correct_index: 0, difficulty: 'leicht', errors: [] })
    expect(r.questions[0].options).toHaveLength(5)
  })

  it('verträgt Text und Formatierung um die Antwort herum', () => {
    const r = parseIntakeAnswer('Hier sind deine Fragen:\n```json\n' + JSON.stringify({ rows: [goodRow] }) + '\n```\nViel Erfolg!')
    expect(r.ok && r.questions).toHaveLength(1)
  })

  it('verträgt Fluchtzeichen, die manche Chats vor Unterstriche setzen', () => {
    const raw = JSON.stringify({ rows: [goodRow] }).replace(/antwort_a/g, 'antwort\\_a')
    const r = parseIntakeAnswer(raw)
    expect(r.ok && r.questions[0].options[0]).toContain('Übereinkommen')
  })

  it('rettet die vollständigen Fragen aus einer abgeschnittenen Antwort und meldet das', () => {
    const full = JSON.stringify({ rows: [goodRow, { ...goodRow, question_text: 'Zweite Frage?' }, { ...goodRow, question_text: 'Dritte Frage?' }] })
    const cut = full.slice(0, full.lastIndexOf('"antwort_c"') + 12)
    const r = parseIntakeAnswer(cut)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.truncated).toBe(true)
    expect(r.questions.map((q) => q.question_text)).toEqual([goodRow.question_text, 'Zweite Frage?'])
  })

  it('antwortet auf Unlesbares mit dem Satz aus der Spec', () => {
    for (const raw of ['', '   ', 'Leider kann ich das nicht.', '{"rows": []}']) {
      expect(parseIntakeAnswer(raw)).toEqual({ ok: false, error: NO_QUESTIONS_ERROR })
    }
  })

  it('markiert fehlende richtige Antwort und falsche Antwortzahl als Fehler statt zu raten', () => {
    const r = parseIntakeAnswer(JSON.stringify({ rows: [{ ...goodRow, korrekte_antwort: null }, { ...goodRow, antwort_e: '' }] }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.questions[0].errors).toContain('Es fehlt die richtige Antwort.')
    expect(r.questions[1].errors.join(' ')).toMatch(/genau 5|leer/)
  })

  it('erkennt Freitext-Fragen mit Musterantwort', () => {
    const r = parseIntakeAnswer(JSON.stringify({ rows: [{ question_text: 'Erkläre den Frachtbrief.', typ: 'freitext', musterantwort: 'Begleitpapier.', schwierigkeit: 'mittel' }] }))
    expect(r.ok && r.questions[0]).toMatchObject({ type: 'open', sample_answer: 'Begleitpapier.', options: [], errors: [] })
  })

  it('übernimmt skipped und lehnt zu viele Fragen ab', () => {
    const r = parseIntakeAnswer(JSON.stringify({ rows: [goodRow], skipped: ['Aufgabe 5: Zeichnung'] }))
    expect(r.ok && r.skipped).toEqual(['Aufgabe 5: Zeichnung'])
    const many = parseIntakeAnswer(JSON.stringify({ rows: Array.from({ length: 201 }, () => goodRow) }))
    expect(many.ok).toBe(false)
  })
})

describe('salvageRows', () => {
  it('ignoriert Klammern und Anführungszeichen innerhalb von Texten', () => {
    const raw = '{"rows":[{"question_text":"Was bedeutet } und \\" hier?","antwort_a":"a"},{"question_text":"ange'
    expect(salvageRows(raw)).toEqual([{ question_text: 'Was bedeutet } und " hier?', antwort_a: 'a' }])
  })
  it('gibt null zurück, wenn gar keine Liste da ist', () => {
    expect(salvageRows('nur Text')).toBeNull()
  })
})

describe('parseIntakeTable', () => {
  it('liest die Beispiel-Tabelle: eine Auswahl- und eine Freitext-Frage mit Zeilennummern', () => {
    const rows = Papa.parse<Record<string, string>>(TABLE_TEMPLATE, { header: true, skipEmptyLines: true }).data
    const r = parseIntakeTable(rows)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.questions.map((q) => [q.type, q.source_row, q.errors.length])).toEqual([['multiple_choice', 2, 0], ['open', 3, 0]])
  })

  it('läuft mit alten Tabellen ohne die neuen Spalten und mit BOM und Großbuchstaben in der Kopfzeile', () => {
    const r = parseIntakeTable([{ '﻿Question_Text': goodRow.question_text, ANTWORT_A: 'a1', antwort_b: 'b', antwort_c: 'c', antwort_d: 'd', antwort_e: 'e', korrekte_antwort: 'b', fach_code: 'lop', schwierigkeit: 'schwer' }])
    expect(r.ok && r.questions[0]).toMatchObject({ correct_index: 1, fach_code: 'LOP', difficulty: 'schwer', errors: [] })
  })

  it('nennt die Zeile und den Grund bei fehlender richtiger Antwort', () => {
    const r = parseIntakeTable([{ ...goodRow }, { ...goodRow, korrekte_antwort: '' }])
    expect(r.ok && r.questions[1]).toMatchObject({ source_row: 3, errors: ['Es fehlt die richtige Antwort.'] })
  })

  it('meldet fehlende Spalten und leere Tabellen verständlich', () => {
    expect(parseIntakeTable([])).toMatchObject({ ok: false })
    expect(parseIntakeTable([{ frage: 'x' }])).toMatchObject({ ok: false, error: expect.stringContaining('question_text') })
    expect(parseIntakeTable([{ question_text: 'x', antwort_a: 'a' }])).toMatchObject({ ok: false, error: expect.stringContaining('antwort_b') })
  })
})

describe('validateIntakeQuestion', () => {
  const base: IntakeQuestion = { question_text: 'Frage?', type: 'multiple_choice', options: ['a', 'b', 'c', 'd', 'e'], correct_index: 2, sample_answer: null, explanation: null, difficulty: 'mittel', class_level: null, errors: [] }

  it('akzeptiert eine gültige Frage und Freitext mit Musterantwort', () => {
    expect(validateIntakeQuestion(base)).toEqual([])
    expect(validateIntakeQuestion({ ...base, type: 'open', options: [], correct_index: null, sample_answer: 'Muster' })).toEqual([])
  })

  it('findet doppelte, leere und zu lange Antworten und fehlende Musterantwort', () => {
    expect(validateIntakeQuestion({ ...base, options: ['a', 'A', 'c', 'd', 'e'] })).toContain('Zwei Antworten sind gleich.')
    expect(validateIntakeQuestion({ ...base, options: ['a', ' ', 'c', 'd', 'e'] })).toContain('Mindestens eine Antwort ist leer.')
    expect(validateIntakeQuestion({ ...base, options: ['a', 'x'.repeat(501), 'c', 'd', 'e'] }).join()).toContain('zu lang')
    expect(validateIntakeQuestion({ ...base, type: 'open', options: [], correct_index: null })).toContain('Es fehlt die Musterantwort.')
  })
})

describe('checkIntakeQuestions', () => {
  const q = (text: string, correct = 0): IntakeQuestion => ({
    question_text: text,
    type: 'multiple_choice',
    options: ['Eine kurze Antwort', 'Eine andere Antwort', 'Noch eine Antwort', 'Vierte Antwort hier', 'Fünfte Antwort hier'],
    correct_index: correct,
    sample_answer: null,
    explanation: 'Weil es so ist.',
    difficulty: 'mittel',
    class_level: null,
    errors: [],
  })

  it('erkennt Duplikate im Thema (Groß-/Kleinschreibung und Satzzeichen egal) und innerhalb der Vorschau', () => {
    const result = checkIntakeQuestions([q('Was ist ein CMR?'), q('was ist ein cmr'), q('Andere Frage?'), q('Andere Frage?')], ['Was ist ein CMR?'])
    expect(result.map((r) => r.duplicate)).toEqual([true, true, false, true])
    expect(result[0].reasons).toContain('Gibt es schon in diesem Thema.')
  })

  it('übernimmt Strukturfehler als Grund und prüft Fragen mit Fehlern nicht zusätzlich auf Muster', () => {
    const bad = { ...q('Kaputt?'), correct_index: null, errors: ['Es fehlt die richtige Antwort.'] }
    const [r] = checkIntakeQuestions([bad], [])
    expect(r.reasons).toEqual(['Es fehlt die richtige Antwort.'])
    expect(r.blockers).toEqual([])
  })

  it('lässt Freitext ohne Torwächter-Prüfung durch', () => {
    const open: IntakeQuestion = { ...q('Erkläre X.'), type: 'open', options: [], correct_index: null, sample_answer: 'Muster' }
    expect(checkIntakeQuestions([open], [])[0]).toMatchObject({ reasons: [], duplicate: false })
  })
})

describe('suggestClassLevel', () => {
  it('nimmt die klar häufigste Stufe der vorhandenen Fragen', () => {
    expect(suggestClassLevel([10, 10, 10, 11], [10, 11, 12])).toBe(10)
  })
  it('fragt nach, wenn die Stufen gemischt sind oder das Thema leer ist', () => {
    expect(suggestClassLevel([10, 11, 10, 11], [10, 11, 12])).toBeNull()
    expect(suggestClassLevel([], [10, 11, 12])).toBeNull()
    expect(suggestClassLevel([null, null], [10, 11, 12])).toBeNull()
  })
  it('nimmt die einzige Stufe, wenn der Bereich nur eine kennt, und ignoriert unerlaubte', () => {
    expect(suggestClassLevel([], [11])).toBe(11)
    expect(suggestClassLevel([9, 9, 12], [10, 11, 12])).toBe(12)
  })
})

describe('Protokolltext und Verbesserungsauftrag', () => {
  it('beschreibt die Übernahme mit Herkunft und Dateiname', () => {
    expect(intakeDescription('material', 12, 'skript.pdf')).toBe('12 Fragen aus Material „skript.pdf“ übernommen')
    expect(intakeDescription('table', 1)).toBe('1 Frage aus Tabelle übernommen')
  })

  it('nennt dem Verbesserungsauftrag Frage, Antworten und Grund', () => {
    const q: IntakeQuestion = { question_text: 'Frage?', type: 'multiple_choice', options: ['a', 'b', 'c', 'd', 'e'], correct_index: 1, sample_answer: null, explanation: null, difficulty: 'mittel', class_level: null, errors: [] }
    const text = buildImproveRequest([{ question: q, reasons: ['Die richtige Antwort ist die längste.'] }], 'Auszubildende')
    expect(text).toContain('1. Frage?')
    expect(text).toContain('B) b')
    expect(text).toContain('Richtig: B')
    expect(text).toContain('die längste')
  })
})
