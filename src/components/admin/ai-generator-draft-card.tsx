'use client'

import { AlertTriangle, Check, Edit2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DraftQuestion } from '@/app/admin/ai-generator/page'

interface Props {
  draft: DraftQuestion
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onEdit: (draft: DraftQuestion) => void
}

export function AiGeneratorDraftCard({ draft, onAccept, onReject, onEdit }: Props) {
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(draft.expires_at).getTime() - Date.now()) / 86_400_000)
  )
  const isDone = draft.status === 'accepted' || draft.status === 'rejected'
  const needsReview = draft.status === 'review_required'

  return (
    <div
      className={`p-5 rounded-2xl border bg-[#1F2937] space-y-4 ${
        needsReview
          ? 'border-[#FF9600]/50'
          : draft.status === 'accepted'
          ? 'border-[#58CC02]/40'
          : draft.status === 'rejected'
          ? 'border-[#4B5563] opacity-60'
          : 'border-[#4B5563]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-[#F9FAFB] font-medium leading-relaxed flex-1">
          {draft.question_text}
        </p>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {needsReview && (
            <Badge className="bg-[#FF9600]/20 text-[#FF9600] border border-[#FF9600]/50 text-xs whitespace-nowrap">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Überprüfung nötig
            </Badge>
          )}
          {draft.status === 'accepted' && (
            <Badge className="bg-[#58CC02]/20 text-[#58CC02] border border-[#58CC02]/50 text-xs">
              Akzeptiert
            </Badge>
          )}
          {draft.status === 'rejected' && (
            <Badge className="bg-[#374151] text-[#9CA3AF] border border-[#4B5563] text-xs">
              Abgelehnt
            </Badge>
          )}
          {!isDone && daysLeft <= 2 && (
            <span className="text-xs text-[#FF4B4B]">Läuft in {daysLeft}T ab</span>
          )}
        </div>
      </div>

      {/* Answer options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {draft.options.map((opt, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 p-3 rounded-xl text-sm border ${
              i === draft.correct_index
                ? 'bg-[#58CC02]/10 border-[#58CC02]/40 text-[#58CC02]'
                : 'bg-[#111827] border-[#374151] text-[#9CA3AF]'
            }`}
          >
            <span
              className={`font-bold flex-shrink-0 w-5 ${
                i === draft.correct_index ? 'text-[#58CC02]' : 'text-[#6B7280]'
              }`}
            >
              {String.fromCharCode(65 + i)}.
            </span>
            <span className="leading-relaxed">{opt}</span>
          </div>
        ))}
      </div>

      {/* Explanation */}
      {draft.explanation && (
        <div className="text-sm text-[#9CA3AF] bg-[#111827] rounded-xl p-3">
          <span className="text-[#6B7280] font-medium">Erklärung: </span>
          {draft.explanation}
        </div>
      )}

      {/* Footer: meta + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {draft.subject_code && (
            <Badge variant="outline" className="border-[#4B5563] text-[#9CA3AF] text-xs">
              {draft.subject_code}
            </Badge>
          )}
          {draft.difficulty && (
            <Badge variant="outline" className="border-[#4B5563] text-[#9CA3AF] text-xs capitalize">
              {draft.difficulty}
            </Badge>
          )}
          {!draft.subject_code && !isDone && (
            <span className="text-xs text-[#FF9600]">Kein Fach gesetzt</span>
          )}
        </div>

        {!isDone && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(draft)}
              className="text-[#9CA3AF] hover:text-[#F9FAFB] rounded-xl"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Bearbeiten
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(draft.id)}
              className="border-[#FF4B4B] text-[#FF4B4B] hover:bg-[#FF4B4B]/10 rounded-xl"
            >
              <X className="w-4 h-4 mr-1" />
              Ablehnen
            </Button>
            <Button
              size="sm"
              onClick={() => onAccept(draft.id)}
              disabled={needsReview}
              title={needsReview ? 'Bitte zuerst bearbeiten und korrekte Antwort bestätigen' : undefined}
              className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 mr-1" />
              Akzeptieren
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
