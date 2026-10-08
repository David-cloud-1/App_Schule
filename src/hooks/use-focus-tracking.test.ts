import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useFocusTracking } from './use-focus-tracking'

type Body = { action: string; eventId?: string; questionNumber?: number; seconds?: number }

let visibility: 'visible' | 'hidden' = 'visible'
let fetchMock: ReturnType<typeof vi.fn>
let nextResponse: () => Promise<Response>

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
}

function sentBodies(): Body[] {
  return fetchMock.mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body) as Body)
}

function setVisibility(state: 'visible' | 'hidden') {
  visibility = state
  document.dispatchEvent(new Event('visibilitychange'))
}

function setup(overrides: Partial<Parameters<typeof useFocusTracking>[0]> = {}) {
  const onEnded = vi.fn()
  const finished = { value: false }
  const hook = renderHook(() =>
    useFocusTracking({
      sessionId: 'sess-1',
      enabled: true,
      initialCount: 0,
      currentQuestionRef: { current: { id: 'q-7', number: 7 } },
      isFinished: () => finished.value,
      onEnded,
      ...overrides,
    }),
  )
  return { ...hook, onEnded, finished }
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('useFocusTracking', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-08T10:00:00Z'))
    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
    nextResponse = () => jsonResponse({ countedSwitches: 0, warn: false, autoSubmitted: false })
    fetchMock = vi.fn(() => nextResponse())
    vi.stubGlobal('fetch', fetchMock)
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does nothing when tracking is switched off', async () => {
    setup({ enabled: false })
    await flush()
    setVisibility('hidden')
    await advance(10_000)
    setVisibility('visible')
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('announces itself with a resume report on mount', async () => {
    setup()
    await flush()
    expect(sentBodies()).toEqual([{ action: 'resume' }])
  })

  it('warns after a reload when the server closed a counted absence', async () => {
    nextResponse = () => jsonResponse({ countedSwitches: 2, warn: true, autoSubmitted: false })
    const { result } = setup({ initialCount: 1 })
    await flush()
    expect(result.current.warningNumber).toBe(2)
  })

  it('reports leave and return and warns with the next switch number', async () => {
    const { result } = setup({ initialCount: 1 })
    await flush()
    fetchMock.mockClear()

    setVisibility('hidden')
    await flush()
    await advance(10_000)
    setVisibility('visible')
    await flush()

    const bodies = sentBodies()
    expect(bodies.map((b) => b.action)).toEqual(['leave', 'return'])
    expect(bodies[0]).toMatchObject({ questionNumber: 7 })
    expect(bodies[0].eventId).toBeTruthy()
    expect(bodies[1].eventId).toBe(bodies[0].eventId)
    expect(bodies[1].seconds).toBe(10)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ keepalive: true })
    expect(result.current.warningNumber).toBe(2)
  })

  it('does not warn for an absence under the tolerance but still reports it', async () => {
    const { result } = setup()
    await flush()
    fetchMock.mockClear()

    setVisibility('hidden')
    await flush()
    await advance(1_000)
    setVisibility('visible')
    await flush()

    expect(sentBodies().map((b) => b.action)).toEqual(['leave', 'return'])
    expect(result.current.warningNumber).toBeNull()
  })

  it('counts one absence when visibility and blur both fire', async () => {
    setup()
    await flush()
    fetchMock.mockClear()

    setVisibility('hidden')
    window.dispatchEvent(new Event('blur'))
    await advance(500)
    expect(sentBodies().filter((b) => b.action === 'leave')).toHaveLength(1)

    setVisibility('visible')
    window.dispatchEvent(new Event('focus'))
    await flush()
    expect(sentBodies().filter((b) => b.action === 'return')).toHaveLength(1)
  })

  it('treats an input as proof of return when no focus event arrives', async () => {
    const { result } = setup()
    await flush()
    fetchMock.mockClear()

    window.dispatchEvent(new Event('blur'))
    await advance(400) // jsdom: document.hasFocus() ist false → Wechsel
    await advance(5_000)
    document.dispatchEvent(new Event('pointerdown'))
    await flush()

    expect(sentBodies().map((b) => b.action)).toEqual(['leave', 'return'])
    expect(result.current.warningNumber).toBe(1)
  })

  it('keeps a failed return in a queue and sends it again when back online', async () => {
    setup()
    await flush()
    fetchMock.mockClear()

    nextResponse = () => Promise.reject(new Error('offline'))
    setVisibility('hidden')
    await flush()
    await advance(8_000)
    setVisibility('visible')
    await flush()
    expect(JSON.parse(sessionStorage.getItem('focus-queue-sess-1') ?? '[]')).toHaveLength(1)

    fetchMock.mockClear()
    nextResponse = () => jsonResponse({ countedSwitches: 1, warn: true, autoSubmitted: false })
    window.dispatchEvent(new Event('online'))
    await flush()

    expect(sentBodies().map((b) => b.action)).toEqual(['return'])
    expect(sessionStorage.getItem('focus-queue-sess-1')).toBeNull()
  })

  it('hands over to the caller when the server submitted automatically', async () => {
    const { onEnded } = setup()
    await flush()

    nextResponse = () => jsonResponse({ countedSwitches: 3, warn: true, autoSubmitted: true })
    setVisibility('hidden')
    await flush()
    await advance(6_000)
    setVisibility('visible')
    await flush()

    expect(onEnded).toHaveBeenCalledWith(true)
  })

  it('reports nothing once the attempt was submitted', async () => {
    const { finished } = setup()
    await flush()
    fetchMock.mockClear()

    finished.value = true
    setVisibility('hidden')
    await advance(5_000)
    setVisibility('visible')
    await flush()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('drops reports the server rejects permanently instead of retrying them forever', async () => {
    setup()
    await flush()
    nextResponse = () => jsonResponse({ error: 'Die Bearbeitungszeit ist abgelaufen.' }, 409)
    setVisibility('hidden')
    await flush()
    await advance(5_000)
    setVisibility('visible')
    await flush()
    expect(sessionStorage.getItem('focus-queue-sess-1')).toBeNull()
  })

  it('does not queue a failed resume (it would close an absence that is still running)', async () => {
    nextResponse = () => Promise.reject(new Error('offline'))
    setup()
    await flush()
    expect(sessionStorage.getItem('focus-queue-sess-1')).toBeNull()
  })
})
