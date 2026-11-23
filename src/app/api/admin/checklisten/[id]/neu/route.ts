import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { neuStartenSchema } from '@/lib/checklisten/katalog'
import {
  NOT_FOUND,
  VARIANTE_UNGUELTIG,
  aufruf,
  listenKennung,
  parseBody,
  varianteGueltig,
} from '../../_lib/checklisten-api'

const ROUTE = 'api/admin/checklisten/[id]/neu'

type Ctx = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/checklisten/[id]/neu {variante?} (PROJ-122): „Neu starten“.
 * Archiviert den offenen Durchlauf mit Datum und legt in einem Zug einen neuen
 * an. Nichts wird gelöscht. Die Frage „Wirklich neu starten?“ stellt die Seite.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  const checkliste = listenKennung(id)
  if (!checkliste) return NOT_FOUND()

  // Der Rumpf ist optional: ohne Rumpf startet der neue Durchlauf ohne Variante.
  const text = await request.text()
  let variante: string | null = null
  if (text.trim()) {
    const body = await parseBody(new NextRequest(request.url, { method: 'POST', body: text }), neuStartenSchema)
    if (body.error) return body.error
    variante = body.data.variante ?? null
  }
  if (!varianteGueltig(checkliste, variante)) return VARIANTE_UNGUELTIG()

  const res = await aufruf<string>(auth.supabase, ROUTE, 'checkliste_neu_starten', {
    p_checkliste: checkliste,
    p_variante: variante,
  })
  if (res.error) return res.error
  return NextResponse.json({ durchlaufId: res.data }, { status: 201 })
}
