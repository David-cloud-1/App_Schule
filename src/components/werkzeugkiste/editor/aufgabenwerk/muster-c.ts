import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { hinweise, type PaareTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { listenAktionen } from '@/components/werkzeugkiste/editor/aufgabenwerk/listen'
import { s, wachse, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Muster C – Paare (PROJ-114).
 *  - **kurz** (Kreuzworträtsel …): beide Teile nebeneinander in einer Zeile (schmal untereinander).
 *  - **lang** (Begriffe zum Aufklappen, Karten): wie die Schülersicht als Aufklapp-Leiste; ein Klick klappt
 *    den Eintrag auf, der zweite Teil steht darunter, immer nur einer offen. Fehlt er, ist der Eintrag orange markiert.
 */

/** Welcher Eintrag ist aufgeklappt? (nur lang) */
export const offenSchluessel = (feld: string) => `auf-${feld}`

export function paareTeil(w: Werk, teil: PaareTeil): VNode {
  const L = listenAktionen(w, {
    feld: teil.feld,
    einzahl: teil.einzahl,
    mehrzahl: teil.mehrzahl,
    mindestens: teil.mindestens,
    hoechstens: teil.hoechstens,
    schluessel: teil.schluessel,
    neu: (t) => ({ [teil.links.feld]: t, [teil.rechts.feld]: '' }),
    fokus: (i) => `links-${teil.feld}-${i}`,
  })
  const eintraege = L.eintraege
  const oKey = offenSchluessel(teil.feld)
  const offen = typeof w.zustand[oKey] === 'number' ? (w.zustand[oKey] as number) : -1
  const setze = (i: number, feld: string, wert: string) => L.mit(eintraege.map((x, j) => (j === i ? { ...x, [feld]: wert } : x)))
  const klappe = (i: number) => {
    if (offen === i) return
    w.zustand[oKey] = i
    w.zeichne()
  }
  const fehlt = hinweise(w.block).filter((h) => h.wo === teil.feld)

  const zeilen = eintraege.map((e, i) => {
    const nr = i + 1
    const links = s(e[teil.links.feld])
    const rechts = s(e[teil.rechts.feld])
    const z = L.zeilenZiehen(i)
    const linksFeld = html`<input
      class=${`wk-aw-feld${teil.lang ? ' wk-aw-k-begriff' : ''}`}
      data-aw-fokus=${`links-${teil.feld}-${i}`}
      aria-label=${`${teil.links.label} ${nr}`}
      placeholder=${`${teil.links.label} ${nr}`}
      value=${links}
      spellcheck="true"
      lang="de"
      onFocus=${() => teil.lang && klappe(i)}
      onInput=${(ev: Event) => w.tippe(setze(i, teil.links.feld, (ev.currentTarget as HTMLInputElement).value), `${teil.schluessel}-${i}-links`)}
      onPaste=${L.einfuegen(i, teil.links.feld)}
      onKeyDown=${(ev: KeyboardEvent) => {
        if (L.tasten(i, ev)) return
        const el = ev.currentTarget as HTMLInputElement
        if (ev.key === 'Enter') {
          ev.preventDefault()
          if (teil.lang) w.zustand[oKey] = i
          w.fokus(`rechts-${teil.feld}-${i}`)
          w.zeichne()
        } else if (ev.key === 'Backspace' && el.value === '' && !rechts && eintraege.length > teil.mindestens) {
          ev.preventDefault()
          L.loesche(i)
        }
      }}
    />`
    const rechtsFeld = html`<textarea
      class="wk-aw-feld"
      rows="1"
      data-aw-fokus=${`rechts-${teil.feld}-${i}`}
      aria-label=${`${teil.rechts.label} zu ${teil.links.label} ${nr}`}
      placeholder=${teil.rechts.platzhalter}
      value=${rechts}
      spellcheck="true"
      lang="de"
      onInput=${(ev: Event) => {
        const el = ev.currentTarget as HTMLTextAreaElement
        wachse(el)
        w.tippe(setze(i, teil.rechts.feld, el.value), `${teil.schluessel}-${i}-rechts`)
      }}
      onKeyDown=${(ev: KeyboardEvent) => {
        if (L.tasten(i, ev)) return
        // Enter: zum nächsten Eintrag (oder neuer); Umschalt+Enter = neue Zeile
        if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault()
          if (i < eintraege.length - 1) {
            w.fokus(`links-${teil.feld}-${i + 1}`)
            w.zeichne()
          } else L.neu(i)
        }
      }}
    ></textarea>`

    if (!teil.lang) {
      return html`<li class=${`wk-aw-zeile wk-aw-paar${z.klasse}`} data-aw-zeile key=${i} style=${z.stil}>
        <span class="wk-aw-nr" aria-hidden="true">${nr}</span>
        <div class="wk-aw-paar-felder">${linksFeld}${rechtsFeld}</div>
        ${L.griff(i)} ${L.weg(i)}
      </li>`
    }
    const auf = offen === i
    const ohne = !rechts.trim()
    return html`<li class=${`wk-aw-k${auf ? ' wk-aw-k-offen' : ''}${ohne && !auf ? ' wk-aw-k-fehlt' : ''}${z.klasse}`} data-aw-zeile key=${i} style=${z.stil}>
      <div class="wk-aw-zeile wk-aw-k-kopf">
        <button
          type="button"
          class="wk-aw-wz wk-aw-k-pfeil"
          aria-expanded=${auf ? 'true' : 'false'}
          aria-label=${`${teil.einzahl} ${nr} ${auf ? 'ist aufgeklappt' : 'aufklappen'}`}
          onClick=${() => {
            w.zustand[oKey] = auf ? -1 : i
            if (!auf) w.fokus(`rechts-${teil.feld}-${i}`)
            w.zeichne()
          }}
        >${auf ? '▾' : '▸'}</button>
        ${linksFeld}
        ${ohne && !auf && html`<span class="wk-aw-fehlt">${teil.fehlt}</span>`}
        ${L.griff(i)} ${L.weg(i)}
      </div>
      ${auf && html`<div class="wk-aw-k-text">${rechtsFeld}</div>`}
    </li>`
  })

  return html`<div class=${teil.lang ? 'klappliste wk-aw-klapp' : 'wk-aw-paare'}>
    <ol class="wk-aw-liste" data-aw-liste=${teil.feld}>${zeilen}</ol>
    ${L.neuKnopf()} ${L.hinweisZeile()}
    ${fehlt.map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
  </div>`
}

/** Ansicht nach „Fertig“ (bis zum Neubau) */
export function paareAnsicht(w: Werk, teil: PaareTeil): VNode {
  const l = (Array.isArray(w.block[teil.feld]) ? w.block[teil.feld] : []) as Record<string, unknown>[]
  if (teil.lang)
    return html`<div class="klappliste">${l.map((e) => html`<details><summary>${s(e[teil.links.feld])}</summary></details>`)}</div>`
  return html`<ol>${l.map((e) => html`<li>${s(e[teil.links.feld])} – ${s(e[teil.rechts.feld])}</li>`)}</ol>`
}
