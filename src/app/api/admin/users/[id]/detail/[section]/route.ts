import { NextResponse } from 'next/server'
import { requireSuperAdminTarget } from '../../../_lib/target'
import { SECTION_LOADERS } from '@/lib/user-detail-server'
import { isUserSectionKey } from '@/lib/user-detail'

/**
 * GET /api/admin/users/[id]/detail/[section] — ein Abschnitt der
 * Nutzer-Detailseite (PROJ-59, nur Super-Admin). Jeder Abschnitt lädt für
 * sich, damit der Ausfall eines Abschnitts die anderen nicht blockiert.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await ctx.params
  if (!isUserSectionKey(section)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const access = await requireSuperAdminTarget(id)
  if (access.error) return access.error

  try {
    const data = await SECTION_LOADERS[section](access.service, access.target)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/admin/users/:id/detail]', section, err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Dieser Abschnitt konnte nicht geladen werden.' }, { status: 500 })
  }
}
