import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import type { FreigabeOptionen } from '@/lib/werkzeugkiste-regal'
import { fehler } from '@/lib/werkzeugkiste-server'

/**
 * GET /api/admin/werkzeugkiste/regal/optionen (PROJ-53) — Auswahllisten für den
 * Teilen-Dialog: die Fachbereiche, in denen die Lehrkraft steht (Eintrag unter
 * „Meine Fächer“ oder Bereichs-Admin), und die Fächer, eigene zuerst. Namen von
 * Bereichen und Fächern sind nicht vertraulich.
 */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const [zustaendig, profil] = await Promise.all([
    auth.supabase.from('teacher_subject_assignments').select('department_id, subject_id').eq('teacher_id', auth.user.id).limit(500),
    auth.supabase.from('profiles').select('role, department_id').eq('id', auth.user.id).maybeSingle(),
  ])
  if (zustaendig.error || profil.error) return fehler('Die Auswahl konnte gerade nicht geladen werden.', 500)

  const eintraege = (zustaendig.data ?? []) as { department_id: string; subject_id: string | null }[]
  const bereichIds = new Set(eintraege.map((e) => e.department_id))
  const p = profil.data as { role?: string; department_id?: string | null } | null
  if (p?.role === 'department_admin' && p.department_id) bereichIds.add(p.department_id)
  const eigeneFaecher = new Set(eintraege.map((e) => e.subject_id).filter((s): s is string => !!s))

  const service = createServiceClient()
  const [bereiche, faecher] = await Promise.all([
    bereichIds.size > 0
      ? service.from('departments').select('id, name').in('id', [...bereichIds]).order('name').limit(100)
      : Promise.resolve({ data: [], error: null }),
    service.from('subjects').select('id, name').is('deleted_at', null).eq('is_active', true).order('name').limit(500),
  ])
  if (bereiche.error || faecher.error) return fehler('Die Auswahl konnte gerade nicht geladen werden.', 500)

  const antwort: FreigabeOptionen = {
    bereiche: ((bereiche.data ?? []) as { id: string; name: string }[]).map((b) => ({ id: b.id, name: b.name })),
    faecher: ((faecher.data ?? []) as { id: string; name: string }[])
      .map((f) => ({ id: f.id, name: f.name, eigen: eigeneFaecher.has(f.id) }))
      .sort((a, b) => Number(b.eigen) - Number(a.eigen) || a.name.localeCompare(b.name, 'de')),
  }
  return NextResponse.json(antwort, { headers: { 'Cache-Control': 'no-store' } })
}
