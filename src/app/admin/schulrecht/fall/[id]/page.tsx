'use client'

import { Suspense, use } from 'react'
import { FallSeite } from '@/components/schulrecht/fall-seite'

export default function FallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={null}>
      <FallSeite id={id} />
    </Suspense>
  )
}
