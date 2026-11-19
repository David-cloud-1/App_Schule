'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-browser'
import { ABSENCE_API, ABSENCE_HREF } from '@/lib/absence'
import type { KalenderHinweis } from '@/lib/kalender'

/**
 * „Neu für dich“ auf der Startseite (PROJ-120): kurze Hinweise, wenn jemand
 * für dich eine Abwesenheit angelegt, geändert oder gelöscht hat oder eine
 * Vertretung eingetragen wurde. „Okay“ blendet einen Hinweis aus. Neue Hinweise
 * erscheinen live; ohne Hinweise zeigt die Karte nichts.
 */
export function CalendarNoticesCard() {
  const [notices, setNotices] = useState<KalenderHinweis[]>([])
  const mounted = useRef(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${ABSENCE_API}/hinweise`, { cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { items?: KalenderHinweis[] }
      if (mounted.current) setNotices(Array.isArray(body.items) ? body.items : [])
    } catch {
      /* Hinweise sind nur eine Zugabe: ohne Antwort bleibt die Karte weg */
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    // Die Live-Verbindung ist eine Zugabe: schlägt sie fehl, zeigt die Karte den Stand beim Laden
    let cleanup: () => void = () => {}
    try {
      const sb = createClient()
      const channel = sb
        .channel('kalender-hinweise')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kalender_hinweise' }, () => void load())
        .subscribe()
      cleanup = () => void sb.removeChannel(channel)
    } catch {
      /* ohne Live-Verbindung weiter */
    }
    return () => {
      mounted.current = false
      cleanup()
    }
  }, [load])

  async function dismiss(id: string | null) {
    // Sofort ausblenden, bei Fehler beim nächsten Laden wieder anzeigen
    setNotices((cur) => (id ? cur.filter((n) => n.id !== id) : []))
    try {
      await fetch(`${ABSENCE_API}/hinweise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      void load()
    }
  }

  if (notices.length === 0) return null

  return (
    <section aria-labelledby="home-calendar-notices" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="home-calendar-notices" className="flex items-center gap-2 text-base font-semibold text-ws-text">
          <Bell className="size-4 text-ws-blue" aria-hidden />
          Neu für dich
        </h2>
        {notices.length > 1 && (
          <Button variant="ghost" className="min-h-11 rounded-xl text-ws-muted" onClick={() => void dismiss(null)}>
            Alle mit Okay bestätigen
          </Button>
        )}
      </div>
      <ul className="divide-y divide-ws-line overflow-hidden rounded-xl border border-ws-blue/30 bg-ws-blue/5">
        {notices.map((n) => (
          <li key={n.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <Link
              href={ABSENCE_HREF}
              className="min-w-0 flex-1 rounded py-2 text-sm text-ws-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
            >
              {n.text}
            </Link>
            <Button
              variant="outline"
              className="min-h-11 shrink-0 rounded-xl"
              onClick={() => void dismiss(n.id)}
              aria-label={`Okay: ${n.text}`}
            >
              <X className="mr-1 size-4" aria-hidden />
              Okay
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
