'use client'

import { useState } from 'react'
import { Package } from 'lucide-react'
import { resolveIcon } from '@/components/department-icon'
import { SubjectSessionSheet } from '@/components/subject-session-sheet'

export interface SubjectRing {
  id: string
  code: string
  name: string
  color: string
  iconName: string | null
  correctPercent: number
  hasQuestions: boolean
}

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Fächer als horizontal scrollbare Fortschrittsringe (PROJ-42). Ein Tap
 * öffnet die bestehende Themen-Auswahl der Fächerseite.
 */
export function SubjectRings({ subjects }: { subjects: SubjectRing[] }) {
  const [selected, setSelected] = useState<SubjectRing | null>(null)

  return (
    <>
      <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {subjects.map((subject) => {
          const Icon = resolveIcon(subject.iconName, Package)
          // Ein kleiner Rest-Bogen bleibt sichtbar, damit 1 % nicht wie 0 % aussieht
          const shown = subject.correctPercent > 0 ? Math.max(subject.correctPercent, 3) : 0
          return (
            <li key={subject.id} className="snap-start">
              <button
                type="button"
                disabled={!subject.hasQuestions}
                onClick={() => setSelected(subject)}
                aria-label={`${subject.code} – ${subject.name}: ${subject.correctPercent} % richtig`}
                className="flex w-[72px] flex-col items-center gap-1.5 rounded-2xl py-1 transition-transform duration-200 active:scale-95 disabled:opacity-50"
              >
                <span className="relative flex size-16 items-center justify-center">
                  <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
                    <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#374151" strokeWidth="6" />
                    <circle
                      cx="32"
                      cy="32"
                      r={RADIUS}
                      fill="none"
                      stroke={subject.color}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={CIRCUMFERENCE * (1 - shown / 100)}
                      className="transition-[stroke-dashoffset] duration-700 ease-out"
                    />
                  </svg>
                  <Icon className="size-6" style={{ color: subject.color }} />
                </span>
                <span className="text-xs font-bold text-[#F9FAFB]">{subject.code}</span>
                <span className="-mt-1 text-[11px] text-[#9CA3AF] tabular-nums">{subject.correctPercent} %</span>
              </button>
            </li>
          )
        })}
      </ul>

      <SubjectSessionSheet
        subject={selected && { id: selected.id, name: selected.name, code: selected.code, color: selected.color }}
        initialClassLevel=""
        onClose={() => setSelected(null)}
      />
    </>
  )
}
