import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AdminSegmented } from './admin-segmented'

const options = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Inaktiv' },
] as const

describe('AdminSegmented (PROJ-83)', () => {
  it('zeigt alle Werte und markiert den gewählten', () => {
    render(<AdminSegmented ariaLabel="Status" value="active" onChange={() => {}} options={options} />)
    expect(screen.getByRole('radiogroup', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Aktiv' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Alle' })).toHaveAttribute('aria-checked', 'false')
  })

  it('meldet einen Wechsel mit dem neuen Wert', () => {
    const onChange = vi.fn()
    render(<AdminSegmented ariaLabel="Status" value="all" onChange={onChange} options={options} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Inaktiv' }))
    expect(onChange).toHaveBeenCalledWith('inactive')
  })

  it('lässt die Auswahl bestehen, wenn man den gewählten Wert erneut anklickt', () => {
    const onChange = vi.fn()
    render(<AdminSegmented ariaLabel="Status" value="active" onChange={onChange} options={options} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Aktiv' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hat Bedienflächen von mindestens 44 px', () => {
    render(<AdminSegmented ariaLabel="Status" value="all" onChange={() => {}} options={options} />)
    for (const radio of screen.getAllByRole('radio')) expect(radio.className).toContain('h-11')
  })
})
