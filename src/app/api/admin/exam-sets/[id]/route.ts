import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'

const UpdateSchema = z.object({
  is_active: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
})

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
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
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('exam_question_sets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete exam set' }, { status: 500 })
  return NextResponse.json({ success: true })
}
