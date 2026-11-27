import { describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
    { topic_id: 't1', class_level: 10, is_active: true, question_subjects: [{ subject_id: 's1' }] },
    { topic_id: 't1', class_level: 11, is_active: true, question_subjects: [{ subject_id: 's1' }] },
    { topic_id: null, class_level: 10, is_active: true, question_subjects: [{ subject_id: 's1' }] },
  ],
})

function setup(over: Partial<ContentTreeProps> = {}) {
  const props: ContentTreeProps = {
    tree,
    klasse: 'all',
    selected: { subjectId: null, topicId: null },
    expanded: new Set(['s:s1']),
    onToggle: vi.fn(),
    onSelectAll: vi.fn(),
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

describe('ContentTree (PROJ-85, PROJ-131)', () => {
  it('zeigt „Alle Fächer“ oben, Kürzel und Namen, Themen eingerückt und „Ohne Thema“', () => {
    setup()
    expect(screen.getByRole('tree', { name: 'Fächer und Themen' })).toBeInTheDocument()
    expect(screen.getAllByRole('treeitem')[0]).toHaveTextContent('Alle Fächer')
    expect(screen.getAllByRole('treeitem')[0]).toHaveTextContent('3')
    expect(item(/Kaufmännische Steuerung/)).toHaveAttribute('aria-level', '1')
    expect(item(/Kaufmännische Steuerung/)).toHaveTextContent('KSK')
    expect(screen.getByTitle('Kaufmännische Steuerung').className).toContain('truncate')
    expect(item(/Kostenrechnung/)).toHaveAttribute('aria-level', '2')
    expect(item(/Kostenrechnung/).className).toContain('ml-6')
    expect(item(/Kostenrechnung/)).toHaveTextContent('2')
    expect(item(/Controlling/)).toHaveTextContent('0')
    expect(item(/Ohne Thema/)).toHaveTextContent('1')
  })

  it('zeigt die Stufe in der Themenzeile nur, wenn „Alle“ gewählt ist', () => {
    setup()
    expect(item(/Kostenrechnung/)).toHaveTextContent('Stufe 10, 11')
    cleanup()
    setup({ klasse: 11 })
    expect(item(/Kostenrechnung/)).not.toHaveTextContent('Stufe')
  })

  it('gruppiert nur bei mehreren Bereichen mit Zwischenüberschrift', () => {
    setup()
    expect(screen.queryByText('Spedition')).not.toBeInTheDocument()
    cleanup()
    const zwei = {
      ...tree,
      departments: [...tree.departments, { id: 'd2', name: 'Tourismus', code: 'TOUR', subjects: [{ ...tree.departments[0].subjects[1], id: 's9', code: 'TP' }] }],
    }
    setup({ tree: zwei })
    expect(screen.getByText('Spedition')).toBeInTheDocument()
    expect(screen.getByText('Tourismus')).toBeInTheDocument()
  })

  it('kennzeichnet ein ausgeblendetes Fach und verwendet nirgends „Knoten“', () => {
    const { container } = (() => {
      setup()
      return { container: document.body }
    })()
    expect(item(/Altes Fach/)).toHaveTextContent('ausgeblendet')
    expect(container.innerHTML).not.toMatch(/Knoten/)
  })

  it('zählt beim Stufen-Filter nur diese Stufe und blendet leere Themen aus', () => {
    setup({ klasse: 11 })
    expect(item(/Kostenrechnung/)).toHaveTextContent('1')
    expect(screen.queryByRole('treeitem', { name: /Controlling/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('treeitem', { name: /Ohne Thema/ })).not.toBeInTheDocument()
  })

  it('hebt den gewählten Eintrag hervor, sonst „Alle Fächer“', () => {
    setup({ selected: { subjectId: 's1', topicId: 't1' } })
    expect(item(/Kostenrechnung/)).toHaveAttribute('aria-selected', 'true')
    expect(item(/Controlling/)).toHaveAttribute('aria-selected', 'false')
    cleanup()
    setup()
    expect(item(/Alle Fächer/)).toHaveAttribute('aria-selected', 'true')
  })

  it('hält das gewählte Fach immer aufgeklappt', () => {
    setup({ expanded: new Set(), selected: { subjectId: 's1', topicId: 't1' } })
    expect(item(/Kostenrechnung/)).toBeInTheDocument()
  })

  it('wählt per Klick und Enter und legt über „Thema hinzufügen“ an', () => {
    const props = setup()
    fireEvent.click(item(/Alle Fächer/))
    expect(props.onSelectAll).toHaveBeenCalled()
    fireEvent.click(item(/Kostenrechnung/))
    expect(props.onSelectTopic).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), 't1')
    fireEvent.keyDown(item(/Kaufmännische Steuerung/), { key: 'Enter' })
    expect(props.onSelectSubject).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }))
    fireEvent.click(item(/Ohne Thema/))
    expect(props.onSelectTopic).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), 'ohne')
    fireEvent.click(item('Thema hinzufügen'))
    expect(props.onCreateTopic).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }))
  })

  it('bewegt den Fokus mit Pfeil runter und hoch', () => {
    setup()
    const first = item(/Alle Fächer/)
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(item(/Kaufmännische Steuerung/)).toHaveFocus()
    fireEvent.keyDown(item(/Kaufmännische Steuerung/), { key: 'ArrowUp' })
    expect(first).toHaveFocus()
  })

  it('klappt mit Pfeil links zu, Pfeil links am Thema geht zum Fach', () => {
    const props = setup()
    fireEvent.keyDown(item(/Kaufmännische Steuerung/), { key: 'ArrowLeft' })
    expect(props.onToggle).toHaveBeenCalledWith('s:s1')
    fireEvent.keyDown(item(/Kostenrechnung/), { key: 'ArrowLeft' })
    expect(item(/Kaufmännische Steuerung/)).toHaveFocus()
  })

  it('hat nur einen per Tab erreichbaren Eintrag', () => {
    setup({ selected: { subjectId: 's1', topicId: 't1' } })
    const tabbable = screen.getAllByRole('treeitem').filter((n) => n.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveTextContent('Kostenrechnung')
  })

  it('bietet am Fach „Für Azubis ausblenden …“ im Menü statt eines Schalters', () => {
    setup()
    fireEvent.keyDown(screen.getByRole('button', { name: /Weitere Aktionen: Fach KSK/ }), { key: 'Enter' })
    expect(screen.getAllByRole('menuitem').map((e) => e.textContent)).toEqual([
      'Fach bearbeiten',
      'Thema hinzufügen',
      'Für Azubis ausblenden …',
      'Verlauf',
    ])
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('wählt beim Öffnen des Menüs nicht zugleich den Eintrag', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: /Weitere Aktionen: Thema Kostenrechnung/ }))
    expect(props.onSelectTopic).not.toHaveBeenCalled()
  })
})
