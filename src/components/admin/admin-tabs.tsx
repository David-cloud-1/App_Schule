'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, ClipboardList, FileText, FolderKanban, ScrollText, Tag, Users } from 'lucide-react'

const TABS = [
  { href: '/admin/questions', label: 'Fragen', icon: FileText },
  { href: '/admin/subjects', label: 'Fächer', icon: FolderKanban },
  { href: '/admin/topics', label: 'Themen', icon: Tag },
  { href: '/admin/users', label: 'Nutzer', icon: Users },
  { href: '/admin/ai-generator', label: 'KI-Generator', icon: Bot },
  { href: '/admin/exam-sets', label: 'Prüfungssets', icon: ClipboardList },
  { href: '/admin/audit-log', label: 'Audit-Log', icon: ScrollText },
]

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex gap-1 overflow-x-auto -mb-px"
      aria-label="Admin Bereiche"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              active
                ? 'border-[#58CC02] text-[#F9FAFB]'
                : 'border-transparent text-[#9CA3AF] hover:text-[#F9FAFB]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
