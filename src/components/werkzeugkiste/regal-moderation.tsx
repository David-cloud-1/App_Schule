'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, RotateCcw, ShieldAlert, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { entnimmAusRegal, ladeModeration, lasseWiederZu, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { relativesDatum, werkzeugName } from '@/lib/werkzeugkiste-materialien'
import {
  GRUND_MAX,
  GRUND_MIN,
  stufeKurz,
  type ModerationListe,
  type ModerationZeile,
} from '@/lib/werkzeugkiste-regal'

const FEHLER_ALLGEMEIN = 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'
const meldung = (e: unknown) => (e instanceof WerkzeugFehler ? e.message : FEHLER_ALLGEMEIN)

/**
 * Moderationsansicht des Regals (PROJ-53, Paket 2) — nur für den Super-Admin.
 * Er sieht jede Freigabe und kann ein Material aus dem Regal nehmen (mit Grund),
 * z. B. bei Urheberrechtsproblemen, oder die Sperre wieder aufheben. Löschen
 * kann er nichts: Das Material bleibt bei der Besitzerin oder dem Besitzer.
 */
export function RegalModeration() {
  const [liste, setListe] = useState<ModerationListe | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [ladtMehr, setLadtMehr] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [mehrFehler, setMehrFehler] = useState<string | null>(null)
  const [entnehmen, setEntnehmen] = useState<ModerationZeile | null>(null)
  const seite = useRef(1)

  const lade = useCallback(async () => {
    seite.current = 1
    setLaedt(true)
    setFehler(null)
    setMehrFehler(null)
    try {
      setListe(await ladeModeration(1))
    } catch (e) {
      setFehler(meldung(e))
    } finally {
      setLaedt(false)
    }
  }, [])

  useEffect(() => {
    void lade()
  }, [lade])

  async function ladeMehr() {
    setLadtMehr(true)
    setMehrFehler(null)
    try {
      const daten = await ladeModeration(seite.current + 1)
      seite.current += 1
      setListe((alt) => (alt ? { ...daten, eintraege: [...alt.eintraege, ...daten.eintraege] } : daten))
    } catch (e) {
      setMehrFehler(meldung(e))
    } finally {
      setLadtMehr(false)
    }
  }

  if (laedt && !liste) return <AdminLoadingState variant="table" rows={4} label="Die Übersicht wird geladen …" />
  if (fehler && !liste) return <AdminErrorState message={fehler} onRetry={() => void lade()} />

  if (liste && liste.eintraege.length === 0) {
    return (
      <AdminEmptyState
        icon={ShieldAlert}
        title="Noch nichts geteilt."
        description="Sobald eine Lehrkraft ein Material teilt, erscheint es hier."
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm leading-relaxed text-ws-muted">
        Hier siehst du alle geteilten Materialien. Wenn du eines aus dem Regal nimmst, bleibt es bei der Besitzerin oder dem Besitzer, wird aber für alle anderen
        unsichtbar und lässt sich nicht erneut teilen, bis du es wieder zulässt.
      </p>

      <div className="ws-table-scroll ws-table-sticky overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
        <Table>
          <TableHeader>
            <TableRow className="border-ws-line bg-ws-bg hover:bg-ws-bg">
              <TableHead className="text-ws-muted">Titel</TableHead>
              <TableHead className="text-ws-muted">Besitzer</TableHead>
              <TableHead className="text-ws-muted">Sichtbar für</TableHead>
              <TableHead className="text-ws-muted">Geladen</TableHead>
              <TableHead className="text-ws-muted">Geteilt</TableHead>
              <TableHead className="text-right text-ws-muted">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liste?.eintraege.map((z) => (
              <ZeileMitAktion key={z.id} z={z} onEntnehmen={() => setEntnehmen(z)} onZugelassen={() => void lade()} />
            ))}
          </TableBody>
        </Table>
      </div>

      {mehrFehler && (
        <p role="alert" className="text-center text-sm text-ws-red">
          {mehrFehler}
        </p>
      )}
      {liste?.hatMehr && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void ladeMehr()} disabled={ladtMehr} className={`${NEBENAKTION} px-6`}>
            {ladtMehr && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Mehr laden
          </Button>
        </div>
      )}

      <EntnehmenDialog
        key={entnehmen?.id ?? 'entnehmen'}
        zeile={entnehmen}
        schliessen={() => setEntnehmen(null)}
        entnommen={() => {
          setEntnehmen(null)
          toast.success('Aus dem Regal genommen')
          void lade()
        }}
      />
    </div>
  )
}

function ZeileMitAktion({ z, onEntnehmen, onZugelassen }: { z: ModerationZeile; onEntnehmen: () => void; onZugelassen: () => void }) {
  const [laeuft, setLaeuft] = useState(false)
  const entnommen = !!z.entnommenAm

  async function zulassen() {
    setLaeuft(true)
    try {
      await lasseWiederZu(z.id)
      toast.success('Wieder zugelassen. Die Besitzerin oder der Besitzer kann neu teilen.')
      onZugelassen()
    } catch (e) {
      toast.error(meldung(e))
      setLaeuft(false)
    }
  }

  return (
    <TableRow className="border-ws-line hover:bg-ws-bg/40">
      <TableCell className="max-w-xs align-top">
        <p className="truncate font-semibold text-ws-text" title={z.titel}>
          {z.titel}
        </p>
        <p className="truncate text-sm text-ws-muted">{werkzeugName(z.werkzeug)}</p>
        {entnommen && (
          <p className="mt-1 text-sm text-ws-red" title={z.entnommenGrund ?? undefined}>
            Entnommen{z.entnommenGrund ? `: ${z.entnommenGrund}` : ''}
          </p>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap align-top text-ws-muted">{z.besitzerName}</TableCell>
      <TableCell className="whitespace-nowrap align-top">
        <Badge className="rounded-full border border-ws-blue/30 bg-ws-blue/15 px-2.5 py-0.5 text-xs font-semibold text-ws-blue hover:bg-ws-blue/15">
          {stufeKurz(z.stufe)}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap align-top text-ws-muted">{z.geladen}×</TableCell>
      <TableCell className="whitespace-nowrap align-top text-ws-muted">{relativesDatum(z.geteiltAm)}</TableCell>
      <TableCell className="align-top">
        <div className="flex justify-end">
          {entnommen ? (
            <Button variant="outline" onClick={() => void zulassen()} disabled={laeuft} className={NEBENAKTION}>
              {laeuft ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : <Undo2 className="mr-2 size-4" aria-hidden />}
              Wieder zulassen
              <span className="sr-only">: {z.titel}</span>
            </Button>
          ) : (
            <Button variant="outline" onClick={onEntnehmen} className={NEBENAKTION}>
              <RotateCcw className="mr-2 size-4" aria-hidden />
              Aus dem Regal nehmen
              <span className="sr-only">: {z.titel}</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function EntnehmenDialog({
  zeile,
  schliessen,
  entnommen,
}: {
  zeile: ModerationZeile | null
  schliessen: () => void
  entnommen: () => void
}) {
  // Der Dialog wird je Material neu eingehängt (key) und startet leer
  const [grund, setGrund] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const sauber = grund.trim()
  const zuKurz = sauber.length < GRUND_MIN

  async function entnehme() {
    if (!zeile || zuKurz) return
    setLaeuft(true)
    setFehler(null)
    try {
      await entnimmAusRegal(zeile.id, sauber)
      entnommen()
    } catch (e) {
      setFehler(meldung(e))
      setLaeuft(false)
    }
  }

  return (
    <AlertDialog open={!!zeile} onOpenChange={(offen) => !offen && !laeuft && schliessen()}>
      <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Material aus dem Regal nehmen?</AlertDialogTitle>
          <AlertDialogDescription className="text-ws-muted">
            „{zeile?.titel ?? ''}“ von {zeile?.besitzerName ?? ''} verschwindet für alle anderen aus dem Regal. Die Besitzerin oder der Besitzer behält das Material und
            sieht deinen Grund.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="regal-entnahme-grund">Grund (Pflicht)</Label>
          <Textarea
            id="regal-entnahme-grund"
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            maxLength={GRUND_MAX}
            rows={3}
            placeholder="z. B. Urheberrecht des Verlags"
            className="rounded-xl border-ws-line bg-ws-bg text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
          />
          <p className="text-right text-xs text-ws-faint" aria-live="polite">
            {grund.length} / {GRUND_MAX}
          </p>
          {fehler && (
            <p role="alert" className="text-sm text-ws-red">
              {fehler}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className={NEBENAKTION} disabled={laeuft}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void entnehme()
            }}
            disabled={laeuft || zuKurz}
            className="min-h-11 rounded-xl bg-ws-red font-semibold text-ws-on-accent hover:bg-ws-red-hover"
          >
            {laeuft && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Aus dem Regal nehmen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
