/**
 * Kennzahlen für den Spielspaß der Lern-App.
 *
 * Reine Rechenlogik ohne Datenbankzugriff — geladen wird in
 * `scripts/engagement/audit.ts`, damit die Formeln hier testbar bleiben.
 *
 * Leitgedanke: Spaß ist nicht direkt messbar, wiederkehrendes Verhalten schon.
 * Jede Kennzahl hier beantwortet eine von vier Fragen:
 *   1. Kommen die Azubis überhaupt an?      (Aktivierung)
 *   2. Kommen sie wieder?                   (Wiederkehr, Gewohnheit)
 *   3. Macht die Session selbst Freude?     (Flow, freiwillige Verlängerung)
 *   4. Wirken die Anreize noch?             (Badges, Rangliste, Prüfung)
 *
 * Wichtig, analog zur Fragen-Qualität: Ein Wert kann auch zu HOCH schlecht
 * sein. Eine Trefferquote von 95 % heißt nicht „gut gelernt", sondern
 * „zu leicht, langweilig". Deshalb hat jede Kennzahl einen Korridor.
 */

export interface ProfileRow {
  id: string
  role: string | null
  created_at: string
  current_streak: number | null
  longest_streak: number | null
  total_xp: number | null
  last_session_date: string | null
  leaderboard_opt_out: boolean | null
}

export interface SessionRow {
  user_id: string
  subject_id: string | null
  score: number | null
  total: number | null
  completed_at: string
}

export interface AnswerRow {
  user_id: string
  session_id: string
  is_correct: boolean | null
  answered_at: string
}

export interface BadgeRow {
  id: string
  name: string
}

export interface UserBadgeRow {
  user_id: string
  badge_id: string
}

export interface ExamSessionRow {
  user_id: string
  status: string | null
}

export interface SubjectRow {
  id: string
  name: string
}

export interface EngagementInput {
  profiles: ProfileRow[]
  sessions: SessionRow[]
  answers: AnswerRow[]
  badges: BadgeRow[]
  userBadges: UserBadgeRow[]
  examSessions: ExamSessionRow[]
  subjects: SubjectRow[]
  /** Referenzzeitpunkt — als Parameter, damit Tests nicht von „heute" abhängen. */
  now: Date
}

export type Verdict = 'ok' | 'schwach' | 'kritisch' | 'zu hoch' | 'zu wenig daten'

export interface Metric {
  key: string
  group: string
  label: string
  /** Roher Wert: Anteil 0..1 bei kind 'share', sonst eine absolute Zahl. */
  value: number
  kind: 'share' | 'count'
  /** Zähler/Nenner, soweit die Kennzahl eine Quote ist. */
  hits?: number
  base?: number
  target: string
  verdict: Verdict
  /** Was die Zahl bedeutet — wandert unverändert in den Bericht. */
  note: string
}

export interface EngagementReport {
  generatedAt: string
  users: { profiles: number; activated: number; excludedAdmins: number }
  metrics: Metric[]
  streakHistogram: { bucket: string; users: number }[]
  badgeUsage: { name: string; holders: number; share: number }[]
  subjectUsage: { name: string; sessions: number; share: number }[]
  hourHistogram: { hour: number; sessions: number }[]
  /** Nutzer, die aktiv waren und dann verschwunden sind — Kandidaten zum Nachfragen. */
  lapsed: { userId: string; sessions: number; daysSinceLast: number; longestStreak: number }[]
}

/** Tagesstempel in Europe/Berlin — dieselbe Grenze, nach der die App Streaks zählt. */
export function berlinDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Berlin' }).format(d)
}

/** Stunde in Europe/Berlin, für das Tageszeit-Histogramm. */
export function berlinHour(iso: string): number {
  // 'sv' + hourCycle h23 liefert reine Ziffern ("00".."23"); das deutsche
  // Format hängt ein " Uhr" an und ergäbe NaN.
  return Number(
    new Intl.DateTimeFormat('sv', {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso))
  )
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000)
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Mindestgröße, ab der eine Quote überhaupt etwas aussagt. */
const MIN_BASE = 8

interface ShareSpec {
  key: string
  group: string
  label: string
  hits: number
  base: number
  /** Untergrenze des guten Korridors (Anteil 0..1). */
  min?: number
  /** Obergrenze — gesetzt, wo „mehr" nicht besser ist. */
  max?: number
  /** Ab welchem Abstand zur Untergrenze es kritisch statt schwach heißt. */
  critical?: number
  target: string
  note: string
  minBase?: number
}

function shareMetric(spec: ShareSpec): Metric {
  const base = spec.base
  const value = base > 0 ? spec.hits / base : 0
  let verdict: Verdict = 'ok'
  if (base < (spec.minBase ?? MIN_BASE)) {
    verdict = 'zu wenig daten'
  } else if (spec.max !== undefined && value > spec.max) {
    verdict = 'zu hoch'
  } else if (spec.min !== undefined && value < spec.min) {
    verdict = spec.critical !== undefined && value < spec.critical ? 'kritisch' : 'schwach'
  }
  return {
    key: spec.key,
    group: spec.group,
    label: spec.label,
    value,
    kind: 'share',
    hits: spec.hits,
    base,
    target: spec.target,
    verdict,
    note: spec.note,
  }
}

function countMetric(spec: {
  key: string
  group: string
  label: string
  value: number
  min?: number
  max?: number
  critical?: number
  target: string
  note: string
  enoughData?: boolean
}): Metric {
  let verdict: Verdict = 'ok'
  if (spec.enoughData === false) verdict = 'zu wenig daten'
  else if (spec.max !== undefined && spec.value > spec.max) verdict = 'zu hoch'
  else if (spec.min !== undefined && spec.value < spec.min)
    verdict = spec.critical !== undefined && spec.value < spec.critical ? 'kritisch' : 'schwach'
  return {
    key: spec.key,
    group: spec.group,
    label: spec.label,
    value: spec.value,
    kind: 'count',
    target: spec.target,
    verdict,
    note: spec.note,
  }
}

export function analyzeEngagement(input: EngagementInput): EngagementReport {
  const { now } = input
  const today = berlinDay(now)

  const profiles = input.profiles
  const profileIds = new Set(profiles.map((p) => p.id))
  const sessions = input.sessions.filter((s) => profileIds.has(s.user_id))
  const answers = input.answers.filter((a) => profileIds.has(a.user_id))

  // Aktive Tage je Nutzer — Grundlage für Wiederkehr, Gewohnheit und Streak-Brüche.
  const daysByUser = new Map<string, Set<string>>()
  const sessionsByUser = new Map<string, SessionRow[]>()
  for (const s of sessions) {
    const day = berlinDay(s.completed_at)
    if (!daysByUser.has(s.user_id)) daysByUser.set(s.user_id, new Set())
    daysByUser.get(s.user_id)!.add(day)
    if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, [])
    sessionsByUser.get(s.user_id)!.push(s)
  }
  const activated = [...daysByUser.keys()]
  const sortedDays = new Map<string, string[]>()
  for (const [u, set] of daysByUser) sortedDays.set(u, [...set].sort())

  const metrics: Metric[] = []

  // ── 1. Ankommen ────────────────────────────────────────────────────────────
  metrics.push(
    shareMetric({
      key: 'activation',
      group: 'Ankommen',
      label: 'Registriert und losgelegt',
      hits: activated.length,
      base: profiles.length,
      min: 0.8,
      critical: 0.6,
      target: '≥ 80 % starten mindestens eine Session',
      note: 'Wer sich anmeldet und nie spielt, ist am Einstieg verloren gegangen — nicht am Inhalt.',
    })
  )

  // Faire Basis: nur Nutzer, deren erster Tag lange genug zurückliegt, um
  // wiederkommen zu KÖNNEN. Sonst zählen Neuanmeldungen von gestern als Abbruch.
  const matureUsers = activated.filter((u) => daysBetween(sortedDays.get(u)![0], today) >= 7)
  const secondDay = matureUsers.filter((u) => sortedDays.get(u)!.length >= 2)
  metrics.push(
    shareMetric({
      key: 'second_day',
      group: 'Ankommen',
      label: 'Zweiter Tag erreicht',
      hits: secondDay.length,
      base: matureUsers.length,
      min: 0.5,
      critical: 0.3,
      target: '≥ 50 % kommen an einem zweiten Tag wieder',
      note: 'Die härteste Zahl der App. Ein einziger Besuch heißt: nichts hat zum Wiederkommen gereizt.',
    })
  )

  const week1Habit = matureUsers.filter((u) => {
    const days = sortedDays.get(u)!
    const start = days[0]
    return days.filter((d) => daysBetween(start, d) < 7).length >= 3
  })
  metrics.push(
    shareMetric({
      key: 'week1_habit',
      group: 'Ankommen',
      label: 'Drei Tage in der ersten Woche',
      hits: week1Habit.length,
      base: matureUsers.length,
      min: 0.3,
      critical: 0.15,
      target: '≥ 30 % lernen in Woche 1 an drei Tagen',
      note: 'Die erste Woche entscheidet über die Gewohnheit. Wer hier dreimal da war, bleibt meist.',
    })
  )

  // ── 2. Wiederkommen ────────────────────────────────────────────────────────
  const active7 = activated.filter((u) => daysBetween(sortedDays.get(u)!.at(-1)!, today) <= 7)
  metrics.push(
    shareMetric({
      key: 'active_7d',
      group: 'Wiederkommen',
      label: 'In den letzten 7 Tagen aktiv',
      hits: active7.length,
      base: activated.length,
      min: 0.5,
      critical: 0.25,
      target: '≥ 50 % der Aktivierten waren diese Woche da',
      note: 'PRD-Ziel: 70 % nutzen die App mindestens dreimal pro Woche.',
    })
  )

  const last28 = addDays(today, -27)
  const activeIn28 = activated.filter((u) => sortedDays.get(u)!.some((d) => d >= last28))
  const stickiness =
    activeIn28.length > 0
      ? activeIn28.reduce((sum, u) => sum + sortedDays.get(u)!.filter((d) => d >= last28).length, 0) /
        (activeIn28.length * 28)
      : 0
  metrics.push(
    countMetric({
      key: 'stickiness',
      group: 'Wiederkommen',
      label: 'Klebrigkeit (aktive Tage je Monat)',
      value: Number((stickiness * 28).toFixed(1)),
      min: 6,
      critical: 3,
      target: '≥ 6 von 28 Tagen je aktivem Nutzer',
      note: 'Duolingos Kernzahl (DAU/MAU). Unter 3 Tagen im Monat ist die App eine Gelegenheits-App, keine Gewohnheit.',
      enoughData: activeIn28.length >= MIN_BASE,
    })
  )

  const lapsedUsers = activated.filter((u) => daysBetween(sortedDays.get(u)!.at(-1)!, today) > 28)
  metrics.push(
    shareMetric({
      key: 'lapsed_28d',
      group: 'Wiederkommen',
      label: 'Seit über 28 Tagen verschwunden',
      hits: lapsedUsers.length,
      base: activated.length,
      max: 0.3,
      target: '≤ 30 % der Aktivierten',
      note: 'Abwanderung. Steigt diese Zahl, während die Fragenqualität stabil ist, fehlt der Grund zurückzukommen.',
    })
  )

  // Hat die App den Klassenraum verlassen? Sessions zwischen 8 und 14 Uhr
  // fallen in die Schulzeit — dort lernt niemand aus eigenem Antrieb.
  const outsideSchool = sessions.filter((s) => {
    const h = berlinHour(s.completed_at)
    return h < 8 || h >= 14
  }).length
  metrics.push(
    shareMetric({
      key: 'after_school',
      group: 'Wiederkommen',
      label: 'Sessions außerhalb der Schulzeit',
      hits: outsideSchool,
      base: sessions.length,
      min: 0.4,
      critical: 0.2,
      target: '≥ 40 % der Sessions vor 8 oder nach 14 Uhr',
      note: 'Läuft die App nur im Unterricht, gehört sie dem Stundenplan und nicht dem Azubi. Erst die private Runde am Nachmittag ist eine Gewohnheit, die die Ferien übersteht.',
      minBase: 30,
    })
  )

  // ── 3. Gewohnheit ──────────────────────────────────────────────────────────
  const profileById = new Map(profiles.map((p) => [p.id, p]))
  const streak3 = activated.filter((u) => (profileById.get(u)?.longest_streak ?? 0) >= 3)
  metrics.push(
    shareMetric({
      key: 'streak_3plus',
      group: 'Gewohnheit',
      label: 'Hat je 3 Tage am Stück geschafft',
      hits: streak3.length,
      base: activated.length,
      min: 0.4,
      critical: 0.2,
      target: '≥ 40 % erreichen einmal Streak 3',
      note: 'Der Streak ist der stärkste Wiederkehr-Anker der App. Greift er nicht, ist er entweder unsichtbar oder zu leicht zu verlieren.',
    })
  )

  // Streak-Bruch: Lücke von mehr als einem Tag nach mindestens zwei Tagen in Folge.
  // Gezählt werden nur Brüche, die lange genug zurückliegen, um eine Rückkehr zu erlauben.
  let breaks = 0
  let recovered = 0
  for (const u of activated) {
    const days = sortedDays.get(u)!
    let run = 1
    for (let i = 1; i < days.length; i++) {
      const gap = daysBetween(days[i - 1], days[i])
      if (gap === 1) {
        run++
        continue
      }
      if (run >= 2 && daysBetween(days[i - 1], today) >= 7) {
        breaks++
        if (gap <= 7) recovered++
      }
      run = 1
    }
    // Offener Bruch am Ende: Lauf abgerissen, seither nichts mehr.
    if (run >= 2 && daysBetween(days.at(-1)!, today) >= 7) breaks++
  }
  metrics.push(
    shareMetric({
      key: 'streak_recovery',
      group: 'Gewohnheit',
      label: 'Rückkehr nach Streak-Bruch',
      hits: recovered,
      base: breaks,
      min: 0.5,
      critical: 0.25,
      target: '≥ 50 % kommen binnen 7 Tagen zurück',
      note: 'Duolingo fängt genau hier ab (Streak-Reparatur, Freeze, Erinnerung). Ohne Auffangnetz ist ein Bruch endgültig.',
    })
  )

  // ── 4. In der Session ──────────────────────────────────────────────────────
  const answersBySession = new Map<string, AnswerRow[]>()
  for (const a of answers) {
    if (!answersBySession.has(a.session_id)) answersBySession.set(a.session_id, [])
    answersBySession.get(a.session_id)!.push(a)
  }
  const depth = median([...answersBySession.values()].map((v) => v.length))
  metrics.push(
    countMetric({
      key: 'session_depth',
      group: 'Session',
      label: 'Fragen je Session (Median)',
      value: depth,
      min: 8,
      critical: 5,
      target: '≥ 8 Fragen',
      note: 'Kurze Sessions sind gewollt — aber unter 5 Fragen brechen die Azubis eher ab, als dass sie fertig werden.',
      enoughData: answersBySession.size >= MIN_BASE,
    })
  )

  const correct = answers.filter((a) => a.is_correct).length
  metrics.push(
    shareMetric({
      key: 'accuracy',
      group: 'Session',
      label: 'Trefferquote gesamt',
      hits: correct,
      base: answers.length,
      min: 0.65,
      max: 0.85,
      critical: 0.5,
      target: '65–85 % — der Flow-Korridor',
      note: 'Unter 65 % frustriert, über 85 % langweilt. Beides kostet Spaß, nur aus entgegengesetzter Richtung.',
      minBase: 50,
    })
  )

  // Erste Session je Nutzer: entscheidet, ob jemand die App als machbar erlebt.
  const firstSessionAnswers: AnswerRow[] = []
  for (const [u, list] of sessionsByUser) {
    const first = [...list].sort((a, b) => a.completed_at.localeCompare(b.completed_at))[0]
    if (!first) continue
    const day = berlinDay(first.completed_at)
    firstSessionAnswers.push(...answers.filter((a) => a.user_id === u && berlinDay(a.answered_at) === day))
  }
  metrics.push(
    shareMetric({
      key: 'first_day_accuracy',
      group: 'Session',
      label: 'Trefferquote am ersten Tag',
      hits: firstSessionAnswers.filter((a) => a.is_correct).length,
      base: firstSessionAnswers.length,
      min: 0.6,
      max: 0.9,
      critical: 0.45,
      target: '60–90 % beim ersten Kontakt',
      note: 'Der erste Eindruck muss ein Erfolgserlebnis sein. Wer beim Einstieg durchfällt, kommt selten wieder.',
      minBase: 30,
    })
  )

  // Freiwillige Verlängerung: an einem Tag mehr als eine Session — das stärkste
  // Spaß-Signal, das sich aus reinen Nutzungsdaten ablesen lässt.
  const userDayCounts = new Map<string, number>()
  for (const s of sessions) {
    const k = `${s.user_id}|${berlinDay(s.completed_at)}`
    userDayCounts.set(k, (userDayCounts.get(k) ?? 0) + 1)
  }
  const multiDays = [...userDayCounts.values()].filter((n) => n >= 2).length
  metrics.push(
    shareMetric({
      key: 'voluntary_extra',
      group: 'Session',
      label: 'Lerntage mit mehr als einer Runde',
      hits: multiDays,
      base: userDayCounts.size,
      min: 0.25,
      critical: 0.1,
      target: '≥ 25 % der Lerntage',
      note: 'Niemand muss eine zweite Runde spielen. Wer es tut, hatte Spaß — das ist der ehrlichste Indikator im Datensatz.',
    })
  )

  // Rückkehrtag: erster Lerntag nach einer Pause von mindestens 7 Tagen.
  // Hier entscheidet sich, ob eine Rückkehr hält — wer beim Wiedereinstieg
  // durchfällt, geht endgültig.
  const answersByUserDay = new Map<string, { correct: number; total: number }>()
  for (const a of answers) {
    const k = `${a.user_id}|${berlinDay(a.answered_at)}`
    const cur = answersByUserDay.get(k) ?? { correct: 0, total: 0 }
    cur.total++
    if (a.is_correct) cur.correct++
    answersByUserDay.set(k, cur)
  }
  let returnCorrect = 0
  let returnTotal = 0
  for (const u of activated) {
    const days = sortedDays.get(u)!
    for (let i = 1; i < days.length; i++) {
      if (daysBetween(days[i - 1], days[i]) < 7) continue
      const stat = answersByUserDay.get(`${u}|${days[i]}`)
      if (!stat) continue
      returnCorrect += stat.correct
      returnTotal += stat.total
    }
  }
  metrics.push(
    shareMetric({
      key: 'return_day_accuracy',
      group: 'Session',
      label: 'Trefferquote am Rückkehrtag',
      hits: returnCorrect,
      base: returnTotal,
      min: 0.6,
      max: 0.9,
      critical: 0.45,
      target: '60–90 % nach einer Pause von 7+ Tagen',
      note: 'Wer nach langer Pause zurückkommt, hat vergessen — trifft aber auf denselben Schwierigkeitsgrad wie vorher. Fällt die Quote unter den Flow-Korridor, endet jede Rückkehr in einem Misserfolg.',
      minBase: 30,
    })
  )

  // ── 5. Anreize ─────────────────────────────────────────────────────────────
  const holdersByBadge = new Map<string, Set<string>>()
  for (const ub of input.userBadges) {
    if (!profileIds.has(ub.user_id)) continue
    if (!holdersByBadge.has(ub.badge_id)) holdersByBadge.set(ub.badge_id, new Set())
    holdersByBadge.get(ub.badge_id)!.add(ub.user_id)
  }
  const badgeUsage = input.badges
    .map((b) => {
      const holders = holdersByBadge.get(b.id)?.size ?? 0
      return { name: b.name, holders, share: activated.length ? holders / activated.length : 0 }
    })
    .sort((a, b) => b.holders - a.holders)
  const deadBadges = badgeUsage.filter((b) => b.holders === 0)
  metrics.push(
    countMetric({
      key: 'dead_badges',
      group: 'Anreize',
      label: 'Badges, die niemand hat',
      value: deadBadges.length,
      max: 0,
      target: '0 von ' + input.badges.length,
      note: 'Ein Badge, das nie jemand bekommt, motiviert nicht — es dekoriert nur die Galerie. Entweder erreichbar machen oder ersetzen.',
    })
  )

  const optOut = profiles.filter((p) => p.leaderboard_opt_out).length
  metrics.push(
    shareMetric({
      key: 'leaderboard_optout',
      group: 'Anreize',
      label: 'Rangliste abgeschaltet',
      hits: optOut,
      base: profiles.length,
      max: 0.25,
      target: '≤ 25 %',
      note: 'Hoher Wert heißt: der Wettbewerb schreckt ab statt anzuspornen — dann braucht es Ligen oder kleinere Gruppen statt einer Gesamtliste.',
    })
  )

  const exams = input.examSessions.filter((e) => profileIds.has(e.user_id))
  metrics.push(
    shareMetric({
      key: 'exam_completion',
      group: 'Anreize',
      label: 'Prüfungssimulation zu Ende gespielt',
      hits: exams.filter((e) => e.status === 'completed').length,
      base: exams.length,
      min: 0.6,
      critical: 0.4,
      target: '≥ 60 % der gestarteten Prüfungen',
      note: 'Abgebrochene Prüfungen sind teuer erkaufte Frustration — die Länge oder der Einstiegszeitpunkt passt dann nicht.',
    })
  )

  const sessionsBySubject = new Map<string, number>()
  for (const s of sessions) {
    if (!s.subject_id) continue
    sessionsBySubject.set(s.subject_id, (sessionsBySubject.get(s.subject_id) ?? 0) + 1)
  }
  const subjectUsage = input.subjects
    .map((s) => ({
      name: s.name,
      sessions: sessionsBySubject.get(s.id) ?? 0,
      share: sessions.length ? (sessionsBySubject.get(s.id) ?? 0) / sessions.length : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
  metrics.push(
    countMetric({
      key: 'ignored_subjects',
      group: 'Anreize',
      label: 'Fächer ohne jede Session',
      value: subjectUsage.filter((s) => s.sessions === 0).length,
      max: 0,
      target: '0 von ' + input.subjects.length,
      note: 'Ein gemiedenes Fach ist selten uninteressant — meist ist es zu schwer, zu trocken oder im Menü zu versteckt.',
    })
  )

  // ── Anhänge ────────────────────────────────────────────────────────────────
  const buckets: { bucket: string; test: (n: number) => boolean }[] = [
    { bucket: '0 Tage', test: (n) => n === 0 },
    { bucket: '1 Tag', test: (n) => n === 1 },
    { bucket: '2 Tage', test: (n) => n === 2 },
    { bucket: '3–6 Tage', test: (n) => n >= 3 && n <= 6 },
    { bucket: '7–13 Tage', test: (n) => n >= 7 && n <= 13 },
    { bucket: '14+ Tage', test: (n) => n >= 14 },
  ]
  const streakHistogram = buckets.map((b) => ({
    bucket: b.bucket,
    users: activated.filter((u) => b.test(profileById.get(u)?.longest_streak ?? 0)).length,
  }))

  const hourCounts = new Array(24).fill(0) as number[]
  for (const s of sessions) hourCounts[berlinHour(s.completed_at)]++
  const hourHistogram = hourCounts.map((sessions, hour) => ({ hour, sessions }))

  const lapsed = lapsedUsers
    .map((u) => ({
      userId: u,
      sessions: sessionsByUser.get(u)?.length ?? 0,
      daysSinceLast: daysBetween(sortedDays.get(u)!.at(-1)!, today),
      longestStreak: profileById.get(u)?.longest_streak ?? 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10)

  return {
    generatedAt: now.toISOString(),
    users: { profiles: profiles.length, activated: activated.length, excludedAdmins: 0 },
    metrics,
    streakHistogram,
    badgeUsage,
    subjectUsage,
    hourHistogram,
    lapsed,
  }
}
