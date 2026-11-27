/**
 * PROJ-132: Server-Bausteine für „Fragen hinzufügen“ – Thema samt Fach und
 * Bereich laden und vorhandene Fragen des Themas lesen (für Duplikate und den
 * Stufen-Vorschlag).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface IntakeTopic {
  id: string
  name: string
  subjectId: string
  subjectName: string
  subjectCode: string
  departmentId: string
  /** Fragetexte, die es im Thema schon gibt (ohne Papierkorb) */
  existingTexts: string[]
  /** Stufen der vorhandenen Fragen */
  existingLevels: (number | null)[]
}

const PAGE = 1000
const MAX_PAGES = 20

/**
 * Lädt Themen mit Fach und Bereich. Gelöschte Themen und Fächer fehlen im
 * Ergebnis, der Aufrufer meldet dann „Das Thema gibt es nicht mehr“.
 */
export async function loadIntakeTopics(supabase: SupabaseClient, topicIds: string[]): Promise<Map<string, IntakeTopic>> {
  const result = new Map<string, IntakeTopic>()
  const ids = [...new Set(topicIds)]
  if (ids.length === 0) return result

  const { data: topics, error: topicErr } = await supabase
    .from('topics')
    .select('id, name, subject_id')
    .in('id', ids)
    .is('deleted_at', null)
    .limit(ids.length)
  if (topicErr) throw topicErr
  const topicRows = (topics ?? []) as { id: string; name: string; subject_id: string }[]

  const subjectIds = [...new Set(topicRows.map((t) => t.subject_id))]
  if (subjectIds.length === 0) return result
  const { data: subjects, error: subjectErr } = await supabase
    .from('subjects')
    .select('id, name, code, department_id')
    .in('id', subjectIds)
    .is('deleted_at', null)
    .limit(subjectIds.length)
  if (subjectErr) throw subjectErr
  const subjectById = new Map(
    ((subjects ?? []) as { id: string; name: string; code: string; department_id: string }[]).map((s) => [s.id, s]),
  )

  for (const t of topicRows) {
    const subject = subjectById.get(t.subject_id)
    if (!subject) continue
    result.set(t.id, {
      id: t.id,
      name: t.name,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      departmentId: subject.department_id,
      existingTexts: [],
      existingLevels: [],
    })
  }

  const liveIds = [...result.keys()]
  if (liveIds.length === 0) return result
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('questions')
      .select('topic_id, question_text, class_level')
      .in('topic_id', liveIds)
      .is('deleted_at', null)
      .order('id')
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as { topic_id: string; question_text: string; class_level: number | null }[]
    for (const row of rows) {
      const topic = result.get(row.topic_id)
      if (!topic) continue
      topic.existingTexts.push(row.question_text)
      topic.existingLevels.push(row.class_level)
    }
    if (rows.length < PAGE) break
  }
  return result
}

/** „LOP › Lagerlogistik“ */
export function topicLabel(topic: Pick<IntakeTopic, 'subjectCode' | 'name'>): string {
  return `${topic.subjectCode} › ${topic.name}`
}

export const TOPIC_GONE_MESSAGE = 'Das Thema gibt es nicht mehr. Bitte wähle ein anderes.'
