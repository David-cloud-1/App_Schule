'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Upload, UserRoundSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState } from '@/components/admin/admin-states'
import { MeineMaterialien } from '@/components/werkzeugkiste/meine-materialien'
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

      <Tabs value={reiter} onValueChange={wechsle} className="space-y-6">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-ws-line bg-transparent p-0">
          {WERKZEUGKISTE_REITER.map((r) => (
            <TabsTrigger
              key={r.id}
              value={r.id}
              className="min-h-11 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-3 text-ws-muted shadow-none data-[state=active]:border-ws-green data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-ws-text data-[state=active]:shadow-none"
            >
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="werkzeuge" className="mt-0">
          <WerkzeugUebersicht />
        </TabsContent>
        <TabsContent value="materialien" className="mt-0">
          <MeineMaterialien onLeer={setMaterialienLeer} />
        </TabsContent>
        <TabsContent value="regal" className="mt-0">
          <KommtBald />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Platzhalter, bis PROJ-53 (Regal) gebaut ist */
function KommtBald() {
  return (
    <AdminEmptyState
      icon={UserRoundSearch}
      title="Kommt bald"
      description="Hier teilen Kolleginnen und Kollegen bald ihr Material. Du entscheidest dann selbst, wer deins sieht."
    />
  )
}
