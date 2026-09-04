/**
 * Qualitäts-Audit über den Fragenbestand.
 *
 *   node scripts/quality/audit.ts                     Gesamtreport
 *   node scripts/quality/audit.ts --json              maschinenlesbar
 *   node scripts/quality/audit.ts --save              Snapshot + Trend gegen den letzten
 *   node scripts/quality/audit.ts --list first_word_tell --limit 20 --run durchlauf-5
 *   node scripts/quality/audit.ts --sample 8          Zufallsstichprobe zum Lesen
 *
 * Wichtig: Ziel ist bei den Quoten NICHT null, sondern Zufallsniveau.
 * Eine Quote unter dem Korridor ist ebenso ein Rate-Trick wie eine darüber.
 */
import fs from 'node:fs'
import path from 'node:path'
import { analyzeQuestion, analyzeBatch } from '../../src/lib/question-quality.ts'
import { db, loadActiveQuestions, loadDone, arg, has, type LoadedQuestion } from './lib.ts'

const HISTORY = path.resolve(import.meta.dirname, 'history')

function pct(n: number): string {
  return `${(n * 100).toFixed(1).padStart(5)} %`
}

function printReport(questions: LoadedQuestion[]) {
  const batch = analyzeBatch(questions)
  const codeCounts = new Map<string, number>()
  for (const q of questions) {
    for (const f of analyzeQuestion(q).findings) {
      codeCounts.set(f.code, (codeCounts.get(f.code) ?? 0) + 1)
    }
  }

  console.log(`\n  Fragenbestand: ${batch.questions} aktive Fragen\n`)
  console.log('  Kennzahl                          Anteil    Ziel')
  console.log('  ' + '─'.repeat(72))
  for (const m of batch.metrics) {
    const flag = m.verdict === 'ok' ? '  ok' : ` ${m.verdict.toUpperCase()}`
    console.log(
      `  ${m.label.padEnd(32)}${pct(m.share)}  ${m.target.padEnd(30)}${flag}` +
        `\n  ${''.padEnd(32)}${String(m.value).padStart(5)} / ${m.total}`
    )
  }

  console.log('\n  Einzelbefunde (Fragen mit mindestens einem Treffer):')
  const sorted = [...codeCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [code, count] of sorted) {
    console.log(`    ${code.padEnd(26)} ${String(count).padStart(5)}  (${pct(count / batch.questions).trim()})`)
  }
  if (sorted.length === 0) console.log('    keine')
  console.log('')
  return batch
}

function saveSnapshot(batch: ReturnType<typeof analyzeBatch>) {
  fs.mkdirSync(HISTORY, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const files = fs.readdirSync(HISTORY).filter((f) => f.endsWith('.json')).sort()
  const previous = files.length
    ? (JSON.parse(fs.readFileSync(path.join(HISTORY, files[files.length - 1]), 'utf8')) as {
        metrics: { key: string; share: number }[]
      })
    : null

  fs.writeFileSync(path.join(HISTORY, `${stamp}.json`), JSON.stringify(batch, null, 2))

  if (previous) {
    console.log(`  Trend gegen ${files[files.length - 1]}:`)
    for (const m of batch.metrics) {
      const before = previous.metrics.find((p) => p.key === m.key)?.share
      if (before === undefined) continue
      const delta = (m.share - before) * 100
      const sign = delta > 0 ? '+' : ''
      const mark = Math.abs(delta) < 0.1 ? 'unverändert' : `${sign}${delta.toFixed(1)} Punkte`
      console.log(`    ${m.label.padEnd(32)} ${mark}`)
    }
    console.log('')
  }
  console.log(`  Snapshot gespeichert: scripts/quality/history/${stamp}.json\n`)
}

function printQuestion(q: LoadedQuestion, index?: number) {
  const report = analyzeQuestion(q)
  console.log(`\n${index !== undefined ? `[${index}] ` : ''}${q.id}`)
  console.log(`  ${q.question_text}`)
  q.options.forEach((o, i) => {
    const mark = i === q.correct_index ? '✓' : ' '
    console.log(`   ${mark} [${q.option_ids[i]}] (${String(o.length).padStart(3)}) ${o}`)
  })
  if (q.explanation) console.log(`  Erklärung: ${q.explanation}`)
  for (const f of report.findings) {
    console.log(`  ${f.severity === 'blocker' ? '✗' : '!'} ${f.code}: ${f.message}`)
  }
}

async function main() {
  const supabase = db()
  const questions = await loadActiveQuestions(supabase)

  const listCode = arg('list')
  if (listCode && listCode !== 'true') {
    const runKey = arg('run')
    const done = runKey ? await loadDone(supabase, runKey) : new Set<string>()
    const limit = Number(arg('limit', '20'))

    const hits = questions
      .filter((q) => !done.has(q.id))
      .map((q) => ({ q, findings: analyzeQuestion(q).findings }))
      .filter((x) => x.findings.some((f) => f.code === listCode))
      // Schwerste zuerst: größter Längenvorsprung bzw. meiste Befunde
      .sort((a, b) => b.findings.length - a.findings.length)
      .slice(0, limit)

    console.log(
      `\n  ${hits.length} Fragen mit „${listCode}"` +
        (runKey ? ` (ohne die ${done.size} in Durchlauf „${runKey}" erledigten)` : '')
    )
    hits.forEach((h, i) => printQuestion(h.q, i + 1))
    console.log('')
    return
  }

  const sample = arg('sample')
  if (sample && sample !== 'true') {
    const n = Number(sample)
    const picked = [...questions].sort(() => Math.random() - 0.5).slice(0, n)
    console.log(`\n  Zufallsstichprobe (${n} von ${questions.length}) — bitte inhaltlich lesen:`)
    picked.forEach((q, i) => printQuestion(q, i + 1))
    console.log('')
    return
  }

  if (has('json')) {
    console.log(JSON.stringify(analyzeBatch(questions), null, 2))
    return
  }

  const batch = printReport(questions)
  if (has('save')) saveSnapshot(batch)
}

main().catch((err) => {
  console.error(`\n  Fehler: ${err.message}\n`)
  process.exit(1)
})
