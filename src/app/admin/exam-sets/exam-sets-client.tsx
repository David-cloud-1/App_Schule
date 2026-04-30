'use client'

import { useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  FileUp,
  Loader2,
  Plus,
  Shield,
  ShieldOff,
  Trash2,
  X,
} from 'lucide-react'
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
  duration_minutes: number | null
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

type ExtractedQuestion = {
  question_text: string
  options: string[]
  correct_index: number | null
  needs_review: boolean
  fach_code: string | null
}

type PreviewQuestion = ExtractedQuestion & { _key: string }

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

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E']

type ImportStep = 'configure' | 'extracting' | 'preview' | 'importing'

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
  const [newDuration, setNewDuration] = useState<string>('')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Import flow state
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>('configure')
  const [importName, setImportName] = useState('')
  const [importPart, setImportPart] = useState<number | null>(null)
  const [importDuration, setImportDuration] = useState<string>('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const durationVal = newDuration.trim() ? parseInt(newDuration.trim(), 10) : null
      const res = await fetch('/api/admin/exam-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          part: newPart,
          question_ids: Array.from(selectedQuestionIds),
          is_active: false,
          ...(durationVal && durationVal > 0 ? { duration_minutes: durationVal } : {}),
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
      setNewDuration('')
      setSelectedQuestionIds(new Set())
    } catch {
      setCreateError('Netzwerkfehler.')
    } finally {
      setIsCreating(false)
    }
  }

  function resetImportDialog() {
    setImportStep('configure')
    setImportName('')
    setImportPart(null)
    setImportDuration('')
    setImportFile(null)
    setPreviewQuestions([])
    setImportError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleExtract() {
    if (!importFile || !importPart || !importName.trim()) {
      setImportError('Bitte Name, Teil und Datei angeben.')
      return
    }
    setImportError(null)
    setImportStep('extracting')

    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await fetch('/api/admin/exam-sets/extract', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setImportStep('configure')
        setImportError(data.error ?? 'Extraktion fehlgeschlagen.')
        return
      }
      const questions: PreviewQuestion[] = (data.questions as ExtractedQuestion[]).map((q, i) => ({
        ...q,
        _key: String(i),
      }))
      setPreviewQuestions(questions)
      setImportStep('preview')
    } catch {
      setImportStep('configure')
      setImportError('Netzwerkfehler beim Extrahieren.')
    }
  }

  async function handleImportConfirm() {
    if (previewQuestions.length === 0) return
    setImportStep('importing')
    setImportError(null)

    try {
      const importDurationVal = importDuration.trim() ? parseInt(importDuration.trim(), 10) : null
      const res = await fetch('/api/admin/exam-sets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importName.trim(),
          part: importPart,
          questions: previewQuestions.map(({ _key: _k, ...q }) => q),
          ...(importDurationVal && importDurationVal > 0 ? { duration_minutes: importDurationVal } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportStep('preview')
        setImportError(data.error ?? 'Import fehlgeschlagen.')
        return
      }
      setSets((prev) => [data.set, ...prev])
      setShowImportDialog(false)
      resetImportDialog()
    } catch {
      setImportStep('preview')
      setImportError('Netzwerkfehler beim Importieren.')
    }
  }

  function removePreviewQuestion(key: string) {
    setPreviewQuestions((prev) => prev.filter((q) => q._key !== key))
  }

  function setCorrectIndex(key: string, index: number) {
    setPreviewQuestions((prev) =>
      prev.map((q) =>
        q._key === key ? { ...q, correct_index: index, needs_review: false } : q
      )
    )
  }

  const needsReviewCount = previewQuestions.filter((q) => q.needs_review).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#F9FAFB]">Prüfungssets</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Erstelle kuratierte Fragensets für die Prüfungssimulation. Je Teil kann ein Set aktiv sein.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => { resetImportDialog(); setShowImportDialog(true) }}
            variant="outline"
            className="rounded-xl border-[#1CB0F6]/50 text-[#1CB0F6] hover:bg-[#1CB0F6]/10 font-semibold"
          >
            <FileUp size={16} className="mr-2" />
            Aus Datei importieren
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-semibold"
          >
            <Plus size={16} className="mr-2" />
            Neues Set
          </Button>
        </div>
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
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-[#9CA3AF]">{PART_LABELS[set.part]}</span>
                      <span className="text-xs text-[#6B7280]">· {set.question_ids.length} Fragen</span>
                      {set.duration_minutes != null && (
                        <span className="text-xs text-[#1CB0F6]">· {set.duration_minutes} Min.</span>
                      )}
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

            <div className="space-y-2">
              <Label className="text-[#9CA3AF]">
                Zeitlimit (Minuten) <span className="text-[#6B7280] font-normal">— optional</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={600}
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                placeholder="z.B. 90 — leer lassen für Standard"
                className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] rounded-xl"
              />
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

      {/* Import Dialog */}
      <Dialog
        open={showImportDialog}
        onOpenChange={(open) => {
          if (!open && importStep !== 'extracting' && importStep !== 'importing') {
            setShowImportDialog(false)
            resetImportDialog()
          }
        }}
      >
        <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp size={18} className="text-[#1CB0F6]" />
              Aus Prüfungsaufgabe importieren
            </DialogTitle>
          </DialogHeader>

          {/* Step: configure */}
          {importStep === 'configure' && (
            <div className="space-y-4 py-2 overflow-y-auto flex-1">
              <div className="space-y-2">
                <Label className="text-[#9CA3AF]">Name des Sets</Label>
                <Input
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="z.B. IHK Prüfung Sommer 2025 – Teil 1"
                  className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#9CA3AF]">Prüfungsteil</Label>
                <Select onValueChange={(v) => setImportPart(Number(v))}>
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

              <div className="space-y-2">
                <Label className="text-[#9CA3AF]">
                  Zeitlimit (Minuten) <span className="text-[#6B7280] font-normal">— optional</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={600}
                  value={importDuration}
                  onChange={(e) => setImportDuration(e.target.value)}
                  placeholder="z.B. 90 — leer lassen für Standard"
                  className="bg-[#111827] border-[#4B5563] text-[#F9FAFB] rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#9CA3AF]">Prüfungsaufgabe (PDF oder Word)</Label>
                <label
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
                    importFile
                      ? 'border-[#1CB0F6]/60 bg-[#1CB0F6]/5'
                      : 'border-[#4B5563] hover:border-[#6B7280]',
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                  <FileUp size={28} className={importFile ? 'text-[#1CB0F6]' : 'text-[#6B7280]'} />
                  {importFile ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#F9FAFB]">{importFile.name}</p>
                      <p className="text-xs text-[#9CA3AF]">{(importFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-[#9CA3AF]">PDF oder DOCX hier ablegen oder klicken</p>
                      <p className="text-xs text-[#6B7280] mt-1">max. 50 MB</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="rounded-xl bg-[#111827] border border-[#374151] p-4 text-xs text-[#9CA3AF] space-y-1">
                <p className="font-semibold text-[#F9FAFB] mb-2">So funktioniert der Import:</p>
                <p>1. Lade eine Prüfungsaufgabe als PDF oder Word-Datei hoch.</p>
                <p>2. Die KI extrahiert alle Multiple-Choice-Fragen <span className="text-[#F9FAFB]">exakt wie sie im Dokument stehen</span>.</p>
                <p>3. Du siehst eine Vorschau und kannst Fragen prüfen oder entfernen.</p>
                <p>4. Beim Bestätigen werden die Fragen gespeichert und das Set erstellt.</p>
              </div>

              {importError && (
                <p className="text-[#FF4B4B] text-sm flex items-center gap-2">
                  <AlertTriangle size={14} /> {importError}
                </p>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setShowImportDialog(false); resetImportDialog() }}
                  className="rounded-xl border-[#4B5563] text-[#9CA3AF] hover:bg-[#374151]"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleExtract}
                  disabled={!importFile || !importPart || !importName.trim()}
                  className="rounded-xl bg-[#1CB0F6] hover:bg-[#19a0e0] text-white font-semibold"
                >
                  Fragen extrahieren
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: extracting / importing */}
          {(importStep === 'extracting' || importStep === 'importing') && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 flex-1">
              <Loader2 size={36} className="animate-spin text-[#1CB0F6]" />
              <p className="text-[#9CA3AF] text-sm">
                {importStep === 'extracting'
                  ? 'Fragen werden aus dem Dokument extrahiert…'
                  : 'Set wird erstellt und Fragen werden gespeichert…'}
              </p>
              <p className="text-xs text-[#6B7280]">Das kann einen Moment dauern.</p>
            </div>
          )}

          {/* Step: preview */}
          {importStep === 'preview' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div>
                  <p className="text-sm font-semibold text-[#F9FAFB]">
                    {previewQuestions.length} Fragen extrahiert
                  </p>
                  {needsReviewCount > 0 && (
                    <p className="text-xs text-[#FF9600] flex items-center gap-1 mt-0.5">
                      <AlertTriangle size={12} />
                      {needsReviewCount} {needsReviewCount === 1 ? 'Frage' : 'Fragen'} ohne erkannte Antwort — bitte markieren
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setImportStep('configure')}
                  className="text-[#9CA3AF] hover:text-[#F9FAFB] text-xs"
                >
                  ← Zurück
                </Button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {previewQuestions.map((q, idx) => (
                  <div
                    key={q._key}
                    className={cn(
                      'rounded-xl border p-4',
                      q.needs_review
                        ? 'border-[#FF9600]/40 bg-[#FF9600]/5'
                        : 'border-[#4B5563] bg-[#111827]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-xs font-bold text-[#6B7280] mt-0.5 shrink-0">#{idx + 1}</span>
                        <p className="text-sm text-[#F9FAFB] leading-snug">{q.question_text}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {q.fach_code && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#374151] text-[#9CA3AF]">
                            {q.fach_code}
                          </span>
                        )}
                        {q.needs_review && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF9600]/20 text-[#FF9600]">
                            Antwort wählen
                          </span>
                        )}
                        <button
                          onClick={() => removePreviewQuestion(q._key)}
                          className="text-[#6B7280] hover:text-[#FF4B4B] transition-colors"
                          title="Frage entfernen"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {q.options.map((opt, j) => {
                        const isCorrect = q.correct_index === j
                        return (
                          <button
                            key={j}
                            onClick={() => setCorrectIndex(q._key, j)}
                            className={cn(
                              'w-full text-left flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors',
                              isCorrect
                                ? 'bg-[#58CC02]/15 border border-[#58CC02]/50 text-[#F9FAFB]'
                                : 'bg-[#1F2937] border border-[#374151] text-[#9CA3AF] hover:border-[#4B5563] hover:text-[#F9FAFB]',
                            )}
                          >
                            <span className={cn(
                              'font-bold shrink-0',
                              isCorrect ? 'text-[#58CC02]' : 'text-[#6B7280]',
                            )}>
                              {OPTION_LETTERS[j]}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <Check size={12} className="text-[#58CC02] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {importError && (
                <p className="text-[#FF4B4B] text-sm flex items-center gap-2 mt-3 flex-shrink-0">
                  <AlertTriangle size={14} /> {importError}
                </p>
              )}

              <DialogFooter className="mt-4 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => { setShowImportDialog(false); resetImportDialog() }}
                  className="rounded-xl border-[#4B5563] text-[#9CA3AF] hover:bg-[#374151]"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleImportConfirm}
                  disabled={previewQuestions.length === 0}
                  className="rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-semibold"
                >
                  {previewQuestions.length} Fragen importieren & Set erstellen
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
