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
  const missingMeta = !draft.subject_code || !draft.difficulty

  return (
    <div
      className={`p-5 rounded-2xl border bg-ws-surface space-y-4 ${
        needsReview
          ? 'border-ws-orange/50'
          : draft.status === 'accepted'
          ? 'border-ws-green/40'
          : draft.status === 'rejected'
          ? 'border-ws-line opacity-60'
          : 'border-ws-line'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-ws-text font-medium leading-relaxed flex-1">
          {draft.question_text}
        </p>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {needsReview && (
            <Badge className="bg-ws-orange/20 text-ws-orange border border-ws-orange/50 text-xs whitespace-nowrap">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Überprüfung nötig
            </Badge>
          )}
          {draft.status === 'accepted' && (
            <Badge className="bg-ws-green/20 text-ws-green border border-ws-green/50 text-xs">
              Akzeptiert
            </Badge>
          )}
          {draft.status === 'rejected' && (
            <Badge className="bg-ws-raised text-ws-muted border border-ws-line text-xs">
              Abgelehnt
            </Badge>
          )}
          {!isDone && daysLeft <= 2 && (
            <span className="text-xs text-ws-red">Läuft in {daysLeft}T ab</span>
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
                ? 'bg-ws-green/10 border-ws-green/40 text-ws-green'
                : 'bg-ws-bg border-ws-raised text-ws-muted'
            }`}
          >
            <span
              className={`font-bold flex-shrink-0 w-5 ${
                i === draft.correct_index ? 'text-ws-green' : 'text-ws-faint'
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
        <div className="text-sm text-ws-muted bg-ws-bg rounded-xl p-3">
          <span className="text-ws-faint font-medium">Erklärung: </span>
          {draft.explanation}
        </div>
      )}

      {/* Footer: meta + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {draft.subject_code && (
            <Badge variant="outline" className="border-ws-line text-ws-muted text-xs">
              {draft.subject_code}
            </Badge>
          )}
          {draft.difficulty && (
            <Badge variant="outline" className="border-ws-line text-ws-muted text-xs capitalize">
              {draft.difficulty}
            </Badge>
          )}
          {!draft.subject_code && !isDone && (
            <span className="text-xs text-ws-orange">Kein Fach gesetzt</span>
          )}
        </div>

        {!isDone && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(draft)}
              className="text-ws-muted hover:text-ws-text rounded-xl"
            >
              <Edit2 className="w-4 h-4 mr-1.5" />
              Bearbeiten
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(draft.id)}
              className="border-ws-red text-ws-red hover:bg-ws-red/10 rounded-xl"
            >
              <X className="w-4 h-4 mr-1" />
              Ablehnen
            </Button>
            <Button
              size="sm"
              onClick={() => onAccept(draft.id)}
              disabled={needsReview || missingMeta}
              title={
                needsReview
                  ? 'Bitte zuerst bearbeiten und korrekte Antwort bestätigen'
                  : missingMeta
                  ? 'Fach und Schwierigkeitsgrad müssen gesetzt sein'
                  : undefined
              }
              className="bg-ws-green hover:bg-ws-green-hover text-ws-on-accent rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
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
