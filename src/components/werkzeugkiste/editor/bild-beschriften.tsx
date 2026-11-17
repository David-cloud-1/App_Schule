'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, Circle, Eye, Hash, Highlighter, Loader2, Minus, MousePointer2, Redo2, Square, Trash2, Type, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { MarkenSvg, markenHoehe, MARKEN_BREITE } from '@/components/werkzeugkiste/editor/marken-svg'
import { useGrossesBild } from '@/components/werkzeugkiste/editor/material-bilder'
import { cn } from '@/lib/utils'
import {
  MARKEN_FARBEN,
  MARKEN_FARBWERTE,
  MARKEN_MAX,
  MARKEN_TEXT_MAX,
  MARKEN_VIELE,
  bereinigeMarken,
  hatZweiPunkte,
  markeKurz,
  type Marke,
  type MarkenArt,
  type MarkenFarbe,
  type MarkenStaerke,
} from '@/lib/werkzeugkiste-bild-block'

/**
 * Bild beschriften und markieren (PROJ-106): Pfeile, Linien, Kreise, Rechtecke, Nummern, Texte und Marker über
 * dem Bild. Die Markierungen bleiben eine eigene Ebene (Orte in Prozent des Bildes) und lassen sich jederzeit
 * verschieben, ändern und löschen. Arbeitet auf einer Kopie; „Fertig“ gibt die Liste zurück, „Abbrechen“ verwirft.
 */

type Werkzeug = 'wahl' | MarkenArt

const WERKZEUGE: { wert: Werkzeug; name: string; icon: React.ReactNode }[] = [
  { wert: 'wahl', name: 'Auswählen und verschieben', icon: <MousePointer2 className="size-5" aria-hidden /> },
  { wert: 'pfeil', name: 'Pfeil', icon: <ArrowRight className="size-5" aria-hidden /> },
  { wert: 'linie', name: 'Linie', icon: <Minus className="size-5" aria-hidden /> },
  { wert: 'kreis', name: 'Kreis', icon: <Circle className="size-5" aria-hidden /> },
  { wert: 'rechteck', name: 'Rechteck', icon: <Square className="size-5" aria-hidden /> },
  { wert: 'nummer', name: 'Nummer', icon: <Hash className="size-5" aria-hidden /> },
  { wert: 'text', name: 'Text', icon: <Type className="size-5" aria-hidden /> },
  { wert: 'marker', name: 'Marker', icon: <Highlighter className="size-5" aria-hidden /> },
]

/** Kleinste Länge (in Prozent), ab der eine gezogene Form gilt */
const MIN_ZIEHEN = 1.5
const VERLAUF_MAX = 80

const begrenze = (v: number) => Math.max(0, Math.min(100, v))

/** Wo liegt die Markierung? Rahmen in Prozent (für Verschieben und Begrenzen) */
function ausdehnung(m: Marke): { minX: number; maxX: number; minY: number; maxY: number } {
  const zwei = hatZweiPunkte(m.art)
  const x2 = zwei ? (m.x2 ?? m.x) : m.x
  const y2 = zwei ? (m.y2 ?? m.y) : m.y
  return { minX: Math.min(m.x, x2), maxX: Math.max(m.x, x2), minY: Math.min(m.y, y2), maxY: Math.max(m.y, y2) }
}

function verschiebe(m: Marke, dx: number, dy: number): Marke {
  const a = ausdehnung(m)
  const ax = Math.max(-a.minX, Math.min(100 - a.maxX, dx))
  const ay = Math.max(-a.minY, Math.min(100 - a.maxY, dy))
  const neu: Marke = { ...m, x: m.x + ax, y: m.y + ay }
  if (m.x2 !== undefined && m.y2 !== undefined) {
    neu.x2 = m.x2 + ax
    neu.y2 = m.y2 + ay
  }
  return neu
}

function abstandZurStrecke(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/** Welche Markierung liegt unter dem Zeiger? (von oben nach unten; Einheiten wie im SVG) */
export function trefferIndex(marken: Marke[], xProzent: number, yProzent: number, hoehe: number): number {
  const ux = (xProzent * MARKEN_BREITE) / 100
  const uy = (yProzent * hoehe) / 100
  for (let i = marken.length - 1; i >= 0; i--) {
    const m = marken[i]
    if (m.aus) continue
    const x1 = (m.x * MARKEN_BREITE) / 100
    const y1 = (m.y * hoehe) / 100
    const x2 = hatZweiPunkte(m.art) ? ((m.x2 ?? m.x) * MARKEN_BREITE) / 100 : x1
    const y2 = hatZweiPunkte(m.art) ? ((m.y2 ?? m.y) * hoehe) / 100 : y1
    if (m.art === 'nummer') {
      if (Math.hypot(ux - x1, uy - y1) <= 34) return i
    } else if (m.art === 'text') {
      const breite = m.text ? m.text.length * 17 + 26 : 160
      if (ux >= x1 - 8 && ux <= x1 + breite + 8 && uy >= y1 - 8 && uy <= y1 + 52) return i
    } else if (m.art === 'pfeil' || m.art === 'linie') {
      if (abstandZurStrecke(ux, uy, x1, y1, x2, y2) <= 22) return i
    } else if (ux >= Math.min(x1, x2) - 12 && ux <= Math.max(x1, x2) + 12 && uy >= Math.min(y1, y2) - 12 && uy <= Math.max(y1, y2) + 12) {
      return i
    }
  }
  return -1
}

type Zug =
  | { art: 'bewegen'; index: number; start: { x: number; y: number }; vorher: Marke; liste: Marke[] }
  | { art: 'punkt'; index: number; punkt: 1 | 2; liste: Marke[] }
  | { art: 'neu'; liste: Marke[]; marke: Marke }

export interface BildBeschriftenProps {
  offen: boolean
  onOpenChange: (offen: boolean) => void
  /** Name des Bildes im Material */
  pfad: string
  marken: Marke[]
  onFertig: (marken: Marke[]) => void
}

export function BildBeschriften({ offen, onOpenChange, pfad, marken, onFertig }: BildBeschriftenProps) {
  const bild = useGrossesBild(pfad)
  const [liste, setListe] = useState<Marke[]>([])
  const [verlauf, setVerlauf] = useState<Marke[][]>([])
  const [zukunft, setZukunft] = useState<Marke[][]>([])
  const [werkzeug, setWerkzeug] = useState<Werkzeug>('wahl')
  const [farbe, setFarbe] = useState<MarkenFarbe>('rot')
  const [staerke, setStaerke] = useState<MarkenStaerke>('mittel')
  const [auswahl, setAuswahl] = useState(-1)
  const [entwurf, setEntwurf] = useState<Marke | null>(null)
  const [masse, setMasse] = useState({ breite: 4, hoehe: 3 })
  const zug = useRef<Zug | null>(null)
  const flaeche = useRef<HTMLDivElement>(null)
  const textFeld = useRef<HTMLInputElement>(null)
  const gruppe = useRef<string | null>(null)
  const fokusText = useRef(false)
  const listeRef = useRef<Marke[]>([])
  useEffect(() => {
    listeRef.current = liste
  }, [liste])

  // Beim Öffnen: Kopie der Markierungen, leerer Verlauf
  const [warOffen, setWarOffen] = useState(false)
  if (offen !== warOffen) {
    setWarOffen(offen)
    if (offen) {
      setListe(bereinigeMarken(marken))
      setVerlauf([])
      setZukunft([])
      setWerkzeug('wahl')
      setAuswahl(-1)
      setEntwurf(null)
    }
  }

  const hoehe = markenHoehe(masse.breite, masse.hoehe)

  /** Neue Liste übernehmen; `g` fasst fortlaufendes Tippen zu einem Schritt zusammen */
  const setze = useCallback((neu: Marke[], g?: string) => {
    const alt = listeRef.current
    if (!(g && gruppe.current === g)) setVerlauf((v) => [...v.slice(-(VERLAUF_MAX - 1)), alt])
    gruppe.current = g ?? null
    listeRef.current = neu
    setListe(neu)
    setZukunft([])
  }, [])

  const zurueck = () => {
    if (verlauf.length === 0) return
    gruppe.current = null
    setZukunft((z) => [...z, liste])
    listeRef.current = verlauf[verlauf.length - 1]
    setListe(verlauf[verlauf.length - 1])
    setVerlauf((v) => v.slice(0, -1))
    setAuswahl(-1)
  }
  const wieder = () => {
    if (zukunft.length === 0) return
    gruppe.current = null
    setVerlauf((v) => [...v, liste])
    listeRef.current = zukunft[zukunft.length - 1]
    setListe(zukunft[zukunft.length - 1])
    setZukunft((z) => z.slice(0, -1))
    setAuswahl(-1)
  }

  useEffect(() => {
    if (fokusText.current && auswahl >= 0) {
      fokusText.current = false
      textFeld.current?.focus()
    }
  })

  function ort(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const r = flaeche.current?.getBoundingClientRect()
    if (!r || r.width === 0 || r.height === 0) return null
    return { x: begrenze(((e.clientX - r.left) / r.width) * 100), y: begrenze(((e.clientY - r.top) / r.height) * 100) }
  }

  function neueMarke(art: MarkenArt, x: number, y: number): Marke {
    const m: Marke = { art, x, y, farbe, staerke, text: '' }
    if (hatZweiPunkte(art)) {
      m.x2 = x
      m.y2 = y
    }
    return m
  }

  function hinzufuegen(m: Marke) {
    if (liste.length >= MARKEN_MAX) return
    setze([...liste, m])
    setAuswahl(liste.length)
  }

  function beiDruck(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const p = ort(e)
    if (!p) return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (werkzeug === 'wahl') {
      const i = trefferIndex(liste, p.x, p.y, hoehe)
      setAuswahl(i)
      if (i >= 0) zug.current = { art: 'bewegen', index: i, start: p, vorher: liste[i], liste }
      return
    }
    if (werkzeug === 'nummer' || werkzeug === 'text') {
      if (liste.length >= MARKEN_MAX) return
      hinzufuegen(neueMarke(werkzeug, p.x, p.y))
      if (werkzeug === 'text') {
        fokusText.current = true
        setWerkzeug('wahl')
      }
      return
    }
    const m = neueMarke(werkzeug, p.x, p.y)
    zug.current = { art: 'neu', liste, marke: m }
    setEntwurf(m)
  }

  function beiBewegung(e: { clientX: number; clientY: number }) {
    const z = zug.current
    if (!z) return
    const p = ort(e)
    if (!p) return
    if (z.art === 'neu') {
      z.marke = { ...z.marke, x2: p.x, y2: p.y }
      setEntwurf(z.marke)
    } else if (z.art === 'bewegen') {
      const neu = verschiebe(z.vorher, p.x - z.start.x, p.y - z.start.y)
      const l = z.liste.map((m, i) => (i === z.index ? neu : m))
      listeRef.current = l
      setListe(l)
    } else {
      const l = z.liste.map((m, i) => (i === z.index ? (z.punkt === 1 ? { ...m, x: p.x, y: p.y } : { ...m, x2: p.x, y2: p.y }) : m))
      listeRef.current = l
      setListe(l)
    }
  }

  function beiLoslassen() {
    const z = zug.current
    zug.current = null
    if (!z) return
    if (z.art === 'neu') {
      setEntwurf(null)
      const m = z.marke
      const lang = Math.hypot((m.x2 ?? m.x) - m.x, (m.y2 ?? m.y) - m.y)
      if (lang >= MIN_ZIEHEN) hinzufuegen(m)
      return
    }
    // Bewegt oder Punkt gezogen: Der Zustand während des Ziehens war nur Anzeige – jetzt als ein Schritt festhalten
    if (listeRef.current !== z.liste) {
      setVerlauf((v) => [...v.slice(-(VERLAUF_MAX - 1)), z.liste])
      setZukunft([])
      gruppe.current = null
    }
  }

  function punktStart(e: ReactPointerEvent<HTMLButtonElement>, index: number, punkt: 1 | 2) {
    e.stopPropagation()
    e.preventDefault()
    flaeche.current?.setPointerCapture(e.pointerId)
    zug.current = { art: 'punkt', index, punkt, liste }
  }

  const gewaehlt = auswahl >= 0 && auswahl < liste.length ? liste[auswahl] : null

  function aendereGewaehlte(teil: Partial<Marke>, g?: string) {
    if (!gewaehlt) return
    setze(
      liste.map((m, i) => (i === auswahl ? { ...m, ...teil } : m)),
      g,
    )
  }

  function loescheGewaehlte() {
    if (!gewaehlt) return
    setze(liste.filter((_, i) => i !== auswahl))
    setAuswahl(-1)
  }

  function tastatur(e: ReactKeyboardEvent<HTMLDivElement>) {
    const ziel = e.target as HTMLElement
    const imFeld = ziel.closest('input, textarea, [role="combobox"]')
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'z') {
      if (imFeld) return
      e.preventDefault()
      if (e.shiftKey) wieder()
      else zurueck()
      return
    }
    if (imFeld) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && gewaehlt) {
      e.preventDefault()
      loescheGewaehlte()
    } else if (gewaehlt && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      const schritt = e.shiftKey ? 5 : 1
      const dx = e.key === 'ArrowLeft' ? -schritt : e.key === 'ArrowRight' ? schritt : 0
      const dy = e.key === 'ArrowUp' ? -schritt : e.key === 'ArrowDown' ? schritt : 0
      setze(
        liste.map((m, i) => (i === auswahl ? verschiebe(m, dx, dy) : m)),
        `pfeil-${auswahl}`,
      )
    }
  }

  const fertig = () => {
    onFertig(bereinigeMarken(liste))
    onOpenChange(false)
  }

  const anzeige = entwurf ? [...liste, entwurf] : liste
  const aktiverTyp = werkzeug === 'wahl' ? '' : (WERKZEUGE.find((w) => w.wert === werkzeug)?.name ?? '')

  return (
    <Dialog open={offen} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[94svh] w-full max-w-5xl flex-col gap-0 rounded-2xl border-ws-line bg-ws-surface p-0 text-ws-text"
        onKeyDown={tastatur}
        onEscapeKeyDown={(e) => {
          // Erstes Esc beendet das Werkzeug, zweites Esc übernimmt die Änderungen
          e.preventDefault()
          if (werkzeug !== 'wahl') setWerkzeug('wahl')
          else fertig()
        }}
      >
        <DialogHeader className="space-y-1 border-b border-ws-line p-4 pr-14 text-left sm:p-5">
          <DialogTitle className="text-xl font-bold">Bild beschriften und markieren</DialogTitle>
          <DialogDescription className="text-ws-muted">
            Wähle ein Werkzeug und klicke oder ziehe auf das Bild. Die Markierungen liegen über dem Bild und lassen sich jederzeit ändern.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-center rounded-xl border border-ws-line bg-ws-bg p-2">
              {bild === null ? (
                <div className="flex items-center gap-2 py-16 text-ws-muted" role="status">
                  <Loader2 className="size-5 animate-spin" aria-hidden /> Bild wird geladen …
                </div>
              ) : bild === 'fehler' ? (
                <p className="py-16 text-ws-muted" role="alert">
                  Das Bild konnte nicht geladen werden.
                </p>
              ) : (
                <div className="relative inline-block max-w-full select-none leading-none">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data:-Adresse vom Kern */}
                  <img
                    src={bild}
                    alt="Das Bild, auf dem du markierst"
                    draggable={false}
                    className="block max-h-[60svh] max-w-full"
                    onLoad={(e) => setMasse({ breite: e.currentTarget.naturalWidth, hoehe: e.currentTarget.naturalHeight })}
                  />
                  <MarkenSvg marken={anzeige} bildBreite={masse.breite} bildHoehe={masse.hoehe} auswahl={auswahl} ausgeblendeteZeigen />
                  <div
                    ref={flaeche}
                    className={cn('absolute inset-0 touch-none', werkzeug === 'wahl' ? 'cursor-default' : 'cursor-crosshair')}
                    onPointerDown={beiDruck}
                    onPointerMove={beiBewegung}
                    onPointerUp={beiLoslassen}
                    onPointerCancel={beiLoslassen}
                    data-testid="marken-flaeche"
                  />
                  {gewaehlt && hatZweiPunkte(gewaehlt.art) && gewaehlt.x2 !== undefined && gewaehlt.y2 !== undefined && !gewaehlt.aus && (
                    <>
                      {([1, 2] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={n === 1 ? 'Anfangspunkt ziehen' : 'Endpunkt ziehen'}
                          onPointerDown={(e) => punktStart(e, auswahl, n)}
                          onPointerMove={beiBewegung}
                          onPointerUp={beiLoslassen}
                          className="absolute z-10 size-6 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-ws-blue shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
                          style={{ left: `${n === 1 ? gewaehlt.x : gewaehlt.x2}%`, top: `${n === 1 ? gewaehlt.y : gewaehlt.y2}%` }}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            {liste.length >= MARKEN_VIELE && (
              <p className="mt-2 text-sm text-ws-orange" role="status">
                Viele Markierungen machen das Bild unübersichtlich.
              </p>
            )}
            {liste.length >= MARKEN_MAX && (
              <p className="mt-2 text-sm text-ws-orange" role="status">
                Mehr als {MARKEN_MAX} Markierungen sind nicht möglich.
              </p>
            )}
          </div>

          <div className="w-full shrink-0 space-y-4 lg:w-72">
            <div role="toolbar" aria-label="Werkzeuge" className="grid grid-cols-4 gap-1.5">
              {WERKZEUGE.map((w) => (
                <Button
                  key={w.wert}
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={w.name}
                  title={w.name}
                  aria-pressed={werkzeug === w.wert}
                  onClick={() => {
                    setWerkzeug(w.wert)
                    if (w.wert !== 'wahl') setAuswahl(-1)
                  }}
                  className={cn(
                    'min-h-11 min-w-11 rounded-xl border-ws-line',
                    werkzeug === w.wert && 'border-ws-green bg-ws-green/15 text-ws-green hover:bg-ws-green/15',
                  )}
                >
                  {w.icon}
                </Button>
              ))}
            </div>
            {aktiverTyp && <p className="text-sm text-ws-muted">{aktiverTyp}: {werkzeug === 'nummer' || werkzeug === 'text' ? 'auf das Bild klicken' : 'auf dem Bild ziehen'}</p>}

            <div className="space-y-1.5">
              <Label id="marken-farbe">Farbe</Label>
              <div role="radiogroup" aria-labelledby="marken-farbe" className="flex gap-2">
                {MARKEN_FARBEN.map((f) => {
                  const aktiv = (gewaehlt?.farbe ?? farbe) === f
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={aktiv}
                      aria-label={MARKEN_FARBWERTE[f].name}
                      title={MARKEN_FARBWERTE[f].name}
                      onClick={() => {
                        setFarbe(f)
                        aendereGewaehlte({ farbe: f })
                      }}
                      className={cn(
                        'size-11 rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
                        aktiv ? 'border-ws-green ring-2 ring-ws-green/40' : 'border-ws-line',
                      )}
                      style={{ background: MARKEN_FARBWERTE[f].fuellung }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Strichstärke</Label>
              <AdminSegmented
                value={gewaehlt?.staerke ?? staerke}
                onChange={(v) => {
                  setStaerke(v)
                  aendereGewaehlte({ staerke: v })
                }}
                ariaLabel="Strichstärke"
                options={[
                  { value: 'duenn', label: 'Dünn' },
                  { value: 'mittel', label: 'Mittel' },
                  { value: 'dick', label: 'Dick' },
                ]}
              />
            </div>

            {gewaehlt && (gewaehlt.art === 'text' || gewaehlt.art === 'nummer') && (
              <div className="space-y-1.5">
                <Label htmlFor="marken-text">{gewaehlt.art === 'text' ? 'Text auf dem Bild' : 'Beschriftung der Nummer (für Bildschirmleser)'}</Label>
                <Input
                  id="marken-text"
                  ref={textFeld}
                  value={gewaehlt.text}
                  maxLength={MARKEN_TEXT_MAX}
                  onChange={(e) => aendereGewaehlte({ text: e.target.value }, `text-${auswahl}`)}
                  className="min-h-11 rounded-xl"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className={NEBENAKTION} onClick={zurueck} disabled={verlauf.length === 0}>
                <Undo2 className="mr-1.5 size-4" aria-hidden /> Rückgängig
              </Button>
              <Button type="button" variant="outline" className={NEBENAKTION} onClick={wieder} disabled={zukunft.length === 0}>
                <Redo2 className="mr-1.5 size-4" aria-hidden /> Wiederholen
              </Button>
              <Button type="button" variant="outline" className={cn(NEBENAKTION, 'text-ws-red')} onClick={loescheGewaehlte} disabled={!gewaehlt}>
                <Trash2 className="mr-1.5 size-4" aria-hidden /> Löschen
              </Button>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Markierungen ({liste.length})</p>
              {liste.length === 0 ? (
                <p className="text-sm text-ws-muted">Noch keine Markierung.</p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {liste.map((m, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setWerkzeug('wahl')
                          setAuswahl(i)
                        }}
                        aria-pressed={auswahl === i}
                        className={cn(
                          'min-h-11 min-w-0 flex-1 truncate rounded-lg border px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
                          auswahl === i ? 'border-ws-green bg-ws-green/15' : 'border-ws-line bg-ws-bg',
                          m.aus && 'text-ws-faint',
                        )}
                      >
                        {markeKurz(liste, i)}
                        {m.aus && ' (ausgeblendet)'}
                      </button>
                      {m.aus && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="min-h-11 min-w-11 rounded-lg"
                          aria-label="Wieder einblenden"
                          title="Wieder einblenden (an die Mitte des Bildes setzen)"
                          onClick={() => setze(liste.map((x, j) => (j === i ? { ...x, x: 50, y: 50, ...(hatZweiPunkte(x.art) ? { x2: 60, y2: 60 } : {}), aus: undefined } : x)))}
                        >
                          <Eye className="size-4" aria-hidden />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-ws-line p-4 sm:px-5">
          {liste.length > 0 && (
            <Button type="button" variant="ghost" className="min-h-11 rounded-xl text-ws-red sm:mr-auto" onClick={() => { setze([]); setAuswahl(-1) }}>
              Alle Markierungen entfernen
            </Button>
          )}
          <Button type="button" variant="outline" className={NEBENAKTION} onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button type="button" className={HAUPTAKTION} onClick={fertig}>
            Fertig
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
