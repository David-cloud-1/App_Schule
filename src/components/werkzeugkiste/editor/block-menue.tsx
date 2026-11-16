'use client'

import { useState } from 'react'
import { ArrowDown, ArrowDownToLine, ArrowRightLeft, ArrowUp, ArrowUpToLine, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { wechselZiele } from '@/lib/werkzeugkiste-blocktyp-wechsel'
import { setzeBlock, typName, verschiebeBlock, type Ort, type Struktur } from '@/lib/werkzeugkiste-editor'
import type { Aendere, Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'
import type { Einfuegeort } from '@/components/werkzeugkiste/editor/einfuege-stelle'
import { TypWechsel } from '@/components/werkzeugkiste/editor/typ-wechsel'

/** Wo das Menü aufgeht (Fensterkoordinaten) und für welchen Block */
export interface MenueAnker {
  x: number
  y: number
  ort: Ort
}

/**
 * „⋯“-Menü der Block-Leiste in der Vorschau (PROJ-101). Die Leiste selbst steckt in der
 * Seite, das Menü gehört der App: Es öffnet Dialoge der App (Typ wechseln) und sieht aus
 * wie überall im Lehrkräfte-Bereich. Es geht an der Stelle des Klicks auf.
 */
export function BlockMenue({
  anker,
  onClose,
  struktur,
  aendere,
  rueckgaengig,
  einfuegenBei,
  folge,
  onLoesche,
}: {
  anker: MenueAnker | null
  onClose: () => void
  struktur: Struktur
  aendere: Aendere
  rueckgaengig: () => void
  einfuegenBei: (ort: Einfuegeort) => void
  /** Die Auswahl soll dem bewegten Block folgen */
  folge: (a: Auswahl) => void
  onLoesche: (ort: Ort) => void
}) {
  // Der Typ-Wechsel-Dialog bleibt stehen, auch wenn das Menü schon zu ist
  const [wechsel, setWechsel] = useState<Ort | null>(null)
  const ort = anker?.ort
  const block = ort ? struktur.chapters[ort.thema]?.elements[ort.block] : undefined
  const anzahl = ort ? (struktur.chapters[ort.thema]?.elements.length ?? 0) : 0
  const typ = String(block?.type ?? '')
  const name = typName(typ)
  const wechselBlock = wechsel ? struktur.chapters[wechsel.thema]?.elements[wechsel.block] : undefined

  function bewege(von: Ort, nach: Ort, neuerIndex: number) {
    aendere((s) => verschiebeBlock(s, von, nach))
    folge({ art: 'block', thema: nach.thema, block: neuerIndex })
  }

  return (
    <>
      <DropdownMenu open={!!anker && !!block} onOpenChange={(o) => !o && onClose()}>
        <DropdownMenuTrigger asChild>
          {/* Unsichtbarer Anker an der Klickstelle; die Lage ändert sich bei jedem Klick und kann nur so gesetzt werden */}
          <span aria-hidden className="pointer-events-none fixed size-px" style={{ left: anker?.x ?? 0, top: anker?.y ?? 0 }} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label={`Weitere Aktionen für ${name}`} onCloseAutoFocus={(e) => e.preventDefault()}>
          {ort && block && (
            <>
              <DropdownMenuItem
                disabled={ort.block === 0}
                onSelect={() => bewege(ort, { thema: ort.thema, block: ort.block - 1 }, ort.block - 1)}
              >
                <ArrowUp className="mr-2 size-4" aria-hidden /> Nach oben
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={ort.block === anzahl - 1}
                onSelect={() => bewege(ort, { thema: ort.thema, block: ort.block + 2 }, ort.block + 1)}
              >
                <ArrowDown className="mr-2 size-4" aria-hidden /> Nach unten
              </DropdownMenuItem>
              {struktur.chapters.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowRightLeft className="mr-2 size-4" aria-hidden /> In anderes Thema …
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                    {struktur.chapters.map((t, ti) =>
                      ti === ort.thema ? null : (
                        <DropdownMenuItem
                          key={ti}
                          onSelect={() => bewege(ort, { thema: ti, block: Number.MAX_SAFE_INTEGER }, struktur.chapters[ti].elements.length)}
                        >
                          <span className="max-w-64 truncate">{t.title || `Thema ${ti + 1}`}</span>
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {wechselZiele(typ).length > 0 && (
                <DropdownMenuItem onSelect={() => setWechsel(ort)}>
                  <ArrowRightLeft className="mr-2 size-4" aria-hidden /> Typ wechseln …
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => einfuegenBei({ thema: ort.thema, index: ort.block })}>
                <ArrowUpToLine className="mr-2 size-4" aria-hidden /> Block darüber einfügen …
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => einfuegenBei({ thema: ort.thema, index: ort.block + 1 })}>
                <ArrowDownToLine className="mr-2 size-4" aria-hidden /> Block darunter einfügen …
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onLoesche(ort)} className="text-ws-red focus:text-ws-red">
                <Trash2 className="mr-2 size-4" aria-hidden /> Löschen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {wechsel && wechselBlock && (
        <TypWechsel
          offen
          onOpenChange={(o) => !o && setWechsel(null)}
          block={wechselBlock}
          rueckgaengig={rueckgaengig}
          onWechsel={(neu) => aendere((s) => setzeBlock(s, wechsel, neu))}
        />
      )}
    </>
  )
}
