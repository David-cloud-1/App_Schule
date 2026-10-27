import Link from 'next/link'
import { HandHeart } from 'lucide-react'
import { KontoCard, KontoSectionError } from '@/components/admin/konto-card'
import { AdminEmptyState } from '@/components/admin/admin-states'
import { BEITRAG_SEIT_LABEL, CONTENT_TYPE_LABEL, contentHref, formatRelativeTime } from '@/lib/konto'
import type { KontoBeitrag, Section } from '@/lib/konto-data'

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-ws-line bg-ws-bg/40 px-3 py-3 text-center">
      <p className="text-2xl font-bold tracking-tight text-ws-text">{value.toLocaleString('de-DE')}</p>
      <p className="mt-0.5 text-xs text-ws-muted">{label}</p>
    </div>
  )
}

/** Karte „Mein Beitrag“: drei Zahlen und die zuletzt bearbeiteten Inhalte */
export function KontoBeitragKarte({ section }: { section: Section<KontoBeitrag> }) {
  return (
    <KontoCard id="beitrag" icon={HandHeart} title="Mein Beitrag" description={`Gezählt seit ${BEITRAG_SEIT_LABEL}, ältere Arbeit ist keiner Person zugeordnet.`}>
      {!section.ok ? (
        <KontoSectionError />
      ) : section.data.changes === 0 && section.data.assessments === 0 ? (
        <AdminEmptyState
          icon={HandHeart}
          title="Noch nichts bearbeitet"
          description="Sobald du Fragen anlegst oder änderst, siehst du hier deinen Beitrag."
          action={
            <Link
              href="/admin/questions"
              className="inline-flex min-h-11 items-center rounded-xl border border-ws-line px-4 text-sm font-medium text-ws-text hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
            >
              Zu den Fragen
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat value={section.data.questionsCreated} label="Fragen angelegt" />
            <Stat value={section.data.changes} label="Änderungen" />
            <Stat value={section.data.assessments} label="Nachweise" />
          </div>

          {section.data.recent.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-ws-text">Zuletzt bearbeitet</h3>
              <ul className="divide-y divide-ws-line/60 rounded-xl border border-ws-line bg-ws-bg/40">
                {section.data.recent.map((item) => {
                  const inner = (
                    <>
                      <span className="shrink-0 rounded-full border border-ws-line bg-ws-raised px-2 py-0.5 text-xs font-medium text-ws-muted">
                        {CONTENT_TYPE_LABEL[item.type]}
                      </span>
                      <span className="min-w-0 flex-1 truncate" title={item.title}>
                        {item.title}
                      </span>
                      {item.deleted && (
                        <span className="shrink-0 rounded-full border border-ws-red/30 bg-ws-red/10 px-2 py-0.5 text-xs font-semibold text-ws-red">gelöscht</span>
                      )}
                      <span className="shrink-0 text-xs text-ws-faint">{formatRelativeTime(item.at)}</span>
                    </>
                  )
                  const rowClass = 'flex min-h-11 items-center gap-3 px-3 py-2 text-sm text-ws-text'
                  return (
                    <li key={item.key}>
                      {item.gone ? (
                        <div className={`${rowClass} text-ws-muted`} title="Endgültig gelöscht">
                          {inner}
                        </div>
                      ) : (
                        <Link
                          href={contentHref(item.type, item.deleted)}
                          className={`${rowClass} transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green`}
                        >
                          {inner}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </KontoCard>
  )
}
