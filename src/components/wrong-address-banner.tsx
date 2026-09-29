'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DepartmentIcon } from '@/components/department-icon'
import { useDepartment, useDepartmentContext } from '@/components/department-provider'

const DISMISS_KEY = 'wrong-address-banner-dismissed'

/**
 * Hinweis, wenn ein eingeloggter Nutzer auf der Adresse eines ANDEREN
 * Fachbereichs ist (PROJ-23): Inhalte stimmen trotzdem (sie kommen aus dem
 * Profil), aber die richtige App hat eine eigene Adresse. Schließbar, gemerkt
 * für die aktuelle Browser-Sitzung.
 */
export function WrongAddressBanner() {
  const { correctAddress } = useDepartmentContext()
  const { iconName } = useDepartment()
  // Erst nach dem Lesen des Sitzungsspeichers anzeigen — kein Aufblitzen
  // für Nutzer, die den Hinweis schon geschlossen haben.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!correctAddress) return
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      // Sitzungsspeicher nicht verfügbar (privater Modus) — Hinweis trotzdem zeigen
    }
    setVisible(!dismissed)
  }, [correctAddress])

  if (!correctAddress || !visible) return null

  function dismiss() {
    setVisible(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // egal — dann erscheint der Hinweis beim nächsten Seitenaufruf wieder
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-3">
      <Alert className="rounded-2xl border-[#1CB0F6]/40 bg-[#1CB0F6]/10 text-[#F9FAFB] pr-12 [&>svg]:text-[#1CB0F6]">
        <DepartmentIcon name={iconName} className="size-5" aria-hidden />
        <AlertDescription className="text-sm leading-relaxed">
          Deine App heißt <span className="font-semibold">{correctAddress.appName}</span> —{' '}
          <a
            href={`https://${correctAddress.domain}`}
            className="inline-flex items-center gap-1 font-semibold text-[#1CB0F6] underline-offset-2 hover:underline"
          >
            hier geht&apos;s zu {correctAddress.domain}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label="Hinweis schließen"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 size-11 rounded-xl text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#374151]"
        >
          <X className="size-5" />
        </Button>
      </Alert>
    </div>
  )
}
