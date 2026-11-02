'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ClipboardCopy, Globe, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { AdminErrorState } from '@/components/admin/admin-states'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { erzeugeLink, ladeLink, schalteLinkAb, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { LINK_TEXTE, linkAdresse, type LinkStand } from '@/lib/werkzeugkiste-links'
import { relativesDatum } from '@/lib/werkzeugkiste-materialien'

const FEHLER_ALLGEMEIN = 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'
const meldung = (e: unknown) => (e instanceof WerkzeugFehler ? e.message : FEHLER_ALLGEMEIN)

/** Kopiert die volle Adresse in die Zwischenablage; `false`, wenn der Browser es nicht erlaubt */
export async function kopiereLinkAdresse(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(linkAdresse(window.location.origin, code))
    return true
  } catch {
    return false
  }
}

export function aufrufeText(n: number): string {
  return `${n} ${n === 1 ? 'Aufruf' : 'Aufrufe'}`
}

/**
 * „Link für alle“ (PROJ-67): eine Stelle für Erzeugen, Kopieren und Abschalten,
 * die Schritt „Fertig“, „Meine Materialien“ und der Teilen-Dialog gemeinsam
 * nutzen. Lädt den eigenen Stand selbst. Ohne Link steht der Hinweis, mit
 * Link das Feld zum Kopieren und „Link abschalten“.
 */
export function LinkFeld({
  ablaufId,
  geaendert,
  autoKopieren = true,
}: {
  ablaufId: string
  /** Meldet der Liste den neuen Stand (`null` = kein aktiver Link) */
  geaendert?: (stand: LinkStand | null) => void
  /** Beim Erzeugen die Adresse gleich in die Zwischenablage legen */
  autoKopieren?: boolean
}) {
  const [stand, setStand] = useState<LinkStand | null | undefined>(undefined)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [arbeitet, setArbeitet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [abschaltenOffen, setAbschaltenOffen] = useState(false)
  const [kopiert, setKopiert] = useState(false)
  const [herkunft, setHerkunft] = useState('')

  const lade = useCallback(async () => {
    setLadeFehler(null)
    try {
      setStand((await ladeLink(ablaufId)).link)
    } catch (e) {
      setLadeFehler(meldung(e))
    }
  }, [ablaufId])

  useEffect(() => {
    setHerkunft(window.location.origin)
    void lade()
  }, [lade])

  async function kopieren(code: string, erzeugt = false) {
    if (await kopiereLinkAdresse(code)) {
      setKopiert(true)
      toast.success(LINK_TEXTE.kopiert)
      setTimeout(() => setKopiert(false), 2000)
    } else if (!erzeugt) {
      toast.error('Kopieren hat nicht geklappt. Markiere den Link und kopiere ihn selbst.')
    } else {
      toast.success('Link erzeugt. Markiere ihn zum Kopieren.')
    }
  }

  async function erzeugen() {
    setArbeitet(true)
    setFehler(null)
    try {
      const { link } = await erzeugeLink(ablaufId)
      setStand(link)
      geaendert?.(link)
      if (autoKopieren) await kopieren(link.code, true)
    } catch (e) {
      setFehler(meldung(e))
    } finally {
      setArbeitet(false)
    }
  }

  async function abschalten() {
    setArbeitet(true)
    setFehler(null)
    try {
      await schalteLinkAb(ablaufId)
      setStand(null)
      geaendert?.(null)
      setAbschaltenOffen(false)
      toast.success('Link abgeschaltet')
    } catch (e) {
      setFehler(meldung(e))
      setAbschaltenOffen(false)
    } finally {
      setArbeitet(false)
    }
  }

  if (ladeFehler) return <AdminErrorState message={ladeFehler} onRetry={() => void lade()} />
  if (stand === undefined) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-ws-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Wird geladen …
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {stand === null ? (
        <>
          <div className="space-y-2 rounded-xl border border-ws-blue/30 bg-ws-blue/15 p-3 text-sm leading-relaxed text-ws-blue">
            <p className="flex items-start gap-2">
              <Globe className="mt-0.5 size-4 shrink-0" aria-hidden />
              {LINK_TEXTE.hinweis}
            </p>
            <p className="pl-6">{LINK_TEXTE.hinweisFortschritt}</p>
          </div>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ws-muted">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {LINK_TEXTE.hinweisDatenschutz}
          </p>
          <Button type="button" onClick={() => void erzeugen()} disabled={arbeitet} className={HAUPTAKTION}>
            {arbeitet ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> : <Globe className="mr-2 size-5" aria-hidden />}
            Link erzeugen und kopieren
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="wk-link-adresse" className="text-sm font-medium">
              Dein Link für alle
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="wk-link-adresse"
                readOnly
                value={herkunft ? linkAdresse(herkunft, stand.code) : ''}
                onFocus={(e) => e.currentTarget.select()}
                className="min-h-11 flex-1 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green"
              />
              <Button type="button" variant="outline" onClick={() => void kopieren(stand.code)} className={`${NEBENAKTION} px-4`}>
                {kopiert ? <Check className="mr-2 size-4" aria-hidden /> : <ClipboardCopy className="mr-2 size-4" aria-hidden />}
                {kopiert ? 'Kopiert' : LINK_TEXTE.kopieren}
              </Button>
            </div>
            <p className="text-sm text-ws-muted" aria-live="polite">
              {aufrufeText(stand.aufrufe)}
              {stand.letzterAufruf ? ` · zuletzt ${relativesDatum(stand.letzterAufruf)}` : ''}
            </p>
          </div>
          <p className="text-sm leading-relaxed text-ws-muted">{LINK_TEXTE.hinweisFortschritt}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setAbschaltenOffen(true)}
            disabled={arbeitet}
            className="min-h-11 rounded-xl border-ws-red/30 bg-transparent text-ws-red hover:bg-ws-red/15 hover:text-ws-red"
          >
            {LINK_TEXTE.abschalten}
          </Button>
        </>
      )}

      {fehler && (
        <p role="alert" className="text-sm text-ws-red">
          {fehler}
        </p>
      )}

      <AlertDialog open={abschaltenOffen} onOpenChange={(offen) => !offen && !arbeitet && setAbschaltenOffen(false)}>
        <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>{LINK_TEXTE.abschaltenTitel}</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">{LINK_TEXTE.abschaltenText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={NEBENAKTION} disabled={arbeitet}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void abschalten()
              }}
              disabled={arbeitet}
              className="min-h-11 rounded-xl bg-ws-red font-semibold text-ws-on-accent hover:bg-ws-red-hover"
            >
              {arbeitet && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {LINK_TEXTE.abschalten}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export interface LinkZiel {
  id: string
  titel: string
}

/** Dialog um das Link-Feld; wird je Material neu eingehängt, damit nie ein alter Stand gezeigt wird */
export function LinkDialog({
  ziel,
  schliessen,
  geaendert,
}: {
  ziel: LinkZiel | null
  schliessen: () => void
  geaendert?: (id: string, stand: LinkStand | null) => void
}) {
  return (
    <Dialog open={!!ziel} onOpenChange={(offen) => !offen && schliessen()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl border-ws-line bg-ws-surface text-ws-text sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link für alle</DialogTitle>
          <DialogDescription className="break-words text-ws-muted" title={ziel?.titel}>
            {ziel ? `„${ziel.titel}“` : ''}
          </DialogDescription>
        </DialogHeader>
        {ziel && <LinkFeld key={ziel.id} ablaufId={ziel.id} geaendert={(s) => geaendert?.(ziel.id, s)} />}
      </DialogContent>
    </Dialog>
  )
}
