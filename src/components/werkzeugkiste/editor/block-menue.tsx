'use client'

import { useState } from 'react'
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpToLine,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  SquareDashedMousePointer,
  Scissors,
  Trash2,
  X,
} from 'lucide-react'
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
import { useIsApplePlatform } from '@/hooks/use-is-apple-platform'
import { wechselZiele } from '@/lib/werkzeugkiste-blocktyp-wechsel'
import { blockZahl, eineStelle, type Ziel } from '@/lib/werkzeugkiste-bloecke'
import { setzeBlock, typName, type Ort, type Struktur } from '@/lib/werkzeugkiste-editor'
import type { Aendere } from '@/components/werkzeugkiste/editor/editor-gliederung'
import type { Einfuegeort } from '@/components/werkzeugkiste/editor/einfuege-stelle'
import { TypWechsel } from '@/components/werkzeugkiste/editor/typ-wechsel'

/** Wo das Menü aufgeht (Fensterkoordinaten) und für welchen Block */
export interface MenueAnker {
  x: number
  y: number
  ort: Ort
}

/**
 * „⋯“-Menü der Block-Leiste in der Vorschau (PROJ-101, PROJ-102). Die Leiste selbst steckt in der
 * Seite, das Menü gehört der App: Es öffnet Dialoge der App (Typ wechseln) und sieht aus
 * wie überall im Lehrkräfte-Bereich. Es geht an der Stelle des Klicks auf.
 * Sind mehrere Blöcke gewählt (`orte`), gilt das Menü für alle zusammen.
 */
export function BlockMenue({
  anker,
  onClose,
  struktur,
  aendere,
  rueckgaengig,
  einfuegenBei,
  orte,
  onVerschiebe,
  onKopiere,
  onAusschneide,
  onEinfuegen,
  onDupliziere,
  onGleiche,
  onAufheben,
  onLoesche,
}: {
  anker: MenueAnker | null
  onClose: () => void
  struktur: Struktur
  aendere: Aendere
  rueckgaengig: () => void
  einfuegenBei: (ort: Einfuegeort) => void
  /** Alle gewählten Blöcke (mindestens der Block des Ankers) */
  orte: Ort[]
  onVerschiebe: (ziel: Ziel) => void
  onKopiere: () => void
  onAusschneide: () => void
  onEinfuegen: () => void
  onDupliziere: () => void
  onGleiche: (imThema: boolean) => void
  onAufheben: () => void
  onLoesche: () => void
}) {
  const apple = useIsApplePlatform()
  const mod = apple ? '⌘' : 'Strg+'
  // Der Typ-Wechsel-Dialog bleibt stehen, auch wenn das Menü schon zu ist
  const [wechsel, setWechsel] = useState<Ort | null>(null)
  const ort = anker?.ort
  const block = ort ? struktur.chapters[ort.thema]?.elements[ort.block] : undefined
  const viele = orte.length > 1
  const typ = String(block?.type ?? '')
  const name = viele ? blockZahl(orte.length) : typName(typ)
  const wechselBlock = wechsel ? struktur.chapters[wechsel.thema]?.elements[wechsel.block] : undefined
  const hoch = eineStelle(struktur, orte, -1)
  const runter = eineStelle(struktur, orte, 1)

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
              <DropdownMenuItem disabled={!hoch} onSelect={() => hoch && onVerschiebe(hoch)}>
                <ArrowUp className="mr-2 size-4" aria-hidden /> Nach oben
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!runter} onSelect={() => runter && onVerschiebe(runter)}>
                <ArrowDown className="mr-2 size-4" aria-hidden /> Nach unten
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightLeft className="mr-2 size-4" aria-hidden /> Verschieben nach …
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                  {struktur.chapters.map((t, ti) => (
                    <DropdownMenuItem key={ti} onSelect={() => onVerschiebe({ thema: ti, index: Number.MAX_SAFE_INTEGER })}>
                      <span className="max-w-64 truncate">{t.title || `Thema ${ti + 1}`}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {!viele && wechselZiele(typ).length > 0 && (
                <DropdownMenuItem onSelect={() => setWechsel(ort)}>
                  <ArrowRightLeft className="mr-2 size-4" aria-hidden /> Typ wechseln …
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onKopiere}>
                <ClipboardCopy className="mr-2 size-4" aria-hidden /> Kopieren
                <span className="ml-auto pl-4 text-xs text-ws-faint">{mod}C</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onAusschneide}>
                <Scissors className="mr-2 size-4" aria-hidden /> Ausschneiden
                <span className="ml-auto pl-4 text-xs text-ws-faint">{mod}X</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEinfuegen}>
                <ClipboardPaste className="mr-2 size-4" aria-hidden /> Dahinter einfügen
                <span className="ml-auto pl-4 text-xs text-ws-faint">{mod}V</span>
              </DropdownMenuItem>
              {viele ? (
                <>
                  <DropdownMenuItem onSelect={onDupliziere}>
                    <Copy className="mr-2 size-4" aria-hidden /> Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onAufheben}>
                    <X className="mr-2 size-4" aria-hidden /> Auswahl aufheben
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <SquareDashedMousePointer className="mr-2 size-4" aria-hidden /> Alle gleichen auswählen
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => onGleiche(true)}>In diesem Thema</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onGleiche(false)}>Auf der ganzen Seite</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {!viele && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => einfuegenBei({ thema: ort.thema, index: ort.block })}>
                    <ArrowUpToLine className="mr-2 size-4" aria-hidden /> Block darüber einfügen …
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => einfuegenBei({ thema: ort.thema, index: ort.block + 1 })}>
                    <ArrowDownToLine className="mr-2 size-4" aria-hidden /> Block darunter einfügen …
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onLoesche} className="text-ws-red focus:text-ws-red">
                <Trash2 className="mr-2 size-4" aria-hidden /> {viele ? `${blockZahl(orte.length)} löschen` : 'Löschen'}
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
