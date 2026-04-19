'use client'

import { useState } from 'react'
import { Plus, Shield, ShieldOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type ExamSet = {
  id: string
  name: string
  part: number
  question_ids: string[]
  is_active: boolean
  created_at: string
}

type Question = {
  id: string
  question_text: string
  type: string
  difficulty: string
  question_subjects: { subject_id: string }[]
}

type Subject = {
  id: string
  code: string
  name: string
}

interface Props {
  initialSets: ExamSet[]
  questions: Question[]
  subjects: Subject[]
}

const PART_SUBJECT_CODES: Record<number, string[]> = {
  1: ['STG', 'LOP'],
  2: ['KSK'],
  3: ['BGP'],
}

const PART_LABELS: Record<number, string> = {
  1: 'Teil 1 – Leistungserstellung (STG/LOP)',
  2: 'Teil 2 – KSK',
  3: 'Teil 3 – WiSo (BGP)',
}

export function ExamSetsClient({ initialSets, questions, subjects }: Props) {
  const [sets, setSets] = useState(initialSets)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedSet, setExpandedSet] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Create modal state
  const [newName, setNewName] = useState('')
  const [newPart, setNewPart] = useState<number | null>(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const subjectCodeMap = Object.fromEntries(subjects.map((s) => [s.code, s.id]))

  function getQuestionsForPart(part: number) {
    const codes = PART_SUBJECT_CODES[part] ?? []
    const allowedSubjectIds = codes.map((code) => subjectCodeMap[code]).filter(Boolean)
    return questions.filter((q) =>
      q.question_subjects.some((qs) => allowedSubjectIds.includes(qs.subject_id))
    )
  }

  async function handleToggleActive(set: ExamSet) {
    setTogglingId(set.id)
    try {
      const res = await fetch(`/api/admin/exam-sets/${set.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !set.is_active }),
      })
      if (res.ok) {
        setSets((prev) => prev.map((s) => {
          if (s.part === set.part) return { ...s, is_active: s.id === set.id ? !set.is_active : false }
          return s
        }))
      }
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/exam-sets/${id}`, { method: 'DELETE' })
      if (res.ok) setSets((prev) => prev.filter((s) => s.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newPart || selectedQuestionIds.size === 0) {
      setCreateError('Bitte Name, Teil und mindestens eine Frage auswählen.')
      return
    }
    setIsCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/exam-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          part: newPart,
          question_ids: Array.from(selectedQuestionIds),
          is_active: false,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCreateError(data.error ?? 'Fehler beim Erstellen.')
        return
      }
      const { set } = await res.json()
      setSets((prev) => [set, ...prev])
      setShowCreateModal(false)
      setNewName('')
      setNewPart(null)
      setSelectedQuestionIds(new Set())
    } catch {
      setCreateError('Netzwerkfehler.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#F9FAFB]">Prüfungssets</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Erstelle kuratierte Fragensets für die Prüfungssimulation. Je Teil kann ein Set aktiv sein.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-semibold"
        >
          <Plus size={16} className="mr-2" />
          Neues Set
        </Button>
      </div>

      {sets.length === 0 ? (
        <div className="text-center py-16 bg-[#1F2937] rounded-2xl border border-[#4B5563]">
          <Shield size={48} className="text-[#374151] mx-auto mb-4" />
          <p className="text-[#9CA3AF]">Noch keine Prüfungssets erstellt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map((set) => (
            <div key={set.id} className="bg-[#1F2937] border border-[#4B5563] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <button
                  className="flex-1 text-left flex items-center gap-3"
                  onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F9FAFB] text-sm">{set.name}</span>
                      {set.is_active && (
                        <Badge className="text-xs bg-[#58CC02]/20 text-[#58CC02] border-0">Aktiv</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#9CA3AF]">{PART_LABELS[set.part]}</span>
                      <span className="text-xs text-[#6B7280]">· {set.question_ids.length} Fragen</span>
                    </div>
                  </div>
                  {expandedSet === set.id ? <ChevronUp size={16} className="text-[#9CA3AF] ml-auto" /> : <ChevronDown size={16} className="text-[#9CA3AF] ml-auto" />}
                </button>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(set)}
                    disabled={togglingId === set.id}
                    className={cn(
                      'rounded-lg text-xs px-3',
                      set.is_active
                        ? 'border-[#FF9600]/50 text-[#FF9600] hover:bg-[#FF9600]/10'
                        : 'border-[#58CC02]/50 text-[#58CC02] hover:bg-[#58CC02]/10',
                    )}
                  >
                    {set.is_active ? <ShieldOff size={14} className="mr-1" /> : <Shield size={14} className="mr-1" />}
                    {set.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDeleteId(set.id)}
                    disabled={deletingId === set.id}
                    className="rounded-lg border-[#FF4B4B]/30 text-[#FF4B4B] hover:bg-[#FF4B4B]/10 px-2"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {expandedSet === set.id && (
                <div className="border-t border-[#4B5563] px-4 py-3">
                  <p className="text-xs font-semibold text-[#9CA3AF] mb-2">Enthaltene Fragen ({set.question_ids.length})</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {set.question_ids.map((qid) => {
                      const q = questions.find((q) => q.id === qid)
                      return (
                        <div key={qid} className="text-xs text-[#9CA3AF] py-1 border-b border-[#374151] last:border-0">
                          {q ? q.question_text.slice(0, 80) + (q.question_text.length > 80 ? '…' : '') : qid}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
        <AlertDialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
          <AlertDialogHeader>
            <AlertDialogTitle>Prüfungsset löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#9CA3AF]">
              Dieser Vorgang kann nicht rückgängig gemacht werden. Das Set wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#4B5563] text-[#9CA3AF] hover:bg-[#374151]">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#FF4B4B] hover:bg-[#e04040] text-white"
              onClick={() => { if (confirmDeleteId) { handleDelete(confirmDeleteId); setConfirmDeleteId(null) } }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neues Prüfungsset erstellen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[#9CA3AF]">Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Prüfung Sommer 2025"
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#9CA3AF]">Prüfungsteil</Label>
              <Select onValueChange={(v) => { setNewPart(Number(v)); setSelectedQuestionIds(new Set()) }}>
                <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] rounded-xl">
                  <SelectValue placeholder="Teil auswählen…" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  {[1, 2, 3].map((p) => (
                    <SelectItem key={p} value={String(p)}>{PART_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newPart && (
              <div className="space-y-2">
                <Label className="text-[#9CA3AF]">
                  Fragen auswählen ({selectedQuestionIds.size} ausgewählt)
                </Label>
                <div className="max-h-64 overflow-y-auto space-y-1 bg-[#111827] rounded-xl p-3">
                  {getQuestionsForPart(newPart).map((q) => (
                    <label key={q.id} className="flex items-start gap-3 py-1.5 cursor-pointer group">
                      <Checkbox
                        checked={selectedQuestionIds.has(q.id)}
                        onCheckedChange={(checked) => {
                          setSelectedQuestionIds((prev) => {
                            const next = new Set(prev)
                            if (checked) next.add(q.id)
                            else next.delete(q.id)
                            return next
                          })
                        }}
                        className="border-[#4B5563] data-[state=checked]:bg-[#58CC02] data-[state=checked]:border-[#58CC02] mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#F9FAFB] leading-snug group-hover:text-white">
                          {q.question_text.slice(0, 100)}{q.question_text.length > 100 ? '…' : ''}
                        </p>
                        <span className={cn(
                          'text-xs',
                          q.type === 'open' ? 'text-[#FF9600]' : 'text-[#1CB0F6]',
                        )}>
                          {q.type === 'open' ? 'Offen' : 'MC'} · {q.difficulty}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {createError && <p className="text-[#FF4B4B] text-sm">{createError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl border-[#4B5563] text-[#9CA3AF] hover:bg-[#374151]"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-semibold"
            >
              {isCreating ? 'Wird erstellt…' : 'Set erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
