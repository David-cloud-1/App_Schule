/**
 * „Auswertung angesehen“ (PROJ-50): Eine geschlossene Nachweis-Auswertung gilt
 * als angesehen, sobald die erstellende Person sie zum ersten Mal öffnet.
 * Andere Personen (Super-Admin, Bereichs-Admin, Kollegium) ändern daran nichts.
 */
export function shouldMarkCreatorViewed(
  assessment: { status: string; created_by: string | null; creator_viewed_at: string | null },
  userId: string,
): boolean {
  return assessment.status === 'closed' && !assessment.creator_viewed_at && assessment.created_by === userId
}
