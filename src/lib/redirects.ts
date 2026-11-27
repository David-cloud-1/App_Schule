/**
 * Alte Adressen des Lehrkräfte-Bereichs (PROJ-131, E2): Lesezeichen
 * funktionieren weiter. Next.js hängt vorhandene Suchbegriffe (`?q=`) an das
 * Ziel an. Die Reihenfolge zählt: Spezielleres steht zuerst. Die Weiterleitung
 * läuft vor der Rechteprüfung; geschützt bleiben die Zielseiten.
 */
const CONTENT = '/admin/inhalte'

export type LegacyRedirect = {
  source: string
  destination: string
  permanent: false
  has?: { type: 'query'; key: string; value: string }[]
}

const tabQuery = (value: string): LegacyRedirect['has'] => [{ type: 'query', key: 'tab', value }]

export const LEGACY_ADMIN_REDIRECTS: LegacyRedirect[] = [
  { source: '/admin/questions', destination: CONTENT, permanent: false },
  { source: '/admin/subjects', destination: CONTENT, permanent: false },
  { source: '/admin/topics', destination: CONTENT, permanent: false },
  { source: '/admin/gemeldete-fragen', destination: `${CONTENT}?reiter=gemeldet`, permanent: false },
  { source: '/admin/schwierigste-fragen', destination: `${CONTENT}?reiter=schwierig`, permanent: false },
  { source: '/admin/papierkorb', has: tabQuery('forum'), destination: '/admin/lehrerzimmer?papierkorb=1', permanent: false },
  {
    source: '/admin/papierkorb',
    has: tabQuery('exam_question_set'),
    destination: '/admin/exam-sets?papierkorb=1',
    permanent: false,
  },
  { source: '/admin/papierkorb', destination: `${CONTENT}?reiter=papierkorb`, permanent: false },
]
