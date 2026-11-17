import { html } from 'htm/preact'
import { render, type VNode } from 'preact'
import { AW_CSS } from '@/components/werkzeugkiste/editor/aufgabenwerk/design'
import { BAUPLAENE, hatBauplan, teileVon, type EintragOrt } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { antwortenAnsicht } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-a'
import { erstesFeldVon, normalisiere, zeichneTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/teile'
import { zeilenAnsicht } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-b'
import { gruppenAnsicht, zuordnenAnsicht } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-d'
import { eintraegeAnsicht } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-f'
import { offenSchluessel, paareAnsicht } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-c'
import { beobachteAuswahl, lueckenAnsicht, lueckenNeuerStand, starteLuecken } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-e'
import { TIPP_PAUSE_MS, s, wachse, type Block, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

export { TIPP_PAUSE_MS, zeilenAusEinfuegen } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Aufgabenwerk (PROJ-114): macht eine Aufgabe **in der abgeschotteten Vorschau-Seite** an Ort
 * und Stelle bearbeitbar. Sie behält das Aussehen der Schülersicht; Texte werden zu Feldern.
 *
 * Grundregel wie überall im Baukasten: **Die Seite schlägt vor, die App prüft und speichert.**
 * Jede Änderung geht als ganzer neuer Block an die App (`wkAufgabeAenderung`), Aktionen sofort,
 * Tippen nach kurzer Pause. Den Kern-Neubau startet die App erst nach „Fertig“.
 *
 * Aufbau: dieser Rahmen (Schild, Fußleiste, ⋯, Zustand, Meldungen) + je ein Baustein pro Muster
 * (`muster-a.ts`, `muster-c.ts`, `muster-e.ts`) + gemeinsame Listen-Mechanik (`listen.ts`).
 *
 * Gebaut wird es mit `npm run aufgabenwerk:bauen` zu `aufgabenwerk-bundle.generated.ts`.
 */

export interface AufgabeOptionen {
  /** Die Aufgabe in der Seite (`section` mit `data-wk`) */
  ziel: HTMLElement
  /** Gespeicherter Block (von der App) */
  block: Block
  marke: string
  /** Name des Typs für die Fußleiste („Einfachauswahl“) */
  typName: string
  /** Angeklickter Eintrag (schon von der App geprüft und auf den Block umgerechnet) */
  eintrag: EintragOrt | null
  melde: (nachricht: Record<string, unknown>) => void
}

export interface Aufgabenbearbeiter {
  /** Neuer Stand von der App (Rückgängig, Wiederholen, Toast) */
  setze: (block: Block) => void
  /** Bearbeiten beenden und „fertig“ melden */
  beende: () => void
  /** Ohne Meldung zurück zur gebauten Fassung */
  ab: () => void
  readonly fertig: boolean
  element: HTMLElement
}

let stilDa = false
function stil() {
  if (stilDa || document.getElementById('wk-aw-stil')) return
  const st = document.createElement('style')
  st.id = 'wk-aw-stil'
  st.textContent = AW_CSS
  document.head.appendChild(st)
  stilDa = true
}

function ansage(text: string) {
  let el = document.getElementById('wk-aw-ansage')
  if (!el) {
    el = document.createElement('div')
    el.id = 'wk-aw-ansage'
    el.className = 'wk-ui wk-aw-sr'
    el.setAttribute('aria-live', 'polite')
    document.body.appendChild(el)
  }
  el.textContent = text
}

/** Gruppen, nach denen offene Einträge (Rückmeldung, Aufgeklapptes) nicht mehr zur Stelle passen */
const UMBAU = /^(neu-|loeschen-|umsortieren)/

export function starteAufgabe(o: AufgabeOptionen): Aufgabenbearbeiter {
  const plan = hatBauplan(o.block.type) ? BAUPLAENE[o.block.type] : null
  if (!plan) throw new Error('Kein Bauplan')
  stil()
  const ziel = o.ziel
  const original = ziel.innerHTML
  const kopf = ziel.querySelector('.kopfzeile')?.outerHTML ?? ''
  const aufgabeNr = ziel.querySelector('.kopfzeile .marke')?.textContent?.trim() || o.typName || 'Aufgabe'

  let block = normalisiere(o.block)
  let geaendert = false
  let fertig = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let wartend: string | null = null
  let fokusZiel: string | null = null
  let menue = false
  const danach: Array<() => void> = []
  const abmelden: Array<() => void> = []

  ziel.classList.add('wk-aufgabenzone', 'wk-aw-offen')
  ziel.setAttribute('aria-label', `${aufgabeNr} wird bearbeitet`)

  function senden(gruppe: string) {
    o.melde({ wkAufgabeAenderung: o.marke, block, gruppe })
  }
  function flush() {
    if (!timer) return
    clearTimeout(timer)
    timer = null
    if (wartend) senden(wartend)
    wartend = null
  }

  const w: Werk = {
    get block() {
      return block
    },
    ziel,
    tippe(neu, gruppe) {
      if (wartend && wartend !== gruppe) flush()
      block = neu
      geaendert = true
      wartend = gruppe
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, TIPP_PAUSE_MS)
      zeichne()
    },
    tue(neu, gruppe, fokus) {
      flush()
      block = neu
      geaendert = true
      w.hinweis = null
      if (UMBAU.test(gruppe)) for (const k of Object.keys(w.zustand)) if (k.startsWith('rueck-') || k.startsWith('auf-')) delete w.zustand[k]
      if (fokus) fokusZiel = fokus
      senden(gruppe)
      zeichne()
    },
    zeichne: () => zeichne(),
    fokus(k) {
      fokusZiel = k
    },
    ansage,
    hinweis: null,
    zustand: {},
    nachher(f) {
      danach.push(f)
    },
  }

  // ── Teile ───────────────────────────────────────────────────────────

  const erstesFeld = (i: number): string | null => erstesFeldVon(teileVon(plan!, block)[i])
  const teilVNode = (i: number): VNode => zeichneTeil(w, i)

  // ── Rahmen: Schild, Fußleiste, ⋯ ─────────────────────────────────────

  function aktion(a: 'typ' | 'roh' | 'duplizieren' | 'loeschen') {
    flush()
    menue = false
    zeichne()
    o.melde({ wkAufgabeAktion: o.marke, aktion: a })
  }

  function bearbeiten(): VNode {
    return html`<div class="wk-aw" onKeyDown=${(e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault()
        if (menue) {
          menue = false
          zeichne()
        } else beende()
      }
    }}>
      <span class="wk-aw-schild" aria-hidden="true">Bearbeiten</span>
      <div dangerouslySetInnerHTML=${{ __html: kopf }}></div>
      ${teileVon(plan!, block).map((_, i) => teilVNode(i))}
      <div class="wk-aw-fuss">
        <span class="wk-aw-typ" title=${o.typName}>${o.typName}</span>
        <span class="wk-aw-mehr-wrap">
          <button type="button" class="wk-aw-knopf" aria-label="Weitere Aktionen" aria-haspopup="menu" aria-expanded=${menue ? 'true' : 'false'}
            onClick=${() => {
              menue = !menue
              zeichne()
              if (menue) (ziel.querySelector('.wk-aw-menue button') as HTMLElement | null)?.focus()
            }}>⋯</button>
          ${menue &&
          html`<div class="wk-aw-menue" role="menu">
            <button type="button" role="menuitem" onClick=${() => aktion('typ')}>Aufgabentyp ändern …</button>
            <button type="button" role="menuitem" onClick=${() => aktion('roh')}>Quelltext bearbeiten</button>
            <button type="button" role="menuitem" onClick=${() => aktion('duplizieren')}>Element duplizieren</button>
            <button type="button" role="menuitem" class="wk-aw-gefahr" onClick=${() => aktion('loeschen')}>Element löschen</button>
          </div>`}
        </span>
        <button type="button" class="wk-aw-knopf wk-aw-fertig" onClick=${() => beende()}>Fertig</button>
      </div>
    </div>`
  }

  /** Nach „Fertig“ bis zum Neubau: dieselbe Aufgabe in der Schülersicht (ohne Felder) */
  function ansicht(): VNode {
    return html`<div dangerouslySetInnerHTML=${{ __html: kopf }}></div>
      ${teileVon(plan!, block).map((t) => {
        if (t.art === 'text') return s(block[t.feld]) ? html`<p class="frage">${s(block[t.feld])}</p>` : null
        if (t.art === 'antworten' || t.art === 'wahrfalsch') return antwortenAnsicht(w, t)
        if (t.art === 'paare') return paareAnsicht(w, t)
        if (t.art === 'zeilen') return zeilenAnsicht(w, t)
        if (t.art === 'eintraege') return eintraegeAnsicht(w, t)
        if (t.art === 'zuordnen') return zuordnenAnsicht(w, t)
        if (t.art === 'gruppen') return gruppenAnsicht(w, t)
        if (t.art === 'zahl' || t.art === 'unterbloecke') return null
        return lueckenAnsicht(w, t)
      })}
            <div class="rueckmeldung"></div>`
  }

  function zeichne() {
    if (fertig) return
    danach.length = 0
    render(bearbeiten(), ziel)
    for (const f of [...danach]) f()
    ziel.querySelectorAll<HTMLTextAreaElement>('textarea.wk-aw-feld').forEach(wachse)
    if (fokusZiel) {
      const el = ziel.querySelector<HTMLElement>(`[data-aw-fokus="${fokusZiel}"]`)
      fokusZiel = null
      if (el) {
        el.focus()
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const n = el.value.length
          el.setSelectionRange?.(n, n)
        }
      }
    }
  }

  function aufraeumen() {
    fertig = true
    if (timer) clearTimeout(timer)
    timer = null
    for (const f of abmelden) f()
    ziel.classList.remove('wk-aufgabenzone', 'wk-aw-offen')
    ziel.removeAttribute('aria-label')
  }

  function beende() {
    if (fertig) return
    flush()
    const war = geaendert
    aufraeumen()
    render(null, ziel)
    if (war) render(ansicht(), ziel)
    else ziel.innerHTML = original
    ansage(`${aufgabeNr} fertig.`)
    o.melde({ wkAufgabeEnde: o.marke })
  }

  // ── Start: angeklickter Eintrag (oder das erste Feld) bekommt den Fokus ─
  ziel.innerHTML = ''
  const e = o.eintrag
  const listenTeil = (() => {
    return teileVon(plan, block).find((x) => x.art !== 'text' && x.art !== 'zahl')
  })()
  fokusZiel = erstesFeld(0)
  for (const t of plan.teile) {
    if (t.art === 'luecken') {
      starteLuecken(w, e?.art === 'eintrag' ? e.nr : null)
      abmelden.push(beobachteAuswahl(w, t))
    }
  }
  if (e?.art === 'eintrag' && listenTeil) {
    if (listenTeil.art === 'antworten' || listenTeil.art === 'wahrfalsch') fokusZiel = `antwort-${e.nr}`
    else if (listenTeil.art === 'paare') {
      if (listenTeil.lang) w.zustand[offenSchluessel(listenTeil.feld)] = e.nr
      fokusZiel = `${listenTeil.lang ? 'rechts' : 'links'}-${listenTeil.feld}-${e.nr}`
    } else if (listenTeil.art === 'zeilen') fokusZiel = `zeile-${listenTeil.feld}-${e.nr}`
    else if (listenTeil.art === 'eintraege') fokusZiel = `ef-${e.nr}-0`
    else if (listenTeil.art === 'zuordnen') fokusZiel = `kat-${e.nr}`
    else if (listenTeil.art === 'gruppen') fokusZiel = `gt-${e.nr}`
    else fokusZiel = 'lt-wort'
  } else if (!e && listenTeil?.art === 'luecken') fokusZiel = 'lt-text'
  zeichne()
  ansage(`${aufgabeNr} wird bearbeitet. Esc oder „Fertig“ beendet.`)

  return {
    setze(neu) {
      if (fertig || !neu || neu.type !== o.block.type) return
      if (timer) clearTimeout(timer)
      timer = null
      wartend = null
      block = normalisiere(neu)
      w.hinweis = null
      for (const k of Object.keys(w.zustand)) if (k.startsWith('rueck-') || k.startsWith('ziehen-')) delete w.zustand[k]
      if (plan.teile.some((t) => t.art === 'luecken')) lueckenNeuerStand(w)
      zeichne()
    },
    beende,
    ab() {
      if (fertig) return
      aufraeumen()
      render(null, ziel)
      ziel.innerHTML = original
    },
    get fertig() {
      return fertig
    },
    element: ziel,
  }
}

declare global {
  interface Window {
    __wkAufgabenwerk?: { starte: typeof starteAufgabe }
  }
}

if (typeof window !== 'undefined') window.__wkAufgabenwerk = { starte: starteAufgabe }
