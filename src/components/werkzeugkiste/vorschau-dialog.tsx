'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ladeVorschau } from '@/lib/werkzeugkiste-api'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

/**
 * Vorschau eines Materials (PROJ-51, in PROJ-52 auch aus der Liste genutzt):
 * großer Dialog, auf dem Handy Vollbild. Geladen wird erst beim Öffnen.
 * Für ein anderes Material mit `key={ablaufId}` neu einhängen.
 */
export function VorschauDialog({
  ablaufId,
  titel,
  offen,
  onOpenChange,
}: {
  ablaufId: string
  titel: string
  offen: boolean
  onOpenChange: (offen: boolean) => void
}) {
  const [vorschau, setVorschau] = useState<string | null>(null)
  const [fehler, setFehler] = useState(false)

  useEffect(() => {
    if (!offen || vorschau !== null || fehler) return
    let aktiv = true
    ladeVorschau(ablaufId)
      .then((html) => aktiv && setVorschau(html))
      .catch(() => aktiv && setFehler(true))
    return () => {
      aktiv = false
    }
  }, [offen, vorschau, fehler, ablaufId])

  return (
    <Dialog open={offen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-svh max-h-svh w-full max-w-none flex-col gap-3 rounded-none border-ws-line bg-ws-surface p-4 text-ws-text sm:h-[90svh] sm:max-w-5xl sm:rounded-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Vorschau</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Jede Aufgabe mit der hinterlegten Lösung – richtige Antworten sind hervorgehoben.
          </DialogDescription>
        </DialogHeader>
        {vorschau !== null ? (
          // Abgeschottet: Die Vorschau enthält Text aus der KI-Antwort — keine Skripte, kein Zugriff auf die App
          <iframe
            srcDoc={vorschau}
            sandbox=""
            title={`Vorschau: ${titel}`}
            className="min-h-0 w-full flex-1 rounded-xl border border-ws-line bg-white"
          />
        ) : fehler ? (
          <div role="alert" className="space-y-3 text-sm text-ws-red">
            <p>Die Vorschau konnte nicht geladen werden. Die Datei kannst du trotzdem herunterladen.</p>
            <Button variant="outline" onClick={() => setFehler(false)} className={`${NEBENAKTION} min-h-11 px-5`}>
              Erneut versuchen
            </Button>
          </div>
        ) : (
          <p role="status" className="flex items-center gap-2 text-sm text-ws-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Vorschau wird geladen …
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
