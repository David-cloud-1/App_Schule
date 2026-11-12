import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { kern, kernFehlerAntwort, ungueltig } from '@/lib/werkzeugkiste-server'
import { editorZeileOderFehler, rohfassungSchema } from '@/lib/werkzeugkiste-editor-server'
import type { Block } from '@/lib/werkzeugkiste-editor'

type Kontext = { params: Promise<{ id: string }> }

/**
 * POST …/ablaeufe/:id/editor/rohfassung (PROJ-89) — übersetzt einen einzelnen
 * Block zwischen Struktur und YAML. Beides macht der Kern, damit die Rohfassung
 * genauso gelesen wird wie eine KI-Antwort beim Bauen.
 *   {richtung: 'schreiben', block} → {text}
 *   {richtung: 'lesen', text}      → {block}
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const eingabe = rohfassungSchema.safeParse(await request.json().catch(() => null))
  if (!eingabe.success) return ungueltig(eingabe.error)
  const { zeile, antwort } = await editorZeileOderFehler(auth.supabase, (await params).id)
  if (!zeile) return antwort
  try {
    if (eingabe.data.richtung === 'schreiben') {
      const r = await kern<{ text: string }>('/api/editor/block-yaml', { block: eingabe.data.block })
      return NextResponse.json({ text: String(r.text ?? '') })
    }
    const r = await kern<{ block: Block }>('/api/editor/block-lesen', { text: eingabe.data.text })
    return NextResponse.json({ block: r.block })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
