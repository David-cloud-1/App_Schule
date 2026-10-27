import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { extractText } from '../../../ai-generate/_lib/process-job'
import { detectMaterialKind, MATERIAL_MAX_BYTES, MIME_BY_KIND, MIN_MATERIAL_CHARS } from '@/lib/assessment-import'

export const maxDuration = 60

/**
 * PROJ-38: liest den Text einer Aufgaben- oder Lösungsdatei aus (PDF, .docx, .doc).
 * Kein KI-Aufruf, die Datei wird nicht gespeichert. Eine Datei pro Aufruf, weil
 * Vercel den Request-Body auf 4,5 MB begrenzt.
 */
export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
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
  if (file.size === 0) {
    return NextResponse.json({ error: 'Datei ist leer.' }, { status: 400 })
  }
  if (file.size > MATERIAL_MAX_BYTES) {
    return NextResponse.json(
      { error: 'Datei ist größer als 4 MB. Bitte den Text aus der Datei kopieren und direkt einfügen.' },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const kind = detectMaterialKind(buffer, file.name)
  if (!kind) {
    return NextResponse.json({ error: 'Ungültiger Dateityp. Erlaubt sind PDF, DOCX und DOC.' }, { status: 400 })
  }

  let text: string
  try {
    text = await extractText(buffer, MIME_BY_KIND[kind])
  } catch {
    return NextResponse.json(
      { error: 'Text konnte nicht aus der Datei gelesen werden (evtl. passwortgeschützt). Bitte den Text direkt einfügen.' },
      { status: 422 },
    )
  }

  text = text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (text.length < MIN_MATERIAL_CHARS) {
    return NextResponse.json(
      { error: 'Kein verwertbarer Text in der Datei (evtl. ein Scan). Bitte den Text direkt einfügen.' },
      { status: 422 },
    )
  }

  return NextResponse.json({ text, kind })
}
