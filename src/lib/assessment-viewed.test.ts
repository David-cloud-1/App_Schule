import { describe, it, expect } from 'vitest'
import { shouldMarkCreatorViewed } from './assessment-viewed'

const closed = { status: 'closed', created_by: 'u1', creator_viewed_at: null }

describe('shouldMarkCreatorViewed (PROJ-50)', () => {
  it('markiert, wenn die erstellende Person eine geschlossene Auswertung zum ersten Mal öffnet', () => {
    expect(shouldMarkCreatorViewed(closed, 'u1')).toBe(true)
  })

  it('markiert nie, wenn jemand anderes die Auswertung öffnet', () => {
    expect(shouldMarkCreatorViewed(closed, 'admin-1')).toBe(false)
  })

  it('markiert nicht erneut und nicht vor dem Schließen', () => {
    expect(shouldMarkCreatorViewed({ ...closed, creator_viewed_at: '2026-10-27T10:00:00Z' }, 'u1')).toBe(false)
    expect(shouldMarkCreatorViewed({ ...closed, status: 'open' }, 'u1')).toBe(false)
    expect(shouldMarkCreatorViewed({ ...closed, status: 'draft' }, 'u1')).toBe(false)
  })

  it('markiert nicht, wenn die Erstellerin nicht mehr bekannt ist', () => {
    expect(shouldMarkCreatorViewed({ ...closed, created_by: null }, 'u1')).toBe(false)
  })
})
