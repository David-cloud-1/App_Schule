import { html } from 'htm/preact'
import { render, type VNode } from 'preact'
import { AW_CSS } from '@/components/werkzeugkiste/editor/aufgabenwerk/design'
import {
  BAUPLAENE,
  hatBauplan,
  hinweise,
  type AntwortenTeil,
  type EintragOrt,
  type TextTeil,
  type WahrFalschTeil,
} from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'

/**
 * Aufgabenwerk (PROJ-114): macht eine Aufgabe **in der abgeschotteten Vorschau-Seite** an Ort
 * und Stelle bearbeitbar. Sie behält das Aussehen der Schülersicht; Texte werden zu Feldern.
 *
 * Grundregel wie überall im Baukasten: **Die Seite schlägt vor, die App prüft und speichert.**
 * Jede Änderung geht als ganzer neuer Block an die App (`wkAufgabeAenderung`), Aktionen sofort,
 * Tippen nach kurzer Pause. Den Kern-Neubau startet die App erst nach „Fertig“.
 *
 * Gebaut wird es mit `npm run aufgabenwerk:bauen` zu `aufgabenwerk-bundle.generated.ts`.
 */

type Eintrag = Record<string, unknown>
type Block = { type: string } & Eintrag

export interface AufgabeOptionen {
  /** Die Aufgabe in der Seite (`section.aufgabe` mit `data-wk`) */
  ziel: HTMLElement
  /** Gespeicherter Block (von der App) */
  block: Block
  marke: string
  /** Name des Typs für die Fußleiste („Einfachauswahl“) */
  typName: string
  /** Angeklickter Eintrag (schon von der App geprüft) */
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

/** Pause nach dem Tippen, bis die Änderung an die App geht (ms) */
export const TIPP_PAUSE_MS = 600

const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const liste = (v: unknown): Eintrag[] => (Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? { ...(x as Eintrag) } : { text: s(x) })) : [])

/** Was der Kern als „wahr“ liest, wird für die Bearbeitung zu true/false (gespeichert wird erst bei einer Änderung) */
function normalisiere(b: Block): Block {
  const neu: Block = { ...b }
  for (const teil of BAUPLAENE[b.type]?.teile ?? []) {
    if (teil.art === 'antworten') neu[teil.feld] = liste(b[teil.feld])
    if (teil.art === 'wahrfalsch') neu[teil.feld] = [true, 'true', 'wahr', 1].includes(b[teil.feld] as never)
  }
  return neu
}

/** Mehrere Zeilen aus Word & Co.: Aufzählungszeichen weg, leere Zeilen weg */
export function zeilenAusEinfuegen(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((z) => z.replace(/^\s*(?:[-–•*·▪◦]|\d+[.)]|[a-z][.)])\s+/i, '').trim())
    .filter(Boolean)
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

function wachse(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`
}

export function starteAufgabe(o: AufgabeOptionen): Aufgabenbearbeiter {
  const plan = BAUPLAENE[o.block.type]
  if (!hatBauplan(o.block.type) || !plan) throw new Error('Kein Bauplan')
  stil()
  const ziel = o.ziel
  const original = ziel.innerHTML
  const kopf = ziel.querySelector('.kopfzeile')?.outerHTML ?? ''
  const aufgabeNr = ziel.querySelector('.kopfzeile .marke')?.textContent?.trim() || 'Aufgabe'

  let block = normalisiere(o.block)
  let geaendert = false
  let fertig = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let wartend: string | null = null
  // Oberflächen-Zustand (gehört nur der Seite)
  let offeneRueck = new Set<number>()
  let menue = false
  let hinweis: string | null = null
  let fokus: string | null = null
  let ziehen: { von: number; nach: number; teil: AntwortenTeil } | null = null

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
  /** Tippen: kurz warten, ein Feld = eine Gruppe im Verlauf */
  function tippe(neu: Block, gruppe: string) {
    if (wartend && wartend !== gruppe) flush()
    block = neu
    geaendert = true
    wartend = gruppe
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, TIPP_PAUSE_MS)
    zeichne()
  }
  /** Aktion (Hinzufügen, Löschen, Richtig setzen, Umsortieren): sofort */
  function tue(neu: Block, gruppe: string, naechsterFokus?: string) {
    flush()
    block = neu
    geaendert = true
    hinweis = null
    if (naechsterFokus) fokus = naechsterFokus
    senden(gruppe)
    zeichne()
  }

  // ── Teile ───────────────────────────────────────────────────────────

  function textTeil(teil: TextTeil, erster: string | null): VNode {
    const fehlt = hinweise(block).find((h) => h.wo === teil.feld)
    return html`<div>
      <textarea
        class="wk-aw-feld frage"
        rows="1"
        data-aw-fokus=${teil.feld}
        aria-label=${teil.label}
        placeholder=${teil.platzhalter}
        value=${s(block[teil.feld])}
        spellcheck="true"
        lang="de"
        onInput=${(e: Event) => {
          const el = e.currentTarget as HTMLTextAreaElement
          wachse(el)
          tippe({ ...block, [teil.feld]: el.value }, `text-${teil.feld}`)
        }}
        onKeyDown=${(e: KeyboardEvent) => {
          // Enter springt zum nächsten Teil (Umschalt+Enter = neue Zeile)
          if (e.key === 'Enter' && !e.shiftKey && erster) {
            e.preventDefault()
            fokus = erster
            zeichne()
          }
        }}
      ></textarea>
      ${fehlt && html`<p class="wk-aw-hinweis" role="note">${fehlt.text}</p>`}
    </div>`
  }

  function antwortenTeil(teil: AntwortenTeil): VNode {
    const antworten = block[teil.feld] as Eintrag[]
    const setze = (l: Eintrag[]) => ({ ...block, [teil.feld]: l })
    const fehlt = hinweise(block).filter((h) => h.wo.startsWith(teil.feld))
    const loesche = (i: number) => {
      if (antworten.length <= teil.mindestens) {
        hinweis = `Mindestens ${teil.mindestens} ${teil.einzahl}en nötig – ändere den Text, statt zu löschen.`
        ansage(hinweis)
        zeichne()
        return
      }
      offeneRueck = new Set()
      tue(setze(antworten.filter((_, j) => j !== i)), 'loeschen-antwort', `antwort-${Math.max(0, i - 1)}`)
    }
    const verschiebe = (von: number, nach: number) => {
      if (nach < 0 || nach >= antworten.length || von === nach) return
      const l = [...antworten]
      const [x] = l.splice(von, 1)
      l.splice(nach, 0, x)
      offeneRueck = new Set()
      tue(setze(l), 'umsortieren', `antwort-${nach}`)
      ansage(`${teil.einzahl} ${von + 1} ist jetzt an Stelle ${nach + 1}.`)
    }
    const neu = (nach: number, texte: string[] = [''], basis: Eintrag[] = antworten) => {
      const platz = teil.hoechstens - basis.length
      if (platz <= 0 && texte.length > 0) {
        hinweis = `Höchstens ${teil.hoechstens} ${teil.einzahl}en möglich.`
        ansage(hinweis)
        zeichne()
        return
      }
      const dazu = texte.slice(0, platz).map((t) => ({ [teil.textFeld]: t, [teil.richtigFeld]: false, [teil.rueckmeldungFeld]: '' }))
      const l = [...basis]
      l.splice(nach + 1, 0, ...dazu)
      offeneRueck = new Set()
      tue(setze(l), 'neu-antwort', `antwort-${nach + dazu.length}`)
      if (texte.length > platz) {
        hinweis = `Nur ${platz} von ${texte.length} Zeilen übernommen – höchstens ${teil.hoechstens} ${teil.einzahl}en.`
        zeichne()
      }
    }
    const zeilenEls = () => Array.from(ziel.querySelectorAll<HTMLElement>(`[data-aw-liste="${teil.feld}"] > li.wk-aw-zeile`))

    const zeilen = antworten.map((a, i) => {
      const richtig = a[teil.richtigFeld] === true
      const rueck = s(a[teil.rueckmeldungFeld])
      const offen = offeneRueck.has(i)
      const nr = i + 1
      const zieht = ziehen?.teil === teil ? ziehen : null
      const klasse = [
        'wk-aw-zeile',
        richtig ? 'wk-aw-richtig' : '',
        zieht?.von === i ? 'wk-aw-gezogen' : '',
      ].join(' ')
      return html`<li class=${klasse} key=${i} style=${zieht && zieht.nach === i && zieht.von !== i ? `box-shadow:0 ${zieht.nach > zieht.von ? '' : '-'}3px 0 #1d4ed8` : ''}>
          <button
            type="button"
            class="wk-aw-kreis"
            role="radio"
            aria-checked=${richtig ? 'true' : 'false'}
            aria-label=${`${teil.einzahl} ${nr} ist richtig`}
            data-aw-fokus=${`kreis-${i}`}
            onClick=${() => {
              tue(setze(antworten.map((x, j) => ({ ...x, [teil.richtigFeld]: j === i }))), 'richtig')
              ansage(`${teil.einzahl} ${nr} ist jetzt richtig.`)
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
              tippe(setze(antworten.map((x, j) => (j === i ? { ...x, [teil.textFeld]: el.value } : x))), `antwort-${i}-text`)
            }}
            onPaste=${(e: ClipboardEvent) => {
              const roh = e.clipboardData?.getData('text/plain') ?? ''
              const z = zeilenAusEinfuegen(roh)
              if (z.length < 2) return
              e.preventDefault()
              // Leere Zeile: die erste eingefügte Zeile kommt hinein, die übrigen werden neue Antworten darunter
              if (s(a[teil.textFeld]).trim()) neu(i, z)
              else neu(i, z.slice(1), antworten.map((x, j) => (j === i ? { ...x, [teil.textFeld]: z[0] } : x)))
            }}
            onKeyDown=${(e: KeyboardEvent) => {
              const el = e.currentTarget as HTMLTextAreaElement
              if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                e.preventDefault()
                verschiebe(i, i + (e.key === 'ArrowDown' ? 1 : -1))
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (i < antworten.length - 1) {
                  fokus = `antwort-${i + 1}`
                  zeichne()
                } else neu(i)
              } else if (e.key === 'Backspace' && el.value === '' && antworten.length > teil.mindestens) {
                e.preventDefault()
                loesche(i)
              }
            }}
          ></textarea>
          <button
            type="button"
            class="wk-aw-wz"
            aria-label=${`Rückmeldung zu ${teil.einzahl} ${nr}${rueck ? ' (vorhanden)' : ''}`}
            title="Rückmeldung"
            aria-expanded=${offen ? 'true' : 'false'}
            data-voll=${rueck ? 'true' : 'false'}
            onClick=${() => {
              if (offen) offeneRueck.delete(i)
              else {
                offeneRueck.add(i)
                fokus = `rueck-${i}`
              }
              zeichne()
            }}
          >💬</button>
          <button
            type="button"
            class="wk-aw-wz wk-aw-griff"
            aria-label=${`${teil.einzahl} ${nr} verschieben (Alt + Pfeiltasten)`}
            title="Ziehen zum Umsortieren"
            onPointerDown=${(e: PointerEvent) => {
              e.preventDefault()
              const knopf = e.currentTarget as HTMLElement
              knopf.setPointerCapture?.(e.pointerId)
              ziehen = { von: i, nach: i, teil }
              zeichne()
            }}
            onPointerMove=${(e: PointerEvent) => {
              if (!ziehen || ziehen.teil !== teil) return
              const els = zeilenEls()
              let nach = els.length - 1
              for (let j = 0; j < els.length; j++) {
                const r = els[j].getBoundingClientRect()
                if (e.clientY < r.top + r.height / 2) {
                  nach = j > ziehen.von ? j - 1 : j
                  break
                }
              }
              if (nach !== ziehen.nach) {
                ziehen = { ...ziehen, nach }
                zeichne()
              }
            }}
            onPointerUp=${() => {
              const z = ziehen
              ziehen = null
              if (z && z.teil === teil && z.nach !== z.von) verschiebe(z.von, z.nach)
              else zeichne()
            }}
            onPointerCancel=${() => {
              ziehen = null
              zeichne()
            }}
            onKeyDown=${(e: KeyboardEvent) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault()
                verschiebe(i, i + (e.key === 'ArrowDown' ? 1 : -1))
              }
            }}
          >⠿</button>
          <button
            type="button"
            class="wk-aw-wz wk-aw-weg"
            aria-label=${`${teil.einzahl} ${nr} löschen`}
            aria-disabled=${antworten.length <= teil.mindestens ? 'true' : 'false'}
            title=${antworten.length <= teil.mindestens ? `Mindestens ${teil.mindestens} ${teil.einzahl}en nötig` : 'Löschen'}
            onClick=${() => loesche(i)}
          >×</button>
        </li>
        ${offen &&
        html`<li class="wk-aw-rueckzeile" key=${`r${i}`}>
          <input
            class="wk-aw-feld wk-aw-rueck"
            data-aw-fokus=${`rueck-${i}`}
            aria-label=${`Rückmeldung, wenn ${teil.einzahl} ${nr} gewählt wird`}
            placeholder=${richtig ? 'Rückmeldung, z. B. „Genau – weil …“' : 'Rückmeldung, z. B. „Nicht ganz – denk an …“'}
            value=${rueck}
            onInput=${(e: Event) =>
              tippe(setze(antworten.map((x, j) => (j === i ? { ...x, [teil.rueckmeldungFeld]: (e.currentTarget as HTMLInputElement).value } : x))), `antwort-${i}-rueck`)}
            onKeyDown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                fokus = `antwort-${i}`
                zeichne()
              }
            }}
          />
        </li>`}`
    })

    return html`<div class="antworten" role="radiogroup" aria-label="Richtige Antwort wählen">
      <ol class="wk-aw-liste" data-aw-liste=${teil.feld}>${zeilen}</ol>
      ${antworten.length < teil.hoechstens &&
      html`<button type="button" class="wk-aw-neu" onClick=${() => neu(antworten.length - 1)}>＋ ${teil.einzahl} hinzufügen</button>`}
      ${hinweis && html`<p class="wk-aw-hinweis" role="alert">${hinweis}</p>`}
      ${fehlt.map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
    </div>`
  }

  function wahrFalschTeil(teil: WahrFalschTeil): VNode {
    const wahr = block[teil.feld] === true
    const zeilen = [
      { nr: 0, text: 'Wahr', richtig: wahr },
      { nr: 1, text: 'Falsch', richtig: !wahr },
    ]
    return html`<div class="antworten" role="radiogroup" aria-label="Die Aussage ist">
      <ol class="wk-aw-liste">
        ${zeilen.map((z) => {
          // Die Rückmeldung hängt an der Antwort: an der richtigen „richtig“, an der anderen „falsch“
          const feld = z.richtig ? teil.rueckmeldungRichtig : teil.rueckmeldungFalsch
          const rueck = s(block[feld])
          const offen = offeneRueck.has(z.nr)
          return html`<li class=${`wk-aw-zeile${z.richtig ? ' wk-aw-richtig' : ''}`} key=${z.nr}>
              <button
                type="button"
                class="wk-aw-kreis"
                role="radio"
                aria-checked=${z.richtig ? 'true' : 'false'}
                aria-label=${`Die Aussage ist ${z.text.toLowerCase()}`}
                data-aw-fokus=${`kreis-${z.nr}`}
                onClick=${() => {
                  if (z.richtig) return
                  // Mit der Lösung tauschen auch die Rückmeldungen die Seite, damit sie an „ihrer“ Antwort bleiben
                  tue(
                    { ...block, [teil.feld]: z.nr === 0, [teil.rueckmeldungRichtig]: s(block[teil.rueckmeldungFalsch]), [teil.rueckmeldungFalsch]: s(block[teil.rueckmeldungRichtig]) },
                    'richtig',
                  )
                  ansage(`Die Aussage ist jetzt ${z.text.toLowerCase()}.`)
                }}
              ></button>
              <span class="antwort" style="flex:1">${z.text}</span>
              <button
                type="button"
                class="wk-aw-wz"
                aria-label=${`Rückmeldung bei Antwort „${z.text}“${rueck ? ' (vorhanden)' : ''}`}
                title="Rückmeldung"
                aria-expanded=${offen ? 'true' : 'false'}
                data-voll=${rueck ? 'true' : 'false'}
                onClick=${() => {
                  if (offen) offeneRueck.delete(z.nr)
                  else {
                    offeneRueck.add(z.nr)
                    fokus = `rueck-${z.nr}`
                  }
                  zeichne()
                }}
              >💬</button>
            </li>
            ${offen &&
            html`<li class="wk-aw-rueckzeile" key=${`r${z.nr}`}>
              <input
                class="wk-aw-feld wk-aw-rueck"
                data-aw-fokus=${`rueck-${z.nr}`}
                aria-label=${`Rückmeldung bei Antwort „${z.text}“`}
                placeholder=${z.richtig ? 'Rückmeldung bei richtiger Antwort' : 'Rückmeldung bei falscher Antwort'}
                value=${rueck}
                onInput=${(e: Event) => tippe({ ...block, [feld]: (e.currentTarget as HTMLInputElement).value }, `rueck-${feld}`)}
              />
            </li>`}`
        })}
      </ol>
    </div>`
  }

  // ── Rahmen: Schild, Fußleiste, ⋯ ─────────────────────────────────────

  function aktion(a: 'typ' | 'roh' | 'duplizieren' | 'loeschen') {
    flush()
    menue = false
    zeichne()
    o.melde({ wkAufgabeAktion: o.marke, aktion: a })
  }

  function bearbeiten(): VNode {
    const ersterNachText = plan.teile.find((t) => t.art !== 'text')
    const erster = ersterNachText?.art === 'antworten' ? 'antwort-0' : ersterNachText?.art === 'wahrfalsch' ? 'kreis-0' : null
    return html`<div class="wk-aw" onKeyDown=${(e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (menue) {
          menue = false
          zeichne()
        } else beende()
      }
    }}>
      <span class="wk-aw-schild" aria-hidden="true">Bearbeiten</span>
      <div dangerouslySetInnerHTML=${{ __html: kopf }}></div>
      ${plan.teile.map((t) => (t.art === 'text' ? textTeil(t, erster) : t.art === 'antworten' ? antwortenTeil(t) : wahrFalschTeil(t)))}
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
            <button type="button" role="menuitem" onClick=${() => aktion('typ')}>Typ wechseln …</button>
            <button type="button" role="menuitem" onClick=${() => aktion('roh')}>Rohfassung bearbeiten</button>
            <button type="button" role="menuitem" onClick=${() => aktion('duplizieren')}>Block duplizieren</button>
            <button type="button" role="menuitem" class="wk-aw-gefahr" onClick=${() => aktion('loeschen')}>Block löschen</button>
          </div>`}
        </span>
        <button type="button" class="wk-aw-knopf wk-aw-fertig" onClick=${() => beende()}>Fertig</button>
      </div>
    </div>`
  }

  /** Nach „Fertig“ bis zum Neubau: dieselbe Aufgabe in der Schülersicht (ohne Felder) */
  function ansicht(): VNode {
    return html`<div dangerouslySetInnerHTML=${{ __html: kopf }}></div>
      ${plan.teile.map((t) => {
        if (t.art === 'text') return html`<p class="frage">${s(block[t.feld])}</p>`
        if (t.art === 'antworten')
          return html`<div class="antworten">${(block[t.feld] as Eintrag[]).map((a) => html`<button class="antwort">${s(a[t.textFeld])}</button>`)}</div>`
        return html`<div class="antworten waagrecht"><button class="antwort">Wahr</button><button class="antwort">Falsch</button></div>`
      })}
      <div class="rueckmeldung"></div>`
  }

  function zeichne() {
    if (fertig) return
    render(bearbeiten(), ziel)
    ziel.querySelectorAll<HTMLTextAreaElement>('textarea.wk-aw-feld').forEach(wachse)
    if (fokus) {
      const el = ziel.querySelector<HTMLElement>(`[data-aw-fokus="${fokus}"]`)
      fokus = null
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

  // Start: angeklickter Eintrag (oder die Frage) bekommt den Fokus
  ziel.innerHTML = ''
  const e = o.eintrag
  fokus = !e || e.art === 'frage' ? plan.teile[0]?.art === 'text' ? plan.teile[0].feld : null : o.block.type === 'true_false' ? `kreis-${e.nr}` : `antwort-${e.nr}`
  zeichne()
  ansage(`${aufgabeNr} wird bearbeitet. Esc oder „Fertig“ beendet.`)

  return {
    setze(neu) {
      if (fertig || !neu || neu.type !== o.block.type) return
      if (timer) clearTimeout(timer)
      timer = null
      wartend = null
      block = normalisiere(neu)
      offeneRueck = new Set()
      hinweis = null
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
