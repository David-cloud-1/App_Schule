// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { strToU8, zipSync } from 'fflate'
import { chainMock, hasCall } from '@/test/supabase-chain-mock'
import { POST as promptPost } from './prompt/route'
import { POST as previewPost } from './preview/route'
import { POST as acceptPost } from './accept/route'
import { POST as materialPost } from './material/route'

vi.mock('@/lib/supabase-server', () => ({ createClient: vi.fn() }))
import { createClient } from '@/lib/supabase-server'

const SPED = 'dept-sped'
const TOUR = 'dept-tour'
const TOPIC = '11111111-1111-4111-8111-111111111111'
const OTHER_TOPIC = '22222222-2222-4222-8222-222222222222'

const DEPARTMENT_ROW = {
  id: SPED, code: 'SPED', slug: 'spedition', domain: null, name: 'Speditionskaufleute', app_name: 'SpediLern',
  tagline: '', meta_title: '', meta_description: '', icon_name: 'Truck', currency_name: 'Frachtmünzen',
  hof_name: 'Speditionshof', prompt_role: 'erfahrene Lehrkraft', target_group: 'Auszubildende', prompt_notes: null,
  class_levels: [10, 11, 12], pseudonym_nouns: [],
}

interface World {
  topics?: { id: string; name: string; subject_id: string }[]
  subjects?: { id: string; name: string; code: string; department_id: string }[]
  questions?: { topic_id: string; question_text: string; class_level: number | null }[]
  insertQuestionsError?: boolean
  auditFails?: boolean
}

let mock: ReturnType<typeof chainMock>

function setup(world: World = {}) {
  const topics = world.topics ?? [{ id: TOPIC, name: 'Lagerlogistik', subject_id: 's-lop' }]
  const subjects = world.subjects ?? [{ id: 's-lop', name: 'Logistische Leistungsprozesse', code: 'LOP', department_id: SPED }]
  const questions = world.questions ?? []
  mock = chainMock(
    (table, calls) => {
      if (table === 'profiles') return { data: { role: 'admin', department_id: SPED } }
      if (table === 'departments' && !hasCall(calls, 'maybeSingle') && !hasCall(calls, 'single')) return { data: [{ id: SPED }, { id: TOUR }] }
      if (table === 'departments') return { data: DEPARTMENT_ROW }
      if (table === 'topics') return { data: topics }
      if (table === 'subjects') return { data: subjects }
      if (table === 'questions' && hasCall(calls, 'insert')) {
        if (world.insertQuestionsError) return { error: { message: 'boom' } }
        const rows = (calls.find((c) => c.method === 'insert')!.args[0] as { question_text: string }[]).map((r, i) => ({ id: `q-${i + 1}`, question_text: r.question_text }))
        return { data: rows }
      }
      if (table === 'questions') return { data: questions }
      if (table === 'admin_audit_log' && world.auditFails) return { error: { message: 'kein Protokoll' } }
      return {}
    },
    { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'admin-1', email: 'a@b.de' } } }) } },
  )
  vi.mocked(createClient).mockResolvedValue(mock.client as never)
}

const req = (body: unknown) => new NextRequest('http://localhost/api/x', { method: 'POST', body: JSON.stringify(body) })

const goodRow = {
  question_text: 'Welche Aussage zur Kostenrechnung trifft zu?',
  antwort_a: 'Sie verteilt Gemeinkosten gleichmäßig auf alle Mitarbeitenden.',
  antwort_b: 'Sie ordnet Erlöse bevorzugt den einzelnen Kostenstellen zu.',
  antwort_c: 'Sie ordnet Kosten verursachungsgerecht den Kostenträgern zu.',
  antwort_d: 'Sie ermittelt die Steuerlast des Unternehmens im Jahr.',
  antwort_e: 'Sie erfasst die Lagerbestände zum Ende des Geschäftsjahres.',
  korrekte_antwort: 'C',
  erklaerung: 'Die KLR ordnet Kosten verursachungsgerecht zu.',
  schwierigkeit: 'mittel',
}

// Diese Antworten bemängelt der Torwächter (Signalwörter in 3 von 5 Optionen)
const flaggedAnswers = [
  'Sie ordnet Kosten verursachungsgerecht den Kostenträgern zu.',
  'Sie ordnet Erlöse ausschließlich den Kostenstellen zu.',
  'Sie ersetzt die Finanzbuchhaltung vollständig im Betrieb.',
  'Sie ermittelt nur die Steuerlast des Unternehmens jährlich.',
  'Sie erfasst lediglich die Lagerbestände zum Jahresende.',
]

beforeEach(() => vi.clearAllMocks())

describe('POST intake/prompt', () => {
  const body = { topic_id: TOPIC, class_level: 11, count: 10, text: 'Das Hochregallager spart Fläche und erlaubt schnellen Zugriff auf Paletten.' }

  it('baut den Auftrag mit Thema, Zahl und Text, ohne dass etwas zu ersetzen ist', async () => {
    setup()
    const res = await promptPost(req(body))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.prompt).toContain('genau 10')
    expect(json.prompt).toContain('„Lagerlogistik“')
    expect(json.prompt).toContain('Hochregallager')
    expect(json.tooLong).toBe(false)
  })

  it('meldet ein gelöschtes Thema mit dem Satz aus der Spec', async () => {
    setup({ topics: [] })
    const res = await promptPost(req(body))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Das Thema gibt es nicht mehr. Bitte wähle ein anderes.')
  })

  it('behandelt ein Thema aus einem fremden Bereich wie ein fehlendes', async () => {
    setup({ subjects: [{ id: 's-lop', name: 'X', code: 'X', department_id: 'dept-fremd' }] })
    expect((await promptPost(req(body))).status).toBe(404)
  })

  it('lehnt unerlaubte Zahlen, zu kurze Texte und unbekannte Stufen ab', async () => {
    setup()
    expect((await promptPost(req({ ...body, count: 7 }))).status).toBe(400)
    expect((await promptPost(req({ ...body, text: 'kurz' }))).status).toBe(400)
    expect((await promptPost(req({ ...body, class_level: 5 }))).status).toBe(400)
  })
})

describe('POST intake/preview', () => {
  it('liest eine Antwort der KI, schlägt die Stufe aus den vorhandenen Fragen vor und trägt sie ein', async () => {
    setup({ questions: [10, 10, 10, 11].map((l, i) => ({ topic_id: TOPIC, question_text: `Alt ${i}?`, class_level: l })) })
    const res = await previewPost(req({ topic_id: TOPIC, answer: JSON.stringify({ rows: [goodRow] }), requested: 10 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.topic).toMatchObject({ label: 'LOP › Lagerlogistik', suggested_class_level: 10 })
    expect(json.requested).toBe(10)
    expect(json.items[0]).toMatchObject({ topic_id: TOPIC, duplicate: false, reasons: [] })
    expect(json.items[0].question.class_level).toBe(10)
  })

  it('markiert eine Frage, die es im Thema schon gibt', async () => {
    setup({ questions: [{ topic_id: TOPIC, question_text: goodRow.question_text.toLowerCase(), class_level: 11 }] })
    const json = await (await previewPost(req({ topic_id: TOPIC, answer: JSON.stringify({ rows: [goodRow] }) }))).json()
    expect(json.items[0].duplicate).toBe(true)
    expect(json.items[0].reasons).toContain('Gibt es schon in diesem Thema.')
  })

  it('meldet unlesbare Antworten mit dem Satz aus der Spec und verlangt ein Thema', async () => {
    setup()
    const bad = await previewPost(req({ topic_id: TOPIC, answer: 'Das kann ich leider nicht.' }))
    expect(bad.status).toBe(422)
    expect((await bad.json()).error).toContain('Kopiere bitte die ganze Antwort der KI')
    expect((await previewPost(req({ answer: 'x' }))).status).toBe(400)
  })

  it('liest eine Tabelle und nennt Zeile und Grund bei einer fehlerhaften Zeile', async () => {
    setup()
    const rows = [goodRow, { ...goodRow, question_text: 'Zweite Frage?', korrekte_antwort: '' }]
    const json = await (await previewPost(req({ topic_id: TOPIC, rows }))).json()
    expect(json.items[1].question.source_row).toBe(3)
    expect(json.items[1].reasons).toContain('Es fehlt die richtige Antwort.')
    expect(json.items[0].reasons).toEqual([])
  })

  it('findet das Thema einer Tabellenzeile über Fach-Kürzel und Thema und meldet ein unbekanntes Thema', async () => {
    setup()
    const rows = [
      { ...goodRow, fach_code: 'LOP', thema: 'lagerlogistik' },
      { ...goodRow, question_text: 'Andere?', fach_code: 'LOP', thema: 'Gibt es nicht' },
    ]
    const json = await (await previewPost(req({ rows }))).json()
    expect(json.items[0]).toMatchObject({ topic_id: TOPIC, topic_label: 'LOP › Lagerlogistik' })
    expect(json.items[1].topic_id).toBeNull()
    expect(json.items[1].reasons.join(' ')).toContain('Das Thema „Gibt es nicht“ gibt es im Fach LOP nicht')
  })

  it('sagt bei einer Tabelle ohne Thema, dass das Thema fehlt', async () => {
    setup()
    const json = await (await previewPost(req({ rows: [goodRow] }))).json()
    expect(json.items[0].reasons).toContain('Es fehlt das Thema. Gehe zurück und wähle ein Thema, oder trage es in der Tabelle ein.')
  })

  it('legt nichts in der Datenbank an', async () => {
    setup()
    await previewPost(req({ topic_id: TOPIC, answer: JSON.stringify({ rows: [goodRow] }) }))
    expect(mock.writes.filter((w) => w.table !== 'admin_audit_log')).toEqual([])
  })
})

describe('POST intake/accept', () => {
  const item = (extra: Record<string, unknown> = {}) => ({
    topic_id: TOPIC,
    question_text: goodRow.question_text,
    type: 'multiple_choice',
    answers: ['antwort_a', 'antwort_b', 'antwort_c', 'antwort_d', 'antwort_e'].map((k, i) => ({
      text: (goodRow as Record<string, string>)[k],
      is_correct: i === 2,
    })),
    explanation: goodRow.erklaerung,
    difficulty: 'mittel',
    class_level: 11,
    ...extra,
  })

  it('speichert Fragen, Antworten und Fach-Verknüpfung, protokolliert den Vorgang und bündelt ihn', async () => {
    setup()
    const res = await acceptPost(req({ source: 'material', file_name: 'skript.pdf', items: [item(), item({ question_text: 'Zweite Frage zur Kostenrechnung?' })] }))
    expect(res.status).toBe(201)
    expect((await res.json()).imported).toBe(2)

    const questionWrite = mock.writes.find((w) => w.table === 'questions' && w.method === 'insert')!
    expect((questionWrite.payload as { is_active: boolean; topic_id: string; class_level: number }[]).every((r) => r.is_active && r.topic_id === TOPIC && r.class_level === 11)).toBe(true)
    expect((mock.writes.find((w) => w.table === 'answer_options')!.payload as unknown[]).length).toBe(10)
    expect(mock.writes.find((w) => w.table === 'question_subjects')!.payload).toEqual([
      { question_id: 'q-1', subject_id: 's-lop' },
      { question_id: 'q-2', subject_id: 's-lop' },
    ])
    expect(mock.writes.find((w) => w.table === 'admin_audit_log')!.payload).toMatchObject({
      action_type: 'question.intake',
      object_label: '2 Fragen aus Material „skript.pdf“ übernommen',
    })
  })

  it('speichert Freitext-Fragen ohne Antwortoptionen', async () => {
    setup()
    const res = await acceptPost(req({ source: 'table', items: [{ topic_id: TOPIC, question_text: 'Erkläre den Frachtbrief.', type: 'open', sample_answer: 'Begleitpapier.', difficulty: 'leicht', class_level: 10 }] }))
    expect(res.status).toBe(201)
    expect(mock.writes.some((w) => w.table === 'answer_options')).toBe(false)
    expect((mock.writes.find((w) => w.table === 'questions')!.payload as { type: string; sample_answer: string }[])[0]).toMatchObject({ type: 'open', sample_answer: 'Begleitpapier.' })
  })

  it('übernimmt nichts, wenn eine Frage nicht in Ordnung ist, und nennt welche', async () => {
    setup()
    const broken = item({ answers: item().answers.map((a) => ({ ...a, is_correct: false })) })
    const res = await acceptPost(req({ source: 'material', items: [item(), broken] }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.rejected).toEqual([{ index: 1, reason: 'Es fehlt die richtige Antwort.' }])
    expect(mock.writes.filter((w) => w.table === 'questions')).toEqual([])
  })

  it('verlangt eine Stufe des Bereichs', async () => {
    setup()
    expect((await acceptPost(req({ source: 'material', items: [item({ class_level: null })] }))).status).toBe(400)
    expect((await acceptPost(req({ source: 'material', items: [item({ class_level: 9 })] }))).status).toBe(400)
  })

  it('lehnt Fragen mit Torwächter-Fund ab, außer die Lehrkraft hat sie bewusst angehakt', async () => {
    setup()
    const flagged = item({ answers: flaggedAnswers.map((text, i) => ({ text, is_correct: i === 0 })) })
    const blocked = await acceptPost(req({ source: 'material', items: [flagged] }))
    expect(blocked.status).toBe(400)
    expect((await blocked.json()).rejected[0].reason).toContain('Signalwort')
    setup()
    expect((await acceptPost(req({ source: 'material', allow_flagged: true, items: [flagged] }))).status).toBe(201)
  })

  it('übernimmt nichts in ein Thema, das es nicht mehr gibt oder das fremd ist', async () => {
    setup({ topics: [] })
    const res = await acceptPost(req({ source: 'material', items: [item()] }))
    expect(res.status).toBe(404)
    expect(mock.writes.filter((w) => w.table === 'questions')).toEqual([])
    setup()
    expect((await acceptPost(req({ source: 'material', items: [item({ topic_id: OTHER_TOPIC })] }))).status).toBe(404)
  })

  it('nimmt alles zurück, wenn Speichern oder Protokollieren scheitert', async () => {
    setup({ insertQuestionsError: true })
    expect((await acceptPost(req({ source: 'material', items: [item()] }))).status).toBe(500)

    setup({ auditFails: true })
    const res = await acceptPost(req({ source: 'material', items: [item()] }))
    expect(res.status).toBe(503)
    expect(mock.writes.some((w) => w.table === 'questions' && w.method === 'delete')).toBe(true)
  })

  it('lehnt mehr als 200 Fragen und leere Listen ab', async () => {
    setup()
    expect((await acceptPost(req({ source: 'material', items: [] }))).status).toBe(400)
    expect((await acceptPost(req({ source: 'material', items: Array.from({ length: 201 }, () => item()) }))).status).toBe(400)
  })
})

describe('POST intake/material', () => {
  const slide = (text: string) => `<p:sld><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:sld>`
  const pptx = (...texts: string[]) =>
    Buffer.from(zipSync(Object.fromEntries(texts.map((t, i) => [`ppt/slides/slide${i + 1}.xml`, strToU8(slide(t))]))))

  const upload = (data: Buffer | string, name: string) => {
    const form = new FormData()
    form.set('file', new File([data as BlobPart], name))
    return materialPost(new NextRequest('http://localhost/api/x', { method: 'POST', body: form }))
  }

  it('liest eine PowerPoint-Datei und gibt den Text als einen Teil zurück', async () => {
    setup()
    const res = await upload(pptx('Das Hochregallager spart Fläche und erlaubt schnellen Zugriff.', 'Der Kommissionierer sammelt Waren nach Auftrag zusammen.'), 'skript.pptx')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.kind).toBe('pptx')
    expect(json.parts).toHaveLength(1)
    expect(json.parts[0]).toContain('Hochregallager')
  })

  it('teilt ein langes Skript offen in Teile, ohne etwas zu kürzen', async () => {
    setup()
    const slides = Array.from({ length: 40 }, (_, i) => `Folie ${i}: ${'Das ist ein Satz über Lagerlogistik. '.repeat(40)}`)
    const json = await (await upload(pptx(...slides), 'lang.pptx')).json()
    expect(json.parts.length).toBeGreaterThan(1)
    expect(json.parts.join('\n\n')).toContain('Folie 39')
  })

  it('meldet eine Datei ohne Text als vermutlich eingescannt', async () => {
    setup()
    const res = await upload(pptx('x'), 'leer.pptx')
    expect(res.status).toBe(422)
    expect((await res.json()).error).toContain('vermutlich eingescannt')
  })

  it('weist falsche Dateiarten und zu große Dateien sofort ab', async () => {
    setup()
    const wrong = await upload('nur Text', 'notiz.txt')
    expect(wrong.status).toBe(400)
    expect((await wrong.json()).error).toContain('PowerPoint')
    const big = await upload(Buffer.alloc(4 * 1024 * 1024 + 1), 'gross.pdf')
    expect(big.status).toBe(413)
  })
})
