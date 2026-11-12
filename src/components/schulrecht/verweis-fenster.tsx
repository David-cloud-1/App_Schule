'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminErrorState } from '@/components/admin/admin-states'
import { TrefferKarte } from '@/components/schulrecht/treffer-karte'
import { ladeNorm, SchulrechtFehler } from '@/lib/schulrecht-api'
import type { Fundstelle, NormVerweis } from '@/lib/schulrecht'

const schluessel = (v: NormVerweis) => `${v.kuerzel} ${v.nr}`

/**
 * Fenster für einen angeklickten Verweis im Gesetzestext (PROJ-88), z. B.
 * „Art. 86 Abs. 2“. Lädt die Norm und zeigt sie mit allen Absätzen. Verweise
 * darin sind wieder anklickbar; das Fenster springt dann zur neuen Norm.
 */
export function VerweisFenster({ ziel, schliessen }: { ziel: NormVerweis | null; schliessen: () => void }) {
  return (
    <Dialog open={!!ziel} onOpenChange={(offen) => !offen && schliessen()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-ws-line bg-ws-bg sm:max-w-2xl">
        {ziel && <Inhalt key={schluessel(ziel)} start={ziel} />}
      </DialogContent>
    </Dialog>
  )
}

type Geladen = { fuer: string; fundstelle: Fundstelle | null; fehler: string | null }

function Inhalt({ start }: { start: NormVerweis }) {
  const [aktuell, setAktuell] = useState<NormVerweis>(start)
  const [geladen, setGeladen] = useState<Geladen | null>(null)
  const [versuch, setVersuch] = useState(0)
  const key = schluessel(aktuell)
  // Nur ein Ergebnis für die gerade gezeigte Norm zählt; alles andere heißt „lädt“
  const stand = geladen?.fuer === key ? geladen : null

  useEffect(() => {
    let aktiv = true
    ladeNorm(aktuell.kuerzel, aktuell.nr)
      .then((r) => aktiv && setGeladen({ fuer: key, fundstelle: r.fundstelle, fehler: null }))
      .catch(
        (e: unknown) =>
          aktiv &&
          setGeladen({ fuer: key, fundstelle: null, fehler: e instanceof SchulrechtFehler ? e.message : 'Die Stelle konnte nicht geladen werden.' }),
      )
    return () => {
      aktiv = false
    }
  }, [aktuell, key, versuch])

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-ws-text">{key}</DialogTitle>
        <DialogDescription className="text-ws-muted">Die Stelle, auf die der Gesetzestext verweist.</DialogDescription>
      </DialogHeader>
      {stand?.fehler ? (
        <AdminErrorState
          message={stand.fehler}
          onRetry={() => {
            setGeladen(null)
            setVersuch((v) => v + 1)
          }}
        />
      ) : !stand?.fundstelle ? (
        <Skeleton className="h-40 rounded-2xl bg-ws-raised" role="status" aria-label="Wird geladen" />
      ) : (
        <TrefferKarte fundstelle={stand.fundstelle} alleAbsaetze oeffneVerweis={setAktuell} />
      )}
    </>
  )
}
