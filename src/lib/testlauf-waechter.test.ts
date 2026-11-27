import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * Wächtertest PROJ-134: Ein Testlauf ist eine Sitzung ohne assessment_id, aber mit
 * trial_assessment_id. Wer Sitzungen OHNE Nachweis als Übungsprüfung liest
 * (`.is('assessment_id', null)`), muss Testläufe ausdrücklich ausschließen. Wer sie
 * über assessment_id sucht, findet sie nie. Dieser Test hält die erste Regel fest.
 */
const SRC = join(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) && !name.endsWith('database.types.ts')) out.push(full)
  }
  return out
}

/** Stellen, an denen leeres assessment_id bewusst auch Testläufe trifft (Löschen, Konto) */
const ERLAUBT = new Set(['app/api/admin/users/[id]/reset-progress/route.ts'])

describe('Testläufe zählen nicht als Übungsprüfung (PROJ-134)', () => {
  it('jede Abfrage „assessment_id ist leer“ schließt Testläufe aus', () => {
    const verstoesse: string[] = []
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file).split(sep).join('/')
      if (ERLAUBT.has(rel)) continue
      const text = readFileSync(file, 'utf8')
      if (/\.is\('assessment_id',\s*null\)/.test(text) && !/trial_assessment_id/.test(text)) verstoesse.push(rel)
    }
    expect(verstoesse, `Diese Dateien lesen Sitzungen ohne Nachweis, aber schließen Testläufe nicht aus: ${verstoesse.join(', ')}`).toEqual([])
  })

  it('Übungsprüfungs-Verlauf und -Route filtern auf trial_assessment_id', () => {
    for (const rel of ['lib/exam-history.ts', 'app/api/exam/history/route.ts']) {
      expect(readFileSync(join(SRC, rel), 'utf8')).toMatch(/\.is\('trial_assessment_id',\s*null\)/)
    }
  })
})
