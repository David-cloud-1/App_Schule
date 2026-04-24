import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, writeAuditLog } from '../_lib/auth'

const ListQuerySchema = z.object({
  subject_id: z.string().uuid().optional(),
})

const CreateSchema = z.object({
  subject_id: z.string().uuid(),
  name: z.string().min(1).max(100).trim(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase } = auth

  const parsed = ListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  )
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  let query = supabase
    .from('topics')
    .select('id, name, subject_id, created_at, subjects(id, code, name)')
    .order('name')

  if (parsed.data.subject_id) {
    query = query.eq('subject_id', parsed.data.subject_id)
  }

  const { data, error } = await query
  if (error) {
    console.error('[GET /api/admin/topics]', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }

  return NextResponse.json({ topics: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { subject_id, name } = parsed.data

  const { data, error } = await supabase
    .from('topics')
    .insert({ subject_id, name })
    .select('id, name, subject_id, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ein Thema mit diesem Namen existiert bereits in diesem Fach.' },
        { status: 409 }
      )
    }
    console.error('[POST /api/admin/topics]', error)
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
  }

  await writeAuditLog(supabase, {
    admin_id: user.id,
    action_type: 'topic.create',
    object_type: 'topic',
    object_id: data.id,
    object_label: name,
  })

  return NextResponse.json({ topic: data }, { status: 201 })
}
