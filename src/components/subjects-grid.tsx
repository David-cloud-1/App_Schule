'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Package, Shuffle } from 'lucide-react'
import { resolveIcon } from '@/components/department-icon'
import { useDepartment } from '@/components/department-provider'
import { SubjectCard } from '@/components/subject-card'
import { ClassLevelFilter } from '@/components/class-level-filter'
import { SubjectSessionSheet } from '@/components/subject-session-sheet'
import type { SubjectWithCount } from '@/app/api/subjects/route'

interface SelectedSubject {
  id: string
  name: string
  code: string
  color: string
}

interface Props {
  subjects: SubjectWithCount[]
}

export function SubjectsGrid({ subjects }: Props) {
  const searchParams = useSearchParams()
  const { classLevels } = useDepartment()
  const classLevelParam = classLevels.map(String).includes(searchParams.get('class_level') ?? '')
    ? searchParams.get('class_level')!
    : ''

  const mixedHref = classLevelParam ? `/quiz?class_level=${classLevelParam}` : '/quiz'

  const [selectedSubject, setSelectedSubject] = useState<SelectedSubject | null>(null)

  return (
    <>
      {/* Class level filter */}
      <div className="mb-5">
        <ClassLevelFilter current={classLevelParam} />
      </div>

      {/* Mixed mode CTA — no topic sheet, navigates directly */}
      <Link href={mixedHref} className="block mb-4">
        <div className="bg-[#1F2937] border border-[#58CC02]/40 hover:border-[#58CC02] rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 group">
          <div className="w-12 h-12 rounded-2xl bg-[#58CC02]/20 flex items-center justify-center flex-shrink-0">
            <Shuffle size={22} className="text-[#58CC02]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#F9FAFB] text-base">Gemischt lernen</p>
            <p className="text-sm text-[#9CA3AF] mt-0.5">Fragen aus allen Fächern gemischt</p>
          </div>
          <div className="rounded-2xl bg-[#58CC02] px-4 py-2 text-white text-sm font-semibold group-hover:bg-[#4CAD02] transition-colors">
            Start
          </div>
        </div>
      </Link>

      {/* Subject cards */}
      <div className="grid grid-cols-1 gap-4">
        {subjects.map((subject) => {
          return (
            <SubjectCard
              key={subject.id}
              id={subject.id}
              code={subject.code}
              name={subject.name}
              description={subject.description ?? subject.name}
              color={subject.color}
              icon={resolveIcon(subject.icon_name, Package)}
              activeQuestionCount={subject.active_question_count}
              onLearnClick={
                subject.active_question_count > 0
                  ? () =>
                      setSelectedSubject({
                        id: subject.id,
                        name: subject.name,
                        code: subject.code,
                        color: subject.color,
                      })
                  : undefined
              }
            />
          )
        })}
      </div>

      {/* Bottom sheet — opens when a subject is selected */}
      <SubjectSessionSheet
        subject={selectedSubject}
        initialClassLevel={classLevelParam}
        onClose={() => setSelectedSubject(null)}
      />
    </>
  )
}
