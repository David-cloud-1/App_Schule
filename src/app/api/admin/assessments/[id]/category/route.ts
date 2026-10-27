import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin, writeAuditLog } from '../../../_lib/auth'
import { MAX_CLASS_NAME_LENGTH, resolveCategory } from '@/lib/assessment-category'

// PROJ-39: Ablage (Schuljahr, Klasse, Fach) — bewusst getrennt vom allgemeinen
// PATCH, der nur Entwürfe bearbeiten darf. Die Ablage berührt weder Fragen noch
// Zeiten, Notenschlüssel oder Teilnehmer und bleibt daher in jedem Status änderbar.
const CategorySchema = z
  .object({
    className: z.string().max(MAX_CLASS_NAME_LENGTH).nullable().optional(),
    subjectId: z.string().uuid().nullable().optional(),
    schoolYear: z.string().optional(),
  })
  .refine((v) => v.className !== undefined || v.subjectId !== undefined || v.schoolYear !== undefined, {
    message: 'Mindestens ein Feld angeben.',
  })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = CategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  // Zugriff über die Row-Level-Security des Bereichs: fremde Nachweise sind nicht lesbar
  const { data: assessment } = await supabase
    .from('graded_assessments')
    .select('id, title, department_id')
    .eq('id', id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const category = await resolveCategory(supabase, assessment.department_id, parsed.data, id)
  if (!category.ok) return NextResponse.json({ error: category.error }, { status: category.status })

  const { error } = await supabase.from('graded_assessments').update(category.columns).eq('id', id)
  if (error) return NextResponse.json({ error: 'Speichern fehlgeschlagen.' }, { status: 500 })

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'graded_assessment.category',
    object_type: 'graded_assessment',
    object_id: id,
    object_label: assessment.title,
    details: category.columns,
    department_id: assessment.department_id,
  })

  return NextResponse.json({
    success: true,
    schoolYear: category.columns.school_year,
    className: category.columns.class_name,
    subjectId: category.columns.subject_id,
  })
}
