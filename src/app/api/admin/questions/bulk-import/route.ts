import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../../_lib/auth'
import { checkImportRows, type ImportRow } from '@/lib/question-import'
import { getDepartmentById } from '@/lib/departments'
import { fetchDepartmentSubjects, formatAllowedCodes, normalizeSubjectCode } from '@/lib/subjects'

const RowSchema = z.object({
  question_text: z.string().min(1).max(1000),
  antwort_a: z.string().min(1).max(500),
  antwort_b: z.string().min(1).max(500),
  antwort_c: z.string().min(1).max(500),
  antwort_d: z.string().min(1).max(500),
  antwort_e: z.string().min(1).max(500),
  korrekte_antwort: z.enum(['A', 'B', 'C', 'D', 'E']),
  erklaerung: z.string().max(2000).optional().nullable(),
  fach_code: z.string().min(1).max(20),
  schwierigkeit: z.enum(['leicht', 'mittel', 'schwer']),
  // Erlaubte Stufen hängen am Fachbereich — geprüft je Zeile weiter unten
  klassenstufe: z.coerce.number().int().min(1).max(13).optional().nullable(),
  thema: z.string().max(100).optional().nullable(),
})

const BodySchema = z.object({
  rows: z.array(RowSchema).min(1).max(500),
  // Bewusstes Überstimmen der Qualitätsprüfung durch den Admin
  allow_flagged: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user, departmentId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Fächer und Klassenstufen des Bereichs (PROJ-22): ein Kürzel gilt nur in
  // seinem Bereich; unbekannte Kürzel werden zeilengenau abgelehnt.
  const department = await getDepartmentById(supabase, departmentId)
  let departmentSubjects
  try {
    departmentSubjects = await fetchDepartmentSubjects(supabase, departmentId, { activeOnly: true })
  } catch (err) {
    console.error('[bulk-import] subject load', err)
    return NextResponse.json({ error: 'Failed to load subjects' }, { status: 500 })
  }
  const subjectMap = new Map(departmentSubjects.map((s) => [normalizeSubjectCode(s.code), s.id]))
  const allowedCodes = formatAllowedCodes(departmentSubjects)
  const classLevels = department?.classLevels ?? []

  const rejected: { index: number; question_text: string; reason: string }[] = []
  const rejectedIndexes = new Set<number>()
  parsed.data.rows.forEach((row, index) => {
    let reason: string | null = null
    if (!subjectMap.has(normalizeSubjectCode(row.fach_code))) {
      reason = `fach_code "${row.fach_code}" gibt es in diesem Fachbereich nicht — erlaubt: ${allowedCodes}`
    } else if (row.klassenstufe != null && !classLevels.includes(row.klassenstufe)) {
      reason = `klassenstufe ${row.klassenstufe} gibt es in diesem Fachbereich nicht — erlaubt: ${classLevels.join(', ') || 'keine (weglassen)'}`
    }
    if (reason) {
      rejected.push({ index, question_text: row.question_text, reason })
      rejectedIndexes.add(index)
    }
  })

  // Qualitätsprüfung: läuft ohne KI und damit ohne Kosten. Beanstandete
  // Zeilen werden nicht importiert, sondern zurückgemeldet — der Admin kann
  // sie extern korrigieren lassen oder den Import bewusst erzwingen.
  const check = checkImportRows(parsed.data.rows as ImportRow[])
  const flaggedIndexes = new Set(check.flagged.map((f) => f.index))
  const allowFlagged = parsed.data.allow_flagged === true
  const rowsToImport = parsed.data.rows.filter(
    (_, i) => !rejectedIndexes.has(i) && (allowFlagged || !flaggedIndexes.has(i))
  )

  if (rowsToImport.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: rejected.length,
      rejected,
      flagged: check.flagged.map((f) => ({
        index: f.index,
        question_text: f.row.question_text,
        issues: f.blockers.map((b) => b.message),
      })),
    })
  }

  // Preload topic lookup: (subject_id + name) → topic id
  const { data: allTopics } = await supabase
    .from('topics')
    .select('id, name, subject_id')
    .in('subject_id', departmentSubjects.map((s) => s.id))
    .limit(5000)
  const topicMap = new Map<string, string>()
  for (const t of allTopics ?? []) {
    topicMap.set(`${t.subject_id}::${(t.name as string).toLowerCase()}`, t.id as string)
  }

  let imported = 0
  let skipped = rejected.length

  for (const row of rowsToImport) {
    const subjectId = subjectMap.get(normalizeSubjectCode(row.fach_code))
    if (!subjectId) {
      skipped++
      continue
    }

    // Resolve or create topic if provided
    let topicId: string | null = null
    if (row.thema && row.thema.trim().length > 0) {
      const topicKey = `${subjectId}::${row.thema.trim().toLowerCase()}`
      if (topicMap.has(topicKey)) {
        topicId = topicMap.get(topicKey)!
      } else {
        const { data: newTopic } = await supabase
          .from('topics')
          .insert({ subject_id: subjectId, name: row.thema.trim() })
          .select('id')
          .single()
        if (newTopic) {
          topicId = newTopic.id as string
          topicMap.set(topicKey, topicId)
        }
      }
    }

    const { data: question, error: qErr } = await supabase
      .from('questions')
      .insert({
        question_text: row.question_text,
        difficulty: row.schwierigkeit,
        explanation: row.erklaerung ?? null,
        is_active: true,
        class_level: row.klassenstufe ?? null,
        topic_id: topicId,
      })
      .select('id')
      .single()

    if (qErr || !question) {
      console.error('[bulk-import] question insert', qErr)
      skipped++
      continue
    }

    const letters = ['A', 'B', 'C', 'D', 'E'] as const
    const texts: Record<(typeof letters)[number], string> = {
      A: row.antwort_a,
      B: row.antwort_b,
      C: row.antwort_c,
      D: row.antwort_d,
      E: row.antwort_e,
    }
    const answerRows = letters.map((letter, idx) => ({
      question_id: question.id,
      option_text: texts[letter],
      is_correct: letter === row.korrekte_antwort,
      display_order: idx + 1,
    }))

    const { error: aErr } = await supabase.from('answer_options').insert(answerRows)
    if (aErr) {
      console.error('[bulk-import] answer insert', aErr)
      await supabase.from('questions').delete().eq('id', question.id)
      skipped++
      continue
    }

    const { error: lErr } = await supabase
      .from('question_subjects')
      .insert({ question_id: question.id, subject_id: subjectId })
    if (lErr) {
      console.error('[bulk-import] subject link', lErr)
      await supabase.from('answer_options').delete().eq('question_id', question.id)
      await supabase.from('questions').delete().eq('id', question.id)
      skipped++
      continue
    }

    imported++
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'question.bulk_import',
    object_type: 'question',
    details: {
      imported,
      skipped,
      total: parsed.data.rows.length,
      flagged: check.flagged.length,
      forced: allowFlagged && check.flagged.length > 0,
      rejected: rejected.length,
    },
    department_id: departmentId,
  })

  return NextResponse.json({
    imported,
    skipped,
    rejected,
    flagged: allowFlagged
      ? []
      : check.flagged.map((f) => ({
          index: f.index,
          question_text: f.row.question_text,
          issues: f.blockers.map((b) => b.message),
        })),
  })
}
