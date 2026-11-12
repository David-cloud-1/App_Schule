import { Extension, Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { istBox, kennzeichen } from '@/lib/werkzeugkiste-text'

/**
 * Tiptap-Bausteine für Textblöcke (PROJ-89, Paket 2). Ziel: Was die KI
 * geschrieben hat, kommt unverändert wieder heraus.
 *
 * - `box`: die Boxen des Schuldesigns (`<div class="merke">`, mit `data-titel`)
 * - `vergleich` / `vergleichSpalte`: Gegenüberstellung in zwei Spalten
 * - `erhalten`: alles, was der gestaltete Editor nicht bearbeiten kann
 *   (Tabellen, Bilder, Boxen mit eigenem Stil, fremde `div`s). Es bleibt als
 *   unveränderlicher Block stehen und lässt sich in der HTML-Ansicht ändern.
 * - `class` und `data-titel` bleiben an Absätzen, Überschriften und Listen erhalten.
 *   Blöcke mit eigenem `style` werden ebenfalls unveränderliche Blöcke.
 */

/** Box des Schuldesigns – nur Klasse, ohne eigenen Stil (sonst `erhalten`) */
export const Box = Node.create({
  name: 'box',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      klasse: {
        default: 'merke',
        parseHTML: (el) => el.getAttribute('class'),
        renderHTML: (a) => ({ class: a.klasse }),
      },
      titel: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-titel'),
        renderHTML: (a) => (a.titel ? { 'data-titel': a.titel } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div', priority: 70, getAttrs: (el) => (istBox(el as HTMLElement) ? null : false) }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0]
  },
})

export const Vergleich = Node.create({
  name: 'vergleich',
  group: 'block',
  content: 'vergleichSpalte+',
  defining: true,
  addAttributes() {
    return { klasse: { default: 'vergleich', parseHTML: (el) => el.getAttribute('class'), renderHTML: (a) => ({ class: a.klasse }) } }
  },
  parseHTML() {
    return [
      {
        tag: 'div',
        priority: 70,
        getAttrs: (el) => {
          const e = el as HTMLElement
          if (kennzeichen(e.getAttribute('class')) !== 'vergleich' || e.hasAttribute('style')) return false
          // Nur echte Spalten: jedes Kind ein div ohne eigenen Stil
          const kinder = Array.from(e.children)
          return kinder.length > 0 && kinder.every((k) => k.tagName === 'DIV' && !k.hasAttribute('style') && !k.hasAttribute('class'))
            ? null
            : false
        },
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0]
  },
})

export const VergleichSpalte = Node.create({
  name: 'vergleichSpalte',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      titel: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-titel'),
        renderHTML: (a) => (a.titel ? { 'data-titel': a.titel } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div', context: 'vergleich/', priority: 80 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0]
  },
})

/** Unveränderlicher Block: hält sein HTML genau so, wie es war */
export const Erhalten = Node.create({
  name: 'erhalten',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return { html: { default: '', parseHTML: (el) => (el as HTMLElement).outerHTML, renderHTML: () => ({}) } }
  },
  parseHTML() {
    const immer = ['table', 'div', 'figure', 'img', 'iframe', 'video', 'audio', 'details', 'dl', 'section', 'aside', 'pre', 'svg', 'math', 'form'].map(
      (tag) => ({ tag, priority: 40 }),
    )
    // Blöcke mit eigenem Stil (alte Antworten vor PROJ-68): ProseMirror würde Stilangaben
    // umdeuten (font-weight → fett, Farben umschreiben) – deshalb unverändert behalten
    const mitStil = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote'].map((tag) => ({
      tag,
      priority: 80,
      getAttrs: (el: HTMLElement | string) => ((el as HTMLElement).hasAttribute('style') ? null : false),
    }))
    return [...mitStil, ...immer]
  },
  renderHTML({ node }) {
    // Wird von getHTML() nie benutzt (siehe `alsHtml`), nur als Rückfall
    return ['div', { 'data-erhalten': '' }, String(node.attrs.html ?? '')]
  },
  addNodeView() {
    return ({ node }) => {
      const huelle = document.createElement('div')
      huelle.className = 'wk-erhalten'
      huelle.contentEditable = 'false'
      huelle.setAttribute('data-hinweis', 'Unverändert übernommen – bearbeiten in der HTML-Ansicht')
      const inhalt = document.createElement('div')
      // Nur Anzeige im Editor: Skripte laufen in innerHTML nicht, Ereignis-Attribute werden entfernt
      inhalt.innerHTML = String(node.attrs.html ?? '')
      inhalt.querySelectorAll('script').forEach((s) => s.remove())
      inhalt.querySelectorAll('*').forEach((el) => {
        for (const a of Array.from(el.attributes)) if (a.name.startsWith('on')) el.removeAttribute(a.name)
      })
      huelle.appendChild(inhalt)
      return { dom: huelle }
    }
  },
})

/** class und data-titel an gewöhnlichen Blöcken behalten (z. B. `<ol class="schritte">`) */
export const AttributeErhalten = Extension.create({
  name: 'attributeErhalten',
  addGlobalAttributes() {
    const behalten = (schluessel: string, html: string) => ({
      default: null,
      parseHTML: (el: HTMLElement) => el.getAttribute(html),
      renderHTML: (a: Record<string, unknown>) => (a[schluessel] ? { [html]: a[schluessel] } : {}),
    })
    return [
      {
        types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote'],
        attributes: { class: behalten('class', 'class'), wkTitel: behalten('wkTitel', 'data-titel') },
      },
    ]
  },
})

export function textErweiterungen() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
      code: false,
    }),
    Link.configure({ openOnClick: false, autolink: false, HTMLAttributes: { target: null, rel: null } }),
    Box,
    Vergleich,
    VergleichSpalte,
    Erhalten,
    AttributeErhalten,
  ]
}

/**
 * HTML aus dem Editor-Dokument: wie `editor.getHTML()`, aber unveränderliche
 * Blöcke kommen mit ihrem Original-HTML heraus (nicht in einer Hülle).
 */
export function alsHtml(editor: { getHTML: () => string }): string {
  return editor
    .getHTML()
    .replace(/<div data-erhalten="">([\s\S]*?)<\/div>(?=<|$)/g, (_, inhalt: string) => decodeErhalten(inhalt))
}

function decodeErhalten(text: string): string {
  const t = document.createElement('textarea')
  t.innerHTML = text
  return t.value
}

export { mergeAttributes }
