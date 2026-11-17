import { html } from 'htm/preact'
import type { VNode } from 'preact'
import type { Block, Eintrag, Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'
import { zeilenAusEinfuegen } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Listen-Mechanik für alle Muster mit Einträgen (A, C, später B, D, F): Hinzufügen, Löschen mit
 * Mindestzahl, Umsortieren per Griff (Maus und Finger) oder Alt + Pfeil, Einfügen mehrerer Zeilen.
 */

export interface ListenArt {
  feld: string
  einzahl: string
  mehrzahl: string
  mindestens: number
  hoechstens: number
  schluessel: string
  /** Neuer Eintrag mit diesem Text im ersten Feld */
  neu: (text: string) => Eintrag
  /** `data-aw-fokus` des ersten Felds von Eintrag i */
  fokus: (i: number) => string
  /** Für Listen, die nicht direkt im Block liegen (Texte, verschachtelte Listen): Einträge lesen … */
  holen?: () => Eintrag[]
  /** … und die geänderte Liste in einen neuen Block setzen */
  schreibe?: (l: Eintrag[]) => Block
}

interface Ziehen {
  von: number
  nach: number
}

export function listenAktionen(w: Werk, art: ListenArt) {
  const eintraege = art.holen ? art.holen() : ((Array.isArray(w.block[art.feld]) ? w.block[art.feld] : []) as Eintrag[])
  const mit = (l: Eintrag[]): Block => (art.schreibe ? art.schreibe(l) : { ...w.block, [art.feld]: l })
  const zKey = `ziehen-${art.feld}`
  const ziehen = () => w.zustand[zKey] as Ziehen | undefined
  const hinweis = (text: string) => {
    w.hinweis = { wo: art.feld, text }
    w.ansage(text)
    w.zeichne()
  }

  function loesche(i: number) {
    if (eintraege.length <= art.mindestens) {
      hinweis(`Mindestens ${art.mindestens} ${art.mindestens === 1 ? art.einzahl : art.mehrzahl} nötig – ändere den Text, statt zu löschen.`)
      return
    }
    w.tue(mit(eintraege.filter((_, j) => j !== i)), `loeschen-${art.schluessel}`, art.fokus(Math.max(0, Math.min(i, eintraege.length - 2))))
  }

  function verschiebe(von: number, nach: number) {
    if (nach < 0 || nach >= eintraege.length || von === nach) return
    const l = [...eintraege]
    const [x] = l.splice(von, 1)
    l.splice(nach, 0, x)
    w.tue(mit(l), 'umsortieren', art.fokus(nach))
    w.ansage(`${art.einzahl} ${von + 1} ist jetzt an Stelle ${nach + 1}.`)
  }

  /** Neue Einträge hinter `nach` (−1 = an den Anfang); `basis` = Liste, auf der aufgesetzt wird */
  function neu(nach: number, texte: string[] = [''], basis: Eintrag[] = eintraege) {
    const platz = art.hoechstens - basis.length
    if (platz <= 0) {
      hinweis(`Höchstens ${art.hoechstens} ${art.mehrzahl} möglich.`)
      return
    }
    const dazu = texte.slice(0, platz).map(art.neu)
    const l = [...basis]
    l.splice(nach + 1, 0, ...dazu)
    w.tue(mit(l), `neu-${art.schluessel}`, art.fokus(nach + dazu.length))
    if (texte.length > platz) {
      w.hinweis = { wo: art.feld, text: `Nur ${platz} von ${texte.length} Zeilen übernommen – höchstens ${art.hoechstens} ${art.mehrzahl}.` }
      w.zeichne()
    }
  }

  /** Einfügen mehrerer Zeilen in das erste Feld von Eintrag i */
  function einfuegen(i: number, textFeld: string) {
    return (e: ClipboardEvent) => {
      const z = zeilenAusEinfuegen(e.clipboardData?.getData('text/plain') ?? '')
      if (z.length < 2) return
      e.preventDefault()
      // Leere Zeile: die erste eingefügte Zeile kommt hinein, die übrigen werden neue Einträge darunter
      const eigen = String(eintraege[i]?.[textFeld] ?? '').trim()
      if (eigen) neu(i, z)
      else neu(i, z.slice(1), eintraege.map((x, j) => (j === i ? { ...x, [textFeld]: z[0] } : x)))
    }
  }

  /** Alt + Pfeil in einem Feld */
  function tasten(i: number, e: KeyboardEvent): boolean {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      verschiebe(i, i + (e.key === 'ArrowDown' ? 1 : -1))
      return true
    }
    return false
  }

  const zeilenEls = () => Array.from(w.ziel.querySelectorAll<HTMLElement>(`[data-aw-liste="${art.feld}"] > [data-aw-zeile]`))

  /** Griff zum Ziehen (Maus und Finger) – auch per Pfeiltasten bedienbar */
  function griff(i: number): VNode {
    return html`<button
      type="button"
      class="wk-aw-wz wk-aw-griff"
      aria-label=${`${art.einzahl} ${i + 1} verschieben (Alt + Pfeiltasten)`}
      title="Ziehen zum Umsortieren"
      onPointerDown=${(e: PointerEvent) => {
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        w.zustand[zKey] = { von: i, nach: i }
        w.zeichne()
      }}
      onPointerMove=${(e: PointerEvent) => {
        const z = ziehen()
        if (!z) return
        const els = zeilenEls()
        let nach = els.length - 1
        for (let j = 0; j < els.length; j++) {
          const r = els[j].getBoundingClientRect()
          if (e.clientY < r.top + r.height / 2) {
            nach = j > z.von ? j - 1 : j
            break
          }
        }
        if (nach !== z.nach) {
          w.zustand[zKey] = { ...z, nach }
          w.zeichne()
        }
      }}
      onPointerUp=${() => {
        const z = ziehen()
        delete w.zustand[zKey]
        if (z && z.nach !== z.von) verschiebe(z.von, z.nach)
        else w.zeichne()
      }}
      onPointerCancel=${() => {
        delete w.zustand[zKey]
        w.zeichne()
      }}
      onKeyDown=${(e: KeyboardEvent) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          verschiebe(i, i + (e.key === 'ArrowDown' ? 1 : -1))
        }
      }}
    >⠿</button>`
  }

  function weg(i: number): VNode {
    const minimum = eintraege.length <= art.mindestens
    return html`<button
      type="button"
      class="wk-aw-wz wk-aw-weg"
      aria-label=${`${art.einzahl} ${i + 1} löschen`}
      aria-disabled=${minimum ? 'true' : 'false'}
      title=${minimum ? `Mindestens ${art.mindestens} ${art.mindestens === 1 ? art.einzahl : art.mehrzahl} nötig` : 'Löschen'}
      onClick=${() => loesche(i)}
    >×</button>`
  }

  /** Klassen und Stil einer Zeile während des Ziehens */
  function zeilenZiehen(i: number): { klasse: string; stil: string } {
    const z = ziehen()
    if (!z) return { klasse: '', stil: '' }
    return {
      klasse: z.von === i ? ' wk-aw-gezogen' : '',
      stil: z.nach === i && z.von !== i ? `box-shadow:0 ${z.nach > z.von ? '' : '-'}3px 0 #1d4ed8` : '',
    }
  }

  function neuKnopf(): VNode | null {
    if (eintraege.length >= art.hoechstens) return null
    return html`<button type="button" class="wk-aw-neu" onClick=${() => neu(eintraege.length - 1)}>＋ ${art.einzahl} hinzufügen</button>`
  }

  function hinweisZeile(): VNode | null {
    return w.hinweis?.wo === art.feld ? html`<p class="wk-aw-hinweis" role="alert">${w.hinweis.text}</p>` : null
  }

  return { eintraege, mit, loesche, verschiebe, neu, einfuegen, tasten, griff, weg, zeilenZiehen, neuKnopf, hinweisZeile }
}
