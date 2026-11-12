'use client'

import { use } from 'react'
import { BaukastenEditor } from '@/components/werkzeugkiste/editor/baukasten-editor'

/** Baukasten-Editor (PROJ-89): eigene Ansicht ohne Seitenleiste (siehe istAblaufPfad) */
export default function BearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <BaukastenEditor id={id} />
}
