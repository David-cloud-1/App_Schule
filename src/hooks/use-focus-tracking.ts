'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { FOCUS_COUNT_FROM_SECONDS } from '@/lib/focus-tracking'

// Fokus-Wächter für den Prüfungs-Runner eines Leistungsnachweises (PROJ-30).
// Erkennt Tab-/App-Wechsel, meldet sie an den Server (der Server stempelt die
// Zeit und entscheidet über Zählung und Auto-Abgabe) und liefert die Warnung
// für den Azubi. Der Dialog erscheint sofort — die Meldung läuft im
// Hintergrund und wird bei Verbindungsproblemen nachgereicht.

type FocusAction = 'leave' | 'return' | 'resume'

type FocusReport = {
  action: FocusAction
  eventId?: string
  questionId?: string | null
  questionNumber?: number | null
  seconds?: number
}

type FocusResponse = {
  countedSwitches?: number
  warn?: boolean
  autoSubmitted?: boolean
  ended?: boolean
}

type CurrentQuestion = { id: string | null; number: number }

interface Options {
  sessionId: string
  enabled: boolean
  /** Bereits gezählte Wechsel (z. B. nach einem Wiedereinstieg), damit die Nummer im Dialog stimmt. */
  initialCount: number
  currentQuestionRef: MutableRefObject<CurrentQuestion>
  /** Wurde die Teilnahme schon abgegeben? Danach wird nichts mehr gemeldet. */
  isFinished: () => boolean
  /** Server hat wegen Fokus-Verlusten abgegeben (autoSubmitted) bzw. die Teilnahme ist bereits beendet. */
  onEnded: (autoSubmitted: boolean) => void
}

const RETRY_INTERVAL_MS = 15_000

function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Rückfall für ältere Browser ohne randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function queueKey(sessionId: string) {
  return `focus-queue-${sessionId}`
}

function loadQueue(sessionId: string): FocusReport[] {
  try {
    const raw = sessionStorage.getItem(queueKey(sessionId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveQueue(sessionId: string, queue: FocusReport[]) {
  try {
    if (queue.length === 0) sessionStorage.removeItem(queueKey(sessionId))
    else sessionStorage.setItem(queueKey(sessionId), JSON.stringify(queue.slice(-50)))
  } catch {
    // Speicher gesperrt (privates Fenster o. Ä.) — die Warteschlange bleibt im Arbeitsspeicher
  }
}

export function useFocusTracking({ sessionId, enabled, initialCount, currentQuestionRef, isFinished, onEnded }: Options) {
  const [warningNumber, setWarningNumber] = useState<number | null>(null)
  const countRef = useRef(initialCount)
  const awayRef = useRef<{ id: string; since: number } | null>(null)
  const queueRef = useRef<FocusReport[]>([])
  const flushingRef = useRef(false)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded
  const isFinishedRef = useRef(isFinished)
  isFinishedRef.current = isFinished
  // Der Effekt darf nicht neu starten, nur weil der Aufrufer ein neues Ref-Objekt übergibt
  const questionRefHolder = useRef(currentQuestionRef)
  questionRefHolder.current = currentQuestionRef

  /** Sendet eine Meldung. null = vorübergehender Fehler (später erneut versuchen). */
  const send = useCallback(async (report: FocusReport, keepalive = false): Promise<FocusResponse | null> => {
    try {
      const res = await fetch(`/api/exam/sessions/${sessionId}/focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive,
      })
      if (res.status === 429 || res.status >= 500) return null
      if (!res.ok) return {} // 4xx: wird nicht besser, nicht erneut senden
      return (await res.json()) as FocusResponse
    } catch {
      return null
    }
  }, [sessionId])

  const applyResponse = useCallback((res: FocusResponse) => {
    if (typeof res.countedSwitches === 'number') {
      countRef.current = Math.max(countRef.current, res.countedSwitches)
      setWarningNumber((prev) => (prev != null ? Math.max(prev, countRef.current) : prev))
    }
    if (res.autoSubmitted) onEndedRef.current(true)
    else if (res.ended && !isFinishedRef.current()) onEndedRef.current(false)
  }, [])

  const flushQueue = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0) return
    flushingRef.current = true
    try {
      while (queueRef.current.length > 0 && !isFinishedRef.current()) {
        const next = queueRef.current[0]
        const res = await send(next)
        if (res === null) break
        queueRef.current.shift()
        saveQueue(sessionId, queueRef.current)
        applyResponse(res)
      }
    } finally {
      flushingRef.current = false
    }
  }, [applyResponse, send, sessionId])

  useEffect(() => {
    if (!enabled) return
    queueRef.current = loadQueue(sessionId)

    // Beim (Wieder-)Öffnen: offene Einträge schließen und ggf. nachträglich warnen
    ;(async () => {
      const res = await send({ action: 'resume' })
      // Schlägt „resume" fehl, wird sie nicht nachgereicht: später gesendet würde sie
      // einen Eintrag schließen, während der Azubi gerade wirklich weg ist.
      if (res === null) return
      if (res.warn && typeof res.countedSwitches === 'number') {
        countRef.current = Math.max(countRef.current, res.countedSwitches)
        setWarningNumber(countRef.current)
      }
      applyResponse(res)
      flushQueue()
    })()

    function goAway() {
      if (awayRef.current || isFinishedRef.current()) return
      const away = { id: newEventId(), since: Date.now() }
      awayRef.current = away
      const q = questionRefHolder.current.current
      // keepalive: die Meldung soll auch beim Schließen des Tabs noch rausgehen
      void send({ action: 'leave', eventId: away.id, questionId: q.id, questionNumber: q.number }, true)
    }

    function comeBack() {
      const away = awayRef.current
      if (!away) return
      awayRef.current = null
      if (isFinishedRef.current()) return
      const seconds = Math.max(0, Math.round((Date.now() - away.since) / 1000))
      const q = questionRefHolder.current.current
      const report: FocusReport = { action: 'return', eventId: away.id, questionId: q.id, questionNumber: q.number, seconds }

      // Warnung sofort, ohne auf den Server zu warten; die Nummer gleicht der Server-Zähler an
      if (seconds >= FOCUS_COUNT_FROM_SECONDS) {
        countRef.current += 1
        setWarningNumber(countRef.current)
      }
      void (async () => {
        const res = await send(report)
        if (res === null) {
          queueRef.current.push(report)
          saveQueue(sessionId, queueRef.current)
          return
        }
        applyResponse(res)
        flushQueue()
      })()
    }

    let blurTimer: ReturnType<typeof setTimeout> | undefined
    function onVisibility() {
      if (document.visibilityState === 'hidden') goAway()
      else comeBack()
    }
    function onBlur() {
      // Kurz warten: ein Klick ins Eingabefeld o. Ä. soll nicht als Wechsel gelten
      clearTimeout(blurTimer)
      blurTimer = setTimeout(() => {
        if (!document.hasFocus()) goAway()
      }, 300)
    }
    function onFocus() {
      clearTimeout(blurTimer)
      comeBack()
    }
    // Eine Eingabe im Fenster beweist, dass der Azubi zurück ist — verhindert
    // einen „hängenden" Eintrag, falls ein Fokus-Ereignis ausbleibt.
    function onInteraction() {
      comeBack()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onFocus)
    window.addEventListener('online', flushQueue)
    document.addEventListener('pointerdown', onInteraction, true)
    document.addEventListener('keydown', onInteraction, true)
    const retry = setInterval(flushQueue, RETRY_INTERVAL_MS)

    return () => {
      clearTimeout(blurTimer)
      clearInterval(retry)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onFocus)
      window.removeEventListener('online', flushQueue)
      document.removeEventListener('pointerdown', onInteraction, true)
      document.removeEventListener('keydown', onInteraction, true)
    }
  }, [enabled, sessionId, send, applyResponse, flushQueue])

  const dismissWarning = useCallback(() => setWarningNumber(null), [])

  return { warningNumber, dismissWarning }
}
