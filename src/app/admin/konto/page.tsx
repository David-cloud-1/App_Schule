import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { KontoSectionError } from '@/components/admin/konto-section-error'
import { KontoUeberMich } from '@/components/admin/konto-ueber-mich'
import { KontoAufgabenKarte } from '@/components/admin/konto-aufgaben'
import { KontoBeitragKarte } from '@/components/admin/konto-beitrag'
import { KontoVerbrauchKarte } from '@/components/admin/konto-verbrauch'
import { KontoFaecher } from '@/components/admin/konto-faecher'
import { KontoAnmeldung } from '@/components/admin/konto-anmeldung'
import { KontoDarstellung } from '@/components/admin/konto-darstellung'
import { KontoSpielstand } from '@/components/admin/konto-spielstand'
import { loadKontoData } from '@/lib/konto-data'
import { isTeacherRole } from '@/lib/roles'
import { DIREKT_ERSTELLEN_AKTIV } from '@/lib/werkzeugkiste'

export const metadata = { title: 'Mein Konto' }

/**
 * „Mein Konto“ (PROJ-50): das Profil für Lehrkräfte, Bereichs-Admins und den
 * Super-Admin — wer ich bin, meine Fächer, mein Beitrag, offene Aufgaben,
 * Zugangsdaten und Einstellungen. Der Spielstand ist nur ein kleiner,
 * aufklappbarer Bereich.
 */
export default async function KontoPage({ searchParams }: { searchParams: Promise<{ verbrauch?: string }> }) {
  const { verbrauch: monat } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await loadKontoData(supabase, user)
  // Rolle fehlt oder wurde entzogen: wie im übrigen Bereich zurück zur Lern-App
  if (data && !isTeacherRole(data.head.role)) redirect('/')

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Mein Konto" description="Wer du in der App bist, was auf dich wartet und wie du dich anmeldest." />

      {!data ? (
        <KontoSectionError />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <KontoUeberMich head={data.head} />
            <KontoAufgabenKarte section={data.aufgaben} />
            <KontoBeitragKarte section={data.beitrag} />
            {DIREKT_ERSTELLEN_AKTIV && <KontoVerbrauchKarte section={data.verbrauch} monat={monat} />}
          </div>
          <div className="space-y-6">
            <KontoFaecher role={data.head.role} departmentName={data.head.departmentName} />
            <KontoAnmeldung head={data.head} />
            <KontoDarstellung settings={data.settings} />
            <KontoSpielstand spiel={data.spiel} />
          </div>
        </div>
      )}
    </div>
  )
}
