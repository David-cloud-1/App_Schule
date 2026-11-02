import { Suspense } from 'react'
import { FallSeite } from '@/components/schulrecht/fall-seite'

export default function NeuerFallPage() {
  return (
    <Suspense fallback={null}>
      <FallSeite />
    </Suspense>
  )
}
