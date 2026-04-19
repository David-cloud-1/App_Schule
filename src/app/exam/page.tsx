import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { ExamLandingClient } from './exam-landing-client'

const PART_SUBJECT_CODES: Record<number, string[]> = {
  1: ['STG', 'LOP'],
  2: ['KSK'],
  3: ['BGP'],
}

export default async function ExamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check question counts per part
  const { data: subjects } = await supabase.from('subjects').select('id, code')
  const subjectMap = Object.fromEntries((subjects ?? []).map((s: { id: string; code: string }) => [s.code, s.id]))

  const partStats: Record<number, { questionCount: number; hasActiveSet: boolean }> = {}

  for (const [partStr, codes] of Object.entries(PART_SUBJECT_CODES)) {
    const part = Number(partStr)
    const subjectIds = codes.map((c) => subjectMap[c]).filter(Boolean)

    let questionCount = 0
    if (subjectIds.length > 0) {
      const { data: links } = await supabase
        .from('question_subjects')
        .select('question_id')
        .in('subject_id', subjectIds)
      questionCount = links?.length ?? 0
    }

    const { data: activeSet } = await supabase
      .from('exam_question_sets')
      .select('id')
      .eq('part', part)
      .eq('is_active', true)
      .limit(1)
      .single()

    partStats[part] = { questionCount, hasActiveSet: !!activeSet }
  }

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-[#1CB0F6]" />
            <span className="font-bold text-[#F9FAFB]">Prüfungssimulation</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1 w-full">
        <div className="mb-6">
          <p className="text-[#9CA3AF] text-sm leading-relaxed">
            Simuliere eine echte IHK-Abschlussprüfung — mit Countdown-Timer und Prüfungsbedingungen.
            Kein sofortiges Feedback, wie in der echten Prüfung.
          </p>
        </div>

        <ExamLandingClient partStats={partStats} />
      </main>
    </div>
  )
}
