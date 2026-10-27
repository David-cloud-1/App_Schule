'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { useAdminRole } from '@/components/admin/admin-role-provider'

type ContentType = 'question' | 'topic' | 'subject' | 'exam_question_set'

const TABS: { type: ContentType; label: string; labelField: (item: TrashItem) => string }[] = [
  { type: 'question', label: 'Fragen', labelField: (i) => (i.question_text as string) ?? '—' },
  { type: 'topic', label: 'Themen', labelField: (i) => (i.name as string) ?? '—' },
  { type: 'subject', label: 'Fächer', labelField: (i) => `${i.code ?? ''} — ${i.name ?? ''}` },
  { type: 'exam_question_set', label: 'Prüfungssets', labelField: (i) => (i.name as string) ?? '—' },
]

type TrashItem = {
  id: string
  deleted_at: string
  question_text?: string
  name?: string
  code?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function PapierkorbPage() {
  const { role } = useAdminRole()
  const isSuperAdmin = role === 'admin'
  const [activeTab, setActiveTab] = useState<ContentType>('question')
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null)

  useEffect(() => {
    void load()
  }, [activeTab])

  async function load() {
    setLoading(true)
    setLoadFailed(false)
    try {
      const res = await fetch(`/api/admin/trash?type=${activeTab}`)
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(item: TrashItem) {
    setBusyId(item.id)
    const res = await fetch(`/api/admin/trash/${activeTab}/${item.id}`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Wiederherstellen fehlgeschlagen.')
    } else {
      toast.success('Wiederhergestellt.')
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    }
    setBusyId(null)
  }

  async function handlePurgeConfirmed() {
    if (!purgeTarget) return
    setBusyId(purgeTarget.id)
    const res = await fetch(`/api/admin/trash/${activeTab}/${purgeTarget.id}`, { method: 'DELETE' })
    const data = await res.json()
    setPurgeTarget(null)
    if (!res.ok) {
      toast.error(data.error ?? 'Endgültiges Löschen fehlgeschlagen.')
    } else {
      toast.success('Endgültig entfernt.')
      setItems((prev) => prev.filter((i) => i.id !== purgeTarget.id))
    }
    setBusyId(null)
  }

  const activeTabDef = TABS.find((t) => t.type === activeTab)!

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Papierkorb"
        description="Gelöschte Fragen, Themen, Fächer und Prüfungssets wiederherstellen."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
        <TabsList className="bg-ws-raised">
          {TABS.map((t) => (
            <TabsTrigger key={t.type} value={t.type}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loadFailed ? (
            <AdminErrorState message="Der Papierkorb konnte nicht geladen werden." onRetry={load} />
          ) : loading ? (
            <AdminLoadingState variant="list" rows={4} label="Papierkorb wird geladen …" />
          ) : items.length === 0 ? (
            <AdminEmptyState icon={Trash2} title="Papierkorb leer" description={`Keine gelöschten ${activeTabDef.label}.`} />
          ) : (
            <div className="bg-ws-surface border border-ws-line rounded-2xl overflow-hidden">
              <ul className="divide-y divide-ws-raised">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ws-text truncate">{activeTabDef.labelField(item)}</div>
                      <div className="text-xs text-ws-muted">Gelöscht am {formatDate(item.deleted_at)}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => handleRestore(item)}
                      className="min-h-11 gap-1.5 border-ws-line text-ws-text hover:bg-ws-raised"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      Wiederherstellen
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === item.id}
                        onClick={() => setPurgeTarget(item)}
                        className="min-h-11 text-ws-muted hover:text-ws-red"
                        title="Endgültig entfernen"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={purgeTarget !== null} onOpenChange={(v) => !v && setPurgeTarget(null)}>
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Endgültig entfernen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Dieser Inhalt wird unwiderruflich gelöscht und lässt sich danach nicht mehr wiederherstellen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handlePurgeConfirmed()
              }}
              className="bg-ws-red hover:bg-ws-red-hover text-ws-on-accent"
            >
              Endgültig entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
