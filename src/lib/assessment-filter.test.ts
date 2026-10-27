import { describe, it, expect } from 'vitest'
import {
  FILTER_ALL, FILTER_NONE, classFilterValue, classFromFilter, classOptions, creatorOptions, defaultFilters, departmentOptions,
  filterAssessments, filtersFromParams, filtersToParams, schoolYearChoices, schoolYearOptions, subjectOptions,
  type CategorizedAssessment,
} from './assessment-filter'

const make = (over: Partial<CategorizedAssessment>): CategorizedAssessment => ({
  title: 'LN', accessCode: '86R3–ME', status: 'closed', schoolYear: '2026/27', className: null,
  subjectId: null, subjectName: null, createdAt: '2026-10-01T00:00:00Z', ...over,
})

const items = [
  make({ title: 'KSK Kalkulation', accessCode: 'AAAA–BB', className: 'SP11a', subjectId: 's1', subjectName: 'KSK', createdAt: '2026-10-05T00:00:00Z' }),
  make({ title: 'Luftfracht', accessCode: 'E4YU–QZ', className: 'SP11b', subjectId: 's2', subjectName: 'STG', status: 'open', createdAt: '2026-10-09T00:00:00Z' }),
  make({ title: 'Altes Heft', schoolYear: '2025/26', createdAt: '2026-05-01T00:00:00Z' }),
  make({ title: 'Ohne Ablage', createdAt: '2026-10-21T00:00:00Z' }),
]

describe('filterAssessments', () => {
  it('zeigt standardmäßig nur das aktuelle Schuljahr, neueste zuerst', () => {
    const res = filterAssessments(items, defaultFilters('2026/27'))
    expect(res.map((a) => a.title)).toEqual(['Ohne Ablage', 'Luftfracht', 'KSK Kalkulation'])
  })

  it('zeigt mit „Alle Schuljahre“ auch ältere Nachweise', () => {
    const res = filterAssessments(items, { ...defaultFilters('2026/27'), schoolYear: FILTER_ALL })
    expect(res).toHaveLength(4)
  })

  it('kombiniert Filter (UND)', () => {
    const f = { ...defaultFilters('2026/27'), className: classFilterValue('SP11b'), subjectId: 's2', status: 'open' }
    expect(filterAssessments(items, f).map((a) => a.title)).toEqual(['Luftfracht'])
    expect(filterAssessments(items, { ...f, status: 'closed' })).toEqual([])
  })

  it('findet „Ohne Zuordnung“ bei Klasse und Fach', () => {
    const f = { ...defaultFilters('2026/27'), className: FILTER_NONE }
    expect(filterAssessments(items, f).map((a) => a.title)).toEqual(['Ohne Ablage'])
    expect(filterAssessments(items, { ...defaultFilters('2026/27'), subjectId: FILTER_NONE }).map((a) => a.title)).toEqual(['Ohne Ablage'])
  })

  it('sucht in Titel und Code ohne Rücksicht auf Groß-/Kleinschreibung und Trennzeichen', () => {
    const f = defaultFilters('2026/27')
    expect(filterAssessments(items, { ...f, query: 'kalk' }).map((a) => a.title)).toEqual(['KSK Kalkulation'])
    expect(filterAssessments(items, { ...f, query: 'e4yu qz' }).map((a) => a.title)).toEqual(['Luftfracht'])
    expect(filterAssessments(items, { ...f, query: 'e4yu-qz' })).toHaveLength(1)
    expect(filterAssessments(items, { ...f, query: 'gibtsnicht' })).toEqual([])
  })
})

describe('PROJ-46: Zielbereich und Erstellt-von', () => {
  const dept = [
    make({ title: 'Sped-Nachweis', departmentId: 'd1', departmentName: 'Spedition', createdBy: 'u1', createdByName: 'Frau Muster' }),
    make({ title: 'Tour-Nachweis', departmentId: 'd2', departmentName: 'Tourismus', createdBy: 'u2', createdByName: 'Herr Beispiel', createdByFormer: true }),
    make({ title: 'Verwaist', departmentId: 'd1', departmentName: 'Spedition', createdBy: null }),
  ]

  it('filtert nach Zielbereich', () => {
    const f = { ...defaultFilters('2026/27'), schoolYear: FILTER_ALL, departmentId: 'd2' }
    expect(filterAssessments(dept, f).map((a) => a.title)).toEqual(['Tour-Nachweis'])
  })

  it('filtert nach Ersteller-ID und nach gelöschten Konten', () => {
    const fUser = { ...defaultFilters('2026/27'), schoolYear: FILTER_ALL, createdBy: 'u1' }
    expect(filterAssessments(dept, fUser).map((a) => a.title)).toEqual(['Sped-Nachweis'])
    const fDeleted = { ...defaultFilters('2026/27'), schoolYear: FILTER_ALL, createdBy: 'deleted' }
    expect(filterAssessments(dept, fDeleted).map((a) => a.title)).toEqual(['Verwaist'])
  })

  it('schreibt und liest Zielbereich/Erstellt-von in der Adresszeile', () => {
    const f = { ...defaultFilters('2026/27'), departmentId: 'd2', createdBy: 'deleted' }
    const params = filtersToParams(f, '2026/27', new URLSearchParams())
    expect(params.toString()).toBe('bereich=d2&erstellt=deleted')
    expect(filtersFromParams(params, '2026/27')).toEqual(f)
  })

  it('departmentOptions: eindeutig nach Name sortiert', () => {
    expect(departmentOptions(dept)).toEqual([{ id: 'd1', name: 'Spedition' }, { id: 'd2', name: 'Tourismus' }])
  })

  it('creatorOptions: ehemalige Lehrkraft markiert, gelöschtes Konto als Sammeleintrag am Ende', () => {
    expect(creatorOptions(dept)).toEqual([
      { id: 'u1', name: 'Frau Muster' },
      { id: 'u2', name: 'Herr Beispiel (ehemalige Lehrkraft)' },
      { id: 'deleted', name: 'Gelöschtes Konto' },
    ])
  })

  it('creatorOptions: leer, wenn das Feld gar nicht befüllt ist (keine Super-Admin-Sicht)', () => {
    expect(creatorOptions(items)).toEqual([])
  })
})

describe('Klassen namens „alle“ oder „none“ (BUG-3)', () => {
  const odd = [
    make({ title: 'Klasse alle', className: 'alle' }),
    make({ title: 'Klasse none', className: 'none' }),
    make({ title: 'Ohne Klasse', className: null }),
  ]

  it('filtert die echte Klasse „alle“ statt alle Klassen zu zeigen', () => {
    const f = { ...defaultFilters('2026/27'), className: classFilterValue('alle') }
    expect(filterAssessments(odd, f).map((a) => a.title)).toEqual(['Klasse alle'])
  })

  it('filtert die echte Klasse „none“ statt „Ohne Klasse“ zu zeigen', () => {
    const f = { ...defaultFilters('2026/27'), className: classFilterValue('none') }
    expect(filterAssessments(odd, f).map((a) => a.title)).toEqual(['Klasse none'])
    expect(filterAssessments(odd, { ...f, className: FILTER_NONE }).map((a) => a.title)).toEqual(['Ohne Klasse'])
  })

  it('liest ältere Links ohne Präfix weiter', () => {
    expect(classFromFilter('SP11a')).toBe('SP11a')
    expect(classFromFilter(classFilterValue('SP11a'))).toBe('SP11a')
  })
})

describe('URL-Parameter', () => {
  it('schreibt nur Abweichungen vom Standard und liest sie wieder', () => {
    const f = { ...defaultFilters('2026/27'), schoolYear: '2025/26', className: classFilterValue('SP11a'), status: 'open' }
    const params = filtersToParams(f, '2026/27', new URLSearchParams('createFromSet=x'))
    expect(params.toString()).toBe('createFromSet=x&sj=2025%2F26&klasse=k%3ASP11a&status=open')
    expect(filtersFromParams(params, '2026/27')).toEqual(f)
  })

  it('lässt Standardwerte aus der Adresse heraus', () => {
    expect(filtersToParams(defaultFilters('2026/27'), '2026/27', new URLSearchParams('sj=alt&fach=x')).toString()).toBe('')
  })

  it('ignoriert einen unbekannten Status', () => {
    expect(filtersFromParams(new URLSearchParams('status=quatsch'), '2026/27').status).toBe(FILTER_ALL)
  })
})

describe('Optionen', () => {
  it('Schuljahre: vorkommende plus aktuelles, neueste zuerst, ohne Duplikate', () => {
    expect(schoolYearOptions(['2025/26', '2025/26'], '2026/27')).toEqual(['2026/27', '2025/26'])
  })

  it('Schuljahr-Auswahl enthält Vorjahr, aktuelles und nächstes plus ältere vorkommende', () => {
    expect(schoolYearChoices(['2023/24'], '2026/27')).toEqual(['2027/28', '2026/27', '2025/26', '2023/24'])
    expect(schoolYearChoices([], '2099/00')).toEqual(['2100/01', '2099/00', '2098/99'])
  })

  it('Klassen: nur vorkommende, natürlich sortiert; Fächer: eindeutig nach Name', () => {
    expect(classOptions([{ className: 'SP11b' }, { className: null }, { className: 'SP2a' }, { className: 'SP11b' }])).toEqual(['SP2a', 'SP11b'])
    expect(subjectOptions(items)).toEqual([{ id: 's1', name: 'KSK' }, { id: 's2', name: 'STG' }])
  })
})
