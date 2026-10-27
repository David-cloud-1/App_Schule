'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronsUpDown, Gamepad2, Loader2, LogOut, Monitor, Moon, Sun, User, UserCog } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useWorkspace } from '@/components/admin/workspace-provider'
import { useDepartment } from '@/components/department-provider'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { teacherRoleLabel } from '@/lib/admin-nav'
import { ROLE_DESCRIPTION } from '@/lib/roles'
import { parseWorkspaceTheme, WORKSPACE_THEME_LABEL, WORKSPACE_THEMES } from '@/lib/workspace-theme'

const THEME_ICON = { dark: Moon, light: Sun, system: Monitor } as const

/**
 * Konto-Menü des Lehrkräfte-Bereichs (PROJ-45): Name, E-Mail, Rolle in
 * Klartext, Profil, Darstellung, „Zur Lern-App“ und Abmelden.
 * `sidebar` sitzt unten in der Seitenleiste, `avatar` in der Handy-Kopfzeile.
 */
export function AdminAccountMenu({ variant }: { variant: 'sidebar' | 'avatar' }) {
  const { role, displayName = '', email = '', subjectCount } = useAdminRole()
  const { name: departmentName } = useDepartment()
  const { theme, setTheme } = useWorkspace()
  const [loggingOut, setLoggingOut] = useState(false)
  const roleLabel = teacherRoleLabel(role, departmentName)
  const name = displayName || email || 'Konto'
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await createClient().auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  const avatar = (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ws-green/50 bg-ws-green/15 text-sm font-bold text-ws-green"
    >
      {initial}
    </span>
  )

  return (
    <DropdownMenu>
      {variant === 'sidebar' ? (
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={name}
            aria-label={`Konto-Menü: ${name}`}
            className="rounded-xl text-ws-text hover:bg-ws-raised data-[state=open]:bg-ws-raised"
          >
            {avatar}
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold" title={name}>
                {name}
              </span>
              <span className="truncate text-xs text-ws-muted">{roleLabel}</span>
            </span>
            <ChevronsUpDown className="ml-auto !size-4 text-ws-muted" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          aria-label={`Konto-Menü: ${name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ws-green active:scale-95"
        >
          {avatar}
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent
        align="end"
        side={variant === 'sidebar' ? 'top' : 'bottom'}
        className="w-64 rounded-xl border-ws-line bg-ws-surface text-ws-text"
      >
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <span className="block truncate text-sm font-semibold" title={name}>
            {name}
          </span>
          {email && email !== name && (
            <span className="block truncate text-xs text-ws-muted" title={email}>
              {email}
            </span>
          )}
          <span className="block text-xs font-semibold text-ws-green">{roleLabel}</span>
          <span className="block text-xs text-ws-muted">{ROLE_DESCRIPTION[role]}</span>
        </DropdownMenuLabel>
        {role === 'teacher' && subjectCount !== undefined && (
          <DropdownMenuItem asChild className="min-h-11 cursor-pointer focus:bg-ws-raised focus:text-ws-text">
            <Link href="/admin/my-subjects">
              <UserCog className="text-ws-muted" />
              {subjectCount === 0
                ? 'Noch kein Fach eingetragen'
                : subjectCount === 1
                  ? '1 Fach eingetragen'
                  : `${subjectCount} Fächer eingetragen`}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-ws-line" />
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer focus:bg-ws-raised focus:text-ws-text">
          <Link href="/profile">
            <User className="text-ws-muted" />
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-ws-line" />
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-ws-faint">
          Darstellung
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(parseWorkspaceTheme(value))}>
          {WORKSPACE_THEMES.map((option) => {
            const Icon = THEME_ICON[option]
            return (
              <DropdownMenuRadioItem
                key={option}
                value={option}
                className="min-h-11 cursor-pointer gap-2 focus:bg-ws-raised focus:text-ws-text"
              >
                <Icon className="size-4 text-ws-muted" />
                {WORKSPACE_THEME_LABEL[option]}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="bg-ws-line" />
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer focus:bg-ws-raised focus:text-ws-text">
          <Link href="/">
            <Gamepad2 className="text-ws-green" />
            Zur Lern-App
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            handleLogout()
          }}
          disabled={loggingOut}
          className="min-h-11 cursor-pointer text-ws-red focus:bg-ws-red/10 focus:text-ws-red"
        >
          {loggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
