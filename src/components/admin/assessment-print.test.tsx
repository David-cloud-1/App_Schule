import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ClassReportSheet, StudentReportSheet, formatDate, scaleLabel, type ClassParticipant } from './assessment-print'
import { IHK_DEFAULT_SCALE, type StudentReport } from '@/lib/graded-assessments'

const report: StudentReport = {
  sessionId: 's1',
  name: 'Mia Muster',
  submittedAt: '2026-10-01T09:30:00Z',
  excluded: false,
  points: 2,
  totalPoints: 3,
  percent: 67,
  grade: 3,
  questions: [
    {
      id: 'q1',
      text: 'Was ist ein Frachtbrief?',
      result: 'correct',
      explanation: 'Weil er den Vertrag belegt.',
      options: [
        { id: 'a', text: 'Ein Beleg', isCorrect: true, selected: true },
        { id: 'b', text: 'Eine Rechnung', isCorrect: false, selected: false },
      ],
    },
    {
      id: 'q2',
      text: 'Wofür steht CMR?',
      result: 'wrong',
      explanation: null,
      options: [
        { id: 'a', text: 'Straße', isCorrect: true, selected: false },
        { id: 'b', text: 'See', isCorrect: false, selected: true },
      ],
    },
    {
      id: 'q3',
      text: 'Was ist ein Incoterm?',
      result: 'unanswered',
      explanation: 'Er regelt die Lieferbedingungen.',
      options: [
        { id: 'a', text: 'Lieferklausel', isCorrect: true, selected: false },
        { id: 'b', text: 'Steuer', isCorrect: false, selected: false },
      ],
    },
  ],
}

function renderStudent(overrides: Partial<StudentReport> = {}, showExplanations = false) {
  return render(
    <StudentReportSheet
      title="LN 2 – Straße"
      partLabel="Teil 1"
      date="01.10.2026"
      scale={IHK_DEFAULT_SCALE}
      report={{ ...report, ...overrides }}
      showExplanations={showExplanations}
      last
    />,
  )
}

describe('scaleLabel / formatDate', () => {
  it('lists the grading scale from grade 1 to 6, with grade 6 below the grade 5 limit', () => {
    expect(scaleLabel(IHK_DEFAULT_SCALE)).toBe('1 ab 92 % · 2 ab 81 % · 3 ab 67 % · 4 ab 50 % · 5 ab 30 % · 6 unter 30 %')
  })
  it('formats dates in German and shows a dash without a date', () => {
    expect(formatDate('2026-10-01T22:30:00Z')).toBe('2.10.2026') // Europe/Berlin: schon der nächste Tag
    expect(formatDate(null)).toBe('—')
  })
})

describe('StudentReportSheet', () => {
  it('shows name, points, percent, grade and the grading scale that was used', () => {
    renderStudent()
    expect(screen.getByText('Mia Muster')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText('67 %')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText(/Notenschlüssel: 1 ab 92 %/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'LN 2 – Straße' })).toBeInTheDocument()
  })

  it('marks every question as right, wrong or not answered with text, not only colour', () => {
    renderStudent()
    expect(screen.getByText(/✓ richtig/)).toBeInTheDocument()
    expect(screen.getByText(/✗ falsch/)).toBeInTheDocument()
    expect(screen.getByText(/– nicht beantwortet/)).toBeInTheDocument()
  })

  it('names the chosen and the correct answer in words', () => {
    renderStudent()
    const wrong = screen.getByText('Wofür steht CMR?').closest('li') as HTMLElement
    expect(within(wrong).getByText(/See.*\(gewählt\)/)).toBeInTheDocument()
    expect(within(wrong).getByText(/Straße.*\(richtige Antwort\)/)).toBeInTheDocument()
  })

  it('prints explanations only when switched on', () => {
    const { unmount } = renderStudent({}, false)
    expect(screen.queryByText(/Erklärung:/)).not.toBeInTheDocument()
    unmount()
    renderStudent({}, true)
    expect(screen.getByText(/Erklärung: Weil er den Vertrag belegt\./)).toBeInTheDocument()
    expect(screen.getByText(/Erklärung: Er regelt die Lieferbedingungen\./)).toBeInTheDocument()
  })

  it('shows an excluded participant without grade and questions', () => {
    renderStudent({ excluded: true, points: null, totalPoints: null, percent: null, grade: null, questions: [] })
    expect(screen.getByText('Von der Wertung ausgeschlossen')).toBeInTheDocument()
    expect(screen.queryByText('Note')).not.toBeInTheDocument()
    expect(screen.queryByText(/richtig/)).not.toBeInTheDocument()
  })

  it('starts a new page for every sheet except the last one', () => {
    const { container, rerender } = renderStudent()
    expect(container.querySelector('article')?.className).not.toContain('break-after-page')
    rerender(
      <StudentReportSheet
        title="t" partLabel="p" date="d" scale={IHK_DEFAULT_SCALE} report={report} showExplanations={false}
      />,
    )
    expect(container.querySelector('article')?.className).toContain('break-after-page')
  })
})

const participant = (over: Partial<ClassParticipant>): ClassParticipant => ({
  sessionId: 'x',
  name: 'Name',
  points: 3,
  totalPoints: 4,
  percent: 75,
  grade: 3,
  excluded: false,
  status: 'completed',
  ...over,
})

const distribution = { counts: { '1': 1, '2': 1, '3': 1, '4': 0, '5': 0, '6': 0 }, average: 2, passRate: 100 }

function renderClass(participants: ClassParticipant[], extra: Partial<Parameters<typeof ClassReportSheet>[0]> = {}) {
  return render(
    <ClassReportSheet
      title="LN 2 – Straße"
      partLabel="Teil 1"
      date="01.10.2026"
      scale={IHK_DEFAULT_SCALE}
      participants={participants}
      gradeDistribution={distribution}
      questions={[
        { id: 'q1', text: 'Leichte Frage', correctCount: 3, totalCount: 3 },
        { id: 'q2', text: 'Schwere Frage', correctCount: 1, totalCount: 3 },
      ]}
      {...extra}
    />,
  )
}

describe('ClassReportSheet', () => {
  const people = [
    participant({ sessionId: '1', name: 'Zoe Zander', grade: 1, percent: 95 }),
    participant({ sessionId: '2', name: 'Anna Adler', grade: 2, percent: 85 }),
    participant({ sessionId: '3', name: 'Ben Bauer', grade: 3, percent: 70 }),
    participant({ sessionId: '4', name: 'Carl Ausgeschlossen', excluded: true, grade: null, points: null, totalPoints: null, percent: null }),
  ]

  it('lists graded participants alphabetically and excluded ones separately at the end', () => {
    const { container } = renderClass(people)
    const rows = [...container.querySelectorAll('table:first-of-type tbody tr')].map((r) => r.textContent ?? '')
    expect(rows[0]).toContain('Anna Adler')
    expect(rows[1]).toContain('Ben Bauer')
    expect(rows[2]).toContain('Zoe Zander')
    expect(rows[3]).toContain('Carl Ausgeschlossen')
    expect(rows[3]).toContain('von der Wertung ausgeschlossen')
    expect(screen.getByText(/3 gewertet · 1 ausgeschlossen/)).toBeInTheDocument()
  })

  it('shows the statistics with German decimal comma, best and worst grade', () => {
    renderClass(people)
    expect(screen.getByText('2,00')).toBeInTheDocument()
    expect(screen.getByText('Bestanden (1–4)').nextElementSibling?.textContent).toBe('100 %')
    const best = screen.getByText('Beste Note').nextElementSibling
    const worst = screen.getByText('Schlechteste Note').nextElementSibling
    expect(best?.textContent).toBe('1')
    expect(worst?.textContent).toBe('3')
  })

  it('sorts the question analysis from weakest to strongest', () => {
    const { container } = renderClass(people)
    const rows = [...container.querySelectorAll('section:last-of-type tbody tr')].map((r) => r.textContent ?? '')
    expect(rows[0]).toContain('33 %')
    expect(rows[0]).toContain('Schwere Frage')
    expect(rows[1]).toContain('100 %')
  })

  it('marks an interim state while participants are still writing', () => {
    const { rerender } = renderClass(people)
    expect(screen.queryByText(/Zwischenstand/)).not.toBeInTheDocument()
    rerender(
      <ClassReportSheet
        title="t" partLabel="p" date="d" scale={IHK_DEFAULT_SCALE}
        participants={[...people, participant({ sessionId: '9', name: 'Noch Schreibend', status: 'in_progress', grade: null })]}
        gradeDistribution={distribution}
        questions={[]}
      />,
    )
    expect(screen.getByText(/Zwischenstand – 1 Teilnehmer schreibt noch/)).toBeInTheDocument()
    // Wer noch schreibt, steht nicht in der Notenliste
    expect(screen.queryByText('Noch Schreibend')).not.toBeInTheDocument()
  })

  it('omits statistics and question analysis when nobody was graded', () => {
    renderClass([participant({ sessionId: '4', name: 'Nur Ausgeschlossen', excluded: true, grade: null })])
    expect(screen.queryByText('Statistik')).not.toBeInTheDocument()
    expect(screen.queryByText('Fragenanalyse')).not.toBeInTheDocument()
    expect(screen.getByText('von der Wertung ausgeschlossen')).toBeInTheDocument()
  })

  it('repeats the table header on following pages', () => {
    const { container } = renderClass(people)
    expect(container.querySelector('thead.table-header-group')).not.toBeNull()
  })
})
