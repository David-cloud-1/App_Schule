import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  buildTemplateList,
  normalizeScale,
  validateTemplateName,
  validateTemplateScale,
} from '@/lib/grading-scale-templates'
import type { GradeBoundary } from '@/lib/graded-assessments'

const BodySchema = z.object({
  name: z.string(),
  scale: z.array(z.object({ grade: z.number(), minPercent: z.number() })),
  shared: z.boolean().default(false),
})

/** Eigene und geteilte Vorlagen. Welche Zeilen zurückkommen, entscheidet die Datenbank-Regel (RLS). */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('grading_scale_templates')
    .select('id, name, scale, shared, owner_id')
    .limit(500)
  if (error) return NextResponse.json({ error: 'Vorlagen konnten nicht geladen werden.' }, { status: 500 })

  const rows = data ?? []
  const otherOwnerIds = [...new Set(rows.map((r) => r.owner_id).filter((id): id is string => !!id && id !== user.id))]
  const ownerNameById = new Map<string, string>()
  if (otherOwnerIds.length > 0) {
    // Nur der Anzeigename, nie die E-Mail-Adresse
    const { data: profiles } = await createServiceClient()
      .from('profiles')
      .select('id, display_name')
      .in('id', otherOwnerIds)
    for (const p of profiles ?? []) {
      const name = (p as { display_name: string | null }).display_name?.trim()
      if (name) ownerNameById.set((p as { id: string }).id, name)
    }
  }

  return NextResponse.json({ templates: buildTemplateList(rows, user.id, ownerNameById) })
}

export async function POST(request: NextRequest) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })

  const nameResult = validateTemplateName(parsed.data.name)
  if ('error' in nameResult) return NextResponse.json({ error: nameResult.error }, { status: 400 })
  const scaleError = validateTemplateScale(parsed.data.scale)
  if (scaleError) return NextResponse.json({ error: scaleError }, { status: 400 })

  const { data, error } = await supabase
    .from('grading_scale_templates')
    .insert({
      owner_id: user.id,
      name: nameResult.name,
      scale: normalizeScale(parsed.data.scale as GradeBoundary[]),
      shared: parsed.data.shared,
    })
    .select('id')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Vorlage konnte nicht gespeichert werden.' }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
