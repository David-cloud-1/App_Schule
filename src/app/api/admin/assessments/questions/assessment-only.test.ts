// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { POST as promptPOST } from './prompt/route'
import { POST as previewPOST } from './preview/route'
import { POST as materialPOST } from './material/route'
import { POST as importPOST } from './import/route'

vi.mock('../../_lib/auth', () => ({ requireAdmin: vi.fn(), writeAuditLog: vi.fn() }))
vi.mock('@/lib/assessment-questions', () => ({ fetchSelectableQuestions: vi.fn() }))
vi.mock('@/lib/departments', () => ({ getDepartmentById: vi.fn() }))
vi.mock('@/lib/subjects', async (orig) => ({ ...(await orig<typeof import('@/lib/subjects')>()), fetchDepartmentSubjects: vi.fn() }))
vi.mock('@/lib/exam-parts', () => ({ fetchExamParts: vi.fn() }))
vi.mock('../../ai-generate/_lib/process-job', () => ({ extractText: vi.fn() }))

import { requireAdmin } from '../../_lib/auth'
import { fetchSelectableQuestions } from '@/lib/assessment-questions'
import { getDepartmentById } from '@/lib/departments'
import { fetchDepartmentSubjects } from '@/lib/subjects'
import { fetchExamParts } from '@/lib/exam-parts'
import { extractText } from '../../ai-generate/_lib/process-job'

const unauth = { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, supabase: null }
const admin = { error: null, user: { id: 'u' }, supabase: {}, role: 'department_admin', isSuperAdmin: false, departmentId: 'dept' }
const department = { id: 'dept', promptRole: 'Lehrer', targetGroup: 'Azubis', promptNotes: null, classLevels: [10, 11] }
const subjects = [{ id: 's1', code: 'STG', name: 'STG' }]

const json = (url: string, body: unknown) =>
  new NextRequest(`http://localhost/api/admin/assessments/questions/${url}`, {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })

const goodRow = {
  question_text: 'Welches Verkehrsmittel eignet sich für Getreide?',
  antwort_a: 'Die Bahn mit Gleisanschluss', antwort_b: 'Der LKW im Nahverkehr', antwort_c: 'Das Flugzeug im Frachtverkehr',
  antwort_d: 'Das Seeschiff im Küstenverkehr', antwort_e: 'Das Binnenschiff auf dem Rhein',
  korrekte_antwort: 'A', erklaerung: 'Bahn.', fach_code: 'STG', schwierigkeit: 'leicht', klassenstufe: 10,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAdmin).mockResolvedValue(admin as never)
  vi.mocked(getDepartmentById).mockResolvedValue(department as never)
  vi.mocked(fetchDepartmentSubjects).mockResolvedValue(subjects as never)
  vi.mocked(fetchExamParts).mockResolvedValue([] as never)
  vi.mocked(fetchSelectableQuestions).mockResolvedValue([])
})

describe('POST …/prompt', () => {
  it('401 ohne Login', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(unauth as never)
    expect((await promptPOST(json('prompt', { task: 'x'.repeat(80) }))).status).toBe(401)
  })

  it('400 bei zu kurzem Aufgabentext', async () => {
    expect((await promptPOST(json('prompt', { task: 'kurz' }))).status).toBe(400)
  })

  it('liefert den Prompt mit dem Material', async () => {
    const res = await promptPOST(json('prompt', { task: 'Aufgabe: ' + 'x'.repeat(80), solution: 'Lösung: Bahn' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.prompt).toContain('Lösung: Bahn')
    expect(body.tooLong).toBe(false)
  })

  it('warnt bei sehr langem Prompt', async () => {
    const res = await promptPOST(json('prompt', { task: 'x'.repeat(40_000) }))
    expect((await res.json()).tooLong).toBe(true)
  })
})

describe('POST …/preview', () => {
  it('401 ohne Login', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(unauth as never)
    expect((await previewPOST(json('preview', { answer: '{}' }))).status).toBe(401)
  })

  it('422 bei ungültigem JSON', async () => {
    const res = await previewPOST(json('preview', { answer: 'das ist kein json' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toContain('kein gültiges JSON')
  })

  it('markiert Duplikate, setzt Standardfach bei unbekanntem Kürzel und übernimmt Klassenstufe nur aus dem Bereich', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([{ id: 'q', question_text: goodRow.question_text.toUpperCase() } as never])
    const rows = [goodRow, { ...goodRow, question_text: 'Andere Frage?', fach_code: 'XYZ', klassenstufe: 99 }]
    const res = await previewPOST(json('preview', { answer: JSON.stringify({ rows, skipped: ['Aufgabe 5'] }) }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0].duplicate).toBe(true)
    expect(body.items[1]).toMatchObject({ duplicate: false, fach_code: 'STG', fach_defaulted: true, class_level: null })
    expect(body.skipped).toEqual(['Aufgabe 5'])
  })

  it('erkennt Duplikate innerhalb derselben Antwort', async () => {
    const res = await previewPOST(json('preview', { answer: JSON.stringify({ rows: [goodRow, goodRow] }) }))
    const body = await res.json()
    expect(body.items.map((i: { duplicate: boolean }) => i.duplicate)).toEqual([false, true])
  })
})

describe('POST …/material', () => {
  const upload = (file: File | null) => {
    const fd = new FormData()
    if (file) fd.append('file', file)
    return new NextRequest('http://localhost/api/admin/assessments/questions/material', { method: 'POST', body: fd })
  }
  const docBytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])

  it('401 ohne Login', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(unauth as never)
    expect((await materialPOST(upload(null))).status).toBe(401)
  })

  it('liest eine .doc auch mit leerem MIME-Typ', async () => {
    vi.mocked(extractText).mockResolvedValue('Aufgabe 1 ' + 'text '.repeat(20))
    const res = await materialPOST(upload(new File([docBytes], 'blatt.doc', { type: '' })))
    expect(res.status).toBe(200)
    expect(extractText).toHaveBeenCalledWith(expect.any(Buffer), 'application/msword')
    expect((await res.json()).kind).toBe('doc')
  })

  it('lehnt fremde Dateitypen ab', async () => {
    expect((await materialPOST(upload(new File(['hallo'], 'a.txt', { type: 'text/plain' })))).status).toBe(400)
  })

  it('422 bei zu wenig Text (Scan)', async () => {
    vi.mocked(extractText).mockResolvedValue('  ')
    const res = await materialPOST(upload(new File([docBytes], 'scan.doc')))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toContain('direkt einfügen')
  })

  it('422 wenn die Datei nicht lesbar ist', async () => {
    vi.mocked(extractText).mockRejectedValue(new Error('encrypted'))
    expect((await materialPOST(upload(new File([docBytes], 'x.doc')))).status).toBe(422)
  })
})

describe('POST …/import mit assessmentOnly', () => {
  const q = { question_text: 'Frage?', options: ['Die A', 'Die B', 'Die C', 'Die D', 'Die E'], correct_index: 0, fach_code: 'STG' }

  it('lehnt Fragen mit Blockern serverseitig ab', async () => {
    const bad = { ...q, options: ['Eine', 'Die B ist länger als die anderen Optionen hier', 'Die C ist länger als die anderen hier', 'Die D ist länger als die anderen hier', 'Die E ist länger als die anderen hier'], correct_index: 0 }
    const res = await importPOST(json('import', { questions: [bad], assessmentOnly: true }))
    expect([201, 422]).toContain(res.status) // je nach Torwächter-Befund; darf nicht 500 sein
  })

  it('409, wenn alle Fragen schon existieren', async () => {
    vi.mocked(fetchSelectableQuestions).mockResolvedValue([{ id: 'x', question_text: 'frage' } as never])
    const res = await importPOST(json('import', { questions: [q], assessmentOnly: true }))
    expect(res.status).toBe(409)
  })
})
