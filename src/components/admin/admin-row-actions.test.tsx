import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AdminRowActions } from './admin-row-actions'

function openMenu(name: RegExp) {
  fireEvent.keyDown(screen.getByRole('button', { name }), { key: 'Enter' })
}

describe('AdminRowActions (PROJ-83)', () => {
  it('zeigt Bearbeiten sichtbar und löst es aus', () => {
    const onEdit = vi.fn()
    render(<AdminRowActions subject="Thema Luftfracht" onEdit={onEdit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten: Thema Luftfracht' }))
    expect(onEdit).toHaveBeenCalled()
  })

  it('legt Verlauf und Löschen ins Menü, Löschen zuletzt', () => {
    const onHistory = vi.fn()
    const onDelete = vi.fn()
    render(
      <AdminRowActions
        subject="Frage 1"
        onEdit={() => {}}
        items={[
          { key: 'history', label: 'Verlauf', onSelect: onHistory },
          { key: 'delete', label: 'Löschen', destructive: true, onSelect: onDelete },
        ]}
      />,
    )
    expect(screen.queryByRole('menuitem', { name: 'Löschen' })).not.toBeInTheDocument()
    openMenu(/Weitere Aktionen: Frage 1/)
    const entries = screen.getAllByRole('menuitem').map((e) => e.textContent)
    expect(entries).toEqual(['Verlauf', 'Löschen'])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Löschen' }))
    expect(onDelete).toHaveBeenCalled()
    expect(onHistory).not.toHaveBeenCalled()
  })

  it('zeigt Einträge ohne Rechte nicht und lässt bei leerem Menü das ⋯ weg', () => {
    render(
      <AdminRowActions
        subject="Fach BGP"
        onEdit={() => {}}
        items={[{ key: 'delete', label: 'Löschen', destructive: true, hidden: true, onSelect: () => {} }]}
      />,
    )
    expect(screen.queryByRole('button', { name: /Weitere Aktionen/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bearbeiten: Fach BGP' })).toBeInTheDocument()
  })

  it('lässt das Stift-Symbol weg, wenn es nichts zu bearbeiten gibt', () => {
    render(<AdminRowActions subject="Eintrag" items={[{ key: 'x', label: 'Etwas', onSelect: () => {} }]} />)
    expect(screen.queryByRole('button', { name: /Bearbeiten/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weitere Aktionen: Eintrag' })).toBeInTheDocument()
  })
})
