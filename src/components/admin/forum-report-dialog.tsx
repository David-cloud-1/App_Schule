'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
  FORUM_LIMITS,
  FORUM_REPORT_REASONS,
  FORUM_REPORT_REASON_LABEL,
  type ForumReportReason,
} from '@/lib/forum'
import { forumJson, forumRequest } from '@/lib/forum-client'

/** Beitrag oder Antwort melden (PROJ-63): Grund wählen, optional ein Satz dazu. */
export function ForumReportDialog({
  target,
  onOpenChange,
  onReported,
}: {
  target: { type: 'post' | 'reply'; id: string } | null
  onOpenChange: (open: boolean) => void
  onReported?: () => void
}) {
  const [reason, setReason] = useState<ForumReportReason | ''>('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!target) return
    setReason('')
    setNote('')
    setError(null)
  }, [target])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target || !reason) {
      setError('Bitte einen Grund wählen.')
      return
    }
    setBusy(true)
    setError(null)
    const res = await forumRequest('/api/admin/lehrerzimmer/reports', forumJson('POST', {
      target_type: target.type,
      target_id: target.id,
      reason,
      note: note.trim() || null,
    }))
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success('Danke, die Admins schauen es sich an.')
    onOpenChange(false)
    onReported?.()
  }

  return (
    <Dialog open={target !== null} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="border-ws-line bg-ws-surface text-ws-text sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{target?.type === 'reply' ? 'Antwort melden' : 'Beitrag melden'}</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Warum soll sich die Moderation das ansehen? Die Person erfährt nicht, wer gemeldet hat.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={reason} onValueChange={(v) => setReason(v as ForumReportReason)} className="gap-1">
            {FORUM_REPORT_REASONS.map((r) => (
              <Label
                key={r}
                htmlFor={`report-${r}`}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-ws-line px-3 text-ws-text hover:bg-ws-raised"
              >
                <RadioGroupItem id={`report-${r}`} value={r} />
                {FORUM_REPORT_REASON_LABEL[r]}
              </Label>
            ))}
          </RadioGroup>

          <div className="space-y-1">
            <Label htmlFor="report-note">Ein Satz dazu (optional)</Label>
            <Textarea
              id="report-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, FORUM_LIMITS.noteMax))}
              rows={3}
              className="rounded-xl border-ws-line bg-ws-bg text-ws-text"
            />
            <p className="text-right text-xs text-ws-faint">{note.length} / {FORUM_LIMITS.noteMax}</p>
          </div>

          {error && <p role="alert" className="text-sm text-ws-red">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)} className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text">
              Abbrechen
            </Button>
            <Button type="submit" disabled={busy || !reason} className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover">
              {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Melden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
