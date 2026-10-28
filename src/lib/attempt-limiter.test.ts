import { describe, it, expect } from 'vitest'
import { createAttemptLimiter } from './attempt-limiter'

function setup() {
  let t = 1_000_000
  const limiter = createAttemptLimiter({ max: 3, windowMs: 10 * 60_000, now: () => t })
  return { limiter, advance: (ms: number) => (t += ms) }
}

describe('createAttemptLimiter (PROJ-50)', () => {
  it('sperrt erst nach dem letzten erlaubten Fehlversuch', () => {
    const { limiter } = setup()
    limiter.recordFailure('u1')
    limiter.recordFailure('u1')
    expect(limiter.blockedFor('u1')).toBe(0)
    limiter.recordFailure('u1')
    expect(limiter.blockedFor('u1')).toBeGreaterThan(0)
  })

  it('betrifft nur die Person mit den Fehlversuchen', () => {
    const { limiter } = setup()
    for (let i = 0; i < 3; i++) limiter.recordFailure('u1')
    expect(limiter.blockedFor('u1')).toBeGreaterThan(0)
    expect(limiter.blockedFor('u2')).toBe(0)
  })

  it('gibt nach dem Zeitfenster wieder frei und nennt die Restzeit', () => {
    const { limiter, advance } = setup()
    for (let i = 0; i < 3; i++) limiter.recordFailure('u1')
    expect(limiter.blockedFor('u1')).toBe(600)
    advance(5 * 60_000)
    expect(limiter.blockedFor('u1')).toBe(300)
    advance(5 * 60_000 + 1)
    expect(limiter.blockedFor('u1')).toBe(0)
  })

  it('setzt mit einem Erfolg (reset) zurück', () => {
    const { limiter } = setup()
    for (let i = 0; i < 3; i++) limiter.recordFailure('u1')
    limiter.reset('u1')
    expect(limiter.blockedFor('u1')).toBe(0)
  })
})
