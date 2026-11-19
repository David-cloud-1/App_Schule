'use client'

import { useState } from 'react'
import { Check, CircleSlash, Hourglass, Trash2, Undo2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CancelledBadge, SubstituteBadge, TypeBadge } from '@/components/admin/absence/absence-ui'
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
  onUndoCancel,
  onFinishCancel,
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
  onUndoCancel: () => void
  onFinishCancel: () => void
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
                <SheetTitle className="break-words pr-8 text-ws-text">{absence.personName}</SheetTitle>
                <SheetDescription className="sr-only">Details zur Abwesenheit</SheetDescription>
                <div className="flex flex-wrap gap-2">
                  <TypeBadge absence={absence} />
                  {absence.cancelledAt ? <CancelledBadge /> : <SubstituteBadge status={absence.substituteStatus} />}
                </div>
              </SheetHeader>

              {absence.cancelledAt && (
                <div role="status" className="mt-4 rounded-xl border border-ws-gold/40 bg-ws-gold/10 p-3 text-sm text-ws-text">
                  <p className="font-semibold">Dieser Eintrag wurde gelöscht.</p>
                  <p className="mt-1 text-ws-muted">
                    {absence.cancelledByName ?? 'Jemand'} hat ihn am {formatDate(absence.cancelledAt.slice(0, 10))} gelöscht,
                    aber die Vertretung war schon eingetragen. Bitte nimm die Vertretung zurück.
                    {canSetStatus ? ' Danach bestätigst du hier, und der Eintrag verschwindet.' : ' Die Vertretungsplaner sind informiert.'}
                  </p>
                </div>
              )}

              <dl className="mt-5 space-y-3">
                <Row label="Zeitraum">{formatRange(absence)}</Row>
                <Row label="Abteilungen">
                  {absence.allDepartments
                    ? 'Alle Abteilungen'
                    : DEPARTMENTS.filter((d) => absence.departments.includes(d.code))
                        .map((d) => d.name)
                        .join(', ')}
                </Row>
                {absence.freeText && <Row label="Freitext">{absence.freeText}</Row>}
                {absence.note && <Row label="Notiz">{absence.note}</Row>}
                <Row label="Vertretung">
                  {absence.substituteStatus === 'open' && 'Noch offen.'}
                  {absence.substituteStatus === 'not_needed' && 'Keine Vertretung nötig.'}
                  {absence.substituteStatus === 'entered' && 'Vertretung eingetragen.'}
                  {absence.statusSetByName && absence.statusSetAt && (
                    <span className="block text-ws-muted">
                      Von {absence.statusSetByName} am {formatDate(absence.statusSetAt.slice(0, 10))}
                    </span>
                  )}
                  {absence.changedAfterSubstitute && (
                    <span className="block font-medium text-ws-orange">Geändert nach Vertretung</span>
                  )}
                </Row>
                <Row label="Eingetragen von">
                  {absence.createdByName}
                  <span className="block text-ws-muted">Zuletzt geändert am {formatDate(absence.updatedAt.slice(0, 10))}</span>
                </Row>
              </dl>

              {canSetStatus && absence.cancelledAt && (
                <div className="mt-6 border-t border-ws-line pt-4">
                  <Button disabled={busy} onClick={onFinishCancel} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                    <Check className="mr-2 size-4" aria-hidden />
                    Vertretung zurückgenommen
                  </Button>
                </div>
              )}

              {canSetStatus && !absence.cancelledAt && (
                <div className="mt-6 space-y-2 border-t border-ws-line pt-4">
                  <p className="text-sm font-medium text-ws-text">Vertretung</p>
                  <div className="flex flex-wrap gap-2">
                    {absence.substituteStatus !== 'entered' && (
                      <Button disabled={busy} onClick={() => onSetStatus('entered')} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                        <Check className="mr-2 size-4" aria-hidden />
                        Vertretung eingetragen
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

              {canEdit && absence.cancelledAt && (
                <div className="mt-3">
                  <Button disabled={busy} variant="outline" onClick={onUndoCancel} className="min-h-11 rounded-xl">
                    <Undo2 className="mr-2 size-4" aria-hidden />
                    Löschung zurücknehmen
                  </Button>
                </div>
              )}

              {canEdit && !absence.cancelledAt && (
                <div className="mt-6 border-t border-ws-line pt-4">
                  <AdminRowActions
                    subject={`Eintrag von ${absence.personName}`}
                    onEdit={onEdit}
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
              {absence?.substituteStatus === 'entered'
                ? 'Für diese Abwesenheit ist schon eine Vertretung eingetragen. Der Eintrag bleibt deshalb gelb im Kalender sichtbar, bis die Vertretungsplaner die Vertretung zurückgenommen haben. Du kannst die Löschung zurücknehmen.'
                : 'Du kannst das gleich danach noch rückgängig machen.'}
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
