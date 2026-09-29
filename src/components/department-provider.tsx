'use client'

import { createContext, useContext } from 'react'
import type { DepartmentBranding } from '@/lib/departments'
import { examPartLabel, findExamPart, type ExamPart } from '@/lib/exam-parts'

/**
 * Fachbereich des aktuellen Seitenaufrufs (PROJ-22) — einmal im Grundlayout
 * auf dem Server geladen und hier für alle Bildschirme bereitgestellt:
 * App-Name, Icon, Münz-/Hof-Namen, Klassenstufen und Prüfungsaufbau.
 */
export interface DepartmentContextValue {
  department: DepartmentBranding
  /** Leer vor dem Login (Prüfungsteile sind nur für eingeloggte Nutzer lesbar) */
  examParts: ExamPart[]
}

const DepartmentContext = createContext<DepartmentContextValue | null>(null)

export function DepartmentProvider({ value, children }: { value: DepartmentContextValue; children: React.ReactNode }) {
  return <DepartmentContext.Provider value={value}>{children}</DepartmentContext.Provider>
}

export function useDepartmentContext(): DepartmentContextValue {
  const ctx = useContext(DepartmentContext)
  if (!ctx) throw new Error('useDepartment() außerhalb von <DepartmentProvider>')
  return ctx
}

export function useDepartment(): DepartmentBranding {
  return useDepartmentContext().department
}

export function useExamParts(): ExamPart[] {
  return useDepartmentContext().examParts
}

/** Klassenstufen des Bereichs als Auswahl: [{ value: '10', label: 'Klasse 10' }, …] */
export function useClassLevelOptions(): { value: string; label: string }[] {
  return useDepartment().classLevels.map((level) => ({ value: String(level), label: `Klasse ${level}` }))
}

/** Beschriftung eines Prüfungsteils: 3 → „Teil 3 – WiSo" (unbekannt: „Teil 3") */
export function useExamPartLabel(): (partNumber: number) => string {
  const parts = useExamParts()
  return (partNumber) => examPartLabel(findExamPart(parts, partNumber), partNumber)
}
