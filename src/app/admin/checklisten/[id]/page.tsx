import { notFound } from 'next/navigation'
import { CheckListeSeite } from '@/components/checklisten/checkliste-seite'
import { findeCheckliste } from '@/lib/checklisten/listen'
import { originalFuerListe } from '@/lib/checklisten/leitlinien'

export const metadata = { title: 'Checkliste' }

/**
 * Das Original wird hier auf dem Server aus der Momentaufnahme gesetzt (PROJ-122);
 * die ganze Leitlinien-Sammlung landet nie im Browser-Paket.
 */
export default async function ChecklistePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const liste = findeCheckliste(id)
  if (!liste) notFound()
  const { originale, anker } = originalFuerListe(liste)
  return <CheckListeSeite listeId={liste.id} originale={originale} anker={anker} />
}
