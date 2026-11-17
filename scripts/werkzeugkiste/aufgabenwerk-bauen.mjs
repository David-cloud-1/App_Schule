// Bündelt das Aufgabenwerk (PROJ-114) zu einer einzigen Datei, die die App in die abgeschottete
// Vorschau-Seite nachlädt. Aufruf: npm run aufgabenwerk:bauen
// Ergebnis: src/components/werkzeugkiste/editor/aufgabenwerk/aufgabenwerk-bundle.generated.ts
// (eingecheckt; ein Test prüft, dass es zu den Quellen passt)
import { build } from 'vite'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ordner = path.join(wurzel, 'src/components/werkzeugkiste/editor/aufgabenwerk')
/** Alle Quellen im Ordner (ohne das erzeugte Bündel), sortiert – ein Test rechnet genauso */
export const QUELLEN = readdirSync(ordner)
  .filter((d) => d.endsWith('.ts') && !d.endsWith('.generated.ts'))
  .sort()
  .map((d) => `src/components/werkzeugkiste/editor/aufgabenwerk/${d}`)

export function quellStand() {
  const h = createHash('sha256')
  for (const q of QUELLEN) h.update(q).update(readFileSync(path.join(wurzel, q)))
  return h.digest('hex').slice(0, 16)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ergebnis = await build({
    configFile: false,
    root: wurzel,
    logLevel: 'warn',
    resolve: { alias: { '@': path.join(wurzel, 'src') } },
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      write: false,
      minify: true,
      target: 'es2020',
      lib: { entry: path.join(ordner, 'eintritt.ts'), formats: ['iife'], name: 'WkAufgabenwerk', fileName: () => 'aufgabenwerk.js' },
    },
  })
  const ausgabe = (Array.isArray(ergebnis) ? ergebnis[0] : ergebnis).output
  const code = ausgabe.find((o) => o.type === 'chunk')?.code
  if (!code) throw new Error('Kein Code gebaut')
  const datei = `// ERZEUGT von scripts/werkzeugkiste/aufgabenwerk-bauen.mjs – nicht von Hand ändern (npm run aufgabenwerk:bauen)
export const AUFGABENWERK_STAND = ${JSON.stringify(quellStand())}
export const AUFGABENWERK_CODE = ${JSON.stringify(code)}
`
  writeFileSync(path.join(ordner, 'aufgabenwerk-bundle.generated.ts'), datei)
  console.log(`Aufgabenwerk gebaut: ${(code.length / 1024).toFixed(0)} KB, Stand ${quellStand()}`)
}
