import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { normalizeScale, validateTemplateName, validateTemplateScale } from '@/lib/grading-scale-templates'
import type { GradeBoundary } from '@/lib/graded-assessments'

const PatchSchema = z
  .object({
    name: z.string().optional(),
    scale: z.array(z.object({ grade: z.number(), minPercent: z.number() })).optional(),
    shared: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.scale !== undefined || v.shared !== undefined)

type Ctx = { params: Promise<{ tid: string }> }

/** Umbenennen, überschreiben, Teilen ändern. Fremde Vorlagen trifft die Datenbank-Regel nicht → 404. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { tid } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  if (!z.string().uuid().safeParse(tid).success) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const parsed = PatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) {
    const r = validateTemplateName(parsed.data.name)
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: 400 })
    update.name = r.name
  }
  if (parsed.data.scale !== undefined) {
    const err = validateTemplateScale(parsed.data.scale)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
    update.scale = normalizeScale(parsed.data.scale as GradeBoundary[])
  }
  if (parsed.data.shared !== undefined) update.shared = parsed.data.shared

  const { data, error } = await supabase
    .from('grading_scale_templates')
    .update(update)
    .eq('id', tid)
    .select('id')
  if (error) return NextResponse.json({ error: 'Vorlage konnte nicht geändert werden.' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { tid } = await params
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  if (!z.string().uuid().safeParse(tid).success) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data, error } = await supabase.from('grading_scale_templates').delete().eq('id', tid).select('id')
  if (error) return NextResponse.json({ error: 'Vorlage konnte nicht gelöscht werden.' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
