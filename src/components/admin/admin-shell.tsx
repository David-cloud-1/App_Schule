'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, Shield } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { AdminNav } from '@/components/admin/admin-nav'
import { DepartmentSwitcher } from '@/components/admin/department-switcher'
import { BrandIcon, BrandName } from '@/components/app-brand'

/**
 * Rahmen des Admin-Bereichs (PROJ-40): Kopfzeile, Seitenleiste ab 1024 px,
 * darunter ein Menü, das von links einfährt. Im Druck entfällt alles außer dem Inhalt.
 */
export function AdminShell({
  displayName,
  isSuperAdmin,
  children,
}: {
  displayName: string
  isSuperAdmin: boolean
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Ab 1024 px übernimmt die Seitenleiste — ein offenes Menü darf dann nicht stehen bleiben
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false)
    }
    query.addEventListener('change', closeOnDesktop)
    return () => query.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <div className="min-h-screen bg-[#111827] print:min-h-0 print:bg-white">
      <header className="sticky top-0 z-20 h-16 bg-[#1F2937] border-b border-[#4B5563] print:hidden">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Menü öffnen"
              className="lg:hidden flex size-11 shrink-0 items-center justify-center rounded-xl text-[#F9FAFB] transition-all duration-200 hover:bg-[#374151] active:scale-95"
            >
              <Menu className="size-6" />
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
            >
              <BrandIcon className="w-5 h-5 text-[#58CC02]" />
              <span className="font-bold hidden sm:inline"><BrandName /></span>
            </Link>
            <span className="text-[#4B5563] hidden sm:inline">/</span>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#58CC02]" />
              <span className="font-bold text-[#F9FAFB]">Admin</span>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {isSuperAdmin && <DepartmentSwitcher />}
            <div className="hidden sm:block text-sm text-[#9CA3AF] truncate max-w-[200px]">
              {displayName}
            </div>
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] overflow-y-auto border-[#4B5563] bg-[#1F2937] p-4 text-[#F9FAFB]"
        >
          <SheetTitle className="mb-4 text-[#F9FAFB]">Admin-Menü</SheetTitle>
          <SheetDescription className="sr-only">Bereiche des Admin-Bereichs</SheetDescription>
          <AdminNav onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="max-w-7xl mx-auto lg:flex print:mx-0 print:block print:max-w-none">
        <aside className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] w-60 shrink-0 self-start overflow-y-auto border-r border-[#4B5563] px-3 py-6 print:hidden">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 sm:px-6 py-6 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  )
}
