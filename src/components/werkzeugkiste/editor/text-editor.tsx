'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { html as htmlSprache } from '@codemirror/lang-html'
import { EditorView } from '@codemirror/view'
import {
  Bold,
  Columns2,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListChecks,
  PanelTop,
  Trash2,
  Unlink,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { useWorkspace } from '@/components/admin/workspace-provider'
import { cn } from '@/lib/utils'
import {
  BOX_ARTEN,
  aufraeumen,
  boxArt,
  eingefuegtesBereinigen,
  hatAktivenInhalt,
  hatExterneBilder,
  rundreiseOk,
  sauberGeschlossen,
} from '@/lib/werkzeugkiste-text'
import { alsHtml, textErweiterungen } from '@/components/werkzeugkiste/editor/text-erweiterungen'

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-ws-raised" />,
})
const HTML_ERWEITERUNGEN = [htmlSprache(), EditorView.lineWrapping]

/**
 * Papier-Ansicht der Boxen wie im Schuldesign (schuldesign.py). Bewusst hell,
 * wie die fertige Seite (Ausnahme „Papier-Ansichten“ in DESIGN.md).
 */
const PAPIER = cn(
  'min-h-48 rounded-b-xl bg-white px-4 py-3 text-[15px] leading-relaxed text-[#222] outline-none',
  '[&_.ProseMirror]:min-h-44 [&_.ProseMirror]:outline-none',
  '[&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:rounded [&_h2]:bg-[#C4BC96] [&_h2]:px-3 [&_h2]:py-1.5 [&_h2]:font-bold [&_h2]:text-[#1F497D]',
  '[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:border-b-2 [&_h3]:border-[#C4BC96] [&_h3]:pb-1 [&_h3]:font-bold [&_h3]:text-[#1F497D]',
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#095F90] [&_a]:underline',
  '[&_div[class]]:my-3 [&_div[class]]:rounded-md [&_div[class]]:px-4 [&_div[class]]:py-3',
  '[&_div[class]]:before:mb-1.5 [&_div[class]]:before:block [&_div[class]]:before:text-xs [&_div[class]]:before:font-bold [&_div[class]]:before:uppercase [&_div[class]]:before:tracking-wider',
  '[&_.lernziele]:border-2 [&_.lernziele]:border-[#4F81BD] [&_.lernziele]:bg-[#f0f7ee] [&_.lernziele]:before:text-[#1F497D] [&_.lernziele]:before:content-["Lernziele"]',
  '[&_.ausgangssituation]:border-2 [&_.ausgangssituation]:border-[#4F81BD] [&_.ausgangssituation]:bg-[#eef4fb] [&_.ausgangssituation]:before:text-[#1F497D] [&_.ausgangssituation]:before:content-["Ausgangssituation"]',
  '[&_.arbeitsauftrag]:border-2 [&_.arbeitsauftrag]:border-[#C4BC96] [&_.arbeitsauftrag]:bg-[#faf7ee] [&_.arbeitsauftrag]:before:text-[#7a6800] [&_.arbeitsauftrag]:before:content-["Arbeitsauftrag"]',
  '[&_.merke]:border-l-4 [&_.merke]:border-[#1F497D] [&_.merke]:bg-[#eef4fb] [&_.merke]:before:text-[#1F497D] [&_.merke]:before:content-["Merke:"]',
  '[&_.tipp]:border-l-4 [&_.tipp]:border-[#5a8a3c] [&_.tipp]:bg-[#f5faf0] [&_.tipp]:before:text-[#3a6a20] [&_.tipp]:before:content-["Tipp_aus_der_Praxis:"]',
  '[&_.achtung]:border-l-4 [&_.achtung]:border-[#d4870f] [&_.achtung]:bg-[#fdf5e6] [&_.achtung]:before:text-[#a05c00] [&_.achtung]:before:content-["Achtung:"]',
  '[&_.beispiel]:border [&_.beispiel]:border-dashed [&_.beispiel]:border-[#C4BC96] [&_.beispiel]:bg-[#fdf9f0] [&_.beispiel]:before:text-[#7a6800] [&_.beispiel]:before:content-["Beispiel"]',
  '[&_.mission]:border-2 [&_.mission]:border-[#3a50b0] [&_.mission]:bg-[#eef0fb] [&_.mission]:before:text-[#3a50b0] [&_.mission]:before:content-["📁_Neuer_Fall"]',
  '[&_.pruefung]:border-2 [&_.pruefung]:border-[#c0392b] [&_.pruefung]:bg-[#fff5f5] [&_.pruefung]:before:text-[#c0392b] [&_.pruefung]:before:content-["⭐_IHK-Prüfungssimulation"]',
  '[&_div[data-titel]]:before:content-[attr(data-titel)]',
  '[&_.vergleich]:flex [&_.vergleich]:flex-wrap [&_.vergleich]:gap-3 [&_.vergleich]:p-0 [&_.vergleich]:before:hidden',
  '[&_.vergleich>div]:min-w-44 [&_.vergleich>div]:flex-1 [&_.vergleich>div]:rounded-md [&_.vergleich>div]:border [&_.vergleich>div]:border-[#5a8a3c] [&_.vergleich>div]:bg-[#f0f7ee] [&_.vergleich>div]:px-3 [&_.vergleich>div]:py-2',
  '[&_.vergleich>div]:before:block [&_.vergleich>div]:before:font-bold [&_.vergleich>div]:before:text-[#3a6a20] [&_.vergleich>div]:before:content-[attr(data-titel)]',
  '[&_ol.schritte]:list-none [&_ol.schritte]:pl-0 [&_ol.schritte]:[counter-reset:schritt] [&_ol.schritte>li]:relative [&_ol.schritte>li]:mb-2 [&_ol.schritte>li]:pl-9 [&_ol.schritte>li]:[counter-increment:schritt]',
  '[&_ol.schritte>li]:before:absolute [&_ol.schritte>li]:before:left-0 [&_ol.schritte>li]:before:flex [&_ol.schritte>li]:before:size-6 [&_ol.schritte>li]:before:items-center [&_ol.schritte>li]:before:justify-center [&_ol.schritte>li]:before:rounded-full [&_ol.schritte>li]:before:bg-[#1F497D] [&_ol.schritte>li]:before:text-xs [&_ol.schritte>li]:before:font-bold [&_ol.schritte>li]:before:text-white [&_ol.schritte>li]:before:content-[counter(schritt)]',
  '[&_.wk-erhalten]:my-3 [&_.wk-erhalten]:rounded-md [&_.wk-erhalten]:border [&_.wk-erhalten]:border-dashed [&_.wk-erhalten]:border-[#999] [&_.wk-erhalten]:!p-2',
  '[&_.wk-erhalten]:before:mb-2 [&_.wk-erhalten]:before:block [&_.wk-erhalten]:before:text-[11px] [&_.wk-erhalten]:before:text-[#555] [&_.wk-erhalten]:before:content-[attr(data-hinweis)]',
  '[&_.wk-erhalten_table]:w-full [&_.wk-erhalten_table]:border-collapse [&_.wk-erhalten_td]:border [&_.wk-erhalten_td]:border-[#ddd] [&_.wk-erhalten_td]:p-1.5 [&_.wk-erhalten_th]:border [&_.wk-erhalten_th]:border-[#ccc] [&_.wk-erhalten_th]:bg-[#E6E6E6] [&_.wk-erhalten_th]:p-1.5',
  '[&_.ProseMirror-selectednode]:ring-2 [&_.ProseMirror-selectednode]:ring-[#26640C]',
)

type Ansicht = 'gestaltet' | 'html'

/**
 * Textblock bearbeiten (PROJ-89, E8): gestaltete Ansicht wie in Word, mit
 * Schalter zur HTML-Ansicht. Beim Öffnen prüft der Editor, ob die gestaltete
 * Ansicht den Block unverändert lässt (Rundreise). Wenn nicht, öffnet er die
 * HTML-Ansicht – so geht nie Gestaltung verloren.
 */
export function TextEditor({
  html,
  onChange,
  beschriftung,
}: {
  html: string
  /** Wird bei jeder Änderung mit dem neuen HTML aufgerufen */
  onChange: (html: string) => void
  beschriftung: string
}) {
  const { theme } = useWorkspace()
  const dunkel =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [ansicht, setAnsicht] = useState<Ansicht>('gestaltet')
  const [verlustfrei, setVerlustfrei] = useState(true)
  const zuletzt = useRef(html)
  const erweiterungen = useMemo(() => textErweiterungen(), [])

  const editor = useEditor({
    extensions: erweiterungen,
    content: html,
    immediatelyRender: false,
    editorProps: {
      attributes: { 'aria-label': beschriftung, role: 'textbox', 'aria-multiline': 'true' },
      transformPastedHTML: eingefuegtesBereinigen,
    },
    onCreate: ({ editor: e }) => {
      const ok = rundreiseOk(html, aufraeumen(alsHtml(e)))
      setVerlustfrei(ok)
      if (!ok) setAnsicht('html')
    },
    onUpdate: ({ editor: e }) => {
      const neu = aufraeumen(alsHtml(e))
      zuletzt.current = neu
      onChange(neu)
    },
  })

  // Von außen geändert (Rückgängig im Editor, HTML-Ansicht): Inhalt nachziehen, ohne erneut zu melden
  useEffect(() => {
    if (!editor || html === zuletzt.current) return
    zuletzt.current = html
    if (ansicht === 'gestaltet') editor.commands.setContent(html, false)
  }, [html, editor, ansicht])

  function wechsle(ziel: Ansicht) {
    if (ziel === ansicht) return
    if (ziel === 'gestaltet' && editor) {
      // Nach Änderungen in der HTML-Ansicht erneut prüfen
      editor.commands.setContent(html, false)
      const ok = rundreiseOk(html, aufraeumen(alsHtml(editor)))
      setVerlustfrei(ok)
      if (!ok) return
    }
    setAnsicht(ziel)
  }

  const aktiv = hatAktivenInhalt(html)
  const geschlossen = ansicht === 'html' ? sauberGeschlossen(html) : true

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminSegmented
          value={ansicht}
          onChange={wechsle}
          ariaLabel="Ansicht des Textblocks"
          options={[
            { value: 'gestaltet', label: 'Gestaltet' },
            { value: 'html', label: 'HTML' },
          ]}
        />
      </div>
      {!verlustfrei && (
        <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 px-3 py-2 text-sm text-ws-orange" role="status">
          Dieser Block enthält Gestaltung, die die gestaltete Ansicht nicht verlustfrei darstellen kann. Bearbeite ihn
          deshalb in der HTML-Ansicht.
        </p>
      )}

      {ansicht === 'gestaltet' ? (
        <div className="overflow-hidden rounded-xl border border-ws-line">
          {editor && <Werkzeugleiste editor={editor} />}
          <EditorContent editor={editor} className={PAPIER} />
        </div>
      ) : (
        <div className={cn('overflow-hidden rounded-xl border bg-ws-surface text-sm', geschlossen ? 'border-ws-line' : 'border-ws-orange')}>
          <CodeMirror
            value={html}
            onChange={(t) => {
              zuletzt.current = t
              onChange(t)
            }}
            extensions={HTML_ERWEITERUNGEN}
            theme={dunkel ? 'dark' : 'light'}
            minHeight="12rem"
            maxHeight="60vh"
            aria-label={`${beschriftung} (HTML)`}
            basicSetup={{ foldGutter: false, highlightActiveLine: false }}
          />
        </div>
      )}
      {ansicht === 'html' && !geschlossen && (
        <p className="text-sm text-ws-orange" role="status">
          Der HTML-Code ist nicht sauber geschlossen. Gespeichert wird er trotzdem – die Vorschau zeigt, was daraus wird.
        </p>
      )}
      {aktiv && (
        <p className="text-sm text-ws-muted" role="status">
          Skripte und Ereignisse werden aus Sicherheitsgründen beim Bauen entfernt.
        </p>
      )}
      {hatExterneBilder(html) && (
        <p className="text-sm text-ws-muted" role="status">
          Externe Bilder funktionieren offline nicht. Lade das Bild lieber hoch.
        </p>
      )}
    </div>
  )
}

// ── Werkzeugleiste ────────────────────────────────────────────────────────

function Knopf({
  aktiv,
  onClick,
  label,
  children,
  disabled,
}: {
  aktiv?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={aktiv}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('size-11 shrink-0 rounded-lg text-ws-muted hover:bg-ws-raised hover:text-ws-text', aktiv && 'bg-ws-green/15 text-ws-green')}
    >
      {children}
    </Button>
  )
}

function Werkzeugleiste({ editor }: { editor: Editor }) {
  const [, neuZeichnen] = useState(0)
  useEffect(() => {
    const f = () => neuZeichnen((n) => n + 1)
    editor.on('selectionUpdate', f)
    editor.on('transaction', f)
    return () => {
      editor.off('selectionUpdate', f)
      editor.off('transaction', f)
    }
  }, [editor])

  const k = 'size-4'
  const inBox = editor.isActive('box')
  const boxJetzt = inBox ? boxArt(String(editor.getAttributes('box').klasse ?? '')) : undefined

  function boxEinfuegen(klasse: string) {
    if (inBox) {
      editor.chain().focus().updateAttributes('box', { klasse }).run()
      return
    }
    if (!editor.chain().focus().wrapIn('box', { klasse }).run()) {
      editor.chain().focus().insertContent(`<div class="${klasse}"><p></p></div>`).run()
    }
  }

  // Neue Box hinter die aktuelle Box setzen (statt die vorhandene umzuwandeln)
  function boxDarunter(klasse: string) {
    const $from = editor.state.selection.$from
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'box') {
        editor
          .chain()
          .focus()
          .insertContentAt($from.after(d), `<div class="${klasse}"><p></p></div>`)
          .run()
        return
      }
    }
  }

  const erhaltenGewaehlt = editor.isActive('erhalten')

  function linkSetzen() {
    const alt = String(editor.getAttributes('link').href ?? '')
    const href = window.prompt('Adresse des Links (https://…)', alt || 'https://')
    if (href === null) return
    if (!href.trim() || href === 'https://') {
      editor.chain().focus().unsetLink().run()
      return
    }
    // Nur Web- und Mail-Adressen; javascript: entfernt der Kern ohnehin
    if (!/^(https?:|mailto:)/i.test(href.trim())) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
  }

  const schritte = editor.isActive('orderedList', { class: 'schritte' })

  return (
    <div role="toolbar" aria-label="Textgestaltung" className="flex flex-wrap items-center gap-0.5 border-b border-ws-line bg-ws-surface px-1 py-1">
      <Knopf label="Fett" aktiv={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className={k} aria-hidden />
      </Knopf>
      <Knopf label="Kursiv" aktiv={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className={k} aria-hidden />
      </Knopf>
      <Knopf
        label="Kapitelüberschrift"
        aktiv={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className={k} aria-hidden />
      </Knopf>
      <Knopf
        label="Unterabschnitt"
        aktiv={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className={k} aria-hidden />
      </Knopf>
      <Knopf label="Aufzählung" aktiv={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className={k} aria-hidden />
      </Knopf>
      <Knopf
        label="Nummerierte Liste"
        aktiv={editor.isActive('orderedList') && !schritte}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className={k} aria-hidden />
      </Knopf>
      <Knopf
        label="Schritt-für-Schritt-Liste"
        aktiv={schritte}
        onClick={() => {
          if (schritte) {
            editor.chain().focus().updateAttributes('orderedList', { class: null }).run()
            return
          }
          if (!editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
          editor.chain().focus().updateAttributes('orderedList', { class: 'schritte' }).run()
        }}
      >
        <ListChecks className={k} aria-hidden />
      </Knopf>
      <Knopf label={editor.isActive('link') ? 'Link ändern' : 'Link'} aktiv={editor.isActive('link')} onClick={linkSetzen}>
        <Link2 className={k} aria-hidden />
      </Knopf>
      {editor.isActive('link') && (
        <Knopf label="Link entfernen" onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink className={k} aria-hidden />
        </Knopf>
      )}
      <span className="mx-1 h-6 w-px bg-ws-line" aria-hidden />
      {erhaltenGewaehlt && (
        <Knopf label="Gewählten unveränderten Block löschen" onClick={() => editor.chain().focus().deleteSelection().run()}>
          <Trash2 className={k} aria-hidden />
        </Knopf>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            onMouseDown={(e) => e.preventDefault()}
            className="min-h-11 rounded-lg px-3 text-sm text-ws-text hover:bg-ws-raised"
          >
            <PanelTop className="mr-1.5 size-4" aria-hidden />
            {boxJetzt ? `Box: ${boxJetzt.label}` : 'Box einfügen'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
          <DropdownMenuLabel>{inBox ? 'Box ändern in …' : 'Box einfügen'}</DropdownMenuLabel>
          {BOX_ARTEN.map((b) => (
            <DropdownMenuItem key={b.klasse} onSelect={() => boxEinfuegen(b.klasse)}>
              {b.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              editor
                .chain()
                .focus()
                .insertContent('<div class="vergleich"><div data-titel="Vorteile"><p></p></div><div data-titel="Nachteile"><p></p></div></div>')
                .run()
            }
          >
            <Columns2 className="mr-2 size-4" aria-hidden /> Vergleich (zwei Spalten)
          </DropdownMenuItem>
          {inBox && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Neue Box darunter einfügen</DropdownMenuLabel>
              {BOX_ARTEN.map((b) => (
                <DropdownMenuItem key={`darunter-${b.klasse}`} onSelect={() => boxDarunter(b.klasse)}>
                  {b.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => editor.chain().focus().lift('box').run()}>
                <X className="mr-2 size-4" aria-hidden /> Box auflösen (Text bleibt)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => editor.chain().focus().deleteNode('box').run()}
                className="text-ws-red focus:text-ws-red"
              >
                <Trash2 className="mr-2 size-4" aria-hidden /> Box samt Inhalt löschen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
