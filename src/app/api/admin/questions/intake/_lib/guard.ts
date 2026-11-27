import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertCanAdminDepartmentContent, type ContentAuthResult } from '../../../_lib/auth'
import { getDepartmentById, isDepartmentActive, type Department } from '@/lib/departments'
import { TOPIC_GONE_MESSAGE, loadIntakeTopics, type IntakeTopic } from '@/lib/question-intake-server'

type ContentAuth = Extract<ContentAuthResult, { error: null }>

export type TopicGuard =
  | { ok: true; topics: Map<string, IntakeTopic>; departments: Map<string, Department> }
  | { ok: false; response: NextResponse }

/**
 * Prüft für jedes Thema: es gibt es noch, es liegt in einem Bereich, den die
 * Person bearbeiten darf, und der Bereich ist aktiv. Ein fremdes Thema in der
 * Anfrage wird wie ein fehlendes behandelt (kein Hinweis, dass es existiert).
 */
export async function guardTopics(
  supabase: SupabaseClient,
  auth: ContentAuth,
  topicIds: string[],
): Promise<TopicGuard> {
  const topics = await loadIntakeTopics(supabase, topicIds)
  const gone = (): TopicGuard => ({
    ok: false,
    response: NextResponse.json({ error: TOPIC_GONE_MESSAGE, field: 'topic_id' }, { status: 404 }),
  })

  const departments = new Map<string, Department>()
  for (const id of new Set(topicIds)) {
    const topic = topics.get(id)
    if (!topic) return gone()
    if (assertCanAdminDepartmentContent(auth, topic.departmentId)) return gone()
    if (!departments.has(topic.departmentId)) {
      if (!(await isDepartmentActive(supabase, topic.departmentId))) {
        return { ok: false, response: NextResponse.json({ error: 'Dieser Bereich ist nicht verfügbar.' }, { status: 400 }) }
      }
      const department = await getDepartmentById(supabase, topic.departmentId)
      if (!department) return gone()
      departments.set(topic.departmentId, department)
    }
  }
  return { ok: true, topics, departments }
}
