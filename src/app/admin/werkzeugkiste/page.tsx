'use client'

import { Suspense } from 'react'
import { AdminLoadingState } from '@/components/admin/admin-states'
import { WerkzeugkisteSeite } from '@/components/werkzeugkiste/werkzeugkiste-seite'

export default function WerkzeugkistePage() {
  return (
    <Suspense fallback={<AdminLoadingState variant="cards" rows={6} />}>
      <WerkzeugkisteSeite />
    </Suspense>
  )
}
