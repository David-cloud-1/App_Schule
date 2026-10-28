import { Coins } from 'lucide-react'
import { KontoCard } from '@/components/admin/konto-card'
import { KontoSectionError } from '@/components/admin/konto-section-error'
import { KontoVerbrauchAnsicht } from '@/components/admin/konto-verbrauch-ansicht'
import { AdminEmptyState } from '@/components/admin/admin-states'
import type { Section } from '@/lib/konto-data'
import { baueVerbrauch, type VerbrauchLauf } from '@/lib/werkzeugkiste-verbrauch'

/**
 * Karte „Werkzeugkiste – mein Verbrauch“ (PROJ-65): Monatssumme und die eigenen
 * Läufe der direkten Erstellung. Reine Serverkarte; nur die Monatsauswahl und
 * „Mehr anzeigen“ stecken in der Client-Komponente (ohne Icons als Prop).
 */
export function KontoVerbrauchKarte({ section, monat }: { section: Section<VerbrauchLauf[]>; monat?: string | null }) {
  const beschreibung = 'Was du mit „Direkt erstellen“ verbraucht hast. Der kostenlose Weg mit eigener KI kostet nichts.'
  if (!section.ok) {
    return (
      <KontoCard id="verbrauch" icon={Coins} title="Werkzeugkiste – mein Verbrauch" description={beschreibung}>
        <KontoSectionError />
      </KontoCard>
    )
  }
  const ansicht = baueVerbrauch(section.data, monat)
  return (
    <KontoCard id="verbrauch" icon={Coins} title="Werkzeugkiste – mein Verbrauch" description={beschreibung}>
      {!ansicht.hatVerbrauch ? (
        <AdminEmptyState
          icon={Coins}
          title="Noch nichts verbraucht"
          description="Du hast die direkte Erstellung noch nicht genutzt. Der kostenlose Weg mit deiner eigenen KI verbraucht nichts."
        />
      ) : (
        <KontoVerbrauchAnsicht ansicht={ansicht} />
      )}
    </KontoCard>
  )
}
