'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Ban, CheckCircle2, ChevronDown, Loader2, MapPinned, Search, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
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

type Role = 'student' | 'department_admin' | 'admin'

type AdminUserRow = {
  id: string
  display_name: string | null
  email: string | null
  role: Role
  department_id: string | null
  total_xp: number
  current_streak: number
  last_session_date: string | null
  banned: boolean
}

const ROLE_LABEL: Record<Role, string> = {
  student: 'Azubi',
  department_admin: 'Bereichs-Admin',
  admin: 'Super-Admin',
}

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAdminRole()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ownId, setOwnId] = useState<string | null>(null)
  const [target, setTarget] = useState<AdminUserRow | null>(null)
  const [roleChange, setRoleChange] = useState<{ user: AdminUserRow; newRole: Role } | null>(null)
  const [moveTarget, setMoveTarget] = useState<AdminUserRow | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        toast.error('Nutzer konnten nicht geladen werden.')
        return
      }
      const json = await res.json()
      setUsers(json.users ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setOwnId(data.user?.id ?? null)
    })
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
    )
  }, [users, search])

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
      toast.success(`Rolle geändert zu „${ROLE_LABEL[roleChange.newRole]}"`)
      setRoleChange(null)
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Nutzer</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {filtered.length} von {users.length}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name oder E-Mail suchen…"
          className="pl-9 bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]"
        />
      </div>

      <div className="border border-[#4B5563] rounded-2xl overflow-hidden bg-[#1F2937]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
              <TableHead className="text-[#9CA3AF]">Name</TableHead>
              <TableHead className="text-[#9CA3AF]">E-Mail</TableHead>
              <TableHead className="text-[#9CA3AF]">XP</TableHead>
              <TableHead className="text-[#9CA3AF]">Streak</TableHead>
              <TableHead className="text-[#9CA3AF]">Letzte Session</TableHead>
              <TableHead className="text-[#9CA3AF]">Status</TableHead>
              <TableHead className="text-right text-[#9CA3AF]">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="border-[#4B5563]">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow className="border-[#4B5563]">
                <TableCell colSpan={7} className="text-center text-[#9CA3AF] py-10">
                  Keine Nutzer gefunden.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const isSelf = ownId === u.id
                return (
                  <TableRow key={u.id} className="border-[#4B5563] hover:bg-[#111827]/40">
                    <TableCell className="text-[#F9FAFB] font-medium">
                      <div className="flex items-center gap-2">
                        {u.display_name ?? '—'}
                        {u.role !== 'student' && (
                          <Badge
                            variant="outline"
                            className="border-[#58CC02]/50 text-[#58CC02] bg-[#58CC02]/10"
                          >
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            {ROLE_LABEL[u.role]}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#9CA3AF] text-sm">
                      {u.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-[#F9FAFB]">{u.total_xp}</TableCell>
                    <TableCell className="text-[#F9FAFB]">
                      {u.current_streak}
                    </TableCell>
                    <TableCell className="text-xs text-[#9CA3AF]">
                      {formatDate(u.last_session_date)}
                    </TableCell>
                    <TableCell>
                      {u.banned ? (
                        <Badge className="bg-[#FF4B4B]/20 text-[#FF4B4B] border-[#FF4B4B]/30 hover:bg-[#FF4B4B]/20">
                          Gesperrt
                        </Badge>
                      ) : (
                        <Badge className="bg-[#58CC02]/20 text-[#58CC02] border-[#58CC02]/30 hover:bg-[#58CC02]/20">
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
                                className="text-[#1CB0F6] hover:text-[#1CB0F6]"
                              >
                                <ShieldCheck className="w-4 h-4 mr-1" />
                                Rolle
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                              {(['student', 'department_admin', 'admin'] as Role[])
                                .filter((r) => r !== u.role)
                                .map((r) => (
                                  <DropdownMenuItem
                                    key={r}
                                    onClick={() => setRoleChange({ user: u, newRole: r })}
                                    className="focus:bg-[#111827] focus:text-[#F9FAFB]"
                                  >
                                    {ROLE_LABEL[r]}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Bereich verschieben — Azubis, beide Admin-Rollen dürfen das */}
                        {u.role === 'student' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMoveTarget(u)}
                                  className="text-[#9CA3AF] hover:text-[#F9FAFB]"
                                >
                                  <MapPinned className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#111827] text-[#F9FAFB] border-[#4B5563]">
                                In anderen Fachbereich verschieben
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
                                  disabled={isSelf}
                                  onClick={() => setTarget(u)}
                                  className={
                                    u.banned
                                      ? 'text-[#58CC02] hover:text-[#58CC02]'
                                      : 'text-[#FF4B4B] hover:text-[#FF4B4B]'
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
                            <TooltipContent className="bg-[#111827] text-[#F9FAFB] border-[#4B5563]">
                              {isSelf
                                ? 'Du kannst dich nicht selbst sperren.'
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

      <AlertDialog
        open={roleChange !== null}
        onOpenChange={(v) => {
          if (!v) setRoleChange(null)
        }}
      >
        <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
          <AlertDialogHeader>
            <AlertDialogTitle>Rolle ändern?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9CA3AF]">
              {roleChange &&
                `${roleChange.user.display_name ?? roleChange.user.email} wird „${ROLE_LABEL[roleChange.newRole]}"` +
                  (roleChange.newRole === 'department_admin'
                    ? ' für den eigenen Fachbereich.'
                    : roleChange.newRole === 'admin'
                      ? '. Diese Person erhält vollen Zugriff auf alle Fachbereiche.'
                      : ' und verliert jeden Admin-Zugang.')}
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
              className="bg-[#1CB0F6] hover:bg-[#17a0e0] text-white"
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
        <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.banned ? 'Nutzer entsperren?' : 'Nutzer sperren?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#9CA3AF]">
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
                  ? 'bg-[#58CC02] hover:bg-[#4CAD02] text-white'
                  : 'bg-[#FF4B4B] hover:bg-[#ee3b3b] text-white'
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
        userLabel={moveTarget?.display_name ?? moveTarget?.email ?? 'Der Azubi'}
        currentDepartmentId={moveTarget?.department_id ?? null}
        onSuccess={load}
      />
    </div>
  )
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
