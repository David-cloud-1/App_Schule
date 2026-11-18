import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { BAUPLAENE, hatBauplan, hinweise, teileVon, type UnterBloeckeTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { lueckenNeuerStand, pruefeAuswahlImFeld } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-e'
import { listenAktionen } from '@/components/werkzeugkiste/editor/aufgabenwerk/listen'
import { s, type Block, type Eintrag, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Muster G – Fragen als Karten (Kapiteltest, PROJ-114): jede Frage wird nach dem Bauplan ihres eigenen
 * Typs gezeichnet. Dafür bekommt jede Karte ein **Unter-Werk**, das nur die Frage kennt; Änderungen
 * gehen als ganze Fragenliste an das Werk der Aufgabe (und damit an die App).
 */

export interface Zeichner {
  zeichne: (w: Werk, i: number) => VNode
  normalisiere: (b: Block) => Block
}

const TYP_NAMEN: Record<string, string> = {
  multiple_choice: 'Auswahlfrage',
  single_choice: 'Auswahlfrage',
  true_false: 'Richtig oder falsch',
  fill_blanks: 'Lückentext',
}

/** Eine neue Frage mit Beispielgerüst */
export function neueFrage(typ: string): Block {
  if (typ === 'true_false') return { type: typ, question: '', correct: true, feedback_correct: '', feedback_wrong: '' }
  if (typ === 'fill_blanks') return { type: typ, text: '' }
  return {
    type: typ,
    question: '',
    answers: [
      { text: '', correct: true, feedback: '' },
      { text: '', correct: false, feedback: '' },
    ],
  }
}

/** Gruppen, deren Name für den Lösch-Toast (und den Aufräum-Test der App) unverändert bleiben muss */
const FEST = /^(neu-|loeschen-|umsortieren)/

function unterWerk(w: Werk, i: number, fragen: () => Block[]): Werk {
  const vor = `q${i}:`
  const setze = (neu: Block): Block => ({ ...w.block, [ortFeld(w)]: fragen().map((f, j) => (j === i ? neu : f)) })
  const schluessel = (k: string) => (/^[a-z]+-/.test(k) ? k.replace(/^([a-z]+)-/, `$1-q${i}-`) : `q${i}-${k}`)
  const zustand = new Proxy({} as Record<string, unknown>, {
    get: (_, k) => w.zustand[schluessel(String(k))],
    set: (_, k, v) => {
      w.zustand[schluessel(String(k))] = v
      return true
    },
    deleteProperty: (_, k) => delete w.zustand[schluessel(String(k))],
    has: (_, k) => schluessel(String(k)) in w.zustand,
    ownKeys: () => Object.keys(w.zustand).filter((k) => k.includes(`-q${i}-`) || k.startsWith(`q${i}-`)).map((k) => k.replace(`-q${i}-`, '-').replace(`q${i}-`, '')),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  })
  return {
    get block() {
      return fragen()[i]
    },
    get ziel() {
      return (w.ziel.querySelector(`[data-aw-karte="${i}"]`) as HTMLElement | null) ?? w.ziel
    },
    tippe: (neu, gruppe) => w.tippe(setze(neu), `f${i}-${gruppe}`.slice(0, 60)),
    tue: (neu, gruppe, fokus) => w.tue(setze(neu), FEST.test(gruppe) ? gruppe : `f${i}-${gruppe}`.slice(0, 60), fokus ? vor + fokus : undefined),
    zeichne: () => w.zeichne(),
    fokus: (k) => w.fokus(vor + k),
    ansage: (t) => w.ansage(t),
    get hinweis() {
      const h = w.hinweis
      return h && h.wo.startsWith(vor) ? { ...h, wo: h.wo.slice(vor.length) } : null
    },
    set hinweis(h) {
      w.hinweis = h ? { ...h, wo: vor + h.wo } : null
    },
    zustand,
    nachher: (f) => w.nachher(f),
  }
}

/** Das Feld der Fragenliste im Block (immer `questions`) */
const ortFeld = (w: Werk) => {
  const t = (BAUPLAENE[w.block.type]?.teile ?? []).find((x) => x.art === 'unterbloecke')
  return t && t.art === 'unterbloecke' ? t.feld : 'questions'
}

export function unterbloeckeTeil(w: Werk, teil: UnterBloeckeTeil, zeichner: Zeichner): VNode {
  const L = listenAktionen(w, {
    feld: teil.feld,
    einzahl: teil.einzahl,
    mehrzahl: teil.mehrzahl,
    mindestens: teil.mindestens,
    hoechstens: teil.hoechstens,
    schluessel: teil.schluessel,
    neu: () => neueFrage('multiple_choice') as Eintrag,
    fokus: (i) => `q${i}:question`,
  })
  const liste = L.eintraege as Block[]
  const notizen = hinweise(w.block).filter((h) => h.wo === teil.feld)

  function hinzu(typ: string) {
    if (liste.length >= teil.hoechstens) {
      w.hinweis = { wo: teil.feld, text: `Höchstens ${teil.hoechstens} ${teil.mehrzahl} möglich.` }
      w.zeichne()
      return
    }
    w.tue({ ...w.block, [teil.feld]: [...liste, neueFrage(typ)] }, 'neu-kapitelfrage', typ === 'fill_blanks' ? `q${liste.length}:lt-text` : `q${liste.length}:question`)
  }

  const karten = liste.map((f, i) => {
    const z = L.zeilenZiehen(i)
    const typ = s(f.type)
    const sub = unterWerk(w, i, () => liste)
    // Tags der Fokus-Schlüssel nach dem Zeichnen: jede Karte bekommt ihren eigenen Raum
    w.nachher(() => {
      const karte = w.ziel.querySelector(`[data-aw-karte="${i}"]`)
      karte?.querySelectorAll('[data-aw-fokus]').forEach((el) => {
        const v = el.getAttribute('data-aw-fokus') ?? ''
        if (!v.startsWith(`q${i}:`)) el.setAttribute('data-aw-fokus', `q${i}:${v}`)
      })
    })
    let inhalt: VNode | VNode[]
    if (!hatBauplan(typ) || !teil.erlaubt.includes(typ)) {
      inhalt = html`<p class="wk-aw-hinweis" role="note">Nicht im Kapiteltest möglich – wird übersprungen. Entferne die Frage.</p>`
    } else {
      // Lückentext: Textfeld wird beim ersten Zeichnen der Karte geschrieben (Wörter markieren statt Sternchen)
      // Karten sind nach Platz geordnet: Gehört das Feld einer anderen Frage (nach Löschen, Verschieben), wird es neu geschrieben
      if (typ === 'fill_blanks') {
        const feld = w.ziel.querySelector<HTMLElement>(`[data-aw-karte="${i}"] .wk-aw-lt`)
        if (!feld || feld.dataset.awText !== s(f.text)) lueckenNeuerStand(sub)
      }
      const n = teileVon(BAUPLAENE[typ], f).length
      inhalt = Array.from({ length: n }, (_, k) => zeichner.zeichne(sub, k))
    }
    return html`<li class=${`wk-aw-karte${z.klasse}`} data-aw-zeile data-aw-karte=${i} key=${i} style=${z.stil}>
      <div class="wk-aw-karte-kopf">
        <strong class="wk-aw-karte-titel">${teil.einzahl} ${i + 1} · ${TYP_NAMEN[typ] ?? 'Unbekannt'}</strong>
        <span class="wk-aw-zeile">${L.griff(i)} ${L.weg(i)}</span>
      </div>
      <div class="wk-aw-karte-inhalt">${inhalt}</div>
    </li>`
  })

  return html`<div class="wk-aw-fragenset">
    <ol class="wk-aw-liste" data-aw-liste=${teil.feld}>${karten}</ol>
    <div class="wk-aw-neu-reihe">
      <button type="button" class="wk-aw-neu" onClick=${() => hinzu('multiple_choice')}>＋ Auswahlfrage</button>
      <button type="button" class="wk-aw-neu" onClick=${() => hinzu('true_false')}>＋ Richtig oder falsch</button>
      <button type="button" class="wk-aw-neu" onClick=${() => hinzu('fill_blanks')}>＋ Lückentext</button>
    </div>
    ${L.hinweisZeile()}
    ${notizen.map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
  </div>`
}

const lueckenTeilVon = (typ: string) => BAUPLAENE[typ]?.teile.find((t) => t.art === 'luecken')

/** Kapiteltest: beobachtet die Textauswahl in allen Lückentext-Fragen; Rückgabe: zum Abmelden */
export function beobachteKapitelLuecken(w: Werk): () => void {
  const pruefe = () => {
    const fragen = (): Block[] => (Array.isArray(w.block[ortFeld(w)]) ? (w.block[ortFeld(w)] as Block[]) : [])
    fragen().forEach((f, i) => {
      const t = lueckenTeilVon(s(f.type))
      if (t && t.art === 'luecken' && w.ziel.querySelector(`[data-aw-karte="${i}"] .wk-aw-lt`)) pruefeAuswahlImFeld(unterWerk(w, i, fragen), t)
    })
  }
  document.addEventListener('selectionchange', pruefe)
  return () => document.removeEventListener('selectionchange', pruefe)
}

/** Neuer Stand von der App: die Textfelder aller Lückentext-Fragen neu schreiben */
export function kapitelLueckenNeuerStand(w: Werk) {
  const fragen = (): Block[] => (Array.isArray(w.block[ortFeld(w)]) ? (w.block[ortFeld(w)] as Block[]) : [])
  fragen().forEach((f, i) => {
    if (s(f.type) === 'fill_blanks') lueckenNeuerStand(unterWerk(w, i, fragen))
  })
}
