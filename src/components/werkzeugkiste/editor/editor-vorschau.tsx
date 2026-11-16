'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Maximize2, Minimize2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { liesWunsch, type VorschauWunsch } from '@/components/werkzeugkiste/editor/vorschau-nachrichten'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { SEITE_GRENZE_BYTES } from '@/lib/werkzeugkiste-bilder'
import { cn } from '@/lib/utils'

export type Modus = 'bearbeiten' | 'ausprobieren'

/**
 * Vorschau des Entwurfs (PROJ-89): die echte Seite mit funktionierenden
 * Aufgaben, abgeschottet in einem Rahmen ohne eigene Herkunft
 * (`sandbox="allow-scripts"` ohne `allow-same-origin`). Die Seite kann ihre
 * Skripte ausführen, aber weder Anmeldedaten noch Inhalte der App lesen.
 *
 * Nur Text-Nachrichten gehen hin und her (PROJ-96, PROJ-101):
 *  - App → Seite: Zustand (Modus, Schreibschutz, Handy, leere Themen), gewählte Stelle samt
 *    Typ-Name, Scrollposition nach einem Neubau.
 *  - Seite → App: **Wünsche** (auswählen, bearbeiten, einfügen, löschen, duplizieren, Menü,
 *    Schnellauswahl, Tasten), Scrollposition, „bereit“. Die App prüft jede Nachricht streng
 *    (`liesWunsch`) und führt nur aus, was sie selbst für gültig hält.
 * Die App nimmt Nachrichten nur vom eigenen Rahmen an.
 */
export function EditorVorschau({
  html,
  laedt,
  fehler,
  marke,
  name = '',
  neuLaden,
  groesse = 0,
  onWunsch,
  modus = 'bearbeiten',
  onModus,
  lesen = false,
  mobil = false,
  leer = [],
  vollbreit = false,
  onVollbreit,
}: {
  html: string | null
  laedt: boolean
  fehler: string | null
  /** data-wk der gewählten Stelle (k0, k0-e3, abschluss) */
  marke: string | null
  /** Typ-Name der gewählten Stelle für die Leiste in der Seite („Lückentext“) */
  name?: string
  neuLaden: () => void
  /** Größe der gebauten Seite in Bytes (PROJ-92: Platzanzeige zur 8-MB-Grenze); 0 = unbekannt */
  groesse?: number
  /**
   * Wunsch aus der Seite. `false` = nicht angenommen, weil die Vorschau veraltet ist
   * (dann sagt die Kopfzeile, was zu tun ist). Wünsche ohne Marke (Tasten) meldet die App immer als angenommen.
   */
  onWunsch?: (w: VorschauWunsch) => boolean
  modus?: Modus
  onModus?: (m: Modus) => void
  /** Schreibgeschützt: die Leiste zeigt nur „Bearbeiten“ */
  lesen?: boolean
  /** Unter 1024 px: Leiste fest am unteren Rand */
  mobil?: boolean
  /** Nummern der Themen ohne Blöcke (Leerzustand mit Vorschlägen) */
  leer?: number[]
  /** Vorschau über die ganze Breite (Gliederung und Schublade ausgeblendet) */
  vollbreit?: boolean
  onVollbreit?: () => void
}) {
  const rahmen = useRef<HTMLIFrameElement>(null)
  const scrollY = useRef(0)
  const letzte = useRef<string | null>(null)
  const ausVorschau = useRef<string | null>(null)
  const bereit = useRef(false)
  const aktuelleMarke = useRef(marke)
  const aktuellerName = useRef(name)
  const wunschRef = useRef(onWunsch)
  const fehlerRef = useRef(fehler)
  const leerSchluessel = leer.join(',')
  const zustandRef = useRef({ modus, lesen, mobil, leer })
  useEffect(() => {
    aktuelleMarke.current = marke
    aktuellerName.current = name
    wunschRef.current = onWunsch
    fehlerRef.current = fehler
    zustandRef.current = { modus, lesen, mobil, leer }
  })
  const [hinweis, setHinweis] = useState<string | null>(null)

  const senden = useCallback((nachricht: Record<string, unknown>) => {
    rahmen.current?.contentWindow?.postMessage(nachricht, '*')
  }, [])

  // Neue Seite (neues srcdoc): Das Skript meldet sich gleich mit „bereit“
  useEffect(() => {
    bereit.current = false
  }, [html])

  // Andere Stelle gewählt (oder anderer Typ-Name), während die Seite steht: hervorheben und hinspringen
  // (kam der Klick aus der Seite selbst, bleibt sie, wo sie ist)
  useEffect(() => {
    const schluessel = `${marke ?? ''}|${name}`
    if (letzte.current === schluessel) return
    letzte.current = schluessel
    senden({ wk: marke, name, still: ausVorschau.current === marke })
    ausVorschau.current = null
  }, [marke, name, senden])

  // Modus, Schreibschutz, Handy oder leere Themen geändert: der Seite Bescheid geben
  useEffect(() => {
    if (bereit.current) senden({ wkZustand: { modus, lesen, mobil, leer: zustandRef.current.leer } })
  }, [modus, lesen, mobil, leerSchluessel, senden])

  useEffect(() => {
    const beiNachricht = (e: MessageEvent) => {
      if (!rahmen.current || e.source !== rahmen.current.contentWindow) return
      const d: unknown = e.data
      if (!d || typeof d !== 'object') return
      const n = d as Record<string, unknown>
      if (n.wkBereit === true) {
        // Neue Seite steht: Zustand, Auswahl und Scrollposition wiederherstellen
        bereit.current = true
        letzte.current = `${aktuelleMarke.current ?? ''}|${aktuellerName.current}`
        senden({ wkZustand: zustandRef.current })
        senden({ wk: aktuelleMarke.current, name: aktuellerName.current, scrollY: scrollY.current })
        return
      }
      if (typeof n.wkScroll === 'number' && Number.isFinite(n.wkScroll)) {
        scrollY.current = Math.max(0, n.wkScroll)
        return
      }
      let w = liesWunsch(n)
      if (!w) return
      if (w.art === 'menue') {
        // Die Seite meldet Koordinaten im Rahmen; das Menü gehört der App und braucht Fensterkoordinaten
        const r = rahmen.current.getBoundingClientRect()
        w = { ...w, x: r.left + w.x, y: r.top + w.y }
      }
      const angenommen = wunschRef.current?.(w) ?? false
      if (angenommen) {
        // Ein Klick aus der Seite lässt sie, wo sie ist
        if (w.art === 'waehle' || w.art === 'bearbeite') ausVorschau.current = w.marke
        setHinweis(null)
      } else {
        setHinweis(
          fehlerRef.current
            ? 'Die Vorschau ist nicht aktuell. Bitte „Erneut versuchen“ klicken oder die Stelle in der Gliederung wählen.'
            : 'Die Vorschau wird gerade aktualisiert. Bitte gleich noch einmal klicken.',
        )
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
        {onModus && (
          <AdminSegmented
            value={modus}
            onChange={onModus}
            ariaLabel="Modus der Vorschau"
            options={[
              { value: 'bearbeiten', label: 'Bearbeiten' },
              { value: 'ausprobieren', label: 'Ausprobieren' },
            ]}
          />
        )}
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
