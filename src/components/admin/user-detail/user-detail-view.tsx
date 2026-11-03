'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, KeyRound, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { SetPasswordDialog } from '@/components/admin/set-password-dialog'
import { DeleteAccountDialog } from '@/components/admin/delete-account-dialog'
import { deleteBlockReason } from '@/lib/konto-loeschen'
import { resetConfirmLabel } from '@/lib/user-detail'
import { useUserSection } from './use-user-section'
import type { AssessmentsData, BadgesData, LearningData, LogData, UserOverview } from './types'
import {
  AktivitaetCard,
  BadgesCard,
  GefahrenzoneCard,
  LernstandCard,
  NachweiseCard,
  OverviewHeaderBadges,
  ProtokollCard,
  SpielstandCard,
  SteckbriefCard,
} from './user-detail-sections'
import { EmailDialog, postJson, RenameDialog, ResetProgressDialog } from './user-detail-dialogs'

const backLink =
  'inline-flex min-h-11 items-center gap-1.5 rounded text-sm text-ws-muted hover:text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green'

/**
 * Nutzer-Detailseite (PROJ-59, nur Super-Admin): alles zu einer Person auf einer
 * Seite. Jeder Abschnitt lädt für sich; fällt einer aus, bleiben die anderen
 * nutzbar. Die Pflege-Aktionen sind Dialoge, die danach die betroffenen
 * Abschnitte neu laden.
 */
export function UserDetailView({ userId, ownId }: { userId: string; ownId: string }) {
  const router = useRouter()
  const overview = useUserSection<UserOverview>(userId, 'overview')
  const learning = useUserSection<LearningData>(userId, 'learning')
  const badges = useUserSection<BadgesData>(userId, 'badges')
  const assessments = useUserSection<AssessmentsData>(userId, 'assessments')
  const log = useUserSection<LogData>(userId, 'log')

  const [renameOpen, setRenameOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const isSelf = userId === ownId
  const person = overview.state.status === 'ready' ? overview.state.data : null

  // Nach Name, E-Mail und Bestätigung ändern sich Kopf und Protokoll
  function reloadAfterEdit() {
    overview.reload()
    log.reload()
  }

  // Nach dem Zurücksetzen ändert sich fast alles (Nachweise und Protokoll-Altlasten ausgenommen)
  function reloadAfterReset() {
    overview.reload()
    learning.reload()
    badges.reload()
    log.reload()
  }

  async function confirmEmail() {
    setConfirming(true)
    const result = await postJson(`/api/admin/users/${userId}/email/confirm`)
    setConfirming(false)
    if (!result.ok) {
      toast.error(result.error ?? 'Aktion fehlgeschlagen.')
      return
    }
    toast.success('E-Mail als bestätigt markiert')
    reloadAfterEdit()
  }

  if (overview.state.status === 'error' && overview.state.notFound) {
    return (
      <div className="space-y-6">
        <Link href="/admin/users" className={backLink}>
          <ArrowLeft className="size-4" aria-hidden />
          Alle Nutzer
        </Link>
        <AdminEmptyState
          icon={UserX}
          title="Konto nicht gefunden"
          description="Es wurde vielleicht gelöscht, während die Seite offen war."
          action={
            <Button asChild className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
              <Link href="/admin/users">Zur Nutzerliste</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const title = person ? (person.displayName ?? person.email ?? 'Konto') : 'Nutzer'

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className={backLink}>
        <ArrowLeft className="size-4" aria-hidden />
        Alle Nutzer
      </Link>

      <AdminPageHeader
        title={title}
        breadcrumb={person ? title : undefined}
        description={person?.email ?? undefined}
        actions={
          person &&
          !isSelf &&
          // Für Zweitaccounts (PROJ-29) vergibt die Schnittstelle kein Passwort
          !person.linkedMain && (
            <Button
              variant="outline"
              onClick={() => setPasswordOpen(true)}
              className="min-h-11 rounded-xl border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised hover:text-ws-text"
            >
              <KeyRound className="mr-2 size-4" aria-hidden />
              Passwort neu vergeben
            </Button>
          )
        }
      >
        {person && <OverviewHeaderBadges overview={person} />}
      </AdminPageHeader>

      {person?.linkedMain && (
        <p role="status" className="rounded-2xl border border-ws-blue/30 bg-ws-blue/15 p-4 text-sm text-ws-blue">
          Zweitaccount von{' '}
          <Link href={`/admin/users/${person.linkedMain.id}`} className="font-semibold underline">
            {person.linkedMain.name ?? 'dem Hauptkonto'}
          </Link>
          .
        </p>
      )}

      {overview.state.status === 'loading' && <AdminLoadingState variant="cards" rows={2} />}
      {overview.state.status === 'error' && (
        <AdminErrorState message="Das Konto konnte gerade nicht geladen werden." onRetry={overview.retry} />
      )}

      {person && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SteckbriefCard
            overview={person}
            isSelf={isSelf}
            onRename={() => setRenameOpen(true)}
            onEmail={() => setEmailOpen(true)}
            onConfirm={confirmEmail}
            confirming={confirming}
          />
          <SpielstandCard overview={person} />
        </div>
      )}

      {/* Die übrigen Abschnitte laden unabhängig vom Kopf */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LernstandCard state={learning.state} retry={learning.retry} />
        <AktivitaetCard state={learning.state} retry={learning.retry} />
        <BadgesCard state={badges.state} retry={badges.retry} />
        <NachweiseCard state={assessments.state} retry={assessments.retry} />
      </div>
      <ProtokollCard userId={userId} state={log.state} retry={log.retry} />

      {person && (
        <GefahrenzoneCard
          isSelf={isSelf}
          onReset={() => setResetOpen(true)}
          onDelete={() => setDeleteOpen(true)}
          deleteBlockedReason={deleteBlockReason({
            role: person.role,
            linked_main_user_id: person.linkedMain?.id ?? null,
          })}
        />
      )}

      {person && (
        <>
          <RenameDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            userId={userId}
            currentName={person.displayName}
            onDone={reloadAfterEdit}
          />
          <EmailDialog
            open={emailOpen}
            onOpenChange={setEmailOpen}
            userId={userId}
            currentEmail={person.email}
            onDone={reloadAfterEdit}
          />
          <ResetProgressDialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            userId={userId}
            confirmLabel={resetConfirmLabel(person.displayName, person.email)}
            onDone={reloadAfterReset}
          />
          <DeleteAccountDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            user={{ id: person.id, display_name: person.displayName, email: person.email }}
            onDeleted={() => router.push('/admin/users')}
          />
          <SetPasswordDialog
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
            user={{ id: person.id, display_name: person.displayName, email: person.email, banned: person.banned }}
          />
        </>
      )}
    </div>
  )
}
