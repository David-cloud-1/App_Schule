/**
 * Wendet einen Korrektur-Batch an — mit erzwungener Verifikation.
 *
 *   node scripts/quality/apply.ts batch.json
 *   node scripts/quality/apply.ts batch.json --dry-run
 *
 * Ablauf (nicht abkürzbar, das ist der Sinn):
 *   1. Baseline aller Kennzahlen messen
 *   2. jede Änderung lokal simulieren — Blocker verhindern das Schreiben
 *   3. schreiben
 *   4. betroffene Fragen frisch aus der DB laden und alle Kennzahlen neu messen
 *   5. bei Verschlechterung einer Kennzahl: vollständiger Rollback
 *   6. erst dann Fortschritt in quality_fix_progress eintragen
 *
 * Format der Batch-Datei:
 * {
 *   "run": "durchlauf-5-struktur",
 *   "changes": [
 *     { "question_id": "uuid",
 *       "note": "warum",
 *       "update": [{ "option_id": "uuid", "option_text": "neuer Text" }],
 *       "insert": [{ "option_text": "neuer Distraktor" }],
 *       "question_text": "optional",
 *       "explanation": "optional" }
 *   ]
 * }
 */
import fs from 'node:fs'
import { analyzeQuestion, analyzeBatch } from '../../src/lib/question-quality.ts'
import { db, loadActiveQuestions, has, type LoadedQuestion } from './lib.ts'

interface Change {
  question_id: string
  note?: string
  update?: { option_id: string; option_text: string }[]
  insert?: { option_text: string; is_correct?: boolean }[]
  question_text?: string
  explanation?: string
}

interface Batch {
  run: string
  changes: Change[]
}

/** Wendet eine Änderung im Speicher an, um sie vor dem Schreiben zu prüfen. */
function simulate(q: LoadedQuestion, c: Change): LoadedQuestion {
  const options = [...q.options]
  const option_ids = [...q.option_ids]
  for (const u of c.update ?? []) {
    const idx = option_ids.indexOf(u.option_id)
    if (idx === -1) throw new Error(`Option ${u.option_id} gehört nicht zu Frage ${q.id}`)
    options[idx] = u.option_text
  }
  for (const ins of c.insert ?? []) {
    options.push(ins.option_text)
    option_ids.push('neu')
  }
  return {
    ...q,
    options,
    option_ids,
    question_text: c.question_text ?? q.question_text,
    explanation: c.explanation ?? q.explanation,
  }
}

function compare(before: ReturnType<typeof analyzeBatch>, after: ReturnType<typeof analyzeBatch>) {
  const regressions: string[] = []
  for (const a of after.metrics) {
    const b = before.metrics.find((m) => m.key === a.key)
    if (!b) continue
    const worseVerdict = b.verdict === 'ok' && a.verdict !== 'ok'
    // Abstand zum Zielwert darf nicht wachsen
    const target = a.key === 'longest_is_correct' ? 0.2 : 0
    const grew = Math.abs(a.share - target) > Math.abs(b.share - target) + 0.002
    if (worseVerdict || (a.verdict !== 'ok' && grew)) {
      regressions.push(
        `${a.label}: ${(b.share * 100).toFixed(1)} % → ${(a.share * 100).toFixed(1)} % (${a.verdict})`
      )
    }
  }
  return regressions
}

async function main() {
  const file = process.argv[2]
  if (!file || file.startsWith('--')) throw new Error('Aufruf: node scripts/quality/apply.ts <batch.json>')
  const batch = JSON.parse(fs.readFileSync(file, 'utf8')) as Batch
  if (!batch.run || !Array.isArray(batch.changes) || batch.changes.length === 0) {
    throw new Error('Batch-Datei braucht "run" und mindestens eine Änderung in "changes".')
  }

  const supabase = db()
  console.log(`\n  Lade Bestand …`)
  const all = await loadActiveQuestions(supabase)
  const byId = new Map(all.map((q) => [q.id, q]))
  const before = analyzeBatch(all)

  // ── 2. Simulation ──────────────────────────────────────────────────────────
  const simulated = new Map<string, LoadedQuestion>()
  const rejected: string[] = []
  for (const c of batch.changes) {
    const q = byId.get(c.question_id)
    if (!q) throw new Error(`Frage ${c.question_id} nicht gefunden oder inaktiv.`)
    const sim = simulate(q, c)
    const report = analyzeQuestion(sim)
    if (!report.ok) {
      rejected.push(
        `  ✗ ${c.question_id}\n` +
          report.findings
            .filter((f) => f.severity === 'blocker')
            .map((f) => `      ${f.code}: ${f.message}`)
            .join('\n')
      )
      continue
    }
    simulated.set(c.question_id, sim)
  }

  if (rejected.length > 0) {
    console.error(`\n  ${rejected.length} Änderung(en) würden einen Blocker erzeugen — nichts geschrieben:\n`)
    console.error(rejected.join('\n'))
    console.error('\n  Batch korrigieren und erneut anwenden.\n')
    process.exit(1)
  }

  // Vorschau der Gesamtwirkung, bevor irgendetwas geschrieben wird
  const preview = all.map((q) => simulated.get(q.id) ?? q)
  const predicted = analyzeBatch(preview)
  const predictedRegressions = compare(before, predicted)
  if (predictedRegressions.length > 0) {
    console.error(`\n  Der Batch würde Kennzahlen verschlechtern — nichts geschrieben:`)
    predictedRegressions.forEach((r) => console.error(`    ✗ ${r}`))
    console.error('')
    process.exit(1)
  }

  if (has('dry-run')) {
    console.log(`\n  Trockenlauf: ${simulated.size} Änderungen sind sauber.`)
    for (const m of predicted.metrics) {
      const b = before.metrics.find((x) => x.key === m.key)!
      console.log(
        `    ${m.label.padEnd(32)} ${(b.share * 100).toFixed(1)} % → ${(m.share * 100).toFixed(1)} %`
      )
    }
    console.log('')
    return
  }

  // ── 3. Schreiben, mit Rollback-Daten ───────────────────────────────────────
  const rollback: { option_id: string; option_text: string }[] = []
  const insertedIds: string[] = []
  const touched: string[] = []

  for (const c of batch.changes) {
    const q = byId.get(c.question_id)!
    for (const u of c.update ?? []) {
      const idx = q.option_ids.indexOf(u.option_id)
      rollback.push({ option_id: u.option_id, option_text: q.options[idx] })
      const { error } = await supabase
        .from('answer_options')
        .update({ option_text: u.option_text })
        .eq('id', u.option_id)
      if (error) throw new Error(`Update ${u.option_id}: ${error.message}`)
    }
    for (const ins of c.insert ?? []) {
      const { data, error } = await supabase
        .from('answer_options')
        .insert({
          question_id: c.question_id,
          option_text: ins.option_text,
          is_correct: ins.is_correct ?? false,
          display_order: q.options.length + 1,
        })
        .select('id')
        .single()
      if (error) throw new Error(`Insert für ${c.question_id}: ${error.message}`)
      insertedIds.push(data.id as string)
    }
    if (c.question_text || c.explanation) {
      const patch: Record<string, string> = {}
      if (c.question_text) patch.question_text = c.question_text
      if (c.explanation) patch.explanation = c.explanation
      const { error } = await supabase.from('questions').update(patch).eq('id', c.question_id)
      if (error) throw new Error(`Frage ${c.question_id}: ${error.message}`)
    }
    touched.push(c.question_id)
  }

  // ── 4. Verifikation gegen die DB, nicht gegen die Simulation ───────────────
  const fresh = await loadActiveQuestions(supabase)
  const after = analyzeBatch(fresh)
  const regressions = compare(before, after)
  const stillBroken = fresh.filter((q) => touched.includes(q.id) && !analyzeQuestion(q).ok)

  if (regressions.length > 0 || stillBroken.length > 0) {
    console.error('\n  Verifikation fehlgeschlagen — Rollback läuft:')
    regressions.forEach((r) => console.error(`    ✗ ${r}`))
    stillBroken.forEach((q) => console.error(`    ✗ ${q.id} hat weiterhin Blocker`))
    for (const r of rollback) {
      await supabase.from('answer_options').update({ option_text: r.option_text }).eq('id', r.option_id)
    }
    for (const id of insertedIds) {
      await supabase.from('answer_options').delete().eq('id', id)
    }
    console.error(`\n  ${rollback.length} Option(en) zurückgesetzt, ${insertedIds.length} entfernt.`)
    console.error('  Kein Fortschritt eingetragen.\n')
    process.exit(1)
  }

  // ── 5. Fortschritt eintragen ───────────────────────────────────────────────
  const rows = batch.changes.map((c) => ({
    question_id: c.question_id,
    run_key: batch.run,
    note: c.note ?? null,
  }))
  const { error } = await supabase.from('quality_fix_progress').upsert(rows, {
    onConflict: 'question_id,run_key',
  })
  if (error) throw new Error(`Fortschritt: ${error.message}`)

  console.log(`\n  ${touched.length} Fragen geändert und verifiziert (Durchlauf „${batch.run}").`)
  for (const m of after.metrics) {
    const b = before.metrics.find((x) => x.key === m.key)!
    const delta = (m.share - b.share) * 100
    const mark = Math.abs(delta) < 0.05 ? '·' : delta < 0 ? '↓' : '↑'
    console.log(
      `    ${mark} ${m.label.padEnd(32)} ${(b.share * 100).toFixed(1)} % → ${(m.share * 100).toFixed(1)} %`
    )
  }
  console.log('')
}

main().catch((err) => {
  console.error(`\n  Fehler: ${err.message}\n`)
  process.exit(1)
})
