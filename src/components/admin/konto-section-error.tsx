'use client'

import { useRouter } from 'next/navigation'
import { AdminErrorState } from '@/components/admin/admin-states'

/** Fehler in einer einzelnen Karte: die anderen Karten bleiben benutzbar */
export function KontoSectionError() {
  const router = useRouter()
  return <AdminErrorState onRetry={() => router.refresh()} />
}
