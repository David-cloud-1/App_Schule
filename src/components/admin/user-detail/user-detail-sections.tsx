'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Award,
  CalendarDays,
  ClipboardList,
  Flame,
  History,
  IdCard,
  Mail,
  Pencil,
  ShieldCheck,
  Trophy,
  TriangleAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KontoCard } from '@/components/admin/konto-card'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ROLE_LABEL } from '@/lib/roles'
import { ACTIVITY_DAYS } from '@/lib/user-detail'
import type { AssessmentsData, BadgesData, LearningData, LogData, SectionState, UserOverview } from './types'

export function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Rahmen eines Abschnitts mit eigenem Lade-, Fehler- und Leerzustand */
function SectionBody<T>({
  state,
  retry,
  isEmpty,
  empty,
  children,
}: {
  state: SectionState<T>
  retry: () => void
  isEmpty?: (data: T) => boolean
  empty: { icon: React.ComponentProps<typeof AdminEmptyState>['icon']; title: string; description?: string }
  children: (data: T) => ReactNode
}) {
  if (state.status === 'loading') return <AdminLoadingState variant="list" rows={2} />
  if (state.status === 'error') {
    return <AdminErrorState message="Dieser Abschnitt konnte gerade nicht geladen werden." onRetry={retry} />
  }
  if (isEmpty?.(state.data)) {
    return <AdminEmptyState icon={empty.icon} title={empty.title} description={empty.description} />
  }
  return <>{children(state.data)}</>
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ws-line/60 py-2 last:border-0">
      <dt className="text-sm text-ws-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ws-text">{children}</dd>
    </div>
  )
}

const outlineButton =
  'min-h-11 rounded-xl border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised hover:text-ws-text'

export function OverviewHeaderBadges({ overview }: { overview: UserOverview }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="border-ws-green/30 bg-ws-green/15 text-ws-green">
        <ShieldCheck className="mr-1 size-3" aria-hidden />
        {ROLE_LABEL[overview.role]}
      </Badge>
      {overview.departmentName && (
        <Badge variant="outline" className="border-ws-line text-ws-muted">
          {overview.departmentName}
        </Badge>
      )}
      {overview.banned ? (
        <Badge className="border-ws-red/30 bg-ws-red/15 text-ws-red hover:bg-ws-red/15">Gesperrt</Badge>
      ) : (
        <Badge className="border-ws-green/30 bg-ws-green/15 text-ws-green hover:bg-ws-green/15">Aktiv</Badge>
      )}
    </div>
  )
}

export function SteckbriefCard({
  overview,
  isSelf,
  onRename,
  onEmail,
  onConfirm,
  confirming,
}: {
  overview: UserOverview
  isSelf: boolean
  onRename: () => void
  onEmail: () => void
  onConfirm: () => void
  confirming: boolean
}) {
  const selfHint = 'Du kannst dich nicht selbst bearbeiten.'
  return (
    <KontoCard id="steckbrief" icon={IdCard} title="Steckbrief">
      <dl>
        <Fact label="Registriert am">{formatDate(overview.registeredAt)}</Fact>
        <Fact label="Letzter Login">{formatDateTime(overview.lastSignInAt)}</Fact>
        <Fact label="Letzte Lern-Session">{formatDate(overview.lastSessionDate)}</Fact>
        <Fact label="E-Mail bestätigt">
          {overview.emailConfirmed ? (
            <span className="text-ws-green">Ja</span>
          ) : (
            <span className="text-ws-orange">Nein</span>
          )}
        </Fact>
        {overview.pseudonym && <Fact label="Pseudonym (Rangliste)">{overview.pseudonym}</Fact>}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onRename} className={outlineButton}>
          <Pencil className="mr-2 size-4" aria-hidden />
          Name ändern
        </Button>
        <Button
          variant="outline"
          onClick={onEmail}
          disabled={isSelf}
          title={isSelf ? selfHint : undefined}
          className={outlineButton}
        >
          <Mail className="mr-2 size-4" aria-hidden />
          E-Mail ändern
        </Button>
        {!overview.emailConfirmed && (
          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={isSelf || confirming}
            title={isSelf ? selfHint : undefined}
            className={outlineButton}
          >
            Als bestätigt markieren
          </Button>
        )}
      </div>
      {isSelf && <p className="text-sm text-ws-muted">{selfHint} Name ändern geht.</p>}
    </KontoCard>
  )
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-ws-line bg-ws-bg p-3">
      <p className="text-xs text-ws-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-ws-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ws-faint">{hint}</p>}
    </div>
  )
}

export function SpielstandCard({ overview }: { overview: UserOverview }) {
  return (
    <KontoCard id="spielstand" icon={Trophy} title="Spielstand">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="XP" value={overview.totalXp.toLocaleString('de-DE')} />
        <Stat label="Level" value={overview.level} />
        <Stat label="Streak" value={overview.currentStreak} hint={`Längster: ${overview.longestStreak}`} />
        <Stat label="Frachtmünzen" value={overview.coins.toLocaleString('de-DE')} />
      </div>
    </KontoCard>
  )
}

export function LernstandCard({ state, retry }: { state: SectionState<LearningData>; retry: () => void }) {
  return (
    <KontoCard
      id="lernstand"
      icon={ClipboardList}
      title="Lernstand je Fach"
      description="Beantwortete Fragen und Trefferquote."
    >
      <SectionBody
        state={state}
        retry={retry}
        isEmpty={(d) => d.subjects.length === 0}
        empty={{
          icon: ClipboardList,
          title: 'Noch nichts gelernt',
          description: 'Sobald die Person Fragen beantwortet, erscheint hier der Stand.',
        }}
      >
        {(data) => (
          <ul className="divide-y divide-ws-line/60">
            {data.subjects.map((s) => (
              <li key={s.subjectId ?? 'gemischt'} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ws-text" title={s.name}>
                    {s.name}
                  </p>
                  <p className="text-xs text-ws-muted">
                    {s.answered} Fragen · zuletzt {formatDate(s.lastLearnedAt)}
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <div
                    className="h-2 overflow-hidden rounded-full bg-ws-raised"
                    role="progressbar"
                    aria-valuenow={s.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Trefferquote ${s.name}`}
                  >
                    <div className="h-full rounded-full bg-ws-green" style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
                <p className="w-12 shrink-0 text-right text-sm font-semibold text-ws-text">{s.percent} %</p>
              </li>
            ))}
          </ul>
        )}
      </SectionBody>
    </KontoCard>
  )
}

export function AktivitaetCard({ state, retry }: { state: SectionState<LearningData>; retry: () => void }) {
  return (
    <KontoCard
      id="aktivitaet"
      icon={CalendarDays}
      title="Aktivität"
      description={`Lerntage der letzten ${ACTIVITY_DAYS} Tage.`}
    >
      <SectionBody state={state} retry={retry} empty={{ icon: CalendarDays, title: 'Keine Aktivität' }}>
        {(data) => {
          const learned = data.activity.filter((d) => d.learned).length
          return (
            <div className="space-y-3">
              <div
                role="img"
                aria-label={`An ${learned} von ${data.activity.length} Tagen gelernt`}
                className="flex gap-1"
              >
                {data.activity.map((d) => (
                  <span
                    key={d.date}
                    title={`${formatDate(d.date)}: ${d.learned ? 'gelernt' : 'nicht gelernt'}`}
                    className={`h-8 min-w-0 flex-1 rounded-md ${d.learned ? 'bg-ws-green' : 'bg-ws-raised'}`}
                  />
                ))}
              </div>
              <p className="flex items-center gap-4 text-xs text-ws-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-ws-green" aria-hidden /> gelernt
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-ws-raised" aria-hidden /> nicht gelernt
                </span>
                <span className="ml-auto font-medium text-ws-text">
                  {learned} von {data.activity.length} Tagen
                </span>
              </p>
            </div>
          )
        }}
      </SectionBody>
    </KontoCard>
  )
}

export function BadgesCard({ state, retry }: { state: SectionState<BadgesData>; retry: () => void }) {
  return (
    <KontoCard id="badges" icon={Award} title="Badges">
      <SectionBody
        state={state}
        retry={retry}
        isEmpty={(d) => d.badges.length === 0}
        empty={{ icon: Award, title: 'Noch keine Badges' }}
      >
        {(data) => (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.badges.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-xl border border-ws-line bg-ws-bg p-3">
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ws-gold/15 text-ws-gold"
                >
                  <Award className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ws-text" title={b.name}>
                    {b.name}
                  </span>
                  <span className="block text-xs text-ws-muted">{formatDate(b.unlockedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionBody>
    </KontoCard>
  )
}

export function NachweiseCard({ state, retry }: { state: SectionState<AssessmentsData>; retry: () => void }) {
  return (
    <KontoCard id="nachweise" icon={ClipboardList} title="Leistungsnachweise">
      <SectionBody
        state={state}
        retry={retry}
        isEmpty={(d) => d.assessments.length === 0}
        empty={{
          icon: ClipboardList,
          title: 'Keine Leistungsnachweise',
          description: 'Die Person hat an keinem Nachweis teilgenommen.',
        }}
      >
        {(data) => (
          <ul className="divide-y divide-ws-line/60">
            {data.assessments.map((a) => (
              <li key={a.sessionId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/leistungsnachweise/${a.assessmentId}`}
                    className="block truncate rounded text-sm font-medium text-ws-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
                    title={a.title}
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-ws-muted">{formatDate(a.date)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {a.excluded ? (
                    <Badge variant="outline" className="border-ws-line text-ws-muted">
                      Nicht gewertet
                    </Badge>
                  ) : a.status === 'in_progress' ? (
                    <Badge variant="outline" className="border-ws-orange/30 bg-ws-orange/15 text-ws-orange">
                      Läuft noch
                    </Badge>
                  ) : (
                    <>
                      {a.points != null && a.totalPoints != null && (
                        <span className="text-ws-text">
                          {a.points} / {a.totalPoints} Punkte
                        </span>
                      )}
                      {a.grade != null && (
                        <Badge variant="outline" className="border-ws-line text-ws-text">
                          Note {a.grade}
                        </Badge>
                      )}
                    </>
                  )}
                  {a.focusSwitches != null && (
                    <span
                      className={a.focusSwitches > 0 ? 'flex items-center gap-1 text-ws-orange' : 'text-ws-muted'}
                      title="Wechsel aus dem Prüfungsfenster"
                    >
                      {a.focusSwitches > 0 && <TriangleAlert className="size-4" aria-hidden />}
                      {a.focusSwitches} Fokus-{a.focusSwitches === 1 ? 'Verlust' : 'Verluste'}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionBody>
    </KontoCard>
  )
}

function logDetailText(details: Record<string, unknown> | null): string | null {
  if (!details) return null
  const { old: before, new: after } = details as { old?: unknown; new?: unknown }
  if (typeof before === 'string' && typeof after === 'string') return `${before} → ${after}`
  if (typeof after === 'string' && before == null) return `→ ${after}`
  const xp = (details.old as { total_xp?: number } | undefined)?.total_xp
  if (typeof xp === 'number') return `Vorher: ${xp} XP`
  return null
}

export function ProtokollCard({
  userId,
  state,
  retry,
}: {
  userId: string
  state: SectionState<LogData>
  retry: () => void
}) {
  return (
    <KontoCard id="protokoll" icon={History} title="Protokoll" description="Wer hat an diesem Konto etwas geändert?">
      <SectionBody
        state={state}
        retry={retry}
        isEmpty={(d) => d.entries.length === 0}
        empty={{
          icon: History,
          title: 'Noch keine Änderungen',
          description: 'Sperren, Rollen, Namen und Passwörter erscheinen hier.',
        }}
      >
        {(data) => (
          <div className="space-y-3">
            <ul className="divide-y divide-ws-line/60">
              {data.entries.map((e) => {
                const detail = logDetailText(e.details)
                return (
                  <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
                    <span className="text-sm font-medium text-ws-text">{e.label}</span>
                    {detail && (
                      <span className="min-w-0 truncate text-sm text-ws-muted" title={detail}>
                        {detail}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-ws-faint">
                      {formatDateTime(e.createdAt)} · {e.adminName ?? 'Unbekannt'}
                    </span>
                  </li>
                )
              })}
            </ul>
            {data.total > data.entries.length && (
              <Link
                href={`/admin/audit-log?person=${userId}`}
                className="inline-flex min-h-11 items-center rounded text-sm font-medium text-ws-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green"
              >
                Alle {data.total} Einträge anzeigen
              </Link>
            )}
          </div>
        )}
      </SectionBody>
    </KontoCard>
  )
}

export function GefahrenzoneCard({
  isSelf,
  onReset,
  onDelete,
  deleteBlockedReason,
}: {
  isSelf: boolean
  onReset: () => void
  onDelete: () => void
  /** Grund, warum „Konto löschen“ hier nicht geht (Super-Admin-Rolle, Zweitaccount); sonst null */
  deleteBlockedReason: string | null
}) {
  return (
    <section aria-labelledby="gefahr-titel" className="space-y-4 rounded-2xl border border-ws-red/40 bg-ws-surface p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ws-red/15 text-ws-red"
        >
          <Flame className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="gefahr-titel" className="text-base font-semibold text-ws-text">
            Gefahrenzone
          </h2>
          <p className="mt-0.5 text-sm text-ws-muted">Diese Aktionen lassen sich nicht rückgängig machen.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ws-line bg-ws-bg p-4">
        <div className="min-w-0 max-w-prose">
          <p className="text-sm font-medium text-ws-text">Fortschritt zurücksetzen</p>
          <p className="text-sm text-ws-muted">
            Setzt XP, Streak, Münzen, Lernverlauf, Badges und den Hof auf null. Leistungsnachweise bleiben.
          </p>
          {isSelf && <p className="mt-1 text-sm text-ws-muted">Du kannst dich nicht selbst bearbeiten.</p>}
        </div>
        <Button
          variant="outline"
          onClick={onReset}
          disabled={isSelf}
          className="min-h-11 rounded-xl border-ws-red/40 bg-transparent text-ws-red hover:bg-ws-red/15 hover:text-ws-red"
        >
          Fortschritt zurücksetzen
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ws-line bg-ws-bg p-4">
        <div className="min-w-0 max-w-prose">
          <p className="text-sm font-medium text-ws-text">Konto löschen</p>
          <p className="text-sm text-ws-muted">
            Löscht Login und alle persönlichen Daten endgültig (DSGVO). Benotete Leistungsnachweise bleiben anonym als
            „Gelöschtes Konto“ erhalten.
          </p>
          {isSelf && <p className="mt-1 text-sm text-ws-muted">Du kannst dich nicht selbst bearbeiten.</p>}
          {!isSelf && deleteBlockedReason && <p className="mt-1 text-sm text-ws-muted">{deleteBlockedReason}</p>}
        </div>
        <Button
          variant="outline"
          onClick={onDelete}
          disabled={isSelf || deleteBlockedReason !== null}
          className="min-h-11 rounded-xl border-ws-red/40 bg-transparent text-ws-red hover:bg-ws-red/15 hover:text-ws-red"
        >
          Konto löschen
        </Button>
      </div>
    </section>
  )
}
