'use client'

import { useState } from 'react'
import { Check, CircleSlash, Hourglass, Pencil, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SubstituteBadge, TypeBadge } from '@/components/admin/absence/absence-ui'
import { DEPARTMENTS, formatDate, formatRange, type Absence, type SubstituteStatus } from '@/lib/absence'
import { AdminRowActions } from '@/components/admin/admin-row-actions'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-sm text-ws-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ws-text">{children}</dd>
    </div>
  )
}

/**
 * Details eines Eintrags (PROJ-120): Seitenschublade am Rechner, Blatt von unten
 * am Handy. Zeigt alle Angaben und nur die Aktionen, die die Person darf.
 * `absence === null` bei geöffneter Schublade heißt: Der Eintrag wurde gelöscht.
 */
export function AbsenceDetailSheet({
  open,
  onOpenChange,
  absence,
  isMobile,
  canEdit,
  canSetStatus,
  busy,
  onEdit,
  onDelete,
  onSetStatus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  absence: Absence | null
  isMobile: boolean
  canEdit: boolean
  canSetStatus: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onSetStatus: (status: SubstituteStatus) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className="max-h-[92dvh] overflow-y-auto border-ws-line bg-ws-surface text-ws-text sm:max-w-md"
        >
          {absence ? (
            <>
              <SheetHeader className="text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-ws-faint">
                  {absence.substituteStatus === 'not_needed' ? 'Fehlt' : 'Muss vertreten werden'}
                </p>
                <SheetTitle className="break-words pr-8 text-2xl font-bold text-ws-text">{absence.personName}</SheetTitle>
                <SheetDescription className="sr-only">Details zur Abwesenheit</SheetDescription>
                <div className="flex flex-wrap gap-2">
                  <TypeBadge absence={absence} />
                  <SubstituteBadge status={absence.substituteStatus} />
                </div>
              </SheetHeader>

              <div
                className={
                  absence.substituteStatus === 'open'
                    ? 'mt-5 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-4'
                    : absence.substituteStatus === 'entered'
                      ? 'mt-5 rounded-xl border border-ws-green/30 bg-ws-green/15 p-4'
                      : 'mt-5 rounded-xl border border-ws-line bg-ws-raised p-4'
                }
              >
                <p className="text-sm font-semibold text-ws-text">
                  {absence.substituteStatus === 'open' && `Für ${absence.personName} wird noch eine Vertretung gebraucht.`}
                  {absence.substituteStatus === 'entered' && `Die Vertretung für ${absence.personName} ist organisiert.`}
                  {absence.substituteStatus === 'not_needed' && `Für ${absence.personName} ist keine Vertretung nötig.`}
                </p>
                <dl className="mt-3 space-y-2">
                  <Row label="Wann">{formatRange(absence)}</Row>
                  <Row label="Wo">
                    {absence.allDepartments
                      ? 'Alle Abteilungen'
                      : DEPARTMENTS.filter((d) => absence.departments.includes(d.code))
                          .map((d) => d.name)
                          .join(', ')}
                  </Row>
                </dl>
                {absence.statusSetByName && absence.statusSetAt && (
                  <p className="mt-3 text-xs text-ws-muted">
                    Status gesetzt von {absence.statusSetByName} am {formatDate(absence.statusSetAt.slice(0, 10))}
                  </p>
                )}
                {absence.changedAfterSubstitute && (
                  <p className="mt-2 text-sm font-medium text-ws-orange">Geändert nach Vertretung – bitte prüfen</p>
                )}
              </div>

              <dl className="mt-4 space-y-3">
                {absence.freeText && <Row label="Freitext">{absence.freeText}</Row>}
                {absence.note && <Row label="Notiz">{absence.note}</Row>}
                <Row label="Eingetragen von">
                  {absence.createdByName}
                  <span className="block text-ws-muted">Zuletzt geändert am {formatDate(absence.updatedAt.slice(0, 10))}</span>
                </Row>
              </dl>

              {canSetStatus && (
                <div className="mt-6 space-y-2 border-t border-ws-line pt-4">
                  <p className="text-sm font-medium text-ws-text">Status der Vertretung ändern</p>
                  <div className="flex flex-wrap gap-2">
                    {absence.substituteStatus !== 'entered' && (
                      <Button disabled={busy} onClick={() => onSetStatus('entered')} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                        <Check className="mr-2 size-4" aria-hidden />
                        Vertretung organisiert
                      </Button>
                    )}
                    {absence.substituteStatus !== 'not_needed' && (
                      <Button disabled={busy} variant="outline" onClick={() => onSetStatus('not_needed')} className="min-h-11 rounded-xl">
                        <CircleSlash className="mr-2 size-4" aria-hidden />
                        Keine Vertretung nötig
                      </Button>
                    )}
                    {absence.substituteStatus !== 'open' && (
                      <Button disabled={busy} variant="outline" onClick={() => onSetStatus('open')} className="min-h-11 rounded-xl">
                        <Hourglass className="mr-2 size-4" aria-hidden />
                        Zurück auf offen
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {canEdit && (
                <div className="mt-6 border-t border-ws-line pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={onEdit} className="min-h-11 rounded-xl">
                      <Pencil className="mr-2 size-4" aria-hidden />
                      Bearbeiten
                    </Button>
                    <AdminRowActions
                      subject={`Eintrag von ${absence.personName}`}
                      items={[
                        {
                          key: 'delete',
                          label: 'Löschen',
                          icon: <Trash2 className="size-4" aria-hidden />,
                          destructive: true,
                          onSelect: () => setConfirmDelete(true),
                        },
                      ]}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <SheetHeader className="text-left">
              <SheetTitle className="text-ws-text">Eintrag wurde gelöscht</SheetTitle>
              <SheetDescription className="text-ws-muted">
                Jemand hat diese Abwesenheit gerade entfernt. Der Kalender zeigt den aktuellen Stand.
              </SheetDescription>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Abwesenheit löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              {absence ? `${absence.personName}, ${formatRange(absence)}. ` : ''}
              Du kannst das gleich danach noch rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
              onClick={() => {
                setConfirmDelete(false)
                onDelete()
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
