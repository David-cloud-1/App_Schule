import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Toaster } from '@/components/ui/sonner'
import { AdminShell } from '@/components/admin/admin-shell'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'department_admin')) redirect('/')

  const isSuperAdmin = profile.role === 'admin'
  const displayName = profile.display_name ?? user.email ?? ''

  return (
    <AdminRoleProvider value={{ role: profile.role, isSuperAdmin, displayName }}>
      <AdminShell displayName={displayName} isSuperAdmin={isSuperAdmin}>
        {children}
      </AdminShell>
      <Toaster />
    </AdminRoleProvider>
  )
}
