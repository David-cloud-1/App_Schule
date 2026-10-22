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
  it('markiert den aktiven Status-Chip und meldet einen Wechsel', () => {
    const onChange = vi.fn()
    const filters = defaultFilters('2026/27')
    render(<AssessmentFilterBar {...baseProps} filters={filters} onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Alle' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Offen' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Offen' }))
    expect(onChange).toHaveBeenCalledWith({ ...filters, status: 'open' })
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
