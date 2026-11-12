'use client'

import { useEffect, useRef } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

/**
 * Vorschau des Entwurfs (PROJ-89): die echte Seite mit funktionierenden
 * Aufgaben, abgeschottet in einem Rahmen ohne eigene Herkunft
 * (`sandbox="allow-scripts"` ohne `allow-same-origin`). Die Seite kann ihre
 * Skripte ausführen, aber weder Anmeldedaten noch Inhalte der App lesen.
 * Zum gewählten Block springt sie über eine Nachricht mit der Sprungmarke.
 */
export function EditorVorschau({
  html,
  laedt,
  fehler,
  marke,
  neuLaden,
}: {
  html: string | null
  laedt: boolean
  fehler: string | null
  /** data-wk der gewählten Stelle (k0, k0-e3, abschluss) */
  marke: string | null
  neuLaden: () => void
}) {
  const rahmen = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!marke) return
    // Nach einem Neubau braucht der Rahmen einen Moment, bis die Seite steht
    const t = setTimeout(() => rahmen.current?.contentWindow?.postMessage({ wk: marke }, '*'), 150)
    return () => clearTimeout(t)
  }, [marke, html])

  return (
    <div className="flex h-full min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-ws-line bg-white">
      <div className="flex min-h-11 items-center gap-2 border-b border-ws-line bg-ws-surface px-3 text-sm text-ws-muted">
        <span className="font-semibold text-ws-text">Vorschau</span>
        {laedt && (
          <span className="flex items-center gap-1.5" aria-live="polite">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Vorschau wird aktualisiert …
          </span>
        )}
        {!laedt && fehler && html && (
          <span className="text-ws-orange" role="status">
            Vorschau gerade nicht aktuell
          </span>
        )}
        {!laedt && fehler && (
          <Button variant="ghost" size="sm" className="ml-auto min-h-9 rounded-lg" onClick={neuLaden}>
            <RotateCw className="mr-1.5 size-3.5" aria-hidden /> Erneut versuchen
          </Button>
        )}
      </div>
      {html ? (
        <iframe
          ref={rahmen}
          title="Vorschau der Seite"
          srcDoc={html}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="w-full flex-1 bg-white"
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-ws-bg p-6 text-center text-sm text-ws-muted">
          {fehler ? (
            <>
              <p role="alert">{fehler}</p>
              <Button variant="outline" className={NEBENAKTION} onClick={neuLaden}>
                <RotateCw className="mr-2 size-4" aria-hidden /> Erneut versuchen
              </Button>
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Vorschau wird gebaut …
            </span>
          )}
        </div>
      )}
    </div>
  )
}
