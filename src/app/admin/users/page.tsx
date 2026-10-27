'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Ban, CheckCircle2, ChevronDown, KeyRound, Loader2, MapPinned, Search, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase-browser'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import { MoveDepartmentDialog } from '@/components/admin/move-department-dialog'
import { roleChangeDescription } from '@/components/admin/role-change-text'
import { ROLE_LABEL, USER_ROLES, type UserRole } from '@/lib/roles'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState } from '@/components/admin/admin-states'
import { SortableTableHead } from '@/components/admin/sortable-table-head'
import { SetPasswordDialog } from '@/components/admin/set-password-dialog'
import {
  ACTIVITY_FILTERS,
  ACTIVITY_LABEL,
  DEFAULT_SORT,
  defaultDir,
  matchesActivity,
  parseUserListParams,
  SORT_KEYS,
  SORT_LABEL,
  sortUsers,
  userListParams,
  type ActivityFilter,
  type SortDir,
  type SortKey,
  type UserListView,
} from '@/lib/user-list'

type Role = UserRole
type RoleFilter = 'all' | Role

type AdminUserRow = {
  id: string
  display_name: string | null
  email: string | null
  role: Role
  department_id: string | null
  total_xp: number
  current_streak: number
  last_session_date: string | null
  /** Letzter Login (aus dem Login-Konto), damit verwaiste Lehrer-Zugänge auffallen (PROJ-44) */
  last_sign_in_at?: string | null
  /** Name des Fachbereichs — nur in der Ansicht „Alle Bereiche“ befüllt */
  department_name?: string | null
  banned: boolean
}

const ROLE_FILTER_LABEL: Record<RoleFilter, string> = {
  all: 'Alle Rollen',
  student: 'Azubis',
  teacher: 'Lehrkräfte',
  department_admin: 'Bereichs-Admins',
  admin: 'Super-Admin',
}

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAdminRole()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  // Super-Admin: bereichsübergreifend suchen, z. B. um eine Lehrkraft freizuschalten,
  // die sich über eine andere Bereichs-Adresse registriert hat (PROJ-44)
  const [allDepartments, setAllDepartments] = useState(false)
  const showAllDepartments = isSuperAdmin && allDepartments
  const [ownId, setOwnId] = useState<string | null>(null)
  const [target, setTarget] = useState<AdminUserRow | null>(null)
  const [roleChange, setRoleChange] = useState<{ user: AdminUserRow; newRole: Role } | null>(null)
  const [moveTarget, setMoveTarget] = useState<AdminUserRow | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<AdminUserRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Sortierung und Aktivitäts-Filter stehen in der Adresse (PROJ-57): Neuladen
  // und geteilte Links zeigen dieselbe Ansicht
  const [view, setView] = useState<UserListView>({ sort: DEFAULT_SORT.key, dir: DEFAULT_SORT.dir, activity: 'all' })

  useEffect(() => {
    setView(parseUserListParams(new URLSearchParams(window.location.search)))
  }, [])

  const updateView = useCallback((patch: Partial<UserListView>) => {
    setView((prev) => {
      const next = { ...prev, ...patch }
      const params = userListParams(next, new URLSearchParams(window.location.search)).toString()
      window.history.replaceState(window.history.state, '', params ? `?${params}` : window.location.pathname)
      return next
    })
  }, [])

  function handleSort(key: SortKey) {
    // Mit der angezeigten Sortierung vergleichen, nicht mit der gespeicherten (QA BUG-57-1)
    updateView(
      effectiveSort.key === key
        ? { sort: key, dir: effectiveSort.dir === 'asc' ? 'desc' : 'asc' }
        : { sort: key, dir: defaultDir(key) }
    )
  }

  // Ohne Spalte „Bereich“ (nur in „Alle Bereiche“) fällt deren Sortierung auf den Standard zurück
  const effectiveSort: { key: SortKey; dir: SortDir } =
    view.sort === 'department' && !showAllDepartments ? DEFAULT_SORT : { key: view.sort, dir: view.dir }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch(showAllDepartments ? '/api/admin/users?scope=all' : '/api/admin/users')
      if (!res.ok) {
        setLoadFailed(true)
        return
      }
      const json = await res.json()
      setUsers(json.users ?? [])
    } catch (err) {
      console.error(err)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [showAllDepartments])

  useEffect(() => {
    load()
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setOwnId(data.user?.id ?? null)
    })
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = new Date()
    const matching = users.filter(
      (u) =>
        (roleFilter === 'all' || u.role === roleFilter) &&
        matchesActivity(u, view.activity, now) &&
        (!q ||
          (u.display_name ?? '').toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q))
    )
    return sortUsers(matching, effectiveSort.key, effectiveSort.dir)
  }, [users, search, roleFilter, view.activity, effectiveSort.key, effectiveSort.dir])

  const hasFilter = search.trim() !== '' || roleFilter !== 'all' || view.activity !== 'all'

  function resetFilters() {
    setSearch('')
    setRoleFilter('all')
    updateView({ activity: 'all' })
  }

  const sortableKeys = SORT_KEYS.filter((k) => k !== 'department' || showAllDepartments)

  async function handleConfirm() {
    if (!target) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: !target.banned }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Aktion fehlgeschlagen')
        return
      }
      toast.success(target.banned ? 'Nutzer entsperrt' : 'Nutzer gesperrt')
      setTarget(null)
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRoleConfirm() {
    if (!roleChange) return
    if (roleChange.newRole === 'department_admin' && !roleChange.user.department_id) {
      toast.error('Bereichs-Admin braucht einen Fachbereich. Verschiebe das Konto zuerst in einen Fachbereich.')
      setRoleChange(null)
      return
    }
    setSubmitting(true)
    try {
      const payload: { role: Role; department_id?: string } = { role: roleChange.newRole }
      // Bereichs-Admin braucht zwingend einen Bereich — der eigene (bestehende)
      // Bereich der Person ist der sinnvolle Standard.
      if (roleChange.newRole === 'department_admin' && roleChange.user.department_id) {
        payload.department_id = roleChange.user.department_id
      }
      const res = await fetch(`/api/admin/users/${roleChange.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Aktion fehlgeschlagen')
        return
      }
      toast.success(`Rolle geändert zu „${ROLE_LABEL[roleChange.newRole]}“`)
      setRoleChange(null)
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  // Name, E-Mail, [Bereich], XP, Streak, Letzte Session, Letzter Login, Status, Aktion
  const columnCount = showAllDepartments ? 9 : 8

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Nutzer" description={`${filtered.length} von ${users.length}`} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ws-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name oder E-Mail suchen…"
            aria-label="Name oder E-Mail suchen"
            className="pl-9 min-h-11 rounded-xl bg-ws-surface border-ws-line text-ws-text"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger
            aria-label="Nach Rolle filtern"
            className="min-h-11 w-full rounded-xl bg-ws-surface border-ws-line text-ws-text sm:w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            {(['all', ...USER_ROLES] as RoleFilter[]).map((r) => (
              <SelectItem key={r} value={r} className="focus:bg-ws-raised focus:text-ws-text">
                {ROLE_FILTER_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={view.activity} onValueChange={(v) => updateView({ activity: v as ActivityFilter })}>
          <SelectTrigger
            aria-label="Nach Aktivität filtern"
            className="min-h-11 w-full rounded-xl bg-ws-surface border-ws-line text-ws-text sm:w-56"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            {ACTIVITY_FILTERS.map((a) => (
              <SelectItem key={a} value={a} className="focus:bg-ws-raised focus:text-ws-text">
                {ACTIVITY_LABEL[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Handy: Überschriften in der seitlich scrollenden Tabelle sind schwer zu treffen */}
        <Select
          value={`${effectiveSort.key}:${effectiveSort.dir}`}
          onValueChange={(v) => {
            const [sort, dir] = v.split(':') as [SortKey, SortDir]
            updateView({ sort, dir })
          }}
        >
          <SelectTrigger
            aria-label="Sortieren nach"
            className="min-h-11 w-full rounded-xl bg-ws-surface border-ws-line text-ws-text sm:hidden"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
            {sortableKeys.flatMap((k) =>
              (['asc', 'desc'] as const).map((d) => (
                <SelectItem key={`${k}:${d}`} value={`${k}:${d}`} className="focus:bg-ws-raised focus:text-ws-text">
                  {SORT_LABEL[k]} {sortDirLabel(k, d)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {isSuperAdmin && (
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-ws-line bg-ws-surface px-3">
            <Switch
              id="users-all-departments"
              checked={allDepartments}
              onCheckedChange={setAllDepartments}
              className="data-[state=checked]:bg-ws-green"
            />
            <Label htmlFor="users-all-departments" className="cursor-pointer whitespace-nowrap text-sm text-ws-text">
              Alle Bereiche
            </Label>
          </div>
        )}
      </div>

      {loadFailed ? (
        <AdminErrorState message="Die Nutzer konnten gerade nicht geladen werden." onRetry={load} />
      ) : (
        <div className="ws-table-scroll ws-table-sticky border border-ws-line rounded-2xl overflow-hidden bg-ws-surface">
          <Table>
            <TableHeader>
              <TableRow className="bg-ws-bg hover:bg-ws-bg border-ws-line">
                {sortableKeys.map((k) => (
                  <SortableTableHead
                    key={k}
                    sortKey={k}
                    label={SORT_LABEL[k]}
                    activeKey={effectiveSort.key}
                    dir={effectiveSort.dir}
                    onSort={handleSort}
                  />
                ))}
                <TableHead className="text-right text-ws-muted">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="border-ws-line">
                    {Array.from({ length: columnCount }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow className="border-ws-line">
                  <TableCell colSpan={columnCount} className="text-center text-ws-muted py-10">
                    {hasFilter && users.length > 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <span>Niemand passt zu diesem Filter.</span>
                        <Button
                          variant="outline"
                          onClick={resetFilters}
                          className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
                        >
                          Filter zurücksetzen
                        </Button>
                      </div>
                    ) : (
                      'Keine Nutzer gefunden.'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const isSelf = ownId === u.id
                  // Bereichs-Admins dürfen nur Azubis sperren/verschieben, der Super-Admin jedes Konto
                  // außer Super-Admins (Schnittstelle: PATCH /api/admin/users/[id])
                  const canModerate = isSuperAdmin || u.role === 'student'
                  const canMove =
                    !isSelf &&
                    (u.role === 'student' ||
                      (isSuperAdmin && (u.role === 'teacher' || u.role === 'department_admin')))
                  return (
                    <TableRow key={u.id} className="border-ws-line hover:bg-ws-bg/40">
                      <TableCell className="text-ws-text font-medium">
                        <div className="flex items-center gap-2">
                          {u.display_name ?? '—'}
                          {u.role !== 'student' && (
                            <Badge
                              variant="outline"
                              className="border-ws-green/50 text-ws-green bg-ws-green/10"
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              {ROLE_LABEL[u.role]}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-ws-muted text-sm">
                        {u.email ?? '—'}
                      </TableCell>
                      {showAllDepartments && (
                        <TableCell className="text-ws-muted text-sm">{u.department_name ?? '—'}</TableCell>
                      )}
                      <TableCell className="text-ws-text">{u.total_xp}</TableCell>
                      <TableCell className="text-ws-text">
                        {u.current_streak}
                      </TableCell>
                      <TableCell className="text-xs text-ws-muted">
                        {formatDate(u.last_session_date)}
                      </TableCell>
                      <TableCell className="text-xs text-ws-muted">
                        {formatDate(u.last_sign_in_at ?? null)}
                      </TableCell>
                      <TableCell>
                        {u.banned ? (
                          <Badge className="bg-ws-red/15 text-ws-red border-ws-red/30 hover:bg-ws-red/15">
                            Gesperrt
                          </Badge>
                        ) : (
                          <Badge className="bg-ws-green/20 text-ws-green border-ws-green/30 hover:bg-ws-green/20">
                            Aktiv
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Rollen vergeben — nur Super-Admin (AC-7) */}
                          {isSuperAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isSelf}
                                  className="text-ws-blue hover:text-ws-blue"
                                >
                                  <ShieldCheck className="w-4 h-4 mr-1" />
                                  Rolle
                                  <ChevronDown className="w-3 h-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-ws-surface border-ws-line text-ws-text">
                                {USER_ROLES
                                  .filter((r) => r !== u.role)
                                  .map((r) => (
                                    <DropdownMenuItem
                                      key={r}
                                      onClick={() => setRoleChange({ user: u, newRole: r })}
                                      className="focus:bg-ws-bg focus:text-ws-text"
                                    >
                                      {ROLE_LABEL[r]}
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          {/* Bereich verschieben — Azubis: beide Admin-Rollen; Lehrer-Konten: nur Super-Admin */}
                          {canMove && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setMoveTarget(u)}
                                    aria-label={`${u.display_name ?? u.email ?? 'Konto'} in anderen Fachbereich verschieben`}
                                    className="text-ws-muted hover:text-ws-text"
                                  >
                                    <MapPinned className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-ws-bg text-ws-text border-ws-line">
                                  In anderen Fachbereich verschieben
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Passwort neu vergeben (PROJ-58) — gleiche Regel wie beim Sperren */}
                          {!isSelf && canModerate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPasswordTarget(u)}
                                    aria-label={`Passwort für ${u.display_name ?? u.email ?? 'Konto'} neu vergeben`}
                                    className="text-ws-muted hover:text-ws-text"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-ws-bg text-ws-text border-ws-line">
                                  Passwort neu vergeben
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSelf || !canModerate}
                                    onClick={() => setTarget(u)}
                                    aria-label={`${u.display_name ?? u.email ?? 'Konto'} ${u.banned ? 'entsperren' : 'sperren'}`}
                                    className={
                                      u.banned
                                        ? 'text-ws-green hover:text-ws-green'
                                        : 'text-ws-red hover:text-ws-red'
                                    }
                                  >
                                    {u.banned ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : (
                                      <Ban className="w-4 h-4" />
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-ws-bg text-ws-text border-ws-line">
                                {isSelf
                                  ? 'Du kannst dich nicht selbst sperren.'
                                  : !canModerate
                                    ? 'Nur der Super-Admin kann dieses Konto sperren.'
                                    : u.banned
                                    ? 'Entsperren'
                                    : 'Sperren'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={roleChange !== null}
        onOpenChange={(v) => {
          if (!v) setRoleChange(null)
        }}
      >
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Rolle ändern?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {roleChange && roleChangeDescription(roleChange.user, roleChange.newRole)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRoleConfirm()
              }}
              disabled={submitting}
              className="bg-ws-blue hover:bg-ws-blue-hover text-ws-on-accent"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ändern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={target !== null}
        onOpenChange={(v) => {
          if (!v) setTarget(null)
        }}
      >
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.banned ? 'Nutzer entsperren?' : 'Nutzer sperren?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {target?.banned
                ? `Der Nutzer ${target?.display_name ?? target?.email} kann sich danach wieder einloggen.`
                : `Der Nutzer ${target?.display_name ?? target?.email} wird daran gehindert, sich einzuloggen.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirm()
              }}
              disabled={submitting}
              className={
                target?.banned
                  ? 'bg-ws-green hover:bg-ws-green-hover text-ws-on-accent'
                  : 'bg-ws-red hover:bg-ws-red-hover text-ws-on-accent'
              }
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {target?.banned ? 'Entsperren' : 'Sperren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MoveDepartmentDialog
        open={moveTarget !== null}
        onOpenChange={(v) => {
          if (!v) setMoveTarget(null)
        }}
        userId={moveTarget?.id ?? null}
        userLabel={moveTarget?.display_name ?? moveTarget?.email ?? 'Das Konto'}
        isManager={moveTarget?.role === 'department_admin'}
        currentDepartmentId={moveTarget?.department_id ?? null}
        onSuccess={load}
      />

      <SetPasswordDialog
        open={passwordTarget !== null}
        onOpenChange={(v) => {
          if (!v) setPasswordTarget(null)
        }}
        user={passwordTarget}
      />
    </div>
  )
}

function sortDirLabel(key: SortKey, dir: SortDir): string {
  if (key === 'name' || key === 'email' || key === 'department') return dir === 'asc' ? '(A–Z)' : '(Z–A)'
  if (key === 'status') return dir === 'asc' ? '(aktiv zuerst)' : '(gesperrt zuerst)'
  if (key === 'session' || key === 'login') return dir === 'desc' ? '(neueste zuerst)' : '(älteste zuerst)'
  return dir === 'desc' ? '(höchste zuerst)' : '(niedrigste zuerst)'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}
