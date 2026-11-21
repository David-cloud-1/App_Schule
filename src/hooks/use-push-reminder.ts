'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  detectPushSupport,
  isIosUserAgent,
  urlBase64ToUint8Array,
  type PushServerStatus,
  type PushSupport,
} from '@/lib/push-client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const SW_PATH = '/sw.js'

export type EnableResult = 'enabled' | 'denied' | 'error'

export interface PushReminderState {
  /** Noch beim Prüfen von Gerät und Server */
  loading: boolean
  support: PushSupport
  /** Browser-Erlaubnis dieses Geräts */
  permission: NotificationPermission | 'unknown'
  /** Dieses Gerät ist angemeldet */
  subscribedHere: boolean
  /** Server-Stand des Kontos (null, wenn nicht ladbar) */
  server: PushServerStatus | null
  busy: boolean
  enable: () => Promise<EnableResult>
  disable: () => Promise<boolean>
  decline: () => Promise<void>
}

function readEnvironment() {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  const win = typeof window !== 'undefined' ? window : undefined
  const isStandalone =
    !!win?.matchMedia?.('(display-mode: standalone)').matches ||
    (nav as (Navigator & { standalone?: boolean }) | undefined)?.standalone === true
  return detectPushSupport({
    hasServiceWorker: !!nav && 'serviceWorker' in nav,
    hasPushManager: !!win && 'PushManager' in win,
    hasNotification: !!win && 'Notification' in win,
    isIos: nav ? isIosUserAgent(nav.userAgent, nav.maxTouchPoints ?? 0) : false,
    isStandalone,
    hasVapidKey: VAPID_PUBLIC_KEY.length > 0,
  })
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
  return (await reg?.pushManager.getSubscription()) ?? null
}

/**
 * Zustand und Aktionen der Erinnerung (PROJ-18). Fragt den Browser
 * nur auf Knopfdruck um Erlaubnis — nie beim Laden der Seite.
 */
export function usePushReminder(): PushReminderState {
  const [loading, setLoading] = useState(true)
  const [support, setSupport] = useState<PushSupport>('unsupported')
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown')
  const [subscribedHere, setSubscribedHere] = useState(false)
  const [server, setServer] = useState<PushServerStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = readEnvironment()
      let perm: NotificationPermission | 'unknown' = 'unknown'
      let here = false
      if (s === 'supported') {
        perm = Notification.permission
        try {
          here = (await currentSubscription()) !== null
        } catch {
          here = false
        }
      }
      let status: PushServerStatus | null = null
      try {
        const res = await fetch('/api/push/status', { cache: 'no-store' })
        if (res.ok) status = (await res.json()) as PushServerStatus
      } catch (err) {
        console.error('[usePushReminder] status', err)
      }
      if (cancelled) return
      setSupport(s)
      setPermission(perm)
      setSubscribedHere(here)
      setServer(status)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async (): Promise<EnableResult> => {
    if (readEnvironment() !== 'supported') return 'error'
    setBusy(true)
    try {
      // Zuerst die Erlaubnis — Safari verlangt sie direkt im Tipp, vor jedem anderen await
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return 'denied'

      await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }))

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) {
        // Ohne Server-Eintrag kämen nie Meldungen — die Geräte-Anmeldung zurücknehmen
        await sub.unsubscribe().catch(() => undefined)
        return 'error'
      }
      setSubscribedHere(true)
      setServer((prev) => ({ declined_at: prev?.declined_at ?? null, decline_count: prev?.decline_count ?? 0, enabled: true }))
      return 'enabled'
    } catch (err) {
      console.error('[usePushReminder] enable', err)
      return 'error'
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async (): Promise<boolean> => {
    setBusy(true)
    try {
      const sub = await currentSubscription()
      if (sub) {
        const res = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        if (!res.ok) return false
        await sub.unsubscribe().catch(() => undefined)
        const body = (await res.json().catch(() => null)) as { enabled?: boolean } | null
        setServer((prev) => (prev ? { ...prev, enabled: body?.enabled ?? false } : prev))
      }
      setSubscribedHere(false)
      return true
    } catch (err) {
      console.error('[usePushReminder] disable', err)
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const decline = useCallback(async () => {
    const now = new Date().toISOString()
    setServer((prev) => ({ enabled: false, declined_at: now, decline_count: (prev?.decline_count ?? 0) + 1 }))
    try {
      await fetch('/api/push/decline', { method: 'POST' })
    } catch (err) {
      console.error('[usePushReminder] decline', err)
    }
  }, [])

  return { loading, support, permission, subscribedHere, server, busy, enable, disable, decline }
}
