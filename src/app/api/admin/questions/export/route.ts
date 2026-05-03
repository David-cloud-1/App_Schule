import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../_lib/auth'

const ExportQuerySchema = z.object({
  q: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  difficulty: z.enum(['leicht', 'mittel', 'schwer']).optional(),
  class_level: z.coerce.number().int().refine((v) => [10, 11, 12].includes(v)).optional(),
  topic_id: z.string().uuid().optional(),
  missing_topic: z.enum(['true']).optional(),
})

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const parsed = ExportQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { q, subject, status, difficulty, class_level, topic_id, missing_topic } = parsed.data

  let subjectFilteredIds: string[] | null = null
  if (subject) {
    const code = subject.toUpperCase()
    const { data: subjectRow } = await supabase
      .from('subjects')
      .select('id')
      .eq('code', code)
      .single()

    if (!subjectRow) {
      return new NextResponse('Fragetext,Fach,Schwierigkeit,Jahrgangsstufe,Thema,Antwort A,Antwort B,Antwort C,Antwort D,Antwort E,Richtige Antwort,Erklärung,Status\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fragen.csv"',
        },
      })
    }

    const { data: links } = await supabase
      .from('question_subjects')
      .select('question_id')
      .eq('subject_id', subjectRow.id)

    subjectFilteredIds = (links ?? []).map((l) => l.question_id as string)
    if (subjectFilteredIds.length === 0) {
      return new NextResponse('Fragetext,Fach,Schwierigkeit,Jahrgangsstufe,Thema,Antwort A,Antwort B,Antwort C,Antwort D,Antwort E,Richtige Antwort,Erklärung,Status\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="fragen.csv"',
        },
      })
    }
  }

  let query = supabase
    .from('questions')
    .select(
      `id, question_text, explanation, difficulty, class_level, is_active,
       answer_options ( id, option_text, is_correct, display_order ),
       question_subjects ( subjects ( id, code, name ) ),
       topics ( id, name )`
    )
    .order('created_at', { ascending: false })
    .limit(5000)

  if (subjectFilteredIds) query = query.in('id', subjectFilteredIds)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (class_level) query = query.eq('class_level', class_level)
  if (topic_id) query = query.eq('topic_id', topic_id)
  if (missing_topic === 'true') query = query.is('topic_id', null)
  if (status === 'active') query = query.eq('is_active', true)
  else if (status === 'inactive') query = query.eq('is_active', false)
  if (q?.trim()) query = query.ilike('question_text', `%${q.trim()}%`)

  const { data, error } = await query
  if (error) {
    console.error('[GET /api/admin/questions/export]', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }

  const header = 'Fragetext,Fach,Schwierigkeit,Jahrgangsstufe,Thema,Antwort A,Antwort B,Antwort C,Antwort D,Antwort E,Richtige Antwort,Erklärung,Status'

  const rows = (data ?? []).map((q) => {
    const sorted = [...(q.answer_options ?? [])].sort(
      (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order
    )
    const answers = sorted.map((a: { option_text: string }) => a.option_text)
    const correctIdx = sorted.findIndex((a: { is_correct: boolean }) => a.is_correct)
    const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : ''
    const faecher = (q.question_subjects ?? [])
      .map((qs: { subjects: { code: string }[] | { code: string } | null }) => {
        const s = qs.subjects
        if (!s) return undefined
        return Array.isArray(s) ? s[0]?.code : s.code
      })
      .filter(Boolean)
      .join('|')
    const topicsRaw = q.topics as unknown
    const topic = Array.isArray(topicsRaw)
      ? ((topicsRaw[0] as { name: string } | undefined)?.name ?? '')
      : ((topicsRaw as { name: string } | null)?.name ?? '')

    return [
      escapeCsv(q.question_text),
      escapeCsv(faecher),
      escapeCsv(q.difficulty),
      escapeCsv(q.class_level != null ? String(q.class_level) : ''),
      escapeCsv(topic),
      escapeCsv(answers[0] ?? ''),
      escapeCsv(answers[1] ?? ''),
      escapeCsv(answers[2] ?? ''),
      escapeCsv(answers[3] ?? ''),
      escapeCsv(answers[4] ?? ''),
      escapeCsv(correctLetter),
      escapeCsv(q.explanation),
      escapeCsv(q.is_active ? 'aktiv' : 'inaktiv'),
    ].join(',')
  })

  const csv = '﻿' + [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fragen-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
