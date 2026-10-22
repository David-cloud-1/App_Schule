import Link from 'next/link'
import { Package } from 'lucide-react'
import { resolveIcon } from '@/components/department-icon'
import { ProgressRing } from '@/components/progress-ring'
import { subjectPageHref } from '@/lib/learn-library'
import { cn } from '@/lib/utils'

export interface SubjectRing {
  id: string
  code: string
  name: string
  color: string
  iconName: string | null
  correctPercent: number
  hasQuestions: boolean
}

/**
 * Fächer als horizontal scrollbare Fortschrittsringe (PROJ-42). Ein Tap
 * öffnet die Fachseite mit dem Themenpfad (PROJ-43).
 */
export function SubjectRings({ subjects }: { subjects: SubjectRing[] }) {
  return (
    <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {subjects.map((subject) => {
        const Icon = resolveIcon(subject.iconName, Package)
        const content = (
          <>
            <ProgressRing percent={subject.correctPercent} color={subject.color}>
              <Icon className="size-6" style={{ color: subject.color }} />
            </ProgressRing>
            <span className="text-xs font-bold text-[#F9FAFB]">{subject.code}</span>
            <span className="-mt-1 text-[11px] text-[#9CA3AF] tabular-nums">{subject.correctPercent} %</span>
          </>
        )
        const itemClass = 'flex w-[72px] flex-col items-center gap-1.5 rounded-2xl py-1'
        return (
          <li key={subject.id} className="snap-start">
            {subject.hasQuestions ? (
              <Link
                href={subjectPageHref(subject.code)}
                aria-label={`${subject.code} – ${subject.name}: ${subject.correctPercent} % richtig`}
                className={cn(itemClass, 'transition-transform duration-200 active:scale-95')}
              >
                {content}
              </Link>
            ) : (
              <div aria-disabled className={cn(itemClass, 'opacity-50')}>
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
