import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NachschlagenPage from './page'
import { teacherMayOpenAdminPath } from '@/lib/roles'
import { CHECKLISTEN_HREF } from '@/lib/checklisten/liste'
import { SCHULRECHT_HREF } from '@/lib/schulrecht'

describe('Seite „Nachschlagen“ (PROJ-130, B76)', () => {
  it('zeigt Seitenkopf und genau zwei Karten, die auf die bestehenden Seiten führen', () => {
    render(<NachschlagenPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Nachschlagen' })).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Schulrecht/ })).toHaveAttribute('href', SCHULRECHT_HREF)
    expect(screen.getByRole('link', { name: /Checklisten/ })).toHaveAttribute('href', CHECKLISTEN_HREF)
  })

  it('gibt jeder Karte einen Satz Erklärung', () => {
    render(<NachschlagenPage />)
    for (const link of screen.getAllByRole('link')) {
      expect(link.querySelector('p')?.textContent?.trim().length ?? 0).toBeGreaterThan(10)
    }
  })

  it('ist für jede Lehrkraft freigegeben, auch die Unterseiten', () => {
    expect(teacherMayOpenAdminPath('/admin/nachschlagen')).toBe(true)
    expect(teacherMayOpenAdminPath(SCHULRECHT_HREF)).toBe(true)
    expect(teacherMayOpenAdminPath(CHECKLISTEN_HREF)).toBe(true)
  })
})
