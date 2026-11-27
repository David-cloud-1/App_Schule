import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import { useTargetDepartment } from '@/components/admin/target-department-field'

const departments = [
  { id: 'sped', name: 'Spedition', code: 'SPED', isActive: true },
  { id: 'tour', name: 'Tourismus', code: 'TOUR', isActive: true },
]

/** Der Bereich des Umschalters lässt sich im Test wechseln wie durch einen zweiten Tab */
function setup(start: string | null, startOpen = true) {
  let current = start
  const view = renderHook(({ open }: { open: boolean }) => useTargetDepartment(open), {
    initialProps: { open: startOpen },
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <AdminRoleProvider value={{ role: 'teacher', isSuperAdmin: false, scope: { current, departments } }}>
        {children}
      </AdminRoleProvider>
    ),
  })
  return { ...view, wechsle: (next: string | null) => (current = next) }
}

describe('useTargetDepartment (PROJ-130, BUG-1)', () => {
  it('schickt auch den fest gewählten Bereich mit', () => {
    const { result } = setup('sped')
    expect(result.current.departmentId).toBe('sped')
    expect(result.current.needsTarget).toBe(false)
  })

  it('behält den Bereich, mit dem der Dialog geöffnet wurde', () => {
    const { result, rerender, wechsle } = setup('sped')
    wechsle('tour')
    rerender({ open: true })
    expect(result.current.departmentId).toBe('sped')
  })

  it('übernimmt beim nächsten Öffnen den neuen Bereich', () => {
    const { result, rerender, wechsle } = setup('sped')
    rerender({ open: false })
    wechsle('tour')
    rerender({ open: true })
    expect(result.current.departmentId).toBe('tour')
  })

  it('verlangt bei „Alle Bereiche“ eine Wahl und leert sie beim erneuten Öffnen', () => {
    const { result, rerender } = setup(null)
    expect(result.current.needsTarget).toBe(true)
    expect(result.current.departmentId).toBeNull()
    act(() => result.current.setChosen('tour'))
    expect(result.current.departmentId).toBe('tour')
    rerender({ open: false })
    rerender({ open: true })
    expect(result.current.departmentId).toBeNull()
  })
})
