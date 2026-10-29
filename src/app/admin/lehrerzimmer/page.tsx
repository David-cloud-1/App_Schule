import { Suspense } from 'react'
import { AdminLoadingState } from '@/components/admin/admin-states'
import { LehrerzimmerOverview } from '@/components/admin/lehrerzimmer-overview'

export const metadata = { title: 'Lehrerzimmer' }

export default function LehrerzimmerPage() {
  return (
    // useSearchParams (Filter in der Adresse) braucht eine Suspense-Grenze
    <Suspense fallback={<AdminLoadingState variant="list" rows={4} label="Lehrerzimmer wird geladen …" />}>
      <LehrerzimmerOverview />
    </Suspense>
  )
}
