import { NextRequest, NextResponse } from 'next/server'
import { requireContentAdmin } from '../../../_lib/auth'
import { extractText } from '../../../ai-generate/_lib/process-job'
import { detectMaterialKind, MATERIAL_MAX_BYTES, MIME_BY_KIND, MIN_MATERIAL_CHARS } from '@/lib/assessment-import'
import { splitMaterial } from '@/lib/question-intake'
import { PptxTooLargeError } from '@/lib/material-pptx'

export const maxDuration = 60

export interface IntakeMaterialResponse {
  /** Teile des Skripts, je höchstens so lang, dass ein Auftrag noch passt (meist genau einer) */
  parts: string[]
  chars: number
  kind: string
}

const NO_TEXT =
  'In dieser Datei steht kein lesbarer Text, sie ist vermutlich eingescannt. Nimm eine Datei, in der man Text markieren kann.'

/**
 * PROJ-132: liest den Text einer Skript-Datei (PDF, Word, PowerPoint) und teilt
 * ihn bei Bedarf in Teile. Kein KI-Aufruf, die Datei und ihr Text werden nicht
 * gespeichert. Eine Datei pro Aufruf (Vercel nimmt höchstens 4,5 MB an).
 */
export async function POST(request: NextRequest) {
  const auth = await requireContentAdmin()
  if (auth.error) return auth.error

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Die Datei konnte nicht gelesen werden. Bitte versuche es noch einmal.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Bitte wähle eine Datei aus.' }, { status: 400 })
  if (file.size === 0) return NextResponse.json({ error: 'Die Datei ist leer.' }, { status: 400 })
  if (file.size > MATERIAL_MAX_BYTES) {
    return NextResponse.json({ error: 'Die Datei ist größer als 4 MB. Nimm eine kleinere Datei oder teile sie auf.' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const kind = detectMaterialKind(buffer, file.name)
  if (!kind) {
    return NextResponse.json({ error: 'Diese Dateiart geht nicht. Erlaubt sind PDF, Word (.docx) und PowerPoint (.pptx).' }, { status: 400 })
  }

  let text: string
  try {
    text = await extractText(buffer, MIME_BY_KIND[kind])
  } catch (err) {
    if (err instanceof PptxTooLargeError) {
      return NextResponse.json(
        { error: 'Diese PowerPoint-Datei ist zu groß zum Lesen. Teile sie in kleinere Dateien auf.' },
        { status: 413 },
      )
    }
    return NextResponse.json(
      { error: 'Aus dieser Datei lässt sich kein Text lesen. Vielleicht ist sie mit einem Passwort geschützt.' },
      { status: 422 },
    )
  }

  text = text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (text.length < MIN_MATERIAL_CHARS) return NextResponse.json({ error: NO_TEXT }, { status: 422 })

  const body: IntakeMaterialResponse = { parts: splitMaterial(text), chars: text.length, kind }
  return NextResponse.json(body)
}
