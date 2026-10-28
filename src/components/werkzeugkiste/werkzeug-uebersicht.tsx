'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  neuerAblaufHref,
  WERKZEUG_GRUPPEN,
  werkzeugeDerGruppe,
  type Werkzeug,
  type WerkzeugGruppe,
} from '@/lib/werkzeugkiste'

/** Ausgeschriebene Klassen je Gruppenfarbe — Tailwind findet nur vollständige Namen */
const KACHEL_FARBE: Record<WerkzeugGruppe['farbe'], string> = {
  green: 'bg-ws-green/15 text-ws-green',
  blue: 'bg-ws-blue/15 text-ws-blue',
  orange: 'bg-ws-orange/15 text-ws-orange',
  gold: 'bg-ws-gold/15 text-ws-gold',
}

/**
 * Reiter „Werkzeuge“ (PROJ-51): zwölf Werkzeuge in vier Gruppen. Ein Klick
 * startet den Ablauf mit vorgewähltem Werkzeug; noch nicht freigeschaltete
 * Werkzeuge stehen ruhig als „kommt bald“ da.
 */
export function WerkzeugUebersicht() {
  return (
    <div className="space-y-8">
      {WERKZEUG_GRUPPEN.map((gruppe) => (
        <section key={gruppe.id} aria-labelledby={`gruppe-${gruppe.id}`} className="space-y-3">
          <h2
            id={`gruppe-${gruppe.id}`}
            className="text-xs font-semibold uppercase tracking-wider text-ws-faint"
          >
            {gruppe.label}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {werkzeugeDerGruppe(gruppe.id).map((werkzeug) => (
              <li key={werkzeug.id}>
                <WerkzeugKarte werkzeug={werkzeug} farbe={KACHEL_FARBE[gruppe.farbe]} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function WerkzeugKarte({ werkzeug, farbe }: { werkzeug: Werkzeug; farbe: string }) {
  const Icon = werkzeug.icon
  const inhalt = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          werkzeug.aktiv ? farbe : 'bg-ws-raised text-ws-faint',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn('font-semibold', werkzeug.aktiv ? 'text-ws-text' : 'text-ws-muted')}>
            {werkzeug.name}
          </span>
          {!werkzeug.aktiv && (
            <span className="rounded-full border border-ws-line px-2 py-0.5 text-xs text-ws-faint">kommt bald</span>
          )}
        </span>
        <span className="text-sm text-ws-muted">{werkzeug.beschreibung}</span>
      </span>
    </>
  )

  const basis = 'flex min-h-11 w-full items-start gap-3 rounded-2xl border border-ws-line bg-ws-surface p-4 text-left'

  if (!werkzeug.aktiv) {
    return (
      <div className={cn(basis, 'opacity-80')} aria-disabled="true">
        {inhalt}
      </div>
    )
  }

  return (
    <Link
      href={neuerAblaufHref(werkzeug.id)}
      className={cn(
        basis,
        'transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
      )}
    >
      {inhalt}
    </Link>
  )
}
