import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { fetchExamHistory } from '@/lib/exam-history'
import { JoinAssessmentClient } from '@/components/join-assessment-client'
import { ExamSessionList } from '@/components/exam-session-list'

/** Leistungsnachweise (PROJ-43): Code eingeben und die eigenen Noten sehen. */
export default async function LeistungsnachweisePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/leistungsnachweise')

  const assessments = await fetchExamHistory(supabase, user.id, 'assessment')

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/subjects" aria-label="Zurück zu Lernen" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-[#FF9600]" />
            <h1 className="font-bold text-[#F9FAFB]">Leistungsnachweise</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1 w-full space-y-8">
        <section className="rounded-3xl border border-[#4B5563] bg-[#1F2937] p-5 shadow-lg">
          <JoinAssessmentClient />
        </section>

        <section aria-labelledby="meine-nachweise">
          <h2 id="meine-nachweise" className="mb-3 text-sm font-semibold text-[#F9FAFB]">
            Meine Leistungsnachweise
          </h2>
          {assessments.length > 0 ? (
            <ExamSessionList sessions={assessments} />
          ) : (
            <div className="rounded-2xl border border-[#374151] bg-[#1F2937] p-5 text-center">
              <GraduationCap size={28} className="mx-auto mb-2 text-[#4B5563]" />
              <p className="text-sm text-[#9CA3AF]">Noch keine Leistungsnachweise.</p>
              <p className="mt-1 text-xs text-[#6B7280]">Deine Lehrkraft gibt dir einen Code.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
