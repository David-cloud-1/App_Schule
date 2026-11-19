import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { abwesenheitUpdateSchema, type Abwesenheit } from '@/lib/kalender'
import { NOT_FOUND, NO_STORE, callKalender, eintragParams, isUuid, parseBody } from '../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/[id]'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const res = await callKalender<Abwesenheit>(auth.supabase, ROUTE, 'abw_eintrag', { p_id: id })
  if (res.error) return res.error
  if (!res.data) return NOT_FOUND()
  return NextResponse.json({ item: res.data }, { headers: NO_STORE })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const body = await parseBody(request, abwesenheitUpdateSchema)
  if (body.error) return body.error

  const res = await callKalender<number>(auth.supabase, ROUTE, 'abw_aendern', {
    p_id: id,
    p_version: body.data.version,
    ...eintragParams(body.data),
  })
  if (res.error) return res.error
  return NextResponse.json({ version: res.data })
}

/** Löschen mit `?version=` (verhindert das Löschen eines inzwischen geänderten Eintrags). */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  if (!isUuid(id)) return NOT_FOUND()

  const version = Number(request.nextUrl.searchParams.get('version'))
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json({ error: 'Version fehlt.' }, { status: 400 })
  }

  const res = await callKalender(auth.supabase, ROUTE, 'abw_loeschen', { p_id: id, p_version: version })
  if (res.error) return res.error
  return NextResponse.json({ ok: true })
}
