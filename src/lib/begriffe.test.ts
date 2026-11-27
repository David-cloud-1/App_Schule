import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { ALTE_BEGRIFFE } from './begriffe'

/**
 * Wächter für die Wörterliste (PROJ-130): liest die sichtbaren Texte (Strings, Templates,
 * JSX-Text) des Lehrkräfte-Bereichs. Kommentare, Importe, Typen und Code-Namen zählen nicht.
 */

const ORDNER = [
  'src/app/admin',
  'src/app/api/admin',
  'src/components/admin',
  'src/components/werkzeugkiste',
  'src/components/schulrecht',
  'src/components/checklisten',
]

/** Dateien in `src/lib`, deren Texte Lehrkräfte sehen */
const LIB_DATEI =
  /^(admin-nav|roles|konto|user-list|user-csv|absence|kalender|schulrecht|assessment-questions|question-reports|teacher-tasks|werkzeugkiste.*)\.ts$/

/** Schülerseite: dort gilt nur „Übungsprüfung“ */
const SCHUELER_ORDNER = ['src/app/exam', 'src/app/subjects', 'src/app/quiz']

/** Eigenschaften, die nur Suchwörter sind (alte Namen in der Schnellsuche) */
const SUCHWOERTER = new Set(['aliases', 'keywords'])

/**
 * Begründete Ausnahmen: kein Bedientext, sondern Inhalt der fertigen Lernseiten
 * (die Überschrift des Prüfungs-Kastens ändert sich laut Spec nicht).
 */
const AUSNAHMEN = [/⭐ IHK-Prüfungssimulation/, /content:\s*["'[]"?⭐.?IHK-Prüfungssimulation/, /IHK-Prüfungssimulati/]

/** Nur die KI liest diese Texte */
const KI_DATEIEN = new Set(['src/app/api/admin/ai-generate/_lib/process-job.ts'])

function dateien(ordner: string): string[] {
  return fs.readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(ordner, e.name)
    if (e.isDirectory()) return e.name === '__fixtures__' ? [] : dateien(p)
    return /\.tsx?$/.test(e.name) && !/\.test\.|\.generated\.|test-utils|test-hilfe/.test(e.name) ? [p] : []
  })
}

function istSuchwort(knoten: ts.Node): boolean {
  for (let n: ts.Node | undefined = knoten.parent; n; n = n.parent) {
    if (ts.isPropertyAssignment(n) && SUCHWOERTER.has(n.name.getText())) return true
  }
  return false
}

export function sichtbareTexte(datei: string, quelle: string): { zeile: number; text: string }[] {
  const art = datei.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(datei, quelle, ts.ScriptTarget.Latest, true, art)
  const texte: { zeile: number; text: string }[] = []
  const besuche = (n: ts.Node) => {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n) ||
      ts.isJsxText(n)
    ) {
      const technisch = ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent) || ts.isLiteralTypeNode(n.parent)
      if (!technisch && !istSuchwort(n)) {
        texte.push({ zeile: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, text: n.text })
      }
    }
    ts.forEachChild(n, besuche)
  }
  besuche(sf)
  return texte
}

function verstoesse(liste: string[], regeln = ALTE_BEGRIFFE): string[] {
  return liste.flatMap((datei) =>
    sichtbareTexte(datei, fs.readFileSync(datei, 'utf8')).flatMap(({ zeile, text }) =>
      regeln
        .filter((r) => r.muster.test(text) && !AUSNAHMEN.some((a) => a.test(text)))
        .map((r) => `${datei}:${zeile} → „${r.stattdessen}“: ${text.replace(/\s+/g, ' ').trim().slice(0, 120)}`),
    ),
  )
}

describe('Wörterliste (PROJ-130)', () => {
  const lehrkraefte = [
    ...ORDNER.flatMap(dateien),
    ...fs
      .readdirSync('src/lib')
      .filter((n) => LIB_DATEI.test(n) && !n.endsWith('.test.ts'))
      .map((n) => path.join('src/lib', n)),
  ].filter((p) => !KI_DATEIEN.has(p))

  it('findet die Dateien des Lehrkräfte-Bereichs, auch Menü und Baukasten-Wörter', () => {
    expect(lehrkraefte.length).toBeGreaterThan(150)
    expect(lehrkraefte).toContain('src/lib/admin-nav.ts')
    expect(lehrkraefte).toContain('src/components/admin/admin-page-header.tsx')
    expect(lehrkraefte).toContain('src/components/werkzeugkiste/editor/bedien-woerter.ts')
  })

  it('zeigt im Lehrkräfte-Bereich keinen alten Begriff mehr', () => {
    expect(verstoesse(lehrkraefte)).toEqual([])
  })

  it('sagt bei den Abwesenheiten „Vertretung fehlt“ statt „Offen“', () => {
    const abwesenheiten = lehrkraefte.filter((p) => /absence|kalender/.test(p))
    expect(abwesenheiten.length).toBeGreaterThan(5)
    expect(verstoesse(abwesenheiten, [{ muster: /\bOffene?\b/, stattdessen: 'Vertretung fehlt' }])).toEqual([])
  })

  it('nennt die Übungsprüfung auch auf der Schülerseite so', () => {
    const regeln = ALTE_BEGRIFFE.filter((r) => r.stattdessen === 'Übungsprüfung')
    expect(verstoesse(SCHUELER_ORDNER.flatMap(dateien), regeln)).toEqual([])
  })

  it('spricht im Baukasten von Kapiteln, nicht von Themen', () => {
    const baukasten = [
      ...dateien('src/components/werkzeugkiste/editor'),
      'src/lib/werkzeugkiste-editor.ts',
      'src/lib/werkzeugkiste-hinweise.ts',
      'src/lib/werkzeugkiste-uebernahme.ts',
    ]
    // Großgeschrieben = sichtbares Wort; 'thema' klein ist ein Code-Name
    expect(verstoesse(baukasten, [{ muster: /\bThema(s)?\b|\bThemen\b/, stattdessen: 'Kapitel' }])).toEqual([])
  })

  it('sagt in der Werkzeugkiste „Änderungen übernehmen“ und „Kopie bearbeiten“', () => {
    // Nicht für das Lehrerzimmer: dort wird ein Beitrag weiterhin veröffentlicht
    const werkzeugkiste = lehrkraefte.filter((p) => /werkzeugkiste/.test(p))
    expect(
      verstoesse(werkzeugkiste, [
        { muster: /[Vv]eröffentlich(?!ung)/, stattdessen: 'Änderungen übernehmen' },
        { muster: /^\s*Anpassen\s*$/, stattdessen: 'Kopie bearbeiten' },
      ]),
    ).toEqual([])
  })

  it('erkennt einen alten Begriff, aber nicht in Kommentaren oder Suchwörtern', () => {
    const texte = sichtbareTexte('x.tsx', "// Fachbereich\nconst a = { aliases: ['Kalender'] }\nconst b = <p>Fachbereich</p>")
    expect(texte.map((t) => t.text)).toEqual(['Fachbereich'])
  })
})
