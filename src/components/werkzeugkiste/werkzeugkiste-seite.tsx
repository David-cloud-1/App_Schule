'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from '@/components/admin/admin-tabs'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { MeineMaterialien } from '@/components/werkzeugkiste/meine-materialien'
import { RegalReiter } from '@/components/werkzeugkiste/regal-reiter'
import { WerkzeugUebersicht } from '@/components/werkzeugkiste/werkzeug-uebersicht'
import {
  neuerAblaufHref,
  reiterAusParam,
  WERKZEUGKISTE_REITER,
} from '@/lib/werkzeugkiste'

export const HAUPTAKTION_KLASSE =
  'min-h-11 rounded-2xl bg-ws-green font-bold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green'

/**
 * Seite „Werkzeugkiste“ (PROJ-51): Seitenkopf mit der Hauptaktion, darunter
 * drei Reiter. Der gewählte Reiter steht in der Adresse (?tab=) und bleibt
 * beim Neuladen erhalten.
 */
export function WerkzeugkisteSeite() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reiter = reiterAusParam(searchParams.get('tab'))
  // Ist die Ablage ganz leer, steht „Skript hochladen“ nur im Leerzustand (nicht zusätzlich im Kopf)
  const [materialienLeer, setMaterialienLeer] = useState(false)
  const hauptaktionZeigen = !(reiter === 'materialien' && materialienLeer)

  function wechsle(neu: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (neu === 'werkzeuge') params.delete('tab')
    else params.set('tab', neu)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Werkzeugkiste"
        description="Aus einem Skript Unterrichtsmaterial machen – kostenlos, mit der KI deiner Wahl."
        actions={
          hauptaktionZeigen ? (
            <Button asChild className={HAUPTAKTION_KLASSE}>
              <Link href={neuerAblaufHref()}>
                <Upload className="mr-2 size-5" aria-hidden />
                Skript hochladen
              </Link>
            </Button>
          ) : undefined
        }
      />

      <AdminTabs value={reiter} onValueChange={wechsle} className="space-y-6">
        <AdminTabsList>
          {WERKZEUGKISTE_REITER.map((r) => (
            <AdminTabsTrigger
              key={r.id}
              value={r.id}
            >
              {r.label}
            </AdminTabsTrigger>
          ))}
        </AdminTabsList>

        <AdminTabsContent value="werkzeuge" className="mt-0">
          <WerkzeugUebersicht />
        </AdminTabsContent>
        <AdminTabsContent value="materialien" className="mt-0">
          <MeineMaterialien onLeer={setMaterialienLeer} />
        </AdminTabsContent>
        <AdminTabsContent value="regal" className="mt-0">
          <RegalReiter />
        </AdminTabsContent>
      </AdminTabs>
    </div>
  )
}
