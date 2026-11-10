'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2 } from 'lucide-react'
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
} from '@/components/ui/sidebar'
import type { WorkspaceTheme } from '@/lib/workspace-theme'
import { LEHRERZIMMER_HREF } from '@/lib/admin-nav'
import { istAblaufPfad } from '@/lib/werkzeugkiste'
import { istFallPfad } from '@/lib/schulrecht'

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
  const pathname = usePathname()

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

  // Werkzeugkiste-Ablauf (PROJ-51) und Aktennotiz-Ablauf (PROJ-55): eigener Rahmen ohne Seitenleiste und Kopfzeile
  if (istAblaufPfad(pathname) || istFallPfad(pathname)) {
    return (
      <div data-ws-theme={theme} className="ws-root min-h-svh bg-ws-bg text-ws-text">
        <a
          href="#ws-main"
          className="sr-only z-50 rounded-xl bg-ws-green px-4 py-3 font-semibold text-ws-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Zum Inhalt springen
        </a>
        {children}
        <Toaster theme={theme} />
      </div>
    )
  }

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


/** Bereich ohne Umschalten (alle außer Super-Admin) */
function DepartmentLabel() {
  const { name } = useDepartment()
  if (!name) return null
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-xl border border-ws-line bg-ws-surface px-3 py-2 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
      <Building2 className="size-5 shrink-0 text-ws-muted" aria-hidden />
      <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
        <span className="text-xs text-ws-muted">Bereich</span>
        <span className="truncate font-semibold text-ws-text" title={name}>
          {name}
        </span>
      </span>
    </div>
  )
}

function AdminSidebar() {
  const { isSuperAdmin } = useAdminRole()
  return (
    <Sidebar collapsible="icon" className="border-ws-line">
      <SidebarHeader className="px-3 pt-4">
        {isSuperAdmin ? <DepartmentSwitcher /> : <DepartmentLabel />}
      </SidebarHeader>
      <SidebarContent>
        <AdminNav />
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t border-ws-line">
        {/* PROJ-83: Auf niedrigen Fenstern (< 760 px Höhe) entfällt die Karte, damit sie keine Menüeinträge verdeckt */}
        <div className="rounded-xl bg-ws-raised p-3 text-sm text-ws-muted group-data-[collapsible=icon]:hidden [@media(max-height:760px)]:hidden">
          <p className="font-semibold text-ws-text">Du brauchst Hilfe?</p>
          <p>
            Frag das Kollegium im{' '}
            <Link href={LEHRERZIMMER_HREF} className="font-semibold text-ws-green hover:underline">
              Lehrerzimmer
            </Link>
            .
          </p>
        </div>
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
