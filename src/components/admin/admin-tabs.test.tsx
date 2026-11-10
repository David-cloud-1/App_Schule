import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from './admin-tabs'

describe('AdminTabs (PROJ-83)', () => {
  it('zeigt die Tabs mit aktivem Tab und dessen Inhalt', () => {
    render(
      <AdminTabs defaultValue="a">
        <AdminTabsList>
          <AdminTabsTrigger value="a">Erster</AdminTabsTrigger>
          <AdminTabsTrigger value="b">Zweiter</AdminTabsTrigger>
        </AdminTabsList>
        <AdminTabsContent value="a">Inhalt A</AdminTabsContent>
        <AdminTabsContent value="b">Inhalt B</AdminTabsContent>
      </AdminTabs>,
    )
    expect(screen.getByRole('tab', { name: 'Erster' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Zweiter' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Inhalt A')).toBeInTheDocument()
    expect(screen.queryByText('Inhalt B')).not.toBeInTheDocument()
  })

  it('hat 44 px hohe Tabs, die in sich scrollen', () => {
    render(
      <AdminTabs defaultValue="a">
        <AdminTabsList>
          <AdminTabsTrigger value="a">Erster</AdminTabsTrigger>
        </AdminTabsList>
      </AdminTabs>,
    )
    expect(screen.getByRole('tab').className).toContain('min-h-11')
    expect(screen.getByRole('tablist').className).toContain('overflow-x-auto')
  })
})
