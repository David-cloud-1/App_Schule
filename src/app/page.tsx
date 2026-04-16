import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/logout-button'
import { Truck, Shield } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Lernender'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-6 h-6" />
          <span className="font-bold text-lg">SpediLern</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a
              href="/admin"
              className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin
            </a>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* Welcome section */}
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hallo, {displayName}!
          </h1>
          <p className="text-gray-500 mt-1">
            Bereit für die heutige Lerneinheit?
          </p>
        </div>

        {/* Placeholder for future features */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-gray-400 text-sm">
            🚧 Das Dashboard wird in den nächsten Features gebaut.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            (PROJ-3: Daily Learning Session)
          </p>
        </div>
      </main>
    </div>
  )
}
