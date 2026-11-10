import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { teacherMayCallApiPath } from './roles'

/**
 * Wächter (gefunden bei PROJ-85): Eine Admin-Route, die Lehrkräfte zulässt
 * (requireTeacherOrAdmin / requireContentAdmin), muss auch im Proxy für
 * Lehrkräfte freigegeben sein. Sonst lehnt der Proxy mit 403 ab, bevor die
 * Route läuft, und Unit-Tests der Route merken es nicht.
 */
const API_ROOT = join(process.cwd(), 'src', 'app')

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return routeFiles(full)
    return name === 'route.ts' ? [full] : []
  })
}

describe('Proxy-Freigabe für Lehrkraft-Schnittstellen', () => {
  it('gibt jede Admin-Route frei, die selbst Lehrkräfte zulässt', () => {
    const files = routeFiles(join(API_ROOT, 'api', 'admin'))
    expect(files.length).toBeGreaterThan(20)
    const missing = files
      .filter((f) => /require(TeacherOrAdmin|ContentAdmin)\(/.test(readFileSync(f, 'utf8')))
      .map((f) => '/' + relative(API_ROOT, f).split(sep).slice(0, -1).join('/'))
      .filter((path) => !teacherMayCallApiPath(path))
    expect(missing).toEqual([])
  })
})
