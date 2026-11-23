import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { standText } from '@/lib/checklisten/liste'
import type { OriginalAnsicht } from '@/lib/checklisten/leitlinien-typen'
import { cn } from '@/lib/utils'

/**
 * Das Original der Leitlinie, einheitlich gesetzt (PROJ-122). Der Text ist
 * unverändert aus Schulrecht; nur die Darstellung ist neu. Der markierte Block
 * (von „Im Original ansehen“) wird kurz hervorgehoben.
 */
export function OriginalAnsichtView({
  originale,
  markiert,
}: {
  originale: OriginalAnsicht[]
  markiert: string | null
}) {
  return (
    <div className="space-y-8">
      <p
        role="note"
        className="flex gap-2 rounded-xl border border-ws-blue/30 bg-ws-blue/15 p-3 text-sm text-ws-blue print:hidden"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>Verbindlich ist das PDF der Schulleitung. Hier steht derselbe Text, nur übersichtlicher gesetzt.</span>
      </p>
      {originale.map((o) => (
        <article key={o.schluessel} aria-label={o.titel} className="space-y-4">
          <header className="space-y-1 border-b border-ws-line pb-3">
            <h2 className="break-words text-xl font-bold tracking-tight text-ws-text">{o.titel}</h2>
            <p className="text-sm text-ws-muted">
              {o.bereich ? `${o.bereich} · ` : ''}
              {standText(o.stand)}
            </p>
          </header>
          {o.bloecke.map((b) => {
            const hervor = markiert === `${o.schluessel}:${b.id}`
            const gemeinsam = cn(
              'scroll-mt-24 rounded-lg transition-colors duration-200',
              hervor && 'bg-ws-gold/20 ring-2 ring-ws-gold/50',
            )
            const attr = { id: `original-${o.schluessel}-${b.id}` }
            switch (b.art) {
              case 'kopf':
                return (
                  <p key={b.id} {...attr} className={cn(gemeinsam, 'text-xs font-medium uppercase tracking-wide text-ws-faint')}>
                    {b.text}
                  </p>
                )
              case 'ueberschrift':
                return (
                  <h3 key={b.id} {...attr} className={cn(gemeinsam, 'pt-2 text-base font-semibold text-ws-text')}>
                    {b.text}
                  </h3>
                )
              case 'warnung':
                return (
                  <p
                    key={b.id}
                    {...attr}
                    className={cn(gemeinsam, 'flex gap-2 border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm font-medium text-ws-orange')}
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{b.text}</span>
                  </p>
                )
              case 'liste':
                return (
                  <ul key={b.id} {...attr} className={cn(gemeinsam, 'list-disc space-y-1.5 pl-6 text-base leading-relaxed text-ws-text marker:text-ws-faint')}>
                    {b.punkte.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )
              default:
                return (
                  <p key={b.id} {...attr} className={cn(gemeinsam, 'text-base leading-relaxed text-ws-text')}>
                    {b.text}
                  </p>
                )
            }
          })}
        </article>
      ))}
    </div>
  )
}
