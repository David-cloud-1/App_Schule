import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { hinweise, type LueckenTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import {
  alsLuecke,
  entferneLuecke,
  luecken,
  markierung,
  ohneHtmlReste,
  pruefeAuswahl,
  setzeZusammen,
  zerlege,
  type Auswahlpruefung,
  type Luecke,
  type Stueck,
} from '@/components/werkzeugkiste/editor/aufgabenwerk/luecken'
import { s, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Muster E – Markieren im Text (PROJ-114): Der Text steht wie für die Schüler da und lässt sich
 * direkt tippen. Lücken (bzw. Lösungen bei „Wörter markieren“) sind grüne Marken im Text.
 * Wort auswählen → schwebender Knopf „Als Lücke“. Klick auf eine Lücke öffnet ein kleines Fenster
 * (Wort, Tipp, weitere Schreibweisen, Lücke entfernen). Sternchen sieht man nur in der Rohfassung.
 *
 * Das Textfeld führt sein DOM selbst (Preact fasst es nicht an), damit der Cursor beim Tippen bleibt.
 * Neu geschrieben wird es nur bei Änderungen an den Lücken und bei einem neuen Stand von der App.
 */

const NEU = 'lt-neu'
const FENSTER = 'lt-fenster'
const FELDER = 'lt-felder'
const AUSWAHL = 'lt-auswahl'
const CURSOR = 'lt-cursor'

interface FensterFelder {
  wort: string
  varianten: string
  tipp: string
  leer: boolean
}
interface Schwebe {
  top: number
  left: number
  p: Auswahlpruefung
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** HTML des Textfelds: Text und Lücken-Marken */
export function lueckenHtml(teil: LueckenTeil, stuecke: Stueck[]): string {
  let k = -1
  return stuecke
    .map((st) => {
      if (st.art === 'text') return esc(st.text)
      k++
      const titel = [st.varianten.length ? `auch richtig: ${st.varianten.join(', ')}` : '', st.tipp ? `Tipp: ${st.tipp}` : ''].filter(Boolean).join(' · ')
      return (
        `<span class="wk-aw-luecke" contenteditable="false" tabindex="0" role="button" data-luecke="${k}" ` +
        `aria-label="${esc(`${teil.einzahl} ${k + 1}: ${st.wort}`)}"${titel ? ` title="${esc(titel)}"` : ''}>${esc(st.wort)}</span>`
      )
    })
    .join('')
}

type Token = { art: 'text'; node: Text } | { art: 'luecke'; node: Element; index: number } | { art: 'umbruch'; node: Node }

/** Der Inhalt des Textfelds in Lese-Reihenfolge (Text, Lücken-Marken, Zeilenumbrüche) */
function tokens(wurzel: Node): Token[] {
  const out: Token[] = []
  const lauf = (n: Node) => {
    n.childNodes.forEach((c) => {
      if (c.nodeType === 3) out.push({ art: 'text', node: c as Text })
      else if (c.nodeType === 1) {
        const el = c as Element
        const idx = el.getAttribute('data-luecke')
        if (idx !== null) out.push({ art: 'luecke', node: el, index: Number(idx) })
        else if (el.tagName === 'BR') out.push({ art: 'umbruch', node: el })
        else {
          // Absätze, die der Browser beim Tippen anlegt, sind Zeilenumbrüche
          if ((el.tagName === 'DIV' || el.tagName === 'P') && out.length && out[out.length - 1].art !== 'umbruch') out.push({ art: 'umbruch', node: el })
          lauf(el)
        }
      }
    })
  }
  lauf(wurzel)
  return out
}

/** Liest das Textfeld zurück in Stücke; Lücken kommen (unverändert) aus `vorher` */
export function liesTextfeld(feld: Node, vorher: Stueck[]): Stueck[] {
  const alte = luecken(vorher)
  const out: Stueck[] = []
  const text = (t: string) => {
    const v = out[out.length - 1]
    if (v?.art === 'text') v.text += t
    else out.push({ art: 'text', text: t })
  }
  for (const t of tokens(feld)) {
    if (t.art === 'text') text(t.node.data.replace(/ /g, ' '))
    else if (t.art === 'umbruch') text('\n')
    else if (alte[t.index]) out.push(alte[t.index])
  }
  return out.filter((x) => x.art !== 'text' || x.text)
}

/** Stelle im Klartext (Lücken zählen 0, Umbrüche 1 Zeichen) für eine Position im Textfeld */
export function textStelle(feld: Node, container: Node, offset: number): number {
  const r = document.createRange()
  r.setStart(container, offset)
  r.collapse(true)
  let n = 0
  for (const t of tokens(feld)) {
    if (t.art === 'text') {
      if (t.node === container) return n + offset
      // Endet dieser Text vor (oder genau an) der Stelle, zählt er ganz
      if (r.comparePoint(t.node, t.node.length) <= 0) n += t.node.length
      else return n
    } else {
      if (r.comparePoint(t.node, 0) < 0) n += t.art === 'umbruch' ? 1 : 0
      else return n
    }
  }
  return n
}

export function lueckenTeil(w: Werk, teil: LueckenTeil): VNode {
  const text = s(w.block[teil.feld])
  const stuecke = zerlege(teil.typ, text)
  const alle = luecken(stuecke)
  const fenster = typeof w.zustand[FENSTER] === 'number' && alle[w.zustand[FENSTER] as number] ? (w.zustand[FENSTER] as number) : null
  const schwebe = w.zustand[AUSWAHL] as Schwebe | undefined
  const fehlt = hinweise(w.block).filter((h) => h.wo.startsWith(teil.feld))
  const feldEl = () => w.ziel.querySelector<HTMLElement>('.wk-aw-lt')

  // Nach dem Zeichnen: Textfeld neu schreiben, wenn sich die Lücken geändert haben
  w.nachher(() => {
    const el = feldEl()
    if (!el || !w.zustand[NEU]) return
    w.zustand[NEU] = false
    el.innerHTML = lueckenHtml(teil, stuecke)
    el.dataset.awText = text
    // Cursor hinter die neue Lücke
    const nach = w.zustand[CURSOR]
    delete w.zustand[CURSOR]
    if (typeof nach === 'number') {
      const marke = el.querySelector(`[data-luecke="${nach}"]`)
      if (marke) {
        el.focus()
        const r = document.createRange()
        r.setStartAfter(marke)
        r.collapse(true)
        const sel = getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
      }
    }
  })

  const setzeText = (neu: Stueck[]) => ({ ...w.block, [teil.feld]: setzeZusammen(teil.typ, neu) })
  const neuSchreiben = () => {
    w.zustand[NEU] = true
  }

  const oeffne = (k: number) => {
    const l = alle[k]
    if (!l) return
    w.zustand[FENSTER] = k
    w.zustand[FELDER] = { wort: l.wort, varianten: l.varianten.join(', '), tipp: l.tipp, leer: false } satisfies FensterFelder
    w.zustand[AUSWAHL] = undefined
    w.fokus('lt-wort')
    w.zeichne()
  }
  const schliesse = () => {
    w.zustand[FENSTER] = null
    w.zustand[FELDER] = undefined
    w.zeichne()
    feldEl()?.focus()
  }

  const machLuecke = () => {
    const sw = w.zustand[AUSWAHL] as Schwebe | undefined
    if (!sw || !sw.p.ok) return
    const r = alsLuecke(stuecke, sw.p)
    w.zustand[AUSWAHL] = undefined
    w.zustand[CURSOR] = r.index
    neuSchreiben()
    getSelection()?.removeAllRanges()
    w.tue(setzeText(r.stuecke), 'luecke-neu')
    w.ansage(`${teil.einzahl} ${r.index + 1} angelegt: ${luecken(r.stuecke)[r.index]?.wort ?? ''}`)
  }

  const nachTippen = () => {
    const el = feldEl()
    if (!el) return
    const neu = liesTextfeld(el, stuecke)
    const block = setzeText(neu)
    el.dataset.awText = s(block[teil.feld])
    w.tippe(block, 'luecken-text')
  }

  const fensterAendern = (k: number, felder: FensterFelder) => {
    w.zustand[FELDER] = felder
    const wort = felder.wort.trim()
    if (!wort) {
      w.zustand[FELDER] = { ...felder, leer: true }
      w.zeichne()
      return
    }
    const l: Luecke = {
      art: 'luecke',
      wort,
      varianten: felder.varianten.split(/[,;/]/).map((v) => v.trim()).filter(Boolean),
      tipp: felder.tipp.trim(),
    }
    const neu = stuecke.map((st) => st)
    let n = -1
    for (let i = 0; i < neu.length; i++) if (neu[i].art === 'luecke' && ++n === k) neu[i] = { ...l, roh: markierung(teil.typ, l) }
    w.zustand[FELDER] = { ...felder, leer: false }
    neuSchreiben()
    w.tippe(setzeText(neu), `luecke-${k}`)
  }

  const fensterVNode = (k: number): VNode => {
    const f = (w.zustand[FELDER] as FensterFelder | undefined) ?? { wort: alle[k].wort, varianten: alle[k].varianten.join(', '), tipp: alle[k].tipp, leer: false }
    const marke = w.ziel.querySelector(`.wk-aw-lt [data-luecke="${k}"]`)
    const zr = w.ziel.getBoundingClientRect()
    const mr = marke?.getBoundingClientRect()
    const stil = mr ? `top:${Math.round(mr.bottom - zr.top + 6)}px;left:${Math.max(0, Math.round(mr.left - zr.left - 8))}px` : ''
    const name = `${teil.einzahl} ${k + 1}`
    return html`<div class="wk-aw-fenster" role="dialog" aria-label=${name} style=${stil}
      onKeyDown=${(e: KeyboardEvent) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT')) {
          e.preventDefault()
          e.stopPropagation()
          schliesse()
        }
      }}>
      <p class="wk-aw-fenster-titel">${name}</p>
      <label class="wk-aw-fenster-feld">${teil.typ === 'mark_words' ? 'Lösung' : 'Wort'}
        <input class="wk-aw-eingabe" data-aw-fokus="lt-wort" value=${f.wort}
          onInput=${(e: Event) => fensterAendern(k, { ...f, wort: (e.currentTarget as HTMLInputElement).value })} />
      </label>
      ${f.leer && html`<p class="wk-aw-hinweis" role="alert">Das Wort darf nicht leer sein. „${teil.typ === 'mark_words' ? 'Markierung' : 'Lücke'} entfernen“ lässt es als normalen Text stehen.</p>`}
      ${teil.varianten &&
      html`<label class="wk-aw-fenster-feld">Auch richtig (mit Komma trennen)
        <input class="wk-aw-eingabe" placeholder="z. B. Frachtbrief, CMR-Frachtbrief" value=${f.varianten}
          onInput=${(e: Event) => fensterAendern(k, { ...f, varianten: (e.currentTarget as HTMLInputElement).value })} />
      </label>`}
      ${teil.tipp &&
      html`<label class="wk-aw-fenster-feld">Tipp (optional)
        <input class="wk-aw-eingabe" placeholder="z. B. Berufsbezeichnung" value=${f.tipp}
          onInput=${(e: Event) => fensterAendern(k, { ...f, tipp: (e.currentTarget as HTMLInputElement).value })} />
      </label>`}
      <div class="wk-aw-fenster-knoepfe">
        <button type="button" class="wk-aw-knopf wk-aw-gefahr-knopf" onClick=${() => {
          w.zustand[FENSTER] = null
          w.zustand[FELDER] = undefined
          neuSchreiben()
          w.tue(setzeText(entferneLuecke(stuecke, k)), 'luecke-weg')
          w.ansage(`${name} entfernt, das Wort bleibt als Text stehen.`)
        }}>${teil.typ === 'mark_words' ? 'Markierung entfernen' : 'Lücke entfernen'}</button>
        <button type="button" class="wk-aw-knopf" onClick=${schliesse}>Schließen</button>
      </div>
    </div>`
  }

  const schwebeVNode = (sw: Schwebe): VNode =>
    html`<div class="wk-aw-schwebe" style=${`top:${sw.top}px;left:${sw.left}px`}>
      <button type="button" class="wk-aw-knopf wk-aw-fertig" aria-disabled=${sw.p.ok ? 'false' : 'true'}
        title=${sw.p.ok ? `${teil.knopf} (Enter)` : sw.p.grund}
        onMouseDown=${(e: MouseEvent) => e.preventDefault()}
        onClick=${() => (sw.p.ok ? machLuecke() : w.ansage(sw.p.grund))}>${teil.knopf}</button>
      ${!sw.p.ok && html`<span class="wk-aw-schwebe-grund">${sw.p.grund}</span>`}
    </div>`

  return html`<div class="wk-aw-lt-wrap">
    <div
      class=${teil.typ === 'mark_words' ? 'markiertext wk-aw-lt wk-aw-lt-markieren' : 'lueckentext wk-aw-lt'}
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      aria-label=${`Text mit ${teil.mehrzahl}. Wort auswählen und „${teil.knopf}“ klicken.`}
      data-platzhalter=${`Text schreiben, dann ein Wort auswählen und „${teil.knopf}“ klicken.`}
      data-aw-fokus="lt-text"
      spellcheck="true"
      lang="de"
      onInput=${nachTippen}
      onBeforeInput=${(e: InputEvent) => {
        if (e.inputType.startsWith('format')) e.preventDefault()
      }}
      onDrop=${(e: DragEvent) => e.preventDefault()}
      onPaste=${(e: ClipboardEvent) => {
        e.preventDefault()
        const t = (e.clipboardData?.getData('text/plain') ?? '').replace(/\r?\n/g, ' ')
        const sel = getSelection()
        if (!t || !sel || !sel.rangeCount) return
        const r = sel.getRangeAt(0)
        r.deleteContents()
        const knoten = document.createTextNode(t)
        r.insertNode(knoten)
        r.setStartAfter(knoten)
        r.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r)
        nachTippen()
      }}
      onClick=${(e: MouseEvent) => {
        const m = (e.target as Element).closest?.('[data-luecke]')
        if (m) oeffne(Number(m.getAttribute('data-luecke')))
      }}
      onKeyDown=${(e: KeyboardEvent) => {
        const m = (e.target as Element).closest?.('[data-luecke]')
        if (m && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          oeffne(Number(m.getAttribute('data-luecke')))
          return
        }
        if (e.key === 'Enter') {
          // Enter macht aus der Auswahl eine Lücke; neue Zeilen sehen die Schüler ohnehin nicht
          e.preventDefault()
          machLuecke()
        }
      }}
    ></div>
    <p class="wk-aw-tipp">So geht’s: Wort im Text markieren, dann „${teil.knopf}“ wählen.</p>
    ${schwebe && schwebeVNode(schwebe)}
    ${fenster !== null && fensterVNode(fenster)}
    ${teil.typ === 'drag_words' &&
    alle.length > 0 &&
    html`<div class="vorrat wk-aw-vorrat" aria-label="Wörter zum Ziehen (entstehen von selbst)">
      <span class="wk-aw-vorrat-titel">Wörter zum Ziehen:</span>
      ${alle.map((l, k) => html`<button type="button" class="chip" key=${k} onClick=${() => oeffne(k)}>${l.wort}</button>`)}
    </div>`}
    ${fehlt.map(
      (h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}
        ${h.wo.endsWith('-html') &&
        html` <button type="button" class="wk-aw-knopf" onClick=${() => {
          neuSchreiben()
          w.tue({ ...w.block, [teil.feld]: ohneHtmlReste(text) }, 'html-weg')
        }}>Entfernen</button>`}</p>`,
    )}
  </div>`
}

/** Beobachtet die Auswahl im Textfeld und zeigt den schwebenden Knopf; Rückgabe: zum Abmelden */
export function beobachteAuswahl(w: Werk, teil: LueckenTeil): () => void {
  const pruefe = () => pruefeAuswahlImFeld(w, teil)
  document.addEventListener('selectionchange', pruefe)
  return () => document.removeEventListener('selectionchange', pruefe)
}

/** Prüft einmal die Auswahl im Textfeld dieses Werks (auch für die Lückentext-Fragen im Kapiteltest) */
export function pruefeAuswahlImFeld(w: Werk, teil: LueckenTeil) {
  const pruefe = () => {
    const el = w.ziel.querySelector<HTMLElement>('.wk-aw-lt')
    const sel = getSelection()
    const vorher = w.zustand[AUSWAHL]
    if (!el || !sel || !sel.rangeCount || sel.isCollapsed || !el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      if (vorher) {
        w.zustand[AUSWAHL] = undefined
        w.zeichne()
      }
      return
    }
    const r = sel.getRangeAt(0)
    const von = textStelle(el, r.startContainer, r.startOffset)
    const bis = textStelle(el, r.endContainer, r.endOffset)
    const p = pruefeAuswahl(teil.typ, zerlege(teil.typ, s(w.block[teil.feld])), Math.min(von, bis), Math.max(von, bis))
    const zr = w.ziel.getBoundingClientRect()
    const rr = typeof r.getBoundingClientRect === 'function' ? r.getBoundingClientRect() : null
    w.zustand[AUSWAHL] = {
      top: rr ? Math.max(0, Math.round(rr.top - zr.top - 48)) : 0,
      left: rr ? Math.max(0, Math.round(rr.left - zr.left + rr.width / 2 - 50)) : 0,
      p,
    } satisfies Schwebe
    w.zeichne()
  }
  pruefe()
}

/** Beim Öffnen: Text erstmals schreiben; Klick auf eine Lücke öffnet ihr Fenster */
export function starteLuecken(w: Werk, eintrag: number | null) {
  w.zustand[NEU] = true
  if (eintrag !== null) {
    w.zustand[FENSTER] = eintrag
    w.fokus('lt-wort')
  }
}

/** Neuer Stand von der App: Text neu schreiben, Fenster und Auswahl zu */
export function lueckenNeuerStand(w: Werk) {
  w.zustand[NEU] = true
  w.zustand[FENSTER] = null
  w.zustand[FELDER] = undefined
  w.zustand[AUSWAHL] = undefined
}

/** Ansicht nach „Fertig“ (bis zum Neubau) */
export function lueckenAnsicht(w: Werk, teil: LueckenTeil): VNode {
  const st = zerlege(teil.typ, s(w.block[teil.feld]))
  return html`<p class=${teil.typ === 'mark_words' ? 'markiertext' : 'lueckentext'}>
    ${st.map((x) => (x.art === 'text' ? x.text : html`<span class="wk-aw-luecke">${x.wort}</span>`))}
  </p>`
}
