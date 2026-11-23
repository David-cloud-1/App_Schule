import { NextRequest, NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../../_lib/auth'
import { hakenSchema } from '@/lib/checklisten/katalog'
import {
  NOT_FOUND,
  VARIANTE_UNGUELTIG,
  aufruf,
  listenKennung,
  parseBody,
  varianteGueltig,
} from '../../_lib/checklisten-api'

const ROUTE = 'api/admin/checklisten/[id]/haken'

type Ctx = { params: Promise<{ id: string }> }

/**
 * PUT /api/admin/checklisten/[id]/haken {schritt, erledigt, variante?}
 * (PROJ-122): setzt oder entfernt einen Haken im offenen Durchlauf; gibt es noch
 * keinen, entsteht er hier. Die Anfrage nennt den GEWÜNSCHTEN Zustand, nicht
 * „umschalten“ – dieselbe Anfrage zweimal ändert nichts (Doppelklick, zwei Geräte).
 * Ob der Schritt zur Liste gehört, prüft die App-Seite; hier gilt nur Form und Menge.
 */
export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const { id } = await ctx.params
  const checkliste = listenKennung(id)
  if (!checkliste) return NOT_FOUND()

  const body = await parseBody(request, hakenSchema)
  if (body.error) return body.error
  if (!varianteGueltig(checkliste, body.data.variante)) return VARIANTE_UNGUELTIG()

  const res = await aufruf<string>(auth.supabase, ROUTE, 'checkliste_haken_setzen', {
    p_checkliste: checkliste,
    p_schritt: body.data.schritt,
    p_erledigt: body.data.erledigt,
    p_variante: body.data.variante ?? null,
  })
  if (res.error) return res.error
  return NextResponse.json({ durchlaufId: res.data, schritt: body.data.schritt, erledigt: body.data.erledigt })
}
