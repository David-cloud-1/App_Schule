'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { PrintToolbar } from '@/components/admin/assessment-print'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'

// Lösungsschlüssel je Gruppe (PROJ-76): Frage-Nr. → richtiger Buchstabe, eine A4-Seite je Gruppe.
// Papier-Ansicht: bewusst hell auf weiß.

type Row = { number: number; id: string; text: string; correctLetter: string | null }
type Response = { title: string; groups: { A: Row[]; B: Row[] }; counts: { A: number; B: number } }

export default function SolutionKeyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<Response | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch(`/api/admin/assessments/${id}/groups`)
      if (!res.ok) throw new Error('load failed')
      setData((await res.json()) as Response)
      setState('ready')
    } catch {
      setState('failed')
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (state === 'loading') return <AdminLoadingState variant="cards" rows={2} label="Lösungsschlüssel wird geladen …" />
  if (state === 'failed' || !data) {
    return <AdminErrorState message="Der Lösungsschlüssel konnte gerade nicht geladen werden." onRetry={load} />
  }

  // Gruppe ohne Teilnehmer entfällt (keine leere Seite), sobald jemand beigetreten ist;
  // vor dem ersten Beitritt werden beide Schlüssel gedruckt.
  const anyone = data.counts.A + data.counts.B > 0
  const labels = (['A', 'B'] as const).filter((g) => data.groups[g].length > 0 && (!anyone || data.counts[g] > 0))

  return (
    <div>
      <PrintToolbar backHref={`/admin/leistungsnachweise/${id}`} printDisabled={labels.length === 0}>
        <span className="text-sm text-ws-muted">{labels.length} Seiten, je Gruppe eine</span>
      </PrintToolbar>
      {labels.map((g, i) => (
        <article
          key={g}
          className={`bg-white text-black rounded-2xl shadow-lg p-6 sm:p-10 mx-auto max-w-[210mm] print:max-w-none print:rounded-none print:shadow-none print:p-0 ${
            i === labels.length - 1 ? '' : 'print:break-after-page mb-6 print:mb-0'
          }`}
        >
          <header className="border-b-2 border-black pb-3 mb-4">
            <p className="text-xs uppercase tracking-wide text-gray-600">Lösungsschlüssel</p>
            <h1 className="text-2xl font-bold">{data.title} · Gruppe {g}</h1>
            <p className="text-sm text-gray-700">{data.counts[g]} Teilnehmer</p>
          </header>
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-lg">
            {data.groups[g].map((q) => (
              <li key={q.id} className="flex items-baseline gap-2 border-b border-gray-300 pb-1">
                <span className="w-8 text-right text-gray-600">{q.number}.</span>
                <span className="font-bold">{q.correctLetter ?? '—'}</span>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  )
}
