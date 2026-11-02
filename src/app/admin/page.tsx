import { AdminHome } from '@/components/admin/admin-home'
import { BLOCKED_PARAM, SUPER_ADMIN_ONLY_VALUE } from '@/lib/roles'

export default async function AdminIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // PROJ-49: Die Middleware markiert die Umleitung von einer gesperrten Verwaltungsseite.
  // PROJ-59: Der Wert „super“ kommt von Seiten, die nur der Super-Admin öffnen darf.
  const value = (await searchParams)[BLOCKED_PARAM]
  const blocked = value !== undefined
  const blockedBy = value === SUPER_ADMIN_ONLY_VALUE ? 'super' : 'admin'
  return <AdminHome blocked={blocked} blockedBy={blockedBy} />
}
