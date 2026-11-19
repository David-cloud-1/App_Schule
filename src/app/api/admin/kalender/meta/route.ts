import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '../../_lib/auth'
import { KALENDER_ABTEILUNGEN, type AbwesenheitsArt, type KalenderIch } from '@/lib/kalender'
import { NO_STORE, callKalender } from '../_lib/kalender-api'

const ROUTE = 'api/admin/kalender/meta'

/**
 * Alles, was Kalender und Formular zum Start brauchen: wer ich bin (Planer?
 * Super-Admin?), die Arten, die Lehrkräfte für die Personensuche (nur Namen)
 * und die Abteilungen.
 */
export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error

  const [ich, arten, lehrkraefte] = await Promise.all([
    callKalender<KalenderIch>(auth.supabase, ROUTE, 'abw_ich'),
    callKalender<AbwesenheitsArt[]>(auth.supabase, ROUTE, 'abw_arten'),
    callKalender<{ id: string; name: string }[]>(auth.supabase, ROUTE, 'abw_lehrkraefte'),
  ])
  if (ich.error) return ich.error
  if (arten.error) return arten.error
  if (lehrkraefte.error) return lehrkraefte.error

  return NextResponse.json(
    {
      ich: ich.data,
      arten: (arten.data ?? []).map((a) => ({ ...a, anzahl: Number(a.anzahl) || 0 })),
      lehrkraefte: lehrkraefte.data ?? [],
      abteilungen: KALENDER_ABTEILUNGEN,
    },
    { headers: NO_STORE }
  )
}
