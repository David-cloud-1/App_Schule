'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { aufrufeText } from '@/components/werkzeugkiste/link-fuer-alle'
import { ladeLinkUebersicht, schalteLinkAdminAb, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { LINK_TEXTE, type LinkAdminListe, type LinkAdminZeile } from '@/lib/werkzeugkiste-links'
import { relativesDatum, werkzeugName } from '@/lib/werkzeugkiste-materialien'

const FEHLER_ALLGEMEIN = 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'
const meldung = (e: unknown) => (e instanceof WerkzeugFehler ? e.message : FEHLER_ALLGEMEIN)

/**
 * Alle aktiven öffentlichen Links (PROJ-67) — nur für den Super-Admin. Er sieht
 * Material, Besitzer, Alter und Aufrufe und kann jeden Link abschalten, z. B.
 * bei Missbrauch. Den Code selbst zeigt die Übersicht nicht. Das Material
 * bleibt bei der Besitzerin oder dem Besitzer.
 */
export function LinkUebersicht() {
  const [liste, setListe] = useState<LinkAdminListe | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [ladtMehr, setLadtMehr] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [mehrFehler, setMehrFehler] = useState<string | null>(null)
  const [abschalten, setAbschalten] = useState<LinkAdminZeile | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const seite = useRef(1)

  const lade = useCallback(async () => {
    seite.current = 1
    setLaedt(true)
    setFehler(null)
    setMehrFehler(null)
    try {
      setListe(await ladeLinkUebersicht(1))
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
      const daten = await ladeLinkUebersicht(seite.current + 1)
      seite.current += 1
      setListe((alt) => (alt ? { ...daten, eintraege: [...alt.eintraege, ...daten.eintraege] } : daten))
    } catch (e) {
      setMehrFehler(meldung(e))
    } finally {
      setLadtMehr(false)
    }
  }

  async function schalteAb() {
    if (!abschalten) return
    setLaeuft(true)
    try {
      await schalteLinkAdminAb(abschalten.id)
      toast.success('Link abgeschaltet')
      setAbschalten(null)
      void lade()
    } catch (e) {
      toast.error(meldung(e))
      setAbschalten(null)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <section aria-labelledby="wk-links-titel" className="space-y-4">
      <div className="space-y-1">
        <h2 id="wk-links-titel" className="text-lg font-semibold">
          Öffentliche Links
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-ws-muted">
          Diese Materialien kann jeder mit dem Link ohne Konto öffnen. Wenn du einen Link abschaltest, bleibt das Material bei der Besitzerin oder dem Besitzer.
        </p>
      </div>

      {laedt && !liste ? (
        <AdminLoadingState variant="table" rows={3} label="Die Links werden geladen …" />
      ) : fehler && !liste ? (
        <AdminErrorState message={fehler} onRetry={() => void lade()} />
      ) : liste && liste.eintraege.length === 0 ? (
        <AdminEmptyState icon={Globe} title="Keine öffentlichen Links." description="Sobald eine Lehrkraft einen Link für alle erzeugt, erscheint er hier." />
      ) : (
        <>
          <div className="ws-table-scroll ws-table-sticky overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
            <Table>
              <TableHeader>
                <TableRow className="border-ws-line bg-ws-bg hover:bg-ws-bg">
                  <TableHead className="text-ws-muted">Titel</TableHead>
                  <TableHead className="text-ws-muted">Besitzer</TableHead>
                  <TableHead className="text-ws-muted">Erzeugt</TableHead>
                  <TableHead className="text-ws-muted">Aufrufe</TableHead>
                  <TableHead className="text-right text-ws-muted">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste?.eintraege.map((z) => (
                  <TableRow key={z.id} className="border-ws-line hover:bg-ws-bg/40">
                    <TableCell className="max-w-xs align-top">
                      <p className="truncate font-semibold text-ws-text" title={z.titel}>
                        {z.titel}
                      </p>
                      <p className="truncate text-sm text-ws-muted">{werkzeugName(z.werkzeug)}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top text-ws-muted">{z.besitzerName}</TableCell>
                    <TableCell className="whitespace-nowrap align-top text-ws-muted">{relativesDatum(z.erzeugtAm)}</TableCell>
                    <TableCell className="whitespace-nowrap align-top text-ws-muted">
                      {aufrufeText(z.aufrufe)}
                      {z.letzterAufruf ? ` · zuletzt ${relativesDatum(z.letzterAufruf)}` : ''}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setAbschalten(z)} className={NEBENAKTION}>
                          {LINK_TEXTE.abschalten}
                          <span className="sr-only">: {z.titel}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
        </>
      )}

      <AlertDialog open={!!abschalten} onOpenChange={(offen) => !offen && !laeuft && setAbschalten(null)}>
        <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>{LINK_TEXTE.abschaltenTitel}</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Der Link zu „{abschalten?.titel ?? ''}“ von {abschalten?.besitzerName ?? ''} funktioniert danach nicht mehr. Die Besitzerin oder der Besitzer kann einen neuen
              Link erzeugen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={NEBENAKTION} disabled={laeuft}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void schalteAb()
              }}
              disabled={laeuft}
              className="min-h-11 rounded-xl bg-ws-red font-semibold text-ws-on-accent hover:bg-ws-red-hover"
            >
              {laeuft && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {LINK_TEXTE.abschalten}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
