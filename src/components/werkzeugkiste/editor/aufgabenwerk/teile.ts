import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { BAUPLAENE, echterName, hinweise, teileVon, type Teil, type TextTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
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

/** Python-Wahrheit des Kerns: 0, leer und fehlend sind falsch, alles andere wahr */
const wahr = (v: unknown) => !!v && !(Array.isArray(v) && v.length === 0)

/** Was der Kern als „wahr“ liest, wird für die Bearbeitung zu true/false (gespeichert wird erst bei einer Änderung) */
export function normalisiere(b: Block): Block {
  const neu: Block = { ...b }
  for (const teil of BAUPLAENE[b.type] ? teileVon(BAUPLAENE[b.type], b) : []) {
    if (teil.art === 'antworten') {
      // Der Kern liest jeden wahren Wert (1, „ja“ …) als richtig: für die Bearbeitung zu true/false, sonst ginge es beim Speichern verloren
      neu[teil.feld] = liste(b[teil.feld]).map((a) => ({ ...a, [teil.richtigFeld]: wahr(a[teil.richtigFeld]) }))
    }
    if (teil.art === 'paare' || teil.art === 'gruppen') neu[teil.feld] = liste(b[teil.feld])
    if (teil.art === 'eintraege') {
      neu[teil.feld] = liste(b[teil.feld]).map((e) => {
        const u = teil.unterAntworten
        if (!u) return e
        const name = echterName(e, u.namen, u.namen[0])
        return { ...e, [name]: liste(e[name]).map((a) => ({ ...a, correct: wahr(a.correct) })) }
      })
    }
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
  if (t.art === 'unterbloecke') return 'q0:question'
  return 'lt-text'
}

// ── Absätze statt <p>-Tags ────────────────────────────────────────────
// Manche Texte (z. B. die Ausgangssituation einer Fallakte) sind als <p>…</p> gespeichert. Die Lehrkraft
// soll keine Tags sehen: Besteht ein Text nur aus solchen Absätzen, steht er im Feld als Absätze mit
// Leerzeile dazwischen und wird beim Tippen wieder als <p>-Absätze gespeichert. Ohne Eingabe bleibt er,
// wie er ist. Alles andere (weitere Tags) bleibt unverändert sichtbar.
const NUR_ABSAETZE = /^\s*(?:<p>[^<]*<\/p>\s*)+$/i
const ENTITAETEN: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

/** `<p>a</p><p>b</p>` → `a\n\nb`; null, wenn der Text nicht nur aus einfachen Absätzen besteht */
export function absaetzeAusHtml(v: string): string | null {
  if (!NUR_ABSAETZE.test(v)) return null
  return [...v.matchAll(/<p>([^<]*)<\/p>/gi)]
    .map((m) => m[1].replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITAETEN[e]).trim())
    .join('\n\n')
}

/** Umkehrung: Absätze (Leerzeile dazwischen) → `<p>…</p>`, Sonderzeichen maskiert; leer bleibt leer */
export function absaetzeZuHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => `<p>${a.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

/**
 * Was im Feld steht und wie Getipptes gespeichert wird. `getippt` ist der zuletzt getippte Feldinhalt:
 * Er bleibt stehen, solange er gespeichert genau `roh` ergibt (sonst äße das Neuzeichnen nach jedem
 * Tastendruck Leerzeichen und Leerzeilen am Ende weg).
 */
export function textFeldWert(roh: string, getippt?: string): { anzeige: string; speichere: (eingabe: string) => string } {
  const absaetze = absaetzeAusHtml(roh)
  if (absaetze === null) return { anzeige: roh, speichere: (e) => e }
  return { anzeige: getippt !== undefined && absaetzeZuHtml(getippt) === roh ? getippt : absaetze, speichere: absaetzeZuHtml }
}

/**
 * Ein Textfeld. Das Hauptfeld (die Frage bzw. Aufgabe) steht fett wie bei den Schülern; jedes weitere Feld
 * (Musterlösung, Ergebnis, Ausgangssituation …) trägt eine sichtbare Beschriftung, sonst wüsste man bei
 * gefülltem Feld nicht mehr, wofür es steht. Die Arbeitsanweisung bleibt wie bisher (ohne Beschriftung).
 */
export function textTeil(w: Werk, teil: TextTeil, naechster: string | null, haupt = true): VNode {
  const fehlt = hinweise(w.block).find((h) => h.wo === teil.feld)
  const anweisung = teil.feld === 'description'
  const neben = !haupt && !anweisung
  const merker = `getippt-${teil.feld}`
  const getippt = w.zustand[merker]
  const { anzeige, speichere } = textFeldWert(s(w.block[teil.feld]), typeof getippt === 'string' ? getippt : undefined)
  const feldId = `wk-aw-text-${teil.feld}`
  return html`<div class=${neben ? 'wk-aw-neben' : undefined}>
    ${neben && html`<label class="wk-aw-zwischen" for=${feldId}>${teil.label}</label>`}
    <textarea
      id=${neben ? feldId : undefined}
      class=${neben ? 'wk-aw-feld wk-aw-text' : 'wk-aw-feld frage'}
      rows="1"
      data-aw-fokus=${teil.feld}
      aria-label=${neben ? undefined : teil.label}
      placeholder=${teil.platzhalter}
      value=${anzeige}
      spellcheck="true"
      lang="de"
      onInput=${(e: Event) => {
        const el = e.currentTarget as HTMLTextAreaElement
        wachse(el)
        w.zustand[merker] = el.value
        w.tippe({ ...w.block, [teil.feld]: speichere(el.value) }, `text-${teil.feld}`)
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
  if (t.art === 'text') {
    // Hauptfeld = erstes Textfeld außer der Arbeitsanweisung (Frage, Aufgabe, Titel des Falls …)
    const haupt = teile.findIndex((x) => x.art === 'text' && x.feld !== 'description') === i
    return textTeil(w, t, erstesFeldVon(teile[i + 1]), haupt)
  }
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
