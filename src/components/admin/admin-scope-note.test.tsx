import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { AdminPageHeader } from './admin-page-header'
import { AdminHome } from './admin-home'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'

let mockPath = '/admin/questions'
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }))

beforeEach(() => {
  mockViewport(1280)
  mockPath = '/admin/questions'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ assessments: [], subjects: [] }) }))
})

describe('Umfangszeile im Seitenkopf (PROJ-49)', () => {
  it('sagt der Lehrkraft, dass sie nur ihre Fächer sieht, mit Link zu „Meine Fächer“', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, { role: 'teacher' })
    expect(screen.getByText(/Du siehst nur Inhalte deiner Fächer/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meine Fächer' })).toHaveAttribute('href', '/admin/my-subjects')
  })

  it('sagt dem Bereichs-Admin, dass er den ganzen Bereich sieht', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, { role: 'department_admin' })
    expect(screen.getByText(/Du siehst den (ganzen )?Bereich/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Meine Fächer' })).not.toBeInTheDocument()
  })

  it('zeigt auf Seiten außerhalb der Gruppe „Inhalte“ keine Umfangszeile', () => {
    mockPath = '/admin/leistungsnachweise'
    renderInWorkspace(<AdminPageHeader title="Leistungsnachweise" />, { role: 'teacher' })
    expect(screen.queryByText(/Du siehst/)).not.toBeInTheDocument()
  })

  it('lässt sie bei einer Lehrkraft ohne Fach weg (der Leerzustand erklärt den Weg)', () => {
    renderInWorkspace(<AdminPageHeader title="Fragen" />, { role: 'teacher', hasSubjectAssignments: false })
    expect(screen.queryByText(/Du siehst/)).not.toBeInTheDocument()
  })
})

describe('Hinweis nach gesperrter Seite (PROJ-49)', () => {
  it('erklärt der Lehrkraft, wer die Seite verwaltet', () => {
    renderInWorkspace(<AdminHome blocked />, { role: 'teacher' })
    expect(screen.getByText('Das verwaltet dein Bereichs-Admin.', { exact: false })).toBeInTheDocument()
  })

  it('zeigt ohne Umleitung keinen Hinweis', () => {
    renderInWorkspace(<AdminHome />, { role: 'teacher' })
    expect(screen.queryByText('Das verwaltet dein Bereichs-Admin.', { exact: false })).not.toBeInTheDocument()
  })
})
