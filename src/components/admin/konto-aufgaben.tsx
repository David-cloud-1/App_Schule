import Link from 'next/link'
import { CheckCircle2, ChevronRight, ListChecks } from 'lucide-react'
import { KontoCard } from '@/components/admin/konto-card'
import { KontoSectionError } from '@/components/admin/konto-section-error'
import { AUFGABEN_LIMIT, type AufgabenGruppe, type KontoAufgaben, type Section } from '@/lib/konto-data'

const GROUPS: {
  key: keyof KontoAufgaben
  title: string
  hint: string
  href: string
}[] = [
  { key: 'drafts', title: 'Entwürfe', hint: 'Noch nicht geöffnet', href: '/admin/leistungsnachweise?status=draft' },
  { key: 'running', title: 'Laufen gerade', hint: 'Die Klasse kann beitreten oder schreibt', href: '/admin/leistungsnachweise?status=open' },
  {
    key: 'unseen',
    title: 'Auswertung noch nicht angesehen',
    hint: 'Geschlossen, Ergebnisse warten auf dich',
    href: '/admin/leistungsnachweise?status=closed',
  },
]

function Group({ title, hint, href, group, showSubmissions }: { title: string; hint: string; href: string; group: AufgabenGruppe; showSubmissions?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-sm font-semibold text-ws-text">
          {title} <span className="font-normal text-ws-muted">({group.total})</span>
        </h3>
        <p className="text-xs text-ws-faint">{hint}</p>
      </div>
      <ul className="divide-y divide-ws-line/60 rounded-xl border border-ws-line bg-ws-bg/40">
        {group.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/admin/leistungsnachweise/${item.id}`}
              className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm text-ws-text transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
            >
              <span className="min-w-0 flex-1 truncate" title={item.title}>
                {item.title}
              </span>
              {showSubmissions && (
                <span className="shrink-0 rounded-full border border-ws-orange/30 bg-ws-orange/15 px-2 py-0.5 text-xs font-semibold text-ws-orange">
                  {item.submissions ?? 0} {item.submissions === 1 ? 'Abgabe' : 'Abgaben'}
                </span>
              )}
              <ChevronRight aria-hidden className="size-4 shrink-0 text-ws-faint" />
            </Link>
          </li>
        ))}
      </ul>
      {group.total > AUFGABEN_LIMIT && (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center text-sm font-medium text-ws-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
        >
          Alle {group.total} anzeigen
        </Link>
      )}
    </div>
  )
}

/** Karte „Offene Aufgaben“: eigene Nachweise nach Zustand, je höchstens 5 */
export function KontoAufgabenKarte({ section }: { section: Section<KontoAufgaben> }) {
  return (
    <KontoCard id="aufgaben" icon={ListChecks} title="Offene Aufgaben" description="Deine Leistungsnachweise, die auf dich warten.">
      {!section.ok ? (
        <KontoSectionError />
      ) : (
        (() => {
          const visible = GROUPS.filter((g) => section.data[g.key].total > 0)
          if (visible.length === 0) {
            return (
              <p className="flex items-center gap-2 rounded-xl bg-ws-green/15 px-4 py-3 text-sm font-medium text-ws-green">
                <CheckCircle2 aria-hidden className="size-5 shrink-0" />
                Alles erledigt. Es wartet nichts auf dich.
              </p>
            )
          }
          return (
            <div className="space-y-5">
              {visible.map((g) => (
                <Group key={g.key} title={g.title} hint={g.hint} href={g.href} group={section.data[g.key]} showSubmissions={g.key === 'running'} />
              ))}
            </div>
          )
        })()
      )}
    </KontoCard>
  )
}
