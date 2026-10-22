import { cookies } from 'next/headers'
import { CLASS_LEVEL_COOKIE, parseClassLevel } from '@/lib/learn-library'

/** Gemerkte Klassenstufe des Geräts (PROJ-43); null = „Alle“ */
export async function getSelectedClassLevel(allowed: number[]): Promise<number | null> {
  return parseClassLevel((await cookies()).get(CLASS_LEVEL_COOKIE)?.value, allowed)
}
