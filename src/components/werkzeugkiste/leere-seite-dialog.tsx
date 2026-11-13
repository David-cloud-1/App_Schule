'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { legeEigeneSeiteAn, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { TITEL_MAX } from '@/lib/werkzeugkiste-materialien'
import { bearbeitenHref, UNTERTITEL_MAX } from '@/lib/werkzeugkiste-editor'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green'

/**
 * Dialog „Leere Seite anlegen“ (PROJ-94). Eine Komponente für beide Einstiege
 * (Karte auf der Startseite, Knopf in Meine Materialien). „Anlegen“ ist erst mit
 * Titel aktiv; danach öffnet der Baukasten-Editor die neue Seite.
 */
export function LeereSeiteDialog({ offen, onOpenChange }: { offen: boolean; onOpenChange: (offen: boolean) => void }) {
  const [titel, setTitel] = useState('')
  const [untertitel, setUntertitel] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const sauber = titel.trim()
  const gesperrt = laeuft || sauber.length === 0

  function aendere(neu: boolean) {
    if (laeuft) return
    if (!neu) {
      setTitel('')
      setUntertitel('')
      setFehler(null)
    }
    onOpenChange(neu)
  }

  async function anlegen(e: React.FormEvent) {
    e.preventDefault()
    if (gesperrt) return
    setLaeuft(true)
    setFehler(null)
    try {
      const { id } = await legeEigeneSeiteAn(sauber, untertitel)
      // Vollständiger Seitenwechsel wie bei „Kopie als Seite“: der Editor ist eine eigene Hülle
      window.location.href = bearbeitenHref(id)
    } catch (err) {
      setFehler(err instanceof WerkzeugFehler ? err.message : 'Das hat gerade nicht geklappt. Bitte versuche es erneut.')
      setLaeuft(false)
    }
  }

  return (
    <Dialog open={offen} onOpenChange={aendere}>
      <DialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text sm:max-w-md">
        <form onSubmit={anlegen} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Leere Seite anlegen</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Ohne Skript und ohne KI: Du startest mit einem Grundgerüst und baust die Seite Block für Block selbst auf.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wk-leere-seite-titel">Titel</Label>
            <Input
              id="wk-leere-seite-titel"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              maxLength={TITEL_MAX}
              autoComplete="off"
              required
              className={FELD}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wk-leere-seite-untertitel">
              Untertitel <span className="font-normal text-ws-faint">(optional)</span>
            </Label>
            <Input
              id="wk-leere-seite-untertitel"
              value={untertitel}
              onChange={(e) => setUntertitel(e.target.value)}
              maxLength={UNTERTITEL_MAX}
              autoComplete="off"
              className={FELD}
            />
          </div>
          {fehler && (
            <p role="alert" className="text-sm text-ws-red">
              {fehler}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => aendere(false)} disabled={laeuft} className={`${NEBENAKTION} px-5`}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={gesperrt} className={HAUPTAKTION}>
              {laeuft && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
              Anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
