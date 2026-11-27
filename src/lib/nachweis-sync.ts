// PROJ-134: Abgelaufene Nachweise nachziehen. Der Datenbank-Job (alle 5 Minuten)
// schließt von selbst; beim Aufruf von Liste und Detailseite wird dieselbe
// Regel zusätzlich angewendet, damit nichts auf „Offen“ hängt. Fehler hier
// dürfen die Seite nie blockieren.

import { createServiceClient } from '@/lib/supabase-server'

/** Schließt alle abgelaufenen, nicht mehr beschriebenen Nachweise. Gibt die Zahl der geschlossenen zurück. */
export async function closeExpiredAssessments(): Promise<number> {
  try {
    const { data, error } = await createServiceClient().rpc('close_expired_assessments')
    if (error) {
      // Migration PROJ-134 noch nicht eingespielt: Seite funktioniert wie bisher
      if (error.code !== 'PGRST202' && error.code !== '42883') console.error('[closeExpiredAssessments]', error.message)
      return 0
    }
    return typeof data === 'number' ? data : 0
  } catch (err) {
    console.error('[closeExpiredAssessments]', err)
    return 0
  }
}
