import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { fetchAllUserAnswers } from '@/lib/quiz-answers'
import { fetchLearnQuestions } from '@/lib/subject-questions'
import { getCurrentDepartment } from '@/lib/departments-server'
import { NO_DEPARTMENT_ID } from '@/lib/departments'
import { quizHref, subjectPageHref, subjectProgress } from '@/lib/learn-library'
import { getSelectedClassLevel } from '@/lib/learn-library-server'
import { ClassLevelSwitch } from '@/components/class-level-switch'
import { ProgressRing } from '@/components/progress-ring'
import { resolveIcon } from '@/components/department-icon'
import { cn } from '@/lib/utils'
import { ChevronRight, GraduationCap, Package, Shuffle, Timer, Zap } from 'lucide-react'

export default async function SubjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const department = await getCurrentDepartment()
  const classLevel = await getSelectedClassLevel(department?.classLevels ?? [])

  const [profileResult, subjectsResult, { rows: answers }] = await Promise.all([
    supabase.from('profiles').select('total_xp').eq('id', user.id).single(),
    // Nur Fächer des eigenen Bereichs (PROJ-23)
    supabase
      .from('subjects')
      .select('id, code, name, color, icon_name')
      .eq('department_id', department?.id ?? NO_DEPARTMENT_ID)
      .order('code'),
    fetchAllUserAnswers(supabase, user.id),
  ])

  const totalXp = profileResult.data?.total_xp ?? 0
  const subjectRows = subjectsResult.data ?? []
  const questions = await fetchLearnQuestions(
    supabase,
    subjectRows.map((s) => s.id),
  )
  const correctIds = new Set(answers.filter((a) => a.is_correct).map((a) => a.question_id))

  const subjects = subjectRows.map((s) => ({
    ...s,
    ...subjectProgress(questions, s.id, classLevel, correctIds),
  }))

  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Titelzeile */}
      <header className="sticky top-0 z-10 bg-[#111827]/90 backdrop-blur px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#F9FAFB]">Lernen</h1>
          <span className="flex items-center gap-1 rounded-full bg-[#1F2937] px-3 py-1.5" aria-label={`${totalXp} XP`}>
            <Zap size={14} className="text-[#58CC02]" />
            <span className="text-xs font-bold text-[#F9FAFB] tabular-nums">{totalXp.toLocaleString('de-DE')}</span>
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-2 pb-6 space-y-5">
        <ClassLevelSwitch current={classLevel} />

        {/* Prüfung & Leistungsnachweise */}
        <nav aria-label="Prüfung" className="grid grid-cols-2 gap-3">
          <Link
            href="/exam"
            className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-[#1CB0F6]/30 bg-[#1CB0F6]/10 px-3 py-2.5 transition-all duration-200 hover:bg-[#1CB0F6]/15 active:scale-95"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1CB0F6]/20">
              <Timer size={18} className="text-[#1CB0F6]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#F9FAFB]">Prüfung üben</span>
              <span className="block text-xs text-[#9CA3AF]">IHK-Simulation</span>
            </span>
          </Link>
          <Link
            href="/leistungsnachweise"
            className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-[#FF9600]/30 bg-[#FF9600]/10 px-3 py-2.5 transition-all duration-200 hover:bg-[#FF9600]/15 active:scale-95"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FF9600]/20">
              <GraduationCap size={18} className="text-[#FF9600]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#F9FAFB]">Leistungs&shy;nachweise</span>
              <span className="block text-xs text-[#9CA3AF]">Code &amp; Noten</span>
            </span>
          </Link>
        </nav>

        {/* Fächer */}
        <section aria-labelledby="faecher">
          <h2 id="faecher" className="mb-2 text-base font-bold text-[#F9FAFB]">
            Fächer
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-[#374151] bg-[#1F2937] divide-y divide-[#374151]">
            <li>
              <Link
                href={quizHref({ classLevel })}
                className="flex min-h-[60px] items-center gap-3 px-3 py-2 transition-colors duration-200 hover:bg-[#374151]/50 active:bg-[#374151]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#58CC02]/15">
                  <Shuffle size={20} className="text-[#58CC02]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-[#F9FAFB]">Alle Fächer mischen</span>
                  <span className="block text-xs text-[#9CA3AF]">Fragen aus allen Fächern</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-[#6B7280]" />
              </Link>
            </li>

            {subjects.map((subject) => {
              const Icon = resolveIcon(subject.icon_name, Package)
              const hasQuestions = subject.total > 0
              const content = (
                <>
                  <ProgressRing percent={subject.percent} color={subject.color} className="size-11">
                    <Icon className="size-5" style={{ color: subject.color }} />
                  </ProgressRing>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-[#F9FAFB]">{subject.code}</span>
                    <span className="block truncate text-xs text-[#9CA3AF]">
                      {hasQuestions ? subject.name : 'Noch keine Fragen'}
                    </span>
                  </span>
                  {hasQuestions && (
                    <span className="shrink-0 text-sm font-bold tabular-nums text-[#F9FAFB]">{subject.percent} %</span>
                  )}
                  <ChevronRight size={18} className={cn('shrink-0 text-[#6B7280]', !hasQuestions && 'invisible')} />
                </>
              )
              const rowClass = 'flex min-h-[60px] items-center gap-3 px-3 py-2'
              return (
                <li key={subject.id}>
                  {hasQuestions ? (
                    <Link
                      href={subjectPageHref(subject.code)}
                      aria-label={`${subject.code} – ${subject.name}, ${subject.percent} % gemeistert`}
                      className={cn(rowClass, 'transition-colors duration-200 hover:bg-[#374151]/50 active:bg-[#374151]')}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div aria-disabled className={cn(rowClass, 'opacity-50')}>
                      {content}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}
