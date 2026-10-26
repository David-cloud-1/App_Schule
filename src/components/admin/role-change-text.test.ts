import { describe, it, expect } from 'vitest'
import { roleChangeDescription } from './role-change-text'

const azubi = { display_name: 'Anna Berger', email: 'anna@example.de', role: 'student' as const }
const lehrkraft = { display_name: 'Petra Schweiger', email: 'p.schweiger@example.de', role: 'teacher' as const }

describe('Bestätigungstext beim Rollenwechsel (PROJ-44)', () => {
  it('nennt Name und E-Mail, damit keine Verwechslung passiert', () => {
    const text = roleChangeDescription(azubi, 'teacher')
    expect(text).toContain('Anna Berger (anna@example.de)')
    expect(text).toContain('„Lehrkraft“')
    expect(text).toContain('Zugang zum Lehrkräfte-Bereich')
  })

  it('weist beim Entziehen darauf hin, dass erstellte Inhalte erhalten bleiben', () => {
    const text = roleChangeDescription(lehrkraft, 'student')
    expect(text).toContain('verliert sofort den Zugang')
    expect(text).toContain('Erstellte Inhalte bleiben erhalten und sind danach nur noch für dich sichtbar.')
  })

  it('erklärt beim Herabstufen eines Bereichs-Admins, was wegfällt', () => {
    const text = roleChangeDescription({ ...lehrkraft, role: 'department_admin' }, 'teacher')
    expect(text).toContain('Verwaltungsrechte für einen Fachbereich entfallen')
  })

  it('kommt ohne Namen oder ohne E-Mail aus', () => {
    expect(roleChangeDescription({ ...azubi, display_name: null }, 'teacher')).toMatch(/^anna@example\.de wird/)
    expect(roleChangeDescription({ ...azubi, email: null }, 'teacher')).toMatch(/^Anna Berger wird/)
  })
})
