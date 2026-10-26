import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsApplePlatform } from './use-is-apple-platform'

afterEach(() => vi.unstubAllGlobals())

function withUserAgent(userAgent: string) {
  vi.stubGlobal('navigator', { ...navigator, userAgent })
}

describe('useIsApplePlatform (PROJ-45)', () => {
  it('erkennt Mac und iPad', () => {
    withUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)')
    expect(renderHook(() => useIsApplePlatform()).result.current).toBe(true)
    withUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')
    expect(renderHook(() => useIsApplePlatform()).result.current).toBe(true)
  })

  it('zeigt auf Windows und Android Strg statt ⌘', () => {
    withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    expect(renderHook(() => useIsApplePlatform()).result.current).toBe(false)
    withUserAgent('Mozilla/5.0 (Linux; Android 14)')
    expect(renderHook(() => useIsApplePlatform()).result.current).toBe(false)
  })
})
