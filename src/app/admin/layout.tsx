import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { Toaster } from '@/components/ui/sonner'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { AdminRoleProvider } from '@/components/admin/admin-role-provider'
import { DepartmentSwitcher } from '@/components/admin/department-switcher'
import { BrandIcon, BrandName } from '@/components/app-brand'

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

  return (
    <AdminRoleProvider value={{ role: profile.role, isSuperAdmin }}>
      <div className="min-h-screen bg-[#111827] print:min-h-0 print:bg-white">
        <header className="bg-[#1F2937] border-b border-[#4B5563] sticky top-0 z-20 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors">
                <BrandIcon className="w-5 h-5 text-[#58CC02]" />
                <span className="font-bold hidden sm:inline"><BrandName /></span>
              </Link>
              <span className="text-[#4B5563]">/</span>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#58CC02]" />
                <span className="font-bold text-[#F9FAFB]">Admin Panel</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSuperAdmin && <DepartmentSwitcher />}
              <div className="text-sm text-[#9CA3AF] truncate max-w-[200px]">
                {profile.display_name ?? user.email}
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <AdminTabs />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 print:max-w-none print:p-0">{children}</main>

        <Toaster />
      </div>
    </AdminRoleProvider>
  )
}
