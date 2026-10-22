'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Warehouse, Store, Trophy, User, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { bottomNavActiveHref, showBottomNav } from '@/lib/bottom-nav'

interface BottomNavProps {
  /** Bereich hat „Mein Betrieb“ (PROJ-34) — sonst führt der Eintrag zum Shop. */
  hatBetrieb: boolean
  /** Kurzname aus dem Fachbereich, z. B. „Betrieb“ oder „Resort“. */
  betriebLabel: string
}

/**
 * Feste Navigation der Spieler-Hauptbereiche (PROJ-41). Sitzt im Grundlayout
 * und blendet sich anhand der Adresse selbst aus (Quiz, Blitzrunde, Prüfung,
 * Leistungsnachweis, Admin, Login …).
 */
export function BottomNav({ hatBetrieb, betriebLabel }: BottomNavProps) {
  const pathname = usePathname()
  if (!showBottomNav(pathname)) return null

  const betriebHref = hatBetrieb ? '/betrieb' : '/shop'
  const items: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/', label: 'Heute', icon: Home },
    { href: '/subjects', label: 'Lernen', icon: BookOpen },
    { href: betriebHref, label: betriebLabel, icon: hatBetrieb ? Warehouse : Store },
    { href: '/leaderboard', label: 'Rangliste', icon: Trophy },
    { href: '/profile', label: 'Ich', icon: User },
  ]
  const activeHref = bottomNavActiveHref(pathname, betriebHref)

  return (
    <>
      {/* Platzhalter, damit der Seiteninhalt nicht hinter der Leiste verschwindet */}
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-[#111827]" />
      <nav
        aria-label="Hauptnavigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#111827]/95 backdrop-blur border-t border-[#374151] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="max-w-md mx-auto grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === activeHref
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 min-h-[60px] px-1 transition-colors duration-200 active:scale-95',
                    active ? 'text-[#58CC02]' : 'text-[#9CA3AF] hover:text-[#F9FAFB]',
                  )}
                >
                  <Icon className="size-6" strokeWidth={active ? 2.5 : 2} />
                  <span className={cn('text-[11px] leading-none truncate max-w-full', active ? 'font-bold' : 'font-medium')}>
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
