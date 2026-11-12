'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { yaml } from '@codemirror/lang-yaml'
import { EditorView } from '@codemirror/view'
import { Button } from '@/components/ui/button'
import { blockAlsRohfassung, rohfassungLesen } from '@/lib/werkzeugkiste-api'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { useWorkspace } from '@/components/admin/workspace-provider'
import { cn } from '@/lib/utils'
import type { Block } from '@/lib/werkzeugkiste-editor'

// CodeMirror nur im Browser laden
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-ws-raised" />,
})

const ERWEITERUNGEN = [yaml(), EditorView.lineWrapping]

/**
 * Rohfassung eines Blocks (PROJ-89, Paket 1): der Block als YAML, so wie er in
 * der KI-Antwort steht. Übersetzt wird in beide Richtungen vom Kern – so liest
 * der Editor genau wie der Bau. „Übernehmen“ ersetzt den Block im Entwurf.
 */
export function EditorRohfassung({
  materialId,
  block,
  onUebernehmen,
  onAbbrechen,
  beschriftung,
}: {
  materialId: string
  block: Block
  onUebernehmen: (block: Block) => void
  onAbbrechen: () => void
  /** Zugängliche Beschriftung des Feldes, z. B. „Rohfassung: Lückentext“ */
  beschriftung: string
}) {
  const { theme } = useWorkspace()
  const dunkel =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [text, setText] = useState<string | null>(null)
  const [original, setOriginal] = useState<string | null>(null)
  const [ladefehler, setLadefehler] = useState<string | null>(null)
  const [fehler, setFehler] = useState<{ satz: string; hinweis?: string } | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  useEffect(() => {
    let aktiv = true
    setText(null)
    setLadefehler(null)
    blockAlsRohfassung(materialId, block)
      .then((r) => {
        if (!aktiv) return
        setText(r.text)
        setOriginal(r.text)
      })
      .catch((e: Error) => aktiv && setLadefehler(e.message))
    return () => {
      aktiv = false
    }
  }, [materialId, block])

  async function uebernehmen() {
    if (text === null) return
    if (text === original) {
      onAbbrechen()
      return
    }
    setLaeuft(true)
    setFehler(null)
    try {
      const r = await rohfassungLesen(materialId, text)
      onUebernehmen(r.block)
    } catch (e) {
      const f = e as { message: string; hinweis?: string }
      setFehler({ satz: f.message, hinweis: f.hinweis })
    } finally {
      setLaeuft(false)
    }
  }

  if (ladefehler) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-ws-red/30 bg-ws-red/10 p-3 text-sm text-ws-red">
        <p>{ladefehler}</p>
        <Button variant="outline" className={NEBENAKTION} onClick={onAbbrechen}>
          Schließen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ws-muted">
        Rohfassung (YAML): so, wie der Block in der Antwort der KI steht. Einrückung beachten.
      </p>
      {text === null ? (
        <div className="flex h-24 items-center gap-2 text-sm text-ws-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Wird geladen …
        </div>
      ) : (
        <div
          className={cn(
            'overflow-hidden rounded-xl border bg-ws-surface text-sm',
            fehler ? 'border-ws-red' : 'border-ws-line',
          )}
        >
          <CodeMirror
            value={text}
            onChange={setText}
            extensions={ERWEITERUNGEN}
            theme={dunkel ? 'dark' : 'light'}
            minHeight="10rem"
            maxHeight="60vh"
            aria-label={beschriftung}
            basicSetup={{ foldGutter: false, highlightActiveLine: false, autocompletion: false }}
          />
        </div>
      )}
      {fehler && (
        <p role="alert" className="text-sm text-ws-red">
          {fehler.satz}
          {fehler.hinweis ? ` ${fehler.hinweis}` : ''}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          className={cn(HAUPTAKTION, 'min-h-11 w-auto text-sm')}
          onClick={uebernehmen}
          disabled={text === null || laeuft}
        >
          {laeuft && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
          Übernehmen
        </Button>
        <Button variant="outline" className={NEBENAKTION} onClick={onAbbrechen} disabled={laeuft}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
