import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { SubjectCard } from '@/components/subject-card'
import { LogoutButton } from '@/components/logout-button'
import { BarChart3, Calculator, Truck, Package, Zap, Scale, Shuffle } from 'lucide-react'
import type { SubjectWithCount } from '@/app/api/subjects/route'

// Icon + short description per subject code — static, tied to IHK structure
const SUBJECT_META: Record<string, { icon: LucideIcon; description: string }> = {
  BGP: {
    icon: BarChart3,
    description: 'Wirtschaft, Recht, Unternehmensprozesse und gesamtwirtschaftliche Zusammenhänge',
  },
  KSK: {
    icon: Calculator,
    description: 'Kosten-/Leistungsrechnung, Controlling, Preisangebote und Kalkulation',
  },
  STG: {
    icon: Truck,
    description: 'Transport, Umschlag, Lager, Zoll und internationale Logistik',
  },
  LOP: {
    icon: Package,
    description: 'Logistikdienstleistungen, Lagerung, Kommissionierung und Warenfluss',
  },
  PUG: {
    icon: Scale,
    description: 'Politische Systeme, Gesellschaft, Grundrechte und staatliche Ordnung',
  },
}

export default async function SubjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [profileResult, subjectsResult] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
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
  ])

  const displayName =
    profileResult.data?.display_name ?? user.email?.split('@')[0] ?? 'Lernender'

  // Build SubjectWithCount from DB result
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
              <span className="text-xs font-bold text-[#F9FAFB]">0 XP</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">
            Hallo, {displayName}!
          </h1>
          <p className="text-[#9CA3AF] mt-1 text-sm">
            Wähle ein Fach und starte deine Lerneinheit.
          </p>
        </div>

        {/* Mixed mode CTA */}
        <Link href="/quiz" className="block mb-4">
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

        <div className="grid grid-cols-1 gap-4">
          {subjects.map((subject) => {
            const meta = SUBJECT_META[subject.code] ?? {
              icon: Package,
              description: subject.name,
            }
            return (
              <SubjectCard
                key={subject.id}
                id={subject.id}
                code={subject.code}
                name={subject.name}
                description={meta.description}
                color={subject.color}
                icon={meta.icon}
                activeQuestionCount={subject.active_question_count}
              />
            )
          })}
        </div>
      </main>
    </div>
  )
}
