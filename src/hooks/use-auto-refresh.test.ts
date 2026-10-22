import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAutoRefresh } from './use-auto-refresh'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutoRefresh', () => {
  it('ruft im Intervall auf, solange aktiv', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(true, fn, 1000))
    vi.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('ruft nicht auf, wenn inaktiv', () => {
    const fn = vi.fn()
    renderHook(() => useAutoRefresh(false, fn, 1000))
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('hört nach dem Ausblenden (Unmount) auf', () => {
    const fn = vi.fn()
    const { unmount } = renderHook(() => useAutoRefresh(true, fn, 1000))
    unmount()
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('pausiert bei verstecktem Tab', () => {
    const fn = vi.fn()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    renderHook(() => useAutoRefresh(true, fn, 1000))
    vi.advanceTimersByTime(3000)
    expect(fn).not.toHaveBeenCalled()
  })
})
