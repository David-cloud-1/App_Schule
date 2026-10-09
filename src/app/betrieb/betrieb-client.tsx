'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, LocateFixed, Store, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDepartment } from '@/components/department-provider'
import { BetriebWelt, type PlatziertesItem } from '@/components/betrieb-welt'
import { BetriebLager } from '@/components/betrieb-lager'
import { betriebSpriteSchluessel, getBetriebSprite } from '@/lib/betrieb-sprites'
import { istImLand } from '@/lib/betrieb-land'
import { weltGrenzen } from '@/lib/betrieb-welt'
import {
  ausschnittVon,
  bildschirmZuWelt,
  klammern,
  startKamera,
  verschiebe,
  weltZuGrundKachel,
  zoomUm,
  type Kamera,
} from '@/lib/betrieb-kamera'
import { itemAnPunkt } from '@/lib/betrieb-treffer'
import type { BetriebItem, BetriebStand } from '@/lib/betrieb-stand'

const TIPP_SCHWELLE_PX = 6
const ZOOM_SCHRITT = 1.35

const FEHLER: Record<string, string> = {
  tile_taken: 'Auf dieser Kachel steht schon etwas.',
  outside_land: 'Diese Kachel gehört noch nicht zu deinem Land.',
  not_owned: 'Dieses Item gehört dir nicht.',
}

async function ladeStand(): Promise<BetriebStand | null> {
  try {
    const res = await fetch('/api/betrieb')
    if (!res.ok) return null
    return (await res.json()) as BetriebStand
  } catch (err) {
    console.error('[BetriebClient] load failed:', err)
    return null
  }
}

async function sende(request: Promise<Response>): Promise<{ ok: true } | { ok: false; meldung: string }> {
  try {
    const res = await request
    if (res.ok) return { ok: true }
    const body = (await res.json().catch(() => ({}))) as { code?: string }
    return { ok: false, meldung: FEHLER[body.code ?? ''] ?? 'Das hat leider nicht geklappt. Versuch es gleich noch einmal.' }
  } catch {
    return { ok: false, meldung: 'Keine Verbindung. Versuch es gleich noch einmal.' }
  }
}

export function BetriebClient() {
  const { hofShortName, code: departmentCode } = useDepartment()
  const [stand, setStand] = useState<BetriebStand | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState(false)
  const [auswahl, setAuswahl] = useState<string | null>(null)
  const [kamera, setKamera] = useState<Kamera | null>(null)
  const [groesse, setGroesse] = useState({ w: 360, h: 420 })
  const [listenKachel, setListenKachel] = useState('')
  const [frischId, setFrischId] = useState<string | null>(null)
  const [huepfId, setHuepfId] = useState<string | null>(null)
  const [wachstumVon, setWachstumVon] = useState<number | null>(null)
  const initialisiert = useRef(false)

  const fensterRef = useRef<HTMLDivElement>(null)
  const zeiger = useRef(new Map<number, { x: number; y: number }>())
  const geste = useRef({ startX: 0, startY: 0, bewegt: false })

  const laden = useCallback(async () => {
    setLaedt(true)
    const data = await ladeStand()
    if (!data) {
      setFehler(true)
      setLaedt(false)
      return
    }
    setFehler(false)
    setStand(data)
    setKamera((k) => k ?? startKamera(weltGrenzen(data.seite)))
    setLaedt(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void laden()
  }, [laden])

  // Beim ersten Anzeigen: neues Land erkennen (Animation + Hinweis) und ein frisch
  // gekauftes Item (?neu=…) gleich auswählen und hüpfen lassen.
  useEffect(() => {
    if (!stand || initialisiert.current) return
    initialisiert.current = true
    const key = `betrieb-land-${departmentCode}`
    try {
      const alt = Number(localStorage.getItem(key))
      if (Number.isInteger(alt) && alt >= 1 && alt < stand.seite) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWachstumVon(alt)
        toast('Dein Land ist gewachsen!')
      }
      localStorage.setItem(key, String(stand.seite))
    } catch {
      // Speicher nicht verfügbar (privater Modus): dann eben ohne Animation
    }
    const neu = new URLSearchParams(window.location.search).get('neu')
    if (neu && stand.items.some((i) => i.id === neu && i.x === null)) {
      setAuswahl(neu)
      setHuepfId(neu)
    }
  }, [stand, departmentCode])

  useEffect(() => {
    if (!frischId) return
    const t = setTimeout(() => setFrischId(null), 900)
    return () => clearTimeout(t)
  }, [frischId])
  useEffect(() => {
    if (!huepfId) return
    const t = setTimeout(() => setHuepfId(null), 2600)
    return () => clearTimeout(t)
  }, [huepfId])
  useEffect(() => {
    if (wachstumVon === null) return
    const t = setTimeout(() => setWachstumVon(null), 1600)
    return () => clearTimeout(t)
  }, [wachstumVon])

  // Größe des Anzeigefensters verfolgen: der Ausschnitt braucht das Seitenverhältnis.
  useEffect(() => {
    const el = fensterRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setGroesse({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [stand])

  const seite = stand?.seite ?? 4
  const grenzen = useMemo(() => weltGrenzen(seite), [seite])
  const aktuelleKamera = useMemo(() => klammern(kamera ?? startKamera(grenzen), grenzen), [kamera, grenzen])
  const ausschnitt = useMemo(
    () => ausschnittVon(aktuelleKamera, grenzen, groesse.w / groesse.h),
    [aktuelleKamera, grenzen, groesse],
  )

  // Aktueller Stand für die Gesten-Handler (vermeidet veraltete Closures).
  const live = useRef({ ausschnitt, grenzen, stand, auswahl })
  useEffect(() => {
    live.current = { ausschnitt, grenzen, stand, auswahl }
  })

  const items = stand?.items ?? []
  const gesetzt = items.filter((i): i is BetriebItem & { x: number; y: number } => i.x !== null && i.y !== null)
  const lager = items.filter((i) => i.x === null)
  const gewaehlt = items.find((i) => i.id === auswahl) ?? null

  const freieKacheln = useMemo(() => {
    if (!gewaehlt) return []
    const belegt = new Set(gesetzt.map((i) => `${i.x},${i.y}`))
    const frei: { x: number; y: number }[] = []
    for (let y = 0; y < seite; y++) for (let x = 0; x < seite; x++) if (!belegt.has(`${x},${y}`)) frei.push({ x, y })
    return frei
  }, [gewaehlt, gesetzt, seite])

  const platziertFuerWelt: PlatziertesItem[] = gesetzt.map((i) => ({
    id: i.id,
    name: i.name,
    iconKey: i.icon_key,
    x: i.x,
    y: i.y,
    rarity: i.rarity,
  }))

  // ── Setzen, Verschieben, Zurücklegen (optimistisch, mit Rückfall) ─────────────
  const setzeLokal = useCallback((id: string, x: number | null, y: number | null) => {
    setStand((s) => (s ? { ...s, items: s.items.map((i) => (i.id === id ? { ...i, x, y } : i)) } : s))
  }, [])

  const platziere = useCallback(
    async (id: string, x: number, y: number) => {
      const vorher = live.current.stand?.items.find((i) => i.id === id)
      if (!vorher) return
      setzeLokal(id, x, y)
      setAuswahl(null)
      setFrischId(id)
      const antwort = await sende(
        fetch('/api/betrieb/platzierung', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: id, x, y }),
        }),
      )
      if (!antwort.ok) {
        setzeLokal(id, vorher.x, vorher.y)
        toast.error(antwort.meldung)
        void laden() // ein zweites Gerät kann den Stand geändert haben
      }
    },
    [laden, setzeLokal],
  )

  const insLager = useCallback(
    async (id: string) => {
      const vorher = live.current.stand?.items.find((i) => i.id === id)
      if (!vorher) return
      setzeLokal(id, null, null)
      setAuswahl(null)
      const antwort = await sende(fetch(`/api/betrieb/platzierung?item_id=${encodeURIComponent(id)}`, { method: 'DELETE' }))
      if (!antwort.ok) {
        setzeLokal(id, vorher.x, vorher.y)
        toast.error(antwort.meldung)
      }
    },
    [setzeLokal],
  )

  // ── Antippen ─────────────────────────────────────────────────────────────────
  const beiTipp = useCallback(
    (clientX: number, clientY: number) => {
      const el = fensterRef.current
      const { ausschnitt: a, stand: s, auswahl: sel } = live.current
      if (!el || !s) return
      const w = bildschirmZuWelt(clientX, clientY, el.getBoundingClientRect(), a)
      const k = weltZuGrundKachel(w.x, w.y)
      const imLand = istImLand(k.x, k.y, s.seite)
      const aufKachel = s.items.find((i) => i.x === k.x && i.y === k.y)

      if (sel) {
        if (imLand && !aufKachel) return void platziere(sel, k.x, k.y)
        if (aufKachel && aufKachel.id === sel) return setAuswahl(null)
        if (aufKachel) return setAuswahl(aufKachel.id)
        return void toast('Dort ist noch kein Land.')
      }

      const treffer = itemAnPunkt(
        s.items
          .filter((i): i is BetriebItem & { x: number; y: number } => i.x !== null && i.y !== null)
          .map((i) => ({ id: i.id, x: i.x, y: i.y, sprite: getBetriebSprite(departmentCode, i.icon_key) })),
        w.x,
        w.y,
      )
      if (treffer) setAuswahl(treffer)
      else if (aufKachel) setAuswahl(aufKachel.id)
    },
    [departmentCode, platziere],
  )

  // ── Gesten: Verschieben, Zoomen ──────────────────────────────────────────────
  const beiZeigerRunter = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (zeiger.current.size === 1) geste.current = { startX: e.clientX, startY: e.clientY, bewegt: false }
    else geste.current.bewegt = true
  }

  const beiZeigerBewegt = (e: React.PointerEvent) => {
    const alt = zeiger.current.get(e.pointerId)
    const el = fensterRef.current
    if (!alt || !el) return
    const r = el.getBoundingClientRect()
    const { ausschnitt: a, grenzen: g } = live.current
    const neu = { x: e.clientX, y: e.clientY }

    if (zeiger.current.size >= 2) {
      const andere = [...zeiger.current.entries()].find(([id]) => id !== e.pointerId)?.[1]
      if (andere) {
        const vorher = Math.hypot(alt.x - andere.x, alt.y - andere.y)
        const nachher = Math.hypot(neu.x - andere.x, neu.y - andere.y)
        if (vorher > 0 && nachher > 0) {
          const mitte = bildschirmZuWelt((neu.x + andere.x) / 2, (neu.y + andere.y) / 2, r, a)
          setKamera((k) => zoomUm(k ?? startKamera(g), nachher / vorher, mitte.x, mitte.y, g))
        }
      }
    } else {
      if (!geste.current.bewegt && Math.hypot(neu.x - geste.current.startX, neu.y - geste.current.startY) > TIPP_SCHWELLE_PX) {
        geste.current.bewegt = true
      }
      if (geste.current.bewegt) {
        const skala = a.w / r.width
        setKamera((k) => verschiebe(k ?? startKamera(g), -(neu.x - alt.x) * skala, -(neu.y - alt.y) * skala, g))
      }
    }
    zeiger.current.set(e.pointerId, neu)
  }

  const beiZeigerHoch = (e: React.PointerEvent) => {
    const warEinzeln = zeiger.current.size === 1
    zeiger.current.delete(e.pointerId)
    if (warEinzeln && !geste.current.bewegt) beiTipp(e.clientX, e.clientY)
  }

  const beiZeigerAbbruch = (e: React.PointerEvent) => {
    zeiger.current.delete(e.pointerId)
  }

  // Mausrad / Trackpad-Zoom: nativer Listener, damit preventDefault wirkt.
  useEffect(() => {
    const el = fensterRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { ausschnitt: a, grenzen: g } = live.current
      const w = bildschirmZuWelt(e.clientX, e.clientY, el.getBoundingClientRect(), a)
      setKamera((k) => zoomUm(k ?? startKamera(g), Math.exp(-e.deltaY * 0.0016), w.x, w.y, g))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [stand])

  const zoomKnopf = (faktor: number) =>
    setKamera((k) => {
      const kk = k ?? startKamera(grenzen)
      return zoomUm(kk, faktor, kk.cx, kk.cy, grenzen)
    })

  const spriteVorhanden = betriebSpriteSchluessel(departmentCode).length > 0
  const titel = `Mein ${hofShortName}`

  // ── Anzeige ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111827] text-[#F9FAFB]">
      <header className="sticky top-0 z-20 bg-[#1F2937] border-b border-[#4B5563]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" aria-label="Zurück" className="p-1 -ml-1 text-[#9CA3AF] hover:text-[#F9FAFB]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">{titel}</h1>
          <Link
            href="/shop"
            aria-label="Zum Shop"
            className="ml-auto flex items-center justify-center w-9 h-9 rounded-full bg-[#374151] hover:bg-[#4B5563] text-[#FFD700]"
          >
            <Store className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-3">
        {laedt ? (
          <>
            <Skeleton className="h-[52vh] min-h-[280px] w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </>
        ) : fehler || !stand ? (
          <div className="text-center py-16">
            <p className="text-[#9CA3AF] mb-4">Dein {hofShortName} konnte nicht geladen werden.</p>
            <Button onClick={() => void laden()} variant="outline" className="rounded-2xl border-[#4B5563] text-[#9CA3AF]">
              Erneut versuchen
            </Button>
          </div>
        ) : !spriteVorhanden ? (
          <div className="text-center py-16">
            <Store className="w-12 h-12 text-[#4B5563] mx-auto mb-3" />
            <p className="text-[#9CA3AF]">Hier entsteht bald dein eigener Aufbau-Bereich.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-12 h-12 text-[#4B5563] mx-auto mb-3" />
            <p className="text-[#9CA3AF] mb-3">Noch nichts gekauft. Hol dir im Shop dein erstes Item!</p>
            <Link href="/shop" className="text-[#FFD700] underline underline-offset-2 text-sm">
              Zum Shop
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-[#9CA3AF]">
              Land {stand.seite} × {stand.seite}
              {stand.bis_naechstes_land !== null && ` · noch ${stand.bis_naechstes_land} ${stand.bis_naechstes_land === 1 ? 'Kauf' : 'Käufe'} bis zur Erweiterung`}
            </p>

            <div
              ref={fensterRef}
              onPointerDown={beiZeigerRunter}
              onPointerMove={beiZeigerBewegt}
              onPointerUp={beiZeigerHoch}
              onPointerCancel={beiZeigerAbbruch}
              className="relative h-[52vh] min-h-[280px] max-h-[540px] w-full overflow-hidden rounded-2xl border border-[#4B5563] bg-[#7fd24f] touch-none select-none cursor-grab active:cursor-grabbing"
            >
              <BetriebWelt
                departmentCode={departmentCode}
                seite={stand.seite}
                items={platziertFuerWelt}
                className="block w-full h-full"
                ariaLabel={`${titel}: ${gesetzt.length} von ${items.length} Gegenständen gesetzt`}
                viewBox={`${ausschnitt.x} ${ausschnitt.y} ${ausschnitt.w} ${ausschnitt.h}`}
                freieKacheln={freieKacheln}
                ausgewaehltId={gewaehlt && gewaehlt.x !== null ? gewaehlt.id : null}
                frischId={frischId}
                wachstumVon={wachstumVon}
              />
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                {[
                  { icon: ZoomIn, label: 'Hineinzoomen', aktion: () => zoomKnopf(ZOOM_SCHRITT) },
                  { icon: ZoomOut, label: 'Herauszoomen', aktion: () => zoomKnopf(1 / ZOOM_SCHRITT) },
                  { icon: LocateFixed, label: 'Zentrieren', aktion: () => setKamera(startKamera(grenzen)) },
                ].map(({ icon: Icon, label, aktion }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={aktion}
                    className="w-11 h-11 rounded-full bg-[#111827]/80 text-[#F9FAFB] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Hinweis- und Aktionszeile */}
            <div className="min-h-[44px] flex items-center justify-between gap-2 text-sm">
              {gewaehlt ? (
                <>
                  <p className="text-[#F9FAFB]">
                    <span className="font-semibold">{gewaehlt.name}</span>
                    <span className="text-[#9CA3AF]">
                      {gewaehlt.x === null ? ' – tippe eine freie Kachel' : ' – tippe eine freie Kachel zum Verschieben'}
                    </span>
                  </p>
                  <div className="flex gap-2 shrink-0">
                    {gewaehlt.x !== null && (
                      <Button size="sm" variant="outline" onClick={() => void insLager(gewaehlt.id)} className="rounded-xl border-[#4B5563] text-[#F9FAFB] min-h-[44px]">
                        Ins Lager
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => setAuswahl(null)} aria-label="Auswahl aufheben" className="min-h-[44px] min-w-[44px] text-[#9CA3AF]">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-[#9CA3AF]">
                  {lager.length > 0 ? 'Tippe ein Item im Lager, dann eine freie Kachel.' : 'Alles gesetzt. Tippe ein Item, um es zu verschieben.'}
                </p>
              )}
            </div>

            {lager.length > 0 && (
              <section aria-labelledby="lager-titel" className="space-y-2">
                <h2 id="lager-titel" className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                  Im Lager ({lager.length})
                </h2>
                <BetriebLager items={lager} departmentCode={departmentCode} ausgewaehltId={auswahl} huepfId={huepfId} onWaehle={(id) => setAuswahl((a) => (a === id ? null : id))} />
              </section>
            )}

            {/* Alternative ohne Zeigen: freie Kachel per Liste wählen (Tastatur, Screenreader) */}
            {gewaehlt && freieKacheln.length > 0 && (
              <details className="rounded-2xl border border-[#4B5563] bg-[#1F2937] p-3">
                <summary className="cursor-pointer text-sm text-[#9CA3AF] min-h-[44px] flex items-center">Per Liste setzen</summary>
                <div className="flex gap-2 mt-2">
                  <select
                    value={listenKachel}
                    onChange={(e) => setListenKachel(e.target.value)}
                    aria-label="Freie Kachel wählen"
                    className="flex-1 rounded-xl bg-[#111827] border border-[#4B5563] text-[#F9FAFB] px-3 min-h-[44px]"
                  >
                    <option value="">Kachel wählen …</option>
                    {freieKacheln.map((k) => (
                      <option key={`${k.x},${k.y}`} value={`${k.x},${k.y}`}>
                        Reihe {k.y + 1}, Spalte {k.x + 1}
                      </option>
                    ))}
                  </select>
                  <Button
                    disabled={!listenKachel}
                    onClick={() => {
                      const [x, y] = listenKachel.split(',').map(Number)
                      setListenKachel('')
                      void platziere(gewaehlt.id, x!, y!)
                    }}
                    className="rounded-xl min-h-[44px] bg-[#58CC02] hover:bg-[#4CAD02] text-white"
                  >
                    {gewaehlt.x === null ? 'Setzen' : 'Verschieben'}
                  </Button>
                </div>
              </details>
            )}

            {/* Textliste für Screenreader */}
            <ul className="sr-only">
              {items.map((i) => (
                <li key={i.id}>
                  {i.name} – {i.x === null ? 'im Lager' : `steht auf Reihe ${i.y! + 1}, Spalte ${i.x + 1}`}
                  {i.rarity !== 'standard' && ` – ${i.rarity === 'selten' ? 'Selten' : 'Episch'}`}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
