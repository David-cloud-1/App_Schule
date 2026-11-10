/**
 * Inhalts-Baum (PROJ-85): Bereiche → Fächer → Themen mit Fragenzahlen.
 * Die Zahlen sind nach Klassenstufe aufgeteilt, damit der Klassenfilter der
 * Oberfläche nur umrechnet und nicht neu lädt.
 */

export type LevelCounts = { l10: number; l11: number; l12: number; none: number }

export type ClassFilter = 'all' | 10 | 11 | 12

export type TreeTopic = {
  id: string
  name: string
  version_number: number
  counts: LevelCounts
}

export type TreeSubject = {
  id: string
  name: string
  code: string
  is_active: boolean
  version_number: number
  counts: LevelCounts
  /** Fragen des Fachs ohne Thema */
  no_topic: LevelCounts
  topics: TreeTopic[]
}

export type TreeDepartment = {
  id: string
  name: string
  code: string
  subjects: TreeSubject[]
}

export type ContentTree = { departments: TreeDepartment[] }

export type TreeQuestionRow = {
  topic_id: string | null
  class_level: number | null
  question_subjects: { subject_id: string }[] | null
}

type SubjectInput = {
  id: string
  name: string
  code: string
  is_active: boolean
  department_id: string
  version_number: number
  departments: { id: string; name: string; code: string } | null
}

type TopicInput = { id: string; name: string; subject_id: string; version_number: number }

export function emptyCounts(): LevelCounts {
  return { l10: 0, l11: 0, l12: 0, none: 0 }
}

function bump(c: LevelCounts, level: number | null) {
  if (level === 10) c.l10++
  else if (level === 11) c.l11++
  else if (level === 12) c.l12++
  else c.none++
}

/** Zahl für den gewählten Klassenfilter; „Alle“ zählt auch Fragen ohne Stufe. */
export function countFor(c: LevelCounts, filter: ClassFilter): number {
  if (filter === 10) return c.l10
  if (filter === 11) return c.l11
  if (filter === 12) return c.l12
  return c.l10 + c.l11 + c.l12 + c.none
}

export function buildContentTree(input: {
  subjects: SubjectInput[]
  topics: TopicInput[]
  questions: TreeQuestionRow[]
}): ContentTree {
  const subjectMap = new Map<string, TreeSubject>()
  const departmentMap = new Map<string, TreeDepartment>()

  for (const s of input.subjects) {
    const dept = s.departments ?? { id: s.department_id, name: '', code: '' }
    let d = departmentMap.get(dept.id)
    if (!d) {
      d = { id: dept.id, name: dept.name, code: dept.code, subjects: [] }
      departmentMap.set(dept.id, d)
    }
    const subject: TreeSubject = {
      id: s.id,
      name: s.name,
      code: s.code,
      is_active: s.is_active,
      version_number: s.version_number,
      counts: emptyCounts(),
      no_topic: emptyCounts(),
      topics: [],
    }
    subjectMap.set(s.id, subject)
    d.subjects.push(subject)
  }

  const topicMap = new Map<string, TreeTopic>()
  for (const t of input.topics) {
    const subject = subjectMap.get(t.subject_id)
    if (!subject) continue
    const topic: TreeTopic = { id: t.id, name: t.name, version_number: t.version_number, counts: emptyCounts() }
    topicMap.set(t.id, topic)
    subject.topics.push(topic)
  }

  for (const q of input.questions) {
    const subjectIds = new Set((q.question_subjects ?? []).map((qs) => qs.subject_id))
    for (const sid of subjectIds) {
      const subject = subjectMap.get(sid)
      if (!subject) continue
      bump(subject.counts, q.class_level)
      if (!q.topic_id) bump(subject.no_topic, q.class_level)
    }
    if (q.topic_id) {
      const topic = topicMap.get(q.topic_id)
      if (topic) bump(topic.counts, q.class_level)
    }
  }

  return { departments: Array.from(departmentMap.values()) }
}

/** Ein Thema erscheint bei gesetztem Klassenfilter nur, wenn es Fragen dieser Stufe hat. */
export function topicVisible(topic: TreeTopic, filter: ClassFilter): boolean {
  return filter === 'all' || countFor(topic.counts, filter) > 0
}

/** Schlüssel des Knotens „Ohne Thema“ in der Adresse */
export const NO_TOPIC = 'ohne'

export type TreeSelection =
  | { kind: 'none' }
  | { kind: 'subject'; department: TreeDepartment; subject: TreeSubject; reason?: 'missing' | 'hidden' }
  | { kind: 'topic'; department: TreeDepartment; subject: TreeSubject; topic: TreeTopic }
  | { kind: 'notopic'; department: TreeDepartment; subject: TreeSubject }

/**
 * Löst die Auswahl aus der Adresse gegen den geladenen Baum auf. Unbekanntes
 * fällt still auf das nächste vorhandene Teil zurück (Thema → Fach → nichts),
 * ohne Fehlerbildschirm. `reason` sagt, warum ein gewünschtes Thema fehlt.
 */
export function resolveSelection(
  tree: ContentTree,
  params: { subjectId: string | null; topicId: string | null },
  filter: ClassFilter,
): TreeSelection {
  if (!params.subjectId) return { kind: 'none' }
  for (const department of tree.departments) {
    const subject = department.subjects.find((s) => s.id === params.subjectId)
    if (!subject) continue
    if (!params.topicId) return { kind: 'subject', department, subject }
    if (params.topicId === NO_TOPIC) {
      return countFor(subject.no_topic, filter) > 0
        ? { kind: 'notopic', department, subject }
        : { kind: 'subject', department, subject, reason: 'hidden' }
    }
    const topic = subject.topics.find((t) => t.id === params.topicId)
    if (!topic) return { kind: 'subject', department, subject, reason: 'missing' }
    if (!topicVisible(topic, filter)) return { kind: 'subject', department, subject, reason: 'hidden' }
    return { kind: 'topic', department, subject, topic }
  }
  return { kind: 'none' }
}
