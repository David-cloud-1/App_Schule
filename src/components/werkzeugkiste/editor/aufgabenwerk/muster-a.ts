import { html } from 'htm/preact'
import type { VNode } from 'preact'
import type { AntwortenTeil, WahrFalschTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { listenAktionen } from '@/components/werkzeugkiste/editor/aufgabenwerk/listen'
import { hinweise } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { s, wachse, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Muster A – Antworten (PROJ-114): Kreis vor der Antwort macht sie richtig, Sprechblase öffnet
 * die Rückmeldung, Enter springt weiter oder legt eine neue Antwort an.
 */

function offen(w: Werk, schluessel: string): Set<number> {
  const k = `rueck-${schluessel}`
  if (!(w.zustand[k] instanceof Set)) w.zustand[k] = new Set<number>()
  return w.zustand[k] as Set<number>
}

function blase(w: Werk, schluessel: string, nr: number, label: string, voll: boolean): VNode {
  const o = offen(w, schluessel)
  const auf = o.has(nr)
  return html`<button
    type="button"
    class="wk-aw-wz"
    aria-label=${`${label}${voll ? ' (vorhanden)' : ''}`}
    title="Rückmeldung"
    aria-expanded=${auf ? 'true' : 'false'}
    data-voll=${voll ? 'true' : 'false'}
    onClick=${() => {
      if (auf) o.delete(nr)
      else {
        o.add(nr)
        w.fokus(`rueck-${schluessel}-${nr}`)
      }
      w.zeichne()
    }}
  >💬</button>`
}

export function antwortenTeil(w: Werk, teil: AntwortenTeil): VNode {
  const L = listenAktionen(w, {
    feld: teil.feld,
    einzahl: teil.einzahl,
    mehrzahl: teil.mehrzahl,
    mindestens: teil.mindestens,
    hoechstens: teil.hoechstens,
    schluessel: teil.schluessel,
    neu: (t) => ({ [teil.textFeld]: t, [teil.richtigFeld]: false, [teil.rueckmeldungFeld]: '' }),
    fokus: (i) => `antwort-${i}`,
  })
  const antworten = L.eintraege
  const fehlt = hinweise(w.block).filter((h) => h.wo.startsWith(teil.feld))
  const o = offen(w, teil.feld)

  const zeilen = antworten.map((a, i) => {
    const richtig = a[teil.richtigFeld] === true
    const rueck = s(a[teil.rueckmeldungFeld])
    const nr = i + 1
    const z = L.zeilenZiehen(i)
    return html`<li class=${`wk-aw-zeile${richtig ? ' wk-aw-richtig' : ''}${z.klasse}`} data-aw-zeile key=${i} style=${z.stil}>
        <button
          type="button"
          class="wk-aw-kreis"
          role="radio"
          aria-checked=${richtig ? 'true' : 'false'}
          aria-label=${`${teil.einzahl} ${nr} ist richtig`}
          data-aw-fokus=${`kreis-${i}`}
          onClick=${() => {
            w.tue(L.mit(antworten.map((x, j) => ({ ...x, [teil.richtigFeld]: j === i }))), 'richtig')
            w.ansage(`${teil.einzahl} ${nr} ist jetzt richtig.`)
          }}
        ></button>
        <textarea
          class="wk-aw-feld antwort"
          rows="1"
          data-aw-fokus=${`antwort-${i}`}
          aria-label=${`${teil.einzahl} ${nr}`}
          placeholder=${`${teil.einzahl} ${nr}`}
          value=${s(a[teil.textFeld])}
          spellcheck="true"
          lang="de"
          onInput=${(e: Event) => {
            const el = e.currentTarget as HTMLTextAreaElement
            wachse(el)
            w.tippe(L.mit(antworten.map((x, j) => (j === i ? { ...x, [teil.textFeld]: el.value } : x))), `antwort-${i}-text`)
          }}
          onPaste=${L.einfuegen(i, teil.textFeld)}
          onKeyDown=${(e: KeyboardEvent) => {
            if (L.tasten(i, e)) return
            const el = e.currentTarget as HTMLTextAreaElement
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (i < antworten.length - 1) {
                w.fokus(`antwort-${i + 1}`)
                w.zeichne()
              } else L.neu(i)
            } else if (e.key === 'Backspace' && el.value === '' && antworten.length > teil.mindestens) {
              e.preventDefault()
              L.loesche(i)
            }
          }}
        ></textarea>
        ${blase(w, teil.feld, i, `Rückmeldung zu ${teil.einzahl} ${nr}`, !!rueck)} ${L.griff(i)} ${L.weg(i)}
      </li>
      ${o.has(i) &&
      html`<li class="wk-aw-rueckzeile" key=${`r${i}`}>
        <input
          class="wk-aw-feld wk-aw-rueck"
          data-aw-fokus=${`rueck-${teil.feld}-${i}`}
          aria-label=${`Rückmeldung, wenn ${teil.einzahl} ${nr} gewählt wird`}
          placeholder=${richtig ? 'Rückmeldung, z. B. „Genau – weil …“' : 'Rückmeldung, z. B. „Nicht ganz – denk an …“'}
          value=${rueck}
          onInput=${(e: Event) =>
            w.tippe(L.mit(antworten.map((x, j) => (j === i ? { ...x, [teil.rueckmeldungFeld]: (e.currentTarget as HTMLInputElement).value } : x))), `antwort-${i}-rueck`)}
          onKeyDown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              w.fokus(`antwort-${i}`)
              w.zeichne()
            }
          }}
        />
      </li>`}`
  })

  return html`<div class="antworten" role="radiogroup" aria-label="Richtige Antwort wählen">
    <ol class="wk-aw-liste" data-aw-liste=${teil.feld}>${zeilen}</ol>
    ${L.neuKnopf()} ${L.hinweisZeile()}
    ${fehlt.map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
  </div>`
}

export function wahrFalschTeil(w: Werk, teil: WahrFalschTeil): VNode {
  const b = w.block
  const wahr = b[teil.feld] === true
  const zeilen = [
    { nr: 0, text: 'Wahr', richtig: wahr },
    { nr: 1, text: 'Falsch', richtig: !wahr },
  ]
  const o = offen(w, teil.feld)
  return html`<div class="antworten" role="radiogroup" aria-label="Die Aussage ist">
    <ol class="wk-aw-liste">
      ${zeilen.map((z) => {
        // Die Rückmeldung hängt an der Antwort: an der richtigen „richtig“, an der anderen „falsch“
        const feld = z.richtig ? teil.rueckmeldungRichtig : teil.rueckmeldungFalsch
        const rueck = s(b[feld])
        return html`<li class=${`wk-aw-zeile${z.richtig ? ' wk-aw-richtig' : ''}`} key=${z.nr}>
            <button
              type="button"
              class="wk-aw-kreis"
              role="radio"
              aria-checked=${z.richtig ? 'true' : 'false'}
              aria-label=${`Die Aussage ist ${z.text.toLowerCase()}`}
              data-aw-fokus=${`antwort-${z.nr}`}
              onClick=${() => {
                if (z.richtig) return
                // Mit der Lösung tauschen auch die Rückmeldungen die Seite, damit sie an „ihrer“ Antwort bleiben
                w.tue(
                  { ...b, [teil.feld]: z.nr === 0, [teil.rueckmeldungRichtig]: s(b[teil.rueckmeldungFalsch]), [teil.rueckmeldungFalsch]: s(b[teil.rueckmeldungRichtig]) },
                  'richtig',
                )
                w.ansage(`Die Aussage ist jetzt ${z.text.toLowerCase()}.`)
              }}
            ></button>
            <span class="antwort" style="flex:1">${z.text}</span>
            ${blase(w, teil.feld, z.nr, `Rückmeldung bei Antwort „${z.text}“`, !!rueck)}
          </li>
          ${o.has(z.nr) &&
          html`<li class="wk-aw-rueckzeile" key=${`r${z.nr}`}>
            <input
              class="wk-aw-feld wk-aw-rueck"
              data-aw-fokus=${`rueck-${teil.feld}-${z.nr}`}
              aria-label=${`Rückmeldung bei Antwort „${z.text}“`}
              placeholder=${z.richtig ? 'Rückmeldung bei richtiger Antwort' : 'Rückmeldung bei falscher Antwort'}
              value=${rueck}
              onInput=${(e: Event) => w.tippe({ ...w.block, [feld]: (e.currentTarget as HTMLInputElement).value }, `rueck-${feld}`)}
            />
          </li>`}`
      })}
    </ol>
  </div>`
}

/** Ansicht nach „Fertig“ (bis zum Neubau) */
export function antwortenAnsicht(w: Werk, teil: AntwortenTeil | WahrFalschTeil): VNode {
  if (teil.art === 'wahrfalsch') return html`<div class="antworten waagrecht"><button class="antwort">Wahr</button><button class="antwort">Falsch</button></div>`
  const l = (Array.isArray(w.block[teil.feld]) ? w.block[teil.feld] : []) as Record<string, unknown>[]
  return html`<div class="antworten">${l.map((a) => html`<button class="antwort">${s(a[teil.textFeld])}</button>`)}</div>`
}
