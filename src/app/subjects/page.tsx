import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { SubjectsGrid } from '@/components/subjects-grid'
import { LogoutButton } from '@/components/logout-button'
import { Truck, Zap, Target, ChevronRight } from 'lucide-react'
import type { SubjectWithCount } from '@/app/api/subjects/route'

const WEAK_MIN_ATTEMPTS = 3
const WEAK_ERROR_THRESHOLD = 0.5

export default async function SubjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [profileResult, subjectsResult, answersResult] = await Promise.all([
    supabase.from('profiles').select('display_name, total_xp').eq('id', user.id).single(),
    supabase
      .from('subjects')
      .select(`
        id, code, name, color, icon_name,
        question_subjects (
          question_id,
          questions!inner ( id, is_active )
        )
      `)
      .order('code'),
    supabase
      .from('quiz_answers')
      .select('question_id, is_correct')
      .eq('user_id', user.id),
  ])

  const displayName =
    profileResult.data?.display_name ?? user.email?.split('@')[0] ?? 'Lernender'
  const totalXp = profileResult.data?.total_xp ?? 0

  // ── Compute weak question count ─────────────────────────────────────────
  const answerStats = new Map<string, { total: number; wrong: number }>()
  for (const { question_id, is_correct } of answersResult.data ?? []) {
    const s = answerStats.get(question_id) ?? { total: 0, wrong: 0 }
    s.total++
    if (!is_correct) s.wrong++
    answerStats.set(question_id, s)
  }
  const weakCount = [...answerStats.values()].filter(
    ({ total, wrong }) => total >= WEAK_MIN_ATTEMPTS && wrong / total > WEAK_ERROR_THRESHOLD,
  ).length

  const subjects: SubjectWithCount[] = (subjectsResult.data ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    color: s.color,
    icon_name: s.icon_name,
    active_question_count: (
      s.question_subjects as unknown as { questions: { is_active: boolean } }[]
    ).filter((qs) => qs.questions?.is_active === true).length,
  }))

  return (
    <div className="min-h-screen bg-[#111827]">
      {/* Header */}
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#58CC02]" />
            <span className="font-bold text-[#F9FAFB]">SpediLern</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#111827] rounded-full px-3 py-1.5 border border-[#4B5563]">
              <Zap size={13} className="text-[#58CC02]" />
              <span className="text-xs font-bold text-[#F9FAFB]">{totalXp.toLocaleString('de-DE')} XP</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">
            Hallo, {displayName}!
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Wähle ein Fach und starte deine Lerneinheit.
          </p>
        </div>

        {weakCount > 0 && (
          <Link href="/quiz?mode=weak" className="block mb-5">
            <div className="flex items-center gap-4 bg-[#1F2937] border border-[#FF9600]/40 rounded-2xl px-4 py-4 hover:border-[#FF9600]/70 hover:bg-[#FF9600]/5 transition-colors">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#FF9600]/15 shrink-0">
                <Target size={22} className="text-[#FF9600]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#F9FAFB]">Lücken schließen</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {weakCount} {weakCount === 1 ? 'Frage' : 'Fragen'} mit hoher Fehlerquote
                </p>
              </div>
              <ChevronRight size={18} className="text-[#FF9600] shrink-0" />
            </div>
          </Link>
        )}

        <Suspense>
          <SubjectsGrid subjects={subjects} />
        </Suspense>
      </main>
    </div>
  )
}
