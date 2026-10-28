'use client'

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { AblaufPruefung } from '@/lib/werkzeugkiste'
import { KopierKnopf } from '@/components/werkzeugkiste/schritt-prompt'

/**
 * Schritt 4 (PROJ-51): Antwortfeld und Prüfergebnis in genau einer Box.
 * Befunde blockieren nie — nur eine unlesbare Antwort sperrt das Bauen.
 */
export function SchrittAntwort({
  antwort,
  setAntwort,
  pruefung,
  prueftGerade,
  pruefFehler,
}: {
  antwort: string
  setAntwort: (a: string) => void
  pruefung: AblaufPruefung | null
  prueftGerade: boolean
  pruefFehler: string | null
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="wk-antwort" className="sr-only">
          Antwort der KI
        </Label>
        <Textarea
          id="wk-antwort"
          value={antwort}
          onChange={(e) => setAntwort(e.target.value)}
          placeholder="Hier die komplette Antwort der KI einfügen …"
          spellCheck={false}
          className="min-h-56 resize-y rounded-2xl border-ws-line bg-ws-surface p-4 font-mono text-sm leading-relaxed text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
        />
      </div>

      <div aria-live="polite">
        {prueftGerade ? (
          <div className="flex items-center gap-3 rounded-2xl border border-ws-line bg-ws-surface p-4 text-sm text-ws-muted" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Wird geprüft …
          </div>
        ) : pruefFehler ? (
          <Box ton="rot" icon={XCircle} titel={pruefFehler} />
        ) : pruefung ? (
          <PruefErgebnis pruefung={pruefung} />
        ) : null}
      </div>
    </div>
  )
}

function PruefErgebnis({ pruefung }: { pruefung: AblaufPruefung }) {
  if (!pruefung.lesbar) {
    return (
      <Box
        ton="rot"
        icon={XCircle}
        titel={
          pruefung.fehler ??
          'Die Antwort ist unvollständig. Bitte die KI um die vollständige Antwort bitten oder den Prompt erneut senden.'
        }
      />
    )
  }

  const korrektur =
    pruefung.korrekturen > 0
      ? `${pruefung.korrekturen} ${pruefung.korrekturen === 1 ? 'Kleinigkeit wurde' : 'Kleinigkeiten wurden'} automatisch korrigiert.`
      : null

  if (pruefung.befunde.length === 0) {
    return (
      <Box ton="gruen" icon={CheckCircle2} titel="Alles in Ordnung">
        {korrektur && <p className="text-sm text-ws-muted">{korrektur}</p>}
      </Box>
    )
  }

  const n = pruefung.befunde.length
  return (
    <Box ton="orange" icon={AlertTriangle} titel={`${n} ${n === 1 ? 'Hinweis' : 'Hinweise'} – die Datei wird trotzdem gebaut`}>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ws-text">
        {pruefung.befunde.map((b, i) => (
          <li key={i}>{b.text}</li>
        ))}
      </ul>
      {korrektur && <p className="text-sm text-ws-muted">{korrektur}</p>}
      {pruefung.nachbesserungsPrompt && (
        <div className="space-y-2 pt-1">
          <p className="text-sm text-ws-muted">
            Füge den Nachbesserungs-Prompt in dieselbe KI-Unterhaltung ein und ersetze oben die Antwort durch die neue.
          </p>
          <KopierKnopf
            text={pruefung.nachbesserungsPrompt}
            label="Nachbesserungs-Prompt kopieren"
            className="w-full bg-ws-surface text-ws-text ring-1 ring-ws-line hover:bg-ws-raised sm:w-auto"
          />
        </div>
      )}
    </Box>
  )
}

const TON = {
  gruen: { rahmen: 'border-ws-green/30 bg-ws-green/10', icon: 'text-ws-green' },
  orange: { rahmen: 'border-ws-orange/30 bg-ws-orange/10', icon: 'text-ws-orange' },
  rot: { rahmen: 'border-ws-red/30 bg-ws-red/10', icon: 'text-ws-red' },
} as const

function Box({
  ton,
  icon: Icon,
  titel,
  children,
}: {
  ton: keyof typeof TON
  icon: typeof CheckCircle2
  titel: string
  children?: React.ReactNode
}) {
  return (
    <section aria-label="Prüfergebnis" className={`space-y-3 rounded-2xl border p-4 sm:p-5 ${TON[ton].rahmen}`}>
      <p className="flex items-start gap-3 font-semibold text-ws-text">
        <Icon className={`mt-0.5 size-5 shrink-0 ${TON[ton].icon}`} aria-hidden />
        {titel}
      </p>
      {children && <div className="space-y-3 pl-8">{children}</div>}
    </section>
  )
}
