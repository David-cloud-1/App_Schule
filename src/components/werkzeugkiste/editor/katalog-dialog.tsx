'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { KatalogSkizze } from '@/components/werkzeugkiste/editor/katalog-skizzen'
import { cn } from '@/lib/utils'
import { katalogEintrag, leseZuletzt, nachGruppen, sucheKatalog, type KatalogEintrag } from '@/lib/werkzeugkiste-katalog'

/** Stand der Bilder des Materials – für die Bild-Typen (E5) */
export type BilderStand = 'laedt' | 'fehler' | number

export const OHNE_BILDER = 'Dieses Material hat noch keine Bilder. Hochladen kommt bald.'

/** Warum ein Eintrag nicht wählbar ist (null = wählbar) */
export function gesperrtGrund(e: KatalogEintrag, bilder: BilderStand): string | null {
  if (!e.brauchtBild) return null
  if (bilder === 'laedt') return 'Die Bilder des Materials werden geladen …'
  if (bilder === 'fehler') return 'Die Bilder des Materials konnten nicht geladen werden.'
  return bilder > 0 ? null : OHNE_BILDER
}

/**
 * Aufgabentyp-Katalog (PROJ-90): alle Typen nach Gruppen, mit Vorschaubild,
 * Beschreibung und „Gut für“, Suche und „Zuletzt verwendet“. Ein Klick fügt
 * sofort ein (kein zweiter Bestätigungsschritt).
 */
export function KatalogDialog({
  offen,
  onOpenChange,
  onWaehle,
  erlaubt,
  bilder,
}: {
  offen: boolean
  onOpenChange: (offen: boolean) => void
  onWaehle: (typ: string) => void
  /** Nur diese Typen (Kapiteltest, E6) */
  erlaubt?: readonly string[]
  bilder: BilderStand
}) {
  const [suche, setSuche] = useState('')
  const [zuletzt, setZuletzt] = useState<string[]>([])
  const liste = useRef<HTMLDivElement>(null)

  // Beim Öffnen: Suche leeren, Verlauf neu lesen (Zustand während des Renderns angleichen statt im Effekt)
  const [warOffen, setWarOffen] = useState(false)
  if (offen !== warOffen) {
    setWarOffen(offen)
    if (offen) {
      setSuche('')
      setZuletzt(leseZuletzt())
    }
  }

  const treffer = useMemo(() => sucheKatalog(suche, erlaubt), [suche, erlaubt])
  const gruppen = useMemo(() => nachGruppen(treffer), [treffer])
  const zuletztEintraege = useMemo(
    () =>
      zuletzt
        .map((t) => katalogEintrag(t))
        .filter((e): e is KatalogEintrag => !!e && (!erlaubt || erlaubt.includes(e.typ))),
    [zuletzt, erlaubt],
  )
  const zeigeZuletzt = !suche.trim() && zuletztEintraege.length > 0

  /** Pfeiltasten wandern durch alle Einträge in Lesereihenfolge */
  function pfeile(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    const knoepfe = Array.from(liste.current?.querySelectorAll<HTMLButtonElement>('[data-katalog-eintrag]') ?? [])
    if (!knoepfe.length) return
    const jetzt = knoepfe.indexOf(document.activeElement as HTMLButtonElement)
    let ziel = jetzt
    if (e.key === 'Home') ziel = 0
    else if (e.key === 'End') ziel = knoepfe.length - 1
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') ziel = jetzt < 0 ? 0 : Math.min(knoepfe.length - 1, jetzt + 1)
    else ziel = jetzt <= 0 ? 0 : jetzt - 1
    e.preventDefault()
    knoepfe[ziel]?.focus()
  }

  const karte = (e: KatalogEintrag, bereich: string) => (
    <KatalogKarte
      key={`${bereich}-${e.typ}`}
      eintrag={e}
      bereich={bereich}
      grund={gesperrtGrund(e, bilder)}
      onWaehle={() => {
        onWaehle(e.typ)
      }}
    />
  )

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
          <DialogTitle className="text-xl font-bold">{erlaubt ? 'Frage hinzufügen' : 'Block hinzufügen'}</DialogTitle>
          <DialogDescription className="text-ws-muted">
            {erlaubt ? 'Im Kapiteltest sind nur diese Fragetypen möglich.' : 'Wähle einen Aufgabentyp. Er startet mit einem Beispiel, das du anpasst.'}
          </DialogDescription>
          <div className="relative pt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 mt-1.5 size-4 -translate-y-1/2 text-ws-muted" aria-hidden />
            <Input
              id="katalog-suche"
              type="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  liste.current?.querySelector<HTMLButtonElement>('[data-katalog-eintrag]')?.focus()
                }
              }}
              placeholder="Suchen, z. B. Quiz, Lücken, Rätsel …"
              aria-label="Aufgabentyp suchen"
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg pl-9"
              autoComplete="off"
            />
          </div>
        </DialogHeader>

        <div ref={liste} onKeyDown={pfeile} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {zeigeZuletzt && (
            <section aria-labelledby="katalog-zuletzt">
              <h3 id="katalog-zuletzt" className="mb-2 text-sm font-semibold text-ws-faint">
                Zuletzt verwendet
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{zuletztEintraege.map((e) => <li key={e.typ}>{karte(e, 'zuletzt')}</li>)}</ul>
            </section>
          )}

          {gruppen.map((g) => (
            <section key={g.id} aria-labelledby={`katalog-${g.id}`}>
              <h3 id={`katalog-${g.id}`} className="mb-2 text-sm font-semibold text-ws-faint">
                {g.titel}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.eintraege.map((e) => (
                  <li key={e.typ}>{karte(e, g.id)}</li>
                ))}
              </ul>
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

        <div className="flex justify-end border-t border-ws-line p-4 sm:px-6">
          <Button variant="outline" className={NEBENAKTION} onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function KatalogKarte({ eintrag: e, bereich, grund, onWaehle }: { eintrag: KatalogEintrag; bereich: string; grund: string | null; onWaehle: () => void }) {
  // Ein Typ kann zweimal stehen (Zuletzt verwendet + Gruppe) – die Kennung muss trotzdem eindeutig sein
  const beschreibungId = `katalog-${bereich}-${e.typ}-text`
  return (
    <button
      type="button"
      data-katalog-eintrag={e.typ}
      aria-disabled={grund ? true : undefined}
      aria-describedby={beschreibungId}
      onClick={() => {
        if (!grund) onWaehle()
      }}
      title={grund ?? undefined}
      className={cn(
        'flex h-full min-h-11 w-full gap-3 rounded-2xl border border-ws-line bg-ws-bg p-3 text-left transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
        grund ? 'cursor-not-allowed opacity-60' : 'hover:border-ws-green hover:bg-ws-raised',
      )}
    >
      <KatalogSkizze typ={e.typ} alt="" className="h-[60px] w-[100px] shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">{e.name}</span>
          {e.wirdAusgewertet && (
            <span className="rounded-full border border-ws-green/30 bg-ws-green/15 px-2 py-0.5 text-xs font-medium text-ws-green">wird ausgewertet</span>
          )}
        </span>
        <span id={beschreibungId} className="space-y-1">
          <span className="block text-sm leading-snug text-ws-muted">{e.beschreibung}</span>
          {grund ? (
            <span className="block text-xs font-medium text-ws-orange">{grund}</span>
          ) : (
            <span className="block text-xs leading-snug text-ws-faint">
              <span className="font-semibold">Gut für:</span> {e.gutFuer}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
