'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Coins, Flag, Loader2, MessageSquareText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { REPORT_STATUS_LABEL, type ReportStatus } from '@/lib/question-reports'
import { cn } from '@/lib/utils'

interface MyReport {
  id: string
  status: ReportStatus
  question_text: string
  response_text: string | null
  reward_coins: number
  created_at: string
  closed_at: string | null
  unread: boolean
}

function useMyReports() {
  const [items, setItems] = useState<MyReport[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/question-reports', { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      const body = (await res.json()) as { items: MyReport[] }
      setItems(body.items)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { items, failed, reload: load }
}

function truncate(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const STATUS_STYLE: Record<ReportStatus, string> = {
  offen: 'bg-[#374151] text-[#9CA3AF]',
  in_pruefung: 'bg-[#1CB0F6]/15 text-[#1CB0F6]',
  korrigiert: 'bg-[#58CC02]/15 text-[#58CC02]',
  nicht_uebernommen: 'bg-[#374151] text-[#9CA3AF]',
  entfaellt: 'bg-[#374151] text-[#9CA3AF]',
}

/**
 * Rückmeldungen auf gemeldete Fragen im „Heute“-Screen (PROJ-72/73): zeigt
 * nur ungelesene Antworten der Lehrkräfte und verschwindet, sobald sie
 * gelesen sind. Ohne Rückmeldung rendert die Karte nichts.
 */
export function ReportFeedbackCard() {
  const { items, reload } = useMyReports()
  const [busy, setBusy] = useState(false)

  const unread = (items ?? []).filter((r) => r.unread)
  if (unread.length === 0) return null

  async function markRead() {
    setBusy(true)
    try {
      await fetch('/api/question-reports/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unread.slice(0, 50).map((r) => r.id) }),
      })
      await reload()
    } finally {
      setBusy(false)
    }
  }

  const coins = unread.reduce((sum, r) => sum + r.reward_coins, 0)

  return (
    <section
      aria-label="Rückmeldung zu deinen Meldungen"
      className="rounded-2xl border border-[#58CC02]/40 bg-[#1F2937] p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-[#58CC02]" />
          <h2 className="text-base font-bold text-[#F9FAFB]">Deine Meldungen wurden bearbeitet</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={markRead}
          disabled={busy}
          aria-label="Als gelesen markieren"
          className="size-11 shrink-0 rounded-xl text-[#9CA3AF] hover:bg-[#374151]"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <X className="size-5" />}
        </Button>
      </div>

      <ul className="mt-3 space-y-3">
        {unread.slice(0, 3).map((r) => (
          <li key={r.id} className="text-sm">
            <p className="truncate text-[#9CA3AF]" title={r.question_text}>
              {truncate(r.question_text)}
            </p>
            {r.status === 'korrigiert' ? (
              <p className="mt-0.5 text-[#F9FAFB]">
                Danke, deine Meldung hat die Frage verbessert.
                {r.response_text ? ` ${r.response_text}` : ''}
              </p>
            ) : r.status === 'entfaellt' ? (
              <p className="mt-0.5 text-[#F9FAFB]">Die Frage gibt es nicht mehr.</p>
            ) : (
              <p className="mt-0.5 text-[#F9FAFB]">
                Geprüft, keine Änderung.{r.response_text ? ` ${r.response_text}` : ''}
              </p>
            )}
          </li>
        ))}
      </ul>
      {unread.length > 3 && <p className="mt-2 text-xs text-[#9CA3AF]">und {unread.length - 3} weitere</p>}

      {coins > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FFD700]/15 px-3 py-1 text-sm font-bold text-[#FFD700]">
          <Coins className="size-4" /> +{coins} Frachtmünzen
        </p>
      )}
    </section>
  )
}

/** Liste „Meine Meldungen“ im Profil (PROJ-72). */
export function MyQuestionReportsList() {
  const { items, failed, reload } = useMyReports()

  return (
    <section aria-label="Meine Meldungen" className="rounded-2xl border border-[#4B5563] bg-[#1F2937] p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <Flag className="size-5 text-[#9CA3AF]" />
        <h2 className="text-base font-bold text-[#F9FAFB]">Meine Meldungen</h2>
      </div>

      {failed ? (
        <div className="space-y-2">
          <p className="text-sm text-[#9CA3AF]">Das konnten wir gerade nicht laden.</p>
          <Button variant="outline" onClick={() => void reload()} className="min-h-11 rounded-xl">
            Erneut versuchen
          </Button>
        </div>
      ) : items === null ? (
        <div className="space-y-2" aria-busy="true">
          <div className="h-12 animate-pulse rounded-xl bg-[#374151]" />
          <div className="h-12 animate-pulse rounded-xl bg-[#374151]" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#9CA3AF]">
          Noch nichts gemeldet. Wenn dir beim Üben eine Frage falsch vorkommt, tippe danach auf „Frage melden“.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl bg-[#111827] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm text-[#F9FAFB]" title={r.question_text}>
                  {truncate(r.question_text, 70)}
                </p>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                    STATUS_STYLE[r.status],
                  )}
                >
                  {r.status === 'korrigiert' && <CheckCircle2 className="size-3" />}
                  {REPORT_STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                {new Date(r.created_at).toLocaleDateString('de-DE')}
                {r.reward_coins > 0 ? ` · +${r.reward_coins} Frachtmünzen` : ''}
              </p>
              {r.response_text && <p className="mt-1 text-sm text-[#9CA3AF]">{r.response_text}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
