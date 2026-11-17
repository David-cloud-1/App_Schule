import { Editor } from '@tiptap/core'
import { BOX_ARTEN, aufraeumen, eingefuegtesBereinigen, rundreiseOk } from '@/lib/werkzeugkiste-text'
import { alsHtml, textErweiterungen } from '@/components/werkzeugkiste/editor/text-erweiterungen'
import { ELEMENT_LEISTE, FERTIG, KASTEN, TEXT_KNOEPFE, type TextKnopfId } from '@/components/werkzeugkiste/editor/bedien-woerter'
import { SCHREIB_CSS } from '@/components/werkzeugkiste/editor/schreibwerk/schreib-design'

/**
 * Schreibwerk (PROJ-103): der Text-Motor für Lehrtext **in der abgeschotteten Vorschau-Seite**.
 *
 * Er nutzt dieselben Bausteine wie das Formular (Tiptap, Boxen, geschützte Inseln, Einfüge-
 * Reinigung) und läuft nur im Rahmen der Vorschau. Die App lädt ihn erst beim ersten Schreiben
 * nach (siehe `schreibwerk-laden.ts`). Er ändert nie selbst Inhalte der App: Zwischen- und
 * Endstand gehen als Nachricht an die App, die prüft, reinigt und speichert.
 *
 * Gebaut wird er mit `npm run schreibwerk:bauen` zu `schreibwerk-bundle.generated.ts`.
 */

export interface SchreibOptionen {
  /** Der Lehrtext-Block in der Seite (`.lehrtext`) */
  ziel: HTMLElement
  /** Gespeicherte Fassung des Textes (HTML) */
  html: string
  marke: string
  /** Wo geklickt wurde (Fenster-Koordinaten der Seite), für den Cursor */
  klick: { x: number; y: number } | null
  /** Handy: Leiste fest über der Bildschirmtastatur */
  mobil: boolean
  /** Name des Elements für die Leiste („Lehrtext“) */
  name?: string
  melde: (nachricht: Record<string, unknown>) => void
}

export interface Schreiber {
  /** Schreiben beenden und den Endstand melden */
  beende: () => void
  /** Ohne Meldung zurück zur gebauten Seite (nichts geändert) */
  ab: () => void
  element: HTMLElement
  /** Nur für Tests */
  editor: Editor
}

const ZWISCHEN_NACH_MS = 2000

function knopf(label: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'wk-el-k'
  b.setAttribute('aria-label', label)
  b.title = label
  b.textContent = text
  // Die Markierung im Text soll beim Klick bleiben
  b.addEventListener('mousedown', (e) => e.preventDefault())
  b.addEventListener('click', () => onClick())
  return b
}

/** Auswahlfeld der Leiste; die Optionen setzt `fuelle` (sie wechseln mit der Stelle im Text) */
function auswahlFeld(beiWahl: (wert: string) => void): HTMLSelectElement {
  const s = document.createElement('select')
  s.className = 'wk-el-s'
  s.addEventListener('change', () => {
    const wert = s.value
    s.value = ''
    if (wert) beiWahl(wert)
  })
  return s
}

type Option = [wert: string, text: string]
function fuelle(s: HTMLSelectElement, titel: string, gruppen: Array<{ name: string | null; optionen: Option[] }>) {
  s.textContent = ''
  const kopf = document.createElement('option')
  kopf.value = ''
  kopf.textContent = titel
  s.appendChild(kopf)
  for (const g of gruppen) {
    const ziel = g.name ? document.createElement('optgroup') : s
    if (g.name) {
      ;(ziel as HTMLOptGroupElement).label = g.name
      s.appendChild(ziel)
    }
    for (const [wert, text] of g.optionen) {
      const o = document.createElement('option')
      o.value = wert
      o.textContent = text
      ziel.appendChild(o)
    }
  }
  s.value = ''
}

function finde(ed: Editor): { pos: number; node: import('@tiptap/pm/model').Node } | null {
  const { $from } = ed.state.selection
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'box') return { pos: $from.before(d), node: $from.node(d) }
  }
  return null
}

export function starteSchreiben(opt: SchreibOptionen): Schreiber {
  const { ziel, marke, melde } = opt
  const doc = ziel.ownerDocument
  if (!doc.getElementById('wk-schreib-css')) {
    const st = doc.createElement('style')
    st.id = 'wk-schreib-css'
    st.textContent = SCHREIB_CSS
    doc.head.appendChild(st)
  }

  // Die gebaute Fassung verschwindet, solange geschrieben wird; `ab()` holt sie zurück
  const versteckt = Array.from(ziel.children) as HTMLElement[]
  const vorher = versteckt.map((c) => c.style.display)
  versteckt.forEach((c) => (c.style.display = 'none'))

  const zone = doc.createElement('div')
  zone.className = 'wk-schreibzone'
  if (opt.mobil) zone.classList.add('wk-mit-unten')
  const elementName = opt.name || 'Lehrtext'
  // PROJ-118: die eine Bearbeiten-Leiste – Name links, Mitte, „Fertig“ rechts
  const leiste = doc.createElement('div')
  leiste.className = 'wk-el' + (opt.mobil ? ' wk-el-unten' : '')
  leiste.setAttribute('role', 'toolbar')
  leiste.setAttribute('aria-label', ELEMENT_LEISTE.name(elementName))
  const nameEl = doc.createElement('span')
  nameEl.className = 'wk-el-name'
  nameEl.textContent = elementName
  nameEl.title = elementName
  const mitte = doc.createElement('div')
  mitte.className = 'wk-el-mitte'
  const mount = doc.createElement('div')
  mount.className = 'wk-papier'
  zone.append(leiste, mount)
  ziel.appendChild(zone)

  let beendet = false
  let letzterStand = opt.html
  let zeitgeber: ReturnType<typeof setTimeout> | null = null
  let hinweisZeit: ReturnType<typeof setTimeout> | null = null

  const hinweis = doc.createElement('div')
  hinweis.className = 'wk-fh'
  hinweis.setAttribute('role', 'status')
  hinweis.hidden = true
  function zeigeHinweis(text: string) {
    hinweis.textContent = text
    hinweis.hidden = false
    if (hinweisZeit) clearTimeout(hinweisZeit)
    hinweisZeit = setTimeout(() => (hinweis.hidden = true), 5000)
  }

  const editor: Editor = new Editor({
    element: mount,
    extensions: textErweiterungen(),
    content: opt.html,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Lehrtext', lang: 'de', spellcheck: 'true' },
      transformPastedHTML: (h) => {
        const sauber = eingefuegtesBereinigen(h)
        if (!/<img\b/i.test(sauber)) return sauber
        zeigeHinweis('Bilder werden nicht eingefügt. Füge ein Bild bitte als eigenen Bild-Block ein.')
        return sauber.replace(/<img\b[^>]*>/gi, '')
      },
      handleKeyDown: (_v, e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          beende()
          return true
        }
        if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          oeffneLink()
          return true
        }
        return false
      },
    },
    onUpdate: () => {
      if (zeitgeber) clearTimeout(zeitgeber)
      zeitgeber = setTimeout(zwischenstand, ZWISCHEN_NACH_MS)
    },
  })

  function stand(): string {
    const neu = aufraeumen(alsHtml(editor))
    // Nichts wirklich geändert (nur andere Schreibweise): die gespeicherte Fassung unverändert zurückgeben
    return rundreiseOk(opt.html, neu) ? opt.html : neu
  }

  function zwischenstand() {
    zeitgeber = null
    if (beendet) return
    const neu = stand()
    if (neu === letzterStand) return
    letzterStand = neu
    melde({ wkSchreibZwischen: marke, teil: 'text', html: neu })
  }

  // ── Formatleiste ────────────────────────────────────────────────────
  const ketten = () => editor.chain().focus()
  // Knöpfe, Reihenfolge und Wörter kommen aus der gemeinsamen Liste (PROJ-117)
  const aktionen: Record<TextKnopfId, () => void> = {
    fett: () => ketten().toggleBold().run(),
    kursiv: () => ketten().toggleItalic().run(),
    h2: () => ketten().toggleHeading({ level: 2 }).run(),
    h3: () => ketten().toggleHeading({ level: 3 }).run(),
    liste: () => ketten().toggleBulletList().run(),
    nummer: () => ketten().toggleOrderedList().run(),
    link: () => oeffneLink(),
  }
  const textKnoepfe = TEXT_KNOEPFE.map((k) => {
    const b = knopf(k.lang, k.text, aktionen[k.id])
    if (k.id === 'fett') b.style.fontWeight = '800'
    if (k.id === 'kursiv') b.style.fontStyle = 'italic'
    return b
  })
  const [fett, kursiv, h2, h3, liste, nummer, link] = textKnoepfe

  // Kasten (Merke, Tipp …): EIN Feld. Außerhalb eines Kastens „Kasten einfügen …“, darin „Kasten ändern …“
  const kasten = auswahlFeld((wert) => {
    if (editor.isActive('erhalten')) return
    const [art, was] = wert.split(':')
    const b = finde(editor)
    if (art === 'art') {
      if (b) ketten().updateAttributes('box', { klasse: was }).run()
      else if (!ketten().wrapIn('box', { klasse: was }).run()) ketten().insertContent(`<div class="${was}"><p></p></div>`).run()
      return
    }
    if (!b) return
    const ende = b.pos + b.node.nodeSize
    if (was === 'darunter') {
      ketten().insertContentAt(ende, `<div class="${String(b.node.attrs.klasse || 'merke')}"><p></p></div>`).run()
    } else if (was === 'aufloesen') {
      ketten()
        .command(({ tr }) => {
          tr.replaceWith(b.pos, ende, b.node.content)
          return true
        })
        .run()
    } else if (was === 'loeschen') {
      ketten()
        .command(({ tr, state }) => {
          // Ein Text ohne Inhalt bleibt ein leerer Absatz
          if (state.doc.childCount === 1) tr.replaceWith(b.pos, ende, state.schema.nodes.paragraph.create())
          else tr.delete(b.pos, ende)
          return true
        })
        .run()
    }
  })
  const arten: Option[] = BOX_ARTEN.map((a) => [`art:${a.klasse}`, a.label])
  let kastenStand: boolean | null = null
  function kastenFuellen(imKasten: boolean) {
    if (kastenStand === imKasten) return
    kastenStand = imKasten
    const w = imKasten ? KASTEN.aendern : KASTEN.einfuegen
    kasten.setAttribute('aria-label', w.lang)
    kasten.title = w.lang
    fuelle(
      kasten,
      w.text,
      imKasten
        ? [
            { name: KASTEN.artGruppe, optionen: arten },
            { name: KASTEN.aktionGruppe, optionen: KASTEN.aktionen.map((a): Option => [`aktion:${a.id}`, a.text]) },
          ]
        : [{ name: null, optionen: arten }],
    )
  }

  const trenner = doc.createElement('span')
  trenner.className = 'wk-el-trenner'
  trenner.setAttribute('aria-hidden', 'true')
  // Was nur in der Schublade geht (HTML-Ansicht): erst den Endstand melden, dann die Schublade wünschen
  const htmlKnopf = knopf(ELEMENT_LEISTE.html.lang, ELEMENT_LEISTE.html.text, () => {
    beende()
    melde({ wkFormular: marke })
  })

  const fertig = knopf(FERTIG.lang, FERTIG.text, () => beende())
  fertig.classList.add('wk-el-fertig')
  mitte.append(...textKnoepfe, kasten, trenner, htmlKnopf)
  leiste.append(nameEl, mitte, fertig)
  // Esc auf einem Knopf der Leiste = Fertig (im Text erledigt das der Editor selbst, im Link-Feld schließt es nur das Feld)
  leiste.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return
    e.preventDefault()
    beende()
  })

  // Link: eigenes Eingabefeld, denn `prompt()` ist in der abgeschotteten Seite gesperrt
  const linkZeile = doc.createElement('div')
  linkZeile.className = 'wk-fe'
  linkZeile.hidden = true
  const linkFeld = doc.createElement('input')
  linkFeld.type = 'url'
  linkFeld.placeholder = 'https://…'
  linkFeld.setAttribute('aria-label', 'Adresse des Links')
  const linkOk = knopf('Link setzen', 'Setzen', () => linkSetzen())
  const linkWeg = knopf('Link entfernen', 'Entfernen', () => {
    ketten().unsetLink().run()
    linkZeile.hidden = true
  })
  linkZeile.append(linkFeld, linkOk, linkWeg)
  linkFeld.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      linkSetzen()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      linkZeile.hidden = true
      editor.commands.focus()
    }
  })
  leiste.append(linkZeile, hinweis)

  function oeffneLink() {
    linkFeld.value = String(editor.getAttributes('link').href ?? '') || 'https://'
    linkZeile.hidden = false
    linkFeld.focus()
    linkFeld.select()
  }
  function linkSetzen() {
    const href = linkFeld.value.trim()
    linkZeile.hidden = true
    if (!href || href === 'https://') ketten().unsetLink().run()
    // Nur Web- und Mail-Adressen
    else if (/^(https?:|mailto:)/i.test(href)) ketten().extendMarkRange('link').setLink({ href }).run()
    else zeigeHinweis('Der Link wurde nicht gesetzt: Er muss mit https:// oder mailto: beginnen.')
  }

  function aktualisiere() {
    const an = (b: HTMLElement, aktiv: boolean) => b.setAttribute('aria-pressed', String(aktiv))
    an(fett, editor.isActive('bold'))
    an(kursiv, editor.isActive('italic'))
    an(h2, editor.isActive('heading', { level: 2 }))
    an(h3, editor.isActive('heading', { level: 3 }))
    an(liste, editor.isActive('bulletList'))
    an(nummer, editor.isActive('orderedList'))
    an(link, editor.isActive('link'))
    kastenFuellen(!!finde(editor))
    // Geschützte Teile (Tabellen u. a.): Knöpfe, die dort nichts dürfen, sind gesperrt statt still wirkungslos
    const gesperrt = editor.isActive('erhalten')
    for (const b of [fett, kursiv, h2, h3, liste, nummer, link]) b.disabled = gesperrt
    kasten.disabled = gesperrt
  }
  editor.on('selectionUpdate', aktualisiere)
  editor.on('transaction', aktualisiere)
  aktualisiere()

  // Handy: Leiste klebt über der Bildschirmtastatur
  const vv = doc.defaultView?.visualViewport
  const uebersTastatur = () => {
    if (!vv || !opt.mobil) return
    const unten = Math.max(0, (doc.defaultView?.innerHeight ?? 0) - (vv.height + vv.offsetTop))
    leiste.style.bottom = `${unten}px`
  }
  if (opt.mobil && vv) {
    vv.addEventListener('resize', uebersTastatur)
    vv.addEventListener('scroll', uebersTastatur)
    uebersTastatur()
  }

  // Cursor an die Klickstelle (die Zeilen können sich gegenüber der gebauten Seite leicht verschoben haben)
  let treffer: { pos: number } | null = null
  try {
    // Die Leiste steht jetzt über dem Text und schiebt ihn nach unten: um ihre Höhe verschieben (PROJ-118)
    const versatz = opt.mobil ? 0 : leiste.offsetHeight + (leiste.offsetHeight ? 10 : 0)
    treffer = opt.klick ? editor.view.posAtCoords({ left: opt.klick.x, top: opt.klick.y + versatz }) : null
  } catch {
    treffer = null
  }
  if (treffer) editor.commands.focus(treffer.pos)
  else editor.commands.focus('end')

  function aufraeumenWeg() {
    if (zeitgeber) clearTimeout(zeitgeber)
    if (hinweisZeit) clearTimeout(hinweisZeit)
    if (vv && opt.mobil) {
      vv.removeEventListener('resize', uebersTastatur)
      vv.removeEventListener('scroll', uebersTastatur)
    }
  }

  function beende() {
    if (beendet) return
    beendet = true
    aufraeumenWeg()
    const endstand = stand()
    editor.setEditable(false)
    leiste.hidden = true
    melde({ wkSchreibEnde: marke, teil: 'text', html: endstand })
  }

  function ab() {
    aufraeumenWeg()
    beendet = true
    editor.destroy()
    zone.remove()
    versteckt.forEach((c, i) => (c.style.display = vorher[i]))
  }

  return { beende, ab, element: zone, editor }
}

declare global {
  interface Window {
    __wkSchreibwerk?: { starte: typeof starteSchreiben }
  }
}

if (typeof window !== 'undefined') window.__wkSchreibwerk = { starte: starteSchreiben }
