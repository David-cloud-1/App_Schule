import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sichtbareTexte } from './begriffe.test'

/**
 * Wächter (PROJ-132): Auf dem Weg „Fragen hinzufügen“ sehen Lehrkräfte keine
 * Fachwörter. Geprüft werden die sichtbaren Texte der Dateien (Strings und
 * JSX-Text, keine Code-Namen) und die Texte, die der Server zurückgibt.
 */
const DATEIEN = [
  'src/components/admin/add-questions-dialog.tsx',
  'src/components/admin/intake-layout.tsx',
  'src/components/admin/intake-material-flow.tsx',
  'src/components/admin/intake-table-flow.tsx',
  'src/components/admin/intake-preview.tsx',
  'src/components/admin/fach-thema-select.tsx',
  'src/components/admin/question-fields.tsx',
  'src/components/admin/question-form-modal.tsx',
  'src/app/api/admin/questions/intake/material/route.ts',
  'src/app/api/admin/questions/intake/prompt/route.ts',
  'src/app/api/admin/questions/intake/preview/route.ts',
  'src/app/api/admin/questions/intake/accept/route.ts',
  'src/app/api/admin/questions/intake/_lib/guard.ts',
  'src/lib/question-intake-server.ts',
]

/** Adressen, Dateiarten und Schlüsselwörter im Code (`application/json`, `multiple_choice`) sind kein sichtbarer Text */
const IST_CODE = (text: string) => !/\s/.test(text) && (/[/_.]/.test(text) || /^[a-z]/.test(text))

const VERBOTEN = /\b(prompt|json|api[- ]?key|methode\s*\d?|anthropic|multiple[- ]choice)\b/i

describe('Fragen hinzufügen: keine Fachwörter in sichtbaren Texten (PROJ-132)', () => {
  for (const datei of DATEIEN) {
    it(datei, () => {
      const treffer = sichtbareTexte(datei, fs.readFileSync(datei, 'utf8')).filter((t) => !IST_CODE(t.text) && VERBOTEN.test(t.text))
      expect(treffer).toEqual([])
    })
  }
})
