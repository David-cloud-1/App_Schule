import { AbsenceCalendar } from '@/components/admin/absence/absence-calendar'

export const metadata = { title: 'Abwesenheiten' }

/**
 * `?vertretung=offen` kommt aus der „Zu erledigen“-Karte der Startseite (PROJ-81)
 * und öffnet die Abwesenheiten gleich mit dem Filter „Vertretung fehlt“.
 */
export default async function KalenderPage({ searchParams }: { searchParams: Promise<{ vertretung?: string }> }) {
  const { vertretung } = await searchParams
  return <AbsenceCalendar initialSubstitute={vertretung === 'offen' ? 'open' : undefined} />
}
