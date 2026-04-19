import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../_lib/auth'
import { processJob, MAX_FILE_BYTES } from '../_lib/process-job'
import { createClient } from '@/lib/supabase-server'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { user } = auth

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

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Datei überschreitet das Limit von 50 MB.' }, { status: 400 })
  }

  if (file.size === 0) {
    return NextResponse.json({ error: 'Datei ist leer.' }, { status: 400 })
  }

  // Use a service-role client for background processing (bypasses RLS for inserts)
  const supabase = await createClient()

  const { data: job, error: jobErr } = await supabase
    .from('generation_jobs')
    .insert({
      admin_id: user.id,
      filename: file.name,
      file_size_bytes: file.size,
      status: 'processing',
    })
    .select('*')
    .single()

  if (jobErr || !job) {
    console.error('[POST /api/admin/ai-generate/upload] job insert', jobErr)
    return NextResponse.json({ error: 'Job konnte nicht erstellt werden.' }, { status: 500 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Fire-and-forget background processing — client polls via Supabase Realtime
  processJob(supabase, job.id, buffer, file.type).catch((err) =>
    console.error('[processJob background]', err)
  )

  return NextResponse.json({ job }, { status: 202 })
}
