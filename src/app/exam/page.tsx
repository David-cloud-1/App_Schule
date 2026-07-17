import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { ExamLandingClient } from './exam-landing-client'

const PARTS = [1, 2, 3]

export type ExamSetOption = { id: string; name: string; questionCount: number }

export default async function ExamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // A part is available to students only when the teacher has activated at
  // least one exam set for it. Multiple sets can be active per part (e.g. a
  // different exam per class); students pick the specific one they were told.
  const { data: activeSets } = await supabase
    .from('exam_question_sets')
    .select('id, name, part, question_ids')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const setsByPart: Record<number, ExamSetOption[]> = {}
  for (const part of PARTS) setsByPart[part] = []
  for (const set of activeSets ?? []) {
    if (!setsByPart[set.part]) setsByPart[set.part] = []
    setsByPart[set.part].push({
      id: set.id,
      name: set.name,
      questionCount: set.question_ids?.length ?? 0,
    })
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

        <ExamLandingClient setsByPart={setsByPart} />
      </main>
    </div>
  )
}
