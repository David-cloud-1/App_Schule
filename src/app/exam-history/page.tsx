import { redirect } from 'next/navigation'

/**
 * Der gemischte Prüfungsverlauf ist aufgeteilt (PROJ-43): Simulationen stehen
 * unter „Prüfung üben“, Leistungsnachweise im eigenen Bereich. Alte Links und
 * Lesezeichen landen bei den Simulationen.
 */
export default function ExamHistoryPage() {
  redirect('/exam#simulationen')
}
