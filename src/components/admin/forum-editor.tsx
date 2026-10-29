'use client'

import { useId, useRef, useState } from 'react'
import { Bold, Italic, Link2, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ForumMarkdown } from '@/components/admin/forum-markdown'
import { insertLink, normalizeLinkUrl, toggleList, wrapSelection, type EditorState } from '@/lib/forum-editor'
import { cn } from '@/lib/utils'

/**
 * Text-Editor des Lehrerzimmers (PROJ-63, E6): Werkzeugleiste für fett, kursiv,
 * Aufzählung und Link, dazu eine Vorschau. Der Text bleibt einfaches Markdown.
 */
export function ForumEditor({
  value,
  onChange,
  maxLength,
  minRows = 6,
  placeholder,
  label,
  invalid,
  describedBy,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  maxLength: number
  minRows?: number
  placeholder?: string
  /** Sichtbare Beschriftung steht außerhalb; hier nur fürs Eingabefeld (Screenreader) */
  label: string
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const counterId = useId()
  const linkFieldId = useId()

  function current(): EditorState {
    const el = ref.current
    return { value, start: el?.selectionStart ?? value.length, end: el?.selectionEnd ?? value.length }
  }

  function apply(next: EditorState) {
    if (next.value.length > maxLength) return
    onChange(next.value)
    // Markierung nach dem erneuten Rendern wieder setzen
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.start, next.end)
    })
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const url = normalizeLinkUrl(linkUrl)
    if (!url) {
      setLinkError('Bitte eine gültige Web-Adresse eingeben, z. B. www.ihk.de.')
      return
    }
    apply(insertLink(current(), url))
    setLinkOpen(false)
    setLinkUrl('')
    setLinkError(null)
  }

  const toolClass = 'size-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text focus-visible:ring-ws-green'
  const over = value.length > maxLength * 0.9

  return (
    <div
      className={cn(
        'rounded-xl border bg-ws-bg focus-within:ring-2 focus-within:ring-ws-green',
        invalid ? 'border-ws-red' : 'border-ws-line',
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-ws-line px-2 py-1">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'write' | 'preview')}>
          <TabsList className="h-11 bg-ws-raised">
            <TabsTrigger value="write" className="min-h-9">Schreiben</TabsTrigger>
            <TabsTrigger value="preview" className="min-h-9">Vorschau</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center" role="toolbar" aria-label="Formatierung">
          <Button type="button" variant="ghost" className={toolClass} aria-label="Fett" title="Fett" disabled={disabled || tab === 'preview'} onClick={() => apply(wrapSelection(current(), '**', 'fett'))}>
            <Bold className="size-4" />
          </Button>
          <Button type="button" variant="ghost" className={toolClass} aria-label="Kursiv" title="Kursiv" disabled={disabled || tab === 'preview'} onClick={() => apply(wrapSelection(current(), '*', 'kursiv'))}>
            <Italic className="size-4" />
          </Button>
          <Button type="button" variant="ghost" className={toolClass} aria-label="Aufzählung" title="Aufzählung" disabled={disabled || tab === 'preview'} onClick={() => apply(toggleList(current()))}>
            <List className="size-4" />
          </Button>
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" className={toolClass} aria-label="Link einfügen" title="Link einfügen" disabled={disabled || tab === 'preview'}>
                <Link2 className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 border-ws-line bg-ws-surface text-ws-text">
              <form onSubmit={submitLink} className="space-y-2">
                <label htmlFor={linkFieldId} className="text-sm font-medium">Web-Adresse</label>
                <Input
                  id={linkFieldId}
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value)
                    setLinkError(null)
                  }}
                  placeholder="www.beispiel.de"
                  inputMode="url"
                  autoComplete="off"
                  aria-invalid={!!linkError}
                  className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                />
                {linkError && <p role="alert" className="text-sm text-ws-red">{linkError}</p>}
                <Button type="submit" className="min-h-11 w-full rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                  Einfügen
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {tab === 'write' ? (
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          rows={minRows}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={[describedBy, counterId].filter(Boolean).join(' ')}
          disabled={disabled}
          className="min-h-32 resize-y rounded-none border-0 bg-transparent px-3 py-3 text-base text-ws-text shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      ) : (
        <div className="min-h-32 px-3 py-3" aria-label="Vorschau">
          {value.trim() ? <ForumMarkdown text={value} /> : <p className="text-sm text-ws-muted">Noch nichts zum Anzeigen.</p>}
        </div>
      )}

      <p id={counterId} className={cn('px-3 pb-2 text-right text-xs', over ? 'text-ws-orange' : 'text-ws-faint')}>
        {value.length} / {maxLength}
      </p>
    </div>
  )
}
