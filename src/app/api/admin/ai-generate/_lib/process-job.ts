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

const EXAM_CONTEXT = `
Du erstellst Prüfungsfragen für angehende Speditionskaufleute (IHK Bayern).
Fächer: BGP (Betriebliche und gesamtwirtschaftliche Prozesse), KSK (Kaufmännische Steuerung und Kontrolle), STG (Speditionelle und transportrelevante Geschäftsprozesse), LOP (Logistische Leistungsprozesse).
Erstelle ausschließlich Multiple-Choice-Fragen mit genau 5 Antwortoptionen, wobei exakt eine korrekt ist.
Setze "review_required": true wenn die Frage eine eindeutige korrekte Antwort nicht zweifelsfrei belegt.
`

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
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

export async function generateQuestionsWithClaude(text: string): Promise<GeneratedQuestion[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const truncated = text.slice(0, 80_000) // stay within token limits

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `${EXAM_CONTEXT}

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

  let parsed: ClaudeResponse
  try {
    parsed = JSON.parse(content.text) as ClaudeResponse
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
    const text = await extractText(buffer, mimeType)

    if (!text || text.trim().length < 50) {
      await supabase
        .from('generation_jobs')
        .update({ status: 'error', error_message: 'Dokument enthält keinen verwertbaren Text.' })
        .eq('id', jobId)
      return
    }

    const questions = await generateQuestionsWithClaude(text)

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
