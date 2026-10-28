'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { useIsApplePlatform } from '@/hooks/use-is-apple-platform'
import { cn } from '@/lib/utils'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'

/**
 * Kopierknopf für lange Prompts. Verweigert der Browser die Zwischenablage,
 * erscheint der Text markiert zum Kopieren per Tastatur.
 */
export function KopierKnopf({
  text,
  label,
  gross,
  className,
}: {
  text: string
  label: string
  gross?: boolean
  className?: string
}) {
  const [kopiert, setKopiert] = useState(false)
  const [manuell, setManuell] = useState(false)
  const feld = useRef<HTMLTextAreaElement>(null)
  const apple = useIsApplePlatform()

  useEffect(() => {
    if (!kopiert) return
    const t = setTimeout(() => setKopiert(false), 2500)
    return () => clearTimeout(t)
  }, [kopiert])

  useEffect(() => {
    if (manuell) feld.current?.select()
  }, [manuell])

  async function kopiere() {
    try {
      await navigator.clipboard.writeText(text)
      setKopiert(true)
      setManuell(false)
    } catch {
      setManuell(true)
    }
  }

  return (
    <div className="w-full space-y-3">
      <Button
        onClick={kopiere}
        className={cn(
          'rounded-2xl font-bold text-ws-on-accent focus-visible:ring-ws-green',
          gross ? 'min-h-14 px-8 text-base' : 'min-h-11 px-5',
          kopiert ? 'bg-ws-green-hover hover:bg-ws-green-hover' : 'bg-ws-green hover:bg-ws-green-hover',
          className,
        )}
      >
        {kopiert ? <Check className="mr-2 size-5" aria-hidden /> : <Copy className="mr-2 size-5" aria-hidden />}
        {kopiert ? 'Kopiert' : label}
      </Button>
      <span className="sr-only" aria-live="polite">
        {kopiert ? 'In die Zwischenablage kopiert' : ''}
      </span>
      {manuell && (
        <div className="space-y-2 text-left">
          <Hinweis ton="warnung">
            Dein Browser lässt das automatische Kopieren nicht zu. Der Text ist markiert – bitte mit {apple ? '⌘C' : 'Strg+C'} kopieren.
          </Hinweis>
          <Textarea
            ref={feld}
            readOnly
            value={text}
            aria-label="Text zum Kopieren"
            className="h-40 rounded-xl border-ws-line bg-ws-bg font-mono text-xs text-ws-text"
          />
        </div>
      )}
    </div>
  )
}

/** Schritt 3 (PROJ-51): großer Kopierknopf, Zeichenzahl, „Prompt ansehen“, drei Kurzschritte */
export function SchrittPrompt({ prompt }: { prompt: string }) {
  const zeichen = prompt.length.toLocaleString('de-DE')
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ws-line bg-ws-surface px-5 py-8 text-center">
        <KopierKnopf text={prompt} label="Prompt kopieren" gross className="w-full sm:w-auto" />
        <span className="text-sm text-ws-faint">ca. {zeichen} Zeichen</span>
        <Collapsible className="w-full">
          <CollapsibleTrigger className="group mx-auto flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm text-ws-blue hover:text-ws-blue-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
            Prompt ansehen
            <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <Textarea
              readOnly
              value={prompt}
              aria-label="Prompt"
              className="h-72 rounded-xl border-ws-line bg-ws-bg text-left font-mono text-xs leading-relaxed text-ws-text"
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      <ol className="space-y-4">
        {[
          'Öffne Claude, ChatGPT oder die schulische KI in einem neuen Tab.',
          'Füge den Prompt ein und schicke ihn ab.',
          'Kopiere die ganze Antwort und komm hierher zurück.',
        ].map((text, i) => (
          <li key={i} className="flex items-center gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ws-raised text-sm font-bold text-ws-text">
              {i + 1}
            </span>
            <span className="leading-relaxed">{text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
