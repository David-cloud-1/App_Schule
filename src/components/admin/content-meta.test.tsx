import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { DepartmentTag, LastChangedLine, showVersionConflict } from './content-meta'
import { TargetDepartmentField } from './target-department-field'
import { mockViewport, renderInWorkspace } from './workspace-test-utils'

const departments = [
  { id: 'd1', name: 'Spedition', code: 'SPED' },
  { id: 'd2', name: 'Tourismus', code: 'TOUR' },
]

beforeEach(() => mockViewport(1280))

describe('Bereichs-Etikett (PROJ-70)', () => {
  it('erscheint als Text in „Alle Bereiche“', () => {
    renderInWorkspace(<DepartmentTag name="Tourismus" code="TOUR" />, { scope: { current: null, departments } })
    expect(screen.getByText('Tourismus')).toBeInTheDocument()
  })

  it('entfällt, wenn nur ein Bereich gezeigt wird', () => {
    renderInWorkspace(<DepartmentTag name="Tourismus" code="TOUR" />, { scope: { current: 'd2', departments } })
    expect(screen.queryByText('Tourismus')).not.toBeInTheDocument()
  })
})

describe('Zuletzt geändert', () => {
  it('nennt Person und Datum', () => {
    renderInWorkspace(<LastChangedLine by="Frau Muster" at="2026-11-04T10:00:00Z" />)
    expect(screen.getByText(/Zuletzt geändert von Frau Muster am/)).toBeInTheDocument()
  })

  it('zeigt bei unverändertem Bestand („Stand bei Einführung“) nichts (PROJ-83)', () => {
    renderInWorkspace(<LastChangedLine by="Stand bei Einführung" at="2026-10-27T10:00:00Z" />)
    expect(screen.queryByText(/Zuletzt geändert/)).not.toBeInTheDocument()
  })
})

describe('Zielbereich beim Anlegen', () => {
  it('steht in einem festen Bereich fest da', () => {
    renderInWorkspace(<TargetDepartmentField value="" onChange={() => {}} detail="STG" />, {
      scope: { current: 'd1', departments },
    })
    expect(screen.getByText('Spedition · STG')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('ist in „Alle Bereiche“ ein Pflichtfeld ohne Vorauswahl', () => {
    renderInWorkspace(<TargetDepartmentField value="" onChange={() => {}} error="Bitte wähle den Bereich." />, {
      scope: { current: null, departments },
    })
    expect(screen.getByText('Wird angelegt in (Pflicht)')).toBeInTheDocument()
    expect(screen.getByText('Bereich wählen')).toBeInTheDocument()
    expect(screen.getByText('Bitte wähle den Bereich.')).toBeInTheDocument()
  })
})

describe('Konflikt-Hinweis', () => {
  it('erkennt nur einen echten Versionskonflikt', () => {
    expect(showVersionConflict({ status: 500 }, { error: 'x' })).toBe(false)
    expect(showVersionConflict({ status: 409 }, { error: 'Frage wurde gerade von Anna geändert.', conflict: true })).toBe(true)
  })
})
