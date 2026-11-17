import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { BAUPLAENE, hinweise, teileVon, type Teil, type TextTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { antwortenTeil, wahrFalschTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-a'
import { zahlTeil, zeilenTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-b'
import { paareTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-c'
import { gruppenTeil, zuordnenTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-d'
import { lueckenTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-e'
import { eintraegeTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-f'
import { unterbloeckeTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-g'
import { liste, s, wachse, type Block, type Eintrag, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Zeichnet einen Teil des Bauplans – für die ganze Aufgabe und für jede Frage in einem Kapiteltest
 * (dort mit einem Unter-Werk, das nur die Frage kennt).
 */

/** Was der Kern als „wahr“ liest, wird für die Bearbeitung zu true/false (gespeichert wird erst bei einer Änderung) */
export function normalisiere(b: Block): Block {
  const neu: Block = { ...b }
  for (const teil of BAUPLAENE[b.type] ? teileVon(BAUPLAENE[b.type], b) : []) {
    if (teil.art === 'antworten' || teil.art === 'paare' || teil.art === 'eintraege' || teil.art === 'gruppen') neu[teil.feld] = liste(b[teil.feld])
    if (teil.art === 'wahrfalsch') neu[teil.feld] = [true, 'true', 'wahr', 1].includes(b[teil.feld] as never)
    if (teil.art === 'zeilen')
      neu[teil.feld] = (Array.isArray(b[teil.feld]) ? (b[teil.feld] as unknown[]) : []).map((x) =>
        x && typeof x === 'object' ? s((x as Eintrag).word ?? (x as Eintrag).wort ?? (x as Eintrag).text) : s(x),
      )
    if (teil.art === 'zuordnen') {
      neu[teil.kategorien] = (Array.isArray(b[teil.kategorien]) ? (b[teil.kategorien] as unknown[]) : []).map(s)
      neu[teil.feld] = liste(b[teil.feld])
    }
    if (teil.art === 'unterbloecke')
      neu[teil.feld] = liste(b[teil.feld]).map((f) => normalisiere({ ...f, type: s(f.type) || 'multiple_choice' } as Block))
  }
  return neu
}

/** Erstes Feld eines Teils (für Enter aus dem Teil davor und für den Start) */
export function erstesFeldVon(t: Teil | undefined): string | null {
  if (!t) return null
  if (t.art === 'text') return t.feld
  if (t.art === 'antworten' || t.art === 'wahrfalsch') return 'antwort-0'
  if (t.art === 'paare') return `links-${t.feld}-0`
  if (t.art === 'zeilen') return `zeile-${t.feld}-0`
  if (t.art === 'eintraege') return 'ef-0-0'
  if (t.art === 'zahl') return `zahl-${t.feld}`
  if (t.art === 'zuordnen') return 'kat-0'
  if (t.art === 'gruppen') return 'gt-0'
  if (t.art === 'unterbloecke') return 'q0:antwort-0'
  return 'lt-text'
}

export function textTeil(w: Werk, teil: TextTeil, naechster: string | null): VNode {
  const fehlt = hinweise(w.block).find((h) => h.wo === teil.feld)
  return html`<div>
    <textarea
      class="wk-aw-feld frage"
      rows="1"
      data-aw-fokus=${teil.feld}
      aria-label=${teil.label}
      placeholder=${teil.platzhalter}
      value=${s(w.block[teil.feld])}
      spellcheck="true"
      lang="de"
      onInput=${(e: Event) => {
        const el = e.currentTarget as HTMLTextAreaElement
        wachse(el)
        w.tippe({ ...w.block, [teil.feld]: el.value }, `text-${teil.feld}`)
      }}
      onKeyDown=${(e: KeyboardEvent) => {
        // Enter springt zum nächsten Teil (Umschalt+Enter = neue Zeile)
        if (e.key === 'Enter' && !e.shiftKey && naechster) {
          e.preventDefault()
          w.fokus(naechster)
          w.zeichne()
        }
      }}
    ></textarea>
    ${fehlt && html`<p class="wk-aw-hinweis" role="note">${fehlt.text}</p>`}
  </div>`
}

/** Teil Nummer i der Aufgabe (nach Bedingungen und Feldnamen des Blocks) */
export function zeichneTeil(w: Werk, i: number): VNode {
  const teile = teileVon(BAUPLAENE[w.block.type], w.block)
  const t = teile[i]
  if (t.art === 'text') return textTeil(w, t, erstesFeldVon(teile[i + 1]))
  if (t.art === 'antworten') return antwortenTeil(w, t)
  if (t.art === 'wahrfalsch') return wahrFalschTeil(w, t)
  if (t.art === 'paare') return paareTeil(w, t)
  if (t.art === 'zeilen') return zeilenTeil(w, t)
  if (t.art === 'eintraege') return eintraegeTeil(w, t)
  if (t.art === 'zahl') return zahlTeil(w, t)
  if (t.art === 'zuordnen') return zuordnenTeil(w, t)
  if (t.art === 'gruppen') return gruppenTeil(w, t)
  if (t.art === 'unterbloecke') return unterbloeckeTeil(w, t, { zeichne: zeichneTeil, normalisiere })
  return lueckenTeil(w, t)
}
