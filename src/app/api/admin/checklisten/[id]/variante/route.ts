import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { variantenSchema } from '@/lib/checklisten/katalog'
import {
  NOT_FOUND,
  VARIANTE_UNGUELTIG,
  aufruf,
  listenKennung,
  parseBody,
  varianteGueltig,
} from '../../_lib/checklisten-api'

const ROUTE = 'api/admin/checklisten/[id]/variante'

type Ctx = { params: Promise<{ id: string }> }

/**
 * PUT /api/admin/checklisten/[id]/variante {variante} (PROJ-122): wählt die
 * Variante des offenen Durchlaufs (null = Auswahl aufheben). Haken von
 * Schritten, die in der neuen Variante entfallen, bleiben gespeichert.
 */
export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  const checkliste = listenKennung(id)
  if (!checkliste) return NOT_FOUND()

  const body = await parseBody(request, variantenSchema)
  if (body.error) return body.error
  if (!varianteGueltig(checkliste, body.data.variante)) return VARIANTE_UNGUELTIG()

  const res = await aufruf<string>(auth.supabase, ROUTE, 'checkliste_variante_setzen', {
    p_checkliste: checkliste,
    p_variante: body.data.variante,
  })
  if (res.error) return res.error
  return NextResponse.json({ durchlaufId: res.data, variante: body.data.variante })
}
