import type { LucideIcon } from 'lucide-react'

/**
 * Rahmen einer Karte auf „Mein Konto“ (PROJ-50): Icon, Titel, optional ein Satz
 * darunter. Der Titel ist eine echte Überschrift, damit Screenreader die
 * Abschnitte anspringen können.
 *
 * Bewusst **keine** Client-Komponente: Server-Komponenten (Aufgaben, Beitrag)
 * reichen das Icon als Funktion weiter, und das darf nicht über die
 * Client-Grenze gehen. Die Fehleranzeige mit `useRouter` steht deshalb in
 * `konto-section-error.tsx`.
 */
export function KontoCard({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id?: string
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  const headingId = id ? `${id}-titel` : undefined
  return (
    <section id={id} aria-labelledby={headingId} className="space-y-4 rounded-2xl border border-ws-line bg-ws-surface p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ws-raised text-ws-muted">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold text-ws-text">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ws-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
