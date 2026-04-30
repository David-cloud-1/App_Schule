import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '../../_lib/auth'
import { extractText, MAX_FILE_BYTES } from '../../ai-generate/_lib/process-job'

export const maxDuration = 60

export type ExtractedQuestion = {
  question_text: string
  options: string[]
  correct_index: number | null
  needs_review: boolean
  fach_code: string | null
}

interface ClaudeExtractionResponse {
  questions: ExtractedQuestion[]
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

const EXTRACTION_PROMPT = `Du bist ein Datentransformations-Tool für IHK-Prüfungsaufgaben (Speditionskaufleute Bayern).

Extrahiere alle Multiple-Choice-Fragen aus dem Dokument EXAKT wie sie im Original stehen.

STRENGE REGELN:
1. Fragetext und Antwortoptionen WÖRTLICH übernehmen — kein Umformulieren, keine Korrekturen
2. Alle Antwortoptionen übernehmen (üblicherweise A–D oder A–E)
3. Korrekte Antwort: Falls im Dokument markiert → correct_index (0-basiert, A=0, B=1 usw.). Falls nicht erkennbar → null + needs_review: true
4. Keine eigenen Fragen erfinden, keine Antworten ergänzen
5. Lückentexte, Berechnungsaufgaben und reine Textaufgaben überspringen

FÄCHER zuordnen: BGP, KSK, STG, LOP, PUG

Antworte NUR mit diesem JSON (kein Markdown, kein Text davor/danach):
{
  "questions": [
    {
      "question_text": "Wortlaut der Frage exakt?",
      "options": ["Antwort A", "Antwort B", "Antwort C", "Antwort D"],
      "correct_index": 0,
      "needs_review": false,
      "fach_code": "STG"
    }
  ]
}`

function parseClaudeJson(text: string): ClaudeExtractionResponse | null {
  try {
    return JSON.parse(text) as ClaudeExtractionResponse
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(text.slice(start, end + 1)) as ClaudeExtractionResponse
    } catch {
      return null
    }
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Keine Datei übermittelt.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Ungültiger Dateityp. Nur PDF und DOCX sind erlaubt.' },
      { status: 400 }
    )
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'Datei ist leer.' }, { status: 400 })
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: 'Datei überschreitet das Limit von 50 MB.' },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let text: string
  try {
    text = await extractText(buffer, file.type)
  } catch {
    return NextResponse.json(
      { error: 'Text konnte nicht aus der Datei extrahiert werden.' },
      { status: 400 }
    )
  }

  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: 'Dokument enthält keinen verwertbaren Text.' },
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI-Service ist nicht konfiguriert.' },
      { status: 500 }
    )
  }

  const client = new Anthropic({ apiKey })

  const promptContent = `${EXTRACTION_PROMPT}\n\n--- DOKUMENT ---\n${text.slice(0, 80_000)}\n--- ENDE ---`

  let responseText: string
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: promptContent }],
    })
    const block = message.content[0]
    if (!block || block.type !== 'text') {
      return NextResponse.json(
        { error: 'AI-Antwort konnte nicht verarbeitet werden.' },
        { status: 500 }
      )
    }
    responseText = block.text
  } catch {
    return NextResponse.json(
      { error: 'AI-Service nicht erreichbar.' },
      { status: 500 }
    )
  }

  const parsed = parseClaudeJson(responseText)
  if (!parsed || !Array.isArray(parsed.questions)) {
    return NextResponse.json(
      { error: 'AI-Antwort enthielt kein gültiges JSON.' },
      { status: 500 }
    )
  }

  const questions: ExtractedQuestion[] = parsed.questions
    .filter(
      (q): q is ExtractedQuestion =>
        !!q &&
        typeof q.question_text === 'string' &&
        q.question_text.trim().length > 0 &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        q.options.every((o) => typeof o === 'string' && o.length > 0)
    )
    .map((q) => ({
      question_text: q.question_text,
      options: q.options.slice(0, 5),
      correct_index:
        typeof q.correct_index === 'number' &&
        q.correct_index >= 0 &&
        q.correct_index < Math.min(q.options.length, 5)
          ? q.correct_index
          : null,
      needs_review: Boolean(q.needs_review) || q.correct_index === null,
      fach_code: typeof q.fach_code === 'string' ? q.fach_code : null,
    }))

  return NextResponse.json({ questions })
}
