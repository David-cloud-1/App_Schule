import { redirect } from 'next/navigation'

/** Die Code-Eingabe für Leistungsnachweise liegt jetzt im Bereich „Leistungsnachweise“ (PROJ-43). */
export default function JoinAssessmentPage() {
  redirect('/leistungsnachweise')
}
