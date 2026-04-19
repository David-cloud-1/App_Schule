import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PART_LABELS: Record<number, string> = {
  1: 'Teil 1',
  2: 'Teil 2',
  3: 'Teil 3',
}

type ExamSession = {
  id: string
  parts_selected: number[]
  started_at: string
  ended_at: string | null
  status: 'completed' | 'aborted'
  results_json: {
    parts: Record<string, { score: number; passed: boolean; questions: unknown[] }>
  } | null
}

export default async function ExamHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('exam_sessions')
    .select('id, parts_selected, started_at, ended_at, status, results_json')
    .eq('user_id', user.id)
    .neq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(50)

  const sessions: ExamSession[] = data ?? []

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-[#1CB0F6]" />
              <span className="font-bold text-[#F9FAFB]">Prüfungsverlauf</span>
            </div>
          </div>
          <Link href="/exam">
            <Button size="sm" className="rounded-xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white text-xs px-3 py-2">
              <Plus size={14} className="mr-1" />
              Neue Prüfung
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex-1 w-full">
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={48} className="text-[#374151] mx-auto mb-4" />
            <p className="text-[#9CA3AF] font-medium mb-2">Noch keine Prüfungen absolviert</p>
            <p className="text-[#6B7280] text-sm mb-6">Starte deine erste Prüfungssimulation!</p>
            <Link href="/exam">
              <Button className="rounded-2xl bg-[#1CB0F6] hover:bg-[#18a0e0] text-white font-bold px-8 py-3">
                Prüfung starten
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const parts: number[] = session.parts_selected ?? []
              const partResults = session.results_json?.parts ?? {}
              const scores = parts.map((p) => partResults[String(p)]?.score ?? null).filter((s) => s != null) as number[]
              const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
              const allPassed = parts.every((p) => partResults[String(p)]?.passed)
              const date = new Date(session.started_at)

              return (
                <Link key={session.id} href={`/exam/${session.id}/results`}>
                  <div className="bg-[#1F2937] border border-[#4B5563] rounded-2xl p-4 hover:border-[#6B7280] transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {parts.map((p) => (
                            <Badge key={p} variant="outline" className="text-xs border-[#4B5563] text-[#9CA3AF]">
                              {PART_LABELS[p] ?? `Teil ${p}`}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-xs text-[#9CA3AF]">
                          {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          {' · '}
                          {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {avgScore != null && (
                          <span className="text-lg font-bold text-[#F9FAFB]">{avgScore}%</span>
                        )}
                        <Badge className={cn(
                          'text-xs border-0',
                          session.status === 'aborted'
                            ? 'bg-[#FF9600]/20 text-[#FF9600]'
                            : allPassed
                              ? 'bg-[#58CC02]/20 text-[#58CC02]'
                              : 'bg-[#FF4B4B]/20 text-[#FF4B4B]',
                        )}>
                          {session.status === 'aborted'
                            ? 'Abgebrochen'
                            : allPassed
                              ? 'Bestanden'
                              : 'Nicht bestanden'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
