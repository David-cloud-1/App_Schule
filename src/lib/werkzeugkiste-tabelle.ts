/**
 * Tabellen und Diagramme im Baukasten-Editor (PROJ-91): Rechenwerk für das
 * Raster-Feld, das Einfügen aus Excel/Word, die Prüfung der Diagrammdaten und
 * das Herauslösen einer HTML-Tabelle aus einem Textblock.
 *
 * Reine Funktionen. Nur `tabelleAusHtml` braucht einen DOMParser (Browser/jsdom).
 * Die Grenzen und die Zahlenregeln spiegeln `seite.py` / `diagramm.py` im Kern.
 */
import type { Block, Struktur } from './werkzeugkiste-editor'

export const TABELLE_MAX_ZEILEN = 30
export const TABELLE_MAX_SPALTEN = 12
export const DIAGRAMM_MAX_BESCHRIFTUNGEN = 12
export const DIAGRAMM_MAX_REIHEN = 5
export const DIAGRAMM_MAX_SEGMENTE = 8

export type Raster = string[][]

export const DIAGRAMM_ARTEN = ['saeulen', 'balken', 'linie', 'kreis'] as const
export type DiagrammArt = (typeof DIAGRAMM_ARTEN)[number]

// ── Raster ────────────────────────────────────────────────────────────────

const text = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))

/** Rechteckiges Raster aus den `zeilen` eines Blocks (Zeilen werden auf gleiche Länge aufgefüllt) */
export function rasterAus(zeilen: unknown): Raster {
  const roh = Array.isArray(zeilen) ? zeilen : []
  const z = roh.map((r) => (Array.isArray(r) ? r.map(text) : [text(r)]))
  const breite = Math.max(0, ...z.map((r) => r.length))
  return z.map((r) => [...r, ...Array(breite - r.length).fill('')])
}

export const spaltenZahl = (r: Raster) => (r[0]?.length ?? 0)

export function zelleSetzen(r: Raster, zeile: number, spalte: number, wert: string): Raster {
  return r.map((z, i) => (i === zeile ? z.map((c, j) => (j === spalte ? wert : c)) : z))
}

export function zeileEinfuegen(r: Raster, nach: number): Raster {
  if (r.length >= TABELLE_MAX_ZEILEN) return r
  const neu = Array(Math.max(1, spaltenZahl(r))).fill('')
  const n = [...r]
  n.splice(nach + 1, 0, neu)
  return n
}

export function zeileLoeschen(r: Raster, zeile: number): Raster {
  return r.length <= 1 ? r : r.filter((_, i) => i !== zeile)
}

export function zeileVerschieben(r: Raster, zeile: number, richtung: -1 | 1): Raster {
  const ziel = zeile + richtung
  if (ziel < 0 || ziel >= r.length) return r
  const n = [...r]
  ;[n[zeile], n[ziel]] = [n[ziel], n[zeile]]
  return n
}

export function spalteEinfuegen(r: Raster, nach: number): Raster {
  if (spaltenZahl(r) >= TABELLE_MAX_SPALTEN) return r
  return r.map((z) => {
    const n = [...z]
    n.splice(nach + 1, 0, '')
    return n
  })
}

export function spalteLoeschen(r: Raster, spalte: number): Raster {
  return spaltenZahl(r) <= 1 ? r : r.map((z) => z.filter((_, j) => j !== spalte))
}

export function spalteVerschieben(r: Raster, spalte: number, richtung: -1 | 1): Raster {
  const ziel = spalte + richtung
  if (ziel < 0 || ziel >= spaltenZahl(r)) return r
  return r.map((z) => {
    const n = [...z]
    ;[n[spalte], n[ziel]] = [n[ziel], n[spalte]]
    return n
  })
}

/** Ein leeres Raster in der gewünschten Größe */
export const leeresRaster = (zeilen: number, spalten: number): Raster =>
  Array.from({ length: zeilen }, () => Array(spalten).fill(''))

// ── Einfügen aus Excel/Word ───────────────────────────────────────────────

/**
 * Zerlegt eingefügten Text (Tabulator zwischen Zellen, Zeilenumbruch zwischen
 * Zeilen). Zellen in Anführungszeichen dürfen Zeilenumbrüche enthalten (Excel).
 * Ein einzelner Wert ohne Trennzeichen ist keine Tabelle: Rückgabe `null`.
 */
export function einfuegeText(roh: string): Raster | null {
  if (!/[\t\n\r]/.test(roh)) return null
  const zeilen: string[][] = []
  let zeile: string[] = []
  let zelle = ''
  let imText = false
  const s = roh.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (imText) {
      if (c === '"' && s[i + 1] === '"') {
        zelle += '"'
        i++
      } else if (c === '"') imText = false
      else zelle += c
    } else if (c === '"' && zelle === '') imText = true
    else if (c === '\t') {
      zeile.push(zelle)
      zelle = ''
    } else if (c === '\n') {
      zeile.push(zelle)
      zeilen.push(zeile)
      zeile = []
      zelle = ''
    } else zelle += c
  }
  if (zelle !== '' || zeile.length) {
    zeile.push(zelle)
    zeilen.push(zeile)
  }
  if (!zeilen.length) return null
  const breite = Math.max(...zeilen.map((z) => z.length))
  return zeilen.map((z) => [...z, ...Array(breite - z.length).fill('')])
}

/** Fügt Daten ab einer Zelle ein, erweitert bis zur Obergrenze; `gekuerzt` meldet abgeschnittene Daten */
export function datenEinfuegen(r: Raster, zeile: number, spalte: number, daten: Raster): { raster: Raster; gekuerzt: boolean } {
  let z = r.length ? r.map((x) => [...x]) : leeresRaster(1, 1)
  const breiteDaten = Math.max(...daten.map((d) => d.length))
  const brauchZeilen = Math.min(TABELLE_MAX_ZEILEN, zeile + daten.length)
  const brauchSpalten = Math.min(TABELLE_MAX_SPALTEN, spalte + breiteDaten)
  while (z.length < brauchZeilen) z.push(Array(spaltenZahl(z)).fill(''))
  if (spaltenZahl(z) < brauchSpalten) z = z.map((x) => [...x, ...Array(brauchSpalten - x.length).fill('')])
  let gekuerzt = zeile + daten.length > TABELLE_MAX_ZEILEN || spalte + breiteDaten > TABELLE_MAX_SPALTEN
  daten.forEach((d, i) =>
    d.forEach((wert, j) => {
      if (zeile + i < TABELLE_MAX_ZEILEN && spalte + j < TABELLE_MAX_SPALTEN) z[zeile + i][spalte + j] = wert
      else gekuerzt = true
    }),
  )
  return { raster: z, gekuerzt }
}

// ── Zahlen (wie diagramm.zahl im Kern) ────────────────────────────────────

/** Deutsche Zahl lesen: „12,5“, „1.234,5“, „-3“. Leer → `null`, Unlesbares → `'fehler'`. */
export function zahlLesen(eingabe: string): number | null | 'fehler' {
  let t = eingabe.trim().replace(/[\s ]/g, '').replace(/−/g, '-')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if ((t.match(/\./g) ?? []).length > 1 || /^-?\d{1,3}\.\d{3}$/.test(t)) t = t.replace(/\./g, '')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return 'fehler'
  const v = Number(t)
  return Number.isFinite(v) && Math.abs(v) <= 1e15 ? v : 'fehler'
}

// ── Diagramm-Daten ────────────────────────────────────────────────────────

export interface DiagrammDaten {
  beschriftungen: string[]
  reihen: { name: string; werte: string[] }[]
}

/** Datentabelle für das Raster: erste Zeile = Reihennamen, erste Spalte = Beschriftungen */
export function diagrammRaster(block: Block): Raster {
  const beschr = Array.isArray(block.beschriftungen) ? block.beschriftungen.map(text) : []
  const reihen = (Array.isArray(block.reihen) ? block.reihen : []).map((r) => {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
    return { name: text(o.name), werte: Array.isArray(o.werte) ? o.werte.map(text) : [] }
  })
  const kopf = ['', ...reihen.map((r) => r.name)]
  const zeilen = beschr.map((b, i) => [b, ...reihen.map((r) => r.werte[i] ?? '')])
  return [kopf, ...zeilen]
}

/** Raster zurück in die Felder des Blocks */
export function diagrammAusRaster(r: Raster): Pick<Block, 'beschriftungen' | 'reihen'> {
  const [kopf = [''], ...zeilen] = r
  return {
    beschriftungen: zeilen.map((z) => z[0] ?? ''),
    reihen: kopf.slice(1).map((name, j) => ({ name, werte: zeilen.map((z) => z[j + 1] ?? '') })),
  }
}

export interface DiagrammProblem {
  /** Zeile/Spalte im Raster (Kopfzeile = 0); fehlt bei allgemeinen Problemen */
  zeile?: number
  spalte?: number
  meldung: string
}

/** Alles, was das Speichern verhindern müsste (Zahlen) oder die Lehrkraft wissen sollte */
export function diagrammProbleme(block: Block): { fehler: DiagrammProblem[]; hinweise: string[] } {
  const art = text(block.art) || 'saeulen'
  const r = diagrammRaster(block)
  const fehler: DiagrammProblem[] = []
  const hinweise: string[] = []
  const beschr = r.length - 1
  const reihen = spaltenZahl(r) - 1
  let ersteReihe = 0
  let alleWerte = 0
  for (let i = 1; i < r.length; i++) {
    for (let j = 1; j < r[i].length; j++) {
      const v = zahlLesen(r[i][j])
      if (v === 'fehler') fehler.push({ zeile: i, spalte: j, meldung: `„${r[i][j]}“ ist keine Zahl.` })
      else if (v !== null) {
        alleWerte++
        if (art === 'kreis' && j === 1) {
          if (v < 0) fehler.push({ zeile: i, spalte: j, meldung: 'Ein Kreisdiagramm braucht Werte von null oder größer.' })
          else ersteReihe += v
        }
      }
    }
  }
  if (art === 'kreis') {
    if (reihen > 1) hinweise.push('Das Kreisdiagramm zeigt nur die erste Reihe.')
    if (beschr > DIAGRAMM_MAX_SEGMENTE) hinweise.push(`Das Kreisdiagramm zeigt höchstens ${DIAGRAMM_MAX_SEGMENTE} Segmente.`)
    if (alleWerte > 0 && ersteReihe <= 0 && !fehler.length) fehler.push({ meldung: 'Die Summe der Werte muss größer als null sein.' })
  } else if (beschr > DIAGRAMM_MAX_BESCHRIFTUNGEN) hinweise.push(`Höchstens ${DIAGRAMM_MAX_BESCHRIFTUNGEN} Beschriftungen werden gezeigt.`)
  if (reihen > DIAGRAMM_MAX_REIHEN) hinweise.push(`Höchstens ${DIAGRAMM_MAX_REIHEN} Reihen werden gezeigt.`)
  if (beschr < 1 || reihen < 1) hinweise.push('Es fehlen Beschriftungen oder eine Reihe.')
  else if (alleWerte === 0) hinweise.push('Es sind noch keine Werte eingetragen.')
  return { fehler, hinweise }
}

// ── Tabelle aus einem Textblock herauslösen ───────────────────────────────

export interface HerausgeloesteTabelle {
  /** HTML vor der Tabelle (kann leer sein) */
  vorher: string
  tabelle: Block
  /** HTML nach der Tabelle (kann leer sein) */
  nachher: string
  /** Was beim Umwandeln verloren ginge (leer = verlustfrei) */
  verluste: string[]
}

export type HerauslosenErgebnis = { ok: true; daten: HerausgeloesteTabelle } | { ok: false; grund: string }

const EINFACH_INLINE = new Set(['BR'])

/**
 * Sucht die erste Tabelle auf oberster Ebene eines Textblocks. `null`, wenn keine
 * Tabelle im Text steht (dann zeigt der Editor keinen Knopf).
 */
export function tabelleAusHtml(html: string): HerauslosenErgebnis | null {
  if (!/<table[\s>]/i.test(html) || typeof DOMParser === 'undefined') return null
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const tab = doc.body.querySelector('table')
  if (!tab) return null
  if (tab.parentElement !== doc.body) return { ok: false, grund: 'Die Tabelle steckt in einer Box oder Liste und lässt sich nicht einzeln herauslösen.' }
  if (tab.querySelector('table')) return { ok: false, grund: 'Die Tabelle enthält eine weitere Tabelle.' }

  const verluste: string[] = []
  const trs = Array.from(tab.querySelectorAll('tr'))
  if (!trs.length) return { ok: false, grund: 'Die Tabelle hat keine Zeilen.' }
  if (tab.querySelector('[colspan],[rowspan]')) verluste.push('Verbundene Zellen werden getrennt.')
  let formatiert = false
  let farben = false
  const zeilen: Raster = trs.map((tr) => {
    const zellen = Array.from(tr.children).filter((c) => c.tagName === 'TD' || c.tagName === 'TH')
    return zellen.map((c) => {
      c.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
      if (Array.from(c.querySelectorAll('*')).some((e) => !EINFACH_INLINE.has(e.tagName))) formatiert = true
      if (c.getAttribute('style')?.match(/background|color/i)) farben = true
      return (c.textContent ?? '').replace(/[ \t]+\n/g, '\n').trim()
    })
  })
  if (formatiert) verluste.push('Formatierung in Zellen (fett, Links, Listen …) wird zu reinem Text.')
  if (farben) verluste.push('Eigene Zellfarben werden durch den gewählten Stil ersetzt.')
  const breite = Math.max(...zeilen.map((z) => z.length))
  const norm = zeilen.map((z) => [...z, ...Array(breite - z.length).fill('')])
  if (norm.length > TABELLE_MAX_ZEILEN || breite > TABELLE_MAX_SPALTEN)
    verluste.push(`Nur die ersten ${TABELLE_MAX_ZEILEN} Zeilen und ${TABELLE_MAX_SPALTEN} Spalten werden übernommen.`)
  const raster = norm.slice(0, TABELLE_MAX_ZEILEN).map((z) => z.slice(0, TABELLE_MAX_SPALTEN))
  const kopfzeile = !!tab.querySelector('thead') || Array.from(trs[0].children).every((c) => c.tagName === 'TH')

  const davor: string[] = []
  const danach: string[] = []
  let sieht = false
  Array.from(doc.body.childNodes).forEach((n) => {
    if (n === tab) {
      sieht = true
      return
    }
    const h = n.nodeType === 1 ? (n as Element).outerHTML : n.nodeType === 3 ? n.textContent ?? '' : ''
    ;(sieht ? danach : davor).push(h)
  })
  const sauber = (l: string[]) => (l.join('').replace(/\s+/g, '') === '' ? '' : l.join('').trim())
  return {
    ok: true,
    daten: {
      vorher: sauber(davor),
      nachher: sauber(danach),
      verluste,
      tabelle: { type: 'tabelle', zeilen: raster, kopfzeile, stil: 'beides' },
    },
  }
}

/**
 * Setzt den Textblock an `ort` neu zusammen: Text davor bleibt, die Tabelle wird ein
 * eigener Block dahinter, Text danach wird ein weiterer Textblock. Fehlt Text davor,
 * ersetzt die Tabelle den Textblock.
 */
export function loeseTabelleHeraus(s: Struktur, thema: number, index: number, d: HerausgeloesteTabelle): Struktur {
  const t = s.chapters[thema]
  const alt = t?.elements[index]
  if (!t || !alt) return s
  const neu: Block[] = []
  if (d.vorher) neu.push({ ...alt, content: d.vorher })
  neu.push(d.tabelle)
  if (d.nachher) neu.push({ type: 'text', content: d.nachher })
  const elemente = [...t.elements]
  elemente.splice(index, 1, ...neu)
  const themen = [...s.chapters]
  themen[thema] = { ...t, elements: elemente }
  return { ...s, chapters: themen }
}
