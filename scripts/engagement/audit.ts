/**
 * Spielspaß-Audit über die tatsächliche Nutzung.
 *
 *   node scripts/engagement/audit.ts                Gesamtreport
 *   node scripts/engagement/audit.ts --save         Snapshot + Trend gegen den letzten Lauf
 *   node scripts/engagement/audit.ts --json         maschinenlesbar
 *   node scripts/engagement/audit.ts --mit-admins   Admin-/Testkonten mitzählen
 *   node scripts/engagement/audit.ts --nutzer <id>  Verlauf eines einzelnen Nutzers
 *
 * Standardmäßig fließen nur Rollen 'student' ein: Admin- und Testkonten üben die
 * App mit hunderten Sessions und würden jede Wiederkehr-Quote schönrechnen.
 */
import fs from 'node:fs'
import path from 'node:path'
import { db, loadAll, arg, has } from '../lib/db.ts'
import {
  analyzeEngagement,
  berlinDay,
  type ProfileRow,
  type SessionRow,
  type AnswerRow,
  type BadgeRow,
  type UserBadgeRow,
  type ExamSessionRow,
  type SubjectRow,
  type Metric,
} from '../../src/lib/engagement-metrics.ts'

const HISTORY = path.resolve(import.meta.dirname, 'history')

function fmt(m: Metric): string {
  return m.kind === 'share'
    ? `${(m.value * 100).toFixed(1).padStart(5)} %`
    : String(m.value).padStart(7)
}

function mark(m: Metric): string {
  return { ok: '  ok', schwach: '  SCHWACH', kritisch: '  KRITISCH', 'zu hoch': '  ZU HOCH', 'zu wenig daten': '  (dünne daten)' }[
    m.verdict
  ]
}

function bar(share: number, width = 24): string {
  const n = Math.round(share * width)
  return '█'.repeat(n) + '·'.repeat(width - n)
}

async function load() {
  const supabase = db()
  const [profiles, sessions, answers, badges, userBadges, examSessions, subjects] = await Promise.all([
    loadAll<ProfileRow & { role: string }>(
      supabase,
      'profiles',
      'id, role, created_at, current_streak, longest_streak, total_xp, last_session_date, leaderboard_opt_out'
    ),
    loadAll<SessionRow>(supabase, 'quiz_sessions', 'user_id, subject_id, score, total, completed_at'),
    loadAll<AnswerRow>(supabase, 'quiz_answers', 'user_id, session_id, is_correct, answered_at'),
    loadAll<BadgeRow>(supabase, 'badges', 'id, name'),
    loadAll<UserBadgeRow>(supabase, 'user_badges', 'user_id, badge_id'),
    loadAll<ExamSessionRow>(supabase, 'exam_sessions', 'user_id, status'),
    loadAll<SubjectRow>(supabase, 'subjects', 'id, name'),
  ])
  return { profiles, sessions, answers, badges, userBadges, examSessions, subjects }
}

function printReport(report: ReturnType<typeof analyzeEngagement>, excluded: number) {
  const u = report.users
  console.log(
    `\n  Nutzung: ${u.activated} von ${u.profiles} Konten haben je gespielt` +
      (excluded ? `  (${excluded} Admin-/Testkonten ausgeklammert)` : '')
  )
  console.log('  Stand: ' + berlinDay(new Date(report.generatedAt)) + '\n')

  let group = ''
  for (const m of report.metrics) {
    if (m.group !== group) {
      group = m.group
      console.log(`  ${group}`)
      console.log('  ' + '─'.repeat(88))
    }
    const basis = m.base !== undefined ? `${m.hits} / ${m.base}` : ''
    console.log(
      `   ${m.label.padEnd(36)}${fmt(m)}  ${m.target.padEnd(30)}${mark(m)}` +
        (basis ? `\n   ${''.padEnd(36)}${basis.padStart(7)}` : '')
    )
  }

  console.log('\n  Streak-Bestleistung je Nutzer')
  const maxStreak = Math.max(...report.streakHistogram.map((b) => b.users), 1)
  for (const b of report.streakHistogram) {
    console.log(`   ${b.bucket.padEnd(12)}${String(b.users).padStart(4)}  ${bar(b.users / maxStreak)}`)
  }

  console.log('\n  Badges — wer besitzt sie')
  for (const b of report.badgeUsage) {
    console.log(
      `   ${b.name.padEnd(28)}${String(b.holders).padStart(4)}  ${(b.share * 100).toFixed(0).padStart(3)} %  ${bar(b.share, 16)}` +
        (b.holders === 0 ? '  ← toter Anreiz' : '')
    )
  }

  console.log('\n  Fächer — wohin die Sessions gehen')
  for (const s of report.subjectUsage) {
    console.log(
      `   ${s.name.slice(0, 44).padEnd(46)}${String(s.sessions).padStart(5)}  ${(s.share * 100).toFixed(0).padStart(3)} %  ${bar(s.share, 16)}`
    )
  }

  console.log('\n  Tageszeit der Sessions (Europe/Berlin) — Fenster für Erinnerungen')
  const maxHour = Math.max(...report.hourHistogram.map((h) => h.sessions), 1)
  for (const h of report.hourHistogram) {
    if (h.sessions === 0) continue
    console.log(`   ${String(h.hour).padStart(2)} Uhr ${String(h.sessions).padStart(5)}  ${bar(h.sessions / maxHour, 30)}`)
  }

  if (report.lapsed.length) {
    console.log('\n  Verschwunden, obwohl sie dabei waren (Top 10 nach Sessions)')
    for (const l of report.lapsed) {
      console.log(
        `   ${l.userId.slice(0, 8)}…  ${String(l.sessions).padStart(4)} Sessions   letzte vor ${String(l.daysSinceLast).padStart(3)} Tagen   bester Streak ${l.longestStreak}`
      )
    }
  }
  console.log('')
}

function saveSnapshot(report: ReturnType<typeof analyzeEngagement>) {
  fs.mkdirSync(HISTORY, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const files = fs.readdirSync(HISTORY).filter((f) => f.endsWith('.json')).sort()
  const previous = files.length
    ? (JSON.parse(fs.readFileSync(path.join(HISTORY, files.at(-1)!), 'utf8')) as {
        metrics: { key: string; value: number; kind: string }[]
      })
    : null

  fs.writeFileSync(path.join(HISTORY, `${stamp}.json`), JSON.stringify(report, null, 2))

  if (previous) {
    console.log(`  Trend gegen ${files.at(-1)}:`)
    for (const m of report.metrics) {
      const before = previous.metrics.find((p) => p.key === m.key)?.value
      if (before === undefined) continue
      const delta = m.kind === 'share' ? (m.value - before) * 100 : m.value - before
      const unit = m.kind === 'share' ? ' Punkte' : ''
      const text =
        Math.abs(delta) < (m.kind === 'share' ? 0.1 : 0.05)
          ? 'unverändert'
          : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}${unit}`
      console.log(`    ${m.label.padEnd(36)} ${text}`)
    }
    console.log('')
  }
  console.log(`  Snapshot gespeichert: scripts/engagement/history/${stamp}.json\n`)
}

/** Einzelverlauf — für die Frage „was hat dieser Azubi erlebt, bevor er wegblieb?". */
function printUser(userId: string, data: Awaited<ReturnType<typeof load>>) {
  const sessions = data.sessions
    .filter((s) => s.user_id === userId)
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at))
  const profile = data.profiles.find((p) => p.id === userId)
  if (!profile) {
    console.log(`\n  Kein Profil mit der ID ${userId}\n`)
    return
  }
  console.log(`\n  Nutzer ${userId}  (${profile.role})`)
  console.log(
    `  angemeldet ${berlinDay(profile.created_at)}, ${sessions.length} Sessions, ` +
      `${profile.total_xp ?? 0} XP, Streak ${profile.current_streak ?? 0} (best ${profile.longest_streak ?? 0})\n`
  )
  let prevDay: string | null = null
  for (const s of sessions) {
    const day = berlinDay(s.completed_at)
    const gap = prevDay && day !== prevDay ? ` (+${Math.round((Date.parse(day) - Date.parse(prevDay)) / 86_400_000)} Tage)` : ''
    const quote = s.total ? Math.round(((s.score ?? 0) / s.total) * 100) : 0
    console.log(`   ${day}${gap.padEnd(14)} ${String(s.score ?? 0).padStart(2)}/${String(s.total ?? 0).padEnd(2)}  ${String(quote).padStart(3)} %`)
    prevDay = day
  }
  console.log('')
}

const data = await load()
const single = arg('nutzer')
if (single) {
  printUser(single, data)
} else {
  const includeAdmins = has('mit-admins')
  const all = data.profiles.length
  const profiles = includeAdmins ? data.profiles : data.profiles.filter((p) => p.role === 'student')
  const report = analyzeEngagement({ ...data, profiles, now: new Date() })
  report.users.excludedAdmins = all - profiles.length

  if (has('json')) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report, report.users.excludedAdmins)
    if (has('save')) saveSnapshot(report)
  }
}
