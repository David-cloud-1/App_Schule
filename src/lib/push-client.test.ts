import { describe, expect, it } from 'vitest'
import {
  appIconPrefix,
  detectPushSupport,
  isIosUserAgent,
  shouldShowOptInCard,
  urlBase64ToUint8Array,
  type PushEnvironment,
} from './push-client'

const FULL: PushEnvironment = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isIos: false,
  isStandalone: false,
  hasVapidKey: true,
}

describe('detectPushSupport', () => {
  it('Chrome/Android/Desktop: unterstützt', () => {
    expect(detectPushSupport(FULL)).toBe('supported')
  })
  it('iPhone in Safari: erst zum Home-Bildschirm', () => {
    expect(detectPushSupport({ ...FULL, isIos: true, hasPushManager: false })).toBe('ios-install-needed')
  })
  it('iPhone als Home-Bildschirm-App: unterstützt', () => {
    expect(detectPushSupport({ ...FULL, isIos: true, isStandalone: true })).toBe('supported')
  })
  it('alter iPhone-Browser ohne Push auch installiert: nicht unterstützt', () => {
    expect(detectPushSupport({ ...FULL, isIos: true, isStandalone: true, hasPushManager: false })).toBe('unsupported')
  })
  it('ohne VAPID-Schlüssel: nie anbieten', () => {
    expect(detectPushSupport({ ...FULL, hasVapidKey: false })).toBe('unsupported')
  })
  it('Browser ohne Service Worker: nicht unterstützt', () => {
    expect(detectPushSupport({ ...FULL, hasServiceWorker: false })).toBe('unsupported')
  })
})

describe('isIosUserAgent', () => {
  it('erkennt iPhone', () => {
    expect(isIosUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true)
  })
  it('erkennt iPadOS, das sich als Mac ausgibt', () => {
    expect(isIosUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true)
  })
  it('echter Mac ist kein iOS', () => {
    expect(isIosUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false)
  })
  it('Android ist kein iOS', () => {
    expect(isIosUserAgent('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false)
  })
})

describe('shouldShowOptInCard', () => {
  const now = new Date('2026-11-21T12:00:00Z')
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString()

  it('noch nie entschieden: zeigen', () => {
    expect(shouldShowOptInCard({ enabled: false, declined_at: null, decline_count: 0 }, now)).toBe(true)
  })
  it('schon aktiv: nicht zeigen', () => {
    expect(shouldShowOptInCard({ enabled: true, declined_at: null, decline_count: 0 }, now)).toBe(false)
  })
  it('vor 13 Tagen abgelehnt: noch nicht', () => {
    expect(shouldShowOptInCard({ enabled: false, declined_at: daysAgo(13), decline_count: 1 }, now)).toBe(false)
  })
  it('vor genau 14 Tagen abgelehnt: ein zweites Mal zeigen', () => {
    expect(shouldShowOptInCard({ enabled: false, declined_at: daysAgo(14), decline_count: 1 }, now)).toBe(true)
  })
  it('zweimal abgelehnt: nie wieder', () => {
    expect(shouldShowOptInCard({ enabled: false, declined_at: daysAgo(400), decline_count: 2 }, now)).toBe(false)
  })
  it('kaputtes Datum: lieber nicht zeigen', () => {
    expect(shouldShowOptInCard({ enabled: false, declined_at: 'kaputt', decline_count: 1 }, now)).toBe(false)
  })
})

describe('appIconPrefix', () => {
  it('ordnet die Fachbereiche zu', () => {
    expect(appIconPrefix('SPED')).toBe('sped')
    expect(appIconPrefix('tour')).toBe('tour')
    expect(appIconPrefix(null)).toBe('neutral')
    expect(appIconPrefix('XYZ')).toBe('neutral')
  })
})

describe('urlBase64ToUint8Array', () => {
  it('wandelt base64url ohne Auffüllung', () => {
    // "hallo" = aGFsbG8 (base64url, ohne =)
    expect(Array.from(urlBase64ToUint8Array('aGFsbG8'))).toEqual([104, 97, 108, 108, 111])
  })
  it('wandelt - und _ zurück', () => {
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })
})
