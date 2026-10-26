'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Shield } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { AdminNav } from '@/components/admin/admin-nav'
import { AdminTopbar } from '@/components/admin/admin-topbar'
import { AdminAccountMenu } from '@/components/admin/admin-account-menu'
import { DepartmentSwitcher } from '@/components/admin/department-switcher'
import { WorkspaceProvider, useWorkspace } from '@/components/admin/workspace-provider'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useDepartment } from '@/components/department-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import type { WorkspaceTheme } from '@/lib/workspace-theme'

// Schnellsuche erst beim ersten Öffnen laden — die Startseite bleibt schlank
const AdminCommandPalette = dynamic(() => import('@/components/admin/admin-command-palette'), { ssr: false })

/**
 * Rahmen des Lehrkräfte-Bereichs (PROJ-40/44/45): Seitenleiste ab 1024 px
 * (einklappbar, Zustand per Cookie), darunter Schublade; Kopfzeile mit
 * Brotkrumen und Schnellsuche (⌘K / Strg+K); Darstellung hell/dunkel/System.
 * Im Druck bleibt nur der Inhalt, immer hell.
 */
export function AdminShell({
  initialTheme,
  sidebarOpen,
  children,
}: {
  initialTheme: WorkspaceTheme
  sidebarOpen: boolean
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider initialTheme={initialTheme}>
      <WorkspaceFrame sidebarOpen={sidebarOpen}>{children}</WorkspaceFrame>
    </WorkspaceProvider>
  )
}

function WorkspaceFrame({ sidebarOpen, children }: { sidebarOpen: boolean; children: React.ReactNode }) {
  const { theme, commandOpen, setCommandOpen, commandLoaded } = useWorkspace()

  // ⌘K / Strg+K öffnet bzw. schließt die Schnellsuche
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commandOpen, setCommandOpen])

  return (
    <div
      data-ws-theme={theme}
      className="ws-root min-h-svh bg-ws-bg text-ws-text print:min-h-0 print:bg-white print:text-black"
    >
      <a
        href="#ws-main"
        className="sr-only z-50 rounded-xl bg-ws-green px-4 py-3 font-semibold text-ws-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Zum Inhalt springen
      </a>
      <SidebarProvider defaultOpen={sidebarOpen} className="min-h-svh print:block print:min-h-0">
        <AdminSidebar />
        <SidebarInset className="min-w-0 bg-ws-bg print:bg-white">
          <AdminTopbar />
          <div
            id="ws-main"
            tabIndex={-1}
            className="mx-auto w-full min-w-0 max-w-screen-2xl flex-1 overflow-x-clip px-4 py-6 outline-none sm:px-6 lg:px-8 print:max-w-none print:overflow-visible print:p-0"
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      {commandLoaded && <AdminCommandPalette />}
      {/* Toasts folgen der gewählten Darstellung */}
      <Toaster theme={theme} />
    </div>
  )
}

function AdminSidebar() {
  const { name: departmentName } = useDepartment()
  const { isSuperAdmin } = useAdminRole()
  const { isMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="border-ws-line">
      <SidebarHeader className="border-b border-ws-line px-3 py-3">
        <div className="flex h-10 min-w-0 items-center gap-3 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ws-green/15 text-ws-green">
            <Shield className="size-5" aria-hidden />
          </span>
          <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-bold text-ws-text">Lehrkräfte</span>
            {departmentName && (
              <span className="truncate text-xs text-ws-muted" title={departmentName}>
                {departmentName}
              </span>
            )}
          </span>
        </div>
        {isSuperAdmin && isMobile && (
          <div className="pt-2 sm:hidden">
            <DepartmentSwitcher />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <AdminNav />
      </SidebarContent>
      <SidebarFooter className="border-t border-ws-line">
        <SidebarMenu>
          <SidebarMenuItem>
            <AdminAccountMenu variant="sidebar" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
