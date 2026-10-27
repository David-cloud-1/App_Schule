import { AdminHome } from '@/components/admin/admin-home'
import { BLOCKED_PARAM } from '@/lib/roles'

export default async function AdminIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // PROJ-49: Die Middleware markiert die Umleitung von einer gesperrten Verwaltungsseite
  const blocked = (await searchParams)[BLOCKED_PARAM] !== undefined
  return <AdminHome blocked={blocked} />
}
