'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CreatedAccount } from '@/lib/account-create'

/** Spec PROJ-62: höchstens 8 Zettel pro A4-Seite (2 Spalten × 4 Reihen) */
export const SLIPS_PER_PAGE = 8

export function paginateSlips<T>(items: readonly T[], perPage = SLIPS_PER_PAGE): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage))
  return pages
}

type SlipAccount = Pick<CreatedAccount, 'name' | 'email' | 'password' | 'appUrl'>

interface AccessSlipsPrintProps {
  accounts: readonly SlipAccount[]
  /** Adresse der App für Konten ohne eigene Bereichs-Adresse */
  appUrl: string
  /** Nach dem Drucken oder Abbrechen des Druckdialogs */
  onDone: () => void
}

/**
 * Zugangszettel (PROJ-62): pro Person ein Abschnitt zum Ausschneiden, mit
 * Schnittlinien. Die Zettel entstehen nur im Browser aus den Zugangsdaten, die
 * die Seite gerade im Arbeitsspeicher hält — es gibt bewusst keine eigene
 * Druckadresse, damit Passwörter nie über eine URL oder den Server laufen.
 *
 * Beim Einblenden öffnet sich der Druckdialog. Während er offen ist, zeigt
 * `globals.css` nur diese Zettel (`data-zettel-druck`) und blendet den Rest
 * der Seite aus. Papier ist weiß mit schwarzer Schrift (Ausnahme laut DESIGN.md).
 */
export function AccessSlipsPrint({ accounts, appUrl, onDone }: AccessSlipsPrintProps) {
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const finish = () => onDoneRef.current()
    window.addEventListener('afterprint', finish)
    // Kurz warten, damit die Zettel im Dokument stehen, bevor der Druckdialog sie liest
    const timer = window.setTimeout(() => window.print(), 50)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', finish)
    }
  }, [])

  const pages = paginateSlips(accounts)

  return createPortal(
    <div data-zettel-druck="" className="hidden bg-white text-black print:block">
      {/* Fester Rand, damit die 8 Zettel in jedem Browser auf eine Seite passen (wie die Nachweis-Bögen) */}
      <style>{'@page { size: A4; margin: 10mm; }'}</style>
      {pages.map((page, pageIndex) => (
        <section
          key={pageIndex}
          className="grid h-[270mm] grid-cols-2 grid-rows-4 print:break-after-page print:last:break-after-auto"
        >
          {page.map((account, index) => (
            <article
              key={`${account.email}-${index}`}
              className="flex flex-col justify-center gap-1 border border-dashed border-gray-500 p-5 print:break-inside-avoid"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Zugangsdaten Lern-App</p>
              <p className="text-base font-bold">{account.name}</p>
              <p className="text-sm">
                <span className="text-gray-600">Adresse: </span>
                {account.appUrl ?? appUrl}
              </p>
              <p className="break-all text-sm">
                <span className="text-gray-600">E-Mail: </span>
                {account.email}
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Start-Passwort: </span>
                <span className="font-mono text-base font-semibold">{account.password}</span>
              </p>
              <p className="mt-1 text-xs text-gray-700">Beim ersten Login legst du ein eigenes Passwort fest.</p>
            </article>
          ))}
        </section>
      ))}
    </div>,
    document.body,
  )
}
