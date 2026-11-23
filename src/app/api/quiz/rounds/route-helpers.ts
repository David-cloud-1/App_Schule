/**
 * PROJ-129: Gemeinsames für die Rundenwege (Anmeldung, Runden-ID, Fehler → HTTP).
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import type { RuleError } from '@/lib/quiz-round-rules'
import type { RoundLoadError } from '@/lib/quiz-round-server'

export const RoundIdSchema = z.string().uuid()

const RULE_STATUS: Record<RuleError['error'], number> = {
  bad_request: 400,
  conflict: 409,
  too_poor: 402,
  expired: 410,
}

export function errorResponse(err: RuleError | RoundLoadError): NextResponse {
  const status = 'error' in err ? RULE_STATUS[err.error] : err.status
  return NextResponse.json({ error: err.message }, { status })
}

/** Angemeldeter Nutzer + Supabase-Client, sonst 401 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { supabase, user, denied: null }
}

export async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; res: NextResponse }> {
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false, res: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  }
}

export function badRequest(details?: unknown) {
  return NextResponse.json({ error: 'Invalid request body', details }, { status: 400 })
}
