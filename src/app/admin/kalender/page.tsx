import { AbsenceCalendar } from '@/components/admin/absence/absence-calendar'

export const metadata = { title: 'Kalender' }

/**
 * `?vertretung=offen` kommt aus der „Zu erledigen“-Karte der Startseite (PROJ-81)
 * und öffnet den Kalender gleich mit dem Filter „Offen“.
 */
export default async function KalenderPage({ searchParams }: { searchParams: Promise<{ vertretung?: string }> }) {
  const { vertretung } = await searchParams
  return <AbsenceCalendar initialSubstitute={vertretung === 'offen' ? 'open' : undefined} />
}
