import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '../../_lib/auth'

const UpdateSchema = z.object({
  is_active: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  duration_minutes: z.number().int().min(1).max(600).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { data: existing } = await supabase
    .from('exam_question_sets')
    .select('part')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Set not found' }, { status: 404 })

  // When activating, deactivate other sets for the same part
  if (parsed.data.is_active) {
    await supabase
      .from('exam_question_sets')
      .update({ is_active: false })
      .eq('part', existing.part)
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('exam_question_sets')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update exam set' }, { status: 500 })
  return NextResponse.json({ set: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const { error } = await supabase.from('exam_question_sets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete exam set' }, { status: 500 })
  return NextResponse.json({ success: true })
}
