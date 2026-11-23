import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * Wächtertest PROJ-127: Seit alle Lehrkräfte die Verwaltung nutzen dürfen,
 * muss jede schreibende Verwaltungs-Route einen Eintrag ins Änderungsprotokoll
 * schreiben. Routen, die Lehrkräfte erreichen (`requireManager`), nutzen die
 * strenge Hilfe `writeAuditLogStrict`: Scheitert das Protokoll, bricht die
 * Aktion ab. Reine Super-Admin-Routen dürfen die nachsichtige Hilfe nehmen.
 *
 * Kommt eine neue Route hinzu, schlägt der Test fehl, wenn sie nicht
 * protokolliert. Dann die Route reparieren, nicht diesen Test lockern.
 */
const ADMIN_API = __dirname

/** Ordner der Verwaltung (Nutzer, Items, Fachbereich-Einstellungen) */
const VERWALTUNG = ['users', 'shop-items', 'department-settings']

/** Datenbank-Funktionen, die den Protokolleintrag selbst schreiben */
const RPC_WITH_OWN_AUDIT = ['abw_planer_setzen']

const WRITE_HANDLER = /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/

function routeFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...routeFiles(full))
    else if (name === 'route.ts') out.push(full)
  }
  return out
}

const files = VERWALTUNG.flatMap((d) => routeFiles(join(ADMIN_API, d)))
const writeRoutes = files
  .map((f) => ({ path: relative(ADMIN_API, f).split(sep).join('/'), src: readFileSync(f, 'utf8') }))
  .filter((r) => WRITE_HANDLER.test(r.src))

describe('Verwaltung: jede schreibende Route protokolliert (PROJ-127)', () => {
  it('findet die Verwaltungs-Routen (sonst prüft der Test nichts)', () => {
    expect(writeRoutes.map((r) => r.path)).toEqual(
      expect.arrayContaining([
        'users/[id]/route.ts',
        'users/[id]/password/route.ts',
        'shop-items/route.ts',
        'shop-items/[id]/route.ts',
        'department-settings/route.ts',
      ]),
    )
  })

  it.each(writeRoutes.map((r) => [r.path, r.src] as const))('%s schreibt einen Protokolleintrag', (_path, src) => {
    const logs =
      /writeAuditLogStrict\s*\(/.test(src) ||
      /writeAuditLog\s*\(/.test(src) ||
      RPC_WITH_OWN_AUDIT.some((rpc) => src.includes(`'${rpc}'`))
    expect(logs).toBe(true)
  })

  it.each(writeRoutes.map((r) => [r.path, r.src] as const))(
    '%s: von Lehrkräften erreichbar → strenge Protokoll-Hilfe',
    (_path, src) => {
      if (!/requireManager\s*\(/.test(src)) return
      expect(src).toMatch(/writeAuditLogStrict\s*\(/)
      expect(src).toMatch(/auditFailedResponse\s*\(/)
    },
  )

  it.each(writeRoutes.map((r) => [r.path, r.src] as const))(
    '%s: hat einen Türsteher (requireManager oder Super-Admin)',
    (_path, src) => {
      expect(/requireManager\s*\(|requireSuperAdmin\s*\(|requireSuperAdminTarget\s*\(/.test(src)).toBe(true)
    },
  )
})

describe('kein alter Türsteher mehr (PROJ-127)', () => {
  it('keine Admin-Route ruft noch requireAdmin() auf', () => {
    const all = routeFiles(ADMIN_API)
      .map((f) => ({ path: relative(ADMIN_API, f), src: readFileSync(f, 'utf8') }))
      .filter((r) => /\brequireAdmin\s*\(/.test(r.src))
      .map((r) => r.path)
    expect(all).toEqual([])
  })
})
