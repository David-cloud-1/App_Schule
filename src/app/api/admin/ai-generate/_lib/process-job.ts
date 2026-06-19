import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

export { MAX_FILE_BYTES }

interface GeneratedQuestion {
  question_text: string
  options: string[]
  correct_index: number
  explanation: string
  review_required: boolean
}

interface ClaudeResponse {
  questions: GeneratedQuestion[]
}

const SUBJECT_NAMES: Record<string, string> = {
  BGP: 'Betriebliche und gesamtwirtschaftliche Prozesse',
  KSK: 'Kaufmännische Steuerung und Kontrolle',
  STG: 'Speditionelle und transportrelevante Geschäftsprozesse',
  LOP: 'Logistische Leistungsprozesse',
  PUG: 'Politik und Gesellschaft',
}

const EXAM_CONTEXT = `
Du erstellst Prüfungsfragen für angehende Speditionskaufleute (IHK Bayern).
Fächer: BGP (Betriebliche und gesamtwirtschaftliche Prozesse), KSK (Kaufmännische Steuerung und Kontrolle), STG (Speditionelle und transportrelevante Geschäftsprozesse), LOP (Logistische Leistungsprozesse), PUG (Politik und Gesellschaft).
Erstelle ausschließlich Multiple-Choice-Fragen mit genau 5 Antwortoptionen, wobei exakt eine korrekt ist.
Setze "review_required": true wenn die Frage eine eindeutige korrekte Antwort nicht zweifelsfrei belegt.
`

function detectWordFormat(buffer: Buffer): 'docx' | 'doc' | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return 'docx'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return 'doc'
  }
  return null
}

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf') {
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule
    const result = await pdfParse(buffer)
    return result.text
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const format = detectWordFormat(buffer) ??
      (mimeType === 'application/msword' ? 'doc' : 'docx')

    if (format === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }

    const WordExtractorModule = await import('word-extractor')
    const WordExtractor =
      (WordExtractorModule as unknown as { default: new () => { extract: (buf: Buffer) => Promise<{ getBody: () => string }> } }).default ??
      (WordExtractorModule as unknown as new () => { extract: (buf: Buffer) => Promise<{ getBody: () => string }> })
    const extractor = new WordExtractor()
    const doc = await extractor.extract(buffer)
    return doc.getBody()
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

interface GenerationContext {
  classLevel: number | null
  subjectCode: string | null
  topicName: string | null
}

export async function generateQuestionsWithClaude(
  text: string,
  ctx: GenerationContext = { classLevel: null, subjectCode: null, topicName: null }
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY ist nicht konfiguriert.')
  const client = new Anthropic({ apiKey })

  const truncated = text.slice(0, 80_000)

  const hints: string[] = []

  if (ctx.classLevel) {
    hints.push(`Die Fragen sollen dem Niveau von Klasse ${ctx.classLevel} entsprechen.`)
  } else {
    hints.push('Die Fragen sind für alle Klassenstufen geeignet.')
  }

  if (ctx.subjectCode) {
    const subjectName = SUBJECT_NAMES[ctx.subjectCode] ?? ctx.subjectCode
    hints.push(`Das Fach ist: ${ctx.subjectCode} (${subjectName}). Erstelle ausschließlich Fragen zu diesem Fach.`)
  }

  if (ctx.topicName) {
    hints.push(`Das Thema ist: "${ctx.topicName}". Erstelle ausschließlich Fragen zu diesem Thema.`)
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `${EXAM_CONTEXT}
${hints.join('\n')}

Dokumentinhalt:
${truncated}

Erstelle bis zu 75 Prüfungsfragen auf Basis dieses Dokuments.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in diesem Format (kein Markdown, kein Text davor oder danach):
{
  "questions": [
    {
      "question_text": "...",
      "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
      "correct_index": 0,
      "explanation": "Erklärung warum die Antwort korrekt ist",
      "review_required": false
    }
  ]
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected Claude response type')

  const rawText = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  let parsed: ClaudeResponse
  try {
    parsed = JSON.parse(rawText) as ClaudeResponse
  } catch {
    throw new Error('Claude returned invalid JSON')
  }

  if (!Array.isArray(parsed.questions)) throw new Error('No questions array in Claude response')

  return parsed.questions.filter(
    (q) =>
      q.question_text &&
      Array.isArray(q.options) &&
      q.options.length === 5 &&
      typeof q.correct_index === 'number' &&
      q.correct_index >= 0 &&
      q.correct_index <= 4
  )
}

export async function processJob(
  supabase: SupabaseClient,
  jobId: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  try {
    const { data: job } = await supabase
      .from('generation_jobs')
      .select('class_level, subject_code, topic_id, topics(name)')
      .eq('id', jobId)
      .single()

    const classLevel = (job?.class_level as number | null) ?? null
    const subjectCode = (job?.subject_code as string | null) ?? null
    const topicId = (job?.topic_id as string | null) ?? null
    const topicName = (job?.topics as unknown as { name: string } | null)?.name ?? null

    const text = await extractText(buffer, mimeType)

    if (!text || text.trim().length < 50) {
      await supabase
        .from('generation_jobs')
        .update({ status: 'error', error_message: 'Dokument enthält keinen verwertbaren Text.' })
        .eq('id', jobId)
      return
    }

    const questions = await generateQuestionsWithClaude(text, { classLevel, subjectCode, topicName })

    if (questions.length === 0) {
      await supabase
        .from('generation_jobs')
        .update({ status: 'error', error_message: 'Keine Fragen aus dem Dokument generiert.' })
        .eq('id', jobId)
      return
    }

    const draftRows = questions.map((q) => ({
      job_id: jobId,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation ?? null,
      status: q.review_required ? 'review_required' : 'pending',
      class_level: classLevel,
      subject_code: subjectCode,
      topic_id: topicId,
    }))

    await supabase.from('questions_draft').insert(draftRows)

    await supabase
      .from('generation_jobs')
      .update({ status: 'completed', questions_generated: questions.length })
      .eq('id', jobId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    await supabase
      .from('generation_jobs')
      .update({ status: 'error', error_message: message })
      .eq('id', jobId)
  }
}
