'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AblaufNeu } from '@/components/werkzeugkiste/ablauf-neu'

function Inhalt() {
  return <AblaufNeu werkzeugParam={useSearchParams().get('werkzeug')} />
}

export default function NeuerAblaufPage() {
  return (
    <Suspense fallback={null}>
      <Inhalt />
    </Suspense>
  )
}
