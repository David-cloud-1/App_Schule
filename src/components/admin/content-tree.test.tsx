import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ContentTree, type ContentTreeProps } from './content-tree'
import { buildContentTree } from '@/lib/content-tree'

const tree = buildContentTree({
  subjects: [
    { id: 's1', name: 'Kaufmännische Steuerung', code: 'KSK', is_active: true, department_id: 'd1', version_number: 1, departments: { id: 'd1', name: 'Spedition', code: 'SPED' } },
    { id: 's2', name: 'Altes Fach', code: 'ALT', is_active: false, department_id: 'd1', version_number: 1, departments: { id: 'd1', name: 'Spedition', code: 'SPED' } },
  ],
  topics: [
    { id: 't1', name: 'Kostenrechnung', subject_id: 's1', version_number: 1 },
    { id: 't2', name: 'Controlling', subject_id: 's1', version_number: 1 },
  ],
  questions: [
    { topic_id: 't1', class_level: 10, question_subjects: [{ subject_id: 's1' }] },
    { topic_id: 't1', class_level: 11, question_subjects: [{ subject_id: 's1' }] },
    { topic_id: null, class_level: 10, question_subjects: [{ subject_id: 's1' }] },
  ],
})

function setup(over: Partial<ContentTreeProps> = {}) {
  const props: ContentTreeProps = {
    tree,
    klasse: 'all',
    selected: { subjectId: null, topicId: null },
    expanded: new Set(['d:d1', 's:s1']),
    onToggle: vi.fn(),
    onSelectSubject: vi.fn(),
    onSelectTopic: vi.fn(),
    onEditSubject: vi.fn(),
    onToggleSubjectActive: vi.fn(),
    onCreateTopic: vi.fn(),
    onSubjectHistory: vi.fn(),
    onRenameTopic: vi.fn(),
    onTopicHistory: vi.fn(),
    onDeleteTopic: vi.fn(),
    ...over,
  }
  render(<ContentTree {...props} />)
  return props
}

const item = (name: RegExp | string) => screen.getByRole('treeitem', { name })

describe('ContentTree (PROJ-85)', () => {
  it('zeigt Bereich, Fächer, Themen und „Ohne Thema“ mit Zählern', () => {
    setup()
    expect(screen.getByRole('tree', { name: 'Fächer und Themen' })).toBeInTheDocument()
    expect(item(/Spedition/)).toHaveAttribute('aria-level', '1')
    expect(item(/Kaufmännische Steuerung/)).toHaveAttribute('aria-level', '2')
    expect(item(/Kostenrechnung/)).toHaveTextContent('2')
    expect(item(/Controlling/)).toHaveTextContent('0')
    expect(item(/Ohne Thema/)).toHaveTextContent('1')
  })

  it('kennzeichnet ein inaktives Fach', () => {
    setup()
    expect(item(/Altes Fach/)).toHaveTextContent('inaktiv')
  })

  it('zählt beim Klassenfilter nur diese Stufe und blendet leere Themen aus', () => {
    setup({ klasse: 11 })
    expect(item(/Kostenrechnung/)).toHaveTextContent('1')
    expect(screen.queryByRole('treeitem', { name: /Controlling/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('treeitem', { name: /Ohne Thema/ })).not.toBeInTheDocument()
  })

  it('hebt den gewählten Knoten hervor', () => {
    setup({ selected: { subjectId: 's1', topicId: 't1' } })
    expect(item(/Kostenrechnung/)).toHaveAttribute('aria-selected', 'true')
    expect(item(/Controlling/)).toHaveAttribute('aria-selected', 'false')
  })

  it('wählt per Klick und Enter', () => {
    const props = setup()
    fireEvent.click(item(/Kostenrechnung/))
    expect(props.onSelectTopic).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), 't1')
    fireEvent.keyDown(item(/Kaufmännische Steuerung/), { key: 'Enter' })
    expect(props.onSelectSubject).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }))
    fireEvent.click(item(/Ohne Thema/))
    expect(props.onSelectTopic).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), 'ohne')
  })

  it('bewegt den Fokus mit Pfeil runter und hoch', () => {
    setup()
    const first = item(/Spedition/)
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(item(/Kaufmännische Steuerung/)).toHaveFocus()
    fireEvent.keyDown(item(/Kaufmännische Steuerung/), { key: 'ArrowUp' })
    expect(first).toHaveFocus()
  })

  it('klappt mit Pfeil links zu und mit Pfeil rechts auf, links geht zum Elternknoten', () => {
    const props = setup()
    fireEvent.keyDown(item(/Kaufmännische Steuerung/), { key: 'ArrowLeft' })
    expect(props.onToggle).toHaveBeenCalledWith('s:s1')
    fireEvent.keyDown(item(/Kostenrechnung/), { key: 'ArrowLeft' })
    expect(item(/Kaufmännische Steuerung/)).toHaveFocus()
  })

  it('hat nur einen per Tab erreichbaren Knoten', () => {
    setup({ selected: { subjectId: 's1', topicId: 't1' } })
    const tabbable = screen.getAllByRole('treeitem').filter((n) => n.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveTextContent('Kostenrechnung')
  })

  it('bietet am Fach und am Thema die vorgesehenen Menüpunkte, Löschen zuletzt', () => {
    setup()
    fireEvent.keyDown(screen.getByRole('button', { name: /Weitere Aktionen: Fach Kaufmännische Steuerung/ }), { key: 'Enter' })
    expect(screen.getAllByRole('menuitem').map((e) => e.textContent)).toEqual([
      'Fach bearbeiten',
      'Deaktivieren',
      'Thema anlegen',
      'Verlauf',
    ])
  })

  it('wählt beim Öffnen des Menüs nicht zugleich den Knoten', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: /Weitere Aktionen: Thema Kostenrechnung/ }))
    expect(props.onSelectTopic).not.toHaveBeenCalled()
  })
})
