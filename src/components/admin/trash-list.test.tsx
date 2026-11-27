import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TrashList } from './trash-list'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const role = vi.hoisted(() => ({ value: 'teacher' }))
vi.mock('@/components/admin/admin-role-provider', () => ({
  useOptionalAdminRole: () => ({ role: role.value, scope: null }),
}))

let calls: { url: string; method: string }[] = []
beforeEach(() => {
  calls = []
  role.value = 'teacher'
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET' })
    if (init?.method) return { ok: true, json: async () => ({}) }
    return { ok: true, json: async () => ({ items: [{ id: 'x1', question_text: 'Alte Frage', deleted_at: '2026-11-01T10:00:00Z', deleted_by: 'Anna Huber' }] }) }
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe('Papierkorb-Liste (PROJ-131)', () => {
  it('zeigt, wer wann gelöscht hat, und stellt wieder her', async () => {
    const onChanged = vi.fn()
    render(<TrashList type="question" onChanged={onChanged} />)
    expect(await screen.findByText(/Gelöscht von Anna Huber/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Endgültig entfernen/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Wiederherstellen' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(calls.at(-1)).toEqual({ url: '/api/admin/trash/question/x1', method: 'POST' })
  })

  it('lässt nur den Super-Admin endgültig löschen und fragt vorher', async () => {
    role.value = 'admin'
    render(<TrashList type="question" />)
    fireEvent.click(await screen.findByRole('button', { name: /Endgültig entfernen: Alte Frage/ }))
    const dialog = screen.getByRole('alertdialog')
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Endgültig entfernen' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true))
  })

  it('lädt Lehrerzimmer-Beiträge aus deren Schnittstelle', async () => {
    render(<TrashList type="forum" />)
    await waitFor(() => expect(calls[0].url).toBe('/api/admin/lehrerzimmer/trash'))
  })
})
