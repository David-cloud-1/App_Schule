import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { KUERZEL_HINT, parseKuerzel } from '@/lib/konto'
import { requireTeacherRoleUser } from '../_lib/teacher-user'

const schema = z.object({ kuerzel: z.string().max(20).nullable() })

/**
 * Kürzel der eigenen Person setzen oder entfernen (PROJ-50). Schreibt nur die
 * eigene Zeile und nur diese Spalte (Spalten-Recht); die Format-Regel der
 * Datenbank ist die letzte Absicherung.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireTeacherRoleUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })

  const kuerzel = parseKuerzel(parsed.data.kuerzel ?? '')
  if (!kuerzel.ok) return NextResponse.json({ error: kuerzel.error }, { status: 400 })

  const { error } = await supabase.from('profiles').update({ kuerzel: kuerzel.value }).eq('id', user.id)
  if (error) {
    // 23514 = Format-Regel der Datenbank verletzt
    if (error.code === '23514') return NextResponse.json({ error: `Bitte ${KUERZEL_HINT}.` }, { status: 400 })
    console.error('[PATCH /api/profile/kuerzel]', error)
    return NextResponse.json({ error: 'Das Kürzel konnte nicht gespeichert werden.' }, { status: 500 })
  }
  return NextResponse.json({ kuerzel: kuerzel.value })
}
