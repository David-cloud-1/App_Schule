'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DraftQuestion } from '@/app/admin/ai-generator/page'

const SUBJECTS = ['BGP', 'KSK', 'STG', 'LOP', 'PUG'] as const

interface Props {
  draft: DraftQuestion | null
  onClose: () => void
  onSave: (draft: DraftQuestion, data: Partial<DraftQuestion>) => Promise<void>
}

type FormState = {
  question_text: string
  opt_a: string
  opt_b: string
  opt_c: string
  opt_d: string
  opt_e: string
  correct_index: string
  explanation: string
  subject_code: string
  difficulty: string
  class_level: string
}

const OPT_KEYS = ['opt_a', 'opt_b', 'opt_c', 'opt_d', 'opt_e'] as const

export function AiGeneratorDraftEditModal({ draft, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>({
    question_text: '',
    opt_a: '', opt_b: '', opt_c: '', opt_d: '', opt_e: '',
    correct_index: '0',
    explanation: '',
    subject_code: '_none',
    difficulty: 'mittel',
    class_level: '_all',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!draft) return
    setForm({
      question_text: draft.question_text,
      opt_a: draft.options[0] ?? '',
      opt_b: draft.options[1] ?? '',
      opt_c: draft.options[2] ?? '',
      opt_d: draft.options[3] ?? '',
      opt_e: draft.options[4] ?? '',
      correct_index: String(draft.correct_index),
      explanation: draft.explanation ?? '',
      subject_code: draft.subject_code ?? '_none',
      difficulty: draft.difficulty ?? 'mittel',
      class_level: draft.class_level ? String(draft.class_level) : '_all',
    })
  }, [draft])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    setSaving(true)
    await onSave(draft, {
      question_text: form.question_text.trim(),
      options: [form.opt_a, form.opt_b, form.opt_c, form.opt_d, form.opt_e],
      correct_index: Number(form.correct_index),
      explanation: form.explanation.trim() || null,
      subject_code: form.subject_code === '_none' ? null : form.subject_code,
      difficulty: form.difficulty as DraftQuestion['difficulty'],
      class_level: form.class_level === '_all' ? null : (Number(form.class_level) as 10 | 11 | 12),
    })
    setSaving(false)
  }

  const isReviewRequired = draft?.status === 'review_required'

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#F9FAFB]">Entwurf bearbeiten</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            {isReviewRequired
              ? 'Überprüfung erforderlich: Bitte markiere die korrekte Antwort manuell.'
              : 'Bearbeite die KI-generierte Frage bevor du sie akzeptierst.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Question text */}
          <div className="space-y-2">
            <Label htmlFor="qtext">Fragetext</Label>
            <Textarea
              id="qtext"
              rows={3}
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
              required
            />
          </div>

          {/* Answer options */}
          <div className="space-y-3">
            <Label>
              Antworten{' '}
              <span className="text-[#9CA3AF] font-normal">(korrekte per Radio auswählen)</span>
            </Label>
            <RadioGroup
              value={form.correct_index}
              onValueChange={(v) => setForm({ ...form, correct_index: v })}
              className="space-y-2"
            >
              {OPT_KEYS.map((key, i) => (
                <div key={i} className="flex items-center gap-3">
                  <RadioGroupItem
                    value={String(i)}
                    id={`opt-${i}`}
                    className="border-[#4B5563]"
                  />
                  <Label
                    htmlFor={`opt-${i}`}
                    className="w-6 text-center text-sm font-semibold text-[#58CC02]"
                  >
                    {String.fromCharCode(65 + i)}
                  </Label>
                  <Input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={`Antwort ${String.fromCharCode(65 + i)}`}
                    className="flex-1 bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
                    required
                  />
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Erklärung (optional)</Label>
            <Textarea
              id="explanation"
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]"
            />
          </div>

          {/* Subject + Difficulty + Class level */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fach</Label>
              <Select
                value={form.subject_code}
                onValueChange={(v) => setForm({ ...form, subject_code: v })}
              >
                <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                  <SelectValue placeholder="Fach wählen" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  <SelectItem value="_none">Kein Fach</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Schwierigkeit</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm({ ...form, difficulty: v })}
              >
                <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  <SelectItem value="leicht">Leicht</SelectItem>
                  <SelectItem value="mittel">Mittel</SelectItem>
                  <SelectItem value="schwer">Schwer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Klassenstufe</Label>
              <Select
                value={form.class_level}
                onValueChange={(v) => setForm({ ...form, class_level: v })}
              >
                <SelectTrigger className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]">
                  <SelectItem value="_all">Alle</SelectItem>
                  <SelectItem value="10">Kl. 10</SelectItem>
                  <SelectItem value="11">Kl. 11</SelectItem>
                  <SelectItem value="12">Kl. 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
