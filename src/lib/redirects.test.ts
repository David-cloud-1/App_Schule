import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { LEGACY_ADMIN_REDIRECTS } from './redirects'

const SRC = join(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

describe('Weiterleitungen auf „Lerninhalte“ (PROJ-131, E2)', () => {
  const target = (source: string, tab?: string) =>
    LEGACY_ADMIN_REDIRECTS.find((r) => r.source === source && (!r.has || r.has[0].value === tab))?.destination

  it('führt jede alte Adresse auf den passenden Reiter', () => {
    for (const source of ['/admin/questions', '/admin/subjects', '/admin/topics']) {
      expect(target(source)).toBe('/admin/inhalte')
    }
    expect(target('/admin/gemeldete-fragen')).toBe('/admin/inhalte?reiter=gemeldet')
    expect(target('/admin/schwierigste-fragen')).toBe('/admin/inhalte?reiter=schwierig')
    expect(target('/admin/papierkorb')).toBe('/admin/inhalte?reiter=papierkorb')
    expect(target('/admin/papierkorb', 'forum')).toBe('/admin/lehrerzimmer?papierkorb=1')
    expect(target('/admin/papierkorb', 'exam_question_set')).toBe('/admin/exam-sets?papierkorb=1')
  })

  it('prüft die Papierkorb-Sonderfälle vor dem allgemeinen Ziel', () => {
    const papierkorb = LEGACY_ADMIN_REDIRECTS.filter((r) => r.source === '/admin/papierkorb')
    expect(papierkorb.map((r) => !!r.has)).toEqual([true, true, false])
  })

  it('hat keine Seite mehr hinter einer weitergeleiteten Adresse', () => {
    for (const { source } of LEGACY_ADMIN_REDIRECTS) {
      expect(existsSync(join(SRC, 'app', source, 'page.tsx')), source).toBe(false)
    }
  })

  it('nirgends im Quellcode zeigt ein Link noch auf eine alte Adresse', () => {
    const sources = [...new Set(LEGACY_ADMIN_REDIRECTS.map((r) => r.source))]
    // Nicht die Schnittstellen (`/api/admin/…`), nicht die Liste der Weiterleitungen selbst
    const pattern = new RegExp(`(?<!/api)(${sources.join('|')})(?![\\w-])`)
    const hits = walk(SRC)
      .filter((f) => relative(SRC, f) !== join('lib', 'redirects.ts'))
      .filter((f) => !relative(SRC, f).startsWith(join('app', 'api')))
      .filter((f) => pattern.test(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC, f))
    expect(hits).toEqual([])
  })
})
