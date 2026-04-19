import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../_lib/auth'
import { processJob } from '../../../_lib/process-job'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { id } = await params

  const { data: job, error: fetchErr } = await supabase
    .from('generation_jobs')
    .select('id, file_path, filename, status')
    .eq('id', id)
    .single()

  if (fetchErr || !job) {
    return NextResponse.json({ error: 'Job nicht gefunden.' }, { status: 404 })
  }

  if (job.status !== 'error') {
    return NextResponse.json(
      { error: 'Nur fehlgeschlagene Jobs können erneut gestartet werden.' },
      { status: 400 }
    )
  }

  if (!job.file_path) {
    return NextResponse.json(
      { error: 'Originaldatei nicht mehr verfügbar. Bitte erneut hochladen.' },
      { status: 410 }
    )
  }

  // Download the file from Supabase Storage
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('ai-uploads')
    .download(job.file_path)

  if (dlErr || !fileData) {
    return NextResponse.json(
      { error: 'Datei konnte nicht aus dem Speicher geladen werden.' },
      { status: 500 }
    )
  }

  // Reset job to processing
  await supabase
    .from('generation_jobs')
    .update({ status: 'processing', error_message: null, questions_generated: null })
    .eq('id', id)

  // Delete previous drafts for this job
  await supabase.from('questions_draft').delete().eq('job_id', id)

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const ext = job.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  processJob(supabase, job.id, buffer, ext).catch((err) =>
    console.error('[processJob retry]', err)
  )

  return NextResponse.json({ jobId: id }, { status: 202 })
}
