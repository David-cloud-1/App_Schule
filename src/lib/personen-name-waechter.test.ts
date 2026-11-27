import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * Wächtertest PROJ-121 (Sichtbarkeit): Der echte Name (Vor-/Nachname) von
 * Lehrkräften ist nur für den Lehrkräfte-Bereich bestimmt. Dieser Test hält
 * fest, welche Quelldateien die Namensfelder überhaupt anfassen. Taucht eine
 * neue Datei auf (vor allem auf Azubi-Seiten oder -Schnittstellen), schlägt er
 * fehl und zwingt zu einer bewussten Entscheidung, statt dass der Name still
 * an Azubis gelangt.
 */
const SRC = join(__dirname, '..')
const NAME_FIELD = /first_name|last_name|firstName|lastName/

/** Dateien, die die Namensfelder bewusst benutzen (Lehrer-Seite, Pflicht-Seite, Türsteher) */
const ALLOWED = new Set(
  [
    // PROJ-127: Name der handelnden Person im Änderungsprotokoll, Name des betroffenen Kontos
    'app/api/admin/_lib/auth.ts',
    'app/api/admin/_lib/last-change.ts',
    'app/api/admin/audit-log/route.ts',
    'app/api/admin/users/[id]/password/route.ts',
    'app/api/admin/users/[id]/route.ts',
    'app/api/admin/users/[id]/rename/route.ts',
    'app/api/admin/users/_lib/target.ts',
    'app/api/profile/name/route.ts',
    'app/name-festlegen/page.tsx',
    'app/start/page.tsx',
    'components/admin/konto-ueber-mich.tsx',
    'components/admin/person-name-fields.tsx',
    'components/admin/user-detail/types.ts',
    'components/admin/user-detail/user-detail-dialogs.tsx',
    'components/admin/user-detail/user-detail-view.tsx',
    'components/name-festlegen-form.tsx',
    // PROJ-131: „Ausgeblendet von <Name>“, nur in der Fragen-Schnittstelle der Lehrkräfte
    'lib/hidden-info.ts',
    'lib/konto-data.ts',
    'lib/personen-name.ts',
    'lib/roles.ts',
    'lib/user-detail-server.ts',
    'proxy.ts',
    // Azubi trägt beim Beitritt zu einem Nachweis seinen eigenen Namen ein (PROJ-21), hat nichts mit Lehrkräften zu tun
    'components/join-assessment-client.tsx',
  ].map((p) => p.split('/').join(sep)),
)

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

describe('Vor- und Nachname von Lehrkräften bleiben im Lehrkräfte-Bereich (PROJ-121)', () => {
  const users = walk(SRC)
    .filter((f) => NAME_FIELD.test(readFileSync(f, 'utf8')))
    .map((f) => relative(SRC, f))

  it('nur bekannte Dateien benutzen die Namensfelder', () => {
    const unknown = users.filter((f) => !ALLOWED.has(f))
    expect(unknown, `Neue Datei(en) mit Namensfeldern: ${unknown.join(', ')}. Gehört sie in den Lehrkräfte-Bereich? Dann hier eintragen.`).toEqual([])
  })

  it('keine Azubi-Schnittstelle und keine Azubi-Seite liest die Namensfelder', () => {
    const studentFacing = [
      'app/page.tsx',
      'app/profile',
      'app/quiz',
      'app/shop',
      'app/leaderboard',
      'app/exam',
      'app/pruefung',
      'app/subjects',
      'app/api/leaderboard',
      'app/api/quiz',
      'app/api/shop',
      'app/api/exam',
      'app/api/assessments',
      'app/api/question-reports',
      'app/api/questions',
      'app/api/badges',
    ].map((p) => p.split('/').join(sep))
    const leaks = users.filter((f) => studentFacing.some((p) => f === p || f.startsWith(p + sep)))
    // join-assessment-client liegt unter components, nicht hier; Azubi-Seiten und -APIs müssen frei bleiben
    expect(leaks).toEqual([])
  })

  it('die Lehrkräfte-Abfragen, die den Namen lesen, liegen unter /admin oder sind Lehrer-Wachen', () => {
    // Pflicht-Seite, Start-Weiche und Türsteher prüfen die Rolle, bevor sie den Namen auswerten
    for (const f of ['app/name-festlegen/page.tsx', 'app/start/page.tsx', 'proxy.ts']) {
      const code = readFileSync(join(SRC, f.split('/').join(sep)), 'utf8')
      expect(code, f).toMatch(/isTeacherRole|isManagerRole/)
    }
  })
})
