import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { hinweise, type Hinweis, type ZahlTeil, type ZeilenTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { listenAktionen } from '@/components/werkzeugkiste/editor/aufgabenwerk/listen'
import { s, wachse, type Block, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Muster B – Zeilen (PROJ-114): nummerierte Liste aus reinem Text. Enter = neue Zeile, Rücktaste in
 * leerer Zeile löscht, Einfügen mehrerer Zeilen macht mehrere Einträge. Der Baustein `stringListe`
 * dient auch den verschachtelten Listen des Trainers (Muster D) und den Rechenschritten (F).
 */

export interface TextListe {
  /** Eindeutige Kennung der Liste in der Seite (auch Schlüssel für Fokus und Ziehen) */
  feld: string
  einzahl: string
  mehrzahl: string
  mindestens: number
  hoechstens: number
  schluessel: string
  platzhalter: string
  max?: number
  holen: () => string[]
  schreibe: (l: string[]) => Block
  notizen?: Hinweis[]
  /** Überschrift über der Liste (verschachtelt) */
  titel?: string
}

export function stringListe(w: Werk, o: TextListe): VNode {
  const L = listenAktionen(w, {
    feld: o.feld,
    einzahl: o.einzahl,
    mehrzahl: o.mehrzahl,
    mindestens: o.mindestens,
    hoechstens: o.hoechstens,
    schluessel: o.schluessel,
    neu: (t) => ({ t }),
    fokus: (i) => `zeile-${o.feld}-${i}`,
    holen: () => o.holen().map((t) => ({ t })),
    schreibe: (l) => o.schreibe(l.map((x) => s(x.t))),
  })
  const eintraege = L.eintraege
  const setze = (i: number, wert: string) => L.mit(eintraege.map((x, j) => (j === i ? { t: wert } : x)))

  const zeilen = eintraege.map((e, i) => {
    const z = L.zeilenZiehen(i)
    const nr = i + 1
    return html`<li class=${`wk-aw-zeile${z.klasse}`} data-aw-zeile key=${i} style=${z.stil}>
      <span class="wk-aw-nr" aria-hidden="true">${nr}</span>
      <textarea
        class="wk-aw-feld"
        rows="1"
        data-aw-fokus=${`zeile-${o.feld}-${i}`}
        aria-label=${`${o.einzahl} ${nr}`}
        placeholder=${i === 0 ? o.platzhalter : `${o.einzahl} ${nr}`}
        value=${s(e.t)}
        spellcheck="true"
        lang="de"
        onInput=${(ev: Event) => {
          const el = ev.currentTarget as HTMLTextAreaElement
          wachse(el)
          w.tippe(setze(i, el.value), `${o.feld}-${i}`)
        }}
        onPaste=${L.einfuegen(i, 't')}
        onKeyDown=${(ev: KeyboardEvent) => {
          if (L.tasten(i, ev)) return
          const el = ev.currentTarget as HTMLTextAreaElement
          if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault()
            if (i < eintraege.length - 1) {
              w.fokus(`zeile-${o.feld}-${i + 1}`)
              w.zeichne()
            } else L.neu(i)
          } else if (ev.key === 'Backspace' && el.value === '' && eintraege.length > o.mindestens) {
            ev.preventDefault()
            L.loesche(i)
          }
        }}
      ></textarea>
      ${L.griff(i)} ${L.weg(i)}
    </li>`
  })

  return html`<div class="wk-aw-zeilenblock">
    ${o.titel && html`<p class="wk-aw-zwischen">${o.titel}</p>`}
    <ol class="wk-aw-liste" data-aw-liste=${o.feld}>${zeilen}</ol>
    ${L.neuKnopf()} ${L.hinweisZeile()}
    ${(o.notizen ?? []).map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
  </div>`
}

/** Teil „Zeilen“ eines Bauplans (Reihenfolge, Wörtersuche, Rechenschritte) */
export function zeilenTeil(w: Werk, teil: ZeilenTeil): VNode {
  return stringListe(w, {
    feld: teil.feld,
    einzahl: teil.einzahl,
    mehrzahl: teil.mehrzahl,
    mindestens: teil.mindestens,
    hoechstens: teil.hoechstens,
    schluessel: teil.schluessel,
    platzhalter: teil.platzhalter,
    holen: () => (Array.isArray(w.block[teil.feld]) ? (w.block[teil.feld] as unknown[]) : []).map(s),
    schreibe: (l) => ({ ...w.block, [teil.feld]: l }),
    notizen: hinweise(w.block).filter((h) => h.wo.startsWith(teil.feld)),
    titel: teil.titel,
  })
}

/** Ansicht nach „Fertig“ (bis zum Neubau) */
export function zeilenAnsicht(w: Werk, teil: ZeilenTeil): VNode | null {
  const l = (Array.isArray(w.block[teil.feld]) ? (w.block[teil.feld] as unknown[]) : []).map(s).filter((x) => x.trim())
  if (teil.kaertchen) return l.length ? html`<div class="vorrat">${l.map((x, i) => html`<span class="chip" key=${i}>${x}</span>`)}</div>` : null
  return html`<ol>${l.map((x) => html`<li>${x}</li>`)}</ol>`
}

/** Eine ganze Zahl (Runden, Mindestzeichen, Höhe): nur Ziffern, leer = Standard der Seite */
export function zahlTeil(w: Werk, teil: ZahlTeil): VNode {
  const v = w.block[teil.feld]
  const fehlt = hinweise(w.block).find((h) => h.wo === teil.feld)
  return html`<div class="wk-aw-zahl">
    <label>
      <span>${teil.label}</span>
      <input
        class="wk-aw-feld wk-aw-zahlfeld"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        data-aw-fokus=${`zahl-${teil.feld}`}
        placeholder=${teil.platzhalter}
        value=${v === undefined || v === null ? '' : String(v)}
        onInput=${(e: Event) => {
          const el = e.currentTarget as HTMLInputElement
          const ziffern = el.value.replace(/\D/g, '').slice(0, 6)
          if (ziffern !== el.value) el.value = ziffern
          const neu: Block = { ...w.block }
          if (ziffern === '') delete neu[teil.feld]
          else neu[teil.feld] = Number(ziffern)
          w.tippe(neu, `zahl-${teil.feld}`)
        }}
      />
    </label>
    ${fehlt && html`<p class="wk-aw-hinweis" role="note">${fehlt.text}</p>`}
  </div>`
}
