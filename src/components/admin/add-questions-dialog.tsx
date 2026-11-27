'use client'

import { useCallback, useState } from 'react'
import { FileSpreadsheet, FileText, PenLine } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
import { IntakeDepartmentContext, IntakeLayout } from '@/components/admin/intake-layout'
import { useTargetDepartment } from '@/components/admin/target-department-field'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { IntakeMaterialFlow } from '@/components/admin/intake-material-flow'
import { IntakeTableFlow } from '@/components/admin/intake-table-flow'
import { QuestionFormBody, type QuestionDefaults } from '@/components/admin/question-form-modal'
import { useTopicOptions } from '@/components/admin/fach-thema-select'

/**
 * „Fragen hinzufügen“ (PROJ-132): ein Dialog mit drei Wegen. Der Inhalt
 * wechselt je Schritt, es öffnet sich nie ein Dialog im Dialog („Zurück“ führt
 * zur Auswahl). Am Handy füllt er den ganzen Bildschirm.
 */
export type AddWay = 'write' | 'material' | 'table'
type View = 'choose' | AddWay

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const WAYS: { way: AddWay; title: string; text: string; icon: typeof PenLine }[] = [
  { way: 'write', title: 'Selbst schreiben', text: 'Eine Frage mit Antworten eintippen.', icon: PenLine },
  { way: 'material', title: 'Aus Material erstellen', text: 'Skript hochladen, deine KI schreibt Vorschläge, du prüfst sie vor dem Übernehmen.', icon: FileText },
  { way: 'table', title: 'Aus einer Tabelle übernehmen', text: 'Eine CSV-Datei mit vielen Fragen auf einmal einlesen.', icon: FileSpreadsheet },
]

const DISCARD: Record<AddWay, { title: string; text: string }> = {
  write: { title: 'Frage verwerfen?', text: 'Deine Eingaben gehen verloren.' },
  material: { title: 'Fragen verwerfen?', text: 'Die Antwort der KI geht verloren.' },
  table: { title: 'Fragen verwerfen?', text: 'Die eingelesene Tabelle geht verloren.' },
}

export function AddQuestionsDialog({
  open,
  onOpenChange,
  defaults,
  initialWay,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Thema, das im Baum gewählt ist: in allen drei Wegen schon eingetragen */
  defaults?: QuestionDefaults
  /** Öffnet gleich einen Weg (zum Beispiel über den Link der alten Seite „Fragen aus Material“) */
  initialWay?: AddWay | null
  onDone: (result: { count: number; topicIds: string[] }) => void
}) {
  const [view, setView] = useState<View>('choose')
  const [dirty, setDirty] = useState(false)
  /** Rückfrage vor dem Verwerfen: beim Schließen oder bei „Zurück“ zur Auswahl */
  const [confirm, setConfirm] = useState<'close' | 'back' | null>(null)
  const topicData = useTopicOptions(open)
  // Der Bereich wird beim Öffnen festgehalten und im Kopf genannt (nur bei mehreren Bereichen)
  const scope = useOptionalAdminRole()?.scope
  const target = useTargetDepartment(open)
  const departmentName =
    scope && scope.departments.length > 1
      ? target.fixedId
        ? (scope.departments.find((d) => d.id === target.fixedId)?.name ?? null)
        : 'Alle Bereiche'
      : null
  const initialTopic = defaults?.topicId && UUID.test(defaults.topicId) ? defaults.topicId : null

  // Beim Öffnen wieder bei der Auswahl beginnen (oder gleich beim gewünschten Weg).
  // Anpassung während des Renderns statt im Effekt: so stimmt schon das erste Bild.
  const [opened, setOpened] = useState<{ open: boolean; way: AddWay | null | undefined }>({ open: false, way: undefined })
  if (opened.open !== open || (open && opened.way !== initialWay)) {
    setOpened({ open, way: initialWay })
    if (open) {
      setView(initialWay ?? 'choose')
      setDirty(false)
      setConfirm(null)
    }
  }

  const requestClose = useCallback(() => {
    if (dirty) setConfirm('close')
    else onOpenChange(false)
  }, [dirty, onOpenChange])

  function backToChoice() {
    setDirty(false)
    setView('choose')
  }

  function finish(result: { count: number; topicIds: string[] }) {
    setDirty(false)
    onOpenChange(false)
    onDone(result)
  }

  const discard = DISCARD[view === 'choose' ? 'write' : view]

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent
          className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden border-ws-line bg-ws-surface p-0 text-ws-text max-sm:left-0 max-sm:top-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none"
          onInteractOutside={(e) => {
            if (dirty) e.preventDefault()
          }}
        >
          <IntakeDepartmentContext.Provider value={departmentName}>
          {view === 'choose' && (
            <IntakeLayout title="Fragen hinzufügen" description="Wie möchtest du Fragen hinzufügen?">
              <div className="grid gap-3 pb-3">
                {WAYS.map(({ way, title, text, icon: Icon }) => (
                  <button
                    key={way}
                    type="button"
                    onClick={() => setView(way)}
                    className="flex min-h-24 items-start gap-4 rounded-2xl border border-ws-line bg-ws-bg p-4 text-left transition-colors duration-200 hover:bg-ws-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
                  >
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-ws-green/15 text-ws-green">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-ws-text">{title}</span>
                      <span className="mt-0.5 block max-w-prose text-sm text-ws-muted">{text}</span>
                    </span>
                  </button>
                ))}
              </div>
            </IntakeLayout>
          )}

          {view === 'write' && (
            <IntakeLayout title="Selbst schreiben" description="Wähle zuerst Fach und Thema, dann schreibe die Frage.">
              <QuestionFormBody
                active={open && view === 'write'}
                subjects={[]}
                defaults={defaults}
                topicData={topicData}
                cancelLabel="Zurück"
                onCancel={() => (dirty ? setConfirm('back') : backToChoice())}
                onDirtyChange={setDirty}
                onSaved={({ andNew, topicId }) => {
                  // Der Baum springt auf das Thema der neuen Frage (wie bei Material und Tabelle)
                  const topicIds = topicId ? [topicId] : []
                  if (andNew) onDone({ count: 1, topicIds })
                  else finish({ count: 1, topicIds })
                }}
              />
            </IntakeLayout>
          )}

          {view === 'material' && (
            <IntakeMaterialFlow
              topicOptions={topicData.options}
              topicsLoading={topicData.loading}
              topicsFailed={topicData.failed}
              onRetryTopics={topicData.reload}
              initialTopicId={initialTopic}
              onBack={backToChoice}
              onDone={finish}
              onDirtyChange={setDirty}
            />
          )}

          {view === 'table' && (
            <IntakeTableFlow
              topicOptions={topicData.options}
              topicsLoading={topicData.loading}
              topicsFailed={topicData.failed}
              onRetryTopics={topicData.reload}
              initialTopicId={initialTopic}
              onBack={backToChoice}
              onDone={finish}
              onDirtyChange={setDirty}
            />
          )}
          </IntakeDepartmentContext.Provider>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>{discard.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">{discard.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
              onClick={() => {
                const target = confirm
                setConfirm(null)
                if (target === 'back') backToChoice()
                else {
                  setDirty(false)
                  onOpenChange(false)
                }
              }}
            >
              Verwerfen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
