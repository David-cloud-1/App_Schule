'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Building2, ClipboardList, FileText, FolderKanban, GraduationCap, Settings, ScrollText, Store, Tag, Users } from 'lucide-react'
import { useDepartment } from '@/components/department-provider'
import { useAdminRole } from '@/components/admin/admin-role-provider'

const TABS = [
  { href: '/admin/questions', label: 'Fragen', icon: FileText },
  { href: '/admin/subjects', label: 'Fächer', icon: FolderKanban },
  { href: '/admin/topics', label: 'Themen', icon: Tag },
  { href: '/admin/shop-items', label: 'Shop-Items', icon: Store },
  { href: '/admin/users', label: 'Nutzer', icon: Users },
  { href: '/admin/ai-generator', label: 'KI-Generator', icon: Bot },
  { href: '/admin/exam-sets', label: 'Prüfungssets', icon: ClipboardList },
  { href: '/admin/leistungsnachweise', label: 'Leistungsnachweise', icon: GraduationCap },
  { href: '/admin/audit-log', label: 'Audit-Log', icon: ScrollText },
  { href: '/admin/department-settings', label: 'Fachbereich', icon: Settings },
]

const SUPER_ADMIN_TABS = [
  { href: '/admin/departments', label: 'Fachbereiche', icon: Building2 },
]

export function AdminTabs() {
  const { hofShortName } = useDepartment()
  const { isSuperAdmin } = useAdminRole()
  const pathname = usePathname()
  const tabs = isSuperAdmin ? [...TABS, ...SUPER_ADMIN_TABS] : TABS

  return (
    <nav
      className="flex gap-1 overflow-x-auto -mb-px"
      aria-label="Admin Bereiche"
    >
      {tabs.map(({ href, label: tabLabel, icon: Icon }) => {
        const label = href === '/admin/shop-items' ? `${hofShortName}-Items` : tabLabel
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
