'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, FolderInput, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { KatalogSkizze } from '@/components/werkzeugkiste/editor/katalog-skizzen'
import { cn } from '@/lib/utils'
import {
  GRUPPEN,
  katalogEintrag,
  katalogZeilen,
  leseZuletzt,
  sucheKatalog,
  zeileFuerTyp,
  type KatalogEintrag,
  type KatalogZeile,
} from '@/lib/werkzeugkiste-katalog'

/** Stand der Bilder des Materials – für die Bild-Typen (E5) */
export type BilderStand = 'laedt' | 'fehler' | number

export const AKTUELLER_TYP = 'Aktueller Typ'
export const KEIN_WECHSEL = 'Nicht möglich: Dieser Typ hat keinen vergleichbaren Inhalt. Füge dafür ein neues Element ein.'

export const OHNE_BILDER = 'Dieses Material hat noch keine Bilder aus dem Skript.'

/**
 * Schmaler Bildschirm (unter 768 px): Die Erklärung klappt unter der Zeile auf statt rechts daneben.
 * Ohne `matchMedia` (alte Umgebung, Tests) gilt die breite Ansicht.
 */
function useSchmal(): boolean {
  const [schmal, setSchmal] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(max-width: 767px)')
    const neu = () => setSchmal(mql.matches)
    neu()
    mql.addEventListener('change', neu)
    return () => mql.removeEventListener('change', neu)
  }, [])
  return schmal
}

/** Gewählte Zeile und darin die gewählte Art (Typ) */
interface Wahl {
  /** Bereich + Zeile, damit „Zuletzt verwendet“ und die Gruppe getrennt markiert werden */
  schluessel: string
  zeile: KatalogZeile
  typ: string
}

/**
 * Aufgabentyp-Katalog (PROJ-90, gestrafft in PROJ-114 Schritt 5, Variante „Liste mit Vorschau“):
 * links eine kurze Liste aller Typen nach Gruppen, rechts Skizze, Erklärung und „Einfügen“.
 * Ein Klick zeigt die Erklärung, „Einfügen“ (oder Doppelklick, Enter) fügt ein. Sehr ähnliche Typen
 * stehen beim Hinzufügen als eine Zeile mit „Arten“ (z. B. Lückentext: Eintippen, Mit Tipp, Wörter ziehen).
 * Am Handy klappt die Erklärung unter der gewählten Zeile auf.
 */
export function KatalogDialog({
  offen,
  onOpenChange,
  onWaehle,
  erlaubt,
  wechsel,
  onAusMaterial,
}: {
  offen: boolean
  onOpenChange: (offen: boolean) => void
  onWaehle: (typ: string) => void
  /** Nur diese Typen (Kapiteltest, E6) */
  erlaubt?: readonly string[]
  /** Wechsel-Modus (PROJ-95): nur diese Typen sind wählbar, `aktuell` ist der Typ des Blocks */
  wechsel?: { aktuell: string; waehlbar: readonly string[] }
  /** PROJ-108: Weg „Aus Material übernehmen“ (nur beim normalen Hinzufügen, nicht bei Kapiteltest und Aufgabentyp ändern) */
  onAusMaterial?: () => void
}) {
  const [suche, setSuche] = useState('')
  const [zuletzt, setZuletzt] = useState<string[]>([])
  const [wahl, setWahl] = useState<Wahl | null>(null)
  const liste = useRef<HTMLDivElement>(null)
  const istMobil = useSchmal()
  // Familien nur beim normalen Hinzufügen; beim Wechseln und im Kapiteltest zählt genau der Unterschied
  const familien = !wechsel && !erlaubt

  // Beim Öffnen: Suche leeren, Verlauf neu lesen, Auswahl zurücksetzen (Zustand während des Renderns angleichen)
  const [warOffen, setWarOffen] = useState(false)
  if (offen !== warOffen) {
    setWarOffen(offen)
    if (offen) {
      setSuche('')
      setZuletzt(leseZuletzt())
      setWahl(null)
    }
  }

  const treffer = useMemo(() => sucheKatalog(suche, erlaubt), [suche, erlaubt])
  const zeilen = useMemo(() => katalogZeilen(treffer, familien), [treffer, familien])
  const gruppen = useMemo(
    () => GRUPPEN.map((g) => ({ ...g, zeilen: zeilen.filter((z) => z.gruppe === g.id) })).filter((g) => g.zeilen.length),
    [zeilen],
  )
  const zuletztZeilen = useMemo(
    () =>
      zuletzt
        .filter((t) => !erlaubt || erlaubt.includes(t))
        .map((t) => {
          const z = zeileFuerTyp(t, familien)
          return z ? { zeile: z, typ: t } : null
        })
        .filter((x): x is { zeile: KatalogZeile; typ: string } => !!x),
    [zuletzt, erlaubt, familien],
  )
  const zeigeZuletzt = !wechsel && !suche.trim() && zuletztZeilen.length > 0

  const aktuellerKatalogTyp = wechsel?.aktuell === 'single_choice' ? 'multiple_choice' : wechsel?.aktuell

  // Gewählt ist, was zuletzt angeklickt wurde – solange es in den Treffern steht. Sonst der erste Treffer
  // (beim Wechseln der aktuelle Typ, damit man sieht, wovon man ausgeht).
  const sichtbar = (w: Wahl | null) => !!w && zeilen.some((z) => z.id === w.zeile.id && z.eintraege.some((e) => e.typ === w.typ))
  const erste = (): Wahl | null => {
    const start = wechsel ? zeilen.find((z) => z.eintraege.some((e) => e.typ === aktuellerKatalogTyp)) : null
    const z = start ?? (zeigeZuletzt ? zuletztZeilen[0]?.zeile : null) ?? zeilen[0]
    if (!z) return null
    const typ = zeigeZuletzt && !start && zuletztZeilen[0] ? zuletztZeilen[0].typ : z.eintraege[0].typ
    return { schluessel: `${zeigeZuletzt && !start && zuletztZeilen[0] ? 'zuletzt' : z.gruppe}-${z.id}`, zeile: z, typ }
  }
  const aktiv = sichtbar(wahl) ? wahl : erste()
  const eintrag = aktiv ? katalogEintrag(aktiv.typ) : undefined

  function grundFuer(typ: string): string | null {
    if (!wechsel) return null
    if (typ === aktuellerKatalogTyp) return AKTUELLER_TYP
    return wechsel.waehlbar.includes(typ) ? null : KEIN_WECHSEL
  }

  function einfuegen(typ: string) {
    if (!grundFuer(typ)) onWaehle(typ)
  }

  /** Pfeiltasten wandern durch alle Zeilen in Lesereihenfolge; der Fokus wählt mit aus */
  function pfeile(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    if (!(e.target as HTMLElement).closest('[data-katalog-zeile]')) return
    const knoepfe = Array.from(liste.current?.querySelectorAll<HTMLButtonElement>('[data-katalog-zeile]') ?? [])
    if (!knoepfe.length) return
    const jetzt = knoepfe.indexOf(document.activeElement as HTMLButtonElement)
    let ziel = jetzt
    if (e.key === 'Home') ziel = 0
    else if (e.key === 'End') ziel = knoepfe.length - 1
    else if (e.key === 'ArrowDown') ziel = jetzt < 0 ? 0 : Math.min(knoepfe.length - 1, jetzt + 1)
    else ziel = jetzt <= 0 ? 0 : jetzt - 1
    e.preventDefault()
    knoepfe[ziel]?.focus()
  }

  const titel = wechsel
    ? `Aufgabentyp ändern – aktuell: ${katalogEintrag(aktuellerKatalogTyp ?? '')?.name ?? 'Element'}`
    : erlaubt
      ? 'Frage hinzufügen'
      : 'Element hinzufügen'

  const detail = (kompakt: boolean) =>
    aktiv && eintrag ? (
      <KatalogDetail
        zeile={aktiv.zeile}
        eintrag={eintrag}
        kompakt={kompakt}
        grund={grundFuer(eintrag.typ)}
        knopf={wechsel ? 'Zu diesem Typ wechseln' : 'Einfügen'}
        onArt={(typ) => setWahl({ ...aktiv, typ })}
        onEinfuegen={() => einfuegen(eintrag.typ)}
      />
    ) : null

  const zeile = (z: KatalogZeile, bereich: string, typ?: string) => {
    const schluessel = `${bereich}-${z.id}`
    const gewaehlt = aktiv?.schluessel === schluessel
    return (
      <li key={schluessel}>
        <KatalogZeileKnopf
          zeile={z}
          gewaehlt={gewaehlt}
          grund={z.eintraege.length === 1 ? grundFuer(z.eintraege[0].typ) : null}
          onWaehle={() => setWahl({ schluessel, zeile: z, typ: typ ?? (gewaehlt && aktiv ? aktiv.typ : z.eintraege[0].typ) })}
          onEinfuegen={() => einfuegen(typ ?? (gewaehlt && aktiv ? aktiv.typ : z.eintraege[0].typ))}
        />
        {istMobil && gewaehlt && <div className="mt-1 mb-2 rounded-xl border border-ws-line bg-ws-bg p-3">{detail(true)}</div>}
      </li>
    )
  }

  return (
    <Dialog open={offen} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-svh max-h-svh w-full max-w-none flex-col gap-0 rounded-none border-ws-line bg-ws-surface p-0 text-ws-text lg:h-[88svh] lg:max-w-5xl lg:rounded-2xl"
        onOpenAutoFocus={(e) => {
          // Fokus ins Suchfeld (nicht auf den Schließen-Knopf)
          e.preventDefault()
          document.getElementById('katalog-suche')?.focus()
        }}
      >
        <DialogHeader className="space-y-1 border-b border-ws-line p-4 pr-14 text-left sm:p-6 sm:pr-16">
          <DialogTitle className="text-xl font-bold">{titel}</DialogTitle>
          <DialogDescription className="text-ws-muted">
            {wechsel
              ? `${erlaubt ? 'Im Kapiteltest sind nur diese Fragetypen möglich. ' : ''}Wähle einen verwandten Typ. Der Inhalt wird soweit möglich übernommen.`
              : erlaubt
                ? 'Im Kapiteltest sind nur diese Fragetypen möglich.'
                : 'Wähle, was die Schüler tun sollen. Es startet mit einem Beispiel, das du anpasst.'}
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <div className="relative min-w-0 flex-[1_1_16rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-muted" aria-hidden />
              <Input
                id="katalog-suche"
                type="search"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    liste.current?.querySelector<HTMLButtonElement>('[data-katalog-zeile]')?.focus()
                  }
                }}
                placeholder="Suchen, z. B. Quiz, Lücken, Rätsel …"
                aria-label="Aufgabentyp suchen"
                className="min-h-11 rounded-xl border-ws-line bg-ws-bg pl-9"
                autoComplete="off"
              />
            </div>
            {onAusMaterial && !wechsel && !erlaubt && (
              <Button type="button" variant="ghost" className="min-h-11 gap-2 rounded-xl text-ws-blue hover:bg-ws-blue/10 hover:text-ws-blue" onClick={onAusMaterial}>
                <FolderInput className="size-4" aria-hidden />
                Aus Material übernehmen
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div ref={liste} onKeyDown={pfeile} className="min-h-0 space-y-5 overflow-y-auto p-3 sm:p-4 md:border-r md:border-ws-line">
            {zeigeZuletzt && (
              <section aria-labelledby="katalog-zuletzt">
                <h3 id="katalog-zuletzt" className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-ws-faint">
                  Zuletzt verwendet
                </h3>
                <ul className="space-y-0.5">{zuletztZeilen.map((x) => zeile(x.zeile, 'zuletzt', x.typ))}</ul>
              </section>
            )}

            {gruppen.map((g) => (
              <section key={g.id} aria-labelledby={`katalog-${g.id}`}>
                <h3 id={`katalog-${g.id}`} className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-ws-faint">
                  {g.titel}
                </h3>
                <ul className="space-y-0.5">{g.zeilen.map((z) => zeile(z, g.id))}</ul>
              </section>
            ))}

            {treffer.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center" role="status">
                <Search className="size-8 text-ws-faint" aria-hidden />
                <p className="max-w-prose text-ws-muted">Kein Aufgabentyp passt zu „{suche.trim()}“.</p>
                <Button
                  variant="outline"
                  className={NEBENAKTION}
                  onClick={() => {
                    setSuche('')
                    document.getElementById('katalog-suche')?.focus()
                  }}
                >
                  <X className="mr-2 size-4" aria-hidden />
                  Suche löschen
                </Button>
              </div>
            )}
          </div>

          {!istMobil && <div className="min-h-0 overflow-y-auto p-6">{detail(false)}</div>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ws-line p-4 sm:px-6">
          <p className="flex items-center gap-1.5 text-xs text-ws-faint">
            <Check className="size-3.5 text-ws-green" aria-hidden />
            wird ausgewertet (zählt in den Fortschritt der Schüler)
          </p>
          <Button variant="outline" className={NEBENAKTION} onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Zeile der Liste: wählt beim Klick aus, fügt bei Doppelklick oder Enter ein */
function KatalogZeileKnopf({
  zeile: z,
  gewaehlt,
  grund,
  onWaehle,
  onEinfuegen,
}: {
  zeile: KatalogZeile
  gewaehlt: boolean
  grund: string | null
  onWaehle: () => void
  onEinfuegen: () => void
}) {
  const alleAusgewertet = z.eintraege.every((e) => e.wirdAusgewertet)
  return (
    <button
      type="button"
      data-katalog-zeile={z.id}
      data-katalog-typen={z.eintraege.map((e) => e.typ).join(' ')}
      aria-pressed={gewaehlt}
      title={grund ?? undefined}
      onClick={onWaehle}
      onFocus={onWaehle}
      onDoubleClick={onEinfuegen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onEinfuegen()
        }
      }}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1 text-left text-sm transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
        gewaehlt ? 'bg-ws-green/15 font-semibold text-ws-green' : 'hover:bg-ws-raised',
        grund && grund !== AKTUELLER_TYP && 'opacity-60',
      )}
    >
      <KatalogSkizze typ={z.eintraege[0].typ} alt="" className="h-6 w-10 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{z.name}</span>
      {z.arten && z.arten.length > 1 && <span className="shrink-0 text-xs font-medium text-ws-faint">{z.arten.length} Arten</span>}
      {alleAusgewertet && (
        <span className="shrink-0 text-ws-green" title="Wird ausgewertet">
          <Check className="size-4" aria-hidden />
          <span className="sr-only">, wird ausgewertet</span>
        </span>
      )}
    </button>
  )
}

/** Rechte Seite (am Handy unter der Zeile): Skizze, Arten, Erklärung, „Gut für“ und Einfügen */
function KatalogDetail({
  zeile,
  eintrag: e,
  kompakt,
  grund,
  knopf,
  onArt,
  onEinfuegen,
}: {
  zeile: KatalogZeile
  eintrag: KatalogEintrag
  kompakt: boolean
  grund: string | null
  knopf: string
  onArt: (typ: string) => void
  onEinfuegen: () => void
}) {
  const sperre = !!grund
  return (
    <div className={cn('flex flex-col', kompakt ? 'gap-3' : 'gap-4')} aria-live="polite">
      {!kompakt && <KatalogSkizze typ={e.typ} alt={`Skizze: ${e.name}`} className="w-full max-w-sm" />}
      {!kompakt && <h3 className="text-2xl font-bold tracking-tight">{zeile.name}</h3>}
      {zeile.arten && zeile.arten.length > 1 && (
        <AdminSegmented
          value={e.typ}
          onChange={onArt}
          ariaLabel={`Art von „${zeile.name}“`}
          options={zeile.arten.map((a) => ({ value: a.typ, label: a.label }))}
        />
      )}
      <div className="max-w-prose space-y-2">
        <p className="text-ws-text">{e.beschreibung}</p>
        <p className="text-sm text-ws-muted">
          <span className="font-semibold text-ws-text">Gut für:</span> {e.gutFuer}
        </p>
        <p className={cn('flex items-center gap-1.5 text-sm', e.wirdAusgewertet ? 'font-medium text-ws-green' : 'text-ws-muted')}>
          {e.wirdAusgewertet ? (
            <>
              <Check className="size-4" aria-hidden /> wird ausgewertet
            </>
          ) : (
            'Zum Lesen, wird nicht ausgewertet'
          )}
        </p>
        {grund && <p className={cn('text-sm font-medium', grund === AKTUELLER_TYP ? 'text-ws-green' : 'text-ws-orange')}>{grund}</p>}
      </div>
      <div>
        <Button
          type="button"
          data-katalog-einfuegen=""
          data-katalog-eintrag={e.typ}
          aria-disabled={sperre ? true : undefined}
          onClick={() => {
            if (!sperre) onEinfuegen()
          }}
          className={cn(HAUPTAKTION, 'min-h-11 w-auto px-6', sperre && 'cursor-not-allowed opacity-60')}
        >
          {knopf}
        </Button>
      </div>
    </div>
  )
}
