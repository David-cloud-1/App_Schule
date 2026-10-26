'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { saveWorkspaceTheme, type WorkspaceTheme } from '@/lib/workspace-theme'

/**
 * Gemeinsamer Zustand des Lehrkräfte-Rahmens (PROJ-45): Darstellung
 * (hell/dunkel/System), der letzte Teil der Brotkrumen auf Detailseiten und
 * ob die Schnellsuche offen ist.
 */
interface WorkspaceContextValue {
  theme: WorkspaceTheme
  setTheme: (theme: WorkspaceTheme) => void
  /** Letztes Glied der Brotkrumen auf Detailseiten, z. B. der Titel eines Nachweises */
  detailCrumb: string | null
  setDetailCrumb: (label: string | null) => void
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void
  /** Wurde die Schnellsuche schon einmal geöffnet? Erst dann wird sie nachgeladen. */
  commandLoaded: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  initialTheme,
  children,
}: {
  initialTheme: WorkspaceTheme
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState(initialTheme)
  const [detailCrumb, setDetailCrumb] = useState<string | null>(null)
  const [commandOpen, setCommandOpenState] = useState(false)
  const [commandLoaded, setCommandLoaded] = useState(false)

  const setTheme = useCallback((next: WorkspaceTheme) => {
    setThemeState(next)
    saveWorkspaceTheme(next)
  }, [])

  const setCommandOpen = useCallback((open: boolean) => {
    if (open) setCommandLoaded(true)
    setCommandOpenState(open)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, detailCrumb, setDetailCrumb, commandOpen, setCommandOpen, commandLoaded }),
    [theme, setTheme, detailCrumb, commandOpen, setCommandOpen, commandLoaded],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace() außerhalb von <WorkspaceProvider>')
  return ctx
}

/** Wie useWorkspace, aber ohne Fehler außerhalb des Rahmens (z. B. in Einzeltests von Seiten) */
export function useOptionalWorkspace(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext)
}
