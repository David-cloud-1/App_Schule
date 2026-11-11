import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AssessmentFilterBar } from './assessment-filter-bar'
import { defaultFilters } from '@/lib/assessment-filter'

const baseProps = {
  schoolYears: ['2026/27', '2025/26'],
  classes: ['SP11a'],
  subjects: [{ id: 's1', name: 'KSK' }],
  hasUnassignedClass: true,
  hasUnassignedSubject: true,
}

describe('AssessmentFilterBar', () => {
  it('zeigt den Status als beschriftete Auswahl mit dem aktuellen Wert', () => {
    const filters = { ...defaultFilters('2026/27'), status: 'unreleased' }
    render(<AssessmentFilterBar {...baseProps} filters={filters} onChange={() => {}} />)

    const trigger = screen.getByLabelText('Status filtern')
    expect(trigger).toHaveTextContent('Nicht freigegeben')
  })

  it('meldet die Sucheingabe, ohne die anderen Filter zu verändern', () => {
    const onChange = vi.fn()
    const filters = { ...defaultFilters('2026/27'), className: 'SP11a' }
    render(<AssessmentFilterBar {...baseProps} filters={filters} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Nachweise nach Titel oder Code suchen'), { target: { value: 'luft' } })
    expect(onChange).toHaveBeenCalledWith({ ...filters, query: 'luft' })
  })

  it('zeigt Schuljahr, Klasse und Fach als beschriftete Auswahl', () => {
    render(<AssessmentFilterBar {...baseProps} filters={defaultFilters('2026/27')} onChange={() => {}} />)
    expect(screen.getByLabelText('Schuljahr')).toBeInTheDocument()
    expect(screen.getByLabelText('Klasse')).toBeInTheDocument()
    expect(screen.getByLabelText('Fach')).toBeInTheDocument()
  })
})
