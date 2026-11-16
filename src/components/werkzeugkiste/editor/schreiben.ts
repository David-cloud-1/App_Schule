import { Editor } from '@tiptap/core'
import { aufraeumen, hatAktivenInhalt, rundreiseOk } from '@/lib/werkzeugkiste-text'
import { alsHtml, textErweiterungen } from '@/components/werkzeugkiste/editor/text-erweiterungen'
import type { Struktur } from '@/lib/werkzeugkiste-editor'
import type { Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'

/**
 * Direkt in der Seite schreiben (PROJ-103) – der Teil, der in der App läuft.
 *
 * Die Seite schreibt nur; **die App prüft, reinigt und speichert**. Diese Datei sagt, was
 * sich direkt bearbeiten lässt, liest den Wert aus der Struktur, schreibt ihn zurück und
 * reinigt, was die Seite zurückschickt. Nur im Browser (und in jsdom-Tests) benutzen.
 */

export type SchreibTeil = 'text' | 'titel' | 'untertitel' | 'kapitel' | 'unterschrift'
export const SCHREIB_TEILE: readonly SchreibTeil[] = ['text', 'titel', 'untertitel', 'kapitel', 'unterschrift']

/** Größtes Textstück, das die App von der Seite annimmt (Zeichen) */
export const SCHREIB_MAX = 200_000
const EINFACH_MAX = 300

/** Wo ein Teil in der Struktur liegt */
function ziel(a: Auswahl, teil: SchreibTeil, s: Struktur): { lesen: () => string; setzen: (wert: string) => Struktur } | null {
  if (!a) return null
  if ((teil === 'titel' || teil === 'untertitel') && a.art === 'deckblatt') {
    const feld = teil === 'titel' ? 'title' : 'subtitle'
    return {
      lesen: () => String(s.cover?.[feld] ?? ''),
      setzen: (w) => ({ ...s, cover: { ...s.cover, [feld]: w || undefined } }),
    }
  }
  if (teil === 'kapitel' && a.art === 'thema') {
    const t = s.chapters[a.thema]
    if (!t) return null
    return {
      lesen: () => String(t.title ?? ''),
      setzen: (w) => ({ ...s, chapters: s.chapters.map((k, i) => (i === a.thema ? { ...k, title: w || undefined } : k)) }),
    }
  }
  if (a.art !== 'block') return null
  const b = s.chapters[a.thema]?.elements[a.block]
  if (!b) return null
  const feld = teil === 'text' && b.type === 'text' ? 'content' : teil === 'unterschrift' && b.type === 'image' ? 'caption' : null
  if (!feld) return null
  return {
    lesen: () => String(b[feld] ?? ''),
    setzen: (w) => ({
      ...s,
      chapters: s.chapters.map((k, i) =>
        i === a.thema ? { ...k, elements: k.elements.map((e, j) => (j === a.block ? { ...e, [feld]: feld === 'caption' && !w ? undefined : w } : e)) } : k,
      ),
    }),
  }
}

/** Aktueller Wert eines Teils, oder `null`, wenn dort nichts direkt zu bearbeiten ist */
export function schreibWert(a: Auswahl, teil: SchreibTeil, s: Struktur): string | null {
  return ziel(a, teil, s)?.lesen() ?? null
}

/** Struktur mit neuem Wert; dieselbe Struktur, wenn nichts zu ändern ist */
export function setzeSchreibWert(a: Auswahl, teil: SchreibTeil, s: Struktur, wert: string): Struktur {
  const z = ziel(a, teil, s)
  if (!z || z.lesen() === wert) return s
  return z.setzen(wert)
}

/** Einzeiliger Text ohne Formatierung (Überschrift, Deckblatt, Bildunterschrift) */
export function einfachText(roh: string): string {
  return roh.replace(/\s+/g, ' ').trim().slice(0, EINFACH_MAX)
}

function editorFuer(html: string): Editor {
  return new Editor({ extensions: textErweiterungen(), content: html })
}

/** Originale aller „Inseln“ (unveränderliche Blöcke) eines Textes, in Reihenfolge */
export function inselnVon(html: string): string[] {
  const e = editorFuer(html)
  try {
    const liste: string[] = []
    e.state.doc.descendants((n) => {
      if (n.type.name === 'erhalten') liste.push(String(n.attrs.html ?? ''))
    })
    return liste
  } finally {
    e.destroy()
  }
}

/** Lässt sich der Lehrtext verlustfrei direkt bearbeiten? (Rundreise wie im Formular) */
export function direktBearbeitbar(html: string): boolean {
  const e = editorFuer(html)
  try {
    return rundreiseOk(html, aufraeumen(alsHtml(e)))
  } finally {
    e.destroy()
  }
}

/** Skripte, Ereignis-Attribute und `javascript:`-Links entfernen (der Kern tut es beim Bauen ebenfalls) */
export function entschaerfen(html: string): string {
  const t = document.createElement('template')
  t.innerHTML = html
  t.content.querySelectorAll('script, style, iframe, frame, object, embed, applet, form, meta, base, link').forEach((el) => el.remove())
  t.content.querySelectorAll('*').forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (a.name.startsWith('on') || a.name === 'srcdoc') el.removeAttribute(a.name)
      else if (/^\s*javascript:/i.test(a.value) && ['href', 'src', 'xlink:href', 'action'].includes(a.name)) el.removeAttribute(a.name)
    }
  })
  return t.innerHTML
}

export type Uebernahme = { ok: true; html: string } | { ok: false; grund: string }

/** Text durch das Motor-Schema schicken und aufräumen: Was der Motor nicht kennt, fliegt raus (Skripte, fremde Tags, Ereignis-Attribute) */
function normalisieren(html: string): string {
  const e = editorFuer(html)
  try {
    return aufraeumen(alsHtml(e))
  } finally {
    e.destroy()
  }
}

/**
 * Text von der Seite übernehmen: reinigen und prüfen, dass keine geschützte Insel verändert wurde.
 * Was die Seite zurückschickt, ist nie vertrauenswürdig.
 */
export function uebernimmSchreibtext(original: string, zurueck: unknown): Uebernahme {
  if (typeof zurueck !== 'string' || zurueck.length > SCHREIB_MAX) return { ok: false, grund: 'Der Text ist zu lang oder ungültig.' }
  // Immer durch das Schema des Motors (wie im Formular), nie ungeprüft weiterreichen
  let html = normalisieren(zurueck)
  // Jede Insel im Ergebnis muss eine Insel des Originals sein (je Original höchstens einmal)
  const frei = inselnVon(original)
  for (const insel of inselnVon(html)) {
    const i = frei.indexOf(insel)
    if (i < 0) return { ok: false, grund: 'Ein geschützter Teil des Textes wurde verändert. Der Text wurde nicht übernommen.' }
    frei.splice(i, 1)
  }
  // Inseln sind byte-gleich mit dem Original und bleiben unangetastet; für alles andere gilt zusätzlich die Entschärfung
  if (hatAktivenInhalt(html) && !hatAktivenInhalt(original)) html = entschaerfen(html)
  return { ok: true, html }
}

/** Reiner Text aus HTML (für „Text kopieren“, wenn die Übernahme abgelehnt wurde) */
export function alsReinerText(html: string): string {
  const t = document.createElement('template')
  t.innerHTML = html
  return (t.content.textContent ?? '').trim()
}
