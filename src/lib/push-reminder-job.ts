import type { SupabaseClient } from '@supabase/supabase-js'
import {
  addDays,
  berlinTime,
  buildPayload,
  decideReminder,
  type ReminderBranding,
  type ReminderPayload,
  type ReminderState,
  type SkipReason,
} from '@/lib/push-reminder'
import { appIconPrefix } from '@/lib/push-client'
import type { PushDevice, PushSendResult } from '@/lib/push-send'

/** Wie weit zurück die Lernaktivität gelesen wird (Reaktion + 14-Tage-Pause) */
const ACTIVITY_LOOKBACK_DAYS = 16
const PAGE = 1000
const USER_CHUNK = 100
const PARALLEL_USERS = 15

export interface JobOptions {
  service: SupabaseClient
  now: Date
  send: (device: PushDevice, payload: ReminderPayload) => Promise<PushSendResult>
  /** Nur rechnen und zählen, nichts verschicken oder speichern */
  dry: boolean
}

export interface JobResult {
  dry: boolean
  users: number
  wouldSend: number
  sentUsers: number
  devicesOk: number
  devicesGone: number
  devicesFailed: number
  skipped: Record<SkipReason | 'bereits-vergeben', number>
}

interface Device extends PushDevice {
  id: string
}

interface DeptRow {
  id: string
  code: string
  app_name: string
  currency_name: string
  hof_name: string
}

interface ProfileRow {
  id: string
  department_id: string | null
  current_streak: number | null
  last_session_date: string | null
  total_xp: number | null
}

interface StateRow extends ReminderState {
  user_id: string
  last_sent_at: string | null
}

/** Alle Zeilen einer Abfrage seitenweise lesen (PostgREST liefert höchstens ~1000 je Anfrage) */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < 50_000; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return out
}

/** Berliner Lerntage je Konto (Quiz-Runde, Blitzrunde, Prüfung) seit `sinceDay` */
async function fetchActivityDays(service: SupabaseClient, userIds: string[], sinceDay: string): Promise<Map<string, Set<string>>> {
  const sinceIso = `${addDays(sinceDay, -1)}T00:00:00Z` // ein Tag Puffer wegen der Zeitzone
  const map = new Map<string, Set<string>>()
  const add = (userId: string, day: string) => {
    let set = map.get(userId)
    if (!set) map.set(userId, (set = new Set()))
    set.add(day)
  }
  const toDay = (iso: string) => berlinTime(new Date(iso)).dateStr

  const [quiz, blitz, exam] = await Promise.all([
    readAll<{ user_id: string; completed_at: string }>((a, b) =>
      service.from('quiz_sessions').select('user_id, completed_at').in('user_id', userIds).gte('completed_at', sinceIso).order('completed_at').range(a, b),
    ),
    readAll<{ user_id: string; calendar_day: string }>((a, b) =>
      service.from('blitz_rounds').select('user_id, calendar_day').in('user_id', userIds).gte('calendar_day', sinceDay).order('calendar_day').range(a, b),
    ),
    readAll<{ user_id: string; started_at: string }>((a, b) =>
      service.from('exam_sessions').select('user_id, started_at').in('user_id', userIds).gte('started_at', sinceIso).order('started_at').range(a, b),
    ),
  ])
  for (const r of quiz) if (r.completed_at) add(r.user_id, toDay(r.completed_at))
  for (const r of blitz) add(r.user_id, r.calendar_day)
  for (const r of exam) if (r.started_at) add(r.user_id, toDay(r.started_at))
  return map
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Versand-Job (PROJ-18): geht alle angemeldeten Konten durch, entscheidet je Konto
 * mit `decideReminder` und verschickt höchstens eine Meldung. Der Aufrufer hat
 * schon geprüft, dass jetzt Erinnerungszeit ist (oder `dry` gesetzt ist).
 *
 * Schutz vor Doppelversand: Der Tag wird in `push_reminder_state` *vor* dem
 * Senden bedingt eingetragen; ein zweiter Lauf am selben Tag findet ihn belegt.
 * Scheitern danach alle Geräte nur vorübergehend (Netz), wird der alte Stand
 * zurückgeschrieben, damit der nächste Termin es noch einmal versucht.
 */
export async function runReminderJob({ service, now, send, dry }: JobOptions): Promise<JobResult> {
  const today = berlinTime(now).dateStr
  const result: JobResult = {
    dry,
    users: 0,
    wouldSend: 0,
    sentUsers: 0,
    devicesOk: 0,
    devicesGone: 0,
    devicesFailed: 0,
    skipped: { 'nie-gespielt': 0, 'heute-gelernt': 0, 'heute-schon-gesendet': 0, abgeklungen: 0, 'bereits-vergeben': 0 },
  }

  // 1) Angemeldete Geräte je Konto
  const rows = await readAll<{ id: string; user_id: string; endpoint: string; p256dh: string; auth: string }>((a, b) =>
    service.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').order('id').range(a, b),
  )
  const devicesByUser = new Map<string, Device[]>()
  for (const r of rows) {
    const list = devicesByUser.get(r.user_id) ?? []
    list.push({ id: r.id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth })
    devicesByUser.set(r.user_id, list)
  }
  const userIds = [...devicesByUser.keys()]
  result.users = userIds.length
  if (userIds.length === 0) return result

  // 2) Fachbereiche (Name, Münz- und Hofname, Symbol)
  const { data: deptData, error: deptError } = await service
    .from('departments')
    .select('id, code, app_name, currency_name, hof_name')
    .limit(50)
  if (deptError) throw new Error(`Bereiche: ${deptError.message}`)
  const deptById = new Map((deptData as DeptRow[]).map((d) => [d.id, d]))
  const fallbackDept = (deptData as DeptRow[])[0]

  const sinceDay = addDays(today, -ACTIVITY_LOOKBACK_DAYS)

  // 3) Konto für Konto entscheiden — in Blöcken, damit Abfragen klein bleiben
  for (const block of chunks(userIds, USER_CHUNK)) {
    const [profiles, states, activity] = await Promise.all([
      readAll<ProfileRow>((a, b) =>
        service.from('profiles').select('id, department_id, current_streak, last_session_date, total_xp').in('id', block).order('id').range(a, b),
      ),
      readAll<StateRow>((a, b) =>
        service
          .from('push_reminder_state')
          .select('user_id, last_sent_date, last_sent_at, sent_count, ignored_in_a_row')
          .in('user_id', block)
          .order('user_id')
          .range(a, b),
      ),
      fetchActivityDays(service, block, sinceDay),
    ])
    const profileById = new Map(profiles.map((p) => [p.id, p]))
    const stateById = new Map(states.map((s) => [s.user_id, s]))

    type Plan = { userId: string; payload: ReminderPayload; devices: Device[]; state: StateRow | null; ignored: number }
    const plans: Plan[] = []

    for (const userId of block) {
      const profile = profileById.get(userId)
      if (!profile) continue // Konto gelöscht, Gerät räumt die Kaskade auf
      const state = stateById.get(userId) ?? null
      const decision = decideReminder(
        {
          currentStreak: profile.current_streak ?? 0,
          lastSessionDate: profile.last_session_date,
          everPlayed: (profile.total_xp ?? 0) > 0 || profile.last_session_date !== null,
          state,
          activityDays: activity.get(userId) ?? new Set<string>(),
        },
        now,
      )
      if (!decision.send) {
        result.skipped[decision.reason]++
        continue
      }
      const dept = (profile.department_id ? deptById.get(profile.department_id) : null) ?? fallbackDept
      const brand: ReminderBranding = {
        appName: dept?.app_name ?? 'Lern-App',
        currencyName: dept?.currency_name ?? 'Münzen',
        hofName: dept?.hof_name ?? 'Sammlung',
        iconPrefix: appIconPrefix(dept?.code),
      }
      plans.push({
        userId,
        payload: buildPayload(state?.sent_count ?? 0, decision.streak, brand),
        devices: devicesByUser.get(userId) ?? [],
        state,
        ignored: decision.ignoredInARow,
      })
    }

    result.wouldSend += plans.length
    if (dry) continue

    // 4) Senden: Konto belegen, an alle Geräte schicken, Tote Geräte löschen
    for (const group of chunks(plans, PARALLEL_USERS)) {
      await Promise.all(
        group.map(async (plan) => {
          const nowIso = new Date().toISOString()
          await service.from('push_reminder_state').upsert({ user_id: plan.userId }, { onConflict: 'user_id', ignoreDuplicates: true })
          const { data: claimed, error: claimError } = await service
            .from('push_reminder_state')
            .update({
              last_sent_date: today,
              last_sent_at: nowIso,
              sent_count: (plan.state?.sent_count ?? 0) + 1,
              ignored_in_a_row: plan.ignored,
              updated_at: nowIso,
            })
            .eq('user_id', plan.userId)
            .or(`last_sent_date.is.null,last_sent_date.neq.${today}`)
            .select('user_id')
          if (claimError || !claimed || claimed.length === 0) {
            result.skipped['bereits-vergeben']++
            return
          }

          const outcomes = await Promise.all(plan.devices.map((d) => send(d, plan.payload)))
          const ok = outcomes.filter((o) => o === 'ok').length
          const gone = plan.devices.filter((_d, i) => outcomes[i] === 'gone')
          result.devicesOk += ok
          result.devicesGone += gone.length
          result.devicesFailed += outcomes.filter((o) => o === 'error').length

          if (gone.length > 0) {
            await service.from('push_subscriptions').delete().in('id', gone.map((d) => d.id))
          }
          if (ok > 0) {
            result.sentUsers++
          } else if (outcomes.some((o) => o === 'error')) {
            // Nur vorübergehende Fehler, nichts angekommen: alten Stand zurück, der nächste Termin versucht es erneut
            await service
              .from('push_reminder_state')
              .update({
                last_sent_date: plan.state?.last_sent_date ?? null,
                last_sent_at: plan.state?.last_sent_at ?? null,
                sent_count: plan.state?.sent_count ?? 0,
                ignored_in_a_row: plan.state?.ignored_in_a_row ?? 0,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', plan.userId)
          }
        }),
      )
    }
  }
  return result
}
