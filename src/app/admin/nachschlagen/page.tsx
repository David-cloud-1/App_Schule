import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { NACHSCHLAGEN_PAGES } from '@/lib/admin-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Nachschlagen' }

/**
 * Einstiegsseite „Nachschlagen“ (PROJ-130): führt zu Schulrecht und Checklisten.
 * Keine eigenen Daten. Die Icons werden hier als fertige Elemente gerendert und
 * nie als Funktion an eine Client-Komponente gereicht.
 */
export default function NachschlagenPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Nachschlagen" description="Schulrecht und Checklisten für den Schulalltag an einem Ort." />
      <ul className="grid max-w-3xl gap-4 md:grid-cols-2">
        {NACHSCHLAGEN_PAGES.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
            >
              <Card className="h-full rounded-2xl border-ws-line bg-ws-surface text-ws-text transition-colors duration-200 group-hover:bg-ws-raised">
                <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
                  <Icon aria-hidden className="size-6 shrink-0 text-ws-muted" />
                  <CardTitle className="flex-1 text-xl">
                    <h2>{label}</h2>
                  </CardTitle>
                  <ArrowRight aria-hidden className="size-5 shrink-0 text-ws-muted" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-ws-muted">{description}</p>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
