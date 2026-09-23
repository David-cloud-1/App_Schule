import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { JoinAssessmentClient } from '@/components/join-assessment-client'

export default async function JoinAssessmentWithCodePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/pruefung/${code}`)

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <header className="bg-[#1F2937] border-b border-[#4B5563] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/exam" className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="font-bold text-[#F9FAFB]">Leistungsnachweis</span>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-10 flex-1 w-full">
        <JoinAssessmentClient initialCode={decodeURIComponent(code)} />
      </main>
    </div>
  )
}
