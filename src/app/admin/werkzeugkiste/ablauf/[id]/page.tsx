'use client'

import { Suspense, use } from 'react'
import { AblaufSeite } from '@/components/werkzeugkiste/ablauf-seite'

export default function AblaufPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={null}>
      <AblaufSeite id={id} />
    </Suspense>
  )
}
