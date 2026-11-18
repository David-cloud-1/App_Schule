import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { echterName, eintragsName, hinweise, type EintragFeld, type EintraegeTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { antwortenListe } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-a'
import { stringListe } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-b'
import { listenAktionen } from '@/components/werkzeugkiste/editor/aufgabenwerk/listen'
import { alsZeit, ausZeit, liste, s, wachse, type Eintrag, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Muster F (Schritte) und C kurz (Memory, Kopfrechnen) – PROJ-114: jeder Eintrag eine Zeile mit
 * mehreren Feldern. Seltenes (Hinweis, Kommentar, Quelle) steht hinter dem Fragezeichen-Knopf darunter.
 */

/** Zustandsschlüssel der aufgeklappten Einträge – beginnt mit „rueck-“, damit Umbauten ihn zurücksetzen */
const offenKey = (feld: string) => `rueck-extra-${feld}`

function offene(w: Werk, feld: string): Set<number> {
  const k = offenKey(feld)
  if (!(w.zustand[k] instanceof Set)) w.zustand[k] = new Set<number>()
  return w.zustand[k] as Set<number>
}

/** Ganze Zahl wird als Zahl gespeichert, sonst als Text (so liest der Kern beides) */
const zahlOderText = (v: string): string | number => (/^-?\d{1,15}$/.test(v.trim()) ? Number(v.trim()) : v)

const wert = (e: Eintrag, f: EintragFeld) => {
  const v = e[eintragsName(e, f.namen)]
  return Array.isArray(v) ? v.map(s).join(' / ') : s(v)
}
const texte = (v: unknown): string[] => (Array.isArray(v) ? v.map(s) : [])

export function eintraegeTeil(w: Werk, teil: EintraegeTeil): VNode {
  const zeilenFelder = teil.felder.filter((f) => !f.knopf)
  const knopfFelder = teil.felder.filter((f) => f.knopf)
  const erstes = zeilenFelder[0]
  const L = listenAktionen(w, {
    feld: teil.feld,
    einzahl: teil.einzahl,
    mehrzahl: teil.mehrzahl,
    mindestens: teil.mindestens,
    hoechstens: teil.hoechstens,
    schluessel: teil.schluessel,
    neu: (t) => ({ ...(teil.vorlage ? JSON.parse(JSON.stringify(teil.vorlage)) : {}), [erstes.namen[0]]: t, ...(teil.unterliste ? { [teil.unterliste.feld]: Array<string>(teil.unterliste.mindestens).fill('') } : {}) }),
    fokus: (i) => `ef-${i}-0`,
  })
  const eintraege = L.eintraege
  const auf = offene(w, teil.feld)
  // Hinweise zu Antworten stehen an der Antwortenliste, nicht unten
  const fehlt = hinweise(w.block).filter((h) => h.wo.startsWith(teil.feld) && !/-(unter|richtig)-\d+$|-antwort$/.test(h.wo))
  const setze = (i: number, f: EintragFeld, v: string) =>
    L.mit(
      eintraege.map((x, j) => {
        if (j !== i) return x
        const name = eintragsName(x, f.namen)
        // Eine vorhandene Liste bleibt eine Liste („a / b“ wird zu [a, b])
        if (f.liste && Array.isArray(x[name])) return { ...x, [name]: v.split('/').map((y) => y.trim()) }
        return { ...x, [name]: f.zahl ? zahlOderText(v) : v }
      }),
    )
  const leer = (e: Eintrag) => teil.felder.every((f) => !wert(e, f).trim())

  const feldEl = (e: Eintrag, i: number, f: EintragFeld, k: number, extra: boolean): VNode => {
    const nr = i + 1
    if (f.zeit) {
      const zKey = `rueck-zeit-${i}`
      const text = typeof w.zustand[zKey] === 'string' ? (w.zustand[zKey] as string) : alsZeit(e[eintragsName(e, f.namen)])
      const gueltig = text.trim() === '' || ausZeit(text) !== null
      return html`<input
        class="wk-aw-feld wk-aw-ef-feld"
        data-aw-fokus=${`ef-${i}-${k}`}
        aria-label=${`${f.label} (${teil.einzahl} ${nr}), als mm:ss`}
        aria-invalid=${gueltig ? 'false' : 'true'}
        title=${gueltig ? 'Minute:Sekunde, z. B. 2:30' : 'Bitte als mm:ss eingeben, z. B. 2:30'}
        placeholder=${f.platzhalter}
        inputmode="numeric"
        value=${text}
        onInput=${(ev: Event) => {
          const v = (ev.currentTarget as HTMLInputElement).value
          w.zustand[zKey] = v
          const sek = ausZeit(v)
          if (sek === null && v.trim() !== '') {
            w.zeichne()
            return
          }
          const name = eintragsName(e, f.namen)
          const neu = L.mit(eintraege.map((x, j) => (j === i ? { ...x, [name]: sek ?? 0 } : x)))
          w.tippe(neu, `${teil.schluessel}-${i}-zeit`)
        }}
        onBlur=${() => {
          delete w.zustand[zKey]
          w.zeichne()
        }}
        onKeyDown=${(ev: KeyboardEvent) => {
          if (L.tasten(i, ev)) return
          if (ev.key === 'Enter') {
            ev.preventDefault()
            w.fokus(`ef-${i}-${k + 1}`)
            w.zeichne()
          }
        }}
      />`
    }
    return html`<textarea
      class="wk-aw-feld wk-aw-ef-feld"
      rows="1"
      data-aw-fokus=${extra ? `ex-${i}-${k}` : `ef-${i}-${k}`}
      aria-label=${`${f.label} (${teil.einzahl} ${nr})`}
      placeholder=${f.platzhalter}
      value=${wert(e, f)}
      spellcheck=${f.zahl ? 'false' : 'true'}
      lang="de"
      onInput=${(ev: Event) => {
        const el = ev.currentTarget as HTMLTextAreaElement
        wachse(el)
        w.tippe(setze(i, f, el.value), `${teil.schluessel}-${i}-${f.namen[0]}`)
      }}
      onPaste=${!extra && k === 0 ? L.einfuegen(i, f.namen[0]) : undefined}
      onKeyDown=${(ev: KeyboardEvent) => {
        if (L.tasten(i, ev)) return
        const el = ev.currentTarget as HTMLTextAreaElement
        if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault()
          // Nächstes Feld der Zeile, sonst der nächste Eintrag (oder ein neuer)
          if (!extra && k < zeilenFelder.length - 1) w.fokus(`ef-${i}-${k + 1}`)
          else if (!extra && teil.unterAntworten) w.fokus(`a${i}-0`)
          else if (!extra && teil.unterliste) w.fokus(`zeile-${teil.feld}-${i}-${teil.unterliste.feld}-0`)
          else if (i < eintraege.length - 1) w.fokus(`ef-${i + 1}-0`)
          else {
            L.neu(i)
            return
          }
          w.zeichne()
        } else if (ev.key === 'Backspace' && el.value === '' && !extra && k === 0 && leer(e) && eintraege.length > teil.mindestens) {
          ev.preventDefault()
          L.loesche(i)
        }
      }}
    ></textarea>`
  }

  const unterListe = (i: number, u: NonNullable<EintraegeTeil['unterliste']>) =>
    stringListe(w, {
      feld: `${teil.feld}-${i}-${u.feld}`,
      titel: u.titel,
      einzahl: u.einzahl,
      mehrzahl: u.mehrzahl,
      mindestens: u.mindestens,
      hoechstens: u.hoechstens,
      schluessel: u.schluessel,
      platzhalter: u.platzhalter,
      holen: () => texte(eintraege[i]?.[u.feld]),
      schreibe: (l) => L.mit(eintraege.map((x, j) => (j === i ? { ...x, [u.feld]: l } : x))),
    })

  const unterAntworten = (i: number, u: NonNullable<EintraegeTeil['unterAntworten']>) => {
    const name = echterName(eintraege[i] ?? {}, u.namen, u.namen[0])
    const id = `${teil.feld}-${i}-antw`
    return antwortenListe(w, {
      feld: id,
      einzahl: u.einzahl,
      mehrzahl: u.mehrzahl,
      mindestens: u.mindestens,
      hoechstens: u.hoechstens,
      schluessel: u.schluessel,
      textFeld: 'text',
      richtigFeld: 'correct',
      rueckmeldungFeld: 'feedback',
      praefix: `a${i}`,
      holen: () => liste(eintraege[i]?.[name]),
      schreibe: (l) => L.mit(eintraege.map((x, j) => (j === i ? { ...x, [name]: l } : x))),
      notizen: hinweise(w.block).filter((h) => h.wo === `${teil.feld}-unter-${i}` || h.wo === `${teil.feld}-richtig-${i}` || h.wo === `${teil.feld}-leer-${i}-antwort`),
    })
  }

  const zeilen = eintraege.map((e, i) => {
    const z = L.zeilenZiehen(i)
    const nr = i + 1
    const offen = auf.has(i)
    const voll = knopfFelder.some((f) => wert(e, f).trim())
    // Kurze Felder (Einheit, Zeitpunkt) brauchen eine Mindestbreite, sonst bricht „Paletten“ mitten im Wort um
    const spalten = zeilenFelder.map((f) => `minmax(${f.max <= 40 ? '5.5em' : '0'},${f.gewicht}fr)`).join(' ')
    return html`<li class=${`wk-aw-eintrag${z.klasse}`} data-aw-zeile key=${i} style=${z.stil}>
      <div class="wk-aw-zeile">
        <span class="wk-aw-nr" aria-hidden="true">${nr}</span>
        <div class="wk-aw-ef" style=${`grid-template-columns:${spalten}`}>${zeilenFelder.map((f, k) => feldEl(e, i, f, k, false))}</div>
        ${knopfFelder.length > 0 &&
        html`<button
          type="button"
          class="wk-aw-wz"
          aria-label=${`${knopfFelder.map((f) => f.label).join(', ')} zu ${teil.einzahl} ${nr}${voll ? ' (vorhanden)' : ''}`}
          title=${knopfFelder.map((f) => f.label).join(' · ')}
          aria-expanded=${offen ? 'true' : 'false'}
          data-voll=${voll ? 'true' : 'false'}
          onClick=${() => {
            if (offen) auf.delete(i)
            else {
              auf.add(i)
              w.fokus(`ex-${i}-0`)
            }
            w.zeichne()
          }}
        >?</button>`}
        ${L.griff(i)} ${L.weg(i)}
      </div>
      ${teil.unterliste &&
      html`<div class="wk-aw-unter">${unterListe(i, teil.unterliste)}</div>`}
      ${teil.unterAntworten && html`<div class="wk-aw-unter">${unterAntworten(i, teil.unterAntworten)}</div>`}
      ${offen &&
      html`<div class="wk-aw-extra">${knopfFelder.map((f, k) => html`<label class="wk-aw-extra-feld" key=${k}><span>${f.label}</span>${feldEl(e, i, f, k, true)}</label>`)}</div>`}
    </li>`
  })

  return html`<div class="wk-aw-eintraege">
    <ol class="wk-aw-liste" data-aw-liste=${teil.feld}>${zeilen}</ol>
    ${L.neuKnopf()} ${L.hinweisZeile()}
    ${fehlt.map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
  </div>`
}

/** Ansicht nach „Fertig“ (bis zum Neubau) */
export function eintraegeAnsicht(w: Werk, teil: EintraegeTeil): VNode {
  const l = (Array.isArray(w.block[teil.feld]) ? w.block[teil.feld] : []) as Eintrag[]
  const f = teil.felder.filter((x) => !x.knopf)
  return html`<ol>${l.map((e) => html`<li>${f.map((x) => wert(e, x)).filter(Boolean).join(' – ')}</li>`)}</ol>`
}
