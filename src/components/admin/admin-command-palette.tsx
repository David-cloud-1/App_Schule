'use client'

import { useRouter } from 'next/navigation'
import { ExternalLink, LayoutDashboard, Monitor, Moon, Sun, Zap } from 'lucide-react'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { useWorkspace } from '@/components/admin/workspace-provider'
import { useDepartment } from '@/components/department-provider'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  ADMIN_HOME_HREF,
  adminCommandActionsFor,
  adminNavItemsFor,
  adminNavLabel,
} from '@/lib/admin-nav'
import { WORKSPACE_THEME_LABEL, WORKSPACE_THEMES } from '@/lib/workspace-theme'

const THEME_ICON = { dark: Moon, light: Sun, system: Monitor } as const

const itemClass =
  'min-h-11 cursor-pointer gap-3 rounded-lg px-3 text-ws-text data-[selected=true]:bg-ws-raised data-[selected=true]:text-ws-text'

/**
 * Schnellsuche des Lehrkräfte-Bereichs (PROJ-45, ⌘K / Strg+K): findet alle
 * Seiten und Aktionen, die die Rolle sehen darf — dieselbe Liste und derselbe
 * Rollenfilter wie die Seitenleiste. Inhalte (Nachweise, Fragen) durchsucht
 * sie bewusst nicht. Wird erst beim ersten Öffnen geladen.
 */
export default function AdminCommandPalette() {
  const router = useRouter()
  const { role } = useAdminRole()
  const { hofShortName } = useDepartment()
  const { commandOpen, setCommandOpen, theme, setTheme } = useWorkspace()
  const pages = adminNavItemsFor(role)
  const actions = adminCommandActionsFor(role)

  function go(href: string, external?: boolean) {
    setCommandOpen(false)
    if (external) window.open(href, '_blank', 'noopener,noreferrer')
    else router.push(href)
  }

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="top-[15%] translate-y-0 overflow-hidden rounded-2xl border-ws-line bg-ws-surface p-0 text-ws-text shadow-2xl sm:max-w-lg [&>button]:hidden">
        <DialogTitle className="sr-only">Schnellsuche</DialogTitle>
        <DialogDescription className="sr-only">
          Seiten und Aktionen des Lehrkräfte-Bereichs finden. Pfeiltasten wählen, Enter öffnet, Esc schließt.
        </DialogDescription>
        <Command
          loop
          className="bg-transparent text-ws-text [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ws-faint [&_[cmdk-input-wrapper]]:border-ws-line [&_[cmdk-input-wrapper]_svg]:text-ws-muted"
        >
          <CommandInput placeholder="Seite oder Aktion suchen …" className="h-12 text-base text-ws-text placeholder:text-ws-faint" />
          <CommandList className="max-h-[60vh] p-1">
            <CommandEmpty className="py-8 text-center text-sm text-ws-muted">Nichts gefunden.</CommandEmpty>
            <CommandGroup heading="Seiten">
              <CommandItem value="Übersicht Startseite" onSelect={() => go(ADMIN_HOME_HREF)} className={itemClass}>
                <LayoutDashboard className="!size-5 text-ws-muted" />
                Übersicht
              </CommandItem>
              {pages.map((item) => {
                const label = adminNavLabel(item, hofShortName)
                return (
                  <CommandItem
                    key={item.href}
                    value={label}
                    keywords={[item.description]}
                    onSelect={() => go(item.href, item.external)}
                    className={itemClass}
                  >
                    <item.icon className="!size-5 text-ws-muted" />
                    <span className="flex-1 truncate">{label}</span>
                    {item.external && <ExternalLink className="!size-4 text-ws-faint" aria-label="öffnet in neuem Tab" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator className="bg-ws-line" />
            <CommandGroup heading="Aktionen">
              {actions.map((action) =>
                action.kind === 'link' ? (
                  <CommandItem
                    key={action.id}
                    value={action.label}
                    keywords={action.keywords}
                    onSelect={() => go(action.href, action.external)}
                    className={itemClass}
                  >
                    <Zap className="!size-5 text-ws-green" />
                    <span className="flex-1 truncate">{action.label}</span>
                    {action.external && <ExternalLink className="!size-4 text-ws-faint" aria-label="öffnet in neuem Tab" />}
                  </CommandItem>
                ) : (
                  WORKSPACE_THEMES.map((option) => {
                    const Icon = THEME_ICON[option]
                    return (
                      <CommandItem
                        key={`${action.id}-${option}`}
                        value={`Darstellung: ${WORKSPACE_THEME_LABEL[option]}`}
                        keywords={action.keywords}
                        onSelect={() => {
                          setTheme(option)
                          setCommandOpen(false)
                        }}
                        className={itemClass}
                      >
                        <Icon className="!size-5 text-ws-muted" />
                        <span className="flex-1 truncate">Darstellung: {WORKSPACE_THEME_LABEL[option]}</span>
                        {theme === option && <span className="text-xs text-ws-faint">aktiv</span>}
                      </CommandItem>
                    )
                  })
                ),
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
