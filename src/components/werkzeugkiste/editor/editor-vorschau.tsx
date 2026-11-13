'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Maximize2, Minimize2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { SEITE_GRENZE_BYTES } from '@/lib/werkzeugkiste-bilder'
import { cn } from '@/lib/utils'

/**
 * Vorschau des Entwurfs (PROJ-89): die echte Seite mit funktionierenden
 * Aufgaben, abgeschottet in einem Rahmen ohne eigene Herkunft
 * (`sandbox="allow-scripts"` ohne `allow-same-origin`). Die Seite kann ihre
 * Skripte ausführen, aber weder Anmeldedaten noch Inhalte der App lesen.
 *
 * Nur Text-Nachrichten gehen hin und her (PROJ-96):
 *  - App → Seite: Sprungmarke zum Hervorheben/Springen, Scrollposition nach einem Neubau.
 *  - Seite → App: „Bearbeiten“-Klick und „Block einfügen“-Klick (PROJ-97) mit der Marke,
 *    Scrollposition, „bereit“.
 * Die App nimmt Nachrichten nur vom eigenen Rahmen an.
 */
export function EditorVorschau({
  html,
  laedt,
  fehler,
  marke,
  neuLaden,
  groesse = 0,
  onWaehle,
  onEinfuegen,
  onLoesche,
  vollbreit = false,
  onVollbreit,
}: {
  html: string | null
  laedt: boolean
  fehler: string | null
  /** data-wk der gewählten Stelle (k0, k0-e3, abschluss) */
  marke: string | null
  neuLaden: () => void
  /** Größe der gebauten Seite in Bytes (PROJ-92: Platzanzeige zur 8-MB-Grenze); 0 = unbekannt */
  groesse?: number
  /** Klick auf „Bearbeiten“ in der Seite; false = nicht angenommen (Vorschau veraltet) */
  onWaehle?: (marke: string) => boolean
  /** Klick auf „+ Darunter“ bzw. „+ Block“ in der Seite (PROJ-97); false = nicht angenommen (Vorschau veraltet) */
  onEinfuegen?: (marke: string) => boolean
  /** Block löschen (PROJ-98): wie `onWaehle` – false, wenn die Vorschau nicht aktuell ist */
  onLoesche?: (marke: string) => boolean
  /** Vorschau über die ganze Breite (Gliederung und Schublade ausgeblendet) */
  vollbreit?: boolean
  onVollbreit?: () => void
}) {
  const rahmen = useRef<HTMLIFrameElement>(null)
  const scrollY = useRef(0)
  const letzte = useRef<string | null>(null)
  const ausVorschau = useRef<string | null>(null)
  const aktuelleMarke = useRef(marke)
  const waehleRef = useRef(onWaehle)
  const einfuegenRef = useRef(onEinfuegen)
  const loescheRef = useRef(onLoesche)
  const fehlerRef = useRef(fehler)
  useEffect(() => {
    aktuelleMarke.current = marke
    waehleRef.current = onWaehle
    einfuegenRef.current = onEinfuegen
    loescheRef.current = onLoesche
    fehlerRef.current = fehler
  })
  const [hinweis, setHinweis] = useState<string | null>(null)

  const senden = useCallback((nachricht: Record<string, unknown>) => {
    rahmen.current?.contentWindow?.postMessage(nachricht, '*')
  }, [])

  // Andere Stelle gewählt, während die Seite steht: hervorheben und hinspringen
  // (kam der Klick aus der Seite selbst, bleibt sie, wo sie ist)
  useEffect(() => {
    if (letzte.current === marke) return
    letzte.current = marke
    senden({ wk: marke, still: ausVorschau.current === marke })
    ausVorschau.current = null
  }, [marke, senden])

  useEffect(() => {
    const beiNachricht = (e: MessageEvent) => {
      if (!rahmen.current || e.source !== rahmen.current.contentWindow) return
      const d: unknown = e.data
      if (!d || typeof d !== 'object') return
      const n = d as Record<string, unknown>
      if (n.wkBereit === true) {
        // Neue Seite steht: Auswahl und Scrollposition wiederherstellen
        letzte.current = aktuelleMarke.current
        senden({ wk: aktuelleMarke.current, scrollY: scrollY.current })
      } else if (typeof n.wkScroll === 'number' && Number.isFinite(n.wkScroll)) {
        scrollY.current = Math.max(0, n.wkScroll)
      } else if (typeof n.wkWaehle === 'string' || typeof n.wkEinfuegen === 'string' || typeof n.wkLoesche === 'string') {
        const einfuegen = typeof n.wkEinfuegen === 'string'
        const loeschen = typeof n.wkLoesche === 'string'
        const stelle = (loeschen ? n.wkLoesche : einfuegen ? n.wkEinfuegen : n.wkWaehle) as string
        const angenommen = (loeschen ? loescheRef.current : einfuegen ? einfuegenRef.current : waehleRef.current)?.(stelle) ?? false
        if (angenommen) {
          // Beim Einfügen bleibt die Seite, wo sie ist, und es wird nichts markiert
          if (!einfuegen && !loeschen) ausVorschau.current = stelle
          setHinweis(null)
        } else {
          setHinweis(
            fehlerRef.current
              ? 'Die Vorschau ist nicht aktuell. Bitte „Erneut versuchen“ klicken oder die Stelle in der Gliederung wählen.'
              : 'Die Vorschau wird gerade aktualisiert. Bitte gleich noch einmal klicken.',
          )
        }
      }
    }
    window.addEventListener('message', beiNachricht)
    return () => window.removeEventListener('message', beiNachricht)
  }, [senden])

  useEffect(() => {
    if (!hinweis) return
    const t = setTimeout(() => setHinweis(null), 4000)
    return () => clearTimeout(t)
  }, [hinweis])

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
        {hinweis && (
          <span className="text-ws-orange" role="status">
            {hinweis}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {groesse > 0 && <SeitenGroesse bytes={groesse} />}
          {!laedt && fehler && (
            <Button variant="ghost" size="sm" className="min-h-9 rounded-lg" onClick={neuLaden}>
              <RotateCw className="mr-1.5 size-3.5" aria-hidden /> Erneut versuchen
            </Button>
          )}
          {onVollbreit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden size-9 rounded-lg text-ws-muted hover:bg-ws-raised hover:text-ws-text lg:inline-flex"
              onClick={onVollbreit}
              aria-pressed={vollbreit}
              aria-label={vollbreit ? 'Bearbeitung wieder einblenden' : 'Vorschau über die ganze Breite'}
              title={vollbreit ? 'Bearbeitung wieder einblenden' : 'Vorschau über die ganze Breite'}
            >
              {vollbreit ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
            </Button>
          )}
        </div>
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

/**
 * Platzanzeige (PROJ-92): Wie viel der 8 MB, die eine Seite höchstens groß sein darf,
 * ist belegt? Ab 80 % orange, ab 100 % rot – dann lässt sich die Seite nicht veröffentlichen.
 */
export function SeitenGroesse({ bytes }: { bytes: number }) {
  const anteil = bytes / SEITE_GRENZE_BYTES
  const mb = (bytes / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
  const voll = anteil >= 1
  const knapp = anteil >= 0.8
  return (
    <span
      className={cn('ml-auto flex items-center gap-2', voll ? 'text-ws-red' : knapp ? 'text-ws-orange' : 'text-ws-muted')}
      title={voll ? 'Die Seite ist zu groß zum Veröffentlichen. Entferne Bilder oder teile das Material auf.' : undefined}
    >
      <span className="whitespace-nowrap" role="status">
        Seite: {mb} MB von 8 MB
      </span>
      <Progress
        value={Math.min(100, Math.round(anteil * 100))}
        aria-valuenow={Math.min(100, Math.round(anteil * 100))}
        aria-label="Belegter Platz der Seite"
        className={cn('h-2 w-16 bg-ws-raised sm:w-24', voll ? '[&>div]:bg-ws-red' : knapp ? '[&>div]:bg-ws-orange' : '[&>div]:bg-ws-green')}
      />
    </span>
  )
}
