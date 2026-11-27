'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ListChecks } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ladeOffene } from '@/components/checklisten/checklisten-client'
import { CHECKLISTEN_LISTEN } from '@/lib/checklisten/listen'
import { berechneFortschritt, checklisteHref, fortschrittText, standText } from '@/lib/checklisten/liste'
import type { Durchlauf } from '@/lib/checklisten/katalog'

const HINWEIS = 'Die Checkliste ersetzt die Leitlinie nicht. Verbindlich ist das PDF der Schulleitung.'

export function ChecklistenUebersicht() {
  const [offen, setOffen] = useState<Durchlauf[] | null>(null)
  const [fehler, setFehler] = useState(false)

  const lade = useCallback(() => {
    setFehler(false)
    ladeOffene()
      .then((r) => setOffen(r.offen))
      .catch(() => setFehler(true))
  }, [])

  useEffect(() => {
    lade()
  }, [lade])

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <AdminPageHeader
        title="Checklisten"
        description="Geh Vorgänge der Schule Schritt für Schritt durch, mit dem Original der Leitlinie daneben und Haken, die nur du siehst."
      />
      <p className="max-w-prose text-sm text-ws-muted">{HINWEIS}</p>

      {fehler ? (
        <AdminErrorState message="Dein Fortschritt konnte gerade nicht geladen werden." onRetry={lade} />
      ) : offen === null ? (
        <AdminLoadingState variant="cards" rows={2} />
      ) : CHECKLISTEN_LISTEN.length === 0 ? (
        <AdminEmptyState icon={ListChecks} title="Noch keine Checklisten" description="Sobald es welche gibt, findest du sie hier." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CHECKLISTEN_LISTEN.map((liste) => {
            const durchlauf = offen.find((d) => d.checkliste === liste.id)
            const f = durchlauf ? berechneFortschritt(liste, durchlauf.variante, durchlauf.haken) : null
            const angefangen = f !== null && (f.erledigt > 0 || durchlauf?.variante)
            return (
              <li key={liste.id}>
                <Link
                  href={checklisteHref(liste.id)}
                  className="flex h-full min-h-11 flex-col gap-3 rounded-2xl border border-ws-line bg-ws-surface p-5 transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
                >
                  <span className="text-lg font-semibold text-ws-text">{liste.titel}</span>
                  <span className="text-sm text-ws-muted">{liste.beschreibung}</span>
                  <dl className="mt-auto space-y-1 text-xs text-ws-faint">
                    <div className="flex gap-1">
                      <dt className="font-medium">Für wen:</dt>
                      <dd>{liste.fuerWen.join(', ')}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium">Leitlinie:</dt>
                      <dd>{liste.quellen.map((q) => standText(q.stand)).join(' · ')}</dd>
                    </div>
                  </dl>
                  {angefangen && f && f.gesamt > 0 && (
                    <span
                      className={
                        f.fertig
                          ? 'inline-flex w-fit rounded-full border border-ws-green/30 bg-ws-green/15 px-3 py-1 text-xs font-semibold text-ws-green'
                          : 'inline-flex w-fit rounded-full border border-ws-orange/30 bg-ws-orange/15 px-3 py-1 text-xs font-semibold text-ws-orange'
                      }
                    >
                      {f.fertig
                        ? 'Alles erledigt'
                        : f.erledigt === 0
                          ? 'Gestartet, noch nichts abgehakt'
                          : `Angefangen: ${fortschrittText(f)}`}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
