import { NextResponse } from 'next/server'
import { requireAdmin } from '../_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Übersicht „Zuständigkeiten" (PROJ-48) — nur der Super-Admin sieht, wer
 * sich für welches Fach eingetragen hat. Gibt eine flache, bereits mit
 * Namen angereicherte Liste zurück; Gruppierung (nach Fach/nach Lehrkraft)
 * übernimmt die Oberfläche.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error
  const { supabase, isSuperAdmin } = auth

  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Nur der Super-Admin sieht diese Übersicht.' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('teacher_subject_assignments')
    .select(
      `
        id, created_at,
        teacher:teacher_id ( id, display_name ),
        department:department_id ( id, name, code ),
        subject:subject_id ( id, name, code )
      `
    )
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error('[GET /api/admin/teacher-assignments]', error)
    return NextResponse.json({ error: 'Übersicht konnte nicht geladen werden.' }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as {
    id: string
    created_at: string
    teacher: { id: string; display_name: string | null } | null
    department: { id: string; name: string; code: string } | null
    subject: { id: string; name: string; code: string } | null
  }[]

  // display_name wird bei der Registrierung nie automatisch gesetzt — als
  // Klarname-Fallback die E-Mail laden, wie an allen anderen Stellen der App
  // auch (z. B. /admin/users, PROJ-46). Nur für Zeilen ohne Anzeigenamen.
  const missingNameTeacherIds = [
    ...new Set(rows.filter((r) => r.teacher && !r.teacher.display_name).map((r) => r.teacher!.id)),
  ]
  const emailById = new Map<string, string>()
  if (missingNameTeacherIds.length > 0) {
    const service = createServiceClient()
    await Promise.all(
      missingNameTeacherIds.map(async (id) => {
        const { data } = await service.auth.admin.getUserById(id)
        if (data.user?.email) emailById.set(id, data.user.email)
      })
    )
  }

  const assignments = rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    teacher: r.teacher
      ? { id: r.teacher.id, name: r.teacher.display_name ?? emailById.get(r.teacher.id) ?? 'Unbekannt' }
      : null,
    department: r.department,
    subject: r.subject,
  }))

  return NextResponse.json({ assignments })
}
