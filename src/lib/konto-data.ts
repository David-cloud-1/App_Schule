import type { SupabaseClient, User } from '@supabase/supabase-js'
import { contentTitleFromSnapshot, type KontoContentType } from '@/lib/konto'
import type { TeacherRole } from '@/lib/roles'

/**
 * Daten der Seite „Mein Konto“ (PROJ-50), beim Laden auf dem Server
 * gesammelt. Jede Abfrage filtert auf die eigene Person; die Datenbank-
 * Regeln (RLS) gelten zusätzlich. Ein Fehler in einem Abschnitt blockiert
 * die anderen nicht — der Abschnitt meldet dann `failed`.
 */

export const AUFGABEN_LIMIT = 5
export const RECENT_LIMIT = 5

export type Section<T> = { ok: true; data: T } | { ok: false }

export interface KontoHead {
  displayName: string
  email: string
  /** Neue Adresse, die noch bestätigt werden muss (Supabase: `new_email`) */
  pendingEmail: string | null
  /** Konto hat ein eigenes Passwort (E-Mail-Anmeldung); Google/Apple-Konten nicht */
  hasPassword: boolean
  kuerzel: string | null
  role: TeacherRole
  departmentName: string | null
}

export interface AufgabeItem {
  id: string
  title: string
  /** Nur bei „Laufen gerade“: bisherige Abgaben */
  submissions?: number
}

export interface AufgabenGruppe {
  items: AufgabeItem[]
  /** Gesamtzahl, auch wenn nur `AUFGABEN_LIMIT` Einträge geliefert werden */
  total: number
}

export interface KontoAufgaben {
  drafts: AufgabenGruppe
  running: AufgabenGruppe
  unseen: AufgabenGruppe
}

export interface RecentChange {
  key: string
  type: KontoContentType
  title: string
  deleted: boolean
  /** Endgültig gelöscht: nicht mehr im Papierkorb, also nicht anklickbar */
  gone: boolean
  at: string
}

export interface KontoBeitrag {
  questionsCreated: number
  changes: number
  assessments: number
  recent: RecentChange[]
}

export interface KontoSpiel {
  totalXp: number
  streak: number
}

export interface KontoSettings {
  pseudonym: string
  leaderboardOptOut: boolean
}

export interface KontoData {
  head: KontoHead
  aufgaben: Section<KontoAufgaben>
  beitrag: Section<KontoBeitrag>
  spiel: KontoSpiel
  settings: KontoSettings
}

type Db = SupabaseClient

const TABLE_BY_TYPE: Record<KontoContentType, string> = {
  question: 'questions',
  topic: 'topics',
  subject: 'subjects',
  exam_question_set: 'exam_question_sets',
}

async function group(db: Db, userId: string, status: 'draft' | 'open' | 'closed'): Promise<AufgabenGruppe> {
  let query = db
    .from('graded_assessments')
    .select('id, title', { count: 'exact' })
    .eq('created_by', userId)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(AUFGABEN_LIMIT)
  // Nur geschlossene Nachweise können „noch nicht angesehen“ sein
  if (status === 'closed') query = query.is('creator_viewed_at', null)
  const { data, count, error } = await query
  if (error) throw error
  return {
    items: (data ?? []).map((r) => ({ id: r.id as string, title: r.title as string })),
    total: count ?? (data ?? []).length,
  }
}

async function loadAufgaben(db: Db, userId: string): Promise<KontoAufgaben> {
  const [drafts, running, unseen] = await Promise.all([group(db, userId, 'draft'), group(db, userId, 'open'), group(db, userId, 'closed')])

  // Abgaben der gerade laufenden Nachweise zählen
  if (running.items.length > 0) {
    const { data, error } = await db
      .from('exam_sessions')
      .select('assessment_id, status')
      .in('assessment_id', running.items.map((i) => i.id))
      .neq('status', 'in_progress')
      .limit(5000)
    if (error) throw error
    const counts = new Map<string, number>()
    for (const row of data ?? []) {
      const id = row.assessment_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    running.items = running.items.map((i) => ({ ...i, submissions: counts.get(i.id) ?? 0 }))
  }

  return { drafts, running, unseen }
}

async function loadBeitrag(db: Db, userId: string): Promise<KontoBeitrag> {
  const mine = () => db.from('content_versions').select('id', { count: 'exact', head: true }).eq('changed_by', userId)

  const [created, changes, assessments, recentRows] = await Promise.all([
    mine().eq('content_type', 'question').eq('change_type', 'created'),
    mine(),
    db.from('graded_assessments').select('id', { count: 'exact', head: true }).eq('created_by', userId),
    db
      .from('content_versions')
      .select('content_type, content_id, change_type, data, created_at')
      .eq('changed_by', userId)
      .order('created_at', { ascending: false })
      .limit(40),
  ])
  if (created.error || changes.error || assessments.error || recentRows.error) {
    throw created.error ?? changes.error ?? assessments.error ?? recentRows.error
  }

  // Pro Inhalt zählt nur der jüngste eigene Eintrag
  const seen = new Set<string>()
  const latest: RecentChange[] = []
  for (const row of recentRows.data ?? []) {
    const type = row.content_type as KontoContentType
    const key = `${type}:${row.content_id as string}`
    if (seen.has(key)) continue
    seen.add(key)
    latest.push({
      key,
      type,
      title: contentTitleFromSnapshot(type, row.data),
      deleted: row.change_type === 'deleted',
      gone: false,
      at: row.created_at as string,
    })
    if (latest.length === RECENT_LIMIT) break
  }

  // Gelöschtes: liegt es noch im Papierkorb? Sonst ist der Inhalt endgültig weg.
  const deletedIdsByType = new Map<KontoContentType, string[]>()
  for (const item of latest.filter((l) => l.deleted)) {
    const ids = deletedIdsByType.get(item.type) ?? []
    ids.push(item.key.split(':')[1])
    deletedIdsByType.set(item.type, ids)
  }
  const stillThere = new Set<string>()
  await Promise.all(
    [...deletedIdsByType.entries()].map(async ([type, ids]) => {
      const { data } = await db.from(TABLE_BY_TYPE[type]).select('id').in('id', ids)
      for (const row of data ?? []) stillThere.add(`${type}:${row.id as string}`)
    }),
  )
  for (const item of latest) {
    if (item.deleted && !stillThere.has(item.key)) item.gone = true
  }

  return {
    questionsCreated: created.count ?? 0,
    changes: changes.count ?? 0,
    assessments: assessments.count ?? 0,
    recent: latest,
  }
}

export async function loadKontoData(db: Db, user: User): Promise<KontoData | null> {
  const { data: profile } = await db
    .from('profiles')
    .select('display_name, kuerzel, role, department_id, pseudonym, leaderboard_opt_out, total_xp, current_streak')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  let departmentName: string | null = null
  if (profile.department_id) {
    const { data: dept } = await db.from('departments').select('name').eq('id', profile.department_id as string).maybeSingle()
    departmentName = (dept?.name as string | undefined) ?? null
  }

  const settle = async <T,>(label: string, run: () => Promise<T>): Promise<Section<T>> => {
    try {
      return { ok: true, data: await run() }
    } catch (err) {
      console.error(`[konto] ${label}:`, err)
      return { ok: false }
    }
  }
  const [aufgaben, beitrag] = await Promise.all([
    settle('aufgaben', () => loadAufgaben(db, user.id)),
    settle('beitrag', () => loadBeitrag(db, user.id)),
  ])

  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string | undefined]
  return {
    head: {
      displayName: (profile.display_name as string | null) ?? user.email?.split('@')[0] ?? 'Konto',
      email: user.email ?? '',
      pendingEmail: user.new_email ?? null,
      hasPassword: providers.includes('email'),
      kuerzel: (profile.kuerzel as string | null) ?? null,
      role: profile.role as TeacherRole,
      departmentName,
    },
    aufgaben,
    beitrag,
    spiel: {
      totalXp: (profile.total_xp as number | null) ?? 0,
      streak: (profile.current_streak as number | null) ?? 0,
    },
    settings: {
      pseudonym: (profile.pseudonym as string | null) ?? 'Unbekannt',
      leaderboardOptOut: (profile.leaderboard_opt_out as boolean | null) ?? false,
    },
  }
}
